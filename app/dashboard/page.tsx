'use client';

import NewGameSection from './components/NewGameSection';
import GameHistoryList from './components/GameHistoryList';

export default function DashboardPage() {
  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>ダッシュボード</h1>
      </div>

      <div className="row">
        <div className="col-md-4">
          <NewGameSection />
        </div>
        <div className="col-md-8">
          <div className="card">
            <div className="card-body">
              <h2 className="card-title h4 mb-4">対局履歴</h2>
              <GameHistoryList />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 