/**
 * Configuración central editable de la app.
 * Cambia aquí el nombre visible, el subtítulo o los recursos externos sin tocar los componentes.
 */
export const APP = {
  nombre: 'Retiros Holísticos',
  subtitulo: 'Tu espacio para preparar y facilitar experiencias con intención',
  beneficio: 'Menos tiempo preparando. Más presencia facilitando.',
  /** Nombre comercial del producto. NO es un recuento verificado: el recuento real se calcula del catálogo publicado. */
  nombreComercial: 'Más de 60 dinámicas para retiros holísticos',
  /** Asistente que ya existe fuera de esta app. Se muestra solo como recurso externo, sin afirmar nada sobre su contenido. */
  asistenteExterno: {
    url: 'https://asistente-holistico.vercel.app/',
    nombre: 'Asistente Holístico (servicio externo actual)',
  },
  /** Canal de soporte confirmado. null = no hay ninguno confirmado y la app no inventa uno. */
  soporte: null as null | { etiqueta: string; url: string },
  /** Límite diario orientativo de consultas al asistente con IA por cuenta (se aplica en el servidor en producción). */
  limiteDiarioAsistente: 20,
  /** Versión visible de la app. */
  version: '0.1.0',
} as const;
