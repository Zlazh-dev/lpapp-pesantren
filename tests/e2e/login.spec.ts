import { test, expect } from '@playwright/test';

test('has title and login text', async ({ page }) => {
    await page.goto('/login');

    // Expect a title "to contain" a substring.
    await expect(page).toHaveTitle(/Pesantren Management/);

    // Expect the page to have the Login heading
    await expect(page.getByRole('heading', { name: 'Login ke Sistem' })).toBeVisible();
});

test('login requires credentials', async ({ page }) => {
    await page.goto('/login');

    // Click the sign in button without entering credentials
    await page.getByRole('button', { name: 'Masuk' }).click();

    // It shouldn't navigate away yet (html5 validation or error)
    await expect(page.url()).toContain('/login');
});
