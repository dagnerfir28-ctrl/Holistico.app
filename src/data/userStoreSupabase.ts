/**
 * Datos del usuario en Supabase (producción). Cada persona solo puede leer y escribir sus filas (RLS: user_id = auth.uid()).
 * Se mantiene una copia local por cuenta para poder trabajar sin conexión con los retiros guardados.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { DatosUsuario, Retiro } from '../domain/types';
import type { AlmacenUsuario } from './userStore';
import { datosVacios, sanearDatos } from './userStore';
import { escribir, leer } from './storage';

type Generales = Omit<DatosUsuario, 'retiros' | 'papelera' | 'version'>;

function generales(d: DatosUsuario): Generales {
  const { retiros: _r, papelera: _p, version: _v, ...resto } = d;
  void _r;
  void _p;
  void _v;
  return resto;
}

export class AlmacenSupabase implements AlmacenUsuario {
  readonly tipo = 'supabase' as const;
  private claveCache: string;
  constructor(private sb: SupabaseClient, private userId: string) {
    this.claveCache = `rh:v1:sb:${userId}`;
  }

  /** Lectura inmediata de la copia local (para mostrar algo sin esperar a la red). */
  cache(): DatosUsuario | null {
    const c = leer<unknown>(this.claveCache, null);
    return c ? sanearDatos(c) : null;
  }

  async cargar(): Promise<DatosUsuario> {
    const cache = this.cache();
    try {
      const [{ data: fila, error: e1 }, { data: filasRetiros, error: e2 }] = await Promise.all([
        this.sb.from('datos_usuario').select('datos').eq('user_id', this.userId).maybeSingle(),
        this.sb.from('retiros').select('id, datos, eliminado').eq('user_id', this.userId),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      const base = (fila?.datos as Partial<DatosUsuario> | undefined) ?? {};
      const retiros: Retiro[] = [];
      const papelera: Retiro[] = [];
      for (const r of filasRetiros ?? []) {
        const datos = r.datos as Retiro;
        if (r.eliminado) papelera.push({ ...datos, eliminado: r.eliminado as string });
        else retiros.push({ ...datos, eliminado: null });
      }
      retiros.sort((a, b) => (b.actualizado || '').localeCompare(a.actualizado || ''));
      const d = sanearDatos({ ...datosVacios(), ...base, retiros, papelera });
      try {
        escribir(this.claveCache, d);
      } catch {
        /* la copia local es opcional */
      }
      return d;
    } catch (e) {
      if (cache) return cache; // sin conexión: se usa la copia local
      throw e;
    }
  }

  async guardar(anterior: DatosUsuario, nuevo: DatosUsuario): Promise<void> {
    try {
      escribir(this.claveCache, nuevo);
    } catch {
      /* si no hay espacio local, se intenta igualmente en el servidor */
    }
    const ops: PromiseLike<unknown>[] = [];
    const gA = JSON.stringify(generales(anterior));
    const gN = generales(nuevo);
    if (JSON.stringify(gN) !== gA) {
      ops.push(
        this.sb
          .from('datos_usuario')
          .upsert({ user_id: this.userId, datos: gN, actualizado: new Date().toISOString() }, { onConflict: 'user_id' })
          .then(({ error }) => {
            if (error) throw error;
          }),
      );
    }
    const antes = new Map<string, string>();
    for (const r of [...anterior.retiros, ...anterior.papelera]) antes.set(r.id, JSON.stringify(r));
    const ahora = [...nuevo.retiros, ...nuevo.papelera];
    const cambiados = ahora.filter((r) => antes.get(r.id) !== JSON.stringify(r));
    if (cambiados.length) {
      ops.push(
        this.sb
          .from('retiros')
          .upsert(
            cambiados.map((r) => ({ id: r.id, user_id: this.userId, datos: r, eliminado: r.eliminado ?? null, actualizado: r.actualizado })),
            { onConflict: 'user_id,id' },
          )
          .then(({ error }) => {
            if (error) throw error;
          }),
      );
    }
    const idsAhora = new Set(ahora.map((r) => r.id));
    const borrados = [...antes.keys()].filter((id) => !idsAhora.has(id));
    if (borrados.length) {
      ops.push(
        this.sb
          .from('retiros')
          .delete()
          .eq('user_id', this.userId)
          .in('id', borrados)
          .then(({ error }) => {
            if (error) throw error;
          }),
      );
    }
    await Promise.all(ops);
  }
}
