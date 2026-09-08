import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import type { Resume } from '@/domain/resume/resumeSchema'
import { PAGE, formatRange, formatYearMonth } from '@/templates/shared/format'

/**
 * The template for when a person reads the resume: a mail to a small company, a
 * commercial or design profile. Two columns, one accent colour, optional photo.
 *
 * It receives a resume that is ALREADY filtered by the market profile, so it
 * never asks whether the photo is allowed -- if `personal.photo` is here, it is
 * allowed to be here (ADR 0002).
 */

const SIDEBAR = 165

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    lineHeight: 1.45,
    color: PAGE.ink,
    flexDirection: 'row',
  },
  /**
   * The grey band covers the whole sheet on every page, including a second one:
   * the sidebar is a flex child of the page, so it stretches to the page height
   * rather than to the height of the contact block inside it. Verified on the
   * rendered file -- `0 0 165 841.89 re` on each page -- not assumed.
   */
  sidebar: {
    width: SIDEBAR,
    backgroundColor: '#f2f5f8',
    paddingTop: PAGE.margin,
    paddingBottom: PAGE.margin,
    paddingHorizontal: 22,
  },
  main: {
    flex: 1,
    paddingTop: PAGE.margin,
    paddingBottom: PAGE.margin,
    paddingHorizontal: 28,
  },
  photo: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignSelf: 'center',
    marginBottom: 16,
    objectFit: 'cover',
  },
  name: { fontFamily: 'Helvetica-Bold', fontSize: 18, lineHeight: 1.2 },
  headline: { fontSize: 10.5, color: PAGE.accent, marginTop: 4, marginBottom: 14 },
  sideTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    letterSpacing: 1,
    color: PAGE.accent,
    marginTop: 14,
    marginBottom: 5,
  },
  sideItem: { fontSize: 9, color: PAGE.inkSoft, marginBottom: 3 },
  sectionTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 11,
    letterSpacing: 0.8,
    color: PAGE.accent,
    marginBottom: 6,
  },
  sectionRule: {
    borderBottomWidth: 1.2,
    borderBottomColor: PAGE.accent,
    width: 32,
    marginBottom: 8,
  },
  section: { marginBottom: 14 },
  summary: { fontSize: 10, textAlign: 'justify' },
  entry: { marginBottom: 10 },
  role: { fontFamily: 'Helvetica-Bold', fontSize: 10.5 },
  company: { fontSize: 9.5, color: PAGE.inkSoft },
  dates: { fontSize: 8.5, color: PAGE.inkFaint, marginBottom: 3 },
  bulletRow: { flexDirection: 'row', marginBottom: 1.5 },
  bulletMark: { width: 9, fontSize: 10, color: PAGE.accent },
  bulletText: { flex: 1, fontSize: 10 },
})

interface Props {
  resume: Resume
}

/**
 * A section may be split across pages; a single entry may not. See the same
 * note in the Harvard template: `wrap={false}` here meant a section longer than
 * one page was drawn past the bottom margin and the overflow was lost.
 */
function MainSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <View minPresenceAhead={36}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <View style={styles.sectionRule} />
      </View>
      {children}
    </View>
  )
}

export function ModernResume({ resume }: Props) {
  const { personal } = resume
  const place = [personal.city, personal.province, personal.country].filter(Boolean).join(', ')
  const contactItems = [personal.phone, personal.email, place, personal.linkedin, personal.website]
    .filter((value): value is string => Boolean(value && value.trim()))
  const skills = resume.skills.filter((s) => s.trim())

  return (
    <Document title={`${personal.fullName} - CV`} author={personal.fullName} language="es">
      <Page size="A4" style={styles.page}>
        <View style={styles.sidebar}>
          {personal.photo ? <Image style={styles.photo} src={personal.photo} /> : null}

          <Text style={styles.sideTitle}>CONTACTO</Text>
          {contactItems.map((item, index) => (
            <Text key={index} style={styles.sideItem}>
              {item}
            </Text>
          ))}

          {skills.length > 0 ? (
            <>
              <Text style={styles.sideTitle}>HABILIDADES</Text>
              {skills.map((skill, index) => (
                <Text key={index} style={styles.sideItem}>
                  {skill}
                </Text>
              ))}
            </>
          ) : null}

          {resume.languages.length > 0 ? (
            <>
              <Text style={styles.sideTitle}>IDIOMAS</Text>
              {resume.languages.map((language) => (
                <Text key={language.id} style={styles.sideItem}>
                  {language.name} - {language.level}
                </Text>
              ))}
            </>
          ) : null}
        </View>

        <View style={styles.main}>
          <View wrap={false}>
            <Text style={styles.name}>{personal.fullName || 'Tu nombre'}</Text>
            {personal.headline ? <Text style={styles.headline}>{personal.headline}</Text> : null}
          </View>

          {resume.summary.trim() ? (
            <MainSection title="PERFIL PROFESIONAL">
              <Text style={styles.summary}>{resume.summary}</Text>
            </MainSection>
          ) : null}

          {resume.experience.length > 0 ? (
            <MainSection title="EXPERIENCIA LABORAL">
              {resume.experience.map((item) => (
                <View key={item.id} style={styles.entry} wrap={false}>
                  <Text style={styles.role}>{item.role}</Text>
                  <Text style={styles.company}>
                    {[item.company, item.location].filter(Boolean).join(' - ')}
                  </Text>
                  <Text style={styles.dates}>{formatRange(item)}</Text>
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
            </MainSection>
          ) : null}

          {resume.education.length > 0 ? (
            <MainSection title="EDUCACIÓN">
              {resume.education.map((item) => (
                <View key={item.id} style={styles.entry} wrap={false}>
                  <Text style={styles.role}>{item.title}</Text>
                  <Text style={styles.company}>{item.institution}</Text>
                  <Text style={styles.dates}>
                    {item.inProgress ? 'en curso' : formatYearMonth(item.endDate)}
                  </Text>
                </View>
              ))}
            </MainSection>
          ) : null}
        </View>
      </Page>
    </Document>
  )
}
