import { Children } from 'react'
import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import type { Resume } from '@/domain/resume/resumeSchema'
import {
  PAGE,
  contactParts,
  formatRange,
  formatYearMonth,
  languageLevel,
} from '@/templates/shared/format'

/**
 * The ATS-safe template.
 *
 * Every restriction below is a thing an automated reader cannot process, not a
 * style choice -- so none of them are decoration to be "improved" later:
 * one column, no icons, no layout tables, no colour, no text inside images, and
 * section headings with the names a reader expects.
 *
 * The fonts are the PDF standard ones (Times-Roman, Helvetica). They cover
 * Latin-1, so Spanish accents, the enye and the opening marks come out right
 * with nothing to embed and nothing to download at runtime.
 */

const styles = StyleSheet.create({
  page: {
    paddingTop: PAGE.margin,
    paddingBottom: PAGE.margin,
    paddingHorizontal: PAGE.margin,
    fontFamily: 'Helvetica',
    fontSize: 10,
    lineHeight: 1.45,
    color: PAGE.ink,
  },
  name: {
    fontFamily: 'Times-Bold',
    fontSize: 20,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  headline: {
    fontSize: 10.5,
    textAlign: 'center',
    marginTop: 3,
    color: PAGE.inkSoft,
  },
  contact: {
    fontSize: 9,
    textAlign: 'center',
    // Tight to the headline: name, title and contact are one block, and the
    // gap that matters is the one AFTER them, not the ones inside.
    marginTop: 2,
    color: PAGE.inkSoft,
  },
  /** Separates the whole header from the first section. */
  header: { marginBottom: 7 },
  section: { marginTop: 11 },
  sectionTitle: {
    fontFamily: 'Times-Bold',
    fontSize: 11,
    letterSpacing: 1.1,
    borderBottomWidth: 0.8,
    borderBottomColor: PAGE.ink,
    paddingBottom: 2,
    marginBottom: 5,
  },
  summary: { fontSize: 10, textAlign: 'justify' },
  entry: { marginBottom: 7 },
  entryHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  /*
   * `flex: 1` is what stops a long title from running over the date.
   *
   * Without it the title took its natural width, which for a grouped course
   * like "Instrumentación de préstamos, legajo de crédito, asesoramiento
   * comercial y habilidades de venta" is wider than the row -- so it printed
   * straight through the year on the right. With flex it wraps instead.
   */
  role: { fontFamily: 'Helvetica-Bold', fontSize: 10.5, flex: 1, paddingRight: 10 },
  /** Never squeezed: the date is short and has to stay readable and aligned. */
  dates: { fontSize: 9, color: PAGE.inkFaint, flexShrink: 0 },
  company: { fontSize: 9.5, color: PAGE.inkSoft, marginBottom: 2 },
  bulletRow: { flexDirection: 'row', marginBottom: 1.5 },
  bulletMark: { width: 10, fontSize: 10 },
  bulletText: { flex: 1, fontSize: 10 },
  /*
   * A wrapping row of separate items, not one joined string.
   *
   * Joining with a separator produced `... Negociación  ·-` at the line break:
   * react-pdf treats the middle dot as a break opportunity and emits a hyphen
   * there, and the hyphenation callback does not cover it because it is not a
   * word being split. With one element per item the break falls between
   * elements, where there is nothing to hyphenate.
   */
  tagRow: { flexDirection: 'row', flexWrap: 'wrap' },
  tag: { fontSize: 10 },
  /**
   * The separator is its OWN element, not a character inside the text.
   *
   * Spacing alone read as a ragged column of loose words with holes in it. A
   * dot groups them back into a list -- and kept apart as an element, the line
   * still breaks between items, where there is nothing to hyphenate.
   */
  tagSeparator: { fontSize: 10, color: PAGE.inkFaint, marginHorizontal: 6 },
})

interface Props {
  resume: Resume
}

/**
 * A section: its heading, then its entries.
 *
 * Two failures shaped this, and the fix has to avoid both at once.
 *
 * `wrap={false}` on the WHOLE section reads as "keep this together" and means
 * "this block cannot be split". A section longer than one page then has nowhere
 * to go: react-pdf pushes it whole onto a fresh page and everything past the
 * bottom margin is simply not drawn. On a two-page resume -- which Argentina
 * allows -- that silently loses jobs.
 *
 * `minPresenceAhead` on the heading was the next attempt and did not hold:
 * "CURSOS Y CERTIFICACIONES" still landed alone at the foot of page one with
 * every course on page two. Asking for a number of points ahead is a guess
 * about how tall the next entry will be, and the guess was wrong.
 *
 * So: the heading and the FIRST entry are bound into one unbreakable block --
 * which is the thing actually wanted -- and the rest of the entries stay free
 * to flow, because a section with six entries has to break somewhere.
 */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const [first, ...rest] = Children.toArray(children)

  return (
    <View style={styles.section}>
      <View wrap={false}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {first}
      </View>
      {rest}
    </View>
  )
}

export function HarvardResume({ resume }: Props) {
  const contact = contactParts(resume)
  const skills = resume.skills.filter((s) => s.trim())

  return (
    <Document
      title={`${resume.personal.fullName} - CV`}
      author={resume.personal.fullName}
      language="es"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header} wrap={false}>
          <Text style={styles.name}>{resume.personal.fullName || 'Tu nombre'}</Text>
          {resume.personal.headline ? (
            <Text style={styles.headline}>{resume.personal.headline}</Text>
          ) : null}
          {contact.length > 0 ? (
            <Text style={styles.contact}>{contact.join('  |  ')}</Text>
          ) : null}
        </View>

        {resume.summary.trim() ? (
          <Section title="PERFIL PROFESIONAL">
            <Text style={styles.summary}>{resume.summary}</Text>
          </Section>
        ) : null}

        {resume.experience.length > 0 ? (
          <Section title="EXPERIENCIA LABORAL">
            {resume.experience.map((item) => (
              <View key={item.id} style={styles.entry} wrap={false}>
                <View style={styles.entryHead}>
                  <Text style={styles.role}>{item.role}</Text>
                  <Text style={styles.dates}>{formatRange(item)}</Text>
                </View>
                <Text style={styles.company}>
                  {[item.company, item.location].filter(Boolean).join(' - ')}
                </Text>
                {item.bullets
                  .filter((b) => b.trim())
                  .map((bullet, index) => (
                    <View key={index} style={styles.bulletRow}>
                      <Text style={styles.bulletMark}>-</Text>
                      <Text style={styles.bulletText}>{bullet}</Text>
                    </View>
                  ))}
              </View>
            ))}
          </Section>
        ) : null}

        {resume.education.length > 0 ? (
          <Section title="EDUCACIÓN">
            {resume.education.map((item) => (
              <View key={item.id} style={styles.entry} wrap={false}>
                <View style={styles.entryHead}>
                  <Text style={styles.role}>{item.title}</Text>
                  <Text style={styles.dates}>
                    {item.inProgress ? 'en curso' : formatYearMonth(item.endDate)}
                  </Text>
                </View>
                <Text style={styles.company}>{item.institution}</Text>
              </View>
            ))}
          </Section>
        ) : null}

        {resume.courses.length > 0 ? (
          <Section title="CURSOS Y CERTIFICACIONES">
            {resume.courses.map((item) => (
              <View key={item.id} style={styles.entry} wrap={false}>
                <View style={styles.entryHead}>
                  <Text style={styles.role}>{item.title}</Text>
                  <Text style={styles.dates}>
                    {item.inProgress ? 'en curso' : formatYearMonth(item.endDate)}
                  </Text>
                </View>
                <Text style={styles.company}>
                  {[item.institution, item.detail].filter(Boolean).join(' - ')}
                </Text>
              </View>
            ))}
          </Section>
        ) : null}

        {skills.length > 0 ? (
          <Section title="HABILIDADES">
            <View style={styles.tagRow}>
              {skills.flatMap((skill, index) => [
                ...(index > 0
                  ? [
                      <Text key={`sep-${index}`} style={styles.tagSeparator}>
                        ·
                      </Text>,
                    ]
                  : []),
                <Text key={index} style={styles.tag}>
                  {skill}
                </Text>,
              ])}
            </View>
          </Section>
        ) : null}

        {resume.languages.length > 0 ? (
          <Section title="IDIOMAS">
            <View style={styles.tagRow}>
              {resume.languages.flatMap((language, index) => [
                ...(index > 0
                  ? [
                      <Text key={`sep-${language.id}`} style={styles.tagSeparator}>
                        ·
                      </Text>,
                    ]
                  : []),
                <Text key={language.id} style={styles.tag}>
                  {languageLevel(language) ? `${language.name} (${languageLevel(language)})` : language.name}
                </Text>,
              ])}
            </View>
          </Section>
        ) : null}
      </Page>
    </Document>
  )
}
