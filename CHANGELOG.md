# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).
Versionado según [SemVer](https://semver.org/lang/es/).

## [No publicado]

### Agregado

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
