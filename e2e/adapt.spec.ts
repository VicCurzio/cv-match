import { expect, test } from '@playwright/test'
import { afterAutosave, savedDocument, seed, stored, version } from './fixtures'

const posting = `Tareas principales:

• Acompañar a los clientes en el uso de la App Columbia Banco Móvil.
• Asistirlos en el uso de ATM.

Zonas disponibles:

• Berazategui.
• Merlo.`

test('the posting words the resume does not say are listed, and move once it says them', async ({ page }) => {
  await seed(page, savedDocument({ versions: [version('ver-a', 'Banco Columbia', { posting })] }))
  await page.goto('editor/versions/ver-a')

  const missing = page.getByText('El aviso nombra y tu CV no:').locator('..').getByRole('listitem')
  await expect(missing.filter({ hasText: /^app$/ })).toHaveCount(1)
  await expect(missing.filter({ hasText: /^ATM$/ })).toHaveCount(1)
  // The zones section is logistics, not something to add to a resume.
  await expect(missing.filter({ hasText: /berazategui/i })).toHaveCount(0)

  await page
    .getByRole('textbox', { name: 'Perfil profesional' })
    .fill('Acompañé a clientes en el uso de la app y de los cajeros automáticos.')

  const covered = page.getByText('Ya lo menciona:').locator('..').getByRole('listitem')
  await expect(covered.filter({ hasText: /^app$/ })).toHaveCount(1)
  // "ATM" in the posting, "cajeros" in the resume.
  await expect(covered.filter({ hasText: /^ATM$/ })).toHaveCount(1)
})

test('a bullet rewrite that changes a number is kept but not used', async ({ page }) => {
  await seed(page, savedDocument({ versions: [version('ver-a', 'Banco Columbia')] }))
  await page.goto('editor/versions/ver-a')

  await page.getByRole('button', { name: 'Reescribir para este aviso' }).click()
  const rewrite = page.getByLabel('Qué hiciste, contado para este aviso (una línea por punto)')

  await rewrite.fill('Atendí entre 20 y 60 clientes por día en sucursal bancaria.')
  await expect(page.getByText(/No se usa todavía: el 60 no está en el CV base/)).toBeVisible()

  await rewrite.fill('Atendí entre 20 y 40 clientes por día en sucursal bancaria.')
  await expect(page.getByText(/No se usa todavía/)).toHaveCount(0)

  await afterAutosave(page)
  const saved = await stored(page)
  expect(saved?.versions[0]?.overrides.bullets).toEqual({
    'exp-bank': ['Atendí entre 20 y 40 clientes por día en sucursal bancaria.'],
  })
})

test('a language level can say what the person actually does', async ({ page }) => {
  await seed(page, savedDocument())
  await page.goto('editor')

  await page.getByRole('checkbox', { name: 'lectura' }).check()
  await page.getByRole('checkbox', { name: 'comprensión oral' }).check()
  await expect(page.getByText('Inglés (A2, lectura y comprensión oral)')).toBeVisible()
})
