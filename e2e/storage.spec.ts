import { readFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'
import { STORAGE_KEY, afterAutosave, resume, savedDocument, seed, stored, version } from './fixtures'

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

test('starting a new resume asks first, and the copy holds the old one', async ({ page }) => {
  await seed(page, savedDocument({ versions: [version('ver-a', 'Empresa A'), version('ver-b', 'Empresa B')] }))
  await page.goto('./')

  await expect(page.getByText('Laura Pérez · 2 versiones')).toBeVisible()
  await page.getByRole('button', { name: /Sí, va por un formulario web/ }).click()

  await page.getByRole('button', { name: 'Empezar uno nuevo' }).click()
  const dialog = page.getByRole('dialog', { name: 'Empezar un CV nuevo' })
  await dialog.getByRole('button', { name: 'Cancelar' }).click()
  await expect(dialog).toHaveCount(0)
  expect((await stored(page))?.versions).toHaveLength(2)

  await page.getByRole('button', { name: 'Empezar uno nuevo' }).click()
  const download = page.waitForEvent('download')
  await dialog.getByRole('button', { name: 'Bajar copia y empezar' }).click()

  const file = await download
  expect(file.suggestedFilename()).toBe('cv-match-copia.json')
  const copy = JSON.parse(await readFile((await file.path()) ?? '', 'utf8'))
  expect(copy.resumes.es.personal.fullName).toBe('Laura Pérez')
  expect(copy.versions).toHaveLength(2)

  await expect(page).toHaveURL(/\/cv-match\/editor$/)
  await afterAutosave(page)
  const now = await stored(page)
  expect(now?.resumes.es.personal.fullName).toBe('')
  expect(now?.versions).toEqual([])
  expect(now?.settings).toEqual({ market: 'AR', atsMode: true, template: 'harvard' })
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
  await page.getByRole('button', { name: 'Seguir con el CV guardado' }).click()

  await expect(page.getByRole('heading', { name: 'Laura Pérez' })).toBeVisible()
  await afterAutosave(page)
  const raw = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '{}'), STORAGE_KEY)
  expect(raw.schemaVersion).toBe(2)
  expect(raw.versions).toEqual([])
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

test('loading a copy asks before replacing what is open, and the backup holds it', async ({ page }) => {
  await seed(page, savedDocument({ versions: [version('ver-a', 'Empresa A')] }))
  await page.goto('editor')
  await expect(page.getByRole('heading', { name: 'Laura Pérez' })).toBeVisible()
  const input = page.locator('input[type="file"][accept*="json"]')
  const dialog = page.getByRole('dialog', { name: 'Cargar la copia' })
  const incoming = { ...savedDocument(), resumes: { es: otherPerson } }

  await input.setInputFiles(jsonFile(incoming))
  await expect(dialog).toContainText('Laura Pérez y 1 versión')
  await expect(dialog).toContainText('Otra Persona')
  await dialog.getByRole('button', { name: 'Cancelar' }).click()
  await afterAutosave(page)
  expect((await stored(page))?.resumes.es.personal.fullName).toBe('Laura Pérez')
  expect((await stored(page))?.versions).toHaveLength(1)

  await input.setInputFiles(jsonFile(incoming))
  const download = page.waitForEvent('download')
  await dialog.getByRole('button', { name: 'Bajar copia de lo actual y cargar' }).click()
  const backup = JSON.parse(await readFile((await (await download).path()) ?? '', 'utf8'))
  expect(backup.resumes.es.personal.fullName).toBe('Laura Pérez')
  expect(backup.versions).toHaveLength(1)

  await expect(page.getByRole('heading', { name: 'Otra Persona' })).toBeVisible()
  await afterAutosave(page)
  expect((await stored(page))?.versions).toEqual([])
})

test('a bare resume replaces the base and keeps the versions on top', async ({ page }) => {
  await seed(page, savedDocument({ versions: [version('ver-a', 'Empresa A')] }))
  await page.goto('editor')
  await expect(page.getByRole('heading', { name: 'Laura Pérez' })).toBeVisible()

  await page.locator('input[type="file"][accept*="json"]').setInputFiles(jsonFile(otherPerson))
  const dialog = page.getByRole('dialog', { name: 'Cargar la copia' })
  await expect(dialog).toContainText('Tu versión se mantiene')
  await dialog.getByRole('button', { name: 'Cargar sin copia' }).click()

  await expect(page.getByRole('heading', { name: 'Otra Persona' })).toBeVisible()
  await afterAutosave(page)
  const saved = await stored(page)
  expect(saved?.resumes.es.personal.fullName).toBe('Otra Persona')
  expect(saved?.versions).toHaveLength(1)
})

test('with nothing written yet, a copy loads without asking', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: /No, lo manda por mail/ }).click()
  await page.getByRole('button', { name: 'Empezar', exact: true }).click()
  await expect(page).toHaveURL(/\/cv-match\/editor$/)

  await page.locator('input[type="file"][accept*="json"]').setInputFiles(jsonFile(savedDocument()))
  await expect(page.getByRole('heading', { name: 'Laura Pérez' })).toBeVisible()
  await expect(page.getByRole('dialog', { name: 'Cargar la copia' })).toHaveCount(0)
})
