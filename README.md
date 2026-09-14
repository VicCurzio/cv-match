# CV Match

Herramienta web para armar, adaptar y descargar un CV. El CV se adapta al mercado al que se manda y a quién lo va a leer: una persona o un filtro automático.

**En vivo: https://viccurzio.github.io/cv-match/**

Todo corre en el navegador. No hay backend, no hay cuentas y el CV no se sube a ningún lado.

## Qué resuelve

La mayoría no sabe maquetar un CV, ni qué sacarle, ni que el CV que sirve en Argentina no es el que sirve afuera. CV Match hace seis cosas:

1. **Lo maqueta.** Dos plantillas, cada una con un propósito declarado.
2. **Lo adapta al mercado.** En Argentina la foto se usa; en Estados Unidos, Reino Unido y Canadá hay reclutadores que descartan los CV con foto para no exponerse a una acusación de discriminación. La app lo sabe y filtra en consecuencia.
3. **Lo diagnostica.** Un motor de reglas señala qué está flojo y **qué hacer** al respecto.
4. **Guarda varios CV a la vez.** El tuyo y el de un familiar, cada uno con sus versiones y sus cartas, en el mismo navegador.
5. **Lo adapta a cada aviso.** Una versión por postulación cambia el titular, el perfil, el orden de las habilidades y qué se muestra, sin tocar los hechos: puestos, fechas y números viven una sola vez en el CV base, así que lo que se corrige ahí llega a todas las versiones. Cada versión muestra qué palabras del aviso el CV todavía no menciona, como lista para revisar y no como puntaje.
6. **Lo pasa al inglés.** Con el traductor que trae el navegador, en la misma computadora. El resultado es un borrador para revisar campo por campo, con el español al lado; las fechas, empresas y datos de contacto no se traducen: salen del CV en español.

## Requisitos

- Node.js 20 o superior.
- Nada más. No hay base de datos, servicios externos ni variables de entorno.

## Levantarlo

```bash
npm install
npm run dev
```

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo, en `http://localhost:5173/cv-match/` |
| `npm run test:e2e` | Tests de punta a punta con Playwright, contra el build de producción |
| `npm run check:build` | Verifica el build antes de publicar: `404.html` presente y rutas de los archivos bajo `/cv-match/` |
| `npm run build` | Build de producción a `dist/` |
| `npm test` | Tests del núcleo (Vitest) |
| `npm run typecheck` | `tsc -b` |
| `npm run check:layers` | Verifica la regla de capas, y se autoverifica primero |
| `npm run lint` | oxlint + typecheck + capas |
| `npm run verify` | Todo lo anterior más los tests |

## Verificación

Tres capas, y las tres hacen falta:

- **`npm run verify`** a mano, cuando querés saber si algo se rompió.
- **Hook de pre-commit** (husky + lint-staged): corre linter, tipos y la regla de capas antes de cada commit. Es feedback rápido, no una garantía — se saltea con `--no-verify`.
- **CI** (`.github/workflows/verify.yml`): corre `npm run verify` en cada push y cada pull request. Esa es la que no se puede saltear.

## Cómo se despliega

Sitio estático, publicado en GitHub Pages por `.github/workflows/deploy.yml` en cada push a `main`. El workflow corre `npm run verify` antes de construir, así que no se publica nada que no pasaría un commit local, y `npm run check:build` después, que frena la publicación si falta el `404.html` o las rutas de los archivos no están bajo `/cv-match/`: las dos cosas solo se rompen en Pages.

Para conectarlo la primera vez: creá el repositorio en GitHub, agregalo como remoto, `git push -u origin main`, y en Settings → Pages elegí **GitHub Actions** como origen. Hasta que ese último paso esté hecho, el workflow de deploy falla con `Get Pages site failed`.

`base` es `/cv-match/`, absoluta a propósito: con `./`, recargar en una dirección interna como `/cv-match/editor` pide los scripts en una carpeta que no existe y la página queda en blanco. El build copia `index.html` a `404.html`, que es lo que deja a Pages servir la app en cualquier dirección.

## Privacidad, y cómo se hace cumplir

La regla central del proyecto es que **el CV nunca sale de la máquina**. No hay servidor al que mandarlo, no hay analítica y no hay una sola llamada de red en el código.

Eso último es una propiedad del código de hoy, así que además hay una **Content-Security-Policy** que la convierte en una regla que aplica el navegador: con `connect-src 'self'`, ni un script inyectado ni una dependencia que decida llamar a casa pueden alcanzar otro origen.

Va como `meta` porque GitHub Pages sirve archivos estáticos y no pone encabezados, y se inyecta **solo en el build** (`contentSecurityPolicy()` en `vite.config.ts`): en desarrollo la misma política bloquearía el websocket de Vite.

Si tocás esa política, **probala sobre el sitio construido**, no sobre el servidor de desarrollo. Cada directiva de ahí está porque algo la necesita, y una de más rompe únicamente en producción:

| Directiva | Por qué |
|---|---|
| `'wasm-unsafe-eval'` | `@react-pdf/renderer` compila un módulo WebAssembly para maquetar el texto. Sin esto el PDF no se arma. Permite WebAssembly y nada más: `eval` y `new Function` siguen bloqueados |
| `frame-src blob:` | Respaldo: si pdfjs no carga, la vista previa cae al visor del navegador sobre el PDF como blob URL |
| `worker-src blob:` | pdfjs cae a un worker de tipo blob |
| `img-src data:` | La foto de perfil se guarda como data URL |
| `style-src 'unsafe-inline'` | React escribe atributos `style` |

**La traducción tampoco sale de la máquina.** Usa el traductor integrado de Chrome y Edge de escritorio (la API `Translator`), que corre en el dispositivo: el navegador baja el modelo de idioma una vez, por su cuenta, y el texto del CV se traduce localmente. La app no hace ninguna llamada de red para eso y la política de seguridad no cambió. No hay clave, cuenta ni servicio externo.

El otro punto donde entra dato ajeno es el `.json` importado: se valida entero con zod antes de tocar el estado, y la foto se valida **por forma** además de por tipo, porque es el único valor que va directo a un `<img src>` y al renderizador de PDF.

## Accesibilidad

- Todos los diálogos comparten `shared/ui/Dialog`: cierran con Escape, contienen el foco mientras están abiertos y lo devuelven al botón que los abrió. La vista ampliada del CV además se cierra con el botón Atrás.
- Los controles de archivo usan un `input` `sr-only` o un botón que abre el selector, nunca un `input` con `display: none` estilado al lado: ese no recibe foco, así que el control existe para el mouse y no para el teclado.
- Los avisos que aparecen en reacción a algo son regiones vivas (`role="status"`).
- La severidad de un hallazgo nunca se comunica solo con color: cada uno lleva ícono y etiqueta escrita.
- `prefers-reduced-motion` apaga las transiciones, y hay un `:focus-visible` global.

## Arquitectura, en corto

Corte primario por dominio de negocio. La regla de dependencia va en un solo sentido:

```
screens  ->  templates  ->  domain  ->  shared  ->  assets
screens  ---------------->  domain
```

```
src/
  screens/     una carpeta por pantalla
  domain/      resume · market · analysis · posting · photo · letter · translate · export · ingest · generate
  templates/   harvard/ y modern/, dibujadas con react-pdf
  shared/      ui · utils · config
```

`scripts/check-layers.mjs` la verifica en cada `npm run lint`. Está escrito a mano a propósito: un linter de capas genérico necesita un resolver de módulos, y un import que el resolver no entiende desaparece de la verificación **en silencio** — la corrida sale en verde sin haber revisado nada. Acá el alias se lee literal, así que no hay nada que se pueda desconfigurar.

Y se autoverifica: `--self-test` le da un import que **tiene** que rechazar y falla si no lo rechaza. Una corrida limpia no prueba que el control esté encendido; se ve igual que uno apagado.

## Decisiones que conviene conocer antes de tocar el código

**El PDF se genera con `@react-pdf/renderer`, no con `html2canvas`.** `html2canvas` + `jsPDF` produce un PDF que por dentro es una imagen: no se puede seleccionar el texto y ningún lector automático saca nada de él. Es exactamente el defecto que esta herramienta viene a corregir. Además `@react-pdf/renderer` devuelve un `Blob`, que es lo que permite el botón de descargar, y no depende del motor del navegador, así que el archivo sale igual en todos lados.

**La vista previa y la descarga comparten el mismo `Blob`.** Lo que se ve en pantalla es literalmente el archivo que se baja. No hay una vista previa "aproximada" que se pueda desincronizar del export.

**El perfil de mercado es dato, no condicionales.** `domain/market/marketProfile.ts` describe qué permite cada mercado; `applyProfile()` es el **único** lugar donde se filtran los campos prohibidos. Las plantillas reciben el CV ya filtrado y no preguntan nada. Si una plantilla empieza a consultar el perfil, la regla se rompió: con dos plantillas hoy y seis mañana, la primera que se olvide del chequeo filtra un dato personal al PDF sin que nada se ponga en rojo.

**El dato del usuario nunca se borra.** Cambiar de mercado lo deja fuera de *esa* exportación; volver lo trae de vuelta.

**El motor de reglas es puro.** `runAnalysis(resume, ctx)` no toca la red, ni estado, ni el reloj. Por eso se testea contra fixtures en milisegundos.

**No hay ningún modelo de lenguaje externo.** `domain/generate/generator.ts` define el puerto de la carta y `nullGenerator` es la única implementación. La aplicación entera tiene que seguir funcionando con él. La traducción no pasa por ese puerto: la hace el traductor del navegador, en el dispositivo.

**El inglés es una capa sobre el CV en español, no un segundo CV.** `domain/resume/translation.ts` guarda solo los textos (título, perfil, puestos, viñetas, estudios, cursos, habilidades, idiomas), y cada uno recuerda el español del que salió. Las fechas, empresas y números se leen siempre del español, igual que las versiones: un dato corregido una vez queda corregido en los dos idiomas. Y si el español de un texto cambia después de traducirlo, se detecta: ese campo vuelve a imprimirse en español y se marca, en vez de mandar una traducción de algo que el CV ya no dice. La traducción automática la arma `domain/translate/buildTranslation.ts`: un glosario para puestos, habilidades e idiomas, los nombres propios (la persona, empresas, instituciones, sistemas como Veraz o Tango) apartados del traductor con marcadores, y un aviso cuando un número o un nombre no sobrevive.

Eso también decide cómo funciona la **carta de presentación**: la estructura y los datos que ya están en el CV se completan solos, y el párrafo que explica por qué esta persona quiere este puesto queda para ella. Un párrafo que suena bien pero no lo escribió nadie es peor que uno en blanco, porque se manda igual y después hay que defenderlo en una entrevista. El botón de descargar está deshabilitado mientras ese párrafo siga siendo el texto de guía.

## Tests

```bash
npm test
```

Se testea el núcleo, no la interfaz:

- El motor de reglas contra un fixture que reproduce los defectos de un CV real (`src/test/fixtures.ts`). **Los datos de contacto del fixture son inventados**: datos personales reales no entran a un repo.
- El cruce de mercados: el mismo CV con foto pasa el perfil argentino y falla el internacional.
- La validación del `.json` importado, y qué pasa con uno guardado que ya no se puede leer.
- Un control que se verifica a sí mismo: un CV que el modo ATS **tiene** que rechazar.
- Las versiones: base más capa, que un cambio del base llegue a todas, que la capa no tenga dónde guardar un hecho, y que una viñeta reescrita con un número distinto no se exporte.
- La migración de lo guardado: documentos de las versiones 1 y 2 cargan enteros como una biblioteca de un CV, y el esquema actual solo los rechaza (así el test prueba la migración y no la tolerancia del esquema).
- Comparar con el aviso, contra el texto de un aviso real.
- La traducción con un traductor falso: que el glosario gane al traductor, que los nombres propios no se traduzcan, que un número cambiado o un nombre perdido se marquen, que retraducir mande solo lo que cambió y respete lo editado a mano, y que las plantillas impriman títulos, meses y "Present" en inglés.
- Las direcciones y quién puede entrar al editor (`screens/routes.ts`), y el tamaño con que se dibuja cada hoja de la vista previa.

Lo que solo existe en el sitio construido lo verifica `npm run check:build` en el deploy: el `404.html` y que ningún archivo del sitio se pida con ruta relativa.

### De punta a punta

```bash
npm run test:e2e
```

Playwright con Chromium, contra el **build de producción** servido por `vite preview`, no contra el servidor de desarrollo: la política de seguridad, la ruta base y la carga diferida del editor solo existen construidos, y cada una rompió algo en este proyecto que en desarrollo no se veía. Cubre lo que una persona hace: responder el inicio y moverse con Atrás y Adelante, crear, recargar y borrar versiones, la comparación con el aviso y las viñetas con números, la vista previa dibujada y su vista ampliada, dos pestañas sobre el mismo CV, varios CV a la vez (empezar otro, cambiar entre ellos, borrar con copia, cargar copias), la carta del CV base tras recargar, la traducción al inglés (con un traductor falso inyectado en el navegador: traducir, corregir a mano, recargar, detectar un español cambiado, un navegador sin traductor y una versión que sigue en español), fechas a medio escribir, un CV guardado con formato viejo o ilegible, y el ancho de un celular.

Los datos de prueba se escriben en `localStorage` antes del primer script de la página (`e2e/fixtures.ts`) y con la forma que guarda la app, sin usar su código: un documento armado con las mismas funciones que se están probando cambiaría junto con el bug.

Corren en CI en cada push, y el deploy no publica si fallan. La primera vez en una máquina nueva: `npx playwright install chromium`.

Tres de ellos vale la pena conocerlos antes de tocar lo que verifican:

**El PDF se mide, no se lee.** `readPdfText.ts` calcula **dónde** cae cada línea de texto, rastreando la pila de transformaciones del PDF. Estar en el archivo y estar en la hoja son cosas distintas, y solo la segunda se imprime: un test que buscara los puestos en el texto extraído pasa contento sobre una plantilla que los dibuja fuera del papel. Ese fue exactamente el primer intento.

**El importador se prueba contra la salida de la propia app.** `roundTrip.test.ts` genera el PDF de un CV y lo vuelve a importar. Todos los demás tests del importador le dan texto escrito a mano, que es texto con la forma que imaginó quien escribió el test. Este toma los bytes reales de una exportación real, y es la red de regresión más barata que hay: un cambio en una plantilla, en el lector de PDF o en cualquier parser aparece ahí.

**Lo que un navegador no puede contestar en un test se saca a una función pura.** El recorte de la foto (`domain/photo/cropRect.ts`) y hacia dónde salta el foco al llegar al borde de un diálogo (`shared/utils/focusTrap.ts`) son las dos piezas que deciden algo importante y que no se pueden verificar leyendo.

## Limitaciones conocidas

- El editor pesa alrededor de 450 KB comprimidos, casi todo `@react-pdf/renderer`. Se descarga recién al entrar al editor: la pantalla de inicio carga unos 110 KB.
- La foto se guarda en el navegador. El cupo total ronda los 5 MB, por eso se comprime a 600x600 antes de guardarla; sin eso una foto de celular llena el cupo y el navegador deja de guardar sin avisar.
- Los CV viven en el navegador donde se armaron. Varios conviven (el tuyo y el de otra persona), pero para pasarlos a otra computadora hay que bajar una copia `.json` y cargarla allá.
- La traducción automática solo funciona en Chrome y Edge de computadora (versión 138 o posterior). En el celular, Firefox y Safari la app lo explica y el inglés se escribe a mano campo por campo. Los tests usan un traductor falso: el comportamiento del traductor real no se verifica en CI.
- El glosario cubre puestos y habilidades de perfil administrativo, comercial y de atención al cliente. Un puesto fuera de él lo traduce el navegador y queda marcado para revisar.
- Los títulos de estudio no se traducen: quedan en español con el significado entre paréntesis, porque una tecnicatura o una licenciatura no tienen un equivalente exacto.
- El inglés aplica al CV base. Las versiones por aviso y la carta de presentación siguen en español.
- Comparar con el aviso compara palabras, no significados: fuera de una lista corta de equivalencias ("ATM" y "cajero"), dos palabras distintas para lo mismo aparecen como faltante.
- El control de números de las viñetas reescritas lee cifras escritas con dígitos. Un número escrito en letras ("treinta") no se detecta.
- La fuente del PDF es una de las estándar del formato (Helvetica y Times-Roman). Cubren los acentos y la ñ sin embeber nada. Cambiar a una fuente propia obliga a registrarla con `Font.register`.
- Importar un CV de dos columnas puede devolver el texto entremezclado: el PDF no guarda columnas, guarda posiciones. Un hueco horizontal ancho se lee como separador, lo que ayuda, pero no lo resuelve del todo. Por eso lo extraído siempre se muestra para revisar antes de aplicarse.
- Un CV escaneado, o exportado como imagen desde una herramienta de diseño, no se puede importar. La app lo detecta y lo dice; los datos hay que cargarlos a mano.
- El `.doc` anterior a 2007 no se lee: es un binario propietario sin librería de JavaScript razonable. La app pide guardarlo como `.docx` o PDF.
- El importador adivina. Anclarse en las fechas y en los huecos funciona con la mayoría de los CV, pero una maqueta rara lo desordena; para eso está el paso de revisión, y las líneas que no supo ubicar se listan en vez de descartarse.

## Licencia

MIT. Ver [LICENSE](LICENSE).
