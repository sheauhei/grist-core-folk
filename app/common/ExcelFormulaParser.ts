/**
 * ExcelFormulaParser.ts
 *
 * Parses Excel files and detects formula columns based on the first data row.
 * Converts Excel formulas to Grist formula syntax with column references.
 */

import * as ExcelJS from 'exceljs';

/**
 * Represents a single cell in the Excel file
 */
export interface ExcelCellData {
  value: any;
  formula?: string;
  type: 'formula' | 'value';
  address: string;  // Cell address like "A2", "B5"
}

/**
 * Represents column metadata and detected type
 */
export interface ExcelColumnData {
  name: string;          // Column header
  index: number;         // 0-based index
  letter: string;        // Excel column letter (A, B, C...)
  isFormula: boolean;    // Whether this column contains formulas
  exampleFormula?: string;  // Example formula from first data row
  exampleValue?: any;    // Example value if not formula
}

/**
 * Represents parsed data from an Excel sheet
 */
export interface ExcelSheetData {
  name: string;
  headers: string[];
  columns: ExcelColumnData[];
  rows: ExcelCellData[][];
  formulaCount: number;  // Number of formula columns
}

/**
 * Main parser class for Excel formula import
 */
export class ExcelFormulaParser {
  /**
   * Parse an Excel file and extract formula information
   * @param filePath Path to the Excel file
   * @returns Parsed sheet data with formula detection
   */
  async parseFile(filePath: string): Promise<ExcelSheetData[]> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    const sheetsData: ExcelSheetData[] = [];

    workbook.eachSheet((worksheet, sheetId) => {
      const sheetData = this.parseWorksheet(worksheet);
      sheetsData.push(sheetData);
    });

    return sheetsData;
  }

  /**
   * Parse an Excel file from a Buffer (for browser uploads)
   * @param buffer File buffer
   * @returns Parsed sheet data with formula detection
   */
  async parseBuffer(buffer: Buffer): Promise<ExcelSheetData[]> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const sheetsData: ExcelSheetData[] = [];

    workbook.eachSheet((worksheet, sheetId) => {
      const sheetData = this.parseWorksheet(worksheet);
      sheetsData.push(sheetData);
    });

    return sheetsData;
  }

  /**
   * Parse a single worksheet
   * @param worksheet ExcelJS worksheet
   * @returns Parsed sheet data
   */
  private parseWorksheet(worksheet: ExcelJS.Worksheet): ExcelSheetData {
    const rows: ExcelCellData[][] = [];
    const headers: string[] = [];

    // Track if we've processed the header row
    let isFirstRow = true;

    // Parse all rows
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (isFirstRow) {
        // First row is the header
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          const value = this.getCellValue(cell);
          headers.push(value?.toString() || `Column${colNumber}`);
        });
        isFirstRow = false;
      } else {
        // Data rows
        const rowData: ExcelCellData[] = [];
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          const cellData = this.parseCellData(cell, rowNumber, colNumber);
          rowData.push(cellData);
        });
        rows.push(rowData);
      }
    });

    // Analyze columns to detect formula columns
    const columns = this.analyzeColumns(rows, headers);

    return {
      name: worksheet.name,
      headers,
      columns,
      rows,
      formulaCount: columns.filter(col => col.isFormula).length,
    };
  }

  /**
   * Parse a single cell and extract its data
   * @param cell ExcelJS cell
   * @param rowNumber Row number
   * @param colNumber Column number
   * @returns Cell data
   */
  private parseCellData(cell: ExcelJS.Cell, rowNumber: number, colNumber: number): ExcelCellData {
    const address = this.getAddress(rowNumber, colNumber);

    // Check if cell contains a formula
    if (cell.type === ExcelJS.ValueType.Formula) {
      const formula = this.extractFormula(cell);
      return {
        value: cell.value,
        formula,
        type: 'formula',
        address,
      };
    } else {
      return {
        value: this.getCellValue(cell),
        type: 'value',
        address,
      };
    }
  }

  /**
   * Extract formula text from a cell
   * @param cell ExcelJS cell
   * @returns Formula string
   */
  private extractFormula(cell: ExcelJS.Cell): string {
    if (cell.type === ExcelJS.ValueType.Formula) {
      const formulaValue = cell.value as ExcelJS.CellFormulaValue;
      if (typeof formulaValue === 'object' && 'formula' in formulaValue) {
        return formulaValue.formula;
      }
    }
    return '';
  }

  /**
   * Get the display value of a cell
   * @param cell ExcelJS cell
   * @returns Cell value
   */
  private getCellValue(cell: ExcelJS.Cell): any {
    if (cell.type === ExcelJS.ValueType.Formula) {
      const formulaValue = cell.value as ExcelJS.CellFormulaValue;
      // Return the calculated result if available
      if (typeof formulaValue === 'object' && 'result' in formulaValue) {
        return formulaValue.result;
      }
    }
    return cell.value;
  }

  /**
   * Analyze columns and detect which ones contain formulas
   * Formula detection: based on the FIRST data row (excluding header)
   *
   * @param rows All data rows
   * @param headers Column headers
   * @returns Column metadata with formula detection
   */
  private analyzeColumns(rows: ExcelCellData[][], headers: string[]): ExcelColumnData[] {
    const columns: ExcelColumnData[] = [];

    // Use the first data row for formula detection
    const firstDataRow = rows.length > 0 ? rows[0] : [];

    for (let colIndex = 0; colIndex < headers.length; colIndex++) {
      const firstCell = firstDataRow[colIndex];
      const isFormula = firstCell?.type === 'formula';

      columns.push({
        name: headers[colIndex],
        index: colIndex,
        letter: this.indexToLetter(colIndex),
        isFormula,
        exampleFormula: isFormula ? firstCell.formula : undefined,
        exampleValue: !isFormula ? firstCell?.value : undefined,
      });
    }

    return columns;
  }

  /**
   * Convert 0-based column index to Excel column letter
   * 0 -> A, 1 -> B, 25 -> Z, 26 -> AA, etc.
   *
   * @param index 0-based column index
   * @returns Excel column letter
   */
  private indexToLetter(index: number): string {
    let letter = '';
    let num = index;

    while (num >= 0) {
      letter = String.fromCharCode((num % 26) + 65) + letter;
      num = Math.floor(num / 26) - 1;
    }

    return letter;
  }

  /**
   * Get cell address from row and column numbers
   * @param rowNumber 1-based row number
   * @param colNumber 1-based column number
   * @returns Cell address like "A2"
   */
  private getAddress(rowNumber: number, colNumber: number): string {
    const letter = this.indexToLetter(colNumber - 1);
    return `${letter}${rowNumber}`;
  }
}
