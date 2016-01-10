(function() {
  'use strict';

  var Color  = require('./color');
  var Random = require('./random');

  var Cookies = {
    getItem: function(sKey) {
      if (!sKey) { return null; }
      return decodeURIComponent(
        document.cookie.replace(
          new RegExp(
              '(?:(?:^|.*;)\\s*'                                        +
              encodeURIComponent(sKey).replace(/[\-\.\+\*]/g, '\\$&')   +
              '\\s*\\=\\s*([^;]*).*$)|^.*$'), '$1')
            ) || null;
    },

    setItem: function(sKey, sValue, vEnd, sPath, sDomain, bSecure) {
      if (!sKey || /^(?:expires|max\-age|path|domain|secure)$/i.test(sKey)) { return false; }
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
      document.cookie = encodeURIComponent(sKey) +
        '=' +
        encodeURIComponent(sValue) +
        sExpires +
        (sDomain ? '; domain=' +
        sDomain : '') +
        (sPath ? '; path=' +
        sPath : '') +
        (bSecure ? '; secure' : '');
      console.log(document.cookie);
      return true;
    },

    removeItem: function(sKey, sPath, sDomain) {
      if (!this.hasItem(sKey)) { return false; }
      document.cookie = encodeURIComponent(sKey)    +
        '=; expires=Thu, 01 Jan 1970 00:00:00 GMT'  +
        (sDomain ? '; domain=' + sDomain : '')      +
        (sPath   ? '; path='   + sPath   : '');
      return true;
    },

    hasItem: function(sKey) {
      if (!sKey) { return false; }
      return (new RegExp('(?:^|;\\s*)' + encodeURIComponent(sKey)
        .replace(/[\-\.\+\*]/g, '\\$&') + '\\s*\\='))
        .test(document.cookie);
    },

    keys: function() {
      var aKeys = document.cookie.replace(/((?:^|\s*;)[^\=]+)(?=;|$)|^\s*|\s*(?:\=[^;]*)?(?:\1|$)/g, '')
        .split(/\s*(?:\=[^;]*)?;\s*/);
      for (var nLen = aKeys.length, nIdx = 0; nIdx < nLen; nIdx++) { aKeys[nIdx] = decodeURIComponent(aKeys[nIdx]); }
      return aKeys;
    },
  };

  // set up variables for canvas, inputs, etc
  const canvas = document.getElementById('canvas');

  const button = document.getElementById('button');

  const generateColorsButton = document.getElementById('generateColors');
  const generateGradientButton = document.getElementById('generateGradient');
  const generateTrianglesButton = document.getElementById('generateTriangles');

  const toggleTrianglesButton = document.getElementById('toggleTriangles');
  const togglePointsButton = document.getElementById('togglePoints');
  const toggleCirclesButton = document.getElementById('toggleCircles');
  const toggleCentroidsButton = document.getElementById('toggleCentroids');
  const toggleEdgesButton = document.getElementById('toggleEdges');

  const form = document.getElementById('form');
  const maxInput = document.getElementById('maxPoints');
  const minInput = document.getElementById('minPoints');
  const maxEdgeInput = document.getElementById('maxEdgePoints');
  const minEdgeInput = document.getElementById('minEdgePoints');
  const maxGradientInput = document.getElementById('maxGradients');
  const minGradientInput = document.getElementById('minGradients');

  var minPoints, maxPoints, minEdgePoints, maxEdgePoints, minGradients, maxGradients, colors;

  var showTriangles, showPoints, showCircles, showCentroids, showEdges;

  var options = {
    onDarkBackground: function() {
      form.className = 'form light';
    },
    onLightBackground: function() {
      form.className = 'form dark';
    },
  };

  getCookies();

  // initialize the PrettyDelaunay object
  let prettyDelaunay = new PrettyDelaunay(canvas, options);

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
    showPoints    = Cookies.getItem('DelaunayShowPoints');
    showCircles   = Cookies.getItem('DelaunayShowCircles');
    showCentroids = Cookies.getItem('DelaunayShowCentroids');
    showEdges     = Cookies.getItem('DelaunayShowEdges');

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
    var func = function() {
      if (running) { return; }
      running = true;
      requestAnimationFrame(function() {
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
  button.addEventListener('click', function() {
    runDelaunay();
  });

  // click the button to regen colors only
  generateColorsButton.addEventListener('click', function() {
    var newColors = getColors();
    prettyDelaunay.renderNewColors(newColors);
  });

  // click the button to regen colors only
  generateGradientButton.addEventListener('click', function() {
    getRandomizeOptions();
    prettyDelaunay.renderNewGradient(minGradients, maxGradients);
  });

  // click the button to regen colors only
  generateTrianglesButton.addEventListener('click', function() {
    getRandomizeOptions();
    prettyDelaunay.renderNewTriangles(minPoints, maxPoints, minEdgePoints, maxEdgePoints);
  });

  // turn Triangles off/on
  toggleTrianglesButton.addEventListener('click', function() {
    showTriangles = !showTriangles;
    Cookies.setItem('DelaunayShowTriangles', showTriangles);
    prettyDelaunay.toggleTriangles();
  });

  // turn Points off/on
  togglePointsButton.addEventListener('click', function() {
    showPoints = !showPoints;
    Cookies.setItem('DelaunayShowPoints', showPoints);
    prettyDelaunay.togglePoints();
  });

  // turn Circles off/on
  toggleCirclesButton.addEventListener('click', function() {
    showCircles = !showCircles;
    Cookies.setItem('DelaunayShowCircles', showCircles);
    prettyDelaunay.toggleCircles();
  });

  // turn Centroids off/on
  toggleCentroidsButton.addEventListener('click', function() {
    showCentroids = !showCentroids;
    Cookies.setItem('DelaunayShowCentroids', showCentroids);
    prettyDelaunay.toggleCentroids();
  });

  // turn Edges off/on
  toggleEdgesButton.addEventListener('click', function() {
    showEdges = !showEdges;
    Cookies.setItem('DelaunayShowEdges', showEdges);
    prettyDelaunay.toggleEdges();
  });

  // resize event
  window.addEventListener('optimizedResize', function() {
    prettyDelaunay.rescale();
  });

  // dont do anything on form submit
  form.addEventListener('submit', function(e) {
    e.preventDefault();
    return false;
  });
})();
