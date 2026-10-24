import { useEffect, useMemo, useState } from 'react';
import type { Estado, Momento } from '../../domain/types';
import { ESTADO_NOMBRE, MOMENTO_NOMBRE, MOMENTOS } from '../../domain/labels';
import { duplicadosPotenciales, puedePublicar, revisarActividad } from '../../domain/validation';
import { formatoRango, hoyISO, fechaCorta } from '../../domain/time';
import { normalizar, plural } from '../../domain/text';
import { Enlace, navegar } from '../../lib/router';
import { useTitulo } from '../../lib/hooks';
import { guardarArchivo } from '../../lib/platform';
import { MODO_DATOS } from '../../config/env';
import { useCatalogo } from '../../state/catalogo';
import { useSesion } from '../../state/sesion';
import { useUI } from '../../state/ui';
import { actividadVacia, idDisponible } from '../../data/catalogRepo';
import { Icon } from '../../components/Icon';
import { Aviso, Boton, BotonEnlace, BotonIcono, Cabecera, Cargando, Chip, Hoja, Insignia, Vacio } from '../../components/ui';
import { EstadoInsignia } from '../../components/actividad';

const ETIQUETA_PLURAL: Record<Estado, string> = { publicado: 'Publicadas', revision: 'En revisión', borrador: 'Borradores', archivado: 'Archivadas' };

export function SinPermiso() {
  return (
    <div className="pila">
      <Cabecera titulo="Administración" atras="/" />
      <Vacio icono="candado" titulo="No tienes permisos de administración">
        Esta sección solo está disponible para cuentas con rol de administración.
      </Vacio>
    </div>
  );
}

function NavAdmin({ actual }: { actual: string }) {
  const items = [
    { to: '/admin', texto: 'Resumen' },
    { to: '/admin/actividades', texto: 'Actividades' },
    { to: '/admin/accesos', texto: 'Accesos' },
    { to: '/admin/ajustes', texto: 'Ajustes' },
  ];
  return (
    <nav className="pestanas" aria-label="Administración">
      {items.map((i) => (
        <Enlace key={i.to} to={i.to} aria-current={actual === i.to ? 'page' : undefined}>
          {i.texto}
        </Enlace>
      ))}
    </nav>
  );
}

function AvisoModo() {
  if (MODO_DATOS === 'supabase') return null;
  return (
    <Aviso tipo="aviso" titulo={MODO_DATOS === 'local' ? 'Vista previa privada' : 'Demostración'}>
      {MODO_DATOS === 'local'
        ? 'Los cambios de administración se guardan solo en este navegador, con historial de versiones. Para aplicarlos en producción, exporta el catálogo e impórtalo con el script del proyecto.'
        : 'La demostración no permite editar el catálogo.'}
    </Aviso>
  );
}

/* ------------------------------------------------------------------ Resumen */

export function AdminInicio() {
  useTitulo('Administración · Retiros Holísticos');
  const sesion = useSesion();
  const { todas, catalogo, editadas, estado, repo } = useCatalogo();
  const { avisar } = useUI();
  const duplicados = useMemo(() => duplicadosPotenciales(todas).slice(0, 8), [todas]);
  if (!sesion.puedeAdministrar) return <SinPermiso />;
  if (estado === 'cargando' || !catalogo) return <Cargando />;

  const cuenta = (e: Estado) => todas.filter((a) => a.estado === e).length;
  const pendientes = todas.filter((a) => a.estado === 'revision' || a.estado === 'borrador');
  const altas = todas.flatMap((a) => a.incidencias.filter((i) => i.severidad === 'alta').map((i) => ({ a, i })));
  const propuestas = todas.flatMap((a) => a.propuestas.map((p) => ({ a, p })));
  const variantesPend = todas.flatMap((a) => a.variantes.filter((v) => v.estado !== 'publicado').map((v) => ({ a, v })));
  const conBloqueos = todas.filter((a) => a.estado === 'publicado' && !puedePublicar(a, todas));
  const doc = catalogo.incidenciasDocumento;
  const indice = doc.principal.indice as null | {
    anuncia: { dinamicas: string; categorias: number; paginas: number };
    categorias_visibles: number;
    entradas_listadas: number;
    titulos_del_indice_sin_ficha: string[];
    numero_15_ausente_del_indice: boolean;
  };

  return (
    <div className="pila-lg">
      <Cabecera titulo="Administración" eyebrow="Catálogo editorial" acciones={<BotonEnlace to="/admin/actividades" icono="lista" variante="primario">Actividades</BotonEnlace>} />
      <NavAdmin actual="/admin" />
      <AvisoModo />
      <div className="estadisticas">
        {(['publicado', 'revision', 'borrador', 'archivado'] as Estado[]).map((e) => (
          <Enlace key={e} to={`/admin/actividades?estado=${e}`} className="estadistica" style={{ color: 'inherit', textDecoration: 'none' }}>
            <div className="n">{cuenta(e)}</div>
            <div className="etiqueta">{ETIQUETA_PLURAL[e]}</div>
          </Enlace>
        ))}
        <div className="estadistica">
          <div className="n">{todas.length}</div>
          <div className="etiqueta">Actividades únicas</div>
        </div>
        {MODO_DATOS === 'local' && (
          <div className="estadistica">
            <div className="n">{editadas.size}</div>
            <div className="etiqueta">Editadas en este navegador</div>
          </div>
        )}
      </div>

      {conBloqueos.length > 0 && (
        <Aviso tipo="peligro" titulo="Publicadas con problemas que bloquean">
          {conBloqueos.map((a) => (
            <div key={a.id}>
              <Enlace to={`/admin/actividad/${a.id}`}>{a.titulo}</Enlace>
            </div>
          ))}
        </Aviso>
      )}

      <section className="seccion">
        <div className="seccion-titulo">
          <h2>Pendientes de revisión</h2>
          <span className="texto-tenue">{pendientes.length}</span>
        </div>
        {pendientes.length === 0 ? (
          <p className="texto-suave">No hay actividades pendientes.</p>
        ) : (
          <div className="tabla-contenedor">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Actividad</th>
                  <th>Estado</th>
                  <th>Motivo</th>
                </tr>
              </thead>
              <tbody>
                {pendientes.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <Enlace to={`/admin/actividad/${a.id}`}>{a.titulo}</Enlace>
                    </td>
                    <td>
                      <EstadoInsignia a={a} />
                    </td>
                    <td className="texto-suave">{a.motivoEstado ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="rejilla-2">
        <section className="seccion">
          <div className="seccion-titulo">
            <h2>Incidencias graves</h2>
            <span className="texto-tenue">{altas.length}</span>
          </div>
          {altas.length === 0 ? (
            <p className="texto-suave">Sin incidencias de severidad alta.</p>
          ) : (
            <ul className="lista-limpia">
              {altas.map(({ a, i }, n) => (
                <li key={n} className="tarjeta-plana">
                  <Enlace to={`/admin/actividad/${a.id}`} style={{ fontWeight: 600 }}>
                    {a.titulo}
                  </Enlace>
                  <p className="texto-suave texto-pequeno">{i.detalle}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="seccion">
          <div className="seccion-titulo">
            <h2>Posibles duplicados</h2>
          </div>
          {duplicados.length === 0 ? (
            <p className="texto-suave">No se detectaron textos muy parecidos.</p>
          ) : (
            <ul className="lista-limpia">
              {duplicados.map((d, i) => (
                <li key={i} className="tarjeta-plana texto-pequeno">
                  <Enlace to={`/admin/actividad/${d.a.id}`}>{d.a.titulo}</Enlace> y <Enlace to={`/admin/actividad/${d.b.id}`}>{d.b.titulo}</Enlace>
                  <span className="texto-tenue"> · {Math.round(d.s * 100)}% de vocabulario en común</span>
                </li>
              ))}
            </ul>
          )}
          <p className="texto-tenue texto-pequeno">Comparación aproximada de vocabulario: sirve para revisar, no confirma duplicados.</p>
        </section>
      </div>

      <div className="rejilla-2">
        <section className="seccion">
          <div className="seccion-titulo">
            <h2>Propuestas editoriales</h2>
            <span className="texto-tenue">{propuestas.length}</span>
          </div>
          {propuestas.length === 0 ? (
            <p className="texto-suave">Sin propuestas pendientes.</p>
          ) : (
            <ul className="lista-limpia">
              {propuestas.map(({ a, p }, i) => (
                <li key={i} className="tarjeta-plana texto-pequeno">
                  <Enlace to={`/admin/actividad/${a.id}`} style={{ fontWeight: 600 }}>
                    {a.titulo}
                  </Enlace>
                  <div className="texto-suave">{p.motivo}</div>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="seccion">
          <div className="seccion-titulo">
            <h2>Variantes por aprobar</h2>
            <span className="texto-tenue">{variantesPend.length}</span>
          </div>
          {variantesPend.length === 0 ? (
            <p className="texto-suave">Sin variantes pendientes.</p>
          ) : (
            <ul className="lista-limpia">
              {variantesPend.map(({ a, v }) => (
                <li key={v.id} className="tarjeta-plana texto-pequeno">
                  <Enlace to={`/admin/actividad/${a.id}`} style={{ fontWeight: 600 }}>
                    {v.titulo}
                  </Enlace>
                  <span className="texto-tenue"> · variante de {a.titulo}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="seccion">
        <h2>Problemas del documento original</h2>
        <div className="tarjeta pila texto-suave texto-pequeno">
          {indice && (
            <p>
              El índice anuncia {indice.anuncia.dinamicas} dinámicas, {indice.anuncia.categorias} categorías y {indice.anuncia.paginas} páginas; muestra {indice.categorias_visibles} categorías y {indice.entradas_listadas} entradas
              {indice.numero_15_ausente_del_indice ? ' (falta el número 15)' : ''}. Títulos del índice sin ficha: {indice.titulos_del_indice_sin_ficha.join(', ')}.
            </p>
          )}
          {doc.principal.duplicados.map((d) => (
            <p key={d.pagina}>
              Página {d.pagina} ({d.separador}): {d.detalle}
            </p>
          ))}
          {doc.principal.separadorIncorrecto.map((s, i) => (
            <p key={i}>
              Separador de la página {s.separador} dice «{s.dice}», pero la ficha {s.ficha} desarrolla «{s.desarrolla}».
            </p>
          ))}
          {doc.principal.fichasIncompletas.map((f) => (
            <p key={f.pagina}>
              Página {f.pagina} ({f.titulo}): falta {f.falta}.
            </p>
          ))}
          {doc.principal.pagina38 && <p>Página 38: {doc.principal.pagina38}</p>}
          {doc.edicion2.map((e, i) => (
            <p key={i}>
              Edición 2, páginas {e.paginas.join(', ')}: {e.problema}
            </p>
          ))}
        </div>
      </section>

      {repo?.exportar && (
        <section className="seccion">
          <h2>Exportar</h2>
          <p className="texto-suave texto-pequeno">Descarga el catálogo con tus cambios (formato del proyecto) para importarlo en producción.</p>
          <div>
            <Boton
              icono="descargar"
              onClick={async () => {
                const c = await repo.exportar!();
                const r = await guardarArchivo(`catalogo-retiros-${hoyISO()}.json`, JSON.stringify(c, null, 1), 'application/json');
                avisar(r === 'guardado' ? 'Catálogo exportado' : 'Exportación cancelada', { tipo: r === 'guardado' ? 'exito' : 'info' });
              }}
            >
              Exportar catálogo (JSON)
            </Boton>
          </div>
        </section>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ Lista */

export function AdminActividades() {
  useTitulo('Actividades · Administración');
  const sesion = useSesion();
  const { todas, estado, editadas, guardarActividad, repo } = useCatalogo();
  const { avisar } = useUI();
  const [texto, setTexto] = useState('');
  const [estados, setEstados] = useState<Estado[]>(() => {
    const q = new URLSearchParams(window.location.hash.split('?')[1] ?? '').get('estado') as Estado | null;
    return q ? [q] : [];
  });
  const [momento, setMomento] = useState<Momento | null>(null);
  const [soloProblemas, setSoloProblemas] = useState(false);
  const [nueva, setNueva] = useState(false);
  const [tituloNueva, setTituloNueva] = useState('');

  const lista = useMemo(() => {
    const t = normalizar(texto);
    return todas
      .filter((a) => !estados.length || estados.includes(a.estado))
      .filter((a) => !momento || a.momentos.includes(momento))
      .filter((a) => !t || normalizar(a.titulo).includes(t) || a.id.includes(t))
      .map((a) => ({ a, problemas: revisarActividad(a, todas) }))
      .filter((x) => !soloProblemas || x.problemas.some((p) => p.bloquea) || x.a.incidencias.length > 0)
      .sort((x, y) => x.a.orden - y.a.orden || x.a.titulo.localeCompare(y.a.titulo, 'es'));
  }, [todas, texto, estados, momento, soloProblemas]);

  if (!sesion.puedeAdministrar) return <SinPermiso />;
  if (estado === 'cargando') return <Cargando />;
  const editable = repo?.tipo === 'local' || repo?.tipo === 'supabase';

  const crear = async () => {
    const t = tituloNueva.trim();
    if (!t) return;
    const id = idDisponible(t, new Set(todas.map((a) => a.id)));
    try {
      await guardarActividad(actividadVacia(id, t), 'Actividad creada');
      setNueva(false);
      setTituloNueva('');
      navegar(`/admin/actividad/${id}`);
    } catch (e) {
      avisar(e instanceof Error ? e.message : 'No se pudo crear la actividad', { tipo: 'error' });
    }
  };

  return (
    <div className="pila">
      <Cabecera
        titulo="Actividades"
        eyebrow="Administración"
        atras="/admin"
        acciones={
          editable && (
            <Boton variante="primario" icono="mas" onClick={() => setNueva(true)}>
              Nueva actividad
            </Boton>
          )
        }
      />
      <NavAdmin actual="/admin/actividades" />
      <div className="entrada-busqueda">
        <Icon nombre="buscar" tam={20} />
        <label htmlFor="admin-buscar" className="sr-only">
          Buscar actividad
        </label>
        <input id="admin-buscar" className="entrada" type="search" placeholder="Buscar por título o identificador…" value={texto} onChange={(e) => setTexto(e.target.value)} />
      </div>
      <div className="chips">
        {(['publicado', 'revision', 'borrador', 'archivado'] as Estado[]).map((e) => (
          <Chip key={e} activo={estados.includes(e)} onClick={() => setEstados(estados.includes(e) ? estados.filter((x) => x !== e) : [...estados, e])}>
            {ESTADO_NOMBRE[e]}
          </Chip>
        ))}
        <Chip activo={soloProblemas} icono="alerta" onClick={() => setSoloProblemas(!soloProblemas)}>
          Con problemas
        </Chip>
      </div>
      <div className="chips-desliza">
        {MOMENTOS.map((m) => (
          <Chip key={m.id} activo={momento === m.id} onClick={() => setMomento(momento === m.id ? null : m.id)}>
            {m.nombre}
          </Chip>
        ))}
      </div>
      <p className="texto-suave texto-pequeno">{plural(lista.length, 'actividad', 'actividades')}</p>
      <div className="tabla-contenedor">
        <table className="tabla">
          <thead>
            <tr>
              <th>Título</th>
              <th>Estado</th>
              <th className="solo-escritorio">Momentos</th>
              <th className="solo-escritorio">Duración</th>
              <th>Revisión</th>
            </tr>
          </thead>
          <tbody>
            {lista.map(({ a, problemas }) => {
              const bloquea = problemas.filter((p) => p.bloquea).length;
              const avisos = problemas.length - bloquea;
              return (
                <tr key={a.id}>
                  <td>
                    <Enlace to={`/admin/actividad/${a.id}`} style={{ fontWeight: 600 }}>
                      {a.titulo}
                    </Enlace>
                    {editadas.has(a.id) && MODO_DATOS === 'local' && (
                      <span style={{ marginLeft: 6 }}>
                        <Insignia tono="morado">editada</Insignia>
                      </span>
                    )}
                    <div className="texto-tenue texto-pequeno">{a.id}</div>
                  </td>
                  <td>
                    <span className="insignia">{ESTADO_NOMBRE[a.estado]}</span>
                  </td>
                  <td className="solo-escritorio texto-suave">{a.momentos.map((m) => MOMENTO_NOMBRE[m]).join(', ')}</td>
                  <td className="solo-escritorio texto-suave">{formatoRango(a.duracion)}</td>
                  <td>
                    {bloquea > 0 && <Insignia tono="peligro">{plural(bloquea, 'bloqueo', 'bloqueos')}</Insignia>} {avisos > 0 && <Insignia tono="aviso">{plural(avisos, 'aviso', 'avisos')}</Insignia>}{' '}
                    {a.incidencias.length > 0 && <Insignia tono="borde">{plural(a.incidencias.length, 'incidencia', 'incidencias')}</Insignia>}
                    {problemas.length === 0 && a.incidencias.length === 0 && <span className="texto-tenue">Sin observaciones</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Hoja
        abierta={nueva}
        titulo="Nueva actividad"
        onCerrar={() => setNueva(false)}
        ancho="estrecha"
        pie={
          <>
            <Boton onClick={() => setNueva(false)}>Cancelar</Boton>
            <Boton variante="primario" onClick={() => void crear()} disabled={!tituloNueva.trim()}>
              Crear borrador
            </Boton>
          </>
        }
      >
        <div className="campo">
          <label htmlFor="titulo-nueva">Título</label>
          <input id="titulo-nueva" className="entrada" value={tituloNueva} onChange={(e) => setTituloNueva(e.target.value)} maxLength={120} data-autofocus="true" />
          <span className="ayuda">Se crea como borrador: no será visible para compradoras hasta que la publiques.</span>
        </div>
      </Hoja>
    </div>
  );
}

/* ------------------------------------------------------------------ Accesos */

interface FilaAcceso {
  email: string;
  estado: string;
  origen: string;
  desde: string | null;
  actualizado: string;
  nota: string | null;
}

export function AdminAccesos() {
  useTitulo('Accesos · Administración');
  const sesion = useSesion();
  const { avisar, confirmar } = useUI();
  const [filas, setFilas] = useState<FilaAcceso[] | null>(null);
  const [eventos, setEventos] = useState<{ id: string; evento: string; estado: string; email: string | null; recibido: string; detalle: string | null }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [nota, setNota] = useState('');
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (import.meta.env.VITE_DATA_MODE !== 'supabase' || !sesion.puedeAdministrar) return;
    let vivo = true;
    (async () => {
      try {
        const { obtenerSupabase } = await import('../../data/supabase');
        const sb = await obtenerSupabase();
        const [a, e] = await Promise.all([
          sb.from('accesos').select('email, estado, origen, desde, actualizado, nota').order('actualizado', { ascending: false }).limit(200),
          sb.from('eventos_hotmart').select('id, evento, estado, email, recibido, detalle').order('recibido', { ascending: false }).limit(30),
        ]);
        if (a.error) throw a.error;
        if (!vivo) return;
        setFilas((a.data ?? []) as FilaAcceso[]);
        setEventos((e.data ?? []) as typeof eventos);
      } catch (err) {
        if (vivo) setError(err instanceof Error ? err.message : 'No se pudieron cargar los accesos.');
      }
    })();
    return () => {
      vivo = false;
    };
  }, [sesion.puedeAdministrar, version]);

  if (!sesion.puedeAdministrar) return <SinPermiso />;

  if (MODO_DATOS !== 'supabase') {
    return (
      <div className="pila">
        <Cabecera titulo="Accesos" eyebrow="Administración" atras="/admin" />
        <NavAdmin actual="/admin/accesos" />
        <Vacio icono="candado" titulo="Disponible cuando se conecte el servidor">
          La gestión de accesos (compras aprobadas de Hotmart, reembolsos, cancelaciones y altas manuales) funciona con la base de datos y las cuentas reales de producción. Esta vista previa no tiene cuentas, así que no se muestra ningún dato.
        </Vacio>
      </div>
    );
  }

  const llamar = async (fn: string, args: Record<string, unknown>, ok: string) => {
    try {
      const { obtenerSupabase } = await import('../../data/supabase');
      const sb = await obtenerSupabase();
      const { error: e } = await sb.rpc(fn, args);
      if (e) throw e;
      avisar(ok, { tipo: 'exito' });
      setVersion((v) => v + 1);
    } catch (err) {
      avisar(err instanceof Error ? err.message : 'No se pudo completar la acción', { tipo: 'error' });
    }
  };

  return (
    <div className="pila-lg">
      <Cabecera titulo="Accesos" eyebrow="Administración" atras="/admin" />
      <NavAdmin actual="/admin/accesos" />
      <section className="tarjeta pila">
        <h2>Alta manual</h2>
        <p className="texto-suave texto-pequeno">Para casos verificados fuera de Hotmart. La persona entra con este correo.</p>
        <form
          className="formulario-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return avisar('Correo no válido', { tipo: 'error' });
            void llamar('conceder_acceso_manual', { p_email: email.trim().toLowerCase(), p_nota: nota.trim() || null }, 'Acceso concedido');
            setEmail('');
            setNota('');
          }}
        >
          <div className="campo">
            <label htmlFor="acc-email">Correo</label>
            <input id="acc-email" className="entrada" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="campo">
            <label htmlFor="acc-nota">Motivo (interno)</label>
            <input id="acc-nota" className="entrada" value={nota} onChange={(e) => setNota(e.target.value)} maxLength={200} />
          </div>
          <div style={{ alignSelf: 'end' }}>
            <Boton type="submit" variante="primario" icono="mas">
              Conceder acceso
            </Boton>
          </div>
        </form>
      </section>
      {error && <Aviso tipo="peligro">{error}</Aviso>}
      {!filas ? (
        <Cargando />
      ) : (
        <div className="tabla-contenedor">
          <table className="tabla">
            <thead>
              <tr>
                <th>Correo</th>
                <th>Estado</th>
                <th>Origen</th>
                <th>Actualizado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <tr key={f.email}>
                  <td>{f.email}</td>
                  <td>
                    <Insignia tono={f.estado === 'activo' ? 'exito' : 'aviso'}>{f.estado}</Insignia>
                  </td>
                  <td className="texto-suave">{f.origen}</td>
                  <td className="texto-suave">{fechaCorta(f.actualizado)}</td>
                  <td>
                    {f.estado === 'activo' ? (
                      <BotonIcono
                        icono="candado"
                        tam="sm"
                        etiqueta={`Revocar acceso de ${f.email}`}
                        onClick={async () => {
                          if (await confirmar({ titulo: '¿Revocar el acceso?', mensaje: `${f.email} dejará de poder entrar a la app.`, confirmar: 'Revocar', peligro: true }))
                            void llamar('revocar_acceso', { p_email: f.email, p_motivo: 'Revocado manualmente' }, 'Acceso revocado');
                        }}
                      />
                    ) : (
                      <BotonIcono icono="refrescar" tam="sm" etiqueta={`Reactivar acceso de ${f.email}`} onClick={() => void llamar('conceder_acceso_manual', { p_email: f.email, p_nota: 'Reactivado manualmente' }, 'Acceso reactivado')} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <section className="seccion">
        <h2>Últimos eventos de Hotmart</h2>
        {eventos.length === 0 ? (
          <p className="texto-suave">Sin eventos recibidos.</p>
        ) : (
          <ul className="lista-limpia texto-pequeno">
            {eventos.map((e) => (
              <li key={e.id} className="tarjeta-plana">
                <strong>{e.evento}</strong> · {e.estado} · {e.email ?? 'sin correo'} · {fechaCorta(e.recibido)}
                {e.detalle && <div className="texto-tenue">{e.detalle}</div>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ Ajustes */

export function AdminAjustes() {
  useTitulo('Ajustes · Administración');
  const sesion = useSesion();
  const { config, guardarConfig, visibles } = useCatalogo();
  const { avisar } = useUI();
  const [orden, setOrden] = useState<Momento[]>(config.ordenMomentos);
  useEffect(() => setOrden(config.ordenMomentos), [config.ordenMomentos]);
  if (!sesion.puedeAdministrar) return <SinPermiso />;
  const mover = (i: number, d: number) => {
    const n = orden.slice();
    const [x] = n.splice(i, 1);
    n.splice(i + d, 0, x);
    setOrden(n);
  };
  const cambiado = orden.join() !== config.ordenMomentos.join();
  return (
    <div className="pila-lg">
      <Cabecera titulo="Ajustes del catálogo" eyebrow="Administración" atras="/admin" />
      <NavAdmin actual="/admin/ajustes" />
      <AvisoModo />
      <section className="tarjeta pila">
        <h2>Orden de las categorías</h2>
        <p className="texto-suave texto-pequeno">Define el orden de los momentos del retiro en la biblioteca (orden «Momento del retiro») y en los listados.</p>
        <ol className="lista-limpia">
          {orden.map((m, i) => (
            <li key={m} className="tarjeta-compacta">
              <span className="icono-circulo">{i + 1}</span>
              <span className="cuerpo titulo">
                {MOMENTO_NOMBRE[m]} <span className="texto-tenue texto-pequeno">({visibles.filter((a) => a.momentos[0] === m).length} como momento principal)</span>
              </span>
              <BotonIcono icono="chevArriba" tam="sm" etiqueta={`Subir ${MOMENTO_NOMBRE[m]}`} disabled={i === 0} onClick={() => mover(i, -1)} />
              <BotonIcono icono="chevAbajo" tam="sm" etiqueta={`Bajar ${MOMENTO_NOMBRE[m]}`} disabled={i === orden.length - 1} onClick={() => mover(i, 1)} />
            </li>
          ))}
        </ol>
        <div className="fila">
          <Boton
            variante="primario"
            disabled={!cambiado}
            onClick={async () => {
              try {
                await guardarConfig({ ...config, ordenMomentos: orden });
                avisar('Orden guardado', { tipo: 'exito' });
              } catch (e) {
                avisar(e instanceof Error ? e.message : 'No se pudo guardar', { tipo: 'error' });
              }
            }}
          >
            Guardar orden
          </Boton>
          {cambiado && (
            <Boton variante="fantasma" onClick={() => setOrden(config.ordenMomentos)}>
              Descartar
            </Boton>
          )}
        </div>
      </section>
    </div>
  );
}

