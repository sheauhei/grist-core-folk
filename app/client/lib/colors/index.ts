/**
 * Theme Adaptive Colors - Public API
 *
 * This is the main entry point for the theme-adaptive color system.
 * Import from this file to access all public APIs.
 *
 * @example
 * import { themeAdaptiveColor, createAutoConfig } from 'app/client/lib/colors';
 */

// ============================================================================
// Main API
// ============================================================================

export {
  ThemeAdaptiveColor,
  themeAdaptiveColor,
  initializeThemeAdaptiveColors,
  resolveColor,
  createAutoConfig,
  createManualConfig,
} from './ThemeAdaptiveColor';

// ============================================================================
// Core Components
// ============================================================================

export { ColorConverter, colorConverter, convertForTheme } from './ColorConverter';

export {
  ColorStorage,
  colorStorage,
  migrateStyle,
  validateConfig,
  CURRENT_VERSION,
  DEFAULT_BASE_THEME,
} from './ColorStorage';

export {
  ContrastChecker,
  contrastChecker,
  meetsWCAG_AA,
  getContrastRatio,
  adjustForContrast,
  WCAG_THRESHOLDS,
} from './ContrastChecker';

// ============================================================================
// Utilities
// ============================================================================

export {
  // Conversion
  hexToRgb,
  rgbToHex,
  hexToHsl,
  hslToHex,
  rgbToHsl,
  hslToRgb,
  parseColor,
  // Validation
  isValidHex,
  normalizeHex,
  sanitizeColor,
  // Analysis
  isGrayscale,
  isVeryLight,
  isVeryDark,
  isLightColor,
  getPerceivedBrightness,
  // Manipulation
  lighten,
  darken,
  saturate,
  desaturate,
  // Utility
  clamp,
  lerp,
  mapRange,
} from './utils';

// ============================================================================
// Types
// ============================================================================

export type {
  // Basic types
  RGB,
  HSL,
  ThemeAppearance,
  ColorRole,
  ColorMode,
  // Configuration
  ThemeAdaptiveColorConfig,
  StyleV2,
  HeaderStyleV2,
  SwatchMeta,
  // Conversion
  ConversionOptions,
  // Preview
  PreviewConfig,
  // Contrast
  ContrastLevel,
  ContrastInfo,
  // Migration
  MigrationResult,
  MigrationError,
  // Performance
  ColorPerformanceMetrics,
  // Validation
  ValidationResult,
} from './types';
