const PrettyDelaunay  = require('./PrettyDelaunay');
const Color  = require('./PrettyDelaunay/color');
const Random = require('./PrettyDelaunay/random');

const elements = require('./demo/elements');

// initialize PrettyDelaunay on the canva
const prettyDelaunay = new PrettyDelaunay(elements.canvas, {
  onDarkBackground: () => {
    elements.main.className = 'theme-light';
  },
  onLightBackground: () => {
    elements.main.className = 'theme-dark';
  }
});

// initial generation
randomize();

/**
 * util functions
 */

// get options and re-randomize
function randomize() {
  let options = getOptions();
  prettyDelaunay.randomize(
    options.minPoints,
    options.maxPoints,
    options.minEdgePoints,
    options.maxEdgePoints,
    options.minGradients,
    options.maxGradients,
    options.multiplier,
    options.colors,
    options.image
  );
}

// get options from input fields
function getOptions() {
  let useMultiplier = elements.multiplierRadio.checked;
  let options = {
    multiplier: parseFloat(elements.multiplierInput.value),
    minPoints: useMultiplier ? 0 : parseInt(elements.minPointsInput.value),
    maxPoints: useMultiplier ? 0 : parseInt(elements.maxPointsInput.value),
    minEdgePoints: useMultiplier ? 0 : parseInt(elements.minEdgesInput.value),
    maxEdgePoints: useMultiplier ? 0 : parseInt(elements.maxEdgesInput.value),
    minGradients: parseInt(elements.minGradientsInput.value),
    maxGradients: parseInt(elements.maxGradientsInput.value),
    colors: getColors(),
    image: getImage()
  };

  return options;
}

function getColors() {
  var colors = [];

  console.log(elements.colorInputs.map((element) => {
    return element.value;
  }));

  if (elements.colorChooseOption.checked) {
    // use the ones in the inputs
    colors = elements.colorInputs.map((element) => {
      Color.rgbToHsla(Color.hexToRgbaArray(element.value));
    });
  } else {
    // generate random colors
    colors = elements.colorInputs.map(() => {
      return Random.randomHsla();
    });
  }

  return colors;
}

function getImage() {
  if (!elements.colorImageOption.checked) {
    return '';
  }

  if (elements.imageBackgroundUploadOption.checked && elements.imageBackgroundUpload.files.length) {
    let file = elements.imageBackgroundUpload.files[0];
    return window.URL.createObjectURL(file);
  } else if (imageBackgroundURLOption.checked) {
    return elements.imageBackgroundURL.value;
  } else {
    return '';
  }
}

/**
 * set up events
 */

// regenerate the triangulation entirely, or only update the color, shape, or triangles
elements.sections.generateButtons.addEventListener('click', (event) => {
  let button = event.target;

  if (button.hasAttribute('data-generate-colors') &&
      button.hasAttribute('data-generate-gradients') &&
      button.hasAttribute('data-generate-triangles')) {
    randomize();
    return;
  }

  if (button.hasAttribute('data-generate-colors')) {
    prettyDelaunay.renderNewColors(getColors());
  }

  if (button.hasAttribute('data-generate-gradients')) {
    let options = getOptions();
    prettyDelaunay.renderNewGradient(
      options.minGradients,
      options.maxGradients
    );
  }

  if (button.hasAttribute('data-generate-triangles')) {
    let options = getOptions();
    prettyDelaunay.renderNewTriangles(
      options.minPoints,
      options.maxPoints,
      options.minEdgePoints,
      options.maxEdgePoints,
      options.multiplier
    );
  }
});

// update the render when options are changed
elements.sections.renderOptions.addEventListener('change', (event) => {
  let options = Object.keys(elements.renderOptions);
  for (var i = 0; i < options.length; i++) {
    let option = options[i];
    let element = renderOptionElements[option];
    let toggleFunctionName = option.replace('show', 'toggle');
    if (prettyDelaunay[toggleFunctionName]) {
      prettyDelaunay[toggleFunctionName](element.checked);
    }
  }
});

// don't do anything on form submit
elements.form.addEventListener('submit', (event) => {
  event.preventDefault();
  return false;
});
