import { useId, useRef, type ReactNode } from 'react';
import { Icon, type NombreIcono } from './Icon';
import { useEscape, useFocoAtrapado } from '../lib/hooks';
import { Enlace, volver } from '../lib/router';

type Variante = 'primario' | 'secundario' | 'suave' | 'fantasma' | 'peligro' | 'peligro-solido';

interface BotonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante;
  tam?: 'sm' | 'md' | 'lg';
  icono?: NombreIcono;
  iconoDer?: NombreIcono;
  bloque?: boolean;
}

function clasesBoton(variante: Variante, tam: 'sm' | 'md' | 'lg', bloque?: boolean, extra?: string) {
  return [
    'btn',
    variante === 'secundario' ? '' : `btn-${variante}`,
    tam === 'md' ? '' : `btn-${tam}`,
    bloque ? 'btn-bloque' : '',
    extra ?? '',
  ]
    .filter(Boolean)
    .join(' ');
}

export function Boton({ variante = 'secundario', tam = 'md', icono, iconoDer, bloque, className, children, type = 'button', ...rest }: BotonProps) {
  return (
    <button type={type} className={clasesBoton(variante, tam, bloque, className)} {...rest}>
      {icono && <Icon nombre={icono} tam={tam === 'sm' ? 16 : 18} />}
      {children}
      {iconoDer && <Icon nombre={iconoDer} tam={tam === 'sm' ? 16 : 18} />}
    </button>
  );
}

export function BotonEnlace({
  to,
  variante = 'secundario',
  tam = 'md',
  icono,
  iconoDer,
  bloque,
  className,
  children,
  ...rest
}: { to: string; variante?: Variante; tam?: 'sm' | 'md' | 'lg'; icono?: NombreIcono; iconoDer?: NombreIcono; bloque?: boolean; className?: string; children: ReactNode } & Omit<
  React.AnchorHTMLAttributes<HTMLAnchorElement>,
  'href'
>) {
  return (
    <Enlace to={to} className={clasesBoton(variante, tam, bloque, className)} {...rest}>
      {icono && <Icon nombre={icono} tam={tam === 'sm' ? 16 : 18} />}
      {children}
      {iconoDer && <Icon nombre={iconoDer} tam={tam === 'sm' ? 16 : 18} />}
    </Enlace>
  );
}

export function BotonIcono({
  icono,
  etiqueta,
  variante = 'fantasma',
  tam = 'md',
  className,
  relleno,
  ...rest
}: Omit<BotonProps, 'children' | 'icono'> & { icono: NombreIcono; etiqueta: string; relleno?: boolean }) {
  return (
    <button type="button" className={clasesBoton(variante, tam, false, ['btn-icono', className].filter(Boolean).join(' '))} aria-label={etiqueta} title={etiqueta} {...rest}>
      <Icon nombre={icono} tam={tam === 'sm' ? 17 : 20} relleno={relleno} />
    </button>
  );
}

export function Chip({ activo, onClick, children, contador, icono, ...rest }: { activo?: boolean; onClick?: () => void; children: ReactNode; contador?: number; icono?: NombreIcono } & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'>) {
  return (
    <button type="button" className="chip" aria-pressed={activo ? 'true' : 'false'} onClick={onClick} {...rest}>
      {icono && <Icon nombre={icono} tam={15} />}
      {children}
      {contador !== undefined && <span className="contador">{contador}</span>}
    </button>
  );
}

export function Insignia({ tono, children, icono, title }: { tono?: 'oro' | 'morado' | 'exito' | 'aviso' | 'peligro' | 'borde'; children: ReactNode; icono?: NombreIcono; title?: string }) {
  return (
    <span className={['insignia', tono ? `insignia-${tono}` : ''].filter(Boolean).join(' ')} title={title}>
      {icono && <Icon nombre={icono} tam={13} />}
      {children}
    </span>
  );
}

export function Campo({ etiqueta, ayuda, error, children, id }: { etiqueta: string; ayuda?: ReactNode; error?: string | null; children: (id: string) => ReactNode; id?: string }) {
  const auto = useId();
  const cid = id ?? auto;
  return (
    <div className="campo">
      <label htmlFor={cid}>{etiqueta}</label>
      {children(cid)}
      {ayuda && <span className="ayuda">{ayuda}</span>}
      {error && (
        <span className="error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

export function Interruptor({ etiqueta, descripcion, valor, onCambio, disabled }: { etiqueta: string; descripcion?: string; valor: boolean; onCambio: (v: boolean) => void; disabled?: boolean }) {
  const id = useId();
  return (
    <label className="interruptor" htmlFor={id}>
      <span>
        <span style={{ fontWeight: 600 }}>{etiqueta}</span>
        {descripcion && <span className="texto-suave texto-pequeno" style={{ display: 'block' }}>{descripcion}</span>}
      </span>
      <input id={id} type="checkbox" role="switch" checked={valor} disabled={disabled} onChange={(e) => onCambio(e.target.checked)} />
    </label>
  );
}

export function Casilla({ etiqueta, valor, onCambio, detalle }: { etiqueta: ReactNode; valor: boolean; onCambio: (v: boolean) => void; detalle?: ReactNode }) {
  const id = useId();
  return (
    <label className={['casilla', valor ? 'hecho' : ''].join(' ')} htmlFor={id}>
      <input id={id} type="checkbox" checked={valor} onChange={(e) => onCambio(e.target.checked)} />
      <span>
        <span className="casilla-texto">{etiqueta}</span>
        {detalle && <span className="texto-tenue texto-pequeno" style={{ display: 'block' }}>{detalle}</span>}
      </span>
    </label>
  );
}

export function Segmentado<T extends string>({ opciones, valor, onCambio, etiqueta }: { opciones: { valor: T; nombre: string }[]; valor: T; onCambio: (v: T) => void; etiqueta: string }) {
  return (
    <div className="segmentado" role="group" aria-label={etiqueta}>
      {opciones.map((o) => (
        <button key={o.valor} type="button" aria-pressed={o.valor === valor ? 'true' : 'false'} onClick={() => onCambio(o.valor)}>
          {o.nombre}
        </button>
      ))}
    </div>
  );
}

export function Cargando({ texto = 'Cargando…' }: { texto?: string }) {
  return (
    <div className="cargando" role="status" aria-live="polite">
      <div className="girador" />
      <span>{texto}</span>
    </div>
  );
}

export function Vacio({ icono = 'hoja', titulo, children, acciones }: { icono?: NombreIcono; titulo: string; children?: ReactNode; acciones?: ReactNode }) {
  return (
    <div className="vacio">
      <div className="icono-circulo">
        <Icon nombre={icono} tam={24} />
      </div>
      <h3>{titulo}</h3>
      {children && <div className="texto-suave">{children}</div>}
      {acciones && <div className="fila" style={{ justifyContent: 'center', marginTop: 4 }}>{acciones}</div>}
    </div>
  );
}

export function Aviso({ tipo = 'info', titulo, children, acciones, icono }: { tipo?: 'info' | 'aviso' | 'peligro' | 'exito'; titulo?: string; children?: ReactNode; acciones?: ReactNode; icono?: NombreIcono }) {
  const ic: NombreIcono = icono ?? (tipo === 'peligro' || tipo === 'aviso' ? 'alerta' : tipo === 'exito' ? 'checkCirculo' : 'info');
  return (
    <div className={['aviso', tipo !== 'info' ? `aviso-${tipo}` : ''].join(' ')} role={tipo === 'peligro' ? 'alert' : undefined}>
      <Icon nombre={ic} tam={18} />
      <div className="cuerpo">
        {titulo && <strong style={{ display: 'block', marginBottom: children ? 2 : 0 }}>{titulo}</strong>}
        {children}
        {acciones && <div className="acciones">{acciones}</div>}
      </div>
    </div>
  );
}

export function Hoja({
  abierta,
  titulo,
  onCerrar,
  children,
  pie,
  ancho,
}: {
  abierta: boolean;
  titulo: string;
  onCerrar: () => void;
  children: ReactNode;
  pie?: ReactNode;
  ancho?: 'ancha' | 'estrecha';
}) {
  const ref = useRef<HTMLDivElement>(null);
  const tituloId = useId();
  useEscape(onCerrar, abierta);
  useFocoAtrapado(ref, abierta);
  if (!abierta) return null;
  return (
    <div
      className="capa"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCerrar();
      }}
    >
      <div ref={ref} className={['hoja', ancho ?? ''].join(' ')} role="dialog" aria-modal="true" aria-labelledby={tituloId} tabIndex={-1}>
        <div className="hoja-cabecera">
          <h2 id={tituloId}>{titulo}</h2>
          <BotonIcono icono="cerrar" etiqueta="Cerrar" onClick={onCerrar} />
        </div>
        <div className="hoja-cuerpo">{children}</div>
        {pie && <div className="hoja-pie">{pie}</div>}
      </div>
    </div>
  );
}

export function Cabecera({
  titulo,
  eyebrow,
  descripcion,
  acciones,
  atras,
}: {
  titulo: ReactNode;
  eyebrow?: ReactNode;
  descripcion?: ReactNode;
  acciones?: ReactNode;
  /** Ruta alternativa para "Volver" si no hay historial interno. */
  atras?: string;
}) {
  return (
    <header className="cabecera">
      <div className="cabecera-fila">
        {atras !== undefined && <BotonIcono icono="volver" etiqueta="Volver" onClick={() => volver(atras)} className="no-imprimir" />}
        <div className="cabecera-titulos">
          {eyebrow && <div className="eyebrow">{eyebrow}</div>}
          <h1>{titulo}</h1>
        </div>
        {acciones && <div className="cabecera-acciones no-imprimir">{acciones}</div>}
      </div>
      {descripcion && <p className="descripcion">{descripcion}</p>}
    </header>
  );
}

export function Seccion({ titulo, enlace, children, id }: { titulo: string; enlace?: { to: string; texto: string }; children: ReactNode; id?: string }) {
  return (
    <section className="seccion" id={id} aria-label={titulo}>
      <div className="seccion-titulo">
        <h2>{titulo}</h2>
        {enlace && <Enlace to={enlace.to}>{enlace.texto}</Enlace>}
      </div>
      {children}
    </section>
  );
}

export function Puntos({ nivel, max = 3, etiqueta }: { nivel: number; max?: number; etiqueta: string }) {
  return (
    <span className="puntos" role="img" aria-label={etiqueta} title={etiqueta}>
      {Array.from({ length: max }, (_, i) => (
        <i key={i} className={i < nivel ? 'on' : ''} />
      ))}
    </span>
  );
}
