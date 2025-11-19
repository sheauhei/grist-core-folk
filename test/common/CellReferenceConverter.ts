import {CellReferenceConverter} from 'app/common/CellReferenceConverter';
import {ExcelColumnData} from 'app/common/ExcelFormulaParser';
import {assert} from 'chai';

describe("CellReferenceConverter", function() {
  let columns: ExcelColumnData[];
  let converter: CellReferenceConverter;

  beforeEach(function() {
    // Create test column mapping
    columns = [
      { name: 'Product', index: 0, letter: 'A', isFormula: false },
      { name: 'Price', index: 1, letter: 'B', isFormula: false },
      { name: 'Quantity', index: 2, letter: 'C', isFormula: false },
      { name: 'Total', index: 3, letter: 'D', isFormula: true, exampleFormula: 'B2*C2' },
      { name: 'Is Premium', index: 4, letter: 'E', isFormula: false },
    ];

    converter = new CellReferenceConverter(columns, 'Sales');
  });

  describe("parseCellRef", function() {
    it("should parse simple cell references", function() {
      const ref = converter.parseCellRef('A2');
      assert.equal(ref.column, 'A');
      assert.equal(ref.row, 2);
      assert.equal(ref.isColumnAbsolute, false);
      assert.equal(ref.isRowAbsolute, false);
    });

    it("should parse absolute column references", function() {
      const ref = converter.parseCellRef('$A2');
      assert.equal(ref.column, 'A');
      assert.equal(ref.row, 2);
      assert.equal(ref.isColumnAbsolute, true);
      assert.equal(ref.isRowAbsolute, false);
    });

    it("should parse absolute row references", function() {
      const ref = converter.parseCellRef('A$2');
      assert.equal(ref.column, 'A');
      assert.equal(ref.row, 2);
      assert.equal(ref.isColumnAbsolute, false);
      assert.equal(ref.isRowAbsolute, true);
    });

    it("should parse fully absolute references", function() {
      const ref = converter.parseCellRef('$A$2');
      assert.equal(ref.column, 'A');
      assert.equal(ref.row, 2);
      assert.equal(ref.isColumnAbsolute, true);
      assert.equal(ref.isRowAbsolute, true);
    });

    it("should parse column-only references", function() {
      const ref = converter.parseCellRef('A');
      assert.equal(ref.column, 'A');
      assert.equal(ref.row, undefined);
    });

    it("should parse multi-letter columns", function() {
      const columns2 = [
        ...columns,
        { name: 'Extra', index: 26, letter: 'AA', isFormula: false },
      ];
      const converter2 = new CellReferenceConverter(columns2);
      const ref = converter2.parseCellRef('AA10');
      assert.equal(ref.column, 'AA');
      assert.equal(ref.row, 10);
    });
  });

  describe("convertFormula - Simple References", function() {
    it("should convert simple cell reference (B2*C2)", function() {
      const result = converter.convertFormula('B2*C2');
      assert.equal(result.success, true);
      assert.equal(result.gristFormula, '$Price * $Quantity');
      assert.equal(result.warnings.length, 0);
    });

    it("should convert arithmetic operations", function() {
      const result = converter.convertFormula('B2+C2-100');
      assert.equal(result.success, true);
      assert.equal(result.gristFormula, '$Price + $Quantity - 100');
    });

    it("should convert with parentheses", function() {
      const result = converter.convertFormula('(B2+C2)*2');
      assert.equal(result.success, true);
      assert.equal(result.gristFormula, '($Price + $Quantity) * 2');
    });

    it("should convert absolute references to column references", function() {
      const result = converter.convertFormula('$B$2*C2');
      assert.equal(result.success, true);
      assert.equal(result.gristFormula, '$Price * $Quantity');
      assert.isTrue(result.warnings.length > 0, 'Should have warning about absolute reference');
    });
  });

  describe("convertFormula - Range References", function() {
    it("should convert same-column range (A2:A10)", function() {
      const result = converter.convertFormula('SUM(A2:A10)');
      assert.equal(result.success, true);
      assert.equal(result.gristFormula, 'SUM(Sales.Product)');
    });

    it("should convert full column range (B:B)", function() {
      const result = converter.convertFormula('AVERAGE(B:B)');
      assert.equal(result.success, true);
      assert.equal(result.gristFormula, 'AVERAGE(Sales.Price)');
    });

    it("should convert absolute range ($B$2:$B$10)", function() {
      const result = converter.convertFormula('SUM($B$2:$B$10)');
      assert.equal(result.success, true);
      assert.equal(result.gristFormula, 'SUM(Sales.Price)');
      assert.isTrue(result.warnings.some((w: string) => w.includes('Absolute')));
    });

    it("should handle MAX and MIN functions", function() {
      const result1 = converter.convertFormula('MAX(B2:B100)');
      assert.equal(result1.gristFormula, 'MAX(Sales.Price)');

      const result2 = converter.convertFormula('MIN(C2:C100)');
      assert.equal(result2.gristFormula, 'MIN(Sales.Quantity)');
    });
  });

  describe("convertFormula - Conditional Functions", function() {
    it("should convert IF function", function() {
      const result = converter.convertFormula('IF(E2, B2*0.9, B2)');
      assert.equal(result.success, true);
      assert.equal(result.gristFormula, 'IF($Is_Premium, $Price * 0.9, $Price)');
    });

    it("should convert nested IF", function() {
      const result = converter.convertFormula('IF(B2>100, IF(E2, B2*0.8, B2*0.9), B2)');
      assert.equal(result.success, true);
      assert.equal(result.gristFormula, 'IF($Price > 100, IF($Is_Premium, $Price * 0.8, $Price * 0.9), $Price)');
    });

    it("should convert IF with range functions", function() {
      const result = converter.convertFormula('IF(B2>AVERAGE(B:B), "High", "Low")');
      assert.equal(result.success, true);
      assert.equal(result.gristFormula, 'IF($Price > AVERAGE(Sales.Price), "High", "Low")');
    });
  });

  describe("convertFormula - Complex Formulas", function() {
    it("should convert multiple references in one formula", function() {
      const result = converter.convertFormula('B2*C2+B3*C3');
      assert.equal(result.success, true);
      assert.equal(result.gristFormula, '$Price * $Quantity + $Price * $Quantity');
    });

    it("should convert formulas with string concatenation", function() {
      const result = converter.convertFormula('A2&" - "&B2');
      assert.equal(result.success, true);
      assert.equal(result.gristFormula, '$Product & " - " & $Price');
    });

    it("should handle comparison operators", function() {
      const result = converter.convertFormula('B2>100');
      assert.equal(result.success, true);
      assert.equal(result.gristFormula, '$Price > 100');
    });

    it("should handle formulas with leading =", function() {
      const result = converter.convertFormula('=B2*C2');
      assert.equal(result.success, true);
      assert.equal(result.gristFormula, '$Price * $Quantity');
    });
  });

  describe("sanitizeColumnName", function() {
    it("should handle column names with spaces", function() {
      const specialColumns = [
        { name: 'Product Name', index: 0, letter: 'A', isFormula: false },
        { name: 'Unit Price', index: 1, letter: 'B', isFormula: false },
      ];
      const specialConverter = new CellReferenceConverter(specialColumns);
      const result = specialConverter.convertFormula('A2&B2');
      assert.equal(result.gristFormula, '$Product_Name & $Unit_Price');
    });

    it("should handle column names with special characters", function() {
      const specialColumns = [
        { name: 'Price ($)', index: 0, letter: 'A', isFormula: false },
        { name: 'Quantity #', index: 1, letter: 'B', isFormula: false },
      ];
      const specialConverter = new CellReferenceConverter(specialColumns);
      const result = specialConverter.convertFormula('A2*B2');
      assert.equal(result.gristFormula, '$Price * $Quantity');
    });

    it("should handle column names starting with numbers", function() {
      const specialColumns = [
        { name: '2023 Sales', index: 0, letter: 'A', isFormula: false },
      ];
      const specialConverter = new CellReferenceConverter(specialColumns);
      const result = specialConverter.convertFormula('A2*2');
      assert.equal(result.gristFormula, '$_2023_Sales * 2');
    });

    it("should remove consecutive underscores", function() {
      const specialColumns = [
        { name: 'Product  --  Name', index: 0, letter: 'A', isFormula: false },
      ];
      const specialConverter = new CellReferenceConverter(specialColumns);
      const result = specialConverter.convertFormula('A2');
      assert.equal(result.gristFormula, '$Product_Name');
    });
  });

  describe("warnings and edge cases", function() {
    it("should warn about unknown columns", function() {
      const result = converter.convertFormula('Z2*100');
      assert.equal(result.success, true);
      assert.isTrue(result.warnings.some((w: string) => w.includes('Unknown column')));
    });

    it("should warn about multi-column ranges", function() {
      const result = converter.convertFormula('SUM(A2:C10)');
      assert.equal(result.success, true);
      assert.isTrue(result.warnings.some((w: string) => w.includes('Multi-column range')));
    });

    it("should handle empty formulas", function() {
      const result = converter.convertFormula('');
      assert.equal(result.success, true);
      assert.equal(result.gristFormula, '');
    });
  });
});
