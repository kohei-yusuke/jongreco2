/**
 * lib/score.ts — 麻雀スコア精算ロジックの「唯一の実装」
 *
 * ここ以外の場所（UI / API）で精算式を再実装しないこと。
 * スケールの約束（CLAUDE.md §3）:
 *   - raw（素点）      : 例 25000。DB / この関数の入力。
 *   - returnPoints 等  : 素点単位（30000, 6000, 1000）。
 *   - final / uma / oka: 千点単位（小数第1位表示）。
 *
 * 一般的な麻雀ルールに準拠（ローカルルール無し）:
 *   順位 = 素点の降順（同点は席順 東>南>西>北 が上位）
 *   final = (raw - returnPoints + yakitoriAdj) / 1000 + uma  (+ oka は1位のみ)
 *   oka   = (returnPoints - initialPoints) * 4 / 1000
 *   素点合計 = initialPoints*4、ウマ合計 = 0 のとき、finalの合計はゼロサム。
 */

export type Seat = 'east' | 'south' | 'west' | 'north';

/** 席順（同点時の優先順位もこの順） */
export const SEATS: readonly Seat[] = ['east', 'south', 'west', 'north'];

export const SEAT_LABEL: Record<Seat, string> = {
  east: '東家',
  south: '南家',
  west: '西家',
  north: '北家',
};

export type YakitoriMode = 'distribution' | 'winner_takes_all';

export type SeatRecord<T> = Record<Seat, T>;

export interface ScoreSettings {
  /** 配給原点（開始持ち点） */
  initialPoints: number;
  /** 返し点（精算基準点） */
  returnPoints: number;
  /** 順位1..4のウマ（千点単位）。uma[0]が1位。 */
  uma: [number, number, number, number];
  /** 焼き鳥ペナルティ（素点単位） */
  yakitoriPoints: number;
  yakitoriEnabled: boolean;
  yakitoriMode: YakitoriMode;
  /** チップ1枚の価値（素点単位） */
  chipPoints: number;
}

export interface SeatResult {
  rank: number;
  rawPoints: number;
  /** ウマ（千点単位） */
  uma: number;
  /** オカ（千点単位）。1位のみ非0。 */
  oka: number;
  /** 焼き鳥調整（素点単位、ゼロサム） */
  yakitoriAdj: number;
  /** 最終精算得点（千点単位） */
  final: number;
}

export interface RoundInput {
  raw: SeatRecord<number>;
  yakitori?: SeatRecord<boolean>;
}

// ---------------------------------------------------------------------------
// 小さなユーティリティ
// ---------------------------------------------------------------------------

/** 小数第1位に丸める（浮動小数の誤差潰し＆表示用） */
export function round1(n: number): number {
  // -0 を 0 に正規化
  const r = Math.round(n * 10) / 10;
  return r === 0 ? 0 : r;
}

/** 符号付きで千点単位を表示（例: +45.0 / -12.3 / 0.0） */
export function formatSigned(n: number): string {
  const r = round1(n);
  return (r > 0 ? '+' : '') + r.toFixed(1);
}

export function emptyYakitori(): SeatRecord<boolean> {
  return { east: false, south: false, west: false, north: false };
}

export function emptySeatNumbers(): SeatRecord<number> {
  return { east: 0, south: 0, west: 0, north: 0 };
}

/** uma オブジェクト {first,second,third,fourth} を配列へ変換 */
export function umaFromObject(uma: {
  first: number;
  second: number;
  third: number;
  fourth: number;
}): [number, number, number, number] {
  return [uma.first, uma.second, uma.third, uma.fourth];
}

/** `/api/games/[id]` が返す settings の形。 */
export interface ApiGameSettings {
  uma: { first: number; second: number; third: number; fourth: number };
  /** 焼き鳥ペナルティ（素点単位） */
  yakitori: number;
  initialPoints: number;
  returnPoints: number;
  chipPoints: number;
  chipEnabled: boolean;
  yakitoriEnabled: boolean;
  yakitoriMode: YakitoriMode;
}

/** API の settings を精算用 ScoreSettings に変換。 */
export function toScoreSettings(s: ApiGameSettings): ScoreSettings {
  return {
    initialPoints: s.initialPoints,
    returnPoints: s.returnPoints,
    uma: umaFromObject(s.uma),
    yakitoriPoints: s.yakitori,
    yakitoriEnabled: s.yakitoriEnabled,
    yakitoriMode: s.yakitoriMode,
    chipPoints: s.chipPoints,
  };
}

// ---------------------------------------------------------------------------
// 順位付け
// ---------------------------------------------------------------------------

/**
 * 素点の降順で順位（1..4）を付ける。
 * 同点は席順（東>南>西>北）が上位。
 */
export function rankSeats(scores: SeatRecord<number>): SeatRecord<number> {
  const order = [...SEATS].sort((a, b) => {
    if (scores[b] !== scores[a]) return scores[b] - scores[a];
    return SEATS.indexOf(a) - SEATS.indexOf(b);
  });
  const ranks = {} as SeatRecord<number>;
  order.forEach((seat, index) => {
    ranks[seat] = index + 1;
  });
  return ranks;
}

// ---------------------------------------------------------------------------
// オカ
// ---------------------------------------------------------------------------

/** オカ（千点単位）。1位が総取りする。 */
export function calcOka(settings: ScoreSettings): number {
  return ((settings.returnPoints - settings.initialPoints) * 4) / 1000;
}

// ---------------------------------------------------------------------------
// 焼き鳥（ゼロサムの副次移動、素点単位）
// ---------------------------------------------------------------------------

/**
 * 焼き鳥調整（素点単位）を席ごとに返す。合計は常に0。
 * - 無効 / 焼き鳥0人 → 全員0
 * - distribution     : 焼き鳥者が各 yakitoriPoints 支払い、非焼き鳥者で山分け
 * - winner_takes_all : 焼き鳥者が各 yakitoriPoints 支払い、1位が総取り
 * - 全員焼き鳥        : 受け取り手が居ないため移動なし（全員0）
 */
export function calcYakitoriAdjustments(
  yakitori: SeatRecord<boolean>,
  ranks: SeatRecord<number>,
  settings: ScoreSettings,
): SeatRecord<number> {
  const adj = emptySeatNumbers();
  if (!settings.yakitoriEnabled) return adj;

  const yakSeats = SEATS.filter((s) => yakitori[s]);
  if (yakSeats.length === 0) return adj;

  const nonYakSeats = SEATS.filter((s) => !yakitori[s]);
  // 全員焼き鳥 → 移動なし
  if (nonYakSeats.length === 0) return adj;

  const pot = settings.yakitoriPoints * yakSeats.length;
  yakSeats.forEach((s) => {
    adj[s] -= settings.yakitoriPoints;
  });

  if (settings.yakitoriMode === 'winner_takes_all') {
    const firstSeat = SEATS.find((s) => ranks[s] === 1)!;
    adj[firstSeat] += pot;
  } else {
    const share = pot / nonYakSeats.length;
    nonYakSeats.forEach((s) => {
      adj[s] += share;
    });
  }

  return adj;
}

// ---------------------------------------------------------------------------
// 1半荘の精算
// ---------------------------------------------------------------------------

/** 1半荘の各家の精算結果を返す。 */
export function calcRoundResult(
  raw: SeatRecord<number>,
  yakitori: SeatRecord<boolean>,
  settings: ScoreSettings,
): SeatRecord<SeatResult> {
  const ranks = rankSeats(raw);
  const oka = calcOka(settings);
  const yakAdj = calcYakitoriAdjustments(yakitori, ranks, settings);

  const result = {} as SeatRecord<SeatResult>;
  SEATS.forEach((seat) => {
    const rank = ranks[seat];
    // rank は必ず 1..4、settings.uma は4要素タプルなので添字は常に有効
    const uma = settings.uma[rank - 1];
    const okaForSeat = rank === 1 ? oka : 0;
    const final =
      (raw[seat] - settings.returnPoints + yakAdj[seat]) / 1000 + uma + okaForSeat;
    result[seat] = {
      rank,
      rawPoints: raw[seat],
      uma,
      oka: okaForSeat,
      yakitoriAdj: yakAdj[seat],
      final,
    };
  });
  return result;
}

/** 1半荘の final だけを席ごとに返す簡易版。 */
export function calcRoundFinals(
  raw: SeatRecord<number>,
  yakitori: SeatRecord<boolean>,
  settings: ScoreSettings,
): SeatRecord<number> {
  const res = calcRoundResult(raw, yakitori, settings);
  return {
    east: res.east.final,
    south: res.south.final,
    west: res.west.final,
    north: res.north.final,
  };
}

// ---------------------------------------------------------------------------
// セッション累計
// ---------------------------------------------------------------------------

export interface SessionTotals {
  totals: SeatRecord<number>;
  ranks: SeatRecord<number>;
}

/**
 * 複数半荘の final を席ごとに合計し、チップを加算して総得点と順位を返す。
 * chipCounts は「枚数」（正負可）。得点への寄与は chipCounts * chipPoints / 1000。
 */
export function calcSessionTotals(
  rows: RoundInput[],
  settings: ScoreSettings,
  chipCounts?: SeatRecord<number>,
): SessionTotals {
  const totals = emptySeatNumbers();

  rows.forEach((row) => {
    const yak = row.yakitori ?? emptyYakitori();
    const finals = calcRoundFinals(row.raw, yak, settings);
    SEATS.forEach((s) => {
      totals[s] += finals[s];
    });
  });

  if (chipCounts) {
    SEATS.forEach((s) => {
      totals[s] += (chipCounts[s] * settings.chipPoints) / 1000;
    });
  }

  return { totals, ranks: rankSeats(totals) };
}

// ---------------------------------------------------------------------------
// バリデーション
// ---------------------------------------------------------------------------

/** 素点合計の期待値（= 配給原点 × 4） */
export function expectedRawTotal(settings: ScoreSettings): number {
  return settings.initialPoints * 4;
}

export interface RawScoreValidation {
  ok: boolean;
  actual: number;
  expected: number;
  diff: number;
}

/** 素点合計が配給原点×4 と一致するか検証。 */
export function validateRawScores(
  raw: SeatRecord<number>,
  settings: ScoreSettings,
): RawScoreValidation {
  const actual = SEATS.reduce((sum, seat) => sum + (raw[seat] || 0), 0);
  const expected = expectedRawTotal(settings);
  return { ok: actual === expected, actual, expected, diff: actual - expected };
}

/** ウマ合計（ゼロサムなら0であるべき）。 */
export function umaSum(settings: ScoreSettings): number {
  return settings.uma.reduce((a, b) => a + b, 0);
}

/** ウマ合計が0か検証。 */
export function validateUma(settings: ScoreSettings): { ok: boolean; sum: number } {
  const sum = umaSum(settings);
  return { ok: sum === 0, sum };
}
