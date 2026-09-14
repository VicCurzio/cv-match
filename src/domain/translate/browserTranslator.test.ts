import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { WAIT_MS, createTranslator, translatorAvailability } from './browserTranslator'

const never = () => new Promise<never>(() => {})

function install(translator: unknown) {
  vi.stubGlobal('Translator', translator)
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

/**
 * Seen in a real Chromium-based app: the API is there and never answers. The
 * screen waited on "checking" forever and never offered typing the English.
 */
describe('a browser that exposes the translator and never answers', () => {
  it('without the API, says unsupported at once', async () => {
    install(undefined)
    await expect(translatorAvailability()).resolves.toBe('unsupported')
  })

  it('stops waiting for availability and reports it unavailable', async () => {
    install({ availability: never, create: never })
    const answer = translatorAvailability()
    await vi.advanceTimersByTimeAsync(WAIT_MS.availability)
    await expect(answer).resolves.toBe('unavailable')
  })

  it('gives up on a create that never finishes and never reports progress', async () => {
    install({ availability: async () => 'downloadable', create: never })
    const created = createTranslator()
    const outcome = expect(created).rejects.toThrow('timeout')
    await vi.advanceTimersByTimeAsync(WAIT_MS.create)
    await outcome
  })

  it('keeps waiting while a slow download keeps reporting progress', async () => {
    const target = new EventTarget()
    let finish: (value: { translate: (text: string) => Promise<string> }) => void = () => {}
    install({
      availability: async () => 'downloadable',
      create: (options: { monitor: (m: EventTarget) => void }) => {
        options.monitor(target)
        return new Promise((resolve) => {
          finish = resolve
        })
      },
    })
    const progress: number[] = []
    const created = createTranslator((fraction) => progress.push(fraction))

    for (const loaded of [0.25, 0.5, 0.75]) {
      await vi.advanceTimersByTimeAsync(WAIT_MS.create - 1000)
      target.dispatchEvent(Object.assign(new Event('downloadprogress'), { loaded }))
    }
    finish({ translate: async (text) => `EN ${text}` })

    const translator = await created
    expect(progress).toEqual([0.25, 0.5, 0.75])
    await expect(translator.translate('hola')).resolves.toBe('EN hola')
  })

  it('a single translation that hangs fails instead of stopping the whole run', async () => {
    install({ availability: async () => 'available', create: async () => ({ translate: never }) })
    const translator = await createTranslator()
    const outcome = expect(translator.translate('hola')).rejects.toThrow('timeout')
    await vi.advanceTimersByTimeAsync(WAIT_MS.translate)
    await outcome
  })
})
