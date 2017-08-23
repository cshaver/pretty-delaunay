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
    var defaults = PrettyDelaunay.defaults();
    this.options = Object.assign({}, PrettyDelaunay.defaults(), options || {});
    this.options.gradient = Object.assign({}, defaults.gradient, options.gradient || {});

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

      this.options.minGradients = minGradients || this.options.minGradients;
      this.options.maxGradients = maxGradients || this.options.maxGradients;

      this.resizeCanvas();

      this.generateNewPoints(min, max, minEdge, maxEdge, multiplier);

      this.triangulate();

      if (!this.options.imageAsBackground) {
        this.generateGradients();

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

      minGradients = minGradients || this.options.minGradients;
      maxGradients = maxGradients || this.options.maxGradients;

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

      var minX = this.options.gradient.minX(this.canvas.width, this.canvas.height);
      var maxX = this.options.gradient.maxX(this.canvas.width, this.canvas.height);

      var minY = this.options.gradient.minY(this.canvas.width, this.canvas.height);
      var maxY = this.options.gradient.maxY(this.canvas.width, this.canvas.height);

      var minRadius = this.options.gradient.minRadius(this.canvas.width, this.canvas.height, this.numGradients);
      var maxRadius = this.options.gradient.maxRadius(this.canvas.width, this.canvas.height, this.numGradients);

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
      if (this.options.gradient.connected && this.radialGradients.length > 0) {
        var lastGradient = this.radialGradients[this.radialGradients.length - 1];
        var pointInLastCircle = Random.randomInCircle(lastGradient.r0, lastGradient.x0, lastGradient.y0);

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
        if (this.options.onDarkBackground) {
          this.options.onDarkBackground(centerColor);
        }
      } else {
        if (this.options.onLightBackground) {
          this.options.onLightBackground(centerColor);
        }
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

        gradient: {
          minX: function minX(width, height) {
            return Math.ceil(Math.sqrt(width));
          },
          maxX: function maxX(width, height) {
            return Math.ceil(width - Math.sqrt(width));
          },
          minY: function minY(width, height) {
            return Math.ceil(Math.sqrt(height));
          },
          maxY: function maxY(width, height) {
            return Math.ceil(height - Math.sqrt(height));
          },
          minRadius: function minRadius(width, height, numGradients) {
            return Math.ceil(Math.max(height, width) / Math.max(Math.sqrt(numGradients), 2));
          },
          maxRadius: function maxRadius(width, height, numGradients) {
            return Math.ceil(Math.max(height, width) / Math.max(Math.log(numGradients), 1));
          },
          connected: true
        },

        minGradients: 1,
        maxGradients: 2,

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

},{"./PrettyDelaunay/color":"/Users/cshaver/Personal/pretty-delaunay/src/PrettyDelaunay/color.js","./PrettyDelaunay/point":"/Users/cshaver/Personal/pretty-delaunay/src/PrettyDelaunay/point.js","./PrettyDelaunay/pointMap":"/Users/cshaver/Personal/pretty-delaunay/src/PrettyDelaunay/pointMap.js","./PrettyDelaunay/polyfills":"/Users/cshaver/Personal/pretty-delaunay/src/PrettyDelaunay/polyfills.js","./PrettyDelaunay/random":"/Users/cshaver/Personal/pretty-delaunay/src/PrettyDelaunay/random.js","./PrettyDelaunay/triangle":"/Users/cshaver/Personal/pretty-delaunay/src/PrettyDelaunay/triangle.js","delaunay-fast":"/Users/cshaver/Personal/pretty-delaunay/node_modules/delaunay-fast/delaunay.js"}],"/Users/cshaver/Personal/pretty-delaunay/src/PrettyDelaunay/color.js":[function(require,module,exports){
'use strict';

var Color = {

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

module.exports = Color;

},{}],"/Users/cshaver/Personal/pretty-delaunay/src/PrettyDelaunay/point.js":[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Color = require('./color');

/**
 * Represents a point
 * @class
 */

var Point = function () {
  /**
   * Point consists x and y
   * @constructor
   * @param {Number} x
   * @param {Number} y
   * or:
   * @param {Number[]} x
   * where x is length-2 array
   */
  function Point(x, y) {
    _classCallCheck(this, Point);

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


  _createClass(Point, [{
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

  return Point;
}();

module.exports = Point;

},{"./color":"/Users/cshaver/Personal/pretty-delaunay/src/PrettyDelaunay/color.js"}],"/Users/cshaver/Personal/pretty-delaunay/src/PrettyDelaunay/pointMap.js":[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Point = require('./point');

/**
 * Represents a point
 * @class
 */

var PointMap = function () {
  function PointMap() {
    _classCallCheck(this, PointMap);

    this._map = {};
  }

  // adds point to map


  _createClass(PointMap, [{
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

  return PointMap;
}();

module.exports = PointMap;

},{"./point":"/Users/cshaver/Personal/pretty-delaunay/src/PrettyDelaunay/point.js"}],"/Users/cshaver/Personal/pretty-delaunay/src/PrettyDelaunay/polyfills.js":[function(require,module,exports){
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

},{}],"/Users/cshaver/Personal/pretty-delaunay/src/PrettyDelaunay/random.js":[function(require,module,exports){
'use strict';

var Point = require('./point');

var Random = {
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

module.exports = Random;

},{"./point":"/Users/cshaver/Personal/pretty-delaunay/src/PrettyDelaunay/point.js"}],"/Users/cshaver/Personal/pretty-delaunay/src/PrettyDelaunay/triangle.js":[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Point = require('./point');

/**
 * Represents a triangle
 * @class
 */

var Triangle = function () {
  /**
   * Triangle consists of three Points
   * @constructor
   * @param {Object} a
   * @param {Object} b
   * @param {Object} c
   */
  function Triangle(a, b, c) {
    _classCallCheck(this, Triangle);

    this.p1 = this.a = a;
    this.p2 = this.b = b;
    this.p3 = this.c = c;

    this.color = 'black';
    this.stroke = 'black';
  }

  // draw the triangle with differing edge colors optional


  _createClass(Triangle, [{
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

  return Triangle;
}();

module.exports = Triangle;

},{"./point":"/Users/cshaver/Personal/pretty-delaunay/src/PrettyDelaunay/point.js"}],"/Users/cshaver/Personal/pretty-delaunay/src/demo.js":[function(require,module,exports){
'use strict';

var PrettyDelaunay = require('./PrettyDelaunay');
var Color = require('./PrettyDelaunay/color');
var Random = require('./PrettyDelaunay/random');

// grab DOM elements
var main = document.getElementById('main');
var form = document.getElementById('form');
var canvas = document.getElementById('canvas');

var generateButton = document.getElementById('generate');

var generateColorsButton = document.getElementById('generate-colors');
var generateGradientButton = document.getElementById('generate-gradient');
var generateTrianglesButton = document.getElementById('generate-triangles');

var showTrianglesInput = document.getElementById('show-triangles');
var showPointsInput = document.getElementById('show-points');
var showCirclesInput = document.getElementById('show-circles');
var showCentroidsInput = document.getElementById('show-centroids');
var showEdgesInput = document.getElementById('show-edges');
var showHoverInput = document.getElementById('show-hover');
var showAnimationInput = document.getElementById('show-animation');

var multiplierRadio = document.getElementById('point-gen-option-multiplier');
var multiplierInput = document.getElementById('points-multiplier');
var maxInput = document.getElementById('max-points');
var minInput = document.getElementById('min-points');
var maxEdgeInput = document.getElementById('max-edge-points');
var minEdgeInput = document.getElementById('min-edge-points');
var maxGradientInput = document.getElementById('max-gradients');
var minGradientInput = document.getElementById('min-gradients');

var imageBackgroundUpload = document.getElementById('image-background-upload');
var imageBackgroundURL = document.getElementById('image-background-url');

var randomizeOptions = {};

var minPoints = void 0,
    maxPoints = void 0,
    minEdgePoints = void 0,
    maxEdgePoints = void 0,
    minGradients = void 0,
    maxGradients = void 0,
    multiplier = void 0,
    colors = void 0,
    image = void 0;

var showTriangles = void 0,
    showPoints = void 0,
    showCircles = void 0,
    showCentroids = void 0,
    showEdges = void 0,
    showAnimation = void 0;

var options = {
  onDarkBackground: function onDarkBackground() {
    main.className = 'theme-light';
  },
  onLightBackground: function onLightBackground() {
    main.className = 'theme-dark';
  }
};

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

  if (document.getElementById('color-type-1').checked) {
    // generate random colors
    for (var i = 0; i < 3; i++) {
      var color = Random.randomHsla();
      colors.push(color);
    }
  } else {
    // use the ones in the inputs
    colors.push(Color.rgbToHsla(Color.hexToRgbaArray(document.getElementById('color-1').value)));
    colors.push(Color.rgbToHsla(Color.hexToRgbaArray(document.getElementById('color-2').value)));
    colors.push(Color.rgbToHsla(Color.hexToRgbaArray(document.getElementById('color-3').value)));
  }

  return colors;
}

function getImage() {
  if (!document.getElementById('color-type-3').checked) {
    return '';
  }

  if (document.getElementById('image-background-upload-option').checked && imageBackgroundUpload.files.length) {
    var file = imageBackgroundUpload.files[0];
    return window.URL.createObjectURL(file);
  } else if (document.getElementById('image-background-url-option').checked) {
    return imageBackgroundURL.value;
  } else {
    return '';
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
generateButton.addEventListener('click', function () {
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
showTrianglesInput.addEventListener('change', function (event) {
  if (event.target.checked !== showTriangles) {
    showTriangles = !showTriangles;
    prettyDelaunay.toggleTriangles();
  }
});

// turn Points off/on
showPointsInput.addEventListener('change', function (event) {
  if (event.target.checked !== showPoints) {
    showPoints = !showPoints;
    prettyDelaunay.togglePoints();
  }
});

// turn Circles off/on
showCirclesInput.addEventListener('change', function (event) {
  if (event.target.checked !== showCircles) {
    showCircles = !showCircles;
    prettyDelaunay.toggleCircles();
  }
});

// turn Centroids off/on
showCentroidsInput.addEventListener('change', function (event) {
  if (event.target.checked !== showCentroids) {
    showCentroids = !showCentroids;
    prettyDelaunay.toggleCentroids();
  }
});

// turn Edges off/on
showEdgesInput.addEventListener('change', function (event) {
  if (event.target.checked !== showEdges) {
    showEdges = !showEdges;
    prettyDelaunay.toggleEdges();
  }
});

// turn Animation off/on
showAnimationInput.addEventListener('change', function (event) {
  if (event.target.checked !== showAnimation) {
    showAnimation = !showAnimation;
    prettyDelaunay.toggleAnimation();
  }
});

// dont do anything on form submit
form.addEventListener('submit', function (e) {
  e.preventDefault();
  return false;
});

},{"./PrettyDelaunay":"/Users/cshaver/Personal/pretty-delaunay/src/PrettyDelaunay.js","./PrettyDelaunay/color":"/Users/cshaver/Personal/pretty-delaunay/src/PrettyDelaunay/color.js","./PrettyDelaunay/random":"/Users/cshaver/Personal/pretty-delaunay/src/PrettyDelaunay/random.js"}]},{},["/Users/cshaver/Personal/pretty-delaunay/src/demo.js"])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvZGVsYXVuYXktZmFzdC9kZWxhdW5heS5qcyIsInNyYy9QcmV0dHlEZWxhdW5heS5qcyIsInNyYy9QcmV0dHlEZWxhdW5heS9jb2xvci5qcyIsInNyYy9QcmV0dHlEZWxhdW5heS9wb2ludC5qcyIsInNyYy9QcmV0dHlEZWxhdW5heS9wb2ludE1hcC5qcyIsInNyYy9QcmV0dHlEZWxhdW5heS9wb2x5ZmlsbHMuanMiLCJzcmMvUHJldHR5RGVsYXVuYXkvcmFuZG9tLmpzIiwic3JjL1ByZXR0eURlbGF1bmF5L3RyaWFuZ2xlLmpzIiwic3JjL2RlbW8uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FB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QUFDeEQsTUFBSSxNQUFNLE1BQU4sQ0FBYSxPQUFiLEtBQXlCLFNBQTdCLEVBQXdDO0FBQ3RDLGdCQUFZLENBQUMsU0FBYjtBQUNBLG1CQUFlLFdBQWY7QUFDRDtBQUNGLENBTEQ7O0FBT0E7QUFDQSxtQkFBbUIsZ0JBQW5CLENBQW9DLFFBQXBDLEVBQThDLFVBQVMsS0FBVCxFQUFnQjtBQUM1RCxNQUFJLE1BQU0sTUFBTixDQUFhLE9BQWIsS0FBeUIsYUFBN0IsRUFBNEM7QUFDMUMsb0JBQWdCLENBQUMsYUFBakI7QUFDQSxtQkFBZSxlQUFmO0FBQ0Q7QUFDRixDQUxEOztBQU9BO0FBQ0EsS0FBSyxnQkFBTCxDQUFzQixRQUF0QixFQUFnQyxVQUFTLENBQVQsRUFBWTtBQUMxQyxJQUFFLGNBQUY7QUFDQSxTQUFPLEtBQVA7QUFDRCxDQUhEIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBEZWxhdW5heTtcblxuKGZ1bmN0aW9uKCkge1xuICBcInVzZSBzdHJpY3RcIjtcblxuICB2YXIgRVBTSUxPTiA9IDEuMCAvIDEwNDg1NzYuMDtcblxuICBmdW5jdGlvbiBzdXBlcnRyaWFuZ2xlKHZlcnRpY2VzKSB7XG4gICAgdmFyIHhtaW4gPSBOdW1iZXIuUE9TSVRJVkVfSU5GSU5JVFksXG4gICAgICAgIHltaW4gPSBOdW1iZXIuUE9TSVRJVkVfSU5GSU5JVFksXG4gICAgICAgIHhtYXggPSBOdW1iZXIuTkVHQVRJVkVfSU5GSU5JVFksXG4gICAgICAgIHltYXggPSBOdW1iZXIuTkVHQVRJVkVfSU5GSU5JVFksXG4gICAgICAgIGksIGR4LCBkeSwgZG1heCwgeG1pZCwgeW1pZDtcblxuICAgIGZvcihpID0gdmVydGljZXMubGVuZ3RoOyBpLS07ICkge1xuICAgICAgaWYodmVydGljZXNbaV1bMF0gPCB4bWluKSB4bWluID0gdmVydGljZXNbaV1bMF07XG4gICAgICBpZih2ZXJ0aWNlc1tpXVswXSA+IHhtYXgpIHhtYXggPSB2ZXJ0aWNlc1tpXVswXTtcbiAgICAgIGlmKHZlcnRpY2VzW2ldWzFdIDwgeW1pbikgeW1pbiA9IHZlcnRpY2VzW2ldWzFdO1xuICAgICAgaWYodmVydGljZXNbaV1bMV0gPiB5bWF4KSB5bWF4ID0gdmVydGljZXNbaV1bMV07XG4gICAgfVxuXG4gICAgZHggPSB4bWF4IC0geG1pbjtcbiAgICBkeSA9IHltYXggLSB5bWluO1xuICAgIGRtYXggPSBNYXRoLm1heChkeCwgZHkpO1xuICAgIHhtaWQgPSB4bWluICsgZHggKiAwLjU7XG4gICAgeW1pZCA9IHltaW4gKyBkeSAqIDAuNTtcblxuICAgIHJldHVybiBbXG4gICAgICBbeG1pZCAtIDIwICogZG1heCwgeW1pZCAtICAgICAgZG1heF0sXG4gICAgICBbeG1pZCAgICAgICAgICAgICwgeW1pZCArIDIwICogZG1heF0sXG4gICAgICBbeG1pZCArIDIwICogZG1heCwgeW1pZCAtICAgICAgZG1heF1cbiAgICBdO1xuICB9XG5cbiAgZnVuY3Rpb24gY2lyY3VtY2lyY2xlKHZlcnRpY2VzLCBpLCBqLCBrKSB7XG4gICAgdmFyIHgxID0gdmVydGljZXNbaV1bMF0sXG4gICAgICAgIHkxID0gdmVydGljZXNbaV1bMV0sXG4gICAgICAgIHgyID0gdmVydGljZXNbal1bMF0sXG4gICAgICAgIHkyID0gdmVydGljZXNbal1bMV0sXG4gICAgICAgIHgzID0gdmVydGljZXNba11bMF0sXG4gICAgICAgIHkzID0gdmVydGljZXNba11bMV0sXG4gICAgICAgIGZhYnN5MXkyID0gTWF0aC5hYnMoeTEgLSB5MiksXG4gICAgICAgIGZhYnN5MnkzID0gTWF0aC5hYnMoeTIgLSB5MyksXG4gICAgICAgIHhjLCB5YywgbTEsIG0yLCBteDEsIG14MiwgbXkxLCBteTIsIGR4LCBkeTtcblxuICAgIC8qIENoZWNrIGZvciBjb2luY2lkZW50IHBvaW50cyAqL1xuICAgIGlmKGZhYnN5MXkyIDwgRVBTSUxPTiAmJiBmYWJzeTJ5MyA8IEVQU0lMT04pXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJFZWshIENvaW5jaWRlbnQgcG9pbnRzIVwiKTtcblxuICAgIGlmKGZhYnN5MXkyIDwgRVBTSUxPTikge1xuICAgICAgbTIgID0gLSgoeDMgLSB4MikgLyAoeTMgLSB5MikpO1xuICAgICAgbXgyID0gKHgyICsgeDMpIC8gMi4wO1xuICAgICAgbXkyID0gKHkyICsgeTMpIC8gMi4wO1xuICAgICAgeGMgID0gKHgyICsgeDEpIC8gMi4wO1xuICAgICAgeWMgID0gbTIgKiAoeGMgLSBteDIpICsgbXkyO1xuICAgIH1cblxuICAgIGVsc2UgaWYoZmFic3kyeTMgPCBFUFNJTE9OKSB7XG4gICAgICBtMSAgPSAtKCh4MiAtIHgxKSAvICh5MiAtIHkxKSk7XG4gICAgICBteDEgPSAoeDEgKyB4MikgLyAyLjA7XG4gICAgICBteTEgPSAoeTEgKyB5MikgLyAyLjA7XG4gICAgICB4YyAgPSAoeDMgKyB4MikgLyAyLjA7XG4gICAgICB5YyAgPSBtMSAqICh4YyAtIG14MSkgKyBteTE7XG4gICAgfVxuXG4gICAgZWxzZSB7XG4gICAgICBtMSAgPSAtKCh4MiAtIHgxKSAvICh5MiAtIHkxKSk7XG4gICAgICBtMiAgPSAtKCh4MyAtIHgyKSAvICh5MyAtIHkyKSk7XG4gICAgICBteDEgPSAoeDEgKyB4MikgLyAyLjA7XG4gICAgICBteDIgPSAoeDIgKyB4MykgLyAyLjA7XG4gICAgICBteTEgPSAoeTEgKyB5MikgLyAyLjA7XG4gICAgICBteTIgPSAoeTIgKyB5MykgLyAyLjA7XG4gICAgICB4YyAgPSAobTEgKiBteDEgLSBtMiAqIG14MiArIG15MiAtIG15MSkgLyAobTEgLSBtMik7XG4gICAgICB5YyAgPSAoZmFic3kxeTIgPiBmYWJzeTJ5MykgP1xuICAgICAgICBtMSAqICh4YyAtIG14MSkgKyBteTEgOlxuICAgICAgICBtMiAqICh4YyAtIG14MikgKyBteTI7XG4gICAgfVxuXG4gICAgZHggPSB4MiAtIHhjO1xuICAgIGR5ID0geTIgLSB5YztcbiAgICByZXR1cm4ge2k6IGksIGo6IGosIGs6IGssIHg6IHhjLCB5OiB5YywgcjogZHggKiBkeCArIGR5ICogZHl9O1xuICB9XG5cbiAgZnVuY3Rpb24gZGVkdXAoZWRnZXMpIHtcbiAgICB2YXIgaSwgaiwgYSwgYiwgbSwgbjtcblxuICAgIGZvcihqID0gZWRnZXMubGVuZ3RoOyBqOyApIHtcbiAgICAgIGIgPSBlZGdlc1stLWpdO1xuICAgICAgYSA9IGVkZ2VzWy0tal07XG5cbiAgICAgIGZvcihpID0gajsgaTsgKSB7XG4gICAgICAgIG4gPSBlZGdlc1stLWldO1xuICAgICAgICBtID0gZWRnZXNbLS1pXTtcblxuICAgICAgICBpZigoYSA9PT0gbSAmJiBiID09PSBuKSB8fCAoYSA9PT0gbiAmJiBiID09PSBtKSkge1xuICAgICAgICAgIGVkZ2VzLnNwbGljZShqLCAyKTtcbiAgICAgICAgICBlZGdlcy5zcGxpY2UoaSwgMik7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBEZWxhdW5heSA9IHtcbiAgICB0cmlhbmd1bGF0ZTogZnVuY3Rpb24odmVydGljZXMsIGtleSkge1xuICAgICAgdmFyIG4gPSB2ZXJ0aWNlcy5sZW5ndGgsXG4gICAgICAgICAgaSwgaiwgaW5kaWNlcywgc3QsIG9wZW4sIGNsb3NlZCwgZWRnZXMsIGR4LCBkeSwgYSwgYiwgYztcblxuICAgICAgLyogQmFpbCBpZiB0aGVyZSBhcmVuJ3QgZW5vdWdoIHZlcnRpY2VzIHRvIGZvcm0gYW55IHRyaWFuZ2xlcy4gKi9cbiAgICAgIGlmKG4gPCAzKVxuICAgICAgICByZXR1cm4gW107XG5cbiAgICAgIC8qIFNsaWNlIG91dCB0aGUgYWN0dWFsIHZlcnRpY2VzIGZyb20gdGhlIHBhc3NlZCBvYmplY3RzLiAoRHVwbGljYXRlIHRoZVxuICAgICAgICogYXJyYXkgZXZlbiBpZiB3ZSBkb24ndCwgdGhvdWdoLCBzaW5jZSB3ZSBuZWVkIHRvIG1ha2UgYSBzdXBlcnRyaWFuZ2xlXG4gICAgICAgKiBsYXRlciBvbiEpICovXG4gICAgICB2ZXJ0aWNlcyA9IHZlcnRpY2VzLnNsaWNlKDApO1xuXG4gICAgICBpZihrZXkpXG4gICAgICAgIGZvcihpID0gbjsgaS0tOyApXG4gICAgICAgICAgdmVydGljZXNbaV0gPSB2ZXJ0aWNlc1tpXVtrZXldO1xuXG4gICAgICAvKiBNYWtlIGFuIGFycmF5IG9mIGluZGljZXMgaW50byB0aGUgdmVydGV4IGFycmF5LCBzb3J0ZWQgYnkgdGhlXG4gICAgICAgKiB2ZXJ0aWNlcycgeC1wb3NpdGlvbi4gKi9cbiAgICAgIGluZGljZXMgPSBuZXcgQXJyYXkobik7XG5cbiAgICAgIGZvcihpID0gbjsgaS0tOyApXG4gICAgICAgIGluZGljZXNbaV0gPSBpO1xuXG4gICAgICBpbmRpY2VzLnNvcnQoZnVuY3Rpb24oaSwgaikge1xuICAgICAgICByZXR1cm4gdmVydGljZXNbal1bMF0gLSB2ZXJ0aWNlc1tpXVswXTtcbiAgICAgIH0pO1xuXG4gICAgICAvKiBOZXh0LCBmaW5kIHRoZSB2ZXJ0aWNlcyBvZiB0aGUgc3VwZXJ0cmlhbmdsZSAod2hpY2ggY29udGFpbnMgYWxsIG90aGVyXG4gICAgICAgKiB0cmlhbmdsZXMpLCBhbmQgYXBwZW5kIHRoZW0gb250byB0aGUgZW5kIG9mIGEgKGNvcHkgb2YpIHRoZSB2ZXJ0ZXhcbiAgICAgICAqIGFycmF5LiAqL1xuICAgICAgc3QgPSBzdXBlcnRyaWFuZ2xlKHZlcnRpY2VzKTtcbiAgICAgIHZlcnRpY2VzLnB1c2goc3RbMF0sIHN0WzFdLCBzdFsyXSk7XG4gICAgICBcbiAgICAgIC8qIEluaXRpYWxpemUgdGhlIG9wZW4gbGlzdCAoY29udGFpbmluZyB0aGUgc3VwZXJ0cmlhbmdsZSBhbmQgbm90aGluZ1xuICAgICAgICogZWxzZSkgYW5kIHRoZSBjbG9zZWQgbGlzdCAod2hpY2ggaXMgZW1wdHkgc2luY2Ugd2UgaGF2bid0IHByb2Nlc3NlZFxuICAgICAgICogYW55IHRyaWFuZ2xlcyB5ZXQpLiAqL1xuICAgICAgb3BlbiAgID0gW2NpcmN1bWNpcmNsZSh2ZXJ0aWNlcywgbiArIDAsIG4gKyAxLCBuICsgMildO1xuICAgICAgY2xvc2VkID0gW107XG4gICAgICBlZGdlcyAgPSBbXTtcblxuICAgICAgLyogSW5jcmVtZW50YWxseSBhZGQgZWFjaCB2ZXJ0ZXggdG8gdGhlIG1lc2guICovXG4gICAgICBmb3IoaSA9IGluZGljZXMubGVuZ3RoOyBpLS07IGVkZ2VzLmxlbmd0aCA9IDApIHtcbiAgICAgICAgYyA9IGluZGljZXNbaV07XG5cbiAgICAgICAgLyogRm9yIGVhY2ggb3BlbiB0cmlhbmdsZSwgY2hlY2sgdG8gc2VlIGlmIHRoZSBjdXJyZW50IHBvaW50IGlzXG4gICAgICAgICAqIGluc2lkZSBpdCdzIGNpcmN1bWNpcmNsZS4gSWYgaXQgaXMsIHJlbW92ZSB0aGUgdHJpYW5nbGUgYW5kIGFkZFxuICAgICAgICAgKiBpdCdzIGVkZ2VzIHRvIGFuIGVkZ2UgbGlzdC4gKi9cbiAgICAgICAgZm9yKGogPSBvcGVuLmxlbmd0aDsgai0tOyApIHtcbiAgICAgICAgICAvKiBJZiB0aGlzIHBvaW50IGlzIHRvIHRoZSByaWdodCBvZiB0aGlzIHRyaWFuZ2xlJ3MgY2lyY3VtY2lyY2xlLFxuICAgICAgICAgICAqIHRoZW4gdGhpcyB0cmlhbmdsZSBzaG91bGQgbmV2ZXIgZ2V0IGNoZWNrZWQgYWdhaW4uIFJlbW92ZSBpdFxuICAgICAgICAgICAqIGZyb20gdGhlIG9wZW4gbGlzdCwgYWRkIGl0IHRvIHRoZSBjbG9zZWQgbGlzdCwgYW5kIHNraXAuICovXG4gICAgICAgICAgZHggPSB2ZXJ0aWNlc1tjXVswXSAtIG9wZW5bal0ueDtcbiAgICAgICAgICBpZihkeCA+IDAuMCAmJiBkeCAqIGR4ID4gb3BlbltqXS5yKSB7XG4gICAgICAgICAgICBjbG9zZWQucHVzaChvcGVuW2pdKTtcbiAgICAgICAgICAgIG9wZW4uc3BsaWNlKGosIDEpO1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLyogSWYgd2UncmUgb3V0c2lkZSB0aGUgY2lyY3VtY2lyY2xlLCBza2lwIHRoaXMgdHJpYW5nbGUuICovXG4gICAgICAgICAgZHkgPSB2ZXJ0aWNlc1tjXVsxXSAtIG9wZW5bal0ueTtcbiAgICAgICAgICBpZihkeCAqIGR4ICsgZHkgKiBkeSAtIG9wZW5bal0uciA+IEVQU0lMT04pXG4gICAgICAgICAgICBjb250aW51ZTtcblxuICAgICAgICAgIC8qIFJlbW92ZSB0aGUgdHJpYW5nbGUgYW5kIGFkZCBpdCdzIGVkZ2VzIHRvIHRoZSBlZGdlIGxpc3QuICovXG4gICAgICAgICAgZWRnZXMucHVzaChcbiAgICAgICAgICAgIG9wZW5bal0uaSwgb3BlbltqXS5qLFxuICAgICAgICAgICAgb3BlbltqXS5qLCBvcGVuW2pdLmssXG4gICAgICAgICAgICBvcGVuW2pdLmssIG9wZW5bal0uaVxuICAgICAgICAgICk7XG4gICAgICAgICAgb3Blbi5zcGxpY2UoaiwgMSk7XG4gICAgICAgIH1cblxuICAgICAgICAvKiBSZW1vdmUgYW55IGRvdWJsZWQgZWRnZXMuICovXG4gICAgICAgIGRlZHVwKGVkZ2VzKTtcblxuICAgICAgICAvKiBBZGQgYSBuZXcgdHJpYW5nbGUgZm9yIGVhY2ggZWRnZS4gKi9cbiAgICAgICAgZm9yKGogPSBlZGdlcy5sZW5ndGg7IGo7ICkge1xuICAgICAgICAgIGIgPSBlZGdlc1stLWpdO1xuICAgICAgICAgIGEgPSBlZGdlc1stLWpdO1xuICAgICAgICAgIG9wZW4ucHVzaChjaXJjdW1jaXJjbGUodmVydGljZXMsIGEsIGIsIGMpKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvKiBDb3B5IGFueSByZW1haW5pbmcgb3BlbiB0cmlhbmdsZXMgdG8gdGhlIGNsb3NlZCBsaXN0LCBhbmQgdGhlblxuICAgICAgICogcmVtb3ZlIGFueSB0cmlhbmdsZXMgdGhhdCBzaGFyZSBhIHZlcnRleCB3aXRoIHRoZSBzdXBlcnRyaWFuZ2xlLFxuICAgICAgICogYnVpbGRpbmcgYSBsaXN0IG9mIHRyaXBsZXRzIHRoYXQgcmVwcmVzZW50IHRyaWFuZ2xlcy4gKi9cbiAgICAgIGZvcihpID0gb3Blbi5sZW5ndGg7IGktLTsgKVxuICAgICAgICBjbG9zZWQucHVzaChvcGVuW2ldKTtcbiAgICAgIG9wZW4ubGVuZ3RoID0gMDtcblxuICAgICAgZm9yKGkgPSBjbG9zZWQubGVuZ3RoOyBpLS07IClcbiAgICAgICAgaWYoY2xvc2VkW2ldLmkgPCBuICYmIGNsb3NlZFtpXS5qIDwgbiAmJiBjbG9zZWRbaV0uayA8IG4pXG4gICAgICAgICAgb3Blbi5wdXNoKGNsb3NlZFtpXS5pLCBjbG9zZWRbaV0uaiwgY2xvc2VkW2ldLmspO1xuXG4gICAgICAvKiBZYXksIHdlJ3JlIGRvbmUhICovXG4gICAgICByZXR1cm4gb3BlbjtcbiAgICB9LFxuICAgIGNvbnRhaW5zOiBmdW5jdGlvbih0cmksIHApIHtcbiAgICAgIC8qIEJvdW5kaW5nIGJveCB0ZXN0IGZpcnN0LCBmb3IgcXVpY2sgcmVqZWN0aW9ucy4gKi9cbiAgICAgIGlmKChwWzBdIDwgdHJpWzBdWzBdICYmIHBbMF0gPCB0cmlbMV1bMF0gJiYgcFswXSA8IHRyaVsyXVswXSkgfHxcbiAgICAgICAgIChwWzBdID4gdHJpWzBdWzBdICYmIHBbMF0gPiB0cmlbMV1bMF0gJiYgcFswXSA+IHRyaVsyXVswXSkgfHxcbiAgICAgICAgIChwWzFdIDwgdHJpWzBdWzFdICYmIHBbMV0gPCB0cmlbMV1bMV0gJiYgcFsxXSA8IHRyaVsyXVsxXSkgfHxcbiAgICAgICAgIChwWzFdID4gdHJpWzBdWzFdICYmIHBbMV0gPiB0cmlbMV1bMV0gJiYgcFsxXSA+IHRyaVsyXVsxXSkpXG4gICAgICAgIHJldHVybiBudWxsO1xuXG4gICAgICB2YXIgYSA9IHRyaVsxXVswXSAtIHRyaVswXVswXSxcbiAgICAgICAgICBiID0gdHJpWzJdWzBdIC0gdHJpWzBdWzBdLFxuICAgICAgICAgIGMgPSB0cmlbMV1bMV0gLSB0cmlbMF1bMV0sXG4gICAgICAgICAgZCA9IHRyaVsyXVsxXSAtIHRyaVswXVsxXSxcbiAgICAgICAgICBpID0gYSAqIGQgLSBiICogYztcblxuICAgICAgLyogRGVnZW5lcmF0ZSB0cmkuICovXG4gICAgICBpZihpID09PSAwLjApXG4gICAgICAgIHJldHVybiBudWxsO1xuXG4gICAgICB2YXIgdSA9IChkICogKHBbMF0gLSB0cmlbMF1bMF0pIC0gYiAqIChwWzFdIC0gdHJpWzBdWzFdKSkgLyBpLFxuICAgICAgICAgIHYgPSAoYSAqIChwWzFdIC0gdHJpWzBdWzFdKSAtIGMgKiAocFswXSAtIHRyaVswXVswXSkpIC8gaTtcblxuICAgICAgLyogSWYgd2UncmUgb3V0c2lkZSB0aGUgdHJpLCBmYWlsLiAqL1xuICAgICAgaWYodSA8IDAuMCB8fCB2IDwgMC4wIHx8ICh1ICsgdikgPiAxLjApXG4gICAgICAgIHJldHVybiBudWxsO1xuXG4gICAgICByZXR1cm4gW3UsIHZdO1xuICAgIH1cbiAgfTtcblxuICBpZih0eXBlb2YgbW9kdWxlICE9PSBcInVuZGVmaW5lZFwiKVxuICAgIG1vZHVsZS5leHBvcnRzID0gRGVsYXVuYXk7XG59KSgpO1xuIiwiY29uc3QgRGVsYXVuYXkgPSByZXF1aXJlKCdkZWxhdW5heS1mYXN0Jyk7XG5jb25zdCBDb2xvciA9IHJlcXVpcmUoJy4vUHJldHR5RGVsYXVuYXkvY29sb3InKTtcbmNvbnN0IFJhbmRvbSA9IHJlcXVpcmUoJy4vUHJldHR5RGVsYXVuYXkvcmFuZG9tJyk7XG5jb25zdCBUcmlhbmdsZSA9IHJlcXVpcmUoJy4vUHJldHR5RGVsYXVuYXkvdHJpYW5nbGUnKTtcbmNvbnN0IFBvaW50ID0gcmVxdWlyZSgnLi9QcmV0dHlEZWxhdW5heS9wb2ludCcpO1xuY29uc3QgUG9pbnRNYXAgPSByZXF1aXJlKCcuL1ByZXR0eURlbGF1bmF5L3BvaW50TWFwJyk7XG5cbnJlcXVpcmUoJy4vUHJldHR5RGVsYXVuYXkvcG9seWZpbGxzJykoKTtcblxuLyoqXG4qIFJlcHJlc2VudHMgYSBkZWxhdW5leSB0cmlhbmd1bGF0aW9uIG9mIHJhbmRvbSBwb2ludHNcbiogaHR0cHM6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvRGVsYXVuYXlfdHJpYW5ndWxhdGlvblxuKi9cbmNsYXNzIFByZXR0eURlbGF1bmF5IHtcbiAgLyoqXG4gICAqIEBjb25zdHJ1Y3RvclxuICAgKi9cbiAgY29uc3RydWN0b3IoY2FudmFzLCBvcHRpb25zKSB7XG4gICAgLy8gbWVyZ2UgZ2l2ZW4gb3B0aW9ucyB3aXRoIGRlZmF1bHRzXG4gICAgbGV0IGRlZmF1bHRzID0gUHJldHR5RGVsYXVuYXkuZGVmYXVsdHMoKTtcbiAgICB0aGlzLm9wdGlvbnMgPSBPYmplY3QuYXNzaWduKHt9LCBQcmV0dHlEZWxhdW5heS5kZWZhdWx0cygpLCAob3B0aW9ucyB8fCB7fSkpO1xuICAgIHRoaXMub3B0aW9ucy5ncmFkaWVudCA9IE9iamVjdC5hc3NpZ24oe30sIGRlZmF1bHRzLmdyYWRpZW50LCBvcHRpb25zLmdyYWRpZW50IHx8IHt9KTtcblxuICAgIHRoaXMuY2FudmFzID0gY2FudmFzO1xuICAgIHRoaXMuY3R4ID0gY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG5cbiAgICB0aGlzLnJlc2l6ZUNhbnZhcygpO1xuICAgIHRoaXMucG9pbnRzID0gW107XG4gICAgdGhpcy5jb2xvcnMgPSB0aGlzLm9wdGlvbnMuY29sb3JzO1xuICAgIHRoaXMucG9pbnRNYXAgPSBuZXcgUG9pbnRNYXAoKTtcblxuICAgIHRoaXMubW91c2VQb3NpdGlvbiA9IGZhbHNlO1xuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5ob3Zlcikge1xuICAgICAgdGhpcy5jcmVhdGVIb3ZlclNoYWRvd0NhbnZhcygpO1xuXG4gICAgICB0aGlzLmNhbnZhcy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCAoZSkgPT4ge1xuICAgICAgICBpZiAoIXRoaXMub3B0aW9ucy5hbmltYXRlKSB7XG4gICAgICAgICAgdmFyIHJlY3QgPSBjYW52YXMuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgICAgICAgdGhpcy5tb3VzZVBvc2l0aW9uID0gbmV3IFBvaW50KGUuY2xpZW50WCAtIHJlY3QubGVmdCwgZS5jbGllbnRZIC0gcmVjdC50b3ApO1xuICAgICAgICAgIHRoaXMuaG92ZXIoKTtcbiAgICAgICAgfVxuICAgICAgfSwgZmFsc2UpO1xuXG4gICAgICB0aGlzLmNhbnZhcy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZW91dCcsICgpID0+IHtcbiAgICAgICAgaWYgKCF0aGlzLm9wdGlvbnMuYW5pbWF0ZSkge1xuICAgICAgICAgIHRoaXMubW91c2VQb3NpdGlvbiA9IGZhbHNlO1xuICAgICAgICAgIHRoaXMuaG92ZXIoKTtcbiAgICAgICAgfVxuICAgICAgfSwgZmFsc2UpO1xuICAgIH1cblxuICAgIC8vIHRocm90dGxlZCB3aW5kb3cgcmVzaXplXG4gICAgdGhpcy5yZXNpemluZyA9IGZhbHNlO1xuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdyZXNpemUnLCAoKT0+IHtcbiAgICAgIGlmICh0aGlzLnJlc2l6aW5nKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHRoaXMucmVzaXppbmcgPSB0cnVlO1xuICAgICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpPT4ge1xuICAgICAgICB0aGlzLnJlc2NhbGUoKTtcbiAgICAgICAgdGhpcy5yZXNpemluZyA9IGZhbHNlO1xuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICB0aGlzLnJhbmRvbWl6ZSgpO1xuICB9XG5cbiAgc3RhdGljIGRlZmF1bHRzKCkge1xuICAgIHJldHVybiB7XG4gICAgICAvLyBzaG93cyB0cmlhbmdsZXMgLSBmYWxzZSB3aWxsIHNob3cgdGhlIGdyYWRpZW50IGJlaGluZFxuICAgICAgc2hvd1RyaWFuZ2xlczogdHJ1ZSxcbiAgICAgIC8vIHNob3cgdGhlIHBvaW50cyB0aGF0IG1ha2UgdGhlIHRyaWFuZ3VsYXRpb25cbiAgICAgIHNob3dQb2ludHM6IGZhbHNlLFxuICAgICAgLy8gc2hvdyB0aGUgY2lyY2xlcyB0aGF0IGRlZmluZSB0aGUgZ3JhZGllbnQgbG9jYXRpb25zLCBzaXplc1xuICAgICAgc2hvd0NpcmNsZXM6IGZhbHNlLFxuICAgICAgLy8gc2hvdyB0cmlhbmdsZSBjZW50cm9pZHNcbiAgICAgIHNob3dDZW50cm9pZHM6IGZhbHNlLFxuICAgICAgLy8gc2hvdyB0cmlhbmdsZSBlZGdlc1xuICAgICAgc2hvd0VkZ2VzOiB0cnVlLFxuICAgICAgLy8gaGlnaGxpZ2h0IGhvdmVyZWQgdHJpYW5nbGVzXG4gICAgICBob3ZlcjogdHJ1ZSxcbiAgICAgIC8vIG11bHRpcGxpZXIgZm9yIHRoZSBudW1iZXIgb2YgcG9pbnRzIGdlbmVyYXRlZCBiYXNlZCBvbiBjYW52YXMgc2l6ZVxuICAgICAgbXVsdGlwbGllcjogMC41LFxuICAgICAgLy8gd2hldGhlciB0byBhbmltYXRlIHRoZSBncmFkaWVudHMgYmVoaW5kIHRoZSB0cmlhbmdsZXNcbiAgICAgIGFuaW1hdGU6IGZhbHNlLFxuICAgICAgLy8gbnVtYmVyIG9mIGZyYW1lcyBwZXIgZ3JhZGllbnQgY29sb3IgY3ljbGVcbiAgICAgIGxvb3BGcmFtZXM6IDI1MCxcblxuICAgICAgLy8gY29sb3JzIHRvIHVzZSBpbiB0aGUgZ3JhZGllbnRcbiAgICAgIGNvbG9yczogWydoc2xhKDAsIDAlLCAxMDAlLCAxKScsICdoc2xhKDAsIDAlLCA1MCUsIDEpJywgJ2hzbGEoMCwgMCUsIDAlLCAxKSddLFxuXG4gICAgICAvLyByYW5kb21seSBjaG9vc2UgZnJvbSBjb2xvciBwYWxldHRlIG9uIHJhbmRvbWl6ZSBpZiBub3Qgc3VwcGxpZWQgY29sb3JzXG4gICAgICBjb2xvclBhbGV0dGU6IGZhbHNlLFxuXG4gICAgICAvLyB1c2UgaW1hZ2UgYXMgYmFja2dyb3VuZCBpbnN0ZWFkIG9mIGdyYWRpZW50XG4gICAgICBpbWFnZUFzQmFja2dyb3VuZDogZmFsc2UsXG5cbiAgICAgIC8vIGltYWdlIHRvIHVzZSBhcyBiYWNrZ3JvdW5kXG4gICAgICBpbWFnZVVSTDogJycsXG5cbiAgICAgIC8vIGhvdyB0byByZXNpemUgdGhlIHBvaW50c1xuICAgICAgcmVzaXplTW9kZTogJ3NjYWxlUG9pbnRzJyxcbiAgICAgIC8vICduZXdQb2ludHMnIC0gZ2VuZXJhdGVzIGEgbmV3IHNldCBvZiBwb2ludHMgZm9yIHRoZSBuZXcgc2l6ZVxuICAgICAgLy8gJ3NjYWxlUG9pbnRzJyAtIGxpbmVhcmx5IHNjYWxlcyBleGlzdGluZyBwb2ludHMgYW5kIHJlLXRyaWFuZ3VsYXRlc1xuXG4gICAgICAvLyBldmVudHMgdHJpZ2dlcmVkIHdoZW4gdGhlIGNlbnRlciBvZiB0aGUgYmFja2dyb3VuZFxuICAgICAgLy8gaXMgZ3JlYXRlciBvciBsZXNzIHRoYW4gNTAgbGlnaHRuZXNzIGluIGhzbGFcbiAgICAgIC8vIGludGVuZGVkIHRvIGFkanVzdCBzb21lIHRleHQgdGhhdCBpcyBvbiB0b3BcbiAgICAgIC8vIGNvbG9yIGlzIHRoZSBjb2xvciBvZiB0aGUgY2VudGVyIG9mIHRoZSBjYW52YXNcbiAgICAgIG9uRGFya0JhY2tncm91bmQ6IGZ1bmN0aW9uKCkgeyByZXR1cm47IH0sXG4gICAgICBvbkxpZ2h0QmFja2dyb3VuZDogZnVuY3Rpb24oKSB7IHJldHVybjsgfSxcblxuICAgIFx0Z3JhZGllbnQ6IHtcbiAgICBcdFx0bWluWDogKHdpZHRoLCBoZWlnaHQpID0+IE1hdGguY2VpbChNYXRoLnNxcnQod2lkdGgpKSxcbiAgICBcdFx0bWF4WDogKHdpZHRoLCBoZWlnaHQpID0+IE1hdGguY2VpbCh3aWR0aCAtIE1hdGguc3FydCh3aWR0aCkpLFxuICAgIFx0XHRtaW5ZOiAod2lkdGgsIGhlaWdodCkgPT4gTWF0aC5jZWlsKE1hdGguc3FydChoZWlnaHQpKSxcbiAgICBcdFx0bWF4WTogKHdpZHRoLCBoZWlnaHQpID0+IE1hdGguY2VpbChoZWlnaHQgLSBNYXRoLnNxcnQoaGVpZ2h0KSksXG4gICAgXHRcdG1pblJhZGl1czogKHdpZHRoLCBoZWlnaHQsIG51bUdyYWRpZW50cykgPT4gTWF0aC5jZWlsKE1hdGgubWF4KGhlaWdodCwgd2lkdGgpIC8gTWF0aC5tYXgoTWF0aC5zcXJ0KG51bUdyYWRpZW50cyksIDIpKSxcbiAgICBcdFx0bWF4UmFkaXVzOiAod2lkdGgsIGhlaWdodCwgbnVtR3JhZGllbnRzKSA9PiBNYXRoLmNlaWwoTWF0aC5tYXgoaGVpZ2h0LCB3aWR0aCkgLyBNYXRoLm1heChNYXRoLmxvZyhudW1HcmFkaWVudHMpLCAxKSksXG4gICAgICAgIGNvbm5lY3RlZDogdHJ1ZVxuICAgIFx0fSxcblxuICAgICAgbWluR3JhZGllbnRzOiAxLFxuICAgICAgbWF4R3JhZGllbnRzOiAyLFxuXG4gICAgICAvLyB0cmlnZ2VyZWQgd2hlbiBob3ZlcmVkIG92ZXIgdHJpYW5nbGVcbiAgICAgIG9uVHJpYW5nbGVIb3ZlcjogZnVuY3Rpb24odHJpYW5nbGUsIGN0eCwgb3B0aW9ucykge1xuICAgICAgICB2YXIgZmlsbCA9IG9wdGlvbnMuaG92ZXJDb2xvcih0cmlhbmdsZS5jb2xvcik7XG4gICAgICAgIHZhciBzdHJva2UgPSBmaWxsO1xuICAgICAgICB0cmlhbmdsZS5yZW5kZXIoY3R4LCBvcHRpb25zLnNob3dFZGdlcyA/IGZpbGwgOiBmYWxzZSwgb3B0aW9ucy5zaG93RWRnZXMgPyBmYWxzZSA6IHN0cm9rZSk7XG4gICAgICB9LFxuXG4gICAgICAvLyByZXR1cm5zIGhzbGEgY29sb3IgZm9yIHRyaWFuZ2xlIGVkZ2VcbiAgICAgIC8vIGFzIGEgZnVuY3Rpb24gb2YgdGhlIHRyaWFuZ2xlIGZpbGwgY29sb3JcbiAgICAgIGVkZ2VDb2xvcjogZnVuY3Rpb24oY29sb3IpIHtcbiAgICAgICAgY29sb3IgPSBDb2xvci5oc2xhQWRqdXN0TGlnaHRuZXNzKGNvbG9yLCBmdW5jdGlvbihsaWdodG5lc3MpIHtcbiAgICAgICAgICByZXR1cm4gKGxpZ2h0bmVzcyArIDIwMCAtIGxpZ2h0bmVzcyAqIDIpIC8gMztcbiAgICAgICAgfSk7XG4gICAgICAgIGNvbG9yID0gQ29sb3IuaHNsYUFkanVzdEFscGhhKGNvbG9yLCAwLjI1KTtcbiAgICAgICAgcmV0dXJuIGNvbG9yO1xuICAgICAgfSxcblxuICAgICAgLy8gcmV0dXJucyBoc2xhIGNvbG9yIGZvciB0cmlhbmdsZSBwb2ludFxuICAgICAgLy8gYXMgYSBmdW5jdGlvbiBvZiB0aGUgdHJpYW5nbGUgZmlsbCBjb2xvclxuICAgICAgcG9pbnRDb2xvcjogZnVuY3Rpb24oY29sb3IpIHtcbiAgICAgICAgY29sb3IgPSBDb2xvci5oc2xhQWRqdXN0TGlnaHRuZXNzKGNvbG9yLCBmdW5jdGlvbihsaWdodG5lc3MpIHtcbiAgICAgICAgICByZXR1cm4gKGxpZ2h0bmVzcyArIDIwMCAtIGxpZ2h0bmVzcyAqIDIpIC8gMztcbiAgICAgICAgfSk7XG4gICAgICAgIGNvbG9yID0gQ29sb3IuaHNsYUFkanVzdEFscGhhKGNvbG9yLCAxKTtcbiAgICAgICAgcmV0dXJuIGNvbG9yO1xuICAgICAgfSxcblxuICAgICAgLy8gcmV0dXJucyBoc2xhIGNvbG9yIGZvciB0cmlhbmdsZSBjZW50cm9pZFxuICAgICAgLy8gYXMgYSBmdW5jdGlvbiBvZiB0aGUgdHJpYW5nbGUgZmlsbCBjb2xvclxuICAgICAgY2VudHJvaWRDb2xvcjogZnVuY3Rpb24oY29sb3IpIHtcbiAgICAgICAgY29sb3IgPSBDb2xvci5oc2xhQWRqdXN0TGlnaHRuZXNzKGNvbG9yLCBmdW5jdGlvbihsaWdodG5lc3MpIHtcbiAgICAgICAgICByZXR1cm4gKGxpZ2h0bmVzcyArIDIwMCAtIGxpZ2h0bmVzcyAqIDIpIC8gMztcbiAgICAgICAgfSk7XG4gICAgICAgIGNvbG9yID0gQ29sb3IuaHNsYUFkanVzdEFscGhhKGNvbG9yLCAwLjI1KTtcbiAgICAgICAgcmV0dXJuIGNvbG9yO1xuICAgICAgfSxcblxuICAgICAgLy8gcmV0dXJucyBoc2xhIGNvbG9yIGZvciB0cmlhbmdsZSBob3ZlciBmaWxsXG4gICAgICAvLyBhcyBhIGZ1bmN0aW9uIG9mIHRoZSB0cmlhbmdsZSBmaWxsIGNvbG9yXG4gICAgICBob3ZlckNvbG9yOiBmdW5jdGlvbihjb2xvcikge1xuICAgICAgICBjb2xvciA9IENvbG9yLmhzbGFBZGp1c3RMaWdodG5lc3MoY29sb3IsIGZ1bmN0aW9uKGxpZ2h0bmVzcykge1xuICAgICAgICAgIHJldHVybiAxMDAgLSBsaWdodG5lc3M7XG4gICAgICAgIH0pO1xuICAgICAgICBjb2xvciA9IENvbG9yLmhzbGFBZGp1c3RBbHBoYShjb2xvciwgMC41KTtcbiAgICAgICAgcmV0dXJuIGNvbG9yO1xuICAgICAgfSxcbiAgICB9O1xuICB9XG5cbiAgY2xlYXIoKSB7XG4gICAgdGhpcy5wb2ludHMgPSBbXTtcbiAgICB0aGlzLnRyaWFuZ2xlcyA9IFtdO1xuICAgIHRoaXMucG9pbnRNYXAuY2xlYXIoKTtcbiAgICB0aGlzLmNlbnRlciA9IG5ldyBQb2ludCgwLCAwKTtcbiAgfVxuXG4gIC8vIGNsZWFyIGFuZCBjcmVhdGUgYSBmcmVzaCBzZXQgb2YgcmFuZG9tIHBvaW50c1xuICAvLyBhbGwgYXJncyBhcmUgb3B0aW9uYWxcbiAgcmFuZG9taXplKG1pbiwgbWF4LCBtaW5FZGdlLCBtYXhFZGdlLCBtaW5HcmFkaWVudHMsIG1heEdyYWRpZW50cywgbXVsdGlwbGllciwgY29sb3JzLCBpbWFnZVVSTCkge1xuICAgIC8vIGNvbG9ycyBwYXJhbSBpcyBvcHRpb25hbFxuICAgIHRoaXMuY29sb3JzID0gY29sb3JzID9cbiAgICAgICAgICAgICAgICAgICAgY29sb3JzIDpcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5vcHRpb25zLmNvbG9yUGFsZXR0ZSA/XG4gICAgICAgICAgICAgICAgICAgICAgdGhpcy5vcHRpb25zLmNvbG9yUGFsZXR0ZVtSYW5kb20ucmFuZG9tQmV0d2VlbigwLCB0aGlzLm9wdGlvbnMuY29sb3JQYWxldHRlLmxlbmd0aCAtIDEpXSA6XG4gICAgICAgICAgICAgICAgICAgICAgdGhpcy5jb2xvcnM7XG5cbiAgICB0aGlzLm9wdGlvbnMuaW1hZ2VVUkwgPSBpbWFnZVVSTCA/IGltYWdlVVJMIDogdGhpcy5vcHRpb25zLmltYWdlVVJMO1xuICAgIHRoaXMub3B0aW9ucy5pbWFnZUFzQmFja2dyb3VuZCA9ICEhdGhpcy5vcHRpb25zLmltYWdlVVJMO1xuXG4gICAgdGhpcy5vcHRpb25zLm1pbkdyYWRpZW50cyA9IG1pbkdyYWRpZW50cyB8fCB0aGlzLm9wdGlvbnMubWluR3JhZGllbnRzO1xuICAgIHRoaXMub3B0aW9ucy5tYXhHcmFkaWVudHMgPSBtYXhHcmFkaWVudHMgfHwgdGhpcy5vcHRpb25zLm1heEdyYWRpZW50cztcblxuICAgIHRoaXMucmVzaXplQ2FudmFzKCk7XG5cbiAgICB0aGlzLmdlbmVyYXRlTmV3UG9pbnRzKG1pbiwgbWF4LCBtaW5FZGdlLCBtYXhFZGdlLCBtdWx0aXBsaWVyKTtcblxuICAgIHRoaXMudHJpYW5ndWxhdGUoKTtcblxuICAgIGlmICghdGhpcy5vcHRpb25zLmltYWdlQXNCYWNrZ3JvdW5kKSB7XG4gICAgICB0aGlzLmdlbmVyYXRlR3JhZGllbnRzKCk7XG5cbiAgICAgIC8vIHByZXAgZm9yIGFuaW1hdGlvblxuICAgICAgdGhpcy5uZXh0R3JhZGllbnRzID0gdGhpcy5yYWRpYWxHcmFkaWVudHMuc2xpY2UoMCk7XG4gICAgICB0aGlzLmdlbmVyYXRlR3JhZGllbnRzKCk7XG4gICAgICB0aGlzLmN1cnJlbnRHcmFkaWVudHMgPSB0aGlzLnJhZGlhbEdyYWRpZW50cy5zbGljZSgwKTtcbiAgICB9XG5cbiAgICB0aGlzLnJlbmRlcigpO1xuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5hbmltYXRlICYmICF0aGlzLmxvb3BpbmcpIHtcbiAgICAgIHRoaXMuaW5pdFJlbmRlckxvb3AoKTtcbiAgICB9XG4gIH1cblxuICBpbml0UmVuZGVyTG9vcCgpIHtcbiAgICBpZiAodGhpcy5vcHRpb25zLmltYWdlQXNCYWNrZ3JvdW5kKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5sb29waW5nID0gdHJ1ZTtcbiAgICB0aGlzLmZyYW1lU3RlcHMgPSB0aGlzLm9wdGlvbnMubG9vcEZyYW1lcztcbiAgICB0aGlzLmZyYW1lID0gdGhpcy5mcmFtZSA/IHRoaXMuZnJhbWUgOiB0aGlzLmZyYW1lU3RlcHM7XG4gICAgdGhpcy5yZW5kZXJMb29wKCk7XG4gIH1cblxuICByZW5kZXJMb29wKCkge1xuICAgIHRoaXMuZnJhbWUrKztcblxuICAgIC8vIGN1cnJlbnQgPT4gbmV4dCwgbmV4dCA9PiBuZXdcbiAgICBpZiAodGhpcy5mcmFtZSA+IHRoaXMuZnJhbWVTdGVwcykge1xuICAgICAgdmFyIG5leHRHcmFkaWVudHMgPSB0aGlzLm5leHRHcmFkaWVudHMgPyB0aGlzLm5leHRHcmFkaWVudHMgOiB0aGlzLnJhZGlhbEdyYWRpZW50cztcbiAgICAgIHRoaXMuZ2VuZXJhdGVHcmFkaWVudHMoKTtcbiAgICAgIHRoaXMubmV4dEdyYWRpZW50cyA9IHRoaXMucmFkaWFsR3JhZGllbnRzO1xuICAgICAgdGhpcy5yYWRpYWxHcmFkaWVudHMgPSBuZXh0R3JhZGllbnRzLnNsaWNlKDApO1xuICAgICAgdGhpcy5jdXJyZW50R3JhZGllbnRzID0gbmV4dEdyYWRpZW50cy5zbGljZSgwKTtcblxuICAgICAgdGhpcy5mcmFtZSA9IDA7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIGZhbmN5IHN0ZXBzXG4gICAgICAvLyB7eDAsIHkwLCByMCwgeDEsIHkxLCByMSwgY29sb3JTdG9wfVxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBNYXRoLm1heCh0aGlzLnJhZGlhbEdyYWRpZW50cy5sZW5ndGgsIHRoaXMubmV4dEdyYWRpZW50cy5sZW5ndGgpOyBpKyspIHtcbiAgICAgICAgdmFyIGN1cnJlbnRHcmFkaWVudCA9IHRoaXMuY3VycmVudEdyYWRpZW50c1tpXTtcbiAgICAgICAgdmFyIG5leHRHcmFkaWVudCA9IHRoaXMubmV4dEdyYWRpZW50c1tpXTtcblxuICAgICAgICBpZiAodHlwZW9mIGN1cnJlbnRHcmFkaWVudCA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICB2YXIgbmV3R3JhZGllbnQgPSB7XG4gICAgICAgICAgICB4MDogbmV4dEdyYWRpZW50LngwLFxuICAgICAgICAgICAgeTA6IG5leHRHcmFkaWVudC55MCxcbiAgICAgICAgICAgIHIwOiAwLFxuICAgICAgICAgICAgeDE6IG5leHRHcmFkaWVudC54MSxcbiAgICAgICAgICAgIHkxOiBuZXh0R3JhZGllbnQueTEsXG4gICAgICAgICAgICByMTogMCxcbiAgICAgICAgICAgIGNvbG9yU3RvcDogbmV4dEdyYWRpZW50LmNvbG9yU3RvcCxcbiAgICAgICAgICB9O1xuICAgICAgICAgIGN1cnJlbnRHcmFkaWVudCA9IG5ld0dyYWRpZW50O1xuICAgICAgICAgIHRoaXMuY3VycmVudEdyYWRpZW50cy5wdXNoKG5ld0dyYWRpZW50KTtcbiAgICAgICAgICB0aGlzLnJhZGlhbEdyYWRpZW50cy5wdXNoKG5ld0dyYWRpZW50KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0eXBlb2YgbmV4dEdyYWRpZW50ID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgIG5leHRHcmFkaWVudCA9IHtcbiAgICAgICAgICAgIHgwOiBjdXJyZW50R3JhZGllbnQueDAsXG4gICAgICAgICAgICB5MDogY3VycmVudEdyYWRpZW50LnkwLFxuICAgICAgICAgICAgcjA6IDAsXG4gICAgICAgICAgICB4MTogY3VycmVudEdyYWRpZW50LngxLFxuICAgICAgICAgICAgeTE6IGN1cnJlbnRHcmFkaWVudC55MSxcbiAgICAgICAgICAgIHIxOiAwLFxuICAgICAgICAgICAgY29sb3JTdG9wOiBjdXJyZW50R3JhZGllbnQuY29sb3JTdG9wLFxuICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgdXBkYXRlZEdyYWRpZW50ID0ge307XG5cbiAgICAgICAgLy8gc2NhbGUgdGhlIGRpZmZlcmVuY2UgYmV0d2VlbiBjdXJyZW50IGFuZCBuZXh0IGdyYWRpZW50IGJhc2VkIG9uIHN0ZXAgaW4gZnJhbWVzXG4gICAgICAgIHZhciBzY2FsZSA9IHRoaXMuZnJhbWUgLyB0aGlzLmZyYW1lU3RlcHM7XG5cbiAgICAgICAgdXBkYXRlZEdyYWRpZW50LngwID0gTWF0aC5yb3VuZChsaW5lYXJTY2FsZShjdXJyZW50R3JhZGllbnQueDAsIG5leHRHcmFkaWVudC54MCwgc2NhbGUpKTtcbiAgICAgICAgdXBkYXRlZEdyYWRpZW50LnkwID0gTWF0aC5yb3VuZChsaW5lYXJTY2FsZShjdXJyZW50R3JhZGllbnQueTAsIG5leHRHcmFkaWVudC55MCwgc2NhbGUpKTtcbiAgICAgICAgdXBkYXRlZEdyYWRpZW50LnIwID0gTWF0aC5yb3VuZChsaW5lYXJTY2FsZShjdXJyZW50R3JhZGllbnQucjAsIG5leHRHcmFkaWVudC5yMCwgc2NhbGUpKTtcbiAgICAgICAgdXBkYXRlZEdyYWRpZW50LngxID0gTWF0aC5yb3VuZChsaW5lYXJTY2FsZShjdXJyZW50R3JhZGllbnQueDEsIG5leHRHcmFkaWVudC54MCwgc2NhbGUpKTtcbiAgICAgICAgdXBkYXRlZEdyYWRpZW50LnkxID0gTWF0aC5yb3VuZChsaW5lYXJTY2FsZShjdXJyZW50R3JhZGllbnQueTEsIG5leHRHcmFkaWVudC55MCwgc2NhbGUpKTtcbiAgICAgICAgdXBkYXRlZEdyYWRpZW50LnIxID0gTWF0aC5yb3VuZChsaW5lYXJTY2FsZShjdXJyZW50R3JhZGllbnQucjEsIG5leHRHcmFkaWVudC5yMSwgc2NhbGUpKTtcbiAgICAgICAgdXBkYXRlZEdyYWRpZW50LmNvbG9yU3RvcCA9IGxpbmVhclNjYWxlKGN1cnJlbnRHcmFkaWVudC5jb2xvclN0b3AsIG5leHRHcmFkaWVudC5jb2xvclN0b3AsIHNjYWxlKTtcblxuICAgICAgICB0aGlzLnJhZGlhbEdyYWRpZW50c1tpXSA9IHVwZGF0ZWRHcmFkaWVudDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLnJlc2V0UG9pbnRDb2xvcnMoKTtcbiAgICB0aGlzLnJlbmRlcigpO1xuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5hbmltYXRlKSB7XG4gICAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4ge1xuICAgICAgICB0aGlzLnJlbmRlckxvb3AoKTtcbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmxvb3BpbmcgPSBmYWxzZTtcbiAgICB9XG4gIH1cblxuICAvLyBjcmVhdGVzIGEgaGlkZGVuIGNhbnZhcyBmb3IgaG92ZXIgZGV0ZWN0aW9uXG4gIGNyZWF0ZUhvdmVyU2hhZG93Q2FudmFzKCkge1xuICAgIHRoaXMuaG92ZXJTaGFkb3dDYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcbiAgICB0aGlzLnNoYWRvd0N0eCA9IHRoaXMuaG92ZXJTaGFkb3dDYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcblxuICAgIHRoaXMuaG92ZXJTaGFkb3dDYW52YXMuc3R5bGUuZGlzcGxheSA9ICdub25lJztcbiAgfVxuXG4gIGdlbmVyYXRlTmV3UG9pbnRzKG1pbiwgbWF4LCBtaW5FZGdlLCBtYXhFZGdlLCBtdWx0aXBsaWVyKSB7XG4gICAgLy8gZGVmYXVsdHMgdG8gZ2VuZXJpYyBudW1iZXIgb2YgcG9pbnRzIGJhc2VkIG9uIGNhbnZhcyBkaW1lbnNpb25zXG4gICAgLy8gdGhpcyBnZW5lcmFsbHkgbG9va3MgcHJldHR5IG5pY2VcbiAgICB2YXIgYXJlYSA9IHRoaXMuY2FudmFzLndpZHRoICogdGhpcy5jYW52YXMuaGVpZ2h0O1xuICAgIHZhciBwZXJpbWV0ZXIgPSAodGhpcy5jYW52YXMud2lkdGggKyB0aGlzLmNhbnZhcy5oZWlnaHQpICogMjtcblxuICAgIG11bHRpcGxpZXIgPSBtdWx0aXBsaWVyIHx8IHRoaXMub3B0aW9ucy5tdWx0aXBsaWVyO1xuXG4gICAgbWluID0gbWluID4gMCA/IE1hdGguY2VpbChtaW4pIDogTWF0aC5tYXgoTWF0aC5jZWlsKChhcmVhIC8gMTI1MCkgKiBtdWx0aXBsaWVyKSwgNTApO1xuICAgIG1heCA9IG1heCA+IDAgPyBNYXRoLmNlaWwobWF4KSA6IE1hdGgubWF4KE1hdGguY2VpbCgoYXJlYSAvIDUwMCkgKiBtdWx0aXBsaWVyKSwgNTApO1xuXG4gICAgbWluRWRnZSA9IG1pbkVkZ2UgPiAwID8gTWF0aC5jZWlsKG1pbkVkZ2UpIDogTWF0aC5tYXgoTWF0aC5jZWlsKChwZXJpbWV0ZXIgLyAxMjUpICogbXVsdGlwbGllciksIDUpO1xuICAgIG1heEVkZ2UgPSBtYXhFZGdlID4gMCA/IE1hdGguY2VpbChtYXhFZGdlKSA6IE1hdGgubWF4KE1hdGguY2VpbCgocGVyaW1ldGVyIC8gNTApICogbXVsdGlwbGllciksIDUpO1xuXG4gICAgdGhpcy5udW1Qb2ludHMgPSBSYW5kb20ucmFuZG9tQmV0d2VlbihtaW4sIG1heCk7XG4gICAgdGhpcy5nZXROdW1FZGdlUG9pbnRzID0gUmFuZG9tLnJhbmRvbU51bWJlckZ1bmN0aW9uKG1pbkVkZ2UsIG1heEVkZ2UpO1xuXG4gICAgdGhpcy5jbGVhcigpO1xuXG4gICAgLy8gYWRkIGNvcm5lciBhbmQgZWRnZSBwb2ludHNcbiAgICB0aGlzLmdlbmVyYXRlQ29ybmVyUG9pbnRzKCk7XG4gICAgdGhpcy5nZW5lcmF0ZUVkZ2VQb2ludHMoKTtcblxuICAgIC8vIGFkZCBzb21lIHJhbmRvbSBwb2ludHMgaW4gdGhlIG1pZGRsZSBmaWVsZCxcbiAgICAvLyBleGNsdWRpbmcgZWRnZXMgYW5kIGNvcm5lcnNcbiAgICB0aGlzLmdlbmVyYXRlUmFuZG9tUG9pbnRzKHRoaXMubnVtUG9pbnRzLCAxLCAxLCB0aGlzLndpZHRoIC0gMSwgdGhpcy5oZWlnaHQgLSAxKTtcbiAgfVxuXG4gIC8vIGFkZCBwb2ludHMgaW4gdGhlIGNvcm5lcnNcbiAgZ2VuZXJhdGVDb3JuZXJQb2ludHMoKSB7XG4gICAgdGhpcy5wb2ludHMucHVzaChuZXcgUG9pbnQoMCwgMCkpO1xuICAgIHRoaXMucG9pbnRzLnB1c2gobmV3IFBvaW50KDAsIHRoaXMuaGVpZ2h0KSk7XG4gICAgdGhpcy5wb2ludHMucHVzaChuZXcgUG9pbnQodGhpcy53aWR0aCwgMCkpO1xuICAgIHRoaXMucG9pbnRzLnB1c2gobmV3IFBvaW50KHRoaXMud2lkdGgsIHRoaXMuaGVpZ2h0KSk7XG4gIH1cblxuICAvLyBhZGQgcG9pbnRzIG9uIHRoZSBlZGdlc1xuICBnZW5lcmF0ZUVkZ2VQb2ludHMoKSB7XG4gICAgLy8gbGVmdCBlZGdlXG4gICAgdGhpcy5nZW5lcmF0ZVJhbmRvbVBvaW50cyh0aGlzLmdldE51bUVkZ2VQb2ludHMoKSwgMCwgMCwgMCwgdGhpcy5oZWlnaHQpO1xuICAgIC8vIHJpZ2h0IGVkZ2VcbiAgICB0aGlzLmdlbmVyYXRlUmFuZG9tUG9pbnRzKHRoaXMuZ2V0TnVtRWRnZVBvaW50cygpLCB0aGlzLndpZHRoLCAwLCAwLCB0aGlzLmhlaWdodCk7XG4gICAgLy8gYm90dG9tIGVkZ2VcbiAgICB0aGlzLmdlbmVyYXRlUmFuZG9tUG9pbnRzKHRoaXMuZ2V0TnVtRWRnZVBvaW50cygpLCAwLCB0aGlzLmhlaWdodCwgdGhpcy53aWR0aCwgMCk7XG4gICAgLy8gdG9wIGVkZ2VcbiAgICB0aGlzLmdlbmVyYXRlUmFuZG9tUG9pbnRzKHRoaXMuZ2V0TnVtRWRnZVBvaW50cygpLCAwLCAwLCB0aGlzLndpZHRoLCAwKTtcbiAgfVxuXG4gIC8vIHJhbmRvbWx5IGdlbmVyYXRlIHNvbWUgcG9pbnRzLFxuICAvLyBzYXZlIHRoZSBwb2ludCBjbG9zZXN0IHRvIGNlbnRlclxuICBnZW5lcmF0ZVJhbmRvbVBvaW50cyhudW1Qb2ludHMsIHgsIHksIHdpZHRoLCBoZWlnaHQpIHtcbiAgICB2YXIgY2VudGVyID0gbmV3IFBvaW50KE1hdGgucm91bmQodGhpcy5jYW52YXMud2lkdGggLyAyKSwgTWF0aC5yb3VuZCh0aGlzLmNhbnZhcy5oZWlnaHQgLyAyKSk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBudW1Qb2ludHM7IGkrKykge1xuICAgICAgLy8gZ2VuZXJhdGUgYSBuZXcgcG9pbnQgd2l0aCByYW5kb20gY29vcmRzXG4gICAgICAvLyByZS1nZW5lcmF0ZSB0aGUgcG9pbnQgaWYgaXQgYWxyZWFkeSBleGlzdHMgaW4gcG9pbnRtYXAgKG1heCAxMCB0aW1lcylcbiAgICAgIHZhciBwb2ludDtcbiAgICAgIHZhciBqID0gMDtcbiAgICAgIGRvIHtcbiAgICAgICAgaisrO1xuICAgICAgICBwb2ludCA9IG5ldyBQb2ludChSYW5kb20ucmFuZG9tQmV0d2Vlbih4LCB4ICsgd2lkdGgpLCBSYW5kb20ucmFuZG9tQmV0d2Vlbih5LCB5ICsgaGVpZ2h0KSk7XG4gICAgICB9IHdoaWxlICh0aGlzLnBvaW50TWFwLmV4aXN0cyhwb2ludCkgJiYgaiA8IDEwKTtcblxuICAgICAgaWYgKGogPCAxMCkge1xuICAgICAgICB0aGlzLnBvaW50cy5wdXNoKHBvaW50KTtcbiAgICAgICAgdGhpcy5wb2ludE1hcC5hZGQocG9pbnQpO1xuICAgICAgfVxuXG4gICAgICBpZiAoY2VudGVyLmdldERpc3RhbmNlVG8ocG9pbnQpIDwgY2VudGVyLmdldERpc3RhbmNlVG8odGhpcy5jZW50ZXIpKSB7XG4gICAgICAgIHRoaXMuY2VudGVyID0gcG9pbnQ7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmNlbnRlci5pc0NlbnRlciA9IGZhbHNlO1xuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuY2VudGVyLmlzQ2VudGVyID0gdHJ1ZTtcbiAgfVxuXG4gIC8vIHVzZSB0aGUgRGVsYXVuYXkgYWxnb3JpdGhtIHRvIG1ha2VcbiAgLy8gdHJpYW5nbGVzIG91dCBvZiBvdXIgcmFuZG9tIHBvaW50c1xuICB0cmlhbmd1bGF0ZSgpIHtcbiAgICB0aGlzLnRyaWFuZ2xlcyA9IFtdO1xuXG4gICAgLy8gbWFwIHBvaW50IG9iamVjdHMgdG8gbGVuZ3RoLTIgYXJyYXlzXG4gICAgdmFyIHZlcnRpY2VzID0gdGhpcy5wb2ludHMubWFwKGZ1bmN0aW9uKHBvaW50KSB7XG4gICAgICByZXR1cm4gcG9pbnQuZ2V0Q29vcmRzKCk7XG4gICAgfSk7XG5cbiAgICAvLyB2ZXJ0aWNlcyBpcyBub3cgYW4gYXJyYXkgc3VjaCBhczpcbiAgICAvLyBbIFtwMXgsIHAxeV0sIFtwMngsIHAyeV0sIFtwM3gsIHAzeV0sIC4uLiBdXG5cbiAgICAvLyBkbyB0aGUgYWxnb3JpdGhtXG4gICAgdmFyIHRyaWFuZ3VsYXRlZCA9IERlbGF1bmF5LnRyaWFuZ3VsYXRlKHZlcnRpY2VzKTtcblxuICAgIC8vIHJldHVybnMgMSBkaW1lbnNpb25hbCBhcnJheSBhcnJhbmdlZCBpbiB0cmlwbGVzIHN1Y2ggYXM6XG4gICAgLy8gWyB0MWEsIHQxYiwgdDFjLCB0MmEsIHQyYiwgdDJjLC4uLi4gXVxuICAgIC8vIHdoZXJlIHQxYSwgZXRjIGFyZSBpbmRlY2VzIGluIHRoZSB2ZXJ0aWNlcyBhcnJheVxuICAgIC8vIHR1cm4gdGhhdCBpbnRvIGFycmF5IG9mIHRyaWFuZ2xlIHBvaW50c1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdHJpYW5ndWxhdGVkLmxlbmd0aDsgaSArPSAzKSB7XG4gICAgICB2YXIgYXJyID0gW107XG4gICAgICBhcnIucHVzaCh2ZXJ0aWNlc1t0cmlhbmd1bGF0ZWRbaV1dKTtcbiAgICAgIGFyci5wdXNoKHZlcnRpY2VzW3RyaWFuZ3VsYXRlZFtpICsgMV1dKTtcbiAgICAgIGFyci5wdXNoKHZlcnRpY2VzW3RyaWFuZ3VsYXRlZFtpICsgMl1dKTtcbiAgICAgIHRoaXMudHJpYW5nbGVzLnB1c2goYXJyKTtcbiAgICB9XG5cbiAgICAvLyBtYXAgdG8gYXJyYXkgb2YgVHJpYW5nbGUgb2JqZWN0c1xuICAgIHRoaXMudHJpYW5nbGVzID0gdGhpcy50cmlhbmdsZXMubWFwKGZ1bmN0aW9uKHRyaWFuZ2xlKSB7XG4gICAgICByZXR1cm4gbmV3IFRyaWFuZ2xlKG5ldyBQb2ludCh0cmlhbmdsZVswXSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgIG5ldyBQb2ludCh0cmlhbmdsZVsxXSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgIG5ldyBQb2ludCh0cmlhbmdsZVsyXSkpO1xuICAgIH0pO1xuICB9XG5cbiAgcmVzZXRQb2ludENvbG9ycygpIHtcbiAgICAvLyByZXNldCBjYWNoZWQgY29sb3JzIG9mIGNlbnRyb2lkcyBhbmQgcG9pbnRzXG4gICAgdmFyIGk7XG4gICAgZm9yIChpID0gMDsgaSA8IHRoaXMudHJpYW5nbGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB0aGlzLnRyaWFuZ2xlc1tpXS5yZXNldFBvaW50Q29sb3JzKCk7XG4gICAgfVxuXG4gICAgZm9yIChpID0gMDsgaSA8IHRoaXMucG9pbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB0aGlzLnBvaW50c1tpXS5yZXNldENvbG9yKCk7XG4gICAgfVxuICB9XG5cbiAgLy8gY3JlYXRlIHJhbmRvbSByYWRpYWwgZ3JhZGllbnQgY2lyY2xlcyBmb3IgcmVuZGVyaW5nIGxhdGVyXG4gIGdlbmVyYXRlR3JhZGllbnRzKG1pbkdyYWRpZW50cywgbWF4R3JhZGllbnRzKSB7XG4gICAgdGhpcy5yYWRpYWxHcmFkaWVudHMgPSBbXTtcblxuICAgIG1pbkdyYWRpZW50cyA9IG1pbkdyYWRpZW50cyB8fCB0aGlzLm9wdGlvbnMubWluR3JhZGllbnRzO1xuICAgIG1heEdyYWRpZW50cyA9IG1heEdyYWRpZW50cyB8fCB0aGlzLm9wdGlvbnMubWF4R3JhZGllbnRzO1xuXG4gICAgdGhpcy5udW1HcmFkaWVudHMgPSBSYW5kb20ucmFuZG9tQmV0d2VlbihtaW5HcmFkaWVudHMsIG1heEdyYWRpZW50cyk7XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMubnVtR3JhZGllbnRzOyBpKyspIHtcbiAgICAgIHRoaXMuZ2VuZXJhdGVSYWRpYWxHcmFkaWVudCgpO1xuICAgIH1cbiAgfVxuXG4gIGdlbmVyYXRlUmFkaWFsR3JhZGllbnQoKSB7XG4gICAgLyoqXG4gICAgICAqIGNyZWF0ZSBhIG5pY2UtbG9va2luZyBidXQgc29tZXdoYXQgcmFuZG9tIGdyYWRpZW50OlxuICAgICAgKiByYW5kb21pemUgdGhlIGZpcnN0IGNpcmNsZVxuICAgICAgKiB0aGUgc2Vjb25kIGNpcmNsZSBzaG91bGQgYmUgaW5zaWRlIHRoZSBmaXJzdCBjaXJjbGUsXG4gICAgICAqIHNvIHdlIGdlbmVyYXRlIGEgcG9pbnQgKG9yaWdpbjIpIGluc2lkZSBjaXJsZTFcbiAgICAgICogdGhlbiBjYWxjdWxhdGUgdGhlIGRpc3QgYmV0d2VlbiBvcmlnaW4yIGFuZCB0aGUgY2lyY3VtZnJlbmNlIG9mIGNpcmNsZTFcbiAgICAgICogY2lyY2xlMidzIHJhZGl1cyBjYW4gYmUgYmV0d2VlbiAwIGFuZCB0aGlzIGRpc3RcbiAgICAgICovXG5cbiAgICB2YXIgbWluWCA9IHRoaXMub3B0aW9ucy5ncmFkaWVudC5taW5YKHRoaXMuY2FudmFzLndpZHRoLCB0aGlzLmNhbnZhcy5oZWlnaHQpO1xuICAgIHZhciBtYXhYID0gdGhpcy5vcHRpb25zLmdyYWRpZW50Lm1heFgodGhpcy5jYW52YXMud2lkdGgsIHRoaXMuY2FudmFzLmhlaWdodCk7XG5cbiAgICB2YXIgbWluWSA9IHRoaXMub3B0aW9ucy5ncmFkaWVudC5taW5ZKHRoaXMuY2FudmFzLndpZHRoLCB0aGlzLmNhbnZhcy5oZWlnaHQpO1xuICAgIHZhciBtYXhZID0gdGhpcy5vcHRpb25zLmdyYWRpZW50Lm1heFkodGhpcy5jYW52YXMud2lkdGgsIHRoaXMuY2FudmFzLmhlaWdodCk7XG5cbiAgICB2YXIgbWluUmFkaXVzID0gdGhpcy5vcHRpb25zLmdyYWRpZW50Lm1pblJhZGl1cyh0aGlzLmNhbnZhcy53aWR0aCwgdGhpcy5jYW52YXMuaGVpZ2h0LCB0aGlzLm51bUdyYWRpZW50cyk7XG4gICAgdmFyIG1heFJhZGl1cyA9IHRoaXMub3B0aW9ucy5ncmFkaWVudC5tYXhSYWRpdXModGhpcy5jYW52YXMud2lkdGgsIHRoaXMuY2FudmFzLmhlaWdodCwgdGhpcy5udW1HcmFkaWVudHMpO1xuXG4gICAgLy8gaGVscGVyIHJhbmRvbSBmdW5jdGlvbnNcbiAgICB2YXIgcmFuZG9tQ2FudmFzWCA9IFJhbmRvbS5yYW5kb21OdW1iZXJGdW5jdGlvbihtaW5YLCBtYXhYKTtcbiAgICB2YXIgcmFuZG9tQ2FudmFzWSA9IFJhbmRvbS5yYW5kb21OdW1iZXJGdW5jdGlvbihtaW5ZLCBtYXhZKTtcbiAgICB2YXIgcmFuZG9tQ2FudmFzUmFkaXVzID0gUmFuZG9tLnJhbmRvbU51bWJlckZ1bmN0aW9uKG1pblJhZGl1cywgbWF4UmFkaXVzKTtcblxuICAgIC8vIGdlbmVyYXRlIGNpcmNsZTEgb3JpZ2luIGFuZCByYWRpdXNcbiAgICB2YXIgeDA7XG4gICAgdmFyIHkwO1xuICAgIHZhciByMCA9IHJhbmRvbUNhbnZhc1JhZGl1cygpO1xuXG4gICAgLy8gb3JpZ2luIG9mIHRoZSBuZXh0IGNpcmNsZSBzaG91bGQgYmUgY29udGFpbmVkXG4gICAgLy8gd2l0aGluIHRoZSBhcmVhIG9mIGl0cyBwcmVkZWNlc3NvclxuICAgIGlmICh0aGlzLm9wdGlvbnMuZ3JhZGllbnQuY29ubmVjdGVkICYmIHRoaXMucmFkaWFsR3JhZGllbnRzLmxlbmd0aCA+IDApIHtcbiAgICAgIHZhciBsYXN0R3JhZGllbnQgPSB0aGlzLnJhZGlhbEdyYWRpZW50c1t0aGlzLnJhZGlhbEdyYWRpZW50cy5sZW5ndGggLSAxXTtcbiAgICAgIHZhciBwb2ludEluTGFzdENpcmNsZSA9IFJhbmRvbS5yYW5kb21JbkNpcmNsZShsYXN0R3JhZGllbnQucjAsIGxhc3RHcmFkaWVudC54MCwgbGFzdEdyYWRpZW50LnkwKTtcblxuICAgICAgeDAgPSBwb2ludEluTGFzdENpcmNsZS54O1xuICAgICAgeTAgPSBwb2ludEluTGFzdENpcmNsZS55O1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBmaXJzdCBjaXJjbGUsIGp1c3QgcGljayBhdCByYW5kb21cbiAgICAgIHgwID0gcmFuZG9tQ2FudmFzWCgpO1xuICAgICAgeTAgPSByYW5kb21DYW52YXNZKCk7XG4gICAgfVxuXG4gICAgLy8gZmluZCBhIHJhbmRvbSBwb2ludCBpbnNpZGUgY2lyY2xlMVxuICAgIC8vIHRoaXMgaXMgdGhlIG9yaWdpbiBvZiBjaXJjbGUgMlxuICAgIHZhciBwb2ludEluQ2lyY2xlID0gUmFuZG9tLnJhbmRvbUluQ2lyY2xlKHIwICogMC4wOSwgeDAsIHkwKTtcblxuICAgIC8vIGdyYWIgdGhlIHgveSBjb29yZHNcbiAgICB2YXIgeDEgPSBwb2ludEluQ2lyY2xlLng7XG4gICAgdmFyIHkxID0gcG9pbnRJbkNpcmNsZS55O1xuXG4gICAgLy8gZmluZCBkaXN0YW5jZSBiZXR3ZWVuIHRoZSBwb2ludCBhbmQgdGhlIGNpcmN1bWZyaWVuY2Ugb2YgY2lyY2xlMVxuICAgIC8vIHRoZSByYWRpdXMgb2YgdGhlIHNlY29uZCBjaXJjbGUgd2lsbCBiZSBhIGZ1bmN0aW9uIG9mIHRoaXMgZGlzdGFuY2VcbiAgICB2YXIgdlggPSB4MSAtIHgwO1xuICAgIHZhciB2WSA9IHkxIC0geTA7XG4gICAgdmFyIG1hZ1YgPSBNYXRoLnNxcnQodlggKiB2WCArIHZZICogdlkpO1xuICAgIHZhciBhWCA9IHgwICsgdlggLyBtYWdWICogcjA7XG4gICAgdmFyIGFZID0geTAgKyB2WSAvIG1hZ1YgKiByMDtcblxuICAgIHZhciBkaXN0ID0gTWF0aC5zcXJ0KCh4MSAtIGFYKSAqICh4MSAtIGFYKSArICh5MSAtIGFZKSAqICh5MSAtIGFZKSk7XG5cbiAgICAvLyBnZW5lcmF0ZSB0aGUgcmFkaXVzIG9mIGNpcmNsZTIgYmFzZWQgb24gdGhpcyBkaXN0YW5jZVxuICAgIHZhciByMSA9IFJhbmRvbS5yYW5kb21CZXR3ZWVuKDEsIE1hdGguc3FydChkaXN0KSk7XG5cbiAgICAvLyByYW5kb20gYnV0IG5pY2UgbG9va2luZyBjb2xvciBzdG9wXG4gICAgdmFyIGNvbG9yU3RvcCA9IFJhbmRvbS5yYW5kb21CZXR3ZWVuKDIsIDgpIC8gMTA7XG5cbiAgICB0aGlzLnJhZGlhbEdyYWRpZW50cy5wdXNoKHt4MCwgeTAsIHIwLCB4MSwgeTEsIHIxLCBjb2xvclN0b3B9KTtcbiAgfVxuXG4gIC8vIHNvcnRzIHRoZSBwb2ludHNcbiAgc29ydFBvaW50cygpIHtcbiAgICAvLyBzb3J0IHBvaW50c1xuICAgIHRoaXMucG9pbnRzLnNvcnQoZnVuY3Rpb24oYSwgYikge1xuICAgICAgLy8gc29ydCB0aGUgcG9pbnRcbiAgICAgIGlmIChhLnggPCBiLngpIHtcbiAgICAgICAgcmV0dXJuIC0xO1xuICAgICAgfSBlbHNlIGlmIChhLnggPiBiLngpIHtcbiAgICAgICAgcmV0dXJuIDE7XG4gICAgICB9IGVsc2UgaWYgKGEueSA8IGIueSkge1xuICAgICAgICByZXR1cm4gLTE7XG4gICAgICB9IGVsc2UgaWYgKGEueSA+IGIueSkge1xuICAgICAgICByZXR1cm4gMTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiAwO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgLy8gc2l6ZSB0aGUgY2FudmFzIHRvIHRoZSBzaXplIG9mIGl0cyBwYXJlbnRcbiAgLy8gbWFrZXMgdGhlIGNhbnZhcyAncmVzcG9uc2l2ZSdcbiAgcmVzaXplQ2FudmFzKCkge1xuICAgIHZhciBwYXJlbnQgPSB0aGlzLmNhbnZhcy5wYXJlbnRFbGVtZW50O1xuICAgIHRoaXMuY2FudmFzLndpZHRoID0gdGhpcy53aWR0aCA9IHBhcmVudC5vZmZzZXRXaWR0aDtcbiAgICB0aGlzLmNhbnZhcy5oZWlnaHQgPSB0aGlzLmhlaWdodCA9IHBhcmVudC5vZmZzZXRIZWlnaHQ7XG5cbiAgICBpZiAodGhpcy5ob3ZlclNoYWRvd0NhbnZhcykge1xuICAgICAgdGhpcy5ob3ZlclNoYWRvd0NhbnZhcy53aWR0aCA9IHRoaXMud2lkdGggPSBwYXJlbnQub2Zmc2V0V2lkdGg7XG4gICAgICB0aGlzLmhvdmVyU2hhZG93Q2FudmFzLmhlaWdodCA9IHRoaXMuaGVpZ2h0ID0gcGFyZW50Lm9mZnNldEhlaWdodDtcbiAgICB9XG4gIH1cblxuICAvLyBtb3ZlcyBwb2ludHMvdHJpYW5nbGVzIGJhc2VkIG9uIG5ldyBzaXplIG9mIGNhbnZhc1xuICByZXNjYWxlKCkge1xuICAgIC8vIGdyYWIgb2xkIG1heC9taW4gZnJvbSBjdXJyZW50IGNhbnZhcyBzaXplXG4gICAgdmFyIHhNaW4gPSAwO1xuICAgIHZhciB4TWF4ID0gdGhpcy5jYW52YXMud2lkdGg7XG4gICAgdmFyIHlNaW4gPSAwO1xuICAgIHZhciB5TWF4ID0gdGhpcy5jYW52YXMuaGVpZ2h0O1xuXG4gICAgdGhpcy5yZXNpemVDYW52YXMoKTtcblxuICAgIGlmICh0aGlzLm9wdGlvbnMucmVzaXplTW9kZSA9PT0gJ3NjYWxlUG9pbnRzJykge1xuICAgICAgLy8gc2NhbGUgYWxsIHBvaW50cyB0byBuZXcgbWF4IGRpbWVuc2lvbnNcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5wb2ludHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdGhpcy5wb2ludHNbaV0ucmVzY2FsZSh4TWluLCB4TWF4LCB5TWluLCB5TWF4LCAwLCB0aGlzLmNhbnZhcy53aWR0aCwgMCwgdGhpcy5jYW52YXMuaGVpZ2h0KTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5nZW5lcmF0ZU5ld1BvaW50cygpO1xuICAgIH1cblxuICAgIHRoaXMudHJpYW5ndWxhdGUoKTtcblxuICAgIC8vIHJlc2NhbGUgcG9zaXRpb24gb2YgcmFkaWFsIGdyYWRpZW50IGNpcmNsZXNcbiAgICB0aGlzLnJlc2NhbGVHcmFkaWVudHModGhpcy5yYWRpYWxHcmFkaWVudHMsIHhNaW4sIHhNYXgsIHlNaW4sIHlNYXgpO1xuICAgIHRoaXMucmVzY2FsZUdyYWRpZW50cyh0aGlzLmN1cnJlbnRHcmFkaWVudHMsIHhNaW4sIHhNYXgsIHlNaW4sIHlNYXgpO1xuICAgIHRoaXMucmVzY2FsZUdyYWRpZW50cyh0aGlzLm5leHRHcmFkaWVudHMsIHhNaW4sIHhNYXgsIHlNaW4sIHlNYXgpO1xuXG4gICAgdGhpcy5yZW5kZXIoKTtcbiAgfVxuXG4gIHJlc2NhbGVHcmFkaWVudHMoYXJyYXksIHhNaW4sIHhNYXgsIHlNaW4sIHlNYXgpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFycmF5Lmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgY2lyY2xlMCA9IG5ldyBQb2ludChhcnJheVtpXS54MCwgYXJyYXlbaV0ueTApO1xuICAgICAgdmFyIGNpcmNsZTEgPSBuZXcgUG9pbnQoYXJyYXlbaV0ueDEsIGFycmF5W2ldLnkxKTtcblxuICAgICAgY2lyY2xlMC5yZXNjYWxlKHhNaW4sIHhNYXgsIHlNaW4sIHlNYXgsIDAsIHRoaXMuY2FudmFzLndpZHRoLCAwLCB0aGlzLmNhbnZhcy5oZWlnaHQpO1xuICAgICAgY2lyY2xlMS5yZXNjYWxlKHhNaW4sIHhNYXgsIHlNaW4sIHlNYXgsIDAsIHRoaXMuY2FudmFzLndpZHRoLCAwLCB0aGlzLmNhbnZhcy5oZWlnaHQpO1xuXG4gICAgICBhcnJheVtpXS54MCA9IGNpcmNsZTAueDtcbiAgICAgIGFycmF5W2ldLnkwID0gY2lyY2xlMC55O1xuICAgICAgYXJyYXlbaV0ueDEgPSBjaXJjbGUxLng7XG4gICAgICBhcnJheVtpXS55MSA9IGNpcmNsZTEueTtcbiAgICB9XG4gIH1cblxuICBob3ZlcigpIHtcbiAgICBpZiAodGhpcy5tb3VzZVBvc2l0aW9uKSB7XG4gICAgICB2YXIgcmdiID0gdGhpcy5tb3VzZVBvc2l0aW9uLmNhbnZhc0NvbG9yQXRQb2ludCh0aGlzLnNoYWRvd0ltYWdlRGF0YSwgJ3JnYicpO1xuICAgICAgdmFyIGhleCA9IENvbG9yLnJnYlRvSGV4KHJnYik7XG4gICAgICB2YXIgZGVjID0gcGFyc2VJbnQoaGV4LCAxNik7XG5cbiAgICAgIC8vIGlzIHByb2JhYmx5IHRyaWFuZ2xlIHdpdGggdGhhdCBpbmRleCwgYnV0XG4gICAgICAvLyBlZGdlcyBjYW4gYmUgZnV6enkgc28gZG91YmxlIGNoZWNrXG4gICAgICBpZiAoZGVjID49IDAgJiYgZGVjIDwgdGhpcy50cmlhbmdsZXMubGVuZ3RoICYmIHRoaXMudHJpYW5nbGVzW2RlY10ucG9pbnRJblRyaWFuZ2xlKHRoaXMubW91c2VQb3NpdGlvbikpIHtcbiAgICAgICAgLy8gY2xlYXIgdGhlIGxhc3QgdHJpYW5nbGVcbiAgICAgICAgdGhpcy5yZXNldFRyaWFuZ2xlKCk7XG5cbiAgICAgICAgaWYgKHRoaXMubGFzdFRyaWFuZ2xlICE9PSBkZWMpIHtcbiAgICAgICAgICAvLyByZW5kZXIgdGhlIGhvdmVyZWQgdHJpYW5nbGVcbiAgICAgICAgICB0aGlzLm9wdGlvbnMub25UcmlhbmdsZUhvdmVyKHRoaXMudHJpYW5nbGVzW2RlY10sIHRoaXMuY3R4LCB0aGlzLm9wdGlvbnMpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5sYXN0VHJpYW5nbGUgPSBkZWM7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMucmVzZXRUcmlhbmdsZSgpO1xuICAgIH1cbiAgfVxuXG4gIHJlc2V0VHJpYW5nbGUoKSB7XG4gICAgLy8gcmVkcmF3IHRoZSBsYXN0IHRyaWFuZ2xlIHRoYXQgd2FzIGhvdmVyZWQgb3ZlclxuICAgIGlmICh0aGlzLmxhc3RUcmlhbmdsZSAmJiB0aGlzLmxhc3RUcmlhbmdsZSA+PSAwICYmIHRoaXMubGFzdFRyaWFuZ2xlIDwgdGhpcy50cmlhbmdsZXMubGVuZ3RoKSB7XG4gICAgICB2YXIgbGFzdFRyaWFuZ2xlID0gdGhpcy50cmlhbmdsZXNbdGhpcy5sYXN0VHJpYW5nbGVdO1xuXG4gICAgICAvLyBmaW5kIHRoZSBib3VuZGluZyBwb2ludHMgb2YgdGhlIGxhc3QgdHJpYW5nbGVcbiAgICAgIC8vIGV4cGFuZCBhIGJpdCBmb3IgZWRnZXNcbiAgICAgIHZhciBtaW5YID0gbGFzdFRyaWFuZ2xlLm1pblgoKSAtIDE7XG4gICAgICB2YXIgbWluWSA9IGxhc3RUcmlhbmdsZS5taW5ZKCkgLSAxO1xuICAgICAgdmFyIG1heFggPSBsYXN0VHJpYW5nbGUubWF4WCgpICsgMTtcbiAgICAgIHZhciBtYXhZID0gbGFzdFRyaWFuZ2xlLm1heFkoKSArIDE7XG5cbiAgICAgIC8vIHJlc2V0IHRoYXQgcG9ydGlvbiBvZiB0aGUgY2FudmFzIHRvIGl0cyBvcmlnaW5hbCByZW5kZXJcbiAgICAgIHRoaXMuY3R4LnB1dEltYWdlRGF0YSh0aGlzLnJlbmRlcmVkSW1hZ2VEYXRhLCAwLCAwLCBtaW5YLCBtaW5ZLCBtYXhYIC0gbWluWCwgbWF4WSAtIG1pblkpO1xuXG4gICAgICB0aGlzLmxhc3RUcmlhbmdsZSA9IGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIHJlbmRlcigpIHtcbiAgICB0aGlzLnJlbmRlckJhY2tncm91bmQodGhpcy5yZW5kZXJGb3JlZ3JvdW5kLmJpbmQodGhpcykpO1xuICB9XG5cbiAgcmVuZGVyQmFja2dyb3VuZChjYWxsYmFjaykge1xuICAgIC8vIHJlbmRlciB0aGUgYmFzZSB0byBnZXQgdHJpYW5nbGUgY29sb3JzXG4gICAgaWYgKHRoaXMub3B0aW9ucy5pbWFnZUFzQmFja2dyb3VuZCkge1xuICAgICAgdGhpcy5yZW5kZXJJbWFnZUJhY2tncm91bmQoY2FsbGJhY2spO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnJlbmRlckdyYWRpZW50KCk7XG4gICAgICBjYWxsYmFjaygpO1xuICAgIH1cbiAgfVxuXG4gIHJlbmRlckZvcmVncm91bmQoKSB7XG4gICAgLy8gZ2V0IGVudGlyZSBjYW52YXMgaW1hZ2UgZGF0YSBvZiBpbiBhIGJpZyB0eXBlZCBhcnJheVxuICAgIC8vIHRoaXMgd2F5IHdlIGRvbnQgaGF2ZSB0byBwaWNrIGZvciBlYWNoIHBvaW50IGluZGl2aWR1YWxseVxuICAgIC8vIGl0J3MgbGlrZSA1MHggZmFzdGVyIHRoaXMgd2F5XG4gICAgdGhpcy5ncmFkaWVudEltYWdlRGF0YSA9IHRoaXMuY3R4LmdldEltYWdlRGF0YSgwLCAwLCB0aGlzLmNhbnZhcy53aWR0aCwgdGhpcy5jYW52YXMuaGVpZ2h0KTtcblxuICAgIC8vIHJlbmRlcnMgdHJpYW5nbGVzLCBlZGdlcywgYW5kIHNoYWRvdyBjYW52YXMgZm9yIGhvdmVyIGRldGVjdGlvblxuICAgIHRoaXMucmVuZGVyVHJpYW5nbGVzKHRoaXMub3B0aW9ucy5zaG93VHJpYW5nbGVzLCB0aGlzLm9wdGlvbnMuc2hvd0VkZ2VzKTtcblxuICAgIHRoaXMucmVuZGVyRXh0cmFzKCk7XG5cbiAgICB0aGlzLnJlbmRlcmVkSW1hZ2VEYXRhID0gdGhpcy5jdHguZ2V0SW1hZ2VEYXRhKDAsIDAsIHRoaXMuY2FudmFzLndpZHRoLCB0aGlzLmNhbnZhcy5oZWlnaHQpO1xuXG4gICAgLy8gdGhyb3cgZXZlbnRzIGZvciBsaWdodCAvIGRhcmsgdGV4dFxuICAgIHZhciBjZW50ZXJDb2xvciA9IHRoaXMuY2VudGVyLmNhbnZhc0NvbG9yQXRQb2ludCgpO1xuXG4gICAgaWYgKHBhcnNlSW50KGNlbnRlckNvbG9yLnNwbGl0KCcsJylbMl0pIDwgNTApIHtcbiAgICAgIGlmICh0aGlzLm9wdGlvbnMub25EYXJrQmFja2dyb3VuZCkge1xuICAgICAgICB0aGlzLm9wdGlvbnMub25EYXJrQmFja2dyb3VuZChjZW50ZXJDb2xvcik7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmICh0aGlzLm9wdGlvbnMub25MaWdodEJhY2tncm91bmQpIHtcbiAgICAgICAgdGhpcy5vcHRpb25zLm9uTGlnaHRCYWNrZ3JvdW5kKGNlbnRlckNvbG9yKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZW5kZXJFeHRyYXMoKSB7XG4gICAgaWYgKHRoaXMub3B0aW9ucy5zaG93UG9pbnRzKSB7XG4gICAgICB0aGlzLnJlbmRlclBvaW50cygpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLm9wdGlvbnMuc2hvd0NpcmNsZXMgJiYgIXRoaXMub3B0aW9ucy5pbWFnZUFzQmFja2dyb3VuZCkge1xuICAgICAgdGhpcy5yZW5kZXJHcmFkaWVudENpcmNsZXMoKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLnNob3dDZW50cm9pZHMpIHtcbiAgICAgIHRoaXMucmVuZGVyQ2VudHJvaWRzKCk7XG4gICAgfVxuICB9XG5cbiAgcmVuZGVyTmV3Q29sb3JzKGNvbG9ycykge1xuICAgIHRoaXMuY29sb3JzID0gY29sb3JzIHx8IHRoaXMuY29sb3JzO1xuICAgIC8vIHRyaWFuZ2xlIGNlbnRyb2lkcyBuZWVkIG5ldyBjb2xvcnNcbiAgICB0aGlzLnJlc2V0UG9pbnRDb2xvcnMoKTtcbiAgICB0aGlzLnJlbmRlcigpO1xuICB9XG5cbiAgcmVuZGVyTmV3R3JhZGllbnQobWluR3JhZGllbnRzLCBtYXhHcmFkaWVudHMpIHtcbiAgICB0aGlzLmdlbmVyYXRlR3JhZGllbnRzKG1pbkdyYWRpZW50cywgbWF4R3JhZGllbnRzKTtcblxuICAgIC8vIHByZXAgZm9yIGFuaW1hdGlvblxuICAgIHRoaXMubmV4dEdyYWRpZW50cyA9IHRoaXMucmFkaWFsR3JhZGllbnRzLnNsaWNlKDApO1xuICAgIHRoaXMuZ2VuZXJhdGVHcmFkaWVudHMoKTtcbiAgICB0aGlzLmN1cnJlbnRHcmFkaWVudHMgPSB0aGlzLnJhZGlhbEdyYWRpZW50cy5zbGljZSgwKTtcblxuICAgIHRoaXMucmVzZXRQb2ludENvbG9ycygpO1xuICAgIHRoaXMucmVuZGVyKCk7XG4gIH1cblxuICByZW5kZXJOZXdUcmlhbmdsZXMobWluLCBtYXgsIG1pbkVkZ2UsIG1heEVkZ2UsIG11bHRpcGxpZXIpIHtcbiAgICB0aGlzLmdlbmVyYXRlTmV3UG9pbnRzKG1pbiwgbWF4LCBtaW5FZGdlLCBtYXhFZGdlLCBtdWx0aXBsaWVyKTtcbiAgICB0aGlzLnRyaWFuZ3VsYXRlKCk7XG4gICAgdGhpcy5yZW5kZXIoKTtcbiAgfVxuXG4gIHJlbmRlckdyYWRpZW50KCkge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5yYWRpYWxHcmFkaWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIC8vIGNyZWF0ZSB0aGUgcmFkaWFsIGdyYWRpZW50IGJhc2VkIG9uXG4gICAgICAvLyB0aGUgZ2VuZXJhdGVkIGNpcmNsZXMnIHJhZGlpIGFuZCBvcmlnaW5zXG4gICAgICB2YXIgcmFkaWFsR3JhZGllbnQgPSB0aGlzLmN0eC5jcmVhdGVSYWRpYWxHcmFkaWVudChcbiAgICAgICAgdGhpcy5yYWRpYWxHcmFkaWVudHNbaV0ueDAsXG4gICAgICAgIHRoaXMucmFkaWFsR3JhZGllbnRzW2ldLnkwLFxuICAgICAgICB0aGlzLnJhZGlhbEdyYWRpZW50c1tpXS5yMCxcbiAgICAgICAgdGhpcy5yYWRpYWxHcmFkaWVudHNbaV0ueDEsXG4gICAgICAgIHRoaXMucmFkaWFsR3JhZGllbnRzW2ldLnkxLFxuICAgICAgICB0aGlzLnJhZGlhbEdyYWRpZW50c1tpXS5yMVxuICAgICAgKTtcblxuICAgICAgdmFyIG91dGVyQ29sb3IgPSB0aGlzLmNvbG9yc1syXTtcblxuICAgICAgLy8gbXVzdCBiZSB0cmFuc3BhcmVudCB2ZXJzaW9uIG9mIG1pZGRsZSBjb2xvclxuICAgICAgLy8gdGhpcyB3b3JrcyBmb3IgcmdiYSBhbmQgaHNsYVxuICAgICAgaWYgKGkgPiAwKSB7XG4gICAgICAgIG91dGVyQ29sb3IgPSB0aGlzLmNvbG9yc1sxXS5zcGxpdCgnLCcpO1xuICAgICAgICBvdXRlckNvbG9yWzNdID0gJzApJztcbiAgICAgICAgb3V0ZXJDb2xvciA9IG91dGVyQ29sb3Iuam9pbignLCcpO1xuICAgICAgfVxuXG4gICAgICByYWRpYWxHcmFkaWVudC5hZGRDb2xvclN0b3AoMSwgdGhpcy5jb2xvcnNbMF0pO1xuICAgICAgcmFkaWFsR3JhZGllbnQuYWRkQ29sb3JTdG9wKHRoaXMucmFkaWFsR3JhZGllbnRzW2ldLmNvbG9yU3RvcCwgdGhpcy5jb2xvcnNbMV0pO1xuICAgICAgcmFkaWFsR3JhZGllbnQuYWRkQ29sb3JTdG9wKDAsIG91dGVyQ29sb3IpO1xuXG4gICAgICB0aGlzLmNhbnZhcy5wYXJlbnRFbGVtZW50LnN0eWxlLmJhY2tncm91bmRDb2xvciA9IHRoaXMuY29sb3JzWzJdO1xuXG4gICAgICB0aGlzLmN0eC5maWxsU3R5bGUgPSByYWRpYWxHcmFkaWVudDtcbiAgICAgIHRoaXMuY3R4LmZpbGxSZWN0KDAsIDAsIHRoaXMuY2FudmFzLndpZHRoLCB0aGlzLmNhbnZhcy5oZWlnaHQpO1xuICAgIH1cbiAgfVxuXG4gIHJlbmRlckltYWdlQmFja2dyb3VuZChjYWxsYmFjaykge1xuICAgIHRoaXMubG9hZEltYWdlQmFja2dyb3VuZCgoZnVuY3Rpb24oKSB7XG4gICAgICAvLyBzY2FsZSBpbWFnZSB0byBmaXQgd2lkdGgvaGVpZ2h0IG9mIGNhbnZhc1xuICAgICAgbGV0IGhlaWdodE11bHRpcGxpZXIgPSB0aGlzLmNhbnZhcy5oZWlnaHQgLyB0aGlzLmltYWdlLmhlaWdodDtcbiAgICAgIGxldCB3aWR0aE11bHRpcGxpZXIgPSB0aGlzLmNhbnZhcy53aWR0aCAvIHRoaXMuaW1hZ2Uud2lkdGg7XG5cbiAgICAgIGxldCBtdWx0aXBsaWVyID0gTWF0aC5tYXgoaGVpZ2h0TXVsdGlwbGllciwgd2lkdGhNdWx0aXBsaWVyKTtcblxuICAgICAgdGhpcy5jdHguZHJhd0ltYWdlKHRoaXMuaW1hZ2UsIDAsIDAsIHRoaXMuaW1hZ2Uud2lkdGggKiBtdWx0aXBsaWVyLCB0aGlzLmltYWdlLmhlaWdodCAqIG11bHRpcGxpZXIpO1xuXG4gICAgICBjYWxsYmFjaygpO1xuICAgIH0pLmJpbmQodGhpcykpO1xuICB9XG5cbiAgbG9hZEltYWdlQmFja2dyb3VuZChjYWxsYmFjaykge1xuICAgIGlmICh0aGlzLmltYWdlICYmIHRoaXMuaW1hZ2Uuc3JjID09PSB0aGlzLm9wdGlvbnMuaW1hZ2VVUkwpIHtcbiAgICAgIGNhbGxiYWNrKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuaW1hZ2UgPSBuZXcgSW1hZ2UoKTtcbiAgICAgIHRoaXMuaW1hZ2UuY3Jvc3NPcmlnaW4gPSAnQW5vbnltb3VzJztcbiAgICAgIHRoaXMuaW1hZ2Uuc3JjID0gdGhpcy5vcHRpb25zLmltYWdlVVJMO1xuXG4gICAgICB0aGlzLmltYWdlLm9ubG9hZCA9IGNhbGxiYWNrO1xuICAgIH1cbiAgfVxuXG4gIHJlbmRlclRyaWFuZ2xlcyh0cmlhbmdsZXMsIGVkZ2VzKSB7XG4gICAgLy8gc2F2ZSB0aGlzIGZvciBsYXRlclxuICAgIHRoaXMuY2VudGVyLmNhbnZhc0NvbG9yQXRQb2ludCh0aGlzLmdyYWRpZW50SW1hZ2VEYXRhKTtcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy50cmlhbmdsZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIC8vIHRoZSBjb2xvciBpcyBkZXRlcm1pbmVkIGJ5IGdyYWJiaW5nIHRoZSBjb2xvciBvZiB0aGUgY2FudmFzXG4gICAgICAvLyAod2hlcmUgd2UgZHJldyB0aGUgZ3JhZGllbnQpIGF0IHRoZSBjZW50ZXIgb2YgdGhlIHRyaWFuZ2xlXG5cbiAgICAgIHRoaXMudHJpYW5nbGVzW2ldLmNvbG9yID0gdGhpcy50cmlhbmdsZXNbaV0uY29sb3JBdENlbnRyb2lkKHRoaXMuZ3JhZGllbnRJbWFnZURhdGEpO1xuXG4gICAgICBpZiAodHJpYW5nbGVzICYmIGVkZ2VzKSB7XG4gICAgICAgIHRoaXMudHJpYW5nbGVzW2ldLnN0cm9rZSA9IHRoaXMub3B0aW9ucy5lZGdlQ29sb3IodGhpcy50cmlhbmdsZXNbaV0uY29sb3JBdENlbnRyb2lkKHRoaXMuZ3JhZGllbnRJbWFnZURhdGEpKTtcbiAgICAgICAgdGhpcy50cmlhbmdsZXNbaV0ucmVuZGVyKHRoaXMuY3R4KTtcbiAgICAgIH0gZWxzZSBpZiAodHJpYW5nbGVzKSB7XG4gICAgICAgIC8vIHRyaWFuZ2xlcyBvbmx5XG4gICAgICAgIHRoaXMudHJpYW5nbGVzW2ldLnN0cm9rZSA9IHRoaXMudHJpYW5nbGVzW2ldLmNvbG9yO1xuICAgICAgICB0aGlzLnRyaWFuZ2xlc1tpXS5yZW5kZXIodGhpcy5jdHgpO1xuICAgICAgfSBlbHNlIGlmIChlZGdlcykge1xuICAgICAgICAvLyBlZGdlcyBvbmx5XG4gICAgICAgIHRoaXMudHJpYW5nbGVzW2ldLnN0cm9rZSA9IHRoaXMub3B0aW9ucy5lZGdlQ29sb3IodGhpcy50cmlhbmdsZXNbaV0uY29sb3JBdENlbnRyb2lkKHRoaXMuZ3JhZGllbnRJbWFnZURhdGEpKTtcbiAgICAgICAgdGhpcy50cmlhbmdsZXNbaV0ucmVuZGVyKHRoaXMuY3R4LCBmYWxzZSk7XG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLmhvdmVyU2hhZG93Q2FudmFzKSB7XG4gICAgICAgIHZhciBjb2xvciA9ICcjJyArICgnMDAwMDAwJyArIGkudG9TdHJpbmcoMTYpKS5zbGljZSgtNik7XG4gICAgICAgIHRoaXMudHJpYW5nbGVzW2ldLnJlbmRlcih0aGlzLnNoYWRvd0N0eCwgY29sb3IsIGZhbHNlKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodGhpcy5ob3ZlclNoYWRvd0NhbnZhcykge1xuICAgICAgdGhpcy5zaGFkb3dJbWFnZURhdGEgPSB0aGlzLnNoYWRvd0N0eC5nZXRJbWFnZURhdGEoMCwgMCwgdGhpcy5jYW52YXMud2lkdGgsIHRoaXMuY2FudmFzLmhlaWdodCk7XG4gICAgfVxuICB9XG5cbiAgLy8gcmVuZGVycyB0aGUgcG9pbnRzIG9mIHRoZSB0cmlhbmdsZXNcbiAgcmVuZGVyUG9pbnRzKCkge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5wb2ludHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBjb2xvciA9IHRoaXMub3B0aW9ucy5wb2ludENvbG9yKHRoaXMucG9pbnRzW2ldLmNhbnZhc0NvbG9yQXRQb2ludCh0aGlzLmdyYWRpZW50SW1hZ2VEYXRhKSk7XG4gICAgICB0aGlzLnBvaW50c1tpXS5yZW5kZXIodGhpcy5jdHgsIGNvbG9yKTtcbiAgICB9XG4gIH1cblxuICAvLyBkcmF3cyB0aGUgY2lyY2xlcyB0aGF0IGRlZmluZSB0aGUgZ3JhZGllbnRzXG4gIHJlbmRlckdyYWRpZW50Q2lyY2xlcygpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMucmFkaWFsR3JhZGllbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB0aGlzLmN0eC5iZWdpblBhdGgoKTtcbiAgICAgIHRoaXMuY3R4LmFyYyh0aGlzLnJhZGlhbEdyYWRpZW50c1tpXS54MCxcbiAgICAgICAgICAgICAgdGhpcy5yYWRpYWxHcmFkaWVudHNbaV0ueTAsXG4gICAgICAgICAgICAgIHRoaXMucmFkaWFsR3JhZGllbnRzW2ldLnIwLFxuICAgICAgICAgICAgICAwLCBNYXRoLlBJICogMiwgdHJ1ZSk7XG4gICAgICB2YXIgY2VudGVyMSA9IG5ldyBQb2ludCh0aGlzLnJhZGlhbEdyYWRpZW50c1tpXS54MCwgdGhpcy5yYWRpYWxHcmFkaWVudHNbaV0ueTApO1xuICAgICAgdGhpcy5jdHguc3Ryb2tlU3R5bGUgPSBjZW50ZXIxLmNhbnZhc0NvbG9yQXRQb2ludCh0aGlzLmdyYWRpZW50SW1hZ2VEYXRhKTtcbiAgICAgIHRoaXMuY3R4LnN0cm9rZSgpO1xuXG4gICAgICB0aGlzLmN0eC5iZWdpblBhdGgoKTtcbiAgICAgIHRoaXMuY3R4LmFyYyh0aGlzLnJhZGlhbEdyYWRpZW50c1tpXS54MSxcbiAgICAgICAgICAgICAgdGhpcy5yYWRpYWxHcmFkaWVudHNbaV0ueTEsXG4gICAgICAgICAgICAgIHRoaXMucmFkaWFsR3JhZGllbnRzW2ldLnIxLFxuICAgICAgICAgICAgICAwLCBNYXRoLlBJICogMiwgdHJ1ZSk7XG4gICAgICB2YXIgY2VudGVyMiA9IG5ldyBQb2ludCh0aGlzLnJhZGlhbEdyYWRpZW50c1tpXS54MSwgdGhpcy5yYWRpYWxHcmFkaWVudHNbaV0ueTEpO1xuICAgICAgdGhpcy5jdHguc3Ryb2tlU3R5bGUgPSBjZW50ZXIyLmNhbnZhc0NvbG9yQXRQb2ludCh0aGlzLmdyYWRpZW50SW1hZ2VEYXRhKTtcbiAgICAgIHRoaXMuY3R4LnN0cm9rZSgpO1xuICAgIH1cbiAgfVxuXG4gIC8vIHJlbmRlciB0cmlhbmdsZSBjZW50cm9pZHNcbiAgcmVuZGVyQ2VudHJvaWRzKCkge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy50cmlhbmdsZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBjb2xvciA9IHRoaXMub3B0aW9ucy5jZW50cm9pZENvbG9yKHRoaXMudHJpYW5nbGVzW2ldLmNvbG9yQXRDZW50cm9pZCh0aGlzLmdyYWRpZW50SW1hZ2VEYXRhKSk7XG4gICAgICB0aGlzLnRyaWFuZ2xlc1tpXS5jZW50cm9pZCgpLnJlbmRlcih0aGlzLmN0eCwgY29sb3IpO1xuICAgIH1cbiAgfVxuXG4gIHRvZ2dsZVRyaWFuZ2xlcygpIHtcbiAgICB0aGlzLm9wdGlvbnMuc2hvd1RyaWFuZ2xlcyA9ICF0aGlzLm9wdGlvbnMuc2hvd1RyaWFuZ2xlcztcbiAgICB0aGlzLnJlbmRlcigpO1xuICB9XG5cbiAgdG9nZ2xlUG9pbnRzKCkge1xuICAgIHRoaXMub3B0aW9ucy5zaG93UG9pbnRzID0gIXRoaXMub3B0aW9ucy5zaG93UG9pbnRzO1xuICAgIHRoaXMucmVuZGVyKCk7XG4gIH1cblxuICB0b2dnbGVDaXJjbGVzKCkge1xuICAgIHRoaXMub3B0aW9ucy5zaG93Q2lyY2xlcyA9ICF0aGlzLm9wdGlvbnMuc2hvd0NpcmNsZXM7XG4gICAgdGhpcy5yZW5kZXIoKTtcbiAgfVxuXG4gIHRvZ2dsZUNlbnRyb2lkcygpIHtcbiAgICB0aGlzLm9wdGlvbnMuc2hvd0NlbnRyb2lkcyA9ICF0aGlzLm9wdGlvbnMuc2hvd0NlbnRyb2lkcztcbiAgICB0aGlzLnJlbmRlcigpO1xuICB9XG5cbiAgdG9nZ2xlRWRnZXMoKSB7XG4gICAgdGhpcy5vcHRpb25zLnNob3dFZGdlcyA9ICF0aGlzLm9wdGlvbnMuc2hvd0VkZ2VzO1xuICAgIHRoaXMucmVuZGVyKCk7XG4gIH1cblxuICB0b2dnbGVBbmltYXRpb24oKSB7XG4gICAgdGhpcy5vcHRpb25zLmFuaW1hdGUgPSAhdGhpcy5vcHRpb25zLmFuaW1hdGU7XG4gICAgaWYgKHRoaXMub3B0aW9ucy5hbmltYXRlKSB7XG4gICAgICB0aGlzLmluaXRSZW5kZXJMb29wKCk7XG4gICAgfVxuICB9XG5cbiAgZ2V0Q29sb3JzKCkge1xuICAgIHJldHVybiB0aGlzLmNvbG9ycztcbiAgfVxufVxuXG5mdW5jdGlvbiBsaW5lYXJTY2FsZSh4MCwgeDEsIHNjYWxlKSB7XG4gIHJldHVybiB4MCArIChzY2FsZSAqICh4MSAtIHgwKSk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gUHJldHR5RGVsYXVuYXk7XG4iLCJjb25zdCBDb2xvciA9IHtcblxuICBoZXhUb1JnYmE6IGZ1bmN0aW9uKGhleCkge1xuICAgIGhleCA9IGhleC5yZXBsYWNlKCcjJywgJycpO1xuICAgIHZhciByID0gcGFyc2VJbnQoaGV4LnN1YnN0cmluZygwLCAyKSwgMTYpO1xuICAgIHZhciBnID0gcGFyc2VJbnQoaGV4LnN1YnN0cmluZygyLCA0KSwgMTYpO1xuICAgIHZhciBiID0gcGFyc2VJbnQoaGV4LnN1YnN0cmluZyg0LCA2KSwgMTYpO1xuXG4gICAgcmV0dXJuICdyZ2JhKCcgKyByICsgJywnICsgZyArICcsJyArIGIgKyAnLDEpJztcbiAgfSxcblxuICBoZXhUb1JnYmFBcnJheTogZnVuY3Rpb24oaGV4KSB7XG4gICAgaGV4ID0gaGV4LnJlcGxhY2UoJyMnLCAnJyk7XG4gICAgdmFyIHIgPSBwYXJzZUludChoZXguc3Vic3RyaW5nKDAsIDIpLCAxNik7XG4gICAgdmFyIGcgPSBwYXJzZUludChoZXguc3Vic3RyaW5nKDIsIDQpLCAxNik7XG4gICAgdmFyIGIgPSBwYXJzZUludChoZXguc3Vic3RyaW5nKDQsIDYpLCAxNik7XG5cbiAgICByZXR1cm4gW3IsIGcsIGJdO1xuICB9LFxuXG4gIC8qKlxuICAgKiBDb252ZXJ0cyBhbiBSR0IgY29sb3IgdmFsdWUgdG8gSFNMLiBDb252ZXJzaW9uIGZvcm11bGFcbiAgICogYWRhcHRlZCBmcm9tIGh0dHA6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvSFNMX2NvbG9yX3NwYWNlLlxuICAgKiBBc3N1bWVzIHIsIGcsIGFuZCBiIGFyZSBjb250YWluZWQgaW4gdGhlIHNldCBbMCwgMjU1XSBhbmRcbiAgICogcmV0dXJucyBoLCBzLCBhbmQgbCBpbiB0aGUgc2V0IFswLCAxXS5cbiAgICpcbiAgICogQHBhcmFtICAgTnVtYmVyICByICAgICAgIFRoZSByZWQgY29sb3IgdmFsdWVcbiAgICogQHBhcmFtICAgTnVtYmVyICBnICAgICAgIFRoZSBncmVlbiBjb2xvciB2YWx1ZVxuICAgKiBAcGFyYW0gICBOdW1iZXIgIGIgICAgICAgVGhlIGJsdWUgY29sb3IgdmFsdWVcbiAgICogQHJldHVybiAgQXJyYXkgICAgICAgICAgIFRoZSBIU0wgcmVwcmVzZW50YXRpb25cbiAgICovXG4gIHJnYlRvSHNsYTogZnVuY3Rpb24ocmdiKSB7XG4gICAgdmFyIHIgPSByZ2JbMF0gLyAyNTU7XG4gICAgdmFyIGcgPSByZ2JbMV0gLyAyNTU7XG4gICAgdmFyIGIgPSByZ2JbMl0gLyAyNTU7XG4gICAgdmFyIG1heCA9IE1hdGgubWF4KHIsIGcsIGIpO1xuICAgIHZhciBtaW4gPSBNYXRoLm1pbihyLCBnLCBiKTtcbiAgICB2YXIgaDtcbiAgICB2YXIgcztcbiAgICB2YXIgbCA9IChtYXggKyBtaW4pIC8gMjtcblxuICAgIGlmIChtYXggPT09IG1pbikge1xuICAgICAgaCA9IHMgPSAwOyAvLyBhY2hyb21hdGljXG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBkID0gbWF4IC0gbWluO1xuICAgICAgcyA9IGwgPiAwLjUgPyBkIC8gKDIgLSBtYXggLSBtaW4pIDogZCAvIChtYXggKyBtaW4pO1xuICAgICAgc3dpdGNoIChtYXgpe1xuICAgICAgICBjYXNlIHI6IGggPSAoZyAtIGIpIC8gZCArIChnIDwgYiA/IDYgOiAwKTsgYnJlYWs7XG4gICAgICAgIGNhc2UgZzogaCA9IChiIC0gcikgLyBkICsgMjsgYnJlYWs7XG4gICAgICAgIGNhc2UgYjogaCA9IChyIC0gZykgLyBkICsgNDsgYnJlYWs7XG4gICAgICB9XG4gICAgICBoIC89IDY7XG4gICAgfVxuXG4gICAgcmV0dXJuICdoc2xhKCcgKyBNYXRoLnJvdW5kKGggKiAzNjApICsgJywnICsgTWF0aC5yb3VuZChzICogMTAwKSArICclLCcgKyBNYXRoLnJvdW5kKGwgKiAxMDApICsgJyUsMSknO1xuICB9LFxuXG4gIGhzbGFBZGp1c3RBbHBoYTogZnVuY3Rpb24oY29sb3IsIGFscGhhKSB7XG4gICAgY29sb3IgPSBjb2xvci5zcGxpdCgnLCcpO1xuXG4gICAgaWYgKHR5cGVvZiBhbHBoYSAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgY29sb3JbM10gPSBhbHBoYTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29sb3JbM10gPSBhbHBoYShwYXJzZUludChjb2xvclszXSkpO1xuICAgIH1cblxuICAgIGNvbG9yWzNdICs9ICcpJztcbiAgICByZXR1cm4gY29sb3Iuam9pbignLCcpO1xuICB9LFxuXG4gIGhzbGFBZGp1c3RMaWdodG5lc3M6IGZ1bmN0aW9uKGNvbG9yLCBsaWdodG5lc3MpIHtcbiAgICBjb2xvciA9IGNvbG9yLnNwbGl0KCcsJyk7XG5cbiAgICBpZiAodHlwZW9mIGxpZ2h0bmVzcyAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgY29sb3JbMl0gPSBsaWdodG5lc3M7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbG9yWzJdID0gbGlnaHRuZXNzKHBhcnNlSW50KGNvbG9yWzJdKSk7XG4gICAgfVxuXG4gICAgY29sb3JbMl0gKz0gJyUnO1xuICAgIHJldHVybiBjb2xvci5qb2luKCcsJyk7XG4gIH0sXG5cbiAgcmdiVG9IZXg6IGZ1bmN0aW9uKHJnYikge1xuICAgIGlmICh0eXBlb2YgcmdiID09PSAnc3RyaW5nJykge1xuICAgICAgcmdiID0gcmdiLnJlcGxhY2UoJ3JnYignLCAnJykucmVwbGFjZSgnKScsICcnKS5zcGxpdCgnLCcpO1xuICAgIH1cbiAgICByZ2IgPSByZ2IubWFwKGZ1bmN0aW9uKHgpIHtcbiAgICAgIHggPSBwYXJzZUludCh4KS50b1N0cmluZygxNik7XG4gICAgICByZXR1cm4gKHgubGVuZ3RoID09PSAxKSA/ICcwJyArIHggOiB4O1xuICAgIH0pO1xuICAgIHJldHVybiByZ2Iuam9pbignJyk7XG4gIH0sXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IENvbG9yO1xuIiwiY29uc3QgQ29sb3IgPSByZXF1aXJlKCcuL2NvbG9yJyk7XG5cbi8qKlxuICogUmVwcmVzZW50cyBhIHBvaW50XG4gKiBAY2xhc3NcbiAqL1xuY2xhc3MgUG9pbnQge1xuICAvKipcbiAgICogUG9pbnQgY29uc2lzdHMgeCBhbmQgeVxuICAgKiBAY29uc3RydWN0b3JcbiAgICogQHBhcmFtIHtOdW1iZXJ9IHhcbiAgICogQHBhcmFtIHtOdW1iZXJ9IHlcbiAgICogb3I6XG4gICAqIEBwYXJhbSB7TnVtYmVyW119IHhcbiAgICogd2hlcmUgeCBpcyBsZW5ndGgtMiBhcnJheVxuICAgKi9cbiAgY29uc3RydWN0b3IoeCwgeSkge1xuICAgIGlmIChBcnJheS5pc0FycmF5KHgpKSB7XG4gICAgICB5ID0geFsxXTtcbiAgICAgIHggPSB4WzBdO1xuICAgIH1cbiAgICB0aGlzLnggPSB4O1xuICAgIHRoaXMueSA9IHk7XG4gICAgdGhpcy5yYWRpdXMgPSAxO1xuICAgIHRoaXMuY29sb3IgPSAnYmxhY2snO1xuICB9XG5cbiAgLy8gZHJhdyB0aGUgcG9pbnRcbiAgcmVuZGVyKGN0eCwgY29sb3IpIHtcbiAgICBjdHguYmVnaW5QYXRoKCk7XG4gICAgY3R4LmFyYyh0aGlzLngsIHRoaXMueSwgdGhpcy5yYWRpdXMsIDAsIDIgKiBNYXRoLlBJLCBmYWxzZSk7XG4gICAgY3R4LmZpbGxTdHlsZSA9IGNvbG9yIHx8IHRoaXMuY29sb3I7XG4gICAgY3R4LmZpbGwoKTtcbiAgICBjdHguY2xvc2VQYXRoKCk7XG4gIH1cblxuICAvLyBjb252ZXJ0cyB0byBzdHJpbmdcbiAgLy8gcmV0dXJucyBzb21ldGhpbmcgbGlrZTpcbiAgLy8gXCIoWCxZKVwiXG4gIC8vIHVzZWQgaW4gdGhlIHBvaW50bWFwIHRvIGRldGVjdCB1bmlxdWUgcG9pbnRzXG4gIHRvU3RyaW5nKCkge1xuICAgIHJldHVybiAnKCcgKyB0aGlzLnggKyAnLCcgKyB0aGlzLnkgKyAnKSc7XG4gIH1cblxuICAvLyBncmFiIHRoZSBjb2xvciBvZiB0aGUgY2FudmFzIGF0IHRoZSBwb2ludFxuICAvLyByZXF1aXJlcyBpbWFnZWRhdGEgZnJvbSBjYW52YXMgc28gd2UgZG9udCBncmFiXG4gIC8vIGVhY2ggcG9pbnQgaW5kaXZpZHVhbGx5LCB3aGljaCBpcyByZWFsbHkgZXhwZW5zaXZlXG4gIGNhbnZhc0NvbG9yQXRQb2ludChpbWFnZURhdGEsIGNvbG9yU3BhY2UpIHtcbiAgICBjb2xvclNwYWNlID0gY29sb3JTcGFjZSB8fCAnaHNsYSc7XG4gICAgLy8gb25seSBmaW5kIHRoZSBjYW52YXMgY29sb3IgaWYgd2UgZG9udCBhbHJlYWR5IGtub3cgaXRcbiAgICBpZiAoIXRoaXMuX2NhbnZhc0NvbG9yKSB7XG4gICAgICAvLyBpbWFnZURhdGEgYXJyYXkgaXMgZmxhdCwgZ29lcyBieSByb3dzIHRoZW4gY29scywgZm91ciB2YWx1ZXMgcGVyIHBpeGVsXG4gICAgICB2YXIgaWR4ID0gKE1hdGguZmxvb3IodGhpcy55KSAqIGltYWdlRGF0YS53aWR0aCAqIDQpICsgKE1hdGguZmxvb3IodGhpcy54KSAqIDQpO1xuXG4gICAgICBpZiAoY29sb3JTcGFjZSA9PT0gJ2hzbGEnKSB7XG4gICAgICAgIHRoaXMuX2NhbnZhc0NvbG9yID0gQ29sb3IucmdiVG9Ic2xhKEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGltYWdlRGF0YS5kYXRhLCBpZHgsIGlkeCArIDQpKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuX2NhbnZhc0NvbG9yID0gJ3JnYignICsgQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoaW1hZ2VEYXRhLmRhdGEsIGlkeCwgaWR4ICsgMykuam9pbigpICsgJyknO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdGhpcy5fY2FudmFzQ29sb3I7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9jYW52YXNDb2xvcjtcbiAgfVxuXG4gIGdldENvb3JkcygpIHtcbiAgICByZXR1cm4gW3RoaXMueCwgdGhpcy55XTtcbiAgfVxuXG4gIC8vIGRpc3RhbmNlIHRvIGFub3RoZXIgcG9pbnRcbiAgZ2V0RGlzdGFuY2VUbyhwb2ludCkge1xuICAgIC8vIOKImih4MuKIkngxKTIrKHky4oiSeTEpMlxuICAgIHJldHVybiBNYXRoLnNxcnQoTWF0aC5wb3codGhpcy54IC0gcG9pbnQueCwgMikgKyBNYXRoLnBvdyh0aGlzLnkgLSBwb2ludC55LCAyKSk7XG4gIH1cblxuICAvLyBzY2FsZSBwb2ludHMgZnJvbSBbQSwgQl0gdG8gW0MsIERdXG4gIC8vIHhBID0+IG9sZCB4IG1pbiwgeEIgPT4gb2xkIHggbWF4XG4gIC8vIHlBID0+IG9sZCB5IG1pbiwgeUIgPT4gb2xkIHkgbWF4XG4gIC8vIHhDID0+IG5ldyB4IG1pbiwgeEQgPT4gbmV3IHggbWF4XG4gIC8vIHlDID0+IG5ldyB5IG1pbiwgeUQgPT4gbmV3IHkgbWF4XG4gIHJlc2NhbGUoeEEsIHhCLCB5QSwgeUIsIHhDLCB4RCwgeUMsIHlEKSB7XG4gICAgLy8gTmV3VmFsdWUgPSAoKChPbGRWYWx1ZSAtIE9sZE1pbikgKiBOZXdSYW5nZSkgLyBPbGRSYW5nZSkgKyBOZXdNaW5cblxuICAgIHZhciB4T2xkUmFuZ2UgPSB4QiAtIHhBO1xuICAgIHZhciB5T2xkUmFuZ2UgPSB5QiAtIHlBO1xuXG4gICAgdmFyIHhOZXdSYW5nZSA9IHhEIC0geEM7XG4gICAgdmFyIHlOZXdSYW5nZSA9IHlEIC0geUM7XG5cbiAgICB0aGlzLnggPSAoKCh0aGlzLnggLSB4QSkgKiB4TmV3UmFuZ2UpIC8geE9sZFJhbmdlKSArIHhDO1xuICAgIHRoaXMueSA9ICgoKHRoaXMueSAtIHlBKSAqIHlOZXdSYW5nZSkgLyB5T2xkUmFuZ2UpICsgeUM7XG4gIH1cblxuICByZXNldENvbG9yKCkge1xuICAgIHRoaXMuX2NhbnZhc0NvbG9yID0gdW5kZWZpbmVkO1xuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gUG9pbnQ7XG4iLCJjb25zdCBQb2ludCA9IHJlcXVpcmUoJy4vcG9pbnQnKTtcblxuLyoqXG4gKiBSZXByZXNlbnRzIGEgcG9pbnRcbiAqIEBjbGFzc1xuICovXG5jbGFzcyBQb2ludE1hcCB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHRoaXMuX21hcCA9IHt9O1xuICB9XG5cbiAgLy8gYWRkcyBwb2ludCB0byBtYXBcbiAgYWRkKHBvaW50KSB7XG4gICAgdGhpcy5fbWFwW3BvaW50LnRvU3RyaW5nKCldID0gdHJ1ZTtcbiAgfVxuXG4gIC8vIGFkZHMgeCwgeSBjb29yZCB0byBtYXBcbiAgYWRkQ29vcmQoeCwgeSkge1xuICAgIHRoaXMuYWRkKG5ldyBQb2ludCh4LCB5KSk7XG4gIH1cblxuICAvLyByZW1vdmVzIHBvaW50IGZyb20gbWFwXG4gIHJlbW92ZShwb2ludCkge1xuICAgIHRoaXMuX21hcFtwb2ludC50b1N0cmluZygpXSA9IGZhbHNlO1xuICB9XG5cbiAgLy8gcmVtb3ZlcyB4LCB5IGNvb3JkIGZyb20gbWFwXG4gIHJlbW92ZUNvb3JkKHgsIHkpIHtcbiAgICB0aGlzLnJlbW92ZShuZXcgUG9pbnQoeCwgeSkpO1xuICB9XG5cbiAgLy8gY2xlYXJzIHRoZSBtYXBcbiAgY2xlYXIoKSB7XG4gICAgdGhpcy5fbWFwID0ge307XG4gIH1cblxuICAvKipcbiAgICogZGV0ZXJtaW5lcyBpZiBwb2ludCBoYXMgYmVlblxuICAgKiBhZGRlZCB0byBtYXAgYWxyZWFkeVxuICAgKiAgQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBleGlzdHMocG9pbnQpIHtcbiAgICByZXR1cm4gdGhpcy5fbWFwW3BvaW50LnRvU3RyaW5nKCldID8gdHJ1ZSA6IGZhbHNlO1xuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gUG9pbnRNYXA7XG4iLCJmdW5jdGlvbiBwb2x5ZmlsbHMoKSB7XG4gIC8vIHBvbHlmaWxsIGZvciBPYmplY3QuYXNzaWduXG4gIGlmICh0eXBlb2YgT2JqZWN0LmFzc2lnbiAhPT0gJ2Z1bmN0aW9uJykge1xuICAgIE9iamVjdC5hc3NpZ24gPSBmdW5jdGlvbih0YXJnZXQpIHtcbiAgICAgIGlmICh0YXJnZXQgPT09IHVuZGVmaW5lZCB8fCB0YXJnZXQgPT09IG51bGwpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQ2Fubm90IGNvbnZlcnQgdW5kZWZpbmVkIG9yIG51bGwgdG8gb2JqZWN0Jyk7XG4gICAgICB9XG5cbiAgICAgIHZhciBvdXRwdXQgPSBPYmplY3QodGFyZ2V0KTtcbiAgICAgIGZvciAodmFyIGluZGV4ID0gMTsgaW5kZXggPCBhcmd1bWVudHMubGVuZ3RoOyBpbmRleCsrKSB7XG4gICAgICAgIHZhciBzb3VyY2UgPSBhcmd1bWVudHNbaW5kZXhdO1xuICAgICAgICBpZiAoc291cmNlICE9PSB1bmRlZmluZWQgJiYgc291cmNlICE9PSBudWxsKSB7XG4gICAgICAgICAgZm9yICh2YXIgbmV4dEtleSBpbiBzb3VyY2UpIHtcbiAgICAgICAgICAgIGlmIChzb3VyY2UuaGFzT3duUHJvcGVydHkobmV4dEtleSkpIHtcbiAgICAgICAgICAgICAgb3V0cHV0W25leHRLZXldID0gc291cmNlW25leHRLZXldO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIG91dHB1dDtcbiAgICB9O1xuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gcG9seWZpbGxzO1xuIiwiY29uc3QgUG9pbnQgPSByZXF1aXJlKCcuL3BvaW50Jyk7XG5cbmNvbnN0IFJhbmRvbSA9IHtcbiAgLy8gaGV5IGxvb2sgYSBjbG9zdXJlXG4gIC8vIHJldHVybnMgZnVuY3Rpb24gZm9yIHJhbmRvbSBudW1iZXJzIHdpdGggcHJlLXNldCBtYXggYW5kIG1pblxuICByYW5kb21OdW1iZXJGdW5jdGlvbjogZnVuY3Rpb24obWF4LCBtaW4pIHtcbiAgICBtaW4gPSBtaW4gfHwgMDtcbiAgICBpZiAobWluID4gbWF4KSB7XG4gICAgICB2YXIgdGVtcCA9IG1heDtcbiAgICAgIG1heCA9IG1pbjtcbiAgICAgIG1pbiA9IHRlbXA7XG4gICAgfVxuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAobWF4IC0gbWluICsgMSkpICsgbWluO1xuICAgIH07XG4gIH0sXG5cbiAgLy8gcmV0dXJucyBhIHJhbmRvbSBudW1iZXJcbiAgLy8gYmV0d2VlbiB0aGUgbWF4IGFuZCBtaW5cbiAgcmFuZG9tQmV0d2VlbjogZnVuY3Rpb24obWF4LCBtaW4pIHtcbiAgICBtaW4gPSBtaW4gfHwgMDtcbiAgICByZXR1cm4gUmFuZG9tLnJhbmRvbU51bWJlckZ1bmN0aW9uKG1heCwgbWluKSgpO1xuICB9LFxuXG4gIHJhbmRvbUluQ2lyY2xlOiBmdW5jdGlvbihyYWRpdXMsIG94LCBveSkge1xuICAgIHZhciBhbmdsZSA9IE1hdGgucmFuZG9tKCkgKiBNYXRoLlBJICogMjtcbiAgICB2YXIgcmFkID0gTWF0aC5zcXJ0KE1hdGgucmFuZG9tKCkpICogcmFkaXVzO1xuICAgIHZhciB4ID0gb3ggKyByYWQgKiBNYXRoLmNvcyhhbmdsZSk7XG4gICAgdmFyIHkgPSBveSArIHJhZCAqIE1hdGguc2luKGFuZ2xlKTtcblxuICAgIHJldHVybiBuZXcgUG9pbnQoeCwgeSk7XG4gIH0sXG5cbiAgcmFuZG9tUmdiYTogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuICdyZ2JhKCcgKyBSYW5kb20ucmFuZG9tQmV0d2VlbigyNTUpICsgJywnICtcbiAgICAgICAgICAgICAgICAgICAgIFJhbmRvbS5yYW5kb21CZXR3ZWVuKDI1NSkgKyAnLCcgK1xuICAgICAgICAgICAgICAgICAgICAgUmFuZG9tLnJhbmRvbUJldHdlZW4oMjU1KSArICcsIDEpJztcbiAgfSxcblxuICByYW5kb21Ic2xhOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gJ2hzbGEoJyArIFJhbmRvbS5yYW5kb21CZXR3ZWVuKDM2MCkgKyAnLCcgK1xuICAgICAgICAgICAgICAgICAgICAgUmFuZG9tLnJhbmRvbUJldHdlZW4oMTAwKSArICclLCcgK1xuICAgICAgICAgICAgICAgICAgICAgUmFuZG9tLnJhbmRvbUJldHdlZW4oMTAwKSArICclLCAxKSc7XG4gIH0sXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFJhbmRvbTtcbiIsImNvbnN0IFBvaW50ID0gcmVxdWlyZSgnLi9wb2ludCcpO1xuXG4vKipcbiAqIFJlcHJlc2VudHMgYSB0cmlhbmdsZVxuICogQGNsYXNzXG4gKi9cbmNsYXNzIFRyaWFuZ2xlIHtcbiAgLyoqXG4gICAqIFRyaWFuZ2xlIGNvbnNpc3RzIG9mIHRocmVlIFBvaW50c1xuICAgKiBAY29uc3RydWN0b3JcbiAgICogQHBhcmFtIHtPYmplY3R9IGFcbiAgICogQHBhcmFtIHtPYmplY3R9IGJcbiAgICogQHBhcmFtIHtPYmplY3R9IGNcbiAgICovXG4gIGNvbnN0cnVjdG9yKGEsIGIsIGMpIHtcbiAgICB0aGlzLnAxID0gdGhpcy5hID0gYTtcbiAgICB0aGlzLnAyID0gdGhpcy5iID0gYjtcbiAgICB0aGlzLnAzID0gdGhpcy5jID0gYztcblxuICAgIHRoaXMuY29sb3IgPSAnYmxhY2snO1xuICAgIHRoaXMuc3Ryb2tlID0gJ2JsYWNrJztcbiAgfVxuXG4gIC8vIGRyYXcgdGhlIHRyaWFuZ2xlIHdpdGggZGlmZmVyaW5nIGVkZ2UgY29sb3JzIG9wdGlvbmFsXG4gIHJlbmRlcihjdHgsIGNvbG9yLCBzdHJva2UpIHtcbiAgICBjdHguYmVnaW5QYXRoKCk7XG4gICAgY3R4Lm1vdmVUbyh0aGlzLmEueCwgdGhpcy5hLnkpO1xuICAgIGN0eC5saW5lVG8odGhpcy5iLngsIHRoaXMuYi55KTtcbiAgICBjdHgubGluZVRvKHRoaXMuYy54LCB0aGlzLmMueSk7XG4gICAgY3R4LmNsb3NlUGF0aCgpO1xuICAgIGN0eC5zdHJva2VTdHlsZSA9IHN0cm9rZSB8fCB0aGlzLnN0cm9rZSB8fCB0aGlzLmNvbG9yO1xuICAgIGN0eC5maWxsU3R5bGUgPSBjb2xvciB8fCB0aGlzLmNvbG9yO1xuICAgIGlmIChjb2xvciAhPT0gZmFsc2UgJiYgc3Ryb2tlICE9PSBmYWxzZSkge1xuICAgICAgLy8gZHJhdyB0aGUgc3Ryb2tlIHVzaW5nIHRoZSBmaWxsIGNvbG9yIGZpcnN0XG4gICAgICAvLyBzbyB0aGF0IHRoZSBwb2ludHMgb2YgYWRqYWNlbnQgdHJpYW5nbGVzXG4gICAgICAvLyBkb250IG92ZXJsYXAgYSBidW5jaCBhbmQgbG9vayBcInN0YXJyeVwiXG4gICAgICB2YXIgdGVtcFN0cm9rZSA9IGN0eC5zdHJva2VTdHlsZTtcbiAgICAgIGN0eC5zdHJva2VTdHlsZSA9IGN0eC5maWxsU3R5bGU7XG4gICAgICBjdHguc3Ryb2tlKCk7XG4gICAgICBjdHguc3Ryb2tlU3R5bGUgPSB0ZW1wU3Ryb2tlO1xuICAgIH1cbiAgICBpZiAoY29sb3IgIT09IGZhbHNlKSB7XG4gICAgICBjdHguZmlsbCgpO1xuICAgIH1cbiAgICBpZiAoc3Ryb2tlICE9PSBmYWxzZSkge1xuICAgICAgY3R4LnN0cm9rZSgpO1xuICAgIH1cbiAgICBjdHguY2xvc2VQYXRoKCk7XG4gIH1cblxuICAvLyByYW5kb20gcG9pbnQgaW5zaWRlIHRyaWFuZ2xlXG4gIHJhbmRvbUluc2lkZSgpIHtcbiAgICB2YXIgcjEgPSBNYXRoLnJhbmRvbSgpO1xuICAgIHZhciByMiA9IE1hdGgucmFuZG9tKCk7XG4gICAgdmFyIHggPSAoMSAtIE1hdGguc3FydChyMSkpICpcbiAgICAgICAgICAgIHRoaXMucDEueCArIChNYXRoLnNxcnQocjEpICpcbiAgICAgICAgICAgICgxIC0gcjIpKSAqXG4gICAgICAgICAgICB0aGlzLnAyLnggKyAoTWF0aC5zcXJ0KHIxKSAqIHIyKSAqXG4gICAgICAgICAgICB0aGlzLnAzLng7XG4gICAgdmFyIHkgPSAoMSAtIE1hdGguc3FydChyMSkpICpcbiAgICAgICAgICAgIHRoaXMucDEueSArIChNYXRoLnNxcnQocjEpICpcbiAgICAgICAgICAgICgxIC0gcjIpKSAqXG4gICAgICAgICAgICB0aGlzLnAyLnkgKyAoTWF0aC5zcXJ0KHIxKSAqIHIyKSAqXG4gICAgICAgICAgICB0aGlzLnAzLnk7XG4gICAgcmV0dXJuIG5ldyBQb2ludCh4LCB5KTtcbiAgfVxuXG4gIGNvbG9yQXRDZW50cm9pZChpbWFnZURhdGEpIHtcbiAgICByZXR1cm4gdGhpcy5jZW50cm9pZCgpLmNhbnZhc0NvbG9yQXRQb2ludChpbWFnZURhdGEpO1xuICB9XG5cbiAgcmVzZXRQb2ludENvbG9ycygpIHtcbiAgICB0aGlzLmNlbnRyb2lkKCkucmVzZXRDb2xvcigpO1xuICAgIHRoaXMucDEucmVzZXRDb2xvcigpO1xuICAgIHRoaXMucDIucmVzZXRDb2xvcigpO1xuICAgIHRoaXMucDMucmVzZXRDb2xvcigpO1xuICB9XG5cbiAgY2VudHJvaWQoKSB7XG4gICAgLy8gb25seSBjYWxjIHRoZSBjZW50cm9pZCBpZiB3ZSBkb250IGFscmVhZHkga25vdyBpdFxuICAgIGlmICh0aGlzLl9jZW50cm9pZCkge1xuICAgICAgcmV0dXJuIHRoaXMuX2NlbnRyb2lkO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgeCA9IE1hdGgucm91bmQoKHRoaXMucDEueCArIHRoaXMucDIueCArIHRoaXMucDMueCkgLyAzKTtcbiAgICAgIHZhciB5ID0gTWF0aC5yb3VuZCgodGhpcy5wMS55ICsgdGhpcy5wMi55ICsgdGhpcy5wMy55KSAvIDMpO1xuICAgICAgdGhpcy5fY2VudHJvaWQgPSBuZXcgUG9pbnQoeCwgeSk7XG5cbiAgICAgIHJldHVybiB0aGlzLl9jZW50cm9pZDtcbiAgICB9XG4gIH1cblxuICAvLyBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzEzMzAwOTA0L2RldGVybWluZS13aGV0aGVyLXBvaW50LWxpZXMtaW5zaWRlLXRyaWFuZ2xlXG4gIHBvaW50SW5UcmlhbmdsZShwb2ludCkge1xuICAgIHZhciBhbHBoYSA9ICgodGhpcy5wMi55IC0gdGhpcy5wMy55KSAqIChwb2ludC54IC0gdGhpcy5wMy54KSArICh0aGlzLnAzLnggLSB0aGlzLnAyLngpICogKHBvaW50LnkgLSB0aGlzLnAzLnkpKSAvXG4gICAgICAgICAgICAgICgodGhpcy5wMi55IC0gdGhpcy5wMy55KSAqICh0aGlzLnAxLnggLSB0aGlzLnAzLngpICsgKHRoaXMucDMueCAtIHRoaXMucDIueCkgKiAodGhpcy5wMS55IC0gdGhpcy5wMy55KSk7XG4gICAgdmFyIGJldGEgPSAoKHRoaXMucDMueSAtIHRoaXMucDEueSkgKiAocG9pbnQueCAtIHRoaXMucDMueCkgKyAodGhpcy5wMS54IC0gdGhpcy5wMy54KSAqIChwb2ludC55IC0gdGhpcy5wMy55KSkgL1xuICAgICAgICAgICAgICgodGhpcy5wMi55IC0gdGhpcy5wMy55KSAqICh0aGlzLnAxLnggLSB0aGlzLnAzLngpICsgKHRoaXMucDMueCAtIHRoaXMucDIueCkgKiAodGhpcy5wMS55IC0gdGhpcy5wMy55KSk7XG4gICAgdmFyIGdhbW1hID0gMS4wIC0gYWxwaGEgLSBiZXRhO1xuXG4gICAgcmV0dXJuIChhbHBoYSA+IDAgJiYgYmV0YSA+IDAgJiYgZ2FtbWEgPiAwKTtcbiAgfVxuXG4gIC8vIHNjYWxlIHBvaW50cyBmcm9tIFtBLCBCXSB0byBbQywgRF1cbiAgLy8geEEgPT4gb2xkIHggbWluLCB4QiA9PiBvbGQgeCBtYXhcbiAgLy8geUEgPT4gb2xkIHkgbWluLCB5QiA9PiBvbGQgeSBtYXhcbiAgLy8geEMgPT4gbmV3IHggbWluLCB4RCA9PiBuZXcgeCBtYXhcbiAgLy8geUMgPT4gbmV3IHkgbWluLCB5RCA9PiBuZXcgeSBtYXhcbiAgcmVzY2FsZVBvaW50cyh4QSwgeEIsIHlBLCB5QiwgeEMsIHhELCB5QywgeUQpIHtcbiAgICB0aGlzLnAxLnJlc2NhbGUoeEEsIHhCLCB5QSwgeUIsIHhDLCB4RCwgeUMsIHlEKTtcbiAgICB0aGlzLnAyLnJlc2NhbGUoeEEsIHhCLCB5QSwgeUIsIHhDLCB4RCwgeUMsIHlEKTtcbiAgICB0aGlzLnAzLnJlc2NhbGUoeEEsIHhCLCB5QSwgeUIsIHhDLCB4RCwgeUMsIHlEKTtcbiAgICAvLyByZWNhbGN1bGF0ZSB0aGUgY2VudHJvaWRcbiAgICB0aGlzLmNlbnRyb2lkKCk7XG4gIH1cblxuICBtYXhYKCkge1xuICAgIHJldHVybiBNYXRoLm1heCh0aGlzLnAxLngsIHRoaXMucDIueCwgdGhpcy5wMy54KTtcbiAgfVxuXG4gIG1heFkoKSB7XG4gICAgcmV0dXJuIE1hdGgubWF4KHRoaXMucDEueSwgdGhpcy5wMi55LCB0aGlzLnAzLnkpO1xuICB9XG5cbiAgbWluWCgpIHtcbiAgICByZXR1cm4gTWF0aC5taW4odGhpcy5wMS54LCB0aGlzLnAyLngsIHRoaXMucDMueCk7XG4gIH1cblxuICBtaW5ZKCkge1xuICAgIHJldHVybiBNYXRoLm1pbih0aGlzLnAxLnksIHRoaXMucDIueSwgdGhpcy5wMy55KTtcbiAgfVxuXG4gIGdldFBvaW50cygpIHtcbiAgICByZXR1cm4gW3RoaXMucDEsIHRoaXMucDIsIHRoaXMucDNdO1xuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gVHJpYW5nbGU7XG4iLCJjb25zdCBQcmV0dHlEZWxhdW5heSAgPSByZXF1aXJlKCcuL1ByZXR0eURlbGF1bmF5Jyk7XG5jb25zdCBDb2xvciAgPSByZXF1aXJlKCcuL1ByZXR0eURlbGF1bmF5L2NvbG9yJyk7XG5jb25zdCBSYW5kb20gPSByZXF1aXJlKCcuL1ByZXR0eURlbGF1bmF5L3JhbmRvbScpO1xuXG4vLyBncmFiIERPTSBlbGVtZW50c1xuY29uc3QgbWFpbiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdtYWluJyk7XG5jb25zdCBmb3JtID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2Zvcm0nKTtcbmNvbnN0IGNhbnZhcyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjYW52YXMnKTtcblxuY29uc3QgZ2VuZXJhdGVCdXR0b24gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZ2VuZXJhdGUnKTtcblxuY29uc3QgZ2VuZXJhdGVDb2xvcnNCdXR0b24gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZ2VuZXJhdGUtY29sb3JzJyk7XG5jb25zdCBnZW5lcmF0ZUdyYWRpZW50QnV0dG9uID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2dlbmVyYXRlLWdyYWRpZW50Jyk7XG5jb25zdCBnZW5lcmF0ZVRyaWFuZ2xlc0J1dHRvbiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdnZW5lcmF0ZS10cmlhbmdsZXMnKTtcblxuY29uc3Qgc2hvd1RyaWFuZ2xlc0lucHV0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3Nob3ctdHJpYW5nbGVzJyk7XG5jb25zdCBzaG93UG9pbnRzSW5wdXQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnc2hvdy1wb2ludHMnKTtcbmNvbnN0IHNob3dDaXJjbGVzSW5wdXQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnc2hvdy1jaXJjbGVzJyk7XG5jb25zdCBzaG93Q2VudHJvaWRzSW5wdXQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnc2hvdy1jZW50cm9pZHMnKTtcbmNvbnN0IHNob3dFZGdlc0lucHV0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3Nob3ctZWRnZXMnKTtcbmNvbnN0IHNob3dIb3ZlcklucHV0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3Nob3ctaG92ZXInKTtcbmNvbnN0IHNob3dBbmltYXRpb25JbnB1dCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdzaG93LWFuaW1hdGlvbicpO1xuXG5jb25zdCBtdWx0aXBsaWVyUmFkaW8gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncG9pbnQtZ2VuLW9wdGlvbi1tdWx0aXBsaWVyJyk7XG5jb25zdCBtdWx0aXBsaWVySW5wdXQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncG9pbnRzLW11bHRpcGxpZXInKTtcbmNvbnN0IG1heElucHV0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ21heC1wb2ludHMnKTtcbmNvbnN0IG1pbklucHV0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ21pbi1wb2ludHMnKTtcbmNvbnN0IG1heEVkZ2VJbnB1dCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdtYXgtZWRnZS1wb2ludHMnKTtcbmNvbnN0IG1pbkVkZ2VJbnB1dCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdtaW4tZWRnZS1wb2ludHMnKTtcbmNvbnN0IG1heEdyYWRpZW50SW5wdXQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbWF4LWdyYWRpZW50cycpO1xuY29uc3QgbWluR3JhZGllbnRJbnB1dCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdtaW4tZ3JhZGllbnRzJyk7XG5cbmNvbnN0IGltYWdlQmFja2dyb3VuZFVwbG9hZCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdpbWFnZS1iYWNrZ3JvdW5kLXVwbG9hZCcpO1xuY29uc3QgaW1hZ2VCYWNrZ3JvdW5kVVJMID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2ltYWdlLWJhY2tncm91bmQtdXJsJyk7XG5cbmxldCByYW5kb21pemVPcHRpb25zID0ge307XG5cbmxldCBtaW5Qb2ludHMsIG1heFBvaW50cywgbWluRWRnZVBvaW50cywgbWF4RWRnZVBvaW50cywgbWluR3JhZGllbnRzLCBtYXhHcmFkaWVudHMsIG11bHRpcGxpZXIsIGNvbG9ycywgaW1hZ2U7XG5cbmxldCBzaG93VHJpYW5nbGVzLCBzaG93UG9pbnRzLCBzaG93Q2lyY2xlcywgc2hvd0NlbnRyb2lkcywgc2hvd0VkZ2VzLCBzaG93QW5pbWF0aW9uO1xuXG5jb25zdCBvcHRpb25zID0ge1xuICBvbkRhcmtCYWNrZ3JvdW5kOiBmdW5jdGlvbigpIHtcbiAgICBtYWluLmNsYXNzTmFtZSA9ICd0aGVtZS1saWdodCc7XG4gIH0sXG4gIG9uTGlnaHRCYWNrZ3JvdW5kOiBmdW5jdGlvbigpIHtcbiAgICBtYWluLmNsYXNzTmFtZSA9ICd0aGVtZS1kYXJrJztcbiAgfSxcbn07XG5cbi8vIGluaXRpYWxpemUgdGhlIFByZXR0eURlbGF1bmF5IG9iamVjdFxubGV0IHByZXR0eURlbGF1bmF5ID0gbmV3IFByZXR0eURlbGF1bmF5KGNhbnZhcywgb3B0aW9ucyk7XG5cbi8vIGluaXRpYWwgZ2VuZXJhdGlvblxucnVuRGVsYXVuYXkoKTtcblxuLyoqXG4gKiB1dGlsIGZ1bmN0aW9uc1xuICovXG5cbi8vIGdldCBvcHRpb25zIGFuZCByZS1yYW5kb21pemVcbmZ1bmN0aW9uIHJ1bkRlbGF1bmF5KCkge1xuICBnZXRSYW5kb21pemVPcHRpb25zKCk7XG4gIHByZXR0eURlbGF1bmF5LnJhbmRvbWl6ZShtaW5Qb2ludHMsIG1heFBvaW50cywgbWluRWRnZVBvaW50cywgbWF4RWRnZVBvaW50cywgbWluR3JhZGllbnRzLCBtYXhHcmFkaWVudHMsIG11bHRpcGxpZXIsIGNvbG9ycywgaW1hZ2UpO1xufVxuXG5mdW5jdGlvbiBnZXRDb2xvcnMoKSB7XG4gIHZhciBjb2xvcnMgPSBbXTtcblxuICBpZiAoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NvbG9yLXR5cGUtMScpLmNoZWNrZWQpIHtcbiAgICAvLyBnZW5lcmF0ZSByYW5kb20gY29sb3JzXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCAzOyBpKyspIHtcbiAgICAgIHZhciBjb2xvciA9IFJhbmRvbS5yYW5kb21Ic2xhKCk7XG4gICAgICBjb2xvcnMucHVzaChjb2xvcik7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIC8vIHVzZSB0aGUgb25lcyBpbiB0aGUgaW5wdXRzXG4gICAgY29sb3JzLnB1c2goQ29sb3IucmdiVG9Ic2xhKENvbG9yLmhleFRvUmdiYUFycmF5KGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjb2xvci0xJykudmFsdWUpKSk7XG4gICAgY29sb3JzLnB1c2goQ29sb3IucmdiVG9Ic2xhKENvbG9yLmhleFRvUmdiYUFycmF5KGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjb2xvci0yJykudmFsdWUpKSk7XG4gICAgY29sb3JzLnB1c2goQ29sb3IucmdiVG9Ic2xhKENvbG9yLmhleFRvUmdiYUFycmF5KGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjb2xvci0zJykudmFsdWUpKSk7XG4gIH1cblxuICByZXR1cm4gY29sb3JzO1xufVxuXG5mdW5jdGlvbiBnZXRJbWFnZSgpIHtcbiAgaWYgKCFkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY29sb3ItdHlwZS0zJykuY2hlY2tlZCkge1xuICAgIHJldHVybiAnJztcbiAgfVxuXG4gIGlmIChkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnaW1hZ2UtYmFja2dyb3VuZC11cGxvYWQtb3B0aW9uJykuY2hlY2tlZCAmJiBpbWFnZUJhY2tncm91bmRVcGxvYWQuZmlsZXMubGVuZ3RoKSB7XG4gICAgbGV0IGZpbGUgPSBpbWFnZUJhY2tncm91bmRVcGxvYWQuZmlsZXNbMF07XG4gICAgcmV0dXJuIHdpbmRvdy5VUkwuY3JlYXRlT2JqZWN0VVJMKGZpbGUpO1xuICB9IGVsc2UgaWYgKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdpbWFnZS1iYWNrZ3JvdW5kLXVybC1vcHRpb24nKS5jaGVja2VkKSB7XG4gICAgcmV0dXJuIGltYWdlQmFja2dyb3VuZFVSTC52YWx1ZTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gJyc7XG4gIH1cbn1cblxuLy8gZ2V0IG9wdGlvbnMgZnJvbSBpbnB1dCBmaWVsZHNcbmZ1bmN0aW9uIGdldFJhbmRvbWl6ZU9wdGlvbnMoKSB7XG4gIHZhciB1c2VNdWx0aXBsaWVyID0gbXVsdGlwbGllclJhZGlvLmNoZWNrZWQ7XG4gIG11bHRpcGxpZXIgPSBwYXJzZUZsb2F0KG11bHRpcGxpZXJJbnB1dC52YWx1ZSk7XG4gIG1pblBvaW50cyA9IHVzZU11bHRpcGxpZXIgPyAwIDogcGFyc2VJbnQobWluSW5wdXQudmFsdWUpO1xuICBtYXhQb2ludHMgPSB1c2VNdWx0aXBsaWVyID8gMCA6IHBhcnNlSW50KG1heElucHV0LnZhbHVlKTtcbiAgbWluRWRnZVBvaW50cyA9IHVzZU11bHRpcGxpZXIgPyAwIDogcGFyc2VJbnQobWluRWRnZUlucHV0LnZhbHVlKTtcbiAgbWF4RWRnZVBvaW50cyA9IHVzZU11bHRpcGxpZXIgPyAwIDogcGFyc2VJbnQobWF4RWRnZUlucHV0LnZhbHVlKTtcbiAgbWluR3JhZGllbnRzID0gcGFyc2VJbnQobWluR3JhZGllbnRJbnB1dC52YWx1ZSk7XG4gIG1heEdyYWRpZW50cyA9IHBhcnNlSW50KG1heEdyYWRpZW50SW5wdXQudmFsdWUpO1xuICBjb2xvcnMgPSBnZXRDb2xvcnMoKTtcbiAgaW1hZ2UgPSBnZXRJbWFnZSgpO1xufVxuXG4vKipcbiAqIHNldCB1cCBldmVudHNcbiAqL1xuXG4vLyBjbGljayB0aGUgYnV0dG9uIHRvIHJlZ2VuXG5nZW5lcmF0ZUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuICBydW5EZWxhdW5heSgpO1xufSk7XG5cbi8vIGNsaWNrIHRoZSBidXR0b24gdG8gcmVnZW4gY29sb3JzIG9ubHlcbmdlbmVyYXRlQ29sb3JzQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG4gIHZhciBuZXdDb2xvcnMgPSBnZXRDb2xvcnMoKTtcbiAgcHJldHR5RGVsYXVuYXkucmVuZGVyTmV3Q29sb3JzKG5ld0NvbG9ycyk7XG59KTtcblxuLy8gY2xpY2sgdGhlIGJ1dHRvbiB0byByZWdlbiBjb2xvcnMgb25seVxuZ2VuZXJhdGVHcmFkaWVudEJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuICBnZXRSYW5kb21pemVPcHRpb25zKCk7XG4gIHByZXR0eURlbGF1bmF5LnJlbmRlck5ld0dyYWRpZW50KG1pbkdyYWRpZW50cywgbWF4R3JhZGllbnRzKTtcbn0pO1xuXG4vLyBjbGljayB0aGUgYnV0dG9uIHRvIHJlZ2VuIGNvbG9ycyBvbmx5XG5nZW5lcmF0ZVRyaWFuZ2xlc0J1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuICBnZXRSYW5kb21pemVPcHRpb25zKCk7XG4gIHByZXR0eURlbGF1bmF5LnJlbmRlck5ld1RyaWFuZ2xlcyhtaW5Qb2ludHMsIG1heFBvaW50cywgbWluRWRnZVBvaW50cywgbWF4RWRnZVBvaW50cywgbXVsdGlwbGllcik7XG59KTtcblxuLy8gdHVybiBUcmlhbmdsZXMgb2ZmL29uXG5zaG93VHJpYW5nbGVzSW5wdXQuYWRkRXZlbnRMaXN0ZW5lcignY2hhbmdlJywgZnVuY3Rpb24oZXZlbnQpIHtcbiAgaWYgKGV2ZW50LnRhcmdldC5jaGVja2VkICE9PSBzaG93VHJpYW5nbGVzKSB7XG4gICAgc2hvd1RyaWFuZ2xlcyA9ICFzaG93VHJpYW5nbGVzO1xuICAgIHByZXR0eURlbGF1bmF5LnRvZ2dsZVRyaWFuZ2xlcygpO1xuICB9XG59KTtcblxuLy8gdHVybiBQb2ludHMgb2ZmL29uXG5zaG93UG9pbnRzSW5wdXQuYWRkRXZlbnRMaXN0ZW5lcignY2hhbmdlJywgZnVuY3Rpb24oZXZlbnQpIHtcbiAgaWYgKGV2ZW50LnRhcmdldC5jaGVja2VkICE9PSBzaG93UG9pbnRzKSB7XG4gICAgc2hvd1BvaW50cyA9ICFzaG93UG9pbnRzO1xuICAgIHByZXR0eURlbGF1bmF5LnRvZ2dsZVBvaW50cygpO1xuICB9XG59KTtcblxuLy8gdHVybiBDaXJjbGVzIG9mZi9vblxuc2hvd0NpcmNsZXNJbnB1dC5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCBmdW5jdGlvbihldmVudCkge1xuICBpZiAoZXZlbnQudGFyZ2V0LmNoZWNrZWQgIT09IHNob3dDaXJjbGVzKSB7XG4gICAgc2hvd0NpcmNsZXMgPSAhc2hvd0NpcmNsZXM7XG4gICAgcHJldHR5RGVsYXVuYXkudG9nZ2xlQ2lyY2xlcygpO1xuICB9XG59KTtcblxuLy8gdHVybiBDZW50cm9pZHMgb2ZmL29uXG5zaG93Q2VudHJvaWRzSW5wdXQuYWRkRXZlbnRMaXN0ZW5lcignY2hhbmdlJywgZnVuY3Rpb24oZXZlbnQpIHtcbiAgaWYgKGV2ZW50LnRhcmdldC5jaGVja2VkICE9PSBzaG93Q2VudHJvaWRzKSB7XG4gICAgc2hvd0NlbnRyb2lkcyA9ICFzaG93Q2VudHJvaWRzO1xuICAgIHByZXR0eURlbGF1bmF5LnRvZ2dsZUNlbnRyb2lkcygpO1xuICB9XG59KTtcblxuLy8gdHVybiBFZGdlcyBvZmYvb25cbnNob3dFZGdlc0lucHV0LmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsIGZ1bmN0aW9uKGV2ZW50KSB7XG4gIGlmIChldmVudC50YXJnZXQuY2hlY2tlZCAhPT0gc2hvd0VkZ2VzKSB7XG4gICAgc2hvd0VkZ2VzID0gIXNob3dFZGdlcztcbiAgICBwcmV0dHlEZWxhdW5heS50b2dnbGVFZGdlcygpO1xuICB9XG59KTtcblxuLy8gdHVybiBBbmltYXRpb24gb2ZmL29uXG5zaG93QW5pbWF0aW9uSW5wdXQuYWRkRXZlbnRMaXN0ZW5lcignY2hhbmdlJywgZnVuY3Rpb24oZXZlbnQpIHtcbiAgaWYgKGV2ZW50LnRhcmdldC5jaGVja2VkICE9PSBzaG93QW5pbWF0aW9uKSB7XG4gICAgc2hvd0FuaW1hdGlvbiA9ICFzaG93QW5pbWF0aW9uO1xuICAgIHByZXR0eURlbGF1bmF5LnRvZ2dsZUFuaW1hdGlvbigpO1xuICB9XG59KTtcblxuLy8gZG9udCBkbyBhbnl0aGluZyBvbiBmb3JtIHN1Ym1pdFxuZm9ybS5hZGRFdmVudExpc3RlbmVyKCdzdWJtaXQnLCBmdW5jdGlvbihlKSB7XG4gIGUucHJldmVudERlZmF1bHQoKTtcbiAgcmV0dXJuIGZhbHNlO1xufSk7XG4iXX0=
