import {
  ortho as mat4ortho,
  create as mat4create,
  invert as mat4invert,
  rotateZ as mat4rotateZ,
  translate as mat4translate,
} from 'gl-mat4';

export default function (regl) {
  const view = mat4create();
  const viewInverse = mat4create();

  return regl({
    context: {
      view: ({viewportWidth, viewportHeight}, {alpha}) => {
        const aspect = viewportWidth / viewportHeight;
        const xrange = [-0.2, 1.2];
        mat4ortho(view,
          ...xrange,
          -(xrange[1] - xrange[0]) * 0.5 / aspect, (xrange[1] - xrange[0]) * 0.5 / aspect,
          -1, 1
        );
        mat4translate(view, view, [0.5, 0, 0]);
        mat4rotateZ(view, view, -alpha * Math.PI / 180);
        mat4translate(view, view, [-0.5, 0, 0]);
        return view;
      }
    },
    uniforms: {
      view: regl.context('view'),
      viewInverse: ({view}) => mat4invert(viewInverse, view)
    }
  });
}
