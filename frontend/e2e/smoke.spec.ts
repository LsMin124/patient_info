import { test, expect } from '@playwright/test'

test('Phase 0 smoke: app renders root heading', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Hello, Patient Info')
})
