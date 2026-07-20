import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * 結合テスト: 対局確定API（精算→履歴保存）
 * app/api/games/[id]/history/route.ts POST
 * Prisma をモックし、lib/score による精算結果が正しく保存されるかを検証する。
 */

const h = vi.hoisted(() => ({
  findUnique: vi.fn(),
  upsert: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  default: {
    game: { findUnique: h.findUnique },
    $transaction: h.transaction,
  },
}));

import { POST } from '@/app/api/games/[id]/history/route';

const players = [
  { id: 'pE', position: 'east', name: 'あずま' },
  { id: 'pS', position: 'south', name: 'みなみ' },
  { id: 'pW', position: 'west', name: 'にし' },
  { id: 'pN', position: 'north', name: 'きた' },
];

const baseGame = {
  id: 'g1',
  initialPoints: 25000,
  returnPoints: 30000,
  uma1: 10, uma2: 5, uma3: -5, uma4: -10,
  yakitoriPoints: 6000,
  yakitoriEnabled: false,
  yakitoriMode: 'distribution',
  chipPoints: 1000,
  players,
};

function req(body: unknown) {
  return new Request('http://localhost/api/games/g1/history', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  h.findUnique.mockReset();
  h.upsert.mockReset().mockResolvedValue({ id: 'hist1', players: [] });
  h.transaction.mockReset().mockImplementation(async (cb: (tx: unknown) => unknown) =>
    cb({ gameHistory: { upsert: h.upsert } }),
  );
});

describe('POST /api/games/[id]/history（精算→保存）', () => {
  it('1半荘を正しく精算し totalScore(0.1点刻み×10) と順位を保存する', async () => {
    h.findUnique.mockResolvedValue({
      ...baseGame,
      scores: [{ east: 40000, south: 30000, west: 20000, north: 10000, yakitori: null }],
    });

    const res = await POST(req({ status: 'completed' }), { params: { id: 'g1' } });
    expect(res.status).toBe(200);

    // upsert に渡った players を取り出す
    const args = h.upsert.mock.calls[0][0] as {
      create: { players: { create: { playerId: string; totalScore: number; rank: number }[] } };
    };
    const saved = args.create.players.create;
    const byId = Object.fromEntries(saved.map((p) => [p.playerId, p]));

    // 東 +40.0 / 南 +5.0 / 西 -15.0 / 北 -30.0 → ×10 整数で保存
    expect(byId.pE).toMatchObject({ totalScore: 400, rank: 1 });
    expect(byId.pS).toMatchObject({ totalScore: 50, rank: 2 });
    expect(byId.pW).toMatchObject({ totalScore: -150, rank: 3 });
    expect(byId.pN).toMatchObject({ totalScore: -300, rank: 4 });

    // 合計はゼロサム
    expect(saved.reduce((a, p) => a + p.totalScore, 0)).toBe(0);
    // 順位昇順で保存
    expect(saved.map((p) => p.rank)).toEqual([1, 2, 3, 4]);
  });

  it('複数半荘の累計で保存される', async () => {
    h.findUnique.mockResolvedValue({
      ...baseGame,
      scores: [
        { east: 40000, south: 30000, west: 20000, north: 10000, yakitori: null },
        { east: 10000, south: 20000, west: 30000, north: 40000, yakitori: null },
      ],
    });

    await POST(req({ status: 'draft' }), { params: { id: 'g1' } });
    const args = h.upsert.mock.calls[0][0] as {
      create: { status: string; players: { create: { playerId: string; totalScore: number }[] } };
    };
    expect(args.create.status).toBe('draft');
    const total = args.create.players.create.reduce((a, p) => a + p.totalScore, 0);
    expect(total).toBe(0); // 2半荘でもゼロサム
  });

  it('焼き鳥を含めて精算する（ゼロサム維持）', async () => {
    h.findUnique.mockResolvedValue({
      ...baseGame,
      yakitoriEnabled: true,
      scores: [
        {
          east: 40000, south: 30000, west: 20000, north: 10000,
          yakitori: { east: false, south: false, west: false, north: true },
        },
      ],
    });
    await POST(req({ status: 'completed' }), { params: { id: 'g1' } });
    const args = h.upsert.mock.calls[0][0] as {
      create: { players: { create: { playerId: string; totalScore: number }[] } };
    };
    const total = args.create.players.create.reduce((a, p) => a + p.totalScore, 0);
    expect(total).toBe(0);
  });

  it('ゲームが無ければ 404', async () => {
    h.findUnique.mockResolvedValue(null);
    const res = await POST(req({ status: 'completed' }), { params: { id: 'nope' } });
    expect(res.status).toBe(404);
    expect(h.upsert).not.toHaveBeenCalled();
  });
});
