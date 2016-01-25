var Color;

(function() {
  'use strict';
  // color helper functions
  Color = {

    hexToRgba: function(hex) {
      hex = hex.replace('#','');
      var r = parseInt(hex.substring(0,2), 16);
      var g = parseInt(hex.substring(2,4), 16);
      var b = parseInt(hex.substring(4,6), 16);

      return 'rgba(' + r + ',' + g + ',' + b + ',1)';
    },

    hexToRgbaArray: function(hex) {
      hex = hex.replace('#','');
      var r = parseInt(hex.substring(0,2), 16);
      var g = parseInt(hex.substring(2,4), 16);
      var b = parseInt(hex.substring(4,6), 16);

      return [r, g, b];
    },

    /**
     * Converts an RGB color value to HSL. Conversion formula
     * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
     * Assumes r, g, and b are contained in the set [0, 255] and
     * returns h, s, and l in the set [0, 1].
     *
     * @param   Number  r       The red color value
     * @param   Number  g       The green color value
     * @param   Number  b       The blue color value
     * @return  Array           The HSL representation
     */
    rgbToHsla: function(rgb) {
      var r = rgb[0] / 255;
      var g = rgb[1] / 255;
      var b = rgb[2] / 255;
      var max = Math.max(r, g, b);
      var min = Math.min(r, g, b);
      var h;
      var s;
      var l = (max + min) / 2;

      if (max === min) {
        h = s = 0; // achromatic
      } else {
        var d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max){
          case r: h = (g - b) / d + (g < b ? 6 : 0); break;
          case g: h = (b - r) / d + 2; break;
          case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
      }

      return 'hsla(' + Math.round(h * 360) + ',' + Math.round(s * 100) + '%,' + Math.round(l * 100) + '%,1)';
    },

    /**
     * hsl, hsla to hex
     * hsla(0, 100%, 100%, 0) => #000000
     */
    hslToHex: function(hsl) {
      // var h = hsl[0]
      hsl = hsl.split(',');

      var h = parseInt(hsl[0].replace('hsla(', '').replace('hsl(', '')) / 360;
      var s = parseInt(hsl[1].trim('')) / 100;
      var l = parseInt(hsl[2].trim('')) / 100;

      var r;
      var g;
      var b;

      if (s === 0) {
        r = g = b = l; // achromatic
      } else {
        var hueToRgb = function HueToRgb(m1, m2, hue) {
          var v;
          if (hue < 0) {
            hue += 1;
          } else if (hue > 1) {
            hue -= 1;
          }

          if (6 * hue < 1) {
            v = m1 + (m2 - m1) * hue * 6;
          } else if (2 * hue < 1) {
            v = m2;
          } else if (3 * hue < 2) {
            v = m1 + (m2 - m1) * (2 / 3 - hue) * 6;
          } else {
            v = m1;
          }

          return Math.round(255 * v);
        };

        var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        var p = 2 * l - q;
        r = hueToRgb(p, q, h + 1 / 3);
        g = hueToRgb(p, q, h);
        b = hueToRgb(p, q, h - 1 / 3);
      }

      var rgb = [r, g, b];
      rgb = rgb.map(function(x) {
        x = parseInt(x).toString(16);
        return (x.length === 1) ? '0' + x : x;
      });
      return rgb.join('');
    },

    hslaAdjustAlpha: function(color, alpha) {
      color = color.split(',');

      if (typeof alpha !== 'function') {
        color[3] = alpha;
      } else {
        color[3] = alpha(parseInt(color[3]));
      }

      color[3] += ')';
      return color.join(',');
    },

    hslaAdjustLightness: function(color, lightness) {
      color = color.split(',');

      if (typeof lightness !== 'function') {
        color[2] = lightness;
      } else {
        color[2] = lightness(parseInt(color[2]));
      }

      color[2] += '%';
      return color.join(',');
    },

    rgbToHex: function(rgb) {
      if (typeof rgb === 'string') {
        rgb = rgb.replace('rgb(', '').replace(')', '').split(',');
      }
      rgb = rgb.map(function(x) {
        x = parseInt(x).toString(16);
        return (x.length === 1) ? '0' + x : x;
      });
      return rgb.join('');
    },

  };

  if (typeof module !== 'undefined') {
    module.exports = Color;
  }

})();
