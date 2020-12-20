import Point from './point';

/**
 * Represents a triangle
 * @class
 */
export default class Triangle {
  /**
   * Triangle consists of three Points
   * @constructor
   * @param {Object} a
   * @param {Object} b
   * @param {Object} c
   */
  constructor(a, b, c) {
    this.p1 = this.a = a;
    this.p2 = this.b = b;
    this.p3 = this.c = c;

    this.color = 'black';
    this.stroke = 'black';
  }

  // draw the triangle with differing edge colors optional
  render(ctx, color, stroke) {
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
      // dont overlap a bunch and look "starry"
      var tempStroke = ctx.strokeStyle;
      ctx.strokeStyle = ctx.fillStyle;
      ctx.stroke();
      ctx.strokeStyle = tempStroke;
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
  randomInside() {
    var r1 = Math.random();
    var r2 = Math.random();
    var x = (1 - Math.sqrt(r1)) *
            this.p1.x + (Math.sqrt(r1) *
            (1 - r2)) *
            this.p2.x + (Math.sqrt(r1) * r2) *
            this.p3.x;
    var y = (1 - Math.sqrt(r1)) *
            this.p1.y + (Math.sqrt(r1) *
            (1 - r2)) *
            this.p2.y + (Math.sqrt(r1) * r2) *
            this.p3.y;
    return new Point(x, y);
  }

  colorAtCentroid(imageData) {
    return this.centroid().canvasColorAtPoint(imageData);
  }

  resetPointColors() {
    this.centroid().resetColor();
    this.p1.resetColor();
    this.p2.resetColor();
    this.p3.resetColor();
  }

  centroid() {
    // only calc the centroid if we dont already know it
    if (this._centroid) {
      return this._centroid;
    } else {
      var x = Math.round((this.p1.x + this.p2.x + this.p3.x) / 3);
      var y = Math.round((this.p1.y + this.p2.y + this.p3.y) / 3);
      this._centroid = new Point(x, y);

      return this._centroid;
    }
  }

  // http://stackoverflow.com/questions/13300904/determine-whether-point-lies-inside-triangle
  pointInTriangle(point) {
    var alpha = ((this.p2.y - this.p3.y) * (point.x - this.p3.x) + (this.p3.x - this.p2.x) * (point.y - this.p3.y)) /
              ((this.p2.y - this.p3.y) * (this.p1.x - this.p3.x) + (this.p3.x - this.p2.x) * (this.p1.y - this.p3.y));
    var beta = ((this.p3.y - this.p1.y) * (point.x - this.p3.x) + (this.p1.x - this.p3.x) * (point.y - this.p3.y)) /
             ((this.p2.y - this.p3.y) * (this.p1.x - this.p3.x) + (this.p3.x - this.p2.x) * (this.p1.y - this.p3.y));
    var gamma = 1.0 - alpha - beta;

    return (alpha > 0 && beta > 0 && gamma > 0);
  }

  // scale points from [A, B] to [C, D]
  // xA => old x min, xB => old x max
  // yA => old y min, yB => old y max
  // xC => new x min, xD => new x max
  // yC => new y min, yD => new y max
  rescalePoints(xA, xB, yA, yB, xC, xD, yC, yD) {
    this.p1.rescale(xA, xB, yA, yB, xC, xD, yC, yD);
    this.p2.rescale(xA, xB, yA, yB, xC, xD, yC, yD);
    this.p3.rescale(xA, xB, yA, yB, xC, xD, yC, yD);
    // recalculate the centroid
    this.centroid();
  }

  maxX() {
    return Math.max(this.p1.x, this.p2.x, this.p3.x);
  }

  maxY() {
    return Math.max(this.p1.y, this.p2.y, this.p3.y);
  }

  minX() {
    return Math.min(this.p1.x, this.p2.x, this.p3.x);
  }

  minY() {
    return Math.min(this.p1.y, this.p2.y, this.p3.y);
  }

  getPoints() {
    return [this.p1, this.p2, this.p3];
  }
}
