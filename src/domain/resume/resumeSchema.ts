import { z } from 'zod'

/**
 * The resume schema is the single source of truth.
 *
 * Types are inferred from it, never written by hand alongside it: a hand-written
 * type next to a schema is a duplicate that drifts. The same schema validates
 * imported `.json` files and, later, whatever the PDF/DOCX parser produces.
 */

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

/**
 * Courses and certifications, kept apart from formal education.
 *
 * Mixing them is the default mistake and it costs both sections: a secondary
 * school diploma listed next to a two-day sales workshop makes the schooling
 * look padded and buries the training that is actually recent and relevant.
 * Separated, "Educación" stays short and credible and "Cursos" shows someone
 * who keeps studying -- which for an administrative or commercial profile is
 * often the part that differentiates two identical resumes.
 */
/**
 * A course often has only a year attached to it.
 *
 * Nobody remembers the month of a three-hour training, and a resume does not
 * need it. Demanding `AAAA-MM` here pushed people to invent a month or to leave
 * the date out entirely, and a course with no date at all reads as older than
 * it is. Jobs still require the month: for those the month is known and it is
 * what the dates on a resume are read against.
 */
export const yearOrMonth = z
  .string()
  .regex(/^\d{4}(-(0[1-9]|1[0-2]))?$/, 'Usá el año (AAAA) o el año y el mes (AAAA-MM).')

export const courseItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  institution: z.string(),
  endDate: yearOrMonth.optional(),
  inProgress: z.boolean().default(false),
  /** Hours, or a credential number. Shown only when it is there. */
  detail: z.string().optional(),
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

  /**
   * Square JPEG data URL, already compressed. See `domain/photo`.
   *
   * The shape is checked, not just the type. Everything else here is the
   * person's own text, rendered as text; this one value is handed straight to
   * an `<img src>` and to the PDF renderer, and it can arrive from a `.json`
   * file that this app did not write. Only a real base64 image data URL gets in.
   */
  photo: z
    .string()
    .regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/, 'La foto no es una imagen.')
    .optional(),
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
  /**
   * Optional with a default, on purpose: every resume already saved in someone's
   * browser was written before this section existed, and a required field would
   * make all of them fail validation and vanish on the next load.
   */
  courses: z.array(courseItemSchema).default([]),
  skills: z.array(z.string()),
  languages: z.array(languageItemSchema),
})

export type Resume = z.infer<typeof resumeSchema>
export type Personal = z.infer<typeof personalSchema>
export type ExperienceItem = z.infer<typeof experienceItemSchema>
export type EducationItem = z.infer<typeof educationItemSchema>
export type CourseItem = z.infer<typeof courseItemSchema>
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

/**
 * How each restrictable field is named to the person, with its article.
 *
 * It lives beside the field list rather than inside a rule: the market notice in
 * the editor and the analysis findings say the same words about the same field,
 * and a second copy of these labels is a second copy that drifts.
 */
export const FIELD_LABEL: Record<RestrictableField, string> = {
  photo: 'la foto',
  documentId: 'el número de documento',
  birthDate: 'la fecha de nacimiento',
  maritalStatus: 'el estado civil',
  nationality: 'la nacionalidad',
}

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
  courses: [],
  skills: [],
  languages: [],
})
