# CLAUDE.md — jongreco (麻雀スコア管理アプリ)

このファイルは Claude Code / 開発者向けのコンテキスト集です。作業前に必ず一読してください。

## 1. プロダクト概要

麻雀（4人打ち）の**成績・点数管理アプリ**。1半荘（ゲーム）ごとの最終持ち点を入力すると、
ウマ・オカ・返し点・焼き鳥・チップを加味した「精算得点（＋/−の点棒換算）」を計算し、
セッション（複数半荘）を通じた累計・順位・グラフを表示する。

- フレームワーク: **Next.js 13 (App Router)** + React 18 + TypeScript
- UI: **Bootstrap 5**（一部 react-bootstrap）+ Chart.js
- DB: **PostgreSQL** + Prisma
- 認証: NextAuth (credentials)

## 2. ドメインモデル（重要 — ここを外すと全部壊れる）

### 用語
| 用語 | 意味 | 既定値 |
|------|------|--------|
| 配給原点 initialPoints | 開始時の各自の持ち点 | 25,000 |
| 返し点 returnPoints | 精算基準点。差分×人数がオカ | 30,000 |
| ウマ uma1..4 | 順位ごとの加減点（**千点単位**、合計0が原則） | +10/+5/-5/-10 |
| オカ oka | (返し点 - 配給原点) × 4 / 1000。**1位が総取り** | (30000-25000)*4/1000 = +20 |
| 焼き鳥 yakitoriPoints | 1度も和了しなかった人のペナルティ（**素点単位**） | 6,000 |
| チップ chipPoints | チップ1枚の価値（素点単位） | 1,000 |

### 1半荘の精算式（`lib/score.ts` が唯一の実装）
```
順位 = 素点の降順（同点は席順 東>南>西>北 で上位）
各家 final = (rawPoints - returnPoints + yakitoriAdj) / 1000 + uma
1位のみ  final += oka
```
- **合計は理論上ゼロサム**（素点合計 = initialPoints×4、ウマ合計 = 0 のとき）。
- 素点合計が想定と違う入力は**バリデーションで弾く**（`validateRawScores`）。

### 焼き鳥（zero-sum な副次移動、素点単位）
- `distribution`: 焼き鳥者が各 `yakitoriPoints` を払い、非焼き鳥者で山分け。全員焼き鳥なら移動なし。
- `winner_takes_all`: 焼き鳥者が各 `yakitoriPoints` を払い、**1位が総取り**。

> ⚠️ `yakitoriMode` の enum は **`'distribution' | 'winner_takes_all'`** に統一。
> （旧コードには schema コメントの `"winner"` と modal の `"winner_takes_all"` が混在していた。）

### セッション累計
各半荘の final を席ごとに合計し、最後にチップ（`chipPoints × 枚数 / 1000`）を加算 → 総得点 → 順位。

## 3. スケール（桁）の約束 — バグの温床
- **入力欄は「百点棒」単位**。ユーザーが `250` と打つと素点 `25000`（×100）。UI に `00` サフィックス表示。
- **DB の Score.east/south/west/north は素点（例 25000）** で保存。
- final / uma / oka / チップ / 焼き鳥後の値は **千点単位（小数第1位）** で表示（例 `+45.0`）。
- `returnPoints`, `yakitoriPoints`, `chipPoints` は**素点単位**で保持し、割り算前に混ぜる。

## 4. ディレクトリ
```
app/
  page.tsx                     ランディング（ゲスト導線: /calc へ）
  calc/page.tsx                ★ 登録不要の点数計算ツール（完全クライアント / localStorage / DB不要）
  components/ThemeToggle.tsx    ライト/ダーク切替（localStorage + no-flashスクリプトは layout.tsx）
  games/[id]/score/            スコア入力ページ（本体・要ログイン）
    page.tsx
    components/
      ScoreInput.tsx           1半荘の入力＋その場計算
      ScoreHistory.tsx         履歴テーブル＋総得点＋順位
      ScoreGraph.tsx           局ごとの素点推移
      TotalScoreGraph.tsx      累計 final の推移
  api/games/[id]/scores/       スコアCRUD
  api/games/[id]/history/      対局履歴の確定（精算）
  dashboard/                   一覧
lib/
  score.ts                     ★ 精算ロジックの唯一の実装（ここだけ直す）
  score.test.ts                ★ Vitest テスト（C1/分岐網羅）
  prisma.ts
prisma/schema.prisma
```

## 5. 開発コマンド
```bash
npm run dev            # 開発サーバ
npm run build          # 本番ビルド（型チェック含む）
npm run lint           # ESLint
npm test               # Vitest（lib/score のロジックテスト）
npm run test:coverage  # カバレッジ（C1目標）
```
DB 接続（DATABASE_URL）が無いと API は動かないが、`lib/score.ts` のテストは**DB不要の純関数**。

## 6. 鉄則
1. **精算ロジックは絶対に `lib/score.ts` に集約する。** UI 側で式を再実装しない（過去の事故原因）。
2. スケール（×100 / ÷1000）を触るときは §3 を必ず確認。
3. `lib/score.ts` を変更したら `npm test` を必ず通す（分岐を1つ増やしたらテストも足す）。
4. ウマ二重加算・順位の再ソートは過去の重大バグ。final は「1回だけ」加算する。

## 7. テーマ（ライト/ダーク）
- トークンは `:root`（ライト）と `:root[data-theme="dark"]` / `@media (prefers-color-scheme: dark)` で定義（globals.css）。
- コンポーネントは必ず **CSS変数（--jr-*）経由**で色を参照する（色の直書き禁止＝ダークで破綻する）。
- 切替は `ThemeToggle` が `data-theme` と `data-bs-theme`（Bootstrap 5.3）を同時に設定。初期化は layout.tsx のインラインscript（FOUC防止）。

## 8b. ウマ・オカの自由設定
- **ウマ**: `ScoreSettings.uma`（順位1..4の千点単位配列）。合計0でゼロサム。
  - ゲスト計算ツール `/calc` … プリセット（5-10/10-20/なし）＋順位ごとの自由入力＋合計0チェック。
  - ログイン対局 … `GameSettingsModal` の uma1..4 で自由入力。
- **オカ**: 既定は自動計算 `(返し点 - 配給原点) × 4 / 1000`。
  - `ScoreSettings.okaOverride`（千点単位）を指定すると**手動オカ**として優先（`calcOka` 実装）。
  - `/calc` は「自動 / 手動」を切替可能。ログイン対局は返し点・配給原点で調整（DBに oka 列は未追加）。

## 9. リンク / 公開URL
| 種別 | URL | 補足 |
|------|-----|------|
| **本番（Vercel）** | https://jongreco2.vercel.app/ | 外部公開URL。ゲスト計算ツール: https://jongreco2.vercel.app/calc |
| デザインプレビュー(Artifact) | https://claude.ai/code/artifact/22ab2afc-c913-42d5-af4b-d9f508ff120e | スコア画面の新デザイン確認用の静的プレビュー |
| GitHub | git@github.com:kohei-yusuke/jongreco2.git | 作業ブランチ: `fix/scoring-logic-and-design`。Vercel が push で自動デプロイ |

> 2026-07-20 時点で本番URLは稼働中。新ランディング＋ゲスト計算ツール `/calc` が反映済みを確認（WebFetch）。
> ウマ/オカの自由設定は `/calc` の「ルール設定」パネル内（既定は折りたたみ）。

## 10. 既知の残課題（未修正／要確認）
- **middleware.ts のガードが実質無効**: `publicPaths` に `'/'` があり `pathname.startsWith('/')` が全パスにマッチするため、未ログインでも通過する（ページ側/API側の session チェックで実質保護）。ゲスト計算ツールにはむしろ好都合だが、厳密化するなら完全一致判定へ要修正（`token` cookie 名が NextAuth と不一致な点も注意、ロックアウト回避）。
- `src/app/` に create-next-app の残骸（`app/` と二重）。
- 認証まわりのメール送信・リセットは未検証。

詳細な調査結果とタスクは `BUGFIX_TASKS.md` 参照。
