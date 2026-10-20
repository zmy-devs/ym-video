const { productName } = require('./package.json');

/**
 * @type {import('electron-builder').Configuration}
 */
module.exports = {
  appId: 'com.2514765066.ym-video',
  productName,
  files: ['out/main', 'out/preload', 'out/renderer'],
  asar: false,
  electronLanguages: ['zh-CN'],
  directories: {
    output: 'dist',
  },
  icon: 'build/icon.png',

  nsis: {
    differentialPackage: true,
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    artifactName: 'ym-video-${version}.${ext}',
    shortcutName: '${productName}',
    uninstallDisplayName: '${productName}',
    deleteAppDataOnUninstall: false,
  },

  generateUpdatesFilesForAllChannels: false,
  publish: [
    {
      provider: 'github',
      owner: 'zmy-devs',
      repo: 'ym-video',
    },
  ],
};
