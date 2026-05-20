import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import obfuscatorPlugin from 'rollup-plugin-obfuscator'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png'],
      manifest: {
        name: 'Transport Manager',
        short_name: 'TransportMgr',
        description: 'Transport Management Offline App',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      }
    }),
    // ── JS obfuscation (production only) ─────────────────────────────────────
    // Runs AFTER Vite bundles — scrambles identifiers, strings, control flow.
    // Makes extracting business logic from the APK extremely difficult.
    obfuscatorPlugin({
      options: {
        compact: true,
        controlFlowFlattening: true,
        controlFlowFlatteningThreshold: 0.5,
        deadCodeInjection: true,
        deadCodeInjectionThreshold: 0.2,
        debugProtection: false,          // leave false — breaks some runtimes
        disableConsoleOutput: true,
        identifierNamesGenerator: 'hexadecimal',
        log: false,
        renameGlobals: false,            // keep false — Capacitor globals must stay
        rotateStringArray: true,
        selfDefending: true,             // detects tampering with the bundle
        shuffleStringArray: true,
        splitStrings: true,
        splitStringsChunkLength: 8,
        stringArray: true,
        stringArrayEncoding: ['base64'],
        stringArrayIndexShift: true,
        stringArrayWrappersCount: 2,
        stringArrayWrappersChainedCalls: true,
        stringArrayWrappersParametersMaxCount: 4,
        stringArrayWrappersType: 'function',
        stringArrayThreshold: 0.75,
        unicodeEscapeSequence: false,
      }
    })
  ],
  build: {
    // Produce a single chunk so obfuscation is maximally effective
    rollupOptions: {
      output: {
        manualChunks: undefined,
      }
    }
  },
  server: {
    port: 5174,
    host: true
  }
})
