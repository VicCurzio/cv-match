# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).
Versionado según [SemVer](https://semver.org/lang/es/).

## [No publicado]

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
