export default function (regl) {
  return regl({
    vert: `
    precision highp float;
    uniform mat4 view;
    uniform float pointSize;
    attribute vec2 xy;
    void main () {
      if (xy.x < -100.) { gl_Position = vec4(1); return; }
      gl_Position = view * vec4(xy, 0, 1);
      gl_PointSize = pointSize + 1.0;
    }`,
    frag: `
    precision highp float;
    uniform float pointSize;
    uniform vec4 color;
    void main () {
      float r = length(gl_PointCoord.xy - 0.5) * 2.0 * (pointSize + 1.0);
      float alpha = smoothstep(pointSize + 1.0, pointSize - 1.0, r);
      gl_FragColor = vec4(color.rgb, alpha * color.a);
    }`,
    attributes: {
      xy: regl.prop('vertexBuffer')
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
    uniforms: {
      pointSize: ({pixelRatio}, {pointSize=20}={}) => pixelRatio * pointSize,
      color: regl.prop('color')
    },
    primitive: 'points',
    count: regl.prop('count'),
  });
}
