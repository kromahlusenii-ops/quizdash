import { useEffect, useRef, useState, useCallback } from 'react';
import { useSessionPolling } from '../ws/useSessionPolling';
import { createPacManGame, type PacManController } from './pacman/pacmanEngine';
import LobbyOverlay from './overlays/LobbyOverlay';
import CheckpointOverlay from './overlays/CheckpointOverlay';
import LeaderboardOverlay from './overlays/LeaderboardOverlay';
import SpectatorOverlay from './overlays/SpectatorOverlay';
import type { LeaderboardEntry } from '@financegame/shared';

type GamePhase = 'lobby' | 'playing' | 'checkpoint' | 'spectator' | 'leaderboard';

interface PacManGameProps {
  role: 'student' | 'instructor';
  playerId: string;
  sessionId: string;
}

interface CheckpointData {
  checkpointIndex: number;
  question: string;
  options: string[];
  timerSeconds: number;
}

export default function PacManGame({ role, playerId, sessionId }: PacManGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controllerRef = useRef<PacManController | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [phase, setPhase] = useState<GamePhase>('lobby');
  const [checkpointData, setCheckpointData] = useState<CheckpointData | null>(null);
  const [finalLeaderboard, setFinalLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [spectatorLeaderboard, setSpectatorLeaderboard] = useState<
    Array<{ rank: number; displayName: string; score: number }>
  >([]);
  const [playerCount, setPlayerCount] = useState(0);

  const { onMessage, state } = useSessionPolling(sessionId);

  // Track player count from polling state
  useEffect(() => {
    if (state?.players) {
      setPlayerCount(state.players.length);
    }
  }, [state]);

  // Initialize Pac-Man when game launches
  const initGame = useCallback(async () => {
    if (!canvasRef.current || controllerRef.current) return;

    try {
      const controller = await createPacManGame(canvasRef.current, {
        onGameOver: () => {
          // Pac-Man game over (all lives lost in-game)
          // This is separate from checkpoint elimination
        },
      });
      controllerRef.current = controller;
    } catch (err) {
      console.error('Failed to initialize Pac-Man:', err);
    }
  }, []);

  // Check if game already started on mount (late join / page refresh)
  useEffect(() => {
    if (state) {
      const status = state.session?.status;
      if ((status === 'running' || status === 'checkpoint_active') && phase === 'lobby') {
        setPhase('playing');
        initGame();

        if (status === 'checkpoint_active' && state.checkpoint) {
          // Arrived during active checkpoint
          setCheckpointData({
            checkpointIndex: state.checkpoint.checkpointIndex,
            question: state.checkpoint.question,
            options: state.checkpoint.options,
            timerSeconds: state.checkpoint.timerSeconds,
          });
          setPhase('checkpoint');
        }
      } else if (status === 'ended' && phase !== 'leaderboard') {
        setFinalLeaderboard(state.finalLeaderboard || []);
        setPhase('leaderboard');
      }
    }
  }, [state, phase, initGame]);

  // Listen for session messages
  useEffect(() => {
    const unsubscribe = onMessage((msg: any) => {
      switch (msg.type) {
        case 'game_launched':
          setPhase('playing');
          initGame();
          break;

        case 'checkpoint_start':
          if (controllerRef.current) {
            controllerRef.current.pause();
          }
          setCheckpointData({
            checkpointIndex: msg.checkpointIndex,
            question: msg.question,
            options: msg.options,
            timerSeconds: msg.timerSeconds,
          });
          setPhase('checkpoint');
          break;

        case 'checkpoint_results':
          if (msg.leaderboard) {
            setSpectatorLeaderboard(msg.leaderboard);
          }
          break;

        case 'session_ended':
          if (controllerRef.current) {
            controllerRef.current.pause();
          }
          setFinalLeaderboard(msg.finalLeaderboard || []);
          setPhase('leaderboard');
          break;
      }
    });

    return unsubscribe;
  }, [onMessage, initGame]);

  // Handle checkpoint completion
  const handleCheckpointComplete = useCallback(
    (wasCorrect: boolean, eliminated: boolean) => {
      if (eliminated) {
        setPhase('spectator');
        return;
      }

      setPhase('playing');
      setCheckpointData(null);

      if (controllerRef.current) {
        controllerRef.current.resume();
        if (wasCorrect) {
          controllerRef.current.triggerEnergizer();
        }
      }
    },
    []
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (controllerRef.current) {
        controllerRef.current.destroy();
        controllerRef.current = null;
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: role === 'student' ? '100vh' : '400px',
        background: '#000',
        overflow: 'hidden',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: phase === 'lobby' || phase === 'leaderboard' ? 'none' : 'block',
          margin: '0 auto',
        }}
      />

      {phase === 'lobby' && <LobbyOverlay playerCount={playerCount} />}

      {phase === 'checkpoint' && checkpointData && (
        <CheckpointOverlay
          data={checkpointData}
          sessionId={sessionId}
          playerId={playerId}
          runScore={controllerRef.current?.getScore() || 0}
          onComplete={handleCheckpointComplete}
        />
      )}

      {phase === 'spectator' && <SpectatorOverlay leaderboard={spectatorLeaderboard} />}

      {phase === 'leaderboard' && (
        <LeaderboardOverlay leaderboard={finalLeaderboard} playerId={playerId} />
      )}
    </div>
  );
}
