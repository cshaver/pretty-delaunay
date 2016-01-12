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
    }, {
      key: 'resetColor',
      value: function resetColor() {
        this._canvasColor = undefined;
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
 *  - improve rendering speed
 *  - smooth out appearance of fading in gradients during animation
 *  - document usage
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
          if (!_this.options.animate) {
            var rect = canvas.getBoundingClientRect();
            _this.mousePosition = new Point(e.clientX - rect.left, e.clientY - rect.top);
            _this.hover();
          }
        }, false);

        this.canvas.addEventListener('mouseout', function () {
          if (!_this.options.animate) {
            _this.mousePosition = false;
            _this.hover();
          }
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
        this.colors = colors ? colors : this.options.colorPalette ? this.options.colorPalette[Random.randomBetween(0, this.options.colorPalette.length - 1)] : this.colors;

        this.minGradients = minGradients;
        this.maxGradients = maxGradients;

        this.resizeCanvas();

        this.generateNewPoints(min, max, minEdge, maxEdge);

        this.triangulate();

        this.generateGradients(minGradients, maxGradients);

        // prep for animation
        this.nextGradients = this.radialGradients.slice(0);
        this.generateGradients();
        this.currentGradients = this.radialGradients.slice(0);

        this.render();

        if (this.options.animate && !this.looping) {
          this.initRenderLoop();
        }
      }
    }, {
      key: 'initRenderLoop',
      value: function initRenderLoop() {
        this.looping = true;
        this.frameSteps = this.options.loopFrames;
        this.frame = this.frame ? this.frame : this.frameSteps;
        this.renderLoop();
      }
    }, {
      key: 'renderLoop',
      value: function renderLoop() {
        var _this2 = this;

        this.frame++;

        // current => next, next => new
        if (this.frame > this.frameSteps) {
          var nextGradients = this.nextGradients ? this.nextGradients : this.radialGradients;
          this.generateGradients();
          this.nextGradients = this.radialGradients;
          this.radialGradients = nextGradients.slice(0);
          this.currentGradients = nextGradients.slice(0);

          this.frame = 0;
        } else {
          // fancy steps
          // {x0, y0, r0, x1, y1, r1, colorStop}
          for (var i = 0; i < Math.max(this.radialGradients.length, this.nextGradients.length); i++) {
            var currentGradient = this.currentGradients[i];
            var nextGradient = this.nextGradients[i];

            if (typeof currentGradient === 'undefined') {
              var newGradient = {
                x0: nextGradient.x0,
                y0: nextGradient.y0,
                r0: 0,
                x1: nextGradient.x1,
                y1: nextGradient.y1,
                r1: 0,
                colorStop: nextGradient.colorStop
              };
              currentGradient = newGradient;
              this.currentGradients.push(newGradient);
              this.radialGradients.push(newGradient);
            }

            if (typeof nextGradient === 'undefined') {
              nextGradient = {
                x0: currentGradient.x0,
                y0: currentGradient.y0,
                r0: 0,
                x1: currentGradient.x1,
                y1: currentGradient.y1,
                r1: 0,
                colorStop: currentGradient.colorStop
              };
            }

            var updatedGradient = {};

            // scale the difference between current and next gradient based on step in frames
            var scale = this.frame / this.frameSteps;

            updatedGradient.x0 = Math.round(linearScale(currentGradient.x0, nextGradient.x0, scale));
            updatedGradient.y0 = Math.round(linearScale(currentGradient.y0, nextGradient.y0, scale));
            updatedGradient.r0 = Math.round(linearScale(currentGradient.r0, nextGradient.r0, scale));
            updatedGradient.x1 = Math.round(linearScale(currentGradient.x1, nextGradient.x0, scale));
            updatedGradient.y1 = Math.round(linearScale(currentGradient.y1, nextGradient.y0, scale));
            updatedGradient.r1 = Math.round(linearScale(currentGradient.r1, nextGradient.r1, scale));
            updatedGradient.colorStop = linearScale(currentGradient.colorStop, nextGradient.colorStop, scale);

            this.radialGradients[i] = updatedGradient;
          }
        }

        this.resetPointColors();
        this.render();

        if (this.options.animate) {
          requestAnimationFrame(function () {
            _this2.renderLoop();
          });
        } else {
          this.looping = false;
        }
      }

      // creates a hidden canvas for hover detection

    }, {
      key: 'createHoverShadowCanvas',
      value: function createHoverShadowCanvas() {
        this.hoverShadowCanvas = document.createElement('canvas');
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
    }, {
      key: 'resetPointColors',
      value: function resetPointColors() {
        // reset cached colors of centroids and points
        var i;
        for (i = 0; i < this.triangles.length; i++) {
          this.triangles[i].resetPointColors();
        }

        for (i = 0; i < this.points.length; i++) {
          this.points[i].resetColor();
        }
      }

      // create random radial gradient circles for rendering later

    }, {
      key: 'generateGradients',
      value: function generateGradients(minGradients, maxGradients) {
        this.radialGradients = [];

        minGradients = minGradients || this.minGradients > 0 ? minGradients || this.minGradients : 1;
        maxGradients = maxGradients || this.maxGradients > 0 ? maxGradients || this.maxGradients : 2;

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
        this.rescaleGradients(this.radialGradients, xMin, xMax, yMin, yMax);
        this.rescaleGradients(this.currentGradients, xMin, xMax, yMin, yMax);
        this.rescaleGradients(this.nextGradients, xMin, xMax, yMin, yMax);

        this.render();
      }
    }, {
      key: 'rescaleGradients',
      value: function rescaleGradients(array, xMin, xMax, yMin, yMax) {
        for (var i = 0; i < array.length; i++) {
          var circle0 = new Point(array[i].x0, array[i].y0);
          var circle1 = new Point(array[i].x1, array[i].y1);

          circle0.rescale(xMin, xMax, yMin, yMax, 0, this.canvas.width, 0, this.canvas.height);
          circle1.rescale(xMin, xMax, yMin, yMax, 0, this.canvas.width, 0, this.canvas.height);

          array[i].x0 = circle0.x;
          array[i].y0 = circle0.y;
          array[i].x1 = circle1.x;
          array[i].y1 = circle1.y;
        }
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
        // render a gradient as a base to get triangle colors
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
        this.resetPointColors();
        this.render();
      }
    }, {
      key: 'renderNewGradient',
      value: function renderNewGradient(minGradients, maxGradients) {
        this.generateGradients(minGradients, maxGradients);

        // prep for animation
        this.nextGradients = this.radialGradients.slice(0);
        this.generateGradients();
        this.currentGradients = this.radialGradients.slice(0);

        this.resetPointColors();
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
    }, {
      key: 'toggleAnimation',
      value: function toggleAnimation() {
        this.options.animate = !this.options.animate;
        if (this.options.animate) {
          this.initRenderLoop();
        }
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
          animate: false,
          loopFrames: 250,

          // default colors
          colors: ['hsla(0, 0%, 100%, 1)', 'hsla(0, 0%, 50%, 1)', 'hsla(0, 0%, 0%, 1)'],

          // randomly choose from color palette on randomize if not supplied colors
          colorPalette: false,

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

  function linearScale(x0, x1, scale) {
    return x0 + scale * (x1 - x0);
  }

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
      key: 'resetPointColors',
      value: function resetPointColors() {
        this.centroid().resetColor();
        this.p1.resetColor();
        this.p2.resetColor();
        this.p3.resetColor();
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJsaWIvX2RlbGF1bmF5LmpzIiwibGliL2NvbG9yLmpzIiwibGliL3BvaW50LmpzIiwibGliL3BvaW50TWFwLmpzIiwibGliL3ByZXR0eS1kZWxhdW5heS5qcyIsImxpYi9yYW5kb20uanMiLCJsaWIvdHJpYW5nbGUuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7QUNDQSxJQUFJLFFBQVEsQ0FBQzs7QUFFYixDQUFDLFlBQVc7QUFDVixjQUFZLENBQUM7O0FBRWIsTUFBSSxPQUFPLEdBQUcsR0FBRyxHQUFHLFNBQVMsQ0FBQzs7QUFFOUIsV0FBUyxhQUFhLENBQUMsUUFBUSxFQUFFO0FBQy9CLFFBQUksSUFBSSxHQUFHLE1BQU0sQ0FBQyxpQkFBaUI7UUFDL0IsSUFBSSxHQUFHLE1BQU0sQ0FBQyxpQkFBaUI7UUFDL0IsSUFBSSxHQUFHLE1BQU0sQ0FBQyxpQkFBaUI7UUFDL0IsSUFBSSxHQUFHLE1BQU0sQ0FBQyxpQkFBaUI7UUFDL0IsQ0FBQztRQUFFLEVBQUU7UUFBRSxFQUFFO1FBQUUsSUFBSTtRQUFFLElBQUk7UUFBRSxJQUFJLENBQUM7O0FBRWhDLFNBQUksQ0FBQyxHQUFHLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEdBQUk7QUFDOUIsVUFBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxFQUFFLElBQUksR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDaEQsVUFBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxFQUFFLElBQUksR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDaEQsVUFBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxFQUFFLElBQUksR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDaEQsVUFBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxFQUFFLElBQUksR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7S0FDakQ7O0FBRUQsTUFBRSxHQUFHLElBQUksR0FBRyxJQUFJLENBQUM7QUFDakIsTUFBRSxHQUFHLElBQUksR0FBRyxJQUFJLENBQUM7QUFDakIsUUFBSSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO0FBQ3hCLFFBQUksR0FBRyxJQUFJLEdBQUcsRUFBRSxHQUFHLEdBQUcsQ0FBQztBQUN2QixRQUFJLEdBQUcsSUFBSSxHQUFHLEVBQUUsR0FBRyxHQUFHLENBQUM7O0FBRXZCLFdBQU8sQ0FDTCxDQUFDLElBQUksR0FBRyxFQUFFLEdBQUcsSUFBSSxFQUFFLElBQUksR0FBUSxJQUFJLENBQUMsRUFDcEMsQ0FBQyxJQUFJLEVBQWMsSUFBSSxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUMsRUFDcEMsQ0FBQyxJQUFJLEdBQUcsRUFBRSxHQUFHLElBQUksRUFBRSxJQUFJLEdBQVEsSUFBSSxDQUFDLENBQ3JDLENBQUM7R0FDSDs7QUFFRCxXQUFTLFlBQVksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUU7QUFDdkMsUUFBSSxFQUFFLEdBQUcsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNuQixFQUFFLEdBQUcsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNuQixFQUFFLEdBQUcsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNuQixFQUFFLEdBQUcsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNuQixFQUFFLEdBQUcsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNuQixFQUFFLEdBQUcsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNuQixRQUFRLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDO1FBQzVCLFFBQVEsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUM7UUFDNUIsRUFBRTtRQUFFLEVBQUU7UUFBRSxFQUFFO1FBQUUsRUFBRTtRQUFFLEdBQUc7UUFBRSxHQUFHO1FBQUUsR0FBRztRQUFFLEdBQUc7UUFBRSxFQUFFO1FBQUUsRUFBRTs7O0FBQUMsQUFHL0MsUUFBRyxRQUFRLEdBQUcsT0FBTyxJQUFJLFFBQVEsR0FBRyxPQUFPLEVBQ3pDLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQzs7QUFFN0MsUUFBRyxRQUFRLEdBQUcsT0FBTyxFQUFFO0FBQ3JCLFFBQUUsR0FBSSxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQSxJQUFLLEVBQUUsR0FBRyxFQUFFLENBQUEsQ0FBQyxBQUFDLENBQUM7QUFDL0IsU0FBRyxHQUFHLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQSxHQUFJLEdBQUcsQ0FBQztBQUN0QixTQUFHLEdBQUcsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFBLEdBQUksR0FBRyxDQUFDO0FBQ3RCLFFBQUUsR0FBSSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUEsR0FBSSxHQUFHLENBQUM7QUFDdEIsUUFBRSxHQUFJLEVBQUUsSUFBSSxFQUFFLEdBQUcsR0FBRyxDQUFBLEFBQUMsR0FBRyxHQUFHLENBQUM7S0FDN0IsTUFFSSxJQUFHLFFBQVEsR0FBRyxPQUFPLEVBQUU7QUFDMUIsUUFBRSxHQUFJLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFBLElBQUssRUFBRSxHQUFHLEVBQUUsQ0FBQSxDQUFDLEFBQUMsQ0FBQztBQUMvQixTQUFHLEdBQUcsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFBLEdBQUksR0FBRyxDQUFDO0FBQ3RCLFNBQUcsR0FBRyxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUEsR0FBSSxHQUFHLENBQUM7QUFDdEIsUUFBRSxHQUFJLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQSxHQUFJLEdBQUcsQ0FBQztBQUN0QixRQUFFLEdBQUksRUFBRSxJQUFJLEVBQUUsR0FBRyxHQUFHLENBQUEsQUFBQyxHQUFHLEdBQUcsQ0FBQztLQUM3QixNQUVJO0FBQ0gsUUFBRSxHQUFJLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFBLElBQUssRUFBRSxHQUFHLEVBQUUsQ0FBQSxDQUFDLEFBQUMsQ0FBQztBQUMvQixRQUFFLEdBQUksRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUEsSUFBSyxFQUFFLEdBQUcsRUFBRSxDQUFBLENBQUMsQUFBQyxDQUFDO0FBQy9CLFNBQUcsR0FBRyxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUEsR0FBSSxHQUFHLENBQUM7QUFDdEIsU0FBRyxHQUFHLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQSxHQUFJLEdBQUcsQ0FBQztBQUN0QixTQUFHLEdBQUcsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFBLEdBQUksR0FBRyxDQUFDO0FBQ3RCLFNBQUcsR0FBRyxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUEsR0FBSSxHQUFHLENBQUM7QUFDdEIsUUFBRSxHQUFJLENBQUMsRUFBRSxHQUFHLEdBQUcsR0FBRyxFQUFFLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLENBQUEsSUFBSyxFQUFFLEdBQUcsRUFBRSxDQUFBLEFBQUMsQ0FBQztBQUNwRCxRQUFFLEdBQUksQUFBQyxRQUFRLEdBQUcsUUFBUSxHQUN4QixFQUFFLElBQUksRUFBRSxHQUFHLEdBQUcsQ0FBQSxBQUFDLEdBQUcsR0FBRyxHQUNyQixFQUFFLElBQUksRUFBRSxHQUFHLEdBQUcsQ0FBQSxBQUFDLEdBQUcsR0FBRyxDQUFDO0tBQ3pCOztBQUVELE1BQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDO0FBQ2IsTUFBRSxHQUFHLEVBQUUsR0FB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Q0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7O0FBQUEsQUFHckQsYUFBTyxJQUFJLENBQUM7S0FDYjtBQUNELFlBQVEsRUFBRSxrQkFBUyxHQUFHLEVBQUUsQ0FBQyxFQUFFOztBQUV6QixVQUFHLEFBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQ3hELENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxBQUFDLElBQ3pELENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxBQUFDLElBQ3pELENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxBQUFDLEVBQzNELE9BQU8sSUFBSSxDQUFDOztBQUVkLFVBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1VBQ3pCLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztVQUN6QixDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7VUFDekIsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1VBQ3pCLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDOzs7QUFBQyxBQUd0QixVQUFHLENBQUMsS0FBSyxHQUFHLEVBQ1YsT0FBTyxJQUFJLENBQUM7O0FBRWQsVUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQSxBQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUEsQUFBQyxDQUFBLEdBQUksQ0FBQztVQUN6RCxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQSxBQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUEsQUFBQyxD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R0FBRyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7O0FBRWpDLGlCQUFPLElBQUksQ0FBQyxTQUFTLENBQUM7U0FDdkI7T0FDRjs7Ozs7O3NDQUdlLEtBQUssRUFBRTtBQUNyQixZQUFJLEtBQUssR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUEsSUFBSyxLQUFLLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBLEFBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBLElBQUssS0FBSyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQSxBQUFDLENBQUEsSUFDbkcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQSxJQUFLLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBLEFBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBLElBQUssSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUEsQUFBQyxDQUFBLEFBQUMsQ0FBQztBQUNsSCxZQUFJLElBQUksR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUEsSUFBSyxLQUFLLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBLEFBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxFQUFFLENB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bmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8qIEZyb20gaHR0cHM6Ly9naXRodWIuY29tL2lyb253YWxsYWJ5L2RlbGF1bmF5ICovXG52YXIgRGVsYXVuYXk7XG5cbihmdW5jdGlvbigpIHtcbiAgXCJ1c2Ugc3RyaWN0XCI7XG5cbiAgdmFyIEVQU0lMT04gPSAxLjAgLyAxMDQ4NTc2LjA7XG5cbiAgZnVuY3Rpb24gc3VwZXJ0cmlhbmdsZSh2ZXJ0aWNlcykge1xuICAgIHZhciB4bWluID0gTnVtYmVyLlBPU0lUSVZFX0lORklOSVRZLFxuICAgICAgICB5bWluID0gTnVtYmVyLlBPU0lUSVZFX0lORklOSVRZLFxuICAgICAgICB4bWF4ID0gTnVtYmVyLk5FR0FUSVZFX0lORklOSVRZLFxuICAgICAgICB5bWF4ID0gTnVtYmVyLk5FR0FUSVZFX0lORklOSVRZLFxuICAgICAgICBpLCBkeCwgZHksIGRtYXgsIHhtaWQsIHltaWQ7XG5cbiAgICBmb3IoaSA9IHZlcnRpY2VzLmxlbmd0aDsgaS0tOyApIHtcbiAgICAgIGlmKHZlcnRpY2VzW2ldWzBdIDwgeG1pbikgeG1pbiA9IHZlcnRpY2VzW2ldWzBdO1xuICAgICAgaWYodmVydGljZXNbaV1bMF0gPiB4bWF4KSB4bWF4ID0gdmVydGljZXNbaV1bMF07XG4gICAgICBpZih2ZXJ0aWNlc1tpXVsxXSA8IHltaW4pIHltaW4gPSB2ZXJ0aWNlc1tpXVsxXTtcbiAgICAgIGlmKHZlcnRpY2VzW2ldWzFdID4geW1heCkgeW1heCA9IHZlcnRpY2VzW2ldWzFdO1xuICAgIH1cblxuICAgIGR4ID0geG1heCAtIHhtaW47XG4gICAgZHkgPSB5bWF4IC0geW1pbjtcbiAgICBkbWF4ID0gTWF0aC5tYXgoZHgsIGR5KTtcbiAgICB4bWlkID0geG1pbiArIGR4ICogMC41O1xuICAgIHltaWQgPSB5bWluICsgZHkgKiAwLjU7XG5cbiAgICByZXR1cm4gW1xuICAgICAgW3htaWQgLSAyMCAqIGRtYXgsIHltaWQgLSAgICAgIGRtYXhdLFxuICAgICAgW3htaWQgICAgICAgICAgICAsIHltaWQgKyAyMCAqIGRtYXhdLFxuICAgICAgW3htaWQgKyAyMCAqIGRtYXgsIHltaWQgLSAgICAgIGRtYXhdXG4gICAgXTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNpcmN1bWNpcmNsZSh2ZXJ0aWNlcywgaSwgaiwgaykge1xuICAgIHZhciB4MSA9IHZlcnRpY2VzW2ldWzBdLFxuICAgICAgICB5MSA9IHZlcnRpY2VzW2ldWzFdLFxuICAgICAgICB4MiA9IHZlcnRpY2VzW2pdWzBdLFxuICAgICAgICB5MiA9IHZlcnRpY2VzW2pdWzFdLFxuICAgICAgICB4MyA9IHZlcnRpY2VzW2tdWzBdLFxuICAgICAgICB5MyA9IHZlcnRpY2VzW2tdWzFdLFxuICAgICAgICBmYWJzeTF5MiA9IE1hdGguYWJzKHkxIC0geTIpLFxuICAgICAgICBmYWJzeTJ5MyA9IE1hdGguYWJzKHkyIC0geTMpLFxuICAgICAgICB4YywgeWMsIG0xLCBtMiwgbXgxLCBteDIsIG15MSwgbXkyLCBkeCwgZHk7XG5cbiAgICAvKiBDaGVjayBmb3IgY29pbmNpZGVudCBwb2ludHMgKi9cbiAgICBpZihmYWJzeTF5MiA8IEVQU0lMT04gJiYgZmFic3kyeTMgPCBFUFNJTE9OKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRWVrISBDb2luY2lkZW50IHBvaW50cyFcIik7XG5cbiAgICBpZihmYWJzeTF5MiA8IEVQU0lMT04pIHtcbiAgICAgIG0yICA9IC0oKHgzIC0geDIpIC8gKHkzIC0geTIpKTtcbiAgICAgIG14MiA9ICh4MiArIHgzKSAvIDIuMDtcbiAgICAgIG15MiA9ICh5MiArIHkzKSAvIDIuMDtcbiAgICAgIHhjICA9ICh4MiArIHgxKSAvIDIuMDtcbiAgICAgIHljICA9IG0yICogKHhjIC0gbXgyKSArIG15MjtcbiAgICB9XG5cbiAgICBlbHNlIGlmKGZhYnN5MnkzIDwgRVBTSUxPTikge1xuICAgICAgbTEgID0gLSgoeDIgLSB4MSkgLyAoeTIgLSB5MSkpO1xuICAgICAgbXgxID0gKHgxICsgeDIpIC8gMi4wO1xuICAgICAgbXkxID0gKHkxICsgeTIpIC8gMi4wO1xuICAgICAgeGMgID0gKHgzICsgeDIpIC8gMi4wO1xuICAgICAgeWMgID0gbTEgKiAoeGMgLSBteDEpICsgbXkxO1xuICAgIH1cblxuICAgIGVsc2Uge1xuICAgICAgbTEgID0gLSgoeDIgLSB4MSkgLyAoeTIgLSB5MSkpO1xuICAgICAgbTIgID0gLSgoeDMgLSB4MikgLyAoeTMgLSB5MikpO1xuICAgICAgbXgxID0gKHgxICsgeDIpIC8gMi4wO1xuICAgICAgbXgyID0gKHgyICsgeDMpIC8gMi4wO1xuICAgICAgbXkxID0gKHkxICsgeTIpIC8gMi4wO1xuICAgICAgbXkyID0gKHkyICsgeTMpIC8gMi4wO1xuICAgICAgeGMgID0gKG0xICogbXgxIC0gbTIgKiBteDIgKyBteTIgLSBteTEpIC8gKG0xIC0gbTIpO1xuICAgICAgeWMgID0gKGZhYnN5MXkyID4gZmFic3kyeTMpID9cbiAgICAgICAgbTEgKiAoeGMgLSBteDEpICsgbXkxIDpcbiAgICAgICAgbTIgKiAoeGMgLSBteDIpICsgbXkyO1xuICAgIH1cblxuICAgIGR4ID0geDIgLSB4YztcbiAgICBkeSA9IHkyIC0geWM7XG4gICAgcmV0dXJuIHtpOiBpLCBqOiBqLCBrOiBrLCB4OiB4YywgeTogeWMsIHI6IGR4ICogZHggKyBkeSAqIGR5fTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGRlZHVwKGVkZ2VzKSB7XG4gICAgdmFyIGksIGosIGEsIGIsIG0sIG47XG5cbiAgICBmb3IoaiA9IGVkZ2VzLmxlbmd0aDsgajsgKSB7XG4gICAgICBiID0gZWRnZXNbLS1qXTtcbiAgICAgIGEgPSBlZGdlc1stLWpdO1xuXG4gICAgICBmb3IoaSA9IGo7IGk7ICkge1xuICAgICAgICBuID0gZWRnZXNbLS1pXTtcbiAgICAgICAgbSA9IGVkZ2VzWy0taV07XG5cbiAgICAgICAgaWYoKGEgPT09IG0gJiYgYiA9PT0gbikgfHwgKGEgPT09IG4gJiYgYiA9PT0gbSkpIHtcbiAgICAgICAgICBlZGdlcy5zcGxpY2UoaiwgMik7XG4gICAgICAgICAgZWRnZXMuc3BsaWNlKGksIDIpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgRGVsYXVuYXkgPSB7XG4gICAgdHJpYW5ndWxhdGU6IGZ1bmN0aW9uKHZlcnRpY2VzLCBrZXkpIHtcbiAgICAgIHZhciBuID0gdmVydGljZXMubGVuZ3RoLFxuICAgICAgICAgIGksIGosIGluZGljZXMsIHN0LCBvcGVuLCBjbG9zZWQsIGVkZ2VzLCBkeCwgZHksIGEsIGIsIGM7XG5cbiAgICAgIC8qIEJhaWwgaWYgdGhlcmUgYXJlbid0IGVub3VnaCB2ZXJ0aWNlcyB0byBmb3JtIGFueSB0cmlhbmdsZXMuICovXG4gICAgICBpZihuIDwgMylcbiAgICAgICAgcmV0dXJuIFtdO1xuXG4gICAgICAvKiBTbGljZSBvdXQgdGhlIGFjdHVhbCB2ZXJ0aWNlcyBmcm9tIHRoZSBwYXNzZWQgb2JqZWN0cy4gKER1cGxpY2F0ZSB0aGVcbiAgICAgICAqIGFycmF5IGV2ZW4gaWYgd2UgZG9uJ3QsIHRob3VnaCwgc2luY2Ugd2UgbmVlZCB0byBtYWtlIGEgc3VwZXJ0cmlhbmdsZVxuICAgICAgICogbGF0ZXIgb24hKSAqL1xuICAgICAgdmVydGljZXMgPSB2ZXJ0aWNlcy5zbGljZSgwKTtcblxuICAgICAgaWYoa2V5KVxuICAgICAgICBmb3IoaSA9IG47IGktLTsgKVxuICAgICAgICAgIHZlcnRpY2VzW2ldID0gdmVydGljZXNbaV1ba2V5XTtcblxuICAgICAgLyogTWFrZSBhbiBhcnJheSBvZiBpbmRpY2VzIGludG8gdGhlIHZlcnRleCBhcnJheSwgc29ydGVkIGJ5IHRoZVxuICAgICAgICogdmVydGljZXMnIHgtcG9zaXRpb24uICovXG4gICAgICBpbmRpY2VzID0gbmV3IEFycmF5KG4pO1xuXG4gICAgICBmb3IoaSA9IG47IGktLTsgKVxuICAgICAgICBpbmRpY2VzW2ldID0gaTtcblxuICAgICAgaW5kaWNlcy5zb3J0KGZ1bmN0aW9uKGksIGopIHtcbiAgICAgICAgcmV0dXJuIHZlcnRpY2VzW2pdWzBdIC0gdmVydGljZXNbaV1bMF07XG4gICAgICB9KTtcblxuICAgICAgLyogTmV4dCwgZmluZCB0aGUgdmVydGljZXMgb2YgdGhlIHN1cGVydHJpYW5nbGUgKHdoaWNoIGNvbnRhaW5zIGFsbCBvdGhlclxuICAgICAgICogdHJpYW5nbGVzKSwgYW5kIGFwcGVuZCB0aGVtIG9udG8gdGhlIGVuZCBvZiBhIChjb3B5IG9mKSB0aGUgdmVydGV4XG4gICAgICAgKiBhcnJheS4gKi9cbiAgICAgIHN0ID0gc3VwZXJ0cmlhbmdsZSh2ZXJ0aWNlcyk7XG4gICAgICB2ZXJ0aWNlcy5wdXNoKHN0WzBdLCBzdFsxXSwgc3RbMl0pO1xuXG4gICAgICAvKiBJbml0aWFsaXplIHRoZSBvcGVuIGxpc3QgKGNvbnRhaW5pbmcgdGhlIHN1cGVydHJpYW5nbGUgYW5kIG5vdGhpbmdcbiAgICAgICAqIGVsc2UpIGFuZCB0aGUgY2xvc2VkIGxpc3QgKHdoaWNoIGlzIGVtcHR5IHNpbmNlIHdlIGhhdm4ndCBwcm9jZXNzZWRcbiAgICAgICAqIGFueSB0cmlhbmdsZXMgeWV0KS4gKi9cbiAgICAgIG9wZW4gICA9IFtjaXJjdW1jaXJjbGUodmVydGljZXMsIG4gKyAwLCBuICsgMSwgbiArIDIpXTtcbiAgICAgIGNsb3NlZCA9IFtdO1xuICAgICAgZWRnZXMgID0gW107XG5cbiAgICAgIC8qIEluY3JlbWVudGFsbHkgYWRkIGVhY2ggdmVydGV4IHRvIHRoZSBtZXNoLiAqL1xuICAgICAgZm9yKGkgPSBpbmRpY2VzLmxlbmd0aDsgaS0tOyBlZGdlcy5sZW5ndGggPSAwKSB7XG4gICAgICAgIGMgPSBpbmRpY2VzW2ldO1xuXG4gICAgICAgIC8qIEZvciBlYWNoIG9wZW4gdHJpYW5nbGUsIGNoZWNrIHRvIHNlZSBpZiB0aGUgY3VycmVudCBwb2ludCBpc1xuICAgICAgICAgKiBpbnNpZGUgaXQncyBjaXJjdW1jaXJjbGUuIElmIGl0IGlzLCByZW1vdmUgdGhlIHRyaWFuZ2xlIGFuZCBhZGRcbiAgICAgICAgICogaXQncyBlZGdlcyB0byBhbiBlZGdlIGxpc3QuICovXG4gICAgICAgIGZvcihqID0gb3Blbi5sZW5ndGg7IGotLTsgKSB7XG4gICAgICAgICAgLyogSWYgdGhpcyBwb2ludCBpcyB0byB0aGUgcmlnaHQgb2YgdGhpcyB0cmlhbmdsZSdzIGNpcmN1bWNpcmNsZSxcbiAgICAgICAgICAgKiB0aGVuIHRoaXMgdHJpYW5nbGUgc2hvdWxkIG5ldmVyIGdldCBjaGVja2VkIGFnYWluLiBSZW1vdmUgaXRcbiAgICAgICAgICAgKiBmcm9tIHRoZSBvcGVuIGxpc3QsIGFkZCBpdCB0byB0aGUgY2xvc2VkIGxpc3QsIGFuZCBza2lwLiAqL1xuICAgICAgICAgIGR4ID0gdmVydGljZXNbY11bMF0gLSBvcGVuW2pdLng7XG4gICAgICAgICAgaWYoZHggPiAwLjAgJiYgZHggKiBkeCA+IG9wZW5bal0ucikge1xuICAgICAgICAgICAgY2xvc2VkLnB1c2gob3BlbltqXSk7XG4gICAgICAgICAgICBvcGVuLnNwbGljZShqLCAxKTtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIC8qIElmIHdlJ3JlIG91dHNpZGUgdGhlIGNpcmN1bWNpcmNsZSwgc2tpcCB0aGlzIHRyaWFuZ2xlLiAqL1xuICAgICAgICAgIGR5ID0gdmVydGljZXNbY11bMV0gLSBvcGVuW2pdLnk7XG4gICAgICAgICAgaWYoZHggKiBkeCArIGR5ICogZHkgLSBvcGVuW2pdLnIgPiBFUFNJTE9OKVxuICAgICAgICAgICAgY29udGludWU7XG5cbiAgICAgICAgICAvKiBSZW1vdmUgdGhlIHRyaWFuZ2xlIGFuZCBhZGQgaXQncyBlZGdlcyB0byB0aGUgZWRnZSBsaXN0LiAqL1xuICAgICAgICAgIGVkZ2VzLnB1c2goXG4gICAgICAgICAgICBvcGVuW2pdLmksIG9wZW5bal0uaixcbiAgICAgICAgICAgIG9wZW5bal0uaiwgb3BlbltqXS5rLFxuICAgICAgICAgICAgb3BlbltqXS5rLCBvcGVuW2pdLmlcbiAgICAgICAgICApO1xuICAgICAgICAgIG9wZW4uc3BsaWNlKGosIDEpO1xuICAgICAgICB9XG5cbiAgICAgICAgLyogUmVtb3ZlIGFueSBkb3VibGVkIGVkZ2VzLiAqL1xuICAgICAgICBkZWR1cChlZGdlcyk7XG5cbiAgICAgICAgLyogQWRkIGEgbmV3IHRyaWFuZ2xlIGZvciBlYWNoIGVkZ2UuICovXG4gICAgICAgIGZvcihqID0gZWRnZXMubGVuZ3RoOyBqOyApIHtcbiAgICAgICAgICBiID0gZWRnZXNbLS1qXTtcbiAgICAgICAgICBhID0gZWRnZXNbLS1qXTtcbiAgICAgICAgICBvcGVuLnB1c2goY2lyY3VtY2lyY2xlKHZlcnRpY2VzLCBhLCBiLCBjKSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLyogQ29weSBhbnkgcmVtYWluaW5nIG9wZW4gdHJpYW5nbGVzIHRvIHRoZSBjbG9zZWQgbGlzdCwgYW5kIHRoZW5cbiAgICAgICAqIHJlbW92ZSBhbnkgdHJpYW5nbGVzIHRoYXQgc2hhcmUgYSB2ZXJ0ZXggd2l0aCB0aGUgc3VwZXJ0cmlhbmdsZSxcbiAgICAgICAqIGJ1aWxkaW5nIGEgbGlzdCBvZiB0cmlwbGV0cyB0aGF0IHJlcHJlc2VudCB0cmlhbmdsZXMuICovXG4gICAgICBmb3IoaSA9IG9wZW4ubGVuZ3RoOyBpLS07IClcbiAgICAgICAgY2xvc2VkLnB1c2gob3BlbltpXSk7XG4gICAgICBvcGVuLmxlbmd0aCA9IDA7XG5cbiAgICAgIGZvcihpID0gY2xvc2VkLmxlbmd0aDsgaS0tOyApXG4gICAgICAgIGlmKGNsb3NlZFtpXS5pIDwgbiAmJiBjbG9zZWRbaV0uaiA8IG4gJiYgY2xvc2VkW2ldLmsgPCBuKVxuICAgICAgICAgIG9wZW4ucHVzaChjbG9zZWRbaV0uaSwgY2xvc2VkW2ldLmosIGNsb3NlZFtpXS5rKTtcblxuICAgICAgLyogWWF5LCB3ZSdyZSBkb25lISAqL1xuICAgICAgcmV0dXJuIG9wZW47XG4gICAgfSxcbiAgICBjb250YWluczogZnVuY3Rpb24odHJpLCBwKSB7XG4gICAgICAvKiBCb3VuZGluZyBib3ggdGVzdCBmaXJzdCwgZm9yIHF1aWNrIHJlamVjdGlvbnMuICovXG4gICAgICBpZigocFswXSA8IHRyaVswXVswXSAmJiBwWzBdIDwgdHJpWzFdWzBdICYmIHBbMF0gPCB0cmlbMl1bMF0pIHx8XG4gICAgICAgICAocFswXSA+IHRyaVswXVswXSAmJiBwWzBdID4gdHJpWzFdWzBdICYmIHBbMF0gPiB0cmlbMl1bMF0pIHx8XG4gICAgICAgICAocFsxXSA8IHRyaVswXVsxXSAmJiBwWzFdIDwgdHJpWzFdWzFdICYmIHBbMV0gPCB0cmlbMl1bMV0pIHx8XG4gICAgICAgICAocFsxXSA+IHRyaVswXVsxXSAmJiBwWzFdID4gdHJpWzFdWzFdICYmIHBbMV0gPiB0cmlbMl1bMV0pKVxuICAgICAgICByZXR1cm4gbnVsbDtcblxuICAgICAgdmFyIGEgPSB0cmlbMV1bMF0gLSB0cmlbMF1bMF0sXG4gICAgICAgICAgYiA9IHRyaVsyXVswXSAtIHRyaVswXVswXSxcbiAgICAgICAgICBjID0gdHJpWzFdWzFdIC0gdHJpWzBdWzFdLFxuICAgICAgICAgIGQgPSB0cmlbMl1bMV0gLSB0cmlbMF1bMV0sXG4gICAgICAgICAgaSA9IGEgKiBkIC0gYiAqIGM7XG5cbiAgICAgIC8qIERlZ2VuZXJhdGUgdHJpLiAqL1xuICAgICAgaWYoaSA9PT0gMC4wKVxuICAgICAgICByZXR1cm4gbnVsbDtcblxuICAgICAgdmFyIHUgPSAoZCAqIChwWzBdIC0gdHJpWzBdWzBdKSAtIGIgKiAocFsxXSAtIHRyaVswXVsxXSkpIC8gaSxcbiAgICAgICAgICB2ID0gKGEgKiAocFsxXSAtIHRyaVswXVsxXSkgLSBjICogKHBbMF0gLSB0cmlbMF1bMF0pKSAvIGk7XG5cbiAgICAgIC8qIElmIHdlJ3JlIG91dHNpZGUgdGhlIHRyaSwgZmFpbC4gKi9cbiAgICAgIGlmKHUgPCAwLjAgfHwgdiA8IDAuMCB8fCAodSArIHYpID4gMS4wKVxuICAgICAgICByZXR1cm4gbnVsbDtcblxuICAgICAgcmV0dXJuIFt1LCB2XTtcbiAgICB9XG4gIH07XG5cbiAgaWYodHlwZW9mIG1vZHVsZSAhPT0gXCJ1bmRlZmluZWRcIilcbiAgICBtb2R1bGUuZXhwb3J0cyA9IERlbGF1bmF5O1xufSkoKTtcbiIsInZhciBDb2xvcjtcblxuKGZ1bmN0aW9uKCkge1xuICAndXNlIHN0cmljdCc7XG4gIC8vIGNvbG9yIGhlbHBlciBmdW5jdGlvbnNcbiAgQ29sb3IgPSB7XG5cbiAgICBoZXhUb1JnYmE6IGZ1bmN0aW9uKGhleCkge1xuICAgICAgaGV4ID0gaGV4LnJlcGxhY2UoJyMnLCcnKTtcbiAgICAgIHZhciByID0gcGFyc2VJbnQoaGV4LnN1YnN0cmluZygwLDIpLCAxNik7XG4gICAgICB2YXIgZyA9IHBhcnNlSW50KGhleC5zdWJzdHJpbmcoMiw0KSwgMTYpO1xuICAgICAgdmFyIGIgPSBwYXJzZUludChoZXguc3Vic3RyaW5nKDQsNiksIDE2KTtcblxuICAgICAgcmV0dXJuICdyZ2JhKCcgKyByICsgJywnICsgZyArICcsJyArIGIgKyAnLDEpJztcbiAgICB9LFxuXG4gICAgaGV4VG9SZ2JhQXJyYXk6IGZ1bmN0aW9uKGhleCkge1xuICAgICAgaGV4ID0gaGV4LnJlcGxhY2UoJyMnLCcnKTtcbiAgICAgIHZhciByID0gcGFyc2VJbnQoaGV4LnN1YnN0cmluZygwLDIpLCAxNik7XG4gICAgICB2YXIgZyA9IHBhcnNlSW50KGhleC5zdWJzdHJpbmcoMiw0KSwgMTYpO1xuICAgICAgdmFyIGIgPSBwYXJzZUludChoZXguc3Vic3RyaW5nKDQsNiksIDE2KTtcblxuICAgICAgcmV0dXJuIFtyLCBnLCBiXTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ29udmVydHMgYW4gUkdCIGNvbG9yIHZhbHVlIHRvIEhTTC4gQ29udmVyc2lvbiBmb3JtdWxhXG4gICAgICogYWRhcHRlZCBmcm9tIGh0dHA6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvSFNMX2NvbG9yX3NwYWNlLlxuICAgICAqIEFzc3VtZXMgciwgZywgYW5kIGIgYXJlIGNvbnRhaW5lZCBpbiB0aGUgc2V0IFswLCAyNTVdIGFuZFxuICAgICAqIHJldHVybnMgaCwgcywgYW5kIGwgaW4gdGhlIHNldCBbMCwgMV0uXG4gICAgICpcbiAgICAgKiBAcGFyYW0gICBOdW1iZXIgIHIgICAgICAgVGhlIHJlZCBjb2xvciB2YWx1ZVxuICAgICAqIEBwYXJhbSAgIE51bWJlciAgZyAgICAgICBUaGUgZ3JlZW4gY29sb3IgdmFsdWVcbiAgICAgKiBAcGFyYW0gICBOdW1iZXIgIGIgICAgICAgVGhlIGJsdWUgY29sb3IgdmFsdWVcbiAgICAgKiBAcmV0dXJuICBBcnJheSAgICAgICAgICAgVGhlIEhTTCByZXByZXNlbnRhdGlvblxuICAgICAqL1xuICAgIHJnYlRvSHNsYTogZnVuY3Rpb24ocmdiKSB7XG4gICAgICB2YXIgciA9IHJnYlswXSAvIDI1NTtcbiAgICAgIHZhciBnID0gcmdiWzFdIC8gMjU1O1xuICAgICAgdmFyIGIgPSByZ2JbMl0gLyAyNTU7XG4gICAgICB2YXIgbWF4ID0gTWF0aC5tYXgociwgZywgYik7XG4gICAgICB2YXIgbWluID0gTWF0aC5taW4ociwgZywgYik7XG4gICAgICB2YXIgaDtcbiAgICAgIHZhciBzO1xuICAgICAgdmFyIGwgPSAobWF4ICsgbWluKSAvIDI7XG5cbiAgICAgIGlmIChtYXggPT09IG1pbikge1xuICAgICAgICBoID0gcyA9IDA7IC8vIGFjaHJvbWF0aWNcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBkID0gbWF4IC0gbWluO1xuICAgICAgICBzID0gbCA+IDAuNSA/IGQgLyAoMiAtIG1heCAtIG1pbikgOiBkIC8gKG1heCArIG1pbik7XG4gICAgICAgIHN3aXRjaCAobWF4KXtcbiAgICAgICAgICBjYXNlIHI6IGggPSAoZyAtIGIpIC8gZCArIChnIDwgYiA/IDYgOiAwKTsgYnJlYWs7XG4gICAgICAgICAgY2FzZSBnOiBoID0gKGIgLSByKSAvIGQgKyAyOyBicmVhaztcbiAgICAgICAgICBjYXNlIGI6IGggPSAociAtIGcpIC8gZCArIDQ7IGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGggLz0gNjtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuICdoc2xhKCcgKyBNYXRoLnJvdW5kKGggKiAzNjApICsgJywnICsgTWF0aC5yb3VuZChzICogMTAwKSArICclLCcgKyBNYXRoLnJvdW5kKGwgKiAxMDApICsgJyUsMSknO1xuICAgIH0sXG5cbiAgICBoc2xhQWRqdXN0QWxwaGE6IGZ1bmN0aW9uKGNvbG9yLCBhbHBoYSkge1xuICAgICAgY29sb3IgPSBjb2xvci5zcGxpdCgnLCcpO1xuXG4gICAgICBpZiAodHlwZW9mIGFscGhhICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIGNvbG9yWzNdID0gYWxwaGE7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb2xvclszXSA9IGFscGhhKHBhcnNlSW50KGNvbG9yWzNdKSk7XG4gICAgICB9XG5cbiAgICAgIGNvbG9yWzNdICs9ICcpJztcbiAgICAgIHJldHVybiBjb2xvci5qb2luKCcsJyk7XG4gICAgfSxcblxuICAgIGhzbGFBZGp1c3RMaWdodG5lc3M6IGZ1bmN0aW9uKGNvbG9yLCBsaWdodG5lc3MpIHtcbiAgICAgIGNvbG9yID0gY29sb3Iuc3BsaXQoJywnKTtcblxuICAgICAgaWYgKHR5cGVvZiBsaWdodG5lc3MgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgY29sb3JbMl0gPSBsaWdodG5lc3M7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb2xvclsyXSA9IGxpZ2h0bmVzcyhwYXJzZUludChjb2xvclsyXSkpO1xuICAgICAgfVxuXG4gICAgICBjb2xvclsyXSArPSAnJSc7XG4gICAgICByZXR1cm4gY29sb3Iuam9pbignLCcpO1xuICAgIH0sXG5cbiAgICByZ2JUb0hleDogZnVuY3Rpb24ocmdiKSB7XG4gICAgICBpZiAodHlwZW9mIHJnYiA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgcmdiID0gcmdiLnJlcGxhY2UoJ3JnYignLCAnJykucmVwbGFjZSgnKScsICcnKS5zcGxpdCgnLCcpO1xuICAgICAgfVxuICAgICAgcmdiID0gcmdiLm1hcChmdW5jdGlvbih4KSB7XG4gICAgICAgIHggPSBwYXJzZUludCh4KS50b1N0cmluZygxNik7XG4gICAgICAgIHJldHVybiAoeC5sZW5ndGggPT09IDEpID8gJzAnICsgeCA6IHg7XG4gICAgICB9KTtcbiAgICAgIHJldHVybiByZ2Iuam9pbignJyk7XG4gICAgfSxcbiAgfTtcblxuICBpZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IENvbG9yO1xuICB9XG5cbn0pKCk7XG4iLCJ2YXIgUG9pbnQ7XG5cbihmdW5jdGlvbigpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIHZhciBDb2xvciA9IENvbG9yIHx8IHJlcXVpcmUoJy4vY29sb3InKTtcblxuICAvKipcbiAgICogUmVwcmVzZW50cyBhIHBvaW50XG4gICAqIEBjbGFzc1xuICAgKi9cbiAgY2xhc3MgX1BvaW50IHtcbiAgICAvKipcbiAgICAgKiBQb2ludCBjb25zaXN0cyB4IGFuZCB5XG4gICAgICogQGNvbnN0cnVjdG9yXG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IHhcbiAgICAgKiBAcGFyYW0ge051bWJlcn0geVxuICAgICAqIG9yOlxuICAgICAqIEBwYXJhbSB7TnVtYmVyW119IHhcbiAgICAgKiB3aGVyZSB4IGlzIGxlbmd0aC0yIGFycmF5XG4gICAgICovXG4gICAgY29uc3RydWN0b3IoeCwgeSkge1xuICAgICAgaWYgKEFycmF5LmlzQXJyYXkoeCkpIHtcbiAgICAgICAgeSA9IHhbMV07XG4gICAgICAgIHggPSB4WzBdO1xuICAgICAgfVxuICAgICAgdGhpcy54ID0geDtcbiAgICAgIHRoaXMueSA9IHk7XG4gICAgICB0aGlzLnJhZGl1cyA9IDE7XG4gICAgICB0aGlzLmNvbG9yID0gJ2JsYWNrJztcbiAgICB9XG5cbiAgICAvLyBkcmF3IHRoZSBwb2ludFxuICAgIHJlbmRlcihjdHgsIGNvbG9yKSB7XG4gICAgICBjdHguYmVnaW5QYXRoKCk7XG4gICAgICBjdHguYXJjKHRoaXMueCwgdGhpcy55LCB0aGlzLnJhZGl1cywgMCwgMiAqIE1hdGguUEksIGZhbHNlKTtcbiAgICAgIGN0eC5maWxsU3R5bGUgPSBjb2xvciB8fCB0aGlzLmNvbG9yO1xuICAgICAgY3R4LmZpbGwoKTtcbiAgICAgIGN0eC5jbG9zZVBhdGgoKTtcbiAgICB9XG5cbiAgICAvLyBjb252ZXJ0cyB0byBzdHJpbmdcbiAgICAvLyByZXR1cm5zIHNvbWV0aGluZyBsaWtlOlxuICAgIC8vIFwiKFgsWSlcIlxuICAgIC8vIHVzZWQgaW4gdGhlIHBvaW50bWFwIHRvIGRldGVjdCB1bmlxdWUgcG9pbnRzXG4gICAgdG9TdHJpbmcoKSB7XG4gICAgICByZXR1cm4gJygnICsgdGhpcy54ICsgJywnICsgdGhpcy55ICsgJyknO1xuICAgIH1cblxuICAgIC8vIGdyYWIgdGhlIGNvbG9yIG9mIHRoZSBjYW52YXMgYXQgdGhlIHBvaW50XG4gICAgLy8gcmVxdWlyZXMgaW1hZ2VkYXRhIGZyb20gY2FudmFzIHNvIHdlIGRvbnQgZ3JhYlxuICAgIC8vIGVhY2ggcG9pbnQgaW5kaXZpZHVhbGx5LCB3aGljaCBpcyByZWFsbHkgZXhwZW5zaXZlXG4gICAgY2FudmFzQ29sb3JBdFBvaW50KGltYWdlRGF0YSwgY29sb3JTcGFjZSkge1xuICAgICAgY29sb3JTcGFjZSA9IGNvbG9yU3BhY2UgfHwgJ2hzbGEnO1xuICAgICAgLy8gb25seSBmaW5kIHRoZSBjYW52YXMgY29sb3IgaWYgd2UgZG9udCBhbHJlYWR5IGtub3cgaXRcbiAgICAgIGlmICghdGhpcy5fY2FudmFzQ29sb3IpIHtcbiAgICAgICAgLy8gaW1hZ2VEYXRhIGFycmF5IGlzIGZsYXQsIGdvZXMgYnkgcm93cyB0aGVuIGNvbHMsIGZvdXIgdmFsdWVzIHBlciBwaXhlbFxuICAgICAgICB2YXIgaWR4ID0gKE1hdGguZmxvb3IodGhpcy55KSAqIGltYWdlRGF0YS53aWR0aCAqIDQpICsgKE1hdGguZmxvb3IodGhpcy54KSAqIDQpO1xuXG4gICAgICAgIGlmIChjb2xvclNwYWNlID09PSAnaHNsYScpIHtcbiAgICAgICAgICB0aGlzLl9jYW52YXNDb2xvciA9IENvbG9yLnJnYlRvSHNsYShBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChpbWFnZURhdGEuZGF0YSwgaWR4LCBpZHggKyA0KSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy5fY2FudmFzQ29sb3IgPSAncmdiKCcgKyBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChpbWFnZURhdGEuZGF0YSwgaWR4LCBpZHggKyAzKS5qb2luKCkgKyAnKSc7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9jYW52YXNDb2xvcjtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzLl9jYW52YXNDb2xvcjtcbiAgICB9XG5cbiAgICBnZXRDb29yZHMoKSB7XG4gICAgICByZXR1cm4gW3RoaXMueCwgdGhpcy55XTtcbiAgICB9XG5cbiAgICAvLyBkaXN0YW5jZSB0byBhbm90aGVyIHBvaW50XG4gICAgZ2V0RGlzdGFuY2VUbyhwb2ludCkge1xuICAgICAgLy8g4oiaKHgy4oiSeDEpMisoeTLiiJJ5MSkyXG4gICAgICByZXR1cm4gTWF0aC5zcXJ0KE1hdGgucG93KHRoaXMueCAtIHBvaW50LngsIDIpICsgTWF0aC5wb3codGhpcy55IC0gcG9pbnQueSwgMikpO1xuICAgIH1cblxuICAgIC8vIHNjYWxlIHBvaW50cyBmcm9tIFtBLCBCXSB0byBbQywgRF1cbiAgICAvLyB4QSA9PiBvbGQgeCBtaW4sIHhCID0+IG9sZCB4IG1heFxuICAgIC8vIHlBID0+IG9sZCB5IG1pbiwgeUIgPT4gb2xkIHkgbWF4XG4gICAgLy8geEMgPT4gbmV3IHggbWluLCB4RCA9PiBuZXcgeCBtYXhcbiAgICAvLyB5QyA9PiBuZXcgeSBtaW4sIHlEID0+IG5ldyB5IG1heFxuICAgIHJlc2NhbGUoeEEsIHhCLCB5QSwgeUIsIHhDLCB4RCwgeUMsIHlEKSB7XG4gICAgICAvLyBOZXdWYWx1ZSA9ICgoKE9sZFZhbHVlIC0gT2xkTWluKSAqIE5ld1JhbmdlKSAvIE9sZFJhbmdlKSArIE5ld01pblxuXG4gICAgICB2YXIgeE9sZFJhbmdlID0geEIgLSB4QTtcbiAgICAgIHZhciB5T2xkUmFuZ2UgPSB5QiAtIHlBO1xuXG4gICAgICB2YXIgeE5ld1JhbmdlID0geEQgLSB4QztcbiAgICAgIHZhciB5TmV3UmFuZ2UgPSB5RCAtIHlDO1xuXG4gICAgICB0aGlzLnggPSAoKCh0aGlzLnggLSB4QSkgKiB4TmV3UmFuZ2UpIC8geE9sZFJhbmdlKSArIHhDO1xuICAgICAgdGhpcy55ID0gKCgodGhpcy55IC0geUEpICogeU5ld1JhbmdlKSAvIHlPbGRSYW5nZSkgKyB5QztcbiAgICB9XG5cbiAgICByZXNldENvbG9yKCkge1xuICAgICAgdGhpcy5fY2FudmFzQ29sb3IgPSB1bmRlZmluZWQ7XG4gICAgfVxuICB9XG5cbiAgaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBfUG9pbnQ7XG4gIH1cblxuICBQb2ludCA9IF9Qb2ludDtcbn0pKCk7XG4iLCJ2YXIgUG9pbnRNYXA7XG5cbihmdW5jdGlvbigpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIHZhciBQb2ludCA9IFBvaW50IHx8IHJlcXVpcmUoJy4vcG9pbnQnKTtcblxuICAvKipcbiAgICogUmVwcmVzZW50cyBhIHBvaW50XG4gICAqIEBjbGFzc1xuICAgKi9cbiAgY2xhc3MgX1BvaW50TWFwIHtcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgIHRoaXMuX21hcCA9IHt9O1xuICAgIH1cblxuICAgIC8vIGFkZHMgcG9pbnQgdG8gbWFwXG4gICAgYWRkKHBvaW50KSB7XG4gICAgICB0aGlzLl9tYXBbcG9pbnQudG9TdHJpbmcoKV0gPSB0cnVlO1xuICAgIH1cblxuICAgIC8vIGFkZHMgeCwgeSBjb29yZCB0byBtYXBcbiAgICBhZGRDb29yZCh4LCB5KSB7XG4gICAgICB0aGlzLmFkZChuZXcgUG9pbnQoeCwgeSkpO1xuICAgIH1cblxuICAgIC8vIHJlbW92ZXMgcG9pbnQgZnJvbSBtYXBcbiAgICByZW1vdmUocG9pbnQpIHtcbiAgICAgIHRoaXMuX21hcFtwb2ludC50b1N0cmluZygpXSA9IGZhbHNlO1xuICAgIH1cblxuICAgIC8vIHJlbW92ZXMgeCwgeSBjb29yZCBmcm9tIG1hcFxuICAgIHJlbW92ZUNvb3JkKHgsIHkpIHtcbiAgICAgIHRoaXMucmVtb3ZlKG5ldyBQb2ludCh4LCB5KSk7XG4gICAgfVxuXG4gICAgLy8gY2xlYXJzIHRoZSBtYXBcbiAgICBjbGVhcigpIHtcbiAgICAgIHRoaXMuX21hcCA9IHt9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIGRldGVybWluZXMgaWYgcG9pbnQgaGFzIGJlZW5cbiAgICAgKiBhZGRlZCB0byBtYXAgYWxyZWFkeVxuICAgICAqICBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICAgKi9cbiAgICBleGlzdHMocG9pbnQpIHtcbiAgICAgIHJldHVybiB0aGlzLl9tYXBbcG9pbnQudG9TdHJpbmcoKV0gPyB0cnVlIDogZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBfUG9pbnRNYXA7XG4gIH1cblxuICBQb2ludE1hcCA9IF9Qb2ludE1hcDtcbn0pKCk7XG4iLCIvKipcbiAqIFRPRE86XG4gKiAgLSBpbXByb3ZlIHJlbmRlcmluZyBzcGVlZFxuICogIC0gc21vb3RoIG91dCBhcHBlYXJhbmNlIG9mIGZhZGluZyBpbiBncmFkaWVudHMgZHVyaW5nIGFuaW1hdGlvblxuICogIC0gZG9jdW1lbnQgdXNhZ2VcbiAqL1xuXG4oZnVuY3Rpb24oKSB7XG4gICd1c2Ugc3RyaWN0JztcblxuICB2YXIgRGVsYXVuYXkgPSByZXF1aXJlKCcuL19kZWxhdW5heScpO1xuICB2YXIgQ29sb3IgICAgPSByZXF1aXJlKCcuL2NvbG9yJyk7XG4gIHZhciBSYW5kb20gICA9IHJlcXVpcmUoJy4vcmFuZG9tJyk7XG4gIHZhciBUcmlhbmdsZSA9IHJlcXVpcmUoJy4vdHJpYW5nbGUnKTtcbiAgdmFyIFBvaW50ICAgID0gcmVxdWlyZSgnLi9wb2ludCcpO1xuICB2YXIgUG9pbnRNYXAgPSByZXF1aXJlKCcuL3BvaW50TWFwJyk7XG5cbiAgLyoqXG4gICAqIFJlcHJlc2VudHMgYSBkZWxhdW5leSB0cmlhbmd1bGF0aW9uIG9mIHJhbmRvbSBwb2ludHNcbiAgICogaHR0cHM6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvRGVsYXVuYXlfdHJpYW5ndWxhdGlvblxuICAgKi9cbiAgY2xhc3MgUHJldHR5RGVsYXVuYXkge1xuICAgIC8qKlxuICAgICAqIEBjb25zdHJ1Y3RvclxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKGNhbnZhcywgb3B0aW9ucykge1xuICAgICAgLy8gbWVyZ2UgZ2l2ZW4gb3B0aW9ucyB3aXRoIGRlZmF1bHRzXG4gICAgICB0aGlzLm9wdGlvbnMgPSBPYmplY3QuYXNzaWduKHt9LCBQcmV0dHlEZWxhdW5heS5kZWZhdWx0cygpLCAob3B0aW9ucyB8fCB7fSkpO1xuXG4gICAgICB0aGlzLmNhbnZhcyA9IGNhbnZhcztcbiAgICAgIHRoaXMuY3R4ID0gY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG5cbiAgICAgIHRoaXMucmVzaXplQ2FudmFzKCk7XG4gICAgICB0aGlzLnBvaW50cyA9IFtdO1xuICAgICAgdGhpcy5jb2xvcnMgPSB0aGlzLm9wdGlvbnMuY29sb3JzO1xuICAgICAgdGhpcy5wb2ludE1hcCA9IG5ldyBQb2ludE1hcCgpO1xuXG4gICAgICB0aGlzLm1vdXNlUG9zaXRpb24gPSBmYWxzZTtcblxuICAgICAgaWYgKHRoaXMub3B0aW9ucy5ob3Zlcikge1xuICAgICAgICB0aGlzLmNyZWF0ZUhvdmVyU2hhZG93Q2FudmFzKCk7XG5cbiAgICAgICAgdGhpcy5jYW52YXMuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgKGUpID0+IHtcbiAgICAgICAgICBpZiAoIXRoaXMub3B0aW9ucy5hbmltYXRlKSB7XG4gICAgICAgICAgICB2YXIgcmVjdCA9IGNhbnZhcy5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICAgICAgICAgIHRoaXMubW91c2VQb3NpdGlvbiA9IG5ldyBQb2ludChlLmNsaWVudFggLSByZWN0LmxlZnQsIGUuY2xpZW50WSAtIHJlY3QudG9wKTtcbiAgICAgICAgICAgIHRoaXMuaG92ZXIoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0sIGZhbHNlKTtcblxuICAgICAgICB0aGlzLmNhbnZhcy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZW91dCcsICgpID0+IHtcbiAgICAgICAgICBpZiAoIXRoaXMub3B0aW9ucy5hbmltYXRlKSB7XG4gICAgICAgICAgICB0aGlzLm1vdXNlUG9zaXRpb24gPSBmYWxzZTtcbiAgICAgICAgICAgIHRoaXMuaG92ZXIoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0sIGZhbHNlKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBzdGF0aWMgZGVmYXVsdHMoKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBzaG93VHJpYW5nbGVzOiB0cnVlLFxuICAgICAgICBzaG93UG9pbnRzOiBmYWxzZSxcbiAgICAgICAgc2hvd0NpcmNsZXM6IGZhbHNlLFxuICAgICAgICBzaG93Q2VudHJvaWRzOiBmYWxzZSxcbiAgICAgICAgc2hvd0VkZ2VzOiB0cnVlLFxuICAgICAgICBob3ZlcjogdHJ1ZSxcbiAgICAgICAgbXVsdGlwbGllcjogMC41LFxuICAgICAgICBhbmltYXRlOiBmYWxzZSxcbiAgICAgICAgbG9vcEZyYW1lczogMjUwLFxuXG4gICAgICAgIC8vIGRlZmF1bHQgY29sb3JzXG4gICAgICAgIGNvbG9yczogWydoc2xhKDAsIDAlLCAxMDAlLCAxKScsICdoc2xhKDAsIDAlLCA1MCUsIDEpJywgJ2hzbGEoMCwgMCUsIDAlLCAxKSddLFxuXG4gICAgICAgIC8vIHJhbmRvbWx5IGNob29zZSBmcm9tIGNvbG9yIHBhbGV0dGUgb24gcmFuZG9taXplIGlmIG5vdCBzdXBwbGllZCBjb2xvcnNcbiAgICAgICAgY29sb3JQYWxldHRlOiBmYWxzZSxcblxuICAgICAgICByZXNpemVNb2RlOiAnc2NhbGVQb2ludHMnLFxuICAgICAgICAvLyAnbmV3UG9pbnRzJyAtIGdlbmVyYXRlcyBhIG5ldyBzZXQgb2YgcG9pbnRzIGZvciB0aGUgbmV3IHNpemVcbiAgICAgICAgLy8gJ3NjYWxlUG9pbnRzJyAtIGxpbmVhcmx5IHNjYWxlcyBleGlzdGluZyBwb2ludHMgYW5kIHJlLXRyaWFuZ3VsYXRlc1xuXG4gICAgICAgIC8vIGV2ZW50cyB0cmlnZ2VyZWQgd2hlbiB0aGUgY2VudGVyIG9mIHRoZSBiYWNrZ3JvdW5kXG4gICAgICAgIC8vIGlzIGdyZWF0ZXIgb3IgbGVzcyB0aGFuIDUwIGxpZ2h0bmVzcyBpbiBoc2xhXG4gICAgICAgIC8vIGludGVuZGVkIHRvIGFkanVzdCBzb21lIHRleHQgdGhhdCBpcyBvbiB0b3BcbiAgICAgICAgb25EYXJrQmFja2dyb3VuZDogZnVuY3Rpb24oKSB7IHJldHVybjsgfSxcbiAgICAgICAgb25MaWdodEJhY2tncm91bmQ6IGZ1bmN0aW9uKCkgeyByZXR1cm47IH0sXG5cbiAgICAgICAgLy8gdHJpZ2dlcmVkIHdoZW4gaG92ZXJlZCBvdmVyIHRyaWFuZ2xlXG4gICAgICAgIG9uVHJpYW5nbGVIb3ZlcjogZnVuY3Rpb24odHJpYW5nbGUsIGN0eCwgb3B0aW9ucykge1xuICAgICAgICAgIHZhciBmaWxsID0gb3B0aW9ucy5ob3ZlckNvbG9yKHRyaWFuZ2xlLmNvbG9yKTtcbiAgICAgICAgICB2YXIgc3Ryb2tlID0gZmlsbDtcbiAgICAgICAgICB0cmlhbmdsZS5yZW5kZXIoY3R4LCBvcHRpb25zLnNob3dFZGdlcyA/IGZpbGwgOiBmYWxzZSwgb3B0aW9ucy5zaG93RWRnZXMgPyBmYWxzZSA6IHN0cm9rZSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLy8gcmV0dXJucyBoc2xhIGNvbG9yIGZvciB0cmlhbmdsZSBlZGdlXG4gICAgICAgIC8vIGFzIGEgZnVuY3Rpb24gb2YgdGhlIHRyaWFuZ2xlIGZpbGwgY29sb3JcbiAgICAgICAgZWRnZUNvbG9yOiBmdW5jdGlvbihjb2xvcikge1xuICAgICAgICAgIGNvbG9yID0gQ29sb3IuaHNsYUFkanVzdExpZ2h0bmVzcyhjb2xvciwgZnVuY3Rpb24obGlnaHRuZXNzKSB7XG4gICAgICAgICAgICByZXR1cm4gKGxpZ2h0bmVzcyArIDIwMCAtIGxpZ2h0bmVzcyAqIDIpIC8gMztcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBjb2xvciA9IENvbG9yLmhzbGFBZGp1c3RBbHBoYShjb2xvciwgMC4yNSk7XG4gICAgICAgICAgcmV0dXJuIGNvbG9yO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8vIHJldHVybnMgaHNsYSBjb2xvciBmb3IgdHJpYW5nbGUgZWRnZVxuICAgICAgICAvLyBhcyBhIGZ1bmN0aW9uIG9mIHRoZSB0cmlhbmdsZSBmaWxsIGNvbG9yXG4gICAgICAgIHBvaW50Q29sb3I6IGZ1bmN0aW9uKGNvbG9yKSB7XG4gICAgICAgICAgY29sb3IgPSBDb2xvci5oc2xhQWRqdXN0TGlnaHRuZXNzKGNvbG9yLCBmdW5jdGlvbihsaWdodG5lc3MpIHtcbiAgICAgICAgICAgIHJldHVybiAobGlnaHRuZXNzICsgMjAwIC0gbGlnaHRuZXNzICogMikgLyAzO1xuICAgICAgICAgIH0pO1xuICAgICAgICAgIGNvbG9yID0gQ29sb3IuaHNsYUFkanVzdEFscGhhKGNvbG9yLCAxKTtcbiAgICAgICAgICByZXR1cm4gY29sb3I7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLy8gcmV0dXJucyBoc2xhIGNvbG9yIGZvciB0cmlhbmdsZSBlZGdlXG4gICAgICAgIC8vIGFzIGEgZnVuY3Rpb24gb2YgdGhlIHRyaWFuZ2xlIGZpbGwgY29sb3JcbiAgICAgICAgY2VudHJvaWRDb2xvcjogZnVuY3Rpb24oY29sb3IpIHtcbiAgICAgICAgICBjb2xvciA9IENvbG9yLmhzbGFBZGp1c3RMaWdodG5lc3MoY29sb3IsIGZ1bmN0aW9uKGxpZ2h0bmVzcykge1xuICAgICAgICAgICAgcmV0dXJuIChsaWdodG5lc3MgKyAyMDAgLSBsaWdodG5lc3MgKiAyKSAvIDM7XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgY29sb3IgPSBDb2xvci5oc2xhQWRqdXN0QWxwaGEoY29sb3IsIDAuMjUpO1xuICAgICAgICAgIHJldHVybiBjb2xvcjtcbiAgICAgICAgfSxcblxuICAgICAgICAvLyByZXR1cm5zIGhzbGEgY29sb3IgZm9yIHRyaWFuZ2xlIGhvdmVyIGZpbGxcbiAgICAgICAgLy8gYXMgYSBmdW5jdGlvbiBvZiB0aGUgdHJpYW5nbGUgZmlsbCBjb2xvclxuICAgICAgICBob3ZlckNvbG9yOiBmdW5jdGlvbihjb2xvcikge1xuICAgICAgICAgIGNvbG9yID0gQ29sb3IuaHNsYUFkanVzdExpZ2h0bmVzcyhjb2xvciwgZnVuY3Rpb24obGlnaHRuZXNzKSB7XG4gICAgICAgICAgICByZXR1cm4gMTAwIC0gbGlnaHRuZXNzO1xuICAgICAgICAgIH0pO1xuICAgICAgICAgIGNvbG9yID0gQ29sb3IuaHNsYUFkanVzdEFscGhhKGNvbG9yLCAwLjUpO1xuICAgICAgICAgIHJldHVybiBjb2xvcjtcbiAgICAgICAgfSxcbiAgICAgIH07XG4gICAgfVxuXG4gICAgY2xlYXIoKSB7XG4gICAgICB0aGlzLnBvaW50cyA9IFtdO1xuICAgICAgdGhpcy50cmlhbmdsZXMgPSBbXTtcbiAgICAgIHRoaXMucG9pbnRNYXAuY2xlYXIoKTtcbiAgICAgIHRoaXMuY2VudGVyID0gbmV3IFBvaW50KDAsIDApO1xuICAgIH1cblxuICAgIC8vIGNsZWFyIGFuZCBjcmVhdGUgYSBmcmVzaCBzZXQgb2YgcmFuZG9tIHBvaW50c1xuICAgIC8vIGFsbCBhcmdzIGFyZSBvcHRpb25hbFxuICAgIHJhbmRvbWl6ZShtaW4sIG1heCwgbWluRWRnZSwgbWF4RWRnZSwgbWluR3JhZGllbnRzLCBtYXhHcmFkaWVudHMsIGNvbG9ycykge1xuICAgICAgLy8gY29sb3JzIHBhcmFtIGlzIG9wdGlvbmFsXG4gICAgICB0aGlzLmNvbG9ycyA9IGNvbG9ycyA/XG4gICAgICAgICAgICAgICAgICAgICAgY29sb3JzIDpcbiAgICAgICAgICAgICAgICAgICAgICB0aGlzLm9wdGlvbnMuY29sb3JQYWxldHRlID9cbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMub3B0aW9ucy5jb2xvclBhbGV0dGVbUmFuZG9tLnJhbmRvbUJldHdlZW4oMCwgdGhpcy5vcHRpb25zLmNvbG9yUGFsZXR0ZS5sZW5ndGggLSAxKV0gOlxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jb2xvcnM7XG5cbiAgICAgIHRoaXMubWluR3JhZGllbnRzID0gbWluR3JhZGllbnRzO1xuICAgICAgdGhpcy5tYXhHcmFkaWVudHMgPSBtYXhHcmFkaWVudHM7XG5cbiAgICAgIHRoaXMucmVzaXplQ2FudmFzKCk7XG5cbiAgICAgIHRoaXMuZ2VuZXJhdGVOZXdQb2ludHMobWluLCBtYXgsIG1pbkVkZ2UsIG1heEVkZ2UpO1xuXG4gICAgICB0aGlzLnRyaWFuZ3VsYXRlKCk7XG5cbiAgICAgIHRoaXMuZ2VuZXJhdGVHcmFkaWVudHMobWluR3JhZGllbnRzLCBtYXhHcmFkaWVudHMpO1xuXG4gICAgICAvLyBwcmVwIGZvciBhbmltYXRpb25cbiAgICAgIHRoaXMubmV4dEdyYWRpZW50cyA9IHRoaXMucmFkaWFsR3JhZGllbnRzLnNsaWNlKDApO1xuICAgICAgdGhpcy5nZW5lcmF0ZUdyYWRpZW50cygpO1xuICAgICAgdGhpcy5jdXJyZW50R3JhZGllbnRzID0gdGhpcy5yYWRpYWxHcmFkaWVudHMuc2xpY2UoMCk7XG5cbiAgICAgIHRoaXMucmVuZGVyKCk7XG5cbiAgICAgIGlmICh0aGlzLm9wdGlvbnMuYW5pbWF0ZSAmJiAhdGhpcy5sb29waW5nKSB7XG4gICAgICAgIHRoaXMuaW5pdFJlbmRlckxvb3AoKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpbml0UmVuZGVyTG9vcCgpIHtcbiAgICAgIHRoaXMubG9vcGluZyA9IHRydWU7XG4gICAgICB0aGlzLmZyYW1lU3RlcHMgPSB0aGlzLm9wdGlvbnMubG9vcEZyYW1lcztcbiAgICAgIHRoaXMuZnJhbWUgPSB0aGlzLmZyYW1lID8gdGhpcy5mcmFtZSA6IHRoaXMuZnJhbWVTdGVwcztcbiAgICAgIHRoaXMucmVuZGVyTG9vcCgpO1xuICAgIH1cblxuICAgIHJlbmRlckxvb3AoKSB7XG4gICAgICB0aGlzLmZyYW1lKys7XG5cbiAgICAgIC8vIGN1cnJlbnQgPT4gbmV4dCwgbmV4dCA9PiBuZXdcbiAgICAgIGlmICh0aGlzLmZyYW1lID4gdGhpcy5mcmFtZVN0ZXBzKSB7XG4gICAgICAgIHZhciBuZXh0R3JhZGllbnRzID0gdGhpcy5uZXh0R3JhZGllbnRzID8gdGhpcy5uZXh0R3JhZGllbnRzIDogdGhpcy5yYWRpYWxHcmFkaWVudHM7XG4gICAgICAgIHRoaXMuZ2VuZXJhdGVHcmFkaWVudHMoKTtcbiAgICAgICAgdGhpcy5uZXh0R3JhZGllbnRzID0gdGhpcy5yYWRpYWxHcmFkaWVudHM7XG4gICAgICAgIHRoaXMucmFkaWFsR3JhZGllbnRzID0gbmV4dEdyYWRpZW50cy5zbGljZSgwKTtcbiAgICAgICAgdGhpcy5jdXJyZW50R3JhZGllbnRzID0gbmV4dEdyYWRpZW50cy5zbGljZSgwKTtcblxuICAgICAgICB0aGlzLmZyYW1lID0gMDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIGZhbmN5IHN0ZXBzXG4gICAgICAgIC8vIHt4MCwgeTAsIHIwLCB4MSwgeTEsIHIxLCBjb2xvclN0b3B9XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgTWF0aC5tYXgodGhpcy5yYWRpYWxHcmFkaWVudHMubGVuZ3RoLCB0aGlzLm5leHRHcmFkaWVudHMubGVuZ3RoKTsgaSsrKSB7XG4gICAgICAgICAgdmFyIGN1cnJlbnRHcmFkaWVudCA9IHRoaXMuY3VycmVudEdyYWRpZW50c1tpXTtcbiAgICAgICAgICB2YXIgbmV4dEdyYWRpZW50ID0gdGhpcy5uZXh0R3JhZGllbnRzW2ldO1xuXG4gICAgICAgICAgaWYgKHR5cGVvZiBjdXJyZW50R3JhZGllbnQgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICB2YXIgbmV3R3JhZGllbnQgPSB7XG4gICAgICAgICAgICAgIHgwOiBuZXh0R3JhZGllbnQueDAsXG4gICAgICAgICAgICAgIHkwOiBuZXh0R3JhZGllbnQueTAsXG4gICAgICAgICAgICAgIHIwOiAwLFxuICAgICAgICAgICAgICB4MTogbmV4dEdyYWRpZW50LngxLFxuICAgICAgICAgICAgICB5MTogbmV4dEdyYWRpZW50LnkxLFxuICAgICAgICAgICAgICByMTogMCxcbiAgICAgICAgICAgICAgY29sb3JTdG9wOiBuZXh0R3JhZGllbnQuY29sb3JTdG9wLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGN1cnJlbnRHcmFkaWVudCA9IG5ld0dyYWRpZW50O1xuICAgICAgICAgICAgdGhpcy5jdXJyZW50R3JhZGllbnRzLnB1c2gobmV3R3JhZGllbnQpO1xuICAgICAgICAgICAgdGhpcy5yYWRpYWxHcmFkaWVudHMucHVzaChuZXdHcmFkaWVudCk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKHR5cGVvZiBuZXh0R3JhZGllbnQgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICBuZXh0R3JhZGllbnQgPSB7XG4gICAgICAgICAgICAgIHgwOiBjdXJyZW50R3JhZGllbnQueDAsXG4gICAgICAgICAgICAgIHkwOiBjdXJyZW50R3JhZGllbnQueTAsXG4gICAgICAgICAgICAgIHIwOiAwLFxuICAgICAgICAgICAgICB4MTogY3VycmVudEdyYWRpZW50LngxLFxuICAgICAgICAgICAgICB5MTogY3VycmVudEdyYWRpZW50LnkxLFxuICAgICAgICAgICAgICByMTogMCxcbiAgICAgICAgICAgICAgY29sb3JTdG9wOiBjdXJyZW50R3JhZGllbnQuY29sb3JTdG9wLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICB2YXIgdXBkYXRlZEdyYWRpZW50ID0ge307XG5cbiAgICAgICAgICAvLyBzY2FsZSB0aGUgZGlmZmVyZW5jZSBiZXR3ZWVuIGN1cnJlbnQgYW5kIG5leHQgZ3JhZGllbnQgYmFzZWQgb24gc3RlcCBpbiBmcmFtZXNcbiAgICAgICAgICB2YXIgc2NhbGUgPSB0aGlzLmZyYW1lIC8gdGhpcy5mcmFtZVN0ZXBzO1xuXG4gICAgICAgICAgdXBkYXRlZEdyYWRpZW50LngwID0gTWF0aC5yb3VuZChsaW5lYXJTY2FsZShjdXJyZW50R3JhZGllbnQueDAsIG5leHRHcmFkaWVudC54MCwgc2NhbGUpKTtcbiAgICAgICAgICB1cGRhdGVkR3JhZGllbnQueTAgPSBNYXRoLnJvdW5kKGxpbmVhclNjYWxlKGN1cnJlbnRHcmFkaWVudC55MCwgbmV4dEdyYWRpZW50LnkwLCBzY2FsZSkpO1xuICAgICAgICAgIHVwZGF0ZWRHcmFkaWVudC5yMCA9IE1hdGgucm91bmQobGluZWFyU2NhbGUoY3VycmVudEdyYWRpZW50LnIwLCBuZXh0R3JhZGllbnQucjAsIHNjYWxlKSk7XG4gICAgICAgICAgdXBkYXRlZEdyYWRpZW50LngxID0gTWF0aC5yb3VuZChsaW5lYXJTY2FsZShjdXJyZW50R3JhZGllbnQueDEsIG5leHRHcmFkaWVudC54MCwgc2NhbGUpKTtcbiAgICAgICAgICB1cGRhdGVkR3JhZGllbnQueTEgPSBNYXRoLnJvdW5kKGxpbmVhclNjYWxlKGN1cnJlbnRHcmFkaWVudC55MSwgbmV4dEdyYWRpZW50LnkwLCBzY2FsZSkpO1xuICAgICAgICAgIHVwZGF0ZWRHcmFkaWVudC5yMSA9IE1hdGgucm91bmQobGluZWFyU2NhbGUoY3VycmVudEdyYWRpZW50LnIxLCBuZXh0R3JhZGllbnQucjEsIHNjYWxlKSk7XG4gICAgICAgICAgdXBkYXRlZEdyYWRpZW50LmNvbG9yU3RvcCA9IGxpbmVhclNjYWxlKGN1cnJlbnRHcmFkaWVudC5jb2xvclN0b3AsIG5leHRHcmFkaWVudC5jb2xvclN0b3AsIHNjYWxlKTtcblxuICAgICAgICAgIHRoaXMucmFkaWFsR3JhZGllbnRzW2ldID0gdXBkYXRlZEdyYWRpZW50O1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHRoaXMucmVzZXRQb2ludENvbG9ycygpO1xuICAgICAgdGhpcy5yZW5kZXIoKTtcblxuICAgICAgaWYgKHRoaXMub3B0aW9ucy5hbmltYXRlKSB7XG4gICAgICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiB7XG4gICAgICAgICAgdGhpcy5yZW5kZXJMb29wKCk7XG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5sb29waW5nID0gZmFsc2U7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gY3JlYXRlcyBhIGhpZGRlbiBjYW52YXMgZm9yIGhvdmVyIGRldGVjdGlvblxuICAgIGNyZWF0ZUhvdmVyU2hhZG93Q2FudmFzKCkge1xuICAgICAgdGhpcy5ob3ZlclNoYWRvd0NhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpO1xuICAgICAgdGhpcy5zaGFkb3dDdHggPSB0aGlzLmhvdmVyU2hhZG93Q2FudmFzLmdldENvbnRleHQoJzJkJyk7XG5cbiAgICAgIHRoaXMuaG92ZXJTaGFkb3dDYW52YXMuc3R5bGUuZGlzcGxheSA9ICdub25lJztcbiAgICB9XG5cbiAgICBnZW5lcmF0ZU5ld1BvaW50cyhtaW4sIG1heCwgbWluRWRnZSwgbWF4RWRnZSwgbXVsdGlwbGllcikge1xuICAgICAgLy8gZGVmYXVsdHMgdG8gZ2VuZXJpYyBudW1iZXIgb2YgcG9pbnRzIGJhc2VkIG9uIGNhbnZhcyBkaW1lbnNpb25zXG4gICAgICAvLyB0aGlzIGdlbmVyYWxseSBsb29rcyBwcmV0dHkgbmljZVxuICAgICAgdmFyIGFyZWEgPSB0aGlzLmNhbnZhcy53aWR0aCAqIHRoaXMuY2FudmFzLmhlaWdodDtcbiAgICAgIHZhciBwZXJpbWV0ZXIgPSAodGhpcy5jYW52YXMud2lkdGggKyB0aGlzLmNhbnZhcy5oZWlnaHQpICogMjtcblxuICAgICAgbXVsdGlwbGllciA9IG11bHRpcGxpZXIgfHwgdGhpcy5vcHRpb25zLm11bHRpcGxpZXI7XG5cbiAgICAgIG1pbiA9IG1pbiA+IDAgPyBNYXRoLmNlaWwobWluKSA6IE1hdGgubWF4KE1hdGguY2VpbCgoYXJlYSAvIDEyNTApICogbXVsdGlwbGllciksIDUwKTtcbiAgICAgIG1heCA9IG1heCA+IDAgPyBNYXRoLmNlaWwobWF4KSA6IE1hdGgubWF4KE1hdGguY2VpbCgoYXJlYSAvIDUwMCkgKiBtdWx0aXBsaWVyKSwgNTApO1xuXG4gICAgICBtaW5FZGdlID0gbWluRWRnZSA+IDAgPyBNYXRoLmNlaWwobWluRWRnZSkgOiBNYXRoLm1heChNYXRoLmNlaWwoKHBlcmltZXRlciAvIDEyNSkgKiBtdWx0aXBsaWVyKSwgNSk7XG4gICAgICBtYXhFZGdlID0gbWF4RWRnZSA+IDAgPyBNYXRoLmNlaWwobWF4RWRnZSkgOiBNYXRoLm1heChNYXRoLmNlaWwoKHBlcmltZXRlciAvIDUwKSAqIG11bHRpcGxpZXIpLCA1KTtcblxuICAgICAgdGhpcy5udW1Qb2ludHMgPSBSYW5kb20ucmFuZG9tQmV0d2VlbihtaW4sIG1heCk7XG4gICAgICB0aGlzLmdldE51bUVkZ2VQb2ludHMgPSBSYW5kb20ucmFuZG9tTnVtYmVyRnVuY3Rpb24obWluRWRnZSwgbWF4RWRnZSk7XG5cbiAgICAgIHRoaXMuY2xlYXIoKTtcblxuICAgICAgLy8gYWRkIGNvcm5lciBhbmQgZWRnZSBwb2ludHNcbiAgICAgIHRoaXMuZ2VuZXJhdGVDb3JuZXJQb2ludHMoKTtcbiAgICAgIHRoaXMuZ2VuZXJhdGVFZGdlUG9pbnRzKCk7XG5cbiAgICAgIC8vIGFkZCBzb21lIHJhbmRvbSBwb2ludHMgaW4gdGhlIG1pZGRsZSBmaWVsZCxcbiAgICAgIC8vIGV4Y2x1ZGluZyBlZGdlcyBhbmQgY29ybmVyc1xuICAgICAgdGhpcy5nZW5lcmF0ZVJhbmRvbVBvaW50cyh0aGlzLm51bVBvaW50cywgMSwgMSwgdGhpcy53aWR0aCAtIDEsIHRoaXMuaGVpZ2h0IC0gMSk7XG4gICAgfVxuXG4gICAgLy8gYWRkIHBvaW50cyBpbiB0aGUgY29ybmVyc1xuICAgIGdlbmVyYXRlQ29ybmVyUG9pbnRzKCkge1xuICAgICAgdGhpcy5wb2ludHMucHVzaChuZXcgUG9pbnQoMCwgMCkpO1xuICAgICAgdGhpcy5wb2ludHMucHVzaChuZXcgUG9pbnQoMCwgdGhpcy5oZWlnaHQpKTtcbiAgICAgIHRoaXMucG9pbnRzLnB1c2gobmV3IFBvaW50KHRoaXMud2lkdGgsIDApKTtcbiAgICAgIHRoaXMucG9pbnRzLnB1c2gobmV3IFBvaW50KHRoaXMud2lkdGgsIHRoaXMuaGVpZ2h0KSk7XG4gICAgfVxuXG4gICAgLy8gYWRkIHBvaW50cyBvbiB0aGUgZWRnZXNcbiAgICBnZW5lcmF0ZUVkZ2VQb2ludHMoKSB7XG4gICAgICAvLyBsZWZ0IGVkZ2VcbiAgICAgIHRoaXMuZ2VuZXJhdGVSYW5kb21Qb2ludHModGhpcy5nZXROdW1FZGdlUG9pbnRzKCksIDAsIDAsIDAsIHRoaXMuaGVpZ2h0KTtcbiAgICAgIC8vIHJpZ2h0IGVkZ2VcbiAgICAgIHRoaXMuZ2VuZXJhdGVSYW5kb21Qb2ludHModGhpcy5nZXROdW1FZGdlUG9pbnRzKCksIHRoaXMud2lkdGgsIDAsIDAsIHRoaXMuaGVpZ2h0KTtcbiAgICAgIC8vIGJvdHRvbSBlZGdlXG4gICAgICB0aGlzLmdlbmVyYXRlUmFuZG9tUG9pbnRzKHRoaXMuZ2V0TnVtRWRnZVBvaW50cygpLCAwLCB0aGlzLmhlaWdodCwgdGhpcy53aWR0aCwgMCk7XG4gICAgICAvLyB0b3AgZWRnZVxuICAgICAgdGhpcy5nZW5lcmF0ZVJhbmRvbVBvaW50cyh0aGlzLmdldE51bUVkZ2VQb2ludHMoKSwgMCwgMCwgdGhpcy53aWR0aCwgMCk7XG4gICAgfVxuXG4gICAgLy8gcmFuZG9tbHkgZ2VuZXJhdGUgc29tZSBwb2ludHMsXG4gICAgLy8gc2F2ZSB0aGUgcG9pbnQgY2xvc2VzdCB0byBjZW50ZXJcbiAgICBnZW5lcmF0ZVJhbmRvbVBvaW50cyhudW1Qb2ludHMsIHgsIHksIHdpZHRoLCBoZWlnaHQpIHtcbiAgICAgIHZhciBjZW50ZXIgPSBuZXcgUG9pbnQoTWF0aC5yb3VuZCh0aGlzLmNhbnZhcy53aWR0aCAvIDIpLCBNYXRoLnJvdW5kKHRoaXMuY2FudmFzLmhlaWdodCAvIDIpKTtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbnVtUG9pbnRzOyBpKyspIHtcbiAgICAgICAgLy8gZ2VuZXJhdGUgYSBuZXcgcG9pbnQgd2l0aCByYW5kb20gY29vcmRzXG4gICAgICAgIC8vIHJlLWdlbmVyYXRlIHRoZSBwb2ludCBpZiBpdCBhbHJlYWR5IGV4aXN0cyBpbiBwb2ludG1hcCAobWF4IDEwIHRpbWVzKVxuICAgICAgICB2YXIgcG9pbnQ7XG4gICAgICAgIHZhciBqID0gMDtcbiAgICAgICAgZG8ge1xuICAgICAgICAgIGorKztcbiAgICAgICAgICBwb2ludCA9IG5ldyBQb2ludChSYW5kb20ucmFuZG9tQmV0d2Vlbih4LCB4ICsgd2lkdGgpLCBSYW5kb20ucmFuZG9tQmV0d2Vlbih5LCB5ICsgaGVpZ2h0KSk7XG4gICAgICAgIH0gd2hpbGUgKHRoaXMucG9pbnRNYXAuZXhpc3RzKHBvaW50KSAmJiBqIDwgMTApO1xuXG4gICAgICAgIGlmIChqIDwgMTApIHtcbiAgICAgICAgICB0aGlzLnBvaW50cy5wdXNoKHBvaW50KTtcbiAgICAgICAgICB0aGlzLnBvaW50TWFwLmFkZChwb2ludCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY2VudGVyLmdldERpc3RhbmNlVG8ocG9pbnQpIDwgY2VudGVyLmdldERpc3RhbmNlVG8odGhpcy5jZW50ZXIpKSB7XG4gICAgICAgICAgdGhpcy5jZW50ZXIgPSBwb2ludDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aGlzLmNlbnRlci5pc0NlbnRlciA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHRoaXMuY2VudGVyLmlzQ2VudGVyID0gdHJ1ZTtcbiAgICB9XG5cbiAgICAvLyB1c2UgdGhlIERlbGF1bmF5IGFsZ29yaXRobSB0byBtYWtlXG4gICAgLy8gdHJpYW5nbGVzIG91dCBvZiBvdXIgcmFuZG9tIHBvaW50c1xuICAgIHRyaWFuZ3VsYXRlKCkge1xuICAgICAgdGhpcy50cmlhbmdsZXMgPSBbXTtcblxuICAgICAgLy8gbWFwIHBvaW50IG9iamVjdHMgdG8gbGVuZ3RoLTIgYXJyYXlzXG4gICAgICB2YXIgdmVydGljZXMgPSB0aGlzLnBvaW50cy5tYXAoZnVuY3Rpb24ocG9pbnQpIHtcbiAgICAgICAgcmV0dXJuIHBvaW50LmdldENvb3JkcygpO1xuICAgICAgfSk7XG5cbiAgICAgIC8vIHZlcnRpY2VzIGlzIG5vdyBhbiBhcnJheSBzdWNoIGFzOlxuICAgICAgLy8gWyBbcDF4LCBwMXldLCBbcDJ4LCBwMnldLCBbcDN4LCBwM3ldLCAuLi4gXVxuXG4gICAgICAvLyBkbyB0aGUgYWxnb3JpdGhtXG4gICAgICB2YXIgdHJpYW5ndWxhdGVkID0gRGVsYXVuYXkudHJpYW5ndWxhdGUodmVydGljZXMpO1xuXG4gICAgICAvLyByZXR1cm5zIDEgZGltZW5zaW9uYWwgYXJyYXkgYXJyYW5nZWQgaW4gdHJpcGxlcyBzdWNoIGFzOlxuICAgICAgLy8gWyB0MWEsIHQxYiwgdDFjLCB0MmEsIHQyYiwgdDJjLC4uLi4gXVxuICAgICAgLy8gd2hlcmUgdDFhLCBldGMgYXJlIGluZGVjZXMgaW4gdGhlIHZlcnRpY2VzIGFycmF5XG4gICAgICAvLyB0dXJuIHRoYXQgaW50byBhcnJheSBvZiB0cmlhbmdsZSBwb2ludHNcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdHJpYW5ndWxhdGVkLmxlbmd0aDsgaSArPSAzKSB7XG4gICAgICAgIHZhciBhcnIgPSBbXTtcbiAgICAgICAgYXJyLnB1c2godmVydGljZXNbdHJpYW5ndWxhdGVkW2ldXSk7XG4gICAgICAgIGFyci5wdXNoKHZlcnRpY2VzW3RyaWFuZ3VsYXRlZFtpICsgMV1dKTtcbiAgICAgICAgYXJyLnB1c2godmVydGljZXNbdHJpYW5ndWxhdGVkW2kgKyAyXV0pO1xuICAgICAgICB0aGlzLnRyaWFuZ2xlcy5wdXNoKGFycik7XG4gICAgICB9XG5cbiAgICAgIC8vIG1hcCB0byBhcnJheSBvZiBUcmlhbmdsZSBvYmplY3RzXG4gICAgICB0aGlzLnRyaWFuZ2xlcyA9IHRoaXMudHJpYW5nbGVzLm1hcChmdW5jdGlvbih0cmlhbmdsZSkge1xuICAgICAgICByZXR1cm4gbmV3IFRyaWFuZ2xlKG5ldyBQb2ludCh0cmlhbmdsZVswXSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3IFBvaW50KHRyaWFuZ2xlWzFdKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXcgUG9pbnQodHJpYW5nbGVbMl0pKTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHJlc2V0UG9pbnRDb2xvcnMoKSB7XG4gICAgICAvLyByZXNldCBjYWNoZWQgY29sb3JzIG9mIGNlbnRyb2lkcyBhbmQgcG9pbnRzXG4gICAgICB2YXIgaTtcbiAgICAgIGZvciAoaSA9IDA7IGkgPCB0aGlzLnRyaWFuZ2xlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICB0aGlzLnRyaWFuZ2xlc1tpXS5yZXNldFBvaW50Q29sb3JzKCk7XG4gICAgICB9XG5cbiAgICAgIGZvciAoaSA9IDA7IGkgPCB0aGlzLnBvaW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICB0aGlzLnBvaW50c1tpXS5yZXNldENvbG9yKCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gY3JlYXRlIHJhbmRvbSByYWRpYWwgZ3JhZGllbnQgY2lyY2xlcyBmb3IgcmVuZGVyaW5nIGxhdGVyXG4gICAgZ2VuZXJhdGVHcmFkaWVudHMobWluR3JhZGllbnRzLCBtYXhHcmFkaWVudHMpIHtcbiAgICAgIHRoaXMucmFkaWFsR3JhZGllbnRzID0gW107XG5cbiAgICAgIG1pbkdyYWRpZW50cyA9IG1pbkdyYWRpZW50cyB8fCB0aGlzLm1pbkdyYWRpZW50cyA+IDAgPyBtaW5HcmFkaWVudHMgfHwgdGhpcy5taW5HcmFkaWVudHMgOiAxO1xuICAgICAgbWF4R3JhZGllbnRzID0gbWF4R3JhZGllbnRzIHx8IHRoaXMubWF4R3JhZGllbnRzID4gMCA/IG1heEdyYWRpZW50cyB8fCB0aGlzLm1heEdyYWRpZW50cyA6IDI7XG5cbiAgICAgIHRoaXMubnVtR3JhZGllbnRzID0gUmFuZG9tLnJhbmRvbUJldHdlZW4obWluR3JhZGllbnRzLCBtYXhHcmFkaWVudHMpO1xuXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMubnVtR3JhZGllbnRzOyBpKyspIHtcbiAgICAgICAgdGhpcy5nZW5lcmF0ZVJhZGlhbEdyYWRpZW50KCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZ2VuZXJhdGVSYWRpYWxHcmFkaWVudCgpIHtcbiAgICAgIC8qKlxuICAgICAgICAqIGNyZWF0ZSBhIG5pY2UtbG9va2luZyBidXQgc29tZXdoYXQgcmFuZG9tIGdyYWRpZW50OlxuICAgICAgICAqIHJhbmRvbWl6ZSB0aGUgZmlyc3QgY2lyY2xlXG4gICAgICAgICogdGhlIHNlY29uZCBjaXJjbGUgc2hvdWxkIGJlIGluc2lkZSB0aGUgZmlyc3QgY2lyY2xlLFxuICAgICAgICAqIHNvIHdlIGdlbmVyYXRlIGEgcG9pbnQgKG9yaWdpbjIpIGluc2lkZSBjaXJsZTFcbiAgICAgICAgKiB0aGVuIGNhbGN1bGF0ZSB0aGUgZGlzdCBiZXR3ZWVuIG9yaWdpbjIgYW5kIHRoZSBjaXJjdW1mcmVuY2Ugb2YgY2lyY2xlMVxuICAgICAgICAqIGNpcmNsZTIncyByYWRpdXMgY2FuIGJlIGJldHdlZW4gMCBhbmQgdGhpcyBkaXN0XG4gICAgICAgICovXG5cbiAgICAgIHZhciBtaW5YID0gTWF0aC5jZWlsKE1hdGguc3FydCh0aGlzLmNhbnZhcy53aWR0aCkpO1xuICAgICAgdmFyIG1heFggPSBNYXRoLmNlaWwodGhpcy5jYW52YXMud2lkdGggLSBNYXRoLnNxcnQodGhpcy5jYW52YXMud2lkdGgpKTtcblxuICAgICAgdmFyIG1pblkgPSBNYXRoLmNlaWwoTWF0aC5zcXJ0KHRoaXMuY2FudmFzLmhlaWdodCkpO1xuICAgICAgdmFyIG1heFkgPSBNYXRoLmNlaWwodGhpcy5jYW52YXMuaGVpZ2h0IC0gTWF0aC5zcXJ0KHRoaXMuY2FudmFzLmhlaWdodCkpO1xuXG4gICAgICB2YXIgbWluUmFkaXVzID0gTWF0aC5jZWlsKE1hdGgubWF4KHRoaXMuY2FudmFzLmhlaWdodCwgdGhpcy5jYW52YXMud2lkdGgpIC9cbiAgICAgICAgICAgICAgICAgICAgICBNYXRoLm1heChNYXRoLnNxcnQodGhpcy5udW1HcmFkaWVudHMpLCAyKSk7XG4gICAgICB2YXIgbWF4UmFkaXVzID0gTWF0aC5jZWlsKE1hdGgubWF4KHRoaXMuY2FudmFzLmhlaWdodCwgdGhpcy5jYW52YXMud2lkdGgpIC9cbiAgICAgICAgICAgICAgICAgICAgICBNYXRoLm1heChNYXRoLmxvZyh0aGlzLm51bUdyYWRpZW50cyksIDEpKTtcblxuICAgICAgLy8gaGVscGVyIHJhbmRvbSBmdW5jdGlvbnNcbiAgICAgIHZhciByYW5kb21DYW52YXNYID0gUmFuZG9tLnJhbmRvbU51bWJlckZ1bmN0aW9uKG1pblgsIG1heFgpO1xuICAgICAgdmFyIHJhbmRvbUNhbnZhc1kgPSBSYW5kb20ucmFuZG9tTnVtYmVyRnVuY3Rpb24obWluWSwgbWF4WSk7XG4gICAgICB2YXIgcmFuZG9tQ2FudmFzUmFkaXVzID0gUmFuZG9tLnJhbmRvbU51bWJlckZ1bmN0aW9uKG1pblJhZGl1cywgbWF4UmFkaXVzKTtcblxuICAgICAgLy8gZ2VuZXJhdGUgY2lyY2xlMSBvcmlnaW4gYW5kIHJhZGl1c1xuICAgICAgdmFyIHgwO1xuICAgICAgdmFyIHkwO1xuICAgICAgdmFyIHIwID0gcmFuZG9tQ2FudmFzUmFkaXVzKCk7XG5cbiAgICAgIC8vIG9yaWdpbiBvZiB0aGUgbmV4dCBjaXJjbGUgc2hvdWxkIGJlIGNvbnRhaW5lZFxuICAgICAgLy8gd2l0aGluIHRoZSBhcmVhIG9mIGl0cyBwcmVkZWNlc3NvclxuICAgICAgaWYgKHRoaXMucmFkaWFsR3JhZGllbnRzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgdmFyIGxhc3RHcmFkaWVudCA9IHRoaXMucmFkaWFsR3JhZGllbnRzW3RoaXMucmFkaWFsR3JhZGllbnRzLmxlbmd0aCAtIDFdO1xuICAgICAgICB2YXIgcG9pbnRJbkxhc3RDaXJjbGUgPSBSYW5kb20ucmFuZG9tSW5DaXJjbGUobGFzdEdyYWRpZW50LnIwLCBsYXN0R3JhZGllbnQueDAsIGxhc3RHcmFkaWVudC55MCk7XG5cbiAgICAgICAgLy8gb3JpZ2luIG11c3QgYmUgd2l0aGluIHRoZSBib3VuZHMgb2YgdGhlIGNhbnZhc1xuICAgICAgICB3aGlsZSAocG9pbnRJbkxhc3RDaXJjbGUueCA8IDAgfHxcbiAgICAgICAgICAgICAgIHBvaW50SW5MYXN0Q2lyY2xlLnkgPCAwIHx8XG4gICAgICAgICAgICAgICBwb2ludEluTGFzdENpcmNsZS54ID4gdGhpcy5jYW52YXMud2lkdGggfHxcbiAgICAgICAgICAgICAgIHBvaW50SW5MYXN0Q2lyY2xlLnkgPiB0aGlzLmNhbnZhcy5oZWlnaHQpIHtcbiAgICAgICAgICBwb2ludEluTGFzdENpcmNsZSA9IFJhbmRvbS5yYW5kb21JbkNpcmNsZShsYXN0R3JhZGllbnQucjAsIGxhc3RHcmFkaWVudC54MCwgbGFzdEdyYWRpZW50LnkwKTtcbiAgICAgICAgfVxuICAgICAgICB4MCA9IHBvaW50SW5MYXN0Q2lyY2xlLng7XG4gICAgICAgIHkwID0gcG9pbnRJbkxhc3RDaXJjbGUueTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIGZpcnN0IGNpcmNsZSwganVzdCBwaWNrIGF0IHJhbmRvbVxuICAgICAgICB4MCA9IHJhbmRvbUNhbnZhc1goKTtcbiAgICAgICAgeTAgPSByYW5kb21DYW52YXNZKCk7XG4gICAgICB9XG5cbiAgICAgIC8vIGZpbmQgYSByYW5kb20gcG9pbnQgaW5zaWRlIGNpcmNsZTFcbiAgICAgIC8vIHRoaXMgaXMgdGhlIG9yaWdpbiBvZiBjaXJjbGUgMlxuICAgICAgdmFyIHBvaW50SW5DaXJjbGUgPSBSYW5kb20ucmFuZG9tSW5DaXJjbGUocjAgKiAwLjA5LCB4MCwgeTApO1xuXG4gICAgICAvLyBncmFiIHRoZSB4L3kgY29vcmRzXG4gICAgICB2YXIgeDEgPSBwb2ludEluQ2lyY2xlLng7XG4gICAgICB2YXIgeTEgPSBwb2ludEluQ2lyY2xlLnk7XG5cbiAgICAgIC8vIGZpbmQgZGlzdGFuY2UgYmV0d2VlbiB0aGUgcG9pbnQgYW5kIHRoZSBjaXJjdW1mcmllbmNlIG9mIGNpcmNsZTFcbiAgICAgIC8vIHRoZSByYWRpdXMgb2YgdGhlIHNlY29uZCBjaXJjbGUgd2lsbCBiZSBhIGZ1bmN0aW9uIG9mIHRoaXMgZGlzdGFuY2VcbiAgICAgIHZhciB2WCA9IHgxIC0geDA7XG4gICAgICB2YXIgdlkgPSB5MSAtIHkwO1xuICAgICAgdmFyIG1hZ1YgPSBNYXRoLnNxcnQodlggKiB2WCArIHZZICogdlkpO1xuICAgICAgdmFyIGFYID0geDAgKyB2WCAvIG1hZ1YgKiByMDtcbiAgICAgIHZhciBhWSA9IHkwICsgdlkgLyBtYWdWICogcjA7XG5cbiAgICAgIHZhciBkaXN0ID0gTWF0aC5zcXJ0KCh4MSAtIGFYKSAqICh4MSAtIGFYKSArICh5MSAtIGFZKSAqICh5MSAtIGFZKSk7XG5cbiAgICAgIC8vIGdlbmVyYXRlIHRoZSByYWRpdXMgb2YgY2lyY2xlMiBiYXNlZCBvbiB0aGlzIGRpc3RhbmNlXG4gICAgICB2YXIgcjEgPSBSYW5kb20ucmFuZG9tQmV0d2VlbigxLCBNYXRoLnNxcnQoZGlzdCkpO1xuXG4gICAgICAvLyByYW5kb20gYnV0IG5pY2UgbG9va2luZyBjb2xvciBzdG9wXG4gICAgICB2YXIgY29sb3JTdG9wID0gUmFuZG9tLnJhbmRvbUJldHdlZW4oMiwgOCkgLyAxMDtcblxuICAgICAgdGhpcy5yYWRpYWxHcmFkaWVudHMucHVzaCh7eDAsIHkwLCByMCwgeDEsIHkxLCByMSwgY29sb3JTdG9wfSk7XG4gICAgfVxuXG4gICAgLy8gc29ydHMgdGhlIHBvaW50c1xuICAgIHNvcnRQb2ludHMoKSB7XG4gICAgICAvLyBzb3J0IHBvaW50c1xuICAgICAgdGhpcy5wb2ludHMuc29ydChmdW5jdGlvbihhLCBiKSB7XG4gICAgICAgIC8vIHNvcnQgdGhlIHBvaW50XG4gICAgICAgIGlmIChhLnggPCBiLngpIHtcbiAgICAgICAgICByZXR1cm4gLTE7XG4gICAgICAgIH0gZWxzZSBpZiAoYS54ID4gYi54KSB7XG4gICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgIH0gZWxzZSBpZiAoYS55IDwgYi55KSB7XG4gICAgICAgICAgcmV0dXJuIC0xO1xuICAgICAgICB9IGVsc2UgaWYgKGEueSA+IGIueSkge1xuICAgICAgICAgIHJldHVybiAxO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBzaXplIHRoZSBjYW52YXMgdG8gdGhlIHNpemUgb2YgaXRzIHBhcmVudFxuICAgIC8vIG1ha2VzIHRoZSBjYW52YXMgJ3Jlc3BvbnNpdmUnXG4gICAgcmVzaXplQ2FudmFzKCkge1xuICAgICAgdmFyIHBhcmVudCA9IHRoaXMuY2FudmFzLnBhcmVudEVsZW1lbnQ7XG4gICAgICB0aGlzLmNhbnZhcy53aWR0aCA9IHRoaXMud2lkdGggPSBwYXJlbnQub2Zmc2V0V2lkdGg7XG4gICAgICB0aGlzLmNhbnZhcy5oZWlnaHQgPSB0aGlzLmhlaWdodCA9IHBhcmVudC5vZmZzZXRIZWlnaHQ7XG5cbiAgICAgIGlmICh0aGlzLmhvdmVyU2hhZG93Q2FudmFzKSB7XG4gICAgICAgIHRoaXMuaG92ZXJTaGFkb3dDYW52YXMud2lkdGggPSB0aGlzLndpZHRoID0gcGFyZW50Lm9mZnNldFdpZHRoO1xuICAgICAgICB0aGlzLmhvdmVyU2hhZG93Q2FudmFzLmhlaWdodCA9IHRoaXMuaGVpZ2h0ID0gcGFyZW50Lm9mZnNldEhlaWdodDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBtb3ZlcyBwb2ludHMvdHJpYW5nbGVzIGJhc2VkIG9uIG5ldyBzaXplIG9mIGNhbnZhc1xuICAgIHJlc2NhbGUoKSB7XG4gICAgICAvLyBncmFiIG9sZCBtYXgvbWluIGZyb20gY3VycmVudCBjYW52YXMgc2l6ZVxuICAgICAgdmFyIHhNaW4gPSAwO1xuICAgICAgdmFyIHhNYXggPSB0aGlzLmNhbnZhcy53aWR0aDtcbiAgICAgIHZhciB5TWluID0gMDtcbiAgICAgIHZhciB5TWF4ID0gdGhpcy5jYW52YXMuaGVpZ2h0O1xuXG4gICAgICB0aGlzLnJlc2l6ZUNhbnZhcygpO1xuXG4gICAgICBpZiAodGhpcy5vcHRpb25zLnJlc2l6ZU1vZGUgPT09ICdzY2FsZVBvaW50cycpIHtcbiAgICAgICAgLy8gc2NhbGUgYWxsIHBvaW50cyB0byBuZXcgbWF4IGRpbWVuc2lvbnNcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLnBvaW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIHRoaXMucG9pbnRzW2ldLnJlc2NhbGUoeE1pbiwgeE1heCwgeU1pbiwgeU1heCwgMCwgdGhpcy5jYW52YXMud2lkdGgsIDAsIHRoaXMuY2FudmFzLmhlaWdodCk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuZ2VuZXJhdGVOZXdQb2ludHMoKTtcbiAgICAgIH1cblxuICAgICAgdGhpcy50cmlhbmd1bGF0ZSgpO1xuXG4gICAgICAvLyByZXNjYWxlIHBvc2l0aW9uIG9mIHJhZGlhbCBncmFkaWVudCBjaXJjbGVzXG4gICAgICB0aGlzLnJlc2NhbGVHcmFkaWVudHModGhpcy5yYWRpYWxHcmFkaWVudHMsIHhNaW4sIHhNYXgsIHlNaW4sIHlNYXgpO1xuICAgICAgdGhpcy5yZXNjYWxlR3JhZGllbnRzKHRoaXMuY3VycmVudEdyYWRpZW50cywgeE1pbiwgeE1heCwgeU1pbiwgeU1heCk7XG4gICAgICB0aGlzLnJlc2NhbGVHcmFkaWVudHModGhpcy5uZXh0R3JhZGllbnRzLCB4TWluLCB4TWF4LCB5TWluLCB5TWF4KTtcblxuICAgICAgdGhpcy5yZW5kZXIoKTtcbiAgICB9XG5cbiAgICByZXNjYWxlR3JhZGllbnRzKGFycmF5LCB4TWluLCB4TWF4LCB5TWluLCB5TWF4KSB7XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFycmF5Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBjaXJjbGUwID0gbmV3IFBvaW50KGFycmF5W2ldLngwLCBhcnJheVtpXS55MCk7XG4gICAgICAgIHZhciBjaXJjbGUxID0gbmV3IFBvaW50KGFycmF5W2ldLngxLCBhcnJheVtpXS55MSk7XG5cbiAgICAgICAgY2lyY2xlMC5yZXNjYWxlKHhNaW4sIHhNYXgsIHlNaW4sIHlNYXgsIDAsIHRoaXMuY2FudmFzLndpZHRoLCAwLCB0aGlzLmNhbnZhcy5oZWlnaHQpO1xuICAgICAgICBjaXJjbGUxLnJlc2NhbGUoeE1pbiwgeE1heCwgeU1pbiwgeU1heCwgMCwgdGhpcy5jYW52YXMud2lkdGgsIDAsIHRoaXMuY2FudmFzLmhlaWdodCk7XG5cbiAgICAgICAgYXJyYXlbaV0ueDAgPSBjaXJjbGUwLng7XG4gICAgICAgIGFycmF5W2ldLnkwID0gY2lyY2xlMC55O1xuICAgICAgICBhcnJheVtpXS54MSA9IGNpcmNsZTEueDtcbiAgICAgICAgYXJyYXlbaV0ueTEgPSBjaXJjbGUxLnk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaG92ZXIoKSB7XG4gICAgICBpZiAodGhpcy5tb3VzZVBvc2l0aW9uKSB7XG4gICAgICAgIHZhciByZ2IgPSB0aGlzLm1vdXNlUG9zaXRpb24uY2FudmFzQ29sb3JBdFBvaW50KHRoaXMuc2hhZG93SW1hZ2VEYXRhLCAncmdiJyk7XG4gICAgICAgIHZhciBoZXggPSBDb2xvci5yZ2JUb0hleChyZ2IpO1xuICAgICAgICB2YXIgZGVjID0gcGFyc2VJbnQoaGV4LCAxNik7XG5cbiAgICAgICAgLy8gaXMgcHJvYmFibHkgdHJpYW5nbGUgd2l0aCB0aGF0IGluZGV4LCBidXRcbiAgICAgICAgLy8gZWRnZXMgY2FuIGJlIGZ1enp5IHNvIGRvdWJsZSBjaGVja1xuICAgICAgICBpZiAoZGVjID49IDAgJiYgZGVjIDwgdGhpcy50cmlhbmdsZXMubGVuZ3RoICYmIHRoaXMudHJpYW5nbGVzW2RlY10ucG9pbnRJblRyaWFuZ2xlKHRoaXMubW91c2VQb3NpdGlvbikpIHtcbiAgICAgICAgICAvLyBjbGVhciB0aGUgbGFzdCB0cmlhbmdsZVxuICAgICAgICAgIHRoaXMucmVzZXRUcmlhbmdsZSgpO1xuXG4gICAgICAgICAgaWYgKHRoaXMubGFzdFRyaWFuZ2xlICE9PSBkZWMpIHtcbiAgICAgICAgICAgIC8vIHJlbmRlciB0aGUgaG92ZXJlZCB0cmlhbmdsZVxuICAgICAgICAgICAgdGhpcy5vcHRpb25zLm9uVHJpYW5nbGVIb3Zlcih0aGlzLnRyaWFuZ2xlc1tkZWNdLCB0aGlzLmN0eCwgdGhpcy5vcHRpb25zKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICB0aGlzLmxhc3RUcmlhbmdsZSA9IGRlYztcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5yZXNldFRyaWFuZ2xlKCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmVzZXRUcmlhbmdsZSgpIHtcbiAgICAgIC8vIHJlZHJhdyB0aGUgbGFzdCB0cmlhbmdsZSB0aGF0IHdhcyBob3ZlcmVkIG92ZXJcbiAgICAgIGlmICh0aGlzLmxhc3RUcmlhbmdsZSAmJiB0aGlzLmxhc3RUcmlhbmdsZSA+PSAwICYmIHRoaXMubGFzdFRyaWFuZ2xlIDwgdGhpcy50cmlhbmdsZXMubGVuZ3RoKSB7XG4gICAgICAgIHZhciBsYXN0VHJpYW5nbGUgPSB0aGlzLnRyaWFuZ2xlc1t0aGlzLmxhc3RUcmlhbmdsZV07XG5cbiAgICAgICAgLy8gZmluZCB0aGUgYm91bmRpbmcgcG9pbnRzIG9mIHRoZSBsYXN0IHRyaWFuZ2xlXG4gICAgICAgIC8vIGV4cGFuZCBhIGJpdCBmb3IgZWRnZXNcbiAgICAgICAgdmFyIG1pblggPSBsYXN0VHJpYW5nbGUubWluWCgpIC0gMTtcbiAgICAgICAgdmFyIG1pblkgPSBsYXN0VHJpYW5nbGUubWluWSgpIC0gMTtcbiAgICAgICAgdmFyIG1heFggPSBsYXN0VHJpYW5nbGUubWF4WCgpICsgMTtcbiAgICAgICAgdmFyIG1heFkgPSBsYXN0VHJpYW5nbGUubWF4WSgpICsgMTtcblxuICAgICAgICAvLyByZXNldCB0aGF0IHBvcnRpb24gb2YgdGhlIGNhbnZhcyB0byBpdHMgb3JpZ2luYWwgcmVuZGVyXG4gICAgICAgIHRoaXMuY3R4LnB1dEltYWdlRGF0YSh0aGlzLnJlbmRlcmVkSW1hZ2VEYXRhLCAwLCAwLCBtaW5YLCBtaW5ZLCBtYXhYIC0gbWluWCwgbWF4WSAtIG1pblkpO1xuXG4gICAgICAgIHRoaXMubGFzdFRyaWFuZ2xlID0gZmFsc2U7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmVuZGVyKCkge1xuICAgICAgLy8gcmVuZGVyIGEgZ3JhZGllbnQgYXMgYSBiYXNlIHRvIGdldCB0cmlhbmdsZSBjb2xvcnNcbiAgICAgIHRoaXMucmVuZGVyR3JhZGllbnQoKTtcblxuICAgICAgLy8gZ2V0IGVudGlyZSBjYW52YXMgaW1hZ2UgZGF0YSBvZiBpbiBhIGJpZyB0eXBlZCBhcnJheVxuICAgICAgLy8gdGhpcyB3YXkgd2UgZG9udCBoYXZlIHRvIHBpY2sgZm9yIGVhY2ggcG9pbnQgaW5kaXZpZHVhbGx5XG4gICAgICAvLyBpdCdzIGxpa2UgNTB4IGZhc3RlciB0aGlzIHdheVxuICAgICAgdGhpcy5ncmFkaWVudEltYWdlRGF0YSA9IHRoaXMuY3R4LmdldEltYWdlRGF0YSgwLCAwLCB0aGlzLmNhbnZhcy53aWR0aCwgdGhpcy5jYW52YXMuaGVpZ2h0KTtcblxuICAgICAgLy8gcmVuZGVycyB0cmlhbmdsZXMsIGVkZ2VzLCBhbmQgc2hhZG93IGNhbnZhcyBmb3IgaG92ZXIgZGV0ZWN0aW9uXG4gICAgICB0aGlzLnJlbmRlclRyaWFuZ2xlcyh0aGlzLm9wdGlvbnMuc2hvd1RyaWFuZ2xlcywgdGhpcy5vcHRpb25zLnNob3dFZGdlcyk7XG5cbiAgICAgIHRoaXMucmVuZGVyRXh0cmFzKCk7XG5cbiAgICAgIHRoaXMucmVuZGVyZWRJbWFnZURhdGEgPSB0aGlzLmN0eC5nZXRJbWFnZURhdGEoMCwgMCwgdGhpcy5jYW52YXMud2lkdGgsIHRoaXMuY2FudmFzLmhlaWdodCk7XG5cbiAgICAgIC8vIHRocm93IGV2ZW50cyBmb3IgbGlnaHQgLyBkYXJrIHRleHRcbiAgICAgIHZhciBjZW50ZXJDb2xvciA9IHRoaXMuY2VudGVyLmNhbnZhc0NvbG9yQXRQb2ludCgpO1xuXG4gICAgICBpZiAocGFyc2VJbnQoY2VudGVyQ29sb3Iuc3BsaXQoJywnKVsyXSkgPCA1MCkge1xuICAgICAgICB0aGlzLm9wdGlvbnMub25EYXJrQmFja2dyb3VuZChjZW50ZXJDb2xvcik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLm9wdGlvbnMub25MaWdodEJhY2tncm91bmQoY2VudGVyQ29sb3IpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJlbmRlckV4dHJhcygpIHtcbiAgICAgIGlmICh0aGlzLm9wdGlvbnMuc2hvd1BvaW50cykge1xuICAgICAgICB0aGlzLnJlbmRlclBvaW50cygpO1xuICAgICAgfVxuXG4gICAgICBpZiAodGhpcy5vcHRpb25zLnNob3dDaXJjbGVzKSB7XG4gICAgICAgIHRoaXMucmVuZGVyR3JhZGllbnRDaXJjbGVzKCk7XG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLm9wdGlvbnMuc2hvd0NlbnRyb2lkcykge1xuICAgICAgICB0aGlzLnJlbmRlckNlbnRyb2lkcygpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJlbmRlck5ld0NvbG9ycyhjb2xvcnMpIHtcbiAgICAgIHRoaXMuY29sb3JzID0gY29sb3JzIHx8IHRoaXMuY29sb3JzO1xuICAgICAgLy8gdHJpYW5nbGUgY2VudHJvaWRzIG5lZWQgbmV3IGNvbG9yc1xuICAgICAgdGhpcy5yZXNldFBvaW50Q29sb3JzKCk7XG4gICAgICB0aGlzLnJlbmRlcigpO1xuICAgIH1cblxuICAgIHJlbmRlck5ld0dyYWRpZW50KG1pbkdyYWRpZW50cywgbWF4R3JhZGllbnRzKSB7XG4gICAgICB0aGlzLmdlbmVyYXRlR3JhZGllbnRzKG1pbkdyYWRpZW50cywgbWF4R3JhZGllbnRzKTtcblxuICAgICAgLy8gcHJlcCBmb3IgYW5pbWF0aW9uXG4gICAgICB0aGlzLm5leHRHcmFkaWVudHMgPSB0aGlzLnJhZGlhbEdyYWRpZW50cy5zbGljZSgwKTtcbiAgICAgIHRoaXMuZ2VuZXJhdGVHcmFkaWVudHMoKTtcbiAgICAgIHRoaXMuY3VycmVudEdyYWRpZW50cyA9IHRoaXMucmFkaWFsR3JhZGllbnRzLnNsaWNlKDApO1xuXG4gICAgICB0aGlzLnJlc2V0UG9pbnRDb2xvcnMoKTtcbiAgICAgIHRoaXMucmVuZGVyKCk7XG4gICAgfVxuXG4gICAgcmVuZGVyTmV3VHJpYW5nbGVzKG1pbiwgbWF4LCBtaW5FZGdlLCBtYXhFZGdlLCBtdWx0aXBsaWVyKSB7XG4gICAgICB0aGlzLmdlbmVyYXRlTmV3UG9pbnRzKG1pbiwgbWF4LCBtaW5FZGdlLCBtYXhFZGdlLCBtdWx0aXBsaWVyKTtcbiAgICAgIHRoaXMudHJpYW5ndWxhdGUoKTtcbiAgICAgIHRoaXMucmVuZGVyKCk7XG4gICAgfVxuXG4gICAgcmVuZGVyR3JhZGllbnQoKSB7XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMucmFkaWFsR3JhZGllbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIC8vIGNyZWF0ZSB0aGUgcmFkaWFsIGdyYWRpZW50IGJhc2VkIG9uXG4gICAgICAgIC8vIHRoZSBnZW5lcmF0ZWQgY2lyY2xlcycgcmFkaWkgYW5kIG9yaWdpbnNcbiAgICAgICAgdmFyIHJhZGlhbEdyYWRpZW50ID0gdGhpcy5jdHguY3JlYXRlUmFkaWFsR3JhZGllbnQoXG4gICAgICAgICAgdGhpcy5yYWRpYWxHcmFkaWVudHNbaV0ueDAsXG4gICAgICAgICAgdGhpcy5yYWRpYWxHcmFkaWVudHNbaV0ueTAsXG4gICAgICAgICAgdGhpcy5yYWRpYWxHcmFkaWVudHNbaV0ucjAsXG4gICAgICAgICAgdGhpcy5yYWRpYWxHcmFkaWVudHNbaV0ueDEsXG4gICAgICAgICAgdGhpcy5yYWRpYWxHcmFkaWVudHNbaV0ueTEsXG4gICAgICAgICAgdGhpcy5yYWRpYWxHcmFkaWVudHNbaV0ucjFcbiAgICAgICAgKTtcblxuICAgICAgICB2YXIgb3V0ZXJDb2xvciA9IHRoaXMuY29sb3JzWzJdO1xuXG4gICAgICAgIC8vIG11c3QgYmUgdHJhbnNwYXJlbnQgdmVyc2lvbiBvZiBtaWRkbGUgY29sb3JcbiAgICAgICAgLy8gdGhpcyB3b3JrcyBmb3IgcmdiYSBhbmQgaHNsYVxuICAgICAgICBpZiAoaSA+IDApIHtcbiAgICAgICAgICBvdXRlckNvbG9yID0gdGhpcy5jb2xvcnNbMV0uc3BsaXQoJywnKTtcbiAgICAgICAgICBvdXRlckNvbG9yWzNdID0gJzApJztcbiAgICAgICAgICBvdXRlckNvbG9yID0gb3V0ZXJDb2xvci5qb2luKCcsJyk7XG4gICAgICAgIH1cblxuICAgICAgICByYWRpYWxHcmFkaWVudC5hZGRDb2xvclN0b3AoMSwgdGhpcy5jb2xvcnNbMF0pO1xuICAgICAgICByYWRpYWxHcmFkaWVudC5hZGRDb2xvclN0b3AodGhpcy5yYWRpYWxHcmFkaWVudHNbaV0uY29sb3JTdG9wLCB0aGlzLmNvbG9yc1sxXSk7XG4gICAgICAgIHJhZGlhbEdyYWRpZW50LmFkZENvbG9yU3RvcCgwLCBvdXRlckNvbG9yKTtcblxuICAgICAgICB0aGlzLmNhbnZhcy5wYXJlbnRFbGVtZW50LnN0eWxlLmJhY2tncm91bmRDb2xvciA9IHRoaXMuY29sb3JzWzJdO1xuXG4gICAgICAgIHRoaXMuY3R4LmZpbGxTdHlsZSA9IHJhZGlhbEdyYWRpZW50O1xuICAgICAgICB0aGlzLmN0eC5maWxsUmVjdCgwLCAwLCB0aGlzLmNhbnZhcy53aWR0aCwgdGhpcy5jYW52YXMuaGVpZ2h0KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZW5kZXJUcmlhbmdsZXModHJpYW5nbGVzLCBlZGdlcykge1xuXG4gICAgICAvLyBzYXZlIHRoaXMgZm9yIGxhdGVyXG4gICAgICB0aGlzLmNlbnRlci5jYW52YXNDb2xvckF0UG9pbnQodGhpcy5ncmFkaWVudEltYWdlRGF0YSk7XG5cbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy50cmlhbmdsZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgLy8gdGhlIGNvbG9yIGlzIGRldGVybWluZWQgYnkgZ3JhYmJpbmcgdGhlIGNvbG9yIG9mIHRoZSBjYW52YXNcbiAgICAgICAgLy8gKHdoZXJlIHdlIGRyZXcgdGhlIGdyYWRpZW50KSBhdCB0aGUgY2VudGVyIG9mIHRoZSB0cmlhbmdsZVxuXG4gICAgICAgIHRoaXMudHJpYW5nbGVzW2ldLmNvbG9yID0gdGhpcy50cmlhbmdsZXNbaV0uY29sb3JBdENlbnRyb2lkKHRoaXMuZ3JhZGllbnRJbWFnZURhdGEpO1xuXG4gICAgICAgIGlmICh0cmlhbmdsZXMgJiYgZWRnZXMpIHtcbiAgICAgICAgICB0aGlzLnRyaWFuZ2xlc1tpXS5zdHJva2UgPSB0aGlzLm9wdGlvbnMuZWRnZUNvbG9yKHRoaXMudHJpYW5nbGVzW2ldLmNvbG9yQXRDZW50cm9pZCh0aGlzLmdyYWRpZW50SW1hZ2VEYXRhKSk7XG4gICAgICAgICAgdGhpcy50cmlhbmdsZXNbaV0ucmVuZGVyKHRoaXMuY3R4KTtcbiAgICAgICAgfSBlbHNlIGlmICh0cmlhbmdsZXMpIHtcbiAgICAgICAgICAvLyB0cmlhbmdsZXMgb25seVxuICAgICAgICAgIHRoaXMudHJpYW5nbGVzW2ldLnN0cm9rZSA9IHRoaXMudHJpYW5nbGVzW2ldLmNvbG9yO1xuICAgICAgICAgIHRoaXMudHJpYW5nbGVzW2ldLnJlbmRlcih0aGlzLmN0eCk7XG4gICAgICAgIH0gZWxzZSBpZiAoZWRnZXMpIHtcbiAgICAgICAgICAvLyBlZGdlcyBvbmx5XG4gICAgICAgICAgdGhpcy50cmlhbmdsZXNbaV0uc3Ryb2tlID0gdGhpcy5vcHRpb25zLmVkZ2VDb2xvcih0aGlzLnRyaWFuZ2xlc1tpXS5jb2xvckF0Q2VudHJvaWQodGhpcy5ncmFkaWVudEltYWdlRGF0YSkpO1xuICAgICAgICAgIHRoaXMudHJpYW5nbGVzW2ldLnJlbmRlcih0aGlzLmN0eCwgZmFsc2UpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuaG92ZXJTaGFkb3dDYW52YXMpIHtcbiAgICAgICAgICB2YXIgY29sb3IgPSAnIycgKyAoJzAwMDAwMCcgKyBpLnRvU3RyaW5nKDE2KSkuc2xpY2UoLTYpO1xuICAgICAgICAgIHRoaXMudHJpYW5nbGVzW2ldLnJlbmRlcih0aGlzLnNoYWRvd0N0eCwgY29sb3IsIGZhbHNlKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAodGhpcy5ob3ZlclNoYWRvd0NhbnZhcykge1xuICAgICAgICB0aGlzLnNoYWRvd0ltYWdlRGF0YSA9IHRoaXMuc2hhZG93Q3R4LmdldEltYWdlRGF0YSgwLCAwLCB0aGlzLmNhbnZhcy53aWR0aCwgdGhpcy5jYW52YXMuaGVpZ2h0KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyByZW5kZXJzIHRoZSBwb2ludHMgb2YgdGhlIHRyaWFuZ2xlc1xuICAgIHJlbmRlclBvaW50cygpIHtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5wb2ludHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIGNvbG9yID0gdGhpcy5vcHRpb25zLnBvaW50Q29sb3IodGhpcy5wb2ludHNbaV0uY2FudmFzQ29sb3JBdFBvaW50KHRoaXMuZ3JhZGllbnRJbWFnZURhdGEpKTtcbiAgICAgICAgdGhpcy5wb2ludHNbaV0ucmVuZGVyKHRoaXMuY3R4LCBjb2xvcik7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gZHJhd3MgdGhlIGNpcmNsZXMgdGhhdCBkZWZpbmUgdGhlIGdyYWRpZW50c1xuICAgIHJlbmRlckdyYWRpZW50Q2lyY2xlcygpIHtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5yYWRpYWxHcmFkaWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdGhpcy5jdHguYmVnaW5QYXRoKCk7XG4gICAgICAgIHRoaXMuY3R4LmFyYyh0aGlzLnJhZGlhbEdyYWRpZW50c1tpXS54MCxcbiAgICAgICAgICAgICAgICB0aGlzLnJhZGlhbEdyYWRpZW50c1tpXS55MCxcbiAgICAgICAgICAgICAgICB0aGlzLnJhZGlhbEdyYWRpZW50c1tpXS5yMCxcbiAgICAgICAgICAgICAgICAwLCBNYXRoLlBJICogMiwgdHJ1ZSk7XG4gICAgICAgIHZhciBjZW50ZXIxID0gbmV3IFBvaW50KHRoaXMucmFkaWFsR3JhZGllbnRzW2ldLngwLCB0aGlzLnJhZGlhbEdyYWRpZW50c1tpXS55MCk7XG4gICAgICAgIHRoaXMuY3R4LnN0cm9rZVN0eWxlID0gY2VudGVyMS5jYW52YXNDb2xvckF0UG9pbnQodGhpcy5ncmFkaWVudEltYWdlRGF0YSk7XG4gICAgICAgIHRoaXMuY3R4LnN0cm9rZSgpO1xuXG4gICAgICAgIHRoaXMuY3R4LmJlZ2luUGF0aCgpO1xuICAgICAgICB0aGlzLmN0eC5hcmModGhpcy5yYWRpYWxHcmFkaWVudHNbaV0ueDEsXG4gICAgICAgICAgICAgICAgdGhpcy5yYWRpYWxHcmFkaWVudHNbaV0ueTEsXG4gICAgICAgICAgICAgICAgdGhpcy5yYWRpYWxHcmFkaWVudHNbaV0ucjEsXG4gICAgICAgICAgICAgICAgMCwgTWF0aC5QSSAqIDIsIHRydWUpO1xuICAgICAgICB2YXIgY2VudGVyMiA9IG5ldyBQb2ludCh0aGlzLnJhZGlhbEdyYWRpZW50c1tpXS54MSwgdGhpcy5yYWRpYWxHcmFkaWVudHNbaV0ueTEpO1xuICAgICAgICB0aGlzLmN0eC5zdHJva2VTdHlsZSA9IGNlbnRlcjIuY2FudmFzQ29sb3JBdFBvaW50KHRoaXMuZ3JhZGllbnRJbWFnZURhdGEpO1xuICAgICAgICB0aGlzLmN0eC5zdHJva2UoKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyByZW5kZXIgdHJpYW5nbGUgY2VudHJvaWRzXG4gICAgcmVuZGVyQ2VudHJvaWRzKCkge1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLnRyaWFuZ2xlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgY29sb3IgPSB0aGlzLm9wdGlvbnMuY2VudHJvaWRDb2xvcih0aGlzLnRyaWFuZ2xlc1tpXS5jb2xvckF0Q2VudHJvaWQodGhpcy5ncmFkaWVudEltYWdlRGF0YSkpO1xuICAgICAgICB0aGlzLnRyaWFuZ2xlc1tpXS5jZW50cm9pZCgpLnJlbmRlcih0aGlzLmN0eCwgY29sb3IpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHRvZ2dsZVRyaWFuZ2xlcygpIHtcbiAgICAgIHRoaXMub3B0aW9ucy5zaG93VHJpYW5nbGVzID0gIXRoaXMub3B0aW9ucy5zaG93VHJpYW5nbGVzO1xuICAgICAgdGhpcy5yZW5kZXIoKTtcbiAgICB9XG5cbiAgICB0b2dnbGVQb2ludHMoKSB7XG4gICAgICB0aGlzLm9wdGlvbnMuc2hvd1BvaW50cyA9ICF0aGlzLm9wdGlvbnMuc2hvd1BvaW50cztcbiAgICAgIHRoaXMucmVuZGVyKCk7XG4gICAgfVxuXG4gICAgdG9nZ2xlQ2lyY2xlcygpIHtcbiAgICAgIHRoaXMub3B0aW9ucy5zaG93Q2lyY2xlcyA9ICF0aGlzLm9wdGlvbnMuc2hvd0NpcmNsZXM7XG4gICAgICB0aGlzLnJlbmRlcigpO1xuICAgIH1cblxuICAgIHRvZ2dsZUNlbnRyb2lkcygpIHtcbiAgICAgIHRoaXMub3B0aW9ucy5zaG93Q2VudHJvaWRzID0gIXRoaXMub3B0aW9ucy5zaG93Q2VudHJvaWRzO1xuICAgICAgdGhpcy5yZW5kZXIoKTtcbiAgICB9XG5cbiAgICB0b2dnbGVFZGdlcygpIHtcbiAgICAgIHRoaXMub3B0aW9ucy5zaG93RWRnZXMgPSAhdGhpcy5vcHRpb25zLnNob3dFZGdlcztcbiAgICAgIHRoaXMucmVuZGVyKCk7XG4gICAgfVxuXG4gICAgdG9nZ2xlQW5pbWF0aW9uKCkge1xuICAgICAgdGhpcy5vcHRpb25zLmFuaW1hdGUgPSAhdGhpcy5vcHRpb25zLmFuaW1hdGU7XG4gICAgICBpZiAodGhpcy5vcHRpb25zLmFuaW1hdGUpIHtcbiAgICAgICAgdGhpcy5pbml0UmVuZGVyTG9vcCgpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGxpbmVhclNjYWxlKHgwLCB4MSwgc2NhbGUpIHtcbiAgICByZXR1cm4geDAgKyAoc2NhbGUgKiAoeDEgLSB4MCkpO1xuICB9XG5cbiAgd2luZG93LlByZXR0eURlbGF1bmF5ID0gUHJldHR5RGVsYXVuYXk7XG59KSgpO1xuIiwidmFyIFJhbmRvbTtcblxuKGZ1bmN0aW9uKCkge1xuICAndXNlIHN0cmljdCc7XG4gIC8vIFJhbmRvbSBoZWxwZXIgZnVuY3Rpb25zLy8gcmFuZG9tIGhlbHBlciBmdW5jdGlvbnNcblxuICB2YXIgUG9pbnQgPSBQb2ludCB8fCByZXF1aXJlKCcuL3BvaW50Jyk7XG5cbiAgUmFuZG9tID0ge1xuICAgIC8vIGhleSBsb29rIGEgY2xvc3VyZVxuICAgIC8vIHJldHVybnMgZnVuY3Rpb24gZm9yIHJhbmRvbSBudW1iZXJzIHdpdGggcHJlLXNldCBtYXggYW5kIG1pblxuICAgIHJhbmRvbU51bWJlckZ1bmN0aW9uOiBmdW5jdGlvbihtYXgsIG1pbikge1xuICAgICAgbWluID0gbWluIHx8IDA7XG4gICAgICBpZiAobWluID4gbWF4KSB7XG4gICAgICAgIHZhciB0ZW1wID0gbWF4O1xuICAgICAgICBtYXggPSBtaW47XG4gICAgICAgIG1pbiA9IHRlbXA7XG4gICAgICB9XG4gICAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAobWF4IC0gbWluICsgMSkpICsgbWluO1xuICAgICAgfTtcbiAgICB9LFxuXG4gICAgLy8gcmV0dXJucyBhIHJhbmRvbSBudW1iZXJcbiAgICAvLyBiZXR3ZWVuIHRoZSBtYXggYW5kIG1pblxuICAgIHJhbmRvbUJldHdlZW46IGZ1bmN0aW9uKG1heCwgbWluKSB7XG4gICAgICBtaW4gPSBtaW4gfHwgMDtcbiAgICAgIHJldHVybiBSYW5kb20ucmFuZG9tTnVtYmVyRnVuY3Rpb24obWF4LCBtaW4pKCk7XG4gICAgfSxcblxuICAgIHJhbmRvbUluQ2lyY2xlOiBmdW5jdGlvbihyYWRpdXMsIG94LCBveSkge1xuICAgICAgdmFyIGFuZ2xlID0gTWF0aC5yYW5kb20oKSAqIE1hdGguUEkgKiAyO1xuICAgICAgdmFyIHJhZCA9IE1hdGguc3FydChNYXRoLnJhbmRvbSgpKSAqIHJhZGl1cztcbiAgICAgIHZhciB4ID0gb3ggKyByYWQgKiBNYXRoLmNvcyhhbmdsZSk7XG4gICAgICB2YXIgeSA9IG95ICsgcmFkICogTWF0aC5zaW4oYW5nbGUpO1xuXG4gICAgICByZXR1cm4gbmV3IFBvaW50KHgsIHkpO1xuICAgIH0sXG5cbiAgICByYW5kb21SZ2JhOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiAncmdiYSgnICsgUmFuZG9tLnJhbmRvbUJldHdlZW4oMjU1KSArICcsJyArXG4gICAgICAgICAgICAgICAgICAgICAgIFJhbmRvbS5yYW5kb21CZXR3ZWVuKDI1NSkgKyAnLCcgK1xuICAgICAgICAgICAgICAgICAgICAgICBSYW5kb20ucmFuZG9tQmV0d2VlbigyNTUpICsgJywgMSknO1xuICAgIH0sXG5cbiAgICByYW5kb21Ic2xhOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiAnaHNsYSgnICsgUmFuZG9tLnJhbmRvbUJldHdlZW4oMzYwKSArICcsJyArXG4gICAgICAgICAgICAgICAgICAgICAgIFJhbmRvbS5yYW5kb21CZXR3ZWVuKDEwMCkgKyAnJSwnICtcbiAgICAgICAgICAgICAgICAgICAgICAgUmFuZG9tLnJhbmRvbUJldHdlZW4oMTAwKSArICclLCAxKSc7XG4gICAgfSxcbiAgfTtcblxuICBpZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IFJhbmRvbTtcbiAgfVxuXG59KSgpO1xuIiwidmFyIFRyaWFuZ2xlO1xuXG4oZnVuY3Rpb24oKSB7XG4gICd1c2Ugc3RyaWN0JztcblxuICB2YXIgUG9pbnQgPSBQb2ludCB8fCByZXF1aXJlKCcuL3BvaW50Jyk7XG5cbiAgLyoqXG4gICAqIFJlcHJlc2VudHMgYSB0cmlhbmdsZVxuICAgKiBAY2xhc3NcbiAgICovXG4gIGNsYXNzIF9UcmlhbmdsZSB7XG4gICAgLyoqXG4gICAgICogVHJpYW5nbGUgY29uc2lzdHMgb2YgdGhyZWUgUG9pbnRzXG4gICAgICogQGNvbnN0cnVjdG9yXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGFcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gYlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBjXG4gICAgICovXG4gICAgY29uc3RydWN0b3IoYSwgYiwgYykge1xuICAgICAgdGhpcy5wMSA9IHRoaXMuYSA9IGE7XG4gICAgICB0aGlzLnAyID0gdGhpcy5iID0gYjtcbiAgICAgIHRoaXMucDMgPSB0aGlzLmMgPSBjO1xuXG4gICAgICB0aGlzLmNvbG9yID0gJ2JsYWNrJztcbiAgICAgIHRoaXMuc3Ryb2tlID0gJ2JsYWNrJztcbiAgICB9XG5cbiAgICAvLyBkcmF3IHRoZSB0cmlhbmdsZSB3aXRoIGRpZmZlcmluZyBlZGdlIGNvbG9ycyBvcHRpb25hbFxuICAgIHJlbmRlcihjdHgsIGNvbG9yLCBzdHJva2UpIHtcbiAgICAgIGN0eC5iZWdpblBhdGgoKTtcbiAgICAgIGN0eC5tb3ZlVG8odGhpcy5hLngsIHRoaXMuYS55KTtcbiAgICAgIGN0eC5saW5lVG8odGhpcy5iLngsIHRoaXMuYi55KTtcbiAgICAgIGN0eC5saW5lVG8odGhpcy5jLngsIHRoaXMuYy55KTtcbiAgICAgIGN0eC5jbG9zZVBhdGgoKTtcbiAgICAgIGN0eC5zdHJva2VTdHlsZSA9IHN0cm9rZSB8fCB0aGlzLnN0cm9rZSB8fCB0aGlzLmNvbG9yO1xuICAgICAgY3R4LmZpbGxTdHlsZSA9IGNvbG9yIHx8IHRoaXMuY29sb3I7XG4gICAgICBpZiAoY29sb3IgIT09IGZhbHNlICYmIHN0cm9rZSAhPT0gZmFsc2UpIHtcbiAgICAgICAgLy8gZHJhdyB0aGUgc3Ryb2tlIHVzaW5nIHRoZSBmaWxsIGNvbG9yIGZpcnN0XG4gICAgICAgIC8vIHNvIHRoYXQgdGhlIHBvaW50cyBvZiBhZGphY2VudCB0cmlhbmdsZXNcbiAgICAgICAgLy8gZG9udCBvdmVybGFwIGEgYnVuY2ggYW5kIGxvb2sgXCJzdGFycnlcIlxuICAgICAgICB2YXIgdGVtcFN0cm9rZSA9IGN0eC5zdHJva2VTdHlsZTtcbiAgICAgICAgY3R4LnN0cm9rZVN0eWxlID0gY3R4LmZpbGxTdHlsZTtcbiAgICAgICAgY3R4LnN0cm9rZSgpO1xuICAgICAgICBjdHguc3Ryb2tlU3R5bGUgPSB0ZW1wU3Ryb2tlO1xuICAgICAgfVxuICAgICAgaWYgKGNvbG9yICE9PSBmYWxzZSkge1xuICAgICAgICBjdHguZmlsbCgpO1xuICAgICAgfVxuICAgICAgaWYgKHN0cm9rZSAhPT0gZmFsc2UpIHtcbiAgICAgICAgY3R4LnN0cm9rZSgpO1xuICAgICAgfVxuICAgICAgY3R4LmNsb3NlUGF0aCgpO1xuICAgIH1cblxuICAgIC8vIHJhbmRvbSBwb2ludCBpbnNpZGUgdHJpYW5nbGVcbiAgICByYW5kb21JbnNpZGUoKSB7XG4gICAgICB2YXIgcjEgPSBNYXRoLnJhbmRvbSgpO1xuICAgICAgdmFyIHIyID0gTWF0aC5yYW5kb20oKTtcbiAgICAgIHZhciB4ID0gKDEgLSBNYXRoLnNxcnQocjEpKSAqXG4gICAgICAgICAgICAgIHRoaXMucDEueCArIChNYXRoLnNxcnQocjEpICpcbiAgICAgICAgICAgICAgKDEgLSByMikpICpcbiAgICAgICAgICAgICAgdGhpcy5wMi54ICsgKE1hdGguc3FydChyMSkgKiByMikgKlxuICAgICAgICAgICAgICB0aGlzLnAzLng7XG4gICAgICB2YXIgeSA9ICgxIC0gTWF0aC5zcXJ0KHIxKSkgKlxuICAgICAgICAgICAgICB0aGlzLnAxLnkgKyAoTWF0aC5zcXJ0KHIxKSAqXG4gICAgICAgICAgICAgICgxIC0gcjIpKSAqXG4gICAgICAgICAgICAgIHRoaXMucDIueSArIChNYXRoLnNxcnQocjEpICogcjIpICpcbiAgICAgICAgICAgICAgdGhpcy5wMy55O1xuICAgICAgcmV0dXJuIG5ldyBQb2ludCh4LCB5KTtcbiAgICB9XG5cbiAgICBjb2xvckF0Q2VudHJvaWQoaW1hZ2VEYXRhKSB7XG4gICAgICByZXR1cm4gdGhpcy5jZW50cm9pZCgpLmNhbnZhc0NvbG9yQXRQb2ludChpbWFnZURhdGEpO1xuICAgIH1cblxuICAgIHJlc2V0UG9pbnRDb2xvcnMoKSB7XG4gICAgICB0aGlzLmNlbnRyb2lkKCkucmVzZXRDb2xvcigpO1xuICAgICAgdGhpcy5wMS5yZXNldENvbG9yKCk7XG4gICAgICB0aGlzLnAyLnJlc2V0Q29sb3IoKTtcbiAgICAgIHRoaXMucDMucmVzZXRDb2xvcigpO1xuICAgIH1cblxuICAgIGNlbnRyb2lkKCkge1xuICAgICAgLy8gb25seSBjYWxjIHRoZSBjZW50cm9pZCBpZiB3ZSBkb250IGFscmVhZHkga25vdyBpdFxuICAgICAgaWYgKHRoaXMuX2NlbnRyb2lkKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9jZW50cm9pZDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciB4ID0gTWF0aC5yb3VuZCgodGhpcy5wMS54ICsgdGhpcy5wMi54ICsgdGhpcy5wMy54KSAvIDMpO1xuICAgICAgICB2YXIgeSA9IE1hdGgucm91bmQoKHRoaXMucDEueSArIHRoaXMucDIueSArIHRoaXMucDMueSkgLyAzKTtcbiAgICAgICAgdGhpcy5fY2VudHJvaWQgPSBuZXcgUG9pbnQoeCwgeSk7XG5cbiAgICAgICAgcmV0dXJuIHRoaXMuX2NlbnRyb2lkO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvMTMzMDA5MDQvZGV0ZXJtaW5lLXdoZXRoZXItcG9pbnQtbGllcy1pbnNpZGUtdHJpYW5nbGVcbiAgICBwb2ludEluVHJpYW5nbGUocG9pbnQpIHtcbiAgICAgIHZhciBhbHBoYSA9ICgodGhpcy5wMi55IC0gdGhpcy5wMy55KSAqIChwb2ludC54IC0gdGhpcy5wMy54KSArICh0aGlzLnAzLnggLSB0aGlzLnAyLngpICogKHBvaW50LnkgLSB0aGlzLnAzLnkpKSAvXG4gICAgICAgICAgICAgICAgKCh0aGlzLnAyLnkgLSB0aGlzLnAzLnkpICogKHRoaXMucDEueCAtIHRoaXMucDMueCkgKyAodGhpcy5wMy54IC0gdGhpcy5wMi54KSAqICh0aGlzLnAxLnkgLSB0aGlzLnAzLnkpKTtcbiAgICAgIHZhciBiZXRhID0gKCh0aGlzLnAzLnkgLSB0aGlzLnAxLnkpICogKHBvaW50LnggLSB0aGlzLnAzLngpICsgKHRoaXMucDEueCAtIHRoaXMucDMueCkgKiAocG9pbnQueSAtIHRoaXMucDMueSkpIC9cbiAgICAgICAgICAgICAgICgodGhpcy5wMi55IC0gdGhpcy5wMy55KSAqICh0aGlzLnAxLnggLSB0aGlzLnAzLngpICsgKHRoaXMucDMueCAtIHRoaXMucDIueCkgKiAodGhpcy5wMS55IC0gdGhpcy5wMy55KSk7XG4gICAgICB2YXIgZ2FtbWEgPSAxLjAgLSBhbHBoYSAtIGJldGE7XG5cbiAgICAgIHJldHVybiAoYWxwaGEgPiAwICYmIGJldGEgPiAwICYmIGdhbW1hID4gMCk7XG4gICAgfVxuXG4gICAgLy8gc2NhbGUgcG9pbnRzIGZyb20gW0EsIEJdIHRvIFtDLCBEXVxuICAgIC8vIHhBID0+IG9sZCB4IG1pbiwgeEIgPT4gb2xkIHggbWF4XG4gICAgLy8geUEgPT4gb2xkIHkgbWluLCB5QiA9PiBvbGQgeSBtYXhcbiAgICAvLyB4QyA9PiBuZXcgeCBtaW4sIHhEID0+IG5ldyB4IG1heFxuICAgIC8vIHlDID0+IG5ldyB5IG1pbiwgeUQgPT4gbmV3IHkgbWF4XG4gICAgcmVzY2FsZVBvaW50cyh4QSwgeEIsIHlBLCB5QiwgeEMsIHhELCB5QywgeUQpIHtcbiAgICAgIHRoaXMucDEucmVzY2FsZSh4QSwgeEIsIHlBLCB5QiwgeEMsIHhELCB5QywgeUQpO1xuICAgICAgdGhpcy5wMi5yZXNjYWxlKHhBLCB4QiwgeUEsIHlCLCB4QywgeEQsIHlDLCB5RCk7XG4gICAgICB0aGlzLnAzLnJlc2NhbGUoeEEsIHhCLCB5QSwgeUIsIHhDLCB4RCwgeUMsIHlEKTtcbiAgICAgIC8vIHJlY2FsY3VsYXRlIHRoZSBjZW50cm9pZFxuICAgICAgdGhpcy5jZW50cm9pZCgpO1xuICAgIH1cblxuICAgIG1heFgoKSB7XG4gICAgICByZXR1cm4gTWF0aC5tYXgodGhpcy5wMS54LCB0aGlzLnAyLngsIHRoaXMucDMueCk7XG4gICAgfVxuXG4gICAgbWF4WSgpIHtcbiAgICAgIHJldHVybiBNYXRoLm1heCh0aGlzLnAxLnksIHRoaXMucDIueSwgdGhpcy5wMy55KTtcbiAgICB9XG5cbiAgICBtaW5YKCkge1xuICAgICAgcmV0dXJuIE1hdGgubWluKHRoaXMucDEueCwgdGhpcy5wMi54LCB0aGlzLnAzLngpO1xuICAgIH1cblxuICAgIG1pblkoKSB7XG4gICAgICByZXR1cm4gTWF0aC5taW4odGhpcy5wMS55LCB0aGlzLnAyLnksIHRoaXMucDMueSk7XG4gICAgfVxuXG4gICAgZ2V0UG9pbnRzKCkge1xuICAgICAgcmV0dXJuIFt0aGlzLnAxLCB0aGlzLnAyLCB0aGlzLnAzXTtcbiAgICB9XG4gIH1cblxuICBpZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IF9UcmlhbmdsZTtcbiAgfVxuXG4gIFRyaWFuZ2xlID0gX1RyaWFuZ2xlO1xufSkoKTtcbiJdfQ==
