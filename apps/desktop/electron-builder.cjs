/**
 * @type {import('electron-builder').Configuration}
 */
module.exports = {
  // 依赖提升到工作区根目录后，显式解析已安装的 Electron 版本。
  electronVersion: require('electron/package.json').version,
  appId: `com.2514765066.ym-video`,
  artifactName: "ym-video",
  productName: "ym-video",
  files: ["out"],
  asar: false,
  electronLanguages: ["zh-CN"],
  directories: {
    output: "dist",
  },
  icon: "build/icon.png",

  nsis: {
    differentialPackage: false,
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    artifactName: "${productName}-${version}.${ext}",
    shortcutName: "${productName}",
    uninstallDisplayName: "${productName}",
    deleteAppDataOnUninstall: true,
  },

  generateUpdatesFilesForAllChannels: false,
};
