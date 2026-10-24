import type { ReactNode } from 'react';
import { APP } from '../config/app';
import { NOMBRE_MODO } from '../config/env';
import { Enlace, useRuta } from '../lib/router';
import { useEnLinea } from '../lib/hooks';
import { useSesion } from '../state/sesion';
import { useUsuario } from '../state/usuario';
import { useCatalogo } from '../state/catalogo';
import { Icon, type NombreIcono } from './Icon';
import { Boton } from './ui';
import { exportarCopia } from '../lib/copia';
import { useUI } from '../state/ui';

interface ItemNav {
  to: string;
  texto: string;
  corto?: string;
  icono: NombreIcono;
  activo: (path: string) => boolean;
}

const INICIO: ItemNav = { to: '/', texto: 'Inicio', icono: 'inicio', activo: (p) => p === '/' };
const BIBLIOTECA: ItemNav = { to: '/biblioteca', texto: 'Biblioteca', icono: 'biblioteca', activo: (p) => p.startsWith('/biblioteca') || p.startsWith('/actividad') };
const RETIROS: ItemNav = { to: '/retiros', texto: 'Mis retiros', corto: 'Retiros', icono: 'calendario', activo: (p) => p.startsWith('/retiros') };
const FAVORITOS: ItemNav = { to: '/favoritos', texto: 'Favoritos y notas', icono: 'corazon', activo: (p) => p.startsWith('/favoritos') };
const ASISTENTE: ItemNav = { to: '/asistente', texto: 'Asistente', icono: 'asistente', activo: (p) => p.startsWith('/asistente') };
const CUENTA: ItemNav = { to: '/cuenta', texto: 'Cuenta y ajustes', icono: 'usuario', activo: (p) => p.startsWith('/cuenta') };
const AYUDA: ItemNav = { to: '/ayuda', texto: 'Ayuda', icono: 'ayuda', activo: (p) => p.startsWith('/ayuda') };
const ADMIN: ItemNav = { to: '/admin', texto: 'Administración', icono: 'escudo', activo: (p) => p.startsWith('/admin') };
const MAS: ItemNav = {
  to: '/cuenta',
  texto: 'Más',
  icono: 'menu',
  activo: (p) => p.startsWith('/cuenta') || p.startsWith('/favoritos') || p.startsWith('/ayuda') || p.startsWith('/admin'),
};

function enfocarPrincipal() {
  const m = document.getElementById('contenido');
  m?.focus();
}

export function Marco({ children }: { children: ReactNode }) {
  const { path } = useRuta();
  const sesion = useSesion();
  const usuario = useUsuario();
  const catalogo = useCatalogo();
  const enLinea = useEnLinea();
  const { avisar } = useUI();
  const lateral: ItemNav[] = [INICIO, BIBLIOTECA, RETIROS, FAVORITOS, ASISTENTE];
  const inferior: ItemNav[] = [INICIO, BIBLIOTECA, RETIROS, ASISTENTE, MAS];

  return (
    <div className="app">
      <button type="button" className="saltar" onClick={enfocarPrincipal}>
        Saltar al contenido
      </button>
      <aside className="barra-lateral" aria-label="Navegación principal">
        <Enlace to="/" className="marca">
          <span className="marca-icono">
            <Icon nombre="loto" tam={22} />
          </span>
          <span>
            <span className="marca-nombre" style={{ display: 'block' }}>
              {APP.nombre}
            </span>
            <span className="marca-sub">Preparar · Facilitar · Integrar</span>
          </span>
        </Enlace>
        <nav className="nav-lateral" aria-label="Secciones">
          {lateral.map((it) => (
            <Enlace key={it.to} to={it.to} aria-current={it.activo(path) ? 'page' : undefined}>
              <Icon nombre={it.icono} tam={19} />
              {it.texto}
            </Enlace>
          ))}
          <div className="nav-titulo">Tu espacio</div>
          {[CUENTA, AYUDA, ...(sesion.puedeAdministrar ? [ADMIN] : [])].map((it) => (
            <Enlace key={it.to} to={it.to} aria-current={it.activo(path) ? 'page' : undefined}>
              <Icon nombre={it.icono} tam={19} />
              {it.texto}
            </Enlace>
          ))}
        </nav>
        <div className="lateral-pie">
          <div>{NOMBRE_MODO[sesion.modo]}</div>
          {sesion.puedeAdministrar && <div>Viendo como: {sesion.rol === 'admin' ? 'administración' : 'compradora'}</div>}
        </div>
      </aside>

      <main className="principal" id="contenido" tabIndex={-1}>
        {usuario.estadoGuardado === 'error' && (
          <div className="banda banda-peligro" role="alert">
            <Icon nombre="alerta" tam={16} />
            <span style={{ flex: 1, minWidth: 200 }}>No se pudieron guardar tus últimos cambios. {usuario.errorGuardado}</span>
            <Boton tam="sm" onClick={usuario.reintentar}>
              Reintentar
            </Boton>
            <Boton
              tam="sm"
              variante="fantasma"
              onClick={async () => {
                const r = await exportarCopia(usuario.datos);
                avisar(r === 'guardado' ? 'Copia de seguridad descargada' : r === 'cancelado' ? 'Descarga cancelada' : 'No se pudo descargar la copia', { tipo: r === 'guardado' ? 'exito' : 'info' });
              }}
            >
              Descargar copia
            </Boton>
          </div>
        )}
        {usuario.soloMemoria && (
          <div className="banda" role="status">
            <Icon nombre="alerta" tam={16} />
            Este navegador no permite guardar datos (modo privado o almacenamiento bloqueado). Tus cambios se perderán al cerrar la página.
          </div>
        )}
        {(!enLinea || catalogo.estado === 'sin-conexion') && sesion.modo === 'supabase' && (
          <div className="banda" role="status">
            <Icon nombre="sinConexion" tam={16} />
            Sin conexión. Puedes consultar los retiros que guardaste para usar sin conexión; los cambios se sincronizarán al volver.
          </div>
        )}
        {children}
      </main>

      <nav className="nav-inferior" aria-label="Navegación principal">
        {inferior.map((it) => (
          <Enlace key={it.texto} to={it.to} aria-current={it.activo(path) ? 'page' : undefined}>
            <Icon nombre={it.icono} tam={22} />
            <span>{it.corto ?? it.texto}</span>
          </Enlace>
        ))}
      </nav>
    </div>
  );
}
