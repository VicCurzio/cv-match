import { z } from 'zod'

/**
 * The resume schema is the single source of truth.
 *
 * Types are inferred from it, never written by hand alongside it: a hand-written
 * type next to a schema is a duplicate that drifts. The same schema validates
 * imported `.json` files and, later, whatever the PDF/DOCX parser produces.
 */

export const RESUME_VERSION = 1

/** Dates are `YYYY-MM`. A resume never needs a day, and a plain string cannot
 *  be shifted by a timezone the way a Date can. */
export const yearMonth = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Usá el formato AAAA-MM.')

export const experienceItemSchema = z.object({
  id: z.string(),
  role: z.string(),
  company: z.string(),
  location: z.string().optional(),
  startDate: yearMonth,
  /** `null` means "still working here". */
  endDate: yearMonth.nullable(),
  bullets: z.array(z.string()),
})

export const educationItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  institution: z.string(),
  startDate: yearMonth.optional(),
  endDate: yearMonth.optional(),
  inProgress: z.boolean().default(false),
})

export const languageItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  level: z.string(),
})

/**
 * Personal data. The fields after `website` are the ones whose acceptability
 * depends on the market: normal in Argentina, a liability abroad.
 * See `domain/market`.
 */
export const personalSchema = z.object({
  fullName: z.string(),
  headline: z.string(),
  email: z.string(),
  phone: z.string(),
  city: z.string(),
  province: z.string().optional(),
  country: z.string().optional(),
  linkedin: z.string().optional(),
  website: z.string().optional(),

  /** Square JPEG data URL, already compressed. See `domain/photo`. */
  photo: z.string().optional(),
  documentId: z.string().optional(),
  birthDate: z.string().optional(),
  maritalStatus: z.string().optional(),
  nationality: z.string().optional(),
})

export const resumeSchema = z.object({
  personal: personalSchema,
  summary: z.string(),
  experience: z.array(experienceItemSchema),
  education: z.array(educationItemSchema),
  skills: z.array(z.string()),
  languages: z.array(languageItemSchema),
})

export type Resume = z.infer<typeof resumeSchema>
export type Personal = z.infer<typeof personalSchema>
export type ExperienceItem = z.infer<typeof experienceItemSchema>
export type EducationItem = z.infer<typeof educationItemSchema>
export type LanguageItem = z.infer<typeof languageItemSchema>

/** The personal fields a market profile can permit, discourage or forbid. */
export const RESTRICTABLE_FIELDS = [
  'photo',
  'documentId',
  'birthDate',
  'maritalStatus',
  'nationality',
] as const

export type RestrictableField = (typeof RESTRICTABLE_FIELDS)[number]

export const emptyResume = (): Resume => ({
  personal: {
    fullName: '',
    headline: '',
    email: '',
    phone: '',
    city: '',
  },
  summary: '',
  experience: [],
  education: [],
  skills: [],
  languages: [],
})
