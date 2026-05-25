import { execSync } from 'node:child_process'

import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vitest/config'
import { VitePWA } from 'vite-plugin-pwa'

import packageJson from './package.json' with { type: 'json' }

// J16: derive a short git SHA + ISO build date so the About row always reflects
// the actual code shipped, even though package.json.version doesn't bump per
// commit. Wrapped in try/catch so non-git builds (CI without depth, vitest in
// a worktree) fall back to safe placeholders instead of crashing the config.
function resolveBuildSha(): string {
  try {
    return execSync('git rev-parse --short=7 HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim()
  } catch {
    return 'dev'
  }
}

const BUILD_SHA = resolveBuildSha()
const BUILD_DATE = new Date().toISOString().slice(0, 10) // YYYY-MM-DD

// https://vite.dev/config/
export default defineConfig({
  base: '/hrv/',
  define: {
    // J14: surface the package.json version to the runtime for the About
    // section. Stringified at config-time; the bundle gets a plain literal,
    // not a runtime require of package.json.
    __APP_VERSION__: JSON.stringify(packageJson.version),
    // J16: build-time git SHA + ISO date so the About row stays fresh on
    // every build without bumping package.json per commit.
    __APP_BUILD_SHA__: JSON.stringify(BUILD_SHA),
    __APP_BUILD_DATE__: JSON.stringify(BUILD_DATE),
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      strategies: 'generateSW',
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: [
        'favicon.svg',
        'apple-touch-icon.png',
        'pwa-192x192.png',
        'pwa-512x512.png',
        'pwa-maskable-192x192.png',
        'pwa-maskable-512x512.png',
      ],
      manifest: {
        name: 'HRV Breathing',
        short_name: 'HRV Breathing',
        description: 'Guided HRV breathing sessions — inhale, exhale, relax.',
        theme_color: '#5e81ac',
        background_color: '#eceff4',
        display: 'standalone',
        // start_url and scope intentionally omitted — auto-default to Vite base, which is now parameterized at build time via `--base` (e.g. `/hrv/`, `/hrv/v2.0/`). Each versioned build's SW auto-scopes to its own subpath; root and versioned subpaths do not collide.
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'pwa-maskable-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: 'pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,wasm,css,html,png,svg,woff2}'],
        // App locales are EN + pt-BR (both Latin-script). Latin + Latin-ext
        // woff2 still precache; cyrillic/greek/vietnamese subsets emit to
        // dist/ but stay out of the SW install (~85 KB precache trim).
        globIgnores: ['**/inter-{cyrillic,cyrillic-ext,greek,greek-ext,vietnamese}-*.woff2'],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './vitest.setup.ts',
  },
})
