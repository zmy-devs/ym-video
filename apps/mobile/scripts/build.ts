import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Resolve the mobile workspace once so local builds and CI use the same paths.
const directory = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cli = join(directory, 'node_modules/@tauri-apps/cli/tauri.js');
const icon = join(directory, '../../assets/icon.png');
const generatedIcons = join(directory, 'build/generated');

if (existsSync(join(directory, '.env'))) {
  process.loadEnvFile(join(directory, '.env'));
}

// Run Tauri commands with the selected Android host and signing environment.
const tauri = (args: string[]) => {
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd: directory,
    stdio: 'inherit',
    env: process.env,
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`Tauri 命令失败，退出码 ${result.status}`);
  }
};

// Generate platform icons and the Android Studio project when first needed.
const prepareAndroid = () => {
  tauri(['icon', icon, '--output', generatedIcons]);
  if (!existsSync(join(directory, 'src-tauri/gen/android/build.gradle.kts'))) {
    tauri(['android', 'init', '--ci']);
  }
  const androidIcons = join(generatedIcons, 'android');
  const androidResources = join(
    directory,
    'src-tauri/gen/android/app/src/main/res',
  );
  for (const folder of readdirSync(androidIcons)) {
    const destination = join(androidResources, folder);
    mkdirSync(destination, { recursive: true });
    for (const file of readdirSync(join(androidIcons, folder))) {
      copyFileSync(join(androidIcons, folder, file), join(destination, file));
    }
  }
  const drawable = join(androidResources, 'drawable');
  mkdirSync(drawable, { recursive: true });
  copyFileSync(icon, join(drawable, 'ym_video_icon.png'));
  const manifest = join(
    directory,
    'src-tauri/gen/android/app/src/main/AndroidManifest.xml',
  );
  if (existsSync(manifest)) {
    const source = readFileSync(manifest, 'utf8');
    const updated = source
      .replace(/\s+android:windowSoftInputMode="[^"]+"/g, '')
      .replace(
        'android:icon="@mipmap/ic_launcher"\n        android:label="@string/app_name"',
        'android:icon="@drawable/ym_video_icon"\n        android:roundIcon="@drawable/ym_video_icon"\n        android:label="@string/app_name"',
      )
      .replace(
        'android:launchMode="singleTask"',
        'android:launchMode="singleTask"\n            android:windowSoftInputMode="adjustNothing"',
      );
    writeFileSync(manifest, updated);
  }
};

// 为已连接的真机和模拟器转发前端与 API 端口。
const prepareDevice = () => {
  const sdk =
    process.env.ANDROID_HOME ||
    process.env.ANDROID_SDK_ROOT ||
    join(process.env.LOCALAPPDATA || process.cwd(), 'Android/Sdk');
  const adb = join(
    sdk,
    'platform-tools',
    process.platform === 'win32' ? 'adb.exe' : 'adb',
  );
  const devices = spawnSync(adb, ['devices'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  if (devices.error) {
    throw devices.error;
  }
  if (devices.status !== 0) {
    throw new Error('无法查询 Android 设备');
  }

  const connected = devices.stdout.split(/\r?\n/).flatMap((line) => {
    const [serial, status] = line.trim().split(/\s+/);
    return serial && status === 'device' ? [serial] : [];
  });
  if (!connected.length) {
    throw new Error('请先启动 Android 模拟器或连接 Android 设备');
  }

  for (const serial of connected) {
    for (const port of [3002, 8788]) {
      // 每台设备维护自己的端口转发。
      const result = spawnSync(
        adb,
        ['-s', serial, 'reverse', `tcp:${port}`, `tcp:${port}`],
        { stdio: 'inherit' },
      );
      if (result.error) {
        throw result.error;
      }
      if (result.status !== 0) {
        throw new Error(`无法转发本地端口 ${port} 到 Android 设备 ${serial}`);
      }
    }
  }

  process.env.TAURI_DEV_HOST = '127.0.0.1';
};

const command = process.argv[2];
if (command === 'dev') {
  prepareDevice();
  prepareAndroid();
  tauri(['android', 'dev', '--host', '127.0.0.1']);
} else if (command === 'build') {
  const desktopPackage: { version: string } = JSON.parse(
    readFileSync(join(directory, '../desktop/package.json'), 'utf8'),
  );
  prepareAndroid();

  const keystorePath = process.env.ANDROID_KEYSTORE_PATH;
  const signingValues = [
    process.env.ANDROID_KEYSTORE_PASSWORD,
    process.env.ANDROID_KEY_ALIAS,
    process.env.ANDROID_KEY_PASSWORD,
  ];
  if (!keystorePath || signingValues.some((value) => !value)) {
    throw new Error('请配置 Android 签名密钥相关环境变量');
  }
  const absoluteKeystorePath = resolve(keystorePath);
  if (!existsSync(absoluteKeystorePath)) {
    throw new Error('Android 签名密钥文件不存在');
  }
  process.env.ANDROID_KEYSTORE_PATH = absoluteKeystorePath;
  tauri([
    'android',
    'build',
    '--apk',
    '--target',
    'aarch64',
    '--',
    '-I',
    join(directory, 'scripts/android-signing.gradle'),
  ]);

  const apkRoot = join(directory, 'src-tauri/gen/android');
  const apk = readdirSync(apkRoot, {
    recursive: true,
    encoding: 'utf8',
  }).find((name) => name.includes('release') && name.endsWith('.apk'));
  if (!apk) {
    throw new Error('缺少 Android APK');
  }
  const output = join(directory, 'dist');
  mkdirSync(output, { recursive: true });
  copyFileSync(
    join(apkRoot, apk),
    join(output, `ym-video-${desktopPackage.version}-android-arm64.apk`),
  );
  console.log(`Android APK 已生成于 ${output}`);
} else {
  throw new Error('用法：pnpm dev 或 pnpm build');
}
