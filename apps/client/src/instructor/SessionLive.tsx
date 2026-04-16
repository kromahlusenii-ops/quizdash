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
    if (!confirm('End the session now? Students will see the final leaderboard.')) return;
    setEnding(true);
    try {
      await fetch(`${API_BASE}/api/sessions/${id}/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      });
    } finally {
      setEnding(false);
    }
  }

  const players = sessionState?.players ?? [];
  const alive = players.filter((p) => p.status === 'alive');
  const eliminated = players.filter((p) => p.status !== 'alive');
  const totalQuestions = sessionState?.session.totalQuestions ?? 0;
  const aggregate = sessionState?.aggregate ?? {};

  const elapsed = Math.floor((now - startTime) / 1000);
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;

  // Build a sorted list of questionIndexes that have at least one answer
  const answeredQuestionIndexes = Object.keys(aggregate)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-3 flex items-center justify-between">
        <div className="flex gap-6 text-sm">
          <span>
            Alive: <strong className="text-green-400">{alive.length}</strong>
          </span>
          <span>
            Eliminated: <strong className="text-red-400">{eliminated.length}</strong>
          </span>
          <span>
            Questions: <strong>{totalQuestions}</strong>
          </span>
          <span>
            Time: <strong>{minutes}:{seconds.toString().padStart(2, '0')}</strong>
          </span>
        </div>
        <button
          onClick={endGame}
          disabled={ending}
          className="px-4 py-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 rounded text-sm"
        >
          {ending ? 'Ending…' : 'End Session'}
        </button>
      </div>

      <main className="max-w-6xl mx-auto p-6 grid lg:grid-cols-2 gap-6">
        {/* Per-student progress */}
        <section className="bg-gray-800 rounded-xl p-5 border border-gray-700">
          <h2 className="font-semibold mb-4">Students ({players.length})</h2>
          {players.length === 0 ? (
            <p className="text-gray-500 text-sm">Nobody has joined yet.</p>
          ) : (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {players
                .slice()
                .sort((a, b) => b.score - a.score)
                .map((p) => {
                  const pct = totalQuestions > 0 ? (p.questionsAnswered / totalQuestions) * 100 : 0;
                  const accuracy =
                    p.questionsAnswered > 0
                      ? Math.round((p.questionsCorrect / p.questionsAnswered) * 100)
                      : null;
                  return (
                    <div key={p.id} className="bg-gray-700/60 rounded-lg px-3 py-2">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              p.status === 'alive' ? 'bg-green-400' : 'bg-red-400'
                            }`}
                          />
                          <span className="font-medium truncate">{p.displayName}</span>
                        </div>
                        <div className="text-xs text-gray-400 flex gap-3 shrink-0">
                          {accuracy !== null && <span>{accuracy}% correct</span>}
                          <span className="text-yellow-400 font-mono">{p.score}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <div className="flex-1 bg-gray-900 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-blue-500 h-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="font-mono w-12 text-right">
                          {p.questionsAnswered}/{totalQuestions}
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </section>

        {/* Aggregate answer distribution per question */}
        <section className="bg-gray-800 rounded-xl p-5 border border-gray-700">
          <h2 className="font-semibold mb-4">Answer distribution</h2>
          {answeredQuestionIndexes.length === 0 ? (
            <p className="text-gray-500 text-sm">
              No questions answered yet. As students play, results will appear here.
            </p>
          ) : (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              {answeredQuestionIndexes.map((qIdx) => {
                const dist = aggregate[qIdx] || {};
                const total = Object.values(dist).reduce((a, b) => a + b, 0);
                return (
                  <div key={qIdx} className="bg-gray-700/40 rounded-lg p-3">
                    <div className="text-xs text-gray-400 mb-2">
                      Question {qIdx + 1} — {total} answer{total === 1 ? '' : 's'}
                    </div>
                    <div className="space-y-1">
                      {[0, 1, 2, 3].map((i) => {
                        const count = dist[i] || 0;
                        const pct = total > 0 ? (count / total) * 100 : 0;
                        return (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            <span className="w-4 font-mono text-gray-400">
                              {String.fromCharCode(65 + i)}
                            </span>
                            <div className="flex-1 bg-gray-900 rounded-full h-3 overflow-hidden">
                              <div
                                className="bg-blue-500 h-full"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="w-10 text-right text-gray-400 font-mono">
                              {count}
                            </span>
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
