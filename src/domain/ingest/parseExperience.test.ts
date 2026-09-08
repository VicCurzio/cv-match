import { describe, expect, it } from 'vitest'
import { dateRangeOf, parseExperience, parseMonth } from './parseExperience'

describe('parseMonth accepts the ways people write dates', () => {
  it('reads Spanish month names, long and short', () => {
    expect(parseMonth('marzo 2021')).toBe('2021-03')
    expect(parseMonth('mar 2021')).toBe('2021-03')
    expect(parseMonth('diciembre de 2010')).toBe('2010-12')
    expect(parseMonth('Ago. 2019')).toBe('2019-08')
  })

  it('reads numeric and English forms', () => {
    expect(parseMonth('03/2021')).toBe('2021-03')
    expect(parseMonth('2021-03')).toBe('2021-03')
    expect(parseMonth('March 2021')).toBe('2021-03')
  })

  it('falls back to January for a bare year', () => {
    expect(parseMonth('2021')).toBe('2021-01')
  })

  it('returns null for something that is not a date', () => {
    expect(parseMonth('Distribuidora del Este')).toBeNull()
  })
})

describe('dateRangeOf finds the range and the open end', () => {
  it('reads a closed range', () => {
    expect(dateRangeOf('mayo 2018 - agosto 2019')).toEqual({ start: '2018-05', end: '2019-08' })
  })

  it('treats "actualidad" as still working there', () => {
    expect(dateRangeOf('marzo 2021 - actualidad')).toEqual({ start: '2021-03', end: null })
    expect(dateRangeOf('03/2021 a presente')).toEqual({ start: '2021-03', end: null })
  })

  it('ignores prose that merely mentions a year', () => {
    expect(dateRangeOf('Trabajé mucho durante 2021 en atención al cliente')).toBeNull()
  })
})

describe('parseExperience splits a block into entries', () => {
  const entries = parseExperience(
    [
      'Administrativa comercial - Distribuidora del Este',
      'marzo 2021 - actualidad',
      '- Encargada de la atención al cliente en mostrador.',
      '- Responsable del archivo de expedientes.',
      'Asesora comercial - Casa Belgrano',
      'mayo 2018 - agosto 2019',
      '- Venta de productos del salón y posventa.',
    ].join('\n'),
  )

  it('finds one entry per date range', () => {
    expect(entries).toHaveLength(2)
  })

  it('splits the role from the company', () => {
    expect(entries[0]?.role).toBe('Administrativa comercial')
    expect(entries[0]?.company).toBe('Distribuidora del Este')
  })

  it('keeps the dates, with an open end for the current job', () => {
    expect(entries[0]?.startDate).toBe('2021-03')
    expect(entries[0]?.endDate).toBeNull()
    expect(entries[1]?.endDate).toBe('2019-08')
  })

  it('attaches the bullets to the entry above them, without the bullet marks', () => {
    expect(entries[0]?.bullets).toEqual([
      'Encargada de la atención al cliente en mostrador.',
      'Responsable del archivo de expedientes.',
    ])
    expect(entries[1]?.bullets).toEqual(['Venta de productos del salón y posventa.'])
  })
})

/**
 * The exact shape that came back from re-importing a PDF this app generated.
 * It exposed three separate defects at once, so it stays as a regression case:
 * the employer was being read as a bullet, and the second job's title -- which
 * sits ABOVE its own date line -- was being read as the first job's last bullet.
 */
describe('parseExperience survives a real round trip', () => {
  const entries = parseExperience(
    [
      'Administrativa comercial mar 2021 - actualidad',
      'Distribuidora del Este - La Plata',
      '- Encargada de la atención al cliente en mostrador y por teléfono.',
      '- Responsable de la gestión documental y el archivo de expedientes.',
      '- Tareas de facturación y seguimiento de cuentas corrientes.',
      'may 2018 - ago 2019',
      'Asesora comercial',
      'Casa Belgrano - La Plata',
      '- Encargada de la venta de productos del salón y la posventa.',
    ].join('\n'),
  )

  it('reads the employer as the employer, not as a bullet', () => {
    expect(entries[0]?.company).toBe('Distribuidora del Este - La Plata')
    expect(entries[0]?.bullets).toHaveLength(3)
    expect(entries[0]?.bullets.join(' ')).not.toContain('Distribuidora')
  })

  it('finds the title when it sits below its own date line', () => {
    expect(entries[1]?.role).toBe('Asesora comercial')
    expect(entries[1]?.company).toBe('Casa Belgrano - La Plata')
  })

  it('does not leak the previous job bullets into the next title', () => {
    expect(entries[1]?.role).not.toContain('Tareas de facturación')
    expect(entries[0]?.bullets.at(-1)).toBe(
      'Tareas de facturación y seguimiento de cuentas corrientes.',
    )
  })
})

describe('parseExperience handles the other common layout', () => {
  it('reads the date range on the same line as the job title', () => {
    const entries = parseExperience(
      ['Cajera en Supermercado Sur | 2019 - 2021', '- Atendí caja y depósito.'].join('\n'),
    )
    expect(entries).toHaveLength(1)
    expect(entries[0]?.role).toBe('Cajera')
    expect(entries[0]?.company).toBe('Supermercado Sur')
    expect(entries[0]?.bullets).toEqual(['Atendí caja y depósito.'])
  })

  it('returns nothing rather than guessing when there are no dates', () => {
    expect(parseExperience('Trabajé en varios lugares haciendo de todo')).toEqual([])
  })

  it('survives an empty block', () => {
    expect(parseExperience('')).toEqual([])
  })
})

/**
 * The date pattern used to accept "any word followed by a year" as a month.
 *
 * `Encargada de depósito 2018 - actualidad` then matched with "depósito" as the
 * month name, `parseMonth` returned null for it, and the anchor was thrown
 * away -- so the whole job, its title and its bullets never reached the import.
 * A resume that writes the dates at the end of the title line, which is most of
 * them, lost every position it had.
 */
describe('a date range is found even when a word sits right before it', () => {
  it('reads the range when the title runs into the year', () => {
    expect(dateRangeOf('Encargada de depósito 2018 - actualidad')).toEqual({
      start: '2018-01',
      end: null,
    })
  })

  it('keeps the job instead of dropping it', () => {
    const jobs = parseExperience(
      ['Encargada de depósito 2018 - 2021', '- Coordiné el equipo de recepción.'].join('\n'),
    )

    expect(jobs).toHaveLength(1)
    expect(jobs[0]?.role).toBe('Encargada de depósito')
    expect(jobs[0]?.bullets).toEqual(['Coordiné el equipo de recepción.'])
  })

  it('still reads a real month name', () => {
    expect(dateRangeOf('Analista marzo 2021 - actualidad')?.start).toBe('2021-03')
  })

  it('reads "setiembre", which is how half the country spells it', () => {
    expect(parseMonth('setiembre 2019')).toBe('2019-09')
  })
})
