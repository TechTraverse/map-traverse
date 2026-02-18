import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import dts from 'vite-plugin-dts';
import { libInjectCss } from 'vite-plugin-lib-inject-css';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    libInjectCss(),
    dts({
      include: ['src'],
      exclude: ['**/*.stories.tsx'],
      entryRoot: 'src',
      rollupTypes: false,
      insertTypesEntry: true,
    }),
  ],
  build: {
    lib: {
      entry: {
        main: resolve(__dirname, 'src/main.ts'),
        'components/LayerPanel/index': resolve(__dirname, 'src/components/LayerPanel/index.ts'),
        'components/Legend/index': resolve(__dirname, 'src/components/Legend/index.ts'),
        'components/BasemapSwitcher/index': resolve(__dirname, 'src/components/BasemapSwitcher/index.ts'),
        'components/CollapsibleControl/index': resolve(__dirname, 'src/components/CollapsibleControl/index.ts'),
        'components/CoordinateDisplay/index': resolve(__dirname, 'src/components/CoordinateDisplay/index.ts'),
        'components/SearchPanel/index': resolve(__dirname, 'src/components/SearchPanel/index.ts'),
        'hooks/index': resolve(__dirname, 'src/hooks/index.ts'),
        'schemas/index': resolve(__dirname, 'src/schemas/index.ts'),
        'types/index': resolve(__dirname, 'src/types/index.ts'),
      },
      formats: ['es'],
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime', 'react-icons', /^react-icons\//],
      output: {
        preserveModules: false,
        entryFileNames: '[name].js',
        assetFileNames: 'assets/[name][extname]',
      },
    },
  },
});
