// rollup.config.js
import nodePolyfills from 'rollup-plugin-polyfill-node';
import commonjs from '@rollup/plugin-commonjs';
import nodeResolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import { babel } from '@rollup/plugin-babel';

export default [
  {
    input: 'index.js',
    output: 'www/bundle.min.js',
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
  },
  plugins: [
    nodePolyfills(),
    nodeResolve({ browser: true }),
    commonjs(),
    //babel({
      //babelHelpers: 'bundled',
      //presets: bundle.babelPresets
    //}),
    terser()
  ]
}));
