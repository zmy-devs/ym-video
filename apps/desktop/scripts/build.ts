import pngToIco from 'png-to-ico';
import { loadEnvironment } from '../../../scripts/environment.js';
import desktopConfig from '../src-tauri/tauri.conf.json' with { type: 'json' };
import type { UpdateManifest } from '../../../scripts/release-types.js';
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  copyFileSync,
  readdirSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// pnpm 与直接执行脚本使用相同的桌面应用根目录。
const directory = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// 工作区安装的 Tauri CLI 入口。
const cli = join(directory, 'node_modules/@tauri-apps/cli/tauri.js');

// 客户端共用的应用图标源文件。
const icon = join(directory, '../../assets/icon.png');

// Tauri 所需的 Windows 图标生成在忽略的构建目录。
const generatedIcons = join(directory, 'build/generated');

loadEnvironment();

if (process.env.CARGO_HOME) {
  process.env.PATH =
    join(process.env.CARGO_HOME, 'bin') + ';' + process.env.PATH;
}

// 子进程失败立即向调用方返回构建失败。
const tauri = (args: string[]) => {
  // 当前命令返回的执行结果。
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd: directory,
    stdio: 'inherit',
    env: process.env,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error('Tauri 命令失败，退出码 ' + result.status);
  }
};

// 直接将共用 PNG 转换为 Windows 所需的 ICO。
const generateIcons = async () => {
  mkdirSync(generatedIcons, { recursive: true });
  writeFileSync(join(generatedIcons, 'icon.ico'), await pngToIco(icon));
};

// 命令行指定的桌面操作。
const command = process.argv[2];

if (command === 'start') {
  // 当前命令返回的执行结果。
  const result = spawnSync(
    join(directory, 'src-tauri/target/release/ym-video.exe'),
    [],
    { stdio: 'inherit' },
  );

  if (result.error) {
    throw result.error;
  }

  process.exitCode = result.status ?? 1;
} else if (command === 'icons') {
  await generateIcons();
} else {
  await generateIcons();

  if (command === 'dev') {
    tauri(['dev']);
    process.exit(0);
  }

  if (command === 'bundle') {
    // 签名密钥只生成一次，应用公钥必须与本机持有的私钥一致。
    // 本地环境配置指定的签名私钥路径。
    const configuredKey = process.env.TAURI_SIGNING_PRIVATE_KEY;

    // 当前安装包使用的私钥文件。
    const key = configuredKey
      ? resolve(directory, '../..', configuredKey)
      : join(homedir(), '.tauri/ym-video.key');

    if (!existsSync(key)) {
      if (configuredKey) {
        throw new Error('指定的签名私钥文件不存在');
      }

      mkdirSync(dirname(key), { recursive: true });

      tauri(['signer', 'generate', '-w', key, '-p', '']);
    }

    process.env.TAURI_SIGNING_PRIVATE_KEY = key;

    process.env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD ??= '';

    // 桌面 Tauri 配置文件的位置。
    const configPath = join(directory, 'src-tauri/tauri.conf.json');

    // 本次操作读取的 Tauri 配置。
    const config = structuredClone(desktopConfig);

    // 与本机签名私钥对应的验证公钥。
    const pubkey = readFileSync(key + '.pub', 'utf8').trim();

    if (
      config.plugins.updater.pubkey &&
      config.plugins.updater.pubkey !== pubkey
    ) {
      throw new Error('更新签名公钥与本机密钥不一致');
    }

    if (!config.plugins.updater.pubkey) {
      config.plugins.updater.pubkey = pubkey;

      writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
    }
  }

  // 当前任务传递给 Tauri CLI 的构建参数。
  const args = ['build'];

  if (command === 'bundle') {
    args.push('--bundles', 'nsis');
  } else {
    args.push('--no-bundle');
  }

  if (command === 'debug') {
    args.push('--debug');
  }

  tauri(args);

  if (command === 'bundle') {
    // 根 package.json 声明的客户端发布版本。
    const {
      version,
    }: {
      version: string;
    } = JSON.parse(readFileSync(join(directory, '../../package.json'), 'utf8'));

    // Tauri 生成的 NSIS 安装包目录。
    const bundle = join(directory, 'src-tauri/target/release/bundle/nsis');

    // 当前版本的原始安装程序文件。
    const installer = readdirSync(bundle).find(
      (name) => name.includes(version) && name.endsWith('.exe'),
    );

    if (!installer) {
      throw new Error('缺少 Windows 安装包');
    }

    // 对外分发的桌面产物目录。
    const output = join(directory, '../../dist');

    mkdirSync(output, { recursive: true });

    // 包含版本与平台信息的安装包名称。
    const filename = 'ym-video-' + version + '-windows-x64.exe';

    copyFileSync(join(bundle, installer), join(output, filename));

    copyFileSync(
      join(bundle, installer + '.sig'),
      join(output, filename + '.sig'),
    );

    // 桌面应用的版本说明原文。
    const notes = readFileSync(
      join(directory, '../../docs/release-note.md'),
      'utf8',
    );

    // 当前版本在说明文档中的章节标题。
    const heading = '## ' + version;

    // 更新界面展示的当前版本说明。
    const section = notes.includes(heading)
      ? notes.split(heading)[1].split('\n## ')[0].trim()
      : '发布 ' + version;

    // 供客户端读取的版本与签名清单。
    const manifest: UpdateManifest = {
      version,
      notes: section,
      pub_date: new Date().toISOString(),
      platforms: {
        'windows-x86_64': {
          url:
            'https://github.com/zmy-devs/ym-video/releases/download/v' +
            version +
            '/' +
            filename,
          signature: readFileSync(
            join(output, filename + '.sig'),
            'utf8',
          ).trim(),
        },
      },
    };

    writeFileSync(
      join(output, 'latest.json'),
      JSON.stringify(manifest, null, 2) + '\n',
    );

    console.log('Windows 安装包已生成于 ' + output);
  }
}
