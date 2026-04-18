import { type ReactNode } from 'react';

interface OnboardingTooltipProps {
  step: number;
  currentStep: number | null;
  position?: 'top' | 'bottom';
  message: string;
  cta?: string;
  onAdvance: () => void;
  onSkip: () => void;
  children: ReactNode;
}

export default function OnboardingTooltip({
  step,
  currentStep,
  position = 'top',
  message,
  cta = 'Got it',
  onAdvance,
  onSkip,
  children,
}: OnboardingTooltipProps) {
  const isActive = step === currentStep;

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {children}

      {isActive && (
        <>
          {/* Backdrop pulse ring */}
          <div
            style={{
              position: 'absolute',
              inset: -4,
              border: '2px solid #2121de',
              borderRadius: 12,
              animation: 'tooltipRing 1.5s ease-in-out infinite',
              pointerEvents: 'none',
              zIndex: 49,
            }}
          />

          {/* Tooltip */}
          <div
            style={{
              position: 'absolute',
              [position === 'top' ? 'bottom' : 'top']: 'calc(100% + 16px)',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 280,
              background: '#0a0a0a',
              border: '2px solid #2121de',
              borderRadius: 12,
              padding: '14px 16px',
              zIndex: 50,
              boxShadow: '0 0 30px rgba(33,33,222,0.25)',
              animation: 'tooltipFadeIn 0.3s ease-out',
            }}
          >
            {/* Arrow */}
            <div
              style={{
                position: 'absolute',
                [position === 'top' ? 'bottom' : 'top']: -8,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 0,
                height: 0,
                borderLeft: '8px solid transparent',
                borderRight: '8px solid transparent',
                [position === 'top' ? 'borderTop' : 'borderBottom']: '8px solid #2121de',
              }}
            />

            {/* TIP label */}
            <div
              style={{
                fontFamily: "'Press Start 2P', 'Courier New', monospace",
                fontSize: 8,
                color: '#2121de',
                letterSpacing: 2,
                marginBottom: 8,
              }}
            >
              TIP
            </div>

            {/* Message */}
            <p style={{ fontSize: 13, color: '#fff', lineHeight: 1.5, margin: 0 }}>
              {message}
            </p>

            {/* Actions */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: 12,
              }}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAdvance();
                }}
                style={{
                  fontFamily: "'Press Start 2P', 'Courier New', monospace",
                  fontSize: 9,
                  padding: '8px 16px',
                  background: '#2121de',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                }}
              >
                {cta}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSkip();
                }}
                style={{
                  fontSize: 11,
                  color: '#555',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                Skip tour
              </button>
            </div>
          </div>

          <style>{`
            @keyframes tooltipRing {
              0%, 100% { box-shadow: 0 0 0 0 rgba(33,33,222,0.4); }
              50% { box-shadow: 0 0 0 6px rgba(33,33,222,0); }
            }
            @keyframes tooltipFadeIn {
              from { opacity: 0; transform: translateX(-50%) translateY(${position === 'top' ? '8px' : '-8px'}); }
              to { opacity: 1; transform: translateX(-50%) translateY(0); }
            }
          `}</style>
        </>
      )}
    </div>
  );
}
