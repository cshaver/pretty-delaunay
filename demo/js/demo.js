(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"/Users/cristina_shaver/Personal/pretty-delaunay/node_modules/delaunay-fast/delaunay.js":[function(require,module,exports){
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
       * vertices' x-position. Force stable sorting by comparing indices if
       * the x-positions are equal. */
      indices = new Array(n);

      for(i = n; i--; )
        indices[i] = i;

      indices.sort(function(i, j) {
        var diff = vertices[j][0] - vertices[i][0];
        return diff !== 0 ? diff : i - j;
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

},{}],"/Users/cristina_shaver/Personal/pretty-delaunay/src/PrettyDelaunay.js":[function(require,module,exports){
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
    this.mousemove = this.mousemove.bind(this);
    this.mouseout = this.mouseout.bind(this);

    if (this.options.hover) {
      this.initHover();
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
  }, {
    key: 'initHover',
    value: function initHover() {
      this.createHoverShadowCanvas();

      this.canvas.addEventListener('mousemove', this.mousemove, false);
      this.canvas.addEventListener('mouseout', this.mouseout, false);
    }
  }, {
    key: 'removeHover',
    value: function removeHover() {
      this.canvas.removeEventListener('mousemove', this.mousemove, false);
      this.canvas.removeEventListener('mouseout', this.mouseout, false);
    }

    // creates a hidden canvas for hover detection

  }, {
    key: 'createHoverShadowCanvas',
    value: function createHoverShadowCanvas() {
      this.hoverShadowCanvas = this.hoverShadowCanvas || document.createElement('canvas');
      this.shadowCtx = this.shadowCtx || this.hoverShadowCanvas.getContext('2d');

      this.hoverShadowCanvas.style.display = 'none';
    }
  }, {
    key: 'mousemove',
    value: function mousemove(event) {
      if (!this.options.animate) {
        var rect = canvas.getBoundingClientRect();
        this.mousePosition = new Point(event.clientX - rect.left, event.clientY - rect.top);
        this.hover();
      }
    }
  }, {
    key: 'mouseout',
    value: function mouseout(event) {
      if (!this.options.animate) {
        this.mousePosition = false;
        this.hover();
      }
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

      var lastColor = void 0;

      for (var i = 0; i < this.triangles.length; i++) {
        var triangle = this.triangles[i];
        // the color is determined by grabbing the color of the canvas
        // (where we drew the gradient) at the center of the triangle

        triangle.color = triangle.colorAtCentroid(this.gradientImageData);

        if (this.options.fillWithGradient && triangle.color) {
          var gradient = this.ctx.createLinearGradient(triangle.a.x, triangle.a.y, triangle.b.x, triangle.b.y);
          gradient.addColorStop(0, triangle.color);
          gradient.addColorStop(1, lastColor || triangle.color);
          lastColor = triangle.color;
          triangle.color = gradient;
        }

        if (triangles && edges) {
          triangle.stroke = this.options.edgeColor(triangle.colorAtCentroid(this.gradientImageData));
          triangle.render(this.ctx);
        } else if (triangles) {
          // triangles only
          triangle.stroke = triangle.color;
          triangle.render(this.ctx);
        } else if (edges) {
          // edges only
          triangle.stroke = this.options.edgeColor(triangle.colorAtCentroid(this.gradientImageData));
          triangle.render(this.ctx, false);
        }

        if (this.hoverShadowCanvas) {
          var color = '#' + ('000000' + i.toString(16)).slice(-6);
          triangle.render(this.shadowCtx, color);
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
    value: function toggleTriangles(force) {
      if (typeof force !== 'undefined') {
        if (this.options.showTriangles === force) {
          // don't render if the option doesn’t change
          return;
        }
        this.options.showTriangles = force;
      } else {
        this.options.showTriangles = !this.options.showTriangles;
      }
      this.render();
    }
  }, {
    key: 'togglePoints',
    value: function togglePoints(force) {
      if (typeof force !== 'undefined') {
        if (this.options.showPoints === force) {
          // don't render if the option doesn’t change
          return;
        }
        this.options.showPoints = force;
      } else {
        this.options.showPoints = !this.options.showPoints;
      }
      this.render();
    }
  }, {
    key: 'toggleCircles',
    value: function toggleCircles(force) {
      if (typeof force !== 'undefined') {
        if (this.options.showCircles === force) {
          // don't render if the option doesn’t change
          return;
        }
        this.options.showCircles = force;
      } else {
        this.options.showCircles = !this.options.showCircles;
      }
      this.render();
    }
  }, {
    key: 'toggleCentroids',
    value: function toggleCentroids(force) {
      if (typeof force !== 'undefined') {
        if (this.options.showCentroids === force) {
          // don't render if the option doesn’t change
          return;
        }
        this.options.showCentroids = force;
      } else {
        this.options.showCentroids = !this.options.showCentroids;
      }
      this.render();
    }
  }, {
    key: 'toggleEdges',
    value: function toggleEdges(force) {
      if (typeof force !== 'undefined') {
        if (this.options.showEdges === force) {
          // don't render if the option doesn’t change
          return;
        }
        this.options.showEdges = force;
      } else {
        this.options.showEdges = !this.options.showEdges;
      }
      this.render();
    }
  }, {
    key: 'toggleAnimation',
    value: function toggleAnimation(force) {
      if (typeof force !== 'undefined') {
        if (this.options.animate === force) {
          // don't render if the option doesn’t change
          return;
        }
        this.options.animate = force;
      } else {
        this.options.animate = !this.options.animate;
      }
      if (this.options.animate) {
        this.initRenderLoop();
      }
    }
  }, {
    key: 'toggleHover',
    value: function toggleHover(force) {
      if (typeof force !== 'undefined') {
        if (this.options.hover === force) {
          // don't render if the option doesn’t change
          return;
        }
        this.options.hover = force;
      } else {
        this.options.hover = !this.options.hover;
      }
      if (this.options.hover) {
        this.initHover();
      } else {
        this.removeHover();
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
        // fills triangles with gradient instead of solid colors (experimental)
        fillWithGradient: false,
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

},{"./PrettyDelaunay/color":"/Users/cristina_shaver/Personal/pretty-delaunay/src/PrettyDelaunay/color.js","./PrettyDelaunay/point":"/Users/cristina_shaver/Personal/pretty-delaunay/src/PrettyDelaunay/point.js","./PrettyDelaunay/pointMap":"/Users/cristina_shaver/Personal/pretty-delaunay/src/PrettyDelaunay/pointMap.js","./PrettyDelaunay/polyfills":"/Users/cristina_shaver/Personal/pretty-delaunay/src/PrettyDelaunay/polyfills.js","./PrettyDelaunay/random":"/Users/cristina_shaver/Personal/pretty-delaunay/src/PrettyDelaunay/random.js","./PrettyDelaunay/triangle":"/Users/cristina_shaver/Personal/pretty-delaunay/src/PrettyDelaunay/triangle.js","delaunay-fast":"/Users/cristina_shaver/Personal/pretty-delaunay/node_modules/delaunay-fast/delaunay.js"}],"/Users/cristina_shaver/Personal/pretty-delaunay/src/PrettyDelaunay/color.js":[function(require,module,exports){
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

    if (isNan(r) || isNan(g) || isNan(b)) {
      return [0, 0, 0];
    }

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
    if (typeof rgb === 'string') {
      rgb = rgb.replace('rgb(', '').replace(')', '').split(',');
    }
    if (!rgb.length) {
      rgb = [0, 0, 0];
    }
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

},{}],"/Users/cristina_shaver/Personal/pretty-delaunay/src/PrettyDelaunay/point.js":[function(require,module,exports){
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

},{"./color":"/Users/cristina_shaver/Personal/pretty-delaunay/src/PrettyDelaunay/color.js"}],"/Users/cristina_shaver/Personal/pretty-delaunay/src/PrettyDelaunay/pointMap.js":[function(require,module,exports){
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

},{"./point":"/Users/cristina_shaver/Personal/pretty-delaunay/src/PrettyDelaunay/point.js"}],"/Users/cristina_shaver/Personal/pretty-delaunay/src/PrettyDelaunay/polyfills.js":[function(require,module,exports){
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

},{}],"/Users/cristina_shaver/Personal/pretty-delaunay/src/PrettyDelaunay/random.js":[function(require,module,exports){
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

  randomRgb: function randomRgb() {
    return 'rgb(' + Random.randomBetween(255) + ',' + Random.randomBetween(255) + ',' + Random.randomBetween(255) + ')';
  },

  randomRgba: function randomRgba() {
    return 'rgba(' + Random.randomBetween(255) + ',' + Random.randomBetween(255) + ',' + Random.randomBetween(255) + ', 1)';
  },

  randomHsla: function randomHsla() {
    return 'hsla(' + Random.randomBetween(360) + ',' + Random.randomBetween(100) + '%,' + Random.randomBetween(100) + '%, 1)';
  }
};

module.exports = Random;

},{"./point":"/Users/cristina_shaver/Personal/pretty-delaunay/src/PrettyDelaunay/point.js"}],"/Users/cristina_shaver/Personal/pretty-delaunay/src/PrettyDelaunay/triangle.js":[function(require,module,exports){
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
      // var gradient = ctx.createLinearGradient(this.a.x, this.a.y, this.b.x, this.b.y);
      // gradient.addColorStop(0, color || this.color);
      // gradient.addColorStop(1, 'white');
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

},{"./point":"/Users/cristina_shaver/Personal/pretty-delaunay/src/PrettyDelaunay/point.js"}],"/Users/cristina_shaver/Personal/pretty-delaunay/src/demo.js":[function(require,module,exports){
'use strict';

var PrettyDelaunay = require('./PrettyDelaunay');
var Color = require('./PrettyDelaunay/color');
var Random = require('./PrettyDelaunay/random');

var elements = require('./demo/elements');

// initialize PrettyDelaunay on the canva
var prettyDelaunay = new PrettyDelaunay(elements.canvas, {
  onDarkBackground: function onDarkBackground() {
    elements.main.className = 'theme-light';
  },
  onLightBackground: function onLightBackground() {
    elements.main.className = 'theme-dark';
  }
});

// initial generation
randomize();

/**
 * util functions
 */

// get options and re-randomize
function randomize() {
  var options = getOptions();
  prettyDelaunay.randomize(options.minPoints, options.maxPoints, options.minEdgePoints, options.maxEdgePoints, options.minGradients, options.maxGradients, options.multiplier, options.colors, options.image);
}

// get options from input fields
function getOptions() {
  var useMultiplier = elements.multiplierRadio.checked;
  var options = {
    multiplier: parseFloat(elements.multiplierInput.value),
    minPoints: useMultiplier ? 0 : parseInt(elements.minPointsInput.value),
    maxPoints: useMultiplier ? 0 : parseInt(elements.maxPointsInput.value),
    minEdgePoints: useMultiplier ? 0 : parseInt(elements.minEdgesInput.value),
    maxEdgePoints: useMultiplier ? 0 : parseInt(elements.maxEdgesInput.value),
    minGradients: parseInt(elements.minGradientsInput.value),
    maxGradients: parseInt(elements.maxGradientsInput.value),
    colors: getColors(),
    image: getImage()
  };

  return options;
}

function getColors() {
  var colors = [];

  if (elements.colorChooseOption.checked) {
    // use the ones in the inputs
    colors = elements.colorInputs.map(function (input) {
      Color.rgbToHsla(Color.hexToRgbaArray(input.value));
    });
  } else {
    // generate random colors
    colors = elements.colorInputs.map(function (input) {
      var rgb = Random.randomRgba().replace('rgba', 'rgb').replace(/,\s*\d(\.\d+)?\)/, ')');
      var hsla = Color.rgbToHsla(rgb);
      var hex = '#' + Color.rgbToHex(rgb);

      input.value = hex;
      var matchingInput = document.getElementById(input.getAttribute('data-color-sync'));

      if (matchingInput) {
        matchingInput.value = input.value;
      }

      return hsla;
    });
  }

  return colors;
}

function getImage() {
  if (!elements.colorImageOption.checked) {
    return '';
  }

  if (elements.imageBackgroundUploadOption.checked && elements.imageBackgroundUpload.files.length) {
    var file = elements.imageBackgroundUpload.files[0];
    return window.URL.createObjectURL(file);
  } else if (imageBackgroundURLOption.checked) {
    return elements.imageBackgroundURL.value;
  } else {
    return '';
  }
}

/**
 * set up events
 */

// regenerate the triangulation entirely, or only update the color, shape, or triangles
elements.sections.generateButtons.addEventListener('click', function (event) {
  var button = event.target;

  if (button.hasAttribute('data-generate-colors') && button.hasAttribute('data-generate-gradients') && button.hasAttribute('data-generate-triangles')) {
    randomize();
    return;
  }

  if (button.hasAttribute('data-generate-colors')) {
    prettyDelaunay.renderNewColors(getColors());
  }

  if (button.hasAttribute('data-generate-gradients')) {
    var options = getOptions();
    prettyDelaunay.renderNewGradient(options.minGradients, options.maxGradients);
  }

  if (button.hasAttribute('data-generate-triangles')) {
    var _options = getOptions();
    prettyDelaunay.renderNewTriangles(_options.minPoints, _options.maxPoints, _options.minEdgePoints, _options.maxEdgePoints, _options.multiplier);
  }
});

// update the render when options are changed
elements.sections.renderOptions.addEventListener('change', function (event) {
  var options = Object.keys(elements.renderOptions);
  for (var i = 0; i < options.length; i++) {
    var option = options[i];
    var element = elements.renderOptions[option];
    var toggleFunctionName = option.replace('show', 'toggle');
    if (prettyDelaunay[toggleFunctionName]) {
      prettyDelaunay[toggleFunctionName](element.checked);
    }
  }
});

elements.sections.colorInputs.addEventListener('change', function (event) {
  var input = event.target;
  var matchingInput = document.getElementById(event.target.getAttribute('data-color-sync'));

  if (!matchingInput) {
    return;
  }

  matchingInput.value = input.value;
});

// don't do anything on form submit
elements.form.addEventListener('submit', function (event) {
  event.preventDefault();
  return false;
});

},{"./PrettyDelaunay":"/Users/cristina_shaver/Personal/pretty-delaunay/src/PrettyDelaunay.js","./PrettyDelaunay/color":"/Users/cristina_shaver/Personal/pretty-delaunay/src/PrettyDelaunay/color.js","./PrettyDelaunay/random":"/Users/cristina_shaver/Personal/pretty-delaunay/src/PrettyDelaunay/random.js","./demo/elements":"/Users/cristina_shaver/Personal/pretty-delaunay/src/demo/elements.js"}],"/Users/cristina_shaver/Personal/pretty-delaunay/src/demo/elements.js":[function(require,module,exports){
'use strict';

// grab DOM elements
var elements = {
  main: document.getElementById('main'),
  form: document.getElementById('form'),
  canvas: document.getElementById('canvas'),
  sections: {
    generateButtons: document.getElementById('generate-buttons'),
    renderOptions: document.getElementById('render-options'),
    pointOptions: document.getElementById('point-options'),
    backgroundOptions: document.getElementById('background-options'),
    colorInputs: document.getElementById('color-inputs')
  },
  renderOptions: {
    showTriangles: document.getElementById('show-triangles'),
    showPoints: document.getElementById('show-points'),
    showCircles: document.getElementById('show-circles'),
    showCentroids: document.getElementById('show-centroids'),
    showEdges: document.getElementById('show-edges'),
    showHover: document.getElementById('show-hover'),
    showAnimation: document.getElementById('show-animation')
  },

  multiplierRadio: document.getElementById('point-gen-option-multiplier'),
  multiplierInput: document.getElementById('points-multiplier'),

  minPointsInput: document.getElementById('min-points'),
  maxPointsInput: document.getElementById('max-points'),

  minEdgesInput: document.getElementById('min-edge-points'),
  maxEdgesInput: document.getElementById('max-edge-points'),

  minGradientsInput: document.getElementById('min-gradients'),
  maxGradientsInput: document.getElementById('max-gradients'),

  imageBackgroundUploadOption: document.getElementById('image-background-upload-option'),
  imageBackgroundUpload: document.getElementById('image-background-upload'),
  imageBackgroundURLOption: document.getElementById('image-background-url-option'),
  imageBackgroundURL: document.getElementById('image-background-url'),

  colorRandomOption: document.getElementById('color-random-option'),
  colorChooseOption: document.getElementById('color-choose-option'),
  colorImageOption: document.getElementById('color-image-option'),

  colorInputs: [document.getElementById('color-1'), document.getElementById('color-2'), document.getElementById('color-3')]
};

module.exports = elements;

},{}]},{},["/Users/cristina_shaver/Personal/pretty-delaunay/src/demo.js"])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvZGVsYXVuYXktZmFzdC9kZWxhdW5heS5qcyIsInNyYy9QcmV0dHlEZWxhdW5heS5qcyIsInNyYy9QcmV0dHlEZWxhdW5heS9jb2xvci5qcyIsInNyYy9QcmV0dHlEZWxhdW5heS9wb2ludC5qcyIsInNyYy9QcmV0dHlEZWxhdW5heS9wb2ludE1hcC5qcyIsInNyYy9QcmV0dHlEZWxhdW5heS9wb2x5ZmlsbHMuanMiLCJzcmMvUHJldHR5RGVsYXVuYXkvcmFuZG9tLmpzIiwic3JjL1ByZXR0eURlbGF1bmF5L3RyaWFuZ2xlLmpzIiwic3JjL2RlbW8uanMiLCJzcmMvZGVtby9lbGVtZW50cy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7Ozs7QUM1T0EsSUFBTSxXQUFXLFFBQVEsZUFBUixDQUFqQjtBQUNBLElBQU0sUUFBUSxRQUFRLHdCQUFSLENBQWQ7QUFDQSxJQUFNLFNBQVMsUUFBUSx5QkFBUixDQUFmO0FBQ0EsSUFBTSxXQUFXLFFBQVEsMkJBQVIsQ0FBakI7QUFDQSxJQUFNLFFBQVEsUUFBUSx3QkFBUixDQUFkO0FBQ0EsSUFBTSxXQUFXLFFBQVEsMkJBQVIsQ0FBakI7O0FBRUEsUUFBUSw0QkFBUjs7QUFFQTs7Ozs7SUFJTSxj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QW9DZixzQkFBb0IsU0FBUyxjQUFULENBQXdCLHNCQUF4QixDQXBDTDs7QUFzQ2YscUJBQW1CLFNBQVMsY0FBVCxDQUF3QixxQkFBeEIsQ0F0Q0o7QUF1Q2YscUJBQW1CLFNBQVMsY0FBVCxDQUF3QixxQkFBeEIsQ0F2Q0o7QUF3Q2Ysb0JBQWtCLFNBQVMsY0FBVCxDQUF3QixvQkFBeEIsQ0F4Q0g7O0FBMENmLGVBQWEsQ0FDWCxTQUFTLGNBQVQsQ0FBd0IsU0FBeEIsQ0FEVyxFQUVYLFNBQVMsY0FBVCxDQUF3QixTQUF4QixDQUZXLEVBR1gsU0FBUyxjQUFULENBQXdCLFNBQXhCLENBSFc7QUExQ0UsQ0FBakI7O0FBaURBLE9BQU8sT0FBUCxHQUFpQixRQUFqQiIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgRGVsYXVuYXk7XG5cbihmdW5jdGlvbigpIHtcbiAgXCJ1c2Ugc3RyaWN0XCI7XG5cbiAgdmFyIEVQU0lMT04gPSAxLjAgLyAxMDQ4NTc2LjA7XG5cbiAgZnVuY3Rpb24gc3VwZXJ0cmlhbmdsZSh2ZXJ0aWNlcykge1xuICAgIHZhciB4bWluID0gTnVtYmVyLlBPU0lUSVZFX0lORklOSVRZLFxuICAgICAgICB5bWluID0gTnVtYmVyLlBPU0lUSVZFX0lORklOSVRZLFxuICAgICAgICB4bWF4ID0gTnVtYmVyLk5FR0FUSVZFX0lORklOSVRZLFxuICAgICAgICB5bWF4ID0gTnVtYmVyLk5FR0FUSVZFX0lORklOSVRZLFxuICAgICAgICBpLCBkeCwgZHksIGRtYXgsIHhtaWQsIHltaWQ7XG5cbiAgICBmb3IoaSA9IHZlcnRpY2VzLmxlbmd0aDsgaS0tOyApIHtcbiAgICAgIGlmKHZlcnRpY2VzW2ldWzBdIDwgeG1pbikgeG1pbiA9IHZlcnRpY2VzW2ldWzBdO1xuICAgICAgaWYodmVydGljZXNbaV1bMF0gPiB4bWF4KSB4bWF4ID0gdmVydGljZXNbaV1bMF07XG4gICAgICBpZih2ZXJ0aWNlc1tpXVsxXSA8IHltaW4pIHltaW4gPSB2ZXJ0aWNlc1tpXVsxXTtcbiAgICAgIGlmKHZlcnRpY2VzW2ldWzFdID4geW1heCkgeW1heCA9IHZlcnRpY2VzW2ldWzFdO1xuICAgIH1cblxuICAgIGR4ID0geG1heCAtIHhtaW47XG4gICAgZHkgPSB5bWF4IC0geW1pbjtcbiAgICBkbWF4ID0gTWF0aC5tYXgoZHgsIGR5KTtcbiAgICB4bWlkID0geG1pbiArIGR4ICogMC41O1xuICAgIHltaWQgPSB5bWluICsgZHkgKiAwLjU7XG5cbiAgICByZXR1cm4gW1xuICAgICAgW3htaWQgLSAyMCAqIGRtYXgsIHltaWQgLSAgICAgIGRtYXhdLFxuICAgICAgW3htaWQgICAgICAgICAgICAsIHltaWQgKyAyMCAqIGRtYXhdLFxuICAgICAgW3htaWQgKyAyMCAqIGRtYXgsIHltaWQgLSAgICAgIGRtYXhdXG4gICAgXTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNpcmN1bWNpcmNsZSh2ZXJ0aWNlcywgaSwgaiwgaykge1xuICAgIHZhciB4MSA9IHZlcnRpY2VzW2ldWzBdLFxuICAgICAgICB5MSA9IHZlcnRpY2VzW2ldWzFdLFxuICAgICAgICB4MiA9IHZlcnRpY2VzW2pdWzBdLFxuICAgICAgICB5MiA9IHZlcnRpY2VzW2pdWzFdLFxuICAgICAgICB4MyA9IHZlcnRpY2VzW2tdWzBdLFxuICAgICAgICB5MyA9IHZlcnRpY2VzW2tdWzFdLFxuICAgICAgICBmYWJzeTF5MiA9IE1hdGguYWJzKHkxIC0geTIpLFxuICAgICAgICBmYWJzeTJ5MyA9IE1hdGguYWJzKHkyIC0geTMpLFxuICAgICAgICB4YywgeWMsIG0xLCBtMiwgbXgxLCBteDIsIG15MSwgbXkyLCBkeCwgZHk7XG5cbiAgICAvKiBDaGVjayBmb3IgY29pbmNpZGVudCBwb2ludHMgKi9cbiAgICBpZihmYWJzeTF5MiA8IEVQU0lMT04gJiYgZmFic3kyeTMgPCBFUFNJTE9OKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRWVrISBDb2luY2lkZW50IHBvaW50cyFcIik7XG5cbiAgICBpZihmYWJzeTF5MiA8IEVQU0lMT04pIHtcbiAgICAgIG0yICA9IC0oKHgzIC0geDIpIC8gKHkzIC0geTIpKTtcbiAgICAgIG14MiA9ICh4MiArIHgzKSAvIDIuMDtcbiAgICAgIG15MiA9ICh5MiArIHkzKSAvIDIuMDtcbiAgICAgIHhjICA9ICh4MiArIHgxKSAvIDIuMDtcbiAgICAgIHljICA9IG0yICogKHhjIC0gbXgyKSArIG15MjtcbiAgICB9XG5cbiAgICBlbHNlIGlmKGZhYnN5MnkzIDwgRVBTSUxPTikge1xuICAgICAgbTEgID0gLSgoeDIgLSB4MSkgLyAoeTIgLSB5MSkpO1xuICAgICAgbXgxID0gKHgxICsgeDIpIC8gMi4wO1xuICAgICAgbXkxID0gKHkxICsgeTIpIC8gMi4wO1xuICAgICAgeGMgID0gKHgzICsgeDIpIC8gMi4wO1xuICAgICAgeWMgID0gbTEgKiAoeGMgLSBteDEpICsgbXkxO1xuICAgIH1cblxuICAgIGVsc2Uge1xuICAgICAgbTEgID0gLSgoeDIgLSB4MSkgLyAoeTIgLSB5MSkpO1xuICAgICAgbTIgID0gLSgoeDMgLSB4MikgLyAoeTMgLSB5MikpO1xuICAgICAgbXgxID0gKHgxICsgeDIpIC8gMi4wO1xuICAgICAgbXgyID0gKHgyICsgeDMpIC8gMi4wO1xuICAgICAgbXkxID0gKHkxICsgeTIpIC8gMi4wO1xuICAgICAgbXkyID0gKHkyICsgeTMpIC8gMi4wO1xuICAgICAgeGMgID0gKG0xICogbXgxIC0gbTIgKiBteDIgKyBteTIgLSBteTEpIC8gKG0xIC0gbTIpO1xuICAgICAgeWMgID0gKGZhYnN5MXkyID4gZmFic3kyeTMpID9cbiAgICAgICAgbTEgKiAoeGMgLSBteDEpICsgbXkxIDpcbiAgICAgICAgbTIgKiAoeGMgLSBteDIpICsgbXkyO1xuICAgIH1cblxuICAgIGR4ID0geDIgLSB4YztcbiAgICBkeSA9IHkyIC0geWM7XG4gICAgcmV0dXJuIHtpOiBpLCBqOiBqLCBrOiBrLCB4OiB4YywgeTogeWMsIHI6IGR4ICogZHggKyBkeSAqIGR5fTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGRlZHVwKGVkZ2VzKSB7XG4gICAgdmFyIGksIGosIGEsIGIsIG0sIG47XG5cbiAgICBmb3IoaiA9IGVkZ2VzLmxlbmd0aDsgajsgKSB7XG4gICAgICBiID0gZWRnZXNbLS1qXTtcbiAgICAgIGEgPSBlZGdlc1stLWpdO1xuXG4gICAgICBmb3IoaSA9IGo7IGk7ICkge1xuICAgICAgICBuID0gZWRnZXNbLS1pXTtcbiAgICAgICAgbSA9IGVkZ2VzWy0taV07XG5cbiAgICAgICAgaWYoKGEgPT09IG0gJiYgYiA9PT0gbikgfHwgKGEgPT09IG4gJiYgYiA9PT0gbSkpIHtcbiAgICAgICAgICBlZGdlcy5zcGxpY2UoaiwgMik7XG4gICAgICAgICAgZWRnZXMuc3BsaWNlKGksIDIpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgRGVsYXVuYXkgPSB7XG4gICAgdHJpYW5ndWxhdGU6IGZ1bmN0aW9uKHZlcnRpY2VzLCBrZXkpIHtcbiAgICAgIHZhciBuID0gdmVydGljZXMubGVuZ3RoLFxuICAgICAgICAgIGksIGosIGluZGljZXMsIHN0LCBvcGVuLCBjbG9zZWQsIGVkZ2VzLCBkeCwgZHksIGEsIGIsIGM7XG5cbiAgICAgIC8qIEJhaWwgaWYgdGhlcmUgYXJlbid0IGVub3VnaCB2ZXJ0aWNlcyB0byBmb3JtIGFueSB0cmlhbmdsZXMuICovXG4gICAgICBpZihuIDwgMylcbiAgICAgICAgcmV0dXJuIFtdO1xuXG4gICAgICAvKiBTbGljZSBvdXQgdGhlIGFjdHVhbCB2ZXJ0aWNlcyBmcm9tIHRoZSBwYXNzZWQgb2JqZWN0cy4gKER1cGxpY2F0ZSB0aGVcbiAgICAgICAqIGFycmF5IGV2ZW4gaWYgd2UgZG9uJ3QsIHRob3VnaCwgc2luY2Ugd2UgbmVlZCB0byBtYWtlIGEgc3VwZXJ0cmlhbmdsZVxuICAgICAgICogbGF0ZXIgb24hKSAqL1xuICAgICAgdmVydGljZXMgPSB2ZXJ0aWNlcy5zbGljZSgwKTtcblxuICAgICAgaWYoa2V5KVxuICAgICAgICBmb3IoaSA9IG47IGktLTsgKVxuICAgICAgICAgIHZlcnRpY2VzW2ldID0gdmVydGljZXNbaV1ba2V5XTtcblxuICAgICAgLyogTWFrZSBhbiBhcnJheSBvZiBpbmRpY2VzIGludG8gdGhlIHZlcnRleCBhcnJheSwgc29ydGVkIGJ5IHRoZVxuICAgICAgICogdmVydGljZXMnIHgtcG9zaXRpb24uIEZvcmNlIHN0YWJsZSBzb3J0aW5nIGJ5IGNvbXBhcmluZyBpbmRpY2VzIGlmXG4gICAgICAgKiB0aGUgeC1wb3NpdGlvbnMgYXJlIGVxdWFsLiAqL1xuICAgICAgaW5kaWNlcyA9IG5ldyBBcnJheShuKTtcblxuICAgICAgZm9yKGkgPSBuOyBpLS07IClcbiAgICAgICAgaW5kaWNlc1tpXSA9IGk7XG5cbiAgICAgIGluZGljZXMuc29ydChmdW5jdGlvbihpLCBqKSB7XG4gICAgICAgIHZhciBkaWZmID0gdmVydGljZXNbal1bMF0gLSB2ZXJ0aWNlc1tpXVswXTtcbiAgICAgICAgcmV0dXJuIGRpZmYgIT09IDAgPyBkaWZmIDogaSAtIGo7XG4gICAgICB9KTtcblxuICAgICAgLyogTmV4dCwgZmluZCB0aGUgdmVydGljZXMgb2YgdGhlIHN1cGVydHJpYW5nbGUgKHdoaWNoIGNvbnRhaW5zIGFsbCBvdGhlclxuICAgICAgICogdHJpYW5nbGVzKSwgYW5kIGFwcGVuZCB0aGVtIG9udG8gdGhlIGVuZCBvZiBhIChjb3B5IG9mKSB0aGUgdmVydGV4XG4gICAgICAgKiBhcnJheS4gKi9cbiAgICAgIHN0ID0gc3VwZXJ0cmlhbmdsZSh2ZXJ0aWNlcyk7XG4gICAgICB2ZXJ0aWNlcy5wdXNoKHN0WzBdLCBzdFsxXSwgc3RbMl0pO1xuICAgICAgXG4gICAgICAvKiBJbml0aWFsaXplIHRoZSBvcGVuIGxpc3QgKGNvbnRhaW5pbmcgdGhlIHN1cGVydHJpYW5nbGUgYW5kIG5vdGhpbmdcbiAgICAgICAqIGVsc2UpIGFuZCB0aGUgY2xvc2VkIGxpc3QgKHdoaWNoIGlzIGVtcHR5IHNpbmNlIHdlIGhhdm4ndCBwcm9jZXNzZWRcbiAgICAgICAqIGFueSB0cmlhbmdsZXMgeWV0KS4gKi9cbiAgICAgIG9wZW4gICA9IFtjaXJjdW1jaXJjbGUodmVydGljZXMsIG4gKyAwLCBuICsgMSwgbiArIDIpXTtcbiAgICAgIGNsb3NlZCA9IFtdO1xuICAgICAgZWRnZXMgID0gW107XG5cbiAgICAgIC8qIEluY3JlbWVudGFsbHkgYWRkIGVhY2ggdmVydGV4IHRvIHRoZSBtZXNoLiAqL1xuICAgICAgZm9yKGkgPSBpbmRpY2VzLmxlbmd0aDsgaS0tOyBlZGdlcy5sZW5ndGggPSAwKSB7XG4gICAgICAgIGMgPSBpbmRpY2VzW2ldO1xuXG4gICAgICAgIC8qIEZvciBlYWNoIG9wZW4gdHJpYW5nbGUsIGNoZWNrIHRvIHNlZSBpZiB0aGUgY3VycmVudCBwb2ludCBpc1xuICAgICAgICAgKiBpbnNpZGUgaXQncyBjaXJjdW1jaXJjbGUuIElmIGl0IGlzLCByZW1vdmUgdGhlIHRyaWFuZ2xlIGFuZCBhZGRcbiAgICAgICAgICogaXQncyBlZGdlcyB0byBhbiBlZGdlIGxpc3QuICovXG4gICAgICAgIGZvcihqID0gb3Blbi5sZW5ndGg7IGotLTsgKSB7XG4gICAgICAgICAgLyogSWYgdGhpcyBwb2ludCBpcyB0byB0aGUgcmlnaHQgb2YgdGhpcyB0cmlhbmdsZSdzIGNpcmN1bWNpcmNsZSxcbiAgICAgICAgICAgKiB0aGVuIHRoaXMgdHJpYW5nbGUgc2hvdWxkIG5ldmVyIGdldCBjaGVja2VkIGFnYWluLiBSZW1vdmUgaXRcbiAgICAgICAgICAgKiBmcm9tIHRoZSBvcGVuIGxpc3QsIGFkZCBpdCB0byB0aGUgY2xvc2VkIGxpc3QsIGFuZCBza2lwLiAqL1xuICAgICAgICAgIGR4ID0gdmVydGljZXNbY11bMF0gLSBvcGVuW2pdLng7XG4gICAgICAgICAgaWYoZHggPiAwLjAgJiYgZHggKiBkeCA+IG9wZW5bal0ucikge1xuICAgICAgICAgICAgY2xvc2VkLnB1c2gob3BlbltqXSk7XG4gICAgICAgICAgICBvcGVuLnNwbGljZShqLCAxKTtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIC8qIElmIHdlJ3JlIG91dHNpZGUgdGhlIGNpcmN1bWNpcmNsZSwgc2tpcCB0aGlzIHRyaWFuZ2xlLiAqL1xuICAgICAgICAgIGR5ID0gdmVydGljZXNbY11bMV0gLSBvcGVuW2pdLnk7XG4gICAgICAgICAgaWYoZHggKiBkeCArIGR5ICogZHkgLSBvcGVuW2pdLnIgPiBFUFNJTE9OKVxuICAgICAgICAgICAgY29udGludWU7XG5cbiAgICAgICAgICAvKiBSZW1vdmUgdGhlIHRyaWFuZ2xlIGFuZCBhZGQgaXQncyBlZGdlcyB0byB0aGUgZWRnZSBsaXN0LiAqL1xuICAgICAgICAgIGVkZ2VzLnB1c2goXG4gICAgICAgICAgICBvcGVuW2pdLmksIG9wZW5bal0uaixcbiAgICAgICAgICAgIG9wZW5bal0uaiwgb3BlbltqXS5rLFxuICAgICAgICAgICAgb3BlbltqXS5rLCBvcGVuW2pdLmlcbiAgICAgICAgICApO1xuICAgICAgICAgIG9wZW4uc3BsaWNlKGosIDEpO1xuICAgICAgICB9XG5cbiAgICAgICAgLyogUmVtb3ZlIGFueSBkb3VibGVkIGVkZ2VzLiAqL1xuICAgICAgICBkZWR1cChlZGdlcyk7XG5cbiAgICAgICAgLyogQWRkIGEgbmV3IHRyaWFuZ2xlIGZvciBlYWNoIGVkZ2UuICovXG4gICAgICAgIGZvcihqID0gZWRnZXMubGVuZ3RoOyBqOyApIHtcbiAgICAgICAgICBiID0gZWRnZXNbLS1qXTtcbiAgICAgICAgICBhID0gZWRnZXNbLS1qXTtcbiAgICAgICAgICBvcGVuLnB1c2goY2lyY3VtY2lyY2xlKHZlcnRpY2VzLCBhLCBiLCBjKSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLyogQ29weSBhbnkgcmVtYWluaW5nIG9wZW4gdHJpYW5nbGVzIHRvIHRoZSBjbG9zZWQgbGlzdCwgYW5kIHRoZW5cbiAgICAgICAqIHJlbW92ZSBhbnkgdHJpYW5nbGVzIHRoYXQgc2hhcmUgYSB2ZXJ0ZXggd2l0aCB0aGUgc3VwZXJ0cmlhbmdsZSxcbiAgICAgICAqIGJ1aWxkaW5nIGEgbGlzdCBvZiB0cmlwbGV0cyB0aGF0IHJlcHJlc2VudCB0cmlhbmdsZXMuICovXG4gICAgICBmb3IoaSA9IG9wZW4ubGVuZ3RoOyBpLS07IClcbiAgICAgICAgY2xvc2VkLnB1c2gob3BlbltpXSk7XG4gICAgICBvcGVuLmxlbmd0aCA9IDA7XG5cbiAgICAgIGZvcihpID0gY2xvc2VkLmxlbmd0aDsgaS0tOyApXG4gICAgICAgIGlmKGNsb3NlZFtpXS5pIDwgbiAmJiBjbG9zZWRbaV0uaiA8IG4gJiYgY2xvc2VkW2ldLmsgPCBuKVxuICAgICAgICAgIG9wZW4ucHVzaChjbG9zZWRbaV0uaSwgY2xvc2VkW2ldLmosIGNsb3NlZFtpXS5rKTtcblxuICAgICAgLyogWWF5LCB3ZSdyZSBkb25lISAqL1xuICAgICAgcmV0dXJuIG9wZW47XG4gICAgfSxcbiAgICBjb250YWluczogZnVuY3Rpb24odHJpLCBwKSB7XG4gICAgICAvKiBCb3VuZGluZyBib3ggdGVzdCBmaXJzdCwgZm9yIHF1aWNrIHJlamVjdGlvbnMuICovXG4gICAgICBpZigocFswXSA8IHRyaVswXVswXSAmJiBwWzBdIDwgdHJpWzFdWzBdICYmIHBbMF0gPCB0cmlbMl1bMF0pIHx8XG4gICAgICAgICAocFswXSA+IHRyaVswXVswXSAmJiBwWzBdID4gdHJpWzFdWzBdICYmIHBbMF0gPiB0cmlbMl1bMF0pIHx8XG4gICAgICAgICAocFsxXSA8IHRyaVswXVsxXSAmJiBwWzFdIDwgdHJpWzFdWzFdICYmIHBbMV0gPCB0cmlbMl1bMV0pIHx8XG4gICAgICAgICAocFsxXSA+IHRyaVswXVsxXSAmJiBwWzFdID4gdHJpWzFdWzFdICYmIHBbMV0gPiB0cmlbMl1bMV0pKVxuICAgICAgICByZXR1cm4gbnVsbDtcblxuICAgICAgdmFyIGEgPSB0cmlbMV1bMF0gLSB0cmlbMF1bMF0sXG4gICAgICAgICAgYiA9IHRyaVsyXVswXSAtIHRyaVswXVswXSxcbiAgICAgICAgICBjID0gdHJpWzFdWzFdIC0gdHJpWzBdWzFdLFxuICAgICAgICAgIGQgPSB0cmlbMl1bMV0gLSB0cmlbMF1bMV0sXG4gICAgICAgICAgaSA9IGEgKiBkIC0gYiAqIGM7XG5cbiAgICAgIC8qIERlZ2VuZXJhdGUgdHJpLiAqL1xuICAgICAgaWYoaSA9PT0gMC4wKVxuICAgICAgICByZXR1cm4gbnVsbDtcblxuICAgICAgdmFyIHUgPSAoZCAqIChwWzBdIC0gdHJpWzBdWzBdKSAtIGIgKiAocFsxXSAtIHRyaVswXVsxXSkpIC8gaSxcbiAgICAgICAgICB2ID0gKGEgKiAocFsxXSAtIHRyaVswXVsxXSkgLSBjICogKHBbMF0gLSB0cmlbMF1bMF0pKSAvIGk7XG5cbiAgICAgIC8qIElmIHdlJ3JlIG91dHNpZGUgdGhlIHRyaSwgZmFpbC4gKi9cbiAgICAgIGlmKHUgPCAwLjAgfHwgdiA8IDAuMCB8fCAodSArIHYpID4gMS4wKVxuICAgICAgICByZXR1cm4gbnVsbDtcblxuICAgICAgcmV0dXJuIFt1LCB2XTtcbiAgICB9XG4gIH07XG5cbiAgaWYodHlwZW9mIG1vZHVsZSAhPT0gXCJ1bmRlZmluZWRcIilcbiAgICBtb2R1bGUuZXhwb3J0cyA9IERlbGF1bmF5O1xufSkoKTtcbiIsImNvbnN0IERlbGF1bmF5ID0gcmVxdWlyZSgnZGVsYXVuYXktZmFzdCcpO1xuY29uc3QgQ29sb3IgPSByZXF1aXJlKCcuL1ByZXR0eURlbGF1bmF5L2NvbG9yJyk7XG5jb25zdCBSYW5kb20gPSByZXF1aXJlKCcuL1ByZXR0eURlbGF1bmF5L3JhbmRvbScpO1xuY29uc3QgVHJpYW5nbGUgPSByZXF1aXJlKCcuL1ByZXR0eURlbGF1bmF5L3RyaWFuZ2xlJyk7XG5jb25zdCBQb2ludCA9IHJlcXVpcmUoJy4vUHJldHR5RGVsYXVuYXkvcG9pbnQnKTtcbmNvbnN0IFBvaW50TWFwID0gcmVxdWlyZSgnLi9QcmV0dHlEZWxhdW5heS9wb2ludE1hcCcpO1xuXG5yZXF1aXJlKCcuL1ByZXR0eURlbGF1bmF5L3BvbHlmaWxscycpKCk7XG5cbi8qKlxuKiBSZXByZXNlbnRzIGEgZGVsYXVuZXkgdHJpYW5ndWxhdGlvbiBvZiByYW5kb20gcG9pbnRzXG4qIGh0dHBzOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0RlbGF1bmF5X3RyaWFuZ3VsYXRpb25cbiovXG5jbGFzcyBQcmV0dHlEZWxhdW5heSB7XG4gIC8qKlxuICAgKiBAY29uc3RydWN0b3JcbiAgICovXG4gIGNvbnN0cnVjdG9yKGNhbnZhcywgb3B0aW9ucykge1xuICAgIC8vIG1lcmdlIGdpdmVuIG9wdGlvbnMgd2l0aCBkZWZhdWx0c1xuICAgIGxldCBkZWZhdWx0cyA9IFByZXR0eURlbGF1bmF5LmRlZmF1bHRzKCk7XG4gICAgdGhpcy5vcHRpb25zID0gT2JqZWN0LmFzc2lnbih7fSwgUHJldHR5RGVsYXVuYXkuZGVmYXVsdHMoKSwgKG9wdGlvbnMgfHwge30pKTtcbiAgICB0aGlzLm9wdGlvbnMuZ3JhZGllbnQgPSBPYmplY3QuYXNzaWduKHt9LCBkZWZhdWx0cy5ncmFkaWVudCwgb3B0aW9ucy5ncmFkaWVudCB8fCB7fSk7XG5cbiAgICB0aGlzLmNhbnZhcyA9IGNhbnZhcztcbiAgICB0aGlzLmN0eCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuXG4gICAgdGhpcy5yZXNpemVDYW52YXMoKTtcbiAgICB0aGlzLnBvaW50cyA9IFtdO1xuICAgIHRoaXMuY29sb3JzID0gdGhpcy5vcHRpb25zLmNvbG9ycztcbiAgICB0aGlzLnBvaW50TWFwID0gbmV3IFBvaW50TWFwKCk7XG5cbiAgICB0aGlzLm1vdXNlUG9zaXRpb24gPSBmYWxzZTtcbiAgICB0aGlzLm1vdXNlbW92ZSA9IHRoaXMubW91c2Vtb3ZlLmJpbmQodGhpcyk7XG4gICAgdGhpcy5tb3VzZW91dCA9IHRoaXMubW91c2VvdXQuYmluZCh0aGlzKTtcblxuICAgIGlmICh0aGlzLm9wdGlvbnMuaG92ZXIpIHtcbiAgICAgIHRoaXMuaW5pdEhvdmVyKCk7XG4gICAgfVxuXG4gICAgLy8gdGhyb3R0bGVkIHdpbmRvdyByZXNpemVcbiAgICB0aGlzLnJlc2l6aW5nID0gZmFsc2U7XG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsICgpPT4ge1xuICAgICAgaWYgKHRoaXMucmVzaXppbmcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgdGhpcy5yZXNpemluZyA9IHRydWU7XG4gICAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4ge1xuICAgICAgICB0aGlzLnJlc2NhbGUoKTtcbiAgICAgICAgdGhpcy5yZXNpemluZyA9IGZhbHNlO1xuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICB0aGlzLnJhbmRvbWl6ZSgpO1xuICB9XG5cbiAgc3RhdGljIGRlZmF1bHRzKCkge1xuICAgIHJldHVybiB7XG4gICAgICAvLyBzaG93cyB0cmlhbmdsZXMgLSBmYWxzZSB3aWxsIHNob3cgdGhlIGdyYWRpZW50IGJlaGluZFxuICAgICAgc2hvd1RyaWFuZ2xlczogdHJ1ZSxcbiAgICAgIC8vIHNob3cgdGhlIHBvaW50cyB0aGF0IG1ha2UgdGhlIHRyaWFuZ3VsYXRpb25cbiAgICAgIHNob3dQb2ludHM6IGZhbHNlLFxuICAgICAgLy8gc2hvdyB0aGUgY2lyY2xlcyB0aGF0IGRlZmluZSB0aGUgZ3JhZGllbnQgbG9jYXRpb25zLCBzaXplc1xuICAgICAgc2hvd0NpcmNsZXM6IGZhbHNlLFxuICAgICAgLy8gc2hvdyB0cmlhbmdsZSBjZW50cm9pZHNcbiAgICAgIHNob3dDZW50cm9pZHM6IGZhbHNlLFxuICAgICAgLy8gc2hvdyB0cmlhbmdsZSBlZGdlc1xuICAgICAgc2hvd0VkZ2VzOiB0cnVlLFxuICAgICAgLy8gaGlnaGxpZ2h0IGhvdmVyZWQgdHJpYW5nbGVzXG4gICAgICBob3ZlcjogdHJ1ZSxcbiAgICAgIC8vIG11bHRpcGxpZXIgZm9yIHRoZSBudW1iZXIgb2YgcG9pbnRzIGdlbmVyYXRlZCBiYXNlZCBvbiBjYW52YXMgc2l6ZVxuICAgICAgbXVsdGlwbGllcjogMC41LFxuICAgICAgLy8gd2hldGhlciB0byBhbmltYXRlIHRoZSBncmFkaWVudHMgYmVoaW5kIHRoZSB0cmlhbmdsZXNcbiAgICAgIGFuaW1hdGU6IGZhbHNlLFxuICAgICAgLy8gZmlsbHMgdHJpYW5nbGVzIHdpdGggZ3JhZGllbnQgaW5zdGVhZCBvZiBzb2xpZCBjb2xvcnMgKGV4cGVyaW1lbnRhbClcbiAgICAgIGZpbGxXaXRoR3JhZGllbnQ6IGZhbHNlLFxuICAgICAgLy8gbnVtYmVyIG9mIGZyYW1lcyBwZXIgZ3JhZGllbnQgY29sb3IgY3ljbGVcbiAgICAgIGxvb3BGcmFtZXM6IDI1MCxcblxuICAgICAgLy8gY29sb3JzIHRvIHVzZSBpbiB0aGUgZ3JhZGllbnRcbiAgICAgIGNvbG9yczogWydoc2xhKDAsIDAlLCAxMDAlLCAxKScsICdoc2xhKDAsIDAlLCA1MCUsIDEpJywgJ2hzbGEoMCwgMCUsIDAlLCAxKSddLFxuXG4gICAgICAvLyByYW5kb21seSBjaG9vc2UgZnJvbSBjb2xvciBwYWxldHRlIG9uIHJhbmRvbWl6ZSBpZiBub3Qgc3VwcGxpZWQgY29sb3JzXG4gICAgICBjb2xvclBhbGV0dGU6IGZhbHNlLFxuXG4gICAgICAvLyB1c2UgaW1hZ2UgYXMgYmFja2dyb3VuZCBpbnN0ZWFkIG9mIGdyYWRpZW50XG4gICAgICBpbWFnZUFzQmFja2dyb3VuZDogZmFsc2UsXG5cbiAgICAgIC8vIGltYWdlIHRvIHVzZSBhcyBiYWNrZ3JvdW5kXG4gICAgICBpbWFnZVVSTDogJycsXG5cbiAgICAgIC8vIGhvdyB0byByZXNpemUgdGhlIHBvaW50c1xuICAgICAgcmVzaXplTW9kZTogJ3NjYWxlUG9pbnRzJyxcbiAgICAgIC8vICduZXdQb2ludHMnIC0gZ2VuZXJhdGVzIGEgbmV3IHNldCBvZiBwb2ludHMgZm9yIHRoZSBuZXcgc2l6ZVxuICAgICAgLy8gJ3NjYWxlUG9pbnRzJyAtIGxpbmVhcmx5IHNjYWxlcyBleGlzdGluZyBwb2ludHMgYW5kIHJlLXRyaWFuZ3VsYXRlc1xuXG4gICAgICAvLyBldmVudHMgdHJpZ2dlcmVkIHdoZW4gdGhlIGNlbnRlciBvZiB0aGUgYmFja2dyb3VuZFxuICAgICAgLy8gaXMgZ3JlYXRlciBvciBsZXNzIHRoYW4gNTAgbGlnaHRuZXNzIGluIGhzbGFcbiAgICAgIC8vIGludGVuZGVkIHRvIGFkanVzdCBzb21lIHRleHQgdGhhdCBpcyBvbiB0b3BcbiAgICAgIC8vIGNvbG9yIGlzIHRoZSBjb2xvciBvZiB0aGUgY2VudGVyIG9mIHRoZSBjYW52YXNcbiAgICAgIG9uRGFya0JhY2tncm91bmQ6IGZ1bmN0aW9uKCkgeyByZXR1cm47IH0sXG4gICAgICBvbkxpZ2h0QmFja2dyb3VuZDogZnVuY3Rpb24oKSB7IHJldHVybjsgfSxcblxuICAgIFx0Z3JhZGllbnQ6IHtcbiAgICBcdFx0bWluWDogKHdpZHRoLCBoZWlnaHQpID0+IE1hdGguY2VpbChNYXRoLnNxcnQod2lkdGgpKSxcbiAgICBcdFx0bWF4WDogKHdpZHRoLCBoZWlnaHQpID0+IE1hdGguY2VpbCh3aWR0aCAtIE1hdGguc3FydCh3aWR0aCkpLFxuICAgIFx0XHRtaW5ZOiAod2lkdGgsIGhlaWdodCkgPT4gTWF0aC5jZWlsKE1hdGguc3FydChoZWlnaHQpKSxcbiAgICBcdFx0bWF4WTogKHdpZHRoLCBoZWlnaHQpID0+IE1hdGguY2VpbChoZWlnaHQgLSBNYXRoLnNxcnQoaGVpZ2h0KSksXG4gICAgXHRcdG1pblJhZGl1czogKHdpZHRoLCBoZWlnaHQsIG51bUdyYWRpZW50cykgPT4gTWF0aC5jZWlsKE1hdGgubWF4KGhlaWdodCwgd2lkdGgpIC8gTWF0aC5tYXgoTWF0aC5zcXJ0KG51bUdyYWRpZW50cyksIDIpKSxcbiAgICBcdFx0bWF4UmFkaXVzOiAod2lkdGgsIGhlaWdodCwgbnVtR3JhZGllbnRzKSA9PiBNYXRoLmNlaWwoTWF0aC5tYXgoaGVpZ2h0LCB3aWR0aCkgLyBNYXRoLm1heChNYXRoLmxvZyhudW1HcmFkaWVudHMpLCAxKSksXG4gICAgICAgIGNvbm5lY3RlZDogdHJ1ZVxuICAgIFx0fSxcblxuICAgICAgbWluR3JhZGllbnRzOiAxLFxuICAgICAgbWF4R3JhZGllbnRzOiAyLFxuXG4gICAgICAvLyB0cmlnZ2VyZWQgd2hlbiBob3ZlcmVkIG92ZXIgdHJpYW5nbGVcbiAgICAgIG9uVHJpYW5nbGVIb3ZlcjogZnVuY3Rpb24odHJpYW5nbGUsIGN0eCwgb3B0aW9ucykge1xuICAgICAgICB2YXIgZmlsbCA9IG9wdGlvbnMuaG92ZXJDb2xvcih0cmlhbmdsZS5jb2xvcik7XG4gICAgICAgIHZhciBzdHJva2UgPSBmaWxsO1xuICAgICAgICB0cmlhbmdsZS5yZW5kZXIoY3R4LCBvcHRpb25zLnNob3dFZGdlcyA/IGZpbGwgOiBmYWxzZSwgb3B0aW9ucy5zaG93RWRnZXMgPyBmYWxzZSA6IHN0cm9rZSk7XG4gICAgICB9LFxuXG4gICAgICAvLyByZXR1cm5zIGhzbGEgY29sb3IgZm9yIHRyaWFuZ2xlIGVkZ2VcbiAgICAgIC8vIGFzIGEgZnVuY3Rpb24gb2YgdGhlIHRyaWFuZ2xlIGZpbGwgY29sb3JcbiAgICAgIGVkZ2VDb2xvcjogZnVuY3Rpb24oY29sb3IpIHtcbiAgICAgICAgY29sb3IgPSBDb2xvci5oc2xhQWRqdXN0TGlnaHRuZXNzKGNvbG9yLCBmdW5jdGlvbihsaWdodG5lc3MpIHtcbiAgICAgICAgICByZXR1cm4gKGxpZ2h0bmVzcyArIDIwMCAtIGxpZ2h0bmVzcyAqIDIpIC8gMztcbiAgICAgICAgfSk7XG4gICAgICAgIGNvbG9yID0gQ29sb3IuaHNsYUFkanVzdEFscGhhKGNvbG9yLCAwLjI1KTtcbiAgICAgICAgcmV0dXJuIGNvbG9yO1xuICAgICAgfSxcblxuICAgICAgLy8gcmV0dXJucyBoc2xhIGNvbG9yIGZvciB0cmlhbmdsZSBwb2ludFxuICAgICAgLy8gYXMgYSBmdW5jdGlvbiBvZiB0aGUgdHJpYW5nbGUgZmlsbCBjb2xvclxuICAgICAgcG9pbnRDb2xvcjogZnVuY3Rpb24oY29sb3IpIHtcbiAgICAgICAgY29sb3IgPSBDb2xvci5oc2xhQWRqdXN0TGlnaHRuZXNzKGNvbG9yLCBmdW5jdGlvbihsaWdodG5lc3MpIHtcbiAgICAgICAgICByZXR1cm4gKGxpZ2h0bmVzcyArIDIwMCAtIGxpZ2h0bmVzcyAqIDIpIC8gMztcbiAgICAgICAgfSk7XG4gICAgICAgIGNvbG9yID0gQ29sb3IuaHNsYUFkanVzdEFscGhhKGNvbG9yLCAxKTtcbiAgICAgICAgcmV0dXJuIGNvbG9yO1xuICAgICAgfSxcblxuICAgICAgLy8gcmV0dXJucyBoc2xhIGNvbG9yIGZvciB0cmlhbmdsZSBjZW50cm9pZFxuICAgICAgLy8gYXMgYSBmdW5jdGlvbiBvZiB0aGUgdHJpYW5nbGUgZmlsbCBjb2xvclxuICAgICAgY2VudHJvaWRDb2xvcjogZnVuY3Rpb24oY29sb3IpIHtcbiAgICAgICAgY29sb3IgPSBDb2xvci5oc2xhQWRqdXN0TGlnaHRuZXNzKGNvbG9yLCBmdW5jdGlvbihsaWdodG5lc3MpIHtcbiAgICAgICAgICByZXR1cm4gKGxpZ2h0bmVzcyArIDIwMCAtIGxpZ2h0bmVzcyAqIDIpIC8gMztcbiAgICAgICAgfSk7XG4gICAgICAgIGNvbG9yID0gQ29sb3IuaHNsYUFkanVzdEFscGhhKGNvbG9yLCAwLjI1KTtcbiAgICAgICAgcmV0dXJuIGNvbG9yO1xuICAgICAgfSxcblxuICAgICAgLy8gcmV0dXJucyBoc2xhIGNvbG9yIGZvciB0cmlhbmdsZSBob3ZlciBmaWxsXG4gICAgICAvLyBhcyBhIGZ1bmN0aW9uIG9mIHRoZSB0cmlhbmdsZSBmaWxsIGNvbG9yXG4gICAgICBob3ZlckNvbG9yOiBmdW5jdGlvbihjb2xvcikge1xuICAgICAgICBjb2xvciA9IENvbG9yLmhzbGFBZGp1c3RMaWdodG5lc3MoY29sb3IsIGZ1bmN0aW9uKGxpZ2h0bmVzcykge1xuICAgICAgICAgIHJldHVybiAxMDAgLSBsaWdodG5lc3M7XG4gICAgICAgIH0pO1xuICAgICAgICBjb2xvciA9IENvbG9yLmhzbGFBZGp1c3RBbHBoYShjb2xvciwgMC41KTtcbiAgICAgICAgcmV0dXJuIGNvbG9yO1xuICAgICAgfSxcbiAgICB9O1xuICB9XG5cbiAgY2xlYXIoKSB7XG4gICAgdGhpcy5wb2ludHMgPSBbXTtcbiAgICB0aGlzLnRyaWFuZ2xlcyA9IFtdO1xuICAgIHRoaXMucG9pbnRNYXAuY2xlYXIoKTtcbiAgICB0aGlzLmNlbnRlciA9IG5ldyBQb2ludCgwLCAwKTtcbiAgfVxuXG4gIC8vIGNsZWFyIGFuZCBjcmVhdGUgYSBmcmVzaCBzZXQgb2YgcmFuZG9tIHBvaW50c1xuICAvLyBhbGwgYXJncyBhcmUgb3B0aW9uYWxcbiAgcmFuZG9taXplKG1pbiwgbWF4LCBtaW5FZGdlLCBtYXhFZGdlLCBtaW5HcmFkaWVudHMsIG1heEdyYWRpZW50cywgbXVsdGlwbGllciwgY29sb3JzLCBpbWFnZVVSTCkge1xuICAgIC8vIGNvbG9ycyBwYXJhbSBpcyBvcHRpb25hbFxuICAgIHRoaXMuY29sb3JzID0gY29sb3JzID9cbiAgICAgICAgICAgICAgICAgICAgY29sb3JzIDpcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5vcHRpb25zLmNvbG9yUGFsZXR0ZSA/XG4gICAgICAgICAgICAgICAgICAgICAgdGhpcy5vcHRpb25zLmNvbG9yUGFsZXR0ZVtSYW5kb20ucmFuZG9tQmV0d2VlbigwLCB0aGlzLm9wdGlvbnMuY29sb3JQYWxldHRlLmxlbmd0aCAtIDEpXSA6XG4gICAgICAgICAgICAgICAgICAgICAgdGhpcy5jb2xvcnM7XG5cbiAgICB0aGlzLm9wdGlvbnMuaW1hZ2VVUkwgPSBpbWFnZVVSTCA/IGltYWdlVVJMIDogdGhpcy5vcHRpb25zLmltYWdlVVJMO1xuICAgIHRoaXMub3B0aW9ucy5pbWFnZUFzQmFja2dyb3VuZCA9ICEhdGhpcy5vcHRpb25zLmltYWdlVVJMO1xuXG4gICAgdGhpcy5vcHRpb25zLm1pbkdyYWRpZW50cyA9IG1pbkdyYWRpZW50cyB8fCB0aGlzLm9wdGlvbnMubWluR3JhZGllbnRzO1xuICAgIHRoaXMub3B0aW9ucy5tYXhHcmFkaWVudHMgPSBtYXhHcmFkaWVudHMgfHwgdGhpcy5vcHRpb25zLm1heEdyYWRpZW50cztcblxuICAgIHRoaXMucmVzaXplQ2FudmFzKCk7XG5cbiAgICB0aGlzLmdlbmVyYXRlTmV3UG9pbnRzKG1pbiwgbWF4LCBtaW5FZGdlLCBtYXhFZGdlLCBtdWx0aXBsaWVyKTtcblxuICAgIHRoaXMudHJpYW5ndWxhdGUoKTtcblxuICAgIGlmICghdGhpcy5vcHRpb25zLmltYWdlQXNCYWNrZ3JvdW5kKSB7XG4gICAgICB0aGlzLmdlbmVyYXRlR3JhZGllbnRzKCk7XG5cbiAgICAgIC8vIHByZXAgZm9yIGFuaW1hdGlvblxuICAgICAgdGhpcy5uZXh0R3JhZGllbnRzID0gdGhpcy5yYWRpYWxHcmFkaWVudHMuc2xpY2UoMCk7XG4gICAgICB0aGlzLmdlbmVyYXRlR3JhZGllbnRzKCk7XG4gICAgICB0aGlzLmN1cnJlbnRHcmFkaWVudHMgPSB0aGlzLnJhZGlhbEdyYWRpZW50cy5zbGljZSgwKTtcbiAgICB9XG5cbiAgICB0aGlzLnJlbmRlcigpO1xuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5hbmltYXRlICYmICF0aGlzLmxvb3BpbmcpIHtcbiAgICAgIHRoaXMuaW5pdFJlbmRlckxvb3AoKTtcbiAgICB9XG4gIH1cblxuICBpbml0UmVuZGVyTG9vcCgpIHtcbiAgICBpZiAodGhpcy5vcHRpb25zLmltYWdlQXNCYWNrZ3JvdW5kKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5sb29waW5nID0gdHJ1ZTtcbiAgICB0aGlzLmZyYW1lU3RlcHMgPSB0aGlzLm9wdGlvbnMubG9vcEZyYW1lcztcbiAgICB0aGlzLmZyYW1lID0gdGhpcy5mcmFtZSA/IHRoaXMuZnJhbWUgOiB0aGlzLmZyYW1lU3RlcHM7XG4gICAgdGhpcy5yZW5kZXJMb29wKCk7XG4gIH1cblxuICByZW5kZXJMb29wKCkge1xuICAgIHRoaXMuZnJhbWUrKztcblxuICAgIC8vIGN1cnJlbnQgPT4gbmV4dCwgbmV4dCA9PiBuZXdcbiAgICBpZiAodGhpcy5mcmFtZSA+IHRoaXMuZnJhbWVTdGVwcykge1xuICAgICAgdmFyIG5leHRHcmFkaWVudHMgPSB0aGlzLm5leHRHcmFkaWVudHMgPyB0aGlzLm5leHRHcmFkaWVudHMgOiB0aGlzLnJhZGlhbEdyYWRpZW50cztcbiAgICAgIHRoaXMuZ2VuZXJhdGVHcmFkaWVudHMoKTtcbiAgICAgIHRoaXMubmV4dEdyYWRpZW50cyA9IHRoaXMucmFkaWFsR3JhZGllbnRzO1xuICAgICAgdGhpcy5yYWRpYWxHcmFkaWVudHMgPSBuZXh0R3JhZGllbnRzLnNsaWNlKDApO1xuICAgICAgdGhpcy5jdXJyZW50R3JhZGllbnRzID0gbmV4dEdyYWRpZW50cy5zbGljZSgwKTtcblxuICAgICAgdGhpcy5mcmFtZSA9IDA7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIGZhbmN5IHN0ZXBzXG4gICAgICAvLyB7eDAsIHkwLCByMCwgeDEsIHkxLCByMSwgY29sb3JTdG9wfVxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBNYXRoLm1heCh0aGlzLnJhZGlhbEdyYWRpZW50cy5sZW5ndGgsIHRoaXMubmV4dEdyYWRpZW50cy5sZW5ndGgpOyBpKyspIHtcbiAgICAgICAgdmFyIGN1cnJlbnRHcmFkaWVudCA9IHRoaXMuY3VycmVudEdyYWRpZW50c1tpXTtcbiAgICAgICAgdmFyIG5leHRHcmFkaWVudCA9IHRoaXMubmV4dEdyYWRpZW50c1tpXTtcblxuICAgICAgICBpZiAodHlwZW9mIGN1cnJlbnRHcmFkaWVudCA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICB2YXIgbmV3R3JhZGllbnQgPSB7XG4gICAgICAgICAgICB4MDogbmV4dEdyYWRpZW50LngwLFxuICAgICAgICAgICAgeTA6IG5leHRHcmFkaWVudC55MCxcbiAgICAgICAgICAgIHIwOiAwLFxuICAgICAgICAgICAgeDE6IG5leHRHcmFkaWVudC54MSxcbiAgICAgICAgICAgIHkxOiBuZXh0R3JhZGllbnQueTEsXG4gICAgICAgICAgICByMTogMCxcbiAgICAgICAgICAgIGNvbG9yU3RvcDogbmV4dEdyYWRpZW50LmNvbG9yU3RvcCxcbiAgICAgICAgICB9O1xuICAgICAgICAgIGN1cnJlbnRHcmFkaWVudCA9IG5ld0dyYWRpZW50O1xuICAgICAgICAgIHRoaXMuY3VycmVudEdyYWRpZW50cy5wdXNoKG5ld0dyYWRpZW50KTtcbiAgICAgICAgICB0aGlzLnJhZGlhbEdyYWRpZW50cy5wdXNoKG5ld0dyYWRpZW50KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0eXBlb2YgbmV4dEdyYWRpZW50ID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgIG5leHRHcmFkaWVudCA9IHtcbiAgICAgICAgICAgIHgwOiBjdXJyZW50R3JhZGllbnQueDAsXG4gICAgICAgICAgICB5MDogY3VycmVudEdyYWRpZW50LnkwLFxuICAgICAgICAgICAgcjA6IDAsXG4gICAgICAgICAgICB4MTogY3VycmVudEdyYWRpZW50LngxLFxuICAgICAgICAgICAgeTE6IGN1cnJlbnRHcmFkaWVudC55MSxcbiAgICAgICAgICAgIHIxOiAwLFxuICAgICAgICAgICAgY29sb3JTdG9wOiBjdXJyZW50R3JhZGllbnQuY29sb3JTdG9wLFxuICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgdXBkYXRlZEdyYWRpZW50ID0ge307XG5cbiAgICAgICAgLy8gc2NhbGUgdGhlIGRpZmZlcmVuY2UgYmV0d2VlbiBjdXJyZW50IGFuZCBuZXh0IGdyYWRpZW50IGJhc2VkIG9uIHN0ZXAgaW4gZnJhbWVzXG4gICAgICAgIHZhciBzY2FsZSA9IHRoaXMuZnJhbWUgLyB0aGlzLmZyYW1lU3RlcHM7XG5cbiAgICAgICAgdXBkYXRlZEdyYWRpZW50LngwID0gTWF0aC5yb3VuZChsaW5lYXJTY2FsZShjdXJyZW50R3JhZGllbnQueDAsIG5leHRHcmFkaWVudC54MCwgc2NhbGUpKTtcbiAgICAgICAgdXBkYXRlZEdyYWRpZW50LnkwID0gTWF0aC5yb3VuZChsaW5lYXJTY2FsZShjdXJyZW50R3JhZGllbnQueTAsIG5leHRHcmFkaWVudC55MCwgc2NhbGUpKTtcbiAgICAgICAgdXBkYXRlZEdyYWRpZW50LnIwID0gTWF0aC5yb3VuZChsaW5lYXJTY2FsZShjdXJyZW50R3JhZGllbnQucjAsIG5leHRHcmFkaWVudC5yMCwgc2NhbGUpKTtcbiAgICAgICAgdXBkYXRlZEdyYWRpZW50LngxID0gTWF0aC5yb3VuZChsaW5lYXJTY2FsZShjdXJyZW50R3JhZGllbnQueDEsIG5leHRHcmFkaWVudC54MCwgc2NhbGUpKTtcbiAgICAgICAgdXBkYXRlZEdyYWRpZW50LnkxID0gTWF0aC5yb3VuZChsaW5lYXJTY2FsZShjdXJyZW50R3JhZGllbnQueTEsIG5leHRHcmFkaWVudC55MCwgc2NhbGUpKTtcbiAgICAgICAgdXBkYXRlZEdyYWRpZW50LnIxID0gTWF0aC5yb3VuZChsaW5lYXJTY2FsZShjdXJyZW50R3JhZGllbnQucjEsIG5leHRHcmFkaWVudC5yMSwgc2NhbGUpKTtcbiAgICAgICAgdXBkYXRlZEdyYWRpZW50LmNvbG9yU3RvcCA9IGxpbmVhclNjYWxlKGN1cnJlbnRHcmFkaWVudC5jb2xvclN0b3AsIG5leHRHcmFkaWVudC5jb2xvclN0b3AsIHNjYWxlKTtcblxuICAgICAgICB0aGlzLnJhZGlhbEdyYWRpZW50c1tpXSA9IHVwZGF0ZWRHcmFkaWVudDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLnJlc2V0UG9pbnRDb2xvcnMoKTtcbiAgICB0aGlzLnJlbmRlcigpO1xuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5hbmltYXRlKSB7XG4gICAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4ge1xuICAgICAgICB0aGlzLnJlbmRlckxvb3AoKTtcbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmxvb3BpbmcgPSBmYWxzZTtcbiAgICB9XG4gIH1cblxuICBpbml0SG92ZXIoKSB7XG4gICAgdGhpcy5jcmVhdGVIb3ZlclNoYWRvd0NhbnZhcygpO1xuXG4gICAgdGhpcy5jYW52YXMuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgdGhpcy5tb3VzZW1vdmUsIGZhbHNlKTtcbiAgICB0aGlzLmNhbnZhcy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZW91dCcsIHRoaXMubW91c2VvdXQsIGZhbHNlKTtcbiAgfVxuXG4gIHJlbW92ZUhvdmVyKCkge1xuICAgIHRoaXMuY2FudmFzLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21vdXNlbW92ZScsIHRoaXMubW91c2Vtb3ZlLCBmYWxzZSk7XG4gICAgdGhpcy5jYW52YXMucmVtb3ZlRXZlbnRMaXN0ZW5lcignbW91c2VvdXQnLCB0aGlzLm1vdXNlb3V0LCBmYWxzZSk7XG4gIH1cblxuICAvLyBjcmVhdGVzIGEgaGlkZGVuIGNhbnZhcyBmb3IgaG92ZXIgZGV0ZWN0aW9uXG4gIGNyZWF0ZUhvdmVyU2hhZG93Q2FudmFzKCkge1xuICAgIHRoaXMuaG92ZXJTaGFkb3dDYW52YXMgPSB0aGlzLmhvdmVyU2hhZG93Q2FudmFzIHx8IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpO1xuICAgIHRoaXMuc2hhZG93Q3R4ID0gdGhpcy5zaGFkb3dDdHggfHwgdGhpcy5ob3ZlclNoYWRvd0NhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuXG4gICAgdGhpcy5ob3ZlclNoYWRvd0NhbnZhcy5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuICB9XG5cbiAgbW91c2Vtb3ZlKGV2ZW50KSB7XG4gICAgaWYgKCF0aGlzLm9wdGlvbnMuYW5pbWF0ZSkge1xuICAgICAgdmFyIHJlY3QgPSBjYW52YXMuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgICB0aGlzLm1vdXNlUG9zaXRpb24gPSBuZXcgUG9pbnQoZXZlbnQuY2xpZW50WCAtIHJlY3QubGVmdCwgZXZlbnQuY2xpZW50WSAtIHJlY3QudG9wKTtcbiAgICAgIHRoaXMuaG92ZXIoKTtcbiAgICB9XG4gIH1cblxuICBtb3VzZW91dChldmVudCkge1xuICAgIGlmICghdGhpcy5vcHRpb25zLmFuaW1hdGUpIHtcbiAgICAgIHRoaXMubW91c2VQb3NpdGlvbiA9IGZhbHNlO1xuICAgICAgdGhpcy5ob3ZlcigpO1xuICAgIH1cbiAgfVxuXG4gIGdlbmVyYXRlTmV3UG9pbnRzKG1pbiwgbWF4LCBtaW5FZGdlLCBtYXhFZGdlLCBtdWx0aXBsaWVyKSB7XG4gICAgLy8gZGVmYXVsdHMgdG8gZ2VuZXJpYyBudW1iZXIgb2YgcG9pbnRzIGJhc2VkIG9uIGNhbnZhcyBkaW1lbnNpb25zXG4gICAgLy8gdGhpcyBnZW5lcmFsbHkgbG9va3MgcHJldHR5IG5pY2VcbiAgICB2YXIgYXJlYSA9IHRoaXMuY2FudmFzLndpZHRoICogdGhpcy5jYW52YXMuaGVpZ2h0O1xuICAgIHZhciBwZXJpbWV0ZXIgPSAodGhpcy5jYW52YXMud2lkdGggKyB0aGlzLmNhbnZhcy5oZWlnaHQpICogMjtcblxuICAgIG11bHRpcGxpZXIgPSBtdWx0aXBsaWVyIHx8IHRoaXMub3B0aW9ucy5tdWx0aXBsaWVyO1xuXG4gICAgbWluID0gbWluID4gMCA/IE1hdGguY2VpbChtaW4pIDogTWF0aC5tYXgoTWF0aC5jZWlsKChhcmVhIC8gMTI1MCkgKiBtdWx0aXBsaWVyKSwgNTApO1xuICAgIG1heCA9IG1heCA+IDAgPyBNYXRoLmNlaWwobWF4KSA6IE1hdGgubWF4KE1hdGguY2VpbCgoYXJlYSAvIDUwMCkgKiBtdWx0aXBsaWVyKSwgNTApO1xuXG4gICAgbWluRWRnZSA9IG1pbkVkZ2UgPiAwID8gTWF0aC5jZWlsKG1pbkVkZ2UpIDogTWF0aC5tYXgoTWF0aC5jZWlsKChwZXJpbWV0ZXIgLyAxMjUpICogbXVsdGlwbGllciksIDUpO1xuICAgIG1heEVkZ2UgPSBtYXhFZGdlID4gMCA/IE1hdGguY2VpbChtYXhFZGdlKSA6IE1hdGgubWF4KE1hdGguY2VpbCgocGVyaW1ldGVyIC8gNTApICogbXVsdGlwbGllciksIDUpO1xuXG4gICAgdGhpcy5udW1Qb2ludHMgPSBSYW5kb20ucmFuZG9tQmV0d2VlbihtaW4sIG1heCk7XG4gICAgdGhpcy5nZXROdW1FZGdlUG9pbnRzID0gUmFuZG9tLnJhbmRvbU51bWJlckZ1bmN0aW9uKG1pbkVkZ2UsIG1heEVkZ2UpO1xuXG4gICAgdGhpcy5jbGVhcigpO1xuXG4gICAgLy8gYWRkIGNvcm5lciBhbmQgZWRnZSBwb2ludHNcbiAgICB0aGlzLmdlbmVyYXRlQ29ybmVyUG9pbnRzKCk7XG4gICAgdGhpcy5nZW5lcmF0ZUVkZ2VQb2ludHMoKTtcblxuICAgIC8vIGFkZCBzb21lIHJhbmRvbSBwb2ludHMgaW4gdGhlIG1pZGRsZSBmaWVsZCxcbiAgICAvLyBleGNsdWRpbmcgZWRnZXMgYW5kIGNvcm5lcnNcbiAgICB0aGlzLmdlbmVyYXRlUmFuZG9tUG9pbnRzKHRoaXMubnVtUG9pbnRzLCAxLCAxLCB0aGlzLndpZHRoIC0gMSwgdGhpcy5oZWlnaHQgLSAxKTtcbiAgfVxuXG4gIC8vIGFkZCBwb2ludHMgaW4gdGhlIGNvcm5lcnNcbiAgZ2VuZXJhdGVDb3JuZXJQb2ludHMoKSB7XG4gICAgdGhpcy5wb2ludHMucHVzaChuZXcgUG9pbnQoMCwgMCkpO1xuICAgIHRoaXMucG9pbnRzLnB1c2gobmV3IFBvaW50KDAsIHRoaXMuaGVpZ2h0KSk7XG4gICAgdGhpcy5wb2ludHMucHVzaChuZXcgUG9pbnQodGhpcy53aWR0aCwgMCkpO1xuICAgIHRoaXMucG9pbnRzLnB1c2gobmV3IFBvaW50KHRoaXMud2lkdGgsIHRoaXMuaGVpZ2h0KSk7XG4gIH1cblxuICAvLyBhZGQgcG9pbnRzIG9uIHRoZSBlZGdlc1xuICBnZW5lcmF0ZUVkZ2VQb2ludHMoKSB7XG4gICAgLy8gbGVmdCBlZGdlXG4gICAgdGhpcy5nZW5lcmF0ZVJhbmRvbVBvaW50cyh0aGlzLmdldE51bUVkZ2VQb2ludHMoKSwgMCwgMCwgMCwgdGhpcy5oZWlnaHQpO1xuICAgIC8vIHJpZ2h0IGVkZ2VcbiAgICB0aGlzLmdlbmVyYXRlUmFuZG9tUG9pbnRzKHRoaXMuZ2V0TnVtRWRnZVBvaW50cygpLCB0aGlzLndpZHRoLCAwLCAwLCB0aGlzLmhlaWdodCk7XG4gICAgLy8gYm90dG9tIGVkZ2VcbiAgICB0aGlzLmdlbmVyYXRlUmFuZG9tUG9pbnRzKHRoaXMuZ2V0TnVtRWRnZVBvaW50cygpLCAwLCB0aGlzLmhlaWdodCwgdGhpcy53aWR0aCwgMCk7XG4gICAgLy8gdG9wIGVkZ2VcbiAgICB0aGlzLmdlbmVyYXRlUmFuZG9tUG9pbnRzKHRoaXMuZ2V0TnVtRWRnZVBvaW50cygpLCAwLCAwLCB0aGlzLndpZHRoLCAwKTtcbiAgfVxuXG4gIC8vIHJhbmRvbWx5IGdlbmVyYXRlIHNvbWUgcG9pbnRzLFxuICAvLyBzYXZlIHRoZSBwb2ludCBjbG9zZXN0IHRvIGNlbnRlclxuICBnZW5lcmF0ZVJhbmRvbVBvaW50cyhudW1Qb2ludHMsIHgsIHksIHdpZHRoLCBoZWlnaHQpIHtcbiAgICB2YXIgY2VudGVyID0gbmV3IFBvaW50KE1hdGgucm91bmQodGhpcy5jYW52YXMud2lkdGggLyAyKSwgTWF0aC5yb3VuZCh0aGlzLmNhbnZhcy5oZWlnaHQgLyAyKSk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBudW1Qb2ludHM7IGkrKykge1xuICAgICAgLy8gZ2VuZXJhdGUgYSBuZXcgcG9pbnQgd2l0aCByYW5kb20gY29vcmRzXG4gICAgICAvLyByZS1nZW5lcmF0ZSB0aGUgcG9pbnQgaWYgaXQgYWxyZWFkeSBleGlzdHMgaW4gcG9pbnRtYXAgKG1heCAxMCB0aW1lcylcbiAgICAgIHZhciBwb2ludDtcbiAgICAgIHZhciBqID0gMDtcbiAgICAgIGRvIHtcbiAgICAgICAgaisrO1xuICAgICAgICBwb2ludCA9IG5ldyBQb2ludChSYW5kb20ucmFuZG9tQmV0d2Vlbih4LCB4ICsgd2lkdGgpLCBSYW5kb20ucmFuZG9tQmV0d2Vlbih5LCB5ICsgaGVpZ2h0KSk7XG4gICAgICB9IHdoaWxlICh0aGlzLnBvaW50TWFwLmV4aXN0cyhwb2ludCkgJiYgaiA8IDEwKTtcblxuICAgICAgaWYgKGogPCAxMCkge1xuICAgICAgICB0aGlzLnBvaW50cy5wdXNoKHBvaW50KTtcbiAgICAgICAgdGhpcy5wb2ludE1hcC5hZGQocG9pbnQpO1xuICAgICAgfVxuXG4gICAgICBpZiAoY2VudGVyLmdldERpc3RhbmNlVG8ocG9pbnQpIDwgY2VudGVyLmdldERpc3RhbmNlVG8odGhpcy5jZW50ZXIpKSB7XG4gICAgICAgIHRoaXMuY2VudGVyID0gcG9pbnQ7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmNlbnRlci5pc0NlbnRlciA9IGZhbHNlO1xuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuY2VudGVyLmlzQ2VudGVyID0gdHJ1ZTtcbiAgfVxuXG4gIC8vIHVzZSB0aGUgRGVsYXVuYXkgYWxnb3JpdGhtIHRvIG1ha2VcbiAgLy8gdHJpYW5nbGVzIG91dCBvZiBvdXIgcmFuZG9tIHBvaW50c1xuICB0cmlhbmd1bGF0ZSgpIHtcbiAgICB0aGlzLnRyaWFuZ2xlcyA9IFtdO1xuXG4gICAgLy8gbWFwIHBvaW50IG9iamVjdHMgdG8gbGVuZ3RoLTIgYXJyYXlzXG4gICAgdmFyIHZlcnRpY2VzID0gdGhpcy5wb2ludHMubWFwKGZ1bmN0aW9uKHBvaW50KSB7XG4gICAgICByZXR1cm4gcG9pbnQuZ2V0Q29vcmRzKCk7XG4gICAgfSk7XG5cbiAgICAvLyB2ZXJ0aWNlcyBpcyBub3cgYW4gYXJyYXkgc3VjaCBhczpcbiAgICAvLyBbIFtwMXgsIHAxeV0sIFtwMngsIHAyeV0sIFtwM3gsIHAzeV0sIC4uLiBdXG5cbiAgICAvLyBkbyB0aGUgYWxnb3JpdGhtXG4gICAgdmFyIHRyaWFuZ3VsYXRlZCA9IERlbGF1bmF5LnRyaWFuZ3VsYXRlKHZlcnRpY2VzKTtcblxuICAgIC8vIHJldHVybnMgMSBkaW1lbnNpb25hbCBhcnJheSBhcnJhbmdlZCBpbiB0cmlwbGVzIHN1Y2ggYXM6XG4gICAgLy8gWyB0MWEsIHQxYiwgdDFjLCB0MmEsIHQyYiwgdDJjLC4uLi4gXVxuICAgIC8vIHdoZXJlIHQxYSwgZXRjIGFyZSBpbmRlY2VzIGluIHRoZSB2ZXJ0aWNlcyBhcnJheVxuICAgIC8vIHR1cm4gdGhhdCBpbnRvIGFycmF5IG9mIHRyaWFuZ2xlIHBvaW50c1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdHJpYW5ndWxhdGVkLmxlbmd0aDsgaSArPSAzKSB7XG4gICAgICB2YXIgYXJyID0gW107XG4gICAgICBhcnIucHVzaCh2ZXJ0aWNlc1t0cmlhbmd1bGF0ZWRbaV1dKTtcbiAgICAgIGFyci5wdXNoKHZlcnRpY2VzW3RyaWFuZ3VsYXRlZFtpICsgMV1dKTtcbiAgICAgIGFyci5wdXNoKHZlcnRpY2VzW3RyaWFuZ3VsYXRlZFtpICsgMl1dKTtcbiAgICAgIHRoaXMudHJpYW5nbGVzLnB1c2goYXJyKTtcbiAgICB9XG5cbiAgICAvLyBtYXAgdG8gYXJyYXkgb2YgVHJpYW5nbGUgb2JqZWN0c1xuICAgIHRoaXMudHJpYW5nbGVzID0gdGhpcy50cmlhbmdsZXMubWFwKGZ1bmN0aW9uKHRyaWFuZ2xlKSB7XG4gICAgICByZXR1cm4gbmV3IFRyaWFuZ2xlKG5ldyBQb2ludCh0cmlhbmdsZVswXSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgIG5ldyBQb2ludCh0cmlhbmdsZVsxXSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgIG5ldyBQb2ludCh0cmlhbmdsZVsyXSkpO1xuICAgIH0pO1xuICB9XG5cbiAgcmVzZXRQb2ludENvbG9ycygpIHtcbiAgICAvLyByZXNldCBjYWNoZWQgY29sb3JzIG9mIGNlbnRyb2lkcyBhbmQgcG9pbnRzXG4gICAgdmFyIGk7XG4gICAgZm9yIChpID0gMDsgaSA8IHRoaXMudHJpYW5nbGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB0aGlzLnRyaWFuZ2xlc1tpXS5yZXNldFBvaW50Q29sb3JzKCk7XG4gICAgfVxuXG4gICAgZm9yIChpID0gMDsgaSA8IHRoaXMucG9pbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB0aGlzLnBvaW50c1tpXS5yZXNldENvbG9yKCk7XG4gICAgfVxuICB9XG5cbiAgLy8gY3JlYXRlIHJhbmRvbSByYWRpYWwgZ3JhZGllbnQgY2lyY2xlcyBmb3IgcmVuZGVyaW5nIGxhdGVyXG4gIGdlbmVyYXRlR3JhZGllbnRzKG1pbkdyYWRpZW50cywgbWF4R3JhZGllbnRzKSB7XG4gICAgdGhpcy5yYWRpYWxHcmFkaWVudHMgPSBbXTtcblxuICAgIG1pbkdyYWRpZW50cyA9IG1pbkdyYWRpZW50cyB8fCB0aGlzLm9wdGlvbnMubWluR3JhZGllbnRzO1xuICAgIG1heEdyYWRpZW50cyA9IG1heEdyYWRpZW50cyB8fCB0aGlzLm9wdGlvbnMubWF4R3JhZGllbnRzO1xuXG4gICAgdGhpcy5udW1HcmFkaWVudHMgPSBSYW5kb20ucmFuZG9tQmV0d2VlbihtaW5HcmFkaWVudHMsIG1heEdyYWRpZW50cyk7XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMubnVtR3JhZGllbnRzOyBpKyspIHtcbiAgICAgIHRoaXMuZ2VuZXJhdGVSYWRpYWxHcmFkaWVudCgpO1xuICAgIH1cbiAgfVxuXG4gIGdlbmVyYXRlUmFkaWFsR3JhZGllbnQoKSB7XG4gICAgLyoqXG4gICAgICAqIGNyZWF0ZSBhIG5pY2UtbG9va2luZyBidXQgc29tZXdoYXQgcmFuZG9tIGdyYWRpZW50OlxuICAgICAgKiByYW5kb21pemUgdGhlIGZpcnN0IGNpcmNsZVxuICAgICAgKiB0aGUgc2Vjb25kIGNpcmNsZSBzaG91bGQgYmUgaW5zaWRlIHRoZSBmaXJzdCBjaXJjbGUsXG4gICAgICAqIHNvIHdlIGdlbmVyYXRlIGEgcG9pbnQgKG9yaWdpbjIpIGluc2lkZSBjaXJsZTFcbiAgICAgICogdGhlbiBjYWxjdWxhdGUgdGhlIGRpc3QgYmV0d2VlbiBvcmlnaW4yIGFuZCB0aGUgY2lyY3VtZnJlbmNlIG9mIGNpcmNsZTFcbiAgICAgICogY2lyY2xlMidzIHJhZGl1cyBjYW4gYmUgYmV0d2VlbiAwIGFuZCB0aGlzIGRpc3RcbiAgICAgICovXG5cbiAgICB2YXIgbWluWCA9IHRoaXMub3B0aW9ucy5ncmFkaWVudC5taW5YKHRoaXMuY2FudmFzLndpZHRoLCB0aGlzLmNhbnZhcy5oZWlnaHQpO1xuICAgIHZhciBtYXhYID0gdGhpcy5vcHRpb25zLmdyYWRpZW50Lm1heFgodGhpcy5jYW52YXMud2lkdGgsIHRoaXMuY2FudmFzLmhlaWdodCk7XG5cbiAgICB2YXIgbWluWSA9IHRoaXMub3B0aW9ucy5ncmFkaWVudC5taW5ZKHRoaXMuY2FudmFzLndpZHRoLCB0aGlzLmNhbnZhcy5oZWlnaHQpO1xuICAgIHZhciBtYXhZID0gdGhpcy5vcHRpb25zLmdyYWRpZW50Lm1heFkodGhpcy5jYW52YXMud2lkdGgsIHRoaXMuY2FudmFzLmhlaWdodCk7XG5cbiAgICB2YXIgbWluUmFkaXVzID0gdGhpcy5vcHRpb25zLmdyYWRpZW50Lm1pblJhZGl1cyh0aGlzLmNhbnZhcy53aWR0aCwgdGhpcy5jYW52YXMuaGVpZ2h0LCB0aGlzLm51bUdyYWRpZW50cyk7XG4gICAgdmFyIG1heFJhZGl1cyA9IHRoaXMub3B0aW9ucy5ncmFkaWVudC5tYXhSYWRpdXModGhpcy5jYW52YXMud2lkdGgsIHRoaXMuY2FudmFzLmhlaWdodCwgdGhpcy5udW1HcmFkaWVudHMpO1xuXG4gICAgLy8gaGVscGVyIHJhbmRvbSBmdW5jdGlvbnNcbiAgICB2YXIgcmFuZG9tQ2FudmFzWCA9IFJhbmRvbS5yYW5kb21OdW1iZXJGdW5jdGlvbihtaW5YLCBtYXhYKTtcbiAgICB2YXIgcmFuZG9tQ2FudmFzWSA9IFJhbmRvbS5yYW5kb21OdW1iZXJGdW5jdGlvbihtaW5ZLCBtYXhZKTtcbiAgICB2YXIgcmFuZG9tQ2FudmFzUmFkaXVzID0gUmFuZG9tLnJhbmRvbU51bWJlckZ1bmN0aW9uKG1pblJhZGl1cywgbWF4UmFkaXVzKTtcblxuICAgIC8vIGdlbmVyYXRlIGNpcmNsZTEgb3JpZ2luIGFuZCByYWRpdXNcbiAgICB2YXIgeDA7XG4gICAgdmFyIHkwO1xuICAgIHZhciByMCA9IHJhbmRvbUNhbnZhc1JhZGl1cygpO1xuXG4gICAgLy8gb3JpZ2luIG9mIHRoZSBuZXh0IGNpcmNsZSBzaG91bGQgYmUgY29udGFpbmVkXG4gICAgLy8gd2l0aGluIHRoZSBhcmVhIG9mIGl0cyBwcmVkZWNlc3NvclxuICAgIGlmICh0aGlzLm9wdGlvbnMuZ3JhZGllbnQuY29ubmVjdGVkICYmIHRoaXMucmFkaWFsR3JhZGllbnRzLmxlbmd0aCA+IDApIHtcbiAgICAgIHZhciBsYXN0R3JhZGllbnQgPSB0aGlzLnJhZGlhbEdyYWRpZW50c1t0aGlzLnJhZGlhbEdyYWRpZW50cy5sZW5ndGggLSAxXTtcbiAgICAgIHZhciBwb2ludEluTGFzdENpcmNsZSA9IFJhbmRvbS5yYW5kb21JbkNpcmNsZShsYXN0R3JhZGllbnQucjAsIGxhc3RHcmFkaWVudC54MCwgbGFzdEdyYWRpZW50LnkwKTtcblxuICAgICAgeDAgPSBwb2ludEluTGFzdENpcmNsZS54O1xuICAgICAgeTAgPSBwb2ludEluTGFzdENpcmNsZS55O1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBmaXJzdCBjaXJjbGUsIGp1c3QgcGljayBhdCByYW5kb21cbiAgICAgIHgwID0gcmFuZG9tQ2FudmFzWCgpO1xuICAgICAgeTAgPSByYW5kb21DYW52YXNZKCk7XG4gICAgfVxuXG4gICAgLy8gZmluZCBhIHJhbmRvbSBwb2ludCBpbnNpZGUgY2lyY2xlMVxuICAgIC8vIHRoaXMgaXMgdGhlIG9yaWdpbiBvZiBjaXJjbGUgMlxuICAgIHZhciBwb2ludEluQ2lyY2xlID0gUmFuZG9tLnJhbmRvbUluQ2lyY2xlKHIwICogMC4wOSwgeDAsIHkwKTtcblxuICAgIC8vIGdyYWIgdGhlIHgveSBjb29yZHNcbiAgICB2YXIgeDEgPSBwb2ludEluQ2lyY2xlLng7XG4gICAgdmFyIHkxID0gcG9pbnRJbkNpcmNsZS55O1xuXG4gICAgLy8gZmluZCBkaXN0YW5jZSBiZXR3ZWVuIHRoZSBwb2ludCBhbmQgdGhlIGNpcmN1bWZyaWVuY2Ugb2YgY2lyY2xlMVxuICAgIC8vIHRoZSByYWRpdXMgb2YgdGhlIHNlY29uZCBjaXJjbGUgd2lsbCBiZSBhIGZ1bmN0aW9uIG9mIHRoaXMgZGlzdGFuY2VcbiAgICB2YXIgdlggPSB4MSAtIHgwO1xuICAgIHZhciB2WSA9IHkxIC0geTA7XG4gICAgdmFyIG1hZ1YgPSBNYXRoLnNxcnQodlggKiB2WCArIHZZICogdlkpO1xuICAgIHZhciBhWCA9IHgwICsgdlggLyBtYWdWICogcjA7XG4gICAgdmFyIGFZID0geTAgKyB2WSAvIG1hZ1YgKiByMDtcblxuICAgIHZhciBkaXN0ID0gTWF0aC5zcXJ0KCh4MSAtIGFYKSAqICh4MSAtIGFYKSArICh5MSAtIGFZKSAqICh5MSAtIGFZKSk7XG5cbiAgICAvLyBnZW5lcmF0ZSB0aGUgcmFkaXVzIG9mIGNpcmNsZTIgYmFzZWQgb24gdGhpcyBkaXN0YW5jZVxuICAgIHZhciByMSA9IFJhbmRvbS5yYW5kb21CZXR3ZWVuKDEsIE1hdGguc3FydChkaXN0KSk7XG5cbiAgICAvLyByYW5kb20gYnV0IG5pY2UgbG9va2luZyBjb2xvciBzdG9wXG4gICAgdmFyIGNvbG9yU3RvcCA9IFJhbmRvbS5yYW5kb21CZXR3ZWVuKDIsIDgpIC8gMTA7XG5cbiAgICB0aGlzLnJhZGlhbEdyYWRpZW50cy5wdXNoKHt4MCwgeTAsIHIwLCB4MSwgeTEsIHIxLCBjb2xvclN0b3B9KTtcbiAgfVxuXG4gIC8vIHNvcnRzIHRoZSBwb2ludHNcbiAgc29ydFBvaW50cygpIHtcbiAgICAvLyBzb3J0IHBvaW50c1xuICAgIHRoaXMucG9pbnRzLnNvcnQoZnVuY3Rpb24oYSwgYikge1xuICAgICAgLy8gc29ydCB0aGUgcG9pbnRcbiAgICAgIGlmIChhLnggPCBiLngpIHtcbiAgICAgICAgcmV0dXJuIC0xO1xuICAgICAgfSBlbHNlIGlmIChhLnggPiBiLngpIHtcbiAgICAgICAgcmV0dXJuIDE7XG4gICAgICB9IGVsc2UgaWYgKGEueSA8IGIueSkge1xuICAgICAgICByZXR1cm4gLTE7XG4gICAgICB9IGVsc2UgaWYgKGEueSA+IGIueSkge1xuICAgICAgICByZXR1cm4gMTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiAwO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgLy8gc2l6ZSB0aGUgY2FudmFzIHRvIHRoZSBzaXplIG9mIGl0cyBwYXJlbnRcbiAgLy8gbWFrZXMgdGhlIGNhbnZhcyAncmVzcG9uc2l2ZSdcbiAgcmVzaXplQ2FudmFzKCkge1xuICAgIHZhciBwYXJlbnQgPSB0aGlzLmNhbnZhcy5wYXJlbnRFbGVtZW50O1xuICAgIHRoaXMuY2FudmFzLndpZHRoID0gdGhpcy53aWR0aCA9IHBhcmVudC5vZmZzZXRXaWR0aDtcbiAgICB0aGlzLmNhbnZhcy5oZWlnaHQgPSB0aGlzLmhlaWdodCA9IHBhcmVudC5vZmZzZXRIZWlnaHQ7XG5cbiAgICBpZiAodGhpcy5ob3ZlclNoYWRvd0NhbnZhcykge1xuICAgICAgdGhpcy5ob3ZlclNoYWRvd0NhbnZhcy53aWR0aCA9IHRoaXMud2lkdGggPSBwYXJlbnQub2Zmc2V0V2lkdGg7XG4gICAgICB0aGlzLmhvdmVyU2hhZG93Q2FudmFzLmhlaWdodCA9IHRoaXMuaGVpZ2h0ID0gcGFyZW50Lm9mZnNldEhlaWdodDtcbiAgICB9XG4gIH1cblxuICAvLyBtb3ZlcyBwb2ludHMvdHJpYW5nbGVzIGJhc2VkIG9uIG5ldyBzaXplIG9mIGNhbnZhc1xuICByZXNjYWxlKCkge1xuICAgIC8vIGdyYWIgb2xkIG1heC9taW4gZnJvbSBjdXJyZW50IGNhbnZhcyBzaXplXG4gICAgdmFyIHhNaW4gPSAwO1xuICAgIHZhciB4TWF4ID0gdGhpcy5jYW52YXMud2lkdGg7XG4gICAgdmFyIHlNaW4gPSAwO1xuICAgIHZhciB5TWF4ID0gdGhpcy5jYW52YXMuaGVpZ2h0O1xuXG4gICAgdGhpcy5yZXNpemVDYW52YXMoKTtcblxuICAgIGlmICh0aGlzLm9wdGlvbnMucmVzaXplTW9kZSA9PT0gJ3NjYWxlUG9pbnRzJykge1xuICAgICAgLy8gc2NhbGUgYWxsIHBvaW50cyB0byBuZXcgbWF4IGRpbWVuc2lvbnNcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5wb2ludHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdGhpcy5wb2ludHNbaV0ucmVzY2FsZSh4TWluLCB4TWF4LCB5TWluLCB5TWF4LCAwLCB0aGlzLmNhbnZhcy53aWR0aCwgMCwgdGhpcy5jYW52YXMuaGVpZ2h0KTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5nZW5lcmF0ZU5ld1BvaW50cygpO1xuICAgIH1cblxuICAgIHRoaXMudHJpYW5ndWxhdGUoKTtcblxuICAgIC8vIHJlc2NhbGUgcG9zaXRpb24gb2YgcmFkaWFsIGdyYWRpZW50IGNpcmNsZXNcbiAgICB0aGlzLnJlc2NhbGVHcmFkaWVudHModGhpcy5yYWRpYWxHcmFkaWVudHMsIHhNaW4sIHhNYXgsIHlNaW4sIHlNYXgpO1xuICAgIHRoaXMucmVzY2FsZUdyYWRpZW50cyh0aGlzLmN1cnJlbnRHcmFkaWVudHMsIHhNaW4sIHhNYXgsIHlNaW4sIHlNYXgpO1xuICAgIHRoaXMucmVzY2FsZUdyYWRpZW50cyh0aGlzLm5leHRHcmFkaWVudHMsIHhNaW4sIHhNYXgsIHlNaW4sIHlNYXgpO1xuXG4gICAgdGhpcy5yZW5kZXIoKTtcbiAgfVxuXG4gIHJlc2NhbGVHcmFkaWVudHMoYXJyYXksIHhNaW4sIHhNYXgsIHlNaW4sIHlNYXgpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFycmF5Lmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgY2lyY2xlMCA9IG5ldyBQb2ludChhcnJheVtpXS54MCwgYXJyYXlbaV0ueTApO1xuICAgICAgdmFyIGNpcmNsZTEgPSBuZXcgUG9pbnQoYXJyYXlbaV0ueDEsIGFycmF5W2ldLnkxKTtcblxuICAgICAgY2lyY2xlMC5yZXNjYWxlKHhNaW4sIHhNYXgsIHlNaW4sIHlNYXgsIDAsIHRoaXMuY2FudmFzLndpZHRoLCAwLCB0aGlzLmNhbnZhcy5oZWlnaHQpO1xuICAgICAgY2lyY2xlMS5yZXNjYWxlKHhNaW4sIHhNYXgsIHlNaW4sIHlNYXgsIDAsIHRoaXMuY2FudmFzLndpZHRoLCAwLCB0aGlzLmNhbnZhcy5oZWlnaHQpO1xuXG4gICAgICBhcnJheVtpXS54MCA9IGNpcmNsZTAueDtcbiAgICAgIGFycmF5W2ldLnkwID0gY2lyY2xlMC55O1xuICAgICAgYXJyYXlbaV0ueDEgPSBjaXJjbGUxLng7XG4gICAgICBhcnJheVtpXS55MSA9IGNpcmNsZTEueTtcbiAgICB9XG4gIH1cblxuICBob3ZlcigpIHtcbiAgICBpZiAodGhpcy5tb3VzZVBvc2l0aW9uKSB7XG4gICAgICB2YXIgcmdiID0gdGhpcy5tb3VzZVBvc2l0aW9uLmNhbnZhc0NvbG9yQXRQb2ludCh0aGlzLnNoYWRvd0ltYWdlRGF0YSwgJ3JnYicpO1xuICAgICAgdmFyIGhleCA9IENvbG9yLnJnYlRvSGV4KHJnYik7XG4gICAgICB2YXIgZGVjID0gcGFyc2VJbnQoaGV4LCAxNik7XG5cbiAgICAgIC8vIGlzIHByb2JhYmx5IHRyaWFuZ2xlIHdpdGggdGhhdCBpbmRleCwgYnV0XG4gICAgICAvLyBlZGdlcyBjYW4gYmUgZnV6enkgc28gZG91YmxlIGNoZWNrXG4gICAgICBpZiAoZGVjID49IDAgJiYgZGVjIDwgdGhpcy50cmlhbmdsZXMubGVuZ3RoICYmIHRoaXMudHJpYW5nbGVzW2RlY10ucG9pbnRJblRyaWFuZ2xlKHRoaXMubW91c2VQb3NpdGlvbikpIHtcbiAgICAgICAgLy8gY2xlYXIgdGhlIGxhc3QgdHJpYW5nbGVcbiAgICAgICAgdGhpcy5yZXNldFRyaWFuZ2xlKCk7XG5cbiAgICAgICAgaWYgKHRoaXMubGFzdFRyaWFuZ2xlICE9PSBkZWMpIHtcbiAgICAgICAgICAvLyByZW5kZXIgdGhlIGhvdmVyZWQgdHJpYW5nbGVcbiAgICAgICAgICB0aGlzLm9wdGlvbnMub25UcmlhbmdsZUhvdmVyKHRoaXMudHJpYW5nbGVzW2RlY10sIHRoaXMuY3R4LCB0aGlzLm9wdGlvbnMpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5sYXN0VHJpYW5nbGUgPSBkZWM7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMucmVzZXRUcmlhbmdsZSgpO1xuICAgIH1cbiAgfVxuXG4gIHJlc2V0VHJpYW5nbGUoKSB7XG4gICAgLy8gcmVkcmF3IHRoZSBsYXN0IHRyaWFuZ2xlIHRoYXQgd2FzIGhvdmVyZWQgb3ZlclxuICAgIGlmICh0aGlzLmxhc3RUcmlhbmdsZSAmJiB0aGlzLmxhc3RUcmlhbmdsZSA+PSAwICYmIHRoaXMubGFzdFRyaWFuZ2xlIDwgdGhpcy50cmlhbmdsZXMubGVuZ3RoKSB7XG4gICAgICB2YXIgbGFzdFRyaWFuZ2xlID0gdGhpcy50cmlhbmdsZXNbdGhpcy5sYXN0VHJpYW5nbGVdO1xuXG4gICAgICAvLyBmaW5kIHRoZSBib3VuZGluZyBwb2ludHMgb2YgdGhlIGxhc3QgdHJpYW5nbGVcbiAgICAgIC8vIGV4cGFuZCBhIGJpdCBmb3IgZWRnZXNcbiAgICAgIHZhciBtaW5YID0gbGFzdFRyaWFuZ2xlLm1pblgoKSAtIDE7XG4gICAgICB2YXIgbWluWSA9IGxhc3RUcmlhbmdsZS5taW5ZKCkgLSAxO1xuICAgICAgdmFyIG1heFggPSBsYXN0VHJpYW5nbGUubWF4WCgpICsgMTtcbiAgICAgIHZhciBtYXhZID0gbGFzdFRyaWFuZ2xlLm1heFkoKSArIDE7XG5cbiAgICAgIC8vIHJlc2V0IHRoYXQgcG9ydGlvbiBvZiB0aGUgY2FudmFzIHRvIGl0cyBvcmlnaW5hbCByZW5kZXJcbiAgICAgIHRoaXMuY3R4LnB1dEltYWdlRGF0YSh0aGlzLnJlbmRlcmVkSW1hZ2VEYXRhLCAwLCAwLCBtaW5YLCBtaW5ZLCBtYXhYIC0gbWluWCwgbWF4WSAtIG1pblkpO1xuXG4gICAgICB0aGlzLmxhc3RUcmlhbmdsZSA9IGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIHJlbmRlcigpIHtcbiAgICB0aGlzLnJlbmRlckJhY2tncm91bmQodGhpcy5yZW5kZXJGb3JlZ3JvdW5kLmJpbmQodGhpcykpO1xuICB9XG5cbiAgcmVuZGVyQmFja2dyb3VuZChjYWxsYmFjaykge1xuICAgIC8vIHJlbmRlciB0aGUgYmFzZSB0byBnZXQgdHJpYW5nbGUgY29sb3JzXG4gICAgaWYgKHRoaXMub3B0aW9ucy5pbWFnZUFzQmFja2dyb3VuZCkge1xuICAgICAgdGhpcy5yZW5kZXJJbWFnZUJhY2tncm91bmQoY2FsbGJhY2spO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnJlbmRlckdyYWRpZW50KCk7XG4gICAgICBjYWxsYmFjaygpO1xuICAgIH1cbiAgfVxuXG4gIHJlbmRlckZvcmVncm91bmQoKSB7XG4gICAgLy8gZ2V0IGVudGlyZSBjYW52YXMgaW1hZ2UgZGF0YSBvZiBpbiBhIGJpZyB0eXBlZCBhcnJheVxuICAgIC8vIHRoaXMgd2F5IHdlIGRvbnQgaGF2ZSB0byBwaWNrIGZvciBlYWNoIHBvaW50IGluZGl2aWR1YWxseVxuICAgIC8vIGl0J3MgbGlrZSA1MHggZmFzdGVyIHRoaXMgd2F5XG4gICAgdGhpcy5ncmFkaWVudEltYWdlRGF0YSA9IHRoaXMuY3R4LmdldEltYWdlRGF0YSgwLCAwLCB0aGlzLmNhbnZhcy53aWR0aCwgdGhpcy5jYW52YXMuaGVpZ2h0KTtcblxuICAgIC8vIHJlbmRlcnMgdHJpYW5nbGVzLCBlZGdlcywgYW5kIHNoYWRvdyBjYW52YXMgZm9yIGhvdmVyIGRldGVjdGlvblxuICAgIHRoaXMucmVuZGVyVHJpYW5nbGVzKHRoaXMub3B0aW9ucy5zaG93VHJpYW5nbGVzLCB0aGlzLm9wdGlvbnMuc2hvd0VkZ2VzKTtcblxuICAgIHRoaXMucmVuZGVyRXh0cmFzKCk7XG5cbiAgICB0aGlzLnJlbmRlcmVkSW1hZ2VEYXRhID0gdGhpcy5jdHguZ2V0SW1hZ2VEYXRhKDAsIDAsIHRoaXMuY2FudmFzLndpZHRoLCB0aGlzLmNhbnZhcy5oZWlnaHQpO1xuXG4gICAgLy8gdGhyb3cgZXZlbnRzIGZvciBsaWdodCAvIGRhcmsgdGV4dFxuICAgIHZhciBjZW50ZXJDb2xvciA9IHRoaXMuY2VudGVyLmNhbnZhc0NvbG9yQXRQb2ludCgpO1xuXG4gICAgaWYgKHBhcnNlSW50KGNlbnRlckNvbG9yLnNwbGl0KCcsJylbMl0pIDwgNTApIHtcbiAgICAgIGlmICh0aGlzLm9wdGlvbnMub25EYXJrQmFja2dyb3VuZCkge1xuICAgICAgICB0aGlzLm9wdGlvbnMub25EYXJrQmFja2dyb3VuZChjZW50ZXJDb2xvcik7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmICh0aGlzLm9wdGlvbnMub25MaWdodEJhY2tncm91bmQpIHtcbiAgICAgICAgdGhpcy5vcHRpb25zLm9uTGlnaHRCYWNrZ3JvdW5kKGNlbnRlckNvbG9yKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZW5kZXJFeHRyYXMoKSB7XG4gICAgaWYgKHRoaXMub3B0aW9ucy5zaG93UG9pbnRzKSB7XG4gICAgICB0aGlzLnJlbmRlclBvaW50cygpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLm9wdGlvbnMuc2hvd0NpcmNsZXMgJiYgIXRoaXMub3B0aW9ucy5pbWFnZUFzQmFja2dyb3VuZCkge1xuICAgICAgdGhpcy5yZW5kZXJHcmFkaWVudENpcmNsZXMoKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLnNob3dDZW50cm9pZHMpIHtcbiAgICAgIHRoaXMucmVuZGVyQ2VudHJvaWRzKCk7XG4gICAgfVxuICB9XG5cbiAgcmVuZGVyTmV3Q29sb3JzKGNvbG9ycykge1xuICAgIHRoaXMuY29sb3JzID0gY29sb3JzIHx8IHRoaXMuY29sb3JzO1xuICAgIC8vIHRyaWFuZ2xlIGNlbnRyb2lkcyBuZWVkIG5ldyBjb2xvcnNcbiAgICB0aGlzLnJlc2V0UG9pbnRDb2xvcnMoKTtcbiAgICB0aGlzLnJlbmRlcigpO1xuICB9XG5cbiAgcmVuZGVyTmV3R3JhZGllbnQobWluR3JhZGllbnRzLCBtYXhHcmFkaWVudHMpIHtcbiAgICB0aGlzLmdlbmVyYXRlR3JhZGllbnRzKG1pbkdyYWRpZW50cywgbWF4R3JhZGllbnRzKTtcblxuICAgIC8vIHByZXAgZm9yIGFuaW1hdGlvblxuICAgIHRoaXMubmV4dEdyYWRpZW50cyA9IHRoaXMucmFkaWFsR3JhZGllbnRzLnNsaWNlKDApO1xuICAgIHRoaXMuZ2VuZXJhdGVHcmFkaWVudHMoKTtcbiAgICB0aGlzLmN1cnJlbnRHcmFkaWVudHMgPSB0aGlzLnJhZGlhbEdyYWRpZW50cy5zbGljZSgwKTtcblxuICAgIHRoaXMucmVzZXRQb2ludENvbG9ycygpO1xuICAgIHRoaXMucmVuZGVyKCk7XG4gIH1cblxuICByZW5kZXJOZXdUcmlhbmdsZXMobWluLCBtYXgsIG1pbkVkZ2UsIG1heEVkZ2UsIG11bHRpcGxpZXIpIHtcbiAgICB0aGlzLmdlbmVyYXRlTmV3UG9pbnRzKG1pbiwgbWF4LCBtaW5FZGdlLCBtYXhFZGdlLCBtdWx0aXBsaWVyKTtcbiAgICB0aGlzLnRyaWFuZ3VsYXRlKCk7XG4gICAgdGhpcy5yZW5kZXIoKTtcbiAgfVxuXG4gIHJlbmRlckdyYWRpZW50KCkge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5yYWRpYWxHcmFkaWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIC8vIGNyZWF0ZSB0aGUgcmFkaWFsIGdyYWRpZW50IGJhc2VkIG9uXG4gICAgICAvLyB0aGUgZ2VuZXJhdGVkIGNpcmNsZXMnIHJhZGlpIGFuZCBvcmlnaW5zXG4gICAgICB2YXIgcmFkaWFsR3JhZGllbnQgPSB0aGlzLmN0eC5jcmVhdGVSYWRpYWxHcmFkaWVudChcbiAgICAgICAgdGhpcy5yYWRpYWxHcmFkaWVudHNbaV0ueDAsXG4gICAgICAgIHRoaXMucmFkaWFsR3JhZGllbnRzW2ldLnkwLFxuICAgICAgICB0aGlzLnJhZGlhbEdyYWRpZW50c1tpXS5yMCxcbiAgICAgICAgdGhpcy5yYWRpYWxHcmFkaWVudHNbaV0ueDEsXG4gICAgICAgIHRoaXMucmFkaWFsR3JhZGllbnRzW2ldLnkxLFxuICAgICAgICB0aGlzLnJhZGlhbEdyYWRpZW50c1tpXS5yMVxuICAgICAgKTtcblxuICAgICAgdmFyIG91dGVyQ29sb3IgPSB0aGlzLmNvbG9yc1syXTtcblxuICAgICAgLy8gbXVzdCBiZSB0cmFuc3BhcmVudCB2ZXJzaW9uIG9mIG1pZGRsZSBjb2xvclxuICAgICAgLy8gdGhpcyB3b3JrcyBmb3IgcmdiYSBhbmQgaHNsYVxuICAgICAgaWYgKGkgPiAwKSB7XG4gICAgICAgIG91dGVyQ29sb3IgPSB0aGlzLmNvbG9yc1sxXS5zcGxpdCgnLCcpO1xuICAgICAgICBvdXRlckNvbG9yWzNdID0gJzApJztcbiAgICAgICAgb3V0ZXJDb2xvciA9IG91dGVyQ29sb3Iuam9pbignLCcpO1xuICAgICAgfVxuXG4gICAgICByYWRpYWxHcmFkaWVudC5hZGRDb2xvclN0b3AoMSwgdGhpcy5jb2xvcnNbMF0pO1xuICAgICAgcmFkaWFsR3JhZGllbnQuYWRkQ29sb3JTdG9wKHRoaXMucmFkaWFsR3JhZGllbnRzW2ldLmNvbG9yU3RvcCwgdGhpcy5jb2xvcnNbMV0pO1xuICAgICAgcmFkaWFsR3JhZGllbnQuYWRkQ29sb3JTdG9wKDAsIG91dGVyQ29sb3IpO1xuXG4gICAgICB0aGlzLmNhbnZhcy5wYXJlbnRFbGVtZW50LnN0eWxlLmJhY2tncm91bmRDb2xvciA9IHRoaXMuY29sb3JzWzJdO1xuXG4gICAgICB0aGlzLmN0eC5maWxsU3R5bGUgPSByYWRpYWxHcmFkaWVudDtcbiAgICAgIHRoaXMuY3R4LmZpbGxSZWN0KDAsIDAsIHRoaXMuY2FudmFzLndpZHRoLCB0aGlzLmNhbnZhcy5oZWlnaHQpO1xuICAgIH1cbiAgfVxuXG4gIHJlbmRlckltYWdlQmFja2dyb3VuZChjYWxsYmFjaykge1xuICAgIHRoaXMubG9hZEltYWdlQmFja2dyb3VuZCgoZnVuY3Rpb24oKSB7XG4gICAgICAvLyBzY2FsZSBpbWFnZSB0byBmaXQgd2lkdGgvaGVpZ2h0IG9mIGNhbnZhc1xuICAgICAgbGV0IGhlaWdodE11bHRpcGxpZXIgPSB0aGlzLmNhbnZhcy5oZWlnaHQgLyB0aGlzLmltYWdlLmhlaWdodDtcbiAgICAgIGxldCB3aWR0aE11bHRpcGxpZXIgPSB0aGlzLmNhbnZhcy53aWR0aCAvIHRoaXMuaW1hZ2Uud2lkdGg7XG5cbiAgICAgIGxldCBtdWx0aXBsaWVyID0gTWF0aC5tYXgoaGVpZ2h0TXVsdGlwbGllciwgd2lkdGhNdWx0aXBsaWVyKTtcblxuICAgICAgdGhpcy5jdHguZHJhd0ltYWdlKHRoaXMuaW1hZ2UsIDAsIDAsIHRoaXMuaW1hZ2Uud2lkdGggKiBtdWx0aXBsaWVyLCB0aGlzLmltYWdlLmhlaWdodCAqIG11bHRpcGxpZXIpO1xuXG4gICAgICBjYWxsYmFjaygpO1xuICAgIH0pLmJpbmQodGhpcykpO1xuICB9XG5cbiAgbG9hZEltYWdlQmFja2dyb3VuZChjYWxsYmFjaykge1xuICAgIGlmICh0aGlzLmltYWdlICYmIHRoaXMuaW1hZ2Uuc3JjID09PSB0aGlzLm9wdGlvbnMuaW1hZ2VVUkwpIHtcbiAgICAgIGNhbGxiYWNrKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuaW1hZ2UgPSBuZXcgSW1hZ2UoKTtcbiAgICAgIHRoaXMuaW1hZ2UuY3Jvc3NPcmlnaW4gPSAnQW5vbnltb3VzJztcbiAgICAgIHRoaXMuaW1hZ2Uuc3JjID0gdGhpcy5vcHRpb25zLmltYWdlVVJMO1xuXG4gICAgICB0aGlzLmltYWdlLm9ubG9hZCA9IGNhbGxiYWNrO1xuICAgIH1cbiAgfVxuXG4gIHJlbmRlclRyaWFuZ2xlcyh0cmlhbmdsZXMsIGVkZ2VzKSB7XG4gICAgLy8gc2F2ZSB0aGlzIGZvciBsYXRlclxuICAgIHRoaXMuY2VudGVyLmNhbnZhc0NvbG9yQXRQb2ludCh0aGlzLmdyYWRpZW50SW1hZ2VEYXRhKTtcblxuICAgIGxldCBsYXN0Q29sb3I7XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMudHJpYW5nbGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBsZXQgdHJpYW5nbGUgPSB0aGlzLnRyaWFuZ2xlc1tpXTtcbiAgICAgIC8vIHRoZSBjb2xvciBpcyBkZXRlcm1pbmVkIGJ5IGdyYWJiaW5nIHRoZSBjb2xvciBvZiB0aGUgY2FudmFzXG4gICAgICAvLyAod2hlcmUgd2UgZHJldyB0aGUgZ3JhZGllbnQpIGF0IHRoZSBjZW50ZXIgb2YgdGhlIHRyaWFuZ2xlXG5cbiAgICAgIHRyaWFuZ2xlLmNvbG9yID0gdHJpYW5nbGUuY29sb3JBdENlbnRyb2lkKHRoaXMuZ3JhZGllbnRJbWFnZURhdGEpO1xuXG4gICAgICBpZiAodGhpcy5vcHRpb25zLmZpbGxXaXRoR3JhZGllbnQgJiYgdHJpYW5nbGUuY29sb3IpIHtcbiAgICAgICAgdmFyIGdyYWRpZW50ID0gdGhpcy5jdHguY3JlYXRlTGluZWFyR3JhZGllbnQodHJpYW5nbGUuYS54LCB0cmlhbmdsZS5hLnksIHRyaWFuZ2xlLmIueCwgdHJpYW5nbGUuYi55KTtcbiAgICAgICAgZ3JhZGllbnQuYWRkQ29sb3JTdG9wKDAsIHRyaWFuZ2xlLmNvbG9yKTtcbiAgICAgICAgZ3JhZGllbnQuYWRkQ29sb3JTdG9wKDEsIGxhc3RDb2xvciB8fCB0cmlhbmdsZS5jb2xvcik7XG4gICAgICAgIGxhc3RDb2xvciA9IHRyaWFuZ2xlLmNvbG9yO1xuICAgICAgICB0cmlhbmdsZS5jb2xvciA9IGdyYWRpZW50O1xuICAgICAgfVxuXG4gICAgICBpZiAodHJpYW5nbGVzICYmIGVkZ2VzKSB7XG4gICAgICAgIHRyaWFuZ2xlLnN0cm9rZSA9IHRoaXMub3B0aW9ucy5lZGdlQ29sb3IodHJpYW5nbGUuY29sb3JBdENlbnRyb2lkKHRoaXMuZ3JhZGllbnRJbWFnZURhdGEpKTtcbiAgICAgICAgdHJpYW5nbGUucmVuZGVyKHRoaXMuY3R4KTtcbiAgICAgIH0gZWxzZSBpZiAodHJpYW5nbGVzKSB7XG4gICAgICAgIC8vIHRyaWFuZ2xlcyBvbmx5XG4gICAgICAgIHRyaWFuZ2xlLnN0cm9rZSA9IHRyaWFuZ2xlLmNvbG9yO1xuICAgICAgICB0cmlhbmdsZS5yZW5kZXIodGhpcy5jdHgpO1xuICAgICAgfSBlbHNlIGlmIChlZGdlcykge1xuICAgICAgICAvLyBlZGdlcyBvbmx5XG4gICAgICAgIHRyaWFuZ2xlLnN0cm9rZSA9IHRoaXMub3B0aW9ucy5lZGdlQ29sb3IodHJpYW5nbGUuY29sb3JBdENlbnRyb2lkKHRoaXMuZ3JhZGllbnRJbWFnZURhdGEpKTtcbiAgICAgICAgdHJpYW5nbGUucmVuZGVyKHRoaXMuY3R4LCBmYWxzZSk7XG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLmhvdmVyU2hhZG93Q2FudmFzKSB7XG4gICAgICAgIHZhciBjb2xvciA9ICcjJyArICgnMDAwMDAwJyArIGkudG9TdHJpbmcoMTYpKS5zbGljZSgtNik7XG4gICAgICAgIHRyaWFuZ2xlLnJlbmRlcih0aGlzLnNoYWRvd0N0eCwgY29sb3IpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmICh0aGlzLmhvdmVyU2hhZG93Q2FudmFzKSB7XG4gICAgICB0aGlzLnNoYWRvd0ltYWdlRGF0YSA9IHRoaXMuc2hhZG93Q3R4LmdldEltYWdlRGF0YSgwLCAwLCB0aGlzLmNhbnZhcy53aWR0aCwgdGhpcy5jYW52YXMuaGVpZ2h0KTtcbiAgICB9XG4gIH1cblxuICAvLyByZW5kZXJzIHRoZSBwb2ludHMgb2YgdGhlIHRyaWFuZ2xlc1xuICByZW5kZXJQb2ludHMoKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLnBvaW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIGNvbG9yID0gdGhpcy5vcHRpb25zLnBvaW50Q29sb3IodGhpcy5wb2ludHNbaV0uY2FudmFzQ29sb3JBdFBvaW50KHRoaXMuZ3JhZGllbnRJbWFnZURhdGEpKTtcbiAgICAgIHRoaXMucG9pbnRzW2ldLnJlbmRlcih0aGlzLmN0eCwgY29sb3IpO1xuICAgIH1cbiAgfVxuXG4gIC8vIGRyYXdzIHRoZSBjaXJjbGVzIHRoYXQgZGVmaW5lIHRoZSBncmFkaWVudHNcbiAgcmVuZGVyR3JhZGllbnRDaXJjbGVzKCkge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5yYWRpYWxHcmFkaWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHRoaXMuY3R4LmJlZ2luUGF0aCgpO1xuICAgICAgdGhpcy5jdHguYXJjKHRoaXMucmFkaWFsR3JhZGllbnRzW2ldLngwLFxuICAgICAgICAgICAgICB0aGlzLnJhZGlhbEdyYWRpZW50c1tpXS55MCxcbiAgICAgICAgICAgICAgdGhpcy5yYWRpYWxHcmFkaWVudHNbaV0ucjAsXG4gICAgICAgICAgICAgIDAsIE1hdGguUEkgKiAyLCB0cnVlKTtcbiAgICAgIHZhciBjZW50ZXIxID0gbmV3IFBvaW50KHRoaXMucmFkaWFsR3JhZGllbnRzW2ldLngwLCB0aGlzLnJhZGlhbEdyYWRpZW50c1tpXS55MCk7XG4gICAgICB0aGlzLmN0eC5zdHJva2VTdHlsZSA9IGNlbnRlcjEuY2FudmFzQ29sb3JBdFBvaW50KHRoaXMuZ3JhZGllbnRJbWFnZURhdGEpO1xuICAgICAgdGhpcy5jdHguc3Ryb2tlKCk7XG5cbiAgICAgIHRoaXMuY3R4LmJlZ2luUGF0aCgpO1xuICAgICAgdGhpcy5jdHguYXJjKHRoaXMucmFkaWFsR3JhZGllbnRzW2ldLngxLFxuICAgICAgICAgICAgICB0aGlzLnJhZGlhbEdyYWRpZW50c1tpXS55MSxcbiAgICAgICAgICAgICAgdGhpcy5yYWRpYWxHcmFkaWVudHNbaV0ucjEsXG4gICAgICAgICAgICAgIDAsIE1hdGguUEkgKiAyLCB0cnVlKTtcbiAgICAgIHZhciBjZW50ZXIyID0gbmV3IFBvaW50KHRoaXMucmFkaWFsR3JhZGllbnRzW2ldLngxLCB0aGlzLnJhZGlhbEdyYWRpZW50c1tpXS55MSk7XG4gICAgICB0aGlzLmN0eC5zdHJva2VTdHlsZSA9IGNlbnRlcjIuY2FudmFzQ29sb3JBdFBvaW50KHRoaXMuZ3JhZGllbnRJbWFnZURhdGEpO1xuICAgICAgdGhpcy5jdHguc3Ryb2tlKCk7XG4gICAgfVxuICB9XG5cbiAgLy8gcmVuZGVyIHRyaWFuZ2xlIGNlbnRyb2lkc1xuICByZW5kZXJDZW50cm9pZHMoKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLnRyaWFuZ2xlcy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIGNvbG9yID0gdGhpcy5vcHRpb25zLmNlbnRyb2lkQ29sb3IodGhpcy50cmlhbmdsZXNbaV0uY29sb3JBdENlbnRyb2lkKHRoaXMuZ3JhZGllbnRJbWFnZURhdGEpKTtcbiAgICAgIHRoaXMudHJpYW5nbGVzW2ldLmNlbnRyb2lkKCkucmVuZGVyKHRoaXMuY3R4LCBjb2xvcik7XG4gICAgfVxuICB9XG5cbiAgdG9nZ2xlVHJpYW5nbGVzKGZvcmNlKSB7XG4gICAgaWYgKHR5cGVvZiBmb3JjZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIGlmICh0aGlzLm9wdGlvbnMuc2hvd1RyaWFuZ2xlcyA9PT0gZm9yY2UpIHtcbiAgICAgICAgLy8gZG9uJ3QgcmVuZGVyIGlmIHRoZSBvcHRpb24gZG9lc27igJl0IGNoYW5nZVxuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICB0aGlzLm9wdGlvbnMuc2hvd1RyaWFuZ2xlcyA9IGZvcmNlO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLm9wdGlvbnMuc2hvd1RyaWFuZ2xlcyA9ICF0aGlzLm9wdGlvbnMuc2hvd1RyaWFuZ2xlcztcbiAgICB9XG4gICAgdGhpcy5yZW5kZXIoKTtcbiAgfVxuXG4gIHRvZ2dsZVBvaW50cyhmb3JjZSkge1xuICAgIGlmICh0eXBlb2YgZm9yY2UgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICBpZiAodGhpcy5vcHRpb25zLnNob3dQb2ludHMgPT09IGZvcmNlKSB7XG4gICAgICAgIC8vIGRvbid0IHJlbmRlciBpZiB0aGUgb3B0aW9uIGRvZXNu4oCZdCBjaGFuZ2VcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgdGhpcy5vcHRpb25zLnNob3dQb2ludHMgPSBmb3JjZTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5vcHRpb25zLnNob3dQb2ludHMgPSAhdGhpcy5vcHRpb25zLnNob3dQb2ludHM7XG4gICAgfVxuICAgIHRoaXMucmVuZGVyKCk7XG4gIH1cblxuICB0b2dnbGVDaXJjbGVzKGZvcmNlKSB7XG4gICAgaWYgKHR5cGVvZiBmb3JjZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIGlmICh0aGlzLm9wdGlvbnMuc2hvd0NpcmNsZXMgPT09IGZvcmNlKSB7XG4gICAgICAgIC8vIGRvbid0IHJlbmRlciBpZiB0aGUgb3B0aW9uIGRvZXNu4oCZdCBjaGFuZ2VcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgdGhpcy5vcHRpb25zLnNob3dDaXJjbGVzID0gZm9yY2U7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMub3B0aW9ucy5zaG93Q2lyY2xlcyA9ICF0aGlzLm9wdGlvbnMuc2hvd0NpcmNsZXM7XG4gICAgfVxuICAgIHRoaXMucmVuZGVyKCk7XG4gIH1cblxuICB0b2dnbGVDZW50cm9pZHMoZm9yY2UpIHtcbiAgICBpZiAodHlwZW9mIGZvcmNlICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgaWYgKHRoaXMub3B0aW9ucy5zaG93Q2VudHJvaWRzID09PSBmb3JjZSkge1xuICAgICAgICAvLyBkb24ndCByZW5kZXIgaWYgdGhlIG9wdGlvbiBkb2VzbuKAmXQgY2hhbmdlXG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHRoaXMub3B0aW9ucy5zaG93Q2VudHJvaWRzID0gZm9yY2U7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMub3B0aW9ucy5zaG93Q2VudHJvaWRzID0gIXRoaXMub3B0aW9ucy5zaG93Q2VudHJvaWRzO1xuICAgIH1cbiAgICB0aGlzLnJlbmRlcigpO1xuICB9XG5cbiAgdG9nZ2xlRWRnZXMoZm9yY2UpIHtcbiAgICBpZiAodHlwZW9mIGZvcmNlICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgaWYgKHRoaXMub3B0aW9ucy5zaG93RWRnZXMgPT09IGZvcmNlKSB7XG4gICAgICAgIC8vIGRvbid0IHJlbmRlciBpZiB0aGUgb3B0aW9uIGRvZXNu4oCZdCBjaGFuZ2VcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgdGhpcy5vcHRpb25zLnNob3dFZGdlcyA9IGZvcmNlO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLm9wdGlvbnMuc2hvd0VkZ2VzID0gIXRoaXMub3B0aW9ucy5zaG93RWRnZXM7XG4gICAgfVxuICAgIHRoaXMucmVuZGVyKCk7XG4gIH1cblxuICB0b2dnbGVBbmltYXRpb24oZm9yY2UpIHtcbiAgICBpZiAodHlwZW9mIGZvcmNlICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgaWYgKHRoaXMub3B0aW9ucy5hbmltYXRlID09PSBmb3JjZSkge1xuICAgICAgICAvLyBkb24ndCByZW5kZXIgaWYgdGhlIG9wdGlvbiBkb2VzbuKAmXQgY2hhbmdlXG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHRoaXMub3B0aW9ucy5hbmltYXRlID0gZm9yY2U7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMub3B0aW9ucy5hbmltYXRlID0gIXRoaXMub3B0aW9ucy5hbmltYXRlO1xuICAgIH1cbiAgICBpZiAodGhpcy5vcHRpb25zLmFuaW1hdGUpIHtcbiAgICAgIHRoaXMuaW5pdFJlbmRlckxvb3AoKTtcbiAgICB9XG4gIH1cblxuICB0b2dnbGVIb3Zlcihmb3JjZSkge1xuICAgIGlmICh0eXBlb2YgZm9yY2UgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICBpZiAodGhpcy5vcHRpb25zLmhvdmVyID09PSBmb3JjZSkge1xuICAgICAgICAvLyBkb24ndCByZW5kZXIgaWYgdGhlIG9wdGlvbiBkb2VzbuKAmXQgY2hhbmdlXG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHRoaXMub3B0aW9ucy5ob3ZlciA9IGZvcmNlO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLm9wdGlvbnMuaG92ZXIgPSAhdGhpcy5vcHRpb25zLmhvdmVyO1xuICAgIH1cbiAgICBpZiAodGhpcy5vcHRpb25zLmhvdmVyKSB7XG4gICAgICB0aGlzLmluaXRIb3ZlcigpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnJlbW92ZUhvdmVyKCk7XG4gICAgfVxuICB9XG5cbiAgZ2V0Q29sb3JzKCkge1xuICAgIHJldHVybiB0aGlzLmNvbG9ycztcbiAgfVxufVxuXG5mdW5jdGlvbiBsaW5lYXJTY2FsZSh4MCwgeDEsIHNjYWxlKSB7XG4gIHJldHVybiB4MCArIChzY2FsZSAqICh4MSAtIHgwKSk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gUHJldHR5RGVsYXVuYXk7XG4iLCJjb25zdCBDb2xvciA9IHtcblxuICBoZXhUb1JnYmE6IGZ1bmN0aW9uKGhleCkge1xuICAgIGhleCA9IGhleC5yZXBsYWNlKCcjJywgJycpO1xuICAgIHZhciByID0gcGFyc2VJbnQoaGV4LnN1YnN0cmluZygwLCAyKSwgMTYpO1xuICAgIHZhciBnID0gcGFyc2VJbnQoaGV4LnN1YnN0cmluZygyLCA0KSwgMTYpO1xuICAgIHZhciBiID0gcGFyc2VJbnQoaGV4LnN1YnN0cmluZyg0LCA2KSwgMTYpO1xuXG4gICAgcmV0dXJuICdyZ2JhKCcgKyByICsgJywnICsgZyArICcsJyArIGIgKyAnLDEpJztcbiAgfSxcblxuICBoZXhUb1JnYmFBcnJheTogZnVuY3Rpb24oaGV4KSB7XG4gICAgaGV4ID0gaGV4LnJlcGxhY2UoJyMnLCAnJyk7XG4gICAgdmFyIHIgPSBwYXJzZUludChoZXguc3Vic3RyaW5nKDAsIDIpLCAxNik7XG4gICAgdmFyIGcgPSBwYXJzZUludChoZXguc3Vic3RyaW5nKDIsIDQpLCAxNik7XG4gICAgdmFyIGIgPSBwYXJzZUludChoZXguc3Vic3RyaW5nKDQsIDYpLCAxNik7XG5cbiAgICBpZiAoaXNOYW4ocikgfHwgaXNOYW4oZykgfHwgaXNOYW4oYikpIHtcbiAgICAgIHJldHVybiBbMCwgMCwgMF07XG4gICAgfVxuXG4gICAgcmV0dXJuIFtyLCBnLCBiXTtcbiAgfSxcblxuICAvKipcbiAgICogQ29udmVydHMgYW4gUkdCIGNvbG9yIHZhbHVlIHRvIEhTTC4gQ29udmVyc2lvbiBmb3JtdWxhXG4gICAqIGFkYXB0ZWQgZnJvbSBodHRwOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0hTTF9jb2xvcl9zcGFjZS5cbiAgICogQXNzdW1lcyByLCBnLCBhbmQgYiBhcmUgY29udGFpbmVkIGluIHRoZSBzZXQgWzAsIDI1NV0gYW5kXG4gICAqIHJldHVybnMgaCwgcywgYW5kIGwgaW4gdGhlIHNldCBbMCwgMV0uXG4gICAqXG4gICAqIEBwYXJhbSAgIE51bWJlciAgciAgICAgICBUaGUgcmVkIGNvbG9yIHZhbHVlXG4gICAqIEBwYXJhbSAgIE51bWJlciAgZyAgICAgICBUaGUgZ3JlZW4gY29sb3IgdmFsdWVcbiAgICogQHBhcmFtICAgTnVtYmVyICBiICAgICAgIFRoZSBibHVlIGNvbG9yIHZhbHVlXG4gICAqIEByZXR1cm4gIEFycmF5ICAgICAgICAgICBUaGUgSFNMIHJlcHJlc2VudGF0aW9uXG4gICAqL1xuICByZ2JUb0hzbGE6IGZ1bmN0aW9uKHJnYikge1xuICAgIGlmICh0eXBlb2YgcmdiID09PSAnc3RyaW5nJykge1xuICAgICAgcmdiID0gcmdiLnJlcGxhY2UoJ3JnYignLCAnJykucmVwbGFjZSgnKScsICcnKS5zcGxpdCgnLCcpO1xuICAgIH1cbiAgICBpZiAoIXJnYi5sZW5ndGgpIHtcbiAgICAgIHJnYiA9IFswLCAwLCAwXTtcbiAgICB9XG4gICAgdmFyIHIgPSByZ2JbMF0gLyAyNTU7XG4gICAgdmFyIGcgPSByZ2JbMV0gLyAyNTU7XG4gICAgdmFyIGIgPSByZ2JbMl0gLyAyNTU7XG4gICAgdmFyIG1heCA9IE1hdGgubWF4KHIsIGcsIGIpO1xuICAgIHZhciBtaW4gPSBNYXRoLm1pbihyLCBnLCBiKTtcbiAgICB2YXIgaDtcbiAgICB2YXIgcztcbiAgICB2YXIgbCA9IChtYXggKyBtaW4pIC8gMjtcblxuICAgIGlmIChtYXggPT09IG1pbikge1xuICAgICAgaCA9IHMgPSAwOyAvLyBhY2hyb21hdGljXG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBkID0gbWF4IC0gbWluO1xuICAgICAgcyA9IGwgPiAwLjUgPyBkIC8gKDIgLSBtYXggLSBtaW4pIDogZCAvIChtYXggKyBtaW4pO1xuICAgICAgc3dpdGNoIChtYXgpe1xuICAgICAgICBjYXNlIHI6IGggPSAoZyAtIGIpIC8gZCArIChnIDwgYiA/IDYgOiAwKTsgYnJlYWs7XG4gICAgICAgIGNhc2UgZzogaCA9IChiIC0gcikgLyBkICsgMjsgYnJlYWs7XG4gICAgICAgIGNhc2UgYjogaCA9IChyIC0gZykgLyBkICsgNDsgYnJlYWs7XG4gICAgICB9XG4gICAgICBoIC89IDY7XG4gICAgfVxuXG4gICAgcmV0dXJuICdoc2xhKCcgKyBNYXRoLnJvdW5kKGggKiAzNjApICsgJywnICsgTWF0aC5yb3VuZChzICogMTAwKSArICclLCcgKyBNYXRoLnJvdW5kKGwgKiAxMDApICsgJyUsMSknO1xuICB9LFxuXG4gIGhzbGFBZGp1c3RBbHBoYTogZnVuY3Rpb24oY29sb3IsIGFscGhhKSB7XG4gICAgY29sb3IgPSBjb2xvci5zcGxpdCgnLCcpO1xuXG4gICAgaWYgKHR5cGVvZiBhbHBoYSAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgY29sb3JbM10gPSBhbHBoYTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29sb3JbM10gPSBhbHBoYShwYXJzZUludChjb2xvclszXSkpO1xuICAgIH1cblxuICAgIGNvbG9yWzNdICs9ICcpJztcbiAgICByZXR1cm4gY29sb3Iuam9pbignLCcpO1xuICB9LFxuXG4gIGhzbGFBZGp1c3RMaWdodG5lc3M6IGZ1bmN0aW9uKGNvbG9yLCBsaWdodG5lc3MpIHtcbiAgICBjb2xvciA9IGNvbG9yLnNwbGl0KCcsJyk7XG5cbiAgICBpZiAodHlwZW9mIGxpZ2h0bmVzcyAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgY29sb3JbMl0gPSBsaWdodG5lc3M7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbG9yWzJdID0gbGlnaHRuZXNzKHBhcnNlSW50KGNvbG9yWzJdKSk7XG4gICAgfVxuXG4gICAgY29sb3JbMl0gKz0gJyUnO1xuICAgIHJldHVybiBjb2xvci5qb2luKCcsJyk7XG4gIH0sXG5cbiAgcmdiVG9IZXg6IGZ1bmN0aW9uKHJnYikge1xuICAgIGlmICh0eXBlb2YgcmdiID09PSAnc3RyaW5nJykge1xuICAgICAgcmdiID0gcmdiLnJlcGxhY2UoJ3JnYignLCAnJykucmVwbGFjZSgnKScsICcnKS5zcGxpdCgnLCcpO1xuICAgIH1cbiAgICByZ2IgPSByZ2IubWFwKGZ1bmN0aW9uKHgpIHtcbiAgICAgIHggPSBwYXJzZUludCh4KS50b1N0cmluZygxNik7XG4gICAgICByZXR1cm4gKHgubGVuZ3RoID09PSAxKSA/ICcwJyArIHggOiB4O1xuICAgIH0pO1xuICAgIHJldHVybiByZ2Iuam9pbignJyk7XG4gIH0sXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IENvbG9yO1xuIiwiY29uc3QgQ29sb3IgPSByZXF1aXJlKCcuL2NvbG9yJyk7XG5cbi8qKlxuICogUmVwcmVzZW50cyBhIHBvaW50XG4gKiBAY2xhc3NcbiAqL1xuY2xhc3MgUG9pbnQge1xuICAvKipcbiAgICogUG9pbnQgY29uc2lzdHMgeCBhbmQgeVxuICAgKiBAY29uc3RydWN0b3JcbiAgICogQHBhcmFtIHtOdW1iZXJ9IHhcbiAgICogQHBhcmFtIHtOdW1iZXJ9IHlcbiAgICogb3I6XG4gICAqIEBwYXJhbSB7TnVtYmVyW119IHhcbiAgICogd2hlcmUgeCBpcyBsZW5ndGgtMiBhcnJheVxuICAgKi9cbiAgY29uc3RydWN0b3IoeCwgeSkge1xuICAgIGlmIChBcnJheS5pc0FycmF5KHgpKSB7XG4gICAgICB5ID0geFsxXTtcbiAgICAgIHggPSB4WzBdO1xuICAgIH1cbiAgICB0aGlzLnggPSB4O1xuICAgIHRoaXMueSA9IHk7XG4gICAgdGhpcy5yYWRpdXMgPSAxO1xuICAgIHRoaXMuY29sb3IgPSAnYmxhY2snO1xuICB9XG5cbiAgLy8gZHJhdyB0aGUgcG9pbnRcbiAgcmVuZGVyKGN0eCwgY29sb3IpIHtcbiAgICBjdHguYmVnaW5QYXRoKCk7XG4gICAgY3R4LmFyYyh0aGlzLngsIHRoaXMueSwgdGhpcy5yYWRpdXMsIDAsIDIgKiBNYXRoLlBJLCBmYWxzZSk7XG4gICAgY3R4LmZpbGxTdHlsZSA9IGNvbG9yIHx8IHRoaXMuY29sb3I7XG4gICAgY3R4LmZpbGwoKTtcbiAgICBjdHguY2xvc2VQYXRoKCk7XG4gIH1cblxuICAvLyBjb252ZXJ0cyB0byBzdHJpbmdcbiAgLy8gcmV0dXJucyBzb21ldGhpbmcgbGlrZTpcbiAgLy8gXCIoWCxZKVwiXG4gIC8vIHVzZWQgaW4gdGhlIHBvaW50bWFwIHRvIGRldGVjdCB1bmlxdWUgcG9pbnRzXG4gIHRvU3RyaW5nKCkge1xuICAgIHJldHVybiAnKCcgKyB0aGlzLnggKyAnLCcgKyB0aGlzLnkgKyAnKSc7XG4gIH1cblxuICAvLyBncmFiIHRoZSBjb2xvciBvZiB0aGUgY2FudmFzIGF0IHRoZSBwb2ludFxuICAvLyByZXF1aXJlcyBpbWFnZWRhdGEgZnJvbSBjYW52YXMgc28gd2UgZG9udCBncmFiXG4gIC8vIGVhY2ggcG9pbnQgaW5kaXZpZHVhbGx5LCB3aGljaCBpcyByZWFsbHkgZXhwZW5zaXZlXG4gIGNhbnZhc0NvbG9yQXRQb2ludChpbWFnZURhdGEsIGNvbG9yU3BhY2UpIHtcbiAgICBjb2xvclNwYWNlID0gY29sb3JTcGFjZSB8fCAnaHNsYSc7XG4gICAgLy8gb25seSBmaW5kIHRoZSBjYW52YXMgY29sb3IgaWYgd2UgZG9udCBhbHJlYWR5IGtub3cgaXRcbiAgICBpZiAoIXRoaXMuX2NhbnZhc0NvbG9yKSB7XG4gICAgICAvLyBpbWFnZURhdGEgYXJyYXkgaXMgZmxhdCwgZ29lcyBieSByb3dzIHRoZW4gY29scywgZm91ciB2YWx1ZXMgcGVyIHBpeGVsXG4gICAgICB2YXIgaWR4ID0gKE1hdGguZmxvb3IodGhpcy55KSAqIGltYWdlRGF0YS53aWR0aCAqIDQpICsgKE1hdGguZmxvb3IodGhpcy54KSAqIDQpO1xuXG4gICAgICBpZiAoY29sb3JTcGFjZSA9PT0gJ2hzbGEnKSB7XG4gICAgICAgIHRoaXMuX2NhbnZhc0NvbG9yID0gQ29sb3IucmdiVG9Ic2xhKEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGltYWdlRGF0YS5kYXRhLCBpZHgsIGlkeCArIDQpKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuX2NhbnZhc0NvbG9yID0gJ3JnYignICsgQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoaW1hZ2VEYXRhLmRhdGEsIGlkeCwgaWR4ICsgMykuam9pbigpICsgJyknO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdGhpcy5fY2FudmFzQ29sb3I7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9jYW52YXNDb2xvcjtcbiAgfVxuXG4gIGdldENvb3JkcygpIHtcbiAgICByZXR1cm4gW3RoaXMueCwgdGhpcy55XTtcbiAgfVxuXG4gIC8vIGRpc3RhbmNlIHRvIGFub3RoZXIgcG9pbnRcbiAgZ2V0RGlzdGFuY2VUbyhwb2ludCkge1xuICAgIC8vIOKImih4MuKIkngxKTIrKHky4oiSeTEpMlxuICAgIHJldHVybiBNYXRoLnNxcnQoTWF0aC5wb3codGhpcy54IC0gcG9pbnQueCwgMikgKyBNYXRoLnBvdyh0aGlzLnkgLSBwb2ludC55LCAyKSk7XG4gIH1cblxuICAvLyBzY2FsZSBwb2ludHMgZnJvbSBbQSwgQl0gdG8gW0MsIERdXG4gIC8vIHhBID0+IG9sZCB4IG1pbiwgeEIgPT4gb2xkIHggbWF4XG4gIC8vIHlBID0+IG9sZCB5IG1pbiwgeUIgPT4gb2xkIHkgbWF4XG4gIC8vIHhDID0+IG5ldyB4IG1pbiwgeEQgPT4gbmV3IHggbWF4XG4gIC8vIHlDID0+IG5ldyB5IG1pbiwgeUQgPT4gbmV3IHkgbWF4XG4gIHJlc2NhbGUoeEEsIHhCLCB5QSwgeUIsIHhDLCB4RCwgeUMsIHlEKSB7XG4gICAgLy8gTmV3VmFsdWUgPSAoKChPbGRWYWx1ZSAtIE9sZE1pbikgKiBOZXdSYW5nZSkgLyBPbGRSYW5nZSkgKyBOZXdNaW5cblxuICAgIHZhciB4T2xkUmFuZ2UgPSB4QiAtIHhBO1xuICAgIHZhciB5T2xkUmFuZ2UgPSB5QiAtIHlBO1xuXG4gICAgdmFyIHhOZXdSYW5nZSA9IHhEIC0geEM7XG4gICAgdmFyIHlOZXdSYW5nZSA9IHlEIC0geUM7XG5cbiAgICB0aGlzLnggPSAoKCh0aGlzLnggLSB4QSkgKiB4TmV3UmFuZ2UpIC8geE9sZFJhbmdlKSArIHhDO1xuICAgIHRoaXMueSA9ICgoKHRoaXMueSAtIHlBKSAqIHlOZXdSYW5nZSkgLyB5T2xkUmFuZ2UpICsgeUM7XG4gIH1cblxuICByZXNldENvbG9yKCkge1xuICAgIHRoaXMuX2NhbnZhc0NvbG9yID0gdW5kZWZpbmVkO1xuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gUG9pbnQ7XG4iLCJjb25zdCBQb2ludCA9IHJlcXVpcmUoJy4vcG9pbnQnKTtcblxuLyoqXG4gKiBSZXByZXNlbnRzIGEgcG9pbnRcbiAqIEBjbGFzc1xuICovXG5jbGFzcyBQb2ludE1hcCB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHRoaXMuX21hcCA9IHt9O1xuICB9XG5cbiAgLy8gYWRkcyBwb2ludCB0byBtYXBcbiAgYWRkKHBvaW50KSB7XG4gICAgdGhpcy5fbWFwW3BvaW50LnRvU3RyaW5nKCldID0gdHJ1ZTtcbiAgfVxuXG4gIC8vIGFkZHMgeCwgeSBjb29yZCB0byBtYXBcbiAgYWRkQ29vcmQoeCwgeSkge1xuICAgIHRoaXMuYWRkKG5ldyBQb2ludCh4LCB5KSk7XG4gIH1cblxuICAvLyByZW1vdmVzIHBvaW50IGZyb20gbWFwXG4gIHJlbW92ZShwb2ludCkge1xuICAgIHRoaXMuX21hcFtwb2ludC50b1N0cmluZygpXSA9IGZhbHNlO1xuICB9XG5cbiAgLy8gcmVtb3ZlcyB4LCB5IGNvb3JkIGZyb20gbWFwXG4gIHJlbW92ZUNvb3JkKHgsIHkpIHtcbiAgICB0aGlzLnJlbW92ZShuZXcgUG9pbnQoeCwgeSkpO1xuICB9XG5cbiAgLy8gY2xlYXJzIHRoZSBtYXBcbiAgY2xlYXIoKSB7XG4gICAgdGhpcy5fbWFwID0ge307XG4gIH1cblxuICAvKipcbiAgICogZGV0ZXJtaW5lcyBpZiBwb2ludCBoYXMgYmVlblxuICAgKiBhZGRlZCB0byBtYXAgYWxyZWFkeVxuICAgKiAgQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBleGlzdHMocG9pbnQpIHtcbiAgICByZXR1cm4gdGhpcy5fbWFwW3BvaW50LnRvU3RyaW5nKCldID8gdHJ1ZSA6IGZhbHNlO1xuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gUG9pbnRNYXA7XG4iLCJmdW5jdGlvbiBwb2x5ZmlsbHMoKSB7XG4gIC8vIHBvbHlmaWxsIGZvciBPYmplY3QuYXNzaWduXG4gIGlmICh0eXBlb2YgT2JqZWN0LmFzc2lnbiAhPT0gJ2Z1bmN0aW9uJykge1xuICAgIE9iamVjdC5hc3NpZ24gPSBmdW5jdGlvbih0YXJnZXQpIHtcbiAgICAgIGlmICh0YXJnZXQgPT09IHVuZGVmaW5lZCB8fCB0YXJnZXQgPT09IG51bGwpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQ2Fubm90IGNvbnZlcnQgdW5kZWZpbmVkIG9yIG51bGwgdG8gb2JqZWN0Jyk7XG4gICAgICB9XG5cbiAgICAgIHZhciBvdXRwdXQgPSBPYmplY3QodGFyZ2V0KTtcbiAgICAgIGZvciAodmFyIGluZGV4ID0gMTsgaW5kZXggPCBhcmd1bWVudHMubGVuZ3RoOyBpbmRleCsrKSB7XG4gICAgICAgIHZhciBzb3VyY2UgPSBhcmd1bWVudHNbaW5kZXhdO1xuICAgICAgICBpZiAoc291cmNlICE9PSB1bmRlZmluZWQgJiYgc291cmNlICE9PSBudWxsKSB7XG4gICAgICAgICAgZm9yICh2YXIgbmV4dEtleSBpbiBzb3VyY2UpIHtcbiAgICAgICAgICAgIGlmIChzb3VyY2UuaGFzT3duUHJvcGVydHkobmV4dEtleSkpIHtcbiAgICAgICAgICAgICAgb3V0cHV0W25leHRLZXldID0gc291cmNlW25leHRLZXldO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIG91dHB1dDtcbiAgICB9O1xuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gcG9seWZpbGxzO1xuIiwiY29uc3QgUG9pbnQgPSByZXF1aXJlKCcuL3BvaW50Jyk7XG5cbmNvbnN0IFJhbmRvbSA9IHtcbiAgLy8gaGV5IGxvb2sgYSBjbG9zdXJlXG4gIC8vIHJldHVybnMgZnVuY3Rpb24gZm9yIHJhbmRvbSBudW1iZXJzIHdpdGggcHJlLXNldCBtYXggYW5kIG1pblxuICByYW5kb21OdW1iZXJGdW5jdGlvbjogZnVuY3Rpb24obWF4LCBtaW4pIHtcbiAgICBtaW4gPSBtaW4gfHwgMDtcbiAgICBpZiAobWluID4gbWF4KSB7XG4gICAgICB2YXIgdGVtcCA9IG1heDtcbiAgICAgIG1heCA9IG1pbjtcbiAgICAgIG1pbiA9IHRlbXA7XG4gICAgfVxuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAobWF4IC0gbWluICsgMSkpICsgbWluO1xuICAgIH07XG4gIH0sXG5cbiAgLy8gcmV0dXJucyBhIHJhbmRvbSBudW1iZXJcbiAgLy8gYmV0d2VlbiB0aGUgbWF4IGFuZCBtaW5cbiAgcmFuZG9tQmV0d2VlbjogZnVuY3Rpb24obWF4LCBtaW4pIHtcbiAgICBtaW4gPSBtaW4gfHwgMDtcbiAgICByZXR1cm4gUmFuZG9tLnJhbmRvbU51bWJlckZ1bmN0aW9uKG1heCwgbWluKSgpO1xuICB9LFxuXG4gIHJhbmRvbUluQ2lyY2xlOiBmdW5jdGlvbihyYWRpdXMsIG94LCBveSkge1xuICAgIHZhciBhbmdsZSA9IE1hdGgucmFuZG9tKCkgKiBNYXRoLlBJICogMjtcbiAgICB2YXIgcmFkID0gTWF0aC5zcXJ0KE1hdGgucmFuZG9tKCkpICogcmFkaXVzO1xuICAgIHZhciB4ID0gb3ggKyByYWQgKiBNYXRoLmNvcyhhbmdsZSk7XG4gICAgdmFyIHkgPSBveSArIHJhZCAqIE1hdGguc2luKGFuZ2xlKTtcblxuICAgIHJldHVybiBuZXcgUG9pbnQoeCwgeSk7XG4gIH0sXG5cbiAgcmFuZG9tUmdiOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gJ3JnYignICsgUmFuZG9tLnJhbmRvbUJldHdlZW4oMjU1KSArICcsJyArXG4gICAgICAgICAgICAgICAgICAgICBSYW5kb20ucmFuZG9tQmV0d2VlbigyNTUpICsgJywnICtcbiAgICAgICAgICAgICAgICAgICAgIFJhbmRvbS5yYW5kb21CZXR3ZWVuKDI1NSkgKyAnKSc7XG4gIH0sXG5cbiAgcmFuZG9tUmdiYTogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuICdyZ2JhKCcgKyBSYW5kb20ucmFuZG9tQmV0d2VlbigyNTUpICsgJywnICtcbiAgICAgICAgICAgICAgICAgICAgIFJhbmRvbS5yYW5kb21CZXR3ZWVuKDI1NSkgKyAnLCcgK1xuICAgICAgICAgICAgICAgICAgICAgUmFuZG9tLnJhbmRvbUJldHdlZW4oMjU1KSArICcsIDEpJztcbiAgfSxcblxuICByYW5kb21Ic2xhOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gJ2hzbGEoJyArIFJhbmRvbS5yYW5kb21CZXR3ZWVuKDM2MCkgKyAnLCcgK1xuICAgICAgICAgICAgICAgICAgICAgUmFuZG9tLnJhbmRvbUJldHdlZW4oMTAwKSArICclLCcgK1xuICAgICAgICAgICAgICAgICAgICAgUmFuZG9tLnJhbmRvbUJldHdlZW4oMTAwKSArICclLCAxKSc7XG4gIH0sXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFJhbmRvbTtcbiIsImNvbnN0IFBvaW50ID0gcmVxdWlyZSgnLi9wb2ludCcpO1xuXG4vKipcbiAqIFJlcHJlc2VudHMgYSB0cmlhbmdsZVxuICogQGNsYXNzXG4gKi9cbmNsYXNzIFRyaWFuZ2xlIHtcbiAgLyoqXG4gICAqIFRyaWFuZ2xlIGNvbnNpc3RzIG9mIHRocmVlIFBvaW50c1xuICAgKiBAY29uc3RydWN0b3JcbiAgICogQHBhcmFtIHtPYmplY3R9IGFcbiAgICogQHBhcmFtIHtPYmplY3R9IGJcbiAgICogQHBhcmFtIHtPYmplY3R9IGNcbiAgICovXG4gIGNvbnN0cnVjdG9yKGEsIGIsIGMpIHtcbiAgICB0aGlzLnAxID0gdGhpcy5hID0gYTtcbiAgICB0aGlzLnAyID0gdGhpcy5iID0gYjtcbiAgICB0aGlzLnAzID0gdGhpcy5jID0gYztcblxuICAgIHRoaXMuY29sb3IgPSAnYmxhY2snO1xuICAgIHRoaXMuc3Ryb2tlID0gJ2JsYWNrJztcbiAgfVxuXG4gIC8vIGRyYXcgdGhlIHRyaWFuZ2xlIHdpdGggZGlmZmVyaW5nIGVkZ2UgY29sb3JzIG9wdGlvbmFsXG4gIHJlbmRlcihjdHgsIGNvbG9yLCBzdHJva2UpIHtcbiAgICBjdHguYmVnaW5QYXRoKCk7XG4gICAgY3R4Lm1vdmVUbyh0aGlzLmEueCwgdGhpcy5hLnkpO1xuICAgIGN0eC5saW5lVG8odGhpcy5iLngsIHRoaXMuYi55KTtcbiAgICBjdHgubGluZVRvKHRoaXMuYy54LCB0aGlzLmMueSk7XG4gICAgY3R4LmNsb3NlUGF0aCgpO1xuICAgIGN0eC5zdHJva2VTdHlsZSA9IHN0cm9rZSB8fCB0aGlzLnN0cm9rZSB8fCB0aGlzLmNvbG9yO1xuICAgIC8vIHZhciBncmFkaWVudCA9IGN0eC5jcmVhdGVMaW5lYXJHcmFkaWVudCh0aGlzLmEueCwgdGhpcy5hLnksIHRoaXMuYi54LCB0aGlzLmIueSk7XG4gICAgLy8gZ3JhZGllbnQuYWRkQ29sb3JTdG9wKDAsIGNvbG9yIHx8IHRoaXMuY29sb3IpO1xuICAgIC8vIGdyYWRpZW50LmFkZENvbG9yU3RvcCgxLCAnd2hpdGUnKTtcbiAgICBjdHguZmlsbFN0eWxlID0gY29sb3IgfHwgdGhpcy5jb2xvcjtcbiAgICBpZiAoY29sb3IgIT09IGZhbHNlICYmIHN0cm9rZSAhPT0gZmFsc2UpIHtcbiAgICAgIC8vIGRyYXcgdGhlIHN0cm9rZSB1c2luZyB0aGUgZmlsbCBjb2xvciBmaXJzdFxuICAgICAgLy8gc28gdGhhdCB0aGUgcG9pbnRzIG9mIGFkamFjZW50IHRyaWFuZ2xlc1xuICAgICAgLy8gZG9udCBvdmVybGFwIGEgYnVuY2ggYW5kIGxvb2sgXCJzdGFycnlcIlxuICAgICAgdmFyIHRlbXBTdHJva2UgPSBjdHguc3Ryb2tlU3R5bGU7XG4gICAgICBjdHguc3Ryb2tlU3R5bGUgPSBjdHguZmlsbFN0eWxlO1xuICAgICAgY3R4LnN0cm9rZSgpO1xuICAgICAgY3R4LnN0cm9rZVN0eWxlID0gdGVtcFN0cm9rZTtcbiAgICB9XG4gICAgaWYgKGNvbG9yICE9PSBmYWxzZSkge1xuICAgICAgY3R4LmZpbGwoKTtcbiAgICB9XG4gICAgaWYgKHN0cm9rZSAhPT0gZmFsc2UpIHtcbiAgICAgIGN0eC5zdHJva2UoKTtcbiAgICB9XG4gICAgY3R4LmNsb3NlUGF0aCgpO1xuICB9XG5cbiAgLy8gcmFuZG9tIHBvaW50IGluc2lkZSB0cmlhbmdsZVxuICByYW5kb21JbnNpZGUoKSB7XG4gICAgdmFyIHIxID0gTWF0aC5yYW5kb20oKTtcbiAgICB2YXIgcjIgPSBNYXRoLnJhbmRvbSgpO1xuICAgIHZhciB4ID0gKDEgLSBNYXRoLnNxcnQocjEpKSAqXG4gICAgICAgICAgICB0aGlzLnAxLnggKyAoTWF0aC5zcXJ0KHIxKSAqXG4gICAgICAgICAgICAoMSAtIHIyKSkgKlxuICAgICAgICAgICAgdGhpcy5wMi54ICsgKE1hdGguc3FydChyMSkgKiByMikgKlxuICAgICAgICAgICAgdGhpcy5wMy54O1xuICAgIHZhciB5ID0gKDEgLSBNYXRoLnNxcnQocjEpKSAqXG4gICAgICAgICAgICB0aGlzLnAxLnkgKyAoTWF0aC5zcXJ0KHIxKSAqXG4gICAgICAgICAgICAoMSAtIHIyKSkgKlxuICAgICAgICAgICAgdGhpcy5wMi55ICsgKE1hdGguc3FydChyMSkgKiByMikgKlxuICAgICAgICAgICAgdGhpcy5wMy55O1xuICAgIHJldHVybiBuZXcgUG9pbnQoeCwgeSk7XG4gIH1cblxuICBjb2xvckF0Q2VudHJvaWQoaW1hZ2VEYXRhKSB7XG4gICAgcmV0dXJuIHRoaXMuY2VudHJvaWQoKS5jYW52YXNDb2xvckF0UG9pbnQoaW1hZ2VEYXRhKTtcbiAgfVxuXG4gIHJlc2V0UG9pbnRDb2xvcnMoKSB7XG4gICAgdGhpcy5jZW50cm9pZCgpLnJlc2V0Q29sb3IoKTtcbiAgICB0aGlzLnAxLnJlc2V0Q29sb3IoKTtcbiAgICB0aGlzLnAyLnJlc2V0Q29sb3IoKTtcbiAgICB0aGlzLnAzLnJlc2V0Q29sb3IoKTtcbiAgfVxuXG4gIGNlbnRyb2lkKCkge1xuICAgIC8vIG9ubHkgY2FsYyB0aGUgY2VudHJvaWQgaWYgd2UgZG9udCBhbHJlYWR5IGtub3cgaXRcbiAgICBpZiAodGhpcy5fY2VudHJvaWQpIHtcbiAgICAgIHJldHVybiB0aGlzLl9jZW50cm9pZDtcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIHggPSBNYXRoLnJvdW5kKCh0aGlzLnAxLnggKyB0aGlzLnAyLnggKyB0aGlzLnAzLngpIC8gMyk7XG4gICAgICB2YXIgeSA9IE1hdGgucm91bmQoKHRoaXMucDEueSArIHRoaXMucDIueSArIHRoaXMucDMueSkgLyAzKTtcbiAgICAgIHRoaXMuX2NlbnRyb2lkID0gbmV3IFBvaW50KHgsIHkpO1xuXG4gICAgICByZXR1cm4gdGhpcy5fY2VudHJvaWQ7XG4gICAgfVxuICB9XG5cbiAgLy8gaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy8xMzMwMDkwNC9kZXRlcm1pbmUtd2hldGhlci1wb2ludC1saWVzLWluc2lkZS10cmlhbmdsZVxuICBwb2ludEluVHJpYW5nbGUocG9pbnQpIHtcbiAgICB2YXIgYWxwaGEgPSAoKHRoaXMucDIueSAtIHRoaXMucDMueSkgKiAocG9pbnQueCAtIHRoaXMucDMueCkgKyAodGhpcy5wMy54IC0gdGhpcy5wMi54KSAqIChwb2ludC55IC0gdGhpcy5wMy55KSkgL1xuICAgICAgICAgICAgICAoKHRoaXMucDIueSAtIHRoaXMucDMueSkgKiAodGhpcy5wMS54IC0gdGhpcy5wMy54KSArICh0aGlzLnAzLnggLSB0aGlzLnAyLngpICogKHRoaXMucDEueSAtIHRoaXMucDMueSkpO1xuICAgIHZhciBiZXRhID0gKCh0aGlzLnAzLnkgLSB0aGlzLnAxLnkpICogKHBvaW50LnggLSB0aGlzLnAzLngpICsgKHRoaXMucDEueCAtIHRoaXMucDMueCkgKiAocG9pbnQueSAtIHRoaXMucDMueSkpIC9cbiAgICAgICAgICAgICAoKHRoaXMucDIueSAtIHRoaXMucDMueSkgKiAodGhpcy5wMS54IC0gdGhpcy5wMy54KSArICh0aGlzLnAzLnggLSB0aGlzLnAyLngpICogKHRoaXMucDEueSAtIHRoaXMucDMueSkpO1xuICAgIHZhciBnYW1tYSA9IDEuMCAtIGFscGhhIC0gYmV0YTtcblxuICAgIHJldHVybiAoYWxwaGEgPiAwICYmIGJldGEgPiAwICYmIGdhbW1hID4gMCk7XG4gIH1cblxuICAvLyBzY2FsZSBwb2ludHMgZnJvbSBbQSwgQl0gdG8gW0MsIERdXG4gIC8vIHhBID0+IG9sZCB4IG1pbiwgeEIgPT4gb2xkIHggbWF4XG4gIC8vIHlBID0+IG9sZCB5IG1pbiwgeUIgPT4gb2xkIHkgbWF4XG4gIC8vIHhDID0+IG5ldyB4IG1pbiwgeEQgPT4gbmV3IHggbWF4XG4gIC8vIHlDID0+IG5ldyB5IG1pbiwgeUQgPT4gbmV3IHkgbWF4XG4gIHJlc2NhbGVQb2ludHMoeEEsIHhCLCB5QSwgeUIsIHhDLCB4RCwgeUMsIHlEKSB7XG4gICAgdGhpcy5wMS5yZXNjYWxlKHhBLCB4QiwgeUEsIHlCLCB4QywgeEQsIHlDLCB5RCk7XG4gICAgdGhpcy5wMi5yZXNjYWxlKHhBLCB4QiwgeUEsIHlCLCB4QywgeEQsIHlDLCB5RCk7XG4gICAgdGhpcy5wMy5yZXNjYWxlKHhBLCB4QiwgeUEsIHlCLCB4QywgeEQsIHlDLCB5RCk7XG4gICAgLy8gcmVjYWxjdWxhdGUgdGhlIGNlbnRyb2lkXG4gICAgdGhpcy5jZW50cm9pZCgpO1xuICB9XG5cbiAgbWF4WCgpIHtcbiAgICByZXR1cm4gTWF0aC5tYXgodGhpcy5wMS54LCB0aGlzLnAyLngsIHRoaXMucDMueCk7XG4gIH1cblxuICBtYXhZKCkge1xuICAgIHJldHVybiBNYXRoLm1heCh0aGlzLnAxLnksIHRoaXMucDIueSwgdGhpcy5wMy55KTtcbiAgfVxuXG4gIG1pblgoKSB7XG4gICAgcmV0dXJuIE1hdGgubWluKHRoaXMucDEueCwgdGhpcy5wMi54LCB0aGlzLnAzLngpO1xuICB9XG5cbiAgbWluWSgpIHtcbiAgICByZXR1cm4gTWF0aC5taW4odGhpcy5wMS55LCB0aGlzLnAyLnksIHRoaXMucDMueSk7XG4gIH1cblxuICBnZXRQb2ludHMoKSB7XG4gICAgcmV0dXJuIFt0aGlzLnAxLCB0aGlzLnAyLCB0aGlzLnAzXTtcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFRyaWFuZ2xlO1xuIiwiY29uc3QgUHJldHR5RGVsYXVuYXkgID0gcmVxdWlyZSgnLi9QcmV0dHlEZWxhdW5heScpO1xuY29uc3QgQ29sb3IgID0gcmVxdWlyZSgnLi9QcmV0dHlEZWxhdW5heS9jb2xvcicpO1xuY29uc3QgUmFuZG9tID0gcmVxdWlyZSgnLi9QcmV0dHlEZWxhdW5heS9yYW5kb20nKTtcblxuY29uc3QgZWxlbWVudHMgPSByZXF1aXJlKCcuL2RlbW8vZWxlbWVudHMnKTtcblxuLy8gaW5pdGlhbGl6ZSBQcmV0dHlEZWxhdW5heSBvbiB0aGUgY2FudmFcbmNvbnN0IHByZXR0eURlbGF1bmF5ID0gbmV3IFByZXR0eURlbGF1bmF5KGVsZW1lbnRzLmNhbnZhcywge1xuICBvbkRhcmtCYWNrZ3JvdW5kOiAoKSA9PiB7XG4gICAgZWxlbWVudHMubWFpbi5jbGFzc05hbWUgPSAndGhlbWUtbGlnaHQnO1xuICB9LFxuICBvbkxpZ2h0QmFja2dyb3VuZDogKCkgPT4ge1xuICAgIGVsZW1lbnRzLm1haW4uY2xhc3NOYW1lID0gJ3RoZW1lLWRhcmsnO1xuICB9XG59KTtcblxuLy8gaW5pdGlhbCBnZW5lcmF0aW9uXG5yYW5kb21pemUoKTtcblxuLyoqXG4gKiB1dGlsIGZ1bmN0aW9uc1xuICovXG5cbi8vIGdldCBvcHRpb25zIGFuZCByZS1yYW5kb21pemVcbmZ1bmN0aW9uIHJhbmRvbWl6ZSgpIHtcbiAgbGV0IG9wdGlvbnMgPSBnZXRPcHRpb25zKCk7XG4gIHByZXR0eURlbGF1bmF5LnJhbmRvbWl6ZShcbiAgICBvcHRpb25zLm1pblBvaW50cyxcbiAgICBvcHRpb25zLm1heFBvaW50cyxcbiAgICBvcHRpb25zLm1pbkVkZ2VQb2ludHMsXG4gICAgb3B0aW9ucy5tYXhFZGdlUG9pbnRzLFxuICAgIG9wdGlvbnMubWluR3JhZGllbnRzLFxuICAgIG9wdGlvbnMubWF4R3JhZGllbnRzLFxuICAgIG9wdGlvbnMubXVsdGlwbGllcixcbiAgICBvcHRpb25zLmNvbG9ycyxcbiAgICBvcHRpb25zLmltYWdlXG4gICk7XG59XG5cbi8vIGdldCBvcHRpb25zIGZyb20gaW5wdXQgZmllbGRzXG5mdW5jdGlvbiBnZXRPcHRpb25zKCkge1xuICBsZXQgdXNlTXVsdGlwbGllciA9IGVsZW1lbnRzLm11bHRpcGxpZXJSYWRpby5jaGVja2VkO1xuICBsZXQgb3B0aW9ucyA9IHtcbiAgICBtdWx0aXBsaWVyOiBwYXJzZUZsb2F0KGVsZW1lbnRzLm11bHRpcGxpZXJJbnB1dC52YWx1ZSksXG4gICAgbWluUG9pbnRzOiB1c2VNdWx0aXBsaWVyID8gMCA6IHBhcnNlSW50KGVsZW1lbnRzLm1pblBvaW50c0lucHV0LnZhbHVlKSxcbiAgICBtYXhQb2ludHM6IHVzZU11bHRpcGxpZXIgPyAwIDogcGFyc2VJbnQoZWxlbWVudHMubWF4UG9pbnRzSW5wdXQudmFsdWUpLFxuICAgIG1pbkVkZ2VQb2ludHM6IHVzZU11bHRpcGxpZXIgPyAwIDogcGFyc2VJbnQoZWxlbWVudHMubWluRWRnZXNJbnB1dC52YWx1ZSksXG4gICAgbWF4RWRnZVBvaW50czogdXNlTXVsdGlwbGllciA/IDAgOiBwYXJzZUludChlbGVtZW50cy5tYXhFZGdlc0lucHV0LnZhbHVlKSxcbiAgICBtaW5HcmFkaWVudHM6IHBhcnNlSW50KGVsZW1lbnRzLm1pbkdyYWRpZW50c0lucHV0LnZhbHVlKSxcbiAgICBtYXhHcmFkaWVudHM6IHBhcnNlSW50KGVsZW1lbnRzLm1heEdyYWRpZW50c0lucHV0LnZhbHVlKSxcbiAgICBjb2xvcnM6IGdldENvbG9ycygpLFxuICAgIGltYWdlOiBnZXRJbWFnZSgpXG4gIH07XG5cbiAgcmV0dXJuIG9wdGlvbnM7XG59XG5cbmZ1bmN0aW9uIGdldENvbG9ycygpIHtcbiAgdmFyIGNvbG9ycyA9IFtdO1xuXG4gIGlmIChlbGVtZW50cy5jb2xvckNob29zZU9wdGlvbi5jaGVja2VkKSB7XG4gICAgLy8gdXNlIHRoZSBvbmVzIGluIHRoZSBpbnB1dHNcbiAgICBjb2xvcnMgPSBlbGVtZW50cy5jb2xvcklucHV0cy5tYXAoKGlucHV0KSA9PiB7XG4gICAgICBDb2xvci5yZ2JUb0hzbGEoQ29sb3IuaGV4VG9SZ2JhQXJyYXkoaW5wdXQudmFsdWUpKTtcbiAgICB9KTtcbiAgfSBlbHNlIHtcbiAgICAvLyBnZW5lcmF0ZSByYW5kb20gY29sb3JzXG4gICAgY29sb3JzID0gZWxlbWVudHMuY29sb3JJbnB1dHMubWFwKChpbnB1dCkgPT4ge1xuICAgICAgbGV0IHJnYiA9IFJhbmRvbS5yYW5kb21SZ2JhKCkucmVwbGFjZSgncmdiYScsICdyZ2InKS5yZXBsYWNlKC8sXFxzKlxcZChcXC5cXGQrKT9cXCkvLCAnKScpO1xuICAgICAgbGV0IGhzbGEgPSBDb2xvci5yZ2JUb0hzbGEocmdiKTtcbiAgICAgIGxldCBoZXggPSAnIycgKyBDb2xvci5yZ2JUb0hleChyZ2IpO1xuXG4gICAgICBpbnB1dC52YWx1ZSA9IGhleDtcbiAgICAgIGxldCBtYXRjaGluZ0lucHV0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoaW5wdXQuZ2V0QXR0cmlidXRlKCdkYXRhLWNvbG9yLXN5bmMnKSk7XG5cbiAgICAgIGlmIChtYXRjaGluZ0lucHV0KSB7XG4gICAgICAgIG1hdGNoaW5nSW5wdXQudmFsdWUgPSBpbnB1dC52YWx1ZTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGhzbGE7XG4gICAgfSk7XG4gIH1cblxuICByZXR1cm4gY29sb3JzO1xufVxuXG5mdW5jdGlvbiBnZXRJbWFnZSgpIHtcbiAgaWYgKCFlbGVtZW50cy5jb2xvckltYWdlT3B0aW9uLmNoZWNrZWQpIHtcbiAgICByZXR1cm4gJyc7XG4gIH1cblxuICBpZiAoZWxlbWVudHMuaW1hZ2VCYWNrZ3JvdW5kVXBsb2FkT3B0aW9uLmNoZWNrZWQgJiYgZWxlbWVudHMuaW1hZ2VCYWNrZ3JvdW5kVXBsb2FkLmZpbGVzLmxlbmd0aCkge1xuICAgIGxldCBmaWxlID0gZWxlbWVudHMuaW1hZ2VCYWNrZ3JvdW5kVXBsb2FkLmZpbGVzWzBdO1xuICAgIHJldHVybiB3aW5kb3cuVVJMLmNyZWF0ZU9iamVjdFVSTChmaWxlKTtcbiAgfSBlbHNlIGlmIChpbWFnZUJhY2tncm91bmRVUkxPcHRpb24uY2hlY2tlZCkge1xuICAgIHJldHVybiBlbGVtZW50cy5pbWFnZUJhY2tncm91bmRVUkwudmFsdWU7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuICcnO1xuICB9XG59XG5cbi8qKlxuICogc2V0IHVwIGV2ZW50c1xuICovXG5cbi8vIHJlZ2VuZXJhdGUgdGhlIHRyaWFuZ3VsYXRpb24gZW50aXJlbHksIG9yIG9ubHkgdXBkYXRlIHRoZSBjb2xvciwgc2hhcGUsIG9yIHRyaWFuZ2xlc1xuZWxlbWVudHMuc2VjdGlvbnMuZ2VuZXJhdGVCdXR0b25zLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKGV2ZW50KSA9PiB7XG4gIGxldCBidXR0b24gPSBldmVudC50YXJnZXQ7XG5cbiAgaWYgKGJ1dHRvbi5oYXNBdHRyaWJ1dGUoJ2RhdGEtZ2VuZXJhdGUtY29sb3JzJykgJiZcbiAgICAgIGJ1dHRvbi5oYXNBdHRyaWJ1dGUoJ2RhdGEtZ2VuZXJhdGUtZ3JhZGllbnRzJykgJiZcbiAgICAgIGJ1dHRvbi5oYXNBdHRyaWJ1dGUoJ2RhdGEtZ2VuZXJhdGUtdHJpYW5nbGVzJykpIHtcbiAgICByYW5kb21pemUoKTtcbiAgICByZXR1cm47XG4gIH1cblxuICBpZiAoYnV0dG9uLmhhc0F0dHJpYnV0ZSgnZGF0YS1nZW5lcmF0ZS1jb2xvcnMnKSkge1xuICAgIHByZXR0eURlbGF1bmF5LnJlbmRlck5ld0NvbG9ycyhnZXRDb2xvcnMoKSk7XG4gIH1cblxuICBpZiAoYnV0dG9uLmhhc0F0dHJpYnV0ZSgnZGF0YS1nZW5lcmF0ZS1ncmFkaWVudHMnKSkge1xuICAgIGxldCBvcHRpb25zID0gZ2V0T3B0aW9ucygpO1xuICAgIHByZXR0eURlbGF1bmF5LnJlbmRlck5ld0dyYWRpZW50KFxuICAgICAgb3B0aW9ucy5taW5HcmFkaWVudHMsXG4gICAgICBvcHRpb25zLm1heEdyYWRpZW50c1xuICAgICk7XG4gIH1cblxuICBpZiAoYnV0dG9uLmhhc0F0dHJpYnV0ZSgnZGF0YS1nZW5lcmF0ZS10cmlhbmdsZXMnKSkge1xuICAgIGxldCBvcHRpb25zID0gZ2V0T3B0aW9ucygpO1xuICAgIHByZXR0eURlbGF1bmF5LnJlbmRlck5ld1RyaWFuZ2xlcyhcbiAgICAgIG9wdGlvbnMubWluUG9pbnRzLFxuICAgICAgb3B0aW9ucy5tYXhQb2ludHMsXG4gICAgICBvcHRpb25zLm1pbkVkZ2VQb2ludHMsXG4gICAgICBvcHRpb25zLm1heEVkZ2VQb2ludHMsXG4gICAgICBvcHRpb25zLm11bHRpcGxpZXJcbiAgICApO1xuICB9XG59KTtcblxuLy8gdXBkYXRlIHRoZSByZW5kZXIgd2hlbiBvcHRpb25zIGFyZSBjaGFuZ2VkXG5lbGVtZW50cy5zZWN0aW9ucy5yZW5kZXJPcHRpb25zLmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsIChldmVudCkgPT4ge1xuICBsZXQgb3B0aW9ucyA9IE9iamVjdC5rZXlzKGVsZW1lbnRzLnJlbmRlck9wdGlvbnMpO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IG9wdGlvbnMubGVuZ3RoOyBpKyspIHtcbiAgICBsZXQgb3B0aW9uID0gb3B0aW9uc1tpXTtcbiAgICBsZXQgZWxlbWVudCA9IGVsZW1lbnRzLnJlbmRlck9wdGlvbnNbb3B0aW9uXTtcbiAgICBsZXQgdG9nZ2xlRnVuY3Rpb25OYW1lID0gb3B0aW9uLnJlcGxhY2UoJ3Nob3cnLCAndG9nZ2xlJyk7XG4gICAgaWYgKHByZXR0eURlbGF1bmF5W3RvZ2dsZUZ1bmN0aW9uTmFtZV0pIHtcbiAgICAgIHByZXR0eURlbGF1bmF5W3RvZ2dsZUZ1bmN0aW9uTmFtZV0oZWxlbWVudC5jaGVja2VkKTtcbiAgICB9XG4gIH1cbn0pO1xuXG5lbGVtZW50cy5zZWN0aW9ucy5jb2xvcklucHV0cy5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCAoZXZlbnQpID0+IHtcbiAgbGV0IGlucHV0ID0gZXZlbnQudGFyZ2V0O1xuICBsZXQgbWF0Y2hpbmdJbnB1dCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGV2ZW50LnRhcmdldC5nZXRBdHRyaWJ1dGUoJ2RhdGEtY29sb3Itc3luYycpKTtcblxuICBpZiAoIW1hdGNoaW5nSW5wdXQpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICBtYXRjaGluZ0lucHV0LnZhbHVlID0gaW5wdXQudmFsdWU7XG59KTtcblxuLy8gZG9uJ3QgZG8gYW55dGhpbmcgb24gZm9ybSBzdWJtaXRcbmVsZW1lbnRzLmZvcm0uYWRkRXZlbnRMaXN0ZW5lcignc3VibWl0JywgKGV2ZW50KSA9PiB7XG4gIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gIHJldHVybiBmYWxzZTtcbn0pO1xuIiwiLy8gZ3JhYiBET00gZWxlbWVudHNcbmNvbnN0IGVsZW1lbnRzID0ge1xuICBtYWluOiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbWFpbicpLFxuICBmb3JtOiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZm9ybScpLFxuICBjYW52YXM6IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjYW52YXMnKSxcbiAgc2VjdGlvbnM6IHtcbiAgICBnZW5lcmF0ZUJ1dHRvbnM6IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdnZW5lcmF0ZS1idXR0b25zJyksXG4gICAgcmVuZGVyT3B0aW9uczogZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3JlbmRlci1vcHRpb25zJyksXG4gICAgcG9pbnRPcHRpb25zOiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncG9pbnQtb3B0aW9ucycpLFxuICAgIGJhY2tncm91bmRPcHRpb25zOiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFja2dyb3VuZC1vcHRpb25zJyksXG4gICAgY29sb3JJbnB1dHM6IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjb2xvci1pbnB1dHMnKVxuICB9LFxuICByZW5kZXJPcHRpb25zOiB7XG4gICAgc2hvd1RyaWFuZ2xlczogZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3Nob3ctdHJpYW5nbGVzJyksXG4gICAgc2hvd1BvaW50czogZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3Nob3ctcG9pbnRzJyksXG4gICAgc2hvd0NpcmNsZXM6IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdzaG93LWNpcmNsZXMnKSxcbiAgICBzaG93Q2VudHJvaWRzOiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnc2hvdy1jZW50cm9pZHMnKSxcbiAgICBzaG93RWRnZXM6IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdzaG93LWVkZ2VzJyksXG4gICAgc2hvd0hvdmVyOiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnc2hvdy1ob3ZlcicpLFxuICAgIHNob3dBbmltYXRpb246IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdzaG93LWFuaW1hdGlvbicpLFxuICB9LFxuXG4gIG11bHRpcGxpZXJSYWRpbzogZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3BvaW50LWdlbi1vcHRpb24tbXVsdGlwbGllcicpLFxuICBtdWx0aXBsaWVySW5wdXQ6IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdwb2ludHMtbXVsdGlwbGllcicpLFxuXG4gIG1pblBvaW50c0lucHV0OiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbWluLXBvaW50cycpLFxuICBtYXhQb2ludHNJbnB1dDogZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ21heC1wb2ludHMnKSxcblxuICBtaW5FZGdlc0lucHV0OiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbWluLWVkZ2UtcG9pbnRzJyksXG4gIG1heEVkZ2VzSW5wdXQ6IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdtYXgtZWRnZS1wb2ludHMnKSxcblxuICBtaW5HcmFkaWVudHNJbnB1dDogZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ21pbi1ncmFkaWVudHMnKSxcbiAgbWF4R3JhZGllbnRzSW5wdXQ6IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdtYXgtZ3JhZGllbnRzJyksXG5cbiAgaW1hZ2VCYWNrZ3JvdW5kVXBsb2FkT3B0aW9uOiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnaW1hZ2UtYmFja2dyb3VuZC11cGxvYWQtb3B0aW9uJyksXG4gIGltYWdlQmFja2dyb3VuZFVwbG9hZDogZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2ltYWdlLWJhY2tncm91bmQtdXBsb2FkJyksXG4gIGltYWdlQmFja2dyb3VuZFVSTE9wdGlvbjogZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2ltYWdlLWJhY2tncm91bmQtdXJsLW9wdGlvbicpLFxuICBpbWFnZUJhY2tncm91bmRVUkw6IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdpbWFnZS1iYWNrZ3JvdW5kLXVybCcpLFxuXG4gIGNvbG9yUmFuZG9tT3B0aW9uOiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY29sb3ItcmFuZG9tLW9wdGlvbicpLFxuICBjb2xvckNob29zZU9wdGlvbjogZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NvbG9yLWNob29zZS1vcHRpb24nKSxcbiAgY29sb3JJbWFnZU9wdGlvbjogZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NvbG9yLWltYWdlLW9wdGlvbicpLFxuXG4gIGNvbG9ySW5wdXRzOiBbXG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NvbG9yLTEnKSxcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY29sb3ItMicpLFxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjb2xvci0zJylcbiAgXVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBlbGVtZW50cztcbiJdfQ==
