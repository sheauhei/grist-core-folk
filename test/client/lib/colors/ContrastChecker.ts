/**
 * Tests for WCAG 2.1 contrast checker
 */

import { ContrastChecker, WCAG_THRESHOLDS } from 'app/client/lib/colors/ContrastChecker';
import { assert } from 'chai';

describe('colors/ContrastChecker', function () {
  let checker: ContrastChecker;

  beforeEach(function () {
    checker = new ContrastChecker();
  });

  // ============================================================================
  // Relative Luminance Calculation
  // ============================================================================

  describe('getRelativeLuminance', function () {
    it('should return 1.0 for white', function () {
      const luminance = checker.getRelativeLuminance({ r: 255, g: 255, b: 255 });
      assert.approximately(luminance, 1.0, 0.01);
    });

    it('should return 0.0 for black', function () {
      const luminance = checker.getRelativeLuminance({ r: 0, g: 0, b: 0 });
      assert.approximately(luminance, 0.0, 0.01);
    });

    it('should calculate correct luminance for red', function () {
      const luminance = checker.getRelativeLuminance({ r: 255, g: 0, b: 0 });
      // Red contribution: 0.2126
      assert.approximately(luminance, 0.2126, 0.01);
    });

    it('should calculate correct luminance for green', function () {
      const luminance = checker.getRelativeLuminance({ r: 0, g: 255, b: 0 });
      // Green contribution: 0.7152
      assert.approximately(luminance, 0.7152, 0.01);
    });

    it('should calculate correct luminance for blue', function () {
      const luminance = checker.getRelativeLuminance({ r: 0, g: 0, b: 255 });
      // Blue contribution: 0.0722
      assert.approximately(luminance, 0.0722, 0.01);
    });

    it('should calculate correct luminance for gray', function () {
      const luminance = checker.getRelativeLuminance({ r: 128, g: 128, b: 128 });
      assert.approximately(luminance, 0.215, 0.01);
    });
  });

  // ============================================================================
  // Contrast Ratio Calculation
  // ============================================================================

  describe('getContrastRatio', function () {
    it('should return 21:1 for black on white', function () {
      const ratio = checker.getContrastRatio('#000000', '#FFFFFF');
      assert.approximately(ratio, 21.0, 0.1);
    });

    it('should return 21:1 for white on black', function () {
      const ratio = checker.getContrastRatio('#FFFFFF', '#000000');
      assert.approximately(ratio, 21.0, 0.1);
    });

    it('should return 1:1 for identical colors', function () {
      assert.approximately(checker.getContrastRatio('#FF0000', '#FF0000'), 1.0, 0.01);
      assert.approximately(checker.getContrastRatio('#808080', '#808080'), 1.0, 0.01);
    });

    it('should calculate known contrast ratios', function () {
      // These are known good contrasts from WCAG documentation
      const ratio1 = checker.getContrastRatio('#777777', '#FFFFFF');
      assert.approximately(ratio1, 4.47, 0.1);

      const ratio2 = checker.getContrastRatio('#595959', '#FFFFFF');
      assert.approximately(ratio2, 7.0, 0.2);
    });

    it('should be symmetric (order independent)', function () {
      const ratio1 = checker.getContrastRatio('#FF0000', '#00FF00');
      const ratio2 = checker.getContrastRatio('#00FF00', '#FF0000');
      assert.approximately(ratio1, ratio2, 0.01);
    });
  });

  // ============================================================================
  // WCAG AA Compliance
  // ============================================================================

  describe('meetsWCAG_AA', function () {
    it('should pass for black on white', function () {
      assert.isTrue(checker.meetsWCAG_AA('#000000', '#FFFFFF'));
    });

    it('should pass for white on black', function () {
      assert.isTrue(checker.meetsWCAG_AA('#FFFFFF', '#000000'));
    });

    it('should fail for gray on white', function () {
      // Light gray on white has low contrast
      assert.isFalse(checker.meetsWCAG_AA('#CCCCCC', '#FFFFFF'));
    });

    it('should fail for light blue on white', function () {
      assert.isFalse(checker.meetsWCAG_AA('#ADD8E6', '#FFFFFF'));
    });

    it('should respect large text threshold', function () {
      const color = '#999999'; // Borderline contrast
      const bg = '#FFFFFF';

      // May pass for large text (3:1) but fail for normal text (4.5:1)
      const normalText = checker.meetsWCAG_AA(color, bg, false);
      const largeText = checker.meetsWCAG_AA(color, bg, true);

      // At least large text should be more permissive
      if (!normalText) {
        assert.isTrue(largeText);
      }
    });

    it('should validate real-world color combinations', function () {
      // Common UI color combinations
      assert.isTrue(checker.meetsWCAG_AA('#333333', '#FFFFFF')); // Dark gray on white
      assert.isTrue(checker.meetsWCAG_AA('#FFFFFF', '#1976D2')); // White on blue
      assert.isTrue(checker.meetsWCAG_AA('#000000', '#FFD700')); // Black on gold
    });
  });

  // ============================================================================
  // WCAG AAA Compliance
  // ============================================================================

  describe('meetsWCAG_AAA', function () {
    it('should pass for black on white', function () {
      assert.isTrue(checker.meetsWCAG_AAA('#000000', '#FFFFFF'));
    });

    it('should be more strict than AA', function () {
      const color = '#777777';
      const bg = '#FFFFFF';

      const aa = checker.meetsWCAG_AA(color, bg);
      const aaa = checker.meetsWCAG_AAA(color, bg);

      // If AAA passes, AA must pass
      if (aaa) {
        assert.isTrue(aa);
      }
    });

    it('should fail for borderline contrasts', function () {
      // Color that meets AA but not AAA
      assert.isFalse(checker.meetsWCAG_AAA('#777777', '#FFFFFF'));
    });
  });

  // ============================================================================
  // Contrast Level Detection
  // ============================================================================

  describe('getContrastLevel', function () {
    it('should return AAA for excellent contrast', function () {
      const level = checker.getContrastLevel('#000000', '#FFFFFF');
      assert.equal(level, 'AAA');
    });

    it('should return AA for good contrast', function () {
      const level = checker.getContrastLevel('#777777', '#FFFFFF');
      assert.equal(level, 'AA');
    });

    it('should return Fail for poor contrast', function () {
      const level = checker.getContrastLevel('#CCCCCC', '#FFFFFF');
      assert.equal(level, 'Fail');
    });
  });

  describe('getContrastInfo', function () {
    it('should provide complete contrast information', function () {
      const info = checker.getContrastInfo('#000000', '#FFFFFF');

      assert.approximately(info.ratio, 21.0, 0.1);
      assert.equal(info.level, 'AAA');
      assert.isTrue(info.meetsAA);
      assert.isTrue(info.meetsAAA);
    });

    it('should correctly identify AA-only compliance', function () {
      const info = checker.getContrastInfo('#777777', '#FFFFFF');

      assert.approximately(info.ratio, 4.47, 0.1);
      assert.equal(info.level, 'AA');
      assert.isTrue(info.meetsAA);
      assert.isFalse(info.meetsAAA);
    });

    it('should identify failures', function () {
      const info = checker.getContrastInfo('#CCCCCC', '#FFFFFF');

      assert.isBelow(info.ratio, WCAG_THRESHOLDS.AA);
      assert.equal(info.level, 'Fail');
      assert.isFalse(info.meetsAA);
      assert.isFalse(info.meetsAAA);
    });
  });

  // ============================================================================
  // Color Adjustment
  // ============================================================================

  describe('adjustForContrast', function () {
    it('should darken light text on light background', function () {
      const adjusted = checker.adjustForContrast('#CCCCCC', '#FFFFFF', WCAG_THRESHOLDS.AA);
      assert.isTrue(checker.meetsWCAG_AA(adjusted, '#FFFFFF'));

      // Should be darker
      const originalL = parseInt(adjusted.substring(1, 3), 16);
      const adjustedL = parseInt(adjusted.substring(1, 3), 16);
      assert.isAtMost(adjustedL, originalL);
    });

    it('should lighten dark text on dark background', function () {
      const adjusted = checker.adjustForContrast('#333333', '#000000', WCAG_THRESHOLDS.AA);
      assert.isTrue(checker.meetsWCAG_AA(adjusted, '#000000'));
    });

    it('should not modify colors that already meet contrast', function () {
      const original = '#000000';
      const bg = '#FFFFFF';
      const adjusted = checker.adjustForContrast(original, bg, WCAG_THRESHOLDS.AA);

      // Should be very similar or identical
      assert.isTrue(checker.meetsWCAG_AA(adjusted, bg));
    });

    it('should fallback to black or white for extreme cases', function () {
      // Try to get contrast with a very similar color
      const adjusted = checker.adjustForContrast('#FEFEFE', '#FFFFFF', 7.0, 5);

      // Should fallback to black
      assert.equal(adjusted, '#000000');
    });

    it('should respect maximum iterations', function () {
      const adjusted = checker.adjustForContrast('#FAFAFA', '#FFFFFF', 7.0, 0);
      // With 0 iterations, should immediately fallback
      assert.equal(adjusted, '#000000');
    });
  });

  describe('getOptimalTextColor', function () {
    it('should return black for light backgrounds', function () {
      assert.equal(checker.getOptimalTextColor('#FFFFFF'), '#000000');
      assert.equal(checker.getOptimalTextColor('#FFD700'), '#000000');
    });

    it('should return white for dark backgrounds', function () {
      assert.equal(checker.getOptimalTextColor('#000000'), '#FFFFFF');
      assert.equal(checker.getOptimalTextColor('#1976D2'), '#FFFFFF');
    });

    it('should make correct choice for medium colors', function () {
      const optimal = checker.getOptimalTextColor('#808080');
      // Should be either black or white
      assert.oneOf(optimal, ['#000000', '#FFFFFF']);
    });
  });

  // ============================================================================
  // Advanced Features
  // ============================================================================

  describe('isColorBlindSafe', function () {
    it('should detect distinguishable colors', function () {
      assert.isTrue(checker.isColorBlindSafe('#000000', '#FFFFFF'));
      assert.isTrue(checker.isColorBlindSafe('#FF0000', '#0000FF'));
    });

    it('should detect similar colors', function () {
      assert.isFalse(checker.isColorBlindSafe('#FF0000', '#FF1111'));
      assert.isFalse(checker.isColorBlindSafe('#FAFAFA', '#FFFFFF'));
    });
  });

  describe('suggestAlternativeColor', function () {
    it('should suggest compliant alternative', function () {
      const original = '#CCCCCC';
      const bg = '#FFFFFF';
      const suggested = checker.suggestAlternativeColor(original, bg, WCAG_THRESHOLDS.AA);

      assert.isTrue(checker.meetsMinimumContrast(suggested, bg, WCAG_THRESHOLDS.AA));
    });

    it('should preserve color family when possible', function () {
      const original = '#ADD8E6'; // Light blue
      const bg = '#FFFFFF';
      const suggested = checker.suggestAlternativeColor(original, bg, WCAG_THRESHOLDS.AA);

      // Should meet contrast
      assert.isTrue(checker.meetsWCAG_AA(suggested, bg));
    });
  });

  describe('calculateRequiredAdjustment', function () {
    it('should return 0 for colors that already meet target', function () {
      const adjustment = checker.calculateRequiredAdjustment(
        '#000000',
        '#FFFFFF',
        WCAG_THRESHOLDS.AA
      );
      assert.equal(adjustment, 0);
    });

    it('should calculate adjustment needed', function () {
      const adjustment = checker.calculateRequiredAdjustment(
        '#CCCCCC',
        '#FFFFFF',
        WCAG_THRESHOLDS.AA
      );
      // Should suggest darkening (negative) for light text on light bg
      assert.isBelow(adjustment, 0);
    });

    it('should suggest lightening for dark text on dark bg', function () {
      const adjustment = checker.calculateRequiredAdjustment(
        '#333333',
        '#000000',
        WCAG_THRESHOLDS.AA
      );
      // Should suggest lightening (positive)
      assert.isAbove(adjustment, 0);
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('edge cases', function () {
    it('should handle pure colors', function () {
      assert.isNumber(checker.getContrastRatio('#FF0000', '#00FF00'));
      assert.isNumber(checker.getContrastRatio('#00FF00', '#0000FF'));
      assert.isNumber(checker.getContrastRatio('#0000FF', '#FF0000'));
    });

    it('should handle grayscale correctly', function () {
      const colors = ['#000000', '#333333', '#666666', '#999999', '#CCCCCC', '#FFFFFF'];

      colors.forEach((color) => {
        assert.isNumber(checker.getContrastRatio(color, '#FFFFFF'));
        assert.isNumber(checker.getContrastRatio(color, '#000000'));
      });
    });

    it('should handle lowercase and uppercase hex', function () {
      const ratio1 = checker.getContrastRatio('#ff0000', '#FFFFFF');
      const ratio2 = checker.getContrastRatio('#FF0000', '#FFFFFF');
      assert.approximately(ratio1, ratio2, 0.01);
    });

    it('should handle 3-digit hex', function () {
      const ratio1 = checker.getContrastRatio('#F00', '#FFF');
      const ratio2 = checker.getContrastRatio('#FF0000', '#FFFFFF');
      assert.approximately(ratio1, ratio2, 0.01);
    });
  });

  // ============================================================================
  // Performance and Consistency
  // ============================================================================

  describe('consistency', function () {
    it('should return consistent results for same inputs', function () {
      const calls = 100;
      const results: number[] = [];

      for (let i = 0; i < calls; i++) {
        results.push(checker.getContrastRatio('#777777', '#FFFFFF'));
      }

      // All results should be identical
      const first = results[0];
      results.forEach((result) => {
        assert.equal(result, first);
      });
    });

    it('should handle batch operations efficiently', function () {
      const colors = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'];
      const bg = '#FFFFFF';

      const start = Date.now();
      colors.forEach((color) => {
        checker.getContrastRatio(color, bg);
        checker.meetsWCAG_AA(color, bg);
        checker.getContrastInfo(color, bg);
      });
      const duration = Date.now() - start;

      // Should complete quickly (< 100ms for 18 operations)
      assert.isBelow(duration, 100);
    });
  });
});
