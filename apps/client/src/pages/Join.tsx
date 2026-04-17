import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function Join() {
  const navigate = useNavigate();
  const params = useParams<{ code?: string }>();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (params.code) {
      setCode(params.code.toUpperCase().slice(0, 6));
    }
  }, [params.code]);

  const isValid = code.length === 6 && name.trim().length > 0 && name.trim().length <= 20;

  async function handleJoin() {
    if (!isValid) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE}/api/join/${code.toUpperCase()}`);
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Invalid code');
        return;
      }

      const data = await res.json();
      if (data.status !== 'lobby') {
        setError('This game has already started');
        return;
      }

      navigate('/lobby', {
        state: {
          joinCode: code.toUpperCase(),
          displayName: name.trim(),
          sessionId: data.sessionId,
          lessonTitle: data.lessonTitle,
        },
      });
    } catch {
      setError('Could not connect to server');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <form
        onSubmit={(e) => { e.preventDefault(); handleJoin(); }}
        className="bg-surface rounded-2xl p-8 w-full max-w-md border border-line arcade-border"
      >
        <p className="text-center font-arcade text-accent text-[10px] tracking-widest mb-1">
          QUIZDASH
        </p>
        <h2 className="text-2xl font-bold text-white mb-6 text-center">Join Game</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-dim text-xs mb-1">Game Code</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
              placeholder="ABCDEF"
              className="w-full px-4 py-3 rounded-lg bg-surface-alt border border-line text-white text-center text-2xl font-mono tracking-widest placeholder-dim focus:outline-none focus:border-accent transition-colors"
              maxLength={6}
              autoFocus
            />
          </div>

          <div>
            <label className="block text-dim text-xs mb-1">Your Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 20))}
              placeholder="Enter your name"
              className="w-full px-4 py-3 rounded-lg bg-surface-alt border border-line text-white placeholder-dim focus:outline-none focus:border-accent transition-colors"
              maxLength={20}
            />
          </div>

          {error && (
            <div className="bg-danger/10 border border-danger/40 text-danger px-4 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!isValid || loading}
            className="w-full py-3 bg-accent hover:bg-accent-hover disabled:bg-surface-alt disabled:text-dim text-white font-bold rounded-lg transition-colors text-lg shadow-[0_0_20px_rgba(33,33,222,0.3)]"
          >
            {loading ? 'Joining...' : 'Join Game'}
          </button>
        </div>
      </form>
    </div>
  );
}
