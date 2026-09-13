import { describe, expect, it } from 'vitest'
import { createVersion } from '@/domain/resume/versions'
import { defaultSettings } from '@/domain/resume/settings'
import { basenameFrom, editorAccess, paths, previewPageFrom, resumePath } from './routes'

describe('addresses', () => {
  it('names the screens in English, as every identifier in the project', () => {
    expect(paths.start).toBe('/')
    expect(paths.editor).toBe('/editor')
    expect(paths.version('ver-abc123')).toBe('/editor/versions/ver-abc123')
  })

  it('never puts the company or the role of a version in the address', () => {
    const version = createVersion(
      { id: 'ver-k3j9x2a', company: 'Banco Columbia', role: 'Oficial de atención' },
      defaultSettings(),
    )
    const path = paths.version(version.id)
    expect(path).not.toMatch(/columbia|banco|oficial/i)
  })

  it('escapes an id that would otherwise break the path', () => {
    expect(paths.version('a/b?c')).toBe('/editor/versions/a%2Fb%3Fc')
  })
})

describe('who gets to see the editor', () => {
  it('shows the editor once there is a resume', () => {
    expect(editorAccess({ hasResume: true, versionId: null, versionIds: [] })).toEqual({ kind: 'show' })
  })

  it('sends a first visit to the start questions instead of a blank editor', () => {
    expect(editorAccess({ hasResume: false, versionId: null, versionIds: [] })).toEqual({
      kind: 'redirect',
      to: '/',
    })
  })

  it('shows a version that exists', () => {
    expect(
      editorAccess({ hasResume: true, versionId: 'ver-1', versionIds: ['ver-1', 'ver-2'] }),
    ).toEqual({ kind: 'show' })
  })

  it('sends an unknown version -- deleted, or opened on another device -- to the base', () => {
    expect(editorAccess({ hasResume: true, versionId: 'ver-gone', versionIds: ['ver-1'] })).toEqual({
      kind: 'redirect',
      to: '/editor',
    })
  })

  it('checks the resume before the version: no resume means the start screen', () => {
    expect(editorAccess({ hasResume: false, versionId: 'ver-1', versionIds: [] })).toEqual({
      kind: 'redirect',
      to: '/',
    })
  })
})

describe('continuing where it was left', () => {
  it('reopens the version that was open', () => {
    expect(resumePath('ver-1', ['ver-1'])).toBe('/editor/versions/ver-1')
  })

  it('falls back to the base when that version is gone or there was none', () => {
    expect(resumePath('ver-gone', ['ver-1'])).toBe('/editor')
    expect(resumePath(null, ['ver-1'])).toBe('/editor')
  })
})

describe('router basename', () => {
  it.each([
    ['/cv-match/', '/cv-match'],
    ['/', '/'],
    ['./', '/'],
    ['/a/b/', '/a/b'],
  ])('%s becomes %s', (base, expected) => {
    expect(basenameFrom(base)).toBe(expected)
  })
})

describe('the enlarged preview as a history entry', () => {
  it('opens on the page the entry names', () => {
    expect(previewPageFrom({ previewPage: 2 })).toBe(2)
  })

  it.each([
    ['no state', null],
    ['state without the key', { other: true }],
    ['a page as text', { previewPage: '2' }],
    ['page zero', { previewPage: 0 }],
    ['half a page', { previewPage: 1.5 }],
  ])('stays closed with %s', (_, state) => {
    expect(previewPageFrom(state)).toBeNull()
  })
})
