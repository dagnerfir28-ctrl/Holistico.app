# Estimación de costos recurrentes

Precios en USD, sin impuestos, **verificados el 24 de octubre de 2026** en las páginas oficiales indicadas. Pueden cambiar: revísalos antes de decidir.

## Precios verificados

| Servicio | Plan | Precio | Incluye (lo relevante aquí) | Fuente |
|---|---|---|---|---|
| Supabase | Free | $0 | 50.000 MAU, 500 MB de base de datos, 5 GB de egress; **se pausa tras 1 semana sin actividad**; máx. 2 proyectos activos | supabase.com/pricing |
| Supabase | Pro | desde $25/mes | 100.000 MAU, 8 GB de disco, 250 GB de egress, 100 GB de archivos, $10 de crédito de cómputo (cubre una instancia Micro); no se pausa | supabase.com/pricing |
| Vercel | Hobby | $0 | **Solo uso personal no comercial** | vercel.com/docs/plans/hobby |
| Vercel | Pro | $20/mes por asiento de desarrollador | $20 de crédito de uso; invocaciones desde $0,60 por millón; CPU activa desde $0,128 por hora | vercel.com/pricing |
| Anthropic | Claude Haiku 5.5 | $0,10 / MTok entrada · $0,50 / MTok salida (prompts ≤ 100.000 tokens) | — | platform.claude.com/docs/en/about-claude/pricing |
| Anthropic | Claude Sonnet 5.5 | $2 / MTok entrada · $10 / MTok salida | — | platform.claude.com/docs/en/about-claude/pricing |

No verificados (dependen de tu elección): dominio propio y servicio SMTP para los correos de acceso (varios proveedores tienen planes gratuitos con límites).

## Hosting (fijo)

Para un producto de pago se recomienda **Supabase Pro + Vercel Pro ≈ $45/mes** (más impuestos), suficiente hasta decenas de miles de compradoras activas con este uso: la app es estática, los datos por persona son pequeños y la PWA guarda en caché la estructura de la app.

Alternativa mínima mientras no haya ventas: Supabase Free (aceptando las pausas) y un hosting estático; no es adecuada para clientas reales.

## Asistente con IA (variable)

**Supuestos por consulta** (medidos sobre el diseño de la app): ~3.000 tokens de entrada (reglas ~450, hasta 6 fichas compactas ~1.500, historial y pregunta ~1.000) y ~450 tokens de salida (respuestas de ≤ 220 palabras; máximo técnico 900).

| Modelo | Costo por consulta | 1.000 consultas |
|---|---|---|
| Haiku 5.5 | 3.000 × $0,10/M + 450 × $0,50/M ≈ **$0,0005** | ≈ $0,53 |
| Sonnet 5.5 | 3.000 × $2/M + 450 × $10/M ≈ **$0,0105** | ≈ $10,50 |

**Supuestos de uso**: el 30 % de las compradoras activas usa el asistente, con 8 consultas al mes de media.

| Escenario | Compradoras activas/mes | Consultas/mes | Haiku 5.5 | Sonnet 5.5 |
|---|---|---|---|---|
| Inicial | 200 | 480 | ≈ $0,25 | ≈ $5 |
| Medio | 1.000 | 2.400 | ≈ $1,30 | ≈ $25 |
| Alto | 5.000 | 12.000 | ≈ $6,30 | ≈ $126 |

**Peor caso por cuenta** con el límite propuesto de 20 consultas al día (600 al mes): ≈ $0,32/mes con Haiku y ≈ $6,30/mes con Sonnet. Por eso **no se ofrece «uso ilimitado»**: el límite diario se aplica en el servidor y conviene fijar además un tope de gasto en la consola de Anthropic.

Las funciones de Vercel que transmiten la respuesta pasan casi todo el tiempo esperando al modelo; con el modelo de facturación por CPU activa, su costo es marginal frente al de la IA a estos volúmenes.

## Totales orientativos

| Escenario | Hosting | IA (Haiku) | IA (Sonnet) | Total con Haiku | Total con Sonnet |
|---|---|---|---|---|---|
| Inicial | $45 | $0,25 | $5 | ≈ $45 | ≈ $50 |
| Medio | $45 | $1,30 | $25 | ≈ $46 | ≈ $70 |
| Alto | $45 | $6,30 | $126 | ≈ $51 | ≈ $171 |

## Qué cambia frente al PDF

- El **PDF** es un archivo que la compradora conserva; no genera costos recurrentes.
- La **app** es un servicio alojado: tiene costo fijo mensual y depende de que el servicio siga activo.
- El **asistente con IA** tiene costo por cada consulta; por eso tiene límites y puede desactivarse sin afectar al resto de la app.

Conviene que las condiciones de venta no prometan lo mismo para los tres.
