import type {
  UpdateManifest,
  ReleaseFile,
  GithubRelease,
  GiteeRelease,
  GithubAsset,
} from './types.js';
import { readFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

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
  manifest: UpdateManifest,
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
    'latest.json',
    Buffer.from(JSON.stringify(manifest, null, 2)),
    'application/json',
  );

  await request(github + '/releases/' + release.id, {
    method: 'PATCH',
    headers: { ...headers, 'content-type': 'application/json' },
    body: JSON.stringify({ draft: false, make_latest: 'true' }),
  });
};

// Gitee 固定 latest 标签只存放指向完整版本产物的更新清单。
const publishGitee = async (manifest: UpdateManifest, files: ReleaseFile[]) => {
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

  // Gitee 现有的稳定更新清单版本。
  const previous = (await list()).find(
    (release) => release.tag_name === 'latest',
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
  const latest = await getRelease('latest', 'latest');

  // 指向 Gitee 版本产物的更新清单。
  const mirror = structuredClone(manifest);

  mirror.platforms['windows-x86_64'].url =
    'https://gitee.com/' +
    repository +
    '/releases/download/v' +
    manifest.version +
    '/' +
    files[0].name;

  await upload(
    latest,
    'latest.json',
    Buffer.from(JSON.stringify(mirror, null, 2)),
  );
};

// 校验本地产物后执行两个平台的发布任务。
const main = async () => {
  if (!process.env.GH_TOKEN || !process.env.GITEE_TOKEN) {
    throw new Error('请配置 GH_TOKEN 和 GITEE_TOKEN');
  }

  // 桌面 package.json 声明的版本信息。
  const pkg: {
    version: string;
  } = JSON.parse(await readFile(join(directory, 'package.json'), 'utf8'));

  // 供客户端读取的版本与签名清单。
  const manifest: UpdateManifest = JSON.parse(
    await readFile(join(directory, 'dist/latest.json'), 'utf8'),
  );

  if (manifest.version !== pkg.version) {
    throw new Error('安装包版本与应用版本不一致');
  }

  // Windows x64 对应的更新下载信息。
  const platform = manifest.platforms['windows-x86_64'];

  // 包含版本与平台信息的安装包名称。
  const filename = basename(new URL(platform.url).pathname);

  if (filename !== 'ym-video-' + pkg.version + '-windows-x64.exe') {
    throw new Error('更新清单中的安装包名称不匹配');
  }

  // 本次需要上传的安装包与签名。
  const files: ReleaseFile[] = [];

  for (const name of [filename, filename + '.sig']) {
    // 当前操作对应的文件或请求路径。
    const path = join(directory, 'dist', name);

    if (!(await stat(path)).size) {
      throw new Error('发布产物为空');
    }

    files.push({ name, bytes: await readFile(path) });
  }

  if (
    Buffer.from(files[1].bytes).toString('utf8').trim() !== platform.signature
  ) {
    throw new Error('更新清单签名与安装包签名不一致');
  }

  // 两个平台各自上传完成后才切换该平台更新入口。
  const results = await Promise.allSettled([
    publishGithub(manifest, files),
    publishGitee(manifest, files),
  ]);

  // 发布任务中需要报告的失败结果。
  const errors = results.filter((result) => result.status === 'rejected');

  if (errors.length) {
    throw new AggregateError(
      errors.map((result) => result.reason),
      '部分发布未完成，可重新运行发布命令',
    );
  }

  console.log('Windows 版本已发布到 GitHub 与 Gitee');
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
