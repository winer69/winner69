// น้ำเต้าปูปลา - integrated into WINNER 69. Credits come from the shared wallet; each roll is
// decided by the server (/api/games/namtao/roll) or, without a server, locally by the same
// rules in backend/src/namtao.js using the admin RTP for "hoohey".
import React, { useState, useEffect, useRef, useMemo } from "react";
import { ntPick } from "../backend/src/namtao.js";

/* =========================================================
   น้ำเต้า ปู ปลา — Thai Hoo Hey How dice game (React)
   Single-file component. Play-money credits only.
   ========================================================= */

/* ---------- artwork: six symbols as SVG data URIs ---------- */
const ART=(function(){
const M=s=>`<g transform="translate(200 0) scale(-1 1)">${s}</g>`;
const W=(defs,body)=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><defs>${defs}<radialGradient id="hl" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff" stop-opacity=".75"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>${body}</svg>`;

const gourd=W(`
<linearGradient id="b" x1="0" x2="1"><stop offset="0" stop-color="#6e4310"/><stop offset=".22" stop-color="#c98a2e"/><stop offset=".42" stop-color="#f3d27c"/><stop offset=".68" stop-color="#c0832a"/><stop offset="1" stop-color="#5a340b"/></linearGradient>
<radialGradient id="sh" cx=".5" cy=".2" r=".9"><stop offset=".55" stop-color="#3a1f04" stop-opacity="0"/><stop offset="1" stop-color="#3a1f04" stop-opacity=".55"/></radialGradient>
<linearGradient id="lf" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9ccc65"/><stop offset="1" stop-color="#2e6b1f"/></linearGradient>
<linearGradient id="cd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ef5350"/><stop offset="1" stop-color="#8e0e0e"/></linearGradient>`,
`<path d="M100 44C99 32 103 22 111 15" stroke="#4a2e12" stroke-width="6" fill="none" stroke-linecap="round"/>
<path d="M106 24C118 6 146 4 162 15C146 30 120 34 106 24Z" fill="url(#lf)" stroke="#24521a" stroke-width="1.5"/>
<path d="M109 23C124 18 142 15 158 15M126 19L132 11M140 17L148 10M128 20L136 26" stroke="#24521a" stroke-width="1.1" fill="none"/>
<path id="g" d="M100 42C86 42 78 54 78 70C78 86 88 92 88 100C88 106 56 112 54 140C52 168 74 188 100 188C126 188 148 168 146 140C144 112 112 106 112 100C112 92 122 86 122 70C122 54 114 42 100 42Z" fill="url(#b)" stroke="#4a2a08" stroke-width="1.6"/>
<path d="M100 42C86 42 78 54 78 70C78 86 88 92 88 100C88 106 56 112 54 140C52 168 74 188 100 188C126 188 148 168 146 140C144 112 112 106 112 100C112 92 122 86 122 70C122 54 114 42 100 42Z" fill="url(#sh)"/>
<g stroke="#6e4310" stroke-opacity=".35" fill="none" stroke-width="1.2"><path d="M100 112C92 130 92 166 100 186"/><path d="M118 116C128 134 128 166 118 184"/><path d="M82 116C72 134 72 166 82 184"/></g>
<ellipse cx="80" cy="134" rx="11" ry="24" fill="url(#hl)" transform="rotate(12 80 134)"/>
<ellipse cx="91" cy="62" rx="6" ry="13" fill="url(#hl)"/>
<path d="M87 96Q100 103 113 96L113 104Q100 111 87 104Z" fill="url(#cd)" stroke="#5a0808" stroke-width="1"/>
<path d="M110 104Q115 118 108 130" stroke="#b71c1c" stroke-width="2.6" fill="none" stroke-linecap="round"/>
<path d="M104 130L112 130L110 142L106 142Z" fill="#c62828"/>`);

const crabHalf=`<g fill="none" stroke-linecap="round" stroke-linejoin="round">
<g stroke="#5e1407" stroke-width="8"><path d="M70 112L44 100L28 112"/><path d="M68 122L40 122L26 140"/><path d="M70 132L46 142L38 162"/><path d="M78 140L64 160L50 168"/><path d="M82 96L62 76"/></g>
<g stroke="#d4512f" stroke-width="3.5"><path d="M70 112L44 100L28 112"/><path d="M68 122L40 122L26 140"/><path d="M70 132L46 142L38 162"/><path d="M78 140L64 160L50 168"/><path d="M82 96L62 76"/></g></g>
<path d="M66 82C46 94 22 82 20 58C19 44 30 33 46 33C46 46 52 56 62 58C72 64 74 74 66 82Z" fill="url(#cl)" stroke="#4a0f05" stroke-width="1.5"/>
<path d="M46 33C52 19 72 17 82 30C72 32 64 38 60 46C55 44 50 40 46 33Z" fill="url(#cl)" stroke="#4a0f05" stroke-width="1.5"/>
<path d="M73 24C79 24 83 27 82 30C78 31 75 29 73 24Z" fill="#1a0a05"/><path d="M24 70C20 64 19 58 20 54C23 58 25 63 28 66Z" fill="#1a0a05"/>
<ellipse cx="38" cy="54" rx="7" ry="12" fill="url(#hl)" transform="rotate(30 38 54)"/>
<g fill="#f6e3c9"><circle cx="58" cy="48" r="1.5"/><circle cx="54" cy="43" r="1.5"/><circle cx="63" cy="42" r="1.4"/></g>
<path d="M92 82L89 70" stroke="#5e1407" stroke-width="4" stroke-linecap="round"/><circle cx="89" cy="67" r="4.6" fill="#111"/><circle cx="87.6" cy="65.6" r="1.4" fill="#fff"/>`;
const crab=W(`
<radialGradient id="cs" cx=".45" cy=".3" r=".75"><stop offset="0" stop-color="#f58560"/><stop offset=".5" stop-color="#c2361d"/><stop offset="1" stop-color="#6e1508"/></radialGradient>
<radialGradient id="cl" cx=".4" cy=".35" r=".75"><stop offset="0" stop-color="#f27a52"/><stop offset=".6" stop-color="#a8260f"/><stop offset="1" stop-color="#5a1005"/></radialGradient>`,
crabHalf+M(crabHalf)+`<path d="M48 108C48 82 72 70 100 70C128 70 152 82 152 108C152 134 128 148 100 148C72 148 48 134 48 108Z" fill="url(#cs)" stroke="#4a0f05" stroke-width="1.8"/>
<path d="M56 92L62 87L65 91L72 84L76 88L84 80L88 84L96 78L100 81L104 78L112 84L116 80L124 88L128 84L135 91L138 87L144 92" stroke="#4a0f05" stroke-width="1.2" fill="none" opacity=".55"/>
<path d="M82 102Q100 116 118 102M100 110L100 130M78 122Q90 130 100 130Q110 130 122 122" stroke="#4a0a00" stroke-opacity=".45" stroke-width="1.6" fill="none"/>
<g fill="#ffe0c0" opacity=".35"><circle cx="70" cy="104" r="2"/><circle cx="76" cy="116" r="1.5"/><circle cx="130" cy="104" r="2"/><circle cx="124" cy="116" r="1.5"/><circle cx="88" cy="134" r="1.6"/><circle cx="112" cy="134" r="1.6"/><circle cx="64" cy="118" r="1.3"/><circle cx="136" cy="118" r="1.3"/></g>
<ellipse cx="84" cy="90" rx="24" ry="8" fill="url(#hl)" transform="rotate(-12 84 90)"/>`);

const fish=W(`
<linearGradient id="bd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4f5f3c"/><stop offset=".3" stop-color="#b9a45c"/><stop offset=".55" stop-color="#ece0b4"/><stop offset="1" stop-color="#fbf7ea"/></linearGradient>
<linearGradient id="fn" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f7a04a" stop-opacity=".95"/><stop offset="1" stop-color="#b8321c" stop-opacity=".95"/></linearGradient>
<pattern id="sc" width="12" height="10" patternUnits="userSpaceOnUse"><path d="M0 10Q6 0 12 10" stroke="#5a4a1e" stroke-opacity=".4" fill="none" stroke-width="1"/><path d="M-6 5Q0 -5 6 5M6 5Q12 -5 18 5" stroke="#5a4a1e" stroke-opacity=".4" fill="none" stroke-width="1"/></pattern>
<clipPath id="bc"><path d="M22 102C34 74 70 62 104 64C130 66 148 84 156 100C148 116 130 134 104 136C70 138 34 128 22 102Z"/></clipPath>`,
`<path d="M150 100C162 86 176 66 190 56C183 80 183 92 187 100C183 108 183 120 190 144C176 134 162 114 150 100Z" fill="url(#fn)" stroke="#6b2a10" stroke-width="1.2"/>
<g stroke="#7a2a10" stroke-opacity=".45" stroke-width="1"><path d="M154 100L188 62M154 100L184 80M154 100L186 100M154 100L184 120M154 100L188 138"/></g>
<path d="M76 68C88 40 118 36 136 64C116 60 98 62 76 68Z" fill="url(#fn)" stroke="#6b2a10" stroke-width="1.2"/>
<g stroke="#7a2a10" stroke-opacity=".4" stroke-width="1"><path d="M90 66L96 46M104 64L110 42M118 62L122 46"/></g>
<path d="M96 130C100 150 112 156 122 148C114 140 108 134 104 128Z" fill="url(#fn)" stroke="#6b2a10" stroke-width="1"/>
<path d="M126 124C132 140 142 142 148 134C142 128 136 124 132 120Z" fill="url(#fn)" stroke="#6b2a10" stroke-width="1"/>
<path d="M22 102C34 74 70 62 104 64C130 66 148 84 156 100C148 116 130 134 104 136C70 138 34 128 22 102Z" fill="url(#bd)" stroke="#3c3a20" stroke-width="1.6"/>
<g clip-path="url(#bc)"><rect x="60" y="60" width="100" height="80" fill="url(#sc)"/></g>
<path d="M56 75C66 92 66 112 54 129" stroke="#3c3a20" stroke-width="1.6" fill="none"/>
<path d="M62 101C90 98 120 98 152 100" stroke="#3c3a20" stroke-opacity=".45" stroke-dasharray="2 3" fill="none"/>
<path d="M62 110C72 120 88 122 94 116C84 110 72 106 62 110Z" fill="url(#fn)" stroke="#6b2a10" stroke-width="1"/>
<path d="M48 78C80 66 120 68 142 86" stroke="#fff" stroke-opacity=".55" stroke-width="3" fill="none" stroke-linecap="round"/>
<circle cx="40" cy="94" r="7.5" fill="#e8c34a" stroke="#3c3a20" stroke-width="1.3"/><circle cx="39" cy="94" r="4.2" fill="#111"/><circle cx="37.5" cy="92.5" r="1.6" fill="#fff"/>
<path d="M22 102Q28 105 33 102" stroke="#3c3a20" stroke-width="1.4" fill="none"/>
<path d="M27 106Q23 114 16 117" stroke="#6b5a30" stroke-width="1.3" fill="none"/>`);

const tEar=`<circle cx="54" cy="52" r="21" fill="#c66a10" stroke="#3a1a02" stroke-width="1.5"/><path d="M36 44A21 21 0 0 1 70 38" stroke="#1b0f05" stroke-width="5" fill="none"/><ellipse cx="55" cy="55" rx="11" ry="12" fill="#f3e6d8"/>`;
const tFace=`<path d="M38 100C48 102 58 106 64 112C54 111 45 108 38 100Z"/><path d="M34 115C46 117 56 121 60 127C50 125 42 121 34 115Z"/><path d="M44 136C52 136 60 138 64 142C56 142 50 140 44 136Z"/>
<path d="M86 50C84 58 86 66 92 70C90 62 90 56 86 50Z"/><path d="M72 58C70 66 74 72 84 75C80 69 77 64 72 58Z"/><path d="M60 72C60 80 64 84 72 86C68 82 64 78 60 72Z"/>`;
const tEye=`<ellipse cx="74" cy="84" rx="13" ry="5" fill="#fff" opacity=".85" transform="rotate(-14 74 84)"/>
<path d="M64 97C70 89 84 89 90 97C84 104 70 104 64 97Z" fill="#e8b830" stroke="#1a0c02" stroke-width="2.2"/><ellipse cx="77" cy="97" rx="3" ry="5.5" fill="#111"/><circle cx="74" cy="94.5" r="1.6" fill="#fff"/>
<path d="M90 97Q96 101 97 108" stroke="#1a0c02" stroke-width="2" fill="none"/>
<path d="M84 136Q60 132 38 140M84 140Q62 140 42 150" stroke="#fff" stroke-width=".9" opacity=".85" fill="none"/>
<g fill="#3a2a1a"><circle cx="86" cy="132" r="1.2"/><circle cx="82" cy="136" r="1.2"/><circle cx="88" cy="138" r="1.2"/></g>`;
const tiger=W(`
<radialGradient id="fur" cx=".5" cy=".42" r=".62"><stop offset="0" stop-color="#ffc56d"/><stop offset=".6" stop-color="#e8891e"/><stop offset="1" stop-color="#9a4806"/></radialGradient>
<radialGradient id="wh" cx=".5" cy=".3" r=".8"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#e6d9c6"/></radialGradient>`,
tEar+M(tEar)+`<path d="M100 40C136 40 162 62 166 96C170 110 178 118 172 124C164 132 168 140 158 146C146 168 124 178 100 178C76 178 54 168 42 146C32 140 36 132 28 124C22 118 30 110 34 96C38 62 64 40 100 40Z" fill="url(#fur)" stroke="#3a1a02" stroke-width="1.5"/>
<path d="M40 124C48 140 62 150 80 150C90 150 96 144 100 140C104 144 110 150 120 150C138 150 152 140 160 124C152 152 128 172 100 172C72 172 48 152 40 124Z" fill="url(#wh)"/>
<ellipse cx="88" cy="131" rx="14" ry="11" fill="url(#wh)"/><ellipse cx="112" cy="131" rx="14" ry="11" fill="url(#wh)"/>
<g fill="#1b0f05">${tFace}${M(tFace)}<path d="M100 46C96 56 96 66 100 76C104 66 104 56 100 46Z"/></g>
${tEye}${M(tEye)}
<path d="M100 78C94 92 94 104 96 110L104 110C106 104 106 92 100 78Z" fill="#f7b35a" opacity=".6"/>
<path d="M88 112C88 106 112 106 112 112C112 118 104 124 100 126C96 124 88 118 88 112Z" fill="#c9706e" stroke="#3a1a02" stroke-width="1.2"/>
<ellipse cx="96" cy="110" rx="4" ry="2" fill="#fff" opacity=".5"/>
<path d="M100 126L100 134M100 134Q92 142 84 138M100 134Q108 142 116 138" stroke="#2a1404" stroke-width="1.8" fill="none" stroke-linecap="round"/>`);

const shrimp=W(`
<linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffc19b"/><stop offset=".45" stop-color="#ec6430"/><stop offset="1" stop-color="#9c2d0c"/></linearGradient>
<radialGradient id="hd" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#ffb08a"/><stop offset=".6" stop-color="#e2541f"/><stop offset="1" stop-color="#8e270a"/></radialGradient>`,
`<g fill="none" stroke-linecap="round"><g stroke="#a8320f" stroke-width="1.4"><path d="M152 70C176 40 186 24 172 8"/><path d="M154 74C190 58 196 40 192 18"/><path d="M148 72C168 60 176 50 180 40"/></g>
<g stroke="#c0441a" stroke-width="2"><path d="M104 102L98 122"/><path d="M114 100L110 120"/><path d="M124 98L122 116"/><path d="M134 94L134 112"/><path d="M90 108L82 124"/><path d="M80 116L70 128"/></g>
<path d="M140 92C150 112 160 120 176 122" stroke="#b33a14" stroke-width="2.6"/><path d="M146 94C160 108 172 110 184 108" stroke="#b33a14" stroke-width="2.2"/></g>
<path d="M66 158L44 170C50 182 62 184 70 174C74 186 88 188 94 178C86 170 80 164 76 156Z" fill="url(#sg)" stroke="#7a240a" stroke-width="1.2"/>
<g stroke="#7a240a" stroke-opacity=".4"><path d="M70 160L52 176M72 162L68 180M74 160L86 180"/></g>
<ellipse cx="76" cy="150" rx="12" ry="10" transform="rotate(-60 76 150)" fill="url(#sg)" stroke="#7a240a" stroke-width="1.2"/>
<ellipse cx="72" cy="134" rx="14" ry="12" transform="rotate(-75 72 134)" fill="url(#sg)" stroke="#7a240a" stroke-width="1.2"/>
<ellipse cx="74" cy="117" rx="15" ry="13" transform="rotate(-92 74 117)" fill="url(#sg)" stroke="#7a240a" stroke-width="1.2"/>
<ellipse cx="82" cy="102" rx="16" ry="14" transform="rotate(-115 82 102)" fill="url(#sg)" stroke="#7a240a" stroke-width="1.2"/>
<ellipse cx="94" cy="92" rx="16" ry="15" transform="rotate(-140 94 92)" fill="url(#sg)" stroke="#7a240a" stroke-width="1.2"/>
<ellipse cx="108" cy="86" rx="16" ry="15" transform="rotate(-160 108 86)" fill="url(#sg)" stroke="#7a240a" stroke-width="1.2"/>
<g stroke="#fff" stroke-opacity=".55" stroke-width="2.2" fill="none" stroke-linecap="round"><path d="M98 78Q106 74 114 76"/><path d="M84 86Q90 82 96 82"/><path d="M70 98Q74 92 80 90"/><path d="M62 112Q64 106 68 104"/><path d="M60 128Q60 122 64 120"/></g>
<path d="M110 72C126 62 150 62 162 70L188 63L166 79C160 96 138 104 116 102C104 98 102 80 110 72Z" fill="url(#hd)" stroke="#7a240a" stroke-width="1.5"/>
<path d="M160 70L164 66.5L167 69.5L171 66L174 68.5L178 65.5" stroke="#7a240a" stroke-width="1.2" fill="none"/>
<path d="M120 78C132 72 146 72 154 76" stroke="#fff" stroke-opacity=".55" stroke-width="2.5" fill="none" stroke-linecap="round"/>
<circle cx="157" cy="77" r="4.8" fill="#111"/><circle cx="155.6" cy="75.6" r="1.4" fill="#fff"/>`);

const rooster=W(`
<linearGradient id="hk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd166"/><stop offset=".5" stop-color="#e08a22"/><stop offset="1" stop-color="#8e3a0c"/></linearGradient>
<radialGradient id="rb" cx=".45" cy=".35" r=".75"><stop offset="0" stop-color="#7a2a10"/><stop offset="1" stop-color="#1e0a05"/></radialGradient>
<linearGradient id="tl" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2d7a5e"/><stop offset=".5" stop-color="#0b1a14"/><stop offset="1" stop-color="#2b5b8a"/></linearGradient>
<linearGradient id="wg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b8461a"/><stop offset="1" stop-color="#4a1206"/></linearGradient>
<radialGradient id="cm" cx=".4" cy=".4" r=".7"><stop offset="0" stop-color="#ff6b5a"/><stop offset="1" stop-color="#a8100a"/></radialGradient>`,
`<path d="M72 104C40 80 30 46 44 20C46 50 62 76 86 96Z" fill="url(#tl)" stroke="#06110c" stroke-width="1"/>
<path d="M68 112C30 104 12 74 16 42C26 74 48 96 80 104Z" fill="url(#tl)" stroke="#06110c" stroke-width="1"/>
<path d="M70 118C34 126 14 106 10 86C30 104 50 112 76 112Z" fill="#161616" stroke="#000" stroke-width="1"/>
<g stroke="#7fd1b0" stroke-opacity=".45" fill="none" stroke-width="1.2"><path d="M46 28C48 54 60 76 80 94"/><path d="M20 50C30 76 48 94 74 104"/></g>
<g stroke="#d9a521" stroke-linecap="round" fill="none"><path d="M94 146L90 178" stroke-width="6"/><path d="M114 146L118 178" stroke-width="6"/><path d="M78 184L90 178L98 184M90 178L86 186M106 184L118 178L128 183M118 178L116 186" stroke-width="3.5"/></g>
<g stroke="#8a6a10" stroke-width="1" opacity=".6"><path d="M89 158L95 158M89 166L95 166M114 158L120 158M115 166L121 166"/></g>
<path d="M64 112C64 88 86 78 110 82C134 86 146 104 140 126C134 146 110 154 92 150C74 146 64 132 64 112Z" fill="url(#rb)" stroke="#120402" stroke-width="1.2"/>
<g stroke="#e8a33a" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".9"><path d="M88 86C78 94 72 104 70 116"/><path d="M96 84C86 94 80 104 78 116"/><path d="M104 84C96 94 90 104 88 114"/></g>
<path d="M78 106C96 92 124 96 132 112C124 134 98 142 80 130C74 122 74 112 78 106Z" fill="url(#wg)" stroke="#2a0a04" stroke-width="1"/>
<g stroke="#2a0a04" stroke-opacity=".6" fill="none"><path d="M86 112Q104 104 124 112"/><path d="M84 120Q104 114 126 120"/><path d="M86 128Q102 124 118 128"/></g>
<path d="M118 92C112 72 116 50 128 40C140 32 156 38 158 52C160 64 152 74 148 88C146 100 140 110 132 116C126 108 122 100 118 92Z" fill="url(#hk)" stroke="#5a2508" stroke-width="1.2"/>
<g stroke="#8e3a0c" stroke-opacity=".7" fill="none" stroke-width="1.2"><path d="M128 56C126 70 126 84 130 100"/><path d="M136 58C134 72 134 86 136 104"/><path d="M144 60C142 72 142 84 142 96"/></g>
<ellipse cx="146" cy="46" rx="13" ry="12" fill="#c62e1e" stroke="#5a0a04" stroke-width="1.2"/>
<path d="M134 37C136 28 145 25 152 29C157 29 160 34 157 38Z" fill="url(#cm)" stroke="#6a0805" stroke-width="1"/>
<path d="M157 43L174 48L157 53Z" fill="#e0b04a" stroke="#6b4a10" stroke-width="1.2"/>
<path d="M152 56C157 67 148 70 145 61Z" fill="url(#cm)"/>
<circle cx="150" cy="44" r="3.4" fill="#f2c84b" stroke="#111" stroke-width="1"/><circle cx="150.5" cy="44" r="1.7" fill="#111"/>`);

const L=[gourd,crab,fish,tiger,shrimp,rooster];
return L.map(s=>'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(s));
})();

const NAMES = ["น้ำเต้า", "ปู", "ปลา", "เสือ", "กุ้ง", "ไก่"];
const CHIPS = [
  { v: 10, c: "#1e88e5" }, { v: 50, c: "#2e9d3a" }, { v: 100, c: "#d32f2f" },
  { v: 500, c: "#8e24aa" }, { v: 1000, c: "#3a3a3a" },
];
const PAIR_PAY = 5;
// 6 single spots + 7 adjacent pairs on a 3×2 board (0 1 2 / 3 4 5)
const SPOTS = [
  ...[0, 1, 2, 3, 4, 5].map((a) => ({ id: "s" + a, a })),
  ...[[0, 1], [1, 2], [3, 4], [4, 5], [0, 3], [1, 4], [2, 5]].map(([a, b]) => {
    const ra = Math.floor(a / 3), ca = a % 3, rb = Math.floor(b / 3), cb = b % 3;
    return { id: "p" + a + b, a, b, pair: true,
      left: (((ca + cb) / 2 + 0.5) / 3) * 100 + "%", top: (((ra + rb) / 2 + 0.5) / 2) * 100 + "%" };
  }),
];
const BULB_C = ["#ff3b3b", "#ffd23f", "#3dff7a", "#3fa9ff", "#ff5ec4", "#ffffff"];

const fmt = (n) => n.toLocaleString("th-TH");
const short = (n) => (n >= 1e6 ? +(n / 1e6).toFixed(1) + "M" : n >= 1000 ? +(n / 1000).toFixed(1) + "K" : "" + n);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sumBets = (b) => Object.values(b).reduce((a, x) => a + x, 0);
const chipColor = (v) => CHIPS.reduce((c, ch) => (v >= ch.v ? ch.c : c), CHIPS[0].c);
function rnd6() {
  try { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] % 6; }
  catch (e) { return Math.floor(Math.random() * 6); }
}

/* ---------- sound (Web Audio, no files) ---------- */
const audio = { muted: false, ac: null, nb: null };
function AC() {
  if (audio.muted) return null;
  try {
    if (!audio.ac) audio.ac = new (window.AudioContext || window.webkitAudioContext)();
    if (audio.ac.state === "suspended") audio.ac.resume();
    return audio.ac;
  } catch (e) { return null; }
}
function tone(f, d, type = "sine", v = 0.15, t0 = 0) {
  const a = AC(); if (!a) return;
  const o = a.createOscillator(), g = a.createGain(), t = a.currentTime + t0;
  o.type = type; o.frequency.value = f;
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(g).connect(a.destination); o.start(t); o.stop(t + d + 0.03);
}
function noise(t0, f, v) {
  const a = AC(); if (!a) return;
  if (!audio.nb) {
    audio.nb = a.createBuffer(1, a.sampleRate * 0.08, a.sampleRate);
    const ch = audio.nb.getChannelData(0);
    for (let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / ch.length, 3);
  }
  const s = a.createBufferSource(); s.buffer = audio.nb;
  const bp = a.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = f; bp.Q.value = 3;
  const g = a.createGain(); g.gain.value = v;
  s.connect(bp).connect(g).connect(a.destination); s.start(a.currentTime + t0);
}
const sfx = {
  chip() { tone(1500, 0.06, "triangle", 0.12); tone(2200, 0.05, "triangle", 0.08, 0.03); },
  thud() { tone(120, 0.25, "sine", 0.3); noise(0, 2600, 0.35); noise(0.02, 900, 0.4); },
  rattle(ms) { for (let t = 0; t < ms / 1000; t += 0.03 + Math.random() * 0.045) noise(t, 2200 + Math.random() * 3500, 0.3 + Math.random() * 0.35); },
  scrape() { noise(0, 3200, 0.2); noise(0.05, 2800, 0.15); },
  open() { [660, 880, 1320].forEach((f, i) => tone(f, 0.3, "sine", 0.1, i * 0.08)); },
  win() { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.32, "square", 0.05, i * 0.09)); },
  lose() { tone(300, 0.25, "sine", 0.12); tone(220, 0.4, "sine", 0.12, 0.15); },
};

/* ---------- dice geometry & lighting ---------- */
const HZ = 26;
const FACE_R = ["rotateX(90deg)", "rotateX(-90deg)", "rotateY(90deg)", "rotateY(-90deg)", "rotateY(0deg)", "rotateY(180deg)"];
const BASE = [[74, 6], [30, 50], [118, 52]]; // back die first so front dice paint over it
const LIGHT = (() => { const v = [-0.38, -0.82, 0.43], l = Math.hypot(...v); return v.map((x) => x / l); })();
function faceNormal(cubeT, f) {
  const m = new DOMMatrix(cubeT || "none").multiply(new DOMMatrix(FACE_R[f]));
  const p = m.transformPoint(new DOMPoint(0, 0, 1, 0));
  return [p.x, p.y, p.z];
}
let ORIENT = null; // cube rotation that turns each symbol's face upward
function orient() {
  if (ORIENT) return ORIENT;
  const cands = ["", "rotateX(90deg)", "rotateX(-90deg)", "rotateX(180deg)", "rotateZ(90deg)", "rotateZ(-90deg)"];
  ORIENT = FACE_R.map((_, f) => cands.find((c) => faceNormal(c, f)[1] < -0.99) || "");
  return ORIENT;
}
function makeDice(res) {
  if (typeof DOMMatrix === "undefined") return [];
  const O = orient();
  return res.map((s, d) => {
    const yaw = Math.round(Math.random() * 70 - 35);
    const x = BASE[d][0] + Math.random() * 10 - 5, y = BASE[d][1] + Math.random() * 8 - 4;
    const T = `rotateX(-60deg) rotateY(${yaw}deg) ${O[s]}`.trim();
    const faces = FACE_R.map((_, f) => {
      const n = faceNormal(T, f), dt = n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2];
      return { shade: Math.max(0, Math.min(0.5, 0.42 - 0.48 * dt)), spec: Math.max(0, (dt - 0.6) * 1.1) };
    });
    return { x, y, T, faces };
  });
}

/* ---------- static SVG markup ---------- */
function buntingSVG() {
  const cols = ["#e53935", "#ffca28", "#43a047", "#1e88e5", "#ec407a", "#ff7043"];
  let h = '<path d="M0 3Q200 22 400 3" stroke="#f5c542" stroke-width="1.5" fill="none"/>';
  for (let i = 0; i < 16; i++) {
    const x = i * 25 + 3, y = 3 + 19 * (1 - Math.pow((x + 9 - 200) / 200, 2)) * 0.85;
    h += `<path d="M${x} ${y}L${x + 18} ${y}L${x + 9} ${y + 15}Z" fill="${cols[i % 6]}" stroke="rgba(0,0,0,.25)" stroke-width=".8"/>`;
  }
  return h;
}
const PLATE_SVG = `<defs>
<radialGradient id="pr" cx=".42" cy=".32" r=".75"><stop offset="0" stop-color="#ffffff"/><stop offset=".6" stop-color="#eef0ee"/><stop offset="1" stop-color="#b9bec4"/></radialGradient>
<radialGradient id="pw" cx=".45" cy=".4" r=".7"><stop offset="0" stop-color="#fbfbf8"/><stop offset=".75" stop-color="#e9ebe8"/><stop offset="1" stop-color="#c8ccd0"/></radialGradient>
<filter id="pblur"><feGaussianBlur stdDeviation="5"/></filter></defs>
<ellipse cx="152" cy="64" rx="146" ry="38" fill="#1a0002" opacity=".6" filter="url(#pblur)"/>
<ellipse cx="150" cy="58" rx="146" ry="42" fill="#9aa1a8"/>
<ellipse cx="150" cy="54" rx="146" ry="42" fill="url(#pr)"/>
<ellipse cx="150" cy="54" rx="137" ry="37" fill="none" stroke="#2a4fa6" stroke-width="2.2" opacity=".85"/>
<ellipse cx="150" cy="54" rx="132" ry="34.5" fill="none" stroke="#2a4fa6" stroke-width=".9" opacity=".7"/>
<ellipse cx="150" cy="53" rx="112" ry="27" fill="#c3c8cd"/>
<ellipse cx="150" cy="55" rx="110" ry="26" fill="url(#pw)"/>
<ellipse cx="150" cy="55" rx="40" ry="9" fill="none" stroke="#2a4fa6" stroke-width="1" opacity=".35"/>
<path d="M30 40A130 30 0 0 1 120 16" stroke="#fff" stroke-width="3" fill="none" opacity=".9" stroke-linecap="round"/>`;
function coverSVG() {
  const BODY = "M12 158C12 98 42 50 82 38L158 38C198 50 228 98 228 158A116 23 0 0 1 12 158Z";
  const flower = (x, y, sx, s) => `<g transform="translate(${x} ${y}) scale(${sx * s} ${s})">
    <path d="M-20 6C-14 -6 -4 -2 0 4C4 -2 14 -6 20 6" fill="none"/>
    <path d="M-26 8C-22 2 -16 2 -12 6C-16 10 -22 12 -26 8Z" fill="#1d3f94" fill-opacity=".35"/>
    <path d="M26 8C22 2 16 2 12 6C16 10 22 12 26 8Z" fill="#1d3f94" fill-opacity=".35"/>
    ${[0, 72, 144, 216, 288].map((a) => `<ellipse cx="0" cy="-8" rx="5" ry="8" transform="rotate(${a})" fill="#1d3f94" fill-opacity=".28"/>`).join("")}
    <circle r="4" fill="#1d3f94" fill-opacity=".8"/><circle r="10" fill="none" stroke-dasharray="2 2.5"/></g>`;
  let mot = "";
  for (let k = -3; k <= 3; k++) { const t = k * 0.42; mot += flower(120 + 96 * Math.sin(t), 104 + Math.abs(k) * 3, Math.cos(t), 1); }
  let vine = "M14 112";
  for (let k = 0; k <= 12; k++) { const t = -1.45 + k * (2.9 / 12), x = 120 + 104 * Math.sin(t), y = 112 + (k % 2 ? -10 : 8) + Math.abs(t) * 6; vine += ` S${x - 6} ${y} ${x} ${y}`; }
  let lap = "";
  for (let k = -4; k <= 4; k++) { const t = k * 0.3; lap += `<path transform="translate(${120 + 52 * Math.sin(t)} 58) scale(${Math.cos(t)} 1)" d="M-7 0Q-7 -2 0 -2Q7 -2 7 0Q7 7 0 12Q-7 7 -7 0Z" fill="#1d3f94" fill-opacity=".22"/>`; }
  let waves = "";
  for (let k = -6; k <= 6; k++) { const t = k * 0.22; waves += `<path transform="translate(${120 + 104 * Math.sin(t)} ${147 + Math.pow(Math.abs(k) / 6, 2) * 6}) scale(${Math.cos(t)} 1)" d="M-8 0Q-4 -6 0 0T8 0"/>`; }
  return `<defs>
    <linearGradient id="cb" x1="0" x2="1"><stop offset="0" stop-color="#7d8ba0"/><stop offset=".14" stop-color="#cfd6de"/><stop offset=".34" stop-color="#ffffff"/><stop offset=".55" stop-color="#f4f6f8"/><stop offset=".82" stop-color="#c3cad3"/><stop offset="1" stop-color="#6c7a8f"/></linearGradient>
    <linearGradient id="cv" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5a6a80" stop-opacity=".25"/><stop offset=".3" stop-color="#fff" stop-opacity="0"/><stop offset=".8" stop-color="#3a4558" stop-opacity="0"/><stop offset="1" stop-color="#3a4558" stop-opacity=".35"/></linearGradient>
    <linearGradient id="cf" x1="0" x2="1"><stop offset="0" stop-color="#9aa6b6"/><stop offset=".4" stop-color="#ffffff"/><stop offset="1" stop-color="#8592a5"/></linearGradient>
    <radialGradient id="cspec" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    <clipPath id="cclip"><path d="${BODY}"/></clipPath>
    <filter id="ink" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation=".45"/></filter>
    <filter id="soft"><feGaussianBlur stdDeviation="2.5"/></filter>
  </defs>
  <path d="${BODY}" fill="url(#cb)"/>
  <g clip-path="url(#cclip)">
    <g filter="url(#ink)" stroke="#1d3f94" stroke-width="1.6" fill="none" opacity=".9">
      <path d="M0 140A120 24 0 0 0 240 140" stroke-width="2.6"/><path d="M0 136A120 23 0 0 0 240 136" stroke-width="1"/>
      <g stroke-width="1.3">${waves}</g><path d="M0 154A120 24 0 0 0 240 154" stroke-width="3"/>
      <path d="${vine}" stroke-width="1.4" opacity=".75"/><g stroke-width="1.5">${mot}</g>
      <path d="M60 66Q120 76 180 66" stroke-width="1"/><path d="M70 50Q120 58 170 50" stroke-width="2.4"/><g stroke="none">${lap}</g>
    </g>
    <path d="${BODY}" fill="url(#cv)"/>
    <ellipse cx="70" cy="100" rx="14" ry="44" fill="url(#cspec)" transform="rotate(14 70 100)" opacity=".85"/>
    <path d="M48 128C46 96 58 70 78 56" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round" opacity=".85" filter="url(#soft)"/>
    <ellipse cx="190" cy="120" rx="10" ry="30" fill="url(#cspec)" opacity=".25"/>
  </g>
  <path d="M12 158A116 23 0 0 0 228 158" fill="none" stroke="#fff" stroke-width="1.6" opacity=".7"/>
  <path d="M12 158C12 98 42 50 82 38L158 38C198 50 228 98 228 158" fill="none" stroke="#5b6a80" stroke-width="1" opacity=".6"/>
  <path d="M82 38L84 22L156 22L158 38Z" fill="url(#cf)" stroke="#6b788c" stroke-width=".8"/>
  <path d="M82 38Q120 46 158 38" fill="none" stroke="#1d3f94" stroke-width="2" opacity=".8" filter="url(#ink)"/>
  <ellipse cx="120" cy="22" rx="36" ry="7" fill="#f3f5f7" stroke="#8592a5" stroke-width=".8"/>
  <ellipse cx="120" cy="22.5" rx="30" ry="5" fill="#e3d6be"/>
  <ellipse cx="120" cy="22" rx="18" ry="2.6" fill="none" stroke="#1d3f94" stroke-width=".8" opacity=".6"/>`;
}
const BANNER_SVG = `<defs>
<linearGradient id="bgd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6c2"/><stop offset=".35" stop-color="#f5c542"/><stop offset=".65" stop-color="#a8741a"/><stop offset="1" stop-color="#ffe08a"/></linearGradient>
<linearGradient id="brd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d81f2a"/><stop offset=".55" stop-color="#8e0a12"/><stop offset="1" stop-color="#4a0206"/></linearGradient>
<linearGradient id="btl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9e0f18"/><stop offset="1" stop-color="#3d0205"/></linearGradient></defs>
<path d="M44 54L4 50L22 74L4 98L58 96Z" fill="url(#btl)" stroke="url(#bgd)" stroke-width="2.5"/>
<path d="M316 54L356 50L338 74L356 98L302 96Z" fill="url(#btl)" stroke="url(#bgd)" stroke-width="2.5"/>
<path d="M180 2C170 14 158 18 152 34L208 34C202 18 190 14 180 2Z" fill="url(#bgd)" stroke="#6b3d0a" stroke-width="1.5"/>
<path d="M152 34C140 22 126 24 118 34ZM208 34C220 22 234 24 242 34Z" fill="url(#bgd)" stroke="#6b3d0a" stroke-width="1.2"/>
<circle cx="180" cy="24" r="5" fill="#e53935" stroke="#fff3b0" stroke-width="1.5"/>
<path d="M60 34H300Q326 34 334 64Q326 94 300 94H60Q34 94 26 64Q34 34 60 34Z" fill="url(#brd)" stroke="url(#bgd)" stroke-width="5"/>
<path d="M64 42H296Q316 42 323 64Q316 86 296 86H64Q44 86 37 64Q44 42 64 42Z" fill="none" stroke="#f5c542" stroke-width="1.2" stroke-dasharray="1 4" stroke-linecap="round"/>
<path d="M26 64L8 58Q2 64 8 70Z M334 64L352 58Q358 64 352 70Z" fill="url(#bgd)" stroke="#6b3d0a" stroke-width="1"/>
<circle cx="26" cy="64" r="5" fill="#e53935" stroke="#fff3b0" stroke-width="1.5"/><circle cx="334" cy="64" r="5" fill="#e53935" stroke="#fff3b0" stroke-width="1.5"/>`;
const ORN = '<path d="M0 7H26M28 7L33 2L38 7L33 12Z" stroke="#b71c1c" stroke-width="2" fill="#b71c1c"/>';

/* ---------- styles ---------- */
const CSS = `@import url('https://fonts.googleapis.com/css2?family=Chonburi&family=Kanit:wght@400;600;800&display=swap');
.hhh{
  --bg1:#b3121b; --bg2:#4a0507; --bg3:#1e0102;
  --gold:#f5c542; --gold-hi:#fff3b0; --gold-lo:#a8741a; --bronze:#6b3d0a;
  --ink:#b71c1c; --ink-dark:#6d0f0f; --paper:#f1dcae; --text:#fff6dd;
  position:relative;isolation:isolate;height:calc(100vh - 70px);height:calc(100dvh - 70px);min-height:600px;border-radius:18px;overflow-x:hidden;overflow-y:auto;
  padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px);color-scheme:dark;background:var(--bg3);font-family:'Kanit',system-ui,-apple-system,sans-serif;color:var(--text);-webkit-tap-highlight-color:transparent;user-select:none;-webkit-user-select:none;overflow-x:hidden}
.hhh *,.hhh *::before,.hhh *::after{box-sizing:border-box}
.hhh button{font-family:inherit;touch-action:manipulation;cursor:pointer}
.hhh button:focus-visible,.hhh .cell:focus-visible,.hhh .ps:focus-visible{outline:3px solid #fff;outline-offset:2px}
.hhh img{-webkit-user-drag:none;pointer-events:none}
.hhh .bgfx{position:absolute;inset:0;z-index:0;background:radial-gradient(ellipse 130% 70% at 50% 0%,var(--bg1),var(--bg2) 55%,var(--bg3))}
.hhh .bgfx::after{content:"";position:absolute;inset:0;opacity:.08;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48'%3E%3Cpath d='M24 0L48 24L24 48L0 24Z' fill='none' stroke='%23f5c542' stroke-width='1.2'/%3E%3Cpath d='M24 13Q28 24 24 35Q20 24 24 13ZM13 24Q24 28 35 24Q24 20 13 24Z' fill='%23f5c542'/%3E%3C/svg%3E")}
.hhh .app{position:relative;z-index:1;max-width:460px;height:100%;min-height:560px;max-height:980px;margin:0 auto;padding:8px 12px 10px;display:flex;flex-direction:column;gap:8px}
.hhh .top{display:flex;align-items:center;gap:8px}
.hhh .pill{flex:1;min-width:0;display:flex;align-items:center;gap:8px;padding:5px 12px 5px 5px;border-radius:999px;background:linear-gradient(#3a0204,#1c0102);border:2px solid var(--gold);box-shadow:inset 0 2px 6px rgba(0,0,0,.6),0 2px 0 #000}
.hhh .coinic{width:30px;height:30px;flex:none;border-radius:50%;display:grid;place-items:center;font-size:15px;color:#7a4a0a;background:radial-gradient(circle at 35% 30%,var(--gold-hi),var(--gold) 45%,var(--gold-lo));border:2px solid #7a4a0a}
.hhh .pill .lb{font-size:11px;opacity:.75;line-height:1}
.hhh .pill .vl{font-weight:800;font-size:16px;color:var(--gold);line-height:1.1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.hhh .iconbtn{width:38px;height:38px;flex:none;border-radius:50%;border:2px solid var(--gold);background:linear-gradient(#7a0a10,#3d0205);color:var(--text);font-size:18px;box-shadow:0 2px 0 #000}
.hhh .refill{display:none}

.hhh /* ---- stage ---- */
.stage{position:relative;flex:1 1 0;min-height:130px;border-radius:20px;overflow:hidden;margin:6px 6px 2px;
  background:radial-gradient(ellipse 75% 62% at 50% 62%,#8e0d16,#4a0408 70%,#200103);
  box-shadow:0 0 0 3px var(--gold),0 0 0 6px var(--bronze),0 0 0 8px var(--gold),0 14px 30px rgba(0,0,0,.6),inset 0 0 60px rgba(0,0,0,.8)}
.hhh .stage::before{content:"";position:absolute;inset:0;opacity:.35;mix-blend-mode:multiply;pointer-events:none;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.2' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 .2 0 0 0 0 0 0 0 0 0 0 0 0 0 .9 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")}
.hhh .stage::after{content:"";position:absolute;left:50%;top:-20%;width:110%;height:120%;transform:translateX(-50%);pointer-events:none;
  background:radial-gradient(ellipse 38% 50% at 50% 55%,rgba(255,226,170,.16),transparent 70%)}
.hhh .bunting{position:absolute;top:0;left:0;width:100%;height:40px;pointer-events:none;z-index:2}
.hhh .stage.compact .title{display:none}
.hhh .title{position:absolute;top:26px;left:0;right:0;text-align:center;font-family:'Chonburi','Kanit',serif;font-size:25px;line-height:1.15;z-index:2;
  background:linear-gradient(#fff6c2,var(--gold) 50%,#b47b18);-webkit-background-clip:text;background-clip:text;color:transparent;
  filter:drop-shadow(0 2px 0 #4a0205) drop-shadow(0 0 10px rgba(245,197,66,.35));pointer-events:none}
.hhh .bowlwrap{position:absolute;left:50%;bottom:4px;width:300px;height:228px;margin-left:-150px;z-index:1;transform-origin:50% 100%}
.hhh .bowl{position:absolute;inset:0}
.hhh .bowl.shaking{animation:shake .14s linear infinite}
@keyframes shake{0%{transform:translate(0,0) rotate(0)}25%{transform:translate(-8px,-6px) rotate(-2deg)}50%{transform:translate(7px,1px) rotate(1.6deg)}75%{transform:translate(-5px,-7px) rotate(-1.2deg)}100%{transform:translate(0,0) rotate(0)}}
.hhh .plate{position:absolute;left:0;bottom:0;width:300px;height:108px}
.hhh .dice{position:absolute;left:50px;bottom:40px;width:200px;height:120px;perspective:640px;perspective-origin:50% 0%}
.hhh .dshadow{position:absolute;width:70px;height:26px;border-radius:50%;background:radial-gradient(ellipse at 50% 50%,rgba(40,25,10,.55),rgba(40,25,10,.25) 45%,transparent 70%)}
.hhh .die{position:absolute;width:52px;height:52px;transform-style:preserve-3d}
.hhh .core{position:absolute;inset:0;transform-style:preserve-3d}
.hhh .core i{position:absolute;inset:2px;background:#d4c19a}
.hhh .face{position:absolute;inset:0;border-radius:10px;overflow:hidden;backface-visibility:hidden;
  background:radial-gradient(circle at 50% 45%,#fffbf2,#f1e7d0 70%,#dccba6);
  box-shadow:inset 0 0 0 1px rgba(90,60,20,.18),inset 0 0 6px 1px rgba(120,85,35,.38)}
.hhh .face img{position:absolute;left:9%;top:9%;width:82%;height:82%;mix-blend-mode:multiply;filter:saturate(.9) contrast(1.05)}
.hhh .face::after{content:"";position:absolute;inset:0;border-radius:inherit;
  background:linear-gradient(140deg,rgba(255,255,255,var(--spec,0)),rgba(255,255,255,0) 60%),linear-gradient(rgba(35,18,0,var(--shade,0)),rgba(35,18,0,var(--shade,0)))}
.hhh .bshadow{position:absolute;left:44px;bottom:16px;width:212px;height:44px;border-radius:50%;z-index:4;pointer-events:none;
  background:radial-gradient(ellipse at 50% 50%,rgba(20,10,0,.5),rgba(20,10,0,.2) 55%,transparent 72%)}
.hhh .cover{position:absolute;left:30px;bottom:24px;width:240px;height:190px;z-index:5;transform-origin:85% 92%;touch-action:none}
.hhh .cover svg{width:100%;height:100%;display:block;overflow:visible}
.hhh .hint{position:absolute;left:50%;top:80px;transform:translateX(-50%);z-index:6;padding:6px 14px;border-radius:999px;font-size:14px;background:rgba(0,0,0,.62);border:1.5px solid var(--gold);color:var(--gold-hi);white-space:nowrap;opacity:0;transition:opacity .3s;pointer-events:none}
.hhh .hint.show{opacity:1;animation:bob 1.1s ease-in-out infinite}
@keyframes bob{50%{transform:translate(-50%,-6px)}}

.hhh .histbar{display:flex;align-items:center;gap:8px;min-height:30px;flex:none}
.hhh .histbar .lb{font-size:12px;opacity:.7;flex:none}
.hhh .hist{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;flex:1}
.hhh .hist::-webkit-scrollbar{display:none}
.hhh .h{flex:none;display:flex;gap:2px;padding:3px 4px;border-radius:8px;background:rgba(0,0,0,.35);border:1px solid rgba(245,197,66,.3)}
.hhh .h:first-child{border-color:var(--gold);background:rgba(245,197,66,.15)}
.hhh .h img{width:22px;height:22px;background:#fbf3df;border-radius:5px;padding:1px}
.hhh .status{flex:none;max-width:48%;font-size:12px;text-align:right;color:var(--gold-hi);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}

.hhh /* ---- paper board ---- */
.board{position:relative;flex:1.5 1 0;min-height:0;display:flex;flex-direction:column;padding:8px 10px 6px;border-radius:4px;color:var(--ink-dark);transform:rotate(-.5deg);background-color:var(--paper);
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 .45 0 0 0 0 .3 0 0 0 0 .1 0 0 0 .35 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"),radial-gradient(ellipse at 15% 20%,rgba(160,110,40,.18),transparent 40%),radial-gradient(ellipse at 85% 80%,rgba(160,110,40,.22),transparent 45%);
  box-shadow:0 12px 24px rgba(0,0,0,.55),inset 0 0 34px rgba(120,70,10,.35)}
.hhh .bhead{flex:none;display:flex;align-items:center;justify-content:center;gap:10px}
.hhh .bhead h2{margin:0;font-family:'Chonburi','Kanit',serif;font-weight:400;font-size:19px;line-height:1.3;color:var(--ink)}
.hhh .bhead .orn{width:38px;height:14px}
.hhh .gw{position:relative;flex:1 1 0;min-height:0;margin:6px 4px}
.hhh .grid{display:grid;height:100%;grid-template-columns:repeat(3,1fr);grid-template-rows:1fr 1fr;border:3px solid var(--ink);outline:1.5px solid var(--ink);outline-offset:3px}
.hhh .cell{position:relative;min-height:0;border:1.5px solid var(--ink);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:8px 4px 13px;cursor:pointer;transition:background .15s,opacity .3s}
.hhh .cell:active{background:rgba(183,28,28,.1)}
.hhh .cell img{flex:1 1 0;min-height:0;width:80%;object-fit:contain;mix-blend-mode:multiply}
.hhh .cell .nm{flex:none;font-family:'Chonburi','Kanit',serif;font-size:15px;color:var(--ink);line-height:1;margin-top:1px}
.hhh .cell.win,.hhh .ps.win{animation:winglow .55s ease-in-out infinite alternate}
@keyframes winglow{from{background-color:rgba(255,202,40,.18);box-shadow:inset 0 0 0 3px #ffb300}to{background-color:rgba(255,202,40,.5);box-shadow:inset 0 0 20px 5px #ffca28}}
.hhh .cell.lose,.hhh .ps.lose{opacity:.42}
.hhh .badge{position:absolute;left:5px;top:5px;background:#ffca28;color:var(--ink-dark);font-weight:800;border-radius:8px;padding:0 7px;font-size:14px;border:2px solid var(--ink-dark)}
.hhh .stake{position:absolute;right:5px;top:5px}
.hhh .pop{animation:pop .25s ease-out}
@keyframes pop{0%{transform:scale(.4) translateY(-20px)}70%{transform:scale(1.15)}100%{transform:scale(1)}}
.hhh .ps{position:absolute;width:32px;height:32px;margin:-16px 0 0 -16px;border-radius:50%;z-index:3;display:grid;place-items:center;cursor:pointer;
  background:var(--paper);border:2px dashed var(--ink);font-family:'Chonburi','Kanit',serif;font-size:11px;color:var(--ink);box-shadow:0 0 0 3px var(--paper)}
.hhh .ps.has{border:none;background:none;box-shadow:none}
.hhh .ps .chip.mini{width:34px;height:34px}
.hhh .bfoot{flex:none;text-align:center;font-size:11px;line-height:1.35;opacity:.88;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}

.hhh /* ---- chips ---- */
.chip{position:relative;width:46px;height:46px;border-radius:50%;border:none;display:grid;place-items:center;color:#fff;font-weight:800;font-size:13px;text-shadow:0 1px 2px rgba(0,0,0,.7);
  background:radial-gradient(circle,var(--c) 55%,transparent 56%),repeating-conic-gradient(var(--c) 0 22.5deg,#fff 22.5deg 45deg);box-shadow:0 4px 0 rgba(0,0,0,.45),inset 0 0 0 3px rgba(0,0,0,.25);transition:transform .15s}
.hhh .chip::after{content:"";position:absolute;inset:8px;border-radius:50%;border:2px dashed rgba(255,255,255,.65)}
.hhh .chip span{position:relative;z-index:1}
.hhh .chip.mini{width:36px;height:36px;font-size:10px;box-shadow:0 3px 0 rgba(0,0,0,.4),inset 0 0 0 2px rgba(0,0,0,.25)}
.hhh .chip.mini::after{inset:5px;border-width:1.5px}
.hhh .chips{flex:none;display:flex;justify-content:space-between;gap:6px;padding:8px 12px 7px;border-radius:18px;background:linear-gradient(#2a0203,#140001);border:2px solid var(--bronze);box-shadow:inset 0 2px 8px rgba(0,0,0,.7)}
.hhh .chips .chip.sel{transform:translateY(-4px);box-shadow:0 0 0 3px var(--gold),0 0 16px 3px rgba(245,197,66,.8),0 6px 0 rgba(0,0,0,.45)}
.hhh .actions{flex:none;display:grid;grid-template-columns:1fr 1fr auto 1fr 1fr;align-items:center;gap:8px}
.hhh .abtn{height:46px;border-radius:14px;border:2px solid var(--gold);background:linear-gradient(#8a0c13,#3d0205);color:var(--text);font-size:12px;font-weight:600;line-height:1.1;box-shadow:0 3px 0 #000;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;padding:0}
.hhh .abtn b{font-size:17px;line-height:1}
.hhh .abtn:active{transform:translateY(2px);box-shadow:0 1px 0 #000}
.hhh .abtn:disabled{opacity:.45}
.hhh .roll{width:74px;height:74px;border-radius:50%;border:4px solid var(--gold-hi);font-weight:800;font-size:17px;color:#5a0306;background:radial-gradient(circle at 35% 30%,#fff6c2,var(--gold) 42%,#b47b18 85%);box-shadow:0 0 0 4px var(--bronze),0 6px 0 #2a1500,0 0 26px rgba(245,197,66,.55);animation:pulse 1.6s ease-in-out infinite}
.hhh .roll:active{transform:translateY(3px)}
.hhh .roll:disabled{filter:grayscale(.6) brightness(.65);animation:none}
@keyframes pulse{50%{box-shadow:0 0 0 4px var(--bronze),0 6px 0 #2a1500,0 0 40px rgba(255,214,90,.9)}}
.hhh .toast{position:fixed;left:50%;bottom:calc(150px + env(safe-area-inset-bottom,0px));transform:translate(-50%,20px);opacity:0;z-index:30;padding:9px 18px;border-radius:999px;background:rgba(20,0,0,.9);border:1.5px solid var(--gold);color:var(--gold-hi);font-size:14px;transition:all .25s;pointer-events:none;white-space:nowrap}
.hhh .toast.show{opacity:1;transform:translate(-50%,0)}
.hhh .winpop{position:fixed;inset:0;z-index:40;display:none;align-items:center;justify-content:center;overflow:hidden;
  background:radial-gradient(circle at 50% 48%,rgba(120,20,0,.7),rgba(12,0,0,.94) 72%)}
.hhh .winpop.show{display:flex}
.hhh .wflash{position:absolute;inset:0;background:#fff4c4;opacity:0;pointer-events:none}
.hhh .winpop.show .wflash{animation:flash .7s ease-out}
@keyframes flash{0%{opacity:.85}100%{opacity:0}}
.hhh .rays{position:absolute;left:50%;top:48%;width:1000px;height:1000px;margin:-500px 0 0 -500px;border-radius:50%;pointer-events:none;
  background:repeating-conic-gradient(rgba(255,214,90,.34) 0 7deg,transparent 7deg 18deg);
  -webkit-mask:radial-gradient(circle,#000 8%,transparent 60%);mask:radial-gradient(circle,#000 8%,transparent 60%);animation:spin 12s linear infinite}
.hhh .rays.r2{background:repeating-conic-gradient(rgba(255,130,40,.22) 0 3deg,transparent 3deg 11deg);animation-duration:20s;animation-direction:reverse}
@keyframes spin{to{transform:rotate(360deg)}}
.hhh .wglow{position:absolute;left:50%;top:48%;width:460px;height:460px;margin:-230px 0 0 -230px;border-radius:50%;pointer-events:none;
  background:radial-gradient(circle,rgba(255,226,130,.75),rgba(255,160,40,.25) 40%,transparent 68%);animation:breathe 1.1s ease-in-out infinite alternate}
@keyframes breathe{to{transform:scale(1.14);opacity:.8}}
.hhh #fx{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
.hhh .wcard{position:relative;display:flex;flex-direction:column;align-items:center;gap:6px;margin-top:-4vh}
.hhh .winpop.show .wcard{animation:cardIn .8s cubic-bezier(.2,1.5,.4,1) both}
@keyframes cardIn{0%{transform:scale(.1) rotate(-8deg);opacity:0}60%{opacity:1}100%{transform:scale(1) rotate(0)}}
.hhh .winpop.mega.show .wcard{animation:cardIn .8s cubic-bezier(.2,1.5,.4,1) both,quake .5s linear .75s 2}
@keyframes quake{25%{transform:translate(-5px,3px)}50%{transform:translate(4px,-4px)}75%{transform:translate(-3px,-2px)}}
.hhh .wbanner{position:relative;width:min(88vw,360px);aspect-ratio:360/120}
.hhh .wbanner svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible;filter:drop-shadow(0 8px 10px rgba(0,0,0,.6))}
.hhh .wtitle{position:absolute;left:0;right:0;top:34%;height:52%;display:grid;place-items:center;font-family:'Chonburi','Kanit',serif;font-size:clamp(26px,8.4vw,38px);line-height:1;
  background:linear-gradient(#fffbe0,#ffe066 45%,#e8a21a 60%,#fff0a8 85%);-webkit-background-clip:text;background-clip:text;color:transparent;
  filter:drop-shadow(0 2px 0 #4a0000) drop-shadow(0 0 6px rgba(255,210,80,.6))}
.hhh .wnum{position:relative;font-family:'Kanit',sans-serif;font-weight:800;font-size:clamp(50px,16vw,92px);line-height:1.05;letter-spacing:1px;white-space:nowrap;
  background:linear-gradient(105deg,transparent 38%,rgba(255,255,255,.95) 50%,transparent 62%),linear-gradient(#fffdf0 0%,#ffe36a 38%,#f0a816 52%,#ffd75a 70%,#fff3b8 86%,#c27810 100%);
  background-size:300% 100%,100% 100%;background-repeat:no-repeat;-webkit-background-clip:text;background-clip:text;color:transparent;
  filter:drop-shadow(0 3px 0 #7a3300) drop-shadow(0 0 1.5px #3a1500) drop-shadow(0 6px 10px rgba(0,0,0,.6)) drop-shadow(0 0 28px rgba(255,190,40,.75));
  animation:shine 1.6s linear infinite}
@keyframes shine{from{background-position:150% 0,0 0}to{background-position:-60% 0,0 0}}
.hhh .wnum.thump{animation:shine 1.6s linear infinite,thump .55s cubic-bezier(.2,1.9,.4,1)}
@keyframes thump{0%{transform:scale(1.35)}100%{transform:scale(1)}}
.hhh .wsub{font-size:15px;font-weight:600;color:#ffe9a8;background:rgba(40,0,0,.6);border:1.5px solid rgba(245,197,66,.75);padding:4px 16px;border-radius:999px;opacity:0;transform:translateY(8px);transition:all .4s}
.hhh .wsub.on{opacity:1;transform:none}
.hhh .wtap{position:absolute;left:0;right:0;bottom:calc(28px + env(safe-area-inset-bottom,0px));text-align:center;font-size:13px;color:#ffe9a8;opacity:.6}

.hhh /* ---- temple-fair string lights ---- */
.lights{position:absolute;inset:0;pointer-events:none;z-index:3}
.hhh .wire{position:absolute;width:1.5px;background:linear-gradient(#5a4a2a,#2a1f10)}
.hhh .bulb{position:absolute;width:8px;height:10px;margin:-1px 0 0 -4px;border-radius:50% 50% 46% 46%;background:radial-gradient(circle at 40% 35%,#fff,var(--c) 55%);opacity:.3}
.hhh .bulb::before{content:"";position:absolute;left:2px;top:-3px;width:4px;height:4px;border-radius:1px;background:#3a3a3a}
.hhh .bulb::after{content:"";position:absolute;left:50%;top:50%;width:30px;height:30px;margin:-15px 0 0 -15px;border-radius:50%;background:radial-gradient(circle,var(--c),transparent 68%);opacity:.75}
.hhh .lights.chase .bulb{animation:bl3 1.05s infinite;animation-delay:calc(var(--i3) * -.35s)}
@keyframes bl3{0%,32%{opacity:1}33%,100%{opacity:.25}}
.hhh .lights.alt .bulb{animation:bl2 .9s infinite;animation-delay:calc(var(--i2) * -.45s)}
@keyframes bl2{0%,49%{opacity:1}50%,100%{opacity:.25}}
.hhh .lights.twinkle .bulb{animation:tw var(--td) ease-in-out infinite;animation-delay:var(--tdl)}
@keyframes tw{0%,100%{opacity:.3}50%{opacity:1}}
.hhh .lights.party .bulb{animation:bl2 .24s infinite;animation-delay:calc(var(--i2) * -.12s)}
.hhh .stage .flick{position:absolute;left:0;right:0;top:0;height:90px;pointer-events:none;z-index:1;background:radial-gradient(ellipse 70% 100% at 50% 0%,rgba(255,200,110,.18),transparent 70%);animation:flk 2.4s ease-in-out infinite}
@keyframes flk{0%,100%{opacity:.6}40%{opacity:1}55%{opacity:.75}}
@media (max-height:700px){
  .hhh .app{gap:6px;padding:6px 10px 8px;min-height:520px}
  .hhh .pill{padding:3px 10px 3px 3px}.hhh .coinic{width:26px;height:26px;font-size:13px}.hhh .pill .vl{font-size:15px}.hhh .iconbtn{width:34px;height:34px;font-size:16px}
  .hhh .histbar{min-height:26px}.hhh .h img{width:19px;height:19px}
  .hhh .chips{padding:5px 10px}.hhh .chip{width:40px;height:40px;font-size:12px}.hhh .chip::after{inset:6px}
  .hhh .abtn{height:40px;font-size:11px}.hhh .abtn b{font-size:15px}.hhh .roll{width:62px;height:62px;font-size:15px}
  .hhh .ps{width:26px;height:26px;margin:-13px 0 0 -13px;font-size:9px}.hhh .ps .chip.mini{width:28px;height:28px;font-size:9px}
  .hhh .chip.mini{width:30px;height:30px;font-size:9px}.hhh .cell .nm{font-size:13px}.hhh .cell{padding:6px 3px 11px}
  .hhh .bhead h2{font-size:16px}.hhh .bhead .orn{width:28px}.hhh .gw{margin:5px 3px}
}
@media (prefers-reduced-motion: reduce){.hhh .roll,.hhh .rays,.hhh .hint.show,.hhh .wglow,.hhh .stage .flick{animation:none}.hhh .lights .bulb{animation:none!important;opacity:1}}
`;

/* ---------- pieces ---------- */
const Sym = ({ i }) => <img src={ART[i]} alt="" />;

function Die({ d }) {
  return (
    <div className="die" style={{ left: d.x, top: d.y, transform: d.T }}>
      <div className="core">
        {FACE_R.map((r, f) => <i key={f} style={{ transform: `${r} translateZ(${HZ - 2}px)` }} />)}
      </div>
      {FACE_R.map((r, f) => (
        <div key={f} className="face"
          style={{ transform: `${r} translateZ(${HZ}px)`, "--shade": d.faces[f].shade.toFixed(3), "--spec": d.faces[f].spec.toFixed(3) }}>
          <Sym i={f} />
        </div>
      ))}
    </div>
  );
}

function Lights({ W, H, mode }) {
  const bulbs = useMemo(() => {
    const out = []; let i = 0;
    const add = (x, y) => { out.push({ x, y, i, td: (0.7 + Math.random() * 1.2).toFixed(2) + "s", tdl: (-Math.random() * 2).toFixed(2) + "s" }); i++; };
    if (!W || !H) return out;
    for (let k = 0; k < 16; k++) {
      const xv = k * 25 + 3 + 21.5, yv = 3 + 19 * (1 - Math.pow((xv - 200) / 200, 2)) * 0.85;
      if (xv < 398) add((xv / 400) * W, yv + 1.5);
    }
    const top = 26, bot = H - 26, n = Math.max(3, Math.floor((bot - top) / 30));
    for (let k = 0; k <= n; k++) { const y = top + ((bot - top) * k) / n; add(10, y); add(W - 10, y); }
    return out;
  }, [W, H]);
  return (
    <div className={"lights " + mode}>
      <div className="wire" style={{ left: 9, top: 4, height: Math.max(0, H - 26) }} />
      <div className="wire" style={{ right: 9, top: 4, height: Math.max(0, H - 26) }} />
      {bulbs.map((b) => (
        <i key={b.i} className="bulb"
          style={{ left: b.x, top: b.y, "--c": BULB_C[b.i % 6], "--i3": b.i % 3, "--i2": b.i % 2, "--td": b.td, "--tdl": b.tdl }} />
      ))}
    </div>
  );
}

function MiniChip({ v, pop }) {
  return <div key={pop} className={"chip mini" + (pop ? " pop" : "")} style={{ "--c": chipColor(v) }}><span>{short(v)}</span></div>;
}

/* ---------- big centered win celebration ---------- */
function WinPopup({ data, onClose }) {
  const cvs = useRef(null);
  const ctl = useRef({ done: false, finish: () => {} });
  const [num, setNum] = useState(0);
  const [done, setDone] = useState(false);
  const ratio = data.w / Math.max(1, data.staked);
  const tier = ratio >= 10 ? 3 : ratio >= 4 ? 2 : 1;
  const title = ["", "ชนะ!", "ชนะใหญ่!", "ชนะมหาศาล!"][tier];

  useEffect(() => {
    const dur = [0, 1400, 2400, 3600][tier];
    const c = cvs.current, ctx = c.getContext("2d"), dpr = window.devicePixelRatio || 1;
    const W = window.innerWidth, H = window.innerHeight;
    c.width = W * dpr; c.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    let parts = [], run = true, raf1 = 0, raf2 = 0;
    const timers = [];
    const cx = W / 2, cy = H * 0.46;
    const coins = (n, power) => {
      for (let i = 0; i < n; i++) {
        const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2, v = (7 + Math.random() * 9) * power;
        parts.push({ k: "c", x: cx + (Math.random() - 0.5) * 40, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: 9 + Math.random() * 9, rot: Math.random() * 6, vr: 0.12 + Math.random() * 0.25, life: 0 });
      }
    };
    const sparks = (n) => {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, d = 40 + Math.random() * Math.min(W, 520) * 0.45;
        parts.push({ k: "s", x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d * 0.7, r: 4 + Math.random() * 9, life: 0, max: 30 + Math.random() * 40 });
      }
    };
    const drawCoin = (p) => {
      const w = Math.abs(Math.cos(p.rot)) * p.r + 1.2, lit = Math.cos(p.rot) > 0;
      ctx.save(); ctx.translate(p.x, p.y);
      const g = ctx.createLinearGradient(-w, -p.r, w, p.r);
      g.addColorStop(0, lit ? "#fff6c2" : "#c98a1a"); g.addColorStop(0.5, "#f5c542"); g.addColorStop(1, lit ? "#9a6410" : "#ffe08a");
      ctx.fillStyle = "#7a4a0a"; ctx.beginPath(); ctx.ellipse(1.2, 0, w, p.r, 0, 0, 7); ctx.fill();
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, w, p.r, 0, 0, 7); ctx.fill();
      if (w > p.r * 0.4) {
        ctx.strokeStyle = "rgba(122,74,10,.7)"; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(0, 0, w * 0.7, p.r * 0.7, 0, 0, 7); ctx.stroke();
        ctx.fillStyle = "rgba(122,74,10,.75)"; ctx.font = `bold ${p.r}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.save(); ctx.scale(w / p.r, 1); ctx.fillText("★", 0, 1); ctx.restore();
      }
      ctx.restore();
    };
    const drawSpark = (p) => {
      const t = Math.min(1, p.life / p.max), a = Math.max(0, Math.sin(t * Math.PI)), r = p.r * a;
      if (r <= 0.05) return;
      ctx.save(); ctx.translate(p.x, p.y); ctx.globalAlpha = a; ctx.fillStyle = "#fff8d8"; ctx.beginPath();
      ctx.moveTo(0, -r * 2); ctx.lineTo(r * 0.3, -r * 0.3); ctx.lineTo(r * 2, 0); ctx.lineTo(r * 0.3, r * 0.3);
      ctx.lineTo(0, r * 2); ctx.lineTo(-r * 0.3, r * 0.3); ctx.lineTo(-r * 2, 0); ctx.lineTo(-r * 0.3, -r * 0.3); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = a * 0.6; ctx.fillStyle = "#ffd24a"; ctx.beginPath(); ctx.arc(0, 0, r * 0.9, 0, 7); ctx.fill(); ctx.restore();
    };
    const loop = () => {
      if (!run) return;
      ctx.clearRect(0, 0, W, H);
      parts = parts.filter((p) => {
        p.life++;
        if (p.k === "c") { p.vy += 0.42; p.vx *= 0.995; p.x += p.vx; p.y += p.vy; p.rot += p.vr; drawCoin(p); return p.y < H + 40; }
        drawSpark(p); return p.life < p.max;
      });
      raf1 = requestAnimationFrame(loop);
    };
    sfx.win(); coins(18 + tier * 14, 1 + tier * 0.12); sparks(10 * tier); loop();
    const iv = setInterval(() => { coins(4 + tier * 3, 0.9 + tier * 0.1); sparks(2 + tier); }, 260);
    timers.push(iv);
    const t0 = performance.now(); let lastTick = 0;
    const finish = () => {
      if (ctl.current.done) return;
      ctl.current.done = true; setNum(data.w); setDone(true);
      tone(523, 0.5, "triangle", 0.12); tone(784, 0.5, "triangle", 0.12, 0.05); tone(1047, 0.7, "triangle", 0.12, 0.1);
      coins(30 + tier * 10, 1.25); sparks(16); clearInterval(iv);
      timers.push(setTimeout(onClose, 1800 + tier * 500));
    };
    ctl.current.finish = finish;
    const step = (t) => {
      if (ctl.current.done) return;
      const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      setNum(Math.round(data.w * e));
      if (t - lastTick > 70) { lastTick = t; tone(1200 + e * 900, 0.05, "square", 0.03); }
      if (k < 1) raf2 = requestAnimationFrame(step); else finish();
    };
    raf2 = requestAnimationFrame(step);
    return () => { run = false; cancelAnimationFrame(raf1); cancelAnimationFrame(raf2); timers.forEach((x) => { clearInterval(x); clearTimeout(x); }); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={"winpop show" + (tier === 3 ? " mega" : "")} role="dialog" aria-live="assertive"
      onClick={() => (ctl.current.done ? onClose() : ctl.current.finish())}>
      <div className="rays r2" /><div className="rays" /><div className="wglow" />
      <canvas id="fx" ref={cvs} /><div className="wflash" />
      <div className="wcard">
        <div className="wbanner">
          <svg viewBox="0 0 360 120" aria-hidden="true" dangerouslySetInnerHTML={{ __html: BANNER_SVG }} />
          <div className="wtitle">{title}</div>
        </div>
        <div key={done ? "d" : "n"} className={"wnum" + (done ? " thump" : "")}>+{fmt(num)}</div>
        <div className={"wsub" + (done ? " on" : "")}>เดิมพัน {fmt(data.staked)} · ได้คืน ×{+ratio.toFixed(1)}</div>
      </div>
      <div className="wtap">แตะเพื่อเล่นต่อ</div>
    </div>
  );
}

/* =========================================================
   Main game
   ========================================================= */
const OPEN_T = "translate(-40px,-250px) rotate(14deg) scale(1.08)";
const PEEK_T = "translate(-2px,-14px) rotate(7deg)";

export default function NamTaoPuPla({ balance = 0, winRate = 96, server, onBalanceDelta, onRound, muted: mutedProp = false } = {}) {
  const [pending, setPending] = useState(0); // stake sent to the server, not yet reflected in balance
  const [bets, setBets] = useState({});
  const [lastBets, setLastBets] = useState(null);
  const [chipIdx, setChipIdx] = useState(1);
  const [phase, setPhase] = useState("bet"); // bet | rolling | await | reveal
  const [manual, setManual] = useState(false);
  const [muted, setMuted] = useState(!!mutedProp);
  const [hist, setHist] = useState([]);
  const [dice, setDice] = useState(() => makeDice([rnd6(), rnd6(), rnd6()]));
  const [marks, setMarks] = useState({}); // id -> {s:'win'|'lose', n}
  const [status, setStatus] = useState('วางชิปแล้วกด "เขย่า"');
  const [toastMsg, setToastMsg] = useState(null);
  const [cover, setCover] = useState({ t: "none", dur: 0, ease: "ease", op: 1, sh: 1 });
  const [shaking, setShaking] = useState(false);
  const [hint, setHint] = useState(false);
  const [lightMode, setLightMode] = useState("chase");
  const [win, setWin] = useState(null);
  const [pop, setPop] = useState({ id: null, k: 0 });
  const [size, setSize] = useState({ W: 0, H: 0 });

  const stageRef = useRef(null);
  const coverOpen = useRef(false);
  const round = useRef(null);
  const drag = useRef(null);
  const markTimer = useRef(null);

  const total = sumBets(bets);
  // chips on the board are "spent" from the wallet display until the roll is committed
  const bal = Math.max(0, Math.round((balance - (phase === "bet" ? total : pending)) * 100) / 100);
  useEffect(() => { audio.muted = muted; }, [muted]);

  // fit the bowl to the stage
  useEffect(() => {
    const el = stageRef.current; if (!el) return;
    const upd = () => setSize({ W: el.clientWidth, H: el.clientHeight });
    upd();
    let ro;
    try { ro = new ResizeObserver(upd); ro.observe(el); } catch (e) { window.addEventListener("resize", upd); }
    return () => { ro ? ro.disconnect() : window.removeEventListener("resize", upd); };
  }, []);
  const compact = size.H > 0 && size.H < 250;
  const scale = size.W ? Math.max(0.45, Math.min((size.W - 20) / 300, (size.H - (compact ? 34 : 70)) / 232, 1.3)) : 1;

  // cycle light patterns
  useEffect(() => {
    const modes = ["chase", "alt", "twinkle"]; let k = 0;
    const iv = setInterval(() => setLightMode((m) => (m === "party" ? m : modes[(k = (k + 1) % 3)])), 5000);
    return () => clearInterval(iv);
  }, []);

  // toast auto-hide
  useEffect(() => {
    if (!toastMsg) return;
    const t = setTimeout(() => setToastMsg(null), 1800);
    return () => clearTimeout(t);
  }, [toastMsg]);
  const toast = (m) => setToastMsg({ m, k: Date.now() });

  const coverTo = (t, dur, ease, op) =>
    setCover({ t, dur, ease, op, sh: t === "none" ? 1 : t === PEEK_T ? 0.6 : 0 });

  /* ---- betting ---- */
  const place = (s) => {
    if (phase !== "bet") return;
    setMarks({});
    const v = CHIPS[chipIdx].v;
    if (bal < v) { toast("เครดิตไม่พอสำหรับชิปนี้"); return; }
    setBets((bs) => ({ ...bs, [s.id]: (bs[s.id] || 0) + v }));
    setPop({ id: s.id, k: Date.now() });
    sfx.chip();
    if (s.pair && !bets[s.id]) toast(`วางคู่ ${NAMES[s.a]}–${NAMES[s.b]} ออกครบทั้งคู่ได้ ${PAIR_PAY} เท่า`);
  };
  const clearBets = () => {
    if (phase !== "bet" || !total) return;
    setBets({}); setMarks({});
  };
  const doubleBets = () => {
    if (phase !== "bet") return;
    if (!total) { toast("ยังไม่มีเดิมพันให้เพิ่มเท่า"); return; }
    if (bal < total) { toast("เครดิตไม่พอเพิ่มเท่า"); return; }
    setBets((bs) => Object.fromEntries(Object.entries(bs).map(([k, v]) => [k, v * 2])));
    sfx.chip();
  };
  const repeatBets = () => {
    if (phase !== "bet") return;
    if (!lastBets) { toast("ยังไม่มีรอบก่อนหน้า"); return; }
    const t = sumBets(lastBets);
    if (bal + total < t) { toast("เครดิตไม่พอวางซ้ำ"); return; }
    setBets({ ...lastBets }); setMarks({}); sfx.chip();
  };

  /* ---- result ---- */
  const settle = ({ res, bets: rb, staked }) => {
    const cnt = [0, 0, 0, 0, 0, 0]; res.forEach((r) => cnt[r]++);
    let won = 0; const mk = {};
    SPOTS.forEach((s) => {
      const v = rb[s.id] || 0;
      if (s.pair) {
        const hit = cnt[s.a] > 0 && cnt[s.b] > 0;
        if (hit && v) { mk[s.id] = { s: "win" }; won += v * (1 + PAIR_PAY); } else if (v) mk[s.id] = { s: "lose" };
      } else if (cnt[s.a]) { mk[s.id] = { s: "win", n: cnt[s.a] }; if (v) won += v * (1 + cnt[s.a]); }
      else if (v) mk[s.id] = { s: "lose" };
    });
    setMarks(mk);
    setHist((h) => [res, ...h].slice(0, 15));
    setStatus("ออก: " + res.map((r) => NAMES[r]).join(" · "));
    if (!server && won > 0 && onBalanceDelta) onBalanceDelta(won);
    if (onRound) onRound(staked, won);
    if (won > 0) { setLightMode("party"); setWin({ w: won, staked, key: Date.now() }); }
    else { sfx.lose(); toast("ไม่ถูกรอบนี้ ลองใหม่!"); }
    setTimeout(() => {
      setBets({}); setPhase("bet");
      clearTimeout(markTimer.current);
      markTimer.current = setTimeout(() => setMarks({}), 2500);
    }, 900);
  };

  const autoOpen = async () => {
    setPhase("reveal"); setHint(false); setStatus("ลุ้น...");
    sfx.scrape(); coverTo(PEEK_T, 750, "ease-out", 1); await sleep(1200);
    coverTo(OPEN_T, 1150, "cubic-bezier(.55,0,.6,1)", 0); sfx.open(); await sleep(1000);
    coverOpen.current = true; settle(round.current);
  };

  const roll = async () => {
    if (phase === "await") { autoOpen(); return; }
    if (phase !== "bet") return;
    if (!total) { toast("วางชิปบนกระดานก่อน"); return; }
    const myBets = { ...bets };
    const staked = sumBets(myBets);
    if (server) setPending(staked); else if (onBalanceDelta) onBalanceDelta(-staked);
    setLastBets(myBets); setPhase("rolling"); setMarks({}); clearTimeout(markTimer.current); setStatus("กำลังเขย่า...");
    if (coverOpen.current) {
      coverTo("none", 520, "cubic-bezier(.25,1.2,.5,1)", 1); await sleep(500);
      sfx.thud(); coverOpen.current = false; await sleep(160);
    }
    const getRes = server
      ? server.call("/api/games/namtao/roll", { bets: myBets }).then((r) => r.res)
      : Promise.resolve(ntPick(Math.random, myBets, winRate));
    setShaking(true); sfx.rattle(1500);
    let res;
    try { [res] = await Promise.all([getRes, sleep(1500)]); }
    catch (e) {
      setShaking(false); setPending(0); setPhase("bet"); setStatus('วางชิปแล้วกด "เขย่า"');
      toast(e && e.message === "insufficient_balance" ? "เครดิตไม่พอ" : "เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ ลองใหม่");
      return;
    }
    setPending(0);
    setShaking(false); sfx.thud();
    setDice(makeDice(res));
    round.current = { res, bets: myBets, staked: sumBets(myBets) };
    await sleep(380);
    if (manual) { setPhase("await"); setHint(true); setStatus("ค่อยๆ ปัดถ้วยขึ้น... ลุ้นเลย!"); }
    else autoOpen();
  };

  /* ---- swipe the bowl open (manual mode) ---- */
  const onDown = (e) => {
    if (phase !== "await") return;
    drag.current = { y: e.clientY, dy: 0 };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {}
    setHint(false);
  };
  const onMove = (e) => {
    if (!drag.current) return;
    const dy = Math.min(0, e.clientY - drag.current.y); drag.current.dy = dy;
    const k = Math.min(1, -dy / 160);
    setCover({ t: `translate(${-k * 14}px,${dy}px) rotate(${k * 12}deg)`, dur: 0, ease: "ease", op: 1, sh: 1 - k });
  };
  const onUp = async () => {
    if (!drag.current) return;
    const dy = drag.current.dy; drag.current = null;
    if (dy < -70) {
      setPhase("reveal"); coverTo(OPEN_T, 620, "ease-out", 0); sfx.open();
      await sleep(560); coverOpen.current = true; settle(round.current);
    } else { coverTo("none", 350, "cubic-bezier(.3,1.5,.5,1)", 1); setHint(true); }
  };

  const busy = phase === "rolling" || phase === "reveal";
  const coverStyle = {
    transform: cover.t, opacity: cover.op,
    transition: cover.dur ? `transform ${cover.dur}ms ${cover.ease},opacity ${Math.round(cover.dur * 0.8)}ms ease-in ${Math.round(cover.dur * 0.2)}ms` : "none",
  };
  const bshStyle = { opacity: cover.sh, transition: cover.dur ? `opacity ${cover.dur}ms` : "none" };
  const cls = (id) => (marks[id] ? " " + marks[id].s : "");

  return (
    <div className="hhh">
      <style>{CSS}</style>
      <div className="bgfx" />
      <main className="app">
        <div className="top">
          <div className="pill"><div className="coinic">★</div><div style={{ minWidth: 0 }}><div className="lb">เครดิต</div><div className="vl">{fmt(bal)}</div></div></div>
          <div className="pill"><div className="coinic" style={{ fontSize: 13 }}>◎</div><div style={{ minWidth: 0 }}><div className="lb">เดิมพัน</div><div className="vl">{fmt(total)}</div></div></div>
          <button className="iconbtn" aria-label="เปิดปิดเสียง" onClick={() => setMuted((m) => !m)}>{muted ? "🔇" : "🔊"}</button>
        </div>

        <section ref={stageRef} className={"stage" + (compact ? " compact" : "")} aria-label="ถ้วยลูกเต๋า">
          <div className="flick" />
          <svg className="bunting" viewBox="0 0 400 40" preserveAspectRatio="none" dangerouslySetInnerHTML={{ __html: buntingSVG() }} />
          <Lights W={size.W} H={size.H} mode={lightMode} />
          <div className="title">น้ำเต้า ปู ปลา</div>
          <div className="bowlwrap" style={{ transform: `scale(${scale.toFixed(3)})` }}>
            <div className={"bowl" + (shaking ? " shaking" : "")}>
              <svg className="plate" viewBox="0 0 300 108" dangerouslySetInnerHTML={{ __html: PLATE_SVG }} />
              <div className="dice">
                {dice.map((d, i) => <div key={"s" + i} className="dshadow" style={{ left: d.x - 6, top: d.y + 34 }} />)}
                {dice.map((d, i) => <Die key={i} d={d} />)}
              </div>
              <div className="bshadow" style={bshStyle} />
              <div className="cover" style={coverStyle} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
                <svg viewBox="0 0 240 190" dangerouslySetInnerHTML={{ __html: coverSVG() }} />
              </div>
              <div className={"hint" + (hint ? " show" : "")}>☝ ปัดถ้วยขึ้นเพื่อเปิด</div>
            </div>
          </div>
        </section>

        <div className="histbar">
          <span className="lb">ผลล่าสุด</span>
          <div className="hist">
            {hist.length ? hist.map((r, i) => <div className="h" key={hist.length - i}>{r.map((s, j) => <Sym key={j} i={s} />)}</div>)
              : <span style={{ fontSize: 12, opacity: 0.5 }}>ยังไม่มี</span>}
          </div>
          <div className="status">{status}</div>
        </div>

        <section className="board" aria-label="กระดานเดิมพัน">
          <div className="bhead">
            <svg className="orn" viewBox="0 0 38 14" dangerouslySetInnerHTML={{ __html: ORN }} />
            <h2>น้ำเต้า ปู ปลา</h2>
            <svg className="orn" viewBox="0 0 38 14" style={{ transform: "scaleX(-1)" }} dangerouslySetInnerHTML={{ __html: ORN }} />
          </div>
          <div className="gw">
            <div className="grid">
              {SPOTS.filter((s) => !s.pair).map((s) => (
                <div key={s.id} className={"cell" + cls(s.id)} tabIndex={0} role="button" aria-label={"แทง " + NAMES[s.a]}
                  onClick={() => place(s)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); place(s); } }}>
                  <Sym i={s.a} />
                  <div className="nm">{NAMES[s.a]}</div>
                  <div className="stake">{bets[s.id] ? <MiniChip v={bets[s.id]} pop={pop.id === s.id ? pop.k : 0} /> : null}</div>
                  {marks[s.id] && marks[s.id].n ? <div className="badge">×{marks[s.id].n}</div> : null}
                </div>
              ))}
            </div>
            {SPOTS.filter((s) => s.pair).map((s) => (
              <div key={s.id} className={"ps" + (bets[s.id] ? " has" : "") + cls(s.id)} style={{ left: s.left, top: s.top }}
                tabIndex={0} role="button" aria-label={"วางคู่ " + NAMES[s.a] + " " + NAMES[s.b]}
                onClick={(e) => { e.stopPropagation(); place(s); }}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); place(s); } }}>
                {bets[s.id] ? <MiniChip v={bets[s.id]} pop={pop.id === s.id ? pop.k : 0} /> : "คู่"}
              </div>
            ))}
          </div>
          <div className="bfoot">เดี่ยว: ออกกี่ลูกได้เท่านั้นเท่า · วางคู่: ออกครบ 2 ตัวได้ {PAIR_PAY} เท่า</div>
        </section>

        <div className="chips" role="radiogroup" aria-label="เลือกชิป">
          {CHIPS.map((ch, i) => (
            <button key={ch.v} className={"chip" + (i === chipIdx ? " sel" : "")} style={{ "--c": ch.c }}
              role="radio" aria-checked={i === chipIdx} aria-label={"ชิป " + ch.v}
              onClick={() => { setChipIdx(i); sfx.chip(); }}><span>{short(ch.v)}</span></button>
          ))}
        </div>

        <div className="actions">
          <button className="abtn" disabled={busy || phase === "await"} onClick={clearBets}><b>✕</b>ล้าง</button>
          <button className="abtn" disabled={busy || phase === "await"} onClick={doubleBets}><b>×2</b>เพิ่มเท่า</button>
          <button className="roll" disabled={busy} onClick={roll}>{phase === "await" ? "เปิด" : "เขย่า"}</button>
          <button className="abtn" disabled={busy || phase === "await"} onClick={repeatBets}><b>↺</b>ซ้ำ</button>
          <button className="abtn" disabled={busy || phase === "await"}
            onClick={() => { setManual((m) => !m); toast(!manual ? "โหมดเปิดเอง: ปัดถ้วยขึ้นเพื่อเปิด" : "โหมดเปิดถ้วยอัตโนมัติ"); }}>
            <b>{manual ? "🖐" : "🤖"}</b>{manual ? "เปิดเอง" : "เปิดออโต้"}
          </button>
        </div>
      </main>

      <div key={toastMsg ? toastMsg.k : 0} className={"toast" + (toastMsg ? " show" : "")}>{toastMsg ? toastMsg.m : ""}</div>
      {win && <WinPopup key={win.key} data={win} onClose={() => { setWin(null); setLightMode("chase"); }} />}
    </div>
  );
}
