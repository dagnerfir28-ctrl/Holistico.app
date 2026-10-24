import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Markdown, parsearBloques } from '../../src/lib/markdown';
import { datosVacios, sanearDatos } from '../../src/data/userStore';
import { leerCopia } from '../../src/lib/copia';
import {
  agregarReciente,
  alternarFavorito,
  alternarUsoHoy,
  borrarDefinitivo,
  eliminarRetiro,
  guardarFacilitacion,
  guardarNota,
  guardarRetiro,
  purgarPapelera,
  restaurarRetiro,
} from '../../src/state/acciones';
import { nuevoRetiro } from '../../src/domain/retreats';
import { crearEstado } from '../../src/domain/timer';

describe('Markdown seguro', () => {
  it('no ejecuta HTML: lo muestra como texto', () => {
    const html = renderToStaticMarkup(<Markdown texto={'Hola <script>alert(1)</script> <img src=x onerror=alert(1)>'} />);
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;script&gt;');
  });

  it('solo enlaza URLs https y abre en pestaña nueva con noopener', () => {
    const html = renderToStaticMarkup(<Markdown texto={'[bien](https://example.com) [mal](javascript:alert(1))'} />);
    expect(html).toContain('href="https://example.com"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).not.toContain('href="javascript');
  });

  it('renderiza títulos, listas anidadas, negrita y referencias a fichas', () => {
    const html = renderToStaticMarkup(
      <Markdown texto={'## Plan\n1. Abrir con **Círculo** [[circulo-de-gratitud]]\n   - detalle\n2. Cerrar'} renderCita={(id, k) => <a key={k} data-ficha={id} />} />,
    );
    expect(html).toContain('<h3>Plan</h3>');
    expect(html).toContain('<ol>');
    expect(html).toContain('<strong>Círculo</strong>');
    expect(html).toContain('data-ficha="circulo-de-gratitud"');
    expect(html).toMatch(/<li>Abrir con.*<ul><li>detalle<\/li><\/ul><\/li>/);
    expect(parsearBloques('a\n\nb').length).toBe(2);
  });
});

describe('Datos del usuario', () => {
  it('sanea datos dañados o manipulados sin romper la app', () => {
    const d = sanearDatos({
      preferencias: { tema: 'neón', tamano: 'gigante', sonidos: 'sí' },
      favoritos: 'no-es-objeto',
      recientes: [1, 'a', null],
      retiros: [
        { id: 'r1', nombre: 'x'.repeat(500), jornadas: [{ id: 'j1', inicio: '25:99', bloques: [{ id: 'b1', tipo: 'actividad', actividadId: 'a', duracion: 99999 }, { id: 'b2', tipo: 'otro' }, 'basura'] }] },
        { sinId: true },
      ],
    });
    expect(d.preferencias).toEqual({ tema: 'oscuro', tamano: 'normal', reducirMovimiento: 'sistema', sonidos: false, pantallaActiva: true });
    expect(d.favoritos).toEqual({});
    expect(d.recientes).toEqual(['a']);
    expect(d.retiros).toHaveLength(1);
    expect(d.retiros[0].nombre.length).toBe(120);
    expect(d.retiros[0].jornadas[0].inicio).toBe('09:00');
    expect(d.retiros[0].jornadas[0].bloques).toHaveLength(1);
    expect(d.retiros[0].jornadas[0].bloques[0].duracion).toBe(600);
  });

  it('papelera: eliminar, restaurar, borrar y purgar a los 30 días', () => {
    let d = datosVacios();
    const r = nuevoRetiro('Prueba');
    d = guardarRetiro(d, r);
    d = guardarFacilitacion(d, crearEstado('x', r.id, 'b1'));
    d = eliminarRetiro(d, r.id);
    expect(d.retiros).toHaveLength(0);
    expect(d.papelera).toHaveLength(1);
    expect(Object.keys(d.facilitacion)).toHaveLength(0);
    d = restaurarRetiro(d, r.id);
    expect(d.retiros[0].eliminado).toBeNull();
    d = eliminarRetiro(d, r.id);
    const viejo = { ...d, papelera: d.papelera.map((x) => ({ ...x, eliminado: new Date(Date.now() - 31 * 86_400_000).toISOString() })) };
    expect(purgarPapelera(viejo).papelera).toHaveLength(0);
    expect(borrarDefinitivo(d, r.id).papelera).toHaveLength(0);
  });

  it('favoritos, notas, recientes y marcas de uso', () => {
    let d = datosVacios();
    d = alternarFavorito(d, 'a');
    expect(d.favoritos.a).toBeTruthy();
    d = alternarFavorito(d, 'a');
    expect(d.favoritos.a).toBeUndefined();
    d = guardarNota(d, 'a', 'hola');
    expect(d.notasActividad.a.texto).toBe('hola');
    d = guardarNota(d, 'a', '   ');
    expect(d.notasActividad.a).toBeUndefined();
    for (let i = 0; i < 25; i++) d = agregarReciente(d, `x${i}`);
    expect(d.recientes).toHaveLength(20);
    expect(d.recientes[0]).toBe('x24');
    d = alternarUsoHoy(d, 'a', '2026-10-23');
    d = alternarUsoHoy(d, 'a', '2026-10-24');
    expect(d.usos.a).toEqual(['2026-10-23', '2026-10-24']);
    d = alternarUsoHoy(d, 'a', '2026-10-24');
    expect(d.usos.a).toEqual(['2026-10-23']);
  });

  it('conserva como máximo 12 facilitaciones abiertas', () => {
    let d = datosVacios();
    for (let i = 0; i < 15; i++) d = guardarFacilitacion(d, { ...crearEstado(`a${i}`), actualizado: new Date(2026, 0, 1, 0, i).toISOString() });
    expect(Object.keys(d.facilitacion)).toHaveLength(12);
    expect(d.facilitacion['act:a14']).toBeTruthy();
    expect(d.facilitacion['act:a0']).toBeUndefined();
  });

  it('valida las copias de seguridad antes de restaurarlas', () => {
    expect(leerCopia('no json').ok).toBe(false);
    expect(leerCopia(JSON.stringify({ tipo: 'otra-cosa' })).ok).toBe(false);
    const r = leerCopia(JSON.stringify({ tipo: 'copia-de-seguridad', datos: { favoritos: { a: '2026' }, retiros: [] } }));
    expect(r.ok).toBe(true);
    expect(r.datos?.favoritos).toEqual({ a: '2026' });
  });
});
