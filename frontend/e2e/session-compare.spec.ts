import { test, expect } from '@playwright/test'

test.describe('session compare flow', () => {
  test.beforeEach(async ({ page }) => {
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
          {
            measurementId: 102,
            startTime: '2026-05-02T11:00:00',
            endTime: '2026-05-02T11:00:05',
            memo: 'R knee',
          },
        ]),
      }),
    )

    await page.route(/\/api\/v1\/measurements\/\d+\/data/, (route) => {
      const match = route
        .request()
        .url()
        .match(/\/measurements\/(\d+)\/data/)
      const id = Number(match?.[1] ?? 0)
      // distinct curves per id so the overlay chart legend is meaningful
      const offset = id * 0.1
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { timeOffsetMs: 0, kgValue: 0 },
          { timeOffsetMs: 100, kgValue: 5 + offset },
          { timeOffsetMs: 200, kgValue: 9 + offset },
        ]),
      })
    })
  })

  test('renders overlay chart + comparison table for two ids', async ({ page }) => {
    await page.goto('/sessions/compare?ids=101,102')
    await expect(page.getByRole('figure', { name: '세션 비교' })).toBeVisible()
    const table = page.getByRole('table', { name: '범례' })
    await expect(table).toBeVisible()
    // 2 rows (one per session)
    await expect(table.getByRole('row')).toHaveCount(3) // header + 2
  })

  test('renders too-few empty state for 1 id', async ({ page }) => {
    await page.goto('/sessions/compare?ids=101')
    await expect(page.getByText('비교할 세션이 부족합니다')).toBeVisible()
  })

  test('renders too-many empty state for >4 ids', async ({ page }) => {
    await page.goto('/sessions/compare?ids=1,2,3,4,5')
    await expect(page.getByText('최대 4개까지만 비교할 수 있습니다')).toBeVisible()
  })
})
