#!/usr/bin/env node
/**
 * Layer rule guard.
 *
 * The architecture is only real if something enforces it. This script reads
 * every import in `src/` and fails when one crosses a forbidden boundary.
 *
 *   screens  ->  templates  ->  domain  ->  shared  ->  assets
 *   screens  ---------------->  domain
 *
 * `templates` sits downstream of `domain` because a template is typed by the
 * domain's contract (`Resume`, `MarketProfile`). It reads those types and draws;
 * it never reads storage and never decides anything.
 *
 * It is written by hand on purpose. A generic boundaries linter needs a module
 * resolver, and an import the resolver does not understand disappears from the
 * check *silently* -- the run goes green while verifying nothing. Here the
 * alias is read literally, so there is nothing to misconfigure.
 *
 * Run with `--self-test` to prove the guard is awake: it feeds itself an import
 * that MUST be rejected and fails if it is not. A clean run does not prove the
 * check is on; it looks exactly like a check that is off.
 */
import { readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

/** Which layer each path belongs to. First match wins, so order matters. */
const LAYERS = [
  { type: 'app', test: (p) => /^(main|App)\./.test(p) },
  { type: 'screens', test: (p) => p.startsWith('screens/') },
  { type: 'domain', test: (p) => p.startsWith('domain/') },
  { type: 'templates', test: (p) => p.startsWith('templates/') },
  { type: 'shared', test: (p) => p.startsWith('shared/') },
  { type: 'assets', test: (p) => p.startsWith('assets/') },
  { type: 'test', test: (p) => p.startsWith('test/') },
]

/** What each layer is allowed to import. Anything not listed is forbidden. */
const ALLOWED = {
  app: ['app', 'screens', 'domain', 'templates', 'shared', 'assets'],
  screens: ['screens', 'domain', 'templates', 'shared', 'assets'],
  domain: ['domain', 'shared', 'assets'],
  templates: ['templates', 'domain', 'shared', 'assets'],
  shared: ['shared', 'assets'],
  assets: ['assets'],
  test: ['test', 'domain', 'templates', 'shared', 'assets'],
}

const SRC = new URL('../src/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')

function layerOf(rel) {
  const posix = rel.split(sep).join('/')
  return LAYERS.find((l) => l.test(posix))?.type ?? null
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walk(full, out)
    else if (/\.(ts|tsx)$/.test(entry)) out.push(full)
  }
  return out
}

/** Every `from '...'` / `import('...')` specifier in a file. */
function importsOf(source) {
  const found = []
  const re = /(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g
  let m
  while ((m = re.exec(source)) !== null) found.push(m[1])
  return found
}

/**
 * Resolve a specifier to a layer, or null when it is not internal.
 * Only `@/...` and relative paths can cross a boundary; bare package names
 * are node_modules and never do.
 */
function targetLayer(spec, fromRel) {
  let rel
  if (spec.startsWith('@/')) {
    rel = spec.slice(2)
  } else if (spec.startsWith('.')) {
    const dir = fromRel.split(sep).slice(0, -1)
    const parts = spec.split('/')
    for (const part of parts) {
      if (part === '.') continue
      else if (part === '..') dir.pop()
      else dir.push(part)
    }
    rel = dir.join('/')
  } else {
    return null
  }
  return layerOf(rel.split('/').join(sep))
}

function check(files) {
  const violations = []
  for (const file of files) {
    const rel = relative(SRC, file)
    // Tests are not production code: they may reach into any layer to set up a
    // case. Excluding them keeps the rule about what actually ships.
    if (/\.test\.tsx?$/.test(rel)) continue
    const from = layerOf(rel)
    if (!from) continue
    const allowed = ALLOWED[from] ?? []
    for (const spec of importsOf(readFileSync(file, 'utf8'))) {
      const to = targetLayer(spec, rel)
      if (to && !allowed.includes(to)) {
        violations.push(`${rel.split(sep).join('/')}: ${from} cannot import from ${to}  (${spec})`)
      }
    }
  }
  return violations
}

if (process.argv.includes('--self-test')) {
  // Give the guard a real file it MUST reject. A green run on clean code proves
  // nothing: it is indistinguishable from a guard that is switched off.
  const fixture = join(SRC, 'shared', '_layer_guard_fixture.ts')
  writeFileSync(fixture, "import { RESUME_VERSION } from '@/domain/resume/resumeSchema'\nexport const guard = RESUME_VERSION\n")
  let caught
  try {
    caught = check([fixture])
  } finally {
    rmSync(fixture, { force: true })
  }
  if (caught.length === 0) {
    console.error('check-layers self-test FAILED: an illegal shared -> domain import was not rejected.')
    process.exit(1)
  }
  console.log('check-layers self-test passed: the guard still rejects shared -> domain.')
  process.exit(0)
}

const violations = check(walk(SRC))
if (violations.length) {
  console.error('Layer rule violations:\n' + violations.map((v) => '  ' + v).join('\n'))
  process.exit(1)
}
console.log(`check-layers: ok (${walk(SRC).length} files).`)
