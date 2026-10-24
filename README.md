# Retiros Holísticos

*Tu espacio para preparar y facilitar experiencias con intención.*
**Menos tiempo preparando. Más presencia facilitando.**

Aplicación web (PWA) para consultar, planificar y facilitar dinámicas de retiros holísticos a partir del material «Más de 60 dinámicas para retiros holísticos». No es un curso: es una herramienta de consulta y preparación.

## Estado actual

| Área | Estado |
|---|---|
| Biblioteca con búsqueda sin tildes, filtros combinables y recuentos reales | Funciona |
| Ficha completa (decidir → preparar → guiar → desarrollar → recomendaciones → cuidado del grupo), notas privadas, «la utilicé», impresión | Funciona |
| Modo de facilitación (paso a paso, temporizador por marcas de tiempo, sin avance automático, campana opcional, pantalla activa) | Funciona |
| Mis retiros (jornadas, horarios, solapamientos, excesos, arrastrar y botones, pausas y bloques propios, duplicar, papelera) | Funciona |
| Preparación consolidada con lista persistente, recordatorios y secuencia | Funciona |
| Favoritos, notas y utilizadas | Funciona |
| Asistente sin IA (recomendador determinista) | Funciona |
| Asistente con IA | Funciona en la vista previa (capacidad del visor) y en producción mediante `/api/asistente` cuando se configure la clave |
| Administración (flujo editorial, versiones, problemas, duplicados, propuestas, orden de categorías) | Funciona (en la vista previa guarda en el navegador; en producción, en Supabase) |
| Producción: cuentas, acceso por compra (webhook de Hotmart), alta manual, RLS | Implementado y probado contra PostgreSQL local; **pendiente de credenciales** para desplegar |

Recuento real: **71 actividades únicas, 53 publicadas**, 17 en revisión y 1 borrador. Ver `docs/INVENTARIO.md`.

## Puesta en marcha (desarrollo)

Requisitos: Node 20+ (probado con Node 22), npm. Para las pruebas de base de datos: PostgreSQL 15+ local. Para regenerar el catálogo: Python 3.10+.

```bash
npm install
npm run dev            # http://localhost:5173 — modo «local» (catálogo completo, solo para uso privado)
```

### Modos de datos (`VITE_DATA_MODE`)

| Modo | Uso | Catálogo en el navegador |
|---|---|---|
| `local` | Vista previa privada y desarrollo | Completo (incluye borradores). **No publicar.** |
| `demo` | Demostración limitada compartible | Solo 3 fichas de muestra ya públicas en la landing |
| `supabase` | Producción | Ninguno: se pide al servidor tras iniciar sesión y comprobar el acceso |

### Comandos

| Comando | Qué hace |
|---|---|
| `npm run build` | Compilación de **producción** (`supabase`) en `dist/` |
| `npm run build:demo` | Demostración limitada en `dist-demo/` |
| `npm run build:local` | Vista previa privada en `dist-local/` (no desplegar en público) |
| `npm run build:artifact` | Página única para la vista previa en claude.ai (`dist-artifact/retiros-holisticos.html`) |
| `npm run catalog` | Regenera `src/data/catalog.json`, el inventario, la demo y el SQL de importación desde las transcripciones |
| `npm run seed` | Genera `supabase/seed/catalogo.sql` |
| `npm test` | Pruebas unitarias (dominio, datos, Markdown seguro, servidor) |
| `npm run test:db` | Pruebas de RLS, permisos y funciones SQL sobre un PostgreSQL efímero |
| `npm run test:e2e` | Pruebas de extremo a extremo con Playwright (360–1366 px) |
| `npm run test:todo` | Todo lo anterior |

## Estructura

```
src/
  config/        app.ts (nombre, subtítulo y recursos editables) · env.ts (modo)
  domain/        tipos, búsqueda, horarios, temporizador, preparación, visibilidad, validación, recomendador
  assistant/     núcleo compartido (recuperación de fichas, reglas, citas) y cliente
  data/          catálogo, almacenes (local / Supabase), repositorios
  state/         proveedores: sesión, usuario, catálogo, avisos y diálogos
  components/    interfaz común (iconos propios, tarjetas, filtros, diálogos)
  pages/         Inicio, Biblioteca, Ficha, Facilitación, Retiros, Favoritos, Asistente, Cuenta, Ayuda, Imprimir, admin/
  print/         estilos de impresión
server/          lógica de servidor independiente del hosting (webhook de Hotmart, asistente)
api/             funciones de Vercel que envuelven server/
supabase/        migración (esquema, RLS, funciones) y SQL de importación del catálogo
contenido/       transcripciones de las fuentes y scripts editoriales (origen del catálogo)
tests/           unit/ · db/ · e2e/
docs/            documentación de entrega
```

## Documentación

- `docs/ARQUITECTURA.md` — decisiones técnicas y flujo de datos
- `docs/ESQUEMA-DE-DATOS.md` — modelo del catálogo, datos de usuario y base de datos
- `docs/INVENTARIO.md` — las 71 actividades con estado, fuente y notas
- `docs/INFORME-EDITORIAL.md` — criterios, correcciones, clasificaciones y problemas de las fuentes
- `docs/PENDIENTES.md` — decisiones que te corresponden, borradores y tareas abiertas
- `docs/PRODUCCION.md` — configuración paso a paso (Supabase, Vercel, Hotmart, IA)
- `docs/COSTOS.md` — estimación de costos recurrentes con supuestos y precios verificados
- `docs/PRUEBAS.md` — pruebas y resultados

## Seguridad en breve

- Ninguna clave privada en el navegador: `ANTHROPIC_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` y `HOTMART_HOTTOK` solo existen en el servidor.
- RLS en todas las tablas; las escrituras sensibles pasan por funciones que comprueban el rol en el servidor.
- El acceso nunca se desbloquea por una URL de «gracias», un parámetro, un botón «ya pagué» ni `localStorage`: lo decide la base de datos (compra aprobada vía webhook o alta manual).
- El catálogo de producción no viaja en el código; las compradoras reciben solo fichas publicadas y depuradas (sin notas internas ni textos retenidos).
- Markdown del asistente renderizado sin `innerHTML`.
- No es posible impedir toda copia o captura de pantalla; la protección se centra en no exponer el catálogo sin acceso.
