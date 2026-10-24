import { useMemo, useState } from 'react';
import type { Actividad, Momento } from '../domain/types';
import { MOMENTOS, MOMENTO_NOMBRE } from '../domain/labels';
import { filtrar, FILTROS_VACIOS } from '../domain/search';
import { formatoRango } from '../domain/time';
import { bloqueDeActividad, nuevoRetiro, actualizarJornada } from '../domain/retreats';
import { useUsuario } from '../state/usuario';
import { useCatalogo } from '../state/catalogo';
import { guardarRetiro } from '../state/acciones';
import { useUI } from '../state/ui';
import { navegar } from '../lib/router';
import { Boton, Chip, Hoja } from './ui';
import { Icon } from './Icon';
import { IntensidadPuntos } from './actividad';

/** Añadir una actividad a un retiro existente (eligiendo jornada) o a uno nuevo. */
export function DialogoAgregarRetiro({ actividad, abierta, onCerrar }: { actividad: Actividad; abierta: boolean; onCerrar: () => void }) {
  const { datos, actualizar } = useUsuario();
  const { avisar } = useUI();
  const retiros = useMemo(() => [...datos.retiros].sort((a, b) => b.actualizado.localeCompare(a.actualizado)), [datos.retiros]);
  const [retiroId, setRetiroId] = useState<string>('');
  const [jornadaId, setJornadaId] = useState<string>('');
  const [nombreNuevo, setNombreNuevo] = useState('');
  const seleccion = retiroId || retiros[0]?.id || 'nuevo';
  const retiro = retiros.find((r) => r.id === seleccion);
  const jornada = retiro?.jornadas.find((j) => j.id === jornadaId) ?? retiro?.jornadas[retiro.jornadas.length - 1];

  const confirmar = () => {
    if (seleccion === 'nuevo') {
      const r = nuevoRetiro(nombreNuevo.trim() || 'Nuevo retiro');
      r.jornadas[0].bloques.push(bloqueDeActividad(actividad));
      actualizar((d) => guardarRetiro(d, r));
      avisar(`Añadida a «${r.nombre}»`, { tipo: 'exito', accion: { etiqueta: 'Ver retiro', fn: () => navegar(`/retiros/${r.id}`) } });
    } else if (retiro && jornada) {
      const r = actualizarJornada(retiro, jornada.id, (j) => ({ ...j, bloques: [...j.bloques, bloqueDeActividad(actividad)] }));
      actualizar((d) => guardarRetiro(d, r));
      avisar(`Añadida a «${retiro.nombre}»${retiro.jornadas.length > 1 ? ` · ${jornada.nombre}` : ''}`, {
        tipo: 'exito',
        accion: { etiqueta: 'Ver retiro', fn: () => navegar(`/retiros/${retiro.id}`) },
      });
    }
    setNombreNuevo('');
    onCerrar();
  };

  return (
    <Hoja
      abierta={abierta}
      titulo="Añadir a un retiro"
      onCerrar={onCerrar}
      pie={
        <>
          <Boton onClick={onCerrar}>Cancelar</Boton>
          <Boton variante="primario" onClick={confirmar} icono="mas">
            Añadir
          </Boton>
        </>
      }
    >
      <div className="pila">
        <p className="texto-suave">
          «{actividad.titulo}» se añadirá al final de la jornada con su duración de la ficha ({formatoRango(actividad.duracion)}). Luego puedes moverla y ajustar el tiempo.
        </p>
        <fieldset className="pila" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="etiqueta" style={{ fontWeight: 600, marginBottom: 8 }}>
            Retiro
          </legend>
          {retiros.map((r) => (
            <label key={r.id} className="casilla">
              <input type="radio" name="retiro-destino" checked={seleccion === r.id} onChange={() => { setRetiroId(r.id); setJornadaId(''); }} style={{ borderRadius: '50%' }} />
              <span>
                <span style={{ fontWeight: 600 }}>{r.nombre}</span>
                <span className="texto-tenue texto-pequeno" style={{ display: 'block' }}>
                  {r.jornadas.reduce((s, j) => s + j.bloques.filter((b) => b.tipo === 'actividad').length, 0)} actividades
                </span>
              </span>
            </label>
          ))}
          <label className="casilla">
            <input type="radio" name="retiro-destino" checked={seleccion === 'nuevo'} onChange={() => setRetiroId('nuevo')} style={{ borderRadius: '50%' }} />
            <span style={{ fontWeight: 600 }}>Crear un retiro nuevo</span>
          </label>
        </fieldset>
        {seleccion === 'nuevo' && (
          <div className="campo">
            <label htmlFor="nombre-retiro-nuevo">Nombre del retiro</label>
            <input id="nombre-retiro-nuevo" className="entrada" value={nombreNuevo} onChange={(e) => setNombreNuevo(e.target.value)} placeholder="Por ejemplo: Retiro de otoño" maxLength={120} />
          </div>
        )}
        {retiro && retiro.jornadas.length > 1 && (
          <div className="campo">
            <label htmlFor="jornada-destino">Jornada</label>
            <select id="jornada-destino" className="selector" value={jornada?.id} onChange={(e) => setJornadaId(e.target.value)}>
              {retiro.jornadas.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.nombre}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </Hoja>
  );
}

/** Buscador de actividades para añadir a una jornada (permite añadir varias seguidas). */
export function SelectorActividad({ abierta, onCerrar, onElegir }: { abierta: boolean; onCerrar: () => void; onElegir: (a: Actividad) => void }) {
  const { visibles } = useCatalogo();
  const { datos } = useUsuario();
  const [texto, setTexto] = useState('');
  const [momento, setMomento] = useState<Momento | null>(null);
  const [soloFav, setSoloFav] = useState(false);
  const [anadidas, setAnadidas] = useState<string[]>([]);
  const lista = useMemo(
    () => filtrar(visibles, { ...FILTROS_VACIOS, texto, momentos: momento ? [momento] : [], soloFavoritas: soloFav }, datos.favoritos).map((x) => x.actividad),
    [visibles, texto, momento, soloFav, datos.favoritos],
  );
  const cerrar = () => {
    setAnadidas([]);
    onCerrar();
  };
  return (
    <Hoja
      abierta={abierta}
      titulo="Añadir actividad"
      onCerrar={cerrar}
      ancho="ancha"
      pie={
        <Boton variante="primario" onClick={cerrar}>
          {anadidas.length ? `Listo (${anadidas.length} añadida${anadidas.length > 1 ? 's' : ''})` : 'Cerrar'}
        </Boton>
      }
    >
      <div className="pila">
        <div className="entrada-busqueda">
          <Icon nombre="buscar" tam={20} />
          <label htmlFor="buscar-selector" className="sr-only">
            Buscar actividad
          </label>
          <input id="buscar-selector" className="entrada" type="search" placeholder="Buscar actividad…" value={texto} onChange={(e) => setTexto(e.target.value)} autoComplete="off" data-autofocus="true" />
        </div>
        <div className="chips-desliza">
          {MOMENTOS.map((m) => (
            <Chip key={m.id} activo={momento === m.id} onClick={() => setMomento(momento === m.id ? null : m.id)}>
              {m.nombre}
            </Chip>
          ))}
          <Chip activo={soloFav} icono="corazon" onClick={() => setSoloFav(!soloFav)}>
            Favoritas
          </Chip>
        </div>
        {lista.length === 0 && <p className="texto-suave centrado">No hay actividades con esos criterios.</p>}
        <ul className="lista-limpia">
          {lista.map((a) => {
            const n = anadidas.filter((x) => x === a.id).length;
            return (
              <li key={a.id} className="tarjeta-compacta" style={{ cursor: 'default' }}>
                <span className="cuerpo">
                  <span className="titulo" style={{ display: 'block', whiteSpace: 'normal' }}>
                    {a.titulo}
                  </span>
                  <span className="sub fila" style={{ gap: 8 }}>
                    <span>{a.momentos.map((m) => MOMENTO_NOMBRE[m]).join(' · ')}</span>
                    <span>{formatoRango(a.duracion)}</span>
                    <IntensidadPuntos intensidad={a.intensidad} />
                  </span>
                </span>
                <Boton
                  tam="sm"
                  variante={n ? 'suave' : 'secundario'}
                  icono={n ? 'check' : 'mas'}
                  onClick={() => {
                    onElegir(a);
                    setAnadidas((x) => [...x, a.id]);
                  }}
                  aria-label={`Añadir ${a.titulo}${n ? ` (ya añadida ${n} ${n === 1 ? 'vez' : 'veces'})` : ''}`}
                >
                  {n ? `Añadida${n > 1 ? ` ×${n}` : ''}` : 'Añadir'}
                </Boton>
              </li>
            );
          })}
        </ul>
      </div>
    </Hoja>
  );
}
