import type { Resume } from '@/domain/resume/resumeSchema'
import {
  emptyTranslation,
  listSegments,
  writeSegment,
  type ReviewReason,
  type SegmentPath,
  type Translation,
} from '@/domain/resume/translation'
import { addedNumbers } from '@/shared/utils/text'
import { CEFR, JOB_TITLES, LANGUAGE_LEVELS, LANGUAGE_NAMES, PROTECTED_TOOLS, SKILLS, glossaryKey, hoursDetail } from './glossary'

/** Turns Spanish text into English. The browser's on-device translator, or a fake in tests. */
export type TranslateText = (text: string) => Promise<string>

interface Draft {
  text: string
  review?: ReviewReason
}

/**
 * Names that must not be translated in this resume: the person, the places, the
 * companies and institutions, and known products. Longest first, so "Tango
 * Gestión" is protected before "Tango".
 */
function protectedTerms(base: Resume): string[] {
  const own = [
    base.personal.fullName,
    base.personal.city,
    base.personal.province ?? '',
    base.personal.country ?? '',
    ...base.experience.flatMap((item) => [item.company, item.location ?? '']),
    ...base.education.map((item) => item.institution),
    ...base.courses.map((item) => item.institution),
  ]
  return [...new Set([...own, ...PROTECTED_TOOLS].map((term) => term.trim()).filter((term) => term.length > 1))].sort(
    (a, b) => b.length - a.length,
  )
}

/**
 * Translates with the names held out: each protected term is swapped for a
 * marker, the text is translated, and the markers are put back.
 *
 * If the translator mangles a marker, the text is translated again without
 * them and marked for review -- a name translated by mistake is better seen
 * than silently lost.
 */
async function translateProtected(text: string, terms: string[], translate: TranslateText): Promise<Draft> {
  const found: string[] = []
  let masked = text
  for (const term of terms) {
    if (!masked.includes(term)) continue
    found.push(term)
    masked = masked.split(term).join(`[${found.length - 1}]`)
  }

  let result = await translate(masked)
  let review: ReviewReason | undefined
  const restored = found.every((_, index) => result.includes(`[${index}]`))
  if (restored) {
    found.forEach((term, index) => {
      result = result.split(`[${index}]`).join(term)
    })
  } else {
    result = await translate(text)
    review = 'protected-term-lost'
  }

  // Figures are facts: a translation that adds, drops or changes one is flagged.
  if (!review && (addedNumbers(text, result).length > 0 || addedNumbers(result, text).length > 0)) {
    review = 'numbers-changed'
  }
  return { text: result, ...(review ? { review } : {}) }
}

/**
 * "Administrativa · Atención al cliente": each part mapped or translated on its
 * own. A headline lists areas as much as titles, so an area reading ("Customer
 * service") wins over a job title ("Customer Service Representative").
 */
async function translateHeadline(text: string, terms: string[], translate: TranslateText): Promise<Draft> {
  const parts = text.split(/\s*[·|]\s*/)
  const drafts = await Promise.all(
    parts.map(async (part): Promise<Draft> => {
      const known = SKILLS.get(glossaryKey(part)) ?? JOB_TITLES.get(glossaryKey(part))
      return known ? { text: known } : translateProtected(part, terms, translate)
    }),
  )
  const review = drafts.find((draft) => draft.review)?.review
  return { text: drafts.map((draft) => draft.text).join(' · '), ...(review ? { review } : {}) }
}

async function draftFor(
  path: SegmentPath,
  source: string,
  terms: string[],
  translate: TranslateText,
): Promise<Draft> {
  switch (path.kind) {
    case 'headline':
      return translateHeadline(source, terms, translate)
    case 'role': {
      const known = JOB_TITLES.get(glossaryKey(source))
      if (known) return { text: known }
      const draft = await translateProtected(source, terms, translate)
      return { text: draft.text, review: draft.review ?? 'title-not-in-glossary' }
    }
    case 'education': {
      // A degree has no exact equivalent: kept as it is, with what it means beside it.
      const meaning = await translateProtected(source, terms, translate)
      return { text: `${source} (${meaning.text})`, ...(meaning.review ? { review: meaning.review } : {}) }
    }
    case 'courseDetail': {
      const hours = hoursDetail(source)
      return hours ? { text: hours } : translateProtected(source, terms, translate)
    }
    case 'skill': {
      const known = SKILLS.get(glossaryKey(source))
      if (known) return { text: known }
      if (terms.includes(source.trim())) return { text: source }
      return translateProtected(source, terms, translate)
    }
    case 'languageName': {
      const known = LANGUAGE_NAMES.get(glossaryKey(source))
      return known ? { text: known } : translateProtected(source, terms, translate)
    }
    case 'languageLevel': {
      if (CEFR.test(source.trim())) return { text: source.trim() }
      const known = LANGUAGE_LEVELS.get(glossaryKey(source))
      if (known) return { text: known }
      // "A2 - lectura y comprensión": the letter stays, the rest is translated.
      const [first, ...rest] = source.split(/\s*[-–,]\s*/)
      if (first && CEFR.test(first) && rest.length > 0) {
        const tail = await translateProtected(rest.join(', '), terms, translate)
        return { text: `${first}, ${tail.text}`, ...(tail.review ? { review: tail.review } : {}) }
      }
      return translateProtected(source, terms, translate)
    }
    default:
      return translateProtected(source, terms, translate)
  }
}

/**
 * Translates what still needs it and returns the new layer.
 *
 * Segments already translated from the Spanish on the resume now are kept as
 * they are -- including whatever the person edited by hand. Only missing ones,
 * and ones whose Spanish changed since, go to the translator.
 */
export async function buildTranslation(
  base: Resume,
  previous: Translation | undefined,
  translate: TranslateText,
  onProgress?: (done: number, total: number) => void,
): Promise<Translation> {
  const terms = protectedTerms(base)
  const todo = listSegments(base, previous).filter((row) => row.state !== 'translated')
  let layer = previous
  let done = 0
  for (const row of todo) {
    const draft = await draftFor(row.path, row.source, terms, translate)
    layer = writeSegment(base, layer, row.path, { source: row.source, ...draft })
    done++
    onProgress?.(done, todo.length)
  }
  return layer ?? emptyTranslation()
}
