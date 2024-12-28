import ndarray from 'ndarray';
import show from 'ndarray-show';
import solve from 'ndarray-linear-solve';
import lup from 'ndarray-lup-factorization';
import lupSolve from 'ndarray-lup-solve';
import computeWinding from './compute-winding.js';

export default function solveVortexPanel({geometry, kuttaCondition=true, vInf, alpha} = {}) {
  const {x, y} = geometry;
  const theta = [];
  const xi = [];
  const yi = [];

  const n = x.length - 1;

  // Precompute geometry data
  for (let i = 0; i < n; i++) {
    xi[i] = 0.5 * (x[i] + x[i + 1]);
    yi[i] = 0.5 * (y[i] + y[i + 1]);
    const ty = y[i + 1] - y[i];
    const tx = x[i + 1] - x[i];
    theta[i] = Math.atan2(ty, tx);
  }

  const dim = kuttaCondition ? n + 1 : n;
  const A = ndarray((new Array((dim)**2)).fill(0), [dim, dim]);
  const b = ndarray((new Array(dim)).fill(0), [dim]);
  const al = alpha * Math.PI / 180;

  const winding = computeWinding(x, y);

  for (let i = 0; i < n; i++) {
    const thi = theta[i];
    for (let j = 0; j < n; j++) {
      const rij = Math.sqrt((xi[i] - x[j])**2 + (yi[i] - y[j])**2);
      const rij1 = Math.sqrt((xi[i] - x[j+1])**2 + (yi[i] - y[j+1])**2);
      const thj = theta[j];

      let bij = Math.PI * winding;
      if (i !== j) {
        const dx1 = xi[i] - x[j];
        const dx2 = xi[i] - x[j + 1];
        const dy1 = yi[i] - y[j];
        const dy2 = yi[i] - y[j + 1];
        const det = dx1 * dy2 - dx2 * dy1;
        const dot = dx2 * dx1 + dy2 * dy1;
        bij = Math.atan2(det, dot);
      }

      const sij = Math.sin(thi - thj);
      const cij = Math.cos(thi - thj);
      const lij = Math.log(rij1 / rij);
      const c = 0.5 / Math.PI;

      A.set(i, j, c * (sij * lij + cij * bij));

      if (kuttaCondition) {
        A.set(i, n, A.get(i, n) + c * (cij * lij - sij * bij));
        if (i === 0 || i === n - 1) {
          A.set(n, j, A.get(n, j) + c * (sij * bij - cij * lij));
          A.set(n, n, A.get(n, n) + c * (sij * lij + cij * bij));
        }
      }
    }
    b.set(i, vInf * Math.sin(thi - al));
  }

  if (kuttaCondition) {
    b.set(n, -vInf * (Math.cos(theta[0] - al) + Math.cos(theta[n - 1] - al)));
  }

  const P = [];
  lup(A, A, P);
  lupSolve(A, A, P, b);

  return b;
}
