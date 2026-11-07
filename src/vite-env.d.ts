/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** API 请求基址：开发为空（走 vite 代理），线上为 /ai-writer（nginx 反代）或完整域名。 */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
