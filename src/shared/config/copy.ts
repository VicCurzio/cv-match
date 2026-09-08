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
    personalData: 'Datos personales (opcionales)',
    personalDataHint:
      'Ninguno hace falta para postularse. Cargalos solo si el aviso los pide; el panel de la derecha te dice qué conviene en cada mercado.',
    personalDataNotExported:
      'En este mercado estos datos no se exportan. Los dejamos acá para que puedas borrarlos si querés.',
  },

  recovery: {
    unreadable:
      'Había un CV guardado en este navegador y no lo pudimos leer, así que la app arrancó en blanco. Bajate el archivo antes de seguir editando: es la única copia que queda.',
    download: 'Bajar el archivo',
    dismiss: 'Descartarlo',
    fileName: 'cv-match-ilegible.json',
  },

  review: {
    title: 'Qué revisar',
    empty: 'No encontramos nada para corregir. El CV está listo para mandar.',
    emptyErrors: 'No hay errores. Lo que queda abajo son mejoras opcionales.',
    counts: (errors: number, warnings: number, suggestions: number) =>
      `${errors} ${errors === 1 ? 'error' : 'errores'} · ${warnings} ${warnings === 1 ? 'advertencia' : 'advertencias'} · ${suggestions} ${suggestions === 1 ? 'sugerencia' : 'sugerencias'}`,
  },

  letter: {
    open: 'Carta de presentación',
    title: 'Carta de presentación',
    subtitle: 'La estructura y tus datos los ponemos nosotros. El párrafo del medio lo escribís vos.',
    autoLabel: 'Apertura (se arma sola con tus datos)',
    closingLabel: 'Cierre',
    bodyHint:
      'Por qué querés ESTE puesto en ESTA empresa, y qué de lo que hiciste le sirve. Dos o tres oraciones.',
    unwritten: 'Falta el párrafo del medio. Es el único que no podemos escribir por vos, y es el que se lee.',
    download: 'Descargar carta',
    building: 'Armando la carta...',
    noModel:
      'No usamos inteligencia artificial para escribir por vos. Una carta que suena bien pero no la escribiste se nota en la entrevista.',
  },

  import: {
    open: 'Importar CV existente',
    title: 'Importar tu CV actual',
    subtitle: 'Leemos el archivo acá, en tu navegador. No se sube a ningún lado.',
    pick: 'Elegí tu CV',
    formats: 'Formatos: .pdf y .docx',
    reading: 'Leyendo el archivo...',
    reviewHint:
      'Esto es lo que pudimos leer. Un CV no guarda su estructura por dentro, así que revisá antes de aplicar: destildá lo que esté mal y después corregí lo que haga falta en el formulario.',
    notFound: 'no lo encontramos',
    leftovers: 'Esto no supimos dónde ponerlo. Copialo a mano donde corresponda:',
    apply: 'Aplicar al CV',
    another: 'Probar con otro archivo',
    tryAnother: 'Elegir otro archivo',
    byHand: 'Cargar a mano',
  },

  photo: {
    label: 'Foto',
    add: 'Subir foto',
    remove: 'Quitar foto',
    frameTitle: 'Encuadrá tu foto',
    frameHint: 'Arrastrá para mover y usá la barra para acercar.',
    frameNote:
      'Buscá que la cara ocupe buena parte del círculo y quede un poco de aire arriba de la cabeza.',
    zoom: 'Acercar',
    use: 'Usar esta foto',
    saving: 'Guardando...',
    blockedByMarket: 'En este mercado el CV va sin foto, así que la carga está deshabilitada.',
    blockedByAts:
      'Con el filtro automático prendido la foto no se exporta: ningún lector la procesa.',
    keptNotExported:
      'Tu foto sigue guardada. Simplemente no entra en esta versión del CV; si volvés a Argentina, vuelve.',
  },
} as const
