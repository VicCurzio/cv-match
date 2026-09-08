# CV Match

Herramienta web para armar, adaptar y descargar un CV. El CV se adapta al mercado al que se manda y a quién lo va a leer: una persona o un filtro automático.

Todo corre en el navegador. No hay backend, no hay cuentas y el CV no se sube a ningún lado.

## Qué resuelve

La mayoría no sabe maquetar un CV, ni qué sacarle, ni que el CV que sirve en Argentina no es el que sirve afuera. CV Match hace tres cosas:

1. **Lo maqueta.** Dos plantillas, cada una con un propósito declarado.
2. **Lo adapta al mercado.** En Argentina la foto se usa; en Estados Unidos, Reino Unido y Canadá hay reclutadores que descartan los CV con foto para no exponerse a una acusación de discriminación. La app lo sabe y filtra en consecuencia.
3. **Lo diagnostica.** Un motor de reglas señala qué está flojo y **qué hacer** al respecto.

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
| `npm run dev` | Servidor de desarrollo |
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

Sitio estático, publicado en GitHub Pages por `.github/workflows/deploy.yml` en cada push a `main`. El workflow corre `npm run verify` antes de construir, así que no se publica nada que no pasaría un commit local.

Para conectarlo la primera vez: creá el repositorio en GitHub, agregalo como remoto, `git push -u origin main`, y en Settings → Pages elegí **GitHub Actions** como origen.

`base` está en `./` para que el sitio funcione desde un subdirectorio, que es como Pages sirve un proyecto.

## Arquitectura, en corto

Corte primario por dominio de negocio. La regla de dependencia va en un solo sentido:

```
screens  ->  templates  ->  domain  ->  shared  ->  assets
screens  ---------------->  domain
```

```
src/
  screens/     una carpeta por pantalla
  domain/      resume · market · analysis · photo · export · generate
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

**No hay ningún modelo de lenguaje.** `domain/generate/generator.ts` define el puerto y `nullGenerator` es la única implementación. La aplicación entera tiene que seguir funcionando con él.

Eso también decide cómo funciona la **carta de presentación**: la estructura y los datos que ya están en el CV se completan solos, y el párrafo que explica por qué esta persona quiere este puesto queda para ella. Un párrafo que suena bien pero no lo escribió nadie es peor que uno en blanco, porque se manda igual y después hay que defenderlo en una entrevista. El botón de descargar está deshabilitado mientras ese párrafo siga siendo el texto de guía.

## Tests

```bash
npm test
```

Se testea el núcleo, no la interfaz:

- El motor de reglas contra un fixture que reproduce los defectos de un CV real (`src/test/fixtures.ts`). **Los datos de contacto del fixture son inventados**: datos personales reales no entran a un repo.
- El cruce de mercados: el mismo CV con foto pasa el perfil argentino y falla el internacional.
- La validación del `.json` importado.
- Un control que se verifica a sí mismo: un CV que el modo ATS **tiene** que rechazar.

## Limitaciones conocidas

- El bundle pesa alrededor de 1,5 MB sin comprimir, casi todo `@react-pdf/renderer`. Se puede recortar con carga diferida cuando moleste.
- La foto se guarda en el navegador. El cupo total ronda los 5 MB, por eso se comprime a 400x400 antes de guardarla; sin eso una foto de celular llena el cupo y el navegador deja de guardar sin avisar.
- La fuente del PDF es una de las estándar del formato (Helvetica y Times-Roman). Cubren los acentos y la ñ sin embeber nada. Cambiar a una fuente propia obliga a registrarla con `Font.register`.
- Importar un CV de dos columnas devuelve el texto entremezclado: el PDF no guarda columnas, guarda posiciones. Por eso lo extraído siempre se muestra para revisar antes de aplicarse.
- Un CV escaneado, o exportado como imagen desde una herramienta de diseño, no se puede importar. La app lo detecta y lo dice; los datos hay que cargarlos a mano.
- El `.doc` anterior a 2007 no se lee: es un binario propietario sin librería de JavaScript razonable. La app pide guardarlo como `.docx` o PDF.
- El recorte de la foto es automático (el cuadrado centrado más grande). No hay control manual de encuadre todavía.

## Licencia

MIT. Ver [LICENSE](LICENSE).
