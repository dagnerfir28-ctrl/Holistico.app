/**
 * Renderizador de Markdown seguro: convierte el texto en elementos de React (nunca usa innerHTML),
 * así que cualquier HTML que llegue en la respuesta se muestra como texto y no se ejecuta.
 * Admite títulos, párrafos, listas, citas, negrita, cursiva, código en línea, enlaces https y
 * referencias a fichas con el formato [[id-de-ficha]].
 */
import type { ReactNode } from 'react';

type RenderCita = (id: string, key: string) => ReactNode;

const RE_INLINE =
  /(`[^`\n]+`)|(\*\*[^*\n]+\*\*)|(__[^_\n]+__)|(\[\[[a-z0-9-]+\]\])|(\[[^\]\n]+\]\((https?:\/\/[^\s)]+)\))|(\*[^*\s\n][^*\n]*\*)|(_[^_\s\n][^_\n]*_)/g;

export function renderInline(texto: string, renderCita?: RenderCita, prefijo = 'i'): ReactNode[] {
  const out: ReactNode[] = [];
  let ultimo = 0;
  let n = 0;
  for (const m of texto.matchAll(RE_INLINE)) {
    const i = m.index ?? 0;
    if (i > ultimo) out.push(texto.slice(ultimo, i));
    const k = `${prefijo}-${n++}`;
    const [todo, code, bold, bold2, cita, enlace, url, it, it2] = m;
    if (code) out.push(<code key={k}>{code.slice(1, -1)}</code>);
    else if (bold || bold2) out.push(<strong key={k}>{renderInline(todo.slice(2, -2), renderCita, k)}</strong>);
    else if (cita) {
      const id = cita.slice(2, -2);
      out.push(renderCita ? renderCita(id, k) : <span key={k}>{id}</span>);
    } else if (enlace && url) {
      const etiqueta = enlace.slice(1, enlace.indexOf(']('));
      out.push(
        <a key={k} href={url} target="_blank" rel="noopener noreferrer">
          {etiqueta}
        </a>,
      );
    } else if (it || it2) out.push(<em key={k}>{renderInline(todo.slice(1, -1), renderCita, k)}</em>);
    else out.push(todo);
    ultimo = i + todo.length;
  }
  if (ultimo < texto.length) out.push(texto.slice(ultimo));
  return out;
}

interface Item {
  texto: string;
  hijos: { tipo: 'ul' | 'ol'; items: string[] } | null;
}

type Bloque =
  | { tipo: 'h'; nivel: number; texto: string }
  | { tipo: 'p'; lineas: string[] }
  | { tipo: 'ul' | 'ol'; items: Item[]; inicio: number }
  | { tipo: 'quote'; lineas: string[] }
  | { tipo: 'hr' };

export function parsearBloques(texto: string): Bloque[] {
  const lineas = texto.replace(/\r\n?/g, '\n').split('\n');
  const bloques: Bloque[] = [];
  let actual: Bloque | null = null;
  const cerrar = () => {
    if (actual) bloques.push(actual);
    actual = null;
  };
  for (const linea of lineas) {
    const h = /^\s{0,3}(#{1,6})\s+(.*?)\s*#*\s*$/.exec(linea);
    const ul = /^(\s*)[-*•]\s+(.*)$/.exec(linea);
    const ol = /^(\s*)(\d{1,3})[.)]\s+(.*)$/.exec(linea);
    const q = /^\s*>\s?(.*)$/.exec(linea);
    if (!linea.trim()) {
      cerrar();
      continue;
    }
    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(linea)) {
      cerrar();
      bloques.push({ tipo: 'hr' });
      continue;
    }
    if (h) {
      cerrar();
      bloques.push({ tipo: 'h', nivel: h[1].length, texto: h[2] });
      continue;
    }
    if (ul || ol) {
      const sangria = (ul ? ul[1] : ol![1]).length;
      const tipo: 'ul' | 'ol' = ul ? 'ul' : 'ol';
      const contenido = ul ? ul[2] : ol![3];
      const a = actual as Bloque | null;
      if (sangria >= 2 && a && (a.tipo === 'ul' || a.tipo === 'ol') && a.items.length) {
        const padre = a.items[a.items.length - 1];
        if (!padre.hijos) padre.hijos = { tipo, items: [] };
        padre.hijos.items.push(contenido);
        continue;
      }
      if (!a || a.tipo !== tipo) {
        cerrar();
        actual = { tipo, items: [], inicio: ol ? Number(ol[2]) : 1 };
      }
      (actual as { items: Item[] }).items.push({ texto: contenido, hijos: null });
      continue;
    }
    if (q) {
      const a = actual as Bloque | null;
      if (!a || a.tipo !== 'quote') {
        cerrar();
        actual = { tipo: 'quote', lineas: [] };
      }
      (actual as { lineas: string[] }).lineas.push(q[1]);
      continue;
    }
    const a = actual as Bloque | null;
    if (a && (a.tipo === 'ul' || a.tipo === 'ol') && /^\s{2,}\S/.test(linea) && a.items.length) {
      a.items[a.items.length - 1].texto += ' ' + linea.trim();
      continue;
    }
    if (!a || a.tipo !== 'p') {
      cerrar();
      actual = { tipo: 'p', lineas: [] };
    }
    (actual as { lineas: string[] }).lineas.push(linea.trim());
  }
  cerrar();
  return bloques;
}

export function Markdown({ texto, renderCita, className }: { texto: string; renderCita?: RenderCita; className?: string }) {
  const bloques = parsearBloques(texto);
  return (
    <div className={['md', className].filter(Boolean).join(' ')}>
      {bloques.map((b, i) => {
        const k = `b${i}`;
        switch (b.tipo) {
          case 'h': {
            const Tag = (b.nivel <= 2 ? 'h3' : b.nivel === 3 ? 'h4' : 'h5') as 'h3' | 'h4' | 'h5';
            return <Tag key={k}>{renderInline(b.texto, renderCita, k)}</Tag>;
          }
          case 'p':
            return (
              <p key={k}>
                {b.lineas.map((l, j) => (
                  <span key={j}>
                    {j > 0 && <br />}
                    {renderInline(l, renderCita, `${k}-${j}`)}
                  </span>
                ))}
              </p>
            );
          case 'quote':
            return <blockquote key={k}>{renderInline(b.lineas.join(' '), renderCita, k)}</blockquote>;
          case 'hr':
            return <hr key={k} />;
          case 'ul':
          case 'ol': {
            const Lista = b.tipo;
            return (
              <Lista key={k} start={b.tipo === 'ol' && b.inicio !== 1 ? b.inicio : undefined}>
                {b.items.map((it, j) => (
                  <li key={j}>
                    {renderInline(it.texto, renderCita, `${k}-${j}`)}
                    {it.hijos &&
                      (it.hijos.tipo === 'ul' ? (
                        <ul>
                          {it.hijos.items.map((h, z) => (
                            <li key={z}>{renderInline(h, renderCita, `${k}-${j}-${z}`)}</li>
                          ))}
                        </ul>
                      ) : (
                        <ol>
                          {it.hijos.items.map((h, z) => (
                            <li key={z}>{renderInline(h, renderCita, `${k}-${j}-${z}`)}</li>
                          ))}
                        </ol>
                      ))}
                  </li>
                ))}
              </Lista>
            );
          }
        }
      })}
    </div>
  );
}
