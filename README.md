# PrettyDelaunay

PrettyDelaunay is a bit of Javascript that generates a random [Delaunay triangulation](https://en.wikipedia.org/wiki/Delaunay_triangulation) on an HTML canvas with pretty colors, with plenty of customization options to boot.

Uses [ironwallaby's Delaunay triangulation implementation](https://github.com/ironwallaby/delaunay) to generate the triangulation from random points.

## Usage

Include `dist/pretty-delaunay.js` at the bottom of your page.

Initialize PrettyDelaunay with a canvas element and your options:

```javascript
var canvas = document.getElementById('myCanvas');
var prettyDelaunay = new PrettyDelaunay(canvas, options);
```

PrettyDelaunay will stretch the canvas to fit its parent - with a full width parent element you can have a nice, responsive triangle background. [See a demo here.](http://codepen.io/poochiepoochie/full/LGEwOB)

## Options

```javascript
var options = {
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
    onDarkBackground: function(color) { return; },
    onLightBackground: function(color) { return; },

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

```

#TODO:
* Polyfills for old/shit browsers (Object.assign 😫)
