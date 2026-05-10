import { test, expect } from '@playwright/test'

test('home renders AppShell with dashboard heading', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('대시보드')
  await expect(page.getByRole('link', { name: '환자' })).toBeVisible()
})

test('nav: Patients link routes to /patients with proper heading', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: '환자' }).click()
  await expect(page).toHaveURL(/\/patients$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('환자 목록')
})

test('unknown URL renders 404 page with home link', async ({ page }) => {
  await page.goto('/this/does/not/exist')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('찾을 수 없습니다')
  await expect(page.getByRole('link', { name: /홈으로/ })).toBeVisible()
})

test('skip link is first focusable on the page', async ({ page }) => {
  await page.goto('/')
  await page.keyboard.press('Tab')
  // The skip link is the first focusable element; it should match the
  // active element after one Tab from page load.
  const focusedText = await page.evaluate(() => document.activeElement?.textContent ?? '')
  expect(focusedText.trim()).toBe('본문으로 건너뛰기')
})
