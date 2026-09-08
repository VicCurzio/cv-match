/**
 * Runs before every commit, via husky.
 *
 * The callbacks take no arguments on purpose. lint-staged appends the staged
 * filenames to a plain command string, and these three checks are project-wide:
 * `tsc` needs the whole program to judge one file, and the layer guard needs
 * every import in `src/` to know whether a boundary was crossed. Passing them a
 * file list would make them answer a different, weaker question.
 *
 * This is the fast feedback loop, not the guarantee -- it can be skipped with
 * `--no-verify`. The guarantee is the same `npm run verify` in CI.
 */
export default {
  '*.{ts,tsx}': () => ['oxlint', 'npm run typecheck', 'npm run check:layers'],
}
