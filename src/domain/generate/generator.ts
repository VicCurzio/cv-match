import type { Resume } from '@/domain/resume/resumeSchema'

/**
 * The port for cover letters (feature 0008).
 *
 * Translation (feature 0009) is not here any more: it runs on the browser's
 * own on-device translator (ADR 0008), which needs no key and sends nothing
 * anywhere, so it did not need to wait behind this port.
 *
 * No language model is wired up (ADR 0003), and the null adapter below is the
 * only implementation today. The whole app must work with it -- that is the test
 * that the port is in the right place. The day a model is switched on, it is a
 * new adapter and nothing else moves.
 */

export interface CoverLetterInput {
  resume: Resume
  role: string
  company: string
  jobPostText?: string
}

export type GenerateResult<T> =
  | { ok: true; value: T }
  | { ok: false; reason: 'not-configured' | 'failed'; message: string }

export interface Generator {
  coverLetter(input: CoverLetterInput): Promise<GenerateResult<string>>
}

const NOT_CONFIGURED = {
  ok: false,
  reason: 'not-configured',
  message:
    'La generación de texto todavía no está disponible. Mientras tanto podés usar la plantilla de carta con la estructura y los huecos para completar.',
} as const

export const nullGenerator: Generator = {
  async coverLetter() {
    return NOT_CONFIGURED
  },
}
