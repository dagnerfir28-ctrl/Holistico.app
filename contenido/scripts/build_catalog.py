# -*- coding: utf-8 -*-
"""
Construye el catálogo estructurado a partir de las transcripciones revisadas.

Entradas:
  fuentes-transcritas/principal/fichas_*.json   transcripción del PDF principal (páginas en imagen)
  fuentes-transcritas/principal/documento.json  hallazgos de documento
  fuentes-transcritas/edicion2/ed2_fichas.json  Edición 2 (texto real)
  scripts/editorial.py          decisiones editoriales

Salidas:
  <app>/src/data/catalog.json
  <docs>/inventario.csv, <docs>/inventario.json (para documentación)
"""
import json, glob, re, os, sys, unicodedata, copy, csv
from collections import OrderedDict

HERE = os.path.dirname(os.path.abspath(__file__))
WORK = os.path.dirname(HERE)
# Transcripciones: contenido/fuentes-transcritas (proyecto) o raw/ (entorno de trabajo original)
FUENTES = os.path.join(WORK, 'fuentes-transcritas') if os.path.isdir(os.path.join(WORK, 'fuentes-transcritas')) else os.path.join(WORK, 'raw')
sys.path.insert(0, HERE)
import editorial as ED  # noqa

APP = sys.argv[1] if len(sys.argv) > 1 else os.path.join(WORK, 'out')
DOCS = sys.argv[2] if len(sys.argv) > 2 else os.path.join(WORK, 'out_docs')
TODAY = '2026-10-23'

def slug(s):
    s = unicodedata.normalize('NFD', s.lower())
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    s = re.sub(r'[^a-z0-9]+', '-', s).strip('-')
    return s

def norm(s):
    s = unicodedata.normalize('NFD', (s or '').lower())
    return ''.join(c for c in s if unicodedata.category(c) != 'Mn')

def parse_time(txt):
    if not txt:
        return None
    t = txt.replace('–', '-').replace('—', '-').replace('·', ' ').lower()
    nums = [int(x) for x in re.findall(r'\d+', t)]
    if not nums:
        return None
    mult = 60 if 'hora' in t else 1
    lo, hi = nums[0], nums[1] if len(nums) > 1 else nums[0]
    return {'min': lo * mult, 'max': hi * mult, 'texto': txt.strip()}

PHASE_RULES = [
    ('cierre', ['cierre', 'despedida', 'gesto y compartir']),
    ('integracion', ['integracion', 'compartir', 'reflexion', 'contemplacion', 'retorno', 'transicion', 'aterrizaje', 'salida gradual', 'quietud']),
    ('apertura', ['apertura', 'preparacion', 'introduccion', 'marco', 'presentacion', 'desaceleracion', 'llegada']),
]

def phase_type(name, idx, total):
    n = norm(name)
    for tipo, keys in PHASE_RULES:
        if any(k in n for k in keys):
            if tipo == 'apertura' and idx > 0 and idx == total - 1:
                continue
            return tipo
    return 'desarrollo'

# ---------------------------------------------------------------- materiales
CANON = OrderedDict([
    ('cojines-esterillas', 'Cojines o esterillas'),
    ('mantas', 'Mantas'),
    ('sillas', 'Sillas'),
    ('papel', 'Papel u hojas'),
    ('boligrafos', 'Bolígrafos o lápices'),
    ('colores', 'Lápices de colores, pinturas o rotuladores'),
    ('papel-grande', 'Papel grande o cartulina'),
    ('tarjetas', 'Tarjetas para escribir'),
    ('tijeras-pegamento', 'Tijeras y pegamento'),
    ('revistas', 'Revistas, imágenes y frases para recortar'),
    ('compas-regla', 'Compás, regla y lápiz'),
    ('pizarra', 'Pizarra o papel grande para explicar'),
    ('velas', 'Velas'),
    ('vela-central', 'Vela central'),
    ('velas-individuales', 'Una vela por participante'),
    ('fogata', 'Fogata (si el espacio lo permite)'),
    ('cuenco-campana', 'Cuenco tibetano o campana'),
    ('instrumentos', 'Instrumentos de sonido'),
    ('tambor', 'Tambor o grabación de tambor'),
    ('musica', 'Música y equipo de sonido'),
    ('objeto-palabra', 'Objeto para el bastón de la palabra'),
    ('panuelos', 'Pañuelos desechables'),
    ('agua', 'Agua para beber'),
    ('te', 'Té o infusión'),
    ('vendas', 'Vendas para los ojos'),
    ('ovillo', 'Ovillo de lana o hilo resistente'),
    ('elementos-naturales', 'Elementos naturales (flores, piedras, hojas, tierra)'),
    ('recipiente-agua-tierra', 'Recipiente con agua o tierra'),
    ('incienso', 'Incienso o aromas naturales'),
    ('cronometro', 'Cronómetro o temporizador'),
    ('elementos-simbolicos', 'Elementos simbólicos del retiro'),
    ('ropa-abrigo', 'Ropa abrigada'),
    ('ropa-comoda', 'Ropa y calzado cómodos'),
])

MAT_RULES = [
    (r'cojin|esterilla|colchoneta|almohada', ['cojines-esterillas']),
    (r'\bmantas?\b', ['mantas']),
    (r'\bsillas?\b', ['sillas']),
    (r'cuaderno|papel(?!.*grande)(?!.*cartulina)|hojas o papel', ['papel']),
    (r'boligrafo|lapices(?! de colores)|lapiz', ['boligrafos']),
    (r'lapices de colores|pinturas|rotuladores|acuarelas|materiales de arte|\bcolores\b', ['colores']),
    (r'papel grande|cartulina|papel blanco grueso', ['papel-grande']),
    (r'tarjeta', ['tarjetas']),
    (r'tijeras|pegamento', ['tijeras-pegamento']),
    (r'revista|imagenes y frases', ['revistas']),
    (r'compas', ['compas-regla']),
    (r'pizarra', ['pizarra']),
    (r'vela por participante|una por participante', ['velas-individuales']),
    (r'vela central|vela encendida', ['vela-central']),
    (r'\bvelas\b(?! —)', ['velas']),
    (r'fogata|fuego simbolico', ['fogata']),
    (r'cuenco tibetano|campana|cuencos tibetanos|cuenco para marcar|cuencos de cristal', ['cuenco-campana']),
    (r'instrumentos de sonido', ['instrumentos']),
    (r'tambor', ['tambor']),
    (r'musica|playlist|sistema de sonido|sonidos (naturales|ambientales|de agua)', ['musica']),
    (r'baston de la palabra', ['objeto-palabra']),
    (r'panuelos disponibles', ['panuelos']),
    (r'^agua|agua para|agua disponible', ['agua']),
    (r'\bte\b|infusion', ['te']),
    (r'vendas|cubrir los ojos', ['vendas']),
    (r'ovillo', ['ovillo']),
    (r'elementos naturales|flores|tierra, piedra|plantas', ['elementos-naturales']),
    (r'cuenco con agua|recipiente', ['recipiente-agua-tierra']),
    (r'incienso|aromas', ['incienso']),
    (r'cronometro|temporizador', ['cronometro']),
    (r'elementos simbolicos', ['elementos-simbolicos']),
    (r'ropa abrigada', ['ropa-abrigo']),
    (r'ropa comoda|calzado comodo', ['ropa-comoda']),
]
AMBIENTE = re.compile(r'^(espacio|sin musica|silencio como|temperatura|disposicion|descalzos|iluminacion)')

def map_material(txt):
    n = norm(txt)
    ids = []
    if AMBIENTE.match(n) and not re.search(r'vela|musica|cojin|esterilla', n):
        return [], True
    # "Velas e iluminación" etc.
    for pat, out in MAT_RULES:
        if re.search(pat, n):
            for o in out:
                if o not in ids:
                    ids.append(o)
    # Ajustes: "Pañuelos o vendas para los ojos" es una venda, no pañuelos desechables
    if 'vendas' in ids and 'panuelos' in ids and 'ojos' in n:
        ids.remove('panuelos')
    if 'velas-individuales' in ids and 'velas' in ids:
        ids.remove('velas')
    if 'vela-central' in ids and 'velas' in ids and 'central' in n and 'velas' not in n.replace('vela central', ''):
        ids.remove('velas')
    amb = not ids
    return ids, amb

def is_optional(txt):
    n = norm(txt)
    return '(opcional)' in n or 'si es posible' in n or 'si el espacio lo permite' in n or 'opcional' in n

PREP_START = re.compile(r'^(prepara|inspecciona|elige el espacio|estudia|realiza tu mismo|busca un espacio|usa un hilo|ten panuelos|situa el agua|si usas fuego|si no tienes|ten lista la alternativa)')

# ---------------------------------------------------------------- utilidades de procedencia
def item(texto, origen='fuente'):
    return {'texto': texto, 'origen': origen}


MOTIVO_SISTEMA = ('Procede del Sistema Profesional (producto aparte). No se muestra a compradoras hasta que '
                  'se decida comercialmente si ese contenido forma parte de la app.')


def item_criterio(texto, origen):
    it = item(texto, origen)
    if origen == 'sistema':
        it['retenido'] = True
        it['motivo'] = MOTIVO_SISTEMA
    return it

def apply_corrections(obj, corrections, log):
    """Reemplaza textos originales por corregidos en cualquier string del objeto."""
    for campo, original, corregido, motivo in corrections:
        found = [False]
        def walk(o):
            if isinstance(o, dict):
                for k, v in o.items():
                    if isinstance(v, str) and original in v:
                        o[k] = v.replace(original, corregido); found[0] = True
                    else:
                        walk(v)
            elif isinstance(o, list):
                for i, v in enumerate(o):
                    if isinstance(v, str) and original in v:
                        o[i] = v.replace(original, corregido); found[0] = True
                    else:
                        walk(v)
        walk(obj)
        if not found[0]:
            raise SystemExit(f'Corrección no aplicada (texto no encontrado): {original[:60]}')
        log.append({'campo': campo, 'original': original, 'corregido': corregido, 'motivo': motivo})

# ---------------------------------------------------------------- carga
principal = []
for f in sorted(glob.glob(os.path.join(FUENTES, 'principal/fichas_*.json'))):
    principal += json.load(open(f, encoding='utf-8'))
principal.sort(key=lambda d: d['page'])
documento = json.load(open(os.path.join(FUENTES, 'principal/documento.json'), encoding='utf-8'))
ed2doc = json.load(open(os.path.join(FUENTES, 'edicion2/ed2_fichas.json'), encoding='utf-8'))
ED2 = {e['n']: e for e in ed2doc['entradas']}

def ed2_ref(n):
    e = ED2[n]
    return {'archivo': 'edicion2', 'paginas': [e['sep']] + e['paginas']}

def section_from_raw(sec):
    tipo = sec.get('tipo', 'lista')
    out = {'titulo': sec['titulo'], 'tipo': tipo, 'items': list(sec['items'])}
    if sec.get('nota'):
        out['nota'] = sec['nota']
    if sec.get('cita'):
        out['cita'] = sec['cita']
    return out

def phases_from_raw(dev):
    out = []
    total = len(dev)
    for i, ph in enumerate(dev):
        t = parse_time(ph.get('tiempo'))
        fid = slug(ph['fase'])[:40] or f'fase-{i+1}'
        out.append({
            'id': fid,
            'nombre': ph['fase'],
            'tipo': phase_type(ph['fase'], i, total),
            'tiempo': t,
            'pasos': list(ph.get('texto', [])),
            'citas': list(ph.get('citas', [])),
            'preguntas': [],
            'nota': ph.get('nota'),
        })
    return out

def phases_from_bloques(bloques, nombre='Desarrollo'):
    """Convierte la redacción narrativa de la Edición 2 en una fase sin tiempos."""
    contexto = []
    pasos, citas, preguntas, notas = [], [], [], []
    started = False
    for b in bloques:
        if b['t'] == 'p' and not started:
            contexto.append(b['v'])
        elif b['t'] == 'p':
            pasos.append(b['v'])
        elif b['t'] == 'paso':
            started = True; pasos.append(b['v'])
        elif b['t'] == 'frases':
            citas += b['v']
        elif b['t'] == 'preguntas':
            preguntas += b['v']
        elif b['t'] == 'nota':
            notas.append(b['v'])
    fase = {'id': 'desarrollo', 'nombre': nombre, 'tipo': 'desarrollo', 'tiempo': None,
            'pasos': pasos, 'citas': citas, 'preguntas': preguntas, 'nota': ' '.join(notas) if notas else None}
    return ' '.join(contexto) if contexto else None, [fase]

def secciones_from_bloques(bloques):
    secs = []
    for b in bloques:
        if b['t'] == 'preguntas':
            secs.append({'titulo': 'Preguntas para acompañar', 'tipo': 'preguntas', 'items': b['v']})
        elif b['t'] == 'frases':
            secs.append({'titulo': 'Frases para acompañar', 'tipo': 'frases', 'items': b['v']})
    return secs

def base_activity(meta):
    a = OrderedDict()
    a['id'] = meta['id']
    a['version'] = 1
    a['estado'] = meta['estado']
    a['motivoEstado'] = meta.get('motivo')
    return a

def classification(meta, nivel, energia):
    motivo_int = f"Clasificación editorial. Nivel indicado en la fuente: {nivel or 'no especificado'}; energía: {energia or 'no especificada'}."
    return {
        'momentos': {'origen': 'editorial', 'motivo': 'Clasificación editorial a partir del tipo, el momento y las recomendaciones de la ficha.'},
        'intensidad': {'origen': 'editorial', 'motivo': motivo_int},
        'experiencia': {'origen': 'editorial', 'motivo': 'Clasificación editorial según la complejidad de conducción y contención.'},
        'temas': {'origen': 'editorial', 'motivo': 'Etiquetas editoriales para la búsqueda.'},
        'espacio': {'origen': 'editorial', 'motivo': 'Según el espacio indicado o deducido de la ficha.'},
    }

def common_editorial(a, meta):
    a['consentimiento'] = [item(ED.OPCIONES[k], 'adaptacion') for k in meta.get('opciones', [])]
    a['criteriosPausa'] = [item(ED.PAUSA[k], 'adaptacion') for k in meta.get('pausa', [])]
    prep_ed = [item(ED.PREP[k], 'adaptacion') for k in meta.get('prep', [])]
    a['cuandoUtilizar'] = [item_criterio(t, o) for o, t in meta.get('utilizar', [])]
    a['cuandoEvitar'] = [item_criterio(t, o) for o, t in meta.get('evitar', [])]
    a['relacionadas'] = meta.get('relacionadas', [])
    a['notasAdmin'] = meta.get('notas_admin', [])
    a['propuestas'] = [{'campo': c, 'texto': t, 'motivo': 'Reescritura propuesta, pendiente de aprobación.'} for c, t in meta.get('propuesta', [])]
    for campo in ('cuandoUtilizar', 'cuandoEvitar'):
        for it in a[campo]:
            if it.get('retenido'):
                a['propuestas'].append({'campo': campo, 'texto': it['texto'], 'motivo': MOTIVO_SISTEMA})
    return prep_ed

def materials_block(mats):
    out, ambiente = [], []
    for m in mats or []:
        ids, amb = map_material(m)
        entry = {'texto': m, 'ids': ids, 'opcional': is_optional(m)}
        out.append(entry)
        if amb:
            ambiente.append(m)
    return out, ambiente

def split_recs(recs):
    prep, rest = [], []
    for r in recs or []:
        if PREP_START.match(norm(r)):
            prep.append(item(r, 'fuente'))
        else:
            rest.append(item(r, 'fuente'))
    return prep, rest

def variant_entry(key):
    n = int(key.split(':')[1])
    e = ED2[n]
    v = OrderedDict()
    v['id'] = f'ed2-{n:02d}'
    v['titulo'] = ED.VARIANTES.get(key, e['titulo'])
    v['tituloFuente'] = e['titulo']
    v['estado'] = 'revision'
    v['fuente'] = ed2_ref(n)
    v['nota'] = e.get('nota')
    if e.get('texto'):
        contexto, fases = phases_from_bloques(e['texto']['bloques'])
        v['subtitulo'] = e['texto'].get('subtitulo')
        v['contexto'] = contexto
        v['fases'] = fases
    else:
        v['subtitulo'] = None
        v['contexto'] = None
        v['fases'] = []
    return v

catalog = []
inventory = []

# ---------------------------------------------------------------- PDF principal
dup_pages = {}
for d in principal:
    if d.get('duplicate_of_page'):
        dup_pages[d['page']] = d
        continue
    meta = ED.P[d['page']]
    a = base_activity(meta)
    corr_log = []
    raw = copy.deepcopy(d)
    if meta.get('correcciones'):
        apply_corrections(raw, meta['correcciones'], corr_log)
    metamap = dict(raw.get('meta', []))
    a['titulo'] = meta.get('titulo') or raw['title']
    a['subtitulo'] = raw.get('subtitle')
    a['resumen'] = raw.get('subtitle')
    a['contexto'] = raw.get('contexto')
    a['objetivo'] = raw.get('objetivo')
    a['momentos'] = meta['momentos']
    a['temas'] = meta['temas']
    a['formato'] = meta['formato']
    a['tipoFuente'] = metamap.get('Tipo')
    a['duracion'] = parse_time(metamap.get('Duración'))
    a['notaDuracion'] = meta.get('nota_duracion')
    a['nivelFuente'] = metamap.get('Nivel')
    a['energiaFuente'] = metamap.get('Energía')
    a['momentoFuente'] = metamap.get('Momento')
    a['enfoqueFuente'] = metamap.get('Enfoque')
    esp = dict(meta['espacio'])
    if metamap.get('Espacio'):
        esp['texto'] = metamap['Espacio']
    a['espacio'] = esp
    a['participantes'] = None
    mats, ambiente = materials_block(raw.get('materiales'))
    a['materiales'] = mats
    a['ambiente'] = ambiente
    prep_ed = common_editorial(a, meta)
    prep_src, recs = split_recs(raw.get('recomendaciones'))
    for original, motivo, propuesta in meta.get('retener', []):
        hit = [r for r in recs + prep_src if r['texto'] == original]
        if not hit:
            raise SystemExit(f'Texto a retener no encontrado: {original[:50]}')
        for r in hit:
            r['retenido'] = True
            r['motivo'] = motivo
        a['propuestas'].append({'campo': 'recomendaciones', 'original': original, 'texto': propuesta, 'motivo': motivo})
    a['preparacion'] = prep_src + prep_ed
    a['experiencia'] = meta['experiencia']
    a['intensidad'] = meta['intensidad']
    a['adaptaciones'] = []
    a['secciones'] = [section_from_raw(s) for s in raw.get('secciones', [])]
    a['fases'] = phases_from_raw(raw.get('desarrollo', []))
    a['queObservar'] = []
    a['recomendaciones'] = recs
    fuentes = [{'archivo': 'principal', 'paginas': [raw['sep_page'], raw['page']], 'rol': 'principal'}]
    # Recuperación de desarrollo (Ritual de Renacimiento)
    if meta.get('recuperar'):
        n = int(meta['recuperar'].split(':')[1])
        e = ED2[n]
        ctx, fases = phases_from_bloques(e['texto']['bloques'], nombre='Desarrollo (recuperado de la Edición 2)')
        for f in fases:
            f['origen'] = 'fuente-ed2'
        a['fases'] = fases
        fuentes.append({'archivo': 'edicion2', 'paginas': [e['sep']] + e['paginas'], 'rol': 'recuperacion'})
    # Referencias cruzadas con la Edición 2
    for n, e in ED2.items():
        if e.get('principal') == f"P{int(raw['sep'].split('.')[0].split(' ')[0]):02d}" if raw['sep'][0].isdigit() else False:
            pass
    a['variantes'] = [variant_entry(k) for k in meta.get('variantes', [])]
    a['fuentes'] = fuentes
    a['correcciones'] = corr_log
    incid = [{'tipo': t, 'severidad': s, 'detalle': x} for t, s, x in meta.get('incidencias', [])]
    if raw.get('editorial_flags'):
        for fl in raw['editorial_flags']:
            incid.append({'tipo': 'contenido', 'severidad': 'alta', 'detalle': fl})
    a['incidencias'] = incid
    a['clasificacion'] = classification(meta, a['nivelFuente'], a['energiaFuente'])
    a['sistemaProfesional'] = meta.get('sistema')
    a['imagen'] = None
    a['actualizado'] = TODAY
    a['procedencia'] = {
        'titulo': 'fuente', 'subtitulo': 'fuente', 'contexto': 'fuente', 'objetivo': 'fuente',
        'fases': 'fuente-ed2' if meta.get('recuperar') else 'fuente', 'secciones': 'fuente',
        'materiales': 'fuente', 'recomendaciones': 'fuente', 'duracion': 'fuente',
        'consentimiento': 'adaptacion', 'criteriosPausa': 'adaptacion',
        'momentos': 'editorial', 'temas': 'editorial', 'intensidad': 'editorial', 'experiencia': 'editorial',
    }
    catalog.append(a)
    inventory.append({
        'id': a['id'], 'titulo': a['titulo'], 'estado': a['estado'],
        'origen': 'PDF principal', 'separador': raw['sep'], 'paginas_principal': f"{raw['sep_page']}–{raw['page']}",
        'paginas_ed2': '', 'relacion': 'base', 'duracion': a['duracion']['texto'] if a['duracion'] else 'no especificada',
        'fases': len(a['fases']), 'intensidad': a['intensidad'], 'experiencia': a['experiencia'],
        'incidencias': len(incid), 'correcciones': len(corr_log), 'variantes': len(a['variantes']),
        'motivo': a['motivoEstado'] or '',
    })

# Mapear páginas de la Edición 2 equivalentes para cada actividad del principal
p2id = {}
for d in principal:
    if d.get('duplicate_of_page'):
        continue
    try:
        num = int(re.match(r'(\d+)', d['sep']).group(1))
    except Exception:
        continue
    p2id[f'P{num:02d}'] = ED.P[d['page']]['id']
# P61 = Reconexión (sep "61 Y 62"), P63 = Conexión Humana
p2id['P61'] = 'meditacion-de-reconexion-interior'
p2id['P63'] = 'dinamica-de-conexion-humana'
byid = {a['id']: a for a in catalog}
for n, e in ED2.items():
    pid = p2id.get(e.get('principal', ''))
    if pid and e['relacion'] in ('equivalente', 'equivalente_redaccion_distinta', 'equivalente_con_relleno', 'equivalente_completa', 'version_alternativa', 'recupera_desarrollo'):
        a = byid[pid]
        if not any(f['archivo'] == 'edicion2' for f in a['fuentes']):
            a['fuentes'].append({'archivo': 'edicion2', 'paginas': [e['sep']] + e['paginas'], 'rol': 'contraste'})
        for row in inventory:
            if row['id'] == pid:
                row['paginas_ed2'] = f"{e['sep']}–{e['paginas'][-1]}"

# ---------------------------------------------------------------- Recuperadas y nuevas (Edición 2)
for n, meta in ED.E.items():
    e = ED2[n]
    a = base_activity(meta)
    corr_log = []
    texto = copy.deepcopy(e['texto'])
    if meta.get('correcciones'):
        apply_corrections(texto, meta['correcciones'], corr_log)
    contexto, fases = phases_from_bloques(texto['bloques'])
    for f in fases:
        f['origen'] = 'fuente-ed2'
    a['titulo'] = meta.get('titulo') or e['titulo']
    a['subtitulo'] = texto.get('subtitulo')
    a['resumen'] = texto.get('subtitulo')
    a['contexto'] = contexto
    a['objetivo'] = None
    a['momentos'] = meta['momentos']
    a['temas'] = meta['temas']
    a['formato'] = meta['formato']
    a['tipoFuente'] = None
    a['duracion'] = None
    a['notaDuracion'] = None
    a['nivelFuente'] = None
    a['energiaFuente'] = None
    a['momentoFuente'] = None
    a['enfoqueFuente'] = None
    a['espacio'] = dict(meta['espacio'])
    a['participantes'] = None
    a['materiales'] = []
    a['ambiente'] = []
    prep_ed = common_editorial(a, meta)
    a['preparacion'] = prep_ed
    a['experiencia'] = meta['experiencia']
    a['intensidad'] = meta['intensidad']
    a['adaptaciones'] = []
    a['secciones'] = secciones_from_bloques(texto['bloques'])
    a['fases'] = fases
    a['queObservar'] = []
    a['recomendaciones'] = []
    fuentes = [{'archivo': 'edicion2', 'paginas': [e['sep']] + e['paginas'], 'rol': 'recuperacion' if meta.get('principal_sep') else 'principal'}]
    if meta.get('principal_sep'):
        fuentes.insert(0, {'archivo': 'principal', 'paginas': [meta['principal_sep']], 'rol': 'separador'})
    a['variantes'] = []
    a['fuentes'] = fuentes
    a['correcciones'] = corr_log
    incid = []
    if meta.get('principal_sep'):
        incid.append({'tipo': 'duplicado', 'severidad': 'alta', 'detalle': f"En el PDF principal, la página siguiente al separador {meta['principal_sep']} repite otra ficha (duplicado exacto)."})
    falt = e['texto'].get('faltantes')
    if falt:
        incid.append({'tipo': 'faltantes', 'severidad': 'media', 'detalle': 'Faltan: ' + ', '.join(falt) + '.'})
    if not falt:
        incid.append({'tipo': 'faltantes', 'severidad': 'media', 'detalle': 'Redacción narrativa sin duración, materiales en lista ni tiempos por fase.'})
    if e.get('nota_revision'):
        incid.append({'tipo': 'revision', 'severidad': 'media', 'detalle': e['nota_revision']})
    if e.get('nota_similitud'):
        incid.append({'tipo': 'similitud', 'severidad': 'baja', 'detalle': e['nota_similitud']})
    a['incidencias'] = incid
    a['clasificacion'] = classification(meta, None, None)
    a['sistemaProfesional'] = None
    a['imagen'] = None
    a['actualizado'] = TODAY
    a['procedencia'] = {
        'titulo': 'fuente-ed2', 'subtitulo': 'fuente-ed2', 'contexto': 'fuente-ed2', 'fases': 'fuente-ed2', 'secciones': 'fuente-ed2',
        'consentimiento': 'adaptacion', 'criteriosPausa': 'adaptacion',
        'momentos': 'editorial', 'temas': 'editorial', 'intensidad': 'editorial', 'experiencia': 'editorial',
    }
    catalog.append(a)
    inventory.append({
        'id': a['id'], 'titulo': a['titulo'], 'estado': a['estado'],
        'origen': 'Edición 2 (recupera faltante del principal)' if meta.get('principal_sep') else 'Edición 2 (solo en esta edición)',
        'separador': f"{n}. {e['titulo']}", 'paginas_principal': str(meta.get('principal_sep') or ''),
        'paginas_ed2': f"{e['sep']}–{e['paginas'][-1]}", 'relacion': e['relacion'], 'duracion': 'no especificada',
        'fases': len(a['fases']), 'intensidad': a['intensidad'], 'experiencia': a['experiencia'],
        'incidencias': len(incid), 'correcciones': len(corr_log), 'variantes': 0,
        'motivo': a['motivoEstado'] or '',
    })

# ---------------------------------------------------------------- Validaciones
ids = [a['id'] for a in catalog]
assert len(ids) == len(set(ids)), 'IDs duplicados'
for a in catalog:
    for r in a['relacionadas']:
        assert r in ids, f"{a['id']} → relacionada inexistente {r}"
    assert a['momentos'] and a['formato'], a['id']
    assert a['intensidad'] in ('suave', 'media', 'profunda'), a['id']
    assert a['experiencia'] in ('inicial', 'intermedia', 'avanzada'), a['id']
    assert a['estado'] in ('borrador', 'revision', 'publicado', 'archivado'), a['id']
    if a['estado'] == 'publicado':
        assert a['fases'] and a['duracion'], f"publicada sin fases/duración: {a['id']}"
        assert all(f['tiempo'] for f in a['fases']), f"publicada con fase sin tiempo: {a['id']}"
    # Tiempos
    if a['duracion'] and a['fases'] and all(f['tiempo'] for f in a['fases']):
        lo = sum(f['tiempo']['min'] for f in a['fases']); hi = sum(f['tiempo']['max'] for f in a['fases'])
        a['sumaFases'] = {'min': lo, 'max': hi}
        overlap = not (hi < a['duracion']['min'] or lo > a['duracion']['max'])
        has_flag = any(i['tipo'] == 'tiempos' for i in a['incidencias'])
        if not overlap and not has_flag:
            raise SystemExit(f"Discrepancia de tiempos sin registrar: {a['id']} {a['duracion']} vs {lo}-{hi}")
    else:
        a['sumaFases'] = None

# Duplicados exactos (para administración)
duplicados = []
for page, d in sorted(dup_pages.items()):
    duplicados.append({
        'pagina': page, 'separador': d['sep'], 'igualA': d['duplicate_of_page'],
        'detalle': d['note'],
    })

order = {k: i for i, k in enumerate(['publicado', 'revision', 'borrador', 'archivado'])}
for i, a in enumerate(catalog):
    a['orden'] = i + 1

counts = {s: sum(1 for a in catalog if a['estado'] == s) for s in order}
out = OrderedDict()
out['schema'] = 1
out['generado'] = TODAY
out['fuentes'] = {
    'principal': {'titulo': 'Más de 60 dinámicas retiros holísticos .pdf', 'paginas': 129, 'drive': '1f5oGLZK0lqECrOOYml_ZSLFyzhvwHcki'},
    'edicion2': {'titulo': 'Más de 60 dinámicas retiros holísticos - Edición Enero_.pdf', 'paginas': 138, 'drive': '1GyBfl35EYwFo8svyl-rea-2AhYII77ks'},
    'sistema': {'titulo': 'Sistema Profesional para Facilitadores de Retiros Holísticos', 'paginas': 50, 'drive': '1zJH6d3rhcGlJGLxVU77oUieXFu0pg9EM'},
}
out['materialesCanonicos'] = [{'id': k, 'nombre': v} for k, v in CANON.items()]
out['opcionesConsentimiento'] = ED.OPCIONES
out['incidenciasDocumento'] = {
    'principal': {
        'indice': documento['indice'],
        'pagina38': documento['pagina_38'],
        'duplicados': duplicados,
        'separadorIncorrecto': documento['separador_incorrecto'],
        'fichasIncompletas': documento['fichas_incompletas'],
        'piesDePagina': documento['pies_de_pagina'],
    },
    'edicion2': ed2doc['problemas_documento'],
}
out['resumen'] = counts
out['actividades'] = catalog

os.makedirs(os.path.join(APP), exist_ok=True)
with open(os.path.join(APP, 'catalog.json'), 'w', encoding='utf-8') as fh:
    json.dump(out, fh, ensure_ascii=False, indent=1)

os.makedirs(DOCS, exist_ok=True)
with open(os.path.join(DOCS, 'inventario.csv'), 'w', encoding='utf-8', newline='') as fh:
    w = csv.DictWriter(fh, fieldnames=list(inventory[0].keys()))
    w.writeheader(); w.writerows(inventory)
with open(os.path.join(DOCS, 'inventario.json'), 'w', encoding='utf-8') as fh:
    json.dump({'inventario': inventory, 'duplicados': duplicados, 'resumen': counts}, fh, ensure_ascii=False, indent=1)

print('Actividades:', len(catalog), counts)
print('Duplicados exactos:', [(d['pagina'], d['igualA']) for d in duplicados])
size = os.path.getsize(os.path.join(APP, 'catalog.json'))
print('catalog.json', round(size / 1024), 'KB')
