import { nodeResolve } from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';

export default {
  input: './demo/index.ts',
  output: {
    file: './demo/index.bundle.js',
    format: 'iife',
  },
  plugins: [nodeResolve(), typescript()],
};
