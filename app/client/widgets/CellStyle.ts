import { makeT } from 'app/client/lib/localization';
import {allCommands} from 'app/client/components/commands';
import {GristDoc} from 'app/client/components/GristDoc';
import {ViewFieldRec} from 'app/client/models/entities/ViewFieldRec';
import {textButton} from 'app/client/ui2018/buttons';
import {themeAdaptiveColorSelect} from 'app/client/ui2018/ThemeAdaptiveColorSelect';
import {testId, theme, vars} from 'app/client/ui2018/cssVars';
import {gristThemeObs} from 'app/client/ui2018/theme';
import {ConditionalStyle} from 'app/client/widgets/ConditionalStyle';
import {colorStorage} from 'app/client/lib/colors/ColorStorage';
import {ThemeAdaptiveColorConfig} from 'app/client/lib/colors/types';
import {Computed, Disposable, dom, DomContents, fromKo, Observable, styled} from 'grainjs';

const t = makeT('CellStyle');

export class CellStyle extends Disposable {

  constructor(
    private _field: ViewFieldRec,
    private _gristDoc: GristDoc,
    _defaultTextColor: string|undefined
  ) {
    super();
  }

  public buildDom(): DomContents {
    const isTableWidget = this._field.viewSection().parentKey() === 'record';
    const currentTheme = Computed.create(this, gristThemeObs(), (_use, themeObj) =>
      themeObj.appearance as 'light' | 'dark'
    );

    return [
      dom.maybe(use => isTableWidget, () => {
        return [
          cssLine(
            cssLabel(t('HEADER STYLE')),
          ),
          cssRow(
            testId('header-color-select'),
            dom.domComputedOwned(fromKo(this._field.config.headerStyle), (holder, options) => {
              // Get both legacy color observables and new config observables
              const headerTextColor = fromKo(options.prop("headerTextColor"));
              const headerFillColor = fromKo(options.prop("headerFillColor"));
              const headerTextColorConfig = fromKo(options.prop("headerTextColorConfig"));
              const headerFillColorConfig = fromKo(options.prop("headerFillColorConfig"));
              const headerFontBold = fromKo(options.prop("headerFontBold"));
              const headerFontUnderline = fromKo(options.prop("headerFontUnderline"));
              const headerFontItalic = fromKo(options.prop("headerFontItalic"));
              const headerFontStrikethrough = fromKo(options.prop("headerFontStrikethrough"));

              // Migrate legacy colors to configs if needed
              this._ensureConfigMigration(holder, headerTextColor, headerTextColorConfig, currentTheme);
              this._ensureConfigMigration(holder, headerFillColor, headerFillColorConfig, currentTheme);

              const hasMixedStyle = Computed.create(holder, use => {
                if (!use(this._field.config.multiselect)) { return false; }
                const commonStyle = [
                  use(options.mixed('headerTextColor')),
                  use(options.mixed('headerFillColor')),
                  use(options.mixed('headerTextColorConfig')),
                  use(options.mixed('headerFillColorConfig')),
                  use(options.mixed('headerFontBold')),
                  use(options.mixed('headerFontUnderline')),
                  use(options.mixed('headerFontItalic')),
                  use(options.mixed('headerFontStrikethrough'))
                ];
                return commonStyle.some(Boolean);
              });

              return themeAdaptiveColorSelect(
                {
                  textConfig: headerTextColorConfig as Observable<ThemeAdaptiveColorConfig | undefined>,
                  fillConfig: headerFillColorConfig as Observable<ThemeAdaptiveColorConfig | undefined>,
                  fontBold: headerFontBold,
                  fontItalic: headerFontItalic,
                  fontUnderline: headerFontUnderline,
                  fontStrikethrough: headerFontStrikethrough
                },
                {
                  onSave: () => options.save(),
                  onRevert: () => options.revert(),
                  placeholder: use => use(hasMixedStyle) ? t('Mixed style') : t('Default header style'),
                  currentTheme
                }
              );
            }),
          )];
      }),
      cssLine(
        cssLabel(t('CELL STYLE')),
        cssButton(
          t('Open row styles'),
          dom.on('click', allCommands.viewTabOpen.run),
          dom.hide(!isTableWidget),
        ),
      ),
      cssRow(
        testId('cell-color-select'),
        dom.domComputedOwned(fromKo(this._field.config.style), (holder, options) => {
          // Get both legacy color observables and new config observables
          const textColor = fromKo(options.prop("textColor"));
          const fillColor = fromKo(options.prop("fillColor"));
          const textColorConfig = fromKo(options.prop("textColorConfig"));
          const fillColorConfig = fromKo(options.prop("fillColorConfig"));
          const fontBold = fromKo(options.prop("fontBold"));
          const fontUnderline = fromKo(options.prop("fontUnderline"));
          const fontItalic = fromKo(options.prop("fontItalic"));
          const fontStrikethrough = fromKo(options.prop("fontStrikethrough"));

          // Migrate legacy colors to configs if needed
          this._ensureConfigMigration(holder, textColor, textColorConfig, currentTheme);
          this._ensureConfigMigration(holder, fillColor, fillColorConfig, currentTheme);

          const hasMixedStyle = Computed.create(holder, use => {
            if (!use(this._field.config.multiselect)) { return false; }
            const commonStyle = [
              use(options.mixed('textColor')),
              use(options.mixed('fillColor')),
              use(options.mixed('textColorConfig')),
              use(options.mixed('fillColorConfig')),
              use(options.mixed('fontBold')),
              use(options.mixed('fontUnderline')),
              use(options.mixed('fontItalic')),
              use(options.mixed('fontStrikethrough'))
            ];
            return commonStyle.some(Boolean);
          });

          return themeAdaptiveColorSelect(
            {
              textConfig: textColorConfig as Observable<ThemeAdaptiveColorConfig | undefined>,
              fillConfig: fillColorConfig as Observable<ThemeAdaptiveColorConfig | undefined>,
              fontBold: fontBold,
              fontItalic: fontItalic,
              fontUnderline: fontUnderline,
              fontStrikethrough: fontStrikethrough
            },
            {
              onSave: () => options.save(),
              onRevert: () => options.revert(),
              placeholder: use => use(hasMixedStyle) ? t('Mixed style') : t('Default cell style'),
              currentTheme
            }
          );
        }),
      ),
      dom.create(ConditionalStyle, t("Cell style"), this._field, this._gristDoc, fromKo(this._field.config.multiselect))
    ];
  }

  /**
   * Ensures legacy color strings are migrated to ThemeAdaptiveColorConfig.
   * If a config doesn't exist but a legacy color does, create an auto config.
   */
  private _ensureConfigMigration(
    owner: Disposable,
    legacyColorObs: Observable<string | undefined>,
    configObs: Observable<ThemeAdaptiveColorConfig | undefined>,
    currentTheme: Computed<'light' | 'dark'>
  ): void {
    owner.autoDispose(legacyColorObs.addListener((legacyColor) => {
      // Only migrate if we have a legacy color but no config
      if (legacyColor && !configObs.get()) {
        const theme = currentTheme.get();
        try {
          const config = colorStorage.createAutoConfig(legacyColor, theme);
          configObs.set(config);
        } catch (e) {
          // Invalid color, skip migration
          console.warn('Failed to migrate legacy color:', legacyColor, e);
        }
      }
    }));
  }
}

const cssLine = styled('div', `
  display: flex;
  margin: 16px 16px 8px 16px;
  justify-content: space-between;
  align-items: baseline;
`);

const cssLabel = styled('div', `
  color: ${theme.text};
  text-transform: uppercase;
  font-size: ${vars.xsmallFontSize};
`);

const cssButton = styled(textButton, `
  font-size: ${vars.mediumFontSize};
`);

const cssRow = styled('div', `
  display: flex;
  margin: 8px 16px;
  align-items: center;
  &-top-space {
    margin-top: 24px;
  }
  &-disabled {
    color: ${theme.disabledText};
  }
`);
