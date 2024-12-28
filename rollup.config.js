// rollup.config.js
import nodePolyfills from 'rollup-plugin-polyfill-node';
import commonjs from '@rollup/plugin-commonjs';
import nodeResolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import { babel } from '@rollup/plugin-babel';

export default [
  {
    input: 'src/index.js',
    output: 'docs/bundle.min.js',
    format: 'umd',
    name: 'VortexPanelSolver',
    //babelPresets: ['@babel/preset-env'],
  },
].map(bundle => ({
  input: bundle.input,
  output: {
    file: bundle.output,
    format: bundle.format,
    name: bundle.name,
    globals: {
      'd3/dist/d3.min.js': 'd3',
      'earcut/dist/earcut.min.js': 'earcut.default',
    }
  },
  external: [
    'd3/dist/d3.min.js',
    'earcut/dist/earcut.min.js'
  ],
  plugins: [
    commonjs(),
    nodePolyfills(),
    nodeResolve({ browser: true }),
    //babel({
      //babelHelpers: 'bundled',
      //presets: bundle.babelPresets
    //}),
    terser()
  ]
}));
