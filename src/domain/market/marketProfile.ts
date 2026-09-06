import {
  RESTRICTABLE_FIELDS,
  type Resume,
  type RestrictableField,
} from '@/domain/resume/resumeSchema'

/**
 * The market profile is the core concept of the product (ADR 0002).
 *
 * It is DATA, not branching logic. Adding a market means adding an object here;
 * the analysis engine and the templates are never touched. And because it is
 * data, the same resume run against two profiles produces two different
 * diagnoses without a second copy of the rules.
 */

export type MarketId = 'AR' | 'INTL'

/**
 * - `allowed`      shows, says nothing.
 * - `discouraged`  shows, raises a warning explaining why it is better left out.
 * - `forbidden`    is stripped from the export and raises an error while present.
 */
export type FieldPolicy = 'allowed' | 'discouraged' | 'forbidden'

export interface MarketProfile {
  id: MarketId
  /** Shown in the UI. */
  label: string
  /** One line, plain language, explaining what this market expects. */
  description: string
  fields: Record<RestrictableField, FieldPolicy>
  /** Pages the resume should not exceed in this market. */
  maxPages: number
  /** Section headings a reader in this market expects, lowercased. */
  expectedHeadings: string[]
  /** Why a field is restricted here. Keyed by field, shown next to the finding. */
  reasons: Partial<Record<RestrictableField, string>>
}

export const AR_PROFILE: MarketProfile = {
  id: 'AR',
  label: 'Argentina',
  description:
    'El CV local: se acostumbra la foto y se toleran los datos personales, aunque cada vez se usan menos.',
  fields: {
    photo: 'allowed',
    documentId: 'discouraged',
    birthDate: 'discouraged',
    maritalStatus: 'discouraged',
    nationality: 'discouraged',
  },
  maxPages: 2,
  expectedHeadings: ['perfil', 'experiencia', 'educación', 'habilidades', 'idiomas'],
  reasons: {
    documentId:
      'El documento no hace falta para postularse. Se pide recién cuando te contratan.',
    birthDate:
      'La edad no aporta nada a la decisión y puede jugar en contra sin que te enteres.',
    maritalStatus:
      'El estado civil no tiene relación con el puesto y hace ver el CV desactualizado.',
    nationality:
      'La nacionalidad solo suma si el puesto pide un permiso de trabajo puntual.',
  },
}

export const INTL_PROFILE: MarketProfile = {
  id: 'INTL',
  label: 'Internacional (EEUU, Reino Unido, Canadá)',
  description:
    'Sin foto y sin datos personales: allá el que recibe el CV los evita para no exponerse a una denuncia por discriminación.',
  fields: {
    photo: 'forbidden',
    documentId: 'forbidden',
    birthDate: 'forbidden',
    maritalStatus: 'forbidden',
    nationality: 'forbidden',
  },
  maxPages: 1,
  expectedHeadings: [
    'summary',
    'experience',
    'education',
    'skills',
    'languages',
    'perfil',
    'experiencia',
    'educación',
    'habilidades',
    'idiomas',
  ],
  reasons: {
    photo:
      'En Estados Unidos, Reino Unido y Canadá hay reclutadores que descartan los CV con foto para no exponerse a una acusación de discriminación.',
    documentId: 'Un número de documento extranjero no significa nada allá, y es un dato sensible de más.',
    birthDate: 'Poner la edad expone a quien recibe el CV a una acusación de discriminación por edad.',
    maritalStatus: 'Es un dato protegido: no se pregunta y no se pone.',
    nationality: 'Lo que se aclara, si hace falta, es el permiso de trabajo, no la nacionalidad.',
  },
}

export const MARKET_PROFILES: Record<MarketId, MarketProfile> = {
  AR: AR_PROFILE,
  INTL: INTL_PROFILE,
}

export function getProfile(id: MarketId): MarketProfile {
  return MARKET_PROFILES[id]
}

/** The fields this profile strips from the export. */
export function forbiddenFields(profile: MarketProfile): RestrictableField[] {
  return RESTRICTABLE_FIELDS.filter((f) => profile.fields[f] === 'forbidden')
}

/** The fields this profile keeps but advises against. */
export function discouragedFields(profile: MarketProfile): RestrictableField[] {
  return RESTRICTABLE_FIELDS.filter((f) => profile.fields[f] === 'discouraged')
}

/**
 * Strips the fields this market forbids -- and, when ATS mode is on, the photo
 * as well, because no automated reader handles an image where text should be.
 *
 * This is the ONLY place filtering happens. Letting each template ask
 * `if (profile.fields.photo === 'forbidden')` looks simpler and is the bug:
 * with two templates today and six tomorrow, the first one that forgets the
 * check leaks personal data into the PDF and nothing turns red.
 *
 * The user's data is never deleted -- it is left out of THIS export. Switching
 * back to a market that allows it brings it back.
 */
export function applyProfile(
  resume: Resume,
  profile: MarketProfile,
  options: { atsMode: boolean },
): Resume {
  const personal = { ...resume.personal }

  for (const field of forbiddenFields(profile)) {
    delete personal[field]
  }
  if (options.atsMode) {
    delete personal.photo
  }

  return { ...resume, personal }
}
