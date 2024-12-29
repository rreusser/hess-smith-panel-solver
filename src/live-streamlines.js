import qrand from './quasirandom-2d.js';

export default function createDrawLineCommand(regl, {maxStreamlines = 5000, maxLength = 40} = {}) {
  var SIZEOF_FLOAT = 4;
  var DEFAULT_LINE_COLOR = [0, 0, 0, 1];
  var DEFAULT_LINE_WIDTH = 2;
  var tmp = {};

  const time = new Float32Array([...new Array(maxLength).keys()].map(i => [i, -1, i, 1]).flat());
  const lineCoordBuffer = regl.buffer(time);

  const seeds = new Float32Array(3 * maxStreamlines);
  const pt = [0, 0];
  let ptr = 0;
  for (let i = 0; i < seeds.length; i+=3) {
    qrand(pt, i / 2);
    seeds[i] = (pt[0] * 2 - 1) * 1.05 + Math.random() * 0.05;
    seeds[i + 1] = (pt[1] * 2 - 1) * 1.05 + Math.random() * 0.05;
    seeds[i + 2] = Math.random();
  }
  const seedBuffer = regl.buffer(seeds);


  function createCmd(panelCount, lengthCount) {
    return regl({
      vert: `
        precision highp float;

        uniform mat4 view, inverseView;
        uniform float lineWidth, dt, noise, byPressure;
        uniform vec2 resolution, vInf, tScale;
        attribute vec3 aPosition;
        attribute vec2 aLineCoord;
        uniform sampler2D panelData, colorscale;
        varying float opacity;

        vec2 lineNormal (vec4 p, vec4 n, float aspect) { 
          return normalize((p.yx / p.w  - n.yx / n.w) * vec2(1, aspect));
        }

        vec2 velocity (vec2 xy) {
          return vec2(sin(xy.x), cos(xy.y));
        }

        varying vec3 color;
        varying float y;

        const float pi = ${Math.PI};

        void main () {
          vec2 xy = (inverseView * vec4(aPosition.xy, 0, 1)).xy;
          float s = aLineCoord.x * tScale.x + tScale.y;
          y = aLineCoord.y;

          float xc[${panelCount + 1}];
          float yc[${panelCount + 1}];
          float source[${panelCount + 1}];
          float gamma;

          for (int i = 0; i < ${panelCount + 1}; i++) {
            vec4 sample = texture2D(panelData, vec2((float(i) + 0.5) / float(${panelCount + 1}), 0.5));
            xc[i] = sample.x;
            yc[i] = sample.y;
            source[i] = sample.z;
            gamma = sample.w;
          }

          vec2 v;
          for (int j = 0; j < ${lengthCount}; j++) {
            vec2 xyPrev = vec2(xc[0], yc[0]);
            vec2 rPrev = xy - xyPrev;
            vec2 vInduced = vec2(0);

            for (int i = 1; i < ${panelCount + 1}; i++) {
              vec2 xyNext = vec2(xc[i], yc[i]);
              vec2 rNext = xy - xyNext;
              vec2 t = normalize(xyNext - xyPrev);
              vec2 n = vec2(-t.y, t.x);
              float bij = atan(rPrev.x * rNext.y - rNext.x * rPrev.y, dot(rPrev, rNext));
              float lograt = 0.5 * log(dot(rNext, rNext) / dot(rPrev, rPrev));
              vInduced += source[i] * (-lograt * t + bij * n);
              vInduced += gamma * (bij * t + lograt * n);
              xyPrev = xyNext;
              rPrev = rNext;
            }

            v = vInf + (0.5 / pi) * vInduced;

            xy += s * dt * normalize(v) * 0.3;
          }

          float cp = 1.0 - dot(v, v) / dot(vInf, vInf);
          color = mix(vec3(1.0 - aPosition.z * noise), texture2D(colorscale, vec2(exp((cp - 1.0) * 0.7), 0.5)).rgb * (1.0 - noise * (aPosition.z - 0.5) * 2.0), byPressure);

          vec4 spVel = view * vec4(v, 0, 0);
          gl_Position = view * vec4(xy, 0, 1);
          gl_Position.xy += normalize(vec2(-spVel.y, spVel.x) / resolution) / resolution * aLineCoord.y * lineWidth;
          opacity = exp(-s * s * 10.0);
        }`,
      frag: `
        precision highp float;

        varying float opacity;
        varying float y;
        varying vec3 color;
        uniform vec4 baseColor;

        void main () {
          gl_FragColor = vec4(color, opacity * (1.0 - y * y) * baseColor.a);
        }`,
      attributes: {
        aLineCoord: {
          buffer: lineCoordBuffer,
          divisor: 0
        },
        aPosition: {
          buffer: seedBuffer,
          offset: 0,
          divisor: 1,
        },
      },
      uniforms: {
        tScale: (_, {length}) => [ 1 / (length - 1), -0.5 ],
        noise: regl.prop('noise'),
        byPressure: regl.prop('byPressure'),
        colorscale: regl.prop('colorscale'),
        dt: regl.prop('dt'),
        panelData: regl.prop('panelData'),
        vInf: regl.prop('vInf'),
        resolution: ({viewportWidth, viewportHeight}) => [viewportWidth, viewportHeight],
        lineWidth: ({pixelRatio}, {lineWidth=1}={}) => pixelRatio * lineWidth,
        baseColor: regl.prop('color'),
      },
      depth: {
        enable: false
      },
      cull: {
        enable: false
      },
      blend: {
        enable: true,
        func: {
          srcRGB: 'src alpha',
          srcAlpha: 1,
          dstRGB: 'one minus src alpha',
          dstAlpha: 1
        },
        equation: { rgb: 'add', alpha: 'add' },
      },
      primitive: 'triangle strip',
      instances: (_, {count}) => count,
      count: (_, {length}) => length * 2, 
    });
  }

  let cachedCount = -1;
  let cachedLengthCount = -1;
  let cachedCmd = null;
  return function (props) {
    if (cachedCount !== props.panelCount || cachedLengthCount !== props.length || !cachedCmd) {
      if (cachedCmd) cachedCmd.destroy();
      cachedCmd = createCmd(props.panelCount, props.length);
      cachedCount = props.panelCount;
      cachedLengthCount = props.length;
    }
    return cachedCmd(props);

  }
}
