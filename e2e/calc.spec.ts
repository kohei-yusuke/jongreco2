import { test, expect } from '@playwright/test';

// チュートリアルの自動表示のみ抑止（各テストは Playwright が新規コンテキストで隔離）。
// ※ ここで calc データを消すと reload 時の永続テストが壊れるため消さない。
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('jongreco.calc.tour.v1', '1');
    } catch {
      /* noop */
    }
  });
});

test.describe('ゲスト点数計算 /calc', () => {
  test('百点棒入力 → 精算 → 記録追加 → 永続', async ({ page }) => {
    await page.goto('/calc');

    // 百点棒で入力（420 → 42,000点）。合計 100,000。
    await page.getByLabel(/東家の点数/).fill('420');
    await page.getByLabel(/南家の点数/).fill('300');
    await page.getByLabel(/西家の点数/).fill('180');
    await page.getByLabel(/北家の点数/).fill('100');

    // 合計一致インジケータ
    await expect(page.getByText('✓ 一致')).toBeVisible();

    // 精算プレビュー：東 +42.0 / 南 +5.0 / 西 -17.0 / 北 -30.0（ウマ10-5, オカ20）
    await expect(page.getByText('+42.0')).toBeVisible();
    await expect(page.getByText('+5.0')).toBeVisible();
    await expect(page.getByText('-17.0')).toBeVisible();
    await expect(page.getByText('-30.0')).toBeVisible();

    // 記録に追加 → 総得点行に反映
    await page.getByRole('button', { name: /記録に追加/ }).click();
    await expect(page.locator('tfoot')).toContainText('総得点');
    await expect(page.locator('tfoot')).toContainText('+42.0');
    await expect(page.locator('tfoot')).toContainText('🥇');

    // リロードしても記録が残る（localStorage 永続）
    await page.reload();
    await expect(page.locator('tfoot')).toContainText('+42.0');
  });

  test('合計不一致だと警告（差分表示）', async ({ page }) => {
    await page.goto('/calc');
    await page.getByLabel(/東家の点数/).fill('420');
    await page.getByLabel(/南家の点数/).fill('300');
    await page.getByLabel(/西家の点数/).fill('180');
    await page.getByLabel(/北家の点数/).fill('50'); // 合計95,000
    await expect(page.getByText(/差分/)).toBeVisible();
  });

  test('五捨六入トグルで整数pt精算になる', async ({ page }) => {
    await page.goto('/calc');
    await page.getByRole('button', { name: /ルール設定/ }).click();
    await page.getByRole('button', { name: '10-20' }).click(); // ウマ 10-20
    await page.getByText('五捨六入で整数にする').click();

    // 端数のある素点: 42,700 / 30,000 / 18,000 / 9,300
    await page.getByLabel(/東家の点数/).fill('427');
    await page.getByLabel(/南家の点数/).fill('300');
    await page.getByLabel(/西家の点数/).fill('180');
    await page.getByLabel(/北家の点数/).fill('93');

    // 東 +53.0 / 南 +10.0 / 西 -22.0 / 北 -41.0（すべて整数）
    await expect(page.getByText('+53.0')).toBeVisible();
    await expect(page.getByText('+10.0')).toBeVisible();
    await expect(page.getByText('-22.0')).toBeVisible();
    await expect(page.getByText('-41.0')).toBeVisible();
  });
});
