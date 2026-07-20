import Link from 'next/link';

const FEATURES = [
  { icon: '🀄', title: 'ワンタップ精算', body: '素点を入れるだけで、ウマ・オカ・返し点・焼き鳥まで自動計算。' },
  { icon: '📈', title: '成績を可視化', body: '半荘ごと・累計のグラフで、卓の流れがひと目で分かる。' },
  { icon: '👥', title: 'フレンドと記録', body: '登録すればメンバーと対局履歴を共有。next の一戦へ。' },
];

export default function Home() {
  return (
    <div className="page-wrap" style={{ maxWidth: 960 }}>
      <section className="hero mb-4">
        <span className="jr-chip mb-2" style={{ background: 'rgba(255,255,255,.15)', color: '#fff' }}>麻雀スコア管理</span>
        <h2 style={{ fontSize: 'clamp(1.6rem,5vw,2.4rem)' }}>点数計算、指先で完結。</h2>
        <p>アカウントは後からで大丈夫。まずは登録なしで、今日の半荘を精算してみましょう。</p>
        <div className="d-flex flex-wrap gap-2">
          <Link href="/calc" className="jr-btn jr-btn-primary">
            <i className="bi bi-calculator" /> 登録せずに計算する
          </Link>
          <Link href="/login" className="jr-btn jr-btn-ghost" style={{ color: '#fff', background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.25)' }}>
            ログイン
          </Link>
        </div>
      </section>

      <div className="row g-3 mb-4">
        {FEATURES.map((f) => (
          <div key={f.title} className="col-12 col-md-4">
            <div className="jr-card h-100">
              <div className="jr-card-body">
                <div style={{ fontSize: '1.8rem' }}>{f.icon}</div>
                <h3 className="fw-bold mt-2 mb-1" style={{ fontSize: '1.05rem' }}>{f.title}</h3>
                <p className="mb-0" style={{ color: 'var(--jr-ink-soft)', fontSize: '.9rem', lineHeight: 1.6 }}>{f.body}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="text-center">
        <p className="mb-2" style={{ color: 'var(--jr-ink-soft)' }}>まだアカウントをお持ちでない方</p>
        <Link href="/register" className="jr-link" style={{ fontSize: '1rem' }}>無料でアカウントを作成 ›</Link>
      </div>
    </div>
  );
}
