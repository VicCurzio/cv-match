import { describe, expect, it } from 'vitest'
import { joinRow } from './extractText'

/**
 * A PDF row has no idea of columns, so the gap between two runs is the only
 * thing that says whether they are two words or two separate items.
 *
 * The case that forced this: importing a resume this app had generated turned
 * the three skills of its Harvard template -- drawn side by side -- into one
 * skill called "Excel avanzado Tango Gestión Cuentas corrientes".
 */
const at = (x: number, width: number, text: string) => ({ x, width, text })

describe('a row is joined by its gaps', () => {
  it('keeps ordinary words as one phrase', () => {
    expect(joinRow([at(51, 40, 'Excel'), at(94, 45, 'avanzado')])).toBe('Excel avanzado')
  })

  it('separates runs that sit far apart', () => {
    const row = [at(51, 60, 'Excel avanzado'), at(125, 55, 'Tango Gestión')]
    expect(joinRow(row)).toBe('Excel avanzado · Tango Gestión')
  })

  it('separates a job title from the dates drawn at the far margin', () => {
    const row = [at(51, 90, 'Analista administrativa'), at(420, 70, 'mar 2021 - actualidad')]
    expect(joinRow(row)).toBe('Analista administrativa · mar 2021 - actualidad')
  })

  it('handles a single run, and none at all', () => {
    expect(joinRow([at(51, 40, 'Idiomas')])).toBe('Idiomas')
    expect(joinRow([])).toBe('')
  })

  it('collapses the whitespace inside a run', () => {
    expect(joinRow([at(51, 40, '  Excel   avanzado  ')])).toBe('Excel avanzado')
  })
})
