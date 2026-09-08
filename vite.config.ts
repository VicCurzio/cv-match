/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

/**
 * The privacy rule, enforced by the browser instead of by good behaviour.
 *
 * The project's central claim is that the resume never leaves the machine, and
 * until now that rested on there being no `fetch` in the code. `connect-src`
 * makes it a rule the browser applies: even an injected script, or a dependency
 * that decides to phone home, cannot reach another origin.
 *
 * Each entry earns its place:
 * - `'wasm-unsafe-eval'` in `script-src` -- `@react-pdf/renderer` compiles a
 *   WebAssembly module to lay out text. Without it the PDF fails to build with
 *   "violates the following Content Security policy directive", and only in the
 *   built site: this is the directive that has to be tried in a browser rather
 *   than reasoned about. It permits WebAssembly and nothing else -- `eval` and
 *   `new Function` stay blocked, which `'unsafe-eval'` would have opened up.
 * - `blob:` in `frame-src` -- the preview iframe shows the generated PDF as a
 *   blob URL, which is the same artifact the download button saves.
 * - `blob:` in `worker-src` -- pdfjs falls back to a blob worker.
 * - `data:` in `img-src` -- the profile photo is stored as a data URL.
 * - `'unsafe-inline'` in `style-src` -- React writes style attributes.
 *
 * It ships as a meta tag rather than a header because GitHub Pages serves
 * static files and sets no headers, and it is injected only into the build: in
 * development the same policy blocks Vite's hot-reload socket.
 */
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval'",
  "worker-src 'self' blob:",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "frame-src blob:",
  "connect-src 'self' blob: data:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join('; ')

function contentSecurityPolicy(): Plugin {
  return {
    name: 'cv-match:csp',
    apply: 'build',
    transformIndexHtml() {
      return [
        {
          tag: 'meta',
          attrs: { 'http-equiv': 'Content-Security-Policy', content: CONTENT_SECURITY_POLICY },
          injectTo: 'head-prepend',
        },
      ]
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  // Relative base so the built site works from a project subpath (GitHub Pages).
  base: './',
  plugins: [react(), tailwindcss(), contentSecurityPolicy()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'node',
    // `.tsx` is included so a component test cannot be written and then never
    // run: a suite that silently skips a file is worse than no suite.
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
