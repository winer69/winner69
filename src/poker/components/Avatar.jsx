import React, { useId } from 'react';

// =====================================================
// Avatar — วาดด้วย SVG จาก preset ใน utils/avatars.js
// รองรับ human / robot / animal / fantasy
// =====================================================

const EYE_Y = 49;

function Eyes({ style, color = '#1b1b1b' }) {
  switch (style) {
    case 'shades':
      return (
        <g>
          <rect x="31" y="43" width="16" height="10" rx="4" fill="#0c0c0c" />
          <rect x="53" y="43" width="16" height="10" rx="4" fill="#0c0c0c" />
          <rect x="46" y="46" width="8" height="2.4" fill="#0c0c0c" />
          <path d="M34 45 L40 45" stroke="#ffffff55" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M56 45 L62 45" stroke="#ffffff55" strokeWidth="1.6" strokeLinecap="round" />
        </g>
      );
    case 'glasses':
      return (
        <g>
          <circle cx="41" cy={EYE_Y} r="6.5" fill="#ffffff22" stroke="#222" strokeWidth="1.8" />
          <circle cx="59" cy={EYE_Y} r="6.5" fill="#ffffff22" stroke="#222" strokeWidth="1.8" />
          <path d="M47.5 49 L52.5 49" stroke="#222" strokeWidth="1.8" />
          <circle cx="41" cy={EYE_Y} r="2.2" fill={color} />
          <circle cx="59" cy={EYE_Y} r="2.2" fill={color} />
        </g>
      );
    case 'wink':
      return (
        <g>
          <circle cx="41" cy={EYE_Y} r="2.8" fill={color} />
          <path d="M55 49 Q59 46 63 49" stroke={color} strokeWidth="2.2" fill="none" strokeLinecap="round" />
        </g>
      );
    case 'happy':
      return (
        <g stroke={color} strokeWidth="2.2" fill="none" strokeLinecap="round">
          <path d="M37 50 Q41 45 45 50" />
          <path d="M55 50 Q59 45 63 50" />
        </g>
      );
    case 'crazy':
      return (
        <g>
          <circle cx="41" cy={EYE_Y} r="5.5" fill="#fff" stroke="#222" strokeWidth="1" />
          <circle cx="59" cy={EYE_Y - 1} r="4" fill="#fff" stroke="#222" strokeWidth="1" />
          <circle cx="43" cy={EYE_Y + 1} r="2.4" fill={color} />
          <circle cx="57" cy={EYE_Y - 2} r="1.8" fill={color} />
        </g>
      );
    case 'lashes':
      return (
        <g>
          <ellipse cx="41" cy={EYE_Y} rx="2.8" ry="3.2" fill={color} />
          <ellipse cx="59" cy={EYE_Y} rx="2.8" ry="3.2" fill={color} />
          <path d="M37 45.5 L35 43.5 M45 45.5 L47 43.5 M55 45.5 L53 43.5 M63 45.5 L65 43.5" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
          <circle cx="42" cy={EYE_Y - 1} r="0.9" fill="#fff" />
          <circle cx="60" cy={EYE_Y - 1} r="0.9" fill="#fff" />
        </g>
      );
    default:
      return (
        <g>
          <circle cx="41" cy={EYE_Y} r="2.8" fill={color} />
          <circle cx="59" cy={EYE_Y} r="2.8" fill={color} />
          <circle cx="42" cy={EYE_Y - 1} r="0.9" fill="#fff" />
          <circle cx="60" cy={EYE_Y - 1} r="0.9" fill="#fff" />
        </g>
      );
  }
}

function Mouth({ style }) {
  switch (style) {
    case 'grin':
      return <path d="M42 59 Q50 69 58 59 Z" fill="#5a1414" stroke="#3a0b0b" strokeWidth="1" />;
    case 'smirk':
      return <path d="M44 61 Q51 64 57 59" stroke="#5a2a1a" strokeWidth="2.2" fill="none" strokeLinecap="round" />;
    case 'o':
      return <ellipse cx="50" cy="62" rx="3.4" ry="4.2" fill="#4a1010" />;
    case 'tongue':
      return (
        <g>
          <path d="M42 59 Q50 67 58 59 Z" fill="#5a1414" />
          <path d="M47 62 Q50 70 53 62 Z" fill="#e45b6b" />
        </g>
      );
    default:
      return <path d="M43 60 Q50 66 57 60" stroke="#5a2a1a" strokeWidth="2.2" fill="none" strokeLinecap="round" />;
  }
}

function HairBack({ a }) {
  if (a.hairStyle === 'long') return <path d="M26 46 Q24 20 50 19 Q76 20 74 46 L78 82 Q64 76 50 78 Q36 76 22 82 Z" fill={a.hair} />;
  if (a.hairStyle === 'bob') return <path d="M27 48 Q25 20 50 20 Q75 20 73 48 L73 64 Q66 60 66 50 L34 50 Q34 60 27 64 Z" fill={a.hair} />;
  return null;
}

function HairFront({ a }) {
  const fill = a.hair;
  switch (a.hairStyle) {
    case 'short':
      return <path d="M29 45 Q27 22 50 21 Q73 22 71 45 Q67 31 50 31 Q36 31 29 45 Z" fill={fill} />;
    case 'slick':
      return <path d="M29 44 Q28 21 52 21 Q73 23 71 42 Q62 28 40 33 Q33 36 29 44 Z" fill={fill} />;
    case 'spiky':
      return <path d="M28 44 L27 30 L33 33 L34 21 L41 29 L46 17 L51 28 L57 18 L60 29 L67 22 L67 33 L73 31 L72 44 Q66 32 50 32 Q35 32 28 44 Z" fill={fill} />;
    case 'curly':
      return (
        <g fill={fill}>
          {[[31, 36], [36, 28], [44, 24], [52, 23], [60, 26], [66, 31], [70, 39], [29, 43]].map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="7.5" />
          ))}
        </g>
      );
    case 'bun':
      return (
        <g fill={fill}>
          <circle cx="50" cy="16" r="9" />
          <path d="M29 45 Q28 22 50 22 Q72 22 71 45 Q66 31 50 31 Q34 31 29 45 Z" />
        </g>
      );
    case 'long':
    case 'bob':
      return <path d="M29 46 Q30 24 50 23 Q70 24 71 46 Q64 34 52 32 Q40 36 29 46 Z" fill={fill} />;
    case 'mohawk':
      return <path d="M45 34 L43 12 L50 18 L52 8 L56 18 L58 12 L55 34 Z" fill={fill} />;
    default:
      return null; // bald
  }
}

function Extra({ a }) {
  switch (a.extra) {
    case 'beard':
      return <path d="M30 52 Q31 74 50 76 Q69 74 70 52 Q66 66 58 64 Q50 61 42 64 Q34 66 30 52 Z" fill={a.hair} opacity="0.95" />;
    case 'mustache':
      return <path d="M40 58 Q46 54 50 57 Q54 54 60 58 Q55 60 50 59 Q45 60 40 58 Z" fill={a.hair === '#0e0e0e' ? '#2a1a10' : a.hair} />;
    case 'earrings':
      return (
        <g fill="#ffd86a">
          <circle cx="28" cy="58" r="2.4" />
          <circle cx="72" cy="58" r="2.4" />
        </g>
      );
    case 'blush':
      return (
        <g fill="#ff7b8a" opacity="0.45">
          <ellipse cx="35" cy="57" rx="4.5" ry="2.6" />
          <ellipse cx="65" cy="57" rx="4.5" ry="2.6" />
        </g>
      );
    case 'cap':
      return (
        <g>
          <path d="M28 40 Q28 18 50 18 Q72 18 72 40 Z" fill="#c8102e" />
          <path d="M60 38 Q80 36 86 42 Q72 44 60 41 Z" fill="#9a0c22" />
          <circle cx="50" cy="19" r="2" fill="#ffd86a" />
        </g>
      );
    case 'partyhat':
      return (
        <g>
          <path d="M38 30 L52 2 L64 28 Z" fill="#ff5e9b" />
          <path d="M42 22 L60 20 M46 13 L57 12" stroke="#ffd86a" strokeWidth="3" />
          <circle cx="52" cy="3" r="3.5" fill="#ffd86a" />
        </g>
      );
    case 'chain':
      return <path d="M36 82 Q50 94 64 82" stroke="#ffd86a" strokeWidth="2.6" fill="none" strokeDasharray="3 2" />;
    default:
      return null;
  }
}

function Human({ a }) {
  return (
    <g>
      <HairBack a={a} />
      <path d="M14 100 Q16 76 50 74 Q84 76 86 100 Z" fill={a.shirt} />
      <rect x="43" y="64" width="14" height="14" rx="5" fill={a.skin} />
      <circle cx="29" cy="51" r="4.5" fill={a.skin} />
      <circle cx="71" cy="51" r="4.5" fill={a.skin} />
      <ellipse cx="50" cy="48" rx="21" ry="24" fill={a.skin} />
      <ellipse cx="44" cy="38" rx="9" ry="6" fill="#ffffff" opacity="0.12" />
      <HairFront a={a} />
      <Eyes style={a.eyes} />
      <path d="M49 52 Q48 56 51 56" stroke="#00000033" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <Mouth style={a.mouth} />
      <Extra a={a} />
    </g>
  );
}

function Robot({ a }) {
  return (
    <g>
      <path d="M18 100 Q20 78 50 76 Q80 78 82 100 Z" fill={a.metal} opacity="0.85" />
      <rect x="44" y="66" width="12" height="12" fill="#6b7680" />
      <line x1="50" y1="22" x2="50" y2="10" stroke={a.metal} strokeWidth="3" />
      <circle cx="50" cy="9" r="4" fill={a.glow} />
      <rect x="25" y="22" width="50" height="46" rx="12" fill={a.metal} />
      <rect x="25" y="22" width="50" height="10" rx="6" fill="#ffffff" opacity="0.18" />
      <rect x="21" y="38" width="6" height="14" rx="2" fill="#7c8791" />
      <rect x="73" y="38" width="6" height="14" rx="2" fill="#7c8791" />
      <rect x="31" y="35" width="38" height="16" rx="8" fill={a.visor} />
      <circle cx="41" cy="43" r="4" fill={a.glow} />
      <circle cx="59" cy="43" r="4" fill={a.glow} />
      <g stroke="#4a545c" strokeWidth="2">
        <line x1="40" y1="58" x2="40" y2="63" />
        <line x1="46" y1="58" x2="46" y2="63" />
        <line x1="52" y1="58" x2="52" y2="63" />
        <line x1="58" y1="58" x2="58" y2="63" />
      </g>
    </g>
  );
}

function Animal({ a }) {
  const { species, fur, inner } = a;
  const ears = {
    cat: (
      <g>
        <path d="M26 40 L30 14 L46 30 Z" fill={fur} />
        <path d="M74 40 L70 14 L54 30 Z" fill={fur} />
        <path d="M30 34 L32 21 L41 30 Z" fill={inner} />
        <path d="M70 34 L68 21 L59 30 Z" fill={inner} />
      </g>
    ),
    fox: (
      <g>
        <path d="M24 42 L28 10 L46 30 Z" fill={fur} />
        <path d="M76 42 L72 10 L54 30 Z" fill={fur} />
        <path d="M30 32 L31 18 L40 29 Z" fill="#2a1a10" />
        <path d="M70 32 L69 18 L60 29 Z" fill="#2a1a10" />
      </g>
    ),
    bear: (
      <g>
        <circle cx="29" cy="27" r="10" fill={fur} />
        <circle cx="71" cy="27" r="10" fill={fur} />
        <circle cx="29" cy="27" r="5" fill={inner} />
        <circle cx="71" cy="27" r="5" fill={inner} />
      </g>
    ),
    panda: (
      <g>
        <circle cx="29" cy="27" r="10" fill={inner} />
        <circle cx="71" cy="27" r="10" fill={inner} />
      </g>
    ),
    frog: (
      <g>
        <circle cx="35" cy="30" r="11" fill={fur} />
        <circle cx="65" cy="30" r="11" fill={fur} />
        <circle cx="35" cy="30" r="6.5" fill="#fff" />
        <circle cx="65" cy="30" r="6.5" fill="#fff" />
        <circle cx="36" cy="31" r="3.4" fill="#111" />
        <circle cx="64" cy="31" r="3.4" fill="#111" />
      </g>
    ),
  };
  return (
    <g>
      <path d="M16 100 Q18 78 50 76 Q82 78 84 100 Z" fill={fur} opacity="0.9" />
      {ears[species]}
      <ellipse cx="50" cy="52" rx="25" ry="23" fill={fur} />
      {species === 'fox' && <path d="M26 52 Q38 56 50 74 Q62 56 74 52 Q70 70 50 76 Q30 70 26 52 Z" fill={inner} />}
      {species === 'panda' && (
        <g fill={inner}>
          <ellipse cx="40" cy="49" rx="7" ry="8.5" transform="rotate(-20 40 49)" />
          <ellipse cx="60" cy="49" rx="7" ry="8.5" transform="rotate(20 60 49)" />
        </g>
      )}
      {(species === 'bear' || species === 'cat') && <ellipse cx="50" cy="61" rx="11" ry="8" fill={inner} opacity="0.85" />}
      {species === 'frog' ? (
        <path d="M34 60 Q50 72 66 60" stroke="#1f5a14" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      ) : (
        <g>
          <circle cx="40" cy="49" r="3" fill={species === 'panda' ? '#fff' : '#111'} />
          <circle cx="60" cy="49" r="3" fill={species === 'panda' ? '#fff' : '#111'} />
          <ellipse cx="50" cy="58" rx="3.6" ry="2.6" fill="#1b1b1b" />
          <path d="M45 63 Q50 67 50 61 Q50 67 55 63" stroke="#1b1b1b" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        </g>
      )}
      {species === 'cat' && (
        <g stroke="#2a2a2a" strokeWidth="1" opacity="0.7">
          <line x1="30" y1="58" x2="40" y2="60" />
          <line x1="30" y1="63" x2="40" y2="62" />
          <line x1="70" y1="58" x2="60" y2="60" />
          <line x1="70" y1="63" x2="60" y2="62" />
        </g>
      )}
    </g>
  );
}

function Fantasy({ a }) {
  const { kind, skin, accent } = a;
  if (kind === 'wizard') {
    return (
      <g>
        <path d="M14 100 Q16 76 50 74 Q84 76 86 100 Z" fill={accent} />
        <ellipse cx="50" cy="50" rx="20" ry="22" fill={skin} />
        <path d="M30 56 Q32 88 50 92 Q68 88 70 56 Q62 64 50 62 Q38 64 30 56 Z" fill="#f2f2f2" />
        <path d="M22 36 L50 0 L80 36 Q50 28 22 36 Z" fill={accent} />
        <path d="M18 38 Q50 26 82 38 Q50 44 18 38 Z" fill="#3a2a8a" />
        <circle cx="56" cy="20" r="2.4" fill="#ffd86a" />
        <circle cx="45" cy="28" r="1.6" fill="#ffd86a" />
        <Eyes style="normal" />
        <path d="M40 58 Q50 54 60 58" stroke="#ccc" strokeWidth="3" fill="none" strokeLinecap="round" />
      </g>
    );
  }
  if (kind === 'elf') {
    return (
      <g>
        <path d="M24 46 Q22 18 50 18 Q78 18 76 46 L80 86 Q50 78 20 86 Z" fill={accent} />
        <path d="M14 100 Q16 76 50 74 Q84 76 86 100 Z" fill="#2f6e3a" />
        <path d="M30 48 L12 34 L32 56 Z" fill={skin} />
        <path d="M70 48 L88 34 L68 56 Z" fill={skin} />
        <ellipse cx="50" cy="49" rx="20" ry="23" fill={skin} />
        <path d="M30 44 Q34 24 52 24 Q70 26 70 44 Q60 32 46 34 Q36 36 30 44 Z" fill={accent} />
        <Eyes style="lashes" color="#2f6e3a" />
        <Mouth style="smirk" />
      </g>
    );
  }
  if (kind === 'alien') {
    return (
      <g>
        <path d="M18 100 Q20 80 50 78 Q80 80 82 100 Z" fill="#2c2c3a" />
        <path d="M50 14 Q80 14 76 46 Q72 72 50 78 Q28 72 24 46 Q20 14 50 14 Z" fill={skin} />
        <ellipse cx="44" cy="30" rx="10" ry="6" fill="#fff" opacity="0.16" />
        <ellipse cx="38" cy="48" rx="8" ry="11" transform="rotate(-25 38 48)" fill={accent} />
        <ellipse cx="62" cy="48" rx="8" ry="11" transform="rotate(25 62 48)" fill={accent} />
        <circle cx="36" cy="45" r="2" fill="#fff" />
        <circle cx="60" cy="45" r="2" fill="#fff" />
        <path d="M45 66 Q50 69 55 66" stroke="#1d5a20" strokeWidth="2" fill="none" strokeLinecap="round" />
      </g>
    );
  }
  // vampire
  return (
    <g>
      <path d="M10 100 L16 74 L34 82 L50 74 L66 82 L84 74 L90 100 Z" fill="#111" />
      <path d="M34 82 L50 74 L66 82 L50 100 Z" fill="#7a0d0d" />
      <ellipse cx="50" cy="48" rx="20" ry="24" fill={skin} />
      <path d="M29 44 Q28 20 50 20 Q72 20 71 44 Q66 30 56 30 L50 40 L44 30 Q34 30 29 44 Z" fill={accent} />
      <Eyes style="normal" color="#a01818" />
      <path d="M42 60 Q50 64 58 60" stroke="#5a1414" strokeWidth="2" fill="none" />
      <path d="M45 61 L46.5 66 L48 61.5 M52 61.5 L53.5 66 L55 61" fill="#fff" stroke="#fff" strokeWidth="0.8" />
    </g>
  );
}

export default function Avatar({ avatar, size, className = '' }) {
  const uid = useId().replace(/:/g, '');
  if (!avatar) return <div className={`avatar avatar--empty ${className}`} style={size ? { width: size, height: size } : undefined} />;
  const [bgFrom, bgTo] = avatar.bg;
  return (
    <div className={`avatar ${className}`} style={size ? { width: size, height: size } : undefined}>
      <svg viewBox="0 0 100 100" role="img" aria-label={`${avatar.category} avatar`}>
        <defs>
          <radialGradient id={`bg-${uid}`} cx="50%" cy="35%" r="70%">
            <stop offset="0%" stopColor={bgFrom} />
            <stop offset="100%" stopColor={bgTo} />
          </radialGradient>
          <clipPath id={`clip-${uid}`}>
            <circle cx="50" cy="50" r="50" />
          </clipPath>
        </defs>
        <g clipPath={`url(#clip-${uid})`}>
          <rect width="100" height="100" fill={`url(#bg-${uid})`} />
          {avatar.type === 'human' && <Human a={avatar} />}
          {avatar.type === 'robot' && <Robot a={avatar} />}
          {avatar.type === 'animal' && <Animal a={avatar} />}
          {avatar.type === 'fantasy' && <Fantasy a={avatar} />}
        </g>
      </svg>
    </div>
  );
}
