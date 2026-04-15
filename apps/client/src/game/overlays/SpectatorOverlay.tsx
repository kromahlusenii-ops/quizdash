interface SpectatorOverlayProps {
  leaderboard?: Array<{ rank: number; displayName: string; score: number }>;
}

export default function SpectatorOverlay({ leaderboard }: SpectatorOverlayProps) {
  return (
    <>
      {/* Eliminated banner at top */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          padding: '10px',
          background: 'rgba(0, 0, 0, 0.7)',
          textAlign: 'center',
          zIndex: 20,
        }}
      >
        <span
          style={{
            fontSize: '16px',
            color: '#ff6666',
            fontWeight: 'bold',
          }}
        >
          Eliminated - Spectating
        </span>
      </div>

      {/* Leaderboard sidebar */}
      {leaderboard && leaderboard.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '50px',
            right: '10px',
            width: '160px',
            background: 'rgba(0, 0, 0, 0.6)',
            borderRadius: '8px',
            padding: '10px',
            zIndex: 20,
          }}
        >
          <div
            style={{
              fontSize: '12px',
              color: '#ffaa00',
              fontWeight: 'bold',
              textAlign: 'center',
              marginBottom: '8px',
            }}
          >
            Leaderboard
          </div>
          {leaderboard.slice(0, 8).map((entry) => (
            <div
              key={entry.rank}
              style={{
                fontSize: '10px',
                color: '#ccc',
                padding: '2px 0',
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span>
                #{entry.rank} {entry.displayName.slice(0, 10)}
              </span>
              <span style={{ color: '#ffaa00' }}>{entry.score}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
