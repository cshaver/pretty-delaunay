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

var Color;

(function () {
  'use strict';
  // color helper functions

  Color = {

    hexToRgba: function hexToRgba(hex) {
      hex = hex.replace('#', '');
      var r = parseInt(hex.substring(0, 2), 16);
      var g = parseInt(hex.substring(2, 4), 16);
      var b = parseInt(hex.substring(4, 6), 16);

      return 'rgba(' + r + ',' + g + ',' + b + ',1)';
    },

    hexToRgbaArray: function hexToRgbaArray(hex) {
      hex = hex.replace('#', '');
      var r = parseInt(hex.substring(0, 2), 16);
      var g = parseInt(hex.substring(2, 4), 16);
      var b = parseInt(hex.substring(4, 6), 16);

      return [r, g, b];
    },

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
    rgbToHsla: function rgbToHsla(rgb) {
      var r = rgb[0] / 255;
      var g = rgb[1] / 255;
      var b = rgb[2] / 255;
      var max = Math.max(r, g, b);
      var min = Math.min(r, g, b);
      var h;
      var s;
      var l = (max + min) / 2;

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
    },

    hslaAdjustAlpha: function hslaAdjustAlpha(color, alpha) {
      color = color.split(',');

      if (typeof alpha !== 'function') {
        color[3] = alpha;
      } else {
        color[3] = alpha(parseInt(color[3]));
      }

      color[3] += ')';
      return color.join(',');
    },

    hslaAdjustLightness: function hslaAdjustLightness(color, lightness) {
      color = color.split(',');

      if (typeof lightness !== 'function') {
        color[2] = lightness;
      } else {
        color[2] = lightness(parseInt(color[2]));
      }

      color[2] += '%';
      return color.join(',');
    },

    rgbToHex: function rgbToHex(rgb) {
      if (typeof rgb === 'string') {
        rgb = rgb.replace('rgb(', '').replace(')', '').split(',');
      }
      rgb = rgb.map(function (x) {
        x = parseInt(x).toString(16);
        return x.length === 1 ? '0' + x : x;
      });
      return rgb.join('');
    }
  };

  if (typeof module !== 'undefined') {
    module.exports = Color;
  }
})();

},{}],"/Users/cshaver/Personal/pretty-delaunay/lib/point.js":[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Point;

(function () {
  'use strict';

  var Color = Color || require('./color');

  /**
   * Represents a point
   * @class
   */

  var _Point = function () {
    /**
     * Point consists x and y
     * @constructor
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

},{"./color":"/Users/cshaver/Personal/pretty-delaunay/lib/color.js"}],"/Users/cshaver/Personal/pretty-delaunay/lib/pointMap.js":[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var PointMap;

(function () {
  'use strict';

  var Point = Point || require('./point');

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
      value: function removeCoord(x, y) {
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

},{"./point":"/Users/cshaver/Personal/pretty-delaunay/lib/point.js"}],"/Users/cshaver/Personal/pretty-delaunay/lib/pretty-delaunay.js":[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * TODO:
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
        this.createHoverShadowCanvas();

        this.canvas.addEventListener('mousemove', function (e) {
          var rect = canvas.getBoundingClientRect();
          _this.mousePosition = new Point(e.clientX - rect.left, e.clientY - rect.top);
          _this.hover();
        }, false);

        this.canvas.addEventListener('mouseout', function () {
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
      key: 'createHoverShadowCanvas',
      value: function createHoverShadowCanvas() {
        this.hoverShadowCanvas = document.createElement('canvas');
        this.canvas.parentElement.appendChild(this.hoverShadowCanvas);
        this.shadowCtx = this.hoverShadowCanvas.getContext('2d');

        this.hoverShadowCanvas.style.display = 'none';
      }
    }, {
      key: 'generateNewPoints',
      value: function generateNewPoints(min, max, minEdge, maxEdge, multiplier) {
        // defaults to generic number of points based on canvas dimensions
        // this generally looks pretty nice
        var area = this.canvas.width * this.canvas.height;
        var perimeter = (this.canvas.width + this.canvas.height) * 2;

        multiplier = multiplier || this.options.multiplier;

        min = min > 0 ? Math.ceil(min) : Math.max(Math.ceil(area / 1250 * multiplier), 50);
        max = max > 0 ? Math.ceil(max) : Math.max(Math.ceil(area / 500 * multiplier), 50);

        minEdge = minEdge > 0 ? Math.ceil(minEdge) : Math.max(Math.ceil(perimeter / 125 * multiplier), 5);
        maxEdge = maxEdge > 0 ? Math.ceil(maxEdge) : Math.max(Math.ceil(perimeter / 50 * multiplier), 5);

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
        var center = new Point(Math.round(this.canvas.width / 2), Math.round(this.canvas.height / 2));
        for (var i = 0; i < numPoints; i++) {
          // generate a new point with random coords
          // re-generate the point if it already exists in pointmap (max 10 times)
          var point;
          var j = 0;
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

        var minX = Math.ceil(Math.sqrt(this.canvas.width));
        var maxX = Math.ceil(this.canvas.width - Math.sqrt(this.canvas.width));

        var minY = Math.ceil(Math.sqrt(this.canvas.height));
        var maxY = Math.ceil(this.canvas.height - Math.sqrt(this.canvas.height));

        var minRadius = Math.ceil(Math.max(this.canvas.height, this.canvas.width) / Math.max(Math.sqrt(this.numGradients), 2));
        var maxRadius = Math.ceil(Math.max(this.canvas.height, this.canvas.width) / Math.max(Math.log(this.numGradients), 1));

        // helper random functions
        var randomCanvasX = Random.randomNumberFunction(minX, maxX);
        var randomCanvasY = Random.randomNumberFunction(minY, maxY);
        var randomCanvasRadius = Random.randomNumberFunction(minRadius, maxRadius);

        // generate circle1 origin and radius
        var x0;
        var y0;
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

        if (this.hoverShadowCanvas) {
          this.hoverShadowCanvas.width = this.width = parent.offsetWidth;
          this.hoverShadowCanvas.height = this.height = parent.offsetHeight;
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

        var i;

        if (this.options.resizeMode === 'scalePoints') {
          // scale all points to new max dimensions
          for (i = 0; i < this.points.length; i++) {
            this.points[i].rescale(xMin, xMax, yMin, yMax, 0, this.canvas.width, 0, this.canvas.height);
          }
        } else {
          this.generateNewPoints();
        }

        this.triangulate();

        // rescale position of radial gradient circles
        for (i = 0; i < this.radialGradients.length; i++) {
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
          var rgb = this.mousePosition.canvasColorAtPoint(this.shadowImageData, 'rgb');
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
      value: function renderNewTriangles(min, max, minEdge, maxEdge, multiplier) {
        this.generateNewPoints(min, max, minEdge, maxEdge, multiplier);
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

          if (this.hoverShadowCanvas) {
            var color = '#' + ('000000' + i.toString(16)).slice(-6);
            this.triangles[i].render(this.shadowCtx, color, false);
          }
        }

        if (this.hoverShadowCanvas) {
          this.shadowImageData = this.shadowCtx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        }
      }

      // renders the points of the triangles

    }, {
      key: 'renderPoints',
      value: function renderPoints() {
        for (var i = 0; i < this.points.length; i++) {
          var color = this.options.pointColor(this.points[i].canvasColorAtPoint(this.gradientImageData));
          this.points[i].render(this.ctx, color);
        }
      }

      // draws the circles that define the gradients

    }, {
      key: 'renderGradientCircles',
      value: function renderGradientCircles() {
        for (var i = 0; i < this.radialGradients.length; i++) {
          this.ctx.beginPath();
          this.ctx.arc(this.radialGradients[i].x0, this.radialGradients[i].y0, this.radialGradients[i].r0, 0, Math.PI * 2, true);
          var center1 = new Point(this.radialGradients[i].x0, this.radialGradients[i].y0);
          this.ctx.strokeStyle = center1.canvasColorAtPoint(this.gradientImageData);
          this.ctx.stroke();

          this.ctx.beginPath();
          this.ctx.arc(this.radialGradients[i].x1, this.radialGradients[i].y1, this.radialGradients[i].r1, 0, Math.PI * 2, true);
          var center2 = new Point(this.radialGradients[i].x1, this.radialGradients[i].y1);
          this.ctx.strokeStyle = center2.canvasColorAtPoint(this.gradientImageData);
          this.ctx.stroke();
        }
      }

      // render triangle centroids

    }, {
      key: 'renderCentroids',
      value: function renderCentroids() {
        for (var i = 0; i < this.triangles.length; i++) {
          var color = this.options.centroidColor(this.triangles[i].colorAtCentroid(this.gradientImageData));
          this.triangles[i].centroid().render(this.ctx, color);
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
          multiplier: 0.5,

          colors: ['hsla(0, 0%, 100%, 1)', 'hsla(0, 0%, 50%, 1)', 'hsla(0, 0%, 0%, 1)'],

          resizeMode: 'scalePoints',
          // 'newPoints' - generates a new set of points for the new size
          // 'scalePoints' - linearly scales existing points and re-triangulates

          // events triggered when the center of the background
          // is greater or less than 50 lightness in hsla
          // intended to adjust some text that is on top
          onDarkBackground: function onDarkBackground() {
            return;
          },
          onLightBackground: function onLightBackground() {
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

  var Point = Point || require('./point');

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

},{"./point":"/Users/cshaver/Personal/pretty-delaunay/lib/point.js"}],"/Users/cshaver/Personal/pretty-delaunay/lib/triangle.js":[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Triangle;

(function () {
  'use strict';

  var Point = Point || require('./point');

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

},{"./point":"/Users/cshaver/Personal/pretty-delaunay/lib/point.js"}]},{},["/Users/cshaver/Personal/pretty-delaunay/lib/pretty-delaunay.js"])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJsaWIvX2RlbGF1bmF5LmpzIiwibGliL2NvbG9yLmpzIiwibGliL3BvaW50LmpzIiwibGliL3BvaW50TWFwLmpzIiwibGliL3ByZXR0eS1kZWxhdW5heS5qcyIsImxpYi9yYW5kb20uanMiLCJsaWIvdHJpYW5nbGUuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7QUNDQSxJQUFJLFFBQVEsQ0FBQzs7QUFFYixDQUFDLFlBQVc7QUFDVixjQUFZLENBQUM7O0FBRWIsTUFBSSxPQUFPLEdBQUcsR0FBRyxHQUFHLFNBQVMsQ0FBQzs7QUFFOUIsV0FBUyxhQUFhLENBQUMsUUFBUSxFQUFFO0FBQy9CLFFBQUksSUFBSSxHQUFHLE1BQU0sQ0FBQyxpQkFBaUI7UUFDL0IsSUFBSSxHQUFHLE1BQU0sQ0FBQyxpQkFBaUI7UUFDL0IsSUFBSSxHQUFHLE1BQU0sQ0FBQyxpQkFBaUI7UUFDL0IsSUFBSSxHQUFHLE1BQU0sQ0FBQyxpQkFBaUI7UUFDL0IsQ0FBQztRQUFFLEVBQUU7UUFBRSxFQUFFO1FBQUUsSUFBSTtRQUFFLElBQUk7UUFBRSxJQUFJLENBQUM7O0FBRWhDLFNBQUksQ0FBQyxHQUFHLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEdBQUk7QUFDOUIsVUFBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxFQUFFLElBQUksR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDaEQsVUFBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxFQUFFLElBQUksR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDaEQsVUFBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxFQUFFLElBQUksR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDaEQsVUFBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxFQUFFLElBQUksR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7S0FDakQ7O0FBRUQsTUFBRSxHQUFHLElBQUksR0FBRyxJQUFJLENBQUM7QUFDakIsTUFBRSxHQUFHLElBQUksR0FBRyxJQUFJLENBQUM7QUFDakIsUUFBSSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO0FBQ3hCLFFBQUksR0FBRyxJQUFJLEdBQUcsRUFBRSxHQUFHLEdBQUcsQ0FBQztBQUN2QixRQUFJLEdBQUcsSUFBSSxHQUFHLEVBQUUsR0FBRyxHQUFHLENBQUM7O0FBRXZCLFdBQU8sQ0FDTCxDQUFDLElBQUksR0FBRyxFQUFFLEdBQUcsSUFBSSxFQUFFLElBQUksR0FBUSxJQUFJLENBQUMsRUFDcEMsQ0FBQyxJQUFJLEVBQWMsSUFBSSxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUMsRUFDcEMsQ0FBQyxJQUFJLEdBQUcsRUFBRSxHQUFHLElBQUksRUFBRSxJQUFJLEdBQVEsSUFBSSxDQUFDLENBQ3JDLENBQUM7R0FDSDs7QUFFRCxXQUFTLFlBQVksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUU7QUFDdkMsUUFBSSxFQUFFLEdBQUcsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNuQixFQUFFLEdBQUcsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNuQixFQUFFLEdBQUcsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNuQixFQUFFLEdBQUcsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNuQixFQUFFLEdBQUcsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNuQixFQUFFLEdBQUcsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNuQixRQUFRLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDO1FBQzVCLFFBQVEsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUM7UUFDNUIsRUFBRTtRQUFFLEVBQUU7UUFBRSxFQUFFO1FBQUUsRUFBRTtRQUFFLEdBQUc7UUFBRSxHQUFHO1FBQUUsR0FBRztRQUFFLEdBQUc7UUFBRSxFQUFFO1FBQUUsRUFBRTs7O0FBQUMsQUFHL0MsUUFBRyxRQUFRLEdBQUcsT0FBTyxJQUFJLFFBQVEsR0FBRyxPQUFPLEVBQ3pDLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQzs7QUFFN0MsUUFBRyxRQUFRLEdBQUcsT0FBTyxFQUFFO0FBQ3JCLFFBQUUsR0FBSSxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQSxJQUFLLEVBQUUsR0FBRyxFQUFFLENBQUEsQ0FBQyxBQUFDLENBQUM7QUFDL0IsU0FBRyxHQUFHLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQSxHQUFJLEdBQUcsQ0FBQztBQUN0QixTQUFHLEdBQUcsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFBLEdBQUksR0FBRyxDQUFDO0FBQ3RCLFFBQUUsR0FBSSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUEsR0FBSSxHQUFHLENBQUM7QUFDdEIsUUFBRSxHQUFJLEVBQUUsSUFBSSxFQUFFLEdBQUcsR0FBRyxDQUFBLEFBQUMsR0FBRyxHQUFHLENBQUM7S0FDN0IsTUFFSSxJQUFHLFFBQVEsR0FBRyxPQUFPLEVBQUU7QUFDMUIsUUFBRSxHQUFJLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFBLElBQUssRUFBRSxHQUFHLEVBQUUsQ0FBQSxDQUFDLEFBQUMsQ0FBQztBQUMvQixTQUFHLEdBQUcsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFBLEdBQUksR0FBRyxDQUFDO0FBQ3RCLFNBQUcsR0FBRyxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUEsR0FBSSxHQUFHLENBQUM7QUFDdEIsUUFBRSxHQUFJLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQSxHQUFJLEdBQUcsQ0FBQztBQUN0QixRQUFFLEdBQUksRUFBRSxJQUFJLEVBQUUsR0FBRyxHQUFHLENBQUEsQUFBQyxHQUFHLEdBQUcsQ0FBQztLQUM3QixNQUVJO0FBQ0gsUUFBRSxHQUFJLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFBLElBQUssRUFBRSxHQUFHLEVBQUUsQ0FBQSxDQUFDLEFBQUMsQ0FBQztBQUMvQixRQUFFLEdBQUksRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUEsSUFBSyxFQUFFLEdBQUcsRUFBRSxDQUFBLENBQUMsQUFBQyxDQUFDO0FBQy9CLFNBQUcsR0FBRyxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUEsR0FBSSxHQUFHLENBQUM7QUFDdEIsU0FBRyxHQUFHLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQSxHQUFJLEdBQUcsQ0FBQztBQUN0QixTQUFHLEdBQUcsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFBLEdBQUksR0FBRyxDQUFDO0FBQ3RCLFNBQUcsR0FBRyxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUEsR0FBSSxHQUFHLENBQUM7QUFDdEIsUUFBRSxHQUFJLENBQUMsRUFBRSxHQUFHLEdBQUcsR0FBRyxFQUFFLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLENBQUEsSUFBSyxFQUFFLEdBQUcsRUFBRSxDQUFBLEFBQUMsQ0FBQztBQUNwRCxRQUFFLEdBQUksQUFBQyxRQUFRLEdBQUcsUUFBUSxHQUN4QixFQUFFLElBQUksRUFBRSxHQUFHLEdBQUcsQ0FBQSxBQUFDLEdBQUcsR0FBRyxHQUNyQixFQUFFLElBQUksRUFBRSxHQUFHLEdBQUcsQ0FBQSxBQUFDLEdBQUcsR0FBRyxDQUFDO0tBQ3pCOztBQUVELE1BQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDO0FBQ2IsTUFBRSxHQUFHLEVBQUUsR0FB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Q0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7O0FBQUEsQUFHckQsYUFBTyxJQUFJLENBQUM7S0FDYjtBQUNELFlBQVEsRUFBRSxrQkFBUyxHQUFHLEVBQUUsQ0FBQyxFQUFFOztBQUV6QixVQUFHLEFBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQ3hELENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxBQUFDLElBQ3pELENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxBQUFDLElBQ3pELENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxBQUFDLEVBQzNELE9BQU8sSUFBSSxDQUFDOztBQUVkLFVBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1VBQ3pCLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztVQUN6QixDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7VUFDekIsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1VBQ3pCLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDOzs7QUFBQyxBQUd0QixVQUFHLENBQUMsS0FBSyxHQUFHLEVBQ1YsT0FBTyxJQUFJLENBQUM7O0FBRWQsVUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQSxBQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUEsQUFBQyxDQUFBLEdBQUksQ0FBQztVQUN6RCxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQSxBQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUEsQUFBQyxD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ckIsWUFBSSxLQUFLLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBLElBQUssS0FBSyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQSxBQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQSxJQUFLLEtBQUssQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUEsQUFBQyxDQUFBLElBQ25HLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUEsSUFBSyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQSxBQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQSxJQUFLLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBLEFBQUMsQ0FBQSxBQUFDLENBQUM7QUFDbEgsWUFBSSxJQUFJLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBLElBQUssS0FBSyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQSxBQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQSxJQUFLLEtBQUssQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUEsQUFBQyxDQUFBLElBQ25HLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUEsSUFBSyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQSxBQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQSxJQUFLLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBLEFBQUMsQ0FBQSxBQUFDLENBQUM7QUFDakgsWUFBSSxLQUFLLEdBQUcsR0FBRyxHQUFHLEtBQUssR0FBRyxJQUFJLENBQUM7O0FBRS9CLGVBQVEsS0FBSyxHQUFHLENBQUMsSUFBSSxJQUFJLEdBQUcsQ0FBQyxJQUFJLEtBQUssR0FBRyxDQUFDLENBQUU7T0FDN0M7Ozs7Ozs7Ozs7b0NBT2EsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRTtBQUM1QyxZQUFJLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7QUFDaEQsWUFBSSxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO0FBQ2hELFlBQUksQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUM7O0FBQUMsQUFFaEQsWUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO09BQ2pCOzs7NkJBRU07QUFDTCxlQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztPQUNsRDs7OzZCQUVNO0FBQ0wsZUFBTyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7T0FDbEQ7Ozs2QkFFTTtBQUNMLGVBQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO09BQ2xEOzs7NkJBRU07QUFDTCxlQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztPQUNsRDs7O2tDQUVXO0FBQ1YsZUFBTyxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7T0FDcEM7OztXQXhIRyxTQUFTOzs7QUEySGYsTUFBSSxPQUFPLE1BQU0sS0FBSyxXQUFXLEVBQUU7QUFDakMsVUFBTSxDQUFDLE9BQU8sR0FBRyxTQUFTLENBQUM7R0FDNUI7O0FBRUQsVUFBUSxHQUFHLFNBQVMsQ0FBQztDQUN0QixDQUFBLEVBQUcsQ0FBQyIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvKiBGcm9tIGh0dHBzOi8vZ2l0aHViLmNvbS9pcm9ud2FsbGFieS9kZWxhdW5heSAqL1xudmFyIERlbGF1bmF5O1xuXG4oZnVuY3Rpb24oKSB7XG4gIFwidXNlIHN0cmljdFwiO1xuXG4gIHZhciBFUFNJTE9OID0gMS4wIC8gMTA0ODU3Ni4wO1xuXG4gIGZ1bmN0aW9uIHN1cGVydHJpYW5nbGUodmVydGljZXMpIHtcbiAgICB2YXIgeG1pbiA9IE51bWJlci5QT1NJVElWRV9JTkZJTklUWSxcbiAgICAgICAgeW1pbiA9IE51bWJlci5QT1NJVElWRV9JTkZJTklUWSxcbiAgICAgICAgeG1heCA9IE51bWJlci5ORUdBVElWRV9JTkZJTklUWSxcbiAgICAgICAgeW1heCA9IE51bWJlci5ORUdBVElWRV9JTkZJTklUWSxcbiAgICAgICAgaSwgZHgsIGR5LCBkbWF4LCB4bWlkLCB5bWlkO1xuXG4gICAgZm9yKGkgPSB2ZXJ0aWNlcy5sZW5ndGg7IGktLTsgKSB7XG4gICAgICBpZih2ZXJ0aWNlc1tpXVswXSA8IHhtaW4pIHhtaW4gPSB2ZXJ0aWNlc1tpXVswXTtcbiAgICAgIGlmKHZlcnRpY2VzW2ldWzBdID4geG1heCkgeG1heCA9IHZlcnRpY2VzW2ldWzBdO1xuICAgICAgaWYodmVydGljZXNbaV1bMV0gPCB5bWluKSB5bWluID0gdmVydGljZXNbaV1bMV07XG4gICAgICBpZih2ZXJ0aWNlc1tpXVsxXSA+IHltYXgpIHltYXggPSB2ZXJ0aWNlc1tpXVsxXTtcbiAgICB9XG5cbiAgICBkeCA9IHhtYXggLSB4bWluO1xuICAgIGR5ID0geW1heCAtIHltaW47XG4gICAgZG1heCA9IE1hdGgubWF4KGR4LCBkeSk7XG4gICAgeG1pZCA9IHhtaW4gKyBkeCAqIDAuNTtcbiAgICB5bWlkID0geW1pbiArIGR5ICogMC41O1xuXG4gICAgcmV0dXJuIFtcbiAgICAgIFt4bWlkIC0gMjAgKiBkbWF4LCB5bWlkIC0gICAgICBkbWF4XSxcbiAgICAgIFt4bWlkICAgICAgICAgICAgLCB5bWlkICsgMjAgKiBkbWF4XSxcbiAgICAgIFt4bWlkICsgMjAgKiBkbWF4LCB5bWlkIC0gICAgICBkbWF4XVxuICAgIF07XG4gIH1cblxuICBmdW5jdGlvbiBjaXJjdW1jaXJjbGUodmVydGljZXMsIGksIGosIGspIHtcbiAgICB2YXIgeDEgPSB2ZXJ0aWNlc1tpXVswXSxcbiAgICAgICAgeTEgPSB2ZXJ0aWNlc1tpXVsxXSxcbiAgICAgICAgeDIgPSB2ZXJ0aWNlc1tqXVswXSxcbiAgICAgICAgeTIgPSB2ZXJ0aWNlc1tqXVsxXSxcbiAgICAgICAgeDMgPSB2ZXJ0aWNlc1trXVswXSxcbiAgICAgICAgeTMgPSB2ZXJ0aWNlc1trXVsxXSxcbiAgICAgICAgZmFic3kxeTIgPSBNYXRoLmFicyh5MSAtIHkyKSxcbiAgICAgICAgZmFic3kyeTMgPSBNYXRoLmFicyh5MiAtIHkzKSxcbiAgICAgICAgeGMsIHljLCBtMSwgbTIsIG14MSwgbXgyLCBteTEsIG15MiwgZHgsIGR5O1xuXG4gICAgLyogQ2hlY2sgZm9yIGNvaW5jaWRlbnQgcG9pbnRzICovXG4gICAgaWYoZmFic3kxeTIgPCBFUFNJTE9OICYmIGZhYnN5MnkzIDwgRVBTSUxPTilcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkVlayEgQ29pbmNpZGVudCBwb2ludHMhXCIpO1xuXG4gICAgaWYoZmFic3kxeTIgPCBFUFNJTE9OKSB7XG4gICAgICBtMiAgPSAtKCh4MyAtIHgyKSAvICh5MyAtIHkyKSk7XG4gICAgICBteDIgPSAoeDIgKyB4MykgLyAyLjA7XG4gICAgICBteTIgPSAoeTIgKyB5MykgLyAyLjA7XG4gICAgICB4YyAgPSAoeDIgKyB4MSkgLyAyLjA7XG4gICAgICB5YyAgPSBtMiAqICh4YyAtIG14MikgKyBteTI7XG4gICAgfVxuXG4gICAgZWxzZSBpZihmYWJzeTJ5MyA8IEVQU0lMT04pIHtcbiAgICAgIG0xICA9IC0oKHgyIC0geDEpIC8gKHkyIC0geTEpKTtcbiAgICAgIG14MSA9ICh4MSArIHgyKSAvIDIuMDtcbiAgICAgIG15MSA9ICh5MSArIHkyKSAvIDIuMDtcbiAgICAgIHhjICA9ICh4MyArIHgyKSAvIDIuMDtcbiAgICAgIHljICA9IG0xICogKHhjIC0gbXgxKSArIG15MTtcbiAgICB9XG5cbiAgICBlbHNlIHtcbiAgICAgIG0xICA9IC0oKHgyIC0geDEpIC8gKHkyIC0geTEpKTtcbiAgICAgIG0yICA9IC0oKHgzIC0geDIpIC8gKHkzIC0geTIpKTtcbiAgICAgIG14MSA9ICh4MSArIHgyKSAvIDIuMDtcbiAgICAgIG14MiA9ICh4MiArIHgzKSAvIDIuMDtcbiAgICAgIG15MSA9ICh5MSArIHkyKSAvIDIuMDtcbiAgICAgIG15MiA9ICh5MiArIHkzKSAvIDIuMDtcbiAgICAgIHhjICA9IChtMSAqIG14MSAtIG0yICogbXgyICsgbXkyIC0gbXkxKSAvIChtMSAtIG0yKTtcbiAgICAgIHljICA9IChmYWJzeTF5MiA+IGZhYnN5MnkzKSA/XG4gICAgICAgIG0xICogKHhjIC0gbXgxKSArIG15MSA6XG4gICAgICAgIG0yICogKHhjIC0gbXgyKSArIG15MjtcbiAgICB9XG5cbiAgICBkeCA9IHgyIC0geGM7XG4gICAgZHkgPSB5MiAtIHljO1xuICAgIHJldHVybiB7aTogaSwgajogaiwgazogaywgeDogeGMsIHk6IHljLCByOiBkeCAqIGR4ICsgZHkgKiBkeX07XG4gIH1cblxuICBmdW5jdGlvbiBkZWR1cChlZGdlcykge1xuICAgIHZhciBpLCBqLCBhLCBiLCBtLCBuO1xuXG4gICAgZm9yKGogPSBlZGdlcy5sZW5ndGg7IGo7ICkge1xuICAgICAgYiA9IGVkZ2VzWy0tal07XG4gICAgICBhID0gZWRnZXNbLS1qXTtcblxuICAgICAgZm9yKGkgPSBqOyBpOyApIHtcbiAgICAgICAgbiA9IGVkZ2VzWy0taV07XG4gICAgICAgIG0gPSBlZGdlc1stLWldO1xuXG4gICAgICAgIGlmKChhID09PSBtICYmIGIgPT09IG4pIHx8IChhID09PSBuICYmIGIgPT09IG0pKSB7XG4gICAgICAgICAgZWRnZXMuc3BsaWNlKGosIDIpO1xuICAgICAgICAgIGVkZ2VzLnNwbGljZShpLCAyKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIERlbGF1bmF5ID0ge1xuICAgIHRyaWFuZ3VsYXRlOiBmdW5jdGlvbih2ZXJ0aWNlcywga2V5KSB7XG4gICAgICB2YXIgbiA9IHZlcnRpY2VzLmxlbmd0aCxcbiAgICAgICAgICBpLCBqLCBpbmRpY2VzLCBzdCwgb3BlbiwgY2xvc2VkLCBlZGdlcywgZHgsIGR5LCBhLCBiLCBjO1xuXG4gICAgICAvKiBCYWlsIGlmIHRoZXJlIGFyZW4ndCBlbm91Z2ggdmVydGljZXMgdG8gZm9ybSBhbnkgdHJpYW5nbGVzLiAqL1xuICAgICAgaWYobiA8IDMpXG4gICAgICAgIHJldHVybiBbXTtcblxuICAgICAgLyogU2xpY2Ugb3V0IHRoZSBhY3R1YWwgdmVydGljZXMgZnJvbSB0aGUgcGFzc2VkIG9iamVjdHMuIChEdXBsaWNhdGUgdGhlXG4gICAgICAgKiBhcnJheSBldmVuIGlmIHdlIGRvbid0LCB0aG91Z2gsIHNpbmNlIHdlIG5lZWQgdG8gbWFrZSBhIHN1cGVydHJpYW5nbGVcbiAgICAgICAqIGxhdGVyIG9uISkgKi9cbiAgICAgIHZlcnRpY2VzID0gdmVydGljZXMuc2xpY2UoMCk7XG5cbiAgICAgIGlmKGtleSlcbiAgICAgICAgZm9yKGkgPSBuOyBpLS07IClcbiAgICAgICAgICB2ZXJ0aWNlc1tpXSA9IHZlcnRpY2VzW2ldW2tleV07XG5cbiAgICAgIC8qIE1ha2UgYW4gYXJyYXkgb2YgaW5kaWNlcyBpbnRvIHRoZSB2ZXJ0ZXggYXJyYXksIHNvcnRlZCBieSB0aGVcbiAgICAgICAqIHZlcnRpY2VzJyB4LXBvc2l0aW9uLiAqL1xuICAgICAgaW5kaWNlcyA9IG5ldyBBcnJheShuKTtcblxuICAgICAgZm9yKGkgPSBuOyBpLS07IClcbiAgICAgICAgaW5kaWNlc1tpXSA9IGk7XG5cbiAgICAgIGluZGljZXMuc29ydChmdW5jdGlvbihpLCBqKSB7XG4gICAgICAgIHJldHVybiB2ZXJ0aWNlc1tqXVswXSAtIHZlcnRpY2VzW2ldWzBdO1xuICAgICAgfSk7XG5cbiAgICAgIC8qIE5leHQsIGZpbmQgdGhlIHZlcnRpY2VzIG9mIHRoZSBzdXBlcnRyaWFuZ2xlICh3aGljaCBjb250YWlucyBhbGwgb3RoZXJcbiAgICAgICAqIHRyaWFuZ2xlcyksIGFuZCBhcHBlbmQgdGhlbSBvbnRvIHRoZSBlbmQgb2YgYSAoY29weSBvZikgdGhlIHZlcnRleFxuICAgICAgICogYXJyYXkuICovXG4gICAgICBzdCA9IHN1cGVydHJpYW5nbGUodmVydGljZXMpO1xuICAgICAgdmVydGljZXMucHVzaChzdFswXSwgc3RbMV0sIHN0WzJdKTtcblxuICAgICAgLyogSW5pdGlhbGl6ZSB0aGUgb3BlbiBsaXN0IChjb250YWluaW5nIHRoZSBzdXBlcnRyaWFuZ2xlIGFuZCBub3RoaW5nXG4gICAgICAgKiBlbHNlKSBhbmQgdGhlIGNsb3NlZCBsaXN0ICh3aGljaCBpcyBlbXB0eSBzaW5jZSB3ZSBoYXZuJ3QgcHJvY2Vzc2VkXG4gICAgICAgKiBhbnkgdHJpYW5nbGVzIHlldCkuICovXG4gICAgICBvcGVuICAgPSBbY2lyY3VtY2lyY2xlKHZlcnRpY2VzLCBuICsgMCwgbiArIDEsIG4gKyAyKV07XG4gICAgICBjbG9zZWQgPSBbXTtcbiAgICAgIGVkZ2VzICA9IFtdO1xuXG4gICAgICAvKiBJbmNyZW1lbnRhbGx5IGFkZCBlYWNoIHZlcnRleCB0byB0aGUgbWVzaC4gKi9cbiAgICAgIGZvcihpID0gaW5kaWNlcy5sZW5ndGg7IGktLTsgZWRnZXMubGVuZ3RoID0gMCkge1xuICAgICAgICBjID0gaW5kaWNlc1tpXTtcblxuICAgICAgICAvKiBGb3IgZWFjaCBvcGVuIHRyaWFuZ2xlLCBjaGVjayB0byBzZWUgaWYgdGhlIGN1cnJlbnQgcG9pbnQgaXNcbiAgICAgICAgICogaW5zaWRlIGl0J3MgY2lyY3VtY2lyY2xlLiBJZiBpdCBpcywgcmVtb3ZlIHRoZSB0cmlhbmdsZSBhbmQgYWRkXG4gICAgICAgICAqIGl0J3MgZWRnZXMgdG8gYW4gZWRnZSBsaXN0LiAqL1xuICAgICAgICBmb3IoaiA9IG9wZW4ubGVuZ3RoOyBqLS07ICkge1xuICAgICAgICAgIC8qIElmIHRoaXMgcG9pbnQgaXMgdG8gdGhlIHJpZ2h0IG9mIHRoaXMgdHJpYW5nbGUncyBjaXJjdW1jaXJjbGUsXG4gICAgICAgICAgICogdGhlbiB0aGlzIHRyaWFuZ2xlIHNob3VsZCBuZXZlciBnZXQgY2hlY2tlZCBhZ2Fpbi4gUmVtb3ZlIGl0XG4gICAgICAgICAgICogZnJvbSB0aGUgb3BlbiBsaXN0LCBhZGQgaXQgdG8gdGhlIGNsb3NlZCBsaXN0LCBhbmQgc2tpcC4gKi9cbiAgICAgICAgICBkeCA9IHZlcnRpY2VzW2NdWzBdIC0gb3BlbltqXS54O1xuICAgICAgICAgIGlmKGR4ID4gMC4wICYmIGR4ICogZHggPiBvcGVuW2pdLnIpIHtcbiAgICAgICAgICAgIGNsb3NlZC5wdXNoKG9wZW5bal0pO1xuICAgICAgICAgICAgb3Blbi5zcGxpY2UoaiwgMSk7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvKiBJZiB3ZSdyZSBvdXRzaWRlIHRoZSBjaXJjdW1jaXJjbGUsIHNraXAgdGhpcyB0cmlhbmdsZS4gKi9cbiAgICAgICAgICBkeSA9IHZlcnRpY2VzW2NdWzFdIC0gb3BlbltqXS55O1xuICAgICAgICAgIGlmKGR4ICogZHggKyBkeSAqIGR5IC0gb3BlbltqXS5yID4gRVBTSUxPTilcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuXG4gICAgICAgICAgLyogUmVtb3ZlIHRoZSB0cmlhbmdsZSBhbmQgYWRkIGl0J3MgZWRnZXMgdG8gdGhlIGVkZ2UgbGlzdC4gKi9cbiAgICAgICAgICBlZGdlcy5wdXNoKFxuICAgICAgICAgICAgb3BlbltqXS5pLCBvcGVuW2pdLmosXG4gICAgICAgICAgICBvcGVuW2pdLmosIG9wZW5bal0uayxcbiAgICAgICAgICAgIG9wZW5bal0uaywgb3BlbltqXS5pXG4gICAgICAgICAgKTtcbiAgICAgICAgICBvcGVuLnNwbGljZShqLCAxKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8qIFJlbW92ZSBhbnkgZG91YmxlZCBlZGdlcy4gKi9cbiAgICAgICAgZGVkdXAoZWRnZXMpO1xuXG4gICAgICAgIC8qIEFkZCBhIG5ldyB0cmlhbmdsZSBmb3IgZWFjaCBlZGdlLiAqL1xuICAgICAgICBmb3IoaiA9IGVkZ2VzLmxlbmd0aDsgajsgKSB7XG4gICAgICAgICAgYiA9IGVkZ2VzWy0tal07XG4gICAgICAgICAgYSA9IGVkZ2VzWy0tal07XG4gICAgICAgICAgb3Blbi5wdXNoKGNpcmN1bWNpcmNsZSh2ZXJ0aWNlcywgYSwgYiwgYykpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8qIENvcHkgYW55IHJlbWFpbmluZyBvcGVuIHRyaWFuZ2xlcyB0byB0aGUgY2xvc2VkIGxpc3QsIGFuZCB0aGVuXG4gICAgICAgKiByZW1vdmUgYW55IHRyaWFuZ2xlcyB0aGF0IHNoYXJlIGEgdmVydGV4IHdpdGggdGhlIHN1cGVydHJpYW5nbGUsXG4gICAgICAgKiBidWlsZGluZyBhIGxpc3Qgb2YgdHJpcGxldHMgdGhhdCByZXByZXNlbnQgdHJpYW5nbGVzLiAqL1xuICAgICAgZm9yKGkgPSBvcGVuLmxlbmd0aDsgaS0tOyApXG4gICAgICAgIGNsb3NlZC5wdXNoKG9wZW5baV0pO1xuICAgICAgb3Blbi5sZW5ndGggPSAwO1xuXG4gICAgICBmb3IoaSA9IGNsb3NlZC5sZW5ndGg7IGktLTsgKVxuICAgICAgICBpZihjbG9zZWRbaV0uaSA8IG4gJiYgY2xvc2VkW2ldLmogPCBuICYmIGNsb3NlZFtpXS5rIDwgbilcbiAgICAgICAgICBvcGVuLnB1c2goY2xvc2VkW2ldLmksIGNsb3NlZFtpXS5qLCBjbG9zZWRbaV0uayk7XG5cbiAgICAgIC8qIFlheSwgd2UncmUgZG9uZSEgKi9cbiAgICAgIHJldHVybiBvcGVuO1xuICAgIH0sXG4gICAgY29udGFpbnM6IGZ1bmN0aW9uKHRyaSwgcCkge1xuICAgICAgLyogQm91bmRpbmcgYm94IHRlc3QgZmlyc3QsIGZvciBxdWljayByZWplY3Rpb25zLiAqL1xuICAgICAgaWYoKHBbMF0gPCB0cmlbMF1bMF0gJiYgcFswXSA8IHRyaVsxXVswXSAmJiBwWzBdIDwgdHJpWzJdWzBdKSB8fFxuICAgICAgICAgKHBbMF0gPiB0cmlbMF1bMF0gJiYgcFswXSA+IHRyaVsxXVswXSAmJiBwWzBdID4gdHJpWzJdWzBdKSB8fFxuICAgICAgICAgKHBbMV0gPCB0cmlbMF1bMV0gJiYgcFsxXSA8IHRyaVsxXVsxXSAmJiBwWzFdIDwgdHJpWzJdWzFdKSB8fFxuICAgICAgICAgKHBbMV0gPiB0cmlbMF1bMV0gJiYgcFsxXSA+IHRyaVsxXVsxXSAmJiBwWzFdID4gdHJpWzJdWzFdKSlcbiAgICAgICAgcmV0dXJuIG51bGw7XG5cbiAgICAgIHZhciBhID0gdHJpWzFdWzBdIC0gdHJpWzBdWzBdLFxuICAgICAgICAgIGIgPSB0cmlbMl1bMF0gLSB0cmlbMF1bMF0sXG4gICAgICAgICAgYyA9IHRyaVsxXVsxXSAtIHRyaVswXVsxXSxcbiAgICAgICAgICBkID0gdHJpWzJdWzFdIC0gdHJpWzBdWzFdLFxuICAgICAgICAgIGkgPSBhICogZCAtIGIgKiBjO1xuXG4gICAgICAvKiBEZWdlbmVyYXRlIHRyaS4gKi9cbiAgICAgIGlmKGkgPT09IDAuMClcbiAgICAgICAgcmV0dXJuIG51bGw7XG5cbiAgICAgIHZhciB1ID0gKGQgKiAocFswXSAtIHRyaVswXVswXSkgLSBiICogKHBbMV0gLSB0cmlbMF1bMV0pKSAvIGksXG4gICAgICAgICAgdiA9IChhICogKHBbMV0gLSB0cmlbMF1bMV0pIC0gYyAqIChwWzBdIC0gdHJpWzBdWzBdKSkgLyBpO1xuXG4gICAgICAvKiBJZiB3ZSdyZSBvdXRzaWRlIHRoZSB0cmksIGZhaWwuICovXG4gICAgICBpZih1IDwgMC4wIHx8IHYgPCAwLjAgfHwgKHUgKyB2KSA+IDEuMClcbiAgICAgICAgcmV0dXJuIG51bGw7XG5cbiAgICAgIHJldHVybiBbdSwgdl07XG4gICAgfVxuICB9O1xuXG4gIGlmKHR5cGVvZiBtb2R1bGUgIT09IFwidW5kZWZpbmVkXCIpXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBEZWxhdW5heTtcbn0pKCk7XG4iLCJ2YXIgQ29sb3I7XG5cbihmdW5jdGlvbigpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuICAvLyBjb2xvciBoZWxwZXIgZnVuY3Rpb25zXG4gIENvbG9yID0ge1xuXG4gICAgaGV4VG9SZ2JhOiBmdW5jdGlvbihoZXgpIHtcbiAgICAgIGhleCA9IGhleC5yZXBsYWNlKCcjJywnJyk7XG4gICAgICB2YXIgciA9IHBhcnNlSW50KGhleC5zdWJzdHJpbmcoMCwyKSwgMTYpO1xuICAgICAgdmFyIGcgPSBwYXJzZUludChoZXguc3Vic3RyaW5nKDIsNCksIDE2KTtcbiAgICAgIHZhciBiID0gcGFyc2VJbnQoaGV4LnN1YnN0cmluZyg0LDYpLCAxNik7XG5cbiAgICAgIHJldHVybiAncmdiYSgnICsgciArICcsJyArIGcgKyAnLCcgKyBiICsgJywxKSc7XG4gICAgfSxcblxuICAgIGhleFRvUmdiYUFycmF5OiBmdW5jdGlvbihoZXgpIHtcbiAgICAgIGhleCA9IGhleC5yZXBsYWNlKCcjJywnJyk7XG4gICAgICB2YXIgciA9IHBhcnNlSW50KGhleC5zdWJzdHJpbmcoMCwyKSwgMTYpO1xuICAgICAgdmFyIGcgPSBwYXJzZUludChoZXguc3Vic3RyaW5nKDIsNCksIDE2KTtcbiAgICAgIHZhciBiID0gcGFyc2VJbnQoaGV4LnN1YnN0cmluZyg0LDYpLCAxNik7XG5cbiAgICAgIHJldHVybiBbciwgZywgYl07XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvbnZlcnRzIGFuIFJHQiBjb2xvciB2YWx1ZSB0byBIU0wuIENvbnZlcnNpb24gZm9ybXVsYVxuICAgICAqIGFkYXB0ZWQgZnJvbSBodHRwOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0hTTF9jb2xvcl9zcGFjZS5cbiAgICAgKiBBc3N1bWVzIHIsIGcsIGFuZCBiIGFyZSBjb250YWluZWQgaW4gdGhlIHNldCBbMCwgMjU1XSBhbmRcbiAgICAgKiByZXR1cm5zIGgsIHMsIGFuZCBsIGluIHRoZSBzZXQgWzAsIDFdLlxuICAgICAqXG4gICAgICogQHBhcmFtICAgTnVtYmVyICByICAgICAgIFRoZSByZWQgY29sb3IgdmFsdWVcbiAgICAgKiBAcGFyYW0gICBOdW1iZXIgIGcgICAgICAgVGhlIGdyZWVuIGNvbG9yIHZhbHVlXG4gICAgICogQHBhcmFtICAgTnVtYmVyICBiICAgICAgIFRoZSBibHVlIGNvbG9yIHZhbHVlXG4gICAgICogQHJldHVybiAgQXJyYXkgICAgICAgICAgIFRoZSBIU0wgcmVwcmVzZW50YXRpb25cbiAgICAgKi9cbiAgICByZ2JUb0hzbGE6IGZ1bmN0aW9uKHJnYikge1xuICAgICAgdmFyIHIgPSByZ2JbMF0gLyAyNTU7XG4gICAgICB2YXIgZyA9IHJnYlsxXSAvIDI1NTtcbiAgICAgIHZhciBiID0gcmdiWzJdIC8gMjU1O1xuICAgICAgdmFyIG1heCA9IE1hdGgubWF4KHIsIGcsIGIpO1xuICAgICAgdmFyIG1pbiA9IE1hdGgubWluKHIsIGcsIGIpO1xuICAgICAgdmFyIGg7XG4gICAgICB2YXIgcztcbiAgICAgIHZhciBsID0gKG1heCArIG1pbikgLyAyO1xuXG4gICAgICBpZiAobWF4ID09PSBtaW4pIHtcbiAgICAgICAgaCA9IHMgPSAwOyAvLyBhY2hyb21hdGljXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgZCA9IG1heCAtIG1pbjtcbiAgICAgICAgcyA9IGwgPiAwLjUgPyBkIC8gKDIgLSBtYXggLSBtaW4pIDogZCAvIChtYXggKyBtaW4pO1xuICAgICAgICBzd2l0Y2ggKG1heCl7XG4gICAgICAgICAgY2FzZSByOiBoID0gKGcgLSBiKSAvIGQgKyAoZyA8IGIgPyA2IDogMCk7IGJyZWFrO1xuICAgICAgICAgIGNhc2UgZzogaCA9IChiIC0gcikgLyBkICsgMjsgYnJlYWs7XG4gICAgICAgICAgY2FzZSBiOiBoID0gKHIgLSBnKSAvIGQgKyA0OyBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBoIC89IDY7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiAnaHNsYSgnICsgTWF0aC5yb3VuZChoICogMzYwKSArICcsJyArIE1hdGgucm91bmQocyAqIDEwMCkgKyAnJSwnICsgTWF0aC5yb3VuZChsICogMTAwKSArICclLDEpJztcbiAgICB9LFxuXG4gICAgaHNsYUFkanVzdEFscGhhOiBmdW5jdGlvbihjb2xvciwgYWxwaGEpIHtcbiAgICAgIGNvbG9yID0gY29sb3Iuc3BsaXQoJywnKTtcblxuICAgICAgaWYgKHR5cGVvZiBhbHBoYSAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBjb2xvclszXSA9IGFscGhhO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29sb3JbM10gPSBhbHBoYShwYXJzZUludChjb2xvclszXSkpO1xuICAgICAgfVxuXG4gICAgICBjb2xvclszXSArPSAnKSc7XG4gICAgICByZXR1cm4gY29sb3Iuam9pbignLCcpO1xuICAgIH0sXG5cbiAgICBoc2xhQWRqdXN0TGlnaHRuZXNzOiBmdW5jdGlvbihjb2xvciwgbGlnaHRuZXNzKSB7XG4gICAgICBjb2xvciA9IGNvbG9yLnNwbGl0KCcsJyk7XG5cbiAgICAgIGlmICh0eXBlb2YgbGlnaHRuZXNzICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIGNvbG9yWzJdID0gbGlnaHRuZXNzO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29sb3JbMl0gPSBsaWdodG5lc3MocGFyc2VJbnQoY29sb3JbMl0pKTtcbiAgICAgIH1cblxuICAgICAgY29sb3JbMl0gKz0gJyUnO1xuICAgICAgcmV0dXJuIGNvbG9yLmpvaW4oJywnKTtcbiAgICB9LFxuXG4gICAgcmdiVG9IZXg6IGZ1bmN0aW9uKHJnYikge1xuICAgICAgaWYgKHR5cGVvZiByZ2IgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHJnYiA9IHJnYi5yZXBsYWNlKCdyZ2IoJywgJycpLnJlcGxhY2UoJyknLCAnJykuc3BsaXQoJywnKTtcbiAgICAgIH1cbiAgICAgIHJnYiA9IHJnYi5tYXAoZnVuY3Rpb24oeCkge1xuICAgICAgICB4ID0gcGFyc2VJbnQoeCkudG9TdHJpbmcoMTYpO1xuICAgICAgICByZXR1cm4gKHgubGVuZ3RoID09PSAxKSA/ICcwJyArIHggOiB4O1xuICAgICAgfSk7XG4gICAgICByZXR1cm4gcmdiLmpvaW4oJycpO1xuICAgIH0sXG4gIH07XG5cbiAgaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBDb2xvcjtcbiAgfVxuXG59KSgpO1xuIiwidmFyIFBvaW50O1xuXG4oZnVuY3Rpb24oKSB7XG4gICd1c2Ugc3RyaWN0JztcblxuICB2YXIgQ29sb3IgPSBDb2xvciB8fCByZXF1aXJlKCcuL2NvbG9yJyk7XG5cbiAgLyoqXG4gICAqIFJlcHJlc2VudHMgYSBwb2ludFxuICAgKiBAY2xhc3NcbiAgICovXG4gIGNsYXNzIF9Qb2ludCB7XG4gICAgLyoqXG4gICAgICogUG9pbnQgY29uc2lzdHMgeCBhbmQgeVxuICAgICAqIEBjb25zdHJ1Y3RvclxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSB4XG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IHlcbiAgICAgKiBvcjpcbiAgICAgKiBAcGFyYW0ge051bWJlcltdfSB4XG4gICAgICogd2hlcmUgeCBpcyBsZW5ndGgtMiBhcnJheVxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKHgsIHkpIHtcbiAgICAgIGlmIChBcnJheS5pc0FycmF5KHgpKSB7XG4gICAgICAgIHkgPSB4WzFdO1xuICAgICAgICB4ID0geFswXTtcbiAgICAgIH1cbiAgICAgIHRoaXMueCA9IHg7XG4gICAgICB0aGlzLnkgPSB5O1xuICAgICAgdGhpcy5yYWRpdXMgPSAxO1xuICAgICAgdGhpcy5jb2xvciA9ICdibGFjayc7XG4gICAgfVxuXG4gICAgLy8gZHJhdyB0aGUgcG9pbnRcbiAgICByZW5kZXIoY3R4LCBjb2xvcikge1xuICAgICAgY3R4LmJlZ2luUGF0aCgpO1xuICAgICAgY3R4LmFyYyh0aGlzLngsIHRoaXMueSwgdGhpcy5yYWRpdXMsIDAsIDIgKiBNYXRoLlBJLCBmYWxzZSk7XG4gICAgICBjdHguZmlsbFN0eWxlID0gY29sb3IgfHwgdGhpcy5jb2xvcjtcbiAgICAgIGN0eC5maWxsKCk7XG4gICAgICBjdHguY2xvc2VQYXRoKCk7XG4gICAgfVxuXG4gICAgLy8gY29udmVydHMgdG8gc3RyaW5nXG4gICAgLy8gcmV0dXJucyBzb21ldGhpbmcgbGlrZTpcbiAgICAvLyBcIihYLFkpXCJcbiAgICAvLyB1c2VkIGluIHRoZSBwb2ludG1hcCB0byBkZXRlY3QgdW5pcXVlIHBvaW50c1xuICAgIHRvU3RyaW5nKCkge1xuICAgICAgcmV0dXJuICcoJyArIHRoaXMueCArICcsJyArIHRoaXMueSArICcpJztcbiAgICB9XG5cbiAgICAvLyBncmFiIHRoZSBjb2xvciBvZiB0aGUgY2FudmFzIGF0IHRoZSBwb2ludFxuICAgIC8vIHJlcXVpcmVzIGltYWdlZGF0YSBmcm9tIGNhbnZhcyBzbyB3ZSBkb250IGdyYWJcbiAgICAvLyBlYWNoIHBvaW50IGluZGl2aWR1YWxseSwgd2hpY2ggaXMgcmVhbGx5IGV4cGVuc2l2ZVxuICAgIGNhbnZhc0NvbG9yQXRQb2ludChpbWFnZURhdGEsIGNvbG9yU3BhY2UpIHtcbiAgICAgIGNvbG9yU3BhY2UgPSBjb2xvclNwYWNlIHx8ICdoc2xhJztcbiAgICAgIC8vIG9ubHkgZmluZCB0aGUgY2FudmFzIGNvbG9yIGlmIHdlIGRvbnQgYWxyZWFkeSBrbm93IGl0XG4gICAgICBpZiAoIXRoaXMuX2NhbnZhc0NvbG9yKSB7XG4gICAgICAgIC8vIGltYWdlRGF0YSBhcnJheSBpcyBmbGF0LCBnb2VzIGJ5IHJvd3MgdGhlbiBjb2xzLCBmb3VyIHZhbHVlcyBwZXIgcGl4ZWxcbiAgICAgICAgdmFyIGlkeCA9IChNYXRoLmZsb29yKHRoaXMueSkgKiBpbWFnZURhdGEud2lkdGggKiA0KSArIChNYXRoLmZsb29yKHRoaXMueCkgKiA0KTtcblxuICAgICAgICBpZiAoY29sb3JTcGFjZSA9PT0gJ2hzbGEnKSB7XG4gICAgICAgICAgdGhpcy5fY2FudmFzQ29sb3IgPSBDb2xvci5yZ2JUb0hzbGEoQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoaW1hZ2VEYXRhLmRhdGEsIGlkeCwgaWR4ICsgNCkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMuX2NhbnZhc0NvbG9yID0gJ3JnYignICsgQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoaW1hZ2VEYXRhLmRhdGEsIGlkeCwgaWR4ICsgMykuam9pbigpICsgJyknO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gdGhpcy5fY2FudmFzQ29sb3I7XG4gICAgICB9XG4gICAgICByZXR1cm4gdGhpcy5fY2FudmFzQ29sb3I7XG4gICAgfVxuXG4gICAgZ2V0Q29vcmRzKCkge1xuICAgICAgcmV0dXJuIFt0aGlzLngsIHRoaXMueV07XG4gICAgfVxuXG4gICAgLy8gZGlzdGFuY2UgdG8gYW5vdGhlciBwb2ludFxuICAgIGdldERpc3RhbmNlVG8ocG9pbnQpIHtcbiAgICAgIC8vIOKImih4MuKIkngxKTIrKHky4oiSeTEpMlxuICAgICAgcmV0dXJuIE1hdGguc3FydChNYXRoLnBvdyh0aGlzLnggLSBwb2ludC54LCAyKSArIE1hdGgucG93KHRoaXMueSAtIHBvaW50LnksIDIpKTtcbiAgICB9XG5cbiAgICAvLyBzY2FsZSBwb2ludHMgZnJvbSBbQSwgQl0gdG8gW0MsIERdXG4gICAgLy8geEEgPT4gb2xkIHggbWluLCB4QiA9PiBvbGQgeCBtYXhcbiAgICAvLyB5QSA9PiBvbGQgeSBtaW4sIHlCID0+IG9sZCB5IG1heFxuICAgIC8vIHhDID0+IG5ldyB4IG1pbiwgeEQgPT4gbmV3IHggbWF4XG4gICAgLy8geUMgPT4gbmV3IHkgbWluLCB5RCA9PiBuZXcgeSBtYXhcbiAgICByZXNjYWxlKHhBLCB4QiwgeUEsIHlCLCB4QywgeEQsIHlDLCB5RCkge1xuICAgICAgLy8gTmV3VmFsdWUgPSAoKChPbGRWYWx1ZSAtIE9sZE1pbikgKiBOZXdSYW5nZSkgLyBPbGRSYW5nZSkgKyBOZXdNaW5cblxuICAgICAgdmFyIHhPbGRSYW5nZSA9IHhCIC0geEE7XG4gICAgICB2YXIgeU9sZFJhbmdlID0geUIgLSB5QTtcblxuICAgICAgdmFyIHhOZXdSYW5nZSA9IHhEIC0geEM7XG4gICAgICB2YXIgeU5ld1JhbmdlID0geUQgLSB5QztcblxuICAgICAgdGhpcy54ID0gKCgodGhpcy54IC0geEEpICogeE5ld1JhbmdlKSAvIHhPbGRSYW5nZSkgKyB4QztcbiAgICAgIHRoaXMueSA9ICgoKHRoaXMueSAtIHlBKSAqIHlOZXdSYW5nZSkgLyB5T2xkUmFuZ2UpICsgeUM7XG4gICAgfVxuICB9XG5cbiAgaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBfUG9pbnQ7XG4gIH1cblxuICBQb2ludCA9IF9Qb2ludDtcbn0pKCk7XG4iLCJ2YXIgUG9pbnRNYXA7XG5cbihmdW5jdGlvbigpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIHZhciBQb2ludCA9IFBvaW50IHx8IHJlcXVpcmUoJy4vcG9pbnQnKTtcblxuICAvKipcbiAgICogUmVwcmVzZW50cyBhIHBvaW50XG4gICAqIEBjbGFzc1xuICAgKi9cbiAgY2xhc3MgX1BvaW50TWFwIHtcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgIHRoaXMuX21hcCA9IHt9O1xuICAgIH1cblxuICAgIC8vIGFkZHMgcG9pbnQgdG8gbWFwXG4gICAgYWRkKHBvaW50KSB7XG4gICAgICB0aGlzLl9tYXBbcG9pbnQudG9TdHJpbmcoKV0gPSB0cnVlO1xuICAgIH1cblxuICAgIC8vIGFkZHMgeCwgeSBjb29yZCB0byBtYXBcbiAgICBhZGRDb29yZCh4LCB5KSB7XG4gICAgICB0aGlzLmFkZChuZXcgUG9pbnQoeCwgeSkpO1xuICAgIH1cblxuICAgIC8vIHJlbW92ZXMgcG9pbnQgZnJvbSBtYXBcbiAgICByZW1vdmUocG9pbnQpIHtcbiAgICAgIHRoaXMuX21hcFtwb2ludC50b1N0cmluZygpXSA9IGZhbHNlO1xuICAgIH1cblxuICAgIC8vIHJlbW92ZXMgeCwgeSBjb29yZCBmcm9tIG1hcFxuICAgIHJlbW92ZUNvb3JkKHgsIHkpIHtcbiAgICAgIHRoaXMucmVtb3ZlKG5ldyBQb2ludCh4LCB5KSk7XG4gICAgfVxuXG4gICAgLy8gY2xlYXJzIHRoZSBtYXBcbiAgICBjbGVhcigpIHtcbiAgICAgIHRoaXMuX21hcCA9IHt9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIGRldGVybWluZXMgaWYgcG9pbnQgaGFzIGJlZW5cbiAgICAgKiBhZGRlZCB0byBtYXAgYWxyZWFkeVxuICAgICAqICBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICAgKi9cbiAgICBleGlzdHMocG9pbnQpIHtcbiAgICAgIHJldHVybiB0aGlzLl9tYXBbcG9pbnQudG9TdHJpbmcoKV0gPyB0cnVlIDogZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBfUG9pbnRNYXA7XG4gIH1cblxuICBQb2ludE1hcCA9IF9Qb2ludE1hcDtcbn0pKCk7XG4iLCIvKipcbiAqIFRPRE86XG4gKiAgLSBBbmltYXRpb24gLSByZWdlbiBncmFkaWVudCBhbmQgZmlndXJlIG91dCB2ZWN0b3JzP1xuICogICAgICAgICAgICAgIC0gbGlrZSBpZiB5b3UgaGF2ZSAyIGdyYWRzLCB0aGVuIGdlbiA0IGdyYWRzXG4gKiAgICAgICAgICAgICAgLSAwYSwgMWEgdmVjdG9yIHRvIDBiLCAxYi4gJ2ZhZGUnIGluIDNiLCA0YlxuICogIC0gd2lsbCBwcm9iYWJseSBoYXZlIHRvIG1vdmUgdGhpcyB0byBhbiBvZmYtc2NyZWVuIGNhbnZhc1xuICogICAgKGRvdWJsZSBjaGVjayBpZiB0aGlzIGltcHJvdmVzIHJlbmRlcmluZyBzcGVlZCBhdCBhbGwgZmlyc3QpXG4gKiAgLSBOdW0gcG9pbnRzIHNsaWRlclxuICogICAgICAtIGZldyAgLSBzb21lICAtIGEgbG90XG4gKi9cblxuKGZ1bmN0aW9uKCkge1xuICAndXNlIHN0cmljdCc7XG5cbiAgdmFyIERlbGF1bmF5ID0gcmVxdWlyZSgnLi9fZGVsYXVuYXknKTtcbiAgdmFyIENvbG9yICAgID0gcmVxdWlyZSgnLi9jb2xvcicpO1xuICB2YXIgUmFuZG9tICAgPSByZXF1aXJlKCcuL3JhbmRvbScpO1xuICB2YXIgVHJpYW5nbGUgPSByZXF1aXJlKCcuL3RyaWFuZ2xlJyk7XG4gIHZhciBQb2ludCAgICA9IHJlcXVpcmUoJy4vcG9pbnQnKTtcbiAgdmFyIFBvaW50TWFwID0gcmVxdWlyZSgnLi9wb2ludE1hcCcpO1xuXG4gIC8qKlxuICAgKiBSZXByZXNlbnRzIGEgZGVsYXVuZXkgdHJpYW5ndWxhdGlvbiBvZiByYW5kb20gcG9pbnRzXG4gICAqIGh0dHBzOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0RlbGF1bmF5X3RyaWFuZ3VsYXRpb25cbiAgICovXG4gIGNsYXNzIFByZXR0eURlbGF1bmF5IHtcbiAgICAvKipcbiAgICAgKiBAY29uc3RydWN0b3JcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihjYW52YXMsIG9wdGlvbnMpIHtcbiAgICAgIC8vIG1lcmdlIGdpdmVuIG9wdGlvbnMgd2l0aCBkZWZhdWx0c1xuICAgICAgdGhpcy5vcHRpb25zID0gT2JqZWN0LmFzc2lnbih7fSwgUHJldHR5RGVsYXVuYXkuZGVmYXVsdHMoKSwgKG9wdGlvbnMgfHwge30pKTtcblxuICAgICAgdGhpcy5jYW52YXMgPSBjYW52YXM7XG4gICAgICB0aGlzLmN0eCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuXG4gICAgICB0aGlzLnJlc2l6ZUNhbnZhcygpO1xuICAgICAgdGhpcy5wb2ludHMgPSBbXTtcbiAgICAgIHRoaXMuY29sb3JzID0gdGhpcy5vcHRpb25zLmNvbG9ycztcbiAgICAgIHRoaXMucG9pbnRNYXAgPSBuZXcgUG9pbnRNYXAoKTtcblxuICAgICAgdGhpcy5tb3VzZVBvc2l0aW9uID0gZmFsc2U7XG5cbiAgICAgIGlmICh0aGlzLm9wdGlvbnMuaG92ZXIpIHtcbiAgICAgICAgdGhpcy5jcmVhdGVIb3ZlclNoYWRvd0NhbnZhcygpO1xuXG4gICAgICAgIHRoaXMuY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlbW92ZScsIChlKSA9PiB7XG4gICAgICAgICAgdmFyIHJlY3QgPSBjYW52YXMuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgICAgICAgdGhpcy5tb3VzZVBvc2l0aW9uID0gbmV3IFBvaW50KGUuY2xpZW50WCAtIHJlY3QubGVmdCwgZS5jbGllbnRZIC0gcmVjdC50b3ApO1xuICAgICAgICAgIHRoaXMuaG92ZXIoKTtcbiAgICAgICAgfSwgZmFsc2UpO1xuXG4gICAgICAgIHRoaXMuY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlb3V0JywgKCkgPT4ge1xuICAgICAgICAgIHRoaXMubW91c2VQb3NpdGlvbiA9IGZhbHNlO1xuICAgICAgICAgIHRoaXMuaG92ZXIoKTtcbiAgICAgICAgfSwgZmFsc2UpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHN0YXRpYyBkZWZhdWx0cygpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHNob3dUcmlhbmdsZXM6IHRydWUsXG4gICAgICAgIHNob3dQb2ludHM6IGZhbHNlLFxuICAgICAgICBzaG93Q2lyY2xlczogZmFsc2UsXG4gICAgICAgIHNob3dDZW50cm9pZHM6IGZhbHNlLFxuICAgICAgICBzaG93RWRnZXM6IHRydWUsXG4gICAgICAgIGhvdmVyOiB0cnVlLFxuICAgICAgICBtdWx0aXBsaWVyOiAwLjUsXG5cbiAgICAgICAgY29sb3JzOiBbJ2hzbGEoMCwgMCUsIDEwMCUsIDEpJywgJ2hzbGEoMCwgMCUsIDUwJSwgMSknLCAnaHNsYSgwLCAwJSwgMCUsIDEpJ10sXG5cbiAgICAgICAgcmVzaXplTW9kZTogJ3NjYWxlUG9pbnRzJyxcbiAgICAgICAgLy8gJ25ld1BvaW50cycgLSBnZW5lcmF0ZXMgYSBuZXcgc2V0IG9mIHBvaW50cyBmb3IgdGhlIG5ldyBzaXplXG4gICAgICAgIC8vICdzY2FsZVBvaW50cycgLSBsaW5lYXJseSBzY2FsZXMgZXhpc3RpbmcgcG9pbnRzIGFuZCByZS10cmlhbmd1bGF0ZXNcblxuICAgICAgICAvLyBldmVudHMgdHJpZ2dlcmVkIHdoZW4gdGhlIGNlbnRlciBvZiB0aGUgYmFja2dyb3VuZFxuICAgICAgICAvLyBpcyBncmVhdGVyIG9yIGxlc3MgdGhhbiA1MCBsaWdodG5lc3MgaW4gaHNsYVxuICAgICAgICAvLyBpbnRlbmRlZCB0byBhZGp1c3Qgc29tZSB0ZXh0IHRoYXQgaXMgb24gdG9wXG4gICAgICAgIG9uRGFya0JhY2tncm91bmQ6IGZ1bmN0aW9uKCkgeyByZXR1cm47IH0sXG4gICAgICAgIG9uTGlnaHRCYWNrZ3JvdW5kOiBmdW5jdGlvbigpIHsgcmV0dXJuOyB9LFxuXG4gICAgICAgIC8vIHRyaWdnZXJlZCB3aGVuIGhvdmVyZWQgb3ZlciB0cmlhbmdsZVxuICAgICAgICBvblRyaWFuZ2xlSG92ZXI6IGZ1bmN0aW9uKHRyaWFuZ2xlLCBjdHgsIG9wdGlvbnMpIHtcbiAgICAgICAgICB2YXIgZmlsbCA9IG9wdGlvbnMuaG92ZXJDb2xvcih0cmlhbmdsZS5jb2xvcik7XG4gICAgICAgICAgdmFyIHN0cm9rZSA9IGZpbGw7XG4gICAgICAgICAgdHJpYW5nbGUucmVuZGVyKGN0eCwgb3B0aW9ucy5zaG93RWRnZXMgPyBmaWxsIDogZmFsc2UsIG9wdGlvbnMuc2hvd0VkZ2VzID8gZmFsc2UgOiBzdHJva2UpO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8vIHJldHVybnMgaHNsYSBjb2xvciBmb3IgdHJpYW5nbGUgZWRnZVxuICAgICAgICAvLyBhcyBhIGZ1bmN0aW9uIG9mIHRoZSB0cmlhbmdsZSBmaWxsIGNvbG9yXG4gICAgICAgIGVkZ2VDb2xvcjogZnVuY3Rpb24oY29sb3IpIHtcbiAgICAgICAgICBjb2xvciA9IENvbG9yLmhzbGFBZGp1c3RMaWdodG5lc3MoY29sb3IsIGZ1bmN0aW9uKGxpZ2h0bmVzcykge1xuICAgICAgICAgICAgcmV0dXJuIChsaWdodG5lc3MgKyAyMDAgLSBsaWdodG5lc3MgKiAyKSAvIDM7XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgY29sb3IgPSBDb2xvci5oc2xhQWRqdXN0QWxwaGEoY29sb3IsIDAuMjUpO1xuICAgICAgICAgIHJldHVybiBjb2xvcjtcbiAgICAgICAgfSxcblxuICAgICAgICAvLyByZXR1cm5zIGhzbGEgY29sb3IgZm9yIHRyaWFuZ2xlIGVkZ2VcbiAgICAgICAgLy8gYXMgYSBmdW5jdGlvbiBvZiB0aGUgdHJpYW5nbGUgZmlsbCBjb2xvclxuICAgICAgICBwb2ludENvbG9yOiBmdW5jdGlvbihjb2xvcikge1xuICAgICAgICAgIGNvbG9yID0gQ29sb3IuaHNsYUFkanVzdExpZ2h0bmVzcyhjb2xvciwgZnVuY3Rpb24obGlnaHRuZXNzKSB7XG4gICAgICAgICAgICByZXR1cm4gKGxpZ2h0bmVzcyArIDIwMCAtIGxpZ2h0bmVzcyAqIDIpIC8gMztcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBjb2xvciA9IENvbG9yLmhzbGFBZGp1c3RBbHBoYShjb2xvciwgMSk7XG4gICAgICAgICAgcmV0dXJuIGNvbG9yO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8vIHJldHVybnMgaHNsYSBjb2xvciBmb3IgdHJpYW5nbGUgZWRnZVxuICAgICAgICAvLyBhcyBhIGZ1bmN0aW9uIG9mIHRoZSB0cmlhbmdsZSBmaWxsIGNvbG9yXG4gICAgICAgIGNlbnRyb2lkQ29sb3I6IGZ1bmN0aW9uKGNvbG9yKSB7XG4gICAgICAgICAgY29sb3IgPSBDb2xvci5oc2xhQWRqdXN0TGlnaHRuZXNzKGNvbG9yLCBmdW5jdGlvbihsaWdodG5lc3MpIHtcbiAgICAgICAgICAgIHJldHVybiAobGlnaHRuZXNzICsgMjAwIC0gbGlnaHRuZXNzICogMikgLyAzO1xuICAgICAgICAgIH0pO1xuICAgICAgICAgIGNvbG9yID0gQ29sb3IuaHNsYUFkanVzdEFscGhhKGNvbG9yLCAwLjI1KTtcbiAgICAgICAgICByZXR1cm4gY29sb3I7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLy8gcmV0dXJucyBoc2xhIGNvbG9yIGZvciB0cmlhbmdsZSBob3ZlciBmaWxsXG4gICAgICAgIC8vIGFzIGEgZnVuY3Rpb24gb2YgdGhlIHRyaWFuZ2xlIGZpbGwgY29sb3JcbiAgICAgICAgaG92ZXJDb2xvcjogZnVuY3Rpb24oY29sb3IpIHtcbiAgICAgICAgICBjb2xvciA9IENvbG9yLmhzbGFBZGp1c3RMaWdodG5lc3MoY29sb3IsIGZ1bmN0aW9uKGxpZ2h0bmVzcykge1xuICAgICAgICAgICAgcmV0dXJuIDEwMCAtIGxpZ2h0bmVzcztcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBjb2xvciA9IENvbG9yLmhzbGFBZGp1c3RBbHBoYShjb2xvciwgMC41KTtcbiAgICAgICAgICByZXR1cm4gY29sb3I7XG4gICAgICAgIH0sXG4gICAgICB9O1xuICAgIH1cblxuICAgIGNsZWFyKCkge1xuICAgICAgdGhpcy5wb2ludHMgPSBbXTtcbiAgICAgIHRoaXMudHJpYW5nbGVzID0gW107XG4gICAgICB0aGlzLnBvaW50TWFwLmNsZWFyKCk7XG4gICAgICB0aGlzLmNlbnRlciA9IG5ldyBQb2ludCgwLCAwKTtcbiAgICB9XG5cbiAgICAvLyBjbGVhciBhbmQgY3JlYXRlIGEgZnJlc2ggc2V0IG9mIHJhbmRvbSBwb2ludHNcbiAgICAvLyBhbGwgYXJncyBhcmUgb3B0aW9uYWxcbiAgICByYW5kb21pemUobWluLCBtYXgsIG1pbkVkZ2UsIG1heEVkZ2UsIG1pbkdyYWRpZW50cywgbWF4R3JhZGllbnRzLCBjb2xvcnMpIHtcbiAgICAgIC8vIGNvbG9ycyBwYXJhbSBpcyBvcHRpb25hbFxuICAgICAgdGhpcy5jb2xvcnMgPSBjb2xvcnMgfHwgdGhpcy5jb2xvcnM7XG5cbiAgICAgIHRoaXMucmVzaXplQ2FudmFzKCk7XG5cbiAgICAgIHRoaXMuZ2VuZXJhdGVOZXdQb2ludHMobWluLCBtYXgsIG1pbkVkZ2UsIG1heEVkZ2UpO1xuXG4gICAgICB0aGlzLnRyaWFuZ3VsYXRlKCk7XG5cbiAgICAgIHRoaXMuZ2VuZXJhdGVHcmFkaWVudHMobWluR3JhZGllbnRzLCBtYXhHcmFkaWVudHMpO1xuXG4gICAgICB0aGlzLnJlbmRlcigpO1xuICAgIH1cblxuICAgIC8vIGNyZWF0ZXMgYSBoaWRkZW4gY2FudmFzIGZvciBob3ZlciBkZXRlY3Rpb25cbiAgICBjcmVhdGVIb3ZlclNoYWRvd0NhbnZhcygpIHtcbiAgICAgIHRoaXMuaG92ZXJTaGFkb3dDYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcbiAgICAgIHRoaXMuY2FudmFzLnBhcmVudEVsZW1lbnQuYXBwZW5kQ2hpbGQodGhpcy5ob3ZlclNoYWRvd0NhbnZhcyk7XG4gICAgICB0aGlzLnNoYWRvd0N0eCA9IHRoaXMuaG92ZXJTaGFkb3dDYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcblxuICAgICAgdGhpcy5ob3ZlclNoYWRvd0NhbnZhcy5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuICAgIH1cblxuICAgIGdlbmVyYXRlTmV3UG9pbnRzKG1pbiwgbWF4LCBtaW5FZGdlLCBtYXhFZGdlLCBtdWx0aXBsaWVyKSB7XG4gICAgICAvLyBkZWZhdWx0cyB0byBnZW5lcmljIG51bWJlciBvZiBwb2ludHMgYmFzZWQgb24gY2FudmFzIGRpbWVuc2lvbnNcbiAgICAgIC8vIHRoaXMgZ2VuZXJhbGx5IGxvb2tzIHByZXR0eSBuaWNlXG4gICAgICB2YXIgYXJlYSA9IHRoaXMuY2FudmFzLndpZHRoICogdGhpcy5jYW52YXMuaGVpZ2h0O1xuICAgICAgdmFyIHBlcmltZXRlciA9ICh0aGlzLmNhbnZhcy53aWR0aCArIHRoaXMuY2FudmFzLmhlaWdodCkgKiAyO1xuXG4gICAgICBtdWx0aXBsaWVyID0gbXVsdGlwbGllciB8fCB0aGlzLm9wdGlvbnMubXVsdGlwbGllcjtcblxuICAgICAgbWluID0gbWluID4gMCA/IE1hdGguY2VpbChtaW4pIDogTWF0aC5tYXgoTWF0aC5jZWlsKChhcmVhIC8gMTI1MCkgKiBtdWx0aXBsaWVyKSwgNTApO1xuICAgICAgbWF4ID0gbWF4ID4gMCA/IE1hdGguY2VpbChtYXgpIDogTWF0aC5tYXgoTWF0aC5jZWlsKChhcmVhIC8gNTAwKSAqIG11bHRpcGxpZXIpLCA1MCk7XG5cbiAgICAgIG1pbkVkZ2UgPSBtaW5FZGdlID4gMCA/IE1hdGguY2VpbChtaW5FZGdlKSA6IE1hdGgubWF4KE1hdGguY2VpbCgocGVyaW1ldGVyIC8gMTI1KSAqIG11bHRpcGxpZXIpLCA1KTtcbiAgICAgIG1heEVkZ2UgPSBtYXhFZGdlID4gMCA/IE1hdGguY2VpbChtYXhFZGdlKSA6IE1hdGgubWF4KE1hdGguY2VpbCgocGVyaW1ldGVyIC8gNTApICogbXVsdGlwbGllciksIDUpO1xuXG4gICAgICB0aGlzLm51bVBvaW50cyA9IFJhbmRvbS5yYW5kb21CZXR3ZWVuKG1pbiwgbWF4KTtcbiAgICAgIHRoaXMuZ2V0TnVtRWRnZVBvaW50cyA9IFJhbmRvbS5yYW5kb21OdW1iZXJGdW5jdGlvbihtaW5FZGdlLCBtYXhFZGdlKTtcblxuICAgICAgdGhpcy5jbGVhcigpO1xuXG4gICAgICAvLyBhZGQgY29ybmVyIGFuZCBlZGdlIHBvaW50c1xuICAgICAgdGhpcy5nZW5lcmF0ZUNvcm5lclBvaW50cygpO1xuICAgICAgdGhpcy5nZW5lcmF0ZUVkZ2VQb2ludHMoKTtcblxuICAgICAgLy8gYWRkIHNvbWUgcmFuZG9tIHBvaW50cyBpbiB0aGUgbWlkZGxlIGZpZWxkLFxuICAgICAgLy8gZXhjbHVkaW5nIGVkZ2VzIGFuZCBjb3JuZXJzXG4gICAgICB0aGlzLmdlbmVyYXRlUmFuZG9tUG9pbnRzKHRoaXMubnVtUG9pbnRzLCAxLCAxLCB0aGlzLndpZHRoIC0gMSwgdGhpcy5oZWlnaHQgLSAxKTtcbiAgICB9XG5cbiAgICAvLyBhZGQgcG9pbnRzIGluIHRoZSBjb3JuZXJzXG4gICAgZ2VuZXJhdGVDb3JuZXJQb2ludHMoKSB7XG4gICAgICB0aGlzLnBvaW50cy5wdXNoKG5ldyBQb2ludCgwLCAwKSk7XG4gICAgICB0aGlzLnBvaW50cy5wdXNoKG5ldyBQb2ludCgwLCB0aGlzLmhlaWdodCkpO1xuICAgICAgdGhpcy5wb2ludHMucHVzaChuZXcgUG9pbnQodGhpcy53aWR0aCwgMCkpO1xuICAgICAgdGhpcy5wb2ludHMucHVzaChuZXcgUG9pbnQodGhpcy53aWR0aCwgdGhpcy5oZWlnaHQpKTtcbiAgICB9XG5cbiAgICAvLyBhZGQgcG9pbnRzIG9uIHRoZSBlZGdlc1xuICAgIGdlbmVyYXRlRWRnZVBvaW50cygpIHtcbiAgICAgIC8vIGxlZnQgZWRnZVxuICAgICAgdGhpcy5nZW5lcmF0ZVJhbmRvbVBvaW50cyh0aGlzLmdldE51bUVkZ2VQb2ludHMoKSwgMCwgMCwgMCwgdGhpcy5oZWlnaHQpO1xuICAgICAgLy8gcmlnaHQgZWRnZVxuICAgICAgdGhpcy5nZW5lcmF0ZVJhbmRvbVBvaW50cyh0aGlzLmdldE51bUVkZ2VQb2ludHMoKSwgdGhpcy53aWR0aCwgMCwgMCwgdGhpcy5oZWlnaHQpO1xuICAgICAgLy8gYm90dG9tIGVkZ2VcbiAgICAgIHRoaXMuZ2VuZXJhdGVSYW5kb21Qb2ludHModGhpcy5nZXROdW1FZGdlUG9pbnRzKCksIDAsIHRoaXMuaGVpZ2h0LCB0aGlzLndpZHRoLCAwKTtcbiAgICAgIC8vIHRvcCBlZGdlXG4gICAgICB0aGlzLmdlbmVyYXRlUmFuZG9tUG9pbnRzKHRoaXMuZ2V0TnVtRWRnZVBvaW50cygpLCAwLCAwLCB0aGlzLndpZHRoLCAwKTtcbiAgICB9XG5cbiAgICAvLyByYW5kb21seSBnZW5lcmF0ZSBzb21lIHBvaW50cyxcbiAgICAvLyBzYXZlIHRoZSBwb2ludCBjbG9zZXN0IHRvIGNlbnRlclxuICAgIGdlbmVyYXRlUmFuZG9tUG9pbnRzKG51bVBvaW50cywgeCwgeSwgd2lkdGgsIGhlaWdodCkge1xuICAgICAgdmFyIGNlbnRlciA9IG5ldyBQb2ludChNYXRoLnJvdW5kKHRoaXMuY2FudmFzLndpZHRoIC8gMiksIE1hdGgucm91bmQodGhpcy5jYW52YXMuaGVpZ2h0IC8gMikpO1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBudW1Qb2ludHM7IGkrKykge1xuICAgICAgICAvLyBnZW5lcmF0ZSBhIG5ldyBwb2ludCB3aXRoIHJhbmRvbSBjb29yZHNcbiAgICAgICAgLy8gcmUtZ2VuZXJhdGUgdGhlIHBvaW50IGlmIGl0IGFscmVhZHkgZXhpc3RzIGluIHBvaW50bWFwIChtYXggMTAgdGltZXMpXG4gICAgICAgIHZhciBwb2ludDtcbiAgICAgICAgdmFyIGogPSAwO1xuICAgICAgICBkbyB7XG4gICAgICAgICAgaisrO1xuICAgICAgICAgIHBvaW50ID0gbmV3IFBvaW50KFJhbmRvbS5yYW5kb21CZXR3ZWVuKHgsIHggKyB3aWR0aCksIFJhbmRvbS5yYW5kb21CZXR3ZWVuKHksIHkgKyBoZWlnaHQpKTtcbiAgICAgICAgfSB3aGlsZSAodGhpcy5wb2ludE1hcC5leGlzdHMocG9pbnQpICYmIGogPCAxMCk7XG5cbiAgICAgICAgaWYgKGogPCAxMCkge1xuICAgICAgICAgIHRoaXMucG9pbnRzLnB1c2gocG9pbnQpO1xuICAgICAgICAgIHRoaXMucG9pbnRNYXAuYWRkKHBvaW50KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjZW50ZXIuZ2V0RGlzdGFuY2VUbyhwb2ludCkgPCBjZW50ZXIuZ2V0RGlzdGFuY2VUbyh0aGlzLmNlbnRlcikpIHtcbiAgICAgICAgICB0aGlzLmNlbnRlciA9IHBvaW50O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMuY2VudGVyLmlzQ2VudGVyID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgdGhpcy5jZW50ZXIuaXNDZW50ZXIgPSB0cnVlO1xuICAgIH1cblxuICAgIC8vIHVzZSB0aGUgRGVsYXVuYXkgYWxnb3JpdGhtIHRvIG1ha2VcbiAgICAvLyB0cmlhbmdsZXMgb3V0IG9mIG91ciByYW5kb20gcG9pbnRzXG4gICAgdHJpYW5ndWxhdGUoKSB7XG4gICAgICB0aGlzLnRyaWFuZ2xlcyA9IFtdO1xuXG4gICAgICAvLyBtYXAgcG9pbnQgb2JqZWN0cyB0byBsZW5ndGgtMiBhcnJheXNcbiAgICAgIHZhciB2ZXJ0aWNlcyA9IHRoaXMucG9pbnRzLm1hcChmdW5jdGlvbihwb2ludCkge1xuICAgICAgICByZXR1cm4gcG9pbnQuZ2V0Q29vcmRzKCk7XG4gICAgICB9KTtcblxuICAgICAgLy8gdmVydGljZXMgaXMgbm93IGFuIGFycmF5IHN1Y2ggYXM6XG4gICAgICAvLyBbIFtwMXgsIHAxeV0sIFtwMngsIHAyeV0sIFtwM3gsIHAzeV0sIC4uLiBdXG5cbiAgICAgIC8vIGRvIHRoZSBhbGdvcml0aG1cbiAgICAgIHZhciB0cmlhbmd1bGF0ZWQgPSBEZWxhdW5heS50cmlhbmd1bGF0ZSh2ZXJ0aWNlcyk7XG5cbiAgICAgIC8vIHJldHVybnMgMSBkaW1lbnNpb25hbCBhcnJheSBhcnJhbmdlZCBpbiB0cmlwbGVzIHN1Y2ggYXM6XG4gICAgICAvLyBbIHQxYSwgdDFiLCB0MWMsIHQyYSwgdDJiLCB0MmMsLi4uLiBdXG4gICAgICAvLyB3aGVyZSB0MWEsIGV0YyBhcmUgaW5kZWNlcyBpbiB0aGUgdmVydGljZXMgYXJyYXlcbiAgICAgIC8vIHR1cm4gdGhhdCBpbnRvIGFycmF5IG9mIHRyaWFuZ2xlIHBvaW50c1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0cmlhbmd1bGF0ZWQubGVuZ3RoOyBpICs9IDMpIHtcbiAgICAgICAgdmFyIGFyciA9IFtdO1xuICAgICAgICBhcnIucHVzaCh2ZXJ0aWNlc1t0cmlhbmd1bGF0ZWRbaV1dKTtcbiAgICAgICAgYXJyLnB1c2godmVydGljZXNbdHJpYW5ndWxhdGVkW2kgKyAxXV0pO1xuICAgICAgICBhcnIucHVzaCh2ZXJ0aWNlc1t0cmlhbmd1bGF0ZWRbaSArIDJdXSk7XG4gICAgICAgIHRoaXMudHJpYW5nbGVzLnB1c2goYXJyKTtcbiAgICAgIH1cblxuICAgICAgLy8gbWFwIHRvIGFycmF5IG9mIFRyaWFuZ2xlIG9iamVjdHNcbiAgICAgIHRoaXMudHJpYW5nbGVzID0gdGhpcy50cmlhbmdsZXMubWFwKGZ1bmN0aW9uKHRyaWFuZ2xlKSB7XG4gICAgICAgIHJldHVybiBuZXcgVHJpYW5nbGUobmV3IFBvaW50KHRyaWFuZ2xlWzBdKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXcgUG9pbnQodHJpYW5nbGVbMV0pLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ldyBQb2ludCh0cmlhbmdsZVsyXSkpO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gY3JlYXRlIHJhbmRvbSByYWRpYWwgZ3JhZGllbnQgY2lyY2xlcyBmb3IgcmVuZGVyaW5nIGxhdGVyXG4gICAgZ2VuZXJhdGVHcmFkaWVudHMobWluR3JhZGllbnRzLCBtYXhHcmFkaWVudHMpIHtcbiAgICAgIHRoaXMucmFkaWFsR3JhZGllbnRzID0gW107XG5cbiAgICAgIG1pbkdyYWRpZW50cyA9IG1pbkdyYWRpZW50cyA+IDAgPyBtaW5HcmFkaWVudHMgOiAxO1xuICAgICAgbWF4R3JhZGllbnRzID0gbWF4R3JhZGllbnRzID4gMCA/IG1heEdyYWRpZW50cyA6IDI7XG5cbiAgICAgIHRoaXMubnVtR3JhZGllbnRzID0gUmFuZG9tLnJhbmRvbUJldHdlZW4obWluR3JhZGllbnRzLCBtYXhHcmFkaWVudHMpO1xuXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMubnVtR3JhZGllbnRzOyBpKyspIHtcbiAgICAgICAgdGhpcy5nZW5lcmF0ZVJhZGlhbEdyYWRpZW50KCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZ2VuZXJhdGVSYWRpYWxHcmFkaWVudCgpIHtcbiAgICAgIC8qKlxuICAgICAgICAqIGNyZWF0ZSBhIG5pY2UtbG9va2luZyBidXQgc29tZXdoYXQgcmFuZG9tIGdyYWRpZW50OlxuICAgICAgICAqIHJhbmRvbWl6ZSB0aGUgZmlyc3QgY2lyY2xlXG4gICAgICAgICogdGhlIHNlY29uZCBjaXJjbGUgc2hvdWxkIGJlIGluc2lkZSB0aGUgZmlyc3QgY2lyY2xlLFxuICAgICAgICAqIHNvIHdlIGdlbmVyYXRlIGEgcG9pbnQgKG9yaWdpbjIpIGluc2lkZSBjaXJsZTFcbiAgICAgICAgKiB0aGVuIGNhbGN1bGF0ZSB0aGUgZGlzdCBiZXR3ZWVuIG9yaWdpbjIgYW5kIHRoZSBjaXJjdW1mcmVuY2Ugb2YgY2lyY2xlMVxuICAgICAgICAqIGNpcmNsZTIncyByYWRpdXMgY2FuIGJlIGJldHdlZW4gMCBhbmQgdGhpcyBkaXN0XG4gICAgICAgICovXG5cbiAgICAgIHZhciBtaW5YID0gTWF0aC5jZWlsKE1hdGguc3FydCh0aGlzLmNhbnZhcy53aWR0aCkpO1xuICAgICAgdmFyIG1heFggPSBNYXRoLmNlaWwodGhpcy5jYW52YXMud2lkdGggLSBNYXRoLnNxcnQodGhpcy5jYW52YXMud2lkdGgpKTtcblxuICAgICAgdmFyIG1pblkgPSBNYXRoLmNlaWwoTWF0aC5zcXJ0KHRoaXMuY2FudmFzLmhlaWdodCkpO1xuICAgICAgdmFyIG1heFkgPSBNYXRoLmNlaWwodGhpcy5jYW52YXMuaGVpZ2h0IC0gTWF0aC5zcXJ0KHRoaXMuY2FudmFzLmhlaWdodCkpO1xuXG4gICAgICB2YXIgbWluUmFkaXVzID0gTWF0aC5jZWlsKE1hdGgubWF4KHRoaXMuY2FudmFzLmhlaWdodCwgdGhpcy5jYW52YXMud2lkdGgpIC9cbiAgICAgICAgICAgICAgICAgICAgICBNYXRoLm1heChNYXRoLnNxcnQodGhpcy5udW1HcmFkaWVudHMpLCAyKSk7XG4gICAgICB2YXIgbWF4UmFkaXVzID0gTWF0aC5jZWlsKE1hdGgubWF4KHRoaXMuY2FudmFzLmhlaWdodCwgdGhpcy5jYW52YXMud2lkdGgpIC9cbiAgICAgICAgICAgICAgICAgICAgICBNYXRoLm1heChNYXRoLmxvZyh0aGlzLm51bUdyYWRpZW50cyksIDEpKTtcblxuICAgICAgLy8gaGVscGVyIHJhbmRvbSBmdW5jdGlvbnNcbiAgICAgIHZhciByYW5kb21DYW52YXNYID0gUmFuZG9tLnJhbmRvbU51bWJlckZ1bmN0aW9uKG1pblgsIG1heFgpO1xuICAgICAgdmFyIHJhbmRvbUNhbnZhc1kgPSBSYW5kb20ucmFuZG9tTnVtYmVyRnVuY3Rpb24obWluWSwgbWF4WSk7XG4gICAgICB2YXIgcmFuZG9tQ2FudmFzUmFkaXVzID0gUmFuZG9tLnJhbmRvbU51bWJlckZ1bmN0aW9uKG1pblJhZGl1cywgbWF4UmFkaXVzKTtcblxuICAgICAgLy8gZ2VuZXJhdGUgY2lyY2xlMSBvcmlnaW4gYW5kIHJhZGl1c1xuICAgICAgdmFyIHgwO1xuICAgICAgdmFyIHkwO1xuICAgICAgdmFyIHIwID0gcmFuZG9tQ2FudmFzUmFkaXVzKCk7XG5cbiAgICAgIC8vIG9yaWdpbiBvZiB0aGUgbmV4dCBjaXJjbGUgc2hvdWxkIGJlIGNvbnRhaW5lZFxuICAgICAgLy8gd2l0aGluIHRoZSBhcmVhIG9mIGl0cyBwcmVkZWNlc3NvclxuICAgICAgaWYgKHRoaXMucmFkaWFsR3JhZGllbnRzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgdmFyIGxhc3RHcmFkaWVudCA9IHRoaXMucmFkaWFsR3JhZGllbnRzW3RoaXMucmFkaWFsR3JhZGllbnRzLmxlbmd0aCAtIDFdO1xuICAgICAgICB2YXIgcG9pbnRJbkxhc3RDaXJjbGUgPSBSYW5kb20ucmFuZG9tSW5DaXJjbGUobGFzdEdyYWRpZW50LnIwLCBsYXN0R3JhZGllbnQueDAsIGxhc3RHcmFkaWVudC55MCk7XG5cbiAgICAgICAgLy8gb3JpZ2luIG11c3QgYmUgd2l0aGluIHRoZSBib3VuZHMgb2YgdGhlIGNhbnZhc1xuICAgICAgICB3aGlsZSAocG9pbnRJbkxhc3RDaXJjbGUueCA8IDAgfHxcbiAgICAgICAgICAgICAgIHBvaW50SW5MYXN0Q2lyY2xlLnkgPCAwIHx8XG4gICAgICAgICAgICAgICBwb2ludEluTGFzdENpcmNsZS54ID4gdGhpcy5jYW52YXMud2lkdGggfHxcbiAgICAgICAgICAgICAgIHBvaW50SW5MYXN0Q2lyY2xlLnkgPiB0aGlzLmNhbnZhcy5oZWlnaHQpIHtcbiAgICAgICAgICBwb2ludEluTGFzdENpcmNsZSA9IFJhbmRvbS5yYW5kb21JbkNpcmNsZShsYXN0R3JhZGllbnQucjAsIGxhc3RHcmFkaWVudC54MCwgbGFzdEdyYWRpZW50LnkwKTtcbiAgICAgICAgfVxuICAgICAgICB4MCA9IHBvaW50SW5MYXN0Q2lyY2xlLng7XG4gICAgICAgIHkwID0gcG9pbnRJbkxhc3RDaXJjbGUueTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIGZpcnN0IGNpcmNsZSwganVzdCBwaWNrIGF0IHJhbmRvbVxuICAgICAgICB4MCA9IHJhbmRvbUNhbnZhc1goKTtcbiAgICAgICAgeTAgPSByYW5kb21DYW52YXNZKCk7XG4gICAgICB9XG5cbiAgICAgIC8vIGZpbmQgYSByYW5kb20gcG9pbnQgaW5zaWRlIGNpcmNsZTFcbiAgICAgIC8vIHRoaXMgaXMgdGhlIG9yaWdpbiBvZiBjaXJjbGUgMlxuICAgICAgdmFyIHBvaW50SW5DaXJjbGUgPSBSYW5kb20ucmFuZG9tSW5DaXJjbGUocjAgKiAwLjA5LCB4MCwgeTApO1xuXG4gICAgICAvLyBncmFiIHRoZSB4L3kgY29vcmRzXG4gICAgICB2YXIgeDEgPSBwb2ludEluQ2lyY2xlLng7XG4gICAgICB2YXIgeTEgPSBwb2ludEluQ2lyY2xlLnk7XG5cbiAgICAgIC8vIGZpbmQgZGlzdGFuY2UgYmV0d2VlbiB0aGUgcG9pbnQgYW5kIHRoZSBjaXJjdW1mcmllbmNlIG9mIGNpcmNsZTFcbiAgICAgIC8vIHRoZSByYWRpdXMgb2YgdGhlIHNlY29uZCBjaXJjbGUgd2lsbCBiZSBhIGZ1bmN0aW9uIG9mIHRoaXMgZGlzdGFuY2VcbiAgICAgIHZhciB2WCA9IHgxIC0geDA7XG4gICAgICB2YXIgdlkgPSB5MSAtIHkwO1xuICAgICAgdmFyIG1hZ1YgPSBNYXRoLnNxcnQodlggKiB2WCArIHZZICogdlkpO1xuICAgICAgdmFyIGFYID0geDAgKyB2WCAvIG1hZ1YgKiByMDtcbiAgICAgIHZhciBhWSA9IHkwICsgdlkgLyBtYWdWICogcjA7XG5cbiAgICAgIHZhciBkaXN0ID0gTWF0aC5zcXJ0KCh4MSAtIGFYKSAqICh4MSAtIGFYKSArICh5MSAtIGFZKSAqICh5MSAtIGFZKSk7XG5cbiAgICAgIC8vIGdlbmVyYXRlIHRoZSByYWRpdXMgb2YgY2lyY2xlMiBiYXNlZCBvbiB0aGlzIGRpc3RhbmNlXG4gICAgICB2YXIgcjEgPSBSYW5kb20ucmFuZG9tQmV0d2VlbigxLCBNYXRoLnNxcnQoZGlzdCkpO1xuXG4gICAgICAvLyByYW5kb20gYnV0IG5pY2UgbG9va2luZyBjb2xvciBzdG9wXG4gICAgICB2YXIgY29sb3JTdG9wID0gUmFuZG9tLnJhbmRvbUJldHdlZW4oMiwgOCkgLyAxMDtcblxuICAgICAgdGhpcy5yYWRpYWxHcmFkaWVudHMucHVzaCh7eDAsIHkwLCByMCwgeDEsIHkxLCByMSwgY29sb3JTdG9wfSk7XG4gICAgfVxuXG4gICAgLy8gc29ydHMgdGhlIHBvaW50c1xuICAgIHNvcnRQb2ludHMoKSB7XG4gICAgICAvLyBzb3J0IHBvaW50c1xuICAgICAgdGhpcy5wb2ludHMuc29ydChmdW5jdGlvbihhLCBiKSB7XG4gICAgICAgIC8vIHNvcnQgdGhlIHBvaW50XG4gICAgICAgIGlmIChhLnggPCBiLngpIHtcbiAgICAgICAgICByZXR1cm4gLTE7XG4gICAgICAgIH0gZWxzZSBpZiAoYS54ID4gYi54KSB7XG4gICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgIH0gZWxzZSBpZiAoYS55IDwgYi55KSB7XG4gICAgICAgICAgcmV0dXJuIC0xO1xuICAgICAgICB9IGVsc2UgaWYgKGEueSA+IGIueSkge1xuICAgICAgICAgIHJldHVybiAxO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBzaXplIHRoZSBjYW52YXMgdG8gdGhlIHNpemUgb2YgaXRzIHBhcmVudFxuICAgIC8vIG1ha2VzIHRoZSBjYW52YXMgJ3Jlc3BvbnNpdmUnXG4gICAgcmVzaXplQ2FudmFzKCkge1xuICAgICAgdmFyIHBhcmVudCA9IHRoaXMuY2FudmFzLnBhcmVudEVsZW1lbnQ7XG4gICAgICB0aGlzLmNhbnZhcy53aWR0aCA9IHRoaXMud2lkdGggPSBwYXJlbnQub2Zmc2V0V2lkdGg7XG4gICAgICB0aGlzLmNhbnZhcy5oZWlnaHQgPSB0aGlzLmhlaWdodCA9IHBhcmVudC5vZmZzZXRIZWlnaHQ7XG5cbiAgICAgIGlmICh0aGlzLmhvdmVyU2hhZG93Q2FudmFzKSB7XG4gICAgICAgIHRoaXMuaG92ZXJTaGFkb3dDYW52YXMud2lkdGggPSB0aGlzLndpZHRoID0gcGFyZW50Lm9mZnNldFdpZHRoO1xuICAgICAgICB0aGlzLmhvdmVyU2hhZG93Q2FudmFzLmhlaWdodCA9IHRoaXMuaGVpZ2h0ID0gcGFyZW50Lm9mZnNldEhlaWdodDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBtb3ZlcyBwb2ludHMvdHJpYW5nbGVzIGJhc2VkIG9uIG5ldyBzaXplIG9mIGNhbnZhc1xuICAgIHJlc2NhbGUoKSB7XG4gICAgICAvLyBncmFiIG9sZCBtYXgvbWluIGZyb20gY3VycmVudCBjYW52YXMgc2l6ZVxuICAgICAgdmFyIHhNaW4gPSAwO1xuICAgICAgdmFyIHhNYXggPSB0aGlzLmNhbnZhcy53aWR0aDtcbiAgICAgIHZhciB5TWluID0gMDtcbiAgICAgIHZhciB5TWF4ID0gdGhpcy5jYW52YXMuaGVpZ2h0O1xuXG4gICAgICB0aGlzLnJlc2l6ZUNhbnZhcygpO1xuXG4gICAgICB2YXIgaTtcblxuICAgICAgaWYgKHRoaXMub3B0aW9ucy5yZXNpemVNb2RlID09PSAnc2NhbGVQb2ludHMnKSB7XG4gICAgICAgIC8vIHNjYWxlIGFsbCBwb2ludHMgdG8gbmV3IG1heCBkaW1lbnNpb25zXG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCB0aGlzLnBvaW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIHRoaXMucG9pbnRzW2ldLnJlc2NhbGUoeE1pbiwgeE1heCwgeU1pbiwgeU1heCwgMCwgdGhpcy5jYW52YXMud2lkdGgsIDAsIHRoaXMuY2FudmFzLmhlaWdodCk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuZ2VuZXJhdGVOZXdQb2ludHMoKTtcbiAgICAgIH1cblxuICAgICAgdGhpcy50cmlhbmd1bGF0ZSgpO1xuXG4gICAgICAvLyByZXNjYWxlIHBvc2l0aW9uIG9mIHJhZGlhbCBncmFkaWVudCBjaXJjbGVzXG4gICAgICBmb3IgKGkgPSAwOyBpIDwgdGhpcy5yYWRpYWxHcmFkaWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIGNpcmNsZTAgPSBuZXcgUG9pbnQodGhpcy5yYWRpYWxHcmFkaWVudHNbaV0ueDAsIHRoaXMucmFkaWFsR3JhZGllbnRzW2ldLnkwKTtcbiAgICAgICAgdmFyIGNpcmNsZTEgPSBuZXcgUG9pbnQodGhpcy5yYWRpYWxHcmFkaWVudHNbaV0ueDEsIHRoaXMucmFkaWFsR3JhZGllbnRzW2ldLnkxKTtcblxuICAgICAgICBjaXJjbGUwLnJlc2NhbGUoeE1pbiwgeE1heCwgeU1pbiwgeU1heCwgMCwgdGhpcy5jYW52YXMud2lkdGgsIDAsIHRoaXMuY2FudmFzLmhlaWdodCk7XG4gICAgICAgIGNpcmNsZTEucmVzY2FsZSh4TWluLCB4TWF4LCB5TWluLCB5TWF4LCAwLCB0aGlzLmNhbnZhcy53aWR0aCwgMCwgdGhpcy5jYW52YXMuaGVpZ2h0KTtcblxuICAgICAgICB0aGlzLnJhZGlhbEdyYWRpZW50c1tpXS54MCA9IGNpcmNsZTAueDtcbiAgICAgICAgdGhpcy5yYWRpYWxHcmFkaWVudHNbaV0ueTAgPSBjaXJjbGUwLnk7XG4gICAgICAgIHRoaXMucmFkaWFsR3JhZGllbnRzW2ldLngxID0gY2lyY2xlMS54O1xuICAgICAgICB0aGlzLnJhZGlhbEdyYWRpZW50c1tpXS55MSA9IGNpcmNsZTEueTtcbiAgICAgIH1cblxuICAgICAgdGhpcy5yZW5kZXIoKTtcbiAgICB9XG5cbiAgICBob3ZlcigpIHtcbiAgICAgIGlmICh0aGlzLm1vdXNlUG9zaXRpb24pIHtcbiAgICAgICAgdmFyIHJnYiA9IHRoaXMubW91c2VQb3NpdGlvbi5jYW52YXNDb2xvckF0UG9pbnQodGhpcy5zaGFkb3dJbWFnZURhdGEsICdyZ2InKTtcbiAgICAgICAgdmFyIGhleCA9IENvbG9yLnJnYlRvSGV4KHJnYik7XG4gICAgICAgIHZhciBkZWMgPSBwYXJzZUludChoZXgsIDE2KTtcblxuICAgICAgICAvLyBpcyBwcm9iYWJseSB0cmlhbmdsZSB3aXRoIHRoYXQgaW5kZXgsIGJ1dFxuICAgICAgICAvLyBlZGdlcyBjYW4gYmUgZnV6enkgc28gZG91YmxlIGNoZWNrXG4gICAgICAgIGlmIChkZWMgPj0gMCAmJiBkZWMgPCB0aGlzLnRyaWFuZ2xlcy5sZW5ndGggJiYgdGhpcy50cmlhbmdsZXNbZGVjXS5wb2ludEluVHJpYW5nbGUodGhpcy5tb3VzZVBvc2l0aW9uKSkge1xuICAgICAgICAgIC8vIGNsZWFyIHRoZSBsYXN0IHRyaWFuZ2xlXG4gICAgICAgICAgdGhpcy5yZXNldFRyaWFuZ2xlKCk7XG5cbiAgICAgICAgICBpZiAodGhpcy5sYXN0VHJpYW5nbGUgIT09IGRlYykge1xuICAgICAgICAgICAgLy8gcmVuZGVyIHRoZSBob3ZlcmVkIHRyaWFuZ2xlXG4gICAgICAgICAgICB0aGlzLm9wdGlvbnMub25UcmlhbmdsZUhvdmVyKHRoaXMudHJpYW5nbGVzW2RlY10sIHRoaXMuY3R4LCB0aGlzLm9wdGlvbnMpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHRoaXMubGFzdFRyaWFuZ2xlID0gZGVjO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLnJlc2V0VHJpYW5nbGUoKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXNldFRyaWFuZ2xlKCkge1xuICAgICAgLy8gcmVkcmF3IHRoZSBsYXN0IHRyaWFuZ2xlIHRoYXQgd2FzIGhvdmVyZWQgb3ZlclxuICAgICAgaWYgKHRoaXMubGFzdFRyaWFuZ2xlICYmIHRoaXMubGFzdFRyaWFuZ2xlID49IDAgJiYgdGhpcy5sYXN0VHJpYW5nbGUgPCB0aGlzLnRyaWFuZ2xlcy5sZW5ndGgpIHtcbiAgICAgICAgdmFyIGxhc3RUcmlhbmdsZSA9IHRoaXMudHJpYW5nbGVzW3RoaXMubGFzdFRyaWFuZ2xlXTtcblxuICAgICAgICAvLyBmaW5kIHRoZSBib3VuZGluZyBwb2ludHMgb2YgdGhlIGxhc3QgdHJpYW5nbGVcbiAgICAgICAgLy8gZXhwYW5kIGEgYml0IGZvciBlZGdlc1xuICAgICAgICB2YXIgbWluWCA9IGxhc3RUcmlhbmdsZS5taW5YKCkgLSAxO1xuICAgICAgICB2YXIgbWluWSA9IGxhc3RUcmlhbmdsZS5taW5ZKCkgLSAxO1xuICAgICAgICB2YXIgbWF4WCA9IGxhc3RUcmlhbmdsZS5tYXhYKCkgKyAxO1xuICAgICAgICB2YXIgbWF4WSA9IGxhc3RUcmlhbmdsZS5tYXhZKCkgKyAxO1xuXG4gICAgICAgIC8vIHJlc2V0IHRoYXQgcG9ydGlvbiBvZiB0aGUgY2FudmFzIHRvIGl0cyBvcmlnaW5hbCByZW5kZXJcbiAgICAgICAgdGhpcy5jdHgucHV0SW1hZ2VEYXRhKHRoaXMucmVuZGVyZWRJbWFnZURhdGEsIDAsIDAsIG1pblgsIG1pblksIG1heFggLSBtaW5YLCBtYXhZIC0gbWluWSk7XG5cbiAgICAgICAgdGhpcy5sYXN0VHJpYW5nbGUgPSBmYWxzZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZW5kZXIoKSB7XG4gICAgICAvLyBlbXB0eSB0aGUgY2FudmFzXG4gICAgICB0aGlzLmN0eC5jbGVhclJlY3QoMCwgMCwgdGhpcy5jYW52YXMud2lkdGgsIHRoaXMuY2FudmFzLmhlaWdodCk7XG5cbiAgICAgIHRoaXMucmVuZGVyR3JhZGllbnQoKTtcblxuICAgICAgLy8gZ2V0IGVudGlyZSBjYW52YXMgaW1hZ2UgZGF0YSBvZiBpbiBhIGJpZyB0eXBlZCBhcnJheVxuICAgICAgLy8gdGhpcyB3YXkgd2UgZG9udCBoYXZlIHRvIHBpY2sgZm9yIGVhY2ggcG9pbnQgaW5kaXZpZHVhbGx5XG4gICAgICAvLyBpdCdzIGxpa2UgNTB4IGZhc3RlciB0aGlzIHdheVxuICAgICAgdGhpcy5ncmFkaWVudEltYWdlRGF0YSA9IHRoaXMuY3R4LmdldEltYWdlRGF0YSgwLCAwLCB0aGlzLmNhbnZhcy53aWR0aCwgdGhpcy5jYW52YXMuaGVpZ2h0KTtcblxuICAgICAgLy8gcmVuZGVycyB0cmlhbmdsZXMsIGVkZ2VzLCBhbmQgc2hhZG93IGNhbnZhcyBmb3IgaG92ZXIgZGV0ZWN0aW9uXG4gICAgICB0aGlzLnJlbmRlclRyaWFuZ2xlcyh0aGlzLm9wdGlvbnMuc2hvd1RyaWFuZ2xlcywgdGhpcy5vcHRpb25zLnNob3dFZGdlcyk7XG5cbiAgICAgIHRoaXMucmVuZGVyRXh0cmFzKCk7XG5cbiAgICAgIHRoaXMucmVuZGVyZWRJbWFnZURhdGEgPSB0aGlzLmN0eC5nZXRJbWFnZURhdGEoMCwgMCwgdGhpcy5jYW52YXMud2lkdGgsIHRoaXMuY2FudmFzLmhlaWdodCk7XG5cbiAgICAgIC8vIHRocm93IGV2ZW50cyBmb3IgbGlnaHQgLyBkYXJrIHRleHRcbiAgICAgIHZhciBjZW50ZXJDb2xvciA9IHRoaXMuY2VudGVyLmNhbnZhc0NvbG9yQXRQb2ludCgpO1xuXG4gICAgICBpZiAocGFyc2VJbnQoY2VudGVyQ29sb3Iuc3BsaXQoJywnKVsyXSkgPCA1MCkge1xuICAgICAgICB0aGlzLm9wdGlvbnMub25EYXJrQmFja2dyb3VuZChjZW50ZXJDb2xvcik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLm9wdGlvbnMub25MaWdodEJhY2tncm91bmQoY2VudGVyQ29sb3IpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJlbmRlckV4dHJhcygpIHtcbiAgICAgIGlmICh0aGlzLm9wdGlvbnMuc2hvd1BvaW50cykge1xuICAgICAgICB0aGlzLnJlbmRlclBvaW50cygpO1xuICAgICAgfVxuXG4gICAgICBpZiAodGhpcy5vcHRpb25zLnNob3dDaXJjbGVzKSB7XG4gICAgICAgIHRoaXMucmVuZGVyR3JhZGllbnRDaXJjbGVzKCk7XG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLm9wdGlvbnMuc2hvd0NlbnRyb2lkcykge1xuICAgICAgICB0aGlzLnJlbmRlckNlbnRyb2lkcygpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJlbmRlck5ld0NvbG9ycyhjb2xvcnMpIHtcbiAgICAgIHRoaXMuY29sb3JzID0gY29sb3JzIHx8IHRoaXMuY29sb3JzO1xuICAgICAgLy8gdHJpYW5nbGUgY2VudHJvaWRzIG5lZWQgbmV3IGNvbG9yc1xuICAgICAgdGhpcy50cmlhbmd1bGF0ZSgpO1xuICAgICAgdGhpcy5yZW5kZXIoKTtcbiAgICB9XG5cbiAgICByZW5kZXJOZXdHcmFkaWVudChtaW5HcmFkaWVudHMsIG1heEdyYWRpZW50cykge1xuICAgICAgdGhpcy5nZW5lcmF0ZUdyYWRpZW50cyhtaW5HcmFkaWVudHMsIG1heEdyYWRpZW50cyk7XG4gICAgICB0aGlzLnRyaWFuZ3VsYXRlKCk7XG4gICAgICB0aGlzLnJlbmRlcigpO1xuICAgIH1cblxuICAgIHJlbmRlck5ld1RyaWFuZ2xlcyhtaW4sIG1heCwgbWluRWRnZSwgbWF4RWRnZSwgbXVsdGlwbGllcikge1xuICAgICAgdGhpcy5nZW5lcmF0ZU5ld1BvaW50cyhtaW4sIG1heCwgbWluRWRnZSwgbWF4RWRnZSwgbXVsdGlwbGllcik7XG4gICAgICB0aGlzLnRyaWFuZ3VsYXRlKCk7XG4gICAgICB0aGlzLnJlbmRlcigpO1xuICAgIH1cblxuICAgIHJlbmRlckdyYWRpZW50KCkge1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLnJhZGlhbEdyYWRpZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAvLyBjcmVhdGUgdGhlIHJhZGlhbCBncmFkaWVudCBiYXNlZCBvblxuICAgICAgICAvLyB0aGUgZ2VuZXJhdGVkIGNpcmNsZXMnIHJhZGlpIGFuZCBvcmlnaW5zXG4gICAgICAgIHZhciByYWRpYWxHcmFkaWVudCA9IHRoaXMuY3R4LmNyZWF0ZVJhZGlhbEdyYWRpZW50KFxuICAgICAgICAgIHRoaXMucmFkaWFsR3JhZGllbnRzW2ldLngwLFxuICAgICAgICAgIHRoaXMucmFkaWFsR3JhZGllbnRzW2ldLnkwLFxuICAgICAgICAgIHRoaXMucmFkaWFsR3JhZGllbnRzW2ldLnIwLFxuICAgICAgICAgIHRoaXMucmFkaWFsR3JhZGllbnRzW2ldLngxLFxuICAgICAgICAgIHRoaXMucmFkaWFsR3JhZGllbnRzW2ldLnkxLFxuICAgICAgICAgIHRoaXMucmFkaWFsR3JhZGllbnRzW2ldLnIxXG4gICAgICAgICk7XG5cbiAgICAgICAgdmFyIG91dGVyQ29sb3IgPSB0aGlzLmNvbG9yc1syXTtcblxuICAgICAgICAvLyBtdXN0IGJlIHRyYW5zcGFyZW50IHZlcnNpb24gb2YgbWlkZGxlIGNvbG9yXG4gICAgICAgIC8vIHRoaXMgd29ya3MgZm9yIHJnYmEgYW5kIGhzbGFcbiAgICAgICAgaWYgKGkgPiAwKSB7XG4gICAgICAgICAgb3V0ZXJDb2xvciA9IHRoaXMuY29sb3JzWzFdLnNwbGl0KCcsJyk7XG4gICAgICAgICAgb3V0ZXJDb2xvclszXSA9ICcwKSc7XG4gICAgICAgICAgb3V0ZXJDb2xvciA9IG91dGVyQ29sb3Iuam9pbignLCcpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmFkaWFsR3JhZGllbnQuYWRkQ29sb3JTdG9wKDEsIHRoaXMuY29sb3JzWzBdKTtcbiAgICAgICAgcmFkaWFsR3JhZGllbnQuYWRkQ29sb3JTdG9wKHRoaXMucmFkaWFsR3JhZGllbnRzW2ldLmNvbG9yU3RvcCwgdGhpcy5jb2xvcnNbMV0pO1xuICAgICAgICByYWRpYWxHcmFkaWVudC5hZGRDb2xvclN0b3AoMCwgb3V0ZXJDb2xvcik7XG5cbiAgICAgICAgdGhpcy5jYW52YXMucGFyZW50RWxlbWVudC5zdHlsZS5iYWNrZ3JvdW5kQ29sb3IgPSB0aGlzLmNvbG9yc1syXTtcblxuICAgICAgICB0aGlzLmN0eC5maWxsU3R5bGUgPSByYWRpYWxHcmFkaWVudDtcbiAgICAgICAgdGhpcy5jdHguZmlsbFJlY3QoMCwgMCwgdGhpcy5jYW52YXMud2lkdGgsIHRoaXMuY2FudmFzLmhlaWdodCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmVuZGVyVHJpYW5nbGVzKHRyaWFuZ2xlcywgZWRnZXMpIHtcblxuICAgICAgLy8gc2F2ZSB0aGlzIGZvciBsYXRlclxuICAgICAgdGhpcy5jZW50ZXIuY2FudmFzQ29sb3JBdFBvaW50KHRoaXMuZ3JhZGllbnRJbWFnZURhdGEpO1xuXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMudHJpYW5nbGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIC8vIHRoZSBjb2xvciBpcyBkZXRlcm1pbmVkIGJ5IGdyYWJiaW5nIHRoZSBjb2xvciBvZiB0aGUgY2FudmFzXG4gICAgICAgIC8vICh3aGVyZSB3ZSBkcmV3IHRoZSBncmFkaWVudCkgYXQgdGhlIGNlbnRlciBvZiB0aGUgdHJpYW5nbGVcblxuICAgICAgICB0aGlzLnRyaWFuZ2xlc1tpXS5jb2xvciA9IHRoaXMudHJpYW5nbGVzW2ldLmNvbG9yQXRDZW50cm9pZCh0aGlzLmdyYWRpZW50SW1hZ2VEYXRhKTtcblxuICAgICAgICBpZiAodHJpYW5nbGVzICYmIGVkZ2VzKSB7XG4gICAgICAgICAgdGhpcy50cmlhbmdsZXNbaV0uc3Ryb2tlID0gdGhpcy5vcHRpb25zLmVkZ2VDb2xvcih0aGlzLnRyaWFuZ2xlc1tpXS5jb2xvckF0Q2VudHJvaWQodGhpcy5ncmFkaWVudEltYWdlRGF0YSkpO1xuICAgICAgICAgIHRoaXMudHJpYW5nbGVzW2ldLnJlbmRlcih0aGlzLmN0eCk7XG4gICAgICAgIH0gZWxzZSBpZiAodHJpYW5nbGVzKSB7XG4gICAgICAgICAgLy8gdHJpYW5nbGVzIG9ubHlcbiAgICAgICAgICB0aGlzLnRyaWFuZ2xlc1tpXS5zdHJva2UgPSB0aGlzLnRyaWFuZ2xlc1tpXS5jb2xvcjtcbiAgICAgICAgICB0aGlzLnRyaWFuZ2xlc1tpXS5yZW5kZXIodGhpcy5jdHgpO1xuICAgICAgICB9IGVsc2UgaWYgKGVkZ2VzKSB7XG4gICAgICAgICAgLy8gZWRnZXMgb25seVxuICAgICAgICAgIHRoaXMudHJpYW5nbGVzW2ldLnN0cm9rZSA9IHRoaXMub3B0aW9ucy5lZGdlQ29sb3IodGhpcy50cmlhbmdsZXNbaV0uY29sb3JBdENlbnRyb2lkKHRoaXMuZ3JhZGllbnRJbWFnZURhdGEpKTtcbiAgICAgICAgICB0aGlzLnRyaWFuZ2xlc1tpXS5yZW5kZXIodGhpcy5jdHgsIGZhbHNlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLmhvdmVyU2hhZG93Q2FudmFzKSB7XG4gICAgICAgICAgdmFyIGNvbG9yID0gJyMnICsgKCcwMDAwMDAnICsgaS50b1N0cmluZygxNikpLnNsaWNlKC02KTtcbiAgICAgICAgICB0aGlzLnRyaWFuZ2xlc1tpXS5yZW5kZXIodGhpcy5zaGFkb3dDdHgsIGNvbG9yLCBmYWxzZSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMuaG92ZXJTaGFkb3dDYW52YXMpIHtcbiAgICAgICAgdGhpcy5zaGFkb3dJbWFnZURhdGEgPSB0aGlzLnNoYWRvd0N0eC5nZXRJbWFnZURhdGEoMCwgMCwgdGhpcy5jYW52YXMud2lkdGgsIHRoaXMuY2FudmFzLmhlaWdodCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gcmVuZGVycyB0aGUgcG9pbnRzIG9mIHRoZSB0cmlhbmdsZXNcbiAgICByZW5kZXJQb2ludHMoKSB7XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMucG9pbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBjb2xvciA9IHRoaXMub3B0aW9ucy5wb2ludENvbG9yKHRoaXMucG9pbnRzW2ldLmNhbnZhc0NvbG9yQXRQb2ludCh0aGlzLmdyYWRpZW50SW1hZ2VEYXRhKSk7XG4gICAgICAgIHRoaXMucG9pbnRzW2ldLnJlbmRlcih0aGlzLmN0eCwgY29sb3IpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIGRyYXdzIHRoZSBjaXJjbGVzIHRoYXQgZGVmaW5lIHRoZSBncmFkaWVudHNcbiAgICByZW5kZXJHcmFkaWVudENpcmNsZXMoKSB7XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMucmFkaWFsR3JhZGllbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHRoaXMuY3R4LmJlZ2luUGF0aCgpO1xuICAgICAgICB0aGlzLmN0eC5hcmModGhpcy5yYWRpYWxHcmFkaWVudHNbaV0ueDAsXG4gICAgICAgICAgICAgICAgdGhpcy5yYWRpYWxHcmFkaWVudHNbaV0ueTAsXG4gICAgICAgICAgICAgICAgdGhpcy5yYWRpYWxHcmFkaWVudHNbaV0ucjAsXG4gICAgICAgICAgICAgICAgMCwgTWF0aC5QSSAqIDIsIHRydWUpO1xuICAgICAgICB2YXIgY2VudGVyMSA9IG5ldyBQb2ludCh0aGlzLnJhZGlhbEdyYWRpZW50c1tpXS54MCwgdGhpcy5yYWRpYWxHcmFkaWVudHNbaV0ueTApO1xuICAgICAgICB0aGlzLmN0eC5zdHJva2VTdHlsZSA9IGNlbnRlcjEuY2FudmFzQ29sb3JBdFBvaW50KHRoaXMuZ3JhZGllbnRJbWFnZURhdGEpO1xuICAgICAgICB0aGlzLmN0eC5zdHJva2UoKTtcblxuICAgICAgICB0aGlzLmN0eC5iZWdpblBhdGgoKTtcbiAgICAgICAgdGhpcy5jdHguYXJjKHRoaXMucmFkaWFsR3JhZGllbnRzW2ldLngxLFxuICAgICAgICAgICAgICAgIHRoaXMucmFkaWFsR3JhZGllbnRzW2ldLnkxLFxuICAgICAgICAgICAgICAgIHRoaXMucmFkaWFsR3JhZGllbnRzW2ldLnIxLFxuICAgICAgICAgICAgICAgIDAsIE1hdGguUEkgKiAyLCB0cnVlKTtcbiAgICAgICAgdmFyIGNlbnRlcjIgPSBuZXcgUG9pbnQodGhpcy5yYWRpYWxHcmFkaWVudHNbaV0ueDEsIHRoaXMucmFkaWFsR3JhZGllbnRzW2ldLnkxKTtcbiAgICAgICAgdGhpcy5jdHguc3Ryb2tlU3R5bGUgPSBjZW50ZXIyLmNhbnZhc0NvbG9yQXRQb2ludCh0aGlzLmdyYWRpZW50SW1hZ2VEYXRhKTtcbiAgICAgICAgdGhpcy5jdHguc3Ryb2tlKCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gcmVuZGVyIHRyaWFuZ2xlIGNlbnRyb2lkc1xuICAgIHJlbmRlckNlbnRyb2lkcygpIHtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy50cmlhbmdsZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIGNvbG9yID0gdGhpcy5vcHRpb25zLmNlbnRyb2lkQ29sb3IodGhpcy50cmlhbmdsZXNbaV0uY29sb3JBdENlbnRyb2lkKHRoaXMuZ3JhZGllbnRJbWFnZURhdGEpKTtcbiAgICAgICAgdGhpcy50cmlhbmdsZXNbaV0uY2VudHJvaWQoKS5yZW5kZXIodGhpcy5jdHgsIGNvbG9yKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0b2dnbGVUcmlhbmdsZXMoKSB7XG4gICAgICB0aGlzLm9wdGlvbnMuc2hvd1RyaWFuZ2xlcyA9ICF0aGlzLm9wdGlvbnMuc2hvd1RyaWFuZ2xlcztcbiAgICAgIHRoaXMucmVuZGVyKCk7XG4gICAgfVxuXG4gICAgdG9nZ2xlUG9pbnRzKCkge1xuICAgICAgdGhpcy5vcHRpb25zLnNob3dQb2ludHMgPSAhdGhpcy5vcHRpb25zLnNob3dQb2ludHM7XG4gICAgICB0aGlzLnJlbmRlcigpO1xuICAgIH1cblxuICAgIHRvZ2dsZUNpcmNsZXMoKSB7XG4gICAgICB0aGlzLm9wdGlvbnMuc2hvd0NpcmNsZXMgPSAhdGhpcy5vcHRpb25zLnNob3dDaXJjbGVzO1xuICAgICAgdGhpcy5yZW5kZXIoKTtcbiAgICB9XG5cbiAgICB0b2dnbGVDZW50cm9pZHMoKSB7XG4gICAgICB0aGlzLm9wdGlvbnMuc2hvd0NlbnRyb2lkcyA9ICF0aGlzLm9wdGlvbnMuc2hvd0NlbnRyb2lkcztcbiAgICAgIHRoaXMucmVuZGVyKCk7XG4gICAgfVxuXG4gICAgdG9nZ2xlRWRnZXMoKSB7XG4gICAgICB0aGlzLm9wdGlvbnMuc2hvd0VkZ2VzID0gIXRoaXMub3B0aW9ucy5zaG93RWRnZXM7XG4gICAgICB0aGlzLnJlbmRlcigpO1xuICAgIH1cbiAgfVxuXG4gIHdpbmRvdy5QcmV0dHlEZWxhdW5heSA9IFByZXR0eURlbGF1bmF5O1xufSkoKTtcbiIsInZhciBSYW5kb207XG5cbihmdW5jdGlvbigpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuICAvLyBSYW5kb20gaGVscGVyIGZ1bmN0aW9ucy8vIHJhbmRvbSBoZWxwZXIgZnVuY3Rpb25zXG5cbiAgdmFyIFBvaW50ID0gUG9pbnQgfHwgcmVxdWlyZSgnLi9wb2ludCcpO1xuXG4gIFJhbmRvbSA9IHtcbiAgICAvLyBoZXkgbG9vayBhIGNsb3N1cmVcbiAgICAvLyByZXR1cm5zIGZ1bmN0aW9uIGZvciByYW5kb20gbnVtYmVycyB3aXRoIHByZS1zZXQgbWF4IGFuZCBtaW5cbiAgICByYW5kb21OdW1iZXJGdW5jdGlvbjogZnVuY3Rpb24obWF4LCBtaW4pIHtcbiAgICAgIG1pbiA9IG1pbiB8fCAwO1xuICAgICAgaWYgKG1pbiA+IG1heCkge1xuICAgICAgICB2YXIgdGVtcCA9IG1heDtcbiAgICAgICAgbWF4ID0gbWluO1xuICAgICAgICBtaW4gPSB0ZW1wO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogKG1heCAtIG1pbiArIDEpKSArIG1pbjtcbiAgICAgIH07XG4gICAgfSxcblxuICAgIC8vIHJldHVybnMgYSByYW5kb20gbnVtYmVyXG4gICAgLy8gYmV0d2VlbiB0aGUgbWF4IGFuZCBtaW5cbiAgICByYW5kb21CZXR3ZWVuOiBmdW5jdGlvbihtYXgsIG1pbikge1xuICAgICAgbWluID0gbWluIHx8IDA7XG4gICAgICByZXR1cm4gUmFuZG9tLnJhbmRvbU51bWJlckZ1bmN0aW9uKG1heCwgbWluKSgpO1xuICAgIH0sXG5cbiAgICByYW5kb21JbkNpcmNsZTogZnVuY3Rpb24ocmFkaXVzLCBveCwgb3kpIHtcbiAgICAgIHZhciBhbmdsZSA9IE1hdGgucmFuZG9tKCkgKiBNYXRoLlBJICogMjtcbiAgICAgIHZhciByYWQgPSBNYXRoLnNxcnQoTWF0aC5yYW5kb20oKSkgKiByYWRpdXM7XG4gICAgICB2YXIgeCA9IG94ICsgcmFkICogTWF0aC5jb3MoYW5nbGUpO1xuICAgICAgdmFyIHkgPSBveSArIHJhZCAqIE1hdGguc2luKGFuZ2xlKTtcblxuICAgICAgcmV0dXJuIG5ldyBQb2ludCh4LCB5KTtcbiAgICB9LFxuXG4gICAgcmFuZG9tUmdiYTogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gJ3JnYmEoJyArIFJhbmRvbS5yYW5kb21CZXR3ZWVuKDI1NSkgKyAnLCcgK1xuICAgICAgICAgICAgICAgICAgICAgICBSYW5kb20ucmFuZG9tQmV0d2VlbigyNTUpICsgJywnICtcbiAgICAgICAgICAgICAgICAgICAgICAgUmFuZG9tLnJhbmRvbUJldHdlZW4oMjU1KSArICcsIDEpJztcbiAgICB9LFxuXG4gICAgcmFuZG9tSHNsYTogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gJ2hzbGEoJyArIFJhbmRvbS5yYW5kb21CZXR3ZWVuKDM2MCkgKyAnLCcgK1xuICAgICAgICAgICAgICAgICAgICAgICBSYW5kb20ucmFuZG9tQmV0d2VlbigxMDApICsgJyUsJyArXG4gICAgICAgICAgICAgICAgICAgICAgIFJhbmRvbS5yYW5kb21CZXR3ZWVuKDEwMCkgKyAnJSwgMSknO1xuICAgIH0sXG4gIH07XG5cbiAgaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBSYW5kb207XG4gIH1cblxufSkoKTtcbiIsInZhciBUcmlhbmdsZTtcblxuKGZ1bmN0aW9uKCkge1xuICAndXNlIHN0cmljdCc7XG5cbiAgdmFyIFBvaW50ID0gUG9pbnQgfHwgcmVxdWlyZSgnLi9wb2ludCcpO1xuXG4gIC8qKlxuICAgKiBSZXByZXNlbnRzIGEgdHJpYW5nbGVcbiAgICogQGNsYXNzXG4gICAqL1xuICBjbGFzcyBfVHJpYW5nbGUge1xuICAgIC8qKlxuICAgICAqIFRyaWFuZ2xlIGNvbnNpc3RzIG9mIHRocmVlIFBvaW50c1xuICAgICAqIEBjb25zdHJ1Y3RvclxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBhXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGJcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gY1xuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKGEsIGIsIGMpIHtcbiAgICAgIHRoaXMucDEgPSB0aGlzLmEgPSBhO1xuICAgICAgdGhpcy5wMiA9IHRoaXMuYiA9IGI7XG4gICAgICB0aGlzLnAzID0gdGhpcy5jID0gYztcblxuICAgICAgdGhpcy5jb2xvciA9ICdibGFjayc7XG4gICAgICB0aGlzLnN0cm9rZSA9ICdibGFjayc7XG4gICAgfVxuXG4gICAgLy8gZHJhdyB0aGUgdHJpYW5nbGUgd2l0aCBkaWZmZXJpbmcgZWRnZSBjb2xvcnMgb3B0aW9uYWxcbiAgICByZW5kZXIoY3R4LCBjb2xvciwgc3Ryb2tlKSB7XG4gICAgICBjdHguYmVnaW5QYXRoKCk7XG4gICAgICBjdHgubW92ZVRvKHRoaXMuYS54LCB0aGlzLmEueSk7XG4gICAgICBjdHgubGluZVRvKHRoaXMuYi54LCB0aGlzLmIueSk7XG4gICAgICBjdHgubGluZVRvKHRoaXMuYy54LCB0aGlzLmMueSk7XG4gICAgICBjdHguY2xvc2VQYXRoKCk7XG4gICAgICBjdHguc3Ryb2tlU3R5bGUgPSBzdHJva2UgfHwgdGhpcy5zdHJva2UgfHwgdGhpcy5jb2xvcjtcbiAgICAgIGN0eC5maWxsU3R5bGUgPSBjb2xvciB8fCB0aGlzLmNvbG9yO1xuICAgICAgaWYgKGNvbG9yICE9PSBmYWxzZSAmJiBzdHJva2UgIT09IGZhbHNlKSB7XG4gICAgICAgIC8vIGRyYXcgdGhlIHN0cm9rZSB1c2luZyB0aGUgZmlsbCBjb2xvciBmaXJzdFxuICAgICAgICAvLyBzbyB0aGF0IHRoZSBwb2ludHMgb2YgYWRqYWNlbnQgdHJpYW5nbGVzXG4gICAgICAgIC8vIGRvbnQgb3ZlcmxhcCBhIGJ1bmNoIGFuZCBsb29rIFwic3RhcnJ5XCJcbiAgICAgICAgdmFyIHRlbXBTdHJva2UgPSBjdHguc3Ryb2tlU3R5bGU7XG4gICAgICAgIGN0eC5zdHJva2VTdHlsZSA9IGN0eC5maWxsU3R5bGU7XG4gICAgICAgIGN0eC5zdHJva2UoKTtcbiAgICAgICAgY3R4LnN0cm9rZVN0eWxlID0gdGVtcFN0cm9rZTtcbiAgICAgIH1cbiAgICAgIGlmIChjb2xvciAhPT0gZmFsc2UpIHtcbiAgICAgICAgY3R4LmZpbGwoKTtcbiAgICAgIH1cbiAgICAgIGlmIChzdHJva2UgIT09IGZhbHNlKSB7XG4gICAgICAgIGN0eC5zdHJva2UoKTtcbiAgICAgIH1cbiAgICAgIGN0eC5jbG9zZVBhdGgoKTtcbiAgICB9XG5cbiAgICAvLyByYW5kb20gcG9pbnQgaW5zaWRlIHRyaWFuZ2xlXG4gICAgcmFuZG9tSW5zaWRlKCkge1xuICAgICAgdmFyIHIxID0gTWF0aC5yYW5kb20oKTtcbiAgICAgIHZhciByMiA9IE1hdGgucmFuZG9tKCk7XG4gICAgICB2YXIgeCA9ICgxIC0gTWF0aC5zcXJ0KHIxKSkgKlxuICAgICAgICAgICAgICB0aGlzLnAxLnggKyAoTWF0aC5zcXJ0KHIxKSAqXG4gICAgICAgICAgICAgICgxIC0gcjIpKSAqXG4gICAgICAgICAgICAgIHRoaXMucDIueCArIChNYXRoLnNxcnQocjEpICogcjIpICpcbiAgICAgICAgICAgICAgdGhpcy5wMy54O1xuICAgICAgdmFyIHkgPSAoMSAtIE1hdGguc3FydChyMSkpICpcbiAgICAgICAgICAgICAgdGhpcy5wMS55ICsgKE1hdGguc3FydChyMSkgKlxuICAgICAgICAgICAgICAoMSAtIHIyKSkgKlxuICAgICAgICAgICAgICB0aGlzLnAyLnkgKyAoTWF0aC5zcXJ0KHIxKSAqIHIyKSAqXG4gICAgICAgICAgICAgIHRoaXMucDMueTtcbiAgICAgIHJldHVybiBuZXcgUG9pbnQoeCwgeSk7XG4gICAgfVxuXG4gICAgY29sb3JBdENlbnRyb2lkKGltYWdlRGF0YSkge1xuICAgICAgcmV0dXJuIHRoaXMuY2VudHJvaWQoKS5jYW52YXNDb2xvckF0UG9pbnQoaW1hZ2VEYXRhKTtcbiAgICB9XG5cbiAgICBjZW50cm9pZCgpIHtcbiAgICAgIC8vIG9ubHkgY2FsYyB0aGUgY2VudHJvaWQgaWYgd2UgZG9udCBhbHJlYWR5IGtub3cgaXRcbiAgICAgIGlmICh0aGlzLl9jZW50cm9pZCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fY2VudHJvaWQ7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgeCA9IE1hdGgucm91bmQoKHRoaXMucDEueCArIHRoaXMucDIueCArIHRoaXMucDMueCkgLyAzKTtcbiAgICAgICAgdmFyIHkgPSBNYXRoLnJvdW5kKCh0aGlzLnAxLnkgKyB0aGlzLnAyLnkgKyB0aGlzLnAzLnkpIC8gMyk7XG4gICAgICAgIHRoaXMuX2NlbnRyb2lkID0gbmV3IFBvaW50KHgsIHkpO1xuXG4gICAgICAgIHJldHVybiB0aGlzLl9jZW50cm9pZDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzEzMzAwOTA0L2RldGVybWluZS13aGV0aGVyLXBvaW50LWxpZXMtaW5zaWRlLXRyaWFuZ2xlXG4gICAgcG9pbnRJblRyaWFuZ2xlKHBvaW50KSB7XG4gICAgICB2YXIgYWxwaGEgPSAoKHRoaXMucDIueSAtIHRoaXMucDMueSkgKiAocG9pbnQueCAtIHRoaXMucDMueCkgKyAodGhpcy5wMy54IC0gdGhpcy5wMi54KSAqIChwb2ludC55IC0gdGhpcy5wMy55KSkgL1xuICAgICAgICAgICAgICAgICgodGhpcy5wMi55IC0gdGhpcy5wMy55KSAqICh0aGlzLnAxLnggLSB0aGlzLnAzLngpICsgKHRoaXMucDMueCAtIHRoaXMucDIueCkgKiAodGhpcy5wMS55IC0gdGhpcy5wMy55KSk7XG4gICAgICB2YXIgYmV0YSA9ICgodGhpcy5wMy55IC0gdGhpcy5wMS55KSAqIChwb2ludC54IC0gdGhpcy5wMy54KSArICh0aGlzLnAxLnggLSB0aGlzLnAzLngpICogKHBvaW50LnkgLSB0aGlzLnAzLnkpKSAvXG4gICAgICAgICAgICAgICAoKHRoaXMucDIueSAtIHRoaXMucDMueSkgKiAodGhpcy5wMS54IC0gdGhpcy5wMy54KSArICh0aGlzLnAzLnggLSB0aGlzLnAyLngpICogKHRoaXMucDEueSAtIHRoaXMucDMueSkpO1xuICAgICAgdmFyIGdhbW1hID0gMS4wIC0gYWxwaGEgLSBiZXRhO1xuXG4gICAgICByZXR1cm4gKGFscGhhID4gMCAmJiBiZXRhID4gMCAmJiBnYW1tYSA+IDApO1xuICAgIH1cblxuICAgIC8vIHNjYWxlIHBvaW50cyBmcm9tIFtBLCBCXSB0byBbQywgRF1cbiAgICAvLyB4QSA9PiBvbGQgeCBtaW4sIHhCID0+IG9sZCB4IG1heFxuICAgIC8vIHlBID0+IG9sZCB5IG1pbiwgeUIgPT4gb2xkIHkgbWF4XG4gICAgLy8geEMgPT4gbmV3IHggbWluLCB4RCA9PiBuZXcgeCBtYXhcbiAgICAvLyB5QyA9PiBuZXcgeSBtaW4sIHlEID0+IG5ldyB5IG1heFxuICAgIHJlc2NhbGVQb2ludHMoeEEsIHhCLCB5QSwgeUIsIHhDLCB4RCwgeUMsIHlEKSB7XG4gICAgICB0aGlzLnAxLnJlc2NhbGUoeEEsIHhCLCB5QSwgeUIsIHhDLCB4RCwgeUMsIHlEKTtcbiAgICAgIHRoaXMucDIucmVzY2FsZSh4QSwgeEIsIHlBLCB5QiwgeEMsIHhELCB5QywgeUQpO1xuICAgICAgdGhpcy5wMy5yZXNjYWxlKHhBLCB4QiwgeUEsIHlCLCB4QywgeEQsIHlDLCB5RCk7XG4gICAgICAvLyByZWNhbGN1bGF0ZSB0aGUgY2VudHJvaWRcbiAgICAgIHRoaXMuY2VudHJvaWQoKTtcbiAgICB9XG5cbiAgICBtYXhYKCkge1xuICAgICAgcmV0dXJuIE1hdGgubWF4KHRoaXMucDEueCwgdGhpcy5wMi54LCB0aGlzLnAzLngpO1xuICAgIH1cblxuICAgIG1heFkoKSB7XG4gICAgICByZXR1cm4gTWF0aC5tYXgodGhpcy5wMS55LCB0aGlzLnAyLnksIHRoaXMucDMueSk7XG4gICAgfVxuXG4gICAgbWluWCgpIHtcbiAgICAgIHJldHVybiBNYXRoLm1pbih0aGlzLnAxLngsIHRoaXMucDIueCwgdGhpcy5wMy54KTtcbiAgICB9XG5cbiAgICBtaW5ZKCkge1xuICAgICAgcmV0dXJuIE1hdGgubWluKHRoaXMucDEueSwgdGhpcy5wMi55LCB0aGlzLnAzLnkpO1xuICAgIH1cblxuICAgIGdldFBvaW50cygpIHtcbiAgICAgIHJldHVybiBbdGhpcy5wMSwgdGhpcy5wMiwgdGhpcy5wM107XG4gICAgfVxuICB9XG5cbiAgaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBfVHJpYW5nbGU7XG4gIH1cblxuICBUcmlhbmdsZSA9IF9UcmlhbmdsZTtcbn0pKCk7XG4iXX0=
