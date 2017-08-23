const PrettyDelaunay  = require('./PrettyDelaunay');
const Color  = require('./PrettyDelaunay/color');
const Random = require('./PrettyDelaunay/random');

// grab DOM elements
const main = document.getElementById('main');
const form = document.getElementById('form');
const canvas = document.getElementById('canvas');

const generateButtons = document.getElementById('generate-buttons');
const renderOptions = document.getElementById('render-options');
const pointOptions = document.getElementById('point-options');
const backgroundOptions = document.getElementById('background-options');

const renderOptionElements = {
  showTriangles: document.getElementById('show-triangles'),
  showPoints: document.getElementById('show-points'),
  showCircles: document.getElementById('show-circles'),
  showCentroids: document.getElementById('show-centroids'),
  showEdges: document.getElementById('show-edges'),
  showHover: document.getElementById('show-hover'),
  showAnimation: document.getElementById('show-animation')
};

const multiplierRadio = document.getElementById('point-gen-option-multiplier');
const multiplierInput = document.getElementById('points-multiplier');
const maxInput = document.getElementById('max-points');
const minInput = document.getElementById('min-points');
const maxEdgeInput = document.getElementById('max-edge-points');
const minEdgeInput = document.getElementById('min-edge-points');
const maxGradientInput = document.getElementById('max-gradients');
const minGradientInput = document.getElementById('min-gradients');

const imageBackgroundUpload = document.getElementById('image-background-upload');
const imageBackgroundURL = document.getElementById('image-background-url');

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

  if (document.getElementById('color-type-1').checked) {
    // generate random colors
    for (var i = 0; i < 3; i++) {
      var color = Random.randomHsla();
      colors.push(color);
    }
  } else {
    // use the ones in the inputs
    colors.push(Color.rgbToHsla(Color.hexToRgbaArray(document.getElementById('color-1').value)));
    colors.push(Color.rgbToHsla(Color.hexToRgbaArray(document.getElementById('color-2').value)));
    colors.push(Color.rgbToHsla(Color.hexToRgbaArray(document.getElementById('color-3').value)));
  }

  return colors;
}

function getImage() {
  if (!document.getElementById('color-type-3').checked) {
    return '';
  }

  if (document.getElementById('image-background-upload-option').checked && imageBackgroundUpload.files.length) {
    let file = imageBackgroundUpload.files[0];
    return window.URL.createObjectURL(file);
  } else if (document.getElementById('image-background-url-option').checked) {
    return imageBackgroundURL.value;
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

generateButtons.addEventListener('click', (event) => {
  let button = event.target;

  if (button.hasAttribute('data-generate-colors') &&
      button.hasAttribute('data-generate-gradients') &&
      button.hasAttribute('data-generate-triangles')) {
    runDelaunay();
    return;
  }

  if (button.hasAttribute('data-generate-colors')) {
    let newColors = getColors();
    prettyDelaunay.renderNewColors(newColors);
  }

  if (button.hasAttribute('data-generate-gradients')) {
    getRandomizeOptions();
    prettyDelaunay.renderNewGradient(minGradients, maxGradients);
  }

  if (button.hasAttribute('data-generate-triangles')) {
    getRandomizeOptions();
    prettyDelaunay.renderNewTriangles(minPoints, maxPoints, minEdgePoints, maxEdgePoints, multiplier);
  }
});

renderOptions.addEventListener('change', (event) => {
  console.log(event.target.name);
  let options = Object.keys(renderOptionElements);
  for (var i = 0; i < options.length; i++) {
    let option = options[i];
    console.log(option);
  }
  prettyDelaunay.render();
});

// // turn Triangles off/on
// showTrianglesInput.addEventListener('change', function(event) {
//   if (event.target.checked !== showTriangles) {
//     showTriangles = !showTriangles;
//     prettyDelaunay.toggleTriangles();
//   }
// });
//
// // turn Points off/on
// showPointsInput.addEventListener('change', function(event) {
//   if (event.target.checked !== showPoints) {
//     showPoints = !showPoints;
//     prettyDelaunay.togglePoints();
//   }
// });
//
// // turn Circles off/on
// showCirclesInput.addEventListener('change', function(event) {
//   if (event.target.checked !== showCircles) {
//     showCircles = !showCircles;
//     prettyDelaunay.toggleCircles();
//   }
// });
//
// // turn Centroids off/on
// showCentroidsInput.addEventListener('change', function(event) {
//   if (event.target.checked !== showCentroids) {
//     showCentroids = !showCentroids;
//     prettyDelaunay.toggleCentroids();
//   }
// });
//
// // turn Edges off/on
// showEdgesInput.addEventListener('change', function(event) {
//   if (event.target.checked !== showEdges) {
//     showEdges = !showEdges;
//     prettyDelaunay.toggleEdges();
//   }
// });

// turn Animation off/on
// showAnimationInput.addEventListener('change', function(event) {
//   if (event.target.checked !== showAnimation) {
//     showAnimation = !showAnimation;
//     prettyDelaunay.toggleAnimation();
//   }
// });

// dont do anything on form submit
form.addEventListener('submit', function(e) {
  e.preventDefault();
  return false;
});
