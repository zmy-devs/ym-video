import type {
  UpdateManifest,
  AndroidUpdateManifest,
  ReleaseFile,
  GithubRelease,
  GiteeRelease,
  GithubAsset,
} from './release-types.js';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnvironment } from './environment.js';

loadEnvironment();

// 发布前完整校验本地产物，再分别更新两个下载站点。
const directory = join(dirname(fileURLToPath(import.meta.url)), '..');

// GitHub 与 Gitee 共用的发布仓库。
const repository = 'zmy-devs/ym-video';

// GitHub Release API 的仓库地址。
const github = 'https://api.github.com/repos/' + repository;

// Gitee Release API 的仓库地址。
const gitee = 'https://gitee.com/api/v5/repos/' + repository;

// 调用发布接口，统一处理超时与 HTTP 错误。
const request = async (
  url: string,
  options: RequestInit = {},
): Promise<Response> => {
  // 本次网络请求返回的响应。
  const response = await fetch(url, {
    ...options,
    signal: AbortSignal.timeout(120000),
  });

  if (!response.ok) {
    throw new Error(
      '发布请求失败（' + response.status + '）' + new URL(url).pathname,
    );
  }

  return response;
};

// 按发布平台的响应契约读取 JSON 数据。
const requestJson = async <T>(
  url: string,
  options: RequestInit = {},
): Promise<T> => {
  // 已经确认 HTTP 成功的发布接口响应。
  const response = await request(url, options);

  return response.json() as Promise<T>;
};

// 复用已校验的版本附件，再发布完整的更新清单。
const publishGithub = async (
  manifest: UpdateManifest | AndroidUpdateManifest,
  files: ReleaseFile[],
) => {
  // 访问发布接口所需的身份和协议头。
  const headers = {
    Authorization: 'Bearer ' + process.env.GH_TOKEN,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };

  // 当前桌面版本对应的 Release 标签。
  const tag = 'v' + manifest.version;

  // 当前版本在 GitHub 的查询响应。
  const lookup = await fetch(github + '/releases/tags/' + tag, { headers });

  // 用于上传当前版本附件的 Release。
  let release: GithubRelease;

  if (lookup.status === 404) {
    release = await requestJson<GithubRelease>(github + '/releases', {
      method: 'POST',
      headers: { ...headers, 'content-type': 'application/json' },
      body: JSON.stringify({
        tag_name: tag,
        name: manifest.version,
        body: manifest.notes,
        draft: true,
      }),
    });
  } else {
    if (!lookup.ok) {
      throw new Error('无法查询 GitHub Release');
    }

    release = (await lookup.json()) as GithubRelease;
  }

  // 上传当前版本的一个附件。
  const upload = async (name: string, bytes: Uint8Array, type: string) => {
    // 当前 Release 已上传的附件列表。
    const assets = await requestJson<GithubAsset[]>(
      github + '/releases/' + release.id + '/assets',
      { headers },
    );

    // 与本地产物同名的远程附件。
    const existing = assets.find((asset) => asset.name === name);

    if (existing) {
      // 用于校验已有附件内容的下载响应。
      const remote = await request(github + '/releases/assets/' + existing.id, {
        headers: { ...headers, Accept: 'application/octet-stream' },
      });

      if (!remote.ok) {
        throw new Error('无法验证已有 GitHub 附件');
      }

      // 计算附件内容的 SHA-256 摘要。
      const digest = (value: Uint8Array) =>
        createHash('sha256').update(value).digest('hex');

      if (digest(Buffer.from(await remote.arrayBuffer())) === digest(bytes)) {
        return;
      }

      throw new Error('同版本附件内容不同，请更新应用版本后发布');
    }

    await request(
      release.upload_url.replace('{?name,label}', '') +
        '?name=' +
        encodeURIComponent(name),
      {
        method: 'POST',
        headers: { ...headers, 'content-type': type },
        body: Uint8Array.from(bytes),
      },
    );
  };

  for (const file of files) {
    await upload(file.name, file.bytes, 'application/octet-stream');
  }

  await upload(
    'url' in manifest ? 'android.json' : 'latest.json',
    Buffer.from(JSON.stringify(manifest, null, 2)),
    'application/json',
  );

  await request(github + '/releases/' + release.id, {
    method: 'PATCH',
    headers: { ...headers, 'content-type': 'application/json' },
    body: JSON.stringify({ draft: false, make_latest: 'true' }),
  });
};

// Gitee 按平台维护独立更新入口，只在版本产物完整后切换清单。
const publishGitee = async (
  manifest: UpdateManifest | AndroidUpdateManifest,
  files: ReleaseFile[],
) => {
  // 当前进程提供的 Gitee 发布令牌。
  const token = process.env.GITEE_TOKEN;

  if (!token) {
    throw new Error('缺少 Gitee 发布令牌');
  }

  // 查询仓库现有的发行版本。
  const list = () =>
    requestJson<GiteeRelease[]>(
      gitee +
        '/releases?per_page=100&access_token=' +
        encodeURIComponent(token),
    );

  // 复用已有 Release，或为当前标签创建 Release。
  const getRelease = async (
    tag: string,
    name: string,
  ): Promise<GiteeRelease> => {
    // 仓库已经创建的发行版本。
    const releases = await list();

    // 与本地产物同名的远程附件。
    const existing = releases.find((release) => release.tag_name === tag);

    if (existing) {
      return existing;
    }

    return requestJson<GiteeRelease>(gitee + '/releases', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        access_token: token,
        tag_name: tag,
        name,
        body: manifest.notes,
        target_commitish: 'main',
      }),
    });
  };

  // 上传当前版本的一个附件。
  const upload = async (
    release: GiteeRelease,
    name: string,
    bytes: Uint8Array,
  ) => {
    // 包含附件信息的当前发行版本。
    const current = await requestJson<GiteeRelease>(
      gitee +
        '/releases/' +
        release.id +
        '?access_token=' +
        encodeURIComponent(token),
    );

    // 当前发行版中同名的附件。
    const asset = current.assets?.find((item) => item.name === name);

    if (asset) {
      // 用于校验已有附件内容的下载响应。
      const remote = await request(asset.browser_download_url);

      if (!remote.ok) {
        throw new Error('无法验证已有 Gitee 附件');
      }

      // 计算附件内容的 SHA-256 摘要。
      const digest = (value: Uint8Array) =>
        createHash('sha256').update(value).digest('hex');

      if (digest(Buffer.from(await remote.arrayBuffer())) === digest(bytes)) {
        return;
      }

      throw new Error('同版本附件内容不同，请更新应用版本后发布');
    }

    // 上传附件需要的表单数据。
    const form = new FormData();

    form.set('access_token', token);

    form.set('file', new Blob([Uint8Array.from(bytes)]), name);

    await request(gitee + '/releases/' + release.id + '/attach_files', {
      method: 'POST',
      body: form,
    });
  };

  // 当前安装的客户端版本。
  const version = await getRelease('v' + manifest.version, manifest.version);

  for (const file of files) {
    await upload(version, file.name, file.bytes);
  }

  // 两端更新入口使用独立标签，发布时只替换当前平台的清单。
  const android = 'url' in manifest;

  // 当前发布平台的稳定清单标签。
  const entryTag = android ? 'latest-android' : 'latest';

  // Gitee 现有的稳定更新清单版本。
  const previous = (await list()).find(
    (release) => release.tag_name === entryTag,
  );

  if (previous) {
    await request(
      gitee +
        '/releases/' +
        previous.id +
        '?access_token=' +
        encodeURIComponent(token),
      { method: 'DELETE' },
    );
  }

  // 用于发布稳定更新清单的 Release。
  const latest = await getRelease(entryTag, entryTag);

  // 指向 Gitee 版本产物的更新清单。
  const mirror = structuredClone(manifest);

  if ('platforms' in mirror) {
    mirror.platforms['windows-x86_64'].url =
      'https://gitee.com/' +
      repository +
      '/releases/download/v' +
      manifest.version +
      '/' +
      files[0].name;
  }

  await upload(
    latest,
    android ? 'android.json' : 'latest.json',
    Buffer.from(JSON.stringify(mirror, null, 2)),
  );
};

// 完整读取并校验平台产物，全部通过后才允许远程发布。
const readRelease = async (target: 'desktop' | 'android') => {
  const pkg: { version: string } = JSON.parse(
    await readFile(join(directory, 'package.json'), 'utf8'),
  );
  const android = target === 'android';
  const name = android ? 'android.json' : 'latest.json';
  const manifest: UpdateManifest | AndroidUpdateManifest = JSON.parse(
    await readFile(join(directory, 'dist', name), 'utf8'),
  );
  if (manifest.version !== pkg.version || typeof manifest.notes !== 'string') {
    throw new Error('安装包版本与应用版本不一致');
  }
  const filename = `ym-video-${pkg.version}-${android ? 'android-arm64.apk' : 'windows-x64.exe'}`;
  const url =
    'url' in manifest ? manifest.url : manifest.platforms['windows-x86_64'].url;
  const host = android ? 'gitee.com' : 'github.com';
  if (
    url !==
    `https://${host}/${repository}/releases/download/v${pkg.version}/${filename}`
  ) {
    throw new Error('更新清单中的安装包地址不匹配');
  }
  const files: ReleaseFile[] = [];
  for (const name of android ? [filename] : [filename, filename + '.sig']) {
    const bytes = await readFile(join(directory, 'dist', name));
    if (!bytes.length) {
      throw new Error('发布产物为空');
    }
    files.push({ name, bytes });
  }
  if (
    'platforms' in manifest &&
    Buffer.from(files[1].bytes).toString('utf8').trim() !==
      manifest.platforms['windows-x86_64'].signature
  ) {
    throw new Error('更新清单签名与安装包签名不一致');
  }
  return { manifest, files };
};

// 共用一个发布入口，支持同时或单独发布 Windows 与 Android。
const main = async () => {
  const target = process.argv[2] ?? 'all';
  if (!['all', 'desktop', 'android'].includes(target)) {
    throw new Error('用法：pnpm release [all|desktop|android] [--check]');
  }
  const targets: ('desktop' | 'android')[] =
    target === 'all'
      ? ['desktop', 'android']
      : [target as 'desktop' | 'android'];
  const releases = await Promise.all(targets.map(readRelease));
  if (process.argv.includes('--check')) {
    console.log('发布产物校验通过：' + targets.join('、'));
    return;
  }
  if (!process.env.GH_TOKEN || !process.env.GITEE_TOKEN) {
    throw new Error('请配置 GH_TOKEN 和 GITEE_TOKEN');
  }
  // 同一站点按顺序上传两个平台，避免重复创建相同版本的 Release。
  const results = await Promise.allSettled([
    (async () => {
      for (const { manifest, files } of releases) {
        await publishGithub(manifest, files);
      }
    })(),
    (async () => {
      for (const { manifest, files } of releases) {
        await publishGitee(manifest, files);
      }
    })(),
  ]);
  const errors = results.filter((result) => result.status === 'rejected');
  if (errors.length) {
    throw new AggregateError(
      errors.map((result) => result.reason),
      '部分发布未完成，可重新运行发布命令',
    );
  }
  console.log('安装包与更新清单已发布到 GitHub 与 Gitee');
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
