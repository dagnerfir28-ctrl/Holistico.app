import { useEffect, useRef, useState } from 'react';

/** Hora actual que se actualiza cada `cadaMs` mientras `activo` sea verdadero.
 *  También se actualiza al volver a la pestaña (el tiempo real se calcula con marcas de tiempo). */
export function useAhora(cadaMs = 1000, activo = true): number {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const tick = () => setAhora(Date.now());
    const onVis = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', tick);
    let id: number | undefined;
    if (activo) id = window.setInterval(tick, cadaMs);
    tick();
    return () => {
      if (id) window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('focus', tick);
    };
  }, [cadaMs, activo]);
  return ahora;
}

export function useMedia(query: string): boolean {
  const [coincide, setCoincide] = useState(() => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : false));
  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia(query);
    const fn = () => setCoincide(mq.matches);
    fn();
    mq.addEventListener?.('change', fn);
    return () => mq.removeEventListener?.('change', fn);
  }, [query]);
  return coincide;
}

export function useDebounced<T>(valor: T, ms = 200): T {
  const [v, setV] = useState(valor);
  useEffect(() => {
    const id = window.setTimeout(() => setV(valor), ms);
    return () => window.clearTimeout(id);
  }, [valor, ms]);
  return v;
}

/** Título del documento (pestaña del navegador). */
export function useTitulo(titulo: string) {
  useEffect(() => {
    const anterior = document.title;
    document.title = titulo;
    return () => {
      document.title = anterior;
    };
  }, [titulo]);
}

export function useEnLinea(): boolean {
  const [enLinea, setEnLinea] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine !== false : true));
  useEffect(() => {
    const on = () => setEnLinea(true);
    const off = () => setEnLinea(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return enLinea;
}

/** Ejecuta `fn` al pulsar Escape mientras `activo`. */
export function useEscape(fn: () => void, activo = true) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    if (!activo) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') ref.current();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [activo]);
}

/** Atrapa el foco dentro de un contenedor (diálogos) y lo devuelve al cerrar. */
export function useFocoAtrapado(ref: React.RefObject<HTMLElement>, activo: boolean) {
  useEffect(() => {
    if (!activo || !ref.current) return;
    const previo = document.activeElement as HTMLElement | null;
    const el = ref.current;
    const enfocables = () =>
      Array.from(el.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')).filter(
        (x) => x.offsetParent !== null || x === document.activeElement,
      );
    const primero = el.querySelector<HTMLElement>('[data-autofocus]') ?? enfocables()[0];
    (primero ?? el).focus({ preventScroll: true });
    const h = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const lista = enfocables();
      if (!lista.length) return;
      const a = lista[0];
      const z = lista[lista.length - 1];
      if (e.shiftKey && document.activeElement === a) {
        e.preventDefault();
        z.focus();
      } else if (!e.shiftKey && document.activeElement === z) {
        e.preventDefault();
        a.focus();
      }
    };
    el.addEventListener('keydown', h);
    return () => {
      el.removeEventListener('keydown', h);
      previo?.focus?.({ preventScroll: true });
    };
  }, [activo, ref]);
}
