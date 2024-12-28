export default function evaluate ({geometry: {x, y}, solutionVector}) {
  const n = x.length - 1;
  const kutta = solutionVector.shape[0] > n;
}
