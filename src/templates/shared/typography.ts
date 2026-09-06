import { Font } from '@react-pdf/renderer'

/**
 * Turn off hyphenation for the whole document.
 *
 * `@react-pdf/renderer` hyphenates by default with an English dictionary, and on
 * a resume that is actively harmful. The case that caught it: an email address
 * in the narrow sidebar came out as
 *
 *     anagomez1992@exam-
 *     ple.com
 *
 * A recruiter who copies that gets a broken address and an automated parser
 * reads a broken address -- on the single most important field of the document.
 * Spanish prose fares no better, since the dictionary is for another language.
 *
 * The callback receives a word and returns the pieces it may be split into.
 * Returning the whole word means "never split this".
 */
export function disableHyphenation(): void {
  Font.registerHyphenationCallback((word) => [word])
}

/**
 * The PDF standard fonts, used on purpose.
 *
 * They are built into every PDF reader, so nothing is embedded and nothing is
 * downloaded at runtime, and they use WinAnsi encoding -- Latin-1 -- which
 * covers accents, the enye and the opening marks that Spanish needs. Swapping in
 * a custom typeface means `Font.register` plus re-testing the accents, which is
 * the first thing that breaks.
 */
export const FONTS = {
  sans: 'Helvetica',
  sansBold: 'Helvetica-Bold',
  serifBold: 'Times-Bold',
} as const
