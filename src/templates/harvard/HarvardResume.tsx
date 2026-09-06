import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import type { Resume } from '@/domain/resume/resumeSchema'
import { PAGE, contactParts, formatRange, formatYearMonth } from '@/templates/shared/format'

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
    marginTop: 5,
    color: PAGE.inkSoft,
  },
  section: { marginTop: 15 },
  sectionTitle: {
    fontFamily: 'Times-Bold',
    fontSize: 11,
    letterSpacing: 1.1,
    borderBottomWidth: 0.8,
    borderBottomColor: PAGE.ink,
    paddingBottom: 2,
    marginBottom: 7,
  },
  summary: { fontSize: 10, textAlign: 'justify' },
  entry: { marginBottom: 9 },
  entryHead: { flexDirection: 'row', justifyContent: 'space-between' },
  role: { fontFamily: 'Helvetica-Bold', fontSize: 10.5 },
  dates: { fontSize: 9, color: PAGE.inkFaint },
  company: { fontSize: 9.5, color: PAGE.inkSoft, marginBottom: 2 },
  bulletRow: { flexDirection: 'row', marginBottom: 1.5 },
  bulletMark: { width: 10, fontSize: 10 },
  bulletText: { flex: 1, fontSize: 10 },
  inlineList: { fontSize: 10 },
})

interface Props {
  resume: Resume
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  // `wrap={false}` keeps a section from being split across pages.
  return (
    <View style={styles.section} wrap={false}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
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
        <View wrap={false}>
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

        {skills.length > 0 ? (
          <Section title="HABILIDADES">
            <Text style={styles.inlineList}>{skills.join('  ·  ')}</Text>
          </Section>
        ) : null}

        {resume.languages.length > 0 ? (
          <Section title="IDIOMAS">
            <Text style={styles.inlineList}>
              {resume.languages.map((l) => `${l.name} (${l.level})`).join('  ·  ')}
            </Text>
          </Section>
        ) : null}
      </Page>
    </Document>
  )
}
