import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getToken, getAuthHeaders, signOut } from '../lib/supabase';

const API_BASE = import.meta.env.VITE_API_URL || '';

interface Lesson {
  id: string;
  title: string;
  timer_seconds: number;
  created_at: string;
  checkpoint_count: number;
}

interface Session {
  id: string;
  join_code: string;
  status: string;
  lesson_id: string;
  created_at: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      navigate('/instructor/login');
      return;
    }
    loadData();
  }, []);

  async function loadData() {
    try {
      const headers = getAuthHeaders();
      const [lessonsRes, sessionsRes] = await Promise.all([
        fetch(`${API_BASE}/api/lessons`, { headers }),
        fetch(`${API_BASE}/api/sessions`, { headers }),
      ]);

      if (lessonsRes.status === 401 || sessionsRes.status === 401) {
        signOut();
        navigate('/instructor/login');
        return;
      }

      if (lessonsRes.ok) {
        const data = await lessonsRes.json();
        setLessons((data || []).map((l: any) => ({
          ...l,
          checkpoint_count: l.checkpoints?.[0]?.count ?? l.checkpoint_count ?? 0,
        })));
      }
      if (sessionsRes.ok) setSessions(await sessionsRes.json());
    } catch {
      // Silently handle
    } finally {
      setLoading(false);
    }
  }

  async function createLesson() {
    try {
      const res = await fetch(`${API_BASE}/api/lessons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ title: 'New Lesson', timer_seconds: 15 }),
      });

      if (res.status === 401) {
        signOut();
        navigate('/instructor/login');
        return;
      }

      if (res.ok) {
        const lesson = await res.json();
        navigate(`/instructor/lessons/${lesson.id}`);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to create lesson');
      }
    } catch {
      alert('Network error — please try again');
    }
  }

  function handleLogout() {
    signOut();
    navigate('/instructor/login');
  }

  const activeSession = sessions.find(
    (s) => s.status === 'lobby' || s.status === 'running'
  );

  function sessionCountFor(lessonId: string) {
    return sessions.filter((s) => s.lesson_id === lessonId).length;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <p className="text-muted font-arcade text-xs">LOADING...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-white">
      <header className="border-b border-line px-6 py-4 flex justify-between items-center">
        <h1 className="font-arcade text-sm text-accent">QUIZDASH</h1>
        <button onClick={handleLogout} className="text-dim hover:text-white text-xs transition-colors">
          Sign Out
        </button>
      </header>

      <main className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Active session banner */}
        {activeSession && (
          <div
            className="border border-success/40 bg-success/5 rounded-xl p-4 flex items-center justify-between cursor-pointer hover:border-success/70 transition-colors"
            onClick={() =>
              navigate(
                activeSession.status === 'lobby'
                  ? `/instructor/sessions/${activeSession.id}/lobby`
                  : `/instructor/sessions/${activeSession.id}/live`
              )
            }
          >
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-success animate-pulse" />
              <div>
                <p className="font-medium text-success">
                  Live session — <span className="font-mono">{activeSession.join_code}</span>
                </p>
                <p className="text-success/50 text-xs">
                  {activeSession.status === 'lobby' ? 'Waiting for players' : 'In progress'}
                </p>
              </div>
            </div>
            <span className="text-success text-sm font-medium">&rarr;</span>
          </div>
        )}

        {/* Lessons */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xs font-arcade text-muted tracking-wider">YOUR LESSONS</h2>
            <button
              onClick={createLesson}
              className="px-4 py-2 bg-accent hover:bg-accent-hover rounded-lg text-xs font-medium transition-colors shadow-[0_0_15px_rgba(33,33,222,0.2)]"
            >
              + New Lesson
            </button>
          </div>

          {lessons.length === 0 ? (
            <div className="text-center py-16 border border-line rounded-xl">
              <p className="text-dim mb-4 text-sm">No lessons yet.</p>
              <button
                onClick={createLesson}
                className="px-6 py-3 bg-accent hover:bg-accent-hover rounded-lg font-medium transition-colors text-sm"
              >
                Create your first lesson
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {lessons.map((lesson) => {
                const count = sessionCountFor(lesson.id);
                return (
                  <div
                    key={lesson.id}
                    className="bg-surface rounded-xl px-5 py-4 border border-line cursor-pointer hover:border-accent/30 transition-all group"
                    onClick={() => navigate(`/instructor/lessons/${lesson.id}`)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-sm group-hover:text-accent transition-colors">
                          {lesson.title}
                        </h3>
                        <p className="text-dim text-xs mt-0.5">
                          {lesson.checkpoint_count || 0} questions
                          <span className="mx-1.5 text-line">/</span>
                          {lesson.timer_seconds}s
                          {count > 0 && (
                            <>
                              <span className="mx-1.5 text-line">/</span>
                              {count} run{count !== 1 ? 's' : ''}
                            </>
                          )}
                        </p>
                      </div>
                      <span className="text-dim group-hover:text-accent transition-colors">&rarr;</span>
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
