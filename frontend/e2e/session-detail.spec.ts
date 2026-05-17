import { test, expect } from '@playwright/test'

test.describe('session detail end-to-end flow', () => {
  test.beforeEach(async ({ page }) => {
    // Stub the entire wire contract — same shapes as the MSW handler hub
    // used in unit tests. Playwright's page.route runs in the browser
    // process so MSW (Node-only in our setup) does not apply here.
    await page.route('**/api/v1/patients', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 1,
            patientId: 'p001',
            name: '테스트환자A',
            age: 30,
            sex: 'male',
            height: 175,
            weight: 70,
          },
        ]),
      }),
    )

    await page.route('**/api/v1/patients/p001/measurements', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            measurementId: 101,
            startTime: '2026-05-01T10:30:00',
            endTime: '2026-05-01T10:30:05',
            memo: 'L knee',
          },
        ]),
      }),
    )

    await page.route('**/api/v1/measurements/101/data', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { timeOffsetMs: 0, kgValue: 0 },
          { timeOffsetMs: 50, kgValue: 1.5 },
          { timeOffsetMs: 100, kgValue: 4.2 },
          { timeOffsetMs: 200, kgValue: 9.1 },
          { timeOffsetMs: 300, kgValue: 6.0 },
        ]),
      }),
    )
  })

  test('navigates patient → session → chart + stats + CSV', async ({ page }) => {
    await page.goto('/patients')
    await expect(page.getByRole('link', { name: 'p001' })).toBeVisible()
    await page.getByRole('link', { name: 'p001' }).click()

    await expect(page.getByRole('heading', { level: 1, name: '테스트환자A' })).toBeVisible()

    // The session timeline link points at the session-detail route.
    const sessionLink = page.getByRole('link', { name: /L knee/ })
    await expect(sessionLink).toBeVisible()
    await sessionLink.click()

    await expect(page).toHaveURL(/\/patients\/p001\/sessions\/101$/)
    await expect(page.getByRole('heading', { level: 1 })).toContainText('테스트환자A')

    // ForceChart renders a canvas inside a role=figure region.
    await expect(page.getByRole('figure', { name: '힘 (N)' })).toBeVisible()
    // SummaryStats labels (exact: true because '피크' is a substring of
    // '피크 도달 시간' and would otherwise hit strict-mode violation).
    await expect(page.getByText('피크', { exact: true })).toBeVisible()
    await expect(page.getByText('면적 (Impulse)')).toBeVisible()
    // CSV button enabled because there are data points.
    await expect(page.getByRole('button', { name: 'CSV 내려받기' })).toBeEnabled()
  })

  test('invalid session id renders not-found EmptyState', async ({ page }) => {
    await page.goto('/patients/p001/sessions/abc')
    await expect(page.getByText('세션을 찾을 수 없습니다')).toBeVisible()
  })
})
