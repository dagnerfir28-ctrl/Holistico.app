import type { Actividad, Catalogo, Estado, Momento } from '../domain/types';
import { escribir, leer, borrar } from './storage';
import { normalizar } from '../domain/text';

export interface VersionActividad {
  version: number;
  estado: Estado;
  fecha: string;
  nota: string;
  data: Actividad;
}

export interface ConfigCatalogo {
  ordenMomentos: Momento[];
}

export const CONFIG_POR_DEFECTO: ConfigCatalogo = {
  ordenMomentos: ['apertura', 'conexion', 'exploracion', 'integracion', 'cierre'],
};

export interface RepositorioCatalogo {
  readonly tipo: 'local' | 'demo' | 'supabase';
  cargar(): Promise<{ catalogo: Catalogo; config: ConfigCatalogo; editadas: Set<string> }>;
  guardarActividad(a: Actividad, nota: string): Promise<Actividad>;
  historial(id: string): Promise<VersionActividad[]>;
  descartarCambios?(id: string): Promise<void>;
  guardarConfig(c: ConfigCatalogo): Promise<void>;
  exportar?(): Promise<Catalogo>;
}

export const CLAVE_CATALOGO_LOCAL = 'rh:v1:catalogo-local';

interface CapaLocal {
  actividades: Record<string, Actividad>;
  historial: Record<string, VersionActividad[]>;
  config: ConfigCatalogo;
}

function capaVacia(): CapaLocal {
  return { actividades: {}, historial: {}, config: { ...CONFIG_POR_DEFECTO } };
}

/**
 * Repositorio de la vista previa privada: catálogo incluido en la compilación + cambios de
 * administración guardados en este navegador (con historial de versiones).
 * No protege contenido de pago: solo es apto para un entorno privado.
 */
export class RepositorioLocal implements RepositorioCatalogo {
  readonly tipo: 'local' | 'demo';
  private base: Catalogo | null = null;
  constructor(private cargarBase: () => Promise<Catalogo>, tipo: 'local' | 'demo' = 'local') {
    this.tipo = tipo;
  }

  private capa(): CapaLocal {
    const c = leer<CapaLocal | null>(CLAVE_CATALOGO_LOCAL, null);
    if (!c || typeof c !== 'object') return capaVacia();
    return { actividades: c.actividades ?? {}, historial: c.historial ?? {}, config: { ...CONFIG_POR_DEFECTO, ...(c.config ?? {}) } };
  }

  async cargar() {
    if (!this.base) this.base = await this.cargarBase();
    const capa = this.tipo === 'local' ? this.capa() : capaVacia();
    const ids = new Set(this.base.actividades.map((a) => a.id));
    const actividades = this.base.actividades.map((a) => capa.actividades[a.id] ?? a);
    for (const [id, a] of Object.entries(capa.actividades)) if (!ids.has(id)) actividades.push(a);
    const resumen = { publicado: 0, revision: 0, borrador: 0, archivado: 0 } as Record<Estado, number>;
    actividades.forEach((a) => (resumen[a.estado] += 1));
    return {
      catalogo: { ...this.base, actividades, resumen },
      config: capa.config,
      editadas: new Set(Object.keys(capa.actividades)),
    };
  }

  async guardarActividad(a: Actividad, nota: string): Promise<Actividad> {
    if (this.tipo !== 'local') throw new Error('La demostración no permite editar el catálogo.');
    if (!this.base) await this.cargar();
    const capa = this.capa();
    const anterior = capa.actividades[a.id] ?? this.base!.actividades.find((x) => x.id === a.id) ?? null;
    const ahora = new Date().toISOString();
    const nueva: Actividad = { ...a, version: (anterior?.version ?? 0) + 1, actualizado: ahora.slice(0, 10) };
    const hist = capa.historial[a.id] ?? [];
    if (anterior && !hist.some((h) => h.version === anterior.version)) {
      hist.push({ version: anterior.version, estado: anterior.estado, fecha: anterior.actualizado, nota: 'Versión importada', data: anterior });
    }
    hist.push({ version: nueva.version, estado: nueva.estado, fecha: ahora, nota: nota || 'Edición', data: nueva });
    capa.actividades[a.id] = nueva;
    capa.historial[a.id] = hist.slice(-30);
    escribir(CLAVE_CATALOGO_LOCAL, capa);
    return nueva;
  }

  async historial(id: string): Promise<VersionActividad[]> {
    const capa = this.capa();
    const hist = capa.historial[id];
    if (hist?.length) return [...hist].reverse();
    const base = this.base?.actividades.find((a) => a.id === id);
    return base ? [{ version: base.version, estado: base.estado, fecha: base.actualizado, nota: 'Versión importada', data: base }] : [];
  }

  async descartarCambios(id: string): Promise<void> {
    const capa = this.capa();
    delete capa.actividades[id];
    delete capa.historial[id];
    escribir(CLAVE_CATALOGO_LOCAL, capa);
  }

  async guardarConfig(c: ConfigCatalogo): Promise<void> {
    const capa = this.capa();
    capa.config = c;
    escribir(CLAVE_CATALOGO_LOCAL, capa);
  }

  async exportar(): Promise<Catalogo> {
    return (await this.cargar()).catalogo;
  }

  static borrarTodo() {
    borrar(CLAVE_CATALOGO_LOCAL);
  }
}

export function idDisponible(titulo: string, existentes: Set<string>): string {
  const base = normalizar(titulo).replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 60) || 'actividad';
  let id = base;
  let i = 2;
  while (existentes.has(id)) id = `${base}-${i++}`;
  return id;
}

export function actividadVacia(id: string, titulo: string): Actividad {
  const hoy = new Date().toISOString().slice(0, 10);
  return {
    id,
    version: 0,
    estado: 'borrador',
    motivoEstado: 'Actividad nueva creada en administración.',
    titulo,
    subtitulo: null,
    resumen: null,
    contexto: null,
    objetivo: null,
    momentos: ['apertura'],
    temas: [],
    formato: ['grupo'],
    tipoFuente: null,
    duracion: null,
    notaDuracion: null,
    nivelFuente: null,
    energiaFuente: null,
    momentoFuente: null,
    enfoqueFuente: null,
    espacio: { tipo: 'interior' },
    participantes: null,
    materiales: [],
    ambiente: [],
    preparacion: [],
    experiencia: 'inicial',
    intensidad: 'suave',
    adaptaciones: [],
    consentimiento: [],
    criteriosPausa: [],
    cuandoUtilizar: [],
    cuandoEvitar: [],
    secciones: [],
    fases: [],
    queObservar: [],
    recomendaciones: [],
    relacionadas: [],
    variantes: [],
    fuentes: [],
    correcciones: [],
    incidencias: [],
    propuestas: [],
    notasAdmin: [],
    clasificacion: {},
    sistemaProfesional: null,
    sumaFases: null,
    imagen: null,
    actualizado: hoy,
    orden: 9999,
    procedencia: { titulo: 'nuevo' },
  };
}
