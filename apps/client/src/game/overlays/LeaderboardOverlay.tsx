interface LeaderboardEntry {
  rank: number;
  playerId?: string;
  displayName: string;
  score: number;
  survived: boolean;
}

interface LeaderboardOverlayProps {
  leaderboard: LeaderboardEntry[];
  playerId: string;
}

const PODIUM_COLORS = ['#ffd700', '#c0c0c0', '#cd7f32'];
const PODIUM_HEIGHTS = [120, 90, 70];

export default function LeaderboardOverlay({ leaderboard, playerId }: LeaderboardOverlayProps) {
  const top3 = leaderboard.slice(0, 3);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        background: '#1a1a2e',
        color: '#fff',
        zIndex: 30,
        overflowY: 'auto',
        padding: '20px',
      }}
    >
      <div
        style={{
          fontSize: '24px',
          color: '#ffaa00',
          fontWeight: 'bold',
          marginTop: '10px',
          marginBottom: '20px',
        }}
      >
        Final Results
      </div>

      {/* Podium */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          gap: '10px',
          marginBottom: '30px',
          height: '180px',
        }}
      >
        {[1, 0, 2].map((podiumIdx) => {
          const entry = top3[podiumIdx];
          if (!entry) return <div key={podiumIdx} style={{ width: '70px' }} />;
          const height = PODIUM_HEIGHTS[podiumIdx];
          return (
            <div
              key={podiumIdx}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                width: '80px',
              }}
            >
              <div style={{ fontSize: '20px', marginBottom: '4px' }}>
                {podiumIdx === 0 ? '👑' : podiumIdx === 1 ? '🥈' : '🥉'}
              </div>
              <div
                style={{
                  fontSize: '10px',
                  color: '#ccc',
                  marginBottom: '4px',
                  textAlign: 'center',
                  wordBreak: 'break-word',
                }}
              >
                {entry.displayName.length > 12
                  ? entry.displayName.slice(0, 11) + '…'
                  : entry.displayName}
              </div>
              <div
                style={{
                  width: '60px',
                  height: `${height}px`,
                  background: PODIUM_COLORS[podiumIdx],
                  borderRadius: '4px 4px 0 0',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: 0.85,
                }}
              >
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#fff' }}>
                  #{entry.rank}
                </div>
                <div style={{ fontSize: '10px', color: '#fff', marginTop: '4px' }}>
                  {entry.score}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Full list */}
      <div style={{ width: '100%', maxWidth: '420px' }}>
        {leaderboard.map((entry) => {
          const isMe = entry.playerId === playerId;
          return (
            <div
              key={entry.rank}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '8px 12px',
                marginBottom: '4px',
                background: isMe ? 'rgba(46, 204, 113, 0.3)' : 'rgba(42, 42, 74, 0.8)',
                borderRadius: '4px',
              }}
            >
              <span style={{ width: '30px', fontSize: '12px', color: '#888', fontWeight: 'bold' }}>
                #{entry.rank}
              </span>
              <span
                style={{
                  flex: 1,
                  fontSize: '12px',
                  color: isMe ? '#fff' : '#ccc',
                  fontWeight: isMe ? 'bold' : 'normal',
                }}
              >
                {entry.displayName}
              </span>
              <span
                style={{
                  fontSize: '10px',
                  color: entry.survived ? '#2ecc71' : '#e74c3c',
                  marginRight: '10px',
                }}
              >
                {entry.survived ? 'Survived' : 'Out'}
              </span>
              <span style={{ fontSize: '12px', color: '#ffaa00', fontWeight: 'bold' }}>
                {entry.score} pts
              </span>
            </div>
          );
        })}
      </div>

      {/* Play Again */}
      <button
        onClick={() => {
          window.location.assign('/join');
        }}
        style={{
          marginTop: '20px',
          marginBottom: '20px',
          padding: '12px 40px',
          fontSize: '16px',
          fontWeight: 'bold',
          color: '#fff',
          background: '#3498db',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
        }}
        onMouseOver={(e) => (e.currentTarget.style.background = '#2980b9')}
        onMouseOut={(e) => (e.currentTarget.style.background = '#3498db')}
      >
        Play Again
      </button>
    </div>
  );
}
