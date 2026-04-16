import { useEffect, useRef, useState, useCallback } from 'react';
import { useSessionPolling } from '../ws/useSessionPolling';
import { createPacManGame, type PacManController } from './pacman/pacmanEngine';
import LobbyOverlay from './overlays/LobbyOverlay';
import CountdownOverlay from './overlays/CountdownOverlay';
import QuestionOverlay from './overlays/QuestionOverlay';
import LeaderboardOverlay from './overlays/LeaderboardOverlay';
import SpectatorOverlay from './overlays/SpectatorOverlay';

interface LeaderboardEntry {
  rank: number;
  playerId?: string;
  displayName: string;
  score: number;
  survived: boolean;
}

const API_BASE = import.meta.env.VITE_API_URL || '';
const QUESTION_INTERVAL_MS = 5_000; // 5s of gameplay between questions

type GamePhase = 'lobby' | 'countdown' | 'playing' | 'question' | 'spectator' | 'leaderboard';

interface PacManGameProps {
  role: 'student' | 'instructor';
  playerId: string;
  sessionId: string;
}

interface Question {
  index: number;
  question: string;
  options: string[];
}

export default function PacManGame({ role, playerId, sessionId }: PacManGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controllerRef = useRef<PacManController | null>(null);

  const [phase, setPhase] = useState<GamePhase>('lobby');
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [finalLeaderboard, setFinalLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [playerCount, setPlayerCount] = useState(0);

  // HUD
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(2);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);

  // Per-player randomized queue of questions yet to ask
  const questionQueueRef = useRef<Question[]>([]);
  const questionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { onMessage, state } = useSessionPolling(sessionId);

  useEffect(() => {
    if (state?.players) {
      setPlayerCount(state.players.length);
      const me = state.players.find((p) => p.id === playerId);
      if (me) {
        setScore(me.score);
        setLives(me.lives);
        setQuestionsAnswered(me.questionsAnswered);
      }
      setTotalQuestions(state.session.totalQuestions);
    }
  }, [state, playerId]);

  // Load + shuffle questions
  const loadQuestions = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/sessions/${sessionId}/questions`);
      if (!res.ok) return;
      const data = await res.json();
      const questions: Question[] = data.questions || [];
      // Fisher-Yates shuffle per player
      for (let i = questions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [questions[i], questions[j]] = [questions[j], questions[i]];
      }
      questionQueueRef.current = questions;
      setTotalQuestions(questions.length);
    } catch {
      console.warn('Failed to load questions');
    }
  }, [sessionId]);

  const initGame = useCallback(async () => {
    if (!canvasRef.current || controllerRef.current) return;
    try {
      const controller = await createPacManGame(canvasRef.current, { onGameOver: () => {} });
      controllerRef.current = controller;
    } catch (err) {
      console.error('Failed to initialize Pac-Man:', err);
    }
  }, []);

  const stopQuestionTimer = useCallback(() => {
    if (questionTimerRef.current) {
      clearInterval(questionTimerRef.current);
      questionTimerRef.current = null;
    }
  }, []);

  const startQuestionTimer = useCallback(() => {
    stopQuestionTimer();
    // If queue is already empty, don't bother scheduling.
    if (questionQueueRef.current.length === 0) return;

    questionTimerRef.current = setInterval(() => {
      const q = questionQueueRef.current.shift();
      if (!q) {
        // Queue exhausted — student keeps playing without further interruptions.
        stopQuestionTimer();
        return;
      }

      if (controllerRef.current) controllerRef.current.pause();
      setCurrentQuestion(q);
      setPhase('question');
      stopQuestionTimer(); // pause scheduling while modal is open
    }, QUESTION_INTERVAL_MS);
  }, [stopQuestionTimer]);

  // Late-join / refresh while already running
  useEffect(() => {
    if (!state) return;
    const status = state.session.status;
    if (status === 'running' && phase === 'lobby') {
      setPhase('playing');
      initGame();
      loadQuestions().then(() => startQuestionTimer());
    } else if (status === 'ended' && phase !== 'leaderboard') {
      setFinalLeaderboard(state.finalLeaderboard || []);
      setPhase('leaderboard');
    }
  }, [state, phase, initGame, loadQuestions, startQuestionTimer]);

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
          controllerRef.current?.pause();
          setFinalLeaderboard(msg.finalLeaderboard || []);
          setPhase('leaderboard');
          break;
      }
    });
    return unsubscribe;
  }, [onMessage, initGame, loadQuestions, stopQuestionTimer]);

  const handleCountdownComplete = useCallback(() => {
    setPhase('playing');
    startQuestionTimer();
  }, [startQuestionTimer]);

  const handleQuestionClose = useCallback(
    (wasCorrect: boolean, eliminated: boolean) => {
      setCurrentQuestion(null);

      if (eliminated) {
        stopQuestionTimer();
        setPhase('spectator');
        return;
      }

      setPhase('playing');
      if (controllerRef.current) {
        controllerRef.current.resume();
        if (wasCorrect) controllerRef.current.triggerEnergizer();
      }
      startQuestionTimer();
    },
    [stopQuestionTimer, startQuestionTimer]
  );

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
  const showHUD = phase === 'playing' || phase === 'question' || phase === 'spectator';

  // Spectator sees live top players
  const spectatorBoard = (state?.players ?? [])
    .slice()
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map((p, i) => ({ rank: i + 1, displayName: p.displayName, score: p.score }));

  return (
    <div
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
      <canvas ref={canvasRef} style={{ display: showCanvas ? 'block' : 'none' }} />

      {showHUD && (
        <div
          style={{
            position: 'absolute',
            top: 8,
            left: 8,
            right: 8,
            display: 'flex',
            justifyContent: 'space-between',
            gap: 12,
            pointerEvents: 'none',
            zIndex: 5,
            fontFamily: "'Press Start 2P', 'Courier New', monospace",
            fontSize: 10,
            color: '#fff',
            textShadow: '1px 1px 0 #000',
          }}
        >
          <span>SCORE {score}</span>
          <span style={{ color: '#ffd700' }}>
            Q {questionsAnswered}/{totalQuestions}
          </span>
          <span style={{ color: '#ff6666' }}>
            {'♥'.repeat(Math.max(0, lives))}
            <span style={{ color: '#444' }}>{'♥'.repeat(Math.max(0, 2 - lives))}</span>
          </span>
        </div>
      )}

      {phase === 'lobby' && <LobbyOverlay playerCount={playerCount} />}

      {phase === 'countdown' && <CountdownOverlay onComplete={handleCountdownComplete} />}

      {phase === 'question' && currentQuestion && (
        <QuestionOverlay
          question={currentQuestion}
          questionsAnswered={questionsAnswered}
          totalQuestions={totalQuestions}
          sessionId={sessionId}
          playerId={playerId}
          runScore={controllerRef.current?.getScore() || 0}
          onClose={handleQuestionClose}
        />
      )}

      {phase === 'spectator' && <SpectatorOverlay leaderboard={spectatorBoard} />}

      {phase === 'leaderboard' && (
        <LeaderboardOverlay leaderboard={finalLeaderboard} playerId={playerId} />
      )}
    </div>
  );
}
