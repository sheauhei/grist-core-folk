/**
 * Contrast Checker - WCAG 2.1 Compliance
 *
 * This module implements WCAG 2.1 contrast ratio calculations to ensure
 * colors meet accessibility standards.
 *
 * References:
 * - WCAG 2.1: https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html
 * - Relative Luminance: https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 */

import { ContrastInfo, ContrastLevel, RGB } from './types';
import { clamp, hexToHsl, hexToRgb, hslToHex } from './utils';

/**
 * WCAG 2.1 Contrast ratio thresholds
 */
export const WCAG_THRESHOLDS = {
  /** WCAG AA standard for normal text (4.5:1) */
  AA: 4.5,

  /** WCAG AA standard for large text (3:1) */
  AA_LARGE: 3.0,

  /** WCAG AAA standard for normal text (7:1) */
  AAA: 7.0,

  /** WCAG AAA standard for large text (4.5:1) */
  AAA_LARGE: 4.5,

  /** Maximum possible contrast ratio */
  MAX: 21.0,
} as const;

/**
 * Contrast Checker class for WCAG 2.1 contrast calculations.
 */
export class ContrastChecker {
  /**
   * Calculate the relative luminance of an RGB color.
   *
   * Formula from WCAG 2.1:
   * For each RGB component (R, G, B):
   * - If RsRGB <= 0.03928: R = RsRGB / 12.92
   * - Otherwise: R = ((RsRGB + 0.055) / 1.055) ^ 2.4
   *
   * L = 0.2126 * R + 0.7152 * G + 0.0722 * B
   *
   * @param rgb - RGB color object
   * @returns Relative luminance (0-1)
   */
  public getRelativeLuminance(rgb: RGB): number {
    // Normalize to 0-1
    let r = rgb.r / 255;
    let g = rgb.g / 255;
    let b = rgb.b / 255;

    // Apply gamma correction
    r = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
    g = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
    b = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);

    // Calculate luminance
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  /**
   * Calculate the contrast ratio between two colors.
   *
   * Formula from WCAG 2.1:
   * CR = (L1 + 0.05) / (L2 + 0.05)
   * where L1 is the lighter color's luminance and L2 is the darker color's luminance
   *
   * @param color1 - First color (hex string)
   * @param color2 - Second color (hex string)
   * @returns Contrast ratio (1-21)
   *
   * @example
   * checker.getContrastRatio("#000000", "#FFFFFF") // 21 (maximum contrast)
   * checker.getContrastRatio("#777777", "#FFFFFF") // ~4.47
   */
  public getContrastRatio(color1: string, color2: string): number {
    const rgb1 = hexToRgb(color1);
    const rgb2 = hexToRgb(color2);

    const lum1 = this.getRelativeLuminance(rgb1);
    const lum2 = this.getRelativeLuminance(rgb2);

    // Ensure L1 is the lighter color
    const lighter = Math.max(lum1, lum2);
    const darker = Math.min(lum1, lum2);

    // Calculate contrast ratio
    return (lighter + 0.05) / (darker + 0.05);
  }

  /**
   * Check if a color combination meets WCAG AA standard (4.5:1).
   *
   * @param textColor - Text color (hex string)
   * @param bgColor - Background color (hex string)
   * @param largText - Whether this is large text (default: false)
   * @returns true if meets WCAG AA
   */
  public meetsWCAG_AA(textColor: string, bgColor: string, largeText: boolean = false): boolean {
    const ratio = this.getContrastRatio(textColor, bgColor);
    const threshold = largeText ? WCAG_THRESHOLDS.AA_LARGE : WCAG_THRESHOLDS.AA;
    return ratio >= threshold;
  }

  /**
   * Check if a color combination meets WCAG AAA standard (7:1).
   *
   * @param textColor - Text color (hex string)
   * @param bgColor - Background color (hex string)
   * @param largeText - Whether this is large text (default: false)
   * @returns true if meets WCAG AAA
   */
  public meetsWCAG_AAA(textColor: string, bgColor: string, largeText: boolean = false): boolean {
    const ratio = this.getContrastRatio(textColor, bgColor);
    const threshold = largeText ? WCAG_THRESHOLDS.AAA_LARGE : WCAG_THRESHOLDS.AAA;
    return ratio >= threshold;
  }

  /**
   * Check if a color combination meets minimum contrast.
   *
   * @param textColor - Text color (hex string)
   * @param bgColor - Background color (hex string)
   * @param minRatio - Minimum contrast ratio (default: 4.5)
   * @returns true if meets minimum contrast
   */
  public meetsMinimumContrast(
    textColor: string,
    bgColor: string,
    minRatio: number = WCAG_THRESHOLDS.AA
  ): boolean {
    const ratio = this.getContrastRatio(textColor, bgColor);
    return ratio >= minRatio;
  }

  /**
   * Get the contrast level (AAA, AA, or Fail) for a color combination.
   *
   * @param textColor - Text color (hex string)
   * @param bgColor - Background color (hex string)
   * @param largeText - Whether this is large text (default: false)
   * @returns Contrast level
   */
  public getContrastLevel(
    textColor: string,
    bgColor: string,
    largeText: boolean = false
  ): ContrastLevel {
    if (this.meetsWCAG_AAA(textColor, bgColor, largeText)) {
      return 'AAA';
    } else if (this.meetsWCAG_AA(textColor, bgColor, largeText)) {
      return 'AA';
    } else {
      return 'Fail';
    }
  }

  /**
   * Get complete contrast information for a color combination.
   *
   * @param textColor - Text color (hex string)
   * @param bgColor - Background color (hex string)
   * @param largeText - Whether this is large text (default: false)
   * @returns Contrast information object
   *
   * @example
   * const info = checker.getContrastInfo("#000000", "#FFFFFF");
   * // { ratio: 21, level: 'AAA', meetsAA: true, meetsAAA: true }
   */
  public getContrastInfo(
    textColor: string,
    bgColor: string,
    largeText: boolean = false
  ): ContrastInfo {
    const ratio = this.getContrastRatio(textColor, bgColor);
    const level = this.getContrastLevel(textColor, bgColor, largeText);
    const meetsAA = this.meetsWCAG_AA(textColor, bgColor, largeText);
    const meetsAAA = this.meetsWCAG_AAA(textColor, bgColor, largeText);

    return {
      ratio,
      level,
      meetsAA,
      meetsAAA,
    };
  }

  /**
   * Adjust a text color to meet minimum contrast with background.
   *
   * This function will iteratively lighten or darken the text color
   * until it meets the minimum contrast ratio.
   *
   * @param textColor - Text color to adjust (hex string)
   * @param bgColor - Background color (hex string)
   * @param minRatio - Minimum contrast ratio (default: 4.5)
   * @param maxIterations - Maximum adjustment iterations (default: 20)
   * @returns Adjusted text color (hex string)
   *
   * @example
   * // Adjust gray text on white background
   * checker.adjustForContrast("#888888", "#FFFFFF", 4.5)
   * // Returns a darker gray that meets 4.5:1 contrast
   */
  public adjustForContrast(
    textColor: string,
    bgColor: string,
    minRatio: number = WCAG_THRESHOLDS.AA,
    maxIterations: number = 20
  ): string {
    let adjustedColor = textColor;
    let iterations = 0;

    // Determine if background is light or dark
    const bgRgb = hexToRgb(bgColor);
    const bgLuminance = this.getRelativeLuminance(bgRgb);
    const isLightBg = bgLuminance > 0.5;

    while (
      this.getContrastRatio(adjustedColor, bgColor) < minRatio &&
      iterations < maxIterations
    ) {
      const hsl = hexToHsl(adjustedColor);

      if (isLightBg) {
        // Light background: make text darker
        hsl.l = Math.max(0, hsl.l - 0.05);
      } else {
        // Dark background: make text lighter
        hsl.l = Math.min(1, hsl.l + 0.05);
      }

      adjustedColor = hslToHex(hsl);
      iterations++;
    }

    // If we couldn't meet the minimum, return black or white
    if (this.getContrastRatio(adjustedColor, bgColor) < minRatio) {
      return isLightBg ? '#000000' : '#FFFFFF';
    }

    return adjustedColor;
  }

  /**
   * Find the optimal text color (black or white) for a given background.
   *
   * @param bgColor - Background color (hex string)
   * @returns "#000000" or "#FFFFFF"
   *
   * @example
   * checker.getOptimalTextColor("#FF0000") // "#FFFFFF"
   * checker.getOptimalTextColor("#FFFF00") // "#000000"
   */
  public getOptimalTextColor(bgColor: string): string {
    const blackContrast = this.getContrastRatio('#000000', bgColor);
    const whiteContrast = this.getContrastRatio('#FFFFFF', bgColor);

    return blackContrast > whiteContrast ? '#000000' : '#FFFFFF';
  }

  /**
   * Check if two colors are distinguishable by color-blind users.
   *
   * This is a simplified check based on luminance difference.
   * For more accurate color-blindness simulation, use specialized libraries.
   *
   * @param color1 - First color (hex string)
   * @param color2 - Second color (hex string)
   * @param threshold - Luminance difference threshold (default: 0.2)
   * @returns true if colors are distinguishable
   */
  public isColorBlindSafe(
    color1: string,
    color2: string,
    threshold: number = 0.2
  ): boolean {
    const rgb1 = hexToRgb(color1);
    const rgb2 = hexToRgb(color2);

    const lum1 = this.getRelativeLuminance(rgb1);
    const lum2 = this.getRelativeLuminance(rgb2);

    return Math.abs(lum1 - lum2) >= threshold;
  }

  /**
   * Suggest an alternative color that meets contrast requirements.
   *
   * @param originalColor - Original color that doesn't meet contrast
   * @param bgColor - Background color
   * @param minRatio - Minimum contrast ratio (default: 4.5)
   * @returns Suggested color
   */
  public suggestAlternativeColor(
    originalColor: string,
    bgColor: string,
    minRatio: number = WCAG_THRESHOLDS.AA
  ): string {
    // First try adjusting lightness
    const adjusted = this.adjustForContrast(originalColor, bgColor, minRatio);

    if (this.meetsMinimumContrast(adjusted, bgColor, minRatio)) {
      return adjusted;
    }

    // If that doesn't work, return optimal color (black or white)
    return this.getOptimalTextColor(bgColor);
  }

  /**
   * Calculate how much a color needs to be adjusted to meet contrast.
   *
   * @param textColor - Text color (hex string)
   * @param bgColor - Background color (hex string)
   * @param targetRatio - Target contrast ratio (default: 4.5)
   * @returns Lightness adjustment needed (-1 to 1), or 0 if already meets target
   */
  public calculateRequiredAdjustment(
    textColor: string,
    bgColor: string,
    targetRatio: number = WCAG_THRESHOLDS.AA
  ): number {
    const currentRatio = this.getContrastRatio(textColor, bgColor);

    if (currentRatio >= targetRatio) {
      return 0; // No adjustment needed
    }

    const bgRgb = hexToRgb(bgColor);
    const bgLuminance = this.getRelativeLuminance(bgRgb);
    const isLightBg = bgLuminance > 0.5;

    const hsl = hexToHsl(textColor);

    // Binary search for required adjustment
    let low = 0;
    let high = 1;
    let adjustment = 0;

    for (let i = 0; i < 10; i++) {
      adjustment = (low + high) / 2;
      const testHsl = { ...hsl };

      if (isLightBg) {
        testHsl.l = clamp(hsl.l - adjustment, 0, 1);
      } else {
        testHsl.l = clamp(hsl.l + adjustment, 0, 1);
      }

      const testColor = hslToHex(testHsl);
      const testRatio = this.getContrastRatio(testColor, bgColor);

      if (testRatio < targetRatio) {
        low = adjustment;
      } else {
        high = adjustment;
      }
    }

    return isLightBg ? -adjustment : adjustment;
  }
}

/**
 * Singleton instance of ContrastChecker for convenience.
 */
export const contrastChecker = new ContrastChecker();

/**
 * Convenience function to check WCAG AA compliance.
 */
export function meetsWCAG_AA(textColor: string, bgColor: string): boolean {
  return contrastChecker.meetsWCAG_AA(textColor, bgColor);
}

/**
 * Convenience function to get contrast ratio.
 */
export function getContrastRatio(color1: string, color2: string): number {
  return contrastChecker.getContrastRatio(color1, color2);
}

/**
 * Convenience function to adjust color for contrast.
 */
export function adjustForContrast(
  textColor: string,
  bgColor: string,
  minRatio?: number
): string {
  return contrastChecker.adjustForContrast(textColor, bgColor, minRatio);
}
