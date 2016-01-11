var Point;

(function() {
  'use strict';

  var Color = Color || require('./color');

  /**
   * Represents a point
   * @class
   */
  class _Point {
    /**
     * Point consists x and y
     * @constructor
     * @param {Number} x
     * @param {Number} y
     * or:
     * @param {Number[]} x
     * where x is length-2 array
     */
    constructor(x, y) {
      if (Array.isArray(x)) {
        y = x[1];
        x = x[0];
      }
      this.x = x;
      this.y = y;
      this.radius = 1;
      this.color = 'black';
    }

    // draw the point
    render(ctx, color) {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI, false);
      ctx.fillStyle = color || this.color;
      ctx.fill();
      ctx.closePath();
    }

    // converts to string
    // returns something like:
    // "(X,Y)"
    // used in the pointmap to detect unique points
    toString() {
      return '(' + this.x + ',' + this.y + ')';
    }

    // grab the color of the canvas at the point
    // requires imagedata from canvas so we dont grab
    // each point individually, which is really expensive
    canvasColorAtPoint(imageData, colorSpace) {
      colorSpace = colorSpace || 'hsla';
      // only find the canvas color if we dont already know it
      if (!this._canvasColor) {
        // imageData array is flat, goes by rows then cols, four values per pixel
        var idx = (Math.floor(this.y) * imageData.width * 4) + (Math.floor(this.x) * 4);

        if (colorSpace === 'hsla') {
          this._canvasColor = Color.rgbToHsla(Array.prototype.slice.call(imageData.data, idx, idx + 4));
        } else {
          this._canvasColor = 'rgb(' + Array.prototype.slice.call(imageData.data, idx, idx + 3).join() + ')';
        }
      } else {
        return this._canvasColor;
      }
      return this._canvasColor;
    }

    getCoords() {
      return [this.x, this.y];
    }

    // distance to another point
    getDistanceTo(point) {
      // √(x2−x1)2+(y2−y1)2
      return Math.sqrt(Math.pow(this.x - point.x, 2) + Math.pow(this.y - point.y, 2));
    }

    // scale points from [A, B] to [C, D]
    // xA => old x min, xB => old x max
    // yA => old y min, yB => old y max
    // xC => new x min, xD => new x max
    // yC => new y min, yD => new y max
    rescale(xA, xB, yA, yB, xC, xD, yC, yD) {
      // NewValue = (((OldValue - OldMin) * NewRange) / OldRange) + NewMin

      var xOldRange = xB - xA;
      var yOldRange = yB - yA;

      var xNewRange = xD - xC;
      var yNewRange = yD - yC;

      this.x = (((this.x - xA) * xNewRange) / xOldRange) + xC;
      this.y = (((this.y - yA) * yNewRange) / yOldRange) + yC;
    }

    resetColor() {
      this._canvasColor = undefined;
    }
  }

  if (typeof module !== 'undefined') {
    module.exports = _Point;
  }

  Point = _Point;
})();
