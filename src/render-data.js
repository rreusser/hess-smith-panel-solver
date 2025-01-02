import earcut from 'earcut/dist/earcut.min.js';

export default class RenderData {
  constructor ({regl, count}) {
    this.regl = regl;

    this.count = 0;
    this.panelDataLength = 0;
    this.triFacesCount = 0;
    this.vertexBuffer = null;
    this.panelData = null;
    this.solidGeometryBuffer = null;
  }

  updateGeometry ({x, y}) {
    if (x.length !== y.length) throw new Error('Length mismatch');

    const numPanels = x.length - 1;
    const needsRealloc = numPanels !== this.count;
    this.count = numPanels;

    // Path, with two dummy points inserted on the ends for line end caps
    const pathData = new Float32Array((numPanels + 3) * 2).fill(-1000);
    for (let i = 0; i <= numPanels; i++) {
      pathData[2 * i + 2] = x[i];
      pathData[2 * i + 3] = y[i];
    }

    if (needsRealloc) {
      if (this.vertexBuffer) this.vertexBuffer.destroy();
      this.vertexBuffer = this.regl.buffer(pathData);
    } else {
      this.vertexBuffer.subdata(pathData);
    }

    // Mesh the path, excluding the dummy endpoints
    const triVerts = pathData.subarray(1 * 2, (numPanels + 2) * 2);
    const triFaces = earcut(triVerts);
    for (let i = 0; i < triFaces.length; i++) triFaces[i] += 1;

    const facesCount = triFaces.length;

    if (needsRealloc || facesCount !== this.triFacesCount) {
      if (this.triElementBuffer) this.triElementBuffer.destroy();
      this.triElementBuffer = this.regl.elements(triFaces);
    } else {
      this.triElementBuffer.subdata(triFaces);
    }
    this.triFacesCount = facesCount;
  }

  updateSolution ({x, y}, solutionVector) {
    const n = x.length - 1;

    const len = (n + 1) * 4;
    const needsRealloc = len !== this.panelDataLength;
    this.panelDataLength = len;

    const kutta = solutionVector.shape[0] > n;

    const data = new Float32Array((n + 1) * 4);
    for (let i = 0; i < n + 1; i++) {
      data[4 * i] = x[i];
      data[4 * i + 1] = y[i];
    }
    for (let i = 0; i < n; i++) {
      data[4 * (i + 1) + 2] = solutionVector.get(i);
      data[4 * (i + 1) + 3] = kutta ? solutionVector.get(n) : 0;
    }

    if (needsRealloc) {
      this.panelData = this.regl.texture({
        width: n + 1,
        height: 1,
        data,
        min: 'nearest',
        mag: 'nearest',
        wrapS: 'clamp',
        wrapT: 'clamp',
        format: 'rgba',
        type: 'float'
      });
    } else {
      this.panelData.subimage(data);
    }
  }
}
