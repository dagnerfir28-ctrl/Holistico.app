/**
 * Enrutador mínimo basado en el hash (#/ruta?param=valor).
 * Funciona igual en el hosting propio y en la vista previa (donde el hash no se ve en la barra de direcciones).
 */
import { useSyncExternalStore } from 'react';

export interface Ruta {
  /** Ruta sin parámetros, por ejemplo "/actividad/circulo-de-gratitud" */
  path: string;
  partes: string[];
  query: URLSearchParams;
  /** Hash completo sin "#" (ruta + parámetros) */
  completo: string;
}

function hashActual(): string {
  if (typeof window === 'undefined') return '/';
  const h = window.location.hash.replace(/^#/, '');
  return h.startsWith('/') ? h : '/';
}

let cacheHash = '';
let cacheRuta: Ruta = parsear('/');

function parsear(h: string): Ruta {
  const [p, q = ''] = h.split('?');
  const path = p.replace(/\/+$/, '') || '/';
  return {
    path,
    partes: path.split('/').filter(Boolean).map((x) => {
      try {
        return decodeURIComponent(x);
      } catch {
        return x;
      }
    }),
    query: new URLSearchParams(q),
    completo: h,
  };
}

function leerRuta(): Ruta {
  const h = hashActual();
  if (h !== cacheHash) {
    cacheHash = h;
    cacheRuta = parsear(h);
  }
  return cacheRuta;
}

const oyentes = new Set<() => void>();
let profundidad = 0; // navegaciones internas, para decidir si "Volver" puede usar el historial

function suscribir(fn: () => void) {
  oyentes.add(fn);
  const h = () => fn();
  window.addEventListener('hashchange', h);
  return () => {
    oyentes.delete(fn);
    window.removeEventListener('hashchange', h);
  };
}

function avisar() {
  oyentes.forEach((f) => f());
}

export function useRuta(): Ruta {
  return useSyncExternalStore(suscribir, leerRuta, leerRuta);
}

/** Posiciones de desplazamiento por ruta, para volver a la lista donde se estaba. */
const posiciones = new Map<string, number>();

export function guardarPosicion() {
  posiciones.set(hashActual(), window.scrollY);
}

export function posicionGuardada(hash: string): number | undefined {
  return posiciones.get(hash);
}

export function navegar(to: string, opciones: { reemplazar?: boolean } = {}) {
  if (!to.startsWith('/')) to = '/' + to;
  if (to === hashActual()) return;
  guardarPosicion();
  if (opciones.reemplazar) {
    try {
      window.history.replaceState(window.history.state, '', '#' + to);
    } catch {
      window.location.replace('#' + to);
    }
    avisar();
    return;
  }
  profundidad += 1;
  window.location.hash = to;
}

/** Vuelve a la pantalla anterior si se llegó navegando dentro de la app; si no, va a `alternativa`. */
export function volver(alternativa = '/') {
  if (profundidad > 0) {
    profundidad -= 1;
    guardarPosicion();
    window.history.back();
  } else {
    navegar(alternativa, { reemplazar: true });
  }
}

export function construirRuta(path: string, params: Record<string, string | number | null | undefined | false>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== null && v !== undefined && v !== false && v !== '') q.set(k, String(v));
  const s = q.toString();
  return s ? `${path}?${s}` : path;
}

type EnlaceProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & { to: string };

export function Enlace({ to, onClick, children, ...rest }: EnlaceProps) {
  return (
    <a
      href={'#' + to}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        navegar(to);
      }}
      {...rest}
    >
      {children}
    </a>
  );
}
