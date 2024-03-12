import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  build: {
    copyPublicDir: false,
    emptyOutDir: true,
    rollupOptions: {
      input: ['index.html', 'src/frog-client.ts'],
      output: {
        assetFileNames: 'assets/[name].[ext]',
        chunkFileNames: 'assets/[name].js',
        dir: '../src/dev/ui',
        entryFileNames: '[name].js',
      },
    },
  },
  logLevel: 'error',
  plugins: [react()],
})
