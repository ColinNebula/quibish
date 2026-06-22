const { test, expect } = require('@playwright/test');

test('app loads and renders chat shell on mobile', async ({ page }) => {
  await page.addInitScript(() => {
    const safeSet = (storage, key, value) => {
      try {
        storage.setItem(key, value);
      } catch (_) {
        // Ignore storage restrictions in some browser modes.
      }
    };

    const demoUser = {
      id: 'mobile-smoke-user',
      name: 'Mobile Smoke',
      username: 'mobilesmoke',
      email: 'mobile-smoke@example.com',
      avatar: null,
      theme: 'light'
    };

    safeSet(localStorage, 'quibish_remember_me', 'true');
    safeSet(localStorage, 'quibish_auth_token', 'mobile-smoke-token');
    safeSet(localStorage, 'quibish_user_data', JSON.stringify(demoUser));
    safeSet(sessionStorage, 'quibish-splash-seen', 'true');
  });

  await page.goto('/');

  await expect(page.locator('.pro-layout').first()).toBeVisible({ timeout: 30000 });
  await expect(page.locator('body')).not.toBeEmpty();
});

test('app shows login fallback on mobile when unauthenticated', async ({ page }) => {
  await page.addInitScript(() => {
    const safeRemove = (storage, key) => {
      try {
        storage.removeItem(key);
      } catch (_) {
        // Ignore storage restrictions in some browser modes.
      }
    };

    const safeSet = (storage, key, value) => {
      try {
        storage.setItem(key, value);
      } catch (_) {
        // Ignore storage restrictions in some browser modes.
      }
    };

    safeRemove(localStorage, 'quibish_auth_token');
    safeRemove(localStorage, 'quibish_user_data');
    safeRemove(sessionStorage, 'quibish_auth_token');
    safeRemove(sessionStorage, 'quibish_user_data');
    safeSet(sessionStorage, 'quibish-splash-seen', 'true');
  });

  await page.goto('/');

  await expect(page.locator('.login-container').first()).toBeVisible({ timeout: 30000 });
  await expect(page.getByText('Welcome Back').first()).toBeVisible();
});
