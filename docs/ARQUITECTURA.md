# Arquitectura

## Visión general

```
Fuentes (PDF principal, Edición 2)            Navegador (React 18 + TypeScript, PWA)
  │ transcripción y revisión editorial          ├─ Dominio puro: búsqueda, horarios, temporizador,
  ▼                                             │  preparación, visibilidad, validación, recomendador
contenido/scripts/build_catalog.py              ├─ Estado: sesión · usuario · catálogo · avisos
  │ catalog.json (71 actividades, procedencia   └─ Páginas: Inicio, Biblioteca, Ficha, Facilitación,
  │ por campo, estados, incidencias)               Retiros, Favoritos, Asistente, Cuenta, Ayuda, Admin
  ▼
supabase/seed/catalogo.sql ──► Supabase (PostgreSQL + Auth + RLS)
                                  ▲            ▲
             /api/hotmart-webhook ┘            └ /api/asistente ──► API de Anthropic (streaming)
                  ▲
               Hotmart (webhook 2.0.0)
```

## Decisiones principales

| Decisión | Motivo |
|---|---|
| React 18 + Vite + TypeScript estricto, sin librerías de interfaz | Bundle pequeño, control total del diseño, sin dependencias que aporten poco |
| Enrutado por hash (`#/ruta`) | Funciona igual en hosting estático, PWA y vista previa de claude.ai, sin reglas de reescritura |
| Dominio puro y probado (`src/domain`) | La lógica crítica (horarios, temporizador, preparación, permisos de visibilidad) se prueba sin interfaz |
| Temporizador por marcas de tiempo (`acumulado + ahora − inicio`) | Es correcto aunque la pantalla se apague o la app pase a segundo plano; el intervalo solo repinta |
| Avance de fase/paso siempre manual | Requisito del brief: nada cambia sin la acción de quien facilita |
| Tres modos de datos fijados en compilación | El catálogo completo solo existe en la compilación privada; producción y demo no lo incluyen (verificado buscando textos del catálogo en los paquetes) |
| Datos de usuario con «almacenes» intercambiables | Local (`localStorage`, con avisos de cuota y modo privado) o Supabase (tablas por usuario + copia local para trabajar sin conexión) |
| Guardado diferido con estado visible | Cada cambio se guarda en ~350 ms; si falla, la banda superior permite reintentar o descargar una copia |
| Depuración para compradoras en dos sitios equivalentes | `paraCompradora` (TypeScript) y `sanear_publico` (SQL); una prueba compara ambas sobre las 53 fichas publicadas |
| Webhook idempotente en la base de datos | `procesar_evento_hotmart` inserta el id del evento con clave única y aplica la transición en la misma transacción |
| Asistente con recuperación determinista | Se envían al modelo solo fichas publicadas relevantes (máx. 6–10, compactas); las citas `[[id]]` se validan contra las fichas enviadas |
| Diálogos propios en lugar de `confirm()` | Accesibles, coherentes con el diseño y compatibles con la vista previa (donde `confirm` no funciona) |
| Impresión con vista dedicada | En el hosting propio usa `window.print()`; en la vista previa, donde no existe, ofrece descargar un HTML listo para imprimir o guardar como PDF |

## Flujo de acceso en producción

1. La persona compra en Hotmart (sin cambios en la oferta, precios ni checkout).
2. Hotmart envía el evento a `/api/hotmart-webhook` con la cabecera `X-HOTMART-HOTTOK`.
3. La función valida el hottok (tiempo constante), la forma del evento y el producto (`HOTMART_PRODUCT_IDS`; los adicionales no dan acceso), guarda una copia mínima sin datos de pago y llama a `procesar_evento_hotmart`.
4. La base de datos registra el evento (idempotente), aplica la política (aprobada/completa → activo; reembolso → sin acceso; contracargo; cancelación; pendiente; disputa registrada) y devuelve si hay que enviar el correo de acceso (una sola vez).
5. La compradora entra con su correo (enlace o código de un solo uso). `estado_acceso()` vincula la cuenta con el acceso por el correo verificado.
6. El catálogo llega con `catalogo_publicado()`, que exige acceso activo.

## Asistente

- **Sin IA**: `recomendar()` filtra y ordena las fichas publicadas por momento, tiempo, formato, espacio, intensidad y experiencia del grupo, con razones y advertencias (por ejemplo, grupo impar para dinámicas en pareja).
- **Con IA**: `recuperarFichas()` extrae pistas (momento, minutos, participantes, principiantes, programa) y puntúa; `construirMensajes()` arma el contexto; las reglas obligan a citar, a marcar «Adaptación sugerida», a no añadir retenciones de respiración, contacto, ojos cubiertos, fuego ni ejercicios intensos, a responder en ≤ 220 palabras y a no prometer resultados. La interfaz permite detener, reintentar y continuar respuestas incompletas, muestra errores reales y marca referencias no verificadas.
- **Vista previa**: usa la capacidad `sample` del visor de claude.ai (consulta real con la cuenta de quien mira, con permiso previo).
- **Producción**: `/api/asistente` exige sesión y acceso, aplica una cuota diaria atómica, registra tokens para controlar costos y transmite por SSE.

## Accesibilidad y diseño

- Tema oscuro de marca y tema claro de lectura (o el del dispositivo); tamaños de lectura normal, grande y muy grande; reducción de movimiento.
- Contraste verificado (texto ≥ 4,5:1 en ambos temas; el degradado de los botones se ajustó para cumplirlo).
- Navegación por teclado, foco atrapado en diálogos, enlace para saltar al contenido, regiones `aria-live` para avisos, temporizador y reordenamiento.
- Sin desborde horizontal de 360 px a escritorio, incluso con letra «muy grande» (comprobado en pruebas).
