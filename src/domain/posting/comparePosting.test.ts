import { describe, expect, it } from 'vitest'
import { defaultSettings } from '@/domain/resume/settings'
import { createVersion, patchOverrides, resolveVersion } from '@/domain/resume/versions'
import { bankPosting, branchResume } from '@/test/postings'
import { comparePosting, reduce } from './comparePosting'

const labels = (terms: { label: string }[]) => terms.map((term) => term.label.toLowerCase())

describe('what a real posting asks for that the resume does not say', () => {
  const result = comparePosting(bankPosting, branchResume, { company: 'Banco Columbia' })

  it('lists the job-specific words the resume is missing', () => {
    expect(labels(result.missing)).toEqual(expect.arrayContaining(['app', 'atm', 'digital', 'bancario']))
  })

  it('credits what the resume already says, in its own inflection', () => {
    // The posting says "clientes" and "operar"; the resume says "clientes" and "Operé".
    expect(labels(result.covered)).toEqual(expect.arrayContaining(['clientes', 'operar']))
  })

  it('puts the most repeated words first', () => {
    expect(result.missing[0]).toEqual({ label: 'bancario', count: 2 })
    expect(result.covered[0]).toEqual({ label: 'clientes', count: 3 })
  })

  /*
   * The noise that would bury the useful words. The zone list alone is seven
   * place names; the application block is an email, a subject line and "zona".
   */
  it('leaves out the logistics sections: zones and how to apply', () => {
    const everything = [...labels(result.missing), ...labels(result.covered)]
    for (const noise of ['berazategui', 'merlo', 'zárate', 'luján', 'empleos', 'asunto', 'zona', 'disponibilidad', 'rotar']) {
      expect(everything).not.toContain(noise)
    }
  })

  it('leaves out words every posting uses, and the company name', () => {
    const everything = [...labels(result.missing), ...labels(result.covered)]
    for (const noise of ['perfil', 'buscado', 'experiencia', 'ganas', 'personas', 'columbia', 'banco', 'para', 'los']) {
      expect(everything).not.toContain(noise)
    }
  })
})

describe('adapting the resume moves the words across', () => {
  it('a version that tells the same facts with the posting words covers them', () => {
    const version = patchOverrides(
      createVersion({ id: 'v', company: 'Banco Columbia', role: 'Oficial' }, defaultSettings()),
      {
        headline: 'Atención al cliente bancario · Estudiante universitaria',
        summary: 'Acompañé a clientes en el uso de la app y de los cajeros automáticos, y en canales digitales.',
      },
    )
    const before = comparePosting(bankPosting, branchResume, { company: 'Banco Columbia' })
    const after = comparePosting(bankPosting, resolveVersion(branchResume, version), {
      company: 'Banco Columbia',
    })

    for (const term of ['app', 'atm', 'digital', 'bancario', 'acompañar']) {
      expect(labels(before.missing)).toContain(term)
      expect(labels(after.covered)).toContain(term)
    }
    // "universitarios" in the posting, "universitaria" in the resume.
    expect(labels(after.covered)).toContain('universitarios')
  })
})

describe('reduce folds what a posting and a resume never share', () => {
  it.each([
    ['clientes', 'cliente'],
    ['sucursales', 'sucursal'],
    ['atender', 'atendí'],
    ['gestionar', 'gestioné'],
    ['gestionar', 'gestión'],
    ['asistirlos', 'asistí'],
    ['bancarios', 'bancaria'],
    ['atendiendo', 'atendí'],
  ])('%s and %s meet', (a, b) => {
    expect(reduce(a)).toBe(reduce(b))
  })

  it('treats ATM and cajero as the same thing, and nothing else', () => {
    expect(reduce('ATM')).toBe(reduce('cajeros'))
    expect(reduce('aplicación')).toBe(reduce('app'))
    expect(reduce('caja')).not.toBe(reduce('cajero'))
  })
})

describe('edge cases', () => {
  it('an empty posting has nothing to compare', () => {
    expect(comparePosting('', branchResume)).toEqual({ covered: [], missing: [] })
  })

  it('a posting with no headers is read whole', () => {
    const result = comparePosting('Buscamos cajero con manejo de Excel y Tango.', branchResume)
    expect(labels(result.covered)).toContain('excel')
    expect(labels(result.missing)).toEqual(expect.arrayContaining(['cajero', 'tango']))
  })

  it('ignores a link and an email pasted with the posting', () => {
    const result = comparePosting(
      'Tesorería. Más info en https://empleos.example.com/aviso/123 o a rrhh@example.com',
      branchResume,
    )
    expect(labels(result.missing)).toEqual(['tesorería'])
  })
})
