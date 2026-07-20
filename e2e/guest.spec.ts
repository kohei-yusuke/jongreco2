import { test, expect } from '@playwright/test';

test.describe('ランディング', () => {
  test('トップから登録なしで計算ツールへ', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /点数計算、指先で完結/ })).toBeVisible();
    await page.getByRole('link', { name: /登録せずに計算する/ }).click();
    await expect(page).toHaveURL(/\/calc/);
  });
});

test.describe('テーマ切替', () => {
  test('ダーク/ライトを切り替えて保存される', async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem('jongreco.calc.tour.v1', '1');
      } catch {
        /* noop */
      }
    });
    await page.goto('/calc');
    const html = page.locator('html');
    const toggle = page.getByRole('button', { name: /モードに切替/ }).filter({ visible: true });

    const before = await html.getAttribute('data-theme');
    await toggle.click();
    const after = await html.getAttribute('data-theme');
    expect(after).not.toBe(before);

    // リロードしても維持
    await page.reload();
    expect(await html.getAttribute('data-theme')).toBe(after);
  });
});

test.describe('チュートリアル（非強制）', () => {
  test('初回表示 → スキップ後も入力可 → 使い方で再表示', async ({ page }) => {
    // 初回状態にする
    await page.addInitScript(() => {
      try {
        localStorage.removeItem('jongreco.calc.tour.v1');
      } catch {
        /* noop */
      }
    });
    await page.goto('/calc');

    const dialog = page.getByRole('dialog', { name: 'チュートリアル' });
    await expect(dialog).toBeVisible();
    await expect(page.getByText(/STEP 1 \/ 6/)).toBeVisible();

    // スキップで閉じられる（実行強制でない）
    await page.getByRole('button', { name: /スキップ/ }).click();
    await expect(dialog).toBeHidden();

    // 閉じた後、ルール設定を押さずとも入力できる
    await page.getByLabel(/東家の点数/).fill('250');
    await expect(page.getByLabel(/東家の点数/)).toHaveValue('250');

    // 「使い方」でいつでも再表示
    await page.getByRole('button', { name: '使い方' }).click();
    await expect(page.getByRole('dialog', { name: 'チュートリアル' })).toBeVisible();
  });
});
