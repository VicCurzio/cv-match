/**
 * The PDF reader lives in `domain/export` because the app uses it too: the
 * analysis engine needs the real page count, not an estimate. Re-exported here
 * so the tests keep a single obvious import.
 */
export { readPdf, layoutFacts, type PdfContents, type LayoutFacts } from '@/domain/export/readPdfText'

/** A 1x1 JPEG, enough to stand in for a profile photo. */
export const TINY_JPEG =
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q=='
