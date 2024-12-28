import {xUpper, xLower, yUpper, yLower} from 'naca-four-digit-airfoil';
import intersectLines from './intersect-lines.js';

export default function meshAirfoil ({count=20, m=0.04, p=0.4, t=0.12, c=1, closeEnd=false, clustering=true} = {}) {
  const x = [];
  const y = [];

  const mapping = clustering ? x => (2 * x**2 / (x**3 + 1)) : x => x;

  for (let i = 0; i < count + 1; i++) {
    const isUpper = i >= count / 2;
    const tUnscaled = isUpper ? (2 * i / count) : 2 * (1 - i / count);
    const s = mapping(Math.abs(1 - tUnscaled));
    x.push(isUpper ? xUpper(s, c, m, p, t) : xLower(s, c, m, p, t));
    y.push(isUpper ? yUpper(s, c, m, p, t) : yLower(s, c, m, p, t));
  }

  if (closeEnd) {
    const n = count;
    const [xe, ye] = intersectLines(
      x[0], y[0],
      x[1], y[1],
      x[n], y[n],
      x[n - 1], y[n - 1],
    );

    x.unshift(xe);
    y.unshift(ye);
    x.push(xe);
    y.push(ye);
  }

  return {x, y};
}
