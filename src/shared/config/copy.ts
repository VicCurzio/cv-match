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
    courses: 'Cursos y certificaciones',
    coursesHint:
      'Va aparte de Educación a propósito: mezclarlos hace ver el secundario como relleno y entierra la capacitación reciente, que suele ser lo que te diferencia.',
    skills: 'Habilidades',
    languages: 'Idiomas',
    preview: 'Vista previa',
    zoom: 'Ampliar',
    openPage: (page: number, total: number) =>
      total > 1 ? `Ver la página ${page} de ${total} en grande` : 'Ver el CV en grande',
    pageCount: (total: number) => (total === 1 ? '1 página' : `${total} páginas`),
    download: 'Descargar PDF',
    exportJson: 'Guardar copia (.json)',
    importJson: 'Cargar copia (.json)',
    building: 'Armando el PDF...',
    addExperience: 'Agregar puesto',
    addEducation: 'Agregar formación',
    addCourse: 'Agregar curso',
    addLanguage: 'Agregar idioma',
    languageAbilities: 'Qué hacés con soltura (opcional)',
    languageAbilitiesHint:
      'Un nivel solo promete las cuatro cosas. Si leés bien pero hablás poco, marcá lectura y comprensión: es más creíble y dice lo que sí sabés hacer.',
    languagePreview: 'En el CV sale:',
    remove: 'Quitar',
    currentJob: 'Trabajo acá actualmente',
    personalData: 'Datos personales (opcionales)',
    personalDataHint:
      'Ninguno hace falta para postularse. Cargalos solo si el aviso los pide; el panel de la derecha te dice qué conviene en cada mercado.',
    personalDataNotExported:
      'En este mercado estos datos no se exportan. Los dejamos acá para que puedas borrarlos si querés.',
  },

  notFound: {
    title: 'Esta página no existe',
    body: 'Puede que el link esté mal escrito. Tu CV sigue guardado en este navegador.',
    back: 'Ir al inicio',
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

  versions: {
    selectorLabel: 'Qué CV estás viendo',
    base: 'CV base',
    forCompany: (company: string) => `Para ${company}`,
    create: 'Nueva versión para un aviso',
    remove: 'Borrar esta versión',
    newTitle: 'Nueva versión para un aviso',
    newSubtitle:
      'Tu CV base no se toca. En la versión cambiás cómo lo contás para este puesto: titular, perfil, orden de habilidades y qué mostrar.',
    company: 'Empresa',
    role: 'Puesto',
    posting: 'Texto o link del aviso (opcional)',
    postingHint: 'Guardalo acá para tenerlo a mano mientras adaptás el CV.',
    createButton: 'Crear versión',
    cancel: 'Cancelar',
    removeTitle: 'Borrar la versión',
    removeBody: (company: string) =>
      `Se borra la versión para ${company}: el titular y el perfil que escribiste para ese aviso, el orden de las habilidades, lo que ocultaste y su carta de presentación. Tus experiencias, estudios y datos siguen en el CV base.`,
    removeConfirm: 'Borrar versión',
    rule:
      'Una versión cambia cómo contás tu CV, no lo que dice. Puestos, fechas, números y datos de contacto se editan en el CV base, y el cambio llega a todas las versiones.',
    postingSection: 'El aviso',
    changed: 'Cambiado en esta versión',
    backToBase: 'Volver al CV base',
    sameAsBase: 'Igual que el CV base',
    headline: 'Título',
    summary: 'Perfil profesional',
    skills: 'Habilidades',
    skillsHint: 'Ordenalas para que lo que pide el aviso aparezca primero. Destildá las que no suman acá.',
    moveUp: (skill: string) => `Subir ${skill}`,
    moveDown: (skill: string) => `Bajar ${skill}`,
    show: 'Mostrar en esta versión',
    facts: 'Lo que el CV cuenta',
    factsHint: 'Elegí qué mostrar en esta versión. Para cambiar un dato, editalo en el CV base.',
    editBase: 'Editar en el CV base',
    rewriteBullets: 'Reescribir para este aviso',
    bulletsLabel: 'Qué hiciste, contado para este aviso (una línea por punto)',
    bulletsHint:
      'Podés cambiar las palabras, el orden y sacar puntos. Los números tienen que ser los mismos del CV base.',
    bulletsBlocked: (added: string[]) =>
      `No se usa todavía: ${added.length === 1 ? `el ${added[0]} no está` : `${added.join(', ')} no están`} en el CV base, y una versión no puede cambiar números. Mientras tanto se exportan las viñetas del CV base.`,
    empty: 'No cargaste nada en esta sección del CV base.',
  },

  posting: {
    empty: 'Pegá el texto del aviso y te mostramos qué palabras pide que tu CV no menciona.',
    nothing: 'No encontramos palabras para comparar en este texto.',
    summary: (covered: number, total: number) =>
      `Tu CV ya menciona ${covered} de las ${total} palabras que usa el aviso.`,
    missing: 'El aviso nombra y tu CV no:',
    missingHint:
      'Sumalas solo si es verdad. Usá las palabras del aviso para contar lo que ya hiciste, en el perfil o el título de esta versión.',
    allCovered: 'Tu CV menciona todas las palabras que usa el aviso.',
    covered: 'Ya lo menciona:',
    limit:
      'Comparamos palabras, no significados: si el aviso dice una cosa con otra palabra, puede aparecer como faltante.',
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
