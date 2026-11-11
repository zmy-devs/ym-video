export type Platform = 'desktop' | 'mobile';

const configuredPlatform = import.meta.env.VITE_PLATFORM;

if (configuredPlatform !== 'desktop' && configuredPlatform !== 'mobile') {
  throw new Error('VITE_PLATFORM 必须是 desktop 或 mobile');
}

// 平台在构建时固定，页面运行期间不会切换。
export const platform = configuredPlatform as Platform;

// 根据构建目标选择应用壳和平台交互。
export const isDesktop = platform === 'desktop';
export const isMobile = platform === 'mobile';
