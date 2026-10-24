import { Component, Suspense, lazy, useLayoutEffect, type ErrorInfo, type ReactNode } from 'react';
import { useRuta } from './lib/router';
import { UIProvider } from './state/ui';
import { SesionProvider, useSesion } from './state/sesion';
import { UsuarioProvider } from './state/usuario';
import { CatalogoProvider } from './state/catalogo';
import { Marco } from './components/Marco';
import { Boton, BotonEnlace, Cabecera, Cargando, Vacio } from './components/ui';
import { Inicio } from './pages/Inicio';
import { Biblioteca } from './pages/Biblioteca';
import { Ficha } from './pages/Ficha';
import { Facilitacion } from './pages/Facilitacion';
import { Retiros } from './pages/Retiros';
import { RetiroEditor } from './pages/RetiroEditor';
import { Favoritos } from './pages/Favoritos';
import { Asistente } from './pages/Asistente';
import { Cuenta } from './pages/Cuenta';
import { Ayuda } from './pages/Ayuda';
import { Imprimir } from './pages/Imprimir';
import { PantallaAcceso } from './pages/Acceso';

const AdminInicio = lazy(() => import('./pages/admin/Admin').then((m) => ({ default: m.AdminInicio })));
const AdminActividades = lazy(() => import('./pages/admin/Admin').then((m) => ({ default: m.AdminActividades })));
const AdminAccesos = lazy(() => import('./pages/admin/Admin').then((m) => ({ default: m.AdminAccesos })));
const AdminAjustes = lazy(() => import('./pages/admin/Admin').then((m) => ({ default: m.AdminAjustes })));
const AdminEditor = lazy(() => import('./pages/admin/Editor').then((m) => ({ default: m.AdminEditor })));

class LimiteErrores extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Error de la interfaz', error, info.componentStack);
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{ padding: 24, maxWidth: 640, margin: '40px auto' }}>
        <Vacio
          icono="alerta"
          titulo="Algo no salió bien en esta pantalla"
          acciones={
            <>
              <Boton
                variante="primario"
                onClick={() => {
                  this.setState({ error: null });
                  window.location.hash = '#/';
                }}
              >
                Volver al inicio
              </Boton>
              <Boton onClick={() => window.location.reload()}>Recargar</Boton>
            </>
          }
        >
          Tus datos guardados no se han perdido. Detalle técnico: {this.state.error.message}
        </Vacio>
      </div>
    );
  }
}

function NoEncontrado() {
  return (
    <div className="pila">
      <Cabecera titulo="Página no encontrada" atras="/" />
      <Vacio icono="buscar" titulo="Esta página no existe" acciones={<BotonEnlace to="/">Ir al inicio</BotonEnlace>} />
    </div>
  );
}

function Rutas() {
  const { partes, path } = useRuta();
  const sesion = useSesion();

  useLayoutEffect(() => {
    if (path !== '/biblioteca') window.scrollTo(0, 0);
    document.getElementById('contenido')?.focus({ preventScroll: true });
  }, [path]);

  if (sesion.estado !== 'activa') return <PantallaAcceso />;

  const [p0, p1] = partes;
  if (p0 === 'facilitar') return <Facilitacion />;
  if (p0 === 'imprimir') return <Imprimir />;

  let pagina: ReactNode;
  switch (p0) {
    case undefined:
      pagina = <Inicio />;
      break;
    case 'biblioteca':
      pagina = <Biblioteca />;
      break;
    case 'actividad':
      pagina = <Ficha key={p1} />;
      break;
    case 'retiros':
      pagina = p1 ? <RetiroEditor key={p1} /> : <Retiros />;
      break;
    case 'favoritos':
      pagina = <Favoritos />;
      break;
    case 'asistente':
      pagina = <Asistente />;
      break;
    case 'cuenta':
      pagina = <Cuenta />;
      break;
    case 'ayuda':
      pagina = <Ayuda />;
      break;
    case 'admin':
      pagina =
        p1 === 'actividades' ? <AdminActividades /> : p1 === 'actividad' ? <AdminEditor key={partes[2]} /> : p1 === 'accesos' ? <AdminAccesos /> : p1 === 'ajustes' ? <AdminAjustes /> : <AdminInicio />;
      break;
    default:
      pagina = <NoEncontrado />;
  }
  return (
    <Marco>
      <LimiteErrores key={path}>
        <Suspense fallback={<Cargando />}>{pagina}</Suspense>
      </LimiteErrores>
    </Marco>
  );
}

export function App() {
  return (
    <LimiteErrores>
      <UIProvider>
        <SesionProvider>
          <UsuarioProvider>
            <CatalogoProvider>
              <Rutas />
            </CatalogoProvider>
          </UsuarioProvider>
        </SesionProvider>
      </UIProvider>
    </LimiteErrores>
  );
}
