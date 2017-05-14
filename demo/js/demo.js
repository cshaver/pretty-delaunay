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
          }
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvZGVsYXVuYXktZmFzdC9kZWxhdW5heS5qcyIsInNyYy9QcmV0dHlEZWxhdW5heS5qcyIsInNyYy9QcmV0dHlEZWxhdW5heS9jb2xvci5qcyIsInNyYy9QcmV0dHlEZWxhdW5heS9wb2ludC5qcyIsInNyYy9QcmV0dHlEZWxhdW5heS9wb2ludE1hcC5qcyIsInNyYy9QcmV0dHlEZWxhdW5heS9wb2x5ZmlsbHMuanMiLCJzcmMvUHJldHR5RGVsYXVuYXkvcmFuZG9tLmpzIiwic3JjL1ByZXR0eURlbGF1bmF5L3RyaWFuZ2xlLmpzIiwic3JjL2RlbW8uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FB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QW9CLGdCQUFwQixDQUFxQyxPQUFyQyxFQUE4QyxZQUFXO0FBQ3ZELGtCQUFjLENBQUMsV0FBZjtBQUNBLFlBQVEsT0FBUixDQUFnQixxQkFBaEIsRUFBdUMsV0FBdkM7QUFDQSxtQkFBZSxhQUFmO0FBQ0QsR0FKRDs7QUFNQTtBQUNBLHdCQUFzQixnQkFBdEIsQ0FBdUMsT0FBdkMsRUFBZ0QsWUFBVztBQUN6RCxvQkFBZ0IsQ0FBQyxhQUFqQjtBQUNBLFlBQVEsT0FBUixDQUFnQix1QkFBaEIsRUFBeUMsYUFBekM7QUFDQSxtQkFBZSxlQUFmO0FBQ0QsR0FKRDs7QUFNQTtBQUNBLG9CQUFrQixnQkFBbEIsQ0FBbUMsT0FBbkMsRUFBNEMsWUFBVztBQUNyRCxnQkFBWSxDQUFDLFNBQWI7QUFDQSxZQUFRLE9BQVIsQ0FBZ0IsbUJBQWhCLEVBQXFDLFNBQXJDO0FBQ0EsbUJBQWUsV0FBZjtBQUNELEdBSkQ7O0FBTUE7QUFDQSx3QkFBc0IsZ0JBQXRCLENBQXVDLE9BQXZDLEVBQWdELFlBQVc7QUFDekQsb0JBQWdCLENBQUMsYUFBakI7QUFDQSxZQUFRLE9BQVIsQ0FBZ0IsdUJBQWhCLEVBQXlDLGFBQXpDO0FBQ0EsbUJBQWUsZUFBZjtBQUNELEdBSkQ7O0FBTUE7QUFDQSxPQUFLLGdCQUFMLENBQXNCLFFBQXRCLEVBQWdDLFVBQVMsQ0FBVCxFQUFZO0FBQzFDLE1BQUUsY0FBRjtBQUNBLFdBQU8sS0FBUDtBQUNELEdBSEQ7QUFJRCxDQWhURCIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgRGVsYXVuYXk7XG5cbihmdW5jdGlvbigpIHtcbiAgXCJ1c2Ugc3RyaWN0XCI7XG5cbiAgdmFyIEVQU0lMT04gPSAxLjAgLyAxMDQ4NTc2LjA7XG5cbiAgZnVuY3Rpb24gc3VwZXJ0cmlhbmdsZSh2ZXJ0aWNlcykge1xuICAgIHZhciB4bWluID0gTnVtYmVyLlBPU0lUSVZFX0lORklOSVRZLFxuICAgICAgICB5bWluID0gTnVtYmVyLlBPU0lUSVZFX0lORklOSVRZLFxuICAgICAgICB4bWF4ID0gTnVtYmVyLk5FR0FUSVZFX0lORklOSVRZLFxuICAgICAgICB5bWF4ID0gTnVtYmVyLk5FR0FUSVZFX0lORklOSVRZLFxuICAgICAgICBpLCBkeCwgZHksIGRtYXgsIHhtaWQsIHltaWQ7XG5cbiAgICBmb3IoaSA9IHZlcnRpY2VzLmxlbmd0aDsgaS0tOyApIHtcbiAgICAgIGlmKHZlcnRpY2VzW2ldWzBdIDwgeG1pbikgeG1pbiA9IHZlcnRpY2VzW2ldWzBdO1xuICAgICAgaWYodmVydGljZXNbaV1bMF0gPiB4bWF4KSB4bWF4ID0gdmVydGljZXNbaV1bMF07XG4gICAgICBpZih2ZXJ0aWNlc1tpXVsxXSA8IHltaW4pIHltaW4gPSB2ZXJ0aWNlc1tpXVsxXTtcbiAgICAgIGlmKHZlcnRpY2VzW2ldWzFdID4geW1heCkgeW1heCA9IHZlcnRpY2VzW2ldWzFdO1xuICAgIH1cblxuICAgIGR4ID0geG1heCAtIHhtaW47XG4gICAgZHkgPSB5bWF4IC0geW1pbjtcbiAgICBkbWF4ID0gTWF0aC5tYXgoZHgsIGR5KTtcbiAgICB4bWlkID0geG1pbiArIGR4ICogMC41O1xuICAgIHltaWQgPSB5bWluICsgZHkgKiAwLjU7XG5cbiAgICByZXR1cm4gW1xuICAgICAgW3htaWQgLSAyMCAqIGRtYXgsIHltaWQgLSAgICAgIGRtYXhdLFxuICAgICAgW3htaWQgICAgICAgICAgICAsIHltaWQgKyAyMCAqIGRtYXhdLFxuICAgICAgW3htaWQgKyAyMCAqIGRtYXgsIHltaWQgLSAgICAgIGRtYXhdXG4gICAgXTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNpcmN1bWNpcmNsZSh2ZXJ0aWNlcywgaSwgaiwgaykge1xuICAgIHZhciB4MSA9IHZlcnRpY2VzW2ldWzBdLFxuICAgICAgICB5MSA9IHZlcnRpY2VzW2ldWzFdLFxuICAgICAgICB4MiA9IHZlcnRpY2VzW2pdWzBdLFxuICAgICAgICB5MiA9IHZlcnRpY2VzW2pdWzFdLFxuICAgICAgICB4MyA9IHZlcnRpY2VzW2tdWzBdLFxuICAgICAgICB5MyA9IHZlcnRpY2VzW2tdWzFdLFxuICAgICAgICBmYWJzeTF5MiA9IE1hdGguYWJzKHkxIC0geTIpLFxuICAgICAgICBmYWJzeTJ5MyA9IE1hdGguYWJzKHkyIC0geTMpLFxuICAgICAgICB4YywgeWMsIG0xLCBtMiwgbXgxLCBteDIsIG15MSwgbXkyLCBkeCwgZHk7XG5cbiAgICAvKiBDaGVjayBmb3IgY29pbmNpZGVudCBwb2ludHMgKi9cbiAgICBpZihmYWJzeTF5MiA8IEVQU0lMT04gJiYgZmFic3kyeTMgPCBFUFNJTE9OKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRWVrISBDb2luY2lkZW50IHBvaW50cyFcIik7XG5cbiAgICBpZihmYWJzeTF5MiA8IEVQU0lMT04pIHtcbiAgICAgIG0yICA9IC0oKHgzIC0geDIpIC8gKHkzIC0geTIpKTtcbiAgICAgIG14MiA9ICh4MiArIHgzKSAvIDIuMDtcbiAgICAgIG15MiA9ICh5MiArIHkzKSAvIDIuMDtcbiAgICAgIHhjICA9ICh4MiArIHgxKSAvIDIuMDtcbiAgICAgIHljICA9IG0yICogKHhjIC0gbXgyKSArIG15MjtcbiAgICB9XG5cbiAgICBlbHNlIGlmKGZhYnN5MnkzIDwgRVBTSUxPTikge1xuICAgICAgbTEgID0gLSgoeDIgLSB4MSkgLyAoeTIgLSB5MSkpO1xuICAgICAgbXgxID0gKHgxICsgeDIpIC8gMi4wO1xuICAgICAgbXkxID0gKHkxICsgeTIpIC8gMi4wO1xuICAgICAgeGMgID0gKHgzICsgeDIpIC8gMi4wO1xuICAgICAgeWMgID0gbTEgKiAoeGMgLSBteDEpICsgbXkxO1xuICAgIH1cblxuICAgIGVsc2Uge1xuICAgICAgbTEgID0gLSgoeDIgLSB4MSkgLyAoeTIgLSB5MSkpO1xuICAgICAgbTIgID0gLSgoeDMgLSB4MikgLyAoeTMgLSB5MikpO1xuICAgICAgbXgxID0gKHgxICsgeDIpIC8gMi4wO1xuICAgICAgbXgyID0gKHgyICsgeDMpIC8gMi4wO1xuICAgICAgbXkxID0gKHkxICsgeTIpIC8gMi4wO1xuICAgICAgbXkyID0gKHkyICsgeTMpIC8gMi4wO1xuICAgICAgeGMgID0gKG0xICogbXgxIC0gbTIgKiBteDIgKyBteTIgLSBteTEpIC8gKG0xIC0gbTIpO1xuICAgICAgeWMgID0gKGZhYnN5MXkyID4gZmFic3kyeTMpID9cbiAgICAgICAgbTEgKiAoeGMgLSBteDEpICsgbXkxIDpcbiAgICAgICAgbTIgKiAoeGMgLSBteDIpICsgbXkyO1xuICAgIH1cblxuICAgIGR4ID0geDIgLSB4YztcbiAgICBkeSA9IHkyIC0geWM7XG4gICAgcmV0dXJuIHtpOiBpLCBqOiBqLCBrOiBrLCB4OiB4YywgeTogeWMsIHI6IGR4ICogZHggKyBkeSAqIGR5fTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGRlZHVwKGVkZ2VzKSB7XG4gICAgdmFyIGksIGosIGEsIGIsIG0sIG47XG5cbiAgICBmb3IoaiA9IGVkZ2VzLmxlbmd0aDsgajsgKSB7XG4gICAgICBiID0gZWRnZXNbLS1qXTtcbiAgICAgIGEgPSBlZGdlc1stLWpdO1xuXG4gICAgICBmb3IoaSA9IGo7IGk7ICkge1xuICAgICAgICBuID0gZWRnZXNbLS1pXTtcbiAgICAgICAgbSA9IGVkZ2VzWy0taV07XG5cbiAgICAgICAgaWYoKGEgPT09IG0gJiYgYiA9PT0gbikgfHwgKGEgPT09IG4gJiYgYiA9PT0gbSkpIHtcbiAgICAgICAgICBlZGdlcy5zcGxpY2UoaiwgMik7XG4gICAgICAgICAgZWRnZXMuc3BsaWNlKGksIDIpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgRGVsYXVuYXkgPSB7XG4gICAgdHJpYW5ndWxhdGU6IGZ1bmN0aW9uKHZlcnRpY2VzLCBrZXkpIHtcbiAgICAgIHZhciBuID0gdmVydGljZXMubGVuZ3RoLFxuICAgICAgICAgIGksIGosIGluZGljZXMsIHN0LCBvcGVuLCBjbG9zZWQsIGVkZ2VzLCBkeCwgZHksIGEsIGIsIGM7XG5cbiAgICAgIC8qIEJhaWwgaWYgdGhlcmUgYXJlbid0IGVub3VnaCB2ZXJ0aWNlcyB0byBmb3JtIGFueSB0cmlhbmdsZXMuICovXG4gICAgICBpZihuIDwgMylcbiAgICAgICAgcmV0dXJuIFtdO1xuXG4gICAgICAvKiBTbGljZSBvdXQgdGhlIGFjdHVhbCB2ZXJ0aWNlcyBmcm9tIHRoZSBwYXNzZWQgb2JqZWN0cy4gKER1cGxpY2F0ZSB0aGVcbiAgICAgICAqIGFycmF5IGV2ZW4gaWYgd2UgZG9uJ3QsIHRob3VnaCwgc2luY2Ugd2UgbmVlZCB0byBtYWtlIGEgc3VwZXJ0cmlhbmdsZVxuICAgICAgICogbGF0ZXIgb24hKSAqL1xuICAgICAgdmVydGljZXMgPSB2ZXJ0aWNlcy5zbGljZSgwKTtcblxuICAgICAgaWYoa2V5KVxuICAgICAgICBmb3IoaSA9IG47IGktLTsgKVxuICAgICAgICAgIHZlcnRpY2VzW2ldID0gdmVydGljZXNbaV1ba2V5XTtcblxuICAgICAgLyogTWFrZSBhbiBhcnJheSBvZiBpbmRpY2VzIGludG8gdGhlIHZlcnRleCBhcnJheSwgc29ydGVkIGJ5IHRoZVxuICAgICAgICogdmVydGljZXMnIHgtcG9zaXRpb24uICovXG4gICAgICBpbmRpY2VzID0gbmV3IEFycmF5KG4pO1xuXG4gICAgICBmb3IoaSA9IG47IGktLTsgKVxuICAgICAgICBpbmRpY2VzW2ldID0gaTtcblxuICAgICAgaW5kaWNlcy5zb3J0KGZ1bmN0aW9uKGksIGopIHtcbiAgICAgICAgcmV0dXJuIHZlcnRpY2VzW2pdWzBdIC0gdmVydGljZXNbaV1bMF07XG4gICAgICB9KTtcblxuICAgICAgLyogTmV4dCwgZmluZCB0aGUgdmVydGljZXMgb2YgdGhlIHN1cGVydHJpYW5nbGUgKHdoaWNoIGNvbnRhaW5zIGFsbCBvdGhlclxuICAgICAgICogdHJpYW5nbGVzKSwgYW5kIGFwcGVuZCB0aGVtIG9udG8gdGhlIGVuZCBvZiBhIChjb3B5IG9mKSB0aGUgdmVydGV4XG4gICAgICAgKiBhcnJheS4gKi9cbiAgICAgIHN0ID0gc3VwZXJ0cmlhbmdsZSh2ZXJ0aWNlcyk7XG4gICAgICB2ZXJ0aWNlcy5wdXNoKHN0WzBdLCBzdFsxXSwgc3RbMl0pO1xuICAgICAgXG4gICAgICAvKiBJbml0aWFsaXplIHRoZSBvcGVuIGxpc3QgKGNvbnRhaW5pbmcgdGhlIHN1cGVydHJpYW5nbGUgYW5kIG5vdGhpbmdcbiAgICAgICAqIGVsc2UpIGFuZCB0aGUgY2xvc2VkIGxpc3QgKHdoaWNoIGlzIGVtcHR5IHNpbmNlIHdlIGhhdm4ndCBwcm9jZXNzZWRcbiAgICAgICAqIGFueSB0cmlhbmdsZXMgeWV0KS4gKi9cbiAgICAgIG9wZW4gICA9IFtjaXJjdW1jaXJjbGUodmVydGljZXMsIG4gKyAwLCBuICsgMSwgbiArIDIpXTtcbiAgICAgIGNsb3NlZCA9IFtdO1xuICAgICAgZWRnZXMgID0gW107XG5cbiAgICAgIC8qIEluY3JlbWVudGFsbHkgYWRkIGVhY2ggdmVydGV4IHRvIHRoZSBtZXNoLiAqL1xuICAgICAgZm9yKGkgPSBpbmRpY2VzLmxlbmd0aDsgaS0tOyBlZGdlcy5sZW5ndGggPSAwKSB7XG4gICAgICAgIGMgPSBpbmRpY2VzW2ldO1xuXG4gICAgICAgIC8qIEZvciBlYWNoIG9wZW4gdHJpYW5nbGUsIGNoZWNrIHRvIHNlZSBpZiB0aGUgY3VycmVudCBwb2ludCBpc1xuICAgICAgICAgKiBpbnNpZGUgaXQncyBjaXJjdW1jaXJjbGUuIElmIGl0IGlzLCByZW1vdmUgdGhlIHRyaWFuZ2xlIGFuZCBhZGRcbiAgICAgICAgICogaXQncyBlZGdlcyB0byBhbiBlZGdlIGxpc3QuICovXG4gICAgICAgIGZvcihqID0gb3Blbi5sZW5ndGg7IGotLTsgKSB7XG4gICAgICAgICAgLyogSWYgdGhpcyBwb2ludCBpcyB0byB0aGUgcmlnaHQgb2YgdGhpcyB0cmlhbmdsZSdzIGNpcmN1bWNpcmNsZSxcbiAgICAgICAgICAgKiB0aGVuIHRoaXMgdHJpYW5nbGUgc2hvdWxkIG5ldmVyIGdldCBjaGVja2VkIGFnYWluLiBSZW1vdmUgaXRcbiAgICAgICAgICAgKiBmcm9tIHRoZSBvcGVuIGxpc3QsIGFkZCBpdCB0byB0aGUgY2xvc2VkIGxpc3QsIGFuZCBza2lwLiAqL1xuICAgICAgICAgIGR4ID0gdmVydGljZXNbY11bMF0gLSBvcGVuW2pdLng7XG4gICAgICAgICAgaWYoZHggPiAwLjAgJiYgZHggKiBkeCA+IG9wZW5bal0ucikge1xuICAgICAgICAgICAgY2xvc2VkLnB1c2gob3BlbltqXSk7XG4gICAgICAgICAgICBvcGVuLnNwbGljZShqLCAxKTtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIC8qIElmIHdlJ3JlIG91dHNpZGUgdGhlIGNpcmN1bWNpcmNsZSwgc2tpcCB0aGlzIHRyaWFuZ2xlLiAqL1xuICAgICAgICAgIGR5ID0gdmVydGljZXNbY11bMV0gLSBvcGVuW2pdLnk7XG4gICAgICAgICAgaWYoZHggKiBkeCArIGR5ICogZHkgLSBvcGVuW2pdLnIgPiBFUFNJTE9OKVxuICAgICAgICAgICAgY29udGludWU7XG5cbiAgICAgICAgICAvKiBSZW1vdmUgdGhlIHRyaWFuZ2xlIGFuZCBhZGQgaXQncyBlZGdlcyB0byB0aGUgZWRnZSBsaXN0LiAqL1xuICAgICAgICAgIGVkZ2VzLnB1c2goXG4gICAgICAgICAgICBvcGVuW2pdLmksIG9wZW5bal0uaixcbiAgICAgICAgICAgIG9wZW5bal0uaiwgb3BlbltqXS5rLFxuICAgICAgICAgICAgb3BlbltqXS5rLCBvcGVuW2pdLmlcbiAgICAgICAgICApO1xuICAgICAgICAgIG9wZW4uc3BsaWNlKGosIDEpO1xuICAgICAgICB9XG5cbiAgICAgICAgLyogUmVtb3ZlIGFueSBkb3VibGVkIGVkZ2VzLiAqL1xuICAgICAgICBkZWR1cChlZGdlcyk7XG5cbiAgICAgICAgLyogQWRkIGEgbmV3IHRyaWFuZ2xlIGZvciBlYWNoIGVkZ2UuICovXG4gICAgICAgIGZvcihqID0gZWRnZXMubGVuZ3RoOyBqOyApIHtcbiAgICAgICAgICBiID0gZWRnZXNbLS1qXTtcbiAgICAgICAgICBhID0gZWRnZXNbLS1qXTtcbiAgICAgICAgICBvcGVuLnB1c2goY2lyY3VtY2lyY2xlKHZlcnRpY2VzLCBhLCBiLCBjKSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLyogQ29weSBhbnkgcmVtYWluaW5nIG9wZW4gdHJpYW5nbGVzIHRvIHRoZSBjbG9zZWQgbGlzdCwgYW5kIHRoZW5cbiAgICAgICAqIHJlbW92ZSBhbnkgdHJpYW5nbGVzIHRoYXQgc2hhcmUgYSB2ZXJ0ZXggd2l0aCB0aGUgc3VwZXJ0cmlhbmdsZSxcbiAgICAgICAqIGJ1aWxkaW5nIGEgbGlzdCBvZiB0cmlwbGV0cyB0aGF0IHJlcHJlc2VudCB0cmlhbmdsZXMuICovXG4gICAgICBmb3IoaSA9IG9wZW4ubGVuZ3RoOyBpLS07IClcbiAgICAgICAgY2xvc2VkLnB1c2gob3BlbltpXSk7XG4gICAgICBvcGVuLmxlbmd0aCA9IDA7XG5cbiAgICAgIGZvcihpID0gY2xvc2VkLmxlbmd0aDsgaS0tOyApXG4gICAgICAgIGlmKGNsb3NlZFtpXS5pIDwgbiAmJiBjbG9zZWRbaV0uaiA8IG4gJiYgY2xvc2VkW2ldLmsgPCBuKVxuICAgICAgICAgIG9wZW4ucHVzaChjbG9zZWRbaV0uaSwgY2xvc2VkW2ldLmosIGNsb3NlZFtpXS5rKTtcblxuICAgICAgLyogWWF5LCB3ZSdyZSBkb25lISAqL1xuICAgICAgcmV0dXJuIG9wZW47XG4gICAgfSxcbiAgICBjb250YWluczogZnVuY3Rpb24odHJpLCBwKSB7XG4gICAgICAvKiBCb3VuZGluZyBib3ggdGVzdCBmaXJzdCwgZm9yIHF1aWNrIHJlamVjdGlvbnMuICovXG4gICAgICBpZigocFswXSA8IHRyaVswXVswXSAmJiBwWzBdIDwgdHJpWzFdWzBdICYmIHBbMF0gPCB0cmlbMl1bMF0pIHx8XG4gICAgICAgICAocFswXSA+IHRyaVswXVswXSAmJiBwWzBdID4gdHJpWzFdWzBdICYmIHBbMF0gPiB0cmlbMl1bMF0pIHx8XG4gICAgICAgICAocFsxXSA8IHRyaVswXVsxXSAmJiBwWzFdIDwgdHJpWzFdWzFdICYmIHBbMV0gPCB0cmlbMl1bMV0pIHx8XG4gICAgICAgICAocFsxXSA+IHRyaVswXVsxXSAmJiBwWzFdID4gdHJpWzFdWzFdICYmIHBbMV0gPiB0cmlbMl1bMV0pKVxuICAgICAgICByZXR1cm4gbnVsbDtcblxuICAgICAgdmFyIGEgPSB0cmlbMV1bMF0gLSB0cmlbMF1bMF0sXG4gICAgICAgICAgYiA9IHRyaVsyXVswXSAtIHRyaVswXVswXSxcbiAgICAgICAgICBjID0gdHJpWzFdWzFdIC0gdHJpWzBdWzFdLFxuICAgICAgICAgIGQgPSB0cmlbMl1bMV0gLSB0cmlbMF1bMV0sXG4gICAgICAgICAgaSA9IGEgKiBkIC0gYiAqIGM7XG5cbiAgICAgIC8qIERlZ2VuZXJhdGUgdHJpLiAqL1xuICAgICAgaWYoaSA9PT0gMC4wKVxuICAgICAgICByZXR1cm4gbnVsbDtcblxuICAgICAgdmFyIHUgPSAoZCAqIChwWzBdIC0gdHJpWzBdWzBdKSAtIGIgKiAocFsxXSAtIHRyaVswXVsxXSkpIC8gaSxcbiAgICAgICAgICB2ID0gKGEgKiAocFsxXSAtIHRyaVswXVsxXSkgLSBjICogKHBbMF0gLSB0cmlbMF1bMF0pKSAvIGk7XG5cbiAgICAgIC8qIElmIHdlJ3JlIG91dHNpZGUgdGhlIHRyaSwgZmFpbC4gKi9cbiAgICAgIGlmKHUgPCAwLjAgfHwgdiA8IDAuMCB8fCAodSArIHYpID4gMS4wKVxuICAgICAgICByZXR1cm4gbnVsbDtcblxuICAgICAgcmV0dXJuIFt1LCB2XTtcbiAgICB9XG4gIH07XG5cbiAgaWYodHlwZW9mIG1vZHVsZSAhPT0gXCJ1bmRlZmluZWRcIilcbiAgICBtb2R1bGUuZXhwb3J0cyA9IERlbGF1bmF5O1xufSkoKTtcbiIsInZhciBEZWxhdW5heSA9IHJlcXVpcmUoJ2RlbGF1bmF5LWZhc3QnKTtcbnZhciBDb2xvciA9IHJlcXVpcmUoJy4vUHJldHR5RGVsYXVuYXkvY29sb3InKTtcbnZhciBSYW5kb20gPSByZXF1aXJlKCcuL1ByZXR0eURlbGF1bmF5L3JhbmRvbScpO1xudmFyIFRyaWFuZ2xlID0gcmVxdWlyZSgnLi9QcmV0dHlEZWxhdW5heS90cmlhbmdsZScpO1xudmFyIFBvaW50ID0gcmVxdWlyZSgnLi9QcmV0dHlEZWxhdW5heS9wb2ludCcpO1xudmFyIFBvaW50TWFwID0gcmVxdWlyZSgnLi9QcmV0dHlEZWxhdW5heS9wb2ludE1hcCcpO1xuXG5yZXF1aXJlKCcuL1ByZXR0eURlbGF1bmF5L3BvbHlmaWxscycpKCk7XG5cbi8qKlxuKiBSZXByZXNlbnRzIGEgZGVsYXVuZXkgdHJpYW5ndWxhdGlvbiBvZiByYW5kb20gcG9pbnRzXG4qIGh0dHBzOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0RlbGF1bmF5X3RyaWFuZ3VsYXRpb25cbiovXG5jbGFzcyBQcmV0dHlEZWxhdW5heSB7XG4vKipcbiAqIEBjb25zdHJ1Y3RvclxuICovXG5jb25zdHJ1Y3RvcihjYW52YXMsIG9wdGlvbnMpIHtcbiAgLy8gbWVyZ2UgZ2l2ZW4gb3B0aW9ucyB3aXRoIGRlZmF1bHRzXG4gIGxldCBkZWZhdWx0cyA9IFByZXR0eURlbGF1bmF5LmRlZmF1bHRzKCk7XG4gIHRoaXMub3B0aW9ucyA9IE9iamVjdC5hc3NpZ24oe30sIFByZXR0eURlbGF1bmF5LmRlZmF1bHRzKCksIChvcHRpb25zIHx8IHt9KSk7XG4gIHRoaXMub3B0aW9ucy5ncmFkaWVudCA9IE9iamVjdC5hc3NpZ24oe30sIGRlZmF1bHRzLmdyYWRpZW50LCBvcHRpb25zLmdyYWRpZW50IHx8IHt9KVxuXG4gIHRoaXMuY2FudmFzID0gY2FudmFzO1xuICB0aGlzLmN0eCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuXG4gIHRoaXMucmVzaXplQ2FudmFzKCk7XG4gIHRoaXMucG9pbnRzID0gW107XG4gIHRoaXMuY29sb3JzID0gdGhpcy5vcHRpb25zLmNvbG9ycztcbiAgdGhpcy5wb2ludE1hcCA9IG5ldyBQb2ludE1hcCgpO1xuXG4gIHRoaXMubW91c2VQb3NpdGlvbiA9IGZhbHNlO1xuXG4gIGlmICh0aGlzLm9wdGlvbnMuaG92ZXIpIHtcbiAgICB0aGlzLmNyZWF0ZUhvdmVyU2hhZG93Q2FudmFzKCk7XG5cbiAgICB0aGlzLmNhbnZhcy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCAoZSkgPT4ge1xuICAgICAgaWYgKCF0aGlzLm9wdGlvbnMuYW5pbWF0ZSkge1xuICAgICAgICB2YXIgcmVjdCA9IGNhbnZhcy5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICAgICAgdGhpcy5tb3VzZVBvc2l0aW9uID0gbmV3IFBvaW50KGUuY2xpZW50WCAtIHJlY3QubGVmdCwgZS5jbGllbnRZIC0gcmVjdC50b3ApO1xuICAgICAgICB0aGlzLmhvdmVyKCk7XG4gICAgICB9XG4gICAgfSwgZmFsc2UpO1xuXG4gICAgdGhpcy5jYW52YXMuYWRkRXZlbnRMaXN0ZW5lcignbW91c2VvdXQnLCAoKSA9PiB7XG4gICAgICBpZiAoIXRoaXMub3B0aW9ucy5hbmltYXRlKSB7XG4gICAgICAgIHRoaXMubW91c2VQb3NpdGlvbiA9IGZhbHNlO1xuICAgICAgICB0aGlzLmhvdmVyKCk7XG4gICAgICB9XG4gICAgfSwgZmFsc2UpO1xuICB9XG5cbiAgLy8gdGhyb3R0bGVkIHdpbmRvdyByZXNpemVcbiAgdGhpcy5yZXNpemluZyA9IGZhbHNlO1xuICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncmVzaXplJywgKCk9PiB7XG4gICAgaWYgKHRoaXMucmVzaXppbmcpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5yZXNpemluZyA9IHRydWU7XG4gICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpPT4ge1xuICAgICAgdGhpcy5yZXNjYWxlKCk7XG4gICAgICB0aGlzLnJlc2l6aW5nID0gZmFsc2U7XG4gICAgfSk7XG4gIH0pO1xuXG4gIHRoaXMucmFuZG9taXplKCk7XG59XG5cbnN0YXRpYyBkZWZhdWx0cygpIHtcbiAgcmV0dXJuIHtcbiAgICAvLyBzaG93cyB0cmlhbmdsZXMgLSBmYWxzZSB3aWxsIHNob3cgdGhlIGdyYWRpZW50IGJlaGluZFxuICAgIHNob3dUcmlhbmdsZXM6IHRydWUsXG4gICAgLy8gc2hvdyB0aGUgcG9pbnRzIHRoYXQgbWFrZSB0aGUgdHJpYW5ndWxhdGlvblxuICAgIHNob3dQb2ludHM6IGZhbHNlLFxuICAgIC8vIHNob3cgdGhlIGNpcmNsZXMgdGhhdCBkZWZpbmUgdGhlIGdyYWRpZW50IGxvY2F0aW9ucywgc2l6ZXNcbiAgICBzaG93Q2lyY2xlczogZmFsc2UsXG4gICAgLy8gc2hvdyB0cmlhbmdsZSBjZW50cm9pZHNcbiAgICBzaG93Q2VudHJvaWRzOiBmYWxzZSxcbiAgICAvLyBzaG93IHRyaWFuZ2xlIGVkZ2VzXG4gICAgc2hvd0VkZ2VzOiB0cnVlLFxuICAgIC8vIGhpZ2hsaWdodCBob3ZlcmVkIHRyaWFuZ2xlc1xuICAgIGhvdmVyOiB0cnVlLFxuICAgIC8vIG11bHRpcGxpZXIgZm9yIHRoZSBudW1iZXIgb2YgcG9pbnRzIGdlbmVyYXRlZCBiYXNlZCBvbiBjYW52YXMgc2l6ZVxuICAgIG11bHRpcGxpZXI6IDAuNSxcbiAgICAvLyB3aGV0aGVyIHRvIGFuaW1hdGUgdGhlIGdyYWRpZW50cyBiZWhpbmQgdGhlIHRyaWFuZ2xlc1xuICAgIGFuaW1hdGU6IGZhbHNlLFxuICAgIC8vIG51bWJlciBvZiBmcmFtZXMgcGVyIGdyYWRpZW50IGNvbG9yIGN5Y2xlXG4gICAgbG9vcEZyYW1lczogMjUwLFxuXG4gICAgLy8gY29sb3JzIHRvIHVzZSBpbiB0aGUgZ3JhZGllbnRcbiAgICBjb2xvcnM6IFsnaHNsYSgwLCAwJSwgMTAwJSwgMSknLCAnaHNsYSgwLCAwJSwgNTAlLCAxKScsICdoc2xhKDAsIDAlLCAwJSwgMSknXSxcblxuICAgIC8vIHJhbmRvbWx5IGNob29zZSBmcm9tIGNvbG9yIHBhbGV0dGUgb24gcmFuZG9taXplIGlmIG5vdCBzdXBwbGllZCBjb2xvcnNcbiAgICBjb2xvclBhbGV0dGU6IGZhbHNlLFxuXG4gICAgLy8gdXNlIGltYWdlIGFzIGJhY2tncm91bmQgaW5zdGVhZCBvZiBncmFkaWVudFxuICAgIGltYWdlQXNCYWNrZ3JvdW5kOiBmYWxzZSxcblxuICAgIC8vIGltYWdlIHRvIHVzZSBhcyBiYWNrZ3JvdW5kXG4gICAgaW1hZ2VVUkw6ICcnLFxuXG4gICAgLy8gaG93IHRvIHJlc2l6ZSB0aGUgcG9pbnRzXG4gICAgcmVzaXplTW9kZTogJ3NjYWxlUG9pbnRzJyxcbiAgICAvLyAnbmV3UG9pbnRzJyAtIGdlbmVyYXRlcyBhIG5ldyBzZXQgb2YgcG9pbnRzIGZvciB0aGUgbmV3IHNpemVcbiAgICAvLyAnc2NhbGVQb2ludHMnIC0gbGluZWFybHkgc2NhbGVzIGV4aXN0aW5nIHBvaW50cyBhbmQgcmUtdHJpYW5ndWxhdGVzXG5cbiAgICAvLyBldmVudHMgdHJpZ2dlcmVkIHdoZW4gdGhlIGNlbnRlciBvZiB0aGUgYmFja2dyb3VuZFxuICAgIC8vIGlzIGdyZWF0ZXIgb3IgbGVzcyB0aGFuIDUwIGxpZ2h0bmVzcyBpbiBoc2xhXG4gICAgLy8gaW50ZW5kZWQgdG8gYWRqdXN0IHNvbWUgdGV4dCB0aGF0IGlzIG9uIHRvcFxuICAgIC8vIGNvbG9yIGlzIHRoZSBjb2xvciBvZiB0aGUgY2VudGVyIG9mIHRoZSBjYW52YXNcbiAgICBvbkRhcmtCYWNrZ3JvdW5kOiBmdW5jdGlvbigpIHsgcmV0dXJuOyB9LFxuICAgIG9uTGlnaHRCYWNrZ3JvdW5kOiBmdW5jdGlvbigpIHsgcmV0dXJuOyB9LFxuXG5cdGdyYWRpZW50OiB7XG5cdFx0bWluWDogKHdpZHRoLCBoZWlnaHQpID0+IE1hdGguY2VpbChNYXRoLnNxcnQod2lkdGgpKSxcblx0XHRtYXhYOiAod2lkdGgsIGhlaWdodCkgPT4gTWF0aC5jZWlsKHdpZHRoIC0gTWF0aC5zcXJ0KHdpZHRoKSksXG5cdFx0bWluWTogKHdpZHRoLCBoZWlnaHQpID0+IE1hdGguY2VpbChNYXRoLnNxcnQoaGVpZ2h0KSksXG5cdFx0bWF4WTogKHdpZHRoLCBoZWlnaHQpID0+IE1hdGguY2VpbChoZWlnaHQgLSBNYXRoLnNxcnQoaGVpZ2h0KSksXG5cdFx0bWluUmFkaXVzIDogKHdpZHRoLCBoZWlnaHQsIG51bUdyYWRpZW50cykgPT4gTWF0aC5jZWlsKE1hdGgubWF4KGhlaWdodCwgd2lkdGgpIC8gTWF0aC5tYXgoTWF0aC5zcXJ0KG51bUdyYWRpZW50cyksIDIpKSxcblx0XHRtYXhSYWRpdXMgOiAod2lkdGgsIGhlaWdodCwgbnVtR3JhZGllbnRzKSA9PiBNYXRoLmNlaWwoTWF0aC5tYXgoaGVpZ2h0LCB3aWR0aCkgLyBNYXRoLm1heChNYXRoLmxvZyhudW1HcmFkaWVudHMpLCAxKSlcblx0fSxcblxuICAgIC8vIHRyaWdnZXJlZCB3aGVuIGhvdmVyZWQgb3ZlciB0cmlhbmdsZVxuICAgIG9uVHJpYW5nbGVIb3ZlcjogZnVuY3Rpb24odHJpYW5nbGUsIGN0eCwgb3B0aW9ucykge1xuICAgICAgdmFyIGZpbGwgPSBvcHRpb25zLmhvdmVyQ29sb3IodHJpYW5nbGUuY29sb3IpO1xuICAgICAgdmFyIHN0cm9rZSA9IGZpbGw7XG4gICAgICB0cmlhbmdsZS5yZW5kZXIoY3R4LCBvcHRpb25zLnNob3dFZGdlcyA/IGZpbGwgOiBmYWxzZSwgb3B0aW9ucy5zaG93RWRnZXMgPyBmYWxzZSA6IHN0cm9rZSk7XG4gICAgfSxcblxuICAgIC8vIHJldHVybnMgaHNsYSBjb2xvciBmb3IgdHJpYW5nbGUgZWRnZVxuICAgIC8vIGFzIGEgZnVuY3Rpb24gb2YgdGhlIHRyaWFuZ2xlIGZpbGwgY29sb3JcbiAgICBlZGdlQ29sb3I6IGZ1bmN0aW9uKGNvbG9yKSB7XG4gICAgICBjb2xvciA9IENvbG9yLmhzbGFBZGp1c3RMaWdodG5lc3MoY29sb3IsIGZ1bmN0aW9uKGxpZ2h0bmVzcykge1xuICAgICAgICByZXR1cm4gKGxpZ2h0bmVzcyArIDIwMCAtIGxpZ2h0bmVzcyAqIDIpIC8gMztcbiAgICAgIH0pO1xuICAgICAgY29sb3IgPSBDb2xvci5oc2xhQWRqdXN0QWxwaGEoY29sb3IsIDAuMjUpO1xuICAgICAgcmV0dXJuIGNvbG9yO1xuICAgIH0sXG5cbiAgICAvLyByZXR1cm5zIGhzbGEgY29sb3IgZm9yIHRyaWFuZ2xlIHBvaW50XG4gICAgLy8gYXMgYSBmdW5jdGlvbiBvZiB0aGUgdHJpYW5nbGUgZmlsbCBjb2xvclxuICAgIHBvaW50Q29sb3I6IGZ1bmN0aW9uKGNvbG9yKSB7XG4gICAgICBjb2xvciA9IENvbG9yLmhzbGFBZGp1c3RMaWdodG5lc3MoY29sb3IsIGZ1bmN0aW9uKGxpZ2h0bmVzcykge1xuICAgICAgICByZXR1cm4gKGxpZ2h0bmVzcyArIDIwMCAtIGxpZ2h0bmVzcyAqIDIpIC8gMztcbiAgICAgIH0pO1xuICAgICAgY29sb3IgPSBDb2xvci5oc2xhQWRqdXN0QWxwaGEoY29sb3IsIDEpO1xuICAgICAgcmV0dXJuIGNvbG9yO1xuICAgIH0sXG5cbiAgICAvLyByZXR1cm5zIGhzbGEgY29sb3IgZm9yIHRyaWFuZ2xlIGNlbnRyb2lkXG4gICAgLy8gYXMgYSBmdW5jdGlvbiBvZiB0aGUgdHJpYW5nbGUgZmlsbCBjb2xvclxuICAgIGNlbnRyb2lkQ29sb3I6IGZ1bmN0aW9uKGNvbG9yKSB7XG4gICAgICBjb2xvciA9IENvbG9yLmhzbGFBZGp1c3RMaWdodG5lc3MoY29sb3IsIGZ1bmN0aW9uKGxpZ2h0bmVzcykge1xuICAgICAgICByZXR1cm4gKGxpZ2h0bmVzcyArIDIwMCAtIGxpZ2h0bmVzcyAqIDIpIC8gMztcbiAgICAgIH0pO1xuICAgICAgY29sb3IgPSBDb2xvci5oc2xhQWRqdXN0QWxwaGEoY29sb3IsIDAuMjUpO1xuICAgICAgcmV0dXJuIGNvbG9yO1xuICAgIH0sXG5cbiAgICAvLyByZXR1cm5zIGhzbGEgY29sb3IgZm9yIHRyaWFuZ2xlIGhvdmVyIGZpbGxcbiAgICAvLyBhcyBhIGZ1bmN0aW9uIG9mIHRoZSB0cmlhbmdsZSBmaWxsIGNvbG9yXG4gICAgaG92ZXJDb2xvcjogZnVuY3Rpb24oY29sb3IpIHtcbiAgICAgIGNvbG9yID0gQ29sb3IuaHNsYUFkanVzdExpZ2h0bmVzcyhjb2xvciwgZnVuY3Rpb24obGlnaHRuZXNzKSB7XG4gICAgICAgIHJldHVybiAxMDAgLSBsaWdodG5lc3M7XG4gICAgICB9KTtcbiAgICAgIGNvbG9yID0gQ29sb3IuaHNsYUFkanVzdEFscGhhKGNvbG9yLCAwLjUpO1xuICAgICAgcmV0dXJuIGNvbG9yO1xuICAgIH0sXG4gIH07XG59XG5cbmNsZWFyKCkge1xuICB0aGlzLnBvaW50cyA9IFtdO1xuICB0aGlzLnRyaWFuZ2xlcyA9IFtdO1xuICB0aGlzLnBvaW50TWFwLmNsZWFyKCk7XG4gIHRoaXMuY2VudGVyID0gbmV3IFBvaW50KDAsIDApO1xufVxuXG4vLyBjbGVhciBhbmQgY3JlYXRlIGEgZnJlc2ggc2V0IG9mIHJhbmRvbSBwb2ludHNcbi8vIGFsbCBhcmdzIGFyZSBvcHRpb25hbFxucmFuZG9taXplKG1pbiwgbWF4LCBtaW5FZGdlLCBtYXhFZGdlLCBtaW5HcmFkaWVudHMsIG1heEdyYWRpZW50cywgbXVsdGlwbGllciwgY29sb3JzLCBpbWFnZVVSTCkge1xuICAvLyBjb2xvcnMgcGFyYW0gaXMgb3B0aW9uYWxcbiAgdGhpcy5jb2xvcnMgPSBjb2xvcnMgP1xuICAgICAgICAgICAgICAgICAgY29sb3JzIDpcbiAgICAgICAgICAgICAgICAgIHRoaXMub3B0aW9ucy5jb2xvclBhbGV0dGUgP1xuICAgICAgICAgICAgICAgICAgICB0aGlzLm9wdGlvbnMuY29sb3JQYWxldHRlW1JhbmRvbS5yYW5kb21CZXR3ZWVuKDAsIHRoaXMub3B0aW9ucy5jb2xvclBhbGV0dGUubGVuZ3RoIC0gMSldIDpcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jb2xvcnM7XG5cbiAgdGhpcy5vcHRpb25zLmltYWdlVVJMID0gaW1hZ2VVUkwgPyBpbWFnZVVSTCA6IHRoaXMub3B0aW9ucy5pbWFnZVVSTDtcbiAgdGhpcy5vcHRpb25zLmltYWdlQXNCYWNrZ3JvdW5kID0gISF0aGlzLm9wdGlvbnMuaW1hZ2VVUkw7XG5cbiAgdGhpcy5taW5HcmFkaWVudHMgPSBtaW5HcmFkaWVudHM7XG4gIHRoaXMubWF4R3JhZGllbnRzID0gbWF4R3JhZGllbnRzO1xuXG4gIHRoaXMucmVzaXplQ2FudmFzKCk7XG5cbiAgdGhpcy5nZW5lcmF0ZU5ld1BvaW50cyhtaW4sIG1heCwgbWluRWRnZSwgbWF4RWRnZSwgbXVsdGlwbGllcik7XG5cbiAgdGhpcy50cmlhbmd1bGF0ZSgpO1xuXG4gIGlmICghdGhpcy5vcHRpb25zLmltYWdlQXNCYWNrZ3JvdW5kKSB7XG4gICAgdGhpcy5nZW5lcmF0ZUdyYWRpZW50cyhtaW5HcmFkaWVudHMsIG1heEdyYWRpZW50cyk7XG5cbiAgICAvLyBwcmVwIGZvciBhbmltYXRpb25cbiAgICB0aGlzLm5leHRHcmFkaWVudHMgPSB0aGlzLnJhZGlhbEdyYWRpZW50cy5zbGljZSgwKTtcbiAgICB0aGlzLmdlbmVyYXRlR3JhZGllbnRzKCk7XG4gICAgdGhpcy5jdXJyZW50R3JhZGllbnRzID0gdGhpcy5yYWRpYWxHcmFkaWVudHMuc2xpY2UoMCk7XG4gIH1cblxuICB0aGlzLnJlbmRlcigpO1xuXG4gIGlmICh0aGlzLm9wdGlvbnMuYW5pbWF0ZSAmJiAhdGhpcy5sb29waW5nKSB7XG4gICAgdGhpcy5pbml0UmVuZGVyTG9vcCgpO1xuICB9XG59XG5cbmluaXRSZW5kZXJMb29wKCkge1xuICBpZiAodGhpcy5vcHRpb25zLmltYWdlQXNCYWNrZ3JvdW5kKSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgdGhpcy5sb29waW5nID0gdHJ1ZTtcbiAgdGhpcy5mcmFtZVN0ZXBzID0gdGhpcy5vcHRpb25zLmxvb3BGcmFtZXM7XG4gIHRoaXMuZnJhbWUgPSB0aGlzLmZyYW1lID8gdGhpcy5mcmFtZSA6IHRoaXMuZnJhbWVTdGVwcztcbiAgdGhpcy5yZW5kZXJMb29wKCk7XG59XG5cbnJlbmRlckxvb3AoKSB7XG4gIHRoaXMuZnJhbWUrKztcblxuICAvLyBjdXJyZW50ID0+IG5leHQsIG5leHQgPT4gbmV3XG4gIGlmICh0aGlzLmZyYW1lID4gdGhpcy5mcmFtZVN0ZXBzKSB7XG4gICAgdmFyIG5leHRHcmFkaWVudHMgPSB0aGlzLm5leHRHcmFkaWVudHMgPyB0aGlzLm5leHRHcmFkaWVudHMgOiB0aGlzLnJhZGlhbEdyYWRpZW50cztcbiAgICB0aGlzLmdlbmVyYXRlR3JhZGllbnRzKCk7XG4gICAgdGhpcy5uZXh0R3JhZGllbnRzID0gdGhpcy5yYWRpYWxHcmFkaWVudHM7XG4gICAgdGhpcy5yYWRpYWxHcmFkaWVudHMgPSBuZXh0R3JhZGllbnRzLnNsaWNlKDApO1xuICAgIHRoaXMuY3VycmVudEdyYWRpZW50cyA9IG5leHRHcmFkaWVudHMuc2xpY2UoMCk7XG5cbiAgICB0aGlzLmZyYW1lID0gMDtcbiAgfSBlbHNlIHtcbiAgICAvLyBmYW5jeSBzdGVwc1xuICAgIC8vIHt4MCwgeTAsIHIwLCB4MSwgeTEsIHIxLCBjb2xvclN0b3B9XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBNYXRoLm1heCh0aGlzLnJhZGlhbEdyYWRpZW50cy5sZW5ndGgsIHRoaXMubmV4dEdyYWRpZW50cy5sZW5ndGgpOyBpKyspIHtcbiAgICAgIHZhciBjdXJyZW50R3JhZGllbnQgPSB0aGlzLmN1cnJlbnRHcmFkaWVudHNbaV07XG4gICAgICB2YXIgbmV4dEdyYWRpZW50ID0gdGhpcy5uZXh0R3JhZGllbnRzW2ldO1xuXG4gICAgICBpZiAodHlwZW9mIGN1cnJlbnRHcmFkaWVudCA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgdmFyIG5ld0dyYWRpZW50ID0ge1xuICAgICAgICAgIHgwOiBuZXh0R3JhZGllbnQueDAsXG4gICAgICAgICAgeTA6IG5leHRHcmFkaWVudC55MCxcbiAgICAgICAgICByMDogMCxcbiAgICAgICAgICB4MTogbmV4dEdyYWRpZW50LngxLFxuICAgICAgICAgIHkxOiBuZXh0R3JhZGllbnQueTEsXG4gICAgICAgICAgcjE6IDAsXG4gICAgICAgICAgY29sb3JTdG9wOiBuZXh0R3JhZGllbnQuY29sb3JTdG9wLFxuICAgICAgICB9O1xuICAgICAgICBjdXJyZW50R3JhZGllbnQgPSBuZXdHcmFkaWVudDtcbiAgICAgICAgdGhpcy5jdXJyZW50R3JhZGllbnRzLnB1c2gobmV3R3JhZGllbnQpO1xuICAgICAgICB0aGlzLnJhZGlhbEdyYWRpZW50cy5wdXNoKG5ld0dyYWRpZW50KTtcbiAgICAgIH1cblxuICAgICAgaWYgKHR5cGVvZiBuZXh0R3JhZGllbnQgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIG5leHRHcmFkaWVudCA9IHtcbiAgICAgICAgICB4MDogY3VycmVudEdyYWRpZW50LngwLFxuICAgICAgICAgIHkwOiBjdXJyZW50R3JhZGllbnQueTAsXG4gICAgICAgICAgcjA6IDAsXG4gICAgICAgICAgeDE6IGN1cnJlbnRHcmFkaWVudC54MSxcbiAgICAgICAgICB5MTogY3VycmVudEdyYWRpZW50LnkxLFxuICAgICAgICAgIHIxOiAwLFxuICAgICAgICAgIGNvbG9yU3RvcDogY3VycmVudEdyYWRpZW50LmNvbG9yU3RvcCxcbiAgICAgICAgfTtcbiAgICAgIH1cblxuICAgICAgdmFyIHVwZGF0ZWRHcmFkaWVudCA9IHt9O1xuXG4gICAgICAvLyBzY2FsZSB0aGUgZGlmZmVyZW5jZSBiZXR3ZWVuIGN1cnJlbnQgYW5kIG5leHQgZ3JhZGllbnQgYmFzZWQgb24gc3RlcCBpbiBmcmFtZXNcbiAgICAgIHZhciBzY2FsZSA9IHRoaXMuZnJhbWUgLyB0aGlzLmZyYW1lU3RlcHM7XG5cbiAgICAgIHVwZGF0ZWRHcmFkaWVudC54MCA9IE1hdGgucm91bmQobGluZWFyU2NhbGUoY3VycmVudEdyYWRpZW50LngwLCBuZXh0R3JhZGllbnQueDAsIHNjYWxlKSk7XG4gICAgICB1cGRhdGVkR3JhZGllbnQueTAgPSBNYXRoLnJvdW5kKGxpbmVhclNjYWxlKGN1cnJlbnRHcmFkaWVudC55MCwgbmV4dEdyYWRpZW50LnkwLCBzY2FsZSkpO1xuICAgICAgdXBkYXRlZEdyYWRpZW50LnIwID0gTWF0aC5yb3VuZChsaW5lYXJTY2FsZShjdXJyZW50R3JhZGllbnQucjAsIG5leHRHcmFkaWVudC5yMCwgc2NhbGUpKTtcbiAgICAgIHVwZGF0ZWRHcmFkaWVudC54MSA9IE1hdGgucm91bmQobGluZWFyU2NhbGUoY3VycmVudEdyYWRpZW50LngxLCBuZXh0R3JhZGllbnQueDAsIHNjYWxlKSk7XG4gICAgICB1cGRhdGVkR3JhZGllbnQueTEgPSBNYXRoLnJvdW5kKGxpbmVhclNjYWxlKGN1cnJlbnRHcmFkaWVudC55MSwgbmV4dEdyYWRpZW50LnkwLCBzY2FsZSkpO1xuICAgICAgdXBkYXRlZEdyYWRpZW50LnIxID0gTWF0aC5yb3VuZChsaW5lYXJTY2FsZShjdXJyZW50R3JhZGllbnQucjEsIG5leHRHcmFkaWVudC5yMSwgc2NhbGUpKTtcbiAgICAgIHVwZGF0ZWRHcmFkaWVudC5jb2xvclN0b3AgPSBsaW5lYXJTY2FsZShjdXJyZW50R3JhZGllbnQuY29sb3JTdG9wLCBuZXh0R3JhZGllbnQuY29sb3JTdG9wLCBzY2FsZSk7XG5cbiAgICAgIHRoaXMucmFkaWFsR3JhZGllbnRzW2ldID0gdXBkYXRlZEdyYWRpZW50O1xuICAgIH1cbiAgfVxuXG4gIHRoaXMucmVzZXRQb2ludENvbG9ycygpO1xuICB0aGlzLnJlbmRlcigpO1xuXG4gIGlmICh0aGlzLm9wdGlvbnMuYW5pbWF0ZSkge1xuICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiB7XG4gICAgICB0aGlzLnJlbmRlckxvb3AoKTtcbiAgICB9KTtcbiAgfSBlbHNlIHtcbiAgICB0aGlzLmxvb3BpbmcgPSBmYWxzZTtcbiAgfVxufVxuXG4vLyBjcmVhdGVzIGEgaGlkZGVuIGNhbnZhcyBmb3IgaG92ZXIgZGV0ZWN0aW9uXG5jcmVhdGVIb3ZlclNoYWRvd0NhbnZhcygpIHtcbiAgdGhpcy5ob3ZlclNoYWRvd0NhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpO1xuICB0aGlzLnNoYWRvd0N0eCA9IHRoaXMuaG92ZXJTaGFkb3dDYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcblxuICB0aGlzLmhvdmVyU2hhZG93Q2FudmFzLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XG59XG5cbmdlbmVyYXRlTmV3UG9pbnRzKG1pbiwgbWF4LCBtaW5FZGdlLCBtYXhFZGdlLCBtdWx0aXBsaWVyKSB7XG4gIC8vIGRlZmF1bHRzIHRvIGdlbmVyaWMgbnVtYmVyIG9mIHBvaW50cyBiYXNlZCBvbiBjYW52YXMgZGltZW5zaW9uc1xuICAvLyB0aGlzIGdlbmVyYWxseSBsb29rcyBwcmV0dHkgbmljZVxuICB2YXIgYXJlYSA9IHRoaXMuY2FudmFzLndpZHRoICogdGhpcy5jYW52YXMuaGVpZ2h0O1xuICB2YXIgcGVyaW1ldGVyID0gKHRoaXMuY2FudmFzLndpZHRoICsgdGhpcy5jYW52YXMuaGVpZ2h0KSAqIDI7XG5cbiAgbXVsdGlwbGllciA9IG11bHRpcGxpZXIgfHwgdGhpcy5vcHRpb25zLm11bHRpcGxpZXI7XG5cbiAgbWluID0gbWluID4gMCA/IE1hdGguY2VpbChtaW4pIDogTWF0aC5tYXgoTWF0aC5jZWlsKChhcmVhIC8gMTI1MCkgKiBtdWx0aXBsaWVyKSwgNTApO1xuICBtYXggPSBtYXggPiAwID8gTWF0aC5jZWlsKG1heCkgOiBNYXRoLm1heChNYXRoLmNlaWwoKGFyZWEgLyA1MDApICogbXVsdGlwbGllciksIDUwKTtcblxuICBtaW5FZGdlID0gbWluRWRnZSA+IDAgPyBNYXRoLmNlaWwobWluRWRnZSkgOiBNYXRoLm1heChNYXRoLmNlaWwoKHBlcmltZXRlciAvIDEyNSkgKiBtdWx0aXBsaWVyKSwgNSk7XG4gIG1heEVkZ2UgPSBtYXhFZGdlID4gMCA/IE1hdGguY2VpbChtYXhFZGdlKSA6IE1hdGgubWF4KE1hdGguY2VpbCgocGVyaW1ldGVyIC8gNTApICogbXVsdGlwbGllciksIDUpO1xuXG4gIHRoaXMubnVtUG9pbnRzID0gUmFuZG9tLnJhbmRvbUJldHdlZW4obWluLCBtYXgpO1xuICB0aGlzLmdldE51bUVkZ2VQb2ludHMgPSBSYW5kb20ucmFuZG9tTnVtYmVyRnVuY3Rpb24obWluRWRnZSwgbWF4RWRnZSk7XG5cbiAgdGhpcy5jbGVhcigpO1xuXG4gIC8vIGFkZCBjb3JuZXIgYW5kIGVkZ2UgcG9pbnRzXG4gIHRoaXMuZ2VuZXJhdGVDb3JuZXJQb2ludHMoKTtcbiAgdGhpcy5nZW5lcmF0ZUVkZ2VQb2ludHMoKTtcblxuICAvLyBhZGQgc29tZSByYW5kb20gcG9pbnRzIGluIHRoZSBtaWRkbGUgZmllbGQsXG4gIC8vIGV4Y2x1ZGluZyBlZGdlcyBhbmQgY29ybmVyc1xuICB0aGlzLmdlbmVyYXRlUmFuZG9tUG9pbnRzKHRoaXMubnVtUG9pbnRzLCAxLCAxLCB0aGlzLndpZHRoIC0gMSwgdGhpcy5oZWlnaHQgLSAxKTtcbn1cblxuLy8gYWRkIHBvaW50cyBpbiB0aGUgY29ybmVyc1xuZ2VuZXJhdGVDb3JuZXJQb2ludHMoKSB7XG4gIHRoaXMucG9pbnRzLnB1c2gobmV3IFBvaW50KDAsIDApKTtcbiAgdGhpcy5wb2ludHMucHVzaChuZXcgUG9pbnQoMCwgdGhpcy5oZWlnaHQpKTtcbiAgdGhpcy5wb2ludHMucHVzaChuZXcgUG9pbnQodGhpcy53aWR0aCwgMCkpO1xuICB0aGlzLnBvaW50cy5wdXNoKG5ldyBQb2ludCh0aGlzLndpZHRoLCB0aGlzLmhlaWdodCkpO1xufVxuXG4vLyBhZGQgcG9pbnRzIG9uIHRoZSBlZGdlc1xuZ2VuZXJhdGVFZGdlUG9pbnRzKCkge1xuICAvLyBsZWZ0IGVkZ2VcbiAgdGhpcy5nZW5lcmF0ZVJhbmRvbVBvaW50cyh0aGlzLmdldE51bUVkZ2VQb2ludHMoKSwgMCwgMCwgMCwgdGhpcy5oZWlnaHQpO1xuICAvLyByaWdodCBlZGdlXG4gIHRoaXMuZ2VuZXJhdGVSYW5kb21Qb2ludHModGhpcy5nZXROdW1FZGdlUG9pbnRzKCksIHRoaXMud2lkdGgsIDAsIDAsIHRoaXMuaGVpZ2h0KTtcbiAgLy8gYm90dG9tIGVkZ2VcbiAgdGhpcy5nZW5lcmF0ZVJhbmRvbVBvaW50cyh0aGlzLmdldE51bUVkZ2VQb2ludHMoKSwgMCwgdGhpcy5oZWlnaHQsIHRoaXMud2lkdGgsIDApO1xuICAvLyB0b3AgZWRnZVxuICB0aGlzLmdlbmVyYXRlUmFuZG9tUG9pbnRzKHRoaXMuZ2V0TnVtRWRnZVBvaW50cygpLCAwLCAwLCB0aGlzLndpZHRoLCAwKTtcbn1cblxuLy8gcmFuZG9tbHkgZ2VuZXJhdGUgc29tZSBwb2ludHMsXG4vLyBzYXZlIHRoZSBwb2ludCBjbG9zZXN0IHRvIGNlbnRlclxuZ2VuZXJhdGVSYW5kb21Qb2ludHMobnVtUG9pbnRzLCB4LCB5LCB3aWR0aCwgaGVpZ2h0KSB7XG4gIHZhciBjZW50ZXIgPSBuZXcgUG9pbnQoTWF0aC5yb3VuZCh0aGlzLmNhbnZhcy53aWR0aCAvIDIpLCBNYXRoLnJvdW5kKHRoaXMuY2FudmFzLmhlaWdodCAvIDIpKTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBudW1Qb2ludHM7IGkrKykge1xuICAgIC8vIGdlbmVyYXRlIGEgbmV3IHBvaW50IHdpdGggcmFuZG9tIGNvb3Jkc1xuICAgIC8vIHJlLWdlbmVyYXRlIHRoZSBwb2ludCBpZiBpdCBhbHJlYWR5IGV4aXN0cyBpbiBwb2ludG1hcCAobWF4IDEwIHRpbWVzKVxuICAgIHZhciBwb2ludDtcbiAgICB2YXIgaiA9IDA7XG4gICAgZG8ge1xuICAgICAgaisrO1xuICAgICAgcG9pbnQgPSBuZXcgUG9pbnQoUmFuZG9tLnJhbmRvbUJldHdlZW4oeCwgeCArIHdpZHRoKSwgUmFuZG9tLnJhbmRvbUJldHdlZW4oeSwgeSArIGhlaWdodCkpO1xuICAgIH0gd2hpbGUgKHRoaXMucG9pbnRNYXAuZXhpc3RzKHBvaW50KSAmJiBqIDwgMTApO1xuXG4gICAgaWYgKGogPCAxMCkge1xuICAgICAgdGhpcy5wb2ludHMucHVzaChwb2ludCk7XG4gICAgICB0aGlzLnBvaW50TWFwLmFkZChwb2ludCk7XG4gICAgfVxuXG4gICAgaWYgKGNlbnRlci5nZXREaXN0YW5jZVRvKHBvaW50KSA8IGNlbnRlci5nZXREaXN0YW5jZVRvKHRoaXMuY2VudGVyKSkge1xuICAgICAgdGhpcy5jZW50ZXIgPSBwb2ludDtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5jZW50ZXIuaXNDZW50ZXIgPSBmYWxzZTtcbiAgICB9XG4gIH1cblxuICB0aGlzLmNlbnRlci5pc0NlbnRlciA9IHRydWU7XG59XG5cbi8vIHVzZSB0aGUgRGVsYXVuYXkgYWxnb3JpdGhtIHRvIG1ha2Vcbi8vIHRyaWFuZ2xlcyBvdXQgb2Ygb3VyIHJhbmRvbSBwb2ludHNcbnRyaWFuZ3VsYXRlKCkge1xuICB0aGlzLnRyaWFuZ2xlcyA9IFtdO1xuXG4gIC8vIG1hcCBwb2ludCBvYmplY3RzIHRvIGxlbmd0aC0yIGFycmF5c1xuICB2YXIgdmVydGljZXMgPSB0aGlzLnBvaW50cy5tYXAoZnVuY3Rpb24ocG9pbnQpIHtcbiAgICByZXR1cm4gcG9pbnQuZ2V0Q29vcmRzKCk7XG4gIH0pO1xuXG4gIC8vIHZlcnRpY2VzIGlzIG5vdyBhbiBhcnJheSBzdWNoIGFzOlxuICAvLyBbIFtwMXgsIHAxeV0sIFtwMngsIHAyeV0sIFtwM3gsIHAzeV0sIC4uLiBdXG5cbiAgLy8gZG8gdGhlIGFsZ29yaXRobVxuICB2YXIgdHJpYW5ndWxhdGVkID0gRGVsYXVuYXkudHJpYW5ndWxhdGUodmVydGljZXMpO1xuXG4gIC8vIHJldHVybnMgMSBkaW1lbnNpb25hbCBhcnJheSBhcnJhbmdlZCBpbiB0cmlwbGVzIHN1Y2ggYXM6XG4gIC8vIFsgdDFhLCB0MWIsIHQxYywgdDJhLCB0MmIsIHQyYywuLi4uIF1cbiAgLy8gd2hlcmUgdDFhLCBldGMgYXJlIGluZGVjZXMgaW4gdGhlIHZlcnRpY2VzIGFycmF5XG4gIC8vIHR1cm4gdGhhdCBpbnRvIGFycmF5IG9mIHRyaWFuZ2xlIHBvaW50c1xuICBmb3IgKHZhciBpID0gMDsgaSA8IHRyaWFuZ3VsYXRlZC5sZW5ndGg7IGkgKz0gMykge1xuICAgIHZhciBhcnIgPSBbXTtcbiAgICBhcnIucHVzaCh2ZXJ0aWNlc1t0cmlhbmd1bGF0ZWRbaV1dKTtcbiAgICBhcnIucHVzaCh2ZXJ0aWNlc1t0cmlhbmd1bGF0ZWRbaSArIDFdXSk7XG4gICAgYXJyLnB1c2godmVydGljZXNbdHJpYW5ndWxhdGVkW2kgKyAyXV0pO1xuICAgIHRoaXMudHJpYW5nbGVzLnB1c2goYXJyKTtcbiAgfVxuXG4gIC8vIG1hcCB0byBhcnJheSBvZiBUcmlhbmdsZSBvYmplY3RzXG4gIHRoaXMudHJpYW5nbGVzID0gdGhpcy50cmlhbmdsZXMubWFwKGZ1bmN0aW9uKHRyaWFuZ2xlKSB7XG4gICAgcmV0dXJuIG5ldyBUcmlhbmdsZShuZXcgUG9pbnQodHJpYW5nbGVbMF0pLFxuICAgICAgICAgICAgICAgICAgICAgICAgbmV3IFBvaW50KHRyaWFuZ2xlWzFdKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ldyBQb2ludCh0cmlhbmdsZVsyXSkpO1xuICB9KTtcbn1cblxucmVzZXRQb2ludENvbG9ycygpIHtcbiAgLy8gcmVzZXQgY2FjaGVkIGNvbG9ycyBvZiBjZW50cm9pZHMgYW5kIHBvaW50c1xuICB2YXIgaTtcbiAgZm9yIChpID0gMDsgaSA8IHRoaXMudHJpYW5nbGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgdGhpcy50cmlhbmdsZXNbaV0ucmVzZXRQb2ludENvbG9ycygpO1xuICB9XG5cbiAgZm9yIChpID0gMDsgaSA8IHRoaXMucG9pbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgdGhpcy5wb2ludHNbaV0ucmVzZXRDb2xvcigpO1xuICB9XG59XG5cbi8vIGNyZWF0ZSByYW5kb20gcmFkaWFsIGdyYWRpZW50IGNpcmNsZXMgZm9yIHJlbmRlcmluZyBsYXRlclxuZ2VuZXJhdGVHcmFkaWVudHMobWluR3JhZGllbnRzLCBtYXhHcmFkaWVudHMpIHtcbiAgdGhpcy5yYWRpYWxHcmFkaWVudHMgPSBbXTtcblxuICBtaW5HcmFkaWVudHMgPSBtaW5HcmFkaWVudHMgfHwgdGhpcy5taW5HcmFkaWVudHMgPiAwID8gbWluR3JhZGllbnRzIHx8IHRoaXMubWluR3JhZGllbnRzIDogMTtcbiAgbWF4R3JhZGllbnRzID0gbWF4R3JhZGllbnRzIHx8IHRoaXMubWF4R3JhZGllbnRzID4gMCA/IG1heEdyYWRpZW50cyB8fCB0aGlzLm1heEdyYWRpZW50cyA6IDI7XG5cbiAgdGhpcy5udW1HcmFkaWVudHMgPSBSYW5kb20ucmFuZG9tQmV0d2VlbihtaW5HcmFkaWVudHMsIG1heEdyYWRpZW50cyk7XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLm51bUdyYWRpZW50czsgaSsrKSB7XG4gICAgdGhpcy5nZW5lcmF0ZVJhZGlhbEdyYWRpZW50KCk7XG4gIH1cbn1cblxuZ2VuZXJhdGVSYWRpYWxHcmFkaWVudCgpIHtcbiAgLyoqXG4gICAgKiBjcmVhdGUgYSBuaWNlLWxvb2tpbmcgYnV0IHNvbWV3aGF0IHJhbmRvbSBncmFkaWVudDpcbiAgICAqIHJhbmRvbWl6ZSB0aGUgZmlyc3QgY2lyY2xlXG4gICAgKiB0aGUgc2Vjb25kIGNpcmNsZSBzaG91bGQgYmUgaW5zaWRlIHRoZSBmaXJzdCBjaXJjbGUsXG4gICAgKiBzbyB3ZSBnZW5lcmF0ZSBhIHBvaW50IChvcmlnaW4yKSBpbnNpZGUgY2lybGUxXG4gICAgKiB0aGVuIGNhbGN1bGF0ZSB0aGUgZGlzdCBiZXR3ZWVuIG9yaWdpbjIgYW5kIHRoZSBjaXJjdW1mcmVuY2Ugb2YgY2lyY2xlMVxuICAgICogY2lyY2xlMidzIHJhZGl1cyBjYW4gYmUgYmV0d2VlbiAwIGFuZCB0aGlzIGRpc3RcbiAgICAqL1xuXG4gIHZhciBtaW5YID0gdGhpcy5vcHRpb25zLmdyYWRpZW50Lm1pblgodGhpcy5jYW52YXMud2lkdGgsIHRoaXMuY2FudmFzLmhlaWdodCk7XG4gIHZhciBtYXhYID0gdGhpcy5vcHRpb25zLmdyYWRpZW50Lm1heFgodGhpcy5jYW52YXMud2lkdGgsIHRoaXMuY2FudmFzLmhlaWdodCk7XG5cbiAgdmFyIG1pblkgPSB0aGlzLm9wdGlvbnMuZ3JhZGllbnQubWluWSh0aGlzLmNhbnZhcy53aWR0aCwgdGhpcy5jYW52YXMuaGVpZ2h0KTtcbiAgdmFyIG1heFkgPSB0aGlzLm9wdGlvbnMuZ3JhZGllbnQubWF4WSh0aGlzLmNhbnZhcy53aWR0aCwgdGhpcy5jYW52YXMuaGVpZ2h0KTtcblxuICB2YXIgbWluUmFkaXVzID0gdGhpcy5vcHRpb25zLmdyYWRpZW50Lm1pblJhZGl1cyh0aGlzLmNhbnZhcy53aWR0aCwgdGhpcy5jYW52YXMuaGVpZ2h0LCB0aGlzLm51bUdyYWRpZW50cyk7XG4gIHZhciBtYXhSYWRpdXMgPSB0aGlzLm9wdGlvbnMuZ3JhZGllbnQubWF4UmFkaXVzKHRoaXMuY2FudmFzLndpZHRoLCB0aGlzLmNhbnZhcy5oZWlnaHQsIHRoaXMubnVtR3JhZGllbnRzKTtcblxuICAvLyBoZWxwZXIgcmFuZG9tIGZ1bmN0aW9uc1xuICB2YXIgcmFuZG9tQ2FudmFzWCA9IFJhbmRvbS5yYW5kb21OdW1iZXJGdW5jdGlvbihtaW5YLCBtYXhYKTtcbiAgdmFyIHJhbmRvbUNhbnZhc1kgPSBSYW5kb20ucmFuZG9tTnVtYmVyRnVuY3Rpb24obWluWSwgbWF4WSk7XG4gIHZhciByYW5kb21DYW52YXNSYWRpdXMgPSBSYW5kb20ucmFuZG9tTnVtYmVyRnVuY3Rpb24obWluUmFkaXVzLCBtYXhSYWRpdXMpO1xuXG4gIC8vIGdlbmVyYXRlIGNpcmNsZTEgb3JpZ2luIGFuZCByYWRpdXNcbiAgdmFyIHgwO1xuICB2YXIgeTA7XG4gIHZhciByMCA9IHJhbmRvbUNhbnZhc1JhZGl1cygpO1xuXG4gIC8vIG9yaWdpbiBvZiB0aGUgbmV4dCBjaXJjbGUgc2hvdWxkIGJlIGNvbnRhaW5lZFxuICAvLyB3aXRoaW4gdGhlIGFyZWEgb2YgaXRzIHByZWRlY2Vzc29yXG4gIGlmICh0aGlzLnJhZGlhbEdyYWRpZW50cy5sZW5ndGggPiAwKSB7XG4gICAgdmFyIGxhc3RHcmFkaWVudCA9IHRoaXMucmFkaWFsR3JhZGllbnRzW3RoaXMucmFkaWFsR3JhZGllbnRzLmxlbmd0aCAtIDFdO1xuICAgIHZhciBwb2ludEluTGFzdENpcmNsZSA9IFJhbmRvbS5yYW5kb21JbkNpcmNsZShsYXN0R3JhZGllbnQucjAsIGxhc3RHcmFkaWVudC54MCwgbGFzdEdyYWRpZW50LnkwKTtcblxuICAgIC8vIG9yaWdpbiBtdXN0IGJlIHdpdGhpbiB0aGUgYm91bmRzIG9mIHRoZSBjYW52YXNcbiAgICB3aGlsZSAocG9pbnRJbkxhc3RDaXJjbGUueCA8IDAgfHxcbiAgICAgICAgICAgcG9pbnRJbkxhc3RDaXJjbGUueSA8IDAgfHxcbiAgICAgICAgICAgcG9pbnRJbkxhc3RDaXJjbGUueCA+IHRoaXMuY2FudmFzLndpZHRoIHx8XG4gICAgICAgICAgIHBvaW50SW5MYXN0Q2lyY2xlLnkgPiB0aGlzLmNhbnZhcy5oZWlnaHQpIHtcbiAgICAgIHBvaW50SW5MYXN0Q2lyY2xlID0gUmFuZG9tLnJhbmRvbUluQ2lyY2xlKGxhc3RHcmFkaWVudC5yMCwgbGFzdEdyYWRpZW50LngwLCBsYXN0R3JhZGllbnQueTApO1xuICAgIH1cbiAgICB4MCA9IHBvaW50SW5MYXN0Q2lyY2xlLng7XG4gICAgeTAgPSBwb2ludEluTGFzdENpcmNsZS55O1xuICB9IGVsc2Uge1xuICAgIC8vIGZpcnN0IGNpcmNsZSwganVzdCBwaWNrIGF0IHJhbmRvbVxuICAgIHgwID0gcmFuZG9tQ2FudmFzWCgpO1xuICAgIHkwID0gcmFuZG9tQ2FudmFzWSgpO1xuICB9XG5cbiAgLy8gZmluZCBhIHJhbmRvbSBwb2ludCBpbnNpZGUgY2lyY2xlMVxuICAvLyB0aGlzIGlzIHRoZSBvcmlnaW4gb2YgY2lyY2xlIDJcbiAgdmFyIHBvaW50SW5DaXJjbGUgPSBSYW5kb20ucmFuZG9tSW5DaXJjbGUocjAgKiAwLjA5LCB4MCwgeTApO1xuXG4gIC8vIGdyYWIgdGhlIHgveSBjb29yZHNcbiAgdmFyIHgxID0gcG9pbnRJbkNpcmNsZS54O1xuICB2YXIgeTEgPSBwb2ludEluQ2lyY2xlLnk7XG5cbiAgLy8gZmluZCBkaXN0YW5jZSBiZXR3ZWVuIHRoZSBwb2ludCBhbmQgdGhlIGNpcmN1bWZyaWVuY2Ugb2YgY2lyY2xlMVxuICAvLyB0aGUgcmFkaXVzIG9mIHRoZSBzZWNvbmQgY2lyY2xlIHdpbGwgYmUgYSBmdW5jdGlvbiBvZiB0aGlzIGRpc3RhbmNlXG4gIHZhciB2WCA9IHgxIC0geDA7XG4gIHZhciB2WSA9IHkxIC0geTA7XG4gIHZhciBtYWdWID0gTWF0aC5zcXJ0KHZYICogdlggKyB2WSAqIHZZKTtcbiAgdmFyIGFYID0geDAgKyB2WCAvIG1hZ1YgKiByMDtcbiAgdmFyIGFZID0geTAgKyB2WSAvIG1hZ1YgKiByMDtcblxuICB2YXIgZGlzdCA9IE1hdGguc3FydCgoeDEgLSBhWCkgKiAoeDEgLSBhWCkgKyAoeTEgLSBhWSkgKiAoeTEgLSBhWSkpO1xuXG4gIC8vIGdlbmVyYXRlIHRoZSByYWRpdXMgb2YgY2lyY2xlMiBiYXNlZCBvbiB0aGlzIGRpc3RhbmNlXG4gIHZhciByMSA9IFJhbmRvbS5yYW5kb21CZXR3ZWVuKDEsIE1hdGguc3FydChkaXN0KSk7XG5cbiAgLy8gcmFuZG9tIGJ1dCBuaWNlIGxvb2tpbmcgY29sb3Igc3RvcFxuICB2YXIgY29sb3JTdG9wID0gUmFuZG9tLnJhbmRvbUJldHdlZW4oMiwgOCkgLyAxMDtcblxuICB0aGlzLnJhZGlhbEdyYWRpZW50cy5wdXNoKHt4MCwgeTAsIHIwLCB4MSwgeTEsIHIxLCBjb2xvclN0b3B9KTtcbn1cblxuLy8gc29ydHMgdGhlIHBvaW50c1xuc29ydFBvaW50cygpIHtcbiAgLy8gc29ydCBwb2ludHNcbiAgdGhpcy5wb2ludHMuc29ydChmdW5jdGlvbihhLCBiKSB7XG4gICAgLy8gc29ydCB0aGUgcG9pbnRcbiAgICBpZiAoYS54IDwgYi54KSB7XG4gICAgICByZXR1cm4gLTE7XG4gICAgfSBlbHNlIGlmIChhLnggPiBiLngpIHtcbiAgICAgIHJldHVybiAxO1xuICAgIH0gZWxzZSBpZiAoYS55IDwgYi55KSB7XG4gICAgICByZXR1cm4gLTE7XG4gICAgfSBlbHNlIGlmIChhLnkgPiBiLnkpIHtcbiAgICAgIHJldHVybiAxO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gMDtcbiAgICB9XG4gIH0pO1xufVxuXG4vLyBzaXplIHRoZSBjYW52YXMgdG8gdGhlIHNpemUgb2YgaXRzIHBhcmVudFxuLy8gbWFrZXMgdGhlIGNhbnZhcyAncmVzcG9uc2l2ZSdcbnJlc2l6ZUNhbnZhcygpIHtcbiAgdmFyIHBhcmVudCA9IHRoaXMuY2FudmFzLnBhcmVudEVsZW1lbnQ7XG4gIHRoaXMuY2FudmFzLndpZHRoID0gdGhpcy53aWR0aCA9IHBhcmVudC5vZmZzZXRXaWR0aDtcbiAgdGhpcy5jYW52YXMuaGVpZ2h0ID0gdGhpcy5oZWlnaHQgPSBwYXJlbnQub2Zmc2V0SGVpZ2h0O1xuXG4gIGlmICh0aGlzLmhvdmVyU2hhZG93Q2FudmFzKSB7XG4gICAgdGhpcy5ob3ZlclNoYWRvd0NhbnZhcy53aWR0aCA9IHRoaXMud2lkdGggPSBwYXJlbnQub2Zmc2V0V2lkdGg7XG4gICAgdGhpcy5ob3ZlclNoYWRvd0NhbnZhcy5oZWlnaHQgPSB0aGlzLmhlaWdodCA9IHBhcmVudC5vZmZzZXRIZWlnaHQ7XG4gIH1cbn1cblxuLy8gbW92ZXMgcG9pbnRzL3RyaWFuZ2xlcyBiYXNlZCBvbiBuZXcgc2l6ZSBvZiBjYW52YXNcbnJlc2NhbGUoKSB7XG4gIC8vIGdyYWIgb2xkIG1heC9taW4gZnJvbSBjdXJyZW50IGNhbnZhcyBzaXplXG4gIHZhciB4TWluID0gMDtcbiAgdmFyIHhNYXggPSB0aGlzLmNhbnZhcy53aWR0aDtcbiAgdmFyIHlNaW4gPSAwO1xuICB2YXIgeU1heCA9IHRoaXMuY2FudmFzLmhlaWdodDtcblxuICB0aGlzLnJlc2l6ZUNhbnZhcygpO1xuXG4gIGlmICh0aGlzLm9wdGlvbnMucmVzaXplTW9kZSA9PT0gJ3NjYWxlUG9pbnRzJykge1xuICAgIC8vIHNjYWxlIGFsbCBwb2ludHMgdG8gbmV3IG1heCBkaW1lbnNpb25zXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLnBvaW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgdGhpcy5wb2ludHNbaV0ucmVzY2FsZSh4TWluLCB4TWF4LCB5TWluLCB5TWF4LCAwLCB0aGlzLmNhbnZhcy53aWR0aCwgMCwgdGhpcy5jYW52YXMuaGVpZ2h0KTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgdGhpcy5nZW5lcmF0ZU5ld1BvaW50cygpO1xuICB9XG5cbiAgdGhpcy50cmlhbmd1bGF0ZSgpO1xuXG4gIC8vIHJlc2NhbGUgcG9zaXRpb24gb2YgcmFkaWFsIGdyYWRpZW50IGNpcmNsZXNcbiAgdGhpcy5yZXNjYWxlR3JhZGllbnRzKHRoaXMucmFkaWFsR3JhZGllbnRzLCB4TWluLCB4TWF4LCB5TWluLCB5TWF4KTtcbiAgdGhpcy5yZXNjYWxlR3JhZGllbnRzKHRoaXMuY3VycmVudEdyYWRpZW50cywgeE1pbiwgeE1heCwgeU1pbiwgeU1heCk7XG4gIHRoaXMucmVzY2FsZUdyYWRpZW50cyh0aGlzLm5leHRHcmFkaWVudHMsIHhNaW4sIHhNYXgsIHlNaW4sIHlNYXgpO1xuXG4gIHRoaXMucmVuZGVyKCk7XG59XG5cbnJlc2NhbGVHcmFkaWVudHMoYXJyYXksIHhNaW4sIHhNYXgsIHlNaW4sIHlNYXgpIHtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcnJheS5sZW5ndGg7IGkrKykge1xuICAgIHZhciBjaXJjbGUwID0gbmV3IFBvaW50KGFycmF5W2ldLngwLCBhcnJheVtpXS55MCk7XG4gICAgdmFyIGNpcmNsZTEgPSBuZXcgUG9pbnQoYXJyYXlbaV0ueDEsIGFycmF5W2ldLnkxKTtcblxuICAgIGNpcmNsZTAucmVzY2FsZSh4TWluLCB4TWF4LCB5TWluLCB5TWF4LCAwLCB0aGlzLmNhbnZhcy53aWR0aCwgMCwgdGhpcy5jYW52YXMuaGVpZ2h0KTtcbiAgICBjaXJjbGUxLnJlc2NhbGUoeE1pbiwgeE1heCwgeU1pbiwgeU1heCwgMCwgdGhpcy5jYW52YXMud2lkdGgsIDAsIHRoaXMuY2FudmFzLmhlaWdodCk7XG5cbiAgICBhcnJheVtpXS54MCA9IGNpcmNsZTAueDtcbiAgICBhcnJheVtpXS55MCA9IGNpcmNsZTAueTtcbiAgICBhcnJheVtpXS54MSA9IGNpcmNsZTEueDtcbiAgICBhcnJheVtpXS55MSA9IGNpcmNsZTEueTtcbiAgfVxufVxuXG5ob3ZlcigpIHtcbiAgaWYgKHRoaXMubW91c2VQb3NpdGlvbikge1xuICAgIHZhciByZ2IgPSB0aGlzLm1vdXNlUG9zaXRpb24uY2FudmFzQ29sb3JBdFBvaW50KHRoaXMuc2hhZG93SW1hZ2VEYXRhLCAncmdiJyk7XG4gICAgdmFyIGhleCA9IENvbG9yLnJnYlRvSGV4KHJnYik7XG4gICAgdmFyIGRlYyA9IHBhcnNlSW50KGhleCwgMTYpO1xuXG4gICAgLy8gaXMgcHJvYmFibHkgdHJpYW5nbGUgd2l0aCB0aGF0IGluZGV4LCBidXRcbiAgICAvLyBlZGdlcyBjYW4gYmUgZnV6enkgc28gZG91YmxlIGNoZWNrXG4gICAgaWYgKGRlYyA+PSAwICYmIGRlYyA8IHRoaXMudHJpYW5nbGVzLmxlbmd0aCAmJiB0aGlzLnRyaWFuZ2xlc1tkZWNdLnBvaW50SW5UcmlhbmdsZSh0aGlzLm1vdXNlUG9zaXRpb24pKSB7XG4gICAgICAvLyBjbGVhciB0aGUgbGFzdCB0cmlhbmdsZVxuICAgICAgdGhpcy5yZXNldFRyaWFuZ2xlKCk7XG5cbiAgICAgIGlmICh0aGlzLmxhc3RUcmlhbmdsZSAhPT0gZGVjKSB7XG4gICAgICAgIC8vIHJlbmRlciB0aGUgaG92ZXJlZCB0cmlhbmdsZVxuICAgICAgICB0aGlzLm9wdGlvbnMub25UcmlhbmdsZUhvdmVyKHRoaXMudHJpYW5nbGVzW2RlY10sIHRoaXMuY3R4LCB0aGlzLm9wdGlvbnMpO1xuICAgICAgfVxuXG4gICAgICB0aGlzLmxhc3RUcmlhbmdsZSA9IGRlYztcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgdGhpcy5yZXNldFRyaWFuZ2xlKCk7XG4gIH1cbn1cblxucmVzZXRUcmlhbmdsZSgpIHtcbiAgLy8gcmVkcmF3IHRoZSBsYXN0IHRyaWFuZ2xlIHRoYXQgd2FzIGhvdmVyZWQgb3ZlclxuICBpZiAodGhpcy5sYXN0VHJpYW5nbGUgJiYgdGhpcy5sYXN0VHJpYW5nbGUgPj0gMCAmJiB0aGlzLmxhc3RUcmlhbmdsZSA8IHRoaXMudHJpYW5nbGVzLmxlbmd0aCkge1xuICAgIHZhciBsYXN0VHJpYW5nbGUgPSB0aGlzLnRyaWFuZ2xlc1t0aGlzLmxhc3RUcmlhbmdsZV07XG5cbiAgICAvLyBmaW5kIHRoZSBib3VuZGluZyBwb2ludHMgb2YgdGhlIGxhc3QgdHJpYW5nbGVcbiAgICAvLyBleHBhbmQgYSBiaXQgZm9yIGVkZ2VzXG4gICAgdmFyIG1pblggPSBsYXN0VHJpYW5nbGUubWluWCgpIC0gMTtcbiAgICB2YXIgbWluWSA9IGxhc3RUcmlhbmdsZS5taW5ZKCkgLSAxO1xuICAgIHZhciBtYXhYID0gbGFzdFRyaWFuZ2xlLm1heFgoKSArIDE7XG4gICAgdmFyIG1heFkgPSBsYXN0VHJpYW5nbGUubWF4WSgpICsgMTtcblxuICAgIC8vIHJlc2V0IHRoYXQgcG9ydGlvbiBvZiB0aGUgY2FudmFzIHRvIGl0cyBvcmlnaW5hbCByZW5kZXJcbiAgICB0aGlzLmN0eC5wdXRJbWFnZURhdGEodGhpcy5yZW5kZXJlZEltYWdlRGF0YSwgMCwgMCwgbWluWCwgbWluWSwgbWF4WCAtIG1pblgsIG1heFkgLSBtaW5ZKTtcblxuICAgIHRoaXMubGFzdFRyaWFuZ2xlID0gZmFsc2U7XG4gIH1cbn1cblxucmVuZGVyKCkge1xuICB0aGlzLnJlbmRlckJhY2tncm91bmQodGhpcy5yZW5kZXJGb3JlZ3JvdW5kLmJpbmQodGhpcykpO1xufVxuXG5yZW5kZXJCYWNrZ3JvdW5kKGNhbGxiYWNrKSB7XG4gIC8vIHJlbmRlciB0aGUgYmFzZSB0byBnZXQgdHJpYW5nbGUgY29sb3JzXG4gIGlmICh0aGlzLm9wdGlvbnMuaW1hZ2VBc0JhY2tncm91bmQpIHtcbiAgICB0aGlzLnJlbmRlckltYWdlQmFja2dyb3VuZChjYWxsYmFjayk7XG4gIH0gZWxzZSB7XG4gICAgdGhpcy5yZW5kZXJHcmFkaWVudCgpO1xuICAgIGNhbGxiYWNrKCk7XG4gIH1cbn1cblxucmVuZGVyRm9yZWdyb3VuZCgpIHtcbiAgLy8gZ2V0IGVudGlyZSBjYW52YXMgaW1hZ2UgZGF0YSBvZiBpbiBhIGJpZyB0eXBlZCBhcnJheVxuICAvLyB0aGlzIHdheSB3ZSBkb250IGhhdmUgdG8gcGljayBmb3IgZWFjaCBwb2ludCBpbmRpdmlkdWFsbHlcbiAgLy8gaXQncyBsaWtlIDUweCBmYXN0ZXIgdGhpcyB3YXlcbiAgdGhpcy5ncmFkaWVudEltYWdlRGF0YSA9IHRoaXMuY3R4LmdldEltYWdlRGF0YSgwLCAwLCB0aGlzLmNhbnZhcy53aWR0aCwgdGhpcy5jYW52YXMuaGVpZ2h0KTtcblxuICAvLyByZW5kZXJzIHRyaWFuZ2xlcywgZWRnZXMsIGFuZCBzaGFkb3cgY2FudmFzIGZvciBob3ZlciBkZXRlY3Rpb25cbiAgdGhpcy5yZW5kZXJUcmlhbmdsZXModGhpcy5vcHRpb25zLnNob3dUcmlhbmdsZXMsIHRoaXMub3B0aW9ucy5zaG93RWRnZXMpO1xuXG4gIHRoaXMucmVuZGVyRXh0cmFzKCk7XG5cbiAgdGhpcy5yZW5kZXJlZEltYWdlRGF0YSA9IHRoaXMuY3R4LmdldEltYWdlRGF0YSgwLCAwLCB0aGlzLmNhbnZhcy53aWR0aCwgdGhpcy5jYW52YXMuaGVpZ2h0KTtcblxuICAvLyB0aHJvdyBldmVudHMgZm9yIGxpZ2h0IC8gZGFyayB0ZXh0XG4gIHZhciBjZW50ZXJDb2xvciA9IHRoaXMuY2VudGVyLmNhbnZhc0NvbG9yQXRQb2ludCgpO1xuXG4gIGlmIChwYXJzZUludChjZW50ZXJDb2xvci5zcGxpdCgnLCcpWzJdKSA8IDUwKSB7XG4gICAgaWYgKHRoaXMub3B0aW9ucy5vbkRhcmtCYWNrZ3JvdW5kKSB7XG4gICAgICB0aGlzLm9wdGlvbnMub25EYXJrQmFja2dyb3VuZChjZW50ZXJDb2xvcik7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGlmICh0aGlzLm9wdGlvbnMub25MaWdodEJhY2tncm91bmQpIHtcbiAgICAgIHRoaXMub3B0aW9ucy5vbkxpZ2h0QmFja2dyb3VuZChjZW50ZXJDb2xvcik7XG4gICAgfVxuICB9XG59XG5cbnJlbmRlckV4dHJhcygpIHtcbiAgaWYgKHRoaXMub3B0aW9ucy5zaG93UG9pbnRzKSB7XG4gICAgdGhpcy5yZW5kZXJQb2ludHMoKTtcbiAgfVxuXG4gIGlmICh0aGlzLm9wdGlvbnMuc2hvd0NpcmNsZXMgJiYgIXRoaXMub3B0aW9ucy5pbWFnZUFzQmFja2dyb3VuZCkge1xuICAgIHRoaXMucmVuZGVyR3JhZGllbnRDaXJjbGVzKCk7XG4gIH1cblxuICBpZiAodGhpcy5vcHRpb25zLnNob3dDZW50cm9pZHMpIHtcbiAgICB0aGlzLnJlbmRlckNlbnRyb2lkcygpO1xuICB9XG59XG5cbnJlbmRlck5ld0NvbG9ycyhjb2xvcnMpIHtcbiAgdGhpcy5jb2xvcnMgPSBjb2xvcnMgfHwgdGhpcy5jb2xvcnM7XG4gIC8vIHRyaWFuZ2xlIGNlbnRyb2lkcyBuZWVkIG5ldyBjb2xvcnNcbiAgdGhpcy5yZXNldFBvaW50Q29sb3JzKCk7XG4gIHRoaXMucmVuZGVyKCk7XG59XG5cbnJlbmRlck5ld0dyYWRpZW50KG1pbkdyYWRpZW50cywgbWF4R3JhZGllbnRzKSB7XG4gIHRoaXMuZ2VuZXJhdGVHcmFkaWVudHMobWluR3JhZGllbnRzLCBtYXhHcmFkaWVudHMpO1xuXG4gIC8vIHByZXAgZm9yIGFuaW1hdGlvblxuICB0aGlzLm5leHRHcmFkaWVudHMgPSB0aGlzLnJhZGlhbEdyYWRpZW50cy5zbGljZSgwKTtcbiAgdGhpcy5nZW5lcmF0ZUdyYWRpZW50cygpO1xuICB0aGlzLmN1cnJlbnRHcmFkaWVudHMgPSB0aGlzLnJhZGlhbEdyYWRpZW50cy5zbGljZSgwKTtcblxuICB0aGlzLnJlc2V0UG9pbnRDb2xvcnMoKTtcbiAgdGhpcy5yZW5kZXIoKTtcbn1cblxucmVuZGVyTmV3VHJpYW5nbGVzKG1pbiwgbWF4LCBtaW5FZGdlLCBtYXhFZGdlLCBtdWx0aXBsaWVyKSB7XG4gIHRoaXMuZ2VuZXJhdGVOZXdQb2ludHMobWluLCBtYXgsIG1pbkVkZ2UsIG1heEVkZ2UsIG11bHRpcGxpZXIpO1xuICB0aGlzLnRyaWFuZ3VsYXRlKCk7XG4gIHRoaXMucmVuZGVyKCk7XG59XG5cbnJlbmRlckdyYWRpZW50KCkge1xuICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMucmFkaWFsR3JhZGllbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgLy8gY3JlYXRlIHRoZSByYWRpYWwgZ3JhZGllbnQgYmFzZWQgb25cbiAgICAvLyB0aGUgZ2VuZXJhdGVkIGNpcmNsZXMnIHJhZGlpIGFuZCBvcmlnaW5zXG4gICAgdmFyIHJhZGlhbEdyYWRpZW50ID0gdGhpcy5jdHguY3JlYXRlUmFkaWFsR3JhZGllbnQoXG4gICAgICB0aGlzLnJhZGlhbEdyYWRpZW50c1tpXS54MCxcbiAgICAgIHRoaXMucmFkaWFsR3JhZGllbnRzW2ldLnkwLFxuICAgICAgdGhpcy5yYWRpYWxHcmFkaWVudHNbaV0ucjAsXG4gICAgICB0aGlzLnJhZGlhbEdyYWRpZW50c1tpXS54MSxcbiAgICAgIHRoaXMucmFkaWFsR3JhZGllbnRzW2ldLnkxLFxuICAgICAgdGhpcy5yYWRpYWxHcmFkaWVudHNbaV0ucjFcbiAgICApO1xuXG4gICAgdmFyIG91dGVyQ29sb3IgPSB0aGlzLmNvbG9yc1syXTtcblxuICAgIC8vIG11c3QgYmUgdHJhbnNwYXJlbnQgdmVyc2lvbiBvZiBtaWRkbGUgY29sb3JcbiAgICAvLyB0aGlzIHdvcmtzIGZvciByZ2JhIGFuZCBoc2xhXG4gICAgaWYgKGkgPiAwKSB7XG4gICAgICBvdXRlckNvbG9yID0gdGhpcy5jb2xvcnNbMV0uc3BsaXQoJywnKTtcbiAgICAgIG91dGVyQ29sb3JbM10gPSAnMCknO1xuICAgICAgb3V0ZXJDb2xvciA9IG91dGVyQ29sb3Iuam9pbignLCcpO1xuICAgIH1cblxuICAgIHJhZGlhbEdyYWRpZW50LmFkZENvbG9yU3RvcCgxLCB0aGlzLmNvbG9yc1swXSk7XG4gICAgcmFkaWFsR3JhZGllbnQuYWRkQ29sb3JTdG9wKHRoaXMucmFkaWFsR3JhZGllbnRzW2ldLmNvbG9yU3RvcCwgdGhpcy5jb2xvcnNbMV0pO1xuICAgIHJhZGlhbEdyYWRpZW50LmFkZENvbG9yU3RvcCgwLCBvdXRlckNvbG9yKTtcblxuICAgIHRoaXMuY2FudmFzLnBhcmVudEVsZW1lbnQuc3R5bGUuYmFja2dyb3VuZENvbG9yID0gdGhpcy5jb2xvcnNbMl07XG5cbiAgICB0aGlzLmN0eC5maWxsU3R5bGUgPSByYWRpYWxHcmFkaWVudDtcbiAgICB0aGlzLmN0eC5maWxsUmVjdCgwLCAwLCB0aGlzLmNhbnZhcy53aWR0aCwgdGhpcy5jYW52YXMuaGVpZ2h0KTtcbiAgfVxufVxuXG5yZW5kZXJJbWFnZUJhY2tncm91bmQoY2FsbGJhY2spIHtcbiAgdGhpcy5sb2FkSW1hZ2VCYWNrZ3JvdW5kKChmdW5jdGlvbigpIHtcbiAgICAvLyBzY2FsZSBpbWFnZSB0byBmaXQgd2lkdGgvaGVpZ2h0IG9mIGNhbnZhc1xuICAgIGxldCBoZWlnaHRNdWx0aXBsaWVyID0gdGhpcy5jYW52YXMuaGVpZ2h0IC8gdGhpcy5pbWFnZS5oZWlnaHQ7XG4gICAgbGV0IHdpZHRoTXVsdGlwbGllciA9IHRoaXMuY2FudmFzLndpZHRoIC8gdGhpcy5pbWFnZS53aWR0aDtcblxuICAgIGxldCBtdWx0aXBsaWVyID0gTWF0aC5tYXgoaGVpZ2h0TXVsdGlwbGllciwgd2lkdGhNdWx0aXBsaWVyKTtcblxuICAgIHRoaXMuY3R4LmRyYXdJbWFnZSh0aGlzLmltYWdlLCAwLCAwLCB0aGlzLmltYWdlLndpZHRoICogbXVsdGlwbGllciwgdGhpcy5pbWFnZS5oZWlnaHQgKiBtdWx0aXBsaWVyKTtcblxuICAgIGNhbGxiYWNrKCk7XG4gIH0pLmJpbmQodGhpcykpO1xufVxuXG5sb2FkSW1hZ2VCYWNrZ3JvdW5kKGNhbGxiYWNrKSB7XG4gIGlmICh0aGlzLmltYWdlICYmIHRoaXMuaW1hZ2Uuc3JjID09PSB0aGlzLm9wdGlvbnMuaW1hZ2VVUkwpIHtcbiAgICBjYWxsYmFjaygpO1xuICB9IGVsc2Uge1xuICAgIHRoaXMuaW1hZ2UgPSBuZXcgSW1hZ2UoKTtcbiAgICB0aGlzLmltYWdlLmNyb3NzT3JpZ2luID0gJ0Fub255bW91cyc7XG4gICAgdGhpcy5pbWFnZS5zcmMgPSB0aGlzLm9wdGlvbnMuaW1hZ2VVUkw7XG5cbiAgICB0aGlzLmltYWdlLm9ubG9hZCA9IGNhbGxiYWNrO1xuICB9XG59XG5cbnJlbmRlclRyaWFuZ2xlcyh0cmlhbmdsZXMsIGVkZ2VzKSB7XG4gIC8vIHNhdmUgdGhpcyBmb3IgbGF0ZXJcbiAgdGhpcy5jZW50ZXIuY2FudmFzQ29sb3JBdFBvaW50KHRoaXMuZ3JhZGllbnRJbWFnZURhdGEpO1xuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy50cmlhbmdsZXMubGVuZ3RoOyBpKyspIHtcbiAgICAvLyB0aGUgY29sb3IgaXMgZGV0ZXJtaW5lZCBieSBncmFiYmluZyB0aGUgY29sb3Igb2YgdGhlIGNhbnZhc1xuICAgIC8vICh3aGVyZSB3ZSBkcmV3IHRoZSBncmFkaWVudCkgYXQgdGhlIGNlbnRlciBvZiB0aGUgdHJpYW5nbGVcblxuICAgIHRoaXMudHJpYW5nbGVzW2ldLmNvbG9yID0gdGhpcy50cmlhbmdsZXNbaV0uY29sb3JBdENlbnRyb2lkKHRoaXMuZ3JhZGllbnRJbWFnZURhdGEpO1xuXG4gICAgaWYgKHRyaWFuZ2xlcyAmJiBlZGdlcykge1xuICAgICAgdGhpcy50cmlhbmdsZXNbaV0uc3Ryb2tlID0gdGhpcy5vcHRpb25zLmVkZ2VDb2xvcih0aGlzLnRyaWFuZ2xlc1tpXS5jb2xvckF0Q2VudHJvaWQodGhpcy5ncmFkaWVudEltYWdlRGF0YSkpO1xuICAgICAgdGhpcy50cmlhbmdsZXNbaV0ucmVuZGVyKHRoaXMuY3R4KTtcbiAgICB9IGVsc2UgaWYgKHRyaWFuZ2xlcykge1xuICAgICAgLy8gdHJpYW5nbGVzIG9ubHlcbiAgICAgIHRoaXMudHJpYW5nbGVzW2ldLnN0cm9rZSA9IHRoaXMudHJpYW5nbGVzW2ldLmNvbG9yO1xuICAgICAgdGhpcy50cmlhbmdsZXNbaV0ucmVuZGVyKHRoaXMuY3R4KTtcbiAgICB9IGVsc2UgaWYgKGVkZ2VzKSB7XG4gICAgICAvLyBlZGdlcyBvbmx5XG4gICAgICB0aGlzLnRyaWFuZ2xlc1tpXS5zdHJva2UgPSB0aGlzLm9wdGlvbnMuZWRnZUNvbG9yKHRoaXMudHJpYW5nbGVzW2ldLmNvbG9yQXRDZW50cm9pZCh0aGlzLmdyYWRpZW50SW1hZ2VEYXRhKSk7XG4gICAgICB0aGlzLnRyaWFuZ2xlc1tpXS5yZW5kZXIodGhpcy5jdHgsIGZhbHNlKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5ob3ZlclNoYWRvd0NhbnZhcykge1xuICAgICAgdmFyIGNvbG9yID0gJyMnICsgKCcwMDAwMDAnICsgaS50b1N0cmluZygxNikpLnNsaWNlKC02KTtcbiAgICAgIHRoaXMudHJpYW5nbGVzW2ldLnJlbmRlcih0aGlzLnNoYWRvd0N0eCwgY29sb3IsIGZhbHNlKTtcbiAgICB9XG4gIH1cblxuICBpZiAodGhpcy5ob3ZlclNoYWRvd0NhbnZhcykge1xuICAgIHRoaXMuc2hhZG93SW1hZ2VEYXRhID0gdGhpcy5zaGFkb3dDdHguZ2V0SW1hZ2VEYXRhKDAsIDAsIHRoaXMuY2FudmFzLndpZHRoLCB0aGlzLmNhbnZhcy5oZWlnaHQpO1xuICB9XG59XG5cbi8vIHJlbmRlcnMgdGhlIHBvaW50cyBvZiB0aGUgdHJpYW5nbGVzXG5yZW5kZXJQb2ludHMoKSB7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5wb2ludHMubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgY29sb3IgPSB0aGlzLm9wdGlvbnMucG9pbnRDb2xvcih0aGlzLnBvaW50c1tpXS5jYW52YXNDb2xvckF0UG9pbnQodGhpcy5ncmFkaWVudEltYWdlRGF0YSkpO1xuICAgIHRoaXMucG9pbnRzW2ldLnJlbmRlcih0aGlzLmN0eCwgY29sb3IpO1xuICB9XG59XG5cbi8vIGRyYXdzIHRoZSBjaXJjbGVzIHRoYXQgZGVmaW5lIHRoZSBncmFkaWVudHNcbnJlbmRlckdyYWRpZW50Q2lyY2xlcygpIHtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLnJhZGlhbEdyYWRpZW50cy5sZW5ndGg7IGkrKykge1xuICAgIHRoaXMuY3R4LmJlZ2luUGF0aCgpO1xuICAgIHRoaXMuY3R4LmFyYyh0aGlzLnJhZGlhbEdyYWRpZW50c1tpXS54MCxcbiAgICAgICAgICAgIHRoaXMucmFkaWFsR3JhZGllbnRzW2ldLnkwLFxuICAgICAgICAgICAgdGhpcy5yYWRpYWxHcmFkaWVudHNbaV0ucjAsXG4gICAgICAgICAgICAwLCBNYXRoLlBJICogMiwgdHJ1ZSk7XG4gICAgdmFyIGNlbnRlcjEgPSBuZXcgUG9pbnQodGhpcy5yYWRpYWxHcmFkaWVudHNbaV0ueDAsIHRoaXMucmFkaWFsR3JhZGllbnRzW2ldLnkwKTtcbiAgICB0aGlzLmN0eC5zdHJva2VTdHlsZSA9IGNlbnRlcjEuY2FudmFzQ29sb3JBdFBvaW50KHRoaXMuZ3JhZGllbnRJbWFnZURhdGEpO1xuICAgIHRoaXMuY3R4LnN0cm9rZSgpO1xuXG4gICAgdGhpcy5jdHguYmVnaW5QYXRoKCk7XG4gICAgdGhpcy5jdHguYXJjKHRoaXMucmFkaWFsR3JhZGllbnRzW2ldLngxLFxuICAgICAgICAgICAgdGhpcy5yYWRpYWxHcmFkaWVudHNbaV0ueTEsXG4gICAgICAgICAgICB0aGlzLnJhZGlhbEdyYWRpZW50c1tpXS5yMSxcbiAgICAgICAgICAgIDAsIE1hdGguUEkgKiAyLCB0cnVlKTtcbiAgICB2YXIgY2VudGVyMiA9IG5ldyBQb2ludCh0aGlzLnJhZGlhbEdyYWRpZW50c1tpXS54MSwgdGhpcy5yYWRpYWxHcmFkaWVudHNbaV0ueTEpO1xuICAgIHRoaXMuY3R4LnN0cm9rZVN0eWxlID0gY2VudGVyMi5jYW52YXNDb2xvckF0UG9pbnQodGhpcy5ncmFkaWVudEltYWdlRGF0YSk7XG4gICAgdGhpcy5jdHguc3Ryb2tlKCk7XG4gIH1cbn1cblxuLy8gcmVuZGVyIHRyaWFuZ2xlIGNlbnRyb2lkc1xucmVuZGVyQ2VudHJvaWRzKCkge1xuICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMudHJpYW5nbGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIGNvbG9yID0gdGhpcy5vcHRpb25zLmNlbnRyb2lkQ29sb3IodGhpcy50cmlhbmdsZXNbaV0uY29sb3JBdENlbnRyb2lkKHRoaXMuZ3JhZGllbnRJbWFnZURhdGEpKTtcbiAgICB0aGlzLnRyaWFuZ2xlc1tpXS5jZW50cm9pZCgpLnJlbmRlcih0aGlzLmN0eCwgY29sb3IpO1xuICB9XG59XG5cbnRvZ2dsZVRyaWFuZ2xlcygpIHtcbiAgdGhpcy5vcHRpb25zLnNob3dUcmlhbmdsZXMgPSAhdGhpcy5vcHRpb25zLnNob3dUcmlhbmdsZXM7XG4gIHRoaXMucmVuZGVyKCk7XG59XG5cbnRvZ2dsZVBvaW50cygpIHtcbiAgdGhpcy5vcHRpb25zLnNob3dQb2ludHMgPSAhdGhpcy5vcHRpb25zLnNob3dQb2ludHM7XG4gIHRoaXMucmVuZGVyKCk7XG59XG5cbnRvZ2dsZUNpcmNsZXMoKSB7XG4gIHRoaXMub3B0aW9ucy5zaG93Q2lyY2xlcyA9ICF0aGlzLm9wdGlvbnMuc2hvd0NpcmNsZXM7XG4gIHRoaXMucmVuZGVyKCk7XG59XG5cbnRvZ2dsZUNlbnRyb2lkcygpIHtcbiAgdGhpcy5vcHRpb25zLnNob3dDZW50cm9pZHMgPSAhdGhpcy5vcHRpb25zLnNob3dDZW50cm9pZHM7XG4gIHRoaXMucmVuZGVyKCk7XG59XG5cbnRvZ2dsZUVkZ2VzKCkge1xuICB0aGlzLm9wdGlvbnMuc2hvd0VkZ2VzID0gIXRoaXMub3B0aW9ucy5zaG93RWRnZXM7XG4gIHRoaXMucmVuZGVyKCk7XG59XG5cbnRvZ2dsZUFuaW1hdGlvbigpIHtcbiAgdGhpcy5vcHRpb25zLmFuaW1hdGUgPSAhdGhpcy5vcHRpb25zLmFuaW1hdGU7XG4gIGlmICh0aGlzLm9wdGlvbnMuYW5pbWF0ZSkge1xuICAgIHRoaXMuaW5pdFJlbmRlckxvb3AoKTtcbiAgfVxufVxuXG5nZXRDb2xvcnMoKSB7XG4gIHJldHVybiB0aGlzLmNvbG9ycztcbn1cbn1cblxuZnVuY3Rpb24gbGluZWFyU2NhbGUoeDAsIHgxLCBzY2FsZSkge1xucmV0dXJuIHgwICsgKHNjYWxlICogKHgxIC0geDApKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBQcmV0dHlEZWxhdW5heTtcbiIsInZhciBDb2xvcjtcblxuKGZ1bmN0aW9uKCkge1xuICAndXNlIHN0cmljdCc7XG4gIC8vIGNvbG9yIGhlbHBlciBmdW5jdGlvbnNcbiAgQ29sb3IgPSB7XG5cbiAgICBoZXhUb1JnYmE6IGZ1bmN0aW9uKGhleCkge1xuICAgICAgaGV4ID0gaGV4LnJlcGxhY2UoJyMnLCAnJyk7XG4gICAgICB2YXIgciA9IHBhcnNlSW50KGhleC5zdWJzdHJpbmcoMCwgMiksIDE2KTtcbiAgICAgIHZhciBnID0gcGFyc2VJbnQoaGV4LnN1YnN0cmluZygyLCA0KSwgMTYpO1xuICAgICAgdmFyIGIgPSBwYXJzZUludChoZXguc3Vic3RyaW5nKDQsIDYpLCAxNik7XG5cbiAgICAgIHJldHVybiAncmdiYSgnICsgciArICcsJyArIGcgKyAnLCcgKyBiICsgJywxKSc7XG4gICAgfSxcblxuICAgIGhleFRvUmdiYUFycmF5OiBmdW5jdGlvbihoZXgpIHtcbiAgICAgIGhleCA9IGhleC5yZXBsYWNlKCcjJywgJycpO1xuICAgICAgdmFyIHIgPSBwYXJzZUludChoZXguc3Vic3RyaW5nKDAsIDIpLCAxNik7XG4gICAgICB2YXIgZyA9IHBhcnNlSW50KGhleC5zdWJzdHJpbmcoMiwgNCksIDE2KTtcbiAgICAgIHZhciBiID0gcGFyc2VJbnQoaGV4LnN1YnN0cmluZyg0LCA2KSwgMTYpO1xuXG4gICAgICByZXR1cm4gW3IsIGcsIGJdO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDb252ZXJ0cyBhbiBSR0IgY29sb3IgdmFsdWUgdG8gSFNMLiBDb252ZXJzaW9uIGZvcm11bGFcbiAgICAgKiBhZGFwdGVkIGZyb20gaHR0cDovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9IU0xfY29sb3Jfc3BhY2UuXG4gICAgICogQXNzdW1lcyByLCBnLCBhbmQgYiBhcmUgY29udGFpbmVkIGluIHRoZSBzZXQgWzAsIDI1NV0gYW5kXG4gICAgICogcmV0dXJucyBoLCBzLCBhbmQgbCBpbiB0aGUgc2V0IFswLCAxXS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSAgIE51bWJlciAgciAgICAgICBUaGUgcmVkIGNvbG9yIHZhbHVlXG4gICAgICogQHBhcmFtICAgTnVtYmVyICBnICAgICAgIFRoZSBncmVlbiBjb2xvciB2YWx1ZVxuICAgICAqIEBwYXJhbSAgIE51bWJlciAgYiAgICAgICBUaGUgYmx1ZSBjb2xvciB2YWx1ZVxuICAgICAqIEByZXR1cm4gIEFycmF5ICAgICAgICAgICBUaGUgSFNMIHJlcHJlc2VudGF0aW9uXG4gICAgICovXG4gICAgcmdiVG9Ic2xhOiBmdW5jdGlvbihyZ2IpIHtcbiAgICAgIHZhciByID0gcmdiWzBdIC8gMjU1O1xuICAgICAgdmFyIGcgPSByZ2JbMV0gLyAyNTU7XG4gICAgICB2YXIgYiA9IHJnYlsyXSAvIDI1NTtcbiAgICAgIHZhciBtYXggPSBNYXRoLm1heChyLCBnLCBiKTtcbiAgICAgIHZhciBtaW4gPSBNYXRoLm1pbihyLCBnLCBiKTtcbiAgICAgIHZhciBoO1xuICAgICAgdmFyIHM7XG4gICAgICB2YXIgbCA9IChtYXggKyBtaW4pIC8gMjtcblxuICAgICAgaWYgKG1heCA9PT0gbWluKSB7XG4gICAgICAgIGggPSBzID0gMDsgLy8gYWNocm9tYXRpY1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIGQgPSBtYXggLSBtaW47XG4gICAgICAgIHMgPSBsID4gMC41ID8gZCAvICgyIC0gbWF4IC0gbWluKSA6IGQgLyAobWF4ICsgbWluKTtcbiAgICAgICAgc3dpdGNoIChtYXgpe1xuICAgICAgICAgIGNhc2UgcjogaCA9IChnIC0gYikgLyBkICsgKGcgPCBiID8gNiA6IDApOyBicmVhaztcbiAgICAgICAgICBjYXNlIGc6IGggPSAoYiAtIHIpIC8gZCArIDI7IGJyZWFrO1xuICAgICAgICAgIGNhc2UgYjogaCA9IChyIC0gZykgLyBkICsgNDsgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgaCAvPSA2O1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gJ2hzbGEoJyArIE1hdGgucm91bmQoaCAqIDM2MCkgKyAnLCcgKyBNYXRoLnJvdW5kKHMgKiAxMDApICsgJyUsJyArIE1hdGgucm91bmQobCAqIDEwMCkgKyAnJSwxKSc7XG4gICAgfSxcblxuICAgIGhzbGFBZGp1c3RBbHBoYTogZnVuY3Rpb24oY29sb3IsIGFscGhhKSB7XG4gICAgICBjb2xvciA9IGNvbG9yLnNwbGl0KCcsJyk7XG5cbiAgICAgIGlmICh0eXBlb2YgYWxwaGEgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgY29sb3JbM10gPSBhbHBoYTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbG9yWzNdID0gYWxwaGEocGFyc2VJbnQoY29sb3JbM10pKTtcbiAgICAgIH1cblxuICAgICAgY29sb3JbM10gKz0gJyknO1xuICAgICAgcmV0dXJuIGNvbG9yLmpvaW4oJywnKTtcbiAgICB9LFxuXG4gICAgaHNsYUFkanVzdExpZ2h0bmVzczogZnVuY3Rpb24oY29sb3IsIGxpZ2h0bmVzcykge1xuICAgICAgY29sb3IgPSBjb2xvci5zcGxpdCgnLCcpO1xuXG4gICAgICBpZiAodHlwZW9mIGxpZ2h0bmVzcyAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBjb2xvclsyXSA9IGxpZ2h0bmVzcztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbG9yWzJdID0gbGlnaHRuZXNzKHBhcnNlSW50KGNvbG9yWzJdKSk7XG4gICAgICB9XG5cbiAgICAgIGNvbG9yWzJdICs9ICclJztcbiAgICAgIHJldHVybiBjb2xvci5qb2luKCcsJyk7XG4gICAgfSxcblxuICAgIHJnYlRvSGV4OiBmdW5jdGlvbihyZ2IpIHtcbiAgICAgIGlmICh0eXBlb2YgcmdiID09PSAnc3RyaW5nJykge1xuICAgICAgICByZ2IgPSByZ2IucmVwbGFjZSgncmdiKCcsICcnKS5yZXBsYWNlKCcpJywgJycpLnNwbGl0KCcsJyk7XG4gICAgICB9XG4gICAgICByZ2IgPSByZ2IubWFwKGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgeCA9IHBhcnNlSW50KHgpLnRvU3RyaW5nKDE2KTtcbiAgICAgICAgcmV0dXJuICh4Lmxlbmd0aCA9PT0gMSkgPyAnMCcgKyB4IDogeDtcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIHJnYi5qb2luKCcnKTtcbiAgICB9LFxuICB9O1xuXG4gIGlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gQ29sb3I7XG4gIH1cblxufSkoKTtcbiIsInZhciBQb2ludDtcblxuKGZ1bmN0aW9uKCkge1xuICAndXNlIHN0cmljdCc7XG5cbiAgdmFyIENvbG9yID0gQ29sb3IgfHwgcmVxdWlyZSgnLi9jb2xvcicpO1xuXG4gIC8qKlxuICAgKiBSZXByZXNlbnRzIGEgcG9pbnRcbiAgICogQGNsYXNzXG4gICAqL1xuICBjbGFzcyBfUG9pbnQge1xuICAgIC8qKlxuICAgICAqIFBvaW50IGNvbnNpc3RzIHggYW5kIHlcbiAgICAgKiBAY29uc3RydWN0b3JcbiAgICAgKiBAcGFyYW0ge051bWJlcn0geFxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSB5XG4gICAgICogb3I6XG4gICAgICogQHBhcmFtIHtOdW1iZXJbXX0geFxuICAgICAqIHdoZXJlIHggaXMgbGVuZ3RoLTIgYXJyYXlcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3Rvcih4LCB5KSB7XG4gICAgICBpZiAoQXJyYXkuaXNBcnJheSh4KSkge1xuICAgICAgICB5ID0geFsxXTtcbiAgICAgICAgeCA9IHhbMF07XG4gICAgICB9XG4gICAgICB0aGlzLnggPSB4O1xuICAgICAgdGhpcy55ID0geTtcbiAgICAgIHRoaXMucmFkaXVzID0gMTtcbiAgICAgIHRoaXMuY29sb3IgPSAnYmxhY2snO1xuICAgIH1cblxuICAgIC8vIGRyYXcgdGhlIHBvaW50XG4gICAgcmVuZGVyKGN0eCwgY29sb3IpIHtcbiAgICAgIGN0eC5iZWdpblBhdGgoKTtcbiAgICAgIGN0eC5hcmModGhpcy54LCB0aGlzLnksIHRoaXMucmFkaXVzLCAwLCAyICogTWF0aC5QSSwgZmFsc2UpO1xuICAgICAgY3R4LmZpbGxTdHlsZSA9IGNvbG9yIHx8IHRoaXMuY29sb3I7XG4gICAgICBjdHguZmlsbCgpO1xuICAgICAgY3R4LmNsb3NlUGF0aCgpO1xuICAgIH1cblxuICAgIC8vIGNvbnZlcnRzIHRvIHN0cmluZ1xuICAgIC8vIHJldHVybnMgc29tZXRoaW5nIGxpa2U6XG4gICAgLy8gXCIoWCxZKVwiXG4gICAgLy8gdXNlZCBpbiB0aGUgcG9pbnRtYXAgdG8gZGV0ZWN0IHVuaXF1ZSBwb2ludHNcbiAgICB0b1N0cmluZygpIHtcbiAgICAgIHJldHVybiAnKCcgKyB0aGlzLnggKyAnLCcgKyB0aGlzLnkgKyAnKSc7XG4gICAgfVxuXG4gICAgLy8gZ3JhYiB0aGUgY29sb3Igb2YgdGhlIGNhbnZhcyBhdCB0aGUgcG9pbnRcbiAgICAvLyByZXF1aXJlcyBpbWFnZWRhdGEgZnJvbSBjYW52YXMgc28gd2UgZG9udCBncmFiXG4gICAgLy8gZWFjaCBwb2ludCBpbmRpdmlkdWFsbHksIHdoaWNoIGlzIHJlYWxseSBleHBlbnNpdmVcbiAgICBjYW52YXNDb2xvckF0UG9pbnQoaW1hZ2VEYXRhLCBjb2xvclNwYWNlKSB7XG4gICAgICBjb2xvclNwYWNlID0gY29sb3JTcGFjZSB8fCAnaHNsYSc7XG4gICAgICAvLyBvbmx5IGZpbmQgdGhlIGNhbnZhcyBjb2xvciBpZiB3ZSBkb250IGFscmVhZHkga25vdyBpdFxuICAgICAgaWYgKCF0aGlzLl9jYW52YXNDb2xvcikge1xuICAgICAgICAvLyBpbWFnZURhdGEgYXJyYXkgaXMgZmxhdCwgZ29lcyBieSByb3dzIHRoZW4gY29scywgZm91ciB2YWx1ZXMgcGVyIHBpeGVsXG4gICAgICAgIHZhciBpZHggPSAoTWF0aC5mbG9vcih0aGlzLnkpICogaW1hZ2VEYXRhLndpZHRoICogNCkgKyAoTWF0aC5mbG9vcih0aGlzLngpICogNCk7XG5cbiAgICAgICAgaWYgKGNvbG9yU3BhY2UgPT09ICdoc2xhJykge1xuICAgICAgICAgIHRoaXMuX2NhbnZhc0NvbG9yID0gQ29sb3IucmdiVG9Ic2xhKEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGltYWdlRGF0YS5kYXRhLCBpZHgsIGlkeCArIDQpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aGlzLl9jYW52YXNDb2xvciA9ICdyZ2IoJyArIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGltYWdlRGF0YS5kYXRhLCBpZHgsIGlkeCArIDMpLmpvaW4oKSArICcpJztcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2NhbnZhc0NvbG9yO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXMuX2NhbnZhc0NvbG9yO1xuICAgIH1cblxuICAgIGdldENvb3JkcygpIHtcbiAgICAgIHJldHVybiBbdGhpcy54LCB0aGlzLnldO1xuICAgIH1cblxuICAgIC8vIGRpc3RhbmNlIHRvIGFub3RoZXIgcG9pbnRcbiAgICBnZXREaXN0YW5jZVRvKHBvaW50KSB7XG4gICAgICAvLyDiiJooeDLiiJJ4MSkyKyh5MuKIknkxKTJcbiAgICAgIHJldHVybiBNYXRoLnNxcnQoTWF0aC5wb3codGhpcy54IC0gcG9pbnQueCwgMikgKyBNYXRoLnBvdyh0aGlzLnkgLSBwb2ludC55LCAyKSk7XG4gICAgfVxuXG4gICAgLy8gc2NhbGUgcG9pbnRzIGZyb20gW0EsIEJdIHRvIFtDLCBEXVxuICAgIC8vIHhBID0+IG9sZCB4IG1pbiwgeEIgPT4gb2xkIHggbWF4XG4gICAgLy8geUEgPT4gb2xkIHkgbWluLCB5QiA9PiBvbGQgeSBtYXhcbiAgICAvLyB4QyA9PiBuZXcgeCBtaW4sIHhEID0+IG5ldyB4IG1heFxuICAgIC8vIHlDID0+IG5ldyB5IG1pbiwgeUQgPT4gbmV3IHkgbWF4XG4gICAgcmVzY2FsZSh4QSwgeEIsIHlBLCB5QiwgeEMsIHhELCB5QywgeUQpIHtcbiAgICAgIC8vIE5ld1ZhbHVlID0gKCgoT2xkVmFsdWUgLSBPbGRNaW4pICogTmV3UmFuZ2UpIC8gT2xkUmFuZ2UpICsgTmV3TWluXG5cbiAgICAgIHZhciB4T2xkUmFuZ2UgPSB4QiAtIHhBO1xuICAgICAgdmFyIHlPbGRSYW5nZSA9IHlCIC0geUE7XG5cbiAgICAgIHZhciB4TmV3UmFuZ2UgPSB4RCAtIHhDO1xuICAgICAgdmFyIHlOZXdSYW5nZSA9IHlEIC0geUM7XG5cbiAgICAgIHRoaXMueCA9ICgoKHRoaXMueCAtIHhBKSAqIHhOZXdSYW5nZSkgLyB4T2xkUmFuZ2UpICsgeEM7XG4gICAgICB0aGlzLnkgPSAoKCh0aGlzLnkgLSB5QSkgKiB5TmV3UmFuZ2UpIC8geU9sZFJhbmdlKSArIHlDO1xuICAgIH1cblxuICAgIHJlc2V0Q29sb3IoKSB7XG4gICAgICB0aGlzLl9jYW52YXNDb2xvciA9IHVuZGVmaW5lZDtcbiAgICB9XG4gIH1cblxuICBpZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IF9Qb2ludDtcbiAgfVxuXG4gIFBvaW50ID0gX1BvaW50O1xufSkoKTtcbiIsInZhciBQb2ludE1hcDtcblxuKGZ1bmN0aW9uKCkge1xuICAndXNlIHN0cmljdCc7XG5cbiAgdmFyIFBvaW50ID0gUG9pbnQgfHwgcmVxdWlyZSgnLi9wb2ludCcpO1xuXG4gIC8qKlxuICAgKiBSZXByZXNlbnRzIGEgcG9pbnRcbiAgICogQGNsYXNzXG4gICAqL1xuICBjbGFzcyBfUG9pbnRNYXAge1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgdGhpcy5fbWFwID0ge307XG4gICAgfVxuXG4gICAgLy8gYWRkcyBwb2ludCB0byBtYXBcbiAgICBhZGQocG9pbnQpIHtcbiAgICAgIHRoaXMuX21hcFtwb2ludC50b1N0cmluZygpXSA9IHRydWU7XG4gICAgfVxuXG4gICAgLy8gYWRkcyB4LCB5IGNvb3JkIHRvIG1hcFxuICAgIGFkZENvb3JkKHgsIHkpIHtcbiAgICAgIHRoaXMuYWRkKG5ldyBQb2ludCh4LCB5KSk7XG4gICAgfVxuXG4gICAgLy8gcmVtb3ZlcyBwb2ludCBmcm9tIG1hcFxuICAgIHJlbW92ZShwb2ludCkge1xuICAgICAgdGhpcy5fbWFwW3BvaW50LnRvU3RyaW5nKCldID0gZmFsc2U7XG4gICAgfVxuXG4gICAgLy8gcmVtb3ZlcyB4LCB5IGNvb3JkIGZyb20gbWFwXG4gICAgcmVtb3ZlQ29vcmQoeCwgeSkge1xuICAgICAgdGhpcy5yZW1vdmUobmV3IFBvaW50KHgsIHkpKTtcbiAgICB9XG5cbiAgICAvLyBjbGVhcnMgdGhlIG1hcFxuICAgIGNsZWFyKCkge1xuICAgICAgdGhpcy5fbWFwID0ge307XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogZGV0ZXJtaW5lcyBpZiBwb2ludCBoYXMgYmVlblxuICAgICAqIGFkZGVkIHRvIG1hcCBhbHJlYWR5XG4gICAgICogIEByZXR1cm5zIHtCb29sZWFufVxuICAgICAqL1xuICAgIGV4aXN0cyhwb2ludCkge1xuICAgICAgcmV0dXJuIHRoaXMuX21hcFtwb2ludC50b1N0cmluZygpXSA/IHRydWUgOiBmYWxzZTtcbiAgICB9XG4gIH1cblxuICBpZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IF9Qb2ludE1hcDtcbiAgfVxuXG4gIFBvaW50TWFwID0gX1BvaW50TWFwO1xufSkoKTtcbiIsIihmdW5jdGlvbigpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIGZ1bmN0aW9uIHBvbHlmaWxscygpIHtcbiAgICAvLyBwb2x5ZmlsbCBmb3IgT2JqZWN0LmFzc2lnblxuICAgIGlmICh0eXBlb2YgT2JqZWN0LmFzc2lnbiAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgT2JqZWN0LmFzc2lnbiA9IGZ1bmN0aW9uKHRhcmdldCkge1xuICAgICAgICBpZiAodGFyZ2V0ID09PSB1bmRlZmluZWQgfHwgdGFyZ2V0ID09PSBudWxsKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQ2Fubm90IGNvbnZlcnQgdW5kZWZpbmVkIG9yIG51bGwgdG8gb2JqZWN0Jyk7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgb3V0cHV0ID0gT2JqZWN0KHRhcmdldCk7XG4gICAgICAgIGZvciAodmFyIGluZGV4ID0gMTsgaW5kZXggPCBhcmd1bWVudHMubGVuZ3RoOyBpbmRleCsrKSB7XG4gICAgICAgICAgdmFyIHNvdXJjZSA9IGFyZ3VtZW50c1tpbmRleF07XG4gICAgICAgICAgaWYgKHNvdXJjZSAhPT0gdW5kZWZpbmVkICYmIHNvdXJjZSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgZm9yICh2YXIgbmV4dEtleSBpbiBzb3VyY2UpIHtcbiAgICAgICAgICAgICAgaWYgKHNvdXJjZS5oYXNPd25Qcm9wZXJ0eShuZXh0S2V5KSkge1xuICAgICAgICAgICAgICAgIG91dHB1dFtuZXh0S2V5XSA9IHNvdXJjZVtuZXh0S2V5XTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gb3V0cHV0O1xuICAgICAgfTtcbiAgICB9XG4gIH1cblxuICBtb2R1bGUuZXhwb3J0cyA9IHBvbHlmaWxscztcblxufSkoKTtcbiIsInZhciBSYW5kb207XG5cbihmdW5jdGlvbigpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuICAvLyBSYW5kb20gaGVscGVyIGZ1bmN0aW9ucy8vIHJhbmRvbSBoZWxwZXIgZnVuY3Rpb25zXG5cbiAgdmFyIFBvaW50ID0gUG9pbnQgfHwgcmVxdWlyZSgnLi9wb2ludCcpO1xuXG4gIFJhbmRvbSA9IHtcbiAgICAvLyBoZXkgbG9vayBhIGNsb3N1cmVcbiAgICAvLyByZXR1cm5zIGZ1bmN0aW9uIGZvciByYW5kb20gbnVtYmVycyB3aXRoIHByZS1zZXQgbWF4IGFuZCBtaW5cbiAgICByYW5kb21OdW1iZXJGdW5jdGlvbjogZnVuY3Rpb24obWF4LCBtaW4pIHtcbiAgICAgIG1pbiA9IG1pbiB8fCAwO1xuICAgICAgaWYgKG1pbiA+IG1heCkge1xuICAgICAgICB2YXIgdGVtcCA9IG1heDtcbiAgICAgICAgbWF4ID0gbWluO1xuICAgICAgICBtaW4gPSB0ZW1wO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogKG1heCAtIG1pbiArIDEpKSArIG1pbjtcbiAgICAgIH07XG4gICAgfSxcblxuICAgIC8vIHJldHVybnMgYSByYW5kb20gbnVtYmVyXG4gICAgLy8gYmV0d2VlbiB0aGUgbWF4IGFuZCBtaW5cbiAgICByYW5kb21CZXR3ZWVuOiBmdW5jdGlvbihtYXgsIG1pbikge1xuICAgICAgbWluID0gbWluIHx8IDA7XG4gICAgICByZXR1cm4gUmFuZG9tLnJhbmRvbU51bWJlckZ1bmN0aW9uKG1heCwgbWluKSgpO1xuICAgIH0sXG5cbiAgICByYW5kb21JbkNpcmNsZTogZnVuY3Rpb24ocmFkaXVzLCBveCwgb3kpIHtcbiAgICAgIHZhciBhbmdsZSA9IE1hdGgucmFuZG9tKCkgKiBNYXRoLlBJICogMjtcbiAgICAgIHZhciByYWQgPSBNYXRoLnNxcnQoTWF0aC5yYW5kb20oKSkgKiByYWRpdXM7XG4gICAgICB2YXIgeCA9IG94ICsgcmFkICogTWF0aC5jb3MoYW5nbGUpO1xuICAgICAgdmFyIHkgPSBveSArIHJhZCAqIE1hdGguc2luKGFuZ2xlKTtcblxuICAgICAgcmV0dXJuIG5ldyBQb2ludCh4LCB5KTtcbiAgICB9LFxuXG4gICAgcmFuZG9tUmdiYTogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gJ3JnYmEoJyArIFJhbmRvbS5yYW5kb21CZXR3ZWVuKDI1NSkgKyAnLCcgK1xuICAgICAgICAgICAgICAgICAgICAgICBSYW5kb20ucmFuZG9tQmV0d2VlbigyNTUpICsgJywnICtcbiAgICAgICAgICAgICAgICAgICAgICAgUmFuZG9tLnJhbmRvbUJldHdlZW4oMjU1KSArICcsIDEpJztcbiAgICB9LFxuXG4gICAgcmFuZG9tSHNsYTogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gJ2hzbGEoJyArIFJhbmRvbS5yYW5kb21CZXR3ZWVuKDM2MCkgKyAnLCcgK1xuICAgICAgICAgICAgICAgICAgICAgICBSYW5kb20ucmFuZG9tQmV0d2VlbigxMDApICsgJyUsJyArXG4gICAgICAgICAgICAgICAgICAgICAgIFJhbmRvbS5yYW5kb21CZXR3ZWVuKDEwMCkgKyAnJSwgMSknO1xuICAgIH0sXG4gIH07XG5cbiAgaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBSYW5kb207XG4gIH1cblxufSkoKTtcbiIsInZhciBUcmlhbmdsZTtcblxuKGZ1bmN0aW9uKCkge1xuICAndXNlIHN0cmljdCc7XG5cbiAgdmFyIFBvaW50ID0gUG9pbnQgfHwgcmVxdWlyZSgnLi9wb2ludCcpO1xuXG4gIC8qKlxuICAgKiBSZXByZXNlbnRzIGEgdHJpYW5nbGVcbiAgICogQGNsYXNzXG4gICAqL1xuICBjbGFzcyBfVHJpYW5nbGUge1xuICAgIC8qKlxuICAgICAqIFRyaWFuZ2xlIGNvbnNpc3RzIG9mIHRocmVlIFBvaW50c1xuICAgICAqIEBjb25zdHJ1Y3RvclxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBhXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGJcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gY1xuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKGEsIGIsIGMpIHtcbiAgICAgIHRoaXMucDEgPSB0aGlzLmEgPSBhO1xuICAgICAgdGhpcy5wMiA9IHRoaXMuYiA9IGI7XG4gICAgICB0aGlzLnAzID0gdGhpcy5jID0gYztcblxuICAgICAgdGhpcy5jb2xvciA9ICdibGFjayc7XG4gICAgICB0aGlzLnN0cm9rZSA9ICdibGFjayc7XG4gICAgfVxuXG4gICAgLy8gZHJhdyB0aGUgdHJpYW5nbGUgd2l0aCBkaWZmZXJpbmcgZWRnZSBjb2xvcnMgb3B0aW9uYWxcbiAgICByZW5kZXIoY3R4LCBjb2xvciwgc3Ryb2tlKSB7XG4gICAgICBjdHguYmVnaW5QYXRoKCk7XG4gICAgICBjdHgubW92ZVRvKHRoaXMuYS54LCB0aGlzLmEueSk7XG4gICAgICBjdHgubGluZVRvKHRoaXMuYi54LCB0aGlzLmIueSk7XG4gICAgICBjdHgubGluZVRvKHRoaXMuYy54LCB0aGlzLmMueSk7XG4gICAgICBjdHguY2xvc2VQYXRoKCk7XG4gICAgICBjdHguc3Ryb2tlU3R5bGUgPSBzdHJva2UgfHwgdGhpcy5zdHJva2UgfHwgdGhpcy5jb2xvcjtcbiAgICAgIGN0eC5maWxsU3R5bGUgPSBjb2xvciB8fCB0aGlzLmNvbG9yO1xuICAgICAgaWYgKGNvbG9yICE9PSBmYWxzZSAmJiBzdHJva2UgIT09IGZhbHNlKSB7XG4gICAgICAgIC8vIGRyYXcgdGhlIHN0cm9rZSB1c2luZyB0aGUgZmlsbCBjb2xvciBmaXJzdFxuICAgICAgICAvLyBzbyB0aGF0IHRoZSBwb2ludHMgb2YgYWRqYWNlbnQgdHJpYW5nbGVzXG4gICAgICAgIC8vIGRvbnQgb3ZlcmxhcCBhIGJ1bmNoIGFuZCBsb29rIFwic3RhcnJ5XCJcbiAgICAgICAgdmFyIHRlbXBTdHJva2UgPSBjdHguc3Ryb2tlU3R5bGU7XG4gICAgICAgIGN0eC5zdHJva2VTdHlsZSA9IGN0eC5maWxsU3R5bGU7XG4gICAgICAgIGN0eC5zdHJva2UoKTtcbiAgICAgICAgY3R4LnN0cm9rZVN0eWxlID0gdGVtcFN0cm9rZTtcbiAgICAgIH1cbiAgICAgIGlmIChjb2xvciAhPT0gZmFsc2UpIHtcbiAgICAgICAgY3R4LmZpbGwoKTtcbiAgICAgIH1cbiAgICAgIGlmIChzdHJva2UgIT09IGZhbHNlKSB7XG4gICAgICAgIGN0eC5zdHJva2UoKTtcbiAgICAgIH1cbiAgICAgIGN0eC5jbG9zZVBhdGgoKTtcbiAgICB9XG5cbiAgICAvLyByYW5kb20gcG9pbnQgaW5zaWRlIHRyaWFuZ2xlXG4gICAgcmFuZG9tSW5zaWRlKCkge1xuICAgICAgdmFyIHIxID0gTWF0aC5yYW5kb20oKTtcbiAgICAgIHZhciByMiA9IE1hdGgucmFuZG9tKCk7XG4gICAgICB2YXIgeCA9ICgxIC0gTWF0aC5zcXJ0KHIxKSkgKlxuICAgICAgICAgICAgICB0aGlzLnAxLnggKyAoTWF0aC5zcXJ0KHIxKSAqXG4gICAgICAgICAgICAgICgxIC0gcjIpKSAqXG4gICAgICAgICAgICAgIHRoaXMucDIueCArIChNYXRoLnNxcnQocjEpICogcjIpICpcbiAgICAgICAgICAgICAgdGhpcy5wMy54O1xuICAgICAgdmFyIHkgPSAoMSAtIE1hdGguc3FydChyMSkpICpcbiAgICAgICAgICAgICAgdGhpcy5wMS55ICsgKE1hdGguc3FydChyMSkgKlxuICAgICAgICAgICAgICAoMSAtIHIyKSkgKlxuICAgICAgICAgICAgICB0aGlzLnAyLnkgKyAoTWF0aC5zcXJ0KHIxKSAqIHIyKSAqXG4gICAgICAgICAgICAgIHRoaXMucDMueTtcbiAgICAgIHJldHVybiBuZXcgUG9pbnQoeCwgeSk7XG4gICAgfVxuXG4gICAgY29sb3JBdENlbnRyb2lkKGltYWdlRGF0YSkge1xuICAgICAgcmV0dXJuIHRoaXMuY2VudHJvaWQoKS5jYW52YXNDb2xvckF0UG9pbnQoaW1hZ2VEYXRhKTtcbiAgICB9XG5cbiAgICByZXNldFBvaW50Q29sb3JzKCkge1xuICAgICAgdGhpcy5jZW50cm9pZCgpLnJlc2V0Q29sb3IoKTtcbiAgICAgIHRoaXMucDEucmVzZXRDb2xvcigpO1xuICAgICAgdGhpcy5wMi5yZXNldENvbG9yKCk7XG4gICAgICB0aGlzLnAzLnJlc2V0Q29sb3IoKTtcbiAgICB9XG5cbiAgICBjZW50cm9pZCgpIHtcbiAgICAgIC8vIG9ubHkgY2FsYyB0aGUgY2VudHJvaWQgaWYgd2UgZG9udCBhbHJlYWR5IGtub3cgaXRcbiAgICAgIGlmICh0aGlzLl9jZW50cm9pZCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fY2VudHJvaWQ7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgeCA9IE1hdGgucm91bmQoKHRoaXMucDEueCArIHRoaXMucDIueCArIHRoaXMucDMueCkgLyAzKTtcbiAgICAgICAgdmFyIHkgPSBNYXRoLnJvdW5kKCh0aGlzLnAxLnkgKyB0aGlzLnAyLnkgKyB0aGlzLnAzLnkpIC8gMyk7XG4gICAgICAgIHRoaXMuX2NlbnRyb2lkID0gbmV3IFBvaW50KHgsIHkpO1xuXG4gICAgICAgIHJldHVybiB0aGlzLl9jZW50cm9pZDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzEzMzAwOTA0L2RldGVybWluZS13aGV0aGVyLXBvaW50LWxpZXMtaW5zaWRlLXRyaWFuZ2xlXG4gICAgcG9pbnRJblRyaWFuZ2xlKHBvaW50KSB7XG4gICAgICB2YXIgYWxwaGEgPSAoKHRoaXMucDIueSAtIHRoaXMucDMueSkgKiAocG9pbnQueCAtIHRoaXMucDMueCkgKyAodGhpcy5wMy54IC0gdGhpcy5wMi54KSAqIChwb2ludC55IC0gdGhpcy5wMy55KSkgL1xuICAgICAgICAgICAgICAgICgodGhpcy5wMi55IC0gdGhpcy5wMy55KSAqICh0aGlzLnAxLnggLSB0aGlzLnAzLngpICsgKHRoaXMucDMueCAtIHRoaXMucDIueCkgKiAodGhpcy5wMS55IC0gdGhpcy5wMy55KSk7XG4gICAgICB2YXIgYmV0YSA9ICgodGhpcy5wMy55IC0gdGhpcy5wMS55KSAqIChwb2ludC54IC0gdGhpcy5wMy54KSArICh0aGlzLnAxLnggLSB0aGlzLnAzLngpICogKHBvaW50LnkgLSB0aGlzLnAzLnkpKSAvXG4gICAgICAgICAgICAgICAoKHRoaXMucDIueSAtIHRoaXMucDMueSkgKiAodGhpcy5wMS54IC0gdGhpcy5wMy54KSArICh0aGlzLnAzLnggLSB0aGlzLnAyLngpICogKHRoaXMucDEueSAtIHRoaXMucDMueSkpO1xuICAgICAgdmFyIGdhbW1hID0gMS4wIC0gYWxwaGEgLSBiZXRhO1xuXG4gICAgICByZXR1cm4gKGFscGhhID4gMCAmJiBiZXRhID4gMCAmJiBnYW1tYSA+IDApO1xuICAgIH1cblxuICAgIC8vIHNjYWxlIHBvaW50cyBmcm9tIFtBLCBCXSB0byBbQywgRF1cbiAgICAvLyB4QSA9PiBvbGQgeCBtaW4sIHhCID0+IG9sZCB4IG1heFxuICAgIC8vIHlBID0+IG9sZCB5IG1pbiwgeUIgPT4gb2xkIHkgbWF4XG4gICAgLy8geEMgPT4gbmV3IHggbWluLCB4RCA9PiBuZXcgeCBtYXhcbiAgICAvLyB5QyA9PiBuZXcgeSBtaW4sIHlEID0+IG5ldyB5IG1heFxuICAgIHJlc2NhbGVQb2ludHMoeEEsIHhCLCB5QSwgeUIsIHhDLCB4RCwgeUMsIHlEKSB7XG4gICAgICB0aGlzLnAxLnJlc2NhbGUoeEEsIHhCLCB5QSwgeUIsIHhDLCB4RCwgeUMsIHlEKTtcbiAgICAgIHRoaXMucDIucmVzY2FsZSh4QSwgeEIsIHlBLCB5QiwgeEMsIHhELCB5QywgeUQpO1xuICAgICAgdGhpcy5wMy5yZXNjYWxlKHhBLCB4QiwgeUEsIHlCLCB4QywgeEQsIHlDLCB5RCk7XG4gICAgICAvLyByZWNhbGN1bGF0ZSB0aGUgY2VudHJvaWRcbiAgICAgIHRoaXMuY2VudHJvaWQoKTtcbiAgICB9XG5cbiAgICBtYXhYKCkge1xuICAgICAgcmV0dXJuIE1hdGgubWF4KHRoaXMucDEueCwgdGhpcy5wMi54LCB0aGlzLnAzLngpO1xuICAgIH1cblxuICAgIG1heFkoKSB7XG4gICAgICByZXR1cm4gTWF0aC5tYXgodGhpcy5wMS55LCB0aGlzLnAyLnksIHRoaXMucDMueSk7XG4gICAgfVxuXG4gICAgbWluWCgpIHtcbiAgICAgIHJldHVybiBNYXRoLm1pbih0aGlzLnAxLngsIHRoaXMucDIueCwgdGhpcy5wMy54KTtcbiAgICB9XG5cbiAgICBtaW5ZKCkge1xuICAgICAgcmV0dXJuIE1hdGgubWluKHRoaXMucDEueSwgdGhpcy5wMi55LCB0aGlzLnAzLnkpO1xuICAgIH1cblxuICAgIGdldFBvaW50cygpIHtcbiAgICAgIHJldHVybiBbdGhpcy5wMSwgdGhpcy5wMiwgdGhpcy5wM107XG4gICAgfVxuICB9XG5cbiAgaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBfVHJpYW5nbGU7XG4gIH1cblxuICBUcmlhbmdsZSA9IF9UcmlhbmdsZTtcbn0pKCk7XG4iLCIoZnVuY3Rpb24oKSB7XG4gICd1c2Ugc3RyaWN0JztcblxuICB2YXIgUHJldHR5RGVsYXVuYXkgID0gcmVxdWlyZSgnLi9QcmV0dHlEZWxhdW5heScpO1xuICB2YXIgQ29sb3IgID0gcmVxdWlyZSgnLi9QcmV0dHlEZWxhdW5heS9jb2xvcicpO1xuICB2YXIgUmFuZG9tID0gcmVxdWlyZSgnLi9QcmV0dHlEZWxhdW5heS9yYW5kb20nKTtcblxuICB2YXIgQ29va2llcyA9IHtcbiAgICBnZXRJdGVtOiBmdW5jdGlvbihzS2V5KSB7XG4gICAgICBpZiAoIXNLZXkpIHsgcmV0dXJuIG51bGw7IH1cbiAgICAgIHJldHVybiBkZWNvZGVVUklDb21wb25lbnQoXG4gICAgICAgIGRvY3VtZW50LmNvb2tpZS5yZXBsYWNlKFxuICAgICAgICAgIG5ldyBSZWdFeHAoXG4gICAgICAgICAgICAgICcoPzooPzpefC4qOylcXFxccyonICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICtcbiAgICAgICAgICAgICAgZW5jb2RlVVJJQ29tcG9uZW50KHNLZXkpLnJlcGxhY2UoL1tcXC1cXC5cXCtcXCpdL2csICdcXFxcJCYnKSAgICtcbiAgICAgICAgICAgICAgJ1xcXFxzKlxcXFw9XFxcXHMqKFteO10qKS4qJCl8Xi4qJCcpLCAnJDEnKVxuICAgICAgICAgICAgKSB8fCBudWxsO1xuICAgIH0sXG5cbiAgICBzZXRJdGVtOiBmdW5jdGlvbihzS2V5LCBzVmFsdWUsIHZFbmQsIHNQYXRoLCBzRG9tYWluLCBiU2VjdXJlKSB7XG4gICAgICBpZiAoIXNLZXkgfHwgL14oPzpleHBpcmVzfG1heFxcLWFnZXxwYXRofGRvbWFpbnxzZWN1cmUpJC9pLnRlc3Qoc0tleSkpIHsgcmV0dXJuIGZhbHNlOyB9XG4gICAgICB2YXIgc0V4cGlyZXMgPSAnJztcbiAgICAgIGlmICh2RW5kKSB7XG4gICAgICAgIHN3aXRjaCAodkVuZC5jb25zdHJ1Y3Rvcikge1xuICAgICAgICAgIGNhc2UgTnVtYmVyOlxuICAgICAgICAgICAgc0V4cGlyZXMgPSB2RW5kID09PSBJbmZpbml0eSA/ICc7IGV4cGlyZXM9RnJpLCAzMSBEZWMgOTk5OSAyMzo1OTo1OSBHTVQnIDogJzsgbWF4LWFnZT0nICsgdkVuZDtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGNhc2UgU3RyaW5nOlxuICAgICAgICAgICAgc0V4cGlyZXMgPSAnOyBleHBpcmVzPScgKyB2RW5kO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgY2FzZSBEYXRlOlxuICAgICAgICAgICAgc0V4cGlyZXMgPSAnOyBleHBpcmVzPScgKyB2RW5kLnRvVVRDU3RyaW5nKCk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgZG9jdW1lbnQuY29va2llID0gZW5jb2RlVVJJQ29tcG9uZW50KHNLZXkpICtcbiAgICAgICAgJz0nICtcbiAgICAgICAgZW5jb2RlVVJJQ29tcG9uZW50KHNWYWx1ZSkgK1xuICAgICAgICBzRXhwaXJlcyArXG4gICAgICAgIChzRG9tYWluID8gJzsgZG9tYWluPScgK1xuICAgICAgICBzRG9tYWluIDogJycpICtcbiAgICAgICAgKHNQYXRoID8gJzsgcGF0aD0nICtcbiAgICAgICAgc1BhdGggOiAnJykgK1xuICAgICAgICAoYlNlY3VyZSA/ICc7IHNlY3VyZScgOiAnJyk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9LFxuXG4gICAgcmVtb3ZlSXRlbTogZnVuY3Rpb24oc0tleSwgc1BhdGgsIHNEb21haW4pIHtcbiAgICAgIGlmICghdGhpcy5oYXNJdGVtKHNLZXkpKSB7IHJldHVybiBmYWxzZTsgfVxuICAgICAgZG9jdW1lbnQuY29va2llID0gZW5jb2RlVVJJQ29tcG9uZW50KHNLZXkpICAgICtcbiAgICAgICAgJz07IGV4cGlyZXM9VGh1LCAwMSBKYW4gMTk3MCAwMDowMDowMCBHTVQnICArXG4gICAgICAgIChzRG9tYWluID8gJzsgZG9tYWluPScgKyBzRG9tYWluIDogJycpICAgICAgK1xuICAgICAgICAoc1BhdGggICA/ICc7IHBhdGg9JyAgICsgc1BhdGggICA6ICcnKTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0sXG5cbiAgICBoYXNJdGVtOiBmdW5jdGlvbihzS2V5KSB7XG4gICAgICBpZiAoIXNLZXkpIHsgcmV0dXJuIGZhbHNlOyB9XG4gICAgICByZXR1cm4gKG5ldyBSZWdFeHAoJyg/Ol58O1xcXFxzKiknICsgZW5jb2RlVVJJQ29tcG9uZW50KHNLZXkpXG4gICAgICAgIC5yZXBsYWNlKC9bXFwtXFwuXFwrXFwqXS9nLCAnXFxcXCQmJykgKyAnXFxcXHMqXFxcXD0nKSlcbiAgICAgICAgLnRlc3QoZG9jdW1lbnQuY29va2llKTtcbiAgICB9LFxuXG4gICAga2V5czogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgYUtleXMgPSBkb2N1bWVudC5jb29raWUucmVwbGFjZSgvKCg/Ol58XFxzKjspW15cXD1dKykoPz07fCQpfF5cXHMqfFxccyooPzpcXD1bXjtdKik/KD86XFwxfCQpL2csICcnKVxuICAgICAgICAuc3BsaXQoL1xccyooPzpcXD1bXjtdKik/O1xccyovKTtcbiAgICAgIGZvciAodmFyIG5MZW4gPSBhS2V5cy5sZW5ndGgsIG5JZHggPSAwOyBuSWR4IDwgbkxlbjsgbklkeCsrKSB7IGFLZXlzW25JZHhdID0gZGVjb2RlVVJJQ29tcG9uZW50KGFLZXlzW25JZHhdKTsgfVxuICAgICAgcmV0dXJuIGFLZXlzO1xuICAgIH0sXG4gIH07XG5cbiAgLy8gc2V0IHVwIHZhcmlhYmxlcyBmb3IgY2FudmFzLCBpbnB1dHMsIGV0Y1xuICBjb25zdCBjYW52YXMgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY2FudmFzJyk7XG5cbiAgY29uc3QgYnV0dG9uID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2J1dHRvbicpO1xuXG4gIGNvbnN0IGdlbmVyYXRlQ29sb3JzQnV0dG9uID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2dlbmVyYXRlQ29sb3JzJyk7XG4gIGNvbnN0IGdlbmVyYXRlR3JhZGllbnRCdXR0b24gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZ2VuZXJhdGVHcmFkaWVudCcpO1xuICBjb25zdCBnZW5lcmF0ZVRyaWFuZ2xlc0J1dHRvbiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdnZW5lcmF0ZVRyaWFuZ2xlcycpO1xuXG4gIGNvbnN0IHRvZ2dsZVRyaWFuZ2xlc0J1dHRvbiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCd0b2dnbGVUcmlhbmdsZXMnKTtcbiAgY29uc3QgdG9nZ2xlUG9pbnRzQnV0dG9uID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3RvZ2dsZVBvaW50cycpO1xuICBjb25zdCB0b2dnbGVDaXJjbGVzQnV0dG9uID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3RvZ2dsZUNpcmNsZXMnKTtcbiAgY29uc3QgdG9nZ2xlQ2VudHJvaWRzQnV0dG9uID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3RvZ2dsZUNlbnRyb2lkcycpO1xuICBjb25zdCB0b2dnbGVFZGdlc0J1dHRvbiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCd0b2dnbGVFZGdlcycpO1xuICBjb25zdCB0b2dnbGVBbmltYXRpb25CdXR0b24gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgndG9nZ2xlQW5pbWF0aW9uJyk7XG5cbiAgY29uc3QgZm9ybSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdmb3JtJyk7XG4gIGNvbnN0IG11bHRpcGxpZXJSYWRpbyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdwb2ludEdlbjEnKTtcbiAgY29uc3QgbXVsdGlwbGllcklucHV0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3BvaW50c011bHRpcGxpZXInKTtcbiAgY29uc3QgbWF4SW5wdXQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbWF4UG9pbnRzJyk7XG4gIGNvbnN0IG1pbklucHV0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ21pblBvaW50cycpO1xuICBjb25zdCBtYXhFZGdlSW5wdXQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbWF4RWRnZVBvaW50cycpO1xuICBjb25zdCBtaW5FZGdlSW5wdXQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbWluRWRnZVBvaW50cycpO1xuICBjb25zdCBtYXhHcmFkaWVudElucHV0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ21heEdyYWRpZW50cycpO1xuICBjb25zdCBtaW5HcmFkaWVudElucHV0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ21pbkdyYWRpZW50cycpO1xuXG4gIGNvbnN0IGltYWdlQmFja2dyb3VuZFVwbG9hZCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdpbWFnZUJhY2tncm91bmRVcGxvYWQnKTtcbiAgY29uc3QgaW1hZ2VCYWNrZ3JvdW5kSW5wdXQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnaW1hZ2VCYWNrZ3JvdW5kSW5wdXQnKTtcblxuICBsZXQgbWluUG9pbnRzLCBtYXhQb2ludHMsIG1pbkVkZ2VQb2ludHMsIG1heEVkZ2VQb2ludHMsIG1pbkdyYWRpZW50cywgbWF4R3JhZGllbnRzLCBtdWx0aXBsaWVyLCBjb2xvcnMsIGltYWdlO1xuXG4gIGxldCBzaG93VHJpYW5nbGVzLCBzaG93UG9pbnRzLCBzaG93Q2lyY2xlcywgc2hvd0NlbnRyb2lkcywgc2hvd0VkZ2VzLCBzaG93QW5pbWF0aW9uO1xuXG4gIGNvbnN0IG9wdGlvbnMgPSB7XG4gICAgb25EYXJrQmFja2dyb3VuZDogZnVuY3Rpb24oKSB7XG4gICAgICBmb3JtLmNsYXNzTmFtZSA9ICdmb3JtIGxpZ2h0JztcbiAgICB9LFxuICAgIG9uTGlnaHRCYWNrZ3JvdW5kOiBmdW5jdGlvbigpIHtcbiAgICAgIGZvcm0uY2xhc3NOYW1lID0gJ2Zvcm0gZGFyayc7XG4gICAgfSxcbiAgfTtcblxuICBnZXRDb29raWVzKCk7XG5cbiAgLy8gaW5pdGlhbGl6ZSB0aGUgUHJldHR5RGVsYXVuYXkgb2JqZWN0XG4gIGxldCBwcmV0dHlEZWxhdW5heSA9IG5ldyBQcmV0dHlEZWxhdW5heShjYW52YXMsIG9wdGlvbnMpO1xuXG4gIC8vIGluaXRpYWwgZ2VuZXJhdGlvblxuICBydW5EZWxhdW5heSgpO1xuXG4gIC8qKlxuICAgKiB1dGlsIGZ1bmN0aW9uc1xuICAgKi9cblxuICAvLyBnZXQgb3B0aW9ucyBhbmQgcmUtcmFuZG9taXplXG4gIGZ1bmN0aW9uIHJ1bkRlbGF1bmF5KCkge1xuICAgIGdldFJhbmRvbWl6ZU9wdGlvbnMoKTtcbiAgICBwcmV0dHlEZWxhdW5heS5yYW5kb21pemUobWluUG9pbnRzLCBtYXhQb2ludHMsIG1pbkVkZ2VQb2ludHMsIG1heEVkZ2VQb2ludHMsIG1pbkdyYWRpZW50cywgbWF4R3JhZGllbnRzLCBtdWx0aXBsaWVyLCBjb2xvcnMsIGltYWdlKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldENvbG9ycygpIHtcbiAgICB2YXIgY29sb3JzID0gW107XG5cbiAgICBpZiAoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NvbG9yVHlwZTEnKS5jaGVja2VkKSB7XG4gICAgICAvLyBnZW5lcmF0ZSByYW5kb20gY29sb3JzXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IDM7IGkrKykge1xuICAgICAgICB2YXIgY29sb3IgPSBSYW5kb20ucmFuZG9tSHNsYSgpO1xuICAgICAgICBjb2xvcnMucHVzaChjb2xvcik7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIHVzZSB0aGUgb25lcyBpbiB0aGUgaW5wdXRzXG4gICAgICBjb2xvcnMucHVzaChDb2xvci5yZ2JUb0hzbGEoQ29sb3IuaGV4VG9SZ2JhQXJyYXkoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NvbG9yMScpLnZhbHVlKSkpO1xuICAgICAgY29sb3JzLnB1c2goQ29sb3IucmdiVG9Ic2xhKENvbG9yLmhleFRvUmdiYUFycmF5KGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjb2xvcjInKS52YWx1ZSkpKTtcbiAgICAgIGNvbG9ycy5wdXNoKENvbG9yLnJnYlRvSHNsYShDb2xvci5oZXhUb1JnYmFBcnJheShkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY29sb3IzJykudmFsdWUpKSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGNvbG9ycztcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldEltYWdlKCkge1xuICAgIGlmICghZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NvbG9yVHlwZTMnKS5jaGVja2VkKSB7XG4gICAgICByZXR1cm4gJyc7XG4gICAgfVxuXG4gICAgaWYgKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdpbWFnZUJhY2tncm91bmQxJykuY2hlY2tlZCAmJiBpbWFnZUJhY2tncm91bmRVcGxvYWQuZmlsZXMubGVuZ3RoKSB7XG4gICAgICBsZXQgZmlsZSA9IGltYWdlQmFja2dyb3VuZFVwbG9hZC5maWxlc1swXTtcbiAgICAgIHJldHVybiB3aW5kb3cuVVJMLmNyZWF0ZU9iamVjdFVSTChmaWxlKTtcbiAgICB9IGVsc2UgaWYgKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdpbWFnZUJhY2tncm91bmQyJykuY2hlY2tlZCkge1xuICAgICAgcmV0dXJuIGltYWdlQmFja2dyb3VuZElucHV0LnZhbHVlO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gJyc7XG4gICAgfVxuICB9XG5cbiAgLy8gZ2V0IG9wdGlvbnMgZnJvbSBjb29raWVzXG4gIGZ1bmN0aW9uIGdldENvb2tpZXMoKSB7XG4gICAgdmFyIGRlZmF1bHRzID0gUHJldHR5RGVsYXVuYXkuZGVmYXVsdHMoKTtcblxuICAgIHNob3dUcmlhbmdsZXMgPSBDb29raWVzLmdldEl0ZW0oJ0RlbGF1bmF5U2hvd1RyaWFuZ2xlcycpO1xuICAgIHNob3dQb2ludHMgICAgPSBDb29raWVzLmdldEl0ZW0oJ0RlbGF1bmF5U2hvd1BvaW50cycpO1xuICAgIHNob3dDaXJjbGVzICAgPSBDb29raWVzLmdldEl0ZW0oJ0RlbGF1bmF5U2hvd0NpcmNsZXMnKTtcbiAgICBzaG93Q2VudHJvaWRzID0gQ29va2llcy5nZXRJdGVtKCdEZWxhdW5heVNob3dDZW50cm9pZHMnKTtcbiAgICBzaG93RWRnZXMgICAgID0gQ29va2llcy5nZXRJdGVtKCdEZWxhdW5heVNob3dFZGdlcycpO1xuICAgIHNob3dBbmltYXRpb24gPSBDb29raWVzLmdldEl0ZW0oJ0RlbGF1bmF5U2hvd0FuaW1hdGlvbicpO1xuXG4gICAgLy8gVE9ETzogRFJZXG4gICAgLy8gb25seSBzZXQgb3B0aW9uIGZyb20gY29va2llIGlmIGl0IGV4aXN0cywgcGFyc2UgdG8gYm9vbGVhblxuICAgIGlmIChzaG93VHJpYW5nbGVzKSB7XG4gICAgICBvcHRpb25zLnNob3dUcmlhbmdsZXMgPSBzaG93VHJpYW5nbGVzID0gc2hvd1RyaWFuZ2xlcyA9PT0gJ3RydWUnID8gdHJ1ZSA6IGZhbHNlO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBzYXZlIG9wdGlvbiBzdGF0ZSBmb3Igc2V0dGluZyBjb29raWUgbGF0ZXJcbiAgICAgIHNob3dUcmlhbmdsZXMgPSBkZWZhdWx0cy5zaG93VHJpYW5nbGVzO1xuICAgIH1cblxuICAgIGlmIChzaG93UG9pbnRzKSB7XG4gICAgICBvcHRpb25zLnNob3dQb2ludHMgPSBzaG93UG9pbnRzID0gc2hvd1BvaW50cyA9PT0gJ3RydWUnID8gdHJ1ZSA6IGZhbHNlO1xuICAgIH0gZWxzZSB7XG4gICAgICBzaG93UG9pbnRzID0gZGVmYXVsdHMuc2hvd1BvaW50cztcbiAgICB9XG5cbiAgICBpZiAoc2hvd0NpcmNsZXMpIHtcbiAgICAgIG9wdGlvbnMuc2hvd0NpcmNsZXMgPSBzaG93Q2lyY2xlcyA9IHNob3dDaXJjbGVzID09PSAndHJ1ZScgPyB0cnVlIDogZmFsc2U7XG4gICAgfSBlbHNlIHtcbiAgICAgIHNob3dDaXJjbGVzID0gZGVmYXVsdHMuc2hvd0NpcmNsZXM7XG4gICAgfVxuXG4gICAgaWYgKHNob3dDZW50cm9pZHMpIHtcbiAgICAgIG9wdGlvbnMuc2hvd0NlbnRyb2lkcyA9IHNob3dDZW50cm9pZHMgPSBzaG93Q2VudHJvaWRzID09PSAndHJ1ZScgPyB0cnVlIDogZmFsc2U7XG4gICAgfSBlbHNlIHtcbiAgICAgIHNob3dDZW50cm9pZHMgPSBkZWZhdWx0cy5zaG93Q2VudHJvaWRzO1xuICAgIH1cblxuICAgIGlmIChzaG93RWRnZXMpIHtcbiAgICAgIG9wdGlvbnMuc2hvd0VkZ2VzID0gc2hvd0VkZ2VzID0gc2hvd0VkZ2VzID09PSAndHJ1ZScgPyB0cnVlIDogZmFsc2U7XG4gICAgfSBlbHNlIHtcbiAgICAgIHNob3dFZGdlcyA9IGRlZmF1bHRzLnNob3dFZGdlcztcbiAgICB9XG5cbiAgICBpZiAoc2hvd0FuaW1hdGlvbikge1xuICAgICAgb3B0aW9ucy5zaG93QW5pbWF0aW9uID0gc2hvd0FuaW1hdGlvbiA9IHNob3dBbmltYXRpb24gPT09ICd0cnVlJyA/IHRydWUgOiBmYWxzZTtcbiAgICB9IGVsc2Uge1xuICAgICAgc2hvd0FuaW1hdGlvbiA9IGRlZmF1bHRzLnNob3dBbmltYXRpb247XG4gICAgfVxuICB9XG5cbiAgLy8gZ2V0IG9wdGlvbnMgZnJvbSBpbnB1dCBmaWVsZHNcbiAgZnVuY3Rpb24gZ2V0UmFuZG9taXplT3B0aW9ucygpIHtcbiAgICB2YXIgdXNlTXVsdGlwbGllciA9IG11bHRpcGxpZXJSYWRpby5jaGVja2VkO1xuICAgIG11bHRpcGxpZXIgPSBwYXJzZUZsb2F0KG11bHRpcGxpZXJJbnB1dC52YWx1ZSk7XG4gICAgbWluUG9pbnRzID0gdXNlTXVsdGlwbGllciA/IDAgOiBwYXJzZUludChtaW5JbnB1dC52YWx1ZSk7XG4gICAgbWF4UG9pbnRzID0gdXNlTXVsdGlwbGllciA/IDAgOiBwYXJzZUludChtYXhJbnB1dC52YWx1ZSk7XG4gICAgbWluRWRnZVBvaW50cyA9IHVzZU11bHRpcGxpZXIgPyAwIDogcGFyc2VJbnQobWluRWRnZUlucHV0LnZhbHVlKTtcbiAgICBtYXhFZGdlUG9pbnRzID0gdXNlTXVsdGlwbGllciA/IDAgOiBwYXJzZUludChtYXhFZGdlSW5wdXQudmFsdWUpO1xuICAgIG1pbkdyYWRpZW50cyA9IHBhcnNlSW50KG1pbkdyYWRpZW50SW5wdXQudmFsdWUpO1xuICAgIG1heEdyYWRpZW50cyA9IHBhcnNlSW50KG1heEdyYWRpZW50SW5wdXQudmFsdWUpO1xuICAgIGNvbG9ycyA9IGdldENvbG9ycygpO1xuICAgIGltYWdlID0gZ2V0SW1hZ2UoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBzZXQgdXAgZXZlbnRzXG4gICAqL1xuXG4gIC8vIGNsaWNrIHRoZSBidXR0b24gdG8gcmVnZW5cbiAgYnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG4gICAgcnVuRGVsYXVuYXkoKTtcbiAgfSk7XG5cbiAgLy8gY2xpY2sgdGhlIGJ1dHRvbiB0byByZWdlbiBjb2xvcnMgb25seVxuICBnZW5lcmF0ZUNvbG9yc0J1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuICAgIHZhciBuZXdDb2xvcnMgPSBnZXRDb2xvcnMoKTtcbiAgICBwcmV0dHlEZWxhdW5heS5yZW5kZXJOZXdDb2xvcnMobmV3Q29sb3JzKTtcbiAgfSk7XG5cbiAgLy8gY2xpY2sgdGhlIGJ1dHRvbiB0byByZWdlbiBjb2xvcnMgb25seVxuICBnZW5lcmF0ZUdyYWRpZW50QnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG4gICAgZ2V0UmFuZG9taXplT3B0aW9ucygpO1xuICAgIHByZXR0eURlbGF1bmF5LnJlbmRlck5ld0dyYWRpZW50KG1pbkdyYWRpZW50cywgbWF4R3JhZGllbnRzKTtcbiAgfSk7XG5cbiAgLy8gY2xpY2sgdGhlIGJ1dHRvbiB0byByZWdlbiBjb2xvcnMgb25seVxuICBnZW5lcmF0ZVRyaWFuZ2xlc0J1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuICAgIGdldFJhbmRvbWl6ZU9wdGlvbnMoKTtcbiAgICBwcmV0dHlEZWxhdW5heS5yZW5kZXJOZXdUcmlhbmdsZXMobWluUG9pbnRzLCBtYXhQb2ludHMsIG1pbkVkZ2VQb2ludHMsIG1heEVkZ2VQb2ludHMsIG11bHRpcGxpZXIpO1xuICB9KTtcblxuICAvLyB0dXJuIFRyaWFuZ2xlcyBvZmYvb25cbiAgdG9nZ2xlVHJpYW5nbGVzQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG4gICAgc2hvd1RyaWFuZ2xlcyA9ICFzaG93VHJpYW5nbGVzO1xuICAgIENvb2tpZXMuc2V0SXRlbSgnRGVsYXVuYXlTaG93VHJpYW5nbGVzJywgc2hvd1RyaWFuZ2xlcyk7XG4gICAgcHJldHR5RGVsYXVuYXkudG9nZ2xlVHJpYW5nbGVzKCk7XG4gIH0pO1xuXG4gIC8vIHR1cm4gUG9pbnRzIG9mZi9vblxuICB0b2dnbGVQb2ludHNCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbigpIHtcbiAgICBzaG93UG9pbnRzID0gIXNob3dQb2ludHM7XG4gICAgQ29va2llcy5zZXRJdGVtKCdEZWxhdW5heVNob3dQb2ludHMnLCBzaG93UG9pbnRzKTtcbiAgICBwcmV0dHlEZWxhdW5heS50b2dnbGVQb2ludHMoKTtcbiAgfSk7XG5cbiAgLy8gdHVybiBDaXJjbGVzIG9mZi9vblxuICB0b2dnbGVDaXJjbGVzQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG4gICAgc2hvd0NpcmNsZXMgPSAhc2hvd0NpcmNsZXM7XG4gICAgQ29va2llcy5zZXRJdGVtKCdEZWxhdW5heVNob3dDaXJjbGVzJywgc2hvd0NpcmNsZXMpO1xuICAgIHByZXR0eURlbGF1bmF5LnRvZ2dsZUNpcmNsZXMoKTtcbiAgfSk7XG5cbiAgLy8gdHVybiBDZW50cm9pZHMgb2ZmL29uXG4gIHRvZ2dsZUNlbnRyb2lkc0J1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuICAgIHNob3dDZW50cm9pZHMgPSAhc2hvd0NlbnRyb2lkcztcbiAgICBDb29raWVzLnNldEl0ZW0oJ0RlbGF1bmF5U2hvd0NlbnRyb2lkcycsIHNob3dDZW50cm9pZHMpO1xuICAgIHByZXR0eURlbGF1bmF5LnRvZ2dsZUNlbnRyb2lkcygpO1xuICB9KTtcblxuICAvLyB0dXJuIEVkZ2VzIG9mZi9vblxuICB0b2dnbGVFZGdlc0J1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuICAgIHNob3dFZGdlcyA9ICFzaG93RWRnZXM7XG4gICAgQ29va2llcy5zZXRJdGVtKCdEZWxhdW5heVNob3dFZGdlcycsIHNob3dFZGdlcyk7XG4gICAgcHJldHR5RGVsYXVuYXkudG9nZ2xlRWRnZXMoKTtcbiAgfSk7XG5cbiAgLy8gdHVybiBBbmltYXRpb24gb2ZmL29uXG4gIHRvZ2dsZUFuaW1hdGlvbkJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuICAgIHNob3dBbmltYXRpb24gPSAhc2hvd0FuaW1hdGlvbjtcbiAgICBDb29raWVzLnNldEl0ZW0oJ0RlbGF1bmF5U2hvd0FuaW1hdGlvbicsIHNob3dBbmltYXRpb24pO1xuICAgIHByZXR0eURlbGF1bmF5LnRvZ2dsZUFuaW1hdGlvbigpO1xuICB9KTtcblxuICAvLyBkb250IGRvIGFueXRoaW5nIG9uIGZvcm0gc3VibWl0XG4gIGZvcm0uYWRkRXZlbnRMaXN0ZW5lcignc3VibWl0JywgZnVuY3Rpb24oZSkge1xuICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH0pO1xufSkoKTtcbiJdfQ==
