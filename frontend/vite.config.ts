import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  server: {
    port: 63000,
    strictPort: true, // 端口被占用时直接报错，避免自动切到 63001 造成“63000 空白”错觉
    host: 'localhost',
    fs: {
      allow: [resolve(__dirname, '..')]
    },
    // 开发期显示错误遮罩，便于快速定位白屏问题
    hmr: { overlay: true },
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:63002',
        changeOrigin: true
      },
      '/uploads': {
        target: 'http://127.0.0.1:63002',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false
  }
})
