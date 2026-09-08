import type { Resume } from '@/domain/resume/resumeSchema'

/**
 * Fixtures for the rules engine.
 *
 * `administrativeAr` reproduces the SHAPE and the DEFECTS of the real resume
 * that started this project -- one dense summary paragraph, experience with no
 * numbers, bullets opening with "Encargada de", a photo, a document number.
 *
 * The contact details are invented. Real personal data does not go into a repo,
 * and the rules do not care whose phone number it is: they care about the shape.
 */
export const administrativeAr: Resume = {
  personal: {
    fullName: 'Ana Gómez Ruiz',
    headline: 'Gestión administrativa · Atención al cliente · Asesora comercial',
    email: 'anagomez1992@example.com',
    phone: '221 555-0100',
    city: 'La Plata',
    province: 'Buenos Aires',
    photo: 'data:image/jpeg;base64,PLACEHOLDER',
    documentId: '35.123.456',
    birthDate: '1992-04-11',
  },
  summary:
    'Profesional administrativa y comercial con amplia trayectoria en atención al cliente, gestión documental, seguimiento de cuentas, control financiero y ventas. Cuento con sólidas habilidades para la negociación, manejo de sistemas informáticos y resolución eficiente de situaciones complejas. Me destaco por mi proactividad, capacidad de organización, excelente orientación al cliente y rápida adaptación a nuevos entornos de trabajo, aportando siempre compromiso y responsabilidad en cada una de las tareas asignadas.',
  experience: [
    {
      id: 'exp-1',
      role: 'Administrativa comercial',
      company: 'Distribuidora del Este',
      location: 'La Plata',
      startDate: '2021-03',
      endDate: null,
      bullets: [
        'Encargada de la atención al cliente en mostrador y por teléfono.',
        'Responsable de la gestión documental y el archivo de expedientes.',
        'Tareas de facturación y seguimiento de cuentas corrientes.',
      ],
    },
    {
      id: 'exp-2',
      role: 'Asesora comercial',
      company: 'Casa Belgrano',
      location: 'La Plata',
      startDate: '2018-05',
      endDate: '2019-08',
      bullets: ['Encargada de la venta de productos del salón y la posventa.'],
    },
  ],
  education: [
    {
      id: 'edu-1',
      title: 'Bachiller con orientación en Economía y Administración',
      institution: 'Escuela Secundaria N.º 12',
      endDate: '2010-12',
      inProgress: false,
    },
  ],
  skills: ['Atención al cliente', 'Facturación'],
  languages: [{ id: 'lang-1', name: 'Español', level: 'Nativo' }],
}

/**
 * A resume that does not fit on one page.
 *
 * The case the templates used to lose: with the section marked `wrap={false}`
 * everything past the first page's bottom margin was simply not drawn, and
 * nothing in the suite rendered a document long enough to notice.
 */
export const longAr: Resume = {
  personal: {
    fullName: 'Ana Gómez Ruiz',
    headline: 'Analista administrativa contable',
    email: 'ana.gomez.ruiz@example.com',
    phone: '221 555-0100',
    city: 'La Plata',
    province: 'Buenos Aires',
  },
  summary: 'Analista administrativa con quince años en distribución mayorista y retail.',
  experience: Array.from({ length: 8 }, (_, job) => ({
    id: `exp-${job + 1}`,
    role: `Analista administrativa ${job + 1}`,
    company: `Distribuidora ${job + 1}`,
    startDate: `${2008 + job}-03`,
    endDate: `${2009 + job}-11`,
    bullets: Array.from(
      { length: 4 },
      (_, bullet) =>
        `Gestioné ${bullet + 1}0 cuentas corrientes del puesto ${job + 1} con cierre mensual sin diferencias.`,
    ),
  })),
  education: [
    {
      id: 'edu-1',
      title: 'Tecnicatura en Administración de Empresas',
      institution: 'Universidad Nacional de La Plata',
      endDate: '2019-12',
      inProgress: false,
    },
  ],
  skills: ['Excel avanzado', 'Tango Gestión', 'Cuentas corrientes'],
  languages: [{ id: 'lang-1', name: 'Español', level: 'Nativo' }],
}

/** A resume that should come out clean: no errors, few suggestions. */
export const cleanAr: Resume = {
  personal: {
    fullName: 'Ana Gómez Ruiz',
    headline: 'Analista administrativa contable',
    email: 'ana.gomez.ruiz@example.com',
    phone: '221 555-0100',
    city: 'La Plata',
    province: 'Buenos Aires',
    linkedin: 'linkedin.com/in/ana-gomez-ruiz',
  },
  summary:
    'Analista administrativa con 6 años en distribución mayorista.\n- Gestioné una cartera de 180 cuentas corrientes.\n- Reduje 30% la mora del canal minorista.',
  experience: [
    {
      id: 'exp-1',
      role: 'Analista administrativa',
      company: 'Distribuidora del Este',
      startDate: '2021-03',
      endDate: null,
      bullets: [
        'Gestioné una cartera de 180 cuentas corrientes con cierre mensual sin diferencias.',
        'Reduje 30% la mora del canal minorista en 8 meses.',
        'Implementé un tablero de seguimiento que recortó 4 horas semanales de carga manual.',
      ],
    },
  ],
  education: [
    {
      id: 'edu-1',
      title: 'Tecnicatura en Administración de Empresas',
      institution: 'Universidad Nacional de La Plata',
      endDate: '2019-12',
      inProgress: false,
    },
  ],
  skills: ['Excel avanzado', 'Tango Gestión', 'Cuentas corrientes', 'Conciliaciones'],
  languages: [
    { id: 'lang-1', name: 'Español', level: 'Nativo' },
    { id: 'lang-2', name: 'Inglés', level: 'Intermedio' },
  ],
}
