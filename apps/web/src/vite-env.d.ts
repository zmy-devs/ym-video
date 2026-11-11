/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PLATFORM: 'desktop' | 'mobile';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
