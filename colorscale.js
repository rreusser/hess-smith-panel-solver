import d3 from 'd3/dist/d3.min.js';

export default function lookupTable(interpolator, n = 256) {
  return d3.quantize(interpolator, n).map((c) => {
    return (c = d3.rgb(c)), [c.r, c.g, c.b, 255];
  });
}
