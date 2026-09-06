# AGENTS.md — cómo trabajar en este repo

Instrucciones para agentes que modifiquen este código. Complemento del [README](README.md), que explica qué es el proyecto y cómo levantarlo.

## Antes de dar algo por terminado

```bash
npm run verify
```

Encadena oxlint, `tsc -b`, la verificación de capas y los tests. Si eso pasa, el cambio está listo para probar en el navegador.

## Las cuatro cosas que no hay que romper

**1. El CV no sale de la máquina del usuario.** No hay backend, no hay analítica, no hay `fetch` a ningún lado. Si una tarea parece necesitar una llamada de red, la respuesta por defecto es que no, y si de verdad hace falta se avisa en pantalla **antes** de mandar nada.

**2. El PDF tiene texto de verdad.** Se genera con `@react-pdf/renderer`. Nunca `html2canvas`, `jsPDF` ni ninguna variante que rasterice: eso produce un PDF que por dentro es una imagen, que es el defecto que este producto existe para corregir.

**3. El filtrado de campos prohibidos ocurre en un solo lugar.** `applyProfile()` en `domain/market/marketProfile.ts`. Una plantilla **nunca** pregunta si un campo está permitido: recibe el CV ya filtrado. Si ves un `if (profile.fields...)` dentro de `templates/`, eso es el bug.

**4. Un hallazgo sin acción no se muestra.** Toda regla de `domain/analysis` devuelve qué está mal **y qué hacer**. Un diagnóstico que solo señala no sirve.

## La regla de capas

```
screens  ->  templates  ->  domain  ->  shared  ->  assets
screens  ---------------->  domain
```

Un sentido, nunca al revés. `shared/` no importa nada de `domain/`. Dos carpetas de `domain/` distintas no se importan entre sí: si una necesita algo de otra, ese algo sube a `shared/` o lo orquesta la pantalla.

`npm run check:layers` lo verifica y **se autoverifica primero**: `--self-test` escribe un archivo que viola la regla y falla si el guard no lo rechaza. Si tocás `scripts/check-layers.mjs`, mantené ese comportamiento — un control que puede apagarse solo necesita su propia prueba.

## Convenciones

- **Identificadores en inglés** (carpetas, archivos, variables, funciones, tipos). **Prosa y textos de usuario en español.**
- **Ningún texto que vea el usuario va escrito en un componente.** Todos viven en `shared/config/copy.ts`. Hay traducción en el roadmap.
- **Sin emojis** en el código, los comentarios, los mensajes de commit ni la interfaz. Donde harías una marca visual, usá un icono de Lucide o palabras.
- **`strict` de TypeScript está prendido, y `noUncheckedIndexedAccess` también.** Indexar un array devuelve `T | undefined`: manejalo, no lo silencies con `!`.
- **Los componentes de `shared/ui` no llevan `margin`.** Solo `padding` y `gap`; la separación la decide el contenedor.
- **Iconos: solo Lucide**, nunca emojis como iconos.

## Diseño

La aplicación y las plantillas del CV son **dos sistemas visuales separados y no comparten tokens**. La app usa Tailwind y puede tener modo oscuro; las plantillas usan las primitivas de `@react-pdf/renderer` y se ven siempre como se van a imprimir.

La plantilla Harvard tiene restricciones que **no son decorativas**: una columna, sin iconos, sin tablas de maquetado, sin color, encabezados de sección con los nombres estándar. Cada una existe porque un lector automático no procesa lo contrario. No las "mejores".

## Qué está deliberadamente afuera

No lo agregues sin que te lo pidan:

- Cualquier integración con modelos de lenguaje, incluida una clave de API del usuario.
- Cuentas, login, backend, base de datos.
- Un puntaje numérico de compatibilidad con filtros automáticos: no existe un estándar público, un número inventado es humo.
- Analítica o telemetría.
