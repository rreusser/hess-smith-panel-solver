import {
  create as mat3create,
  invert as mat3invert,
} from 'gl-mat3';
import {
  create as mat4create,
  rotateZ as mat4rotateZ,
  translate as mat4translate,
  invert as mat4invert,
} from 'gl-mat4';
import mat3fromLinearScales from './mat3-from-linear-scales.js';
import mat4fromMat3 from './mat4-from-mat3.js';

export default function createReglLinearScaleConfiguration(regl) {
  const matrices = {
    view3: mat3create(),
    inverseView3: mat3create(),
    view: mat4create(),
    inverseView: mat4create()
  };
  const command = regl({
    context: {
      view3: regl.prop("view3"),
      inverseView3: regl.prop("inverseView3"),
      view: regl.prop("view"),
      inverseView: regl.prop("inverseView")
    },
    uniforms: {
      view3: regl.prop("view3"),
      inverseView3: regl.prop("inverseView3"),
      view: regl.prop("view"),
      inverseView: regl.prop("inverseView")
    }
  });

  const out = function ({scales, center=[0.5, 0, 0], alpha}) {
    mat3fromLinearScales(matrices.view3, scales);

    mat3invert(matrices.inverseView3, matrices.view3);
    mat4fromMat3(matrices.view, matrices.view3);

    mat4translate(matrices.view, matrices.view, center);
    mat4rotateZ(matrices.view, matrices.view, -alpha * Math.PI / 180);
    mat4translate(matrices.view, matrices.view, center.map(x => -x));

    mat4invert(matrices.inverseView, matrices.view);

    return matrices;
  };

  out.invoke = command;
  return out;
}
