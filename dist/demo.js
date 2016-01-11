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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJsaWIvY29sb3IuanMiLCJsaWIvZGVtby5qcyIsImxpYi9wb2ludC5qcyIsImxpYi9yYW5kb20uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztBQ0FBLElBQUksS0FBSyxDQUFDOztBQUVWLENBQUMsWUFBVztBQUNWLGNBQVk7O0FBQUM7QUFFYixPQUFLLEdBQUc7O0FBRU4sYUFBUyxFQUFFLG1CQUFTLEdBQUcsRUFBRTtBQUN2QixTQUFHLEdBQUcsR0FBRyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUMsRUFBRSxDQUFDLENBQUM7QUFDMUIsVUFBSSxDQUFDLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0FBQ3pDLFVBQUksQ0FBQyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztBQUN6QyxVQUFJLENBQUMsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7O0FBRXpDLGFBQU8sT0FBTyxHQUFHLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDLEdBQUcsS0FBSyxDQUFDO0tBQ2hEOztBQUVELGtCQUFjLEVBQUUsd0JBQVMsR0FBRyxFQUFFO0FBQzVCLFNBQUcsR0FBRyxHQUFHLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBQyxFQUFFLENBQUMsQ0FBQztBQUMxQixVQUFJLENBQUMsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7QUFDekMsVUFBSSxDQUFDLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0FBQ3pDLFVBQUksQ0FBQyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQzs7QUFFekMsYUFBTyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7S0FDbEI7Ozs7Ozs7Ozs7Ozs7QUFhRCxhQUFTLEVBQUUsbUJBQVMsR0FBRyxFQUFFO0FBQ3ZCLFVBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUM7QUFDckIsVUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQztBQUNyQixVQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDO0FBQ3JCLFVBQUksR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztBQUM1QixVQUFJLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFDNUIsVUFBSSxDQUFDLENBQUM7QUFDTixVQUFJLENBQUMsQ0FBQztBQUNOLFVBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQSxHQUFJLENBQUMsQ0FBQzs7QUFFeEIsVUFBSSxHQUFHLEtBQUssR0FBRyxFQUFFO0FBQ2YsU0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDO0FBQUMsT0FDWCxNQUFNO0FBQ0wsY0FBSSxDQUFDLEdBQUcsR0FBRyxHQUFHLEdBQUcsQ0FBQztBQUNsQixXQUFDLEdBQUcsQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLEdBQUcsR0FBRyxHQUFHLENBQUEsQUFBQyxHQUFHLENBQUMsSUFBSSxHQUFHLEdBQUcsR0FBRyxDQUFBLEFBQUMsQ0FBQztBQUNwRCxrQkFBUSxHQUFHO0FBQ1QsaUJBQUssQ0FBQztBQUFFLGVBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUEsR0FBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFBLEFBQUMsQ0FBQyxBQUFDLE1BQU07QUFBQSxBQUNqRCxpQkFBSyxDQUFDO0FBQUUsZUFBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQSxHQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQUFBQyxNQUFNO0FBQUEsQUFDbkMsaUJBQUssQ0FBQztBQUFFLGVBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUEsR0FBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEFBQUMsTUFBTTtBQUFBLFdBQ3BDO0FBQ0QsV0FBQyxJQUFJLENBQUMsQ0FBQztTQUNSOztBQUVELGFBQU8sT0FBTyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsR0FBRyxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLEdBQUcsTUFBTSxDQUFDO0tBQ3hHOztBQUVELG1CQUFlLEVBQUUseUJBQVMsS0FBSyxFQUFFLEtBQUssRUFBRTtBQUN0QyxXQUFLLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQzs7QUFFekIsVUFBSSxPQUFPLEtBQUssS0FBSyxVQUFVLEVBQUU7QUFDL0IsYUFBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBQztPQUNsQixNQUFNO0FBQ0wsYUFBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztPQUN0Qzs7QUFFRCxXQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksR0FBRyxDQUFDO0FBQ2hCLGFBQU8sS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztLQUN4Qjs7QUFFRCx1QkFBbUIsRUFBRSw2QkFBUyxLQUFLLEVBQUUsU0FBUyxFQUFFO0FBQzlDLFdBQUssR0FBRyxLQUFLLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDOztBQUV6QixVQUFJLE9BQU8sU0FBUyxLQUFLLFVBQVUsRUFBRTtBQUNuQyxhQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsU0FBUyxDQUFDO09BQ3RCLE1BQU07QUFDTCxhQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsU0FBUyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO09BQzFDOztBQUVELFdBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxHQUFHLENBQUM7QUFDaEIsYUFBTyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0tBQ3hCOztBQUVELFlBQVEsRUFBRSxrQkFBUyxHQUFHLEVBQUU7QUFDdEIsVUFBSSxPQUFPLEdBQUcsS0FBSyxRQUFRLEVBQUU7QUFDM0IsV0FBRyxHQUFHLEdBQUcsQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO09BQzNEO0FBQ0QsU0FBRyxHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUMsVUFBUyxDQUFDLEVBQUU7QUFDeEIsU0FBQyxHQUFHLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUM7QUFDN0IsZUFBTyxBQUFDLENBQUMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxHQUFJLEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO09BQ3ZDLENBQUMsQ0FBQztBQUNILGFBQU8sR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztLQUNyQjtHQUNGLENBQUM7O0FBRUYsTUFBSSxPQUFPLE1BQU0sS0FBSyxXQUFXLEVBQUU7QUFDakMsVUFBTSxDQUFDLE9BQU8sR0FBRyxLQUFLLENBQUM7R0FDeEI7Q0FFRixDQUFBLEVBQUcsQ0FBQzs7Ozs7QUN4R0wsQ0FBQyxZQUFXO0FBQ1YsY0FBWSxDQUFDOztBQUViLE1BQUksS0FBSyxHQUFJLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUNoQyxNQUFJLE1BQU0sR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7O0FBRWpDLE1BQUksT0FBTyxHQUFHO0FBQ1osV0FBTyxFQUFFLGlCQUFTLElBQUksRUFBRTtBQUN0QixVQUFJLENBQUMsSUFBSSxFQUFFO0FBQUUsZUFBTyxJQUFJLENBQUM7T0FBRTtBQUMzQixhQUFPLGtCQUFrQixDQUN2QixRQUFRLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FDckIsSUFBSSxNQUFNLENBQ04sa0JBQWtCLEdBQ2xCLGtCQUFrQixDQUFDLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxhQUFhLEVBQUUsTUFBTSxDQUFDLEdBQ3ZELDZCQUE2QixDQUFDLEVBQUUsSUFBSSxDQUFDLENBQ3RDLElBQUksSUFBSSxDQUFDO0tBQ2pCOztBQUVELFdBQU8sRUFBRSxpQkFBUyxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRTtBQUM3RCxVQUFJLENBQUMsSUFBSSxJQUFJLDRDQUE0QyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRTtBQUFFLGVBQU8sS0FBSyxDQUFDO09BQUU7QUFDdkYsVUFBSSxRQUFRLEdBQUcsRUFBRSxDQUFDO0FBQ2xCLFVBQUksSUFBSSxFQUFFO0FBQ1IsZ0JBQVEsSUFBSSxDQUFDLFdBQVc7QUFDdEIsZUFBSyxNQUFNO0FBQ1Qsb0JBQVEsR0FBRyxJQUFJLEtBQUssUUFBUSxHQUFHLHlDQUF5QyxHQUFHLFlBQVksR0FBRyxJQUFJLENBQUM7QUFDL0Ysa0JBQU07QUFBQSxBQUNSLGVBQUssTUFBTTtBQUNULG9CQUFRLEdBQUcsWUFBWSxHQUFHLElBQUksQ0FBQztBQUMvQixrQkFBTTtBQUFBLEFBQ1IsZUFBSyxJQUFJO0FBQ1Asb0JBQVEsR0FBRyxZQUFZLEdBQUcsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO0FBQzdDLGtCQUFNO0FBQUEsU0FDVDtPQUNGO0FBQ0QsY0FBUSxDQUFDLE1BQU0sR0FBRyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsR0FDeEMsR0FBRyxHQUNILGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxHQUMxQixRQUFRLElBQ1AsT0FBTyxHQUFHLFdBQVcsR0FDdEIsT0FBTyxHQUFHLEVBQUUsQ0FBQSxBQUFDLElBQ1osS0FBSyxHQUFHLFNBQVMsR0FDbEIsS0FBSyxHQUFHLEVBQUUsQ0FBQSxBQUFDLElBQ1YsT0FBTyxHQUFHLFVBQVUsR0FBRyxFQUFFLENBQUEsQUFBQyxDQUFDO0FBQzlCLGFBQU8sSUFBSSxDQUFDO0tBQ2I7O0FBRUQsY0FBVSxFQUFFLG9CQUFTLElBQUksRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFO0FBQ3pDLFVBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFO0FBQUUsZUFBTyxLQUFLLENBQUM7T0FBRTtBQUMxQyxjQUFRLENBQUMsTUFBTSxHQUFHLGtCQUFrQixDQUFDLElBQUksQ0FBQyxHQUN4QywwQ0FBMEMsSUFDekMsT0FBTyxHQUFHLFdBQVcsR0FBRyxPQUFPLEdBQUcsRUFBRSxDQUFBLEFBQUMsSUFDckMsS0FBSyxHQUFLLFNBQVMsR0FBSyxLQUFLLEdBQUssRUFBRSxDQUFBLEFBQUMsQ0FBQztBQUN6QyxhQUFPLElBQUksQ0FBQztLQUNiOztBQUVELFdBQU8sRUFBRSxpQkFBUyxJQUFJLEVBQUU7QUFDdEIsVUFBSSxDQUFDLElBQUksRUFBRTtBQUFFLGVBQU8sS0FBSyxDQUFDO09BQUU7QUFDNUIsYUFBTyxBQUFDLElBQUksTUFBTSxDQUFDLGFBQWEsR0FBRyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsQ0FDeEQsT0FBTyxDQUFDLGFBQWEsRUFBRSxNQUFNLENBQUMsR0FBRyxTQUFTLENBQUMsQ0FDM0MsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQztLQUMxQjs7QUFFRCxRQUFJLEVBQUUsZ0JBQVc7QUFDZixVQUFJLEtBQUssR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyx5REFBeUQsRUFBRSxFQUFFLENBQUMsQ0FDL0YsS0FBSyxDQUFDLHFCQUFxQixDQUFDLENBQUM7QUFDaEMsV0FBSyxJQUFJLElBQUksR0FBRyxLQUFLLENBQUMsTUFBTSxFQUFFLElBQUksR0FBRyxDQUFDLEVBQUUsSUFBSSxHQUFHLElBQUksRUFBRSxJQUFJLEVBQUUsRUFBRTtBQUFFLGFBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxrQkFBa0IsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztPQUFFO0FBQy9HLGFBQU8sS0FBSyxDQUFDO0tBQ2Q7R0FDRjs7O0FBQUMsQUFHRixNQUFNLE1BQU0sR0FBRyxRQUFRLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxDQUFDOztBQUVqRCxNQUFNLE1BQU0sR0FBRyxRQUFRLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxDQUFDOztBQUVqRCxNQUFNLG9CQUFvQixHQUFHLFFBQVEsQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztBQUN2RSxNQUFNLHNCQUFzQixHQUFHLFFBQVEsQ0FBQyxjQUFjLENBQUMsa0JBQWtCLENBQUMsQ0FBQztBQUMzRSxNQUFNLHVCQUF1QixHQUFHLFFBQVEsQ0FBQyxjQUFjLENBQUMsbUJBQW1CLENBQUMsQ0FBQzs7QUFFN0UsTUFBTSxxQkFBcUIsR0FBRyxRQUFRLENBQUMsY0FBYyxDQUFDLGlCQUFpQixDQUFDLENBQUM7QUFDekUsTUFBTSxrQkFBa0IsR0FBRyxRQUFRLENBQUMsY0FBYyxDQUFDLGNBQWMsQ0FBQyxDQUFDO0FBQ25FLE1BQU0sbUJBQW1CLEdBQUcsUUFBUSxDQUFDLGNBQWMsQ0FBQyxlQUFlLENBQUMsQ0FBQztBQUNyRSxNQUFNLHFCQUFxQixHQUFHLFFBQVEsQ0FBQyxjQUFjLENBQUMsaUJBQWlCLENBQUMsQ0FBQztBQUN6RSxNQUFNLGlCQUFpQixHQUFHLFFBQVEsQ0FBQyxjQUFjLENBQUMsYUFBYSxDQUFDLENBQUM7O0FBRWpFLE1BQU0sSUFBSSxHQUFHLFFBQVEsQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDN0MsTUFBTSxlQUFlLEdBQUcsUUFBUSxDQUFDLGNBQWMsQ0FBQyxXQUFXLENBQUMsQ0FBQztBQUM3RCxNQUFNLGVBQWUsR0FBRyxRQUFRLENBQUMsY0FBYyxDQUFDLGtCQUFrQixDQUFDLENBQUM7QUFDcEUsTUFBTSxRQUFRLEdBQUcsUUFBUSxDQUFDLGNBQWMsQ0FBQyxXQUFXLENBQUMsQ0FBQztBQUN0RCxNQUFNLFFBQVEsR0FBRyxRQUFRLENBQUMsY0FBYyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0FBQ3RELE1BQU0sWUFBWSxHQUFHLFFBQVEsQ0FBQyxjQUFjLENBQUMsZUFBZSxDQUFDLENBQUM7QUFDOUQsTUFBTSxZQUFZLEdBQUcsUUFBUSxDQUFDLGNBQWMsQ0FBQyxlQUFlLENBQUMsQ0FBQztBQUM5RCxNQUFNLGdCQUFnQixHQUFHLFFBQVEsQ0FBQyxjQUFjLENBQUMsY0FBYyxDQUFDLENBQUM7QUFDakUsTUFBTSxnQkFBZ0IsR0FBRyxRQUFRLENBQUMsY0FBYyxDQUFDLGNBQWMsQ0FBQyxDQUFDOztBQUVqRSxNQUFJLFNBQVMsRUFBRSxTQUFTLEVBQUUsYUFBYSxFQUFFLGFBQWEsRUFBRSxZQUFZLEVBQUUsWUFBWSxFQUFFLFVBQVUsRUFBRSxNQUFNLENBQUM7O0FBRXZHLE1BQUksYUFBYSxFQUFFLFVBQVUsRUFBRSxXQUFXLEVBQUUsYUFBYSxFQUFFLFNBQVMsQ0FBQzs7QUFFckUsTUFBSSxPQUFPLEdBQUc7QUFDWixvQkFBZ0IsRUFBRSw0QkFBVztBQUMzQixVQUFJLENBQUMsU0FBUyxHQUFHLFlBQVksQ0FBQztLQUMvQjtBQUNELHFCQUFpQixFQUFFLDZCQUFXO0FBQzVCLFVBQUksQ0FBQyxTQUFTLEdBQUcsV0FBVyxDQUFDO0tBQzlCO0dBQ0YsQ0FBQzs7QUFFRixZQUFVLEVBQUU7OztBQUFDLEFBR2IsTUFBSSxjQUFjLEdBQUcsSUFBSSxjQUFjLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQzs7O0FBQUMsQUFHekQsYUFBVyxFQUFFOzs7Ozs7O0FBQUMsQUFPZCxXQUFTLFdBQVcsR0FBRztBQUNyQix1QkFBbUIsRUFBRSxDQUFDO0FBQ3RCLGtCQUFjLENBQUMsU0FBUyxDQUFDLFNBQVMsRUFBRSxTQUFTLEVBQUUsYUFBYSxFQUFFLGFBQWEsRUFBRSxZQUFZLEVBQUUsWUFBWSxFQUFFLE1BQU0sQ0FBQyxDQUFDO0dBQ2xIOztBQUVELFdBQVMsU0FBUyxHQUFHO0FBQ25CLFFBQUksTUFBTSxHQUFHLEVBQUUsQ0FBQzs7QUFFaEIsUUFBSSxRQUFRLENBQUMsY0FBYyxDQUFDLFlBQVksQ0FBQyxDQUFDLE9BQU8sRUFBRTs7QUFFakQsV0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtBQUMxQixZQUFJLEtBQUssR0FBRyxNQUFNLENBQUMsVUFBVSxFQUFFLENBQUM7QUFDaEMsY0FBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztPQUNwQjtLQUNGLE1BQU07O0FBRUwsWUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDNUYsWUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDNUYsWUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7S0FDN0Y7O0FBRUQsV0FBTyxNQUFNLENBQUM7R0FDZjs7O0FBQUEsQUFHRCxXQUFTLFVBQVUsR0FBRztBQUNwQixRQUFJLFFBQVEsR0FBRyxjQUFjLENBQUMsUUFBUSxFQUFFLENBQUM7O0FBRXpDLGlCQUFhLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO0FBQ3pELGNBQVUsR0FBTSxPQUFPLENBQUMsT0FBTyxDQUFDLG9CQUFvQixDQUFDLENBQUM7QUFDdEQsZUFBVyxHQUFLLE9BQU8sQ0FBQyxPQUFPLENBQUMscUJBQXFCLENBQUMsQ0FBQztBQUN2RCxpQkFBYSxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsdUJBQXVCLENBQUMsQ0FBQztBQUN6RCxhQUFTLEdBQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQzs7OztBQUFDLEFBSXJELFFBQUksYUFBYSxFQUFFO0FBQ2pCLGFBQU8sQ0FBQyxhQUFhLEdBQUcsYUFBYSxHQUFHLGFBQWEsS0FBSyxNQUFNLEdBQUcsSUFBSSxHQUFHLEtBQUssQ0FBQztLQUNqRixNQUFNOztBQUVMLG1CQUFhLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQztLQUN4Qzs7QUFFRCxRQUFJLFVBQVUsRUFBRTtBQUNkLGFBQU8sQ0FBQyxVQUFVLEdBQUcsVUFBVSxHQUFHLFVBQVUsS0FBSyxNQUFNLEdBQUcsSUFBSSxHQUFHLEtBQUssQ0FBQztLQUN4RSxNQUFNO0FBQ0wsZ0JBQVUsR0FBRyxRQUFRLENBQUMsVUFBVSxDQUFDO0tBQ2xDOztBQUVELFFBQUksV0FBVyxFQUFFO0FBQ2YsYUFBTyxDQUFDLFdBQVcsR0FBRyxXQUFXLEdBQUcsV0FBVyxLQUFLLE1BQU0sR0FBRyxJQUFJLEdBQUcsS0FBSyxDQUFDO0tBQzNFLE1BQU07QUFDTCxpQkFBVyxHQUFHLFFBQVEsQ0FBQyxXQUFXLENBQUM7S0FDcEM7O0FBRUQsUUFBSSxhQUFhLEVBQUU7QUFDakIsYUFBTyxDQUFDLGFBQWEsR0FBRyxhQUFhLEdBQUcsYUFBYSxLQUFLLE1BQU0sR0FBRyxJQUFJLEdBQUcsS0FBSyxDQUFDO0tBQ2pGLE1BQU07QUFDTCxtQkFBYSxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUM7S0FDeEM7O0FBRUQsUUFBSSxTQUFTLEVBQUU7QUFDYixhQUFPLENBQUMsU0FBUyxHQUFHLFNBQVMsR0FBRyxTQUFTLEtBQUssTUFBTSxHQUFHLElBQUksR0FBRyxLQUFLLENBQUM7S0FDckUsTUFBTTtBQUNMLGVBQVMsR0FBRyxRQUFRLENBQUMsU0FBUyxDQUFDO0tBQ2hDO0dBQ0Y7OztBQUFBLEFBR0QsV0FBUyxtQkFBbUIsR0FBRztBQUM3QixRQUFJLGFBQWEsR0FBRyxlQUFlLENBQUMsT0FBTyxDQUFDO0FBQzVDLGNBQVUsR0FBRyxVQUFVLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQy9DLGFBQVMsR0FBRyxhQUFhLEdBQUcsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDekQsYUFBUyxHQUFHLGFBQWEsR0FBRyxDQUFDLEdBQUcsUUFBUSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUN6RCxpQkFBYSxHQUFHLGFBQWEsR0FBRyxDQUFDLEdBQUcsUUFBUSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUNqRSxpQkFBYSxHQUFHLGFBQWEsR0FBRyxDQUFDLEdBQUcsUUFBUSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUNqRSxnQkFBWSxHQUFHLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUNoRCxnQkFBWSxHQUFHLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUNoRCxVQUFNLEdBQUcsU0FBUyxFQUFFLENBQUM7R0FDdEI7O0FBRUQsV0FBUyxRQUFRLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUU7QUFDakMsT0FBRyxHQUFHLEdBQUcsSUFBSSxNQUFNLENBQUM7QUFDcEIsUUFBSSxPQUFPLEdBQUcsS0FBSyxDQUFDO0FBQ3BCLFFBQUksSUFBSSxHQUFHLFNBQVAsSUFBSSxHQUFjO0FBQ3BCLFVBQUksT0FBTyxFQUFFO0FBQUUsZUFBTztPQUFFO0FBQ3hCLGFBQU8sR0FBRyxJQUFJLENBQUM7QUFDZiwyQkFBcUIsQ0FBQyxZQUFXO0FBQy9CLFdBQUcsQ0FBQyxhQUFhLENBQUMsSUFBSSxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztBQUN6QyxlQUFPLEdBQUcsS0FBSyxDQUFDO09BQ2pCLENBQUMsQ0FBQztLQUNKLENBQUM7QUFDRixPQUFHLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO0dBQ2xDOzs7QUFBQSxBQUdELFVBQVEsQ0FBQyxRQUFRLEVBQUUsaUJBQWlCLENBQUM7Ozs7Ozs7QUFBQyxBQU90QyxRQUFNLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLFlBQVc7QUFDMUMsZUFBVyxFQUFFLENBQUM7R0FDZixDQUFDOzs7QUFBQyxBQUdILHNCQUFvQixDQUFDLGdCQUFnQixDQUFDLE9BQU8sRUFBRSxZQUFXO0FBQ3hELFFBQUksU0FBUyxHQUFHLFNBQVMsRUFBRSxDQUFDO0FBQzVCLGtCQUFjLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0dBQzNDLENBQUM7OztBQUFDLEFBR0gsd0JBQXNCLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLFlBQVc7QUFDMUQsdUJBQW1CLEVBQUUsQ0FBQztBQUN0QixrQkFBYyxDQUFDLGlCQUFpQixDQUFDLFlBQVksRUFBRSxZQUFZLENBQUMsQ0FBQztHQUM5RCxDQUFDOzs7QUFBQyxBQUdILHlCQUF1QixDQUFDLGdCQUFnQixDQUFDLE9BQU8sRUFBRSxZQUFXO0FBQzNELHVCQUFtQixFQUFFLENBQUM7QUFDdEIsa0JBQWMsQ0FBQyxrQkFBa0IsQ0FBQyxTQUFTLEVBQUUsU0FBUyxFQUFFLGFBQWEsRUFBRSxhQUFhLEVBQUUsVUFBVSxDQUFDLENBQUM7R0FDbkcsQ0FBQzs7O0FBQUMsQUFHSCx1QkFBcUIsQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLEVBQUUsWUFBVztBQUN6RCxpQkFBYSxHQUFHLENBQUMsYUFBYSxDQUFDO0FBQy9CLFdBQU8sQ0FBQyxPQUFPLENBQUMsdUJBQXVCLEVBQUUsYUFBYSxDQUFDLENBQUM7QUFDeEQsa0JBQWMsQ0FBQyxlQUFlLEVBQUUsQ0FBQztHQUNsQyxDQUFDOzs7QUFBQyxBQUdILG9CQUFrQixDQUFDLGdCQUFnQixDQUFDLE9BQU8sRUFBRSxZQUFXO0FBQ3RELGNBQVUsR0FBRyxDQUFDLFVBQVUsQ0FBQztBQUN6QixXQUFPLENBQUMsT0FBTyxDQUFDLG9CQUFvQixFQUFFLFVBQVUsQ0FBQyxDQUFDO0FBQ2xELGtCQUFjLENBQUMsWUFBWSxFQUFFLENBQUM7R0FDL0IsQ0FBQzs7O0FBQUMsQUFHSCxxQkFBbUIsQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLEVBQUUsWUFBVztBQUN2RCxlQUFXLEdBQUcsQ0FBQyxXQUFXLENBQUM7QUFDM0IsV0FBTyxDQUFDLE9BQU8sQ0FBQyxxQkFBcUIsRUFBRSxXQUFXLENBQUMsQ0FBQztBQUNwRCxrQkFBYyxDQUFDLGFBQWEsRUFBRSxDQUFDO0dBQ2hDLENBQUM7OztBQUFDLEFBR0gsdUJBQXFCLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLFlBQVc7QUFDekQsaUJBQWEsR0FBRyxDQUFDLGFBQWEsQ0FBQztBQUMvQixXQUFPLENBQUMsT0FBTyxDQUFDLHVCQUF1QixFQUFFLGFBQWEsQ0FBQyxDQUFDO0FBQ3hELGtCQUFjLENBQUMsZUFBZSxFQUFFLENBQUM7R0FDbEMsQ0FBQzs7O0FBQUMsQUFHSCxtQkFBaUIsQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLEVBQUUsWUFBVztBQUNyRCxhQUFTLEdBQUcsQ0FBQyxTQUFTLENBQUM7QUFDdkIsV0FBTyxDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsRUFBRSxTQUFTLENBQUMsQ0FBQztBQUNoRCxrQkFBYyxDQUFDLFdBQVcsRUFBRSxDQUFDO0dBQzlCLENBQUM7OztBQUFDLEFBR0gsUUFBTSxDQUFDLGdCQUFnQixDQUFDLGlCQUFpQixFQUFFLFlBQVc7QUFDcEQsa0JBQWMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztHQUMxQixDQUFDOzs7QUFBQyxBQUdILE1BQUksQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLEVBQUUsVUFBUyxDQUFDLEVBQUU7QUFDMUMsS0FBQyxDQUFDLGNBQWMsRUFBRSxDQUFDO0FBQ25CLFdBQU8sS0FBSyxDQUFDO0dBQ2QsQ0FBQyxDQUFDO0NBQ0osQ0FBQSxFQUFHLENBQUM7Ozs7Ozs7OztBQ25TTCxJQUFJLEtBQUssQ0FBQzs7QUFFVixDQUFDLFlBQVc7QUFDVixjQUFZLENBQUM7O0FBRWIsTUFBSSxLQUFLLEdBQUcsS0FBSyxJQUFJLE9BQU8sQ0FBQyxTQUFTLENBQUM7Ozs7OztBQUFDO01BTWxDLE1BQU07Ozs7Ozs7Ozs7O0FBVVYsYUFWSSxNQUFNLENBVUUsQ0FBQyxFQUFFLENBQUMsRUFBRTs0QkFWZCxNQUFNOztBQVdSLFVBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRTtBQUNwQixTQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ1QsU0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztPQUNWO0FBQ0QsVUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDWCxVQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUNYLFVBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO0FBQ2hCLFVBQUksQ0FBQyxLQUFLLEdBQUcsT0FBTyxDQUFDO0tBQ3RCOzs7QUFBQTtpQkFuQkcsTUFBTTs7NkJBc0JILEdBQUcsRUFBRSxLQUFLLEVBQUU7QUFDakIsV0FBRyxDQUFDLFNBQVMsRUFBRSxDQUFDO0FBQ2hCLFdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO0FBQzVELFdBQUcsQ0FBQyxTQUFTLEdBQUcsS0FBSyxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUM7QUFDcEMsV0FBRyxDQUFDLElBQUksRUFBRSxDQUFDO0FBQ1gsV0FBRyxDQUFDLFNBQVMsRUFBRSxDQUFDO09BQ2pCOzs7Ozs7Ozs7aUNBTVU7QUFDVCxlQUFPLEdBQUcsR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQztPQUMxQzs7Ozs7Ozs7eUNBS2tCLFNBQVMsRUFBRSxVQUFVLEVBQUU7QUFDeEMsa0JBQVUsR0FBRyxVQUFVLElBQUksTUFBTTs7QUFBQyxBQUVsQyxZQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRTs7QUFFdEIsY0FBSSxHQUFHLEdBQUcsQUFBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxTQUFTLENBQUMsS0FBSyxHQUFHLENBQUMsR0FBSyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEFBQUMsQ0FBQzs7QUFFaEYsY0FBSSxVQUFVLEtBQUssTUFBTSxFQUFFO0FBQ3pCLGdCQUFJLENBQUMsWUFBWSxHQUFHLEtBQUssQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsR0FBRyxFQUFFLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO1dBQy9GLE1BQU07QUFDTCxnQkFBSSxDQUFDLFlBQVksR0FBRyxNQUFNLEdBQUcsS0FBSyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsR0FBRyxFQUFFLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsR0FBRyxHQUFHLENBQUM7V0FDcEc7U0FDRixNQUFNO0FBQ0wsaUJBQU8sSUFBSSxDQUFDLFlBQVksQ0FBQztTQUMxQjtBQUNELGVBQU8sSUFBSSxDQUFDLFlBQVksQ0FBQztPQUMxQjs7O2tDQUVXO0FBQ1YsZUFBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO09BQ3pCOzs7Ozs7b0NBR2EsS0FBSyxFQUFFOztBQUVuQixlQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztPQUNqRjs7Ozs7Ozs7Ozs4QkFPTyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFOzs7QUFHdEMsWUFBSSxTQUFTLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQztBQUN4QixZQUFJLFNBQVMsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDOztBQUV4QixZQUFJLFNBQVMsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDO0FBQ3hCLFlBQUksU0FBUyxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUM7O0FBRXhCLFlBQUksQ0FBQyxDQUFDLEdBQUcsQUFBQyxBQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUEsR0FBSSxTQUFTLEdBQUksU0FBUyxHQUFJLEVBQUUsQ0FBQztBQUN4RCxZQUFJLENBQUMsQ0FBQyxHQUFHLEFBQUMsQUFBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFBLEdBQUksU0FBUyxHQUFJLFNBQVMsR0FBSSxFQUFFLENBQUM7T0FDekQ7OztXQXJGRyxNQUFNOzs7QUF3RlosTUFBSSxPQUFPLE1BQU0sS0FBSyxXQUFXLEVBQUU7QUFDakMsVUFBTSxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUM7R0FDekI7O0FBRUQsT0FBSyxHQUFHLE1BQU0sQ0FBQztDQUNoQixDQUFBLEVBQUcsQ0FBQzs7Ozs7QUN4R0wsSUFBSSxNQUFNLENBQUM7O0FBRVgsQ0FBQyxZQUFXO0FBQ1YsY0FBWTs7O0FBQUMsQUFHYixNQUFJLEtBQUssR0FBRyxLQUFLLElBQUksT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDOztBQUV4QyxRQUFNLEdBQUc7OztBQUdQLHdCQUFvQixFQUFFLDhCQUFTLEdBQUcsRUFBRSxHQUFHLEVBQUU7QUFDdkMsU0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDLENBQUM7QUFDZixVQUFJLEdBQUcsR0FBRyxHQUFHLEVBQUU7QUFDYixZQUFJLElBQUksR0FBRyxHQUFHLENBQUM7QUFDZixXQUFHLEdBQUcsR0FBRyxDQUFDO0FBQ1YsV0FBRyxHQUFHLElBQUksQ0FBQztPQUNaO0FBQ0QsYUFBTyxZQUFXO0FBQ2hCLGVBQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksR0FBRyxHQUFHLEdBQUcsR0FBRyxDQUFDLENBQUEsQUFBQyxDQUFDLEdBQUcsR0FBRyxDQUFDO09BQzFELENBQUM7S0FDSDs7OztBQUlELGlCQUFhLEVBQUUsdUJBQVMsR0FBRyxFQUFFLEdBQUcsRUFBRTtBQUNoQyxTQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsQ0FBQztBQUNmLGFBQU8sTUFBTSxDQUFDLG9CQUFvQixDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsRUFBRSxDQUFDO0tBQ2hEOztBQUVELGtCQUFjLEVBQUUsd0JBQVMsTUFBTSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUU7QUFDdkMsVUFBSSxLQUFLLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0FBQ3hDLFVBQUksR0FBRyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsTUFBTSxDQUFDO0FBQzVDLFVBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUNuQyxVQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7O0FBRW5DLGFBQU8sSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0tBQ3hCOztBQUVELGNBQVUsRUFBRSxzQkFBVztBQUNyQixhQUFPLE9BQU8sR0FBRyxNQUFNLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEdBQUcsR0FDL0IsTUFBTSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsR0FBRyxHQUFHLEdBQy9CLE1BQU0sQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLEdBQUcsTUFBTSxDQUFDO0tBQ3JEOztBQUVELGNBQVUsRUFBRSxzQkFBVztBQUNyQixhQUFPLE9BQU8sR0FBRyxNQUFNLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEdBQUcsR0FDL0IsTUFBTSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLEdBQ2hDLE1BQU0sQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLEdBQUcsT0FBTyxDQUFDO0tBQ3REO0dBQ0YsQ0FBQzs7QUFFRixNQUFJLE9BQU8sTUFBTSxLQUFLLFdBQVcsRUFBRTtBQUNqQyxVQUFNLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQztHQUN6QjtDQUVGLENBQUEsRUFBRyxDQUFDIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBDb2xvcjtcblxuKGZ1bmN0aW9uKCkge1xuICAndXNlIHN0cmljdCc7XG4gIC8vIGNvbG9yIGhlbHBlciBmdW5jdGlvbnNcbiAgQ29sb3IgPSB7XG5cbiAgICBoZXhUb1JnYmE6IGZ1bmN0aW9uKGhleCkge1xuICAgICAgaGV4ID0gaGV4LnJlcGxhY2UoJyMnLCcnKTtcbiAgICAgIHZhciByID0gcGFyc2VJbnQoaGV4LnN1YnN0cmluZygwLDIpLCAxNik7XG4gICAgICB2YXIgZyA9IHBhcnNlSW50KGhleC5zdWJzdHJpbmcoMiw0KSwgMTYpO1xuICAgICAgdmFyIGIgPSBwYXJzZUludChoZXguc3Vic3RyaW5nKDQsNiksIDE2KTtcblxuICAgICAgcmV0dXJuICdyZ2JhKCcgKyByICsgJywnICsgZyArICcsJyArIGIgKyAnLDEpJztcbiAgICB9LFxuXG4gICAgaGV4VG9SZ2JhQXJyYXk6IGZ1bmN0aW9uKGhleCkge1xuICAgICAgaGV4ID0gaGV4LnJlcGxhY2UoJyMnLCcnKTtcbiAgICAgIHZhciByID0gcGFyc2VJbnQoaGV4LnN1YnN0cmluZygwLDIpLCAxNik7XG4gICAgICB2YXIgZyA9IHBhcnNlSW50KGhleC5zdWJzdHJpbmcoMiw0KSwgMTYpO1xuICAgICAgdmFyIGIgPSBwYXJzZUludChoZXguc3Vic3RyaW5nKDQsNiksIDE2KTtcblxuICAgICAgcmV0dXJuIFtyLCBnLCBiXTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ29udmVydHMgYW4gUkdCIGNvbG9yIHZhbHVlIHRvIEhTTC4gQ29udmVyc2lvbiBmb3JtdWxhXG4gICAgICogYWRhcHRlZCBmcm9tIGh0dHA6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvSFNMX2NvbG9yX3NwYWNlLlxuICAgICAqIEFzc3VtZXMgciwgZywgYW5kIGIgYXJlIGNvbnRhaW5lZCBpbiB0aGUgc2V0IFswLCAyNTVdIGFuZFxuICAgICAqIHJldHVybnMgaCwgcywgYW5kIGwgaW4gdGhlIHNldCBbMCwgMV0uXG4gICAgICpcbiAgICAgKiBAcGFyYW0gICBOdW1iZXIgIHIgICAgICAgVGhlIHJlZCBjb2xvciB2YWx1ZVxuICAgICAqIEBwYXJhbSAgIE51bWJlciAgZyAgICAgICBUaGUgZ3JlZW4gY29sb3IgdmFsdWVcbiAgICAgKiBAcGFyYW0gICBOdW1iZXIgIGIgICAgICAgVGhlIGJsdWUgY29sb3IgdmFsdWVcbiAgICAgKiBAcmV0dXJuICBBcnJheSAgICAgICAgICAgVGhlIEhTTCByZXByZXNlbnRhdGlvblxuICAgICAqL1xuICAgIHJnYlRvSHNsYTogZnVuY3Rpb24ocmdiKSB7XG4gICAgICB2YXIgciA9IHJnYlswXSAvIDI1NTtcbiAgICAgIHZhciBnID0gcmdiWzFdIC8gMjU1O1xuICAgICAgdmFyIGIgPSByZ2JbMl0gLyAyNTU7XG4gICAgICB2YXIgbWF4ID0gTWF0aC5tYXgociwgZywgYik7XG4gICAgICB2YXIgbWluID0gTWF0aC5taW4ociwgZywgYik7XG4gICAgICB2YXIgaDtcbiAgICAgIHZhciBzO1xuICAgICAgdmFyIGwgPSAobWF4ICsgbWluKSAvIDI7XG5cbiAgICAgIGlmIChtYXggPT09IG1pbikge1xuICAgICAgICBoID0gcyA9IDA7IC8vIGFjaHJvbWF0aWNcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBkID0gbWF4IC0gbWluO1xuICAgICAgICBzID0gbCA+IDAuNSA/IGQgLyAoMiAtIG1heCAtIG1pbikgOiBkIC8gKG1heCArIG1pbik7XG4gICAgICAgIHN3aXRjaCAobWF4KXtcbiAgICAgICAgICBjYXNlIHI6IGggPSAoZyAtIGIpIC8gZCArIChnIDwgYiA/IDYgOiAwKTsgYnJlYWs7XG4gICAgICAgICAgY2FzZSBnOiBoID0gKGIgLSByKSAvIGQgKyAyOyBicmVhaztcbiAgICAgICAgICBjYXNlIGI6IGggPSAociAtIGcpIC8gZCArIDQ7IGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGggLz0gNjtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuICdoc2xhKCcgKyBNYXRoLnJvdW5kKGggKiAzNjApICsgJywnICsgTWF0aC5yb3VuZChzICogMTAwKSArICclLCcgKyBNYXRoLnJvdW5kKGwgKiAxMDApICsgJyUsMSknO1xuICAgIH0sXG5cbiAgICBoc2xhQWRqdXN0QWxwaGE6IGZ1bmN0aW9uKGNvbG9yLCBhbHBoYSkge1xuICAgICAgY29sb3IgPSBjb2xvci5zcGxpdCgnLCcpO1xuXG4gICAgICBpZiAodHlwZW9mIGFscGhhICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIGNvbG9yWzNdID0gYWxwaGE7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb2xvclszXSA9IGFscGhhKHBhcnNlSW50KGNvbG9yWzNdKSk7XG4gICAgICB9XG5cbiAgICAgIGNvbG9yWzNdICs9ICcpJztcbiAgICAgIHJldHVybiBjb2xvci5qb2luKCcsJyk7XG4gICAgfSxcblxuICAgIGhzbGFBZGp1c3RMaWdodG5lc3M6IGZ1bmN0aW9uKGNvbG9yLCBsaWdodG5lc3MpIHtcbiAgICAgIGNvbG9yID0gY29sb3Iuc3BsaXQoJywnKTtcblxuICAgICAgaWYgKHR5cGVvZiBsaWdodG5lc3MgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgY29sb3JbMl0gPSBsaWdodG5lc3M7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb2xvclsyXSA9IGxpZ2h0bmVzcyhwYXJzZUludChjb2xvclsyXSkpO1xuICAgICAgfVxuXG4gICAgICBjb2xvclsyXSArPSAnJSc7XG4gICAgICByZXR1cm4gY29sb3Iuam9pbignLCcpO1xuICAgIH0sXG5cbiAgICByZ2JUb0hleDogZnVuY3Rpb24ocmdiKSB7XG4gICAgICBpZiAodHlwZW9mIHJnYiA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgcmdiID0gcmdiLnJlcGxhY2UoJ3JnYignLCAnJykucmVwbGFjZSgnKScsICcnKS5zcGxpdCgnLCcpO1xuICAgICAgfVxuICAgICAgcmdiID0gcmdiLm1hcChmdW5jdGlvbih4KSB7XG4gICAgICAgIHggPSBwYXJzZUludCh4KS50b1N0cmluZygxNik7XG4gICAgICAgIHJldHVybiAoeC5sZW5ndGggPT09IDEpID8gJzAnICsgeCA6IHg7XG4gICAgICB9KTtcbiAgICAgIHJldHVybiByZ2Iuam9pbignJyk7XG4gICAgfSxcbiAgfTtcblxuICBpZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IENvbG9yO1xuICB9XG5cbn0pKCk7XG4iLCIoZnVuY3Rpb24oKSB7XG4gICd1c2Ugc3RyaWN0JztcblxuICB2YXIgQ29sb3IgID0gcmVxdWlyZSgnLi9jb2xvcicpO1xuICB2YXIgUmFuZG9tID0gcmVxdWlyZSgnLi9yYW5kb20nKTtcblxuICB2YXIgQ29va2llcyA9IHtcbiAgICBnZXRJdGVtOiBmdW5jdGlvbihzS2V5KSB7XG4gICAgICBpZiAoIXNLZXkpIHsgcmV0dXJuIG51bGw7IH1cbiAgICAgIHJldHVybiBkZWNvZGVVUklDb21wb25lbnQoXG4gICAgICAgIGRvY3VtZW50LmNvb2tpZS5yZXBsYWNlKFxuICAgICAgICAgIG5ldyBSZWdFeHAoXG4gICAgICAgICAgICAgICcoPzooPzpefC4qOylcXFxccyonICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICtcbiAgICAgICAgICAgICAgZW5jb2RlVVJJQ29tcG9uZW50KHNLZXkpLnJlcGxhY2UoL1tcXC1cXC5cXCtcXCpdL2csICdcXFxcJCYnKSAgICtcbiAgICAgICAgICAgICAgJ1xcXFxzKlxcXFw9XFxcXHMqKFteO10qKS4qJCl8Xi4qJCcpLCAnJDEnKVxuICAgICAgICAgICAgKSB8fCBudWxsO1xuICAgIH0sXG5cbiAgICBzZXRJdGVtOiBmdW5jdGlvbihzS2V5LCBzVmFsdWUsIHZFbmQsIHNQYXRoLCBzRG9tYWluLCBiU2VjdXJlKSB7XG4gICAgICBpZiAoIXNLZXkgfHwgL14oPzpleHBpcmVzfG1heFxcLWFnZXxwYXRofGRvbWFpbnxzZWN1cmUpJC9pLnRlc3Qoc0tleSkpIHsgcmV0dXJuIGZhbHNlOyB9XG4gICAgICB2YXIgc0V4cGlyZXMgPSAnJztcbiAgICAgIGlmICh2RW5kKSB7XG4gICAgICAgIHN3aXRjaCAodkVuZC5jb25zdHJ1Y3Rvcikge1xuICAgICAgICAgIGNhc2UgTnVtYmVyOlxuICAgICAgICAgICAgc0V4cGlyZXMgPSB2RW5kID09PSBJbmZpbml0eSA/ICc7IGV4cGlyZXM9RnJpLCAzMSBEZWMgOTk5OSAyMzo1OTo1OSBHTVQnIDogJzsgbWF4LWFnZT0nICsgdkVuZDtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGNhc2UgU3RyaW5nOlxuICAgICAgICAgICAgc0V4cGlyZXMgPSAnOyBleHBpcmVzPScgKyB2RW5kO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgY2FzZSBEYXRlOlxuICAgICAgICAgICAgc0V4cGlyZXMgPSAnOyBleHBpcmVzPScgKyB2RW5kLnRvVVRDU3RyaW5nKCk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgZG9jdW1lbnQuY29va2llID0gZW5jb2RlVVJJQ29tcG9uZW50KHNLZXkpICtcbiAgICAgICAgJz0nICtcbiAgICAgICAgZW5jb2RlVVJJQ29tcG9uZW50KHNWYWx1ZSkgK1xuICAgICAgICBzRXhwaXJlcyArXG4gICAgICAgIChzRG9tYWluID8gJzsgZG9tYWluPScgK1xuICAgICAgICBzRG9tYWluIDogJycpICtcbiAgICAgICAgKHNQYXRoID8gJzsgcGF0aD0nICtcbiAgICAgICAgc1BhdGggOiAnJykgK1xuICAgICAgICAoYlNlY3VyZSA/ICc7IHNlY3VyZScgOiAnJyk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9LFxuXG4gICAgcmVtb3ZlSXRlbTogZnVuY3Rpb24oc0tleSwgc1BhdGgsIHNEb21haW4pIHtcbiAgICAgIGlmICghdGhpcy5oYXNJdGVtKHNLZXkpKSB7IHJldHVybiBmYWxzZTsgfVxuICAgICAgZG9jdW1lbnQuY29va2llID0gZW5jb2RlVVJJQ29tcG9uZW50KHNLZXkpICAgICtcbiAgICAgICAgJz07IGV4cGlyZXM9VGh1LCAwMSBKYW4gMTk3MCAwMDowMDowMCBHTVQnICArXG4gICAgICAgIChzRG9tYWluID8gJzsgZG9tYWluPScgKyBzRG9tYWluIDogJycpICAgICAgK1xuICAgICAgICAoc1BhdGggICA/ICc7IHBhdGg9JyAgICsgc1BhdGggICA6ICcnKTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0sXG5cbiAgICBoYXNJdGVtOiBmdW5jdGlvbihzS2V5KSB7XG4gICAgICBpZiAoIXNLZXkpIHsgcmV0dXJuIGZhbHNlOyB9XG4gICAgICByZXR1cm4gKG5ldyBSZWdFeHAoJyg/Ol58O1xcXFxzKiknICsgZW5jb2RlVVJJQ29tcG9uZW50KHNLZXkpXG4gICAgICAgIC5yZXBsYWNlKC9bXFwtXFwuXFwrXFwqXS9nLCAnXFxcXCQmJykgKyAnXFxcXHMqXFxcXD0nKSlcbiAgICAgICAgLnRlc3QoZG9jdW1lbnQuY29va2llKTtcbiAgICB9LFxuXG4gICAga2V5czogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgYUtleXMgPSBkb2N1bWVudC5jb29raWUucmVwbGFjZSgvKCg/Ol58XFxzKjspW15cXD1dKykoPz07fCQpfF5cXHMqfFxccyooPzpcXD1bXjtdKik/KD86XFwxfCQpL2csICcnKVxuICAgICAgICAuc3BsaXQoL1xccyooPzpcXD1bXjtdKik/O1xccyovKTtcbiAgICAgIGZvciAodmFyIG5MZW4gPSBhS2V5cy5sZW5ndGgsIG5JZHggPSAwOyBuSWR4IDwgbkxlbjsgbklkeCsrKSB7IGFLZXlzW25JZHhdID0gZGVjb2RlVVJJQ29tcG9uZW50KGFLZXlzW25JZHhdKTsgfVxuICAgICAgcmV0dXJuIGFLZXlzO1xuICAgIH0sXG4gIH07XG5cbiAgLy8gc2V0IHVwIHZhcmlhYmxlcyBmb3IgY2FudmFzLCBpbnB1dHMsIGV0Y1xuICBjb25zdCBjYW52YXMgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY2FudmFzJyk7XG5cbiAgY29uc3QgYnV0dG9uID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2J1dHRvbicpO1xuXG4gIGNvbnN0IGdlbmVyYXRlQ29sb3JzQnV0dG9uID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2dlbmVyYXRlQ29sb3JzJyk7XG4gIGNvbnN0IGdlbmVyYXRlR3JhZGllbnRCdXR0b24gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZ2VuZXJhdGVHcmFkaWVudCcpO1xuICBjb25zdCBnZW5lcmF0ZVRyaWFuZ2xlc0J1dHRvbiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdnZW5lcmF0ZVRyaWFuZ2xlcycpO1xuXG4gIGNvbnN0IHRvZ2dsZVRyaWFuZ2xlc0J1dHRvbiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCd0b2dnbGVUcmlhbmdsZXMnKTtcbiAgY29uc3QgdG9nZ2xlUG9pbnRzQnV0dG9uID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3RvZ2dsZVBvaW50cycpO1xuICBjb25zdCB0b2dnbGVDaXJjbGVzQnV0dG9uID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3RvZ2dsZUNpcmNsZXMnKTtcbiAgY29uc3QgdG9nZ2xlQ2VudHJvaWRzQnV0dG9uID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3RvZ2dsZUNlbnRyb2lkcycpO1xuICBjb25zdCB0b2dnbGVFZGdlc0J1dHRvbiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCd0b2dnbGVFZGdlcycpO1xuXG4gIGNvbnN0IGZvcm0gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZm9ybScpO1xuICBjb25zdCBtdWx0aXBsaWVyUmFkaW8gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncG9pbnRHZW4xJyk7XG4gIGNvbnN0IG11bHRpcGxpZXJJbnB1dCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdwb2ludHNNdWx0aXBsaWVyJyk7XG4gIGNvbnN0IG1heElucHV0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ21heFBvaW50cycpO1xuICBjb25zdCBtaW5JbnB1dCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdtaW5Qb2ludHMnKTtcbiAgY29uc3QgbWF4RWRnZUlucHV0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ21heEVkZ2VQb2ludHMnKTtcbiAgY29uc3QgbWluRWRnZUlucHV0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ21pbkVkZ2VQb2ludHMnKTtcbiAgY29uc3QgbWF4R3JhZGllbnRJbnB1dCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdtYXhHcmFkaWVudHMnKTtcbiAgY29uc3QgbWluR3JhZGllbnRJbnB1dCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdtaW5HcmFkaWVudHMnKTtcblxuICB2YXIgbWluUG9pbnRzLCBtYXhQb2ludHMsIG1pbkVkZ2VQb2ludHMsIG1heEVkZ2VQb2ludHMsIG1pbkdyYWRpZW50cywgbWF4R3JhZGllbnRzLCBtdWx0aXBsaWVyLCBjb2xvcnM7XG5cbiAgdmFyIHNob3dUcmlhbmdsZXMsIHNob3dQb2ludHMsIHNob3dDaXJjbGVzLCBzaG93Q2VudHJvaWRzLCBzaG93RWRnZXM7XG5cbiAgdmFyIG9wdGlvbnMgPSB7XG4gICAgb25EYXJrQmFja2dyb3VuZDogZnVuY3Rpb24oKSB7XG4gICAgICBmb3JtLmNsYXNzTmFtZSA9ICdmb3JtIGxpZ2h0JztcbiAgICB9LFxuICAgIG9uTGlnaHRCYWNrZ3JvdW5kOiBmdW5jdGlvbigpIHtcbiAgICAgIGZvcm0uY2xhc3NOYW1lID0gJ2Zvcm0gZGFyayc7XG4gICAgfSxcbiAgfTtcblxuICBnZXRDb29raWVzKCk7XG5cbiAgLy8gaW5pdGlhbGl6ZSB0aGUgUHJldHR5RGVsYXVuYXkgb2JqZWN0XG4gIGxldCBwcmV0dHlEZWxhdW5heSA9IG5ldyBQcmV0dHlEZWxhdW5heShjYW52YXMsIG9wdGlvbnMpO1xuXG4gIC8vIGluaXRpYWwgZ2VuZXJhdGlvblxuICBydW5EZWxhdW5heSgpO1xuXG4gIC8qKlxuICAgKiB1dGlsIGZ1bmN0aW9uc1xuICAgKi9cblxuICAvLyBnZXQgb3B0aW9ucyBhbmQgcmUtcmFuZG9taXplXG4gIGZ1bmN0aW9uIHJ1bkRlbGF1bmF5KCkge1xuICAgIGdldFJhbmRvbWl6ZU9wdGlvbnMoKTtcbiAgICBwcmV0dHlEZWxhdW5heS5yYW5kb21pemUobWluUG9pbnRzLCBtYXhQb2ludHMsIG1pbkVkZ2VQb2ludHMsIG1heEVkZ2VQb2ludHMsIG1pbkdyYWRpZW50cywgbWF4R3JhZGllbnRzLCBjb2xvcnMpO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0Q29sb3JzKCkge1xuICAgIHZhciBjb2xvcnMgPSBbXTtcblxuICAgIGlmIChkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY29sb3JUeXBlMScpLmNoZWNrZWQpIHtcbiAgICAgIC8vIGdlbmVyYXRlIHJhbmRvbSBjb2xvcnNcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgMzsgaSsrKSB7XG4gICAgICAgIHZhciBjb2xvciA9IFJhbmRvbS5yYW5kb21Ic2xhKCk7XG4gICAgICAgIGNvbG9ycy5wdXNoKGNvbG9yKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgLy8gdXNlIHRoZSBvbmVzIGluIHRoZSBpbnB1dHNcbiAgICAgIGNvbG9ycy5wdXNoKENvbG9yLnJnYlRvSHNsYShDb2xvci5oZXhUb1JnYmFBcnJheShkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY29sb3IxJykudmFsdWUpKSk7XG4gICAgICBjb2xvcnMucHVzaChDb2xvci5yZ2JUb0hzbGEoQ29sb3IuaGV4VG9SZ2JhQXJyYXkoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NvbG9yMicpLnZhbHVlKSkpO1xuICAgICAgY29sb3JzLnB1c2goQ29sb3IucmdiVG9Ic2xhKENvbG9yLmhleFRvUmdiYUFycmF5KGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjb2xvcjMnKS52YWx1ZSkpKTtcbiAgICB9XG5cbiAgICByZXR1cm4gY29sb3JzO1xuICB9XG5cbiAgLy8gZ2V0IG9wdGlvbnMgZnJvbSBjb29raWVzXG4gIGZ1bmN0aW9uIGdldENvb2tpZXMoKSB7XG4gICAgdmFyIGRlZmF1bHRzID0gUHJldHR5RGVsYXVuYXkuZGVmYXVsdHMoKTtcblxuICAgIHNob3dUcmlhbmdsZXMgPSBDb29raWVzLmdldEl0ZW0oJ0RlbGF1bmF5U2hvd1RyaWFuZ2xlcycpO1xuICAgIHNob3dQb2ludHMgICAgPSBDb29raWVzLmdldEl0ZW0oJ0RlbGF1bmF5U2hvd1BvaW50cycpO1xuICAgIHNob3dDaXJjbGVzICAgPSBDb29raWVzLmdldEl0ZW0oJ0RlbGF1bmF5U2hvd0NpcmNsZXMnKTtcbiAgICBzaG93Q2VudHJvaWRzID0gQ29va2llcy5nZXRJdGVtKCdEZWxhdW5heVNob3dDZW50cm9pZHMnKTtcbiAgICBzaG93RWRnZXMgICAgID0gQ29va2llcy5nZXRJdGVtKCdEZWxhdW5heVNob3dFZGdlcycpO1xuXG4gICAgLy8gVE9ETzogRFJZXG4gICAgLy8gb25seSBzZXQgb3B0aW9uIGZyb20gY29va2llIGlmIGl0IGV4aXN0cywgcGFyc2UgdG8gYm9vbGVhblxuICAgIGlmIChzaG93VHJpYW5nbGVzKSB7XG4gICAgICBvcHRpb25zLnNob3dUcmlhbmdsZXMgPSBzaG93VHJpYW5nbGVzID0gc2hvd1RyaWFuZ2xlcyA9PT0gJ3RydWUnID8gdHJ1ZSA6IGZhbHNlO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBzYXZlIG9wdGlvbiBzdGF0ZSBmb3Igc2V0dGluZyBjb29raWUgbGF0ZXJcbiAgICAgIHNob3dUcmlhbmdsZXMgPSBkZWZhdWx0cy5zaG93VHJpYW5nbGVzO1xuICAgIH1cblxuICAgIGlmIChzaG93UG9pbnRzKSB7XG4gICAgICBvcHRpb25zLnNob3dQb2ludHMgPSBzaG93UG9pbnRzID0gc2hvd1BvaW50cyA9PT0gJ3RydWUnID8gdHJ1ZSA6IGZhbHNlO1xuICAgIH0gZWxzZSB7XG4gICAgICBzaG93UG9pbnRzID0gZGVmYXVsdHMuc2hvd1BvaW50cztcbiAgICB9XG5cbiAgICBpZiAoc2hvd0NpcmNsZXMpIHtcbiAgICAgIG9wdGlvbnMuc2hvd0NpcmNsZXMgPSBzaG93Q2lyY2xlcyA9IHNob3dDaXJjbGVzID09PSAndHJ1ZScgPyB0cnVlIDogZmFsc2U7XG4gICAgfSBlbHNlIHtcbiAgICAgIHNob3dDaXJjbGVzID0gZGVmYXVsdHMuc2hvd0NpcmNsZXM7XG4gICAgfVxuXG4gICAgaWYgKHNob3dDZW50cm9pZHMpIHtcbiAgICAgIG9wdGlvbnMuc2hvd0NlbnRyb2lkcyA9IHNob3dDZW50cm9pZHMgPSBzaG93Q2VudHJvaWRzID09PSAndHJ1ZScgPyB0cnVlIDogZmFsc2U7XG4gICAgfSBlbHNlIHtcbiAgICAgIHNob3dDZW50cm9pZHMgPSBkZWZhdWx0cy5zaG93Q2VudHJvaWRzO1xuICAgIH1cblxuICAgIGlmIChzaG93RWRnZXMpIHtcbiAgICAgIG9wdGlvbnMuc2hvd0VkZ2VzID0gc2hvd0VkZ2VzID0gc2hvd0VkZ2VzID09PSAndHJ1ZScgPyB0cnVlIDogZmFsc2U7XG4gICAgfSBlbHNlIHtcbiAgICAgIHNob3dFZGdlcyA9IGRlZmF1bHRzLnNob3dFZGdlcztcbiAgICB9XG4gIH1cblxuICAvLyBnZXQgb3B0aW9ucyBmcm9tIGlucHV0IGZpZWxkc1xuICBmdW5jdGlvbiBnZXRSYW5kb21pemVPcHRpb25zKCkge1xuICAgIHZhciB1c2VNdWx0aXBsaWVyID0gbXVsdGlwbGllclJhZGlvLmNoZWNrZWQ7XG4gICAgbXVsdGlwbGllciA9IHBhcnNlRmxvYXQobXVsdGlwbGllcklucHV0LnZhbHVlKTtcbiAgICBtaW5Qb2ludHMgPSB1c2VNdWx0aXBsaWVyID8gMCA6IHBhcnNlSW50KG1pbklucHV0LnZhbHVlKTtcbiAgICBtYXhQb2ludHMgPSB1c2VNdWx0aXBsaWVyID8gMCA6IHBhcnNlSW50KG1heElucHV0LnZhbHVlKTtcbiAgICBtaW5FZGdlUG9pbnRzID0gdXNlTXVsdGlwbGllciA/IDAgOiBwYXJzZUludChtaW5FZGdlSW5wdXQudmFsdWUpO1xuICAgIG1heEVkZ2VQb2ludHMgPSB1c2VNdWx0aXBsaWVyID8gMCA6IHBhcnNlSW50KG1heEVkZ2VJbnB1dC52YWx1ZSk7XG4gICAgbWluR3JhZGllbnRzID0gcGFyc2VJbnQobWluR3JhZGllbnRJbnB1dC52YWx1ZSk7XG4gICAgbWF4R3JhZGllbnRzID0gcGFyc2VJbnQobWF4R3JhZGllbnRJbnB1dC52YWx1ZSk7XG4gICAgY29sb3JzID0gZ2V0Q29sb3JzKCk7XG4gIH1cblxuICBmdW5jdGlvbiB0aHJvdHRsZSh0eXBlLCBuYW1lLCBvYmopIHtcbiAgICBvYmogPSBvYmogfHwgd2luZG93O1xuICAgIHZhciBydW5uaW5nID0gZmFsc2U7XG4gICAgdmFyIGZ1bmMgPSBmdW5jdGlvbigpIHtcbiAgICAgIGlmIChydW5uaW5nKSB7IHJldHVybjsgfVxuICAgICAgcnVubmluZyA9IHRydWU7XG4gICAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoZnVuY3Rpb24oKSB7XG4gICAgICAgIG9iai5kaXNwYXRjaEV2ZW50KG5ldyBDdXN0b21FdmVudChuYW1lKSk7XG4gICAgICAgIHJ1bm5pbmcgPSBmYWxzZTtcbiAgICAgIH0pO1xuICAgIH07XG4gICAgb2JqLmFkZEV2ZW50TGlzdGVuZXIodHlwZSwgZnVuYyk7XG4gIH1cblxuICAvKiBpbml0IC0geW91IGNhbiBpbml0IGFueSBldmVudCAqL1xuICB0aHJvdHRsZSgncmVzaXplJywgJ29wdGltaXplZFJlc2l6ZScpO1xuXG4gIC8qKlxuICAgKiBzZXQgdXAgZXZlbnRzXG4gICAqL1xuXG4gIC8vIGNsaWNrIHRoZSBidXR0b24gdG8gcmVnZW5cbiAgYnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG4gICAgcnVuRGVsYXVuYXkoKTtcbiAgfSk7XG5cbiAgLy8gY2xpY2sgdGhlIGJ1dHRvbiB0byByZWdlbiBjb2xvcnMgb25seVxuICBnZW5lcmF0ZUNvbG9yc0J1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuICAgIHZhciBuZXdDb2xvcnMgPSBnZXRDb2xvcnMoKTtcbiAgICBwcmV0dHlEZWxhdW5heS5yZW5kZXJOZXdDb2xvcnMobmV3Q29sb3JzKTtcbiAgfSk7XG5cbiAgLy8gY2xpY2sgdGhlIGJ1dHRvbiB0byByZWdlbiBjb2xvcnMgb25seVxuICBnZW5lcmF0ZUdyYWRpZW50QnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG4gICAgZ2V0UmFuZG9taXplT3B0aW9ucygpO1xuICAgIHByZXR0eURlbGF1bmF5LnJlbmRlck5ld0dyYWRpZW50KG1pbkdyYWRpZW50cywgbWF4R3JhZGllbnRzKTtcbiAgfSk7XG5cbiAgLy8gY2xpY2sgdGhlIGJ1dHRvbiB0byByZWdlbiBjb2xvcnMgb25seVxuICBnZW5lcmF0ZVRyaWFuZ2xlc0J1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuICAgIGdldFJhbmRvbWl6ZU9wdGlvbnMoKTtcbiAgICBwcmV0dHlEZWxhdW5heS5yZW5kZXJOZXdUcmlhbmdsZXMobWluUG9pbnRzLCBtYXhQb2ludHMsIG1pbkVkZ2VQb2ludHMsIG1heEVkZ2VQb2ludHMsIG11bHRpcGxpZXIpO1xuICB9KTtcblxuICAvLyB0dXJuIFRyaWFuZ2xlcyBvZmYvb25cbiAgdG9nZ2xlVHJpYW5nbGVzQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG4gICAgc2hvd1RyaWFuZ2xlcyA9ICFzaG93VHJpYW5nbGVzO1xuICAgIENvb2tpZXMuc2V0SXRlbSgnRGVsYXVuYXlTaG93VHJpYW5nbGVzJywgc2hvd1RyaWFuZ2xlcyk7XG4gICAgcHJldHR5RGVsYXVuYXkudG9nZ2xlVHJpYW5nbGVzKCk7XG4gIH0pO1xuXG4gIC8vIHR1cm4gUG9pbnRzIG9mZi9vblxuICB0b2dnbGVQb2ludHNCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbigpIHtcbiAgICBzaG93UG9pbnRzID0gIXNob3dQb2ludHM7XG4gICAgQ29va2llcy5zZXRJdGVtKCdEZWxhdW5heVNob3dQb2ludHMnLCBzaG93UG9pbnRzKTtcbiAgICBwcmV0dHlEZWxhdW5heS50b2dnbGVQb2ludHMoKTtcbiAgfSk7XG5cbiAgLy8gdHVybiBDaXJjbGVzIG9mZi9vblxuICB0b2dnbGVDaXJjbGVzQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG4gICAgc2hvd0NpcmNsZXMgPSAhc2hvd0NpcmNsZXM7XG4gICAgQ29va2llcy5zZXRJdGVtKCdEZWxhdW5heVNob3dDaXJjbGVzJywgc2hvd0NpcmNsZXMpO1xuICAgIHByZXR0eURlbGF1bmF5LnRvZ2dsZUNpcmNsZXMoKTtcbiAgfSk7XG5cbiAgLy8gdHVybiBDZW50cm9pZHMgb2ZmL29uXG4gIHRvZ2dsZUNlbnRyb2lkc0J1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuICAgIHNob3dDZW50cm9pZHMgPSAhc2hvd0NlbnRyb2lkcztcbiAgICBDb29raWVzLnNldEl0ZW0oJ0RlbGF1bmF5U2hvd0NlbnRyb2lkcycsIHNob3dDZW50cm9pZHMpO1xuICAgIHByZXR0eURlbGF1bmF5LnRvZ2dsZUNlbnRyb2lkcygpO1xuICB9KTtcblxuICAvLyB0dXJuIEVkZ2VzIG9mZi9vblxuICB0b2dnbGVFZGdlc0J1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuICAgIHNob3dFZGdlcyA9ICFzaG93RWRnZXM7XG4gICAgQ29va2llcy5zZXRJdGVtKCdEZWxhdW5heVNob3dFZGdlcycsIHNob3dFZGdlcyk7XG4gICAgcHJldHR5RGVsYXVuYXkudG9nZ2xlRWRnZXMoKTtcbiAgfSk7XG5cbiAgLy8gcmVzaXplIGV2ZW50XG4gIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdvcHRpbWl6ZWRSZXNpemUnLCBmdW5jdGlvbigpIHtcbiAgICBwcmV0dHlEZWxhdW5heS5yZXNjYWxlKCk7XG4gIH0pO1xuXG4gIC8vIGRvbnQgZG8gYW55dGhpbmcgb24gZm9ybSBzdWJtaXRcbiAgZm9ybS5hZGRFdmVudExpc3RlbmVyKCdzdWJtaXQnLCBmdW5jdGlvbihlKSB7XG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIHJldHVybiBmYWxzZTtcbiAgfSk7XG59KSgpO1xuIiwidmFyIFBvaW50O1xuXG4oZnVuY3Rpb24oKSB7XG4gICd1c2Ugc3RyaWN0JztcblxuICB2YXIgQ29sb3IgPSBDb2xvciB8fCByZXF1aXJlKCcuL2NvbG9yJyk7XG5cbiAgLyoqXG4gICAqIFJlcHJlc2VudHMgYSBwb2ludFxuICAgKiBAY2xhc3NcbiAgICovXG4gIGNsYXNzIF9Qb2ludCB7XG4gICAgLyoqXG4gICAgICogUG9pbnQgY29uc2lzdHMgeCBhbmQgeVxuICAgICAqIEBjb25zdHJ1Y3RvclxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSB4XG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IHlcbiAgICAgKiBvcjpcbiAgICAgKiBAcGFyYW0ge051bWJlcltdfSB4XG4gICAgICogd2hlcmUgeCBpcyBsZW5ndGgtMiBhcnJheVxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKHgsIHkpIHtcbiAgICAgIGlmIChBcnJheS5pc0FycmF5KHgpKSB7XG4gICAgICAgIHkgPSB4WzFdO1xuICAgICAgICB4ID0geFswXTtcbiAgICAgIH1cbiAgICAgIHRoaXMueCA9IHg7XG4gICAgICB0aGlzLnkgPSB5O1xuICAgICAgdGhpcy5yYWRpdXMgPSAxO1xuICAgICAgdGhpcy5jb2xvciA9ICdibGFjayc7XG4gICAgfVxuXG4gICAgLy8gZHJhdyB0aGUgcG9pbnRcbiAgICByZW5kZXIoY3R4LCBjb2xvcikge1xuICAgICAgY3R4LmJlZ2luUGF0aCgpO1xuICAgICAgY3R4LmFyYyh0aGlzLngsIHRoaXMueSwgdGhpcy5yYWRpdXMsIDAsIDIgKiBNYXRoLlBJLCBmYWxzZSk7XG4gICAgICBjdHguZmlsbFN0eWxlID0gY29sb3IgfHwgdGhpcy5jb2xvcjtcbiAgICAgIGN0eC5maWxsKCk7XG4gICAgICBjdHguY2xvc2VQYXRoKCk7XG4gICAgfVxuXG4gICAgLy8gY29udmVydHMgdG8gc3RyaW5nXG4gICAgLy8gcmV0dXJucyBzb21ldGhpbmcgbGlrZTpcbiAgICAvLyBcIihYLFkpXCJcbiAgICAvLyB1c2VkIGluIHRoZSBwb2ludG1hcCB0byBkZXRlY3QgdW5pcXVlIHBvaW50c1xuICAgIHRvU3RyaW5nKCkge1xuICAgICAgcmV0dXJuICcoJyArIHRoaXMueCArICcsJyArIHRoaXMueSArICcpJztcbiAgICB9XG5cbiAgICAvLyBncmFiIHRoZSBjb2xvciBvZiB0aGUgY2FudmFzIGF0IHRoZSBwb2ludFxuICAgIC8vIHJlcXVpcmVzIGltYWdlZGF0YSBmcm9tIGNhbnZhcyBzbyB3ZSBkb250IGdyYWJcbiAgICAvLyBlYWNoIHBvaW50IGluZGl2aWR1YWxseSwgd2hpY2ggaXMgcmVhbGx5IGV4cGVuc2l2ZVxuICAgIGNhbnZhc0NvbG9yQXRQb2ludChpbWFnZURhdGEsIGNvbG9yU3BhY2UpIHtcbiAgICAgIGNvbG9yU3BhY2UgPSBjb2xvclNwYWNlIHx8ICdoc2xhJztcbiAgICAgIC8vIG9ubHkgZmluZCB0aGUgY2FudmFzIGNvbG9yIGlmIHdlIGRvbnQgYWxyZWFkeSBrbm93IGl0XG4gICAgICBpZiAoIXRoaXMuX2NhbnZhc0NvbG9yKSB7XG4gICAgICAgIC8vIGltYWdlRGF0YSBhcnJheSBpcyBmbGF0LCBnb2VzIGJ5IHJvd3MgdGhlbiBjb2xzLCBmb3VyIHZhbHVlcyBwZXIgcGl4ZWxcbiAgICAgICAgdmFyIGlkeCA9IChNYXRoLmZsb29yKHRoaXMueSkgKiBpbWFnZURhdGEud2lkdGggKiA0KSArIChNYXRoLmZsb29yKHRoaXMueCkgKiA0KTtcblxuICAgICAgICBpZiAoY29sb3JTcGFjZSA9PT0gJ2hzbGEnKSB7XG4gICAgICAgICAgdGhpcy5fY2FudmFzQ29sb3IgPSBDb2xvci5yZ2JUb0hzbGEoQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoaW1hZ2VEYXRhLmRhdGEsIGlkeCwgaWR4ICsgNCkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMuX2NhbnZhc0NvbG9yID0gJ3JnYignICsgQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoaW1hZ2VEYXRhLmRhdGEsIGlkeCwgaWR4ICsgMykuam9pbigpICsgJyknO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gdGhpcy5fY2FudmFzQ29sb3I7XG4gICAgICB9XG4gICAgICByZXR1cm4gdGhpcy5fY2FudmFzQ29sb3I7XG4gICAgfVxuXG4gICAgZ2V0Q29vcmRzKCkge1xuICAgICAgcmV0dXJuIFt0aGlzLngsIHRoaXMueV07XG4gICAgfVxuXG4gICAgLy8gZGlzdGFuY2UgdG8gYW5vdGhlciBwb2ludFxuICAgIGdldERpc3RhbmNlVG8ocG9pbnQpIHtcbiAgICAgIC8vIOKImih4MuKIkngxKTIrKHky4oiSeTEpMlxuICAgICAgcmV0dXJuIE1hdGguc3FydChNYXRoLnBvdyh0aGlzLnggLSBwb2ludC54LCAyKSArIE1hdGgucG93KHRoaXMueSAtIHBvaW50LnksIDIpKTtcbiAgICB9XG5cbiAgICAvLyBzY2FsZSBwb2ludHMgZnJvbSBbQSwgQl0gdG8gW0MsIERdXG4gICAgLy8geEEgPT4gb2xkIHggbWluLCB4QiA9PiBvbGQgeCBtYXhcbiAgICAvLyB5QSA9PiBvbGQgeSBtaW4sIHlCID0+IG9sZCB5IG1heFxuICAgIC8vIHhDID0+IG5ldyB4IG1pbiwgeEQgPT4gbmV3IHggbWF4XG4gICAgLy8geUMgPT4gbmV3IHkgbWluLCB5RCA9PiBuZXcgeSBtYXhcbiAgICByZXNjYWxlKHhBLCB4QiwgeUEsIHlCLCB4QywgeEQsIHlDLCB5RCkge1xuICAgICAgLy8gTmV3VmFsdWUgPSAoKChPbGRWYWx1ZSAtIE9sZE1pbikgKiBOZXdSYW5nZSkgLyBPbGRSYW5nZSkgKyBOZXdNaW5cblxuICAgICAgdmFyIHhPbGRSYW5nZSA9IHhCIC0geEE7XG4gICAgICB2YXIgeU9sZFJhbmdlID0geUIgLSB5QTtcblxuICAgICAgdmFyIHhOZXdSYW5nZSA9IHhEIC0geEM7XG4gICAgICB2YXIgeU5ld1JhbmdlID0geUQgLSB5QztcblxuICAgICAgdGhpcy54ID0gKCgodGhpcy54IC0geEEpICogeE5ld1JhbmdlKSAvIHhPbGRSYW5nZSkgKyB4QztcbiAgICAgIHRoaXMueSA9ICgoKHRoaXMueSAtIHlBKSAqIHlOZXdSYW5nZSkgLyB5T2xkUmFuZ2UpICsgeUM7XG4gICAgfVxuICB9XG5cbiAgaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBfUG9pbnQ7XG4gIH1cblxuICBQb2ludCA9IF9Qb2ludDtcbn0pKCk7XG4iLCJ2YXIgUmFuZG9tO1xuXG4oZnVuY3Rpb24oKSB7XG4gICd1c2Ugc3RyaWN0JztcbiAgLy8gUmFuZG9tIGhlbHBlciBmdW5jdGlvbnMvLyByYW5kb20gaGVscGVyIGZ1bmN0aW9uc1xuXG4gIHZhciBQb2ludCA9IFBvaW50IHx8IHJlcXVpcmUoJy4vcG9pbnQnKTtcblxuICBSYW5kb20gPSB7XG4gICAgLy8gaGV5IGxvb2sgYSBjbG9zdXJlXG4gICAgLy8gcmV0dXJucyBmdW5jdGlvbiBmb3IgcmFuZG9tIG51bWJlcnMgd2l0aCBwcmUtc2V0IG1heCBhbmQgbWluXG4gICAgcmFuZG9tTnVtYmVyRnVuY3Rpb246IGZ1bmN0aW9uKG1heCwgbWluKSB7XG4gICAgICBtaW4gPSBtaW4gfHwgMDtcbiAgICAgIGlmIChtaW4gPiBtYXgpIHtcbiAgICAgICAgdmFyIHRlbXAgPSBtYXg7XG4gICAgICAgIG1heCA9IG1pbjtcbiAgICAgICAgbWluID0gdGVtcDtcbiAgICAgIH1cbiAgICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIChtYXggLSBtaW4gKyAxKSkgKyBtaW47XG4gICAgICB9O1xuICAgIH0sXG5cbiAgICAvLyByZXR1cm5zIGEgcmFuZG9tIG51bWJlclxuICAgIC8vIGJldHdlZW4gdGhlIG1heCBhbmQgbWluXG4gICAgcmFuZG9tQmV0d2VlbjogZnVuY3Rpb24obWF4LCBtaW4pIHtcbiAgICAgIG1pbiA9IG1pbiB8fCAwO1xuICAgICAgcmV0dXJuIFJhbmRvbS5yYW5kb21OdW1iZXJGdW5jdGlvbihtYXgsIG1pbikoKTtcbiAgICB9LFxuXG4gICAgcmFuZG9tSW5DaXJjbGU6IGZ1bmN0aW9uKHJhZGl1cywgb3gsIG95KSB7XG4gICAgICB2YXIgYW5nbGUgPSBNYXRoLnJhbmRvbSgpICogTWF0aC5QSSAqIDI7XG4gICAgICB2YXIgcmFkID0gTWF0aC5zcXJ0KE1hdGgucmFuZG9tKCkpICogcmFkaXVzO1xuICAgICAgdmFyIHggPSBveCArIHJhZCAqIE1hdGguY29zKGFuZ2xlKTtcbiAgICAgIHZhciB5ID0gb3kgKyByYWQgKiBNYXRoLnNpbihhbmdsZSk7XG5cbiAgICAgIHJldHVybiBuZXcgUG9pbnQoeCwgeSk7XG4gICAgfSxcblxuICAgIHJhbmRvbVJnYmE6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuICdyZ2JhKCcgKyBSYW5kb20ucmFuZG9tQmV0d2VlbigyNTUpICsgJywnICtcbiAgICAgICAgICAgICAgICAgICAgICAgUmFuZG9tLnJhbmRvbUJldHdlZW4oMjU1KSArICcsJyArXG4gICAgICAgICAgICAgICAgICAgICAgIFJhbmRvbS5yYW5kb21CZXR3ZWVuKDI1NSkgKyAnLCAxKSc7XG4gICAgfSxcblxuICAgIHJhbmRvbUhzbGE6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuICdoc2xhKCcgKyBSYW5kb20ucmFuZG9tQmV0d2VlbigzNjApICsgJywnICtcbiAgICAgICAgICAgICAgICAgICAgICAgUmFuZG9tLnJhbmRvbUJldHdlZW4oMTAwKSArICclLCcgK1xuICAgICAgICAgICAgICAgICAgICAgICBSYW5kb20ucmFuZG9tQmV0d2VlbigxMDApICsgJyUsIDEpJztcbiAgICB9LFxuICB9O1xuXG4gIGlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gUmFuZG9tO1xuICB9XG5cbn0pKCk7XG4iXX0=
