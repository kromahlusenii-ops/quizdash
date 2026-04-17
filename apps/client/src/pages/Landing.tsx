import { useNavigate } from 'react-router-dom';

const DOTS = Array.from({ length: 24 }, (_, i) => i);

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#000',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        padding: '2rem 1rem',
      }}
    >
      {/* Maze-wall border glow */}
      <div
        style={{
          position: 'absolute',
          inset: '20px',
          border: '3px solid #2121de',
          borderRadius: '16px',
          boxShadow: '0 0 40px rgba(33,33,222,0.15), inset 0 0 40px rgba(33,33,222,0.05)',
          pointerEvents: 'none',
        }}
      />

      {/* Animated dot row */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          gap: '18px',
          opacity: 0.08,
          pointerEvents: 'none',
        }}
      >
        {DOTS.map((i) => (
          <div
            key={i}
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: '#ffb8ff',
              animation: `dotPulse 2.4s ease-in-out ${i * 0.1}s infinite`,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 560 }}>
        {/* Pac-Man icon */}
        <div
          style={{
            fontSize: '48px',
            marginBottom: '8px',
            animation: 'chomp 0.6s steps(2) infinite',
          }}
        >
          <svg width="48" height="48" viewBox="0 0 48 48" style={{ display: 'inline-block' }}>
            <circle cx="24" cy="24" r="22" fill="#ffff00" mask="url(#mouth)" />
            <defs>
              <mask id="mouth">
                <rect width="48" height="48" fill="white" />
                <path d="M24 24 L50 12 L50 36 Z" fill="black">
                  <animate
                    attributeName="d"
                    values="M24 24 L50 12 L50 36 Z;M24 24 L50 22 L50 26 Z;M24 24 L50 12 L50 36 Z"
                    dur="0.4s"
                    repeatCount="indefinite"
                  />
                </path>
              </mask>
            </defs>
            <circle cx="30" cy="14" r="3" fill="#000" />
          </svg>
        </div>

        <h1
          style={{
            fontFamily: "'Press Start 2P', 'Courier New', monospace",
            fontSize: 'clamp(22px, 5vw, 36px)',
            color: '#fff',
            lineHeight: 1.4,
            marginBottom: '6px',
            textShadow: '0 0 30px rgba(255,255,0,0.2)',
          }}
        >
          QUIZDASH
        </h1>

        <p
          style={{
            fontFamily: "'Press Start 2P', 'Courier New', monospace",
            fontSize: '10px',
            color: '#2121de',
            letterSpacing: '2px',
            marginBottom: '40px',
            textTransform: 'uppercase',
          }}
        >
          Learn by playing
        </p>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            alignItems: 'center',
          }}
        >
          {/* Feature pills */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
              justifyContent: 'center',
              marginBottom: '24px',
            }}
          >
            {['Build quiz lessons', 'Students play to learn', 'Live leaderboards'].map(
              (text) => (
                <span
                  key={text}
                  style={{
                    padding: '6px 14px',
                    fontSize: '11px',
                    color: '#aaa',
                    border: '1px solid #333',
                    borderRadius: '20px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {text}
                </span>
              )
            )}
          </div>

          <button
            onClick={() => navigate('/instructor/login')}
            style={{
              fontFamily: "'Press Start 2P', 'Courier New', monospace",
              fontSize: '13px',
              padding: '18px 48px',
              background: '#2121de',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 0 20px rgba(33,33,222,0.3)',
              letterSpacing: '1px',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = '#3333ff';
              e.currentTarget.style.boxShadow = '0 0 30px rgba(33,33,222,0.5)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = '#2121de';
              e.currentTarget.style.boxShadow = '0 0 20px rgba(33,33,222,0.3)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            GET STARTED
          </button>

          <p style={{ fontSize: '11px', color: '#555', marginTop: '8px' }}>
            Create quizzes, share a code, watch students compete.
          </p>
        </div>
      </div>

      {/* Ghost row at bottom */}
      <div
        style={{
          position: 'absolute',
          bottom: '40px',
          display: 'flex',
          gap: '20px',
          opacity: 0.4,
        }}
      >
        {['#ff0000', '#ffb8ff', '#00ffff', '#ffb852'].map((color, i) => (
          <div
            key={color}
            style={{
              width: 20,
              height: 20,
              borderRadius: '10px 10px 4px 4px',
              background: color,
              animation: `ghostFloat 1.2s ease-in-out ${i * 0.2}s infinite alternate`,
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes dotPulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
        @keyframes ghostFloat {
          from { transform: translateY(0); }
          to { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
}
