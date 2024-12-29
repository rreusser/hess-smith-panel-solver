import reglLines from 'regl-gpu-lines';

export default function (regl) {
  return reglLines(regl, {
    vert: `
    precision highp float;
    uniform mat4 view;

    #pragma lines: attribute vec3 xy;
    #pragma lines: position = getPosition(xy);
    #pragma lines: varying float alpha = getAlpha(xy);
    vec4 getPosition(vec3 xy) {
      if (xy.x < -100.) return vec4(0);
      return view * vec4(xy.xy, 0, 1);
    }
    float getAlpha(vec3 xy) {
      return xy.z;
    }

    #pragma lines: width = getWidth();
    uniform float width;
    float getWidth() { return width; }
    `,
    frag: `
    precision lowp float;
    uniform vec4 color;
    varying float alpha;
    varying vec3 lineCoord;
    void main () {
      gl_FragColor = color;
      gl_FragColor.a *= alpha * (1.0 - lineCoord.y * lineCoord.y);
    }
    `,
    uniforms: {
      color: regl.prop('color'),
      width: (ctx, props) => props.lineWidth * ctx.pixelRatio,
    },
    depth: {
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
  });
}
