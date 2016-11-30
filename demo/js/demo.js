(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"/Users/cshaver/Personal/pretty-delaunay/node_modules/delaunay-fast/delaunay.js":[function(require,module,exports){
var Delaunay;

(function() {
  "use strict";

  var EPSILON = 1.0 / 1048576.0;

  function supertriangle(vertices) {
    var xmin = Number.POSITIVE_INFINITY,
        ymin = Number.POSITIVE_INFINITY,
        xmax = Number.NEGATIVE_INFINITY,
        ymax = Number.NEGATIVE_INFINITY,
        i, dx, dy, dmax, xmid, ymid;

    for(i = vertices.length; i--; ) {
      if(vertices[i][0] < xmin) xmin = vertices[i][0];
      if(vertices[i][0] > xmax) xmax = vertices[i][0];
      if(vertices[i][1] < ymin) ymin = vertices[i][1];
      if(vertices[i][1] > ymax) ymax = vertices[i][1];
    }

    dx = xmax - xmin;
    dy = ymax - ymin;
    dmax = Math.max(dx, dy);
    xmid = xmin + dx * 0.5;
    ymid = ymin + dy * 0.5;

    return [
      [xmid - 20 * dmax, ymid -      dmax],
      [xmid            , ymid + 20 * dmax],
      [xmid + 20 * dmax, ymid -      dmax]
    ];
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
        xc, yc, m1, m2, mx1, mx2, my1, my2, dx, dy;

    /* Check for coincident points */
    if(fabsy1y2 < EPSILON && fabsy2y3 < EPSILON)
      throw new Error("Eek! Coincident points!");

    if(fabsy1y2 < EPSILON) {
      m2  = -((x3 - x2) / (y3 - y2));
      mx2 = (x2 + x3) / 2.0;
      my2 = (y2 + y3) / 2.0;
      xc  = (x2 + x1) / 2.0;
      yc  = m2 * (xc - mx2) + my2;
    }

    else if(fabsy2y3 < EPSILON) {
      m1  = -((x2 - x1) / (y2 - y1));
      mx1 = (x1 + x2) / 2.0;
      my1 = (y1 + y2) / 2.0;
      xc  = (x3 + x2) / 2.0;
      yc  = m1 * (xc - mx1) + my1;
    }

    else {
      m1  = -((x2 - x1) / (y2 - y1));
      m2  = -((x3 - x2) / (y3 - y2));
      mx1 = (x1 + x2) / 2.0;
      mx2 = (x2 + x3) / 2.0;
      my1 = (y1 + y2) / 2.0;
      my2 = (y2 + y3) / 2.0;
      xc  = (m1 * mx1 - m2 * mx2 + my2 - my1) / (m1 - m2);
      yc  = (fabsy1y2 > fabsy2y3) ?
        m1 * (xc - mx1) + my1 :
        m2 * (xc - mx2) + my2;
    }

    dx = x2 - xc;
    dy = y2 - yc;
    return {i: i, j: j, k: k, x: xc, y: yc, r: dx * dx + dy * dy};
  }

  function dedup(edges) {
    var i, j, a, b, m, n;

    for(j = edges.length; j; ) {
      b = edges[--j];
      a = edges[--j];

      for(i = j; i; ) {
        n = edges[--i];
        m = edges[--i];

        if((a === m && b === n) || (a === n && b === m)) {
          edges.splice(j, 2);
          edges.splice(i, 2);
          break;
        }
      }
    }
  }

  Delaunay = {
    triangulate: function(vertices, key) {
      var n = vertices.length,
          i, j, indices, st, open, closed, edges, dx, dy, a, b, c;

      /* Bail if there aren't enough vertices to form any triangles. */
      if(n < 3)
        return [];

      /* Slice out the actual vertices from the passed objects. (Duplicate the
       * array even if we don't, though, since we need to make a supertriangle
       * later on!) */
      vertices = vertices.slice(0);

      if(key)
        for(i = n; i--; )
          vertices[i] = vertices[i][key];

      /* Make an array of indices into the vertex array, sorted by the
       * vertices' x-position. */
      indices = new Array(n);

      for(i = n; i--; )
        indices[i] = i;

      indices.sort(function(i, j) {
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
      open   = [circumcircle(vertices, n + 0, n + 1, n + 2)];
      closed = [];
      edges  = [];

      /* Incrementally add each vertex to the mesh. */
      for(i = indices.length; i--; edges.length = 0) {
        c = indices[i];

        /* For each open triangle, check to see if the current point is
         * inside it's circumcircle. If it is, remove the triangle and add
         * it's edges to an edge list. */
        for(j = open.length; j--; ) {
          /* If this point is to the right of this triangle's circumcircle,
           * then this triangle should never get checked again. Remove it
           * from the open list, add it to the closed list, and skip. */
          dx = vertices[c][0] - open[j].x;
          if(dx > 0.0 && dx * dx > open[j].r) {
            closed.push(open[j]);
            open.splice(j, 1);
            continue;
          }

          /* If we're outside the circumcircle, skip this triangle. */
          dy = vertices[c][1] - open[j].y;
          if(dx * dx + dy * dy - open[j].r > EPSILON)
            continue;

          /* Remove the triangle and add it's edges to the edge list. */
          edges.push(
            open[j].i, open[j].j,
            open[j].j, open[j].k,
            open[j].k, open[j].i
          );
          open.splice(j, 1);
        }

        /* Remove any doubled edges. */
        dedup(edges);

        /* Add a new triangle for each edge. */
        for(j = edges.length; j; ) {
          b = edges[--j];
          a = edges[--j];
          open.push(circumcircle(vertices, a, b, c));
        }
      }

      /* Copy any remaining open triangles to the closed list, and then
       * remove any triangles that share a vertex with the supertriangle,
       * building a list of triplets that represent triangles. */
      for(i = open.length; i--; )
        closed.push(open[i]);
      open.length = 0;

      for(i = closed.length; i--; )
        if(closed[i].i < n && closed[i].j < n && closed[i].k < n)
          open.push(closed[i].i, closed[i].j, closed[i].k);

      /* Yay, we're done! */
      return open;
    },
    contains: function(tri, p) {
      /* Bounding box test first, for quick rejections. */
      if((p[0] < tri[0][0] && p[0] < tri[1][0] && p[0] < tri[2][0]) ||
         (p[0] > tri[0][0] && p[0] > tri[1][0] && p[0] > tri[2][0]) ||
         (p[1] < tri[0][1] && p[1] < tri[1][1] && p[1] < tri[2][1]) ||
         (p[1] > tri[0][1] && p[1] > tri[1][1] && p[1] > tri[2][1]))
        return null;

      var a = tri[1][0] - tri[0][0],
          b = tri[2][0] - tri[0][0],
          c = tri[1][1] - tri[0][1],
          d = tri[2][1] - tri[0][1],
          i = a * d - b * c;

      /* Degenerate tri. */
      if(i === 0.0)
        return null;

      var u = (d * (p[0] - tri[0][0]) - b * (p[1] - tri[0][1])) / i,
          v = (a * (p[1] - tri[0][1]) - c * (p[0] - tri[0][0])) / i;

      /* If we're outside the tri, fail. */
      if(u < 0.0 || v < 0.0 || (u + v) > 1.0)
        return null;

      return [u, v];
    }
  };

  if(typeof module !== "undefined")
    module.exports = Delaunay;
})();

},{}],"/Users/cshaver/Personal/pretty-delaunay/src/PrettyDelaunay.js":[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * TODO:
 *  - Rework Class to prototype
 *  - improve rendering speed
 *  - smooth out appearance of fading in gradients during animation
 *  - document usage
 */

(function () {
  'use strict';

  var Delaunay = require('delaunay-fast');
  var Color = require('./PrettyDelaunay/color');
  var Random = require('./PrettyDelaunay/random');
  var Triangle = require('./PrettyDelaunay/triangle');
  var Point = require('./PrettyDelaunay/point');
  var PointMap = require('./PrettyDelaunay/pointMap');

  require('./PrettyDelaunay/polyfills')();

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

      // throttled window resize
      this.resizing = false;
      window.addEventListener('resize', function () {
        if (_this.resizing) {
          return;
        }
        _this.resizing = true;
        requestAnimationFrame(function () {
          _this.rescale();
          _this.resizing = false;
        });
      });

      this.randomize();
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
      value: function randomize(min, max, minEdge, maxEdge, minGradients, maxGradients, multiplier, colors, imageURL) {
        // colors param is optional
        this.colors = colors ? colors : this.options.colorPalette ? this.options.colorPalette[Random.randomBetween(0, this.options.colorPalette.length - 1)] : this.colors;

        this.options.imageURL = imageURL ? imageURL : this.options.imageURL;
        this.options.imageAsBackground = !!this.options.imageURL;

        this.minGradients = minGradients;
        this.maxGradients = maxGradients;

        this.resizeCanvas();

        this.generateNewPoints(min, max, minEdge, maxEdge, multiplier);

        this.triangulate();

        if (!this.options.imageAsBackground) {
          this.generateGradients(minGradients, maxGradients);

          // prep for animation
          this.nextGradients = this.radialGradients.slice(0);
          this.generateGradients();
          this.currentGradients = this.radialGradients.slice(0);
        }

        this.render();

        if (this.options.animate && !this.looping) {
          this.initRenderLoop();
        }
      }
    }, {
      key: 'initRenderLoop',
      value: function initRenderLoop() {
        if (this.options.imageAsBackground) {
          return;
        }

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
        this.renderBackground(this.renderForeground.bind(this));
      }
    }, {
      key: 'renderBackground',
      value: function renderBackground(callback) {
        // render the base to get triangle colors
        if (this.options.imageAsBackground) {
          this.renderImageBackground(callback);
        } else {
          this.renderGradient();
          callback();
        }
      }
    }, {
      key: 'renderForeground',
      value: function renderForeground() {
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

        if (this.options.showCircles && !this.options.imageAsBackground) {
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
      key: 'renderImageBackground',
      value: function renderImageBackground(callback) {
        this.loadImageBackground(function () {
          // scale image to fit width/height of canvas
          var heightMultiplier = this.canvas.height / this.image.height;
          var widthMultiplier = this.canvas.width / this.image.width;

          var multiplier = Math.max(heightMultiplier, widthMultiplier);

          this.ctx.drawImage(this.image, 0, 0, this.image.width * multiplier, this.image.height * multiplier);

          callback();
        }.bind(this));
      }
    }, {
      key: 'loadImageBackground',
      value: function loadImageBackground(callback) {
        if (this.image && this.image.src === this.options.imageURL) {
          callback();
        } else {
          this.image = new Image();
          this.image.crossOrigin = 'Anonymous';
          this.image.src = this.options.imageURL;

          this.image.onload = callback;
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
    }, {
      key: 'getColors',
      value: function getColors() {
        return this.colors;
      }
    }], [{
      key: 'defaults',
      value: function defaults() {
        return {
          // shows triangles - false will show the gradient behind
          showTriangles: true,
          // show the points that make the triangulation
          showPoints: false,
          // show the circles that define the gradient locations, sizes
          showCircles: false,
          // show triangle centroids
          showCentroids: false,
          // show triangle edges
          showEdges: true,
          // highlight hovered triangles
          hover: true,
          // multiplier for the number of points generated based on canvas size
          multiplier: 0.5,
          // whether to animate the gradients behind the triangles
          animate: false,
          // number of frames per gradient color cycle
          loopFrames: 250,

          // colors to use in the gradient
          colors: ['hsla(0, 0%, 100%, 1)', 'hsla(0, 0%, 50%, 1)', 'hsla(0, 0%, 0%, 1)'],

          // randomly choose from color palette on randomize if not supplied colors
          colorPalette: false,

          // use image as background instead of gradient
          imageAsBackground: false,

          // image to use as background
          imageURL: '',

          // how to resize the points
          resizeMode: 'scalePoints',
          // 'newPoints' - generates a new set of points for the new size
          // 'scalePoints' - linearly scales existing points and re-triangulates

          // events triggered when the center of the background
          // is greater or less than 50 lightness in hsla
          // intended to adjust some text that is on top
          // color is the color of the center of the canvas
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

          // returns hsla color for triangle point
          // as a function of the triangle fill color
          pointColor: function pointColor(color) {
            color = Color.hslaAdjustLightness(color, function (lightness) {
              return (lightness + 200 - lightness * 2) / 3;
            });
            color = Color.hslaAdjustAlpha(color, 1);
            return color;
          },

          // returns hsla color for triangle centroid
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

  module.exports = PrettyDelaunay;
})();

},{"./PrettyDelaunay/color":"/Users/cshaver/Personal/pretty-delaunay/src/PrettyDelaunay/color.js","./PrettyDelaunay/point":"/Users/cshaver/Personal/pretty-delaunay/src/PrettyDelaunay/point.js","./PrettyDelaunay/pointMap":"/Users/cshaver/Personal/pretty-delaunay/src/PrettyDelaunay/pointMap.js","./PrettyDelaunay/polyfills":"/Users/cshaver/Personal/pretty-delaunay/src/PrettyDelaunay/polyfills.js","./PrettyDelaunay/random":"/Users/cshaver/Personal/pretty-delaunay/src/PrettyDelaunay/random.js","./PrettyDelaunay/triangle":"/Users/cshaver/Personal/pretty-delaunay/src/PrettyDelaunay/triangle.js","delaunay-fast":"/Users/cshaver/Personal/pretty-delaunay/node_modules/delaunay-fast/delaunay.js"}],"/Users/cshaver/Personal/pretty-delaunay/src/PrettyDelaunay/color.js":[function(require,module,exports){
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

},{}],"/Users/cshaver/Personal/pretty-delaunay/src/PrettyDelaunay/point.js":[function(require,module,exports){
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

},{"./color":"/Users/cshaver/Personal/pretty-delaunay/src/PrettyDelaunay/color.js"}],"/Users/cshaver/Personal/pretty-delaunay/src/PrettyDelaunay/pointMap.js":[function(require,module,exports){
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

},{"./point":"/Users/cshaver/Personal/pretty-delaunay/src/PrettyDelaunay/point.js"}],"/Users/cshaver/Personal/pretty-delaunay/src/PrettyDelaunay/polyfills.js":[function(require,module,exports){
'use strict';

(function () {
  'use strict';

  function polyfills() {
    // polyfill for Object.assign
    if (typeof Object.assign !== 'function') {
      Object.assign = function (target) {
        if (target === undefined || target === null) {
          throw new TypeError('Cannot convert undefined or null to object');
        }

        var output = Object(target);
        for (var index = 1; index < arguments.length; index++) {
          var source = arguments[index];
          if (source !== undefined && source !== null) {
            for (var nextKey in source) {
              if (source.hasOwnProperty(nextKey)) {
                output[nextKey] = source[nextKey];
              }
            }
          }
        }
        return output;
      };
    }
  }

  module.exports = polyfills;
})();

},{}],"/Users/cshaver/Personal/pretty-delaunay/src/PrettyDelaunay/random.js":[function(require,module,exports){
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

},{"./point":"/Users/cshaver/Personal/pretty-delaunay/src/PrettyDelaunay/point.js"}],"/Users/cshaver/Personal/pretty-delaunay/src/PrettyDelaunay/triangle.js":[function(require,module,exports){
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

},{"./point":"/Users/cshaver/Personal/pretty-delaunay/src/PrettyDelaunay/point.js"}],"/Users/cshaver/Personal/pretty-delaunay/src/demo.js":[function(require,module,exports){
'use strict';

(function () {
  'use strict';

  var PrettyDelaunay = require('./PrettyDelaunay');
  var Color = require('./PrettyDelaunay/color');
  var Random = require('./PrettyDelaunay/random');

  var Cookies = {
    getItem: function getItem(sKey) {
      if (!sKey) {
        return null;
      }
      return decodeURIComponent(document.cookie.replace(new RegExp('(?:(?:^|.*;)\\s*' + encodeURIComponent(sKey).replace(/[\-\.\+\*]/g, '\\$&') + '\\s*\\=\\s*([^;]*).*$)|^.*$'), '$1')) || null;
    },

    setItem: function setItem(sKey, sValue, vEnd, sPath, sDomain, bSecure) {
      if (!sKey || /^(?:expires|max\-age|path|domain|secure)$/i.test(sKey)) {
        return false;
      }
      var sExpires = '';
      if (vEnd) {
        switch (vEnd.constructor) {
          case Number:
            sExpires = vEnd === Infinity ? '; expires=Fri, 31 Dec 9999 23:59:59 GMT' : '; max-age=' + vEnd;
            break;
          case String:
            sExpires = '; expires=' + vEnd;
            break;
          case Date:
            sExpires = '; expires=' + vEnd.toUTCString();
            break;
        }
      }
      document.cookie = encodeURIComponent(sKey) + '=' + encodeURIComponent(sValue) + sExpires + (sDomain ? '; domain=' + sDomain : '') + (sPath ? '; path=' + sPath : '') + (bSecure ? '; secure' : '');
      return true;
    },

    removeItem: function removeItem(sKey, sPath, sDomain) {
      if (!this.hasItem(sKey)) {
        return false;
      }
      document.cookie = encodeURIComponent(sKey) + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT' + (sDomain ? '; domain=' + sDomain : '') + (sPath ? '; path=' + sPath : '');
      return true;
    },

    hasItem: function hasItem(sKey) {
      if (!sKey) {
        return false;
      }
      return new RegExp('(?:^|;\\s*)' + encodeURIComponent(sKey).replace(/[\-\.\+\*]/g, '\\$&') + '\\s*\\=').test(document.cookie);
    },

    keys: function keys() {
      var aKeys = document.cookie.replace(/((?:^|\s*;)[^\=]+)(?=;|$)|^\s*|\s*(?:\=[^;]*)?(?:\1|$)/g, '').split(/\s*(?:\=[^;]*)?;\s*/);
      for (var nLen = aKeys.length, nIdx = 0; nIdx < nLen; nIdx++) {
        aKeys[nIdx] = decodeURIComponent(aKeys[nIdx]);
      }
      return aKeys;
    }
  };

  // set up variables for canvas, inputs, etc
  var canvas = document.getElementById('canvas');

  var button = document.getElementById('button');

  var generateColorsButton = document.getElementById('generateColors');
  var generateGradientButton = document.getElementById('generateGradient');
  var generateTrianglesButton = document.getElementById('generateTriangles');

  var toggleTrianglesButton = document.getElementById('toggleTriangles');
  var togglePointsButton = document.getElementById('togglePoints');
  var toggleCirclesButton = document.getElementById('toggleCircles');
  var toggleCentroidsButton = document.getElementById('toggleCentroids');
  var toggleEdgesButton = document.getElementById('toggleEdges');
  var toggleAnimationButton = document.getElementById('toggleAnimation');

  var form = document.getElementById('form');
  var multiplierRadio = document.getElementById('pointGen1');
  var multiplierInput = document.getElementById('pointsMultiplier');
  var maxInput = document.getElementById('maxPoints');
  var minInput = document.getElementById('minPoints');
  var maxEdgeInput = document.getElementById('maxEdgePoints');
  var minEdgeInput = document.getElementById('minEdgePoints');
  var maxGradientInput = document.getElementById('maxGradients');
  var minGradientInput = document.getElementById('minGradients');

  var imageBackgroundUpload = document.getElementById('imageBackgroundUpload');
  var imageBackgroundInput = document.getElementById('imageBackgroundInput');

  var minPoints = undefined,
      maxPoints = undefined,
      minEdgePoints = undefined,
      maxEdgePoints = undefined,
      minGradients = undefined,
      maxGradients = undefined,
      multiplier = undefined,
      colors = undefined,
      image = undefined;

  var showTriangles = undefined,
      showPoints = undefined,
      showCircles = undefined,
      showCentroids = undefined,
      showEdges = undefined,
      showAnimation = undefined;

  var options = {
    onDarkBackground: function onDarkBackground() {
      form.className = 'form light';
    },
    onLightBackground: function onLightBackground() {
      form.className = 'form dark';
    }
  };

  getCookies();

  // initialize the PrettyDelaunay object
  var prettyDelaunay = new PrettyDelaunay(canvas, options);

  // initial generation
  runDelaunay();

  /**
   * util functions
   */

  // get options and re-randomize
  function runDelaunay() {
    getRandomizeOptions();
    prettyDelaunay.randomize(minPoints, maxPoints, minEdgePoints, maxEdgePoints, minGradients, maxGradients, multiplier, colors, image);
  }

  function getColors() {
    var colors = [];

    if (document.getElementById('colorType1').checked) {
      // generate random colors
      for (var i = 0; i < 3; i++) {
        var color = Random.randomHsla();
        colors.push(color);
      }
    } else {
      // use the ones in the inputs
      colors.push(Color.rgbToHsla(Color.hexToRgbaArray(document.getElementById('color1').value)));
      colors.push(Color.rgbToHsla(Color.hexToRgbaArray(document.getElementById('color2').value)));
      colors.push(Color.rgbToHsla(Color.hexToRgbaArray(document.getElementById('color3').value)));
    }

    return colors;
  }

  function getImage() {
    if (!document.getElementById('colorType3').checked) {
      return '';
    }

    if (document.getElementById('imageBackground1').checked && imageBackgroundUpload.files.length) {
      var file = imageBackgroundUpload.files[0];
      return window.URL.createObjectURL(file);
    } else if (document.getElementById('imageBackground2').checked) {
      return imageBackgroundInput.value;
    } else {
      return '';
    }
  }

  // get options from cookies
  function getCookies() {
    var defaults = PrettyDelaunay.defaults();

    showTriangles = Cookies.getItem('DelaunayShowTriangles');
    showPoints = Cookies.getItem('DelaunayShowPoints');
    showCircles = Cookies.getItem('DelaunayShowCircles');
    showCentroids = Cookies.getItem('DelaunayShowCentroids');
    showEdges = Cookies.getItem('DelaunayShowEdges');
    showAnimation = Cookies.getItem('DelaunayShowAnimation');

    // TODO: DRY
    // only set option from cookie if it exists, parse to boolean
    if (showTriangles) {
      options.showTriangles = showTriangles = showTriangles === 'true' ? true : false;
    } else {
      // save option state for setting cookie later
      showTriangles = defaults.showTriangles;
    }

    if (showPoints) {
      options.showPoints = showPoints = showPoints === 'true' ? true : false;
    } else {
      showPoints = defaults.showPoints;
    }

    if (showCircles) {
      options.showCircles = showCircles = showCircles === 'true' ? true : false;
    } else {
      showCircles = defaults.showCircles;
    }

    if (showCentroids) {
      options.showCentroids = showCentroids = showCentroids === 'true' ? true : false;
    } else {
      showCentroids = defaults.showCentroids;
    }

    if (showEdges) {
      options.showEdges = showEdges = showEdges === 'true' ? true : false;
    } else {
      showEdges = defaults.showEdges;
    }

    if (showAnimation) {
      options.showAnimation = showAnimation = showAnimation === 'true' ? true : false;
    } else {
      showAnimation = defaults.showAnimation;
    }
  }

  // get options from input fields
  function getRandomizeOptions() {
    var useMultiplier = multiplierRadio.checked;
    multiplier = parseFloat(multiplierInput.value);
    minPoints = useMultiplier ? 0 : parseInt(minInput.value);
    maxPoints = useMultiplier ? 0 : parseInt(maxInput.value);
    minEdgePoints = useMultiplier ? 0 : parseInt(minEdgeInput.value);
    maxEdgePoints = useMultiplier ? 0 : parseInt(maxEdgeInput.value);
    minGradients = parseInt(minGradientInput.value);
    maxGradients = parseInt(maxGradientInput.value);
    colors = getColors();
    image = getImage();
  }

  /**
   * set up events
   */

  // click the button to regen
  button.addEventListener('click', function () {
    runDelaunay();
  });

  // click the button to regen colors only
  generateColorsButton.addEventListener('click', function () {
    var newColors = getColors();
    prettyDelaunay.renderNewColors(newColors);
  });

  // click the button to regen colors only
  generateGradientButton.addEventListener('click', function () {
    getRandomizeOptions();
    prettyDelaunay.renderNewGradient(minGradients, maxGradients);
  });

  // click the button to regen colors only
  generateTrianglesButton.addEventListener('click', function () {
    getRandomizeOptions();
    prettyDelaunay.renderNewTriangles(minPoints, maxPoints, minEdgePoints, maxEdgePoints, multiplier);
  });

  // turn Triangles off/on
  toggleTrianglesButton.addEventListener('click', function () {
    showTriangles = !showTriangles;
    Cookies.setItem('DelaunayShowTriangles', showTriangles);
    prettyDelaunay.toggleTriangles();
  });

  // turn Points off/on
  togglePointsButton.addEventListener('click', function () {
    showPoints = !showPoints;
    Cookies.setItem('DelaunayShowPoints', showPoints);
    prettyDelaunay.togglePoints();
  });

  // turn Circles off/on
  toggleCirclesButton.addEventListener('click', function () {
    showCircles = !showCircles;
    Cookies.setItem('DelaunayShowCircles', showCircles);
    prettyDelaunay.toggleCircles();
  });

  // turn Centroids off/on
  toggleCentroidsButton.addEventListener('click', function () {
    showCentroids = !showCentroids;
    Cookies.setItem('DelaunayShowCentroids', showCentroids);
    prettyDelaunay.toggleCentroids();
  });

  // turn Edges off/on
  toggleEdgesButton.addEventListener('click', function () {
    showEdges = !showEdges;
    Cookies.setItem('DelaunayShowEdges', showEdges);
    prettyDelaunay.toggleEdges();
  });

  // turn Animation off/on
  toggleAnimationButton.addEventListener('click', function () {
    showAnimation = !showAnimation;
    Cookies.setItem('DelaunayShowAnimation', showAnimation);
    prettyDelaunay.toggleAnimation();
  });

  // dont do anything on form submit
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    return false;
  });
})();

},{"./PrettyDelaunay":"/Users/cshaver/Personal/pretty-delaunay/src/PrettyDelaunay.js","./PrettyDelaunay/color":"/Users/cshaver/Personal/pretty-delaunay/src/PrettyDelaunay/color.js","./PrettyDelaunay/random":"/Users/cshaver/Personal/pretty-delaunay/src/PrettyDelaunay/random.js"}]},{},["/Users/cshaver/Personal/pretty-delaunay/src/demo.js"])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvZGVsYXVuYXktZmFzdC9kZWxhdW5heS5qcyIsInNyYy9QcmV0dHlEZWxhdW5heS5qcyIsInNyYy9QcmV0dHlEZWxhdW5heS9jb2xvci5qcyIsInNyYy9QcmV0dHlEZWxhdW5heS9wb2ludC5qcyIsInNyYy9QcmV0dHlEZWxhdW5heS9wb2ludE1hcC5qcyIsInNyYy9QcmV0dHlEZWxhdW5heS9wb2x5ZmlsbHMuanMiLCJzcmMvUHJldHR5RGVsYXVuYXkvcmFuZG9tLmpzIiwic3JjL1ByZXR0eURlbGF1bmF5L3RyaWFuZ2xlLmpzIiwic3JjL2RlbW8uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FB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SSxlQUFlLEdBQUcsRUFBRTs7O0FBQUMsQUFHekIsZ0JBQUksS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQzs7QUFFekMsMkJBQWUsQ0FBQyxFQUFFLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsZUFBZSxDQUFDLEVBQUUsRUFBRSxZQUFZLENBQUMsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7QUFDekYsMkJBQWUsQ0FBQyxFQUFFLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsZUFBZSxDQUFDLEVBQUUsRUFBRSxZQUFZLENBQUMsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7QUFDekYsMkJBQWUsQ0FBQyxFQUFFLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsZUFBZSxDQUFDLEVBQUUsRUFBRSxZQUFZLENBQUMsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7QUFDekYsMkJBQWUsQ0FBQyxFQUFFLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsZUFBZSxDQUFDLEVBQUUsRUFBRSxZQUFZLENBQUMsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7QUFDekYsMkJBQWUsQ0FBQyxFQUFFLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsZUFBZSxDQUFDLEVBQUUsRUFBRSxZQUFZLENBQUMsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7QUFDekYsMkJBQWUsQ0FBQyxFQUFFLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsZUFBZSxDQUFDLEVBQUUsRUFBRSxZQUFZLENBQUMsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7QUFDekYsMkJBQWUsQ0FBQyxTQUFTLEdBQUcsV0FBVyxDQUFDLGVBQWUsQ0FBQyxTQUFTLEVBQUUsWUFBWSxDQUFDLFNBQVMsRUFBRSxLQUFLLENBQUMsQ0FBQzs7QUFFbEcsZ0JBQUksQ0FBQyxl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R0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUEsR0FBSSxDQUFDLENBQUMsQ0FBQztBQUM1RCxjQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUEsR0FBSSxDQUFDLENBQUMsQ0FBQztBQUM1RCxjQUFJLENBQUMsU0FBUyxHQUFHLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQzs7QUFFakMsaUJBQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQztTQUN2QjtPQUNGOzs7Ozs7c0NBR2UsS0FBSyxFQUFFO0FBQ3JCLFlBQUksS0FBSyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQSxJQUFLLEtBQUssQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUEsQUFBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUEsSUFBSyxLQUFLLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBLEFBQUMsQ0FBQSxJQUNuRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBLElBQUssSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUEsQUFBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUEsSUFBSyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQSxBQUFDLENBQUEsQUFBQyxDQUFDO0FBQ2xILFlBQUksSUFBSSxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQSxJQUFLLEtBQUssQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUEsQUFBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUEsSUFBSyxLQUFLLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBLEFBQUMsQ0FBQSxJQUNuRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBLElBQUssSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUEsQUFBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUEsSUFBSyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQSxBQUFDLENBQUEsQUFBQyxDQUFDO0FBQ2pILFlBQUksS0FBSyxHQUFHLEdBQUcsR0FBRyxLQUFLLEdBQUcsSUFBSSxDQUFDOztBQUUvQixlQUFRLEtBQUssR0FBRyxDQUFDLElBQUksSUFBSSxHQUFHLENBQUMsSUFBSSxLQUFLLEdBQUcsQ0FBQyxDQUFFO09BQzdDOzs7Ozs7Ozs7O29DQU9hLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUs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T0FBTyxDQUFDLHVCQUF1QixFQUFFLGFBQWEsQ0FBQyxDQUFDO0FBQ3hELGtCQUFjLENBQUMsZUFBZSxFQUFFLENBQUM7R0FDbEMsQ0FBQzs7O0FBQUMsQUFHSCxNQUFJLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxFQUFFLFVBQVMsQ0FBQyxFQUFFO0FBQzFDLEtBQUMsQ0FBQyxjQUFjLEVBQUUsQ0FBQztBQUNuQixXQUFPLEtBQUssQ0FBQztHQUNkLENBQUMsQ0FBQztDQUNKLENBQUEsRUFBRyxDQUFDIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBEZWxhdW5heTtcblxuKGZ1bmN0aW9uKCkge1xuICBcInVzZSBzdHJpY3RcIjtcblxuICB2YXIgRVBTSUxPTiA9IDEuMCAvIDEwNDg1NzYuMDtcblxuICBmdW5jdGlvbiBzdXBlcnRyaWFuZ2xlKHZlcnRpY2VzKSB7XG4gICAgdmFyIHhtaW4gPSBOdW1iZXIuUE9TSVRJVkVfSU5GSU5JVFksXG4gICAgICAgIHltaW4gPSBOdW1iZXIuUE9TSVRJVkVfSU5GSU5JVFksXG4gICAgICAgIHhtYXggPSBOdW1iZXIuTkVHQVRJVkVfSU5GSU5JVFksXG4gICAgICAgIHltYXggPSBOdW1iZXIuTkVHQVRJVkVfSU5GSU5JVFksXG4gICAgICAgIGksIGR4LCBkeSwgZG1heCwgeG1pZCwgeW1pZDtcblxuICAgIGZvcihpID0gdmVydGljZXMubGVuZ3RoOyBpLS07ICkge1xuICAgICAgaWYodmVydGljZXNbaV1bMF0gPCB4bWluKSB4bWluID0gdmVydGljZXNbaV1bMF07XG4gICAgICBpZih2ZXJ0aWNlc1tpXVswXSA+IHhtYXgpIHhtYXggPSB2ZXJ0aWNlc1tpXVswXTtcbiAgICAgIGlmKHZlcnRpY2VzW2ldWzFdIDwgeW1pbikgeW1pbiA9IHZlcnRpY2VzW2ldWzFdO1xuICAgICAgaWYodmVydGljZXNbaV1bMV0gPiB5bWF4KSB5bWF4ID0gdmVydGljZXNbaV1bMV07XG4gICAgfVxuXG4gICAgZHggPSB4bWF4IC0geG1pbjtcbiAgICBkeSA9IHltYXggLSB5bWluO1xuICAgIGRtYXggPSBNYXRoLm1heChkeCwgZHkpO1xuICAgIHhtaWQgPSB4bWluICsgZHggKiAwLjU7XG4gICAgeW1pZCA9IHltaW4gKyBkeSAqIDAuNTtcblxuICAgIHJldHVybiBbXG4gICAgICBbeG1pZCAtIDIwICogZG1heCwgeW1pZCAtICAgICAgZG1heF0sXG4gICAgICBbeG1pZCAgICAgICAgICAgICwgeW1pZCArIDIwICogZG1heF0sXG4gICAgICBbeG1pZCArIDIwICogZG1heCwgeW1pZCAtICAgICAgZG1heF1cbiAgICBdO1xuICB9XG5cbiAgZnVuY3Rpb24gY2lyY3VtY2lyY2xlKHZlcnRpY2VzLCBpLCBqLCBrKSB7XG4gICAgdmFyIHgxID0gdmVydGljZXNbaV1bMF0sXG4gICAgICAgIHkxID0gdmVydGljZXNbaV1bMV0sXG4gICAgICAgIHgyID0gdmVydGljZXNbal1bMF0sXG4gICAgICAgIHkyID0gdmVydGljZXNbal1bMV0sXG4gICAgICAgIHgzID0gdmVydGljZXNba11bMF0sXG4gICAgICAgIHkzID0gdmVydGljZXNba11bMV0sXG4gICAgICAgIGZhYnN5MXkyID0gTWF0aC5hYnMoeTEgLSB5MiksXG4gICAgICAgIGZhYnN5MnkzID0gTWF0aC5hYnMoeTIgLSB5MyksXG4gICAgICAgIHhjLCB5YywgbTEsIG0yLCBteDEsIG14MiwgbXkxLCBteTIsIGR4LCBkeTtcblxuICAgIC8qIENoZWNrIGZvciBjb2luY2lkZW50IHBvaW50cyAqL1xuICAgIGlmKGZhYnN5MXkyIDwgRVBTSUxPTiAmJiBmYWJzeTJ5MyA8IEVQU0lMT04pXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJFZWshIENvaW5jaWRlbnQgcG9pbnRzIVwiKTtcblxuICAgIGlmKGZhYnN5MXkyIDwgRVBTSUxPTikge1xuICAgICAgbTIgID0gLSgoeDMgLSB4MikgLyAoeTMgLSB5MikpO1xuICAgICAgbXgyID0gKHgyICsgeDMpIC8gMi4wO1xuICAgICAgbXkyID0gKHkyICsgeTMpIC8gMi4wO1xuICAgICAgeGMgID0gKHgyICsgeDEpIC8gMi4wO1xuICAgICAgeWMgID0gbTIgKiAoeGMgLSBteDIpICsgbXkyO1xuICAgIH1cblxuICAgIGVsc2UgaWYoZmFic3kyeTMgPCBFUFNJTE9OKSB7XG4gICAgICBtMSAgPSAtKCh4MiAtIHgxKSAvICh5MiAtIHkxKSk7XG4gICAgICBteDEgPSAoeDEgKyB4MikgLyAyLjA7XG4gICAgICBteTEgPSAoeTEgKyB5MikgLyAyLjA7XG4gICAgICB4YyAgPSAoeDMgKyB4MikgLyAyLjA7XG4gICAgICB5YyAgPSBtMSAqICh4YyAtIG14MSkgKyBteTE7XG4gICAgfVxuXG4gICAgZWxzZSB7XG4gICAgICBtMSAgPSAtKCh4MiAtIHgxKSAvICh5MiAtIHkxKSk7XG4gICAgICBtMiAgPSAtKCh4MyAtIHgyKSAvICh5MyAtIHkyKSk7XG4gICAgICBteDEgPSAoeDEgKyB4MikgLyAyLjA7XG4gICAgICBteDIgPSAoeDIgKyB4MykgLyAyLjA7XG4gICAgICBteTEgPSAoeTEgKyB5MikgLyAyLjA7XG4gICAgICBteTIgPSAoeTIgKyB5MykgLyAyLjA7XG4gICAgICB4YyAgPSAobTEgKiBteDEgLSBtMiAqIG14MiArIG15MiAtIG15MSkgLyAobTEgLSBtMik7XG4gICAgICB5YyAgPSAoZmFic3kxeTIgPiBmYWJzeTJ5MykgP1xuICAgICAgICBtMSAqICh4YyAtIG14MSkgKyBteTEgOlxuICAgICAgICBtMiAqICh4YyAtIG14MikgKyBteTI7XG4gICAgfVxuXG4gICAgZHggPSB4MiAtIHhjO1xuICAgIGR5ID0geTIgLSB5YztcbiAgICByZXR1cm4ge2k6IGksIGo6IGosIGs6IGssIHg6IHhjLCB5OiB5YywgcjogZHggKiBkeCArIGR5ICogZHl9O1xuICB9XG5cbiAgZnVuY3Rpb24gZGVkdXAoZWRnZXMpIHtcbiAgICB2YXIgaSwgaiwgYSwgYiwgbSwgbjtcblxuICAgIGZvcihqID0gZWRnZXMubGVuZ3RoOyBqOyApIHtcbiAgICAgIGIgPSBlZGdlc1stLWpdO1xuICAgICAgYSA9IGVkZ2VzWy0tal07XG5cbiAgICAgIGZvcihpID0gajsgaTsgKSB7XG4gICAgICAgIG4gPSBlZGdlc1stLWldO1xuICAgICAgICBtID0gZWRnZXNbLS1pXTtcblxuICAgICAgICBpZigoYSA9PT0gbSAmJiBiID09PSBuKSB8fCAoYSA9PT0gbiAmJiBiID09PSBtKSkge1xuICAgICAgICAgIGVkZ2VzLnNwbGljZShqLCAyKTtcbiAgICAgICAgICBlZGdlcy5zcGxpY2UoaSwgMik7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBEZWxhdW5heSA9IHtcbiAgICB0cmlhbmd1bGF0ZTogZnVuY3Rpb24odmVydGljZXMsIGtleSkge1xuICAgICAgdmFyIG4gPSB2ZXJ0aWNlcy5sZW5ndGgsXG4gICAgICAgICAgaSwgaiwgaW5kaWNlcywgc3QsIG9wZW4sIGNsb3NlZCwgZWRnZXMsIGR4LCBkeSwgYSwgYiwgYztcblxuICAgICAgLyogQmFpbCBpZiB0aGVyZSBhcmVuJ3QgZW5vdWdoIHZlcnRpY2VzIHRvIGZvcm0gYW55IHRyaWFuZ2xlcy4gKi9cbiAgICAgIGlmKG4gPCAzKVxuICAgICAgICByZXR1cm4gW107XG5cbiAgICAgIC8qIFNsaWNlIG91dCB0aGUgYWN0dWFsIHZlcnRpY2VzIGZyb20gdGhlIHBhc3NlZCBvYmplY3RzLiAoRHVwbGljYXRlIHRoZVxuICAgICAgICogYXJyYXkgZXZlbiBpZiB3ZSBkb24ndCwgdGhvdWdoLCBzaW5jZSB3ZSBuZWVkIHRvIG1ha2UgYSBzdXBlcnRyaWFuZ2xlXG4gICAgICAgKiBsYXRlciBvbiEpICovXG4gICAgICB2ZXJ0aWNlcyA9IHZlcnRpY2VzLnNsaWNlKDApO1xuXG4gICAgICBpZihrZXkpXG4gICAgICAgIGZvcihpID0gbjsgaS0tOyApXG4gICAgICAgICAgdmVydGljZXNbaV0gPSB2ZXJ0aWNlc1tpXVtrZXldO1xuXG4gICAgICAvKiBNYWtlIGFuIGFycmF5IG9mIGluZGljZXMgaW50byB0aGUgdmVydGV4IGFycmF5LCBzb3J0ZWQgYnkgdGhlXG4gICAgICAgKiB2ZXJ0aWNlcycgeC1wb3NpdGlvbi4gKi9cbiAgICAgIGluZGljZXMgPSBuZXcgQXJyYXkobik7XG5cbiAgICAgIGZvcihpID0gbjsgaS0tOyApXG4gICAgICAgIGluZGljZXNbaV0gPSBpO1xuXG4gICAgICBpbmRpY2VzLnNvcnQoZnVuY3Rpb24oaSwgaikge1xuICAgICAgICByZXR1cm4gdmVydGljZXNbal1bMF0gLSB2ZXJ0aWNlc1tpXVswXTtcbiAgICAgIH0pO1xuXG4gICAgICAvKiBOZXh0LCBmaW5kIHRoZSB2ZXJ0aWNlcyBvZiB0aGUgc3VwZXJ0cmlhbmdsZSAod2hpY2ggY29udGFpbnMgYWxsIG90aGVyXG4gICAgICAgKiB0cmlhbmdsZXMpLCBhbmQgYXBwZW5kIHRoZW0gb250byB0aGUgZW5kIG9mIGEgKGNvcHkgb2YpIHRoZSB2ZXJ0ZXhcbiAgICAgICAqIGFycmF5LiAqL1xuICAgICAgc3QgPSBzdXBlcnRyaWFuZ2xlKHZlcnRpY2VzKTtcbiAgICAgIHZlcnRpY2VzLnB1c2goc3RbMF0sIHN0WzFdLCBzdFsyXSk7XG4gICAgICBcbiAgICAgIC8qIEluaXRpYWxpemUgdGhlIG9wZW4gbGlzdCAoY29udGFpbmluZyB0aGUgc3VwZXJ0cmlhbmdsZSBhbmQgbm90aGluZ1xuICAgICAgICogZWxzZSkgYW5kIHRoZSBjbG9zZWQgbGlzdCAod2hpY2ggaXMgZW1wdHkgc2luY2Ugd2UgaGF2bid0IHByb2Nlc3NlZFxuICAgICAgICogYW55IHRyaWFuZ2xlcyB5ZXQpLiAqL1xuICAgICAgb3BlbiAgID0gW2NpcmN1bWNpcmNsZSh2ZXJ0aWNlcywgbiArIDAsIG4gKyAxLCBuICsgMildO1xuICAgICAgY2xvc2VkID0gW107XG4gICAgICBlZGdlcyAgPSBbXTtcblxuICAgICAgLyogSW5jcmVtZW50YWxseSBhZGQgZWFjaCB2ZXJ0ZXggdG8gdGhlIG1lc2guICovXG4gICAgICBmb3IoaSA9IGluZGljZXMubGVuZ3RoOyBpLS07IGVkZ2VzLmxlbmd0aCA9IDApIHtcbiAgICAgICAgYyA9IGluZGljZXNbaV07XG5cbiAgICAgICAgLyogRm9yIGVhY2ggb3BlbiB0cmlhbmdsZSwgY2hlY2sgdG8gc2VlIGlmIHRoZSBjdXJyZW50IHBvaW50IGlzXG4gICAgICAgICAqIGluc2lkZSBpdCdzIGNpcmN1bWNpcmNsZS4gSWYgaXQgaXMsIHJlbW92ZSB0aGUgdHJpYW5nbGUgYW5kIGFkZFxuICAgICAgICAgKiBpdCdzIGVkZ2VzIHRvIGFuIGVkZ2UgbGlzdC4gKi9cbiAgICAgICAgZm9yKGogPSBvcGVuLmxlbmd0aDsgai0tOyApIHtcbiAgICAgICAgICAvKiBJZiB0aGlzIHBvaW50IGlzIHRvIHRoZSByaWdodCBvZiB0aGlzIHRyaWFuZ2xlJ3MgY2lyY3VtY2lyY2xlLFxuICAgICAgICAgICAqIHRoZW4gdGhpcyB0cmlhbmdsZSBzaG91bGQgbmV2ZXIgZ2V0IGNoZWNrZWQgYWdhaW4uIFJlbW92ZSBpdFxuICAgICAgICAgICAqIGZyb20gdGhlIG9wZW4gbGlzdCwgYWRkIGl0IHRvIHRoZSBjbG9zZWQgbGlzdCwgYW5kIHNraXAuICovXG4gICAgICAgICAgZHggPSB2ZXJ0aWNlc1tjXVswXSAtIG9wZW5bal0ueDtcbiAgICAgICAgICBpZihkeCA+IDAuMCAmJiBkeCAqIGR4ID4gb3BlbltqXS5yKSB7XG4gICAgICAgICAgICBjbG9zZWQucHVzaChvcGVuW2pdKTtcbiAgICAgICAgICAgIG9wZW4uc3BsaWNlKGosIDEpO1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLyogSWYgd2UncmUgb3V0c2lkZSB0aGUgY2lyY3VtY2lyY2xlLCBza2lwIHRoaXMgdHJpYW5nbGUuICovXG4gICAgICAgICAgZHkgPSB2ZXJ0aWNlc1tjXVsxXSAtIG9wZW5bal0ueTtcbiAgICAgICAgICBpZihkeCAqIGR4ICsgZHkgKiBkeSAtIG9wZW5bal0uciA+IEVQU0lMT04pXG4gICAgICAgICAgICBjb250aW51ZTtcblxuICAgICAgICAgIC8qIFJlbW92ZSB0aGUgdHJpYW5nbGUgYW5kIGFkZCBpdCdzIGVkZ2VzIHRvIHRoZSBlZGdlIGxpc3QuICovXG4gICAgICAgICAgZWRnZXMucHVzaChcbiAgICAgICAgICAgIG9wZW5bal0uaSwgb3BlbltqXS5qLFxuICAgICAgICAgICAgb3BlbltqXS5qLCBvcGVuW2pdLmssXG4gICAgICAgICAgICBvcGVuW2pdLmssIG9wZW5bal0uaVxuICAgICAgICAgICk7XG4gICAgICAgICAgb3Blbi5zcGxpY2UoaiwgMSk7XG4gICAgICAgIH1cblxuICAgICAgICAvKiBSZW1vdmUgYW55IGRvdWJsZWQgZWRnZXMuICovXG4gICAgICAgIGRlZHVwKGVkZ2VzKTtcblxuICAgICAgICAvKiBBZGQgYSBuZXcgdHJpYW5nbGUgZm9yIGVhY2ggZWRnZS4gKi9cbiAgICAgICAgZm9yKGogPSBlZGdlcy5sZW5ndGg7IGo7ICkge1xuICAgICAgICAgIGIgPSBlZGdlc1stLWpdO1xuICAgICAgICAgIGEgPSBlZGdlc1stLWpdO1xuICAgICAgICAgIG9wZW4ucHVzaChjaXJjdW1jaXJjbGUodmVydGljZXMsIGEsIGIsIGMpKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvKiBDb3B5IGFueSByZW1haW5pbmcgb3BlbiB0cmlhbmdsZXMgdG8gdGhlIGNsb3NlZCBsaXN0LCBhbmQgdGhlblxuICAgICAgICogcmVtb3ZlIGFueSB0cmlhbmdsZXMgdGhhdCBzaGFyZSBhIHZlcnRleCB3aXRoIHRoZSBzdXBlcnRyaWFuZ2xlLFxuICAgICAgICogYnVpbGRpbmcgYSBsaXN0IG9mIHRyaXBsZXRzIHRoYXQgcmVwcmVzZW50IHRyaWFuZ2xlcy4gKi9cbiAgICAgIGZvcihpID0gb3Blbi5sZW5ndGg7IGktLTsgKVxuICAgICAgICBjbG9zZWQucHVzaChvcGVuW2ldKTtcbiAgICAgIG9wZW4ubGVuZ3RoID0gMDtcblxuICAgICAgZm9yKGkgPSBjbG9zZWQubGVuZ3RoOyBpLS07IClcbiAgICAgICAgaWYoY2xvc2VkW2ldLmkgPCBuICYmIGNsb3NlZFtpXS5qIDwgbiAmJiBjbG9zZWRbaV0uayA8IG4pXG4gICAgICAgICAgb3Blbi5wdXNoKGNsb3NlZFtpXS5pLCBjbG9zZWRbaV0uaiwgY2xvc2VkW2ldLmspO1xuXG4gICAgICAvKiBZYXksIHdlJ3JlIGRvbmUhICovXG4gICAgICByZXR1cm4gb3BlbjtcbiAgICB9LFxuICAgIGNvbnRhaW5zOiBmdW5jdGlvbih0cmksIHApIHtcbiAgICAgIC8qIEJvdW5kaW5nIGJveCB0ZXN0IGZpcnN0LCBmb3IgcXVpY2sgcmVqZWN0aW9ucy4gKi9cbiAgICAgIGlmKChwWzBdIDwgdHJpWzBdWzBdICYmIHBbMF0gPCB0cmlbMV1bMF0gJiYgcFswXSA8IHRyaVsyXVswXSkgfHxcbiAgICAgICAgIChwWzBdID4gdHJpWzBdWzBdICYmIHBbMF0gPiB0cmlbMV1bMF0gJiYgcFswXSA+IHRyaVsyXVswXSkgfHxcbiAgICAgICAgIChwWzFdIDwgdHJpWzBdWzFdICYmIHBbMV0gPCB0cmlbMV1bMV0gJiYgcFsxXSA8IHRyaVsyXVsxXSkgfHxcbiAgICAgICAgIChwWzFdID4gdHJpWzBdWzFdICYmIHBbMV0gPiB0cmlbMV1bMV0gJiYgcFsxXSA+IHRyaVsyXVsxXSkpXG4gICAgICAgIHJldHVybiBudWxsO1xuXG4gICAgICB2YXIgYSA9IHRyaVsxXVswXSAtIHRyaVswXVswXSxcbiAgICAgICAgICBiID0gdHJpWzJdWzBdIC0gdHJpWzBdWzBdLFxuICAgICAgICAgIGMgPSB0cmlbMV1bMV0gLSB0cmlbMF1bMV0sXG4gICAgICAgICAgZCA9IHRyaVsyXVsxXSAtIHRyaVswXVsxXSxcbiAgICAgICAgICBpID0gYSAqIGQgLSBiICogYztcblxuICAgICAgLyogRGVnZW5lcmF0ZSB0cmkuICovXG4gICAgICBpZihpID09PSAwLjApXG4gICAgICAgIHJldHVybiBudWxsO1xuXG4gICAgICB2YXIgdSA9IChkICogKHBbMF0gLSB0cmlbMF1bMF0pIC0gYiAqIChwWzFdIC0gdHJpWzBdWzFdKSkgLyBpLFxuICAgICAgICAgIHYgPSAoYSAqIChwWzFdIC0gdHJpWzBdWzFdKSAtIGMgKiAocFswXSAtIHRyaVswXVswXSkpIC8gaTtcblxuICAgICAgLyogSWYgd2UncmUgb3V0c2lkZSB0aGUgdHJpLCBmYWlsLiAqL1xuICAgICAgaWYodSA8IDAuMCB8fCB2IDwgMC4wIHx8ICh1ICsgdikgPiAxLjApXG4gICAgICAgIHJldHVybiBudWxsO1xuXG4gICAgICByZXR1cm4gW3UsIHZdO1xuICAgIH1cbiAgfTtcblxuICBpZih0eXBlb2YgbW9kdWxlICE9PSBcInVuZGVmaW5lZFwiKVxuICAgIG1vZHVsZS5leHBvcnRzID0gRGVsYXVuYXk7XG59KSgpO1xuIiwiLyoqXG4gKiBUT0RPOlxuICogIC0gUmV3b3JrIENsYXNzIHRvIHByb3RvdHlwZVxuICogIC0gaW1wcm92ZSByZW5kZXJpbmcgc3BlZWRcbiAqICAtIHNtb290aCBvdXQgYXBwZWFyYW5jZSBvZiBmYWRpbmcgaW4gZ3JhZGllbnRzIGR1cmluZyBhbmltYXRpb25cbiAqICAtIGRvY3VtZW50IHVzYWdlXG4gKi9cblxuKGZ1bmN0aW9uKCkge1xuICAndXNlIHN0cmljdCc7XG5cbiAgdmFyIERlbGF1bmF5ID0gcmVxdWlyZSgnZGVsYXVuYXktZmFzdCcpO1xuICB2YXIgQ29sb3IgPSByZXF1aXJlKCcuL1ByZXR0eURlbGF1bmF5L2NvbG9yJyk7XG4gIHZhciBSYW5kb20gPSByZXF1aXJlKCcuL1ByZXR0eURlbGF1bmF5L3JhbmRvbScpO1xuICB2YXIgVHJpYW5nbGUgPSByZXF1aXJlKCcuL1ByZXR0eURlbGF1bmF5L3RyaWFuZ2xlJyk7XG4gIHZhciBQb2ludCA9IHJlcXVpcmUoJy4vUHJldHR5RGVsYXVuYXkvcG9pbnQnKTtcbiAgdmFyIFBvaW50TWFwID0gcmVxdWlyZSgnLi9QcmV0dHlEZWxhdW5heS9wb2ludE1hcCcpO1xuXG4gIHJlcXVpcmUoJy4vUHJldHR5RGVsYXVuYXkvcG9seWZpbGxzJykoKTtcblxuICAvKipcbiAgICogUmVwcmVzZW50cyBhIGRlbGF1bmV5IHRyaWFuZ3VsYXRpb24gb2YgcmFuZG9tIHBvaW50c1xuICAgKiBodHRwczovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9EZWxhdW5heV90cmlhbmd1bGF0aW9uXG4gICAqL1xuICBjbGFzcyBQcmV0dHlEZWxhdW5heSB7XG4gICAgLyoqXG4gICAgICogQGNvbnN0cnVjdG9yXG4gICAgICovXG4gICAgY29uc3RydWN0b3IoY2FudmFzLCBvcHRpb25zKSB7XG4gICAgICAvLyBtZXJnZSBnaXZlbiBvcHRpb25zIHdpdGggZGVmYXVsdHNcbiAgICAgIHRoaXMub3B0aW9ucyA9IE9iamVjdC5hc3NpZ24oe30sIFByZXR0eURlbGF1bmF5LmRlZmF1bHRzKCksIChvcHRpb25zIHx8IHt9KSk7XG5cbiAgICAgIHRoaXMuY2FudmFzID0gY2FudmFzO1xuICAgICAgdGhpcy5jdHggPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcblxuICAgICAgdGhpcy5yZXNpemVDYW52YXMoKTtcbiAgICAgIHRoaXMucG9pbnRzID0gW107XG4gICAgICB0aGlzLmNvbG9ycyA9IHRoaXMub3B0aW9ucy5jb2xvcnM7XG4gICAgICB0aGlzLnBvaW50TWFwID0gbmV3IFBvaW50TWFwKCk7XG5cbiAgICAgIHRoaXMubW91c2VQb3NpdGlvbiA9IGZhbHNlO1xuXG4gICAgICBpZiAodGhpcy5vcHRpb25zLmhvdmVyKSB7XG4gICAgICAgIHRoaXMuY3JlYXRlSG92ZXJTaGFkb3dDYW52YXMoKTtcblxuICAgICAgICB0aGlzLmNhbnZhcy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCAoZSkgPT4ge1xuICAgICAgICAgIGlmICghdGhpcy5vcHRpb25zLmFuaW1hdGUpIHtcbiAgICAgICAgICAgIHZhciByZWN0ID0gY2FudmFzLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgICAgICAgICAgdGhpcy5tb3VzZVBvc2l0aW9uID0gbmV3IFBvaW50KGUuY2xpZW50WCAtIHJlY3QubGVmdCwgZS5jbGllbnRZIC0gcmVjdC50b3ApO1xuICAgICAgICAgICAgdGhpcy5ob3ZlcigpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSwgZmFsc2UpO1xuXG4gICAgICAgIHRoaXMuY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlb3V0JywgKCkgPT4ge1xuICAgICAgICAgIGlmICghdGhpcy5vcHRpb25zLmFuaW1hdGUpIHtcbiAgICAgICAgICAgIHRoaXMubW91c2VQb3NpdGlvbiA9IGZhbHNlO1xuICAgICAgICAgICAgdGhpcy5ob3ZlcigpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSwgZmFsc2UpO1xuICAgICAgfVxuXG4gICAgICAvLyB0aHJvdHRsZWQgd2luZG93IHJlc2l6ZVxuICAgICAgdGhpcy5yZXNpemluZyA9IGZhbHNlO1xuICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsICgpPT4ge1xuICAgICAgICBpZiAodGhpcy5yZXNpemluZykge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnJlc2l6aW5nID0gdHJ1ZTtcbiAgICAgICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpPT4ge1xuICAgICAgICAgIHRoaXMucmVzY2FsZSgpO1xuICAgICAgICAgIHRoaXMucmVzaXppbmcgPSBmYWxzZTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcblxuICAgICAgdGhpcy5yYW5kb21pemUoKTtcbiAgICB9XG5cbiAgICBzdGF0aWMgZGVmYXVsdHMoKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICAvLyBzaG93cyB0cmlhbmdsZXMgLSBmYWxzZSB3aWxsIHNob3cgdGhlIGdyYWRpZW50IGJlaGluZFxuICAgICAgICBzaG93VHJpYW5nbGVzOiB0cnVlLFxuICAgICAgICAvLyBzaG93IHRoZSBwb2ludHMgdGhhdCBtYWtlIHRoZSB0cmlhbmd1bGF0aW9uXG4gICAgICAgIHNob3dQb2ludHM6IGZhbHNlLFxuICAgICAgICAvLyBzaG93IHRoZSBjaXJjbGVzIHRoYXQgZGVmaW5lIHRoZSBncmFkaWVudCBsb2NhdGlvbnMsIHNpemVzXG4gICAgICAgIHNob3dDaXJjbGVzOiBmYWxzZSxcbiAgICAgICAgLy8gc2hvdyB0cmlhbmdsZSBjZW50cm9pZHNcbiAgICAgICAgc2hvd0NlbnRyb2lkczogZmFsc2UsXG4gICAgICAgIC8vIHNob3cgdHJpYW5nbGUgZWRnZXNcbiAgICAgICAgc2hvd0VkZ2VzOiB0cnVlLFxuICAgICAgICAvLyBoaWdobGlnaHQgaG92ZXJlZCB0cmlhbmdsZXNcbiAgICAgICAgaG92ZXI6IHRydWUsXG4gICAgICAgIC8vIG11bHRpcGxpZXIgZm9yIHRoZSBudW1iZXIgb2YgcG9pbnRzIGdlbmVyYXRlZCBiYXNlZCBvbiBjYW52YXMgc2l6ZVxuICAgICAgICBtdWx0aXBsaWVyOiAwLjUsXG4gICAgICAgIC8vIHdoZXRoZXIgdG8gYW5pbWF0ZSB0aGUgZ3JhZGllbnRzIGJlaGluZCB0aGUgdHJpYW5nbGVzXG4gICAgICAgIGFuaW1hdGU6IGZhbHNlLFxuICAgICAgICAvLyBudW1iZXIgb2YgZnJhbWVzIHBlciBncmFkaWVudCBjb2xvciBjeWNsZVxuICAgICAgICBsb29wRnJhbWVzOiAyNTAsXG5cbiAgICAgICAgLy8gY29sb3JzIHRvIHVzZSBpbiB0aGUgZ3JhZGllbnRcbiAgICAgICAgY29sb3JzOiBbJ2hzbGEoMCwgMCUsIDEwMCUsIDEpJywgJ2hzbGEoMCwgMCUsIDUwJSwgMSknLCAnaHNsYSgwLCAwJSwgMCUsIDEpJ10sXG5cbiAgICAgICAgLy8gcmFuZG9tbHkgY2hvb3NlIGZyb20gY29sb3IgcGFsZXR0ZSBvbiByYW5kb21pemUgaWYgbm90IHN1cHBsaWVkIGNvbG9yc1xuICAgICAgICBjb2xvclBhbGV0dGU6IGZhbHNlLFxuXG4gICAgICAgIC8vIHVzZSBpbWFnZSBhcyBiYWNrZ3JvdW5kIGluc3RlYWQgb2YgZ3JhZGllbnRcbiAgICAgICAgaW1hZ2VBc0JhY2tncm91bmQ6IGZhbHNlLFxuXG4gICAgICAgIC8vIGltYWdlIHRvIHVzZSBhcyBiYWNrZ3JvdW5kXG4gICAgICAgIGltYWdlVVJMOiAnJyxcblxuICAgICAgICAvLyBob3cgdG8gcmVzaXplIHRoZSBwb2ludHNcbiAgICAgICAgcmVzaXplTW9kZTogJ3NjYWxlUG9pbnRzJyxcbiAgICAgICAgLy8gJ25ld1BvaW50cycgLSBnZW5lcmF0ZXMgYSBuZXcgc2V0IG9mIHBvaW50cyBmb3IgdGhlIG5ldyBzaXplXG4gICAgICAgIC8vICdzY2FsZVBvaW50cycgLSBsaW5lYXJseSBzY2FsZXMgZXhpc3RpbmcgcG9pbnRzIGFuZCByZS10cmlhbmd1bGF0ZXNcblxuICAgICAgICAvLyBldmVudHMgdHJpZ2dlcmVkIHdoZW4gdGhlIGNlbnRlciBvZiB0aGUgYmFja2dyb3VuZFxuICAgICAgICAvLyBpcyBncmVhdGVyIG9yIGxlc3MgdGhhbiA1MCBsaWdodG5lc3MgaW4gaHNsYVxuICAgICAgICAvLyBpbnRlbmRlZCB0byBhZGp1c3Qgc29tZSB0ZXh0IHRoYXQgaXMgb24gdG9wXG4gICAgICAgIC8vIGNvbG9yIGlzIHRoZSBjb2xvciBvZiB0aGUgY2VudGVyIG9mIHRoZSBjYW52YXNcbiAgICAgICAgb25EYXJrQmFja2dyb3VuZDogZnVuY3Rpb24oKSB7IHJldHVybjsgfSxcbiAgICAgICAgb25MaWdodEJhY2tncm91bmQ6IGZ1bmN0aW9uKCkgeyByZXR1cm47IH0sXG5cbiAgICAgICAgLy8gdHJpZ2dlcmVkIHdoZW4gaG92ZXJlZCBvdmVyIHRyaWFuZ2xlXG4gICAgICAgIG9uVHJpYW5nbGVIb3ZlcjogZnVuY3Rpb24odHJpYW5nbGUsIGN0eCwgb3B0aW9ucykge1xuICAgICAgICAgIHZhciBmaWxsID0gb3B0aW9ucy5ob3ZlckNvbG9yKHRyaWFuZ2xlLmNvbG9yKTtcbiAgICAgICAgICB2YXIgc3Ryb2tlID0gZmlsbDtcbiAgICAgICAgICB0cmlhbmdsZS5yZW5kZXIoY3R4LCBvcHRpb25zLnNob3dFZGdlcyA/IGZpbGwgOiBmYWxzZSwgb3B0aW9ucy5zaG93RWRnZXMgPyBmYWxzZSA6IHN0cm9rZSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLy8gcmV0dXJucyBoc2xhIGNvbG9yIGZvciB0cmlhbmdsZSBlZGdlXG4gICAgICAgIC8vIGFzIGEgZnVuY3Rpb24gb2YgdGhlIHRyaWFuZ2xlIGZpbGwgY29sb3JcbiAgICAgICAgZWRnZUNvbG9yOiBmdW5jdGlvbihjb2xvcikge1xuICAgICAgICAgIGNvbG9yID0gQ29sb3IuaHNsYUFkanVzdExpZ2h0bmVzcyhjb2xvciwgZnVuY3Rpb24obGlnaHRuZXNzKSB7XG4gICAgICAgICAgICByZXR1cm4gKGxpZ2h0bmVzcyArIDIwMCAtIGxpZ2h0bmVzcyAqIDIpIC8gMztcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBjb2xvciA9IENvbG9yLmhzbGFBZGp1c3RBbHBoYShjb2xvciwgMC4yNSk7XG4gICAgICAgICAgcmV0dXJuIGNvbG9yO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8vIHJldHVybnMgaHNsYSBjb2xvciBmb3IgdHJpYW5nbGUgcG9pbnRcbiAgICAgICAgLy8gYXMgYSBmdW5jdGlvbiBvZiB0aGUgdHJpYW5nbGUgZmlsbCBjb2xvclxuICAgICAgICBwb2ludENvbG9yOiBmdW5jdGlvbihjb2xvcikge1xuICAgICAgICAgIGNvbG9yID0gQ29sb3IuaHNsYUFkanVzdExpZ2h0bmVzcyhjb2xvciwgZnVuY3Rpb24obGlnaHRuZXNzKSB7XG4gICAgICAgICAgICByZXR1cm4gKGxpZ2h0bmVzcyArIDIwMCAtIGxpZ2h0bmVzcyAqIDIpIC8gMztcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBjb2xvciA9IENvbG9yLmhzbGFBZGp1c3RBbHBoYShjb2xvciwgMSk7XG4gICAgICAgICAgcmV0dXJuIGNvbG9yO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8vIHJldHVybnMgaHNsYSBjb2xvciBmb3IgdHJpYW5nbGUgY2VudHJvaWRcbiAgICAgICAgLy8gYXMgYSBmdW5jdGlvbiBvZiB0aGUgdHJpYW5nbGUgZmlsbCBjb2xvclxuICAgICAgICBjZW50cm9pZENvbG9yOiBmdW5jdGlvbihjb2xvcikge1xuICAgICAgICAgIGNvbG9yID0gQ29sb3IuaHNsYUFkanVzdExpZ2h0bmVzcyhjb2xvciwgZnVuY3Rpb24obGlnaHRuZXNzKSB7XG4gICAgICAgICAgICByZXR1cm4gKGxpZ2h0bmVzcyArIDIwMCAtIGxpZ2h0bmVzcyAqIDIpIC8gMztcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBjb2xvciA9IENvbG9yLmhzbGFBZGp1c3RBbHBoYShjb2xvciwgMC4yNSk7XG4gICAgICAgICAgcmV0dXJuIGNvbG9yO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8vIHJldHVybnMgaHNsYSBjb2xvciBmb3IgdHJpYW5nbGUgaG92ZXIgZmlsbFxuICAgICAgICAvLyBhcyBhIGZ1bmN0aW9uIG9mIHRoZSB0cmlhbmdsZSBmaWxsIGNvbG9yXG4gICAgICAgIGhvdmVyQ29sb3I6IGZ1bmN0aW9uKGNvbG9yKSB7XG4gICAgICAgICAgY29sb3IgPSBDb2xvci5oc2xhQWRqdXN0TGlnaHRuZXNzKGNvbG9yLCBmdW5jdGlvbihsaWdodG5lc3MpIHtcbiAgICAgICAgICAgIHJldHVybiAxMDAgLSBsaWdodG5lc3M7XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgY29sb3IgPSBDb2xvci5oc2xhQWRqdXN0QWxwaGEoY29sb3IsIDAuNSk7XG4gICAgICAgICAgcmV0dXJuIGNvbG9yO1xuICAgICAgICB9LFxuICAgICAgfTtcbiAgICB9XG5cbiAgICBjbGVhcigpIHtcbiAgICAgIHRoaXMucG9pbnRzID0gW107XG4gICAgICB0aGlzLnRyaWFuZ2xlcyA9IFtdO1xuICAgICAgdGhpcy5wb2ludE1hcC5jbGVhcigpO1xuICAgICAgdGhpcy5jZW50ZXIgPSBuZXcgUG9pbnQoMCwgMCk7XG4gICAgfVxuXG4gICAgLy8gY2xlYXIgYW5kIGNyZWF0ZSBhIGZyZXNoIHNldCBvZiByYW5kb20gcG9pbnRzXG4gICAgLy8gYWxsIGFyZ3MgYXJlIG9wdGlvbmFsXG4gICAgcmFuZG9taXplKG1pbiwgbWF4LCBtaW5FZGdlLCBtYXhFZGdlLCBtaW5HcmFkaWVudHMsIG1heEdyYWRpZW50cywgbXVsdGlwbGllciwgY29sb3JzLCBpbWFnZVVSTCkge1xuICAgICAgLy8gY29sb3JzIHBhcmFtIGlzIG9wdGlvbmFsXG4gICAgICB0aGlzLmNvbG9ycyA9IGNvbG9ycyA/XG4gICAgICAgICAgICAgICAgICAgICAgY29sb3JzIDpcbiAgICAgICAgICAgICAgICAgICAgICB0aGlzLm9wdGlvbnMuY29sb3JQYWxldHRlID9cbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMub3B0aW9ucy5jb2xvclBhbGV0dGVbUmFuZG9tLnJhbmRvbUJldHdlZW4oMCwgdGhpcy5vcHRpb25zLmNvbG9yUGFsZXR0ZS5sZW5ndGggLSAxKV0gOlxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jb2xvcnM7XG5cbiAgICAgIHRoaXMub3B0aW9ucy5pbWFnZVVSTCA9IGltYWdlVVJMID8gaW1hZ2VVUkwgOiB0aGlzLm9wdGlvbnMuaW1hZ2VVUkw7XG4gICAgICB0aGlzLm9wdGlvbnMuaW1hZ2VBc0JhY2tncm91bmQgPSAhIXRoaXMub3B0aW9ucy5pbWFnZVVSTDtcblxuICAgICAgdGhpcy5taW5HcmFkaWVudHMgPSBtaW5HcmFkaWVudHM7XG4gICAgICB0aGlzLm1heEdyYWRpZW50cyA9IG1heEdyYWRpZW50cztcblxuICAgICAgdGhpcy5yZXNpemVDYW52YXMoKTtcblxuICAgICAgdGhpcy5nZW5lcmF0ZU5ld1BvaW50cyhtaW4sIG1heCwgbWluRWRnZSwgbWF4RWRnZSwgbXVsdGlwbGllcik7XG5cbiAgICAgIHRoaXMudHJpYW5ndWxhdGUoKTtcblxuICAgICAgaWYgKCF0aGlzLm9wdGlvbnMuaW1hZ2VBc0JhY2tncm91bmQpIHtcbiAgICAgICAgdGhpcy5nZW5lcmF0ZUdyYWRpZW50cyhtaW5HcmFkaWVudHMsIG1heEdyYWRpZW50cyk7XG5cbiAgICAgICAgLy8gcHJlcCBmb3IgYW5pbWF0aW9uXG4gICAgICAgIHRoaXMubmV4dEdyYWRpZW50cyA9IHRoaXMucmFkaWFsR3JhZGllbnRzLnNsaWNlKDApO1xuICAgICAgICB0aGlzLmdlbmVyYXRlR3JhZGllbnRzKCk7XG4gICAgICAgIHRoaXMuY3VycmVudEdyYWRpZW50cyA9IHRoaXMucmFkaWFsR3JhZGllbnRzLnNsaWNlKDApO1xuICAgICAgfVxuXG4gICAgICB0aGlzLnJlbmRlcigpO1xuXG4gICAgICBpZiAodGhpcy5vcHRpb25zLmFuaW1hdGUgJiYgIXRoaXMubG9vcGluZykge1xuICAgICAgICB0aGlzLmluaXRSZW5kZXJMb29wKCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaW5pdFJlbmRlckxvb3AoKSB7XG4gICAgICBpZiAodGhpcy5vcHRpb25zLmltYWdlQXNCYWNrZ3JvdW5kKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgdGhpcy5sb29waW5nID0gdHJ1ZTtcbiAgICAgIHRoaXMuZnJhbWVTdGVwcyA9IHRoaXMub3B0aW9ucy5sb29wRnJhbWVzO1xuICAgICAgdGhpcy5mcmFtZSA9IHRoaXMuZnJhbWUgPyB0aGlzLmZyYW1lIDogdGhpcy5mcmFtZVN0ZXBzO1xuICAgICAgdGhpcy5yZW5kZXJMb29wKCk7XG4gICAgfVxuXG4gICAgcmVuZGVyTG9vcCgpIHtcbiAgICAgIHRoaXMuZnJhbWUrKztcblxuICAgICAgLy8gY3VycmVudCA9PiBuZXh0LCBuZXh0ID0+IG5ld1xuICAgICAgaWYgKHRoaXMuZnJhbWUgPiB0aGlzLmZyYW1lU3RlcHMpIHtcbiAgICAgICAgdmFyIG5leHRHcmFkaWVudHMgPSB0aGlzLm5leHRHcmFkaWVudHMgPyB0aGlzLm5leHRHcmFkaWVudHMgOiB0aGlzLnJhZGlhbEdyYWRpZW50cztcbiAgICAgICAgdGhpcy5nZW5lcmF0ZUdyYWRpZW50cygpO1xuICAgICAgICB0aGlzLm5leHRHcmFkaWVudHMgPSB0aGlzLnJhZGlhbEdyYWRpZW50cztcbiAgICAgICAgdGhpcy5yYWRpYWxHcmFkaWVudHMgPSBuZXh0R3JhZGllbnRzLnNsaWNlKDApO1xuICAgICAgICB0aGlzLmN1cnJlbnRHcmFkaWVudHMgPSBuZXh0R3JhZGllbnRzLnNsaWNlKDApO1xuXG4gICAgICAgIHRoaXMuZnJhbWUgPSAwO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gZmFuY3kgc3RlcHNcbiAgICAgICAgLy8ge3gwLCB5MCwgcjAsIHgxLCB5MSwgcjEsIGNvbG9yU3RvcH1cbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBNYXRoLm1heCh0aGlzLnJhZGlhbEdyYWRpZW50cy5sZW5ndGgsIHRoaXMubmV4dEdyYWRpZW50cy5sZW5ndGgpOyBpKyspIHtcbiAgICAgICAgICB2YXIgY3VycmVudEdyYWRpZW50ID0gdGhpcy5jdXJyZW50R3JhZGllbnRzW2ldO1xuICAgICAgICAgIHZhciBuZXh0R3JhZGllbnQgPSB0aGlzLm5leHRHcmFkaWVudHNbaV07XG5cbiAgICAgICAgICBpZiAodHlwZW9mIGN1cnJlbnRHcmFkaWVudCA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIHZhciBuZXdHcmFkaWVudCA9IHtcbiAgICAgICAgICAgICAgeDA6IG5leHRHcmFkaWVudC54MCxcbiAgICAgICAgICAgICAgeTA6IG5leHRHcmFkaWVudC55MCxcbiAgICAgICAgICAgICAgcjA6IDAsXG4gICAgICAgICAgICAgIHgxOiBuZXh0R3JhZGllbnQueDEsXG4gICAgICAgICAgICAgIHkxOiBuZXh0R3JhZGllbnQueTEsXG4gICAgICAgICAgICAgIHIxOiAwLFxuICAgICAgICAgICAgICBjb2xvclN0b3A6IG5leHRHcmFkaWVudC5jb2xvclN0b3AsXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgY3VycmVudEdyYWRpZW50ID0gbmV3R3JhZGllbnQ7XG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRHcmFkaWVudHMucHVzaChuZXdHcmFkaWVudCk7XG4gICAgICAgICAgICB0aGlzLnJhZGlhbEdyYWRpZW50cy5wdXNoKG5ld0dyYWRpZW50KTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAodHlwZW9mIG5leHRHcmFkaWVudCA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIG5leHRHcmFkaWVudCA9IHtcbiAgICAgICAgICAgICAgeDA6IGN1cnJlbnRHcmFkaWVudC54MCxcbiAgICAgICAgICAgICAgeTA6IGN1cnJlbnRHcmFkaWVudC55MCxcbiAgICAgICAgICAgICAgcjA6IDAsXG4gICAgICAgICAgICAgIHgxOiBjdXJyZW50R3JhZGllbnQueDEsXG4gICAgICAgICAgICAgIHkxOiBjdXJyZW50R3JhZGllbnQueTEsXG4gICAgICAgICAgICAgIHIxOiAwLFxuICAgICAgICAgICAgICBjb2xvclN0b3A6IGN1cnJlbnRHcmFkaWVudC5jb2xvclN0b3AsXG4gICAgICAgICAgICB9O1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHZhciB1cGRhdGVkR3JhZGllbnQgPSB7fTtcblxuICAgICAgICAgIC8vIHNjYWxlIHRoZSBkaWZmZXJlbmNlIGJldHdlZW4gY3VycmVudCBhbmQgbmV4dCBncmFkaWVudCBiYXNlZCBvbiBzdGVwIGluIGZyYW1lc1xuICAgICAgICAgIHZhciBzY2FsZSA9IHRoaXMuZnJhbWUgLyB0aGlzLmZyYW1lU3RlcHM7XG5cbiAgICAgICAgICB1cGRhdGVkR3JhZGllbnQueDAgPSBNYXRoLnJvdW5kKGxpbmVhclNjYWxlKGN1cnJlbnRHcmFkaWVudC54MCwgbmV4dEdyYWRpZW50LngwLCBzY2FsZSkpO1xuICAgICAgICAgIHVwZGF0ZWRHcmFkaWVudC55MCA9IE1hdGgucm91bmQobGluZWFyU2NhbGUoY3VycmVudEdyYWRpZW50LnkwLCBuZXh0R3JhZGllbnQueTAsIHNjYWxlKSk7XG4gICAgICAgICAgdXBkYXRlZEdyYWRpZW50LnIwID0gTWF0aC5yb3VuZChsaW5lYXJTY2FsZShjdXJyZW50R3JhZGllbnQucjAsIG5leHRHcmFkaWVudC5yMCwgc2NhbGUpKTtcbiAgICAgICAgICB1cGRhdGVkR3JhZGllbnQueDEgPSBNYXRoLnJvdW5kKGxpbmVhclNjYWxlKGN1cnJlbnRHcmFkaWVudC54MSwgbmV4dEdyYWRpZW50LngwLCBzY2FsZSkpO1xuICAgICAgICAgIHVwZGF0ZWRHcmFkaWVudC55MSA9IE1hdGgucm91bmQobGluZWFyU2NhbGUoY3VycmVudEdyYWRpZW50LnkxLCBuZXh0R3JhZGllbnQueTAsIHNjYWxlKSk7XG4gICAgICAgICAgdXBkYXRlZEdyYWRpZW50LnIxID0gTWF0aC5yb3VuZChsaW5lYXJTY2FsZShjdXJyZW50R3JhZGllbnQucjEsIG5leHRHcmFkaWVudC5yMSwgc2NhbGUpKTtcbiAgICAgICAgICB1cGRhdGVkR3JhZGllbnQuY29sb3JTdG9wID0gbGluZWFyU2NhbGUoY3VycmVudEdyYWRpZW50LmNvbG9yU3RvcCwgbmV4dEdyYWRpZW50LmNvbG9yU3RvcCwgc2NhbGUpO1xuXG4gICAgICAgICAgdGhpcy5yYWRpYWxHcmFkaWVudHNbaV0gPSB1cGRhdGVkR3JhZGllbnQ7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgdGhpcy5yZXNldFBvaW50Q29sb3JzKCk7XG4gICAgICB0aGlzLnJlbmRlcigpO1xuXG4gICAgICBpZiAodGhpcy5vcHRpb25zLmFuaW1hdGUpIHtcbiAgICAgICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpID0+IHtcbiAgICAgICAgICB0aGlzLnJlbmRlckxvb3AoKTtcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmxvb3BpbmcgPSBmYWxzZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBjcmVhdGVzIGEgaGlkZGVuIGNhbnZhcyBmb3IgaG92ZXIgZGV0ZWN0aW9uXG4gICAgY3JlYXRlSG92ZXJTaGFkb3dDYW52YXMoKSB7XG4gICAgICB0aGlzLmhvdmVyU2hhZG93Q2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG4gICAgICB0aGlzLnNoYWRvd0N0eCA9IHRoaXMuaG92ZXJTaGFkb3dDYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcblxuICAgICAgdGhpcy5ob3ZlclNoYWRvd0NhbnZhcy5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuICAgIH1cblxuICAgIGdlbmVyYXRlTmV3UG9pbnRzKG1pbiwgbWF4LCBtaW5FZGdlLCBtYXhFZGdlLCBtdWx0aXBsaWVyKSB7XG4gICAgICAvLyBkZWZhdWx0cyB0byBnZW5lcmljIG51bWJlciBvZiBwb2ludHMgYmFzZWQgb24gY2FudmFzIGRpbWVuc2lvbnNcbiAgICAgIC8vIHRoaXMgZ2VuZXJhbGx5IGxvb2tzIHByZXR0eSBuaWNlXG4gICAgICB2YXIgYXJlYSA9IHRoaXMuY2FudmFzLndpZHRoICogdGhpcy5jYW52YXMuaGVpZ2h0O1xuICAgICAgdmFyIHBlcmltZXRlciA9ICh0aGlzLmNhbnZhcy53aWR0aCArIHRoaXMuY2FudmFzLmhlaWdodCkgKiAyO1xuXG4gICAgICBtdWx0aXBsaWVyID0gbXVsdGlwbGllciB8fCB0aGlzLm9wdGlvbnMubXVsdGlwbGllcjtcblxuICAgICAgbWluID0gbWluID4gMCA/IE1hdGguY2VpbChtaW4pIDogTWF0aC5tYXgoTWF0aC5jZWlsKChhcmVhIC8gMTI1MCkgKiBtdWx0aXBsaWVyKSwgNTApO1xuICAgICAgbWF4ID0gbWF4ID4gMCA/IE1hdGguY2VpbChtYXgpIDogTWF0aC5tYXgoTWF0aC5jZWlsKChhcmVhIC8gNTAwKSAqIG11bHRpcGxpZXIpLCA1MCk7XG5cbiAgICAgIG1pbkVkZ2UgPSBtaW5FZGdlID4gMCA/IE1hdGguY2VpbChtaW5FZGdlKSA6IE1hdGgubWF4KE1hdGguY2VpbCgocGVyaW1ldGVyIC8gMTI1KSAqIG11bHRpcGxpZXIpLCA1KTtcbiAgICAgIG1heEVkZ2UgPSBtYXhFZGdlID4gMCA/IE1hdGguY2VpbChtYXhFZGdlKSA6IE1hdGgubWF4KE1hdGguY2VpbCgocGVyaW1ldGVyIC8gNTApICogbXVsdGlwbGllciksIDUpO1xuXG4gICAgICB0aGlzLm51bVBvaW50cyA9IFJhbmRvbS5yYW5kb21CZXR3ZWVuKG1pbiwgbWF4KTtcbiAgICAgIHRoaXMuZ2V0TnVtRWRnZVBvaW50cyA9IFJhbmRvbS5yYW5kb21OdW1iZXJGdW5jdGlvbihtaW5FZGdlLCBtYXhFZGdlKTtcblxuICAgICAgdGhpcy5jbGVhcigpO1xuXG4gICAgICAvLyBhZGQgY29ybmVyIGFuZCBlZGdlIHBvaW50c1xuICAgICAgdGhpcy5nZW5lcmF0ZUNvcm5lclBvaW50cygpO1xuICAgICAgdGhpcy5nZW5lcmF0ZUVkZ2VQb2ludHMoKTtcblxuICAgICAgLy8gYWRkIHNvbWUgcmFuZG9tIHBvaW50cyBpbiB0aGUgbWlkZGxlIGZpZWxkLFxuICAgICAgLy8gZXhjbHVkaW5nIGVkZ2VzIGFuZCBjb3JuZXJzXG4gICAgICB0aGlzLmdlbmVyYXRlUmFuZG9tUG9pbnRzKHRoaXMubnVtUG9pbnRzLCAxLCAxLCB0aGlzLndpZHRoIC0gMSwgdGhpcy5oZWlnaHQgLSAxKTtcbiAgICB9XG5cbiAgICAvLyBhZGQgcG9pbnRzIGluIHRoZSBjb3JuZXJzXG4gICAgZ2VuZXJhdGVDb3JuZXJQb2ludHMoKSB7XG4gICAgICB0aGlzLnBvaW50cy5wdXNoKG5ldyBQb2ludCgwLCAwKSk7XG4gICAgICB0aGlzLnBvaW50cy5wdXNoKG5ldyBQb2ludCgwLCB0aGlzLmhlaWdodCkpO1xuICAgICAgdGhpcy5wb2ludHMucHVzaChuZXcgUG9pbnQodGhpcy53aWR0aCwgMCkpO1xuICAgICAgdGhpcy5wb2ludHMucHVzaChuZXcgUG9pbnQodGhpcy53aWR0aCwgdGhpcy5oZWlnaHQpKTtcbiAgICB9XG5cbiAgICAvLyBhZGQgcG9pbnRzIG9uIHRoZSBlZGdlc1xuICAgIGdlbmVyYXRlRWRnZVBvaW50cygpIHtcbiAgICAgIC8vIGxlZnQgZWRnZVxuICAgICAgdGhpcy5nZW5lcmF0ZVJhbmRvbVBvaW50cyh0aGlzLmdldE51bUVkZ2VQb2ludHMoKSwgMCwgMCwgMCwgdGhpcy5oZWlnaHQpO1xuICAgICAgLy8gcmlnaHQgZWRnZVxuICAgICAgdGhpcy5nZW5lcmF0ZVJhbmRvbVBvaW50cyh0aGlzLmdldE51bUVkZ2VQb2ludHMoKSwgdGhpcy53aWR0aCwgMCwgMCwgdGhpcy5oZWlnaHQpO1xuICAgICAgLy8gYm90dG9tIGVkZ2VcbiAgICAgIHRoaXMuZ2VuZXJhdGVSYW5kb21Qb2ludHModGhpcy5nZXROdW1FZGdlUG9pbnRzKCksIDAsIHRoaXMuaGVpZ2h0LCB0aGlzLndpZHRoLCAwKTtcbiAgICAgIC8vIHRvcCBlZGdlXG4gICAgICB0aGlzLmdlbmVyYXRlUmFuZG9tUG9pbnRzKHRoaXMuZ2V0TnVtRWRnZVBvaW50cygpLCAwLCAwLCB0aGlzLndpZHRoLCAwKTtcbiAgICB9XG5cbiAgICAvLyByYW5kb21seSBnZW5lcmF0ZSBzb21lIHBvaW50cyxcbiAgICAvLyBzYXZlIHRoZSBwb2ludCBjbG9zZXN0IHRvIGNlbnRlclxuICAgIGdlbmVyYXRlUmFuZG9tUG9pbnRzKG51bVBvaW50cywgeCwgeSwgd2lkdGgsIGhlaWdodCkge1xuICAgICAgdmFyIGNlbnRlciA9IG5ldyBQb2ludChNYXRoLnJvdW5kKHRoaXMuY2FudmFzLndpZHRoIC8gMiksIE1hdGgucm91bmQodGhpcy5jYW52YXMuaGVpZ2h0IC8gMikpO1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBudW1Qb2ludHM7IGkrKykge1xuICAgICAgICAvLyBnZW5lcmF0ZSBhIG5ldyBwb2ludCB3aXRoIHJhbmRvbSBjb29yZHNcbiAgICAgICAgLy8gcmUtZ2VuZXJhdGUgdGhlIHBvaW50IGlmIGl0IGFscmVhZHkgZXhpc3RzIGluIHBvaW50bWFwIChtYXggMTAgdGltZXMpXG4gICAgICAgIHZhciBwb2ludDtcbiAgICAgICAgdmFyIGogPSAwO1xuICAgICAgICBkbyB7XG4gICAgICAgICAgaisrO1xuICAgICAgICAgIHBvaW50ID0gbmV3IFBvaW50KFJhbmRvbS5yYW5kb21CZXR3ZWVuKHgsIHggKyB3aWR0aCksIFJhbmRvbS5yYW5kb21CZXR3ZWVuKHksIHkgKyBoZWlnaHQpKTtcbiAgICAgICAgfSB3aGlsZSAodGhpcy5wb2ludE1hcC5leGlzdHMocG9pbnQpICYmIGogPCAxMCk7XG5cbiAgICAgICAgaWYgKGogPCAxMCkge1xuICAgICAgICAgIHRoaXMucG9pbnRzLnB1c2gocG9pbnQpO1xuICAgICAgICAgIHRoaXMucG9pbnRNYXAuYWRkKHBvaW50KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjZW50ZXIuZ2V0RGlzdGFuY2VUbyhwb2ludCkgPCBjZW50ZXIuZ2V0RGlzdGFuY2VUbyh0aGlzLmNlbnRlcikpIHtcbiAgICAgICAgICB0aGlzLmNlbnRlciA9IHBvaW50O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMuY2VudGVyLmlzQ2VudGVyID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgdGhpcy5jZW50ZXIuaXNDZW50ZXIgPSB0cnVlO1xuICAgIH1cblxuICAgIC8vIHVzZSB0aGUgRGVsYXVuYXkgYWxnb3JpdGhtIHRvIG1ha2VcbiAgICAvLyB0cmlhbmdsZXMgb3V0IG9mIG91ciByYW5kb20gcG9pbnRzXG4gICAgdHJpYW5ndWxhdGUoKSB7XG4gICAgICB0aGlzLnRyaWFuZ2xlcyA9IFtdO1xuXG4gICAgICAvLyBtYXAgcG9pbnQgb2JqZWN0cyB0byBsZW5ndGgtMiBhcnJheXNcbiAgICAgIHZhciB2ZXJ0aWNlcyA9IHRoaXMucG9pbnRzLm1hcChmdW5jdGlvbihwb2ludCkge1xuICAgICAgICByZXR1cm4gcG9pbnQuZ2V0Q29vcmRzKCk7XG4gICAgICB9KTtcblxuICAgICAgLy8gdmVydGljZXMgaXMgbm93IGFuIGFycmF5IHN1Y2ggYXM6XG4gICAgICAvLyBbIFtwMXgsIHAxeV0sIFtwMngsIHAyeV0sIFtwM3gsIHAzeV0sIC4uLiBdXG5cbiAgICAgIC8vIGRvIHRoZSBhbGdvcml0aG1cbiAgICAgIHZhciB0cmlhbmd1bGF0ZWQgPSBEZWxhdW5heS50cmlhbmd1bGF0ZSh2ZXJ0aWNlcyk7XG5cbiAgICAgIC8vIHJldHVybnMgMSBkaW1lbnNpb25hbCBhcnJheSBhcnJhbmdlZCBpbiB0cmlwbGVzIHN1Y2ggYXM6XG4gICAgICAvLyBbIHQxYSwgdDFiLCB0MWMsIHQyYSwgdDJiLCB0MmMsLi4uLiBdXG4gICAgICAvLyB3aGVyZSB0MWEsIGV0YyBhcmUgaW5kZWNlcyBpbiB0aGUgdmVydGljZXMgYXJyYXlcbiAgICAgIC8vIHR1cm4gdGhhdCBpbnRvIGFycmF5IG9mIHRyaWFuZ2xlIHBvaW50c1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0cmlhbmd1bGF0ZWQubGVuZ3RoOyBpICs9IDMpIHtcbiAgICAgICAgdmFyIGFyciA9IFtdO1xuICAgICAgICBhcnIucHVzaCh2ZXJ0aWNlc1t0cmlhbmd1bGF0ZWRbaV1dKTtcbiAgICAgICAgYXJyLnB1c2godmVydGljZXNbdHJpYW5ndWxhdGVkW2kgKyAxXV0pO1xuICAgICAgICBhcnIucHVzaCh2ZXJ0aWNlc1t0cmlhbmd1bGF0ZWRbaSArIDJdXSk7XG4gICAgICAgIHRoaXMudHJpYW5nbGVzLnB1c2goYXJyKTtcbiAgICAgIH1cblxuICAgICAgLy8gbWFwIHRvIGFycmF5IG9mIFRyaWFuZ2xlIG9iamVjdHNcbiAgICAgIHRoaXMudHJpYW5nbGVzID0gdGhpcy50cmlhbmdsZXMubWFwKGZ1bmN0aW9uKHRyaWFuZ2xlKSB7XG4gICAgICAgIHJldHVybiBuZXcgVHJpYW5nbGUobmV3IFBvaW50KHRyaWFuZ2xlWzBdKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXcgUG9pbnQodHJpYW5nbGVbMV0pLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ldyBQb2ludCh0cmlhbmdsZVsyXSkpO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmVzZXRQb2ludENvbG9ycygpIHtcbiAgICAgIC8vIHJlc2V0IGNhY2hlZCBjb2xvcnMgb2YgY2VudHJvaWRzIGFuZCBwb2ludHNcbiAgICAgIHZhciBpO1xuICAgICAgZm9yIChpID0gMDsgaSA8IHRoaXMudHJpYW5nbGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHRoaXMudHJpYW5nbGVzW2ldLnJlc2V0UG9pbnRDb2xvcnMoKTtcbiAgICAgIH1cblxuICAgICAgZm9yIChpID0gMDsgaSA8IHRoaXMucG9pbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHRoaXMucG9pbnRzW2ldLnJlc2V0Q29sb3IoKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBjcmVhdGUgcmFuZG9tIHJhZGlhbCBncmFkaWVudCBjaXJjbGVzIGZvciByZW5kZXJpbmcgbGF0ZXJcbiAgICBnZW5lcmF0ZUdyYWRpZW50cyhtaW5HcmFkaWVudHMsIG1heEdyYWRpZW50cykge1xuICAgICAgdGhpcy5yYWRpYWxHcmFkaWVudHMgPSBbXTtcblxuICAgICAgbWluR3JhZGllbnRzID0gbWluR3JhZGllbnRzIHx8IHRoaXMubWluR3JhZGllbnRzID4gMCA/IG1pbkdyYWRpZW50cyB8fCB0aGlzLm1pbkdyYWRpZW50cyA6IDE7XG4gICAgICBtYXhHcmFkaWVudHMgPSBtYXhHcmFkaWVudHMgfHwgdGhpcy5tYXhHcmFkaWVudHMgPiAwID8gbWF4R3JhZGllbnRzIHx8IHRoaXMubWF4R3JhZGllbnRzIDogMjtcblxuICAgICAgdGhpcy5udW1HcmFkaWVudHMgPSBSYW5kb20ucmFuZG9tQmV0d2VlbihtaW5HcmFkaWVudHMsIG1heEdyYWRpZW50cyk7XG5cbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5udW1HcmFkaWVudHM7IGkrKykge1xuICAgICAgICB0aGlzLmdlbmVyYXRlUmFkaWFsR3JhZGllbnQoKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBnZW5lcmF0ZVJhZGlhbEdyYWRpZW50KCkge1xuICAgICAgLyoqXG4gICAgICAgICogY3JlYXRlIGEgbmljZS1sb29raW5nIGJ1dCBzb21ld2hhdCByYW5kb20gZ3JhZGllbnQ6XG4gICAgICAgICogcmFuZG9taXplIHRoZSBmaXJzdCBjaXJjbGVcbiAgICAgICAgKiB0aGUgc2Vjb25kIGNpcmNsZSBzaG91bGQgYmUgaW5zaWRlIHRoZSBmaXJzdCBjaXJjbGUsXG4gICAgICAgICogc28gd2UgZ2VuZXJhdGUgYSBwb2ludCAob3JpZ2luMikgaW5zaWRlIGNpcmxlMVxuICAgICAgICAqIHRoZW4gY2FsY3VsYXRlIHRoZSBkaXN0IGJldHdlZW4gb3JpZ2luMiBhbmQgdGhlIGNpcmN1bWZyZW5jZSBvZiBjaXJjbGUxXG4gICAgICAgICogY2lyY2xlMidzIHJhZGl1cyBjYW4gYmUgYmV0d2VlbiAwIGFuZCB0aGlzIGRpc3RcbiAgICAgICAgKi9cblxuICAgICAgdmFyIG1pblggPSBNYXRoLmNlaWwoTWF0aC5zcXJ0KHRoaXMuY2FudmFzLndpZHRoKSk7XG4gICAgICB2YXIgbWF4WCA9IE1hdGguY2VpbCh0aGlzLmNhbnZhcy53aWR0aCAtIE1hdGguc3FydCh0aGlzLmNhbnZhcy53aWR0aCkpO1xuXG4gICAgICB2YXIgbWluWSA9IE1hdGguY2VpbChNYXRoLnNxcnQodGhpcy5jYW52YXMuaGVpZ2h0KSk7XG4gICAgICB2YXIgbWF4WSA9IE1hdGguY2VpbCh0aGlzLmNhbnZhcy5oZWlnaHQgLSBNYXRoLnNxcnQodGhpcy5jYW52YXMuaGVpZ2h0KSk7XG5cbiAgICAgIHZhciBtaW5SYWRpdXMgPSBNYXRoLmNlaWwoTWF0aC5tYXgodGhpcy5jYW52YXMuaGVpZ2h0LCB0aGlzLmNhbnZhcy53aWR0aCkgL1xuICAgICAgICAgICAgICAgICAgICAgIE1hdGgubWF4KE1hdGguc3FydCh0aGlzLm51bUdyYWRpZW50cyksIDIpKTtcbiAgICAgIHZhciBtYXhSYWRpdXMgPSBNYXRoLmNlaWwoTWF0aC5tYXgodGhpcy5jYW52YXMuaGVpZ2h0LCB0aGlzLmNhbnZhcy53aWR0aCkgL1xuICAgICAgICAgICAgICAgICAgICAgIE1hdGgubWF4KE1hdGgubG9nKHRoaXMubnVtR3JhZGllbnRzKSwgMSkpO1xuXG4gICAgICAvLyBoZWxwZXIgcmFuZG9tIGZ1bmN0aW9uc1xuICAgICAgdmFyIHJhbmRvbUNhbnZhc1ggPSBSYW5kb20ucmFuZG9tTnVtYmVyRnVuY3Rpb24obWluWCwgbWF4WCk7XG4gICAgICB2YXIgcmFuZG9tQ2FudmFzWSA9IFJhbmRvbS5yYW5kb21OdW1iZXJGdW5jdGlvbihtaW5ZLCBtYXhZKTtcbiAgICAgIHZhciByYW5kb21DYW52YXNSYWRpdXMgPSBSYW5kb20ucmFuZG9tTnVtYmVyRnVuY3Rpb24obWluUmFkaXVzLCBtYXhSYWRpdXMpO1xuXG4gICAgICAvLyBnZW5lcmF0ZSBjaXJjbGUxIG9yaWdpbiBhbmQgcmFkaXVzXG4gICAgICB2YXIgeDA7XG4gICAgICB2YXIgeTA7XG4gICAgICB2YXIgcjAgPSByYW5kb21DYW52YXNSYWRpdXMoKTtcblxuICAgICAgLy8gb3JpZ2luIG9mIHRoZSBuZXh0IGNpcmNsZSBzaG91bGQgYmUgY29udGFpbmVkXG4gICAgICAvLyB3aXRoaW4gdGhlIGFyZWEgb2YgaXRzIHByZWRlY2Vzc29yXG4gICAgICBpZiAodGhpcy5yYWRpYWxHcmFkaWVudHMubGVuZ3RoID4gMCkge1xuICAgICAgICB2YXIgbGFzdEdyYWRpZW50ID0gdGhpcy5yYWRpYWxHcmFkaWVudHNbdGhpcy5yYWRpYWxHcmFkaWVudHMubGVuZ3RoIC0gMV07XG4gICAgICAgIHZhciBwb2ludEluTGFzdENpcmNsZSA9IFJhbmRvbS5yYW5kb21JbkNpcmNsZShsYXN0R3JhZGllbnQucjAsIGxhc3RHcmFkaWVudC54MCwgbGFzdEdyYWRpZW50LnkwKTtcblxuICAgICAgICAvLyBvcmlnaW4gbXVzdCBiZSB3aXRoaW4gdGhlIGJvdW5kcyBvZiB0aGUgY2FudmFzXG4gICAgICAgIHdoaWxlIChwb2ludEluTGFzdENpcmNsZS54IDwgMCB8fFxuICAgICAgICAgICAgICAgcG9pbnRJbkxhc3RDaXJjbGUueSA8IDAgfHxcbiAgICAgICAgICAgICAgIHBvaW50SW5MYXN0Q2lyY2xlLnggPiB0aGlzLmNhbnZhcy53aWR0aCB8fFxuICAgICAgICAgICAgICAgcG9pbnRJbkxhc3RDaXJjbGUueSA+IHRoaXMuY2FudmFzLmhlaWdodCkge1xuICAgICAgICAgIHBvaW50SW5MYXN0Q2lyY2xlID0gUmFuZG9tLnJhbmRvbUluQ2lyY2xlKGxhc3RHcmFkaWVudC5yMCwgbGFzdEdyYWRpZW50LngwLCBsYXN0R3JhZGllbnQueTApO1xuICAgICAgICB9XG4gICAgICAgIHgwID0gcG9pbnRJbkxhc3RDaXJjbGUueDtcbiAgICAgICAgeTAgPSBwb2ludEluTGFzdENpcmNsZS55O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gZmlyc3QgY2lyY2xlLCBqdXN0IHBpY2sgYXQgcmFuZG9tXG4gICAgICAgIHgwID0gcmFuZG9tQ2FudmFzWCgpO1xuICAgICAgICB5MCA9IHJhbmRvbUNhbnZhc1koKTtcbiAgICAgIH1cblxuICAgICAgLy8gZmluZCBhIHJhbmRvbSBwb2ludCBpbnNpZGUgY2lyY2xlMVxuICAgICAgLy8gdGhpcyBpcyB0aGUgb3JpZ2luIG9mIGNpcmNsZSAyXG4gICAgICB2YXIgcG9pbnRJbkNpcmNsZSA9IFJhbmRvbS5yYW5kb21JbkNpcmNsZShyMCAqIDAuMDksIHgwLCB5MCk7XG5cbiAgICAgIC8vIGdyYWIgdGhlIHgveSBjb29yZHNcbiAgICAgIHZhciB4MSA9IHBvaW50SW5DaXJjbGUueDtcbiAgICAgIHZhciB5MSA9IHBvaW50SW5DaXJjbGUueTtcblxuICAgICAgLy8gZmluZCBkaXN0YW5jZSBiZXR3ZWVuIHRoZSBwb2ludCBhbmQgdGhlIGNpcmN1bWZyaWVuY2Ugb2YgY2lyY2xlMVxuICAgICAgLy8gdGhlIHJhZGl1cyBvZiB0aGUgc2Vjb25kIGNpcmNsZSB3aWxsIGJlIGEgZnVuY3Rpb24gb2YgdGhpcyBkaXN0YW5jZVxuICAgICAgdmFyIHZYID0geDEgLSB4MDtcbiAgICAgIHZhciB2WSA9IHkxIC0geTA7XG4gICAgICB2YXIgbWFnViA9IE1hdGguc3FydCh2WCAqIHZYICsgdlkgKiB2WSk7XG4gICAgICB2YXIgYVggPSB4MCArIHZYIC8gbWFnViAqIHIwO1xuICAgICAgdmFyIGFZID0geTAgKyB2WSAvIG1hZ1YgKiByMDtcblxuICAgICAgdmFyIGRpc3QgPSBNYXRoLnNxcnQoKHgxIC0gYVgpICogKHgxIC0gYVgpICsgKHkxIC0gYVkpICogKHkxIC0gYVkpKTtcblxuICAgICAgLy8gZ2VuZXJhdGUgdGhlIHJhZGl1cyBvZiBjaXJjbGUyIGJhc2VkIG9uIHRoaXMgZGlzdGFuY2VcbiAgICAgIHZhciByMSA9IFJhbmRvbS5yYW5kb21CZXR3ZWVuKDEsIE1hdGguc3FydChkaXN0KSk7XG5cbiAgICAgIC8vIHJhbmRvbSBidXQgbmljZSBsb29raW5nIGNvbG9yIHN0b3BcbiAgICAgIHZhciBjb2xvclN0b3AgPSBSYW5kb20ucmFuZG9tQmV0d2VlbigyLCA4KSAvIDEwO1xuXG4gICAgICB0aGlzLnJhZGlhbEdyYWRpZW50cy5wdXNoKHt4MCwgeTAsIHIwLCB4MSwgeTEsIHIxLCBjb2xvclN0b3B9KTtcbiAgICB9XG5cbiAgICAvLyBzb3J0cyB0aGUgcG9pbnRzXG4gICAgc29ydFBvaW50cygpIHtcbiAgICAgIC8vIHNvcnQgcG9pbnRzXG4gICAgICB0aGlzLnBvaW50cy5zb3J0KGZ1bmN0aW9uKGEsIGIpIHtcbiAgICAgICAgLy8gc29ydCB0aGUgcG9pbnRcbiAgICAgICAgaWYgKGEueCA8IGIueCkge1xuICAgICAgICAgIHJldHVybiAtMTtcbiAgICAgICAgfSBlbHNlIGlmIChhLnggPiBiLngpIHtcbiAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgfSBlbHNlIGlmIChhLnkgPCBiLnkpIHtcbiAgICAgICAgICByZXR1cm4gLTE7XG4gICAgICAgIH0gZWxzZSBpZiAoYS55ID4gYi55KSB7XG4gICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIHNpemUgdGhlIGNhbnZhcyB0byB0aGUgc2l6ZSBvZiBpdHMgcGFyZW50XG4gICAgLy8gbWFrZXMgdGhlIGNhbnZhcyAncmVzcG9uc2l2ZSdcbiAgICByZXNpemVDYW52YXMoKSB7XG4gICAgICB2YXIgcGFyZW50ID0gdGhpcy5jYW52YXMucGFyZW50RWxlbWVudDtcbiAgICAgIHRoaXMuY2FudmFzLndpZHRoID0gdGhpcy53aWR0aCA9IHBhcmVudC5vZmZzZXRXaWR0aDtcbiAgICAgIHRoaXMuY2FudmFzLmhlaWdodCA9IHRoaXMuaGVpZ2h0ID0gcGFyZW50Lm9mZnNldEhlaWdodDtcblxuICAgICAgaWYgKHRoaXMuaG92ZXJTaGFkb3dDYW52YXMpIHtcbiAgICAgICAgdGhpcy5ob3ZlclNoYWRvd0NhbnZhcy53aWR0aCA9IHRoaXMud2lkdGggPSBwYXJlbnQub2Zmc2V0V2lkdGg7XG4gICAgICAgIHRoaXMuaG92ZXJTaGFkb3dDYW52YXMuaGVpZ2h0ID0gdGhpcy5oZWlnaHQgPSBwYXJlbnQub2Zmc2V0SGVpZ2h0O1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIG1vdmVzIHBvaW50cy90cmlhbmdsZXMgYmFzZWQgb24gbmV3IHNpemUgb2YgY2FudmFzXG4gICAgcmVzY2FsZSgpIHtcbiAgICAgIC8vIGdyYWIgb2xkIG1heC9taW4gZnJvbSBjdXJyZW50IGNhbnZhcyBzaXplXG4gICAgICB2YXIgeE1pbiA9IDA7XG4gICAgICB2YXIgeE1heCA9IHRoaXMuY2FudmFzLndpZHRoO1xuICAgICAgdmFyIHlNaW4gPSAwO1xuICAgICAgdmFyIHlNYXggPSB0aGlzLmNhbnZhcy5oZWlnaHQ7XG5cbiAgICAgIHRoaXMucmVzaXplQ2FudmFzKCk7XG5cbiAgICAgIGlmICh0aGlzLm9wdGlvbnMucmVzaXplTW9kZSA9PT0gJ3NjYWxlUG9pbnRzJykge1xuICAgICAgICAvLyBzY2FsZSBhbGwgcG9pbnRzIHRvIG5ldyBtYXggZGltZW5zaW9uc1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMucG9pbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgdGhpcy5wb2ludHNbaV0ucmVzY2FsZSh4TWluLCB4TWF4LCB5TWluLCB5TWF4LCAwLCB0aGlzLmNhbnZhcy53aWR0aCwgMCwgdGhpcy5jYW52YXMuaGVpZ2h0KTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5nZW5lcmF0ZU5ld1BvaW50cygpO1xuICAgICAgfVxuXG4gICAgICB0aGlzLnRyaWFuZ3VsYXRlKCk7XG5cbiAgICAgIC8vIHJlc2NhbGUgcG9zaXRpb24gb2YgcmFkaWFsIGdyYWRpZW50IGNpcmNsZXNcbiAgICAgIHRoaXMucmVzY2FsZUdyYWRpZW50cyh0aGlzLnJhZGlhbEdyYWRpZW50cywgeE1pbiwgeE1heCwgeU1pbiwgeU1heCk7XG4gICAgICB0aGlzLnJlc2NhbGVHcmFkaWVudHModGhpcy5jdXJyZW50R3JhZGllbnRzLCB4TWluLCB4TWF4LCB5TWluLCB5TWF4KTtcbiAgICAgIHRoaXMucmVzY2FsZUdyYWRpZW50cyh0aGlzLm5leHRHcmFkaWVudHMsIHhNaW4sIHhNYXgsIHlNaW4sIHlNYXgpO1xuXG4gICAgICB0aGlzLnJlbmRlcigpO1xuICAgIH1cblxuICAgIHJlc2NhbGVHcmFkaWVudHMoYXJyYXksIHhNaW4sIHhNYXgsIHlNaW4sIHlNYXgpIHtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJyYXkubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIGNpcmNsZTAgPSBuZXcgUG9pbnQoYXJyYXlbaV0ueDAsIGFycmF5W2ldLnkwKTtcbiAgICAgICAgdmFyIGNpcmNsZTEgPSBuZXcgUG9pbnQoYXJyYXlbaV0ueDEsIGFycmF5W2ldLnkxKTtcblxuICAgICAgICBjaXJjbGUwLnJlc2NhbGUoeE1pbiwgeE1heCwgeU1pbiwgeU1heCwgMCwgdGhpcy5jYW52YXMud2lkdGgsIDAsIHRoaXMuY2FudmFzLmhlaWdodCk7XG4gICAgICAgIGNpcmNsZTEucmVzY2FsZSh4TWluLCB4TWF4LCB5TWluLCB5TWF4LCAwLCB0aGlzLmNhbnZhcy53aWR0aCwgMCwgdGhpcy5jYW52YXMuaGVpZ2h0KTtcblxuICAgICAgICBhcnJheVtpXS54MCA9IGNpcmNsZTAueDtcbiAgICAgICAgYXJyYXlbaV0ueTAgPSBjaXJjbGUwLnk7XG4gICAgICAgIGFycmF5W2ldLngxID0gY2lyY2xlMS54O1xuICAgICAgICBhcnJheVtpXS55MSA9IGNpcmNsZTEueTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBob3ZlcigpIHtcbiAgICAgIGlmICh0aGlzLm1vdXNlUG9zaXRpb24pIHtcbiAgICAgICAgdmFyIHJnYiA9IHRoaXMubW91c2VQb3NpdGlvbi5jYW52YXNDb2xvckF0UG9pbnQodGhpcy5zaGFkb3dJbWFnZURhdGEsICdyZ2InKTtcbiAgICAgICAgdmFyIGhleCA9IENvbG9yLnJnYlRvSGV4KHJnYik7XG4gICAgICAgIHZhciBkZWMgPSBwYXJzZUludChoZXgsIDE2KTtcblxuICAgICAgICAvLyBpcyBwcm9iYWJseSB0cmlhbmdsZSB3aXRoIHRoYXQgaW5kZXgsIGJ1dFxuICAgICAgICAvLyBlZGdlcyBjYW4gYmUgZnV6enkgc28gZG91YmxlIGNoZWNrXG4gICAgICAgIGlmIChkZWMgPj0gMCAmJiBkZWMgPCB0aGlzLnRyaWFuZ2xlcy5sZW5ndGggJiYgdGhpcy50cmlhbmdsZXNbZGVjXS5wb2ludEluVHJpYW5nbGUodGhpcy5tb3VzZVBvc2l0aW9uKSkge1xuICAgICAgICAgIC8vIGNsZWFyIHRoZSBsYXN0IHRyaWFuZ2xlXG4gICAgICAgICAgdGhpcy5yZXNldFRyaWFuZ2xlKCk7XG5cbiAgICAgICAgICBpZiAodGhpcy5sYXN0VHJpYW5nbGUgIT09IGRlYykge1xuICAgICAgICAgICAgLy8gcmVuZGVyIHRoZSBob3ZlcmVkIHRyaWFuZ2xlXG4gICAgICAgICAgICB0aGlzLm9wdGlvbnMub25UcmlhbmdsZUhvdmVyKHRoaXMudHJpYW5nbGVzW2RlY10sIHRoaXMuY3R4LCB0aGlzLm9wdGlvbnMpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHRoaXMubGFzdFRyaWFuZ2xlID0gZGVjO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLnJlc2V0VHJpYW5nbGUoKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXNldFRyaWFuZ2xlKCkge1xuICAgICAgLy8gcmVkcmF3IHRoZSBsYXN0IHRyaWFuZ2xlIHRoYXQgd2FzIGhvdmVyZWQgb3ZlclxuICAgICAgaWYgKHRoaXMubGFzdFRyaWFuZ2xlICYmIHRoaXMubGFzdFRyaWFuZ2xlID49IDAgJiYgdGhpcy5sYXN0VHJpYW5nbGUgPCB0aGlzLnRyaWFuZ2xlcy5sZW5ndGgpIHtcbiAgICAgICAgdmFyIGxhc3RUcmlhbmdsZSA9IHRoaXMudHJpYW5nbGVzW3RoaXMubGFzdFRyaWFuZ2xlXTtcblxuICAgICAgICAvLyBmaW5kIHRoZSBib3VuZGluZyBwb2ludHMgb2YgdGhlIGxhc3QgdHJpYW5nbGVcbiAgICAgICAgLy8gZXhwYW5kIGEgYml0IGZvciBlZGdlc1xuICAgICAgICB2YXIgbWluWCA9IGxhc3RUcmlhbmdsZS5taW5YKCkgLSAxO1xuICAgICAgICB2YXIgbWluWSA9IGxhc3RUcmlhbmdsZS5taW5ZKCkgLSAxO1xuICAgICAgICB2YXIgbWF4WCA9IGxhc3RUcmlhbmdsZS5tYXhYKCkgKyAxO1xuICAgICAgICB2YXIgbWF4WSA9IGxhc3RUcmlhbmdsZS5tYXhZKCkgKyAxO1xuXG4gICAgICAgIC8vIHJlc2V0IHRoYXQgcG9ydGlvbiBvZiB0aGUgY2FudmFzIHRvIGl0cyBvcmlnaW5hbCByZW5kZXJcbiAgICAgICAgdGhpcy5jdHgucHV0SW1hZ2VEYXRhKHRoaXMucmVuZGVyZWRJbWFnZURhdGEsIDAsIDAsIG1pblgsIG1pblksIG1heFggLSBtaW5YLCBtYXhZIC0gbWluWSk7XG5cbiAgICAgICAgdGhpcy5sYXN0VHJpYW5nbGUgPSBmYWxzZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZW5kZXIoKSB7XG4gICAgICB0aGlzLnJlbmRlckJhY2tncm91bmQodGhpcy5yZW5kZXJGb3JlZ3JvdW5kLmJpbmQodGhpcykpO1xuICAgIH1cblxuICAgIHJlbmRlckJhY2tncm91bmQoY2FsbGJhY2spIHtcbiAgICAgIC8vIHJlbmRlciB0aGUgYmFzZSB0byBnZXQgdHJpYW5nbGUgY29sb3JzXG4gICAgICBpZiAodGhpcy5vcHRpb25zLmltYWdlQXNCYWNrZ3JvdW5kKSB7XG4gICAgICAgIHRoaXMucmVuZGVySW1hZ2VCYWNrZ3JvdW5kKGNhbGxiYWNrKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMucmVuZGVyR3JhZGllbnQoKTtcbiAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZW5kZXJGb3JlZ3JvdW5kKCkge1xuICAgICAgLy8gZ2V0IGVudGlyZSBjYW52YXMgaW1hZ2UgZGF0YSBvZiBpbiBhIGJpZyB0eXBlZCBhcnJheVxuICAgICAgLy8gdGhpcyB3YXkgd2UgZG9udCBoYXZlIHRvIHBpY2sgZm9yIGVhY2ggcG9pbnQgaW5kaXZpZHVhbGx5XG4gICAgICAvLyBpdCdzIGxpa2UgNTB4IGZhc3RlciB0aGlzIHdheVxuICAgICAgdGhpcy5ncmFkaWVudEltYWdlRGF0YSA9IHRoaXMuY3R4LmdldEltYWdlRGF0YSgwLCAwLCB0aGlzLmNhbnZhcy53aWR0aCwgdGhpcy5jYW52YXMuaGVpZ2h0KTtcblxuICAgICAgLy8gcmVuZGVycyB0cmlhbmdsZXMsIGVkZ2VzLCBhbmQgc2hhZG93IGNhbnZhcyBmb3IgaG92ZXIgZGV0ZWN0aW9uXG4gICAgICB0aGlzLnJlbmRlclRyaWFuZ2xlcyh0aGlzLm9wdGlvbnMuc2hvd1RyaWFuZ2xlcywgdGhpcy5vcHRpb25zLnNob3dFZGdlcyk7XG5cbiAgICAgIHRoaXMucmVuZGVyRXh0cmFzKCk7XG5cbiAgICAgIHRoaXMucmVuZGVyZWRJbWFnZURhdGEgPSB0aGlzLmN0eC5nZXRJbWFnZURhdGEoMCwgMCwgdGhpcy5jYW52YXMud2lkdGgsIHRoaXMuY2FudmFzLmhlaWdodCk7XG5cbiAgICAgIC8vIHRocm93IGV2ZW50cyBmb3IgbGlnaHQgLyBkYXJrIHRleHRcbiAgICAgIHZhciBjZW50ZXJDb2xvciA9IHRoaXMuY2VudGVyLmNhbnZhc0NvbG9yQXRQb2ludCgpO1xuXG4gICAgICBpZiAocGFyc2VJbnQoY2VudGVyQ29sb3Iuc3BsaXQoJywnKVsyXSkgPCA1MCkge1xuICAgICAgICB0aGlzLm9wdGlvbnMub25EYXJrQmFja2dyb3VuZChjZW50ZXJDb2xvcik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLm9wdGlvbnMub25MaWdodEJhY2tncm91bmQoY2VudGVyQ29sb3IpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJlbmRlckV4dHJhcygpIHtcbiAgICAgIGlmICh0aGlzLm9wdGlvbnMuc2hvd1BvaW50cykge1xuICAgICAgICB0aGlzLnJlbmRlclBvaW50cygpO1xuICAgICAgfVxuXG4gICAgICBpZiAodGhpcy5vcHRpb25zLnNob3dDaXJjbGVzICYmICF0aGlzLm9wdGlvbnMuaW1hZ2VBc0JhY2tncm91bmQpIHtcbiAgICAgICAgdGhpcy5yZW5kZXJHcmFkaWVudENpcmNsZXMoKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMub3B0aW9ucy5zaG93Q2VudHJvaWRzKSB7XG4gICAgICAgIHRoaXMucmVuZGVyQ2VudHJvaWRzKCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmVuZGVyTmV3Q29sb3JzKGNvbG9ycykge1xuICAgICAgdGhpcy5jb2xvcnMgPSBjb2xvcnMgfHwgdGhpcy5jb2xvcnM7XG4gICAgICAvLyB0cmlhbmdsZSBjZW50cm9pZHMgbmVlZCBuZXcgY29sb3JzXG4gICAgICB0aGlzLnJlc2V0UG9pbnRDb2xvcnMoKTtcbiAgICAgIHRoaXMucmVuZGVyKCk7XG4gICAgfVxuXG4gICAgcmVuZGVyTmV3R3JhZGllbnQobWluR3JhZGllbnRzLCBtYXhHcmFkaWVudHMpIHtcbiAgICAgIHRoaXMuZ2VuZXJhdGVHcmFkaWVudHMobWluR3JhZGllbnRzLCBtYXhHcmFkaWVudHMpO1xuXG4gICAgICAvLyBwcmVwIGZvciBhbmltYXRpb25cbiAgICAgIHRoaXMubmV4dEdyYWRpZW50cyA9IHRoaXMucmFkaWFsR3JhZGllbnRzLnNsaWNlKDApO1xuICAgICAgdGhpcy5nZW5lcmF0ZUdyYWRpZW50cygpO1xuICAgICAgdGhpcy5jdXJyZW50R3JhZGllbnRzID0gdGhpcy5yYWRpYWxHcmFkaWVudHMuc2xpY2UoMCk7XG5cbiAgICAgIHRoaXMucmVzZXRQb2ludENvbG9ycygpO1xuICAgICAgdGhpcy5yZW5kZXIoKTtcbiAgICB9XG5cbiAgICByZW5kZXJOZXdUcmlhbmdsZXMobWluLCBtYXgsIG1pbkVkZ2UsIG1heEVkZ2UsIG11bHRpcGxpZXIpIHtcbiAgICAgIHRoaXMuZ2VuZXJhdGVOZXdQb2ludHMobWluLCBtYXgsIG1pbkVkZ2UsIG1heEVkZ2UsIG11bHRpcGxpZXIpO1xuICAgICAgdGhpcy50cmlhbmd1bGF0ZSgpO1xuICAgICAgdGhpcy5yZW5kZXIoKTtcbiAgICB9XG5cbiAgICByZW5kZXJHcmFkaWVudCgpIHtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5yYWRpYWxHcmFkaWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgLy8gY3JlYXRlIHRoZSByYWRpYWwgZ3JhZGllbnQgYmFzZWQgb25cbiAgICAgICAgLy8gdGhlIGdlbmVyYXRlZCBjaXJjbGVzJyByYWRpaSBhbmQgb3JpZ2luc1xuICAgICAgICB2YXIgcmFkaWFsR3JhZGllbnQgPSB0aGlzLmN0eC5jcmVhdGVSYWRpYWxHcmFkaWVudChcbiAgICAgICAgICB0aGlzLnJhZGlhbEdyYWRpZW50c1tpXS54MCxcbiAgICAgICAgICB0aGlzLnJhZGlhbEdyYWRpZW50c1tpXS55MCxcbiAgICAgICAgICB0aGlzLnJhZGlhbEdyYWRpZW50c1tpXS5yMCxcbiAgICAgICAgICB0aGlzLnJhZGlhbEdyYWRpZW50c1tpXS54MSxcbiAgICAgICAgICB0aGlzLnJhZGlhbEdyYWRpZW50c1tpXS55MSxcbiAgICAgICAgICB0aGlzLnJhZGlhbEdyYWRpZW50c1tpXS5yMVxuICAgICAgICApO1xuXG4gICAgICAgIHZhciBvdXRlckNvbG9yID0gdGhpcy5jb2xvcnNbMl07XG5cbiAgICAgICAgLy8gbXVzdCBiZSB0cmFuc3BhcmVudCB2ZXJzaW9uIG9mIG1pZGRsZSBjb2xvclxuICAgICAgICAvLyB0aGlzIHdvcmtzIGZvciByZ2JhIGFuZCBoc2xhXG4gICAgICAgIGlmIChpID4gMCkge1xuICAgICAgICAgIG91dGVyQ29sb3IgPSB0aGlzLmNvbG9yc1sxXS5zcGxpdCgnLCcpO1xuICAgICAgICAgIG91dGVyQ29sb3JbM10gPSAnMCknO1xuICAgICAgICAgIG91dGVyQ29sb3IgPSBvdXRlckNvbG9yLmpvaW4oJywnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJhZGlhbEdyYWRpZW50LmFkZENvbG9yU3RvcCgxLCB0aGlzLmNvbG9yc1swXSk7XG4gICAgICAgIHJhZGlhbEdyYWRpZW50LmFkZENvbG9yU3RvcCh0aGlzLnJhZGlhbEdyYWRpZW50c1tpXS5jb2xvclN0b3AsIHRoaXMuY29sb3JzWzFdKTtcbiAgICAgICAgcmFkaWFsR3JhZGllbnQuYWRkQ29sb3JTdG9wKDAsIG91dGVyQ29sb3IpO1xuXG4gICAgICAgIHRoaXMuY2FudmFzLnBhcmVudEVsZW1lbnQuc3R5bGUuYmFja2dyb3VuZENvbG9yID0gdGhpcy5jb2xvcnNbMl07XG5cbiAgICAgICAgdGhpcy5jdHguZmlsbFN0eWxlID0gcmFkaWFsR3JhZGllbnQ7XG4gICAgICAgIHRoaXMuY3R4LmZpbGxSZWN0KDAsIDAsIHRoaXMuY2FudmFzLndpZHRoLCB0aGlzLmNhbnZhcy5oZWlnaHQpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJlbmRlckltYWdlQmFja2dyb3VuZChjYWxsYmFjaykge1xuICAgICAgdGhpcy5sb2FkSW1hZ2VCYWNrZ3JvdW5kKChmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gc2NhbGUgaW1hZ2UgdG8gZml0IHdpZHRoL2hlaWdodCBvZiBjYW52YXNcbiAgICAgICAgbGV0IGhlaWdodE11bHRpcGxpZXIgPSB0aGlzLmNhbnZhcy5oZWlnaHQgLyB0aGlzLmltYWdlLmhlaWdodDtcbiAgICAgICAgbGV0IHdpZHRoTXVsdGlwbGllciA9IHRoaXMuY2FudmFzLndpZHRoIC8gdGhpcy5pbWFnZS53aWR0aDtcblxuICAgICAgICBsZXQgbXVsdGlwbGllciA9IE1hdGgubWF4KGhlaWdodE11bHRpcGxpZXIsIHdpZHRoTXVsdGlwbGllcik7XG5cbiAgICAgICAgdGhpcy5jdHguZHJhd0ltYWdlKHRoaXMuaW1hZ2UsIDAsIDAsIHRoaXMuaW1hZ2Uud2lkdGggKiBtdWx0aXBsaWVyLCB0aGlzLmltYWdlLmhlaWdodCAqIG11bHRpcGxpZXIpO1xuXG4gICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICB9KS5iaW5kKHRoaXMpKTtcbiAgICB9XG5cbiAgICBsb2FkSW1hZ2VCYWNrZ3JvdW5kKGNhbGxiYWNrKSB7XG4gICAgICBpZiAodGhpcy5pbWFnZSAmJiB0aGlzLmltYWdlLnNyYyA9PT0gdGhpcy5vcHRpb25zLmltYWdlVVJMKSB7XG4gICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmltYWdlID0gbmV3IEltYWdlKCk7XG4gICAgICAgIHRoaXMuaW1hZ2UuY3Jvc3NPcmlnaW4gPSAnQW5vbnltb3VzJztcbiAgICAgICAgdGhpcy5pbWFnZS5zcmMgPSB0aGlzLm9wdGlvbnMuaW1hZ2VVUkw7XG5cbiAgICAgICAgdGhpcy5pbWFnZS5vbmxvYWQgPSBjYWxsYmFjaztcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZW5kZXJUcmlhbmdsZXModHJpYW5nbGVzLCBlZGdlcykge1xuICAgICAgLy8gc2F2ZSB0aGlzIGZvciBsYXRlclxuICAgICAgdGhpcy5jZW50ZXIuY2FudmFzQ29sb3JBdFBvaW50KHRoaXMuZ3JhZGllbnRJbWFnZURhdGEpO1xuXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMudHJpYW5nbGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIC8vIHRoZSBjb2xvciBpcyBkZXRlcm1pbmVkIGJ5IGdyYWJiaW5nIHRoZSBjb2xvciBvZiB0aGUgY2FudmFzXG4gICAgICAgIC8vICh3aGVyZSB3ZSBkcmV3IHRoZSBncmFkaWVudCkgYXQgdGhlIGNlbnRlciBvZiB0aGUgdHJpYW5nbGVcblxuICAgICAgICB0aGlzLnRyaWFuZ2xlc1tpXS5jb2xvciA9IHRoaXMudHJpYW5nbGVzW2ldLmNvbG9yQXRDZW50cm9pZCh0aGlzLmdyYWRpZW50SW1hZ2VEYXRhKTtcblxuICAgICAgICBpZiAodHJpYW5nbGVzICYmIGVkZ2VzKSB7XG4gICAgICAgICAgdGhpcy50cmlhbmdsZXNbaV0uc3Ryb2tlID0gdGhpcy5vcHRpb25zLmVkZ2VDb2xvcih0aGlzLnRyaWFuZ2xlc1tpXS5jb2xvckF0Q2VudHJvaWQodGhpcy5ncmFkaWVudEltYWdlRGF0YSkpO1xuICAgICAgICAgIHRoaXMudHJpYW5nbGVzW2ldLnJlbmRlcih0aGlzLmN0eCk7XG4gICAgICAgIH0gZWxzZSBpZiAodHJpYW5nbGVzKSB7XG4gICAgICAgICAgLy8gdHJpYW5nbGVzIG9ubHlcbiAgICAgICAgICB0aGlzLnRyaWFuZ2xlc1tpXS5zdHJva2UgPSB0aGlzLnRyaWFuZ2xlc1tpXS5jb2xvcjtcbiAgICAgICAgICB0aGlzLnRyaWFuZ2xlc1tpXS5yZW5kZXIodGhpcy5jdHgpO1xuICAgICAgICB9IGVsc2UgaWYgKGVkZ2VzKSB7XG4gICAgICAgICAgLy8gZWRnZXMgb25seVxuICAgICAgICAgIHRoaXMudHJpYW5nbGVzW2ldLnN0cm9rZSA9IHRoaXMub3B0aW9ucy5lZGdlQ29sb3IodGhpcy50cmlhbmdsZXNbaV0uY29sb3JBdENlbnRyb2lkKHRoaXMuZ3JhZGllbnRJbWFnZURhdGEpKTtcbiAgICAgICAgICB0aGlzLnRyaWFuZ2xlc1tpXS5yZW5kZXIodGhpcy5jdHgsIGZhbHNlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLmhvdmVyU2hhZG93Q2FudmFzKSB7XG4gICAgICAgICAgdmFyIGNvbG9yID0gJyMnICsgKCcwMDAwMDAnICsgaS50b1N0cmluZygxNikpLnNsaWNlKC02KTtcbiAgICAgICAgICB0aGlzLnRyaWFuZ2xlc1tpXS5yZW5kZXIodGhpcy5zaGFkb3dDdHgsIGNvbG9yLCBmYWxzZSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMuaG92ZXJTaGFkb3dDYW52YXMpIHtcbiAgICAgICAgdGhpcy5zaGFkb3dJbWFnZURhdGEgPSB0aGlzLnNoYWRvd0N0eC5nZXRJbWFnZURhdGEoMCwgMCwgdGhpcy5jYW52YXMud2lkdGgsIHRoaXMuY2FudmFzLmhlaWdodCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gcmVuZGVycyB0aGUgcG9pbnRzIG9mIHRoZSB0cmlhbmdsZXNcbiAgICByZW5kZXJQb2ludHMoKSB7XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMucG9pbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBjb2xvciA9IHRoaXMub3B0aW9ucy5wb2ludENvbG9yKHRoaXMucG9pbnRzW2ldLmNhbnZhc0NvbG9yQXRQb2ludCh0aGlzLmdyYWRpZW50SW1hZ2VEYXRhKSk7XG4gICAgICAgIHRoaXMucG9pbnRzW2ldLnJlbmRlcih0aGlzLmN0eCwgY29sb3IpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIGRyYXdzIHRoZSBjaXJjbGVzIHRoYXQgZGVmaW5lIHRoZSBncmFkaWVudHNcbiAgICByZW5kZXJHcmFkaWVudENpcmNsZXMoKSB7XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMucmFkaWFsR3JhZGllbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHRoaXMuY3R4LmJlZ2luUGF0aCgpO1xuICAgICAgICB0aGlzLmN0eC5hcmModGhpcy5yYWRpYWxHcmFkaWVudHNbaV0ueDAsXG4gICAgICAgICAgICAgICAgdGhpcy5yYWRpYWxHcmFkaWVudHNbaV0ueTAsXG4gICAgICAgICAgICAgICAgdGhpcy5yYWRpYWxHcmFkaWVudHNbaV0ucjAsXG4gICAgICAgICAgICAgICAgMCwgTWF0aC5QSSAqIDIsIHRydWUpO1xuICAgICAgICB2YXIgY2VudGVyMSA9IG5ldyBQb2ludCh0aGlzLnJhZGlhbEdyYWRpZW50c1tpXS54MCwgdGhpcy5yYWRpYWxHcmFkaWVudHNbaV0ueTApO1xuICAgICAgICB0aGlzLmN0eC5zdHJva2VTdHlsZSA9IGNlbnRlcjEuY2FudmFzQ29sb3JBdFBvaW50KHRoaXMuZ3JhZGllbnRJbWFnZURhdGEpO1xuICAgICAgICB0aGlzLmN0eC5zdHJva2UoKTtcblxuICAgICAgICB0aGlzLmN0eC5iZWdpblBhdGgoKTtcbiAgICAgICAgdGhpcy5jdHguYXJjKHRoaXMucmFkaWFsR3JhZGllbnRzW2ldLngxLFxuICAgICAgICAgICAgICAgIHRoaXMucmFkaWFsR3JhZGllbnRzW2ldLnkxLFxuICAgICAgICAgICAgICAgIHRoaXMucmFkaWFsR3JhZGllbnRzW2ldLnIxLFxuICAgICAgICAgICAgICAgIDAsIE1hdGguUEkgKiAyLCB0cnVlKTtcbiAgICAgICAgdmFyIGNlbnRlcjIgPSBuZXcgUG9pbnQodGhpcy5yYWRpYWxHcmFkaWVudHNbaV0ueDEsIHRoaXMucmFkaWFsR3JhZGllbnRzW2ldLnkxKTtcbiAgICAgICAgdGhpcy5jdHguc3Ryb2tlU3R5bGUgPSBjZW50ZXIyLmNhbnZhc0NvbG9yQXRQb2ludCh0aGlzLmdyYWRpZW50SW1hZ2VEYXRhKTtcbiAgICAgICAgdGhpcy5jdHguc3Ryb2tlKCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gcmVuZGVyIHRyaWFuZ2xlIGNlbnRyb2lkc1xuICAgIHJlbmRlckNlbnRyb2lkcygpIHtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy50cmlhbmdsZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIGNvbG9yID0gdGhpcy5vcHRpb25zLmNlbnRyb2lkQ29sb3IodGhpcy50cmlhbmdsZXNbaV0uY29sb3JBdENlbnRyb2lkKHRoaXMuZ3JhZGllbnRJbWFnZURhdGEpKTtcbiAgICAgICAgdGhpcy50cmlhbmdsZXNbaV0uY2VudHJvaWQoKS5yZW5kZXIodGhpcy5jdHgsIGNvbG9yKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0b2dnbGVUcmlhbmdsZXMoKSB7XG4gICAgICB0aGlzLm9wdGlvbnMuc2hvd1RyaWFuZ2xlcyA9ICF0aGlzLm9wdGlvbnMuc2hvd1RyaWFuZ2xlcztcbiAgICAgIHRoaXMucmVuZGVyKCk7XG4gICAgfVxuXG4gICAgdG9nZ2xlUG9pbnRzKCkge1xuICAgICAgdGhpcy5vcHRpb25zLnNob3dQb2ludHMgPSAhdGhpcy5vcHRpb25zLnNob3dQb2ludHM7XG4gICAgICB0aGlzLnJlbmRlcigpO1xuICAgIH1cblxuICAgIHRvZ2dsZUNpcmNsZXMoKSB7XG4gICAgICB0aGlzLm9wdGlvbnMuc2hvd0NpcmNsZXMgPSAhdGhpcy5vcHRpb25zLnNob3dDaXJjbGVzO1xuICAgICAgdGhpcy5yZW5kZXIoKTtcbiAgICB9XG5cbiAgICB0b2dnbGVDZW50cm9pZHMoKSB7XG4gICAgICB0aGlzLm9wdGlvbnMuc2hvd0NlbnRyb2lkcyA9ICF0aGlzLm9wdGlvbnMuc2hvd0NlbnRyb2lkcztcbiAgICAgIHRoaXMucmVuZGVyKCk7XG4gICAgfVxuXG4gICAgdG9nZ2xlRWRnZXMoKSB7XG4gICAgICB0aGlzLm9wdGlvbnMuc2hvd0VkZ2VzID0gIXRoaXMub3B0aW9ucy5zaG93RWRnZXM7XG4gICAgICB0aGlzLnJlbmRlcigpO1xuICAgIH1cblxuICAgIHRvZ2dsZUFuaW1hdGlvbigpIHtcbiAgICAgIHRoaXMub3B0aW9ucy5hbmltYXRlID0gIXRoaXMub3B0aW9ucy5hbmltYXRlO1xuICAgICAgaWYgKHRoaXMub3B0aW9ucy5hbmltYXRlKSB7XG4gICAgICAgIHRoaXMuaW5pdFJlbmRlckxvb3AoKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBnZXRDb2xvcnMoKSB7XG4gICAgICByZXR1cm4gdGhpcy5jb2xvcnM7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gbGluZWFyU2NhbGUoeDAsIHgxLCBzY2FsZSkge1xuICAgIHJldHVybiB4MCArIChzY2FsZSAqICh4MSAtIHgwKSk7XG4gIH1cblxuICBtb2R1bGUuZXhwb3J0cyA9IFByZXR0eURlbGF1bmF5O1xufSkoKTtcbiIsInZhciBDb2xvcjtcblxuKGZ1bmN0aW9uKCkge1xuICAndXNlIHN0cmljdCc7XG4gIC8vIGNvbG9yIGhlbHBlciBmdW5jdGlvbnNcbiAgQ29sb3IgPSB7XG5cbiAgICBoZXhUb1JnYmE6IGZ1bmN0aW9uKGhleCkge1xuICAgICAgaGV4ID0gaGV4LnJlcGxhY2UoJyMnLCAnJyk7XG4gICAgICB2YXIgciA9IHBhcnNlSW50KGhleC5zdWJzdHJpbmcoMCwgMiksIDE2KTtcbiAgICAgIHZhciBnID0gcGFyc2VJbnQoaGV4LnN1YnN0cmluZygyLCA0KSwgMTYpO1xuICAgICAgdmFyIGIgPSBwYXJzZUludChoZXguc3Vic3RyaW5nKDQsIDYpLCAxNik7XG5cbiAgICAgIHJldHVybiAncmdiYSgnICsgciArICcsJyArIGcgKyAnLCcgKyBiICsgJywxKSc7XG4gICAgfSxcblxuICAgIGhleFRvUmdiYUFycmF5OiBmdW5jdGlvbihoZXgpIHtcbiAgICAgIGhleCA9IGhleC5yZXBsYWNlKCcjJywgJycpO1xuICAgICAgdmFyIHIgPSBwYXJzZUludChoZXguc3Vic3RyaW5nKDAsIDIpLCAxNik7XG4gICAgICB2YXIgZyA9IHBhcnNlSW50KGhleC5zdWJzdHJpbmcoMiwgNCksIDE2KTtcbiAgICAgIHZhciBiID0gcGFyc2VJbnQoaGV4LnN1YnN0cmluZyg0LCA2KSwgMTYpO1xuXG4gICAgICByZXR1cm4gW3IsIGcsIGJdO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDb252ZXJ0cyBhbiBSR0IgY29sb3IgdmFsdWUgdG8gSFNMLiBDb252ZXJzaW9uIGZvcm11bGFcbiAgICAgKiBhZGFwdGVkIGZyb20gaHR0cDovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9IU0xfY29sb3Jfc3BhY2UuXG4gICAgICogQXNzdW1lcyByLCBnLCBhbmQgYiBhcmUgY29udGFpbmVkIGluIHRoZSBzZXQgWzAsIDI1NV0gYW5kXG4gICAgICogcmV0dXJucyBoLCBzLCBhbmQgbCBpbiB0aGUgc2V0IFswLCAxXS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSAgIE51bWJlciAgciAgICAgICBUaGUgcmVkIGNvbG9yIHZhbHVlXG4gICAgICogQHBhcmFtICAgTnVtYmVyICBnICAgICAgIFRoZSBncmVlbiBjb2xvciB2YWx1ZVxuICAgICAqIEBwYXJhbSAgIE51bWJlciAgYiAgICAgICBUaGUgYmx1ZSBjb2xvciB2YWx1ZVxuICAgICAqIEByZXR1cm4gIEFycmF5ICAgICAgICAgICBUaGUgSFNMIHJlcHJlc2VudGF0aW9uXG4gICAgICovXG4gICAgcmdiVG9Ic2xhOiBmdW5jdGlvbihyZ2IpIHtcbiAgICAgIHZhciByID0gcmdiWzBdIC8gMjU1O1xuICAgICAgdmFyIGcgPSByZ2JbMV0gLyAyNTU7XG4gICAgICB2YXIgYiA9IHJnYlsyXSAvIDI1NTtcbiAgICAgIHZhciBtYXggPSBNYXRoLm1heChyLCBnLCBiKTtcbiAgICAgIHZhciBtaW4gPSBNYXRoLm1pbihyLCBnLCBiKTtcbiAgICAgIHZhciBoO1xuICAgICAgdmFyIHM7XG4gICAgICB2YXIgbCA9IChtYXggKyBtaW4pIC8gMjtcblxuICAgICAgaWYgKG1heCA9PT0gbWluKSB7XG4gICAgICAgIGggPSBzID0gMDsgLy8gYWNocm9tYXRpY1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIGQgPSBtYXggLSBtaW47XG4gICAgICAgIHMgPSBsID4gMC41ID8gZCAvICgyIC0gbWF4IC0gbWluKSA6IGQgLyAobWF4ICsgbWluKTtcbiAgICAgICAgc3dpdGNoIChtYXgpe1xuICAgICAgICAgIGNhc2UgcjogaCA9IChnIC0gYikgLyBkICsgKGcgPCBiID8gNiA6IDApOyBicmVhaztcbiAgICAgICAgICBjYXNlIGc6IGggPSAoYiAtIHIpIC8gZCArIDI7IGJyZWFrO1xuICAgICAgICAgIGNhc2UgYjogaCA9IChyIC0gZykgLyBkICsgNDsgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgaCAvPSA2O1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gJ2hzbGEoJyArIE1hdGgucm91bmQoaCAqIDM2MCkgKyAnLCcgKyBNYXRoLnJvdW5kKHMgKiAxMDApICsgJyUsJyArIE1hdGgucm91bmQobCAqIDEwMCkgKyAnJSwxKSc7XG4gICAgfSxcblxuICAgIGhzbGFBZGp1c3RBbHBoYTogZnVuY3Rpb24oY29sb3IsIGFscGhhKSB7XG4gICAgICBjb2xvciA9IGNvbG9yLnNwbGl0KCcsJyk7XG5cbiAgICAgIGlmICh0eXBlb2YgYWxwaGEgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgY29sb3JbM10gPSBhbHBoYTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbG9yWzNdID0gYWxwaGEocGFyc2VJbnQoY29sb3JbM10pKTtcbiAgICAgIH1cblxuICAgICAgY29sb3JbM10gKz0gJyknO1xuICAgICAgcmV0dXJuIGNvbG9yLmpvaW4oJywnKTtcbiAgICB9LFxuXG4gICAgaHNsYUFkanVzdExpZ2h0bmVzczogZnVuY3Rpb24oY29sb3IsIGxpZ2h0bmVzcykge1xuICAgICAgY29sb3IgPSBjb2xvci5zcGxpdCgnLCcpO1xuXG4gICAgICBpZiAodHlwZW9mIGxpZ2h0bmVzcyAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBjb2xvclsyXSA9IGxpZ2h0bmVzcztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbG9yWzJdID0gbGlnaHRuZXNzKHBhcnNlSW50KGNvbG9yWzJdKSk7XG4gICAgICB9XG5cbiAgICAgIGNvbG9yWzJdICs9ICclJztcbiAgICAgIHJldHVybiBjb2xvci5qb2luKCcsJyk7XG4gICAgfSxcblxuICAgIHJnYlRvSGV4OiBmdW5jdGlvbihyZ2IpIHtcbiAgICAgIGlmICh0eXBlb2YgcmdiID09PSAnc3RyaW5nJykge1xuICAgICAgICByZ2IgPSByZ2IucmVwbGFjZSgncmdiKCcsICcnKS5yZXBsYWNlKCcpJywgJycpLnNwbGl0KCcsJyk7XG4gICAgICB9XG4gICAgICByZ2IgPSByZ2IubWFwKGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgeCA9IHBhcnNlSW50KHgpLnRvU3RyaW5nKDE2KTtcbiAgICAgICAgcmV0dXJuICh4Lmxlbmd0aCA9PT0gMSkgPyAnMCcgKyB4IDogeDtcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIHJnYi5qb2luKCcnKTtcbiAgICB9LFxuICB9O1xuXG4gIGlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gQ29sb3I7XG4gIH1cblxufSkoKTtcbiIsInZhciBQb2ludDtcblxuKGZ1bmN0aW9uKCkge1xuICAndXNlIHN0cmljdCc7XG5cbiAgdmFyIENvbG9yID0gQ29sb3IgfHwgcmVxdWlyZSgnLi9jb2xvcicpO1xuXG4gIC8qKlxuICAgKiBSZXByZXNlbnRzIGEgcG9pbnRcbiAgICogQGNsYXNzXG4gICAqL1xuICBjbGFzcyBfUG9pbnQge1xuICAgIC8qKlxuICAgICAqIFBvaW50IGNvbnNpc3RzIHggYW5kIHlcbiAgICAgKiBAY29uc3RydWN0b3JcbiAgICAgKiBAcGFyYW0ge051bWJlcn0geFxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSB5XG4gICAgICogb3I6XG4gICAgICogQHBhcmFtIHtOdW1iZXJbXX0geFxuICAgICAqIHdoZXJlIHggaXMgbGVuZ3RoLTIgYXJyYXlcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3Rvcih4LCB5KSB7XG4gICAgICBpZiAoQXJyYXkuaXNBcnJheSh4KSkge1xuICAgICAgICB5ID0geFsxXTtcbiAgICAgICAgeCA9IHhbMF07XG4gICAgICB9XG4gICAgICB0aGlzLnggPSB4O1xuICAgICAgdGhpcy55ID0geTtcbiAgICAgIHRoaXMucmFkaXVzID0gMTtcbiAgICAgIHRoaXMuY29sb3IgPSAnYmxhY2snO1xuICAgIH1cblxuICAgIC8vIGRyYXcgdGhlIHBvaW50XG4gICAgcmVuZGVyKGN0eCwgY29sb3IpIHtcbiAgICAgIGN0eC5iZWdpblBhdGgoKTtcbiAgICAgIGN0eC5hcmModGhpcy54LCB0aGlzLnksIHRoaXMucmFkaXVzLCAwLCAyICogTWF0aC5QSSwgZmFsc2UpO1xuICAgICAgY3R4LmZpbGxTdHlsZSA9IGNvbG9yIHx8IHRoaXMuY29sb3I7XG4gICAgICBjdHguZmlsbCgpO1xuICAgICAgY3R4LmNsb3NlUGF0aCgpO1xuICAgIH1cblxuICAgIC8vIGNvbnZlcnRzIHRvIHN0cmluZ1xuICAgIC8vIHJldHVybnMgc29tZXRoaW5nIGxpa2U6XG4gICAgLy8gXCIoWCxZKVwiXG4gICAgLy8gdXNlZCBpbiB0aGUgcG9pbnRtYXAgdG8gZGV0ZWN0IHVuaXF1ZSBwb2ludHNcbiAgICB0b1N0cmluZygpIHtcbiAgICAgIHJldHVybiAnKCcgKyB0aGlzLnggKyAnLCcgKyB0aGlzLnkgKyAnKSc7XG4gICAgfVxuXG4gICAgLy8gZ3JhYiB0aGUgY29sb3Igb2YgdGhlIGNhbnZhcyBhdCB0aGUgcG9pbnRcbiAgICAvLyByZXF1aXJlcyBpbWFnZWRhdGEgZnJvbSBjYW52YXMgc28gd2UgZG9udCBncmFiXG4gICAgLy8gZWFjaCBwb2ludCBpbmRpdmlkdWFsbHksIHdoaWNoIGlzIHJlYWxseSBleHBlbnNpdmVcbiAgICBjYW52YXNDb2xvckF0UG9pbnQoaW1hZ2VEYXRhLCBjb2xvclNwYWNlKSB7XG4gICAgICBjb2xvclNwYWNlID0gY29sb3JTcGFjZSB8fCAnaHNsYSc7XG4gICAgICAvLyBvbmx5IGZpbmQgdGhlIGNhbnZhcyBjb2xvciBpZiB3ZSBkb250IGFscmVhZHkga25vdyBpdFxuICAgICAgaWYgKCF0aGlzLl9jYW52YXNDb2xvcikge1xuICAgICAgICAvLyBpbWFnZURhdGEgYXJyYXkgaXMgZmxhdCwgZ29lcyBieSByb3dzIHRoZW4gY29scywgZm91ciB2YWx1ZXMgcGVyIHBpeGVsXG4gICAgICAgIHZhciBpZHggPSAoTWF0aC5mbG9vcih0aGlzLnkpICogaW1hZ2VEYXRhLndpZHRoICogNCkgKyAoTWF0aC5mbG9vcih0aGlzLngpICogNCk7XG5cbiAgICAgICAgaWYgKGNvbG9yU3BhY2UgPT09ICdoc2xhJykge1xuICAgICAgICAgIHRoaXMuX2NhbnZhc0NvbG9yID0gQ29sb3IucmdiVG9Ic2xhKEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGltYWdlRGF0YS5kYXRhLCBpZHgsIGlkeCArIDQpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aGlzLl9jYW52YXNDb2xvciA9ICdyZ2IoJyArIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGltYWdlRGF0YS5kYXRhLCBpZHgsIGlkeCArIDMpLmpvaW4oKSArICcpJztcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2NhbnZhc0NvbG9yO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXMuX2NhbnZhc0NvbG9yO1xuICAgIH1cblxuICAgIGdldENvb3JkcygpIHtcbiAgICAgIHJldHVybiBbdGhpcy54LCB0aGlzLnldO1xuICAgIH1cblxuICAgIC8vIGRpc3RhbmNlIHRvIGFub3RoZXIgcG9pbnRcbiAgICBnZXREaXN0YW5jZVRvKHBvaW50KSB7XG4gICAgICAvLyDiiJooeDLiiJJ4MSkyKyh5MuKIknkxKTJcbiAgICAgIHJldHVybiBNYXRoLnNxcnQoTWF0aC5wb3codGhpcy54IC0gcG9pbnQueCwgMikgKyBNYXRoLnBvdyh0aGlzLnkgLSBwb2ludC55LCAyKSk7XG4gICAgfVxuXG4gICAgLy8gc2NhbGUgcG9pbnRzIGZyb20gW0EsIEJdIHRvIFtDLCBEXVxuICAgIC8vIHhBID0+IG9sZCB4IG1pbiwgeEIgPT4gb2xkIHggbWF4XG4gICAgLy8geUEgPT4gb2xkIHkgbWluLCB5QiA9PiBvbGQgeSBtYXhcbiAgICAvLyB4QyA9PiBuZXcgeCBtaW4sIHhEID0+IG5ldyB4IG1heFxuICAgIC8vIHlDID0+IG5ldyB5IG1pbiwgeUQgPT4gbmV3IHkgbWF4XG4gICAgcmVzY2FsZSh4QSwgeEIsIHlBLCB5QiwgeEMsIHhELCB5QywgeUQpIHtcbiAgICAgIC8vIE5ld1ZhbHVlID0gKCgoT2xkVmFsdWUgLSBPbGRNaW4pICogTmV3UmFuZ2UpIC8gT2xkUmFuZ2UpICsgTmV3TWluXG5cbiAgICAgIHZhciB4T2xkUmFuZ2UgPSB4QiAtIHhBO1xuICAgICAgdmFyIHlPbGRSYW5nZSA9IHlCIC0geUE7XG5cbiAgICAgIHZhciB4TmV3UmFuZ2UgPSB4RCAtIHhDO1xuICAgICAgdmFyIHlOZXdSYW5nZSA9IHlEIC0geUM7XG5cbiAgICAgIHRoaXMueCA9ICgoKHRoaXMueCAtIHhBKSAqIHhOZXdSYW5nZSkgLyB4T2xkUmFuZ2UpICsgeEM7XG4gICAgICB0aGlzLnkgPSAoKCh0aGlzLnkgLSB5QSkgKiB5TmV3UmFuZ2UpIC8geU9sZFJhbmdlKSArIHlDO1xuICAgIH1cblxuICAgIHJlc2V0Q29sb3IoKSB7XG4gICAgICB0aGlzLl9jYW52YXNDb2xvciA9IHVuZGVmaW5lZDtcbiAgICB9XG4gIH1cblxuICBpZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IF9Qb2ludDtcbiAgfVxuXG4gIFBvaW50ID0gX1BvaW50O1xufSkoKTtcbiIsInZhciBQb2ludE1hcDtcblxuKGZ1bmN0aW9uKCkge1xuICAndXNlIHN0cmljdCc7XG5cbiAgdmFyIFBvaW50ID0gUG9pbnQgfHwgcmVxdWlyZSgnLi9wb2ludCcpO1xuXG4gIC8qKlxuICAgKiBSZXByZXNlbnRzIGEgcG9pbnRcbiAgICogQGNsYXNzXG4gICAqL1xuICBjbGFzcyBfUG9pbnRNYXAge1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgdGhpcy5fbWFwID0ge307XG4gICAgfVxuXG4gICAgLy8gYWRkcyBwb2ludCB0byBtYXBcbiAgICBhZGQocG9pbnQpIHtcbiAgICAgIHRoaXMuX21hcFtwb2ludC50b1N0cmluZygpXSA9IHRydWU7XG4gICAgfVxuXG4gICAgLy8gYWRkcyB4LCB5IGNvb3JkIHRvIG1hcFxuICAgIGFkZENvb3JkKHgsIHkpIHtcbiAgICAgIHRoaXMuYWRkKG5ldyBQb2ludCh4LCB5KSk7XG4gICAgfVxuXG4gICAgLy8gcmVtb3ZlcyBwb2ludCBmcm9tIG1hcFxuICAgIHJlbW92ZShwb2ludCkge1xuICAgICAgdGhpcy5fbWFwW3BvaW50LnRvU3RyaW5nKCldID0gZmFsc2U7XG4gICAgfVxuXG4gICAgLy8gcmVtb3ZlcyB4LCB5IGNvb3JkIGZyb20gbWFwXG4gICAgcmVtb3ZlQ29vcmQoeCwgeSkge1xuICAgICAgdGhpcy5yZW1vdmUobmV3IFBvaW50KHgsIHkpKTtcbiAgICB9XG5cbiAgICAvLyBjbGVhcnMgdGhlIG1hcFxuICAgIGNsZWFyKCkge1xuICAgICAgdGhpcy5fbWFwID0ge307XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogZGV0ZXJtaW5lcyBpZiBwb2ludCBoYXMgYmVlblxuICAgICAqIGFkZGVkIHRvIG1hcCBhbHJlYWR5XG4gICAgICogIEByZXR1cm5zIHtCb29sZWFufVxuICAgICAqL1xuICAgIGV4aXN0cyhwb2ludCkge1xuICAgICAgcmV0dXJuIHRoaXMuX21hcFtwb2ludC50b1N0cmluZygpXSA/IHRydWUgOiBmYWxzZTtcbiAgICB9XG4gIH1cblxuICBpZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IF9Qb2ludE1hcDtcbiAgfVxuXG4gIFBvaW50TWFwID0gX1BvaW50TWFwO1xufSkoKTtcbiIsIihmdW5jdGlvbigpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIGZ1bmN0aW9uIHBvbHlmaWxscygpIHtcbiAgICAvLyBwb2x5ZmlsbCBmb3IgT2JqZWN0LmFzc2lnblxuICAgIGlmICh0eXBlb2YgT2JqZWN0LmFzc2lnbiAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgT2JqZWN0LmFzc2lnbiA9IGZ1bmN0aW9uKHRhcmdldCkge1xuICAgICAgICBpZiAodGFyZ2V0ID09PSB1bmRlZmluZWQgfHwgdGFyZ2V0ID09PSBudWxsKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQ2Fubm90IGNvbnZlcnQgdW5kZWZpbmVkIG9yIG51bGwgdG8gb2JqZWN0Jyk7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgb3V0cHV0ID0gT2JqZWN0KHRhcmdldCk7XG4gICAgICAgIGZvciAodmFyIGluZGV4ID0gMTsgaW5kZXggPCBhcmd1bWVudHMubGVuZ3RoOyBpbmRleCsrKSB7XG4gICAgICAgICAgdmFyIHNvdXJjZSA9IGFyZ3VtZW50c1tpbmRleF07XG4gICAgICAgICAgaWYgKHNvdXJjZSAhPT0gdW5kZWZpbmVkICYmIHNvdXJjZSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgZm9yICh2YXIgbmV4dEtleSBpbiBzb3VyY2UpIHtcbiAgICAgICAgICAgICAgaWYgKHNvdXJjZS5oYXNPd25Qcm9wZXJ0eShuZXh0S2V5KSkge1xuICAgICAgICAgICAgICAgIG91dHB1dFtuZXh0S2V5XSA9IHNvdXJjZVtuZXh0S2V5XTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gb3V0cHV0O1xuICAgICAgfTtcbiAgICB9XG4gIH1cblxuICBtb2R1bGUuZXhwb3J0cyA9IHBvbHlmaWxscztcblxufSkoKTtcbiIsInZhciBSYW5kb207XG5cbihmdW5jdGlvbigpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuICAvLyBSYW5kb20gaGVscGVyIGZ1bmN0aW9ucy8vIHJhbmRvbSBoZWxwZXIgZnVuY3Rpb25zXG5cbiAgdmFyIFBvaW50ID0gUG9pbnQgfHwgcmVxdWlyZSgnLi9wb2ludCcpO1xuXG4gIFJhbmRvbSA9IHtcbiAgICAvLyBoZXkgbG9vayBhIGNsb3N1cmVcbiAgICAvLyByZXR1cm5zIGZ1bmN0aW9uIGZvciByYW5kb20gbnVtYmVycyB3aXRoIHByZS1zZXQgbWF4IGFuZCBtaW5cbiAgICByYW5kb21OdW1iZXJGdW5jdGlvbjogZnVuY3Rpb24obWF4LCBtaW4pIHtcbiAgICAgIG1pbiA9IG1pbiB8fCAwO1xuICAgICAgaWYgKG1pbiA+IG1heCkge1xuICAgICAgICB2YXIgdGVtcCA9IG1heDtcbiAgICAgICAgbWF4ID0gbWluO1xuICAgICAgICBtaW4gPSB0ZW1wO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogKG1heCAtIG1pbiArIDEpKSArIG1pbjtcbiAgICAgIH07XG4gICAgfSxcblxuICAgIC8vIHJldHVybnMgYSByYW5kb20gbnVtYmVyXG4gICAgLy8gYmV0d2VlbiB0aGUgbWF4IGFuZCBtaW5cbiAgICByYW5kb21CZXR3ZWVuOiBmdW5jdGlvbihtYXgsIG1pbikge1xuICAgICAgbWluID0gbWluIHx8IDA7XG4gICAgICByZXR1cm4gUmFuZG9tLnJhbmRvbU51bWJlckZ1bmN0aW9uKG1heCwgbWluKSgpO1xuICAgIH0sXG5cbiAgICByYW5kb21JbkNpcmNsZTogZnVuY3Rpb24ocmFkaXVzLCBveCwgb3kpIHtcbiAgICAgIHZhciBhbmdsZSA9IE1hdGgucmFuZG9tKCkgKiBNYXRoLlBJICogMjtcbiAgICAgIHZhciByYWQgPSBNYXRoLnNxcnQoTWF0aC5yYW5kb20oKSkgKiByYWRpdXM7XG4gICAgICB2YXIgeCA9IG94ICsgcmFkICogTWF0aC5jb3MoYW5nbGUpO1xuICAgICAgdmFyIHkgPSBveSArIHJhZCAqIE1hdGguc2luKGFuZ2xlKTtcblxuICAgICAgcmV0dXJuIG5ldyBQb2ludCh4LCB5KTtcbiAgICB9LFxuXG4gICAgcmFuZG9tUmdiYTogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gJ3JnYmEoJyArIFJhbmRvbS5yYW5kb21CZXR3ZWVuKDI1NSkgKyAnLCcgK1xuICAgICAgICAgICAgICAgICAgICAgICBSYW5kb20ucmFuZG9tQmV0d2VlbigyNTUpICsgJywnICtcbiAgICAgICAgICAgICAgICAgICAgICAgUmFuZG9tLnJhbmRvbUJldHdlZW4oMjU1KSArICcsIDEpJztcbiAgICB9LFxuXG4gICAgcmFuZG9tSHNsYTogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gJ2hzbGEoJyArIFJhbmRvbS5yYW5kb21CZXR3ZWVuKDM2MCkgKyAnLCcgK1xuICAgICAgICAgICAgICAgICAgICAgICBSYW5kb20ucmFuZG9tQmV0d2VlbigxMDApICsgJyUsJyArXG4gICAgICAgICAgICAgICAgICAgICAgIFJhbmRvbS5yYW5kb21CZXR3ZWVuKDEwMCkgKyAnJSwgMSknO1xuICAgIH0sXG4gIH07XG5cbiAgaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBSYW5kb207XG4gIH1cblxufSkoKTtcbiIsInZhciBUcmlhbmdsZTtcblxuKGZ1bmN0aW9uKCkge1xuICAndXNlIHN0cmljdCc7XG5cbiAgdmFyIFBvaW50ID0gUG9pbnQgfHwgcmVxdWlyZSgnLi9wb2ludCcpO1xuXG4gIC8qKlxuICAgKiBSZXByZXNlbnRzIGEgdHJpYW5nbGVcbiAgICogQGNsYXNzXG4gICAqL1xuICBjbGFzcyBfVHJpYW5nbGUge1xuICAgIC8qKlxuICAgICAqIFRyaWFuZ2xlIGNvbnNpc3RzIG9mIHRocmVlIFBvaW50c1xuICAgICAqIEBjb25zdHJ1Y3RvclxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBhXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGJcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gY1xuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKGEsIGIsIGMpIHtcbiAgICAgIHRoaXMucDEgPSB0aGlzLmEgPSBhO1xuICAgICAgdGhpcy5wMiA9IHRoaXMuYiA9IGI7XG4gICAgICB0aGlzLnAzID0gdGhpcy5jID0gYztcblxuICAgICAgdGhpcy5jb2xvciA9ICdibGFjayc7XG4gICAgICB0aGlzLnN0cm9rZSA9ICdibGFjayc7XG4gICAgfVxuXG4gICAgLy8gZHJhdyB0aGUgdHJpYW5nbGUgd2l0aCBkaWZmZXJpbmcgZWRnZSBjb2xvcnMgb3B0aW9uYWxcbiAgICByZW5kZXIoY3R4LCBjb2xvciwgc3Ryb2tlKSB7XG4gICAgICBjdHguYmVnaW5QYXRoKCk7XG4gICAgICBjdHgubW92ZVRvKHRoaXMuYS54LCB0aGlzLmEueSk7XG4gICAgICBjdHgubGluZVRvKHRoaXMuYi54LCB0aGlzLmIueSk7XG4gICAgICBjdHgubGluZVRvKHRoaXMuYy54LCB0aGlzLmMueSk7XG4gICAgICBjdHguY2xvc2VQYXRoKCk7XG4gICAgICBjdHguc3Ryb2tlU3R5bGUgPSBzdHJva2UgfHwgdGhpcy5zdHJva2UgfHwgdGhpcy5jb2xvcjtcbiAgICAgIGN0eC5maWxsU3R5bGUgPSBjb2xvciB8fCB0aGlzLmNvbG9yO1xuICAgICAgaWYgKGNvbG9yICE9PSBmYWxzZSAmJiBzdHJva2UgIT09IGZhbHNlKSB7XG4gICAgICAgIC8vIGRyYXcgdGhlIHN0cm9rZSB1c2luZyB0aGUgZmlsbCBjb2xvciBmaXJzdFxuICAgICAgICAvLyBzbyB0aGF0IHRoZSBwb2ludHMgb2YgYWRqYWNlbnQgdHJpYW5nbGVzXG4gICAgICAgIC8vIGRvbnQgb3ZlcmxhcCBhIGJ1bmNoIGFuZCBsb29rIFwic3RhcnJ5XCJcbiAgICAgICAgdmFyIHRlbXBTdHJva2UgPSBjdHguc3Ryb2tlU3R5bGU7XG4gICAgICAgIGN0eC5zdHJva2VTdHlsZSA9IGN0eC5maWxsU3R5bGU7XG4gICAgICAgIGN0eC5zdHJva2UoKTtcbiAgICAgICAgY3R4LnN0cm9rZVN0eWxlID0gdGVtcFN0cm9rZTtcbiAgICAgIH1cbiAgICAgIGlmIChjb2xvciAhPT0gZmFsc2UpIHtcbiAgICAgICAgY3R4LmZpbGwoKTtcbiAgICAgIH1cbiAgICAgIGlmIChzdHJva2UgIT09IGZhbHNlKSB7XG4gICAgICAgIGN0eC5zdHJva2UoKTtcbiAgICAgIH1cbiAgICAgIGN0eC5jbG9zZVBhdGgoKTtcbiAgICB9XG5cbiAgICAvLyByYW5kb20gcG9pbnQgaW5zaWRlIHRyaWFuZ2xlXG4gICAgcmFuZG9tSW5zaWRlKCkge1xuICAgICAgdmFyIHIxID0gTWF0aC5yYW5kb20oKTtcbiAgICAgIHZhciByMiA9IE1hdGgucmFuZG9tKCk7XG4gICAgICB2YXIgeCA9ICgxIC0gTWF0aC5zcXJ0KHIxKSkgKlxuICAgICAgICAgICAgICB0aGlzLnAxLnggKyAoTWF0aC5zcXJ0KHIxKSAqXG4gICAgICAgICAgICAgICgxIC0gcjIpKSAqXG4gICAgICAgICAgICAgIHRoaXMucDIueCArIChNYXRoLnNxcnQocjEpICogcjIpICpcbiAgICAgICAgICAgICAgdGhpcy5wMy54O1xuICAgICAgdmFyIHkgPSAoMSAtIE1hdGguc3FydChyMSkpICpcbiAgICAgICAgICAgICAgdGhpcy5wMS55ICsgKE1hdGguc3FydChyMSkgKlxuICAgICAgICAgICAgICAoMSAtIHIyKSkgKlxuICAgICAgICAgICAgICB0aGlzLnAyLnkgKyAoTWF0aC5zcXJ0KHIxKSAqIHIyKSAqXG4gICAgICAgICAgICAgIHRoaXMucDMueTtcbiAgICAgIHJldHVybiBuZXcgUG9pbnQoeCwgeSk7XG4gICAgfVxuXG4gICAgY29sb3JBdENlbnRyb2lkKGltYWdlRGF0YSkge1xuICAgICAgcmV0dXJuIHRoaXMuY2VudHJvaWQoKS5jYW52YXNDb2xvckF0UG9pbnQoaW1hZ2VEYXRhKTtcbiAgICB9XG5cbiAgICByZXNldFBvaW50Q29sb3JzKCkge1xuICAgICAgdGhpcy5jZW50cm9pZCgpLnJlc2V0Q29sb3IoKTtcbiAgICAgIHRoaXMucDEucmVzZXRDb2xvcigpO1xuICAgICAgdGhpcy5wMi5yZXNldENvbG9yKCk7XG4gICAgICB0aGlzLnAzLnJlc2V0Q29sb3IoKTtcbiAgICB9XG5cbiAgICBjZW50cm9pZCgpIHtcbiAgICAgIC8vIG9ubHkgY2FsYyB0aGUgY2VudHJvaWQgaWYgd2UgZG9udCBhbHJlYWR5IGtub3cgaXRcbiAgICAgIGlmICh0aGlzLl9jZW50cm9pZCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fY2VudHJvaWQ7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgeCA9IE1hdGgucm91bmQoKHRoaXMucDEueCArIHRoaXMucDIueCArIHRoaXMucDMueCkgLyAzKTtcbiAgICAgICAgdmFyIHkgPSBNYXRoLnJvdW5kKCh0aGlzLnAxLnkgKyB0aGlzLnAyLnkgKyB0aGlzLnAzLnkpIC8gMyk7XG4gICAgICAgIHRoaXMuX2NlbnRyb2lkID0gbmV3IFBvaW50KHgsIHkpO1xuXG4gICAgICAgIHJldHVybiB0aGlzLl9jZW50cm9pZDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzEzMzAwOTA0L2RldGVybWluZS13aGV0aGVyLXBvaW50LWxpZXMtaW5zaWRlLXRyaWFuZ2xlXG4gICAgcG9pbnRJblRyaWFuZ2xlKHBvaW50KSB7XG4gICAgICB2YXIgYWxwaGEgPSAoKHRoaXMucDIueSAtIHRoaXMucDMueSkgKiAocG9pbnQueCAtIHRoaXMucDMueCkgKyAodGhpcy5wMy54IC0gdGhpcy5wMi54KSAqIChwb2ludC55IC0gdGhpcy5wMy55KSkgL1xuICAgICAgICAgICAgICAgICgodGhpcy5wMi55IC0gdGhpcy5wMy55KSAqICh0aGlzLnAxLnggLSB0aGlzLnAzLngpICsgKHRoaXMucDMueCAtIHRoaXMucDIueCkgKiAodGhpcy5wMS55IC0gdGhpcy5wMy55KSk7XG4gICAgICB2YXIgYmV0YSA9ICgodGhpcy5wMy55IC0gdGhpcy5wMS55KSAqIChwb2ludC54IC0gdGhpcy5wMy54KSArICh0aGlzLnAxLnggLSB0aGlzLnAzLngpICogKHBvaW50LnkgLSB0aGlzLnAzLnkpKSAvXG4gICAgICAgICAgICAgICAoKHRoaXMucDIueSAtIHRoaXMucDMueSkgKiAodGhpcy5wMS54IC0gdGhpcy5wMy54KSArICh0aGlzLnAzLnggLSB0aGlzLnAyLngpICogKHRoaXMucDEueSAtIHRoaXMucDMueSkpO1xuICAgICAgdmFyIGdhbW1hID0gMS4wIC0gYWxwaGEgLSBiZXRhO1xuXG4gICAgICByZXR1cm4gKGFscGhhID4gMCAmJiBiZXRhID4gMCAmJiBnYW1tYSA+IDApO1xuICAgIH1cblxuICAgIC8vIHNjYWxlIHBvaW50cyBmcm9tIFtBLCBCXSB0byBbQywgRF1cbiAgICAvLyB4QSA9PiBvbGQgeCBtaW4sIHhCID0+IG9sZCB4IG1heFxuICAgIC8vIHlBID0+IG9sZCB5IG1pbiwgeUIgPT4gb2xkIHkgbWF4XG4gICAgLy8geEMgPT4gbmV3IHggbWluLCB4RCA9PiBuZXcgeCBtYXhcbiAgICAvLyB5QyA9PiBuZXcgeSBtaW4sIHlEID0+IG5ldyB5IG1heFxuICAgIHJlc2NhbGVQb2ludHMoeEEsIHhCLCB5QSwgeUIsIHhDLCB4RCwgeUMsIHlEKSB7XG4gICAgICB0aGlzLnAxLnJlc2NhbGUoeEEsIHhCLCB5QSwgeUIsIHhDLCB4RCwgeUMsIHlEKTtcbiAgICAgIHRoaXMucDIucmVzY2FsZSh4QSwgeEIsIHlBLCB5QiwgeEMsIHhELCB5QywgeUQpO1xuICAgICAgdGhpcy5wMy5yZXNjYWxlKHhBLCB4QiwgeUEsIHlCLCB4QywgeEQsIHlDLCB5RCk7XG4gICAgICAvLyByZWNhbGN1bGF0ZSB0aGUgY2VudHJvaWRcbiAgICAgIHRoaXMuY2VudHJvaWQoKTtcbiAgICB9XG5cbiAgICBtYXhYKCkge1xuICAgICAgcmV0dXJuIE1hdGgubWF4KHRoaXMucDEueCwgdGhpcy5wMi54LCB0aGlzLnAzLngpO1xuICAgIH1cblxuICAgIG1heFkoKSB7XG4gICAgICByZXR1cm4gTWF0aC5tYXgodGhpcy5wMS55LCB0aGlzLnAyLnksIHRoaXMucDMueSk7XG4gICAgfVxuXG4gICAgbWluWCgpIHtcbiAgICAgIHJldHVybiBNYXRoLm1pbih0aGlzLnAxLngsIHRoaXMucDIueCwgdGhpcy5wMy54KTtcbiAgICB9XG5cbiAgICBtaW5ZKCkge1xuICAgICAgcmV0dXJuIE1hdGgubWluKHRoaXMucDEueSwgdGhpcy5wMi55LCB0aGlzLnAzLnkpO1xuICAgIH1cblxuICAgIGdldFBvaW50cygpIHtcbiAgICAgIHJldHVybiBbdGhpcy5wMSwgdGhpcy5wMiwgdGhpcy5wM107XG4gICAgfVxuICB9XG5cbiAgaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBfVHJpYW5nbGU7XG4gIH1cblxuICBUcmlhbmdsZSA9IF9UcmlhbmdsZTtcbn0pKCk7XG4iLCIoZnVuY3Rpb24oKSB7XG4gICd1c2Ugc3RyaWN0JztcblxuICB2YXIgUHJldHR5RGVsYXVuYXkgID0gcmVxdWlyZSgnLi9QcmV0dHlEZWxhdW5heScpO1xuICB2YXIgQ29sb3IgID0gcmVxdWlyZSgnLi9QcmV0dHlEZWxhdW5heS9jb2xvcicpO1xuICB2YXIgUmFuZG9tID0gcmVxdWlyZSgnLi9QcmV0dHlEZWxhdW5heS9yYW5kb20nKTtcblxuICB2YXIgQ29va2llcyA9IHtcbiAgICBnZXRJdGVtOiBmdW5jdGlvbihzS2V5KSB7XG4gICAgICBpZiAoIXNLZXkpIHsgcmV0dXJuIG51bGw7IH1cbiAgICAgIHJldHVybiBkZWNvZGVVUklDb21wb25lbnQoXG4gICAgICAgIGRvY3VtZW50LmNvb2tpZS5yZXBsYWNlKFxuICAgICAgICAgIG5ldyBSZWdFeHAoXG4gICAgICAgICAgICAgICcoPzooPzpefC4qOylcXFxccyonICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICtcbiAgICAgICAgICAgICAgZW5jb2RlVVJJQ29tcG9uZW50KHNLZXkpLnJlcGxhY2UoL1tcXC1cXC5cXCtcXCpdL2csICdcXFxcJCYnKSAgICtcbiAgICAgICAgICAgICAgJ1xcXFxzKlxcXFw9XFxcXHMqKFteO10qKS4qJCl8Xi4qJCcpLCAnJDEnKVxuICAgICAgICAgICAgKSB8fCBudWxsO1xuICAgIH0sXG5cbiAgICBzZXRJdGVtOiBmdW5jdGlvbihzS2V5LCBzVmFsdWUsIHZFbmQsIHNQYXRoLCBzRG9tYWluLCBiU2VjdXJlKSB7XG4gICAgICBpZiAoIXNLZXkgfHwgL14oPzpleHBpcmVzfG1heFxcLWFnZXxwYXRofGRvbWFpbnxzZWN1cmUpJC9pLnRlc3Qoc0tleSkpIHsgcmV0dXJuIGZhbHNlOyB9XG4gICAgICB2YXIgc0V4cGlyZXMgPSAnJztcbiAgICAgIGlmICh2RW5kKSB7XG4gICAgICAgIHN3aXRjaCAodkVuZC5jb25zdHJ1Y3Rvcikge1xuICAgICAgICAgIGNhc2UgTnVtYmVyOlxuICAgICAgICAgICAgc0V4cGlyZXMgPSB2RW5kID09PSBJbmZpbml0eSA/ICc7IGV4cGlyZXM9RnJpLCAzMSBEZWMgOTk5OSAyMzo1OTo1OSBHTVQnIDogJzsgbWF4LWFnZT0nICsgdkVuZDtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGNhc2UgU3RyaW5nOlxuICAgICAgICAgICAgc0V4cGlyZXMgPSAnOyBleHBpcmVzPScgKyB2RW5kO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgY2FzZSBEYXRlOlxuICAgICAgICAgICAgc0V4cGlyZXMgPSAnOyBleHBpcmVzPScgKyB2RW5kLnRvVVRDU3RyaW5nKCk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgZG9jdW1lbnQuY29va2llID0gZW5jb2RlVVJJQ29tcG9uZW50KHNLZXkpICtcbiAgICAgICAgJz0nICtcbiAgICAgICAgZW5jb2RlVVJJQ29tcG9uZW50KHNWYWx1ZSkgK1xuICAgICAgICBzRXhwaXJlcyArXG4gICAgICAgIChzRG9tYWluID8gJzsgZG9tYWluPScgK1xuICAgICAgICBzRG9tYWluIDogJycpICtcbiAgICAgICAgKHNQYXRoID8gJzsgcGF0aD0nICtcbiAgICAgICAgc1BhdGggOiAnJykgK1xuICAgICAgICAoYlNlY3VyZSA/ICc7IHNlY3VyZScgOiAnJyk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9LFxuXG4gICAgcmVtb3ZlSXRlbTogZnVuY3Rpb24oc0tleSwgc1BhdGgsIHNEb21haW4pIHtcbiAgICAgIGlmICghdGhpcy5oYXNJdGVtKHNLZXkpKSB7IHJldHVybiBmYWxzZTsgfVxuICAgICAgZG9jdW1lbnQuY29va2llID0gZW5jb2RlVVJJQ29tcG9uZW50KHNLZXkpICAgICtcbiAgICAgICAgJz07IGV4cGlyZXM9VGh1LCAwMSBKYW4gMTk3MCAwMDowMDowMCBHTVQnICArXG4gICAgICAgIChzRG9tYWluID8gJzsgZG9tYWluPScgKyBzRG9tYWluIDogJycpICAgICAgK1xuICAgICAgICAoc1BhdGggICA/ICc7IHBhdGg9JyAgICsgc1BhdGggICA6ICcnKTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0sXG5cbiAgICBoYXNJdGVtOiBmdW5jdGlvbihzS2V5KSB7XG4gICAgICBpZiAoIXNLZXkpIHsgcmV0dXJuIGZhbHNlOyB9XG4gICAgICByZXR1cm4gKG5ldyBSZWdFeHAoJyg/Ol58O1xcXFxzKiknICsgZW5jb2RlVVJJQ29tcG9uZW50KHNLZXkpXG4gICAgICAgIC5yZXBsYWNlKC9bXFwtXFwuXFwrXFwqXS9nLCAnXFxcXCQmJykgKyAnXFxcXHMqXFxcXD0nKSlcbiAgICAgICAgLnRlc3QoZG9jdW1lbnQuY29va2llKTtcbiAgICB9LFxuXG4gICAga2V5czogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgYUtleXMgPSBkb2N1bWVudC5jb29raWUucmVwbGFjZSgvKCg/Ol58XFxzKjspW15cXD1dKykoPz07fCQpfF5cXHMqfFxccyooPzpcXD1bXjtdKik/KD86XFwxfCQpL2csICcnKVxuICAgICAgICAuc3BsaXQoL1xccyooPzpcXD1bXjtdKik/O1xccyovKTtcbiAgICAgIGZvciAodmFyIG5MZW4gPSBhS2V5cy5sZW5ndGgsIG5JZHggPSAwOyBuSWR4IDwgbkxlbjsgbklkeCsrKSB7IGFLZXlzW25JZHhdID0gZGVjb2RlVVJJQ29tcG9uZW50KGFLZXlzW25JZHhdKTsgfVxuICAgICAgcmV0dXJuIGFLZXlzO1xuICAgIH0sXG4gIH07XG5cbiAgLy8gc2V0IHVwIHZhcmlhYmxlcyBmb3IgY2FudmFzLCBpbnB1dHMsIGV0Y1xuICBjb25zdCBjYW52YXMgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY2FudmFzJyk7XG5cbiAgY29uc3QgYnV0dG9uID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2J1dHRvbicpO1xuXG4gIGNvbnN0IGdlbmVyYXRlQ29sb3JzQnV0dG9uID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2dlbmVyYXRlQ29sb3JzJyk7XG4gIGNvbnN0IGdlbmVyYXRlR3JhZGllbnRCdXR0b24gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZ2VuZXJhdGVHcmFkaWVudCcpO1xuICBjb25zdCBnZW5lcmF0ZVRyaWFuZ2xlc0J1dHRvbiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdnZW5lcmF0ZVRyaWFuZ2xlcycpO1xuXG4gIGNvbnN0IHRvZ2dsZVRyaWFuZ2xlc0J1dHRvbiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCd0b2dnbGVUcmlhbmdsZXMnKTtcbiAgY29uc3QgdG9nZ2xlUG9pbnRzQnV0dG9uID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3RvZ2dsZVBvaW50cycpO1xuICBjb25zdCB0b2dnbGVDaXJjbGVzQnV0dG9uID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3RvZ2dsZUNpcmNsZXMnKTtcbiAgY29uc3QgdG9nZ2xlQ2VudHJvaWRzQnV0dG9uID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3RvZ2dsZUNlbnRyb2lkcycpO1xuICBjb25zdCB0b2dnbGVFZGdlc0J1dHRvbiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCd0b2dnbGVFZGdlcycpO1xuICBjb25zdCB0b2dnbGVBbmltYXRpb25CdXR0b24gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgndG9nZ2xlQW5pbWF0aW9uJyk7XG5cbiAgY29uc3QgZm9ybSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdmb3JtJyk7XG4gIGNvbnN0IG11bHRpcGxpZXJSYWRpbyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdwb2ludEdlbjEnKTtcbiAgY29uc3QgbXVsdGlwbGllcklucHV0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3BvaW50c011bHRpcGxpZXInKTtcbiAgY29uc3QgbWF4SW5wdXQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbWF4UG9pbnRzJyk7XG4gIGNvbnN0IG1pbklucHV0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ21pblBvaW50cycpO1xuICBjb25zdCBtYXhFZGdlSW5wdXQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbWF4RWRnZVBvaW50cycpO1xuICBjb25zdCBtaW5FZGdlSW5wdXQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbWluRWRnZVBvaW50cycpO1xuICBjb25zdCBtYXhHcmFkaWVudElucHV0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ21heEdyYWRpZW50cycpO1xuICBjb25zdCBtaW5HcmFkaWVudElucHV0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ21pbkdyYWRpZW50cycpO1xuXG4gIGNvbnN0IGltYWdlQmFja2dyb3VuZFVwbG9hZCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdpbWFnZUJhY2tncm91bmRVcGxvYWQnKTtcbiAgY29uc3QgaW1hZ2VCYWNrZ3JvdW5kSW5wdXQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnaW1hZ2VCYWNrZ3JvdW5kSW5wdXQnKTtcblxuICBsZXQgbWluUG9pbnRzLCBtYXhQb2ludHMsIG1pbkVkZ2VQb2ludHMsIG1heEVkZ2VQb2ludHMsIG1pbkdyYWRpZW50cywgbWF4R3JhZGllbnRzLCBtdWx0aXBsaWVyLCBjb2xvcnMsIGltYWdlO1xuXG4gIGxldCBzaG93VHJpYW5nbGVzLCBzaG93UG9pbnRzLCBzaG93Q2lyY2xlcywgc2hvd0NlbnRyb2lkcywgc2hvd0VkZ2VzLCBzaG93QW5pbWF0aW9uO1xuXG4gIGNvbnN0IG9wdGlvbnMgPSB7XG4gICAgb25EYXJrQmFja2dyb3VuZDogZnVuY3Rpb24oKSB7XG4gICAgICBmb3JtLmNsYXNzTmFtZSA9ICdmb3JtIGxpZ2h0JztcbiAgICB9LFxuICAgIG9uTGlnaHRCYWNrZ3JvdW5kOiBmdW5jdGlvbigpIHtcbiAgICAgIGZvcm0uY2xhc3NOYW1lID0gJ2Zvcm0gZGFyayc7XG4gICAgfSxcbiAgfTtcblxuICBnZXRDb29raWVzKCk7XG5cbiAgLy8gaW5pdGlhbGl6ZSB0aGUgUHJldHR5RGVsYXVuYXkgb2JqZWN0XG4gIGxldCBwcmV0dHlEZWxhdW5heSA9IG5ldyBQcmV0dHlEZWxhdW5heShjYW52YXMsIG9wdGlvbnMpO1xuXG4gIC8vIGluaXRpYWwgZ2VuZXJhdGlvblxuICBydW5EZWxhdW5heSgpO1xuXG4gIC8qKlxuICAgKiB1dGlsIGZ1bmN0aW9uc1xuICAgKi9cblxuICAvLyBnZXQgb3B0aW9ucyBhbmQgcmUtcmFuZG9taXplXG4gIGZ1bmN0aW9uIHJ1bkRlbGF1bmF5KCkge1xuICAgIGdldFJhbmRvbWl6ZU9wdGlvbnMoKTtcbiAgICBwcmV0dHlEZWxhdW5heS5yYW5kb21pemUobWluUG9pbnRzLCBtYXhQb2ludHMsIG1pbkVkZ2VQb2ludHMsIG1heEVkZ2VQb2ludHMsIG1pbkdyYWRpZW50cywgbWF4R3JhZGllbnRzLCBtdWx0aXBsaWVyLCBjb2xvcnMsIGltYWdlKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldENvbG9ycygpIHtcbiAgICB2YXIgY29sb3JzID0gW107XG5cbiAgICBpZiAoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NvbG9yVHlwZTEnKS5jaGVja2VkKSB7XG4gICAgICAvLyBnZW5lcmF0ZSByYW5kb20gY29sb3JzXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IDM7IGkrKykge1xuICAgICAgICB2YXIgY29sb3IgPSBSYW5kb20ucmFuZG9tSHNsYSgpO1xuICAgICAgICBjb2xvcnMucHVzaChjb2xvcik7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIHVzZSB0aGUgb25lcyBpbiB0aGUgaW5wdXRzXG4gICAgICBjb2xvcnMucHVzaChDb2xvci5yZ2JUb0hzbGEoQ29sb3IuaGV4VG9SZ2JhQXJyYXkoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NvbG9yMScpLnZhbHVlKSkpO1xuICAgICAgY29sb3JzLnB1c2goQ29sb3IucmdiVG9Ic2xhKENvbG9yLmhleFRvUmdiYUFycmF5KGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjb2xvcjInKS52YWx1ZSkpKTtcbiAgICAgIGNvbG9ycy5wdXNoKENvbG9yLnJnYlRvSHNsYShDb2xvci5oZXhUb1JnYmFBcnJheShkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY29sb3IzJykudmFsdWUpKSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGNvbG9ycztcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldEltYWdlKCkge1xuICAgIGlmICghZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NvbG9yVHlwZTMnKS5jaGVja2VkKSB7XG4gICAgICByZXR1cm4gJyc7XG4gICAgfVxuXG4gICAgaWYgKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdpbWFnZUJhY2tncm91bmQxJykuY2hlY2tlZCAmJiBpbWFnZUJhY2tncm91bmRVcGxvYWQuZmlsZXMubGVuZ3RoKSB7XG4gICAgICBsZXQgZmlsZSA9IGltYWdlQmFja2dyb3VuZFVwbG9hZC5maWxlc1swXTtcbiAgICAgIHJldHVybiB3aW5kb3cuVVJMLmNyZWF0ZU9iamVjdFVSTChmaWxlKTtcbiAgICB9IGVsc2UgaWYgKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdpbWFnZUJhY2tncm91bmQyJykuY2hlY2tlZCkge1xuICAgICAgcmV0dXJuIGltYWdlQmFja2dyb3VuZElucHV0LnZhbHVlO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gJyc7XG4gICAgfVxuICB9XG5cbiAgLy8gZ2V0IG9wdGlvbnMgZnJvbSBjb29raWVzXG4gIGZ1bmN0aW9uIGdldENvb2tpZXMoKSB7XG4gICAgdmFyIGRlZmF1bHRzID0gUHJldHR5RGVsYXVuYXkuZGVmYXVsdHMoKTtcblxuICAgIHNob3dUcmlhbmdsZXMgPSBDb29raWVzLmdldEl0ZW0oJ0RlbGF1bmF5U2hvd1RyaWFuZ2xlcycpO1xuICAgIHNob3dQb2ludHMgICAgPSBDb29raWVzLmdldEl0ZW0oJ0RlbGF1bmF5U2hvd1BvaW50cycpO1xuICAgIHNob3dDaXJjbGVzICAgPSBDb29raWVzLmdldEl0ZW0oJ0RlbGF1bmF5U2hvd0NpcmNsZXMnKTtcbiAgICBzaG93Q2VudHJvaWRzID0gQ29va2llcy5nZXRJdGVtKCdEZWxhdW5heVNob3dDZW50cm9pZHMnKTtcbiAgICBzaG93RWRnZXMgICAgID0gQ29va2llcy5nZXRJdGVtKCdEZWxhdW5heVNob3dFZGdlcycpO1xuICAgIHNob3dBbmltYXRpb24gPSBDb29raWVzLmdldEl0ZW0oJ0RlbGF1bmF5U2hvd0FuaW1hdGlvbicpO1xuXG4gICAgLy8gVE9ETzogRFJZXG4gICAgLy8gb25seSBzZXQgb3B0aW9uIGZyb20gY29va2llIGlmIGl0IGV4aXN0cywgcGFyc2UgdG8gYm9vbGVhblxuICAgIGlmIChzaG93VHJpYW5nbGVzKSB7XG4gICAgICBvcHRpb25zLnNob3dUcmlhbmdsZXMgPSBzaG93VHJpYW5nbGVzID0gc2hvd1RyaWFuZ2xlcyA9PT0gJ3RydWUnID8gdHJ1ZSA6IGZhbHNlO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBzYXZlIG9wdGlvbiBzdGF0ZSBmb3Igc2V0dGluZyBjb29raWUgbGF0ZXJcbiAgICAgIHNob3dUcmlhbmdsZXMgPSBkZWZhdWx0cy5zaG93VHJpYW5nbGVzO1xuICAgIH1cblxuICAgIGlmIChzaG93UG9pbnRzKSB7XG4gICAgICBvcHRpb25zLnNob3dQb2ludHMgPSBzaG93UG9pbnRzID0gc2hvd1BvaW50cyA9PT0gJ3RydWUnID8gdHJ1ZSA6IGZhbHNlO1xuICAgIH0gZWxzZSB7XG4gICAgICBzaG93UG9pbnRzID0gZGVmYXVsdHMuc2hvd1BvaW50cztcbiAgICB9XG5cbiAgICBpZiAoc2hvd0NpcmNsZXMpIHtcbiAgICAgIG9wdGlvbnMuc2hvd0NpcmNsZXMgPSBzaG93Q2lyY2xlcyA9IHNob3dDaXJjbGVzID09PSAndHJ1ZScgPyB0cnVlIDogZmFsc2U7XG4gICAgfSBlbHNlIHtcbiAgICAgIHNob3dDaXJjbGVzID0gZGVmYXVsdHMuc2hvd0NpcmNsZXM7XG4gICAgfVxuXG4gICAgaWYgKHNob3dDZW50cm9pZHMpIHtcbiAgICAgIG9wdGlvbnMuc2hvd0NlbnRyb2lkcyA9IHNob3dDZW50cm9pZHMgPSBzaG93Q2VudHJvaWRzID09PSAndHJ1ZScgPyB0cnVlIDogZmFsc2U7XG4gICAgfSBlbHNlIHtcbiAgICAgIHNob3dDZW50cm9pZHMgPSBkZWZhdWx0cy5zaG93Q2VudHJvaWRzO1xuICAgIH1cblxuICAgIGlmIChzaG93RWRnZXMpIHtcbiAgICAgIG9wdGlvbnMuc2hvd0VkZ2VzID0gc2hvd0VkZ2VzID0gc2hvd0VkZ2VzID09PSAndHJ1ZScgPyB0cnVlIDogZmFsc2U7XG4gICAgfSBlbHNlIHtcbiAgICAgIHNob3dFZGdlcyA9IGRlZmF1bHRzLnNob3dFZGdlcztcbiAgICB9XG5cbiAgICBpZiAoc2hvd0FuaW1hdGlvbikge1xuICAgICAgb3B0aW9ucy5zaG93QW5pbWF0aW9uID0gc2hvd0FuaW1hdGlvbiA9IHNob3dBbmltYXRpb24gPT09ICd0cnVlJyA/IHRydWUgOiBmYWxzZTtcbiAgICB9IGVsc2Uge1xuICAgICAgc2hvd0FuaW1hdGlvbiA9IGRlZmF1bHRzLnNob3dBbmltYXRpb247XG4gICAgfVxuICB9XG5cbiAgLy8gZ2V0IG9wdGlvbnMgZnJvbSBpbnB1dCBmaWVsZHNcbiAgZnVuY3Rpb24gZ2V0UmFuZG9taXplT3B0aW9ucygpIHtcbiAgICB2YXIgdXNlTXVsdGlwbGllciA9IG11bHRpcGxpZXJSYWRpby5jaGVja2VkO1xuICAgIG11bHRpcGxpZXIgPSBwYXJzZUZsb2F0KG11bHRpcGxpZXJJbnB1dC52YWx1ZSk7XG4gICAgbWluUG9pbnRzID0gdXNlTXVsdGlwbGllciA/IDAgOiBwYXJzZUludChtaW5JbnB1dC52YWx1ZSk7XG4gICAgbWF4UG9pbnRzID0gdXNlTXVsdGlwbGllciA/IDAgOiBwYXJzZUludChtYXhJbnB1dC52YWx1ZSk7XG4gICAgbWluRWRnZVBvaW50cyA9IHVzZU11bHRpcGxpZXIgPyAwIDogcGFyc2VJbnQobWluRWRnZUlucHV0LnZhbHVlKTtcbiAgICBtYXhFZGdlUG9pbnRzID0gdXNlTXVsdGlwbGllciA/IDAgOiBwYXJzZUludChtYXhFZGdlSW5wdXQudmFsdWUpO1xuICAgIG1pbkdyYWRpZW50cyA9IHBhcnNlSW50KG1pbkdyYWRpZW50SW5wdXQudmFsdWUpO1xuICAgIG1heEdyYWRpZW50cyA9IHBhcnNlSW50KG1heEdyYWRpZW50SW5wdXQudmFsdWUpO1xuICAgIGNvbG9ycyA9IGdldENvbG9ycygpO1xuICAgIGltYWdlID0gZ2V0SW1hZ2UoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBzZXQgdXAgZXZlbnRzXG4gICAqL1xuXG4gIC8vIGNsaWNrIHRoZSBidXR0b24gdG8gcmVnZW5cbiAgYnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG4gICAgcnVuRGVsYXVuYXkoKTtcbiAgfSk7XG5cbiAgLy8gY2xpY2sgdGhlIGJ1dHRvbiB0byByZWdlbiBjb2xvcnMgb25seVxuICBnZW5lcmF0ZUNvbG9yc0J1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuICAgIHZhciBuZXdDb2xvcnMgPSBnZXRDb2xvcnMoKTtcbiAgICBwcmV0dHlEZWxhdW5heS5yZW5kZXJOZXdDb2xvcnMobmV3Q29sb3JzKTtcbiAgfSk7XG5cbiAgLy8gY2xpY2sgdGhlIGJ1dHRvbiB0byByZWdlbiBjb2xvcnMgb25seVxuICBnZW5lcmF0ZUdyYWRpZW50QnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG4gICAgZ2V0UmFuZG9taXplT3B0aW9ucygpO1xuICAgIHByZXR0eURlbGF1bmF5LnJlbmRlck5ld0dyYWRpZW50KG1pbkdyYWRpZW50cywgbWF4R3JhZGllbnRzKTtcbiAgfSk7XG5cbiAgLy8gY2xpY2sgdGhlIGJ1dHRvbiB0byByZWdlbiBjb2xvcnMgb25seVxuICBnZW5lcmF0ZVRyaWFuZ2xlc0J1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuICAgIGdldFJhbmRvbWl6ZU9wdGlvbnMoKTtcbiAgICBwcmV0dHlEZWxhdW5heS5yZW5kZXJOZXdUcmlhbmdsZXMobWluUG9pbnRzLCBtYXhQb2ludHMsIG1pbkVkZ2VQb2ludHMsIG1heEVkZ2VQb2ludHMsIG11bHRpcGxpZXIpO1xuICB9KTtcblxuICAvLyB0dXJuIFRyaWFuZ2xlcyBvZmYvb25cbiAgdG9nZ2xlVHJpYW5nbGVzQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG4gICAgc2hvd1RyaWFuZ2xlcyA9ICFzaG93VHJpYW5nbGVzO1xuICAgIENvb2tpZXMuc2V0SXRlbSgnRGVsYXVuYXlTaG93VHJpYW5nbGVzJywgc2hvd1RyaWFuZ2xlcyk7XG4gICAgcHJldHR5RGVsYXVuYXkudG9nZ2xlVHJpYW5nbGVzKCk7XG4gIH0pO1xuXG4gIC8vIHR1cm4gUG9pbnRzIG9mZi9vblxuICB0b2dnbGVQb2ludHNCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbigpIHtcbiAgICBzaG93UG9pbnRzID0gIXNob3dQb2ludHM7XG4gICAgQ29va2llcy5zZXRJdGVtKCdEZWxhdW5heVNob3dQb2ludHMnLCBzaG93UG9pbnRzKTtcbiAgICBwcmV0dHlEZWxhdW5heS50b2dnbGVQb2ludHMoKTtcbiAgfSk7XG5cbiAgLy8gdHVybiBDaXJjbGVzIG9mZi9vblxuICB0b2dnbGVDaXJjbGVzQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG4gICAgc2hvd0NpcmNsZXMgPSAhc2hvd0NpcmNsZXM7XG4gICAgQ29va2llcy5zZXRJdGVtKCdEZWxhdW5heVNob3dDaXJjbGVzJywgc2hvd0NpcmNsZXMpO1xuICAgIHByZXR0eURlbGF1bmF5LnRvZ2dsZUNpcmNsZXMoKTtcbiAgfSk7XG5cbiAgLy8gdHVybiBDZW50cm9pZHMgb2ZmL29uXG4gIHRvZ2dsZUNlbnRyb2lkc0J1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuICAgIHNob3dDZW50cm9pZHMgPSAhc2hvd0NlbnRyb2lkcztcbiAgICBDb29raWVzLnNldEl0ZW0oJ0RlbGF1bmF5U2hvd0NlbnRyb2lkcycsIHNob3dDZW50cm9pZHMpO1xuICAgIHByZXR0eURlbGF1bmF5LnRvZ2dsZUNlbnRyb2lkcygpO1xuICB9KTtcblxuICAvLyB0dXJuIEVkZ2VzIG9mZi9vblxuICB0b2dnbGVFZGdlc0J1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuICAgIHNob3dFZGdlcyA9ICFzaG93RWRnZXM7XG4gICAgQ29va2llcy5zZXRJdGVtKCdEZWxhdW5heVNob3dFZGdlcycsIHNob3dFZGdlcyk7XG4gICAgcHJldHR5RGVsYXVuYXkudG9nZ2xlRWRnZXMoKTtcbiAgfSk7XG5cbiAgLy8gdHVybiBBbmltYXRpb24gb2ZmL29uXG4gIHRvZ2dsZUFuaW1hdGlvbkJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuICAgIHNob3dBbmltYXRpb24gPSAhc2hvd0FuaW1hdGlvbjtcbiAgICBDb29raWVzLnNldEl0ZW0oJ0RlbGF1bmF5U2hvd0FuaW1hdGlvbicsIHNob3dBbmltYXRpb24pO1xuICAgIHByZXR0eURlbGF1bmF5LnRvZ2dsZUFuaW1hdGlvbigpO1xuICB9KTtcblxuICAvLyBkb250IGRvIGFueXRoaW5nIG9uIGZvcm0gc3VibWl0XG4gIGZvcm0uYWRkRXZlbnRMaXN0ZW5lcignc3VibWl0JywgZnVuY3Rpb24oZSkge1xuICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH0pO1xufSkoKTtcbiJdfQ==
