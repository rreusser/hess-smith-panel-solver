import reglLines from 'regl-gpu-lines';

export default function (regl) {
  return reglLines(regl, {
    vert: `
    precision highp float;
    uniform mat4 view;

    #pragma lines: attribute vec2 xy;
    #pragma lines: position = getPosition(xy);
    vec4 getPosition(vec2 xy) {
      if (xy.x < -100.) return vec4(-1);
      return view * vec4(xy, 0, 1);
    }

    #pragma lines: width = getWidth();
    uniform float width;
    float getWidth() { return width; }
    `,
    frag: `
    precision lowp float;
    uniform vec4 color;
    void main () {
      gl_FragColor = color;
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
