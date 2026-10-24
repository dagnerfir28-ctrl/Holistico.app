import type { Bloque, DatosUsuario, Jornada, Preferencias, Retiro } from '../domain/types';
import { escribir, leer } from './storage';
import { aMinutos } from '../domain/time';

export const CLAVE_USUARIO = 'rh:v1:usuario';

export const PREFERENCIAS_POR_DEFECTO: Preferencias = {
  tema: 'oscuro',
  tamano: 'normal',
  reducirMovimiento: 'sistema',
  sonidos: false,
  pantallaActiva: true,
};

export function datosVacios(): DatosUsuario {
  return {
    version: 1,
    perfil: { nombre: '' },
    preferencias: { ...PREFERENCIAS_POR_DEFECTO },
    favoritos: {},
    notasActividad: {},
    usos: {},
    recientes: [],
    retiros: [],
    papelera: [],
    facilitacion: {},
    asistente: { dia: '', consultas: 0 },
    actualizado: new Date().toISOString(),
  };
}

function esObjeto(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

/** Valida y completa datos leídos (por si vienen de una versión anterior o de una importación). */
export function sanearDatos(x: unknown): DatosUsuario {
  const base = datosVacios();
  if (!esObjeto(x)) return base;
  const d = x as Partial<DatosUsuario>;
  const retiros = Array.isArray(d.retiros) ? d.retiros.filter((r): r is Retiro => esObjeto(r) && typeof (r as Retiro).id === 'string') : [];
  return {
    ...base,
    perfil: esObjeto(d.perfil) ? { nombre: String((d.perfil as { nombre?: unknown }).nombre ?? '').slice(0, 80) } : base.perfil,
    preferencias: sanearPreferencias(d.preferencias),
    favoritos: esObjeto(d.favoritos) ? (d.favoritos as Record<string, string>) : {},
    notasActividad: esObjeto(d.notasActividad) ? (d.notasActividad as DatosUsuario['notasActividad']) : {},
    usos: esObjeto(d.usos) ? (d.usos as Record<string, string[]>) : {},
    recientes: Array.isArray(d.recientes) ? d.recientes.filter((s) => typeof s === 'string').slice(0, 20) : [],
    retiros: retiros.map(normalizarRetiro),
    papelera: Array.isArray(d.papelera) ? d.papelera.filter((r): r is Retiro => esObjeto(r)).map(normalizarRetiro) : [],
    facilitacion: esObjeto(d.facilitacion) ? (d.facilitacion as DatosUsuario['facilitacion']) : {},
    asistente: esObjeto(d.asistente) ? { dia: String(d.asistente.dia ?? ''), consultas: Number(d.asistente.consultas ?? 0) } : base.asistente,
    actualizado: typeof d.actualizado === 'string' ? d.actualizado : base.actualizado,
  };
}

function sanearPreferencias(x: unknown): Preferencias {
  const p = esObjeto(x) ? (x as Partial<Preferencias>) : {};
  return {
    tema: p.tema === 'claro' || p.tema === 'sistema' ? p.tema : 'oscuro',
    tamano: p.tamano === 'grande' || p.tamano === 'muy-grande' ? p.tamano : 'normal',
    reducirMovimiento: p.reducirMovimiento === 'si' ? 'si' : 'sistema',
    sonidos: p.sonidos === true,
    pantallaActiva: p.pantallaActiva !== false,
  };
}

function horaValida(x: unknown): x is string {
  return typeof x === 'string' && aMinutos(x) !== null;
}

function texto(x: unknown, max: number): string {
  return typeof x === 'string' ? x.slice(0, max) : '';
}

function normalizarBloque(b: Partial<Bloque> & Record<string, unknown>): Bloque | null {
  if (typeof b.id !== 'string') return null;
  const duracion = Math.max(0, Math.min(600, Number(b.duracion) || 0));
  const horaFija = horaValida(b.horaFija) ? (b.horaFija as string) : null;
  if (b.tipo === 'actividad' && typeof b.actividadId === 'string') {
    return { id: b.id, tipo: 'actividad', actividadId: b.actividadId, duracion, duracionAdaptada: !!b.duracionAdaptada, horaFija, nota: texto(b.nota, 300) };
  }
  if (b.tipo === 'pausa' || b.tipo === 'propio') {
    return { id: b.id, tipo: b.tipo, titulo: texto(b.titulo, 120), duracion, horaFija, nota: texto(b.nota, 300) };
  }
  return null;
}

/** Normaliza un retiro leído (versiones anteriores, importaciones o datos manipulados). */
export function normalizarRetiro(r: Retiro): Retiro {
  const x = r as Partial<Retiro> & Record<string, unknown>;
  const ahora = new Date().toISOString();
  const jornadas: Jornada[] = (Array.isArray(x.jornadas) ? x.jornadas : [])
    .filter((j): j is Jornada => esObjeto(j) && typeof (j as Jornada).id === 'string')
    .map((j) => ({
      id: j.id,
      nombre: texto(j.nombre, 80) || 'Jornada',
      fecha: typeof j.fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(j.fecha) ? j.fecha : null,
      inicio: horaValida(j.inicio) ? j.inicio : '09:00',
      fin: horaValida(j.fin) ? j.fin : null,
      bloques: (Array.isArray(j.bloques) ? j.bloques : []).map((b) => normalizarBloque(b as Partial<Bloque> & Record<string, unknown>)).filter((b): b is Bloque => !!b),
    }));
  return {
    id: String(x.id),
    nombre: texto(x.nombre, 120) || 'Retiro sin nombre',
    objetivo: texto(x.objetivo, 600),
    fecha: typeof x.fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x.fecha) ? x.fecha : null,
    duracionPrevista: texto(x.duracionPrevista, 80),
    participantes: typeof x.participantes === 'number' && x.participantes > 0 ? Math.min(500, Math.round(x.participantes)) : null,
    contexto: texto(x.contexto, 1000),
    notas: texto(x.notas, 5000),
    jornadas: jornadas.length ? jornadas : [{ id: `jor-${String(x.id)}`, nombre: 'Jornada 1', fecha: null, inicio: '09:00', fin: null, bloques: [] }],
    checklist: esObjeto(x.checklist) ? Object.fromEntries(Object.entries(x.checklist).filter(([, v]) => typeof v === 'boolean')) : {},
    checklistPropios: Array.isArray(x.checklistPropios)
      ? x.checklistPropios.filter((c) => esObjeto(c) && typeof c.id === 'string').map((c) => ({ id: c.id, texto: texto(c.texto, 200), hecho: !!c.hecho }))
      : [],
    offline: esObjeto(x.offline) && esObjeto((x.offline as Retiro['offline'])?.actividades) ? (x.offline as Retiro['offline']) : null,
    creado: typeof x.creado === 'string' ? x.creado : ahora,
    actualizado: typeof x.actualizado === 'string' ? x.actualizado : ahora,
    eliminado: typeof x.eliminado === 'string' ? x.eliminado : null,
  };
}

/** Contrato de almacenamiento de los datos del usuario (local o Supabase). */
export interface AlmacenUsuario {
  readonly tipo: 'local' | 'supabase';
  cargar(): Promise<DatosUsuario>;
  /** Persiste el nuevo estado; recibe el anterior para calcular diferencias. Lanza si falla. */
  guardar(anterior: DatosUsuario, nuevo: DatosUsuario): Promise<void>;
}

export class AlmacenLocal implements AlmacenUsuario {
  readonly tipo = 'local' as const;
  constructor(private clave = CLAVE_USUARIO) {}
  async cargar(): Promise<DatosUsuario> {
    return sanearDatos(leer<unknown>(this.clave, null));
  }
  async guardar(_anterior: DatosUsuario, nuevo: DatosUsuario): Promise<void> {
    escribir(this.clave, nuevo);
  }
}
