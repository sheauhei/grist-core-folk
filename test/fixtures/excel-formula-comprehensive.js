/**
 * Generate a comprehensive Excel file with various formula types for testing
 * This file tests all supported formula features in one place
 */

const ExcelJS = require('exceljs');
const path = require('path');

async function createComprehensiveTestFile() {
  const workbook = new ExcelJS.Workbook();

  // Sheet 1: Basic Arithmetic
  const arithmeticSheet = workbook.addWorksheet('Arithmetic');
  arithmeticSheet.getRow(1).values = ['Number1', 'Number2', 'Addition', 'Subtraction', 'Multiplication', 'Division'];

  const arithmeticData = [
    { n1: 10, n2: 5 },
    { n1: 20, n2: 4 },
    { n1: 15, n2: 3 },
  ];

  arithmeticData.forEach((data, index) => {
    const row = index + 2;
    arithmeticSheet.getCell(`A${row}`).value = data.n1;
    arithmeticSheet.getCell(`B${row}`).value = data.n2;
    arithmeticSheet.getCell(`C${row}`).value = { formula: `A${row}+B${row}`, result: data.n1 + data.n2 };
    arithmeticSheet.getCell(`D${row}`).value = { formula: `A${row}-B${row}`, result: data.n1 - data.n2 };
    arithmeticSheet.getCell(`E${row}`).value = { formula: `A${row}*B${row}`, result: data.n1 * data.n2 };
    arithmeticSheet.getCell(`F${row}`).value = { formula: `A${row}/B${row}`, result: data.n1 / data.n2 };
  });

  // Sheet 2: Statistical Functions
  const statsSheet = workbook.addWorksheet('Statistics');
  statsSheet.getRow(1).values = ['Values', 'Sum', 'Average', 'Min', 'Max', 'Count'];

  const values = [10, 20, 30, 40, 50];
  values.forEach((val, index) => {
    statsSheet.getCell(`A${index + 2}`).value = val;
  });

  // Add formulas in second row only (to test formula detection)
  statsSheet.getCell('B2').value = { formula: 'SUM(A:A)', result: 150 };
  statsSheet.getCell('C2').value = { formula: 'AVERAGE(A:A)', result: 30 };
  statsSheet.getCell('D2').value = { formula: 'MIN(A2:A6)', result: 10 };
  statsSheet.getCell('E2').value = { formula: 'MAX(A2:A6)', result: 50 };
  statsSheet.getCell('F2').value = { formula: 'COUNT(A:A)', result: 5 };

  // Fill other rows with the same formulas
  for (let row = 3; row <= 6; row++) {
    statsSheet.getCell(`B${row}`).value = { formula: 'SUM(A:A)', result: 150 };
    statsSheet.getCell(`C${row}`).value = { formula: 'AVERAGE(A:A)', result: 30 };
    statsSheet.getCell(`D${row}`).value = { formula: `MIN(A2:A6)`, result: 10 };
    statsSheet.getCell(`E${row}`).value = { formula: `MAX(A2:A6)`, result: 50 };
    statsSheet.getCell(`F${row}`).value = { formula: 'COUNT(A:A)', result: 5 };
  }

  // Sheet 3: Conditional Logic (IF)
  const conditionalSheet = workbook.addWorksheet('Conditionals');
  conditionalSheet.getRow(1).values = ['Score', 'Pass/Fail', 'Grade', 'Nested Condition'];

  const scores = [95, 75, 55, 40];
  scores.forEach((score, index) => {
    const row = index + 2;
    conditionalSheet.getCell(`A${row}`).value = score;

    // Simple IF
    conditionalSheet.getCell(`B${row}`).value = {
      formula: `IF(A${row}>=60, "Pass", "Fail")`,
      result: score >= 60 ? "Pass" : "Fail"
    };

    // Grade based on score
    conditionalSheet.getCell(`C${row}`).value = {
      formula: `IF(A${row}>=90, "A", IF(A${row}>=70, "B", IF(A${row}>=50, "C", "F")))`,
      result: score >= 90 ? "A" : score >= 70 ? "B" : score >= 50 ? "C" : "F"
    };

    // Nested with comparison
    conditionalSheet.getCell(`D${row}`).value = {
      formula: `IF(A${row}>80, "Excellent", IF(A${row}>60, "Good", "Needs Improvement"))`,
      result: score > 80 ? "Excellent" : score > 60 ? "Good" : "Needs Improvement"
    };
  });

  // Sheet 4: Mixed Operations
  const mixedSheet = workbook.addWorksheet('Mixed');
  mixedSheet.getRow(1).values = ['Price', 'Quantity', 'Discount Rate', 'Subtotal', 'Discount', 'Total'];

  const mixedData = [
    { price: 100, qty: 2, discount: 0.1 },
    { price: 50, qty: 5, discount: 0.15 },
    { price: 75, qty: 3, discount: 0.05 },
  ];

  mixedData.forEach((data, index) => {
    const row = index + 2;
    mixedSheet.getCell(`A${row}`).value = data.price;
    mixedSheet.getCell(`B${row}`).value = data.qty;
    mixedSheet.getCell(`C${row}`).value = data.discount;

    // Complex formulas with multiple references
    mixedSheet.getCell(`D${row}`).value = {
      formula: `A${row}*B${row}`,
      result: data.price * data.qty
    };
    mixedSheet.getCell(`E${row}`).value = {
      formula: `D${row}*C${row}`,
      result: data.price * data.qty * data.discount
    };
    mixedSheet.getCell(`F${row}`).value = {
      formula: `D${row}-E${row}`,
      result: data.price * data.qty * (1 - data.discount)
    };
  });

  // Sheet 5: Comparison Operators
  const comparisonSheet = workbook.addWorksheet('Comparisons');
  comparisonSheet.getRow(1).values = ['Value1', 'Value2', 'Greater', 'Less', 'Equal', 'GreaterEqual', 'LessEqual', 'NotEqual'];

  const comparisonData = [
    { v1: 10, v2: 5 },
    { v1: 5, v2: 10 },
    { v1: 7, v2: 7 },
  ];

  comparisonData.forEach((data, index) => {
    const row = index + 2;
    comparisonSheet.getCell(`A${row}`).value = data.v1;
    comparisonSheet.getCell(`B${row}`).value = data.v2;

    comparisonSheet.getCell(`C${row}`).value = {
      formula: `IF(A${row}>B${row}, "TRUE", "FALSE")`,
      result: data.v1 > data.v2 ? "TRUE" : "FALSE"
    };
    comparisonSheet.getCell(`D${row}`).value = {
      formula: `IF(A${row}<B${row}, "TRUE", "FALSE")`,
      result: data.v1 < data.v2 ? "TRUE" : "FALSE"
    };
    comparisonSheet.getCell(`E${row}`).value = {
      formula: `IF(A${row}=B${row}, "TRUE", "FALSE")`,
      result: data.v1 === data.v2 ? "TRUE" : "FALSE"
    };
    comparisonSheet.getCell(`F${row}`).value = {
      formula: `IF(A${row}>=B${row}, "TRUE", "FALSE")`,
      result: data.v1 >= data.v2 ? "TRUE" : "FALSE"
    };
    comparisonSheet.getCell(`G${row}`).value = {
      formula: `IF(A${row}<=B${row}, "TRUE", "FALSE")`,
      result: data.v1 <= data.v2 ? "TRUE" : "FALSE"
    };
    comparisonSheet.getCell(`H${row}`).value = {
      formula: `IF(A${row}<>B${row}, "TRUE", "FALSE")`,
      result: data.v1 !== data.v2 ? "TRUE" : "FALSE"
    };
  });

  // Sheet 6: String Operations
  const stringSheet = workbook.addWorksheet('Strings');
  stringSheet.getRow(1).values = ['FirstName', 'LastName', 'FullName', 'WithComma'];

  const names = [
    { first: 'John', last: 'Doe' },
    { first: 'Jane', last: 'Smith' },
    { first: 'Bob', last: 'Johnson' },
  ];

  names.forEach((name, index) => {
    const row = index + 2;
    stringSheet.getCell(`A${row}`).value = name.first;
    stringSheet.getCell(`B${row}`).value = name.last;

    stringSheet.getCell(`C${row}`).value = {
      formula: `A${row}&" "&B${row}`,
      result: `${name.first} ${name.last}`
    };
    stringSheet.getCell(`D${row}`).value = {
      formula: `B${row}&", "&A${row}`,
      result: `${name.last}, ${name.first}`
    };
  });

  // Sheet 7: Absolute References
  const absoluteSheet = workbook.addWorksheet('AbsoluteRefs');
  absoluteSheet.getRow(1).values = ['Value', 'Rate', 'Result'];

  absoluteSheet.getCell('B2').value = 0.1; // Tax rate

  const absData = [100, 200, 300];
  absData.forEach((val, index) => {
    const row = index + 2;
    absoluteSheet.getCell(`A${row}`).value = val;
    absoluteSheet.getCell(`C${row}`).value = {
      formula: `A${row}*$B$2`,
      result: val * 0.1
    };
  });

  // Save file
  const outputPath = path.join(__dirname, 'excel-formula-comprehensive.xlsx');
  await workbook.xlsx.writeFile(outputPath);

  console.log(`\n${'='.repeat(70)}`);
  console.log('Created comprehensive test file:', outputPath);
  console.log('='.repeat(70));
  console.log('\nSheets created:');
  console.log('1. Arithmetic       - Basic arithmetic operations (+, -, *, /)');
  console.log('2. Statistics       - Statistical functions (SUM, AVG, MIN, MAX, COUNT)');
  console.log('3. Conditionals     - IF functions (simple, nested, with comparisons)');
  console.log('4. Mixed            - Complex formulas with multiple references');
  console.log('5. Comparisons      - All comparison operators (>, <, =, >=, <=, <>)');
  console.log('6. Strings          - String concatenation (&)');
  console.log('7. AbsoluteRefs     - Absolute references ($B$2)');
  console.log('='.repeat(70));
}

createComprehensiveTestFile().catch(console.error);
