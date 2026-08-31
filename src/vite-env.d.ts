/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly DRIFT_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
