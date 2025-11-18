/**
 * Type definitions for Theme Adaptive Colors system.
 *
 * This module provides TypeScript interfaces and types for the color adaptation
 * system that automatically converts colors between light and dark themes.
 */

// ============================================================================
// Basic Color Types
// ============================================================================

/**
 * RGB color representation (0-255 for each channel)
 */
export interface RGB {
  r: number;  // Red: 0-255
  g: number;  // Green: 0-255
  b: number;  // Blue: 0-255
}

/**
 * HSL color representation
 * H: 0-360 degrees
 * S: 0-1 (0% to 100%)
 * L: 0-1 (0% to 100%)
 */
export interface HSL {
  h: number;  // Hue: 0-360
  s: number;  // Saturation: 0-1
  l: number;  // Lightness: 0-1
}

// ============================================================================
// Theme Types
// ============================================================================

/**
 * Theme appearance: light or dark
 */
export type ThemeAppearance = 'light' | 'dark';

/**
 * Color role in the UI
 * - text: Text color (should have high contrast with background)
 * - fill: Background/fill color
 */
export type ColorRole = 'text' | 'fill';

/**
 * Color configuration mode
 * - auto: Automatically convert colors between themes
 * - manual: Manually specify colors for each theme
 */
export type ColorMode = 'auto' | 'manual';

// ============================================================================
// Theme Adaptive Color Configuration
// ============================================================================

/**
 * Configuration for theme-adaptive colors.
 *
 * In auto mode, only baseTheme and baseColor are needed.
 * The system will automatically convert to the other theme.
 *
 * In manual mode, both lightColor and darkColor must be specified.
 */
export interface ThemeAdaptiveColorConfig {
  /**
   * Color mode: 'auto' for automatic conversion, 'manual' for per-theme colors
   */
  mode: ColorMode;

  // Auto mode fields
  /**
   * The theme this color was originally configured for (auto mode only)
   */
  baseTheme?: ThemeAppearance;

  /**
   * The base color value in hex format (auto mode only)
   */
  baseColor?: string;

  // Manual mode fields
  /**
   * Color to use in light theme (manual mode only)
   */
  lightColor?: string;

  /**
   * Color to use in dark theme (manual mode only)
   */
  darkColor?: string;

  // Metadata
  /**
   * Configuration format version for future migrations
   */
  version: number;

  /**
   * Timestamp when this configuration was created
   */
  createdAt?: number;

  /**
   * Timestamp when this configuration was last updated
   */
  updatedAt?: number;
}

// ============================================================================
// Style Extensions
// ============================================================================

/**
 * Extended style interface that includes theme-adaptive color configurations.
 *
 * This extends the existing Style interface to support both legacy (single color)
 * and new (theme-adaptive) formats for backward compatibility.
 */
export interface StyleV2 {
  // Legacy fields (for backward compatibility)
  textColor?: string;
  fillColor?: string;
  fontBold?: boolean;
  fontUnderline?: boolean;
  fontItalic?: boolean;
  fontStrikethrough?: boolean;

  // New theme-adaptive fields
  textColorConfig?: ThemeAdaptiveColorConfig;
  fillColorConfig?: ThemeAdaptiveColorConfig;
}

/**
 * Header style with theme-adaptive support
 */
export interface HeaderStyleV2 {
  // Legacy fields
  headerTextColor?: string;
  headerFillColor?: string;
  headerFontBold?: boolean;
  headerFontUnderline?: boolean;
  headerFontItalic?: boolean;
  headerFontStrikethrough?: boolean;

  // New theme-adaptive fields
  headerTextColorConfig?: ThemeAdaptiveColorConfig;
  headerFillColorConfig?: ThemeAdaptiveColorConfig;
}

// ============================================================================
// Color Palette Metadata
// ============================================================================

/**
 * Metadata for a color swatch in the palette.
 * Helps identify which colors are suitable for which themes and roles.
 */
export interface SwatchMeta {
  /**
   * Index in the swatches array
   */
  index: number;

  /**
   * Hex color value
   */
  hex: string;

  /**
   * Color group name (e.g., 'red', 'blue', 'green')
   */
  group: string;

  /**
   * Suggested role for this color
   */
  role: ColorRole;

  /**
   * Theme this color is designed for
   */
  theme: ThemeAppearance;

  /**
   * Index of the paired color in the other theme (if any)
   */
  pairedIndex?: number;
}

// ============================================================================
// Conversion Options
// ============================================================================

/**
 * Options for color conversion
 */
export interface ConversionOptions {
  /**
   * Source theme appearance
   */
  sourceTheme: ThemeAppearance;

  /**
   * Target theme appearance
   */
  targetTheme: ThemeAppearance;

  /**
   * Color role (text or fill)
   */
  role: ColorRole;

  /**
   * Whether to preserve hue during conversion (default: true)
   */
  preserveHue?: boolean;

  /**
   * Minimum contrast ratio to maintain (default: 4.5 for WCAG AA)
   */
  minContrast?: number;

  /**
   * Whether to adjust saturation (default: true)
   */
  adjustSaturation?: boolean;
}

// ============================================================================
// Preview Configuration
// ============================================================================

/**
 * Configuration for color preview component
 */
export interface PreviewConfig {
  /**
   * Text color to preview
   */
  textColor: string;

  /**
   * Fill/background color to preview
   */
  fillColor: string;

  /**
   * Current theme appearance
   */
  currentTheme: ThemeAppearance;

  /**
   * Whether to show both theme previews side-by-side
   */
  showBothThemes?: boolean;

  /**
   * Whether to show contrast ratio information
   */
  showContrastInfo?: boolean;
}

// ============================================================================
// Contrast Information
// ============================================================================

/**
 * Contrast level according to WCAG standards
 */
export type ContrastLevel = 'AAA' | 'AA' | 'Fail';

/**
 * Contrast information for a color combination
 */
export interface ContrastInfo {
  /**
   * Contrast ratio (e.g., 4.5, 7.0, 21.0)
   */
  ratio: number;

  /**
   * WCAG level achieved
   */
  level: ContrastLevel;

  /**
   * Whether this meets WCAG AA standard (ratio >= 4.5)
   */
  meetsAA: boolean;

  /**
   * Whether this meets WCAG AAA standard (ratio >= 7.0)
   */
  meetsAAA: boolean;
}

// ============================================================================
// Migration Types
// ============================================================================

/**
 * Result of a color configuration migration
 */
export interface MigrationResult {
  /**
   * Number of fields successfully migrated
   */
  fieldsMigrated: number;

  /**
   * Number of rules successfully migrated
   */
  rulesMigrated: number;

  /**
   * Errors encountered during migration
   */
  errors: MigrationError[];

  /**
   * Total time taken (milliseconds)
   */
  duration?: number;
}

/**
 * Error during migration
 */
export interface MigrationError {
  /**
   * Field ID that failed (if applicable)
   */
  fieldId?: string;

  /**
   * Section ID that failed (if applicable)
   */
  sectionId?: string;

  /**
   * Error message
   */
  error: string;

  /**
   * Original configuration that failed
   */
  originalConfig?: any;
}

// ============================================================================
// Performance Metrics
// ============================================================================

/**
 * Performance metrics for color operations
 */
export interface ColorPerformanceMetrics {
  /**
   * Number of conversions performed
   */
  conversionsCount: number;

  /**
   * Cache hit rate (0-1)
   */
  cacheHitRate: number;

  /**
   * Average conversion time (milliseconds)
   */
  avgConversionTime: number;

  /**
   * Maximum conversion time (milliseconds)
   */
  maxConversionTime: number;

  /**
   * 95th percentile conversion time (milliseconds)
   */
  p95ConversionTime: number;
}

// ============================================================================
// Validation Types
// ============================================================================

/**
 * Validation result for color configuration
 */
export interface ValidationResult {
  /**
   * Whether the configuration is valid
   */
  valid: boolean;

  /**
   * Validation errors (if any)
   */
  errors: string[];

  /**
   * Validation warnings (if any)
   */
  warnings: string[];
}
