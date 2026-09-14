import { expect, test } from '@playwright/test'
import { afterAutosave, savedDocument, seed } from './fixtures'

/*
 * What a person leaves half-typed must not cost the resume. Dates are validated
 * when a saved document is read back, so a "2024-1" that reached storage made
 * the whole document unreadable on the next visit: the app started blank.
 */
test('a date left half-typed does not make the saved resume unreadable', async ({ page }) => {
  await seed(page, savedDocument())
  await page.goto('editor')
  await expect(page.getByRole('heading', { name: 'Laura Pérez' })).toBeVisible()

  await page.getByLabel('Desde (AAAA-MM)').fill('2024-1')
  await page.getByLabel('Hasta (AAAA-MM)').fill('20')
  await afterAutosave(page)
  await page.reload()

  await expect(page.getByRole('heading', { name: 'Laura Pérez' })).toBeVisible()
  await expect(page.getByText(/no lo pudimos leer/)).toHaveCount(0)
})

test('a half-typed date says it is not saved yet, and the last good one stays', async ({ page }) => {
  await seed(page, savedDocument())
  await page.goto('editor')

  const since = page.getByLabel('Desde (AAAA-MM)')
  await since.fill('2024-1')
  await expect(page.getByText('Todavía no se guarda: usá el formato 2021-03.')).toBeVisible()
  await expect(since).toHaveAttribute('aria-invalid', 'true')

  await since.fill('2024-10')
  await expect(page.getByText(/Todavía no se guarda/)).toHaveCount(0)
})

test('a saved resume that cannot be read is offered back on the start screen', async ({ page }) => {
  // Written by hand rather than through the app: a document broken in storage.
  await page.addInitScript(() => {
    if (sessionStorage.getItem('e2e-seeded')) return
    localStorage.setItem('cv-match:document', '{"schemaVersion":2,"esto":"no es un CV"')
    sessionStorage.setItem('e2e-seeded', '1')
  })
  await page.goto('./')

  await expect(page.getByText(/no lo pudimos leer/)).toBeVisible()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Bajar el archivo' }).click()
  expect((await download).suggestedFilename()).toBe('cv-match-ilegible.json')
})
