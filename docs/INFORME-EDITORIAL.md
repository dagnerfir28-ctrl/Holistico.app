# Informe editorial

Resumen del trabajo sobre el contenido: qué se leyó, con qué criterios se importó, qué se corrigió, qué se retuvo y qué queda pendiente. Todos los cambios están registrados por actividad en `src/data/catalog.json` (campos `correcciones`, `incidencias`, `propuestas`, `clasificacion`, `fuentes`) y se ven en Administración.

## 1. Fuentes y acceso

| Fuente | Cómo se leyó | Resultado |
|---|---|---|
| PDF principal «Más de 60 dinámicas…» (129 páginas) | Las páginas son imágenes sin capa de texto. El entorno de trabajo no podía descargar archivos de Google Drive (el proxy devolvió **403** para `drive.google.com`), así que se leyó desde el visor de Drive en tu navegador y se transcribió visualmente página por página. | 62 páginas de ficha transcritas; hallazgos de documento en `contenido/fuentes-transcritas/principal/documento.json` |
| Edición 2 «Edición Enero» (138 páginas) | Tiene texto real; se usó para contrastar y recuperar contenido faltante | 65 entradas cotejadas |
| Sistema Profesional (50 páginas, imágenes) | Revisión de miniaturas y lectura detallada de pp. 2, 3, 4 y 27 | **No se importó** como catálogo (ver §8) |
| Pieza del bono «Asistente Holístico» | Lectura visual | Sus afirmaciones (24/7, uso ilimitado, «entrenado con más de 60 dinámicas») no se reproducen en la app |
| Landing y checkout | Solo lectura | **No se modificaron**. La app no reproduce cifras, reseñas, actividad en tiempo real ni escasez |
| Asistente existente | Se abrió sin hacer consultas (para no consumir créditos) | Se enlaza como recurso externo, sin afirmar nada sobre su contenido |
| Documentación de Hotmart (webhook 2.0.0) | La herramienta de lectura recibió un bloqueo 403 de CloudFront; se leyó desde tu navegador | Verificados: cabecera `X-HOTMART-HOTTOK`, campos `id`, `creation_date`, `event`, `version`, `data.product.id`, `data.buyer.email`, `data.purchase.transaction`, `data.purchase.status`, `order_bump`, y la lista de eventos de compra |

Nota de transparencia: para leer las páginas en imagen fue necesario capturar y ampliar zonas de la pantalla del visor. No se hicieron capturas con otro fin.

## 2. Criterios de importación

- **Una actividad = un desarrollo distinto.** Los duplicados exactos (p. 46 = p. 44 y p. 56 = p. 54, comprobados por comparación de píxeles) no cuentan como dinámicas nuevas.
- **No se infla el recuento**: no se dividieron actividades ni se contaron variantes como dinámicas aparte. Las versiones alternativas de la Edición 2 quedan como **variantes** dentro de su actividad, ocultas hasta que las apruebes.
- **Estados**: *publicada* (completa y sin problemas de seguridad), *en revisión* (requiere revisión especializada, decisión tuya o datos faltantes), *borrador* (incompleta), *archivada*.
- **Requisitos para publicar** (comprobados en la app y en el servidor): título, resumen, momento, formato, duración, fases con tiempo e instrucciones y opciones de participación.
- **Procedencia visible**: cada texto lleva su origen. Lo que no es literal de la fuente se marca en la ficha como «Corrección editorial» u «Orientación editorial».

**Resultado: 71 actividades únicas → 53 publicadas, 17 en revisión, 1 borrador.**

## 3. Problemas del PDF principal

- El índice anuncia «60+» dinámicas, 12 categorías y 141 páginas; muestra 9 categorías y 35 entradas, **falta el número 15** y **13 títulos del índice no tienen ficha** (Círculo de confianza, Mapa de la vida, Café Filosófico, Ritual de Transmutación, Laberinto del autodescubrimiento, Ritual de sanación ancestral, Círculo de Afirmaciones, Experimentando Colores, Ejercicio de Escucha Activa, Ritual del Espejo, Círculo de Sabiduría Colectiva, Ritual de Renacimiento Simbólico, Mapa de Cuentos).
- Página 38: plantilla «Reto de 30 días» con texto de relleno sin reemplazar.
- Páginas 46 y 56: repiten fichas anteriores; por eso «Viaje a través de los Chakras» y «Círculo de Transformación Alquímica» no tienen desarrollo en el PDF principal.
- Separadores que no coinciden con la ficha: p. 75 («Red de la Vida» → desarrolla «Meditación del Sonido Interior»); p. 125 («61 y 62», solo existe la 61).
- Fichas incompletas: p. 110 (texto cortado) y p. 112 («Ritual de Renacimiento» sin desarrollo).
- Numeración: «Dinámica final · 63 de 63», aunque hay 60 desarrollos distintos.

## 4. Edición 2

- 65 entradas cotejadas: equivalentes, recuperaciones de faltantes, versiones alternativas, variantes y novedades.
- Se recuperó el desarrollo de «Ritual de Renacimiento» (pp. 102–103) y de «Viaje a través de los Chakras» (pp. 48–49), ambos **en revisión** porque la Edición 2 no trae tiempos por fase.
- **9 actividades solo existen en la Edición 2** (Carta al Futuro, Círculo de Celebración, Ejercicio de Autoaceptación, Taller Terapéutico de Expresión Emocional, Meditación de Integración, Ritual de Conexión Ancestral, Dinámica de Coherencia Interior, Visualización del Lugar Seguro, Ceremonia de Reconocimiento Personal): quedan **en revisión** hasta tu aprobación; ninguna tiene duración ni tiempos por fase.
- **13 variantes** (por ejemplo, la versión sin retención ni contacto de «Respiración en Pareja» o la versión suave del «Viaje Chamánico») quedan **en revisión** dentro de su actividad.

## 5. Correcciones aplicadas (4)

| Actividad | Original | Corregido | Motivo |
|---|---|---|---|
| Círculo de Silencio Consciente | «…está bien — animales antes del silencio…» | «…está bien: avísales antes del silencio…» | Redacción defectuosa; se conserva el sentido |
| El Poder de las Emociones | «…suele ser que más necesitaba ser vista.» | «…suele ser la que más necesitaba ser vista.» | Falta el artículo |
| Conexión con los Cuatro Elementos | «…se estancan o desbordandepen y la capacidad…» | «…se estancan o desbordan, y la capacidad…» | Palabras unidas por error |
| Visualización del Lugar Seguro (en revisión) | «…surgida durante la [texto cortado]» | «…surgida durante la práctica» | Frase cortada; se completa con la palabra evidente (propuesta) |

## 6. Textos retenidos y propuestas (pendientes de tu aprobación)

Los textos retenidos **no se muestran a compradoras**; en Administración puedes aprobarlos o descartarlos.

| Actividad | Qué | Por qué |
|---|---|---|
| Meditación del Templo Interior | «Cuándo utilizarla» y «Cuándo evitarla» | Proceden del **Sistema Profesional** (producto aparte): falta una decisión comercial antes de mostrarlos |
| Ritual de Liberación | Una recomendación que afirma que la intensidad emocional «es exactamente lo que necesita ocurrir» | Presenta un resultado emocional como universal; se propone una redacción alternativa |
| Danza de Liberación Emocional (en revisión) | Recomendación 02: equipara el llanto con la eficacia de la dinámica y pide no intervenir | Contradice los límites del brief; se propone una reescritura |

## 7. Clasificación y orientaciones editoriales

- **Momento** (apertura, conexión, reflexión/exploración, integración, cierre), **intensidad** (suave, media, profunda), **experiencia de quien facilita** (inicial, intermedia, avanzada) y **espacio** son clasificaciones editoriales orientativas, basadas en el tipo, nivel y energía de la ficha y en su contenido. La ficha muestra también los valores literales de la fuente.
- **Opciones de participación** (222 textos de 12 fórmulas fijas: participar es voluntario, compartir es opcional, ojos abiertos, escritura privada, permiso antes del contacto, alternativa sin fuego, etc.), **criterios para pausar o adaptar** (40) y **preparación previa** (25) se añadieron a partir de un conjunto cerrado de fórmulas, marcadas como «Orientación editorial». Se agrupan en un bloque por ficha («Cuidado del grupo»), sin avisos genéricos en cada pantalla.
- Los porcentajes o puntuaciones de energía del Sistema Profesional **no se importaron** ni se presentan como científicos.

## 8. Qué no se importó

- **Sistema Profesional**: anuncia 108 dinámicas en 12 territorios; en las 50 páginas solo hay fichas de dos familias (Presencia y Atención; Conexión y Confianza) y presenta inconsistencias de códigos. No se importó como catálogo ni se incluyó en la oferta principal. Solo se usó como referencia interna (por ejemplo, para documentar que da 45–60 min a «Templo Interior»).
- **Los 4 adicionales de Hotmart**: no se incluyen como contenido desbloqueado; el webhook ignora cualquier producto que no sea el principal.

## 9. Actividades en revisión y borrador

| Actividad | Motivo principal |
|---|---|
| Viaje Chamánico Guiado | Busca «estados expandidos de conciencia» con tambor a 4–7 golpes/s y vendas en los ojos; requiere revisión especializada (hay una variante suave) |
| Camino de la Confianza | Desplazamiento con ojos cubiertos y una «caída de confianza» con riesgo de lesión |
| Respiración en Pareja | Respiración con retención (4·2·6) y contacto; existe una variante sin retención ni contacto |
| Neurociencia de la Transformación | Afirmaciones científicas que deben verificarse |
| Danza de Liberación Emocional | Recomendación sobre el llanto (ver §6) |
| El Puente de la Confianza | Recomendación cortada en la fuente; recorridos con vendas y «sostener» al compañero |
| Ritual de Renacimiento | Desarrollo recuperado de la Edición 2, sin tiempos por fase |
| Viaje a través de los Chakras | Desarrollo recuperado de la Edición 2, sin duración ni descripción de cada chakra |
| 9 actividades solo de la Edición 2 | Pendientes de tu aprobación; sin duración ni tiempos |
| Círculo de Transformación Alquímica (**borrador**) | El texto disponible termina en el acto simbólico: faltan integración, cierre y tiempos |

## 10. Discrepancias de tiempo documentadas

| Actividad | Duración indicada | Suma de fases |
|---|---|---|
| Meditación del Templo Interior | 60–75 min | 35–40 min (el Sistema Profesional indica 45–60) |
| Círculo de Espejos | 60–75 min | 40–55 min |
| Ritual de Liberación | 60–75 min | 50–55 min |
| El Templo del Útero | 60–75 min | 53–58 min |

La app muestra ambos datos y, al planificar, usa la duración máxima de la ficha por defecto; puedes ajustarla y queda marcada como «adaptada» si sale del rango.

## 11. Límites de contenido aplicados

- Ninguna pantalla promete sanación, seguridad total ni resultados emocionales universales; no se afirma que llorar demuestre que algo funciona ni que siempre haya que abstenerse de intervenir; se recuerda que la app no reemplaza la formación profesional.
- Las instrucciones permiten pasar, observar, mantener los ojos abiertos, evitar el contacto, detenerse y elegir alternativas.
- Lo que requiere revisión especializada sigue en revisión y no llega a compradoras.
- Algunas fichas publicadas usan la palabra «sanación» en sentido descriptivo o incluyen frases como «no intervengas» acompañadas de criterios de pausa: se mantuvieron por fidelidad a la fuente; puedes revisarlas en Administración si prefieres otra redacción.
