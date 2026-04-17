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

  // Check for any live/lobby session
  const activeSession = sessions.find(
    (s) => s.status === 'lobby' || s.status === 'running'
  );

  // Count sessions per lesson
  function sessionCountFor(lessonId: string) {
    return sessions.filter((s) => s.lesson_id === lessonId).length;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-white text-xl">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold tracking-tight">Financial Wellness</h1>
        <button onClick={handleLogout} className="text-gray-400 hover:text-white text-sm">
          Sign Out
        </button>
      </header>

      <main className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Active session banner */}
        {activeSession && (
          <div
            className="bg-green-900/30 border border-green-700 rounded-xl p-4 flex items-center justify-between cursor-pointer hover:border-green-500 transition-colors"
            onClick={() =>
              navigate(
                activeSession.status === 'lobby'
                  ? `/instructor/sessions/${activeSession.id}/lobby`
                  : `/instructor/sessions/${activeSession.id}/live`
              )
            }
          >
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
              <div>
                <p className="font-medium text-green-200">
                  Live session — {activeSession.join_code}
                </p>
                <p className="text-green-400/70 text-xs">
                  {activeSession.status === 'lobby' ? 'Waiting for players' : 'In progress'}
                </p>
              </div>
            </div>
            <span className="text-green-300 text-sm font-medium">Rejoin &rarr;</span>
          </div>
        )}

        {/* Lessons */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-300">Your Lessons</h2>
            <button
              onClick={createLesson}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors"
            >
              + New Lesson
            </button>
          </div>

          {lessons.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-500 mb-4">No lessons yet.</p>
              <button
                onClick={createLesson}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
              >
                Create your first lesson
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {lessons.map((lesson) => {
                const count = sessionCountFor(lesson.id);
                return (
                  <div
                    key={lesson.id}
                    className="bg-gray-800 rounded-xl p-4 border border-gray-700 cursor-pointer hover:border-gray-500 transition-colors"
                    onClick={() => navigate(`/instructor/lessons/${lesson.id}`)}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-base">{lesson.title}</h3>
                        <p className="text-gray-500 text-sm mt-0.5">
                          {lesson.checkpoint_count || 0} questions
                          <span className="mx-1.5 text-gray-700">/</span>
                          {lesson.timer_seconds}s timer
                          {count > 0 && (
                            <>
                              <span className="mx-1.5 text-gray-700">/</span>
                              {count} session{count !== 1 ? 's' : ''} run
                            </>
                          )}
                        </p>
                      </div>
                      <span className="text-gray-600 text-sm">&rarr;</span>
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
