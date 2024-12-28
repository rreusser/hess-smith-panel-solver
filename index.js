import createREGL from 'regl';
import createZoom from './create-zoom.js';
import createDrawLines from './draw-lines.js';
import createDrawPoints from './draw-points.js';
import createDrawField from './draw-field.js';
import createDrawSolidGeometry from './draw-solid-airfoil.js';
import createConfigureViewport from './configure-viewport.js';
import createConfigureLinearScales from './configure-linear-scales.js';
import evaluate from './evaluate.js';
import solveVortexPanel from './vortex-panel-solver.js';
import createCamera from './camera.js';
import { Pane } from './tweakpane.min.js';
import quantizeColorscale from './colorscale.js';
import d3 from 'd3/dist/d3.min.js';
import createGeometry from './airfoil.js';
import RenderData from './render-data.js';
import StreamlineField from './streamline-field.js';
import throttle from './throttle.js';
import * as TextareaPlugin from './textarea-plugin/index.js';
import serializeGeometry from './serialize-geometry.js';

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

const PARAMS = window.PARAMS = {
  points: '{\n"foo": "bar"\n}',
  count: 40,
  closeEnd: false,
  alpha: 6,
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

const renderData = new RenderData({regl, count: PARAMS.count});

window.Pane = Pane;
const pane = new Pane();

pane.registerPlugin(TextareaPlugin);

const aeroFolder = pane.addFolder({ title: 'Aerodynamics' });
const geometryFolder = pane.addFolder({ title: 'Airfoil geometry', expanded: true });
const airfoilRenderingFolder = pane.addFolder({ title: 'Airfoil rendering', expanded: false });
const fieldRenderingFolder = pane.addFolder({ title: 'Pressure field rendering', expanded: false });

const countBinding = geometryFolder.addBinding(PARAMS, 'count', {min: 3, max: 200, step: 1, label: 'panel count'});
const mBinding = window.m = geometryFolder.addBinding(PARAMS, 'm', {min: -0.2, max: 0.2, label: 'camber (%)'});
const pBinding = geometryFolder.addBinding(PARAMS, 'p', {min: 0.2, max: 0.8, label: 'max camber loc (%)'});
const tBinding = geometryFolder.addBinding(PARAMS, 't', {min: 0.001, max: 0.5, label: 'thickness (%)'});
const clusteringBinding = geometryFolder.addBinding(PARAMS, 'clustering');
const closeBinding = geometryFolder.addBinding(PARAMS, 'closeEnd', {label: 'close end'});
const pointsBinding = window.pb = geometryFolder.addBinding(PARAMS, 'points', {
  label: 'custom points\n(enter x, y pairs, shift + enter to update)',
  placeholder: 'CSV x,y coords',
  view: 'textarea',
  multiline: true,
  rows: 5,
});

const alphaBinding = aeroFolder.addBinding(PARAMS, 'alpha', {min: -20, max: 20, step: 0.05, label: 'angle of attack'});
aeroFolder.addBinding(PARAMS, 'kuttaCondition', {label: 'kutta condition'});

const drawLines = createDrawLines(regl);
const drawPoints = createDrawPoints(regl);
const drawField = createDrawField(regl);
const drawSolidGeometry = createDrawSolidGeometry(regl);
const camera = createCamera(regl);
const configureViewport = createConfigureViewport(regl);
const configureLinearScales = createConfigureLinearScales(regl);

airfoilRenderingFolder.addBinding(PARAMS, 'fillOpacity', {min: 0, max: 1, label: 'fill opacity'});
airfoilRenderingFolder.addBinding(PARAMS, 'vertexOpacity', {min: 0, max: 1, label: 'point opacity'});
airfoilRenderingFolder.addBinding(PARAMS, 'vertexSize', {min: 1, max: 8, label: 'point size'});
airfoilRenderingFolder.addBinding(PARAMS, 'lineOpacity', {min: 0, max: 1, label: 'line opacity'});
airfoilRenderingFolder.addBinding(PARAMS, 'lineWidth', {min: 0.5, max: 4, label: 'line width'});

fieldRenderingFolder.addBinding(PARAMS, 'contourOpacity', {min: 0, max: 1, label: 'contour opacity'});
fieldRenderingFolder.addBinding(PARAMS, 'shadingOpacity', {min: 0, max: 1, label: 'shading opacity'});
const colorscaleBinding = fieldRenderingFolder.addBinding(PARAMS, 'colorscale', {options: Object.fromEntries(COLORSCALE_NAMES.map(c => [c, c]))});
const invertColorscaleBinding = fieldRenderingFolder.addBinding(PARAMS, 'invertColorscale', {label: 'invert'});


let customGeometry = null;
let geometry;
function update () {
  if (customGeometry) {
    geometry = customGeometry;
  } else {
    geometry = createGeometry(PARAMS);
  }

  renderData.updateGeometry(geometry);
  const solution = solveVortexPanel({ geometry, vInf: 1, ...PARAMS });
  renderData.updateSolution(geometry, solution);

  PARAMS.points = serializeGeometry(geometry);

  requestAnimationFrame(() => pane.refresh());
}

const streamlines = new StreamlineField({regl});

function draw () {
  regl.poll();
  configureViewport({}, () => {
    configureLinearScales.invoke(matrices, () => {//{view})({scales, ...PARAMS}, ({view}) => {
      drawField({
        ...PARAMS,
        ...renderData,
        vInf: [Math.cos(PARAMS.alpha * Math.PI / 180), Math.sin(PARAMS.alpha * Math.PI / 180)],
        colorscale,
      });
      
      if (false) {
        drawPoints({
          vertexBuffer: streamlines.seedBuffer,
          count: streamlines.seeds.length / 2,
          color: [1, 1, 1, 1],
          pointSize: 2
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

[geometryFolder, aeroFolder].forEach(binding => binding.on('change', update));
[geometryFolder, aeroFolder, airfoilRenderingFolder, fieldRenderingFolder].forEach(binding => binding.on('change', draw))
alphaBinding.on('change', onResize);

update();

let matrices = {};

[closeBinding, mBinding, pBinding, tBinding, countBinding, clusteringBinding].forEach(binding =>
  binding.on('change', () => {
    customGeometry = null
  })
);

const seedStreamlines = throttle((matrices) => {
  streamlines.updateSeeds({matrices})
  requestAnimationFrame(draw);
}, 500);

function onResize () {
  scales.x.range([0, canvas.width / pixelRatio]);
  scales.y.range([canvas.height / pixelRatio, 0]);
  createZoom(canvas, scales, function () {
    matrices = configureLinearScales({scales, ...PARAMS});
    seedStreamlines(matrices);
    requestAnimationFrame(draw);
  });
}
onResize();
window.addEventListener('resize', onResize);

canvas.addEventListener('mousemove', (event) => {
  const {clientX, clientY} = event;
  //console.log(clientX, clientY);
});
