export default function (regl) {
  return regl({
    vert: `
    precision highp float;
    attribute vec2 coord;
    uniform mat4 inverseView;
    varying vec2 xy;
    void main () {
      vec4 uv = vec4(coord, 0, 1);
      xy = (inverseView * uv).xy;
      gl_Position = uv;
    }`,
    frag: (_, {count}) => `
    #extension GL_OES_standard_derivatives : enable
    precision highp float;
    varying vec2 xy;
    uniform sampler2D panelData, colorscale;
    uniform vec2 vInf;
    uniform float contourOpacity, shadingOpacity;

    const float pi = ${Math.PI};

    float grid (float parameter, float width, float feather) {
      float w1 = width - feather * 0.5;
      float d = fwidth(parameter);
      return smoothstep(d * (w1 + feather), d * w1, 0.5 - abs(mod(parameter, 1.0) - 0.5));
    }

    float hypot (vec2 z) {
      float x = abs(z.x);
      float y = abs(z.y);
      float t = min(x, y);
      x = max(x, y);
      t = t / x;
      return x * sqrt(1.0 + t * t);
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
        vec2 t = next.xy - prev.xy;
        float l = length(t);
        t /= l;
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
};
