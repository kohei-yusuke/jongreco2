export default function Home() {
  return (
    <main className="min-h-screen py-8">
      <div className="text-center">
        <h1 className="display-4 mb-4">Jongreco</h1>
        <p className="lead mb-4">麻雀の得点を簡単に集計・分析</p>
        <div className="d-grid gap-2 d-sm-flex justify-content-sm-center">
          <a href="/login" className="btn btn-primary btn-lg px-4 gap-3">ログイン</a>
          <a href="/register" className="btn btn-outline-secondary btn-lg px-4">新規登録</a>
        </div>
      </div>
    </main>
  );
} 