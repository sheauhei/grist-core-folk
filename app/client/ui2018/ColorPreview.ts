/**
 * ColorPreview - Dual-theme color preview component
 *
 * Shows how text and fill colors will appear in both light and dark themes,
 * along with WCAG contrast ratio information.
 */

import { contrastChecker } from 'app/client/lib/colors/ContrastChecker';
import { themeAdaptiveColor } from 'app/client/lib/colors/ThemeAdaptiveColor';
import { ThemeAdaptiveColorConfig } from 'app/client/lib/colors/types';
import { makeT } from 'app/client/lib/localization';
import { testId, theme, vars } from 'app/client/ui2018/cssVars';
import { icon } from 'app/client/ui2018/icons';
import { Computed, Disposable, dom, DomElementArg, Observable, styled } from 'grainjs';

const t = makeT('ColorPreview');

export interface ColorPreviewOptions {
  /** Text color configuration */
  textConfig?: Observable<ThemeAdaptiveColorConfig | undefined>;

  /** Fill color configuration */
  fillConfig?: Observable<ThemeAdaptiveColorConfig | undefined>;

  /** Show both themes side-by-side (default: true) */
  showBothThemes?: boolean;

  /** Show contrast ratio information (default: true) */
  showContrastInfo?: boolean;

  /** Sample text to display (default: "Sample") */
  sampleText?: string;
}

/**
 * Create a color preview component showing how colors look in light and dark themes
 */
export function colorPreview(options: ColorPreviewOptions, ...domArgs: DomElementArg[]): Element {
  return ColorPreview.create(null, options).buildDom(...domArgs);
}

class ColorPreview extends Disposable {
  private _textConfig = this._options.textConfig ?? Observable.create(this, undefined);
  private _fillConfig = this._options.fillConfig ?? Observable.create(this, undefined);
  private _showBothThemes = this._options.showBothThemes ?? true;
  private _showContrastInfo = this._options.showContrastInfo ?? true;
  private _sampleText = this._options.sampleText ?? t("Sample");

  // Resolved colors for light theme
  private _lightTextColor = Computed.create(this, this._textConfig, (_use, config) => {
    return themeAdaptiveColor.resolveColor(config, 'text', 'light') || '#000000';
  });

  private _lightFillColor = Computed.create(this, this._fillConfig, (_use, config) => {
    return themeAdaptiveColor.resolveColor(config, 'fill', 'light') || '#FFFFFF';
  });

  // Resolved colors for dark theme
  private _darkTextColor = Computed.create(this, this._textConfig, (_use, config) => {
    return themeAdaptiveColor.resolveColor(config, 'text', 'dark') || '#FFFFFF';
  });

  private _darkFillColor = Computed.create(this, this._fillConfig, (_use, config) => {
    return themeAdaptiveColor.resolveColor(config, 'fill', 'dark') || '#000000';
  });

  // Contrast info for light theme
  private _lightContrastInfo = Computed.create(
    this,
    this._lightTextColor,
    this._lightFillColor,
    (_use, textColor, fillColor) => {
      return contrastChecker.getContrastInfo(textColor, fillColor);
    }
  );

  // Contrast info for dark theme
  private _darkContrastInfo = Computed.create(
    this,
    this._darkTextColor,
    this._darkFillColor,
    (_use, textColor, fillColor) => {
      return contrastChecker.getContrastInfo(textColor, fillColor);
    }
  );

  constructor(private _options: ColorPreviewOptions) {
    super();
  }

  public buildDom(...domArgs: DomElementArg[]): Element {
    if (this._showBothThemes) {
      return this._buildDualThemePreview(...domArgs);
    } else {
      return this._buildSingleThemePreview(...domArgs);
    }
  }

  private _buildDualThemePreview(...domArgs: DomElementArg[]): Element {
    return cssPreviewContainer(
      cssPreviewRow(
        this._buildThemePreview('light'),
        this._buildThemePreview('dark'),
      ),
      testId('color-preview-dual'),
      ...domArgs,
    );
  }

  private _buildSingleThemePreview(...domArgs: DomElementArg[]): Element {
    // For single theme, show the current active theme
    // For now, we'll show light theme as default
    return cssPreviewContainer(
      this._buildThemePreview('light'),
      testId('color-preview-single'),
      ...domArgs,
    );
  }

  private _buildThemePreview(themeType: 'light' | 'dark'): Element {
    const textColor = themeType === 'light' ? this._lightTextColor : this._darkTextColor;
    const fillColor = themeType === 'light' ? this._lightFillColor : this._darkFillColor;
    const contrastInfo = themeType === 'light' ? this._lightContrastInfo : this._darkContrastInfo;

    return cssThemePreview(
      // Theme label
      cssThemeLabel(
        themeType === 'light' ? t("Light Theme") : t("Dark Theme"),
        testId(`preview-${themeType}-label`),
      ),

      // Sample box showing the actual colors
      cssSampleBox(
        dom.style('color', textColor),
        dom.style('background-color', fillColor),
        dom.text(this._sampleText),
        testId(`preview-${themeType}-sample`),
      ),

      // Contrast information
      this._showContrastInfo ? dom.maybe(contrastInfo, (info) =>
        cssContrastInfo(
          this._buildContrastBadge(info.level),
          cssContrastRatio(
            t("Contrast: "),
            dom('span', dom.text(use => use(contrastInfo)?.ratio.toFixed(2) || '0')),
            ':1',
            testId(`preview-${themeType}-ratio`),
          ),
          testId(`preview-${themeType}-contrast`),
        )
      ) : null,

      testId(`preview-${themeType}`),
    );
  }

  private _buildContrastBadge(level: 'AAA' | 'AA' | 'Fail'): Element {
    const isPass = level !== 'Fail';
    const badgeIcon = isPass ? 'Tick' : 'CrossSmall';
    const badgeClass = level === 'AAA' ? '-aaa' : level === 'AA' ? '-aa' : '-fail';

    return cssContrastBadge(
      cssContrastBadge.cls(badgeClass),
      cssContrastIcon(badgeIcon),
      dom('span', level === 'Fail' ? t("Fail") : `WCAG ${level}`),
      testId(`contrast-badge-${level.toLowerCase()}`),
    );
  }
}

// ============================================================================
// Styled Components
// ============================================================================

const cssPreviewContainer = styled('div', `
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  background-color: ${theme.hover};
  border: 1px solid ${theme.modalBorderDark};
  border-radius: 4px;
`);

const cssPreviewRow = styled('div', `
  display: flex;
  gap: 16px;
  align-items: stretch;

  & > * {
    flex: 1;
  }
`);

const cssThemePreview = styled('div', `
  display: flex;
  flex-direction: column;
  gap: 8px;
`);

const cssThemeLabel = styled('div', `
  font-size: ${vars.smallFontSize};
  font-weight: 600;
  color: ${theme.text};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`);

const cssSampleBox = styled('div', `
  min-height: 48px;
  padding: 12px 16px;
  border-radius: 4px;
  border: 1px solid ${theme.modalBorderDark};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${vars.mediumFontSize};
  font-weight: 500;
  transition: all 0.2s ease;

  /* Ensure text is readable even with extreme colors */
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`);

const cssContrastInfo = styled('div', `
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: ${vars.smallFontSize};
`);

const cssContrastBadge = styled('div', `
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: ${vars.xsmallFontSize};
  font-weight: 600;
  text-transform: uppercase;

  &.-aaa {
    background-color: #E8F5E9;
    color: #2E7D32;
  }

  &.-aa {
    background-color: #FFF3E0;
    color: #E65100;
  }

  &.-fail {
    background-color: #FFEBEE;
    color: #C62828;
  }
`);

const cssContrastIcon = styled(icon, `
  width: 12px;
  height: 12px;
  --icon-color: currentColor;
`);

const cssContrastRatio = styled('div', `
  color: ${theme.lightText};

  & > span {
    font-weight: 600;
    color: ${theme.text};
  }
`);
