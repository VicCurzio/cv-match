# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).
Versionado según [SemVer](https://semver.org/lang/es/).

## [No publicado]

### Arreglado (tercera revisión)

- **Una fecha a medio escribir hacía perder el CV.** El formulario guardaba lo tipeado tal cual; con "2024-1" en una fecha y la pestaña cerrada, el documento guardado no pasaba la validación al volver, se apartaba como ilegible y la app arrancaba en blanco. Ahora las fechas se guardan recién cuando están completas, el campo dice "Todavía no se guarda: usá el formato 2021-03" y el CV conserva la última fecha buena. El test de punta a punta se escribió primero y falló antes del arreglo.
- **La carta decía "Actualmente me desempeño como..." sobre un trabajo terminado.** Tomaba el primer trabajo de la lista sin mirar la fecha de fin. Ahora elige el trabajo en curso más reciente, o si no hay, el último que terminó, y en ese caso dice "Mi último puesto fue...".
- **El aviso para recuperar un CV ilegible no se veía.** Con las rutas, sin CV legible la app queda en el inicio, y el aviso estaba solo en el editor. Ahora aparece en los dos.

### Cambiado: cargar una copia pregunta antes de reemplazar

- **"Cargar copia (.json)" ya no reemplaza en el acto.** Si hay algo escrito, pregunta y nombra los dos lados: qué tenés abierto y qué trae el archivo, con sus versiones. Ofrece bajar una copia de lo actual antes, o cargar sin copia, o cancelar.
- Distingue los dos casos: **una copia completa reemplaza todo**, versiones incluidas; **un CV suelto reemplaza solo los datos del CV base** y las versiones se mantienen encima.
- Con el CV vacío carga directo: no hay nada que perder.
- Tres escenarios de punta a punta nuevos (21 en total). Con la confirmación desactivada a propósito, fallan los dos que la cubren.

### Arreglado

- **En un celular de 360 px el editor se salía de la pantalla.** Los selectores nativos se ensanchan hasta su opción más larga ("Internacional (EEUU, Reino Unido, Canadá)") y la grilla del editor no dejaba achicarse a su contenido. En Windows entraba por pocos píxeles; en Linux, y en un Android con fuente más ancha, no. Lo encontró el test de celular en la primera corrida en CI. El test ahora usa 360 px y fuerza una fuente ancha, así falla igual en cualquier máquina; se probó que falla sin el arreglo.

### Agregado: tests de punta a punta

- **18 escenarios con Playwright**, en Chromium, contra el build de producción. Cubren inicio y botón Atrás, versiones (crear, recargar, borrar, id inexistente, nombre del PDF), la comparación con el aviso, las viñetas con números, el nivel de idioma, la vista previa dibujada bajo la política de seguridad, dos pestañas, empezar uno nuevo con copia, un CV guardado con el formato viejo y el ancho de un celular.
- **Se probó que muerden:** con el arreglo de las pestañas y el del CV vacío rotos a propósito, fallan justo los dos tests que los cubren.
- Corren en CI en cada push y el deploy no publica si fallan; ante un fallo, el trace queda como artefacto.

### Arreglado

- **La primera visita dejaba un "CV guardado" vacío.** El guardado automático corre desde el primer render, así que mirar el inicio y cerrar dejaba un documento vacío: la visita siguiente decía "Tenés un CV guardado · Sin nombre todavía" y "Empezar uno nuevo" pedía confirmar el reemplazo de nada. Apareció al diseñar cómo sembrar datos en los tests.

### Arreglado (segunda revisión, probado en el build de producción)

- **Dos pestañas abiertas se pisaban el CV.** Cada una guarda su copia sola, así que la que guardaba última borraba lo hecho en la otra, sin aviso. Ahora, si el CV cambia en otra pestaña, esta deja de guardar y pide recargar. Solo cuenta un cambio de contenido: abrir otra versión en la otra pestaña no dispara el aviso.
- **El ícono de la pestaña no aparecía en ninguna página interna.** El favicon se pedía con ruta relativa y en `/cv-match/editor` daba 404 — el mismo problema que ya se había arreglado para los scripts. `check:build` solo revisaba scripts y estilos; ahora revisa todo archivo propio referenciado, y su autoprueba usa justo el caso del favicon.
- Textos: la versión decía "titular" y el campo en pantalla se llama "Título".

### Agregado

- Metadatos para compartir el link (título, descripción y sitio al pegarlo en WhatsApp o LinkedIn) y un aviso para quien tenga JavaScript apagado.
- README al día: el peso real de la carga, la foto a 600x600, las limitaciones nuevas (un CV por navegador, la comparación compara palabras, los números en letras no se detectan) y los tests nuevos.

### Agregado: empezar un CV nuevo (probado en el build de producción)

- **Con un CV guardado, el inicio lo muestra arriba** — nombre y cuántas versiones tiene — con "Seguir con el CV guardado" como acción principal.
- **"Empezar uno nuevo" arranca de cero de verdad.** Antes, "Empezar" seguía con el mismo CV bajo las respuestas nuevas, así que no había forma de hacer el CV de otra persona en el mismo navegador sin borrar datos a mano.
- Como reemplaza lo guardado, **pregunta primero y ofrece bajar una copia**: "Bajar copia y empezar", "Empezar sin copia" o "Cancelar". La copia es el mismo `.json` que se vuelve a abrir con "Cargar copia".
- En la primera visita no pregunta nada: no hay nada que reemplazar.

### Arreglado (revisión general, probado en el build de producción)

- **"Empezar" le aplicaba las respuestas a una versión.** Con un CV guardado cuya última vista era una versión, el mercado y el filtro elegidos en el inicio cambiaban esa versión y dejaban el CV base como estaba. Ahora van al CV base.
- **Se podía descargar el PDF equivocado.** Justo después de cambiar de versión, el botón bajaba el PDF de la versión anterior con el nombre de la nueva. Queda deshabilitado mientras se arma el nuevo.
- **Los avisos quedaban colgados** entre pantallas: "Cambiamos a la plantilla Harvard" sobrevivía al botón Atrás. Ahora un aviso pertenece a la dirección donde apareció.
- **Cargar el mismo `.json` dos veces seguidas no hacía nada**, porque el selector de archivo no se reiniciaba.
- **Volver al inicio en la misma visita** no ofrecía "Seguir con el CV guardado" si el CV todavía no se había guardado nunca.
- El hook que abre el PDF salió del archivo de componentes: mezclados, rompían la recarga en caliente en desarrollo (aviso del linter).

### Cambiado

- **La pantalla de inicio carga 112 KB en vez de 567 KB** (comprimidos). El editor, que trae el generador de PDF, se descarga recién al entrar.
- `AGENTS.md`: la regla de capas dentro de `domain/` decía que las carpetas no se importan entre sí, y el código siempre tuvo a `domain/resume` como contrato de todas. Se corrigió el texto, no el código, y se sumó una sección de rutas y publicación.

### Agregado: rutas (probado en el build de producción)

- **Atrás y Adelante del navegador funcionan.** Antes la app era una sola dirección: Atrás sacaba del sitio y recargar volvía al inicio. Rutas: `/`, `/editor`, `/editor/versions/:versionId` y un 404 con vuelta al inicio. Atrás también cierra la vista ampliada del CV.
- La dirección de una versión usa su id aleatorio, nunca la empresa ni el puesto.
- Sin CV guardado, `/editor` lleva al inicio; una versión que no existe lleva al CV base.

### Arreglado

- **`base` de Vite pasa de `./` a `/cv-match/`.** Con rutas reales, la base relativa hacía que recargar en `/cv-match/editor` pidiera los scripts en `/cv-match/editor/assets/` y la página quedara en blanco. El build copia `index.html` a `404.html` para que GitHub Pages sirva la app en cualquier dirección, y `npm run check:build` lo verifica en el deploy. En desarrollo la app queda en `localhost:5173/cv-match/`.

### Cambiado: la vista previa es la hoja, no el visor del navegador

- **La vista previa dibuja las páginas del PDF directamente**, a lo ancho de la columna, sin la barra de herramientas ni la tira de miniaturas del visor del navegador. Un clic en la hoja la abre en grande. Se dibuja desde el mismo `Blob` que se descarga, así que lo que se ve sigue siendo exactamente el archivo que se manda.
- Nítida en pantallas de alta densidad (se dibuja con los píxeles reales de la pantalla, con un tope para no pedir un lienzo que el navegador rechace) y sin parpadeo al editar: la página nueva se dibuja fuera de pantalla y se copia de una vez.
- Si pdfjs no carga, vuelve el visor del navegador: la vista linda es una mejora, no el único camino.
- pdfjs se carga desde un solo lugar, compartido con el importador.

### Agregado: comparar el CV con el aviso (probado en el navegador)

- **La versión muestra qué palabras del aviso el CV no menciona**, y cuáles ya menciona. Se actualiza mientras se adapta el perfil o las viñetas. Es una lista para revisar, no un puntaje: un porcentaje invita a pegar palabras hasta que suba.
- Sin IA y determinístico. Descarta las secciones de logística del aviso (zonas, cómo postularse, horarios), el vocabulario que comparten todos los avisos, los links, los mails y el nombre de la empresa. Pliega plurales, género, infinitivos y pretéritos para que "atender" y "atendí" coincidan, y tiene una lista corta de equivalencias ("ATM" y "cajero").
- El límite está dicho en pantalla: compara palabras, no significados.

### Agregado: reescribir viñetas por versión (probado en el navegador)

- **Una versión puede contar las viñetas de un trabajo con otras palabras**, reordenarlas o sacar puntos. **No puede cambiar un número:** si la reescritura dice una cifra que el CV base no tiene, se guarda pero no se exporta, y el aviso nombra el número.
- El control corre en cada lectura, no solo al escribir. Si el CV base corrige una cifra, la reescritura con la cifra vieja deja de aplicarse y la corrección llega a la versión.

### Agregado: nivel de idioma calificado (probado en el navegador)

- **Se puede marcar qué se hace con soltura en un idioma**: lectura, comprensión oral, conversación, escritura. En el CV sale `Inglés (A2, lectura y comprensión oral)`. Un nivel solo promete las cuatro cosas; esto deja decir lo que sí se sabe hacer sin exagerar.
- El nivel sigue siendo texto libre, con sugerencias (Nativo, A1 a C2, Básico, Intermedio, Avanzado). Los idiomas guardados antes cargan igual.

### Cambiado

- Las actions de GitHub pasan a las versiones que corren en Node 24: `checkout@v7`, `setup-node@v7`, `configure-pages@v6`, `upload-pages-artifact@v5`, `deploy-pages@v5`. Las anteriores apuntaban a Node 20, deprecado.

### Agregado: versiones por postulación (probado en el navegador)

- **Un CV base y una versión por aviso.** La versión es una capa, no una copia: guarda solo lo que cambia de cómo se cuenta el CV (titular, perfil, orden y ocultamiento de habilidades, qué experiencias, estudios y cursos se muestran, mercado y plantilla) y lee los hechos del base. Un error corregido una vez queda corregido en todas las versiones.
- **La capa no tiene dónde guardar un hecho distinto.** Su esquema es estricto: un objeto con un puesto, una fecha o un dato de contacto se rechaza. Que adaptar no sea inventar lo hace cumplir el código, no una promesa.
- Lo que el base cambia por debajo se resuelve hacia mostrar de más, nunca hacia perder: un trabajo nuevo aparece en todas las versiones, una habilidad renombrada reaparece al final.
- **La carta de presentación se guarda con su versión.** Antes vivía solo en el estado del diálogo y se perdía al recargar.
- Los PDF de una versión llevan la empresa en el nombre: `Ana-Gomez-CV-Banco-Columbia.pdf`.

### Arreglado

- **Migración del documento guardado a la versión 2.** `schemaVersion` es un literal: subirlo sin migrar habría mandado el CV de todos los que ya usan la app a la copia de "no se pudo leer". Un documento v1 carga como CV base sin versiones, y el test que lo cubre se probó sacando la migración: falla.
- Importar un `.json` exportado se quedaba solo con el CV y habría descartado las versiones sin avisar.

### Agregado (probado en el navegador)

- **Content-Security-Policy** en el sitio construido, como `meta` (GitHub Pages sirve archivos estáticos y no pone encabezados). `connect-src 'self'` convierte la promesa del producto —que el CV no sale de la máquina— en algo que hace cumplir el navegador y no la buena fe del código: ni un script inyectado ni una dependencia que decida llamar a casa pueden alcanzar otro origen. Se inyecta solo en el build; en desarrollo la misma política bloquearía el websocket de Vite.

### Arreglado (probado en el navegador)

- **Las habilidades de la plantilla Harvard volvían del importador como una sola.** Se dibujan una al lado de la otra, y en un PDF una fila no tiene idea de columnas: `Excel avanzado`, `Tango Gestión` y `Cuentas corrientes` llegan como tres fragmentos cuya única diferencia con tres palabras sueltas es la distancia entre ellos. El extractor ahora usa esa distancia: un hueco horizontal ancho se convierte en un separador visible. También sirve para el CV a dos columnas, y para el título de un puesto cuya fecha está dibujada contra el margen opuesto.
- El separador que escribe el extractor se quedaba pegado al final del título de un estudio (`Tecnicatura en Administración de Empresas · ·`).

### Arreglado (segunda pasada del repaso)

- **Un puesto cuyo título termina justo antes de las fechas no se importaba.** El patrón de fechas aceptaba "cualquier palabra seguida de un año" como nombre de mes, así que `Encargada de depósito 2018 - actualidad` matcheaba con "depósito" de mes, `parseMonth` devolvía null y el ancla se descartaba: el puesto entero —título, fechas y viñetas— desaparecía del import. Es la forma en que la mayoría de los CV escribe las fechas. Ahora los meses se nombran explícitamente, "setiembre" incluido.
- La misma causa se comía la última palabra de un título de estudio: `Bachiller en Economía 2010` volvía como "Bachiller en".
- **La educación del propio PDF de la app volvía partida en dos.** El título y su fecha se dibujan como dos pedazos de una misma fila visual, y el parser solo miraba hacia arriba buscando la institución. Lo encontró el test de ida y vuelta nuevo.
- El bloque de datos personales del formulario volvía a tener la lista de campos escrita a mano —el mismo defecto que se acababa de arreglar en el aviso de mercado—. Ahora es un `Record` sobre la unión de campos: agregar uno a `RESTRICTABLE_FIELDS` no compila hasta que el formulario lo tenga.
- La copia de rescate de un documento ilegible quedaba inalcanzable después de recargar: se ofrecía una sola vez y después seguía ocupando lugar sin que nadie pudiera bajarla.
- Hacer clic al costado de un diálogo lo cerraba, y con la carta de presentación eso tiraba el párrafo escrito. Se cierra con Escape, con la X y con "Cerrar", que son las tres maneras deliberadas.
- Al abrir un diálogo el foco caía en el botón de cerrar, así que el primer Enter cerraba lo recién abierto.

### Accesibilidad

- **"Subir foto" y la zona de importar no se podían usar con el teclado.** Las dos eran un `input` con `display:none` y un cartel estilado al lado: un input así no recibe foco, o sea que los dos controles existían solo para el mouse. Ahora el input es `sr-only` y el contenedor muestra el foco.
- Los avisos que aparecen como reacción a algo (guardado fallido, cambio de mercado, foto bloqueada, error al importar) son regiones vivas: antes el texto aparecía en pantalla y un lector de pantalla no decía nada.
- El anillo de foco de esos controles usa el color de fondo del tema, para no dibujar un halo blanco en modo oscuro.

### Seguridad

- **La foto se valida por forma, no solo por tipo.** Es el único valor del CV que va directo a un `<img src>` y al renderizador de PDF, y puede llegar dentro de un `.json` que esta app no escribió. Solo pasa un data URL de imagen real (`jpeg`, `png` o `webp` en base64).
- `npm audit`: cero vulnerabilidades, con y sin dependencias de desarrollo. Sin `fetch`, sin `innerHTML`, sin `eval`, sin cookies y sin ningún `href` armado con datos de la persona.

### Agregado (segunda pasada)

- **Test de ida y vuelta**: se genera el PDF de un CV y se lo vuelve a importar, comprobando que la app puede leer su propia salida. Los demás tests del importador le dan texto escrito a mano, que es texto con la forma que imaginó quien escribió el test.
- Tests del rastreo vertical del lector de PDF, contra un documento armado a mano cuya respuesta se conoce por construcción.
- La lógica de la trampa de foco salió a `shared/utils/focusTrap.ts` como función pura, con tests. Es la parte que no se puede verificar leyendo, igual que el recorte de la foto.

### Arreglado (repaso de código)

- **Un CV largo se dibujaba fuera de la hoja.** Las dos plantillas marcaban cada sección con `wrap={false}`, que no significa "mantener junto" sino "no se puede partir nunca": con veinte puestos, react-pdf apilaba 226 líneas encima de una sola carilla en Harvard, y en Moderna directamente rompía el cálculo (una línea posicionada en menos diecinueve millones). Ahora una sección se puede partir y una entrada no, y `minPresenceAhead` evita el título huérfano al pie de página.
- **Un CV guardado que no se podía leer se perdía en silencio.** El navegador entregaba un documento inválido, la app arrancaba en blanco y el autoguardado lo pisaba medio segundo después. Ahora `loadDocument()` distingue "no hay nada" de "hay algo ilegible", el texto original se aparta bajo otra clave y el editor ofrece bajarlo antes de seguir.
- **El importador tomaba un rango de fechas como teléfono**: `Administrativa 2018 2021` devolvía "2018 2021" como número de contacto. Ahora prefiere la línea que dice ser un teléfono y descarta los pares de años.
- **El importador no reconocía un nombre en mayúsculas**, que es la forma más común en que se abre un CV. También entiende las partículas ("Ana de la Torre") y ya no confunde "CURRICULUM VITAE" con un nombre.
- **La educación importada colapsaba en una sola entrada**, con la primera línea de título y todo lo demás pegado como institución. Ahora se parsea igual que la experiencia, anclando en los años.
- **El aviso al cambiar de mercado listaba tres campos escritos a mano** e ignoraba el estado civil y la nacionalidad. Ahora lee el perfil y los nombra a todos.
- **El estado civil y la nacionalidad no tenían campo en el formulario**: estaban en el esquema, en los perfiles y en las reglas, pero no había forma de cargarlos ni de borrarlos. El bloque de datos personales ahora aparece también cuando el mercado los prohíbe y hay algo cargado.
- **Los tres diálogos no se cerraban con Escape**, no contenían el foco ni lo devolvían al cerrarse: se podía tabular por el editor de atrás. Ahora comparten `shared/ui/Dialog`.
- La vista previa serializaba la foto entera (unos 30 KB en base64) en cada tecla apretada, solo para comparar si algo cambió.
- Vitest solo incluía `*.test.ts`: un test de componente se habría escrito y nunca corrido.

### Agregado (repaso de código)

- El lector de PDF de los tests ahora mide **dónde** cae cada línea, no solo qué dice. Estar en el archivo y estar en la hoja son cosas distintas, y la primera versión del test del CV largo pasaba sobre la plantilla rota.
- `domain/ingest/parseEducation.ts`, con sus tests.
- `shared/ui/Dialog`, el shell de los modales: Escape, foco atrapado y foco devuelto, una vez y para los tres.

### Agregado

- **Encuadre de la foto**: arrastrar para mover y una barra para acercar, en vez del cuadrado centrado automático. La matemática del recorte vive como función pura en `domain/photo/cropRect.ts`.
- **Carta de presentación** en PDF, con la misma tipografía y márgenes que el CV. La estructura y los datos del CV se completan solos; el párrafo del medio lo escribe la persona, y sin él no se puede descargar.
- **Error boundary de raíz**, que ante una excepción ofrece bajar una copia del CV antes de recargar.
- Hook de pre-commit (husky + lint-staged) y verificación en CI.
- Despliegue automático a GitHub Pages.

### Arreglado

- El lector de PDF cortaba los streams mal: buscaba `endstream` y recortaba los saltos de línea finales, pero los datos comprimidos pueden terminar legítimamente en `0x0A` o `0x0D`. Ahora usa el `/Length` declarado. El síntoma era la vista previa entera caída con "No se pudo armar el PDF", y solo en los documentos que caían justo en ese caso.
- Medir el PDF es un extra: si falla, ya no se lleva puesta la vista previa.

### Agregado antes

- Importar un CV existente en `.pdf` o `.docx`, leído enteramente en el navegador. El formato se detecta por contenido y no por extensión; el `.doc` anterior a 2007 y los CV escaneados se rechazan con una salida concreta. Lo extraído se muestra para revisar antes de aplicarse, y lo que no se pudo ubicar se lista en vez de descartarse.
- Lector de texto de PDF para los tests (`src/test/pdfText.ts`), que verifica sobre el archivo generado —y no sobre el código que lo genera— que hay texto seleccionable, que no se corta ninguna palabra y que la foto no llega a donde no debe.

### Arreglado

- El PDF ya no parte palabras con guión entre líneas. react-pdf hifenaba con un diccionario en inglés y cortaba las direcciones de correo al medio.

### Agregado (versión inicial)

- Pantalla de inicio con las dos preguntas que definen el CV: mercado de destino y si tiene que pasar un filtro automático.
- Perfil de mercado (Argentina e internacional) como dato, con tres políticas por campo: permitido, desaconsejado y prohibido.
- Filtrado centralizado de campos prohibidos en `applyProfile()`. El dato del usuario no se borra, queda fuera de esa exportación.
- Dos plantillas de CV dibujadas con `@react-pdf/renderer`: Harvard (una columna, sin foto ni iconos) y Moderna (dos columnas, acento de color, foto opcional).
- Vista previa en vivo y descarga del PDF compartiendo el mismo `Blob`.
- Editor por secciones: datos, perfil, experiencia, educación, habilidades e idiomas.
- Foto de perfil con compresión a 400x400 JPEG antes de guardarla, y bloqueo explicado según mercado y modo.
- Motor de reglas puro con diagnóstico por contenido, contacto, mercado y modo ATS. Cada hallazgo trae severidad, problema y acción.
- Guardado automático en el navegador, y exportar e importar el CV como `.json` validado con zod.
- Verificación de la regla de capas con autoverificación (`scripts/check-layers.mjs`).
- Tests del núcleo con Vitest: motor de reglas contra fixtures, cruce de mercados, validación del `.json` y un control que se verifica a sí mismo.
