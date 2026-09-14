import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'
import { afterAutosave, resume, savedDocument, seed, stored, version } from './fixtures'

/**
 * The browser's translator is replaced by a fake before the app loads.
 *
 * The real one needs Chrome with a downloaded language model, which a test
 * machine does not have -- and its output changes with the model. The fake
 * marks what it translated ("EN ...") and keeps the name markers, so the test
 * can tell the glossary's work from the translator's.
 */
async function fakeTranslator(page: Page, mode: 'available' | 'missing') {
  await page.addInitScript((kind) => {
    const calls: string[] = []
    ;(window as unknown as { translatorCalls: string[] }).translatorCalls = calls
    const fake =
      kind === 'missing'
        ? undefined
        : {
            availability: async () => 'available',
            create: async (options: { monitor?: (target: EventTarget) => void }) => {
              options.monitor?.(new EventTarget())
              return {
                translate: async (text: string) => {
                  calls.push(text)
                  return `EN ${text}`
                },
                destroy() {},
              }
            },
          }
    Object.defineProperty(window, 'Translator', { value: fake, configurable: true, writable: true })
  }, mode)
}

const summaryInEnglish = (page: Page) => page.getByLabel('Perfil profesional en inglés')

const NAMED_SUMMARY = 'Administrativa con experiencia en Banco Cooperativo.'

test('translate the base, fix a text by hand, and download the English resume', async ({ page }) => {
  await fakeTranslator(page, 'available')
  await seed(page, { ...savedDocument(), resumes: { es: resume({ summary: NAMED_SUMMARY }) } })
  await page.goto('editor')

  await page.getByLabel('Idioma del CV').selectOption('en')
  await expect(page.getByText('La traducción la hace tu navegador')).toBeVisible()
  await page.getByRole('button', { name: 'Traducir al inglés' }).click()

  // A job title from the glossary, not from the translator.
  await expect(page.getByLabel('Puesto en Banco Cooperativo en inglés')).toHaveValue('Administrative Assistant')
  await expect(summaryInEnglish(page)).toHaveValue('EN Administrativa con experiencia en Banco Cooperativo.')
  // A known tool is kept as it is.
  await expect(page.getByLabel('Habilidad en inglés').first()).toHaveValue('Excel')
  // The company name went to the translator held out behind a marker, never as a word to translate.
  const sent = await page.evaluate(() => (window as unknown as { translatorCalls: string[] }).translatorCalls)
  expect(sent).toContain('Administrativa con experiencia en [0].')
  expect(sent.join(' ')).not.toContain('Banco Cooperativo')

  await summaryInEnglish(page).fill('Administrative assistant with customer service experience.')
  await afterAutosave(page)
  const saved = (await stored(page)) as unknown as {
    activeLocale: string
    translation: { summary: { source: string; text: string } }
  }
  expect(saved.activeLocale).toBe('en')
  expect(saved.translation.summary).toEqual({
    source: NAMED_SUMMARY,
    text: 'Administrative assistant with customer service experience.',
  })

  const download = page.waitForEvent('download')
  const button = page.getByRole('button', { name: 'Descargar PDF' })
  await expect(button).toBeEnabled()
  await button.click()
  expect((await download).suggestedFilename()).toBe('Laura-Pérez-Resume.pdf')

  // Reopened, the English resume is where it was left.
  await page.reload()
  await expect(page.getByLabel('Idioma del CV')).toHaveValue('en')
  await expect(summaryInEnglish(page)).toHaveValue('Administrative assistant with customer service experience.')
})

test('a Spanish text changed after translating is flagged, and only it is sent again', async ({ page }) => {
  await fakeTranslator(page, 'available')
  await seed(page, savedDocument())
  await page.goto('editor')

  await page.getByLabel('Idioma del CV').selectOption('en')
  await page.getByRole('button', { name: 'Traducir al inglés' }).click()
  await expect(summaryInEnglish(page)).toHaveValue(/^EN /)

  await page.getByRole('button', { name: 'Editar el CV en español' }).click()
  await page.getByLabel('Perfil', { exact: true }).fill('Administrativa bancaria.')
  await page.getByLabel('Idioma del CV').selectOption('en')

  await expect(page.getByText(/El español cambió desde que se tradujo/)).toBeVisible()
  await page.evaluate(() => {
    ;(window as unknown as { translatorCalls: string[] }).translatorCalls.length = 0
  })
  await page.getByRole('button', { name: 'Traducir lo que falta (1)' }).click()
  await expect(summaryInEnglish(page)).toHaveValue('EN Administrativa bancaria.')
  const sent = await page.evaluate(() => (window as unknown as { translatorCalls: string[] }).translatorCalls)
  expect(sent).toEqual(['Administrativa bancaria.'])
  await expect(page.getByText('El español cambió desde que se tradujo')).toHaveCount(0)
})

test('without a translator in the browser, it says so and the English can be typed by hand', async ({ page }) => {
  await fakeTranslator(page, 'missing')
  await seed(page, savedDocument())
  await page.goto('editor')

  await page.getByLabel('Idioma del CV').selectOption('en')
  await expect(page.getByText(/Tu navegador no trae traductor/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Traducir al inglés' })).toHaveCount(0)

  await summaryInEnglish(page).fill('Administrative assistant.')
  await afterAutosave(page)
  const saved = (await stored(page)) as unknown as { translation: { summary: { text: string } } }
  expect(saved.translation.summary.text).toBe('Administrative assistant.')
})

test('a version stays in Spanish: the language choice belongs to the base', async ({ page }) => {
  await fakeTranslator(page, 'available')
  await seed(page, savedDocument({ versions: [version('ver-a', 'Empresa A')] }))
  await page.goto('editor')
  await page.getByLabel('Idioma del CV').selectOption('en')

  await page.getByLabel('Qué CV estás viendo').selectOption('ver-a')
  await expect(page).toHaveURL(/\/editor\/versions\/ver-a$/)
  await expect(page.getByLabel('Idioma del CV')).toHaveCount(0)
  await expect(page.getByText('La traducción la hace tu navegador')).toHaveCount(0)
  // What downloads is the Spanish version, not the English base.
  const download = page.waitForEvent('download')
  const button = page.getByRole('button', { name: 'Descargar PDF' })
  await expect(button).toBeEnabled()
  await button.click()
  expect((await download).suggestedFilename()).toBe('Laura-Pérez-CV-Empresa-A.pdf')

  await page.getByLabel('Qué CV estás viendo').selectOption('')
  await expect(page.getByLabel('Idioma del CV')).toHaveValue('en')
})

test('the English letter is built from the English resume and kept apart from the Spanish one', async ({ page }) => {
  await fakeTranslator(page, 'available')
  await seed(page, savedDocument())
  await page.goto('editor')

  // A Spanish letter first, to prove the English one does not overwrite it.
  await page.getByRole('button', { name: 'Carta de presentación' }).click()
  const dialog = page.getByRole('dialog', { name: 'Carta de presentación' })
  await dialog.getByLabel('Empresa').fill('Acme')
  await dialog.getByLabel('El párrafo que escribís vos').fill('Me interesa atender clientes.')
  await page.keyboard.press('Escape')

  await page.getByLabel('Idioma del CV').selectOption('en')
  await page.getByRole('button', { name: 'Traducir al inglés' }).click()
  await expect(page.getByLabel('Puesto en Banco Cooperativo en inglés')).toHaveValue('Administrative Assistant')

  await page.getByRole('button', { name: 'Carta de presentación' }).click()
  await expect(dialog.getByText('Esta carta sale en inglés')).toBeVisible()
  // The company carries over; the paragraph starts again, in English.
  await expect(dialog.getByLabel('Empresa')).toHaveValue('Acme')
  await dialog.getByLabel('Puesto al que te postulás').fill('Office Assistant')
  await expect(
    dialog.getByText('I am writing to apply for the Office Assistant position at Acme. Most recently, I worked as Administrative Assistant at Banco Cooperativo'),
  ).toBeVisible()

  const button = dialog.getByRole('button', { name: 'Descargar carta' })
  await expect(button).toBeDisabled()
  await dialog.getByLabel('El párrafo que escribís vos').fill('I enjoy helping customers.')
  const download = page.waitForEvent('download')
  await button.click()
  expect((await download).suggestedFilename()).toBe('Laura-Pérez-Cover-Letter-Acme.pdf')
  await page.keyboard.press('Escape')
  await afterAutosave(page)

  await page.reload()
  await page.getByRole('button', { name: 'Carta de presentación' }).click()
  await expect(dialog.getByLabel('El párrafo que escribís vos')).toHaveValue('I enjoy helping customers.')
  await page.keyboard.press('Escape')

  await page.getByLabel('Idioma del CV').selectOption('es')
  await page.getByRole('button', { name: 'Carta de presentación' }).click()
  await expect(dialog.getByText('Esta carta sale en inglés')).toHaveCount(0)
  await expect(dialog.getByLabel('El párrafo que escribís vos')).toHaveValue('Me interesa atender clientes.')
  await expect(dialog.getByText(/Me dirijo a ustedes/)).toBeVisible()
})
