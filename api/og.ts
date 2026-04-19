import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * OG image endpoint — returns a 1200x630 SVG matching the QuizDash arcade theme.
 * Most social platforms (Twitter/X, Discord, Slack, iMessage) render SVG og:images.
 * For platforms that don't, the og:title and og:description meta tags provide fallback text.
 */
export default function handler(_req: VercelRequest, res: VercelResponse) {
  const dots = Array.from({ length: 30 }, (_, i) =>
    `<circle cx="${120 + i * 32}" cy="520" r="3" fill="#ffb8ff" opacity="0.15"/>`
  ).join('');

  const ghosts = [
    { x: 510, color: '#ff0000' },
    { x: 546, color: '#ffb8ff' },
    { x: 582, color: '#00ffff' },
    { x: 618, color: '#ffb852' },
  ].map(g =>
    `<rect x="${g.x}" y="480" width="22" height="22" rx="11" fill="${g.color}" opacity="0.5"/>`
  ).join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#000"/>
  <rect x="20" y="20" width="1160" height="590" rx="16" fill="none" stroke="#2121de" stroke-width="3"/>
  ${dots}

  <!-- Pac-Man -->
  <g transform="translate(600,195)">
    <clipPath id="pm">
      <path d="M-55,0 A55,55 0 1,1 -55,-1 L0,0 L40,-30 L40,30 Z"/>
    </clipPath>
    <circle cx="0" cy="0" r="55" fill="#ffff00" clip-path="url(#pm)"/>
    <circle cx="10" cy="-20" r="6" fill="#000"/>
  </g>

  <text x="600" y="340" text-anchor="middle" font-family="'Courier New',monospace" font-size="68" font-weight="bold" fill="#fff" letter-spacing="8">QUIZDASH</text>
  <text x="600" y="388" text-anchor="middle" font-family="'Courier New',monospace" font-size="22" fill="#2121de" letter-spacing="5">LEARN BY PLAYING</text>
  <text x="600" y="435" text-anchor="middle" font-family="'Courier New',monospace" font-size="17" fill="#555">Turn any quiz into an arcade game</text>

  ${ghosts}
</svg>`;

  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=604800, s-maxage=604800');
  res.status(200).send(svg);
}
