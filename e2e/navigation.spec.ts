import { expect, test } from '@playwright/test'
import { afterAutosave, savedDocument, seed } from './fixtures'

/**
 * The browser's own navigation. Before the app had routes it was one address:
 * Back left the site, and a reload always landed on the start screen.
 */

test('a first visit answers the questions, and Back and Forward move one step', async ({ page }) => {
  await page.goto('./')
  await expect(page.getByRole('heading', { name: 'Armemos tu CV' })).toBeVisible()

  await page.getByRole('button', { name: /No, lo manda por mail/ }).click()
  await page.getByRole('button', { name: 'Empezar', exact: true }).click()
  await expect(page).toHaveURL(/\/cv-match\/editor$/)

  await page.goBack()
  await expect(page).toHaveURL(/\/cv-match\/?$/)
  // Back on the start screen in the same visit, continuing is still offered.
  await expect(page.getByRole('button', { name: 'Seguir con el CV guardado' })).toBeVisible()

  await page.goForward()
  await expect(page).toHaveURL(/\/cv-match\/editor$/)
})

test('looking at the start screen does not leave a "saved resume" behind', async ({ page }) => {
  await page.goto('./')
  await afterAutosave(page)
  await page.reload()

  await expect(page.getByText('Tenés un CV guardado en este navegador')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Empezar', exact: true })).toBeVisible()
})

test('the editor without a resume sends to the start questions', async ({ page }) => {
  await page.goto('editor')
  await expect(page).toHaveURL(/\/cv-match\/?$/)
  await expect(page.getByRole('heading', { name: 'Armemos tu CV' })).toBeVisible()
})

test('a reload on the editor stays on the editor', async ({ page }) => {
  await seed(page, savedDocument())
  await page.goto('editor')
  await expect(page.getByRole('heading', { name: 'Laura Pérez' })).toBeVisible()

  await page.reload()
  await expect(page).toHaveURL(/\/cv-match\/editor$/)
  await expect(page.getByRole('heading', { name: 'Laura Pérez' })).toBeVisible()
})

test('an address that does not exist shows a way back', async ({ page }) => {
  await page.goto('esto-no-existe')
  await expect(page.getByRole('heading', { name: 'Esta página no existe' })).toBeVisible()

  await page.getByRole('link', { name: 'Ir al inicio' }).click()
  await expect(page.getByRole('heading', { name: 'Armemos tu CV' })).toBeVisible()
})
