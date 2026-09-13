import { describe, expect, it } from 'vitest'
import { cleanAr } from '@/test/fixtures'
import { fileName } from './format'

describe('file names', () => {
  it('names the base resume after the person', () => {
    expect(fileName(cleanAr)).toBe('Ana-Gómez-Ruiz-CV.pdf')
  })

  it('adds the company for a version, so five applications are five different files', () => {
    expect(fileName(cleanAr, 'Banco Columbia')).toBe('Ana-Gómez-Ruiz-CV-Banco-Columbia.pdf')
  })

  it('names the letter the same way', () => {
    expect(fileName(cleanAr, 'Banco Columbia', 'Carta')).toBe('Ana-Gómez-Ruiz-Carta-Banco-Columbia.pdf')
  })

  it('drops characters a file system or a mail client would mangle', () => {
    expect(fileName(cleanAr, 'Pérez & Hijos S.A.')).toBe('Ana-Gómez-Ruiz-CV-Pérez-Hijos-SA.pdf')
  })
})
