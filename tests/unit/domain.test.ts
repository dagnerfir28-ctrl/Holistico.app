import { describe, expect, it } from 'vitest';
import catalogoJson from '../../src/data/catalog.json';
import type { Actividad, Catalogo, Retiro } from '../../src/domain/types';
import { normalizar } from '../../src/domain/text';
import { filtrar, FILTROS_VACIOS, puntuar } from '../../src/domain/search';
import { programarJornada } from '../../src/domain/schedule';
import { nuevoRetiro, bloqueDeActividad, bloqueLibre, duplicarRetiro, moverEnLista } from '../../src/domain/retreats';
import { crearEstado, iniciar, pausar, transcurridoFase, transcurridoTotal, siguiente, anterior, esUltimo, reiniciarFase } from '../../src/domain/timer';
import { consolidarPreparacion } from '../../src/domain/materials';
import { actividadesVisibles, paraCompradora, recuentoPublico } from '../../src/domain/visibility';
import { recomendar } from '../../src/domain/recommend';
import { revisarActividad, puedePublicar } from '../../src/domain/validation';
import { recuperarFichas, citasEnTexto, extraerPistas, construirMensajes } from '../../src/assistant/core';
import { aMinutos, formatoRango } from '../../src/domain/time';

const catalogo = catalogoJson as unknown as Catalogo;
const todas = catalogo.actividades;
const porId = new Map(todas.map((a) => [a.id, a]));
const publicadas = todas.filter((a) => a.estado === 'publicado');

describe('catálogo', () => {
  it('tiene IDs únicos y estables', () => {
    const ids = todas.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain('circulo-de-gratitud');
  });
  it('el recuento público coincide con las publicadas completas', () => {
    expect(recuentoPublico(todas)).toBe(publicadas.length);
    expect(publicadas.length).toBe(catalogo.resumen.publicado);
  });
  it('no publica duplicados conocidos ni fichas incompletas', () => {
    // Las páginas 46 y 56 del principal son copias exactas: sus separadores no deben publicarse como actividades.
    const ids = publicadas.map((a) => a.id);
    expect(ids).not.toContain('viaje-a-traves-de-los-chakras');
    expect(ids).not.toContain('circulo-de-transformacion-alquimica');
    expect(ids).not.toContain('ritual-de-renacimiento');
    // Ninguna actividad publicada comparte las mismas páginas de fuente principal.
    const paginas = publicadas.map((a) => a.fuentes.find((f) => f.archivo === 'principal')?.paginas.join('-')).filter(Boolean);
    expect(new Set(paginas).size).toBe(paginas.length);
  });
  it('todas las publicadas superan la validación de publicación', () => {
    for (const a of publicadas) {
      const bloqueos = revisarActividad(a, todas).filter((p) => p.bloquea);
      expect(bloqueos, a.id).toEqual([]);
      expect(puedePublicar(a, todas)).toBe(true);
    }
  });
  it('registra las discrepancias de tiempos conocidas', () => {
    const templo = porId.get('meditacion-templo-interior')!;
    expect(templo.duracion).toMatchObject({ min: 60, max: 75 });
    expect(templo.sumaFases).toEqual({ min: 35, max: 40 });
    expect(templo.incidencias.some((i) => i.tipo === 'tiempos')).toBe(true);
  });
  it('usa el título de la ficha cuando el separador está mal', () => {
    const sonido = porId.get('meditacion-del-sonido-interior')!;
    expect(sonido.titulo).toBe('Meditación del Sonido Interior');
    expect(sonido.incidencias.some((i) => i.tipo === 'separador')).toBe(true);
  });
});

describe('búsqueda', () => {
  it('normaliza mayúsculas y acentos', () => {
    expect(normalizar('MEDITACIÓN Árbol')).toBe('meditacion arbol');
  });
  it('encuentra sin acentos ni mayúsculas', () => {
    const r = filtrar(publicadas, { ...FILTROS_VACIOS, texto: 'MEDITACION DEL ARBOL' });
    expect(r[0].actividad.id).toBe('meditacion-del-arbol');
    const r2 = filtrar(publicadas, { ...FILTROS_VACIOS, texto: 'círculo gratitud' });
    expect(r2.map((x) => x.actividad.id)).toContain('circulo-de-gratitud');
  });
  it('combina filtros y devuelve resultados reales', () => {
    const r = filtrar(publicadas, { ...FILTROS_VACIOS, momentos: ['cierre'], intensidades: ['suave'], tiempo: 60 });
    expect(r.length).toBeGreaterThan(0);
    for (const { actividad } of r) {
      expect(actividad.momentos).toContain('cierre');
      expect(actividad.intensidad).toBe('suave');
      expect(actividad.duracion!.min).toBeLessThanOrEqual(60);
    }
  });
  it('sin coincidencias devuelve lista vacía', () => {
    expect(filtrar(publicadas, { ...FILTROS_VACIOS, texto: 'xyzzy inexistente' })).toEqual([]);
  });
  it('filtro de materiales "sin materiales especiales"', () => {
    const r = filtrar(publicadas, { ...FILTROS_VACIOS, materiales: ['ninguno'] });
    for (const { actividad } of r) {
      const ids = actividad.materiales.flatMap((m) => m.ids);
      expect(ids.every((id) => ['cojines-esterillas', 'mantas', 'sillas', 'agua', 'panuelos'].includes(id))).toBe(true);
    }
  });
  it('puntúa más alto las coincidencias en el título', () => {
    const a = porId.get('escaneo-corporal')!;
    const b = porId.get('ritual-de-agradecimiento-al-cuerpo')!;
    expect(puntuar(a, 'escaneo')).toBeGreaterThan(puntuar(b, 'escaneo'));
  });
});

describe('planificador', () => {
  const gratitud = porId.get('circulo-de-gratitud')!;
  const arbol = porId.get('meditacion-del-arbol')!;
  it('calcula horarios y detecta exceso de tiempo', () => {
    const r = nuevoRetiro('Prueba');
    const j = { ...r.jornadas[0], inicio: '09:00', fin: '10:00', bloques: [bloqueDeActividad(gratitud), bloqueLibre('pausa', 'Pausa', 15), bloqueDeActividad(arbol)] };
    const p = programarJornada(j, porId);
    expect(p.bloques[0].inicioTexto).toBe('09:00');
    expect(p.bloques[0].finTexto).toBe('09:45'); // máximo de 30–45
    expect(p.bloques[1].inicioTexto).toBe('09:45');
    expect(p.bloques[2].finTexto).toBe('10:45');
    expect(p.avisos.some((a) => a.tipo === 'exceso' && a.minutos === 45)).toBe(true);
  });
  it('detecta solapamientos con horas fijas', () => {
    const r = nuevoRetiro('Prueba');
    const b2 = { ...bloqueDeActividad(arbol), horaFija: '09:30' };
    const j = { ...r.jornadas[0], inicio: '09:00', fin: null, bloques: [bloqueDeActividad(gratitud), b2] };
    const p = programarJornada(j, porId);
    expect(p.avisos.some((a) => a.tipo === 'solapamiento' && a.minutos === 15)).toBe(true);
    expect(p.bloques[1].solapa).toBe(true);
  });
  it('distingue duración original y adaptada', () => {
    const b = bloqueDeActividad(gratitud);
    expect(b.duracion).toBe(45);
    expect(b.duracionAdaptada).toBe(false);
  });
  it('duplica un retiro con IDs nuevos', () => {
    const r: Retiro = { ...nuevoRetiro('Original'), checklist: { 'mat:velas': true } };
    r.jornadas[0].bloques.push(bloqueDeActividad(gratitud));
    const c = duplicarRetiro(r);
    expect(c.id).not.toBe(r.id);
    expect(c.jornadas[0].bloques[0].id).not.toBe(r.jornadas[0].bloques[0].id);
    expect(c.checklist).toEqual({});
    expect(c.nombre).toContain('(copia)');
  });
  it('reordena elementos', () => {
    expect(moverEnLista(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a']);
    expect(moverEnLista(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b']);
  });
  it('valida horas', () => {
    expect(aMinutos('09:30')).toBe(570);
    expect(aMinutos('25:00')).toBeNull();
  });
});

describe('temporizador de facilitación', () => {
  const a = porId.get('circulo-de-gratitud')!;
  it('calcula el tiempo con marcas de tiempo aunque pase a segundo plano', () => {
    let e = crearEstado(a.id);
    e = iniciar(e, 1_000);
    // Simula que la app estuvo en segundo plano 5 minutos sin ejecutar intervalos
    expect(transcurridoFase(e, 1_000 + 300_000)).toBe(300_000);
    e = pausar(e, 1_000 + 300_000);
    expect(transcurridoFase(e, 9_999_999)).toBe(300_000); // pausado no avanza
    e = iniciar(e, 2_000_000);
    expect(transcurridoTotal(e, 2_060_000)).toBe(360_000);
  });
  it('el cambio de fase es manual y reinicia el reloj de fase, no el total', () => {
    let e = iniciar(crearEstado(a.id), 0);
    // la fase 1 tiene 2 pasos
    e = siguiente(a, e, 60_000);
    expect(e.faseIndex).toBe(0);
    expect(e.pasoIndex).toBe(1);
    e = siguiente(a, e, 120_000);
    expect(e.faseIndex).toBe(1);
    expect(transcurridoFase(e, 120_000)).toBe(0);
    expect(transcurridoTotal(e, 120_000)).toBe(120_000);
    e = anterior(a, e, 130_000);
    expect(e.faseIndex).toBe(0);
    expect(e.pasoIndex).toBe(1);
  });
  it('no avanza solo cuando termina el tiempo previsto', () => {
    const e = iniciar(crearEstado(a.id), 0);
    // 2 horas después sigue en la misma fase
    expect(e.faseIndex).toBe(0);
    expect(transcurridoFase(e, 7_200_000)).toBe(7_200_000);
  });
  it('detecta el último paso y reinicia fase', () => {
    let e = crearEstado(a.id);
    while (!esUltimo(a, e)) e = siguiente(a, e, 0);
    expect(e.faseIndex).toBe(a.fases.length - 1);
    e = iniciar(e, 0);
    e = reiniciarFase(e, 50_000);
    expect(transcurridoFase(e, 50_000)).toBe(0);
    expect(transcurridoTotal(e, 50_000)).toBe(50_000);
  });
});

describe('preparación del retiro', () => {
  it('consolida materiales sin inventar cantidades', () => {
    const r = nuevoRetiro('Prep');
    r.jornadas[0].bloques.push(bloqueDeActividad(porId.get('circulo-de-gratitud')!), bloqueDeActividad(porId.get('ritual-de-liberacion')!));
    const p = consolidarPreparacion(r, catalogo, porId);
    const velas = p.materiales.find((m) => m.id === 'velas' || m.id === 'vela-central');
    expect(velas).toBeTruthy();
    expect(p.materiales.every((m) => !/\d/.test(m.nombre))).toBe(true);
    expect(p.preparaciones.some((x) => x.texto.includes('fuego'))).toBe(true);
    // los textos retenidos no aparecen
    expect(p.preparaciones.every((x) => !x.texto.includes('exactamente lo que necesita'))).toBe(true);
    expect(p.recordatorios.some((x) => x.tipo === 'consentimiento')).toBe(true);
  });
});

describe('visibilidad', () => {
  it('la compradora solo ve actividades publicadas y sin textos retenidos', () => {
    const vis = actividadesVisibles(todas, 'compradora');
    expect(vis.every((a) => a.estado === 'publicado')).toBe(true);
    const lib = vis.find((a) => a.id === 'ritual-de-liberacion')!;
    expect(lib.recomendaciones.some((r) => r.texto.includes('exactamente lo que necesita'))).toBe(false);
    expect(lib.incidencias).toEqual([]);
  });
  it('la administración ve todo', () => {
    expect(actividadesVisibles(todas, 'admin').length).toBe(todas.length);
  });
  it('las variantes pendientes no se muestran a compradoras', () => {
    const cierre = paraCompradora(porId.get('circulo-de-cierre-del-retiro')!);
    expect(cierre.variantes).toEqual([]);
  });
});

describe('recomendador determinista', () => {
  it('recomienda aperturas suaves para principiantes con 30 minutos', () => {
    const r = recomendar(publicadas, { momento: 'apertura', minutos: 30, participantes: 15, experienciaGrupo: 'principiante', formato: null, espacio: null, intensidadMaxima: null });
    expect(r.length).toBeGreaterThan(0);
    for (const x of r) {
      expect(x.actividad.momentos).toContain('apertura');
      expect(x.actividad.duracion!.min).toBeLessThanOrEqual(30);
      expect(x.actividad.intensidad).not.toBe('profunda');
    }
  });
});

describe('asistente: recuperación y citas', () => {
  it('extrae pistas de la pregunta', () => {
    const p = extraerPistas('¿Qué dinámica uso para abrir un retiro con 15 adultos principiantes en 30 minutos?');
    expect(p.momentos).toContain('apertura');
    expect(p.minutos).toBe(30);
    expect(p.participantes).toBe(15);
    expect(p.principiantes).toBe(true);
  });
  it('solo recupera fichas publicadas y relevantes', () => {
    const f = recuperarFichas('Necesito una dinámica de cierre emotiva', todas);
    expect(f.length).toBeGreaterThan(0);
    expect(f.every((a) => a.estado === 'publicado')).toBe(true);
    expect(f.some((a) => a.momentos.includes('cierre'))).toBe(true);
  });
  it('marca como no verificadas las citas que no recibió', () => {
    const recibidas = new Set(['circulo-de-gratitud']);
    const c = citasEnTexto('Te sugiero Círculo de Gratitud [[circulo-de-gratitud]] y Algo Inventado [[algo-inventado]].', recibidas);
    expect(c.validas).toEqual(['circulo-de-gratitud']);
    expect(c.noVerificadas).toEqual(['algo-inventado']);
  });
  it('incluye las fichas en el mensaje', () => {
    const f = [porId.get('circulo-de-presencia')!];
    const m = construirMensajes('Abrir un retiro', f, []);
    expect(m[m.length - 1].contenido).toContain('[[circulo-de-presencia]]');
    expect(formatoRango(f[0].duracion)).toBe('30–45 min');
  });
});

describe('integridad de tipos de catálogo', () => {
  it('cada actividad tiene fuentes con páginas', () => {
    for (const a of todas as Actividad[]) {
      expect(a.fuentes.length, a.id).toBeGreaterThan(0);
      expect(a.fuentes.every((f) => f.paginas.length > 0)).toBe(true);
    }
  });
});
