# Pendientes y decisiones

## Decisiones que te corresponden

| # | Decisión | Dónde se aplica |
|---|---|---|
| 1 | **Precio y condiciones de la app.** No hay precio autorizado; la app no fija Bs52 ni Bs87 ni cambia la oferta de Hotmart | Fuera de la app |
| 2 | **Política de accesos** propuesta: compra aprobada/completa → acceso; reembolso o contracargo → sin acceso; cancelación/expiración → sin acceso (si es la misma compra); disputa → se registra y se mantiene el acceso hasta resolverse; pendiente/boleto → sin acceso. Confírmala o pide cambios | `procesar_evento_hotmart` (SQL) |
| 3 | **Duración del acceso** (permanente, por tiempo, sujeto a que el servicio siga activo) y cómo se comunica la diferencia con el PDF descargable | Términos de venta y Ayuda |
| 4 | **Asistente con IA**: activarlo o no, modelo (recomendado: Haiku 5.5 por costo) y límite diario (propuesto: 20 consultas por cuenta) | Variables `ASISTENTE_MODELO`, `ASISTENTE_LIMITE_DIARIO` |
| 5 | **Canal de soporte** oficial (correo, WhatsApp o enlace). Hoy la app no muestra ninguno inventado | `src/config/app.ts` → `soporte` |
| 6 | **Contenido del Sistema Profesional**: si los dos criterios de «Templo Interior» pueden mostrarse a compradoras | Administración → propuestas |
| 7 | **Las 17 actividades en revisión y el borrador** (ver `INFORME-EDITORIAL.md` §9): aprobar, reescribir, completar tiempos o archivar | Administración |
| 8 | **13 variantes de la Edición 2**: aprobar (pasan a verse dentro de su actividad) o archivar | Administración → Relacionadas y variantes |
| 9 | **3 propuestas de texto** (Ritual de Liberación, Danza de Liberación Emocional y la frase completada de «Lugar Seguro») | Administración → Propuestas |
| 10 | **Título «Taller Terapéutico de Expresión Emocional»**: «terapéutico» puede sugerir un servicio clínico | Administración |
| 11 | **Recurso externo**: mantener o quitar el enlace al asistente anterior | `src/config/app.ts` → `asistenteExterno` |

## Integraciones

| Integración | Estado | Qué falta |
|---|---|---|
| Supabase (cuentas, datos, catálogo protegido) | Código, esquema, RLS y funciones listos y probados en PostgreSQL local | Crear el proyecto, aplicar la migración, importar el catálogo, configurar variables y marcar tu cuenta como admin (`docs/PRODUCCION.md`) |
| Hotmart (webhook 2.0.0) | Función lista, idempotente y probada; formato verificado con la documentación oficial | Configurar la URL y el hottok en Hotmart y el id del producto principal. **Sin cambios en el producto, precios ni checkout** |
| Correo de acceso | Inicio de sesión sin contraseña (enlace + código) | SMTP propio en Supabase para producción (el servicio de correo incluido tiene límites muy bajos) |
| Asistente con IA en producción | Función con SSE, cuota diaria y registro de tokens, probada con simulaciones | Clave de Anthropic en el servidor y decisión #4 |
| Vercel | `vercel.json` con cabeceras de seguridad y funciones | Proyecto en un plan que permita uso comercial (Hobby no lo permite) |
| Imágenes de actividades | Campo de URL https en el editor | Subida directa a almacenamiento (opcional) |

## Tareas técnicas abiertas

- Probar el flujo completo con un proyecto real de Supabase y una compra de prueba en Hotmart (sandbox o compra real reembolsada).
- Revisar las plantillas de correo de Supabase en español (asunto y texto del enlace y del código).
- Decidir si se envía el correo de acceso al aprobarse la compra (`HOTMART_ENVIAR_ACCESO`) o si basta con que la compradora entre con su correo.
- Ajustar la política de contenido de seguridad (CSP) si se añaden servicios externos (analítica, soporte).
- La administración en la vista previa guarda los cambios solo en ese navegador: exporta el catálogo antes de borrar los datos del navegador.
- Opcional: subir imágenes a Supabase Storage desde el editor; historial de cambios con comparación lado a lado.
