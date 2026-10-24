/** Acceso seguro a localStorage: nunca lanza; si no está disponible usa memoria y lo informa. */

const memoria = new Map<string, string>();
let disponible: boolean | null = null;

export function almacenamientoDisponible(): boolean {
  if (disponible !== null) return disponible;
  try {
    const k = '__rh_test__';
    window.localStorage.setItem(k, '1');
    window.localStorage.removeItem(k);
    disponible = true;
  } catch {
    disponible = false;
  }
  return disponible;
}

export function leer<T>(clave: string, porDefecto: T): T {
  try {
    const raw = almacenamientoDisponible() ? window.localStorage.getItem(clave) : memoria.get(clave) ?? null;
    if (raw == null) return porDefecto;
    return JSON.parse(raw) as T;
  } catch {
    return porDefecto;
  }
}

export class ErrorGuardado extends Error {
  constructor(public causa: 'cuota' | 'no-disponible' | 'desconocido', mensaje: string) {
    super(mensaje);
  }
}

export function escribir(clave: string, valor: unknown): void {
  const texto = JSON.stringify(valor);
  if (!almacenamientoDisponible()) {
    memoria.set(clave, texto);
    throw new ErrorGuardado('no-disponible', 'Este navegador no permite guardar datos: los cambios se perderán al cerrar la página.');
  }
  try {
    window.localStorage.setItem(clave, texto);
  } catch (e) {
    memoria.set(clave, texto);
    const cuota = e instanceof DOMException && (e.name === 'QuotaExceededError' || e.code === 22);
    throw new ErrorGuardado(
      cuota ? 'cuota' : 'desconocido',
      cuota ? 'No queda espacio para guardar en este navegador. Exporta una copia de seguridad y libera espacio.' : 'No se pudo guardar en este navegador.',
    );
  }
}

export function borrar(clave: string): void {
  try {
    if (almacenamientoDisponible()) window.localStorage.removeItem(clave);
  } catch {
    /* sin acción */
  }
  memoria.delete(clave);
}
