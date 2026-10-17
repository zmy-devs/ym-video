import { version } from './package.json';

// 保留原应用名称、Expo slug 和深链协议，不跟随工作区包名变化。
const name = 'ym-video';

export default {
  expo: {
    name,
    slug: name,
    version,
    orientation: 'portrait',
    icon: './src/assets/images/icon.png',
    userInterfaceStyle: 'automatic',
    scheme: name.replace('-', ''),
    android: {
      edgeToEdgeEnabled: true,
      package: 'com.zhangmingyang.ymvideo',
      jsEngine: 'hermes',
      permissions: ['WRITE_SETTINGS', 'REQUEST_INSTALL_PACKAGES'],
    },

    plugins: [
      [
        'expo-splash-screen',
        {
          image: './src/assets/images/icon.png',
          imageWidth: 200,
          resizeMode: 'contain',
          backgroundColor: '#191919',
        },
      ],
      [
        'expo-build-properties',
        {
          android: {
            buildArchs: ['arm64-v8a'],
          },
        },
      ],
      'expo-sqlite',
    ],

    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },

    extra: {
      eas: {
        projectId: process.env.EAS_PROJECTID_YMVIDEO,
      },
    },
  },
};
