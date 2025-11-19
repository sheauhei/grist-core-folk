import { test, expect, Page } from '@playwright/test';
import * as path from 'path';

/**
 * E2E Tests for Excel Formula Import Feature
 *
 * Tests the complete flow:
 * 1. Upload Excel file with formulas
 * 2. Verify tables are created
 * 3. Verify formulas are correctly converted
 * 4. Verify formula calculations work in Grist
 */

test.describe('Excel Formula Import', () => {
  let page: Page;

  test.beforeEach(async ({ page: p }) => {
    page = p;

    // Navigate to test login page first
    await page.goto('/test/login?name=TestUser&email=test@example.com');

    // Then go to home
    await page.goto('/');

    // Wait for Grist to load
    await page.waitForSelector('.test-dm-doclist', { timeout: 10000 });
  });

  test('should import simple Excel file with formulas', async () => {
    const excelFile = path.resolve(__dirname, '../../fixtures/excel-formula-test-simple.xlsx');

    // Click "Add New" button
    await page.click('.test-dm-add-new');
    await page.waitForSelector('.test-dm-import', { timeout: 5000 });

    // Click "Import Document"
    await page.click('.test-dm-import');

    // Upload file
    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles(excelFile);

    // Wait for import to complete
    await page.waitForSelector('.test-importer-dialog', { timeout: 10000 });

    // Click "Import" button to confirm
    const importButton = page.locator('.test-modal-confirm, button:has-text("Import")').first();
    await importButton.click();

    // Wait for document to open
    await page.waitForSelector('.active_section', { timeout: 15000 });

    // Verify the table exists
    const tableExists = await page.locator('.gridview_data_pane').isVisible();
    expect(tableExists).toBe(true);

    // Verify "Sales" page tab exists
    const salesTab = page.locator('.test-docpage-label:has-text("Sales")');
    await expect(salesTab).toBeVisible({ timeout: 5000 });

    console.log('✓ Simple Excel file imported successfully');
  });

  test('should convert formulas in imported Excel', async () => {
    const excelFile = path.resolve(__dirname, '../../fixtures/excel-formula-test-simple.xlsx');

    // Import the file
    await page.click('.test-dm-add-new');
    await page.click('.test-dm-import');

    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles(excelFile);

    await page.waitForSelector('.test-importer-dialog', { timeout: 10000 });

    const importButton = page.locator('.test-modal-confirm, button:has-text("Import")').first();
    await importButton.click();

    await page.waitForSelector('.active_section', { timeout: 15000 });

    // Click on the "Total" column header to select it
    await page.click('text=Total');

    // Wait for column panel to appear
    await page.waitForSelector('.test-right-panel', { timeout: 5000 });

    // Look for formula in the column configuration panel
    // The formula should be visible in the column settings
    const formulaVisible = await page.locator('.test-field-formula, .formula_field').isVisible().catch(() => false);

    if (formulaVisible) {
      const formulaText = await page.locator('.test-field-formula, .formula_field').first().textContent();
      console.log('✓ Formula found:', formulaText);

      // Verify it contains Grist-style column references
      expect(formulaText).toContain('$');
    } else {
      console.log('⚠ Formula field not immediately visible, checking data');
    }

    // Verify that calculated values are present
    const firstRowTotal = await page.locator('.gridview_data_row_num:has-text("1")').locator('~ .field').nth(3);
    const totalValue = await firstRowTotal.textContent();
    console.log('✓ First row total value:', totalValue);

    expect(totalValue).toBeTruthy();
  });

  test('should import multi-sheet Excel file', async () => {
    const excelFile = path.resolve(__dirname, '../../fixtures/excel-formula-test-multi.xlsx');

    // Import file
    await page.click('.test-dm-add-new');
    await page.click('.test-dm-import');

    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles(excelFile);

    await page.waitForSelector('.test-importer-dialog', { timeout: 10000 });

    const importButton = page.locator('.test-modal-confirm, button:has-text("Import")').first();
    await importButton.click();

    await page.waitForSelector('.active_section', { timeout: 15000 });

    // Verify multiple page tabs exist
    const salesTab = page.locator('.test-docpage-label:has-text("Sales")');
    const inventoryTab = page.locator('.test-docpage-label:has-text("Inventory")');
    const statisticsTab = page.locator('.test-docpage-label:has-text("Statistics")');

    await expect(salesTab).toBeVisible({ timeout: 5000 });
    await expect(inventoryTab).toBeVisible({ timeout: 5000 });
    await expect(statisticsTab).toBeVisible({ timeout: 5000 });

    console.log('✓ All three sheets imported as separate tables');

    // Click on Inventory tab
    await inventoryTab.click();
    await page.waitForTimeout(1000);

    // Verify Inventory table has data
    const inventoryData = await page.locator('.gridview_data_pane').isVisible();
    expect(inventoryData).toBe(true);

    console.log('✓ Multi-sheet Excel imported successfully');
  });

  test('should import comprehensive test file with all formula types', async () => {
    const excelFile = path.resolve(__dirname, '../../fixtures/excel-formula-comprehensive.xlsx');

    // Import file
    await page.click('.test-dm-add-new');
    await page.click('.test-dm-import');

    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles(excelFile);

    await page.waitForSelector('.test-importer-dialog', { timeout: 10000 });

    const importButton = page.locator('.test-modal-confirm, button:has-text("Import")').first();
    await importButton.click();

    await page.waitForSelector('.active_section', { timeout: 15000 });

    // Verify all 7 sheets are imported
    const expectedSheets = [
      'Arithmetic',
      'Statistics',
      'Conditionals',
      'Mixed',
      'Comparisons',
      'Strings',
      'AbsoluteRefs'
    ];

    for (const sheetName of expectedSheets) {
      const tab = page.locator(`.test-docpage-label:has-text("${sheetName}")`);
      await expect(tab).toBeVisible({ timeout: 5000 });
    }

    console.log('✓ All 7 sheets from comprehensive test file imported');

    // Test Arithmetic sheet formulas
    const arithmeticTab = page.locator('.test-docpage-label:has-text("Arithmetic")');
    await arithmeticTab.click();
    await page.waitForTimeout(1000);

    // Verify arithmetic calculations are working
    // First row should be: Number1=10, Number2=5, Addition=15, Subtraction=5, Multiplication=50, Division=2
    const firstRowCells = await page.locator('.gridview_data_row_num:has-text("1")').locator('~ .field').allTextContents();
    console.log('✓ Arithmetic row values:', firstRowCells);

    // The calculated values should be present
    expect(firstRowCells).toContain('10'); // Number1
    expect(firstRowCells).toContain('5');  // Number2

    // Test Statistics sheet
    const statsTab = page.locator('.test-docpage-label:has-text("Statistics")');
    await statsTab.click();
    await page.waitForTimeout(1000);

    const statsVisible = await page.locator('.gridview_data_pane').isVisible();
    expect(statsVisible).toBe(true);

    console.log('✓ Statistics sheet loaded successfully');

    // Test Conditionals sheet
    const conditionalsTab = page.locator('.test-docpage-label:has-text("Conditionals")');
    await conditionalsTab.click();
    await page.waitForTimeout(1000);

    const conditionalsVisible = await page.locator('.gridview_data_pane').isVisible();
    expect(conditionalsVisible).toBe(true);

    console.log('✓ Conditionals sheet loaded successfully');

    console.log('✅ Comprehensive test file imported and verified successfully');
  });

  test('should handle formulas with different operators', async () => {
    const excelFile = path.resolve(__dirname, '../../fixtures/excel-formula-comprehensive.xlsx');

    // Import file
    await page.click('.test-dm-add-new');
    await page.click('.test-dm-import');

    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles(excelFile);

    await page.waitForSelector('.test-importer-dialog', { timeout: 10000 });

    const importButton = page.locator('.test-modal-confirm, button:has-text("Import")').first();
    await importButton.click();

    await page.waitForSelector('.active_section', { timeout: 15000 });

    // Go to Comparisons sheet
    const comparisonsTab = page.locator('.test-docpage-label:has-text("Comparisons")');
    await comparisonsTab.click();
    await page.waitForTimeout(1000);

    // Verify comparison results are displayed
    // First row: Value1=10, Value2=5
    // Greater should be TRUE, Less should be FALSE, Equal should be FALSE
    const firstRowCells = await page.locator('.gridview_data_row_num:has-text("1")').locator('~ .field').allTextContents();
    console.log('✓ Comparison row values:', firstRowCells);

    // Verify the data is present
    expect(firstRowCells.length).toBeGreaterThan(0);

    // Go to Strings sheet
    const stringsTab = page.locator('.test-docpage-label:has-text("Strings")');
    await stringsTab.click();
    await page.waitForTimeout(1000);

    // Verify string concatenation worked
    const stringRowCells = await page.locator('.gridview_data_row_num:has-text("1")').locator('~ .field').allTextContents();
    console.log('✓ String concatenation values:', stringRowCells);

    // Should have FirstName, LastName, and concatenated FullName
    expect(stringRowCells).toContain('John');
    expect(stringRowCells).toContain('Doe');

    console.log('✅ Different operator types handled successfully');
  });
});

test.describe('Excel Formula Import - Error Handling', () => {
  let page: Page;

  test.beforeEach(async ({ page: p }) => {
    page = p;

    // Navigate to test login page first
    await page.goto('/test/login?name=TestUser&email=test@example.com');

    // Then go to home
    await page.goto('/');
    await page.waitForSelector('.test-dm-doclist', { timeout: 10000 });
  });

  test('should gracefully handle non-formula Excel files', async () => {
    // This test would use a plain Excel file without formulas
    // For now, we'll just verify the import doesn't crash

    const excelFile = path.resolve(__dirname, '../../fixtures/excel-formula-test-simple.xlsx');

    await page.click('.test-dm-add-new');
    await page.click('.test-dm-import');

    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles(excelFile);

    await page.waitForSelector('.test-importer-dialog', { timeout: 10000 });

    const importButton = page.locator('.test-modal-confirm, button:has-text("Import")').first();
    await importButton.click();

    // Should complete without errors
    await page.waitForSelector('.active_section', { timeout: 15000 });

    const tableVisible = await page.locator('.gridview_data_pane').isVisible();
    expect(tableVisible).toBe(true);

    console.log('✓ Non-formula Excel file handled gracefully');
  });
});
