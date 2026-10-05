// Symbol art + look for every cascade slot (CascadeSlot.jsx). All artwork is original SVG.
export function SymbolDefs() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
      <defs>
        <linearGradient id="gd-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff6c9" /><stop offset=".35" stopColor="#ffd45a" /><stop offset=".7" stopColor="#d99a1e" /><stop offset="1" stopColor="#8a5410" />
        </linearGradient>
        <linearGradient id="gd-gold-h" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#a8670f" /><stop offset=".5" stopColor="#ffe68a" /><stop offset="1" stopColor="#a8670f" />
        </linearGradient>
        <linearGradient id="gd-red" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ff5a4a" /><stop offset=".55" stopColor="#d4161f" /><stop offset="1" stopColor="#7d0710" />
        </linearGradient>
        <radialGradient id="gd-jade" cx=".38" cy=".32" r=".75">
          <stop offset="0" stopColor="#c8ffd9" /><stop offset=".45" stopColor="#2fc27a" /><stop offset="1" stopColor="#0b5d36" />
        </radialGradient>
        <radialGradient id="gd-pearl" cx=".38" cy=".34" r=".7">
          <stop offset="0" stopColor="#ffffff" /><stop offset=".35" stopColor="#bff0ff" /><stop offset=".75" stopColor="#3f9bff" /><stop offset="1" stopColor="#1b3c9e" />
        </radialGradient>
        <radialGradient id="gd-flame" cx=".5" cy=".6" r=".6">
          <stop offset="0" stopColor="#fff2a8" /><stop offset=".5" stopColor="#ff9a1f" /><stop offset="1" stopColor="#ff3d1f" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="gd-ivory" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fffdf3" /><stop offset=".8" stopColor="#efe3c4" /><stop offset="1" stopColor="#cdb98a" />
        </linearGradient>
        <filter id="gd-shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="2.5" stdDeviation="2" floodColor="#000" floodOpacity=".55" /></filter>
      </defs>
    </svg>
  );
}

const CJK = "'Noto Serif CJK SC','Songti SC','SimSun','PMingLiU',serif";
const TILE_COLORS = { FU: "#d4161f", FA: "#13834a", CAI: "#1f4fbf", JI: "#7a2bb5" };
const TILE_CHARS = { FU: "福", FA: "發", CAI: "財", JI: "吉" };

function SymGD({ id }) {
  switch (id) {
    case "GOLD":
      return (
        <svg viewBox="0 0 100 100" filter="url(#gd-shadow)">
          <ellipse cx="50" cy="44" rx="20" ry="17" fill="url(#gd-gold)" stroke="#7a4a0c" strokeWidth="2" />
          <path d="M8 50 Q14 44 24 50 Q50 60 76 50 Q86 44 92 50 Q86 82 50 84 Q14 82 8 50Z" fill="url(#gd-gold)" stroke="#7a4a0c" strokeWidth="2.5" />
          <path d="M18 56 Q50 70 82 56" fill="none" stroke="#fff4c0" strokeWidth="2" opacity=".7" />
          <ellipse cx="43" cy="37" rx="7" ry="4" fill="#fff" opacity=".7" />
          <circle cx="76" cy="26" r="3" fill="#fff" /><path d="M76 18v16M68 26h16" stroke="#fff" strokeWidth="1.5" opacity=".9" />
        </svg>
      );
    case "ENVELOPE":
      return (
        <svg viewBox="0 0 100 100" filter="url(#gd-shadow)">
          <rect x="22" y="10" width="56" height="80" rx="7" fill="url(#gd-red)" stroke="#5c0509" strokeWidth="2.5" />
          <path d="M22 30 Q50 50 78 30" fill="#b80f18" stroke="#ffcf55" strokeWidth="2.5" />
          <circle cx="50" cy="42" r="12" fill="url(#gd-gold)" stroke="#7a4a0c" strokeWidth="2" />
          <text x="50" y="47.5" textAnchor="middle" fontFamily={CJK} fontWeight="900" fontSize="15" fill="#a3100f">福</text>
          <path d="M30 66h40M30 74h40" stroke="#ffcf55" strokeWidth="2" opacity=".85" />
          <path d="M26 14h12" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".45" />
        </svg>
      );
    case "LANTERN":
      return (
        <svg viewBox="0 0 100 100" filter="url(#gd-shadow)">
          <path d="M50 4v8" stroke="#ffcf55" strokeWidth="3" />
          <rect x="35" y="12" width="30" height="8" rx="3" fill="url(#gd-gold)" stroke="#7a4a0c" strokeWidth="1.5" />
          <ellipse cx="50" cy="48" rx="31" ry="29" fill="url(#gd-red)" stroke="#5c0509" strokeWidth="2.5" />
          <path d="M50 19 Q30 48 50 77 M50 19 Q70 48 50 77 M50 19 Q12 48 50 77 M50 19 Q88 48 50 77" fill="none" stroke="#ffcf55" strokeWidth="1.6" opacity=".8" />
          <text x="50" y="57" textAnchor="middle" fontFamily={CJK} fontWeight="900" fontSize="22" fill="url(#gd-gold)" stroke="#6b0a0a" strokeWidth=".8">春</text>
          <rect x="35" y="76" width="30" height="8" rx="3" fill="url(#gd-gold)" stroke="#7a4a0c" strokeWidth="1.5" />
          <path d="M44 84v10M50 84v13M56 84v10" stroke="#ff3b30" strokeWidth="3" strokeLinecap="round" />
          <ellipse cx="38" cy="34" rx="6" ry="9" fill="#fff" opacity=".25" />
        </svg>
      );
    case "JADE":
      return (
        <svg viewBox="0 0 100 100" filter="url(#gd-shadow)">
          <circle cx="50" cy="50" r="40" fill="url(#gd-gold-h)" stroke="#7a4a0c" strokeWidth="2" />
          <circle cx="50" cy="50" r="34" fill="url(#gd-jade)" stroke="#0a4a2b" strokeWidth="1.5" />
          <rect x="40" y="40" width="20" height="20" rx="2" fill="#2a0b0d" stroke="url(#gd-gold)" strokeWidth="3" />
          <path d="M50 18v8M50 74v8M18 50h8M74 50h8" stroke="#eaffef" strokeWidth="3" strokeLinecap="round" opacity=".7" />
          <ellipse cx="36" cy="32" rx="9" ry="5" fill="#fff" opacity=".45" transform="rotate(-30 36 32)" />
        </svg>
      );
    case "FU": case "FA": case "CAI": case "JI":
      return (
        <svg viewBox="0 0 100 100" filter="url(#gd-shadow)">
          <rect x="17" y="10" width="66" height="82" rx="9" fill="#2f8f5a" />
          <rect x="17" y="8" width="66" height="78" rx="9" fill="url(#gd-ivory)" stroke="#a88a4e" strokeWidth="1.5" />
          <text x="50" y="62" textAnchor="middle" fontFamily={CJK} fontWeight="900" fontSize="44" fill={TILE_COLORS[id]}>{TILE_CHARS[id]}</text>
          <path d="M24 14h20" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".8" />
        </svg>
      );
    case "WILD":
      return (
        <svg viewBox="0 0 100 100" filter="url(#gd-shadow)">
          <path d="M50 4 L84 18 L96 50 L84 82 L50 96 L16 82 L4 50 L16 18Z" fill="url(#gd-gold)" stroke="#7a4a0c" strokeWidth="2.5" />
          <path d="M50 13 L77 24 L87 50 L77 76 L50 87 L23 76 L13 50 L23 24Z" fill="url(#gd-red)" stroke="#ffd45a" strokeWidth="2" />
          <text x="50" y="60" textAnchor="middle" fontFamily={CJK} fontWeight="900" fontSize="38" fill="url(#gd-gold)" stroke="#5c0509" strokeWidth="1">龍</text>
          <rect x="16" y="68" width="68" height="20" rx="6" fill="#2a0607" stroke="url(#gd-gold)" strokeWidth="2" />
          <text x="50" y="83" textAnchor="middle" fontFamily="Prompt,Arial Black,sans-serif" fontWeight="900" fontSize="15" fill="url(#gd-gold)" letterSpacing="1">WILD</text>
        </svg>
      );
    case "SCATTER":
      return (
        <svg viewBox="0 0 100 100" filter="url(#gd-shadow)">
          <circle cx="50" cy="44" r="40" fill="url(#gd-flame)" className="gd-flame" />
          <path d="M14 52 Q20 20 50 12 Q34 26 40 34 Q30 40 26 56Z M86 52 Q80 20 50 12 Q66 26 60 34 Q70 40 74 56Z" fill="#ffb02e" opacity=".85" />
          <circle cx="50" cy="45" r="25" fill="url(#gd-pearl)" stroke="#fff" strokeWidth="1.5" />
          <ellipse cx="42" cy="36" rx="9" ry="6" fill="#fff" opacity=".75" />
          <path d="M38 52 Q50 60 62 50" fill="none" stroke="#fff" strokeWidth="2" opacity=".6" />
          <rect x="8" y="72" width="84" height="19" rx="6" fill="url(#gd-red)" stroke="url(#gd-gold)" strokeWidth="2" />
          <text x="50" y="86" textAnchor="middle" fontFamily="Prompt,Arial Black,sans-serif" fontWeight="900" fontSize="12.5" fill="#fff3c4" letterSpacing=".5">SCATTER</text>
        </svg>
      );
    default:
      return null;
  }
}

// ======================================================================= Gilt Reels
const GEM = {
  RUBY: { c: ["#ffd0d4", "#ff3b4e", "#8a0616"], shape: "M50 12 L78 28 L78 64 L50 88 L22 64 L22 28Z", facets: "M50 12 L50 88 M22 28 L78 64 M78 28 L22 64 M36 20 L36 76 M64 20 L64 76" },
  SAPPHIRE: { c: ["#d6e8ff", "#2f6dff", "#0a1f78"], shape: "M50 10 C76 10 86 32 86 50 C86 72 70 90 50 90 C30 90 14 72 14 50 C14 32 24 10 50 10Z", facets: "M30 30 L70 30 L80 50 L70 70 L30 70 L20 50Z M30 30 L50 50 L70 30 M30 70 L50 50 L70 70 M20 50 L80 50" },
  EMERALD: { c: ["#d4ffe6", "#1fbf6a", "#064d2a"], shape: "M30 12 L70 12 L84 26 L84 74 L70 88 L30 88 L16 74 L16 26Z", facets: "M30 24 L70 24 L72 26 L72 74 L70 76 L30 76 L28 74 L28 26Z M16 26 L28 26 M84 26 L72 26 M16 74 L28 74 M84 74 L72 74" },
  AMETHYST: { c: ["#f0dcff", "#a34dff", "#3e0b78"], shape: "M50 8 L90 80 Q50 96 10 80Z", facets: "M50 8 L50 70 M10 80 L50 70 L90 80 M30 44 L50 70 L70 44" },
};
function GemSym({ id }) {
  const g = GEM[id];
  return (
    <svg viewBox="0 0 100 100" filter="url(#gd-shadow)">
      <defs>
        <linearGradient id={`gem-${id}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={g.c[0]} /><stop offset=".45" stopColor={g.c[1]} /><stop offset="1" stopColor={g.c[2]} /></linearGradient>
      </defs>
      <path d={g.shape} fill={`url(#gem-${id})`} stroke="#fff3c4" strokeWidth="2.5" strokeLinejoin="round" />
      <path d={g.facets} fill="none" stroke="#fff" strokeWidth="1.3" opacity=".45" strokeLinejoin="round" />
      <path d="M32 26 L44 20" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity=".8" />
    </svg>
  );
}
function SymGilt({ id }) {
  switch (id) {
    case "CROWN":
      return (
        <svg viewBox="0 0 100 100" filter="url(#gd-shadow)">
          <path d="M12 72 L8 28 L30 48 L50 16 L70 48 L92 28 L88 72Z" fill="url(#gd-gold)" stroke="#7a4a0c" strokeWidth="2.5" strokeLinejoin="round" />
          <rect x="12" y="70" width="76" height="14" rx="4" fill="url(#gd-gold-h)" stroke="#7a4a0c" strokeWidth="2" />
          <circle cx="50" cy="16" r="6" fill="#ff3b4e" stroke="#fff3c4" strokeWidth="1.5" /><circle cx="8" cy="28" r="5" fill="#2f6dff" stroke="#fff3c4" strokeWidth="1.5" /><circle cx="92" cy="28" r="5" fill="#2f6dff" stroke="#fff3c4" strokeWidth="1.5" />
          <circle cx="50" cy="77" r="5" fill="#ff3b4e" /><circle cx="30" cy="77" r="4" fill="#1fbf6a" /><circle cx="70" cy="77" r="4" fill="#1fbf6a" />
          <path d="M26 58 L50 36 L74 58" fill="none" stroke="#fff6c9" strokeWidth="2" opacity=".6" />
        </svg>
      );
    case "RING":
      return (
        <svg viewBox="0 0 100 100" filter="url(#gd-shadow)">
          <ellipse cx="50" cy="64" rx="30" ry="26" fill="none" stroke="url(#gd-gold)" strokeWidth="10" />
          <ellipse cx="50" cy="64" rx="30" ry="26" fill="none" stroke="#7a4a0c" strokeWidth="1.5" />
          <path d="M34 34 L42 22 L58 22 L66 34 L50 50Z" fill="#e8f6ff" stroke="#7fb8ff" strokeWidth="1.5" />
          <path d="M34 34 L66 34 M42 22 L50 34 L58 22 M50 34 L50 50" stroke="#7fb8ff" strokeWidth="1" />
          <circle cx="44" cy="27" r="2.5" fill="#fff" />
          <path d="M80 18v12M74 24h12" stroke="#fff" strokeWidth="2" />
        </svg>
      );
    case "CHALICE":
      return (
        <svg viewBox="0 0 100 100" filter="url(#gd-shadow)">
          <path d="M20 14 H80 Q80 52 50 58 Q20 52 20 14Z" fill="url(#gd-gold)" stroke="#7a4a0c" strokeWidth="2.5" />
          <ellipse cx="50" cy="14" rx="30" ry="6" fill="#8a0616" stroke="#7a4a0c" strokeWidth="2" />
          <rect x="45" y="56" width="10" height="18" fill="url(#gd-gold-h)" stroke="#7a4a0c" strokeWidth="1.5" />
          <path d="M26 88 Q50 72 74 88Z" fill="url(#gd-gold)" stroke="#7a4a0c" strokeWidth="2.5" />
          <circle cx="50" cy="34" r="7" fill="#ff3b4e" stroke="#fff3c4" strokeWidth="1.5" /><circle cx="33" cy="30" r="3.5" fill="#2f6dff" /><circle cx="67" cy="30" r="3.5" fill="#2f6dff" />
          <path d="M28 22 Q30 40 40 48" stroke="#fff6c9" strokeWidth="2.5" fill="none" opacity=".7" />
        </svg>
      );
    case "COIN":
      return (
        <svg viewBox="0 0 100 100" filter="url(#gd-shadow)">
          <circle cx="50" cy="50" r="40" fill="url(#gd-gold)" stroke="#7a4a0c" strokeWidth="2.5" />
          <circle cx="50" cy="50" r="31" fill="none" stroke="#a8670f" strokeWidth="2" strokeDasharray="3 3" />
          <path d="M32 58 L30 36 L41 46 L50 30 L59 46 L70 36 L68 58Z" fill="#a8670f" stroke="#fff3c4" strokeWidth="1.5" strokeLinejoin="round" />
          <rect x="32" y="58" width="36" height="7" rx="2" fill="#a8670f" />
          <ellipse cx="36" cy="30" rx="10" ry="5" fill="#fff" opacity=".5" transform="rotate(-30 36 30)" />
        </svg>
      );
    case "RUBY": case "SAPPHIRE": case "EMERALD": case "AMETHYST":
      return <GemSym id={id} />;
    case "WILD":
      return (
        <svg viewBox="0 0 100 100" filter="url(#gd-shadow)">
          <path d="M50 4 L88 16 L86 54 Q80 82 50 96 Q20 82 14 54 L12 16Z" fill="url(#gd-gold)" stroke="#7a4a0c" strokeWidth="2.5" />
          <path d="M50 13 L79 22 L77 53 Q72 74 50 86 Q28 74 23 53 L21 22Z" fill="#4a1170" stroke="#ffd45a" strokeWidth="2" />
          <path d="M34 40 L32 26 L41 33 L50 22 L59 33 L68 26 L66 40Z" fill="url(#gd-gold)" stroke="#7a4a0c" strokeWidth="1.2" />
          <rect x="14" y="48" width="72" height="22" rx="6" fill="#2a0607" stroke="url(#gd-gold)" strokeWidth="2" />
          <text x="50" y="65" textAnchor="middle" fontFamily="Prompt,Arial Black,sans-serif" fontWeight="900" fontSize="17" fill="url(#gd-gold)" letterSpacing="1">WILD</text>
        </svg>
      );
    case "SCATTER":
      return (
        <svg viewBox="0 0 100 100" filter="url(#gd-shadow)">
          <circle cx="50" cy="40" r="38" fill="url(#gd-flame)" className="gd-flame" />
          <path d="M16 46 Q16 22 50 22 Q84 22 84 46Z" fill="#7a3a12" stroke="#ffd45a" strokeWidth="2.5" />
          <rect x="16" y="44" width="68" height="28" rx="3" fill="#8a4516" stroke="#ffd45a" strokeWidth="2.5" />
          <path d="M16 54 H84 M38 22 V72 M62 22 V72" stroke="#ffd45a" strokeWidth="3" />
          <rect x="44" y="48" width="12" height="13" rx="2" fill="url(#gd-gold)" stroke="#7a4a0c" strokeWidth="1.2" />
          <circle cx="30" cy="38" r="5" fill="#ff3b4e" /><circle cx="70" cy="36" r="5" fill="#2f6dff" /><circle cx="50" cy="32" r="6" fill="#fff6c9" />
          <rect x="8" y="74" width="84" height="19" rx="6" fill="#4a1170" stroke="url(#gd-gold)" strokeWidth="2" />
          <text x="50" y="88" textAnchor="middle" fontFamily="Prompt,Arial Black,sans-serif" fontWeight="900" fontSize="12.5" fill="#fff3c4" letterSpacing=".5">SCATTER</text>
        </svg>
      );
    default: return null;
  }
}

// ======================================================================= Classic 777
const FONT_BLACK = "'Arial Black','Prompt',Impact,sans-serif";
function SymClassic({ id }) {
  switch (id) {
    case "SEVEN":
      return (
        <svg viewBox="0 0 100 100" filter="url(#gd-shadow)">
          <text x="50" y="84" textAnchor="middle" fontFamily={FONT_BLACK} fontWeight="900" fontSize="86" fill="url(#gd-red)" stroke="url(#gd-gold)" strokeWidth="5" paintOrder="stroke">7</text>
          <text x="50" y="84" textAnchor="middle" fontFamily={FONT_BLACK} fontWeight="900" fontSize="86" fill="none" stroke="#5c0509" strokeWidth="1.2">7</text>
          <path d="M30 22 L44 22" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity=".6" />
        </svg>
      );
    case "BAR":
      return (
        <svg viewBox="0 0 100 100" filter="url(#gd-shadow)">
          {[16, 40, 64].map((y, i) => (
            <g key={y}>
              <rect x="10" y={y} width="80" height="20" rx="5" fill="#16161c" stroke="url(#gd-gold)" strokeWidth="2.5" />
              <text x="50" y={y + 16} textAnchor="middle" fontFamily={FONT_BLACK} fontWeight="900" fontSize="15" fill={i === 1 ? "#ff5a4a" : "url(#gd-gold)"} letterSpacing="2">BAR</text>
            </g>
          ))}
        </svg>
      );
    case "BELL":
      return (
        <svg viewBox="0 0 100 100" filter="url(#gd-shadow)">
          <path d="M50 10 C70 10 76 30 76 48 C76 62 84 70 90 74 L10 74 C16 70 24 62 24 48 C24 30 30 10 50 10Z" fill="url(#gd-gold)" stroke="#7a4a0c" strokeWidth="2.5" />
          <rect x="8" y="72" width="84" height="8" rx="4" fill="url(#gd-gold-h)" stroke="#7a4a0c" strokeWidth="1.5" />
          <circle cx="50" cy="86" r="8" fill="url(#gd-gold)" stroke="#7a4a0c" strokeWidth="2" />
          <path d="M36 24 Q32 40 34 56" stroke="#fff6c9" strokeWidth="4" strokeLinecap="round" fill="none" opacity=".75" />
        </svg>
      );
    case "STAR":
      return (
        <svg viewBox="0 0 100 100" filter="url(#gd-shadow)">
          <path d="M50 6 L62 36 L94 38 L69 58 L78 90 L50 72 L22 90 L31 58 L6 38 L38 36Z" fill="url(#gd-gold)" stroke="#7a4a0c" strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M50 22 L57 40 L76 41 L61 53 L66 72 L50 61 L34 72 L39 53 L24 41 L43 40Z" fill="#ffe68a" opacity=".55" />
        </svg>
      );
    case "CHERRY":
      return (
        <svg viewBox="0 0 100 100" filter="url(#gd-shadow)">
          <path d="M34 62 Q40 30 62 12 M68 58 Q64 32 62 12" stroke="#2f7d32" strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M62 12 Q80 8 86 22 Q72 26 62 12Z" fill="#43a047" />
          <circle cx="32" cy="68" r="20" fill="url(#gd-red)" stroke="#5c0509" strokeWidth="2" /><circle cx="68" cy="64" r="20" fill="url(#gd-red)" stroke="#5c0509" strokeWidth="2" />
          <ellipse cx="25" cy="60" rx="6" ry="4" fill="#fff" opacity=".7" /><ellipse cx="61" cy="56" rx="6" ry="4" fill="#fff" opacity=".7" />
        </svg>
      );
    case "LEMON":
      return (
        <svg viewBox="0 0 100 100" filter="url(#gd-shadow)">
          <defs><radialGradient id="cl-lemon" cx=".35" cy=".3" r=".8"><stop offset="0" stopColor="#fffbd0" /><stop offset=".5" stopColor="#ffe03a" /><stop offset="1" stopColor="#c99a00" /></radialGradient></defs>
          <path d="M8 52 Q14 22 50 18 Q86 22 92 52 Q86 82 50 84 Q14 82 8 52Z" fill="url(#cl-lemon)" stroke="#9a7400" strokeWidth="2" />
          <path d="M4 52 L12 50 M96 52 L88 50" stroke="#9a7400" strokeWidth="5" strokeLinecap="round" />
          <ellipse cx="34" cy="36" rx="12" ry="6" fill="#fff" opacity=".55" transform="rotate(-15 34 36)" />
        </svg>
      );
    case "ORANGE":
      return (
        <svg viewBox="0 0 100 100" filter="url(#gd-shadow)">
          <defs><radialGradient id="cl-orange" cx=".35" cy=".3" r=".8"><stop offset="0" stopColor="#ffe0b0" /><stop offset=".5" stopColor="#ff8a1f" /><stop offset="1" stopColor="#b34a00" /></radialGradient></defs>
          <circle cx="50" cy="56" r="36" fill="url(#cl-orange)" stroke="#8a3a00" strokeWidth="2" />
          <path d="M50 20 Q60 6 76 10 Q70 24 50 20Z" fill="#43a047" stroke="#1b5e20" strokeWidth="1.5" />
          <circle cx="50" cy="21" r="3" fill="#5d4037" />
          <ellipse cx="36" cy="40" rx="10" ry="6" fill="#fff" opacity=".5" transform="rotate(-30 36 40)" />
        </svg>
      );
    case "GRAPE":
      return (
        <svg viewBox="0 0 100 100" filter="url(#gd-shadow)">
          <defs><radialGradient id="cl-grape" cx=".35" cy=".3" r=".8"><stop offset="0" stopColor="#e9c8ff" /><stop offset=".5" stopColor="#8e3bd6" /><stop offset="1" stopColor="#3a0b6e" /></radialGradient></defs>
          <path d="M50 18 Q52 8 62 4" stroke="#5d4037" strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M52 16 Q72 6 82 18 Q66 26 52 16Z" fill="#43a047" />
          {[[34, 30], [50, 28], [66, 30], [26, 46], [42, 46], [58, 46], [74, 46], [34, 62], [50, 62], [66, 62], [42, 78], [58, 78], [50, 92]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y - 2} r="9.5" fill="url(#cl-grape)" stroke="#2a0750" strokeWidth="1" />
          ))}
        </svg>
      );
    case "WILD":
      return (
        <svg viewBox="0 0 100 100" filter="url(#gd-shadow)">
          <defs><linearGradient id="cl-wild" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ff5a4a" /><stop offset=".35" stopColor="#ffd45a" /><stop offset=".65" stopColor="#3fd69a" /><stop offset="1" stopColor="#3f8bff" /></linearGradient></defs>
          <path d="M50 4 L96 50 L50 96 L4 50Z" fill="url(#cl-wild)" stroke="#fff6c9" strokeWidth="3" />
          <path d="M50 14 L86 50 L50 86 L14 50Z" fill="#16161c" stroke="url(#gd-gold)" strokeWidth="2" />
          <text x="50" y="58" textAnchor="middle" fontFamily={FONT_BLACK} fontWeight="900" fontSize="20" fill="url(#gd-gold)" letterSpacing="1">WILD</text>
        </svg>
      );
    case "SCATTER":
      return (
        <svg viewBox="0 0 100 100" filter="url(#gd-shadow)">
          <circle cx="50" cy="46" r="42" fill="url(#gd-flame)" className="gd-flame" />
          <circle cx="50" cy="46" r="32" fill="url(#gd-gold)" stroke="#7a4a0c" strokeWidth="2.5" />
          <circle cx="50" cy="46" r="25" fill="url(#gd-red)" stroke="#ffd45a" strokeWidth="2" />
          <path d="M50 28 L55 41 L69 41 L58 50 L62 63 L50 55 L38 63 L42 50 L31 41 L45 41Z" fill="url(#gd-gold)" />
          <rect x="16" y="74" width="68" height="19" rx="6" fill="#16161c" stroke="url(#gd-gold)" strokeWidth="2" />
          <text x="50" y="88.5" textAnchor="middle" fontFamily={FONT_BLACK} fontWeight="900" fontSize="13" fill="#fff3c4" letterSpacing="1.5">BONUS</text>
        </svg>
      );
    default: return null;
  }
}

// ======================================================================= Jungle
function SymJungle({ id }) {
  switch (id) {
    case "MASK":
      return (
        <svg viewBox="0 0 100 100" filter="url(#gd-shadow)">
          {[-50, -25, 0, 25, 50].map((a) => <path key={a} d="M50 34 Q46 14 50 2 Q54 14 50 34Z" fill={a % 50 ? "#2fc27a" : "#ff6a3d"} transform={`rotate(${a} 50 40)`} />)}
          <path d="M22 34 Q50 22 78 34 L74 70 Q50 96 26 70Z" fill="url(#gd-gold)" stroke="#7a4a0c" strokeWidth="2.5" />
          <path d="M32 48 L44 46 L42 54 L32 54Z M68 48 L56 46 L58 54 L68 54Z" fill="#1a2a12" />
          <path d="M46 56 L50 68 L54 56" fill="none" stroke="#7a4a0c" strokeWidth="2" />
          <path d="M38 76 Q50 82 62 76" stroke="#7a4a0c" strokeWidth="3" fill="none" />
          <path d="M28 40 L72 40" stroke="#1fbf6a" strokeWidth="3" />
          <circle cx="50" cy="34" r="4" fill="#1fbf6a" stroke="#fff3c4" strokeWidth="1" />
        </svg>
      );
    case "SUN":
      return (
        <svg viewBox="0 0 100 100" filter="url(#gd-shadow)">
          {Array.from({ length: 12 }).map((_, i) => <path key={i} d="M50 2 L56 18 L44 18Z" fill="url(#gd-gold)" stroke="#7a4a0c" strokeWidth="1" transform={`rotate(${i * 30} 50 50)`} />)}
          <circle cx="50" cy="50" r="32" fill="url(#gd-gold)" stroke="#7a4a0c" strokeWidth="2.5" />
          <circle cx="50" cy="50" r="24" fill="none" stroke="#a8670f" strokeWidth="2" strokeDasharray="4 3" />
          <circle cx="42" cy="46" r="3.5" fill="#7a4a0c" /><circle cx="58" cy="46" r="3.5" fill="#7a4a0c" />
          <path d="M40 58 Q50 66 60 58" stroke="#7a4a0c" strokeWidth="3" fill="none" strokeLinecap="round" />
          <ellipse cx="38" cy="34" rx="8" ry="4" fill="#fff" opacity=".5" transform="rotate(-30 38 34)" />
        </svg>
      );
    case "PYRAMID":
      return (
        <svg viewBox="0 0 100 100" filter="url(#gd-shadow)">
          <defs><linearGradient id="jg-stone" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#c9c3a3" /><stop offset="1" stopColor="#6e6a4e" /></linearGradient></defs>
          {[[38, 62, 18], [30, 70, 34], [22, 78, 50], [14, 86, 66]].map(([a, b, y], i) => (
            <rect key={i} x={a} y={y} width={b - a} height="16" fill="url(#jg-stone)" stroke="#3a3826" strokeWidth="1.5" />
          ))}
          <rect x="40" y="10" width="20" height="10" fill="url(#gd-gold)" stroke="#7a4a0c" strokeWidth="1.5" />
          <rect x="44" y="66" width="12" height="16" fill="#1a1a10" />
          <path d="M18 66 Q12 56 20 48 M82 62 Q90 52 82 44" stroke="#2fc27a" strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M84 86 H96 M4 86 H16" stroke="#2fc27a" strokeWidth="5" strokeLinecap="round" />
        </svg>
      );
    case "FLOWER":
      return (
        <svg viewBox="0 0 100 100" filter="url(#gd-shadow)">
          <defs><radialGradient id="jg-petal" cx=".5" cy=".9" r=".9"><stop offset="0" stopColor="#8a0631" /><stop offset=".4" stopColor="#ff3b6e" /><stop offset="1" stopColor="#ffb3c8" /></radialGradient></defs>
          {[0, 72, 144, 216, 288].map((a) => <path key={a} d="M50 50 C30 40 30 10 50 8 C70 10 70 40 50 50Z" fill="url(#jg-petal)" stroke="#8a0631" strokeWidth="1" transform={`rotate(${a} 50 50)`} />)}
          <circle cx="50" cy="50" r="7" fill="#ffd45a" stroke="#a8670f" strokeWidth="1.5" />
          <path d="M50 50 L64 30" stroke="#ffd45a" strokeWidth="2.5" /><circle cx="64" cy="30" r="3" fill="#ffd45a" />
        </svg>
      );
    case "A": case "K": case "Q": case "J":
      return (
        <svg viewBox="0 0 100 100" filter="url(#gd-shadow)">
          <defs><linearGradient id={`jg-l-${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={{ A: "#9dffcf", K: "#ffe68a", Q: "#b9dcff", J: "#ffc2a6" }[id]} /><stop offset="1" stopColor={{ A: "#0b8a4e", K: "#b37a10", Q: "#1f5fbf", J: "#c2471f" }[id]} /></linearGradient></defs>
          <path d="M14 70 Q8 50 22 44 M86 72 Q94 52 80 44" stroke="#1f8a4a" strokeWidth="4" fill="none" strokeLinecap="round" />
          <ellipse cx="22" cy="44" rx="7" ry="4" fill="#2fc27a" transform="rotate(-40 22 44)" /><ellipse cx="80" cy="44" rx="7" ry="4" fill="#2fc27a" transform="rotate(40 80 44)" />
          <text x="50" y="80" textAnchor="middle" fontFamily="Georgia,'Times New Roman',serif" fontWeight="900" fontSize="74" fill={`url(#jg-l-${id})`} stroke="#1a1206" strokeWidth="3" paintOrder="stroke">{id}</text>
        </svg>
      );
    case "WILD":
      return (
        <svg viewBox="0 0 100 100" filter="url(#gd-shadow)">
          <path d="M50 4 C86 14 94 54 50 96 C6 54 14 14 50 4Z" fill="#1fbf6a" stroke="#0b5d36" strokeWidth="2.5" />
          <path d="M50 10 V90 M50 30 L30 20 M50 46 L24 36 M50 62 L28 54 M50 30 L70 20 M50 46 L76 36 M50 62 L72 54" stroke="#9dffcf" strokeWidth="2" opacity=".7" />
          <rect x="12" y="40" width="76" height="24" rx="6" fill="#0b2a14" stroke="url(#gd-gold)" strokeWidth="2.5" />
          <text x="50" y="58" textAnchor="middle" fontFamily="Prompt,Arial Black,sans-serif" fontWeight="900" fontSize="18" fill="url(#gd-gold)" letterSpacing="1">WILD</text>
        </svg>
      );
    case "SCATTER":
      return (
        <svg viewBox="0 0 100 100" filter="url(#gd-shadow)">
          <circle cx="50" cy="44" r="42" fill="url(#gd-flame)" className="gd-flame" />
          <circle cx="50" cy="44" r="32" fill="url(#gd-gold)" stroke="#7a4a0c" strokeWidth="2.5" />
          <circle cx="50" cy="44" r="24" fill="url(#gd-jade)" stroke="#0a4a2b" strokeWidth="2" />
          <path d="M50 26 L62 44 L50 62 L38 44Z" fill="#e8fff2" stroke="#0b5d36" strokeWidth="1.5" />
          <path d="M50 26 L50 62 M38 44 L62 44" stroke="#2fc27a" strokeWidth="1" />
          <rect x="8" y="74" width="84" height="19" rx="6" fill="#0b2a14" stroke="url(#gd-gold)" strokeWidth="2" />
          <text x="50" y="88" textAnchor="middle" fontFamily="Prompt,Arial Black,sans-serif" fontWeight="900" fontSize="12.5" fill="#fff3c4" letterSpacing=".5">SCATTER</text>
        </svg>
      );
    default: return null;
  }
}

// ======================================================================= theme table
// look = CSS custom properties applied to the game root (background, reel window, glow)
export const SLOT_THEMES = {
  goldendragon: {
    Sym: SymGD, titleTh: "มังกรทองนำโชค", titleEn: "GOLDEN DRAGON", bigSym: "WILD",
    look: { "--bg1": "#4a0a0e", "--bg2": "#2a0508", "--bg3": "#160304", "--glow": "rgba(255,90,60,0.35)", "--reelA": "#5e0c12", "--reelB": "#2a0407" },
  },
  giltreels: {
    Sym: SymGilt, titleTh: "ขุมทรัพย์ราชันย์", titleEn: "GILT REELS", bigSym: "CROWN",
    look: { "--bg1": "#3d0f4f", "--bg2": "#230833", "--bg3": "#12041c", "--glow": "rgba(200,110,255,0.32)", "--reelA": "#4a1462", "--reelB": "#1e0730" },
  },
  classicslots: {
    Sym: SymClassic, titleTh: "777 คลาสสิก", titleEn: "CLASSIC SLOTS", bigSym: "SEVEN",
    look: { "--bg1": "#3a0d0d", "--bg2": "#1c0a0a", "--bg3": "#0c0505", "--glow": "rgba(255,60,60,0.35)", "--reelA": "#f6efe0", "--reelB": "#d8cdb0" },
    lightReels: true,
  },
  jungle: {
    Sym: SymJungle, titleTh: "ป่ามรกต", titleEn: "JUNGLE RICHES", bigSym: "MASK",
    look: { "--bg1": "#0f3d22", "--bg2": "#082414", "--bg3": "#04120a", "--glow": "rgba(80,255,160,0.28)", "--reelA": "#14502d", "--reelB": "#06200f" },
  },
};
