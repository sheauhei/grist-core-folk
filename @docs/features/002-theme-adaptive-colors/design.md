# Feature 002: 主題自適應顏色系統 - 技術設計文件

## 📅 文件資訊
- **建立日期**: 2025-11-18
- **功能編號**: 002
- **功能名稱**: Theme-Adaptive Colors (主題自適應顏色)
- **文件類型**: 技術設計
- **狀態**: 草稿
- **前置文件**: [需求規格](./spec.md)

---

## 🎯 設計目標

1. **透明性**: 對使用者透明的顏色轉換，無需手動干預
2. **效能**: 主題切換延遲 < 100ms，不影響 UI 流暢度
3. **準確性**: 轉換後對比度 ≥ 4.5:1 (WCAG AA)，色相誤差 < 15°
4. **可擴展性**: 易於支援未來新增的主題
5. **向後相容**: 完整保留現有顏色配置

---

## 🏗️ 系統架構

### 架構概覽

```
┌─────────────────────────────────────────────────────────────┐
│                        使用者介面層                           │
├─────────────────────────────────────────────────────────────┤
│  ColorSelect.ts  │  CellStyle.ts  │  ConditionalStyle.ts   │
│  (顏色選擇器)     │  (欄位樣式)     │  (條件格式化)          │
└────────┬─────────────────┬─────────────────┬────────────────┘
         │                 │                 │
         v                 v                 v
┌─────────────────────────────────────────────────────────────┐
│                      顏色管理層 (新增)                        │
├─────────────────────────────────────────────────────────────┤
│  ThemeAdaptiveColor.ts - 主題自適應顏色核心                   │
│  ├─ ColorConverter.ts - 顏色轉換演算法                       │
│  ├─ ContrastChecker.ts - 對比度檢查                         │
│  ├─ ColorStorage.ts - 顏色配置儲存                          │
│  └─ ColorPreview.ts - 雙主題預覽                            │
└────────┬─────────────────┬─────────────────┬────────────────┘
         │                 │                 │
         v                 v                 v
┌─────────────────────────────────────────────────────────────┐
│                       現有系統層                              │
├─────────────────────────────────────────────────────────────┤
│  theme.ts       │  Styles.ts      │  ViewFieldRec.ts        │
│  (主題系統)      │  (樣式模型)      │  (欄位記錄)             │
└─────────────────────────────────────────────────────────────┘
```

### 核心組件設計

#### 1. ThemeAdaptiveColor - 主題自適應顏色核心類

**職責**:
- 管理主題相關的顏色配置
- 協調各個子模組的運作
- 提供統一的 API 給 UI 層使用

**主要方法**:
```typescript
class ThemeAdaptiveColor {
  // 根據當前主題獲取顏色
  getColor(config: ColorConfig, role: 'text' | 'fill'): string;

  // 設定顏色配置
  setColor(config: ColorConfig, color: string, role: 'text' | 'fill'): void;

  // 切換顏色模式 (auto/manual)
  setColorMode(config: ColorConfig, mode: ColorMode): void;

  // 預覽特定主題下的顏色
  previewColor(color: string, targetTheme: ThemeAppearance): string;

  // 批次轉換現有顏色配置
  migrateColors(configs: ColorConfig[]): ColorConfig[];
}
```

#### 2. ColorConverter - 顏色轉換演算法

**職責**:
- 實作顏色空間轉換 (RGB ↔ HSL ↔ Lab)
- 實作主題自適應轉換演算法
- 處理特殊情況 (灰階、高飽和度等)

**核心演算法**:
```typescript
class ColorConverter {
  // RGB 轉 HSL
  rgbToHsl(r: number, g: number, b: number): HSL;

  // HSL 轉 RGB
  hslToRgb(h: number, s: number, l: number): RGB;

  // 主題自適應轉換
  convertForTheme(
    color: string,
    sourceTheme: ThemeAppearance,
    targetTheme: ThemeAppearance,
    role: 'text' | 'fill'
  ): string;

  // 特殊情況處理
  handleGrayscale(color: HSL, targetTheme: ThemeAppearance): HSL;
  handleHighSaturation(color: HSL, targetTheme: ThemeAppearance): HSL;
}
```

**轉換演算法詳細設計**:

```typescript
function convertForTheme(
  color: string,
  sourceTheme: 'light' | 'dark',
  targetTheme: 'light' | 'dark',
  role: 'text' | 'fill'
): string {
  // 1. 解析顏色
  const rgb = parseColor(color);
  const hsl = rgbToHsl(rgb);

  // 2. 檢查是否為灰階
  if (hsl.s < 0.1) {
    return handleGrayscale(hsl, targetTheme);
  }

  // 3. 主題轉換邏輯
  let newHsl = { ...hsl };

  // 保持色相不變
  // newHsl.h = hsl.h;

  // 反轉明度
  if (sourceTheme === 'light' && targetTheme === 'dark') {
    // 淺色 → 深色
    if (role === 'text') {
      // 深色文字 → 淺色文字
      newHsl.l = mapLightness(hsl.l, 0.2, 0.8, 0.7, 0.95);
      newHsl.s = Math.min(hsl.s * 1.2, 1.0); // 提高飽和度
    } else {
      // 淺色背景 → 深色背景
      newHsl.l = mapLightness(hsl.l, 0.8, 0.95, 0.15, 0.35);
      newHsl.s = Math.max(hsl.s * 0.8, 0.1); // 降低飽和度
    }
  } else if (sourceTheme === 'dark' && targetTheme === 'light') {
    // 深色 → 淺色
    if (role === 'text') {
      // 淺色文字 → 深色文字
      newHsl.l = mapLightness(hsl.l, 0.7, 0.95, 0.2, 0.5);
      newHsl.s = Math.max(hsl.s * 0.8, 0.3); // 降低飽和度
    } else {
      // 深色背景 → 淺色背景
      newHsl.l = mapLightness(hsl.l, 0.15, 0.35, 0.85, 0.98);
      newHsl.s = Math.min(hsl.s * 1.2, 1.0); // 提高飽和度
    }
  }

  // 4. 處理高飽和度
  if (newHsl.s > 0.8 && targetTheme === 'dark') {
    newHsl.s = 0.7; // 降低飽和度避免刺眼
  }

  // 5. 轉回 RGB 並返回 hex
  const newRgb = hslToRgb(newHsl);
  return rgbToHex(newRgb);
}

// 明度映射輔助函數
function mapLightness(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number {
  // 線性映射，保持相對關係
  const normalized = (value - inMin) / (inMax - inMin);
  return outMin + normalized * (outMax - outMin);
}
```

**灰階處理**:
```typescript
function handleGrayscale(hsl: HSL, targetTheme: 'light' | 'dark'): string {
  // 純黑白處理
  if (hsl.l < 0.05) {
    // 黑色 → 白色
    return targetTheme === 'dark' ? '#FFFFFF' : '#000000';
  }
  if (hsl.l > 0.95) {
    // 白色 → 黑色
    return targetTheme === 'dark' ? '#000000' : '#FFFFFF';
  }

  // 灰階反轉
  const newL = 1.0 - hsl.l;
  return hslToHex({ h: 0, s: 0, l: newL });
}
```

#### 3. ContrastChecker - 對比度檢查器

**職責**:
- 計算相對亮度 (Relative Luminance)
- 計算對比度 (Contrast Ratio)
- 驗證 WCAG 標準

**實作**:
```typescript
class ContrastChecker {
  // 計算相對亮度 (WCAG 公式)
  getRelativeLuminance(rgb: RGB): number {
    const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(val => {
      val = val / 255;
      return val <= 0.03928
        ? val / 12.92
        : Math.pow((val + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  // 計算對比度
  getContrastRatio(color1: string, color2: string): number {
    const l1 = this.getRelativeLuminance(parseColor(color1));
    const l2 = this.getRelativeLuminance(parseColor(color2));
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  }

  // 檢查是否符合 WCAG AA (4.5:1)
  meetsWCAG_AA(textColor: string, bgColor: string): boolean {
    return this.getContrastRatio(textColor, bgColor) >= 4.5;
  }

  // 檢查是否符合 WCAG AAA (7:1)
  meetsWCAG_AAA(textColor: string, bgColor: string): boolean {
    return this.getContrastRatio(textColor, bgColor) >= 7.0;
  }

  // 調整顏色以達到最小對比度
  adjustForContrast(
    textColor: string,
    bgColor: string,
    minRatio: number = 4.5
  ): string {
    let adjustedColor = textColor;
    let iterations = 0;
    const maxIterations = 20;

    while (
      this.getContrastRatio(adjustedColor, bgColor) < minRatio &&
      iterations < maxIterations
    ) {
      // 根據背景明度調整文字明度
      const bgLuminance = this.getRelativeLuminance(parseColor(bgColor));
      const hsl = rgbToHsl(parseColor(adjustedColor));

      if (bgLuminance > 0.5) {
        // 淺色背景，文字變深
        hsl.l = Math.max(0, hsl.l - 0.05);
      } else {
        // 深色背景，文字變淺
        hsl.l = Math.min(1, hsl.l + 0.05);
      }

      adjustedColor = hslToHex(hsl);
      iterations++;
    }

    return adjustedColor;
  }
}
```

#### 4. ColorStorage - 顏色配置儲存

**職責**:
- 管理顏色配置的序列化/反序列化
- 處理向後相容性
- 提供資料遷移功能

**資料結構**:
```typescript
// 新的顏色配置格式
interface ThemeAdaptiveColorConfig {
  mode: 'auto' | 'manual';  // 自動轉換或手動設定

  // 自動模式：儲存基準主題的顏色
  baseTheme?: 'light' | 'dark';
  baseColor?: string;

  // 手動模式：分別儲存兩個主題的顏色
  lightColor?: string;
  darkColor?: string;

  // 元資料
  version: number;  // 資料格式版本
  createdAt?: number;
  updatedAt?: number;
}

// 擴展現有的 Style 介面
interface StyleV2 extends Style {
  // 原有欄位保持不變
  textColor?: string;
  fillColor?: string;

  // 新增主題自適應配置
  textColorConfig?: ThemeAdaptiveColorConfig;
  fillColorConfig?: ThemeAdaptiveColorConfig;
}

// 向後相容：如果沒有 *ColorConfig，使用 *Color 作為 baseColor
```

**儲存邏輯**:
```typescript
class ColorStorage {
  // 序列化顏色配置
  serialize(config: ThemeAdaptiveColorConfig): string {
    return JSON.stringify(config);
  }

  // 反序列化顏色配置
  deserialize(data: string): ThemeAdaptiveColorConfig {
    try {
      const config = JSON.parse(data);
      return this.validate(config);
    } catch (e) {
      return this.getDefaultConfig();
    }
  }

  // 遷移舊格式到新格式
  migrate(oldStyle: Style, currentTheme: ThemeAppearance): StyleV2 {
    const newStyle: StyleV2 = { ...oldStyle };

    if (oldStyle.textColor) {
      newStyle.textColorConfig = {
        mode: 'auto',
        baseTheme: currentTheme,
        baseColor: oldStyle.textColor,
        version: 1,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
    }

    if (oldStyle.fillColor) {
      newStyle.fillColorConfig = {
        mode: 'auto',
        baseTheme: currentTheme,
        baseColor: oldStyle.fillColor,
        version: 1,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
    }

    return newStyle;
  }

  // 驗證配置完整性
  validate(config: any): ThemeAdaptiveColorConfig {
    // 驗證必要欄位
    if (!config.mode || !['auto', 'manual'].includes(config.mode)) {
      throw new Error('Invalid color config mode');
    }

    if (config.mode === 'auto') {
      if (!config.baseTheme || !config.baseColor) {
        throw new Error('Auto mode requires baseTheme and baseColor');
      }
    } else {
      if (!config.lightColor || !config.darkColor) {
        throw new Error('Manual mode requires lightColor and darkColor');
      }
    }

    return config;
  }

  // 預設配置
  getDefaultConfig(): ThemeAdaptiveColorConfig {
    return {
      mode: 'auto',
      baseTheme: 'light',
      baseColor: '#000000',
      version: 1
    };
  }
}
```

#### 5. ColorPreview - 雙主題預覽組件

**職責**:
- 渲染雙主題預覽 UI
- 即時計算並顯示對比度
- 提供視覺化回饋

**UI 組件**:
```typescript
interface ColorPreviewProps {
  textColor: string;
  fillColor: string;
  currentTheme: ThemeAppearance;
  onChange?: (colors: { text: string, fill: string }) => void;
}

function ColorPreview(props: ColorPreviewProps): HTMLElement {
  const { textColor, fillColor, currentTheme } = props;

  // 計算另一主題的顏色
  const otherTheme = currentTheme === 'light' ? 'dark' : 'light';
  const converter = new ColorConverter();
  const checker = new ContrastChecker();

  const otherTextColor = converter.convertForTheme(
    textColor, currentTheme, otherTheme, 'text'
  );
  const otherFillColor = converter.convertForTheme(
    fillColor, currentTheme, otherTheme, 'fill'
  );

  // 計算對比度
  const currentContrast = checker.getContrastRatio(textColor, fillColor);
  const otherContrast = checker.getContrastRatio(otherTextColor, otherFillColor);

  return dom('div.color-preview-container',
    // 當前主題預覽
    dom('div.preview-box.current-theme',
      dom('div.preview-label', `${currentTheme === 'light' ? '淺色' : '深色'}模式`),
      dom('div.preview-sample',
        { style: `color: ${textColor}; background: ${fillColor}` },
        '示例文字 Sample Text'
      ),
      dom('div.contrast-info',
        `對比度: ${currentContrast.toFixed(1)}:1 `,
        contrastBadge(currentContrast)
      )
    ),

    // 另一主題預覽
    dom('div.preview-box.other-theme',
      dom('div.preview-label', `${otherTheme === 'light' ? '淺色' : '深色'}模式`),
      dom('div.preview-sample',
        { style: `color: ${otherTextColor}; background: ${otherFillColor}` },
        '示例文字 Sample Text'
      ),
      dom('div.contrast-info',
        `對比度: ${otherContrast.toFixed(1)}:1 `,
        contrastBadge(otherContrast)
      )
    )
  );
}

function contrastBadge(ratio: number): HTMLElement {
  if (ratio >= 7.0) {
    return dom('span.badge.aaa', '✓ AAA');
  } else if (ratio >= 4.5) {
    return dom('span.badge.aa', '✓ AA');
  } else {
    return dom('span.badge.fail', '⚠ 不足');
  }
}
```

---

## 🔌 整合設計

### 整合點 1: 主題系統 (theme.ts)

**現有代碼**: `app/client/ui2018/theme.ts`

**整合方式**:

```typescript
// 監聽主題變化
const themeObs = gristThemeObs();
themeObs.addListener((newTheme) => {
  // 觸發顏色轉換
  const themeAdapter = ThemeAdaptiveColor.getInstance();
  themeAdapter.onThemeChange(newTheme);
});

// ThemeAdaptiveColor 實作
class ThemeAdaptiveColor {
  private static instance: ThemeAdaptiveColor;

  onThemeChange(newTheme: Theme) {
    const appearance = newTheme.appearance; // 'light' | 'dark'

    // 通知所有訂閱者主題已變更
    this.notifyThemeChange(appearance);

    // 更新 CSS 變數
    this.updateCssVars(appearance);
  }

  private notifyThemeChange(appearance: ThemeAppearance) {
    // 觸發所有 FieldBuilder 重新計算顏色
    // 觸發所有 ConditionalStyle 重新評估
  }

  private updateCssVars(appearance: ThemeAppearance) {
    // 更新全局 CSS 變數供 CSS 使用
    document.documentElement.style.setProperty(
      '--grist-theme-appearance',
      appearance
    );
  }
}
```

### 整合點 2: 顏色選擇器 (ColorSelect.ts)

**現有代碼**: `app/client/ui2018/ColorSelect.ts`

**修改重點**:

```typescript
// 擴展 buildColorPicker 函數
export function buildColorPicker(
  owner: IDisposableOwner,
  textColor: Observable<string>,
  fillColor: Observable<string>,
  // 新增參數
  colorMode: Observable<ColorMode> = Observable.create(owner, 'auto'),
  onSave?: (colors: ColorConfig) => void
): Element {

  const currentTheme = gristThemeObs().get().appearance;

  return cssColorPicker(
    // 顏色選擇控制項 (現有)
    buildTextColorPicker(textColor),
    buildFillColorPicker(fillColor),

    // 雙主題預覽 (新增)
    dom.domComputed(use => {
      const text = use(textColor);
      const fill = use(fillColor);
      return ColorPreview({ textColor: text, fillColor: fill, currentTheme });
    }),

    // 模式切換 (新增)
    dom('div.mode-toggle',
      labeledSquareCheckbox(
        colorMode,
        '為每個主題分別設定顏色（進階）',
        dom.on('change', (e, elem) => {
          if (elem.checked) {
            // 切換到手動模式
            showManualModeOptions();
          } else {
            // 切換回自動模式
            hideManualModeOptions();
          }
        })
      )
    ),

    // 手動模式選項 (新增)
    dom.maybe(use => use(colorMode) === 'manual', () =>
      dom('div.manual-mode-options',
        dom('div.theme-tabs',
          dom('button.tab', '淺色主題',
            dom.on('click', () => showLightThemeColors())
          ),
          dom('button.tab', '深色主題',
            dom.on('click', () => showDarkThemeColors())
          )
        ),
        // 分別配置兩個主題的顏色
        // ...
      )
    ),

    // 儲存按鈕
    bigPrimaryButton('套用',
      dom.on('click', () => {
        const config = buildColorConfig(colorMode.get(), textColor.get(), fillColor.get());
        onSave?.(config);
      })
    )
  );
}

function buildColorConfig(
  mode: ColorMode,
  textColor: string,
  fillColor: string
): ColorConfig {
  const currentTheme = gristThemeObs().get().appearance;

  if (mode === 'auto') {
    return {
      textColorConfig: {
        mode: 'auto',
        baseTheme: currentTheme,
        baseColor: textColor,
        version: 1
      },
      fillColorConfig: {
        mode: 'auto',
        baseTheme: currentTheme,
        baseColor: fillColor,
        version: 1
      }
    };
  } else {
    // 手動模式：需要儲存兩個主題的顏色
    // 實作細節...
  }
}
```

### 整合點 3: 欄位建構器 (FieldBuilder.ts)

**現有代碼**: `app/client/widgets/FieldBuilder.ts` (lines 714-718)

**修改重點**:

```typescript
// 現有代碼
private _getCellStyle(row: DataRowModel): Style {
  const style = this.field.config.style();
  // ...
}

// 修改為
private _getCellStyle(row: DataRowModel): Style {
  const styleConfig = this.field.config.styleV2(); // 使用新格式
  const currentTheme = gristThemeObs().get().appearance;

  // 取得主題自適應顏色
  const adapter = ThemeAdaptiveColor.getInstance();

  const textColor = styleConfig.textColorConfig
    ? adapter.getColor(styleConfig.textColorConfig, 'text')
    : styleConfig.textColor; // 向後相容

  const fillColor = styleConfig.fillColorConfig
    ? adapter.getColor(styleConfig.fillColorConfig, 'fill')
    : styleConfig.fillColor; // 向後相容

  return {
    ...styleConfig,
    textColor,
    fillColor
  };
}

// ThemeAdaptiveColor.getColor 實作
public getColor(config: ThemeAdaptiveColorConfig, role: 'text' | 'fill'): string {
  const currentTheme = gristThemeObs().get().appearance;

  if (config.mode === 'manual') {
    // 手動模式：直接返回對應主題的顏色
    return currentTheme === 'light' ? config.lightColor! : config.darkColor!;
  } else {
    // 自動模式：如果需要轉換則轉換
    if (config.baseTheme === currentTheme) {
      // 不需要轉換
      return config.baseColor!;
    } else {
      // 需要轉換
      return this.converter.convertForTheme(
        config.baseColor!,
        config.baseTheme!,
        currentTheme,
        role
      );
    }
  }
}
```

### 整合點 4: 條件格式化 (ConditionalStyle.ts)

**現有代碼**: `app/client/widgets/ConditionalStyle.ts`

**修改重點**:

```typescript
// 擴展 rulesStyles 儲存格式
// 從 Style[] 改為 StyleV2[]

// 在 CombinedStyle 類中處理主題自適應
class CombinedStyle {
  constructor(
    rowId: UIRowId,
    ruleOwners: RuleOwner[],
    theme: ThemeAppearance // 新增參數
  ) {
    this._theme = theme;
    // ...
  }

  private _getCombinedColors(): { text?: string, fill?: string } {
    const adapter = ThemeAdaptiveColor.getInstance();

    // 遍歷所有規則，應用主題自適應
    for (const style of this._applicableStyles) {
      if (style.textColorConfig) {
        const color = adapter.getColor(style.textColorConfig, 'text');
        if (color) result.text = color;
      }
      if (style.fillColorConfig) {
        const color = adapter.getColor(style.fillColorConfig, 'fill');
        if (color) result.fill = color;
      }
    }

    return result;
  }
}
```

### 整合點 5: 樣式模型 (Styles.ts)

**現有代碼**: `app/client/models/Styles.ts`

**修改重點**:

```typescript
// 擴展介面定義
export interface Style {
  textColor?: string|undefined;
  fillColor?: string|undefined;
  // ... 其他欄位保持不變
}

// 新增 V2 介面
export interface StyleV2 extends Style {
  // 主題自適應配置
  textColorConfig?: ThemeAdaptiveColorConfig;
  fillColorConfig?: ThemeAdaptiveColorConfig;
}

// 添加轉換函數
export function styleToV2(style: Style, currentTheme: ThemeAppearance): StyleV2 {
  const storage = new ColorStorage();
  return storage.migrate(style, currentTheme);
}

export function styleFromV2(styleV2: StyleV2, targetTheme: ThemeAppearance): Style {
  const adapter = ThemeAdaptiveColor.getInstance();

  return {
    ...styleV2,
    textColor: styleV2.textColorConfig
      ? adapter.getColor(styleV2.textColorConfig, 'text')
      : styleV2.textColor,
    fillColor: styleV2.fillColorConfig
      ? adapter.getColor(styleV2.fillColorConfig, 'fill')
      : styleV2.fillColor
  };
}
```

---

## 💾 資料儲存設計

### 資料庫 Schema

**ViewFieldRec (欄位配置)**:

```python
# 現有欄位
widgetOptions: JSON  # 包含 style 配置

# widgetOptions.style 結構
{
  "textColor": "#000000",      # 舊格式（向後相容）
  "fillColor": "#FFFFFF",      # 舊格式（向後相容）

  "textColorConfig": {         # 新格式
    "mode": "auto",
    "baseTheme": "light",
    "baseColor": "#000000",
    "version": 1
  },
  "fillColorConfig": {         # 新格式
    "mode": "auto",
    "baseTheme": "light",
    "baseColor": "#FFFFFF",
    "version": 1
  }
}
```

**RuleOwner (條件格式化規則)**:

```python
# 現有欄位
rulesStyles: JSON[]  # Style[] 陣列

# 每個 Style 物件結構
[
  {
    "textColor": "#E00A17",    # 舊格式（向後相容）
    "fillColor": "#FECBCC",    # 舊格式（向後相容）

    "textColorConfig": {       # 新格式
      "mode": "auto",
      "baseTheme": "light",
      "baseColor": "#E00A17",
      "version": 1
    },
    "fillColorConfig": {       # 新格式
      "mode": "manual",
      "lightColor": "#FECBCC",
      "darkColor": "#5A1F20",
      "version": 1
    }
  }
]
```

### 資料遷移策略

**第一階段：軟遷移 (Soft Migration)**

```typescript
// 讀取時自動轉換
function readStyle(data: any): StyleV2 {
  if (data.textColorConfig || data.fillColorConfig) {
    // 已經是新格式
    return data as StyleV2;
  } else {
    // 舊格式，自動轉換
    const currentTheme = gristThemeObs().get().appearance;
    return styleToV2(data as Style, currentTheme);
  }
}

// 寫入時同時保留新舊格式
function writeStyle(style: StyleV2): any {
  const adapter = ThemeAdaptiveColor.getInstance();
  const currentTheme = gristThemeObs().get().appearance;

  return {
    // 保留舊格式供舊版本使用
    textColor: style.textColorConfig
      ? adapter.getColor(style.textColorConfig, 'text')
      : style.textColor,
    fillColor: style.fillColorConfig
      ? adapter.getColor(style.fillColorConfig, 'fill')
      : style.fillColor,

    // 新增新格式
    textColorConfig: style.textColorConfig,
    fillColorConfig: style.fillColorConfig
  };
}
```

**第二階段：硬遷移 (Hard Migration)** (未來)

當所有使用者都升級後，可以執行資料庫遷移移除舊格式欄位。

---

## 🎨 調色板增強設計

### 當前調色板分析

```typescript
// 現有 64 色調色板
const swatches = [
  "#FFFFFF", "#DCDCDC", "#888888", "#000000",  // 白黑 (0-3)
  "#FECBCC", "#FD8182", "#E00A17", "#740206",  // 紅 (4-7)
  // ... 其他顏色組
];

// 現有判斷函數
function isLight(index: number): boolean {
  return index % 4 <= 1;
}
```

### 增強設計

```typescript
// 為每個顏色添加元資料
interface SwatchMeta {
  index: number;
  hex: string;
  group: string;         // 'white-black' | 'red' | 'orange' | ...
  role: 'fill' | 'text'; // 建議用途
  theme: 'light' | 'dark'; // 適用主題
  pairedIndex?: number;  // 配對的顏色索引
}

const swatchesMetadata: SwatchMeta[] = [
  // 白黑組
  { index: 0, hex: "#FFFFFF", group: "gray", role: "fill", theme: "light", pairedIndex: 3 },
  { index: 1, hex: "#DCDCDC", group: "gray", role: "fill", theme: "light", pairedIndex: 2 },
  { index: 2, hex: "#888888", group: "gray", role: "text", theme: "light", pairedIndex: 1 },
  { index: 3, hex: "#000000", group: "gray", role: "text", theme: "light", pairedIndex: 0 },

  // 紅色組
  { index: 4, hex: "#FECBCC", group: "red", role: "fill", theme: "light", pairedIndex: 7 },
  { index: 5, hex: "#FD8182", group: "red", role: "text", theme: "light", pairedIndex: 6 },
  { index: 6, hex: "#E00A17", group: "red", role: "text", theme: "light", pairedIndex: 5 },
  { index: 7, hex: "#740206", group: "red", role: "fill", theme: "dark", pairedIndex: 4 },

  // ... 其他顏色組
];

// 根據當前主題過濾建議的顏色
function getSuggestedSwatches(
  currentTheme: ThemeAppearance,
  role: 'text' | 'fill'
): SwatchMeta[] {
  return swatchesMetadata.filter(
    meta => meta.theme === currentTheme && meta.role === role
  );
}

// 找到配對的顏色
function getPairedColor(index: number): string | undefined {
  const meta = swatchesMetadata[index];
  if (meta.pairedIndex !== undefined) {
    return swatchesMetadata[meta.pairedIndex].hex;
  }
  return undefined;
}
```

### UI 視覺化改進

```typescript
// 在調色板中顯示配對關係
function renderColorPalette(): HTMLElement {
  const currentTheme = gristThemeObs().get().appearance;

  return dom('div.color-palette',
    // 分組顯示
    ['gray', 'red', 'orange', 'yellow', 'green', 'blue', 'violet', 'pink'].map(group =>
      dom('div.color-group',
        dom('div.group-label', group),
        dom('div.swatches-row',
          swatchesMetadata
            .filter(m => m.group === group)
            .map(meta =>
              dom('div.swatch',
                {
                  style: `background: ${meta.hex}`,
                  class: meta.theme === currentTheme ? 'suggested' : ''
                },
                // 顯示配對指示
                meta.pairedIndex !== undefined &&
                  dom('div.pair-indicator', '↔')
              )
            )
        )
      )
    )
  );
}
```

---

## ⚡ 效能優化設計

### 1. 顏色轉換快取

```typescript
class ColorConverter {
  private cache: Map<string, string> = new Map();

  private getCacheKey(
    color: string,
    sourceTheme: string,
    targetTheme: string,
    role: string
  ): string {
    return `${color}|${sourceTheme}|${targetTheme}|${role}`;
  }

  convertForTheme(
    color: string,
    sourceTheme: ThemeAppearance,
    targetTheme: ThemeAppearance,
    role: 'text' | 'fill'
  ): string {
    // 檢查快取
    const cacheKey = this.getCacheKey(color, sourceTheme, targetTheme, role);
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // 執行轉換
    const result = this._doConvert(color, sourceTheme, targetTheme, role);

    // 儲存到快取
    this.cache.set(cacheKey, result);

    // 限制快取大小
    if (this.cache.size > 1000) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    return result;
  }
}
```

### 2. 懶載入與批次處理

```typescript
class ThemeAdaptiveColor {
  private pendingUpdates: Set<string> = new Set();
  private updateTimer: number | null = null;

  onThemeChange(newTheme: Theme) {
    // 收集需要更新的元素
    this.collectPendingUpdates();

    // 使用 requestAnimationFrame 批次更新
    if (this.updateTimer === null) {
      this.updateTimer = requestAnimationFrame(() => {
        this.processPendingUpdates(newTheme);
        this.updateTimer = null;
      });
    }
  }

  private processPendingUpdates(theme: Theme) {
    // 批次處理所有更新
    this.pendingUpdates.forEach(elementId => {
      this.updateElement(elementId, theme);
    });
    this.pendingUpdates.clear();
  }
}
```

### 3. CSS 變數加速

```typescript
// 預先計算常用顏色的轉換結果，存為 CSS 變數
function updateThemeCssVars(theme: ThemeAppearance) {
  const converter = new ColorConverter();
  const root = document.documentElement;

  // 轉換調色板顏色
  swatchesMetadata.forEach(meta => {
    if (meta.theme !== theme && meta.pairedIndex !== undefined) {
      const convertedColor = swatchesMetadata[meta.pairedIndex].hex;
      root.style.setProperty(
        `--grist-swatch-${meta.index}-${theme}`,
        convertedColor
      );
    }
  });
}

// CSS 中使用
// .field {
//   background: var(--grist-swatch-4-dark, #740206);
// }
```

---

## 🧪 測試策略

### 單元測試

**ColorConverter.test.ts**:
```typescript
describe('ColorConverter', () => {
  const converter = new ColorConverter();

  describe('convertForTheme', () => {
    it('should preserve hue when converting', () => {
      const lightRed = '#E00A17';
      const darkRed = converter.convertForTheme(lightRed, 'light', 'dark', 'text');

      const lightHsl = rgbToHsl(parseColor(lightRed));
      const darkHsl = rgbToHsl(parseColor(darkRed));

      expect(Math.abs(lightHsl.h - darkHsl.h)).toBeLessThan(15);
    });

    it('should invert lightness', () => {
      const darkText = '#E00A17'; // L ≈ 0.46
      const lightText = converter.convertForTheme(darkText, 'light', 'dark', 'text');

      const darkL = rgbToHsl(parseColor(darkText)).l;
      const lightL = rgbToHsl(parseColor(lightText)).l;

      expect(lightL).toBeGreaterThan(0.7);
      expect(darkL).toBeLessThan(0.5);
    });

    it('should handle grayscale correctly', () => {
      const black = '#000000';
      const converted = converter.convertForTheme(black, 'light', 'dark', 'text');

      expect(converted).toBe('#FFFFFF');
    });

    it('should be reversible', () => {
      const original = '#E00A17';
      const dark = converter.convertForTheme(original, 'light', 'dark', 'text');
      const backToLight = converter.convertForTheme(dark, 'dark', 'light', 'text');

      // 色差應該很小 (ΔE < 5)
      const colorDiff = calculateColorDifference(original, backToLight);
      expect(colorDiff).toBeLessThan(5);
    });
  });
});
```

**ContrastChecker.test.ts**:
```typescript
describe('ContrastChecker', () => {
  const checker = new ContrastChecker();

  it('should calculate correct contrast ratio', () => {
    const ratio = checker.getContrastRatio('#000000', '#FFFFFF');
    expect(ratio).toBeCloseTo(21, 1); // 最大對比度
  });

  it('should meet WCAG AA for good combinations', () => {
    expect(checker.meetsWCAG_AA('#000000', '#FFFFFF')).toBe(true);
    expect(checker.meetsWCAG_AA('#333333', '#FFFFFF')).toBe(true);
  });

  it('should fail WCAG AA for poor combinations', () => {
    expect(checker.meetsWCAG_AA('#888888', '#FFFFFF')).toBe(false);
  });

  it('should adjust color to meet minimum contrast', () => {
    const adjusted = checker.adjustForContrast('#888888', '#FFFFFF', 4.5);
    expect(checker.meetsWCAG_AA(adjusted, '#FFFFFF')).toBe(true);
  });
});
```

### 整合測試

**ThemeAdaptiveColor.test.ts**:
```typescript
describe('ThemeAdaptiveColor Integration', () => {
  it('should convert all palette colors correctly', () => {
    const adapter = ThemeAdaptiveColor.getInstance();

    swatchesMetadata.forEach(meta => {
      const config: ThemeAdaptiveColorConfig = {
        mode: 'auto',
        baseTheme: 'light',
        baseColor: meta.hex,
        version: 1
      };

      // 轉換到深色主題
      const darkColor = adapter.getColor(config, meta.role);

      // 檢查對比度
      const bgColor = meta.role === 'text' ? '#1A1A1A' : darkColor;
      const textColor = meta.role === 'text' ? darkColor : '#FFFFFF';

      const checker = new ContrastChecker();
      const contrast = checker.getContrastRatio(textColor, bgColor);

      expect(contrast).toBeGreaterThanOrEqual(4.5);
    });
  });
});
```

### E2E 測試

**ThemeSwitch.ntest.ts**:
```typescript
describe('Theme Adaptive Colors E2E', () => {
  it('should maintain readability after theme switch', async () => {
    // 建立測試文件
    const session = await gu.session().teamSite.login();
    await session.tempNewDoc(cleanup, 'ThemeTest');

    // 設定欄位顏色
    await gu.setFieldColor('A', '#E00A17', '#FECBCC');

    // 驗證淺色模式下可讀
    await gu.verifyContrast('A', 'light', { minRatio: 4.5 });

    // 切換到深色模式
    await gu.switchTheme('dark');

    // 驗證深色模式下可讀
    await gu.verifyContrast('A', 'dark', { minRatio: 4.5 });

    // 驗證顏色已自動調整
    const darkColor = await gu.getFieldColor('A');
    expect(darkColor).not.toBe('#E00A17'); // 已轉換
  });

  it('should handle conditional formatting rules', async () => {
    // 設定條件格式化規則
    await gu.addConditionalRule({
      condition: '$Status == "進行中"',
      style: { fillColor: '#FFFF00' }
    });

    // 切換主題
    await gu.switchTheme('dark');

    // 驗證規則仍然有效且可讀
    await gu.verifyRuleContrast(0, 'dark', { minRatio: 4.5 });
  });
});
```

---

## 📈 監控與日誌

### 效能監控

```typescript
class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();

  measureConversion(fn: () => void): number {
    const start = performance.now();
    fn();
    const duration = performance.now() - start;

    this.recordMetric('color_conversion', duration);
    return duration;
  }

  recordMetric(name: string, value: number) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name)!.push(value);
  }

  getStats(name: string): { avg: number, max: number, p95: number } {
    const values = this.metrics.get(name) || [];
    if (values.length === 0) return { avg: 0, max: 0, p95: 0 };

    const sorted = values.slice().sort((a, b) => a - b);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const max = sorted[sorted.length - 1];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];

    return { avg, max, p95 };
  }

  report() {
    console.log('=== Color Conversion Performance ===');
    for (const [name, values] of this.metrics.entries()) {
      const stats = this.getStats(name);
      console.log(`${name}: avg=${stats.avg.toFixed(2)}ms, max=${stats.max.toFixed(2)}ms, p95=${stats.p95.toFixed(2)}ms`);
    }
  }
}
```

### 錯誤日誌

```typescript
class ColorConversionLogger {
  logConversionError(
    color: string,
    sourceTheme: string,
    targetTheme: string,
    error: Error
  ) {
    console.error('[ColorConversion] Conversion failed', {
      color,
      sourceTheme,
      targetTheme,
      error: error.message,
      stack: error.stack
    });

    // 傳送到錯誤追蹤系統
    // Sentry.captureException(error, { extra: { color, sourceTheme, targetTheme } });
  }

  logContrastWarning(
    textColor: string,
    bgColor: string,
    ratio: number
  ) {
    console.warn('[ColorConversion] Low contrast detected', {
      textColor,
      bgColor,
      ratio,
      threshold: 4.5
    });
  }
}
```

---

## 🔐 安全性考量

### 輸入驗證

```typescript
function validateColorInput(color: string): boolean {
  // 驗證 hex 格式
  const hexPattern = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  if (!hexPattern.test(color)) {
    throw new Error(`Invalid hex color: ${color}`);
  }

  // 防止 CSS injection
  if (color.includes(';') || color.includes('expression')) {
    throw new Error(`Potentially malicious color value: ${color}`);
  }

  return true;
}
```

### 資料清理

```typescript
function sanitizeColorConfig(config: any): ThemeAdaptiveColorConfig {
  // 確保只包含允許的欄位
  const allowed = ['mode', 'baseTheme', 'baseColor', 'lightColor', 'darkColor', 'version'];
  const sanitized: any = {};

  for (const key of allowed) {
    if (key in config) {
      sanitized[key] = config[key];
    }
  }

  // 驗證顏色值
  if (sanitized.baseColor) validateColorInput(sanitized.baseColor);
  if (sanitized.lightColor) validateColorInput(sanitized.lightColor);
  if (sanitized.darkColor) validateColorInput(sanitized.darkColor);

  return sanitized as ThemeAdaptiveColorConfig;
}
```

---

## 📚 技術參考

### 色彩空間轉換公式

**RGB to HSL**:
```
R, G, B ∈ [0, 1]
Cmax = max(R, G, B)
Cmin = min(R, G, B)
Δ = Cmax - Cmin

H = {
  0°                  if Δ = 0
  60° × (G-B)/Δ mod 6  if Cmax = R
  60° × (B-R)/Δ + 2    if Cmax = G
  60° × (R-G)/Δ + 4    if Cmax = B
}

L = (Cmax + Cmin) / 2

S = {
  0           if Δ = 0
  Δ/(1-|2L-1|) otherwise
}
```

**HSL to RGB**:
```
C = (1 - |2L - 1|) × S
X = C × (1 - |(H/60°) mod 2 - 1|)
m = L - C/2

(R', G', B') = {
  (C, X, 0) if 0° ≤ H < 60°
  (X, C, 0) if 60° ≤ H < 120°
  (0, C, X) if 120° ≤ H < 180°
  (0, X, C) if 180° ≤ H < 240°
  (X, 0, C) if 240° ≤ H < 300°
  (C, 0, X) if 300° ≤ H < 360°
}

(R, G, B) = (R'+m, G'+m, B'+m)
```

### 對比度計算公式 (WCAG 2.1)

**相對亮度**:
```
RsRGB = R8bit / 255
GsRGB = G8bit / 255
BsRGB = B8bit / 255

R = {
  RsRGB / 12.92              if RsRGB ≤ 0.03928
  ((RsRGB + 0.055) / 1.055)^2.4  otherwise
}
// G, B 同理

L = 0.2126 × R + 0.7152 × G + 0.0722 × B
```

**對比度**:
```
L1 = 較亮顏色的相對亮度
L2 = 較暗顏色的相對亮度

CR = (L1 + 0.05) / (L2 + 0.05)
```

**WCAG 標準**:
- AA 級別（普通文字）: CR ≥ 4.5:1
- AA 級別（大文字）: CR ≥ 3:1
- AAA 級別（普通文字）: CR ≥ 7:1

---

## 🎓 最佳實踐

### 1. 顏色選擇建議

- **文字顏色**: 選擇中等到深色的顏色（L: 20-50%）
- **背景顏色**: 選擇淺色到中等的顏色（L: 80-95%）
- **避免純色**: 純紅(#FF0000)、純綠(#00FF00) 等在深色模式會過於刺眼
- **灰階謹慎**: 中等灰度(#888888)在兩種模式下都可能對比度不足

### 2. 轉換品質保證

- **往返測試**: 淺→深→淺應該回到接近原始顏色 (ΔE < 5)
- **對比度優先**: 如果色相和對比度衝突，優先確保對比度
- **語義保持**: 紅色系應該仍然表達「警告」、綠色系表達「成功」

### 3. 使用者教育

- 提供「建議顏色」指示器
- 在選色器中顯示對比度即時回饋
- 提供常見問題文件和最佳實踐指南

---

## 📋 檢查清單

開發完成前的檢查項目：

### 功能完整性
- [ ] 自動顏色轉換功能正常
- [ ] 手動模式功能正常
- [ ] 雙主題預覽正常顯示
- [ ] 對比度計算準確
- [ ] 現有顏色配置成功遷移

### 效能指標
- [ ] 主題切換延遲 < 100ms
- [ ] 顏色轉換計算 < 10ms per color
- [ ] 記憶體增長 < 1MB

### 品質標準
- [ ] 轉換後對比度 ≥ 95% 符合 WCAG AA
- [ ] 色相誤差 < 15°
- [ ] 往返一致性 ΔE < 5

### 測試覆蓋
- [ ] 單元測試覆蓋率 ≥ 80%
- [ ] 整合測試通過
- [ ] E2E 測試通過
- [ ] 瀏覽器相容性測試通過

### 文件完整
- [ ] API 文件完整
- [ ] 使用者指南完成
- [ ] 遷移指南完成
- [ ] 技術文件更新

---

**文件版本**: 1.0
**最後更新**: 2025-11-18
**審核狀態**: ⏳ 待審核
