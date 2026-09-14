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
 * 2. Relative URLs to the site's own files (`./assets/...`, `./favicon.svg`).
 *    On /cv-match/editor they resolve to /cv-match/editor/..., which does not
 *    exist: a blank page for a script, a missing tab icon for the favicon.
 *    Every local `src` and `href` is checked, not only scripts and styles --
 *    checking only those let the favicon ship broken.
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

  const urls = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((match) => match[1])
  // Other origins and in-page links are not the site's files.
  const local = urls.filter((url) => !/^(?:[a-z]+:|\/\/|#)/i.test(url))
  if (!local.some((url) => /\.js$/.test(url))) problems.push('index.html references no script')
  for (const url of local) {
    if (!url.startsWith(BASE)) problems.push(`URL "${url}" does not start with ${BASE}`)
  }

  /*
   * The share image is referenced by an absolute URL, which the relative-URL
   * check above does not look at -- and a card that points at a missing file
   * shows a broken preview in every chat it is pasted into.
   */
  const SITE = 'https://viccurzio.github.io' + BASE
  for (const match of html.matchAll(/(?:property|name)="(?:og:image|twitter:image)"\s+content="([^"]+)"/g)) {
    const url = match[1]
    if (!url.startsWith(SITE)) {
      problems.push(`share image "${url}" is not under ${SITE}`)
      continue
    }
    if (!existsSync(join(dir, url.slice(SITE.length)))) problems.push(`share image "${url}" is not in the build`)
  }

  return problems
}

function selfTest() {
  const dir = mkdtempSync(join(tmpdir(), 'check-build-'))
  try {
    writeFileSync(
      join(dir, 'index.html'),
      '<link rel="icon" href="./favicon.svg" /><meta property="og:image" content="https://viccurzio.github.io/cv-match/missing.png" /><script type="module" src="/cv-match/assets/index.js"></script>',
    )
    const found = problemsIn(dir)
    const caughtFallback = found.some((p) => p.includes('404.html is missing'))
    // The script is fine here on purpose: only the favicon is wrong, which is
    // the exact case the first version of this check let through.
    const caughtRelative = found.some((p) => p.includes('"./favicon.svg"'))
    const caughtImage = found.some((p) => p.includes('missing.png') && p.includes('not in the build'))
    if (!caughtFallback || !caughtRelative || !caughtImage) {
      console.error('check-build self-test FAILED: a broken build passed.', found)
      process.exit(1)
    }
    console.log('check-build self-test passed: a build without 404.html, with a relative favicon and a missing share image is rejected.')
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
