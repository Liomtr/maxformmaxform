import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

function normalizeModuleId(id: string) {
  return id.replace(/\\/g, '/')
}

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
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          const moduleId = normalizeModuleId(id)
          if (!moduleId.includes('node_modules')) return
          if (moduleId.includes('/node_modules/zrender/')) return 'vendor-zrender'
          if (moduleId.includes('/node_modules/echarts/core') || moduleId.includes('/node_modules/echarts/lib/core')) {
            return 'vendor-echarts-core'
          }
          if (moduleId.includes('/node_modules/echarts/charts') || moduleId.includes('/node_modules/echarts/lib/chart')) {
            return 'vendor-echarts-charts'
          }
          if (moduleId.includes('/node_modules/echarts/components') || moduleId.includes('/node_modules/echarts/lib/component')) {
            return 'vendor-echarts-components'
          }
          if (moduleId.includes('/node_modules/echarts/renderers') || moduleId.includes('/node_modules/echarts/lib/renderer')) {
            return 'vendor-echarts-renderers'
          }
          if (moduleId.includes('/node_modules/echarts/')) return 'vendor-echarts'

          if (moduleId.includes('/node_modules/@element-plus/icons-vue/')) {
            return 'vendor-element-plus-icons'
          }

          const elementPlusComponentMatch = moduleId.match(/\/node_modules\/element-plus\/es\/components\/([^/]+)\//)
          if (elementPlusComponentMatch) {
            return `vendor-ep-${elementPlusComponentMatch[1]}`
          }

          if (moduleId.includes('/node_modules/element-plus/')) {
            return 'vendor-element-plus-core'
          }

          if (moduleId.includes('/node_modules/quill/')) {
            return 'vendor-quill'
          }

          if (moduleId.includes('/node_modules/@wangeditor/editor-for-vue/')) {
            return 'vendor-wangeditor-vue'
          }

          if (moduleId.includes('/node_modules/@wangeditor/')) {
            return 'vendor-wangeditor-core'
          }

          if (moduleId.includes('/node_modules/highlight.js/')) {
            return 'vendor-highlight'
          }

          if (moduleId.includes('/node_modules/vue/') || moduleId.includes('/node_modules/pinia/') || moduleId.includes('/node_modules/vue-router/')) {
            return 'vendor-vue'
          }
        }
      }
    }
  }
})
