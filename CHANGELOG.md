# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).
Versionado según [SemVer](https://semver.org/lang/es/).

## [No publicado]

### Agregado

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
