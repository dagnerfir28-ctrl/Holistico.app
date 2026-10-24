/** Copia de seguridad de los datos personales (incluye notas privadas: solo se genera por elección explícita). */
import type { DatosUsuario } from '../domain/types';
import { sanearDatos } from '../data/userStore';
import { hoyISO } from '../domain/time';
import { guardarArchivo, type ResultadoDescarga } from './platform';
import { APP } from '../config/app';

export function exportarCopia(d: DatosUsuario): Promise<ResultadoDescarga> {
  const contenido = JSON.stringify({ app: APP.nombre, tipo: 'copia-de-seguridad', version: 1, exportado: new Date().toISOString(), datos: d }, null, 2);
  return guardarArchivo(`retiros-holisticos-copia-${hoyISO()}.json`, contenido, 'application/json');
}

export interface ResultadoImportacion {
  ok: boolean;
  datos?: DatosUsuario;
  error?: string;
  resumen?: string;
}

export function leerCopia(texto: string): ResultadoImportacion {
  let json: unknown;
  try {
    json = JSON.parse(texto);
  } catch {
    return { ok: false, error: 'El archivo no es una copia válida (no es JSON).' };
  }
  const obj = json as { tipo?: string; datos?: unknown };
  if (!obj || typeof obj !== 'object' || obj.tipo !== 'copia-de-seguridad' || !obj.datos) {
    return { ok: false, error: 'El archivo no parece una copia de seguridad de esta app.' };
  }
  const datos = sanearDatos(obj.datos);
  const resumen = `${datos.retiros.length} retiro(s), ${Object.keys(datos.favoritos).length} favorita(s) y ${Object.keys(datos.notasActividad).length} nota(s).`;
  return { ok: true, datos, resumen };
}
