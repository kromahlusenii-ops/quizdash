import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAuthHeaders } from '../lib/supabase';

const API_BASE = import.meta.env.VITE_API_URL || '';

interface Checkpoint {
  id: string;
  sort_order: number;
  question: string;
  options: string[];
  correct_index: number;
  fact: string;
}

interface Session {
  id: string;
  join_code: string;
  status: string;
  lesson_id: string;
  created_at: string;
}

export default function LessonBuilder() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [timerSeconds, setTimerSeconds] = useState(15);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [launching, setLaunching] = useState(false);

  const headers = useCallback(() => ({
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
  }), []);

  useEffect(() => {
    loadLesson();
    loadSessions();
  }, [id]);

  async function loadLesson() {
    try {
      const res = await fetch(`${API_BASE}/api/lessons/${id}`, { headers: getAuthHeaders() });
      if (!res.ok) { navigate('/instructor'); return; }
      const data = await res.json();
      setTitle(data.title);
      setTimerSeconds(data.timer_seconds);
      setCheckpoints(
        (data.checkpoints || []).sort((a: Checkpoint, b: Checkpoint) => a.sort_order - b.sort_order)
      );
    } catch { setError('Failed to load lesson'); }
  }

  async function loadSessions() {
    try {
      const res = await fetch(`${API_BASE}/api/sessions`, { headers: getAuthHeaders() });
      if (res.ok) {
        const all: Session[] = await res.json();
        setSessions(all.filter((s) => s.lesson_id === id).sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ));
      }
    } catch {}
  }

  async function saveLesson() {
    setSaving(true); setSaved(false); setError('');
    try {
      const res = await fetch(`${API_BASE}/api/lessons/${id}`, {
        method: 'PUT', headers: headers(),
        body: JSON.stringify({ title, timer_seconds: timerSeconds }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error || 'Failed to save'); }
      else { setSaved(true); setTimeout(() => setSaved(false), 2000); }
    } catch { setError('Failed to save'); }
    finally { setSaving(false); }
  }

  async function launchSession() {
    if (!allValid) return;
    setLaunching(true);
    try {
      const res = await fetch(`${API_BASE}/api/sessions`, {
        method: 'POST', headers: headers(),
        body: JSON.stringify({ lesson_id: id }),
      });
      if (res.ok) { const d = await res.json(); navigate(`/instructor/sessions/${d.sessionId}/lobby`); }
      else { const d = await res.json(); alert(d.error || 'Failed'); }
    } catch { alert('Network error'); }
    finally { setLaunching(false); }
  }

  async function addCheckpoint() {
    try {
      const res = await fetch(`${API_BASE}/api/lessons/${id}/checkpoints`, {
        method: 'POST', headers: headers(),
        body: JSON.stringify({
          question: 'New question',
          options: ['Option A', 'Option B', 'Option C', 'Option D'],
          correct_index: 0, fact: 'Interesting fact about the answer',
          sort_order: checkpoints.length,
        }),
      });
      if (res.ok) {
        const cp = await res.json();
        setCheckpoints(prev => [...prev, cp]);
        setExpandedIndex(checkpoints.length);
      }
    } catch { setError('Failed to add question'); }
  }

  async function updateCheckpoint(cpId: string, updates: Partial<Checkpoint>) {
    try {
      await fetch(`${API_BASE}/api/checkpoints/${cpId}`, {
        method: 'PUT', headers: headers(), body: JSON.stringify(updates),
      });
    } catch { setError('Failed to update question'); }
  }

  async function deleteCheckpoint(cpId: string) {
    try {
      await fetch(`${API_BASE}/api/checkpoints/${cpId}`, { method: 'DELETE', headers: getAuthHeaders() });
      setCheckpoints(prev => prev.filter(cp => cp.id !== cpId));
    } catch { setError('Failed to delete question'); }
  }

  async function moveCheckpoint(index: number, direction: 'up' | 'down') {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= checkpoints.length) return;
    const updated = [...checkpoints];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    updated.forEach((cp, i) => { cp.sort_order = i; });
    setCheckpoints(updated);
    try {
      await fetch(`${API_BASE}/api/checkpoints/reorder`, {
        method: 'PUT', headers: headers(),
        body: JSON.stringify({ checkpoints: updated.map(cp => ({ id: cp.id, sort_order: cp.sort_order })) }),
      });
    } catch { setError('Failed to reorder'); }
  }

  function isValid(cp: Checkpoint): boolean {
    return cp.question.trim().length > 0 && cp.options.every(o => o.trim().length > 0) &&
      cp.options.length === 4 && cp.correct_index >= 0 && cp.correct_index <= 3 && cp.fact.trim().length > 0;
  }

  const allValid = checkpoints.length > 0 && checkpoints.every(isValid);

  return (
    <div className="min-h-screen bg-bg text-white">
      <header className="border-b border-line px-6 py-4 flex justify-between items-center">
        <button onClick={() => navigate('/instructor')} className="text-dim hover:text-white text-xs transition-colors">
          &larr; Back
        </button>
        <div className="flex gap-2">
          <button
            onClick={saveLesson}
            disabled={saving}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
              saved ? 'bg-success text-white' : 'bg-surface border border-line hover:border-accent/30 disabled:opacity-50'
            }`}
          >
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save'}
          </button>
          <button
            onClick={launchSession}
            disabled={!allValid || launching}
            className="px-4 py-2 bg-accent hover:bg-accent-hover disabled:bg-surface disabled:text-dim rounded-lg text-xs font-medium transition-colors shadow-[0_0_15px_rgba(33,33,222,0.2)]"
          >
            {launching ? 'Launching...' : 'Launch Session'}
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-6 space-y-6">
        {error && (
          <div className="bg-danger/10 border border-danger/40 text-danger px-4 py-2 rounded-lg text-xs">
            {error}
          </div>
        )}

        {/* Settings */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-dim text-xs mb-1">Lesson Title</label>
            <input
              type="text" value={title}
              onChange={(e) => setTitle(e.target.value)} onBlur={saveLesson}
              className="w-full px-4 py-3 rounded-lg bg-surface border border-line text-white focus:outline-none focus:border-accent transition-colors"
            />
          </div>
          <div>
            <label className="block text-dim text-xs mb-1">Timer per question</label>
            <select
              value={timerSeconds}
              onChange={(e) => setTimerSeconds(Number(e.target.value))} onBlur={saveLesson}
              className="w-full px-4 py-3 rounded-lg bg-surface border border-line text-white focus:outline-none focus:border-accent transition-colors"
            >
              <option value={10}>10 seconds</option>
              <option value={15}>15 seconds</option>
              <option value={20}>20 seconds</option>
              <option value={30}>30 seconds</option>
            </select>
          </div>
        </div>

        {/* Questions */}
        <div className="space-y-2">
          <h3 className="text-[10px] font-arcade text-muted tracking-wider">
            QUESTIONS ({checkpoints.length})
          </h3>

          {checkpoints.map((cp, index) => (
            <div key={cp.id} className="bg-surface border border-line rounded-xl overflow-hidden hover:border-accent/20 transition-colors">
              <div
                className="flex items-center justify-between px-4 py-3 cursor-pointer"
                onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-dim font-mono text-xs w-5 text-right shrink-0">{index + 1}</span>
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isValid(cp) ? 'bg-success' : 'bg-gold'}`} />
                  <span className="text-sm truncate text-muted">{cp.question}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <button onClick={(e) => { e.stopPropagation(); moveCheckpoint(index, 'up'); }} disabled={index === 0} className="text-dim hover:text-white disabled:opacity-20 p-1 text-xs">&uarr;</button>
                  <button onClick={(e) => { e.stopPropagation(); moveCheckpoint(index, 'down'); }} disabled={index === checkpoints.length - 1} className="text-dim hover:text-white disabled:opacity-20 p-1 text-xs">&darr;</button>
                  <button onClick={(e) => { e.stopPropagation(); deleteCheckpoint(cp.id); }} className="text-danger/50 hover:text-danger p-1 text-xs ml-1">Delete</button>
                </div>
              </div>

              {expandedIndex === index && (
                <div className="px-4 pb-4 space-y-3 border-t border-line pt-3">
                  <div>
                    <label className="block text-dim text-xs mb-1">Question</label>
                    <textarea
                      value={cp.question}
                      onChange={(e) => { const u = [...checkpoints]; u[index] = { ...cp, question: e.target.value }; setCheckpoints(u); }}
                      onBlur={() => updateCheckpoint(cp.id, { question: cp.question })}
                      className="w-full px-3 py-2 rounded bg-surface-alt border border-line text-white text-sm focus:outline-none focus:border-accent transition-colors"
                      rows={2}
                    />
                  </div>

                  {cp.options.map((opt, optIdx) => (
                    <div key={optIdx} className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const u = [...checkpoints]; u[index] = { ...cp, correct_index: optIdx }; setCheckpoints(u);
                          updateCheckpoint(cp.id, { correct_index: optIdx });
                        }}
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 shrink-0 transition-colors ${
                          cp.correct_index === optIdx ? 'bg-success border-success text-white' : 'border-line text-dim hover:border-muted'
                        }`}
                      >
                        {String.fromCharCode(65 + optIdx)}
                      </button>
                      <input
                        value={opt}
                        onChange={(e) => {
                          const u = [...checkpoints]; const o = [...cp.options]; o[optIdx] = e.target.value;
                          u[index] = { ...cp, options: o }; setCheckpoints(u);
                        }}
                        onBlur={() => updateCheckpoint(cp.id, { options: cp.options })}
                        className="flex-1 px-3 py-2 rounded bg-surface-alt border border-line text-white text-sm focus:outline-none focus:border-accent transition-colors"
                      />
                    </div>
                  ))}

                  <div>
                    <label className="block text-dim text-xs mb-1">Fun Fact (shown on wrong answer)</label>
                    <textarea
                      value={cp.fact}
                      onChange={(e) => { const u = [...checkpoints]; u[index] = { ...cp, fact: e.target.value }; setCheckpoints(u); }}
                      onBlur={() => updateCheckpoint(cp.id, { fact: cp.fact })}
                      className="w-full px-3 py-2 rounded bg-surface-alt border border-line text-white text-sm focus:outline-none focus:border-accent transition-colors"
                      rows={2}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}

          <button
            onClick={addCheckpoint}
            className="w-full py-3 border-2 border-dashed border-line rounded-xl text-dim hover:text-accent hover:border-accent/30 transition-colors text-xs"
          >
            + Add Question
          </button>

          {!allValid && checkpoints.length > 0 && (
            <p className="text-gold/80 text-xs">
              All questions need text, 4 options, a correct answer, and a fact before you can launch.
            </p>
          )}
        </div>

        {/* Session History */}
        {sessions.length > 0 && (
          <div className="space-y-2 pt-2">
            <h3 className="text-[10px] font-arcade text-muted tracking-wider">
              PAST SESSIONS ({sessions.length})
            </h3>
            {sessions.map((s) => (
              <div
                key={s.id}
                className="bg-surface rounded-lg px-4 py-3 flex justify-between items-center border border-line cursor-pointer hover:border-accent/30 transition-colors"
                onClick={() => navigate(`/instructor/sessions/${s.id}/results`)}
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-muted">{s.join_code}</span>
                  <span className="text-dim text-xs">
                    {new Date(s.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    s.status === 'ended' ? 'bg-surface-alt text-dim' :
                    s.status === 'running' ? 'bg-success/10 text-success' : 'bg-gold/10 text-gold'
                  }`}>{s.status}</span>
                  <span className="text-dim text-xs">&rarr;</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
