/**
 * Genera supabase/seed/catalogo.sql a partir de src/data/catalog.json.
 * Ejecuta el archivo en el editor SQL de Supabase (o con psql) DESPUÉS de aplicar la migración 0001_init.sql.
 * La función importar_catalogo calcula la versión depurada para compradoras y separa los metadatos privados.
 * Uso: node scripts/generar-seed.mjs [ruta-del-catalogo.json]
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const origen = process.argv[2] ?? 'src/data/catalog.json';
const catalogo = JSON.parse(readFileSync(origen, 'utf8'));
const json = JSON.stringify(catalogo);
let etiqueta = 'catalogo';
while (json.includes(`$${etiqueta}$`)) etiqueta += 'x';
const sql = `-- Catálogo de Retiros Holísticos generado el ${new Date().toISOString()} desde ${origen}
-- ${catalogo.actividades.length} actividades únicas (${catalogo.resumen?.publicado ?? '?'} publicadas).
select public.importar_catalogo($${etiqueta}$${json}$${etiqueta}$::jsonb) as actividades_importadas;
`;
mkdirSync('supabase/seed', { recursive: true });
writeFileSync('supabase/seed/catalogo.sql', sql);
console.log(`supabase/seed/catalogo.sql: ${(sql.length / 1024).toFixed(0)} KB`);
