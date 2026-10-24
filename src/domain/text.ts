/** Normaliza texto para búsqueda: minúsculas, sin tildes ni diéresis, espacios simples. */
export function normalizar(texto: string | null | undefined): string {
  return (texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9ñ\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokens(texto: string): string[] {
  return normalizar(texto)
    .split(' ')
    .filter((t) => t.length > 0 && !STOP.has(t));
}

const STOP = new Set(['de', 'la', 'el', 'los', 'las', 'y', 'o', 'a', 'en', 'con', 'para', 'un', 'una', 'del', 'al', 'que', 'por', 'se', 'su', 'sus', 'mi', 'me']);

export function capitalizar(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

export function nuevoId(prefijo = 'id'): string {
  const rnd = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10);
  return `${prefijo}-${Date.now().toString(36)}-${rnd}`;
}

export function plural(n: number, uno: string, varios: string): string {
  return `${n} ${n === 1 ? uno : varios}`;
}
