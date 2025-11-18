/**
 * Color Storage - Data Persistence and Migration
 *
 * This module handles storage, retrieval, and migration of theme-adaptive color configurations.
 * It ensures backward compatibility with legacy single-color format.
 *
 * Key Features:
 * - Serialize/deserialize color configurations
 * - Backward compatibility with legacy format
 * - Automatic migration from old to new format
 * - Validation of stored data
 * - Version management for future migrations
 */

import {
  ColorRole,
  MigrationError,
  MigrationResult,
  StyleV2,
  ThemeAdaptiveColorConfig,
  ThemeAppearance,
  ValidationResult,
} from './types';
import { isValidHex, sanitizeColor } from './utils';

/**
 * Current configuration version
 */
export const CURRENT_VERSION = 1;

/**
 * Default theme for new configurations
 */
export const DEFAULT_BASE_THEME: ThemeAppearance = 'light';

/**
 * Color Storage Manager
 */
export class ColorStorage {
  /**
   * Create a new auto-mode color configuration
   *
   * @param baseColor - Base color value (hex)
   * @param baseTheme - Theme this color was configured for
   * @returns Theme-adaptive color configuration
   *
   * @example
   * const config = storage.createAutoConfig('#FF0000', 'light');
   * // { mode: 'auto', baseTheme: 'light', baseColor: '#FF0000', version: 1, ... }
   */
  public createAutoConfig(
    baseColor: string,
    baseTheme: ThemeAppearance = DEFAULT_BASE_THEME
  ): ThemeAdaptiveColorConfig {
    const sanitized = sanitizeColor(baseColor);
    if (!sanitized) {
      throw new Error(`Invalid color: ${baseColor}`);
    }

    return {
      mode: 'auto',
      baseTheme,
      baseColor: sanitized,
      version: CURRENT_VERSION,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }

  /**
   * Create a new manual-mode color configuration
   *
   * @param lightColor - Color for light theme
   * @param darkColor - Color for dark theme
   * @returns Theme-adaptive color configuration
   *
   * @example
   * const config = storage.createManualConfig('#222222', '#EEEEEE');
   * // { mode: 'manual', lightColor: '#222222', darkColor: '#EEEEEE', version: 1, ... }
   */
  public createManualConfig(lightColor: string, darkColor: string): ThemeAdaptiveColorConfig {
    const sanitizedLight = sanitizeColor(lightColor);
    const sanitizedDark = sanitizeColor(darkColor);

    if (!sanitizedLight || !sanitizedDark) {
      throw new Error(`Invalid colors: ${lightColor}, ${darkColor}`);
    }

    return {
      mode: 'manual',
      lightColor: sanitizedLight,
      darkColor: sanitizedDark,
      version: CURRENT_VERSION,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }

  /**
   * Migrate a legacy color string to new configuration format
   *
   * @param legacyColor - Legacy color string (hex)
   * @param baseTheme - Theme this color was configured for
   * @returns New theme-adaptive color configuration
   *
   * @example
   * const config = storage.migrateLegacyColor('#FF0000', 'light');
   * // { mode: 'auto', baseTheme: 'light', baseColor: '#FF0000', version: 1, ... }
   */
  public migrateLegacyColor(
    legacyColor: string | undefined,
    baseTheme: ThemeAppearance = DEFAULT_BASE_THEME
  ): ThemeAdaptiveColorConfig | undefined {
    if (!legacyColor) {
      return undefined;
    }

    const sanitized = sanitizeColor(legacyColor);
    if (!sanitized) {
      return undefined;
    }

    return this.createAutoConfig(sanitized, baseTheme);
  }

  /**
   * Migrate a legacy Style object to StyleV2 with color configs
   *
   * @param legacyStyle - Legacy style object
   * @param baseTheme - Theme this style was configured for
   * @returns Migrated StyleV2 object
   *
   * @example
   * const style = { textColor: '#000000', fillColor: '#FFFFFF', fontBold: true };
   * const styleV2 = storage.migrateStyle(style, 'light');
   * // {
   * //   textColor: '#000000',
   * //   textColorConfig: { mode: 'auto', baseTheme: 'light', baseColor: '#000000', ... },
   * //   fillColor: '#FFFFFF',
   * //   fillColorConfig: { mode: 'auto', baseTheme: 'light', baseColor: '#FFFFFF', ... },
   * //   fontBold: true
   * // }
   */
  public migrateStyle(legacyStyle: any, baseTheme: ThemeAppearance = DEFAULT_BASE_THEME): StyleV2 {
    const styleV2: StyleV2 = { ...legacyStyle };

    // Migrate textColor if present and textColorConfig not already present
    if (legacyStyle.textColor && !legacyStyle.textColorConfig) {
      styleV2.textColorConfig = this.migrateLegacyColor(legacyStyle.textColor, baseTheme);
    }

    // Migrate fillColor if present and fillColorConfig not already present
    if (legacyStyle.fillColor && !legacyStyle.fillColorConfig) {
      styleV2.fillColorConfig = this.migrateLegacyColor(legacyStyle.fillColor, baseTheme);
    }

    return styleV2;
  }

  /**
   * Update an existing color configuration
   *
   * @param config - Existing configuration
   * @param updates - Partial updates to apply
   * @returns Updated configuration
   */
  public updateConfig(
    config: ThemeAdaptiveColorConfig,
    updates: Partial<ThemeAdaptiveColorConfig>
  ): ThemeAdaptiveColorConfig {
    const updated = {
      ...config,
      ...updates,
      updatedAt: Date.now(),
    };

    // Validate the updated config
    const validation = this.validateConfig(updated);
    if (!validation.valid) {
      throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
    }

    return updated;
  }

  /**
   * Validate a color configuration
   *
   * @param config - Configuration to validate
   * @returns Validation result
   */
  public validateConfig(config: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required fields
    if (!config.mode) {
      errors.push('Missing required field: mode');
    } else if (config.mode !== 'auto' && config.mode !== 'manual') {
      errors.push(`Invalid mode: ${config.mode}`);
    }

    if (!config.version) {
      errors.push('Missing required field: version');
    }

    // Validate based on mode
    if (config.mode === 'auto') {
      if (!config.baseTheme) {
        errors.push('Auto mode requires baseTheme');
      }
      if (!config.baseColor) {
        errors.push('Auto mode requires baseColor');
      } else if (!isValidHex(config.baseColor)) {
        errors.push(`Invalid baseColor format: ${config.baseColor}`);
      }
    } else if (config.mode === 'manual') {
      if (!config.lightColor) {
        errors.push('Manual mode requires lightColor');
      } else if (!isValidHex(config.lightColor)) {
        errors.push(`Invalid lightColor format: ${config.lightColor}`);
      }
      if (!config.darkColor) {
        errors.push('Manual mode requires darkColor');
      } else if (!isValidHex(config.darkColor)) {
        errors.push(`Invalid darkColor format: ${config.darkColor}`);
      }
    }

    // Warnings for version mismatch
    if (config.version < CURRENT_VERSION) {
      warnings.push(`Configuration version ${config.version} is older than current version ${CURRENT_VERSION}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Serialize a color configuration to JSON string
   *
   * @param config - Configuration to serialize
   * @returns JSON string
   */
  public serialize(config: ThemeAdaptiveColorConfig): string {
    return JSON.stringify(config);
  }

  /**
   * Deserialize a JSON string to color configuration
   *
   * @param json - JSON string
   * @returns Color configuration
   * @throws Error if JSON is invalid or validation fails
   */
  public deserialize(json: string): ThemeAdaptiveColorConfig {
    try {
      const config = JSON.parse(json);
      const validation = this.validateConfig(config);

      if (!validation.valid) {
        throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
      }

      return config;
    } catch (error) {
      throw new Error(`Failed to deserialize color configuration: ${error}`);
    }
  }

  /**
   * Get the effective color for a given theme
   *
   * This resolves the actual color to use based on configuration mode and current theme.
   * Does NOT perform conversion - that's the job of ColorConverter.
   *
   * @param config - Color configuration
   * @param currentTheme - Current theme appearance
   * @returns Effective color (hex string), or undefined if config is undefined
   */
  public getEffectiveColor(
    config: ThemeAdaptiveColorConfig | undefined,
    currentTheme: ThemeAppearance
  ): string | undefined {
    if (!config) {
      return undefined;
    }

    if (config.mode === 'manual') {
      // Manual mode: return theme-specific color
      return currentTheme === 'light' ? config.lightColor : config.darkColor;
    } else {
      // Auto mode: return base color (conversion happens elsewhere)
      return config.baseColor;
    }
  }

  /**
   * Check if a configuration needs migration to current version
   *
   * @param config - Configuration to check
   * @returns True if migration is needed
   */
  public needsMigration(config: ThemeAdaptiveColorConfig): boolean {
    return config.version < CURRENT_VERSION;
  }

  /**
   * Migrate configuration to current version
   *
   * @param config - Configuration to migrate
   * @returns Migrated configuration
   */
  public migrateToCurrentVersion(config: ThemeAdaptiveColorConfig): ThemeAdaptiveColorConfig {
    let migrated = { ...config };

    // Version 1 is current, no migrations needed yet
    // Future versions would add migration logic here

    migrated.version = CURRENT_VERSION;
    migrated.updatedAt = Date.now();

    return migrated;
  }

  /**
   * Convert auto-mode config to manual-mode config
   *
   * @param autoConfig - Auto-mode configuration
   * @param lightColor - Explicit light theme color
   * @param darkColor - Explicit dark theme color
   * @returns Manual-mode configuration
   */
  public convertToManual(
    autoConfig: ThemeAdaptiveColorConfig,
    lightColor: string,
    darkColor: string
  ): ThemeAdaptiveColorConfig {
    if (autoConfig.mode !== 'auto') {
      throw new Error('Can only convert auto-mode configs to manual');
    }

    return this.createManualConfig(lightColor, darkColor);
  }

  /**
   * Convert manual-mode config to auto-mode config
   *
   * @param manualConfig - Manual-mode configuration
   * @param baseTheme - Which theme to use as base
   * @returns Auto-mode configuration
   */
  public convertToAuto(
    manualConfig: ThemeAdaptiveColorConfig,
    baseTheme: ThemeAppearance
  ): ThemeAdaptiveColorConfig {
    if (manualConfig.mode !== 'manual') {
      throw new Error('Can only convert manual-mode configs to auto');
    }

    const baseColor = baseTheme === 'light' ? manualConfig.lightColor! : manualConfig.darkColor!;
    return this.createAutoConfig(baseColor, baseTheme);
  }

  /**
   * Batch migrate multiple styles
   *
   * @param styles - Array of legacy styles
   * @param baseTheme - Theme these styles were configured for
   * @returns Migration result with statistics
   */
  public batchMigrateStyles(
    styles: any[],
    baseTheme: ThemeAppearance = DEFAULT_BASE_THEME
  ): MigrationResult {
    const startTime = Date.now();
    const errors: MigrationError[] = [];
    let fieldsMigrated = 0;

    styles.forEach((style, index) => {
      try {
        const migrated = this.migrateStyle(style, baseTheme);

        // Count migrated fields
        if (migrated.textColorConfig && !style.textColorConfig) {
          fieldsMigrated++;
        }
        if (migrated.fillColorConfig && !style.fillColorConfig) {
          fieldsMigrated++;
        }
      } catch (error) {
        errors.push({
          fieldId: style.fieldId || `style_${index}`,
          error: String(error),
          originalConfig: style,
        });
      }
    });

    const duration = Date.now() - startTime;

    return {
      fieldsMigrated,
      rulesMigrated: 0, // Not applicable for this method
      errors,
      duration,
    };
  }

  /**
   * Deep clone a color configuration
   *
   * @param config - Configuration to clone
   * @returns Cloned configuration
   */
  public clone(config: ThemeAdaptiveColorConfig): ThemeAdaptiveColorConfig {
    return JSON.parse(JSON.stringify(config));
  }

  /**
   * Compare two configurations for equality
   *
   * @param config1 - First configuration
   * @param config2 - Second configuration
   * @returns True if configurations are equal
   */
  public equals(config1: ThemeAdaptiveColorConfig, config2: ThemeAdaptiveColorConfig): boolean {
    // Compare mode
    if (config1.mode !== config2.mode) {
      return false;
    }

    // Compare based on mode
    if (config1.mode === 'auto') {
      return (
        config1.baseTheme === config2.baseTheme &&
        config1.baseColor === config2.baseColor
      );
    } else {
      return (
        config1.lightColor === config2.lightColor &&
        config1.darkColor === config2.darkColor
      );
    }
  }

  /**
   * Create a configuration from a legacy style object if it has color data
   *
   * @param legacyStyle - Legacy style object
   * @param role - Color role (text or fill)
   * @param baseTheme - Theme this color was configured for
   * @returns Color configuration or undefined
   */
  public extractColorConfig(
    legacyStyle: any,
    role: ColorRole,
    baseTheme: ThemeAppearance = DEFAULT_BASE_THEME
  ): ThemeAdaptiveColorConfig | undefined {
    const colorField = role === 'text' ? 'textColor' : 'fillColor';
    const configField = role === 'text' ? 'textColorConfig' : 'fillColorConfig';

    // If already has new config, return it
    if (legacyStyle[configField]) {
      return legacyStyle[configField];
    }

    // Otherwise, migrate from legacy field
    return this.migrateLegacyColor(legacyStyle[colorField], baseTheme);
  }
}

/**
 * Singleton instance for convenience
 */
export const colorStorage = new ColorStorage();

/**
 * Convenience function to create auto-mode config
 */
export function createAutoConfig(
  baseColor: string,
  baseTheme: ThemeAppearance = DEFAULT_BASE_THEME
): ThemeAdaptiveColorConfig {
  return colorStorage.createAutoConfig(baseColor, baseTheme);
}

/**
 * Convenience function to create manual-mode config
 */
export function createManualConfig(
  lightColor: string,
  darkColor: string
): ThemeAdaptiveColorConfig {
  return colorStorage.createManualConfig(lightColor, darkColor);
}

/**
 * Convenience function to migrate legacy style
 */
export function migrateStyle(
  legacyStyle: any,
  baseTheme: ThemeAppearance = DEFAULT_BASE_THEME
): StyleV2 {
  return colorStorage.migrateStyle(legacyStyle, baseTheme);
}

/**
 * Convenience function to validate config
 */
export function validateConfig(config: any): ValidationResult {
  return colorStorage.validateConfig(config);
}
