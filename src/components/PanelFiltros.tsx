import type { Actividad, Estado } from '../domain/types';
import { ESPACIOS, ESTADO_NOMBRE, EXPERIENCIAS, FORMATOS, GRUPOS_MATERIAL, INTENSIDADES, MOMENTOS } from '../domain/labels';
import { filtrar, OPCIONES_TIEMPO, type Filtros } from '../domain/search';
import { Chip, Interruptor } from './ui';

type CampoMulti = 'momentos' | 'formatos' | 'espacios' | 'materiales' | 'intensidades' | 'experiencias' | 'estados';

function alternar<T>(lista: T[], v: T): T[] {
  return lista.includes(v) ? lista.filter((x) => x !== v) : [...lista, v];
}

/** Cuántas actividades quedarían si se elige esta opción (con el resto de filtros aplicados). */
function contar(acts: Actividad[], f: Filtros, campo: CampoMulti | 'tiempo', valor: string | number, favoritos: Record<string, string>): number {
  const g: Filtros = campo === 'tiempo' ? { ...f, tiempo: valor as number } : { ...f, [campo]: [valor] };
  return filtrar(acts, g, favoritos).length;
}

export function PanelFiltros({
  actividades,
  filtros,
  onCambio,
  favoritos,
  admin,
}: {
  actividades: Actividad[];
  filtros: Filtros;
  onCambio: (f: Filtros) => void;
  favoritos: Record<string, string>;
  admin: boolean;
}) {
  const grupo = (titulo: string, campo: CampoMulti, opciones: { id: string; nombre: string }[]) => (
    <div className="grupo-filtro" role="group" aria-label={titulo}>
      <h3>{titulo}</h3>
      <div className="chips">
        {opciones.map((o) => {
          const activo = (filtros[campo] as string[]).includes(o.id);
          const n = contar(actividades, filtros, campo, o.id, favoritos);
          return (
            <Chip key={o.id} activo={activo} contador={activo ? undefined : n} disabled={!activo && n === 0} onClick={() => onCambio({ ...filtros, [campo]: alternar(filtros[campo] as string[], o.id) })}>
              {o.nombre}
            </Chip>
          );
        })}
      </div>
    </div>
  );

  return (
    <div>
      {grupo('Momento del retiro', 'momentos', MOMENTOS)}
      <div className="grupo-filtro" role="group" aria-label="Tiempo disponible">
        <h3>Tiempo disponible</h3>
        <div className="chips">
          {OPCIONES_TIEMPO.map((o) => {
            const activo = filtros.tiempo === o.valor;
            const n = contar(actividades, filtros, 'tiempo', o.valor, favoritos);
            return (
              <Chip key={o.valor} activo={activo} contador={activo ? undefined : n} disabled={!activo && n === 0} onClick={() => onCambio({ ...filtros, tiempo: activo ? null : o.valor })}>
                {o.nombre}
              </Chip>
            );
          })}
        </div>
        <span className="texto-tenue texto-pequeno">Muestra las actividades cuya duración mínima cabe en ese tiempo.</span>
      </div>
      {grupo('Formato', 'formatos', FORMATOS)}
      {grupo('Espacio', 'espacios', ESPACIOS.map((e) => ({ id: e.id, nombre: e.nombre })))}
      {grupo('Materiales', 'materiales', [{ id: 'ninguno', nombre: 'Sin materiales especiales' }, ...GRUPOS_MATERIAL])}
      {grupo('Intensidad', 'intensidades', INTENSIDADES)}
      {grupo('Experiencia de quien facilita', 'experiencias', EXPERIENCIAS)}
      {admin &&
        grupo(
          'Estado editorial',
          'estados',
          (['publicado', 'revision', 'borrador', 'archivado'] as Estado[]).map((e) => ({ id: e, nombre: ESTADO_NOMBRE[e] })),
        )}
      <div className="grupo-filtro">
        <Interruptor etiqueta="Solo mis favoritas" valor={filtros.soloFavoritas} onCambio={(v) => onCambio({ ...filtros, soloFavoritas: v })} />
      </div>
    </div>
  );
}
