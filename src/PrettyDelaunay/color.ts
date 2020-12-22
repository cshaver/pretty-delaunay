/**
 * @example "#FFABCD" -> "rgba(255,171,205,1)"
 */
export function hexToRgba(hex: string): string {
  hex = hex.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  return 'rgba(' + r + ',' + g + ',' + b + ',1)';
}

/**
 * @example "#FFABCD" -> [255,171,205]
 */
export function hexToRgbaArray(hex: string): [number, number, number] {
  hex = hex.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  if (isNaN(r) || isNaN(g) || isNaN(b)) {
    return [0, 0, 0];
  }

  return [r, g, b];
}

/**
 * Converts an RGB color value to HSL. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
 * Assumes r, g, and b are contained in the set [0, 255] and
 * returns h, s, and l in the set [0, 1].
 * @example "rgb(255,171,205)" -> "hsla(336,100%,84%,1)"
 */
export function rgbToHsla (_rgb: string | [number, number, number]): string {
  const rgb: [number, number, number] = Array.isArray(_rgb) ? _rgb :
    _rgb.replace('rgb(', '').replace(')', '').split(',').map(str => parseInt(str)) as [number, number, number];
  const r = rgb[0] / 255;
  const g = rgb[1] / 255;
  const b = rgb[2] / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max === min) {
    h = s = 0; // achromatic
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max){
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return 'hsla(' + Math.round(h * 360) + ',' + Math.round(s * 100) + '%,' + Math.round(l * 100) + '%,1)';
}

/**
 * @example "hsla(336,100%,84%,1)", 0.5 -> "hsla(336,100%,84%,0.5)"
 */
export function hslaAdjustAlpha(_color: string, alpha: number | string | ((alpha: number) => number | string)): string {
  const color = _color.split(',') as [string, string, string, string];

  if (typeof alpha !== 'function') {
    color[3] = `${alpha}`;
  } else {
    color[3] = `${alpha(parseInt(color[3]))}`;
  }

  color[3] += ')';
  return color.join(',');
}

/**
 * @example "hsla(336,100%,84%,1)", 50 -> "hsla(336,100%,50%,1)"
 */
export function hslaAdjustLightness(_color: string, lightness: number | string | ((lightness: number) => number | string)): string {
  const color = _color.split(',') as [string, string, string, string];

  if (typeof lightness !== 'function') {
    color[2] = `${lightness}`;
  } else {
    color[2] = `${lightness(parseInt(color[2]))}`;
  }

  color[2] += '%';
  return color.join(',');
}

/**
 * @example "rgb(255,171,205)" -> "#FFABCD"
 */
export function rgbToHex (_rgb: string | [string, string, string]): string {
  const rgb = typeof _rgb === 'string' ?
    (_rgb.replace('rgb(', '').replace(')', '').split(',') as [string, string, string])
    : _rgb;

  return rgb.map(function (x) {
    x = parseInt(x).toString(16);
    return (x.length === 1) ? '0' + x : x;
  }).join('');
}
