/** Small original cover art for each cabinet, drawn as inline SVG. */
export function GameArt({ id }: { id: string }) {
  if (id === 'bolt-rush') {
    return (
      <svg viewBox="0 0 160 90" className="h-full w-full" aria-hidden="true">
        <defs>
          <linearGradient id="br-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#38c9ff" />
            <stop offset="1" stopColor="#e9fbff" />
          </linearGradient>
        </defs>
        <rect width="160" height="90" fill="url(#br-sky)" />
        <circle cx="120" cy="24" r="12" fill="#fff6b0" />
        <path d="M0 62 Q40 40 80 60 T160 52 V90 H0 Z" fill="#7a3fc2" />
        <path d="M0 62 Q40 40 80 60 T160 52" stroke="#4dff88" strokeWidth="5" fill="none" />
        {[30, 44, 58, 72].map((x, i) => (
          <path key={x} d={`M${x} ${38 - i * 3} l4 6 -4 6 -4 -6z`} fill="#ffe14d" />
        ))}
        <g transform="translate(96 44)">
          <circle r="10" fill="#0d8f86" />
          <path d="M-8 0 A8 8 0 0 1 4 -7" stroke="#18c8b8" strokeWidth="3" fill="none" />
          <path d="M1 -6 l-4 6 h3 l-2 6 5 -7 h-3z" fill="#fff27a" />
        </g>
        <path d="M74 44 h12 M70 50 h14 M76 38 h8" stroke="#ffffff" strokeWidth="2" opacity="0.7" />
      </svg>
    );
  }
  if (id === 'snake') {
    const body = [
      [3, 5], [4, 5], [5, 5], [6, 5], [7, 5], [7, 4], [7, 3], [8, 3], [9, 3], [10, 3],
    ];
    return (
      <svg viewBox="0 0 160 90" className="h-full w-full" aria-hidden="true">
        <rect width="160" height="90" fill="#0b0920" />
        {Array.from({ length: 16 * 9 }, (_, i) => (
          <rect key={i} x={(i % 16) * 10 + 4.5} y={Math.floor(i / 16) * 10 + 4.5} width="1" height="1" fill="#2a2360" />
        ))}
        {body.map(([x, y], i) => (
          <rect
            key={`${x}-${y}`}
            x={x * 10 + 1}
            y={y * 10 + 1}
            width="8"
            height="8"
            rx="2"
            fill={i === body.length - 1 ? '#b6ffe0' : '#3dffb0'}
            opacity={0.55 + (i / body.length) * 0.45}
          />
        ))}
        <circle cx="135" cy="35" r="3.5" fill="#ff4f9a" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 160 90" className="h-full w-full" aria-hidden="true">
      <rect width="160" height="90" fill="#2a1060" />
      <rect y="52" width="160" height="38" fill="#17955a" />
      {[0, 2, 4, 6].map((i) => (
        <rect key={i} x={i * 20} y="52" width="20" height="38" fill="#14834f" />
      ))}
      <path d="M80 52 V82" stroke="#ffffff" strokeOpacity="0.7" />
      <rect x="0" y="44" width="14" height="38" fill="none" stroke="#f5f3ff" strokeWidth="2" />
      <rect x="146" y="44" width="14" height="38" fill="none" stroke="#f5f3ff" strokeWidth="2" />
      <circle cx="50" cy="70" r="10" fill="#ffd7b0" />
      <path d="M40 70 A10 10 0 0 1 60 70" fill="#2ee6ff" />
      <circle cx="112" cy="66" r="10" fill="#ffd7b0" />
      <path d="M102 66 A10 10 0 0 1 122 66" fill="#ff4fbf" />
      <circle cx="82" cy="40" r="5" fill="#ffffff" />
    </svg>
  );
}
