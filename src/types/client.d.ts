// Forked from https://github.com/vitejs/vite/blob/main/packages/vite/types/importMeta.d.ts
// This file is an augmentation to the built-in ImportMeta interface
// Thus cannot contain any top-level imports
// <https://www.typescriptlang.org/docs/handbook/declaration-merging.html#module-augmentation>

interface ImportMetaEnv {
  [key: string]: any
  BASE_URL: string
  DEV: boolean
  MODE: string
  PROD: boolean
  SSR: boolean
}

interface ImportMeta {
  url: string

  readonly env: ImportMetaEnv
}
