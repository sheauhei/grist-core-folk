# Excel 公式匯入功能 - 手動測試指南

## 📋 測試前準備

### 1. 確認服務器正在運行

在 PowerShell 中檢查：
```powershell
curl http://localhost:8484
```

如果沒有運行，請執行：
```powershell
.\start-simple.ps1
```

### 2. 測試文件位置

準備好以下測試文件（已存在於項目中）：
- `test/fixtures/excel-formula-test-simple.xlsx` - 簡單測試（1個sheet, 1個公式）
- `test/fixtures/excel-formula-test-multi.xlsx` - 多sheet測試（3個sheets）
- `test/fixtures/excel-formula-comprehensive.xlsx` - 全面測試（7個sheets, 24個公式）

---

## 🧪 測試步驟

### 步驟 1: 訪問 Grist

1. 打開瀏覽器（推薦 Chrome 或 Edge）
2. 訪問: **http://localhost:8484**

### 步驟 2: 登入（如需要）

如果看到登入或註冊頁面：

1. **方法 A - 使用測試登入**:
   - 直接訪問: **http://localhost:8484/test/login?name=TestUser&email=test@example.com**
   - 然後訪問: **http://localhost:8484**

2. **方法 B - 手動註冊**:
   - 使用任何電子郵件地址註冊（本地測試不需要真實郵箱）
   - 填寫名稱並繼續

### 步驟 3: 找到導入按鈕

進入首頁後，您會看到文檔列表頁面：

1. 查找 **"Add New"** 或 **"+ 新增"** 按鈕
   - 通常在頁面左上角或右上角
   - 或者看起來像 **"+ Add New"** 的按鈕

2. 點擊該按鈕，會出現下拉菜單：
   ```
   ┌─────────────────────┐
   │ New Document        │
   │ Import Document     │ ← 點擊這個
   │ ...                 │
   └─────────────────────┘
   ```

3. 選擇 **"Import Document"** 或 **"匯入文檔"**

### 步驟 4: 上傳 Excel 文件

1. 會出現文件選擇對話框

2. 導航到項目目錄下的:
   ```
   D:\__MICRO__\Side_Project\grist-core-folk\test\fixtures\
   ```

3. **第一次測試 - 簡單文件**:
   - 選擇: `excel-formula-test-simple.xlsx`
   - 點擊 "Open" 或 "打開"

### 步驟 5: 等待導入處理

1. 文件上傳後，會看到 **Import Preview** 對話框
   - 顯示預覽表格
   - 可能需要幾秒鐘處理

2. 在預覽中，您應該看到：
   - **Table Name**: Sales
   - **Columns**: Product, Price, Quantity, Total
   - **Data rows**: 顯示數據預覽

3. **關鍵檢查點** ✅:
   - 檢查日誌輸出（如果您有開啟終端查看）
   - 應該看到類似訊息:
     ```
     ActiveDocImport._processExcelFormulas: Found 1 formula columns in sheet Sales
     ActiveDocImport._processExcelFormulas: Converting formula column Total: B2*C2 → $Price * $Quantity
     ```

### 步驟 6: 確認導入

1. 點擊 **"Import"** 或 **"確認匯入"** 按鈕

2. 等待導入完成（通常幾秒鐘）

3. 導入成功後會自動打開新文檔

### 步驟 7: 驗證結果

#### 7.1 檢查表格結構

您應該看到：
- **左側頁面列表**: 顯示 "Sales" 頁面
- **主區域**: 顯示 Sales 表格，包含 4 個欄位

#### 7.2 檢查數據

表格應該顯示：
```
| Product | Price | Quantity | Total |
|---------|-------|----------|-------|
| Laptop  | 1000  | 2        | 2000  |
| Mouse   | 25    | 10       | 250   |
| Keyboard| 75    | 5        | 375   |
```

**✅ 驗證點**: Total 欄位的值是否正確（Price × Quantity）

#### 7.3 檢查公式（重要！）

1. **點擊 Total 欄位的標題**（列名稱）
   - 應該會在右側打開欄位配置面板

2. **查看右側面板**:
   - 尋找 "Formula" 或"公式"欄位
   - 應該顯示: `$Price * $Quantity`

3. **✅ 驗證點**:
   - ✅ 是否有公式欄位
   - ✅ 公式格式是否為 `$ColumnName`（Grist 格式）
   - ✅ 不是 Excel 格式（`B2*C2`）

4. **點擊任一 Total 單元格**:
   - 在單元格編輯器中應該看不到公式（只顯示計算結果）
   - 這是正確的，因為公式在欄位級別，不是單元格級別

#### 7.4 測試公式計算

1. **修改一個 Price 值**:
   - 點擊第一行的 Price 單元格（1000）
   - 改為 1200
   - 按 Enter

2. **觀察 Total 欄位**:
   - 第一行的 Total 應該自動更新為 2400（1200 × 2）

3. **✅ 驗證點**: 公式是否自動重新計算

---

## 🔬 進階測試

### 測試 2: 多 Sheet Excel 文件

1. 重複步驟 3-6，但選擇: `excel-formula-test-multi.xlsx`

2. **預期結果**:
   - 應該創建 **3 個頁面/表格**:
     - Sales
     - Inventory
     - Statistics

3. **驗證**:
   - 左側頁面列表應該顯示 3 個頁面
   - 點擊每個頁面查看內容
   - 每個表格都應該有正確的欄位和數據

### 測試 3: 全面測試文件

1. 選擇: `excel-formula-comprehensive.xlsx`

2. **預期結果**:
   - 應該創建 **7 個頁面**:
     1. Arithmetic（算術運算）
     2. Statistics（統計函數）
     3. Conditionals（條件函數）
     4. Mixed（混合操作）
     5. Comparisons（比較運算）
     6. Strings（字串連接）
     7. AbsoluteRefs（絕對引用）

3. **重點驗證**:

   **Arithmetic 表格**:
   - 欄位: Number1, Number2, Addition, Subtraction, Multiplication, Division
   - 檢查 Addition 欄位公式: 應該是 `$Number1 + $Number2`
   - 檢查 Multiplication 欄位公式: 應該是 `$Number1 * $Number2`

   **Statistics 表格**:
   - 欄位: Values, Sum, Average, Min, Max, Count
   - 檢查 Sum 欄位公式: 應該是 `SUM(Statistics.Values)`
   - 檢查 Average 欄位公式: 應該是 `AVERAGE(Statistics.Values)`

   **Conditionals 表格**:
   - 欄位: Score, Pass/Fail, Grade, Comment
   - 檢查 Pass/Fail 欄位公式: 應該包含 `IF($Score >= 60, "Pass", "Fail")`

   **Strings 表格**:
   - 欄位: FirstName, LastName, FullName, WithComma
   - 檢查 FullName 欄位公式: 應該是 `$FirstName & " " & $LastName`

---

## 📊 驗證清單

完整測試後，請確認以下項目：

### ✅ 基本功能
- [ ] Excel 文件成功上傳
- [ ] 導入預覽正確顯示
- [ ] 表格成功創建
- [ ] 欄位名稱正確
- [ ] 數據正確導入

### ✅ 公式轉換
- [ ] 公式欄位被識別（不是普通數據欄位）
- [ ] 公式語法已轉換為 Grist 格式（`$ColumnName`）
- [ ] 公式計算結果正確
- [ ] 修改源數據後公式自動重新計算

### ✅ 多 Sheet 支援
- [ ] 多 sheet Excel 文件創建多個表格
- [ ] 每個 sheet 名稱保留為表格名稱
- [ ] 每個表格的公式都正確轉換

### ✅ 複雜公式
- [ ] 算術運算（+, -, *, /）
- [ ] 統計函數（SUM, AVERAGE, MIN, MAX）
- [ ] 條件函數（IF）
- [ ] 字串連接（&）
- [ ] 比較運算（>, <, >=, <=, =, <>）

---

## 🐛 可能遇到的問題

### 問題 1: 找不到 "Import Document" 選項

**解決方案**:
- 確認您在首頁（文檔列表頁）
- 查找 "Add New" 或類似按鈕
- 可能的位置: 頁面頂部、左上角、或中間區域

### 問題 2: 導入後沒有公式，只有值

**可能原因**:
- 後端處理失敗

**檢查方法**:
1. 查看服務器日誌:
   ```bash
   tail -50 grist-server.log | grep -i "formula\|error"
   ```

2. 檢查是否有錯誤訊息

### 問題 3: 公式格式仍然是 Excel 格式（B2*C2）

**這表示**:
- 公式轉換沒有執行
- 後端整合可能有問題

**檢查**:
- 確認 `app/server/lib/ActiveDocImport.ts` 的修改已編譯
- 重新啟動服務器
- 查看日誌確認處理流程

### 問題 4: Sandbox 錯誤

**這是正常的**:
- Grist 首次使用 Python sandbox 時會有啟動訊息
- 只要沒有實際錯誤，可以忽略

---

## 📝 測試報告

完成測試後，請記錄：

**測試環境**:
- 瀏覽器: _______________
- 日期: _______________

**測試結果**:
- [ ] 簡單文件測試 - 通過/失敗
- [ ] 多 sheet 文件測試 - 通過/失敗
- [ ] 全面測試文件 - 通過/失敗

**發現的問題**:
1. _______________
2. _______________

**截圖** (如有):
- 導入預覽畫面
- 公式欄位配置
- 計算結果驗證

---

## 🎯 預期最終結果

如果一切正常，您應該能夠：

1. ✅ 成功導入包含公式的 Excel 文件
2. ✅ 看到公式已轉換為 Grist 格式（`$ColumnName`）
3. ✅ 公式計算結果正確
4. ✅ 修改數據後公式自動更新
5. ✅ 多個 sheets 創建多個 tables
6. ✅ 各種類型的公式都能正確轉換

如果遇到任何問題，請記錄錯誤訊息和日誌輸出！
