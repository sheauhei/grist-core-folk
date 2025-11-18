/**
 * Tests for color storage and migration
 */

import {
  ColorStorage,
  CURRENT_VERSION,
  DEFAULT_BASE_THEME,
} from 'app/client/lib/colors/ColorStorage';
import { assert } from 'chai';

describe('colors/ColorStorage', function () {
  let storage: ColorStorage;

  beforeEach(function () {
    storage = new ColorStorage();
  });

  // ============================================================================
  // Configuration Creation
  // ============================================================================

  describe('createAutoConfig', function () {
    it('should create auto-mode configuration', function () {
      const config = storage.createAutoConfig('#FF0000', 'light');

      assert.equal(config.mode, 'auto');
      assert.equal(config.baseTheme, 'light');
      assert.equal(config.baseColor, '#FF0000');
      assert.equal(config.version, CURRENT_VERSION);
      assert.isNumber(config.createdAt);
      assert.isNumber(config.updatedAt);
    });

    it('should use default theme if not specified', function () {
      const config = storage.createAutoConfig('#FF0000');
      assert.equal(config.baseTheme, DEFAULT_BASE_THEME);
    });

    it('should normalize and sanitize colors', function () {
      const config = storage.createAutoConfig('ff0000'); // No #
      assert.equal(config.baseColor, '#FF0000');
    });

    it('should throw on invalid colors', function () {
      assert.throws(() => storage.createAutoConfig('#GG0000'));
      assert.throws(() => storage.createAutoConfig('invalid'));
    });
  });

  describe('createManualConfig', function () {
    it('should create manual-mode configuration', function () {
      const config = storage.createManualConfig('#222222', '#EEEEEE');

      assert.equal(config.mode, 'manual');
      assert.equal(config.lightColor, '#222222');
      assert.equal(config.darkColor, '#EEEEEE');
      assert.equal(config.version, CURRENT_VERSION);
    });

    it('should normalize colors', function () {
      const config = storage.createManualConfig('222', 'eee');
      assert.equal(config.lightColor, '#222222');
      assert.equal(config.darkColor, '#EEEEEE');
    });

    it('should throw on invalid colors', function () {
      assert.throws(() => storage.createManualConfig('#GG0000', '#EEEEEE'));
      assert.throws(() => storage.createManualConfig('#222222', 'invalid'));
    });
  });

  // ============================================================================
  // Migration
  // ============================================================================

  describe('migrateLegacyColor', function () {
    it('should migrate legacy color string', function () {
      const config = storage.migrateLegacyColor('#FF0000', 'light');

      assert.isDefined(config);
      assert.equal(config!.mode, 'auto');
      assert.equal(config!.baseColor, '#FF0000');
      assert.equal(config!.baseTheme, 'light');
    });

    it('should return undefined for undefined input', function () {
      const config = storage.migrateLegacyColor(undefined);
      assert.isUndefined(config);
    });

    it('should return undefined for invalid colors', function () {
      const config = storage.migrateLegacyColor('#GG0000');
      assert.isUndefined(config);
    });
  });

  describe('migrateStyle', function () {
    it('should migrate style with colors', function () {
      const legacyStyle = {
        textColor: '#000000',
        fillColor: '#FFFFFF',
        fontBold: true,
      };

      const migrated = storage.migrateStyle(legacyStyle, 'light');

      assert.equal(migrated.textColor, '#000000');
      assert.equal(migrated.fillColor, '#FFFFFF');
      assert.equal(migrated.fontBold, true);
      assert.isDefined(migrated.textColorConfig);
      assert.isDefined(migrated.fillColorConfig);
      assert.equal(migrated.textColorConfig!.baseColor, '#000000');
      assert.equal(migrated.fillColorConfig!.baseColor, '#FFFFFF');
    });

    it('should not override existing configs', function () {
      const styleWithConfig = {
        textColor: '#000000',
        textColorConfig: {
          mode: 'manual' as const,
          lightColor: '#111111',
          darkColor: '#EEEEEE',
          version: 1,
        },
      };

      const migrated = storage.migrateStyle(styleWithConfig, 'light');

      // Should keep existing config
      assert.equal(migrated.textColorConfig!.mode, 'manual');
      assert.equal(migrated.textColorConfig!.lightColor, '#111111');
    });

    it('should handle styles without colors', function () {
      const styleWithoutColors = {
        fontBold: true,
        fontItalic: false,
      };

      const migrated = storage.migrateStyle(styleWithoutColors, 'light');

      assert.equal(migrated.fontBold, true);
      assert.isUndefined(migrated.textColorConfig);
      assert.isUndefined(migrated.fillColorConfig);
    });
  });

  describe('batchMigrateStyles', function () {
    it('should migrate multiple styles', function () {
      const styles = [
        { textColor: '#000000' },
        { fillColor: '#FFFFFF' },
        { textColor: '#333333', fillColor: '#F5F5F5' },
      ];

      const result = storage.batchMigrateStyles(styles, 'light');

      assert.equal(result.fieldsMigrated, 4); // 1 + 1 + 2
      assert.equal(result.errors.length, 0);
      assert.isNumber(result.duration);
    });

    it('should handle errors gracefully', function () {
      const styles = [
        { textColor: '#000000' },
        { textColor: '#GG0000' }, // Invalid
        { textColor: '#333333' },
      ];

      const result = storage.batchMigrateStyles(styles, 'light');

      // Should migrate valid ones and record errors
      assert.isAtLeast(result.fieldsMigrated, 2);
    });
  });

  // ============================================================================
  // Validation
  // ============================================================================

  describe('validateConfig', function () {
    it('should validate correct auto-mode config', function () {
      const config = storage.createAutoConfig('#FF0000', 'light');
      const validation = storage.validateConfig(config);

      assert.isTrue(validation.valid);
      assert.equal(validation.errors.length, 0);
    });

    it('should validate correct manual-mode config', function () {
      const config = storage.createManualConfig('#222222', '#EEEEEE');
      const validation = storage.validateConfig(config);

      assert.isTrue(validation.valid);
      assert.equal(validation.errors.length, 0);
    });

    it('should reject config without mode', function () {
      const invalid = { version: 1 };
      const validation = storage.validateConfig(invalid);

      assert.isFalse(validation.valid);
      assert.include(validation.errors.join(), 'mode');
    });

    it('should reject auto-mode without baseTheme', function () {
      const invalid = {
        mode: 'auto',
        baseColor: '#FF0000',
        version: 1,
      };
      const validation = storage.validateConfig(invalid);

      assert.isFalse(validation.valid);
      assert.include(validation.errors.join(), 'baseTheme');
    });

    it('should reject auto-mode without baseColor', function () {
      const invalid = {
        mode: 'auto',
        baseTheme: 'light',
        version: 1,
      };
      const validation = storage.validateConfig(invalid);

      assert.isFalse(validation.valid);
      assert.include(validation.errors.join(), 'baseColor');
    });

    it('should reject manual-mode without lightColor', function () {
      const invalid = {
        mode: 'manual',
        darkColor: '#EEEEEE',
        version: 1,
      };
      const validation = storage.validateConfig(invalid);

      assert.isFalse(validation.valid);
      assert.include(validation.errors.join(), 'lightColor');
    });

    it('should reject invalid hex colors', function () {
      const invalid = {
        mode: 'auto',
        baseTheme: 'light',
        baseColor: '#GG0000',
        version: 1,
      };
      const validation = storage.validateConfig(invalid);

      assert.isFalse(validation.valid);
      assert.include(validation.errors.join(), 'Invalid');
    });

    it('should warn about old versions', function () {
      const oldConfig = {
        mode: 'auto',
        baseTheme: 'light',
        baseColor: '#FF0000',
        version: 0,
      };
      const validation = storage.validateConfig(oldConfig);

      assert.isTrue(validation.valid); // Still valid, just old
      assert.isAbove(validation.warnings.length, 0);
      assert.include(validation.warnings.join(), 'older');
    });
  });

  // ============================================================================
  // Serialization
  // ============================================================================

  describe('serialize/deserialize', function () {
    it('should serialize config to JSON', function () {
      const config = storage.createAutoConfig('#FF0000', 'light');
      const json = storage.serialize(config);

      assert.isString(json);
      const parsed = JSON.parse(json);
      assert.equal(parsed.baseColor, '#FF0000');
    });

    it('should deserialize JSON to config', function () {
      const config = storage.createAutoConfig('#FF0000', 'light');
      const json = storage.serialize(config);
      const deserialized = storage.deserialize(json);

      assert.deepEqual(deserialized, config);
    });

    it('should throw on invalid JSON', function () {
      assert.throws(() => storage.deserialize('invalid json'));
      assert.throws(() => storage.deserialize('{}'));
    });

    it('should validate during deserialization', function () {
      const invalidJson = JSON.stringify({ mode: 'auto', version: 1 });
      assert.throws(() => storage.deserialize(invalidJson));
    });
  });

  // ============================================================================
  // Effective Color Resolution
  // ============================================================================

  describe('getEffectiveColor', function () {
    it('should return base color for auto-mode', function () {
      const config = storage.createAutoConfig('#FF0000', 'light');
      const effective = storage.getEffectiveColor(config, 'light');

      assert.equal(effective, '#FF0000');
    });

    it('should return theme-specific color for manual-mode', function () {
      const config = storage.createManualConfig('#222222', '#EEEEEE');

      const lightEffective = storage.getEffectiveColor(config, 'light');
      const darkEffective = storage.getEffectiveColor(config, 'dark');

      assert.equal(lightEffective, '#222222');
      assert.equal(darkEffective, '#EEEEEE');
    });

    it('should return undefined for undefined config', function () {
      const effective = storage.getEffectiveColor(undefined, 'light');
      assert.isUndefined(effective);
    });
  });

  // ============================================================================
  // Configuration Updates
  // ============================================================================

  describe('updateConfig', function () {
    it('should update configuration', function () {
      const config = storage.createAutoConfig('#FF0000', 'light');
      const updated = storage.updateConfig(config, { baseColor: '#00FF00' });

      assert.equal(updated.baseColor, '#00FF00');
      assert.isAbove(updated.updatedAt!, config.updatedAt!);
    });

    it('should validate updates', function () {
      const config = storage.createAutoConfig('#FF0000', 'light');
      assert.throws(() => storage.updateConfig(config, { baseColor: 'invalid' }));
    });

    it('should preserve other fields', function () {
      const config = storage.createAutoConfig('#FF0000', 'light');
      const updated = storage.updateConfig(config, { baseColor: '#00FF00' });

      assert.equal(updated.baseTheme, config.baseTheme);
      assert.equal(updated.version, config.version);
    });
  });

  // ============================================================================
  // Mode Conversion
  // ============================================================================

  describe('convertToManual', function () {
    it('should convert auto to manual mode', function () {
      const autoConfig = storage.createAutoConfig('#FF0000', 'light');
      const manual = storage.convertToManual(autoConfig, '#222222', '#EEEEEE');

      assert.equal(manual.mode, 'manual');
      assert.equal(manual.lightColor, '#222222');
      assert.equal(manual.darkColor, '#EEEEEE');
    });

    it('should throw if not auto mode', function () {
      const manualConfig = storage.createManualConfig('#222222', '#EEEEEE');
      assert.throws(() => storage.convertToManual(manualConfig, '#000000', '#FFFFFF'));
    });
  });

  describe('convertToAuto', function () {
    it('should convert manual to auto mode', function () {
      const manualConfig = storage.createManualConfig('#222222', '#EEEEEE');
      const auto = storage.convertToAuto(manualConfig, 'light');

      assert.equal(auto.mode, 'auto');
      assert.equal(auto.baseTheme, 'light');
      assert.equal(auto.baseColor, '#222222'); // Uses light color
    });

    it('should use correct base color based on theme', function () {
      const manualConfig = storage.createManualConfig('#222222', '#EEEEEE');
      const autoDark = storage.convertToAuto(manualConfig, 'dark');

      assert.equal(autoDark.baseColor, '#EEEEEE'); // Uses dark color
    });

    it('should throw if not manual mode', function () {
      const autoConfig = storage.createAutoConfig('#FF0000', 'light');
      assert.throws(() => storage.convertToAuto(autoConfig, 'light'));
    });
  });

  // ============================================================================
  // Utility Methods
  // ============================================================================

  describe('clone', function () {
    it('should create deep copy', function () {
      const config = storage.createAutoConfig('#FF0000', 'light');
      const cloned = storage.clone(config);

      assert.deepEqual(cloned, config);
      assert.notStrictEqual(cloned, config); // Different object
    });

    it('should allow independent modification', function () {
      const config = storage.createAutoConfig('#FF0000', 'light');
      const cloned = storage.clone(config);

      cloned.baseColor = '#00FF00';
      assert.equal(config.baseColor, '#FF0000'); // Original unchanged
    });
  });

  describe('equals', function () {
    it('should detect equal auto configs', function () {
      const config1 = storage.createAutoConfig('#FF0000', 'light');
      const config2 = storage.createAutoConfig('#FF0000', 'light');

      assert.isTrue(storage.equals(config1, config2));
    });

    it('should detect unequal auto configs', function () {
      const config1 = storage.createAutoConfig('#FF0000', 'light');
      const config2 = storage.createAutoConfig('#00FF00', 'light');

      assert.isFalse(storage.equals(config1, config2));
    });

    it('should detect equal manual configs', function () {
      const config1 = storage.createManualConfig('#222222', '#EEEEEE');
      const config2 = storage.createManualConfig('#222222', '#EEEEEE');

      assert.isTrue(storage.equals(config1, config2));
    });

    it('should detect unequal manual configs', function () {
      const config1 = storage.createManualConfig('#222222', '#EEEEEE');
      const config2 = storage.createManualConfig('#333333', '#EEEEEE');

      assert.isFalse(storage.equals(config1, config2));
    });

    it('should detect different modes', function () {
      const auto = storage.createAutoConfig('#FF0000', 'light');
      const manual = storage.createManualConfig('#FF0000', '#FF0000');

      assert.isFalse(storage.equals(auto, manual));
    });
  });

  describe('extractColorConfig', function () {
    it('should extract text color config', function () {
      const style = { textColor: '#FF0000' };
      const config = storage.extractColorConfig(style, 'text', 'light');

      assert.isDefined(config);
      assert.equal(config!.baseColor, '#FF0000');
    });

    it('should extract fill color config', function () {
      const style = { fillColor: '#FFFFFF' };
      const config = storage.extractColorConfig(style, 'fill', 'light');

      assert.isDefined(config);
      assert.equal(config!.baseColor, '#FFFFFF');
    });

    it('should prefer existing config', function () {
      const existingConfig = storage.createManualConfig('#222222', '#EEEEEE');
      const style = {
        textColor: '#FF0000',
        textColorConfig: existingConfig,
      };

      const config = storage.extractColorConfig(style, 'text', 'light');

      assert.equal(config!.mode, 'manual');
      assert.equal(config!.lightColor, '#222222');
    });

    it('should return undefined for missing color', function () {
      const style = { fontBold: true };
      const config = storage.extractColorConfig(style, 'text', 'light');

      assert.isUndefined(config);
    });
  });

  // ============================================================================
  // Version Management
  // ============================================================================

  describe('version management', function () {
    it('should detect current version', function () {
      const config = storage.createAutoConfig('#FF0000', 'light');
      assert.isFalse(storage.needsMigration(config));
    });

    it('should detect old version', function () {
      const oldConfig = {
        mode: 'auto' as const,
        baseTheme: 'light' as const,
        baseColor: '#FF0000',
        version: 0,
      };
      assert.isTrue(storage.needsMigration(oldConfig));
    });

    it('should migrate to current version', function () {
      const oldConfig = {
        mode: 'auto' as const,
        baseTheme: 'light' as const,
        baseColor: '#FF0000',
        version: 0,
      };

      const migrated = storage.migrateToCurrentVersion(oldConfig);

      assert.equal(migrated.version, CURRENT_VERSION);
      assert.isNumber(migrated.updatedAt);
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('edge cases', function () {
    it('should handle empty style objects', function () {
      const style = {};
      const migrated = storage.migrateStyle(style, 'light');

      assert.deepEqual(migrated, {});
    });

    it('should handle partial styles', function () {
      const style = { textColor: '#FF0000' };
      const migrated = storage.migrateStyle(style, 'light');

      assert.isDefined(migrated.textColorConfig);
      assert.isUndefined(migrated.fillColorConfig);
    });

    it('should handle mixed old and new formats', function () {
      const config = storage.createManualConfig('#222222', '#EEEEEE');
      const style = {
        textColor: '#FF0000',
        textColorConfig: config,
        fillColor: '#FFFFFF',
      };

      const migrated = storage.migrateStyle(style, 'light');

      // Should keep existing config, add new one
      assert.equal(migrated.textColorConfig, config);
      assert.isDefined(migrated.fillColorConfig);
    });
  });
});
