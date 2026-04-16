import { useState, useEffect, useRef, useCallback } from 'react';

const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || '';
const TIMER_SECONDS = 15;
const RESULT_DURATION_MS = 3000;

const OPTION_COLORS = ['#e74c3c', '#3498db', '#f1c40f', '#2ecc71'];

interface Question {
  index: number;
  question: string;
  options: string[];
}

interface AnswerResult {
  correct: boolean;
  correctIndex: number;
  pointsAwarded: number;
  livesRemaining: number;
  newStatus: 'alive' | 'eliminated';
  fact: string;
}

interface Props {
  question: Question;
  questionsAnswered: number;
  totalQuestions: number;
  sessionId: string;
  playerId: string;
  runScore: number;
  onClose: (wasCorrect: boolean, eliminated: boolean) => void;
}

export default function QuestionOverlay({
  question,
  questionsAnswered,
  totalQuestions,
  sessionId,
  playerId,
  runScore,
  onClose,
}: Props) {
  const [secondsLeft, setSecondsLeft] = useState(TIMER_SECONDS);
  const [answered, setAnswered] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Countdown
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          setAnswered(true); // time out → locked
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
          body: JSON.stringify({
            playerId,
            questionIndex: question.index,
            selectedIndex: index,
            runScore,
          }),
        });

        if (res.ok) {
          const data: AnswerResult = await res.json();
          setResult(data);
        } else {
          const err = await res.json().catch(() => ({ error: 'Answer rejected' }));
          setSubmitError(err.error || 'Answer rejected');
        }
      } catch {
        setSubmitError('Network error');
      }
    },
    [answered, sessionId, playerId, question.index, runScore]
  );

  // Auto-close after result
  useEffect(() => {
    if (result) {
      const eliminated = result.newStatus === 'eliminated';
      const t = setTimeout(() => onClose(result.correct, eliminated), RESULT_DURATION_MS);
      return () => clearTimeout(t);
    }
  }, [result, onClose]);

  // On error OR on time-out with no answer, close after a short delay
  useEffect(() => {
    if (submitError) {
      const t = setTimeout(() => onClose(false, false), 1500);
      return () => clearTimeout(t);
    }
  }, [submitError, onClose]);

  useEffect(() => {
    if (answered && secondsLeft === 0 && !result && !submitError && selectedIndex === null) {
      const t = setTimeout(() => onClose(false, false), 1500);
      return () => clearTimeout(t);
    }
  }, [answered, secondsLeft, result, submitError, selectedIndex, onClose]);

  const progress = secondsLeft / TIMER_SECONDS;
  const circumference = 2 * Math.PI * 22;
  const dashOffset = circumference * (1 - progress);
  const timerColor = secondsLeft <= 5 ? '#ff4444' : '#00ff88';

  return (
    <div
      // stopPropagation so vendor pacman touch handlers on ancestors can't
      // preventDefault our taps (see pacman/vendor/input.js::initSwipe)
      onTouchStart={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        background: 'rgba(0, 0, 0, 0.88)',
        zIndex: 20,
        padding: '20px',
        overflowY: 'auto',
        touchAction: 'manipulation',
        pointerEvents: 'auto',
      }}
    >
      <div
        style={{
          fontSize: '12px',
          color: '#ffaa00',
          fontWeight: 'bold',
          marginTop: '32px',
          fontFamily: "'Press Start 2P', 'Courier New', monospace",
          letterSpacing: 1,
        }}
      >
        QUESTION {questionsAnswered + 1} / {totalQuestions}
      </div>

      <div style={{ position: 'relative', margin: '14px 0' }}>
        <svg width="54" height="54" viewBox="0 0 54 54">
          <circle cx="27" cy="27" r="22" fill="none" stroke="#333" strokeWidth="4" />
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

      <div
        style={{
          fontSize: '16px',
          color: '#fff',
          textAlign: 'center',
          maxWidth: '480px',
          lineHeight: 1.5,
          marginBottom: '20px',
        }}
      >
        {question.question}
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          width: '100%',
          maxWidth: '460px',
        }}
      >
        {question.options.map((opt, i) => {
          let bgColor = OPTION_COLORS[i];
          let opacity = 1;
          if (result) {
            if (i === result.correctIndex) bgColor = '#2ecc71';
            else opacity = 0.3;
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

      {result && (
        <div style={{ marginTop: '18px', textAlign: 'center', maxWidth: 460 }}>
          {result.correct ? (
            <>
              <div style={{ fontSize: '22px', color: '#2ecc71', fontWeight: 'bold' }}>
                Correct!
              </div>
              {result.pointsAwarded > 0 && (
                <div
                  style={{
                    fontSize: '18px',
                    color: '#ffd700',
                    fontWeight: 'bold',
                    marginTop: '4px',
                  }}
                >
                  +{result.pointsAwarded} pts
                </div>
              )}
              <div style={{ fontSize: '11px', color: '#00ff88', marginTop: '8px' }}>
                Ghosts vulnerable — go hunt them!
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: '22px', color: '#e74c3c', fontWeight: 'bold' }}>
                Wrong — lost a life
              </div>
              {result.fact && (
                <div
                  style={{
                    fontSize: '12px',
                    color: '#bbb',
                    marginTop: '10px',
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
                fontSize: '14px',
                color: '#ff4444',
                fontWeight: 'bold',
                marginTop: '12px',
              }}
            >
              You're out — spectating from here.
            </div>
          )}
        </div>
      )}

      {submitError && !result && (
        <div
          style={{
            marginTop: '18px',
            fontSize: '12px',
            color: '#ff8888',
          }}
        >
          {submitError}
        </div>
      )}
    </div>
  );
}
