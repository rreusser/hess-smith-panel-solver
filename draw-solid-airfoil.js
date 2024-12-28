export default function (regl) {
  return regl({
    vert: `
    precision highp float;
    uniform mat4 view;
    attribute vec2 xy;
    void main () {
      gl_Position = view * vec4(xy, 0, 1);
    }`,
    frag: `
    precision highp float;
    uniform vec4 color;
    void main () {
      gl_FragColor = color;
    }`,
    attributes: {
      xy: regl.prop('vertexBuffer'),
    },
    primitive: 'triangles',
    elements: regl.prop('triElementBuffer'),
    depth: {enable: false},
    cull: {enable: false},
    uniforms: {
      color: regl.prop('color')
    },
    blend: {
      enable: true,
      func: { srcRGB: 'src alpha', srcAlpha: 1, dstRGB: 'one minus src alpha', dstAlpha: 1 },
      equation: { rgb: 'add', alpha: 'add' },
    },
  });
}
