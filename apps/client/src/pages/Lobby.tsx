import { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSessionPolling } from '../ws/useSessionPolling';

const API_BASE = import.meta.env.VITE_API_URL || '';

interface LobbyState {
  joinCode: string;
  displayName: string;
  sessionId: string;
  lessonTitle: string;
}

export default function Lobby() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LobbyState | null;
  const { onMessage, state: sessionState } = useSessionPolling(state?.sessionId || null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const joinedRef = useRef(false);

  useEffect(() => {
    if (!state) { navigate('/join'); return; }
    const unsub = onMessage((msg: any) => {
      if (msg.type === 'game_launched') {
        navigate('/game', { state: { playerId, sessionId: state.sessionId, role: 'student' } });
      }
    });
    return unsub;
  }, [state, onMessage, navigate, playerId]);

  useEffect(() => {
    if (!state || !playerId || !sessionState) return;
    if (sessionState.session.status === 'running') {
      navigate('/game', { state: { playerId, sessionId: state.sessionId, role: 'student' } });
    }
  }, [sessionState, state, playerId, navigate]);

  useEffect(() => {
    if (state && !joinedRef.current) {
      joinedRef.current = true;
      joinSession();
    }
  }, [state]);

  async function joinSession() {
    if (!state) return;
    try {
      const res = await fetch(`${API_BASE}/api/sessions/${state.sessionId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: state.displayName, joinCode: state.joinCode }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to join session');
        return;
      }
      const data = await res.json();
      setPlayerId(data.playerId);
    } catch { setError('Could not connect to server'); }
  }

  if (!state) return null;

  const players = sessionState?.players ?? [];

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-4">
      <div className="bg-surface rounded-2xl p-8 w-full max-w-md text-center border border-line arcade-border">
        <p className="font-arcade text-accent text-[10px] tracking-widest mb-2">QUIZDASH</p>
        <h2 className="text-xl font-bold text-white mb-1">{state.lessonTitle}</h2>
        <p className="text-dim text-sm mb-6">
          Waiting for instructor to start
          <span className="animate-pulse">...</span>
        </p>

        {error && (
          <div className="bg-danger/10 border border-danger/40 text-danger px-4 py-2 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}

        <div className="bg-surface-alt rounded-xl p-4 mb-4 border border-line">
          <p className="text-muted text-xs mb-2">Players ({players.length})</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {players.map((p) => (
              <span
                key={p.id}
                className={`px-3 py-1 rounded-full text-xs ${
                  p.id === playerId
                    ? 'bg-accent text-white'
                    : 'bg-surface text-muted border border-line'
                }`}
              >
                {p.displayName}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
