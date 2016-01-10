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

(function() {
  'use strict';

  var Delaunay = require('./_delaunay');
  var Color    = require('./color');
  var Random   = require('./random');
  var Triangle = require('./triangle');
  var Point    = require('./point');
  var PointMap = require('./pointMap');

  /**
   * Represents a delauney triangulation of random points
   * https://en.wikipedia.org/wiki/Delaunay_triangulation
   */
  class PrettyDelaunay {
    /**
     * @constructor
     */
    constructor(canvas, options) {
      // merge given options with defaults
      this.options = Object.assign({}, PrettyDelaunay.defaults(), (options || {}));

      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');

      this.resizeCanvas();
      this.points = [];
      this.colors = this.options.colors;
      this.pointMap = new PointMap();

      this.mousePosition = false;

      if (this.options.hover) {
        this.createShadowCanvas();

        this.canvas.addEventListener('mousemove', (e) => {
          var rect = canvas.getBoundingClientRect();
          this.mousePosition = new Point(e.clientX - rect.left, e.clientY - rect.top);
          this.hover();
        }, false);

        this.canvas.addEventListener('mouseout', () => {
          this.mousePosition = false;
          this.hover();
        }, false);
      }
    }

    static defaults() {
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
        onDarkBackground: function() { return; },
        onLightBackground: function() { return; },

        // triggered when hovered over triangle
        onTriangleHover: function(triangle, ctx, options) {
          var fill = options.hoverColor(triangle.color);
          var stroke = fill;
          triangle.render(ctx, options.showEdges ? fill : false, options.showEdges ? false : stroke);
        },

        // returns hsla color for triangle edge
        // as a function of the triangle fill color
        edgeColor: function(color) {
          color = Color.hslaAdjustLightness(color, function(lightness) {
            return (lightness + 200 - lightness * 2) / 3;
          });
          color = Color.hslaAdjustAlpha(color, 0.25);
          return color;
        },

        // returns hsla color for triangle edge
        // as a function of the triangle fill color
        pointColor: function(color) {
          color = Color.hslaAdjustLightness(color, function(lightness) {
            return (lightness + 200 - lightness * 2) / 3;
          });
          color = Color.hslaAdjustAlpha(color, 1);
          return color;
        },

        // returns hsla color for triangle edge
        // as a function of the triangle fill color
        centroidColor: function(color) {
          color = Color.hslaAdjustLightness(color, function(lightness) {
            return (lightness + 200 - lightness * 2) / 3;
          });
          color = Color.hslaAdjustAlpha(color, 0.25);
          return color;
        },

        // returns hsla color for triangle hover fill
        // as a function of the triangle fill color
        hoverColor: function(color) {
          color = Color.hslaAdjustLightness(color, function(lightness) {
            return 100 - lightness;
          });
          color = Color.hslaAdjustAlpha(color, 0.5);
          return color;
        },
      };
    }

    clear() {
      this.points = [];
      this.triangles = [];
      this.pointMap.clear();
      this.center = new Point(0, 0);
    }

    // clear and create a fresh set of random points
    // all args are optional
    randomize(min, max, minEdge, maxEdge, minGradients, maxGradients, colors) {
      // colors param is optional
      this.colors = colors || this.colors;

      this.resizeCanvas();

      this.generateNewPoints(min, max, minEdge, maxEdge);

      this.triangulate();

      this.generateGradients(minGradients, maxGradients);

      this.render();
    }

    // creates a hidden canvas for hover detection
    createShadowCanvas() {
      this.shadowCanvas = document.createElement('canvas');
      this.canvas.parentElement.appendChild(this.shadowCanvas);
      this.shadowCtx = this.shadowCanvas.getContext('2d');

      this.shadowCanvas.style.display = 'none';
    }

    generateNewPoints(min, max, minEdge, maxEdge) {
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
    generateCornerPoints() {
      this.points.push(new Point(0, 0));
      this.points.push(new Point(0, this.height));
      this.points.push(new Point(this.width, 0));
      this.points.push(new Point(this.width, this.height));
    }

    // add points on the edges
    generateEdgePoints() {
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
    generateRandomPoints(numPoints, x, y, width, height) {
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
    triangulate() {
      this.triangles = [];

      // map point objects to length-2 arrays
      var vertices = this.points.map(function(point) {
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
      this.triangles = this.triangles.map(function(triangle) {
        return new Triangle(new Point(triangle[0]),
                            new Point(triangle[1]),
                            new Point(triangle[2]));
      });
    }

    // create random radial gradient circles for rendering later
    generateGradients(minGradients, maxGradients) {
      this.radialGradients = [];

      minGradients = minGradients > 0 ? minGradients : 1;
      maxGradients = maxGradients > 0 ? maxGradients : 2;

      this.numGradients = Random.randomBetween(minGradients, maxGradients);

      for (var i = 0; i < this.numGradients; i++) {
        this.generateRadialGradient();
      }
    }

    generateRadialGradient() {
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

      var minRadius = Math.ceil(Math.max(this.canvas.height, this.canvas.width) /
                      Math.max(Math.sqrt(this.numGradients), 2));
      var maxRadius = Math.ceil(Math.max(this.canvas.height, this.canvas.width) /
                      Math.max(Math.log(this.numGradients), 1));

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
        while (pointInLastCircle.x < 0 ||
               pointInLastCircle.y < 0 ||
               pointInLastCircle.x > this.canvas.width ||
               pointInLastCircle.y > this.canvas.height) {
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

      this.radialGradients.push({x0, y0, r0, x1, y1, r1, colorStop});
    }

    // sorts the points
    sortPoints() {
      // sort points
      this.points.sort(function(a, b) {
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
    resizeCanvas() {
      var parent = this.canvas.parentElement;
      this.canvas.width = this.width = parent.offsetWidth;
      this.canvas.height = this.height = parent.offsetHeight;

      if (this.shadowCanvas) {
        this.shadowCanvas.width = this.width = parent.offsetWidth;
        this.shadowCanvas.height = this.height = parent.offsetHeight;
      }
    }

    // moves points/triangles based on new size of canvas
    rescale() {
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

    hover() {
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

    resetTriangle() {
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

    render() {
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

    renderExtras() {
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

    renderNewColors(colors) {
      this.colors = colors || this.colors;
      // triangle centroids need new colors
      this.triangulate();
      this.render();
    }

    renderNewGradient(minGradients, maxGradients) {
      this.generateGradients(minGradients, maxGradients);
      this.triangulate();
      this.render();
    }

    renderNewTriangles(min, max, minEdge, maxEdge) {
      this.generateNewPoints(min, max, minEdge, maxEdge);
      this.triangulate();
      this.render();
    }

    renderGradient() {
      for (var i = 0; i < this.radialGradients.length; i++) {
        // create the radial gradient based on
        // the generated circles' radii and origins
        var radialGradient = this.ctx.createRadialGradient(
          this.radialGradients[i].x0,
          this.radialGradients[i].y0,
          this.radialGradients[i].r0,
          this.radialGradients[i].x1,
          this.radialGradients[i].y1,
          this.radialGradients[i].r1
        );

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

    renderTriangles(triangles, edges) {

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
    renderPoints() {
      for (var i = 0; i < this.points.length; i++) {
        var color = this.options.pointColor(this.points[i].canvasColorAtPoint(this.gradientImageData));
        this.points[i].render(this.ctx, color);
      }
    }

    // draws the circles that define the gradients
    renderGradientCircles() {
      for (var i = 0; i < this.radialGradients.length; i++) {
        this.ctx.beginPath();
        this.ctx.arc(this.radialGradients[i].x0,
                this.radialGradients[i].y0,
                this.radialGradients[i].r0,
                0, Math.PI * 2, true);
        var center1 = new Point(this.radialGradients[i].x0, this.radialGradients[i].y0);
        this.ctx.strokeStyle = center1.canvasColorAtPoint(this.gradientImageData);
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.arc(this.radialGradients[i].x1,
                this.radialGradients[i].y1,
                this.radialGradients[i].r1,
                0, Math.PI * 2, true);
        var center2 = new Point(this.radialGradients[i].x1, this.radialGradients[i].y1);
        this.ctx.strokeStyle = center2.canvasColorAtPoint(this.gradientImageData);
        this.ctx.stroke();
      }
    }

    // render triangle centroids
    renderCentroids() {
      for (var i = 0; i < this.triangles.length; i++) {
        var color = this.options.centroidColor(this.triangles[i].colorAtCentroid(this.gradientImageData));
        this.triangles[i].centroid().render(this.ctx, color);
      }
    }

    toggleTriangles() {
      this.options.showTriangles = !this.options.showTriangles;
      this.render();
    }

    togglePoints() {
      this.options.showPoints = !this.options.showPoints;
      this.render();
    }

    toggleCircles() {
      this.options.showCircles = !this.options.showCircles;
      this.render();
    }

    toggleCentroids() {
      this.options.showCentroids = !this.options.showCentroids;
      this.render();
    }

    toggleEdges() {
      this.options.showEdges = !this.options.showEdges;
      this.render();
    }
  }

  window.PrettyDelaunay = PrettyDelaunay;
})();
