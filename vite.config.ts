import { defineConfig, loadEnv } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

/**
 * Dos destinos de compilación:
 *  - web (por defecto): app alojada (Vercel/Netlify) con PWA, Supabase y API propia.
 *  - artifact (`--mode artifact`): un único HTML para la vista previa privada en claude.ai.
 *    React se carga desde cdnjs (versión fija) y todo lo demás va incrustado.
 */
export default defineConfig(({ mode }) => {
  const artifact = mode === 'artifact';
  const env = { ...loadEnv(mode, process.cwd(), 'VITE_'), ...process.env };
  // Modo de datos: 'local' (vista previa privada), 'demo' (3 fichas de muestra) o 'supabase' (producción).
  // Se fija en compilación para que el catálogo completo NO se incluya en las compilaciones demo/producción.
  const dataMode = artifact ? 'local' : env.VITE_DATA_MODE || 'local';
  if (!['local', 'demo', 'supabase'].includes(dataMode)) throw new Error(`VITE_DATA_MODE no válido: ${dataMode}`);
  return {
    base: './',
    json: { stringify: true },
    define: {
      'import.meta.env.VITE_TARGET': JSON.stringify(artifact ? 'artifact' : env.VITE_TARGET || 'web'),
      'import.meta.env.VITE_DATA_MODE': JSON.stringify(dataMode),
    },
    esbuild: {
      jsx: 'transform',
      jsxFactory: 'React.createElement',
      jsxFragment: 'React.Fragment',
      jsxInject: "import React from 'react'",
    },
    plugins: artifact ? [viteSingleFile({ removeViteModuleLoader: true })] : [],
    build: artifact
      ? {
          outDir: 'dist-artifact',
          emptyOutDir: true,
          assetsInlineLimit: 100_000_000,
          cssCodeSplit: false,
          rollupOptions: {
            input: 'artifact.html',
            external: ['react', 'react-dom', 'react-dom/client'],
            output: {
              format: 'iife',
              globals: { react: 'React', 'react-dom': 'ReactDOM', 'react-dom/client': 'ReactDOM' },
              inlineDynamicImports: true,
            },
          },
        }
      : {
          outDir: 'dist',
          emptyOutDir: true,
          sourcemap: false,
        },
    test: {
      environment: 'jsdom',
      include: ['tests/unit/**/*.test.ts', 'tests/unit/**/*.test.tsx'],
    },
  };
});
