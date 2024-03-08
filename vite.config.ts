import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    copyPublicDir: false,
    emptyOutDir: true,
    rollupOptions: {
      input: ['src/dev/entry-client.tsx'],
      output: {
        dir: 'src/_lib/dev/static',
        entryFileNames: 'entry-client.js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames(assetInfo) {
          if (assetInfo.name?.endsWith('.woff2'))
            return 'dev/static/assets/[name].[ext]'
          return 'assets/[name].[ext]'
        },
      },
    },
    target: 'esnext',
  },
})
