# Esquema de datos

Los tipos de referencia están en `src/domain/types.ts`; el esquema SQL en `supabase/migrations/0001_init.sql`.

## Catálogo (`catalog.json`, esquema 1)

```
Catalogo
├─ schema, generado
├─ fuentes{principal|edicion2|sistema}: { titulo, paginas, drive }      ← enlaces solo visibles para administración
├─ materialesCanonicos[]: { id, nombre }                                  ← 33 materiales normalizados
├─ opcionesConsentimiento{clave: texto}                                   ← 12 fórmulas de participación voluntaria
├─ incidenciasDocumento                                                   ← problemas del PDF (índice, duplicados, separadores…)
├─ resumen{publicado, revision, borrador, archivado}
└─ actividades[]: Actividad
```

### Actividad

| Campo | Tipo | Notas |
|---|---|---|
| `id` | string | `^[a-z0-9-]{1,80}$`, estable |
| `version`, `actualizado` | number, fecha | Se incrementa en cada guardado de administración |
| `estado` | `borrador` · `revision` · `publicado` · `archivado` | Solo `publicado` llega a compradoras |
| `motivoEstado` | string? | Interno |
| `titulo`, `subtitulo`, `resumen`, `contexto`, `objetivo` | string | Textos de la ficha |
| `momentos` | (`apertura`·`conexion`·`exploracion`·`integracion`·`cierre`)[] | Clasificación editorial; el primero es el principal |
| `temas` | string[] | Etiquetas para la búsqueda |
| `formato` | (`individual`·`parejas`·`grupo`)[] | |
| `duracion` | `{min, max, texto}`? | Minutos de la fuente |
| `notaDuracion` | string? | Discrepancias de tiempo documentadas |
| `tipoFuente`, `nivelFuente`, `energiaFuente`, `momentoFuente`, `enfoqueFuente` | string? | Valores literales de la ficha original |
| `espacio` | `{tipo: interior·exterior·ambos·no-especificado, amplio?, texto?}` | |
| `participantes` | string? | Solo si la fuente lo indica |
| `materiales` | `{texto, ids[], opcional}`[] | `ids` = materiales canónicos (para la lista consolidada); sin cantidades inventadas |
| `ambiente` | string[] | Requisitos de espacio y ambiente |
| `preparacion`, `adaptaciones`, `consentimiento`, `criteriosPausa`, `cuandoUtilizar`, `cuandoEvitar`, `queObservar`, `recomendaciones` | `ItemTexto[]` | `ItemTexto = {texto, origen, retenido?, motivo?}` |
| `secciones` | `{titulo, tipo: lista·preguntas·frases, items[], nota?, cita?}`[] | Recursos para guiar (frases, preguntas, listas) |
| `fases` | `{id, nombre, tipo, tiempo?, pasos[], citas[], preguntas[], nota?, origen?}`[] | `citas` = guion sugerido |
| `relacionadas` | id[] | |
| `variantes` | `{id, titulo, tituloFuente, estado, fuente, nota, subtitulo, contexto, fases[]}`[] | Versiones de la Edición 2, ocultas hasta aprobarse |
| `fuentes` | `{archivo, paginas[], rol}`[] | Trazabilidad a páginas |
| `correcciones` | `{campo, original, corregido, motivo}`[] | Interno |
| `incidencias` | `{tipo, severidad, detalle}`[] | Interno |
| `propuestas` | `{campo, texto, motivo, original?}`[] | Cambios pendientes de aprobación |
| `notasAdmin` | string[] | Interno |
| `clasificacion` | `{campo: {origen, motivo}}` | Justificación de clasificaciones editoriales |
| `sistemaProfesional` | string? | Referencia interna al producto aparte |
| `sumaFases`, `imagen`, `orden`, `procedencia` | | |

**Orígenes de texto** (`origen`): `fuente` (literal), `fuente-ed2` (recuperado de la Edición 2), `correccion`, `adaptacion` (orientación editorial), `nuevo`, `editorial` (clasificación), `sistema` (Sistema Profesional; se retiene por defecto).

**Vista de compradora** (`paraCompradora` / `sanear_publico`): solo actividades publicadas; se eliminan textos `retenido`, variantes no publicadas, fuentes del Sistema Profesional e información interna (`incidencias`, `propuestas`, `notasAdmin`, `correcciones`, `clasificacion`, `sistemaProfesional`, `motivoEstado`).

## Datos del usuario (`DatosUsuario`, versión 1)

| Campo | Contenido |
|---|---|
| `perfil.nombre` | Para el saludo |
| `preferencias` | `tema` (oscuro·claro·sistema), `tamano` (normal·grande·muy-grande), `reducirMovimiento`, `sonidos` (falso por defecto), `pantallaActiva` |
| `favoritos` | `{actividadId: fecha}` |
| `notasActividad` | `{actividadId: {texto, actualizado}}` (máx. 5.000 caracteres) |
| `usos` | `{actividadId: fechas[]}` («la utilicé», una marca por día) |
| `recientes` | ids (máx. 20) |
| `retiros`, `papelera` | `Retiro[]` (la papelera se purga a los 30 días) |
| `facilitacion` | `{clave: EstadoFacilitacion}` (máx. 12 abiertas) |
| `asistente` | contador informativo del día (el límite real se aplica en el servidor) |

`Retiro = {id, nombre, objetivo, fecha?, duracionPrevista, participantes?, contexto, notas, jornadas[], checklist{clave: bool}, checklistPropios[], offline?, creado, actualizado, eliminado?}`
`Jornada = {id, nombre, fecha?, inicio HH:MM, fin? HH:MM, bloques[]}`
`Bloque = actividad {actividadId, duracion, duracionAdaptada, horaFija?, nota} | pausa | propio {titulo, duracion, horaFija?, nota}`
`offline = {guardado, actividades{id: {version, data}}}` — copia de las fichas para usar sin conexión.

Todo lo que se lee (almacenamiento local, copias de seguridad, servidor) pasa por `sanearDatos`/`normalizarRetiro`, que validan tipos, longitudes y horas.

## Base de datos (Supabase / PostgreSQL)

| Tabla | Contenido | Lectura | Escritura |
|---|---|---|---|
| `perfiles` | `user_id`, `email`, `rol` (compradora·admin) | propia o admin | solo funciones / SQL de la propietaria |
| `accesos` | por correo: `estado` (activo·pendiente·reembolsado·cancelado·revocado·contracargo·en-disputa), `origen` (hotmart·manual), transacción, producto, fechas, `invitacion_enviada` | admin | funciones |
| `eventos_hotmart` | id del evento (clave única → idempotencia), tipo, transacción, correo, producto, estado del procesamiento, resumen sin datos de pago | admin | función de servicio |
| `actividades` | `datos` completos y `datos_publicos` depurados | admin | `guardar_actividad`, `importar_catalogo` |
| `actividad_versiones` | historial por versión con nota y autor | admin | funciones |
| `catalogo_meta` | `base` (pública, sin enlaces a PDF), `config` (pública), `incidencias` y `fuentes_admin` (privadas) | admin o pública con acceso | funciones |
| `datos_usuario` | preferencias, favoritos, notas, usos, facilitación | propia | propia y con acceso activo |
| `retiros` | un retiro por fila (`user_id`, `id`), `eliminado` para la papelera | propia | propia y con acceso activo |
| `uso_asistente` | consultas y tokens por día | propia o admin | función de servicio |

**Funciones**: `estado_acceso()`, `tiene_acceso()`, `es_admin()`, `catalogo_publicado()`, `guardar_actividad(jsonb, text)`, `guardar_config_catalogo(jsonb)`, `importar_catalogo(jsonb)`, `conceder_acceso_manual(text, text)`, `revocar_acceso(text, text)`, `procesar_evento_hotmart(jsonb, text[])`, `marcar_invitacion_enviada(text)`, `consumir_cuota_asistente(uuid, int)`, `registrar_tokens_asistente(uuid, int, int)`, `sanear_publico(jsonb)`, `publicable(jsonb)`.

Los anónimos no tienen privilegios; los usuarios autenticados solo leen lo que RLS permite y escriben únicamente sus propios datos; las funciones de servicio (webhook, cuota) solo las ejecuta la clave de servicio.
