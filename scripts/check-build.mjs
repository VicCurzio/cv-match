#!/usr/bin/env node
/**
 * Checks the built site before it is published.
 *
 * Two failures that tests cannot see, because they only exist in `dist/` and
 * only show on GitHub Pages -- where the site looks fine on its home address
 * and breaks on every other one:
 *
 * 1. No `404.html`. Pages has no rewrite rules, so a reload on /cv-match/editor
 *    gets GitHub's own 404 page instead of the app.
 * 2. Relative asset URLs (`./assets/...`). On /cv-match/editor they resolve to
 *    /cv-match/editor/assets/..., which does not exist: a blank page.
 *
 * `--self-test` feeds the checks a broken build and fails if they do not
 * notice. A clean run alone cannot tell a working check from a skipped one.
 */
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const BASE = '/cv-match/'

export function problemsIn(dir) {
  const problems = []
  const index = join(dir, 'index.html')
  const fallback = join(dir, '404.html')

  if (!existsSync(index)) return [`${index} does not exist: run the build first`]
  const html = readFileSync(index, 'utf8')

  if (!existsSync(fallback)) problems.push('404.html is missing: a reload on any address but the home page breaks')
  else if (readFileSync(fallback, 'utf8') !== html) problems.push('404.html is not a copy of index.html')

  const assets = [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)].map((match) => match[1])
  if (assets.length === 0) problems.push('index.html references no script or stylesheet')
  for (const url of assets) {
    if (!url.startsWith(BASE)) problems.push(`asset URL "${url}" does not start with ${BASE}`)
  }

  return problems
}

function selfTest() {
  const dir = mkdtempSync(join(tmpdir(), 'check-build-'))
  try {
    writeFileSync(join(dir, 'index.html'), '<script type="module" src="./assets/index.js"></script>')
    const found = problemsIn(dir)
    const caughtFallback = found.some((p) => p.includes('404.html is missing'))
    const caughtRelative = found.some((p) => p.includes('does not start with'))
    if (!caughtFallback || !caughtRelative) {
      console.error('check-build self-test FAILED: a broken build passed.', found)
      process.exit(1)
    }
    console.log('check-build self-test passed: a build without 404.html and with relative assets is rejected.')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

if (process.argv.includes('--self-test')) selfTest()

const problems = problemsIn('dist')
if (problems.length > 0) {
  console.error('check-build: the site is not ready to publish')
  for (const problem of problems) console.error(`  - ${problem}`)
  process.exit(1)
}
console.log('check-build: ok (404.html in place, assets under ' + BASE + ')')
