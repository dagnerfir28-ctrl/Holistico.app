import { useEffect, useId, useRef, useState } from 'react';
import { Icon } from './Icon';
import { fechaCorta } from '../domain/time';

/**
 * Editor de notas privadas con guardado automático (tras una breve pausa al escribir y al salir del campo).
 * Recuerda no anotar datos que identifiquen a participantes.
 */
export function EditorNota({
  valor,
  actualizado,
  onGuardar,
  etiqueta = 'Mi nota privada',
  placeholder = 'Adaptaciones, lo que funcionó, ideas para la próxima vez…',
}: {
  valor: string;
  actualizado?: string | null;
  onGuardar: (texto: string) => void;
  etiqueta?: string;
  placeholder?: string;
}) {
  const id = useId();
  const [texto, setTexto] = useState(valor);
  const [estado, setEstado] = useState<'guardado' | 'escribiendo'>('guardado');
  const temporizador = useRef<number | undefined>(undefined);
  const ultimo = useRef(valor);

  useEffect(() => {
    // Si la nota cambia fuera de este editor (otra pestaña), se actualiza mientras no se esté escribiendo.
    if (estado === 'guardado' && valor !== ultimo.current) {
      setTexto(valor);
      ultimo.current = valor;
    }
  }, [valor, estado]);

  const guardar = (t: string) => {
    window.clearTimeout(temporizador.current);
    if (t !== ultimo.current) {
      ultimo.current = t;
      onGuardar(t);
    }
    setEstado('guardado');
  };

  useEffect(() => () => window.clearTimeout(temporizador.current), []);

  return (
    <div className="campo nota-privada">
      <div className="fila-entre">
        <label htmlFor={id} className="etiqueta" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon nombre="candado" tam={15} />
          {etiqueta}
        </label>
        <span className="estado-guardado" aria-live="polite">
          {estado === 'escribiendo' ? 'Guardando…' : texto.trim() ? `Guardada${actualizado ? ` · ${fechaCorta(actualizado)}` : ''}` : ''}
        </span>
      </div>
      <textarea
        id={id}
        className="area"
        value={texto}
        placeholder={placeholder}
        maxLength={5000}
        onChange={(e) => {
          const t = e.target.value;
          setTexto(t);
          setEstado('escribiendo');
          window.clearTimeout(temporizador.current);
          temporizador.current = window.setTimeout(() => guardar(t), 700);
        }}
        onBlur={() => guardar(texto)}
      />
      <span className="ayuda">Solo tú puedes verla. Evita escribir nombres u otros datos que identifiquen a participantes.</span>
    </div>
  );
}
