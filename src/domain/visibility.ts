import type { Actividad, ItemTexto, Rol } from './types';

const visible = (x: ItemTexto) => !x.retenido;

/** Vista de compradora: solo actividades publicadas, sin textos retenidos ni variantes pendientes,
 *  y sin datos internos de administración (incidencias, correcciones, propuestas, notas, referencias internas). */
export function paraCompradora(a: Actividad): Actividad {
  return {
    ...a,
    preparacion: a.preparacion.filter(visible),
    adaptaciones: a.adaptaciones.filter(visible),
    consentimiento: a.consentimiento.filter(visible),
    criteriosPausa: a.criteriosPausa.filter(visible),
    cuandoUtilizar: a.cuandoUtilizar.filter(visible),
    cuandoEvitar: a.cuandoEvitar.filter(visible),
    queObservar: a.queObservar.filter(visible),
    recomendaciones: a.recomendaciones.filter(visible),
    variantes: a.variantes.filter((v) => v.estado === 'publicado'),
    fuentes: a.fuentes.filter((f) => f.archivo !== 'sistema'),
    incidencias: [],
    propuestas: [],
    notasAdmin: [],
    correcciones: [],
    clasificacion: {},
    sistemaProfesional: null,
    motivoEstado: null,
  };
}

export function actividadesVisibles(todas: Actividad[], rol: Rol): Actividad[] {
  if (rol === 'admin') return todas;
  return todas.filter((a) => a.estado === 'publicado').map(paraCompradora);
}

/** Recuento público: actividades únicas, completas y publicadas. */
export function recuentoPublico(todas: Actividad[]): number {
  return todas.filter((a) => a.estado === 'publicado' && a.fases.length > 0 && a.duracion).length;
}
