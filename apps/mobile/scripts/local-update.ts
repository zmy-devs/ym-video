import { loadEnvironment } from '../../../scripts/environment.js';
import { execFileSync } from 'node:child_process';
import {
  createReadStream,
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { createServer } from 'node:http';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

loadEnvironment();

// 本地测试的 APK 和配置与正式发布产物分开保存。
const directory = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// 生成的配置和测试包统一存放在本机测试目录。
const output = join(directory, 'build/local-update');

// 使用工作区已安装的 Tauri CLI。
const cli = join(directory, 'node_modules/@tauri-apps/cli/tauri.js');

// 调试包名与启动 Activity 沿用 Tauri 配置。
const tauriConfig: {
  identifier: string;
  bundle: { android: { debugApplicationIdSuffix: string } };
} = JSON.parse(
  readFileSync(join(directory, 'src-tauri/tauri.conf.json'), 'utf8'),
);

// 调试版覆盖升级使用独立的 Android 应用标识。
const applicationId = `${tauriConfig.identifier}${tauriConfig.bundle.android.debugApplicationIdSuffix}`;

// 手机通过 USB 访问电脑回环地址，不依赖局域网地址。
const port = 18789;

// 清单与 APK 共用一个本机地址。
const origin = `http://127.0.0.1:${port}`;

// Android SDK 沿用移动开发脚本的本机配置。
const sdk =
  process.env.ANDROID_HOME ||
  process.env.ANDROID_SDK_ROOT ||
  join(process.env.LOCALAPPDATA || process.cwd(), 'Android/Sdk');

// 设备连接与端口转发使用同一 SDK 的 ADB。
const adb = join(
  sdk,
  'platform-tools',
  process.platform === 'win32' ? 'adb.exe' : 'adb',
);

// 本地命令失败立即停止，安装失败时保留手机现有应用。
const run = (command: string, args: string[]) =>
  execFileSync(command, args, {
    cwd: directory,
    env: process.env,
    stdio: 'inherit',
    windowsHide: true,
  });

// 查询命令仅返回本次测试需要的设备与版本信息。
const query = (args: string[]) =>
  execFileSync(adb, args, { encoding: 'utf8', windowsHide: true });

// 单设备直接选择，多设备时通过 Android 标准变量指定。
const devices = query(['devices'])
  .split(/\r?\n/)
  .flatMap((line) => {
    // 只选择已经授权且在线的设备。
    const [serial, state] = line.trim().split(/\s+/);
    return serial && state === 'device' ? [serial] : [];
  });

// 优先使用开发者明确指定的设备。
const serial =
  process.env.ANDROID_SERIAL || (devices.length === 1 ? devices[0] : undefined);

if (!serial || !devices.includes(serial)) {
  throw new Error('请连接一台 Android 设备，多设备时设置 ANDROID_SERIAL');
}

// 查询手机当前安装的调试版信息。
const installed = query([
  '-s',
  serial,
  'shell',
  'dumpsys',
  'package',
  applicationId,
]);

// 首次安装使用工作区声明的应用版本。
const pkg: { version: string } = JSON.parse(
  readFileSync(join(directory, '../../package.json'), 'utf8'),
);

// 基础版本沿用手机已安装版本，支持连续执行多轮本地升级。
const baseVersion =
  installed.match(/versionName=(\d+\.\d+\.\d+)/)?.[1] ?? pkg.version;

// 修订号按数值递增。
const parts = baseVersion.split('.').map(Number);

// 本轮覆盖升级的目标版本。
const nextVersion = `${parts[0]}.${parts[1]}.${parts[2] + 1}`;

// 下载清单使用客户端约定的 APK 文件名。
const filename = `ym-video-${nextVersion}-android-arm64.apk`;

// 更新包由本机服务提供下载。
const nextApk = join(output, filename);

// 基础包由 ADB 安装，随后通过应用内更新到目标版本。
const baseApk = join(output, `ym-video-${baseVersion}-android-base.apk`);

mkdirSync(output, { recursive: true });
process.env.ANDROID_HOME = sdk;
process.env.YM_VIDEO_ANDROID_LOCAL_UPDATE = '1';

// 第一个 APK 构建前编译移动前端，第二个复用相同前端产物。
const buildApk = (
  version: string,
  destination: string,
  buildFrontend: boolean,
) => {
  // 测试版本与前端构建命令通过 Tauri 的合并配置指定。
  const config = join(output, `tauri-${version}.conf.json`);
  writeFileSync(
    config,
    JSON.stringify(
      {
        version,
        ...(buildFrontend ? {} : { build: { beforeBuildCommand: '' } }),
      },
      null,
      2,
    ),
  );
  run(process.execPath, [
    cli,
    'android',
    'build',
    '--apk',
    '--debug',
    '--target',
    'aarch64',
    '--ci',
    '--config',
    config,
  ]);

  // 两个调试包使用同一个 Android 调试证书。
  const generated = join(
    directory,
    'src-tauri/gen/android/app/build/outputs/apk/universal/debug/app-universal-debug.apk',
  );
  if (!existsSync(generated)) {
    throw new Error('缺少 Android 调试 APK');
  }
  copyFileSync(generated, destination);
};

buildApk(nextVersion, nextApk, true);
buildApk(baseVersion, baseApk, false);

// 本机清单与生产清单使用同一数据契约。
const manifest = JSON.stringify({
  version: nextVersion,
  notes: '本机 APK 覆盖升级验证',
  url: `${origin}/${filename}`,
});

// 真实文件长度用于下载百分比回调。
const size = statSync(nextApk).size;

// 只提供当前测试清单与 APK，下载回调读取真实文件传输量。
const server = createServer((request, response) => {
  if (request.method !== 'GET') {
    response.writeHead(405).end();
    return;
  }
  if (request.url === '/android.json') {
    response.writeHead(200, {
      'content-type': 'application/json',
      'cache-control': 'no-store',
    });
    response.end(manifest);
    console.log(`设备检查更新：v${nextVersion}`);
    return;
  }
  if (request.url === `/${filename}`) {
    response.writeHead(200, {
      'content-type': 'application/vnd.android.package-archive',
      'content-length': size,
    });
    createReadStream(nextApk).pipe(response);
    response.on('finish', () => console.log(`APK 下载完成：${size} 字节`));
    return;
  }
  response.writeHead(404).end();
});

await new Promise<void>((resolve, reject) => {
  server.once('error', reject);
  server.listen(port, '127.0.0.1', resolve);
});

// USB 下载端口只在本地测试服务运行期间保留。
const close = () => {
  server.close();
  run(adb, ['-s', serial, 'reverse', '--remove', `tcp:${port}`]);
};

try {
  run(adb, ['-s', serial, 'reverse', `tcp:${port}`, `tcp:${port}`]);
  run(adb, ['-s', serial, 'reverse', 'tcp:8788', 'tcp:8788']);
  run(adb, ['-s', serial, 'install', '-r', baseApk]);
  run(adb, [
    '-s',
    serial,
    'shell',
    'am',
    'start',
    '-n',
    `${applicationId}/${tauriConfig.identifier}.MainActivity`,
  ]);
} catch (cause) {
  close();
  throw cause;
}

process.once('SIGINT', close);
process.once('SIGTERM', close);
console.log(`本机更新服务：${origin}`);
console.log(
  `手机当前版本 v${baseVersion}，在设置中检查更新并确认安装 v${nextVersion}`,
);
