/**
 * Color space conversion utilities.
 *
 * This module provides functions for converting between different color spaces
 * (RGB, HSL, HEX) with high precision.
 */

import { HSL, RGB } from './types';

// ============================================================================
// HEX ↔ RGB Conversion
// ============================================================================

/**
 * Convert hex color to RGB.
 *
 * @param hex - Hex color string (e.g., "#FF0000" or "#F00")
 * @returns RGB object with r, g, b values (0-255)
 * @throws Error if hex format is invalid
 *
 * @example
 * hexToRgb("#FF0000") // { r: 255, g: 0, b: 0 }
 * hexToRgb("#F00")    // { r: 255, g: 0, b: 0 }
 */
export function hexToRgb(hex: string): RGB {
  // Normalize hex format
  hex = normalizeHex(hex);

  // Validate
  if (!isValidHex(hex)) {
    throw new Error(`Invalid hex color: ${hex}`);
  }

  // Remove # prefix
  const cleanHex = hex.replace(/^#/, '');

  // Parse RGB values
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);

  return { r, g, b };
}

/**
 * Convert RGB to hex color.
 *
 * @param rgb - RGB object with r, g, b values (0-255)
 * @returns Hex color string (e.g., "#FF0000")
 *
 * @example
 * rgbToHex({ r: 255, g: 0, b: 0 }) // "#FF0000"
 */
export function rgbToHex(rgb: RGB): string {
  const { r, g, b } = rgb;

  // Clamp values to 0-255
  const rClamped = Math.max(0, Math.min(255, Math.round(r)));
  const gClamped = Math.max(0, Math.min(255, Math.round(g)));
  const bClamped = Math.max(0, Math.min(255, Math.round(b)));

  // Convert to hex
  const rHex = rClamped.toString(16).padStart(2, '0');
  const gHex = gClamped.toString(16).padStart(2, '0');
  const bHex = bClamped.toString(16).padStart(2, '0');

  return `#${rHex}${gHex}${bHex}`.toUpperCase();
}

// ============================================================================
// RGB ↔ HSL Conversion
// ============================================================================

/**
 * Convert RGB to HSL.
 *
 * Algorithm based on:
 * https://en.wikipedia.org/wiki/HSL_and_HSV#From_RGB
 *
 * @param rgb - RGB object with r, g, b values (0-255)
 * @returns HSL object with h (0-360), s (0-1), l (0-1)
 *
 * @example
 * rgbToHsl({ r: 255, g: 0, b: 0 }) // { h: 0, s: 1.0, l: 0.5 }
 */
export function rgbToHsl(rgb: RGB): HSL {
  // Normalize RGB values to 0-1
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  // Find min and max
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  // Calculate lightness
  const l = (max + min) / 2;

  // Calculate saturation
  let s = 0;
  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1));
  }

  // Calculate hue
  let h = 0;
  if (delta !== 0) {
    if (max === r) {
      h = 60 * (((g - b) / delta) % 6);
    } else if (max === g) {
      h = 60 * ((b - r) / delta + 2);
    } else {
      h = 60 * ((r - g) / delta + 4);
    }
  }

  // Normalize hue to 0-360
  if (h < 0) {
    h += 360;
  }

  return { h, s, l };
}

/**
 * Convert HSL to RGB.
 *
 * Algorithm based on:
 * https://en.wikipedia.org/wiki/HSL_and_HSV#HSL_to_RGB
 *
 * @param hsl - HSL object with h (0-360), s (0-1), l (0-1)
 * @returns RGB object with r, g, b values (0-255)
 *
 * @example
 * hslToRgb({ h: 0, s: 1.0, l: 0.5 }) // { r: 255, g: 0, b: 0 }
 */
export function hslToRgb(hsl: HSL): RGB {
  const { h, s, l } = hsl;

  // Calculate chroma
  const c = (1 - Math.abs(2 * l - 1)) * s;

  // Calculate intermediate value
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));

  // Calculate match value
  const m = l - c / 2;

  // Determine RGB' based on hue
  let rPrime = 0, gPrime = 0, bPrime = 0;

  if (h >= 0 && h < 60) {
    rPrime = c; gPrime = x; bPrime = 0;
  } else if (h >= 60 && h < 120) {
    rPrime = x; gPrime = c; bPrime = 0;
  } else if (h >= 120 && h < 180) {
    rPrime = 0; gPrime = c; bPrime = x;
  } else if (h >= 180 && h < 240) {
    rPrime = 0; gPrime = x; bPrime = c;
  } else if (h >= 240 && h < 300) {
    rPrime = x; gPrime = 0; bPrime = c;
  } else if (h >= 300 && h < 360) {
    rPrime = c; gPrime = 0; bPrime = x;
  }

  // Convert to RGB (0-255)
  const r = Math.round((rPrime + m) * 255);
  const g = Math.round((gPrime + m) * 255);
  const b = Math.round((bPrime + m) * 255);

  return { r, g, b };
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Parse a color string (hex) to RGB.
 * Alias for hexToRgb for convenience.
 *
 * @param color - Color string in hex format
 * @returns RGB object
 */
export function parseColor(color: string): RGB {
  return hexToRgb(color);
}

/**
 * Convert hex color to HSL.
 *
 * @param hex - Hex color string
 * @returns HSL object
 *
 * @example
 * hexToHsl("#FF0000") // { h: 0, s: 1.0, l: 0.5 }
 */
export function hexToHsl(hex: string): HSL {
  return rgbToHsl(hexToRgb(hex));
}

/**
 * Convert HSL color to hex.
 *
 * @param hsl - HSL object
 * @returns Hex color string
 *
 * @example
 * hslToHex({ h: 0, s: 1.0, l: 0.5 }) // "#FF0000"
 */
export function hslToHex(hsl: HSL): string {
  return rgbToHex(hslToRgb(hsl));
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Check if a string is a valid hex color.
 *
 * @param hex - String to validate
 * @returns true if valid hex color
 *
 * @example
 * isValidHex("#FF0000") // true
 * isValidHex("#F00")    // true
 * isValidHex("FF0000")  // false (missing #)
 * isValidHex("#GG0000") // false (invalid hex)
 */
export function isValidHex(hex: string): boolean {
  const hexPattern = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  return hexPattern.test(hex);
}

/**
 * Normalize hex color format.
 * - Converts 3-digit hex to 6-digit (#F00 → #FF0000)
 * - Ensures uppercase
 * - Adds # prefix if missing
 *
 * @param hex - Hex color string
 * @returns Normalized hex string
 *
 * @example
 * normalizeHex("#f00")    // "#FF0000"
 * normalizeHex("FF0000")  // "#FF0000"
 * normalizeHex("#F00")    // "#FF0000"
 */
export function normalizeHex(hex: string): string {
  // Add # prefix if missing
  if (!hex.startsWith('#')) {
    hex = '#' + hex;
  }

  // Convert 3-digit to 6-digit
  if (hex.length === 4) {
    const r = hex[1];
    const g = hex[2];
    const b = hex[3];
    hex = `#${r}${r}${g}${g}${b}${b}`;
  }

  // Convert to uppercase
  return hex.toUpperCase();
}

/**
 * Sanitize a color value for safe use in CSS/storage.
 * Prevents CSS injection attacks.
 *
 * @param color - Color string to sanitize
 * @returns Sanitized color or null if invalid
 */
export function sanitizeColor(color: string): string | null {
  // Remove whitespace
  color = color.trim();

  // Check for potentially malicious content
  if (color.includes(';') || color.includes('expression') || color.includes('url(')) {
    return null;
  }

  // Validate hex format
  if (!isValidHex(color)) {
    return null;
  }

  return normalizeHex(color);
}

// ============================================================================
// Color Analysis Functions
// ============================================================================

/**
 * Check if a color is grayscale (low saturation).
 *
 * @param hsl - HSL color object
 * @param threshold - Saturation threshold (default: 0.1)
 * @returns true if color is grayscale
 *
 * @example
 * isGrayscale({ h: 0, s: 0.05, l: 0.5 }) // true
 * isGrayscale({ h: 0, s: 0.8, l: 0.5 })  // false
 */
export function isGrayscale(hsl: HSL, threshold: number = 0.1): boolean {
  return hsl.s < threshold;
}

/**
 * Check if a color is very light.
 *
 * @param hsl - HSL color object
 * @param threshold - Lightness threshold (default: 0.9)
 * @returns true if color is very light
 */
export function isVeryLight(hsl: HSL, threshold: number = 0.9): boolean {
  return hsl.l > threshold;
}

/**
 * Check if a color is very dark.
 *
 * @param hsl - HSL color object
 * @param threshold - Lightness threshold (default: 0.1)
 * @returns true if color is very dark
 */
export function isVeryDark(hsl: HSL, threshold: number = 0.1): boolean {
  return hsl.l < threshold;
}

/**
 * Calculate the perceived brightness of a color.
 * Uses the formula: 0.299*R + 0.587*G + 0.114*B
 *
 * @param rgb - RGB color object
 * @returns Brightness value (0-255)
 */
export function getPerceivedBrightness(rgb: RGB): number {
  return 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b;
}

/**
 * Determine if a color is light or dark based on perceived brightness.
 *
 * @param color - Hex color string
 * @param threshold - Brightness threshold (default: 128)
 * @returns 'light' or 'dark'
 */
export function isLightColor(color: string, threshold: number = 128): boolean {
  const rgb = hexToRgb(color);
  const brightness = getPerceivedBrightness(rgb);
  return brightness > threshold;
}

// ============================================================================
// Color Manipulation
// ============================================================================

/**
 * Lighten a color by increasing its lightness.
 *
 * @param color - Hex color string
 * @param amount - Amount to lighten (0-1)
 * @returns Lightened hex color
 */
export function lighten(color: string, amount: number): string {
  const hsl = hexToHsl(color);
  hsl.l = Math.min(1, hsl.l + amount);
  return hslToHex(hsl);
}

/**
 * Darken a color by decreasing its lightness.
 *
 * @param color - Hex color string
 * @param amount - Amount to darken (0-1)
 * @returns Darkened hex color
 */
export function darken(color: string, amount: number): string {
  const hsl = hexToHsl(color);
  hsl.l = Math.max(0, hsl.l - amount);
  return hslToHex(hsl);
}

/**
 * Saturate a color by increasing its saturation.
 *
 * @param color - Hex color string
 * @param amount - Amount to saturate (0-1)
 * @returns Saturated hex color
 */
export function saturate(color: string, amount: number): string {
  const hsl = hexToHsl(color);
  hsl.s = Math.min(1, hsl.s + amount);
  return hslToHex(hsl);
}

/**
 * Desaturate a color by decreasing its saturation.
 *
 * @param color - Hex color string
 * @param amount - Amount to desaturate (0-1)
 * @returns Desaturated hex color
 */
export function desaturate(color: string, amount: number): string {
  const hsl = hexToHsl(color);
  hsl.s = Math.max(0, hsl.s - amount);
  return hslToHex(hsl);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Clamp a value between min and max.
 *
 * @param value - Value to clamp
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns Clamped value
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Linear interpolation between two values.
 *
 * @param start - Start value
 * @param end - End value
 * @param t - Interpolation factor (0-1)
 * @returns Interpolated value
 */
export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

/**
 * Map a value from one range to another.
 *
 * @param value - Value to map
 * @param inMin - Input range minimum
 * @param inMax - Input range maximum
 * @param outMin - Output range minimum
 * @param outMax - Output range maximum
 * @returns Mapped value
 *
 * @example
 * mapRange(0.5, 0, 1, 0, 100) // 50
 */
export function mapRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number {
  // Clamp input value
  value = clamp(value, inMin, inMax);

  // Normalize to 0-1
  const normalized = (value - inMin) / (inMax - inMin);

  // Map to output range
  return outMin + normalized * (outMax - outMin);
}
