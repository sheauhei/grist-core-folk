import {ExcelFormulaParser} from 'app/common/ExcelFormulaParser';
import {assert} from 'chai';
import * as ExcelJS from 'exceljs';

describe("ExcelFormulaParser", function() {
  let parser: ExcelFormulaParser;

  beforeEach(function() {
    parser = new ExcelFormulaParser();
  });

  describe("parseBuffer", function() {
    it("should parse a simple Excel file with formulas", async function() {
      // Create a test workbook in memory
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Sales');

      // Add headers
      worksheet.getRow(1).values = ['Product', 'Price', 'Quantity', 'Total'];

      // Add data rows with formulas
      worksheet.getCell('A2').value = 'Item A';
      worksheet.getCell('B2').value = 100;
      worksheet.getCell('C2').value = 5;
      worksheet.getCell('D2').value = { formula: 'B2*C2', result: 500 } as any;

      worksheet.getCell('A3').value = 'Item B';
      worksheet.getCell('B3').value = 200;
      worksheet.getCell('C3').value = 3;
      worksheet.getCell('D3').value = { formula: 'B3*C3', result: 600 } as any;

      // Convert to buffer
      const buffer = await workbook.xlsx.writeBuffer() as Buffer;

      // Parse
      const sheets = await parser.parseBuffer(buffer);

      assert.equal(sheets.length, 1);
      assert.equal(sheets[0].name, 'Sales');
      assert.equal(sheets[0].formulaCount, 1, 'Should detect 1 formula column');

      // Check headers
      assert.deepEqual(sheets[0].headers, ['Product', 'Price', 'Quantity', 'Total']);

      // Check columns
      assert.equal(sheets[0].columns.length, 4);
      assert.equal(sheets[0].columns[0].isFormula, false, 'Product should not be formula');
      assert.equal(sheets[0].columns[1].isFormula, false, 'Price should not be formula');
      assert.equal(sheets[0].columns[2].isFormula, false, 'Quantity should not be formula');
      assert.equal(sheets[0].columns[3].isFormula, true, 'Total should be formula');

      // Check formula
      assert.equal(sheets[0].columns[3].exampleFormula, 'B2*C2');

      // Check data rows
      assert.equal(sheets[0].rows.length, 2);
      assert.equal(sheets[0].rows[0][3].type, 'formula');
      assert.equal(sheets[0].rows[0][3].formula, 'B2*C2');
    });

    it("should handle files with no formulas", async function() {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Data');

      // Add headers
      worksheet.getRow(1).values = ['Name', 'Age', 'City'];

      // Add data rows without formulas
      worksheet.getRow(2).values = ['Alice', 30, 'New York'];
      worksheet.getRow(3).values = ['Bob', 25, 'London'];

      const buffer = await workbook.xlsx.writeBuffer() as Buffer;
      const sheets = await parser.parseBuffer(buffer);

      assert.equal(sheets.length, 1);
      assert.equal(sheets[0].formulaCount, 0, 'Should detect 0 formula columns');

      // All columns should be non-formula
      sheets[0].columns.forEach((col: any) => {
        assert.equal(col.isFormula, false, `${col.name} should not be formula`);
      });
    });

    it("should detect formulas based on first data row only", async function() {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Test');

      // Add headers
      worksheet.getRow(1).values = ['Name', 'Value'];

      // First data row has formula
      worksheet.getCell('A2').value = 'Item A';
      worksheet.getCell('B2').value = { formula: 'A2&"_value"', result: 'Item A_value' } as any;

      // Second row has plain value (should still be detected as formula column)
      worksheet.getCell('A3').value = 'Item B';
      worksheet.getCell('B3').value = 'Plain value';

      const buffer = await workbook.xlsx.writeBuffer() as Buffer;
      const sheets = await parser.parseBuffer(buffer);

      assert.equal(sheets[0].formulaCount, 1);
      assert.equal(sheets[0].columns[1].isFormula, true, 'Column should be formula based on first row');
      assert.equal(sheets[0].columns[1].exampleFormula, 'A2&"_value"');
    });

    it("should parse complex statistical formulas", async function() {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Stats');

      // Add headers
      worksheet.getRow(1).values = ['Month', 'Sales', 'Total', 'Average'];

      // Add data
      worksheet.getCell('A2').value = 'Jan';
      worksheet.getCell('B2').value = 1000;
      worksheet.getCell('C2').value = { formula: 'SUM($B$2:$B$13)', result: 15000 } as any;
      worksheet.getCell('D2').value = { formula: 'AVERAGE(B:B)', result: 1250 } as any;

      const buffer = await workbook.xlsx.writeBuffer() as Buffer;
      const sheets = await parser.parseBuffer(buffer);

      assert.equal(sheets[0].formulaCount, 2);
      assert.equal(sheets[0].columns[2].isFormula, true);
      assert.equal(sheets[0].columns[2].exampleFormula, 'SUM($B$2:$B$13)');
      assert.equal(sheets[0].columns[3].isFormula, true);
      assert.equal(sheets[0].columns[3].exampleFormula, 'AVERAGE(B:B)');
    });

    it("should parse conditional formulas (IF)", async function() {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Discounts');

      // Add headers
      worksheet.getRow(1).values = ['Product', 'Price', 'Is_Premium', 'Final_Price'];

      // Add data
      worksheet.getCell('A2').value = 'Item A';
      worksheet.getCell('B2').value = 100;
      worksheet.getCell('C2').value = true;
      worksheet.getCell('D2').value = { formula: 'IF(C2, B2*0.9, B2)', result: 90 } as any;

      const buffer = await workbook.xlsx.writeBuffer() as Buffer;
      const sheets = await parser.parseBuffer(buffer);

      assert.equal(sheets[0].formulaCount, 1);
      assert.equal(sheets[0].columns[3].isFormula, true);
      assert.equal(sheets[0].columns[3].exampleFormula, 'IF(C2, B2*0.9, B2)');
    });

    it("should handle mixed absolute and relative references", async function() {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Mixed');

      // Add headers
      worksheet.getRow(1).values = ['Name', 'Value', 'RelativeRef', 'AbsoluteRef', 'MixedRef'];

      // Add data
      worksheet.getCell('A2').value = 'Item A';
      worksheet.getCell('B2').value = 100;
      worksheet.getCell('C2').value = { formula: 'B2*2', result: 200 } as any;
      worksheet.getCell('D2').value = { formula: '$B$2*3', result: 300 } as any;
      worksheet.getCell('E2').value = { formula: 'B$2*4', result: 400 } as any;

      const buffer = await workbook.xlsx.writeBuffer() as Buffer;
      const sheets = await parser.parseBuffer(buffer);

      assert.equal(sheets[0].formulaCount, 3);
      assert.equal(sheets[0].columns[2].exampleFormula, 'B2*2', 'Relative reference');
      assert.equal(sheets[0].columns[3].exampleFormula, '$B$2*3', 'Absolute reference');
      assert.equal(sheets[0].columns[4].exampleFormula, 'B$2*4', 'Mixed reference');
    });
  });

  describe("column letter conversion", function() {
    it("should convert column indices to Excel letters correctly", function() {
      // Access private method via any cast for testing
      const parserAny = parser as any;

      assert.equal(parserAny.indexToLetter(0), 'A');
      assert.equal(parserAny.indexToLetter(1), 'B');
      assert.equal(parserAny.indexToLetter(25), 'Z');
      assert.equal(parserAny.indexToLetter(26), 'AA');
      assert.equal(parserAny.indexToLetter(27), 'AB');
      assert.equal(parserAny.indexToLetter(51), 'AZ');
      assert.equal(parserAny.indexToLetter(52), 'BA');
      assert.equal(parserAny.indexToLetter(701), 'ZZ');
      assert.equal(parserAny.indexToLetter(702), 'AAA');
    });
  });

  describe("cell address generation", function() {
    it("should generate correct cell addresses", function() {
      const parserAny = parser as any;

      assert.equal(parserAny.getAddress(1, 1), 'A1');
      assert.equal(parserAny.getAddress(2, 1), 'A2');
      assert.equal(parserAny.getAddress(1, 2), 'B1');
      assert.equal(parserAny.getAddress(10, 5), 'E10');
      assert.equal(parserAny.getAddress(100, 27), 'AA100');
    });
  });
});
