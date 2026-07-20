import { defineConfig, devices } from '@playwright/test';

const PORT = 3100;
const BASE = `http://localhost:${PORT}`;

/**
 * E2E は「DBなしで動くゲスト面」を主対象にする:
 *  - /            ランディング
 *  - /calc        登録不要の点数計算ツール（精算ロジックの結合確認）
 *  - テーマ切替 / チュートリアル
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 7_000 },
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: BASE,
    trace: 'on-first-retry',
    locale: 'ja-JP',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    // Chromium ベースのモバイル端末（WebKit不要でレスポンシブを検証）
    { name: 'mobile', use: { ...devices['Pixel 5'] } },
  ],
  webServer: {
    command: `npm run dev -- -p ${PORT}`,
    url: BASE,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
