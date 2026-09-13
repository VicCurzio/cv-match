import { expect, test, type Page } from '@playwright/test'
import { savedDocument, seed, version } from './fixtures'

/*
 * 360 px, not 375: it is the width of a large share of Android phones, and the
 * narrowest one worth promising. The font is forced wide on purpose. This test
 * passed on Windows and failed on the Linux CI runner by 11 px, because a
 * select sized to its longest option fit with one font and not with another --
 * a real phone with a wider font would have hit the same thing. Forcing a wide
 * font makes the test fail the same way on every machine.
 */
test.use({ viewport: { width: 360, height: 780 } })

const WIDE_FONT = '*, *::before, *::after { font-family: Verdana, "DejaVu Sans", sans-serif !important; }'

/** Elements that stick out past the right edge, described so a failure says which. */
async function offenders(page: Page): Promise<string[]> {
  await page.addStyleTag({ content: WIDE_FONT })
  return page.evaluate(() => {
    const width = document.documentElement.clientWidth
    return [...document.querySelectorAll('body *')]
      .filter((element) => {
        // Content inside its own scrolling box is allowed to be wider than it.
        const scroller = element.parentElement?.closest('[class*="overflow-"]')
        return !scroller && element.getBoundingClientRect().right > width + 0.5
      })
      .map((element) => {
        const box = element.getBoundingClientRect()
        const text = (element.textContent ?? '').trim().slice(0, 40)
        return `${element.tagName.toLowerCase()} "${text}" ends at ${Math.round(box.right)} of ${width}`
      })
  })
}

test('no screen sticks out sideways on a phone', async ({ page }) => {
  await seed(page, savedDocument({ versions: [version('ver-a', 'Instituto Privado de Enseñanza Superior')] }))

  await page.goto('./')
  await expect(page.getByRole('heading', { name: 'Armemos tu CV' })).toBeVisible()
  expect(await offenders(page)).toEqual([])

  await page.goto('editor')
  await expect(page.getByRole('heading', { name: 'Laura Pérez' })).toBeVisible()
  expect(await offenders(page)).toEqual([])

  await page.goto('editor/versions/ver-a')
  await expect(page.getByText('Para Instituto Privado de Enseñanza Superior · Oficial de atención')).toBeVisible()
  expect(await offenders(page)).toEqual([])
})
