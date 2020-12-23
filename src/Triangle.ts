import Point from './Point';

/**
 * Represents a triangle
 * @class
 */
export default class Triangle {
  a: Point;
  b: Point;
  c: Point;

  // alias for a, b, c
  p1: Point;
  p2: Point;
  p3: Point;

  color = 'black';
  stroke = 'black';

  private _centroid?: Point;

  /**
   * Triangle consists of three Points
   * @constructor
   * @param {Object} a
   * @param {Object} b
   * @param {Object} c
   */
  constructor(a: Point, b: Point, c: Point) {
    this.p1 = this.a = a;
    this.p2 = this.b = b;
    this.p3 = this.c = c;
  }

  // draw the triangle with differing edge colors optional
  render(
    imageData: ImageData | undefined,
    ctx: CanvasRenderingContext2D,
    color?: string | false,
    stroke?: string | false,
  ): void {
    ctx.beginPath();
    ctx.moveTo(this.a.x, this.a.y);
    ctx.lineTo(this.b.x, this.b.y);
    ctx.lineTo(this.c.x, this.c.y);
    ctx.closePath();
    ctx.strokeStyle = stroke || this.stroke || this.color;
    ctx.fillStyle = color || this.color;
    if (color !== false && stroke !== false) {
      // draw the stroke using the fill color first
      // so that the points of adjacent triangles
      // don’t overlap a bunch and look "starry"
      const tempStroke = ctx.strokeStyle;
      ctx.strokeStyle = ctx.fillStyle;
      ctx.stroke();
      ctx.strokeStyle = tempStroke;
    }
    if (imageData) {
      const gradient = ctx.createLinearGradient(
        this.minX(),
        this.minY(),
        this.maxX(),
        this.maxY(),
      );
      gradient.addColorStop(0, this.p1.canvasColorAtPoint(imageData));
      gradient.addColorStop(
        1,
        this.p3.getMidPoint(this.p2).canvasColorAtPoint(imageData),
      );
      ctx.fillStyle = gradient;
    }
    if (color !== false) {
      ctx.fill();
    }
    if (stroke !== false) {
      ctx.stroke();
    }
    ctx.closePath();
  }

  // random point inside triangle
  randomInside(): Point {
    const r1 = Math.random();
    const r2 = Math.random();
    const x =
      (1 - Math.sqrt(r1)) * this.p1.x +
      Math.sqrt(r1) * (1 - r2) * this.p2.x +
      Math.sqrt(r1) * r2 * this.p3.x;
    const y =
      (1 - Math.sqrt(r1)) * this.p1.y +
      Math.sqrt(r1) * (1 - r2) * this.p2.y +
      Math.sqrt(r1) * r2 * this.p3.y;
    return new Point(x, y);
  }

  colorAtCentroid(imageData: ImageData): string {
    return this.centroid().canvasColorAtPoint(imageData);
  }

  resetPointColors(): void {
    this.centroid().resetColor();
    this.p1.resetColor();
    this.p2.resetColor();
    this.p3.resetColor();
  }

  centroid(): Point {
    // only calc the centroid if we don’t already know it
    if (this._centroid) {
      return this._centroid;
    } else {
      const x = Math.round((this.p1.x + this.p2.x + this.p3.x) / 3);
      const y = Math.round((this.p1.y + this.p2.y + this.p3.y) / 3);
      this._centroid = new Point(x, y);

      return this._centroid;
    }
  }

  // http://stackoverflow.com/questions/13300904/determine-whether-point-lies-inside-triangle
  pointInTriangle(point: Point): boolean {
    const alpha =
      ((this.p2.y - this.p3.y) * (point.x - this.p3.x) +
        (this.p3.x - this.p2.x) * (point.y - this.p3.y)) /
      ((this.p2.y - this.p3.y) * (this.p1.x - this.p3.x) +
        (this.p3.x - this.p2.x) * (this.p1.y - this.p3.y));
    const beta =
      ((this.p3.y - this.p1.y) * (point.x - this.p3.x) +
        (this.p1.x - this.p3.x) * (point.y - this.p3.y)) /
      ((this.p2.y - this.p3.y) * (this.p1.x - this.p3.x) +
        (this.p3.x - this.p2.x) * (this.p1.y - this.p3.y));
    const gamma = 1.0 - alpha - beta;

    return alpha > 0 && beta > 0 && gamma > 0;
  }

  // scale points from [A, B] to [C, D]
  // xA => old x min, xB => old x max
  // yA => old y min, yB => old y max
  // xC => new x min, xD => new x max
  // yC => new y min, yD => new y max
  rescalePoints(
    xA: number,
    xB: number,
    yA: number,
    yB: number,
    xC: number,
    xD: number,
    yC: number,
    yD: number,
  ): void {
    this.p1.rescale(xA, xB, yA, yB, xC, xD, yC, yD);
    this.p2.rescale(xA, xB, yA, yB, xC, xD, yC, yD);
    this.p3.rescale(xA, xB, yA, yB, xC, xD, yC, yD);
    // recalculate the centroid
    this.centroid();
  }

  maxX(): number {
    return Math.max(this.p1.x, this.p2.x, this.p3.x);
  }

  maxY(): number {
    return Math.max(this.p1.y, this.p2.y, this.p3.y);
  }

  minX(): number {
    return Math.min(this.p1.x, this.p2.x, this.p3.x);
  }

  minY(): number {
    return Math.min(this.p1.y, this.p2.y, this.p3.y);
  }

  getPoints(): [Point, Point, Point] {
    return [this.p1, this.p2, this.p3];
  }
}
