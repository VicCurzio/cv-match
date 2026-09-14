import type { TranslateText } from './buildTranslation'

/**
 * The translator built into Chrome and Edge (desktop, version 138 and later).
 *
 * Chosen because it runs ON THE DEVICE: the language model is downloaded once
 * by the browser, and the resume's text never leaves the machine -- the rule
 * this project does not break (ADR 0008). No key, no account, no server. The
 * cost is reach: on a phone, in Firefox or in Safari the API does not exist,
 * and the app says so and offers translating by hand.
 */

export type TranslatorAvailability = 'unsupported' | 'unavailable' | 'downloadable' | 'downloading' | 'available'

interface TranslatorInstance {
  translate(text: string): Promise<string>
  destroy?(): void
}

interface TranslatorStatic {
  availability(options: { sourceLanguage: string; targetLanguage: string }): Promise<string>
  create(options: {
    sourceLanguage: string
    targetLanguage: string
    monitor?: (monitor: EventTarget) => void
  }): Promise<TranslatorInstance>
}

const PAIR = { sourceLanguage: 'es', targetLanguage: 'en' } as const

function api(): TranslatorStatic | undefined {
  return (globalThis as { Translator?: TranslatorStatic }).Translator
}

/** How long the browser gets to answer before the app stops waiting. */
export const WAIT_MS = { availability: 8_000, create: 30_000, translate: 30_000 } as const

/**
 * A browser can expose the API and never answer it. Seen in a Chromium-based
 * desktop app: `Translator` exists, `availability()` never settles, and the
 * screen stayed on "checking" for good, with no way to the manual fallback.
 */
function withinTime<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error: unknown) => {
        clearTimeout(timer)
        reject(error instanceof Error ? error : new Error(String(error)))
      },
    )
  })
}

export async function translatorAvailability(): Promise<TranslatorAvailability> {
  const translator = api()
  if (!translator) return 'unsupported'
  try {
    const answer = await withinTime(translator.availability(PAIR), WAIT_MS.availability)
    return answer === 'available' || answer === 'downloadable' || answer === 'downloading' ? answer : 'unavailable'
  } catch {
    return 'unavailable'
  }
}

/**
 * Creates the translator. Must be called from a click: the browser requires a
 * user gesture before it downloads a model.
 *
 * A first download can take minutes, so the wait is not a fixed deadline: it
 * starts over with every progress event and only gives up on a browser that
 * stopped saying anything.
 */
export async function createTranslator(
  onDownload?: (fraction: number) => void,
): Promise<{ translate: TranslateText; dispose: () => void }> {
  const translator = api()
  if (!translator) throw new Error('unsupported')

  let timer: ReturnType<typeof setTimeout> | undefined
  let creating: (() => void) | undefined
  const stalled = new Promise<never>((_, reject) => {
    const arm = () => {
      clearTimeout(timer)
      timer = setTimeout(() => reject(new Error('timeout')), WAIT_MS.create)
    }
    arm()
    creating = arm
  })

  try {
    const instance = await Promise.race([
      translator.create({
        ...PAIR,
        monitor(monitor) {
          monitor.addEventListener('downloadprogress', (event) => {
            creating?.()
            const loaded = (event as Event & { loaded?: number }).loaded
            if (typeof loaded === 'number') onDownload?.(loaded)
          })
        },
      }),
      stalled,
    ])
    return {
      translate: (text) => withinTime(instance.translate(text), WAIT_MS.translate),
      dispose: () => instance.destroy?.(),
    }
  } finally {
    clearTimeout(timer)
  }
}
