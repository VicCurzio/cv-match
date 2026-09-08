import { describe, expect, it } from 'vitest'
import { readPdf } from '@/domain/export/readPdfText'
import { AR_PROFILE } from '@/domain/market/marketProfile'
import { cleanAr } from '@/test/fixtures'
import { buildPdf } from '@/templates/buildPdf'
import { mapToResume } from './mapToResume'
import { parseEducation } from './parseEducation'
import { parseExperience } from './parseExperience'

/**
 * The whole importer, against the one resume whose correct answer is known:
 * the one this app just generated.
 *
 * Every other test here feeds the parsers text written by hand, which quietly
 * means "text shaped the way the person writing the test imagined". This one
 * takes the real bytes of a real export and asks whether the product can read
 * its own output. It is also the cheapest regression net there is: a change to
 * a template, to the PDF reader or to any parser shows up here.
 *
 * It found one on the way in -- the education block came back as two half
 * entries, because the title and its date are drawn as two pieces of one visual
 * row and the parser only looked upwards for the institution.
 */
describe('the importer can read a CV this app produced', () => {
  async function reimport() {
    const blob = await buildPdf(cleanAr, {
      profile: AR_PROFILE,
      atsMode: true,
      template: 'harvard',
    })
    const pdf = await readPdf(new Uint8Array(await blob.arrayBuffer()))
    return mapToResume(pdf.lines)
  }

  it('recovers who the person is and how to reach them', async () => {
    const draft = await reimport()

    expect(draft.fullName).toBe(cleanAr.personal.fullName)
    expect(draft.headline).toBe(cleanAr.personal.headline)
    expect(draft.email).toBe(cleanAr.personal.email)
    expect(draft.phone).toContain('555-0100')
    expect(draft.linkedin).toBe(cleanAr.personal.linkedin)
  })

  it('recovers the job with its dates, its company and every bullet', async () => {
    const jobs = parseExperience((await reimport()).experienceText)
    const original = cleanAr.experience[0]

    expect(jobs).toHaveLength(1)
    expect(jobs[0]?.role).toBe(original?.role)
    expect(jobs[0]?.company).toBe(original?.company)
    expect(jobs[0]?.startDate).toBe(original?.startDate)
    expect(jobs[0]?.endDate).toBeNull()
    expect(jobs[0]?.bullets).toEqual(original?.bullets)
  })

  it('recovers the study as one entry, not as a title and an orphan', async () => {
    const studies = parseEducation((await reimport()).educationText)
    const original = cleanAr.education[0]

    expect(studies).toHaveLength(1)
    expect(studies[0]?.title).toBe(original?.title)
    expect(studies[0]?.institution).toBe(original?.institution)
    expect(studies[0]?.endDate).toBe(original?.endDate)
  })

  it('leaves nothing unplaced', async () => {
    expect((await reimport()).leftovers).toEqual([])
  })
})
