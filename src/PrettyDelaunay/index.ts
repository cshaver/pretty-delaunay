// @ts-ignore
import Delaunay from 'delaunay-fast';

import Color from './color';
import Random from './random';
import Triangle from './triangle';
import Point from './point';
import PointMap from './pointMap';
import polyfills from './polyfills';

polyfills();

interface RadialGradient {
  x0: number;
  y0: number;
  r0: number;
  x1: number;
  y1: number;
  r1: number;
  colorStop: number;
}

interface PrettyDelaunayOptions {
  // shows triangles - false will show the gradient behind
  showTriangles: boolean;

  // show the points that make the triangulation
  showPoints: boolean;

  // show the circles that define the gradient locations, sizes
  showCircles: boolean;

  // show triangle centroids
  showCentroids: boolean;

  // show triangle edges
  showEdges: boolean;

  // highlight hovered triangles
  hover: boolean;

  // multiplier for the number of points generated based on canvas size
  multiplier: number;

  // whether to animate the gradients behind the triangles
  animate: boolean;

  // number of frames per gradient color cycle
  loopFrames: number;


  // colors to use in the gradient
  colors: [string, string, string],


  // randomly choose from color palette on randomize if not supplied colors
  colorPalette?: string[];


  // use image as background instead of gradient
  // default: false
  imageAsBackground: boolean;

  // image to use as background
  imageURL?: string,

  // how to resize the points
  // defaults to 'scalePoints'
  resizeMode: 'scalePoints' | 'newPoints',
  // 'newPoints' - generates a new set of points for the new size
  // 'scalePoints' - linearly scales existing points and re-triangulates

  // events triggered when the center of the background
  // is greater or less than 50 lightness in hsla
  // intended to adjust some text that is on top
  // color is the color of the center of the canvas
  onDarkBackground: (centerColor: string) => void;
  onLightBackground: (centerColor: string) => void;

  gradient: {
    minX: (width: number, height: number) => number,
    maxX: (width: number, height: number) => number,
    minY: (width: number, height: number) => number,
    maxY: (width: number, height: number) => number,
    minRadius: (width: number, height: number, numGradients: number) => number,
    maxRadius: (width: number, height: number, numGradients: number) => number,
    connected: boolean;
  };

  minGradients: number,
  maxGradients: number,

  // triggered when hovered over triangle
  onTriangleHover: (triangle: Triangle, ctx: CanvasRenderingContext2D, options: PrettyDelaunayOptions) => void;

  // returns hsla color for triangle edge
  // as a function of the triangle fill color
  edgeColor: (color: string) => string;

  // returns hsla color for triangle point
  // as a function of the triangle fill color
  pointColor: (color: string) => string;

  // returns hsla color for triangle centroid
  // as a function of the triangle fill color
  centroidColor: (color: string) => string;

  // returns hsla color for triangle hover fill
  // as a function of the triangle fill color
  hoverColor: (color: string) => string;
}

/**
* Represents a Delaunay triangulation of random points
* https://en.wikipedia.org/wiki/Delaunay_triangulation
*/
export default class PrettyDelaunay {

  options: PrettyDelaunayOptions;

  ctx: CanvasRenderingContext2D;
  canvas: HTMLCanvasElement;

  renderedImageData: ImageData;
  shadowImageData: ImageData;

  hoverShadowCanvas: HTMLCanvasElement = document.createElement('canvas');
  shadowCtx: CanvasRenderingContext2D = this.hoverShadowCanvas.getContext('2d')!;

  // shadowCtx?: CanvasRenderingContext2D;
  // hoverShadowCanvas?: HTMLCanvasElement;

  mousePosition?: Point; // set on mousemove
  image?: HTMLImageElement; // set by loadImageBackground

  // geometry
  pointMap: PointMap = new PointMap();
  center: Point;
  points: Point[] = [];
  colors: PrettyDelaunayOptions['colors'];
  triangles: Triangle[];
  width: number;
  height: number;
  gradientImageData: ImageData;

  radialGradients: RadialGradient[] = [];
  // for animation
  nextGradients: RadialGradient[] = [];
  currentGradients: RadialGradient[] = [];

  // animation state
  resizing?: boolean;
  looping?: boolean;
  frameSteps: number = 0;
  frame: number = 0;

  // generateNewPoints
  numPoints: number;
  getNumEdgePoints: () => number;
  numGradients: number;

  lastTriangle?: number;


  /**
   * @constructor
   */
  constructor(canvas: HTMLCanvasElement, options?: Partial<PrettyDelaunayOptions>) {
    // merge options with defaults
    const defaults = PrettyDelaunay.defaults();
    this.options = {
      ...defaults,
      ...options,
      gradient: {
        ...defaults.gradient,
        ...options?.gradient,
      },
    };

    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.hoverShadowCanvas.style.display = 'none';

    this.resizeCanvas();
    this.colors = this.options.colors;

    if (this.options.hover) {
      this.initHover();
    }

    // throttled window resize
    this.resizing = false;
    window.addEventListener('resize', ()=> {
      if (this.resizing) {
        return;
      }
      this.resizing = true;
      requestAnimationFrame(() => {
        this.rescale();
        this.resizing = false;
      });
    });

    this.randomize();
  }

  static defaults(): PrettyDelaunayOptions {
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
      colorPalette: undefined,

      // use image as background instead of gradient
      imageAsBackground: false,

      // image to use as background
      imageURL: undefined,

      // how to resize the points
      // 'newPoints' - generates a new set of points for the new size
      // 'scalePoints' - linearly scales existing points and re-triangulates
      resizeMode: 'scalePoints',

      // events triggered when the center of the background
      // is greater or less than 50 lightness in hsla
      // intended to adjust some text that is on top
      // color is the color of the center of the canvas
      onDarkBackground: function() { return; },
      onLightBackground: function() { return; },

      gradient: {
        minX: (width, height) => Math.ceil(Math.sqrt(width)),
        maxX: (width, height) => Math.ceil(width - Math.sqrt(width)),
        minY: (width, height) => Math.ceil(Math.sqrt(height)),
        maxY: (width, height) => Math.ceil(height - Math.sqrt(height)),
        minRadius: (width, height, numGradients) => Math.ceil(Math.max(height, width) / Math.max(Math.sqrt(numGradients), 2)),
        maxRadius: (width, height, numGradients) => Math.ceil(Math.max(height, width) / Math.max(Math.log(numGradients), 1)),
        connected: true
      },

      minGradients: 1,
      maxGradients: 2,

      // triggered when hovered over triangle
      onTriangleHover: function(triangle, ctx, options) {
        var fill = options.hoverColor(triangle.color);
        var stroke = fill;
        triangle.render(ctx, options.showEdges ? fill : undefined, options.showEdges ? undefined : stroke);
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

      // returns hsla color for triangle point
      // as a function of the triangle fill color
      pointColor: function(color) {
        color = Color.hslaAdjustLightness(color, function(lightness) {
          return (lightness + 200 - lightness * 2) / 3;
        });
        color = Color.hslaAdjustAlpha(color, 1);
        return color;
      },

      // returns hsla color for triangle centroid
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

  clear(): void {
    this.points = [];
    this.triangles = [];
    this.pointMap.clear();
    this.center = new Point(0, 0);
  }

  // clear and create a fresh set of random points
  // all args are optional
  randomize(
    min?: number,
    max?: number,
    minEdge?: number,
    maxEdge?: number,
    minGradients?: number,
    maxGradients?: number,
    multiplier?: number,
    colors?: PrettyDelaunayOptions['colors'],
    imageURL?: string,
  ) {
    // colors param is optional
    this.colors = colors ?
                    colors :
                    this.options.colorPalette ?
        [this.options.colorPalette[Random.randomBetween(0, this.options.colorPalette.length - 1)],
          this.options.colorPalette[Random.randomBetween(0, this.options.colorPalette.length - 1)],
        this.options.colorPalette[Random.randomBetween(0, this.options.colorPalette.length - 1)]] :
                      this.colors;

    this.options.imageURL = imageURL ?? this.options.imageURL;
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

  initRenderLoop(): void {
    if (this.options.imageAsBackground) {
      return;
    }

    this.looping = true;
    this.frameSteps = this.options.loopFrames;
    this.frame = this.frame ? this.frame : this.frameSteps;
    this.renderLoop();
  }

  renderLoop(): void {
    this.frame++;

    // current => next, next => new
    if (this.frame > (this.frameSteps ?? 0)) {
      const nextGradients = this.nextGradients ? this.nextGradients : this.radialGradients;
      this.generateGradients();
      this.nextGradients = this.radialGradients;
      this.radialGradients = nextGradients.slice(0);
      this.currentGradients = nextGradients.slice(0);

      this.frame = 0;
    } else {
      // fancy steps
      // {x0, y0, r0, x1, y1, r1, colorStop}
      for (let i = 0; i < Math.max(this.radialGradients.length, this.nextGradients.length); i++) {
        let currentGradient = this.currentGradients[i];
        let nextGradient = this.nextGradients[i];

        if (typeof currentGradient === 'undefined') {
          const newGradient: RadialGradient = {
            x0: nextGradient.x0,
            y0: nextGradient.y0,
            r0: 0,
            x1: nextGradient.x1,
            y1: nextGradient.y1,
            r1: 0,
            colorStop: nextGradient.colorStop,
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
            colorStop: currentGradient.colorStop,
          };
        }

        // scale the difference between current and next gradient based on step in frames
        var scale = this.frame / this.frameSteps;

        const updatedGradient: RadialGradient = {
          x0: Math.round(linearScale(currentGradient.x0, nextGradient.x0, scale)),
          y0: Math.round(linearScale(currentGradient.y0, nextGradient.y0, scale)),
          r0: Math.round(linearScale(currentGradient.r0, nextGradient.r0, scale)),
          x1: Math.round(linearScale(currentGradient.x1, nextGradient.x0, scale)),
          y1: Math.round(linearScale(currentGradient.y1, nextGradient.y0, scale)),
          r1: Math.round(linearScale(currentGradient.r1, nextGradient.r1, scale)),
          colorStop: linearScale(currentGradient.colorStop, nextGradient.colorStop, scale),
        };
        this.radialGradients[i] = updatedGradient;
      }
    }

    this.resetPointColors();
    this.render();

    if (this.options.animate) {
      requestAnimationFrame(() => {
        this.renderLoop();
      });
    } else {
      this.looping = false;
    }
  }

  initHover(): void {
    // this.createHoverShadowCanvas();

    this.canvas.addEventListener('mousemove', this.mousemove, false);
    this.canvas.addEventListener('mouseout', this.mouseout, false);
  }

  removeHover(): void {
    this.canvas.removeEventListener('mousemove', this.mousemove, false);
    this.canvas.removeEventListener('mouseout', this.mouseout, false);
  }

  // creates a hidden canvas for hover detection
  // createHoverShadowCanvas(): void {
  //   this.hoverShadowCanvas = this.hoverShadowCanvas || document.createElement('canvas');
  //   this.shadowCtx = this.shadowCtx || this.hoverShadowCanvas.getContext('2d')!;

  //   this.hoverShadowCanvas.style.display = 'none';
  // }

  mousemove = (event: MouseEvent) => {
    if (!this.options.animate) {
      var rect = this.canvas.getBoundingClientRect();
      this.mousePosition = new Point(event.clientX - rect.left, event.clientY - rect.top);
      this.hover();
    }
  }

  mouseout = (_: MouseEvent) => {
    if (!this.options.animate) {
      this.mousePosition = undefined;
      this.hover();
    }
  }

  generateNewPoints(
    min: number = 0,
    max: number = 0,
    minEdge: number = 0,
    maxEdge: number = 0,
    multiplier: number = this.options.multiplier
  ): void {
    // defaults to generic number of points based on canvas dimensions
    // this generally looks pretty nice
    var area = this.canvas.width * this.canvas.height;
    var perimeter = (this.canvas.width + this.canvas.height) * 2;

    min = min > 0 ? Math.ceil(min) : Math.max(Math.ceil((area / 1250) * multiplier), 50);
    max = max > 0 ? Math.ceil(max) : Math.max(Math.ceil((area / 500) * multiplier), 50);

    minEdge = minEdge > 0 ? Math.ceil(minEdge) : Math.max(Math.ceil((perimeter / 125) * multiplier), 5);
    maxEdge = maxEdge > 0 ? Math.ceil(maxEdge) : Math.max(Math.ceil((perimeter / 50) * multiplier), 5);

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
  generateCornerPoints(): void {
    this.points.push(new Point(0, 0));
    this.points.push(new Point(0, this.height));
    this.points.push(new Point(this.width, 0));
    this.points.push(new Point(this.width, this.height));
  }

  // add points on the edges
  generateEdgePoints(): void {
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
  generateRandomPoints(numPoints: number, x: number, y: number, width: number, height: number): void {
    const center = new Point(Math.round(this.canvas.width / 2), Math.round(this.canvas.height / 2));
    for (let i = 0; i < numPoints; i++) {
      // generate a new point with random coords
      // re-generate the point if it already exists in pointMap (max 10 times)
      let point: Point;
      let j = 0;
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
      }
    }
  }

  // use the Delaunay algorithm to make
  // triangles out of our random points
  triangulate(): void {
    // map point objects to length-2 arrays
    const vertices = this.points.map(function(point) {
      return point.getCoords();
    });

    // vertices is now an array such as:
    // [ [p1x, p1y], [p2x, p2y], [p3x, p3y], ... ]

    // do the algorithm
    // returns 1 dimensional array arranged in triples such as:
    // [ t1a, t1b, t1c, t2a, t2b, t2c,.... ]
    // where t1a, etc are indices in the vertices array
    const triangulated = Delaunay.triangulate(vertices);

    // turn that into array of triangle points
    const newTriangles: [[number, number], [number, number], [number, number]][] = [];
    for (let i = 0; i < triangulated.length; i += 3) {
      newTriangles.push([
        vertices[triangulated[i]],
        vertices[triangulated[i + 1]],
        vertices[triangulated[i + 2]],
      ]);
    }

    // map to array of Triangle objects
    this.triangles = newTriangles.map(function(triangle) {
      return new Triangle(new Point(triangle[0]),
                          new Point(triangle[1]),
                          new Point(triangle[2]));
    });
  }

  resetPointColors(): void {
    // reset cached colors of centroids and points
    for (let i = 0; i < this.triangles.length; i++) {
      this.triangles[i].resetPointColors();
    }

    for (let i = 0; i < this.points.length; i++) {
      this.points[i].resetColor();
    }
  }

  // create random radial gradient circles for rendering later
  generateGradients(minGradients: number = this.options.minGradients, maxGradients: number = this.options.maxGradients): void {
    this.radialGradients = [];
    this.numGradients = Random.randomBetween(minGradients, maxGradients);

    for (let i = 0; i < this.numGradients; i++) {
      this.generateRadialGradient();
    }
  }

  generateRadialGradient(): void {
    /**
      * create a nice-looking but somewhat random gradient:
      * randomize the first circle
      * the second circle should be inside the first circle,
      * so we generate a point (origin2) inside circle1
      * then calculate the dist between origin2 and the circumference of circle1
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

    // find distance between the point and the circumference of circle1
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
  sortPoints(): void {
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
  resizeCanvas(): void {
    const parent = this.canvas.parentElement!;
    this.canvas.width = this.width = parent.offsetWidth;
    this.canvas.height = this.height = parent.offsetHeight;

    if (this.hoverShadowCanvas) {
      this.hoverShadowCanvas.width = this.width = parent.offsetWidth;
      this.hoverShadowCanvas.height = this.height = parent.offsetHeight;
    }
  }

  // moves points/triangles based on new size of canvas
  rescale(): void {
    // grab old max/min from current canvas size
    const xMin = 0;
    const xMax = this.canvas.width;
    const yMin = 0;
    const yMax = this.canvas.height;

    this.resizeCanvas();

    if (this.options.resizeMode === 'scalePoints') {
      // scale all points to new max dimensions
      for (let i = 0; i < this.points.length; i++) {
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

  rescaleGradients(array: RadialGradient[], xMin: number, xMax: number, yMin: number, yMax: number): void {
    for (let i = 0; i < array.length; i++) {
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

      this.lastTriangle = undefined;
    }
  }

  render(): void {
    this.renderBackground(this.renderForeground.bind(this));
  }

  renderBackground(callback: () => void): void {
    // render the base to get triangle colors
    if (this.options.imageAsBackground) {
      this.renderImageBackground(callback);
    } else {
      this.renderGradient();
      callback();
    }
  }

  renderForeground(): void {
    // get entire canvas image data of in a big typed array
    // this way we don’t have to pick for each point individually
    // it's like 50x faster this way
    this.gradientImageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);

    // renders triangles, edges, and shadow canvas for hover detection
    this.renderTriangles(this.options.showTriangles, this.options.showEdges);

    this.renderExtras();

    this.renderedImageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);

    // throw events for light / dark text
    var centerColor = this.center.canvasColorAtPoint(this.renderedImageData);

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

  renderExtras(): void {
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

  renderNewColors(colors?: [string, string, string]): void {
    this.colors = colors ?? this.colors;
    // triangle centroids need new colors
    this.resetPointColors();
    this.render();
  }

  renderNewGradient(minGradients?: number, maxGradients?: number): void {
    this.generateGradients(minGradients, maxGradients);

    // prep for animation
    this.nextGradients = this.radialGradients.slice(0);
    this.generateGradients();
    this.currentGradients = this.radialGradients.slice(0);

    this.resetPointColors();
    this.render();
  }

  renderNewTriangles(min?: number, max?: number, minEdge?: number, maxEdge?: number, multiplier?: number): void {
    this.generateNewPoints(min, max, minEdge, maxEdge, multiplier);
    this.triangulate();
    this.render();
  }

  renderGradient(): void {
    for (let i = 0; i < this.radialGradients.length; i++) {
      // create the radial gradient based on
      // the generated circles' radii and origins
      const radialGradient = this.ctx.createRadialGradient(
        this.radialGradients[i].x0,
        this.radialGradients[i].y0,
        this.radialGradients[i].r0,
        this.radialGradients[i].x1,
        this.radialGradients[i].y1,
        this.radialGradients[i].r1
      );

      let outerColor: string = this.colors[2];

      if (i > 0) {
        // must be transparent version of middle color
        // this works for rgba and hsla
        const middleColorParts = this.colors[1].split(',');
        middleColorParts[3] = '0)';
        outerColor = middleColorParts.join(',');
      }

      radialGradient.addColorStop(1, this.colors[0]);
      radialGradient.addColorStop(this.radialGradients[i].colorStop, this.colors[1]);
      radialGradient.addColorStop(0, outerColor);

      this.canvas.parentElement!.style.backgroundColor = this.colors[2];

      this.ctx.fillStyle = radialGradient;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  renderImageBackground = (callback: () => void): void => {
    this.loadImageBackground(() => {
      if (!this.image) return callback();

      // scale image to fit width/height of canvas
      let heightMultiplier = this.canvas.height / this.image.height;
      let widthMultiplier = this.canvas.width / this.image.width;

      let multiplier = Math.max(heightMultiplier, widthMultiplier);

      this.ctx.drawImage(this.image, 0, 0, this.image.width * multiplier, this.image.height * multiplier);

      callback();
    });
  }

  loadImageBackground = (callback: () => void) => {
    if (this.image && this.image.src === this.options.imageURL) {
      callback();
    } else {
      this.image = new Image();
      this.image.crossOrigin = 'Anonymous';
      this.image.src = this.options.imageURL ?? '';
      this.image.onload = callback;
    }
  }

  renderTriangles(showTriangles?: boolean, showEdges?: boolean): void {
    // save this for later
    this.center.canvasColorAtPoint(this.gradientImageData);

    for (let i = 0; i < this.triangles.length; i++) {
      // the color is determined by grabbing the color of the canvas
      // (where we drew the gradient) at the center of the triangle

      this.triangles[i].color = this.triangles[i].colorAtCentroid(this.gradientImageData);

      if (showTriangles && showEdges) {
        this.triangles[i].stroke = this.options.edgeColor(this.triangles[i].colorAtCentroid(this.gradientImageData));
        this.triangles[i].render(this.ctx);
      } else if (showTriangles) {
        // triangles only
        this.triangles[i].stroke = this.triangles[i].color;
        this.triangles[i].render(this.ctx);
      } else if (showEdges) {
        // edges only
        this.triangles[i].stroke = this.options.edgeColor(this.triangles[i].colorAtCentroid(this.gradientImageData));
        this.triangles[i].render(this.ctx);
      }

      if (this.hoverShadowCanvas) {
        var color = '#' + ('000000' + i.toString(16)).slice(-6);
        this.triangles[i].render(this.shadowCtx, color);
      }
    }

    if (this.hoverShadowCanvas) {
      this.shadowImageData = this.shadowCtx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  // renders the points of the triangles
  renderPoints(): void {
    for (let i = 0; i < this.points.length; i++) {
      var color = this.options.pointColor(this.points[i].canvasColorAtPoint(this.gradientImageData));
      this.points[i].render(this.ctx, color);
    }
  }

  // draws the circles that define the gradients
  renderGradientCircles(): void {
    for (let i = 0; i < this.radialGradients.length; i++) {
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
  renderCentroids(): void {
    for (let i = 0; i < this.triangles.length; i++) {
      const color = this.options.centroidColor(this.triangles[i].colorAtCentroid(this.gradientImageData));
      this.triangles[i].centroid().render(this.ctx, color);
    }
  }

  toggleTriangles(force?: boolean) {
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

  togglePoints(force?: boolean) {
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

  toggleCircles(force?: boolean) {
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

  toggleCentroids(force?: boolean) {
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

  toggleEdges(force?: boolean) {
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

  toggleAnimation(force?: boolean) {
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

  toggleHover(force?: boolean) {
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

  getColors() {
    return this.colors;
  }
}

function linearScale(x0: number, x1: number, scale: number): number {
  return x0 + (scale * (x1 - x0));
}
