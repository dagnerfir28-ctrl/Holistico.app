# Pruebas y resultados

Última ejecución completa: `npm run test:todo` → **90 pruebas superadas, 0 fallos** (54 unitarias, 15 de base de datos, 21 de extremo a extremo), además de la comprobación de tipos (`tsc --noEmit`) sin errores.

## Unitarias (Vitest) — 54

**Dominio** (`tests/unit/domain.test.ts`, 32): integridad del catálogo (ids únicos, 53 publicadas, duplicados e incompletas fuera de la vista pública, todas las publicadas sin problemas bloqueantes, fuentes con páginas); búsqueda sin tildes ni mayúsculas, filtros combinados, sin resultados, «sin materiales especiales», orden por título; horarios (inicio, pausas, exceso sobre la hora de fin, solapamiento por hora fija, duración por defecto no adaptada); duplicar retiros y reordenar; temporizador (correcto tras 5 min en segundo plano, pausa, cambios solo manuales, sin avance automático, último paso, reiniciar fase); preparación consolidada (materiales canónicos sin cantidades, preparación con fuego, textos retenidos excluidos, recordatorios); visibilidad (compradora solo ve publicadas, retenidos ocultos, admin ve todo, variantes ocultas); recomendador; asistente (pistas, recuperación solo de publicadas, validación de citas, construcción del contexto).

**Datos y seguridad de la interfaz** (`tests/unit/datos.test.tsx`, 8): Markdown que no ejecuta HTML, enlaces solo https con `noopener`, listas anidadas y citas; saneado de datos dañados o manipulados (preferencias, horas imposibles como `25:99`, bloques no válidos, textos demasiado largos); papelera (eliminar, restaurar, purga a los 30 días); favoritos, notas, recientes y marcas de uso; máximo de facilitaciones abiertas; validación de copias de seguridad.

**Servidor** (`tests/unit/server.test.ts`, 14): webhook de Hotmart (hottok en tiempo constante, 401 sin hottok o incorrecto, falla cerrado sin configuración, validación de método/JSON/forma/versión, copia mínima sin datos de pago, envío del acceso una sola vez, duplicados sin reenvío, 500 para reintento si falla la base de datos, fallo de correo sin romper el webhook); asistente (validación de la petición, sesión, acceso, cuota diaria 429, streaming meta → texto → fin, reglas como mensaje de sistema, solo fichas publicadas y sin datos internos, registro de tokens, respuesta truncada, error real del proveedor sin texto inventado, «continuar» con las mismas fichas).

## Base de datos (PostgreSQL 16 efímero + entorno Supabase simulado) — 15

`tests/db/run-db-tests.mjs`: la migración se aplica dos veces sin errores; la importación deja 71 actividades y 53 publicadas sin enlaces a los PDF en los metadatos públicos; **la depuración SQL coincide exactamente con la de la app** en las 53 fichas; sin acceso no se lee el catálogo ni la tabla; los anónimos no leen ni ejecutan nada; alta manual y catálogo depurado para quien tiene acceso; **aislamiento entre cuentas** (no se leen, modifican, borran ni crean retiros o notas ajenos); sin acceso no se guardan retiros nuevos; solo administración edita, con versión, historial, validación de publicación e identificadores válidos; configuración solo para administración y con valores válidos; el webhook solo con la clave de servicio; compra aprobada, duplicado idempotente, producto ajeno ignorado, una sola invitación y vinculación de la cuenta por correo; disputa, cancelación de otra compra, reembolso, evento atrasado y nueva compra; cuota diaria atómica; revocación que corta el catálogo.

## Extremo a extremo (Playwright, Chromium) — 21

`tests/e2e/run-e2e.mjs` sobre la compilación de la vista previa:

- Sin desborde horizontal en 10 pantallas a 360, 390, 768 y 1366 px, y a 360 px con letra «muy grande».
- Biblioteca: búsqueda sin tildes, filtros combinados con recuento y limpieza, estado sin resultados.
- Favorita, nota privada y «la utilicé» persisten al recargar y aparecen en Inicio y en Notas.
- Retiros: crear, añadir actividades y pausa, horarios, aviso de exceso; reordenar con botones, teclado y **arrastre**; solapamiento por hora fija; lista de preparación persistente con tarea propia y sin cantidades inventadas; duplicar, eliminar con deshacer y restaurar desde la papelera.
- Facilitación con reloj simulado: tiempo correcto tras 5 min en segundo plano, sin avance automático tras superar el tiempo previsto, pausa real, avance manual, salir y continuar desde Inicio.
- Impresión: documento con fondo blanco, notas privadas solo si se eligen (también en el archivo descargado).
- Administración: la compradora no ve actividades en revisión; edición con versión e historial; descarte de cambios; publicar bloqueado si faltan datos.
- Asistente: recomendador sin IA y aviso honesto si no hay IA; con la capacidad del visor simulada: citas válidas enlazadas, referencias no verificadas marcadas, Markdown seguro y botón Detener.
- Preferencias de tema y tamaño persistentes; estados vacíos sin cifras ni reseñas.

## Comprobaciones adicionales

- **Compilación de producción**: no contiene textos del catálogo (búsqueda de títulos y frases de fichas en `dist/assets`); sin sesión muestra la pantalla de acceso y no carga fichas.
- **Demostración**: contiene solo las 3 fichas de muestra y ningún enlace a los PDF.
- **PWA**: el service worker se registra y la demostración abre sin conexión tras la primera visita.
- **Contraste**: texto principal y secundario ≥ 4,5:1 en ambos temas; botones ajustados a ≥ 4,5:1.

## Limitaciones de las pruebas

- Supabase, Hotmart y la API de Anthropic no se probaron contra servicios reales (no hay credenciales en este entorno): se usaron PostgreSQL local con el entorno de Supabase simulado y dobles de prueba para las llamadas HTTP.
- Las pruebas de interfaz usan Chromium; conviene una revisión manual en Safari de iPhone y en Chrome de Android antes del lanzamiento.
