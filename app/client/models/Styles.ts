import { ThemeAdaptiveColorConfig } from 'app/client/lib/colors/types';

export interface Style {
  // Legacy color fields (backward compatibility)
  textColor?: string|undefined; // this can be string, undefined or an absent key.
  fillColor?: string|undefined;
  // New theme-adaptive color configs
  textColorConfig?: ThemeAdaptiveColorConfig;
  fillColorConfig?: ThemeAdaptiveColorConfig;
  // Font styles
  fontBold?: boolean|undefined;
  fontUnderline?: boolean|undefined;
  fontItalic?: boolean|undefined;
  fontStrikethrough?: boolean|undefined;
}

export interface HeaderStyle {
  // Legacy color fields (backward compatibility)
  headerTextColor?: string | undefined; // this can be string, undefined or an absent key.
  headerFillColor?: string | undefined;
  // New theme-adaptive color configs
  headerTextColorConfig?: ThemeAdaptiveColorConfig;
  headerFillColorConfig?: ThemeAdaptiveColorConfig;
  // Font styles
  headerFontBold?: boolean | undefined;
  headerFontUnderline?: boolean | undefined;
  headerFontItalic?: boolean | undefined;
  headerFontStrikethrough?: boolean | undefined;
}

export class CombinedStyle implements Style {
  public readonly textColor?: string;
  public readonly fillColor?: string;
  public readonly textColorConfig?: ThemeAdaptiveColorConfig;
  public readonly fillColorConfig?: ThemeAdaptiveColorConfig;
  public readonly fontBold?: boolean;
  public readonly fontUnderline?: boolean;
  public readonly fontItalic?: boolean;
  public readonly fontStrikethrough?: boolean;
  constructor(rules: (Style|undefined|null)[], flags: any[]) {
    for (let i = 0; i < rules.length; i++) {
      if (flags[i]) {
        const textColor = rules[i]?.textColor;
        const fillColor = rules[i]?.fillColor;
        const textColorConfig = rules[i]?.textColorConfig;
        const fillColorConfig = rules[i]?.fillColorConfig;
        const fontBold = rules[i]?.fontBold;
        const fontUnderline = rules[i]?.fontUnderline;
        const fontItalic = rules[i]?.fontItalic;
        const fontStrikethrough = rules[i]?.fontStrikethrough;
        this.textColor = textColor || this.textColor;
        this.fillColor = fillColor || this.fillColor;
        this.textColorConfig = textColorConfig || this.textColorConfig;
        this.fillColorConfig = fillColorConfig || this.fillColorConfig;
        this.fontBold = fontBold || this.fontBold;
        this.fontUnderline = fontUnderline || this.fontUnderline;
        this.fontItalic = fontItalic || this.fontItalic;
        this.fontStrikethrough = fontStrikethrough || this.fontStrikethrough;
      }
    }
  }
}
