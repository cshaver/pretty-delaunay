import { rgbToHsla } from './utils/color';

/**
 * Represents a point
 * @class
 */
export default class Point {
  x: number;
  y: number;
  radius = 1;
  color = 'black';

  private _canvasColor?: string;
  /**
   * Point consists x and y
   * @constructor
   * @param {Number} x
   * @param {Number} y
   * or:
   * @param {Number[]} x
   * where x is length-2 array
   */
  constructor(x: [number, number]);
  constructor(x: number, y: number);
  constructor(x: [number, number] | number, y?: number) {
    if (Array.isArray(x)) {
      this.x = x[0];
      this.y = x[1];
    } else {
      this.x = x;
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      this.y = y!;
    }
  }

  // draw the point
  render(ctx: CanvasRenderingContext2D, color?: string): void {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI, false);
    ctx.fillStyle = color || this.color;
    ctx.fill();
    ctx.closePath();
  }

  // converts to string
  // returns something like:
  // "(X,Y)"
  // used in the pointMap to detect unique points
  toString(): string {
    return '(' + this.x + ',' + this.y + ')';
  }

  // grab the color of the canvas at the point
  // requires imagedata from canvas so we don’t grab
  // each point individually, which is really expensive
  canvasColorAtPoint(
    imageData: ImageData,
    colorSpace: 'hsla' | 'rgb' = 'hsla',
  ): string {
    // only find the canvas color if we don’t already know it
    if (!this._canvasColor) {
      // imageData array is flat, goes by rows then cols, four values per pixel
      const idx =
        Math.floor(this.y) * imageData.width * 4 + Math.floor(this.x) * 4;

      if (colorSpace === 'hsla') {
        this._canvasColor = rgbToHsla(
          Array.prototype.slice.call(imageData.data, idx, idx + 3) as [
            number,
            number,
            number,
          ],
        );
      } else {
        this._canvasColor =
          'rgb(' +
          Array.prototype.slice.call(imageData.data, idx, idx + 3).join() +
          ')';
      }
    }
    return this._canvasColor;
  }

  getCoords(): [number, number] {
    return [this.x, this.y];
  }

  // distance to another point
  getDistanceTo(point: Point): number {
    // √(x2−x1)^2+(y2−y1)^2
    return Math.sqrt(
      Math.pow(this.x - point.x, 2) + Math.pow(this.y - point.y, 2),
    );
  }

  // scale points from [A, B] to [C, D]
  // xA => old x min, xB => old x max
  // yA => old y min, yB => old y max
  // xC => new x min, xD => new x max
  // yC => new y min, yD => new y max
  rescale(
    xA: number,
    xB: number,
    yA: number,
    yB: number,
    xC: number,
    xD: number,
    yC: number,
    yD: number,
  ): void {
    // NewValue = (((OldValue - OldMin) * NewRange) / OldRange) + NewMin

    const xOldRange = xB - xA;
    const yOldRange = yB - yA;

    const xNewRange = xD - xC;
    const yNewRange = yD - yC;

    this.x = ((this.x - xA) * xNewRange) / xOldRange + xC;
    this.y = ((this.y - yA) * yNewRange) / yOldRange + yC;
  }

  resetColor(): void {
    this._canvasColor = undefined;
  }
}
