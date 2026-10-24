import type { Actividad, Intensidad, Origen, Seccion } from '../domain/types';
import { ESTADO_NOMBRE, FORMATO_NOMBRE, INTENSIDAD_NIVEL, INTENSIDAD_NOMBRE, MOMENTO_NOMBRE, ORIGEN_NOMBRE } from '../domain/labels';
import { formatoRango } from '../domain/time';
import { Enlace } from '../lib/router';
import { Icon } from './Icon';
import { BotonIcono, Insignia, Puntos } from './ui';
import { useUsuario } from '../state/usuario';
import { alternarFavorito } from '../state/acciones';
import { useUI } from '../state/ui';

export function IntensidadPuntos({ intensidad }: { intensidad: Intensidad }) {
  return <Puntos nivel={INTENSIDAD_NIVEL[intensidad]} etiqueta={`Intensidad ${INTENSIDAD_NOMBRE[intensidad].toLowerCase()}`} />;
}

/** Indica cuándo un texto no viene literalmente de la fuente (corrección, orientación editorial, etc.). */
export function EtiquetaOrigen({ origen, motivo }: { origen: Origen; motivo?: string }) {
  if (origen === 'fuente') return null;
  const tono = origen === 'nuevo' || origen === 'sistema' ? 'aviso' : origen === 'correccion' ? 'borde' : 'morado';
  return (
    <span className="texto-origen">
      <Insignia tono={tono} title={motivo ?? ORIGEN_NOMBRE[origen]}>
        {ORIGEN_NOMBRE[origen]}
      </Insignia>
    </span>
  );
}

export function EstadoInsignia({ a }: { a: Actividad }) {
  if (a.estado === 'publicado') return null;
  const tono = a.estado === 'revision' ? 'aviso' : a.estado === 'archivado' ? 'borde' : 'peligro';
  return <Insignia tono={tono}>{ESTADO_NOMBRE[a.estado]}</Insignia>;
}

export function BotonFavorito({ a, tam = 'md' }: { a: Actividad; tam?: 'sm' | 'md' }) {
  const { datos, actualizar } = useUsuario();
  const { avisar } = useUI();
  const fav = !!datos.favoritos[a.id];
  return (
    <BotonIcono
      icono="corazon"
      relleno={fav}
      tam={tam}
      etiqueta={fav ? `Quitar «${a.titulo}» de favoritas` : `Guardar «${a.titulo}» en favoritas`}
      aria-pressed={fav ? 'true' : 'false'}
      className="btn-favorito"
      onClick={() => {
        actualizar((d) => alternarFavorito(d, a.id));
        avisar(fav ? 'Quitada de favoritas' : 'Guardada en favoritas', { tipo: fav ? 'info' : 'exito', duracion: 2200 });
      }}
    />
  );
}

export function MetaActividad({ a, completa }: { a: Actividad; completa?: boolean }) {
  return (
    <div className="meta">
      <span>
        <Icon nombre="reloj" tam={15} />
        {formatoRango(a.duracion)}
      </span>
      <span>
        <Icon nombre="usuarios" tam={15} />
        {a.formato.map((f) => FORMATO_NOMBRE[f]).join(' · ')}
      </span>
      <span>
        <IntensidadPuntos intensidad={a.intensidad} />
        {INTENSIDAD_NOMBRE[a.intensidad]}
      </span>
      {completa && a.espacio.tipo === 'exterior' && (
        <span>
          <Icon nombre="arbol" tam={15} />
          Exterior
        </span>
      )}
    </div>
  );
}

export function TarjetaActividad({ a, accionExtra }: { a: Actividad; accionExtra?: React.ReactNode }) {
  const { datos } = useUsuario();
  const usada = (datos.usos[a.id]?.length ?? 0) > 0;
  const nota = !!datos.notasActividad[a.id];
  return (
    <article className="tarjeta-actividad">
      <div className="fila" style={{ gap: 6 }}>
        <span className="eyebrow">{a.momentos.slice(0, 2).map((m) => MOMENTO_NOMBRE[m]).join(' · ')}</span>
        <EstadoInsignia a={a} />
      </div>
      <h3>
        <Enlace to={`/actividad/${a.id}`}>{a.titulo}</Enlace>
      </h3>
      {(a.resumen || a.objetivo) && <p className="descripcion">{a.resumen || a.objetivo}</p>}
      <div className="pie">
        <MetaActividad a={a} />
        <div className="acciones">
          {usada && (
            <span className="insignia insignia-exito" title="La marcaste como utilizada">
              <Icon nombre="marcaUso" tam={13} />
              Usada
            </span>
          )}
          {nota && (
            <span className="insignia" title="Tiene una nota privada">
              <Icon nombre="nota" tam={13} />
              Nota
            </span>
          )}
          {accionExtra}
        </div>
      </div>
      <div className="fav">
        <BotonFavorito a={a} tam="sm" />
      </div>
    </article>
  );
}

/** Frases, preguntas y listas de apoyo de la ficha (se usan durante el desarrollo). */
export function SeccionesGuia({ secciones }: { secciones: Seccion[] }) {
  return (
    <div className="pila-lg" style={{ gap: 18 }}>
      {secciones.map((s, i) => (
        <div key={i} className="pila" style={{ gap: 8 }}>
          <h3>{s.titulo}</h3>
          {s.tipo === 'frases' ? (
            s.items.map((t, j) => (
              <p key={j} className="guion">
                {t}
              </p>
            ))
          ) : (
            <ul className="lista-puntos">
              {s.items.map((t, j) => (
                <li key={j}>{t}</li>
              ))}
            </ul>
          )}
          {s.cita && <p className="guion">{s.cita}</p>}
          {s.nota && <p className="nota-fase">{s.nota}</p>}
        </div>
      ))}
    </div>
  );
}

export function FilaActividad({ a, sub }: { a: Actividad; sub?: string }) {
  return (
    <Enlace to={`/actividad/${a.id}`} className="tarjeta-compacta">
      <span className="icono-circulo">
        <Icon nombre="hoja" tam={18} />
      </span>
      <span className="cuerpo">
        <span className="titulo" style={{ display: 'block' }}>
          {a.titulo}
        </span>
        <span className="sub">{sub ?? `${a.momentos.map((m) => MOMENTO_NOMBRE[m]).join(' · ')} · ${formatoRango(a.duracion)}`}</span>
      </span>
      <Icon nombre="chevDer" tam={18} className="texto-tenue" />
    </Enlace>
  );
}
