/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Add VITE_* keys here as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
