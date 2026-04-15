import { useState, useEffect } from 'react';

interface CountdownOverlayProps {
  onComplete: () => void;
}

const STEPS = ['3', '2', '1', 'GO!'];
const STEP_DURATION = 900; // ms per step

export default function CountdownOverlay({ onComplete }: CountdownOverlayProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [animKey, setAnimKey] = useState(0);

  useEffect(() => {
    if (stepIndex >= STEPS.length) {
      const timeout = setTimeout(onComplete, 400);
      return () => clearTimeout(timeout);
    }

    const timeout = setTimeout(() => {
      setStepIndex((i) => i + 1);
      setAnimKey((k) => k + 1);
    }, STEP_DURATION);

    return () => clearTimeout(timeout);
  }, [stepIndex, onComplete]);

  if (stepIndex >= STEPS.length) return null;

  const isGo = STEPS[stepIndex] === 'GO!';

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.75)',
        zIndex: 15,
      }}
    >
      <div
        key={animKey}
        style={{
          fontSize: isGo ? '72px' : '96px',
          fontWeight: 'bold',
          color: isGo ? '#2ecc71' : '#ffff00',
          textShadow: `0 0 30px ${isGo ? 'rgba(46,204,113,0.6)' : 'rgba(255,255,0,0.5)'}, 0 0 60px ${isGo ? 'rgba(46,204,113,0.3)' : 'rgba(255,255,0,0.25)'}`,
          fontFamily: "'Press Start 2P', 'Courier New', monospace",
          animation: 'countdownPop 0.8s ease-out',
        }}
      >
        {STEPS[stepIndex]}
      </div>

      <style>{`
        @keyframes countdownPop {
          0% {
            transform: scale(2);
            opacity: 0;
          }
          30% {
            transform: scale(1);
            opacity: 1;
          }
          80% {
            transform: scale(1);
            opacity: 1;
          }
          100% {
            transform: scale(0.8);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
