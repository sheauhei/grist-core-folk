# Excel Formula Import - Testing Guide

## 測試狀態

### ✅ 已完成
1. **單元測試** - ExcelFormulaParser 和 CellReferenceConverter 核心邏輯測試通過
2. **後端整合** - 已在 ActiveDocImport 中整合公式處理邏輯
3. **編譯驗證** - TypeScript 編譯零錯誤
4. **測試文件準備** - 已生成單表和多表測試 Excel 文件

### ⏸️ 待測試
1. **End-to-End UI 測試** - 需要在瀏覽器中進行手動測試
2. **公式計算驗證** - 確認轉換後的公式在 Grist 中正確計算

---

## 測試文件位置

已準備好以下測試檔案：

### 1. 簡單單表測試（test/fixtures/excel-formula-test-simple.xlsx）
- **工作表**: Sales
- **欄位**:
  - Product (文字)
  - Price (數值)
  - Quantity (數值)
  - **Total (公式: `B*C`)**
  - Tax Rate (數值)
  - **Total with Tax (公式: `D*(1+E)`)**
- **測試重點**: 基本算術公式、多重公式欄位

### 2. 多表測試（test/fixtures/excel-formula-test-multi.xlsx）
- **工作表 1 - Sales**:
  - Product, Price, Quantity
  - **Total (公式: `B*C`)**

- **工作表 2 - Inventory**:
  - Item, Stock, Min Stock
  - **Need Reorder (公式: `IF(B<C, "Yes", "No")`)**

- **工作表 3 - Statistics**:
  - **Total Sales (公式: `SUM(Sales!D:D)`)**
  - **Average Price (公式: `AVERAGE(Sales!B:B)`)**
  - **Max Quantity (公式: `MAX(Sales!C:C)`)**

- **測試重點**: 多工作表導入、IF 條件函數、跨工作表引用

---

## UI 測試步驟

### 前置條件
1. 確保 Grist 服務器正在運行: `http://localhost:8484`
2. 確認測試 Excel 文件存在於 `test/fixtures/` 目錄

### 測試步驟 1: 單表 Excel 導入

1. **打開 Grist 首頁**
   - 訪問: `http://localhost:8484`

2. **開始導入**
   - 點擊 "Add New" -> "Import Document"
   - 或在現有工作區中選擇 "Import"

3. **上傳文件**
   - 選擇檔案: `test/fixtures/excel-formula-test-simple.xlsx`
   - 確認文件上傳

4. **檢查導入預覽**
   - 應該看到一個 "Sales" 工作表
   - 檢查是否顯示 6 個欄位（Product, Price, Quantity, Total, Tax Rate, Total with Tax）

5. **完成導入**
   - 點擊 "Import" 按鈕完成導入

6. **驗證公式轉換** ⭐
   - 打開新建的文檔
   - 點擊 "Total" 欄位的任一儲存格
   - 在右側欄位設置中，檢查"Formula"欄位
   - **預期結果**: 應該看到類似 `$Price*$Quantity` 的公式

   - 點擊 "Total with Tax" 欄位
   - **預期結果**: 應該看到類似 `$Total*(1+$Tax_Rate)` 的公式

7. **驗證計算結果**
   - 檢查 Total 欄位的值是否等於 Price × Quantity
   - 檢查 Total with Tax 欄位的值是否正確計算稅後總額

8. **測試公式反應性**
   - 修改 Price 或 Quantity 的值
   - **預期結果**: Total 和 Total with Tax 應該自動更新

### 測試步驟 2: 多表 Excel 導入

1. **導入多表文件**
   - 重複上述步驟 1-3
   - 選擇檔案: `test/fixtures/excel-formula-test-multi.xlsx`

2. **檢查導入預覽**
   - 應該看到 3 個工作表：Sales, Inventory, Statistics

3. **完成導入**

4. **驗證多表結構**
   - 打開新文檔
   - 檢查左側是否顯示 3 個表格頁面

5. **驗證各表公式**

   **Sales 表**:
   - Total 欄位公式: `$Price*$Quantity`

   **Inventory 表**:
   - Need Reorder 欄位公式: `IF($Stock<$Min_Stock, "Yes", "No")`

   **Statistics 表**:
   - 檢查是否有跨表引用公式
   - Total Sales: `SUM(Sales.Total)` 或類似
   - Average Price: `AVERAGE(Sales.Price)`
   - Max Quantity: `MAX(Sales.Quantity)`

---

## 監控日誌

在測試過程中，可以查看服務器日誌來確認公式處理是否被調用：

```bash
tail -f grist-server.log | grep "ActiveDocImport._processExcelFormulas"
```

### 預期日誌輸出

成功時應該看到：
```
info: ActiveDocImport._processExcelFormulas: Processing formulas in excel-formula-test-simple.xlsx
info: ActiveDocImport._processExcelFormulas: Found N formula columns in sheet Sales
info: ActiveDocImport._processExcelFormulas: Converting formula column Total: B2*C2 → $Price*$Quantity
```

錯誤時會看到：
```
error: ActiveDocImport._processExcelFormulas: Failed to convert formula for column XXX: ...
warn: ActiveDocImport._processExcelFormulas: Warnings for column XXX: ...
```

---

## 預期轉換結果

| Excel 公式 | 預期 Grist 公式 | 說明 |
|-----------|----------------|------|
| `B2*C2` | `$Price*$Quantity` | 單元格引用轉欄位引用 |
| `D2*(1+E2)` | `$Total*(1+$Tax_Rate)` | 含括號的複雜運算 |
| `IF(B2<C2, "Yes", "No")` | `IF($Stock<$Min_Stock, "Yes", "No")` | IF 條件函數 |
| `SUM(Sales!D:D)` | `SUM(Sales.Total)` | 跨表欄位引用 |
| `AVERAGE(Sales!B:B)` | `AVERAGE(Sales.Price)` | 統計函數 |
| `MAX(Sales!C:C)` | `MAX(Sales.Quantity)` | 統計函數 |

---

## 已知限制

### Phase 1 範圍
當前實作僅支援：
1. ✅ 單元格引用轉換 (A1, $B$2)
2. ✅ 基本算術運算 (+, -, *, /)
3. ✅ IF 條件函數
4. ✅ SUM, AVERAGE, MIN, MAX 等基本統計函數
5. ✅ 跨工作表引用 (Sheet!A:A)

### 尚未支援
1. ❌ 複雜 Excel 函數 (VLOOKUP, INDEX/MATCH 等)
2. ❌ 陣列公式
3. ❌ 自定義名稱引用

### 格式問題
- 轉換後的公式可能缺少運算符周圍的空格 (`$A*$B` vs `$A * $B`)
- 這是純格式問題，不影響功能

---

## 測試檢查清單

- [ ] 單元測試通過（ExcelFormulaParser）
- [ ] 單元測試通過（CellReferenceConverter）
- [ ] TypeScript 編譯無錯誤
- [ ] Grist 服務器成功啟動
- [ ] 單表 Excel 匯入成功
- [ ] 單表公式正確轉換
- [ ] 單表公式計算正確
- [ ] 多表 Excel 匯入成功（3個表）
- [ ] 各表公式正確轉換
- [ ] 跨表引用公式正確轉換
- [ ] 公式具有反應性（修改數據時自動更新）
- [ ] 日誌顯示公式處理過程

---

## 故障排除

### 問題：匯入後沒有看到公式
**檢查**:
1. 確認是 .xlsx 文件（不是 .xls）
2. 檢查服務器日誌，確認 `_processExcelFormulas` 被調用
3. 確認 Excel 文件的第一個數據行（第2行）包含公式
4. 查看日誌中是否有錯誤或警告

### 問題：公式轉換錯誤
**檢查**:
1. 查看服務器日誌中的具體錯誤信息
2. 確認 Excel 公式使用支援的函數
3. 確認欄位名稱沒有特殊字符問題

### 問題：跨表引用不工作
**檢查**:
1. 確認 Excel 中的工作表名稱與 Grist 表名稱匹配
2. 查看日誌中是否有欄位映射警告

---

## 下一步開發

1. **修復格式問題**: 在公式轉換時保留運算符周圍的空格
2. **擴展函數支援**: 增加更多 Excel 函數的轉換
3. **更好的錯誤處理**: 提供更詳細的用戶錯誤提示
4. **UI 回饋**: 在匯入過程中顯示公式轉換狀態
