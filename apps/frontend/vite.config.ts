import { defineConfig, type PluginOption } from 'vite'
import react from '@vitejs/plugin-react'
import { createRequire } from 'node:module'

// https://vite.dev/config/
const require = createRequire(import.meta.url)

export default defineConfig(({ mode }) => {
  const isProd = mode === 'production'
  const enableAnalyzer = process.env.VITE_ENABLE_BUNDLE_ANALYZER === 'true'
  const plugins: PluginOption[] = [react()]

  if (!isProd && enableAnalyzer) {
    try {
      const { bundleVisualizer } = require('./build/bundleVisualizer')
      plugins.push(bundleVisualizer())
    } catch {
      // Optional plugin, ignore if missing in non-dev environments.
    }
  }

  return {
    plugins,
    build: {
      // Code splitting configuration
      rollupOptions: {
        output: {
          manualChunks: {
            // React core
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            // UI libraries
            'vendor-ui': ['lucide-react'],
            // Charts and heavy libraries
            'vendor-charts': ['recharts'],
          },
        },
      },
      // Optimize chunk size
      chunkSizeWarningLimit: 1000,
      // Enable minification (esbuild is faster than terser)
      minify: 'esbuild',
      // Disable source maps in production for smaller bundle
      sourcemap: !isProd,
    },
  }
})
