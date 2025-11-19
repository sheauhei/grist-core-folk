# Feature 003: Excel 公式匯入與轉換

## 📅 文件資訊
- **建立日期**: 2025-11-18
- **功能編號**: 003
- **功能名稱**: Excel Formula Import with Conversion
- **文件類型**: 需求規格
- **狀態**: 草稿
- **優先級**: P1 (高優先級)

---

## 🎯 功能概述

### 核心目標
當使用者匯入 Excel 檔案到 Grist 時，自動檢測並轉換 Excel 公式為 Grist 公式語法，使公式能在 Grist 中正確執行。

### 問題陳述
**現狀**：
- Grist 目前可以匯入 Excel 檔案，但公式會以純文字或數值的形式匯入
- 使用者必須手動重建所有公式，耗時且容易出錯
- Excel 和 Grist 使用不同的 cell reference 語法（Excel: `A1`, `B2`; Grist: `$ColumnName`）

**影響**：
- 使用者從 Excel 遷移到 Grist 的成本很高
- 複雜的試算表需要大量手動工作才能遷移
- 降低 Grist 對 Excel 用戶的吸引力

**期望**：
- 匯入 Excel 時自動保留並轉換公式
- 公式在 Grist 中能正確執行
- 最小化使用者的手動介入

---

## 📋 需求規格

### 功能需求

#### FR-001: Excel 檔案匯入增強
**描述**: 增強現有的 Excel 匯入流程以支援公式檢測和轉換

**驗收標準**:
- [ ] 匯入 Excel 時能讀取 cell 的原始公式（不僅是計算結果）
- [ ] 保留 Excel 的欄位結構（欄位名稱、順序、類型）
- [ ] 支援常見 Excel 格式：.xlsx, .xls
- [ ] 匯入失敗時提供明確的錯誤訊息

#### FR-002: 公式欄位自動檢測
**描述**: 根據第一個數據行（排除標題行）自動判斷欄位是否為公式欄位

**檢測邏輯**:
```
IF 第一個數據行的 cell 包含公式 THEN
  該欄位標記為「公式欄位」
  轉換公式並設定為 Grist 公式欄位
ELSE
  該欄位標記為「數據欄位」
  直接匯入數值
END IF
```

**驗收標準**:
- [ ] 正確識別標題行（通常是第一行）
- [ ] 檢查第一個數據行（通常是第二行）的每個 cell
- [ ] 能區分公式 cell (以 `=` 開頭) 和數據 cell
- [ ] 混合情況（同一欄有公式也有數值）給予警告

**範例**:
```
Excel 檔案:
Row 1: Name    | Price | Quantity | Total
Row 2: Item A  | 100   | 5        | =B2*C2
Row 3: Item B  | 200   | 3        | =B3*C3
Row 4: Item C  | 150   | 4        | =B4*C4

檢測結果:
- Name: 數據欄位
- Price: 數據欄位
- Quantity: 數據欄位
- Total: 公式欄位 (檢測到 Row 2 有公式)
```

#### FR-003: Cell Reference 轉換（Phase 1）
**描述**: 將 Excel 的 cell reference 轉換為 Grist 的 column reference

**轉換規則**:

| Excel 語法 | Grist 語法 | 說明 |
|-----------|-----------|------|
| `A2` | `$Name` | 絕對欄位 reference，使用目前 row |
| `B$5` | `Name[4]` | 混合 reference，指定 row index |
| `$C3` | `$Price` | 絕對欄位 reference |
| `D2:D10` | `Name` | 範圍 reference 轉為整欄 |
| `SUM(A2:A10)` | `SUM(Table1.Name)` | 函數中的範圍 reference |

**轉換步驟**:
1. **解析 Excel 公式**: 識別所有 cell references
2. **欄位映射**: 建立 Excel 欄位 (A, B, C...) 到 Grist 欄位名稱的映射表
3. **Reference 替換**:
   - 相對 reference (如 `A2`) → `$ColumnName` (同一 row)
   - 範圍 reference (如 `A2:A10`) → `Table1.ColumnName` (整欄)
4. **保持函數結構**: 只替換 references，保留函數名稱和運算符

**驗收標準**:
- [ ] 正確解析各種 cell reference 格式
- [ ] 建立準確的欄位映射表
- [ ] 成功替換所有 cell references
- [ ] 保持公式的邏輯正確性
- [ ] 處理特殊字元的欄位名稱（空格、特殊符號）

**範例**:
```javascript
// Excel 公式
"=B2*C2"
"=SUM(B2:B10)"
"=IF(A2>100, B2*0.9, B2)"
"=VLOOKUP(A2, Sheet2!A:B, 2, FALSE)"

// Grist 公式
"$Price * $Quantity"
"SUM(Table1.Price)"
"IF($Name > 100, $Price * 0.9, $Price)"
"VLOOKUP($ID, Sheet2.all, 'Result')"  // 需要進一步設計
```

#### FR-004: 錯誤處理與用戶反饋
**描述**: 當公式轉換遇到問題時，提供清楚的錯誤訊息和處理選項

**錯誤情境**:
1. **無法轉換的函數**: Excel 函數在 Grist 中不存在
2. **無效的 reference**: 指向不存在的欄位或 sheet
3. **複雜的 reference**: 跨 sheet reference 或複雜的範圍操作
4. **循環依賴**: 公式之間存在循環引用

**處理策略**:
- **警告模式**: 標記有問題的欄位，允許使用者手動修正
- **降級模式**: 無法轉換的公式保留原始 Excel 公式作為註解
- **日誌記錄**: 記錄所有轉換問題供使用者查看

**驗收標準**:
- [ ] 匯入完成後顯示轉換報告（成功/失敗/警告）
- [ ] 列出所有無法轉換的公式及原因
- [ ] 提供手動編輯選項
- [ ] 保留原始 Excel 公式作為參考

**轉換報告範例**:
```
Excel 匯入報告
================
檔案: sales_data.xlsx
總欄位: 10
總資料行: 100

公式轉換結果:
✓ 成功轉換: 7 個欄位
⚠ 部分轉換: 2 個欄位 (需要手動檢查)
✗ 轉換失敗: 1 個欄位

詳細資訊:
---------
✓ Total: =B2*C2 → $Price * $Quantity
✓ Discount: =IF(B2>100, B2*0.9, B2) → IF($Price > 100, $Price * 0.9, $Price)
⚠ Lookup: =VLOOKUP(A2, Sheet2!A:B, 2, FALSE)
   → 需要手動設定跨表 reference
✗ Complex: =SUMIFS(B:B, A:A, ">100", C:C, "<50")
   → SUMIFS 函數需要轉換為 Grist 的過濾語法
```

---

## 🔧 技術需求

### TR-001: Excel 解析引擎
**需求**: 能讀取 Excel 檔案的公式原始碼

**技術方案**:
- 使用 `exceljs` 或 `xlsx` library
- 讀取 cell 的 `formula` 屬性而非 `value`
- 處理共享公式 (shared formulas) 和陣列公式 (array formulas)

**範例程式碼**:
```typescript
import * as XLSX from 'xlsx';

function readExcelFormulas(file: File): CellData[][] {
  const workbook = XLSX.read(file, {
    type: 'binary',
    cellFormula: true,  // 重要：讀取公式
    cellStyles: true
  });

  const sheet = workbook.Sheets[workbook.SheetNames[0]];

  // 讀取每個 cell 的公式
  for (const cellAddress in sheet) {
    const cell = sheet[cellAddress];
    if (cell.f) {  // 'f' 屬性包含公式
      console.log(`Cell ${cellAddress}: ${cell.f}`);
    }
  }
}
```

### TR-002: 公式解析器 (Formula Parser)
**需求**: 解析 Excel 公式語法樹

**功能**:
- 詞法分析 (Tokenization): 將公式拆分為 tokens
- 語法分析 (Parsing): 建立抽象語法樹 (AST)
- 識別 cell references、函數、運算符、常數

**技術方案**:
- 使用現有的公式解析庫如 `formulajs` 或 `hot-formula-parser`
- 或建立簡單的正則表達式解析器（Phase 1）

**範例**:
```typescript
interface FormulaAST {
  type: 'function' | 'reference' | 'operator' | 'literal';
  value: string;
  children?: FormulaAST[];
}

// Excel: =SUM(A2:A10)*0.9
// AST:
{
  type: 'operator',
  value: '*',
  children: [
    {
      type: 'function',
      value: 'SUM',
      children: [
        { type: 'reference', value: 'A2:A10' }
      ]
    },
    { type: 'literal', value: '0.9' }
  ]
}
```

### TR-003: 欄位映射表 (Column Mapping)
**需求**: 建立 Excel 欄位到 Grist 欄位的映射

**資料結構**:
```typescript
interface ColumnMapping {
  excelColumn: string;      // 'A', 'B', 'C', ...
  excelColumnIndex: number; // 0, 1, 2, ...
  gristColumnId: string;    // 'Name', 'Price', 'Quantity'
  gristColumnName: string;  // 顯示名稱（可能包含空格）
  hasFormula: boolean;      // 是否為公式欄位
  formulaPattern?: string;  // 公式模式（如果是公式欄位）
}

// 範例
const mapping: ColumnMapping[] = [
  { excelColumn: 'A', excelColumnIndex: 0, gristColumnId: 'Name', gristColumnName: 'Name', hasFormula: false },
  { excelColumn: 'B', excelColumnIndex: 1, gristColumnId: 'Price', gristColumnName: 'Price', hasFormula: false },
  { excelColumn: 'C', excelColumnIndex: 2, gristColumnId: 'Quantity', gristColumnName: 'Quantity', hasFormula: false },
  { excelColumn: 'D', excelColumnIndex: 3, gristColumnId: 'Total', gristColumnName: 'Total', hasFormula: true, formulaPattern: '=$Price*$Quantity' }
];
```

### TR-004: Reference 轉換器 (Reference Converter)
**需求**: 將 Excel cell references 轉換為 Grist column references

**轉換邏輯**:
```typescript
class ReferenceConverter {
  constructor(private columnMapping: ColumnMapping[]) {}

  // 轉換單一 cell reference
  convertCellRef(excelRef: string): string {
    // A2 → $Name
    // B$5 → Price[4]
    // $C3 → $Quantity
    const match = excelRef.match(/(\$?)([A-Z]+)(\$?)(\d+)/);
    if (!match) return excelRef;

    const [, colAbs, col, rowAbs, row] = match;
    const mapping = this.findMapping(col);

    if (rowAbs) {
      // 絕對 row reference: B$5 → Price[4]
      return `${mapping.gristColumnId}[${parseInt(row) - 2}]`;  // -2 因為跳過標題行
    } else {
      // 相對 reference: A2 → $Name
      return `$${mapping.gristColumnId}`;
    }
  }

  // 轉換範圍 reference
  convertRangeRef(excelRange: string): string {
    // A2:A10 → Table1.Name
    // B:B → Table1.Price
    const match = excelRange.match(/([A-Z]+)\d*:([A-Z]+)\d*/);
    if (!match) return excelRange;

    const [, startCol] = match;
    const mapping = this.findMapping(startCol);

    return `Table1.${mapping.gristColumnId}`;
  }

  // 轉換完整公式
  convertFormula(excelFormula: string): string {
    let gristFormula = excelFormula;

    // 先處理範圍 references
    gristFormula = gristFormula.replace(
      /([A-Z]+\d*:[A-Z]+\d*)/g,
      (match) => this.convertRangeRef(match)
    );

    // 再處理單一 cell references
    gristFormula = gristFormula.replace(
      /\$?[A-Z]+\$?\d+/g,
      (match) => this.convertCellRef(match)
    );

    return gristFormula;
  }
}
```

### TR-005: Grist API 整合
**需求**: 將轉換後的公式寫入 Grist

**API 操作**:
1. 建立 table 和 columns
2. 設定公式欄位
3. 匯入數據

**範例**:
```typescript
async function importExcelWithFormulas(
  excelData: ExcelData,
  conversions: FormulaConversion[]
): Promise<void> {
  // 1. 建立 table
  const tableId = await grist.docApi.addTable('ImportedTable', {
    columns: excelData.columns.map(col => ({
      id: col.gristColumnId,
      label: col.gristColumnName,
      type: col.hasFormula ? 'Any' : 'Numeric',  // 公式欄位使用 'Any' 類型
      formula: col.hasFormula ? conversions.find(c => c.columnId === col.gristColumnId)?.gristFormula : undefined
    }))
  });

  // 2. 匯入數據（只匯入非公式欄位的數據）
  const dataRows = excelData.rows.map(row => {
    const rowData: any = {};
    excelData.columns.forEach((col, idx) => {
      if (!col.hasFormula) {
        rowData[col.gristColumnId] = row[idx];
      }
    });
    return rowData;
  });

  await grist.docApi.addRecords(tableId, dataRows);
}
```

---

## 🎨 使用者介面

### UI-001: 匯入流程增強

**匯入對話框**:
```
┌─────────────────────────────────────────────┐
│  匯入 Excel 檔案                              │
├─────────────────────────────────────────────┤
│                                             │
│  [選擇檔案] sales_data.xlsx                  │
│                                             │
│  ☑ 自動檢測並轉換公式                         │
│  ☑ 第一行作為標題                            │
│  ☐ 跳過空白行                                │
│                                             │
│  預覽:                                       │
│  ┌─────────────────────────────────────┐   │
│  │ Name    Price  Quantity  Total      │   │
│  │ Item A  100    5         =B2*C2 ✓   │   │
│  │ Item B  200    3         =B3*C3 ✓   │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  檢測到 1 個公式欄位                          │
│                                             │
│  [取消]  [匯入] ←                            │
└─────────────────────────────────────────────┘
```

**轉換進度顯示**:
```
┌─────────────────────────────────────────────┐
│  正在匯入 Excel...                           │
├─────────────────────────────────────────────┤
│                                             │
│  ✓ 讀取檔案                                  │
│  ✓ 解析欄位結構                              │
│  ⟳ 轉換公式... (3/4)                         │
│  □ 匯入數據                                  │
│                                             │
│  ████████████████░░░░ 75%                   │
│                                             │
└─────────────────────────────────────────────┘
```

**轉換報告**:
```
┌─────────────────────────────────────────────┐
│  匯入完成                                    │
├─────────────────────────────────────────────┤
│                                             │
│  ✓ 成功匯入 100 筆資料                        │
│  ✓ 轉換 1 個公式欄位                          │
│                                             │
│  欄位: Total                                 │
│  Excel:  =B2*C2                             │
│  Grist:  $Price * $Quantity                 │
│                                             │
│  [查看詳細報告]  [關閉]                       │
└─────────────────────────────────────────────┘
```

---

## 📊 實作範圍

### Phase 1: 基本 Cell Reference 轉換（本階段）

**包含**:
- ✅ 讀取 Excel 公式原始碼
- ✅ 檢測公式欄位（基於第一個數據行）
- ✅ 簡單的 cell reference 轉換 (`A2` → `$ColumnName`)
- ✅ 範圍 reference 轉換 (`A2:A10` → `Table1.ColumnName`)
- ✅ 基本錯誤處理和報告

**不包含**:
- ❌ 複雜的函數轉換（VLOOKUP, SUMIFS 等）
- ❌ 跨 sheet reference
- ❌ 陣列公式
- ❌ 命名範圍 (Named Ranges)
- ❌ 巨集和 VBA

**範例支援情境**:
```excel
✅ 支援:
=A2+B2                  → $Name + $Price
=SUM(A2:A10)            → SUM(Table1.Name)
=B2*C2                  → $Price * $Quantity
=IF(A2>100, B2, C2)     → IF($Name > 100, $Price, $Quantity)
=AVERAGE(B:B)           → AVERAGE(Table1.Price)

❌ 不支援（Phase 2）:
=VLOOKUP(A2, Sheet2!A:B, 2, FALSE)
=SUMIFS(B:B, A:A, ">100", C:C, "<50")
=INDEX(MATCH(...))
=INDIRECT("A"&ROW())
```

### Phase 2: 進階函數轉換（未來）

**目標**:
- 常見 Excel 函數映射到 Grist 等效函數
- VLOOKUP → Grist lookup columns
- SUMIFS/COUNTIFS → Grist filter expressions
- 跨 sheet references → Grist table references

### Phase 3: 完整 Excel 相容性（未來）

**目標**:
- 陣列公式支援
- 動態陣列 (Dynamic Arrays)
- 命名範圍
- 條件格式規則

---

## 🧪 測試場景

### 測試案例 1: 簡單算術公式
```
Excel 輸入:
  A          B        C        D
1 Product   Price    Qty      Total
2 Item A    100      5        =B2*C2
3 Item B    200      3        =B3*C3

預期結果:
- Total 欄位被識別為公式欄位
- 公式轉換: =B2*C2 → $Price * $Quantity
- 數據正確計算: 500, 600
```

### 測試案例 2: SUM 函數
```
Excel 輸入:
  A          B        C
1 Month     Sales    Total
2 Jan       1000     =SUM($B$2:$B$13)
3 Feb       1200     =SUM($B$2:$B$13)
...

預期結果:
- Total 欄位被識別為公式欄位
- 公式轉換: =SUM($B$2:$B$13) → SUM(Table1.Sales)
- 總和正確計算
```

### 測試案例 3: IF 條件函數
```
Excel 輸入:
  A          B        C              D
1 Product   Price    Quantity       Discount
2 Item A    100      5              =IF(C2>10, B2*0.1, 0)
3 Item B    200      15             =IF(C2>10, B2*0.1, 0)

預期結果:
- Discount 欄位被識別為公式欄位
- 公式轉換: =IF(C2>10, B2*0.1, 0) → IF($Quantity > 10, $Price * 0.1, 0)
- 條件正確計算
```

### 測試案例 4: 混合欄位（警告情況）
```
Excel 輸入:
  A          B        C
1 Name      Value    Comment
2 Item A    100      Good
3 Item B    =A3&" Note"  =IF(B3>50, "High", "Low")
4 Item C    300      OK

預期結果:
- 警告: Value 欄位混合了數值和公式
- 警告: Comment 欄位混合了文字和公式
- 建議: 將混合欄位拆分或統一為公式
```

### 測試案例 5: 錯誤處理
```
Excel 輸入:
  A          B                    C
1 Product   Complex              CrossSheet
2 Item A    =SUMIFS(...)         =Sheet2!A1
3 Item B    =INDEX(MATCH(...))   =Sheet2!B2

預期結果:
- 錯誤報告: Complex 欄位包含不支援的 SUMIFS 函數
- 錯誤報告: CrossSheet 欄位包含跨 sheet reference
- 降級: 保留原始公式作為註解，使用計算值
- 提供手動編輯選項
```

---

## 📈 成功指標

### 量化指標
- **轉換成功率**: ≥ 80% 的簡單公式能成功轉換
- **準確率**: 轉換後的公式計算結果與 Excel 一致率 ≥ 95%
- **效能**: 匯入 1000 行資料（含 5 個公式欄位）< 5 秒
- **錯誤率**: 使用者報告的公式錯誤 < 5%

### 質化指標
- 使用者反饋滿意度 ≥ 4/5
- 減少 50% 的手動公式輸入時間
- 提升 Excel 使用者採用 Grist 的意願

---

## 🚧 技術挑戰與風險

### 挑戰 1: Excel 公式語法複雜度
**描述**: Excel 公式語法非常複雜，包含數百個函數和各種特殊情況

**風險**: 無法完全涵蓋所有 Excel 功能

**緩解策略**:
- Phase 1 只支援最常用的 20% 功能（涵蓋 80% 使用情境）
- 提供明確的「不支援」清單
- 允許使用者手動編輯轉換失敗的公式

### 挑戰 2: Reference 語義差異
**描述**: Excel 和 Grist 的 reference 語義不同
- Excel: cell-based (`A2` 指向特定 cell)
- Grist: column-based (`$Name` 指向當前 row 的欄位)

**風險**: 某些 Excel 公式無法直接映射到 Grist

**緩解策略**:
- 清楚文件化語義差異
- 對無法直接映射的情況提供警告
- 提供「相對 reference」vs「絕對 reference」的處理邏輯

### 挑戰 3: 跨 Sheet References
**描述**: Excel 支援跨 sheet reference (如 `Sheet2!A1`)，Grist 使用不同的機制

**風險**: 跨 sheet 公式無法自動轉換

**緩解策略**:
- Phase 1 不支援跨 sheet reference
- Phase 2 考慮映射到 Grist 的 lookup columns 或 reference columns
- 提供手動設定跨表關聯的指引

### 挑戰 4: 循環依賴
**描述**: Excel 和 Grist 對循環依賴的處理不同

**風險**: 包含循環依賴的 Excel 可能無法匯入

**緩解策略**:
- 匯入前檢測循環依賴
- 提供循環依賴視覺化工具
- 建議使用者重構公式以移除循環

---

## 🔄 相關功能

### 現有功能
- **Excel 匯入**: 目前的 Excel 匯入功能（僅數值和文字）
- **公式系統**: Grist 現有的公式引擎
- **型別系統**: Grist 的欄位型別系統

### 需要修改的功能
- **匯入流程**: 增加公式檢測和轉換步驟
- **欄位建立**: 支援自動設定公式欄位
- **錯誤處理**: 增強錯誤訊息和修復建議

### 未來擴展
- **雙向同步**: Excel ↔ Grist 雙向同步
- **公式庫**: 建立常用公式模板庫
- **公式優化**: 自動優化轉換後的公式效能

---

## 📚 參考資料

### Excel 公式規格
- [Excel Functions Reference](https://support.microsoft.com/en-us/office/excel-functions-alphabetical-b3944572-255d-4efb-bb96-c6d90033e188)
- [Excel Formula Syntax](https://support.microsoft.com/en-us/office/overview-of-formulas-in-excel-ecfdc708-9162-49e8-b993-c311f47ca173)

### Grist 公式系統
- [Grist Formula Cheat Sheet](https://support.getgrist.com/formulas/)
- [Grist Python API](https://support.getgrist.com/functions/)

### 類似專案參考
- [SheetJS (xlsx)](https://github.com/SheetJS/sheetjs) - Excel 解析庫
- [formulajs](https://github.com/formulajs/formulajs) - JavaScript 公式庫
- [handsontable](https://handsontable.com/) - 支援 Excel 公式的試算表組件

---

## 📝 附錄

### 附錄 A: Excel 函數映射表（Phase 1）

| Excel 函數 | Grist 等效 | 支援狀態 | 備註 |
|-----------|-----------|---------|------|
| SUM | SUM | ✅ | 完全支援 |
| AVERAGE | AVERAGE | ✅ | 完全支援 |
| COUNT | COUNT | ✅ | 完全支援 |
| MAX | MAX | ✅ | 完全支援 |
| MIN | MIN | ✅ | 完全支援 |
| IF | IF | ✅ | 完全支援 |
| AND | AND | ✅ | 完全支援 |
| OR | OR | ✅ | 完全支援 |
| NOT | NOT | ✅ | 完全支援 |
| ROUND | ROUND | ✅ | 完全支援 |
| CONCATENATE | + (字串連接) | ✅ | 語法不同 |
| LEN | LEN | ✅ | 完全支援 |
| VLOOKUP | - | ❌ | Phase 2 |
| SUMIF | - | ❌ | Phase 2 |
| COUNTIF | - | ❌ | Phase 2 |

### 附錄 B: Cell Reference 轉換規則詳細

#### 相對 Reference
```
Excel: A2 (相對於當前 cell 的 reference)
Grist: $ColumnA (當前 row 的 ColumnA 欄位)

說明:
- Excel 的相對 reference 會隨著 cell 位置改變
- Grist 的 $ColumnA 永遠指向當前 row
- 語義相近但不完全相同
```

#### 絕對 Column Reference
```
Excel: $A2 (固定 column A，row 可變)
Grist: $ColumnA

說明: 在 Grist 中與相對 reference 相同
```

#### 絕對 Row Reference
```
Excel: A$2 (column 可變，固定 row 2)
Grist: ColumnA[0] (ColumnA 的第一個數據 row)

說明:
- Excel 的絕對 row reference 指向特定行
- Grist 使用陣列索引語法 [index]
- 索引從 0 開始（第一個數據行）
```

#### 完全絕對 Reference
```
Excel: $A$2 (固定 column A, row 2)
Grist: ColumnA[0]

說明: 與絕對 row reference 相同
```

#### 範圍 Reference
```
Excel: A2:A10 (從 A2 到 A10 的範圍)
Grist: Table1.ColumnA (ColumnA 的所有值)

說明:
- Excel 範圍有明確的起始和結束
- Grist 通常操作整個欄位
- 如需特定範圍，需要額外的過濾邏輯
```

### 附錄 C: 欄位名稱處理

**特殊字元處理**:
```typescript
// Excel 欄位名稱可能包含空格和特殊字元
// Grist column ID 需要是有效的 Python 識別字

function sanitizeColumnName(excelName: string): string {
  // 1. 移除前後空白
  let name = excelName.trim();

  // 2. 替換空格為底線
  name = name.replace(/\s+/g, '_');

  // 3. 移除特殊字元
  name = name.replace(/[^\w]/g, '');

  // 4. 確保不以數字開頭
  if (/^\d/.test(name)) {
    name = 'col_' + name;
  }

  // 5. 避免 Python 保留字
  const reserved = ['and', 'or', 'not', 'if', 'else', 'for', 'while', ...];
  if (reserved.includes(name.toLowerCase())) {
    name = name + '_';
  }

  return name;
}

// 範例:
// "Product Name" → "Product_Name"
// "Price ($)" → "Price"
// "2024 Sales" → "col_2024_Sales"
// "if" → "if_"
```

---

## ✅ 驗收檢查清單

### 功能驗收
- [ ] 能讀取 Excel 檔案的公式原始碼
- [ ] 正確檢測公式欄位（基於第一個數據行）
- [ ] 成功轉換簡單的 cell references
- [ ] 成功轉換範圍 references
- [ ] 轉換後的公式計算結果正確
- [ ] 提供清楚的轉換報告

### 品質驗收
- [ ] 通過所有測試案例
- [ ] 轉換成功率 ≥ 80%
- [ ] 計算準確率 ≥ 95%
- [ ] 匯入效能符合標準（1000 行 < 5 秒）
- [ ] 錯誤訊息清楚且可操作

### 文件驗收
- [ ] 使用者操作手冊
- [ ] API 文件
- [ ] 轉換規則說明
- [ ] 限制和已知問題清單
- [ ] 故障排除指南

---

## 📞 聯絡資訊

**產品負責人**: [待指定]
**技術負責人**: [待指定]
**文件維護**: Claude Code
**最後更新**: 2025-11-18
