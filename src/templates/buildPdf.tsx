import { pdf } from '@react-pdf/renderer'
import { applyProfile, type MarketProfile } from '@/domain/market/marketProfile'
import type { Resume } from '@/domain/resume/resumeSchema'
import { HarvardResume } from '@/templates/harvard/HarvardResume'
import { ModernResume } from '@/templates/modern/ModernResume'
import { fileName } from '@/templates/shared/format'

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
  const document = useHarvard ? (
    <HarvardResume resume={forExport} />
  ) : (
    <ModernResume resume={forExport} />
  )

  return pdf(document).toBlob()
}

export function resumeFileName(resume: Resume): string {
  return fileName(resume)
}
