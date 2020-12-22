/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/ban-ts-comment */
import PrettyDelaunay from '../PrettyDelaunay/index';
import {rgbToHsla,
hexToRgbaArray,
rgbToHex} from '../PrettyDelaunay/color';
import Random from '../PrettyDelaunay/random';

const elements = {
  main: document.getElementById('main') as HTMLElement,
  form: document.getElementById('form') as HTMLFormElement,
  canvas: document.getElementById('canvas') as HTMLCanvasElement,
  sections: {
    generateButtons: document.getElementById('generate-buttons') as HTMLElement,
    renderOptions: document.getElementById('render-options') as HTMLElement,
    pointOptions: document.getElementById('point-options') as HTMLElement,
    backgroundOptions: document.getElementById('background-options') as HTMLElement,
    colorInputs: document.getElementById('color-inputs') as HTMLElement,
  },
  renderOptions: {
    showTriangles: document.getElementById('show-triangles') as HTMLInputElement,
    showPoints: document.getElementById('show-points') as HTMLInputElement,
    showCircles: document.getElementById('show-circles') as HTMLInputElement,
    showCentroids: document.getElementById('show-centroids') as HTMLInputElement,
    showEdges: document.getElementById('show-edges') as HTMLInputElement,
    showHover: document.getElementById('show-hover') as HTMLInputElement,
    showAnimation: document.getElementById('show-animation') as HTMLInputElement,
  },

  multiplierRadio: document.getElementById('point-gen-option-multiplier') as HTMLInputElement,
  multiplierInput: document.getElementById('points-multiplier') as HTMLInputElement,

  minPointsInput: document.getElementById('min-points') as HTMLInputElement,
  maxPointsInput: document.getElementById('max-points') as HTMLInputElement,

  minEdgesInput: document.getElementById('min-edge-points') as HTMLInputElement,
  maxEdgesInput: document.getElementById('max-edge-points') as HTMLInputElement,

  minGradientsInput: document.getElementById('min-gradients') as HTMLInputElement,
  maxGradientsInput: document.getElementById('max-gradients') as HTMLInputElement,

  imageBackgroundUploadOption: document.getElementById('image-background-upload-option') as HTMLInputElement,
  imageBackgroundUpload: document.getElementById('image-background-upload') as HTMLInputElement,
  imageBackgroundURLOption: document.getElementById('image-background-url-option') as HTMLInputElement,
  imageBackgroundURL: document.getElementById('image-background-url') as HTMLInputElement,

  colorRandomOption: document.getElementById('color-random-option') as HTMLInputElement,
  colorChooseOption: document.getElementById('color-choose-option') as HTMLInputElement,
  colorImageOption: document.getElementById('color-image-option') as HTMLInputElement,

  colorInputs: [
    document.getElementById('color-1') as HTMLInputElement,
    document.getElementById('color-2') as HTMLInputElement,
    document.getElementById('color-3') as HTMLInputElement,
  ],
};

// initialize PrettyDelaunay on the canvas
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
  const options = getOptions();
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
  const useMultiplier = elements.multiplierRadio.checked;
  const options = {
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

function getColors(): [string, string, string] {
  if (elements.colorChooseOption.checked) {
    // use the ones in the inputs
    return elements.colorInputs.map((input) => rgbToHsla(hexToRgbaArray(input.value))) as [string, string, string];
  } else {
    // generate random colors
    return elements.colorInputs.map((input) => {
      const rgb = Random.randomRgba().replace('rgba', 'rgb').replace(/,\s*\d(\.\d+)?\)/, ')');
      const hsla = rgbToHsla(rgb);
      const hex = '#' + rgbToHex(rgb);

      input.value = hex;
      const matchingInput = document.getElementById(input.getAttribute('data-color-sync')!) as HTMLInputElement;

      if (matchingInput) {
        matchingInput.value = input.value;
      }

      return hsla;
    }) as [string, string, string];
  }
}

function getImage() {
  if (!elements.colorImageOption.checked) {
    return '';
  }

  if (elements.imageBackgroundUploadOption.checked && elements.imageBackgroundUpload.files?.length) {
    const file = elements.imageBackgroundUpload.files[0];
    return window.URL.createObjectURL(file);
  } else if (elements.imageBackgroundURLOption.checked) {
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
  const button = event.target as HTMLElement;

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
    const options = getOptions();
    prettyDelaunay.renderNewGradient(
      options.minGradients,
      options.maxGradients
    );
  }

  if (button.hasAttribute('data-generate-triangles')) {
    const options = getOptions();
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
elements.sections.renderOptions.addEventListener('change', () => {
  const options = Object.keys(elements.renderOptions);
  for (let i = 0; i < options.length; i++) {
    const option = options[i];
    // @ts-ignore
    const element = elements.renderOptions[option];
    const toggleFunctionName = option.replace('show', 'toggle');
    // @ts-ignore
    if (prettyDelaunay[toggleFunctionName]) {
      // @ts-ignore
      prettyDelaunay[toggleFunctionName](element.checked);
    }
  }
});

elements.sections.colorInputs.addEventListener('change', (event) => {
  const input = event.target as HTMLInputElement;
  const matchingInput = document.getElementById(input.getAttribute('data-color-sync')!) as HTMLInputElement;

  if (!matchingInput) {
    return;
  }

  matchingInput.value = input.value;
});

// don't do anything on form submit
elements.form.addEventListener('submit', (event) => {
  event.preventDefault();
  return false;
});
