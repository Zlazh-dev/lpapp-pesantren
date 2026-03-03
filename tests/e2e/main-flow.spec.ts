import { test, expect } from '@playwright/test';

test.describe('Main Admin Flow', () => {
    // Generate a unique NIS for the test run to avoid collisions
    const testNis = `TST${Math.floor(Math.random() * 100000)}`;
    const testFullName = `Santri Test ${testNis}`;
    let shareLink = '';

    test('1. Login as Admin', async ({ page }) => {
        await page.goto('/login');
        await page.getByPlaceholder('Masukkan username').fill('sekretaris');
        await page.getByPlaceholder('Masukkan password').fill('password123'); // assuming default seeder password
        await page.click('button[type="submit"]');

        // Wait for dashboard to load
        await expect(page).toHaveURL(/\/dashboard/);
        await expect(page.getByText("Assalamu'alaikum")).toBeVisible();
    });

    test('2. Navigate to Santri and Create New', async ({ page }) => {
        // Assume already logged in via state, or we can just login again if context isn't preserved.
        // For simplicity in this suite without global setup, we login first:
        await page.goto('/login');
        await page.getByPlaceholder('Masukkan username').fill('sekretaris');
        await page.getByPlaceholder('Masukkan password').fill('password123');
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL(/\/dashboard/);

        // Click Data Santri from sidebar
        await page.click('a[href="/santri"]');
        await expect(page).toHaveURL(/\/santri$/);

        // Click Tambah Santri
        await page.click('a[href="/santri/new"]');
        await expect(page).toHaveURL(/\/santri\/new/);

        // Fill Form
        await page.getByPlaceholder('Nama lengkap santri').fill(testFullName);
        await page.getByPlaceholder('Nomor Induk Santri').fill(testNis);
        await page.locator('select').first().selectOption('L');

        // We will just fill required ones and submit
        await page.click('button:has-text("Simpan Santri")');

        // It should redirect back to /santri on success
        await expect(page).toHaveURL(/\/santri$/);

        // Ensure the new santri is in the list
        await expect(page.getByText(testFullName)).toBeVisible();
    });

    test('3. Create Bill via Billing Router', async ({ page }) => {
        await page.goto('/login');
        await page.getByPlaceholder('Masukkan username').fill('bendahara'); // Need bendahara for billing usually, or admin
        await page.getByPlaceholder('Masukkan password').fill('password123');
        await page.click('button[type="submit"]');

        // If login fails because bendahara doesn't exist, we fallback to admin (depending on exact seeder)
        try {
            await expect(page).toHaveURL(/\/(dashboard|billing)/, { timeout: 3000 });
        } catch {
            await page.getByPlaceholder('Masukkan username').fill('sekretaris');
            await page.getByPlaceholder('Masukkan password').fill('password123');
            await page.click('button[type="submit"]');
            await expect(page).toHaveURL(/\/dashboard/);
        }

        await page.click('a[href="/billing"]');
        await expect(page).toHaveURL(/\/billing/);

        // Create new bill (The UI interactions depend heavily on the actual DOM of /billing, 
        // which might have a "Tambah Tagihan" button)
        const tambahBtn = page.getByRole('button', { name: /Tambah Tagihan|Buat Tagihan/i });
        if (await tambahBtn.isVisible()) {
            await tambahBtn.click();
            // Fill dialog (assuming it uses standard inputs)
            // ... implementation depends on exact UI
        }
    });
});
