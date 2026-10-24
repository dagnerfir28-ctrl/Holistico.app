/** Pantallas de acceso para producción: inicio de sesión por correo, cuenta sin acceso y errores de configuración. */
import { useState } from 'react';
import { APP } from '../config/app';
import { useSesion } from '../state/sesion';
import { Icon } from '../components/Icon';
import { Aviso, Boton, Cargando } from '../components/ui';
import { useTitulo } from '../lib/hooks';

function Envoltorio({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: '24px max(16px, env(safe-area-inset-right)) 24px max(16px, env(safe-area-inset-left))' }}>
      <div className="tarjeta pila" style={{ width: 'min(460px, 100%)' }}>
        <div className="fila" style={{ gap: 12, flexWrap: 'nowrap', alignItems: 'center' }}>
          <span className="marca-icono">
            <Icon nombre="loto" tam={22} />
          </span>
          <div>
            <div className="marca-nombre">{APP.nombre}</div>
            <div className="marca-sub">{APP.subtitulo}</div>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

export function PantallaAcceso() {
  useTitulo(`Entrar · ${APP.nombre}`);
  const sesion = useSesion();
  const [email, setEmail] = useState('');
  const [codigo, setCodigo] = useState('');
  const [paso, setPaso] = useState<'email' | 'enviado'>('email');
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (sesion.estado === 'cargando') return <Cargando texto="Comprobando tu sesión…" />;

  if (sesion.estado === 'error') {
    return (
      <Envoltorio>
        <Aviso tipo="peligro" titulo="No se pudo conectar con el servicio">
          {sesion.error}
        </Aviso>
        <Boton onClick={() => void sesion.comprobarAcceso()} icono="refrescar">
          Reintentar
        </Boton>
      </Envoltorio>
    );
  }

  if (sesion.estado === 'sin-acceso') {
    return (
      <Envoltorio>
        <h1 style={{ fontSize: '1.5rem' }}>Tu cuenta no tiene acceso activo</h1>
        <p className="texto-suave">
          Iniciaste sesión como <strong>{sesion.usuario?.email}</strong>, pero no encontramos una compra aprobada asociada a este correo
          {sesion.acceso && sesion.acceso.estado !== 'sin-acceso' ? ` (estado: ${sesion.acceso.estado})` : ''}.
        </p>
        <ul className="lista-puntos texto-suave">
          <li>Si compraste con otro correo, cierra sesión y entra con ese correo.</li>
          <li>Si la compra es reciente, espera unos minutos y vuelve a comprobar.</li>
          <li>Si el problema continúa, usa el contacto con el productor disponible en tu compra de Hotmart.</li>
        </ul>
        <div className="fila">
          <Boton variante="primario" icono="refrescar" onClick={() => void sesion.comprobarAcceso()}>
            Volver a comprobar
          </Boton>
          <Boton icono="salir" onClick={() => void sesion.cerrarSesion()}>
            Cerrar sesión
          </Boton>
        </div>
      </Envoltorio>
    );
  }

  return (
    <Envoltorio>
      <h1 style={{ fontSize: '1.5rem' }}>Entra a tu espacio</h1>
      {paso === 'email' ? (
        <form
          className="pila"
          onSubmit={async (e) => {
            e.preventDefault();
            setError(null);
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
              setError('Escribe un correo válido.');
              return;
            }
            setOcupado(true);
            try {
              await sesion.enviarEnlace(email);
              setPaso('enviado');
            } catch (err) {
              setError(err instanceof Error ? err.message : 'No se pudo enviar el enlace.');
            } finally {
              setOcupado(false);
            }
          }}
        >
          <p className="texto-suave">Usa el mismo correo con el que hiciste la compra. Te enviaremos un enlace y un código para entrar, sin contraseña.</p>
          <div className="campo">
            <label htmlFor="acceso-email">Correo electrónico</label>
            <input id="acceso-email" className="entrada" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          {error && <Aviso tipo="peligro">{error}</Aviso>}
          <Boton type="submit" variante="primario" bloque disabled={ocupado}>
            {ocupado ? 'Enviando…' : 'Enviar enlace de acceso'}
          </Boton>
        </form>
      ) : (
        <form
          className="pila"
          onSubmit={async (e) => {
            e.preventDefault();
            setError(null);
            setOcupado(true);
            try {
              await sesion.verificarCodigo(email, codigo);
            } catch (err) {
              setError(err instanceof Error ? err.message : 'El código no es válido o ya caducó.');
            } finally {
              setOcupado(false);
            }
          }}
        >
          <Aviso tipo="exito">Te enviamos un correo a {email.trim()}. Abre el enlace en este dispositivo o escribe aquí el código.</Aviso>
          <div className="campo">
            <label htmlFor="acceso-codigo">Código de acceso</label>
            <input id="acceso-codigo" className="entrada" inputMode="numeric" autoComplete="one-time-code" value={codigo} onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 10))} />
          </div>
          {error && <Aviso tipo="peligro">{error}</Aviso>}
          <Boton type="submit" variante="primario" bloque disabled={ocupado || codigo.length < 6}>
            Entrar
          </Boton>
          <button type="button" className="enlace-boton" onClick={() => setPaso('email')}>
            Usar otro correo o reenviar
          </button>
        </form>
      )}
    </Envoltorio>
  );
}
