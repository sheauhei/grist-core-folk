# Feature 001: 支援繁體中文作為欄位 ID (Chinese Column ID Support)

## 📋 功能概述 (Feature Overview)

### 問題描述 (Problem Statement)
目前 Grist 在處理欄位名稱時，會將非 ASCII 字符（包括繁體中文）從欄位 ID 中移除。例如：

**現有行為 (Current Behavior)**:
- `"D@a"` → `"D_a"` ✅ (正常)
- `"繁體中文"` → `""` → `"A"` ❌ (中文被完全移除)
- `"繁體@A"` → `"_A"` → `"A"` ❌ (中文被移除，只留下 A)

**期望行為 (Expected Behavior)**:
- `"D@a"` → `"D_a"` ✅
- `"繁體中文"` → `"繁體中文"` ✅
- `"繁體@A"` → `"繁體_A"` ✅
- `"用戶@名稱"` → `"用戶_名稱"` ✅

### 根本原因 (Root Cause)

**位置**: `sandbox/grist/identifiers.py:14`

```python
_invalid_ident_char_re = re.compile(r'[^a-zA-Z0-9_]+')
```

這個正則表達式只允許 **ASCII 字母**（a-zA-Z）、**數字**（0-9）和**底線**（_），所有其他字符（包括中文、日文、韓文等 Unicode 字符）都會被替換成底線。

**注意**: 程式碼第 35 行已有 TODO 註釋：
```python
# TODO allow non-ascii characters in identifiers when using Python 3
```

由於 Grist 現在使用 Python 3.11，我們可以實作此功能。Python 3 完全支援 Unicode 標識符（PEP 3131）。

---

## 🔍 深度程式碼分析 (Code Analysis)

### 1. **後端 Python 核心邏輯**

#### 📄 `sandbox/grist/identifiers.py`

**核心函數**: `_sanitize_ident()` (Lines 17-48)

```python
def _sanitize_ident(ident, prefix="c", capitalize=False):
  """
  清理並標準化識別符，確保符合 Python/SQLite 要求
  """
  # 步驟 1: Unicode 正規化 (NFKD)
  ident = unicodedata.normalize('NFKD', ident)  # Line 30

  # 步驟 2: 移除組合字符（例如重音符號）
  ident = "".join(c for c in ident if not unicodedata.combining(c))  # Line 33

  # 步驟 3: 替換非法字符 ⚠️ 問題所在
  ident = _invalid_ident_char_re.sub('_', ident).lstrip('_')  # Line 36

  # 步驟 4: 處理以數字開頭的情況
  ident = _invalid_ident_start_re.sub(prefix, ident)  # Line 37

  # 步驟 5: 避免 Python 關鍵字
  while iskeyword(ident):
    ident = prefix + ident

  return ident
```

**呼叫鏈**:
1. `useractions.py:doAddColumn()` → Line 1553
2. `useractions.py:_pick_col_name()` → Lines 1536-1549
3. `identifiers.py:pick_col_ident()` → Lines 84-91
4. `identifiers.py:_sanitize_ident()` → Lines 17-48

**Label-ColId 同步邏輯** (`useractions.py:889-895`):
```python
# 當 label 改變時，自動同步到 colId（除非 untieColIdFromLabel 為 True）
if 'label' in col_values and not col_values.get('untieColIdFromLabel', col.untieColIdFromLabel):
  col_values.setdefault('colId', col_values['label'])
```

---

### 2. **前端 TypeScript 鏡像邏輯**

#### 📄 `app/common/gutil.ts` (Lines 700-713)

```typescript
export function sanitizeIdent(ident: string, prefix?: string) {
  prefix = prefix || 'c';

  // ⚠️ 問題: 同樣只允許 ASCII 字符
  ident = ident.replace(/[^a-zA-Z0-9_]+/g, '_');  // Line 703

  // 移除前後底線
  ident = ident.replace(/^_+|_+$/g, '');

  // 處理數字開頭
  ident = ident.replace(/^(?=[0-9])/g, prefix);

  // 避免 Python 關鍵字
  while (_kwlist.includes(ident)) {
    ident = prefix + ident;
  }

  return ident;
}
```

**使用位置**: `app/client/ui/FieldConfig.ts:36-37`

```typescript
const editableColId = Computed.create(owner, editedLabel, (use, edited) =>
  '$' + (edited ? sanitizeIdent(edited) : use(origColumn.colId)));
```

這用於即時顯示用戶輸入的欄位名稱會如何轉換成 colId。

---

### 3. **現有測試案例**

#### 📄 `sandbox/grist/test_gencode.py` (Lines 151-212)

**現有測試**:
```python
# 越南文測試 - 特殊字符被移除
check(u"Bảng_Đặc_Thù", u"Bang__ac_Thu")  # Đ → _, ả → a, ặ → a, ù → u

# 歐洲語言測試 - 重音符號被移除
check(u"Noëlle", u"Noelle")      # ë → e
check(u"Séamus", u"Seamus")      # é → e
check(u"Erdoğan", u"Erdogan")    # ğ → g

# 特殊字符測試
assertEqual(pick_col_ident(" a s==d!~@#$%^f"), "a_s_d_f")

# 空字串/純符號測試
assertEqual(pick_col_ident("!@#"), "A")  # 生成自動 ID
```

**問題**: 沒有中文/日文/韓文的測試案例！

---

## 🎯 修改方案 (Implementation Plan)

### Phase 1: 後端修改 (Backend Changes)

#### 1.1 修改 `sandbox/grist/identifiers.py`

**檔案**: `sandbox/grist/identifiers.py`
**行數**: 14-15, 17-48

**修改內容**:

```python
# 原始版本 (Line 14)
_invalid_ident_char_re = re.compile(r'[^a-zA-Z0-9_]+')

# 新版本 - 方案 A: 允許所有 Unicode 字母/數字
_invalid_ident_char_re = re.compile(r'[^\w]+', re.UNICODE)

# 新版本 - 方案 B: 更精確控制（推薦）
# 允許: Unicode 字母 (L*)、數字 (Nd)、底線
# 移除: 符號、標點、控制字符
def _is_valid_ident_char(c):
    """檢查字符是否為有效的識別符字符"""
    if c == '_':
        return True
    cat = unicodedata.category(c)
    # L* = 所有字母類別（包括 CJK）
    # Nd = 十進位數字
    return cat[0] == 'L' or cat == 'Nd'

# 在 _sanitize_ident() 中修改 Line 36:
# 舊版本:
ident = _invalid_ident_char_re.sub('_', ident).lstrip('_')

# 新版本:
ident = ''.join(c if _is_valid_ident_char(c) else '_' for c in ident)
ident = ident.lstrip('_')
```

**Unicode 類別說明**:
- `L*` (字母類別):
  - `Lu`: 大寫字母 (A-Z, 中, 한, あ)
  - `Ll`: 小寫字母 (a-z, ぁ, ㄱ)
  - `Lt`: 首字母大寫 (Titlecase)
  - `Lo`: 其他字母 (中文、日文、韓文等)
  - `Lm`: 修飾字母
- `Nd`: 十進位數字 (0-9, ０-９)

**為什麼不用 `\w`?**
- `\w` 在某些實現中可能包含連字符、數字下標等
- 手動檢查 Unicode 類別更精確、可控

**保持移除的字符**:
- `@`: Category = Po (標點)
- `!`: Category = Po
- `~`: Category = Sm (數學符號)
- ` ` (空格): Category = Zs (空白)
- `-`: Category = Pd (破折號)

---

#### 1.2 新增 Python 測試案例

**檔案**: `sandbox/grist/test_gencode.py`
**位置**: 在 `test_ident_combining_chars()` 後新增

```python
def test_ident_chinese_support(self):
    """測試繁體中文、簡體中文、日文、韓文支援"""

    # 繁體中文
    self.assertEqual(identifiers.pick_col_ident("繁體中文"), "繁體中文")
    self.assertEqual(identifiers.pick_col_ident("繁體@A"), "繁體_A")
    self.assertEqual(identifiers.pick_col_ident("用戶名稱"), "用戶名稱")
    self.assertEqual(identifiers.pick_col_ident("測試@123"), "測試_123")

    # 簡體中文
    self.assertEqual(identifiers.pick_col_ident("简体中文"), "简体中文")
    self.assertEqual(identifiers.pick_col_ident("用户@ID"), "用户_ID")

    # 日文 (平假名、片假名、漢字)
    self.assertEqual(identifiers.pick_col_ident("ユーザー名"), "ユーザー名")
    self.assertEqual(identifiers.pick_col_ident("名前@ID"), "名前_ID")
    self.assertEqual(identifiers.pick_col_ident("テスト"), "テスト")

    # 韓文
    self.assertEqual(identifiers.pick_col_ident("사용자"), "사용자")
    self.assertEqual(identifiers.pick_col_ident("이름@ID"), "이름_ID")

    # 混合語言
    self.assertEqual(identifiers.pick_col_ident("User用戶"), "User用戶")
    self.assertEqual(identifiers.pick_col_ident("ID@身份證"), "ID_身份證")

    # 特殊字符仍然被替換
    self.assertEqual(identifiers.pick_col_ident("中文!@#標題"), "中文___標題")

    # 純特殊字符仍回退到自動 ID
    self.assertEqual(identifiers.pick_col_ident("@#$%"), "A")

    # 數字開頭加前綴
    self.assertEqual(identifiers.pick_col_ident("123中文"), "c123中文")

    # 避免衝突
    self.assertEqual(identifiers.pick_col_ident("測試", avoid={"測試"}), "測試2")
    self.assertEqual(identifiers.pick_col_ident("測試", avoid={"測試", "測試2"}), "測試3")

def test_ident_fullwidth_characters(self):
    """測試全形字符"""
    # 全形數字應該被允許（屬於 Unicode Nd 類別）
    self.assertEqual(identifiers.pick_col_ident("測試１２３"), "測試１２３")

    # 全形字母（不屬於標準字母類別，應被移除）
    # Ａ-Ｚ 的 Unicode 類別是 L* 所以會保留
    self.assertEqual(identifiers.pick_col_ident("ＡＢＣＤ"), "ＡＢＣＤ")
```

**執行測試**:
```bash
cd sandbox
python -m pytest grist/test_gencode.py::TestGenCode::test_ident_chinese_support -v
```

---

### Phase 2: 前端修改 (Frontend Changes)

#### 2.1 修改 `app/common/gutil.ts`

**檔案**: `app/common/gutil.ts`
**行數**: 700-713

**問題**: JavaScript/TypeScript 的正則表達式對 Unicode 支援有限。

**解決方案**:

```typescript
/**
 * 檢查字符是否為有效的識別符字符
 * 允許: Unicode 字母、數字、底線
 */
function isValidIdentChar(char: string): boolean {
  if (char === '_') return true;

  // 使用 Unicode 屬性轉義 (ES2018+)
  // \p{L} = 所有 Unicode 字母
  // \p{Nd} = 十進位數字
  return /^[\p{L}\p{Nd}]$/u.test(char);
}

/**
 * Given an arbitrary string, makes substitutions to make it a valid SQL/Python identifier.
 * Corresponds to sandbox/grist/identifiers.py::_sanitize_ident
 *
 * Now supports Unicode characters including CJK (Chinese, Japanese, Korean).
 */
export function sanitizeIdent(ident: string, prefix?: string) {
  prefix = prefix || 'c';

  // 替換非法字符為底線（支援 Unicode）
  ident = Array.from(ident)
    .map(c => isValidIdentChar(c) ? c : '_')
    .join('');

  // 移除前後底線
  ident = ident.replace(/^_+|_+$/g, '');

  // 如果以數字開頭，加上前綴
  ident = ident.replace(/^(?=[\p{Nd}])/u, prefix);

  // 避免 Python 關鍵字
  while (_kwlist.includes(ident)) {
    ident = prefix + ident;
  }

  return ident;
}
```

**重點**:
- 使用 `\p{L}` 和 `\p{Nd}` Unicode 屬性（需要 ES2018+ 和 `/u` 旗標）
- TypeScript/Webpack 配置已支援 ES2018+
- `Array.from()` 正確處理多位元組字符

**瀏覽器相容性**:
- Chrome 64+ ✅
- Firefox 78+ ✅
- Safari 11.1+ ✅
- Edge 79+ ✅

Grist 的目標瀏覽器都支援。

---

#### 2.2 新增前端測試

**檔案**: 可能需要新增 `test/common/gutil.ts` 或在現有測試中新增

```typescript
describe('sanitizeIdent - Unicode support', () => {
  it('should preserve Chinese characters', () => {
    assert.equal(sanitizeIdent('繁體中文'), '繁體中文');
    assert.equal(sanitizeIdent('繁體@A'), '繁體_A');
    assert.equal(sanitizeIdent('用戶名稱'), '用戶名稱');
    assert.equal(sanitizeIdent('測試@123'), '測試_123');
  });

  it('should preserve Japanese characters', () => {
    assert.equal(sanitizeIdent('ユーザー名'), 'ユーザー名');
    assert.equal(sanitizeIdent('名前@ID'), '名前_ID');
  });

  it('should preserve Korean characters', () => {
    assert.equal(sanitizeIdent('사용자'), '사용자');
    assert.equal(sanitizeIdent('이름@ID'), '이름_ID');
  });

  it('should handle mixed languages', () => {
    assert.equal(sanitizeIdent('User用戶'), 'User用戶');
    assert.equal(sanitizeIdent('ID@身份證'), 'ID_身份證');
  });

  it('should replace special characters but keep Unicode letters', () => {
    assert.equal(sanitizeIdent('中文!@#標題'), '中文___標題');
  });

  it('should handle fullwidth numbers', () => {
    assert.equal(sanitizeIdent('測試１２３'), '測試１２３');
  });
});
```

---

### Phase 3: 資料庫與遷移考量

#### 3.1 SQLite 相容性

**檢查**: SQLite 是否支援 Unicode 欄位名？

**答案**: ✅ 是的！

SQLite 完全支援 UTF-8 編碼的識別符：
```sql
CREATE TABLE test (
  "繁體中文" TEXT,
  "用戶_ID" INTEGER
);

SELECT "繁體中文" FROM test;  -- 有效
```

**測試方法**:
```python
import sqlite3

conn = sqlite3.connect(':memory:')
cursor = conn.cursor()

# 建立包含中文欄位的表
cursor.execute('CREATE TABLE test ("繁體中文" TEXT, "用戶_ID" INTEGER)')
cursor.execute('INSERT INTO test VALUES (?, ?)', ('測試值', 123))
cursor.execute('SELECT "繁體中文", "用戶_ID" FROM test')

print(cursor.fetchall())  # [('測試值', 123)]
```

---

#### 3.2 現有文件遷移

**問題**: 現有的 Grist 文件中，中文欄位名稱的 colId 已被清理（變成空字串 → 自動 ID）。

**例如**:
- 欄位名稱 (label): `"用戶名稱"`
- 現有 colId: `"A"` 或 `"c1"`

**遷移策略**:

**選項 1: 不自動遷移**（推薦）
- 新建欄位使用新規則（保留中文）
- 現有欄位保持不變
- 用戶可手動重新命名欄位（會觸發 colId 更新）

**優點**:
- 不破壞現有文件
- 無需資料遷移
- 向後相容

**選項 2: 提供遷移工具**
- 新增管理介面選項："重新同步所有欄位 ID"
- 掃描所有表格，將 label 重新同步到 colId
- 使用新的清理規則

**風險**:
- 可能破壞現有公式引用
- 需要更新所有引用該 colId 的公式

**建議**: 採用選項 1

---

### Phase 4: 邊界情況與安全性

#### 4.1 Python 關鍵字檢查

現有邏輯已處理：
```python
while iskeyword(ident):
  ident = prefix + ident
```

**測試**:
```python
assertEqual(pick_col_ident("class"), "cclass")
assertEqual(pick_col_ident("for"), "cfor")
```

✅ 無需修改

---

#### 4.2 長度限制

**問題**: 中文字符通常佔用 3-4 bytes (UTF-8)

**SQLite 限制**:
- 識別符最大長度: 通常無硬性限制，但實務上建議 < 128 字符

**Python 限制**:
- 識別符無長度限制（實務上 < 256）

**建議**: 新增長度檢查（可選）

```python
MAX_IDENT_LENGTH = 128

def _sanitize_ident(ident, prefix="c", capitalize=False):
  # ... 現有邏輯 ...

  # 截斷過長的識別符
  if len(ident) > MAX_IDENT_LENGTH:
    ident = ident[:MAX_IDENT_LENGTH]
    # 確保不以底線結尾
    ident = ident.rstrip('_')

  return ident
```

---

#### 4.3 安全性考量

**SQL Injection 風險**: ❌ 無

- Grist 使用參數化查詢
- 欄位名稱會被引號包裹
- 不直接拼接 SQL

**Python Code Injection**: ❌ 無

- 公式在沙箱環境執行
- 識別符經過清理
- 不執行任意程式碼

---

## 📝 實作檢查清單 (Implementation Checklist)

### Backend (Python)
- [ ] 修改 `sandbox/grist/identifiers.py`:
  - [ ] 新增 `_is_valid_ident_char()` 函數
  - [ ] 修改 `_sanitize_ident()` 使用新邏輯
  - [ ] 移除或更新第 35 行的 TODO 註釋
  - [ ] (可選) 新增長度限制檢查

- [ ] 新增測試 `sandbox/grist/test_gencode.py`:
  - [ ] `test_ident_chinese_support()`
  - [ ] `test_ident_fullwidth_characters()`
  - [ ] 執行測試確保通過

- [ ] 執行完整測試套件:
  ```bash
  cd sandbox
  python -m pytest grist/test_gencode.py -v
  ```

### Frontend (TypeScript)
- [ ] 修改 `app/common/gutil.ts`:
  - [ ] 新增 `isValidIdentChar()` 輔助函數
  - [ ] 修改 `sanitizeIdent()` 支援 Unicode
  - [ ] 更新註釋說明支援 CJK

- [ ] (可選) 新增測試:
  - [ ] 在 `test/common/gutil.ts` 新增 Unicode 測試
  - [ ] 執行測試

- [ ] 前端建置與驗證:
  ```bash
  yarn build
  yarn test
  ```

### Integration Testing
- [ ] 手動測試流程:
  - [ ] 啟動 Grist 伺服器
  - [ ] 建立新文件
  - [ ] 新增欄位，名稱為 `"繁體中文"`
  - [ ] 驗證 colId 為 `"繁體中文"`
  - [ ] 新增欄位，名稱為 `"測試@123"`
  - [ ] 驗證 colId 為 `"測試_123"`
  - [ ] 測試公式引用: `$繁體中文`
  - [ ] 測試表格引用: `Table1.繁體中文`

- [ ] 瀏覽器測試:
  - [ ] Chrome
  - [ ] Firefox
  - [ ] Safari (如果可用)

### Documentation
- [ ] 更新文件:
  - [ ] 在發行說明中提及 Unicode 支援
  - [ ] (可選) 新增使用者文件說明多語言欄位名稱

---

## 🧪 測試計劃 (Test Plan)

### 單元測試 (Unit Tests)

#### Python Tests
**檔案**: `sandbox/grist/test_gencode.py`

**測試案例**:
1. ✅ 繁體中文字符保留
2. ✅ 簡體中文字符保留
3. ✅ 日文字符保留（平假名、片假名、漢字）
4. ✅ 韓文字符保留
5. ✅ 混合語言（英文+中文）
6. ✅ 特殊字符仍被替換為底線
7. ✅ 純符號回退到自動 ID
8. ✅ 數字開頭加前綴
9. ✅ 衝突避免邏輯
10. ✅ Python 關鍵字避免

#### TypeScript Tests
**檔案**: `test/common/gutil.ts`

**測試案例**:
1. ✅ 與 Python 測試對應的所有案例
2. ✅ 確保前後端行為一致

---

### 整合測試 (Integration Tests)

#### 測試場景 1: 建立新欄位
```
動作:
1. 建立新文件
2. 新增表格
3. 新增欄位，名稱 = "繁體中文"

預期:
- label = "繁體中文"
- colId = "繁體中文"
- 公式可引用 $繁體中文
```

#### 測試場景 2: 特殊字符處理
```
動作:
1. 新增欄位，名稱 = "用戶@ID"

預期:
- label = "用戶@ID"
- colId = "用戶_ID"
```

#### 測試場景 3: 衝突處理
```
動作:
1. 新增欄位 "測試"
2. 再新增欄位 "測試"
3. 再新增欄位 "測試@符號"

預期:
- 第一欄: colId = "測試"
- 第二欄: colId = "測試2"
- 第三欄: colId = "測試_符號"
```

#### 測試場景 4: 公式引用
```
動作:
1. 欄位 A: "數量" (數字類型) = 100
2. 欄位 B: "單價" (數字類型) = 50
3. 欄位 C: "總價" (公式) = $數量 * $單價

預期:
- 總價顯示 5000
- 公式編輯器支援中文欄位名稱自動完成
```

---

### 回歸測試 (Regression Tests)

**確保現有功能不受影響**:

1. ✅ 英文欄位名稱仍正常運作
2. ✅ 數字開頭的處理
3. ✅ 特殊字符替換
4. ✅ Python 關鍵字避免
5. ✅ 自動 ID 生成 (A, B, C, ..., AA, AB)
6. ✅ 衝突避免與數字後綴
7. ✅ 表格識別符生成
8. ✅ untieColIdFromLabel 旗標功能

---

## 🚀 部署計劃 (Deployment Plan)

### Stage 1: 開發與測試
1. 在開發分支實作修改
2. 執行所有單元測試
3. 手動整合測試
4. 程式碼審查

### Stage 2: 測試環境驗證
1. 部署到測試環境
2. 建立測試文件
3. 執行完整測試計劃
4. 效能測試（確保無效能倒退）

### Stage 3: 文件更新
1. 更新發行說明
2. (可選) 更新使用者文件

### Stage 4: 生產部署
1. 合併到主分支
2. 建置發佈版本
3. 部署
4. 監控錯誤日誌

---

## ⚠️ 風險與緩解措施 (Risks & Mitigations)

### 風險 1: 向後相容性
**問題**: 現有文件中中文欄位的 colId 已是自動生成的 ID

**緩解**:
- ✅ 新規則只影響新建欄位
- ✅ 現有欄位保持不變
- ✅ 無需資料遷移

---

### 風險 2: 公式編輯器相容性
**問題**: 公式解析器是否支援 Unicode 識別符？

**檢查**:
- Python 3 原生支援 Unicode 識別符
- 需測試 Grist 的公式解析器

**測試**:
```python
# 在 Python 中測試
測試 = 100
數量 = 50
總價 = 測試 * 數量
print(總價)  # 5000
```

✅ Python 3 完全支援

**緩解**:
- 需要檢查 Grist 的公式編輯器 UI
- 可能需要更新自動完成邏輯

---

### 風險 3: 效能影響
**問題**: Unicode 正規化與字符檢查是否影響效能？

**分析**:
- `unicodedata.category()` 是快速的查表操作
- 影響僅在欄位建立/重新命名時
- 頻率低，影響可忽略

**緩解**:
- 新增效能測試
- 如有需要，可快取結果

---

### 風險 4: 瀏覽器相容性
**問題**: 舊版瀏覽器可能不支援 `\p{L}` 正則表達式

**緩解**:
- Grist 最低支援版本已包含 ES2018
- 可新增 polyfill（如果需要）
- 前端主要用於 UI 顯示，後端才是最終驗證

---

## 📊 預期影響 (Expected Impact)

### 正面影響
✅ 支援中文/日文/韓文用戶使用母語命名欄位
✅ 提升 Grist 在亞洲市場的可用性
✅ 欄位名稱與 colId 更直覺對應
✅ 減少用戶困惑（為什麼中文會消失？）

### 中性影響
🟡 程式碼複雜度略微提升（Unicode 處理）
🟡 需要新增測試案例

### 負面影響
❌ 無重大負面影響
❌ 向後相容性已確保

---

## 📅 預估時程 (Estimated Timeline)

| 階段 | 任務 | 預估時間 |
|------|------|----------|
| 1 | 後端修改與測試 | 2-3 小時 |
| 2 | 前端修改與測試 | 2-3 小時 |
| 3 | 整合測試 | 2 小時 |
| 4 | 文件更新 | 1 小時 |
| 5 | 程式碼審查與調整 | 1-2 小時 |
| **總計** | | **8-11 小時** |

---

## ✅ 成功標準 (Success Criteria)

1. ✅ **功能驗證**:
   - 中文欄位名稱正確轉換為 colId
   - 特殊字符仍被替換為底線
   - 公式可引用中文欄位

2. ✅ **測試覆蓋**:
   - 所有新測試案例通過
   - 無回歸測試失敗

3. ✅ **相容性**:
   - 現有文件正常運作
   - 支援的瀏覽器都能使用

4. ✅ **效能**:
   - 無明顯效能倒退

---

## 📚 參考資料 (References)

### Python 3 Unicode 支援
- [PEP 3131 - Supporting Non-ASCII Identifiers](https://www.python.org/dev/peps/pep-3131/)
- [Python Unicode HOWTO](https://docs.python.org/3/howto/unicode.html)
- [unicodedata module](https://docs.python.org/3/library/unicodedata.html)

### JavaScript/TypeScript Unicode 正則表達式
- [MDN - Unicode property escapes](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions/Unicode_Property_Escapes)
- [ECMAScript 2018 - RegExp Unicode Property Escapes](https://tc39.es/ecma262/#sec-runtime-semantics-unicodematchproperty-p)

### SQLite Unicode 支援
- [SQLite UTF-8 Support](https://www.sqlite.org/pragma.html#pragma_encoding)
- [SQLite Identifier Quoting](https://www.sqlite.org/lang_keywords.html)

### Unicode 字符類別
- [Unicode Character Categories](https://www.unicode.org/reports/tr44/#General_Category_Values)

---

## 🔄 後續優化建議 (Future Enhancements)

1. **自動完成改進**:
   - 公式編輯器支援中文欄位名稱的拼音搜尋
   - 例如：輸入 "yonghu" 可找到 "用戶"

2. **國際化擴展**:
   - 支援阿拉伯文（RTL）
   - 支援泰文、印地文等

3. **遷移工具**:
   - 提供 UI 選項重新同步現有欄位的 colId

4. **效能優化**:
   - 快取 Unicode 類別查詢結果

---

**計劃建立日期**: 2025-11-18
**計劃版本**: 1.0
**負責人**: Owen Hsu
**狀態**: 📝 規劃完成，待實作
