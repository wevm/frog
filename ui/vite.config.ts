import { defineConfig } from 'vite'
import React from '@vitejs/plugin-react-swc'

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  build: {
    copyPublicDir: false,
    emptyOutDir: true,
    rollupOptions: {
      input: 'src/main.tsx',
      output: {
        assetFileNames: 'assets/[name].[ext]',
        dir: '../src/ui',
        entryFileNames: '[name].js',
      },
    },
    target: 'esnext',
  },
  plugins: [React()],
})
