import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getToken, getAuthHeaders } from '../lib/supabase';

const API_BASE = import.meta.env.VITE_API_URL || '';

interface QuestionResult {
  id: string;
  question: string;
  options: string[];
  correct_index: number;
  answer_distribution: Record<number, number>;
  total_answered: number;
  total_correct: number;
}

interface LeaderboardEntry {
  rank: number;
  displayName: string;
  score: number;
  lives: number;
  survived: boolean;
}

interface SessionMeta {
  id: string;
  status: string;
  createdAt: string;
  totalQuestions: number;
  totalPlayers: number;
}

export default function SessionHistory() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<SessionMeta | null>(null);
  const [results, setResults] = useState<QuestionResult[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      navigate('/instructor/login');
      return;
    }
    loadResults();
  }, [id]);

  async function loadResults() {
    try {
      const res = await fetch(`${API_BASE}/api/sessions/${id}/results`, {
        headers: getAuthHeaders(),
      });

      if (res.ok) {
        const data = await res.json();
        setSession(data.session || null);
        setResults(data.results || []);
        setLeaderboard(data.leaderboard || []);
      }
    } catch {
      // Handle error
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <p className="text-white">Loading results...</p>
      </div>
    );
  }

  const overallCorrect = results.reduce((s, r) => s + r.total_correct, 0);
  const overallTotal = results.reduce((s, r) => s + r.total_answered, 0);
  const overallPct = overallTotal > 0 ? Math.round((overallCorrect / overallTotal) * 100) : 0;

  return (
    <div className="min-h-screen bg-bg text-white">
      <header className="border-b border-line px-6 py-4 flex justify-between items-center">
        <button onClick={() => navigate('/instructor')} className="text-dim hover:text-white text-xs transition-colors">
          &larr; Back
        </button>
        <h1 className="font-arcade text-sm text-accent">RESULTS</h1>
      </header>

      <main className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Summary bar */}
        {session && (
          <div className="flex flex-wrap gap-4">
            {[
              { label: 'Players', value: session.totalPlayers },
              { label: 'Questions', value: session.totalQuestions },
              { label: 'Overall accuracy', value: `${overallPct}%` },
              {
                label: 'Date',
                value: new Date(session.createdAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                }),
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-surface rounded-lg px-4 py-3 border border-line flex-1 min-w-[120px]"
              >
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-dim text-xs">{stat.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Leaderboard */}
        {leaderboard.length > 0 && (
          <div className="bg-surface rounded-xl p-5 border border-line">
            <h2 className="text-[10px] font-arcade text-muted tracking-wider mb-3">
              LEADERBOARD
            </h2>
            <div className="space-y-1">
              {leaderboard.map((entry) => (
                <div
                  key={entry.rank}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-surface-alt/40"
                >
                  <span className="w-6 text-right font-mono text-sm text-dim">
                    {entry.rank}
                  </span>
                  <span className="flex-1 text-sm">{entry.displayName}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      entry.survived
                        ? 'bg-green-900/40 text-green-400'
                        : 'bg-red-900/40 text-red-400'
                    }`}
                  >
                    {entry.survived ? 'Survived' : 'Out'}
                  </span>
                  <span className="font-mono text-sm text-yellow-400 w-16 text-right">
                    {entry.score}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Per-question breakdown */}
        <div>
          <h2 className="text-[10px] font-arcade text-muted tracking-wider mb-3">
            QUESTION BREAKDOWN
          </h2>

          {results.length === 0 ? (
            <p className="text-dim text-center py-8">No results available.</p>
          ) : (
            <div className="space-y-4">
              {results.map((r, index) => {
                const pctCorrect =
                  r.total_answered > 0
                    ? Math.round((r.total_correct / r.total_answered) * 100)
                    : 0;

                return (
                  <div
                    key={r.id}
                    className="bg-surface rounded-xl p-5 border border-line"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <span className="text-dim text-xs font-mono mr-2">
                          Q{index + 1}
                        </span>
                        <span className="text-sm">{r.question}</span>
                      </div>
                      <div className="text-right shrink-0 ml-4">
                        <span className="text-lg font-bold text-green-400">{pctCorrect}%</span>
                        <p className="text-dim text-xs">{r.total_answered} answered</p>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      {r.options?.map((opt: string, i: number) => {
                        const count = r.answer_distribution[i] || 0;
                        const pct =
                          r.total_answered > 0 ? (count / r.total_answered) * 100 : 0;
                        const isCorrect = i === r.correct_index;

                        return (
                          <div key={i} className="flex items-center gap-2 text-sm">
                            <span
                              className={`w-5 font-mono text-xs ${
                                isCorrect ? 'text-green-400 font-bold' : 'text-dim'
                              }`}
                            >
                              {String.fromCharCode(65 + i)}
                            </span>
                            <div className="flex-1 bg-bg rounded-full h-5 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  isCorrect ? 'bg-green-600' : 'bg-gray-600'
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="w-20 text-right text-xs text-dim">
                              {count} ({Math.round(pct)}%)
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
        </div>
      </main>
    </div>
  );
}
