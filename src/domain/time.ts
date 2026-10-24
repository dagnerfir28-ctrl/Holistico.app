/** Utilidades de horas (HH:MM) y duraciones en minutos. */

export function aMinutos(hhmm: string | null | undefined): number | null {
  if (!hhmm) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

export function aHora(minutos: number): string {
  const total = ((Math.round(minutos) % 1440) + 1440) % 1440;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** "1 h 15 min", "45 min" */
export function formatoDuracion(min: number): string {
  if (!Number.isFinite(min) || min <= 0) return '0 min';
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h === 0) return `${m} min`;
  if (m === 0) return h === 1 ? '1 h' : `${h} h`;
  return `${h} h ${m} min`;
}

export function formatoRango(r: { min: number; max: number } | null | undefined): string {
  if (!r) return 'Duración no especificada';
  if (r.min === r.max) return formatoDuracion(r.min);
  if (r.max < 60) return `${r.min}–${r.max} min`;
  return `${formatoDuracion(r.min)} – ${formatoDuracion(r.max)}`;
}

/** mm:ss o h:mm:ss a partir de milisegundos */
export function formatoReloj(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function hoyISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function fechaLarga(iso: string | null | undefined): string {
  if (!iso) return '';
  const [y, mo, d] = iso.split('-').map(Number);
  if (!y || !mo || !d) return iso;
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  return `${d} de ${meses[mo - 1]} de ${y}`;
}

export function fechaCorta(isoDateTime: string | null | undefined): string {
  if (!isoDateTime) return '';
  const d = new Date(isoDateTime);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' });
}
