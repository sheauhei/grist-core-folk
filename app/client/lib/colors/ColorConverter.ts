/**
 * Color Converter - Theme Adaptive Color Conversion
 *
 * This module implements intelligent color conversion between light and dark themes.
 * It preserves hue and adjusts lightness/saturation based on color role and theme.
 *
 * Key Features:
 * - Automatic light ↔ dark theme conversion
 * - Role-aware adjustments (text vs fill/background)
 * - WCAG contrast compliance
 * - Special handling for grayscale and extreme colors
 * - Performance optimization with caching
 */

import { ColorRole, ConversionOptions, HSL, ThemeAppearance } from './types';
import { ContrastChecker } from './ContrastChecker';
import { hexToHsl, hslToHex, isGrayscale, mapRange } from './utils';

/**
 * LRU Cache for color conversions
 */
class LRUCache<K, V> {
  private cache: Map<K, V>;
  private maxSize: number;

  constructor(maxSize: number = 500) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  public get(key: K): V | undefined {
    if (!this.cache.has(key)) {
      return undefined;
    }

    // Move to end (most recently used)
    const value = this.cache.get(key)!;
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  public set(key: K, value: V): void {
    // Remove if exists
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // Add to end
    this.cache.set(key, value);

    // Evict oldest if over capacity
    if (this.cache.size > this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }

  public clear(): void {
    this.cache.clear();
  }

  public get size(): number {
    return this.cache.size;
  }
}

/**
 * Color Converter for theme-adaptive color conversion
 */
export class ColorConverter {
  private contrastChecker: ContrastChecker;
  private cache: LRUCache<string, string>;
  private conversionCount: number = 0;
  private cacheHits: number = 0;

  constructor(contrastChecker?: ContrastChecker) {
    this.contrastChecker = contrastChecker || new ContrastChecker();
    this.cache = new LRUCache<string, string>(500);
  }

  /**
   * Convert a color from one theme to another.
   *
   * This is the main entry point for theme-adaptive color conversion.
   *
   * @param color - Source color (hex string)
   * @param sourceTheme - Source theme appearance
   * @param targetTheme - Target theme appearance
   * @param role - Color role (text or fill)
   * @param options - Additional conversion options
   * @returns Converted color (hex string)
   *
   * @example
   * // Convert dark text color to light theme
   * converter.convertForTheme('#222222', 'dark', 'light', 'text')
   * // Returns a light text color like '#EEEEEE'
   *
   * @example
   * // Convert light background to dark theme
   * converter.convertForTheme('#F5F5F5', 'light', 'dark', 'fill')
   * // Returns a dark background like '#1A1A1A'
   */
  public convertForTheme(
    color: string,
    sourceTheme: ThemeAppearance,
    targetTheme: ThemeAppearance,
    role: ColorRole,
    options?: Partial<ConversionOptions>
  ): string {
    // If same theme, return original
    if (sourceTheme === targetTheme) {
      return color;
    }

    // Check cache
    const cacheKey = this.getCacheKey(color, sourceTheme, targetTheme, role, options);
    const cached = this.cache.get(cacheKey);
    if (cached) {
      this.cacheHits++;
      this.conversionCount++;
      return cached;
    }

    // Perform conversion
    const converted = this.performConversion(color, sourceTheme, targetTheme, role, options);

    // Cache result
    this.cache.set(cacheKey, converted);
    this.conversionCount++;

    return converted;
  }

  /**
   * Perform the actual color conversion logic
   */
  private performConversion(
    color: string,
    sourceTheme: ThemeAppearance,
    targetTheme: ThemeAppearance,
    role: ColorRole,
    options?: Partial<ConversionOptions>
  ): string {
    // Parse color to HSL
    const hsl = hexToHsl(color);

    // Create default options
    const opts: ConversionOptions = {
      sourceTheme,
      targetTheme,
      role,
      preserveHue: options?.preserveHue ?? true,
      minContrast: options?.minContrast ?? 4.5,
      adjustSaturation: options?.adjustSaturation ?? true,
    };

    // Check if grayscale
    const isGray = isGrayscale(hsl);

    // Perform conversion based on theme direction
    let converted: HSL;
    if (sourceTheme === 'light' && targetTheme === 'dark') {
      converted = this.convertLightToDark(hsl, role, isGray, opts);
    } else {
      converted = this.convertDarkToLight(hsl, role, isGray, opts);
    }

    // Ensure contrast if background color is known
    const convertedHex = hslToHex(converted);

    // For text colors, ensure minimum contrast with expected background
    if (role === 'text') {
      const expectedBg = targetTheme === 'dark' ? '#1A1A1A' : '#FFFFFF';
      if (!this.contrastChecker.meetsMinimumContrast(convertedHex, expectedBg, opts.minContrast)) {
        return this.contrastChecker.adjustForContrast(convertedHex, expectedBg, opts.minContrast);
      }
    }

    return convertedHex;
  }

  /**
   * Convert color from light theme to dark theme.
   *
   * Light → Dark conversion rules:
   * - Text: Dark text (L: 0.2-0.5) → Light text (L: 0.7-0.95)
   * - Fill: Light bg (L: 0.8-0.95) → Dark bg (L: 0.15-0.35)
   * - Saturation: Increase for text, decrease for fill
   *
   * @param hsl - Source HSL color
   * @param role - Color role
   * @param isGrayscale - Whether color is grayscale
   * @param options - Conversion options
   * @returns Converted HSL color
   */
  private convertLightToDark(
    hsl: HSL,
    role: ColorRole,
    isGrayscale: boolean,
    options: ConversionOptions
  ): HSL {
    const newHsl: HSL = { ...hsl };

    if (role === 'text') {
      // Text conversion: Dark → Light
      // Map L(0.2-0.5) → L(0.7-0.95)
      newHsl.l = mapRange(hsl.l, 0.2, 0.5, 0.7, 0.95);

      // Clamp to ensure light text
      newHsl.l = Math.max(0.7, Math.min(0.95, newHsl.l));

      // Increase saturation for vibrant text (unless grayscale)
      if (!isGrayscale && options.adjustSaturation) {
        newHsl.s = Math.min(hsl.s * 1.2, 1.0);
      }
    } else {
      // Fill conversion: Light → Dark
      // Map L(0.8-0.95) → L(0.15-0.35)
      newHsl.l = mapRange(hsl.l, 0.8, 0.95, 0.15, 0.35);

      // Clamp to ensure dark background
      newHsl.l = Math.max(0.1, Math.min(0.4, newHsl.l));

      // Decrease saturation for subtle backgrounds (unless grayscale)
      if (!isGrayscale && options.adjustSaturation) {
        newHsl.s = Math.max(hsl.s * 0.8, 0.1);
      }
    }

    // Preserve hue if requested
    if (options.preserveHue) {
      newHsl.h = hsl.h;
    }

    return newHsl;
  }

  /**
   * Convert color from dark theme to light theme.
   *
   * Dark → Light conversion rules:
   * - Text: Light text (L: 0.7-0.95) → Dark text (L: 0.2-0.5)
   * - Fill: Dark bg (L: 0.15-0.35) → Light bg (L: 0.8-0.95)
   * - Saturation: Decrease for text, increase for fill
   *
   * @param hsl - Source HSL color
   * @param role - Color role
   * @param isGrayscale - Whether color is grayscale
   * @param options - Conversion options
   * @returns Converted HSL color
   */
  private convertDarkToLight(
    hsl: HSL,
    role: ColorRole,
    isGrayscale: boolean,
    options: ConversionOptions
  ): HSL {
    const newHsl: HSL = { ...hsl };

    if (role === 'text') {
      // Text conversion: Light → Dark
      // Map L(0.7-0.95) → L(0.2-0.5)
      newHsl.l = mapRange(hsl.l, 0.7, 0.95, 0.2, 0.5);

      // Clamp to ensure dark text
      newHsl.l = Math.max(0.15, Math.min(0.55, newHsl.l));

      // Decrease saturation for readable text (unless grayscale)
      if (!isGrayscale && options.adjustSaturation) {
        newHsl.s = Math.max(hsl.s * 0.8, 0.2);
      }
    } else {
      // Fill conversion: Dark → Light
      // Map L(0.15-0.35) → L(0.8-0.95)
      newHsl.l = mapRange(hsl.l, 0.15, 0.35, 0.8, 0.95);

      // Clamp to ensure light background
      newHsl.l = Math.max(0.75, Math.min(0.98, newHsl.l));

      // Increase saturation for vibrant backgrounds (unless grayscale)
      if (!isGrayscale && options.adjustSaturation) {
        newHsl.s = Math.min(hsl.s * 1.1, 0.9);
      }
    }

    // Preserve hue if requested
    if (options.preserveHue) {
      newHsl.h = hsl.h;
    }

    return newHsl;
  }

  /**
   * Generate cache key for memoization
   */
  private getCacheKey(
    color: string,
    sourceTheme: ThemeAppearance,
    targetTheme: ThemeAppearance,
    role: ColorRole,
    options?: Partial<ConversionOptions>
  ): string {
    const optsKey = options
      ? `${options.preserveHue}_${options.minContrast}_${options.adjustSaturation}`
      : 'default';
    return `${color}_${sourceTheme}_${targetTheme}_${role}_${optsKey}`;
  }

  /**
   * Clear the conversion cache
   */
  public clearCache(): void {
    this.cache.clear();
    this.conversionCount = 0;
    this.cacheHits = 0;
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): {
    size: number;
    hits: number;
    conversions: number;
    hitRate: number;
  } {
    return {
      size: this.cache.size,
      hits: this.cacheHits,
      conversions: this.conversionCount,
      hitRate: this.conversionCount > 0 ? this.cacheHits / this.conversionCount : 0,
    };
  }

  /**
   * Test if a conversion would produce good results
   *
   * @param color - Color to test
   * @param sourceTheme - Source theme
   * @param targetTheme - Target theme
   * @param role - Color role
   * @returns Whether conversion would meet quality standards
   */
  public testConversion(
    color: string,
    sourceTheme: ThemeAppearance,
    targetTheme: ThemeAppearance,
    role: ColorRole
  ): boolean {
    const converted = this.convertForTheme(color, sourceTheme, targetTheme, role);
    const expectedBg = targetTheme === 'dark' ? '#1A1A1A' : '#FFFFFF';

    if (role === 'text') {
      return this.contrastChecker.meetsWCAG_AA(converted, expectedBg);
    }

    return true;
  }

  /**
   * Batch convert multiple colors
   *
   * @param colors - Array of colors to convert
   * @param sourceTheme - Source theme
   * @param targetTheme - Target theme
   * @param role - Color role
   * @returns Array of converted colors
   */
  public convertBatch(
    colors: string[],
    sourceTheme: ThemeAppearance,
    targetTheme: ThemeAppearance,
    role: ColorRole
  ): string[] {
    return colors.map((color) => this.convertForTheme(color, sourceTheme, targetTheme, role));
  }

  /**
   * Find the best matching color in a palette for the target theme
   *
   * @param color - Source color
   * @param palette - Array of palette colors
   * @param sourceTheme - Source theme
   * @param targetTheme - Target theme
   * @param role - Color role
   * @returns Best matching palette color
   */
  public findBestPaletteMatch(
    color: string,
    palette: string[],
    sourceTheme: ThemeAppearance,
    targetTheme: ThemeAppearance,
    role: ColorRole
  ): string {
    const converted = this.convertForTheme(color, sourceTheme, targetTheme, role);
    const convertedHsl = hexToHsl(converted);

    let bestMatch = palette[0];
    let bestDistance = Infinity;

    for (const paletteColor of palette) {
      const paletteHsl = hexToHsl(paletteColor);
      const distance = this.calculateColorDistance(convertedHsl, paletteHsl);

      if (distance < bestDistance) {
        bestDistance = distance;
        bestMatch = paletteColor;
      }
    }

    return bestMatch;
  }

  /**
   * Calculate perceptual distance between two colors in HSL space
   */
  private calculateColorDistance(hsl1: HSL, hsl2: HSL): number {
    // Weighted Euclidean distance in HSL space
    // Hue difference is circular (0° == 360°)
    let hueDiff = Math.abs(hsl1.h - hsl2.h);
    if (hueDiff > 180) {
      hueDiff = 360 - hueDiff;
    }
    hueDiff = hueDiff / 180; // Normalize to 0-2

    const satDiff = Math.abs(hsl1.s - hsl2.s);
    const lightDiff = Math.abs(hsl1.l - hsl2.l);

    // Weight lightness more heavily for perceptual accuracy
    return Math.sqrt(hueDiff * hueDiff * 0.5 + satDiff * satDiff * 0.3 + lightDiff * lightDiff * 1.0);
  }
}

/**
 * Singleton instance for convenience
 */
export const colorConverter = new ColorConverter();

/**
 * Convenience function to convert color for theme
 */
export function convertForTheme(
  color: string,
  sourceTheme: ThemeAppearance,
  targetTheme: ThemeAppearance,
  role: ColorRole
): string {
  return colorConverter.convertForTheme(color, sourceTheme, targetTheme, role);
}

/**
 * Convenience function to test conversion quality
 */
export function testConversion(
  color: string,
  sourceTheme: ThemeAppearance,
  targetTheme: ThemeAppearance,
  role: ColorRole
): boolean {
  return colorConverter.testConversion(color, sourceTheme, targetTheme, role);
}
