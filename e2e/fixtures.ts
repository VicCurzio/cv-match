import type { Page } from '@playwright/test'

/**
 * Saved documents for the tests, written in the shape the app stores.
 *
 * Deliberately not imported from `src/`: these tests check the app from the
 * outside, through the browser, the way a person's saved data meets it. A
 * document built with the app's own helpers would change shape along with a
 * bug instead of catching it.
 */

export const STORAGE_KEY = 'cv-match:document'

const settings = { market: 'AR', atsMode: false, template: 'modern' } as const

const emptyLayer = { hiddenSkills: [], hiddenExperience: [], hiddenEducation: [], hiddenCourses: [] }

export function resume(overrides: Record<string, unknown> = {}) {
  return {
    personal: {
      fullName: 'Laura Pérez',
      headline: 'Administrativa',
      email: 'laura.perez@example.com',
      phone: '221 555-0199',
      city: 'La Plata',
      province: 'Buenos Aires',
    },
    summary: 'Administrativa con experiencia en atención al cliente.',
    experience: [
      {
        id: 'exp-bank',
        role: 'Auxiliar administrativa',
        company: 'Banco Cooperativo',
        startDate: '2025-02',
        endDate: '2025-11',
        bullets: ['Atendí entre 20 y 40 clientes por día en sucursal.'],
      },
    ],
    education: [],
    courses: [],
    skills: ['Excel', 'Atención al cliente'],
    languages: [{ id: 'lang-en', name: 'Inglés', level: 'A2' }],
    ...overrides,
  }
}

export function version(id: string, company: string, extra: Record<string, unknown> = {}) {
  return { id, company, role: 'Oficial de atención', settings, overrides: { ...emptyLayer }, ...extra }
}

export function savedDocument(options: { versions?: unknown[]; activeVersionId?: string | null } = {}) {
  return {
    schemaVersion: 2,
    settings,
    activeLocale: 'es',
    resumes: { es: resume() },
    versions: options.versions ?? [],
    activeVersionId: options.activeVersionId ?? null,
  }
}

/**
 * Puts a document in storage before the app's first script runs, once per tab.
 *
 * Writing it after loading a page would race the autosave, which writes the
 * app's own copy half a second after mount. The session flag keeps a reload
 * from putting the seed back over what the test just did.
 */
export async function seed(page: Page, document: unknown): Promise<void> {
  await page.addInitScript(
    ([key, value]) => {
      if (sessionStorage.getItem('e2e-seeded')) return
      localStorage.setItem(key, value)
      sessionStorage.setItem('e2e-seeded', '1')
    },
    [STORAGE_KEY, JSON.stringify(document)] as const,
  )
}

interface SavedCv {
  id: string
  settings: { market: string; atsMode: boolean; template: string }
  resumes: { es: { personal: { fullName: string }; summary: string } }
  versions: { id: string; company: string; overrides: Record<string, unknown> }[]
  activeVersionId: string | null
  letter?: { role: string; company: string; recipient: string; body: string }
}

interface SavedLibrary {
  schemaVersion: number
  activeCvId: string | null
  cvs: SavedCv[]
}

/** The whole saved library, as the app last wrote it. */
export async function library(page: Page): Promise<SavedLibrary | null> {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? 'null'), STORAGE_KEY)
}

/** The open resume of the saved library. */
export async function stored(page: Page): Promise<SavedCv | null> {
  const saved = await library(page)
  if (!saved) return null
  return saved.cvs.find((cv) => cv.id === saved.activeCvId) ?? saved.cvs[0] ?? null
}

/** Waits past the autosave delay, so what storage holds is what the app decided. */
export async function afterAutosave(page: Page): Promise<void> {
  await page.waitForTimeout(800)
}
