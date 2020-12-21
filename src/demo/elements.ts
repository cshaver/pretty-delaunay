// grab DOM elements
export default {
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
} as const;
