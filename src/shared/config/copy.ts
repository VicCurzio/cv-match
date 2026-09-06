/**
 * Every string the user reads lives here, from the first commit.
 *
 * Pulling texts out of components later means touching every screen, and this
 * project has translation on the roadmap (feature 0009), so it would have to
 * happen anyway.
 */
export const copy = {
  appName: 'CV Match',
  tagline: 'Matcheá tu CV con el puesto, el mercado y quien lo va a leer.',

  start: {
    title: 'Armemos tu CV',
    subtitle: 'Dos preguntas antes de empezar. Podés cambiarlas cuando quieras.',
    marketQuestion: '¿A dónde vas a mandar el CV?',
    atsQuestion: '¿Tiene que pasar un filtro automático?',
    atsExplainer:
      'Muchas empresas grandes usan un programa que lee los CV y descarta antes de que los vea una persona. Ese programa no entiende columnas, iconos ni texto adentro de imágenes.',
    atsYes: 'Sí, va por un formulario web',
    atsYesHint: 'Empresas grandes, multinacionales, tecnología. Usa la plantilla Harvard.',
    atsNo: 'No, lo manda por mail o lo entrega en mano',
    atsNoHint: 'PyMEs, comercios, contactos directos. Podés usar una plantilla con diseño.',
    begin: 'Empezar',
    resume: 'Seguir con el CV guardado',
  },

  editor: {
    personal: 'Tus datos',
    summary: 'Perfil profesional',
    summaryHint: 'Tres o cuatro líneas: qué hacés, cuánta experiencia tenés y qué buscás.',
    experience: 'Experiencia laboral',
    education: 'Educación',
    skills: 'Habilidades',
    languages: 'Idiomas',
    preview: 'Vista previa',
    download: 'Descargar PDF',
    exportJson: 'Guardar copia (.json)',
    importJson: 'Cargar copia (.json)',
    building: 'Armando el PDF...',
    addExperience: 'Agregar puesto',
    addEducation: 'Agregar formación',
    addLanguage: 'Agregar idioma',
    remove: 'Quitar',
    currentJob: 'Trabajo acá actualmente',
  },

  review: {
    title: 'Qué revisar',
    empty: 'No encontramos nada para corregir. El CV está listo para mandar.',
    emptyErrors: 'No hay errores. Lo que queda abajo son mejoras opcionales.',
    counts: (errors: number, warnings: number, suggestions: number) =>
      `${errors} ${errors === 1 ? 'error' : 'errores'} · ${warnings} ${warnings === 1 ? 'advertencia' : 'advertencias'} · ${suggestions} ${suggestions === 1 ? 'sugerencia' : 'sugerencias'}`,
  },

  photo: {
    label: 'Foto',
    add: 'Subir foto',
    remove: 'Quitar foto',
    blockedByMarket: 'En este mercado el CV va sin foto, así que la carga está deshabilitada.',
    blockedByAts:
      'Con el filtro automático prendido la foto no se exporta: ningún lector la procesa.',
    keptNotExported:
      'Tu foto sigue guardada. Simplemente no entra en esta versión del CV; si volvés a Argentina, vuelve.',
  },
} as const
