import { useState, useEffect, useRef, useCallback } from 'react';

const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || '';

const OPTION_COLORS = ['#e74c3c', '#3498db', '#f1c40f', '#2ecc71'];

interface CheckpointData {
  checkpointIndex: number;
  question: string;
  options: string[];
  timerSeconds: number;
}

interface AnswerResult {
  correct?: boolean;
  correctIndex?: number;
  pointsAwarded?: number;
  fact?: string;
  newStatus?: string;
}

interface CheckpointOverlayProps {
  data: CheckpointData;
  sessionId: string;
  playerId: string;
  runScore: number;
  onComplete: (wasCorrect: boolean, eliminated: boolean) => void;
}

export default function CheckpointOverlay({
  data,
  sessionId,
  playerId,
  runScore,
  onComplete,
}: CheckpointOverlayProps) {
  const [secondsLeft, setSecondsLeft] = useState(data.timerSeconds);
  const [answered, setAnswered] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const wasCorrectRef = useRef(false);
  const eliminatedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          setAnswered(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const submitAnswer = useCallback(
    async (index: number) => {
      if (answered) return;
      setAnswered(true);
      setSelectedIndex(index);

      try {
        const res = await fetch(`${API_BASE}/api/sessions/${sessionId}/answer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerId, selectedIndex: index, runScore }),
        });
        if (res.ok) {
          const data: AnswerResult = await res.json();
          setResult(data);
          wasCorrectRef.current = !!data.correct;
          if (data.newStatus === 'eliminated') {
            eliminatedRef.current = true;
          }
        }
      } catch {
        // Network error
      }
    },
    [answered, sessionId, playerId, runScore]
  );

  const handleResultsDone = useCallback(() => {
    onComplete(wasCorrectRef.current, eliminatedRef.current);
  }, [onComplete]);

  // Auto-close after showing results for 3 seconds
  useEffect(() => {
    if (result) {
      const timeout = setTimeout(handleResultsDone, 3000);
      return () => clearTimeout(timeout);
    }
  }, [result, handleResultsDone]);

  const progress = secondsLeft / data.timerSeconds;
  const circumference = 2 * Math.PI * 22;
  const dashOffset = circumference * (1 - progress);
  const timerColor = secondsLeft <= 5 ? '#ff4444' : '#00ff88';

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        background: 'rgba(0, 0, 0, 0.85)',
        zIndex: 20,
        padding: '20px',
        overflowY: 'auto',
      }}
    >
      {/* Checkpoint badge */}
      <div
        style={{
          fontSize: '14px',
          color: '#ffaa00',
          fontWeight: 'bold',
          marginTop: '40px',
        }}
      >
        Checkpoint #{data.checkpointIndex + 1}
      </div>

      {/* Timer */}
      <div style={{ position: 'relative', margin: '15px 0' }}>
        <svg width="54" height="54" viewBox="0 0 54 54">
          <circle
            cx="27"
            cy="27"
            r="22"
            fill="none"
            stroke="#333"
            strokeWidth="4"
          />
          <circle
            cx="27"
            cy="27"
            r="22"
            fill="none"
            stroke={timerColor}
            strokeWidth="4"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            transform="rotate(-90 27 27)"
            style={{ transition: 'stroke-dashoffset 1s linear' }}
          />
        </svg>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            fontWeight: 'bold',
            color: timerColor,
          }}
        >
          {Math.max(0, secondsLeft)}
        </div>
      </div>

      {/* Question */}
      <div
        style={{
          fontSize: '15px',
          color: '#fff',
          textAlign: 'center',
          maxWidth: '420px',
          lineHeight: 1.5,
          marginBottom: '20px',
        }}
      >
        {data.question}
      </div>

      {/* Options */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', maxWidth: '420px' }}>
        {data.options.map((opt, i) => {
          let bgColor = OPTION_COLORS[i];
          let opacity = 1;

          if (result) {
            if (i === result.correctIndex) {
              bgColor = '#2ecc71';
            } else {
              opacity = 0.3;
            }
          }

          const isSelected = selectedIndex === i;

          return (
            <button
              key={i}
              onClick={() => submitAnswer(i)}
              disabled={answered}
              style={{
                background: bgColor,
                opacity,
                border: isSelected ? '3px solid #fff' : '3px solid transparent',
                borderRadius: '8px',
                padding: '12px 16px',
                color: '#fff',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: answered ? 'default' : 'pointer',
                textAlign: 'left',
                transition: 'opacity 0.3s',
              }}
            >
              {String.fromCharCode(65 + i)}. {opt}
            </button>
          );
        })}
      </div>

      {/* Result */}
      {result && (
        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          {result.correct ? (
            <>
              <div style={{ fontSize: '22px', color: '#2ecc71', fontWeight: 'bold' }}>
                Correct!
              </div>
              {result.pointsAwarded != null && (
                <div
                  style={{
                    fontSize: '18px',
                    color: '#ffd700',
                    fontWeight: 'bold',
                    marginTop: '4px',
                    animation: 'pulse 0.3s ease-in-out',
                  }}
                >
                  +{result.pointsAwarded} pts
                </div>
              )}
              <div style={{ fontSize: '12px', color: '#00ff88', marginTop: '8px' }}>
                Power-up activated! Ghosts are vulnerable!
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: '22px', color: '#e74c3c', fontWeight: 'bold' }}>
                Wrong! +0 pts
              </div>
              {result.fact && (
                <div
                  style={{
                    fontSize: '11px',
                    color: '#aaa',
                    marginTop: '8px',
                    maxWidth: '380px',
                    lineHeight: 1.4,
                  }}
                >
                  {result.fact}
                </div>
              )}
            </>
          )}
          {result.newStatus === 'eliminated' && (
            <div
              style={{
                fontSize: '16px',
                color: '#ff4444',
                fontWeight: 'bold',
                marginTop: '16px',
              }}
            >
              You have been eliminated!
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.3); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
