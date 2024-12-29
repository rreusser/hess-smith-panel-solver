export default function createEvaluator ({geometry: {x, y}, solution, alpha}) {
  const n = x.length - 1;
  const kutta = solution.shape[0] > n;

  const vxInf = 1.0 * Math.cos(alpha * Math.PI / 180);
  const vyInf = 1.0 * Math.sin(alpha * Math.PI / 180);
  const solutionData = solution.data;
  const gamma = kutta ? solution.get(n) : 0;

  return function ([px, py]) {
    let xPrev = x[0];
    let yPrev = y[0];
    let rxPrev = px - xPrev;
    let ryPrev = py - yPrev;
    let denPrev = 1.0 / (rxPrev * rxPrev + ryPrev * ryPrev);

    let vxInduced = 0.0;
    let vyInduced = 0.0;

    for (let i = 1; i <= n; i++) {
      const xNext = x[i];
      const yNext = y[i];

      const rxNext = px - xNext;
      const ryNext = py - yNext;

      let tx = xNext - xPrev;
      let ty = yNext - yPrev;
      const l = Math.sqrt(tx * tx + ty * ty);
      tx /= l;
      ty /= l;

      const denNext = rxNext * rxNext + ryNext * ryNext;

      const bij = Math.atan2(
        rxPrev * ryNext - rxNext * ryPrev,
        rxPrev * rxNext + ryPrev * ryNext
      );
      const lograt = 0.5 * Math.log(denNext * denPrev);
      const source = solutionData[i - 1];

      const c1 = lograt * tx + bij * ty;
      const c2 = lograt * ty - bij * tx;

      vxInduced -= source * c1 + gamma * c2;
      vyInduced -= source * c2 - gamma * c1;

      xPrev = xNext;
      yPrev = yNext;
      rxPrev = rxNext;
      ryPrev = ryNext;
      denPrev = 1.0 / denNext;
    }

    const vx = vxInf + (0.5 /  Math.PI) * vxInduced;
    const vy = vyInf + (0.5 /  Math.PI) * vyInduced;

    return [vx, vy];
  };
}
