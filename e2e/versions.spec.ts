import { expect, test } from '@playwright/test'
import { afterAutosave, savedDocument, seed, stored, version } from './fixtures'

test('a version is created, addressed by id, and survives Back, Forward and a reload', async ({ page }) => {
  await seed(page, savedDocument())
  await page.goto('editor')

  await page.getByRole('button', { name: 'Nueva versión para un aviso' }).click()
  const dialog = page.getByRole('dialog', { name: 'Nueva versión para un aviso' })
  await dialog.getByLabel('Empresa').fill('Banco Columbia')
  await dialog.getByLabel('Puesto').fill('Oficial de atención')
  await dialog.getByRole('button', { name: 'Crear versión' }).click()

  await expect(page).toHaveURL(/\/cv-match\/editor\/versions\/ver-[a-z0-9]+$/)
  // The address travels -- history, a shared link -- and the company is not in it.
  expect(page.url()).not.toMatch(/columbia|banco/i)
  await expect(page.getByText('Para Banco Columbia · Oficial de atención')).toBeVisible()
  const versionUrl = page.url()

  await page.goBack()
  await expect(page).toHaveURL(/\/cv-match\/editor$/)
  await expect(page.getByText('Para Banco Columbia · Oficial de atención')).toHaveCount(0)

  await page.goForward()
  await expect(page).toHaveURL(versionUrl)

  await afterAutosave(page)
  await page.reload()
  await expect(page.getByText('Para Banco Columbia · Oficial de atención')).toBeVisible()
})

test('a correction in the base reaches the version, which does not store it', async ({ page }) => {
  await seed(page, savedDocument({ versions: [version('ver-a', 'Empresa A')] }))
  await page.goto('editor')

  await page.getByLabel('Nombre y apellido').fill('Laura Perez Gómez')
  // Marked outside React: if moving to the version rebuilt the editor, the mark is gone.
  await page.locator('header').first().evaluate((header) => header.setAttribute('data-e2e', 'kept'))
  await page.getByLabel('Qué CV estás viendo').selectOption({ label: 'Para Empresa A' })
  await expect(page.locator('header[data-e2e="kept"]')).toHaveCount(1)
  await expect(page).toHaveURL(/\/editor\/versions\/ver-a$/)
  await expect(page.getByRole('heading', { name: 'Laura Perez Gómez' })).toBeVisible()

  await afterAutosave(page)
  const saved = await stored(page)
  expect(JSON.stringify(saved?.versions)).not.toContain('Laura')
})

test('a version id that is not in this browser opens the base', async ({ page }) => {
  await seed(page, savedDocument({ versions: [version('ver-a', 'Empresa A')] }))
  await page.goto('editor/versions/ver-borrada')
  await expect(page).toHaveURL(/\/cv-match\/editor$/)
})

test('deleting a version replaces its address and keeps the base', async ({ page }) => {
  await seed(page, savedDocument({ versions: [version('ver-a', 'Empresa A')] }))
  await page.goto('editor/versions/ver-a')

  await page.getByRole('button', { name: 'Borrar esta versión' }).click()
  await page.getByRole('dialog', { name: 'Borrar la versión' }).getByRole('button', { name: 'Borrar versión' }).click()

  await expect(page).toHaveURL(/\/cv-match\/editor$/)
  await afterAutosave(page)
  const saved = await stored(page)
  expect(saved?.versions).toEqual([])
  expect(saved?.resumes.es.personal.fullName).toBe('Laura Pérez')
})

test('the PDF of a version is named after the company', async ({ page }) => {
  await seed(page, savedDocument({ versions: [version('ver-a', 'Banco Columbia')] }))
  await page.goto('editor/versions/ver-a')

  const button = page.getByRole('button', { name: 'Descargar PDF' })
  await expect(button).toBeEnabled({ timeout: 20_000 })
  const download = page.waitForEvent('download')
  await button.click()
  expect((await download).suggestedFilename()).toBe('Laura-Pérez-CV-Banco-Columbia.pdf')
})
