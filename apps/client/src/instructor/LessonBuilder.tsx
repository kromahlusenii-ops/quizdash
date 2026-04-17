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
      if (!res.ok) {
        navigate('/instructor');
        return;
      }
      const data = await res.json();
      setTitle(data.title);
      setTimerSeconds(data.timer_seconds);
      setCheckpoints(
        (data.checkpoints || []).sort((a: Checkpoint, b: Checkpoint) => a.sort_order - b.sort_order)
      );
    } catch {
      setError('Failed to load lesson');
    }
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
    } catch {
      // Silently handle
    }
  }

  async function saveLesson() {
    setSaving(true);
    setSaved(false);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/lessons/${id}`, {
        method: 'PUT',
        headers: headers(),
        body: JSON.stringify({ title, timer_seconds: timerSeconds }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to save lesson');
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch {
      setError('Failed to save lesson');
    } finally {
      setSaving(false);
    }
  }

  async function launchSession() {
    if (!allValid) return;
    setLaunching(true);
    try {
      const res = await fetch(`${API_BASE}/api/sessions`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ lesson_id: id }),
      });

      if (res.ok) {
        const data = await res.json();
        navigate(`/instructor/sessions/${data.sessionId}/lobby`);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to create session');
      }
    } catch {
      alert('Network error');
    } finally {
      setLaunching(false);
    }
  }

  async function addCheckpoint() {
    try {
      const res = await fetch(`${API_BASE}/api/lessons/${id}/checkpoints`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          question: 'New question',
          options: ['Option A', 'Option B', 'Option C', 'Option D'],
          correct_index: 0,
          fact: 'Interesting fact about the answer',
          sort_order: checkpoints.length,
        }),
      });
      if (res.ok) {
        const cp = await res.json();
        setCheckpoints(prev => [...prev, cp]);
        setExpandedIndex(checkpoints.length);
      }
    } catch {
      setError('Failed to add question');
    }
  }

  async function updateCheckpoint(cpId: string, updates: Partial<Checkpoint>) {
    try {
      await fetch(`${API_BASE}/api/checkpoints/${cpId}`, {
        method: 'PUT',
        headers: headers(),
        body: JSON.stringify(updates),
      });
    } catch {
      setError('Failed to update question');
    }
  }

  async function deleteCheckpoint(cpId: string) {
    try {
      await fetch(`${API_BASE}/api/checkpoints/${cpId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      setCheckpoints(prev => prev.filter(cp => cp.id !== cpId));
    } catch {
      setError('Failed to delete question');
    }
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
        method: 'PUT',
        headers: headers(),
        body: JSON.stringify({
          checkpoints: updated.map(cp => ({ id: cp.id, sort_order: cp.sort_order })),
        }),
      });
    } catch {
      setError('Failed to reorder');
    }
  }

  function isCheckpointValid(cp: Checkpoint): boolean {
    return (
      cp.question.trim().length > 0 &&
      cp.options.every(o => o.trim().length > 0) &&
      cp.options.length === 4 &&
      cp.correct_index >= 0 &&
      cp.correct_index <= 3 &&
      cp.fact.trim().length > 0
    );
  }

  const allValid = checkpoints.length > 0 && checkpoints.every(isCheckpointValid);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex justify-between items-center">
        <button onClick={() => navigate('/instructor')} className="text-gray-400 hover:text-white text-sm">
          &larr; Back
        </button>
        <div className="flex gap-2">
          <button
            onClick={saveLesson}
            disabled={saving}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${saved ? 'bg-green-500' : 'bg-gray-700 hover:bg-gray-600 disabled:bg-gray-700'}`}
          >
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save'}
          </button>
          <button
            onClick={launchSession}
            disabled={!allValid || launching}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg text-sm font-medium transition-colors"
          >
            {launching ? 'Launching...' : 'Launch Session'}
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-6 space-y-6">
        {error && (
          <div className="bg-red-500/20 border border-red-400 text-red-300 px-4 py-2 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Lesson settings */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-400 text-xs mb-1">Lesson Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={saveLesson}
              className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div>
            <label className="block text-gray-400 text-xs mb-1">Timer per question</label>
            <select
              value={timerSeconds}
              onChange={(e) => setTimerSeconds(Number(e.target.value))}
              onBlur={saveLesson}
              className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value={10}>10 seconds</option>
              <option value={15}>15 seconds</option>
              <option value={20}>20 seconds</option>
              <option value={30}>30 seconds</option>
            </select>
          </div>
        </div>

        {/* Questions */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
            Questions ({checkpoints.length})
          </h3>

          {checkpoints.map((cp, index) => (
            <div key={cp.id} className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
              <div
                className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-700/50 transition-colors"
                onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-gray-600 font-mono text-xs w-5 text-right shrink-0">
                    {index + 1}
                  </span>
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isCheckpointValid(cp) ? 'bg-green-400' : 'bg-yellow-400'}`} />
                  <span className="text-gray-300 text-sm truncate">{cp.question}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); moveCheckpoint(index, 'up'); }}
                    disabled={index === 0}
                    className="text-gray-600 hover:text-white disabled:opacity-20 p-1"
                  >
                    &uarr;
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); moveCheckpoint(index, 'down'); }}
                    disabled={index === checkpoints.length - 1}
                    className="text-gray-600 hover:text-white disabled:opacity-20 p-1"
                  >
                    &darr;
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteCheckpoint(cp.id); }}
                    className="text-red-500/60 hover:text-red-400 p-1 text-xs ml-1"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {expandedIndex === index && (
                <div className="px-4 pb-4 space-y-3 border-t border-gray-700 pt-3">
                  <div>
                    <label className="block text-gray-500 text-xs mb-1">Question</label>
                    <textarea
                      value={cp.question}
                      onChange={(e) => {
                        const updated = [...checkpoints];
                        updated[index] = { ...cp, question: e.target.value };
                        setCheckpoints(updated);
                      }}
                      onBlur={() => updateCheckpoint(cp.id, { question: cp.question })}
                      className="w-full px-3 py-2 rounded bg-gray-700 text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                      rows={2}
                    />
                  </div>

                  {cp.options.map((opt, optIdx) => (
                    <div key={optIdx} className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const updated = [...checkpoints];
                          updated[index] = { ...cp, correct_index: optIdx };
                          setCheckpoints(updated);
                          updateCheckpoint(cp.id, { correct_index: optIdx });
                        }}
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 shrink-0 ${
                          cp.correct_index === optIdx
                            ? 'bg-green-500 border-green-400 text-white'
                            : 'border-gray-600 text-gray-500 hover:border-gray-400'
                        }`}
                      >
                        {String.fromCharCode(65 + optIdx)}
                      </button>
                      <input
                        value={opt}
                        onChange={(e) => {
                          const updated = [...checkpoints];
                          const newOpts = [...cp.options];
                          newOpts[optIdx] = e.target.value;
                          updated[index] = { ...cp, options: newOpts };
                          setCheckpoints(updated);
                        }}
                        onBlur={() => updateCheckpoint(cp.id, { options: cp.options })}
                        className="flex-1 px-3 py-2 rounded bg-gray-700 text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                      />
                    </div>
                  ))}

                  <div>
                    <label className="block text-gray-500 text-xs mb-1">Fun Fact (shown on wrong answer)</label>
                    <textarea
                      value={cp.fact}
                      onChange={(e) => {
                        const updated = [...checkpoints];
                        updated[index] = { ...cp, fact: e.target.value };
                        setCheckpoints(updated);
                      }}
                      onBlur={() => updateCheckpoint(cp.id, { fact: cp.fact })}
                      className="w-full px-3 py-2 rounded bg-gray-700 text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                      rows={2}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}

          <button
            onClick={addCheckpoint}
            className="w-full py-3 border-2 border-dashed border-gray-700 rounded-xl text-gray-500 hover:text-white hover:border-gray-500 transition-colors text-sm"
          >
            + Add Question
          </button>

          {!allValid && checkpoints.length > 0 && (
            <p className="text-yellow-400/80 text-xs">
              All questions need text, 4 options, a correct answer, and a fact before you can launch.
            </p>
          )}
        </div>

        {/* Session History */}
        {sessions.length > 0 && (
          <div className="space-y-3 pt-2">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
              Past Sessions ({sessions.length})
            </h3>

            <div className="space-y-2">
              {sessions.map((s) => (
                <div
                  key={s.id}
                  className="bg-gray-800 rounded-lg px-4 py-3 flex justify-between items-center border border-gray-700 cursor-pointer hover:border-gray-500 transition-colors"
                  onClick={() => navigate(`/instructor/sessions/${s.id}/results`)}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm text-gray-400">{s.join_code}</span>
                    <span className="text-gray-600 text-xs">
                      {new Date(s.created_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      s.status === 'ended'
                        ? 'bg-gray-700 text-gray-400'
                        : s.status === 'running'
                          ? 'bg-green-900/50 text-green-400'
                          : 'bg-yellow-900/50 text-yellow-400'
                    }`}>
                      {s.status}
                    </span>
                    <span className="text-gray-600 text-xs">&rarr;</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
