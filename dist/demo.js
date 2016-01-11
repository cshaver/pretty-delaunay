(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"/Users/cshaver/Personal/pretty-delaunay/lib/color.js":[function(require,module,exports){
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

},{}],"/Users/cshaver/Personal/pretty-delaunay/lib/demo.js":[function(require,module,exports){
'use strict';

(function () {
  'use strict';

  var Color = require('./color');
  var Random = require('./random');

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

  var minPoints, maxPoints, minEdgePoints, maxEdgePoints, minGradients, maxGradients, multiplier, colors;

  var showTriangles, showPoints, showCircles, showCentroids, showEdges, showAnimation;

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
    prettyDelaunay.randomize(minPoints, maxPoints, minEdgePoints, maxEdgePoints, minGradients, maxGradients, colors);
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
  }

  function throttle(type, name, obj) {
    obj = obj || window;
    var running = false;
    var func = function func() {
      if (running) {
        return;
      }
      running = true;
      requestAnimationFrame(function () {
        obj.dispatchEvent(new CustomEvent(name));
        running = false;
      });
    };
    obj.addEventListener(type, func);
  }

  /* init - you can init any event */
  throttle('resize', 'optimizedResize');

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

  // resize event
  window.addEventListener('optimizedResize', function () {
    prettyDelaunay.rescale();
  });

  // dont do anything on form submit
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    return false;
  });
})();

},{"./color":"/Users/cshaver/Personal/pretty-delaunay/lib/color.js","./random":"/Users/cshaver/Personal/pretty-delaunay/lib/random.js"}],"/Users/cshaver/Personal/pretty-delaunay/lib/point.js":[function(require,module,exports){
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

},{"./color":"/Users/cshaver/Personal/pretty-delaunay/lib/color.js"}],"/Users/cshaver/Personal/pretty-delaunay/lib/random.js":[function(require,module,exports){
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

},{"./point":"/Users/cshaver/Personal/pretty-delaunay/lib/point.js"}]},{},["/Users/cshaver/Personal/pretty-delaunay/lib/demo.js"])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJsaWIvY29sb3IuanMiLCJsaWIvZGVtby5qcyIsImxpYi9wb2ludC5qcyIsImxpYi9yYW5kb20uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztBQ0FBLElBQUksS0FBSyxDQUFDOztBQUVWLENBQUMsWUFBVztBQUNWLGNBQVk7O0FBQUM7QUFFYixPQUFLLEdBQUc7O0FBRU4sYUFBUyxFQUFFLG1CQUFTLEdBQUcsRUFBRTtBQUN2QixTQUFHLEdBQUcsR0FBRyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUMsRUFBRSxDQUFDLENBQUM7QUFDMUIsVUFBSSxDQUFDLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0FBQ3pDLFVBQUksQ0FBQyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztBQUN6QyxVQUFJLENBQUMsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7O0FBRXpDLGFBQU8sT0FBTyxHQUFHLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDLEdBQUcsS0FBSyxDQUFDO0tBQ2hEOztBQUVELGtCQUFjLEVBQUUsd0JBQVMsR0FBRyxFQUFFO0FBQzVCLFNBQUcsR0FBRyxHQUFHLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBQyxFQUFFLENBQUMsQ0FBQztBQUMxQixVQUFJLENBQUMsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7QUFDekMsVUFBSSxDQUFDLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FB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LEVBQUUsc0JBQVc7QUFDckIsYUFBTyxPQUFPLEdBQUcsTUFBTSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsR0FBRyxHQUFHLEdBQy9CLE1BQU0sQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSSxHQUNoQyxNQUFNLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxHQUFHLE9BQU8sQ0FBQztLQUN0RDtHQUNGLENBQUM7O0FBRUYsTUFBSSxPQUFPLE1BQU0sS0FBSyxXQUFXLEVBQUU7QUFDakMsVUFBTSxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUM7R0FDekI7Q0FFRixDQUFBLEVBQUcsQ0FBQyIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgQ29sb3I7XG5cbihmdW5jdGlvbigpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuICAvLyBjb2xvciBoZWxwZXIgZnVuY3Rpb25zXG4gIENvbG9yID0ge1xuXG4gICAgaGV4VG9SZ2JhOiBmdW5jdGlvbihoZXgpIHtcbiAgICAgIGhleCA9IGhleC5yZXBsYWNlKCcjJywnJyk7XG4gICAgICB2YXIgciA9IHBhcnNlSW50KGhleC5zdWJzdHJpbmcoMCwyKSwgMTYpO1xuICAgICAgdmFyIGcgPSBwYXJzZUludChoZXguc3Vic3RyaW5nKDIsNCksIDE2KTtcbiAgICAgIHZhciBiID0gcGFyc2VJbnQoaGV4LnN1YnN0cmluZyg0LDYpLCAxNik7XG5cbiAgICAgIHJldHVybiAncmdiYSgnICsgciArICcsJyArIGcgKyAnLCcgKyBiICsgJywxKSc7XG4gICAgfSxcblxuICAgIGhleFRvUmdiYUFycmF5OiBmdW5jdGlvbihoZXgpIHtcbiAgICAgIGhleCA9IGhleC5yZXBsYWNlKCcjJywnJyk7XG4gICAgICB2YXIgciA9IHBhcnNlSW50KGhleC5zdWJzdHJpbmcoMCwyKSwgMTYpO1xuICAgICAgdmFyIGcgPSBwYXJzZUludChoZXguc3Vic3RyaW5nKDIsNCksIDE2KTtcbiAgICAgIHZhciBiID0gcGFyc2VJbnQoaGV4LnN1YnN0cmluZyg0LDYpLCAxNik7XG5cbiAgICAgIHJldHVybiBbciwgZywgYl07XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvbnZlcnRzIGFuIFJHQiBjb2xvciB2YWx1ZSB0byBIU0wuIENvbnZlcnNpb24gZm9ybXVsYVxuICAgICAqIGFkYXB0ZWQgZnJvbSBodHRwOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0hTTF9jb2xvcl9zcGFjZS5cbiAgICAgKiBBc3N1bWVzIHIsIGcsIGFuZCBiIGFyZSBjb250YWluZWQgaW4gdGhlIHNldCBbMCwgMjU1XSBhbmRcbiAgICAgKiByZXR1cm5zIGgsIHMsIGFuZCBsIGluIHRoZSBzZXQgWzAsIDFdLlxuICAgICAqXG4gICAgICogQHBhcmFtICAgTnVtYmVyICByICAgICAgIFRoZSByZWQgY29sb3IgdmFsdWVcbiAgICAgKiBAcGFyYW0gICBOdW1iZXIgIGcgICAgICAgVGhlIGdyZWVuIGNvbG9yIHZhbHVlXG4gICAgICogQHBhcmFtICAgTnVtYmVyICBiICAgICAgIFRoZSBibHVlIGNvbG9yIHZhbHVlXG4gICAgICogQHJldHVybiAgQXJyYXkgICAgICAgICAgIFRoZSBIU0wgcmVwcmVzZW50YXRpb25cbiAgICAgKi9cbiAgICByZ2JUb0hzbGE6IGZ1bmN0aW9uKHJnYikge1xuICAgICAgdmFyIHIgPSByZ2JbMF0gLyAyNTU7XG4gICAgICB2YXIgZyA9IHJnYlsxXSAvIDI1NTtcbiAgICAgIHZhciBiID0gcmdiWzJdIC8gMjU1O1xuICAgICAgdmFyIG1heCA9IE1hdGgubWF4KHIsIGcsIGIpO1xuICAgICAgdmFyIG1pbiA9IE1hdGgubWluKHIsIGcsIGIpO1xuICAgICAgdmFyIGg7XG4gICAgICB2YXIgcztcbiAgICAgIHZhciBsID0gKG1heCArIG1pbikgLyAyO1xuXG4gICAgICBpZiAobWF4ID09PSBtaW4pIHtcbiAgICAgICAgaCA9IHMgPSAwOyAvLyBhY2hyb21hdGljXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgZCA9IG1heCAtIG1pbjtcbiAgICAgICAgcyA9IGwgPiAwLjUgPyBkIC8gKDIgLSBtYXggLSBtaW4pIDogZCAvIChtYXggKyBtaW4pO1xuICAgICAgICBzd2l0Y2ggKG1heCl7XG4gICAgICAgICAgY2FzZSByOiBoID0gKGcgLSBiKSAvIGQgKyAoZyA8IGIgPyA2IDogMCk7IGJyZWFrO1xuICAgICAgICAgIGNhc2UgZzogaCA9IChiIC0gcikgLyBkICsgMjsgYnJlYWs7XG4gICAgICAgICAgY2FzZSBiOiBoID0gKHIgLSBnKSAvIGQgKyA0OyBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBoIC89IDY7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiAnaHNsYSgnICsgTWF0aC5yb3VuZChoICogMzYwKSArICcsJyArIE1hdGgucm91bmQocyAqIDEwMCkgKyAnJSwnICsgTWF0aC5yb3VuZChsICogMTAwKSArICclLDEpJztcbiAgICB9LFxuXG4gICAgaHNsYUFkanVzdEFscGhhOiBmdW5jdGlvbihjb2xvciwgYWxwaGEpIHtcbiAgICAgIGNvbG9yID0gY29sb3Iuc3BsaXQoJywnKTtcblxuICAgICAgaWYgKHR5cGVvZiBhbHBoYSAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBjb2xvclszXSA9IGFscGhhO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29sb3JbM10gPSBhbHBoYShwYXJzZUludChjb2xvclszXSkpO1xuICAgICAgfVxuXG4gICAgICBjb2xvclszXSArPSAnKSc7XG4gICAgICByZXR1cm4gY29sb3Iuam9pbignLCcpO1xuICAgIH0sXG5cbiAgICBoc2xhQWRqdXN0TGlnaHRuZXNzOiBmdW5jdGlvbihjb2xvciwgbGlnaHRuZXNzKSB7XG4gICAgICBjb2xvciA9IGNvbG9yLnNwbGl0KCcsJyk7XG5cbiAgICAgIGlmICh0eXBlb2YgbGlnaHRuZXNzICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIGNvbG9yWzJdID0gbGlnaHRuZXNzO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29sb3JbMl0gPSBsaWdodG5lc3MocGFyc2VJbnQoY29sb3JbMl0pKTtcbiAgICAgIH1cblxuICAgICAgY29sb3JbMl0gKz0gJyUnO1xuICAgICAgcmV0dXJuIGNvbG9yLmpvaW4oJywnKTtcbiAgICB9LFxuXG4gICAgcmdiVG9IZXg6IGZ1bmN0aW9uKHJnYikge1xuICAgICAgaWYgKHR5cGVvZiByZ2IgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHJnYiA9IHJnYi5yZXBsYWNlKCdyZ2IoJywgJycpLnJlcGxhY2UoJyknLCAnJykuc3BsaXQoJywnKTtcbiAgICAgIH1cbiAgICAgIHJnYiA9IHJnYi5tYXAoZnVuY3Rpb24oeCkge1xuICAgICAgICB4ID0gcGFyc2VJbnQoeCkudG9TdHJpbmcoMTYpO1xuICAgICAgICByZXR1cm4gKHgubGVuZ3RoID09PSAxKSA/ICcwJyArIHggOiB4O1xuICAgICAgfSk7XG4gICAgICByZXR1cm4gcmdiLmpvaW4oJycpO1xuICAgIH0sXG4gIH07XG5cbiAgaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBDb2xvcjtcbiAgfVxuXG59KSgpO1xuIiwiKGZ1bmN0aW9uKCkge1xuICAndXNlIHN0cmljdCc7XG5cbiAgdmFyIENvbG9yICA9IHJlcXVpcmUoJy4vY29sb3InKTtcbiAgdmFyIFJhbmRvbSA9IHJlcXVpcmUoJy4vcmFuZG9tJyk7XG5cbiAgdmFyIENvb2tpZXMgPSB7XG4gICAgZ2V0SXRlbTogZnVuY3Rpb24oc0tleSkge1xuICAgICAgaWYgKCFzS2V5KSB7IHJldHVybiBudWxsOyB9XG4gICAgICByZXR1cm4gZGVjb2RlVVJJQ29tcG9uZW50KFxuICAgICAgICBkb2N1bWVudC5jb29raWUucmVwbGFjZShcbiAgICAgICAgICBuZXcgUmVnRXhwKFxuICAgICAgICAgICAgICAnKD86KD86XnwuKjspXFxcXHMqJyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICArXG4gICAgICAgICAgICAgIGVuY29kZVVSSUNvbXBvbmVudChzS2V5KS5yZXBsYWNlKC9bXFwtXFwuXFwrXFwqXS9nLCAnXFxcXCQmJykgICArXG4gICAgICAgICAgICAgICdcXFxccypcXFxcPVxcXFxzKihbXjtdKikuKiQpfF4uKiQnKSwgJyQxJylcbiAgICAgICAgICAgICkgfHwgbnVsbDtcbiAgICB9LFxuXG4gICAgc2V0SXRlbTogZnVuY3Rpb24oc0tleSwgc1ZhbHVlLCB2RW5kLCBzUGF0aCwgc0RvbWFpbiwgYlNlY3VyZSkge1xuICAgICAgaWYgKCFzS2V5IHx8IC9eKD86ZXhwaXJlc3xtYXhcXC1hZ2V8cGF0aHxkb21haW58c2VjdXJlKSQvaS50ZXN0KHNLZXkpKSB7IHJldHVybiBmYWxzZTsgfVxuICAgICAgdmFyIHNFeHBpcmVzID0gJyc7XG4gICAgICBpZiAodkVuZCkge1xuICAgICAgICBzd2l0Y2ggKHZFbmQuY29uc3RydWN0b3IpIHtcbiAgICAgICAgICBjYXNlIE51bWJlcjpcbiAgICAgICAgICAgIHNFeHBpcmVzID0gdkVuZCA9PT0gSW5maW5pdHkgPyAnOyBleHBpcmVzPUZyaSwgMzEgRGVjIDk5OTkgMjM6NTk6NTkgR01UJyA6ICc7IG1heC1hZ2U9JyArIHZFbmQ7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBjYXNlIFN0cmluZzpcbiAgICAgICAgICAgIHNFeHBpcmVzID0gJzsgZXhwaXJlcz0nICsgdkVuZDtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGNhc2UgRGF0ZTpcbiAgICAgICAgICAgIHNFeHBpcmVzID0gJzsgZXhwaXJlcz0nICsgdkVuZC50b1VUQ1N0cmluZygpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGRvY3VtZW50LmNvb2tpZSA9IGVuY29kZVVSSUNvbXBvbmVudChzS2V5KSArXG4gICAgICAgICc9JyArXG4gICAgICAgIGVuY29kZVVSSUNvbXBvbmVudChzVmFsdWUpICtcbiAgICAgICAgc0V4cGlyZXMgK1xuICAgICAgICAoc0RvbWFpbiA/ICc7IGRvbWFpbj0nICtcbiAgICAgICAgc0RvbWFpbiA6ICcnKSArXG4gICAgICAgIChzUGF0aCA/ICc7IHBhdGg9JyArXG4gICAgICAgIHNQYXRoIDogJycpICtcbiAgICAgICAgKGJTZWN1cmUgPyAnOyBzZWN1cmUnIDogJycpO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSxcblxuICAgIHJlbW92ZUl0ZW06IGZ1bmN0aW9uKHNLZXksIHNQYXRoLCBzRG9tYWluKSB7XG4gICAgICBpZiAoIXRoaXMuaGFzSXRlbShzS2V5KSkgeyByZXR1cm4gZmFsc2U7IH1cbiAgICAgIGRvY3VtZW50LmNvb2tpZSA9IGVuY29kZVVSSUNvbXBvbmVudChzS2V5KSAgICArXG4gICAgICAgICc9OyBleHBpcmVzPVRodSwgMDEgSmFuIDE5NzAgMDA6MDA6MDAgR01UJyAgK1xuICAgICAgICAoc0RvbWFpbiA/ICc7IGRvbWFpbj0nICsgc0RvbWFpbiA6ICcnKSAgICAgICtcbiAgICAgICAgKHNQYXRoICAgPyAnOyBwYXRoPScgICArIHNQYXRoICAgOiAnJyk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9LFxuXG4gICAgaGFzSXRlbTogZnVuY3Rpb24oc0tleSkge1xuICAgICAgaWYgKCFzS2V5KSB7IHJldHVybiBmYWxzZTsgfVxuICAgICAgcmV0dXJuIChuZXcgUmVnRXhwKCcoPzpefDtcXFxccyopJyArIGVuY29kZVVSSUNvbXBvbmVudChzS2V5KVxuICAgICAgICAucmVwbGFjZSgvW1xcLVxcLlxcK1xcKl0vZywgJ1xcXFwkJicpICsgJ1xcXFxzKlxcXFw9JykpXG4gICAgICAgIC50ZXN0KGRvY3VtZW50LmNvb2tpZSk7XG4gICAgfSxcblxuICAgIGtleXM6IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGFLZXlzID0gZG9jdW1lbnQuY29va2llLnJlcGxhY2UoLygoPzpefFxccyo7KVteXFw9XSspKD89O3wkKXxeXFxzKnxcXHMqKD86XFw9W147XSopPyg/OlxcMXwkKS9nLCAnJylcbiAgICAgICAgLnNwbGl0KC9cXHMqKD86XFw9W147XSopPztcXHMqLyk7XG4gICAgICBmb3IgKHZhciBuTGVuID0gYUtleXMubGVuZ3RoLCBuSWR4ID0gMDsgbklkeCA8IG5MZW47IG5JZHgrKykgeyBhS2V5c1tuSWR4XSA9IGRlY29kZVVSSUNvbXBvbmVudChhS2V5c1tuSWR4XSk7IH1cbiAgICAgIHJldHVybiBhS2V5cztcbiAgICB9LFxuICB9O1xuXG4gIC8vIHNldCB1cCB2YXJpYWJsZXMgZm9yIGNhbnZhcywgaW5wdXRzLCBldGNcbiAgY29uc3QgY2FudmFzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NhbnZhcycpO1xuXG4gIGNvbnN0IGJ1dHRvbiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdidXR0b24nKTtcblxuICBjb25zdCBnZW5lcmF0ZUNvbG9yc0J1dHRvbiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdnZW5lcmF0ZUNvbG9ycycpO1xuICBjb25zdCBnZW5lcmF0ZUdyYWRpZW50QnV0dG9uID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2dlbmVyYXRlR3JhZGllbnQnKTtcbiAgY29uc3QgZ2VuZXJhdGVUcmlhbmdsZXNCdXR0b24gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZ2VuZXJhdGVUcmlhbmdsZXMnKTtcblxuICBjb25zdCB0b2dnbGVUcmlhbmdsZXNCdXR0b24gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgndG9nZ2xlVHJpYW5nbGVzJyk7XG4gIGNvbnN0IHRvZ2dsZVBvaW50c0J1dHRvbiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCd0b2dnbGVQb2ludHMnKTtcbiAgY29uc3QgdG9nZ2xlQ2lyY2xlc0J1dHRvbiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCd0b2dnbGVDaXJjbGVzJyk7XG4gIGNvbnN0IHRvZ2dsZUNlbnRyb2lkc0J1dHRvbiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCd0b2dnbGVDZW50cm9pZHMnKTtcbiAgY29uc3QgdG9nZ2xlRWRnZXNCdXR0b24gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgndG9nZ2xlRWRnZXMnKTtcbiAgY29uc3QgdG9nZ2xlQW5pbWF0aW9uQnV0dG9uID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3RvZ2dsZUFuaW1hdGlvbicpO1xuXG4gIGNvbnN0IGZvcm0gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZm9ybScpO1xuICBjb25zdCBtdWx0aXBsaWVyUmFkaW8gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncG9pbnRHZW4xJyk7XG4gIGNvbnN0IG11bHRpcGxpZXJJbnB1dCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdwb2ludHNNdWx0aXBsaWVyJyk7XG4gIGNvbnN0IG1heElucHV0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ21heFBvaW50cycpO1xuICBjb25zdCBtaW5JbnB1dCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdtaW5Qb2ludHMnKTtcbiAgY29uc3QgbWF4RWRnZUlucHV0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ21heEVkZ2VQb2ludHMnKTtcbiAgY29uc3QgbWluRWRnZUlucHV0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ21pbkVkZ2VQb2ludHMnKTtcbiAgY29uc3QgbWF4R3JhZGllbnRJbnB1dCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdtYXhHcmFkaWVudHMnKTtcbiAgY29uc3QgbWluR3JhZGllbnRJbnB1dCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdtaW5HcmFkaWVudHMnKTtcblxuICB2YXIgbWluUG9pbnRzLCBtYXhQb2ludHMsIG1pbkVkZ2VQb2ludHMsIG1heEVkZ2VQb2ludHMsIG1pbkdyYWRpZW50cywgbWF4R3JhZGllbnRzLCBtdWx0aXBsaWVyLCBjb2xvcnM7XG5cbiAgdmFyIHNob3dUcmlhbmdsZXMsIHNob3dQb2ludHMsIHNob3dDaXJjbGVzLCBzaG93Q2VudHJvaWRzLCBzaG93RWRnZXMsIHNob3dBbmltYXRpb247XG5cbiAgdmFyIG9wdGlvbnMgPSB7XG4gICAgb25EYXJrQmFja2dyb3VuZDogZnVuY3Rpb24oKSB7XG4gICAgICBmb3JtLmNsYXNzTmFtZSA9ICdmb3JtIGxpZ2h0JztcbiAgICB9LFxuICAgIG9uTGlnaHRCYWNrZ3JvdW5kOiBmdW5jdGlvbigpIHtcbiAgICAgIGZvcm0uY2xhc3NOYW1lID0gJ2Zvcm0gZGFyayc7XG4gICAgfSxcbiAgfTtcblxuICBnZXRDb29raWVzKCk7XG5cbiAgLy8gaW5pdGlhbGl6ZSB0aGUgUHJldHR5RGVsYXVuYXkgb2JqZWN0XG4gIGxldCBwcmV0dHlEZWxhdW5heSA9IG5ldyBQcmV0dHlEZWxhdW5heShjYW52YXMsIG9wdGlvbnMpO1xuXG4gIC8vIGluaXRpYWwgZ2VuZXJhdGlvblxuICBydW5EZWxhdW5heSgpO1xuXG4gIC8qKlxuICAgKiB1dGlsIGZ1bmN0aW9uc1xuICAgKi9cblxuICAvLyBnZXQgb3B0aW9ucyBhbmQgcmUtcmFuZG9taXplXG4gIGZ1bmN0aW9uIHJ1bkRlbGF1bmF5KCkge1xuICAgIGdldFJhbmRvbWl6ZU9wdGlvbnMoKTtcbiAgICBwcmV0dHlEZWxhdW5heS5yYW5kb21pemUobWluUG9pbnRzLCBtYXhQb2ludHMsIG1pbkVkZ2VQb2ludHMsIG1heEVkZ2VQb2ludHMsIG1pbkdyYWRpZW50cywgbWF4R3JhZGllbnRzLCBjb2xvcnMpO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0Q29sb3JzKCkge1xuICAgIHZhciBjb2xvcnMgPSBbXTtcblxuICAgIGlmIChkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY29sb3JUeXBlMScpLmNoZWNrZWQpIHtcbiAgICAgIC8vIGdlbmVyYXRlIHJhbmRvbSBjb2xvcnNcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgMzsgaSsrKSB7XG4gICAgICAgIHZhciBjb2xvciA9IFJhbmRvbS5yYW5kb21Ic2xhKCk7XG4gICAgICAgIGNvbG9ycy5wdXNoKGNvbG9yKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgLy8gdXNlIHRoZSBvbmVzIGluIHRoZSBpbnB1dHNcbiAgICAgIGNvbG9ycy5wdXNoKENvbG9yLnJnYlRvSHNsYShDb2xvci5oZXhUb1JnYmFBcnJheShkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY29sb3IxJykudmFsdWUpKSk7XG4gICAgICBjb2xvcnMucHVzaChDb2xvci5yZ2JUb0hzbGEoQ29sb3IuaGV4VG9SZ2JhQXJyYXkoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NvbG9yMicpLnZhbHVlKSkpO1xuICAgICAgY29sb3JzLnB1c2goQ29sb3IucmdiVG9Ic2xhKENvbG9yLmhleFRvUmdiYUFycmF5KGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjb2xvcjMnKS52YWx1ZSkpKTtcbiAgICB9XG5cbiAgICByZXR1cm4gY29sb3JzO1xuICB9XG5cbiAgLy8gZ2V0IG9wdGlvbnMgZnJvbSBjb29raWVzXG4gIGZ1bmN0aW9uIGdldENvb2tpZXMoKSB7XG4gICAgdmFyIGRlZmF1bHRzID0gUHJldHR5RGVsYXVuYXkuZGVmYXVsdHMoKTtcblxuICAgIHNob3dUcmlhbmdsZXMgPSBDb29raWVzLmdldEl0ZW0oJ0RlbGF1bmF5U2hvd1RyaWFuZ2xlcycpO1xuICAgIHNob3dQb2ludHMgICAgPSBDb29raWVzLmdldEl0ZW0oJ0RlbGF1bmF5U2hvd1BvaW50cycpO1xuICAgIHNob3dDaXJjbGVzICAgPSBDb29raWVzLmdldEl0ZW0oJ0RlbGF1bmF5U2hvd0NpcmNsZXMnKTtcbiAgICBzaG93Q2VudHJvaWRzID0gQ29va2llcy5nZXRJdGVtKCdEZWxhdW5heVNob3dDZW50cm9pZHMnKTtcbiAgICBzaG93RWRnZXMgICAgID0gQ29va2llcy5nZXRJdGVtKCdEZWxhdW5heVNob3dFZGdlcycpO1xuICAgIHNob3dBbmltYXRpb24gPSBDb29raWVzLmdldEl0ZW0oJ0RlbGF1bmF5U2hvd0FuaW1hdGlvbicpO1xuXG4gICAgLy8gVE9ETzogRFJZXG4gICAgLy8gb25seSBzZXQgb3B0aW9uIGZyb20gY29va2llIGlmIGl0IGV4aXN0cywgcGFyc2UgdG8gYm9vbGVhblxuICAgIGlmIChzaG93VHJpYW5nbGVzKSB7XG4gICAgICBvcHRpb25zLnNob3dUcmlhbmdsZXMgPSBzaG93VHJpYW5nbGVzID0gc2hvd1RyaWFuZ2xlcyA9PT0gJ3RydWUnID8gdHJ1ZSA6IGZhbHNlO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBzYXZlIG9wdGlvbiBzdGF0ZSBmb3Igc2V0dGluZyBjb29raWUgbGF0ZXJcbiAgICAgIHNob3dUcmlhbmdsZXMgPSBkZWZhdWx0cy5zaG93VHJpYW5nbGVzO1xuICAgIH1cblxuICAgIGlmIChzaG93UG9pbnRzKSB7XG4gICAgICBvcHRpb25zLnNob3dQb2ludHMgPSBzaG93UG9pbnRzID0gc2hvd1BvaW50cyA9PT0gJ3RydWUnID8gdHJ1ZSA6IGZhbHNlO1xuICAgIH0gZWxzZSB7XG4gICAgICBzaG93UG9pbnRzID0gZGVmYXVsdHMuc2hvd1BvaW50cztcbiAgICB9XG5cbiAgICBpZiAoc2hvd0NpcmNsZXMpIHtcbiAgICAgIG9wdGlvbnMuc2hvd0NpcmNsZXMgPSBzaG93Q2lyY2xlcyA9IHNob3dDaXJjbGVzID09PSAndHJ1ZScgPyB0cnVlIDogZmFsc2U7XG4gICAgfSBlbHNlIHtcbiAgICAgIHNob3dDaXJjbGVzID0gZGVmYXVsdHMuc2hvd0NpcmNsZXM7XG4gICAgfVxuXG4gICAgaWYgKHNob3dDZW50cm9pZHMpIHtcbiAgICAgIG9wdGlvbnMuc2hvd0NlbnRyb2lkcyA9IHNob3dDZW50cm9pZHMgPSBzaG93Q2VudHJvaWRzID09PSAndHJ1ZScgPyB0cnVlIDogZmFsc2U7XG4gICAgfSBlbHNlIHtcbiAgICAgIHNob3dDZW50cm9pZHMgPSBkZWZhdWx0cy5zaG93Q2VudHJvaWRzO1xuICAgIH1cblxuICAgIGlmIChzaG93RWRnZXMpIHtcbiAgICAgIG9wdGlvbnMuc2hvd0VkZ2VzID0gc2hvd0VkZ2VzID0gc2hvd0VkZ2VzID09PSAndHJ1ZScgPyB0cnVlIDogZmFsc2U7XG4gICAgfSBlbHNlIHtcbiAgICAgIHNob3dFZGdlcyA9IGRlZmF1bHRzLnNob3dFZGdlcztcbiAgICB9XG5cbiAgICBpZiAoc2hvd0FuaW1hdGlvbikge1xuICAgICAgb3B0aW9ucy5zaG93QW5pbWF0aW9uID0gc2hvd0FuaW1hdGlvbiA9IHNob3dBbmltYXRpb24gPT09ICd0cnVlJyA/IHRydWUgOiBmYWxzZTtcbiAgICB9IGVsc2Uge1xuICAgICAgc2hvd0FuaW1hdGlvbiA9IGRlZmF1bHRzLnNob3dBbmltYXRpb247XG4gICAgfVxuICB9XG5cbiAgLy8gZ2V0IG9wdGlvbnMgZnJvbSBpbnB1dCBmaWVsZHNcbiAgZnVuY3Rpb24gZ2V0UmFuZG9taXplT3B0aW9ucygpIHtcbiAgICB2YXIgdXNlTXVsdGlwbGllciA9IG11bHRpcGxpZXJSYWRpby5jaGVja2VkO1xuICAgIG11bHRpcGxpZXIgPSBwYXJzZUZsb2F0KG11bHRpcGxpZXJJbnB1dC52YWx1ZSk7XG4gICAgbWluUG9pbnRzID0gdXNlTXVsdGlwbGllciA/IDAgOiBwYXJzZUludChtaW5JbnB1dC52YWx1ZSk7XG4gICAgbWF4UG9pbnRzID0gdXNlTXVsdGlwbGllciA/IDAgOiBwYXJzZUludChtYXhJbnB1dC52YWx1ZSk7XG4gICAgbWluRWRnZVBvaW50cyA9IHVzZU11bHRpcGxpZXIgPyAwIDogcGFyc2VJbnQobWluRWRnZUlucHV0LnZhbHVlKTtcbiAgICBtYXhFZGdlUG9pbnRzID0gdXNlTXVsdGlwbGllciA/IDAgOiBwYXJzZUludChtYXhFZGdlSW5wdXQudmFsdWUpO1xuICAgIG1pbkdyYWRpZW50cyA9IHBhcnNlSW50KG1pbkdyYWRpZW50SW5wdXQudmFsdWUpO1xuICAgIG1heEdyYWRpZW50cyA9IHBhcnNlSW50KG1heEdyYWRpZW50SW5wdXQudmFsdWUpO1xuICAgIGNvbG9ycyA9IGdldENvbG9ycygpO1xuICB9XG5cbiAgZnVuY3Rpb24gdGhyb3R0bGUodHlwZSwgbmFtZSwgb2JqKSB7XG4gICAgb2JqID0gb2JqIHx8IHdpbmRvdztcbiAgICB2YXIgcnVubmluZyA9IGZhbHNlO1xuICAgIHZhciBmdW5jID0gZnVuY3Rpb24oKSB7XG4gICAgICBpZiAocnVubmluZykgeyByZXR1cm47IH1cbiAgICAgIHJ1bm5pbmcgPSB0cnVlO1xuICAgICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKGZ1bmN0aW9uKCkge1xuICAgICAgICBvYmouZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQobmFtZSkpO1xuICAgICAgICBydW5uaW5nID0gZmFsc2U7XG4gICAgICB9KTtcbiAgICB9O1xuICAgIG9iai5hZGRFdmVudExpc3RlbmVyKHR5cGUsIGZ1bmMpO1xuICB9XG5cbiAgLyogaW5pdCAtIHlvdSBjYW4gaW5pdCBhbnkgZXZlbnQgKi9cbiAgdGhyb3R0bGUoJ3Jlc2l6ZScsICdvcHRpbWl6ZWRSZXNpemUnKTtcblxuICAvKipcbiAgICogc2V0IHVwIGV2ZW50c1xuICAgKi9cblxuICAvLyBjbGljayB0aGUgYnV0dG9uIHRvIHJlZ2VuXG4gIGJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuICAgIHJ1bkRlbGF1bmF5KCk7XG4gIH0pO1xuXG4gIC8vIGNsaWNrIHRoZSBidXR0b24gdG8gcmVnZW4gY29sb3JzIG9ubHlcbiAgZ2VuZXJhdGVDb2xvcnNCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbigpIHtcbiAgICB2YXIgbmV3Q29sb3JzID0gZ2V0Q29sb3JzKCk7XG4gICAgcHJldHR5RGVsYXVuYXkucmVuZGVyTmV3Q29sb3JzKG5ld0NvbG9ycyk7XG4gIH0pO1xuXG4gIC8vIGNsaWNrIHRoZSBidXR0b24gdG8gcmVnZW4gY29sb3JzIG9ubHlcbiAgZ2VuZXJhdGVHcmFkaWVudEJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuICAgIGdldFJhbmRvbWl6ZU9wdGlvbnMoKTtcbiAgICBwcmV0dHlEZWxhdW5heS5yZW5kZXJOZXdHcmFkaWVudChtaW5HcmFkaWVudHMsIG1heEdyYWRpZW50cyk7XG4gIH0pO1xuXG4gIC8vIGNsaWNrIHRoZSBidXR0b24gdG8gcmVnZW4gY29sb3JzIG9ubHlcbiAgZ2VuZXJhdGVUcmlhbmdsZXNCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbigpIHtcbiAgICBnZXRSYW5kb21pemVPcHRpb25zKCk7XG4gICAgcHJldHR5RGVsYXVuYXkucmVuZGVyTmV3VHJpYW5nbGVzKG1pblBvaW50cywgbWF4UG9pbnRzLCBtaW5FZGdlUG9pbnRzLCBtYXhFZGdlUG9pbnRzLCBtdWx0aXBsaWVyKTtcbiAgfSk7XG5cbiAgLy8gdHVybiBUcmlhbmdsZXMgb2ZmL29uXG4gIHRvZ2dsZVRyaWFuZ2xlc0J1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuICAgIHNob3dUcmlhbmdsZXMgPSAhc2hvd1RyaWFuZ2xlcztcbiAgICBDb29raWVzLnNldEl0ZW0oJ0RlbGF1bmF5U2hvd1RyaWFuZ2xlcycsIHNob3dUcmlhbmdsZXMpO1xuICAgIHByZXR0eURlbGF1bmF5LnRvZ2dsZVRyaWFuZ2xlcygpO1xuICB9KTtcblxuICAvLyB0dXJuIFBvaW50cyBvZmYvb25cbiAgdG9nZ2xlUG9pbnRzQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG4gICAgc2hvd1BvaW50cyA9ICFzaG93UG9pbnRzO1xuICAgIENvb2tpZXMuc2V0SXRlbSgnRGVsYXVuYXlTaG93UG9pbnRzJywgc2hvd1BvaW50cyk7XG4gICAgcHJldHR5RGVsYXVuYXkudG9nZ2xlUG9pbnRzKCk7XG4gIH0pO1xuXG4gIC8vIHR1cm4gQ2lyY2xlcyBvZmYvb25cbiAgdG9nZ2xlQ2lyY2xlc0J1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuICAgIHNob3dDaXJjbGVzID0gIXNob3dDaXJjbGVzO1xuICAgIENvb2tpZXMuc2V0SXRlbSgnRGVsYXVuYXlTaG93Q2lyY2xlcycsIHNob3dDaXJjbGVzKTtcbiAgICBwcmV0dHlEZWxhdW5heS50b2dnbGVDaXJjbGVzKCk7XG4gIH0pO1xuXG4gIC8vIHR1cm4gQ2VudHJvaWRzIG9mZi9vblxuICB0b2dnbGVDZW50cm9pZHNCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbigpIHtcbiAgICBzaG93Q2VudHJvaWRzID0gIXNob3dDZW50cm9pZHM7XG4gICAgQ29va2llcy5zZXRJdGVtKCdEZWxhdW5heVNob3dDZW50cm9pZHMnLCBzaG93Q2VudHJvaWRzKTtcbiAgICBwcmV0dHlEZWxhdW5heS50b2dnbGVDZW50cm9pZHMoKTtcbiAgfSk7XG5cbiAgLy8gdHVybiBFZGdlcyBvZmYvb25cbiAgdG9nZ2xlRWRnZXNCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbigpIHtcbiAgICBzaG93RWRnZXMgPSAhc2hvd0VkZ2VzO1xuICAgIENvb2tpZXMuc2V0SXRlbSgnRGVsYXVuYXlTaG93RWRnZXMnLCBzaG93RWRnZXMpO1xuICAgIHByZXR0eURlbGF1bmF5LnRvZ2dsZUVkZ2VzKCk7XG4gIH0pO1xuXG4gIC8vIHR1cm4gQW5pbWF0aW9uIG9mZi9vblxuICB0b2dnbGVBbmltYXRpb25CdXR0b24uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbigpIHtcbiAgICBzaG93QW5pbWF0aW9uID0gIXNob3dBbmltYXRpb247XG4gICAgQ29va2llcy5zZXRJdGVtKCdEZWxhdW5heVNob3dBbmltYXRpb24nLCBzaG93QW5pbWF0aW9uKTtcbiAgICBwcmV0dHlEZWxhdW5heS50b2dnbGVBbmltYXRpb24oKTtcbiAgfSk7XG5cbiAgLy8gcmVzaXplIGV2ZW50XG4gIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdvcHRpbWl6ZWRSZXNpemUnLCBmdW5jdGlvbigpIHtcbiAgICBwcmV0dHlEZWxhdW5heS5yZXNjYWxlKCk7XG4gIH0pO1xuXG4gIC8vIGRvbnQgZG8gYW55dGhpbmcgb24gZm9ybSBzdWJtaXRcbiAgZm9ybS5hZGRFdmVudExpc3RlbmVyKCdzdWJtaXQnLCBmdW5jdGlvbihlKSB7XG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIHJldHVybiBmYWxzZTtcbiAgfSk7XG59KSgpO1xuIiwidmFyIFBvaW50O1xuXG4oZnVuY3Rpb24oKSB7XG4gICd1c2Ugc3RyaWN0JztcblxuICB2YXIgQ29sb3IgPSBDb2xvciB8fCByZXF1aXJlKCcuL2NvbG9yJyk7XG5cbiAgLyoqXG4gICAqIFJlcHJlc2VudHMgYSBwb2ludFxuICAgKiBAY2xhc3NcbiAgICovXG4gIGNsYXNzIF9Qb2ludCB7XG4gICAgLyoqXG4gICAgICogUG9pbnQgY29uc2lzdHMgeCBhbmQgeVxuICAgICAqIEBjb25zdHJ1Y3RvclxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSB4XG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IHlcbiAgICAgKiBvcjpcbiAgICAgKiBAcGFyYW0ge051bWJlcltdfSB4XG4gICAgICogd2hlcmUgeCBpcyBsZW5ndGgtMiBhcnJheVxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKHgsIHkpIHtcbiAgICAgIGlmIChBcnJheS5pc0FycmF5KHgpKSB7XG4gICAgICAgIHkgPSB4WzFdO1xuICAgICAgICB4ID0geFswXTtcbiAgICAgIH1cbiAgICAgIHRoaXMueCA9IHg7XG4gICAgICB0aGlzLnkgPSB5O1xuICAgICAgdGhpcy5yYWRpdXMgPSAxO1xuICAgICAgdGhpcy5jb2xvciA9ICdibGFjayc7XG4gICAgfVxuXG4gICAgLy8gZHJhdyB0aGUgcG9pbnRcbiAgICByZW5kZXIoY3R4LCBjb2xvcikge1xuICAgICAgY3R4LmJlZ2luUGF0aCgpO1xuICAgICAgY3R4LmFyYyh0aGlzLngsIHRoaXMueSwgdGhpcy5yYWRpdXMsIDAsIDIgKiBNYXRoLlBJLCBmYWxzZSk7XG4gICAgICBjdHguZmlsbFN0eWxlID0gY29sb3IgfHwgdGhpcy5jb2xvcjtcbiAgICAgIGN0eC5maWxsKCk7XG4gICAgICBjdHguY2xvc2VQYXRoKCk7XG4gICAgfVxuXG4gICAgLy8gY29udmVydHMgdG8gc3RyaW5nXG4gICAgLy8gcmV0dXJucyBzb21ldGhpbmcgbGlrZTpcbiAgICAvLyBcIihYLFkpXCJcbiAgICAvLyB1c2VkIGluIHRoZSBwb2ludG1hcCB0byBkZXRlY3QgdW5pcXVlIHBvaW50c1xuICAgIHRvU3RyaW5nKCkge1xuICAgICAgcmV0dXJuICcoJyArIHRoaXMueCArICcsJyArIHRoaXMueSArICcpJztcbiAgICB9XG5cbiAgICAvLyBncmFiIHRoZSBjb2xvciBvZiB0aGUgY2FudmFzIGF0IHRoZSBwb2ludFxuICAgIC8vIHJlcXVpcmVzIGltYWdlZGF0YSBmcm9tIGNhbnZhcyBzbyB3ZSBkb250IGdyYWJcbiAgICAvLyBlYWNoIHBvaW50IGluZGl2aWR1YWxseSwgd2hpY2ggaXMgcmVhbGx5IGV4cGVuc2l2ZVxuICAgIGNhbnZhc0NvbG9yQXRQb2ludChpbWFnZURhdGEsIGNvbG9yU3BhY2UpIHtcbiAgICAgIGNvbG9yU3BhY2UgPSBjb2xvclNwYWNlIHx8ICdoc2xhJztcbiAgICAgIC8vIG9ubHkgZmluZCB0aGUgY2FudmFzIGNvbG9yIGlmIHdlIGRvbnQgYWxyZWFkeSBrbm93IGl0XG4gICAgICBpZiAoIXRoaXMuX2NhbnZhc0NvbG9yKSB7XG4gICAgICAgIC8vIGltYWdlRGF0YSBhcnJheSBpcyBmbGF0LCBnb2VzIGJ5IHJvd3MgdGhlbiBjb2xzLCBmb3VyIHZhbHVlcyBwZXIgcGl4ZWxcbiAgICAgICAgdmFyIGlkeCA9IChNYXRoLmZsb29yKHRoaXMueSkgKiBpbWFnZURhdGEud2lkdGggKiA0KSArIChNYXRoLmZsb29yKHRoaXMueCkgKiA0KTtcblxuICAgICAgICBpZiAoY29sb3JTcGFjZSA9PT0gJ2hzbGEnKSB7XG4gICAgICAgICAgdGhpcy5fY2FudmFzQ29sb3IgPSBDb2xvci5yZ2JUb0hzbGEoQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoaW1hZ2VEYXRhLmRhdGEsIGlkeCwgaWR4ICsgNCkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMuX2NhbnZhc0NvbG9yID0gJ3JnYignICsgQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoaW1hZ2VEYXRhLmRhdGEsIGlkeCwgaWR4ICsgMykuam9pbigpICsgJyknO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gdGhpcy5fY2FudmFzQ29sb3I7XG4gICAgICB9XG4gICAgICByZXR1cm4gdGhpcy5fY2FudmFzQ29sb3I7XG4gICAgfVxuXG4gICAgZ2V0Q29vcmRzKCkge1xuICAgICAgcmV0dXJuIFt0aGlzLngsIHRoaXMueV07XG4gICAgfVxuXG4gICAgLy8gZGlzdGFuY2UgdG8gYW5vdGhlciBwb2ludFxuICAgIGdldERpc3RhbmNlVG8ocG9pbnQpIHtcbiAgICAgIC8vIOKImih4MuKIkngxKTIrKHky4oiSeTEpMlxuICAgICAgcmV0dXJuIE1hdGguc3FydChNYXRoLnBvdyh0aGlzLnggLSBwb2ludC54LCAyKSArIE1hdGgucG93KHRoaXMueSAtIHBvaW50LnksIDIpKTtcbiAgICB9XG5cbiAgICAvLyBzY2FsZSBwb2ludHMgZnJvbSBbQSwgQl0gdG8gW0MsIERdXG4gICAgLy8geEEgPT4gb2xkIHggbWluLCB4QiA9PiBvbGQgeCBtYXhcbiAgICAvLyB5QSA9PiBvbGQgeSBtaW4sIHlCID0+IG9sZCB5IG1heFxuICAgIC8vIHhDID0+IG5ldyB4IG1pbiwgeEQgPT4gbmV3IHggbWF4XG4gICAgLy8geUMgPT4gbmV3IHkgbWluLCB5RCA9PiBuZXcgeSBtYXhcbiAgICByZXNjYWxlKHhBLCB4QiwgeUEsIHlCLCB4QywgeEQsIHlDLCB5RCkge1xuICAgICAgLy8gTmV3VmFsdWUgPSAoKChPbGRWYWx1ZSAtIE9sZE1pbikgKiBOZXdSYW5nZSkgLyBPbGRSYW5nZSkgKyBOZXdNaW5cblxuICAgICAgdmFyIHhPbGRSYW5nZSA9IHhCIC0geEE7XG4gICAgICB2YXIgeU9sZFJhbmdlID0geUIgLSB5QTtcblxuICAgICAgdmFyIHhOZXdSYW5nZSA9IHhEIC0geEM7XG4gICAgICB2YXIgeU5ld1JhbmdlID0geUQgLSB5QztcblxuICAgICAgdGhpcy54ID0gKCgodGhpcy54IC0geEEpICogeE5ld1JhbmdlKSAvIHhPbGRSYW5nZSkgKyB4QztcbiAgICAgIHRoaXMueSA9ICgoKHRoaXMueSAtIHlBKSAqIHlOZXdSYW5nZSkgLyB5T2xkUmFuZ2UpICsgeUM7XG4gICAgfVxuXG4gICAgcmVzZXRDb2xvcigpIHtcbiAgICAgIHRoaXMuX2NhbnZhc0NvbG9yID0gdW5kZWZpbmVkO1xuICAgIH1cbiAgfVxuXG4gIGlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gX1BvaW50O1xuICB9XG5cbiAgUG9pbnQgPSBfUG9pbnQ7XG59KSgpO1xuIiwidmFyIFJhbmRvbTtcblxuKGZ1bmN0aW9uKCkge1xuICAndXNlIHN0cmljdCc7XG4gIC8vIFJhbmRvbSBoZWxwZXIgZnVuY3Rpb25zLy8gcmFuZG9tIGhlbHBlciBmdW5jdGlvbnNcblxuICB2YXIgUG9pbnQgPSBQb2ludCB8fCByZXF1aXJlKCcuL3BvaW50Jyk7XG5cbiAgUmFuZG9tID0ge1xuICAgIC8vIGhleSBsb29rIGEgY2xvc3VyZVxuICAgIC8vIHJldHVybnMgZnVuY3Rpb24gZm9yIHJhbmRvbSBudW1iZXJzIHdpdGggcHJlLXNldCBtYXggYW5kIG1pblxuICAgIHJhbmRvbU51bWJlckZ1bmN0aW9uOiBmdW5jdGlvbihtYXgsIG1pbikge1xuICAgICAgbWluID0gbWluIHx8IDA7XG4gICAgICBpZiAobWluID4gbWF4KSB7XG4gICAgICAgIHZhciB0ZW1wID0gbWF4O1xuICAgICAgICBtYXggPSBtaW47XG4gICAgICAgIG1pbiA9IHRlbXA7XG4gICAgICB9XG4gICAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAobWF4IC0gbWluICsgMSkpICsgbWluO1xuICAgICAgfTtcbiAgICB9LFxuXG4gICAgLy8gcmV0dXJucyBhIHJhbmRvbSBudW1iZXJcbiAgICAvLyBiZXR3ZWVuIHRoZSBtYXggYW5kIG1pblxuICAgIHJhbmRvbUJldHdlZW46IGZ1bmN0aW9uKG1heCwgbWluKSB7XG4gICAgICBtaW4gPSBtaW4gfHwgMDtcbiAgICAgIHJldHVybiBSYW5kb20ucmFuZG9tTnVtYmVyRnVuY3Rpb24obWF4LCBtaW4pKCk7XG4gICAgfSxcblxuICAgIHJhbmRvbUluQ2lyY2xlOiBmdW5jdGlvbihyYWRpdXMsIG94LCBveSkge1xuICAgICAgdmFyIGFuZ2xlID0gTWF0aC5yYW5kb20oKSAqIE1hdGguUEkgKiAyO1xuICAgICAgdmFyIHJhZCA9IE1hdGguc3FydChNYXRoLnJhbmRvbSgpKSAqIHJhZGl1cztcbiAgICAgIHZhciB4ID0gb3ggKyByYWQgKiBNYXRoLmNvcyhhbmdsZSk7XG4gICAgICB2YXIgeSA9IG95ICsgcmFkICogTWF0aC5zaW4oYW5nbGUpO1xuXG4gICAgICByZXR1cm4gbmV3IFBvaW50KHgsIHkpO1xuICAgIH0sXG5cbiAgICByYW5kb21SZ2JhOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiAncmdiYSgnICsgUmFuZG9tLnJhbmRvbUJldHdlZW4oMjU1KSArICcsJyArXG4gICAgICAgICAgICAgICAgICAgICAgIFJhbmRvbS5yYW5kb21CZXR3ZWVuKDI1NSkgKyAnLCcgK1xuICAgICAgICAgICAgICAgICAgICAgICBSYW5kb20ucmFuZG9tQmV0d2VlbigyNTUpICsgJywgMSknO1xuICAgIH0sXG5cbiAgICByYW5kb21Ic2xhOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiAnaHNsYSgnICsgUmFuZG9tLnJhbmRvbUJldHdlZW4oMzYwKSArICcsJyArXG4gICAgICAgICAgICAgICAgICAgICAgIFJhbmRvbS5yYW5kb21CZXR3ZWVuKDEwMCkgKyAnJSwnICtcbiAgICAgICAgICAgICAgICAgICAgICAgUmFuZG9tLnJhbmRvbUJldHdlZW4oMTAwKSArICclLCAxKSc7XG4gICAgfSxcbiAgfTtcblxuICBpZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IFJhbmRvbTtcbiAgfVxuXG59KSgpO1xuIl19
