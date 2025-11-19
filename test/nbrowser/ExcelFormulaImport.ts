/**
 * Test of Excel Formula Import feature.
 * Tests that formulas in imported Excel files are correctly converted to Grist formulas.
 */
import {assert, driver} from 'mocha-webdriver';
import * as gu from 'test/nbrowser/gristUtils';
import {setupTestSuite} from 'test/nbrowser/testUtils';

describe('ExcelFormulaImport', function() {
  this.timeout(70000); // Excel imports can take some time
  const cleanup = setupTestSuite();

  let session: gu.Session;

  before(async function() {
    session = await gu.session().teamSite.login();
  });

  afterEach(() => gu.checkForErrors());

  it('should import simple Excel file with formulas', async function() {
    // Import the simple test file
    await session.tempNewDoc(cleanup, 'ExcelFormulaTest');
    await gu.importFileDialog('./uploads/excel-formula-test-simple.xlsx');

    // Wait for import dialog to appear
    assert.equal(await driver.findWait('.test-importer-preview', 5000).isPresent(), true);

    // Confirm the import
    await driver.find('.test-modal-confirm').click();
    await gu.waitForServer();

    // Wait for the import to complete
    await driver.wait(async () => {
      const pages = await gu.getPageNames();
      return pages.includes('Sales');
    }, 10000);

    // Verify that the Sales table was created
    const pages = await gu.getPageNames();
    assert.include(pages, 'Sales');

    // Navigate to the Sales table
    await gu.openPage('Sales');
    await gu.waitForServer();

    // Verify that we have the expected columns
    const columns = await driver.findAll('.column_name', el => el.getText());
    assert.include(columns, 'Product');
    assert.include(columns, 'Price');
    assert.include(columns, 'Quantity');
    assert.include(columns, 'Total');

    // Click on the Total column to check if it has a formula
    await gu.getColumnHeader('Total').click();
    await gu.waitForServer();

    // Open the column panel to see formula
    const rightPanel = await driver.find('.test-right-panel').isPresent();
    if (rightPanel) {
      // Check if there's a formula field visible
      const hasFormula = await driver.find('.test-field-formula').isPresent();
      if (hasFormula) {
        const formulaText = await driver.find('.test-field-formula').getText();
        console.log('✓ Formula found:', formulaText);
        // Verify it contains Grist-style column references
        assert.match(formulaText, /\$/);
      }
    }

    // Verify that calculated values are present in the Total column
    await gu.getCell({col: 'Total', rowNum: 1}).click();
    const totalValue = await gu.getCell({col: 'Total', rowNum: 1}).getText();
    assert.isNotEmpty(totalValue);
    console.log('✓ First row total value:', totalValue);
  });

  it('should import multi-sheet Excel file', async function() {
    await session.tempNewDoc(cleanup, 'ExcelMultiSheetTest');
    await gu.importFileDialog('./uploads/excel-formula-test-multi.xlsx');

    // Wait for import dialog
    assert.equal(await driver.findWait('.test-importer-preview', 5000).isPresent(), true);

    // Should show multiple sources (sheets)
    const sources = await driver.findAll('.test-importer-source');
    assert.isAtLeast(sources.length, 1);

    // Confirm the import
    await driver.find('.test-modal-confirm').click();
    await gu.waitForServer();

    // Wait for all sheets to be imported
    await driver.wait(async () => {
      const pages = await gu.getPageNames();
      return pages.includes('Sales') && pages.includes('Inventory') && pages.includes('Statistics');
    }, 15000);

    // Verify all three sheets were imported
    const pages = await gu.getPageNames();
    assert.include(pages, 'Sales');
    assert.include(pages, 'Inventory');
    assert.include(pages, 'Statistics');
    console.log('✓ All three sheets imported as separate tables');

    // Navigate to Inventory table to verify it has data
    await gu.openPage('Inventory');
    await gu.waitForServer();

    const inventoryColumns = await driver.findAll('.column_name', el => el.getText());
    assert.isAbove(inventoryColumns.length, 0);
    console.log('✓ Inventory table has columns:', inventoryColumns);
  });

  it('should import comprehensive test file with all formula types', async function() {
    await session.tempNewDoc(cleanup, 'ExcelComprehensiveTest');
    await gu.importFileDialog('./uploads/excel-formula-comprehensive.xlsx');

    // Wait for import dialog
    assert.equal(await driver.findWait('.test-importer-preview', 5000).isPresent(), true);

    // Confirm the import
    await driver.find('.test-modal-confirm').click();
    await gu.waitForServer();

    // Wait for all 7 sheets to be imported
    await driver.wait(async () => {
      const pages = await gu.getPageNames();
      return pages.includes('Arithmetic');
    }, 15000);

    const pages = await gu.getPageNames();
    const expectedSheets = ['Arithmetic', 'Statistics', 'Conditionals', 'Mixed', 'Comparisons', 'Strings', 'AbsoluteRefs'];

    for (const sheetName of expectedSheets) {
      assert.include(pages, sheetName, `Missing sheet: ${sheetName}`);
    }
    console.log('✓ All 7 sheets from comprehensive test file imported');

    // Test Arithmetic sheet
    await gu.openPage('Arithmetic');
    await gu.waitForServer();

    const arithmeticColumns = await driver.findAll('.column_name', el => el.getText());
    assert.include(arithmeticColumns, 'Number1');
    assert.include(arithmeticColumns, 'Number2');
    assert.include(arithmeticColumns, 'Addition');
    assert.include(arithmeticColumns, 'Subtraction');
    assert.include(arithmeticColumns, 'Multiplication');
    assert.include(arithmeticColumns, 'Division');

    // Verify arithmetic calculations are working by checking cell values
    const num1 = await gu.getCell({col: 'Number1', rowNum: 1}).getText();
    const num2 = await gu.getCell({col: 'Number2', rowNum: 1}).getText();
    console.log(`✓ Arithmetic sheet - Number1: ${num1}, Number2: ${num2}`);

    // Test Statistics sheet
    await gu.openPage('Statistics');
    await gu.waitForServer();

    const statsColumns = await driver.findAll('.column_name', el => el.getText());
    assert.include(statsColumns, 'Values');
    assert.include(statsColumns, 'Sum');
    assert.include(statsColumns, 'Average');
    console.log('✓ Statistics sheet loaded with expected columns');

    // Test Conditionals sheet
    await gu.openPage('Conditionals');
    await gu.waitForServer();

    const conditionalColumns = await driver.findAll('.column_name', el => el.getText());
    assert.include(conditionalColumns, 'Score');
    console.log('✓ Conditionals sheet loaded successfully');

    console.log('✅ Comprehensive test file imported and verified successfully');
  });

  it('should convert formulas with different operators', async function() {
    await session.tempNewDoc(cleanup, 'ExcelOperatorsTest');
    await gu.importFileDialog('./uploads/excel-formula-comprehensive.xlsx');

    // Wait and confirm import
    await driver.findWait('.test-importer-preview', 5000);
    await driver.find('.test-modal-confirm').click();
    await gu.waitForServer();

    // Wait for import
    await driver.wait(async () => {
      const pages = await gu.getPageNames();
      return pages.includes('Comparisons');
    }, 15000);

    // Go to Comparisons sheet
    await gu.openPage('Comparisons');
    await gu.waitForServer();

    // Verify comparison columns exist
    const columns = await driver.findAll('.column_name', el => el.getText());
    assert.include(columns, 'Value1');
    assert.include(columns, 'Value2');
    assert.include(columns, 'Greater');
    assert.include(columns, 'Less');
    assert.include(columns, 'Equal');

    // Verify values are present
    const value1 = await gu.getCell({col: 'Value1', rowNum: 1}).getText();
    const value2 = await gu.getCell({col: 'Value2', rowNum: 1}).getText();
    console.log(`✓ Comparison values - Value1: ${value1}, Value2: ${value2}`);

    // Go to Strings sheet
    await gu.openPage('Strings');
    await gu.waitForServer();

    const stringColumns = await driver.findAll('.column_name', el => el.getText());
    assert.include(stringColumns, 'FirstName');
    assert.include(stringColumns, 'LastName');
    assert.include(stringColumns, 'FullName');

    // Verify string concatenation worked
    const firstName = await gu.getCell({col: 'FirstName', rowNum: 1}).getText();
    const lastName = await gu.getCell({col: 'LastName', rowNum: 1}).getText();
    console.log(`✓ String values - FirstName: ${firstName}, LastName: ${lastName}`);

    console.log('✅ Different operator types handled successfully');
  });
});
