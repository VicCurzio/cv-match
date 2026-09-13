import { expect, test } from '@playwright/test'
import { savedDocument, seed } from './fixtures'

/**
 * The preview is the PDF drawn by pdfjs, under the production
 * Content-Security-Policy. A policy that blocks the worker, a font or the
 * canvas does not throw where a test would notice: the sheet just stays white.
 * So the test looks at the pixels, and at the console.
 */

test('the preview draws the sheet, opens large and closes with Escape or Back', async ({ page }) => {
  const violations: string[] = []
  page.on('console', (message) => {
    if (/Content.Security.Policy/i.test(message.text())) violations.push(message.text())
  })

  await seed(page, savedDocument())
  await page.goto('editor')

  const sheet = page.getByRole('button', { name: 'Ver el CV en grande' })
  await expect(sheet).toBeVisible({ timeout: 20_000 })
  await expect(page.locator('iframe')).toHaveCount(0)

  // Text on the page means dark pixels on the canvas.
  await expect
    .poll(
      () =>
        sheet.locator('canvas').evaluate((canvas: HTMLCanvasElement) => {
          const context = canvas.getContext('2d')
          if (!context || canvas.width < 100) return 0
          const { data } = context.getImageData(0, 0, canvas.width, canvas.height)
          let ink = 0
          for (let i = 0; i < data.length; i += 4) if ((data[i + 3] ?? 0) > 0 && (data[i] ?? 255) < 100) ink++
          return ink
        }),
      { timeout: 20_000 },
    )
    .toBeGreaterThan(500)

  const url = page.url()
  await sheet.click()
  await expect(page.getByRole('dialog', { name: 'Vista previa' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: 'Vista previa' })).toHaveCount(0)
  expect(page.url()).toBe(url)

  await sheet.click()
  await expect(page.getByRole('dialog', { name: 'Vista previa' })).toBeVisible()
  // On a phone, Back is how things get closed: it must not leave the editor.
  await page.goBack()
  await expect(page.getByRole('dialog', { name: 'Vista previa' })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Laura Pérez' })).toBeVisible()

  expect(violations).toEqual([])
})
