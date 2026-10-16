# Spelling Bee Ultimate

Entrenador de ortografía con React 19, TypeScript, Vite y Tailwind. Funciona en el navegador, sin backend. Las sesiones, listas recientes, notas y errores se guardan en el almacenamiento local del navegador.

## Ejecutar

Requisitos: Node.js 22.12+ o Node.js 24 y npm.

```sh
npm ci
npm run dev
```

Abre la dirección indicada por Vite (por defecto `http://localhost:3000`).

```sh
npm test          # Pruebas de reglas, persistencia, interfaz y audio simulado
npm run typecheck
npm run build    # TypeScript estricto + compilación de producción
npm run preview
```

Para alojamiento estático, publica el contenido de `dist/` generado por `npm run build`. No requiere Gemini ni variables GEMINI_API_KEY.

## Cómo funciona

- Introduce palabras o expresiones separadas por comas o saltos de línea. Conserva Unicode, acentos, apóstrofes, guiones y espacios interiores. Las entradas no admitidas se muestran como error; no se mutilan.
- Las respuestas ignoran mayúsculas, espacios exteriores y diferencias entre apóstrofes rectos y curvos. Los acentos sí cuentan.
- Las palabras incorrectas, agotadas por tiempo o acertadas con pista vuelven después de hasta tres palabras pendientes.
- Assisted cuenta como respuesta acertada en Accuracy, se identifica por separado y debe repetirse sin ayuda para completar el repaso. Las rachas requieren aciertos sin pista. Mistakes incluye palabras que necesitaron ayuda.
- Infinite Loop comienza otra vuelta al agotar la lista. Finish session permite finalizar cuando quieras y abrir el resumen.
- Save & Exit y la recarga conservan la palabra activa, cola y resultado ya confirmado. Al reanudar una palabra sin responder se reinicia su temporizador; el texto que todavía no se ha enviado no se guarda.
- Feeling Lucky no sustituye la sesión normal guardada, incluso al repetirla desde su resumen. Iniciar deliberadamente otra sesión normal sí sustituye la anterior.
- Las sesiones guardadas en el formato anterior se migran al leerlas. Duplicados o errores que la versión anterior ya hubiera guardado no siempre pueden reconstruirse.

## Voz, diccionario y datos

La voz predeterminada es la del navegador. Su calidad y disponibilidad dependen de las voces instaladas y del navegador; no se garantiza funcionamiento sin conexión. El idioma se selecciona explícitamente.

ElevenLabs es opcional: introduce tu propia clave y selecciona una de sus voces. La clave nueva solo permanece en memoria durante la carga actual de la aplicación; no se guarda en localStorage. Una clave antigua se migra a memoria y se elimina de la configuración persistida. La clave se envía desde el navegador a ElevenLabs para las solicitudes de voz. No incluyas una clave compartida en el código público; para distribuir un servicio con una cuenta común hace falta backend y control de acceso.

Slow reutiliza la grabación y cambia su velocidad. La caché dura mientras esté abierta la aplicación, contiene hasta 100 grabaciones y se reinicia al cambiar de clave. Los fallos de ElevenLabs muestran aviso y usan la voz del navegador cuando está disponible. No se ha validado una cuenta real de ElevenLabs durante esta revisión.

El diccionario automático de dictionaryapi.dev está configurado para inglés. Otros idiomas admiten notas personalizadas. Las respuestas tardías de palabras anteriores se descartan. Las notas se pueden editar o borrar dentro de la interfaz.

No hay sincronización entre dispositivos ni un sistema SRS con fechas de repaso entre sesiones. Es un repaso por reinserción dentro de la sesión. Las últimas palabras para repasar se sustituyen al terminar una sesión, incluyendo Lucky.

Lee `REVISION.md` para consultar cada observación de la auditoría y las comprobaciones realizadas.
