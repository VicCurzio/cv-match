import type { Resume } from '@/domain/resume/resumeSchema'

/**
 * A real posting, copied as it was published: a bank hiring temporary branch
 * staff to walk customers through its app and ATMs. Public text, no personal
 * data. Its shape is the useful part -- bullets, a "Perfil buscado:" block, a
 * list of zones and an application block -- because that is how most local
 * postings are written.
 */
export const bankPosting = `Tareas principales:

• Acompañar a los clientes en el uso de la App Columbia Banco Móvil.
• Asistirlos en el uso de ATM.
• Ayudar a los clientes a conocer nuevas formas de operar de manera simple, ágil y digital.

Perfil buscado:

• Estudiantes universitarios de carreras afines al negocio bancario.
• Personas con ganas de aprender e interactuar con clientes.
• Interés en desarrollar experiencia dentro del sector bancario.

Zonas disponibles:

• Berazategui.
• Don Torcuato.
• Escobar.
• Laferrere.
• Merlo.
• Zárate.
• Luján.

La posición requiere disponibilidad para rotar por sucursales cercanas a la zona elegida.

Postulación:
Enviar CV a: empleos@bancocolumbia.com.ar
Asunto: Of. atención temporal + zona a la que te postulás`

/** Branch banking experience, before being adapted to that posting. Anonymized. */
export const branchResume: Resume = {
  personal: {
    fullName: 'Laura Pérez',
    headline: 'Administrativa · Atención al cliente',
    email: 'laura.perez@example.com',
    phone: '221 555-0199',
    city: 'La Plata',
    province: 'Buenos Aires',
  },
  summary: 'Administrativa con experiencia en atención al cliente y gestión de cuentas.',
  experience: [
    {
      id: 'exp-bank',
      role: 'Auxiliar administrativa',
      company: 'Banco Cooperativo',
      startDate: '2025-02',
      endDate: '2025-11',
      bullets: [
        'Atendí entre 20 y 40 clientes por día en sucursal.',
        'Operé caja y gestioné apertura de cuentas y plazos fijos.',
      ],
    },
  ],
  education: [
    {
      id: 'edu-1',
      title: 'Tecnicatura en Turismo',
      institution: 'Universidad de Belgrano',
      inProgress: true,
    },
  ],
  courses: [],
  skills: ['Excel', 'Atención al cliente'],
  languages: [{ id: 'lang-1', name: 'Español', level: 'Nativo' }],
}
