import { useState, useEffect } from 'react';

interface LobbyOverlayProps {
  playerCount: number;
}

export default function LobbyOverlay({ playerCount }: LobbyOverlayProps) {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((d) => (d.length >= 3 ? '' : d + '.'));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#000',
        color: '#fff',
        fontFamily: "'Press Start 2P', 'Courier New', monospace",
        zIndex: 10,
      }}
    >
      <div
        style={{
          fontSize: '28px',
          color: '#ffff00',
          marginBottom: '20px',
          textShadow: '2px 2px 4px rgba(255,255,0,0.3)',
        }}
      >
        PAC-MAN
      </div>
      <div style={{ fontSize: '16px', marginBottom: '30px' }}>
        Waiting for game to start{dots}
      </div>
      {playerCount > 0 && (
        <div style={{ fontSize: '12px', color: '#aaa' }}>
          {playerCount} player{playerCount !== 1 ? 's' : ''} connected
        </div>
      )}
      <div
        style={{
          marginTop: '40px',
          display: 'flex',
          gap: '10px',
        }}
      >
        {['🔴', '🟣', '🟡', '🔵'].map((ghost, i) => (
          <span
            key={i}
            style={{
              fontSize: '24px',
              animation: `bounce 0.6s ease-in-out ${i * 0.15}s infinite alternate`,
            }}
          >
            {ghost}
          </span>
        ))}
      </div>
      <style>{`
        @keyframes bounce {
          from { transform: translateY(0); }
          to { transform: translateY(-10px); }
        }
      `}</style>
    </div>
  );
}
