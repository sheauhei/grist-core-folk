# Feature 002: 主題自適應顏色系統 - 實作計劃

## 📅 文件資訊
- **建立日期**: 2025-11-18
- **功能編號**: 002
- **功能名稱**: Theme-Adaptive Colors (主題自適應顏色)
- **文件類型**: 實作計劃
- **狀態**: 草稿
- **前置文件**:
  - [需求規格](./spec.md)
  - [技術設計](./design.md)

---

## 🎯 實作目標與範圍

### 主要目標

1. ✅ 實現主題自適應顏色核心功能
2. ✅ 整合到現有的顏色配置系統
3. ✅ 提供友善的使用者介面
4. ✅ 確保向後相容性
5. ✅ 達到效能和品質指標

### 範圍界定

**包含在內**:
- 核心顏色轉換演算法
- 雙主題預覽 UI
- 自動/手動模式切換
- 現有資料遷移
- 完整的測試覆蓋

**不包含在內**:
- 自訂主題（僅支援 light/dark）
- AI 顏色建議
- 顏色主題匯入/匯出
- 圖片/圖示的主題適應

---

## 📊 整體時程規劃

```
總工時估算: 80-100 小時 (2-2.5 週全職工作)

Phase 1: 基礎建設      [20h] ████████░░░░░░░░░░░░ Week 1.0-1.5
Phase 2: 核心功能      [25h] ░░░░░░░░████████░░░░ Week 1.5-2.5
Phase 3: UI 整合       [15h] ░░░░░░░░░░░░░░██████ Week 2.5-3.0
Phase 4: 資料遷移      [10h] ░░░░░░░░░░░░░░░░████ Week 3.0-3.5
Phase 5: 測試與優化    [15h] ░░░░░░░░░░░░░░░░░░██ Week 3.5-4.0
Phase 6: 文件與發布    [5h]  ░░░░░░░░░░░░░░░░░░░█ Week 4.0

里程碑:
M1: 核心演算法完成     Week 1.5 ✓
M2: 基本功能可用       Week 2.5 ✓
M3: UI 整合完成        Week 3.0 ✓
M4: 測試通過           Week 3.5 ✓
M5: 準備發布           Week 4.0 ✓
```

---

## 📋 Phase 1: 基礎建設 (20 小時)

### 目標
建立核心模組和基礎設施，為後續開發打下基礎。

### 任務清單

#### Task 1.1: 建立專案結構 (2h)

**檔案結構**:
```
app/client/lib/colors/
├── ThemeAdaptiveColor.ts      # 主類
├── ColorConverter.ts           # 轉換演算法
├── ContrastChecker.ts          # 對比度檢查
├── ColorStorage.ts             # 儲存管理
├── ColorPreview.ts             # 預覽組件
├── types.ts                    # TypeScript 類型定義
├── utils.ts                    # 工具函數
└── index.ts                    # 匯出入口

test/client/lib/colors/
├── ColorConverter.test.ts
├── ContrastChecker.test.ts
├── ColorStorage.test.ts
└── ThemeAdaptiveColor.test.ts
```

**執行步驟**:
1. 建立目錄結構
2. 建立空白檔案和基本骨架
3. 設定 TypeScript 類型定義
4. 設定測試框架配置

**驗收標準**:
- [ ] 所有檔案建立完成
- [ ] 可以成功 import 各模組
- [ ] 測試框架可以執行

**預估時間**: 2 小時

---

#### Task 1.2: 實作色彩空間轉換 (6h)

**檔案**: `app/client/lib/colors/utils.ts`

**實作內容**:

```typescript
// RGB ↔ HEX 轉換
export function hexToRgb(hex: string): RGB;
export function rgbToHex(rgb: RGB): string;

// RGB ↔ HSL 轉換
export function rgbToHsl(rgb: RGB): HSL;
export function hslToRgb(hsl: HSL): RGB;

// 便捷函數
export function parseColor(color: string): RGB;
export function hslToHex(hsl: HSL): string;
export function hexToHsl(hex: string): HSL;

// 驗證函數
export function isValidHex(hex: string): boolean;
export function normalizeHex(hex: string): string; // #ABC → #AABBCC
```

**測試案例**:
```typescript
describe('Color Space Conversion', () => {
  it('should convert hex to RGB', () => {
    expect(hexToRgb('#FF0000')).toEqual({ r: 255, g: 0, b: 0 });
    expect(hexToRgb('#00FF00')).toEqual({ r: 0, g: 255, b: 0 });
  });

  it('should convert RGB to HSL', () => {
    const red = rgbToHsl({ r: 255, g: 0, b: 0 });
    expect(red.h).toBeCloseTo(0, 0);
    expect(red.s).toBeCloseTo(1.0, 2);
    expect(red.l).toBeCloseTo(0.5, 2);
  });

  it('should be reversible', () => {
    const original = { r: 200, g: 150, b: 100 };
    const hsl = rgbToHsl(original);
    const back = hslToRgb(hsl);
    expect(back.r).toBeCloseTo(original.r, 0);
    expect(back.g).toBeCloseTo(original.g, 0);
    expect(back.b).toBeCloseTo(original.b, 0);
  });
});
```

**驗收標準**:
- [ ] 所有轉換函數實作完成
- [ ] 單元測試通過
- [ ] 轉換精度誤差 < 1 (RGB 值)
- [ ] 往返轉換誤差 < 2 (RGB 值)

**預估時間**: 6 小時

---

#### Task 1.3: 實作對比度計算 (4h)

**檔案**: `app/client/lib/colors/ContrastChecker.ts`

**實作內容**:

```typescript
export class ContrastChecker {
  // WCAG 相對亮度計算
  getRelativeLuminance(rgb: RGB): number;

  // 對比度計算
  getContrastRatio(color1: string, color2: string): number;

  // WCAG 標準檢查
  meetsWCAG_AA(textColor: string, bgColor: string): boolean;
  meetsWCAG_AAA(textColor: string, bgColor: string): boolean;

  // 獲取對比度等級
  getContrastLevel(ratio: number): 'AAA' | 'AA' | 'Fail';

  // 調整顏色以達到最小對比度
  adjustForContrast(
    textColor: string,
    bgColor: string,
    minRatio?: number
  ): string;
}
```

**測試案例**:
```typescript
describe('ContrastChecker', () => {
  const checker = new ContrastChecker();

  it('should calculate correct luminance', () => {
    const whiteLum = checker.getRelativeLuminance({ r: 255, g: 255, b: 255 });
    expect(whiteLum).toBeCloseTo(1.0, 2);

    const blackLum = checker.getRelativeLuminance({ r: 0, g: 0, b: 0 });
    expect(blackLum).toBeCloseTo(0.0, 2);
  });

  it('should calculate max contrast', () => {
    const ratio = checker.getContrastRatio('#000000', '#FFFFFF');
    expect(ratio).toBeCloseTo(21, 1);
  });

  it('should validate WCAG AA', () => {
    expect(checker.meetsWCAG_AA('#000000', '#FFFFFF')).toBe(true);
    expect(checker.meetsWCAG_AA('#777777', '#FFFFFF')).toBe(false);
  });

  it('should adjust colors to meet contrast', () => {
    const adjusted = checker.adjustForContrast('#888888', '#FFFFFF', 4.5);
    expect(checker.meetsWCAG_AA(adjusted, '#FFFFFF')).toBe(true);
  });
});
```

**參考資料**:
- [WCAG 2.1 Contrast Ratio](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)
- [Relative Luminance Formula](https://www.w3.org/TR/WCAG21/#dfn-relative-luminance)

**驗收標準**:
- [ ] 對比度計算符合 WCAG 2.1 標準
- [ ] 所有測試案例通過
- [ ] 與線上對比度工具結果一致

**預估時間**: 4 小時

---

#### Task 1.4: 實作類型定義 (2h)

**檔案**: `app/client/lib/colors/types.ts`

**實作內容**:

```typescript
// 基本色彩類型
export interface RGB {
  r: number;  // 0-255
  g: number;  // 0-255
  b: number;  // 0-255
}

export interface HSL {
  h: number;  // 0-360
  s: number;  // 0-1
  l: number;  // 0-1
}

export type ThemeAppearance = 'light' | 'dark';
export type ColorRole = 'text' | 'fill';
export type ColorMode = 'auto' | 'manual';

// 主題自適應顏色配置
export interface ThemeAdaptiveColorConfig {
  mode: ColorMode;

  // 自動模式
  baseTheme?: ThemeAppearance;
  baseColor?: string;

  // 手動模式
  lightColor?: string;
  darkColor?: string;

  // 元資料
  version: number;
  createdAt?: number;
  updatedAt?: number;
}

// 擴展現有樣式介面
export interface StyleV2 extends Style {
  textColorConfig?: ThemeAdaptiveColorConfig;
  fillColorConfig?: ThemeAdaptiveColorConfig;
}

// 調色板元資料
export interface SwatchMeta {
  index: number;
  hex: string;
  group: string;
  role: ColorRole;
  theme: ThemeAppearance;
  pairedIndex?: number;
}

// 顏色轉換選項
export interface ConversionOptions {
  sourceTheme: ThemeAppearance;
  targetTheme: ThemeAppearance;
  role: ColorRole;
  preserveHue?: boolean;
  minContrast?: number;
}

// 預覽配置
export interface PreviewConfig {
  textColor: string;
  fillColor: string;
  currentTheme: ThemeAppearance;
  showBothThemes?: boolean;
}
```

**驗收標準**:
- [ ] 所有類型定義完成
- [ ] 與設計文件一致
- [ ] TypeScript 編譯無錯誤

**預估時間**: 2 小時

---

#### Task 1.5: 設定測試環境 (3h)

**執行步驟**:

1. **配置 Jest/Mocha**:
```json
// test/client/lib/colors/setup.ts
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.document = dom.window.document;
global.window = dom.window as any;
```

2. **建立測試輔助工具**:
```typescript
// test/client/lib/colors/helpers.ts
export function expectColorClose(actual: string, expected: string, tolerance = 5) {
  const actualRgb = hexToRgb(actual);
  const expectedRgb = hexToRgb(expected);

  expect(Math.abs(actualRgb.r - expectedRgb.r)).toBeLessThan(tolerance);
  expect(Math.abs(actualRgb.g - expectedRgb.g)).toBeLessThan(tolerance);
  expect(Math.abs(actualRgb.b - expectedRgb.b)).toBeLessThan(tolerance);
}

export function calculateColorDifference(color1: string, color2: string): number {
  // 使用 CIEDE2000 計算色差
  // ΔE < 1: 肉眼無法分辨
  // ΔE < 5: 可接受範圍
}
```

3. **建立 Mock 資料**:
```typescript
// test/client/lib/colors/fixtures.ts
export const TEST_COLORS = {
  red: {
    light: '#E00A17',
    dark: '#FF6B6B',
    hsl: { h: 356, s: 0.89, l: 0.46 }
  },
  // ... 更多測試顏色
};
```

**驗收標準**:
- [ ] 測試環境配置完成
- [ ] 可以執行空白測試
- [ ] 測試輔助工具可用

**預估時間**: 3 小時

---

#### Task 1.6: 建立 CI/CD 配置 (3h)

**執行步驟**:

1. **GitHub Actions 工作流**:
```yaml
# .github/workflows/color-tests.yml
name: Color System Tests

on:
  pull_request:
    paths:
      - 'app/client/lib/colors/**'
      - 'test/client/lib/colors/**'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm run test:colors
      - run: npm run lint:colors
```

2. **測試腳本**:
```json
// package.json
{
  "scripts": {
    "test:colors": "mocha test/client/lib/colors/**/*.test.ts",
    "test:colors:watch": "mocha --watch test/client/lib/colors/**/*.test.ts",
    "lint:colors": "eslint app/client/lib/colors/**/*.ts"
  }
}
```

**驗收標準**:
- [ ] CI/CD 工作流配置完成
- [ ] 測試腳本可執行
- [ ] 程式碼風格檢查通過

**預估時間**: 3 小時

---

## 📋 Phase 2: 核心功能 (25 小時)

### 目標
實作顏色轉換核心演算法和顏色管理功能。

### 任務清單

#### Task 2.1: 實作 ColorConverter 核心演算法 (10h)

**檔案**: `app/client/lib/colors/ColorConverter.ts`

**實作步驟**:

1. **基本轉換邏輯** (4h):
```typescript
export class ColorConverter {
  private cache: Map<string, string> = new Map();

  convertForTheme(
    color: string,
    sourceTheme: ThemeAppearance,
    targetTheme: ThemeAppearance,
    role: ColorRole,
    options?: Partial<ConversionOptions>
  ): string {
    // 1. 檢查快取
    const cacheKey = this.getCacheKey(color, sourceTheme, targetTheme, role);
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // 2. 執行轉換
    const result = this._doConvert(color, sourceTheme, targetTheme, role, options);

    // 3. 儲存快取
    this.cache.set(cacheKey, result);

    return result;
  }

  private _doConvert(
    color: string,
    sourceTheme: ThemeAppearance,
    targetTheme: ThemeAppearance,
    role: ColorRole,
    options?: Partial<ConversionOptions>
  ): string {
    // 解析顏色
    const hsl = hexToHsl(color);

    // 檢查灰階
    if (this.isGrayscale(hsl)) {
      return this.handleGrayscale(hsl, targetTheme);
    }

    // 應用轉換
    const newHsl = this.applyThemeConversion(hsl, sourceTheme, targetTheme, role);

    // 確保對比度
    let result = hslToHex(newHsl);
    if (options?.minContrast) {
      const checker = new ContrastChecker();
      const bgColor = role === 'text' ? this.getDefaultBg(targetTheme) : result;
      const textColor = role === 'text' ? result : this.getDefaultText(targetTheme);

      if (!checker.meetsMinimumContrast(textColor, bgColor, options.minContrast)) {
        result = checker.adjustForContrast(textColor, bgColor, options.minContrast);
      }
    }

    return result;
  }
}
```

2. **主題轉換邏輯** (4h):
```typescript
private applyThemeConversion(
  hsl: HSL,
  sourceTheme: ThemeAppearance,
  targetTheme: ThemeAppearance,
  role: ColorRole
): HSL {
  const newHsl = { ...hsl };

  if (sourceTheme === targetTheme) {
    return newHsl; // 無需轉換
  }

  if (sourceTheme === 'light' && targetTheme === 'dark') {
    if (role === 'text') {
      // 深色文字 → 淺色文字
      newHsl.l = this.mapLightness(hsl.l, 0.2, 0.5, 0.7, 0.95);
      newHsl.s = Math.min(hsl.s * 1.2, 1.0);
    } else {
      // 淺色背景 → 深色背景
      newHsl.l = this.mapLightness(hsl.l, 0.8, 0.95, 0.15, 0.35);
      newHsl.s = Math.max(hsl.s * 0.8, 0.1);
    }
  } else {
    // dark → light
    if (role === 'text') {
      // 淺色文字 → 深色文字
      newHsl.l = this.mapLightness(hsl.l, 0.7, 0.95, 0.2, 0.5);
      newHsl.s = Math.max(hsl.s * 0.8, 0.3);
    } else {
      // 深色背景 → 淺色背景
      newHsl.l = this.mapLightness(hsl.l, 0.15, 0.35, 0.85, 0.98);
      newHsl.s = Math.min(hsl.s * 1.2, 1.0);
    }
  }

  // 處理高飽和度
  if (newHsl.s > 0.8 && targetTheme === 'dark') {
    newHsl.s = 0.7;
  }

  return newHsl;
}

private mapLightness(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number {
  // 確保輸入在範圍內
  value = Math.max(inMin, Math.min(inMax, value));

  // 線性映射
  const normalized = (value - inMin) / (inMax - inMin);
  return outMin + normalized * (outMax - outMin);
}
```

3. **特殊情況處理** (2h):
```typescript
private isGrayscale(hsl: HSL): boolean {
  return hsl.s < 0.1;
}

private handleGrayscale(hsl: HSL, targetTheme: ThemeAppearance): string {
  // 純黑/白
  if (hsl.l < 0.05) {
    return targetTheme === 'dark' ? '#FFFFFF' : '#000000';
  }
  if (hsl.l > 0.95) {
    return targetTheme === 'dark' ? '#000000' : '#FFFFFF';
  }

  // 灰階反轉
  const newL = 1.0 - hsl.l;
  return hslToHex({ h: 0, s: 0, l: newL });
}

private getDefaultBg(theme: ThemeAppearance): string {
  return theme === 'light' ? '#FFFFFF' : '#1A1A1A';
}

private getDefaultText(theme: ThemeAppearance): string {
  return theme === 'light' ? '#000000' : '#FFFFFF';
}
```

**測試案例**:
```typescript
describe('ColorConverter', () => {
  const converter = new ColorConverter();

  describe('Basic Conversion', () => {
    it('should preserve hue', () => {
      const lightRed = '#E00A17';
      const darkRed = converter.convertForTheme(lightRed, 'light', 'dark', 'text');

      const lightHue = hexToHsl(lightRed).h;
      const darkHue = hexToHsl(darkRed).h;

      expect(Math.abs(lightHue - darkHue)).toBeLessThan(15);
    });

    it('should invert lightness for text', () => {
      const darkText = '#333333'; // L ≈ 0.2
      const lightText = converter.convertForTheme(darkText, 'light', 'dark', 'text');

      const darkL = hexToHsl(darkText).l;
      const lightL = hexToHsl(lightText).l;

      expect(lightL).toBeGreaterThan(0.7);
      expect(darkL).toBeLessThan(0.5);
    });

    it('should handle grayscale', () => {
      expect(converter.convertForTheme('#000000', 'light', 'dark', 'text')).toBe('#FFFFFF');
      expect(converter.convertForTheme('#FFFFFF', 'light', 'dark', 'fill')).toBe('#000000');
    });
  });

  describe('Reversibility', () => {
    const testColors = ['#E00A17', '#FD8182', '#0066CC', '#00AA00'];

    testColors.forEach(color => {
      it(`should be reversible for ${color}`, () => {
        const dark = converter.convertForTheme(color, 'light', 'dark', 'text');
        const backToLight = converter.convertForTheme(dark, 'dark', 'light', 'text');

        const diff = calculateColorDifference(color, backToLight);
        expect(diff).toBeLessThan(5); // ΔE < 5
      });
    });
  });

  describe('Contrast Guarantee', () => {
    it('should ensure minimum contrast', () => {
      const checker = new ContrastChecker();
      const converted = converter.convertForTheme(
        '#888888',
        'light',
        'dark',
        'text',
        { minContrast: 4.5 }
      );

      const ratio = checker.getContrastRatio(converted, '#1A1A1A');
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });
  });
});
```

**驗收標準**:
- [ ] 所有轉換函數實作完成
- [ ] 單元測試通過率 100%
- [ ] 色相保持誤差 < 15°
- [ ] 往返一致性 ΔE < 5
- [ ] 對比度保證 ≥ 4.5:1

**預估時間**: 10 小時

---

#### Task 2.2: 實作 ColorStorage (5h)

**檔案**: `app/client/lib/colors/ColorStorage.ts`

**實作內容**:

```typescript
export class ColorStorage {
  // 序列化/反序列化
  serialize(config: ThemeAdaptiveColorConfig): string;
  deserialize(data: string): ThemeAdaptiveColorConfig;

  // 資料驗證
  validate(config: any): ThemeAdaptiveColorConfig;

  // 遷移函數
  migrate(oldStyle: Style, currentTheme: ThemeAppearance): StyleV2;
  migrateField(field: ViewFieldRec): void;
  migrateRules(ruleOwner: RuleOwner): void;

  // 預設配置
  getDefaultConfig(theme?: ThemeAppearance): ThemeAdaptiveColorConfig;

  // 向後相容
  extractLegacyColor(style: Style | StyleV2, role: ColorRole): string | undefined;
  ensureBackwardCompat(styleV2: StyleV2, theme: ThemeAppearance): Style;
}
```

**測試案例**:
```typescript
describe('ColorStorage', () => {
  const storage = new ColorStorage();

  describe('Serialization', () => {
    it('should serialize config', () => {
      const config: ThemeAdaptiveColorConfig = {
        mode: 'auto',
        baseTheme: 'light',
        baseColor: '#E00A17',
        version: 1
      };

      const serialized = storage.serialize(config);
      const deserialized = storage.deserialize(serialized);

      expect(deserialized).toEqual(config);
    });
  });

  describe('Migration', () => {
    it('should migrate old style to new format', () => {
      const oldStyle: Style = {
        textColor: '#000000',
        fillColor: '#FFFFFF'
      };

      const newStyle = storage.migrate(oldStyle, 'light');

      expect(newStyle.textColorConfig).toBeDefined();
      expect(newStyle.textColorConfig!.mode).toBe('auto');
      expect(newStyle.textColorConfig!.baseColor).toBe('#000000');
    });
  });

  describe('Backward Compatibility', () => {
    it('should ensure backward compat', () => {
      const styleV2: StyleV2 = {
        textColorConfig: {
          mode: 'auto',
          baseTheme: 'light',
          baseColor: '#000000',
          version: 1
        }
      };

      const legacy = storage.ensureBackwardCompat(styleV2, 'light');
      expect(legacy.textColor).toBe('#000000');
    });
  });
});
```

**驗收標準**:
- [ ] 所有儲存函數實作完成
- [ ] 遷移函數正確處理舊格式
- [ ] 向後相容性測試通過
- [ ] 資料驗證防止無效輸入

**預估時間**: 5 小時

---

#### Task 2.3: 實作 ThemeAdaptiveColor 主類 (6h)

**檔案**: `app/client/lib/colors/ThemeAdaptiveColor.ts`

**實作內容**:

```typescript
export class ThemeAdaptiveColor implements Disposable {
  private static instance: ThemeAdaptiveColor;
  private converter: ColorConverter;
  private checker: ContrastChecker;
  private storage: ColorStorage;
  private currentTheme: Computed<ThemeAppearance>;

  private constructor() {
    this.converter = new ColorConverter();
    this.checker = new ContrastChecker();
    this.storage = new ColorStorage();

    // 監聽主題變化
    this.currentTheme = Computed.create(this, use => {
      const theme = use(gristThemeObs());
      return theme.appearance;
    });

    this.currentTheme.addListener(theme => {
      this.onThemeChange(theme);
    });
  }

  public static getInstance(): ThemeAdaptiveColor {
    if (!ThemeAdaptiveColor.instance) {
      ThemeAdaptiveColor.instance = new ThemeAdaptiveColor();
    }
    return ThemeAdaptiveColor.instance;
  }

  // 獲取顏色（根據當前主題）
  public getColor(config: ThemeAdaptiveColorConfig, role: ColorRole): string {
    const theme = this.currentTheme.get();

    if (config.mode === 'manual') {
      return theme === 'light' ? config.lightColor! : config.darkColor!;
    } else {
      if (config.baseTheme === theme) {
        return config.baseColor!;
      } else {
        return this.converter.convertForTheme(
          config.baseColor!,
          config.baseTheme!,
          theme,
          role,
          { minContrast: 4.5 }
        );
      }
    }
  }

  // 設定顏色
  public setColor(
    config: ThemeAdaptiveColorConfig,
    color: string,
    role: ColorRole
  ): ThemeAdaptiveColorConfig {
    const theme = this.currentTheme.get();

    if (config.mode === 'manual') {
      if (theme === 'light') {
        return { ...config, lightColor: color, updatedAt: Date.now() };
      } else {
        return { ...config, darkColor: color, updatedAt: Date.now() };
      }
    } else {
      return {
        ...config,
        baseTheme: theme,
        baseColor: color,
        updatedAt: Date.now()
      };
    }
  }

  // 預覽顏色
  public previewColor(
    color: string,
    targetTheme: ThemeAppearance,
    role: ColorRole
  ): string {
    const currentTheme = this.currentTheme.get();
    if (currentTheme === targetTheme) {
      return color;
    }
    return this.converter.convertForTheme(color, currentTheme, targetTheme, role);
  }

  // 批次遷移
  public migrateAll(): Promise<void> {
    // 遷移所有欄位配置
    // 遷移所有條件格式化規則
  }

  // 主題變化處理
  private onThemeChange(newTheme: ThemeAppearance): void {
    // 清除快取
    this.converter.clearCache();

    // 觸發 UI 更新
    // （透過 Observable 模式通知所有訂閱者）
  }

  public dispose(): void {
    this.currentTheme.dispose();
  }
}
```

**測試案例**:
```typescript
describe('ThemeAdaptiveColor', () => {
  let adapter: ThemeAdaptiveColor;

  beforeEach(() => {
    adapter = ThemeAdaptiveColor.getInstance();
  });

  it('should get color in auto mode', () => {
    const config: ThemeAdaptiveColorConfig = {
      mode: 'auto',
      baseTheme: 'light',
      baseColor: '#000000',
      version: 1
    };

    // 假設當前主題是 light
    const color = adapter.getColor(config, 'text');
    expect(color).toBe('#000000');

    // 切換到 dark（需要 mock）
    // const darkColor = adapter.getColor(config, 'text');
    // expect(darkColor).not.toBe('#000000');
  });

  it('should get color in manual mode', () => {
    const config: ThemeAdaptiveColorConfig = {
      mode: 'manual',
      lightColor: '#000000',
      darkColor: '#FFFFFF',
      version: 1
    };

    // 假設當前主題是 light
    const color = adapter.getColor(config, 'text');
    expect(color).toBe('#000000');
  });

  it('should preview color for other theme', () => {
    const lightColor = '#E00A17';
    const darkPreview = adapter.previewColor(lightColor, 'dark', 'text');

    expect(darkPreview).not.toBe(lightColor);

    // 驗證對比度
    const checker = new ContrastChecker();
    const ratio = checker.getContrastRatio(darkPreview, '#1A1A1A');
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });
});
```

**驗收標準**:
- [ ] 主類實作完成
- [ ] 單例模式正確實作
- [ ] 主題切換邏輯正常
- [ ] 與其他模組整合無誤

**預估時間**: 6 小時

---

#### Task 2.4: 效能優化 (4h)

**實作內容**:

1. **快取機制優化** (2h):
```typescript
class ColorConverter {
  private cache = new LRUCache<string, string>(1000); // 限制大小

  // 批次轉換
  convertBatch(
    colors: string[],
    sourceTheme: ThemeAppearance,
    targetTheme: ThemeAppearance,
    role: ColorRole
  ): string[] {
    return colors.map(color => this.convertForTheme(color, sourceTheme, targetTheme, role));
  }
}
```

2. **懶載入與防抖** (2h):
```typescript
class ThemeAdaptiveColor {
  private updateDebounced = debounce((theme: ThemeAppearance) => {
    this.doThemeUpdate(theme);
  }, 100);

  private onThemeChange(theme: ThemeAppearance) {
    this.updateDebounced(theme);
  }
}
```

**驗收標準**:
- [ ] 快取命中率 > 80%
- [ ] 批次轉換效能提升 > 50%
- [ ] 主題切換延遲 < 100ms

**預估時間**: 4 小時

---

## 📋 Phase 3: UI 整合 (15 小時)

### 目標
將核心功能整合到使用者介面中，提供友善的操作體驗。

### 任務清單

#### Task 3.1: 實作 ColorPreview 組件 (5h)

**檔案**: `app/client/lib/colors/ColorPreview.ts`

**實作內容**:

```typescript
export function ColorPreview(
  owner: IDisposableOwner,
  options: PreviewConfig
): DomElementMethod {
  const adapter = ThemeAdaptiveColor.getInstance();
  const checker = new ContrastChecker();

  const currentTheme = options.currentTheme;
  const otherTheme = currentTheme === 'light' ? 'dark' : 'light';

  // 計算另一主題的顏色
  const otherTextColor = adapter.previewColor(options.textColor, otherTheme, 'text');
  const otherFillColor = adapter.previewColor(options.fillColor, otherTheme, 'fill');

  // 計算對比度
  const currentContrast = checker.getContrastRatio(options.textColor, options.fillColor);
  const otherContrast = checker.getContrastRatio(otherTextColor, otherFillColor);

  return dom('div.color-preview-container',
    cssPreviewContainer(),

    // 當前主題預覽
    dom('div.preview-box',
      cssPreviewBox(),
      cssCurrentTheme(),

      dom('div.preview-label',
        `${currentTheme === 'light' ? '淺色模式' : '深色模式'} (當前)`
      ),

      dom('div.preview-sample',
        cssSample(options.textColor, options.fillColor),
        '示例文字 Sample Text Aa'
      ),

      dom('div.contrast-info',
        cssContrastInfo(),
        `對比度: ${currentContrast.toFixed(1)}:1 `,
        contrastBadge(currentContrast)
      )
    ),

    // 另一主題預覽
    dom('div.preview-box',
      cssPreviewBox(),

      dom('div.preview-label',
        `${otherTheme === 'light' ? '淺色模式' : '深色模式'} (預覽)`
      ),

      dom('div.preview-sample',
        cssSample(otherTextColor, otherFillColor),
        '示例文字 Sample Text Aa'
      ),

      dom('div.contrast-info',
        cssContrastInfo(),
        `對比度: ${otherContrast.toFixed(1)}:1 `,
        contrastBadge(otherContrast)
      )
    )
  );
}

function contrastBadge(ratio: number): DomElementMethod {
  const level = ratio >= 7.0 ? 'AAA' : ratio >= 4.5 ? 'AA' : 'Fail';
  const cssClass = `badge-${level.toLowerCase()}`;

  return dom('span.contrast-badge',
    dom.cls(cssClass),
    level === 'Fail' ? '⚠ 不足' : `✓ ${level}`
  );
}

// CSS 樣式
const cssPreviewContainer = styled('div', `
  display: flex;
  gap: 16px;
  margin: 16px 0;
`);

const cssPreviewBox = styled('div', `
  flex: 1;
  border: 1px solid var(--grist-theme-input-border);
  border-radius: 4px;
  padding: 12px;
`);

const cssCurrentTheme = styled('div', `
  border: 2px solid var(--grist-theme-control-primary-bg);
`);

const cssSample = (textColor: string, fillColor: string) => styled('div', `
  color: ${textColor};
  background: ${fillColor};
  padding: 12px;
  border-radius: 4px;
  text-align: center;
  font-size: 16px;
  font-weight: 500;
  margin: 8px 0;
`);

const cssContrastInfo = styled('div', `
  font-size: 12px;
  color: var(--grist-theme-text-light);
  display: flex;
  align-items: center;
  gap: 8px;
`);
```

**驗收標準**:
- [ ] 預覽組件渲染正確
- [ ] 雙主題顯示正常
- [ ] 對比度計算準確
- [ ] 視覺樣式符合設計

**預估時間**: 5 小時

---

#### Task 3.2: 擴展 ColorSelect (6h)

**檔案**: `app/client/ui2018/ColorSelect.ts`

**修改內容**:

```typescript
export function buildColorPicker(
  owner: IDisposableOwner,
  textColor: Observable<string>,
  fillColor: Observable<string>,
  // 新增參數
  colorMode: Observable<ColorMode> = Observable.create(owner, 'auto'),
  textColorConfig?: Observable<ThemeAdaptiveColorConfig>,
  fillColorConfig?: Observable<ThemeAdaptiveColorConfig>
): Element {

  const showManualOptions = Observable.create(owner, false);

  return cssColorPicker(
    // 文字顏色選擇
    dom('div.color-row',
      dom('label', '文字顏色'),
      buildColorInput(owner, textColor, 'text')
    ),

    // 背景顏色選擇
    dom('div.color-row',
      dom('label', '背景顏色'),
      buildColorInput(owner, fillColor, 'fill')
    ),

    // 雙主題預覽（新增）
    dom.domComputed(use => {
      const text = use(textColor);
      const fill = use(fillColor);
      const theme = use(gristThemeObs()).appearance;

      return ColorPreview(owner, {
        textColor: text,
        fillColor: fill,
        currentTheme: theme,
        showBothThemes: true
      });
    }),

    // 分隔線
    cssSeparator(),

    // 模式切換（新增）
    dom('div.mode-toggle',
      labeledSquareCheckbox(
        showManualOptions,
        '為每個主題分別設定顏色（進階）',
        testId('color-mode-toggle')
      )
    ),

    // 手動模式選項（新增）
    dom.maybe(showManualOptions, () =>
      dom('div.manual-mode-section',
        cssManualModeSection(),

        dom('div.info-message',
          cssInfoMessage(),
          icon('Info'),
          '在此模式下，您可以為淺色和深色主題分別設定不同的顏色。'
        ),

        // 主題標籤切換
        dom('div.theme-tabs',
          cssThemeTabs(),
          // 實作主題切換邏輯
        )
      )
    ),

    // 儲存按鈕
    cssSaveButton('套用',
      dom.on('click', () => handleSave())
    )
  );
}

function handleSave() {
  const adapter = ThemeAdaptiveColor.getInstance();
  const theme = gristThemeObs().get().appearance;

  if (colorMode.get() === 'auto') {
    // 建立自動模式配置
    const textConfig: ThemeAdaptiveColorConfig = {
      mode: 'auto',
      baseTheme: theme,
      baseColor: textColor.get(),
      version: 1,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    // 儲存配置...
  } else {
    // 建立手動模式配置
    // ...
  }
}
```

**驗收標準**:
- [ ] 顏色選擇器功能完整
- [ ] 模式切換正常
- [ ] 預覽即時更新
- [ ] 儲存邏輯正確

**預估時間**: 6 小時

---

#### Task 3.3: 整合到 CellStyle 和 ConditionalStyle (4h)

**檔案**:
- `app/client/widgets/CellStyle.ts`
- `app/client/widgets/ConditionalStyle.ts`

**修改重點**:

1. **CellStyle.ts**:
```typescript
// 讀取配置時使用新格式
const styleConfig = field.config.styleV2();
const adapter = ThemeAdaptiveColor.getInstance();

if (styleConfig.textColorConfig) {
  const textColor = adapter.getColor(styleConfig.textColorConfig, 'text');
  // 應用顏色...
}
```

2. **ConditionalStyle.ts**:
```typescript
// 在 CombinedStyle 中處理主題自適應
class CombinedStyle {
  private getColors(): { text?: string, fill?: string } {
    const adapter = ThemeAdaptiveColor.getInstance();
    const result: { text?: string, fill?: string } = {};

    for (const style of this._applicableStyles) {
      if (style.textColorConfig) {
        result.text = adapter.getColor(style.textColorConfig, 'text');
      }
      if (style.fillColorConfig) {
        result.fill = adapter.getColor(style.fillColorConfig, 'fill');
      }
    }

    return result;
  }
}
```

**驗收標準**:
- [ ] 欄位樣式正確應用主題自適應顏色
- [ ] 條件格式化規則正常運作
- [ ] 主題切換時顏色自動更新

**預估時間**: 4 小時

---

## 📋 Phase 4: 資料遷移 (10 小時)

### 目標
安全地將現有顏色配置遷移到新格式。

### 任務清單

#### Task 4.1: 實作遷移腳本 (5h)

**檔案**: `app/server/lib/migrations/ColorConfigMigration.ts`

**實作內容**:

```typescript
export class ColorConfigMigration {
  async migrateDocument(docId: string): Promise<MigrationResult> {
    const doc = await this.loadDocument(docId);

    const result: MigrationResult = {
      fieldsM igrated: 0,
      rulesMigrated: 0,
      errors: []
    };

    // 遷移欄位配置
    for (const table of doc.tables) {
      for (const field of table.fields) {
        try {
          await this.migrateField(field);
          result.fieldsMigrated++;
        } catch (e) {
          result.errors.push({ field: field.id, error: e.message });
        }
      }
    }

    // 遷移條件格式化規則
    for (const view of doc.views) {
      for (const section of view.sections) {
        try {
          await this.migrateRules(section);
          result.rulesMigrated++;
        } catch (e) {
          result.errors.push({ section: section.id, error: e.message });
        }
      }
    }

    return result;
  }

  private async migrateField(field: ViewFieldRec): Promise<void> {
    const storage = new ColorStorage();
    const currentTheme = 'light'; // 假設預設為淺色

    const oldStyle = field.config.style();
    if (!oldStyle) return;

    const newStyle = storage.migrate(oldStyle, currentTheme);

    // 儲存新格式（同時保留舊格式）
    await field.config.style.setAndSave(newStyle);
  }

  private async migrateRules(section: ViewSectionRec): Promise<void> {
    const storage = new ColorStorage();
    const currentTheme = 'light';

    const oldRulesStyles = section.rulesStyles();
    if (!oldRulesStyles || oldRulesStyles.length === 0) return;

    const newRulesStyles = oldRulesStyles.map(style =>
      storage.migrate(style, currentTheme)
    );

    await section.rulesStyles.setAndSave(newRulesStyles);
  }
}

interface MigrationResult {
  fieldsMigrated: number;
  rulesMigrated: number;
  errors: Array<{ field?: string, section?: string, error: string }>;
}
```

**驗收標準**:
- [ ] 遷移腳本可正確執行
- [ ] 不遺失任何現有配置
- [ ] 錯誤處理完善
- [ ] 可回滾

**預估時間**: 5 小時

---

#### Task 4.2: 實作遷移 UI (3h)

**檔案**: `app/client/ui/MigrationNotice.ts`

**實作內容**:

```typescript
export function showMigrationNotice(owner: IDisposableOwner): void {
  const needsMigration = Observable.create(owner, false);

  // 檢查是否需要遷移
  checkMigrationStatus().then(needs => needsMigration.set(needs));

  return dom.maybe(needsMigration, () =>
    cssNotice(
      cssNoticeContent(
        icon('Info'),
        dom('span', '檢測到舊版顏色配置，需要升級以支援主題自適應功能。'),
        dom('button', '立即升級',
          dom.on('click', async () => {
            await runMigration();
            needsMigration.set(false);
          })
        ),
        dom('button', '稍後提醒',
          dom.on('click', () => needsMigration.set(false))
        )
      )
    )
  );
}

async function runMigration(): Promise<void> {
  const migration = new ColorConfigMigration();
  const result = await migration.migrateDocument(getCurrentDocId());

  if (result.errors.length > 0) {
    showErrorMessage(`遷移完成，但有 ${result.errors.length} 個錯誤`);
  } else {
    showSuccessMessage(`成功遷移 ${result.fieldsMigrated} 個欄位和 ${result.rulesMigrated} 個規則`);
  }
}
```

**驗收標準**:
- [ ] 遷移提示正確顯示
- [ ] 使用者可選擇遷移時機
- [ ] 遷移進度顯示
- [ ] 錯誤提示清楚

**預估時間**: 3 小時

---

#### Task 4.3: 測試遷移流程 (2h)

**測試案例**:
```typescript
describe('Color Config Migration', () => {
  it('should migrate simple field config', async () => {
    const oldField = createMockField({
      style: { textColor: '#000000', fillColor: '#FFFFFF' }
    });

    const migration = new ColorConfigMigration();
    await migration.migrateField(oldField);

    const newStyle = oldField.config.styleV2();
    expect(newStyle.textColorConfig).toBeDefined();
    expect(newStyle.textColorConfig!.baseColor).toBe('#000000');
  });

  it('should preserve old format for backward compat', async () => {
    const oldField = createMockField({
      style: { textColor: '#E00A17' }
    });

    await migration.migrateField(oldField);

    const style = oldField.config.style();
    expect(style.textColor).toBe('#E00A17'); // 舊格式仍存在
  });

  it('should handle migration errors gracefully', async () => {
    const corruptedField = createMockField({
      style: { textColor: 'invalid-color' }
    });

    const result = await migration.migrateDocument(testDocId);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
```

**驗收標準**:
- [ ] 遷移測試全部通過
- [ ] 錯誤情況處理正確
- [ ] 向後相容性驗證

**預估時間**: 2 小時

---

## 📋 Phase 5: 測試與優化 (15 小時)

### 目標
全面測試功能並進行效能優化。

### 任務清單

#### Task 5.1: 單元測試完善 (5h)

**覆蓋目標**: ≥ 80%

**重點測試檔案**:
- ColorConverter.test.ts
- ContrastChecker.test.ts
- ColorStorage.test.ts
- ThemeAdaptiveColor.test.ts

**驗收標準**:
- [ ] 程式碼覆蓋率 ≥ 80%
- [ ] 所有邊界情況測試
- [ ] 錯誤處理測試完整

**預估時間**: 5 小時

---

#### Task 5.2: 整合測試 (4h)

**測試場景**:
1. 完整的顏色配置流程
2. 主題切換流程
3. 資料遷移流程
4. 多使用者協作場景

**驗收標準**:
- [ ] 所有整合測試通過
- [ ] 無記憶體洩漏
- [ ] 效能符合指標

**預估時間**: 4 小時

---

#### Task 5.3: E2E 測試 (4h)

**檔案**: `test/nbrowser/ThemeAdaptiveColors.ntest.ts`

**測試案例**:
```typescript
describe('Theme Adaptive Colors E2E', () => {
  it('should configure and switch themes', async () => {
    await gu.openDocument('TestDoc');

    // 配置顏色
    await gu.openColumnMenu('A');
    await gu.setColor({ text: '#E00A17', fill: '#FECBCC' });

    // 驗證淺色模式
    await gu.verifyColorApplied('A', '#E00A17', '#FECBCC');

    // 切換主題
    await gu.switchTheme('dark');

    // 驗證深色模式（顏色已轉換）
    const darkColors = await gu.getColors('A');
    expect(darkColors.text).not.toBe('#E00A17');

    // 驗證對比度
    const contrast = await gu.getContrast('A');
    expect(contrast).toBeGreaterThanOrEqual(4.5);
  });

  it('should handle conditional formatting rules', async () => {
    // 設定條件格式化
    await gu.addConditionalRule({
      condition: '$Status == "Active"',
      style: { fillColor: '#00FF00' }
    });

    // 切換主題
    await gu.switchTheme('dark');

    // 驗證規則仍然有效
    await gu.verifyRuleActive(0);

    // 驗證轉換後的顏色
    const ruleColors = await gu.getRuleColors(0);
    expect(ruleColors.fill).not.toBe('#00FF00');
  });
});
```

**驗收標準**:
- [ ] 所有 E2E 測試通過
- [ ] 跨瀏覽器測試通過
- [ ] 效能測試達標

**預估時間**: 4 小時

---

#### Task 5.4: 效能優化與監控 (2h)

**優化項目**:
1. 快取策略調整
2. 批次處理優化
3. DOM 更新優化

**監控設置**:
```typescript
// 效能監控
const perfMonitor = new PerformanceMonitor();

// 測量轉換效能
perfMonitor.measureConversion(() => {
  converter.convertForTheme(color, 'light', 'dark', 'text');
});

// 測量主題切換效能
perfMonitor.measureThemeSwitch(() => {
  themeObs.set(newTheme);
});

// 定期報告
setInterval(() => {
  perfMonitor.report();
}, 60000);
```

**驗收標準**:
- [ ] 主題切換延遲 < 100ms
- [ ] 顏色轉換 < 10ms
- [ ] 記憶體增長 < 1MB

**預估時間**: 2 小時

---

## 📋 Phase 6: 文件與發布 (5 小時)

### 任務清單

#### Task 6.1: API 文件 (2h)

**檔案**: `app/client/lib/colors/README.md`

**內容**:
- API 參考
- 使用範例
- 最佳實踐
- 常見問題

**預估時間**: 2 小時

---

#### Task 6.2: 使用者指南 (2h)

**檔案**: `@docs/user-guide/theme-adaptive-colors.md`

**內容**:
- 功能介紹
- 操作步驟
- 使用技巧
- 故障排除

**預估時間**: 2 小時

---

#### Task 6.3: 發布準備 (1h)

**檢查清單**:
- [ ] 所有測試通過
- [ ] 文件完整
- [ ] 遷移腳本就緒
- [ ] 回滾計劃準備
- [ ] 發布說明撰寫

**預估時間**: 1 小時

---

## 🎯 里程碑與檢查點

### M1: 核心演算法完成 (Week 1.5)

**完成標準**:
- [x] 色彩空間轉換函數完成
- [x] 對比度計算完成
- [x] 顏色轉換演算法完成
- [x] 單元測試通過

**檢查點**:
- 演算法準確性驗證
- 效能初步測試
- 程式碼審查

---

### M2: 基本功能可用 (Week 2.5)

**完成標準**:
- [x] ColorStorage 完成
- [x] ThemeAdaptiveColor 主類完成
- [x] 基本整合測試通過

**檢查點**:
- 功能完整性檢查
- 整合問題排查
- 效能基準測試

---

### M3: UI 整合完成 (Week 3.0)

**完成標準**:
- [x] ColorPreview 組件完成
- [x] ColorSelect 擴展完成
- [x] CellStyle 和 ConditionalStyle 整合完成

**檢查點**:
- UI/UX 審查
- 使用者測試
- 視覺效果驗證

---

### M4: 測試通過 (Week 3.5)

**完成標準**:
- [x] 單元測試覆蓋率 ≥ 80%
- [x] 整合測試全部通過
- [x] E2E 測試全部通過

**檢查點**:
- 品質評估
- 效能驗證
- 安全性檢查

---

### M5: 準備發布 (Week 4.0)

**完成標準**:
- [x] 文件完整
- [x] 遷移腳本就緒
- [x] 發布說明完成

**檢查點**:
- 最終審查
- 發布批准
- 部署計劃確認

---

## ⚠️ 風險管理

### 風險 1: 顏色轉換演算法不符合預期

**可能性**: 中
**影響**: 高

**緩解措施**:
- 在 Phase 1 早期驗證演算法
- 進行使用者測試收集回饋
- 準備演算法參數調整機制

**應變計劃**:
- 提供手動模式作為備選
- 允許使用者自訂轉換參數
- 快速迭代演算法

---

### 風險 2: 效能不達標

**可能性**: 中
**影響**: 中

**緩解措施**:
- 使用快取機制
- 批次處理優化
- 懶載入策略

**應變計劃**:
- 降低功能範圍
- 延後部分優化到後續版本
- 提供效能開關

---

### 風險 3: 資料遷移失敗

**可能性**: 低
**影響**: 高

**緩解措施**:
- 充分測試遷移腳本
- 保留舊格式作為備份
- 提供回滾機制

**應變計劃**:
- 手動修復受影響的文件
- 提供遷移修復工具
- 延後強制遷移

---

### 風險 4: 瀏覽器相容性問題

**可能性**: 低
**影響**: 中

**緩解措施**:
- 早期進行跨瀏覽器測試
- 使用成熟的 polyfills
- 避免使用實驗性 API

**應變計劃**:
- 為不支援的瀏覽器提供降級方案
- 清楚標示瀏覽器需求

---

## 📊 資源需求

### 人力資源

- **主要開發者**: 1 人，全職 4 週
- **程式碼審查**: 1 人，兼職 0.5 週
- **QA 測試**: 1 人，兼職 1 週
- **UI/UX 設計**: 1 人，兼職 0.5 週

### 技術資源

- **開發環境**: 現有
- **測試環境**: 現有
- **CI/CD**: 現有
- **監控工具**: 需要設定

---

## ✅ 驗收標準總覽

### 功能完整性

- [ ] 自動顏色轉換功能正常
- [ ] 手動模式功能正常
- [ ] 雙主題預覽正確顯示
- [ ] 對比度計算準確
- [ ] 現有資料成功遷移

### 品質標準

- [ ] 轉換後對比度 ≥ 95% 符合 WCAG AA
- [ ] 色相保持誤差 < 15°
- [ ] 往返一致性 ΔE < 5
- [ ] 程式碼覆蓋率 ≥ 80%

### 效能指標

- [ ] 主題切換延遲 < 100ms
- [ ] 顏色轉換 < 10ms per color
- [ ] 記憶體增長 < 1MB

### 相容性

- [ ] 向後相容現有配置
- [ ] 支援 Chrome, Firefox, Safari, Edge 最新版本
- [ ] 資料遷移無遺失

---

## 📝 後續規劃

### 短期 (1-2 個月)

- 收集使用者回饋
- 修復發現的問題
- 微調轉換演算法

### 中期 (3-6 個月)

- 擴展支援更多主題（高對比模式等）
- 實作顏色主題匯入/匯出
- 新增顏色建議功能

### 長期 (6-12 個月)

- AI 驅動的顏色最佳化
- 自訂顏色轉換規則
- 圖片/圖示的主題適應

---

**文件版本**: 1.0
**最後更新**: 2025-11-18
**審核狀態**: ⏳ 待審核
**總預估工時**: 80-100 小時
