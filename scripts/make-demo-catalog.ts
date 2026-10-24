/**
 * Genera src/data/catalog.demo.json: demostración limitada con 3 fichas publicadas que ya se muestran como
 * muestra pública en la landing (Respiración Consciente, Templo Interior y Círculo de Gratitud).
 * Aplica la misma depuración que ve una compradora y elimina enlaces a los PDF originales.
 * Uso: npm run catalog:demo
 */
import { readFileSync, writeFileSync } from 'node:fs';
import type { Catalogo } from '../src/domain/types';
import { paraCompradora } from '../src/domain/visibility';

const IDS = ['meditacion-respiracion-consciente', 'meditacion-templo-interior', 'circulo-de-gratitud'];

const completo = JSON.parse(readFileSync('src/data/catalog.json', 'utf8')) as Catalogo;
const actividades = IDS.map((id) => {
  const a = completo.actividades.find((x) => x.id === id);
  if (!a) throw new Error(`No existe la actividad ${id}`);
  if (a.estado !== 'publicado') throw new Error(`La actividad ${id} no está publicada`);
  const limpia = paraCompradora(a);
  return { ...limpia, relacionadas: limpia.relacionadas.filter((r) => IDS.includes(r)) };
});

const demo: Catalogo = {
  schema: completo.schema,
  generado: completo.generado,
  fuentes: { principal: { titulo: completo.fuentes.principal.titulo, paginas: completo.fuentes.principal.paginas, drive: '' } },
  materialesCanonicos: completo.materialesCanonicos,
  opcionesConsentimiento: completo.opcionesConsentimiento,
  incidenciasDocumento: { principal: { indice: null, pagina38: '', duplicados: [], separadorIncorrecto: [], fichasIncompletas: [], piesDePagina: '' }, edicion2: [] },
  resumen: { publicado: actividades.length, revision: 0, borrador: 0, archivado: 0 },
  actividades,
};

writeFileSync('src/data/catalog.demo.json', JSON.stringify(demo, null, 1));
console.log(`catalog.demo.json: ${actividades.length} actividades`);
