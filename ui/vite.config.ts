import { defineConfig } from 'vite'
import React from '@vitejs/plugin-react'
import UnoCSS from 'unocss/vite'
import { presetAttributify, presetUno, transformerAttributifyJsx } from 'unocss'

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
  plugins: [
    UnoCSS({
      presets: [presetUno(), presetAttributify()],
      transformers: [transformerAttributifyJsx()],
    }),
    React(),
  ],
})
