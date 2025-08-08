import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'client/index': 'src/client/index.ts',
    'server/index': 'src/server/index.ts',
    'react/index': 'src/react/index.ts'
  },
  dts: true,
  format: ['esm', 'cjs'],
  sourcemap: true,
  clean: true,
  target: 'es2021',
  outDir: 'dist',
})
