import { nodeResolve } from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';

const plugins = [nodeResolve(), typescript()];

export default [
  {
    input: './src/PrettyDelaunay.ts',
    output: {
      file: './dist/pretty-delaunay.js',
      format: 'iife',
      name: 'PrettyDelaunay',
    },
    plugins,
  },
  {
    input: './src/PrettyDelaunay.ts',
    output: {
      file: './dist/index.js',
      format: 'umd',
      name: 'pretty-delaunay',
    },
    plugins,
  },
];
