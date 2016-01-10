(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"/Users/cshaver/Personal/pretty-delaunay/lib/_delaunay.js":[function(require,module,exports){
"use strict";

/* From https://github.com/ironwallaby/delaunay */
var Delaunay;

(function () {
  "use strict";

  var EPSILON = 1.0 / 1048576.0;

  function supertriangle(vertices) {
    var xmin = Number.POSITIVE_INFINITY,
        ymin = Number.POSITIVE_INFINITY,
        xmax = Number.NEGATIVE_INFINITY,
        ymax = Number.NEGATIVE_INFINITY,
        i,
        dx,
        dy,
        dmax,
        xmid,
        ymid;

    for (i = vertices.length; i--;) {
      if (vertices[i][0] < xmin) xmin = vertices[i][0];
      if (vertices[i][0] > xmax) xmax = vertices[i][0];
      if (vertices[i][1] < ymin) ymin = vertices[i][1];
      if (vertices[i][1] > ymax) ymax = vertices[i][1];
    }

    dx = xmax - xmin;
    dy = ymax - ymin;
    dmax = Math.max(dx, dy);
    xmid = xmin + dx * 0.5;
    ymid = ymin + dy * 0.5;

    return [[xmid - 20 * dmax, ymid - dmax], [xmid, ymid + 20 * dmax], [xmid + 20 * dmax, ymid - dmax]];
  }

  function circumcircle(vertices, i, j, k) {
    var x1 = vertices[i][0],
        y1 = vertices[i][1],
        x2 = vertices[j][0],
        y2 = vertices[j][1],
        x3 = vertices[k][0],
        y3 = vertices[k][1],
        fabsy1y2 = Math.abs(y1 - y2),
        fabsy2y3 = Math.abs(y2 - y3),
        xc,
        yc,
        m1,
        m2,
        mx1,
        mx2,
        my1,
        my2,
        dx,
        dy;

    /* Check for coincident points */
    if (fabsy1y2 < EPSILON && fabsy2y3 < EPSILON) throw new Error("Eek! Coincident points!");

    if (fabsy1y2 < EPSILON) {
      m2 = -((x3 - x2) / (y3 - y2));
      mx2 = (x2 + x3) / 2.0;
      my2 = (y2 + y3) / 2.0;
      xc = (x2 + x1) / 2.0;
      yc = m2 * (xc - mx2) + my2;
    } else if (fabsy2y3 < EPSILON) {
      m1 = -((x2 - x1) / (y2 - y1));
      mx1 = (x1 + x2) / 2.0;
      my1 = (y1 + y2) / 2.0;
      xc = (x3 + x2) / 2.0;
      yc = m1 * (xc - mx1) + my1;
    } else {
      m1 = -((x2 - x1) / (y2 - y1));
      m2 = -((x3 - x2) / (y3 - y2));
      mx1 = (x1 + x2) / 2.0;
      mx2 = (x2 + x3) / 2.0;
      my1 = (y1 + y2) / 2.0;
      my2 = (y2 + y3) / 2.0;
      xc = (m1 * mx1 - m2 * mx2 + my2 - my1) / (m1 - m2);
      yc = fabsy1y2 > fabsy2y3 ? m1 * (xc - mx1) + my1 : m2 * (xc - mx2) + my2;
    }

    dx = x2 - xc;
    dy = y2 - yc;
    return { i: i, j: j, k: k, x: xc, y: yc, r: dx * dx + dy * dy };
  }

  function dedup(edges) {
    var i, j, a, b, m, n;

    for (j = edges.length; j;) {
      b = edges[--j];
      a = edges[--j];

      for (i = j; i;) {
        n = edges[--i];
        m = edges[--i];

        if (a === m && b === n || a === n && b === m) {
          edges.splice(j, 2);
          edges.splice(i, 2);
          break;
        }
      }
    }
  }

  Delaunay = {
    triangulate: function triangulate(vertices, key) {
      var n = vertices.length,
          i,
          j,
          indices,
          st,
          open,
          closed,
          edges,
          dx,
          dy,
          a,
          b,
          c;

      /* Bail if there aren't enough vertices to form any triangles. */
      if (n < 3) return [];

      /* Slice out the actual vertices from the passed objects. (Duplicate the
       * array even if we don't, though, since we need to make a supertriangle
       * later on!) */
      vertices = vertices.slice(0);

      if (key) for (i = n; i--;) {
        vertices[i] = vertices[i][key];
      } /* Make an array of indices into the vertex array, sorted by the
         * vertices' x-position. */
      indices = new Array(n);

      for (i = n; i--;) {
        indices[i] = i;
      }indices.sort(function (i, j) {
        return vertices[j][0] - vertices[i][0];
      });

      /* Next, find the vertices of the supertriangle (which contains all other
       * triangles), and append them onto the end of a (copy of) the vertex
       * array. */
      st = supertriangle(vertices);
      vertices.push(st[0], st[1], st[2]);

      /* Initialize the open list (containing the supertriangle and nothing
       * else) and the closed list (which is empty since we havn't processed
       * any triangles yet). */
      open = [circumcircle(vertices, n + 0, n + 1, n + 2)];
      closed = [];
      edges = [];

      /* Incrementally add each vertex to the mesh. */
      for (i = indices.length; i--; edges.length = 0) {
        c = indices[i];

        /* For each open triangle, check to see if the current point is
         * inside it's circumcircle. If it is, remove the triangle and add
         * it's edges to an edge list. */
        for (j = open.length; j--;) {
          /* If this point is to the right of this triangle's circumcircle,
           * then this triangle should never get checked again. Remove it
           * from the open list, add it to the closed list, and skip. */
          dx = vertices[c][0] - open[j].x;
          if (dx > 0.0 && dx * dx > open[j].r) {
            closed.push(open[j]);
            open.splice(j, 1);
            continue;
          }

          /* If we're outside the circumcircle, skip this triangle. */
          dy = vertices[c][1] - open[j].y;
          if (dx * dx + dy * dy - open[j].r > EPSILON) continue;

          /* Remove the triangle and add it's edges to the edge list. */
          edges.push(open[j].i, open[j].j, open[j].j, open[j].k, open[j].k, open[j].i);
          open.splice(j, 1);
        }

        /* Remove any doubled edges. */
        dedup(edges);

        /* Add a new triangle for each edge. */
        for (j = edges.length; j;) {
          b = edges[--j];
          a = edges[--j];
          open.push(circumcircle(vertices, a, b, c));
        }
      }

      /* Copy any remaining open triangles to the closed list, and then
       * remove any triangles that share a vertex with the supertriangle,
       * building a list of triplets that represent triangles. */
      for (i = open.length; i--;) {
        closed.push(open[i]);
      }open.length = 0;

      for (i = closed.length; i--;) {
        if (closed[i].i < n && closed[i].j < n && closed[i].k < n) open.push(closed[i].i, closed[i].j, closed[i].k);
      } /* Yay, we're done! */
      return open;
    },
    contains: function contains(tri, p) {
      /* Bounding box test first, for quick rejections. */
      if (p[0] < tri[0][0] && p[0] < tri[1][0] && p[0] < tri[2][0] || p[0] > tri[0][0] && p[0] > tri[1][0] && p[0] > tri[2][0] || p[1] < tri[0][1] && p[1] < tri[1][1] && p[1] < tri[2][1] || p[1] > tri[0][1] && p[1] > tri[1][1] && p[1] > tri[2][1]) return null;

      var a = tri[1][0] - tri[0][0],
          b = tri[2][0] - tri[0][0],
          c = tri[1][1] - tri[0][1],
          d = tri[2][1] - tri[0][1],
          i = a * d - b * c;

      /* Degenerate tri. */
      if (i === 0.0) return null;

      var u = (d * (p[0] - tri[0][0]) - b * (p[1] - tri[0][1])) / i,
          v = (a * (p[1] - tri[0][1]) - c * (p[0] - tri[0][0])) / i;

      /* If we're outside the tri, fail. */
      if (u < 0.0 || v < 0.0 || u + v > 1.0) return null;

      return [u, v];
    }
  };

  if (typeof module !== "undefined") module.exports = Delaunay;
})();

},{}],"/Users/cshaver/Personal/pretty-delaunay/lib/color.js":[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Color;

(function () {
  'use strict';
  // color helper functions

  var _Color = function () {
    function _Color() {
      _classCallCheck(this, _Color);
    }

    _createClass(_Color, null, [{
      key: 'hexToRgba',
      value: function hexToRgba(hex) {
        hex = hex.replace('#', '');
        var r = parseInt(hex.substring(0, 2), 16);
        var g = parseInt(hex.substring(2, 4), 16);
        var b = parseInt(hex.substring(4, 6), 16);

        return 'rgba(' + r + ',' + g + ',' + b + ',1)';
      }
    }, {
      key: 'hexToRgbaArray',
      value: function hexToRgbaArray(hex) {
        hex = hex.replace('#', '');
        var r = parseInt(hex.substring(0, 2), 16);
        var g = parseInt(hex.substring(2, 4), 16);
        var b = parseInt(hex.substring(4, 6), 16);

        return [r, g, b];
      }

      /**
       * Converts an RGB color value to HSL. Conversion formula
       * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
       * Assumes r, g, and b are contained in the set [0, 255] and
       * returns h, s, and l in the set [0, 1].
       *
       * @param   Number  r       The red color value
       * @param   Number  g       The green color value
       * @param   Number  b       The blue color value
       * @return  Array           The HSL representation
       */

    }, {
      key: 'rgbToHsla',
      value: function rgbToHsla(rgb) {
        var r = rgb[0] / 255,
            g = rgb[1] / 255,
            b = rgb[2] / 255;
        var max = Math.max(r, g, b),
            min = Math.min(r, g, b);
        var h,
            s,
            l = (max + min) / 2;

        if (max === min) {
          h = s = 0; // achromatic
        } else {
            var d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
              case r:
                h = (g - b) / d + (g < b ? 6 : 0);break;
              case g:
                h = (b - r) / d + 2;break;
              case b:
                h = (r - g) / d + 4;break;
            }
            h /= 6;
          }

        return 'hsla(' + Math.round(h * 360) + ',' + Math.round(s * 100) + '%,' + Math.round(l * 100) + '%,1)';
      }
    }, {
      key: 'hslaAdjustAlpha',
      value: function hslaAdjustAlpha(color, alpha) {
        color = color.split(',');

        if (typeof alpha !== 'function') {
          color[3] = alpha;
        } else {
          color[3] = alpha(parseInt(color[3]));
        }

        color[3] += ')';
        return color.join(',');
      }
    }, {
      key: 'hslaAdjustLightness',
      value: function hslaAdjustLightness(color, lightness) {
        color = color.split(',');

        if (typeof lightness !== 'function') {
          color[2] = lightness;
        } else {
          color[2] = lightness(parseInt(color[2]));
        }

        color[2] += '%';
        return color.join(',');
      }
    }, {
      key: 'rgbToHex',
      value: function rgbToHex(rgb) {
        rgb = rgb.map(function (x) {
          x = parseInt(x).toString(16);
          return x.length === 1 ? '0' + x : x;
        });
        return rgb.join('');
      }
    }]);

    return _Color;
  }();

  if (typeof module !== 'undefined') {
    module.exports = _Color;
  }

  Color = _Color;
})();

},{}],"/Users/cshaver/Personal/pretty-delaunay/lib/point.js":[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Point;

(function () {
  'use strict';
  /**
   * Represents a point
   * @class
   */

  var _Point = function () {
    /**
     * Point consists x and y
     * @constructor
     * accepts either:
     * @param {Number} x
     * @param {Number} y
     * or:
     * @param {Number[]} x
     * where x is length-2 array
     */

    function _Point(x, y) {
      _classCallCheck(this, _Point);

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

    _createClass(_Point, [{
      key: 'render',
      value: function render(ctx, color) {
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

    }, {
      key: 'toString',
      value: function toString() {
        return '(' + this.x + ',' + this.y + ')';
      }

      // grab the color of the canvas at the point
      // requires imagedata from canvas so we dont grab
      // each point individually, which is really expensive

    }, {
      key: 'canvasColorAtPoint',
      value: function canvasColorAtPoint(imageData, colorSpace) {
        colorSpace = colorSpace || 'hsla';
        // only find the canvas color if we dont already know it
        if (!this._canvasColor) {
          // imageData array is flat, goes by rows then cols, four values per pixel
          var idx = Math.floor(this.y) * imageData.width * 4 + Math.floor(this.x) * 4;

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
    }, {
      key: 'getCoords',
      value: function getCoords() {
        return [this.x, this.y];
      }

      // distance to another point

    }, {
      key: 'getDistanceTo',
      value: function getDistanceTo(point) {
        // √(x2−x1)2+(y2−y1)2
        return Math.sqrt(Math.pow(this.x - point.x, 2) + Math.pow(this.y - point.y, 2));
      }

      // scale points from [A, B] to [C, D]
      // xA => old x min, xB => old x max
      // yA => old y min, yB => old y max
      // xC => new x min, xD => new x max
      // yC => new y min, yD => new y max

    }, {
      key: 'rescale',
      value: function rescale(xA, xB, yA, yB, xC, xD, yC, yD) {
        // NewValue = (((OldValue - OldMin) * NewRange) / OldRange) + NewMin

        var xOldRange = xB - xA;
        var yOldRange = yB - yA;

        var xNewRange = xD - xC;
        var yNewRange = yD - yC;

        this.x = (this.x - xA) * xNewRange / xOldRange + xC;
        this.y = (this.y - yA) * yNewRange / yOldRange + yC;
      }
    }]);

    return _Point;
  }();

  if (typeof module !== 'undefined') {
    module.exports = _Point;
  }

  Point = _Point;
})();

},{}],"/Users/cshaver/Personal/pretty-delaunay/lib/pointMap.js":[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var PointMap;

(function () {
  'use strict';
  /**
   * Represents a point
   * @class
   */

  var _PointMap = function () {
    function _PointMap() {
      _classCallCheck(this, _PointMap);

      this._map = {};
    }

    // adds point to map

    _createClass(_PointMap, [{
      key: 'add',
      value: function add(point) {
        this._map[point.toString()] = true;
      }

      // adds x, y coord to map

    }, {
      key: 'addCoord',
      value: function addCoord(x, y) {
        this.add(new Point(x, y));
      }

      // removes point from map

    }, {
      key: 'remove',
      value: function remove(point) {
        this._map[point.toString()] = false;
      }

      // removes x, y coord from map

    }, {
      key: 'removeCoord',
      value: function removeCoord(point) {
        this.remove(new Point(x, y));
      }

      // clears the map

    }, {
      key: 'clear',
      value: function clear() {
        this._map = {};
      }

      /**
       * determines if point has been
       * added to map already
       *  @returns {Boolean}
       */

    }, {
      key: 'exists',
      value: function exists(point) {
        return this._map[point.toString()] ? true : false;
      }
    }]);

    return _PointMap;
  }();

  if (typeof module !== 'undefined') {
    module.exports = _PointMap;
  }

  PointMap = _PointMap;
})();

},{}],"/Users/cshaver/Personal/pretty-delaunay/lib/pretty-delaunay.js":[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * TODO:
 *  - separate interface/demo functions and library itself
 *  - Animation - regen gradient and figure out vectors?
 *              - like if you have 2 grads, then gen 4 grads
 *              - 0a, 1a vector to 0b, 1b. 'fade' in 3b, 4b
 *  - will probably have to move this to an off-screen canvas
 *    (double check if this improves rendering speed at all first)
 *  - Num points slider
 *      - few  - some  - a lot
 */

(function () {
  'use strict';

  var Delaunay = require('./_delaunay');
  var Color = require('./color');
  var Random = require('./random');
  var Triangle = require('./triangle');
  var Point = require('./point');
  var PointMap = require('./pointMap');

  /**
   * Represents a delauney triangulation of random points
   * https://en.wikipedia.org/wiki/Delaunay_triangulation
   */

  var PrettyDelaunay = function () {
    /**
     * @constructor
     */

    function PrettyDelaunay(canvas, options) {
      var _this = this;

      _classCallCheck(this, PrettyDelaunay);

      // merge given options with defaults
      this.options = Object.assign({}, PrettyDelaunay.defaults(), options || {});

      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');

      this.resizeCanvas();
      this.points = [];
      this.colors = this.options.colors;
      this.pointMap = new PointMap();

      this.mousePosition = false;

      if (this.options.hover) {
        this.createShadowCanvas();

        this.canvas.addEventListener('mousemove', function (e) {
          var rect = canvas.getBoundingClientRect();
          _this.mousePosition = new Point(e.clientX - rect.left, e.clientY - rect.top);
          _this.hover();
        }, false);

        this.canvas.addEventListener('mouseout', function (e) {
          _this.mousePosition = false;
          _this.hover();
        }, false);
      }
    }

    _createClass(PrettyDelaunay, [{
      key: 'clear',
      value: function clear() {
        this.points = [];
        this.triangles = [];
        this.pointMap.clear();
        this.center = new Point(0, 0);
      }

      // clear and create a fresh set of random points
      // all args are optional

    }, {
      key: 'randomize',
      value: function randomize(min, max, minEdge, maxEdge, minGradients, maxGradients, colors) {
        // colors param is optional
        this.colors = colors || this.colors;

        this.resizeCanvas();

        this.generateNewPoints(min, max, minEdge, maxEdge);

        this.triangulate();

        this.generateGradients(minGradients, maxGradients);

        this.render();
      }

      // creates a hidden canvas for hover detection

    }, {
      key: 'createShadowCanvas',
      value: function createShadowCanvas() {
        this.shadowCanvas = document.createElement('canvas');
        this.canvas.parentElement.appendChild(this.shadowCanvas);
        this.shadowCtx = this.shadowCanvas.getContext('2d');

        this.shadowCanvas.style.display = 'none';
      }
    }, {
      key: 'generateNewPoints',
      value: function generateNewPoints(min, max, minEdge, maxEdge) {
        // defaults to generic number of points based on canvas dimensions
        // this generally looks pretty nice
        var area = this.canvas.width * this.canvas.height;
        var perimeter = (this.canvas.width + this.canvas.height) * 2;

        min = min > 0 ? Math.ceil(min) : Math.max(Math.ceil(area / 2500), 100);
        max = max > 0 ? Math.ceil(max) : Math.max(Math.ceil(area / 1000), 100);

        minEdge = minEdge > 0 ? Math.ceil(minEdge) : Math.max(Math.ceil(perimeter / 250), 10);
        maxEdge = maxEdge > 0 ? Math.ceil(maxEdge) : Math.max(Math.ceil(perimeter / 100), 10);

        this.numPoints = Random.randomBetween(min, max);
        this.getNumEdgePoints = Random.randomNumberFunction(minEdge, maxEdge);

        this.clear();

        // add corner and edge points
        this.generateCornerPoints();
        this.generateEdgePoints();

        // add some random points in the middle field,
        // excluding edges and corners
        this.generateRandomPoints(this.numPoints, 1, 1, this.width - 1, this.height - 1);
      }

      // add points in the corners

    }, {
      key: 'generateCornerPoints',
      value: function generateCornerPoints() {
        this.points.push(new Point(0, 0));
        this.points.push(new Point(0, this.height));
        this.points.push(new Point(this.width, 0));
        this.points.push(new Point(this.width, this.height));
      }

      // add points on the edges

    }, {
      key: 'generateEdgePoints',
      value: function generateEdgePoints() {
        // left edge
        this.generateRandomPoints(this.getNumEdgePoints(), 0, 0, 0, this.height);
        // right edge
        this.generateRandomPoints(this.getNumEdgePoints(), this.width, 0, 0, this.height);
        // bottom edge
        this.generateRandomPoints(this.getNumEdgePoints(), 0, this.height, this.width, 0);
        // top edge
        this.generateRandomPoints(this.getNumEdgePoints(), 0, 0, this.width, 0);
      }

      // randomly generate some points,
      // save the point closest to center

    }, {
      key: 'generateRandomPoints',
      value: function generateRandomPoints(numPoints, x, y, width, height) {
        var center = new Point(Math.round(canvas.width / 2), Math.round(canvas.height / 2));
        for (var i = 0; i < numPoints; i++) {
          var point;
          var j = 0;
          // generate a new point with random coords
          // re-generate the point if it already exists in pointmap (max 10 times)
          do {
            j++;
            point = new Point(Random.randomBetween(x, x + width), Random.randomBetween(y, y + height));
          } while (this.pointMap.exists(point) && j < 10);
          if (j < 10) {
            this.points.push(point);
            this.pointMap.add(point);
          }

          if (center.getDistanceTo(point) < center.getDistanceTo(this.center)) {
            this.center = point;
          } else {
            this.center.isCenter = false;
          }
        }

        this.center.isCenter = true;
      }

      // use the Delaunay algorithm to make
      // triangles out of our random points

    }, {
      key: 'triangulate',
      value: function triangulate() {
        this.triangles = [];

        // map point objects to length-2 arrays
        var vertices = this.points.map(function (point) {
          return point.getCoords();
        });

        // vertices is now an array such as:
        // [ [p1x, p1y], [p2x, p2y], [p3x, p3y], ... ]

        // do the algorithm
        var triangulated = Delaunay.triangulate(vertices);

        // returns 1 dimensional array arranged in triples such as:
        // [ t1a, t1b, t1c, t2a, t2b, t2c,.... ]
        // where t1a, etc are indeces in the vertices array
        // turn that into array of triangle points
        for (var i = 0; i < triangulated.length; i += 3) {
          var arr = [];
          arr.push(vertices[triangulated[i]]);
          arr.push(vertices[triangulated[i + 1]]);
          arr.push(vertices[triangulated[i + 2]]);
          this.triangles.push(arr);
        }

        // map to array of Triangle objects
        this.triangles = this.triangles.map(function (triangle) {
          return new Triangle(new Point(triangle[0]), new Point(triangle[1]), new Point(triangle[2]));
        });
      }

      // create random radial gradient circles for rendering later

    }, {
      key: 'generateGradients',
      value: function generateGradients(minGradients, maxGradients) {
        this.radialGradients = [];

        minGradients = minGradients > 0 ? minGradients : 1;
        maxGradients = maxGradients > 0 ? maxGradients : 2;

        this.numGradients = Random.randomBetween(minGradients, maxGradients);

        for (var i = 0; i < this.numGradients; i++) {
          this.generateRadialGradient();
        }
      }
    }, {
      key: 'generateRadialGradient',
      value: function generateRadialGradient() {
        /**
          * create a nice-looking but somewhat random gradient:
          * randomize the first circle
          * the second circle should be inside the first circle,
          * so we generate a point (origin2) inside cirle1
          * then calculate the dist between origin2 and the circumfrence of circle1
          * circle2's radius can be between 0 and this dist
          */

        var minX = Math.ceil(Math.sqrt(canvas.width));
        var maxX = Math.ceil(canvas.width - Math.sqrt(canvas.width));

        var minY = Math.ceil(Math.sqrt(canvas.height));
        var maxY = Math.ceil(canvas.height - Math.sqrt(canvas.height));

        var minRadius = Math.ceil(Math.max(canvas.height, canvas.width) / Math.max(Math.sqrt(this.numGradients), 2));
        var maxRadius = Math.ceil(Math.max(canvas.height, canvas.width) / Math.max(Math.log(this.numGradients), 1));

        // helper random functions
        var randomCanvasX = Random.randomNumberFunction(minX, maxX);
        var randomCanvasY = Random.randomNumberFunction(minY, maxY);
        var randomCanvasRadius = Random.randomNumberFunction(minRadius, maxRadius);

        // generate circle1 origin and radius
        var x0, y0;
        var r0 = randomCanvasRadius();

        // origin of the next circle should be contained
        // within the area of its predecessor
        if (this.radialGradients.length > 0) {
          var lastGradient = this.radialGradients[this.radialGradients.length - 1];
          var pointInLastCircle = Random.randomInCircle(lastGradient.r0, lastGradient.x0, lastGradient.y0);

          // origin must be within the bounds of the canvas
          while (pointInLastCircle.x < 0 || pointInLastCircle.y < 0 || pointInLastCircle.x > this.canvas.width || pointInLastCircle.y > this.canvas.height) {
            pointInLastCircle = Random.randomInCircle(lastGradient.r0, lastGradient.x0, lastGradient.y0);
          }
          x0 = pointInLastCircle.x;
          y0 = pointInLastCircle.y;
        } else {
          // first circle, just pick at random
          x0 = randomCanvasX();
          y0 = randomCanvasY();
        }

        // find a random point inside circle1
        // this is the origin of circle 2
        var pointInCircle = Random.randomInCircle(r0 * 0.09, x0, y0);

        // grab the x/y coords
        var x1 = pointInCircle.x;
        var y1 = pointInCircle.y;

        // find distance between the point and the circumfrience of circle1
        // the radius of the second circle will be a function of this distance
        var vX = x1 - x0;
        var vY = y1 - y0;
        var magV = Math.sqrt(vX * vX + vY * vY);
        var aX = x0 + vX / magV * r0;
        var aY = y0 + vY / magV * r0;

        var dist = Math.sqrt((x1 - aX) * (x1 - aX) + (y1 - aY) * (y1 - aY));

        // generate the radius of circle2 based on this distance
        var r1 = Random.randomBetween(1, Math.sqrt(dist));

        // random but nice looking color stop
        var colorStop = Random.randomBetween(2, 8) / 10;

        this.radialGradients.push({ x0: x0, y0: y0, r0: r0, x1: x1, y1: y1, r1: r1, colorStop: colorStop });
      }

      // sorts the points

    }, {
      key: 'sortPoints',
      value: function sortPoints() {
        // sort points
        this.points.sort(function (a, b) {
          // sort the point
          if (a.x < b.x) {
            return -1;
          } else if (a.x > b.x) {
            return 1;
          } else if (a.y < b.y) {
            return -1;
          } else if (a.y > b.y) {
            return 1;
          } else {
            return 0;
          }
        });
      }

      // size the canvas to the size of its parent
      // makes the canvas 'responsive'

    }, {
      key: 'resizeCanvas',
      value: function resizeCanvas() {
        var parent = this.canvas.parentElement;
        this.canvas.width = this.width = parent.offsetWidth;
        this.canvas.height = this.height = parent.offsetHeight;

        if (this.shadowCanvas) {
          this.shadowCanvas.width = this.width = parent.offsetWidth;
          this.shadowCanvas.height = this.height = parent.offsetHeight;
        }
      }

      // moves points/triangles based on new size of canvas

    }, {
      key: 'rescale',
      value: function rescale() {
        // grab old max/min from current canvas size
        var xMin = 0;
        var xMax = this.canvas.width;
        var yMin = 0;
        var yMax = this.canvas.height;

        this.resizeCanvas();

        if (this.options.resizeMode === 'scalePoints') {
          // scale all points to new max dimensions
          for (var i = 0; i < this.points.length; i++) {
            this.points[i].rescale(xMin, xMax, yMin, yMax, 0, this.canvas.width, 0, this.canvas.height);
          }
        } else {
          this.generateNewPoints();
        }

        this.triangulate();

        // rescale position of radial gradient circles
        for (var i = 0; i < this.radialGradients.length; i++) {
          var circle0 = new Point(this.radialGradients[i].x0, this.radialGradients[i].y0);
          var circle1 = new Point(this.radialGradients[i].x1, this.radialGradients[i].y1);

          circle0.rescale(xMin, xMax, yMin, yMax, 0, this.canvas.width, 0, this.canvas.height);
          circle1.rescale(xMin, xMax, yMin, yMax, 0, this.canvas.width, 0, this.canvas.height);

          this.radialGradients[i].x0 = circle0.x;
          this.radialGradients[i].y0 = circle0.y;
          this.radialGradients[i].x1 = circle1.x;
          this.radialGradients[i].y1 = circle1.y;
        }

        this.render();
      }
    }, {
      key: 'hover',
      value: function hover() {
        if (this.mousePosition) {
          var rgb = this.mousePosition.canvasColorAtPoint(this.shadowImageData, 'rgb').replace('rgb(', '').replace(')', '').split(',');
          var hex = Color.rgbToHex(rgb);
          var dec = parseInt(hex, 16);

          // is probably triangle with that index, but
          // edges can be fuzzy so double check
          if (dec >= 0 && dec < this.triangles.length && this.triangles[dec].pointInTriangle(this.mousePosition)) {
            // clear the last triangle
            this.resetTriangle();

            if (this.lastTriangle !== dec) {
              // render the hovered triangle
              this.options.onTriangleHover(this.triangles[dec], this.ctx, this.options);
            }

            this.lastTriangle = dec;
          }
        } else {
          this.resetTriangle();
        }
      }
    }, {
      key: 'resetTriangle',
      value: function resetTriangle() {
        // redraw the last triangle that was hovered over
        if (this.lastTriangle && this.lastTriangle >= 0 && this.lastTriangle < this.triangles.length) {
          var lastTriangle = this.triangles[this.lastTriangle];

          // find the bounding points of the last triangle
          // expand a bit for edges
          var minX = lastTriangle.minX() - 1;
          var minY = lastTriangle.minY() - 1;
          var maxX = lastTriangle.maxX() + 1;
          var maxY = lastTriangle.maxY() + 1;

          // reset that portion of the canvas to its original render
          this.ctx.putImageData(this.renderedImageData, 0, 0, minX, minY, maxX - minX, maxY - minY);

          this.lastTriangle = false;
        }
      }
    }, {
      key: 'render',
      value: function render() {
        // empty the canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.renderGradient();

        // get entire canvas image data of in a big typed array
        // this way we dont have to pick for each point individually
        // it's like 50x faster this way
        this.gradientImageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);

        // renders triangles, edges, and shadow canvas for hover detection
        this.renderTriangles(this.options.showTriangles, this.options.showEdges);

        this.renderExtras();

        this.renderedImageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);

        // throw events for light / dark text
        var centerColor = this.center.canvasColorAtPoint();

        if (parseInt(centerColor.split(',')[2]) < 50) {
          this.options.onDarkBackground(centerColor);
        } else {
          this.options.onLightBackground(centerColor);
        }
      }
    }, {
      key: 'renderExtras',
      value: function renderExtras() {
        if (this.options.showPoints) {
          this.renderPoints();
        }

        if (this.options.showCircles) {
          this.renderGradientCircles();
        }

        if (this.options.showCentroids) {
          this.renderCentroids();
        }
      }
    }, {
      key: 'renderNewColors',
      value: function renderNewColors(colors) {
        this.colors = colors || this.colors;
        // triangle centroids need new colors
        this.triangulate();
        this.render();
      }
    }, {
      key: 'renderNewGradient',
      value: function renderNewGradient(minGradients, maxGradients) {
        this.generateGradients(minGradients, maxGradients);
        this.triangulate();
        this.render();
      }
    }, {
      key: 'renderNewTriangles',
      value: function renderNewTriangles(min, max, minEdge, maxEdge) {
        this.generateNewPoints(min, max, minEdge, maxEdge);
        this.triangulate();
        this.render();
      }
    }, {
      key: 'renderGradient',
      value: function renderGradient() {
        for (var i = 0; i < this.radialGradients.length; i++) {
          // create the radial gradient based on
          // the generated circles' radii and origins
          var radialGradient = this.ctx.createRadialGradient(this.radialGradients[i].x0, this.radialGradients[i].y0, this.radialGradients[i].r0, this.radialGradients[i].x1, this.radialGradients[i].y1, this.radialGradients[i].r1);

          var outerColor = this.colors[2];

          // must be transparent version of middle color
          // this works for rgba and hsla
          if (i > 0) {
            outerColor = this.colors[1].split(',');
            outerColor[3] = '0)';
            outerColor = outerColor.join(',');
          }

          radialGradient.addColorStop(1, this.colors[0]);
          radialGradient.addColorStop(this.radialGradients[i].colorStop, this.colors[1]);
          radialGradient.addColorStop(0, outerColor);

          this.canvas.parentElement.style.backgroundColor = this.colors[2];

          this.ctx.fillStyle = radialGradient;
          this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
      }
    }, {
      key: 'renderTriangles',
      value: function renderTriangles(triangles, edges) {

        // save this for later
        this.center.canvasColorAtPoint(this.gradientImageData);

        for (var i = 0; i < this.triangles.length; i++) {
          // the color is determined by grabbing the color of the canvas
          // (where we drew the gradient) at the center of the triangle

          this.triangles[i].color = this.triangles[i].colorAtCentroid(this.gradientImageData);

          if (triangles && edges) {
            this.triangles[i].stroke = this.options.edgeColor(this.triangles[i].colorAtCentroid(this.gradientImageData));
            this.triangles[i].render(this.ctx);
          } else if (triangles) {
            // triangles only
            this.triangles[i].stroke = this.triangles[i].color;
            this.triangles[i].render(this.ctx);
          } else if (edges) {
            // edges only
            this.triangles[i].stroke = this.options.edgeColor(this.triangles[i].colorAtCentroid(this.gradientImageData));
            this.triangles[i].render(this.ctx, false);
          }

          if (this.shadowCanvas) {
            var color = '#' + ('000000' + i.toString(16)).slice(-6);
            this.triangles[i].render(this.shadowCtx, color, false);
          }
        }

        if (this.shadowCanvas) {
          this.shadowImageData = this.shadowCtx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        }
      }

      // renders the points of the triangles

    }, {
      key: 'renderPoints',
      value: function renderPoints() {
        for (var i = 0; i < this.points.length; i++) {
          this.points[i].render(this.ctx, this.options.pointColor(this.points[i].canvasColorAtPoint(this.gradientImageData)));
        }
      }

      // draws the circles that define the gradients

    }, {
      key: 'renderGradientCircles',
      value: function renderGradientCircles() {
        for (var i = 0; i < this.radialGradients.length; i++) {
          this.ctx.beginPath();
          this.ctx.arc(this.radialGradients[i].x0, this.radialGradients[i].y0, this.radialGradients[i].r0, 0, Math.PI * 2, true);
          this.ctx.strokeStyle = new Point(this.radialGradients[i].x0, this.radialGradients[i].y0).canvasColorAtPoint(this.gradientImageData);
          this.ctx.stroke();

          this.ctx.beginPath();
          this.ctx.arc(this.radialGradients[i].x1, this.radialGradients[i].y1, this.radialGradients[i].r1, 0, Math.PI * 2, true);
          this.ctx.strokeStyle = new Point(this.radialGradients[i].x1, this.radialGradients[i].y1).canvasColorAtPoint(this.gradientImageData);
          this.ctx.stroke();
        }
      }

      // render triangle centroids

    }, {
      key: 'renderCentroids',
      value: function renderCentroids() {
        for (var i = 0; i < this.triangles.length; i++) {
          this.triangles[i].centroid().render(this.ctx, this.options.centroidColor(this.triangles[i].colorAtCentroid(this.gradientImageData)));
        }
      }
    }, {
      key: 'toggleTriangles',
      value: function toggleTriangles() {
        this.options.showTriangles = !this.options.showTriangles;
        this.render();
      }
    }, {
      key: 'togglePoints',
      value: function togglePoints() {
        this.options.showPoints = !this.options.showPoints;
        this.render();
      }
    }, {
      key: 'toggleCircles',
      value: function toggleCircles() {
        this.options.showCircles = !this.options.showCircles;
        this.render();
      }
    }, {
      key: 'toggleCentroids',
      value: function toggleCentroids() {
        this.options.showCentroids = !this.options.showCentroids;
        this.render();
      }
    }, {
      key: 'toggleEdges',
      value: function toggleEdges() {
        this.options.showEdges = !this.options.showEdges;
        this.render();
      }
    }], [{
      key: 'defaults',
      value: function defaults() {
        return {
          showTriangles: true,
          showPoints: false,
          showCircles: false,
          showCentroids: false,
          showEdges: true,
          hover: true,

          colors: ['hsla(0, 0%, 100%, 1)', 'hsla(0, 0%, 50%, 1)', 'hsla(0, 0%, 0%, 1)'],

          resizeMode: 'scalePoints',
          // 'newPoints' - generates a new set of points for the new size
          // 'scalePoints' - linearly scales existing points and re-triangulates

          // events triggered when the center of the background
          // is greater or less than 50 lightness in hsla
          // intended to adjust some text that is on top
          onDarkBackground: function onDarkBackground(color) {
            return;
          },
          onLightBackground: function onLightBackground(color) {
            return;
          },

          // triggered when hovered over triangle
          onTriangleHover: function onTriangleHover(triangle, ctx, options) {
            var fill = options.hoverColor(triangle.color);
            var stroke = fill;
            triangle.render(ctx, options.showEdges ? fill : false, options.showEdges ? false : stroke);
          },

          // returns hsla color for triangle edge
          // as a function of the triangle fill color
          edgeColor: function edgeColor(color) {
            color = Color.hslaAdjustLightness(color, function (lightness) {
              return (lightness + 200 - lightness * 2) / 3;
            });
            color = Color.hslaAdjustAlpha(color, 0.25);
            return color;
          },

          // returns hsla color for triangle edge
          // as a function of the triangle fill color
          pointColor: function pointColor(color) {
            color = Color.hslaAdjustLightness(color, function (lightness) {
              return (lightness + 200 - lightness * 2) / 3;
            });
            color = Color.hslaAdjustAlpha(color, 1);
            return color;
          },

          // returns hsla color for triangle edge
          // as a function of the triangle fill color
          centroidColor: function centroidColor(color) {
            color = Color.hslaAdjustLightness(color, function (lightness) {
              return (lightness + 200 - lightness * 2) / 3;
            });
            color = Color.hslaAdjustAlpha(color, 0.25);
            return color;
          },

          // returns hsla color for triangle hover fill
          // as a function of the triangle fill color
          hoverColor: function hoverColor(color) {
            color = Color.hslaAdjustLightness(color, function (lightness) {
              return 100 - lightness;
            });
            color = Color.hslaAdjustAlpha(color, 0.5);
            return color;
          }
        };
      }
    }]);

    return PrettyDelaunay;
  }();

  window.PrettyDelaunay = PrettyDelaunay;
})();

},{"./_delaunay":"/Users/cshaver/Personal/pretty-delaunay/lib/_delaunay.js","./color":"/Users/cshaver/Personal/pretty-delaunay/lib/color.js","./point":"/Users/cshaver/Personal/pretty-delaunay/lib/point.js","./pointMap":"/Users/cshaver/Personal/pretty-delaunay/lib/pointMap.js","./random":"/Users/cshaver/Personal/pretty-delaunay/lib/random.js","./triangle":"/Users/cshaver/Personal/pretty-delaunay/lib/triangle.js"}],"/Users/cshaver/Personal/pretty-delaunay/lib/random.js":[function(require,module,exports){
'use strict';

var Random;

(function () {
  'use strict';
  // Random helper functions// random helper functions

  Random = {
    // hey look a closure
    // returns function for random numbers with pre-set max and min
    randomNumberFunction: function randomNumberFunction(max, min) {
      min = min || 0;
      if (min > max) {
        var temp = max;
        max = min;
        min = temp;
      }
      return function () {
        return Math.floor(Math.random() * (max - min + 1)) + min;
      };
    },

    // returns a random number
    // between the max and min
    randomBetween: function randomBetween(max, min) {
      min = min || 0;
      return Random.randomNumberFunction(max, min)();
    },

    randomInCircle: function randomInCircle(radius, ox, oy) {
      var angle = Math.random() * Math.PI * 2;
      var rad = Math.sqrt(Math.random()) * radius;
      var x = ox + rad * Math.cos(angle);
      var y = oy + rad * Math.sin(angle);

      return new Point(x, y);
    },

    randomRgba: function randomRgba() {
      return 'rgba(' + Random.randomBetween(255) + ',' + Random.randomBetween(255) + ',' + Random.randomBetween(255) + ', 1)';
    },

    randomHsla: function randomHsla() {
      return 'hsla(' + Random.randomBetween(360) + ',' + Random.randomBetween(100) + '%,' + Random.randomBetween(100) + '%, 1)';
    }
  };

  if (typeof module !== 'undefined') {
    module.exports = Random;
  }
})();

},{}],"/Users/cshaver/Personal/pretty-delaunay/lib/triangle.js":[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Triangle;

(function () {
  'use strict';
  /**
   * Represents a triangle
   * @class
   */

  var _Triangle = function () {
    /**
     * Triangle consists of three Points
     * @constructor
     * @param {Object} a
     * @param {Object} b
     * @param {Object} c
     */

    function _Triangle(a, b, c) {
      _classCallCheck(this, _Triangle);

      this.p1 = this.a = a;
      this.p2 = this.b = b;
      this.p3 = this.c = c;

      this.color = 'black';
      this.stroke = 'black';
    }

    // draw the triangle with differing edge colors optional

    _createClass(_Triangle, [{
      key: 'render',
      value: function render(ctx, color, stroke) {
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
          var stroke = ctx.strokeStyle;
          ctx.strokeStyle = ctx.fillStyle;
          ctx.stroke();
          ctx.strokeStyle = stroke;
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

    }, {
      key: 'randomInside',
      value: function randomInside() {
        var r1 = Math.random();
        var r2 = Math.random();
        var x = (1 - Math.sqrt(r1)) * this.p1.x + Math.sqrt(r1) * (1 - r2) * this.p2.x + Math.sqrt(r1) * r2 * this.p3.x;
        var y = (1 - Math.sqrt(r1)) * this.p1.y + Math.sqrt(r1) * (1 - r2) * this.p2.y + Math.sqrt(r1) * r2 * this.p3.y;
        return new Point(x, y);
      }
    }, {
      key: 'colorAtCentroid',
      value: function colorAtCentroid(imageData) {
        return this.centroid().canvasColorAtPoint(imageData);
      }
    }, {
      key: 'centroid',
      value: function centroid() {
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

    }, {
      key: 'pointInTriangle',
      value: function pointInTriangle(point) {
        var alpha = ((this.p2.y - this.p3.y) * (point.x - this.p3.x) + (this.p3.x - this.p2.x) * (point.y - this.p3.y)) / ((this.p2.y - this.p3.y) * (this.p1.x - this.p3.x) + (this.p3.x - this.p2.x) * (this.p1.y - this.p3.y));
        var beta = ((this.p3.y - this.p1.y) * (point.x - this.p3.x) + (this.p1.x - this.p3.x) * (point.y - this.p3.y)) / ((this.p2.y - this.p3.y) * (this.p1.x - this.p3.x) + (this.p3.x - this.p2.x) * (this.p1.y - this.p3.y));
        var gamma = 1.0 - alpha - beta;

        return alpha > 0 && beta > 0 && gamma > 0;
      }

      // scale points from [A, B] to [C, D]
      // xA => old x min, xB => old x max
      // yA => old y min, yB => old y max
      // xC => new x min, xD => new x max
      // yC => new y min, yD => new y max

    }, {
      key: 'rescalePoints',
      value: function rescalePoints(xA, xB, yA, yB, xC, xD, yC, yD) {
        this.p1.rescale(xA, xB, yA, yB, xC, xD, yC, yD);
        this.p2.rescale(xA, xB, yA, yB, xC, xD, yC, yD);
        this.p3.rescale(xA, xB, yA, yB, xC, xD, yC, yD);
        // recalculate the centroid
        this.centroid();
      }
    }, {
      key: 'maxX',
      value: function maxX() {
        return Math.max(this.p1.x, this.p2.x, this.p3.x);
      }
    }, {
      key: 'maxY',
      value: function maxY() {
        return Math.max(this.p1.y, this.p2.y, this.p3.y);
      }
    }, {
      key: 'minX',
      value: function minX() {
        return Math.min(this.p1.x, this.p2.x, this.p3.x);
      }
    }, {
      key: 'minY',
      value: function minY() {
        return Math.min(this.p1.y, this.p2.y, this.p3.y);
      }
    }, {
      key: 'getPoints',
      value: function getPoints() {
        return [this.p1, this.p2, this.p3];
      }
    }]);

    return _Triangle;
  }();

  if (typeof module !== 'undefined') {
    module.exports = _Triangle;
  }

  Triangle = _Triangle;
})();

},{}]},{},["/Users/cshaver/Personal/pretty-delaunay/lib/pretty-delaunay.js"])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJsaWIvX2RlbGF1bmF5LmpzIiwibGliL2NvbG9yLmpzIiwibGliL3BvaW50LmpzIiwibGliL3BvaW50TWFwLmpzIiwibGliL3ByZXR0eS1kZWxhdW5heS5qcyIsImxpYi9yYW5kb20uanMiLCJsaWIvdHJpYW5nbGUuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7QUNDQSxJQUFJLFFBQVEsQ0FBQzs7QUFFYixDQUFDLFlBQVc7QUFDVixjQUFZLENBQUM7O0FBRWIsTUFBSSxPQUFPLEdBQUcsR0FBRyxHQUFHLFNBQVMsQ0FBQzs7QUFFOUIsV0FBUyxhQUFhLENBQUMsUUFBUSxFQUFFO0FBQy9CLFFBQUksSUFBSSxHQUFHLE1BQU0sQ0FBQyxpQkFBaUI7UUFDL0IsSUFBSSxHQUFHLE1BQU0sQ0FBQyxpQkFBaUI7UUFDL0IsSUFBSSxHQUFHLE1BQU0sQ0FBQyxpQkFBaUI7UUFDL0IsSUFBSSxHQUFHLE1BQU0sQ0FBQyxpQkFBaUI7UUFDL0IsQ0FBQztRQUFFLEVBQUU7UUFBRSxFQUFFO1FBQUUsSUFBSTtRQUFFLElBQUk7UUFBRSxJQUFJLENBQUM7O0FBRWhDLFNBQUksQ0FBQyxHQUFHLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEdBQUk7QUFDOUIsVUFBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxFQUFFLElBQUksR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDaEQsVUFBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxFQUFFLElBQUksR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDaEQsVUFBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxFQUFFLElBQUksR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDaEQsVUFBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxFQUFFLElBQUksR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7S0FDakQ7O0FBRUQsTUFBRSxHQUFHLElBQUksR0FBRyxJQUFJLENBQUM7QUFDakIsTUFBRSxHQUFHLElBQUksR0FBRyxJQUFJLENBQUM7QUFDakIsUUFBSSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO0FBQ3hCLFFBQUksR0FBRyxJQUFJLEdBQUcsRUFBRSxHQUFHLEdBQUcsQ0FBQztBQUN2QixRQUFJLEdBQUcsSUFBSSxHQUFHLEVBQUUsR0FBRyxHQUFHLENBQUM7O0FBRXZCLFdBQU8sQ0FDTCxDQUFDLElBQUksR0FBRyxFQUFFLEdBQUcsSUFBSSxFQUFFLElBQUksR0FBUSxJQUFJLENBQUMsRUFDcEMsQ0FBQyxJQUFJLEVBQWMsSUFBSSxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUMsRUFDcEMsQ0FBQyxJQUFJLEdBQUcsRUFBRSxHQUFHLElBQUksRUFBRSxJQUFJLEdBQVEsSUFBSSxDQUFDLENBQ3JDLENBQUM7R0FDSDs7QUFFRCxXQUFTLFlBQVksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUU7QUFDdkMsUUFBSSxFQUFFLEdBQUcsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNuQixFQUFFLEdBQUcsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNuQixFQUFFLEdBQUcsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNuQixFQUFFLEdBQUcsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNuQixFQUFFLEdBQUcsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNuQixFQUFFLEdBQUcsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNuQixRQUFRLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDO1FBQzVCLFFBQVEsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUM7UUFDNUIsRUFBRTtRQUFFLEVBQUU7UUFBRSxFQUFFO1FBQUUsRUFBRTtRQUFFLEdBQUc7UUFBRSxHQUFHO1FBQUUsR0FBRztRQUFFLEdBQUc7UUFBRSxFQUFFO1FBQUUsRUFBRTs7O0FBQUMsQUFHL0MsUUFBRyxRQUFRLEdBQUcsT0FBTyxJQUFJLFFBQVEsR0FBRyxPQUFPLEVBQ3pDLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQzs7QUFFN0MsUUFBRyxRQUFRLEdBQUcsT0FBTyxFQUFFO0FBQ3JCLFFBQUUsR0FBSSxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQSxJQUFLLEVBQUUsR0FBRyxFQUFFLENBQUEsQ0FBQyxBQUFDLENBQUM7QUFDL0IsU0FBRyxHQUFHLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQSxHQUFJLEdBQUcsQ0FBQztBQUN0QixTQUFHLEdBQUcsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFBLEdBQUksR0FBRyxDQUFDO0FBQ3RCLFFBQUUsR0FBSSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUEsR0FBSSxHQUFHLENBQUM7QUFDdEIsUUFBRSxHQUFJLEVBQUUsSUFBSSxFQUFFLEdBQUcsR0FBRyxDQUFBLEFBQUMsR0FBRyxHQUFHLENBQUM7S0FDN0IsTUFFSSxJQUFHLFFBQVEsR0FBRyxPQUFPLEVBQUU7QUFDMUIsUUFBRSxHQUFJLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFBLElBQUssRUFBRSxHQUFHLEVBQUUsQ0FBQSxDQUFDLEFBQUMsQ0FBQztBQUMvQixTQUFHLEdBQUcsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFBLEdBQUksR0FBRyxDQUFDO0FBQ3RCLFNBQUcsR0FBRyxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUEsR0FBSSxHQUFHLENBQUM7QUFDdEIsUUFBRSxHQUFJLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQSxHQUFJLEdBQUcsQ0FBQztBQUN0QixRQUFFLEdBQUksRUFBRSxJQUFJLEVBQUUsR0FBRyxHQUFHLENBQUEsQUFBQyxHQUFHLEdBQUcsQ0FBQztLQUM3QixNQUVJO0FBQ0gsUUFBRSxHQUFJLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFBLElBQUssRUFBRSxHQUFHLEVBQUUsQ0FBQSxDQUFDLEFBQUMsQ0FBQztBQUMvQixRQUFFLEdBQUksRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUEsSUFBSyxFQUFFLEdBQUcsRUFBRSxDQUFBLENBQUMsQUFBQyxDQUFDO0FBQy9CLFNBQUcsR0FBRyxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUEsR0FBSSxHQUFHLENBQUM7QUFDdEIsU0FBRyxHQUFHLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQSxHQUFJLEdBQUcsQ0FBQztBQUN0QixTQUFHLEdBQUcsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFBLEdBQUksR0FBRyxDQUFDO0FBQ3RCLFNBQUcsR0FBRyxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUEsR0FBSSxHQUFHLENBQUM7QUFDdEIsUUFBRSxHQUFJLENBQUMsRUFBRSxHQUFHLEdBQUcsR0FBRyxFQUFFLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLENBQUEsSUFBSyxFQUFFLEdBQUcsRUFBRSxDQUFBLEFBQUMsQ0FBQztBQUNwRCxRQUFFLEdBQUksQUFBQyxRQUFRLEdBQUcsUUFBUSxHQUN4QixFQUFFLElBQUksRUFBRSxHQUFHLEdBQUcsQ0FBQSxBQUFDLEdBQUcsR0FBRyxHQUNyQixFQUFFLElBQUksRUFBRSxHQUFHLEdBQUcsQ0FBQSxBQUFDLEdBQUcsR0FBRyxDQUFDO0tBQ3pCOztBQUVELE1BQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDO0FBQ2IsTUFBRSxHQUFHLEVBQUUsR0FB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Q0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7O0FBQUEsQUFHckQsYUFBTyxJQUFJLENBQUM7S0FDYjtBQUNELFlBQVEsRUFBRSxrQkFBUyxHQUFHLEVBQUUsQ0FBQyxFQUFFOztBQUV6QixVQUFHLEFBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQ3hELENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxBQUFDLElBQ3pELENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxBQUFDLElBQ3pELENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxBQUFDLEVBQzNELE9BQU8sSUFBSSxDQUFDOztBQUVkLFVBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1VBQ3pCLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztVQUN6QixDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7VUFDekIsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1VBQ3pCLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDOzs7QUFBQyxBQUd0QixVQUFHLENBQUMsS0FBSyxHQUFHLEVBQ1YsT0FBTyxJQUFJLENBQUM7O0FBRWQsVUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQSxBQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUEsQUFBQyxDQUFBLEdBQUksQ0FBQztVQUN6RCxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQSxBQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUEsQUFBQyxD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QyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7QUFDOUMsWUFBSSxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7O0FBRTdELFlBQUksSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztBQUMvQyxZQUFJLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQzs7QUFFL0QsWUFBSSxTQUFTLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM1RyxZQUFJLFNBQVMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQzs7O0FBQUMsQUFHNUcsWUFBSSxhQUFhLEdBQUcsTUFBTSxDQUFDLG9CQUFvQixDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztBQUM1RCxZQUFJLGFBQWEsR0FBRyxNQUFNLENBQUMsb0JBQW9CLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO0FBQzVELFlBQUksa0JBQWtCLEdBQUcs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QSxJQUFHLEtBQUssQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUEsQUFBQyxDQUFBLElBQzdGLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUEsSUFBRyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQSxBQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQSxJQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBLEFBQUMsQ0FBQSxBQUFDLENBQUM7QUFDL0csWUFBSSxLQUFLLEdBQUcsR0FBRyxHQUFHLEtBQUssR0FBRyxJQUFJLENBQUM7O0FBRS9CLGVBQVEsS0FBSyxHQUFHLENBQUMsSUFBSSxJQUFJLEdBQUcsQ0FBQyxJQUFJLEtBQUssR0FBRyxDQUFDLENBQUU7T0FDN0M7Ozs7Ozs7Ozs7b0NBT2EsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRTtBQUM1QyxZQUFJLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7QUFDaEQsWUFBSSxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO0FBQ2hELFlBQUksQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUM7O0FBQUMsQUFFaEQsWUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO09BQ2pCOzs7NkJBRU07QUFDTCxlQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztPQUNsRDs7OzZCQUVNO0FBQ0wsZUFBTyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7T0FDbEQ7Ozs2QkFFTTtBQUNMLGVBQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO09BQ2xEOzs7NkJBRU07QUFDTCxlQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztPQUNsRDs7O2tDQUVXO0FBQ1YsZUFBTyxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7T0FDcEM7OztXQWpIRyxTQUFTOzs7QUFvSGYsTUFBSSxPQUFPLE1BQU0sS0FBSyxXQUFXLEVBQUU7QUFDakMsVUFBTSxDQUFDLE9BQU8sR0FBRyxTQUFTLENBQUM7R0FDNUI7O0FBRUQsVUFBUSxHQUFHLFNBQVMsQ0FBQztDQUN0QixDQUFBLEVBQUcsQ0FBQyIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvKiBGcm9tIGh0dHBzOi8vZ2l0aHViLmNvbS9pcm9ud2FsbGFieS9kZWxhdW5heSAqL1xudmFyIERlbGF1bmF5O1xuXG4oZnVuY3Rpb24oKSB7XG4gIFwidXNlIHN0cmljdFwiO1xuXG4gIHZhciBFUFNJTE9OID0gMS4wIC8gMTA0ODU3Ni4wO1xuXG4gIGZ1bmN0aW9uIHN1cGVydHJpYW5nbGUodmVydGljZXMpIHtcbiAgICB2YXIgeG1pbiA9IE51bWJlci5QT1NJVElWRV9JTkZJTklUWSxcbiAgICAgICAgeW1pbiA9IE51bWJlci5QT1NJVElWRV9JTkZJTklUWSxcbiAgICAgICAgeG1heCA9IE51bWJlci5ORUdBVElWRV9JTkZJTklUWSxcbiAgICAgICAgeW1heCA9IE51bWJlci5ORUdBVElWRV9JTkZJTklUWSxcbiAgICAgICAgaSwgZHgsIGR5LCBkbWF4LCB4bWlkLCB5bWlkO1xuXG4gICAgZm9yKGkgPSB2ZXJ0aWNlcy5sZW5ndGg7IGktLTsgKSB7XG4gICAgICBpZih2ZXJ0aWNlc1tpXVswXSA8IHhtaW4pIHhtaW4gPSB2ZXJ0aWNlc1tpXVswXTtcbiAgICAgIGlmKHZlcnRpY2VzW2ldWzBdID4geG1heCkgeG1heCA9IHZlcnRpY2VzW2ldWzBdO1xuICAgICAgaWYodmVydGljZXNbaV1bMV0gPCB5bWluKSB5bWluID0gdmVydGljZXNbaV1bMV07XG4gICAgICBpZih2ZXJ0aWNlc1tpXVsxXSA+IHltYXgpIHltYXggPSB2ZXJ0aWNlc1tpXVsxXTtcbiAgICB9XG5cbiAgICBkeCA9IHhtYXggLSB4bWluO1xuICAgIGR5ID0geW1heCAtIHltaW47XG4gICAgZG1heCA9IE1hdGgubWF4KGR4LCBkeSk7XG4gICAgeG1pZCA9IHhtaW4gKyBkeCAqIDAuNTtcbiAgICB5bWlkID0geW1pbiArIGR5ICogMC41O1xuXG4gICAgcmV0dXJuIFtcbiAgICAgIFt4bWlkIC0gMjAgKiBkbWF4LCB5bWlkIC0gICAgICBkbWF4XSxcbiAgICAgIFt4bWlkICAgICAgICAgICAgLCB5bWlkICsgMjAgKiBkbWF4XSxcbiAgICAgIFt4bWlkICsgMjAgKiBkbWF4LCB5bWlkIC0gICAgICBkbWF4XVxuICAgIF07XG4gIH1cblxuICBmdW5jdGlvbiBjaXJjdW1jaXJjbGUodmVydGljZXMsIGksIGosIGspIHtcbiAgICB2YXIgeDEgPSB2ZXJ0aWNlc1tpXVswXSxcbiAgICAgICAgeTEgPSB2ZXJ0aWNlc1tpXVsxXSxcbiAgICAgICAgeDIgPSB2ZXJ0aWNlc1tqXVswXSxcbiAgICAgICAgeTIgPSB2ZXJ0aWNlc1tqXVsxXSxcbiAgICAgICAgeDMgPSB2ZXJ0aWNlc1trXVswXSxcbiAgICAgICAgeTMgPSB2ZXJ0aWNlc1trXVsxXSxcbiAgICAgICAgZmFic3kxeTIgPSBNYXRoLmFicyh5MSAtIHkyKSxcbiAgICAgICAgZmFic3kyeTMgPSBNYXRoLmFicyh5MiAtIHkzKSxcbiAgICAgICAgeGMsIHljLCBtMSwgbTIsIG14MSwgbXgyLCBteTEsIG15MiwgZHgsIGR5O1xuXG4gICAgLyogQ2hlY2sgZm9yIGNvaW5jaWRlbnQgcG9pbnRzICovXG4gICAgaWYoZmFic3kxeTIgPCBFUFNJTE9OICYmIGZhYnN5MnkzIDwgRVBTSUxPTilcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkVlayEgQ29pbmNpZGVudCBwb2ludHMhXCIpO1xuXG4gICAgaWYoZmFic3kxeTIgPCBFUFNJTE9OKSB7XG4gICAgICBtMiAgPSAtKCh4MyAtIHgyKSAvICh5MyAtIHkyKSk7XG4gICAgICBteDIgPSAoeDIgKyB4MykgLyAyLjA7XG4gICAgICBteTIgPSAoeTIgKyB5MykgLyAyLjA7XG4gICAgICB4YyAgPSAoeDIgKyB4MSkgLyAyLjA7XG4gICAgICB5YyAgPSBtMiAqICh4YyAtIG14MikgKyBteTI7XG4gICAgfVxuXG4gICAgZWxzZSBpZihmYWJzeTJ5MyA8IEVQU0lMT04pIHtcbiAgICAgIG0xICA9IC0oKHgyIC0geDEpIC8gKHkyIC0geTEpKTtcbiAgICAgIG14MSA9ICh4MSArIHgyKSAvIDIuMDtcbiAgICAgIG15MSA9ICh5MSArIHkyKSAvIDIuMDtcbiAgICAgIHhjICA9ICh4MyArIHgyKSAvIDIuMDtcbiAgICAgIHljICA9IG0xICogKHhjIC0gbXgxKSArIG15MTtcbiAgICB9XG5cbiAgICBlbHNlIHtcbiAgICAgIG0xICA9IC0oKHgyIC0geDEpIC8gKHkyIC0geTEpKTtcbiAgICAgIG0yICA9IC0oKHgzIC0geDIpIC8gKHkzIC0geTIpKTtcbiAgICAgIG14MSA9ICh4MSArIHgyKSAvIDIuMDtcbiAgICAgIG14MiA9ICh4MiArIHgzKSAvIDIuMDtcbiAgICAgIG15MSA9ICh5MSArIHkyKSAvIDIuMDtcbiAgICAgIG15MiA9ICh5MiArIHkzKSAvIDIuMDtcbiAgICAgIHhjICA9IChtMSAqIG14MSAtIG0yICogbXgyICsgbXkyIC0gbXkxKSAvIChtMSAtIG0yKTtcbiAgICAgIHljICA9IChmYWJzeTF5MiA+IGZhYnN5MnkzKSA/XG4gICAgICAgIG0xICogKHhjIC0gbXgxKSArIG15MSA6XG4gICAgICAgIG0yICogKHhjIC0gbXgyKSArIG15MjtcbiAgICB9XG5cbiAgICBkeCA9IHgyIC0geGM7XG4gICAgZHkgPSB5MiAtIHljO1xuICAgIHJldHVybiB7aTogaSwgajogaiwgazogaywgeDogeGMsIHk6IHljLCByOiBkeCAqIGR4ICsgZHkgKiBkeX07XG4gIH1cblxuICBmdW5jdGlvbiBkZWR1cChlZGdlcykge1xuICAgIHZhciBpLCBqLCBhLCBiLCBtLCBuO1xuXG4gICAgZm9yKGogPSBlZGdlcy5sZW5ndGg7IGo7ICkge1xuICAgICAgYiA9IGVkZ2VzWy0tal07XG4gICAgICBhID0gZWRnZXNbLS1qXTtcblxuICAgICAgZm9yKGkgPSBqOyBpOyApIHtcbiAgICAgICAgbiA9IGVkZ2VzWy0taV07XG4gICAgICAgIG0gPSBlZGdlc1stLWldO1xuXG4gICAgICAgIGlmKChhID09PSBtICYmIGIgPT09IG4pIHx8IChhID09PSBuICYmIGIgPT09IG0pKSB7XG4gICAgICAgICAgZWRnZXMuc3BsaWNlKGosIDIpO1xuICAgICAgICAgIGVkZ2VzLnNwbGljZShpLCAyKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIERlbGF1bmF5ID0ge1xuICAgIHRyaWFuZ3VsYXRlOiBmdW5jdGlvbih2ZXJ0aWNlcywga2V5KSB7XG4gICAgICB2YXIgbiA9IHZlcnRpY2VzLmxlbmd0aCxcbiAgICAgICAgICBpLCBqLCBpbmRpY2VzLCBzdCwgb3BlbiwgY2xvc2VkLCBlZGdlcywgZHgsIGR5LCBhLCBiLCBjO1xuXG4gICAgICAvKiBCYWlsIGlmIHRoZXJlIGFyZW4ndCBlbm91Z2ggdmVydGljZXMgdG8gZm9ybSBhbnkgdHJpYW5nbGVzLiAqL1xuICAgICAgaWYobiA8IDMpXG4gICAgICAgIHJldHVybiBbXTtcblxuICAgICAgLyogU2xpY2Ugb3V0IHRoZSBhY3R1YWwgdmVydGljZXMgZnJvbSB0aGUgcGFzc2VkIG9iamVjdHMuIChEdXBsaWNhdGUgdGhlXG4gICAgICAgKiBhcnJheSBldmVuIGlmIHdlIGRvbid0LCB0aG91Z2gsIHNpbmNlIHdlIG5lZWQgdG8gbWFrZSBhIHN1cGVydHJpYW5nbGVcbiAgICAgICAqIGxhdGVyIG9uISkgKi9cbiAgICAgIHZlcnRpY2VzID0gdmVydGljZXMuc2xpY2UoMCk7XG5cbiAgICAgIGlmKGtleSlcbiAgICAgICAgZm9yKGkgPSBuOyBpLS07IClcbiAgICAgICAgICB2ZXJ0aWNlc1tpXSA9IHZlcnRpY2VzW2ldW2tleV07XG5cbiAgICAgIC8qIE1ha2UgYW4gYXJyYXkgb2YgaW5kaWNlcyBpbnRvIHRoZSB2ZXJ0ZXggYXJyYXksIHNvcnRlZCBieSB0aGVcbiAgICAgICAqIHZlcnRpY2VzJyB4LXBvc2l0aW9uLiAqL1xuICAgICAgaW5kaWNlcyA9IG5ldyBBcnJheShuKTtcblxuICAgICAgZm9yKGkgPSBuOyBpLS07IClcbiAgICAgICAgaW5kaWNlc1tpXSA9IGk7XG5cbiAgICAgIGluZGljZXMuc29ydChmdW5jdGlvbihpLCBqKSB7XG4gICAgICAgIHJldHVybiB2ZXJ0aWNlc1tqXVswXSAtIHZlcnRpY2VzW2ldWzBdO1xuICAgICAgfSk7XG5cbiAgICAgIC8qIE5leHQsIGZpbmQgdGhlIHZlcnRpY2VzIG9mIHRoZSBzdXBlcnRyaWFuZ2xlICh3aGljaCBjb250YWlucyBhbGwgb3RoZXJcbiAgICAgICAqIHRyaWFuZ2xlcyksIGFuZCBhcHBlbmQgdGhlbSBvbnRvIHRoZSBlbmQgb2YgYSAoY29weSBvZikgdGhlIHZlcnRleFxuICAgICAgICogYXJyYXkuICovXG4gICAgICBzdCA9IHN1cGVydHJpYW5nbGUodmVydGljZXMpO1xuICAgICAgdmVydGljZXMucHVzaChzdFswXSwgc3RbMV0sIHN0WzJdKTtcblxuICAgICAgLyogSW5pdGlhbGl6ZSB0aGUgb3BlbiBsaXN0IChjb250YWluaW5nIHRoZSBzdXBlcnRyaWFuZ2xlIGFuZCBub3RoaW5nXG4gICAgICAgKiBlbHNlKSBhbmQgdGhlIGNsb3NlZCBsaXN0ICh3aGljaCBpcyBlbXB0eSBzaW5jZSB3ZSBoYXZuJ3QgcHJvY2Vzc2VkXG4gICAgICAgKiBhbnkgdHJpYW5nbGVzIHlldCkuICovXG4gICAgICBvcGVuICAgPSBbY2lyY3VtY2lyY2xlKHZlcnRpY2VzLCBuICsgMCwgbiArIDEsIG4gKyAyKV07XG4gICAgICBjbG9zZWQgPSBbXTtcbiAgICAgIGVkZ2VzICA9IFtdO1xuXG4gICAgICAvKiBJbmNyZW1lbnRhbGx5IGFkZCBlYWNoIHZlcnRleCB0byB0aGUgbWVzaC4gKi9cbiAgICAgIGZvcihpID0gaW5kaWNlcy5sZW5ndGg7IGktLTsgZWRnZXMubGVuZ3RoID0gMCkge1xuICAgICAgICBjID0gaW5kaWNlc1tpXTtcblxuICAgICAgICAvKiBGb3IgZWFjaCBvcGVuIHRyaWFuZ2xlLCBjaGVjayB0byBzZWUgaWYgdGhlIGN1cnJlbnQgcG9pbnQgaXNcbiAgICAgICAgICogaW5zaWRlIGl0J3MgY2lyY3VtY2lyY2xlLiBJZiBpdCBpcywgcmVtb3ZlIHRoZSB0cmlhbmdsZSBhbmQgYWRkXG4gICAgICAgICAqIGl0J3MgZWRnZXMgdG8gYW4gZWRnZSBsaXN0LiAqL1xuICAgICAgICBmb3IoaiA9IG9wZW4ubGVuZ3RoOyBqLS07ICkge1xuICAgICAgICAgIC8qIElmIHRoaXMgcG9pbnQgaXMgdG8gdGhlIHJpZ2h0IG9mIHRoaXMgdHJpYW5nbGUncyBjaXJjdW1jaXJjbGUsXG4gICAgICAgICAgICogdGhlbiB0aGlzIHRyaWFuZ2xlIHNob3VsZCBuZXZlciBnZXQgY2hlY2tlZCBhZ2Fpbi4gUmVtb3ZlIGl0XG4gICAgICAgICAgICogZnJvbSB0aGUgb3BlbiBsaXN0LCBhZGQgaXQgdG8gdGhlIGNsb3NlZCBsaXN0LCBhbmQgc2tpcC4gKi9cbiAgICAgICAgICBkeCA9IHZlcnRpY2VzW2NdWzBdIC0gb3BlbltqXS54O1xuICAgICAgICAgIGlmKGR4ID4gMC4wICYmIGR4ICogZHggPiBvcGVuW2pdLnIpIHtcbiAgICAgICAgICAgIGNsb3NlZC5wdXNoKG9wZW5bal0pO1xuICAgICAgICAgICAgb3Blbi5zcGxpY2UoaiwgMSk7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvKiBJZiB3ZSdyZSBvdXRzaWRlIHRoZSBjaXJjdW1jaXJjbGUsIHNraXAgdGhpcyB0cmlhbmdsZS4gKi9cbiAgICAgICAgICBkeSA9IHZlcnRpY2VzW2NdWzFdIC0gb3BlbltqXS55O1xuICAgICAgICAgIGlmKGR4ICogZHggKyBkeSAqIGR5IC0gb3BlbltqXS5yID4gRVBTSUxPTilcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuXG4gICAgICAgICAgLyogUmVtb3ZlIHRoZSB0cmlhbmdsZSBhbmQgYWRkIGl0J3MgZWRnZXMgdG8gdGhlIGVkZ2UgbGlzdC4gKi9cbiAgICAgICAgICBlZGdlcy5wdXNoKFxuICAgICAgICAgICAgb3BlbltqXS5pLCBvcGVuW2pdLmosXG4gICAgICAgICAgICBvcGVuW2pdLmosIG9wZW5bal0uayxcbiAgICAgICAgICAgIG9wZW5bal0uaywgb3BlbltqXS5pXG4gICAgICAgICAgKTtcbiAgICAgICAgICBvcGVuLnNwbGljZShqLCAxKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8qIFJlbW92ZSBhbnkgZG91YmxlZCBlZGdlcy4gKi9cbiAgICAgICAgZGVkdXAoZWRnZXMpO1xuXG4gICAgICAgIC8qIEFkZCBhIG5ldyB0cmlhbmdsZSBmb3IgZWFjaCBlZGdlLiAqL1xuICAgICAgICBmb3IoaiA9IGVkZ2VzLmxlbmd0aDsgajsgKSB7XG4gICAgICAgICAgYiA9IGVkZ2VzWy0tal07XG4gICAgICAgICAgYSA9IGVkZ2VzWy0tal07XG4gICAgICAgICAgb3Blbi5wdXNoKGNpcmN1bWNpcmNsZSh2ZXJ0aWNlcywgYSwgYiwgYykpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8qIENvcHkgYW55IHJlbWFpbmluZyBvcGVuIHRyaWFuZ2xlcyB0byB0aGUgY2xvc2VkIGxpc3QsIGFuZCB0aGVuXG4gICAgICAgKiByZW1vdmUgYW55IHRyaWFuZ2xlcyB0aGF0IHNoYXJlIGEgdmVydGV4IHdpdGggdGhlIHN1cGVydHJpYW5nbGUsXG4gICAgICAgKiBidWlsZGluZyBhIGxpc3Qgb2YgdHJpcGxldHMgdGhhdCByZXByZXNlbnQgdHJpYW5nbGVzLiAqL1xuICAgICAgZm9yKGkgPSBvcGVuLmxlbmd0aDsgaS0tOyApXG4gICAgICAgIGNsb3NlZC5wdXNoKG9wZW5baV0pO1xuICAgICAgb3Blbi5sZW5ndGggPSAwO1xuXG4gICAgICBmb3IoaSA9IGNsb3NlZC5sZW5ndGg7IGktLTsgKVxuICAgICAgICBpZihjbG9zZWRbaV0uaSA8IG4gJiYgY2xvc2VkW2ldLmogPCBuICYmIGNsb3NlZFtpXS5rIDwgbilcbiAgICAgICAgICBvcGVuLnB1c2goY2xvc2VkW2ldLmksIGNsb3NlZFtpXS5qLCBjbG9zZWRbaV0uayk7XG5cbiAgICAgIC8qIFlheSwgd2UncmUgZG9uZSEgKi9cbiAgICAgIHJldHVybiBvcGVuO1xuICAgIH0sXG4gICAgY29udGFpbnM6IGZ1bmN0aW9uKHRyaSwgcCkge1xuICAgICAgLyogQm91bmRpbmcgYm94IHRlc3QgZmlyc3QsIGZvciBxdWljayByZWplY3Rpb25zLiAqL1xuICAgICAgaWYoKHBbMF0gPCB0cmlbMF1bMF0gJiYgcFswXSA8IHRyaVsxXVswXSAmJiBwWzBdIDwgdHJpWzJdWzBdKSB8fFxuICAgICAgICAgKHBbMF0gPiB0cmlbMF1bMF0gJiYgcFswXSA+IHRyaVsxXVswXSAmJiBwWzBdID4gdHJpWzJdWzBdKSB8fFxuICAgICAgICAgKHBbMV0gPCB0cmlbMF1bMV0gJiYgcFsxXSA8IHRyaVsxXVsxXSAmJiBwWzFdIDwgdHJpWzJdWzFdKSB8fFxuICAgICAgICAgKHBbMV0gPiB0cmlbMF1bMV0gJiYgcFsxXSA+IHRyaVsxXVsxXSAmJiBwWzFdID4gdHJpWzJdWzFdKSlcbiAgICAgICAgcmV0dXJuIG51bGw7XG5cbiAgICAgIHZhciBhID0gdHJpWzFdWzBdIC0gdHJpWzBdWzBdLFxuICAgICAgICAgIGIgPSB0cmlbMl1bMF0gLSB0cmlbMF1bMF0sXG4gICAgICAgICAgYyA9IHRyaVsxXVsxXSAtIHRyaVswXVsxXSxcbiAgICAgICAgICBkID0gdHJpWzJdWzFdIC0gdHJpWzBdWzFdLFxuICAgICAgICAgIGkgPSBhICogZCAtIGIgKiBjO1xuXG4gICAgICAvKiBEZWdlbmVyYXRlIHRyaS4gKi9cbiAgICAgIGlmKGkgPT09IDAuMClcbiAgICAgICAgcmV0dXJuIG51bGw7XG5cbiAgICAgIHZhciB1ID0gKGQgKiAocFswXSAtIHRyaVswXVswXSkgLSBiICogKHBbMV0gLSB0cmlbMF1bMV0pKSAvIGksXG4gICAgICAgICAgdiA9IChhICogKHBbMV0gLSB0cmlbMF1bMV0pIC0gYyAqIChwWzBdIC0gdHJpWzBdWzBdKSkgLyBpO1xuXG4gICAgICAvKiBJZiB3ZSdyZSBvdXRzaWRlIHRoZSB0cmksIGZhaWwuICovXG4gICAgICBpZih1IDwgMC4wIHx8IHYgPCAwLjAgfHwgKHUgKyB2KSA+IDEuMClcbiAgICAgICAgcmV0dXJuIG51bGw7XG5cbiAgICAgIHJldHVybiBbdSwgdl07XG4gICAgfVxuICB9O1xuXG4gIGlmKHR5cGVvZiBtb2R1bGUgIT09IFwidW5kZWZpbmVkXCIpXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBEZWxhdW5heTtcbn0pKCk7XG4iLCJ2YXIgQ29sb3I7XG5cbihmdW5jdGlvbigpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuICAvLyBjb2xvciBoZWxwZXIgZnVuY3Rpb25zXG4gIGNsYXNzIF9Db2xvciB7XG5cbiAgICBzdGF0aWMgaGV4VG9SZ2JhKGhleCkge1xuICAgICAgaGV4ID0gaGV4LnJlcGxhY2UoJyMnLCcnKTtcbiAgICAgIHZhciByID0gcGFyc2VJbnQoaGV4LnN1YnN0cmluZygwLDIpLCAxNik7XG4gICAgICB2YXIgZyA9IHBhcnNlSW50KGhleC5zdWJzdHJpbmcoMiw0KSwgMTYpO1xuICAgICAgdmFyIGIgPSBwYXJzZUludChoZXguc3Vic3RyaW5nKDQsNiksIDE2KTtcblxuICAgICAgcmV0dXJuICdyZ2JhKCcgKyByICsgJywnICsgZyArICcsJyArIGIgKyAnLDEpJztcbiAgICB9XG5cbiAgICBzdGF0aWMgaGV4VG9SZ2JhQXJyYXkoaGV4KSB7XG4gICAgICBoZXggPSBoZXgucmVwbGFjZSgnIycsJycpO1xuICAgICAgdmFyIHIgPSBwYXJzZUludChoZXguc3Vic3RyaW5nKDAsMiksIDE2KTtcbiAgICAgIHZhciBnID0gcGFyc2VJbnQoaGV4LnN1YnN0cmluZygyLDQpLCAxNik7XG4gICAgICB2YXIgYiA9IHBhcnNlSW50KGhleC5zdWJzdHJpbmcoNCw2KSwgMTYpO1xuXG4gICAgICByZXR1cm4gW3IsIGcsIGJdO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENvbnZlcnRzIGFuIFJHQiBjb2xvciB2YWx1ZSB0byBIU0wuIENvbnZlcnNpb24gZm9ybXVsYVxuICAgICAqIGFkYXB0ZWQgZnJvbSBodHRwOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0hTTF9jb2xvcl9zcGFjZS5cbiAgICAgKiBBc3N1bWVzIHIsIGcsIGFuZCBiIGFyZSBjb250YWluZWQgaW4gdGhlIHNldCBbMCwgMjU1XSBhbmRcbiAgICAgKiByZXR1cm5zIGgsIHMsIGFuZCBsIGluIHRoZSBzZXQgWzAsIDFdLlxuICAgICAqXG4gICAgICogQHBhcmFtICAgTnVtYmVyICByICAgICAgIFRoZSByZWQgY29sb3IgdmFsdWVcbiAgICAgKiBAcGFyYW0gICBOdW1iZXIgIGcgICAgICAgVGhlIGdyZWVuIGNvbG9yIHZhbHVlXG4gICAgICogQHBhcmFtICAgTnVtYmVyICBiICAgICAgIFRoZSBibHVlIGNvbG9yIHZhbHVlXG4gICAgICogQHJldHVybiAgQXJyYXkgICAgICAgICAgIFRoZSBIU0wgcmVwcmVzZW50YXRpb25cbiAgICAgKi9cbiAgICBzdGF0aWMgcmdiVG9Ic2xhKHJnYil7XG4gICAgICB2YXIgciA9IHJnYlswXS8yNTUsIGcgPSByZ2JbMV0vMjU1LCBiID0gcmdiWzJdLzI1NTtcbiAgICAgIHZhciBtYXggPSBNYXRoLm1heChyLCBnLCBiKSwgbWluID0gTWF0aC5taW4ociwgZywgYik7XG4gICAgICB2YXIgaCwgcywgbCA9IChtYXggKyBtaW4pIC8gMjtcblxuICAgICAgaWYgKG1heCA9PT0gbWluKXtcbiAgICAgICAgICBoID0gcyA9IDA7IC8vIGFjaHJvbWF0aWNcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICAgIHZhciBkID0gbWF4IC0gbWluO1xuICAgICAgICAgIHMgPSBsID4gMC41ID8gZCAvICgyIC0gbWF4IC0gbWluKSA6IGQgLyAobWF4ICsgbWluKTtcbiAgICAgICAgICBzd2l0Y2gobWF4KXtcbiAgICAgICAgICAgICAgY2FzZSByOiBoID0gKGcgLSBiKSAvIGQgKyAoZyA8IGIgPyA2IDogMCk7IGJyZWFrO1xuICAgICAgICAgICAgICBjYXNlIGc6IGggPSAoYiAtIHIpIC8gZCArIDI7IGJyZWFrO1xuICAgICAgICAgICAgICBjYXNlIGI6IGggPSAociAtIGcpIC8gZCArIDQ7IGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgICBoIC89IDY7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiAnaHNsYSgnICsgTWF0aC5yb3VuZChoKjM2MCkgKyAnLCcgKyBNYXRoLnJvdW5kKHMqMTAwKSArICclLCcgKyBNYXRoLnJvdW5kKGwqMTAwKSArICclLDEpJztcbiAgICB9XG5cbiAgICBzdGF0aWMgaHNsYUFkanVzdEFscGhhKGNvbG9yLCBhbHBoYSkge1xuICAgICAgY29sb3IgPSBjb2xvci5zcGxpdCgnLCcpO1xuXG4gICAgICBpZiAodHlwZW9mIGFscGhhICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIGNvbG9yWzNdID0gYWxwaGE7XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgY29sb3JbM10gPSBhbHBoYShwYXJzZUludChjb2xvclszXSkpO1xuICAgICAgfVxuXG4gICAgICBjb2xvclszXSArPSAnKSc7XG4gICAgICByZXR1cm4gY29sb3Iuam9pbignLCcpO1xuICAgIH1cblxuICAgIHN0YXRpYyBoc2xhQWRqdXN0TGlnaHRuZXNzKGNvbG9yLCBsaWdodG5lc3MpIHtcbiAgICAgIGNvbG9yID0gY29sb3Iuc3BsaXQoJywnKTtcblxuICAgICAgaWYgKHR5cGVvZiBsaWdodG5lc3MgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgY29sb3JbMl0gPSBsaWdodG5lc3M7XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgY29sb3JbMl0gPSBsaWdodG5lc3MocGFyc2VJbnQoY29sb3JbMl0pKTtcbiAgICAgIH1cblxuICAgICAgY29sb3JbMl0gKz0gJyUnO1xuICAgICAgcmV0dXJuIGNvbG9yLmpvaW4oJywnKTtcbiAgICB9XG5cbiAgICBzdGF0aWMgcmdiVG9IZXgocmdiKSB7XG4gICAgICByZ2IgPSByZ2IubWFwKGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgeCA9IHBhcnNlSW50KHgpLnRvU3RyaW5nKDE2KTtcbiAgICAgICAgcmV0dXJuICh4Lmxlbmd0aCA9PT0gMSkgPyAnMCcgKyB4IDogeDtcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIHJnYi5qb2luKCcnKTtcbiAgICB9XG5cbiAgfVxuXG4gIGlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gX0NvbG9yO1xuICB9XG5cbiAgQ29sb3IgPSBfQ29sb3I7XG59KSgpO1xuIiwidmFyIFBvaW50O1xuXG4oZnVuY3Rpb24oKSB7XG4gICd1c2Ugc3RyaWN0JztcbiAgLyoqXG4gICAqIFJlcHJlc2VudHMgYSBwb2ludFxuICAgKiBAY2xhc3NcbiAgICovXG4gIGNsYXNzIF9Qb2ludCB7XG4gICAgLyoqXG4gICAgICogUG9pbnQgY29uc2lzdHMgeCBhbmQgeVxuICAgICAqIEBjb25zdHJ1Y3RvclxuICAgICAqIGFjY2VwdHMgZWl0aGVyOlxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSB4XG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IHlcbiAgICAgKiBvcjpcbiAgICAgKiBAcGFyYW0ge051bWJlcltdfSB4XG4gICAgICogd2hlcmUgeCBpcyBsZW5ndGgtMiBhcnJheVxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKHgsIHkpIHtcbiAgICAgIGlmIChBcnJheS5pc0FycmF5KHgpKSB7XG4gICAgICAgIHkgPSB4WzFdO1xuICAgICAgICB4ID0geFswXTtcbiAgICAgIH1cbiAgICAgIHRoaXMueCA9IHg7XG4gICAgICB0aGlzLnkgPSB5O1xuICAgICAgdGhpcy5yYWRpdXMgPSAxO1xuICAgICAgdGhpcy5jb2xvciA9ICdibGFjayc7XG4gICAgfVxuXG4gICAgLy8gZHJhdyB0aGUgcG9pbnRcbiAgICByZW5kZXIoY3R4LCBjb2xvcikge1xuICAgICAgY3R4LmJlZ2luUGF0aCgpO1xuICAgICAgY3R4LmFyYyh0aGlzLngsIHRoaXMueSwgdGhpcy5yYWRpdXMsIDAsIDIgKiBNYXRoLlBJLCBmYWxzZSk7XG4gICAgICBjdHguZmlsbFN0eWxlID0gY29sb3IgfHwgdGhpcy5jb2xvcjtcbiAgICAgIGN0eC5maWxsKCk7XG4gICAgICBjdHguY2xvc2VQYXRoKCk7XG4gICAgfVxuXG5cbiAgICAvLyBjb252ZXJ0cyB0byBzdHJpbmdcbiAgICAvLyByZXR1cm5zIHNvbWV0aGluZyBsaWtlOlxuICAgIC8vIFwiKFgsWSlcIlxuICAgIC8vIHVzZWQgaW4gdGhlIHBvaW50bWFwIHRvIGRldGVjdCB1bmlxdWUgcG9pbnRzXG4gICAgdG9TdHJpbmcoKSB7XG4gICAgICByZXR1cm4gJygnICsgdGhpcy54ICsgJywnICsgdGhpcy55ICsgJyknIDtcbiAgICB9XG5cbiAgICAvLyBncmFiIHRoZSBjb2xvciBvZiB0aGUgY2FudmFzIGF0IHRoZSBwb2ludFxuICAgIC8vIHJlcXVpcmVzIGltYWdlZGF0YSBmcm9tIGNhbnZhcyBzbyB3ZSBkb250IGdyYWJcbiAgICAvLyBlYWNoIHBvaW50IGluZGl2aWR1YWxseSwgd2hpY2ggaXMgcmVhbGx5IGV4cGVuc2l2ZVxuICAgIGNhbnZhc0NvbG9yQXRQb2ludChpbWFnZURhdGEsIGNvbG9yU3BhY2UpIHtcbiAgICAgIGNvbG9yU3BhY2UgPSBjb2xvclNwYWNlIHx8ICdoc2xhJztcbiAgICAgIC8vIG9ubHkgZmluZCB0aGUgY2FudmFzIGNvbG9yIGlmIHdlIGRvbnQgYWxyZWFkeSBrbm93IGl0XG4gICAgICBpZiAoIXRoaXMuX2NhbnZhc0NvbG9yKSB7XG4gICAgICAgIC8vIGltYWdlRGF0YSBhcnJheSBpcyBmbGF0LCBnb2VzIGJ5IHJvd3MgdGhlbiBjb2xzLCBmb3VyIHZhbHVlcyBwZXIgcGl4ZWxcbiAgICAgICAgdmFyIGlkeCA9IChNYXRoLmZsb29yKHRoaXMueSkgKiBpbWFnZURhdGEud2lkdGggKiA0KSArIChNYXRoLmZsb29yKHRoaXMueCkgKiA0KTtcblxuICAgICAgICBpZiAoY29sb3JTcGFjZSA9PT0gJ2hzbGEnKSB7XG4gICAgICAgICAgdGhpcy5fY2FudmFzQ29sb3IgPSBDb2xvci5yZ2JUb0hzbGEoQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoaW1hZ2VEYXRhLmRhdGEsIGlkeCwgaWR4ICsgNCkpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIHRoaXMuX2NhbnZhc0NvbG9yID0gJ3JnYignICsgQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoaW1hZ2VEYXRhLmRhdGEsIGlkeCwgaWR4ICsgMykuam9pbigpICsgJyknO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2NhbnZhc0NvbG9yO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXMuX2NhbnZhc0NvbG9yO1xuICAgIH1cblxuICAgIGdldENvb3JkcygpIHtcbiAgICAgIHJldHVybiBbdGhpcy54LCB0aGlzLnldO1xuICAgIH1cblxuICAgIC8vIGRpc3RhbmNlIHRvIGFub3RoZXIgcG9pbnRcbiAgICBnZXREaXN0YW5jZVRvKHBvaW50KSB7XG4gICAgICAvLyDiiJooeDLiiJJ4MSkyKyh5MuKIknkxKTJcbiAgICAgIHJldHVybiBNYXRoLnNxcnQoTWF0aC5wb3codGhpcy54IC0gcG9pbnQueCwgMikgKyBNYXRoLnBvdyh0aGlzLnkgLSBwb2ludC55LCAyKSk7XG4gICAgfVxuXG4gICAgLy8gc2NhbGUgcG9pbnRzIGZyb20gW0EsIEJdIHRvIFtDLCBEXVxuICAgIC8vIHhBID0+IG9sZCB4IG1pbiwgeEIgPT4gb2xkIHggbWF4XG4gICAgLy8geUEgPT4gb2xkIHkgbWluLCB5QiA9PiBvbGQgeSBtYXhcbiAgICAvLyB4QyA9PiBuZXcgeCBtaW4sIHhEID0+IG5ldyB4IG1heFxuICAgIC8vIHlDID0+IG5ldyB5IG1pbiwgeUQgPT4gbmV3IHkgbWF4XG4gICAgcmVzY2FsZSh4QSwgeEIsIHlBLCB5QiwgeEMsIHhELCB5QywgeUQpIHtcbiAgICAgIC8vIE5ld1ZhbHVlID0gKCgoT2xkVmFsdWUgLSBPbGRNaW4pICogTmV3UmFuZ2UpIC8gT2xkUmFuZ2UpICsgTmV3TWluXG5cbiAgICAgIHZhciB4T2xkUmFuZ2UgPSB4QiAtIHhBO1xuICAgICAgdmFyIHlPbGRSYW5nZSA9IHlCIC0geUE7XG5cbiAgICAgIHZhciB4TmV3UmFuZ2UgPSB4RCAtIHhDO1xuICAgICAgdmFyIHlOZXdSYW5nZSA9IHlEIC0geUM7XG5cbiAgICAgIHRoaXMueCA9ICgoKHRoaXMueCAtIHhBKSAqIHhOZXdSYW5nZSkgLyB4T2xkUmFuZ2UpICsgeEM7XG4gICAgICB0aGlzLnkgPSAoKCh0aGlzLnkgLSB5QSkgKiB5TmV3UmFuZ2UpIC8geU9sZFJhbmdlKSArIHlDO1xuICAgIH1cbiAgfVxuXG4gIGlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gX1BvaW50O1xuICB9XG5cbiAgUG9pbnQgPSBfUG9pbnQ7XG59KSgpO1xuIiwidmFyIFBvaW50TWFwO1xuXG4oZnVuY3Rpb24oKSB7XG4gICd1c2Ugc3RyaWN0JztcbiAgLyoqXG4gICAqIFJlcHJlc2VudHMgYSBwb2ludFxuICAgKiBAY2xhc3NcbiAgICovXG4gIGNsYXNzIF9Qb2ludE1hcCB7XG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICB0aGlzLl9tYXAgPSB7fTtcbiAgICB9XG5cbiAgICAvLyBhZGRzIHBvaW50IHRvIG1hcFxuICAgIGFkZChwb2ludCkge1xuICAgICAgdGhpcy5fbWFwW3BvaW50LnRvU3RyaW5nKCldID0gdHJ1ZTtcbiAgICB9XG5cbiAgICAvLyBhZGRzIHgsIHkgY29vcmQgdG8gbWFwXG4gICAgYWRkQ29vcmQoeCwgeSkge1xuICAgICAgdGhpcy5hZGQobmV3IFBvaW50KHgsIHkpKTtcbiAgICB9XG5cbiAgICAvLyByZW1vdmVzIHBvaW50IGZyb20gbWFwXG4gICAgcmVtb3ZlKHBvaW50KSB7XG4gICAgICB0aGlzLl9tYXBbcG9pbnQudG9TdHJpbmcoKV0gPSBmYWxzZTtcbiAgICB9XG5cbiAgICAvLyByZW1vdmVzIHgsIHkgY29vcmQgZnJvbSBtYXBcbiAgICByZW1vdmVDb29yZChwb2ludCkge1xuICAgICAgdGhpcy5yZW1vdmUobmV3IFBvaW50KHgsIHkpKTtcbiAgICB9XG5cbiAgICAvLyBjbGVhcnMgdGhlIG1hcFxuICAgIGNsZWFyKCkge1xuICAgICAgdGhpcy5fbWFwID0ge307XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogZGV0ZXJtaW5lcyBpZiBwb2ludCBoYXMgYmVlblxuICAgICAqIGFkZGVkIHRvIG1hcCBhbHJlYWR5XG4gICAgICogIEByZXR1cm5zIHtCb29sZWFufVxuICAgICAqL1xuICAgIGV4aXN0cyhwb2ludCkge1xuICAgICAgcmV0dXJuIHRoaXMuX21hcFtwb2ludC50b1N0cmluZygpXSA/IHRydWUgOiBmYWxzZTtcbiAgICB9XG4gIH1cblxuICBpZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IF9Qb2ludE1hcDtcbiAgfVxuXG4gIFBvaW50TWFwID0gX1BvaW50TWFwO1xufSkoKTtcbiIsIi8qKlxuICogVE9ETzpcbiAqICAtIHNlcGFyYXRlIGludGVyZmFjZS9kZW1vIGZ1bmN0aW9ucyBhbmQgbGlicmFyeSBpdHNlbGZcbiAqICAtIEFuaW1hdGlvbiAtIHJlZ2VuIGdyYWRpZW50IGFuZCBmaWd1cmUgb3V0IHZlY3RvcnM/XG4gKiAgICAgICAgICAgICAgLSBsaWtlIGlmIHlvdSBoYXZlIDIgZ3JhZHMsIHRoZW4gZ2VuIDQgZ3JhZHNcbiAqICAgICAgICAgICAgICAtIDBhLCAxYSB2ZWN0b3IgdG8gMGIsIDFiLiAnZmFkZScgaW4gM2IsIDRiXG4gKiAgLSB3aWxsIHByb2JhYmx5IGhhdmUgdG8gbW92ZSB0aGlzIHRvIGFuIG9mZi1zY3JlZW4gY2FudmFzXG4gKiAgICAoZG91YmxlIGNoZWNrIGlmIHRoaXMgaW1wcm92ZXMgcmVuZGVyaW5nIHNwZWVkIGF0IGFsbCBmaXJzdClcbiAqICAtIE51bSBwb2ludHMgc2xpZGVyXG4gKiAgICAgIC0gZmV3ICAtIHNvbWUgIC0gYSBsb3RcbiAqL1xuXG4oZnVuY3Rpb24oKSB7XG4gICd1c2Ugc3RyaWN0JztcblxuICB2YXIgRGVsYXVuYXkgPSByZXF1aXJlKCcuL19kZWxhdW5heScpO1xuICB2YXIgQ29sb3IgPSByZXF1aXJlKCcuL2NvbG9yJyk7XG4gIHZhciBSYW5kb20gPSByZXF1aXJlKCcuL3JhbmRvbScpO1xuICB2YXIgVHJpYW5nbGUgPSByZXF1aXJlKCcuL3RyaWFuZ2xlJyk7XG4gIHZhciBQb2ludCA9IHJlcXVpcmUoJy4vcG9pbnQnKTtcbiAgdmFyIFBvaW50TWFwID0gcmVxdWlyZSgnLi9wb2ludE1hcCcpO1xuXG4gIC8qKlxuICAgKiBSZXByZXNlbnRzIGEgZGVsYXVuZXkgdHJpYW5ndWxhdGlvbiBvZiByYW5kb20gcG9pbnRzXG4gICAqIGh0dHBzOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0RlbGF1bmF5X3RyaWFuZ3VsYXRpb25cbiAgICovXG4gIGNsYXNzIFByZXR0eURlbGF1bmF5IHtcbiAgICAvKipcbiAgICAgKiBAY29uc3RydWN0b3JcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihjYW52YXMsIG9wdGlvbnMpIHtcbiAgICAgIC8vIG1lcmdlIGdpdmVuIG9wdGlvbnMgd2l0aCBkZWZhdWx0c1xuICAgICAgdGhpcy5vcHRpb25zID0gT2JqZWN0LmFzc2lnbih7fSwgUHJldHR5RGVsYXVuYXkuZGVmYXVsdHMoKSwgKG9wdGlvbnMgfHwge30pKTtcblxuICAgICAgdGhpcy5jYW52YXMgPSBjYW52YXM7XG4gICAgICB0aGlzLmN0eCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuXG4gICAgICB0aGlzLnJlc2l6ZUNhbnZhcygpO1xuICAgICAgdGhpcy5wb2ludHMgPSBbXTtcbiAgICAgIHRoaXMuY29sb3JzID0gdGhpcy5vcHRpb25zLmNvbG9ycztcbiAgICAgIHRoaXMucG9pbnRNYXAgPSBuZXcgUG9pbnRNYXAoKTtcblxuICAgICAgdGhpcy5tb3VzZVBvc2l0aW9uID0gZmFsc2U7XG5cbiAgICAgIGlmICh0aGlzLm9wdGlvbnMuaG92ZXIpIHtcbiAgICAgICAgdGhpcy5jcmVhdGVTaGFkb3dDYW52YXMoKTtcblxuICAgICAgICB0aGlzLmNhbnZhcy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCAoZSkgPT4ge1xuICAgICAgICAgIHZhciByZWN0ID0gY2FudmFzLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgICAgICAgIHRoaXMubW91c2VQb3NpdGlvbiA9IG5ldyBQb2ludChlLmNsaWVudFggLSByZWN0LmxlZnQsIGUuY2xpZW50WSAtIHJlY3QudG9wKTtcbiAgICAgICAgICB0aGlzLmhvdmVyKCk7XG4gICAgICAgIH0sIGZhbHNlKTtcblxuICAgICAgICB0aGlzLmNhbnZhcy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZW91dCcsIChlKSA9PiB7XG4gICAgICAgICAgdGhpcy5tb3VzZVBvc2l0aW9uID0gZmFsc2U7XG4gICAgICAgICAgdGhpcy5ob3ZlcigpO1xuICAgICAgICB9LCBmYWxzZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgc3RhdGljIGRlZmF1bHRzKCkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgc2hvd1RyaWFuZ2xlczogdHJ1ZSxcbiAgICAgICAgc2hvd1BvaW50czogZmFsc2UsXG4gICAgICAgIHNob3dDaXJjbGVzOiBmYWxzZSxcbiAgICAgICAgc2hvd0NlbnRyb2lkczogZmFsc2UsXG4gICAgICAgIHNob3dFZGdlczogdHJ1ZSxcbiAgICAgICAgaG92ZXI6IHRydWUsXG5cbiAgICAgICAgY29sb3JzOiBbJ2hzbGEoMCwgMCUsIDEwMCUsIDEpJywgJ2hzbGEoMCwgMCUsIDUwJSwgMSknLCAnaHNsYSgwLCAwJSwgMCUsIDEpJ10sXG5cbiAgICAgICAgcmVzaXplTW9kZTogJ3NjYWxlUG9pbnRzJyxcbiAgICAgICAgLy8gJ25ld1BvaW50cycgLSBnZW5lcmF0ZXMgYSBuZXcgc2V0IG9mIHBvaW50cyBmb3IgdGhlIG5ldyBzaXplXG4gICAgICAgIC8vICdzY2FsZVBvaW50cycgLSBsaW5lYXJseSBzY2FsZXMgZXhpc3RpbmcgcG9pbnRzIGFuZCByZS10cmlhbmd1bGF0ZXNcblxuICAgICAgICAvLyBldmVudHMgdHJpZ2dlcmVkIHdoZW4gdGhlIGNlbnRlciBvZiB0aGUgYmFja2dyb3VuZFxuICAgICAgICAvLyBpcyBncmVhdGVyIG9yIGxlc3MgdGhhbiA1MCBsaWdodG5lc3MgaW4gaHNsYVxuICAgICAgICAvLyBpbnRlbmRlZCB0byBhZGp1c3Qgc29tZSB0ZXh0IHRoYXQgaXMgb24gdG9wXG4gICAgICAgIG9uRGFya0JhY2tncm91bmQ6IGZ1bmN0aW9uKGNvbG9yKSB7IHJldHVybjsgfSxcbiAgICAgICAgb25MaWdodEJhY2tncm91bmQ6IGZ1bmN0aW9uKGNvbG9yKSB7IHJldHVybjsgfSxcblxuICAgICAgICAvLyB0cmlnZ2VyZWQgd2hlbiBob3ZlcmVkIG92ZXIgdHJpYW5nbGVcbiAgICAgICAgb25UcmlhbmdsZUhvdmVyOiBmdW5jdGlvbih0cmlhbmdsZSwgY3R4LCBvcHRpb25zKSB7XG4gICAgICAgICAgdmFyIGZpbGwgPSBvcHRpb25zLmhvdmVyQ29sb3IodHJpYW5nbGUuY29sb3IpO1xuICAgICAgICAgIHZhciBzdHJva2UgPSBmaWxsO1xuICAgICAgICAgIHRyaWFuZ2xlLnJlbmRlcihjdHgsIG9wdGlvbnMuc2hvd0VkZ2VzID8gZmlsbCA6IGZhbHNlLCBvcHRpb25zLnNob3dFZGdlcyA/IGZhbHNlIDogc3Ryb2tlKTtcbiAgICAgICAgfSxcblxuICAgICAgICAvLyByZXR1cm5zIGhzbGEgY29sb3IgZm9yIHRyaWFuZ2xlIGVkZ2VcbiAgICAgICAgLy8gYXMgYSBmdW5jdGlvbiBvZiB0aGUgdHJpYW5nbGUgZmlsbCBjb2xvclxuICAgICAgICBlZGdlQ29sb3I6IGZ1bmN0aW9uKGNvbG9yKSB7XG4gICAgICAgICAgY29sb3IgPSBDb2xvci5oc2xhQWRqdXN0TGlnaHRuZXNzKGNvbG9yLCBmdW5jdGlvbihsaWdodG5lc3MpIHtcbiAgICAgICAgICAgIHJldHVybiAobGlnaHRuZXNzICsgMjAwIC0gbGlnaHRuZXNzKjIpIC8gMztcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBjb2xvciA9IENvbG9yLmhzbGFBZGp1c3RBbHBoYShjb2xvciwgMC4yNSk7XG4gICAgICAgICAgcmV0dXJuIGNvbG9yO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8vIHJldHVybnMgaHNsYSBjb2xvciBmb3IgdHJpYW5nbGUgZWRnZVxuICAgICAgICAvLyBhcyBhIGZ1bmN0aW9uIG9mIHRoZSB0cmlhbmdsZSBmaWxsIGNvbG9yXG4gICAgICAgIHBvaW50Q29sb3I6IGZ1bmN0aW9uKGNvbG9yKSB7XG4gICAgICAgICAgY29sb3IgPSBDb2xvci5oc2xhQWRqdXN0TGlnaHRuZXNzKGNvbG9yLCBmdW5jdGlvbihsaWdodG5lc3MpIHtcbiAgICAgICAgICAgIHJldHVybiAobGlnaHRuZXNzICsgMjAwIC0gbGlnaHRuZXNzKjIpIC8gMztcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBjb2xvciA9IENvbG9yLmhzbGFBZGp1c3RBbHBoYShjb2xvciwgMSk7XG4gICAgICAgICAgcmV0dXJuIGNvbG9yO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8vIHJldHVybnMgaHNsYSBjb2xvciBmb3IgdHJpYW5nbGUgZWRnZVxuICAgICAgICAvLyBhcyBhIGZ1bmN0aW9uIG9mIHRoZSB0cmlhbmdsZSBmaWxsIGNvbG9yXG4gICAgICAgIGNlbnRyb2lkQ29sb3I6IGZ1bmN0aW9uKGNvbG9yKSB7XG4gICAgICAgICAgY29sb3IgPSBDb2xvci5oc2xhQWRqdXN0TGlnaHRuZXNzKGNvbG9yLCBmdW5jdGlvbihsaWdodG5lc3MpIHtcbiAgICAgICAgICAgIHJldHVybiAobGlnaHRuZXNzICsgMjAwIC0gbGlnaHRuZXNzKjIpIC8gMztcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBjb2xvciA9IENvbG9yLmhzbGFBZGp1c3RBbHBoYShjb2xvciwgMC4yNSk7XG4gICAgICAgICAgcmV0dXJuIGNvbG9yO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8vIHJldHVybnMgaHNsYSBjb2xvciBmb3IgdHJpYW5nbGUgaG92ZXIgZmlsbFxuICAgICAgICAvLyBhcyBhIGZ1bmN0aW9uIG9mIHRoZSB0cmlhbmdsZSBmaWxsIGNvbG9yXG4gICAgICAgIGhvdmVyQ29sb3I6IGZ1bmN0aW9uKGNvbG9yKSB7XG4gICAgICAgICAgY29sb3IgPSBDb2xvci5oc2xhQWRqdXN0TGlnaHRuZXNzKGNvbG9yLCBmdW5jdGlvbihsaWdodG5lc3MpIHtcbiAgICAgICAgICAgIHJldHVybiAxMDAgLSBsaWdodG5lc3M7XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgY29sb3IgPSBDb2xvci5oc2xhQWRqdXN0QWxwaGEoY29sb3IsIDAuNSk7XG4gICAgICAgICAgcmV0dXJuIGNvbG9yO1xuICAgICAgICB9LFxuICAgICAgfVxuICAgIH1cblxuICAgIGNsZWFyKCkge1xuICAgICAgdGhpcy5wb2ludHMgPSBbXTtcbiAgICAgIHRoaXMudHJpYW5nbGVzID0gW107XG4gICAgICB0aGlzLnBvaW50TWFwLmNsZWFyKCk7XG4gICAgICB0aGlzLmNlbnRlciA9IG5ldyBQb2ludCgwLCAwKTtcbiAgICB9XG5cbiAgICAvLyBjbGVhciBhbmQgY3JlYXRlIGEgZnJlc2ggc2V0IG9mIHJhbmRvbSBwb2ludHNcbiAgICAvLyBhbGwgYXJncyBhcmUgb3B0aW9uYWxcbiAgICByYW5kb21pemUobWluLCBtYXgsIG1pbkVkZ2UsIG1heEVkZ2UsIG1pbkdyYWRpZW50cywgbWF4R3JhZGllbnRzLCBjb2xvcnMpIHtcbiAgICAgIC8vIGNvbG9ycyBwYXJhbSBpcyBvcHRpb25hbFxuICAgICAgdGhpcy5jb2xvcnMgPSBjb2xvcnMgfHwgdGhpcy5jb2xvcnM7XG5cbiAgICAgIHRoaXMucmVzaXplQ2FudmFzKCk7XG5cbiAgICAgIHRoaXMuZ2VuZXJhdGVOZXdQb2ludHMobWluLCBtYXgsIG1pbkVkZ2UsIG1heEVkZ2UpO1xuXG4gICAgICB0aGlzLnRyaWFuZ3VsYXRlKCk7XG5cbiAgICAgIHRoaXMuZ2VuZXJhdGVHcmFkaWVudHMobWluR3JhZGllbnRzLCBtYXhHcmFkaWVudHMpO1xuXG4gICAgICB0aGlzLnJlbmRlcigpO1xuICAgIH1cblxuICAgIC8vIGNyZWF0ZXMgYSBoaWRkZW4gY2FudmFzIGZvciBob3ZlciBkZXRlY3Rpb25cbiAgICBjcmVhdGVTaGFkb3dDYW52YXMoKSB7XG4gICAgICB0aGlzLnNoYWRvd0NhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpO1xuICAgICAgdGhpcy5jYW52YXMucGFyZW50RWxlbWVudC5hcHBlbmRDaGlsZCh0aGlzLnNoYWRvd0NhbnZhcyk7XG4gICAgICB0aGlzLnNoYWRvd0N0eCA9IHRoaXMuc2hhZG93Q2FudmFzLmdldENvbnRleHQoJzJkJyk7XG5cbiAgICAgIHRoaXMuc2hhZG93Q2FudmFzLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XG4gICAgfVxuXG4gICAgZ2VuZXJhdGVOZXdQb2ludHMobWluLCBtYXgsIG1pbkVkZ2UsIG1heEVkZ2UpIHtcbiAgICAgIC8vIGRlZmF1bHRzIHRvIGdlbmVyaWMgbnVtYmVyIG9mIHBvaW50cyBiYXNlZCBvbiBjYW52YXMgZGltZW5zaW9uc1xuICAgICAgLy8gdGhpcyBnZW5lcmFsbHkgbG9va3MgcHJldHR5IG5pY2VcbiAgICAgIHZhciBhcmVhID0gdGhpcy5jYW52YXMud2lkdGggKiB0aGlzLmNhbnZhcy5oZWlnaHQ7XG4gICAgICB2YXIgcGVyaW1ldGVyID0gKHRoaXMuY2FudmFzLndpZHRoICsgdGhpcy5jYW52YXMuaGVpZ2h0KSAqIDI7XG5cbiAgICAgIG1pbiA9IG1pbiA+IDAgPyBNYXRoLmNlaWwobWluKSA6IE1hdGgubWF4KE1hdGguY2VpbChhcmVhIC8gMjUwMCksIDEwMCk7XG4gICAgICBtYXggPSBtYXggPiAwID8gTWF0aC5jZWlsKG1heCkgOiBNYXRoLm1heChNYXRoLmNlaWwoYXJlYSAvIDEwMDApLCAxMDApO1xuXG4gICAgICBtaW5FZGdlID0gbWluRWRnZSA+IDAgPyBNYXRoLmNlaWwobWluRWRnZSkgOiBNYXRoLm1heChNYXRoLmNlaWwocGVyaW1ldGVyIC8gMjUwKSwgMTApO1xuICAgICAgbWF4RWRnZSA9IG1heEVkZ2UgPiAwID8gTWF0aC5jZWlsKG1heEVkZ2UpIDogTWF0aC5tYXgoTWF0aC5jZWlsKHBlcmltZXRlciAvIDEwMCksIDEwKTtcblxuICAgICAgdGhpcy5udW1Qb2ludHMgPSBSYW5kb20ucmFuZG9tQmV0d2VlbihtaW4sIG1heCk7XG4gICAgICB0aGlzLmdldE51bUVkZ2VQb2ludHMgPSBSYW5kb20ucmFuZG9tTnVtYmVyRnVuY3Rpb24obWluRWRnZSwgbWF4RWRnZSk7XG5cbiAgICAgIHRoaXMuY2xlYXIoKTtcblxuICAgICAgLy8gYWRkIGNvcm5lciBhbmQgZWRnZSBwb2ludHNcbiAgICAgIHRoaXMuZ2VuZXJhdGVDb3JuZXJQb2ludHMoKTtcbiAgICAgIHRoaXMuZ2VuZXJhdGVFZGdlUG9pbnRzKCk7XG5cbiAgICAgIC8vIGFkZCBzb21lIHJhbmRvbSBwb2ludHMgaW4gdGhlIG1pZGRsZSBmaWVsZCxcbiAgICAgIC8vIGV4Y2x1ZGluZyBlZGdlcyBhbmQgY29ybmVyc1xuICAgICAgdGhpcy5nZW5lcmF0ZVJhbmRvbVBvaW50cyh0aGlzLm51bVBvaW50cywgMSwgMSwgdGhpcy53aWR0aCAtIDEsIHRoaXMuaGVpZ2h0IC0gMSk7XG4gICAgfVxuXG4gICAgLy8gYWRkIHBvaW50cyBpbiB0aGUgY29ybmVyc1xuICAgIGdlbmVyYXRlQ29ybmVyUG9pbnRzKCkge1xuICAgICAgdGhpcy5wb2ludHMucHVzaChuZXcgUG9pbnQoMCwgMCkpO1xuICAgICAgdGhpcy5wb2ludHMucHVzaChuZXcgUG9pbnQoMCwgdGhpcy5oZWlnaHQpKTtcbiAgICAgIHRoaXMucG9pbnRzLnB1c2gobmV3IFBvaW50KHRoaXMud2lkdGgsIDApKTtcbiAgICAgIHRoaXMucG9pbnRzLnB1c2gobmV3IFBvaW50KHRoaXMud2lkdGgsIHRoaXMuaGVpZ2h0KSk7XG4gICAgfVxuXG4gICAgLy8gYWRkIHBvaW50cyBvbiB0aGUgZWRnZXNcbiAgICBnZW5lcmF0ZUVkZ2VQb2ludHMoKSB7XG4gICAgICAvLyBsZWZ0IGVkZ2VcbiAgICAgIHRoaXMuZ2VuZXJhdGVSYW5kb21Qb2ludHModGhpcy5nZXROdW1FZGdlUG9pbnRzKCksIDAsIDAsIDAsIHRoaXMuaGVpZ2h0KTtcbiAgICAgIC8vIHJpZ2h0IGVkZ2VcbiAgICAgIHRoaXMuZ2VuZXJhdGVSYW5kb21Qb2ludHModGhpcy5nZXROdW1FZGdlUG9pbnRzKCksIHRoaXMud2lkdGgsIDAsIDAsIHRoaXMuaGVpZ2h0KTtcbiAgICAgIC8vIGJvdHRvbSBlZGdlXG4gICAgICB0aGlzLmdlbmVyYXRlUmFuZG9tUG9pbnRzKHRoaXMuZ2V0TnVtRWRnZVBvaW50cygpLCAwLCB0aGlzLmhlaWdodCwgdGhpcy53aWR0aCwgMCk7XG4gICAgICAvLyB0b3AgZWRnZVxuICAgICAgdGhpcy5nZW5lcmF0ZVJhbmRvbVBvaW50cyh0aGlzLmdldE51bUVkZ2VQb2ludHMoKSwgMCwgMCwgdGhpcy53aWR0aCwgMCk7XG4gICAgfVxuXG4gICAgLy8gcmFuZG9tbHkgZ2VuZXJhdGUgc29tZSBwb2ludHMsXG4gICAgLy8gc2F2ZSB0aGUgcG9pbnQgY2xvc2VzdCB0byBjZW50ZXJcbiAgICBnZW5lcmF0ZVJhbmRvbVBvaW50cyhudW1Qb2ludHMsIHgsIHksIHdpZHRoLCBoZWlnaHQpIHtcbiAgICAgIHZhciBjZW50ZXIgPSBuZXcgUG9pbnQoTWF0aC5yb3VuZChjYW52YXMud2lkdGgvMiksIE1hdGgucm91bmQoY2FudmFzLmhlaWdodC8yKSk7XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG51bVBvaW50czsgaSsrKSB7XG4gICAgICAgIHZhciBwb2ludDtcbiAgICAgICAgdmFyIGogPSAwO1xuICAgICAgICAvLyBnZW5lcmF0ZSBhIG5ldyBwb2ludCB3aXRoIHJhbmRvbSBjb29yZHNcbiAgICAgICAgLy8gcmUtZ2VuZXJhdGUgdGhlIHBvaW50IGlmIGl0IGFscmVhZHkgZXhpc3RzIGluIHBvaW50bWFwIChtYXggMTAgdGltZXMpXG4gICAgICAgIGRvIHtcbiAgICAgICAgICBqKys7XG4gICAgICAgICAgcG9pbnQgPSBuZXcgUG9pbnQoUmFuZG9tLnJhbmRvbUJldHdlZW4oeCwgeCArIHdpZHRoKSwgUmFuZG9tLnJhbmRvbUJldHdlZW4oeSwgeSArIGhlaWdodCkpO1xuICAgICAgICB9IHdoaWxlICh0aGlzLnBvaW50TWFwLmV4aXN0cyhwb2ludCkgJiYgaiA8IDEwKTtcbiAgICAgICAgaWYgKGogPCAxMCkge1xuICAgICAgICAgIHRoaXMucG9pbnRzLnB1c2gocG9pbnQpO1xuICAgICAgICAgIHRoaXMucG9pbnRNYXAuYWRkKHBvaW50KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjZW50ZXIuZ2V0RGlzdGFuY2VUbyhwb2ludCkgPCBjZW50ZXIuZ2V0RGlzdGFuY2VUbyh0aGlzLmNlbnRlcikpIHtcbiAgICAgICAgICB0aGlzLmNlbnRlciA9IHBvaW50O1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIHRoaXMuY2VudGVyLmlzQ2VudGVyID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgdGhpcy5jZW50ZXIuaXNDZW50ZXIgPSB0cnVlO1xuICAgIH1cblxuICAgIC8vIHVzZSB0aGUgRGVsYXVuYXkgYWxnb3JpdGhtIHRvIG1ha2VcbiAgICAvLyB0cmlhbmdsZXMgb3V0IG9mIG91ciByYW5kb20gcG9pbnRzXG4gICAgdHJpYW5ndWxhdGUoKSB7XG4gICAgICB0aGlzLnRyaWFuZ2xlcyA9IFtdO1xuXG4gICAgICAvLyBtYXAgcG9pbnQgb2JqZWN0cyB0byBsZW5ndGgtMiBhcnJheXNcbiAgICAgIHZhciB2ZXJ0aWNlcyA9IHRoaXMucG9pbnRzLm1hcChmdW5jdGlvbihwb2ludCkge1xuICAgICAgICByZXR1cm4gcG9pbnQuZ2V0Q29vcmRzKCk7XG4gICAgICB9KTtcblxuICAgICAgLy8gdmVydGljZXMgaXMgbm93IGFuIGFycmF5IHN1Y2ggYXM6XG4gICAgICAvLyBbIFtwMXgsIHAxeV0sIFtwMngsIHAyeV0sIFtwM3gsIHAzeV0sIC4uLiBdXG5cbiAgICAgIC8vIGRvIHRoZSBhbGdvcml0aG1cbiAgICAgIHZhciB0cmlhbmd1bGF0ZWQgPSBEZWxhdW5heS50cmlhbmd1bGF0ZSh2ZXJ0aWNlcyk7XG5cbiAgICAgIC8vIHJldHVybnMgMSBkaW1lbnNpb25hbCBhcnJheSBhcnJhbmdlZCBpbiB0cmlwbGVzIHN1Y2ggYXM6XG4gICAgICAvLyBbIHQxYSwgdDFiLCB0MWMsIHQyYSwgdDJiLCB0MmMsLi4uLiBdXG4gICAgICAvLyB3aGVyZSB0MWEsIGV0YyBhcmUgaW5kZWNlcyBpbiB0aGUgdmVydGljZXMgYXJyYXlcbiAgICAgIC8vIHR1cm4gdGhhdCBpbnRvIGFycmF5IG9mIHRyaWFuZ2xlIHBvaW50c1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0cmlhbmd1bGF0ZWQubGVuZ3RoOyBpICs9IDMpIHtcbiAgICAgICAgdmFyIGFyciA9IFtdO1xuICAgICAgICBhcnIucHVzaCh2ZXJ0aWNlc1t0cmlhbmd1bGF0ZWRbaV1dKTtcbiAgICAgICAgYXJyLnB1c2godmVydGljZXNbdHJpYW5ndWxhdGVkW2krMV1dKTtcbiAgICAgICAgYXJyLnB1c2godmVydGljZXNbdHJpYW5ndWxhdGVkW2krMl1dKTtcbiAgICAgICAgdGhpcy50cmlhbmdsZXMucHVzaChhcnIpO1xuICAgICAgfVxuXG4gICAgICAvLyBtYXAgdG8gYXJyYXkgb2YgVHJpYW5nbGUgb2JqZWN0c1xuICAgICAgdGhpcy50cmlhbmdsZXMgPSB0aGlzLnRyaWFuZ2xlcy5tYXAoZnVuY3Rpb24odHJpYW5nbGUpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBUcmlhbmdsZShuZXcgUG9pbnQodHJpYW5nbGVbMF0pLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ldyBQb2ludCh0cmlhbmdsZVsxXSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3IFBvaW50KHRyaWFuZ2xlWzJdKSk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBjcmVhdGUgcmFuZG9tIHJhZGlhbCBncmFkaWVudCBjaXJjbGVzIGZvciByZW5kZXJpbmcgbGF0ZXJcbiAgICBnZW5lcmF0ZUdyYWRpZW50cyhtaW5HcmFkaWVudHMsIG1heEdyYWRpZW50cykge1xuICAgICAgdGhpcy5yYWRpYWxHcmFkaWVudHMgPSBbXTtcblxuICAgICAgbWluR3JhZGllbnRzID0gbWluR3JhZGllbnRzID4gMCA/IG1pbkdyYWRpZW50cyA6IDE7XG4gICAgICBtYXhHcmFkaWVudHMgPSBtYXhHcmFkaWVudHMgPiAwID8gbWF4R3JhZGllbnRzIDogMjtcblxuICAgICAgdGhpcy5udW1HcmFkaWVudHMgPSBSYW5kb20ucmFuZG9tQmV0d2VlbihtaW5HcmFkaWVudHMsIG1heEdyYWRpZW50cyk7XG5cbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5udW1HcmFkaWVudHM7IGkrKykge1xuICAgICAgICB0aGlzLmdlbmVyYXRlUmFkaWFsR3JhZGllbnQoKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBnZW5lcmF0ZVJhZGlhbEdyYWRpZW50KCkge1xuICAgICAgLyoqXG4gICAgICAgICogY3JlYXRlIGEgbmljZS1sb29raW5nIGJ1dCBzb21ld2hhdCByYW5kb20gZ3JhZGllbnQ6XG4gICAgICAgICogcmFuZG9taXplIHRoZSBmaXJzdCBjaXJjbGVcbiAgICAgICAgKiB0aGUgc2Vjb25kIGNpcmNsZSBzaG91bGQgYmUgaW5zaWRlIHRoZSBmaXJzdCBjaXJjbGUsXG4gICAgICAgICogc28gd2UgZ2VuZXJhdGUgYSBwb2ludCAob3JpZ2luMikgaW5zaWRlIGNpcmxlMVxuICAgICAgICAqIHRoZW4gY2FsY3VsYXRlIHRoZSBkaXN0IGJldHdlZW4gb3JpZ2luMiBhbmQgdGhlIGNpcmN1bWZyZW5jZSBvZiBjaXJjbGUxXG4gICAgICAgICogY2lyY2xlMidzIHJhZGl1cyBjYW4gYmUgYmV0d2VlbiAwIGFuZCB0aGlzIGRpc3RcbiAgICAgICAgKi9cblxuICAgICAgdmFyIG1pblggPSBNYXRoLmNlaWwoTWF0aC5zcXJ0KGNhbnZhcy53aWR0aCkpO1xuICAgICAgdmFyIG1heFggPSBNYXRoLmNlaWwoY2FudmFzLndpZHRoIC0gTWF0aC5zcXJ0KGNhbnZhcy53aWR0aCkpO1xuXG4gICAgICB2YXIgbWluWSA9IE1hdGguY2VpbChNYXRoLnNxcnQoY2FudmFzLmhlaWdodCkpO1xuICAgICAgdmFyIG1heFkgPSBNYXRoLmNlaWwoY2FudmFzLmhlaWdodCAtIE1hdGguc3FydChjYW52YXMuaGVpZ2h0KSk7XG5cbiAgICAgIHZhciBtaW5SYWRpdXMgPSBNYXRoLmNlaWwoTWF0aC5tYXgoY2FudmFzLmhlaWdodCwgY2FudmFzLndpZHRoKS8gTWF0aC5tYXgoTWF0aC5zcXJ0KHRoaXMubnVtR3JhZGllbnRzKSwgMikpO1xuICAgICAgdmFyIG1heFJhZGl1cyA9IE1hdGguY2VpbChNYXRoLm1heChjYW52YXMuaGVpZ2h0LCBjYW52YXMud2lkdGgpIC8gTWF0aC5tYXgoTWF0aC5sb2codGhpcy5udW1HcmFkaWVudHMpLCAxKSk7XG5cbiAgICAgIC8vIGhlbHBlciByYW5kb20gZnVuY3Rpb25zXG4gICAgICB2YXIgcmFuZG9tQ2FudmFzWCA9IFJhbmRvbS5yYW5kb21OdW1iZXJGdW5jdGlvbihtaW5YLCBtYXhYKTtcbiAgICAgIHZhciByYW5kb21DYW52YXNZID0gUmFuZG9tLnJhbmRvbU51bWJlckZ1bmN0aW9uKG1pblksIG1heFkpO1xuICAgICAgdmFyIHJhbmRvbUNhbnZhc1JhZGl1cyA9IFJhbmRvbS5yYW5kb21OdW1iZXJGdW5jdGlvbihtaW5SYWRpdXMsIG1heFJhZGl1cyk7XG5cbiAgICAgIC8vIGdlbmVyYXRlIGNpcmNsZTEgb3JpZ2luIGFuZCByYWRpdXNcbiAgICAgIHZhciB4MCwgeTA7XG4gICAgICB2YXIgcjAgPSByYW5kb21DYW52YXNSYWRpdXMoKTtcblxuICAgICAgLy8gb3JpZ2luIG9mIHRoZSBuZXh0IGNpcmNsZSBzaG91bGQgYmUgY29udGFpbmVkXG4gICAgICAvLyB3aXRoaW4gdGhlIGFyZWEgb2YgaXRzIHByZWRlY2Vzc29yXG4gICAgICBpZiAodGhpcy5yYWRpYWxHcmFkaWVudHMubGVuZ3RoID4gMCkge1xuICAgICAgICB2YXIgbGFzdEdyYWRpZW50ID0gdGhpcy5yYWRpYWxHcmFkaWVudHNbdGhpcy5yYWRpYWxHcmFkaWVudHMubGVuZ3RoIC0gMV1cbiAgICAgICAgdmFyIHBvaW50SW5MYXN0Q2lyY2xlID0gUmFuZG9tLnJhbmRvbUluQ2lyY2xlKGxhc3RHcmFkaWVudC5yMCwgbGFzdEdyYWRpZW50LngwLCBsYXN0R3JhZGllbnQueTApO1xuXG4gICAgICAgIC8vIG9yaWdpbiBtdXN0IGJlIHdpdGhpbiB0aGUgYm91bmRzIG9mIHRoZSBjYW52YXNcbiAgICAgICAgd2hpbGUgKHBvaW50SW5MYXN0Q2lyY2xlLnggPCAwIHx8XG4gICAgICAgICAgICAgICBwb2ludEluTGFzdENpcmNsZS55IDwgMCB8fFxuICAgICAgICAgICAgICAgcG9pbnRJbkxhc3RDaXJjbGUueCA+IHRoaXMuY2FudmFzLndpZHRoIHx8XG4gICAgICAgICAgICAgICBwb2ludEluTGFzdENpcmNsZS55ID4gdGhpcy5jYW52YXMuaGVpZ2h0KSB7XG4gICAgICAgICAgcG9pbnRJbkxhc3RDaXJjbGUgPSBSYW5kb20ucmFuZG9tSW5DaXJjbGUobGFzdEdyYWRpZW50LnIwLCBsYXN0R3JhZGllbnQueDAsIGxhc3RHcmFkaWVudC55MCk7XG4gICAgICAgIH1cbiAgICAgICAgeDAgPSBwb2ludEluTGFzdENpcmNsZS54O1xuICAgICAgICB5MCA9IHBvaW50SW5MYXN0Q2lyY2xlLnk7XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgLy8gZmlyc3QgY2lyY2xlLCBqdXN0IHBpY2sgYXQgcmFuZG9tXG4gICAgICAgIHgwID0gcmFuZG9tQ2FudmFzWCgpO1xuICAgICAgICB5MCA9IHJhbmRvbUNhbnZhc1koKTtcbiAgICAgIH1cblxuICAgICAgLy8gZmluZCBhIHJhbmRvbSBwb2ludCBpbnNpZGUgY2lyY2xlMVxuICAgICAgLy8gdGhpcyBpcyB0aGUgb3JpZ2luIG9mIGNpcmNsZSAyXG4gICAgICB2YXIgcG9pbnRJbkNpcmNsZSA9IFJhbmRvbS5yYW5kb21JbkNpcmNsZShyMCowLjA5LCB4MCwgeTApO1xuXG4gICAgICAvLyBncmFiIHRoZSB4L3kgY29vcmRzXG4gICAgICB2YXIgeDEgPSBwb2ludEluQ2lyY2xlLng7XG4gICAgICB2YXIgeTEgPSBwb2ludEluQ2lyY2xlLnk7XG5cbiAgICAgIC8vIGZpbmQgZGlzdGFuY2UgYmV0d2VlbiB0aGUgcG9pbnQgYW5kIHRoZSBjaXJjdW1mcmllbmNlIG9mIGNpcmNsZTFcbiAgICAgIC8vIHRoZSByYWRpdXMgb2YgdGhlIHNlY29uZCBjaXJjbGUgd2lsbCBiZSBhIGZ1bmN0aW9uIG9mIHRoaXMgZGlzdGFuY2VcbiAgICAgIHZhciB2WCA9IHgxIC0geDA7XG4gICAgICB2YXIgdlkgPSB5MSAtIHkwO1xuICAgICAgdmFyIG1hZ1YgPSBNYXRoLnNxcnQodlgqdlggKyB2WSp2WSk7XG4gICAgICB2YXIgYVggPSB4MCArIHZYIC8gbWFnViAqIHIwO1xuICAgICAgdmFyIGFZID0geTAgKyB2WSAvIG1hZ1YgKiByMDtcblxuICAgICAgdmFyIGRpc3QgPSBNYXRoLnNxcnQoKHgxIC0gYVgpICogKHgxIC0gYVgpICsgKHkxIC0gYVkpICogKHkxIC0gYVkpKTtcblxuICAgICAgLy8gZ2VuZXJhdGUgdGhlIHJhZGl1cyBvZiBjaXJjbGUyIGJhc2VkIG9uIHRoaXMgZGlzdGFuY2VcbiAgICAgIHZhciByMSA9IFJhbmRvbS5yYW5kb21CZXR3ZWVuKDEsIE1hdGguc3FydChkaXN0KSk7XG5cbiAgICAgIC8vIHJhbmRvbSBidXQgbmljZSBsb29raW5nIGNvbG9yIHN0b3BcbiAgICAgIHZhciBjb2xvclN0b3AgPSBSYW5kb20ucmFuZG9tQmV0d2VlbigyLCA4KS8xMDtcblxuICAgICAgdGhpcy5yYWRpYWxHcmFkaWVudHMucHVzaCh7IHgwLCB5MCwgcjAsIHgxLCB5MSwgcjEsIGNvbG9yU3RvcCB9KTtcbiAgICB9XG5cbiAgICAvLyBzb3J0cyB0aGUgcG9pbnRzXG4gICAgc29ydFBvaW50cygpIHtcbiAgICAgIC8vIHNvcnQgcG9pbnRzXG4gICAgICB0aGlzLnBvaW50cy5zb3J0KGZ1bmN0aW9uKGEsIGIpIHtcbiAgICAgICAgLy8gc29ydCB0aGUgcG9pbnRcbiAgICAgICAgaWYgKGEueCA8IGIueCkge1xuICAgICAgICAgIHJldHVybiAtMTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChhLnggPiBiLngpIHtcbiAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChhLnkgPCBiLnkpIHtcbiAgICAgICAgICByZXR1cm4gLTE7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoYS55ID4gYi55KSB7XG4gICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIHNpemUgdGhlIGNhbnZhcyB0byB0aGUgc2l6ZSBvZiBpdHMgcGFyZW50XG4gICAgLy8gbWFrZXMgdGhlIGNhbnZhcyAncmVzcG9uc2l2ZSdcbiAgICByZXNpemVDYW52YXMoKSB7XG4gICAgICB2YXIgcGFyZW50ID0gdGhpcy5jYW52YXMucGFyZW50RWxlbWVudDtcbiAgICAgIHRoaXMuY2FudmFzLndpZHRoID0gdGhpcy53aWR0aCA9IHBhcmVudC5vZmZzZXRXaWR0aDtcbiAgICAgIHRoaXMuY2FudmFzLmhlaWdodCA9IHRoaXMuaGVpZ2h0ID0gcGFyZW50Lm9mZnNldEhlaWdodDtcblxuICAgICAgaWYgKHRoaXMuc2hhZG93Q2FudmFzKSB7XG4gICAgICAgIHRoaXMuc2hhZG93Q2FudmFzLndpZHRoID0gdGhpcy53aWR0aCA9IHBhcmVudC5vZmZzZXRXaWR0aDtcbiAgICAgICAgdGhpcy5zaGFkb3dDYW52YXMuaGVpZ2h0ID0gdGhpcy5oZWlnaHQgPSBwYXJlbnQub2Zmc2V0SGVpZ2h0O1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIG1vdmVzIHBvaW50cy90cmlhbmdsZXMgYmFzZWQgb24gbmV3IHNpemUgb2YgY2FudmFzXG4gICAgcmVzY2FsZSgpIHtcbiAgICAgIC8vIGdyYWIgb2xkIG1heC9taW4gZnJvbSBjdXJyZW50IGNhbnZhcyBzaXplXG4gICAgICB2YXIgeE1pbiA9IDA7XG4gICAgICB2YXIgeE1heCA9IHRoaXMuY2FudmFzLndpZHRoO1xuICAgICAgdmFyIHlNaW4gPSAwO1xuICAgICAgdmFyIHlNYXggPSB0aGlzLmNhbnZhcy5oZWlnaHQ7XG5cbiAgICAgIHRoaXMucmVzaXplQ2FudmFzKCk7XG5cbiAgICAgIGlmICh0aGlzLm9wdGlvbnMucmVzaXplTW9kZSA9PT0gJ3NjYWxlUG9pbnRzJykge1xuICAgICAgICAvLyBzY2FsZSBhbGwgcG9pbnRzIHRvIG5ldyBtYXggZGltZW5zaW9uc1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMucG9pbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgdGhpcy5wb2ludHNbaV0ucmVzY2FsZSh4TWluLCB4TWF4LCB5TWluLCB5TWF4LCAwLCB0aGlzLmNhbnZhcy53aWR0aCwgMCwgdGhpcy5jYW52YXMuaGVpZ2h0KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIHRoaXMuZ2VuZXJhdGVOZXdQb2ludHMoKTtcbiAgICAgIH1cblxuICAgICAgdGhpcy50cmlhbmd1bGF0ZSgpO1xuXG4gICAgICAvLyByZXNjYWxlIHBvc2l0aW9uIG9mIHJhZGlhbCBncmFkaWVudCBjaXJjbGVzXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMucmFkaWFsR3JhZGllbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBjaXJjbGUwID0gbmV3IFBvaW50KHRoaXMucmFkaWFsR3JhZGllbnRzW2ldLngwLCB0aGlzLnJhZGlhbEdyYWRpZW50c1tpXS55MCk7XG4gICAgICAgIHZhciBjaXJjbGUxID0gbmV3IFBvaW50KHRoaXMucmFkaWFsR3JhZGllbnRzW2ldLngxLCB0aGlzLnJhZGlhbEdyYWRpZW50c1tpXS55MSk7XG5cbiAgICAgICAgY2lyY2xlMC5yZXNjYWxlKHhNaW4sIHhNYXgsIHlNaW4sIHlNYXgsIDAsIHRoaXMuY2FudmFzLndpZHRoLCAwLCB0aGlzLmNhbnZhcy5oZWlnaHQpO1xuICAgICAgICBjaXJjbGUxLnJlc2NhbGUoeE1pbiwgeE1heCwgeU1pbiwgeU1heCwgMCwgdGhpcy5jYW52YXMud2lkdGgsIDAsIHRoaXMuY2FudmFzLmhlaWdodCk7XG5cbiAgICAgICAgdGhpcy5yYWRpYWxHcmFkaWVudHNbaV0ueDAgPSBjaXJjbGUwLng7XG4gICAgICAgIHRoaXMucmFkaWFsR3JhZGllbnRzW2ldLnkwID0gY2lyY2xlMC55O1xuICAgICAgICB0aGlzLnJhZGlhbEdyYWRpZW50c1tpXS54MSA9IGNpcmNsZTEueDtcbiAgICAgICAgdGhpcy5yYWRpYWxHcmFkaWVudHNbaV0ueTEgPSBjaXJjbGUxLnk7XG4gICAgICB9XG5cbiAgICAgIHRoaXMucmVuZGVyKCk7XG4gICAgfVxuXG4gICAgaG92ZXIoKSB7XG4gICAgICBpZiAodGhpcy5tb3VzZVBvc2l0aW9uKSB7XG4gICAgICAgIHZhciByZ2IgPSB0aGlzLm1vdXNlUG9zaXRpb24uY2FudmFzQ29sb3JBdFBvaW50KHRoaXMuc2hhZG93SW1hZ2VEYXRhLCAncmdiJykucmVwbGFjZSgncmdiKCcsICcnKS5yZXBsYWNlKCcpJywgJycpLnNwbGl0KCcsJyk7XG4gICAgICAgIHZhciBoZXggPSBDb2xvci5yZ2JUb0hleChyZ2IpO1xuICAgICAgICB2YXIgZGVjID0gcGFyc2VJbnQoaGV4LCAxNik7XG5cbiAgICAgICAgLy8gaXMgcHJvYmFibHkgdHJpYW5nbGUgd2l0aCB0aGF0IGluZGV4LCBidXRcbiAgICAgICAgLy8gZWRnZXMgY2FuIGJlIGZ1enp5IHNvIGRvdWJsZSBjaGVja1xuICAgICAgICBpZiAoZGVjID49IDAgJiYgZGVjIDwgdGhpcy50cmlhbmdsZXMubGVuZ3RoICYmIHRoaXMudHJpYW5nbGVzW2RlY10ucG9pbnRJblRyaWFuZ2xlKHRoaXMubW91c2VQb3NpdGlvbikpIHtcbiAgICAgICAgICAvLyBjbGVhciB0aGUgbGFzdCB0cmlhbmdsZVxuICAgICAgICAgIHRoaXMucmVzZXRUcmlhbmdsZSgpO1xuXG4gICAgICAgICAgaWYgKHRoaXMubGFzdFRyaWFuZ2xlICE9PSBkZWMpe1xuICAgICAgICAgICAgLy8gcmVuZGVyIHRoZSBob3ZlcmVkIHRyaWFuZ2xlXG4gICAgICAgICAgICB0aGlzLm9wdGlvbnMub25UcmlhbmdsZUhvdmVyKHRoaXMudHJpYW5nbGVzW2RlY10sIHRoaXMuY3R4LCB0aGlzLm9wdGlvbnMpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHRoaXMubGFzdFRyaWFuZ2xlID0gZGVjO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgdGhpcy5yZXNldFRyaWFuZ2xlKCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmVzZXRUcmlhbmdsZSgpIHtcbiAgICAgIC8vIHJlZHJhdyB0aGUgbGFzdCB0cmlhbmdsZSB0aGF0IHdhcyBob3ZlcmVkIG92ZXJcbiAgICAgIGlmICh0aGlzLmxhc3RUcmlhbmdsZSAmJiB0aGlzLmxhc3RUcmlhbmdsZSA+PSAwICYmIHRoaXMubGFzdFRyaWFuZ2xlIDwgdGhpcy50cmlhbmdsZXMubGVuZ3RoKSB7XG4gICAgICAgIHZhciBsYXN0VHJpYW5nbGUgPSB0aGlzLnRyaWFuZ2xlc1t0aGlzLmxhc3RUcmlhbmdsZV07XG5cbiAgICAgICAgLy8gZmluZCB0aGUgYm91bmRpbmcgcG9pbnRzIG9mIHRoZSBsYXN0IHRyaWFuZ2xlXG4gICAgICAgIC8vIGV4cGFuZCBhIGJpdCBmb3IgZWRnZXNcbiAgICAgICAgdmFyIG1pblggPSBsYXN0VHJpYW5nbGUubWluWCgpIC0gMTtcbiAgICAgICAgdmFyIG1pblkgPSBsYXN0VHJpYW5nbGUubWluWSgpIC0gMTtcbiAgICAgICAgdmFyIG1heFggPSBsYXN0VHJpYW5nbGUubWF4WCgpICsgMTtcbiAgICAgICAgdmFyIG1heFkgPSBsYXN0VHJpYW5nbGUubWF4WSgpICsgMTtcblxuICAgICAgICAvLyByZXNldCB0aGF0IHBvcnRpb24gb2YgdGhlIGNhbnZhcyB0byBpdHMgb3JpZ2luYWwgcmVuZGVyXG4gICAgICAgIHRoaXMuY3R4LnB1dEltYWdlRGF0YSh0aGlzLnJlbmRlcmVkSW1hZ2VEYXRhLCAwLCAwLCBtaW5YLCBtaW5ZLCBtYXhYIC0gbWluWCwgbWF4WSAtIG1pblkpO1xuXG4gICAgICAgIHRoaXMubGFzdFRyaWFuZ2xlID0gZmFsc2U7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmVuZGVyKCkge1xuICAgICAgLy8gZW1wdHkgdGhlIGNhbnZhc1xuICAgICAgdGhpcy5jdHguY2xlYXJSZWN0KDAsIDAsIHRoaXMuY2FudmFzLndpZHRoLCB0aGlzLmNhbnZhcy5oZWlnaHQpO1xuXG4gICAgICB0aGlzLnJlbmRlckdyYWRpZW50KCk7XG5cbiAgICAgIC8vIGdldCBlbnRpcmUgY2FudmFzIGltYWdlIGRhdGEgb2YgaW4gYSBiaWcgdHlwZWQgYXJyYXlcbiAgICAgIC8vIHRoaXMgd2F5IHdlIGRvbnQgaGF2ZSB0byBwaWNrIGZvciBlYWNoIHBvaW50IGluZGl2aWR1YWxseVxuICAgICAgLy8gaXQncyBsaWtlIDUweCBmYXN0ZXIgdGhpcyB3YXlcbiAgICAgIHRoaXMuZ3JhZGllbnRJbWFnZURhdGEgPSB0aGlzLmN0eC5nZXRJbWFnZURhdGEoMCwgMCwgdGhpcy5jYW52YXMud2lkdGgsIHRoaXMuY2FudmFzLmhlaWdodCk7XG5cbiAgICAgIC8vIHJlbmRlcnMgdHJpYW5nbGVzLCBlZGdlcywgYW5kIHNoYWRvdyBjYW52YXMgZm9yIGhvdmVyIGRldGVjdGlvblxuICAgICAgdGhpcy5yZW5kZXJUcmlhbmdsZXModGhpcy5vcHRpb25zLnNob3dUcmlhbmdsZXMsIHRoaXMub3B0aW9ucy5zaG93RWRnZXMpO1xuXG4gICAgICB0aGlzLnJlbmRlckV4dHJhcygpO1xuXG4gICAgICB0aGlzLnJlbmRlcmVkSW1hZ2VEYXRhID0gdGhpcy5jdHguZ2V0SW1hZ2VEYXRhKDAsIDAsIHRoaXMuY2FudmFzLndpZHRoLCB0aGlzLmNhbnZhcy5oZWlnaHQpO1xuXG4gICAgICAvLyB0aHJvdyBldmVudHMgZm9yIGxpZ2h0IC8gZGFyayB0ZXh0XG4gICAgICB2YXIgY2VudGVyQ29sb3IgPSB0aGlzLmNlbnRlci5jYW52YXNDb2xvckF0UG9pbnQoKTtcblxuICAgICAgaWYgKHBhcnNlSW50KGNlbnRlckNvbG9yLnNwbGl0KCcsJylbMl0pIDwgNTApIHtcbiAgICAgICAgdGhpcy5vcHRpb25zLm9uRGFya0JhY2tncm91bmQoY2VudGVyQ29sb3IpO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIHRoaXMub3B0aW9ucy5vbkxpZ2h0QmFja2dyb3VuZChjZW50ZXJDb2xvcik7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmVuZGVyRXh0cmFzKCkge1xuICAgICAgaWYgKHRoaXMub3B0aW9ucy5zaG93UG9pbnRzKSB7XG4gICAgICAgIHRoaXMucmVuZGVyUG9pbnRzKCk7XG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLm9wdGlvbnMuc2hvd0NpcmNsZXMpIHtcbiAgICAgICAgdGhpcy5yZW5kZXJHcmFkaWVudENpcmNsZXMoKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMub3B0aW9ucy5zaG93Q2VudHJvaWRzKSB7XG4gICAgICAgIHRoaXMucmVuZGVyQ2VudHJvaWRzKCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmVuZGVyTmV3Q29sb3JzKGNvbG9ycykge1xuICAgICAgdGhpcy5jb2xvcnMgPSBjb2xvcnMgfHwgdGhpcy5jb2xvcnM7XG4gICAgICAvLyB0cmlhbmdsZSBjZW50cm9pZHMgbmVlZCBuZXcgY29sb3JzXG4gICAgICB0aGlzLnRyaWFuZ3VsYXRlKCk7XG4gICAgICB0aGlzLnJlbmRlcigpO1xuICAgIH1cblxuICAgIHJlbmRlck5ld0dyYWRpZW50KG1pbkdyYWRpZW50cywgbWF4R3JhZGllbnRzKSB7XG4gICAgICB0aGlzLmdlbmVyYXRlR3JhZGllbnRzKG1pbkdyYWRpZW50cywgbWF4R3JhZGllbnRzKTtcbiAgICAgIHRoaXMudHJpYW5ndWxhdGUoKTtcbiAgICAgIHRoaXMucmVuZGVyKCk7XG4gICAgfVxuXG4gICAgcmVuZGVyTmV3VHJpYW5nbGVzKG1pbiwgbWF4LCBtaW5FZGdlLCBtYXhFZGdlKSB7XG4gICAgICB0aGlzLmdlbmVyYXRlTmV3UG9pbnRzKG1pbiwgbWF4LCBtaW5FZGdlLCBtYXhFZGdlKTtcbiAgICAgIHRoaXMudHJpYW5ndWxhdGUoKTtcbiAgICAgIHRoaXMucmVuZGVyKCk7XG4gICAgfVxuXG4gICAgcmVuZGVyR3JhZGllbnQoKSB7XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMucmFkaWFsR3JhZGllbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIC8vIGNyZWF0ZSB0aGUgcmFkaWFsIGdyYWRpZW50IGJhc2VkIG9uXG4gICAgICAgIC8vIHRoZSBnZW5lcmF0ZWQgY2lyY2xlcycgcmFkaWkgYW5kIG9yaWdpbnNcbiAgICAgICAgdmFyIHJhZGlhbEdyYWRpZW50ID0gdGhpcy5jdHguY3JlYXRlUmFkaWFsR3JhZGllbnQoXG4gICAgICAgICAgdGhpcy5yYWRpYWxHcmFkaWVudHNbaV0ueDAsXG4gICAgICAgICAgdGhpcy5yYWRpYWxHcmFkaWVudHNbaV0ueTAsXG4gICAgICAgICAgdGhpcy5yYWRpYWxHcmFkaWVudHNbaV0ucjAsXG4gICAgICAgICAgdGhpcy5yYWRpYWxHcmFkaWVudHNbaV0ueDEsXG4gICAgICAgICAgdGhpcy5yYWRpYWxHcmFkaWVudHNbaV0ueTEsXG4gICAgICAgICAgdGhpcy5yYWRpYWxHcmFkaWVudHNbaV0ucjFcbiAgICAgICAgKTtcblxuICAgICAgICB2YXIgb3V0ZXJDb2xvciA9IHRoaXMuY29sb3JzWzJdO1xuXG4gICAgICAgIC8vIG11c3QgYmUgdHJhbnNwYXJlbnQgdmVyc2lvbiBvZiBtaWRkbGUgY29sb3JcbiAgICAgICAgLy8gdGhpcyB3b3JrcyBmb3IgcmdiYSBhbmQgaHNsYVxuICAgICAgICBpZiAoaSA+IDApIHtcbiAgICAgICAgICBvdXRlckNvbG9yID0gdGhpcy5jb2xvcnNbMV0uc3BsaXQoJywnKTtcbiAgICAgICAgICBvdXRlckNvbG9yWzNdID0gJzApJztcbiAgICAgICAgICBvdXRlckNvbG9yID0gb3V0ZXJDb2xvci5qb2luKCcsJyk7XG4gICAgICAgIH1cblxuICAgICAgICByYWRpYWxHcmFkaWVudC5hZGRDb2xvclN0b3AoMSwgdGhpcy5jb2xvcnNbMF0pO1xuICAgICAgICByYWRpYWxHcmFkaWVudC5hZGRDb2xvclN0b3AodGhpcy5yYWRpYWxHcmFkaWVudHNbaV0uY29sb3JTdG9wLCB0aGlzLmNvbG9yc1sxXSk7XG4gICAgICAgIHJhZGlhbEdyYWRpZW50LmFkZENvbG9yU3RvcCgwLCBvdXRlckNvbG9yKTtcblxuICAgICAgICB0aGlzLmNhbnZhcy5wYXJlbnRFbGVtZW50LnN0eWxlLmJhY2tncm91bmRDb2xvciA9IHRoaXMuY29sb3JzWzJdO1xuXG4gICAgICAgIHRoaXMuY3R4LmZpbGxTdHlsZSA9IHJhZGlhbEdyYWRpZW50O1xuICAgICAgICB0aGlzLmN0eC5maWxsUmVjdCgwLCAwLCB0aGlzLmNhbnZhcy53aWR0aCwgdGhpcy5jYW52YXMuaGVpZ2h0KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZW5kZXJUcmlhbmdsZXModHJpYW5nbGVzLCBlZGdlcykge1xuXG4gICAgICAvLyBzYXZlIHRoaXMgZm9yIGxhdGVyXG4gICAgICB0aGlzLmNlbnRlci5jYW52YXNDb2xvckF0UG9pbnQodGhpcy5ncmFkaWVudEltYWdlRGF0YSk7XG5cbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy50cmlhbmdsZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgLy8gdGhlIGNvbG9yIGlzIGRldGVybWluZWQgYnkgZ3JhYmJpbmcgdGhlIGNvbG9yIG9mIHRoZSBjYW52YXNcbiAgICAgICAgLy8gKHdoZXJlIHdlIGRyZXcgdGhlIGdyYWRpZW50KSBhdCB0aGUgY2VudGVyIG9mIHRoZSB0cmlhbmdsZVxuXG4gICAgICAgIHRoaXMudHJpYW5nbGVzW2ldLmNvbG9yID0gdGhpcy50cmlhbmdsZXNbaV0uY29sb3JBdENlbnRyb2lkKHRoaXMuZ3JhZGllbnRJbWFnZURhdGEpO1xuXG4gICAgICAgIGlmICh0cmlhbmdsZXMgJiYgZWRnZXMpIHtcbiAgICAgICAgICB0aGlzLnRyaWFuZ2xlc1tpXS5zdHJva2UgPSB0aGlzLm9wdGlvbnMuZWRnZUNvbG9yKHRoaXMudHJpYW5nbGVzW2ldLmNvbG9yQXRDZW50cm9pZCh0aGlzLmdyYWRpZW50SW1hZ2VEYXRhKSk7XG4gICAgICAgICAgdGhpcy50cmlhbmdsZXNbaV0ucmVuZGVyKHRoaXMuY3R4KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICh0cmlhbmdsZXMpIHtcbiAgICAgICAgICAvLyB0cmlhbmdsZXMgb25seVxuICAgICAgICAgIHRoaXMudHJpYW5nbGVzW2ldLnN0cm9rZSA9IHRoaXMudHJpYW5nbGVzW2ldLmNvbG9yO1xuICAgICAgICAgIHRoaXMudHJpYW5nbGVzW2ldLnJlbmRlcih0aGlzLmN0eCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoZWRnZXMpIHtcbiAgICAgICAgICAvLyBlZGdlcyBvbmx5XG4gICAgICAgICAgdGhpcy50cmlhbmdsZXNbaV0uc3Ryb2tlID0gdGhpcy5vcHRpb25zLmVkZ2VDb2xvcih0aGlzLnRyaWFuZ2xlc1tpXS5jb2xvckF0Q2VudHJvaWQodGhpcy5ncmFkaWVudEltYWdlRGF0YSkpO1xuICAgICAgICAgIHRoaXMudHJpYW5nbGVzW2ldLnJlbmRlcih0aGlzLmN0eCwgZmFsc2UpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuc2hhZG93Q2FudmFzKSB7XG4gICAgICAgICAgdmFyIGNvbG9yID0gJyMnICsgKCcwMDAwMDAnICsgaS50b1N0cmluZygxNikpLnNsaWNlKC02KTtcbiAgICAgICAgICB0aGlzLnRyaWFuZ2xlc1tpXS5yZW5kZXIodGhpcy5zaGFkb3dDdHgsIGNvbG9yLCBmYWxzZSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMuc2hhZG93Q2FudmFzKSB7XG4gICAgICAgIHRoaXMuc2hhZG93SW1hZ2VEYXRhID0gdGhpcy5zaGFkb3dDdHguZ2V0SW1hZ2VEYXRhKDAsIDAsIHRoaXMuY2FudmFzLndpZHRoLCB0aGlzLmNhbnZhcy5oZWlnaHQpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIHJlbmRlcnMgdGhlIHBvaW50cyBvZiB0aGUgdHJpYW5nbGVzXG4gICAgcmVuZGVyUG9pbnRzKCkge1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLnBvaW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICB0aGlzLnBvaW50c1tpXS5yZW5kZXIodGhpcy5jdHgsIHRoaXMub3B0aW9ucy5wb2ludENvbG9yKHRoaXMucG9pbnRzW2ldLmNhbnZhc0NvbG9yQXRQb2ludCh0aGlzLmdyYWRpZW50SW1hZ2VEYXRhKSkpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIGRyYXdzIHRoZSBjaXJjbGVzIHRoYXQgZGVmaW5lIHRoZSBncmFkaWVudHNcbiAgICByZW5kZXJHcmFkaWVudENpcmNsZXMoKSB7XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMucmFkaWFsR3JhZGllbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHRoaXMuY3R4LmJlZ2luUGF0aCgpO1xuICAgICAgICB0aGlzLmN0eC5hcmModGhpcy5yYWRpYWxHcmFkaWVudHNbaV0ueDAsXG4gICAgICAgICAgICAgICAgdGhpcy5yYWRpYWxHcmFkaWVudHNbaV0ueTAsXG4gICAgICAgICAgICAgICAgdGhpcy5yYWRpYWxHcmFkaWVudHNbaV0ucjAsXG4gICAgICAgICAgICAgICAgMCwgTWF0aC5QSSoyLCB0cnVlKTtcbiAgICAgICAgdGhpcy5jdHguc3Ryb2tlU3R5bGUgPSAobmV3IFBvaW50KHRoaXMucmFkaWFsR3JhZGllbnRzW2ldLngwLCB0aGlzLnJhZGlhbEdyYWRpZW50c1tpXS55MCkpLmNhbnZhc0NvbG9yQXRQb2ludCh0aGlzLmdyYWRpZW50SW1hZ2VEYXRhKTtcbiAgICAgICAgdGhpcy5jdHguc3Ryb2tlKCk7XG5cbiAgICAgICAgdGhpcy5jdHguYmVnaW5QYXRoKCk7XG4gICAgICAgIHRoaXMuY3R4LmFyYyh0aGlzLnJhZGlhbEdyYWRpZW50c1tpXS54MSxcbiAgICAgICAgICAgICAgICB0aGlzLnJhZGlhbEdyYWRpZW50c1tpXS55MSxcbiAgICAgICAgICAgICAgICB0aGlzLnJhZGlhbEdyYWRpZW50c1tpXS5yMSxcbiAgICAgICAgICAgICAgICAwLCBNYXRoLlBJKjIsIHRydWUpO1xuICAgICAgICB0aGlzLmN0eC5zdHJva2VTdHlsZSA9IChuZXcgUG9pbnQodGhpcy5yYWRpYWxHcmFkaWVudHNbaV0ueDEsIHRoaXMucmFkaWFsR3JhZGllbnRzW2ldLnkxKSkuY2FudmFzQ29sb3JBdFBvaW50KHRoaXMuZ3JhZGllbnRJbWFnZURhdGEpO1xuICAgICAgICB0aGlzLmN0eC5zdHJva2UoKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyByZW5kZXIgdHJpYW5nbGUgY2VudHJvaWRzXG4gICAgcmVuZGVyQ2VudHJvaWRzKCkge1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLnRyaWFuZ2xlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICB0aGlzLnRyaWFuZ2xlc1tpXS5jZW50cm9pZCgpLnJlbmRlcih0aGlzLmN0eCwgdGhpcy5vcHRpb25zLmNlbnRyb2lkQ29sb3IodGhpcy50cmlhbmdsZXNbaV0uY29sb3JBdENlbnRyb2lkKHRoaXMuZ3JhZGllbnRJbWFnZURhdGEpKSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdG9nZ2xlVHJpYW5nbGVzKCkge1xuICAgICAgdGhpcy5vcHRpb25zLnNob3dUcmlhbmdsZXMgPSAhdGhpcy5vcHRpb25zLnNob3dUcmlhbmdsZXM7XG4gICAgICB0aGlzLnJlbmRlcigpO1xuICAgIH1cblxuICAgIHRvZ2dsZVBvaW50cygpIHtcbiAgICAgIHRoaXMub3B0aW9ucy5zaG93UG9pbnRzID0gIXRoaXMub3B0aW9ucy5zaG93UG9pbnRzO1xuICAgICAgdGhpcy5yZW5kZXIoKTtcbiAgICB9XG5cbiAgICB0b2dnbGVDaXJjbGVzKCkge1xuICAgICAgdGhpcy5vcHRpb25zLnNob3dDaXJjbGVzID0gIXRoaXMub3B0aW9ucy5zaG93Q2lyY2xlcztcbiAgICAgIHRoaXMucmVuZGVyKCk7XG4gICAgfVxuXG4gICAgdG9nZ2xlQ2VudHJvaWRzKCkge1xuICAgICAgdGhpcy5vcHRpb25zLnNob3dDZW50cm9pZHMgPSAhdGhpcy5vcHRpb25zLnNob3dDZW50cm9pZHM7XG4gICAgICB0aGlzLnJlbmRlcigpO1xuICAgIH1cblxuICAgIHRvZ2dsZUVkZ2VzKCkge1xuICAgICAgdGhpcy5vcHRpb25zLnNob3dFZGdlcyA9ICF0aGlzLm9wdGlvbnMuc2hvd0VkZ2VzO1xuICAgICAgdGhpcy5yZW5kZXIoKTtcbiAgICB9XG4gIH1cblxuICB3aW5kb3cuUHJldHR5RGVsYXVuYXkgPSBQcmV0dHlEZWxhdW5heTtcbn0pKCk7XG4iLCJ2YXIgUmFuZG9tO1xuXG4oZnVuY3Rpb24oKSB7XG4gICd1c2Ugc3RyaWN0JztcbiAgLy8gUmFuZG9tIGhlbHBlciBmdW5jdGlvbnMvLyByYW5kb20gaGVscGVyIGZ1bmN0aW9uc1xuXG4gIFJhbmRvbSA9IHtcbiAgICAvLyBoZXkgbG9vayBhIGNsb3N1cmVcbiAgICAvLyByZXR1cm5zIGZ1bmN0aW9uIGZvciByYW5kb20gbnVtYmVycyB3aXRoIHByZS1zZXQgbWF4IGFuZCBtaW5cbiAgICByYW5kb21OdW1iZXJGdW5jdGlvbjogZnVuY3Rpb24obWF4LCBtaW4pIHtcbiAgICAgIG1pbiA9IG1pbiB8fCAwO1xuICAgICAgaWYgKG1pbiA+IG1heCkge1xuICAgICAgICB2YXIgdGVtcCA9IG1heDtcbiAgICAgICAgbWF4ID0gbWluO1xuICAgICAgICBtaW4gPSB0ZW1wO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogKG1heCAtIG1pbiArIDEpKSArIG1pbjtcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgLy8gcmV0dXJucyBhIHJhbmRvbSBudW1iZXJcbiAgICAvLyBiZXR3ZWVuIHRoZSBtYXggYW5kIG1pblxuICAgIHJhbmRvbUJldHdlZW46IGZ1bmN0aW9uKG1heCwgbWluKSB7XG4gICAgICBtaW4gPSBtaW4gfHwgMDtcbiAgICAgIHJldHVybiBSYW5kb20ucmFuZG9tTnVtYmVyRnVuY3Rpb24obWF4LCBtaW4pKCk7XG4gICAgfSxcblxuICAgIHJhbmRvbUluQ2lyY2xlOiBmdW5jdGlvbihyYWRpdXMsIG94LCBveSkge1xuICAgICAgdmFyIGFuZ2xlID0gTWF0aC5yYW5kb20oKSAqIE1hdGguUEkgKiAyO1xuICAgICAgdmFyIHJhZCA9IE1hdGguc3FydChNYXRoLnJhbmRvbSgpKSAqIHJhZGl1cztcbiAgICAgIHZhciB4ID0gb3ggKyByYWQgKiBNYXRoLmNvcyhhbmdsZSk7XG4gICAgICB2YXIgeSA9IG95ICsgcmFkICogTWF0aC5zaW4oYW5nbGUpO1xuXG4gICAgICByZXR1cm4gbmV3IFBvaW50KHgsIHkpO1xuICAgIH0sXG5cbiAgICByYW5kb21SZ2JhOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiAncmdiYSgnICsgUmFuZG9tLnJhbmRvbUJldHdlZW4oMjU1KSArICcsJyArIFJhbmRvbS5yYW5kb21CZXR3ZWVuKDI1NSkgKyAnLCcgKyBSYW5kb20ucmFuZG9tQmV0d2VlbigyNTUpICsgJywgMSknO1xuICAgIH0sXG5cbiAgICByYW5kb21Ic2xhOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiAnaHNsYSgnICsgUmFuZG9tLnJhbmRvbUJldHdlZW4oMzYwKSArICcsJyArIFJhbmRvbS5yYW5kb21CZXR3ZWVuKDEwMCkgKyAnJSwnICsgUmFuZG9tLnJhbmRvbUJldHdlZW4oMTAwKSArICclLCAxKSc7XG4gICAgfSxcbiAgfVxuXG4gIGlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gUmFuZG9tO1xuICB9XG5cbn0pKCk7XG4iLCJ2YXIgVHJpYW5nbGU7XG5cbihmdW5jdGlvbigpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuICAvKipcbiAgICogUmVwcmVzZW50cyBhIHRyaWFuZ2xlXG4gICAqIEBjbGFzc1xuICAgKi9cbiAgY2xhc3MgX1RyaWFuZ2xlIHtcbiAgICAvKipcbiAgICAgKiBUcmlhbmdsZSBjb25zaXN0cyBvZiB0aHJlZSBQb2ludHNcbiAgICAgKiBAY29uc3RydWN0b3JcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gYVxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBiXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGNcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihhLCBiLCBjKSB7XG4gICAgICB0aGlzLnAxID0gdGhpcy5hID0gYTtcbiAgICAgIHRoaXMucDIgPSB0aGlzLmIgPSBiO1xuICAgICAgdGhpcy5wMyA9IHRoaXMuYyA9IGM7XG5cbiAgICAgIHRoaXMuY29sb3IgPSAnYmxhY2snO1xuICAgICAgdGhpcy5zdHJva2UgPSAnYmxhY2snO1xuICAgIH1cblxuICAgIC8vIGRyYXcgdGhlIHRyaWFuZ2xlIHdpdGggZGlmZmVyaW5nIGVkZ2UgY29sb3JzIG9wdGlvbmFsXG4gICAgcmVuZGVyKGN0eCwgY29sb3IsIHN0cm9rZSkge1xuICAgICAgY3R4LmJlZ2luUGF0aCgpO1xuICAgICAgY3R4Lm1vdmVUbyh0aGlzLmEueCwgdGhpcy5hLnkpO1xuICAgICAgY3R4LmxpbmVUbyh0aGlzLmIueCwgdGhpcy5iLnkpO1xuICAgICAgY3R4LmxpbmVUbyh0aGlzLmMueCwgdGhpcy5jLnkpO1xuICAgICAgY3R4LmNsb3NlUGF0aCgpO1xuICAgICAgY3R4LnN0cm9rZVN0eWxlID0gc3Ryb2tlIHx8IHRoaXMuc3Ryb2tlIHx8IHRoaXMuY29sb3I7XG4gICAgICBjdHguZmlsbFN0eWxlID0gY29sb3IgfHwgdGhpcy5jb2xvcjtcbiAgICAgIGlmIChjb2xvciAhPT0gZmFsc2UgJiYgc3Ryb2tlICE9PSBmYWxzZSkge1xuICAgICAgICAvLyBkcmF3IHRoZSBzdHJva2UgdXNpbmcgdGhlIGZpbGwgY29sb3IgZmlyc3RcbiAgICAgICAgLy8gc28gdGhhdCB0aGUgcG9pbnRzIG9mIGFkamFjZW50IHRyaWFuZ2xlc1xuICAgICAgICAvLyBkb250IG92ZXJsYXAgYSBidW5jaCBhbmQgbG9vayBcInN0YXJyeVwiXG4gICAgICAgIHZhciBzdHJva2UgPSBjdHguc3Ryb2tlU3R5bGU7XG4gICAgICAgIGN0eC5zdHJva2VTdHlsZSA9IGN0eC5maWxsU3R5bGU7XG4gICAgICAgIGN0eC5zdHJva2UoKTtcbiAgICAgICAgY3R4LnN0cm9rZVN0eWxlID0gc3Ryb2tlO1xuICAgICAgfVxuICAgICAgaWYgKGNvbG9yICE9PSBmYWxzZSkge1xuICAgICAgICBjdHguZmlsbCgpO1xuICAgICAgfVxuICAgICAgaWYgKHN0cm9rZSAhPT0gZmFsc2UpIHtcbiAgICAgICAgY3R4LnN0cm9rZSgpO1xuICAgICAgfVxuICAgICAgY3R4LmNsb3NlUGF0aCgpO1xuICAgIH1cblxuICAgIC8vIHJhbmRvbSBwb2ludCBpbnNpZGUgdHJpYW5nbGVcbiAgICByYW5kb21JbnNpZGUoKSB7XG4gICAgICB2YXIgcjEgPSBNYXRoLnJhbmRvbSgpO1xuICAgICAgdmFyIHIyID0gTWF0aC5yYW5kb20oKTtcbiAgICAgIHZhciB4ID0gKDEgLSBNYXRoLnNxcnQocjEpKSAqIHRoaXMucDEueCArIChNYXRoLnNxcnQocjEpICogKDEgLSByMikpICogdGhpcy5wMi54ICsgKE1hdGguc3FydChyMSkgKiByMikgKiB0aGlzLnAzLng7XG4gICAgICB2YXIgeSA9ICgxIC0gTWF0aC5zcXJ0KHIxKSkgKiB0aGlzLnAxLnkgKyAoTWF0aC5zcXJ0KHIxKSAqICgxIC0gcjIpKSAqIHRoaXMucDIueSArIChNYXRoLnNxcnQocjEpICogcjIpICogdGhpcy5wMy55O1xuICAgICAgcmV0dXJuIG5ldyBQb2ludCh4LCB5KTtcbiAgICB9XG5cbiAgICBjb2xvckF0Q2VudHJvaWQoaW1hZ2VEYXRhKSB7XG4gICAgICByZXR1cm4gdGhpcy5jZW50cm9pZCgpLmNhbnZhc0NvbG9yQXRQb2ludChpbWFnZURhdGEpO1xuICAgIH1cblxuICAgIGNlbnRyb2lkKCkge1xuICAgICAgLy8gb25seSBjYWxjIHRoZSBjZW50cm9pZCBpZiB3ZSBkb250IGFscmVhZHkga25vdyBpdFxuICAgICAgaWYgKHRoaXMuX2NlbnRyb2lkKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9jZW50cm9pZDtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICB2YXIgeCA9IE1hdGgucm91bmQoKHRoaXMucDEueCArIHRoaXMucDIueCArIHRoaXMucDMueCkgLyAzKTtcbiAgICAgICAgdmFyIHkgPSBNYXRoLnJvdW5kKCh0aGlzLnAxLnkgKyB0aGlzLnAyLnkgKyB0aGlzLnAzLnkpIC8gMyk7XG4gICAgICAgIHRoaXMuX2NlbnRyb2lkID0gbmV3IFBvaW50KHgsIHkpO1xuXG4gICAgICAgIHJldHVybiB0aGlzLl9jZW50cm9pZDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzEzMzAwOTA0L2RldGVybWluZS13aGV0aGVyLXBvaW50LWxpZXMtaW5zaWRlLXRyaWFuZ2xlXG4gICAgcG9pbnRJblRyaWFuZ2xlKHBvaW50KSB7XG4gICAgICB2YXIgYWxwaGEgPSAoKHRoaXMucDIueSAtIHRoaXMucDMueSkqKHBvaW50LnggLSB0aGlzLnAzLngpICsgKHRoaXMucDMueCAtIHRoaXMucDIueCkqKHBvaW50LnkgLSB0aGlzLnAzLnkpKSAvXG4gICAgICAgICAgICAgICAgICAoKHRoaXMucDIueSAtIHRoaXMucDMueSkqKHRoaXMucDEueCAtIHRoaXMucDMueCkgKyAodGhpcy5wMy54IC0gdGhpcy5wMi54KSoodGhpcy5wMS55IC0gdGhpcy5wMy55KSk7XG4gICAgICB2YXIgYmV0YSA9ICgodGhpcy5wMy55IC0gdGhpcy5wMS55KSoocG9pbnQueCAtIHRoaXMucDMueCkgKyAodGhpcy5wMS54IC0gdGhpcy5wMy54KSoocG9pbnQueSAtIHRoaXMucDMueSkpIC9cbiAgICAgICAgICAgICAgICAgKCh0aGlzLnAyLnkgLSB0aGlzLnAzLnkpKih0aGlzLnAxLnggLSB0aGlzLnAzLngpICsgKHRoaXMucDMueCAtIHRoaXMucDIueCkqKHRoaXMucDEueSAtIHRoaXMucDMueSkpO1xuICAgICAgdmFyIGdhbW1hID0gMS4wIC0gYWxwaGEgLSBiZXRhO1xuXG4gICAgICByZXR1cm4gKGFscGhhID4gMCAmJiBiZXRhID4gMCAmJiBnYW1tYSA+IDApO1xuICAgIH1cblxuICAgIC8vIHNjYWxlIHBvaW50cyBmcm9tIFtBLCBCXSB0byBbQywgRF1cbiAgICAvLyB4QSA9PiBvbGQgeCBtaW4sIHhCID0+IG9sZCB4IG1heFxuICAgIC8vIHlBID0+IG9sZCB5IG1pbiwgeUIgPT4gb2xkIHkgbWF4XG4gICAgLy8geEMgPT4gbmV3IHggbWluLCB4RCA9PiBuZXcgeCBtYXhcbiAgICAvLyB5QyA9PiBuZXcgeSBtaW4sIHlEID0+IG5ldyB5IG1heFxuICAgIHJlc2NhbGVQb2ludHMoeEEsIHhCLCB5QSwgeUIsIHhDLCB4RCwgeUMsIHlEKSB7XG4gICAgICB0aGlzLnAxLnJlc2NhbGUoeEEsIHhCLCB5QSwgeUIsIHhDLCB4RCwgeUMsIHlEKTtcbiAgICAgIHRoaXMucDIucmVzY2FsZSh4QSwgeEIsIHlBLCB5QiwgeEMsIHhELCB5QywgeUQpO1xuICAgICAgdGhpcy5wMy5yZXNjYWxlKHhBLCB4QiwgeUEsIHlCLCB4QywgeEQsIHlDLCB5RCk7XG4gICAgICAvLyByZWNhbGN1bGF0ZSB0aGUgY2VudHJvaWRcbiAgICAgIHRoaXMuY2VudHJvaWQoKTtcbiAgICB9XG5cbiAgICBtYXhYKCkge1xuICAgICAgcmV0dXJuIE1hdGgubWF4KHRoaXMucDEueCwgdGhpcy5wMi54LCB0aGlzLnAzLngpO1xuICAgIH1cblxuICAgIG1heFkoKSB7XG4gICAgICByZXR1cm4gTWF0aC5tYXgodGhpcy5wMS55LCB0aGlzLnAyLnksIHRoaXMucDMueSk7XG4gICAgfVxuXG4gICAgbWluWCgpIHtcbiAgICAgIHJldHVybiBNYXRoLm1pbih0aGlzLnAxLngsIHRoaXMucDIueCwgdGhpcy5wMy54KTtcbiAgICB9XG5cbiAgICBtaW5ZKCkge1xuICAgICAgcmV0dXJuIE1hdGgubWluKHRoaXMucDEueSwgdGhpcy5wMi55LCB0aGlzLnAzLnkpO1xuICAgIH1cblxuICAgIGdldFBvaW50cygpIHtcbiAgICAgIHJldHVybiBbdGhpcy5wMSwgdGhpcy5wMiwgdGhpcy5wM107XG4gICAgfVxuICB9XG5cbiAgaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBfVHJpYW5nbGU7XG4gIH1cblxuICBUcmlhbmdsZSA9IF9UcmlhbmdsZTtcbn0pKCk7XG4iXX0=
