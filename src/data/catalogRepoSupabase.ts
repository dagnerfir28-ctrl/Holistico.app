/**
 * Catálogo en Supabase (producción).
 *  - Compradoras: función catalogo_publicado() → solo fichas publicadas y ya depuradas en el servidor
 *    (sin notas internas, incidencias, propuestas ni textos retenidos). Exige acceso activo.
 *  - Administración: tabla actividades completa (RLS: solo is_admin()) y guardado con historial mediante guardar_actividad().
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Actividad, Catalogo, Estado } from '../domain/types';
import { CONFIG_POR_DEFECTO, type ConfigCatalogo, type RepositorioCatalogo, type VersionActividad } from './catalogRepo';

type Base = Omit<Catalogo, 'actividades' | 'resumen'>;

const BASE_VACIA: Base = {
  schema: 1,
  generado: '',
  fuentes: {},
  materialesCanonicos: [],
  opcionesConsentimiento: {},
  incidenciasDocumento: {
    principal: { indice: null, pagina38: '', duplicados: [], separadorIncorrecto: [], fichasIncompletas: [], piesDePagina: '' },
    edicion2: [],
  },
};

export class RepositorioSupabase implements RepositorioCatalogo {
  readonly tipo = 'supabase' as const;
  constructor(private sb: SupabaseClient, private esAdmin: boolean) {}

  async cargar() {
    const metaRes = await this.sb.from('catalogo_meta').select('clave, valor');
    if (metaRes.error) throw metaRes.error;
    const meta = Object.fromEntries((metaRes.data ?? []).map((m) => [m.clave as string, m.valor]));
    let actividades: Actividad[];
    if (this.esAdmin) {
      const { data, error } = await this.sb.from('actividades').select('datos').order('orden', { ascending: true });
      if (error) throw error;
      actividades = (data ?? []).map((r) => r.datos as Actividad);
    } else {
      const { data, error } = await this.sb.rpc('catalogo_publicado');
      if (error) throw error;
      actividades = ((data ?? []) as { datos: Actividad }[]).map((r) => r.datos);
    }
    const resumen = { publicado: 0, revision: 0, borrador: 0, archivado: 0 } as Record<Estado, number>;
    actividades.forEach((a) => (resumen[a.estado] += 1));
    const base: Base = { ...BASE_VACIA, ...((meta.base as Partial<Base>) ?? {}) };
    if (meta.incidencias) base.incidenciasDocumento = meta.incidencias as Base['incidenciasDocumento'];
    // Enlaces a los PDF originales: solo en los metadatos privados (visibles para administración).
    if (this.esAdmin && meta.fuentes_admin) base.fuentes = meta.fuentes_admin as Base['fuentes'];
    const config: ConfigCatalogo = { ...CONFIG_POR_DEFECTO, ...((meta.config as Partial<ConfigCatalogo>) ?? {}) };
    return { catalogo: { ...base, actividades, resumen }, config, editadas: new Set<string>() };
  }

  async guardarActividad(a: Actividad, nota: string): Promise<Actividad> {
    if (!this.esAdmin) throw new Error('Solo la administración puede editar el catálogo.');
    const { data, error } = await this.sb.rpc('guardar_actividad', { p_datos: a, p_nota: nota || 'Edición' });
    if (error) throw error;
    return data as Actividad;
  }

  async historial(id: string): Promise<VersionActividad[]> {
    const { data, error } = await this.sb
      .from('actividad_versiones')
      .select('version, estado, creado, nota, datos')
      .eq('actividad_id', id)
      .order('version', { ascending: false })
      .limit(30);
    if (error) throw error;
    return (data ?? []).map((v) => ({ version: v.version, estado: v.estado, fecha: v.creado, nota: v.nota, data: v.datos as Actividad }));
  }

  async guardarConfig(c: ConfigCatalogo): Promise<void> {
    const { error } = await this.sb.rpc('guardar_config_catalogo', { p_config: c });
    if (error) throw error;
  }
}
