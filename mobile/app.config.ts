import type { ExpoConfig } from 'expo/config';

/**
 * 构建期注入的环境变量（来自 .github/workflows/mobile-release.yml）：
 *   - APP_VERSION_NAME            → expo.version / android.versionName
 *   - APP_VERSION_CODE            → android.versionCode
 *   - EXPO_PUBLIC_UPDATE_CHECK_URL → expo.extra.updateCheckUrl（OTA 检查地址）
 *
 * 缺失时回退到项目 CDN 默认地址；占位域名 download.example.com 仍视为未配置。
 */
const UPDATE_CHECK_URL =
  process.env.EXPO_PUBLIC_UPDATE_CHECK_URL ??
  'https://r2.skyup.top/update/latest.json';

const VERSION_NAME = process.env.APP_VERSION_NAME ?? '1.0.0';
const VERSION_CODE = (() => {
  const v = parseInt(process.env.APP_VERSION_CODE ?? '', 10);
  return Number.isFinite(v) && v > 0 ? v : 1;
})();

const config: ExpoConfig = {
  name: '宝宝世界',
  slug: 'baby-world',
  version: VERSION_NAME,
  orientation: 'default',
  icon: './assets/images/icon.png',
  scheme: 'babyworld',
  userInterfaceStyle: 'light',
  newArchEnabled: true,
  splash: {
    image: './assets/images/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#FFECD2',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.babyworld.app',
  },
  android: {
    package: 'com.babyworld.app',
    versionCode: VERSION_CODE,
    adaptiveIcon: {
      foregroundImage: './assets/images/adaptive-icon.png',
      backgroundColor: '#FFECD2',
    },
    edgeToEdgeEnabled: true,
    // 必须保留 INTERNET：OTA 自更新需要拉 latest.json + 下载 APK
    // REQUEST_INSTALL_PACKAGES：触发系统安装器安装下载完的 APK
    permissions: [
      'android.permission.INTERNET',
      'android.permission.REQUEST_INSTALL_PACKAGES',
      'android.permission.READ_MEDIA_IMAGES',
      'android.permission.RECORD_AUDIO',
    ],
  },
  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-audio',
    [
      'expo-image-picker',
      {
        photosPermission: '允许访问相册，以便为关系谱更换本地照片',
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    updateCheckUrl: UPDATE_CHECK_URL,
  },
};

export default config;
