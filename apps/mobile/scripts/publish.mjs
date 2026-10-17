import { useGiteeReleases, useGithubReleases } from "ym-publish";
import { readFileSync } from "fs";
import { join } from "path";
import { createRequire } from "module";

const __dirname = import.meta.dirname;

const require = createRequire(import.meta.url);

const { version } = require("../package.json");

const { GITEE_TOKEN, GH_TOKEN } = process.env;

const giteeRelease = useGiteeReleases({
  token: GITEE_TOKEN,
  repo: "ym-video-app",
  owner: "yxingyus",
});

const githubRelease = useGithubReleases({
  token: GH_TOKEN,
  repo: "ym-video-app",
  owner: "2514765066",
});

//获取更新内容
const getDoc = version => {
  const url = join(__dirname, "../release-note.md");

  const doc = readFileSync(url).toString();

  const reg = new RegExp(`## ${version}([\\s\\S]*?)##`);

  const match = doc.match(reg);

  return match ? match[1].trim() : "";
};

const main = async () => {
  const body = getDoc(version);

  const updatePackPath = join(__dirname, `../dist/ym-video-${version}.apk`);

  await giteeRelease({
    version,
    body,
    updatePack: updatePackPath,
  });

  await githubRelease({
    version,
    body,
    updatePack: updatePackPath,
  });
};

main();
