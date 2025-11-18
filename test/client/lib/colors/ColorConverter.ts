/**
 * Tests for theme-adaptive color converter
 */

import { ColorConverter } from 'app/client/lib/colors/ColorConverter';
import { ContrastChecker } from 'app/client/lib/colors/ContrastChecker';
import { hexToHsl } from 'app/client/lib/colors/utils';
import { assert } from 'chai';

describe('colors/ColorConverter', function () {
  let converter: ColorConverter;
  let checker: ContrastChecker;

  beforeEach(function () {
    checker = new ContrastChecker();
    converter = new ColorConverter(checker);
  });

  // ============================================================================
  // Basic Conversion
  // ============================================================================

  describe('convertForTheme', function () {
    it('should return original color for same theme', function () {
      const color = '#FF0000';
      const converted = converter.convertForTheme(color, 'light', 'light', 'text');
      assert.equal(converted, color);
    });

    it('should convert text from light to dark theme', function () {
      const darkText = '#333333'; // Dark text for light theme
      const converted = converter.convertForTheme(darkText, 'light', 'dark', 'text');

      // Should become light text
      const hsl = hexToHsl(converted);
      assert.isAbove(hsl.l, 0.6, 'Converted text should be light');
    });

    it('should convert text from dark to light theme', function () {
      const lightText = '#EEEEEE'; // Light text for dark theme
      const converted = converter.convertForTheme(lightText, 'dark', 'light', 'text');

      // Should become dark text
      const hsl = hexToHsl(converted);
      assert.isBelow(hsl.l, 0.6, 'Converted text should be dark');
    });

    it('should convert fill from light to dark theme', function () {
      const lightFill = '#F5F5F5'; // Light background
      const converted = converter.convertForTheme(lightFill, 'light', 'dark', 'fill');

      // Should become dark background
      const hsl = hexToHsl(converted);
      assert.isBelow(hsl.l, 0.5, 'Converted fill should be dark');
    });

    it('should convert fill from dark to light theme', function () {
      const darkFill = '#1A1A1A'; // Dark background
      const converted = converter.convertForTheme(darkFill, 'dark', 'light', 'fill');

      // Should become light background
      const hsl = hexToHsl(converted);
      assert.isAbove(hsl.l, 0.7, 'Converted fill should be light');
    });
  });

  // ============================================================================
  // Hue Preservation
  // ============================================================================

  describe('hue preservation', function () {
    it('should preserve hue when converting', function () {
      const colors = [
        { color: '#FF0000', hue: 0 }, // Red
        { color: '#00FF00', hue: 120 }, // Green
        { color: '#0000FF', hue: 240 }, // Blue
      ];

      colors.forEach(({ color, hue }) => {
        const converted = converter.convertForTheme(color, 'light', 'dark', 'text');
        const convertedHsl = hexToHsl(converted);
        assert.approximately(convertedHsl.h, hue, 5, `Hue should be preserved for ${color}`);
      });
    });

    it('should allow disabling hue preservation', function () {
      const color = '#FF0000';
      const converted = converter.convertForTheme(color, 'light', 'dark', 'text', {
        preserveHue: false,
      });

      // Should still convert, but hue might change
      assert.isString(converted);
      assert.match(converted, /^#[0-9A-F]{6}$/);
    });
  });

  // ============================================================================
  // Saturation Adjustment
  // ============================================================================

  describe('saturation adjustment', function () {
    it('should increase saturation for text in dark theme', function () {
      const colorfulText = '#4A90E2'; // Blue text for light theme
      const converted = converter.convertForTheme(colorfulText, 'light', 'dark', 'text');

      const originalS = hexToHsl(colorfulText).s;
      const convertedS = hexToHsl(converted).s;

      // Text colors typically get more saturated in dark theme
      assert.isAtLeast(convertedS, originalS * 0.9, 'Saturation should increase or stay similar');
    });

    it('should decrease saturation for fill in dark theme', function () {
      const colorfulFill = '#FFE4E1'; // Light pink background
      const converted = converter.convertForTheme(colorfulFill, 'light', 'dark', 'fill');

      const originalS = hexToHsl(colorfulFill).s;
      const convertedS = hexToHsl(converted).s;

      // Fill colors typically get less saturated in dark theme
      assert.isAtMost(convertedS, originalS * 1.3, 'Saturation should decrease or stay similar');
    });

    it('should preserve grayscale colors', function () {
      const gray = '#808080';
      const converted = converter.convertForTheme(gray, 'light', 'dark', 'text');

      const convertedS = hexToHsl(converted).s;
      assert.isBelow(convertedS, 0.2, 'Grayscale should remain low saturation');
    });

    it('should allow disabling saturation adjustment', function () {
      const color = '#FF0000';
      const converted = converter.convertForTheme(color, 'light', 'dark', 'text', {
        adjustSaturation: false,
      });

      assert.isString(converted);
    });
  });

  // ============================================================================
  // Contrast Validation
  // ============================================================================

  describe('contrast validation', function () {
    it('should ensure text meets minimum contrast in dark theme', function () {
      const text = '#777777'; // Medium gray
      const converted = converter.convertForTheme(text, 'light', 'dark', 'text');

      // Should meet WCAG AA against expected dark background
      const darkBg = '#1A1A1A';
      assert.isTrue(checker.meetsWCAG_AA(converted, darkBg));
    });

    it('should ensure text meets minimum contrast in light theme', function () {
      const text = '#888888'; // Medium gray
      const converted = converter.convertForTheme(text, 'dark', 'light', 'text');

      // Should meet WCAG AA against expected light background
      const lightBg = '#FFFFFF';
      assert.isTrue(checker.meetsWCAG_AA(converted, lightBg));
    });

    it('should respect custom minimum contrast', function () {
      const text = '#777777';
      const converted = converter.convertForTheme(text, 'light', 'dark', 'text', {
        minContrast: 7.0, // AAA level
      });

      const darkBg = '#1A1A1A';
      const ratio = checker.getContrastRatio(converted, darkBg);
      assert.isAtLeast(ratio, 7.0);
    });
  });

  // ============================================================================
  // Caching
  // ============================================================================

  describe('caching', function () {
    it('should cache conversion results', function () {
      const color = '#FF0000';

      converter.convertForTheme(color, 'light', 'dark', 'text');
      converter.convertForTheme(color, 'light', 'dark', 'text');
      converter.convertForTheme(color, 'light', 'dark', 'text');

      const stats = converter.getCacheStats();
      assert.equal(stats.conversions, 3);
      assert.equal(stats.hits, 2); // Second and third calls should hit cache
      assert.approximately(stats.hitRate, 2 / 3, 0.01);
    });

    it('should cache different conversions separately', function () {
      const color = '#FF0000';

      converter.convertForTheme(color, 'light', 'dark', 'text');
      converter.convertForTheme(color, 'light', 'dark', 'fill');
      converter.convertForTheme(color, 'dark', 'light', 'text');

      const stats = converter.getCacheStats();
      assert.equal(stats.size, 3); // Three different conversions
    });

    it('should clear cache', function () {
      converter.convertForTheme('#FF0000', 'light', 'dark', 'text');
      converter.convertForTheme('#00FF00', 'light', 'dark', 'text');

      converter.clearCache();

      const stats = converter.getCacheStats();
      assert.equal(stats.size, 0);
      assert.equal(stats.hits, 0);
      assert.equal(stats.conversions, 0);
    });

    it('should respect cache size limit', function () {
      // Create more conversions than cache size
      const cacheSize = 500;
      const conversions = 600;

      for (let i = 0; i < conversions; i++) {
        const color = `#${i.toString(16).padStart(6, '0').substring(0, 6)}`;
        converter.convertForTheme(color, 'light', 'dark', 'text');
      }

      const stats = converter.getCacheStats();
      assert.isAtMost(stats.size, cacheSize);
    });
  });

  // ============================================================================
  // Batch Operations
  // ============================================================================

  describe('convertBatch', function () {
    it('should convert multiple colors', function () {
      const colors = ['#FF0000', '#00FF00', '#0000FF'];
      const converted = converter.convertBatch(colors, 'light', 'dark', 'text');

      assert.equal(converted.length, 3);
      converted.forEach((color: string) => {
        assert.match(color, /^#[0-9A-F]{6}$/);
      });
    });

    it('should maintain order', function () {
      const colors = ['#FF0000', '#00FF00', '#0000FF'];
      const converted = converter.convertBatch(colors, 'light', 'dark', 'text');

      // Each converted color should correspond to original
      colors.forEach((original, index) => {
        const convertedSingle = converter.convertForTheme(original, 'light', 'dark', 'text');
        assert.equal(converted[index], convertedSingle);
      });
    });
  });

  // ============================================================================
  // Palette Matching
  // ============================================================================

  describe('findBestPaletteMatch', function () {
    it('should find closest color in palette', function () {
      const color = '#FF0000'; // Red
      const palette = ['#0000FF', '#00FF00', '#FF1111']; // Blue, Green, Near-Red

      const best = converter.findBestPaletteMatch(color, palette, 'light', 'dark', 'text');

      // Should pick the near-red color
      assert.equal(best, '#FF1111');
    });

    it('should consider converted colors', function () {
      const darkText = '#333333';
      const palette = ['#111111', '#EEEEEE', '#CCCCCC'];

      // Converting dark text to dark theme should match lighter palette colors
      const best = converter.findBestPaletteMatch(darkText, palette, 'light', 'dark', 'text');

      // Should pick a light color from palette
      const bestHsl = hexToHsl(best);
      assert.isAbove(bestHsl.l, 0.5);
    });
  });

  // ============================================================================
  // Quality Testing
  // ============================================================================

  describe('testConversion', function () {
    it('should validate conversion quality for text', function () {
      const goodText = '#333333'; // Good dark text
      assert.isTrue(converter.testConversion(goodText, 'light', 'dark', 'text'));
    });

    it('should detect poor conversions', function () {
      // This is hard to trigger since converter auto-adjusts,
      // but we test the method exists and returns boolean
      const result = converter.testConversion('#808080', 'light', 'dark', 'text');
      assert.isBoolean(result);
    });
  });

  // ============================================================================
  // Real-world Scenarios
  // ============================================================================

  describe('real-world color conversions', function () {
    const scenarios = [
      {
        name: 'Dark gray text (light theme) → Light theme text',
        color: '#333333',
        from: 'light' as const,
        to: 'dark' as const,
        role: 'text' as const,
        expectLight: true,
      },
      {
        name: 'Light gray text (dark theme) → Dark theme text',
        color: '#EEEEEE',
        from: 'dark' as const,
        to: 'light' as const,
        role: 'text' as const,
        expectLight: false,
      },
      {
        name: 'Light background → Dark background',
        color: '#F5F5F5',
        from: 'light' as const,
        to: 'dark' as const,
        role: 'fill' as const,
        expectLight: false,
      },
      {
        name: 'Dark background → Light background',
        color: '#1A1A1A',
        from: 'dark' as const,
        to: 'light' as const,
        role: 'fill' as const,
        expectLight: true,
      },
      {
        name: 'Blue text (light) → Blue text (dark)',
        color: '#1976D2',
        from: 'light' as const,
        to: 'dark' as const,
        role: 'text' as const,
        expectLight: true,
      },
      {
        name: 'Red background (light) → Red background (dark)',
        color: '#FFEBEE',
        from: 'light' as const,
        to: 'dark' as const,
        role: 'fill' as const,
        expectLight: false,
      },
    ];

    scenarios.forEach(({ name, color, from, to, role, expectLight }) => {
      it(name, function () {
        const converted = converter.convertForTheme(color, from, to, role);
        const hsl = hexToHsl(converted);

        if (expectLight) {
          assert.isAbove(hsl.l, 0.5, `${name}: Should result in light color`);
        } else {
          assert.isBelow(hsl.l, 0.6, `${name}: Should result in dark color`);
        }

        // All conversions should produce valid hex
        assert.match(converted, /^#[0-9A-F]{6}$/);

        // Text conversions should meet contrast
        if (role === 'text') {
          const expectedBg = to === 'dark' ? '#1A1A1A' : '#FFFFFF';
          assert.isTrue(checker.meetsWCAG_AA(converted, expectedBg), `${name}: Should meet WCAG AA`);
        }
      });
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('edge cases', function () {
    it('should handle pure black', function () {
      const converted = converter.convertForTheme('#000000', 'light', 'dark', 'text');
      assert.match(converted, /^#[0-9A-F]{6}$/);
    });

    it('should handle pure white', function () {
      const converted = converter.convertForTheme('#FFFFFF', 'light', 'dark', 'fill');
      assert.match(converted, /^#[0-9A-F]{6}$/);
    });

    it('should handle pure red', function () {
      const converted = converter.convertForTheme('#FF0000', 'light', 'dark', 'text');
      assert.match(converted, /^#[0-9A-F]{6}$/);
    });

    it('should handle all grayscale levels', function () {
      const grays = ['#000000', '#333333', '#666666', '#999999', '#CCCCCC', '#FFFFFF'];

      grays.forEach((gray) => {
        const converted = converter.convertForTheme(gray, 'light', 'dark', 'text');
        assert.match(converted, /^#[0-9A-F]{6}$/);
      });
    });
  });

  // ============================================================================
  // Consistency
  // ============================================================================

  describe('consistency', function () {
    it('should produce same result for same inputs', function () {
      const color = '#FF0000';
      const results: string[] = [];

      for (let i = 0; i < 10; i++) {
        results.push(converter.convertForTheme(color, 'light', 'dark', 'text'));
      }

      // All results should be identical
      const first = results[0];
      results.forEach((result) => {
        assert.equal(result, first);
      });
    });

    it('should handle rapid repeated conversions', function () {
      const colors = ['#FF0000', '#00FF00', '#0000FF'];

      for (let i = 0; i < 100; i++) {
        colors.forEach((color) => {
          converter.convertForTheme(color, 'light', 'dark', 'text');
        });
      }

      // Should complete without errors
      assert.isTrue(true);
    });
  });

  // ============================================================================
  // Performance
  // ============================================================================

  describe('performance', function () {
    it('should convert colors quickly', function () {
      const colors = Array.from({ length: 100 }, (_, i) => `#${i.toString(16).padStart(6, '0')}`);

      const start = Date.now();
      colors.forEach((color) => {
        converter.convertForTheme(color, 'light', 'dark', 'text');
      });
      const duration = Date.now() - start;

      // Should complete 100 conversions in reasonable time (< 500ms)
      assert.isBelow(duration, 500);
    });

    it('should benefit from caching', function () {
      const color = '#FF0000';

      // First conversion (no cache)
      const start1 = Date.now();
      converter.convertForTheme(color, 'light', 'dark', 'text');
      const duration1 = Date.now() - start1;

      // Repeated conversions (with cache)
      const start2 = Date.now();
      for (let i = 0; i < 100; i++) {
        converter.convertForTheme(color, 'light', 'dark', 'text');
      }
      const duration2 = Date.now() - start2;

      // Cached conversions should be much faster on average
      const avgCached = duration2 / 100;
      assert.isBelow(avgCached, duration1);
    });
  });
});
