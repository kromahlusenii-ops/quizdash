import { useRef, useEffect, useState, useCallback } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || '';
const POLL_INTERVAL = 1500;

type MessageHandler = (message: any) => void;

export interface PlayerStats {
  id: string;
  displayName: string;
  score: number;
  lives: number;
  status: 'alive' | 'eliminated' | 'disconnected';
  questionsAnswered: number;
  questionsCorrect: number;
}

export interface SessionState {
  session: {
    id: string;
    status: 'lobby' | 'running' | 'ended';
    totalQuestions: number;
  };
  players: PlayerStats[];
  aggregate: Record<number, Record<number, number>>;
  finalLeaderboard?: any[];
}

function detectTransitions(prev: SessionState | null, next: SessionState): any[] {
  const messages: any[] = [];
  if (!prev) return messages;

  const prevStatus = prev.session.status;
  const nextStatus = next.session.status;

  if (prevStatus === 'lobby' && nextStatus === 'running') {
    messages.push({ type: 'game_launched', totalQuestions: next.session.totalQuestions });
  }

  if (prevStatus !== 'ended' && nextStatus === 'ended') {
    messages.push({ type: 'session_ended', finalLeaderboard: next.finalLeaderboard });
  }

  return messages;
}

export function useSessionPolling(sessionId: string | null) {
  const [state, setState] = useState<SessionState | null>(null);
  const prevStateRef = useRef<SessionState | null>(null);
  const handlersRef = useRef(new Set<MessageHandler>());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const poll = useCallback(async () => {
    if (!sessionId) return;
    try {
      const res = await fetch(`${API_BASE}/api/sessions/${sessionId}/state`);
      if (!res.ok) return;
      const next: SessionState = await res.json();

      const messages = detectTransitions(prevStateRef.current, next);
      prevStateRef.current = next;
      setState(next);

      for (const msg of messages) {
        handlersRef.current.forEach((h) => h(msg));
      }
    } catch {
      // Network blip; next tick will retry
    }
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;

    prevStateRef.current = null;
    setState(null);

    poll();
    intervalRef.current = setInterval(poll, POLL_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [sessionId, poll]);

  const onMessage = useCallback((handler: MessageHandler): (() => void) => {
    handlersRef.current.add(handler);
    return () => {
      handlersRef.current.delete(handler);
    };
  }, []);

  return { onMessage, isConnected: !!state, state };
}
