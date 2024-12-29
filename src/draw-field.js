export default function (regl) {
  function createCmd(count) {
    return regl({
      vert: `
      precision highp float;
      attribute vec2 coord;
      uniform mat4 inverseView;
      varying vec2 xy, uv;
      void main () {
        vec4 p = vec4(coord, 0, 1);
        xy = (inverseView * p).xy;
        gl_Position = p;
        uv = coord;
      }`,
      frag: `
      #extension GL_OES_standard_derivatives : enable
      precision highp float;
      varying vec2 xy, uv;
      uniform sampler2D panelData, colorscale;
      uniform vec2 vInf;
      uniform float contourOpacity, shadingOpacity;

      const float pi = ${Math.PI};

      // Source: https://github.com/hughsk/glsl-noise/blob/master/simplex/2d.glsl
      //
      // Description : Array and textureless GLSL 2D simplex noise function.
      //      Author : Ian McEwan, Ashima Arts.
      //  Maintainer : ijm
      //     Lastmod : 20110822 (ijm)
      //     License : Copyright (C) 2011 Ashima Arts. All rights reserved.
      //               Distributed under the MIT License. See LICENSE file.
      //               https://github.com/ashima/webgl-noise
      //

      vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
      float snoise(vec2 v) {
        const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
        vec2 i  = floor(v + dot(v, C.yy) );
        vec2 x0 = v - i + dot(i, C.xx);
        vec2 i1;
        i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
        vec4 x12 = x0.xyxy + C.xxzz;
        x12.xy -= i1;
        i = mod289(i);
        vec3 p = permute( permute(i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0));
        vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
        m = m*m;
        m = m*m;
        vec3 x = 2.0 * fract(p * C.www) - 1.0;
        vec3 h = abs(x) - 0.5;
        vec3 ox = floor(x + 0.5);
        vec3 a0 = x - ox;
        m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
        vec3 g;
        g.x  = a0.x * x0.x + h.x * x0.y;
        g.yz = a0.yz * x12.xz + h.yz * x12.yw;
        return 130.0 * dot(m, g);
      }

      float linearstep(float edge0, float edge1, float x) {
        return clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
      }

      float contrastFunction(float x, float power) {
        x = 2.0 * x - 1.0;
        return 0.5 + 0.5 * pow(abs(x), power) * sign(x);
      }

      const float octaveDivisions = 2.0;
      float shadedContours (float f, float minSpacing, float antialiasWidth, float rampPower, float contourWidth, out float grid) {
        const int octaves = 8;
        const float fOctaves = float(octaves);
        float screenSpaceGrad = length(vec2(dFdx(f), dFdy(f))) / abs(f);
        float localOctave = log2(screenSpaceGrad * minSpacing) / log2(octaveDivisions);
        float contourSpacing = pow(octaveDivisions, ceil(localOctave));
        float plotVar = log2(abs(f)) / contourSpacing;
        float widthScale = contourSpacing / screenSpaceGrad;
        float contourSum = 0.0;
        grid = 0.0;
        for(int i = 0; i < octaves; i++) {
          float t = float(i + 1) - fract(localOctave);
          float weight = smoothstep(0.0, 1.0, t) * smoothstep(fOctaves, fOctaves - 1.0, t);
          float y = fract(plotVar);
          contourSum += weight * min(contrastFunction(y, rampPower), (1.0 - y) * 0.5 * widthScale / antialiasWidth);

          grid += weight * linearstep(
            contourWidth + antialiasWidth,
            contourWidth - antialiasWidth,
            (0.5 - abs(fract(plotVar) - 0.5)) * widthScale
          );
          widthScale *= octaveDivisions;
          plotVar /= octaveDivisions;
        }
        grid /= fOctaves;
        return contourSum / fOctaves;
      }

      void main () {
        vec4 prev = texture2D(panelData, vec2((float(0) + 0.5) / float(${count + 1}), 0.5));
        vec2 rPrev = xy - prev.xy;
        vec2 vInduced = vec2(0);

        for (int i = 1; i < ${count + 1}; i++) {
          vec4 next = texture2D(panelData, vec2((float(i) + 0.5) / float(${count + 1}), 0.5));
          vec2 rNext = xy - next.xy;
          vec2 t = normalize(next.xy - prev.xy);
          vec2 n = vec2(-t.y, t.x);
          float bij = atan(rPrev.x * rNext.y - rNext.x * rPrev.y, dot(rPrev, rNext));
          float lograt = 0.5 * log(dot(rNext, rNext) / dot(rPrev, rPrev));
          float source = next.z;
          float gamma = next.w;
          vInduced += source * (-lograt * t + bij * n);
          vInduced += gamma * (bij * t + lograt * n);
          prev = next;
          rPrev = rNext;
        }

        vec2 v = vInf + (0.5 / pi) * vInduced;
        float cp = 1.0 - dot(v, v) / dot(vInf, vInf);

        gl_FragColor = texture2D(colorscale, vec2(exp((cp - 1.0) * 0.7), 0.5));

        float g = 0.0;
        if (shadingOpacity > 1e-4 || contourOpacity > 1e-4) {
          gl_FragColor.rgb *= 1.0 + shadingOpacity * (shadedContours(1.0 - cp, 8.0, 1.0, 3.0, 1.0, g) - 0.5);

          gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0), g * contourOpacity);
        }
      }`,
      attributes: {
        coord: [-4, -4, 4, -4, 0, 4]
      },
      uniforms: {
        panelData: regl.prop('panelData'),
        vInf: regl.prop('vInf'),
        colorscale: regl.prop('colorscale'),
        contourOpacity: regl.prop('contourOpacity'),
        shadingOpacity: regl.prop('shadingOpacity'),
      },
      depth: {enable: false},
      count: 3
    });
  }

  let cachedCount = -1;
  let cachedCmd = null;
  return function (props) {
    if (cachedCount !== props.count || !cachedCmd) {
      cachedCmd = createCmd(props.count);
      cachedCount = props.count;
    }
    return cachedCmd(props);
  }
};
