import { describe, expect, it } from 'vitest'
import { looksUnprofessional, startsWithActionVerb, addedNumbers, numbersIn } from './text'

/**
 * These cases come from a real resume. The rule originally only matched a short
 * list of literal openers ("Encargada de", "Responsable de") and caught one
 * bullet per job, while almost every bullet actually opened with a deverbal
 * noun -- naming the activity instead of saying what the person did.
 */
describe('startsWithActionVerb flags bullets that name an activity', () => {
  const weak = [
    'Gestión y control administrativo general, organización y resguardo de legajos.',
    'Seguimiento de mora, negociación de acuerdos de pago y refinanciaciones.',
    'Generación de reportes de gestión y manejo de bases de datos operativas.',
    'Atención presencial y telefónica a clientes.',
    'Preparación, control, auditoría y armado de legajos administrativos.',
    'Aplicación de criterios de organización institucional.',
    'Desempeño en tareas de atención al usuario y recepción.',
    'Negociación directa, manejo de objeciones y seguimiento de operaciones.',
    'Encargada de la atención al cliente en mostrador.',
    'Responsable de la gestión documental.',
    'Tareas de facturación y seguimiento de cuentas corrientes.',
  ]

  for (const bullet of weak) {
    it(`flags: ${bullet.slice(0, 42)}...`, () => {
      expect(startsWithActionVerb(bullet)).toBe(false)
    })
  }
})

describe('it leaves real action bullets alone', () => {
  const strong = [
    'Gestioné una cartera de 180 cuentas corrientes.',
    'Reduje 30% la mora del canal minorista en 8 meses.',
    'Implementé un tablero de seguimiento que recortó 4 horas semanales.',
    'Coordiné un equipo de 5 personas.',
    'Atendí a 40 clientes por día en mostrador.',
    'Hice el cierre mensual sin diferencias durante dos años.',
    'Produje los reportes de gestión para la gerencia.',
    'Resolví reclamos de clientes en menos de 24 horas.',
    'Negocié acuerdos de pago con 60 deudores.',
    'Armé el archivo de legajos desde cero.',
  ]

  for (const bullet of strong) {
    it(`accepts: ${bullet.slice(0, 42)}...`, () => {
      expect(startsWithActionVerb(bullet)).toBe(true)
    })
  }

  it('ignores the bullet mark when judging the opener', () => {
    expect(startsWithActionVerb('- Gestioné una cartera de 180 cuentas.')).toBe(true)
    expect(startsWithActionVerb('• Gestión de la cartera de cuentas.')).toBe(false)
  })
})

describe('looksUnprofessional spots an address that undersells', () => {
  it('flags a year of birth or a nickname', () => {
    expect(looksUnprofessional('anagomez1992@example.com')).toBe(true)
    expect(looksUnprofessional('nenaloca@example.com')).toBe(true)
  })

  it('leaves a normal address alone', () => {
    expect(looksUnprofessional('ana.gomez.ruiz@example.com')).toBe(false)
    expect(looksUnprofessional('camila.britez@example.com')).toBe(false)
  })
})

describe('numbers a text states', () => {
  it.each([
    ['Atendí entre 20 y 40 clientes', ['20', '40']],
    ['Reduje 30% la mora', ['30']],
    ['Gestioné 1.500 legajos', ['1500']],
    ['Gestioné 1500 legajos', ['1500']],
    ['56,5 horas de formación', ['56.5']],
    ['de 6-7 autos por mes', ['6', '7']],
    ['Sin cifras', []],
  ])('%s', (text, expected) => {
    expect(numbersIn(text)).toEqual(expected)
  })
})

describe('numbers a rewrite adds', () => {
  const original = 'Atendí entre 20 y 40 clientes por día. Reduje 30% la mora.'

  it('allows the same numbers in another order and other words', () => {
    expect(addedNumbers(original, 'Bajé 30% la mora y atendí de 20 a 40 personas diarias.')).toEqual([])
  })

  it('allows dropping a number: saying less is not saying something false', () => {
    expect(addedNumbers(original, 'Atendí clientes por día y reduje 30% la mora.')).toEqual([])
  })

  it('names a changed number', () => {
    expect(addedNumbers(original, 'Atendí entre 20 y 50 clientes.')).toEqual(['50'])
  })

  it('counts repetition: one 20 cannot become two', () => {
    expect(addedNumbers('20 clientes', '20 clientes y 20 proveedores')).toEqual(['20'])
  })

  it('treats 1.500 and 1500 as the same figure', () => {
    expect(addedNumbers('Gestioné 1.500 legajos', 'Llevé 1500 legajos')).toEqual([])
  })
})
