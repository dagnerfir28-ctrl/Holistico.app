# Puesta en producción

Orden recomendado. Ninguna clave se escribe en el código ni en el chat: todas van en los paneles de Supabase y Vercel.

## 1. Supabase

1. Crea un proyecto (plan **Pro** para un producto de pago: el gratuito se pausa tras una semana sin actividad).
2. **SQL Editor** → ejecuta `supabase/migrations/0001_init.sql`.
3. **SQL Editor** → ejecuta `supabase/seed/catalogo.sql` (regenéralo con `npm run seed` si cambias el catálogo). Debe devolver `71`.
4. **Authentication → Providers → Email**: activa el inicio con enlace mágico / código (OTP). Desactiva el registro con contraseña si no lo vas a usar.
5. **Authentication → URL Configuration**: *Site URL* = tu dominio (por ejemplo `https://app.tudominio.com`) y añade la misma URL en *Redirect URLs*.
6. **Authentication → Emails**: traduce las plantillas al español y configura un **SMTP propio** (el servicio incluido tiene límites muy bajos para producción).
7. Inicia sesión una vez en la app con tu correo y después, en el SQL Editor:
   ```sql
   update public.perfiles set rol = 'admin' where email = 'tu-correo@ejemplo.com';
   ```
8. **Project Settings → API**: copia la URL, la clave `anon` (pública) y la `service_role` (secreta, solo para Vercel).

## 2. Vercel

1. Importa el repositorio. `vercel.json` ya define `npm run build`, la carpeta `dist`, las funciones y las cabeceras de seguridad.
2. Plan: **Pro** (el plan Hobby es solo para uso personal no comercial).
3. Variables de entorno (Production):

| Variable | Dónde se usa | Valor |
|---|---|---|
| `VITE_DATA_MODE` | navegador | `supabase` |
| `VITE_SUPABASE_URL` | navegador | URL del proyecto |
| `VITE_SUPABASE_ANON_KEY` | navegador | clave `anon` |
| `VITE_ASSISTANT_API` | navegador | `/api/asistente` (vacío si no activas la IA) |
| `SUPABASE_URL` | servidor | URL del proyecto |
| `SUPABASE_ANON_KEY` | servidor | clave `anon` |
| `SUPABASE_SERVICE_ROLE_KEY` | servidor | clave `service_role` (**secreta**) |
| `HOTMART_HOTTOK` | servidor | hottok de tu cuenta de Hotmart (**secreto**) |
| `HOTMART_PRODUCT_IDS` | servidor | id del producto principal (si hay varios, separados por comas). **No** incluyas los adicionales |
| `HOTMART_ENVIAR_ACCESO` | servidor | `true` para enviar el enlace de acceso al aprobarse la compra (requiere SMTP) |
| `APP_URL` | servidor | URL pública de la app |
| `ANTHROPIC_API_KEY` | servidor | clave de la API (**secreta**), solo si activas la IA |
| `ASISTENTE_MODELO` | servidor | `claude-haiku-5-5` (recomendado) o `claude-sonnet-5-5` |
| `ASISTENTE_LIMITE_DIARIO` | servidor | `20` (propuesto) |

4. Despliega y comprueba: la app pide iniciar sesión, la biblioteca no se ve sin acceso y no hay contenido del catálogo en los archivos `dist/assets/*.js` (puedes buscar el título de cualquier ficha).

## 3. Hotmart (sin tocar la oferta)

1. **Herramientas → Webhook (API y notificaciones)** → nueva configuración, versión **2.0.0**, URL `https://TU-DOMINIO/api/hotmart-webhook`.
2. Selecciona el producto principal y los eventos de compra: `PURCHASE_APPROVED`, `PURCHASE_COMPLETE`, `PURCHASE_CANCELED`, `PURCHASE_REFUNDED`, `PURCHASE_CHARGEBACK`, `PURCHASE_PROTEST`, `PURCHASE_EXPIRED`, `PURCHASE_DELAYED`, `PURCHASE_BILLET_PRINTED`.
3. Copia el **hottok** a `HOTMART_HOTTOK` (Hotmart lo envía en la cabecera `X-HOTMART-HOTTOK`).
4. Usa la opción de prueba de Hotmart y revisa en la app **Administración → Accesos → Últimos eventos** que llegó y se procesó.
5. Altas manuales (compras fuera de Hotmart, regalos, soporte): Administración → Accesos.

Comportamiento: cada evento se procesa una sola vez (id único); los reintentos no duplican accesos; un evento antiguo que llega tarde no revierte uno más reciente de la misma compra; se guarda una copia mínima sin datos de pago, documento ni dirección.

## 4. Asistente con IA (opcional)

1. Crea una clave en la consola de Anthropic y define un límite de gasto mensual allí.
2. Configura `ANTHROPIC_API_KEY`, `ASISTENTE_MODELO`, `ASISTENTE_LIMITE_DIARIO` y `VITE_ASSISTANT_API=/api/asistente`; vuelve a desplegar.
3. Controla el consumo con la tabla `uso_asistente` (consultas y tokens por día).

## 5. Comprobación final

- [ ] Una cuenta sin compra ve «Tu cuenta no tiene acceso activo».
- [ ] Una compra de prueba da acceso; su reembolso lo quita.
- [ ] Dos cuentas distintas no ven los retiros ni las notas de la otra.
- [ ] Una compradora no ve actividades en revisión ni textos retenidos.
- [ ] Tu cuenta admin ve Administración y puede publicar.
- [ ] El asistente responde con fichas enlazadas (o indica claramente que no está activado).
- [ ] La app se instala como PWA y abre sin conexión con un retiro guardado para usar sin conexión.

## Vista previa y demostración

- `npm run build:artifact` genera la página de la vista previa privada (catálogo completo; no compartir).
- `npm run build:demo` genera una demostración con 3 fichas ya públicas en la landing, apta para compartir.
