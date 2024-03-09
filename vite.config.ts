import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    copyPublicDir: false,
    cssCodeSplit: false,
    emptyOutDir: true,
    rollupOptions: {
      input: ['src/dev/entry-client.tsx'],
      output: {
        dir: 'src/_lib/dev/static',
        entryFileNames: 'entry-client.js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
    target: 'esnext',
  },
})
