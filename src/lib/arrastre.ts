/**
 * Reordenar una lista arrastrando con el dedo o el ratón (Pointer Events), con alternativa de teclado.
 * Se calcula en coordenadas del documento para tolerar el desplazamiento de la página durante el arrastre.
 */
import { useCallback, useRef, useState } from 'react';

interface EstadoInterno {
  desde: number;
  inicioY: number; // clientY + scrollY al empezar
  centros: number[]; // centros de cada elemento en coordenadas del documento
  alto: number;
  pointerId: number;
}

export function useArrastre(ids: string[], onMover: (desde: number, hasta: number) => void, hueco = 8) {
  const [vista, setVista] = useState<{ id: string; desde: number; hasta: number; dy: number; alto: number } | null>(null);
  const nodos = useRef(new Map<string, HTMLElement>());
  const interno = useRef<EstadoInterno | null>(null);
  const hastaRef = useRef(0);

  const registrar = useCallback(
    (id: string) => (el: HTMLElement | null) => {
      if (el) nodos.current.set(id, el);
      else nodos.current.delete(id);
    },
    [],
  );

  const terminar = (aplicar: boolean) => {
    const s = interno.current;
    interno.current = null;
    setVista(null);
    if (aplicar && s && hastaRef.current !== s.desde) onMover(s.desde, hastaRef.current);
  };

  const asa = (id: string) => ({
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      const desde = ids.indexOf(id);
      if (desde < 0) return;
      const sy = window.scrollY;
      const rects = ids.map((x) => nodos.current.get(x)?.getBoundingClientRect());
      if (rects.some((r) => !r)) return;
      const centros = rects.map((r) => r!.top + sy + r!.height / 2);
      const alto = rects[desde]!.height;
      interno.current = { desde, inicioY: e.clientY + sy, centros, alto, pointerId: e.pointerId };
      hastaRef.current = desde;
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* sin captura */
      }
      setVista({ id, desde, hasta: desde, dy: 0, alto });
      e.preventDefault();
    },
    onPointerMove: (e: React.PointerEvent<HTMLElement>) => {
      const s = interno.current;
      if (!s || e.pointerId !== s.pointerId) return;
      const y = e.clientY + window.scrollY;
      const dy = y - s.inicioY;
      const centro = s.centros[s.desde] + dy;
      let hasta = s.desde;
      for (let i = 0; i < s.desde; i++) if (centro < s.centros[i]) {
        hasta = i;
        break;
      }
      if (hasta === s.desde) for (let i = s.centros.length - 1; i > s.desde; i--) if (centro > s.centros[i]) {
        hasta = i;
        break;
      }
      hastaRef.current = hasta;
      setVista((v) => (v ? { ...v, dy, hasta } : v));
      if (e.clientY < 90) window.scrollBy(0, -12);
      else if (e.clientY > window.innerHeight - 110) window.scrollBy(0, 12);
    },
    onPointerUp: () => terminar(true),
    onPointerCancel: () => terminar(false),
    onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => {
      const i = ids.indexOf(id);
      let destino = -1;
      if (e.key === 'ArrowUp' && i > 0) destino = i - 1;
      if (e.key === 'ArrowDown' && i < ids.length - 1) destino = i + 1;
      if (destino < 0) return;
      e.preventDefault();
      onMover(i, destino);
      requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-asa="${CSS.escape(id)}"]`)?.focus());
    },
    'data-asa': id,
  });

  const estilo = (id: string): React.CSSProperties | undefined => {
    if (!vista) return undefined;
    const i = ids.indexOf(id);
    if (id === vista.id) return { transform: `translateY(${vista.dy}px)`, transition: 'none', zIndex: 5, position: 'relative' };
    const d = vista.alto + hueco;
    if (vista.desde < vista.hasta && i > vista.desde && i <= vista.hasta) return { transform: `translateY(${-d}px)`, transition: 'transform 160ms ease' };
    if (vista.hasta < vista.desde && i >= vista.hasta && i < vista.desde) return { transform: `translateY(${d}px)`, transition: 'transform 160ms ease' };
    return { transform: 'none', transition: 'transform 160ms ease' };
  };

  return { registrar, asa, estilo, arrastrando: vista?.id ?? null };
}
