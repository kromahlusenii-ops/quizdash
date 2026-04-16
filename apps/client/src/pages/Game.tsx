import { useLocation, useSearchParams } from 'react-router-dom';
import PacManGame from '../game/PacManGame';

interface GameState {
  playerId: string;
  sessionId: string;
  role: 'student' | 'instructor';
}

export default function Game() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const state = location.state as GameState | null;
  const role = searchParams.get('role') as 'student' | 'instructor' || state?.role || 'student';

  return (
    <div className={`${role === 'student' ? 'h-screen' : ''} bg-black`}>
      <PacManGame
        role={role}
        playerId={state?.playerId || ''}
        sessionId={state?.sessionId || ''}
      />
    </div>
  );
}
