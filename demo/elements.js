// grab DOM elements
export default {
  main: document.getElementById('main'),
  form: document.getElementById('form'),
  canvas: document.getElementById('canvas'),
  sections: {
    generateButtons: document.getElementById('generate-buttons'),
    renderOptions: document.getElementById('render-options'),
    pointOptions: document.getElementById('point-options'),
    backgroundOptions: document.getElementById('background-options'),
    colorInputs: document.getElementById('color-inputs')
  },
  renderOptions: {
    showTriangles: document.getElementById('show-triangles'),
    showPoints: document.getElementById('show-points'),
    showCircles: document.getElementById('show-circles'),
    showCentroids: document.getElementById('show-centroids'),
    showEdges: document.getElementById('show-edges'),
    showHover: document.getElementById('show-hover'),
    showAnimation: document.getElementById('show-animation'),
  },

  multiplierRadio: document.getElementById('point-gen-option-multiplier'),
  multiplierInput: document.getElementById('points-multiplier'),

  minPointsInput: document.getElementById('min-points'),
  maxPointsInput: document.getElementById('max-points'),

  minEdgesInput: document.getElementById('min-edge-points'),
  maxEdgesInput: document.getElementById('max-edge-points'),

  minGradientsInput: document.getElementById('min-gradients'),
  maxGradientsInput: document.getElementById('max-gradients'),

  imageBackgroundUploadOption: document.getElementById('image-background-upload-option'),
  imageBackgroundUpload: document.getElementById('image-background-upload'),
  imageBackgroundURLOption: document.getElementById('image-background-url-option'),
  imageBackgroundURL: document.getElementById('image-background-url'),

  colorRandomOption: document.getElementById('color-random-option'),
  colorChooseOption: document.getElementById('color-choose-option'),
  colorImageOption: document.getElementById('color-image-option'),

  colorInputs: [
    document.getElementById('color-1'),
    document.getElementById('color-2'),
    document.getElementById('color-3')
  ]
};
