import path from 'node:path'
import { defineConfig } from 'vite-plus'

const dir = import.meta.dirname

export default defineConfig({
  test: {
    alias: {
      frictionsets: path.resolve(dir, 'src'),
    },
    coverage: {
      exclude: ['coverage/**', 'dist/**', 'scripts/**', '**/*.test.ts', '**/*.test-d.ts'],
      provider: 'v8',
    },
    globals: true,
  },
  lint: {
    ignorePatterns: ['dist/**'],
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  fmt: {
    ignorePatterns: ['dist/**'],
    printWidth: 100,
    semi: false,
    singleQuote: true,
    sortPackageJson: false,
  },
})
