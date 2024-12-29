import createREGL from 'regl';
import createZoom from './create-zoom.js';
import createDrawLines from './draw-lines.js';
import createDrawStreamlines from './draw-streamlines.js';
import createDrawPoints from './draw-points.js';
import createDrawField from './draw-field.js';
import createDrawSolidGeometry from './draw-solid-airfoil.js';
import createConfigureViewport from './configure-viewport.js';
import createConfigureLinearScales from './configure-linear-scales.js';
import createEvaluator from './evaluate.js';
import { transformMat4 as vec3transformMat4 } from 'gl-vec3';
import solveVortexPanel from './vortex-panel-solver.js';
import { Pane } from './tweakpane.min.js';
import quantizeColorscale from './colorscale.js';
import d3 from 'd3/dist/d3.min.js';
import createGeometry from './airfoil.js';
import RenderData from './render-data.js';
import StreamlineField from './streamline-field.js';
import throttle from './throttle.js';
import * as TextareaPlugin from './textarea-plugin/index.js';
import serializeGeometry from './serialize-geometry.js';
import createDrawLiveStreamlines from './live-streamlines.js';

const COLORSCALE_NAMES = [
  'Cividis', 'Viridis', 'Inferno', 'Magma', 'Plasma', 'Warm', 'Cool', 'CubehelixDefault', 'Turbo',
  'Rainbow', 'Sinebow', 'Blues', 'Greens', 'Greys', 'Oranges', 'Purples', 'Reds', 'BuGn', 'BuPu',
  'GnBu', 'OrRd', 'PuBuGn', 'PuBu', 'PuRd', 'RdPu', 'YlGnBu', 'YlGn', 'YlOrBr', 'YlOrRd',
];

const style = document.createElement('style');
document.body.appendChild(style);
style.textContent = `
.tp-dfwv {
  min-width: 315px;
}`;

const pixelRatio = window.devicePixelRatio;
const regl = createREGL({
  extensions: [
    'ANGLE_instanced_arrays',
    'OES_standard_derivatives',
    'OES_texture_float',
  ],
  pixelRatio
});

const vInf = 1;

const MAX_STREAMLINE_COUNT = 5000;
const MAX_STREAMLINE_LENGTH = 40;

const PARAMS = window.PARAMS = {
  points: '{\n"foo": "bar"\n}',
  count: 40,
  closeEnd: true,
  alpha: 7,
  kuttaCondition: true,
  clustering: true,
  m: 0.04,
  p: 0.4,
  t: 0.12,
  c: 1,
  vertexOpacity: 1,
  lineOpacity: 0.8,
  lineWidth: 1,
  vertexSize: 3,
  fillOpacity: 1.0,
  contourOpacity: 0.1,
  shadingOpacity: 0.15,
  colorscale: 'Magma',
  invertColorscale: false,
  streamlineOpacity: 0.2,
  streamlineWidth: 2,
  streamlineCount: 500,
  streamlineNoise: 0.2,
  streamlineColorByPressure: 0.0,
  streamlineLength: 20,
};

const colorscale = regl.texture({
  data: quantizeColorscale(d3.interpolateMagma, 256).flat(),
  width: 256,
  height: 1,
  min: 'linear',
  mag: 'linear',
});

const canvas = regl._gl.canvas;
const scales = {
  x: d3.scaleLinear().domain([-0.2, 1.2]),
  y: d3.scaleLinear().domain([-1, 1])
};

const mouseVecData = new Float32Array([-1000, -1000, 0, 0, 0, 0, -1000, -1000]);
const mouseVecBuffer = regl.buffer(mouseVecData);

const renderData = new RenderData({regl, count: PARAMS.count});

window.Pane = Pane;
const pane = new Pane();

pane.registerPlugin(TextareaPlugin);

//const infoFolder = pane.addFolder({ title: 'About', expanded: true });
const aeroFolder = pane.addFolder({ title: 'Aerodynamics' });
const geometryFolder = pane.addFolder({ title: 'Geometry', expanded: false });
const airfoilRenderingFolder = pane.addFolder({ title: 'Airfoil rendering', expanded: false });
const fieldRenderingFolder = pane.addFolder({ title: 'Pressure field', expanded: false });
const streamlineFolder = pane.addFolder({ title: 'Streamlines', expanded: false });

const countBinding = geometryFolder.addBinding(PARAMS, 'count', {min: 3, max: 200, step: 1, label: 'panel count'});
const mBinding = window.m = geometryFolder.addBinding(PARAMS, 'm', {min: -0.2, max: 0.2, label: 'camber (%)'});
const pBinding = geometryFolder.addBinding(PARAMS, 'p', {min: 0.2, max: 0.8, label: 'max camber loc (%)'});
const tBinding = geometryFolder.addBinding(PARAMS, 't', {min: 0.001, max: 0.5, label: 'thickness (%)'});
const clusteringBinding = geometryFolder.addBinding(PARAMS, 'clustering');
const closeBinding = geometryFolder.addBinding(PARAMS, 'closeEnd', {label: 'close end'});
const pointsBinding = window.pb = geometryFolder.addBinding(PARAMS, 'points', {
  label: 'custom geometry\n(shift + enter to update)',
  placeholder: 'CSV x,y coords',
  view: 'textarea',
  multiline: true,
  rows: 5,
});

const alphaBinding = aeroFolder.addBinding(PARAMS, 'alpha', {min: -20, max: 20, step: 0.05, label: 'angle of attack'});
aeroFolder.addBinding(PARAMS, 'kuttaCondition', {label: 'kutta condition'});

const drawLines = createDrawLines(regl);
const drawStreamlines = createDrawStreamlines(regl);
const drawPoints = createDrawPoints(regl);
const drawField = createDrawField(regl);
const drawSolidGeometry = createDrawSolidGeometry(regl);
const drawLiveStreamlines = createDrawLiveStreamlines(regl, {maxStreamlines: MAX_STREAMLINE_COUNT, maxLength: MAX_STREAMLINE_LENGTH});
const configureViewport = createConfigureViewport(regl);
const configureLinearScales = createConfigureLinearScales(regl);

airfoilRenderingFolder.addBinding(PARAMS, 'fillOpacity', {min: 0, max: 1, label: 'fill opacity'});
airfoilRenderingFolder.addBinding(PARAMS, 'vertexOpacity', {min: 0, max: 1, label: 'point opacity'});
airfoilRenderingFolder.addBinding(PARAMS, 'vertexSize', {min: 1, max: 8, label: 'point size'});
airfoilRenderingFolder.addBinding(PARAMS, 'lineOpacity', {min: 0, max: 1, label: 'line opacity'});
airfoilRenderingFolder.addBinding(PARAMS, 'lineWidth', {min: 0.5, max: 4, label: 'line width'});

fieldRenderingFolder.addBinding(PARAMS, 'contourOpacity', {min: 0, max: 1, label: 'contour opacity'});
fieldRenderingFolder.addBinding(PARAMS, 'shadingOpacity', {min: 0, max: 1, label: 'shading opacity'});
const colorscaleBinding = fieldRenderingFolder.addBinding(PARAMS, 'colorscale', {
  options: Object.fromEntries(COLORSCALE_NAMES.map(c => [c, c])),
  view: 'text'
});
const invertColorscaleBinding = fieldRenderingFolder.addBinding(PARAMS, 'invertColorscale', {label: 'invert'});

streamlineFolder.addBinding(PARAMS, 'streamlineCount', {min: 0, max: MAX_STREAMLINE_COUNT, label: 'count', step: 1});
streamlineFolder.addBinding(PARAMS, 'streamlineOpacity', {min: 0, max: 1, label: 'opacity'});
streamlineFolder.addBinding(PARAMS, 'streamlineNoise', {min: 0, max: 1, label: 'noise'});
streamlineFolder.addBinding(PARAMS, 'streamlineColorByPressure', {min: 0, max: 1, label: 'color by pressure'});
streamlineFolder.addBinding(PARAMS, 'streamlineWidth', {min: 1.0, max: 8, label: 'line width'});
streamlineFolder.addBinding(PARAMS, 'streamlineLength', {min: 3, max: MAX_STREAMLINE_LENGTH, label: 'line length', step: 1});

/*
const integrateStreamlines = throttle(function integrateStreamlines () {
  streamlines.updateSeeds({geometry, matrices})
  streamlines.integrate(evaluate, Math.hypot(matrices.view[0], matrices.view[5]));
  requestAnimationFrame(draw);
}, 1000);
*/

let customGeometry = null;
let geometry, solution, evaluate;
function update () {
  if (customGeometry) {
    geometry = customGeometry;
  } else {
    geometry = createGeometry(PARAMS);
  }
  renderData.updateGeometry(geometry);
  solution = solveVortexPanel({ geometry, vInf, ...PARAMS });
  renderData.updateSolution(geometry, solution);

  evaluate = createEvaluator({geometry, solution, vInf, ...PARAMS});

  matrices = configureLinearScales({scales, ...PARAMS});
  //integrateStreamlines();

  PARAMS.points = serializeGeometry(geometry);
  requestAnimationFrame(() => pane.refresh());
}

//const streamlines = new StreamlineField({regl});

function draw () {
  regl.poll();
  configureViewport({}, () => {
    configureLinearScales.invoke(matrices, () => {//{view})({scales, ...PARAMS}, ({view}) => {
      drawField({
        ...PARAMS,
        ...renderData,
        vInf: [
          vInf * Math.cos(PARAMS.alpha * Math.PI / 180),
          vInf * Math.sin(PARAMS.alpha * Math.PI / 180)
        ],
        colorscale,
      });

      /*drawStreamlines({
        vertexAttributes: {
          xy: streamlines.trajectoriesBuffer
        },
        vertexCount: streamlines.renderCount, 
        lineWidth: PARAMS.streamlineWidth,
        color: [1, 1, 1, PARAMS.streamlineOpacity],
        join: 'bevel',
        caps: 'none',
      });
      */
      
      if (PARAMS.streamlineCount && PARAMS.streamlineOpacity > 0.01) {
        drawLiveStreamlines({
          ...renderData,
          noise: PARAMS.streamlineNoise,
          count: PARAMS.streamlineCount,
          byPressure: PARAMS.streamlineColorByPressure,
          panelCount: PARAMS.count,
          lineWidth: PARAMS.streamlineWidth,
          color: [1, 1, 1, PARAMS.streamlineOpacity],
          dt: 0.1 / Math.hypot(matrices.view[0], matrices.view[5]),
          vInf: [
            vInf * Math.cos(PARAMS.alpha * Math.PI / 180),
            vInf * Math.sin(PARAMS.alpha * Math.PI / 180)
          ],
          length: PARAMS.streamlineLength,
          colorscale,
        });
      }
      if (PARAMS.fillOpacity) {
        drawSolidGeometry({
          ...renderData,
          color: [0.1, 0.1, 0.1, PARAMS.fillOpacity]
        });
      }

      if (PARAMS.lineOpacity) {
        drawLines({
          vertexAttributes: { xy: renderData.vertexBuffer },
          vertexCount: renderData.count + 3,
          lineWidth: PARAMS.lineWidth,
          color: [1, 1, 1, PARAMS.lineOpacity],
          join: 'round',
          cap: 'round',
          joinResolution: 4,
          capResolution: 4,
          insertCaps: true,
        });
      }

      if (PARAMS.vertexOpacity) {
        drawPoints({
          vertexBuffer: renderData.vertexBuffer,
          count: renderData.count + 3,
          pointSize: PARAMS.vertexSize,
          color: [1, 1, 1, PARAMS.vertexOpacity]
        });
      }


    });
  });
}

[colorscaleBinding, invertColorscaleBinding].forEach(binding => 
  binding.on('change', () => {
    const colors = quantizeColorscale(d3[`interpolate${PARAMS.colorscale}`], 256);
    if (PARAMS.invertColorscale) colors.reverse();
    colorscale.subimage(colors.flat());
  })
);

function parsePointsInput (value) {
  const x = [];
  const y = [];
  const points = value.split(/\r?\n/).map(line => 
    line
      .trim()
      .split(/[,\s]+/g)
      .map(x => parseFloat(x.trim()))
  )
    .filter(line => line.every(x => isFinite(x)))
    .flat();
  const n = Math.floor(points.length / 2);
  for (let i = 0; i < n; i++) {
    x.push(points[2 * i]);
    y.push(points[2 * i + 1]);
  }
  return {x, y};
}

pointsBinding.on('change', ({value}) => {
  try {
    customGeometry = parsePointsInput(value);
  } catch (e) {
    console.error(e);
  }
});

let matrices = configureLinearScales({scales, ...PARAMS});
update();

[geometryFolder, aeroFolder].forEach(binding => binding.on('change', update));
[geometryFolder, aeroFolder, airfoilRenderingFolder, fieldRenderingFolder, streamlineFolder].forEach(binding => binding.on('change', draw))
alphaBinding.on('change', onResize);

[closeBinding, mBinding, pBinding, tBinding, countBinding, clusteringBinding].forEach(binding =>
  binding.on('change', () => {
    customGeometry = null
  })
);

function onResize () {
  scales.x.range([0, canvas.width / pixelRatio]);
  scales.y.range([canvas.height / pixelRatio, 0]);
  function onZoom () {
    matrices = configureLinearScales({scales, ...PARAMS});
    //integrateStreamlines();
    requestAnimationFrame(draw);
  }
  createZoom(canvas, scales, onZoom);
}
onResize();
window.addEventListener('resize', onResize);

/*
canvas.addEventListener('mousemove', (event) => {
  const {clientX, clientY} = event;

  const p = [
    (clientX / window.innerWidth) * 2 - 1,
    1 - (clientY / window.innerHeight) * 2,
    0, 1
  ];
  vec3transformMat4(p, p, matrices.inverseView);

  const v = evaluate(p);

  mouseVecData[2] = p[0];
  mouseVecData[3] = p[1];
  mouseVecData[4] = p[0] + v[0] * 0.2;
  mouseVecData[5] = p[1] + v[1] * 0.2;

  mouseVecBuffer.subdata(mouseVecData);

  draw();
});
*/
