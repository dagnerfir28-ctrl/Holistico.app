# -*- coding: utf-8 -*-
"""
Decisiones editoriales de la copia de trabajo.

Todo lo que aparece aquí es CLASIFICACIÓN o ADAPTACIÓN editorial (no es texto de la
fuente), salvo los campos marcados como `fuente` (citas literales de las
recomendaciones de la propia ficha). El constructor del catálogo registra la
procedencia de cada campo.

Criterios usados (documentados también en docs/INFORME_EDITORIAL.md):

INTENSIDAD EMOCIONAL (clasificación editorial, no es una medición):
  suave    → presencia, gratitud, observación, compartir ligero. Suele coincidir con
             "Nivel: Apertura / Todos los niveles" de la fuente.
  media    → compartir experiencias o emociones personales, exposición moderada.
             Suele coincidir con "Nivel: Intermedio".
  profunda → heridas, culpa, perdón, sombra, vulnerabilidad, niño interior, duelo.
             Suele coincidir con "Nivel: Profundo".

EXPERIENCIA REQUERIDA DEL FACILITADOR (clasificación editorial):
  inicial    → estructura simple, baja activación emocional, sin técnicas especiales.
  intermedia → sostener compartir grupal o en parejas, narrar visualizaciones,
               preparar materiales o estaciones.
  avanzada   → procesos emocionales profundos, estados expandidos, riesgo físico o
               manejo de contingencias.

ESTADO EDITORIAL:
  publicado → revisada, completa y sin necesidad de revisión especializada.
  revision  → completa pero requiere revisión especializada o aprobación del
              propietario (riesgo físico, técnicas respiratorias con retención,
              inducción de estados, afirmaciones científicas, recomendaciones que
              contradicen los límites del brief, contenido solo de la Edición 2).
  borrador  → incompleta o con texto faltante.
  archivado → duplicados exactos (no se cuentan).
"""

# --- Opciones de consentimiento (adaptación editorial) ---------------------------
OPCIONES = {
    'voluntario': 'Participar es voluntario: cualquier persona puede pasar, observar o detenerse en cualquier momento, sin dar explicaciones.',
    'compartir': 'Compartir siempre es opcional y vale decir «paso». Acuerden al inicio que lo compartido queda en el grupo.',
    'ojos': 'Quien lo prefiera puede mantener los ojos abiertos, con la mirada suave hacia el suelo.',
    'escritura': 'Nadie necesita leer ni mostrar lo que escribe; puede guardarlo, romperlo o conservarlo en privado.',
    'contacto': 'Pide permiso antes de cualquier contacto físico y ofrece una alternativa sin contacto (una mano en el propio pecho, una inclinación de cabeza o una mirada).',
    'parejas': 'Quien no quiera trabajar en pareja puede hacer la práctica de forma individual o acompañar como observador.',
    'movimiento': 'Cada persona elige su ritmo: moverse suavemente, quedarse sentada o acompañar desde la quietud también es participar.',
    'fuego': 'Ofrece siempre una alternativa sin fuego (romper, enterrar o guardar el papel) para quien prefiera no usarlo.',
    'visualizacion': 'Si una imagen resulta incómoda, se puede abrir los ojos, volver a la respiración o dejar la visualización y descansar.',
    'exterior': 'Si alguien no puede o no quiere caminar o salir, ofrece un lugar cómodo desde donde participar.',
    'voz': 'Quien prefiera no vocalizar puede escuchar en silencio y respirar con el grupo.',
    'recibir': 'Quien prefiera no recibir reconocimiento en voz alta puede pedir recibirlo en silencio o por escrito.',
}

# --- Criterios de pausa (adaptación editorial, solo donde aplican) ---------------
PAUSA = {
    'emocion': 'Si alguien muestra angustia intensa (llanto que no cede, respiración agitada o desconexión), pausa la consigna general con calma, ofrece agua y un lugar aparte, y acompaña o pide a otra persona del equipo que acompañe.',
    'movimiento': 'Pausa la música si hay riesgo de choque, caída o mareo, y retoma cuando el espacio vuelva a ser seguro.',
    'fuego': 'Si el fuego se vuelve difícil de controlar (viento, chispas), suspende el acto con fuego y pasa a la alternativa sin fuego.',
    'exterior': 'Acorta o suspende el recorrido ante frío, calor intenso, terreno inseguro o cansancio del grupo.',
    'respiracion': 'Si alguien se marea o se incomoda con la respiración, vuelvan a la respiración natural antes de continuar.',
    'ojos_cubiertos': 'Detén el recorrido si alguien con los ojos cubiertos muestra miedo o pierde el equilibrio; puede seguir con los ojos abiertos.',
}

# --- Preparación editorial (solo donde aplica) -----------------------------------
PREP = {
    'fuego': 'Si usas fuego: recipiente resistente al calor, agua o arena a mano, lejos de telas y papeles, y siempre bajo supervisión. Respeta las normas del lugar.',
    'exterior': 'Recorre el lugar antes de la actividad: terreno, sombra, abrigo y un punto de reunión claro.',
    'movimiento': 'Despeja el espacio, marca sus límites y deja agua disponible.',
    'pausa_lugar': 'Ten pañuelos y un rincón tranquilo aparte para quien necesite una pausa.',
}

# Etiquetas de momentos del retiro
#   apertura · conexion · exploracion (reflexión o exploración) · integracion · cierre

P = {}

def act(page, **kw):
    P[page] = kw

# --------------------------------------------------------------------------- PDF principal
act(5, id='circulo-de-gratitud', momentos=['apertura', 'conexion'], temas=['gratitud', 'escucha', 'círculo'],
    formato=['grupo'], espacio={'tipo': 'interior'}, intensidad='suave', experiencia='inicial',
    estado='publicado', opciones=['voluntario', 'compartir'],
    utilizar=[('fuente', 'Para entrar en el retiro desde la presencia y la autenticidad (objetivo de la ficha).')],
    relacionadas=['ritual-de-gratitud-colectiva', 'meditacion-de-la-gratitud', 'circulo-de-escucha-consciente'],
    sistema='PA-01 / PA-S01 (pp. 7–9)')

act(7, id='meditacion-respiracion-consciente', momentos=['apertura', 'integracion'], temas=['respiración', 'atención plena', 'meditación'],
    formato=['grupo'], espacio={'tipo': 'interior'}, intensidad='suave', experiencia='inicial',
    estado='publicado', opciones=['voluntario', 'ojos', 'compartir'],
    relacionadas=['circulo-de-presencia', 'escaneo-corporal', 'meditacion-del-arbol'],
    sistema='PA-S02 (pp. 10–11)')

act(9, id='caminata-consciente', momentos=['apertura', 'integracion'], temas=['naturaleza', 'atención plena', 'movimiento suave'],
    formato=['grupo'], espacio={'tipo': 'exterior'}, intensidad='suave', experiencia='inicial',
    estado='publicado', opciones=['voluntario', 'ojos', 'exterior'], pausa=['exterior'], prep=['exterior'],
    relacionadas=['conexion-con-la-naturaleza', 'meditacion-del-arbol'],
    variantes=['ed2:55'], sistema='PA-S03 (pp. 13–14)')

act(11, id='meditacion-templo-interior', momentos=['exploracion'], temas=['visualización', 'introspección', 'calma'],
    formato=['grupo'], espacio={'tipo': 'interior'}, intensidad='profunda', experiencia='intermedia',
    estado='publicado', opciones=['voluntario', 'ojos', 'visualizacion', 'compartir', 'escritura'],
    utilizar=[('sistema', 'Apertura de retiro o jornada, inicio del día o después de actividades intensas, cuando el grupo está disperso o acelerado, o antes de procesos profundos (Sistema Profesional, p. 27).')],
    evitar=[('sistema', 'Cuando hay crisis emocional sin contención, cuando el grupo está muy resistente al silencio, en espacios ruidosos o con interrupciones constantes, o si hay participantes bajo efectos de sustancias (Sistema Profesional, p. 27).')],
    relacionadas=['visualizacion-del-futuro', 'meditacion-de-reconexion-interior'],
    incidencias=[('tiempos', 'media', 'La ficha indica 60–75 min, pero sus fases suman 35–40 min. El Sistema Profesional (p. 27) indica 45–60 min para la misma práctica.')],
    nota_duracion='La fuente indica 60–75 min; las fases descritas suman 35–40 min.',
    sistema='PA-A02 (pp. 26–28)')

act(13, id='circulo-de-espejos', momentos=['conexion', 'exploracion'], temas=['escucha', 'empatía', 'parejas'],
    formato=['parejas', 'grupo'], espacio={'tipo': 'interior'}, intensidad='media', experiencia='intermedia',
    estado='publicado', opciones=['voluntario', 'compartir', 'parejas'], pausa=['emocion'],
    relacionadas=['circulo-de-escucha-consciente', 'dinamica-de-conexion-humana'],
    variantes=['ed2:57'],
    incidencias=[('tiempos', 'media', 'La ficha indica 60–75 min, pero sus fases suman 40–55 min.')],
    nota_duracion='La fuente indica 60–75 min; las fases descritas suman 40–55 min.')

act(15, id='mandala-colectivo', momentos=['conexion', 'integracion'], temas=['arte', 'creatividad', 'unidad'],
    formato=['grupo'], espacio={'tipo': 'interior'}, intensidad='media', experiencia='intermedia',
    estado='publicado', opciones=['voluntario'],
    relacionadas=['taller-de-mandalas', 'red-de-la-vida'])

act(17, id='viaje-de-los-arquetipos', momentos=['exploracion'], temas=['arquetipos', 'autoconocimiento', 'sombra', 'estaciones'],
    formato=['grupo', 'individual'], espacio={'tipo': 'interior', 'amplio': True}, intensidad='profunda', experiencia='avanzada',
    estado='publicado', opciones=['voluntario', 'compartir', 'escritura'], pausa=['emocion'], prep=['pausa_lugar'],
    relacionadas=['espejo-de-las-sombras', 'conexion-con-el-nino-interior', 'integracion-sombra-luz'],
    incidencias=[('materiales', 'baja', 'La ficha no incluye lista de materiales; la preparación depende de las estaciones.')])

act(19, id='mesa-redonda-sobre-valores', momentos=['exploracion', 'conexion'], temas=['valores', 'diálogo', 'propósito'],
    formato=['grupo'], espacio={'tipo': 'interior'}, intensidad='profunda', experiencia='intermedia',
    estado='publicado', opciones=['voluntario', 'compartir', 'escritura'],
    relacionadas=['circulo-de-historias-de-vida', 'viaje-hindu-de-la-sabiduria-interior'],
    incidencias=[('campos', 'baja', 'La ficha no tiene sección «Objetivo»; se muestra la apertura de contexto.')])

act(21, id='jardin-de-las-emociones', momentos=['exploracion'], temas=['emociones', 'arte', 'naturaleza'],
    formato=['individual', 'grupo'], espacio={'tipo': 'ambos'}, intensidad='media', experiencia='intermedia',
    estado='publicado', opciones=['voluntario', 'compartir'], pausa=['emocion'],
    relacionadas=['viaje-de-las-emociones', 'el-poder-de-las-emociones'])

act(23, id='escritura-libre', momentos=['exploracion'], temas=['escritura', 'emociones', 'voz interior'],
    formato=['individual'], espacio={'tipo': 'interior'}, intensidad='suave', experiencia='inicial',
    estado='publicado', opciones=['voluntario', 'escritura', 'compartir'],
    relacionadas=['mapa-de-suenos-e-intenciones', 'conexion-con-el-nino-interior'])

act(25, id='ritual-de-liberacion', momentos=['exploracion', 'cierre'], temas=['soltar', 'ritual', 'escritura', 'fuego'],
    formato=['grupo', 'individual'], espacio={'tipo': 'ambos'}, intensidad='media', experiencia='intermedia',
    estado='publicado', opciones=['voluntario', 'escritura', 'fuego', 'compartir'], pausa=['fuego', 'emocion'], prep=['fuego'],
    relacionadas=['ritual-del-perdon', 'ritual-de-autoperdon', 'ritual-de-renacimiento'],
    incidencias=[('tiempos', 'media', 'La ficha indica 60–75 min, pero sus fases suman 50–55 min.')],
    nota_duracion='La fuente indica 60–75 min; las fases descritas suman 50–55 min.',
    retener=[('Si emergen emociones intensas durante el acto simbólico, sostén el espacio con calma — eso es exactamente lo que necesita ocurrir.',
              'Afirma que la intensidad emocional «es exactamente lo que necesita ocurrir»: presenta un resultado emocional como universal.',
              'Si emergen emociones intensas durante el acto simbólico, sostén el espacio con calma y ofrece la posibilidad de pausar, sentarse o tomar agua.')])

act(27, id='mapa-de-suenos-e-intenciones', momentos=['exploracion', 'integracion'], temas=['intención', 'visión', 'arte'],
    formato=['individual'], espacio={'tipo': 'interior'}, intensidad='suave', experiencia='inicial',
    estado='publicado', opciones=['voluntario', 'compartir'],
    relacionadas=['visualizacion-del-futuro', 'ceremonia-de-intenciones'])

act(29, id='conexion-con-el-nino-interior', momentos=['exploracion'], temas=['niño interior', 'compasión', 'visualización', 'escritura'],
    formato=['individual'], espacio={'tipo': 'interior'}, intensidad='profunda', experiencia='avanzada',
    estado='publicado', opciones=['voluntario', 'ojos', 'visualizacion', 'escritura', 'compartir'], pausa=['emocion'], prep=['pausa_lugar'],
    evitar=[('editorial', 'Evítala en la primera sesión o con un grupo que aún no tiene confianza ni un espacio de contención claro.')],
    relacionadas=['escritura-libre', 'espejo-de-las-sombras'])

act(31, id='circulo-de-escucha-consciente', momentos=['conexion'], temas=['escucha', 'círculo', 'presencia'],
    formato=['grupo'], espacio={'tipo': 'interior'}, intensidad='suave', experiencia='intermedia',
    estado='publicado', opciones=['voluntario', 'compartir'],
    relacionadas=['circulo-de-espejos', 'circulo-de-historias-de-vida'])

act(33, id='ceremonia-de-intenciones', momentos=['cierre', 'integracion'], temas=['intención', 'ritual', 'velas'],
    formato=['individual', 'grupo'], espacio={'tipo': 'interior'}, intensidad='suave', experiencia='inicial',
    estado='publicado', opciones=['voluntario', 'escritura', 'compartir'],
    utilizar=[('fuente', 'Como cierre del retiro: su energía de compromiso e intención funciona mejor al final del proceso.')],
    relacionadas=['circulo-de-compartir-intenciones', 'ritual-de-intencion-al-amanecer'])

act(35, id='bano-de-sonido-y-relajacion', momentos=['integracion', 'apertura'], temas=['sonido', 'relajación', 'descanso'],
    formato=['grupo'], espacio={'tipo': 'interior'}, intensidad='suave', experiencia='intermedia',
    estado='publicado', opciones=['voluntario', 'ojos'],
    relacionadas=['meditacion-del-sonido-interior', 'escaneo-corporal'])

act(37, id='circulo-de-historias-de-vida', momentos=['conexion', 'exploracion'], temas=['historias', 'escucha', 'círculo'],
    formato=['grupo'], espacio={'tipo': 'interior'}, intensidad='media', experiencia='intermedia',
    estado='publicado', opciones=['voluntario', 'compartir'], pausa=['emocion'],
    relacionadas=['circulo-de-escucha-consciente', 'dinamica-de-conexion-humana'],
    variantes=['ed2:40'])

act(40, id='conexion-con-la-naturaleza', momentos=['apertura', 'integracion'], temas=['naturaleza', 'sentidos', 'atención plena'],
    formato=['grupo'], espacio={'tipo': 'exterior'}, intensidad='suave', experiencia='inicial',
    estado='publicado', opciones=['voluntario', 'exterior', 'compartir'], pausa=['exterior'],
    relacionadas=['caminata-consciente', 'conexion-con-los-cuatro-elementos'],
    incidencias=[('materiales', 'baja', 'La ficha no incluye lista de materiales (describe espacios y sentidos).')])

act(42, id='ritual-de-gratitud-colectiva', momentos=['cierre'], temas=['gratitud', 'ritual', 'círculo'],
    formato=['grupo'], espacio={'tipo': 'interior'}, intensidad='suave', experiencia='inicial',
    estado='publicado', opciones=['voluntario', 'compartir', 'contacto'],
    utilizar=[('fuente', 'Como cierre del retiro: su energía de reconocimiento e integración sella la experiencia colectiva.')],
    relacionadas=['circulo-de-gratitud', 'circulo-de-cierre-del-retiro'],
    variantes=['ed2:64'])

act(44, id='visualizacion-del-futuro', momentos=['exploracion', 'integracion'], temas=['visión', 'visualización', 'escritura'],
    formato=['grupo'], espacio={'tipo': 'interior'}, intensidad='suave', experiencia='intermedia',
    estado='publicado', opciones=['voluntario', 'ojos', 'visualizacion', 'escritura', 'compartir'],
    relacionadas=['mapa-de-suenos-e-intenciones', 'meditacion-templo-interior'])

act(48, id='espejo-de-las-sombras', momentos=['exploracion'], temas=['sombra', 'autoconocimiento', 'escritura'],
    formato=['individual'], espacio={'tipo': 'interior'}, intensidad='profunda', experiencia='avanzada',
    estado='publicado', opciones=['voluntario', 'escritura', 'compartir'], pausa=['emocion'], prep=['pausa_lugar'],
    relacionadas=['integracion-sombra-luz', 'viaje-de-los-arquetipos'],
    incidencias=[('categoria', 'baja', 'El encabezado de la ficha la ubica en «Trabajando con los chakras y la energía», aunque el contenido trata la sombra personal.')])

act(50, id='ritual-del-perdon', momentos=['exploracion'], temas=['perdón', 'ritual', 'escritura', 'fuego'],
    formato=['individual'], espacio={'tipo': 'interior'}, intensidad='profunda', experiencia='avanzada',
    estado='publicado', opciones=['voluntario', 'escritura', 'fuego', 'compartir'], pausa=['emocion', 'fuego'], prep=['fuego', 'pausa_lugar'],
    relacionadas=['ritual-de-autoperdon', 'ritual-de-liberacion'])

act(52, id='constelacion-onirica', momentos=['exploracion'], temas=['sueños', 'símbolos', 'escritura'],
    formato=['individual'], espacio={'tipo': 'interior'}, intensidad='media', experiencia='intermedia',
    estado='publicado', opciones=['voluntario', 'escritura', 'compartir'],
    relacionadas=['viaje-de-los-arquetipos', 'escritura-libre'])

act(54, id='viaje-chamanico-guiado', momentos=['exploracion'], temas=['tambor', 'visualización', 'estados expandidos'],
    formato=['grupo'], espacio={'tipo': 'interior'}, intensidad='profunda', experiencia='avanzada',
    estado='revision', opciones=['voluntario', 'ojos', 'visualizacion', 'compartir'], pausa=['emocion'],
    motivo='Requiere revisión especializada: busca «estados expandidos de conciencia» con tambor a 4–7 golpes por segundo y vendas en los ojos; la propia ficha recomienda experiencia previa del facilitador. La Edición 2 trae una versión más suave (variante pendiente).',
    variantes=['ed2:25'],
    relacionadas=['meditacion-templo-interior', 'constelacion-onirica'])

act(58, id='escaneo-corporal', momentos=['apertura', 'integracion'], temas=['cuerpo', 'atención plena', 'relajación'],
    formato=['grupo'], espacio={'tipo': 'interior'}, intensidad='suave', experiencia='inicial',
    estado='publicado', opciones=['voluntario', 'ojos', 'compartir'],
    utilizar=[('fuente', 'Como apertura del día en un retiro: prepara el cuerpo y la mente para recibir lo que viene con más presencia.')],
    relacionadas=['meditacion-respiracion-consciente', 'ritual-de-agradecimiento-al-cuerpo'])

act(60, id='circulo-de-compartir-intenciones', momentos=['apertura', 'cierre'], temas=['intención', 'círculo', 'palabra'],
    formato=['grupo'], espacio={'tipo': 'interior'}, intensidad='suave', experiencia='inicial',
    estado='publicado', opciones=['voluntario', 'compartir', 'escritura'],
    utilizar=[('fuente', 'Al inicio del retiro siembra dirección; al cierre sella el compromiso personal con lo vivido.')],
    relacionadas=['ceremonia-de-intenciones', 'ritual-de-intencion-al-amanecer'])

act(62, id='meditacion-del-arbol', momentos=['apertura'], temas=['naturaleza', 'enraizamiento', 'visualización'],
    formato=['grupo'], espacio={'tipo': 'ambos'}, intensidad='suave', experiencia='inicial',
    estado='publicado', opciones=['voluntario', 'ojos'],
    utilizar=[('fuente', 'Como apertura del día: enraíza al grupo antes de cualquier actividad más intensa o emocionalmente profunda.')],
    relacionadas=['escaneo-corporal', 'conexion-con-la-naturaleza'])

act(64, id='viaje-de-las-emociones', momentos=['exploracion'], temas=['emociones', 'meditación', 'expresión creativa'],
    formato=['grupo'], espacio={'tipo': 'interior'}, intensidad='media', experiencia='intermedia',
    estado='publicado', opciones=['voluntario', 'ojos', 'visualizacion', 'compartir'], pausa=['emocion'], prep=['pausa_lugar'],
    relacionadas=['jardin-de-las-emociones', 'el-poder-de-las-emociones'])

act(66, id='circulo-de-silencio-consciente', momentos=['integracion', 'apertura'], temas=['silencio', 'presencia', 'círculo'],
    formato=['grupo'], espacio={'tipo': 'interior'}, intensidad='suave', experiencia='inicial',
    estado='publicado', opciones=['voluntario', 'ojos', 'compartir'],
    relacionadas=['circulo-de-presencia', 'meditacion-respiracion-consciente'],
    correcciones=[('desarrollo.silencio-compartido.nota', 'Si alguien siente incomodidad o necesita moverse, está bien — animales antes del silencio a que eso también es parte de la práctica.', 'Si alguien siente incomodidad o necesita moverse, está bien: avísales antes del silencio que eso también es parte de la práctica.', 'Redacción defectuosa en la fuente («animales antes del silencio a que»); se corrige conservando el sentido.')])

act(68, id='camino-de-la-confianza', momentos=['conexion'], temas=['confianza', 'parejas', 'movimiento'],
    formato=['parejas', 'grupo'], espacio={'tipo': 'ambos', 'amplio': True}, intensidad='media', experiencia='avanzada',
    estado='revision', opciones=['voluntario', 'parejas', 'contacto', 'ojos'], pausa=['ojos_cubiertos', 'emocion'],
    motivo='Requiere revisión especializada: incluye desplazamiento con ojos cubiertos y una «caída de confianza» (variante C) con riesgo de lesión.',
    variantes=['ed2:32'],
    relacionadas=['el-puente-de-la-confianza', 'respiracion-en-pareja'])

act(70, id='ceremonia-de-la-luz-interior', momentos=['cierre'], temas=['reconocimiento', 'ritual', 'velas'],
    formato=['grupo'], espacio={'tipo': 'interior'}, intensidad='media', experiencia='intermedia',
    estado='publicado', opciones=['voluntario', 'recibir', 'compartir'],
    utilizar=[('fuente', 'Al cierre del retiro, cuando el grupo ya se conoce lo suficiente para que el reconocimiento sea genuino y profundo.')],
    relacionadas=['circulo-de-reconocimiento-y-alabanza', 'circulo-de-cierre-del-retiro'],
    variantes=['ed2:33'])

act(72, id='respiracion-en-pareja', momentos=['conexion'], temas=['respiración', 'parejas', 'presencia'],
    formato=['parejas'], espacio={'tipo': 'interior'}, intensidad='media', experiencia='avanzada',
    estado='revision', opciones=['voluntario', 'parejas', 'contacto', 'ojos'], pausa=['respiracion', 'emocion'],
    motivo='Requiere revisión especializada: incluye un ritmo con retención (4·2·6), respiración alternada y una postura con la mano en el pecho del compañero. La Edición 2 trae una versión sin retención ni contacto (variante pendiente).',
    variantes=['ed2:34'],
    relacionadas=['circulo-de-espejos', 'camino-de-la-confianza'])

act(74, id='red-de-la-vida', momentos=['conexion', 'cierre'], temas=['interdependencia', 'grupo', 'gratitud'],
    formato=['grupo'], espacio={'tipo': 'interior', 'amplio': True}, intensidad='suave', experiencia='inicial',
    estado='publicado', opciones=['voluntario', 'compartir'],
    relacionadas=['mandala-colectivo', 'dinamica-de-conexion-humana'])

act(76, id='meditacion-del-sonido-interior', momentos=['exploracion', 'apertura'], temas=['voz', 'sonido', 'mantras'],
    formato=['grupo'], espacio={'tipo': 'interior'}, intensidad='suave', experiencia='intermedia',
    estado='publicado', opciones=['voluntario', 'voz', 'ojos'],
    relacionadas=['bano-de-sonido-y-relajacion'],
    incidencias=[('separador', 'media', 'El separador de la página 75 dice «36. Red de la Vida», pero la ficha desarrolla «Meditación del Sonido Interior». Se usa el título de la ficha.')])

act(78, id='ley-de-la-atraccion-consciente', momentos=['exploracion', 'integracion'], temas=['intención', 'creencias', 'acción'],
    formato=['individual'], espacio={'tipo': 'interior'}, intensidad='suave', experiencia='intermedia',
    estado='publicado', opciones=['voluntario', 'escritura', 'compartir'],
    relacionadas=['mapa-de-suenos-e-intenciones', 'neurociencia-de-la-transformacion'],
    notas_admin=['La recomendación 01 sugiere presentarla «desde la psicología y la neurociencia»: conviene revisar que el encuadre no se presente como evidencia científica.'])

act(80, id='el-poder-de-las-emociones', momentos=['exploracion'], temas=['emociones', 'inteligencia emocional', 'escritura'],
    formato=['individual'], espacio={'tipo': 'interior'}, intensidad='media', experiencia='intermedia',
    estado='publicado', opciones=['voluntario', 'escritura', 'compartir'], pausa=['emocion'], prep=['pausa_lugar'],
    relacionadas=['jardin-de-las-emociones', 'viaje-de-las-emociones'],
    correcciones=[('recomendaciones.1', 'la emoción que aparece durante la práctica suele ser que más necesitaba ser vista.', 'la emoción que aparece durante la práctica suele ser la que más necesitaba ser vista.', 'Falta de artículo en la fuente.')])

act(82, id='circulo-de-reconocimiento-y-alabanza', momentos=['cierre'], temas=['reconocimiento', 'círculo', 'palabra'],
    formato=['grupo'], espacio={'tipo': 'interior'}, intensidad='media', experiencia='intermedia',
    estado='publicado', opciones=['voluntario', 'recibir', 'escritura'],
    utilizar=[('fuente', 'Cuando el grupo ha compartido al menos dos días juntos: el reconocimiento genuino requiere tiempo y experiencias vividas en conjunto.')],
    relacionadas=['ceremonia-de-la-luz-interior', 'circulo-de-cierre-del-retiro'])

act(84, id='ritual-de-autoperdon', momentos=['exploracion'], temas=['autoperdón', 'culpa', 'ritual', 'escritura'],
    formato=['individual'], espacio={'tipo': 'interior'}, intensidad='profunda', experiencia='avanzada',
    estado='publicado', opciones=['voluntario', 'escritura', 'fuego', 'compartir'], pausa=['emocion', 'fuego'], prep=['fuego', 'pausa_lugar'],
    relacionadas=['ritual-del-perdon', 'ritual-de-liberacion'])

act(86, id='viaje-hindu-de-la-sabiduria-interior', momentos=['exploracion'], temas=['propósito', 'filosofía', 'reflexión'],
    formato=['individual', 'grupo'], espacio={'tipo': 'interior'}, intensidad='media', experiencia='intermedia',
    estado='publicado', opciones=['voluntario', 'escritura', 'compartir', 'voz'],
    variantes=['ed2:41'],
    relacionadas=['mesa-redonda-sobre-valores', 'meditacion-del-sonido-interior'])

act(88, id='danza-de-la-conciencia-corporal', momentos=['integracion', 'exploracion'], temas=['danza', 'movimiento', 'cuerpo'],
    formato=['grupo'], espacio={'tipo': 'interior', 'amplio': True}, intensidad='media', experiencia='intermedia',
    estado='publicado', opciones=['voluntario', 'movimiento', 'contacto'], pausa=['movimiento'], prep=['movimiento'],
    titulo='Danza de la Conciencia Corporal',
    relacionadas=['danza-extatica', 'escaneo-corporal'],
    notas_admin=['La ficha menciona que los cinco ritmos están inspirados en el método de Gabrielle Roth; verificar cómo se presenta esa referencia a un método de terceros.'])

act(90, id='integracion-sombra-luz', momentos=['exploracion', 'integracion'], temas=['sombra', 'autoconocimiento', 'escritura'],
    formato=['individual'], espacio={'tipo': 'interior'}, intensidad='profunda', experiencia='avanzada',
    estado='publicado', opciones=['voluntario', 'escritura', 'compartir'], pausa=['emocion'], prep=['pausa_lugar'],
    relacionadas=['espejo-de-las-sombras', 'viaje-de-los-arquetipos'])

act(92, id='taller-de-mandalas', momentos=['exploracion', 'integracion'], temas=['arte', 'mandala', 'meditación'],
    formato=['individual'], espacio={'tipo': 'interior'}, intensidad='suave', experiencia='inicial',
    estado='publicado', opciones=['voluntario', 'compartir'],
    relacionadas=['mandala-colectivo'],
    incidencias=[('maquetacion', 'baja', 'La parte inferior de la página 92 usa un formato distinto al resto (texto plano); el contenido es completo.')])

act(94, id='meditacion-de-la-compasion-universal', momentos=['exploracion', 'conexion'], temas=['compasión', 'meditación', 'bondad'],
    formato=['grupo'], espacio={'tipo': 'interior'}, intensidad='media', experiencia='intermedia',
    estado='publicado', opciones=['voluntario', 'ojos', 'compartir'], pausa=['emocion'],
    variantes=['ed2:42'],
    relacionadas=['meditacion-del-corazon-abierto', 'ritual-del-perdon'])

act(96, id='el-templo-del-utero', momentos=['exploracion'], temas=['centro creador', 'intuición', 'meditación'],
    formato=['individual'], espacio={'tipo': 'interior'}, intensidad='profunda', experiencia='avanzada',
    estado='publicado', opciones=['voluntario', 'ojos', 'visualizacion', 'escritura', 'compartir'], pausa=['emocion'], prep=['pausa_lugar'],
    relacionadas=['meditacion-del-corazon-abierto', 'conexion-con-el-nino-interior'],
    incidencias=[('tiempos', 'media', 'La ficha indica 60–75 min, pero sus fases suman 53–58 min.')],
    nota_duracion='La fuente indica 60–75 min; las fases descritas suman 53–58 min.')

act(98, id='danza-extatica', momentos=['integracion', 'cierre'], temas=['danza', 'movimiento', 'gozo'],
    formato=['grupo'], espacio={'tipo': 'interior', 'amplio': True}, intensidad='media', experiencia='intermedia',
    estado='publicado', opciones=['voluntario', 'movimiento', 'contacto'], pausa=['movimiento', 'emocion'], prep=['movimiento'],
    relacionadas=['danza-de-la-conciencia-corporal'])

act(100, id='neurociencia-de-la-transformacion', momentos=['integracion'], temas=['hábitos', 'cambio', 'reflexión'],
    formato=['grupo', 'individual'], espacio={'tipo': 'interior'}, intensidad='suave', experiencia='intermedia',
    estado='revision', opciones=['voluntario', 'escritura', 'compartir'],
    motivo='Requiere revisión especializada: presenta afirmaciones científicas que deben verificarse (reconsolidación de la memoria como «reescribir la historia», neuronas espejo, «recablear tu cerebro», «el retiro es un estado óptimo para el cambio real»).',
    relacionadas=['ley-de-la-atraccion-consciente'])

act(102, id='circulo-de-vulnerabilidad', momentos=['conexion', 'exploracion'], temas=['vulnerabilidad', 'círculo', 'escucha'],
    formato=['grupo'], espacio={'tipo': 'interior'}, intensidad='profunda', experiencia='avanzada',
    estado='publicado', opciones=['voluntario', 'compartir'], pausa=['emocion'], prep=['pausa_lugar'],
    evitar=[('fuente', 'En la primera sesión del retiro: requiere que el grupo tenga un nivel mínimo de confianza previo.')],
    relacionadas=['circulo-de-historias-de-vida', 'circulo-de-escucha-consciente'])

act(104, id='conexion-con-los-cuatro-elementos', momentos=['exploracion', 'apertura'], temas=['naturaleza', 'elementos', 'estaciones'],
    formato=['grupo', 'individual'], espacio={'tipo': 'ambos'}, intensidad='suave', experiencia='intermedia',
    estado='publicado', opciones=['voluntario', 'escritura', 'compartir'], prep=['fuego'],
    relacionadas=['conexion-con-la-naturaleza', 'meditacion-del-arbol'],
    correcciones=[('secciones.0.items.1', 'Las emociones que fluyen, se estancan o desbordandepen y la capacidad de adaptarse.', 'Las emociones que fluyen, se estancan o desbordan, y la capacidad de adaptarse.', 'Palabras unidas por error en la fuente.')])

act(106, id='danza-de-liberacion-emocional', momentos=['exploracion'], temas=['danza', 'emociones', 'movimiento'],
    formato=['grupo'], espacio={'tipo': 'interior', 'amplio': True}, intensidad='profunda', experiencia='avanzada',
    estado='revision', opciones=['voluntario', 'movimiento'], pausa=['movimiento', 'emocion'], prep=['movimiento', 'pausa_lugar'],
    motivo='La recomendación 02 afirma que el llanto es señal de que la dinámica funciona y pide no intervenir; contradice los límites del brief y necesita reescritura aprobada. La versión de la Edición 2 no incluye esa frase.',
    propuesta=[('recomendaciones.1', 'Si alguien llora o se emociona durante el movimiento, sostén el espacio con presencia tranquila y ofrécele la posibilidad de pausar, sentarse o tomar agua; no hace falta interrumpir si la persona está bien acompañada.')],
    relacionadas=['danza-de-la-conciencia-corporal', 'danza-extatica'])

act(108, id='meditacion-de-la-gratitud', momentos=['apertura', 'integracion'], temas=['gratitud', 'meditación', 'presencia'],
    formato=['grupo'], espacio={'tipo': 'interior'}, intensidad='suave', experiencia='inicial',
    estado='publicado', opciones=['voluntario', 'ojos', 'compartir'],
    utilizar=[('fuente', 'Como apertura del día: la gratitud pone al grupo en un estado receptivo y abierto para lo que viene.')],
    relacionadas=['circulo-de-gratitud', 'ritual-de-gratitud-colectiva'])

act(110, id='el-puente-de-la-confianza', momentos=['conexion'], temas=['confianza', 'cooperación', 'parejas'],
    formato=['parejas'], espacio={'tipo': 'ambos', 'amplio': True}, intensidad='media', experiencia='avanzada',
    estado='revision', opciones=['voluntario', 'parejas', 'contacto', 'ojos'], pausa=['ojos_cubiertos', 'emocion'],
    motivo='Requiere revisión: la recomendación 02 está cortada en la fuente y la dinámica propone recorridos con vendas opcionales y «sostener» al compañero sin precisar la técnica.',
    relacionadas=['camino-de-la-confianza'],
    incidencias=[('texto_cortado', 'media', 'La recomendación 02 termina a mitad de frase («…personas que aún no se») y no hay recomendación 03. La Edición 2 (p. 101) trae el cierre completo de la dinámica.')])

act(112, id='ritual-de-renacimiento', momentos=['cierre', 'exploracion'], temas=['renacimiento', 'soltar', 'ritual', 'fuego'],
    formato=['individual', 'grupo'], espacio={'tipo': 'interior'}, intensidad='media', experiencia='intermedia',
    estado='revision', opciones=['voluntario', 'escritura', 'fuego', 'compartir'], pausa=['emocion', 'fuego'], prep=['fuego'],
    motivo='La ficha del PDF principal termina tras las preguntas de reflexión. El desarrollo se recuperó de la Edición 2 (pp. 102–103), sin tiempos por fase: pendiente de aprobación.',
    recuperar='ed2:48',
    relacionadas=['ritual-de-liberacion', 'circulo-de-cierre-del-retiro'],
    incidencias=[('incompleta', 'alta', 'Página 112: faltan desarrollo, integración, cierre y recomendaciones en el PDF principal.')])

act(114, id='circulo-de-presencia', momentos=['apertura', 'integracion'], temas=['presencia', 'silencio', 'atención plena'],
    formato=['grupo'], espacio={'tipo': 'interior'}, intensidad='suave', experiencia='inicial',
    estado='publicado', opciones=['voluntario', 'ojos', 'compartir'],
    utilizar=[('fuente', 'Como transición entre dinámicas intensas: devuelve al grupo al cuerpo y al presente cuando la mente se ha activado demasiado.')],
    relacionadas=['circulo-de-silencio-consciente', 'meditacion-respiracion-consciente'])

act(116, id='meditacion-del-corazon-abierto', momentos=['exploracion', 'conexion'], temas=['corazón', 'empatía', 'meditación'],
    formato=['grupo'], espacio={'tipo': 'interior'}, intensidad='suave', experiencia='inicial',
    estado='publicado', opciones=['voluntario', 'ojos', 'compartir'],
    utilizar=[('fuente', 'Como preparación para dinámicas de mayor profundidad emocional: abre el terreno de la receptividad antes del trabajo más intenso.')],
    relacionadas=['meditacion-de-la-compasion-universal', 'el-templo-del-utero'])

act(118, id='circulo-de-reflexion-nocturna', momentos=['integracion', 'cierre'], temas=['reflexión', 'noche', 'círculo'],
    formato=['grupo'], espacio={'tipo': 'ambos'}, intensidad='suave', experiencia='inicial',
    estado='publicado', opciones=['voluntario', 'compartir'], prep=['fuego'],
    utilizar=[('fuente', 'Al final de cada día del retiro; es un cierre, no una apertura.')],
    relacionadas=['meditacion-de-reconexion-interior', 'circulo-de-cierre-del-retiro'])

act(120, id='ritual-de-agradecimiento-al-cuerpo', momentos=['integracion', 'exploracion'], temas=['cuerpo', 'gratitud', 'autocuidado'],
    formato=['individual'], espacio={'tipo': 'interior'}, intensidad='media', experiencia='intermedia',
    estado='publicado', opciones=['voluntario', 'ojos', 'escritura', 'compartir'], pausa=['emocion'], prep=['pausa_lugar'],
    utilizar=[('fuente', 'Con grupos de alta autoexigencia (deportistas, profesionales del cuidado o personas en procesos de recuperación física o emocional).')],
    relacionadas=['escaneo-corporal', 'meditacion-del-corazon-abierto'])

act(122, id='circulo-de-cierre-del-retiro', momentos=['cierre'], temas=['cierre', 'gratitud', 'despedida', 'círculo'],
    formato=['grupo'], espacio={'tipo': 'ambos'}, intensidad='suave', experiencia='intermedia',
    estado='publicado', opciones=['voluntario', 'compartir', 'contacto'], prep=['fuego'],
    variantes=['ed2:60', 'ed2:65', 'ed2:30'],
    relacionadas=['ritual-de-gratitud-colectiva', 'circulo-de-reconocimiento-y-alabanza'])

act(124, id='ritual-de-intencion-al-amanecer', momentos=['apertura', 'cierre'], temas=['intención', 'amanecer', 'naturaleza'],
    formato=['individual', 'grupo'], espacio={'tipo': 'exterior'}, intensidad='suave', experiencia='inicial',
    estado='publicado', opciones=['voluntario', 'escritura', 'compartir', 'exterior'], pausa=['exterior'], prep=['exterior'],
    utilizar=[('fuente', 'Al inicio del retiro orienta el proceso; al final lo consolida y lo lleva de regreso a la vida cotidiana.')],
    relacionadas=['ceremonia-de-intenciones', 'circulo-de-compartir-intenciones'])

act(126, id='meditacion-de-reconexion-interior', momentos=['integracion'], temas=['escucha interior', 'meditación', 'calma'],
    formato=['individual', 'grupo'], espacio={'tipo': 'interior'}, intensidad='suave', experiencia='inicial',
    estado='publicado', opciones=['voluntario', 'ojos', 'escritura', 'compartir'],
    utilizar=[('fuente', 'En momentos de alta carga emocional del retiro, cuando el grupo necesita desacelerar y volver a sí mismo antes de continuar.')],
    relacionadas=['circulo-de-presencia', 'meditacion-templo-interior'],
    incidencias=[('separador', 'media', 'El separador de la página 125 dice «61 Y 62», pero solo existe una dinámica (61). No hay dinámica 62 en el PDF principal.')])

act(128, id='dinamica-de-conexion-humana', momentos=['conexion', 'cierre'], temas=['conexión', 'conversación', 'parejas'],
    formato=['parejas', 'grupo'], espacio={'tipo': 'interior'}, intensidad='media', experiencia='intermedia',
    estado='publicado', opciones=['voluntario', 'compartir', 'parejas'], pausa=['emocion'],
    utilizar=[('fuente', 'También puede cerrar cualquier retiro.')],
    relacionadas=['circulo-de-espejos', 'circulo-de-historias-de-vida'],
    incidencias=[('numeracion', 'baja', 'Se presenta como «Dinámica final · 63 de 63», aunque el PDF contiene 60 desarrollos distintos.')])

# --------------------------------------------------------------------------- Recuperadas / Edición 2
E = {}

def ed2(n, **kw):
    E[n] = kw

ed2(21, id='viaje-a-traves-de-los-chakras', titulo='Viaje a través de los Chakras', momentos=['exploracion'], temas=['cuerpo', 'energía', 'meditación'],
    formato=['grupo'], espacio={'tipo': 'interior'}, intensidad='suave', experiencia='intermedia',
    estado='revision', opciones=['voluntario', 'ojos', 'compartir'],
    motivo='El separador existe en el PDF principal (p. 45) pero su página repite «Visualización del Futuro». El desarrollo se recuperó de la Edición 2 (pp. 48–49); faltan duración, tiempos por fase y el detalle de cada centro energético.',
    principal_sep=45, relacionadas=['escaneo-corporal', 'meditacion-del-arbol'])

ed2(26, id='circulo-de-transformacion-alquimica', titulo='Círculo de Transformación Alquímica', momentos=['exploracion'], temas=['transformación', 'ritual', 'escritura', 'fuego'],
    formato=['grupo'], espacio={'tipo': 'interior'}, intensidad='media', experiencia='intermedia',
    estado='borrador', opciones=['voluntario', 'escritura', 'fuego', 'compartir'], prep=['fuego'],
    motivo='El separador existe en el PDF principal (p. 55) pero su página repite «Viaje Chamánico Guiado». El texto de la Edición 2 (p. 59) termina en el acto simbólico: faltan integración, cierre, duración y tiempos.',
    principal_sep=55, relacionadas=['ritual-de-liberacion', 'ritual-de-renacimiento'])

ed2(35, id='carta-al-futuro', momentos=['integracion', 'cierre'], temas=['escritura', 'visión', 'intención'],
    formato=['individual'], espacio={'tipo': 'interior'}, intensidad='suave', experiencia='inicial',
    estado='revision', opciones=['voluntario', 'escritura'],
    motivo='Solo aparece en la Edición 2: pendiente de aprobación del propietario. Sin duración ni tiempos por fase.',
    relacionadas=['visualizacion-del-futuro', 'mapa-de-suenos-e-intenciones'])

ed2(36, id='circulo-de-celebracion', momentos=['cierre'], temas=['celebración', 'gratitud', 'círculo'],
    formato=['grupo'], espacio={'tipo': 'ambos'}, intensidad='suave', experiencia='inicial',
    estado='revision', opciones=['voluntario', 'compartir', 'movimiento'],
    motivo='Solo aparece en la Edición 2: pendiente de aprobación. Su estructura de compartir es parecida a los cierres; confirmar si se mantiene como actividad propia.',
    relacionadas=['circulo-de-cierre-del-retiro', 'ritual-de-gratitud-colectiva'])

ed2(37, id='ejercicio-de-autoaceptacion', momentos=['exploracion'], temas=['autoaceptación', 'compasión', 'escritura'],
    formato=['individual'], espacio={'tipo': 'interior'}, intensidad='media', experiencia='intermedia',
    estado='revision', opciones=['voluntario', 'escritura', 'compartir'], pausa=['emocion'],
    motivo='Solo aparece en la Edición 2: pendiente de aprobación. Sin duración ni tiempos por fase.',
    relacionadas=['ritual-de-autoperdon', 'espejo-de-las-sombras'])

ed2(38, id='taller-de-expresion-emocional', titulo='Taller Terapéutico de Expresión Emocional', momentos=['exploracion'], temas=['emociones', 'expresión', 'arte'],
    formato=['grupo', 'individual'], espacio={'tipo': 'interior'}, intensidad='media', experiencia='intermedia',
    estado='revision', opciones=['voluntario', 'compartir', 'movimiento', 'escritura'], pausa=['emocion'],
    motivo='Solo aparece en la Edición 2: pendiente de aprobación. El término «terapéutico» del título puede sugerir un servicio clínico.',
    relacionadas=['jardin-de-las-emociones', 'el-poder-de-las-emociones'])

ed2(50, id='meditacion-de-integracion', momentos=['integracion', 'cierre'], temas=['integración', 'meditación', 'calma'],
    formato=['grupo'], espacio={'tipo': 'interior'}, intensidad='suave', experiencia='inicial',
    estado='revision', opciones=['voluntario', 'ojos', 'escritura'],
    motivo='Solo aparece en la Edición 2: pendiente de aprobación. Sin duración ni tiempos por fase.',
    relacionadas=['meditacion-de-reconexion-interior', 'circulo-de-reflexion-nocturna'])

ed2(51, id='ritual-de-conexion-ancestral', momentos=['exploracion'], temas=['raíces', 'familia', 'ritual'],
    formato=['individual', 'grupo'], espacio={'tipo': 'interior'}, intensidad='media', experiencia='intermedia',
    estado='revision', opciones=['voluntario', 'escritura', 'compartir'], pausa=['emocion'],
    motivo='Solo aparece en la Edición 2: pendiente de aprobación. Sin duración ni tiempos por fase.',
    relacionadas=['circulo-de-historias-de-vida'])

ed2(52, id='dinamica-de-coherencia-interior', momentos=['exploracion', 'integracion'], temas=['valores', 'coherencia', 'escritura'],
    formato=['individual'], espacio={'tipo': 'interior'}, intensidad='suave', experiencia='inicial',
    estado='revision', opciones=['voluntario', 'escritura', 'compartir'],
    motivo='Solo aparece en la Edición 2: pendiente de aprobación. Tema cercano a «Mesa Redonda sobre Valores» en formato individual.',
    relacionadas=['mesa-redonda-sobre-valores'])

ed2(58, id='visualizacion-del-lugar-seguro', momentos=['apertura', 'integracion'], temas=['calma', 'visualización', 'seguridad'],
    formato=['grupo'], espacio={'tipo': 'interior'}, intensidad='suave', experiencia='intermedia',
    estado='revision', opciones=['voluntario', 'ojos', 'visualizacion', 'escritura'],
    motivo='Solo aparece en la Edición 2: pendiente de aprobación. El último párrafo está cortado en la fuente.',
    correcciones=[('pasos.ultimo', 'Quienes lo deseen pueden escribir o compartir alguna sensación surgida durante la [texto cortado en la fuente]', 'Quienes lo deseen pueden escribir o compartir alguna sensación surgida durante la práctica.', 'Frase cortada en la fuente; se completa con la palabra evidente por el contexto (propuesta).')],
    relacionadas=['meditacion-templo-interior', 'meditacion-de-reconexion-interior'])

ed2(59, id='ceremonia-de-reconocimiento-personal', momentos=['cierre', 'integracion'], temas=['reconocimiento', 'autovaloración', 'escritura'],
    formato=['grupo', 'individual'], espacio={'tipo': 'interior'}, intensidad='suave', experiencia='inicial',
    estado='revision', opciones=['voluntario', 'escritura', 'compartir'],
    motivo='Solo aparece en la Edición 2: pendiente de aprobación. Sin duración ni tiempos por fase.',
    relacionadas=['circulo-de-reconocimiento-y-alabanza', 'ceremonia-de-la-luz-interior'])

# Títulos normalizados por variante (Edición 2) y su relación con la actividad base
VARIANTES = {
    'ed2:55': 'Variante al amanecer (Edición 2, «Caminata al Amanecer»)',
    'ed2:57': 'Variante sin reflejo (Edición 2, «Dinámica de Escucha Profunda»)',
    'ed2:40': 'Variante centrada en transformaciones (Edición 2, «Círculo de Historias Transformadoras»)',
    'ed2:41': 'Variante sin marco filosófico hindú (Edición 2, «El Viaje de la Sabiduría Interior»)',
    'ed2:42': 'Versión breve (Edición 2, «Meditación de la Compasión»)',
    'ed2:64': 'Variante centrada en el grupo (Edición 2, «Ritual de Gratitud al Grupo»)',
    'ed2:60': 'Versión narrativa (Edición 2, «Cierre de Integración Colectiva»)',
    'ed2:65': 'Versión narrativa (Edición 2, «Ceremonia de Cierre Final»)',
    'ed2:30': 'Variante de cierre y renacimiento (Edición 2, «Ritual de Cierre y Renacimiento»)',
    'ed2:34': 'Versión sin retención ni contacto (Edición 2)',
    'ed2:25': 'Versión de visualización suave (Edición 2)',
    'ed2:32': 'Versión de un solo formato, sin caída de confianza (Edición 2)',
    'ed2:33': 'Variante de luz propia (Edición 2)',
}
