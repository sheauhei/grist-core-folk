# Feature 003: Excel 公式匯入 - 實作計劃

## 📅 文件資訊
- **建立日期**: 2025-11-18
- **功能編號**: 003
- **文件類型**: 實作計劃
- **狀態**: 草稿
- **前置文件**: [需求規格](./spec.md)

---

## 🎯 實作目標

### Phase 1 目標（本階段）
實現基本的 Excel 公式匯入和 cell reference 轉換功能

**範圍**:
- ✅ 讀取 Excel 檔案的公式
- ✅ 檢測公式欄位
- ✅ 轉換簡單的 cell references
- ✅ 基本錯誤處理

**不包含**:
- ❌ 複雜函數轉換（VLOOKUP, SUMIFS 等）
- ❌ 跨 sheet references
- ❌ 陣列公式

---

## 📦 實作階段

### Stage 1: Excel 解析與公式讀取（Week 1-2）

#### 1.1 設置 Excel 解析庫
**目標**: 安裝並配置能讀取 Excel 公式的庫

**技術選擇**:
```bash
# 安裝 exceljs - 支援公式讀取
npm install exceljs @types/exceljs

# 或使用 xlsx
npm install xlsx
```

**驗證測試**:
```typescript
// test/nbrowser/ExcelFormulaParser.ts
import * as ExcelJS from 'exceljs';

describe('Excel Formula Reading', () => {
  it('should read formula from Excel cell', async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Test');

    // 設置公式
    worksheet.getCell('A1').value = { formula: 'B1+C1' };

    // 驗證能讀取公式
    const cell = worksheet.getCell('A1');
    assert.equal(cell.formula, 'B1+C1');
  });
});
```

**實作檔案**:
- `app/common/ExcelFormulaParser.ts` - 公式解析器
- `test/common/ExcelFormulaParser.ts` - 測試檔案

#### 1.2 實作 Excel 讀取模組
**目標**: 讀取 Excel 檔案並提取公式資訊

**程式碼結構**:
```typescript
// app/common/ExcelFormulaParser.ts

export interface ExcelCellData {
  address: string;        // 'A1', 'B2', etc.
  value: any;            // 計算值
  formula?: string;      // 公式（如果有）
  type: 'formula' | 'value';
}

export interface ExcelSheetData {
  name: string;
  headers: string[];     // 第一行的標題
  columns: ExcelColumnData[];
  rows: ExcelCellData[][];
}

export interface ExcelColumnData {
  index: number;         // 0-based index
  letter: string;        // 'A', 'B', 'C'
  header: string;        // 欄位名稱
  hasFormula: boolean;   // 是否為公式欄位
  formulaPattern?: string; // 第一個公式的模式
}

export class ExcelFormulaParser {
  async parseFile(file: File): Promise<ExcelSheetData> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await file.arrayBuffer());

    const worksheet = workbook.worksheets[0];
    return this.parseWorksheet(worksheet);
  }

  private parseWorksheet(worksheet: ExcelJS.Worksheet): ExcelSheetData {
    const rows: ExcelCellData[][] = [];
    const headers: string[] = [];

    // 讀取所有 rows
    worksheet.eachRow((row, rowNumber) => {
      const rowData: ExcelCellData[] = [];

      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const cellData: ExcelCellData = {
          address: cell.address,
          value: cell.value,
          type: cell.formula ? 'formula' : 'value'
        };

        // 讀取公式
        if (cell.formula) {
          cellData.formula = this.extractFormula(cell);
        }

        rowData.push(cellData);
      });

      // 第一行是標題
      if (rowNumber === 1) {
        headers.push(...rowData.map(c => String(c.value || '')));
      }

      rows.push(rowData);
    });

    // 分析欄位資訊
    const columns = this.analyzeColumns(rows, headers);

    return {
      name: worksheet.name,
      headers,
      columns,
      rows
    };
  }

  private extractFormula(cell: ExcelJS.Cell): string {
    // ExcelJS 的 formula 可能是字串或物件
    if (typeof cell.formula === 'string') {
      return cell.formula;
    } else if (cell.formula && 'formula' in cell.formula) {
      return cell.formula.formula;
    }
    return '';
  }

  private analyzeColumns(
    rows: ExcelCellData[][],
    headers: string[]
  ): ExcelColumnData[] {
    const columns: ExcelColumnData[] = [];

    // 檢查第二行（第一個數據行）來判斷是否為公式欄位
    const firstDataRow = rows[1]; // rows[0] 是標題行

    if (!firstDataRow) {
      return columns;
    }

    firstDataRow.forEach((cell, index) => {
      const letter = this.indexToLetter(index);

      columns.push({
        index,
        letter,
        header: headers[index] || `Column${letter}`,
        hasFormula: cell.type === 'formula',
        formulaPattern: cell.formula
      });
    });

    return columns;
  }

  private indexToLetter(index: number): string {
    let letter = '';
    while (index >= 0) {
      letter = String.fromCharCode((index % 26) + 65) + letter;
      index = Math.floor(index / 26) - 1;
    }
    return letter;
  }
}
```

**測試案例**:
```typescript
describe('ExcelFormulaParser', () => {
  it('should detect formula columns', async () => {
    const parser = new ExcelFormulaParser();
    const data = await parser.parseFile(testExcelFile);

    // 假設 Total 欄位（第4欄）有公式
    const totalColumn = data.columns[3];
    assert.isTrue(totalColumn.hasFormula);
    assert.equal(totalColumn.formulaPattern, 'B2*C2');
  });
});
```

---

### Stage 2: 公式轉換引擎（Week 3-4）

#### 2.1 Cell Reference 解析器
**目標**: 解析和轉換 Excel cell references

**程式碼結構**:
```typescript
// app/common/CellReferenceConverter.ts

export interface ParsedCellRef {
  type: 'cell' | 'range';
  columnAbsolute: boolean;  // $A
  rowAbsolute: boolean;     // A$1
  column: string;           // 'A', 'B', 'C'
  row?: number;             // 1, 2, 3
  rangeEnd?: ParsedCellRef; // 如果是範圍
}

export class CellReferenceConverter {
  private columnMapping: Map<string, string>; // Excel col -> Grist col id

  constructor(columns: ExcelColumnData[]) {
    this.columnMapping = new Map();
    columns.forEach(col => {
      // 將 Excel 欄位對應到 Grist column id
      const gristColId = this.sanitizeColumnName(col.header);
      this.columnMapping.set(col.letter, gristColId);
    });
  }

  /**
   * 解析 cell reference
   * 範例: "A2", "$B$5", "C3:C10"
   */
  parseCellRef(ref: string): ParsedCellRef {
    // 處理範圍
    if (ref.includes(':')) {
      const [start, end] = ref.split(':');
      return {
        type: 'range',
        ...this.parseSingleRef(start),
        rangeEnd: this.parseSingleRef(end)
      };
    }

    return this.parseSingleRef(ref);
  }

  private parseSingleRef(ref: string): ParsedCellRef {
    // 解析格式: [$]A[$]1
    const match = ref.match(/^(\$?)([A-Z]+)(\$?)(\d+)?$/);

    if (!match) {
      throw new Error(`Invalid cell reference: ${ref}`);
    }

    const [, colAbs, column, rowAbs, row] = match;

    return {
      type: 'cell',
      columnAbsolute: colAbs === '$',
      rowAbsolute: rowAbs === '$',
      column,
      row: row ? parseInt(row) : undefined
    };
  }

  /**
   * 轉換 cell reference 為 Grist 語法
   */
  convertToGrist(ref: ParsedCellRef): string {
    if (ref.type === 'range') {
      return this.convertRangeToGrist(ref);
    }

    const gristColId = this.columnMapping.get(ref.column);
    if (!gristColId) {
      throw new Error(`Unknown column: ${ref.column}`);
    }

    // 處理不同類型的 reference
    if (ref.rowAbsolute && ref.row) {
      // 絕對 row: A$2 → ColumnA[1]  (row 2 = index 1, 因為跳過標題)
      return `${gristColId}[${ref.row - 2}]`;
    } else {
      // 相對 reference: A2 → $ColumnA
      return `$${gristColId}`;
    }
  }

  private convertRangeToGrist(ref: ParsedCellRef): string {
    const gristColId = this.columnMapping.get(ref.column);
    if (!gristColId) {
      throw new Error(`Unknown column: ${ref.column}`);
    }

    // 範圍 reference: A2:A10 → Table1.ColumnA
    // 注意: 這裡假設 table 名稱為 Table1，實際應從 context 獲取
    return `Table1.${gristColId}`;
  }

  /**
   * 清理欄位名稱為有效的 Python 識別字
   */
  private sanitizeColumnName(name: string): string {
    let sanitized = name.trim();

    // 替換空格為底線
    sanitized = sanitized.replace(/\s+/g, '_');

    // 移除特殊字元
    sanitized = sanitized.replace(/[^\w]/g, '');

    // 確保不以數字開頭
    if (/^\d/.test(sanitized)) {
      sanitized = 'col_' + sanitized;
    }

    // 避免 Python 保留字
    const reserved = ['and', 'or', 'not', 'if', 'else', 'for', 'while',
                      'return', 'def', 'class', 'import', 'from', 'as'];
    if (reserved.includes(sanitized.toLowerCase())) {
      sanitized += '_';
    }

    return sanitized;
  }

  /**
   * 轉換完整公式
   */
  convertFormula(excelFormula: string): string {
    let gristFormula = excelFormula;

    // 移除開頭的 '=' 符號
    if (gristFormula.startsWith('=')) {
      gristFormula = gristFormula.substring(1);
    }

    // 先處理範圍 references (A2:A10)
    gristFormula = gristFormula.replace(
      /\$?[A-Z]+\$?\d+:\$?[A-Z]+\$?\d+/g,
      (match) => {
        try {
          const ref = this.parseCellRef(match);
          return this.convertToGrist(ref);
        } catch (e) {
          console.warn(`Failed to convert range: ${match}`, e);
          return match; // 保留原始
        }
      }
    );

    // 再處理單一 cell references (A2, $B$5)
    gristFormula = gristFormula.replace(
      /\$?[A-Z]+\$?\d+/g,
      (match) => {
        try {
          const ref = this.parseCellRef(match);
          return this.convertToGrist(ref);
        } catch (e) {
          console.warn(`Failed to convert cell ref: ${match}`, e);
          return match; // 保留原始
        }
      }
    );

    return gristFormula;
  }
}
```

**測試案例**:
```typescript
describe('CellReferenceConverter', () => {
  let converter: CellReferenceConverter;

  beforeEach(() => {
    const columns = [
      { index: 0, letter: 'A', header: 'Name', hasFormula: false },
      { index: 1, letter: 'B', header: 'Price', hasFormula: false },
      { index: 2, letter: 'C', header: 'Quantity', hasFormula: false },
      { index: 3, letter: 'D', header: 'Total', hasFormula: true }
    ];
    converter = new CellReferenceConverter(columns);
  });

  it('should convert simple cell reference', () => {
    const result = converter.convertFormula('=B2*C2');
    assert.equal(result, '$Price * $Quantity');
  });

  it('should convert SUM with range', () => {
    const result = converter.convertFormula('=SUM(B2:B10)');
    assert.equal(result, 'SUM(Table1.Price)');
  });

  it('should convert absolute row reference', () => {
    const result = converter.convertFormula('=B$2');
    assert.equal(result, 'Price[0]');  // Row 2 = index 0 (跳過標題)
  });

  it('should convert complex formula', () => {
    const result = converter.convertFormula('=IF(C2>10, B2*0.9, B2)');
    assert.equal(result, 'IF($Quantity > 10, $Price * 0.9, $Price)');
  });
});
```

---

### Stage 3: Grist 匯入整合（Week 5-6）

#### 3.1 修改現有匯入流程
**目標**: 在現有的 Excel 匯入流程中加入公式轉換

**涉及檔案**:
- `app/client/components/Importer.ts` - 匯入主流程
- `app/common/ActiveDocAPI.ts` - API 介面
- `app/server/lib/ActiveDoc.ts` - 後端處理

**修改點 1: Importer UI**
```typescript
// app/client/components/Importer.ts

// 新增選項: 是否轉換公式
private _convertFormulas = Observable.create<boolean>(this, true);

public buildDom() {
  return dom('div',
    // ... 現有 UI ...

    // 新增公式轉換選項
    cssCheckbox(
      dom('input', {
        type: 'checkbox',
        checked: this._convertFormulas,
        onChange: (e) => this._convertFormulas.set(e.target.checked)
      }),
      dom('label', 'Auto-convert Excel formulas')
    ),

    // 顯示檢測到的公式欄位數量
    dom.maybe(this._formulaColumns, (cols) =>
      cssInfoBox(
        `Detected ${cols.length} formula column(s)`
      )
    )
  );
}

// 匯入前的預處理
private async _preprocessExcelData(file: File): Promise<ImportData> {
  if (!this._convertFormulas.get()) {
    // 如果不轉換公式，使用原有流程
    return this._parseExcel(file);
  }

  // 使用新的公式解析器
  const parser = new ExcelFormulaParser();
  const excelData = await parser.parseFile(file);

  // 儲存公式欄位資訊
  this._formulaColumns.set(
    excelData.columns.filter(c => c.hasFormula)
  );

  // 轉換公式
  const converter = new CellReferenceConverter(excelData.columns);
  const convertedData = this._convertFormulas(excelData, converter);

  return convertedData;
}
```

**修改點 2: 後端 API**
```typescript
// app/common/ActiveDocAPI.ts

export interface ImportFormulaColumnInfo {
  colId: string;
  label: string;
  type: string;
  formula: string;         // 轉換後的 Grist 公式
  originalFormula: string; // 原始 Excel 公式（用於參考）
}

export interface ImportOptionsWithFormulas extends ImportOptions {
  formulaColumns?: ImportFormulaColumnInfo[];
  convertFormulas?: boolean;
}

// app/server/lib/ActiveDoc.ts

public async importFiles(
  docSession: DocSession,
  data: ImportData,
  options: ImportOptionsWithFormulas
): Promise<ImportResult> {
  // ... 現有邏輯 ...

  // 如果有公式欄位，特別處理
  if (options.formulaColumns && options.formulaColumns.length > 0) {
    await this._importWithFormulas(data, options);
  } else {
    await this._importNormal(data, options);
  }
}

private async _importWithFormulas(
  data: ImportData,
  options: ImportOptionsWithFormulas
): Promise<void> {
  const tableId = await this._createTableWithFormulas(
    data.tableName,
    data.columns,
    options.formulaColumns!
  );

  // 只匯入非公式欄位的數據
  const dataColumns = data.columns.filter(col =>
    !options.formulaColumns!.find(fc => fc.colId === col.id)
  );

  await this._importData(tableId, dataColumns, data.rows);
}

private async _createTableWithFormulas(
  tableName: string,
  columns: ColumnInfo[],
  formulaColumns: ImportFormulaColumnInfo[]
): Promise<string> {
  const columnDefs = columns.map(col => {
    const formulaInfo = formulaColumns.find(fc => fc.colId === col.id);

    return {
      id: col.id,
      label: col.label,
      type: formulaInfo ? 'Any' : col.type,  // 公式欄位使用 Any 類型
      formula: formulaInfo?.formula,
      isFormula: !!formulaInfo
    };
  });

  return await this.addTable(tableName, columnDefs);
}
```

---

### Stage 4: 錯誤處理與用戶反饋（Week 7）

#### 4.1 轉換報告
**目標**: 向使用者展示轉換結果和問題

**程式碼結構**:
```typescript
// app/client/components/FormulaConversionReport.ts

export interface ConversionResult {
  success: boolean;
  columnId: string;
  columnName: string;
  excelFormula: string;
  gristFormula?: string;
  error?: string;
  warning?: string;
}

export class FormulaConversionReport extends Disposable {
  constructor(private _results: ConversionResult[]) {
    super();
  }

  public buildDom(): Element {
    const successful = this._results.filter(r => r.success);
    const failed = this._results.filter(r => !r.success);
    const warnings = this._results.filter(r => r.warning);

    return cssReportContainer(
      cssReportHeader('Formula Conversion Report'),

      cssReportSummary(
        cssSummaryItem(
          cssSuccessIcon('✓'),
          ` ${successful.length} formula(s) converted successfully`
        ),
        failed.length > 0 && cssSummaryItem(
          cssErrorIcon('✗'),
          ` ${failed.length} formula(s) failed to convert`
        ),
        warnings.length > 0 && cssSummaryItem(
          cssWarningIcon('⚠'),
          ` ${warnings.length} formula(s) with warnings`
        )
      ),

      // 成功的轉換
      successful.length > 0 && [
        cssReportSection('Successfully Converted:'),
        ...successful.map(r => this._buildSuccessItem(r))
      ],

      // 失敗的轉換
      failed.length > 0 && [
        cssReportSection('Failed Conversions:'),
        ...failed.map(r => this._buildFailureItem(r))
      ],

      // 警告
      warnings.length > 0 && [
        cssReportSection('Warnings:'),
        ...warnings.map(r => this._buildWarningItem(r))
      ],

      cssReportActions(
        bigPrimaryButton('Continue', () => this._onContinue()),
        bigBasicButton('Review & Edit', () => this._onReview())
      )
    );
  }

  private _buildSuccessItem(result: ConversionResult): Element {
    return cssConversionItem(
      cssColumnName(result.columnName),
      cssFormulaComparison(
        cssLabel('Excel:'),
        cssFormula(result.excelFormula),
        cssArrow('→'),
        cssLabel('Grist:'),
        cssFormula(result.gristFormula!)
      )
    );
  }

  private _buildFailureItem(result: ConversionResult): Element {
    return cssConversionItem(
      cssColumnName(result.columnName),
      cssErrorMessage(result.error!),
      cssFormulaComparison(
        cssLabel('Original Excel formula:'),
        cssFormula(result.excelFormula)
      ),
      cssSuggestion('This column will be imported as a data column.')
    );
  }

  private _buildWarningItem(result: ConversionResult): Element {
    return cssConversionItem(
      cssColumnName(result.columnName),
      cssWarningMessage(result.warning!),
      cssFormulaComparison(
        cssLabel('Excel:'),
        cssFormula(result.excelFormula),
        cssLabel('Grist:'),
        cssFormula(result.gristFormula!)
      ),
      cssSuggestion('Please verify this formula works correctly.')
    );
  }
}
```

#### 4.2 錯誤處理策略
```typescript
// app/common/FormulaConverter.ts

export class FormulaConverter {
  public convertWithErrorHandling(
    excelFormula: string,
    columnName: string
  ): ConversionResult {
    try {
      // 嘗試轉換
      const gristFormula = this._converter.convertFormula(excelFormula);

      // 驗證轉換結果
      const validation = this._validateFormula(gristFormula);

      if (validation.hasWarning) {
        return {
          success: true,
          columnId: this._sanitize(columnName),
          columnName,
          excelFormula,
          gristFormula,
          warning: validation.warning
        };
      }

      return {
        success: true,
        columnId: this._sanitize(columnName),
        columnName,
        excelFormula,
        gristFormula
      };

    } catch (error) {
      // 轉換失敗，記錄錯誤
      return {
        success: false,
        columnId: this._sanitize(columnName),
        columnName,
        excelFormula,
        error: this._formatError(error)
      };
    }
  }

  private _validateFormula(formula: string): ValidationResult {
    const warnings: string[] = [];

    // 檢查是否包含未轉換的 cell references
    if (/[A-Z]+\d+/.test(formula)) {
      warnings.push('Formula may contain unconverted cell references');
    }

    // 檢查是否包含不支援的函數
    const unsupportedFunctions = ['VLOOKUP', 'HLOOKUP', 'SUMIFS', 'COUNTIFS'];
    unsupportedFunctions.forEach(fn => {
      if (formula.includes(fn)) {
        warnings.push(`Function ${fn} may not be supported`);
      }
    });

    return {
      hasWarning: warnings.length > 0,
      warning: warnings.join('; ')
    };
  }

  private _formatError(error: any): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }
}
```

---

## 🧪 測試策略

### 單元測試
```typescript
// test/common/CellReferenceConverter.ts
describe('CellReferenceConverter', () => {
  describe('simple references', () => {
    it('converts A2 to $ColumnA');
    it('converts B2 to $ColumnB');
    it('preserves case in function names');
  });

  describe('absolute references', () => {
    it('converts $A$2 to ColumnA[0]');
    it('converts A$2 to ColumnA[0]');
    it('converts $A2 to $ColumnA');
  });

  describe('range references', () => {
    it('converts A2:A10 to Table1.ColumnA');
    it('converts B:B to Table1.ColumnB');
  });

  describe('complex formulas', () => {
    it('converts =SUM(A2:A10)');
    it('converts =IF(B2>100, C2*0.9, C2)');
    it('converts =AVERAGE(B:B)');
  });
});
```

### 整合測試
```typescript
// test/nbrowser/ExcelFormulaImport.ts
describe('Excel Formula Import', () => {
  it('should import Excel with formulas', async function() {
    // 1. 上傳測試 Excel 檔案
    await driver.find('.test-importer-upload').click();
    await driver.sendKeys('test/fixtures/formulas.xlsx');

    // 2. 確認公式檢測
    assert.equal(
      await driver.find('.test-formula-count').getText(),
      'Detected 2 formula column(s)'
    );

    // 3. 執行匯入
    await driver.find('.test-importer-import').click();

    // 4. 驗證轉換報告
    assert.equal(
      await driver.find('.test-success-count').getText(),
      '2 formula(s) converted successfully'
    );

    // 5. 確認數據正確匯入
    const cell = await driver.find('.test-cell-D2').getText();
    assert.equal(cell, '500'); // Price * Quantity
  });
});
```

### 端到端測試
```typescript
describe('E2E: Excel to Grist Migration', () => {
  it('should migrate complete Excel workbook', async () => {
    // 完整的遷移流程測試
    // 1. 上傳 Excel
    // 2. 檢查預覽
    // 3. 調整選項
    // 4. 執行匯入
    // 5. 驗證結果
    // 6. 測試公式計算
  });
});
```

---

## 📋 檢查清單

### 開發檢查
- [ ] ExcelFormulaParser 實作完成
- [ ] CellReferenceConverter 實作完成
- [ ] Importer UI 整合完成
- [ ] 後端 API 修改完成
- [ ] 錯誤處理實作完成
- [ ] 轉換報告 UI 完成

### 測試檢查
- [ ] 單元測試通過率 ≥ 90%
- [ ] 整合測試全部通過
- [ ] 端到端測試全部通過
- [ ] 效能測試達標（1000 行 < 5 秒）

### 文件檢查
- [ ] API 文件更新
- [ ] 使用者手冊更新
- [ ] 轉換規則說明文件
- [ ] 已知限制清單

### 發布檢查
- [ ] Code review 完成
- [ ] QA 測試通過
- [ ] 效能測試通過
- [ ] 安全性檢查通過

---

## 🚀 部署計劃

### 部署階段
1. **Alpha 測試** (Week 8): 內部團隊測試
2. **Beta 測試** (Week 9-10): 選定用戶測試
3. **正式發布** (Week 11): 所有用戶可用

### 回滾計劃
- 保留舊的匯入流程作為備用
- 新增 feature flag 控制新功能啟用
- 監控錯誤率，超過 10% 自動回滾

---

## 📊 成功指標

### 開發階段
- 程式碼覆蓋率 ≥ 80%
- 所有測試通過
- 無 critical 或 high severity bugs

### 使用階段
- 轉換成功率 ≥ 80%
- 使用者滿意度 ≥ 4/5
- 錯誤回報率 < 5%

---

## 📞 相關資源

### 參考實作
- [SheetJS Formula Examples](https://docs.sheetjs.com/docs/csf/features/formulae)
- [OpenPyXL Formula Support](https://openpyxl.readthedocs.io/en/stable/formula.html)

### 技術文件
- [Grist Formula Reference](https://support.getgrist.com/formulas/)
- [Excel Formula Syntax](https://support.microsoft.com/en-us/office/overview-of-formulas-in-excel-ecfdc708-9162-49e8-b993-c311f47ca173)

---

**最後更新**: 2025-11-18
