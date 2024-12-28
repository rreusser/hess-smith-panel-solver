export default function serializeGeometry ({x, y}) {
  const n = x.length;
  const lines = [];
  for (let i = 0; i < n; i++) {
    lines.push(`${x[i].toFixed(5)}, ${y[i].toFixed(5)}`);
  }
  return lines.join('\n');
}
