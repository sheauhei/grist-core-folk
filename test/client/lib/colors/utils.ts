/**
 * Tests for color utility functions
 */

import {
  clamp,
  darken,
  desaturate,
  getPerceivedBrightness,
  hexToHsl,
  hexToRgb,
  hslToRgb,
  isGrayscale,
  isLightColor,
  isValidHex,
  isVeryDark,
  isVeryLight,
  lerp,
  lighten,
  mapRange,
  normalizeHex,
  rgbToHex,
  rgbToHsl,
  sanitizeColor,
  saturate,
} from 'app/client/lib/colors/utils';
import { assert } from 'chai';

describe('colors/utils', function () {
  // ============================================================================
  // HEX ↔ RGB Conversion
  // ============================================================================

  describe('hexToRgb', function () {
    it('should convert 6-digit hex to RGB', function () {
      assert.deepEqual(hexToRgb('#FF0000'), { r: 255, g: 0, b: 0 });
      assert.deepEqual(hexToRgb('#00FF00'), { r: 0, g: 255, b: 0 });
      assert.deepEqual(hexToRgb('#0000FF'), { r: 0, g: 0, b: 255 });
      assert.deepEqual(hexToRgb('#FFFFFF'), { r: 255, g: 255, b: 255 });
      assert.deepEqual(hexToRgb('#000000'), { r: 0, g: 0, b: 0 });
    });

    it('should convert 3-digit hex to RGB', function () {
      assert.deepEqual(hexToRgb('#F00'), { r: 255, g: 0, b: 0 });
      assert.deepEqual(hexToRgb('#0F0'), { r: 0, g: 255, b: 0 });
      assert.deepEqual(hexToRgb('#00F'), { r: 0, g: 0, b: 255 });
      assert.deepEqual(hexToRgb('#FFF'), { r: 255, g: 255, b: 255 });
    });

    it('should handle lowercase hex', function () {
      assert.deepEqual(hexToRgb('#ff0000'), { r: 255, g: 0, b: 0 });
      assert.deepEqual(hexToRgb('#abc123'), { r: 171, g: 193, b: 35 });
    });

    it('should throw on invalid hex', function () {
      assert.throws(() => hexToRgb('FF0000')); // Missing #
      assert.throws(() => hexToRgb('#GG0000')); // Invalid character
      assert.throws(() => hexToRgb('#FF00')); // Invalid length
    });
  });

  describe('rgbToHex', function () {
    it('should convert RGB to hex', function () {
      assert.equal(rgbToHex({ r: 255, g: 0, b: 0 }), '#FF0000');
      assert.equal(rgbToHex({ r: 0, g: 255, b: 0 }), '#00FF00');
      assert.equal(rgbToHex({ r: 0, g: 0, b: 255 }), '#0000FF');
      assert.equal(rgbToHex({ r: 255, g: 255, b: 255 }), '#FFFFFF');
      assert.equal(rgbToHex({ r: 0, g: 0, b: 0 }), '#000000');
    });

    it('should clamp out-of-range values', function () {
      assert.equal(rgbToHex({ r: 300, g: 0, b: 0 }), '#FF0000');
      assert.equal(rgbToHex({ r: -10, g: 0, b: 0 }), '#000000');
      assert.equal(rgbToHex({ r: 128.7, g: 64.3, b: 32.9 }), '#804021');
    });
  });

  // ============================================================================
  // RGB ↔ HSL Conversion
  // ============================================================================

  describe('rgbToHsl', function () {
    it('should convert red', function () {
      const hsl = rgbToHsl({ r: 255, g: 0, b: 0 });
      assert.equal(hsl.h, 0);
      assert.approximately(hsl.s, 1.0, 0.01);
      assert.approximately(hsl.l, 0.5, 0.01);
    });

    it('should convert green', function () {
      const hsl = rgbToHsl({ r: 0, g: 255, b: 0 });
      assert.equal(hsl.h, 120);
      assert.approximately(hsl.s, 1.0, 0.01);
      assert.approximately(hsl.l, 0.5, 0.01);
    });

    it('should convert blue', function () {
      const hsl = rgbToHsl({ r: 0, g: 0, b: 255 });
      assert.equal(hsl.h, 240);
      assert.approximately(hsl.s, 1.0, 0.01);
      assert.approximately(hsl.l, 0.5, 0.01);
    });

    it('should convert white', function () {
      const hsl = rgbToHsl({ r: 255, g: 255, b: 255 });
      assert.equal(hsl.h, 0);
      assert.equal(hsl.s, 0);
      assert.equal(hsl.l, 1);
    });

    it('should convert black', function () {
      const hsl = rgbToHsl({ r: 0, g: 0, b: 0 });
      assert.equal(hsl.h, 0);
      assert.equal(hsl.s, 0);
      assert.equal(hsl.l, 0);
    });

    it('should convert gray', function () {
      const hsl = rgbToHsl({ r: 128, g: 128, b: 128 });
      assert.equal(hsl.h, 0);
      assert.approximately(hsl.s, 0, 0.01);
      assert.approximately(hsl.l, 0.502, 0.01);
    });
  });

  describe('hslToRgb', function () {
    it('should convert hue 0 (red)', function () {
      const rgb = hslToRgb({ h: 0, s: 1, l: 0.5 });
      assert.equal(rgb.r, 255);
      assert.equal(rgb.g, 0);
      assert.equal(rgb.b, 0);
    });

    it('should convert hue 120 (green)', function () {
      const rgb = hslToRgb({ h: 120, s: 1, l: 0.5 });
      assert.equal(rgb.r, 0);
      assert.equal(rgb.g, 255);
      assert.equal(rgb.b, 0);
    });

    it('should convert hue 240 (blue)', function () {
      const rgb = hslToRgb({ h: 240, s: 1, l: 0.5 });
      assert.equal(rgb.r, 0);
      assert.equal(rgb.g, 0);
      assert.equal(rgb.b, 255);
    });

    it('should handle zero saturation (gray)', function () {
      const rgb = hslToRgb({ h: 0, s: 0, l: 0.5 });
      assert.approximately(rgb.r, 128, 1);
      assert.approximately(rgb.g, 128, 1);
      assert.approximately(rgb.b, 128, 1);
    });
  });

  describe('RGB/HSL roundtrip', function () {
    it('should maintain color integrity through conversions', function () {
      const colors = [
        { r: 255, g: 0, b: 0 }, // Red
        { r: 0, g: 255, b: 0 }, // Green
        { r: 0, g: 0, b: 255 }, // Blue
        { r: 255, g: 255, b: 0 }, // Yellow
        { r: 255, g: 0, b: 255 }, // Magenta
        { r: 0, g: 255, b: 255 }, // Cyan
        { r: 128, g: 64, b: 192 }, // Purple
      ];

      colors.forEach((original) => {
        const hsl = rgbToHsl(original);
        const roundtrip = hslToRgb(hsl);
        assert.approximately(roundtrip.r, original.r, 1);
        assert.approximately(roundtrip.g, original.g, 1);
        assert.approximately(roundtrip.b, original.b, 1);
      });
    });
  });

  // ============================================================================
  // Validation
  // ============================================================================

  describe('isValidHex', function () {
    it('should accept valid 6-digit hex', function () {
      assert.isTrue(isValidHex('#FF0000'));
      assert.isTrue(isValidHex('#ABCDEF'));
      assert.isTrue(isValidHex('#123456'));
    });

    it('should accept valid 3-digit hex', function () {
      assert.isTrue(isValidHex('#F00'));
      assert.isTrue(isValidHex('#ABC'));
      assert.isTrue(isValidHex('#123'));
    });

    it('should accept lowercase', function () {
      assert.isTrue(isValidHex('#ff0000'));
      assert.isTrue(isValidHex('#abc'));
    });

    it('should reject invalid formats', function () {
      assert.isFalse(isValidHex('FF0000')); // Missing #
      assert.isFalse(isValidHex('#GG0000')); // Invalid character
      assert.isFalse(isValidHex('#FF00')); // Invalid length
      assert.isFalse(isValidHex('#FF00000')); // Too long
      assert.isFalse(isValidHex('')); // Empty
    });
  });

  describe('normalizeHex', function () {
    it('should add # prefix', function () {
      assert.equal(normalizeHex('FF0000'), '#FF0000');
    });

    it('should expand 3-digit to 6-digit', function () {
      assert.equal(normalizeHex('#F00'), '#FF0000');
      assert.equal(normalizeHex('#ABC'), '#AABBCC');
    });

    it('should convert to uppercase', function () {
      assert.equal(normalizeHex('#ff0000'), '#FF0000');
      assert.equal(normalizeHex('#abc'), '#AABBCC');
    });
  });

  describe('sanitizeColor', function () {
    it('should accept valid hex colors', function () {
      assert.equal(sanitizeColor('#FF0000'), '#FF0000');
      assert.equal(sanitizeColor('#F00'), '#FF0000');
    });

    it('should normalize valid colors', function () {
      assert.equal(sanitizeColor('ff0000'), '#FF0000');
      assert.equal(sanitizeColor('#f00'), '#FF0000');
    });

    it('should reject invalid formats', function () {
      assert.isNull(sanitizeColor('#GG0000'));
      assert.isNull(sanitizeColor('invalid'));
    });

    it('should reject potential CSS injection', function () {
      assert.isNull(sanitizeColor('#FF0000; background: url(evil)')); // Semicolon
      assert.isNull(sanitizeColor('#FF0000 expression(alert(1))')); // Expression
      assert.isNull(sanitizeColor('url(javascript:alert(1))')); // URL
    });
  });

  // ============================================================================
  // Analysis Functions
  // ============================================================================

  describe('isGrayscale', function () {
    it('should detect grayscale colors', function () {
      assert.isTrue(isGrayscale({ h: 0, s: 0, l: 0.5 }));
      assert.isTrue(isGrayscale({ h: 120, s: 0.05, l: 0.5 }));
    });

    it('should reject colorful colors', function () {
      assert.isFalse(isGrayscale({ h: 0, s: 0.8, l: 0.5 }));
      assert.isFalse(isGrayscale({ h: 240, s: 1.0, l: 0.5 }));
    });
  });

  describe('brightness detection', function () {
    it('should detect very light colors', function () {
      assert.isTrue(isVeryLight({ h: 0, s: 0, l: 0.95 }));
      assert.isFalse(isVeryLight({ h: 0, s: 0, l: 0.5 }));
    });

    it('should detect very dark colors', function () {
      assert.isTrue(isVeryDark({ h: 0, s: 0, l: 0.05 }));
      assert.isFalse(isVeryDark({ h: 0, s: 0, l: 0.5 }));
    });

    it('should calculate perceived brightness', function () {
      const white = getPerceivedBrightness({ r: 255, g: 255, b: 255 });
      const black = getPerceivedBrightness({ r: 0, g: 0, b: 0 });
      assert.equal(white, 255);
      assert.equal(black, 0);
      assert.isTrue(white > black);
    });

    it('should detect light vs dark colors', function () {
      assert.isTrue(isLightColor('#FFFFFF'));
      assert.isFalse(isLightColor('#000000'));
    });
  });

  // ============================================================================
  // Manipulation Functions
  // ============================================================================

  describe('lighten/darken', function () {
    it('should lighten colors', function () {
      const original = '#808080'; // Gray
      const lightened = lighten(original, 0.2);
      const originalL = hexToHsl(original).l;
      const lightenedL = hexToHsl(lightened).l;
      assert.isTrue(lightenedL > originalL);
    });

    it('should darken colors', function () {
      const original = '#808080'; // Gray
      const darkened = darken(original, 0.2);
      const originalL = hexToHsl(original).l;
      const darkenedL = hexToHsl(darkened).l;
      assert.isTrue(darkenedL < originalL);
    });

    it('should not exceed bounds', function () {
      const veryLight = lighten('#FFFFFF', 0.5);
      assert.equal(hexToHsl(veryLight).l, 1.0);

      const veryDark = darken('#000000', 0.5);
      assert.equal(hexToHsl(veryDark).l, 0.0);
    });
  });

  describe('saturate/desaturate', function () {
    it('should saturate colors', function () {
      const original = '#808080'; // Gray
      const saturated = saturate(original, 0.5);
      const originalS = hexToHsl(original).s;
      const saturatedS = hexToHsl(saturated).s;
      assert.isTrue(saturatedS > originalS);
    });

    it('should desaturate colors', function () {
      const original = '#FF0000'; // Bright red
      const desaturated = desaturate(original, 0.5);
      const originalS = hexToHsl(original).s;
      const desaturatedS = hexToHsl(desaturated).s;
      assert.isTrue(desaturatedS < originalS);
    });
  });

  // ============================================================================
  // Utility Functions
  // ============================================================================

  describe('clamp', function () {
    it('should clamp values within range', function () {
      assert.equal(clamp(5, 0, 10), 5);
      assert.equal(clamp(-5, 0, 10), 0);
      assert.equal(clamp(15, 0, 10), 10);
    });
  });

  describe('lerp', function () {
    it('should interpolate between values', function () {
      assert.equal(lerp(0, 10, 0), 0);
      assert.equal(lerp(0, 10, 1), 10);
      assert.equal(lerp(0, 10, 0.5), 5);
    });
  });

  describe('mapRange', function () {
    it('should map values between ranges', function () {
      assert.equal(mapRange(0.5, 0, 1, 0, 100), 50);
      assert.equal(mapRange(5, 0, 10, 0, 100), 50);
      assert.equal(mapRange(0.25, 0, 1, 0, 100), 25);
    });

    it('should clamp out-of-range inputs', function () {
      assert.equal(mapRange(-1, 0, 10, 0, 100), 0);
      assert.equal(mapRange(15, 0, 10, 0, 100), 100);
    });
  });

  // ============================================================================
  // Integration Tests
  // ============================================================================

  describe('hex conversion roundtrip', function () {
    it('should maintain color through full conversion cycle', function () {
      const testColors = ['#FF0000', '#00FF00', '#0000FF', '#FFFFFF', '#000000', '#808080', '#ABC123'];

      testColors.forEach((original) => {
        const rgb = hexToRgb(original);
        const hsl = rgbToHsl(rgb);
        const rgb2 = hslToRgb(hsl);
        const hex = rgbToHex(rgb2);

        // Should be identical or very close
        const originalRgb = hexToRgb(original);
        const finalRgb = hexToRgb(hex);

        assert.approximately(finalRgb.r, originalRgb.r, 2);
        assert.approximately(finalRgb.g, originalRgb.g, 2);
        assert.approximately(finalRgb.b, originalRgb.b, 2);
      });
    });
  });
});
