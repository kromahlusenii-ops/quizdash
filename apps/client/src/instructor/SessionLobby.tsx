import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAuthHeaders } from '../lib/supabase';
import { useSessionPolling } from '../ws/useSessionPolling';
import { getOnboardingStep, completeOnboarding } from '../lib/onboarding';
import OnboardingTooltip from '../components/OnboardingTooltip';
import QRCode from 'qrcode';

const API_BASE = import.meta.env.VITE_API_URL || '';
const APP_URL = import.meta.env.VITE_APP_URL || window.location.origin;

export default function SessionLobby() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { state: sessionState } = useSessionPolling(id || null);
  const [joinCode, setJoinCode] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const initialized = useRef(false);
  const [obStep, setObStep] = useState<number | null>(getOnboardingStep());
  const obDone = useCallback(() => { completeOnboarding(); setObStep(null); }, []);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    loadSession();
  }, []);

  async function loadSession() {
    try {
      const res = await fetch(`${API_BASE}/api/sessions`, { headers: getAuthHeaders() });
      if (!res.ok) return;
      const sessions = await res.json();
      const current = sessions.find((s: { id: string }) => s.id === id);
      if (current) {
        setJoinCode(current.join_code);
        const joinUrl = `${APP_URL}/join/${current.join_code}`;
        try {
          const qr = await QRCode.toDataURL(joinUrl, { width: 200, margin: 2, color: { dark: '#2121de', light: '#000000' } });
          setQrDataUrl(qr);
        } catch {}
      }
    } catch {}
  }

  const players = (sessionState?.players ?? []).map((p) => ({ id: p.id, name: p.displayName }));

  async function launchGame() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/sessions/${id}/launch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      });
      if (res.ok) navigate(`/instructor/sessions/${id}/live`);
      else { const d = await res.json(); alert(d.error || 'Failed to launch'); }
    } catch { alert('Failed to launch game'); }
    finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-bg text-white">
      <header className="border-b border-line px-6 py-4">
        <h1 className="font-arcade text-sm text-accent">SESSION LOBBY</h1>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        <div className="grid md:grid-cols-2 gap-8">
          <div className="text-center">
            <p className="text-dim text-xs mb-2">JOIN CODE</p>
            <OnboardingTooltip
              step={5}
              currentStep={obStep}
              position="bottom"
              message="Share this code with students. They join at quizdash.vercel.app/join. Launch when ready!"
              cta="Done"
              onAdvance={obDone}
              onSkip={obDone}
            >
              <div
                className="text-5xl font-mono font-bold tracking-[0.3em] bg-surface border border-accent-blue rounded-xl py-6 cursor-pointer hover:border-accent-hover transition-colors shadow-[0_0_30px_rgba(33,33,222,0.15)]"
                onClick={() => navigator.clipboard.writeText(joinCode)}
                title="Click to copy"
              >
                {joinCode}
              </div>
            </OnboardingTooltip>
            <p className="text-dim text-xs mt-2">Click to copy</p>

            {qrDataUrl && (
              <div className="mt-4 flex justify-center">
                <img src={qrDataUrl} alt="QR Code" className="rounded-lg" />
              </div>
            )}

            <p className="text-dim mt-2 text-xs">
              {APP_URL}/join/{joinCode}
            </p>
          </div>

          <div>
            <h3 className="text-[10px] font-arcade text-muted tracking-wider mb-4">
              PLAYERS ({players.length}/50)
            </h3>

            <div className="bg-surface border border-line rounded-xl p-4 min-h-[200px] max-h-[400px] overflow-y-auto">
              {players.length === 0 ? (
                <p className="text-dim text-center py-8 text-xs">Waiting for players to join...</p>
              ) : (
                <div className="space-y-1">
                  {players.map((p) => (
                    <div key={p.id} className="flex items-center gap-2 px-3 py-2 bg-surface-alt rounded-lg">
                      <div className="w-2 h-2 rounded-full bg-success" />
                      <span className="text-sm">{p.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={launchGame}
              disabled={players.length === 0 || loading}
              className="w-full mt-4 py-4 bg-accent hover:bg-accent-hover disabled:bg-surface disabled:text-dim disabled:cursor-not-allowed text-white font-arcade text-xs rounded-xl transition-colors shadow-[0_0_20px_rgba(33,33,222,0.3)]"
            >
              {loading ? 'LAUNCHING...' : 'LAUNCH GAME'}
            </button>

            {players.length === 0 && (
              <p className="text-gold text-xs text-center mt-2">Need at least 1 player</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
