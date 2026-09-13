import { z } from 'zod'

/**
 * Market, reader and layout -- the three choices that decide what gets exported.
 *
 * Its own module because two things own a set of them now: the base resume and
 * each version. A version for a multinational's web form wants the ATS template
 * while the version for a local shop's inbox wants the photo, from the same facts.
 */
export const settingsSchema = z.object({
  market: z.enum(['AR', 'INTL']),
  atsMode: z.boolean(),
  template: z.enum(['harvard', 'modern']),
})

export type Settings = z.infer<typeof settingsSchema>

export const defaultSettings = (): Settings => ({
  market: 'AR',
  atsMode: false,
  template: 'modern',
})
