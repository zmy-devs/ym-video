import { useGiteeReleases, useGithubReleases } from 'ym-release';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { version } = require('../package.json') as { version: string };
const { GITEE_TOKEN, GH_TOKEN } = process.env;
const repo = 'ym-video';
const owner = '2514765066';

if (!GITEE_TOKEN || !GH_TOKEN) {
  throw new Error(
    '发布桌面端需要在 apps/desktop/.env.development 配置 GITEE_TOKEN 和 GH_TOKEN',
  );
}

const giteeRelease = useGiteeReleases({
  token: GITEE_TOKEN,
  repo,
  owner: 'yxingyus',
});

const githubRelease = useGithubReleases({
  token: GH_TOKEN,
  repo,
  owner,
});

const releaseNotes = readFileSync(
  join(import.meta.dirname, '../docs/release-note.md'),
  'utf8',
);
const escapedVersion = version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const releaseNotesMatch = releaseNotes.match(
  new RegExp(
    `^##\\s+${escapedVersion}(?:\\s.*)?\\r?\\n([\\s\\S]*?)(?=^##\\s|$)`,
    'm',
  ),
);
const body = releaseNotesMatch?.[1].trim() || `发布 ${version}`;
const files = [
  join(import.meta.dirname, '../dist/latest.yml'),
  join(import.meta.dirname, `../dist/${repo}-${version}.exe`),
  join(import.meta.dirname, `../dist/${repo}-${version}.exe.blockmap`),
];

const main = async () => {
  const missingFiles = files.filter((file) => !existsSync(file));
  if (missingFiles.length > 0) {
    throw new Error(
      `发布产物缺失，请先运行 pnpm build:win：${missingFiles.join(', ')}`,
    );
  }

  const release = { version, body, files };
  await Promise.all([giteeRelease(release), githubRelease(release)]);
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
