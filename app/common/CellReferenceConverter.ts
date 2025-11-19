/**
 * CellReferenceConverter.ts
 *
 * Converts Excel cell references to Grist column references.
 * Transforms Excel formulas into Grist-compatible syntax.
 */

import {ExcelColumnData} from './ExcelFormulaParser';

/**
 * Represents a parsed Excel cell reference
 */
export interface ParsedCellRef {
  column: string;          // Column letter (A, B, C...)
  row?: number;            // Row number (optional for column-only refs like "A:A")
  isColumnAbsolute: boolean;  // True if column has $ (e.g., $A2)
  isRowAbsolute: boolean;     // True if row has $ (e.g., A$2)
  isRange: boolean;          // True if this is a range reference (e.g., A2:A10)
  rangeEnd?: ParsedCellRef;  // End of range if isRange is true
}

/**
 * Result of formula conversion
 */
export interface ConversionResult {
  gristFormula: string;
  success: boolean;
  warnings: string[];
  originalFormula: string;
}

/**
 * Main converter class for Excel to Grist formula conversion
 */
export class CellReferenceConverter {
  private columnMap: Map<string, string>;  // Excel letter -> Grist column ID
  private tableName: string;

  /**
   * @param columns Excel column metadata from ExcelFormulaParser
   * @param tableName Name of the Grist table for range references
   */
  constructor(columns: ExcelColumnData[], tableName: string = 'Table1') {
    this.tableName = tableName;
    this.columnMap = new Map();

    // Build column mapping
    columns.forEach(col => {
      this.columnMap.set(col.letter, col.name);
    });
  }

  /**
   * Convert an Excel formula to Grist syntax
   * @param excelFormula Excel formula (without leading =)
   * @returns Conversion result with Grist formula
   */
  convertFormula(excelFormula: string): ConversionResult {
    const warnings: string[] = [];

    try {
      // Remove leading = if present
      const formula = excelFormula.startsWith('=') ? excelFormula.substring(1) : excelFormula;

      // Convert the formula
      let gristFormula = this.processFormula(formula, warnings);

      return {
        gristFormula,
        success: true,
        warnings,
        originalFormula: excelFormula,
      };
    } catch (error) {
      return {
        gristFormula: '',
        success: false,
        warnings: [`Conversion failed: ${error}`],
        originalFormula: excelFormula,
      };
    }
  }

  /**
   * Process and convert a formula string
   * @param formula Formula to convert
   * @param warnings Array to collect warnings
   * @returns Converted formula
   */
  private processFormula(formula: string, warnings: string[]): string {
    // Pattern to match cell references and ranges
    // Matches: A2, $A$2, A$2, $A2, A2:B10, A:A, $A:$A, etc.
    const cellRefPattern = /(\$?[A-Z]+\$?\d*):(\$?[A-Z]+\$?\d*)|(\$?[A-Z]+\$?\d+)/g;

    let result = formula.replace(cellRefPattern, (match, rangeStart, rangeEnd, singleRef) => {
      try {
        if (rangeStart && rangeEnd) {
          // This is a range reference (A2:B10)
          return this.convertRangeReference(rangeStart, rangeEnd, warnings);
        } else if (singleRef) {
          // This is a single cell reference (A2)
          const parsed = this.parseCellRef(singleRef);
          return this.convertToGrist(parsed, warnings);
        }
        return match;
      } catch (error) {
        warnings.push(`Failed to convert reference ${match}: ${error}`);
        return match;
      }
    });

    // Add spaces around operators for better readability
    result = this.formatOperators(result);

    return result;
  }

  /**
   * Format operators by adding spaces around them
   * @param formula Formula to format
   * @returns Formatted formula with spaces around operators
   */
  private formatOperators(formula: string): string {
    // Add spaces around operators, being careful not to affect strings
    let result = formula;

    // Handle operators: +, -, *, /, &, =, <>, >=, <=, >, <
    // Note: We need to handle multi-character operators first

    // Handle comparison operators (be careful with order)
    result = result.replace(/([^<>!])>=([^=])/g, '$1 >= $2');  // >=
    result = result.replace(/([^<>!])<=([^=])/g, '$1 <= $2');  // <=
    result = result.replace(/([^<>!])<>([^=])/g, '$1 <> $2');  // <>

    // Handle single-character operators
    result = result.replace(/([^\s+])>([^\s=])/g, '$1 > $2');  // >
    result = result.replace(/([^\s+])<([^\s=>])/g, '$1 < $2'); // <
    result = result.replace(/([^\s*])=([^\s=])/g, '$1 = $2');  // =

    // Arithmetic operators
    result = result.replace(/([^\s])\+([^\s])/g, '$1 + $2');   // +
    result = result.replace(/([^\s])-([^\s])/g, '$1 - $2');    // -
    result = result.replace(/([^\s])\*([^\s])/g, '$1 * $2');   // *
    result = result.replace(/([^\s])\/([^\s])/g, '$1 / $2');   // /
    result = result.replace(/([^\s])&([^\s])/g, '$1 & $2');    // &

    return result;
  }

  /**
   * Parse an Excel cell reference
   * @param ref Cell reference string (e.g., "A2", "$B$5", "C$3")
   * @returns Parsed cell reference
   */
  parseCellRef(ref: string): ParsedCellRef {
    // Pattern: optional $, column letters, optional $, optional row number
    const pattern = /^(\$?)([A-Z]+)(\$?)(\d*)$/;
    const match = ref.match(pattern);

    if (!match) {
      throw new Error(`Invalid cell reference: ${ref}`);
    }

    const [, colDollar, column, rowDollar, rowStr] = match;

    return {
      column,
      row: rowStr ? parseInt(rowStr, 10) : undefined,
      isColumnAbsolute: colDollar === '$',
      isRowAbsolute: rowDollar === '$',
      isRange: false,
    };
  }

  /**
   * Convert a range reference to Grist syntax
   * @param startRef Start of range (e.g., "A2")
   * @param endRef End of range (e.g., "A10")
   * @param warnings Array to collect warnings
   * @returns Grist range reference
   */
  private convertRangeReference(startRef: string, endRef: string, warnings: string[]): string {
    const start = this.parseCellRef(startRef);
    const end = this.parseCellRef(endRef);

    // Check if it's a full column reference (A:A, B:B, etc.)
    if (!start.row && !end.row) {
      // Full column reference
      const columnName = this.getGristColumnName(start.column);
      if (!columnName) {
        warnings.push(`Unknown column: ${start.column}`);
        return `${this.tableName}.${start.column}`;
      }
      return `${this.tableName}.${columnName}`;
    }

    // Check if it's a same-column range (A2:A10)
    if (start.column === end.column) {
      const columnName = this.getGristColumnName(start.column);
      if (!columnName) {
        warnings.push(`Unknown column: ${start.column}`);
        return `${this.tableName}.${start.column}`;
      }

      // In Grist, to reference a column across all rows, use Table.ColumnName
      // For now, we'll convert ranges to full column references
      // TODO: Handle specific row ranges if needed
      if (start.isRowAbsolute && end.isRowAbsolute) {
        warnings.push(`Absolute row range ${startRef}:${endRef} converted to full column reference`);
      }

      return `${this.tableName}.${columnName}`;
    }

    // Multi-column range - not directly supported in Grist, warn the user
    warnings.push(`Multi-column range ${startRef}:${endRef} may require manual adjustment`);
    return `${startRef}:${endRef}`;  // Keep original for now
  }

  /**
   * Convert a parsed cell reference to Grist column reference
   * @param ref Parsed cell reference
   * @param warnings Array to collect warnings
   * @returns Grist column reference
   */
  private convertToGrist(ref: ParsedCellRef, warnings: string[]): string {
    const columnName = this.getGristColumnName(ref.column);

    if (!columnName) {
      warnings.push(`Unknown column: ${ref.column}`);
      return `$${ref.column}`;  // Fallback
    }

    // In Grist, we use $ColumnName to reference the current row's value
    // For absolute references, we might need special handling in the future
    if (ref.isRowAbsolute || ref.isColumnAbsolute) {
      // For now, we'll convert all references to relative column references
      // since Grist uses a different model (column-based vs cell-based)
      if (ref.isRowAbsolute && ref.row && ref.row > 1) {
        warnings.push(`Absolute row reference ${ref.column}${ref.row} converted to column reference`);
      }
    }

    return `$${columnName}`;
  }

  /**
   * Get Grist column name from Excel column letter
   * @param letter Excel column letter
   * @returns Grist column name
   */
  private getGristColumnName(letter: string): string | undefined {
    const columnName = this.columnMap.get(letter);
    if (!columnName) {
      return undefined;
    }

    // Sanitize column name for Python/Grist identifier rules
    return this.sanitizeColumnName(columnName);
  }

  /**
   * Sanitize a column name to be a valid Python identifier
   * @param name Column name
   * @returns Sanitized name
   */
  private sanitizeColumnName(name: string): string {
    // Replace spaces and special characters with underscores
    let sanitized = name.replace(/[^a-zA-Z0-9_]/g, '_');

    // Remove consecutive underscores
    sanitized = sanitized.replace(/__+/g, '_');

    // Remove leading/trailing underscores
    sanitized = sanitized.replace(/^_+|_+$/g, '');

    // Ensure it doesn't start with a number (must be after removing leading underscores)
    if (/^\d/.test(sanitized)) {
      sanitized = '_' + sanitized;
    }

    return sanitized || 'Column';
  }
}
