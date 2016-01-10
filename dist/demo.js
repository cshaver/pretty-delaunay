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
      console.log(document.cookie);
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

  var form = document.getElementById('form');
  var maxInput = document.getElementById('maxPoints');
  var minInput = document.getElementById('minPoints');
  var maxEdgeInput = document.getElementById('maxEdgePoints');
  var minEdgeInput = document.getElementById('minEdgePoints');
  var maxGradientInput = document.getElementById('maxGradients');
  var minGradientInput = document.getElementById('minGradients');

  var minPoints, maxPoints, minEdgePoints, maxEdgePoints, minGradients, maxGradients, colors;

  var showTriangles, showPoints, showCircles, showCentroids, showEdges;

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
  }

  // get options from input fields
  function getRandomizeOptions() {
    minPoints = parseInt(minInput.value);
    maxPoints = parseInt(maxInput.value);
    minEdgePoints = parseInt(minEdgeInput.value);
    maxEdgePoints = parseInt(maxEdgeInput.value);
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
    prettyDelaunay.renderNewTriangles(minPoints, maxPoints, minEdgePoints, maxEdgePoints);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJsaWIvY29sb3IuanMiLCJsaWIvZGVtby5qcyIsImxpYi9wb2ludC5qcyIsImxpYi9yYW5kb20uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztBQ0FBLElBQUksS0FBSyxDQUFDOztBQUVWLENBQUMsWUFBVztBQUNWLGNBQVk7O0FBQUM7QUFFYixPQUFLLEdBQUc7O0FBRU4sYUFBUyxFQUFFLG1CQUFTLEdBQUcsRUFBRTtBQUN2QixTQUFHLEdBQUcsR0FBRyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUMsRUFBRSxDQUFDLENBQUM7QUFDMUIsVUFBSSxDQUFDLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0FBQ3pDLFVBQUksQ0FBQyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztBQUN6QyxVQUFJLENBQUMsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7O0FBRXpDLGFBQU8sT0FBTyxHQUFHLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDLEdBQUcsS0FBSyxDQUFDO0tBQ2hEOztBQUVELGtCQUFjLEVBQUUsd0JBQVMsR0FBRyxFQUFFO0FBQzVCLFNBQUcsR0FBRyxHQUFHLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBQyxFQUFFLENBQUMsQ0FBQztBQUMxQixVQUFJLENBQUMsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7QUFDekMsVUFBSSxDQUFDLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FB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YUFBYSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEdBQUcsR0FDL0IsTUFBTSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsR0FBRyxHQUFHLEdBQy9CLE1BQU0sQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLEdBQUcsTUFBTSxDQUFDO0tBQ3JEOztBQUVELGNBQVUsRUFBRSxzQkFBVztBQUNyQixhQUFPLE9BQU8sR0FBRyxNQUFNLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEdBQUcsR0FDL0IsTUFBTSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLEdBQ2hDLE1BQU0sQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLEdBQUcsT0FBTyxDQUFDO0tBQ3REO0dBQ0YsQ0FBQzs7QUFFRixNQUFJLE9BQU8sTUFBTSxLQUFLLFdBQVcsRUFBRTtBQUNqQyxVQUFNLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQztHQUN6QjtDQUVGLENBQUEsRUFBRyxDQUFDIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBDb2xvcjtcblxuKGZ1bmN0aW9uKCkge1xuICAndXNlIHN0cmljdCc7XG4gIC8vIGNvbG9yIGhlbHBlciBmdW5jdGlvbnNcbiAgQ29sb3IgPSB7XG5cbiAgICBoZXhUb1JnYmE6IGZ1bmN0aW9uKGhleCkge1xuICAgICAgaGV4ID0gaGV4LnJlcGxhY2UoJyMnLCcnKTtcbiAgICAgIHZhciByID0gcGFyc2VJbnQoaGV4LnN1YnN0cmluZygwLDIpLCAxNik7XG4gICAgICB2YXIgZyA9IHBhcnNlSW50KGhleC5zdWJzdHJpbmcoMiw0KSwgMTYpO1xuICAgICAgdmFyIGIgPSBwYXJzZUludChoZXguc3Vic3RyaW5nKDQsNiksIDE2KTtcblxuICAgICAgcmV0dXJuICdyZ2JhKCcgKyByICsgJywnICsgZyArICcsJyArIGIgKyAnLDEpJztcbiAgICB9LFxuXG4gICAgaGV4VG9SZ2JhQXJyYXk6IGZ1bmN0aW9uKGhleCkge1xuICAgICAgaGV4ID0gaGV4LnJlcGxhY2UoJyMnLCcnKTtcbiAgICAgIHZhciByID0gcGFyc2VJbnQoaGV4LnN1YnN0cmluZygwLDIpLCAxNik7XG4gICAgICB2YXIgZyA9IHBhcnNlSW50KGhleC5zdWJzdHJpbmcoMiw0KSwgMTYpO1xuICAgICAgdmFyIGIgPSBwYXJzZUludChoZXguc3Vic3RyaW5nKDQsNiksIDE2KTtcblxuICAgICAgcmV0dXJuIFtyLCBnLCBiXTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ29udmVydHMgYW4gUkdCIGNvbG9yIHZhbHVlIHRvIEhTTC4gQ29udmVyc2lvbiBmb3JtdWxhXG4gICAgICogYWRhcHRlZCBmcm9tIGh0dHA6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvSFNMX2NvbG9yX3NwYWNlLlxuICAgICAqIEFzc3VtZXMgciwgZywgYW5kIGIgYXJlIGNvbnRhaW5lZCBpbiB0aGUgc2V0IFswLCAyNTVdIGFuZFxuICAgICAqIHJldHVybnMgaCwgcywgYW5kIGwgaW4gdGhlIHNldCBbMCwgMV0uXG4gICAgICpcbiAgICAgKiBAcGFyYW0gICBOdW1iZXIgIHIgICAgICAgVGhlIHJlZCBjb2xvciB2YWx1ZVxuICAgICAqIEBwYXJhbSAgIE51bWJlciAgZyAgICAgICBUaGUgZ3JlZW4gY29sb3IgdmFsdWVcbiAgICAgKiBAcGFyYW0gICBOdW1iZXIgIGIgICAgICAgVGhlIGJsdWUgY29sb3IgdmFsdWVcbiAgICAgKiBAcmV0dXJuICBBcnJheSAgICAgICAgICAgVGhlIEhTTCByZXByZXNlbnRhdGlvblxuICAgICAqL1xuICAgIHJnYlRvSHNsYTogZnVuY3Rpb24ocmdiKSB7XG4gICAgICB2YXIgciA9IHJnYlswXSAvIDI1NTtcbiAgICAgIHZhciBnID0gcmdiWzFdIC8gMjU1O1xuICAgICAgdmFyIGIgPSByZ2JbMl0gLyAyNTU7XG4gICAgICB2YXIgbWF4ID0gTWF0aC5tYXgociwgZywgYik7XG4gICAgICB2YXIgbWluID0gTWF0aC5taW4ociwgZywgYik7XG4gICAgICB2YXIgaDtcbiAgICAgIHZhciBzO1xuICAgICAgdmFyIGwgPSAobWF4ICsgbWluKSAvIDI7XG5cbiAgICAgIGlmIChtYXggPT09IG1pbikge1xuICAgICAgICBoID0gcyA9IDA7IC8vIGFjaHJvbWF0aWNcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBkID0gbWF4IC0gbWluO1xuICAgICAgICBzID0gbCA+IDAuNSA/IGQgLyAoMiAtIG1heCAtIG1pbikgOiBkIC8gKG1heCArIG1pbik7XG4gICAgICAgIHN3aXRjaCAobWF4KXtcbiAgICAgICAgICBjYXNlIHI6IGggPSAoZyAtIGIpIC8gZCArIChnIDwgYiA/IDYgOiAwKTsgYnJlYWs7XG4gICAgICAgICAgY2FzZSBnOiBoID0gKGIgLSByKSAvIGQgKyAyOyBicmVhaztcbiAgICAgICAgICBjYXNlIGI6IGggPSAociAtIGcpIC8gZCArIDQ7IGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGggLz0gNjtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuICdoc2xhKCcgKyBNYXRoLnJvdW5kKGggKiAzNjApICsgJywnICsgTWF0aC5yb3VuZChzICogMTAwKSArICclLCcgKyBNYXRoLnJvdW5kKGwgKiAxMDApICsgJyUsMSknO1xuICAgIH0sXG5cbiAgICBoc2xhQWRqdXN0QWxwaGE6IGZ1bmN0aW9uKGNvbG9yLCBhbHBoYSkge1xuICAgICAgY29sb3IgPSBjb2xvci5zcGxpdCgnLCcpO1xuXG4gICAgICBpZiAodHlwZW9mIGFscGhhICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIGNvbG9yWzNdID0gYWxwaGE7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb2xvclszXSA9IGFscGhhKHBhcnNlSW50KGNvbG9yWzNdKSk7XG4gICAgICB9XG5cbiAgICAgIGNvbG9yWzNdICs9ICcpJztcbiAgICAgIHJldHVybiBjb2xvci5qb2luKCcsJyk7XG4gICAgfSxcblxuICAgIGhzbGFBZGp1c3RMaWdodG5lc3M6IGZ1bmN0aW9uKGNvbG9yLCBsaWdodG5lc3MpIHtcbiAgICAgIGNvbG9yID0gY29sb3Iuc3BsaXQoJywnKTtcblxuICAgICAgaWYgKHR5cGVvZiBsaWdodG5lc3MgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgY29sb3JbMl0gPSBsaWdodG5lc3M7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb2xvclsyXSA9IGxpZ2h0bmVzcyhwYXJzZUludChjb2xvclsyXSkpO1xuICAgICAgfVxuXG4gICAgICBjb2xvclsyXSArPSAnJSc7XG4gICAgICByZXR1cm4gY29sb3Iuam9pbignLCcpO1xuICAgIH0sXG5cbiAgICByZ2JUb0hleDogZnVuY3Rpb24ocmdiKSB7XG4gICAgICBpZiAodHlwZW9mIHJnYiA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgcmdiID0gcmdiLnJlcGxhY2UoJ3JnYignLCAnJykucmVwbGFjZSgnKScsICcnKS5zcGxpdCgnLCcpO1xuICAgICAgfVxuICAgICAgcmdiID0gcmdiLm1hcChmdW5jdGlvbih4KSB7XG4gICAgICAgIHggPSBwYXJzZUludCh4KS50b1N0cmluZygxNik7XG4gICAgICAgIHJldHVybiAoeC5sZW5ndGggPT09IDEpID8gJzAnICsgeCA6IHg7XG4gICAgICB9KTtcbiAgICAgIHJldHVybiByZ2Iuam9pbignJyk7XG4gICAgfSxcbiAgfTtcblxuICBpZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IENvbG9yO1xuICB9XG5cbn0pKCk7XG4iLCIoZnVuY3Rpb24oKSB7XG4gICd1c2Ugc3RyaWN0JztcblxuICB2YXIgQ29sb3IgID0gcmVxdWlyZSgnLi9jb2xvcicpO1xuICB2YXIgUmFuZG9tID0gcmVxdWlyZSgnLi9yYW5kb20nKTtcblxuICB2YXIgQ29va2llcyA9IHtcbiAgICBnZXRJdGVtOiBmdW5jdGlvbihzS2V5KSB7XG4gICAgICBpZiAoIXNLZXkpIHsgcmV0dXJuIG51bGw7IH1cbiAgICAgIHJldHVybiBkZWNvZGVVUklDb21wb25lbnQoXG4gICAgICAgIGRvY3VtZW50LmNvb2tpZS5yZXBsYWNlKFxuICAgICAgICAgIG5ldyBSZWdFeHAoXG4gICAgICAgICAgICAgICcoPzooPzpefC4qOylcXFxccyonICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICtcbiAgICAgICAgICAgICAgZW5jb2RlVVJJQ29tcG9uZW50KHNLZXkpLnJlcGxhY2UoL1tcXC1cXC5cXCtcXCpdL2csICdcXFxcJCYnKSAgICtcbiAgICAgICAgICAgICAgJ1xcXFxzKlxcXFw9XFxcXHMqKFteO10qKS4qJCl8Xi4qJCcpLCAnJDEnKVxuICAgICAgICAgICAgKSB8fCBudWxsO1xuICAgIH0sXG5cbiAgICBzZXRJdGVtOiBmdW5jdGlvbihzS2V5LCBzVmFsdWUsIHZFbmQsIHNQYXRoLCBzRG9tYWluLCBiU2VjdXJlKSB7XG4gICAgICBpZiAoIXNLZXkgfHwgL14oPzpleHBpcmVzfG1heFxcLWFnZXxwYXRofGRvbWFpbnxzZWN1cmUpJC9pLnRlc3Qoc0tleSkpIHsgcmV0dXJuIGZhbHNlOyB9XG4gICAgICB2YXIgc0V4cGlyZXMgPSAnJztcbiAgICAgIGlmICh2RW5kKSB7XG4gICAgICAgIHN3aXRjaCAodkVuZC5jb25zdHJ1Y3Rvcikge1xuICAgICAgICAgIGNhc2UgTnVtYmVyOlxuICAgICAgICAgICAgc0V4cGlyZXMgPSB2RW5kID09PSBJbmZpbml0eSA/ICc7IGV4cGlyZXM9RnJpLCAzMSBEZWMgOTk5OSAyMzo1OTo1OSBHTVQnIDogJzsgbWF4LWFnZT0nICsgdkVuZDtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGNhc2UgU3RyaW5nOlxuICAgICAgICAgICAgc0V4cGlyZXMgPSAnOyBleHBpcmVzPScgKyB2RW5kO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgY2FzZSBEYXRlOlxuICAgICAgICAgICAgc0V4cGlyZXMgPSAnOyBleHBpcmVzPScgKyB2RW5kLnRvVVRDU3RyaW5nKCk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgZG9jdW1lbnQuY29va2llID0gZW5jb2RlVVJJQ29tcG9uZW50KHNLZXkpICtcbiAgICAgICAgJz0nICtcbiAgICAgICAgZW5jb2RlVVJJQ29tcG9uZW50KHNWYWx1ZSkgK1xuICAgICAgICBzRXhwaXJlcyArXG4gICAgICAgIChzRG9tYWluID8gJzsgZG9tYWluPScgK1xuICAgICAgICBzRG9tYWluIDogJycpICtcbiAgICAgICAgKHNQYXRoID8gJzsgcGF0aD0nICtcbiAgICAgICAgc1BhdGggOiAnJykgK1xuICAgICAgICAoYlNlY3VyZSA/ICc7IHNlY3VyZScgOiAnJyk7XG4gICAgICBjb25zb2xlLmxvZyhkb2N1bWVudC5jb29raWUpO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSxcblxuICAgIHJlbW92ZUl0ZW06IGZ1bmN0aW9uKHNLZXksIHNQYXRoLCBzRG9tYWluKSB7XG4gICAgICBpZiAoIXRoaXMuaGFzSXRlbShzS2V5KSkgeyByZXR1cm4gZmFsc2U7IH1cbiAgICAgIGRvY3VtZW50LmNvb2tpZSA9IGVuY29kZVVSSUNvbXBvbmVudChzS2V5KSAgICArXG4gICAgICAgICc9OyBleHBpcmVzPVRodSwgMDEgSmFuIDE5NzAgMDA6MDA6MDAgR01UJyAgK1xuICAgICAgICAoc0RvbWFpbiA/ICc7IGRvbWFpbj0nICsgc0RvbWFpbiA6ICcnKSAgICAgICtcbiAgICAgICAgKHNQYXRoICAgPyAnOyBwYXRoPScgICArIHNQYXRoICAgOiAnJyk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9LFxuXG4gICAgaGFzSXRlbTogZnVuY3Rpb24oc0tleSkge1xuICAgICAgaWYgKCFzS2V5KSB7IHJldHVybiBmYWxzZTsgfVxuICAgICAgcmV0dXJuIChuZXcgUmVnRXhwKCcoPzpefDtcXFxccyopJyArIGVuY29kZVVSSUNvbXBvbmVudChzS2V5KVxuICAgICAgICAucmVwbGFjZSgvW1xcLVxcLlxcK1xcKl0vZywgJ1xcXFwkJicpICsgJ1xcXFxzKlxcXFw9JykpXG4gICAgICAgIC50ZXN0KGRvY3VtZW50LmNvb2tpZSk7XG4gICAgfSxcblxuICAgIGtleXM6IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGFLZXlzID0gZG9jdW1lbnQuY29va2llLnJlcGxhY2UoLygoPzpefFxccyo7KVteXFw9XSspKD89O3wkKXxeXFxzKnxcXHMqKD86XFw9W147XSopPyg/OlxcMXwkKS9nLCAnJylcbiAgICAgICAgLnNwbGl0KC9cXHMqKD86XFw9W147XSopPztcXHMqLyk7XG4gICAgICBmb3IgKHZhciBuTGVuID0gYUtleXMubGVuZ3RoLCBuSWR4ID0gMDsgbklkeCA8IG5MZW47IG5JZHgrKykgeyBhS2V5c1tuSWR4XSA9IGRlY29kZVVSSUNvbXBvbmVudChhS2V5c1tuSWR4XSk7IH1cbiAgICAgIHJldHVybiBhS2V5cztcbiAgICB9LFxuICB9O1xuXG4gIC8vIHNldCB1cCB2YXJpYWJsZXMgZm9yIGNhbnZhcywgaW5wdXRzLCBldGNcbiAgY29uc3QgY2FudmFzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NhbnZhcycpO1xuXG4gIGNvbnN0IGJ1dHRvbiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdidXR0b24nKTtcblxuICBjb25zdCBnZW5lcmF0ZUNvbG9yc0J1dHRvbiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdnZW5lcmF0ZUNvbG9ycycpO1xuICBjb25zdCBnZW5lcmF0ZUdyYWRpZW50QnV0dG9uID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2dlbmVyYXRlR3JhZGllbnQnKTtcbiAgY29uc3QgZ2VuZXJhdGVUcmlhbmdsZXNCdXR0b24gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZ2VuZXJhdGVUcmlhbmdsZXMnKTtcblxuICBjb25zdCB0b2dnbGVUcmlhbmdsZXNCdXR0b24gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgndG9nZ2xlVHJpYW5nbGVzJyk7XG4gIGNvbnN0IHRvZ2dsZVBvaW50c0J1dHRvbiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCd0b2dnbGVQb2ludHMnKTtcbiAgY29uc3QgdG9nZ2xlQ2lyY2xlc0J1dHRvbiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCd0b2dnbGVDaXJjbGVzJyk7XG4gIGNvbnN0IHRvZ2dsZUNlbnRyb2lkc0J1dHRvbiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCd0b2dnbGVDZW50cm9pZHMnKTtcbiAgY29uc3QgdG9nZ2xlRWRnZXNCdXR0b24gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgndG9nZ2xlRWRnZXMnKTtcblxuICBjb25zdCBmb3JtID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2Zvcm0nKTtcbiAgY29uc3QgbWF4SW5wdXQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbWF4UG9pbnRzJyk7XG4gIGNvbnN0IG1pbklucHV0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ21pblBvaW50cycpO1xuICBjb25zdCBtYXhFZGdlSW5wdXQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbWF4RWRnZVBvaW50cycpO1xuICBjb25zdCBtaW5FZGdlSW5wdXQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbWluRWRnZVBvaW50cycpO1xuICBjb25zdCBtYXhHcmFkaWVudElucHV0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ21heEdyYWRpZW50cycpO1xuICBjb25zdCBtaW5HcmFkaWVudElucHV0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ21pbkdyYWRpZW50cycpO1xuXG4gIHZhciBtaW5Qb2ludHMsIG1heFBvaW50cywgbWluRWRnZVBvaW50cywgbWF4RWRnZVBvaW50cywgbWluR3JhZGllbnRzLCBtYXhHcmFkaWVudHMsIGNvbG9ycztcblxuICB2YXIgc2hvd1RyaWFuZ2xlcywgc2hvd1BvaW50cywgc2hvd0NpcmNsZXMsIHNob3dDZW50cm9pZHMsIHNob3dFZGdlcztcblxuICB2YXIgb3B0aW9ucyA9IHtcbiAgICBvbkRhcmtCYWNrZ3JvdW5kOiBmdW5jdGlvbigpIHtcbiAgICAgIGZvcm0uY2xhc3NOYW1lID0gJ2Zvcm0gbGlnaHQnO1xuICAgIH0sXG4gICAgb25MaWdodEJhY2tncm91bmQ6IGZ1bmN0aW9uKCkge1xuICAgICAgZm9ybS5jbGFzc05hbWUgPSAnZm9ybSBkYXJrJztcbiAgICB9LFxuICB9O1xuXG4gIGdldENvb2tpZXMoKTtcblxuICAvLyBpbml0aWFsaXplIHRoZSBQcmV0dHlEZWxhdW5heSBvYmplY3RcbiAgbGV0IHByZXR0eURlbGF1bmF5ID0gbmV3IFByZXR0eURlbGF1bmF5KGNhbnZhcywgb3B0aW9ucyk7XG5cbiAgLy8gaW5pdGlhbCBnZW5lcmF0aW9uXG4gIHJ1bkRlbGF1bmF5KCk7XG5cbiAgLyoqXG4gICAqIHV0aWwgZnVuY3Rpb25zXG4gICAqL1xuXG4gIC8vIGdldCBvcHRpb25zIGFuZCByZS1yYW5kb21pemVcbiAgZnVuY3Rpb24gcnVuRGVsYXVuYXkoKSB7XG4gICAgZ2V0UmFuZG9taXplT3B0aW9ucygpO1xuICAgIHByZXR0eURlbGF1bmF5LnJhbmRvbWl6ZShtaW5Qb2ludHMsIG1heFBvaW50cywgbWluRWRnZVBvaW50cywgbWF4RWRnZVBvaW50cywgbWluR3JhZGllbnRzLCBtYXhHcmFkaWVudHMsIGNvbG9ycyk7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRDb2xvcnMoKSB7XG4gICAgdmFyIGNvbG9ycyA9IFtdO1xuXG4gICAgaWYgKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjb2xvclR5cGUxJykuY2hlY2tlZCkge1xuICAgICAgLy8gZ2VuZXJhdGUgcmFuZG9tIGNvbG9yc1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCAzOyBpKyspIHtcbiAgICAgICAgdmFyIGNvbG9yID0gUmFuZG9tLnJhbmRvbUhzbGEoKTtcbiAgICAgICAgY29sb3JzLnB1c2goY29sb3IpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyB1c2UgdGhlIG9uZXMgaW4gdGhlIGlucHV0c1xuICAgICAgY29sb3JzLnB1c2goQ29sb3IucmdiVG9Ic2xhKENvbG9yLmhleFRvUmdiYUFycmF5KGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjb2xvcjEnKS52YWx1ZSkpKTtcbiAgICAgIGNvbG9ycy5wdXNoKENvbG9yLnJnYlRvSHNsYShDb2xvci5oZXhUb1JnYmFBcnJheShkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY29sb3IyJykudmFsdWUpKSk7XG4gICAgICBjb2xvcnMucHVzaChDb2xvci5yZ2JUb0hzbGEoQ29sb3IuaGV4VG9SZ2JhQXJyYXkoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NvbG9yMycpLnZhbHVlKSkpO1xuICAgIH1cblxuICAgIHJldHVybiBjb2xvcnM7XG4gIH1cblxuICAvLyBnZXQgb3B0aW9ucyBmcm9tIGNvb2tpZXNcbiAgZnVuY3Rpb24gZ2V0Q29va2llcygpIHtcbiAgICB2YXIgZGVmYXVsdHMgPSBQcmV0dHlEZWxhdW5heS5kZWZhdWx0cygpO1xuXG4gICAgc2hvd1RyaWFuZ2xlcyA9IENvb2tpZXMuZ2V0SXRlbSgnRGVsYXVuYXlTaG93VHJpYW5nbGVzJyk7XG4gICAgc2hvd1BvaW50cyAgICA9IENvb2tpZXMuZ2V0SXRlbSgnRGVsYXVuYXlTaG93UG9pbnRzJyk7XG4gICAgc2hvd0NpcmNsZXMgICA9IENvb2tpZXMuZ2V0SXRlbSgnRGVsYXVuYXlTaG93Q2lyY2xlcycpO1xuICAgIHNob3dDZW50cm9pZHMgPSBDb29raWVzLmdldEl0ZW0oJ0RlbGF1bmF5U2hvd0NlbnRyb2lkcycpO1xuICAgIHNob3dFZGdlcyAgICAgPSBDb29raWVzLmdldEl0ZW0oJ0RlbGF1bmF5U2hvd0VkZ2VzJyk7XG5cbiAgICAvLyBUT0RPOiBEUllcbiAgICAvLyBvbmx5IHNldCBvcHRpb24gZnJvbSBjb29raWUgaWYgaXQgZXhpc3RzLCBwYXJzZSB0byBib29sZWFuXG4gICAgaWYgKHNob3dUcmlhbmdsZXMpIHtcbiAgICAgIG9wdGlvbnMuc2hvd1RyaWFuZ2xlcyA9IHNob3dUcmlhbmdsZXMgPSBzaG93VHJpYW5nbGVzID09PSAndHJ1ZScgPyB0cnVlIDogZmFsc2U7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIHNhdmUgb3B0aW9uIHN0YXRlIGZvciBzZXR0aW5nIGNvb2tpZSBsYXRlclxuICAgICAgc2hvd1RyaWFuZ2xlcyA9IGRlZmF1bHRzLnNob3dUcmlhbmdsZXM7XG4gICAgfVxuXG4gICAgaWYgKHNob3dQb2ludHMpIHtcbiAgICAgIG9wdGlvbnMuc2hvd1BvaW50cyA9IHNob3dQb2ludHMgPSBzaG93UG9pbnRzID09PSAndHJ1ZScgPyB0cnVlIDogZmFsc2U7XG4gICAgfSBlbHNlIHtcbiAgICAgIHNob3dQb2ludHMgPSBkZWZhdWx0cy5zaG93UG9pbnRzO1xuICAgIH1cblxuICAgIGlmIChzaG93Q2lyY2xlcykge1xuICAgICAgb3B0aW9ucy5zaG93Q2lyY2xlcyA9IHNob3dDaXJjbGVzID0gc2hvd0NpcmNsZXMgPT09ICd0cnVlJyA/IHRydWUgOiBmYWxzZTtcbiAgICB9IGVsc2Uge1xuICAgICAgc2hvd0NpcmNsZXMgPSBkZWZhdWx0cy5zaG93Q2lyY2xlcztcbiAgICB9XG5cbiAgICBpZiAoc2hvd0NlbnRyb2lkcykge1xuICAgICAgb3B0aW9ucy5zaG93Q2VudHJvaWRzID0gc2hvd0NlbnRyb2lkcyA9IHNob3dDZW50cm9pZHMgPT09ICd0cnVlJyA/IHRydWUgOiBmYWxzZTtcbiAgICB9IGVsc2Uge1xuICAgICAgc2hvd0NlbnRyb2lkcyA9IGRlZmF1bHRzLnNob3dDZW50cm9pZHM7XG4gICAgfVxuXG4gICAgaWYgKHNob3dFZGdlcykge1xuICAgICAgb3B0aW9ucy5zaG93RWRnZXMgPSBzaG93RWRnZXMgPSBzaG93RWRnZXMgPT09ICd0cnVlJyA/IHRydWUgOiBmYWxzZTtcbiAgICB9IGVsc2Uge1xuICAgICAgc2hvd0VkZ2VzID0gZGVmYXVsdHMuc2hvd0VkZ2VzO1xuICAgIH1cbiAgfVxuXG4gIC8vIGdldCBvcHRpb25zIGZyb20gaW5wdXQgZmllbGRzXG4gIGZ1bmN0aW9uIGdldFJhbmRvbWl6ZU9wdGlvbnMoKSB7XG4gICAgbWluUG9pbnRzID0gcGFyc2VJbnQobWluSW5wdXQudmFsdWUpO1xuICAgIG1heFBvaW50cyA9IHBhcnNlSW50KG1heElucHV0LnZhbHVlKTtcbiAgICBtaW5FZGdlUG9pbnRzID0gcGFyc2VJbnQobWluRWRnZUlucHV0LnZhbHVlKTtcbiAgICBtYXhFZGdlUG9pbnRzID0gcGFyc2VJbnQobWF4RWRnZUlucHV0LnZhbHVlKTtcbiAgICBtaW5HcmFkaWVudHMgPSBwYXJzZUludChtaW5HcmFkaWVudElucHV0LnZhbHVlKTtcbiAgICBtYXhHcmFkaWVudHMgPSBwYXJzZUludChtYXhHcmFkaWVudElucHV0LnZhbHVlKTtcbiAgICBjb2xvcnMgPSBnZXRDb2xvcnMoKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHRocm90dGxlKHR5cGUsIG5hbWUsIG9iaikge1xuICAgIG9iaiA9IG9iaiB8fCB3aW5kb3c7XG4gICAgdmFyIHJ1bm5pbmcgPSBmYWxzZTtcbiAgICB2YXIgZnVuYyA9IGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKHJ1bm5pbmcpIHsgcmV0dXJuOyB9XG4gICAgICBydW5uaW5nID0gdHJ1ZTtcbiAgICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZShmdW5jdGlvbigpIHtcbiAgICAgICAgb2JqLmRpc3BhdGNoRXZlbnQobmV3IEN1c3RvbUV2ZW50KG5hbWUpKTtcbiAgICAgICAgcnVubmluZyA9IGZhbHNlO1xuICAgICAgfSk7XG4gICAgfTtcbiAgICBvYmouYWRkRXZlbnRMaXN0ZW5lcih0eXBlLCBmdW5jKTtcbiAgfVxuXG4gIC8qIGluaXQgLSB5b3UgY2FuIGluaXQgYW55IGV2ZW50ICovXG4gIHRocm90dGxlKCdyZXNpemUnLCAnb3B0aW1pemVkUmVzaXplJyk7XG5cbiAgLyoqXG4gICAqIHNldCB1cCBldmVudHNcbiAgICovXG5cbiAgLy8gY2xpY2sgdGhlIGJ1dHRvbiB0byByZWdlblxuICBidXR0b24uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbigpIHtcbiAgICBydW5EZWxhdW5heSgpO1xuICB9KTtcblxuICAvLyBjbGljayB0aGUgYnV0dG9uIHRvIHJlZ2VuIGNvbG9ycyBvbmx5XG4gIGdlbmVyYXRlQ29sb3JzQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG4gICAgdmFyIG5ld0NvbG9ycyA9IGdldENvbG9ycygpO1xuICAgIHByZXR0eURlbGF1bmF5LnJlbmRlck5ld0NvbG9ycyhuZXdDb2xvcnMpO1xuICB9KTtcblxuICAvLyBjbGljayB0aGUgYnV0dG9uIHRvIHJlZ2VuIGNvbG9ycyBvbmx5XG4gIGdlbmVyYXRlR3JhZGllbnRCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbigpIHtcbiAgICBnZXRSYW5kb21pemVPcHRpb25zKCk7XG4gICAgcHJldHR5RGVsYXVuYXkucmVuZGVyTmV3R3JhZGllbnQobWluR3JhZGllbnRzLCBtYXhHcmFkaWVudHMpO1xuICB9KTtcblxuICAvLyBjbGljayB0aGUgYnV0dG9uIHRvIHJlZ2VuIGNvbG9ycyBvbmx5XG4gIGdlbmVyYXRlVHJpYW5nbGVzQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG4gICAgZ2V0UmFuZG9taXplT3B0aW9ucygpO1xuICAgIHByZXR0eURlbGF1bmF5LnJlbmRlck5ld1RyaWFuZ2xlcyhtaW5Qb2ludHMsIG1heFBvaW50cywgbWluRWRnZVBvaW50cywgbWF4RWRnZVBvaW50cyk7XG4gIH0pO1xuXG4gIC8vIHR1cm4gVHJpYW5nbGVzIG9mZi9vblxuICB0b2dnbGVUcmlhbmdsZXNCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbigpIHtcbiAgICBzaG93VHJpYW5nbGVzID0gIXNob3dUcmlhbmdsZXM7XG4gICAgQ29va2llcy5zZXRJdGVtKCdEZWxhdW5heVNob3dUcmlhbmdsZXMnLCBzaG93VHJpYW5nbGVzKTtcbiAgICBwcmV0dHlEZWxhdW5heS50b2dnbGVUcmlhbmdsZXMoKTtcbiAgfSk7XG5cbiAgLy8gdHVybiBQb2ludHMgb2ZmL29uXG4gIHRvZ2dsZVBvaW50c0J1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuICAgIHNob3dQb2ludHMgPSAhc2hvd1BvaW50cztcbiAgICBDb29raWVzLnNldEl0ZW0oJ0RlbGF1bmF5U2hvd1BvaW50cycsIHNob3dQb2ludHMpO1xuICAgIHByZXR0eURlbGF1bmF5LnRvZ2dsZVBvaW50cygpO1xuICB9KTtcblxuICAvLyB0dXJuIENpcmNsZXMgb2ZmL29uXG4gIHRvZ2dsZUNpcmNsZXNCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbigpIHtcbiAgICBzaG93Q2lyY2xlcyA9ICFzaG93Q2lyY2xlcztcbiAgICBDb29raWVzLnNldEl0ZW0oJ0RlbGF1bmF5U2hvd0NpcmNsZXMnLCBzaG93Q2lyY2xlcyk7XG4gICAgcHJldHR5RGVsYXVuYXkudG9nZ2xlQ2lyY2xlcygpO1xuICB9KTtcblxuICAvLyB0dXJuIENlbnRyb2lkcyBvZmYvb25cbiAgdG9nZ2xlQ2VudHJvaWRzQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG4gICAgc2hvd0NlbnRyb2lkcyA9ICFzaG93Q2VudHJvaWRzO1xuICAgIENvb2tpZXMuc2V0SXRlbSgnRGVsYXVuYXlTaG93Q2VudHJvaWRzJywgc2hvd0NlbnRyb2lkcyk7XG4gICAgcHJldHR5RGVsYXVuYXkudG9nZ2xlQ2VudHJvaWRzKCk7XG4gIH0pO1xuXG4gIC8vIHR1cm4gRWRnZXMgb2ZmL29uXG4gIHRvZ2dsZUVkZ2VzQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG4gICAgc2hvd0VkZ2VzID0gIXNob3dFZGdlcztcbiAgICBDb29raWVzLnNldEl0ZW0oJ0RlbGF1bmF5U2hvd0VkZ2VzJywgc2hvd0VkZ2VzKTtcbiAgICBwcmV0dHlEZWxhdW5heS50b2dnbGVFZGdlcygpO1xuICB9KTtcblxuICAvLyByZXNpemUgZXZlbnRcbiAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ29wdGltaXplZFJlc2l6ZScsIGZ1bmN0aW9uKCkge1xuICAgIHByZXR0eURlbGF1bmF5LnJlc2NhbGUoKTtcbiAgfSk7XG5cbiAgLy8gZG9udCBkbyBhbnl0aGluZyBvbiBmb3JtIHN1Ym1pdFxuICBmb3JtLmFkZEV2ZW50TGlzdGVuZXIoJ3N1Ym1pdCcsIGZ1bmN0aW9uKGUpIHtcbiAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9KTtcbn0pKCk7XG4iLCJ2YXIgUG9pbnQ7XG5cbihmdW5jdGlvbigpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIHZhciBDb2xvciA9IENvbG9yIHx8IHJlcXVpcmUoJy4vY29sb3InKTtcblxuICAvKipcbiAgICogUmVwcmVzZW50cyBhIHBvaW50XG4gICAqIEBjbGFzc1xuICAgKi9cbiAgY2xhc3MgX1BvaW50IHtcbiAgICAvKipcbiAgICAgKiBQb2ludCBjb25zaXN0cyB4IGFuZCB5XG4gICAgICogQGNvbnN0cnVjdG9yXG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IHhcbiAgICAgKiBAcGFyYW0ge051bWJlcn0geVxuICAgICAqIG9yOlxuICAgICAqIEBwYXJhbSB7TnVtYmVyW119IHhcbiAgICAgKiB3aGVyZSB4IGlzIGxlbmd0aC0yIGFycmF5XG4gICAgICovXG4gICAgY29uc3RydWN0b3IoeCwgeSkge1xuICAgICAgaWYgKEFycmF5LmlzQXJyYXkoeCkpIHtcbiAgICAgICAgeSA9IHhbMV07XG4gICAgICAgIHggPSB4WzBdO1xuICAgICAgfVxuICAgICAgdGhpcy54ID0geDtcbiAgICAgIHRoaXMueSA9IHk7XG4gICAgICB0aGlzLnJhZGl1cyA9IDE7XG4gICAgICB0aGlzLmNvbG9yID0gJ2JsYWNrJztcbiAgICB9XG5cbiAgICAvLyBkcmF3IHRoZSBwb2ludFxuICAgIHJlbmRlcihjdHgsIGNvbG9yKSB7XG4gICAgICBjdHguYmVnaW5QYXRoKCk7XG4gICAgICBjdHguYXJjKHRoaXMueCwgdGhpcy55LCB0aGlzLnJhZGl1cywgMCwgMiAqIE1hdGguUEksIGZhbHNlKTtcbiAgICAgIGN0eC5maWxsU3R5bGUgPSBjb2xvciB8fCB0aGlzLmNvbG9yO1xuICAgICAgY3R4LmZpbGwoKTtcbiAgICAgIGN0eC5jbG9zZVBhdGgoKTtcbiAgICB9XG5cbiAgICAvLyBjb252ZXJ0cyB0byBzdHJpbmdcbiAgICAvLyByZXR1cm5zIHNvbWV0aGluZyBsaWtlOlxuICAgIC8vIFwiKFgsWSlcIlxuICAgIC8vIHVzZWQgaW4gdGhlIHBvaW50bWFwIHRvIGRldGVjdCB1bmlxdWUgcG9pbnRzXG4gICAgdG9TdHJpbmcoKSB7XG4gICAgICByZXR1cm4gJygnICsgdGhpcy54ICsgJywnICsgdGhpcy55ICsgJyknO1xuICAgIH1cblxuICAgIC8vIGdyYWIgdGhlIGNvbG9yIG9mIHRoZSBjYW52YXMgYXQgdGhlIHBvaW50XG4gICAgLy8gcmVxdWlyZXMgaW1hZ2VkYXRhIGZyb20gY2FudmFzIHNvIHdlIGRvbnQgZ3JhYlxuICAgIC8vIGVhY2ggcG9pbnQgaW5kaXZpZHVhbGx5LCB3aGljaCBpcyByZWFsbHkgZXhwZW5zaXZlXG4gICAgY2FudmFzQ29sb3JBdFBvaW50KGltYWdlRGF0YSwgY29sb3JTcGFjZSkge1xuICAgICAgY29sb3JTcGFjZSA9IGNvbG9yU3BhY2UgfHwgJ2hzbGEnO1xuICAgICAgLy8gb25seSBmaW5kIHRoZSBjYW52YXMgY29sb3IgaWYgd2UgZG9udCBhbHJlYWR5IGtub3cgaXRcbiAgICAgIGlmICghdGhpcy5fY2FudmFzQ29sb3IpIHtcbiAgICAgICAgLy8gaW1hZ2VEYXRhIGFycmF5IGlzIGZsYXQsIGdvZXMgYnkgcm93cyB0aGVuIGNvbHMsIGZvdXIgdmFsdWVzIHBlciBwaXhlbFxuICAgICAgICB2YXIgaWR4ID0gKE1hdGguZmxvb3IodGhpcy55KSAqIGltYWdlRGF0YS53aWR0aCAqIDQpICsgKE1hdGguZmxvb3IodGhpcy54KSAqIDQpO1xuXG4gICAgICAgIGlmIChjb2xvclNwYWNlID09PSAnaHNsYScpIHtcbiAgICAgICAgICB0aGlzLl9jYW52YXNDb2xvciA9IENvbG9yLnJnYlRvSHNsYShBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChpbWFnZURhdGEuZGF0YSwgaWR4LCBpZHggKyA0KSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy5fY2FudmFzQ29sb3IgPSAncmdiKCcgKyBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChpbWFnZURhdGEuZGF0YSwgaWR4LCBpZHggKyAzKS5qb2luKCkgKyAnKSc7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9jYW52YXNDb2xvcjtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzLl9jYW52YXNDb2xvcjtcbiAgICB9XG5cbiAgICBnZXRDb29yZHMoKSB7XG4gICAgICByZXR1cm4gW3RoaXMueCwgdGhpcy55XTtcbiAgICB9XG5cbiAgICAvLyBkaXN0YW5jZSB0byBhbm90aGVyIHBvaW50XG4gICAgZ2V0RGlzdGFuY2VUbyhwb2ludCkge1xuICAgICAgLy8g4oiaKHgy4oiSeDEpMisoeTLiiJJ5MSkyXG4gICAgICByZXR1cm4gTWF0aC5zcXJ0KE1hdGgucG93KHRoaXMueCAtIHBvaW50LngsIDIpICsgTWF0aC5wb3codGhpcy55IC0gcG9pbnQueSwgMikpO1xuICAgIH1cblxuICAgIC8vIHNjYWxlIHBvaW50cyBmcm9tIFtBLCBCXSB0byBbQywgRF1cbiAgICAvLyB4QSA9PiBvbGQgeCBtaW4sIHhCID0+IG9sZCB4IG1heFxuICAgIC8vIHlBID0+IG9sZCB5IG1pbiwgeUIgPT4gb2xkIHkgbWF4XG4gICAgLy8geEMgPT4gbmV3IHggbWluLCB4RCA9PiBuZXcgeCBtYXhcbiAgICAvLyB5QyA9PiBuZXcgeSBtaW4sIHlEID0+IG5ldyB5IG1heFxuICAgIHJlc2NhbGUoeEEsIHhCLCB5QSwgeUIsIHhDLCB4RCwgeUMsIHlEKSB7XG4gICAgICAvLyBOZXdWYWx1ZSA9ICgoKE9sZFZhbHVlIC0gT2xkTWluKSAqIE5ld1JhbmdlKSAvIE9sZFJhbmdlKSArIE5ld01pblxuXG4gICAgICB2YXIgeE9sZFJhbmdlID0geEIgLSB4QTtcbiAgICAgIHZhciB5T2xkUmFuZ2UgPSB5QiAtIHlBO1xuXG4gICAgICB2YXIgeE5ld1JhbmdlID0geEQgLSB4QztcbiAgICAgIHZhciB5TmV3UmFuZ2UgPSB5RCAtIHlDO1xuXG4gICAgICB0aGlzLnggPSAoKCh0aGlzLnggLSB4QSkgKiB4TmV3UmFuZ2UpIC8geE9sZFJhbmdlKSArIHhDO1xuICAgICAgdGhpcy55ID0gKCgodGhpcy55IC0geUEpICogeU5ld1JhbmdlKSAvIHlPbGRSYW5nZSkgKyB5QztcbiAgICB9XG4gIH1cblxuICBpZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IF9Qb2ludDtcbiAgfVxuXG4gIFBvaW50ID0gX1BvaW50O1xufSkoKTtcbiIsInZhciBSYW5kb207XG5cbihmdW5jdGlvbigpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuICAvLyBSYW5kb20gaGVscGVyIGZ1bmN0aW9ucy8vIHJhbmRvbSBoZWxwZXIgZnVuY3Rpb25zXG5cbiAgdmFyIFBvaW50ID0gUG9pbnQgfHwgcmVxdWlyZSgnLi9wb2ludCcpO1xuXG4gIFJhbmRvbSA9IHtcbiAgICAvLyBoZXkgbG9vayBhIGNsb3N1cmVcbiAgICAvLyByZXR1cm5zIGZ1bmN0aW9uIGZvciByYW5kb20gbnVtYmVycyB3aXRoIHByZS1zZXQgbWF4IGFuZCBtaW5cbiAgICByYW5kb21OdW1iZXJGdW5jdGlvbjogZnVuY3Rpb24obWF4LCBtaW4pIHtcbiAgICAgIG1pbiA9IG1pbiB8fCAwO1xuICAgICAgaWYgKG1pbiA+IG1heCkge1xuICAgICAgICB2YXIgdGVtcCA9IG1heDtcbiAgICAgICAgbWF4ID0gbWluO1xuICAgICAgICBtaW4gPSB0ZW1wO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogKG1heCAtIG1pbiArIDEpKSArIG1pbjtcbiAgICAgIH07XG4gICAgfSxcblxuICAgIC8vIHJldHVybnMgYSByYW5kb20gbnVtYmVyXG4gICAgLy8gYmV0d2VlbiB0aGUgbWF4IGFuZCBtaW5cbiAgICByYW5kb21CZXR3ZWVuOiBmdW5jdGlvbihtYXgsIG1pbikge1xuICAgICAgbWluID0gbWluIHx8IDA7XG4gICAgICByZXR1cm4gUmFuZG9tLnJhbmRvbU51bWJlckZ1bmN0aW9uKG1heCwgbWluKSgpO1xuICAgIH0sXG5cbiAgICByYW5kb21JbkNpcmNsZTogZnVuY3Rpb24ocmFkaXVzLCBveCwgb3kpIHtcbiAgICAgIHZhciBhbmdsZSA9IE1hdGgucmFuZG9tKCkgKiBNYXRoLlBJICogMjtcbiAgICAgIHZhciByYWQgPSBNYXRoLnNxcnQoTWF0aC5yYW5kb20oKSkgKiByYWRpdXM7XG4gICAgICB2YXIgeCA9IG94ICsgcmFkICogTWF0aC5jb3MoYW5nbGUpO1xuICAgICAgdmFyIHkgPSBveSArIHJhZCAqIE1hdGguc2luKGFuZ2xlKTtcblxuICAgICAgcmV0dXJuIG5ldyBQb2ludCh4LCB5KTtcbiAgICB9LFxuXG4gICAgcmFuZG9tUmdiYTogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gJ3JnYmEoJyArIFJhbmRvbS5yYW5kb21CZXR3ZWVuKDI1NSkgKyAnLCcgK1xuICAgICAgICAgICAgICAgICAgICAgICBSYW5kb20ucmFuZG9tQmV0d2VlbigyNTUpICsgJywnICtcbiAgICAgICAgICAgICAgICAgICAgICAgUmFuZG9tLnJhbmRvbUJldHdlZW4oMjU1KSArICcsIDEpJztcbiAgICB9LFxuXG4gICAgcmFuZG9tSHNsYTogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gJ2hzbGEoJyArIFJhbmRvbS5yYW5kb21CZXR3ZWVuKDM2MCkgKyAnLCcgK1xuICAgICAgICAgICAgICAgICAgICAgICBSYW5kb20ucmFuZG9tQmV0d2VlbigxMDApICsgJyUsJyArXG4gICAgICAgICAgICAgICAgICAgICAgIFJhbmRvbS5yYW5kb21CZXR3ZWVuKDEwMCkgKyAnJSwgMSknO1xuICAgIH0sXG4gIH07XG5cbiAgaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBSYW5kb207XG4gIH1cblxufSkoKTtcbiJdfQ==
