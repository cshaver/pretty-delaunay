const PrettyDelaunay  = require('./PrettyDelaunay');
const Color  = require('./PrettyDelaunay/color');
const Random = require('./PrettyDelaunay/random');

// grab DOM elements
const main = document.getElementById('main');
const form = document.getElementById('form');
const canvas = document.getElementById('canvas');

const generateButton = document.getElementById('generate');

const generateColorsButton = document.getElementById('generateColors');
const generateGradientButton = document.getElementById('generateGradient');
const generateTrianglesButton = document.getElementById('generateTriangles');

const showTrianglesInput = document.getElementById('showTriangles');
const showPointsInput = document.getElementById('showPoints');
const showCirclesInput = document.getElementById('showCircles');
const showCentroidsInput = document.getElementById('showCentroids');
const showEdgesInput = document.getElementById('showEdges');
const showHoverInput = document.getElementById('showHover');
const showAnimationInput = document.getElementById('showAnimation');

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

let randomizeOptions = {};

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
generateButton.addEventListener('click', function() {
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
showTrianglesInput.addEventListener('change', function(event) {
  if (event.target.checked !== showTriangles) {
    showTriangles = !showTriangles;
    prettyDelaunay.toggleTriangles();
  }
});

// turn Points off/on
showPointsInput.addEventListener('change', function(event) {
  if (event.target.checked !== showPoints) {
    showPoints = !showPoints;
    prettyDelaunay.togglePoints();
  }
});

// turn Circles off/on
showCirclesInput.addEventListener('change', function(event) {
  if (event.target.checked !== showCircles) {
    showCircles = !showCircles;
    prettyDelaunay.toggleCircles();
  }
});

// turn Centroids off/on
showCentroidsInput.addEventListener('change', function(event) {
  if (event.target.checked !== showCentroids) {
    showCentroids = !showCentroids;
    prettyDelaunay.toggleCentroids();
  }
});

// turn Edges off/on
showEdgesInput.addEventListener('change', function(event) {
  if (event.target.checked !== showEdges) {
    showEdges = !showEdges;
    prettyDelaunay.toggleEdges();
  }
});

// turn Animation off/on
showAnimationInput.addEventListener('change', function(event) {
  if (event.target.checked !== showAnimation) {
    showAnimation = !showAnimation;
    prettyDelaunay.toggleAnimation();
  }
});

// dont do anything on form submit
form.addEventListener('submit', function(e) {
  e.preventDefault();
  return false;
});
