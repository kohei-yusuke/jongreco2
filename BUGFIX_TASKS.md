# 調査結果とバグ修正タスク一覧

対象: jongreco（麻雀スコア管理アプリ）
方針: 一般的な麻雀ルールに準拠（ローカルルール無し）。ロジックとデザインを精査し強力に修正。

---

## A. 調査で判明した重大バグ（ロジック）

### A-1. 精算ロジックが3か所で別実装・全て食い違う ★最重要
- `ScoreInput.tsx` / `ScoreSummary.tsx`：1半荘の計算。焼き鳥は「一律 -ペナルティ」だけで**分配（受け取り側）を計算していない**。
- `ScoreHistory.tsx`：**ウマを二重加算**（`calculateScore` が内部でウマ加算 → `calculateTotalScores` でさらにウマ加算）。
  さらに **final 後の値で順位を再ソート**しており順位が変わりうる（順位は素点で決めるべき）。
  `finalScores` の `getUma(... ? idx+1 : 0)` は式が破綻（0位＝ウマ0になる分岐が発生）。
- `api/games/[id]/history/route.ts`：**素点を単純合計しているだけ**。ウマ・オカ・返し点・焼き鳥を一切考慮せず順位づけ。
  → 履歴に保存される順位・得点が画面表示と完全に別物。
- **対応**: `lib/score.ts` を単一の実装として新設し、全箇所を差し替え。

### A-2. オカが未実装
- どの実装も「1位 = 2〜4位の合計の符号反転」でゼロサムを取ろうとするが、オカ（返し点-配給原点の差×人数）を明示計算していない。
  素点合計が 100,000 でない不正入力を1位が吸収してしまう。
- **対応**: `oka = (returnPoints - initialPoints) * 4 / 1000` を1位に明示加算。入力時に素点合計を検証。

### A-3. 焼き鳥の分配でゼロ除算・全員焼き鳥の考慮漏れ
- `calculateYakitoriAdjustment` は `nonYakitoriPlayers = 0`（全員焼き鳥）で **0除算 → NaN/Infinity**。
- `winner_takes_all`（総取り）モードが計算側にほぼ未実装。
- **対応**: `lib/score.ts` で distribution / winner_takes_all を両方実装、全員焼き鳥は移動0でガード。

### A-4. yakitoriMode の enum 不一致
- schema コメント: `"distribution" | "winner"` / modal: `'distribution' | 'winner_takes_all'`。
- **対応**: `'distribution' | 'winner_takes_all'` に統一。game 作成時に保存漏れ（`yakitoriMode` を create data に含めていない）も修正。

### A-5. グラフ2つが同一内容
- `ScoreGraph`（スコア推移）と `TotalScoreGraph`（累計得点推移）が**どちらも素点の累計**を描画。
- **対応**: ScoreGraph = 各半荘の final（増減）、TotalScoreGraph = final の累計、に分離。

### A-6. 対局作成の経路不整合
- `GameHistoryList.handleGameStart` は players を**オブジェクト**で送るが、`api/games/route.ts` は**配列**を期待。
- `players.map(... isCurrentUser)` は Player モデルに無いカラムを書き込み → Prisma エラー。
- 重複チェックが `player.userId` を見るが型定義は `player.id`。
- **対応**: 送信・検証・保存を配列ベースに統一、`isCurrentUser` を除去、`yakitoriMode` を保存。

### A-7. GameHistoryList の得点表示
- `calculateFinalScore` は存在しない `history.game.settings` / `history.game.yakitoriPlayers` を参照（型に無い）＝デッドコード。
- 実表示は `player.totalScore`（＝A-1の素点合計）をそのまま「点」表示。
- **対応**: history route で final を正しく保存 → 一覧はそれを千点単位で表示。

## B. 調査で判明したバグ（軽微・UX・データ）

- B-1. `ScoreInput` の `getRank` は未使用かつ `indexOf(score)` が別スケールで機能不全（削除）。
- B-2. `console.log('Players:', players)` などデバッグログが残存（削除）。
- B-3. 素点入力に**合計チェックが無い**（100,000 にならなくても登録可）。
- B-4. ウマ合計が0でない設定を許容（ゼロサムが崩れる）。
- B-5. スコア削除後に round を decrement しているが、round は「半荘の連番」なので概ね妥当。ただし createdAt 基準の採番と混在。
- B-6. `src/app/` に create-next-app 残骸（`app/` と二重ルート）。
- B-7. デッドコンポーネント: `app/components/ScoreInput.tsx`, `app/components/ScoreTable.tsx`,
  `score/components/ScoreSummary.tsx`, `score/components/ScoreSubmit.tsx`（どこからも import されない）。

## C. デザイン改善タスク

- C-1. スコア入力・履歴のカードUIを刷新（余白・タイポ・色・レスポンシブ）。
- C-2. 順位バッジ、プラス/マイナスの配色、トップ王冠などを一貫化。
- C-3. `clamp()` 直書きの乱立を整理、共通スタイルへ。
- C-4. 総得点/順位行の視認性向上、モバイル最適化。

---

## D. 実行タスクリスト（進捗）

- [x] 1. 全体調査・バグ棚卸し
- [x] 2. CLAUDE.md / 本ドキュメント作成
- [x] 3. `lib/score.ts` 実装（単一の精算ロジック）
- [x] 4. Vitest 導入＋ `lib/score.test.ts`（**34件 / C1=分岐100%達成**）
- [x] 5. UI 各コンポーネントを `lib/score.ts` に差し替え（ScoreInput / ScoreHistory / 両グラフ / page）
- [x] 6. データ層バグ修正（history 精算 / games 作成の isCurrentUser・yakitoriMode / 一覧表示 / enum コメント）
- [x] 7. バリデーション追加（素点合計・ウマ合計・焼き鳥設定の不正制約撤廃）
- [x] 8. デザイン刷新（カード/バッジ/配色/レスポンシブ、グラフ2種の分離）
- [x] 9. デッドコード削除（ScoreSummary/ScoreSubmit/app配下ScoreInput・ScoreTable）・`tsc` クリーン・テスト緑

### 検証結果
- `npx tsc --noEmit` : エラー0
- `npm test` : 34 passed
- `npm run test:coverage` : lib/score.ts が **Stmts/Branch/Funcs/Lines すべて100%**
- リフレッシュ連携バグ（保存後に履歴/グラフが更新されない）も page の refreshToken で解消

## E. スコープ外（今回は触らない／要相談）
- 認証・メール送信・パスワードリセットの動作検証
- `src/app/` 残骸の完全整理（ルーティング影響確認が必要なため注意深く）
- DB マイグレーション（enum 値の実データ移行が必要な場合）
