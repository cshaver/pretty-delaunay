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
var Cookies = require('./demo/cookies');

// grab DOM elements
var main = document.getElementById('main');
var form = document.getElementById('form');
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
var toggleHoverButton = document.getElementById('toggleHover');
var toggleAnimationButton = document.getElementById('toggleAnimation');

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
    main.className = 'theme-light';
  },
  onLightBackground: function onLightBackground() {
    main.className = 'theme-dark';
  }
};

getCookies();

// initialize the PrettyDelaunay object
// let prettyDelaunay = new PrettyDelaunay(canvas, options);

// initial generation
// runDelaunay();

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

},{"./PrettyDelaunay":"/Users/cshaver/Personal/pretty-delaunay/src/PrettyDelaunay.js","./PrettyDelaunay/color":"/Users/cshaver/Personal/pretty-delaunay/src/PrettyDelaunay/color.js","./PrettyDelaunay/random":"/Users/cshaver/Personal/pretty-delaunay/src/PrettyDelaunay/random.js","./demo/cookies":"/Users/cshaver/Personal/pretty-delaunay/src/demo/cookies.js"}],"/Users/cshaver/Personal/pretty-delaunay/src/demo/cookies.js":[function(require,module,exports){
'use strict';

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

module.exports = Cookies;

},{}]},{},["/Users/cshaver/Personal/pretty-delaunay/src/demo.js"])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvZGVsYXVuYXktZmFzdC9kZWxhdW5heS5qcyIsInNyYy9QcmV0dHlEZWxhdW5heS5qcyIsInNyYy9QcmV0dHlEZWxhdW5heS9jb2xvci5qcyIsInNyYy9QcmV0dHlEZWxhdW5heS9wb2ludC5qcyIsInNyYy9QcmV0dHlEZWxhdW5heS9wb2ludE1hcC5qcyIsInNyYy9QcmV0dHlEZWxhdW5heS9wb2x5ZmlsbHMuanMiLCJzcmMvUHJldHR5RGVsYXVuYXkvcmFuZG9tLmpzIiwic3JjL1ByZXR0eURlbGF1bmF5L3RyaWFuZ2xlLmpzIiwic3JjL2RlbW8uanMiLCJzcmMvZGVtby9jb29raWVzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7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QUFtRixFQUFuRixFQUNULEtBRFMsQ0FDSCxxQkFERyxDQUFaO0FBRUEsU0FBSyxJQUFJLE9BQU8sTUFBTSxNQUFqQixFQUF5QixPQUFPLENBQXJDLEVBQXdDLE9BQU8sSUFBL0MsRUFBcUQsTUFBckQsRUFBNkQ7QUFBRSxZQUFNLElBQU4sSUFBYyxtQkFBbUIsTUFBTSxJQUFOLENBQW5CLENBQWQ7QUFBZ0Q7QUFDL0csV0FBTyxLQUFQO0FBQ0Q7QUE3RGEsQ0FBaEI7O0FBZ0VBLE9BQU8sT0FBUCxHQUFpQixPQUFqQiIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgRGVsYXVuYXk7XG5cbihmdW5jdGlvbigpIHtcbiAgXCJ1c2Ugc3RyaWN0XCI7XG5cbiAgdmFyIEVQU0lMT04gPSAxLjAgLyAxMDQ4NTc2LjA7XG5cbiAgZnVuY3Rpb24gc3VwZXJ0cmlhbmdsZSh2ZXJ0aWNlcykge1xuICAgIHZhciB4bWluID0gTnVtYmVyLlBPU0lUSVZFX0lORklOSVRZLFxuICAgICAgICB5bWluID0gTnVtYmVyLlBPU0lUSVZFX0lORklOSVRZLFxuICAgICAgICB4bWF4ID0gTnVtYmVyLk5FR0FUSVZFX0lORklOSVRZLFxuICAgICAgICB5bWF4ID0gTnVtYmVyLk5FR0FUSVZFX0lORklOSVRZLFxuICAgICAgICBpLCBkeCwgZHksIGRtYXgsIHhtaWQsIHltaWQ7XG5cbiAgICBmb3IoaSA9IHZlcnRpY2VzLmxlbmd0aDsgaS0tOyApIHtcbiAgICAgIGlmKHZlcnRpY2VzW2ldWzBdIDwgeG1pbikgeG1pbiA9IHZlcnRpY2VzW2ldWzBdO1xuICAgICAgaWYodmVydGljZXNbaV1bMF0gPiB4bWF4KSB4bWF4ID0gdmVydGljZXNbaV1bMF07XG4gICAgICBpZih2ZXJ0aWNlc1tpXVsxXSA8IHltaW4pIHltaW4gPSB2ZXJ0aWNlc1tpXVsxXTtcbiAgICAgIGlmKHZlcnRpY2VzW2ldWzFdID4geW1heCkgeW1heCA9IHZlcnRpY2VzW2ldWzFdO1xuICAgIH1cblxuICAgIGR4ID0geG1heCAtIHhtaW47XG4gICAgZHkgPSB5bWF4IC0geW1pbjtcbiAgICBkbWF4ID0gTWF0aC5tYXgoZHgsIGR5KTtcbiAgICB4bWlkID0geG1pbiArIGR4ICogMC41O1xuICAgIHltaWQgPSB5bWluICsgZHkgKiAwLjU7XG5cbiAgICByZXR1cm4gW1xuICAgICAgW3htaWQgLSAyMCAqIGRtYXgsIHltaWQgLSAgICAgIGRtYXhdLFxuICAgICAgW3htaWQgICAgICAgICAgICAsIHltaWQgKyAyMCAqIGRtYXhdLFxuICAgICAgW3htaWQgKyAyMCAqIGRtYXgsIHltaWQgLSAgICAgIGRtYXhdXG4gICAgXTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNpcmN1bWNpcmNsZSh2ZXJ0aWNlcywgaSwgaiwgaykge1xuICAgIHZhciB4MSA9IHZlcnRpY2VzW2ldWzBdLFxuICAgICAgICB5MSA9IHZlcnRpY2VzW2ldWzFdLFxuICAgICAgICB4MiA9IHZlcnRpY2VzW2pdWzBdLFxuICAgICAgICB5MiA9IHZlcnRpY2VzW2pdWzFdLFxuICAgICAgICB4MyA9IHZlcnRpY2VzW2tdWzBdLFxuICAgICAgICB5MyA9IHZlcnRpY2VzW2tdWzFdLFxuICAgICAgICBmYWJzeTF5MiA9IE1hdGguYWJzKHkxIC0geTIpLFxuICAgICAgICBmYWJzeTJ5MyA9IE1hdGguYWJzKHkyIC0geTMpLFxuICAgICAgICB4YywgeWMsIG0xLCBtMiwgbXgxLCBteDIsIG15MSwgbXkyLCBkeCwgZHk7XG5cbiAgICAvKiBDaGVjayBmb3IgY29pbmNpZGVudCBwb2ludHMgKi9cbiAgICBpZihmYWJzeTF5MiA8IEVQU0lMT04gJiYgZmFic3kyeTMgPCBFUFNJTE9OKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRWVrISBDb2luY2lkZW50IHBvaW50cyFcIik7XG5cbiAgICBpZihmYWJzeTF5MiA8IEVQU0lMT04pIHtcbiAgICAgIG0yICA9IC0oKHgzIC0geDIpIC8gKHkzIC0geTIpKTtcbiAgICAgIG14MiA9ICh4MiArIHgzKSAvIDIuMDtcbiAgICAgIG15MiA9ICh5MiArIHkzKSAvIDIuMDtcbiAgICAgIHhjICA9ICh4MiArIHgxKSAvIDIuMDtcbiAgICAgIHljICA9IG0yICogKHhjIC0gbXgyKSArIG15MjtcbiAgICB9XG5cbiAgICBlbHNlIGlmKGZhYnN5MnkzIDwgRVBTSUxPTikge1xuICAgICAgbTEgID0gLSgoeDIgLSB4MSkgLyAoeTIgLSB5MSkpO1xuICAgICAgbXgxID0gKHgxICsgeDIpIC8gMi4wO1xuICAgICAgbXkxID0gKHkxICsgeTIpIC8gMi4wO1xuICAgICAgeGMgID0gKHgzICsgeDIpIC8gMi4wO1xuICAgICAgeWMgID0gbTEgKiAoeGMgLSBteDEpICsgbXkxO1xuICAgIH1cblxuICAgIGVsc2Uge1xuICAgICAgbTEgID0gLSgoeDIgLSB4MSkgLyAoeTIgLSB5MSkpO1xuICAgICAgbTIgID0gLSgoeDMgLSB4MikgLyAoeTMgLSB5MikpO1xuICAgICAgbXgxID0gKHgxICsgeDIpIC8gMi4wO1xuICAgICAgbXgyID0gKHgyICsgeDMpIC8gMi4wO1xuICAgICAgbXkxID0gKHkxICsgeTIpIC8gMi4wO1xuICAgICAgbXkyID0gKHkyICsgeTMpIC8gMi4wO1xuICAgICAgeGMgID0gKG0xICogbXgxIC0gbTIgKiBteDIgKyBteTIgLSBteTEpIC8gKG0xIC0gbTIpO1xuICAgICAgeWMgID0gKGZhYnN5MXkyID4gZmFic3kyeTMpID9cbiAgICAgICAgbTEgKiAoeGMgLSBteDEpICsgbXkxIDpcbiAgICAgICAgbTIgKiAoeGMgLSBteDIpICsgbXkyO1xuICAgIH1cblxuICAgIGR4ID0geDIgLSB4YztcbiAgICBkeSA9IHkyIC0geWM7XG4gICAgcmV0dXJuIHtpOiBpLCBqOiBqLCBrOiBrLCB4OiB4YywgeTogeWMsIHI6IGR4ICogZHggKyBkeSAqIGR5fTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGRlZHVwKGVkZ2VzKSB7XG4gICAgdmFyIGksIGosIGEsIGIsIG0sIG47XG5cbiAgICBmb3IoaiA9IGVkZ2VzLmxlbmd0aDsgajsgKSB7XG4gICAgICBiID0gZWRnZXNbLS1qXTtcbiAgICAgIGEgPSBlZGdlc1stLWpdO1xuXG4gICAgICBmb3IoaSA9IGo7IGk7ICkge1xuICAgICAgICBuID0gZWRnZXNbLS1pXTtcbiAgICAgICAgbSA9IGVkZ2VzWy0taV07XG5cbiAgICAgICAgaWYoKGEgPT09IG0gJiYgYiA9PT0gbikgfHwgKGEgPT09IG4gJiYgYiA9PT0gbSkpIHtcbiAgICAgICAgICBlZGdlcy5zcGxpY2UoaiwgMik7XG4gICAgICAgICAgZWRnZXMuc3BsaWNlKGksIDIpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgRGVsYXVuYXkgPSB7XG4gICAgdHJpYW5ndWxhdGU6IGZ1bmN0aW9uKHZlcnRpY2VzLCBrZXkpIHtcbiAgICAgIHZhciBuID0gdmVydGljZXMubGVuZ3RoLFxuICAgICAgICAgIGksIGosIGluZGljZXMsIHN0LCBvcGVuLCBjbG9zZWQsIGVkZ2VzLCBkeCwgZHksIGEsIGIsIGM7XG5cbiAgICAgIC8qIEJhaWwgaWYgdGhlcmUgYXJlbid0IGVub3VnaCB2ZXJ0aWNlcyB0byBmb3JtIGFueSB0cmlhbmdsZXMuICovXG4gICAgICBpZihuIDwgMylcbiAgICAgICAgcmV0dXJuIFtdO1xuXG4gICAgICAvKiBTbGljZSBvdXQgdGhlIGFjdHVhbCB2ZXJ0aWNlcyBmcm9tIHRoZSBwYXNzZWQgb2JqZWN0cy4gKER1cGxpY2F0ZSB0aGVcbiAgICAgICAqIGFycmF5IGV2ZW4gaWYgd2UgZG9uJ3QsIHRob3VnaCwgc2luY2Ugd2UgbmVlZCB0byBtYWtlIGEgc3VwZXJ0cmlhbmdsZVxuICAgICAgICogbGF0ZXIgb24hKSAqL1xuICAgICAgdmVydGljZXMgPSB2ZXJ0aWNlcy5zbGljZSgwKTtcblxuICAgICAgaWYoa2V5KVxuICAgICAgICBmb3IoaSA9IG47IGktLTsgKVxuICAgICAgICAgIHZlcnRpY2VzW2ldID0gdmVydGljZXNbaV1ba2V5XTtcblxuICAgICAgLyogTWFrZSBhbiBhcnJheSBvZiBpbmRpY2VzIGludG8gdGhlIHZlcnRleCBhcnJheSwgc29ydGVkIGJ5IHRoZVxuICAgICAgICogdmVydGljZXMnIHgtcG9zaXRpb24uICovXG4gICAgICBpbmRpY2VzID0gbmV3IEFycmF5KG4pO1xuXG4gICAgICBmb3IoaSA9IG47IGktLTsgKVxuICAgICAgICBpbmRpY2VzW2ldID0gaTtcblxuICAgICAgaW5kaWNlcy5zb3J0KGZ1bmN0aW9uKGksIGopIHtcbiAgICAgICAgcmV0dXJuIHZlcnRpY2VzW2pdWzBdIC0gdmVydGljZXNbaV1bMF07XG4gICAgICB9KTtcblxuICAgICAgLyogTmV4dCwgZmluZCB0aGUgdmVydGljZXMgb2YgdGhlIHN1cGVydHJpYW5nbGUgKHdoaWNoIGNvbnRhaW5zIGFsbCBvdGhlclxuICAgICAgICogdHJpYW5nbGVzKSwgYW5kIGFwcGVuZCB0aGVtIG9udG8gdGhlIGVuZCBvZiBhIChjb3B5IG9mKSB0aGUgdmVydGV4XG4gICAgICAgKiBhcnJheS4gKi9cbiAgICAgIHN0ID0gc3VwZXJ0cmlhbmdsZSh2ZXJ0aWNlcyk7XG4gICAgICB2ZXJ0aWNlcy5wdXNoKHN0WzBdLCBzdFsxXSwgc3RbMl0pO1xuICAgICAgXG4gICAgICAvKiBJbml0aWFsaXplIHRoZSBvcGVuIGxpc3QgKGNvbnRhaW5pbmcgdGhlIHN1cGVydHJpYW5nbGUgYW5kIG5vdGhpbmdcbiAgICAgICAqIGVsc2UpIGFuZCB0aGUgY2xvc2VkIGxpc3QgKHdoaWNoIGlzIGVtcHR5IHNpbmNlIHdlIGhhdm4ndCBwcm9jZXNzZWRcbiAgICAgICAqIGFueSB0cmlhbmdsZXMgeWV0KS4gKi9cbiAgICAgIG9wZW4gICA9IFtjaXJjdW1jaXJjbGUodmVydGljZXMsIG4gKyAwLCBuICsgMSwgbiArIDIpXTtcbiAgICAgIGNsb3NlZCA9IFtdO1xuICAgICAgZWRnZXMgID0gW107XG5cbiAgICAgIC8qIEluY3JlbWVudGFsbHkgYWRkIGVhY2ggdmVydGV4IHRvIHRoZSBtZXNoLiAqL1xuICAgICAgZm9yKGkgPSBpbmRpY2VzLmxlbmd0aDsgaS0tOyBlZGdlcy5sZW5ndGggPSAwKSB7XG4gICAgICAgIGMgPSBpbmRpY2VzW2ldO1xuXG4gICAgICAgIC8qIEZvciBlYWNoIG9wZW4gdHJpYW5nbGUsIGNoZWNrIHRvIHNlZSBpZiB0aGUgY3VycmVudCBwb2ludCBpc1xuICAgICAgICAgKiBpbnNpZGUgaXQncyBjaXJjdW1jaXJjbGUuIElmIGl0IGlzLCByZW1vdmUgdGhlIHRyaWFuZ2xlIGFuZCBhZGRcbiAgICAgICAgICogaXQncyBlZGdlcyB0byBhbiBlZGdlIGxpc3QuICovXG4gICAgICAgIGZvcihqID0gb3Blbi5sZW5ndGg7IGotLTsgKSB7XG4gICAgICAgICAgLyogSWYgdGhpcyBwb2ludCBpcyB0byB0aGUgcmlnaHQgb2YgdGhpcyB0cmlhbmdsZSdzIGNpcmN1bWNpcmNsZSxcbiAgICAgICAgICAgKiB0aGVuIHRoaXMgdHJpYW5nbGUgc2hvdWxkIG5ldmVyIGdldCBjaGVja2VkIGFnYWluLiBSZW1vdmUgaXRcbiAgICAgICAgICAgKiBmcm9tIHRoZSBvcGVuIGxpc3QsIGFkZCBpdCB0byB0aGUgY2xvc2VkIGxpc3QsIGFuZCBza2lwLiAqL1xuICAgICAgICAgIGR4ID0gdmVydGljZXNbY11bMF0gLSBvcGVuW2pdLng7XG4gICAgICAgICAgaWYoZHggPiAwLjAgJiYgZHggKiBkeCA+IG9wZW5bal0ucikge1xuICAgICAgICAgICAgY2xvc2VkLnB1c2gob3BlbltqXSk7XG4gICAgICAgICAgICBvcGVuLnNwbGljZShqLCAxKTtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIC8qIElmIHdlJ3JlIG91dHNpZGUgdGhlIGNpcmN1bWNpcmNsZSwgc2tpcCB0aGlzIHRyaWFuZ2xlLiAqL1xuICAgICAgICAgIGR5ID0gdmVydGljZXNbY11bMV0gLSBvcGVuW2pdLnk7XG4gICAgICAgICAgaWYoZHggKiBkeCArIGR5ICogZHkgLSBvcGVuW2pdLnIgPiBFUFNJTE9OKVxuICAgICAgICAgICAgY29udGludWU7XG5cbiAgICAgICAgICAvKiBSZW1vdmUgdGhlIHRyaWFuZ2xlIGFuZCBhZGQgaXQncyBlZGdlcyB0byB0aGUgZWRnZSBsaXN0LiAqL1xuICAgICAgICAgIGVkZ2VzLnB1c2goXG4gICAgICAgICAgICBvcGVuW2pdLmksIG9wZW5bal0uaixcbiAgICAgICAgICAgIG9wZW5bal0uaiwgb3BlbltqXS5rLFxuICAgICAgICAgICAgb3BlbltqXS5rLCBvcGVuW2pdLmlcbiAgICAgICAgICApO1xuICAgICAgICAgIG9wZW4uc3BsaWNlKGosIDEpO1xuICAgICAgICB9XG5cbiAgICAgICAgLyogUmVtb3ZlIGFueSBkb3VibGVkIGVkZ2VzLiAqL1xuICAgICAgICBkZWR1cChlZGdlcyk7XG5cbiAgICAgICAgLyogQWRkIGEgbmV3IHRyaWFuZ2xlIGZvciBlYWNoIGVkZ2UuICovXG4gICAgICAgIGZvcihqID0gZWRnZXMubGVuZ3RoOyBqOyApIHtcbiAgICAgICAgICBiID0gZWRnZXNbLS1qXTtcbiAgICAgICAgICBhID0gZWRnZXNbLS1qXTtcbiAgICAgICAgICBvcGVuLnB1c2goY2lyY3VtY2lyY2xlKHZlcnRpY2VzLCBhLCBiLCBjKSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLyogQ29weSBhbnkgcmVtYWluaW5nIG9wZW4gdHJpYW5nbGVzIHRvIHRoZSBjbG9zZWQgbGlzdCwgYW5kIHRoZW5cbiAgICAgICAqIHJlbW92ZSBhbnkgdHJpYW5nbGVzIHRoYXQgc2hhcmUgYSB2ZXJ0ZXggd2l0aCB0aGUgc3VwZXJ0cmlhbmdsZSxcbiAgICAgICAqIGJ1aWxkaW5nIGEgbGlzdCBvZiB0cmlwbGV0cyB0aGF0IHJlcHJlc2VudCB0cmlhbmdsZXMuICovXG4gICAgICBmb3IoaSA9IG9wZW4ubGVuZ3RoOyBpLS07IClcbiAgICAgICAgY2xvc2VkLnB1c2gob3BlbltpXSk7XG4gICAgICBvcGVuLmxlbmd0aCA9IDA7XG5cbiAgICAgIGZvcihpID0gY2xvc2VkLmxlbmd0aDsgaS0tOyApXG4gICAgICAgIGlmKGNsb3NlZFtpXS5pIDwgbiAmJiBjbG9zZWRbaV0uaiA8IG4gJiYgY2xvc2VkW2ldLmsgPCBuKVxuICAgICAgICAgIG9wZW4ucHVzaChjbG9zZWRbaV0uaSwgY2xvc2VkW2ldLmosIGNsb3NlZFtpXS5rKTtcblxuICAgICAgLyogWWF5LCB3ZSdyZSBkb25lISAqL1xuICAgICAgcmV0dXJuIG9wZW47XG4gICAgfSxcbiAgICBjb250YWluczogZnVuY3Rpb24odHJpLCBwKSB7XG4gICAgICAvKiBCb3VuZGluZyBib3ggdGVzdCBmaXJzdCwgZm9yIHF1aWNrIHJlamVjdGlvbnMuICovXG4gICAgICBpZigocFswXSA8IHRyaVswXVswXSAmJiBwWzBdIDwgdHJpWzFdWzBdICYmIHBbMF0gPCB0cmlbMl1bMF0pIHx8XG4gICAgICAgICAocFswXSA+IHRyaVswXVswXSAmJiBwWzBdID4gdHJpWzFdWzBdICYmIHBbMF0gPiB0cmlbMl1bMF0pIHx8XG4gICAgICAgICAocFsxXSA8IHRyaVswXVsxXSAmJiBwWzFdIDwgdHJpWzFdWzFdICYmIHBbMV0gPCB0cmlbMl1bMV0pIHx8XG4gICAgICAgICAocFsxXSA+IHRyaVswXVsxXSAmJiBwWzFdID4gdHJpWzFdWzFdICYmIHBbMV0gPiB0cmlbMl1bMV0pKVxuICAgICAgICByZXR1cm4gbnVsbDtcblxuICAgICAgdmFyIGEgPSB0cmlbMV1bMF0gLSB0cmlbMF1bMF0sXG4gICAgICAgICAgYiA9IHRyaVsyXVswXSAtIHRyaVswXVswXSxcbiAgICAgICAgICBjID0gdHJpWzFdWzFdIC0gdHJpWzBdWzFdLFxuICAgICAgICAgIGQgPSB0cmlbMl1bMV0gLSB0cmlbMF1bMV0sXG4gICAgICAgICAgaSA9IGEgKiBkIC0gYiAqIGM7XG5cbiAgICAgIC8qIERlZ2VuZXJhdGUgdHJpLiAqL1xuICAgICAgaWYoaSA9PT0gMC4wKVxuICAgICAgICByZXR1cm4gbnVsbDtcblxuICAgICAgdmFyIHUgPSAoZCAqIChwWzBdIC0gdHJpWzBdWzBdKSAtIGIgKiAocFsxXSAtIHRyaVswXVsxXSkpIC8gaSxcbiAgICAgICAgICB2ID0gKGEgKiAocFsxXSAtIHRyaVswXVsxXSkgLSBjICogKHBbMF0gLSB0cmlbMF1bMF0pKSAvIGk7XG5cbiAgICAgIC8qIElmIHdlJ3JlIG91dHNpZGUgdGhlIHRyaSwgZmFpbC4gKi9cbiAgICAgIGlmKHUgPCAwLjAgfHwgdiA8IDAuMCB8fCAodSArIHYpID4gMS4wKVxuICAgICAgICByZXR1cm4gbnVsbDtcblxuICAgICAgcmV0dXJuIFt1LCB2XTtcbiAgICB9XG4gIH07XG5cbiAgaWYodHlwZW9mIG1vZHVsZSAhPT0gXCJ1bmRlZmluZWRcIilcbiAgICBtb2R1bGUuZXhwb3J0cyA9IERlbGF1bmF5O1xufSkoKTtcbiIsImNvbnN0IERlbGF1bmF5ID0gcmVxdWlyZSgnZGVsYXVuYXktZmFzdCcpO1xuY29uc3QgQ29sb3IgPSByZXF1aXJlKCcuL1ByZXR0eURlbGF1bmF5L2NvbG9yJyk7XG5jb25zdCBSYW5kb20gPSByZXF1aXJlKCcuL1ByZXR0eURlbGF1bmF5L3JhbmRvbScpO1xuY29uc3QgVHJpYW5nbGUgPSByZXF1aXJlKCcuL1ByZXR0eURlbGF1bmF5L3RyaWFuZ2xlJyk7XG5jb25zdCBQb2ludCA9IHJlcXVpcmUoJy4vUHJldHR5RGVsYXVuYXkvcG9pbnQnKTtcbmNvbnN0IFBvaW50TWFwID0gcmVxdWlyZSgnLi9QcmV0dHlEZWxhdW5heS9wb2ludE1hcCcpO1xuXG5yZXF1aXJlKCcuL1ByZXR0eURlbGF1bmF5L3BvbHlmaWxscycpKCk7XG5cbi8qKlxuKiBSZXByZXNlbnRzIGEgZGVsYXVuZXkgdHJpYW5ndWxhdGlvbiBvZiByYW5kb20gcG9pbnRzXG4qIGh0dHBzOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0RlbGF1bmF5X3RyaWFuZ3VsYXRpb25cbiovXG5jbGFzcyBQcmV0dHlEZWxhdW5heSB7XG4gIC8qKlxuICAgKiBAY29uc3RydWN0b3JcbiAgICovXG4gIGNvbnN0cnVjdG9yKGNhbnZhcywgb3B0aW9ucykge1xuICAgIC8vIG1lcmdlIGdpdmVuIG9wdGlvbnMgd2l0aCBkZWZhdWx0c1xuICAgIGxldCBkZWZhdWx0cyA9IFByZXR0eURlbGF1bmF5LmRlZmF1bHRzKCk7XG4gICAgdGhpcy5vcHRpb25zID0gT2JqZWN0LmFzc2lnbih7fSwgUHJldHR5RGVsYXVuYXkuZGVmYXVsdHMoKSwgKG9wdGlvbnMgfHwge30pKTtcbiAgICB0aGlzLm9wdGlvbnMuZ3JhZGllbnQgPSBPYmplY3QuYXNzaWduKHt9LCBkZWZhdWx0cy5ncmFkaWVudCwgb3B0aW9ucy5ncmFkaWVudCB8fCB7fSk7XG5cbiAgICB0aGlzLmNhbnZhcyA9IGNhbnZhcztcbiAgICB0aGlzLmN0eCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuXG4gICAgdGhpcy5yZXNpemVDYW52YXMoKTtcbiAgICB0aGlzLnBvaW50cyA9IFtdO1xuICAgIHRoaXMuY29sb3JzID0gdGhpcy5vcHRpb25zLmNvbG9ycztcbiAgICB0aGlzLnBvaW50TWFwID0gbmV3IFBvaW50TWFwKCk7XG5cbiAgICB0aGlzLm1vdXNlUG9zaXRpb24gPSBmYWxzZTtcblxuICAgIGlmICh0aGlzLm9wdGlvbnMuaG92ZXIpIHtcbiAgICAgIHRoaXMuY3JlYXRlSG92ZXJTaGFkb3dDYW52YXMoKTtcblxuICAgICAgdGhpcy5jYW52YXMuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgKGUpID0+IHtcbiAgICAgICAgaWYgKCF0aGlzLm9wdGlvbnMuYW5pbWF0ZSkge1xuICAgICAgICAgIHZhciByZWN0ID0gY2FudmFzLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgICAgICAgIHRoaXMubW91c2VQb3NpdGlvbiA9IG5ldyBQb2ludChlLmNsaWVudFggLSByZWN0LmxlZnQsIGUuY2xpZW50WSAtIHJlY3QudG9wKTtcbiAgICAgICAgICB0aGlzLmhvdmVyKCk7XG4gICAgICAgIH1cbiAgICAgIH0sIGZhbHNlKTtcblxuICAgICAgdGhpcy5jYW52YXMuYWRkRXZlbnRMaXN0ZW5lcignbW91c2VvdXQnLCAoKSA9PiB7XG4gICAgICAgIGlmICghdGhpcy5vcHRpb25zLmFuaW1hdGUpIHtcbiAgICAgICAgICB0aGlzLm1vdXNlUG9zaXRpb24gPSBmYWxzZTtcbiAgICAgICAgICB0aGlzLmhvdmVyKCk7XG4gICAgICAgIH1cbiAgICAgIH0sIGZhbHNlKTtcbiAgICB9XG5cbiAgICAvLyB0aHJvdHRsZWQgd2luZG93IHJlc2l6ZVxuICAgIHRoaXMucmVzaXppbmcgPSBmYWxzZTtcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncmVzaXplJywgKCk9PiB7XG4gICAgICBpZiAodGhpcy5yZXNpemluZykge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICB0aGlzLnJlc2l6aW5nID0gdHJ1ZTtcbiAgICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSgoKT0+IHtcbiAgICAgICAgdGhpcy5yZXNjYWxlKCk7XG4gICAgICAgIHRoaXMucmVzaXppbmcgPSBmYWxzZTtcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgdGhpcy5yYW5kb21pemUoKTtcbiAgfVxuXG4gIHN0YXRpYyBkZWZhdWx0cygpIHtcbiAgICByZXR1cm4ge1xuICAgICAgLy8gc2hvd3MgdHJpYW5nbGVzIC0gZmFsc2Ugd2lsbCBzaG93IHRoZSBncmFkaWVudCBiZWhpbmRcbiAgICAgIHNob3dUcmlhbmdsZXM6IHRydWUsXG4gICAgICAvLyBzaG93IHRoZSBwb2ludHMgdGhhdCBtYWtlIHRoZSB0cmlhbmd1bGF0aW9uXG4gICAgICBzaG93UG9pbnRzOiBmYWxzZSxcbiAgICAgIC8vIHNob3cgdGhlIGNpcmNsZXMgdGhhdCBkZWZpbmUgdGhlIGdyYWRpZW50IGxvY2F0aW9ucywgc2l6ZXNcbiAgICAgIHNob3dDaXJjbGVzOiBmYWxzZSxcbiAgICAgIC8vIHNob3cgdHJpYW5nbGUgY2VudHJvaWRzXG4gICAgICBzaG93Q2VudHJvaWRzOiBmYWxzZSxcbiAgICAgIC8vIHNob3cgdHJpYW5nbGUgZWRnZXNcbiAgICAgIHNob3dFZGdlczogdHJ1ZSxcbiAgICAgIC8vIGhpZ2hsaWdodCBob3ZlcmVkIHRyaWFuZ2xlc1xuICAgICAgaG92ZXI6IHRydWUsXG4gICAgICAvLyBtdWx0aXBsaWVyIGZvciB0aGUgbnVtYmVyIG9mIHBvaW50cyBnZW5lcmF0ZWQgYmFzZWQgb24gY2FudmFzIHNpemVcbiAgICAgIG11bHRpcGxpZXI6IDAuNSxcbiAgICAgIC8vIHdoZXRoZXIgdG8gYW5pbWF0ZSB0aGUgZ3JhZGllbnRzIGJlaGluZCB0aGUgdHJpYW5nbGVzXG4gICAgICBhbmltYXRlOiBmYWxzZSxcbiAgICAgIC8vIG51bWJlciBvZiBmcmFtZXMgcGVyIGdyYWRpZW50IGNvbG9yIGN5Y2xlXG4gICAgICBsb29wRnJhbWVzOiAyNTAsXG5cbiAgICAgIC8vIGNvbG9ycyB0byB1c2UgaW4gdGhlIGdyYWRpZW50XG4gICAgICBjb2xvcnM6IFsnaHNsYSgwLCAwJSwgMTAwJSwgMSknLCAnaHNsYSgwLCAwJSwgNTAlLCAxKScsICdoc2xhKDAsIDAlLCAwJSwgMSknXSxcblxuICAgICAgLy8gcmFuZG9tbHkgY2hvb3NlIGZyb20gY29sb3IgcGFsZXR0ZSBvbiByYW5kb21pemUgaWYgbm90IHN1cHBsaWVkIGNvbG9yc1xuICAgICAgY29sb3JQYWxldHRlOiBmYWxzZSxcblxuICAgICAgLy8gdXNlIGltYWdlIGFzIGJhY2tncm91bmQgaW5zdGVhZCBvZiBncmFkaWVudFxuICAgICAgaW1hZ2VBc0JhY2tncm91bmQ6IGZhbHNlLFxuXG4gICAgICAvLyBpbWFnZSB0byB1c2UgYXMgYmFja2dyb3VuZFxuICAgICAgaW1hZ2VVUkw6ICcnLFxuXG4gICAgICAvLyBob3cgdG8gcmVzaXplIHRoZSBwb2ludHNcbiAgICAgIHJlc2l6ZU1vZGU6ICdzY2FsZVBvaW50cycsXG4gICAgICAvLyAnbmV3UG9pbnRzJyAtIGdlbmVyYXRlcyBhIG5ldyBzZXQgb2YgcG9pbnRzIGZvciB0aGUgbmV3IHNpemVcbiAgICAgIC8vICdzY2FsZVBvaW50cycgLSBsaW5lYXJseSBzY2FsZXMgZXhpc3RpbmcgcG9pbnRzIGFuZCByZS10cmlhbmd1bGF0ZXNcblxuICAgICAgLy8gZXZlbnRzIHRyaWdnZXJlZCB3aGVuIHRoZSBjZW50ZXIgb2YgdGhlIGJhY2tncm91bmRcbiAgICAgIC8vIGlzIGdyZWF0ZXIgb3IgbGVzcyB0aGFuIDUwIGxpZ2h0bmVzcyBpbiBoc2xhXG4gICAgICAvLyBpbnRlbmRlZCB0byBhZGp1c3Qgc29tZSB0ZXh0IHRoYXQgaXMgb24gdG9wXG4gICAgICAvLyBjb2xvciBpcyB0aGUgY29sb3Igb2YgdGhlIGNlbnRlciBvZiB0aGUgY2FudmFzXG4gICAgICBvbkRhcmtCYWNrZ3JvdW5kOiBmdW5jdGlvbigpIHsgcmV0dXJuOyB9LFxuICAgICAgb25MaWdodEJhY2tncm91bmQ6IGZ1bmN0aW9uKCkgeyByZXR1cm47IH0sXG5cbiAgICBcdGdyYWRpZW50OiB7XG4gICAgXHRcdG1pblg6ICh3aWR0aCwgaGVpZ2h0KSA9PiBNYXRoLmNlaWwoTWF0aC5zcXJ0KHdpZHRoKSksXG4gICAgXHRcdG1heFg6ICh3aWR0aCwgaGVpZ2h0KSA9PiBNYXRoLmNlaWwod2lkdGggLSBNYXRoLnNxcnQod2lkdGgpKSxcbiAgICBcdFx0bWluWTogKHdpZHRoLCBoZWlnaHQpID0+IE1hdGguY2VpbChNYXRoLnNxcnQoaGVpZ2h0KSksXG4gICAgXHRcdG1heFk6ICh3aWR0aCwgaGVpZ2h0KSA9PiBNYXRoLmNlaWwoaGVpZ2h0IC0gTWF0aC5zcXJ0KGhlaWdodCkpLFxuICAgIFx0XHRtaW5SYWRpdXM6ICh3aWR0aCwgaGVpZ2h0LCBudW1HcmFkaWVudHMpID0+IE1hdGguY2VpbChNYXRoLm1heChoZWlnaHQsIHdpZHRoKSAvIE1hdGgubWF4KE1hdGguc3FydChudW1HcmFkaWVudHMpLCAyKSksXG4gICAgXHRcdG1heFJhZGl1czogKHdpZHRoLCBoZWlnaHQsIG51bUdyYWRpZW50cykgPT4gTWF0aC5jZWlsKE1hdGgubWF4KGhlaWdodCwgd2lkdGgpIC8gTWF0aC5tYXgoTWF0aC5sb2cobnVtR3JhZGllbnRzKSwgMSkpLFxuICAgICAgICBjb25uZWN0ZWQ6IHRydWVcbiAgICBcdH0sXG5cbiAgICAgIG1pbkdyYWRpZW50czogMSxcbiAgICAgIG1heEdyYWRpZW50czogMixcblxuICAgICAgLy8gdHJpZ2dlcmVkIHdoZW4gaG92ZXJlZCBvdmVyIHRyaWFuZ2xlXG4gICAgICBvblRyaWFuZ2xlSG92ZXI6IGZ1bmN0aW9uKHRyaWFuZ2xlLCBjdHgsIG9wdGlvbnMpIHtcbiAgICAgICAgdmFyIGZpbGwgPSBvcHRpb25zLmhvdmVyQ29sb3IodHJpYW5nbGUuY29sb3IpO1xuICAgICAgICB2YXIgc3Ryb2tlID0gZmlsbDtcbiAgICAgICAgdHJpYW5nbGUucmVuZGVyKGN0eCwgb3B0aW9ucy5zaG93RWRnZXMgPyBmaWxsIDogZmFsc2UsIG9wdGlvbnMuc2hvd0VkZ2VzID8gZmFsc2UgOiBzdHJva2UpO1xuICAgICAgfSxcblxuICAgICAgLy8gcmV0dXJucyBoc2xhIGNvbG9yIGZvciB0cmlhbmdsZSBlZGdlXG4gICAgICAvLyBhcyBhIGZ1bmN0aW9uIG9mIHRoZSB0cmlhbmdsZSBmaWxsIGNvbG9yXG4gICAgICBlZGdlQ29sb3I6IGZ1bmN0aW9uKGNvbG9yKSB7XG4gICAgICAgIGNvbG9yID0gQ29sb3IuaHNsYUFkanVzdExpZ2h0bmVzcyhjb2xvciwgZnVuY3Rpb24obGlnaHRuZXNzKSB7XG4gICAgICAgICAgcmV0dXJuIChsaWdodG5lc3MgKyAyMDAgLSBsaWdodG5lc3MgKiAyKSAvIDM7XG4gICAgICAgIH0pO1xuICAgICAgICBjb2xvciA9IENvbG9yLmhzbGFBZGp1c3RBbHBoYShjb2xvciwgMC4yNSk7XG4gICAgICAgIHJldHVybiBjb2xvcjtcbiAgICAgIH0sXG5cbiAgICAgIC8vIHJldHVybnMgaHNsYSBjb2xvciBmb3IgdHJpYW5nbGUgcG9pbnRcbiAgICAgIC8vIGFzIGEgZnVuY3Rpb24gb2YgdGhlIHRyaWFuZ2xlIGZpbGwgY29sb3JcbiAgICAgIHBvaW50Q29sb3I6IGZ1bmN0aW9uKGNvbG9yKSB7XG4gICAgICAgIGNvbG9yID0gQ29sb3IuaHNsYUFkanVzdExpZ2h0bmVzcyhjb2xvciwgZnVuY3Rpb24obGlnaHRuZXNzKSB7XG4gICAgICAgICAgcmV0dXJuIChsaWdodG5lc3MgKyAyMDAgLSBsaWdodG5lc3MgKiAyKSAvIDM7XG4gICAgICAgIH0pO1xuICAgICAgICBjb2xvciA9IENvbG9yLmhzbGFBZGp1c3RBbHBoYShjb2xvciwgMSk7XG4gICAgICAgIHJldHVybiBjb2xvcjtcbiAgICAgIH0sXG5cbiAgICAgIC8vIHJldHVybnMgaHNsYSBjb2xvciBmb3IgdHJpYW5nbGUgY2VudHJvaWRcbiAgICAgIC8vIGFzIGEgZnVuY3Rpb24gb2YgdGhlIHRyaWFuZ2xlIGZpbGwgY29sb3JcbiAgICAgIGNlbnRyb2lkQ29sb3I6IGZ1bmN0aW9uKGNvbG9yKSB7XG4gICAgICAgIGNvbG9yID0gQ29sb3IuaHNsYUFkanVzdExpZ2h0bmVzcyhjb2xvciwgZnVuY3Rpb24obGlnaHRuZXNzKSB7XG4gICAgICAgICAgcmV0dXJuIChsaWdodG5lc3MgKyAyMDAgLSBsaWdodG5lc3MgKiAyKSAvIDM7XG4gICAgICAgIH0pO1xuICAgICAgICBjb2xvciA9IENvbG9yLmhzbGFBZGp1c3RBbHBoYShjb2xvciwgMC4yNSk7XG4gICAgICAgIHJldHVybiBjb2xvcjtcbiAgICAgIH0sXG5cbiAgICAgIC8vIHJldHVybnMgaHNsYSBjb2xvciBmb3IgdHJpYW5nbGUgaG92ZXIgZmlsbFxuICAgICAgLy8gYXMgYSBmdW5jdGlvbiBvZiB0aGUgdHJpYW5nbGUgZmlsbCBjb2xvclxuICAgICAgaG92ZXJDb2xvcjogZnVuY3Rpb24oY29sb3IpIHtcbiAgICAgICAgY29sb3IgPSBDb2xvci5oc2xhQWRqdXN0TGlnaHRuZXNzKGNvbG9yLCBmdW5jdGlvbihsaWdodG5lc3MpIHtcbiAgICAgICAgICByZXR1cm4gMTAwIC0gbGlnaHRuZXNzO1xuICAgICAgICB9KTtcbiAgICAgICAgY29sb3IgPSBDb2xvci5oc2xhQWRqdXN0QWxwaGEoY29sb3IsIDAuNSk7XG4gICAgICAgIHJldHVybiBjb2xvcjtcbiAgICAgIH0sXG4gICAgfTtcbiAgfVxuXG4gIGNsZWFyKCkge1xuICAgIHRoaXMucG9pbnRzID0gW107XG4gICAgdGhpcy50cmlhbmdsZXMgPSBbXTtcbiAgICB0aGlzLnBvaW50TWFwLmNsZWFyKCk7XG4gICAgdGhpcy5jZW50ZXIgPSBuZXcgUG9pbnQoMCwgMCk7XG4gIH1cblxuICAvLyBjbGVhciBhbmQgY3JlYXRlIGEgZnJlc2ggc2V0IG9mIHJhbmRvbSBwb2ludHNcbiAgLy8gYWxsIGFyZ3MgYXJlIG9wdGlvbmFsXG4gIHJhbmRvbWl6ZShtaW4sIG1heCwgbWluRWRnZSwgbWF4RWRnZSwgbWluR3JhZGllbnRzLCBtYXhHcmFkaWVudHMsIG11bHRpcGxpZXIsIGNvbG9ycywgaW1hZ2VVUkwpIHtcbiAgICAvLyBjb2xvcnMgcGFyYW0gaXMgb3B0aW9uYWxcbiAgICB0aGlzLmNvbG9ycyA9IGNvbG9ycyA/XG4gICAgICAgICAgICAgICAgICAgIGNvbG9ycyA6XG4gICAgICAgICAgICAgICAgICAgIHRoaXMub3B0aW9ucy5jb2xvclBhbGV0dGUgP1xuICAgICAgICAgICAgICAgICAgICAgIHRoaXMub3B0aW9ucy5jb2xvclBhbGV0dGVbUmFuZG9tLnJhbmRvbUJldHdlZW4oMCwgdGhpcy5vcHRpb25zLmNvbG9yUGFsZXR0ZS5sZW5ndGggLSAxKV0gOlxuICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY29sb3JzO1xuXG4gICAgdGhpcy5vcHRpb25zLmltYWdlVVJMID0gaW1hZ2VVUkwgPyBpbWFnZVVSTCA6IHRoaXMub3B0aW9ucy5pbWFnZVVSTDtcbiAgICB0aGlzLm9wdGlvbnMuaW1hZ2VBc0JhY2tncm91bmQgPSAhIXRoaXMub3B0aW9ucy5pbWFnZVVSTDtcblxuICAgIHRoaXMub3B0aW9ucy5taW5HcmFkaWVudHMgPSBtaW5HcmFkaWVudHMgfHwgdGhpcy5vcHRpb25zLm1pbkdyYWRpZW50cztcbiAgICB0aGlzLm9wdGlvbnMubWF4R3JhZGllbnRzID0gbWF4R3JhZGllbnRzIHx8IHRoaXMub3B0aW9ucy5tYXhHcmFkaWVudHM7XG5cbiAgICB0aGlzLnJlc2l6ZUNhbnZhcygpO1xuXG4gICAgdGhpcy5nZW5lcmF0ZU5ld1BvaW50cyhtaW4sIG1heCwgbWluRWRnZSwgbWF4RWRnZSwgbXVsdGlwbGllcik7XG5cbiAgICB0aGlzLnRyaWFuZ3VsYXRlKCk7XG5cbiAgICBpZiAoIXRoaXMub3B0aW9ucy5pbWFnZUFzQmFja2dyb3VuZCkge1xuICAgICAgdGhpcy5nZW5lcmF0ZUdyYWRpZW50cygpO1xuXG4gICAgICAvLyBwcmVwIGZvciBhbmltYXRpb25cbiAgICAgIHRoaXMubmV4dEdyYWRpZW50cyA9IHRoaXMucmFkaWFsR3JhZGllbnRzLnNsaWNlKDApO1xuICAgICAgdGhpcy5nZW5lcmF0ZUdyYWRpZW50cygpO1xuICAgICAgdGhpcy5jdXJyZW50R3JhZGllbnRzID0gdGhpcy5yYWRpYWxHcmFkaWVudHMuc2xpY2UoMCk7XG4gICAgfVxuXG4gICAgdGhpcy5yZW5kZXIoKTtcblxuICAgIGlmICh0aGlzLm9wdGlvbnMuYW5pbWF0ZSAmJiAhdGhpcy5sb29waW5nKSB7XG4gICAgICB0aGlzLmluaXRSZW5kZXJMb29wKCk7XG4gICAgfVxuICB9XG5cbiAgaW5pdFJlbmRlckxvb3AoKSB7XG4gICAgaWYgKHRoaXMub3B0aW9ucy5pbWFnZUFzQmFja2dyb3VuZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMubG9vcGluZyA9IHRydWU7XG4gICAgdGhpcy5mcmFtZVN0ZXBzID0gdGhpcy5vcHRpb25zLmxvb3BGcmFtZXM7XG4gICAgdGhpcy5mcmFtZSA9IHRoaXMuZnJhbWUgPyB0aGlzLmZyYW1lIDogdGhpcy5mcmFtZVN0ZXBzO1xuICAgIHRoaXMucmVuZGVyTG9vcCgpO1xuICB9XG5cbiAgcmVuZGVyTG9vcCgpIHtcbiAgICB0aGlzLmZyYW1lKys7XG5cbiAgICAvLyBjdXJyZW50ID0+IG5leHQsIG5leHQgPT4gbmV3XG4gICAgaWYgKHRoaXMuZnJhbWUgPiB0aGlzLmZyYW1lU3RlcHMpIHtcbiAgICAgIHZhciBuZXh0R3JhZGllbnRzID0gdGhpcy5uZXh0R3JhZGllbnRzID8gdGhpcy5uZXh0R3JhZGllbnRzIDogdGhpcy5yYWRpYWxHcmFkaWVudHM7XG4gICAgICB0aGlzLmdlbmVyYXRlR3JhZGllbnRzKCk7XG4gICAgICB0aGlzLm5leHRHcmFkaWVudHMgPSB0aGlzLnJhZGlhbEdyYWRpZW50cztcbiAgICAgIHRoaXMucmFkaWFsR3JhZGllbnRzID0gbmV4dEdyYWRpZW50cy5zbGljZSgwKTtcbiAgICAgIHRoaXMuY3VycmVudEdyYWRpZW50cyA9IG5leHRHcmFkaWVudHMuc2xpY2UoMCk7XG5cbiAgICAgIHRoaXMuZnJhbWUgPSAwO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBmYW5jeSBzdGVwc1xuICAgICAgLy8ge3gwLCB5MCwgcjAsIHgxLCB5MSwgcjEsIGNvbG9yU3RvcH1cbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgTWF0aC5tYXgodGhpcy5yYWRpYWxHcmFkaWVudHMubGVuZ3RoLCB0aGlzLm5leHRHcmFkaWVudHMubGVuZ3RoKTsgaSsrKSB7XG4gICAgICAgIHZhciBjdXJyZW50R3JhZGllbnQgPSB0aGlzLmN1cnJlbnRHcmFkaWVudHNbaV07XG4gICAgICAgIHZhciBuZXh0R3JhZGllbnQgPSB0aGlzLm5leHRHcmFkaWVudHNbaV07XG5cbiAgICAgICAgaWYgKHR5cGVvZiBjdXJyZW50R3JhZGllbnQgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgdmFyIG5ld0dyYWRpZW50ID0ge1xuICAgICAgICAgICAgeDA6IG5leHRHcmFkaWVudC54MCxcbiAgICAgICAgICAgIHkwOiBuZXh0R3JhZGllbnQueTAsXG4gICAgICAgICAgICByMDogMCxcbiAgICAgICAgICAgIHgxOiBuZXh0R3JhZGllbnQueDEsXG4gICAgICAgICAgICB5MTogbmV4dEdyYWRpZW50LnkxLFxuICAgICAgICAgICAgcjE6IDAsXG4gICAgICAgICAgICBjb2xvclN0b3A6IG5leHRHcmFkaWVudC5jb2xvclN0b3AsXG4gICAgICAgICAgfTtcbiAgICAgICAgICBjdXJyZW50R3JhZGllbnQgPSBuZXdHcmFkaWVudDtcbiAgICAgICAgICB0aGlzLmN1cnJlbnRHcmFkaWVudHMucHVzaChuZXdHcmFkaWVudCk7XG4gICAgICAgICAgdGhpcy5yYWRpYWxHcmFkaWVudHMucHVzaChuZXdHcmFkaWVudCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodHlwZW9mIG5leHRHcmFkaWVudCA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICBuZXh0R3JhZGllbnQgPSB7XG4gICAgICAgICAgICB4MDogY3VycmVudEdyYWRpZW50LngwLFxuICAgICAgICAgICAgeTA6IGN1cnJlbnRHcmFkaWVudC55MCxcbiAgICAgICAgICAgIHIwOiAwLFxuICAgICAgICAgICAgeDE6IGN1cnJlbnRHcmFkaWVudC54MSxcbiAgICAgICAgICAgIHkxOiBjdXJyZW50R3JhZGllbnQueTEsXG4gICAgICAgICAgICByMTogMCxcbiAgICAgICAgICAgIGNvbG9yU3RvcDogY3VycmVudEdyYWRpZW50LmNvbG9yU3RvcCxcbiAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHVwZGF0ZWRHcmFkaWVudCA9IHt9O1xuXG4gICAgICAgIC8vIHNjYWxlIHRoZSBkaWZmZXJlbmNlIGJldHdlZW4gY3VycmVudCBhbmQgbmV4dCBncmFkaWVudCBiYXNlZCBvbiBzdGVwIGluIGZyYW1lc1xuICAgICAgICB2YXIgc2NhbGUgPSB0aGlzLmZyYW1lIC8gdGhpcy5mcmFtZVN0ZXBzO1xuXG4gICAgICAgIHVwZGF0ZWRHcmFkaWVudC54MCA9IE1hdGgucm91bmQobGluZWFyU2NhbGUoY3VycmVudEdyYWRpZW50LngwLCBuZXh0R3JhZGllbnQueDAsIHNjYWxlKSk7XG4gICAgICAgIHVwZGF0ZWRHcmFkaWVudC55MCA9IE1hdGgucm91bmQobGluZWFyU2NhbGUoY3VycmVudEdyYWRpZW50LnkwLCBuZXh0R3JhZGllbnQueTAsIHNjYWxlKSk7XG4gICAgICAgIHVwZGF0ZWRHcmFkaWVudC5yMCA9IE1hdGgucm91bmQobGluZWFyU2NhbGUoY3VycmVudEdyYWRpZW50LnIwLCBuZXh0R3JhZGllbnQucjAsIHNjYWxlKSk7XG4gICAgICAgIHVwZGF0ZWRHcmFkaWVudC54MSA9IE1hdGgucm91bmQobGluZWFyU2NhbGUoY3VycmVudEdyYWRpZW50LngxLCBuZXh0R3JhZGllbnQueDAsIHNjYWxlKSk7XG4gICAgICAgIHVwZGF0ZWRHcmFkaWVudC55MSA9IE1hdGgucm91bmQobGluZWFyU2NhbGUoY3VycmVudEdyYWRpZW50LnkxLCBuZXh0R3JhZGllbnQueTAsIHNjYWxlKSk7XG4gICAgICAgIHVwZGF0ZWRHcmFkaWVudC5yMSA9IE1hdGgucm91bmQobGluZWFyU2NhbGUoY3VycmVudEdyYWRpZW50LnIxLCBuZXh0R3JhZGllbnQucjEsIHNjYWxlKSk7XG4gICAgICAgIHVwZGF0ZWRHcmFkaWVudC5jb2xvclN0b3AgPSBsaW5lYXJTY2FsZShjdXJyZW50R3JhZGllbnQuY29sb3JTdG9wLCBuZXh0R3JhZGllbnQuY29sb3JTdG9wLCBzY2FsZSk7XG5cbiAgICAgICAgdGhpcy5yYWRpYWxHcmFkaWVudHNbaV0gPSB1cGRhdGVkR3JhZGllbnQ7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5yZXNldFBvaW50Q29sb3JzKCk7XG4gICAgdGhpcy5yZW5kZXIoKTtcblxuICAgIGlmICh0aGlzLm9wdGlvbnMuYW5pbWF0ZSkge1xuICAgICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpID0+IHtcbiAgICAgICAgdGhpcy5yZW5kZXJMb29wKCk7XG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5sb29waW5nID0gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgLy8gY3JlYXRlcyBhIGhpZGRlbiBjYW52YXMgZm9yIGhvdmVyIGRldGVjdGlvblxuICBjcmVhdGVIb3ZlclNoYWRvd0NhbnZhcygpIHtcbiAgICB0aGlzLmhvdmVyU2hhZG93Q2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG4gICAgdGhpcy5zaGFkb3dDdHggPSB0aGlzLmhvdmVyU2hhZG93Q2FudmFzLmdldENvbnRleHQoJzJkJyk7XG5cbiAgICB0aGlzLmhvdmVyU2hhZG93Q2FudmFzLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XG4gIH1cblxuICBnZW5lcmF0ZU5ld1BvaW50cyhtaW4sIG1heCwgbWluRWRnZSwgbWF4RWRnZSwgbXVsdGlwbGllcikge1xuICAgIC8vIGRlZmF1bHRzIHRvIGdlbmVyaWMgbnVtYmVyIG9mIHBvaW50cyBiYXNlZCBvbiBjYW52YXMgZGltZW5zaW9uc1xuICAgIC8vIHRoaXMgZ2VuZXJhbGx5IGxvb2tzIHByZXR0eSBuaWNlXG4gICAgdmFyIGFyZWEgPSB0aGlzLmNhbnZhcy53aWR0aCAqIHRoaXMuY2FudmFzLmhlaWdodDtcbiAgICB2YXIgcGVyaW1ldGVyID0gKHRoaXMuY2FudmFzLndpZHRoICsgdGhpcy5jYW52YXMuaGVpZ2h0KSAqIDI7XG5cbiAgICBtdWx0aXBsaWVyID0gbXVsdGlwbGllciB8fCB0aGlzLm9wdGlvbnMubXVsdGlwbGllcjtcblxuICAgIG1pbiA9IG1pbiA+IDAgPyBNYXRoLmNlaWwobWluKSA6IE1hdGgubWF4KE1hdGguY2VpbCgoYXJlYSAvIDEyNTApICogbXVsdGlwbGllciksIDUwKTtcbiAgICBtYXggPSBtYXggPiAwID8gTWF0aC5jZWlsKG1heCkgOiBNYXRoLm1heChNYXRoLmNlaWwoKGFyZWEgLyA1MDApICogbXVsdGlwbGllciksIDUwKTtcblxuICAgIG1pbkVkZ2UgPSBtaW5FZGdlID4gMCA/IE1hdGguY2VpbChtaW5FZGdlKSA6IE1hdGgubWF4KE1hdGguY2VpbCgocGVyaW1ldGVyIC8gMTI1KSAqIG11bHRpcGxpZXIpLCA1KTtcbiAgICBtYXhFZGdlID0gbWF4RWRnZSA+IDAgPyBNYXRoLmNlaWwobWF4RWRnZSkgOiBNYXRoLm1heChNYXRoLmNlaWwoKHBlcmltZXRlciAvIDUwKSAqIG11bHRpcGxpZXIpLCA1KTtcblxuICAgIHRoaXMubnVtUG9pbnRzID0gUmFuZG9tLnJhbmRvbUJldHdlZW4obWluLCBtYXgpO1xuICAgIHRoaXMuZ2V0TnVtRWRnZVBvaW50cyA9IFJhbmRvbS5yYW5kb21OdW1iZXJGdW5jdGlvbihtaW5FZGdlLCBtYXhFZGdlKTtcblxuICAgIHRoaXMuY2xlYXIoKTtcblxuICAgIC8vIGFkZCBjb3JuZXIgYW5kIGVkZ2UgcG9pbnRzXG4gICAgdGhpcy5nZW5lcmF0ZUNvcm5lclBvaW50cygpO1xuICAgIHRoaXMuZ2VuZXJhdGVFZGdlUG9pbnRzKCk7XG5cbiAgICAvLyBhZGQgc29tZSByYW5kb20gcG9pbnRzIGluIHRoZSBtaWRkbGUgZmllbGQsXG4gICAgLy8gZXhjbHVkaW5nIGVkZ2VzIGFuZCBjb3JuZXJzXG4gICAgdGhpcy5nZW5lcmF0ZVJhbmRvbVBvaW50cyh0aGlzLm51bVBvaW50cywgMSwgMSwgdGhpcy53aWR0aCAtIDEsIHRoaXMuaGVpZ2h0IC0gMSk7XG4gIH1cblxuICAvLyBhZGQgcG9pbnRzIGluIHRoZSBjb3JuZXJzXG4gIGdlbmVyYXRlQ29ybmVyUG9pbnRzKCkge1xuICAgIHRoaXMucG9pbnRzLnB1c2gobmV3IFBvaW50KDAsIDApKTtcbiAgICB0aGlzLnBvaW50cy5wdXNoKG5ldyBQb2ludCgwLCB0aGlzLmhlaWdodCkpO1xuICAgIHRoaXMucG9pbnRzLnB1c2gobmV3IFBvaW50KHRoaXMud2lkdGgsIDApKTtcbiAgICB0aGlzLnBvaW50cy5wdXNoKG5ldyBQb2ludCh0aGlzLndpZHRoLCB0aGlzLmhlaWdodCkpO1xuICB9XG5cbiAgLy8gYWRkIHBvaW50cyBvbiB0aGUgZWRnZXNcbiAgZ2VuZXJhdGVFZGdlUG9pbnRzKCkge1xuICAgIC8vIGxlZnQgZWRnZVxuICAgIHRoaXMuZ2VuZXJhdGVSYW5kb21Qb2ludHModGhpcy5nZXROdW1FZGdlUG9pbnRzKCksIDAsIDAsIDAsIHRoaXMuaGVpZ2h0KTtcbiAgICAvLyByaWdodCBlZGdlXG4gICAgdGhpcy5nZW5lcmF0ZVJhbmRvbVBvaW50cyh0aGlzLmdldE51bUVkZ2VQb2ludHMoKSwgdGhpcy53aWR0aCwgMCwgMCwgdGhpcy5oZWlnaHQpO1xuICAgIC8vIGJvdHRvbSBlZGdlXG4gICAgdGhpcy5nZW5lcmF0ZVJhbmRvbVBvaW50cyh0aGlzLmdldE51bUVkZ2VQb2ludHMoKSwgMCwgdGhpcy5oZWlnaHQsIHRoaXMud2lkdGgsIDApO1xuICAgIC8vIHRvcCBlZGdlXG4gICAgdGhpcy5nZW5lcmF0ZVJhbmRvbVBvaW50cyh0aGlzLmdldE51bUVkZ2VQb2ludHMoKSwgMCwgMCwgdGhpcy53aWR0aCwgMCk7XG4gIH1cblxuICAvLyByYW5kb21seSBnZW5lcmF0ZSBzb21lIHBvaW50cyxcbiAgLy8gc2F2ZSB0aGUgcG9pbnQgY2xvc2VzdCB0byBjZW50ZXJcbiAgZ2VuZXJhdGVSYW5kb21Qb2ludHMobnVtUG9pbnRzLCB4LCB5LCB3aWR0aCwgaGVpZ2h0KSB7XG4gICAgdmFyIGNlbnRlciA9IG5ldyBQb2ludChNYXRoLnJvdW5kKHRoaXMuY2FudmFzLndpZHRoIC8gMiksIE1hdGgucm91bmQodGhpcy5jYW52YXMuaGVpZ2h0IC8gMikpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbnVtUG9pbnRzOyBpKyspIHtcbiAgICAgIC8vIGdlbmVyYXRlIGEgbmV3IHBvaW50IHdpdGggcmFuZG9tIGNvb3Jkc1xuICAgICAgLy8gcmUtZ2VuZXJhdGUgdGhlIHBvaW50IGlmIGl0IGFscmVhZHkgZXhpc3RzIGluIHBvaW50bWFwIChtYXggMTAgdGltZXMpXG4gICAgICB2YXIgcG9pbnQ7XG4gICAgICB2YXIgaiA9IDA7XG4gICAgICBkbyB7XG4gICAgICAgIGorKztcbiAgICAgICAgcG9pbnQgPSBuZXcgUG9pbnQoUmFuZG9tLnJhbmRvbUJldHdlZW4oeCwgeCArIHdpZHRoKSwgUmFuZG9tLnJhbmRvbUJldHdlZW4oeSwgeSArIGhlaWdodCkpO1xuICAgICAgfSB3aGlsZSAodGhpcy5wb2ludE1hcC5leGlzdHMocG9pbnQpICYmIGogPCAxMCk7XG5cbiAgICAgIGlmIChqIDwgMTApIHtcbiAgICAgICAgdGhpcy5wb2ludHMucHVzaChwb2ludCk7XG4gICAgICAgIHRoaXMucG9pbnRNYXAuYWRkKHBvaW50KTtcbiAgICAgIH1cblxuICAgICAgaWYgKGNlbnRlci5nZXREaXN0YW5jZVRvKHBvaW50KSA8IGNlbnRlci5nZXREaXN0YW5jZVRvKHRoaXMuY2VudGVyKSkge1xuICAgICAgICB0aGlzLmNlbnRlciA9IHBvaW50O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5jZW50ZXIuaXNDZW50ZXIgPSBmYWxzZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLmNlbnRlci5pc0NlbnRlciA9IHRydWU7XG4gIH1cblxuICAvLyB1c2UgdGhlIERlbGF1bmF5IGFsZ29yaXRobSB0byBtYWtlXG4gIC8vIHRyaWFuZ2xlcyBvdXQgb2Ygb3VyIHJhbmRvbSBwb2ludHNcbiAgdHJpYW5ndWxhdGUoKSB7XG4gICAgdGhpcy50cmlhbmdsZXMgPSBbXTtcblxuICAgIC8vIG1hcCBwb2ludCBvYmplY3RzIHRvIGxlbmd0aC0yIGFycmF5c1xuICAgIHZhciB2ZXJ0aWNlcyA9IHRoaXMucG9pbnRzLm1hcChmdW5jdGlvbihwb2ludCkge1xuICAgICAgcmV0dXJuIHBvaW50LmdldENvb3JkcygpO1xuICAgIH0pO1xuXG4gICAgLy8gdmVydGljZXMgaXMgbm93IGFuIGFycmF5IHN1Y2ggYXM6XG4gICAgLy8gWyBbcDF4LCBwMXldLCBbcDJ4LCBwMnldLCBbcDN4LCBwM3ldLCAuLi4gXVxuXG4gICAgLy8gZG8gdGhlIGFsZ29yaXRobVxuICAgIHZhciB0cmlhbmd1bGF0ZWQgPSBEZWxhdW5heS50cmlhbmd1bGF0ZSh2ZXJ0aWNlcyk7XG5cbiAgICAvLyByZXR1cm5zIDEgZGltZW5zaW9uYWwgYXJyYXkgYXJyYW5nZWQgaW4gdHJpcGxlcyBzdWNoIGFzOlxuICAgIC8vIFsgdDFhLCB0MWIsIHQxYywgdDJhLCB0MmIsIHQyYywuLi4uIF1cbiAgICAvLyB3aGVyZSB0MWEsIGV0YyBhcmUgaW5kZWNlcyBpbiB0aGUgdmVydGljZXMgYXJyYXlcbiAgICAvLyB0dXJuIHRoYXQgaW50byBhcnJheSBvZiB0cmlhbmdsZSBwb2ludHNcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRyaWFuZ3VsYXRlZC5sZW5ndGg7IGkgKz0gMykge1xuICAgICAgdmFyIGFyciA9IFtdO1xuICAgICAgYXJyLnB1c2godmVydGljZXNbdHJpYW5ndWxhdGVkW2ldXSk7XG4gICAgICBhcnIucHVzaCh2ZXJ0aWNlc1t0cmlhbmd1bGF0ZWRbaSArIDFdXSk7XG4gICAgICBhcnIucHVzaCh2ZXJ0aWNlc1t0cmlhbmd1bGF0ZWRbaSArIDJdXSk7XG4gICAgICB0aGlzLnRyaWFuZ2xlcy5wdXNoKGFycik7XG4gICAgfVxuXG4gICAgLy8gbWFwIHRvIGFycmF5IG9mIFRyaWFuZ2xlIG9iamVjdHNcbiAgICB0aGlzLnRyaWFuZ2xlcyA9IHRoaXMudHJpYW5nbGVzLm1hcChmdW5jdGlvbih0cmlhbmdsZSkge1xuICAgICAgcmV0dXJuIG5ldyBUcmlhbmdsZShuZXcgUG9pbnQodHJpYW5nbGVbMF0pLFxuICAgICAgICAgICAgICAgICAgICAgICAgICBuZXcgUG9pbnQodHJpYW5nbGVbMV0pLFxuICAgICAgICAgICAgICAgICAgICAgICAgICBuZXcgUG9pbnQodHJpYW5nbGVbMl0pKTtcbiAgICB9KTtcbiAgfVxuXG4gIHJlc2V0UG9pbnRDb2xvcnMoKSB7XG4gICAgLy8gcmVzZXQgY2FjaGVkIGNvbG9ycyBvZiBjZW50cm9pZHMgYW5kIHBvaW50c1xuICAgIHZhciBpO1xuICAgIGZvciAoaSA9IDA7IGkgPCB0aGlzLnRyaWFuZ2xlcy5sZW5ndGg7IGkrKykge1xuICAgICAgdGhpcy50cmlhbmdsZXNbaV0ucmVzZXRQb2ludENvbG9ycygpO1xuICAgIH1cblxuICAgIGZvciAoaSA9IDA7IGkgPCB0aGlzLnBvaW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgdGhpcy5wb2ludHNbaV0ucmVzZXRDb2xvcigpO1xuICAgIH1cbiAgfVxuXG4gIC8vIGNyZWF0ZSByYW5kb20gcmFkaWFsIGdyYWRpZW50IGNpcmNsZXMgZm9yIHJlbmRlcmluZyBsYXRlclxuICBnZW5lcmF0ZUdyYWRpZW50cyhtaW5HcmFkaWVudHMsIG1heEdyYWRpZW50cykge1xuICAgIHRoaXMucmFkaWFsR3JhZGllbnRzID0gW107XG5cbiAgICBtaW5HcmFkaWVudHMgPSBtaW5HcmFkaWVudHMgfHwgdGhpcy5vcHRpb25zLm1pbkdyYWRpZW50cztcbiAgICBtYXhHcmFkaWVudHMgPSBtYXhHcmFkaWVudHMgfHwgdGhpcy5vcHRpb25zLm1heEdyYWRpZW50cztcblxuICAgIHRoaXMubnVtR3JhZGllbnRzID0gUmFuZG9tLnJhbmRvbUJldHdlZW4obWluR3JhZGllbnRzLCBtYXhHcmFkaWVudHMpO1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLm51bUdyYWRpZW50czsgaSsrKSB7XG4gICAgICB0aGlzLmdlbmVyYXRlUmFkaWFsR3JhZGllbnQoKTtcbiAgICB9XG4gIH1cblxuICBnZW5lcmF0ZVJhZGlhbEdyYWRpZW50KCkge1xuICAgIC8qKlxuICAgICAgKiBjcmVhdGUgYSBuaWNlLWxvb2tpbmcgYnV0IHNvbWV3aGF0IHJhbmRvbSBncmFkaWVudDpcbiAgICAgICogcmFuZG9taXplIHRoZSBmaXJzdCBjaXJjbGVcbiAgICAgICogdGhlIHNlY29uZCBjaXJjbGUgc2hvdWxkIGJlIGluc2lkZSB0aGUgZmlyc3QgY2lyY2xlLFxuICAgICAgKiBzbyB3ZSBnZW5lcmF0ZSBhIHBvaW50IChvcmlnaW4yKSBpbnNpZGUgY2lybGUxXG4gICAgICAqIHRoZW4gY2FsY3VsYXRlIHRoZSBkaXN0IGJldHdlZW4gb3JpZ2luMiBhbmQgdGhlIGNpcmN1bWZyZW5jZSBvZiBjaXJjbGUxXG4gICAgICAqIGNpcmNsZTIncyByYWRpdXMgY2FuIGJlIGJldHdlZW4gMCBhbmQgdGhpcyBkaXN0XG4gICAgICAqL1xuXG4gICAgdmFyIG1pblggPSB0aGlzLm9wdGlvbnMuZ3JhZGllbnQubWluWCh0aGlzLmNhbnZhcy53aWR0aCwgdGhpcy5jYW52YXMuaGVpZ2h0KTtcbiAgICB2YXIgbWF4WCA9IHRoaXMub3B0aW9ucy5ncmFkaWVudC5tYXhYKHRoaXMuY2FudmFzLndpZHRoLCB0aGlzLmNhbnZhcy5oZWlnaHQpO1xuXG4gICAgdmFyIG1pblkgPSB0aGlzLm9wdGlvbnMuZ3JhZGllbnQubWluWSh0aGlzLmNhbnZhcy53aWR0aCwgdGhpcy5jYW52YXMuaGVpZ2h0KTtcbiAgICB2YXIgbWF4WSA9IHRoaXMub3B0aW9ucy5ncmFkaWVudC5tYXhZKHRoaXMuY2FudmFzLndpZHRoLCB0aGlzLmNhbnZhcy5oZWlnaHQpO1xuXG4gICAgdmFyIG1pblJhZGl1cyA9IHRoaXMub3B0aW9ucy5ncmFkaWVudC5taW5SYWRpdXModGhpcy5jYW52YXMud2lkdGgsIHRoaXMuY2FudmFzLmhlaWdodCwgdGhpcy5udW1HcmFkaWVudHMpO1xuICAgIHZhciBtYXhSYWRpdXMgPSB0aGlzLm9wdGlvbnMuZ3JhZGllbnQubWF4UmFkaXVzKHRoaXMuY2FudmFzLndpZHRoLCB0aGlzLmNhbnZhcy5oZWlnaHQsIHRoaXMubnVtR3JhZGllbnRzKTtcblxuICAgIC8vIGhlbHBlciByYW5kb20gZnVuY3Rpb25zXG4gICAgdmFyIHJhbmRvbUNhbnZhc1ggPSBSYW5kb20ucmFuZG9tTnVtYmVyRnVuY3Rpb24obWluWCwgbWF4WCk7XG4gICAgdmFyIHJhbmRvbUNhbnZhc1kgPSBSYW5kb20ucmFuZG9tTnVtYmVyRnVuY3Rpb24obWluWSwgbWF4WSk7XG4gICAgdmFyIHJhbmRvbUNhbnZhc1JhZGl1cyA9IFJhbmRvbS5yYW5kb21OdW1iZXJGdW5jdGlvbihtaW5SYWRpdXMsIG1heFJhZGl1cyk7XG5cbiAgICAvLyBnZW5lcmF0ZSBjaXJjbGUxIG9yaWdpbiBhbmQgcmFkaXVzXG4gICAgdmFyIHgwO1xuICAgIHZhciB5MDtcbiAgICB2YXIgcjAgPSByYW5kb21DYW52YXNSYWRpdXMoKTtcblxuICAgIC8vIG9yaWdpbiBvZiB0aGUgbmV4dCBjaXJjbGUgc2hvdWxkIGJlIGNvbnRhaW5lZFxuICAgIC8vIHdpdGhpbiB0aGUgYXJlYSBvZiBpdHMgcHJlZGVjZXNzb3JcbiAgICBpZiAodGhpcy5vcHRpb25zLmdyYWRpZW50LmNvbm5lY3RlZCAmJiB0aGlzLnJhZGlhbEdyYWRpZW50cy5sZW5ndGggPiAwKSB7XG4gICAgICB2YXIgbGFzdEdyYWRpZW50ID0gdGhpcy5yYWRpYWxHcmFkaWVudHNbdGhpcy5yYWRpYWxHcmFkaWVudHMubGVuZ3RoIC0gMV07XG4gICAgICB2YXIgcG9pbnRJbkxhc3RDaXJjbGUgPSBSYW5kb20ucmFuZG9tSW5DaXJjbGUobGFzdEdyYWRpZW50LnIwLCBsYXN0R3JhZGllbnQueDAsIGxhc3RHcmFkaWVudC55MCk7XG5cbiAgICAgIHgwID0gcG9pbnRJbkxhc3RDaXJjbGUueDtcbiAgICAgIHkwID0gcG9pbnRJbkxhc3RDaXJjbGUueTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gZmlyc3QgY2lyY2xlLCBqdXN0IHBpY2sgYXQgcmFuZG9tXG4gICAgICB4MCA9IHJhbmRvbUNhbnZhc1goKTtcbiAgICAgIHkwID0gcmFuZG9tQ2FudmFzWSgpO1xuICAgIH1cblxuICAgIC8vIGZpbmQgYSByYW5kb20gcG9pbnQgaW5zaWRlIGNpcmNsZTFcbiAgICAvLyB0aGlzIGlzIHRoZSBvcmlnaW4gb2YgY2lyY2xlIDJcbiAgICB2YXIgcG9pbnRJbkNpcmNsZSA9IFJhbmRvbS5yYW5kb21JbkNpcmNsZShyMCAqIDAuMDksIHgwLCB5MCk7XG5cbiAgICAvLyBncmFiIHRoZSB4L3kgY29vcmRzXG4gICAgdmFyIHgxID0gcG9pbnRJbkNpcmNsZS54O1xuICAgIHZhciB5MSA9IHBvaW50SW5DaXJjbGUueTtcblxuICAgIC8vIGZpbmQgZGlzdGFuY2UgYmV0d2VlbiB0aGUgcG9pbnQgYW5kIHRoZSBjaXJjdW1mcmllbmNlIG9mIGNpcmNsZTFcbiAgICAvLyB0aGUgcmFkaXVzIG9mIHRoZSBzZWNvbmQgY2lyY2xlIHdpbGwgYmUgYSBmdW5jdGlvbiBvZiB0aGlzIGRpc3RhbmNlXG4gICAgdmFyIHZYID0geDEgLSB4MDtcbiAgICB2YXIgdlkgPSB5MSAtIHkwO1xuICAgIHZhciBtYWdWID0gTWF0aC5zcXJ0KHZYICogdlggKyB2WSAqIHZZKTtcbiAgICB2YXIgYVggPSB4MCArIHZYIC8gbWFnViAqIHIwO1xuICAgIHZhciBhWSA9IHkwICsgdlkgLyBtYWdWICogcjA7XG5cbiAgICB2YXIgZGlzdCA9IE1hdGguc3FydCgoeDEgLSBhWCkgKiAoeDEgLSBhWCkgKyAoeTEgLSBhWSkgKiAoeTEgLSBhWSkpO1xuXG4gICAgLy8gZ2VuZXJhdGUgdGhlIHJhZGl1cyBvZiBjaXJjbGUyIGJhc2VkIG9uIHRoaXMgZGlzdGFuY2VcbiAgICB2YXIgcjEgPSBSYW5kb20ucmFuZG9tQmV0d2VlbigxLCBNYXRoLnNxcnQoZGlzdCkpO1xuXG4gICAgLy8gcmFuZG9tIGJ1dCBuaWNlIGxvb2tpbmcgY29sb3Igc3RvcFxuICAgIHZhciBjb2xvclN0b3AgPSBSYW5kb20ucmFuZG9tQmV0d2VlbigyLCA4KSAvIDEwO1xuXG4gICAgdGhpcy5yYWRpYWxHcmFkaWVudHMucHVzaCh7eDAsIHkwLCByMCwgeDEsIHkxLCByMSwgY29sb3JTdG9wfSk7XG4gIH1cblxuICAvLyBzb3J0cyB0aGUgcG9pbnRzXG4gIHNvcnRQb2ludHMoKSB7XG4gICAgLy8gc29ydCBwb2ludHNcbiAgICB0aGlzLnBvaW50cy5zb3J0KGZ1bmN0aW9uKGEsIGIpIHtcbiAgICAgIC8vIHNvcnQgdGhlIHBvaW50XG4gICAgICBpZiAoYS54IDwgYi54KSB7XG4gICAgICAgIHJldHVybiAtMTtcbiAgICAgIH0gZWxzZSBpZiAoYS54ID4gYi54KSB7XG4gICAgICAgIHJldHVybiAxO1xuICAgICAgfSBlbHNlIGlmIChhLnkgPCBiLnkpIHtcbiAgICAgICAgcmV0dXJuIC0xO1xuICAgICAgfSBlbHNlIGlmIChhLnkgPiBiLnkpIHtcbiAgICAgICAgcmV0dXJuIDE7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gMDtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIC8vIHNpemUgdGhlIGNhbnZhcyB0byB0aGUgc2l6ZSBvZiBpdHMgcGFyZW50XG4gIC8vIG1ha2VzIHRoZSBjYW52YXMgJ3Jlc3BvbnNpdmUnXG4gIHJlc2l6ZUNhbnZhcygpIHtcbiAgICB2YXIgcGFyZW50ID0gdGhpcy5jYW52YXMucGFyZW50RWxlbWVudDtcbiAgICB0aGlzLmNhbnZhcy53aWR0aCA9IHRoaXMud2lkdGggPSBwYXJlbnQub2Zmc2V0V2lkdGg7XG4gICAgdGhpcy5jYW52YXMuaGVpZ2h0ID0gdGhpcy5oZWlnaHQgPSBwYXJlbnQub2Zmc2V0SGVpZ2h0O1xuXG4gICAgaWYgKHRoaXMuaG92ZXJTaGFkb3dDYW52YXMpIHtcbiAgICAgIHRoaXMuaG92ZXJTaGFkb3dDYW52YXMud2lkdGggPSB0aGlzLndpZHRoID0gcGFyZW50Lm9mZnNldFdpZHRoO1xuICAgICAgdGhpcy5ob3ZlclNoYWRvd0NhbnZhcy5oZWlnaHQgPSB0aGlzLmhlaWdodCA9IHBhcmVudC5vZmZzZXRIZWlnaHQ7XG4gICAgfVxuICB9XG5cbiAgLy8gbW92ZXMgcG9pbnRzL3RyaWFuZ2xlcyBiYXNlZCBvbiBuZXcgc2l6ZSBvZiBjYW52YXNcbiAgcmVzY2FsZSgpIHtcbiAgICAvLyBncmFiIG9sZCBtYXgvbWluIGZyb20gY3VycmVudCBjYW52YXMgc2l6ZVxuICAgIHZhciB4TWluID0gMDtcbiAgICB2YXIgeE1heCA9IHRoaXMuY2FudmFzLndpZHRoO1xuICAgIHZhciB5TWluID0gMDtcbiAgICB2YXIgeU1heCA9IHRoaXMuY2FudmFzLmhlaWdodDtcblxuICAgIHRoaXMucmVzaXplQ2FudmFzKCk7XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLnJlc2l6ZU1vZGUgPT09ICdzY2FsZVBvaW50cycpIHtcbiAgICAgIC8vIHNjYWxlIGFsbCBwb2ludHMgdG8gbmV3IG1heCBkaW1lbnNpb25zXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMucG9pbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHRoaXMucG9pbnRzW2ldLnJlc2NhbGUoeE1pbiwgeE1heCwgeU1pbiwgeU1heCwgMCwgdGhpcy5jYW52YXMud2lkdGgsIDAsIHRoaXMuY2FudmFzLmhlaWdodCk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuZ2VuZXJhdGVOZXdQb2ludHMoKTtcbiAgICB9XG5cbiAgICB0aGlzLnRyaWFuZ3VsYXRlKCk7XG5cbiAgICAvLyByZXNjYWxlIHBvc2l0aW9uIG9mIHJhZGlhbCBncmFkaWVudCBjaXJjbGVzXG4gICAgdGhpcy5yZXNjYWxlR3JhZGllbnRzKHRoaXMucmFkaWFsR3JhZGllbnRzLCB4TWluLCB4TWF4LCB5TWluLCB5TWF4KTtcbiAgICB0aGlzLnJlc2NhbGVHcmFkaWVudHModGhpcy5jdXJyZW50R3JhZGllbnRzLCB4TWluLCB4TWF4LCB5TWluLCB5TWF4KTtcbiAgICB0aGlzLnJlc2NhbGVHcmFkaWVudHModGhpcy5uZXh0R3JhZGllbnRzLCB4TWluLCB4TWF4LCB5TWluLCB5TWF4KTtcblxuICAgIHRoaXMucmVuZGVyKCk7XG4gIH1cblxuICByZXNjYWxlR3JhZGllbnRzKGFycmF5LCB4TWluLCB4TWF4LCB5TWluLCB5TWF4KSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcnJheS5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIGNpcmNsZTAgPSBuZXcgUG9pbnQoYXJyYXlbaV0ueDAsIGFycmF5W2ldLnkwKTtcbiAgICAgIHZhciBjaXJjbGUxID0gbmV3IFBvaW50KGFycmF5W2ldLngxLCBhcnJheVtpXS55MSk7XG5cbiAgICAgIGNpcmNsZTAucmVzY2FsZSh4TWluLCB4TWF4LCB5TWluLCB5TWF4LCAwLCB0aGlzLmNhbnZhcy53aWR0aCwgMCwgdGhpcy5jYW52YXMuaGVpZ2h0KTtcbiAgICAgIGNpcmNsZTEucmVzY2FsZSh4TWluLCB4TWF4LCB5TWluLCB5TWF4LCAwLCB0aGlzLmNhbnZhcy53aWR0aCwgMCwgdGhpcy5jYW52YXMuaGVpZ2h0KTtcblxuICAgICAgYXJyYXlbaV0ueDAgPSBjaXJjbGUwLng7XG4gICAgICBhcnJheVtpXS55MCA9IGNpcmNsZTAueTtcbiAgICAgIGFycmF5W2ldLngxID0gY2lyY2xlMS54O1xuICAgICAgYXJyYXlbaV0ueTEgPSBjaXJjbGUxLnk7XG4gICAgfVxuICB9XG5cbiAgaG92ZXIoKSB7XG4gICAgaWYgKHRoaXMubW91c2VQb3NpdGlvbikge1xuICAgICAgdmFyIHJnYiA9IHRoaXMubW91c2VQb3NpdGlvbi5jYW52YXNDb2xvckF0UG9pbnQodGhpcy5zaGFkb3dJbWFnZURhdGEsICdyZ2InKTtcbiAgICAgIHZhciBoZXggPSBDb2xvci5yZ2JUb0hleChyZ2IpO1xuICAgICAgdmFyIGRlYyA9IHBhcnNlSW50KGhleCwgMTYpO1xuXG4gICAgICAvLyBpcyBwcm9iYWJseSB0cmlhbmdsZSB3aXRoIHRoYXQgaW5kZXgsIGJ1dFxuICAgICAgLy8gZWRnZXMgY2FuIGJlIGZ1enp5IHNvIGRvdWJsZSBjaGVja1xuICAgICAgaWYgKGRlYyA+PSAwICYmIGRlYyA8IHRoaXMudHJpYW5nbGVzLmxlbmd0aCAmJiB0aGlzLnRyaWFuZ2xlc1tkZWNdLnBvaW50SW5UcmlhbmdsZSh0aGlzLm1vdXNlUG9zaXRpb24pKSB7XG4gICAgICAgIC8vIGNsZWFyIHRoZSBsYXN0IHRyaWFuZ2xlXG4gICAgICAgIHRoaXMucmVzZXRUcmlhbmdsZSgpO1xuXG4gICAgICAgIGlmICh0aGlzLmxhc3RUcmlhbmdsZSAhPT0gZGVjKSB7XG4gICAgICAgICAgLy8gcmVuZGVyIHRoZSBob3ZlcmVkIHRyaWFuZ2xlXG4gICAgICAgICAgdGhpcy5vcHRpb25zLm9uVHJpYW5nbGVIb3Zlcih0aGlzLnRyaWFuZ2xlc1tkZWNdLCB0aGlzLmN0eCwgdGhpcy5vcHRpb25zKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMubGFzdFRyaWFuZ2xlID0gZGVjO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnJlc2V0VHJpYW5nbGUoKTtcbiAgICB9XG4gIH1cblxuICByZXNldFRyaWFuZ2xlKCkge1xuICAgIC8vIHJlZHJhdyB0aGUgbGFzdCB0cmlhbmdsZSB0aGF0IHdhcyBob3ZlcmVkIG92ZXJcbiAgICBpZiAodGhpcy5sYXN0VHJpYW5nbGUgJiYgdGhpcy5sYXN0VHJpYW5nbGUgPj0gMCAmJiB0aGlzLmxhc3RUcmlhbmdsZSA8IHRoaXMudHJpYW5nbGVzLmxlbmd0aCkge1xuICAgICAgdmFyIGxhc3RUcmlhbmdsZSA9IHRoaXMudHJpYW5nbGVzW3RoaXMubGFzdFRyaWFuZ2xlXTtcblxuICAgICAgLy8gZmluZCB0aGUgYm91bmRpbmcgcG9pbnRzIG9mIHRoZSBsYXN0IHRyaWFuZ2xlXG4gICAgICAvLyBleHBhbmQgYSBiaXQgZm9yIGVkZ2VzXG4gICAgICB2YXIgbWluWCA9IGxhc3RUcmlhbmdsZS5taW5YKCkgLSAxO1xuICAgICAgdmFyIG1pblkgPSBsYXN0VHJpYW5nbGUubWluWSgpIC0gMTtcbiAgICAgIHZhciBtYXhYID0gbGFzdFRyaWFuZ2xlLm1heFgoKSArIDE7XG4gICAgICB2YXIgbWF4WSA9IGxhc3RUcmlhbmdsZS5tYXhZKCkgKyAxO1xuXG4gICAgICAvLyByZXNldCB0aGF0IHBvcnRpb24gb2YgdGhlIGNhbnZhcyB0byBpdHMgb3JpZ2luYWwgcmVuZGVyXG4gICAgICB0aGlzLmN0eC5wdXRJbWFnZURhdGEodGhpcy5yZW5kZXJlZEltYWdlRGF0YSwgMCwgMCwgbWluWCwgbWluWSwgbWF4WCAtIG1pblgsIG1heFkgLSBtaW5ZKTtcblxuICAgICAgdGhpcy5sYXN0VHJpYW5nbGUgPSBmYWxzZTtcbiAgICB9XG4gIH1cblxuICByZW5kZXIoKSB7XG4gICAgdGhpcy5yZW5kZXJCYWNrZ3JvdW5kKHRoaXMucmVuZGVyRm9yZWdyb3VuZC5iaW5kKHRoaXMpKTtcbiAgfVxuXG4gIHJlbmRlckJhY2tncm91bmQoY2FsbGJhY2spIHtcbiAgICAvLyByZW5kZXIgdGhlIGJhc2UgdG8gZ2V0IHRyaWFuZ2xlIGNvbG9yc1xuICAgIGlmICh0aGlzLm9wdGlvbnMuaW1hZ2VBc0JhY2tncm91bmQpIHtcbiAgICAgIHRoaXMucmVuZGVySW1hZ2VCYWNrZ3JvdW5kKGNhbGxiYWNrKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5yZW5kZXJHcmFkaWVudCgpO1xuICAgICAgY2FsbGJhY2soKTtcbiAgICB9XG4gIH1cblxuICByZW5kZXJGb3JlZ3JvdW5kKCkge1xuICAgIC8vIGdldCBlbnRpcmUgY2FudmFzIGltYWdlIGRhdGEgb2YgaW4gYSBiaWcgdHlwZWQgYXJyYXlcbiAgICAvLyB0aGlzIHdheSB3ZSBkb250IGhhdmUgdG8gcGljayBmb3IgZWFjaCBwb2ludCBpbmRpdmlkdWFsbHlcbiAgICAvLyBpdCdzIGxpa2UgNTB4IGZhc3RlciB0aGlzIHdheVxuICAgIHRoaXMuZ3JhZGllbnRJbWFnZURhdGEgPSB0aGlzLmN0eC5nZXRJbWFnZURhdGEoMCwgMCwgdGhpcy5jYW52YXMud2lkdGgsIHRoaXMuY2FudmFzLmhlaWdodCk7XG5cbiAgICAvLyByZW5kZXJzIHRyaWFuZ2xlcywgZWRnZXMsIGFuZCBzaGFkb3cgY2FudmFzIGZvciBob3ZlciBkZXRlY3Rpb25cbiAgICB0aGlzLnJlbmRlclRyaWFuZ2xlcyh0aGlzLm9wdGlvbnMuc2hvd1RyaWFuZ2xlcywgdGhpcy5vcHRpb25zLnNob3dFZGdlcyk7XG5cbiAgICB0aGlzLnJlbmRlckV4dHJhcygpO1xuXG4gICAgdGhpcy5yZW5kZXJlZEltYWdlRGF0YSA9IHRoaXMuY3R4LmdldEltYWdlRGF0YSgwLCAwLCB0aGlzLmNhbnZhcy53aWR0aCwgdGhpcy5jYW52YXMuaGVpZ2h0KTtcblxuICAgIC8vIHRocm93IGV2ZW50cyBmb3IgbGlnaHQgLyBkYXJrIHRleHRcbiAgICB2YXIgY2VudGVyQ29sb3IgPSB0aGlzLmNlbnRlci5jYW52YXNDb2xvckF0UG9pbnQoKTtcblxuICAgIGlmIChwYXJzZUludChjZW50ZXJDb2xvci5zcGxpdCgnLCcpWzJdKSA8IDUwKSB7XG4gICAgICBpZiAodGhpcy5vcHRpb25zLm9uRGFya0JhY2tncm91bmQpIHtcbiAgICAgICAgdGhpcy5vcHRpb25zLm9uRGFya0JhY2tncm91bmQoY2VudGVyQ29sb3IpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBpZiAodGhpcy5vcHRpb25zLm9uTGlnaHRCYWNrZ3JvdW5kKSB7XG4gICAgICAgIHRoaXMub3B0aW9ucy5vbkxpZ2h0QmFja2dyb3VuZChjZW50ZXJDb2xvcik7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmVuZGVyRXh0cmFzKCkge1xuICAgIGlmICh0aGlzLm9wdGlvbnMuc2hvd1BvaW50cykge1xuICAgICAgdGhpcy5yZW5kZXJQb2ludHMoKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLnNob3dDaXJjbGVzICYmICF0aGlzLm9wdGlvbnMuaW1hZ2VBc0JhY2tncm91bmQpIHtcbiAgICAgIHRoaXMucmVuZGVyR3JhZGllbnRDaXJjbGVzKCk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5zaG93Q2VudHJvaWRzKSB7XG4gICAgICB0aGlzLnJlbmRlckNlbnRyb2lkcygpO1xuICAgIH1cbiAgfVxuXG4gIHJlbmRlck5ld0NvbG9ycyhjb2xvcnMpIHtcbiAgICB0aGlzLmNvbG9ycyA9IGNvbG9ycyB8fCB0aGlzLmNvbG9ycztcbiAgICAvLyB0cmlhbmdsZSBjZW50cm9pZHMgbmVlZCBuZXcgY29sb3JzXG4gICAgdGhpcy5yZXNldFBvaW50Q29sb3JzKCk7XG4gICAgdGhpcy5yZW5kZXIoKTtcbiAgfVxuXG4gIHJlbmRlck5ld0dyYWRpZW50KG1pbkdyYWRpZW50cywgbWF4R3JhZGllbnRzKSB7XG4gICAgdGhpcy5nZW5lcmF0ZUdyYWRpZW50cyhtaW5HcmFkaWVudHMsIG1heEdyYWRpZW50cyk7XG5cbiAgICAvLyBwcmVwIGZvciBhbmltYXRpb25cbiAgICB0aGlzLm5leHRHcmFkaWVudHMgPSB0aGlzLnJhZGlhbEdyYWRpZW50cy5zbGljZSgwKTtcbiAgICB0aGlzLmdlbmVyYXRlR3JhZGllbnRzKCk7XG4gICAgdGhpcy5jdXJyZW50R3JhZGllbnRzID0gdGhpcy5yYWRpYWxHcmFkaWVudHMuc2xpY2UoMCk7XG5cbiAgICB0aGlzLnJlc2V0UG9pbnRDb2xvcnMoKTtcbiAgICB0aGlzLnJlbmRlcigpO1xuICB9XG5cbiAgcmVuZGVyTmV3VHJpYW5nbGVzKG1pbiwgbWF4LCBtaW5FZGdlLCBtYXhFZGdlLCBtdWx0aXBsaWVyKSB7XG4gICAgdGhpcy5nZW5lcmF0ZU5ld1BvaW50cyhtaW4sIG1heCwgbWluRWRnZSwgbWF4RWRnZSwgbXVsdGlwbGllcik7XG4gICAgdGhpcy50cmlhbmd1bGF0ZSgpO1xuICAgIHRoaXMucmVuZGVyKCk7XG4gIH1cblxuICByZW5kZXJHcmFkaWVudCgpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMucmFkaWFsR3JhZGllbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAvLyBjcmVhdGUgdGhlIHJhZGlhbCBncmFkaWVudCBiYXNlZCBvblxuICAgICAgLy8gdGhlIGdlbmVyYXRlZCBjaXJjbGVzJyByYWRpaSBhbmQgb3JpZ2luc1xuICAgICAgdmFyIHJhZGlhbEdyYWRpZW50ID0gdGhpcy5jdHguY3JlYXRlUmFkaWFsR3JhZGllbnQoXG4gICAgICAgIHRoaXMucmFkaWFsR3JhZGllbnRzW2ldLngwLFxuICAgICAgICB0aGlzLnJhZGlhbEdyYWRpZW50c1tpXS55MCxcbiAgICAgICAgdGhpcy5yYWRpYWxHcmFkaWVudHNbaV0ucjAsXG4gICAgICAgIHRoaXMucmFkaWFsR3JhZGllbnRzW2ldLngxLFxuICAgICAgICB0aGlzLnJhZGlhbEdyYWRpZW50c1tpXS55MSxcbiAgICAgICAgdGhpcy5yYWRpYWxHcmFkaWVudHNbaV0ucjFcbiAgICAgICk7XG5cbiAgICAgIHZhciBvdXRlckNvbG9yID0gdGhpcy5jb2xvcnNbMl07XG5cbiAgICAgIC8vIG11c3QgYmUgdHJhbnNwYXJlbnQgdmVyc2lvbiBvZiBtaWRkbGUgY29sb3JcbiAgICAgIC8vIHRoaXMgd29ya3MgZm9yIHJnYmEgYW5kIGhzbGFcbiAgICAgIGlmIChpID4gMCkge1xuICAgICAgICBvdXRlckNvbG9yID0gdGhpcy5jb2xvcnNbMV0uc3BsaXQoJywnKTtcbiAgICAgICAgb3V0ZXJDb2xvclszXSA9ICcwKSc7XG4gICAgICAgIG91dGVyQ29sb3IgPSBvdXRlckNvbG9yLmpvaW4oJywnKTtcbiAgICAgIH1cblxuICAgICAgcmFkaWFsR3JhZGllbnQuYWRkQ29sb3JTdG9wKDEsIHRoaXMuY29sb3JzWzBdKTtcbiAgICAgIHJhZGlhbEdyYWRpZW50LmFkZENvbG9yU3RvcCh0aGlzLnJhZGlhbEdyYWRpZW50c1tpXS5jb2xvclN0b3AsIHRoaXMuY29sb3JzWzFdKTtcbiAgICAgIHJhZGlhbEdyYWRpZW50LmFkZENvbG9yU3RvcCgwLCBvdXRlckNvbG9yKTtcblxuICAgICAgdGhpcy5jYW52YXMucGFyZW50RWxlbWVudC5zdHlsZS5iYWNrZ3JvdW5kQ29sb3IgPSB0aGlzLmNvbG9yc1syXTtcblxuICAgICAgdGhpcy5jdHguZmlsbFN0eWxlID0gcmFkaWFsR3JhZGllbnQ7XG4gICAgICB0aGlzLmN0eC5maWxsUmVjdCgwLCAwLCB0aGlzLmNhbnZhcy53aWR0aCwgdGhpcy5jYW52YXMuaGVpZ2h0KTtcbiAgICB9XG4gIH1cblxuICByZW5kZXJJbWFnZUJhY2tncm91bmQoY2FsbGJhY2spIHtcbiAgICB0aGlzLmxvYWRJbWFnZUJhY2tncm91bmQoKGZ1bmN0aW9uKCkge1xuICAgICAgLy8gc2NhbGUgaW1hZ2UgdG8gZml0IHdpZHRoL2hlaWdodCBvZiBjYW52YXNcbiAgICAgIGxldCBoZWlnaHRNdWx0aXBsaWVyID0gdGhpcy5jYW52YXMuaGVpZ2h0IC8gdGhpcy5pbWFnZS5oZWlnaHQ7XG4gICAgICBsZXQgd2lkdGhNdWx0aXBsaWVyID0gdGhpcy5jYW52YXMud2lkdGggLyB0aGlzLmltYWdlLndpZHRoO1xuXG4gICAgICBsZXQgbXVsdGlwbGllciA9IE1hdGgubWF4KGhlaWdodE11bHRpcGxpZXIsIHdpZHRoTXVsdGlwbGllcik7XG5cbiAgICAgIHRoaXMuY3R4LmRyYXdJbWFnZSh0aGlzLmltYWdlLCAwLCAwLCB0aGlzLmltYWdlLndpZHRoICogbXVsdGlwbGllciwgdGhpcy5pbWFnZS5oZWlnaHQgKiBtdWx0aXBsaWVyKTtcblxuICAgICAgY2FsbGJhY2soKTtcbiAgICB9KS5iaW5kKHRoaXMpKTtcbiAgfVxuXG4gIGxvYWRJbWFnZUJhY2tncm91bmQoY2FsbGJhY2spIHtcbiAgICBpZiAodGhpcy5pbWFnZSAmJiB0aGlzLmltYWdlLnNyYyA9PT0gdGhpcy5vcHRpb25zLmltYWdlVVJMKSB7XG4gICAgICBjYWxsYmFjaygpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmltYWdlID0gbmV3IEltYWdlKCk7XG4gICAgICB0aGlzLmltYWdlLmNyb3NzT3JpZ2luID0gJ0Fub255bW91cyc7XG4gICAgICB0aGlzLmltYWdlLnNyYyA9IHRoaXMub3B0aW9ucy5pbWFnZVVSTDtcblxuICAgICAgdGhpcy5pbWFnZS5vbmxvYWQgPSBjYWxsYmFjaztcbiAgICB9XG4gIH1cblxuICByZW5kZXJUcmlhbmdsZXModHJpYW5nbGVzLCBlZGdlcykge1xuICAgIC8vIHNhdmUgdGhpcyBmb3IgbGF0ZXJcbiAgICB0aGlzLmNlbnRlci5jYW52YXNDb2xvckF0UG9pbnQodGhpcy5ncmFkaWVudEltYWdlRGF0YSk7XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMudHJpYW5nbGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAvLyB0aGUgY29sb3IgaXMgZGV0ZXJtaW5lZCBieSBncmFiYmluZyB0aGUgY29sb3Igb2YgdGhlIGNhbnZhc1xuICAgICAgLy8gKHdoZXJlIHdlIGRyZXcgdGhlIGdyYWRpZW50KSBhdCB0aGUgY2VudGVyIG9mIHRoZSB0cmlhbmdsZVxuXG4gICAgICB0aGlzLnRyaWFuZ2xlc1tpXS5jb2xvciA9IHRoaXMudHJpYW5nbGVzW2ldLmNvbG9yQXRDZW50cm9pZCh0aGlzLmdyYWRpZW50SW1hZ2VEYXRhKTtcblxuICAgICAgaWYgKHRyaWFuZ2xlcyAmJiBlZGdlcykge1xuICAgICAgICB0aGlzLnRyaWFuZ2xlc1tpXS5zdHJva2UgPSB0aGlzLm9wdGlvbnMuZWRnZUNvbG9yKHRoaXMudHJpYW5nbGVzW2ldLmNvbG9yQXRDZW50cm9pZCh0aGlzLmdyYWRpZW50SW1hZ2VEYXRhKSk7XG4gICAgICAgIHRoaXMudHJpYW5nbGVzW2ldLnJlbmRlcih0aGlzLmN0eCk7XG4gICAgICB9IGVsc2UgaWYgKHRyaWFuZ2xlcykge1xuICAgICAgICAvLyB0cmlhbmdsZXMgb25seVxuICAgICAgICB0aGlzLnRyaWFuZ2xlc1tpXS5zdHJva2UgPSB0aGlzLnRyaWFuZ2xlc1tpXS5jb2xvcjtcbiAgICAgICAgdGhpcy50cmlhbmdsZXNbaV0ucmVuZGVyKHRoaXMuY3R4KTtcbiAgICAgIH0gZWxzZSBpZiAoZWRnZXMpIHtcbiAgICAgICAgLy8gZWRnZXMgb25seVxuICAgICAgICB0aGlzLnRyaWFuZ2xlc1tpXS5zdHJva2UgPSB0aGlzLm9wdGlvbnMuZWRnZUNvbG9yKHRoaXMudHJpYW5nbGVzW2ldLmNvbG9yQXRDZW50cm9pZCh0aGlzLmdyYWRpZW50SW1hZ2VEYXRhKSk7XG4gICAgICAgIHRoaXMudHJpYW5nbGVzW2ldLnJlbmRlcih0aGlzLmN0eCwgZmFsc2UpO1xuICAgICAgfVxuXG4gICAgICBpZiAodGhpcy5ob3ZlclNoYWRvd0NhbnZhcykge1xuICAgICAgICB2YXIgY29sb3IgPSAnIycgKyAoJzAwMDAwMCcgKyBpLnRvU3RyaW5nKDE2KSkuc2xpY2UoLTYpO1xuICAgICAgICB0aGlzLnRyaWFuZ2xlc1tpXS5yZW5kZXIodGhpcy5zaGFkb3dDdHgsIGNvbG9yLCBmYWxzZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuaG92ZXJTaGFkb3dDYW52YXMpIHtcbiAgICAgIHRoaXMuc2hhZG93SW1hZ2VEYXRhID0gdGhpcy5zaGFkb3dDdHguZ2V0SW1hZ2VEYXRhKDAsIDAsIHRoaXMuY2FudmFzLndpZHRoLCB0aGlzLmNhbnZhcy5oZWlnaHQpO1xuICAgIH1cbiAgfVxuXG4gIC8vIHJlbmRlcnMgdGhlIHBvaW50cyBvZiB0aGUgdHJpYW5nbGVzXG4gIHJlbmRlclBvaW50cygpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMucG9pbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgY29sb3IgPSB0aGlzLm9wdGlvbnMucG9pbnRDb2xvcih0aGlzLnBvaW50c1tpXS5jYW52YXNDb2xvckF0UG9pbnQodGhpcy5ncmFkaWVudEltYWdlRGF0YSkpO1xuICAgICAgdGhpcy5wb2ludHNbaV0ucmVuZGVyKHRoaXMuY3R4LCBjb2xvcik7XG4gICAgfVxuICB9XG5cbiAgLy8gZHJhd3MgdGhlIGNpcmNsZXMgdGhhdCBkZWZpbmUgdGhlIGdyYWRpZW50c1xuICByZW5kZXJHcmFkaWVudENpcmNsZXMoKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLnJhZGlhbEdyYWRpZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgdGhpcy5jdHguYmVnaW5QYXRoKCk7XG4gICAgICB0aGlzLmN0eC5hcmModGhpcy5yYWRpYWxHcmFkaWVudHNbaV0ueDAsXG4gICAgICAgICAgICAgIHRoaXMucmFkaWFsR3JhZGllbnRzW2ldLnkwLFxuICAgICAgICAgICAgICB0aGlzLnJhZGlhbEdyYWRpZW50c1tpXS5yMCxcbiAgICAgICAgICAgICAgMCwgTWF0aC5QSSAqIDIsIHRydWUpO1xuICAgICAgdmFyIGNlbnRlcjEgPSBuZXcgUG9pbnQodGhpcy5yYWRpYWxHcmFkaWVudHNbaV0ueDAsIHRoaXMucmFkaWFsR3JhZGllbnRzW2ldLnkwKTtcbiAgICAgIHRoaXMuY3R4LnN0cm9rZVN0eWxlID0gY2VudGVyMS5jYW52YXNDb2xvckF0UG9pbnQodGhpcy5ncmFkaWVudEltYWdlRGF0YSk7XG4gICAgICB0aGlzLmN0eC5zdHJva2UoKTtcblxuICAgICAgdGhpcy5jdHguYmVnaW5QYXRoKCk7XG4gICAgICB0aGlzLmN0eC5hcmModGhpcy5yYWRpYWxHcmFkaWVudHNbaV0ueDEsXG4gICAgICAgICAgICAgIHRoaXMucmFkaWFsR3JhZGllbnRzW2ldLnkxLFxuICAgICAgICAgICAgICB0aGlzLnJhZGlhbEdyYWRpZW50c1tpXS5yMSxcbiAgICAgICAgICAgICAgMCwgTWF0aC5QSSAqIDIsIHRydWUpO1xuICAgICAgdmFyIGNlbnRlcjIgPSBuZXcgUG9pbnQodGhpcy5yYWRpYWxHcmFkaWVudHNbaV0ueDEsIHRoaXMucmFkaWFsR3JhZGllbnRzW2ldLnkxKTtcbiAgICAgIHRoaXMuY3R4LnN0cm9rZVN0eWxlID0gY2VudGVyMi5jYW52YXNDb2xvckF0UG9pbnQodGhpcy5ncmFkaWVudEltYWdlRGF0YSk7XG4gICAgICB0aGlzLmN0eC5zdHJva2UoKTtcbiAgICB9XG4gIH1cblxuICAvLyByZW5kZXIgdHJpYW5nbGUgY2VudHJvaWRzXG4gIHJlbmRlckNlbnRyb2lkcygpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMudHJpYW5nbGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgY29sb3IgPSB0aGlzLm9wdGlvbnMuY2VudHJvaWRDb2xvcih0aGlzLnRyaWFuZ2xlc1tpXS5jb2xvckF0Q2VudHJvaWQodGhpcy5ncmFkaWVudEltYWdlRGF0YSkpO1xuICAgICAgdGhpcy50cmlhbmdsZXNbaV0uY2VudHJvaWQoKS5yZW5kZXIodGhpcy5jdHgsIGNvbG9yKTtcbiAgICB9XG4gIH1cblxuICB0b2dnbGVUcmlhbmdsZXMoKSB7XG4gICAgdGhpcy5vcHRpb25zLnNob3dUcmlhbmdsZXMgPSAhdGhpcy5vcHRpb25zLnNob3dUcmlhbmdsZXM7XG4gICAgdGhpcy5yZW5kZXIoKTtcbiAgfVxuXG4gIHRvZ2dsZVBvaW50cygpIHtcbiAgICB0aGlzLm9wdGlvbnMuc2hvd1BvaW50cyA9ICF0aGlzLm9wdGlvbnMuc2hvd1BvaW50cztcbiAgICB0aGlzLnJlbmRlcigpO1xuICB9XG5cbiAgdG9nZ2xlQ2lyY2xlcygpIHtcbiAgICB0aGlzLm9wdGlvbnMuc2hvd0NpcmNsZXMgPSAhdGhpcy5vcHRpb25zLnNob3dDaXJjbGVzO1xuICAgIHRoaXMucmVuZGVyKCk7XG4gIH1cblxuICB0b2dnbGVDZW50cm9pZHMoKSB7XG4gICAgdGhpcy5vcHRpb25zLnNob3dDZW50cm9pZHMgPSAhdGhpcy5vcHRpb25zLnNob3dDZW50cm9pZHM7XG4gICAgdGhpcy5yZW5kZXIoKTtcbiAgfVxuXG4gIHRvZ2dsZUVkZ2VzKCkge1xuICAgIHRoaXMub3B0aW9ucy5zaG93RWRnZXMgPSAhdGhpcy5vcHRpb25zLnNob3dFZGdlcztcbiAgICB0aGlzLnJlbmRlcigpO1xuICB9XG5cbiAgdG9nZ2xlQW5pbWF0aW9uKCkge1xuICAgIHRoaXMub3B0aW9ucy5hbmltYXRlID0gIXRoaXMub3B0aW9ucy5hbmltYXRlO1xuICAgIGlmICh0aGlzLm9wdGlvbnMuYW5pbWF0ZSkge1xuICAgICAgdGhpcy5pbml0UmVuZGVyTG9vcCgpO1xuICAgIH1cbiAgfVxuXG4gIGdldENvbG9ycygpIHtcbiAgICByZXR1cm4gdGhpcy5jb2xvcnM7XG4gIH1cbn1cblxuZnVuY3Rpb24gbGluZWFyU2NhbGUoeDAsIHgxLCBzY2FsZSkge1xuICByZXR1cm4geDAgKyAoc2NhbGUgKiAoeDEgLSB4MCkpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFByZXR0eURlbGF1bmF5O1xuIiwiY29uc3QgQ29sb3IgPSB7XG5cbiAgaGV4VG9SZ2JhOiBmdW5jdGlvbihoZXgpIHtcbiAgICBoZXggPSBoZXgucmVwbGFjZSgnIycsICcnKTtcbiAgICB2YXIgciA9IHBhcnNlSW50KGhleC5zdWJzdHJpbmcoMCwgMiksIDE2KTtcbiAgICB2YXIgZyA9IHBhcnNlSW50KGhleC5zdWJzdHJpbmcoMiwgNCksIDE2KTtcbiAgICB2YXIgYiA9IHBhcnNlSW50KGhleC5zdWJzdHJpbmcoNCwgNiksIDE2KTtcblxuICAgIHJldHVybiAncmdiYSgnICsgciArICcsJyArIGcgKyAnLCcgKyBiICsgJywxKSc7XG4gIH0sXG5cbiAgaGV4VG9SZ2JhQXJyYXk6IGZ1bmN0aW9uKGhleCkge1xuICAgIGhleCA9IGhleC5yZXBsYWNlKCcjJywgJycpO1xuICAgIHZhciByID0gcGFyc2VJbnQoaGV4LnN1YnN0cmluZygwLCAyKSwgMTYpO1xuICAgIHZhciBnID0gcGFyc2VJbnQoaGV4LnN1YnN0cmluZygyLCA0KSwgMTYpO1xuICAgIHZhciBiID0gcGFyc2VJbnQoaGV4LnN1YnN0cmluZyg0LCA2KSwgMTYpO1xuXG4gICAgcmV0dXJuIFtyLCBnLCBiXTtcbiAgfSxcblxuICAvKipcbiAgICogQ29udmVydHMgYW4gUkdCIGNvbG9yIHZhbHVlIHRvIEhTTC4gQ29udmVyc2lvbiBmb3JtdWxhXG4gICAqIGFkYXB0ZWQgZnJvbSBodHRwOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0hTTF9jb2xvcl9zcGFjZS5cbiAgICogQXNzdW1lcyByLCBnLCBhbmQgYiBhcmUgY29udGFpbmVkIGluIHRoZSBzZXQgWzAsIDI1NV0gYW5kXG4gICAqIHJldHVybnMgaCwgcywgYW5kIGwgaW4gdGhlIHNldCBbMCwgMV0uXG4gICAqXG4gICAqIEBwYXJhbSAgIE51bWJlciAgciAgICAgICBUaGUgcmVkIGNvbG9yIHZhbHVlXG4gICAqIEBwYXJhbSAgIE51bWJlciAgZyAgICAgICBUaGUgZ3JlZW4gY29sb3IgdmFsdWVcbiAgICogQHBhcmFtICAgTnVtYmVyICBiICAgICAgIFRoZSBibHVlIGNvbG9yIHZhbHVlXG4gICAqIEByZXR1cm4gIEFycmF5ICAgICAgICAgICBUaGUgSFNMIHJlcHJlc2VudGF0aW9uXG4gICAqL1xuICByZ2JUb0hzbGE6IGZ1bmN0aW9uKHJnYikge1xuICAgIHZhciByID0gcmdiWzBdIC8gMjU1O1xuICAgIHZhciBnID0gcmdiWzFdIC8gMjU1O1xuICAgIHZhciBiID0gcmdiWzJdIC8gMjU1O1xuICAgIHZhciBtYXggPSBNYXRoLm1heChyLCBnLCBiKTtcbiAgICB2YXIgbWluID0gTWF0aC5taW4ociwgZywgYik7XG4gICAgdmFyIGg7XG4gICAgdmFyIHM7XG4gICAgdmFyIGwgPSAobWF4ICsgbWluKSAvIDI7XG5cbiAgICBpZiAobWF4ID09PSBtaW4pIHtcbiAgICAgIGggPSBzID0gMDsgLy8gYWNocm9tYXRpY1xuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgZCA9IG1heCAtIG1pbjtcbiAgICAgIHMgPSBsID4gMC41ID8gZCAvICgyIC0gbWF4IC0gbWluKSA6IGQgLyAobWF4ICsgbWluKTtcbiAgICAgIHN3aXRjaCAobWF4KXtcbiAgICAgICAgY2FzZSByOiBoID0gKGcgLSBiKSAvIGQgKyAoZyA8IGIgPyA2IDogMCk7IGJyZWFrO1xuICAgICAgICBjYXNlIGc6IGggPSAoYiAtIHIpIC8gZCArIDI7IGJyZWFrO1xuICAgICAgICBjYXNlIGI6IGggPSAociAtIGcpIC8gZCArIDQ7IGJyZWFrO1xuICAgICAgfVxuICAgICAgaCAvPSA2O1xuICAgIH1cblxuICAgIHJldHVybiAnaHNsYSgnICsgTWF0aC5yb3VuZChoICogMzYwKSArICcsJyArIE1hdGgucm91bmQocyAqIDEwMCkgKyAnJSwnICsgTWF0aC5yb3VuZChsICogMTAwKSArICclLDEpJztcbiAgfSxcblxuICBoc2xhQWRqdXN0QWxwaGE6IGZ1bmN0aW9uKGNvbG9yLCBhbHBoYSkge1xuICAgIGNvbG9yID0gY29sb3Iuc3BsaXQoJywnKTtcblxuICAgIGlmICh0eXBlb2YgYWxwaGEgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgIGNvbG9yWzNdID0gYWxwaGE7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbG9yWzNdID0gYWxwaGEocGFyc2VJbnQoY29sb3JbM10pKTtcbiAgICB9XG5cbiAgICBjb2xvclszXSArPSAnKSc7XG4gICAgcmV0dXJuIGNvbG9yLmpvaW4oJywnKTtcbiAgfSxcblxuICBoc2xhQWRqdXN0TGlnaHRuZXNzOiBmdW5jdGlvbihjb2xvciwgbGlnaHRuZXNzKSB7XG4gICAgY29sb3IgPSBjb2xvci5zcGxpdCgnLCcpO1xuXG4gICAgaWYgKHR5cGVvZiBsaWdodG5lc3MgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgIGNvbG9yWzJdID0gbGlnaHRuZXNzO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb2xvclsyXSA9IGxpZ2h0bmVzcyhwYXJzZUludChjb2xvclsyXSkpO1xuICAgIH1cblxuICAgIGNvbG9yWzJdICs9ICclJztcbiAgICByZXR1cm4gY29sb3Iuam9pbignLCcpO1xuICB9LFxuXG4gIHJnYlRvSGV4OiBmdW5jdGlvbihyZ2IpIHtcbiAgICBpZiAodHlwZW9mIHJnYiA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHJnYiA9IHJnYi5yZXBsYWNlKCdyZ2IoJywgJycpLnJlcGxhY2UoJyknLCAnJykuc3BsaXQoJywnKTtcbiAgICB9XG4gICAgcmdiID0gcmdiLm1hcChmdW5jdGlvbih4KSB7XG4gICAgICB4ID0gcGFyc2VJbnQoeCkudG9TdHJpbmcoMTYpO1xuICAgICAgcmV0dXJuICh4Lmxlbmd0aCA9PT0gMSkgPyAnMCcgKyB4IDogeDtcbiAgICB9KTtcbiAgICByZXR1cm4gcmdiLmpvaW4oJycpO1xuICB9LFxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBDb2xvcjtcbiIsImNvbnN0IENvbG9yID0gcmVxdWlyZSgnLi9jb2xvcicpO1xuXG4vKipcbiAqIFJlcHJlc2VudHMgYSBwb2ludFxuICogQGNsYXNzXG4gKi9cbmNsYXNzIFBvaW50IHtcbiAgLyoqXG4gICAqIFBvaW50IGNvbnNpc3RzIHggYW5kIHlcbiAgICogQGNvbnN0cnVjdG9yXG4gICAqIEBwYXJhbSB7TnVtYmVyfSB4XG4gICAqIEBwYXJhbSB7TnVtYmVyfSB5XG4gICAqIG9yOlxuICAgKiBAcGFyYW0ge051bWJlcltdfSB4XG4gICAqIHdoZXJlIHggaXMgbGVuZ3RoLTIgYXJyYXlcbiAgICovXG4gIGNvbnN0cnVjdG9yKHgsIHkpIHtcbiAgICBpZiAoQXJyYXkuaXNBcnJheSh4KSkge1xuICAgICAgeSA9IHhbMV07XG4gICAgICB4ID0geFswXTtcbiAgICB9XG4gICAgdGhpcy54ID0geDtcbiAgICB0aGlzLnkgPSB5O1xuICAgIHRoaXMucmFkaXVzID0gMTtcbiAgICB0aGlzLmNvbG9yID0gJ2JsYWNrJztcbiAgfVxuXG4gIC8vIGRyYXcgdGhlIHBvaW50XG4gIHJlbmRlcihjdHgsIGNvbG9yKSB7XG4gICAgY3R4LmJlZ2luUGF0aCgpO1xuICAgIGN0eC5hcmModGhpcy54LCB0aGlzLnksIHRoaXMucmFkaXVzLCAwLCAyICogTWF0aC5QSSwgZmFsc2UpO1xuICAgIGN0eC5maWxsU3R5bGUgPSBjb2xvciB8fCB0aGlzLmNvbG9yO1xuICAgIGN0eC5maWxsKCk7XG4gICAgY3R4LmNsb3NlUGF0aCgpO1xuICB9XG5cbiAgLy8gY29udmVydHMgdG8gc3RyaW5nXG4gIC8vIHJldHVybnMgc29tZXRoaW5nIGxpa2U6XG4gIC8vIFwiKFgsWSlcIlxuICAvLyB1c2VkIGluIHRoZSBwb2ludG1hcCB0byBkZXRlY3QgdW5pcXVlIHBvaW50c1xuICB0b1N0cmluZygpIHtcbiAgICByZXR1cm4gJygnICsgdGhpcy54ICsgJywnICsgdGhpcy55ICsgJyknO1xuICB9XG5cbiAgLy8gZ3JhYiB0aGUgY29sb3Igb2YgdGhlIGNhbnZhcyBhdCB0aGUgcG9pbnRcbiAgLy8gcmVxdWlyZXMgaW1hZ2VkYXRhIGZyb20gY2FudmFzIHNvIHdlIGRvbnQgZ3JhYlxuICAvLyBlYWNoIHBvaW50IGluZGl2aWR1YWxseSwgd2hpY2ggaXMgcmVhbGx5IGV4cGVuc2l2ZVxuICBjYW52YXNDb2xvckF0UG9pbnQoaW1hZ2VEYXRhLCBjb2xvclNwYWNlKSB7XG4gICAgY29sb3JTcGFjZSA9IGNvbG9yU3BhY2UgfHwgJ2hzbGEnO1xuICAgIC8vIG9ubHkgZmluZCB0aGUgY2FudmFzIGNvbG9yIGlmIHdlIGRvbnQgYWxyZWFkeSBrbm93IGl0XG4gICAgaWYgKCF0aGlzLl9jYW52YXNDb2xvcikge1xuICAgICAgLy8gaW1hZ2VEYXRhIGFycmF5IGlzIGZsYXQsIGdvZXMgYnkgcm93cyB0aGVuIGNvbHMsIGZvdXIgdmFsdWVzIHBlciBwaXhlbFxuICAgICAgdmFyIGlkeCA9IChNYXRoLmZsb29yKHRoaXMueSkgKiBpbWFnZURhdGEud2lkdGggKiA0KSArIChNYXRoLmZsb29yKHRoaXMueCkgKiA0KTtcblxuICAgICAgaWYgKGNvbG9yU3BhY2UgPT09ICdoc2xhJykge1xuICAgICAgICB0aGlzLl9jYW52YXNDb2xvciA9IENvbG9yLnJnYlRvSHNsYShBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChpbWFnZURhdGEuZGF0YSwgaWR4LCBpZHggKyA0KSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl9jYW52YXNDb2xvciA9ICdyZ2IoJyArIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGltYWdlRGF0YS5kYXRhLCBpZHgsIGlkeCArIDMpLmpvaW4oKSArICcpJztcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHRoaXMuX2NhbnZhc0NvbG9yO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fY2FudmFzQ29sb3I7XG4gIH1cblxuICBnZXRDb29yZHMoKSB7XG4gICAgcmV0dXJuIFt0aGlzLngsIHRoaXMueV07XG4gIH1cblxuICAvLyBkaXN0YW5jZSB0byBhbm90aGVyIHBvaW50XG4gIGdldERpc3RhbmNlVG8ocG9pbnQpIHtcbiAgICAvLyDiiJooeDLiiJJ4MSkyKyh5MuKIknkxKTJcbiAgICByZXR1cm4gTWF0aC5zcXJ0KE1hdGgucG93KHRoaXMueCAtIHBvaW50LngsIDIpICsgTWF0aC5wb3codGhpcy55IC0gcG9pbnQueSwgMikpO1xuICB9XG5cbiAgLy8gc2NhbGUgcG9pbnRzIGZyb20gW0EsIEJdIHRvIFtDLCBEXVxuICAvLyB4QSA9PiBvbGQgeCBtaW4sIHhCID0+IG9sZCB4IG1heFxuICAvLyB5QSA9PiBvbGQgeSBtaW4sIHlCID0+IG9sZCB5IG1heFxuICAvLyB4QyA9PiBuZXcgeCBtaW4sIHhEID0+IG5ldyB4IG1heFxuICAvLyB5QyA9PiBuZXcgeSBtaW4sIHlEID0+IG5ldyB5IG1heFxuICByZXNjYWxlKHhBLCB4QiwgeUEsIHlCLCB4QywgeEQsIHlDLCB5RCkge1xuICAgIC8vIE5ld1ZhbHVlID0gKCgoT2xkVmFsdWUgLSBPbGRNaW4pICogTmV3UmFuZ2UpIC8gT2xkUmFuZ2UpICsgTmV3TWluXG5cbiAgICB2YXIgeE9sZFJhbmdlID0geEIgLSB4QTtcbiAgICB2YXIgeU9sZFJhbmdlID0geUIgLSB5QTtcblxuICAgIHZhciB4TmV3UmFuZ2UgPSB4RCAtIHhDO1xuICAgIHZhciB5TmV3UmFuZ2UgPSB5RCAtIHlDO1xuXG4gICAgdGhpcy54ID0gKCgodGhpcy54IC0geEEpICogeE5ld1JhbmdlKSAvIHhPbGRSYW5nZSkgKyB4QztcbiAgICB0aGlzLnkgPSAoKCh0aGlzLnkgLSB5QSkgKiB5TmV3UmFuZ2UpIC8geU9sZFJhbmdlKSArIHlDO1xuICB9XG5cbiAgcmVzZXRDb2xvcigpIHtcbiAgICB0aGlzLl9jYW52YXNDb2xvciA9IHVuZGVmaW5lZDtcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFBvaW50O1xuIiwiY29uc3QgUG9pbnQgPSByZXF1aXJlKCcuL3BvaW50Jyk7XG5cbi8qKlxuICogUmVwcmVzZW50cyBhIHBvaW50XG4gKiBAY2xhc3NcbiAqL1xuY2xhc3MgUG9pbnRNYXAge1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICB0aGlzLl9tYXAgPSB7fTtcbiAgfVxuXG4gIC8vIGFkZHMgcG9pbnQgdG8gbWFwXG4gIGFkZChwb2ludCkge1xuICAgIHRoaXMuX21hcFtwb2ludC50b1N0cmluZygpXSA9IHRydWU7XG4gIH1cblxuICAvLyBhZGRzIHgsIHkgY29vcmQgdG8gbWFwXG4gIGFkZENvb3JkKHgsIHkpIHtcbiAgICB0aGlzLmFkZChuZXcgUG9pbnQoeCwgeSkpO1xuICB9XG5cbiAgLy8gcmVtb3ZlcyBwb2ludCBmcm9tIG1hcFxuICByZW1vdmUocG9pbnQpIHtcbiAgICB0aGlzLl9tYXBbcG9pbnQudG9TdHJpbmcoKV0gPSBmYWxzZTtcbiAgfVxuXG4gIC8vIHJlbW92ZXMgeCwgeSBjb29yZCBmcm9tIG1hcFxuICByZW1vdmVDb29yZCh4LCB5KSB7XG4gICAgdGhpcy5yZW1vdmUobmV3IFBvaW50KHgsIHkpKTtcbiAgfVxuXG4gIC8vIGNsZWFycyB0aGUgbWFwXG4gIGNsZWFyKCkge1xuICAgIHRoaXMuX21hcCA9IHt9O1xuICB9XG5cbiAgLyoqXG4gICAqIGRldGVybWluZXMgaWYgcG9pbnQgaGFzIGJlZW5cbiAgICogYWRkZWQgdG8gbWFwIGFscmVhZHlcbiAgICogIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgZXhpc3RzKHBvaW50KSB7XG4gICAgcmV0dXJuIHRoaXMuX21hcFtwb2ludC50b1N0cmluZygpXSA/IHRydWUgOiBmYWxzZTtcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFBvaW50TWFwO1xuIiwiZnVuY3Rpb24gcG9seWZpbGxzKCkge1xuICAvLyBwb2x5ZmlsbCBmb3IgT2JqZWN0LmFzc2lnblxuICBpZiAodHlwZW9mIE9iamVjdC5hc3NpZ24gIT09ICdmdW5jdGlvbicpIHtcbiAgICBPYmplY3QuYXNzaWduID0gZnVuY3Rpb24odGFyZ2V0KSB7XG4gICAgICBpZiAodGFyZ2V0ID09PSB1bmRlZmluZWQgfHwgdGFyZ2V0ID09PSBudWxsKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0Nhbm5vdCBjb252ZXJ0IHVuZGVmaW5lZCBvciBudWxsIHRvIG9iamVjdCcpO1xuICAgICAgfVxuXG4gICAgICB2YXIgb3V0cHV0ID0gT2JqZWN0KHRhcmdldCk7XG4gICAgICBmb3IgKHZhciBpbmRleCA9IDE7IGluZGV4IDwgYXJndW1lbnRzLmxlbmd0aDsgaW5kZXgrKykge1xuICAgICAgICB2YXIgc291cmNlID0gYXJndW1lbnRzW2luZGV4XTtcbiAgICAgICAgaWYgKHNvdXJjZSAhPT0gdW5kZWZpbmVkICYmIHNvdXJjZSAhPT0gbnVsbCkge1xuICAgICAgICAgIGZvciAodmFyIG5leHRLZXkgaW4gc291cmNlKSB7XG4gICAgICAgICAgICBpZiAoc291cmNlLmhhc093blByb3BlcnR5KG5leHRLZXkpKSB7XG4gICAgICAgICAgICAgIG91dHB1dFtuZXh0S2V5XSA9IHNvdXJjZVtuZXh0S2V5XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBvdXRwdXQ7XG4gICAgfTtcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHBvbHlmaWxscztcbiIsImNvbnN0IFBvaW50ID0gcmVxdWlyZSgnLi9wb2ludCcpO1xuXG5jb25zdCBSYW5kb20gPSB7XG4gIC8vIGhleSBsb29rIGEgY2xvc3VyZVxuICAvLyByZXR1cm5zIGZ1bmN0aW9uIGZvciByYW5kb20gbnVtYmVycyB3aXRoIHByZS1zZXQgbWF4IGFuZCBtaW5cbiAgcmFuZG9tTnVtYmVyRnVuY3Rpb246IGZ1bmN0aW9uKG1heCwgbWluKSB7XG4gICAgbWluID0gbWluIHx8IDA7XG4gICAgaWYgKG1pbiA+IG1heCkge1xuICAgICAgdmFyIHRlbXAgPSBtYXg7XG4gICAgICBtYXggPSBtaW47XG4gICAgICBtaW4gPSB0ZW1wO1xuICAgIH1cbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogKG1heCAtIG1pbiArIDEpKSArIG1pbjtcbiAgICB9O1xuICB9LFxuXG4gIC8vIHJldHVybnMgYSByYW5kb20gbnVtYmVyXG4gIC8vIGJldHdlZW4gdGhlIG1heCBhbmQgbWluXG4gIHJhbmRvbUJldHdlZW46IGZ1bmN0aW9uKG1heCwgbWluKSB7XG4gICAgbWluID0gbWluIHx8IDA7XG4gICAgcmV0dXJuIFJhbmRvbS5yYW5kb21OdW1iZXJGdW5jdGlvbihtYXgsIG1pbikoKTtcbiAgfSxcblxuICByYW5kb21JbkNpcmNsZTogZnVuY3Rpb24ocmFkaXVzLCBveCwgb3kpIHtcbiAgICB2YXIgYW5nbGUgPSBNYXRoLnJhbmRvbSgpICogTWF0aC5QSSAqIDI7XG4gICAgdmFyIHJhZCA9IE1hdGguc3FydChNYXRoLnJhbmRvbSgpKSAqIHJhZGl1cztcbiAgICB2YXIgeCA9IG94ICsgcmFkICogTWF0aC5jb3MoYW5nbGUpO1xuICAgIHZhciB5ID0gb3kgKyByYWQgKiBNYXRoLnNpbihhbmdsZSk7XG5cbiAgICByZXR1cm4gbmV3IFBvaW50KHgsIHkpO1xuICB9LFxuXG4gIHJhbmRvbVJnYmE6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiAncmdiYSgnICsgUmFuZG9tLnJhbmRvbUJldHdlZW4oMjU1KSArICcsJyArXG4gICAgICAgICAgICAgICAgICAgICBSYW5kb20ucmFuZG9tQmV0d2VlbigyNTUpICsgJywnICtcbiAgICAgICAgICAgICAgICAgICAgIFJhbmRvbS5yYW5kb21CZXR3ZWVuKDI1NSkgKyAnLCAxKSc7XG4gIH0sXG5cbiAgcmFuZG9tSHNsYTogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuICdoc2xhKCcgKyBSYW5kb20ucmFuZG9tQmV0d2VlbigzNjApICsgJywnICtcbiAgICAgICAgICAgICAgICAgICAgIFJhbmRvbS5yYW5kb21CZXR3ZWVuKDEwMCkgKyAnJSwnICtcbiAgICAgICAgICAgICAgICAgICAgIFJhbmRvbS5yYW5kb21CZXR3ZWVuKDEwMCkgKyAnJSwgMSknO1xuICB9LFxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBSYW5kb207XG4iLCJjb25zdCBQb2ludCA9IHJlcXVpcmUoJy4vcG9pbnQnKTtcblxuLyoqXG4gKiBSZXByZXNlbnRzIGEgdHJpYW5nbGVcbiAqIEBjbGFzc1xuICovXG5jbGFzcyBUcmlhbmdsZSB7XG4gIC8qKlxuICAgKiBUcmlhbmdsZSBjb25zaXN0cyBvZiB0aHJlZSBQb2ludHNcbiAgICogQGNvbnN0cnVjdG9yXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBhXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBiXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBjXG4gICAqL1xuICBjb25zdHJ1Y3RvcihhLCBiLCBjKSB7XG4gICAgdGhpcy5wMSA9IHRoaXMuYSA9IGE7XG4gICAgdGhpcy5wMiA9IHRoaXMuYiA9IGI7XG4gICAgdGhpcy5wMyA9IHRoaXMuYyA9IGM7XG5cbiAgICB0aGlzLmNvbG9yID0gJ2JsYWNrJztcbiAgICB0aGlzLnN0cm9rZSA9ICdibGFjayc7XG4gIH1cblxuICAvLyBkcmF3IHRoZSB0cmlhbmdsZSB3aXRoIGRpZmZlcmluZyBlZGdlIGNvbG9ycyBvcHRpb25hbFxuICByZW5kZXIoY3R4LCBjb2xvciwgc3Ryb2tlKSB7XG4gICAgY3R4LmJlZ2luUGF0aCgpO1xuICAgIGN0eC5tb3ZlVG8odGhpcy5hLngsIHRoaXMuYS55KTtcbiAgICBjdHgubGluZVRvKHRoaXMuYi54LCB0aGlzLmIueSk7XG4gICAgY3R4LmxpbmVUbyh0aGlzLmMueCwgdGhpcy5jLnkpO1xuICAgIGN0eC5jbG9zZVBhdGgoKTtcbiAgICBjdHguc3Ryb2tlU3R5bGUgPSBzdHJva2UgfHwgdGhpcy5zdHJva2UgfHwgdGhpcy5jb2xvcjtcbiAgICBjdHguZmlsbFN0eWxlID0gY29sb3IgfHwgdGhpcy5jb2xvcjtcbiAgICBpZiAoY29sb3IgIT09IGZhbHNlICYmIHN0cm9rZSAhPT0gZmFsc2UpIHtcbiAgICAgIC8vIGRyYXcgdGhlIHN0cm9rZSB1c2luZyB0aGUgZmlsbCBjb2xvciBmaXJzdFxuICAgICAgLy8gc28gdGhhdCB0aGUgcG9pbnRzIG9mIGFkamFjZW50IHRyaWFuZ2xlc1xuICAgICAgLy8gZG9udCBvdmVybGFwIGEgYnVuY2ggYW5kIGxvb2sgXCJzdGFycnlcIlxuICAgICAgdmFyIHRlbXBTdHJva2UgPSBjdHguc3Ryb2tlU3R5bGU7XG4gICAgICBjdHguc3Ryb2tlU3R5bGUgPSBjdHguZmlsbFN0eWxlO1xuICAgICAgY3R4LnN0cm9rZSgpO1xuICAgICAgY3R4LnN0cm9rZVN0eWxlID0gdGVtcFN0cm9rZTtcbiAgICB9XG4gICAgaWYgKGNvbG9yICE9PSBmYWxzZSkge1xuICAgICAgY3R4LmZpbGwoKTtcbiAgICB9XG4gICAgaWYgKHN0cm9rZSAhPT0gZmFsc2UpIHtcbiAgICAgIGN0eC5zdHJva2UoKTtcbiAgICB9XG4gICAgY3R4LmNsb3NlUGF0aCgpO1xuICB9XG5cbiAgLy8gcmFuZG9tIHBvaW50IGluc2lkZSB0cmlhbmdsZVxuICByYW5kb21JbnNpZGUoKSB7XG4gICAgdmFyIHIxID0gTWF0aC5yYW5kb20oKTtcbiAgICB2YXIgcjIgPSBNYXRoLnJhbmRvbSgpO1xuICAgIHZhciB4ID0gKDEgLSBNYXRoLnNxcnQocjEpKSAqXG4gICAgICAgICAgICB0aGlzLnAxLnggKyAoTWF0aC5zcXJ0KHIxKSAqXG4gICAgICAgICAgICAoMSAtIHIyKSkgKlxuICAgICAgICAgICAgdGhpcy5wMi54ICsgKE1hdGguc3FydChyMSkgKiByMikgKlxuICAgICAgICAgICAgdGhpcy5wMy54O1xuICAgIHZhciB5ID0gKDEgLSBNYXRoLnNxcnQocjEpKSAqXG4gICAgICAgICAgICB0aGlzLnAxLnkgKyAoTWF0aC5zcXJ0KHIxKSAqXG4gICAgICAgICAgICAoMSAtIHIyKSkgKlxuICAgICAgICAgICAgdGhpcy5wMi55ICsgKE1hdGguc3FydChyMSkgKiByMikgKlxuICAgICAgICAgICAgdGhpcy5wMy55O1xuICAgIHJldHVybiBuZXcgUG9pbnQoeCwgeSk7XG4gIH1cblxuICBjb2xvckF0Q2VudHJvaWQoaW1hZ2VEYXRhKSB7XG4gICAgcmV0dXJuIHRoaXMuY2VudHJvaWQoKS5jYW52YXNDb2xvckF0UG9pbnQoaW1hZ2VEYXRhKTtcbiAgfVxuXG4gIHJlc2V0UG9pbnRDb2xvcnMoKSB7XG4gICAgdGhpcy5jZW50cm9pZCgpLnJlc2V0Q29sb3IoKTtcbiAgICB0aGlzLnAxLnJlc2V0Q29sb3IoKTtcbiAgICB0aGlzLnAyLnJlc2V0Q29sb3IoKTtcbiAgICB0aGlzLnAzLnJlc2V0Q29sb3IoKTtcbiAgfVxuXG4gIGNlbnRyb2lkKCkge1xuICAgIC8vIG9ubHkgY2FsYyB0aGUgY2VudHJvaWQgaWYgd2UgZG9udCBhbHJlYWR5IGtub3cgaXRcbiAgICBpZiAodGhpcy5fY2VudHJvaWQpIHtcbiAgICAgIHJldHVybiB0aGlzLl9jZW50cm9pZDtcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIHggPSBNYXRoLnJvdW5kKCh0aGlzLnAxLnggKyB0aGlzLnAyLnggKyB0aGlzLnAzLngpIC8gMyk7XG4gICAgICB2YXIgeSA9IE1hdGgucm91bmQoKHRoaXMucDEueSArIHRoaXMucDIueSArIHRoaXMucDMueSkgLyAzKTtcbiAgICAgIHRoaXMuX2NlbnRyb2lkID0gbmV3IFBvaW50KHgsIHkpO1xuXG4gICAgICByZXR1cm4gdGhpcy5fY2VudHJvaWQ7XG4gICAgfVxuICB9XG5cbiAgLy8gaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy8xMzMwMDkwNC9kZXRlcm1pbmUtd2hldGhlci1wb2ludC1saWVzLWluc2lkZS10cmlhbmdsZVxuICBwb2ludEluVHJpYW5nbGUocG9pbnQpIHtcbiAgICB2YXIgYWxwaGEgPSAoKHRoaXMucDIueSAtIHRoaXMucDMueSkgKiAocG9pbnQueCAtIHRoaXMucDMueCkgKyAodGhpcy5wMy54IC0gdGhpcy5wMi54KSAqIChwb2ludC55IC0gdGhpcy5wMy55KSkgL1xuICAgICAgICAgICAgICAoKHRoaXMucDIueSAtIHRoaXMucDMueSkgKiAodGhpcy5wMS54IC0gdGhpcy5wMy54KSArICh0aGlzLnAzLnggLSB0aGlzLnAyLngpICogKHRoaXMucDEueSAtIHRoaXMucDMueSkpO1xuICAgIHZhciBiZXRhID0gKCh0aGlzLnAzLnkgLSB0aGlzLnAxLnkpICogKHBvaW50LnggLSB0aGlzLnAzLngpICsgKHRoaXMucDEueCAtIHRoaXMucDMueCkgKiAocG9pbnQueSAtIHRoaXMucDMueSkpIC9cbiAgICAgICAgICAgICAoKHRoaXMucDIueSAtIHRoaXMucDMueSkgKiAodGhpcy5wMS54IC0gdGhpcy5wMy54KSArICh0aGlzLnAzLnggLSB0aGlzLnAyLngpICogKHRoaXMucDEueSAtIHRoaXMucDMueSkpO1xuICAgIHZhciBnYW1tYSA9IDEuMCAtIGFscGhhIC0gYmV0YTtcblxuICAgIHJldHVybiAoYWxwaGEgPiAwICYmIGJldGEgPiAwICYmIGdhbW1hID4gMCk7XG4gIH1cblxuICAvLyBzY2FsZSBwb2ludHMgZnJvbSBbQSwgQl0gdG8gW0MsIERdXG4gIC8vIHhBID0+IG9sZCB4IG1pbiwgeEIgPT4gb2xkIHggbWF4XG4gIC8vIHlBID0+IG9sZCB5IG1pbiwgeUIgPT4gb2xkIHkgbWF4XG4gIC8vIHhDID0+IG5ldyB4IG1pbiwgeEQgPT4gbmV3IHggbWF4XG4gIC8vIHlDID0+IG5ldyB5IG1pbiwgeUQgPT4gbmV3IHkgbWF4XG4gIHJlc2NhbGVQb2ludHMoeEEsIHhCLCB5QSwgeUIsIHhDLCB4RCwgeUMsIHlEKSB7XG4gICAgdGhpcy5wMS5yZXNjYWxlKHhBLCB4QiwgeUEsIHlCLCB4QywgeEQsIHlDLCB5RCk7XG4gICAgdGhpcy5wMi5yZXNjYWxlKHhBLCB4QiwgeUEsIHlCLCB4QywgeEQsIHlDLCB5RCk7XG4gICAgdGhpcy5wMy5yZXNjYWxlKHhBLCB4QiwgeUEsIHlCLCB4QywgeEQsIHlDLCB5RCk7XG4gICAgLy8gcmVjYWxjdWxhdGUgdGhlIGNlbnRyb2lkXG4gICAgdGhpcy5jZW50cm9pZCgpO1xuICB9XG5cbiAgbWF4WCgpIHtcbiAgICByZXR1cm4gTWF0aC5tYXgodGhpcy5wMS54LCB0aGlzLnAyLngsIHRoaXMucDMueCk7XG4gIH1cblxuICBtYXhZKCkge1xuICAgIHJldHVybiBNYXRoLm1heCh0aGlzLnAxLnksIHRoaXMucDIueSwgdGhpcy5wMy55KTtcbiAgfVxuXG4gIG1pblgoKSB7XG4gICAgcmV0dXJuIE1hdGgubWluKHRoaXMucDEueCwgdGhpcy5wMi54LCB0aGlzLnAzLngpO1xuICB9XG5cbiAgbWluWSgpIHtcbiAgICByZXR1cm4gTWF0aC5taW4odGhpcy5wMS55LCB0aGlzLnAyLnksIHRoaXMucDMueSk7XG4gIH1cblxuICBnZXRQb2ludHMoKSB7XG4gICAgcmV0dXJuIFt0aGlzLnAxLCB0aGlzLnAyLCB0aGlzLnAzXTtcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFRyaWFuZ2xlO1xuIiwiY29uc3QgUHJldHR5RGVsYXVuYXkgID0gcmVxdWlyZSgnLi9QcmV0dHlEZWxhdW5heScpO1xuY29uc3QgQ29sb3IgID0gcmVxdWlyZSgnLi9QcmV0dHlEZWxhdW5heS9jb2xvcicpO1xuY29uc3QgUmFuZG9tID0gcmVxdWlyZSgnLi9QcmV0dHlEZWxhdW5heS9yYW5kb20nKTtcbmNvbnN0IENvb2tpZXMgPSByZXF1aXJlKCcuL2RlbW8vY29va2llcycpO1xuXG4vLyBncmFiIERPTSBlbGVtZW50c1xuY29uc3QgbWFpbiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdtYWluJyk7XG5jb25zdCBmb3JtID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2Zvcm0nKTtcbmNvbnN0IGNhbnZhcyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjYW52YXMnKTtcblxuY29uc3QgYnV0dG9uID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2J1dHRvbicpO1xuXG5jb25zdCBnZW5lcmF0ZUNvbG9yc0J1dHRvbiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdnZW5lcmF0ZUNvbG9ycycpO1xuY29uc3QgZ2VuZXJhdGVHcmFkaWVudEJ1dHRvbiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdnZW5lcmF0ZUdyYWRpZW50Jyk7XG5jb25zdCBnZW5lcmF0ZVRyaWFuZ2xlc0J1dHRvbiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdnZW5lcmF0ZVRyaWFuZ2xlcycpO1xuXG5jb25zdCB0b2dnbGVUcmlhbmdsZXNCdXR0b24gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgndG9nZ2xlVHJpYW5nbGVzJyk7XG5jb25zdCB0b2dnbGVQb2ludHNCdXR0b24gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgndG9nZ2xlUG9pbnRzJyk7XG5jb25zdCB0b2dnbGVDaXJjbGVzQnV0dG9uID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3RvZ2dsZUNpcmNsZXMnKTtcbmNvbnN0IHRvZ2dsZUNlbnRyb2lkc0J1dHRvbiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCd0b2dnbGVDZW50cm9pZHMnKTtcbmNvbnN0IHRvZ2dsZUVkZ2VzQnV0dG9uID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3RvZ2dsZUVkZ2VzJyk7XG5jb25zdCB0b2dnbGVIb3ZlckJ1dHRvbiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCd0b2dnbGVIb3ZlcicpO1xuY29uc3QgdG9nZ2xlQW5pbWF0aW9uQnV0dG9uID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3RvZ2dsZUFuaW1hdGlvbicpO1xuXG5jb25zdCBtdWx0aXBsaWVyUmFkaW8gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncG9pbnRHZW4xJyk7XG5jb25zdCBtdWx0aXBsaWVySW5wdXQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncG9pbnRzTXVsdGlwbGllcicpO1xuY29uc3QgbWF4SW5wdXQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbWF4UG9pbnRzJyk7XG5jb25zdCBtaW5JbnB1dCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdtaW5Qb2ludHMnKTtcbmNvbnN0IG1heEVkZ2VJbnB1dCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdtYXhFZGdlUG9pbnRzJyk7XG5jb25zdCBtaW5FZGdlSW5wdXQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbWluRWRnZVBvaW50cycpO1xuY29uc3QgbWF4R3JhZGllbnRJbnB1dCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdtYXhHcmFkaWVudHMnKTtcbmNvbnN0IG1pbkdyYWRpZW50SW5wdXQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbWluR3JhZGllbnRzJyk7XG5cbmNvbnN0IGltYWdlQmFja2dyb3VuZFVwbG9hZCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdpbWFnZUJhY2tncm91bmRVcGxvYWQnKTtcbmNvbnN0IGltYWdlQmFja2dyb3VuZElucHV0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2ltYWdlQmFja2dyb3VuZElucHV0Jyk7XG5cbmxldCBtaW5Qb2ludHMsIG1heFBvaW50cywgbWluRWRnZVBvaW50cywgbWF4RWRnZVBvaW50cywgbWluR3JhZGllbnRzLCBtYXhHcmFkaWVudHMsIG11bHRpcGxpZXIsIGNvbG9ycywgaW1hZ2U7XG5cbmxldCBzaG93VHJpYW5nbGVzLCBzaG93UG9pbnRzLCBzaG93Q2lyY2xlcywgc2hvd0NlbnRyb2lkcywgc2hvd0VkZ2VzLCBzaG93QW5pbWF0aW9uO1xuXG5jb25zdCBvcHRpb25zID0ge1xuICBvbkRhcmtCYWNrZ3JvdW5kOiBmdW5jdGlvbigpIHtcbiAgICBtYWluLmNsYXNzTmFtZSA9ICd0aGVtZS1saWdodCc7XG4gIH0sXG4gIG9uTGlnaHRCYWNrZ3JvdW5kOiBmdW5jdGlvbigpIHtcbiAgICBtYWluLmNsYXNzTmFtZSA9ICd0aGVtZS1kYXJrJztcbiAgfSxcbn07XG5cbmdldENvb2tpZXMoKTtcblxuLy8gaW5pdGlhbGl6ZSB0aGUgUHJldHR5RGVsYXVuYXkgb2JqZWN0XG4vLyBsZXQgcHJldHR5RGVsYXVuYXkgPSBuZXcgUHJldHR5RGVsYXVuYXkoY2FudmFzLCBvcHRpb25zKTtcblxuLy8gaW5pdGlhbCBnZW5lcmF0aW9uXG4vLyBydW5EZWxhdW5heSgpO1xuXG4vKipcbiAqIHV0aWwgZnVuY3Rpb25zXG4gKi9cblxuLy8gZ2V0IG9wdGlvbnMgYW5kIHJlLXJhbmRvbWl6ZVxuZnVuY3Rpb24gcnVuRGVsYXVuYXkoKSB7XG4gIGdldFJhbmRvbWl6ZU9wdGlvbnMoKTtcbiAgcHJldHR5RGVsYXVuYXkucmFuZG9taXplKG1pblBvaW50cywgbWF4UG9pbnRzLCBtaW5FZGdlUG9pbnRzLCBtYXhFZGdlUG9pbnRzLCBtaW5HcmFkaWVudHMsIG1heEdyYWRpZW50cywgbXVsdGlwbGllciwgY29sb3JzLCBpbWFnZSk7XG59XG5cbmZ1bmN0aW9uIGdldENvbG9ycygpIHtcbiAgdmFyIGNvbG9ycyA9IFtdO1xuXG4gIGlmIChkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY29sb3JUeXBlMScpLmNoZWNrZWQpIHtcbiAgICAvLyBnZW5lcmF0ZSByYW5kb20gY29sb3JzXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCAzOyBpKyspIHtcbiAgICAgIHZhciBjb2xvciA9IFJhbmRvbS5yYW5kb21Ic2xhKCk7XG4gICAgICBjb2xvcnMucHVzaChjb2xvcik7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIC8vIHVzZSB0aGUgb25lcyBpbiB0aGUgaW5wdXRzXG4gICAgY29sb3JzLnB1c2goQ29sb3IucmdiVG9Ic2xhKENvbG9yLmhleFRvUmdiYUFycmF5KGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjb2xvcjEnKS52YWx1ZSkpKTtcbiAgICBjb2xvcnMucHVzaChDb2xvci5yZ2JUb0hzbGEoQ29sb3IuaGV4VG9SZ2JhQXJyYXkoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NvbG9yMicpLnZhbHVlKSkpO1xuICAgIGNvbG9ycy5wdXNoKENvbG9yLnJnYlRvSHNsYShDb2xvci5oZXhUb1JnYmFBcnJheShkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY29sb3IzJykudmFsdWUpKSk7XG4gIH1cblxuICByZXR1cm4gY29sb3JzO1xufVxuXG5mdW5jdGlvbiBnZXRJbWFnZSgpIHtcbiAgaWYgKCFkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY29sb3JUeXBlMycpLmNoZWNrZWQpIHtcbiAgICByZXR1cm4gJyc7XG4gIH1cblxuICBpZiAoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2ltYWdlQmFja2dyb3VuZDEnKS5jaGVja2VkICYmIGltYWdlQmFja2dyb3VuZFVwbG9hZC5maWxlcy5sZW5ndGgpIHtcbiAgICBsZXQgZmlsZSA9IGltYWdlQmFja2dyb3VuZFVwbG9hZC5maWxlc1swXTtcbiAgICByZXR1cm4gd2luZG93LlVSTC5jcmVhdGVPYmplY3RVUkwoZmlsZSk7XG4gIH0gZWxzZSBpZiAoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2ltYWdlQmFja2dyb3VuZDInKS5jaGVja2VkKSB7XG4gICAgcmV0dXJuIGltYWdlQmFja2dyb3VuZElucHV0LnZhbHVlO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiAnJztcbiAgfVxufVxuXG4vLyBnZXQgb3B0aW9ucyBmcm9tIGNvb2tpZXNcbmZ1bmN0aW9uIGdldENvb2tpZXMoKSB7XG4gIHZhciBkZWZhdWx0cyA9IFByZXR0eURlbGF1bmF5LmRlZmF1bHRzKCk7XG5cbiAgc2hvd1RyaWFuZ2xlcyA9IENvb2tpZXMuZ2V0SXRlbSgnRGVsYXVuYXlTaG93VHJpYW5nbGVzJyk7XG4gIHNob3dQb2ludHMgICAgPSBDb29raWVzLmdldEl0ZW0oJ0RlbGF1bmF5U2hvd1BvaW50cycpO1xuICBzaG93Q2lyY2xlcyAgID0gQ29va2llcy5nZXRJdGVtKCdEZWxhdW5heVNob3dDaXJjbGVzJyk7XG4gIHNob3dDZW50cm9pZHMgPSBDb29raWVzLmdldEl0ZW0oJ0RlbGF1bmF5U2hvd0NlbnRyb2lkcycpO1xuICBzaG93RWRnZXMgICAgID0gQ29va2llcy5nZXRJdGVtKCdEZWxhdW5heVNob3dFZGdlcycpO1xuICBzaG93QW5pbWF0aW9uID0gQ29va2llcy5nZXRJdGVtKCdEZWxhdW5heVNob3dBbmltYXRpb24nKTtcblxuICAvLyBUT0RPOiBEUllcbiAgLy8gb25seSBzZXQgb3B0aW9uIGZyb20gY29va2llIGlmIGl0IGV4aXN0cywgcGFyc2UgdG8gYm9vbGVhblxuICBpZiAoc2hvd1RyaWFuZ2xlcykge1xuICAgIG9wdGlvbnMuc2hvd1RyaWFuZ2xlcyA9IHNob3dUcmlhbmdsZXMgPSBzaG93VHJpYW5nbGVzID09PSAndHJ1ZScgPyB0cnVlIDogZmFsc2U7XG4gIH0gZWxzZSB7XG4gICAgLy8gc2F2ZSBvcHRpb24gc3RhdGUgZm9yIHNldHRpbmcgY29va2llIGxhdGVyXG4gICAgc2hvd1RyaWFuZ2xlcyA9IGRlZmF1bHRzLnNob3dUcmlhbmdsZXM7XG4gIH1cblxuICBpZiAoc2hvd1BvaW50cykge1xuICAgIG9wdGlvbnMuc2hvd1BvaW50cyA9IHNob3dQb2ludHMgPSBzaG93UG9pbnRzID09PSAndHJ1ZScgPyB0cnVlIDogZmFsc2U7XG4gIH0gZWxzZSB7XG4gICAgc2hvd1BvaW50cyA9IGRlZmF1bHRzLnNob3dQb2ludHM7XG4gIH1cblxuICBpZiAoc2hvd0NpcmNsZXMpIHtcbiAgICBvcHRpb25zLnNob3dDaXJjbGVzID0gc2hvd0NpcmNsZXMgPSBzaG93Q2lyY2xlcyA9PT0gJ3RydWUnID8gdHJ1ZSA6IGZhbHNlO1xuICB9IGVsc2Uge1xuICAgIHNob3dDaXJjbGVzID0gZGVmYXVsdHMuc2hvd0NpcmNsZXM7XG4gIH1cblxuICBpZiAoc2hvd0NlbnRyb2lkcykge1xuICAgIG9wdGlvbnMuc2hvd0NlbnRyb2lkcyA9IHNob3dDZW50cm9pZHMgPSBzaG93Q2VudHJvaWRzID09PSAndHJ1ZScgPyB0cnVlIDogZmFsc2U7XG4gIH0gZWxzZSB7XG4gICAgc2hvd0NlbnRyb2lkcyA9IGRlZmF1bHRzLnNob3dDZW50cm9pZHM7XG4gIH1cblxuICBpZiAoc2hvd0VkZ2VzKSB7XG4gICAgb3B0aW9ucy5zaG93RWRnZXMgPSBzaG93RWRnZXMgPSBzaG93RWRnZXMgPT09ICd0cnVlJyA/IHRydWUgOiBmYWxzZTtcbiAgfSBlbHNlIHtcbiAgICBzaG93RWRnZXMgPSBkZWZhdWx0cy5zaG93RWRnZXM7XG4gIH1cblxuICBpZiAoc2hvd0FuaW1hdGlvbikge1xuICAgIG9wdGlvbnMuc2hvd0FuaW1hdGlvbiA9IHNob3dBbmltYXRpb24gPSBzaG93QW5pbWF0aW9uID09PSAndHJ1ZScgPyB0cnVlIDogZmFsc2U7XG4gIH0gZWxzZSB7XG4gICAgc2hvd0FuaW1hdGlvbiA9IGRlZmF1bHRzLnNob3dBbmltYXRpb247XG4gIH1cbn1cblxuLy8gZ2V0IG9wdGlvbnMgZnJvbSBpbnB1dCBmaWVsZHNcbmZ1bmN0aW9uIGdldFJhbmRvbWl6ZU9wdGlvbnMoKSB7XG4gIHZhciB1c2VNdWx0aXBsaWVyID0gbXVsdGlwbGllclJhZGlvLmNoZWNrZWQ7XG4gIG11bHRpcGxpZXIgPSBwYXJzZUZsb2F0KG11bHRpcGxpZXJJbnB1dC52YWx1ZSk7XG4gIG1pblBvaW50cyA9IHVzZU11bHRpcGxpZXIgPyAwIDogcGFyc2VJbnQobWluSW5wdXQudmFsdWUpO1xuICBtYXhQb2ludHMgPSB1c2VNdWx0aXBsaWVyID8gMCA6IHBhcnNlSW50KG1heElucHV0LnZhbHVlKTtcbiAgbWluRWRnZVBvaW50cyA9IHVzZU11bHRpcGxpZXIgPyAwIDogcGFyc2VJbnQobWluRWRnZUlucHV0LnZhbHVlKTtcbiAgbWF4RWRnZVBvaW50cyA9IHVzZU11bHRpcGxpZXIgPyAwIDogcGFyc2VJbnQobWF4RWRnZUlucHV0LnZhbHVlKTtcbiAgbWluR3JhZGllbnRzID0gcGFyc2VJbnQobWluR3JhZGllbnRJbnB1dC52YWx1ZSk7XG4gIG1heEdyYWRpZW50cyA9IHBhcnNlSW50KG1heEdyYWRpZW50SW5wdXQudmFsdWUpO1xuICBjb2xvcnMgPSBnZXRDb2xvcnMoKTtcbiAgaW1hZ2UgPSBnZXRJbWFnZSgpO1xufVxuXG4vKipcbiAqIHNldCB1cCBldmVudHNcbiAqL1xuXG4vLyBjbGljayB0aGUgYnV0dG9uIHRvIHJlZ2VuXG5idXR0b24uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbigpIHtcbiAgcnVuRGVsYXVuYXkoKTtcbn0pO1xuXG4vLyBjbGljayB0aGUgYnV0dG9uIHRvIHJlZ2VuIGNvbG9ycyBvbmx5XG5nZW5lcmF0ZUNvbG9yc0J1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuICB2YXIgbmV3Q29sb3JzID0gZ2V0Q29sb3JzKCk7XG4gIHByZXR0eURlbGF1bmF5LnJlbmRlck5ld0NvbG9ycyhuZXdDb2xvcnMpO1xufSk7XG5cbi8vIGNsaWNrIHRoZSBidXR0b24gdG8gcmVnZW4gY29sb3JzIG9ubHlcbmdlbmVyYXRlR3JhZGllbnRCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbigpIHtcbiAgZ2V0UmFuZG9taXplT3B0aW9ucygpO1xuICBwcmV0dHlEZWxhdW5heS5yZW5kZXJOZXdHcmFkaWVudChtaW5HcmFkaWVudHMsIG1heEdyYWRpZW50cyk7XG59KTtcblxuLy8gY2xpY2sgdGhlIGJ1dHRvbiB0byByZWdlbiBjb2xvcnMgb25seVxuZ2VuZXJhdGVUcmlhbmdsZXNCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbigpIHtcbiAgZ2V0UmFuZG9taXplT3B0aW9ucygpO1xuICBwcmV0dHlEZWxhdW5heS5yZW5kZXJOZXdUcmlhbmdsZXMobWluUG9pbnRzLCBtYXhQb2ludHMsIG1pbkVkZ2VQb2ludHMsIG1heEVkZ2VQb2ludHMsIG11bHRpcGxpZXIpO1xufSk7XG5cbi8vIHR1cm4gVHJpYW5nbGVzIG9mZi9vblxudG9nZ2xlVHJpYW5nbGVzQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG4gIHNob3dUcmlhbmdsZXMgPSAhc2hvd1RyaWFuZ2xlcztcbiAgQ29va2llcy5zZXRJdGVtKCdEZWxhdW5heVNob3dUcmlhbmdsZXMnLCBzaG93VHJpYW5nbGVzKTtcbiAgcHJldHR5RGVsYXVuYXkudG9nZ2xlVHJpYW5nbGVzKCk7XG59KTtcblxuLy8gdHVybiBQb2ludHMgb2ZmL29uXG50b2dnbGVQb2ludHNCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbigpIHtcbiAgc2hvd1BvaW50cyA9ICFzaG93UG9pbnRzO1xuICBDb29raWVzLnNldEl0ZW0oJ0RlbGF1bmF5U2hvd1BvaW50cycsIHNob3dQb2ludHMpO1xuICBwcmV0dHlEZWxhdW5heS50b2dnbGVQb2ludHMoKTtcbn0pO1xuXG4vLyB0dXJuIENpcmNsZXMgb2ZmL29uXG50b2dnbGVDaXJjbGVzQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG4gIHNob3dDaXJjbGVzID0gIXNob3dDaXJjbGVzO1xuICBDb29raWVzLnNldEl0ZW0oJ0RlbGF1bmF5U2hvd0NpcmNsZXMnLCBzaG93Q2lyY2xlcyk7XG4gIHByZXR0eURlbGF1bmF5LnRvZ2dsZUNpcmNsZXMoKTtcbn0pO1xuXG4vLyB0dXJuIENlbnRyb2lkcyBvZmYvb25cbnRvZ2dsZUNlbnRyb2lkc0J1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuICBzaG93Q2VudHJvaWRzID0gIXNob3dDZW50cm9pZHM7XG4gIENvb2tpZXMuc2V0SXRlbSgnRGVsYXVuYXlTaG93Q2VudHJvaWRzJywgc2hvd0NlbnRyb2lkcyk7XG4gIHByZXR0eURlbGF1bmF5LnRvZ2dsZUNlbnRyb2lkcygpO1xufSk7XG5cbi8vIHR1cm4gRWRnZXMgb2ZmL29uXG50b2dnbGVFZGdlc0J1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuICBzaG93RWRnZXMgPSAhc2hvd0VkZ2VzO1xuICBDb29raWVzLnNldEl0ZW0oJ0RlbGF1bmF5U2hvd0VkZ2VzJywgc2hvd0VkZ2VzKTtcbiAgcHJldHR5RGVsYXVuYXkudG9nZ2xlRWRnZXMoKTtcbn0pO1xuXG4vLyB0dXJuIEFuaW1hdGlvbiBvZmYvb25cbnRvZ2dsZUFuaW1hdGlvbkJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuICBzaG93QW5pbWF0aW9uID0gIXNob3dBbmltYXRpb247XG4gIENvb2tpZXMuc2V0SXRlbSgnRGVsYXVuYXlTaG93QW5pbWF0aW9uJywgc2hvd0FuaW1hdGlvbik7XG4gIHByZXR0eURlbGF1bmF5LnRvZ2dsZUFuaW1hdGlvbigpO1xufSk7XG5cbi8vIGRvbnQgZG8gYW55dGhpbmcgb24gZm9ybSBzdWJtaXRcbmZvcm0uYWRkRXZlbnRMaXN0ZW5lcignc3VibWl0JywgZnVuY3Rpb24oZSkge1xuICBlLnByZXZlbnREZWZhdWx0KCk7XG4gIHJldHVybiBmYWxzZTtcbn0pO1xuIiwiXG5jb25zdCBDb29raWVzID0ge1xuICBnZXRJdGVtOiBmdW5jdGlvbihzS2V5KSB7XG4gICAgaWYgKCFzS2V5KSB7IHJldHVybiBudWxsOyB9XG4gICAgcmV0dXJuIGRlY29kZVVSSUNvbXBvbmVudChcbiAgICAgIGRvY3VtZW50LmNvb2tpZS5yZXBsYWNlKFxuICAgICAgICBuZXcgUmVnRXhwKFxuICAgICAgICAgICAgJyg/Oig/Ol58Lio7KVxcXFxzKicgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgK1xuICAgICAgICAgICAgZW5jb2RlVVJJQ29tcG9uZW50KHNLZXkpLnJlcGxhY2UoL1tcXC1cXC5cXCtcXCpdL2csICdcXFxcJCYnKSAgICtcbiAgICAgICAgICAgICdcXFxccypcXFxcPVxcXFxzKihbXjtdKikuKiQpfF4uKiQnKSwgJyQxJylcbiAgICAgICAgICApIHx8IG51bGw7XG4gIH0sXG5cbiAgc2V0SXRlbTogZnVuY3Rpb24oc0tleSwgc1ZhbHVlLCB2RW5kLCBzUGF0aCwgc0RvbWFpbiwgYlNlY3VyZSkge1xuICAgIGlmICghc0tleSB8fCAvXig/OmV4cGlyZXN8bWF4XFwtYWdlfHBhdGh8ZG9tYWlufHNlY3VyZSkkL2kudGVzdChzS2V5KSkgeyByZXR1cm4gZmFsc2U7IH1cbiAgICB2YXIgc0V4cGlyZXMgPSAnJztcbiAgICBpZiAodkVuZCkge1xuICAgICAgc3dpdGNoICh2RW5kLmNvbnN0cnVjdG9yKSB7XG4gICAgICAgIGNhc2UgTnVtYmVyOlxuICAgICAgICAgIHNFeHBpcmVzID0gdkVuZCA9PT0gSW5maW5pdHkgPyAnOyBleHBpcmVzPUZyaSwgMzEgRGVjIDk5OTkgMjM6NTk6NTkgR01UJyA6ICc7IG1heC1hZ2U9JyArIHZFbmQ7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgU3RyaW5nOlxuICAgICAgICAgIHNFeHBpcmVzID0gJzsgZXhwaXJlcz0nICsgdkVuZDtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBEYXRlOlxuICAgICAgICAgIHNFeHBpcmVzID0gJzsgZXhwaXJlcz0nICsgdkVuZC50b1VUQ1N0cmluZygpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cbiAgICBkb2N1bWVudC5jb29raWUgPSBlbmNvZGVVUklDb21wb25lbnQoc0tleSkgK1xuICAgICAgJz0nICtcbiAgICAgIGVuY29kZVVSSUNvbXBvbmVudChzVmFsdWUpICtcbiAgICAgIHNFeHBpcmVzICtcbiAgICAgIChzRG9tYWluID8gJzsgZG9tYWluPScgK1xuICAgICAgc0RvbWFpbiA6ICcnKSArXG4gICAgICAoc1BhdGggPyAnOyBwYXRoPScgK1xuICAgICAgc1BhdGggOiAnJykgK1xuICAgICAgKGJTZWN1cmUgPyAnOyBzZWN1cmUnIDogJycpO1xuICAgIHJldHVybiB0cnVlO1xuICB9LFxuXG4gIHJlbW92ZUl0ZW06IGZ1bmN0aW9uKHNLZXksIHNQYXRoLCBzRG9tYWluKSB7XG4gICAgaWYgKCF0aGlzLmhhc0l0ZW0oc0tleSkpIHsgcmV0dXJuIGZhbHNlOyB9XG4gICAgZG9jdW1lbnQuY29va2llID0gZW5jb2RlVVJJQ29tcG9uZW50KHNLZXkpICAgICtcbiAgICAgICc9OyBleHBpcmVzPVRodSwgMDEgSmFuIDE5NzAgMDA6MDA6MDAgR01UJyAgK1xuICAgICAgKHNEb21haW4gPyAnOyBkb21haW49JyArIHNEb21haW4gOiAnJykgICAgICArXG4gICAgICAoc1BhdGggICA/ICc7IHBhdGg9JyAgICsgc1BhdGggICA6ICcnKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSxcblxuICBoYXNJdGVtOiBmdW5jdGlvbihzS2V5KSB7XG4gICAgaWYgKCFzS2V5KSB7IHJldHVybiBmYWxzZTsgfVxuICAgIHJldHVybiAobmV3IFJlZ0V4cCgnKD86Xnw7XFxcXHMqKScgKyBlbmNvZGVVUklDb21wb25lbnQoc0tleSlcbiAgICAgIC5yZXBsYWNlKC9bXFwtXFwuXFwrXFwqXS9nLCAnXFxcXCQmJykgKyAnXFxcXHMqXFxcXD0nKSlcbiAgICAgIC50ZXN0KGRvY3VtZW50LmNvb2tpZSk7XG4gIH0sXG5cbiAga2V5czogZnVuY3Rpb24oKSB7XG4gICAgdmFyIGFLZXlzID0gZG9jdW1lbnQuY29va2llLnJlcGxhY2UoLygoPzpefFxccyo7KVteXFw9XSspKD89O3wkKXxeXFxzKnxcXHMqKD86XFw9W147XSopPyg/OlxcMXwkKS9nLCAnJylcbiAgICAgIC5zcGxpdCgvXFxzKig/OlxcPVteO10qKT87XFxzKi8pO1xuICAgIGZvciAodmFyIG5MZW4gPSBhS2V5cy5sZW5ndGgsIG5JZHggPSAwOyBuSWR4IDwgbkxlbjsgbklkeCsrKSB7IGFLZXlzW25JZHhdID0gZGVjb2RlVVJJQ29tcG9uZW50KGFLZXlzW25JZHhdKTsgfVxuICAgIHJldHVybiBhS2V5cztcbiAgfSxcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQ29va2llcztcbiJdfQ==
