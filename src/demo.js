const PrettyDelaunay  = require('./PrettyDelaunay');
const Color  = require('./PrettyDelaunay/color');
const Random = require('./PrettyDelaunay/random');
const Cookies = require('./demo/cookies');

// grab DOM elements
const main = document.getElementById('main');
const form = document.getElementById('form');
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
const toggleHoverButton = document.getElementById('toggleHover');
const toggleAnimationButton = document.getElementById('toggleAnimation');

const multiplierRadio = document.getElementById('pointGen1');
const multiplierInput = document.getElementById('pointsMultiplier');
const maxInput = document.getElementById('maxPoints');
const minInput = document.getElementById('minPoints');
const maxEdgeInput = document.getElementById('maxEdgePoints');
const minEdgeInput = document.getElementById('minEdgePoints');
const maxGradientInput = document.getElementById('maxGradients');
const minGradientInput = document.getElementById('minGradients');

const imageBackgroundUpload = document.getElementById('imageBackgroundUpload');
const imageBackgroundInput = document.getElementById('imageBackgroundInput');

let minPoints, maxPoints, minEdgePoints, maxEdgePoints, minGradients, maxGradients, multiplier, colors, image;

let showTriangles, showPoints, showCircles, showCentroids, showEdges, showAnimation;

const options = {
  onDarkBackground: function() {
    main.className = 'theme-light';
  },
  onLightBackground: function() {
    main.className = 'theme-dark';
  },
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
    let file = imageBackgroundUpload.files[0];
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
  showPoints    = Cookies.getItem('DelaunayShowPoints');
  showCircles   = Cookies.getItem('DelaunayShowCircles');
  showCentroids = Cookies.getItem('DelaunayShowCentroids');
  showEdges     = Cookies.getItem('DelaunayShowEdges');
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
  prettyDelaunay.renderNewTriangles(minPoints, maxPoints, minEdgePoints, maxEdgePoints, multiplier);
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

// turn Animation off/on
toggleAnimationButton.addEventListener('click', function() {
  showAnimation = !showAnimation;
  Cookies.setItem('DelaunayShowAnimation', showAnimation);
  prettyDelaunay.toggleAnimation();
});

// dont do anything on form submit
form.addEventListener('submit', function(e) {
  e.preventDefault();
  return false;
});
