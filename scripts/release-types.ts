// 构建与发布共用的 Tauri 更新清单。
export interface UpdateManifest {
  version: string;
  notes: string;
  pub_date: string;
  platforms: {
    'windows-x86_64': {
      url: string;
      signature: string;
    };
  };
}

// Android 独立更新入口对应的版本与 Gitee APK 直链。
export interface AndroidUpdateManifest {
  version: string;
  notes: string;
  url: string;
}

// 发布脚本读取的一个本地附件。
export interface ReleaseFile {
  name: string;
  bytes: Uint8Array;
}

// GitHub 已上传附件的查询结果。
export interface GithubAsset {
  id: number;
  name: string;
  browser_download_url: string;
}

// GitHub 创建或查询到的发行版本。
export interface GithubRelease {
  id: number;
  upload_url: string;
}

// Gitee 发行版本和公开下载附件。
export interface GiteeRelease {
  id: number;
  tag_name: string;
  assets: Array<{
    name: string;
    browser_download_url: string;
  }>;
}
