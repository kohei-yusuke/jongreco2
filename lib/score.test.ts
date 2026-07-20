import { describe, it, expect } from 'vitest';
import {
  SEATS,
  round1,
  formatSigned,
  emptyYakitori,
  emptySeatNumbers,
  umaFromObject,
  rankSeats,
  calcOka,
  calcYakitoriAdjustments,
  calcRoundResult,
  calcRoundFinals,
  calcSessionTotals,
  expectedRawTotal,
  validateRawScores,
  umaSum,
  validateUma,
  toScoreSettings,
  type ScoreSettings,
  type SeatRecord,
  type ApiGameSettings,
} from './score';

// 標準設定: 25000持ち / 30000返し / ウマ 10-5 / 焼き鳥6000 / チップ1000
const base: ScoreSettings = {
  initialPoints: 25000,
  returnPoints: 30000,
  uma: [10, 5, -5, -10],
  yakitoriPoints: 6000,
  yakitoriEnabled: true,
  yakitoriMode: 'distribution',
  chipPoints: 1000,
};

const sumFinals = (r: SeatRecord<number>) =>
  round1(r.east + r.south + r.west + r.north);

describe('ユーティリティ', () => {
  it('round1: 誤差を潰し -0 を 0 にする', () => {
    expect(round1(1.24)).toBe(1.2);
    expect(round1(1.25)).toBe(1.3);
    expect(round1(-0.02)).toBe(0); // 0付近は +0 に正規化（-0でない）
    expect(Object.is(round1(-0.02), -0)).toBe(false);
    expect(round1(3)).toBe(3);
  });

  it('formatSigned: 正は+付き、0/負はそのまま', () => {
    expect(formatSigned(45)).toBe('+45.0');
    expect(formatSigned(-12.34)).toBe('-12.3');
    expect(formatSigned(0)).toBe('0.0');
  });

  it('empty ヘルパ', () => {
    expect(emptyYakitori()).toEqual({ east: false, south: false, west: false, north: false });
    expect(emptySeatNumbers()).toEqual({ east: 0, south: 0, west: 0, north: 0 });
  });

  it('umaFromObject: オブジェクト→配列', () => {
    expect(umaFromObject({ first: 10, second: 5, third: -5, fourth: -10 })).toEqual([10, 5, -5, -10]);
  });
});

describe('rankSeats（順位付け）', () => {
  it('素点の降順で順位が付く', () => {
    const ranks = rankSeats({ east: 40000, south: 30000, west: 20000, north: 10000 });
    expect(ranks).toEqual({ east: 1, south: 2, west: 3, north: 4 });
  });

  it('低い方が下位（逆順）', () => {
    const ranks = rankSeats({ east: 10000, south: 20000, west: 30000, north: 40000 });
    expect(ranks).toEqual({ east: 4, south: 3, west: 2, north: 1 });
  });

  it('同点は席順（東>南>西>北）で上位', () => {
    const ranks = rankSeats({ east: 25000, south: 25000, west: 25000, north: 25000 });
    expect(ranks).toEqual({ east: 1, south: 2, west: 3, north: 4 });
  });

  it('一部同点: 西と北が同点なら西が上', () => {
    const ranks = rankSeats({ east: 40000, south: 30000, west: 15000, north: 15000 });
    expect(ranks).toEqual({ east: 1, south: 2, west: 3, north: 4 });
  });
});

describe('calcOka（オカ）', () => {
  it('(返し-原点)*4/1000 = 20', () => {
    expect(calcOka(base)).toBe(20);
  });
  it('返し=原点ならオカ0', () => {
    expect(calcOka({ ...base, returnPoints: 25000 })).toBe(0);
  });
});

describe('calcYakitoriAdjustments（焼き鳥）', () => {
  const ranks = rankSeats({ east: 40000, south: 30000, west: 20000, north: 10000 });

  it('無効なら全員0', () => {
    const adj = calcYakitoriAdjustments(
      { east: true, south: false, west: false, north: false },
      ranks,
      { ...base, yakitoriEnabled: false },
    );
    expect(adj).toEqual(emptySeatNumbers());
  });

  it('焼き鳥0人なら全員0', () => {
    const adj = calcYakitoriAdjustments(emptyYakitori(), ranks, base);
    expect(adj).toEqual(emptySeatNumbers());
  });

  it('distribution: 1人焼き鳥 → 本人-6000、他3人で+2000ずつ（ゼロサム）', () => {
    const adj = calcYakitoriAdjustments(
      { east: false, south: false, west: false, north: true },
      ranks,
      base,
    );
    expect(adj.north).toBe(-6000);
    expect(adj.east).toBe(2000);
    expect(adj.south).toBe(2000);
    expect(adj.west).toBe(2000);
    expect(adj.east + adj.south + adj.west + adj.north).toBe(0);
  });

  it('distribution: 2人焼き鳥 → 各-6000、残り2人で+6000ずつ', () => {
    const adj = calcYakitoriAdjustments(
      { east: false, south: false, west: true, north: true },
      ranks,
      base,
    );
    expect(adj.west).toBe(-6000);
    expect(adj.north).toBe(-6000);
    expect(adj.east).toBe(6000);
    expect(adj.south).toBe(6000);
  });

  it('全員焼き鳥 → 受け手なしで移動なし（全員0）', () => {
    const adj = calcYakitoriAdjustments(
      { east: true, south: true, west: true, north: true },
      ranks,
      base,
    );
    expect(adj).toEqual(emptySeatNumbers());
  });

  it('winner_takes_all: 焼き鳥のペナルティを1位が総取り', () => {
    const settings = { ...base, yakitoriMode: 'winner_takes_all' as const };
    // east=1位, north が焼き鳥
    const adj = calcYakitoriAdjustments(
      { east: false, south: false, west: false, north: true },
      ranks,
      settings,
    );
    expect(adj.north).toBe(-6000);
    expect(adj.east).toBe(6000); // 1位が総取り
    expect(adj.south).toBe(0);
    expect(adj.west).toBe(0);
  });

  it('winner_takes_all: 1位自身が焼き鳥でも純額 pot-penalty', () => {
    const settings = { ...base, yakitoriMode: 'winner_takes_all' as const };
    // east=1位 かつ 焼き鳥、south も焼き鳥 → pot=12000
    const adj = calcYakitoriAdjustments(
      { east: true, south: true, west: false, north: false },
      ranks,
      settings,
    );
    expect(adj.east).toBe(-6000 + 12000); // 6000
    expect(adj.south).toBe(-6000);
    expect(adj.east + adj.south + adj.west + adj.north).toBe(0);
  });
});

describe('calcRoundResult（1半荘の精算）', () => {
  it('標準ケース: ゼロサム & 期待値通り', () => {
    const raw = { east: 40000, south: 30000, west: 20000, north: 10000 };
    const res = calcRoundResult(raw, emptyYakitori(), base);

    // 2位: (30000-30000)/1000 + 5 = 5.0
    expect(res.south.final).toBeCloseTo(5.0, 5);
    // 3位: (20000-30000)/1000 -5 = -15.0
    expect(res.west.final).toBeCloseTo(-15.0, 5);
    // 4位: (10000-30000)/1000 -10 = -30.0
    expect(res.north.final).toBeCloseTo(-30.0, 5);
    // 1位: (40000-30000)/1000 +10 +20(オカ) = 40.0
    expect(res.east.final).toBeCloseTo(40.0, 5);

    const total = res.east.final + res.south.final + res.west.final + res.north.final;
    expect(round1(total)).toBe(0);
    expect(res.east.rank).toBe(1);
    expect(res.east.oka).toBe(20);
    expect(res.south.oka).toBe(0);
  });

  it('焼き鳥込みでもゼロサム', () => {
    const raw = { east: 40000, south: 30000, west: 20000, north: 10000 };
    const res = calcRoundResult(
      raw,
      { east: false, south: false, west: false, north: true },
      base,
    );
    const total = res.east.final + res.south.final + res.west.final + res.north.final;
    expect(round1(total)).toBe(0);
    // 4位(north)は焼き鳥ペナルティ分さらにマイナス: -30.0 + (-6.0) = -36.0
    expect(res.north.final).toBeCloseTo(-36.0, 5);
  });

  it('SeatResult の中身が整合（uma/oka/yakitoriAdj/rawPoints）', () => {
    const raw = { east: 40000, south: 30000, west: 20000, north: 10000 };
    const res = calcRoundResult(raw, emptyYakitori(), base);
    expect(res.west.rank).toBe(3);
    expect(res.west.uma).toBe(-5);
    expect(res.west.rawPoints).toBe(20000);
    expect(res.west.yakitoriAdj).toBe(0);
  });
});

describe('calcRoundFinals', () => {
  it('final だけを席ごとに返す', () => {
    const raw = { east: 40000, south: 30000, west: 20000, north: 10000 };
    const finals = calcRoundFinals(raw, emptyYakitori(), base);
    expect(round1(finals.east)).toBe(40);
    expect(sumFinals(finals)).toBe(0);
  });
});

describe('calcSessionTotals（累計）', () => {
  it('複数半荘を累計しゼロサムを保つ', () => {
    const rows = [
      { raw: { east: 40000, south: 30000, west: 20000, north: 10000 } },
      { raw: { east: 10000, south: 20000, west: 30000, north: 40000 } },
    ];
    const { totals, ranks } = calcSessionTotals(rows, base);
    expect(sumFinals(totals)).toBe(0);
    // 1戦目 east +40 / 2戦目 east -30 = +10。north は逆で ... 東と北が同値になり得る
    expect(round1(totals.east)).toBe(round1(totals.north));
    // 順位は同点席順で決まる
    expect([ranks.east, ranks.south, ranks.west, ranks.north].sort()).toEqual([1, 2, 3, 4]);
  });

  it('yakitori 省略時は焼き鳥なし扱い', () => {
    const rows = [{ raw: { east: 40000, south: 30000, west: 20000, north: 10000 } }];
    const { totals } = calcSessionTotals(rows, base);
    expect(round1(totals.east)).toBe(40);
  });

  it('yakitori 明示指定を反映', () => {
    const rows = [
      {
        raw: { east: 40000, south: 30000, west: 20000, north: 10000 },
        yakitori: { east: false, south: false, west: false, north: true },
      },
    ];
    const { totals } = calcSessionTotals(rows, base);
    expect(round1(totals.north)).toBe(-36);
  });

  it('チップを加算（枚数×chipPoints/1000）', () => {
    const rows = [{ raw: { east: 40000, south: 30000, west: 20000, north: 10000 } }];
    const chips: SeatRecord<number> = { east: 3, south: 0, west: 0, north: -3 };
    const { totals } = calcSessionTotals(rows, base, chips);
    // east: 40 + 3*1000/1000 = 43, north: -30 + (-3) = -33
    expect(round1(totals.east)).toBe(43);
    expect(round1(totals.north)).toBe(-33);
  });

  it('空配列なら全員0', () => {
    const { totals } = calcSessionTotals([], base);
    expect(totals).toEqual(emptySeatNumbers());
  });
});

describe('バリデーション', () => {
  it('expectedRawTotal = 原点×4', () => {
    expect(expectedRawTotal(base)).toBe(100000);
  });

  it('validateRawScores: 合計一致でok', () => {
    const v = validateRawScores({ east: 40000, south: 30000, west: 20000, north: 10000 }, base);
    expect(v.ok).toBe(true);
    expect(v.diff).toBe(0);
  });

  it('validateRawScores: 合計不一致でng（diffも返す）', () => {
    const v = validateRawScores({ east: 40000, south: 30000, west: 20000, north: 5000 }, base);
    expect(v.ok).toBe(false);
    expect(v.actual).toBe(95000);
    expect(v.diff).toBe(-5000);
  });

  it('validateRawScores: 欠損席は0扱い（|| 0 分岐）', () => {
    const partial = { east: 100000, south: 0, west: 0 } as unknown as SeatRecord<number>;
    const v = validateRawScores(partial, base);
    expect(v.actual).toBe(100000);
    expect(v.ok).toBe(true);
  });

  it('umaSum / validateUma: 合計0でok', () => {
    expect(umaSum(base)).toBe(0);
    expect(validateUma(base)).toEqual({ ok: true, sum: 0 });
  });

  it('validateUma: 合計非0でng', () => {
    const bad = { ...base, uma: [10, 5, -5, -20] as [number, number, number, number] };
    expect(validateUma(bad)).toEqual({ ok: false, sum: -10 });
  });
});

describe('toScoreSettings（API設定→精算設定）', () => {
  it('ネストした uma / yakitori を正しく展開', () => {
    const api: ApiGameSettings = {
      uma: { first: 10, second: 5, third: -5, fourth: -10 },
      yakitori: 6000,
      initialPoints: 25000,
      returnPoints: 30000,
      chipPoints: 1000,
      chipEnabled: true,
      yakitoriEnabled: true,
      yakitoriMode: 'distribution',
    };
    expect(toScoreSettings(api)).toEqual(base);
  });
});

describe('SEATS 定数', () => {
  it('東南西北の順', () => {
    expect(SEATS).toEqual(['east', 'south', 'west', 'north']);
  });
});
