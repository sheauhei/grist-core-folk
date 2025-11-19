/**
 * Script to generate a multi-sheet Excel file with formulas for testing
 * Run with: node test/fixtures/excel-formula-test-multi.js
 */

const ExcelJS = require('exceljs');
const path = require('path');

async function createMultiSheetTestFile() {
  const workbook = new ExcelJS.Workbook();

  // Sheet 1: Sales Data
  const salesSheet = workbook.addWorksheet('Sales');
  salesSheet.getRow(1).values = ['Product', 'Price', 'Quantity', 'Total'];

  const salesData = [
    { product: 'Laptop', price: 1000, quantity: 2 },
    { product: 'Mouse', price: 25, quantity: 5 },
    { product: 'Keyboard', price: 75, quantity: 3 },
  ];

  salesData.forEach((item, index) => {
    const rowNum = index + 2;
    salesSheet.getCell(`A${rowNum}`).value = item.product;
    salesSheet.getCell(`B${rowNum}`).value = item.price;
    salesSheet.getCell(`C${rowNum}`).value = item.quantity;
    salesSheet.getCell(`D${rowNum}`).value = { formula: `B${rowNum}*C${rowNum}`, result: item.price * item.quantity };
  });

  // Sheet 2: Inventory
  const inventorySheet = workbook.addWorksheet('Inventory');
  inventorySheet.getRow(1).values = ['Item', 'Stock', 'Min Stock', 'Need Reorder'];

  const inventoryData = [
    { item: 'Laptop', stock: 15, minStock: 10 },
    { item: 'Mouse', stock: 5, minStock: 20 },
    { item: 'Keyboard', stock: 8, minStock: 15 },
  ];

  inventoryData.forEach((item, index) => {
    const rowNum = index + 2;
    inventorySheet.getCell(`A${rowNum}`).value = item.item;
    inventorySheet.getCell(`B${rowNum}`).value = item.stock;
    inventorySheet.getCell(`C${rowNum}`).value = item.minStock;
    inventorySheet.getCell(`D${rowNum}`).value = {
      formula: `IF(B${rowNum}<C${rowNum}, "Yes", "No")`,
      result: item.stock < item.minStock ? "Yes" : "No"
    };
  });

  // Sheet 3: Statistics
  const statsSheet = workbook.addWorksheet('Statistics');
  statsSheet.getRow(1).values = ['Metric', 'Value'];

  statsSheet.getCell('A2').value = 'Total Sales';
  statsSheet.getCell('B2').value = { formula: 'SUM(Sales!D:D)', result: 2350 };

  statsSheet.getCell('A3').value = 'Average Price';
  statsSheet.getCell('B3').value = { formula: 'AVERAGE(Sales!B:B)', result: 366.67 };

  statsSheet.getCell('A4').value = 'Max Quantity';
  statsSheet.getCell('B4').value = { formula: 'MAX(Sales!C:C)', result: 5 };

  // Save file
  const outputPath = path.join(__dirname, 'excel-formula-test-multi.xlsx');
  await workbook.xlsx.writeFile(outputPath);
  console.log(`Created: ${outputPath}`);
  console.log('Sheet 1 (Sales): Formula in column D (B*C)');
  console.log('Sheet 2 (Inventory): Formula in column D (IF condition)');
  console.log('Sheet 3 (Statistics): Cross-sheet formulas (SUM, AVERAGE, MAX)');
}

createMultiSheetTestFile().catch(console.error);
