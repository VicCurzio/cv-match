import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import type { Letter } from '@/domain/letter/letterModel'
import { letterDate } from '@/domain/letter/letterModel'
import type { Resume } from '@/domain/resume/resumeSchema'
import { PAGE, contactParts } from '@/templates/shared/format'

/**
 * The cover letter, matching the resume it travels with.
 *
 * Same page margins and same typeface as the chosen resume template, because
 * the two arrive in the same email and a mismatch reads as two documents pasted
 * together by different people.
 */

function makeStyles(serifHeadings: boolean) {
  return StyleSheet.create({
    page: {
      paddingTop: PAGE.margin,
      paddingBottom: PAGE.margin,
      paddingHorizontal: PAGE.margin,
      fontFamily: 'Helvetica',
      fontSize: 10.5,
      lineHeight: 1.55,
      color: PAGE.ink,
    },
    name: {
      fontFamily: serifHeadings ? 'Times-Bold' : 'Helvetica-Bold',
      fontSize: 15,
    },
    contact: { fontSize: 9, color: PAGE.inkSoft, marginTop: 2 },
    rule: {
      borderBottomWidth: 0.8,
      borderBottomColor: PAGE.rule,
      marginTop: 10,
      marginBottom: 18,
    },
    date: { fontSize: 9.5, color: PAGE.inkSoft, marginBottom: 18 },
    recipient: { fontFamily: 'Helvetica-Bold', fontSize: 10.5 },
    company: { fontSize: 10, color: PAGE.inkSoft, marginBottom: 16 },
    paragraph: { marginBottom: 11, textAlign: 'justify' },
    signOff: { marginTop: 16 },
    signature: { fontFamily: 'Helvetica-Bold', marginTop: 22 },
  })
}

interface Props {
  resume: Resume
  letter: Letter
  serifHeadings: boolean
  today?: Date
}

export function CoverLetter({ resume, letter, serifHeadings, today = new Date() }: Props) {
  const styles = makeStyles(serifHeadings)
  const contact = contactParts(resume)

  return (
    <Document
      title={`${resume.personal.fullName} - Carta de presentación`}
      author={resume.personal.fullName}
      language="es"
    >
      <Page size="A4" style={styles.page}>
        <View wrap={false}>
          <Text style={styles.name}>{resume.personal.fullName || 'Tu nombre'}</Text>
          {contact.length > 0 ? (
            <Text style={styles.contact}>{contact.join('  |  ')}</Text>
          ) : null}
          <View style={styles.rule} />
        </View>

        <Text style={styles.date}>{letterDate(letter.city, today)}</Text>

        <Text style={styles.recipient}>{letter.recipient}</Text>
        {letter.company ? <Text style={styles.company}>{letter.company}</Text> : null}

        <Text style={styles.paragraph}>{letter.opening}</Text>
        <Text style={styles.paragraph}>{letter.body}</Text>
        <Text style={styles.paragraph}>{letter.closing}</Text>

        <Text style={styles.signOff}>Saludos cordiales,</Text>
        <Text style={styles.signature}>{resume.personal.fullName}</Text>
      </Page>
    </Document>
  )
}
