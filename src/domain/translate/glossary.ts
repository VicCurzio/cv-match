import { stripAccents } from '@/shared/utils/text'

/**
 * What a general translator gets wrong on a resume, fixed by hand.
 *
 * A machine translator turns "Auxiliar administrativa" into "Administrative
 * Auxiliary", a title no one in an English-speaking job market uses. A job title
 * is not translated, it is MAPPED to the equivalent that exists there -- and
 * that takes a list someone wrote, not a better model. Anything not on these
 * lists goes to the translator and is marked for review.
 *
 * Keys are compared without accents, case or extra spaces.
 */

export function glossaryKey(text: string): string {
  return stripAccents(text.toLowerCase()).replace(/\s+/g, ' ').trim()
}

function table(entries: [string[], string][]): Map<string, string> {
  const map = new Map<string, string>()
  for (const [spanish, english] of entries) for (const term of spanish) map.set(glossaryKey(term), english)
  return map
}

/** Job titles, both genders, as Argentine resumes write them. */
export const JOB_TITLES = table([
  [['administrativa', 'administrativo'], 'Administrative Assistant'],
  [['auxiliar administrativa', 'auxiliar administrativo', 'asistente administrativa', 'asistente administrativo'], 'Administrative Assistant'],
  [['administrativa comercial', 'administrativo comercial'], 'Sales Administrative Assistant'],
  [['analista administrativa', 'analista administrativo'], 'Administrative Analyst'],
  [['analista administrativa contable', 'analista administrativo contable', 'analista contable'], 'Accounting Analyst'],
  [['asesora comercial', 'asesor comercial'], 'Sales Advisor'],
  [['asesora comercial y administrativa', 'asesor comercial y administrativo'], 'Sales and Administrative Advisor'],
  [['vendedora', 'vendedor'], 'Sales Associate'],
  [['cajera', 'cajero'], 'Cashier'],
  [['recepcionista'], 'Receptionist'],
  [['secretaria', 'secretario'], 'Secretary'],
  [['encargada', 'encargado'], 'Supervisor'],
  [['encargada de atencion al cliente', 'encargado de atencion al cliente'], 'Customer Service Lead'],
  [['atencion al cliente', 'representante de atencion al cliente'], 'Customer Service Representative'],
  [['operadora de call center', 'operador de call center', 'operadora telefonica', 'operador telefonico'], 'Call Center Agent'],
  [['repositora', 'repositor'], 'Stock Clerk'],
  [['cadete'], 'Courier'],
  [['contadora', 'contador', 'contadora publica', 'contador publico'], 'Accountant'],
  [['tesorera', 'tesorero'], 'Treasurer'],
  [['oficial de atencion', 'oficial de atencion al cliente'], 'Customer Service Officer'],
  [['oficial de atencion temporal'], 'Temporary Customer Service Officer'],
  [['oficial de cuentas'], 'Account Officer'],
  [['gerente', 'gerenta'], 'Manager'],
  [['jefa de ventas', 'jefe de ventas'], 'Sales Manager'],
  [['desarrolladora', 'desarrollador'], 'Developer'],
  [['docente', 'profesora', 'profesor'], 'Teacher'],
  [['enfermera', 'enfermero'], 'Nurse'],
  [['moza', 'mozo'], 'Server'],
  [['empleada de comercio', 'empleado de comercio'], 'Retail Associate'],
])

/** Skills a translator renders literally but a recruiter would not write that way. */
export const SKILLS = table([
  [['atencion al cliente'], 'Customer service'],
  [['asesoramiento comercial'], 'Sales advisory'],
  [['negociacion'], 'Negotiation'],
  [['gestion de cobranzas', 'cobranzas'], 'Collections management'],
  [['liquidacion de sueldos'], 'Payroll processing'],
  [['gestion de proveedores'], 'Supplier management'],
  [['armado de legajos'], 'Client file management'],
  [['facturacion'], 'Invoicing'],
  [['cuentas corrientes'], 'Accounts receivable'],
  [['conciliaciones', 'conciliaciones bancarias'], 'Bank reconciliations'],
  [['trabajo en equipo'], 'Teamwork'],
  [['manejo de caja'], 'Cash handling'],
  [['ventas'], 'Sales'],
  [['administracion'], 'Administration'],
  [['organizacion'], 'Organization'],
  [['comunicacion'], 'Communication'],
  [['resolucion de problemas'], 'Problem solving'],
])

export const LANGUAGE_NAMES = table([
  [['espanol', 'castellano'], 'Spanish'],
  [['ingles'], 'English'],
  [['portugues'], 'Portuguese'],
  [['frances'], 'French'],
  [['italiano'], 'Italian'],
  [['aleman'], 'German'],
  [['chino', 'mandarin'], 'Chinese'],
  [['japones'], 'Japanese'],
  [['guarani'], 'Guarani'],
])

export const LANGUAGE_LEVELS = table([
  [['nativo', 'nativa', 'lengua materna'], 'Native'],
  [['bilingue'], 'Bilingual'],
  [['basico', 'basica', 'elemental'], 'Basic'],
  [['intermedio', 'intermedia'], 'Intermediate'],
  [['avanzado', 'avanzada'], 'Advanced'],
  [['fluido', 'fluida'], 'Fluent'],
])

/**
 * Product and system names that must come out exactly as they went in. A
 * translator will happily render "Veraz" as "Truthful".
 */
export const PROTECTED_TOOLS = [
  'Tango Gestión',
  'Google Sheets',
  'Mercado Pago',
  'PowerPoint',
  'Salesforce',
  'Bejerman',
  'WhatsApp',
  'Outlook',
  'Excel',
  'Word',
  'SAP',
  'Tango',
  'Veraz',
  'Nosis',
  'Celer',
  'Tecnom',
  'AFIP',
]

/** "56,5 horas" -> "56.5 hours": the one course detail common enough to map. */
export function hoursDetail(text: string): string | null {
  const match = /^\s*(\d+(?:[.,]\d+)?)\s*(horas?|hs\.?)\s*$/i.exec(text)
  if (!match?.[1]) return null
  const amount = match[1].replace(',', '.')
  return `${amount} ${amount === '1' ? 'hour' : 'hours'}`
}

/** A European level on its own: A1 to C2. */
export const CEFR = /^[ABC][12]$/
