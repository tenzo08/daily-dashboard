import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  main: {
    build: {
      lib: { entry: resolve(__dirname, 'electron/main.ts') }
    },
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    build: {
      lib: { entry: resolve(__dirname, 'electron/preload.ts') },
      // Sandboxed preload scripts (webPreferences.sandbox: true) don't
      // support ESM import — force CJS via an explicit .cjs extension so
      // Node's module loader doesn't apply the root package.json's
      // "type": "module" to this output.
      rollupOptions: {
        output: { format: 'cjs', entryFileNames: '[name].cjs' }
      }
    },
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    root: resolve(__dirname, 'src'),
    build: {
      rollupOptions: {
        input: resolve(__dirname, 'src/index.html')
      }
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src')
      }
    },
    plugins: [react(), tailwindcss()]
  }
})
