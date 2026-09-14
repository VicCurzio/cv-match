import { pdf } from '@react-pdf/renderer'
import type { Letter } from '@/domain/letter/letterModel'
import { applyProfile, type MarketProfile } from '@/domain/market/marketProfile'
import type { Resume } from '@/domain/resume/resumeSchema'
import { HarvardResume } from '@/templates/harvard/HarvardResume'
import { CoverLetter } from '@/templates/letter/CoverLetter'
import { ModernResume } from '@/templates/modern/ModernResume'
import { fileName } from '@/templates/shared/format'
import type { Locale } from '@/templates/shared/labels'
import { disableHyphenation } from '@/templates/shared/typography'

// Global font setting, applied once when this module loads.
disableHyphenation()

/**
 * Composing the document lives with the templates, not in `domain`: picking and
 * rendering a layout is exactly what this layer is for, and `domain` must not
 * depend on how the resume is drawn. (The layer guard caught this the first
 * time it was written the other way round.)
 */

export type TemplateId = 'harvard' | 'modern'

export interface BuildOptions {
  profile: MarketProfile
  atsMode: boolean
  template: TemplateId
  /** The language the template's own words are printed in. Spanish when absent. */
  locale?: Locale
}

/**
 * One Blob, used by both the preview and the download. That is the whole point:
 * with a separate HTML "preview" beside a real export, the two drift and the
 * file people send stops matching what they approved on screen.
 */
export async function buildPdf(resume: Resume, options: BuildOptions): Promise<Blob> {
  // Forbidden fields are stripped once, here, before any template sees them.
  const forExport = applyProfile(resume, options.profile, { atsMode: options.atsMode })

  // ATS mode forces the single-column template whatever is selected.
  const useHarvard = options.atsMode || options.template === 'harvard'
  const locale = options.locale ?? 'es'
  const document = useHarvard ? (
    <HarvardResume resume={forExport} locale={locale} />
  ) : (
    <ModernResume resume={forExport} locale={locale} />
  )

  return pdf(document).toBlob()
}

export function resumeFileName(resume: Resume, company?: string, locale: Locale = 'es'): string {
  return fileName(resume, company, locale === 'en' ? 'Resume' : 'CV')
}

/**
 * The cover letter travels with the resume, so it takes the same typeface: the
 * two arrive in one email and a mismatch reads as two documents pasted together.
 */
export async function buildLetterPdf(
  resume: Resume,
  letter: Letter,
  options: BuildOptions,
): Promise<Blob> {
  const forExport = applyProfile(resume, options.profile, { atsMode: options.atsMode })
  const serifHeadings = options.atsMode || options.template === 'harvard'
  return pdf(
    <CoverLetter resume={forExport} letter={letter} serifHeadings={serifHeadings} locale={options.locale ?? 'es'} />,
  ).toBlob()
}

export function letterFileName(resume: Resume, company?: string, locale: Locale = 'es'): string {
  return fileName(resume, company, locale === 'en' ? 'Cover-Letter' : 'Carta')
}
