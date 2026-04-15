import { useEffect, useRef, useState, useCallback } from 'react';
import { useSessionPolling } from '../ws/useSessionPolling';
import { createPacManGame, type PacManController } from './pacman/pacmanEngine';
import LobbyOverlay from './overlays/LobbyOverlay';
import CountdownOverlay from './overlays/CountdownOverlay';
import CheckpointOverlay from './overlays/CheckpointOverlay';
import LeaderboardOverlay from './overlays/LeaderboardOverlay';
import SpectatorOverlay from './overlays/SpectatorOverlay';
import type { LeaderboardEntry } from '@financegame/shared';

const API_BASE = import.meta.env.VITE_API_URL || '';
const QUESTION_INTERVAL = 5000; // 5 seconds between questions

type GamePhase = 'lobby' | 'countdown' | 'playing' | 'checkpoint' | 'spectator' | 'leaderboard';

interface PacManGameProps {
  role: 'student' | 'instructor';
  playerId: string;
  sessionId: string;
}

interface Question {
  index: number;
  question: string;
  options: string[];
  correctIndex: number;
  fact: string;
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
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(2);

  // Questions loaded from server
  const questionsRef = useRef<Question[]>([]);
  const questionIndexRef = useRef(0);
  const questionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { onMessage, state } = useSessionPolling(sessionId);

  // Track player count from polling state
  useEffect(() => {
    if (state?.players) {
      setPlayerCount(state.players.length);
    }
  }, [state]);

  // Fetch all questions for this session
  const loadQuestions = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/sessions/${sessionId}/questions`);
      if (res.ok) {
        const data = await res.json();
        questionsRef.current = data.questions || [];
        questionIndexRef.current = 0;
      }
    } catch {
      console.warn('Failed to load questions');
    }
  }, [sessionId]);

  // Initialize Pac-Man when game launches
  const initGame = useCallback(async () => {
    if (!canvasRef.current || controllerRef.current) return;

    try {
      const controller = await createPacManGame(canvasRef.current, {
        onGameOver: () => {},
      });
      controllerRef.current = controller;
    } catch (err) {
      console.error('Failed to initialize Pac-Man:', err);
    }
  }, []);

  // Start the auto-question timer
  const startQuestionTimer = useCallback(() => {
    if (questionTimerRef.current) clearInterval(questionTimerRef.current);

    questionTimerRef.current = setInterval(() => {
      const questions = questionsRef.current;
      const idx = questionIndexRef.current;

      if (idx >= questions.length) {
        // All questions asked — cycle back to start
        questionIndexRef.current = 0;
        return;
      }

      const q = questions[idx];
      questionIndexRef.current = idx + 1;

      // Pause game and show question
      if (controllerRef.current) {
        controllerRef.current.pause();
      }
      setCheckpointData({
        checkpointIndex: q.index,
        question: q.question,
        options: q.options,
        timerSeconds: 15,
      });
      setPhase('checkpoint');

      // Pause the question timer while checkpoint is active
      if (questionTimerRef.current) {
        clearInterval(questionTimerRef.current);
        questionTimerRef.current = null;
      }
    }, QUESTION_INTERVAL);
  }, []);

  const stopQuestionTimer = useCallback(() => {
    if (questionTimerRef.current) {
      clearInterval(questionTimerRef.current);
      questionTimerRef.current = null;
    }
  }, []);

  // Check if game already started on mount (late join / page refresh)
  useEffect(() => {
    if (state) {
      const status = state.session?.status;
      if ((status === 'running' || status === 'checkpoint_active') && phase === 'lobby') {
        setPhase('playing');
        initGame();
        loadQuestions().then(() => startQuestionTimer());
      } else if (status === 'ended' && phase !== 'leaderboard') {
        setFinalLeaderboard(state.finalLeaderboard || []);
        setPhase('leaderboard');
      }
    }
  }, [state, phase, initGame, loadQuestions, startQuestionTimer]);

  // Listen for session messages
  useEffect(() => {
    const unsubscribe = onMessage((msg: any) => {
      switch (msg.type) {
        case 'game_launched':
          setPhase('countdown');
          initGame();
          loadQuestions();
          break;

        case 'session_ended':
          stopQuestionTimer();
          if (controllerRef.current) {
            controllerRef.current.pause();
          }
          setFinalLeaderboard(msg.finalLeaderboard || []);
          setPhase('leaderboard');
          break;
      }
    });

    return unsubscribe;
  }, [onMessage, initGame, loadQuestions, stopQuestionTimer]);

  // Handle countdown complete — start playing and start question timer
  const handleCountdownComplete = useCallback(() => {
    setPhase('playing');
    startQuestionTimer();
  }, [startQuestionTimer]);

  // Handle checkpoint completion
  const handleCheckpointComplete = useCallback(
    (wasCorrect: boolean, eliminated: boolean) => {
      if (wasCorrect) {
        setScore((s) => s + 100);
      } else {
        setLives((l) => {
          const newLives = l - 1;
          if (newLives <= 0) {
            // Will be set to spectator below
          }
          return newLives;
        });
      }

      if (eliminated) {
        stopQuestionTimer();
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

      // Restart question timer
      startQuestionTimer();
    },
    [stopQuestionTimer, startQuestionTimer]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopQuestionTimer();
      if (controllerRef.current) {
        controllerRef.current.destroy();
        controllerRef.current = null;
      }
    };
  }, [stopQuestionTimer]);

  const showCanvas = phase !== 'lobby' && phase !== 'leaderboard';

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: role === 'student' ? '100vh' : '400px',
        background: '#000',
        overflow: 'hidden',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: showCanvas ? 'block' : 'none',
        }}
      />

      {phase === 'lobby' && <LobbyOverlay playerCount={playerCount} />}

      {phase === 'countdown' && <CountdownOverlay onComplete={handleCountdownComplete} />}

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
