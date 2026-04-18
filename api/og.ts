import { ImageResponse } from '@vercel/og';

export const config = { runtime: 'edge' };

export default function handler() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#000',
          position: 'relative',
        }}
      >
        {/* Border */}
        <div
          style={{
            position: 'absolute',
            top: 20,
            left: 20,
            right: 20,
            bottom: 20,
            border: '3px solid #2121de',
            borderRadius: 16,
            display: 'flex',
          }}
        />

        {/* Pac-Man */}
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: '#ffff00',
            marginBottom: 24,
            display: 'flex',
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              right: -10,
              width: 0,
              height: 0,
              borderTop: '20px solid transparent',
              borderBottom: '20px solid transparent',
              borderLeft: '30px solid #000',
              display: 'flex',
              marginTop: 20,
            }}
          />
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 'bold',
            color: '#fff',
            letterSpacing: 8,
            fontFamily: 'monospace',
            display: 'flex',
          }}
        >
          QUIZDASH
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 24,
            color: '#2121de',
            letterSpacing: 6,
            fontFamily: 'monospace',
            marginTop: 12,
            display: 'flex',
          }}
        >
          LEARN BY PLAYING
        </div>

        {/* Description */}
        <div
          style={{
            fontSize: 18,
            color: '#555',
            fontFamily: 'monospace',
            marginTop: 20,
            display: 'flex',
          }}
        >
          Turn any quiz into an arcade game
        </div>

        {/* Ghost row */}
        <div
          style={{
            position: 'absolute',
            bottom: 50,
            display: 'flex',
            gap: 16,
          }}
        >
          {['#ff0000', '#ffb8ff', '#00ffff', '#ffb852'].map((color) => (
            <div
              key={color}
              style={{
                width: 24,
                height: 24,
                borderRadius: '12px 12px 4px 4px',
                background: color,
                opacity: 0.5,
                display: 'flex',
              }}
            />
          ))}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
