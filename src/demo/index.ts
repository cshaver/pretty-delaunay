/* eslint-disable @typescript-eslint/ban-ts-comment */
import PrettyDelaunay from '../PrettyDelaunay/index';
import Color from '../PrettyDelaunay/color';
import Random from '../PrettyDelaunay/random';

import elements from './elements';

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
    return elements.colorInputs.map((input) => Color.rgbToHsla(Color.hexToRgbaArray(input.value))) as [string, string, string];
  } else {
    // generate random colors
    return elements.colorInputs.map((input) => {
      const rgb = Random.randomRgba().replace('rgba', 'rgb').replace(/,\s*\d(\.\d+)?\)/, ')');
      const hsla = Color.rgbToHsla(rgb);
      const hex = '#' + Color.rgbToHex(rgb);

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
