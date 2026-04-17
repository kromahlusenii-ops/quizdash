import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAuthHeaders } from '../lib/supabase';
import { useSessionPolling } from '../ws/useSessionPolling';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function SessionLive() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { state: sessionState } = useSessionPolling(id || null);

  const [startTime] = useState(Date.now());
  const [now, setNow] = useState(Date.now());
  const [ending, setEnding] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (sessionState?.session.status === 'ended') {
      navigate(`/instructor/sessions/${id}/results`);
    }
  }, [sessionState?.session.status, id, navigate]);

  async function endGame() {
    if (!confirm('End the session now?')) return;
    setEnding(true);
    try {
      await fetch(`${API_BASE}/api/sessions/${id}/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      });
    } finally { setEnding(false); }
  }

  const players = sessionState?.players ?? [];
  const alive = players.filter((p) => p.status === 'alive');
  const completed = players.filter((p) => p.status === 'completed');
  const eliminated = players.filter((p) => p.status === 'eliminated');
  const totalQuestions = sessionState?.session.totalQuestions ?? 0;
  const aggregate = sessionState?.aggregate ?? {};

  const elapsed = Math.floor((now - startTime) / 1000);
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;

  const answeredQuestionIndexes = Object.keys(aggregate).map(Number).sort((a, b) => a - b);

  return (
    <div className="min-h-screen bg-bg text-white">
      {/* Status bar */}
      <div className="border-b border-line px-6 py-3 flex items-center justify-between">
        <div className="flex gap-5 text-xs">
          <span>
            Playing <strong className="text-success">{alive.length}</strong>
          </span>
          <span>
            Done <strong className="text-accent">{completed.length}</strong>
          </span>
          <span>
            Out <strong className="text-danger">{eliminated.length}</strong>
          </span>
          <span>
            Qs <strong className="text-gold">{totalQuestions}</strong>
          </span>
          <span className="font-mono text-muted">
            {minutes}:{seconds.toString().padStart(2, '0')}
          </span>
        </div>
        <button
          onClick={endGame}
          disabled={ending}
          className="px-4 py-1.5 bg-danger/20 border border-danger/40 hover:bg-danger/30 disabled:opacity-50 rounded text-xs text-danger transition-colors"
        >
          {ending ? 'Ending...' : 'End Session'}
        </button>
      </div>

      <main className="max-w-6xl mx-auto p-6 grid lg:grid-cols-2 gap-6">
        {/* Students */}
        <section className="bg-surface rounded-xl p-5 border border-line">
          <h2 className="text-[10px] font-arcade text-muted tracking-wider mb-4">
            STUDENTS ({players.length})
          </h2>
          {players.length === 0 ? (
            <p className="text-dim text-xs">Nobody has joined yet.</p>
          ) : (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {players.slice().sort((a, b) => b.score - a.score).map((p) => {
                const pct = totalQuestions > 0 ? (p.questionsAnswered / totalQuestions) * 100 : 0;
                const accuracy = p.questionsAnswered > 0
                  ? Math.round((p.questionsCorrect / p.questionsAnswered) * 100) : null;
                return (
                  <div key={p.id} className="bg-surface-alt rounded-lg px-3 py-2">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-2 h-2 rounded-full ${
                          p.status === 'alive' ? 'bg-success' :
                          p.status === 'completed' ? 'bg-accent' : 'bg-danger'
                        }`} />
                        <span className="text-sm truncate">{p.displayName}</span>
                      </div>
                      <div className="text-xs text-dim flex gap-3 shrink-0">
                        {accuracy !== null && <span>{accuracy}%</span>}
                        <span className="text-gold font-mono">{p.score}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-dim">
                      <div className="flex-1 bg-bg rounded-full h-1.5 overflow-hidden">
                        <div className="bg-accent h-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="font-mono w-12 text-right">{p.questionsAnswered}/{totalQuestions}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Answer distribution */}
        <section className="bg-surface rounded-xl p-5 border border-line">
          <h2 className="text-[10px] font-arcade text-muted tracking-wider mb-4">
            ANSWERS
          </h2>
          {answeredQuestionIndexes.length === 0 ? (
            <p className="text-dim text-xs">Waiting for answers...</p>
          ) : (
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {answeredQuestionIndexes.map((qIdx) => {
                const dist = aggregate[qIdx] || {};
                const total = Object.values(dist).reduce((a, b) => a + b, 0);
                return (
                  <div key={qIdx} className="bg-surface-alt rounded-lg p-3">
                    <div className="text-xs text-dim mb-2">
                      Q{qIdx + 1} — {total} answer{total === 1 ? '' : 's'}
                    </div>
                    <div className="space-y-1">
                      {[0, 1, 2, 3].map((i) => {
                        const count = dist[i] || 0;
                        const pct = total > 0 ? (count / total) * 100 : 0;
                        return (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            <span className="w-4 font-mono text-dim">{String.fromCharCode(65 + i)}</span>
                            <div className="flex-1 bg-bg rounded-full h-2.5 overflow-hidden">
                              <div className="bg-accent h-full" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="w-8 text-right text-dim font-mono">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
