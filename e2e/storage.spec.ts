import { readFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'
import { STORAGE_KEY, afterAutosave, library, resume, savedDocument, seed, stored, version } from './fixtures'

/** A version 2 document without its `schemaVersion`, as one entry of a library. */
function withoutVersionField(document: ReturnType<typeof savedDocument>) {
  const { schemaVersion: _schemaVersion, ...rest } = document
  return rest
}

test('two tabs: an edit in one stops the other from writing over it', async ({ context }) => {
  const first = await context.newPage()
  await seed(first, savedDocument({ versions: [version('ver-a', 'Empresa A')] }))
  await first.goto('editor')
  await expect(first.getByRole('heading', { name: 'Laura Pérez' })).toBeVisible()

  const second = await context.newPage()
  await second.goto('editor/versions/ver-a')
  await expect(second.getByText('Para Empresa A · Oficial de atención')).toBeVisible()
  await afterAutosave(second)

  // Opening a version elsewhere rewrote storage, but changed no content.
  await expect(first.getByText(/Este CV se modificó en otra pestaña/)).toHaveCount(0)

  await second.getByRole('textbox', { name: 'Perfil profesional' }).fill('Cambiado en la segunda pestaña.')
  await afterAutosave(second)
  await expect(first.getByText(/Este CV se modificó en otra pestaña/)).toBeVisible()

  await first.getByLabel('Perfil', { exact: true }).fill('Edición vieja.')
  await afterAutosave(first)
  const saved = await stored(first)
  expect(saved?.versions[0]?.overrides.summary).toBe('Cambiado en la segunda pestaña.')
  expect(saved?.resumes.es.summary).not.toBe('Edición vieja.')
})

test('several resumes live side by side: starting another keeps the first', async ({ page }) => {
  await seed(page, savedDocument({ versions: [version('ver-a', 'Empresa A')] }))
  await page.goto('./')

  await expect(page.getByText('Tus CV en este navegador')).toBeVisible()
  await expect(page.getByText('1 versión')).toBeVisible()
  await page.getByRole('button', { name: /No, lo manda por mail/ }).click()
  await page.getByRole('button', { name: 'Empezar uno nuevo' }).click()
  // Adding a resume replaces nothing, so nothing is asked.
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page).toHaveURL(/\/cv-match\/editor$/)

  await page.getByLabel('Nombre y apellido').fill('Camila Prueba')
  await afterAutosave(page)
  let saved = await library(page)
  expect(saved?.cvs.map((cv) => cv.resumes.es.personal.fullName)).toEqual(['Laura Pérez', 'Camila Prueba'])

  await page.getByRole('link', { name: 'Mis CV' }).click()
  await page.getByRole('button', { name: 'Abrir el CV de Laura Pérez' }).click()
  await expect(page.getByRole('heading', { name: 'Laura Pérez' })).toBeVisible()
  await afterAutosave(page)
  saved = await library(page)
  // Switching kept what was typed in the other one.
  expect(saved?.cvs.map((cv) => cv.resumes.es.personal.fullName)).toEqual(['Laura Pérez', 'Camila Prueba'])
  expect((await stored(page))?.versions).toHaveLength(1)
})

test('deleting a resume asks, can keep a copy, and leaves the others', async ({ page }) => {
  const camila = { ...savedDocument(), resumes: { es: resume({ personal: { fullName: 'Camila Prueba', headline: '', email: '', phone: '', city: '' } }) } }
  await page.addInitScript(
    ([key, value]) => {
      if (sessionStorage.getItem('e2e-seeded')) return
      localStorage.setItem(key, value)
      sessionStorage.setItem('e2e-seeded', '1')
    },
    [
      STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 3,
        activeCvId: 'cv-laura',
        cvs: [
          { id: 'cv-laura', ...withoutVersionField(savedDocument({ versions: [version('ver-a', 'Empresa A')] })) },
          { id: 'cv-camila', ...withoutVersionField(camila) },
        ],
      }),
    ] as const,
  )
  await page.goto('./')

  await page.getByRole('button', { name: 'Borrar el CV de Laura Pérez' }).click()
  const dialog = page.getByRole('dialog', { name: 'Borrar el CV' })
  await expect(dialog).toContainText('Laura Pérez y su versión')
  await dialog.getByRole('button', { name: 'Cancelar' }).click()
  await expect(page.getByRole('button', { name: 'Abrir el CV de Laura Pérez' })).toBeVisible()

  await page.getByRole('button', { name: 'Borrar el CV de Laura Pérez' }).click()
  const download = page.waitForEvent('download')
  await dialog.getByRole('button', { name: 'Bajar copia y borrar' }).click()
  const copy = JSON.parse(await readFile((await (await download).path()) ?? '', 'utf8'))
  expect(copy.cvs).toHaveLength(1)
  expect(copy.cvs[0].resumes.es.personal.fullName).toBe('Laura Pérez')

  await expect(page.getByRole('button', { name: 'Abrir el CV de Laura Pérez' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Abrir el CV de Camila Prueba' })).toBeVisible()
  await afterAutosave(page)
  expect((await library(page))?.cvs.map((cv) => cv.resumes.es.personal.fullName)).toEqual(['Camila Prueba'])
})

test('the base keeps its own cover letter across a reload', async ({ page }) => {
  await seed(page, savedDocument())
  await page.goto('editor')

  await page.getByRole('button', { name: 'Carta de presentación' }).click()
  const dialog = page.getByRole('dialog', { name: 'Carta de presentación' })
  await dialog.getByLabel('Empresa').fill('Tienda del Centro')
  await dialog.getByLabel('El párrafo que escribís vos').fill('Me interesa atender clientes en el local.')
  await page.keyboard.press('Escape')
  await afterAutosave(page)

  await page.reload()
  await page.getByRole('button', { name: 'Carta de presentación' }).click()
  await expect(dialog.getByLabel('Empresa')).toHaveValue('Tienda del Centro')
  await expect(dialog.getByLabel('El párrafo que escribís vos')).toHaveValue('Me interesa atender clientes en el local.')
})

test('a resume saved before versions existed opens whole and is upgraded', async ({ page }) => {
  const v1 = {
    schemaVersion: 1,
    settings: { market: 'AR', atsMode: false, template: 'modern' },
    activeLocale: 'es',
    resumes: { es: resume() },
  }
  await seed(page, v1)
  await page.goto('./')
  await page.getByRole('button', { name: 'Abrir el CV de Laura Pérez' }).click()

  await expect(page.getByRole('heading', { name: 'Laura Pérez' })).toBeVisible()
  await afterAutosave(page)
  const raw = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '{}'), STORAGE_KEY)
  expect(raw.schemaVersion).toBe(3)
  expect(raw.cvs).toHaveLength(1)
  expect(raw.cvs[0].versions).toEqual([])
  expect(await page.evaluate(() => localStorage.getItem('cv-match:unreadable'))).toBeNull()
})

const jsonFile = (content: unknown) => ({
  name: 'copia.json',
  mimeType: 'application/json',
  buffer: Buffer.from(JSON.stringify(content)),
})

const otherPerson = resume({
  personal: { fullName: 'Otra Persona', headline: 'Vendedora', email: 'otra@example.com', phone: '1', city: 'Quilmes' },
})

test('loading a copy adds it as its own resume and keeps the open one', async ({ page }) => {
  await seed(page, savedDocument({ versions: [version('ver-a', 'Empresa A')] }))
  await page.goto('editor/versions/ver-a')
  await expect(page.getByText('Para Empresa A · Oficial de atención')).toBeVisible()

  const incoming = { ...savedDocument(), resumes: { es: otherPerson } }
  await page.locator('input[type="file"][accept*="json"]').setInputFiles(jsonFile(incoming))

  // Nothing is replaced, so nothing is asked.
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Otra Persona' })).toBeVisible()
  await expect(page).toHaveURL(/\/cv-match\/editor$/)
  await expect(page.getByText(/Copia cargada como un CV aparte/)).toBeVisible()

  await afterAutosave(page)
  const saved = await library(page)
  expect(saved?.cvs.map((cv) => cv.resumes.es.personal.fullName)).toEqual(['Laura Pérez', 'Otra Persona'])
  expect(saved?.cvs[0]?.versions).toHaveLength(1)
})

test('a bare resume file is added too', async ({ page }) => {
  await seed(page, savedDocument())
  await page.goto('editor')
  await page.locator('input[type="file"][accept*="json"]').setInputFiles(jsonFile(otherPerson))
  await expect(page.getByRole('heading', { name: 'Otra Persona' })).toBeVisible()
  await afterAutosave(page)
  expect((await library(page))?.cvs).toHaveLength(2)
})
