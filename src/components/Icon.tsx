/** Iconos propios en SVG (trazo de 1.75 px, 24×24). Decorativos por defecto: usa `etiqueta` si el icono va solo. */

type Forma = string | ['c', number, number, number, boolean?] | ['r', number, number, number, number, number];

const ICONOS = {
  inicio: ['M3 10.5 12 3l9 7.5', 'M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5'],
  biblioteca: ['M2 4.5h6a4 4 0 0 1 4 4V21a3 3 0 0 0-3-3H2z', 'M22 4.5h-6a4 4 0 0 0-4 4V21a3 3 0 0 1 3-3h7z'],
  calendario: [['r', 3, 4.5, 18, 16.5, 2], 'M16 2.5v4M8 2.5v4M3 10h18'],
  asistente: [
    'M12 3l1.8 4.7 4.7 1.8-4.7 1.8L12 16l-1.8-4.7-4.7-1.8 4.7-1.8z',
    'M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z',
    'M5 3.5l.5 1.5 1.5.5-1.5.5-.5 1.5-.5-1.5L3 5.5l1.5-.5z',
  ],
  usuario: [['c', 12, 8, 4], 'M4 21a8 8 0 0 1 16 0'],
  usuarios: [['c', 9, 8, 3.5], 'M2.5 20a6.5 6.5 0 0 1 13 0', 'M16 4.6a3.5 3.5 0 0 1 0 6.8', 'M18 14.2a6.5 6.5 0 0 1 3.5 5.8'],
  corazon: ['M12 20.5s-7.5-4.6-9.3-9.2C1.4 8 3.4 4.5 6.9 4.5c2 0 3.6 1.1 5.1 3 1.5-1.9 3.1-3 5.1-3 3.5 0 5.5 3.5 4.2 6.8-1.8 4.6-9.3 9.2-9.3 9.2z'],
  buscar: [['c', 11, 11, 7], 'M20.5 20.5 16 16'],
  filtros: ['M3 6h11M18 6h3M3 12h5M12 12h9M3 18h13M20 18h1', ['c', 16, 6, 2], ['c', 10, 12, 2], ['c', 18, 18, 2]],
  cerrar: ['M6 6l12 12M18 6 6 18'],
  chevIzq: ['M15 5l-7 7 7 7'],
  chevDer: ['M9 5l7 7-7 7'],
  chevAbajo: ['M5 9l7 7 7-7'],
  chevArriba: ['M5 15l7-7 7 7'],
  mas: ['M12 5v14M5 12h14'],
  menos: ['M5 12h14'],
  reloj: [['c', 12, 12, 9], 'M12 7v5l3 2'],
  hoja: ['M5 19c0-8 5-14 15-15-1 10-7 15-15 15z', 'M5 19l7-7'],
  sol: [['c', 12, 12, 4], 'M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4'],
  luna: ['M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z'],
  play: ['M7 4.5v15l12-7.5z'],
  pausa: [['r', 6, 5, 4, 14, 1], ['r', 14, 5, 4, 14, 1]],
  anterior: ['M18 5v14l-10-7z', 'M6 5v14'],
  siguiente: ['M6 5v14l10-7z', 'M18 5v14'],
  reiniciar: ['M3 12a9 9 0 1 0 3-6.7', 'M3 4v5h5'],
  check: ['M5 12.5l4.5 4.5L19 7.5'],
  checkCirculo: [['c', 12, 12, 9], 'M8 12.5l2.8 2.8L16 10'],
  lista: ['M9 6h12M9 12h12M9 18h12', ['c', 4.5, 6, 1], ['c', 4.5, 12, 1], ['c', 4.5, 18, 1]],
  impresora: ['M7 9V3.5h10V9', 'M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2', ['r', 7, 14, 10, 7, 1]],
  descargar: ['M12 3.5v12M7 10.5l5 5 5-5', 'M4 17v2.5A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5V17'],
  subir: ['M12 15.5v-12M7 8.5l5-5 5 5', 'M4 17v2.5A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5V17'],
  editar: ['M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z', 'M13.5 6.5l4 4'],
  papelera: ['M4 7h16', 'M10 11v6M14 11v6', 'M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13', 'M9 7V4h6v3'],
  copiar: [['r', 8, 8, 12, 12, 2], 'M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3'],
  arrastrar: [['c', 9, 6, 1.3, true], ['c', 15, 6, 1.3, true], ['c', 9, 12, 1.3, true], ['c', 15, 12, 1.3, true], ['c', 9, 18, 1.3, true], ['c', 15, 18, 1.3, true]],
  flechaArriba: ['M12 19V5M6 11l6-6 6 6'],
  flechaAbajo: ['M12 5v14M6 13l6 6 6-6'],
  flechaDer: ['M5 12h14M13 6l6 6-6 6'],
  volver: ['M19 12H5M11 6l-6 6 6 6'],
  alerta: ['M12 3.5 2.5 20h19z', 'M12 10v4.5', ['c', 12, 17.3, 0.7, true]],
  info: [['c', 12, 12, 9], 'M12 11v6', ['c', 12, 7.8, 0.7, true]],
  ayuda: [['c', 12, 12, 9], 'M9.6 9.3a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2.3-2.4 3.8', ['c', 12, 17.2, 0.7, true]],
  nota: ['M15 3.5H6a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8.5z', 'M15 3.5v5h5', 'M8 13h8M8 17h5'],
  ajustes: [['c', 12, 12, 3], 'M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1'],
  salir: ['M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3', 'M10 17l-5-5 5-5', 'M5 12h11'],
  escudo: ['M12 3 4.5 6v5.5c0 4.6 3.2 8.4 7.5 9.5 4.3-1.1 7.5-4.9 7.5-9.5V6z'],
  ojo: ['M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z', ['c', 12, 12, 3]],
  ojoCerrado: ['M3 3l18 18', 'M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4.1', 'M6.6 6.6C3.9 8.4 2 12 2 12s3.6 7 10 7a9.6 9.6 0 0 0 5.4-1.6', 'M9.9 9.9a3 3 0 0 0 4.2 4.2'],
  expandir: ['M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5'],
  sonido: ['M4 9.5h3.5L12 5.5v13l-4.5-4H4z', 'M16 9a4 4 0 0 1 0 6', 'M18.5 6.5a7.5 7.5 0 0 1 0 11'],
  silencio: ['M4 9.5h3.5L12 5.5v13l-4.5-4H4z', 'M16.5 9.5l5 5M21.5 9.5l-5 5'],
  candado: [['r', 5, 10.5, 14, 10, 2], 'M8 10.5V7a4 4 0 0 1 8 0v3.5'],
  externo: ['M14 4h6v6', 'M20 4l-9 9', 'M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5'],
  refrescar: ['M20 11a8 8 0 0 0-14.3-4.3L4 8.5', 'M4 4v4.5h4.5', 'M4 13a8 8 0 0 0 14.3 4.3L20 15.5', 'M20 20v-4.5h-4.5'],
  llama: ['M12 21c-3.9 0-6.5-2.6-6.5-6.3 0-3.2 2.2-5.2 3.4-7.7.4 1.6 1.3 2.8 2.6 3.5.1-3.1 1.3-5.8 3.5-7.5-.2 2.9 1.2 5 2.6 6.9 1.1 1.5 1.9 3 1.9 4.8C19.5 18.4 16 21 12 21z'],
  arbol: ['M12 22v-6', 'M12 2.5 5 13h4l-2.5 3.5h11L15 13h4z'],
  archivo: [['r', 3, 4, 18, 4.5, 1], 'M5 8.5V19a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8.5', 'M10 12.5h4'],
  historial: ['M3 12a9 9 0 1 0 2.6-6.4L3 8', 'M3 3.5V8h4.5', 'M12 7.5V12l3 2'],
  imagen: [['r', 3, 4, 18, 16, 2], ['c', 9, 10, 2], 'M21 16l-5-5-9 9'],
  capas: ['M12 3 2.5 8 12 13l9.5-5z', 'M2.5 12.5 12 17.5l9.5-5', 'M2.5 16.5 12 21.5l9.5-5'],
  menu: ['M4 6h16M4 12h16M4 18h16'],
  masOpciones: [['c', 5, 12, 1.4, true], ['c', 12, 12, 1.4, true], ['c', 19, 12, 1.4, true]],
  sinConexion: ['M2 2l20 20', 'M8.5 16.4a5 5 0 0 1 7 0', 'M5 12.9a10 10 0 0 1 5.2-2.7', 'M19 12.9a10 10 0 0 0-2.1-1.6', 'M2 9a15 15 0 0 1 4.3-2.6', 'M22 9a15 15 0 0 0-11.5-3.4', ['c', 12, 20, 0.7, true]],
  enviar: ['M21 3 10 14', 'M21 3l-7 18-4-7-7-4z'],
  detener: [['r', 6, 6, 12, 12, 2]],
  marcaUso: ['M6 3.5h12a1 1 0 0 1 1 1V21l-7-4.5L5 21V4.5a1 1 0 0 1 1-1z', 'M9 10l2 2 4-4'],
  texto: ['M5 6V4.5h14V6', 'M12 4.5v15', 'M9 19.5h6'],
  ruta: [['c', 6, 19, 2.5], ['c', 18, 5, 2.5], 'M8.5 19H16a3 3 0 0 0 0-6H8a3 3 0 0 1 0-6h7.5'],
  materiales: ['M3.5 8h17v11a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1z', 'M8.5 8V5.5a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1V8', 'M3.5 13h17'],
  taza: ['M4 9h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z', 'M16 10.5h1.5a2.5 2.5 0 0 1 0 5H16', 'M8 3.5v2.5M12 3.5v2.5'],
  circulo: [['c', 12, 12, 8.5], ['c', 12, 3.5, 1.4, true], ['c', 20.5, 12, 1.4, true], ['c', 12, 20.5, 1.4, true], ['c', 3.5, 12, 1.4, true]],
  ondas: ['M2 12c2.5 0 2.5-4 5-4s2.5 8 5 8 2.5-8 5-8 2.5 4 5 4'],
  loto: [
    'M12 19c-3.5 0-7-1.6-9-4.5 2.6-.6 5.6.2 9 4.5 3.4-4.3 6.4-5.1 9-4.5-2 2.9-5.5 4.5-9 4.5z',
    'M12 19c-2.3-2.5-3.2-5.4-2.6-8.7.9.4 1.8 1 2.6 1.9.8-.9 1.7-1.5 2.6-1.9.6 3.3-.3 6.2-2.6 8.7z',
    'M12 12.2c-.9-2.6-.6-5.2 0-7.2.6 2 .9 4.6 0 7.2z',
  ],
} satisfies Record<string, Forma[]>;

export type NombreIcono = keyof typeof ICONOS;

export function Icon({ nombre, tam = 20, etiqueta, relleno = false, className }: { nombre: NombreIcono; tam?: number; etiqueta?: string; relleno?: boolean; className?: string }) {
  const formas = ICONOS[nombre] as Forma[];
  return (
    <svg
      width={tam}
      height={tam}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={['icono', className].filter(Boolean).join(' ')}
      aria-hidden={etiqueta ? undefined : true}
      role={etiqueta ? 'img' : undefined}
      aria-label={etiqueta}
      focusable="false"
    >
      {formas.map((f, i) => {
        if (typeof f === 'string') return <path key={i} d={f} fill={relleno ? 'currentColor' : undefined} />;
        if (f[0] === 'c') return <circle key={i} cx={f[1]} cy={f[2]} r={f[3]} fill={f[4] ? 'currentColor' : undefined} stroke={f[4] ? 'none' : undefined} />;
        return <rect key={i} x={f[1]} y={f[2]} width={f[3]} height={f[4]} rx={f[5]} />;
      })}
    </svg>
  );
}
