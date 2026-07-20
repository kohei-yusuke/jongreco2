import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * 結合テスト: スコアCRUD API
 * app/api/games/[id]/scores/route.ts GET/POST
 * next-auth と Prisma をモック。認証ガード・局番号採番・焼き鳥保存・整形を検証。
 */

const h = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  findMany: vi.fn(),
}));

vi.mock('next-auth', () => ({ getServerSession: h.getServerSession }));
vi.mock('@/app/api/auth/auth.config', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({
  default: {
    score: { findFirst: h.findFirst, create: h.create, findMany: h.findMany },
  },
}));

import { GET, POST } from '@/app/api/games/[id]/scores/route';

const ctx = { params: { id: 'g1' } };
const authed = { user: { id: 'u1', email: 'a@b.c' } };

function postReq(scores: unknown) {
  return new Request('http://localhost/api/games/g1/scores', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scores }),
  });
}

beforeEach(() => {
  h.getServerSession.mockReset();
  h.findFirst.mockReset();
  h.create.mockReset().mockImplementation(async (args: { data: Record<string, unknown> }) => ({ id: 's1', ...args.data }));
  h.findMany.mockReset();
});

describe('POST /api/games/[id]/scores', () => {
  it('未認証は 401', async () => {
    h.getServerSession.mockResolvedValue(null);
    const res = await POST(postReq({ east: 25000, south: 25000, west: 25000, north: 25000 }), ctx);
    expect(res.status).toBe(401);
    expect(h.create).not.toHaveBeenCalled();
  });

  it('初回は round=1 で作成', async () => {
    h.getServerSession.mockResolvedValue(authed);
    h.findFirst.mockResolvedValue(null);
    await POST(postReq({ east: 40000, south: 30000, west: 20000, north: 10000 }), ctx);
    const args = h.create.mock.calls[0][0] as { data: { round: number; east: number; gameId: string } };
    expect(args.data.round).toBe(1);
    expect(args.data.gameId).toBe('g1');
    expect(args.data.east).toBe(40000);
  });

  it('既存の最新局+1で採番', async () => {
    h.getServerSession.mockResolvedValue(authed);
    h.findFirst.mockResolvedValue({ round: 3 });
    await POST(postReq({ east: 25000, south: 25000, west: 25000, north: 25000 }), ctx);
    const args = h.create.mock.calls[0][0] as { data: { round: number } };
    expect(args.data.round).toBe(4);
  });

  it('焼き鳥はネスト create で保存', async () => {
    h.getServerSession.mockResolvedValue(authed);
    h.findFirst.mockResolvedValue(null);
    await POST(
      postReq({
        east: 40000, south: 30000, west: 20000, north: 10000,
        yakitori: { east: false, south: false, west: false, north: true },
      }),
      ctx,
    );
    const args = h.create.mock.calls[0][0] as {
      data: { yakitori?: { create: { north: boolean } } };
    };
    expect(args.data.yakitori?.create.north).toBe(true);
  });

  it('未入力の席は 0 で保存（|| 0）', async () => {
    h.getServerSession.mockResolvedValue(authed);
    h.findFirst.mockResolvedValue(null);
    await POST(postReq({ east: 40000 }), ctx);
    const args = h.create.mock.calls[0][0] as { data: { south: number } };
    expect(args.data.south).toBe(0);
  });
});

describe('GET /api/games/[id]/scores', () => {
  it('未認証は 401', async () => {
    h.getServerSession.mockResolvedValue(null);
    const res = await GET(new Request('http://localhost/api/games/g1/scores'), ctx);
    expect(res.status).toBe(401);
  });

  it('焼き鳥なしは全 false に整形', async () => {
    h.getServerSession.mockResolvedValue(authed);
    h.findMany.mockResolvedValue([
      { id: 's1', round: 1, east: 40000, south: 30000, west: 20000, north: 10000, yakitori: null },
    ]);
    const res = await GET(new Request('http://localhost/api/games/g1/scores'), ctx);
    const body = (await res.json()) as { scores: { yakitori: { north: boolean } }[] };
    expect(body.scores[0].yakitori).toEqual({ east: false, south: false, west: false, north: false });
  });

  it('焼き鳥ありはそのまま整形', async () => {
    h.getServerSession.mockResolvedValue(authed);
    h.findMany.mockResolvedValue([
      {
        id: 's1', round: 1, east: 40000, south: 30000, west: 20000, north: 10000,
        yakitori: { east: false, south: false, west: false, north: true },
      },
    ]);
    const res = await GET(new Request('http://localhost/api/games/g1/scores'), ctx);
    const body = (await res.json()) as { scores: { yakitori: { north: boolean } }[] };
    expect(body.scores[0].yakitori.north).toBe(true);
  });
});
