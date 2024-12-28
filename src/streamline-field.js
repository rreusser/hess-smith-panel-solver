import qrand from './quasirandom-2d.js';
import { transformMat4 as vec3transformMat4 } from 'gl-vec3';

export default class StreamlilneField {
  constructor ({regl, seedCount=1000}) {
    this.regl = regl;

    this.seeds = new Float32Array(2 * seedCount)
    this.seedBuffer = this.regl.buffer(this.seeds);
  }

  updateSeeds({matrices}) {
    const pt = [0, 0, 0];
    for (let i = 0; i < this.seeds.length; i+=2) {
      qrand(pt, i / 2);
      pt[0] = pt[0] * 2 - 1;
      pt[1] = pt[1] * 2 - 1;
      pt[2] = 0;
      vec3transformMat4(pt, pt, matrices.inverseView);

      this.seeds[i] = pt[0];
      this.seeds[i + 1] = pt[1];
    }
    this.seedBuffer.subdata(this.seeds);
  }
  
}
