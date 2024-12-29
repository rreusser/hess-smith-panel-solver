import qrand from './quasirandom-2d.js';
import { transformMat4 as vec3transformMat4 } from 'gl-vec3';

function isPointInPolygon(x, y, px, py) {
  if (x.length !== y.length || x.length < 3) {
    throw new Error("Input arrays must have the same length and contain at least 3 points.");
  }
  let inside = false;
  const n = x.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = x[i], yi = y[i];
    const xj = x[j], yj = y[j];
    const intersects = (yi > py) !== (yj > py) && (px < ((xj - xi) * (py - yi)) / (yj - yi) + xi);

    if (intersects) inside = !inside;
  }
  return inside;
}

export default class StreamlineField {
  constructor ({regl, seedCount=1000}) {
    this.regl = regl;

    this.seeds = new Float32Array(2 * seedCount)
    this.seedBuffer = this.regl.buffer(this.seeds);

    this.maxLength = 31;
    this.trajectoriesData = new Float32Array((seedCount * (this.maxLength + 1) + 1) * 3);
    this.trajectoriesBuffer = this.regl.buffer(this.trajectoriesData);
    this.renderCount = 0;
    
    this.updateSeeds();
  }

  updateSeeds({geometry, matrices} = {}) {
    const pt = [0, 0, 0];
    let ptr = 0;
    //const xclose = geometry.x.slice();
    //const yclose = geometry.y.slice();
    //xclose.push(xclose[0]);
    //yclose.push(yclose[0]);
    for (let i = 0; i < this.seeds.length; i+=2) {
      qrand(pt, i / 2);
      pt[0] = (pt[0] * 2 - 1) * 1.05 + Math.random() * 0.05;
      pt[1] = (pt[1] * 2 - 1) * 1.05 + Math.random() * 0.05;
      pt[2] = 0;
      //vec3transformMat4(pt, pt, matrices.inverseView);
      //if (isPointInPolygon(geometry.x, geometry.y, pt[0], pt[1])) continue;

      this.seeds[ptr++] = pt[0];
      this.seeds[ptr++] = pt[1];
    }
    //this.seeds[0] = 0.009;
    //this.seeds[1] = 0.0255;
    //this.seedCount = 1;
    this.seedCount = ptr / 2;
    this.seedBuffer.subdata(this.seeds);
  }

  /*
  integrate (evaluate, scaleFactor) {
    const t0 = performance.now();
    let ptr = 0;
    const p = [0, 0];
    const buf = new Float32Array(this.maxLength * 2);
    const nDir = Math.floor(this.maxLength - 1) / 2;
    for (let i = 0; i < this.seedCount; i++) {
      p[0] = this.seeds[2 * i];
      p[1] = this.seeds[2 * i + 1];

      let l;
      let vPrev = null;
      const dt = 0.02 / scaleFactor;

      buf[0] = p[0];
      buf[1] = p[1];
      let bptr = 2;

      for (let j = 0; j < nDir; j++) {
        let vel = evaluate(p);
        l = Math.sqrt(vel[0] * vel[0] + vel[1] * vel[1]);
        vel[0] /= l;
        vel[1] /= l;
        if (vPrev && vPrev[0] * vel[0] + vPrev[1] * vel[1] < 0.8) {
          break;
        }
        vPrev = vel;
        const xtmp = p[0] - vel[0] * dt * 0.5;
        const ytmp = p[1] - vel[1] * dt * 0.5;

        vel = evaluate([xtmp, ytmp]);
        l = Math.sqrt(vel[0] * vel[0] + vel[1] * vel[1]);
        vel[0] /= l;
        vel[1] /= l;
        if (vPrev && vPrev[0] * vel[0] + vPrev[1] * vel[1] < 0.8) {
          break;
        }
        vPrev = vel;

        p[0] -= vel[0] * dt;
        p[1] -= vel[1] * dt;

        buf[bptr++] = p[0];
        buf[bptr++] = p[1];
      }

      if (bptr) {
        this.trajectoriesData[ptr++] = -1000;
        this.trajectoriesData[ptr++] = -1000;
        this.trajectoriesData[ptr++] = -1000;
        for (let i = bptr - 2; i >= 0; i -= 2) {
          this.trajectoriesData[ptr++] = buf[i];
          this.trajectoriesData[ptr++] = buf[i + 1];
          this.trajectoriesData[ptr++] = Math.sqrt(Math.max(0, 1 - i / (bptr - 2)));
        }

        p[0] = this.seeds[2 * i];
        p[1] = this.seeds[2 * i + 1];

        vPrev = null;
        for (let j = 0; j < nDir; j++) {
          let vel = evaluate(p);
          l = Math.sqrt(vel[0] * vel[0] + vel[1] * vel[1]);
          vel[0] /= l;
          vel[1] /= l;
          if (vPrev && vPrev[0] * vel[0] + vPrev[1] * vel[1] < 0.8) break;
          vPrev = vel;
          const xtmp = p[0] + vel[0] * dt * 0.5;
          const ytmp = p[1] + vel[1] * dt * 0.5;

          vel = evaluate([xtmp, ytmp]);
          l = Math.sqrt(vel[0] * vel[0] + vel[1] * vel[1]);
          vel[0] /= l;
          vel[1] /= l;
          if (vPrev && vPrev[0] * vel[0] + vPrev[1] * vel[1] < 0.8) break;
          vPrev = vel;

          p[0] += vel[0] * dt;
          p[1] += vel[1] * dt;

          this.trajectoriesData[ptr++] = p[0];
          this.trajectoriesData[ptr++] = p[1];
          this.trajectoriesData[ptr++] = Math.sqrt(Math.max(0, 1 - j / (nDir - 1)));
        }
      }
    }
    this.trajectoriesData[ptr++] = -1000;
    this.trajectoriesData[ptr++] = -1000;
    this.trajectoriesData[ptr++] = -1000;
    this.trajectoriesBuffer.subdata(this.trajectoriesData);

    this.renderCount = ptr / 3;
    const t1 = performance.now();
  }
  */
}
