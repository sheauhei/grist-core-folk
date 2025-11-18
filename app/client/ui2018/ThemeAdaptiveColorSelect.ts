/**
 * ThemeAdaptiveColorSelect - Extended color picker with theme-adaptive capabilities
 *
 * Supports two modes:
 * - Auto: User picks one color, system automatically converts for other theme
 * - Manual: User explicitly sets colors for both light and dark themes
 */

import { basicButton, primaryButton } from 'app/client/ui2018/buttons';
import { isLight, swatches } from 'app/client/ui2018/ColorPalette';
import { colorPreview } from 'app/client/ui2018/ColorPreview';
import { testId, theme, vars } from 'app/client/ui2018/cssVars';
import { textInput } from 'app/client/ui2018/editableLabel';
import { icon } from 'app/client/ui2018/icons';
import { cssSelectBtn } from 'app/client/ui2018/select';
import { isValidHex } from 'app/common/gutil';
import { BindableValue, Computed, Disposable, dom, DomElementArg, Observable, onKeyDown, styled } from 'grainjs';
import { defaultMenuOptions, IOpenController, setPopupToCreateDom } from 'popweasel';
import { makeT } from 'app/client/lib/localization';
import { gristFloatingMenuClass } from 'app/client/ui2018/menus';
import { themeAdaptiveColor } from 'app/client/lib/colors/ThemeAdaptiveColor';
import { colorStorage } from 'app/client/lib/colors/ColorStorage';
import { ThemeAdaptiveColorConfig, ThemeAppearance, ColorRole } from 'app/client/lib/colors/types';

const t = makeT('ThemeAdaptiveColorSelect');

export interface ThemeAdaptiveStyleOptions {
  textConfig: Observable<ThemeAdaptiveColorConfig | undefined>;
  fillConfig: Observable<ThemeAdaptiveColorConfig | undefined>;
  fontBold?: Observable<boolean | undefined>;
  fontUnderline?: Observable<boolean | undefined>;
  fontItalic?: Observable<boolean | undefined>;
  fontStrikethrough?: Observable<boolean | undefined>;
}

/**
 * Creates a theme-adaptive color selector button with popup picker
 */
export function themeAdaptiveColorSelect(
  styleOptions: ThemeAdaptiveStyleOptions,
  options: {
    onSave: () => Promise<void>;
    onOpen?: () => void;
    onRevert?: () => void;
    placeholder?: BindableValue<string>;
    currentTheme: Observable<ThemeAppearance>;
  }
): Element {
  const {
    textConfig,
    fillConfig,
    fontBold,
    fontUnderline,
    fontItalic,
    fontStrikethrough,
  } = styleOptions;
  const {
    onSave,
    onOpen,
    onRevert,
    placeholder = t("Default cell style"),
    currentTheme,
  } = options;

  // Resolve current theme colors for button display
  const textColor = Computed.create(null, textConfig, currentTheme, (_use, config, theme) => {
    return themeAdaptiveColor.resolveColor(config, 'text', theme) || '#000000';
  });

  const fillColor = Computed.create(null, fillConfig, currentTheme, (_use, config, theme) => {
    return themeAdaptiveColor.resolveColor(config, 'fill', theme) || '';
  });

  const selectBtn = cssSelectBtn(
    cssContent(
      cssButtonIcon(
        'T',
        dom.style('color', textColor),
        dom.style('background-color', fillColor),
        fontBold ? dom.cls('font-bold', use => use(fontBold) ?? false) : null,
        fontItalic ? dom.cls('font-italic', use => use(fontItalic) ?? false) : null,
        fontUnderline ? dom.cls('font-underline', use => use(fontUnderline) ?? false) : null,
        fontStrikethrough ? dom.cls('font-strikethrough', use => use(fontStrikethrough) ?? false) : null,
        cssLightBorder.cls(''),
        testId('btn-icon'),
      ),
      dom.text(placeholder),
    ),
    icon('Dropdown'),
    testId('theme-adaptive-color-select'),
  );

  const domCreator = (ctl: IOpenController) => {
    onOpen?.();
    return buildThemeAdaptiveColorPicker(ctl, {
      styleOptions,
      onSave,
      onRevert,
      currentTheme,
    });
  };

  setPopupToCreateDom(selectBtn, domCreator, { ...defaultMenuOptions, placement: 'bottom-end' });

  return dom('div',
    selectBtn,
    dom.autoDispose(textColor),
    dom.autoDispose(fillColor),
  );
}

interface ThemeAdaptiveColorPickerOptions {
  styleOptions: ThemeAdaptiveStyleOptions;
  currentTheme: Observable<ThemeAppearance>;
  onSave?: () => Promise<void>;
  onRevert?: () => void;
  onClose?: () => void;
}

export function buildThemeAdaptiveColorPicker(
  ctl: IOpenController,
  options: ThemeAdaptiveColorPickerOptions,
  ...domArgs: DomElementArg[]
): Element {
  const { styleOptions, currentTheme, onSave, onRevert, onClose } = options;
  const {
    textConfig,
    fillConfig,
    fontBold,
    fontUnderline,
    fontItalic,
    fontStrikethrough,
  } = styleOptions;

  const textConfigModel = ConfigModel.create(null, textConfig);
  const fillConfigModel = ConfigModel.create(null, fillConfig);
  const models: (BooleanModel | ConfigModel)[] = [textConfigModel, fillConfigModel];

  let fontBoldModel: BooleanModel | undefined;
  let fontUnderlineModel: BooleanModel | undefined;
  let fontItalicModel: BooleanModel | undefined;
  let fontStrikethroughModel: BooleanModel | undefined;

  if (fontBold) {
    fontBoldModel = BooleanModel.create(null, fontBold);
    models.push(fontBoldModel);
  }
  if (fontUnderline) {
    fontUnderlineModel = BooleanModel.create(null, fontUnderline);
    models.push(fontUnderlineModel);
  }
  if (fontItalic) {
    fontItalicModel = BooleanModel.create(null, fontItalic);
    models.push(fontItalicModel);
  }
  if (fontStrikethrough) {
    fontStrikethroughModel = BooleanModel.create(null, fontStrikethrough);
    models.push(fontStrikethroughModel);
  }

  const notChanged = Computed.create(null, use => models.every(m => use(m.needsSaving) === false));

  function revert() {
    onRevert?.();
    if (!onRevert) {
      models.forEach(m => m.revert());
    }
    ctl.close();
  }

  ctl.onDispose(async () => {
    if (!notChanged.get()) {
      try {
        await onSave?.();
      } catch (e) {
        onRevert?.();
        if (!onRevert) {
          models.forEach(m => m.revert());
        }
      }
    }
    models.forEach(m => m.dispose());
    notChanged.dispose();
    onClose?.();
  });

  return cssContainer(
    dom.cls(gristFloatingMenuClass),
    cssComponents(
      // Font options (same as original)
      dom.create(FontComponent, {
        fontBoldModel,
        fontUnderlineModel,
        fontItalicModel,
        fontStrikethroughModel,
      }),

      // Theme-adaptive text color picker
      dom.create(ThemeAdaptivePickerComponent, textConfigModel, {
        title: 'text',
        role: 'text',
        currentTheme,
      }),

      // Theme-adaptive fill color picker
      dom.create(ThemeAdaptivePickerComponent, fillConfigModel, {
        title: 'fill',
        role: 'fill',
        currentTheme,
      }),

      // Color preview showing both themes
      colorPreview({
        textConfig: textConfigModel.obs,
        fillConfig: fillConfigModel.obs,
        showBothThemes: true,
        showContrastInfo: true,
      }),
    ),

    // Focus and keyboard handling
    (elem: any) => { setTimeout(() => elem.focus(), 0); },
    onKeyDown({
      Escape: () => { revert(); },
      Enter: () => { ctl.close(); },
    }),

    cssButtonRow(
      primaryButton(t("Apply"),
        dom.on('click', () => ctl.close()),
        dom.boolAttr("disabled", notChanged),
        testId('colors-save')
      ),
      basicButton(t("Cancel"),
        dom.on('click', () => revert()),
        testId('colors-cancel')
      )
    ),

    // Restore focus after interacting with inputs
    dom.on('focusout', (ev, elem) => (ev.target !== elem) && elem.focus()),

    ...domArgs,
  );
}

// ============================================================================
// Models
// ============================================================================

/**
 * Model for tracking theme-adaptive color configuration changes
 */
class ConfigModel extends Disposable {
  public needsSaving: Observable<boolean>;
  private _serverValue: Observable<ThemeAdaptiveColorConfig | undefined>;
  private _localChange: boolean = false;

  constructor(public obs: Observable<ThemeAdaptiveColorConfig | undefined>) {
    super();
    this._serverValue = Observable.create(this, this.obs.get());
    this.needsSaving = Computed.create(this, use => {
      const current = use(this.obs);
      const server = use(this._serverValue);
      return JSON.stringify(current) !== JSON.stringify(server);
    });
    this.autoDispose(this.obs.addListener((val) => {
      if (this._localChange) { return; }
      this._serverValue.set(val);
    }));
  }

  public setValue(val: ThemeAdaptiveColorConfig | undefined) {
    this._localChange = true;
    this.obs.set(val);
    this._localChange = false;
  }

  public revert() {
    this.obs.set(this._serverValue.get());
  }
}

class BooleanModel extends Disposable {
  public needsSaving: Observable<boolean>;
  private _serverValue: Observable<boolean | undefined>;
  private _localChange: boolean = false;

  constructor(public obs: Observable<boolean | undefined>) {
    super();
    this._serverValue = Observable.create(this, this.obs.get());
    this.needsSaving = Computed.create(this, use => {
      const current = use(this.obs);
      const server = use(this._serverValue);
      return current !== (server ?? false);
    });
    this.autoDispose(this.obs.addListener((val) => {
      if (this._localChange) { return; }
      this._serverValue.set(val);
    }));
  }

  public setValue(val: boolean | undefined) {
    this._localChange = true;
    this.obs.set(val);
    this._localChange = false;
  }

  public revert() {
    this.obs.set(this._serverValue.get());
  }
}

// ============================================================================
// Components
// ============================================================================

interface ThemeAdaptivePickerOptions {
  title: string;
  role: ColorRole;
  currentTheme: Observable<ThemeAppearance>;
}

/**
 * Theme-adaptive color picker component
 */
class ThemeAdaptivePickerComponent extends Disposable {
  // Current mode (auto or manual)
  private _mode: Observable<'auto' | 'manual'>;

  // Base theme for auto mode
  private _baseTheme: Observable<ThemeAppearance>;

  // Colors for manual mode (and auto mode base color)
  private _lightColor: Observable<string | undefined>;
  private _darkColor: Observable<string | undefined>;

  constructor(
    private _model: ConfigModel,
    private _options: ThemeAdaptivePickerOptions
  ) {
    super();

    const initialConfig = this._model.obs.get();

    // Initialize observables from config
    this._mode = Observable.create(this, initialConfig?.mode || 'auto');
    this._baseTheme = Observable.create(this, initialConfig?.baseTheme || 'light');

    // For auto mode, use baseColor for the base theme
    // For manual mode, use explicit light/dark colors
    this._lightColor = Observable.create(this,
      initialConfig?.mode === 'manual'
        ? initialConfig.lightColor
        : (initialConfig?.baseTheme === 'light' ? initialConfig?.baseColor : undefined)
    );
    this._darkColor = Observable.create(this,
      initialConfig?.mode === 'manual'
        ? initialConfig.darkColor
        : (initialConfig?.baseTheme === 'dark' ? initialConfig?.baseColor : undefined)
    );

    // Update config when any value changes
    this.autoDispose(this._mode.addListener(() => this._updateConfig()));
    this.autoDispose(this._baseTheme.addListener(() => this._updateConfig()));
    this.autoDispose(this._lightColor.addListener(() => this._updateConfig()));
    this.autoDispose(this._darkColor.addListener(() => this._updateConfig()));
  }

  private _updateConfig() {
    const mode = this._mode.get();

    if (mode === 'auto') {
      const baseTheme = this._baseTheme.get();
      const baseColor = baseTheme === 'light' ? this._lightColor.get() : this._darkColor.get();

      if (baseColor) {
        const config = colorStorage.createAutoConfig(baseColor, baseTheme);
        this._model.setValue(config);
      } else {
        this._model.setValue(undefined);
      }
    } else {
      const lightColor = this._lightColor.get();
      const darkColor = this._darkColor.get();

      if (lightColor && darkColor) {
        const config = colorStorage.createManualConfig(lightColor, darkColor);
        this._model.setValue(config);
      } else {
        this._model.setValue(undefined);
      }
    }
  }

  public buildDom() {
    const title = this._options.title;

    return cssPickerSection(
      // Header with mode toggle
      cssHeaderRow(
        cssHeaderTitle(title),
        cssModeToggle(
          cssModeOption(
            t("Auto"),
            cssModeOption.cls('-active', use => use(this._mode) === 'auto'),
            dom.on('click', () => this._switchToAutoMode()),
            testId(`${title}-mode-auto`),
          ),
          cssModeOption(
            t("Manual"),
            cssModeOption.cls('-active', use => use(this._mode) === 'manual'),
            dom.on('click', () => this._switchToManualMode()),
            testId(`${title}-mode-manual`),
          ),
          testId(`${title}-mode-toggle`),
        ),
      ),

      // Content based on mode
      dom.domComputed(this._mode, (mode) => {
        if (mode === 'auto') {
          return this._buildAutoModeUI();
        } else {
          return this._buildManualModeUI();
        }
      }),
    );
  }

  private _buildAutoModeUI(): Element {
    const title = this._options.title;
    const baseTheme = this._baseTheme;
    const baseColor = Computed.create(null, baseTheme, this._lightColor, this._darkColor,
      (_use, theme, light, dark) => theme === 'light' ? light : dark
    );

    return dom('div',
      // Base theme selector
      cssThemeSelector(
        cssThemeOption(
          t("Light"),
          cssThemeOption.cls('-active', use => use(baseTheme) === 'light'),
          dom.on('click', () => {
            this._baseTheme.set('light');
            // Preserve color by swapping if needed
            if (!this._lightColor.get() && this._darkColor.get()) {
              const config = this._model.obs.get();
              if (config && config.mode === 'auto') {
                const converted = themeAdaptiveColor.resolveBothThemes(config, this._options.role);
                this._lightColor.set(converted.light);
              }
            }
          }),
          testId(`${title}-base-light`),
        ),
        cssThemeOption(
          t("Dark"),
          cssThemeOption.cls('-active', use => use(baseTheme) === 'dark'),
          dom.on('click', () => {
            this._baseTheme.set('dark');
            // Preserve color by swapping if needed
            if (!this._darkColor.get() && this._lightColor.get()) {
              const config = this._model.obs.get();
              if (config && config.mode === 'auto') {
                const converted = themeAdaptiveColor.resolveBothThemes(config, this._options.role);
                this._darkColor.set(converted.dark);
              }
            }
          }),
          testId(`${title}-base-dark`),
        ),
        testId(`${title}-theme-selector`),
      ),

      // Single color picker for base theme
      this._buildColorPicker(baseColor, (color) => {
        if (baseTheme.get() === 'light') {
          this._lightColor.set(color);
        } else {
          this._darkColor.set(color);
        }
      }, `${title}-base`),

      dom.autoDispose(baseColor),
    );
  }

  private _buildManualModeUI(): Element {
    const title = this._options.title;

    return dom('div',
      // Light theme color picker
      cssManualColorSection(
        cssManualColorLabel(
          t("Light theme"),
          testId(`${title}-light-label`),
        ),
        this._buildColorPicker(this._lightColor, (color) => {
          this._lightColor.set(color);
        }, `${title}-light`),
      ),

      // Dark theme color picker
      cssManualColorSection(
        cssManualColorLabel(
          t("Dark theme"),
          testId(`${title}-dark-label`),
        ),
        this._buildColorPicker(this._darkColor, (color) => {
          this._darkColor.set(color);
        }, `${title}-dark`),
      ),
    );
  }

  private _buildColorPicker(
    colorObs: Observable<string | undefined>,
    onColorChange: (color: string | undefined) => void,
    testIdPrefix: string
  ): Element {
    const colorHex = Computed.create(null, colorObs, (_use, val) => val?.toUpperCase().slice(0, 7) || '');
    const colorCss = Computed.create(null, colorHex, (_use, color) => color || '');

    return dom('div',
      cssControlRow(
        cssColorPreview(
          dom.update(
            cssColorSquare(
              cssLightBorder.cls(''),
              dom.style('background-color', colorCss),
              cssNoneIcon('Empty',
                dom.hide(use => Boolean(use(colorCss)))
              ),
              testId(`${testIdPrefix}-square`),
            ),
            cssColorInput(
              { type: 'color' },
              dom.attr('value', use => use(colorObs) ?? ''),
              dom.on('input', (ev, elem) => onColorChange(elem.value || undefined)),
              testId(`${testIdPrefix}-input`),
            ),
          ),
          cssHexBox(
            colorHex,
            async (val) => {
              if (!val || isValidHex(val)) {
                onColorChange(val || undefined);
              }
            },
            dom.autoDispose(colorHex),
            testId(`${testIdPrefix}-hex`),
            dom.on('click', (ev, elem) => setTimeout(() => elem.select(), 0)),
          )
        ),
      ),
      cssPalette(
        swatches.map((color, index) => (
          cssColorSquare(
            dom.style('background-color', color),
            cssLightBorder.cls('', isLight(index)),
            cssColorSquare.cls('-selected', (use) => use(colorHex) === color),
            dom.style('outline-color', isLight(index) ? '' : color),
            dom.on('click', () => onColorChange(color)),
            testId(`${testIdPrefix}-color-${color}`),
          )
        )),
        testId(`${testIdPrefix}-palette`),
      ),
      dom.autoDispose(colorCss),
    );
  }

  private _switchToAutoMode() {
    const currentConfig = this._model.obs.get();
    this._mode.set('auto');

    // If switching from manual mode, convert to auto using current theme
    if (currentConfig?.mode === 'manual') {
      const currentTheme = this._options.currentTheme.get();
      const baseColor = currentTheme === 'light' ? currentConfig.lightColor : currentConfig.darkColor;
      if (baseColor) {
        this._baseTheme.set(currentTheme);
        if (currentTheme === 'light') {
          this._lightColor.set(baseColor);
        } else {
          this._darkColor.set(baseColor);
        }
      }
    }
  }

  private _switchToManualMode() {
    const currentConfig = this._model.obs.get();
    this._mode.set('manual');

    // If switching from auto mode, resolve both colors
    if (currentConfig?.mode === 'auto') {
      const both = themeAdaptiveColor.resolveBothThemes(currentConfig, this._options.role);
      this._lightColor.set(both.light);
      this._darkColor.set(both.dark);
    }
  }
}

/**
 * Font options component (same as original ColorSelect)
 */
class FontComponent extends Disposable {
  private _bold = this._options.fontBoldModel;
  private _underline = this._options.fontUnderlineModel;
  private _italic = this._options.fontItalicModel;
  private _strikethrough = this._options.fontStrikethroughModel;

  constructor(
    private _options: {
      fontBoldModel?: BooleanModel,
      fontUnderlineModel?: BooleanModel,
      fontItalicModel?: BooleanModel,
      fontStrikethroughModel?: BooleanModel,
    }
  ) {
    super();
  }

  public buildDom() {
    function option(iconName: any, model: BooleanModel) {
      return cssFontOption(
        cssFontIcon(iconName),
        dom.on('click', () => model.setValue(!model.obs.get())),
        cssFontOption.cls('-selected', use => use(model.obs) ?? false),
        testId(`font-option-${iconName}`)
      );
    }
    return cssFontOptions(
      this._bold ? option('FontBold', this._bold) : null,
      this._underline ? option('FontUnderline', this._underline) : null,
      this._italic ? option('FontItalic', this._italic) : null,
      this._strikethrough ? option('FontStrikethrough', this._strikethrough) : null,
    );
  }
}

// ============================================================================
// Styled Components
// ============================================================================

const cssContainer = styled('div', `
  padding: 18px 16px;
  background-color: ${theme.colorSelectBg};
  box-shadow: 0 2px 16px 0 ${theme.colorSelectShadow};
  z-index: 20;
  margin: 2px 0;
  &:focus {
    outline: none;
  }
`);

const cssComponents = styled('div', `
  display: flex;
  flex-direction: column;
  gap: 24px;
`);

const cssContent = styled('div', `
  display: flex;
  align-items: center;
`);

const cssButtonIcon = styled('div', `
  width: 20px;
  height: 20px;
  margin-right: 6px;
  margin-left: 4px;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
`);

const cssLightBorder = styled('div', `
  border: 1px solid ${theme.colorSelectColorSquareBorder};
`);

const cssButtonRow = styled('div', `
  gap: 8px;
  display: flex;
  margin-top: 24px;
`);

// Font options
const cssFontOptions = styled('div', `
  display: flex;
  border: 1px solid ${theme.colorSelectFontOptionsBorder};

  &:empty {
    display: none;
  }
`);

const cssFontOption = styled('div', `
  display: grid;
  place-items: center;
  flex-grow: 1;
  --icon-color: ${theme.colorSelectFontOptionFg};
  height: 24px;
  cursor: pointer;

  &:not(:last-child) {
    border-right: 1px solid ${theme.colorSelectFontOptionsBorder};
  }
  &:hover:not(&-selected) {
    background: ${theme.colorSelectFontOptionBgHover};
  }
  &-selected {
    background: ${theme.colorSelectFontOptionBgSelected};
    --icon-color: ${theme.colorSelectFontOptionFgSelected}
  }
`);

const cssFontIcon = styled(icon, `
  height: 12px;
  width: 12px;
`);

// Picker section
const cssPickerSection = styled('div', `
  display: flex;
  flex-direction: column;
  gap: 12px;
`);

const cssHeaderRow = styled('div', `
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
`);

const cssHeaderTitle = styled('div', `
  color: ${theme.colorSelectFg};
  text-transform: uppercase;
  font-size: ${vars.smallFontSize};
  font-weight: 600;
`);

// Mode toggle
const cssModeToggle = styled('div', `
  display: flex;
  border: 1px solid ${theme.colorSelectFontOptionsBorder};
  border-radius: 3px;
  overflow: hidden;
`);

const cssModeOption = styled('div', `
  padding: 2px 8px;
  font-size: ${vars.xsmallFontSize};
  cursor: pointer;
  background: ${theme.colorSelectBg};
  color: ${theme.colorSelectFg};
  transition: all 0.2s ease;

  &:hover:not(&-active) {
    background: ${theme.colorSelectFontOptionBgHover};
  }
  &-active {
    background: ${theme.colorSelectFontOptionBgSelected};
    color: ${theme.colorSelectFontOptionFgSelected};
    font-weight: 600;
  }
`);

// Theme selector (for auto mode)
const cssThemeSelector = styled('div', `
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
`);

const cssThemeOption = styled('div', `
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 6px 12px;
  border: 1px solid ${theme.colorSelectFontOptionsBorder};
  border-radius: 3px;
  cursor: pointer;
  font-size: ${vars.smallFontSize};
  transition: all 0.2s ease;

  &:hover:not(&-active) {
    background: ${theme.colorSelectFontOptionBgHover};
  }
  &-active {
    background: ${theme.colorSelectFontOptionBgSelected};
    color: ${theme.colorSelectFontOptionFgSelected};
    border-color: ${theme.colorSelectFontOptionBgSelected};
    font-weight: 600;
  }
`);

// Manual mode sections
const cssManualColorSection = styled('div', `
  display: flex;
  flex-direction: column;
  gap: 8px;
`);

const cssManualColorLabel = styled('div', `
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: ${vars.smallFontSize};
  color: ${theme.colorSelectFg};
  font-weight: 500;
`);

// Color picker controls
const cssControlRow = styled('div', `
  display: flex;
  justify-content: flex-start;
  margin-bottom: 8px;
`);

const cssColorPreview = styled('div', `
  display: flex;
`);

const cssColorSquare = styled('div', `
  width: 20px;
  height: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  &-selected {
    outline: 1px solid ${theme.colorSelectColorSquareBorder};
    outline-offset: 1px;
  }
`);

const cssColorInput = styled('input', `
  opacity: 0;
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  padding: 0;
  border: none;
`);

const cssHexBox = styled(textInput, `
  border: 1px solid ${theme.colorSelectInputBorder};
  border-left: none;
  font-size: ${vars.smallFontSize};
  display: flex;
  align-items: center;
  color: ${theme.colorSelectInputFg};
  background-color: ${theme.colorSelectInputBg};
  width: 56px;
  outline: none;
  padding: 0 3px;
  height: unset;
  border-radius: unset;
`);

const cssPalette = styled('div', `
  width: 236px;
  height: calc(4 * 20px + 3 * 4px);
  display: flex;
  flex-direction: column;
  flex-wrap: wrap;
  justify-content: space-between;
  align-content: space-between;
`);

const cssNoneIcon = styled(icon, `
  height: 100%;
  width: 100%;
  --icon-color: ${theme.iconError}
`);
