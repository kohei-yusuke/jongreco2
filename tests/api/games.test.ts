import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * 結合テスト: 対局作成 API
 * app/api/games/route.ts POST
 * プレイヤー検証・重複チェック・作成データ（isCurrentUser除去 / yakitoriMode保存）を検証。
 */

const h = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  create: vi.fn(),
}));

vi.mock('next-auth', () => ({ getServerSession: h.getServerSession }));
vi.mock('@/app/api/auth/auth.config', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ default: { game: { create: h.create } } }));

import { POST } from '@/app/api/games/route';

const authed = { user: { id: 'u1' } };

const settings = {
  initialPoints: 25000, returnPoints: 30000, chipPoints: 1000, yakitoriPoints: 6000,
  uma1: 10, uma2: 5, uma3: -5, uma4: -10, chipEnabled: true, yakitoriEnabled: true,
  yakitoriMode: 'winner_takes_all',
};

const fourPlayers = [
  { position: 'east', name: 'A', userId: 'uA' },
  { position: 'south', name: 'B', userId: 'uB' },
  { position: 'west', name: 'C', userId: 'uC' },
  { position: 'north', name: 'D', userId: 'uD' },
];

function req(body: unknown) {
  return new Request('http://localhost/api/games', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  h.getServerSession.mockReset().mockResolvedValue(authed);
  h.create.mockReset().mockResolvedValue({ id: 'g1', players: [] });
});

describe('POST /api/games', () => {
  it('未認証は 401', async () => {
    h.getServerSession.mockResolvedValue(null);
    const res = await POST(req({ players: fourPlayers, settings }));
    expect(res.status).toBe(401);
  });

  it('プレイヤーが4人でなければ 400', async () => {
    const res = await POST(req({ players: fourPlayers.slice(0, 3), settings }));
    expect(res.status).toBe(400);
    expect(h.create).not.toHaveBeenCalled();
  });

  it('席が揃っていなければ 400', async () => {
    const dup = [...fourPlayers.slice(0, 3), { position: 'east', name: 'E', userId: 'uE' }];
    const res = await POST(req({ players: dup, settings }));
    expect(res.status).toBe(400);
  });

  it('userId 重複は 400', async () => {
    const dup = [
      { position: 'east', name: 'A', userId: 'x' },
      { position: 'south', name: 'B', userId: 'x' },
      { position: 'west', name: 'C', userId: 'uC' },
      { position: 'north', name: 'D', userId: 'uD' },
    ];
    const res = await POST(req({ players: dup, settings }));
    expect(res.status).toBe(400);
  });

  it('正常時は 201 で作成し、isCurrentUser を含めず yakitoriMode を保存', async () => {
    const res = await POST(req({ players: fourPlayers, settings }));
    expect(res.status).toBe(201);

    const args = h.create.mock.calls[0][0] as {
      data: {
        yakitoriMode: string;
        players: { create: Record<string, unknown>[] };
      };
    };
    expect(args.data.yakitoriMode).toBe('winner_takes_all');
    // Player に存在しない isCurrentUser を書き込まない
    args.data.players.create.forEach((p) => {
      expect(p).not.toHaveProperty('isCurrentUser');
      expect(p).toHaveProperty('position');
      expect(p).toHaveProperty('name');
    });
  });
});
