import { expect, test } from '@playwright/test'
import { savedDocument, seed, version } from './fixtures'

test.use({ viewport: { width: 375, height: 812 } })

/** Nothing on a phone-width screen may push the page sideways. */
async function horizontalOverflow(page: import('@playwright/test').Page): Promise<number> {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
}

test('no screen scrolls sideways on a phone', async ({ page }) => {
  await seed(page, savedDocument({ versions: [version('ver-a', 'Instituto Privado de Enseñanza Superior')] }))

  await page.goto('./')
  await expect(page.getByRole('heading', { name: 'Armemos tu CV' })).toBeVisible()
  expect(await horizontalOverflow(page)).toBe(0)

  await page.goto('editor')
  await expect(page.getByRole('heading', { name: 'Laura Pérez' })).toBeVisible()
  expect(await horizontalOverflow(page)).toBe(0)

  await page.goto('editor/versions/ver-a')
  await expect(page.getByText('Para Instituto Privado de Enseñanza Superior · Oficial de atención')).toBeVisible()
  expect(await horizontalOverflow(page)).toBe(0)
})
