/**
 * Theme Adaptive Color - Main Orchestrator
 *
 * This is the primary API for theme-adaptive color management in Grist.
 * It coordinates between ColorConverter, ColorStorage, and ContrastChecker
 * to provide a unified interface for color operations.
 *
 * Key Features:
 * - High-level API for color management
 * - Automatic theme-aware color resolution
 * - Configuration management (create, update, migrate)
 * - Color preview generation
 * - Contrast validation
 * - Integration with Grist's theme system
 */

import { ColorConverter } from './ColorConverter';
import { ColorStorage } from './ColorStorage';
import { ContrastChecker } from './ContrastChecker';
import {
  ColorRole,
  ContrastInfo,
  PreviewConfig,
  StyleV2,
  ThemeAdaptiveColorConfig,
  ThemeAppearance,
} from './types';

/**
 * Theme Adaptive Color Manager
 *
 * This class provides the main API for working with theme-adaptive colors.
 * Use the singleton instance `themeAdaptiveColor` for most operations.
 */
export class ThemeAdaptiveColor {
  private converter: ColorConverter;
  private storage: ColorStorage;
  private checker: ContrastChecker;
  private currentTheme: ThemeAppearance = 'light';

  constructor(
    converter?: ColorConverter,
    storage?: ColorStorage,
    checker?: ContrastChecker
  ) {
    this.converter = converter || new ColorConverter();
    this.storage = storage || new ColorStorage();
    this.checker = checker || new ContrastChecker();
  }

  // ============================================================================
  // Theme Management
  // ============================================================================

  /**
   * Set the current theme appearance
   *
   * @param theme - New theme appearance
   */
  public setCurrentTheme(theme: ThemeAppearance): void {
    this.currentTheme = theme;
  }

  /**
   * Get the current theme appearance
   *
   * @returns Current theme
   */
  public getCurrentTheme(): ThemeAppearance {
    return this.currentTheme;
  }

  // ============================================================================
  // Configuration Management
  // ============================================================================

  /**
   * Create a new auto-mode color configuration
   *
   * @param color - Base color (hex)
   * @param baseTheme - Theme this color was configured for (defaults to current)
   * @returns Theme-adaptive color configuration
   *
   * @example
   * // User picks red color in light theme
   * const config = themeAdaptiveColor.createAutoConfig('#FF0000');
   * // This will automatically convert to appropriate red in dark theme
   */
  public createAutoConfig(
    color: string,
    baseTheme?: ThemeAppearance
  ): ThemeAdaptiveColorConfig {
    return this.storage.createAutoConfig(color, baseTheme || this.currentTheme);
  }

  /**
   * Create a new manual-mode color configuration
   *
   * @param lightColor - Color for light theme
   * @param darkColor - Color for dark theme
   * @returns Theme-adaptive color configuration
   *
   * @example
   * // User specifies different colors for each theme
   * const config = themeAdaptiveColor.createManualConfig('#222222', '#EEEEEE');
   */
  public createManualConfig(lightColor: string, darkColor: string): ThemeAdaptiveColorConfig {
    return this.storage.createManualConfig(lightColor, darkColor);
  }

  /**
   * Migrate a legacy color string to new configuration
   *
   * @param legacyColor - Legacy color string
   * @param baseTheme - Theme this color was configured for
   * @returns New color configuration
   */
  public migrateLegacyColor(
    legacyColor: string,
    baseTheme?: ThemeAppearance
  ): ThemeAdaptiveColorConfig | undefined {
    return this.storage.migrateLegacyColor(legacyColor, baseTheme || this.currentTheme);
  }

  /**
   * Update an existing color configuration
   *
   * @param config - Existing configuration
   * @param updates - Partial updates
   * @returns Updated configuration
   */
  public updateConfig(
    config: ThemeAdaptiveColorConfig,
    updates: Partial<ThemeAdaptiveColorConfig>
  ): ThemeAdaptiveColorConfig {
    return this.storage.updateConfig(config, updates);
  }

  // ============================================================================
  // Color Resolution
  // ============================================================================

  /**
   * Get the color to display for the current theme
   *
   * This is the main method for resolving what color to actually show.
   * It handles both auto and manual modes, and performs conversion if needed.
   *
   * @param config - Color configuration
   * @param role - Color role (text or fill)
   * @param theme - Theme to resolve for (defaults to current)
   * @returns Resolved color (hex string)
   *
   * @example
   * // Auto mode: converts between themes
   * const config = { mode: 'auto', baseTheme: 'light', baseColor: '#FF0000', ... };
   * const color = themeAdaptiveColor.resolveColor(config, 'text', 'dark');
   * // Returns a light red suitable for dark theme
   *
   * @example
   * // Manual mode: returns theme-specific color
   * const config = { mode: 'manual', lightColor: '#222222', darkColor: '#EEEEEE', ... };
   * const color = themeAdaptiveColor.resolveColor(config, 'text', 'light');
   * // Returns '#222222'
   */
  public resolveColor(
    config: ThemeAdaptiveColorConfig | undefined,
    role: ColorRole,
    theme?: ThemeAppearance
  ): string | undefined {
    if (!config) {
      return undefined;
    }

    const targetTheme = theme || this.currentTheme;

    if (config.mode === 'manual') {
      // Manual mode: return theme-specific color
      return targetTheme === 'light' ? config.lightColor : config.darkColor;
    } else {
      // Auto mode: convert if needed
      if (config.baseTheme === targetTheme) {
        // Same theme, return base color
        return config.baseColor;
      } else {
        // Different theme, perform conversion
        return this.converter.convertForTheme(
          config.baseColor!,
          config.baseTheme!,
          targetTheme,
          role
        );
      }
    }
  }

  /**
   * Get colors for both themes (useful for previews)
   *
   * @param config - Color configuration
   * @param role - Color role
   * @returns Object with light and dark colors
   */
  public resolveBothThemes(
    config: ThemeAdaptiveColorConfig | undefined,
    role: ColorRole
  ): { light: string | undefined; dark: string | undefined } {
    return {
      light: this.resolveColor(config, role, 'light'),
      dark: this.resolveColor(config, role, 'dark'),
    };
  }

  /**
   * Resolve all colors from a StyleV2 object for current theme
   *
   * @param style - Style object with color configurations
   * @returns Object with resolved colors
   */
  public resolveStyleColors(style: StyleV2): {
    textColor?: string;
    fillColor?: string;
  } {
    return {
      textColor: this.resolveColor(style.textColorConfig, 'text') || style.textColor,
      fillColor: this.resolveColor(style.fillColorConfig, 'fill') || style.fillColor,
    };
  }

  // ============================================================================
  // Preview Generation
  // ============================================================================

  /**
   * Generate preview configuration for a color combination
   *
   * @param textColor - Text color (hex)
   * @param fillColor - Fill/background color (hex)
   * @param theme - Theme to preview (defaults to current)
   * @returns Preview configuration with contrast info
   */
  public generatePreview(
    textColor: string,
    fillColor: string,
    theme?: ThemeAppearance
  ): PreviewConfig & { contrastInfo: ContrastInfo } {
    const targetTheme = theme || this.currentTheme;
    const contrastInfo = this.checker.getContrastInfo(textColor, fillColor);

    return {
      textColor,
      fillColor,
      currentTheme: targetTheme,
      showBothThemes: false,
      showContrastInfo: true,
      contrastInfo,
    };
  }

  /**
   * Generate dual-theme preview for a color configuration
   *
   * Shows how colors will look in both themes
   *
   * @param textConfig - Text color configuration
   * @param fillConfig - Fill color configuration
   * @returns Previews for both themes with contrast info
   */
  public generateDualPreview(
    textConfig: ThemeAdaptiveColorConfig | undefined,
    fillConfig: ThemeAdaptiveColorConfig | undefined
  ): {
    light: PreviewConfig & { contrastInfo: ContrastInfo };
    dark: PreviewConfig & { contrastInfo: ContrastInfo };
  } {
    const lightText = this.resolveColor(textConfig, 'text', 'light');
    const lightFill = this.resolveColor(fillConfig, 'fill', 'light');
    const darkText = this.resolveColor(textConfig, 'text', 'dark');
    const darkFill = this.resolveColor(fillConfig, 'fill', 'dark');

    return {
      light: this.generatePreview(lightText || '#000000', lightFill || '#FFFFFF', 'light'),
      dark: this.generatePreview(darkText || '#FFFFFF', darkFill || '#000000', 'dark'),
    };
  }

  // ============================================================================
  // Contrast Validation
  // ============================================================================

  /**
   * Check if a color configuration meets WCAG AA standards
   *
   * @param textConfig - Text color configuration
   * @param fillConfig - Fill color configuration
   * @param theme - Theme to check (defaults to current)
   * @returns Whether combination meets WCAG AA
   */
  public meetsWCAG_AA(
    textConfig: ThemeAdaptiveColorConfig | undefined,
    fillConfig: ThemeAdaptiveColorConfig | undefined,
    theme?: ThemeAppearance
  ): boolean {
    const textColor = this.resolveColor(textConfig, 'text', theme);
    const fillColor = this.resolveColor(fillConfig, 'fill', theme);

    if (!textColor || !fillColor) {
      return false;
    }

    return this.checker.meetsWCAG_AA(textColor, fillColor);
  }

  /**
   * Check if colors meet WCAG standards in both themes
   *
   * @param textConfig - Text color configuration
   * @param fillConfig - Fill color configuration
   * @returns Whether both themes meet WCAG AA
   */
  public meetsBothThemesWCAG_AA(
    textConfig: ThemeAdaptiveColorConfig | undefined,
    fillConfig: ThemeAdaptiveColorConfig | undefined
  ): { light: boolean; dark: boolean; both: boolean } {
    const light = this.meetsWCAG_AA(textConfig, fillConfig, 'light');
    const dark = this.meetsWCAG_AA(textConfig, fillConfig, 'dark');

    return {
      light,
      dark,
      both: light && dark,
    };
  }

  /**
   * Get contrast information for resolved colors
   *
   * @param textConfig - Text color configuration
   * @param fillConfig - Fill color configuration
   * @param theme - Theme to check (defaults to current)
   * @returns Contrast information
   */
  public getContrastInfo(
    textConfig: ThemeAdaptiveColorConfig | undefined,
    fillConfig: ThemeAdaptiveColorConfig | undefined,
    theme?: ThemeAppearance
  ): ContrastInfo | undefined {
    const textColor = this.resolveColor(textConfig, 'text', theme);
    const fillColor = this.resolveColor(fillConfig, 'fill', theme);

    if (!textColor || !fillColor) {
      return undefined;
    }

    return this.checker.getContrastInfo(textColor, fillColor);
  }

  // ============================================================================
  // Conversion & Suggestions
  // ============================================================================

  /**
   * Convert a color to be suitable for a different theme
   *
   * @param color - Source color (hex)
   * @param sourceTheme - Source theme
   * @param targetTheme - Target theme
   * @param role - Color role
   * @returns Converted color
   */
  public convertColor(
    color: string,
    sourceTheme: ThemeAppearance,
    targetTheme: ThemeAppearance,
    role: ColorRole
  ): string {
    return this.converter.convertForTheme(color, sourceTheme, targetTheme, role);
  }

  /**
   * Suggest an alternative text color that meets contrast requirements
   *
   * @param textColor - Original text color
   * @param fillColor - Background color
   * @returns Suggested alternative color
   */
  public suggestAlternativeTextColor(textColor: string, fillColor: string): string {
    return this.checker.suggestAlternativeColor(textColor, fillColor);
  }

  /**
   * Get the optimal text color (black or white) for a background
   *
   * @param backgroundColor - Background color
   * @returns '#000000' or '#FFFFFF'
   */
  public getOptimalTextColor(backgroundColor: string): string {
    return this.checker.getOptimalTextColor(backgroundColor);
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Clone a color configuration
   *
   * @param config - Configuration to clone
   * @returns Cloned configuration
   */
  public cloneConfig(config: ThemeAdaptiveColorConfig): ThemeAdaptiveColorConfig {
    return this.storage.clone(config);
  }

  /**
   * Compare two configurations for equality
   *
   * @param config1 - First configuration
   * @param config2 - Second configuration
   * @returns True if equal
   */
  public equals(
    config1: ThemeAdaptiveColorConfig,
    config2: ThemeAdaptiveColorConfig
  ): boolean {
    return this.storage.equals(config1, config2);
  }

  /**
   * Clear all caches (useful for testing or memory management)
   */
  public clearCaches(): void {
    this.converter.clearCache();
  }

  /**
   * Get performance statistics
   *
   * @returns Cache and conversion statistics
   */
  public getStats(): {
    converter: ReturnType<ColorConverter['getCacheStats']>;
  } {
    return {
      converter: this.converter.getCacheStats(),
    };
  }

  // ============================================================================
  // Component Access (for advanced usage)
  // ============================================================================

  /**
   * Get the underlying ColorConverter instance
   */
  public getConverter(): ColorConverter {
    return this.converter;
  }

  /**
   * Get the underlying ColorStorage instance
   */
  public getStorage(): ColorStorage {
    return this.storage;
  }

  /**
   * Get the underlying ContrastChecker instance
   */
  public getChecker(): ContrastChecker {
    return this.checker;
  }
}

/**
 * Singleton instance for global use
 */
export const themeAdaptiveColor = new ThemeAdaptiveColor();

/**
 * Initialize the theme-adaptive color system with current theme
 *
 * This should be called during Grist's initialization
 *
 * @param currentTheme - Current theme appearance
 */
export function initializeThemeAdaptiveColors(currentTheme: ThemeAppearance): void {
  themeAdaptiveColor.setCurrentTheme(currentTheme);
}

/**
 * Convenience function to resolve color for current theme
 */
export function resolveColor(
  config: ThemeAdaptiveColorConfig | undefined,
  role: ColorRole
): string | undefined {
  return themeAdaptiveColor.resolveColor(config, role);
}

/**
 * Convenience function to create auto-mode config
 */
export function createAutoConfig(color: string): ThemeAdaptiveColorConfig {
  return themeAdaptiveColor.createAutoConfig(color);
}

/**
 * Convenience function to create manual-mode config
 */
export function createManualConfig(lightColor: string, darkColor: string): ThemeAdaptiveColorConfig {
  return themeAdaptiveColor.createManualConfig(lightColor, darkColor);
}
