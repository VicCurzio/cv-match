import { describe, expect, it } from 'vitest'
import { parseEducation } from './parseEducation'

describe('education comes back as entries, not as one paragraph', () => {
  it('reads a study written as title, institution and year', () => {
    const [entry, ...rest] = parseEducation(
      ['Bachiller en Economía y Administración', 'Escuela Secundaria N.º 12', '2010'].join('\n'),
    )

    expect(rest).toEqual([])
    expect(entry?.title).toBe('Bachiller en Economía y Administración')
    expect(entry?.institution).toBe('Escuela Secundaria N.º 12')
    expect(entry?.endDate).toBe('2010-12')
  })

  it('separates two studies instead of gluing them together', () => {
    const entries = parseEducation(
      [
        'Licenciatura en Administración',
        'Universidad Nacional de La Plata',
        '2015 - 2019',
        'Bachiller en Economía',
        'Escuela Secundaria N.º 12',
        '2010',
      ].join('\n'),
    )

    expect(entries).toHaveLength(2)
    expect(entries[0]?.title).toBe('Licenciatura en Administración')
    expect(entries[0]?.endDate).toBe('2019-12')
    expect(entries[1]?.title).toBe('Bachiller en Economía')
    expect(entries[1]?.institution).toBe('Escuela Secundaria N.º 12')
  })

  /** The layout that used to leave the university stranded as its own entry. */
  it('takes the institution from below when the dates share the title line', () => {
    const [entry, ...rest] = parseEducation(
      ['2015 - 2019 Licenciatura en Administración', 'Universidad Nacional de La Plata'].join('\n'),
    )

    expect(rest).toEqual([])
    expect(entry?.title).toBe('Licenciatura en Administración')
    expect(entry?.institution).toBe('Universidad Nacional de La Plata')
  })

  it('marks an unfinished study as in progress and gives it no end date', () => {
    const [entry] = parseEducation(['Tecnicatura en Administración - UNLP', 'En curso'].join('\n'))

    expect(entry?.title).toBe('Tecnicatura en Administración')
    expect(entry?.institution).toBe('UNLP')
    expect(entry?.inProgress).toBe(true)
    expect(entry?.endDate).toBeUndefined()
  })

  it('reads a month when the resume writes one', () => {
    const [entry] = parseEducation(['Perito mercantil', 'Instituto San José', 'marzo 2011'].join('\n'))
    expect(entry?.endDate).toBe('2011-03')
  })

  it('still pairs title and institution when there are no dates at all', () => {
    const entries = parseEducation(
      ['Bachiller en Economía y Administración', 'Escuela Secundaria N.º 12'].join('\n'),
    )

    expect(entries).toHaveLength(1)
    expect(entries[0]?.institution).toBe('Escuela Secundaria N.º 12')
  })

  /** The same loose date pattern that was eating words in the experience block. */
  it('does not eat the last word of a title that ends with the year', () => {
    const [entry] = parseEducation(
      ['Bachiller en Economía 2010', 'Escuela Secundaria N.º 12'].join('\n'),
    )

    expect(entry?.title).toBe('Bachiller en Economía')
    expect(entry?.institution).toBe('Escuela Secundaria N.º 12')
    expect(entry?.endDate).toBe('2010-12')
  })

  it('does not invent an entry out of an empty block', () => {
    expect(parseEducation('')).toEqual([])
    expect(parseEducation('\n  \n')).toEqual([])
  })
})

/**
 * The extractor marks a wide horizontal gap with a middle dot, so a study whose
 * year is drawn at the far margin arrives as `Título · 2019`. Without the dot in
 * the trimming set the title kept it, and the import dialog showed
 * "Tecnicatura en Administración de Empresas · · Universidad Nacional".
 */
describe('the separator the extractor writes does not end up in the text', () => {
  it('drops a trailing dot left by the date', () => {
    const [entry] = parseEducation(
      ['Tecnicatura en Administración de Empresas · dic 2019', 'Universidad Nacional de La Plata'].join('\n'),
    )

    expect(entry?.title).toBe('Tecnicatura en Administración de Empresas')
    expect(entry?.institution).toBe('Universidad Nacional de La Plata')
    expect(entry?.endDate).toBe('2019-12')
  })

  it('reads a dot between a title and its institution as the separator it is', () => {
    const [entry] = parseEducation('Perito mercantil · Instituto San José · 2011')

    expect(entry?.title).toBe('Perito mercantil')
    expect(entry?.institution).toBe('Instituto San José')
  })
})
