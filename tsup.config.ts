import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/cli.ts', 'src/index.ts'],
  format: ['esm', 'cjs'],
  target: 'node18',
  dts: true,
  clean: true,
  // Shim import.meta.url in the CJS build (used by src/version.ts).
  shims: true,
  splitting: false,
  sourcemap: false,
  outDir: 'dist',
});
