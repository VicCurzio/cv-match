import type { LanguageAbility } from '@/domain/resume/resumeSchema'
import type { Locale } from '@/domain/resume/translation'

export type { Locale }

/**
 * Every word a template prints that is not the person's own text.
 *
 * The English headings are the ones an English-reading recruiter and an ATS
 * look for. They are not translated from the Spanish ones word by word:
 * "Perfil profesional" is "Professional Summary", not "Professional Profile".
 */
export const LABELS: Record<
  Locale,
  {
    summary: string
    experience: string
    education: string
    courses: string
    skills: string
    languages: string
    contact: string
    present: string
    inProgress: string
    placeholderName: string
    documentKind: string
    months: string[]
    abilities: Record<LanguageAbility, string>
    and: string
  }
> = {
  es: {
    summary: 'PERFIL PROFESIONAL',
    experience: 'EXPERIENCIA LABORAL',
    education: 'EDUCACIÓN',
    courses: 'CURSOS Y CERTIFICACIONES',
    skills: 'HABILIDADES',
    languages: 'IDIOMAS',
    contact: 'CONTACTO',
    present: 'actualidad',
    inProgress: 'en curso',
    placeholderName: 'Tu nombre',
    documentKind: 'CV',
    months: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'],
    abilities: { reading: 'lectura', listening: 'comprensión oral', speaking: 'conversación', writing: 'escritura' },
    and: 'y',
  },
  en: {
    summary: 'PROFESSIONAL SUMMARY',
    experience: 'WORK EXPERIENCE',
    education: 'EDUCATION',
    courses: 'COURSES AND CERTIFICATIONS',
    skills: 'SKILLS',
    languages: 'LANGUAGES',
    contact: 'CONTACT',
    present: 'Present',
    inProgress: 'In progress',
    placeholderName: 'Your name',
    documentKind: 'Resume',
    months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    abilities: { reading: 'reading', listening: 'listening', speaking: 'speaking', writing: 'writing' },
    and: 'and',
  },
}
