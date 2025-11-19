/**
 * Script to generate a simple Excel file with formulas for testing
 * Run with: node test/fixtures/excel-formula-test-simple.js
 */

const ExcelJS = require('exceljs');
const path = require('path');

async function createSimpleTestFile() {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Sales');

  // Add headers
  worksheet.getRow(1).values = ['Product', 'Price', 'Quantity', 'Total', 'Tax Rate', 'Total with Tax'];

  // Add data rows
  const data = [
    { product: 'Laptop', price: 1000, quantity: 2, taxRate: 0.1 },
    { product: 'Mouse', price: 25, quantity: 5, taxRate: 0.1 },
    { product: 'Keyboard', price: 75, quantity: 3, taxRate: 0.1 },
    { product: 'Monitor', price: 300, quantity: 2, taxRate: 0.1 },
  ];

  data.forEach((item, index) => {
    const rowNum = index + 2;
    worksheet.getCell(`A${rowNum}`).value = item.product;
    worksheet.getCell(`B${rowNum}`).value = item.price;
    worksheet.getCell(`C${rowNum}`).value = item.quantity;
    worksheet.getCell(`D${rowNum}`).value = { formula: `B${rowNum}*C${rowNum}`, result: item.price * item.quantity };
    worksheet.getCell(`E${rowNum}`).value = item.taxRate;
    worksheet.getCell(`F${rowNum}`).value = { formula: `D${rowNum}*(1+E${rowNum})`, result: item.price * item.quantity * (1 + item.taxRate) };
  });

  // Save file
  const outputPath = path.join(__dirname, 'excel-formula-test-simple.xlsx');
  await workbook.xlsx.writeFile(outputPath);
  console.log(`Created: ${outputPath}`);
  console.log('Formulas in column D: B*C (Price * Quantity)');
  console.log('Formulas in column F: D*(1+E) (Total * (1 + Tax Rate))');
}

createSimpleTestFile().catch(console.error);
