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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvZGVsYXVuYXktZmFzdC9kZWxhdW5heS5qcyIsInNyYy9QcmV0dHlEZWxhdW5heS5qcyIsInNyYy9QcmV0dHlEZWxhdW5heS9jb2xvci5qcyIsInNyYy9QcmV0dHlEZWxhdW5heS9wb2ludC5qcyIsInNyYy9QcmV0dHlEZWxhdW5heS9wb2ludE1hcC5qcyIsInNyYy9QcmV0dHlEZWxhdW5heS9wb2x5ZmlsbHMuanMiLCJzcmMvUHJldHR5RGVsYXVuYXkvcmFuZG9tLmpzIiwic3JjL1ByZXR0eURlbGF1bmF5L3RyaWFuZ2xlLmpzIiwic3JjL2RlbW8uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FB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LHdCQUFzQixnQkFBdEIsQ0FBdUMsT0FBdkMsRUFBZ0QsWUFBVztBQUN6RCxvQkFBZ0IsQ0FBQyxhQUFqQjtBQUNBLFlBQVEsT0FBUixDQUFnQix1QkFBaEIsRUFBeUMsYUFBekM7QUFDQSxtQkFBZSxlQUFmO0FBQ0QsR0FKRDs7QUFNQTtBQUNBLG9CQUFrQixnQkFBbEIsQ0FBbUMsT0FBbkMsRUFBNEMsWUFBVztBQUNyRCxnQkFBWSxDQUFDLFNBQWI7QUFDQSxZQUFRLE9BQVIsQ0FBZ0IsbUJBQWhCLEVBQXFDLFNBQXJDO0FBQ0EsbUJBQWUsV0FBZjtBQUNELEdBSkQ7O0FBTUE7QUFDQSx3QkFBc0IsZ0JBQXRCLENBQXVDLE9BQXZDLEVBQWdELFlBQVc7QUFDekQsb0JBQWdCLENBQUMsYUFBakI7QUFDQSxZQUFRLE9BQVIsQ0FBZ0IsdUJBQWhCLEVBQXlDLGFBQXpDO0FBQ0EsbUJBQWUsZUFBZjtBQUNELEdBSkQ7O0FBTUE7QUFDQSxPQUFLLGdCQUFMLENBQXNCLFFBQXRCLEVBQWdDLFVBQVMsQ0FBVCxFQUFZO0FBQzFDLE1BQUUsY0FBRjtBQUNBLFdBQU8sS0FBUDtBQUNELEdBSEQ7QUFJRCxDQWhURCIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgRGVsYXVuYXk7XG5cbihmdW5jdGlvbigpIHtcbiAgXCJ1c2Ugc3RyaWN0XCI7XG5cbiAgdmFyIEVQU0lMT04gPSAxLjAgLyAxMDQ4NTc2LjA7XG5cbiAgZnVuY3Rpb24gc3VwZXJ0cmlhbmdsZSh2ZXJ0aWNlcykge1xuICAgIHZhciB4bWluID0gTnVtYmVyLlBPU0lUSVZFX0lORklOSVRZLFxuICAgICAgICB5bWluID0gTnVtYmVyLlBPU0lUSVZFX0lORklOSVRZLFxuICAgICAgICB4bWF4ID0gTnVtYmVyLk5FR0FUSVZFX0lORklOSVRZLFxuICAgICAgICB5bWF4ID0gTnVtYmVyLk5FR0FUSVZFX0lORklOSVRZLFxuICAgICAgICBpLCBkeCwgZHksIGRtYXgsIHhtaWQsIHltaWQ7XG5cbiAgICBmb3IoaSA9IHZlcnRpY2VzLmxlbmd0aDsgaS0tOyApIHtcbiAgICAgIGlmKHZlcnRpY2VzW2ldWzBdIDwgeG1pbikgeG1pbiA9IHZlcnRpY2VzW2ldWzBdO1xuICAgICAgaWYodmVydGljZXNbaV1bMF0gPiB4bWF4KSB4bWF4ID0gdmVydGljZXNbaV1bMF07XG4gICAgICBpZih2ZXJ0aWNlc1tpXVsxXSA8IHltaW4pIHltaW4gPSB2ZXJ0aWNlc1tpXVsxXTtcbiAgICAgIGlmKHZlcnRpY2VzW2ldWzFdID4geW1heCkgeW1heCA9IHZlcnRpY2VzW2ldWzFdO1xuICAgIH1cblxuICAgIGR4ID0geG1heCAtIHhtaW47XG4gICAgZHkgPSB5bWF4IC0geW1pbjtcbiAgICBkbWF4ID0gTWF0aC5tYXgoZHgsIGR5KTtcbiAgICB4bWlkID0geG1pbiArIGR4ICogMC41O1xuICAgIHltaWQgPSB5bWluICsgZHkgKiAwLjU7XG5cbiAgICByZXR1cm4gW1xuICAgICAgW3htaWQgLSAyMCAqIGRtYXgsIHltaWQgLSAgICAgIGRtYXhdLFxuICAgICAgW3htaWQgICAgICAgICAgICAsIHltaWQgKyAyMCAqIGRtYXhdLFxuICAgICAgW3htaWQgKyAyMCAqIGRtYXgsIHltaWQgLSAgICAgIGRtYXhdXG4gICAgXTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNpcmN1bWNpcmNsZSh2ZXJ0aWNlcywgaSwgaiwgaykge1xuICAgIHZhciB4MSA9IHZlcnRpY2VzW2ldWzBdLFxuICAgICAgICB5MSA9IHZlcnRpY2VzW2ldWzFdLFxuICAgICAgICB4MiA9IHZlcnRpY2VzW2pdWzBdLFxuICAgICAgICB5MiA9IHZlcnRpY2VzW2pdWzFdLFxuICAgICAgICB4MyA9IHZlcnRpY2VzW2tdWzBdLFxuICAgICAgICB5MyA9IHZlcnRpY2VzW2tdWzFdLFxuICAgICAgICBmYWJzeTF5MiA9IE1hdGguYWJzKHkxIC0geTIpLFxuICAgICAgICBmYWJzeTJ5MyA9IE1hdGguYWJzKHkyIC0geTMpLFxuICAgICAgICB4YywgeWMsIG0xLCBtMiwgbXgxLCBteDIsIG15MSwgbXkyLCBkeCwgZHk7XG5cbiAgICAvKiBDaGVjayBmb3IgY29pbmNpZGVudCBwb2ludHMgKi9cbiAgICBpZihmYWJzeTF5MiA8IEVQU0lMT04gJiYgZmFic3kyeTMgPCBFUFNJTE9OKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRWVrISBDb2luY2lkZW50IHBvaW50cyFcIik7XG5cbiAgICBpZihmYWJzeTF5MiA8IEVQU0lMT04pIHtcbiAgICAgIG0yICA9IC0oKHgzIC0geDIpIC8gKHkzIC0geTIpKTtcbiAgICAgIG14MiA9ICh4MiArIHgzKSAvIDIuMDtcbiAgICAgIG15MiA9ICh5MiArIHkzKSAvIDIuMDtcbiAgICAgIHhjICA9ICh4MiArIHgxKSAvIDIuMDtcbiAgICAgIHljICA9IG0yICogKHhjIC0gbXgyKSArIG15MjtcbiAgICB9XG5cbiAgICBlbHNlIGlmKGZhYnN5MnkzIDwgRVBTSUxPTikge1xuICAgICAgbTEgID0gLSgoeDIgLSB4MSkgLyAoeTIgLSB5MSkpO1xuICAgICAgbXgxID0gKHgxICsgeDIpIC8gMi4wO1xuICAgICAgbXkxID0gKHkxICsgeTIpIC8gMi4wO1xuICAgICAgeGMgID0gKHgzICsgeDIpIC8gMi4wO1xuICAgICAgeWMgID0gbTEgKiAoeGMgLSBteDEpICsgbXkxO1xuICAgIH1cblxuICAgIGVsc2Uge1xuICAgICAgbTEgID0gLSgoeDIgLSB4MSkgLyAoeTIgLSB5MSkpO1xuICAgICAgbTIgID0gLSgoeDMgLSB4MikgLyAoeTMgLSB5MikpO1xuICAgICAgbXgxID0gKHgxICsgeDIpIC8gMi4wO1xuICAgICAgbXgyID0gKHgyICsgeDMpIC8gMi4wO1xuICAgICAgbXkxID0gKHkxICsgeTIpIC8gMi4wO1xuICAgICAgbXkyID0gKHkyICsgeTMpIC8gMi4wO1xuICAgICAgeGMgID0gKG0xICogbXgxIC0gbTIgKiBteDIgKyBteTIgLSBteTEpIC8gKG0xIC0gbTIpO1xuICAgICAgeWMgID0gKGZhYnN5MXkyID4gZmFic3kyeTMpID9cbiAgICAgICAgbTEgKiAoeGMgLSBteDEpICsgbXkxIDpcbiAgICAgICAgbTIgKiAoeGMgLSBteDIpICsgbXkyO1xuICAgIH1cblxuICAgIGR4ID0geDIgLSB4YztcbiAgICBkeSA9IHkyIC0geWM7XG4gICAgcmV0dXJuIHtpOiBpLCBqOiBqLCBrOiBrLCB4OiB4YywgeTogeWMsIHI6IGR4ICogZHggKyBkeSAqIGR5fTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGRlZHVwKGVkZ2VzKSB7XG4gICAgdmFyIGksIGosIGEsIGIsIG0sIG47XG5cbiAgICBmb3IoaiA9IGVkZ2VzLmxlbmd0aDsgajsgKSB7XG4gICAgICBiID0gZWRnZXNbLS1qXTtcbiAgICAgIGEgPSBlZGdlc1stLWpdO1xuXG4gICAgICBmb3IoaSA9IGo7IGk7ICkge1xuICAgICAgICBuID0gZWRnZXNbLS1pXTtcbiAgICAgICAgbSA9IGVkZ2VzWy0taV07XG5cbiAgICAgICAgaWYoKGEgPT09IG0gJiYgYiA9PT0gbikgfHwgKGEgPT09IG4gJiYgYiA9PT0gbSkpIHtcbiAgICAgICAgICBlZGdlcy5zcGxpY2UoaiwgMik7XG4gICAgICAgICAgZWRnZXMuc3BsaWNlKGksIDIpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgRGVsYXVuYXkgPSB7XG4gICAgdHJpYW5ndWxhdGU6IGZ1bmN0aW9uKHZlcnRpY2VzLCBrZXkpIHtcbiAgICAgIHZhciBuID0gdmVydGljZXMubGVuZ3RoLFxuICAgICAgICAgIGksIGosIGluZGljZXMsIHN0LCBvcGVuLCBjbG9zZWQsIGVkZ2VzLCBkeCwgZHksIGEsIGIsIGM7XG5cbiAgICAgIC8qIEJhaWwgaWYgdGhlcmUgYXJlbid0IGVub3VnaCB2ZXJ0aWNlcyB0byBmb3JtIGFueSB0cmlhbmdsZXMuICovXG4gICAgICBpZihuIDwgMylcbiAgICAgICAgcmV0dXJuIFtdO1xuXG4gICAgICAvKiBTbGljZSBvdXQgdGhlIGFjdHVhbCB2ZXJ0aWNlcyBmcm9tIHRoZSBwYXNzZWQgb2JqZWN0cy4gKER1cGxpY2F0ZSB0aGVcbiAgICAgICAqIGFycmF5IGV2ZW4gaWYgd2UgZG9uJ3QsIHRob3VnaCwgc2luY2Ugd2UgbmVlZCB0byBtYWtlIGEgc3VwZXJ0cmlhbmdsZVxuICAgICAgICogbGF0ZXIgb24hKSAqL1xuICAgICAgdmVydGljZXMgPSB2ZXJ0aWNlcy5zbGljZSgwKTtcblxuICAgICAgaWYoa2V5KVxuICAgICAgICBmb3IoaSA9IG47IGktLTsgKVxuICAgICAgICAgIHZlcnRpY2VzW2ldID0gdmVydGljZXNbaV1ba2V5XTtcblxuICAgICAgLyogTWFrZSBhbiBhcnJheSBvZiBpbmRpY2VzIGludG8gdGhlIHZlcnRleCBhcnJheSwgc29ydGVkIGJ5IHRoZVxuICAgICAgICogdmVydGljZXMnIHgtcG9zaXRpb24uICovXG4gICAgICBpbmRpY2VzID0gbmV3IEFycmF5KG4pO1xuXG4gICAgICBmb3IoaSA9IG47IGktLTsgKVxuICAgICAgICBpbmRpY2VzW2ldID0gaTtcblxuICAgICAgaW5kaWNlcy5zb3J0KGZ1bmN0aW9uKGksIGopIHtcbiAgICAgICAgcmV0dXJuIHZlcnRpY2VzW2pdWzBdIC0gdmVydGljZXNbaV1bMF07XG4gICAgICB9KTtcblxuICAgICAgLyogTmV4dCwgZmluZCB0aGUgdmVydGljZXMgb2YgdGhlIHN1cGVydHJpYW5nbGUgKHdoaWNoIGNvbnRhaW5zIGFsbCBvdGhlclxuICAgICAgICogdHJpYW5nbGVzKSwgYW5kIGFwcGVuZCB0aGVtIG9udG8gdGhlIGVuZCBvZiBhIChjb3B5IG9mKSB0aGUgdmVydGV4XG4gICAgICAgKiBhcnJheS4gKi9cbiAgICAgIHN0ID0gc3VwZXJ0cmlhbmdsZSh2ZXJ0aWNlcyk7XG4gICAgICB2ZXJ0aWNlcy5wdXNoKHN0WzBdLCBzdFsxXSwgc3RbMl0pO1xuICAgICAgXG4gICAgICAvKiBJbml0aWFsaXplIHRoZSBvcGVuIGxpc3QgKGNvbnRhaW5pbmcgdGhlIHN1cGVydHJpYW5nbGUgYW5kIG5vdGhpbmdcbiAgICAgICAqIGVsc2UpIGFuZCB0aGUgY2xvc2VkIGxpc3QgKHdoaWNoIGlzIGVtcHR5IHNpbmNlIHdlIGhhdm4ndCBwcm9jZXNzZWRcbiAgICAgICAqIGFueSB0cmlhbmdsZXMgeWV0KS4gKi9cbiAgICAgIG9wZW4gICA9IFtjaXJjdW1jaXJjbGUodmVydGljZXMsIG4gKyAwLCBuICsgMSwgbiArIDIpXTtcbiAgICAgIGNsb3NlZCA9IFtdO1xuICAgICAgZWRnZXMgID0gW107XG5cbiAgICAgIC8qIEluY3JlbWVudGFsbHkgYWRkIGVhY2ggdmVydGV4IHRvIHRoZSBtZXNoLiAqL1xuICAgICAgZm9yKGkgPSBpbmRpY2VzLmxlbmd0aDsgaS0tOyBlZGdlcy5sZW5ndGggPSAwKSB7XG4gICAgICAgIGMgPSBpbmRpY2VzW2ldO1xuXG4gICAgICAgIC8qIEZvciBlYWNoIG9wZW4gdHJpYW5nbGUsIGNoZWNrIHRvIHNlZSBpZiB0aGUgY3VycmVudCBwb2ludCBpc1xuICAgICAgICAgKiBpbnNpZGUgaXQncyBjaXJjdW1jaXJjbGUuIElmIGl0IGlzLCByZW1vdmUgdGhlIHRyaWFuZ2xlIGFuZCBhZGRcbiAgICAgICAgICogaXQncyBlZGdlcyB0byBhbiBlZGdlIGxpc3QuICovXG4gICAgICAgIGZvcihqID0gb3Blbi5sZW5ndGg7IGotLTsgKSB7XG4gICAgICAgICAgLyogSWYgdGhpcyBwb2ludCBpcyB0byB0aGUgcmlnaHQgb2YgdGhpcyB0cmlhbmdsZSdzIGNpcmN1bWNpcmNsZSxcbiAgICAgICAgICAgKiB0aGVuIHRoaXMgdHJpYW5nbGUgc2hvdWxkIG5ldmVyIGdldCBjaGVja2VkIGFnYWluLiBSZW1vdmUgaXRcbiAgICAgICAgICAgKiBmcm9tIHRoZSBvcGVuIGxpc3QsIGFkZCBpdCB0byB0aGUgY2xvc2VkIGxpc3QsIGFuZCBza2lwLiAqL1xuICAgICAgICAgIGR4ID0gdmVydGljZXNbY11bMF0gLSBvcGVuW2pdLng7XG4gICAgICAgICAgaWYoZHggPiAwLjAgJiYgZHggKiBkeCA+IG9wZW5bal0ucikge1xuICAgICAgICAgICAgY2xvc2VkLnB1c2gob3BlbltqXSk7XG4gICAgICAgICAgICBvcGVuLnNwbGljZShqLCAxKTtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIC8qIElmIHdlJ3JlIG91dHNpZGUgdGhlIGNpcmN1bWNpcmNsZSwgc2tpcCB0aGlzIHRyaWFuZ2xlLiAqL1xuICAgICAgICAgIGR5ID0gdmVydGljZXNbY11bMV0gLSBvcGVuW2pdLnk7XG4gICAgICAgICAgaWYoZHggKiBkeCArIGR5ICogZHkgLSBvcGVuW2pdLnIgPiBFUFNJTE9OKVxuICAgICAgICAgICAgY29udGludWU7XG5cbiAgICAgICAgICAvKiBSZW1vdmUgdGhlIHRyaWFuZ2xlIGFuZCBhZGQgaXQncyBlZGdlcyB0byB0aGUgZWRnZSBsaXN0LiAqL1xuICAgICAgICAgIGVkZ2VzLnB1c2goXG4gICAgICAgICAgICBvcGVuW2pdLmksIG9wZW5bal0uaixcbiAgICAgICAgICAgIG9wZW5bal0uaiwgb3BlbltqXS5rLFxuICAgICAgICAgICAgb3BlbltqXS5rLCBvcGVuW2pdLmlcbiAgICAgICAgICApO1xuICAgICAgICAgIG9wZW4uc3BsaWNlKGosIDEpO1xuICAgICAgICB9XG5cbiAgICAgICAgLyogUmVtb3ZlIGFueSBkb3VibGVkIGVkZ2VzLiAqL1xuICAgICAgICBkZWR1cChlZGdlcyk7XG5cbiAgICAgICAgLyogQWRkIGEgbmV3IHRyaWFuZ2xlIGZvciBlYWNoIGVkZ2UuICovXG4gICAgICAgIGZvcihqID0gZWRnZXMubGVuZ3RoOyBqOyApIHtcbiAgICAgICAgICBiID0gZWRnZXNbLS1qXTtcbiAgICAgICAgICBhID0gZWRnZXNbLS1qXTtcbiAgICAgICAgICBvcGVuLnB1c2goY2lyY3VtY2lyY2xlKHZlcnRpY2VzLCBhLCBiLCBjKSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLyogQ29weSBhbnkgcmVtYWluaW5nIG9wZW4gdHJpYW5nbGVzIHRvIHRoZSBjbG9zZWQgbGlzdCwgYW5kIHRoZW5cbiAgICAgICAqIHJlbW92ZSBhbnkgdHJpYW5nbGVzIHRoYXQgc2hhcmUgYSB2ZXJ0ZXggd2l0aCB0aGUgc3VwZXJ0cmlhbmdsZSxcbiAgICAgICAqIGJ1aWxkaW5nIGEgbGlzdCBvZiB0cmlwbGV0cyB0aGF0IHJlcHJlc2VudCB0cmlhbmdsZXMuICovXG4gICAgICBmb3IoaSA9IG9wZW4ubGVuZ3RoOyBpLS07IClcbiAgICAgICAgY2xvc2VkLnB1c2gob3BlbltpXSk7XG4gICAgICBvcGVuLmxlbmd0aCA9IDA7XG5cbiAgICAgIGZvcihpID0gY2xvc2VkLmxlbmd0aDsgaS0tOyApXG4gICAgICAgIGlmKGNsb3NlZFtpXS5pIDwgbiAmJiBjbG9zZWRbaV0uaiA8IG4gJiYgY2xvc2VkW2ldLmsgPCBuKVxuICAgICAgICAgIG9wZW4ucHVzaChjbG9zZWRbaV0uaSwgY2xvc2VkW2ldLmosIGNsb3NlZFtpXS5rKTtcblxuICAgICAgLyogWWF5LCB3ZSdyZSBkb25lISAqL1xuICAgICAgcmV0dXJuIG9wZW47XG4gICAgfSxcbiAgICBjb250YWluczogZnVuY3Rpb24odHJpLCBwKSB7XG4gICAgICAvKiBCb3VuZGluZyBib3ggdGVzdCBmaXJzdCwgZm9yIHF1aWNrIHJlamVjdGlvbnMuICovXG4gICAgICBpZigocFswXSA8IHRyaVswXVswXSAmJiBwWzBdIDwgdHJpWzFdWzBdICYmIHBbMF0gPCB0cmlbMl1bMF0pIHx8XG4gICAgICAgICAocFswXSA+IHRyaVswXVswXSAmJiBwWzBdID4gdHJpWzFdWzBdICYmIHBbMF0gPiB0cmlbMl1bMF0pIHx8XG4gICAgICAgICAocFsxXSA8IHRyaVswXVsxXSAmJiBwWzFdIDwgdHJpWzFdWzFdICYmIHBbMV0gPCB0cmlbMl1bMV0pIHx8XG4gICAgICAgICAocFsxXSA+IHRyaVswXVsxXSAmJiBwWzFdID4gdHJpWzFdWzFdICYmIHBbMV0gPiB0cmlbMl1bMV0pKVxuICAgICAgICByZXR1cm4gbnVsbDtcblxuICAgICAgdmFyIGEgPSB0cmlbMV1bMF0gLSB0cmlbMF1bMF0sXG4gICAgICAgICAgYiA9IHRyaVsyXVswXSAtIHRyaVswXVswXSxcbiAgICAgICAgICBjID0gdHJpWzFdWzFdIC0gdHJpWzBdWzFdLFxuICAgICAgICAgIGQgPSB0cmlbMl1bMV0gLSB0cmlbMF1bMV0sXG4gICAgICAgICAgaSA9IGEgKiBkIC0gYiAqIGM7XG5cbiAgICAgIC8qIERlZ2VuZXJhdGUgdHJpLiAqL1xuICAgICAgaWYoaSA9PT0gMC4wKVxuICAgICAgICByZXR1cm4gbnVsbDtcblxuICAgICAgdmFyIHUgPSAoZCAqIChwWzBdIC0gdHJpWzBdWzBdKSAtIGIgKiAocFsxXSAtIHRyaVswXVsxXSkpIC8gaSxcbiAgICAgICAgICB2ID0gKGEgKiAocFsxXSAtIHRyaVswXVsxXSkgLSBjICogKHBbMF0gLSB0cmlbMF1bMF0pKSAvIGk7XG5cbiAgICAgIC8qIElmIHdlJ3JlIG91dHNpZGUgdGhlIHRyaSwgZmFpbC4gKi9cbiAgICAgIGlmKHUgPCAwLjAgfHwgdiA8IDAuMCB8fCAodSArIHYpID4gMS4wKVxuICAgICAgICByZXR1cm4gbnVsbDtcblxuICAgICAgcmV0dXJuIFt1LCB2XTtcbiAgICB9XG4gIH07XG5cbiAgaWYodHlwZW9mIG1vZHVsZSAhPT0gXCJ1bmRlZmluZWRcIilcbiAgICBtb2R1bGUuZXhwb3J0cyA9IERlbGF1bmF5O1xufSkoKTtcbiIsInZhciBEZWxhdW5heSA9IHJlcXVpcmUoJ2RlbGF1bmF5LWZhc3QnKTtcbnZhciBDb2xvciA9IHJlcXVpcmUoJy4vUHJldHR5RGVsYXVuYXkvY29sb3InKTtcbnZhciBSYW5kb20gPSByZXF1aXJlKCcuL1ByZXR0eURlbGF1bmF5L3JhbmRvbScpO1xudmFyIFRyaWFuZ2xlID0gcmVxdWlyZSgnLi9QcmV0dHlEZWxhdW5heS90cmlhbmdsZScpO1xudmFyIFBvaW50ID0gcmVxdWlyZSgnLi9QcmV0dHlEZWxhdW5heS9wb2ludCcpO1xudmFyIFBvaW50TWFwID0gcmVxdWlyZSgnLi9QcmV0dHlEZWxhdW5heS9wb2ludE1hcCcpO1xuXG5yZXF1aXJlKCcuL1ByZXR0eURlbGF1bmF5L3BvbHlmaWxscycpKCk7XG5cbi8qKlxuKiBSZXByZXNlbnRzIGEgZGVsYXVuZXkgdHJpYW5ndWxhdGlvbiBvZiByYW5kb20gcG9pbnRzXG4qIGh0dHBzOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0RlbGF1bmF5X3RyaWFuZ3VsYXRpb25cbiovXG5jbGFzcyBQcmV0dHlEZWxhdW5heSB7XG4vKipcbiAqIEBjb25zdHJ1Y3RvclxuICovXG5jb25zdHJ1Y3RvcihjYW52YXMsIG9wdGlvbnMpIHtcbiAgLy8gbWVyZ2UgZ2l2ZW4gb3B0aW9ucyB3aXRoIGRlZmF1bHRzXG4gIHRoaXMub3B0aW9ucyA9IE9iamVjdC5hc3NpZ24oe30sIFByZXR0eURlbGF1bmF5LmRlZmF1bHRzKCksIChvcHRpb25zIHx8IHt9KSk7XG5cbiAgdGhpcy5jYW52YXMgPSBjYW52YXM7XG4gIHRoaXMuY3R4ID0gY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG5cbiAgdGhpcy5yZXNpemVDYW52YXMoKTtcbiAgdGhpcy5wb2ludHMgPSBbXTtcbiAgdGhpcy5jb2xvcnMgPSB0aGlzLm9wdGlvbnMuY29sb3JzO1xuICB0aGlzLnBvaW50TWFwID0gbmV3IFBvaW50TWFwKCk7XG5cbiAgdGhpcy5tb3VzZVBvc2l0aW9uID0gZmFsc2U7XG5cbiAgaWYgKHRoaXMub3B0aW9ucy5ob3Zlcikge1xuICAgIHRoaXMuY3JlYXRlSG92ZXJTaGFkb3dDYW52YXMoKTtcblxuICAgIHRoaXMuY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlbW92ZScsIChlKSA9PiB7XG4gICAgICBpZiAoIXRoaXMub3B0aW9ucy5hbmltYXRlKSB7XG4gICAgICAgIHZhciByZWN0ID0gY2FudmFzLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgICAgICB0aGlzLm1vdXNlUG9zaXRpb24gPSBuZXcgUG9pbnQoZS5jbGllbnRYIC0gcmVjdC5sZWZ0LCBlLmNsaWVudFkgLSByZWN0LnRvcCk7XG4gICAgICAgIHRoaXMuaG92ZXIoKTtcbiAgICAgIH1cbiAgICB9LCBmYWxzZSk7XG5cbiAgICB0aGlzLmNhbnZhcy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZW91dCcsICgpID0+IHtcbiAgICAgIGlmICghdGhpcy5vcHRpb25zLmFuaW1hdGUpIHtcbiAgICAgICAgdGhpcy5tb3VzZVBvc2l0aW9uID0gZmFsc2U7XG4gICAgICAgIHRoaXMuaG92ZXIoKTtcbiAgICAgIH1cbiAgICB9LCBmYWxzZSk7XG4gIH1cblxuICAvLyB0aHJvdHRsZWQgd2luZG93IHJlc2l6ZVxuICB0aGlzLnJlc2l6aW5nID0gZmFsc2U7XG4gIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdyZXNpemUnLCAoKT0+IHtcbiAgICBpZiAodGhpcy5yZXNpemluZykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLnJlc2l6aW5nID0gdHJ1ZTtcbiAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCk9PiB7XG4gICAgICB0aGlzLnJlc2NhbGUoKTtcbiAgICAgIHRoaXMucmVzaXppbmcgPSBmYWxzZTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgdGhpcy5yYW5kb21pemUoKTtcbn1cblxuc3RhdGljIGRlZmF1bHRzKCkge1xuICByZXR1cm4ge1xuICAgIC8vIHNob3dzIHRyaWFuZ2xlcyAtIGZhbHNlIHdpbGwgc2hvdyB0aGUgZ3JhZGllbnQgYmVoaW5kXG4gICAgc2hvd1RyaWFuZ2xlczogdHJ1ZSxcbiAgICAvLyBzaG93IHRoZSBwb2ludHMgdGhhdCBtYWtlIHRoZSB0cmlhbmd1bGF0aW9uXG4gICAgc2hvd1BvaW50czogZmFsc2UsXG4gICAgLy8gc2hvdyB0aGUgY2lyY2xlcyB0aGF0IGRlZmluZSB0aGUgZ3JhZGllbnQgbG9jYXRpb25zLCBzaXplc1xuICAgIHNob3dDaXJjbGVzOiBmYWxzZSxcbiAgICAvLyBzaG93IHRyaWFuZ2xlIGNlbnRyb2lkc1xuICAgIHNob3dDZW50cm9pZHM6IGZhbHNlLFxuICAgIC8vIHNob3cgdHJpYW5nbGUgZWRnZXNcbiAgICBzaG93RWRnZXM6IHRydWUsXG4gICAgLy8gaGlnaGxpZ2h0IGhvdmVyZWQgdHJpYW5nbGVzXG4gICAgaG92ZXI6IHRydWUsXG4gICAgLy8gbXVsdGlwbGllciBmb3IgdGhlIG51bWJlciBvZiBwb2ludHMgZ2VuZXJhdGVkIGJhc2VkIG9uIGNhbnZhcyBzaXplXG4gICAgbXVsdGlwbGllcjogMC41LFxuICAgIC8vIHdoZXRoZXIgdG8gYW5pbWF0ZSB0aGUgZ3JhZGllbnRzIGJlaGluZCB0aGUgdHJpYW5nbGVzXG4gICAgYW5pbWF0ZTogZmFsc2UsXG4gICAgLy8gbnVtYmVyIG9mIGZyYW1lcyBwZXIgZ3JhZGllbnQgY29sb3IgY3ljbGVcbiAgICBsb29wRnJhbWVzOiAyNTAsXG5cbiAgICAvLyBjb2xvcnMgdG8gdXNlIGluIHRoZSBncmFkaWVudFxuICAgIGNvbG9yczogWydoc2xhKDAsIDAlLCAxMDAlLCAxKScsICdoc2xhKDAsIDAlLCA1MCUsIDEpJywgJ2hzbGEoMCwgMCUsIDAlLCAxKSddLFxuXG4gICAgLy8gcmFuZG9tbHkgY2hvb3NlIGZyb20gY29sb3IgcGFsZXR0ZSBvbiByYW5kb21pemUgaWYgbm90IHN1cHBsaWVkIGNvbG9yc1xuICAgIGNvbG9yUGFsZXR0ZTogZmFsc2UsXG5cbiAgICAvLyB1c2UgaW1hZ2UgYXMgYmFja2dyb3VuZCBpbnN0ZWFkIG9mIGdyYWRpZW50XG4gICAgaW1hZ2VBc0JhY2tncm91bmQ6IGZhbHNlLFxuXG4gICAgLy8gaW1hZ2UgdG8gdXNlIGFzIGJhY2tncm91bmRcbiAgICBpbWFnZVVSTDogJycsXG5cbiAgICAvLyBob3cgdG8gcmVzaXplIHRoZSBwb2ludHNcbiAgICByZXNpemVNb2RlOiAnc2NhbGVQb2ludHMnLFxuICAgIC8vICduZXdQb2ludHMnIC0gZ2VuZXJhdGVzIGEgbmV3IHNldCBvZiBwb2ludHMgZm9yIHRoZSBuZXcgc2l6ZVxuICAgIC8vICdzY2FsZVBvaW50cycgLSBsaW5lYXJseSBzY2FsZXMgZXhpc3RpbmcgcG9pbnRzIGFuZCByZS10cmlhbmd1bGF0ZXNcblxuICAgIC8vIGV2ZW50cyB0cmlnZ2VyZWQgd2hlbiB0aGUgY2VudGVyIG9mIHRoZSBiYWNrZ3JvdW5kXG4gICAgLy8gaXMgZ3JlYXRlciBvciBsZXNzIHRoYW4gNTAgbGlnaHRuZXNzIGluIGhzbGFcbiAgICAvLyBpbnRlbmRlZCB0byBhZGp1c3Qgc29tZSB0ZXh0IHRoYXQgaXMgb24gdG9wXG4gICAgLy8gY29sb3IgaXMgdGhlIGNvbG9yIG9mIHRoZSBjZW50ZXIgb2YgdGhlIGNhbnZhc1xuICAgIG9uRGFya0JhY2tncm91bmQ6IGZ1bmN0aW9uKCkgeyByZXR1cm47IH0sXG4gICAgb25MaWdodEJhY2tncm91bmQ6IGZ1bmN0aW9uKCkgeyByZXR1cm47IH0sXG5cblx0Z3JhZGllbnQ6IHtcblx0XHRtaW5YOiAod2lkdGgsIGhlaWdodCkgPT4gTWF0aC5jZWlsKE1hdGguc3FydCh3aWR0aCkpLFxuXHRcdG1heFg6ICh3aWR0aCwgaGVpZ2h0KSA9PiBNYXRoLmNlaWwod2lkdGggLSBNYXRoLnNxcnQod2lkdGgpKSxcblx0XHRtaW5ZOiAod2lkdGgsIGhlaWdodCkgPT4gTWF0aC5jZWlsKE1hdGguc3FydChoZWlnaHQpKSxcblx0XHRtYXhZOiAod2lkdGgsIGhlaWdodCkgPT4gTWF0aC5jZWlsKGhlaWdodCAtIE1hdGguc3FydChoZWlnaHQpKSxcblx0XHRtaW5SYWRpdXMgOiAod2lkdGgsIGhlaWdodCwgbnVtR3JhZGllbnRzKSA9PiBNYXRoLmNlaWwoTWF0aC5tYXgoaGVpZ2h0LCB3aWR0aCkgLyBNYXRoLm1heChNYXRoLnNxcnQobnVtR3JhZGllbnRzKSwgMikpLFxuXHRcdG1heFJhZGl1cyA6ICh3aWR0aCwgaGVpZ2h0LCBudW1HcmFkaWVudHMpID0+IE1hdGguY2VpbChNYXRoLm1heChoZWlnaHQsIHdpZHRoKSAvIE1hdGgubWF4KE1hdGgubG9nKG51bUdyYWRpZW50cyksIDEpKVxuXHR9LFxuXG4gICAgLy8gdHJpZ2dlcmVkIHdoZW4gaG92ZXJlZCBvdmVyIHRyaWFuZ2xlXG4gICAgb25UcmlhbmdsZUhvdmVyOiBmdW5jdGlvbih0cmlhbmdsZSwgY3R4LCBvcHRpb25zKSB7XG4gICAgICB2YXIgZmlsbCA9IG9wdGlvbnMuaG92ZXJDb2xvcih0cmlhbmdsZS5jb2xvcik7XG4gICAgICB2YXIgc3Ryb2tlID0gZmlsbDtcbiAgICAgIHRyaWFuZ2xlLnJlbmRlcihjdHgsIG9wdGlvbnMuc2hvd0VkZ2VzID8gZmlsbCA6IGZhbHNlLCBvcHRpb25zLnNob3dFZGdlcyA/IGZhbHNlIDogc3Ryb2tlKTtcbiAgICB9LFxuXG4gICAgLy8gcmV0dXJucyBoc2xhIGNvbG9yIGZvciB0cmlhbmdsZSBlZGdlXG4gICAgLy8gYXMgYSBmdW5jdGlvbiBvZiB0aGUgdHJpYW5nbGUgZmlsbCBjb2xvclxuICAgIGVkZ2VDb2xvcjogZnVuY3Rpb24oY29sb3IpIHtcbiAgICAgIGNvbG9yID0gQ29sb3IuaHNsYUFkanVzdExpZ2h0bmVzcyhjb2xvciwgZnVuY3Rpb24obGlnaHRuZXNzKSB7XG4gICAgICAgIHJldHVybiAobGlnaHRuZXNzICsgMjAwIC0gbGlnaHRuZXNzICogMikgLyAzO1xuICAgICAgfSk7XG4gICAgICBjb2xvciA9IENvbG9yLmhzbGFBZGp1c3RBbHBoYShjb2xvciwgMC4yNSk7XG4gICAgICByZXR1cm4gY29sb3I7XG4gICAgfSxcblxuICAgIC8vIHJldHVybnMgaHNsYSBjb2xvciBmb3IgdHJpYW5nbGUgcG9pbnRcbiAgICAvLyBhcyBhIGZ1bmN0aW9uIG9mIHRoZSB0cmlhbmdsZSBmaWxsIGNvbG9yXG4gICAgcG9pbnRDb2xvcjogZnVuY3Rpb24oY29sb3IpIHtcbiAgICAgIGNvbG9yID0gQ29sb3IuaHNsYUFkanVzdExpZ2h0bmVzcyhjb2xvciwgZnVuY3Rpb24obGlnaHRuZXNzKSB7XG4gICAgICAgIHJldHVybiAobGlnaHRuZXNzICsgMjAwIC0gbGlnaHRuZXNzICogMikgLyAzO1xuICAgICAgfSk7XG4gICAgICBjb2xvciA9IENvbG9yLmhzbGFBZGp1c3RBbHBoYShjb2xvciwgMSk7XG4gICAgICByZXR1cm4gY29sb3I7XG4gICAgfSxcblxuICAgIC8vIHJldHVybnMgaHNsYSBjb2xvciBmb3IgdHJpYW5nbGUgY2VudHJvaWRcbiAgICAvLyBhcyBhIGZ1bmN0aW9uIG9mIHRoZSB0cmlhbmdsZSBmaWxsIGNvbG9yXG4gICAgY2VudHJvaWRDb2xvcjogZnVuY3Rpb24oY29sb3IpIHtcbiAgICAgIGNvbG9yID0gQ29sb3IuaHNsYUFkanVzdExpZ2h0bmVzcyhjb2xvciwgZnVuY3Rpb24obGlnaHRuZXNzKSB7XG4gICAgICAgIHJldHVybiAobGlnaHRuZXNzICsgMjAwIC0gbGlnaHRuZXNzICogMikgLyAzO1xuICAgICAgfSk7XG4gICAgICBjb2xvciA9IENvbG9yLmhzbGFBZGp1c3RBbHBoYShjb2xvciwgMC4yNSk7XG4gICAgICByZXR1cm4gY29sb3I7XG4gICAgfSxcblxuICAgIC8vIHJldHVybnMgaHNsYSBjb2xvciBmb3IgdHJpYW5nbGUgaG92ZXIgZmlsbFxuICAgIC8vIGFzIGEgZnVuY3Rpb24gb2YgdGhlIHRyaWFuZ2xlIGZpbGwgY29sb3JcbiAgICBob3ZlckNvbG9yOiBmdW5jdGlvbihjb2xvcikge1xuICAgICAgY29sb3IgPSBDb2xvci5oc2xhQWRqdXN0TGlnaHRuZXNzKGNvbG9yLCBmdW5jdGlvbihsaWdodG5lc3MpIHtcbiAgICAgICAgcmV0dXJuIDEwMCAtIGxpZ2h0bmVzcztcbiAgICAgIH0pO1xuICAgICAgY29sb3IgPSBDb2xvci5oc2xhQWRqdXN0QWxwaGEoY29sb3IsIDAuNSk7XG4gICAgICByZXR1cm4gY29sb3I7XG4gICAgfSxcbiAgfTtcbn1cblxuY2xlYXIoKSB7XG4gIHRoaXMucG9pbnRzID0gW107XG4gIHRoaXMudHJpYW5nbGVzID0gW107XG4gIHRoaXMucG9pbnRNYXAuY2xlYXIoKTtcbiAgdGhpcy5jZW50ZXIgPSBuZXcgUG9pbnQoMCwgMCk7XG59XG5cbi8vIGNsZWFyIGFuZCBjcmVhdGUgYSBmcmVzaCBzZXQgb2YgcmFuZG9tIHBvaW50c1xuLy8gYWxsIGFyZ3MgYXJlIG9wdGlvbmFsXG5yYW5kb21pemUobWluLCBtYXgsIG1pbkVkZ2UsIG1heEVkZ2UsIG1pbkdyYWRpZW50cywgbWF4R3JhZGllbnRzLCBtdWx0aXBsaWVyLCBjb2xvcnMsIGltYWdlVVJMKSB7XG4gIC8vIGNvbG9ycyBwYXJhbSBpcyBvcHRpb25hbFxuICB0aGlzLmNvbG9ycyA9IGNvbG9ycyA/XG4gICAgICAgICAgICAgICAgICBjb2xvcnMgOlxuICAgICAgICAgICAgICAgICAgdGhpcy5vcHRpb25zLmNvbG9yUGFsZXR0ZSA/XG4gICAgICAgICAgICAgICAgICAgIHRoaXMub3B0aW9ucy5jb2xvclBhbGV0dGVbUmFuZG9tLnJhbmRvbUJldHdlZW4oMCwgdGhpcy5vcHRpb25zLmNvbG9yUGFsZXR0ZS5sZW5ndGggLSAxKV0gOlxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbG9ycztcblxuICB0aGlzLm9wdGlvbnMuaW1hZ2VVUkwgPSBpbWFnZVVSTCA/IGltYWdlVVJMIDogdGhpcy5vcHRpb25zLmltYWdlVVJMO1xuICB0aGlzLm9wdGlvbnMuaW1hZ2VBc0JhY2tncm91bmQgPSAhIXRoaXMub3B0aW9ucy5pbWFnZVVSTDtcblxuICB0aGlzLm1pbkdyYWRpZW50cyA9IG1pbkdyYWRpZW50cztcbiAgdGhpcy5tYXhHcmFkaWVudHMgPSBtYXhHcmFkaWVudHM7XG5cbiAgdGhpcy5yZXNpemVDYW52YXMoKTtcblxuICB0aGlzLmdlbmVyYXRlTmV3UG9pbnRzKG1pbiwgbWF4LCBtaW5FZGdlLCBtYXhFZGdlLCBtdWx0aXBsaWVyKTtcblxuICB0aGlzLnRyaWFuZ3VsYXRlKCk7XG5cbiAgaWYgKCF0aGlzLm9wdGlvbnMuaW1hZ2VBc0JhY2tncm91bmQpIHtcbiAgICB0aGlzLmdlbmVyYXRlR3JhZGllbnRzKG1pbkdyYWRpZW50cywgbWF4R3JhZGllbnRzKTtcblxuICAgIC8vIHByZXAgZm9yIGFuaW1hdGlvblxuICAgIHRoaXMubmV4dEdyYWRpZW50cyA9IHRoaXMucmFkaWFsR3JhZGllbnRzLnNsaWNlKDApO1xuICAgIHRoaXMuZ2VuZXJhdGVHcmFkaWVudHMoKTtcbiAgICB0aGlzLmN1cnJlbnRHcmFkaWVudHMgPSB0aGlzLnJhZGlhbEdyYWRpZW50cy5zbGljZSgwKTtcbiAgfVxuXG4gIHRoaXMucmVuZGVyKCk7XG5cbiAgaWYgKHRoaXMub3B0aW9ucy5hbmltYXRlICYmICF0aGlzLmxvb3BpbmcpIHtcbiAgICB0aGlzLmluaXRSZW5kZXJMb29wKCk7XG4gIH1cbn1cblxuaW5pdFJlbmRlckxvb3AoKSB7XG4gIGlmICh0aGlzLm9wdGlvbnMuaW1hZ2VBc0JhY2tncm91bmQpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICB0aGlzLmxvb3BpbmcgPSB0cnVlO1xuICB0aGlzLmZyYW1lU3RlcHMgPSB0aGlzLm9wdGlvbnMubG9vcEZyYW1lcztcbiAgdGhpcy5mcmFtZSA9IHRoaXMuZnJhbWUgPyB0aGlzLmZyYW1lIDogdGhpcy5mcmFtZVN0ZXBzO1xuICB0aGlzLnJlbmRlckxvb3AoKTtcbn1cblxucmVuZGVyTG9vcCgpIHtcbiAgdGhpcy5mcmFtZSsrO1xuXG4gIC8vIGN1cnJlbnQgPT4gbmV4dCwgbmV4dCA9PiBuZXdcbiAgaWYgKHRoaXMuZnJhbWUgPiB0aGlzLmZyYW1lU3RlcHMpIHtcbiAgICB2YXIgbmV4dEdyYWRpZW50cyA9IHRoaXMubmV4dEdyYWRpZW50cyA/IHRoaXMubmV4dEdyYWRpZW50cyA6IHRoaXMucmFkaWFsR3JhZGllbnRzO1xuICAgIHRoaXMuZ2VuZXJhdGVHcmFkaWVudHMoKTtcbiAgICB0aGlzLm5leHRHcmFkaWVudHMgPSB0aGlzLnJhZGlhbEdyYWRpZW50cztcbiAgICB0aGlzLnJhZGlhbEdyYWRpZW50cyA9IG5leHRHcmFkaWVudHMuc2xpY2UoMCk7XG4gICAgdGhpcy5jdXJyZW50R3JhZGllbnRzID0gbmV4dEdyYWRpZW50cy5zbGljZSgwKTtcblxuICAgIHRoaXMuZnJhbWUgPSAwO1xuICB9IGVsc2Uge1xuICAgIC8vIGZhbmN5IHN0ZXBzXG4gICAgLy8ge3gwLCB5MCwgcjAsIHgxLCB5MSwgcjEsIGNvbG9yU3RvcH1cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IE1hdGgubWF4KHRoaXMucmFkaWFsR3JhZGllbnRzLmxlbmd0aCwgdGhpcy5uZXh0R3JhZGllbnRzLmxlbmd0aCk7IGkrKykge1xuICAgICAgdmFyIGN1cnJlbnRHcmFkaWVudCA9IHRoaXMuY3VycmVudEdyYWRpZW50c1tpXTtcbiAgICAgIHZhciBuZXh0R3JhZGllbnQgPSB0aGlzLm5leHRHcmFkaWVudHNbaV07XG5cbiAgICAgIGlmICh0eXBlb2YgY3VycmVudEdyYWRpZW50ID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICB2YXIgbmV3R3JhZGllbnQgPSB7XG4gICAgICAgICAgeDA6IG5leHRHcmFkaWVudC54MCxcbiAgICAgICAgICB5MDogbmV4dEdyYWRpZW50LnkwLFxuICAgICAgICAgIHIwOiAwLFxuICAgICAgICAgIHgxOiBuZXh0R3JhZGllbnQueDEsXG4gICAgICAgICAgeTE6IG5leHRHcmFkaWVudC55MSxcbiAgICAgICAgICByMTogMCxcbiAgICAgICAgICBjb2xvclN0b3A6IG5leHRHcmFkaWVudC5jb2xvclN0b3AsXG4gICAgICAgIH07XG4gICAgICAgIGN1cnJlbnRHcmFkaWVudCA9IG5ld0dyYWRpZW50O1xuICAgICAgICB0aGlzLmN1cnJlbnRHcmFkaWVudHMucHVzaChuZXdHcmFkaWVudCk7XG4gICAgICAgIHRoaXMucmFkaWFsR3JhZGllbnRzLnB1c2gobmV3R3JhZGllbnQpO1xuICAgICAgfVxuXG4gICAgICBpZiAodHlwZW9mIG5leHRHcmFkaWVudCA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgbmV4dEdyYWRpZW50ID0ge1xuICAgICAgICAgIHgwOiBjdXJyZW50R3JhZGllbnQueDAsXG4gICAgICAgICAgeTA6IGN1cnJlbnRHcmFkaWVudC55MCxcbiAgICAgICAgICByMDogMCxcbiAgICAgICAgICB4MTogY3VycmVudEdyYWRpZW50LngxLFxuICAgICAgICAgIHkxOiBjdXJyZW50R3JhZGllbnQueTEsXG4gICAgICAgICAgcjE6IDAsXG4gICAgICAgICAgY29sb3JTdG9wOiBjdXJyZW50R3JhZGllbnQuY29sb3JTdG9wLFxuICAgICAgICB9O1xuICAgICAgfVxuXG4gICAgICB2YXIgdXBkYXRlZEdyYWRpZW50ID0ge307XG5cbiAgICAgIC8vIHNjYWxlIHRoZSBkaWZmZXJlbmNlIGJldHdlZW4gY3VycmVudCBhbmQgbmV4dCBncmFkaWVudCBiYXNlZCBvbiBzdGVwIGluIGZyYW1lc1xuICAgICAgdmFyIHNjYWxlID0gdGhpcy5mcmFtZSAvIHRoaXMuZnJhbWVTdGVwcztcblxuICAgICAgdXBkYXRlZEdyYWRpZW50LngwID0gTWF0aC5yb3VuZChsaW5lYXJTY2FsZShjdXJyZW50R3JhZGllbnQueDAsIG5leHRHcmFkaWVudC54MCwgc2NhbGUpKTtcbiAgICAgIHVwZGF0ZWRHcmFkaWVudC55MCA9IE1hdGgucm91bmQobGluZWFyU2NhbGUoY3VycmVudEdyYWRpZW50LnkwLCBuZXh0R3JhZGllbnQueTAsIHNjYWxlKSk7XG4gICAgICB1cGRhdGVkR3JhZGllbnQucjAgPSBNYXRoLnJvdW5kKGxpbmVhclNjYWxlKGN1cnJlbnRHcmFkaWVudC5yMCwgbmV4dEdyYWRpZW50LnIwLCBzY2FsZSkpO1xuICAgICAgdXBkYXRlZEdyYWRpZW50LngxID0gTWF0aC5yb3VuZChsaW5lYXJTY2FsZShjdXJyZW50R3JhZGllbnQueDEsIG5leHRHcmFkaWVudC54MCwgc2NhbGUpKTtcbiAgICAgIHVwZGF0ZWRHcmFkaWVudC55MSA9IE1hdGgucm91bmQobGluZWFyU2NhbGUoY3VycmVudEdyYWRpZW50LnkxLCBuZXh0R3JhZGllbnQueTAsIHNjYWxlKSk7XG4gICAgICB1cGRhdGVkR3JhZGllbnQucjEgPSBNYXRoLnJvdW5kKGxpbmVhclNjYWxlKGN1cnJlbnRHcmFkaWVudC5yMSwgbmV4dEdyYWRpZW50LnIxLCBzY2FsZSkpO1xuICAgICAgdXBkYXRlZEdyYWRpZW50LmNvbG9yU3RvcCA9IGxpbmVhclNjYWxlKGN1cnJlbnRHcmFkaWVudC5jb2xvclN0b3AsIG5leHRHcmFkaWVudC5jb2xvclN0b3AsIHNjYWxlKTtcblxuICAgICAgdGhpcy5yYWRpYWxHcmFkaWVudHNbaV0gPSB1cGRhdGVkR3JhZGllbnQ7XG4gICAgfVxuICB9XG5cbiAgdGhpcy5yZXNldFBvaW50Q29sb3JzKCk7XG4gIHRoaXMucmVuZGVyKCk7XG5cbiAgaWYgKHRoaXMub3B0aW9ucy5hbmltYXRlKSB7XG4gICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpID0+IHtcbiAgICAgIHRoaXMucmVuZGVyTG9vcCgpO1xuICAgIH0pO1xuICB9IGVsc2Uge1xuICAgIHRoaXMubG9vcGluZyA9IGZhbHNlO1xuICB9XG59XG5cbi8vIGNyZWF0ZXMgYSBoaWRkZW4gY2FudmFzIGZvciBob3ZlciBkZXRlY3Rpb25cbmNyZWF0ZUhvdmVyU2hhZG93Q2FudmFzKCkge1xuICB0aGlzLmhvdmVyU2hhZG93Q2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG4gIHRoaXMuc2hhZG93Q3R4ID0gdGhpcy5ob3ZlclNoYWRvd0NhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuXG4gIHRoaXMuaG92ZXJTaGFkb3dDYW52YXMuc3R5bGUuZGlzcGxheSA9ICdub25lJztcbn1cblxuZ2VuZXJhdGVOZXdQb2ludHMobWluLCBtYXgsIG1pbkVkZ2UsIG1heEVkZ2UsIG11bHRpcGxpZXIpIHtcbiAgLy8gZGVmYXVsdHMgdG8gZ2VuZXJpYyBudW1iZXIgb2YgcG9pbnRzIGJhc2VkIG9uIGNhbnZhcyBkaW1lbnNpb25zXG4gIC8vIHRoaXMgZ2VuZXJhbGx5IGxvb2tzIHByZXR0eSBuaWNlXG4gIHZhciBhcmVhID0gdGhpcy5jYW52YXMud2lkdGggKiB0aGlzLmNhbnZhcy5oZWlnaHQ7XG4gIHZhciBwZXJpbWV0ZXIgPSAodGhpcy5jYW52YXMud2lkdGggKyB0aGlzLmNhbnZhcy5oZWlnaHQpICogMjtcblxuICBtdWx0aXBsaWVyID0gbXVsdGlwbGllciB8fCB0aGlzLm9wdGlvbnMubXVsdGlwbGllcjtcblxuICBtaW4gPSBtaW4gPiAwID8gTWF0aC5jZWlsKG1pbikgOiBNYXRoLm1heChNYXRoLmNlaWwoKGFyZWEgLyAxMjUwKSAqIG11bHRpcGxpZXIpLCA1MCk7XG4gIG1heCA9IG1heCA+IDAgPyBNYXRoLmNlaWwobWF4KSA6IE1hdGgubWF4KE1hdGguY2VpbCgoYXJlYSAvIDUwMCkgKiBtdWx0aXBsaWVyKSwgNTApO1xuXG4gIG1pbkVkZ2UgPSBtaW5FZGdlID4gMCA/IE1hdGguY2VpbChtaW5FZGdlKSA6IE1hdGgubWF4KE1hdGguY2VpbCgocGVyaW1ldGVyIC8gMTI1KSAqIG11bHRpcGxpZXIpLCA1KTtcbiAgbWF4RWRnZSA9IG1heEVkZ2UgPiAwID8gTWF0aC5jZWlsKG1heEVkZ2UpIDogTWF0aC5tYXgoTWF0aC5jZWlsKChwZXJpbWV0ZXIgLyA1MCkgKiBtdWx0aXBsaWVyKSwgNSk7XG5cbiAgdGhpcy5udW1Qb2ludHMgPSBSYW5kb20ucmFuZG9tQmV0d2VlbihtaW4sIG1heCk7XG4gIHRoaXMuZ2V0TnVtRWRnZVBvaW50cyA9IFJhbmRvbS5yYW5kb21OdW1iZXJGdW5jdGlvbihtaW5FZGdlLCBtYXhFZGdlKTtcblxuICB0aGlzLmNsZWFyKCk7XG5cbiAgLy8gYWRkIGNvcm5lciBhbmQgZWRnZSBwb2ludHNcbiAgdGhpcy5nZW5lcmF0ZUNvcm5lclBvaW50cygpO1xuICB0aGlzLmdlbmVyYXRlRWRnZVBvaW50cygpO1xuXG4gIC8vIGFkZCBzb21lIHJhbmRvbSBwb2ludHMgaW4gdGhlIG1pZGRsZSBmaWVsZCxcbiAgLy8gZXhjbHVkaW5nIGVkZ2VzIGFuZCBjb3JuZXJzXG4gIHRoaXMuZ2VuZXJhdGVSYW5kb21Qb2ludHModGhpcy5udW1Qb2ludHMsIDEsIDEsIHRoaXMud2lkdGggLSAxLCB0aGlzLmhlaWdodCAtIDEpO1xufVxuXG4vLyBhZGQgcG9pbnRzIGluIHRoZSBjb3JuZXJzXG5nZW5lcmF0ZUNvcm5lclBvaW50cygpIHtcbiAgdGhpcy5wb2ludHMucHVzaChuZXcgUG9pbnQoMCwgMCkpO1xuICB0aGlzLnBvaW50cy5wdXNoKG5ldyBQb2ludCgwLCB0aGlzLmhlaWdodCkpO1xuICB0aGlzLnBvaW50cy5wdXNoKG5ldyBQb2ludCh0aGlzLndpZHRoLCAwKSk7XG4gIHRoaXMucG9pbnRzLnB1c2gobmV3IFBvaW50KHRoaXMud2lkdGgsIHRoaXMuaGVpZ2h0KSk7XG59XG5cbi8vIGFkZCBwb2ludHMgb24gdGhlIGVkZ2VzXG5nZW5lcmF0ZUVkZ2VQb2ludHMoKSB7XG4gIC8vIGxlZnQgZWRnZVxuICB0aGlzLmdlbmVyYXRlUmFuZG9tUG9pbnRzKHRoaXMuZ2V0TnVtRWRnZVBvaW50cygpLCAwLCAwLCAwLCB0aGlzLmhlaWdodCk7XG4gIC8vIHJpZ2h0IGVkZ2VcbiAgdGhpcy5nZW5lcmF0ZVJhbmRvbVBvaW50cyh0aGlzLmdldE51bUVkZ2VQb2ludHMoKSwgdGhpcy53aWR0aCwgMCwgMCwgdGhpcy5oZWlnaHQpO1xuICAvLyBib3R0b20gZWRnZVxuICB0aGlzLmdlbmVyYXRlUmFuZG9tUG9pbnRzKHRoaXMuZ2V0TnVtRWRnZVBvaW50cygpLCAwLCB0aGlzLmhlaWdodCwgdGhpcy53aWR0aCwgMCk7XG4gIC8vIHRvcCBlZGdlXG4gIHRoaXMuZ2VuZXJhdGVSYW5kb21Qb2ludHModGhpcy5nZXROdW1FZGdlUG9pbnRzKCksIDAsIDAsIHRoaXMud2lkdGgsIDApO1xufVxuXG4vLyByYW5kb21seSBnZW5lcmF0ZSBzb21lIHBvaW50cyxcbi8vIHNhdmUgdGhlIHBvaW50IGNsb3Nlc3QgdG8gY2VudGVyXG5nZW5lcmF0ZVJhbmRvbVBvaW50cyhudW1Qb2ludHMsIHgsIHksIHdpZHRoLCBoZWlnaHQpIHtcbiAgdmFyIGNlbnRlciA9IG5ldyBQb2ludChNYXRoLnJvdW5kKHRoaXMuY2FudmFzLndpZHRoIC8gMiksIE1hdGgucm91bmQodGhpcy5jYW52YXMuaGVpZ2h0IC8gMikpO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IG51bVBvaW50czsgaSsrKSB7XG4gICAgLy8gZ2VuZXJhdGUgYSBuZXcgcG9pbnQgd2l0aCByYW5kb20gY29vcmRzXG4gICAgLy8gcmUtZ2VuZXJhdGUgdGhlIHBvaW50IGlmIGl0IGFscmVhZHkgZXhpc3RzIGluIHBvaW50bWFwIChtYXggMTAgdGltZXMpXG4gICAgdmFyIHBvaW50O1xuICAgIHZhciBqID0gMDtcbiAgICBkbyB7XG4gICAgICBqKys7XG4gICAgICBwb2ludCA9IG5ldyBQb2ludChSYW5kb20ucmFuZG9tQmV0d2Vlbih4LCB4ICsgd2lkdGgpLCBSYW5kb20ucmFuZG9tQmV0d2Vlbih5LCB5ICsgaGVpZ2h0KSk7XG4gICAgfSB3aGlsZSAodGhpcy5wb2ludE1hcC5leGlzdHMocG9pbnQpICYmIGogPCAxMCk7XG5cbiAgICBpZiAoaiA8IDEwKSB7XG4gICAgICB0aGlzLnBvaW50cy5wdXNoKHBvaW50KTtcbiAgICAgIHRoaXMucG9pbnRNYXAuYWRkKHBvaW50KTtcbiAgICB9XG5cbiAgICBpZiAoY2VudGVyLmdldERpc3RhbmNlVG8ocG9pbnQpIDwgY2VudGVyLmdldERpc3RhbmNlVG8odGhpcy5jZW50ZXIpKSB7XG4gICAgICB0aGlzLmNlbnRlciA9IHBvaW50O1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmNlbnRlci5pc0NlbnRlciA9IGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIHRoaXMuY2VudGVyLmlzQ2VudGVyID0gdHJ1ZTtcbn1cblxuLy8gdXNlIHRoZSBEZWxhdW5heSBhbGdvcml0aG0gdG8gbWFrZVxuLy8gdHJpYW5nbGVzIG91dCBvZiBvdXIgcmFuZG9tIHBvaW50c1xudHJpYW5ndWxhdGUoKSB7XG4gIHRoaXMudHJpYW5nbGVzID0gW107XG5cbiAgLy8gbWFwIHBvaW50IG9iamVjdHMgdG8gbGVuZ3RoLTIgYXJyYXlzXG4gIHZhciB2ZXJ0aWNlcyA9IHRoaXMucG9pbnRzLm1hcChmdW5jdGlvbihwb2ludCkge1xuICAgIHJldHVybiBwb2ludC5nZXRDb29yZHMoKTtcbiAgfSk7XG5cbiAgLy8gdmVydGljZXMgaXMgbm93IGFuIGFycmF5IHN1Y2ggYXM6XG4gIC8vIFsgW3AxeCwgcDF5XSwgW3AyeCwgcDJ5XSwgW3AzeCwgcDN5XSwgLi4uIF1cblxuICAvLyBkbyB0aGUgYWxnb3JpdGhtXG4gIHZhciB0cmlhbmd1bGF0ZWQgPSBEZWxhdW5heS50cmlhbmd1bGF0ZSh2ZXJ0aWNlcyk7XG5cbiAgLy8gcmV0dXJucyAxIGRpbWVuc2lvbmFsIGFycmF5IGFycmFuZ2VkIGluIHRyaXBsZXMgc3VjaCBhczpcbiAgLy8gWyB0MWEsIHQxYiwgdDFjLCB0MmEsIHQyYiwgdDJjLC4uLi4gXVxuICAvLyB3aGVyZSB0MWEsIGV0YyBhcmUgaW5kZWNlcyBpbiB0aGUgdmVydGljZXMgYXJyYXlcbiAgLy8gdHVybiB0aGF0IGludG8gYXJyYXkgb2YgdHJpYW5nbGUgcG9pbnRzXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgdHJpYW5ndWxhdGVkLmxlbmd0aDsgaSArPSAzKSB7XG4gICAgdmFyIGFyciA9IFtdO1xuICAgIGFyci5wdXNoKHZlcnRpY2VzW3RyaWFuZ3VsYXRlZFtpXV0pO1xuICAgIGFyci5wdXNoKHZlcnRpY2VzW3RyaWFuZ3VsYXRlZFtpICsgMV1dKTtcbiAgICBhcnIucHVzaCh2ZXJ0aWNlc1t0cmlhbmd1bGF0ZWRbaSArIDJdXSk7XG4gICAgdGhpcy50cmlhbmdsZXMucHVzaChhcnIpO1xuICB9XG5cbiAgLy8gbWFwIHRvIGFycmF5IG9mIFRyaWFuZ2xlIG9iamVjdHNcbiAgdGhpcy50cmlhbmdsZXMgPSB0aGlzLnRyaWFuZ2xlcy5tYXAoZnVuY3Rpb24odHJpYW5nbGUpIHtcbiAgICByZXR1cm4gbmV3IFRyaWFuZ2xlKG5ldyBQb2ludCh0cmlhbmdsZVswXSksXG4gICAgICAgICAgICAgICAgICAgICAgICBuZXcgUG9pbnQodHJpYW5nbGVbMV0pLFxuICAgICAgICAgICAgICAgICAgICAgICAgbmV3IFBvaW50KHRyaWFuZ2xlWzJdKSk7XG4gIH0pO1xufVxuXG5yZXNldFBvaW50Q29sb3JzKCkge1xuICAvLyByZXNldCBjYWNoZWQgY29sb3JzIG9mIGNlbnRyb2lkcyBhbmQgcG9pbnRzXG4gIHZhciBpO1xuICBmb3IgKGkgPSAwOyBpIDwgdGhpcy50cmlhbmdsZXMubGVuZ3RoOyBpKyspIHtcbiAgICB0aGlzLnRyaWFuZ2xlc1tpXS5yZXNldFBvaW50Q29sb3JzKCk7XG4gIH1cblxuICBmb3IgKGkgPSAwOyBpIDwgdGhpcy5wb2ludHMubGVuZ3RoOyBpKyspIHtcbiAgICB0aGlzLnBvaW50c1tpXS5yZXNldENvbG9yKCk7XG4gIH1cbn1cblxuLy8gY3JlYXRlIHJhbmRvbSByYWRpYWwgZ3JhZGllbnQgY2lyY2xlcyBmb3IgcmVuZGVyaW5nIGxhdGVyXG5nZW5lcmF0ZUdyYWRpZW50cyhtaW5HcmFkaWVudHMsIG1heEdyYWRpZW50cykge1xuICB0aGlzLnJhZGlhbEdyYWRpZW50cyA9IFtdO1xuXG4gIG1pbkdyYWRpZW50cyA9IG1pbkdyYWRpZW50cyB8fCB0aGlzLm1pbkdyYWRpZW50cyA+IDAgPyBtaW5HcmFkaWVudHMgfHwgdGhpcy5taW5HcmFkaWVudHMgOiAxO1xuICBtYXhHcmFkaWVudHMgPSBtYXhHcmFkaWVudHMgfHwgdGhpcy5tYXhHcmFkaWVudHMgPiAwID8gbWF4R3JhZGllbnRzIHx8IHRoaXMubWF4R3JhZGllbnRzIDogMjtcblxuICB0aGlzLm51bUdyYWRpZW50cyA9IFJhbmRvbS5yYW5kb21CZXR3ZWVuKG1pbkdyYWRpZW50cywgbWF4R3JhZGllbnRzKTtcblxuICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMubnVtR3JhZGllbnRzOyBpKyspIHtcbiAgICB0aGlzLmdlbmVyYXRlUmFkaWFsR3JhZGllbnQoKTtcbiAgfVxufVxuXG5nZW5lcmF0ZVJhZGlhbEdyYWRpZW50KCkge1xuICAvKipcbiAgICAqIGNyZWF0ZSBhIG5pY2UtbG9va2luZyBidXQgc29tZXdoYXQgcmFuZG9tIGdyYWRpZW50OlxuICAgICogcmFuZG9taXplIHRoZSBmaXJzdCBjaXJjbGVcbiAgICAqIHRoZSBzZWNvbmQgY2lyY2xlIHNob3VsZCBiZSBpbnNpZGUgdGhlIGZpcnN0IGNpcmNsZSxcbiAgICAqIHNvIHdlIGdlbmVyYXRlIGEgcG9pbnQgKG9yaWdpbjIpIGluc2lkZSBjaXJsZTFcbiAgICAqIHRoZW4gY2FsY3VsYXRlIHRoZSBkaXN0IGJldHdlZW4gb3JpZ2luMiBhbmQgdGhlIGNpcmN1bWZyZW5jZSBvZiBjaXJjbGUxXG4gICAgKiBjaXJjbGUyJ3MgcmFkaXVzIGNhbiBiZSBiZXR3ZWVuIDAgYW5kIHRoaXMgZGlzdFxuICAgICovXG5cbiAgdmFyIG1pblggPSB0aGlzLm9wdGlvbnMuZ3JhZGllbnQubWluWCh0aGlzLmNhbnZhcy53aWR0aCwgdGhpcy5jYW52YXMuaGVpZ2h0KTtcbiAgdmFyIG1heFggPSB0aGlzLm9wdGlvbnMuZ3JhZGllbnQubWF4WCh0aGlzLmNhbnZhcy53aWR0aCwgdGhpcy5jYW52YXMuaGVpZ2h0KTtcblxuICB2YXIgbWluWSA9IHRoaXMub3B0aW9ucy5ncmFkaWVudC5taW5ZKHRoaXMuY2FudmFzLndpZHRoLCB0aGlzLmNhbnZhcy5oZWlnaHQpO1xuICB2YXIgbWF4WSA9IHRoaXMub3B0aW9ucy5ncmFkaWVudC5tYXhZKHRoaXMuY2FudmFzLndpZHRoLCB0aGlzLmNhbnZhcy5oZWlnaHQpO1xuXG4gIHZhciBtaW5SYWRpdXMgPSB0aGlzLm9wdGlvbnMuZ3JhZGllbnQubWluUmFkaXVzKHRoaXMuY2FudmFzLndpZHRoLCB0aGlzLmNhbnZhcy5oZWlnaHQsIHRoaXMubnVtR3JhZGllbnRzKTtcbiAgdmFyIG1heFJhZGl1cyA9IHRoaXMub3B0aW9ucy5ncmFkaWVudC5tYXhSYWRpdXModGhpcy5jYW52YXMud2lkdGgsIHRoaXMuY2FudmFzLmhlaWdodCwgdGhpcy5udW1HcmFkaWVudHMpO1xuXG4gIC8vIGhlbHBlciByYW5kb20gZnVuY3Rpb25zXG4gIHZhciByYW5kb21DYW52YXNYID0gUmFuZG9tLnJhbmRvbU51bWJlckZ1bmN0aW9uKG1pblgsIG1heFgpO1xuICB2YXIgcmFuZG9tQ2FudmFzWSA9IFJhbmRvbS5yYW5kb21OdW1iZXJGdW5jdGlvbihtaW5ZLCBtYXhZKTtcbiAgdmFyIHJhbmRvbUNhbnZhc1JhZGl1cyA9IFJhbmRvbS5yYW5kb21OdW1iZXJGdW5jdGlvbihtaW5SYWRpdXMsIG1heFJhZGl1cyk7XG5cbiAgLy8gZ2VuZXJhdGUgY2lyY2xlMSBvcmlnaW4gYW5kIHJhZGl1c1xuICB2YXIgeDA7XG4gIHZhciB5MDtcbiAgdmFyIHIwID0gcmFuZG9tQ2FudmFzUmFkaXVzKCk7XG5cbiAgLy8gb3JpZ2luIG9mIHRoZSBuZXh0IGNpcmNsZSBzaG91bGQgYmUgY29udGFpbmVkXG4gIC8vIHdpdGhpbiB0aGUgYXJlYSBvZiBpdHMgcHJlZGVjZXNzb3JcbiAgaWYgKHRoaXMucmFkaWFsR3JhZGllbnRzLmxlbmd0aCA+IDApIHtcbiAgICB2YXIgbGFzdEdyYWRpZW50ID0gdGhpcy5yYWRpYWxHcmFkaWVudHNbdGhpcy5yYWRpYWxHcmFkaWVudHMubGVuZ3RoIC0gMV07XG4gICAgdmFyIHBvaW50SW5MYXN0Q2lyY2xlID0gUmFuZG9tLnJhbmRvbUluQ2lyY2xlKGxhc3RHcmFkaWVudC5yMCwgbGFzdEdyYWRpZW50LngwLCBsYXN0R3JhZGllbnQueTApO1xuXG4gICAgLy8gb3JpZ2luIG11c3QgYmUgd2l0aGluIHRoZSBib3VuZHMgb2YgdGhlIGNhbnZhc1xuICAgIHdoaWxlIChwb2ludEluTGFzdENpcmNsZS54IDwgMCB8fFxuICAgICAgICAgICBwb2ludEluTGFzdENpcmNsZS55IDwgMCB8fFxuICAgICAgICAgICBwb2ludEluTGFzdENpcmNsZS54ID4gdGhpcy5jYW52YXMud2lkdGggfHxcbiAgICAgICAgICAgcG9pbnRJbkxhc3RDaXJjbGUueSA+IHRoaXMuY2FudmFzLmhlaWdodCkge1xuICAgICAgcG9pbnRJbkxhc3RDaXJjbGUgPSBSYW5kb20ucmFuZG9tSW5DaXJjbGUobGFzdEdyYWRpZW50LnIwLCBsYXN0R3JhZGllbnQueDAsIGxhc3RHcmFkaWVudC55MCk7XG4gICAgfVxuICAgIHgwID0gcG9pbnRJbkxhc3RDaXJjbGUueDtcbiAgICB5MCA9IHBvaW50SW5MYXN0Q2lyY2xlLnk7XG4gIH0gZWxzZSB7XG4gICAgLy8gZmlyc3QgY2lyY2xlLCBqdXN0IHBpY2sgYXQgcmFuZG9tXG4gICAgeDAgPSByYW5kb21DYW52YXNYKCk7XG4gICAgeTAgPSByYW5kb21DYW52YXNZKCk7XG4gIH1cblxuICAvLyBmaW5kIGEgcmFuZG9tIHBvaW50IGluc2lkZSBjaXJjbGUxXG4gIC8vIHRoaXMgaXMgdGhlIG9yaWdpbiBvZiBjaXJjbGUgMlxuICB2YXIgcG9pbnRJbkNpcmNsZSA9IFJhbmRvbS5yYW5kb21JbkNpcmNsZShyMCAqIDAuMDksIHgwLCB5MCk7XG5cbiAgLy8gZ3JhYiB0aGUgeC95IGNvb3Jkc1xuICB2YXIgeDEgPSBwb2ludEluQ2lyY2xlLng7XG4gIHZhciB5MSA9IHBvaW50SW5DaXJjbGUueTtcblxuICAvLyBmaW5kIGRpc3RhbmNlIGJldHdlZW4gdGhlIHBvaW50IGFuZCB0aGUgY2lyY3VtZnJpZW5jZSBvZiBjaXJjbGUxXG4gIC8vIHRoZSByYWRpdXMgb2YgdGhlIHNlY29uZCBjaXJjbGUgd2lsbCBiZSBhIGZ1bmN0aW9uIG9mIHRoaXMgZGlzdGFuY2VcbiAgdmFyIHZYID0geDEgLSB4MDtcbiAgdmFyIHZZID0geTEgLSB5MDtcbiAgdmFyIG1hZ1YgPSBNYXRoLnNxcnQodlggKiB2WCArIHZZICogdlkpO1xuICB2YXIgYVggPSB4MCArIHZYIC8gbWFnViAqIHIwO1xuICB2YXIgYVkgPSB5MCArIHZZIC8gbWFnViAqIHIwO1xuXG4gIHZhciBkaXN0ID0gTWF0aC5zcXJ0KCh4MSAtIGFYKSAqICh4MSAtIGFYKSArICh5MSAtIGFZKSAqICh5MSAtIGFZKSk7XG5cbiAgLy8gZ2VuZXJhdGUgdGhlIHJhZGl1cyBvZiBjaXJjbGUyIGJhc2VkIG9uIHRoaXMgZGlzdGFuY2VcbiAgdmFyIHIxID0gUmFuZG9tLnJhbmRvbUJldHdlZW4oMSwgTWF0aC5zcXJ0KGRpc3QpKTtcblxuICAvLyByYW5kb20gYnV0IG5pY2UgbG9va2luZyBjb2xvciBzdG9wXG4gIHZhciBjb2xvclN0b3AgPSBSYW5kb20ucmFuZG9tQmV0d2VlbigyLCA4KSAvIDEwO1xuXG4gIHRoaXMucmFkaWFsR3JhZGllbnRzLnB1c2goe3gwLCB5MCwgcjAsIHgxLCB5MSwgcjEsIGNvbG9yU3RvcH0pO1xufVxuXG4vLyBzb3J0cyB0aGUgcG9pbnRzXG5zb3J0UG9pbnRzKCkge1xuICAvLyBzb3J0IHBvaW50c1xuICB0aGlzLnBvaW50cy5zb3J0KGZ1bmN0aW9uKGEsIGIpIHtcbiAgICAvLyBzb3J0IHRoZSBwb2ludFxuICAgIGlmIChhLnggPCBiLngpIHtcbiAgICAgIHJldHVybiAtMTtcbiAgICB9IGVsc2UgaWYgKGEueCA+IGIueCkge1xuICAgICAgcmV0dXJuIDE7XG4gICAgfSBlbHNlIGlmIChhLnkgPCBiLnkpIHtcbiAgICAgIHJldHVybiAtMTtcbiAgICB9IGVsc2UgaWYgKGEueSA+IGIueSkge1xuICAgICAgcmV0dXJuIDE7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiAwO1xuICAgIH1cbiAgfSk7XG59XG5cbi8vIHNpemUgdGhlIGNhbnZhcyB0byB0aGUgc2l6ZSBvZiBpdHMgcGFyZW50XG4vLyBtYWtlcyB0aGUgY2FudmFzICdyZXNwb25zaXZlJ1xucmVzaXplQ2FudmFzKCkge1xuICB2YXIgcGFyZW50ID0gdGhpcy5jYW52YXMucGFyZW50RWxlbWVudDtcbiAgdGhpcy5jYW52YXMud2lkdGggPSB0aGlzLndpZHRoID0gcGFyZW50Lm9mZnNldFdpZHRoO1xuICB0aGlzLmNhbnZhcy5oZWlnaHQgPSB0aGlzLmhlaWdodCA9IHBhcmVudC5vZmZzZXRIZWlnaHQ7XG5cbiAgaWYgKHRoaXMuaG92ZXJTaGFkb3dDYW52YXMpIHtcbiAgICB0aGlzLmhvdmVyU2hhZG93Q2FudmFzLndpZHRoID0gdGhpcy53aWR0aCA9IHBhcmVudC5vZmZzZXRXaWR0aDtcbiAgICB0aGlzLmhvdmVyU2hhZG93Q2FudmFzLmhlaWdodCA9IHRoaXMuaGVpZ2h0ID0gcGFyZW50Lm9mZnNldEhlaWdodDtcbiAgfVxufVxuXG4vLyBtb3ZlcyBwb2ludHMvdHJpYW5nbGVzIGJhc2VkIG9uIG5ldyBzaXplIG9mIGNhbnZhc1xucmVzY2FsZSgpIHtcbiAgLy8gZ3JhYiBvbGQgbWF4L21pbiBmcm9tIGN1cnJlbnQgY2FudmFzIHNpemVcbiAgdmFyIHhNaW4gPSAwO1xuICB2YXIgeE1heCA9IHRoaXMuY2FudmFzLndpZHRoO1xuICB2YXIgeU1pbiA9IDA7XG4gIHZhciB5TWF4ID0gdGhpcy5jYW52YXMuaGVpZ2h0O1xuXG4gIHRoaXMucmVzaXplQ2FudmFzKCk7XG5cbiAgaWYgKHRoaXMub3B0aW9ucy5yZXNpemVNb2RlID09PSAnc2NhbGVQb2ludHMnKSB7XG4gICAgLy8gc2NhbGUgYWxsIHBvaW50cyB0byBuZXcgbWF4IGRpbWVuc2lvbnNcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMucG9pbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB0aGlzLnBvaW50c1tpXS5yZXNjYWxlKHhNaW4sIHhNYXgsIHlNaW4sIHlNYXgsIDAsIHRoaXMuY2FudmFzLndpZHRoLCAwLCB0aGlzLmNhbnZhcy5oZWlnaHQpO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB0aGlzLmdlbmVyYXRlTmV3UG9pbnRzKCk7XG4gIH1cblxuICB0aGlzLnRyaWFuZ3VsYXRlKCk7XG5cbiAgLy8gcmVzY2FsZSBwb3NpdGlvbiBvZiByYWRpYWwgZ3JhZGllbnQgY2lyY2xlc1xuICB0aGlzLnJlc2NhbGVHcmFkaWVudHModGhpcy5yYWRpYWxHcmFkaWVudHMsIHhNaW4sIHhNYXgsIHlNaW4sIHlNYXgpO1xuICB0aGlzLnJlc2NhbGVHcmFkaWVudHModGhpcy5jdXJyZW50R3JhZGllbnRzLCB4TWluLCB4TWF4LCB5TWluLCB5TWF4KTtcbiAgdGhpcy5yZXNjYWxlR3JhZGllbnRzKHRoaXMubmV4dEdyYWRpZW50cywgeE1pbiwgeE1heCwgeU1pbiwgeU1heCk7XG5cbiAgdGhpcy5yZW5kZXIoKTtcbn1cblxucmVzY2FsZUdyYWRpZW50cyhhcnJheSwgeE1pbiwgeE1heCwgeU1pbiwgeU1heCkge1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGFycmF5Lmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIGNpcmNsZTAgPSBuZXcgUG9pbnQoYXJyYXlbaV0ueDAsIGFycmF5W2ldLnkwKTtcbiAgICB2YXIgY2lyY2xlMSA9IG5ldyBQb2ludChhcnJheVtpXS54MSwgYXJyYXlbaV0ueTEpO1xuXG4gICAgY2lyY2xlMC5yZXNjYWxlKHhNaW4sIHhNYXgsIHlNaW4sIHlNYXgsIDAsIHRoaXMuY2FudmFzLndpZHRoLCAwLCB0aGlzLmNhbnZhcy5oZWlnaHQpO1xuICAgIGNpcmNsZTEucmVzY2FsZSh4TWluLCB4TWF4LCB5TWluLCB5TWF4LCAwLCB0aGlzLmNhbnZhcy53aWR0aCwgMCwgdGhpcy5jYW52YXMuaGVpZ2h0KTtcblxuICAgIGFycmF5W2ldLngwID0gY2lyY2xlMC54O1xuICAgIGFycmF5W2ldLnkwID0gY2lyY2xlMC55O1xuICAgIGFycmF5W2ldLngxID0gY2lyY2xlMS54O1xuICAgIGFycmF5W2ldLnkxID0gY2lyY2xlMS55O1xuICB9XG59XG5cbmhvdmVyKCkge1xuICBpZiAodGhpcy5tb3VzZVBvc2l0aW9uKSB7XG4gICAgdmFyIHJnYiA9IHRoaXMubW91c2VQb3NpdGlvbi5jYW52YXNDb2xvckF0UG9pbnQodGhpcy5zaGFkb3dJbWFnZURhdGEsICdyZ2InKTtcbiAgICB2YXIgaGV4ID0gQ29sb3IucmdiVG9IZXgocmdiKTtcbiAgICB2YXIgZGVjID0gcGFyc2VJbnQoaGV4LCAxNik7XG5cbiAgICAvLyBpcyBwcm9iYWJseSB0cmlhbmdsZSB3aXRoIHRoYXQgaW5kZXgsIGJ1dFxuICAgIC8vIGVkZ2VzIGNhbiBiZSBmdXp6eSBzbyBkb3VibGUgY2hlY2tcbiAgICBpZiAoZGVjID49IDAgJiYgZGVjIDwgdGhpcy50cmlhbmdsZXMubGVuZ3RoICYmIHRoaXMudHJpYW5nbGVzW2RlY10ucG9pbnRJblRyaWFuZ2xlKHRoaXMubW91c2VQb3NpdGlvbikpIHtcbiAgICAgIC8vIGNsZWFyIHRoZSBsYXN0IHRyaWFuZ2xlXG4gICAgICB0aGlzLnJlc2V0VHJpYW5nbGUoKTtcblxuICAgICAgaWYgKHRoaXMubGFzdFRyaWFuZ2xlICE9PSBkZWMpIHtcbiAgICAgICAgLy8gcmVuZGVyIHRoZSBob3ZlcmVkIHRyaWFuZ2xlXG4gICAgICAgIHRoaXMub3B0aW9ucy5vblRyaWFuZ2xlSG92ZXIodGhpcy50cmlhbmdsZXNbZGVjXSwgdGhpcy5jdHgsIHRoaXMub3B0aW9ucyk7XG4gICAgICB9XG5cbiAgICAgIHRoaXMubGFzdFRyaWFuZ2xlID0gZGVjO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB0aGlzLnJlc2V0VHJpYW5nbGUoKTtcbiAgfVxufVxuXG5yZXNldFRyaWFuZ2xlKCkge1xuICAvLyByZWRyYXcgdGhlIGxhc3QgdHJpYW5nbGUgdGhhdCB3YXMgaG92ZXJlZCBvdmVyXG4gIGlmICh0aGlzLmxhc3RUcmlhbmdsZSAmJiB0aGlzLmxhc3RUcmlhbmdsZSA+PSAwICYmIHRoaXMubGFzdFRyaWFuZ2xlIDwgdGhpcy50cmlhbmdsZXMubGVuZ3RoKSB7XG4gICAgdmFyIGxhc3RUcmlhbmdsZSA9IHRoaXMudHJpYW5nbGVzW3RoaXMubGFzdFRyaWFuZ2xlXTtcblxuICAgIC8vIGZpbmQgdGhlIGJvdW5kaW5nIHBvaW50cyBvZiB0aGUgbGFzdCB0cmlhbmdsZVxuICAgIC8vIGV4cGFuZCBhIGJpdCBmb3IgZWRnZXNcbiAgICB2YXIgbWluWCA9IGxhc3RUcmlhbmdsZS5taW5YKCkgLSAxO1xuICAgIHZhciBtaW5ZID0gbGFzdFRyaWFuZ2xlLm1pblkoKSAtIDE7XG4gICAgdmFyIG1heFggPSBsYXN0VHJpYW5nbGUubWF4WCgpICsgMTtcbiAgICB2YXIgbWF4WSA9IGxhc3RUcmlhbmdsZS5tYXhZKCkgKyAxO1xuXG4gICAgLy8gcmVzZXQgdGhhdCBwb3J0aW9uIG9mIHRoZSBjYW52YXMgdG8gaXRzIG9yaWdpbmFsIHJlbmRlclxuICAgIHRoaXMuY3R4LnB1dEltYWdlRGF0YSh0aGlzLnJlbmRlcmVkSW1hZ2VEYXRhLCAwLCAwLCBtaW5YLCBtaW5ZLCBtYXhYIC0gbWluWCwgbWF4WSAtIG1pblkpO1xuXG4gICAgdGhpcy5sYXN0VHJpYW5nbGUgPSBmYWxzZTtcbiAgfVxufVxuXG5yZW5kZXIoKSB7XG4gIHRoaXMucmVuZGVyQmFja2dyb3VuZCh0aGlzLnJlbmRlckZvcmVncm91bmQuYmluZCh0aGlzKSk7XG59XG5cbnJlbmRlckJhY2tncm91bmQoY2FsbGJhY2spIHtcbiAgLy8gcmVuZGVyIHRoZSBiYXNlIHRvIGdldCB0cmlhbmdsZSBjb2xvcnNcbiAgaWYgKHRoaXMub3B0aW9ucy5pbWFnZUFzQmFja2dyb3VuZCkge1xuICAgIHRoaXMucmVuZGVySW1hZ2VCYWNrZ3JvdW5kKGNhbGxiYWNrKTtcbiAgfSBlbHNlIHtcbiAgICB0aGlzLnJlbmRlckdyYWRpZW50KCk7XG4gICAgY2FsbGJhY2soKTtcbiAgfVxufVxuXG5yZW5kZXJGb3JlZ3JvdW5kKCkge1xuICAvLyBnZXQgZW50aXJlIGNhbnZhcyBpbWFnZSBkYXRhIG9mIGluIGEgYmlnIHR5cGVkIGFycmF5XG4gIC8vIHRoaXMgd2F5IHdlIGRvbnQgaGF2ZSB0byBwaWNrIGZvciBlYWNoIHBvaW50IGluZGl2aWR1YWxseVxuICAvLyBpdCdzIGxpa2UgNTB4IGZhc3RlciB0aGlzIHdheVxuICB0aGlzLmdyYWRpZW50SW1hZ2VEYXRhID0gdGhpcy5jdHguZ2V0SW1hZ2VEYXRhKDAsIDAsIHRoaXMuY2FudmFzLndpZHRoLCB0aGlzLmNhbnZhcy5oZWlnaHQpO1xuXG4gIC8vIHJlbmRlcnMgdHJpYW5nbGVzLCBlZGdlcywgYW5kIHNoYWRvdyBjYW52YXMgZm9yIGhvdmVyIGRldGVjdGlvblxuICB0aGlzLnJlbmRlclRyaWFuZ2xlcyh0aGlzLm9wdGlvbnMuc2hvd1RyaWFuZ2xlcywgdGhpcy5vcHRpb25zLnNob3dFZGdlcyk7XG5cbiAgdGhpcy5yZW5kZXJFeHRyYXMoKTtcblxuICB0aGlzLnJlbmRlcmVkSW1hZ2VEYXRhID0gdGhpcy5jdHguZ2V0SW1hZ2VEYXRhKDAsIDAsIHRoaXMuY2FudmFzLndpZHRoLCB0aGlzLmNhbnZhcy5oZWlnaHQpO1xuXG4gIC8vIHRocm93IGV2ZW50cyBmb3IgbGlnaHQgLyBkYXJrIHRleHRcbiAgdmFyIGNlbnRlckNvbG9yID0gdGhpcy5jZW50ZXIuY2FudmFzQ29sb3JBdFBvaW50KCk7XG5cbiAgaWYgKHBhcnNlSW50KGNlbnRlckNvbG9yLnNwbGl0KCcsJylbMl0pIDwgNTApIHtcbiAgICBpZiAodGhpcy5vcHRpb25zLm9uRGFya0JhY2tncm91bmQpIHtcbiAgICAgIHRoaXMub3B0aW9ucy5vbkRhcmtCYWNrZ3JvdW5kKGNlbnRlckNvbG9yKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgaWYgKHRoaXMub3B0aW9ucy5vbkxpZ2h0QmFja2dyb3VuZCkge1xuICAgICAgdGhpcy5vcHRpb25zLm9uTGlnaHRCYWNrZ3JvdW5kKGNlbnRlckNvbG9yKTtcbiAgICB9XG4gIH1cbn1cblxucmVuZGVyRXh0cmFzKCkge1xuICBpZiAodGhpcy5vcHRpb25zLnNob3dQb2ludHMpIHtcbiAgICB0aGlzLnJlbmRlclBvaW50cygpO1xuICB9XG5cbiAgaWYgKHRoaXMub3B0aW9ucy5zaG93Q2lyY2xlcyAmJiAhdGhpcy5vcHRpb25zLmltYWdlQXNCYWNrZ3JvdW5kKSB7XG4gICAgdGhpcy5yZW5kZXJHcmFkaWVudENpcmNsZXMoKTtcbiAgfVxuXG4gIGlmICh0aGlzLm9wdGlvbnMuc2hvd0NlbnRyb2lkcykge1xuICAgIHRoaXMucmVuZGVyQ2VudHJvaWRzKCk7XG4gIH1cbn1cblxucmVuZGVyTmV3Q29sb3JzKGNvbG9ycykge1xuICB0aGlzLmNvbG9ycyA9IGNvbG9ycyB8fCB0aGlzLmNvbG9ycztcbiAgLy8gdHJpYW5nbGUgY2VudHJvaWRzIG5lZWQgbmV3IGNvbG9yc1xuICB0aGlzLnJlc2V0UG9pbnRDb2xvcnMoKTtcbiAgdGhpcy5yZW5kZXIoKTtcbn1cblxucmVuZGVyTmV3R3JhZGllbnQobWluR3JhZGllbnRzLCBtYXhHcmFkaWVudHMpIHtcbiAgdGhpcy5nZW5lcmF0ZUdyYWRpZW50cyhtaW5HcmFkaWVudHMsIG1heEdyYWRpZW50cyk7XG5cbiAgLy8gcHJlcCBmb3IgYW5pbWF0aW9uXG4gIHRoaXMubmV4dEdyYWRpZW50cyA9IHRoaXMucmFkaWFsR3JhZGllbnRzLnNsaWNlKDApO1xuICB0aGlzLmdlbmVyYXRlR3JhZGllbnRzKCk7XG4gIHRoaXMuY3VycmVudEdyYWRpZW50cyA9IHRoaXMucmFkaWFsR3JhZGllbnRzLnNsaWNlKDApO1xuXG4gIHRoaXMucmVzZXRQb2ludENvbG9ycygpO1xuICB0aGlzLnJlbmRlcigpO1xufVxuXG5yZW5kZXJOZXdUcmlhbmdsZXMobWluLCBtYXgsIG1pbkVkZ2UsIG1heEVkZ2UsIG11bHRpcGxpZXIpIHtcbiAgdGhpcy5nZW5lcmF0ZU5ld1BvaW50cyhtaW4sIG1heCwgbWluRWRnZSwgbWF4RWRnZSwgbXVsdGlwbGllcik7XG4gIHRoaXMudHJpYW5ndWxhdGUoKTtcbiAgdGhpcy5yZW5kZXIoKTtcbn1cblxucmVuZGVyR3JhZGllbnQoKSB7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5yYWRpYWxHcmFkaWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAvLyBjcmVhdGUgdGhlIHJhZGlhbCBncmFkaWVudCBiYXNlZCBvblxuICAgIC8vIHRoZSBnZW5lcmF0ZWQgY2lyY2xlcycgcmFkaWkgYW5kIG9yaWdpbnNcbiAgICB2YXIgcmFkaWFsR3JhZGllbnQgPSB0aGlzLmN0eC5jcmVhdGVSYWRpYWxHcmFkaWVudChcbiAgICAgIHRoaXMucmFkaWFsR3JhZGllbnRzW2ldLngwLFxuICAgICAgdGhpcy5yYWRpYWxHcmFkaWVudHNbaV0ueTAsXG4gICAgICB0aGlzLnJhZGlhbEdyYWRpZW50c1tpXS5yMCxcbiAgICAgIHRoaXMucmFkaWFsR3JhZGllbnRzW2ldLngxLFxuICAgICAgdGhpcy5yYWRpYWxHcmFkaWVudHNbaV0ueTEsXG4gICAgICB0aGlzLnJhZGlhbEdyYWRpZW50c1tpXS5yMVxuICAgICk7XG5cbiAgICB2YXIgb3V0ZXJDb2xvciA9IHRoaXMuY29sb3JzWzJdO1xuXG4gICAgLy8gbXVzdCBiZSB0cmFuc3BhcmVudCB2ZXJzaW9uIG9mIG1pZGRsZSBjb2xvclxuICAgIC8vIHRoaXMgd29ya3MgZm9yIHJnYmEgYW5kIGhzbGFcbiAgICBpZiAoaSA+IDApIHtcbiAgICAgIG91dGVyQ29sb3IgPSB0aGlzLmNvbG9yc1sxXS5zcGxpdCgnLCcpO1xuICAgICAgb3V0ZXJDb2xvclszXSA9ICcwKSc7XG4gICAgICBvdXRlckNvbG9yID0gb3V0ZXJDb2xvci5qb2luKCcsJyk7XG4gICAgfVxuXG4gICAgcmFkaWFsR3JhZGllbnQuYWRkQ29sb3JTdG9wKDEsIHRoaXMuY29sb3JzWzBdKTtcbiAgICByYWRpYWxHcmFkaWVudC5hZGRDb2xvclN0b3AodGhpcy5yYWRpYWxHcmFkaWVudHNbaV0uY29sb3JTdG9wLCB0aGlzLmNvbG9yc1sxXSk7XG4gICAgcmFkaWFsR3JhZGllbnQuYWRkQ29sb3JTdG9wKDAsIG91dGVyQ29sb3IpO1xuXG4gICAgdGhpcy5jYW52YXMucGFyZW50RWxlbWVudC5zdHlsZS5iYWNrZ3JvdW5kQ29sb3IgPSB0aGlzLmNvbG9yc1syXTtcblxuICAgIHRoaXMuY3R4LmZpbGxTdHlsZSA9IHJhZGlhbEdyYWRpZW50O1xuICAgIHRoaXMuY3R4LmZpbGxSZWN0KDAsIDAsIHRoaXMuY2FudmFzLndpZHRoLCB0aGlzLmNhbnZhcy5oZWlnaHQpO1xuICB9XG59XG5cbnJlbmRlckltYWdlQmFja2dyb3VuZChjYWxsYmFjaykge1xuICB0aGlzLmxvYWRJbWFnZUJhY2tncm91bmQoKGZ1bmN0aW9uKCkge1xuICAgIC8vIHNjYWxlIGltYWdlIHRvIGZpdCB3aWR0aC9oZWlnaHQgb2YgY2FudmFzXG4gICAgbGV0IGhlaWdodE11bHRpcGxpZXIgPSB0aGlzLmNhbnZhcy5oZWlnaHQgLyB0aGlzLmltYWdlLmhlaWdodDtcbiAgICBsZXQgd2lkdGhNdWx0aXBsaWVyID0gdGhpcy5jYW52YXMud2lkdGggLyB0aGlzLmltYWdlLndpZHRoO1xuXG4gICAgbGV0IG11bHRpcGxpZXIgPSBNYXRoLm1heChoZWlnaHRNdWx0aXBsaWVyLCB3aWR0aE11bHRpcGxpZXIpO1xuXG4gICAgdGhpcy5jdHguZHJhd0ltYWdlKHRoaXMuaW1hZ2UsIDAsIDAsIHRoaXMuaW1hZ2Uud2lkdGggKiBtdWx0aXBsaWVyLCB0aGlzLmltYWdlLmhlaWdodCAqIG11bHRpcGxpZXIpO1xuXG4gICAgY2FsbGJhY2soKTtcbiAgfSkuYmluZCh0aGlzKSk7XG59XG5cbmxvYWRJbWFnZUJhY2tncm91bmQoY2FsbGJhY2spIHtcbiAgaWYgKHRoaXMuaW1hZ2UgJiYgdGhpcy5pbWFnZS5zcmMgPT09IHRoaXMub3B0aW9ucy5pbWFnZVVSTCkge1xuICAgIGNhbGxiYWNrKCk7XG4gIH0gZWxzZSB7XG4gICAgdGhpcy5pbWFnZSA9IG5ldyBJbWFnZSgpO1xuICAgIHRoaXMuaW1hZ2UuY3Jvc3NPcmlnaW4gPSAnQW5vbnltb3VzJztcbiAgICB0aGlzLmltYWdlLnNyYyA9IHRoaXMub3B0aW9ucy5pbWFnZVVSTDtcblxuICAgIHRoaXMuaW1hZ2Uub25sb2FkID0gY2FsbGJhY2s7XG4gIH1cbn1cblxucmVuZGVyVHJpYW5nbGVzKHRyaWFuZ2xlcywgZWRnZXMpIHtcbiAgLy8gc2F2ZSB0aGlzIGZvciBsYXRlclxuICB0aGlzLmNlbnRlci5jYW52YXNDb2xvckF0UG9pbnQodGhpcy5ncmFkaWVudEltYWdlRGF0YSk7XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLnRyaWFuZ2xlcy5sZW5ndGg7IGkrKykge1xuICAgIC8vIHRoZSBjb2xvciBpcyBkZXRlcm1pbmVkIGJ5IGdyYWJiaW5nIHRoZSBjb2xvciBvZiB0aGUgY2FudmFzXG4gICAgLy8gKHdoZXJlIHdlIGRyZXcgdGhlIGdyYWRpZW50KSBhdCB0aGUgY2VudGVyIG9mIHRoZSB0cmlhbmdsZVxuXG4gICAgdGhpcy50cmlhbmdsZXNbaV0uY29sb3IgPSB0aGlzLnRyaWFuZ2xlc1tpXS5jb2xvckF0Q2VudHJvaWQodGhpcy5ncmFkaWVudEltYWdlRGF0YSk7XG5cbiAgICBpZiAodHJpYW5nbGVzICYmIGVkZ2VzKSB7XG4gICAgICB0aGlzLnRyaWFuZ2xlc1tpXS5zdHJva2UgPSB0aGlzLm9wdGlvbnMuZWRnZUNvbG9yKHRoaXMudHJpYW5nbGVzW2ldLmNvbG9yQXRDZW50cm9pZCh0aGlzLmdyYWRpZW50SW1hZ2VEYXRhKSk7XG4gICAgICB0aGlzLnRyaWFuZ2xlc1tpXS5yZW5kZXIodGhpcy5jdHgpO1xuICAgIH0gZWxzZSBpZiAodHJpYW5nbGVzKSB7XG4gICAgICAvLyB0cmlhbmdsZXMgb25seVxuICAgICAgdGhpcy50cmlhbmdsZXNbaV0uc3Ryb2tlID0gdGhpcy50cmlhbmdsZXNbaV0uY29sb3I7XG4gICAgICB0aGlzLnRyaWFuZ2xlc1tpXS5yZW5kZXIodGhpcy5jdHgpO1xuICAgIH0gZWxzZSBpZiAoZWRnZXMpIHtcbiAgICAgIC8vIGVkZ2VzIG9ubHlcbiAgICAgIHRoaXMudHJpYW5nbGVzW2ldLnN0cm9rZSA9IHRoaXMub3B0aW9ucy5lZGdlQ29sb3IodGhpcy50cmlhbmdsZXNbaV0uY29sb3JBdENlbnRyb2lkKHRoaXMuZ3JhZGllbnRJbWFnZURhdGEpKTtcbiAgICAgIHRoaXMudHJpYW5nbGVzW2ldLnJlbmRlcih0aGlzLmN0eCwgZmFsc2UpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmhvdmVyU2hhZG93Q2FudmFzKSB7XG4gICAgICB2YXIgY29sb3IgPSAnIycgKyAoJzAwMDAwMCcgKyBpLnRvU3RyaW5nKDE2KSkuc2xpY2UoLTYpO1xuICAgICAgdGhpcy50cmlhbmdsZXNbaV0ucmVuZGVyKHRoaXMuc2hhZG93Q3R4LCBjb2xvciwgZmFsc2UpO1xuICAgIH1cbiAgfVxuXG4gIGlmICh0aGlzLmhvdmVyU2hhZG93Q2FudmFzKSB7XG4gICAgdGhpcy5zaGFkb3dJbWFnZURhdGEgPSB0aGlzLnNoYWRvd0N0eC5nZXRJbWFnZURhdGEoMCwgMCwgdGhpcy5jYW52YXMud2lkdGgsIHRoaXMuY2FudmFzLmhlaWdodCk7XG4gIH1cbn1cblxuLy8gcmVuZGVycyB0aGUgcG9pbnRzIG9mIHRoZSB0cmlhbmdsZXNcbnJlbmRlclBvaW50cygpIHtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLnBvaW50cy5sZW5ndGg7IGkrKykge1xuICAgIHZhciBjb2xvciA9IHRoaXMub3B0aW9ucy5wb2ludENvbG9yKHRoaXMucG9pbnRzW2ldLmNhbnZhc0NvbG9yQXRQb2ludCh0aGlzLmdyYWRpZW50SW1hZ2VEYXRhKSk7XG4gICAgdGhpcy5wb2ludHNbaV0ucmVuZGVyKHRoaXMuY3R4LCBjb2xvcik7XG4gIH1cbn1cblxuLy8gZHJhd3MgdGhlIGNpcmNsZXMgdGhhdCBkZWZpbmUgdGhlIGdyYWRpZW50c1xucmVuZGVyR3JhZGllbnRDaXJjbGVzKCkge1xuICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMucmFkaWFsR3JhZGllbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgdGhpcy5jdHguYmVnaW5QYXRoKCk7XG4gICAgdGhpcy5jdHguYXJjKHRoaXMucmFkaWFsR3JhZGllbnRzW2ldLngwLFxuICAgICAgICAgICAgdGhpcy5yYWRpYWxHcmFkaWVudHNbaV0ueTAsXG4gICAgICAgICAgICB0aGlzLnJhZGlhbEdyYWRpZW50c1tpXS5yMCxcbiAgICAgICAgICAgIDAsIE1hdGguUEkgKiAyLCB0cnVlKTtcbiAgICB2YXIgY2VudGVyMSA9IG5ldyBQb2ludCh0aGlzLnJhZGlhbEdyYWRpZW50c1tpXS54MCwgdGhpcy5yYWRpYWxHcmFkaWVudHNbaV0ueTApO1xuICAgIHRoaXMuY3R4LnN0cm9rZVN0eWxlID0gY2VudGVyMS5jYW52YXNDb2xvckF0UG9pbnQodGhpcy5ncmFkaWVudEltYWdlRGF0YSk7XG4gICAgdGhpcy5jdHguc3Ryb2tlKCk7XG5cbiAgICB0aGlzLmN0eC5iZWdpblBhdGgoKTtcbiAgICB0aGlzLmN0eC5hcmModGhpcy5yYWRpYWxHcmFkaWVudHNbaV0ueDEsXG4gICAgICAgICAgICB0aGlzLnJhZGlhbEdyYWRpZW50c1tpXS55MSxcbiAgICAgICAgICAgIHRoaXMucmFkaWFsR3JhZGllbnRzW2ldLnIxLFxuICAgICAgICAgICAgMCwgTWF0aC5QSSAqIDIsIHRydWUpO1xuICAgIHZhciBjZW50ZXIyID0gbmV3IFBvaW50KHRoaXMucmFkaWFsR3JhZGllbnRzW2ldLngxLCB0aGlzLnJhZGlhbEdyYWRpZW50c1tpXS55MSk7XG4gICAgdGhpcy5jdHguc3Ryb2tlU3R5bGUgPSBjZW50ZXIyLmNhbnZhc0NvbG9yQXRQb2ludCh0aGlzLmdyYWRpZW50SW1hZ2VEYXRhKTtcbiAgICB0aGlzLmN0eC5zdHJva2UoKTtcbiAgfVxufVxuXG4vLyByZW5kZXIgdHJpYW5nbGUgY2VudHJvaWRzXG5yZW5kZXJDZW50cm9pZHMoKSB7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy50cmlhbmdsZXMubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgY29sb3IgPSB0aGlzLm9wdGlvbnMuY2VudHJvaWRDb2xvcih0aGlzLnRyaWFuZ2xlc1tpXS5jb2xvckF0Q2VudHJvaWQodGhpcy5ncmFkaWVudEltYWdlRGF0YSkpO1xuICAgIHRoaXMudHJpYW5nbGVzW2ldLmNlbnRyb2lkKCkucmVuZGVyKHRoaXMuY3R4LCBjb2xvcik7XG4gIH1cbn1cblxudG9nZ2xlVHJpYW5nbGVzKCkge1xuICB0aGlzLm9wdGlvbnMuc2hvd1RyaWFuZ2xlcyA9ICF0aGlzLm9wdGlvbnMuc2hvd1RyaWFuZ2xlcztcbiAgdGhpcy5yZW5kZXIoKTtcbn1cblxudG9nZ2xlUG9pbnRzKCkge1xuICB0aGlzLm9wdGlvbnMuc2hvd1BvaW50cyA9ICF0aGlzLm9wdGlvbnMuc2hvd1BvaW50cztcbiAgdGhpcy5yZW5kZXIoKTtcbn1cblxudG9nZ2xlQ2lyY2xlcygpIHtcbiAgdGhpcy5vcHRpb25zLnNob3dDaXJjbGVzID0gIXRoaXMub3B0aW9ucy5zaG93Q2lyY2xlcztcbiAgdGhpcy5yZW5kZXIoKTtcbn1cblxudG9nZ2xlQ2VudHJvaWRzKCkge1xuICB0aGlzLm9wdGlvbnMuc2hvd0NlbnRyb2lkcyA9ICF0aGlzLm9wdGlvbnMuc2hvd0NlbnRyb2lkcztcbiAgdGhpcy5yZW5kZXIoKTtcbn1cblxudG9nZ2xlRWRnZXMoKSB7XG4gIHRoaXMub3B0aW9ucy5zaG93RWRnZXMgPSAhdGhpcy5vcHRpb25zLnNob3dFZGdlcztcbiAgdGhpcy5yZW5kZXIoKTtcbn1cblxudG9nZ2xlQW5pbWF0aW9uKCkge1xuICB0aGlzLm9wdGlvbnMuYW5pbWF0ZSA9ICF0aGlzLm9wdGlvbnMuYW5pbWF0ZTtcbiAgaWYgKHRoaXMub3B0aW9ucy5hbmltYXRlKSB7XG4gICAgdGhpcy5pbml0UmVuZGVyTG9vcCgpO1xuICB9XG59XG5cbmdldENvbG9ycygpIHtcbiAgcmV0dXJuIHRoaXMuY29sb3JzO1xufVxufVxuXG5mdW5jdGlvbiBsaW5lYXJTY2FsZSh4MCwgeDEsIHNjYWxlKSB7XG5yZXR1cm4geDAgKyAoc2NhbGUgKiAoeDEgLSB4MCkpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFByZXR0eURlbGF1bmF5O1xuIiwidmFyIENvbG9yO1xuXG4oZnVuY3Rpb24oKSB7XG4gICd1c2Ugc3RyaWN0JztcbiAgLy8gY29sb3IgaGVscGVyIGZ1bmN0aW9uc1xuICBDb2xvciA9IHtcblxuICAgIGhleFRvUmdiYTogZnVuY3Rpb24oaGV4KSB7XG4gICAgICBoZXggPSBoZXgucmVwbGFjZSgnIycsICcnKTtcbiAgICAgIHZhciByID0gcGFyc2VJbnQoaGV4LnN1YnN0cmluZygwLCAyKSwgMTYpO1xuICAgICAgdmFyIGcgPSBwYXJzZUludChoZXguc3Vic3RyaW5nKDIsIDQpLCAxNik7XG4gICAgICB2YXIgYiA9IHBhcnNlSW50KGhleC5zdWJzdHJpbmcoNCwgNiksIDE2KTtcblxuICAgICAgcmV0dXJuICdyZ2JhKCcgKyByICsgJywnICsgZyArICcsJyArIGIgKyAnLDEpJztcbiAgICB9LFxuXG4gICAgaGV4VG9SZ2JhQXJyYXk6IGZ1bmN0aW9uKGhleCkge1xuICAgICAgaGV4ID0gaGV4LnJlcGxhY2UoJyMnLCAnJyk7XG4gICAgICB2YXIgciA9IHBhcnNlSW50KGhleC5zdWJzdHJpbmcoMCwgMiksIDE2KTtcbiAgICAgIHZhciBnID0gcGFyc2VJbnQoaGV4LnN1YnN0cmluZygyLCA0KSwgMTYpO1xuICAgICAgdmFyIGIgPSBwYXJzZUludChoZXguc3Vic3RyaW5nKDQsIDYpLCAxNik7XG5cbiAgICAgIHJldHVybiBbciwgZywgYl07XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvbnZlcnRzIGFuIFJHQiBjb2xvciB2YWx1ZSB0byBIU0wuIENvbnZlcnNpb24gZm9ybXVsYVxuICAgICAqIGFkYXB0ZWQgZnJvbSBodHRwOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0hTTF9jb2xvcl9zcGFjZS5cbiAgICAgKiBBc3N1bWVzIHIsIGcsIGFuZCBiIGFyZSBjb250YWluZWQgaW4gdGhlIHNldCBbMCwgMjU1XSBhbmRcbiAgICAgKiByZXR1cm5zIGgsIHMsIGFuZCBsIGluIHRoZSBzZXQgWzAsIDFdLlxuICAgICAqXG4gICAgICogQHBhcmFtICAgTnVtYmVyICByICAgICAgIFRoZSByZWQgY29sb3IgdmFsdWVcbiAgICAgKiBAcGFyYW0gICBOdW1iZXIgIGcgICAgICAgVGhlIGdyZWVuIGNvbG9yIHZhbHVlXG4gICAgICogQHBhcmFtICAgTnVtYmVyICBiICAgICAgIFRoZSBibHVlIGNvbG9yIHZhbHVlXG4gICAgICogQHJldHVybiAgQXJyYXkgICAgICAgICAgIFRoZSBIU0wgcmVwcmVzZW50YXRpb25cbiAgICAgKi9cbiAgICByZ2JUb0hzbGE6IGZ1bmN0aW9uKHJnYikge1xuICAgICAgdmFyIHIgPSByZ2JbMF0gLyAyNTU7XG4gICAgICB2YXIgZyA9IHJnYlsxXSAvIDI1NTtcbiAgICAgIHZhciBiID0gcmdiWzJdIC8gMjU1O1xuICAgICAgdmFyIG1heCA9IE1hdGgubWF4KHIsIGcsIGIpO1xuICAgICAgdmFyIG1pbiA9IE1hdGgubWluKHIsIGcsIGIpO1xuICAgICAgdmFyIGg7XG4gICAgICB2YXIgcztcbiAgICAgIHZhciBsID0gKG1heCArIG1pbikgLyAyO1xuXG4gICAgICBpZiAobWF4ID09PSBtaW4pIHtcbiAgICAgICAgaCA9IHMgPSAwOyAvLyBhY2hyb21hdGljXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgZCA9IG1heCAtIG1pbjtcbiAgICAgICAgcyA9IGwgPiAwLjUgPyBkIC8gKDIgLSBtYXggLSBtaW4pIDogZCAvIChtYXggKyBtaW4pO1xuICAgICAgICBzd2l0Y2ggKG1heCl7XG4gICAgICAgICAgY2FzZSByOiBoID0gKGcgLSBiKSAvIGQgKyAoZyA8IGIgPyA2IDogMCk7IGJyZWFrO1xuICAgICAgICAgIGNhc2UgZzogaCA9IChiIC0gcikgLyBkICsgMjsgYnJlYWs7XG4gICAgICAgICAgY2FzZSBiOiBoID0gKHIgLSBnKSAvIGQgKyA0OyBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBoIC89IDY7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiAnaHNsYSgnICsgTWF0aC5yb3VuZChoICogMzYwKSArICcsJyArIE1hdGgucm91bmQocyAqIDEwMCkgKyAnJSwnICsgTWF0aC5yb3VuZChsICogMTAwKSArICclLDEpJztcbiAgICB9LFxuXG4gICAgaHNsYUFkanVzdEFscGhhOiBmdW5jdGlvbihjb2xvciwgYWxwaGEpIHtcbiAgICAgIGNvbG9yID0gY29sb3Iuc3BsaXQoJywnKTtcblxuICAgICAgaWYgKHR5cGVvZiBhbHBoYSAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBjb2xvclszXSA9IGFscGhhO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29sb3JbM10gPSBhbHBoYShwYXJzZUludChjb2xvclszXSkpO1xuICAgICAgfVxuXG4gICAgICBjb2xvclszXSArPSAnKSc7XG4gICAgICByZXR1cm4gY29sb3Iuam9pbignLCcpO1xuICAgIH0sXG5cbiAgICBoc2xhQWRqdXN0TGlnaHRuZXNzOiBmdW5jdGlvbihjb2xvciwgbGlnaHRuZXNzKSB7XG4gICAgICBjb2xvciA9IGNvbG9yLnNwbGl0KCcsJyk7XG5cbiAgICAgIGlmICh0eXBlb2YgbGlnaHRuZXNzICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIGNvbG9yWzJdID0gbGlnaHRuZXNzO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29sb3JbMl0gPSBsaWdodG5lc3MocGFyc2VJbnQoY29sb3JbMl0pKTtcbiAgICAgIH1cblxuICAgICAgY29sb3JbMl0gKz0gJyUnO1xuICAgICAgcmV0dXJuIGNvbG9yLmpvaW4oJywnKTtcbiAgICB9LFxuXG4gICAgcmdiVG9IZXg6IGZ1bmN0aW9uKHJnYikge1xuICAgICAgaWYgKHR5cGVvZiByZ2IgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHJnYiA9IHJnYi5yZXBsYWNlKCdyZ2IoJywgJycpLnJlcGxhY2UoJyknLCAnJykuc3BsaXQoJywnKTtcbiAgICAgIH1cbiAgICAgIHJnYiA9IHJnYi5tYXAoZnVuY3Rpb24oeCkge1xuICAgICAgICB4ID0gcGFyc2VJbnQoeCkudG9TdHJpbmcoMTYpO1xuICAgICAgICByZXR1cm4gKHgubGVuZ3RoID09PSAxKSA/ICcwJyArIHggOiB4O1xuICAgICAgfSk7XG4gICAgICByZXR1cm4gcmdiLmpvaW4oJycpO1xuICAgIH0sXG4gIH07XG5cbiAgaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBDb2xvcjtcbiAgfVxuXG59KSgpO1xuIiwidmFyIFBvaW50O1xuXG4oZnVuY3Rpb24oKSB7XG4gICd1c2Ugc3RyaWN0JztcblxuICB2YXIgQ29sb3IgPSBDb2xvciB8fCByZXF1aXJlKCcuL2NvbG9yJyk7XG5cbiAgLyoqXG4gICAqIFJlcHJlc2VudHMgYSBwb2ludFxuICAgKiBAY2xhc3NcbiAgICovXG4gIGNsYXNzIF9Qb2ludCB7XG4gICAgLyoqXG4gICAgICogUG9pbnQgY29uc2lzdHMgeCBhbmQgeVxuICAgICAqIEBjb25zdHJ1Y3RvclxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSB4XG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IHlcbiAgICAgKiBvcjpcbiAgICAgKiBAcGFyYW0ge051bWJlcltdfSB4XG4gICAgICogd2hlcmUgeCBpcyBsZW5ndGgtMiBhcnJheVxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKHgsIHkpIHtcbiAgICAgIGlmIChBcnJheS5pc0FycmF5KHgpKSB7XG4gICAgICAgIHkgPSB4WzFdO1xuICAgICAgICB4ID0geFswXTtcbiAgICAgIH1cbiAgICAgIHRoaXMueCA9IHg7XG4gICAgICB0aGlzLnkgPSB5O1xuICAgICAgdGhpcy5yYWRpdXMgPSAxO1xuICAgICAgdGhpcy5jb2xvciA9ICdibGFjayc7XG4gICAgfVxuXG4gICAgLy8gZHJhdyB0aGUgcG9pbnRcbiAgICByZW5kZXIoY3R4LCBjb2xvcikge1xuICAgICAgY3R4LmJlZ2luUGF0aCgpO1xuICAgICAgY3R4LmFyYyh0aGlzLngsIHRoaXMueSwgdGhpcy5yYWRpdXMsIDAsIDIgKiBNYXRoLlBJLCBmYWxzZSk7XG4gICAgICBjdHguZmlsbFN0eWxlID0gY29sb3IgfHwgdGhpcy5jb2xvcjtcbiAgICAgIGN0eC5maWxsKCk7XG4gICAgICBjdHguY2xvc2VQYXRoKCk7XG4gICAgfVxuXG4gICAgLy8gY29udmVydHMgdG8gc3RyaW5nXG4gICAgLy8gcmV0dXJucyBzb21ldGhpbmcgbGlrZTpcbiAgICAvLyBcIihYLFkpXCJcbiAgICAvLyB1c2VkIGluIHRoZSBwb2ludG1hcCB0byBkZXRlY3QgdW5pcXVlIHBvaW50c1xuICAgIHRvU3RyaW5nKCkge1xuICAgICAgcmV0dXJuICcoJyArIHRoaXMueCArICcsJyArIHRoaXMueSArICcpJztcbiAgICB9XG5cbiAgICAvLyBncmFiIHRoZSBjb2xvciBvZiB0aGUgY2FudmFzIGF0IHRoZSBwb2ludFxuICAgIC8vIHJlcXVpcmVzIGltYWdlZGF0YSBmcm9tIGNhbnZhcyBzbyB3ZSBkb250IGdyYWJcbiAgICAvLyBlYWNoIHBvaW50IGluZGl2aWR1YWxseSwgd2hpY2ggaXMgcmVhbGx5IGV4cGVuc2l2ZVxuICAgIGNhbnZhc0NvbG9yQXRQb2ludChpbWFnZURhdGEsIGNvbG9yU3BhY2UpIHtcbiAgICAgIGNvbG9yU3BhY2UgPSBjb2xvclNwYWNlIHx8ICdoc2xhJztcbiAgICAgIC8vIG9ubHkgZmluZCB0aGUgY2FudmFzIGNvbG9yIGlmIHdlIGRvbnQgYWxyZWFkeSBrbm93IGl0XG4gICAgICBpZiAoIXRoaXMuX2NhbnZhc0NvbG9yKSB7XG4gICAgICAgIC8vIGltYWdlRGF0YSBhcnJheSBpcyBmbGF0LCBnb2VzIGJ5IHJvd3MgdGhlbiBjb2xzLCBmb3VyIHZhbHVlcyBwZXIgcGl4ZWxcbiAgICAgICAgdmFyIGlkeCA9IChNYXRoLmZsb29yKHRoaXMueSkgKiBpbWFnZURhdGEud2lkdGggKiA0KSArIChNYXRoLmZsb29yKHRoaXMueCkgKiA0KTtcblxuICAgICAgICBpZiAoY29sb3JTcGFjZSA9PT0gJ2hzbGEnKSB7XG4gICAgICAgICAgdGhpcy5fY2FudmFzQ29sb3IgPSBDb2xvci5yZ2JUb0hzbGEoQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoaW1hZ2VEYXRhLmRhdGEsIGlkeCwgaWR4ICsgNCkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMuX2NhbnZhc0NvbG9yID0gJ3JnYignICsgQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoaW1hZ2VEYXRhLmRhdGEsIGlkeCwgaWR4ICsgMykuam9pbigpICsgJyknO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gdGhpcy5fY2FudmFzQ29sb3I7XG4gICAgICB9XG4gICAgICByZXR1cm4gdGhpcy5fY2FudmFzQ29sb3I7XG4gICAgfVxuXG4gICAgZ2V0Q29vcmRzKCkge1xuICAgICAgcmV0dXJuIFt0aGlzLngsIHRoaXMueV07XG4gICAgfVxuXG4gICAgLy8gZGlzdGFuY2UgdG8gYW5vdGhlciBwb2ludFxuICAgIGdldERpc3RhbmNlVG8ocG9pbnQpIHtcbiAgICAgIC8vIOKImih4MuKIkngxKTIrKHky4oiSeTEpMlxuICAgICAgcmV0dXJuIE1hdGguc3FydChNYXRoLnBvdyh0aGlzLnggLSBwb2ludC54LCAyKSArIE1hdGgucG93KHRoaXMueSAtIHBvaW50LnksIDIpKTtcbiAgICB9XG5cbiAgICAvLyBzY2FsZSBwb2ludHMgZnJvbSBbQSwgQl0gdG8gW0MsIERdXG4gICAgLy8geEEgPT4gb2xkIHggbWluLCB4QiA9PiBvbGQgeCBtYXhcbiAgICAvLyB5QSA9PiBvbGQgeSBtaW4sIHlCID0+IG9sZCB5IG1heFxuICAgIC8vIHhDID0+IG5ldyB4IG1pbiwgeEQgPT4gbmV3IHggbWF4XG4gICAgLy8geUMgPT4gbmV3IHkgbWluLCB5RCA9PiBuZXcgeSBtYXhcbiAgICByZXNjYWxlKHhBLCB4QiwgeUEsIHlCLCB4QywgeEQsIHlDLCB5RCkge1xuICAgICAgLy8gTmV3VmFsdWUgPSAoKChPbGRWYWx1ZSAtIE9sZE1pbikgKiBOZXdSYW5nZSkgLyBPbGRSYW5nZSkgKyBOZXdNaW5cblxuICAgICAgdmFyIHhPbGRSYW5nZSA9IHhCIC0geEE7XG4gICAgICB2YXIgeU9sZFJhbmdlID0geUIgLSB5QTtcblxuICAgICAgdmFyIHhOZXdSYW5nZSA9IHhEIC0geEM7XG4gICAgICB2YXIgeU5ld1JhbmdlID0geUQgLSB5QztcblxuICAgICAgdGhpcy54ID0gKCgodGhpcy54IC0geEEpICogeE5ld1JhbmdlKSAvIHhPbGRSYW5nZSkgKyB4QztcbiAgICAgIHRoaXMueSA9ICgoKHRoaXMueSAtIHlBKSAqIHlOZXdSYW5nZSkgLyB5T2xkUmFuZ2UpICsgeUM7XG4gICAgfVxuXG4gICAgcmVzZXRDb2xvcigpIHtcbiAgICAgIHRoaXMuX2NhbnZhc0NvbG9yID0gdW5kZWZpbmVkO1xuICAgIH1cbiAgfVxuXG4gIGlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gX1BvaW50O1xuICB9XG5cbiAgUG9pbnQgPSBfUG9pbnQ7XG59KSgpO1xuIiwidmFyIFBvaW50TWFwO1xuXG4oZnVuY3Rpb24oKSB7XG4gICd1c2Ugc3RyaWN0JztcblxuICB2YXIgUG9pbnQgPSBQb2ludCB8fCByZXF1aXJlKCcuL3BvaW50Jyk7XG5cbiAgLyoqXG4gICAqIFJlcHJlc2VudHMgYSBwb2ludFxuICAgKiBAY2xhc3NcbiAgICovXG4gIGNsYXNzIF9Qb2ludE1hcCB7XG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICB0aGlzLl9tYXAgPSB7fTtcbiAgICB9XG5cbiAgICAvLyBhZGRzIHBvaW50IHRvIG1hcFxuICAgIGFkZChwb2ludCkge1xuICAgICAgdGhpcy5fbWFwW3BvaW50LnRvU3RyaW5nKCldID0gdHJ1ZTtcbiAgICB9XG5cbiAgICAvLyBhZGRzIHgsIHkgY29vcmQgdG8gbWFwXG4gICAgYWRkQ29vcmQoeCwgeSkge1xuICAgICAgdGhpcy5hZGQobmV3IFBvaW50KHgsIHkpKTtcbiAgICB9XG5cbiAgICAvLyByZW1vdmVzIHBvaW50IGZyb20gbWFwXG4gICAgcmVtb3ZlKHBvaW50KSB7XG4gICAgICB0aGlzLl9tYXBbcG9pbnQudG9TdHJpbmcoKV0gPSBmYWxzZTtcbiAgICB9XG5cbiAgICAvLyByZW1vdmVzIHgsIHkgY29vcmQgZnJvbSBtYXBcbiAgICByZW1vdmVDb29yZCh4LCB5KSB7XG4gICAgICB0aGlzLnJlbW92ZShuZXcgUG9pbnQoeCwgeSkpO1xuICAgIH1cblxuICAgIC8vIGNsZWFycyB0aGUgbWFwXG4gICAgY2xlYXIoKSB7XG4gICAgICB0aGlzLl9tYXAgPSB7fTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBkZXRlcm1pbmVzIGlmIHBvaW50IGhhcyBiZWVuXG4gICAgICogYWRkZWQgdG8gbWFwIGFscmVhZHlcbiAgICAgKiAgQHJldHVybnMge0Jvb2xlYW59XG4gICAgICovXG4gICAgZXhpc3RzKHBvaW50KSB7XG4gICAgICByZXR1cm4gdGhpcy5fbWFwW3BvaW50LnRvU3RyaW5nKCldID8gdHJ1ZSA6IGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIGlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gX1BvaW50TWFwO1xuICB9XG5cbiAgUG9pbnRNYXAgPSBfUG9pbnRNYXA7XG59KSgpO1xuIiwiKGZ1bmN0aW9uKCkge1xuICAndXNlIHN0cmljdCc7XG5cbiAgZnVuY3Rpb24gcG9seWZpbGxzKCkge1xuICAgIC8vIHBvbHlmaWxsIGZvciBPYmplY3QuYXNzaWduXG4gICAgaWYgKHR5cGVvZiBPYmplY3QuYXNzaWduICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICBPYmplY3QuYXNzaWduID0gZnVuY3Rpb24odGFyZ2V0KSB7XG4gICAgICAgIGlmICh0YXJnZXQgPT09IHVuZGVmaW5lZCB8fCB0YXJnZXQgPT09IG51bGwpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdDYW5ub3QgY29udmVydCB1bmRlZmluZWQgb3IgbnVsbCB0byBvYmplY3QnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBvdXRwdXQgPSBPYmplY3QodGFyZ2V0KTtcbiAgICAgICAgZm9yICh2YXIgaW5kZXggPSAxOyBpbmRleCA8IGFyZ3VtZW50cy5sZW5ndGg7IGluZGV4KyspIHtcbiAgICAgICAgICB2YXIgc291cmNlID0gYXJndW1lbnRzW2luZGV4XTtcbiAgICAgICAgICBpZiAoc291cmNlICE9PSB1bmRlZmluZWQgJiYgc291cmNlICE9PSBudWxsKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBuZXh0S2V5IGluIHNvdXJjZSkge1xuICAgICAgICAgICAgICBpZiAoc291cmNlLmhhc093blByb3BlcnR5KG5leHRLZXkpKSB7XG4gICAgICAgICAgICAgICAgb3V0cHV0W25leHRLZXldID0gc291cmNlW25leHRLZXldO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBvdXRwdXQ7XG4gICAgICB9O1xuICAgIH1cbiAgfVxuXG4gIG1vZHVsZS5leHBvcnRzID0gcG9seWZpbGxzO1xuXG59KSgpO1xuIiwidmFyIFJhbmRvbTtcblxuKGZ1bmN0aW9uKCkge1xuICAndXNlIHN0cmljdCc7XG4gIC8vIFJhbmRvbSBoZWxwZXIgZnVuY3Rpb25zLy8gcmFuZG9tIGhlbHBlciBmdW5jdGlvbnNcblxuICB2YXIgUG9pbnQgPSBQb2ludCB8fCByZXF1aXJlKCcuL3BvaW50Jyk7XG5cbiAgUmFuZG9tID0ge1xuICAgIC8vIGhleSBsb29rIGEgY2xvc3VyZVxuICAgIC8vIHJldHVybnMgZnVuY3Rpb24gZm9yIHJhbmRvbSBudW1iZXJzIHdpdGggcHJlLXNldCBtYXggYW5kIG1pblxuICAgIHJhbmRvbU51bWJlckZ1bmN0aW9uOiBmdW5jdGlvbihtYXgsIG1pbikge1xuICAgICAgbWluID0gbWluIHx8IDA7XG4gICAgICBpZiAobWluID4gbWF4KSB7XG4gICAgICAgIHZhciB0ZW1wID0gbWF4O1xuICAgICAgICBtYXggPSBtaW47XG4gICAgICAgIG1pbiA9IHRlbXA7XG4gICAgICB9XG4gICAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAobWF4IC0gbWluICsgMSkpICsgbWluO1xuICAgICAgfTtcbiAgICB9LFxuXG4gICAgLy8gcmV0dXJucyBhIHJhbmRvbSBudW1iZXJcbiAgICAvLyBiZXR3ZWVuIHRoZSBtYXggYW5kIG1pblxuICAgIHJhbmRvbUJldHdlZW46IGZ1bmN0aW9uKG1heCwgbWluKSB7XG4gICAgICBtaW4gPSBtaW4gfHwgMDtcbiAgICAgIHJldHVybiBSYW5kb20ucmFuZG9tTnVtYmVyRnVuY3Rpb24obWF4LCBtaW4pKCk7XG4gICAgfSxcblxuICAgIHJhbmRvbUluQ2lyY2xlOiBmdW5jdGlvbihyYWRpdXMsIG94LCBveSkge1xuICAgICAgdmFyIGFuZ2xlID0gTWF0aC5yYW5kb20oKSAqIE1hdGguUEkgKiAyO1xuICAgICAgdmFyIHJhZCA9IE1hdGguc3FydChNYXRoLnJhbmRvbSgpKSAqIHJhZGl1cztcbiAgICAgIHZhciB4ID0gb3ggKyByYWQgKiBNYXRoLmNvcyhhbmdsZSk7XG4gICAgICB2YXIgeSA9IG95ICsgcmFkICogTWF0aC5zaW4oYW5nbGUpO1xuXG4gICAgICByZXR1cm4gbmV3IFBvaW50KHgsIHkpO1xuICAgIH0sXG5cbiAgICByYW5kb21SZ2JhOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiAncmdiYSgnICsgUmFuZG9tLnJhbmRvbUJldHdlZW4oMjU1KSArICcsJyArXG4gICAgICAgICAgICAgICAgICAgICAgIFJhbmRvbS5yYW5kb21CZXR3ZWVuKDI1NSkgKyAnLCcgK1xuICAgICAgICAgICAgICAgICAgICAgICBSYW5kb20ucmFuZG9tQmV0d2VlbigyNTUpICsgJywgMSknO1xuICAgIH0sXG5cbiAgICByYW5kb21Ic2xhOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiAnaHNsYSgnICsgUmFuZG9tLnJhbmRvbUJldHdlZW4oMzYwKSArICcsJyArXG4gICAgICAgICAgICAgICAgICAgICAgIFJhbmRvbS5yYW5kb21CZXR3ZWVuKDEwMCkgKyAnJSwnICtcbiAgICAgICAgICAgICAgICAgICAgICAgUmFuZG9tLnJhbmRvbUJldHdlZW4oMTAwKSArICclLCAxKSc7XG4gICAgfSxcbiAgfTtcblxuICBpZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IFJhbmRvbTtcbiAgfVxuXG59KSgpO1xuIiwidmFyIFRyaWFuZ2xlO1xuXG4oZnVuY3Rpb24oKSB7XG4gICd1c2Ugc3RyaWN0JztcblxuICB2YXIgUG9pbnQgPSBQb2ludCB8fCByZXF1aXJlKCcuL3BvaW50Jyk7XG5cbiAgLyoqXG4gICAqIFJlcHJlc2VudHMgYSB0cmlhbmdsZVxuICAgKiBAY2xhc3NcbiAgICovXG4gIGNsYXNzIF9UcmlhbmdsZSB7XG4gICAgLyoqXG4gICAgICogVHJpYW5nbGUgY29uc2lzdHMgb2YgdGhyZWUgUG9pbnRzXG4gICAgICogQGNvbnN0cnVjdG9yXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGFcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gYlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBjXG4gICAgICovXG4gICAgY29uc3RydWN0b3IoYSwgYiwgYykge1xuICAgICAgdGhpcy5wMSA9IHRoaXMuYSA9IGE7XG4gICAgICB0aGlzLnAyID0gdGhpcy5iID0gYjtcbiAgICAgIHRoaXMucDMgPSB0aGlzLmMgPSBjO1xuXG4gICAgICB0aGlzLmNvbG9yID0gJ2JsYWNrJztcbiAgICAgIHRoaXMuc3Ryb2tlID0gJ2JsYWNrJztcbiAgICB9XG5cbiAgICAvLyBkcmF3IHRoZSB0cmlhbmdsZSB3aXRoIGRpZmZlcmluZyBlZGdlIGNvbG9ycyBvcHRpb25hbFxuICAgIHJlbmRlcihjdHgsIGNvbG9yLCBzdHJva2UpIHtcbiAgICAgIGN0eC5iZWdpblBhdGgoKTtcbiAgICAgIGN0eC5tb3ZlVG8odGhpcy5hLngsIHRoaXMuYS55KTtcbiAgICAgIGN0eC5saW5lVG8odGhpcy5iLngsIHRoaXMuYi55KTtcbiAgICAgIGN0eC5saW5lVG8odGhpcy5jLngsIHRoaXMuYy55KTtcbiAgICAgIGN0eC5jbG9zZVBhdGgoKTtcbiAgICAgIGN0eC5zdHJva2VTdHlsZSA9IHN0cm9rZSB8fCB0aGlzLnN0cm9rZSB8fCB0aGlzLmNvbG9yO1xuICAgICAgY3R4LmZpbGxTdHlsZSA9IGNvbG9yIHx8IHRoaXMuY29sb3I7XG4gICAgICBpZiAoY29sb3IgIT09IGZhbHNlICYmIHN0cm9rZSAhPT0gZmFsc2UpIHtcbiAgICAgICAgLy8gZHJhdyB0aGUgc3Ryb2tlIHVzaW5nIHRoZSBmaWxsIGNvbG9yIGZpcnN0XG4gICAgICAgIC8vIHNvIHRoYXQgdGhlIHBvaW50cyBvZiBhZGphY2VudCB0cmlhbmdsZXNcbiAgICAgICAgLy8gZG9udCBvdmVybGFwIGEgYnVuY2ggYW5kIGxvb2sgXCJzdGFycnlcIlxuICAgICAgICB2YXIgdGVtcFN0cm9rZSA9IGN0eC5zdHJva2VTdHlsZTtcbiAgICAgICAgY3R4LnN0cm9rZVN0eWxlID0gY3R4LmZpbGxTdHlsZTtcbiAgICAgICAgY3R4LnN0cm9rZSgpO1xuICAgICAgICBjdHguc3Ryb2tlU3R5bGUgPSB0ZW1wU3Ryb2tlO1xuICAgICAgfVxuICAgICAgaWYgKGNvbG9yICE9PSBmYWxzZSkge1xuICAgICAgICBjdHguZmlsbCgpO1xuICAgICAgfVxuICAgICAgaWYgKHN0cm9rZSAhPT0gZmFsc2UpIHtcbiAgICAgICAgY3R4LnN0cm9rZSgpO1xuICAgICAgfVxuICAgICAgY3R4LmNsb3NlUGF0aCgpO1xuICAgIH1cblxuICAgIC8vIHJhbmRvbSBwb2ludCBpbnNpZGUgdHJpYW5nbGVcbiAgICByYW5kb21JbnNpZGUoKSB7XG4gICAgICB2YXIgcjEgPSBNYXRoLnJhbmRvbSgpO1xuICAgICAgdmFyIHIyID0gTWF0aC5yYW5kb20oKTtcbiAgICAgIHZhciB4ID0gKDEgLSBNYXRoLnNxcnQocjEpKSAqXG4gICAgICAgICAgICAgIHRoaXMucDEueCArIChNYXRoLnNxcnQocjEpICpcbiAgICAgICAgICAgICAgKDEgLSByMikpICpcbiAgICAgICAgICAgICAgdGhpcy5wMi54ICsgKE1hdGguc3FydChyMSkgKiByMikgKlxuICAgICAgICAgICAgICB0aGlzLnAzLng7XG4gICAgICB2YXIgeSA9ICgxIC0gTWF0aC5zcXJ0KHIxKSkgKlxuICAgICAgICAgICAgICB0aGlzLnAxLnkgKyAoTWF0aC5zcXJ0KHIxKSAqXG4gICAgICAgICAgICAgICgxIC0gcjIpKSAqXG4gICAgICAgICAgICAgIHRoaXMucDIueSArIChNYXRoLnNxcnQocjEpICogcjIpICpcbiAgICAgICAgICAgICAgdGhpcy5wMy55O1xuICAgICAgcmV0dXJuIG5ldyBQb2ludCh4LCB5KTtcbiAgICB9XG5cbiAgICBjb2xvckF0Q2VudHJvaWQoaW1hZ2VEYXRhKSB7XG4gICAgICByZXR1cm4gdGhpcy5jZW50cm9pZCgpLmNhbnZhc0NvbG9yQXRQb2ludChpbWFnZURhdGEpO1xuICAgIH1cblxuICAgIHJlc2V0UG9pbnRDb2xvcnMoKSB7XG4gICAgICB0aGlzLmNlbnRyb2lkKCkucmVzZXRDb2xvcigpO1xuICAgICAgdGhpcy5wMS5yZXNldENvbG9yKCk7XG4gICAgICB0aGlzLnAyLnJlc2V0Q29sb3IoKTtcbiAgICAgIHRoaXMucDMucmVzZXRDb2xvcigpO1xuICAgIH1cblxuICAgIGNlbnRyb2lkKCkge1xuICAgICAgLy8gb25seSBjYWxjIHRoZSBjZW50cm9pZCBpZiB3ZSBkb250IGFscmVhZHkga25vdyBpdFxuICAgICAgaWYgKHRoaXMuX2NlbnRyb2lkKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9jZW50cm9pZDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciB4ID0gTWF0aC5yb3VuZCgodGhpcy5wMS54ICsgdGhpcy5wMi54ICsgdGhpcy5wMy54KSAvIDMpO1xuICAgICAgICB2YXIgeSA9IE1hdGgucm91bmQoKHRoaXMucDEueSArIHRoaXMucDIueSArIHRoaXMucDMueSkgLyAzKTtcbiAgICAgICAgdGhpcy5fY2VudHJvaWQgPSBuZXcgUG9pbnQoeCwgeSk7XG5cbiAgICAgICAgcmV0dXJuIHRoaXMuX2NlbnRyb2lkO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvMTMzMDA5MDQvZGV0ZXJtaW5lLXdoZXRoZXItcG9pbnQtbGllcy1pbnNpZGUtdHJpYW5nbGVcbiAgICBwb2ludEluVHJpYW5nbGUocG9pbnQpIHtcbiAgICAgIHZhciBhbHBoYSA9ICgodGhpcy5wMi55IC0gdGhpcy5wMy55KSAqIChwb2ludC54IC0gdGhpcy5wMy54KSArICh0aGlzLnAzLnggLSB0aGlzLnAyLngpICogKHBvaW50LnkgLSB0aGlzLnAzLnkpKSAvXG4gICAgICAgICAgICAgICAgKCh0aGlzLnAyLnkgLSB0aGlzLnAzLnkpICogKHRoaXMucDEueCAtIHRoaXMucDMueCkgKyAodGhpcy5wMy54IC0gdGhpcy5wMi54KSAqICh0aGlzLnAxLnkgLSB0aGlzLnAzLnkpKTtcbiAgICAgIHZhciBiZXRhID0gKCh0aGlzLnAzLnkgLSB0aGlzLnAxLnkpICogKHBvaW50LnggLSB0aGlzLnAzLngpICsgKHRoaXMucDEueCAtIHRoaXMucDMueCkgKiAocG9pbnQueSAtIHRoaXMucDMueSkpIC9cbiAgICAgICAgICAgICAgICgodGhpcy5wMi55IC0gdGhpcy5wMy55KSAqICh0aGlzLnAxLnggLSB0aGlzLnAzLngpICsgKHRoaXMucDMueCAtIHRoaXMucDIueCkgKiAodGhpcy5wMS55IC0gdGhpcy5wMy55KSk7XG4gICAgICB2YXIgZ2FtbWEgPSAxLjAgLSBhbHBoYSAtIGJldGE7XG5cbiAgICAgIHJldHVybiAoYWxwaGEgPiAwICYmIGJldGEgPiAwICYmIGdhbW1hID4gMCk7XG4gICAgfVxuXG4gICAgLy8gc2NhbGUgcG9pbnRzIGZyb20gW0EsIEJdIHRvIFtDLCBEXVxuICAgIC8vIHhBID0+IG9sZCB4IG1pbiwgeEIgPT4gb2xkIHggbWF4XG4gICAgLy8geUEgPT4gb2xkIHkgbWluLCB5QiA9PiBvbGQgeSBtYXhcbiAgICAvLyB4QyA9PiBuZXcgeCBtaW4sIHhEID0+IG5ldyB4IG1heFxuICAgIC8vIHlDID0+IG5ldyB5IG1pbiwgeUQgPT4gbmV3IHkgbWF4XG4gICAgcmVzY2FsZVBvaW50cyh4QSwgeEIsIHlBLCB5QiwgeEMsIHhELCB5QywgeUQpIHtcbiAgICAgIHRoaXMucDEucmVzY2FsZSh4QSwgeEIsIHlBLCB5QiwgeEMsIHhELCB5QywgeUQpO1xuICAgICAgdGhpcy5wMi5yZXNjYWxlKHhBLCB4QiwgeUEsIHlCLCB4QywgeEQsIHlDLCB5RCk7XG4gICAgICB0aGlzLnAzLnJlc2NhbGUoeEEsIHhCLCB5QSwgeUIsIHhDLCB4RCwgeUMsIHlEKTtcbiAgICAgIC8vIHJlY2FsY3VsYXRlIHRoZSBjZW50cm9pZFxuICAgICAgdGhpcy5jZW50cm9pZCgpO1xuICAgIH1cblxuICAgIG1heFgoKSB7XG4gICAgICByZXR1cm4gTWF0aC5tYXgodGhpcy5wMS54LCB0aGlzLnAyLngsIHRoaXMucDMueCk7XG4gICAgfVxuXG4gICAgbWF4WSgpIHtcbiAgICAgIHJldHVybiBNYXRoLm1heCh0aGlzLnAxLnksIHRoaXMucDIueSwgdGhpcy5wMy55KTtcbiAgICB9XG5cbiAgICBtaW5YKCkge1xuICAgICAgcmV0dXJuIE1hdGgubWluKHRoaXMucDEueCwgdGhpcy5wMi54LCB0aGlzLnAzLngpO1xuICAgIH1cblxuICAgIG1pblkoKSB7XG4gICAgICByZXR1cm4gTWF0aC5taW4odGhpcy5wMS55LCB0aGlzLnAyLnksIHRoaXMucDMueSk7XG4gICAgfVxuXG4gICAgZ2V0UG9pbnRzKCkge1xuICAgICAgcmV0dXJuIFt0aGlzLnAxLCB0aGlzLnAyLCB0aGlzLnAzXTtcbiAgICB9XG4gIH1cblxuICBpZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IF9UcmlhbmdsZTtcbiAgfVxuXG4gIFRyaWFuZ2xlID0gX1RyaWFuZ2xlO1xufSkoKTtcbiIsIihmdW5jdGlvbigpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIHZhciBQcmV0dHlEZWxhdW5heSAgPSByZXF1aXJlKCcuL1ByZXR0eURlbGF1bmF5Jyk7XG4gIHZhciBDb2xvciAgPSByZXF1aXJlKCcuL1ByZXR0eURlbGF1bmF5L2NvbG9yJyk7XG4gIHZhciBSYW5kb20gPSByZXF1aXJlKCcuL1ByZXR0eURlbGF1bmF5L3JhbmRvbScpO1xuXG4gIHZhciBDb29raWVzID0ge1xuICAgIGdldEl0ZW06IGZ1bmN0aW9uKHNLZXkpIHtcbiAgICAgIGlmICghc0tleSkgeyByZXR1cm4gbnVsbDsgfVxuICAgICAgcmV0dXJuIGRlY29kZVVSSUNvbXBvbmVudChcbiAgICAgICAgZG9jdW1lbnQuY29va2llLnJlcGxhY2UoXG4gICAgICAgICAgbmV3IFJlZ0V4cChcbiAgICAgICAgICAgICAgJyg/Oig/Ol58Lio7KVxcXFxzKicgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgK1xuICAgICAgICAgICAgICBlbmNvZGVVUklDb21wb25lbnQoc0tleSkucmVwbGFjZSgvW1xcLVxcLlxcK1xcKl0vZywgJ1xcXFwkJicpICAgK1xuICAgICAgICAgICAgICAnXFxcXHMqXFxcXD1cXFxccyooW147XSopLiokKXxeLiokJyksICckMScpXG4gICAgICAgICAgICApIHx8IG51bGw7XG4gICAgfSxcblxuICAgIHNldEl0ZW06IGZ1bmN0aW9uKHNLZXksIHNWYWx1ZSwgdkVuZCwgc1BhdGgsIHNEb21haW4sIGJTZWN1cmUpIHtcbiAgICAgIGlmICghc0tleSB8fCAvXig/OmV4cGlyZXN8bWF4XFwtYWdlfHBhdGh8ZG9tYWlufHNlY3VyZSkkL2kudGVzdChzS2V5KSkgeyByZXR1cm4gZmFsc2U7IH1cbiAgICAgIHZhciBzRXhwaXJlcyA9ICcnO1xuICAgICAgaWYgKHZFbmQpIHtcbiAgICAgICAgc3dpdGNoICh2RW5kLmNvbnN0cnVjdG9yKSB7XG4gICAgICAgICAgY2FzZSBOdW1iZXI6XG4gICAgICAgICAgICBzRXhwaXJlcyA9IHZFbmQgPT09IEluZmluaXR5ID8gJzsgZXhwaXJlcz1GcmksIDMxIERlYyA5OTk5IDIzOjU5OjU5IEdNVCcgOiAnOyBtYXgtYWdlPScgKyB2RW5kO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgY2FzZSBTdHJpbmc6XG4gICAgICAgICAgICBzRXhwaXJlcyA9ICc7IGV4cGlyZXM9JyArIHZFbmQ7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBjYXNlIERhdGU6XG4gICAgICAgICAgICBzRXhwaXJlcyA9ICc7IGV4cGlyZXM9JyArIHZFbmQudG9VVENTdHJpbmcoKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBkb2N1bWVudC5jb29raWUgPSBlbmNvZGVVUklDb21wb25lbnQoc0tleSkgK1xuICAgICAgICAnPScgK1xuICAgICAgICBlbmNvZGVVUklDb21wb25lbnQoc1ZhbHVlKSArXG4gICAgICAgIHNFeHBpcmVzICtcbiAgICAgICAgKHNEb21haW4gPyAnOyBkb21haW49JyArXG4gICAgICAgIHNEb21haW4gOiAnJykgK1xuICAgICAgICAoc1BhdGggPyAnOyBwYXRoPScgK1xuICAgICAgICBzUGF0aCA6ICcnKSArXG4gICAgICAgIChiU2VjdXJlID8gJzsgc2VjdXJlJyA6ICcnKTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0sXG5cbiAgICByZW1vdmVJdGVtOiBmdW5jdGlvbihzS2V5LCBzUGF0aCwgc0RvbWFpbikge1xuICAgICAgaWYgKCF0aGlzLmhhc0l0ZW0oc0tleSkpIHsgcmV0dXJuIGZhbHNlOyB9XG4gICAgICBkb2N1bWVudC5jb29raWUgPSBlbmNvZGVVUklDb21wb25lbnQoc0tleSkgICAgK1xuICAgICAgICAnPTsgZXhwaXJlcz1UaHUsIDAxIEphbiAxOTcwIDAwOjAwOjAwIEdNVCcgICtcbiAgICAgICAgKHNEb21haW4gPyAnOyBkb21haW49JyArIHNEb21haW4gOiAnJykgICAgICArXG4gICAgICAgIChzUGF0aCAgID8gJzsgcGF0aD0nICAgKyBzUGF0aCAgIDogJycpO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSxcblxuICAgIGhhc0l0ZW06IGZ1bmN0aW9uKHNLZXkpIHtcbiAgICAgIGlmICghc0tleSkgeyByZXR1cm4gZmFsc2U7IH1cbiAgICAgIHJldHVybiAobmV3IFJlZ0V4cCgnKD86Xnw7XFxcXHMqKScgKyBlbmNvZGVVUklDb21wb25lbnQoc0tleSlcbiAgICAgICAgLnJlcGxhY2UoL1tcXC1cXC5cXCtcXCpdL2csICdcXFxcJCYnKSArICdcXFxccypcXFxcPScpKVxuICAgICAgICAudGVzdChkb2N1bWVudC5jb29raWUpO1xuICAgIH0sXG5cbiAgICBrZXlzOiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBhS2V5cyA9IGRvY3VtZW50LmNvb2tpZS5yZXBsYWNlKC8oKD86XnxcXHMqOylbXlxcPV0rKSg/PTt8JCl8Xlxccyp8XFxzKig/OlxcPVteO10qKT8oPzpcXDF8JCkvZywgJycpXG4gICAgICAgIC5zcGxpdCgvXFxzKig/OlxcPVteO10qKT87XFxzKi8pO1xuICAgICAgZm9yICh2YXIgbkxlbiA9IGFLZXlzLmxlbmd0aCwgbklkeCA9IDA7IG5JZHggPCBuTGVuOyBuSWR4KyspIHsgYUtleXNbbklkeF0gPSBkZWNvZGVVUklDb21wb25lbnQoYUtleXNbbklkeF0pOyB9XG4gICAgICByZXR1cm4gYUtleXM7XG4gICAgfSxcbiAgfTtcblxuICAvLyBzZXQgdXAgdmFyaWFibGVzIGZvciBjYW52YXMsIGlucHV0cywgZXRjXG4gIGNvbnN0IGNhbnZhcyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjYW52YXMnKTtcblxuICBjb25zdCBidXR0b24gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYnV0dG9uJyk7XG5cbiAgY29uc3QgZ2VuZXJhdGVDb2xvcnNCdXR0b24gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZ2VuZXJhdGVDb2xvcnMnKTtcbiAgY29uc3QgZ2VuZXJhdGVHcmFkaWVudEJ1dHRvbiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdnZW5lcmF0ZUdyYWRpZW50Jyk7XG4gIGNvbnN0IGdlbmVyYXRlVHJpYW5nbGVzQnV0dG9uID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2dlbmVyYXRlVHJpYW5nbGVzJyk7XG5cbiAgY29uc3QgdG9nZ2xlVHJpYW5nbGVzQnV0dG9uID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3RvZ2dsZVRyaWFuZ2xlcycpO1xuICBjb25zdCB0b2dnbGVQb2ludHNCdXR0b24gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgndG9nZ2xlUG9pbnRzJyk7XG4gIGNvbnN0IHRvZ2dsZUNpcmNsZXNCdXR0b24gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgndG9nZ2xlQ2lyY2xlcycpO1xuICBjb25zdCB0b2dnbGVDZW50cm9pZHNCdXR0b24gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgndG9nZ2xlQ2VudHJvaWRzJyk7XG4gIGNvbnN0IHRvZ2dsZUVkZ2VzQnV0dG9uID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3RvZ2dsZUVkZ2VzJyk7XG4gIGNvbnN0IHRvZ2dsZUFuaW1hdGlvbkJ1dHRvbiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCd0b2dnbGVBbmltYXRpb24nKTtcblxuICBjb25zdCBmb3JtID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2Zvcm0nKTtcbiAgY29uc3QgbXVsdGlwbGllclJhZGlvID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3BvaW50R2VuMScpO1xuICBjb25zdCBtdWx0aXBsaWVySW5wdXQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncG9pbnRzTXVsdGlwbGllcicpO1xuICBjb25zdCBtYXhJbnB1dCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdtYXhQb2ludHMnKTtcbiAgY29uc3QgbWluSW5wdXQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbWluUG9pbnRzJyk7XG4gIGNvbnN0IG1heEVkZ2VJbnB1dCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdtYXhFZGdlUG9pbnRzJyk7XG4gIGNvbnN0IG1pbkVkZ2VJbnB1dCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdtaW5FZGdlUG9pbnRzJyk7XG4gIGNvbnN0IG1heEdyYWRpZW50SW5wdXQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbWF4R3JhZGllbnRzJyk7XG4gIGNvbnN0IG1pbkdyYWRpZW50SW5wdXQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbWluR3JhZGllbnRzJyk7XG5cbiAgY29uc3QgaW1hZ2VCYWNrZ3JvdW5kVXBsb2FkID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2ltYWdlQmFja2dyb3VuZFVwbG9hZCcpO1xuICBjb25zdCBpbWFnZUJhY2tncm91bmRJbnB1dCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdpbWFnZUJhY2tncm91bmRJbnB1dCcpO1xuXG4gIGxldCBtaW5Qb2ludHMsIG1heFBvaW50cywgbWluRWRnZVBvaW50cywgbWF4RWRnZVBvaW50cywgbWluR3JhZGllbnRzLCBtYXhHcmFkaWVudHMsIG11bHRpcGxpZXIsIGNvbG9ycywgaW1hZ2U7XG5cbiAgbGV0IHNob3dUcmlhbmdsZXMsIHNob3dQb2ludHMsIHNob3dDaXJjbGVzLCBzaG93Q2VudHJvaWRzLCBzaG93RWRnZXMsIHNob3dBbmltYXRpb247XG5cbiAgY29uc3Qgb3B0aW9ucyA9IHtcbiAgICBvbkRhcmtCYWNrZ3JvdW5kOiBmdW5jdGlvbigpIHtcbiAgICAgIGZvcm0uY2xhc3NOYW1lID0gJ2Zvcm0gbGlnaHQnO1xuICAgIH0sXG4gICAgb25MaWdodEJhY2tncm91bmQ6IGZ1bmN0aW9uKCkge1xuICAgICAgZm9ybS5jbGFzc05hbWUgPSAnZm9ybSBkYXJrJztcbiAgICB9LFxuICB9O1xuXG4gIGdldENvb2tpZXMoKTtcblxuICAvLyBpbml0aWFsaXplIHRoZSBQcmV0dHlEZWxhdW5heSBvYmplY3RcbiAgbGV0IHByZXR0eURlbGF1bmF5ID0gbmV3IFByZXR0eURlbGF1bmF5KGNhbnZhcywgb3B0aW9ucyk7XG5cbiAgLy8gaW5pdGlhbCBnZW5lcmF0aW9uXG4gIHJ1bkRlbGF1bmF5KCk7XG5cbiAgLyoqXG4gICAqIHV0aWwgZnVuY3Rpb25zXG4gICAqL1xuXG4gIC8vIGdldCBvcHRpb25zIGFuZCByZS1yYW5kb21pemVcbiAgZnVuY3Rpb24gcnVuRGVsYXVuYXkoKSB7XG4gICAgZ2V0UmFuZG9taXplT3B0aW9ucygpO1xuICAgIHByZXR0eURlbGF1bmF5LnJhbmRvbWl6ZShtaW5Qb2ludHMsIG1heFBvaW50cywgbWluRWRnZVBvaW50cywgbWF4RWRnZVBvaW50cywgbWluR3JhZGllbnRzLCBtYXhHcmFkaWVudHMsIG11bHRpcGxpZXIsIGNvbG9ycywgaW1hZ2UpO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0Q29sb3JzKCkge1xuICAgIHZhciBjb2xvcnMgPSBbXTtcblxuICAgIGlmIChkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY29sb3JUeXBlMScpLmNoZWNrZWQpIHtcbiAgICAgIC8vIGdlbmVyYXRlIHJhbmRvbSBjb2xvcnNcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgMzsgaSsrKSB7XG4gICAgICAgIHZhciBjb2xvciA9IFJhbmRvbS5yYW5kb21Ic2xhKCk7XG4gICAgICAgIGNvbG9ycy5wdXNoKGNvbG9yKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgLy8gdXNlIHRoZSBvbmVzIGluIHRoZSBpbnB1dHNcbiAgICAgIGNvbG9ycy5wdXNoKENvbG9yLnJnYlRvSHNsYShDb2xvci5oZXhUb1JnYmFBcnJheShkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY29sb3IxJykudmFsdWUpKSk7XG4gICAgICBjb2xvcnMucHVzaChDb2xvci5yZ2JUb0hzbGEoQ29sb3IuaGV4VG9SZ2JhQXJyYXkoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NvbG9yMicpLnZhbHVlKSkpO1xuICAgICAgY29sb3JzLnB1c2goQ29sb3IucmdiVG9Ic2xhKENvbG9yLmhleFRvUmdiYUFycmF5KGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjb2xvcjMnKS52YWx1ZSkpKTtcbiAgICB9XG5cbiAgICByZXR1cm4gY29sb3JzO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0SW1hZ2UoKSB7XG4gICAgaWYgKCFkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY29sb3JUeXBlMycpLmNoZWNrZWQpIHtcbiAgICAgIHJldHVybiAnJztcbiAgICB9XG5cbiAgICBpZiAoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2ltYWdlQmFja2dyb3VuZDEnKS5jaGVja2VkICYmIGltYWdlQmFja2dyb3VuZFVwbG9hZC5maWxlcy5sZW5ndGgpIHtcbiAgICAgIGxldCBmaWxlID0gaW1hZ2VCYWNrZ3JvdW5kVXBsb2FkLmZpbGVzWzBdO1xuICAgICAgcmV0dXJuIHdpbmRvdy5VUkwuY3JlYXRlT2JqZWN0VVJMKGZpbGUpO1xuICAgIH0gZWxzZSBpZiAoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2ltYWdlQmFja2dyb3VuZDInKS5jaGVja2VkKSB7XG4gICAgICByZXR1cm4gaW1hZ2VCYWNrZ3JvdW5kSW5wdXQudmFsdWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiAnJztcbiAgICB9XG4gIH1cblxuICAvLyBnZXQgb3B0aW9ucyBmcm9tIGNvb2tpZXNcbiAgZnVuY3Rpb24gZ2V0Q29va2llcygpIHtcbiAgICB2YXIgZGVmYXVsdHMgPSBQcmV0dHlEZWxhdW5heS5kZWZhdWx0cygpO1xuXG4gICAgc2hvd1RyaWFuZ2xlcyA9IENvb2tpZXMuZ2V0SXRlbSgnRGVsYXVuYXlTaG93VHJpYW5nbGVzJyk7XG4gICAgc2hvd1BvaW50cyAgICA9IENvb2tpZXMuZ2V0SXRlbSgnRGVsYXVuYXlTaG93UG9pbnRzJyk7XG4gICAgc2hvd0NpcmNsZXMgICA9IENvb2tpZXMuZ2V0SXRlbSgnRGVsYXVuYXlTaG93Q2lyY2xlcycpO1xuICAgIHNob3dDZW50cm9pZHMgPSBDb29raWVzLmdldEl0ZW0oJ0RlbGF1bmF5U2hvd0NlbnRyb2lkcycpO1xuICAgIHNob3dFZGdlcyAgICAgPSBDb29raWVzLmdldEl0ZW0oJ0RlbGF1bmF5U2hvd0VkZ2VzJyk7XG4gICAgc2hvd0FuaW1hdGlvbiA9IENvb2tpZXMuZ2V0SXRlbSgnRGVsYXVuYXlTaG93QW5pbWF0aW9uJyk7XG5cbiAgICAvLyBUT0RPOiBEUllcbiAgICAvLyBvbmx5IHNldCBvcHRpb24gZnJvbSBjb29raWUgaWYgaXQgZXhpc3RzLCBwYXJzZSB0byBib29sZWFuXG4gICAgaWYgKHNob3dUcmlhbmdsZXMpIHtcbiAgICAgIG9wdGlvbnMuc2hvd1RyaWFuZ2xlcyA9IHNob3dUcmlhbmdsZXMgPSBzaG93VHJpYW5nbGVzID09PSAndHJ1ZScgPyB0cnVlIDogZmFsc2U7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIHNhdmUgb3B0aW9uIHN0YXRlIGZvciBzZXR0aW5nIGNvb2tpZSBsYXRlclxuICAgICAgc2hvd1RyaWFuZ2xlcyA9IGRlZmF1bHRzLnNob3dUcmlhbmdsZXM7XG4gICAgfVxuXG4gICAgaWYgKHNob3dQb2ludHMpIHtcbiAgICAgIG9wdGlvbnMuc2hvd1BvaW50cyA9IHNob3dQb2ludHMgPSBzaG93UG9pbnRzID09PSAndHJ1ZScgPyB0cnVlIDogZmFsc2U7XG4gICAgfSBlbHNlIHtcbiAgICAgIHNob3dQb2ludHMgPSBkZWZhdWx0cy5zaG93UG9pbnRzO1xuICAgIH1cblxuICAgIGlmIChzaG93Q2lyY2xlcykge1xuICAgICAgb3B0aW9ucy5zaG93Q2lyY2xlcyA9IHNob3dDaXJjbGVzID0gc2hvd0NpcmNsZXMgPT09ICd0cnVlJyA/IHRydWUgOiBmYWxzZTtcbiAgICB9IGVsc2Uge1xuICAgICAgc2hvd0NpcmNsZXMgPSBkZWZhdWx0cy5zaG93Q2lyY2xlcztcbiAgICB9XG5cbiAgICBpZiAoc2hvd0NlbnRyb2lkcykge1xuICAgICAgb3B0aW9ucy5zaG93Q2VudHJvaWRzID0gc2hvd0NlbnRyb2lkcyA9IHNob3dDZW50cm9pZHMgPT09ICd0cnVlJyA/IHRydWUgOiBmYWxzZTtcbiAgICB9IGVsc2Uge1xuICAgICAgc2hvd0NlbnRyb2lkcyA9IGRlZmF1bHRzLnNob3dDZW50cm9pZHM7XG4gICAgfVxuXG4gICAgaWYgKHNob3dFZGdlcykge1xuICAgICAgb3B0aW9ucy5zaG93RWRnZXMgPSBzaG93RWRnZXMgPSBzaG93RWRnZXMgPT09ICd0cnVlJyA/IHRydWUgOiBmYWxzZTtcbiAgICB9IGVsc2Uge1xuICAgICAgc2hvd0VkZ2VzID0gZGVmYXVsdHMuc2hvd0VkZ2VzO1xuICAgIH1cblxuICAgIGlmIChzaG93QW5pbWF0aW9uKSB7XG4gICAgICBvcHRpb25zLnNob3dBbmltYXRpb24gPSBzaG93QW5pbWF0aW9uID0gc2hvd0FuaW1hdGlvbiA9PT0gJ3RydWUnID8gdHJ1ZSA6IGZhbHNlO1xuICAgIH0gZWxzZSB7XG4gICAgICBzaG93QW5pbWF0aW9uID0gZGVmYXVsdHMuc2hvd0FuaW1hdGlvbjtcbiAgICB9XG4gIH1cblxuICAvLyBnZXQgb3B0aW9ucyBmcm9tIGlucHV0IGZpZWxkc1xuICBmdW5jdGlvbiBnZXRSYW5kb21pemVPcHRpb25zKCkge1xuICAgIHZhciB1c2VNdWx0aXBsaWVyID0gbXVsdGlwbGllclJhZGlvLmNoZWNrZWQ7XG4gICAgbXVsdGlwbGllciA9IHBhcnNlRmxvYXQobXVsdGlwbGllcklucHV0LnZhbHVlKTtcbiAgICBtaW5Qb2ludHMgPSB1c2VNdWx0aXBsaWVyID8gMCA6IHBhcnNlSW50KG1pbklucHV0LnZhbHVlKTtcbiAgICBtYXhQb2ludHMgPSB1c2VNdWx0aXBsaWVyID8gMCA6IHBhcnNlSW50KG1heElucHV0LnZhbHVlKTtcbiAgICBtaW5FZGdlUG9pbnRzID0gdXNlTXVsdGlwbGllciA/IDAgOiBwYXJzZUludChtaW5FZGdlSW5wdXQudmFsdWUpO1xuICAgIG1heEVkZ2VQb2ludHMgPSB1c2VNdWx0aXBsaWVyID8gMCA6IHBhcnNlSW50KG1heEVkZ2VJbnB1dC52YWx1ZSk7XG4gICAgbWluR3JhZGllbnRzID0gcGFyc2VJbnQobWluR3JhZGllbnRJbnB1dC52YWx1ZSk7XG4gICAgbWF4R3JhZGllbnRzID0gcGFyc2VJbnQobWF4R3JhZGllbnRJbnB1dC52YWx1ZSk7XG4gICAgY29sb3JzID0gZ2V0Q29sb3JzKCk7XG4gICAgaW1hZ2UgPSBnZXRJbWFnZSgpO1xuICB9XG5cbiAgLyoqXG4gICAqIHNldCB1cCBldmVudHNcbiAgICovXG5cbiAgLy8gY2xpY2sgdGhlIGJ1dHRvbiB0byByZWdlblxuICBidXR0b24uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbigpIHtcbiAgICBydW5EZWxhdW5heSgpO1xuICB9KTtcblxuICAvLyBjbGljayB0aGUgYnV0dG9uIHRvIHJlZ2VuIGNvbG9ycyBvbmx5XG4gIGdlbmVyYXRlQ29sb3JzQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG4gICAgdmFyIG5ld0NvbG9ycyA9IGdldENvbG9ycygpO1xuICAgIHByZXR0eURlbGF1bmF5LnJlbmRlck5ld0NvbG9ycyhuZXdDb2xvcnMpO1xuICB9KTtcblxuICAvLyBjbGljayB0aGUgYnV0dG9uIHRvIHJlZ2VuIGNvbG9ycyBvbmx5XG4gIGdlbmVyYXRlR3JhZGllbnRCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbigpIHtcbiAgICBnZXRSYW5kb21pemVPcHRpb25zKCk7XG4gICAgcHJldHR5RGVsYXVuYXkucmVuZGVyTmV3R3JhZGllbnQobWluR3JhZGllbnRzLCBtYXhHcmFkaWVudHMpO1xuICB9KTtcblxuICAvLyBjbGljayB0aGUgYnV0dG9uIHRvIHJlZ2VuIGNvbG9ycyBvbmx5XG4gIGdlbmVyYXRlVHJpYW5nbGVzQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG4gICAgZ2V0UmFuZG9taXplT3B0aW9ucygpO1xuICAgIHByZXR0eURlbGF1bmF5LnJlbmRlck5ld1RyaWFuZ2xlcyhtaW5Qb2ludHMsIG1heFBvaW50cywgbWluRWRnZVBvaW50cywgbWF4RWRnZVBvaW50cywgbXVsdGlwbGllcik7XG4gIH0pO1xuXG4gIC8vIHR1cm4gVHJpYW5nbGVzIG9mZi9vblxuICB0b2dnbGVUcmlhbmdsZXNCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbigpIHtcbiAgICBzaG93VHJpYW5nbGVzID0gIXNob3dUcmlhbmdsZXM7XG4gICAgQ29va2llcy5zZXRJdGVtKCdEZWxhdW5heVNob3dUcmlhbmdsZXMnLCBzaG93VHJpYW5nbGVzKTtcbiAgICBwcmV0dHlEZWxhdW5heS50b2dnbGVUcmlhbmdsZXMoKTtcbiAgfSk7XG5cbiAgLy8gdHVybiBQb2ludHMgb2ZmL29uXG4gIHRvZ2dsZVBvaW50c0J1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuICAgIHNob3dQb2ludHMgPSAhc2hvd1BvaW50cztcbiAgICBDb29raWVzLnNldEl0ZW0oJ0RlbGF1bmF5U2hvd1BvaW50cycsIHNob3dQb2ludHMpO1xuICAgIHByZXR0eURlbGF1bmF5LnRvZ2dsZVBvaW50cygpO1xuICB9KTtcblxuICAvLyB0dXJuIENpcmNsZXMgb2ZmL29uXG4gIHRvZ2dsZUNpcmNsZXNCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbigpIHtcbiAgICBzaG93Q2lyY2xlcyA9ICFzaG93Q2lyY2xlcztcbiAgICBDb29raWVzLnNldEl0ZW0oJ0RlbGF1bmF5U2hvd0NpcmNsZXMnLCBzaG93Q2lyY2xlcyk7XG4gICAgcHJldHR5RGVsYXVuYXkudG9nZ2xlQ2lyY2xlcygpO1xuICB9KTtcblxuICAvLyB0dXJuIENlbnRyb2lkcyBvZmYvb25cbiAgdG9nZ2xlQ2VudHJvaWRzQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG4gICAgc2hvd0NlbnRyb2lkcyA9ICFzaG93Q2VudHJvaWRzO1xuICAgIENvb2tpZXMuc2V0SXRlbSgnRGVsYXVuYXlTaG93Q2VudHJvaWRzJywgc2hvd0NlbnRyb2lkcyk7XG4gICAgcHJldHR5RGVsYXVuYXkudG9nZ2xlQ2VudHJvaWRzKCk7XG4gIH0pO1xuXG4gIC8vIHR1cm4gRWRnZXMgb2ZmL29uXG4gIHRvZ2dsZUVkZ2VzQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG4gICAgc2hvd0VkZ2VzID0gIXNob3dFZGdlcztcbiAgICBDb29raWVzLnNldEl0ZW0oJ0RlbGF1bmF5U2hvd0VkZ2VzJywgc2hvd0VkZ2VzKTtcbiAgICBwcmV0dHlEZWxhdW5heS50b2dnbGVFZGdlcygpO1xuICB9KTtcblxuICAvLyB0dXJuIEFuaW1hdGlvbiBvZmYvb25cbiAgdG9nZ2xlQW5pbWF0aW9uQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG4gICAgc2hvd0FuaW1hdGlvbiA9ICFzaG93QW5pbWF0aW9uO1xuICAgIENvb2tpZXMuc2V0SXRlbSgnRGVsYXVuYXlTaG93QW5pbWF0aW9uJywgc2hvd0FuaW1hdGlvbik7XG4gICAgcHJldHR5RGVsYXVuYXkudG9nZ2xlQW5pbWF0aW9uKCk7XG4gIH0pO1xuXG4gIC8vIGRvbnQgZG8gYW55dGhpbmcgb24gZm9ybSBzdWJtaXRcbiAgZm9ybS5hZGRFdmVudExpc3RlbmVyKCdzdWJtaXQnLCBmdW5jdGlvbihlKSB7XG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIHJldHVybiBmYWxzZTtcbiAgfSk7XG59KSgpO1xuIl19
