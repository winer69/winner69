/**
 * Inferno 7s — classic 3-reel slot with a bonus multiplier reel.
 * Drop-in React component (no dependencies besides React).
 *
 * Usage:
 *   import Inferno7s from "./Inferno7s";
 *   <Inferno7s />                 // fills the viewport (100dvh)
 *   <Inferno7s height="720px" />  // or give it a fixed height
 *
 * Play money only. Sounds are synthesized with Web Audio and start on the first tap.
 */
// Imported into WINNER 69: credits come from the shared wallet and every spin is decided by
// backend/src/extraGames.js (on the server, or locally when there is no server). `host` is
// created by makeExtraHost() in src/extraHost.js.
import { useEffect, useRef } from "react";

const CSS = `@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700;900&family=Oswald:wght@500;600;700&family=Kanit:wght@400;500;600&display=swap');

.i7root{
  --bg:#0a0605;--ink:#f3e6cf;--amber:#ffb63a;--led:#ff9e1f;
  --metal:linear-gradient(180deg,#fffbe8 0%,#f7dc8a 20%,#c99a3a 42%,#6e4a10 50%,#b98a2c 58%,#f3d27a 78%,#fff3c8 92%,#a77a22 100%);
  --chrome:linear-gradient(180deg,#ffffff 0%,#dfe4ea 25%,#8d97a5 48%,#3a414c 52%,#9aa4b2 70%,#eef1f5 90%,#b5bcc6 100%);
  box-sizing:border-box;
  padding-top:env(safe-area-inset-top,0px);
  padding-bottom:env(safe-area-inset-bottom,0px);
}
.i7root{position:relative;width:100%;background:var(--bg);color:var(--ink);font-family:Kanit,system-ui,sans-serif;overflow:hidden;
  -webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
.i7root *,.i7root *::before,.i7root *::after{box-sizing:border-box}
.i7root button{font-family:inherit}
.i7root button:focus-visible{outline:2px solid #ffd27a;outline-offset:3px}

.i7root #app{height:100%;width:100%;container-type:size;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;
  background:radial-gradient(ellipse at 50% 20%,#2a120c,#0d0705 60%,#050302)}
.i7root .game{position:relative;width:min(100cqw,470px,57cqh);aspect-ratio:100/170;container-type:inline-size;display:flex;flex-direction:column;overflow:hidden;
  background:
    repeating-linear-gradient(90deg,#ffffff05 0 1px,transparent 1px 3px),
    linear-gradient(#1c0d09,#120806 45%,#0b0605);
  box-shadow:0 0 0 1px #3a2a1a,0 0 80px #000}

.i7root /* ---------- header ---------- */
.top{position:relative;height:23cqw;flex:none;overflow:hidden;
  background:
    radial-gradient(ellipse at 50% 120%,#ff6a1a55,transparent 60%),
    repeating-linear-gradient(90deg,#2a0603 0,#5a1208 3cqw,#7a1d0b 4.2cqw,#4a0e06 5.6cqw,#2a0603 8cqw)}
.i7root .top::before{content:"";position:absolute;inset:0;z-index:1;background:linear-gradient(#000e,#0003 45%,#0008)}
.i7root #flame{position:absolute;inset:0;width:100%;height:100%;z-index:1;mix-blend-mode:screen;opacity:.9}
.i7root .hbtn{position:absolute;top:2cqw;z-index:4;width:7.5cqw;height:7.5cqw;border-radius:1.5cqw;border:none;padding:0;cursor:pointer;color:#d8dde4;display:grid;place-items:center;
  color:#ffe9b0;background:linear-gradient(160deg,#3a2a14,#0a0704);box-shadow:0 0 0 .4cqw #f3d27a,0 0 0 .65cqw #5e3c08,0 0 2cqw #ffb83a99,0 .5cqw 1cqw #000}
.i7root .hbtn svg{width:50%;height:50%}
.i7root #infoBtn{left:2.4cqw}.i7root #sndBtn{right:2.4cqw}
.i7root .marquee{position:absolute;left:11cqw;right:11cqw;bottom:2.6cqw;height:11.5cqw;border-radius:1.4cqw;z-index:2;
  background:linear-gradient(#1a0503,#0a0201);
  box-shadow:0 0 0 .5cqw #8a6a2c,0 0 0 .8cqw #2a1a08,0 0 0 1.1cqw #d9b45a,inset 0 0 2.5cqw #ff5a0055,0 1cqw 2cqw #000;
  display:flex;align-items:center;justify-content:center}
.i7root .logo{margin:0;font-family:Cinzel,Georgia,serif;font-weight:900;font-size:7.6cqw;line-height:1;letter-spacing:.5cqw;
  background:var(--metal);-webkit-background-clip:text;background-clip:text;color:transparent;
  filter:drop-shadow(0 .25cqw 0 #2a1600) drop-shadow(0 0 1.2cqw #ff7a1a88)}
.i7root .bulbs{position:absolute;left:1.2cqw;right:1.2cqw;display:flex;justify-content:space-between;height:1.1cqw}
.i7root .bulbs.t{top:.8cqw}.i7root .bulbs.b{bottom:.8cqw}
.i7root .bulbs i{width:1.1cqw;height:1.1cqw;border-radius:50%;background:radial-gradient(circle at 40% 35%,#fffbe8,#ffcc5a 45%,#a5600a);box-shadow:0 0 .9cqw #ffb000;animation:chase 1.2s steps(1) infinite}
.i7root .bulbs i:nth-child(3n+2){animation-delay:-.4s}.i7root .bulbs i:nth-child(3n){animation-delay:-.8s}
@keyframes chase{0%{opacity:1}34%{opacity:.25;box-shadow:none}}
.i7root .game.winning .bulbs i{animation-duration:.3s}

.i7root /* ---------- paytable (backlit glass) ---------- */
.pay{flex:none;margin:1.8cqw 3cqw 0;border-radius:1.6cqw;padding:1.6cqw 2cqw 1.8cqw;position:relative;
  background:
    radial-gradient(ellipse at 50% 0%,#7a1a1a55,transparent 70%),
    linear-gradient(#3a0a0c,#1e0405);
  box-shadow:0 0 0 .35cqw #b8933e,0 0 0 .6cqw #2a1808,inset 0 0 3cqw #000,0 1cqw 2cqw #000a;display:flex;flex-direction:column;gap:1.4cqw}
.i7root .pay::after{content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;
  background:linear-gradient(115deg,#ffffff14 0 18%,transparent 34%)}
.i7root .ptab{display:grid;grid-template-columns:1fr 1fr;gap:.7cqw 2.4cqw}
.i7root .prow{display:flex;align-items:center;gap:1cqw;padding:.2cqw .6cqw;border-radius:.8cqw}
.i7root .prow .ic{display:flex;flex:none}
.i7root .prow .ic img{width:6.6cqw;height:6.6cqw;display:block;margin-right:-.4cqw}
.i7root .prow .v{margin-left:auto;min-width:11cqw;text-align:right;font-family:Oswald,Kanit,sans-serif;font-weight:600;font-size:3.6cqw;letter-spacing:.15cqw;
  color:var(--led);text-shadow:0 0 1cqw #ff7a0088;background:#070303;border-radius:.6cqw;padding:.15cqw 1.2cqw;box-shadow:inset 0 .3cqw .6cqw #000,0 0 0 .2cqw #3a2a1a}
.i7root .prow.hit{animation:rowflash .18s steps(1) 12}
@keyframes rowflash{50%{background:#ffcf5a33;box-shadow:inset 0 0 0 .3cqw #ffd27a}}
.i7root .bonusleg{display:flex;align-items:center;gap:1.2cqw;border-top:.25cqw solid #b8933e55;padding-top:1.2cqw;font-size:2.9cqw;line-height:1.2;color:#d9c3a0}
.i7root .bonusleg img{width:6.6cqw;height:6.6cqw;display:block;flex:none;margin-right:-.6cqw}
.i7root .bonusleg .sep{flex:1}
.i7root .bonusleg b{color:#fff;font-weight:600}

.i7root /* ---------- cabinet & reels ---------- */
.machine{flex:none;margin:2.4cqw 1.6cqw 0;padding:2.2cqw 2.4cqw;border-radius:2.2cqw;position:relative;
  background:
    repeating-linear-gradient(90deg,#ffffff08 0 1px,transparent 1px 2px),
    linear-gradient(#7d828a,#3c4047 12%,#23262b 50%,#2f3238 88%,#0e0f11);
  box-shadow:inset 0 .3cqw 0 #ffffff66,inset 0 -.3cqw 0 #000,0 1.2cqw 2.4cqw #000}
.i7root .mark{position:absolute;top:50%;width:2.2cqw;height:4cqw;margin-top:-2cqw;z-index:5;background:linear-gradient(#ff5a4a,#a00a0a);box-shadow:0 0 1cqw #ff2a2a88}
.i7root .mark.l{left:.4cqw;clip-path:polygon(0 0,100% 50%,0 100%)}.i7root .mark.r{right:.4cqw;clip-path:polygon(100% 0,0 50%,100% 100%)}
.i7root .reels{position:relative;height:48cqw;display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:1.1cqw;padding:.6cqw;border-radius:1.2cqw;background:#050505;box-shadow:inset 0 0 0 .3cqw #000,0 0 0 .35cqw #9aa3ae}
.i7root .reel{position:relative;overflow:hidden;border-radius:.6cqw;
  background:linear-gradient(90deg,#c9c3b6,#f7f3ea 22%,#fffdf7 50%,#f2ede2 78%,#bfb8aa)}
.i7root .reel::before{content:"";position:absolute;inset:0;z-index:1;opacity:.35;pointer-events:none;
  background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .45  0 0 0 0 .4  0 0 0 0 .32  0 0 0 .55 0'/></filter><rect width='120' height='120' filter='url(%23n)'/></svg>")}
.i7root .reel::after{content:"";position:absolute;inset:0;pointer-events:none;z-index:3;
  background:linear-gradient(#000f 0%,#000a 10%,#0003 26%,#0000 40%,#0000 60%,#0003 74%,#000a 90%,#000f 100%)}
.i7root .reel.bonus{background:linear-gradient(90deg,#3a2a12,#6a5226 22%,#7d6330 50%,#6a5226 78%,#3a2a12)}
.i7root .reel.bonus::before{opacity:.25}
.i7root .strip{position:absolute;left:0;right:0;top:0;will-change:transform;z-index:2}
.i7root .strip.blur{filter:blur(.35cqw)}
.i7root .cell{height:21cqw;display:flex;align-items:center;justify-content:center;transform-origin:50% 50%}
.i7root .cell img{width:100%;height:96%;object-fit:contain;display:block;pointer-events:none}
.i7root .cell.win img{animation:symwin .55s ease-in-out infinite alternate}
@keyframes symwin{from{transform:scale(1);filter:brightness(1)}to{transform:scale(1.1);filter:brightness(1.35) drop-shadow(0 0 1.2cqw #ffd27a)}}
.i7root .glass{position:absolute;inset:0;z-index:4;pointer-events:none;border-radius:1.2cqw;
  background:linear-gradient(105deg,#ffffff00 8%,#ffffff1c 16%,#ffffff00 26%,#ffffff00 64%,#ffffff12 70%,#ffffff00 76%)}
.i7root .reel.antic{z-index:5}
.i7root .reel.antic::after{background:linear-gradient(#000e,#0000 30%,#0000 70%,#000e);box-shadow:inset 0 0 0 .5cqw #ffb23a,inset 0 0 4cqw #ff5a00;animation:antic .25s ease-in-out infinite alternate}
@keyframes antic{to{box-shadow:inset 0 0 0 .6cqw #fff0b0,inset 0 0 7cqw #ff3a00}}
.i7root .reels.dim .reel:not(.hl) .strip{filter:brightness(.35) saturate(.5);transition:filter .3s}
.i7root .payline{position:absolute;left:0;right:0;top:50%;height:.35cqw;margin-top:-.18cqw;z-index:4;pointer-events:none;background:#d61a1acc;box-shadow:0 0 .6cqw #ff2a2a}
.i7root .payline.on{height:.6cqw;margin-top:-.3cqw;background:#ffe3a0;box-shadow:0 0 1.5cqw #ffb000,0 0 4cqw #ff7a00;animation:pl .2s steps(1) infinite}
@keyframes pl{50%{opacity:.4}}
.i7root .reelWin{position:absolute;inset:-4cqw -2cqw;display:flex;align-items:center;justify-content:center;z-index:6;pointer-events:none}
.i7root .metal{font-family:Oswald,Kanit,sans-serif;font-weight:700;display:inline-block;line-height:1;white-space:nowrap;letter-spacing:.2cqw;
  background:var(--metal);-webkit-background-clip:text;background-clip:text;color:transparent;
  filter:drop-shadow(0 .2cqw 0 #3a2200) drop-shadow(0 .5cqw .6cqw #000) drop-shadow(0 0 1.8cqw #ff9a0066)}
.i7root .reelWin .metal{font-size:14cqw;opacity:0;transform:scale(.5)}
.i7root .reelWin .metal.show{opacity:1;transform:scale(1);transition:transform .3s cubic-bezier(.2,1.5,.4,1),opacity .1s}
.i7root .reelWin .metal.bump{animation:bump .28s}
@keyframes bump{40%{transform:scale(1.15)}}
.i7root .multFly{position:absolute;z-index:7;pointer-events:none;opacity:0}
.i7root .multFly.go{animation:multFly .7s cubic-bezier(.3,1.3,.5,1) forwards}
@keyframes multFly{0%{opacity:1;transform:translate(0,0) scale(.6)}55%{transform:translate(var(--dx),var(--dy)) scale(1.5)}100%{opacity:0;transform:translate(var(--dx),var(--dy)) scale(2.4)}}
.i7root .banner{position:absolute;left:50%;top:50%;z-index:8;pointer-events:none;transform:translate(-50%,-50%) scale(0);
  padding:1.6cqw 5cqw;border-radius:1.2cqw;background:linear-gradient(#2a0a0c,#120304);box-shadow:0 0 0 .4cqw #c9a14a,0 0 0 .7cqw #2a1808,0 0 5cqw #ff7a00aa,0 1cqw 2cqw #000;text-align:center}
.i7root .banner .metal{font-family:Cinzel,Georgia,serif;font-weight:900;font-size:7.5cqw}
.i7root .banner small{display:block;font-size:3.2cqw;color:#e8d4b0;margin-top:.4cqw}
.i7root .banner.go{animation:banner 1.9s cubic-bezier(.2,1.4,.4,1) forwards}
@keyframes banner{0%{transform:translate(-50%,-50%) scale(.2);opacity:0}15%{transform:translate(-50%,-50%) scale(1.06);opacity:1}25%,82%{transform:translate(-50%,-50%) scale(1)}100%{transform:translate(-50%,-50%) scale(.9);opacity:0}}
.i7root .respinTag{position:absolute;top:-2.2cqw;left:50%;transform:translateX(-50%);z-index:9;padding:.2cqw 2.6cqw;border-radius:.8cqw;font-weight:500;font-size:2.9cqw;
  background:#120304;color:var(--led);box-shadow:0 0 0 .3cqw #c9a14a;display:none;white-space:nowrap}
.i7root .respinTag.on{display:block}

.i7root /* ---------- meters & controls ---------- */
.meters{flex:none;display:grid;grid-template-columns:1fr 1.25fr 1fr;gap:1.6cqw;margin:2.6cqw 3cqw 0}
.i7root .lcd{border-radius:1cqw;padding:.9cqw 1.4cqw 1cqw;background:linear-gradient(#050303,#120a06);box-shadow:inset 0 .4cqw .8cqw #000,0 0 0 .3cqw #4a3a26,0 0 0 .55cqw #111;text-align:center;min-width:0}
.i7root .lcd span{display:block;font-size:2.6cqw;color:#a8957a;line-height:1.2}
.i7root .lcd b{display:block;font-family:Oswald,Kanit,sans-serif;font-weight:600;font-size:4.4cqw;line-height:1.25;color:var(--led);text-shadow:0 0 1.2cqw #ff7a0099;letter-spacing:.15cqw;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.i7root .lcd.win b{color:#ffe7b0}
.i7root .lcd.hot b{color:#fff4cc;text-shadow:0 0 1.6cqw #ffb000,0 0 3cqw #ff7a00}
.i7root .controls{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1.6cqw;padding:0 4cqw 2cqw}
.i7root .btns{width:100%;display:grid;grid-template-columns:1fr 1fr auto 1fr 1fr;align-items:center;justify-items:center}
.i7root .cbtn{position:relative;width:11cqw;height:11cqw;border-radius:2cqw;border:none;cursor:pointer;padding:0;color:#ffe9b0;display:grid;place-items:center;overflow:visible;
  background:linear-gradient(160deg,#3a2a14 0%,#1a1208 45%,#0a0704 100%);
  box-shadow:0 0 0 .45cqw #f3d27a,0 0 0 .75cqw #5e3c08,0 0 0 1cqw #c99a3a,0 0 2.2cqw #ffb83a99,0 .9cqw 1.2cqw #000,inset 0 .5cqw .6cqw #ffe9a033,inset 0 -.6cqw .8cqw #000a;
  transition:transform .08s,box-shadow .2s,filter .2s;animation:gglow 2.6s ease-in-out infinite}
@keyframes gglow{50%{box-shadow:0 0 0 .45cqw #fff0b8,0 0 0 .75cqw #5e3c08,0 0 0 1cqw #e9c46a,0 0 3.6cqw #ffc04acc,0 .9cqw 1.2cqw #000,inset 0 .5cqw .6cqw #ffe9a033,inset 0 -.6cqw .8cqw #000a}}
.i7root .cbtn::after,.i7root .spin::after,.i7root .hbtn::after{content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;background:linear-gradient(180deg,#ffffff30,transparent 42%)}
.i7root .cbtn svg{width:48%;height:48%;filter:drop-shadow(0 0 .6cqw #ffcf5a88)}
.i7root .cbtn:active,.i7root .cbtn.press{transform:translateY(.35cqw) scale(.95)}
.i7root .cbtn.on{color:#2a1500;background:linear-gradient(160deg,#fff6d0,#f0c45a 40%,#a87418);box-shadow:0 0 0 .45cqw #fff6d0,0 0 0 .75cqw #5e3c08,0 0 0 1cqw #e9c46a,0 0 4cqw #ffc04a,0 .9cqw 1.2cqw #000}
.i7root .cbtn.on svg{filter:none}
.i7root .cbtn:disabled{opacity:.35;cursor:default;animation:none;filter:grayscale(.6)}
.i7root .cbtn .cnt{position:absolute;top:-1.8cqw;right:-1.8cqw;z-index:2;background:#120304;color:var(--led);font-family:Oswald,sans-serif;font-size:2.6cqw;border-radius:.6cqw;padding:0 .9cqw;box-shadow:0 0 0 .25cqw #f3d27a;line-height:1.5}
.i7root .spin{width:21cqw;height:21cqw;border-radius:3.6cqw;border:none;position:relative;cursor:pointer;padding:0;display:grid;place-items:center;overflow:visible;
  background:radial-gradient(ellipse at 50% 25%,#ffdf8a 0%,#d79a2c 30%,#8a5208 70%,#4a2a04 100%);
  box-shadow:0 0 0 .6cqw #fff3c8,0 0 0 1.1cqw #6e4a10,0 0 0 1.6cqw #e9c46a,0 0 4cqw #ffb83acc,0 1.4cqw 2cqw #000,inset 0 .8cqw 1cqw #fff6d088,inset 0 -1.2cqw 1.6cqw #3a1e00;
  transition:transform .08s,filter .2s}
.i7root .spin::before{content:"";position:absolute;inset:-2.2cqw;border-radius:5cqw;z-index:-1;pointer-events:none;
  background:radial-gradient(closest-side,#ffc04a88,transparent);opacity:.7}
.i7root .spin:active,.i7root .spin.press{transform:scale(.94)}
.i7root .spin svg{width:56%;height:56%;filter:drop-shadow(0 .3cqw .2cqw #5a3200)}
.i7root .spin svg path{stroke:#3a1e00}
.i7root .spin svg path:first-of-type{stroke:#fffaf0}
.i7root .spin svg path:last-of-type{fill:#fffaf0;stroke:#fffaf0}
.i7root .spin.spinning svg{animation:rot .5s linear infinite}
.i7root .spin.ready::before{animation:ring 1.8s ease-in-out infinite}
@keyframes ring{50%{opacity:1;transform:scale(1.08)}}
@keyframes rot{to{transform:rotate(360deg)}}
.i7root .pressRing{position:absolute;z-index:65;pointer-events:none;border-radius:2.5cqmin;border:3px solid #ffe08a;box-shadow:0 0 18px #ffc04a,inset 0 0 14px #ffc04a;
  transform:translate(-50%,-50%);animation:pressRing .55s ease-out forwards}
@keyframes pressRing{0%{opacity:1;width:var(--w);height:var(--h)}100%{opacity:0;width:calc(var(--w)*1.9);height:calc(var(--h)*1.9);border-width:1px}}
.i7root .pressFill{animation:pressFill .35s ease-out}
@keyframes pressFill{0%{filter:brightness(2.2) sepia(1) saturate(3) hue-rotate(-12deg)}100%{filter:none}}
.i7root .hint{font-size:2.7cqw;color:#8f7d64;white-space:nowrap;margin-top:1.2cqw}

.i7root /* ---------- big win overlay ---------- */
.big{position:absolute;inset:0;z-index:50;display:none;align-items:center;justify-content:center;flex-direction:column;container-type:size;cursor:pointer;
  background:radial-gradient(circle at 50% 45%,#2a1204e6,#000000f5 70%)}
.i7root .big.show{display:flex}
.i7root .rays{position:absolute;width:160cqmax;height:160cqmax;left:50%;top:44%;margin:-80cqmax 0 0 -80cqmax;border-radius:50%;filter:blur(6px);
  background:repeating-conic-gradient(from 0deg,var(--ray) 0 4deg,transparent 7deg 20deg);
  -webkit-mask-image:radial-gradient(circle,#000 0 8%,transparent 50%);mask-image:radial-gradient(circle,#000 0 8%,transparent 50%);animation:spinr 18s linear infinite}
.i7root .rays.r2{animation-direction:reverse;animation-duration:26s;opacity:.5}
@keyframes spinr{to{transform:rotate(360deg)}}
.i7root .big{--ray:#ffcf6a44;--glow:#ff9a00}
.i7root .big.t2{--ray:#ffe2a066;--glow:#ff6a00}
.i7root .big.t3{--ray:#fff2d088;--glow:#ff3a00}
.i7root .bigInner{position:relative;display:flex;flex-direction:column;align-items:center;gap:2.4cqh;transform:translateY(-3cqh)}
.i7root .tier{font-family:Cinzel,Georgia,serif;font-weight:900;font-size:min(15cqw,9cqh);line-height:1;text-align:center;letter-spacing:.6cqw;
  background:var(--metal);-webkit-background-clip:text;background-clip:text;color:transparent;
  filter:drop-shadow(0 .3cqh 0 #3a2200) drop-shadow(0 .8cqh .8cqh #000) drop-shadow(0 0 3cqh var(--glow))}
.i7root .big.t3 .tier{font-size:min(12.5cqw,7.5cqh)}
.i7root .tier.slam{animation:slam .6s cubic-bezier(.2,1.5,.35,1)}
@keyframes slam{0%{transform:scale(2.6);opacity:0;filter:blur(8px)}45%{transform:scale(.94);opacity:1;filter:none}100%{transform:scale(1)}}
.i7root .tierLine{width:min(70cqw,60cqh);height:.4cqh;background:linear-gradient(90deg,transparent,#e9c46a,#fff3c8,#e9c46a,transparent)}
.i7root .amtBox{position:relative;padding:1.6cqh 6cqw;border-radius:1.6cqh;background:linear-gradient(#0b0503ee,#000e);
  box-shadow:0 0 0 .35cqh #c9a14a,0 0 0 .6cqh #2a1808,0 0 0 .8cqh #8a6a2c,0 0 5cqh var(--glow)}
.i7root .amt{font-family:Oswald,Kanit,sans-serif;font-weight:700;font-size:min(14cqw,8.5cqh);line-height:1.05;letter-spacing:.3cqw;display:block;
  background:var(--metal);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 .3cqh 0 #3a2200) drop-shadow(0 0 2cqh #ffae0066)}
.i7root .amt.pulse{animation:apulse .3s}
@keyframes apulse{40%{transform:scale(1.12)}}
.i7root .amt.done{animation:done 1s ease-in-out infinite alternate}
@keyframes done{to{transform:scale(1.04)}}
.i7root .bigMult{font-size:min(9cqw,5.5cqh);opacity:0}
.i7root .bigMult.on{opacity:1}
.i7root .bigHint{position:absolute;bottom:6cqh;font-size:min(3.4cqw,2.2cqh);color:#e9d8b8aa;animation:hint 1.2s ease-in-out infinite alternate}
@keyframes hint{to{opacity:.35}}
.i7root .flash{position:absolute;inset:0;z-index:55;background:#fff6e0;opacity:0;pointer-events:none}
.i7root .flash.go{animation:flash .4s ease-out}
@keyframes flash{0%{opacity:.75}100%{opacity:0}}
.i7root #app.shake .game,.i7root #app.shake .bigInner{animation:shake .45s}
@keyframes shake{10%{transform:translate(-1.6%,1%)}20%{transform:translate(1.6%,-1%)}35%{transform:translate(-1.2%,-.6%)}50%{transform:translate(1%,.8%)}70%{transform:translate(-.5%,.3%)}100%{transform:none}}
.i7root #fx{position:absolute;inset:0;width:100%;height:100%;z-index:60;pointer-events:none}

.i7root /* ---------- modals / toast ---------- */
.modal{position:absolute;inset:0;z-index:70;display:none;align-items:center;justify-content:center;background:#000c;padding:4%}
.i7root .modal.show{display:flex}
.i7root .panel{width:min(430px,100%);max-height:88%;overflow:auto;border-radius:14px;padding:20px 20px 16px;background:linear-gradient(#1e0c08,#0e0604);
  box-shadow:0 0 0 2px #b8933e,0 0 40px #000;color:#eadcc4;font-size:15px;line-height:1.55}
.i7root .panel h2{font-family:Cinzel,Georgia,serif;font-weight:900;margin:0 0 8px;font-size:24px;background:var(--metal);-webkit-background-clip:text;background-clip:text;color:transparent}
.i7root .panel h3{margin:14px 0 4px;color:#e8c47a;font-size:16px;font-weight:600}
.i7root .panel p{margin:0 0 6px}
.i7root .panel .row{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px}
.i7root .pbtn{flex:1;min-width:110px;padding:11px 14px;border-radius:10px;border:none;cursor:pointer;font-weight:600;font-size:15px;
  background:linear-gradient(#f7dc8a,#b98a2c);color:#2a1600;box-shadow:0 3px 0 #5a3a0a,inset 0 1px 0 #fff8}
.i7root .pbtn.alt{background:linear-gradient(#3a3d44,#18191c);color:#e4e8ee;box-shadow:0 3px 0 #000,inset 0 0 0 1px #8a929c}
.i7root .pbtn:active{transform:translateY(2px);box-shadow:0 1px 0 #000}
.i7root .autoGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:10px}
.i7root .toast{position:absolute;left:50%;top:40%;transform:translate(-50%,-50%);z-index:80;padding:12px 20px;border-radius:12px;background:#000e;box-shadow:0 0 0 2px #b8933e;
  color:#fff;font-size:15px;text-align:center;opacity:0;pointer-events:none;transition:opacity .25s;max-width:86%}
.i7root .toast.show{opacity:1;pointer-events:auto}
@media (prefers-reduced-motion: reduce){
  .i7root .rays,.i7root .bulbs i,.i7root .spin.ready::before{animation:none!important}
  .i7root #app.shake .game,.i7root #app.shake .bigInner{animation:none!important}
}
`;

/* ---------------------------------------------------------------------------
 * Game engine: imperative (reels, canvas particles, audio) for smooth 60fps.
 * Runs against the component's own DOM and returns a cleanup function.
 * ------------------------------------------------------------------------- */
function initGame(root, host) {
  const ac = new AbortController();
  const SIG = { signal: ac.signal };
  let dead = false;

  const $=id=>root.querySelector('#'+id);
  const app=$('app'), game=$('game');

  /* ================= config ================= */
  const W_MAIN={R7:2,G7:3,B7:4,B3:5,B2:6,B1:7,BL:13.5};
  const W_BONUS={BL:16,X2:5,X5:2,X10:.7,RSP:1.6};
  const PAY={R7:150,G7:80,B7:40,A7:10,B3:20,B2:12,B1:8,AB:2};
  const MULT={X2:2,X5:5,X10:10};
  const BETS=[1,2,5,10,20,45,90,180,450,900];
  const TIERS=[10,25,50];
  const TIER_NAMES=['','BIG WIN','MEGA WIN','SUPER\nMEGA WIN'];
  const isSeven=s=>s==='R7'||s==='G7'||s==='B7';
  const isBar=s=>s==='B1'||s==='B2'||s==='B3';

  let balance=host?host.getBalance():10000, betIdx=4, busy=false, spinning=false, winPhase=false, skip=false;
  let turbo=false, auto=0, respins=0;

  /* ================= helpers ================= */
  const pick=w=>{let s=0;for(const k in w)s+=w[k];let r=Math.random()*s;for(const k in w){r-=w[k];if(r<0)return k}return Object.keys(w)[0]};
  const rndOf=(w,excl)=>{let s;do{s=pick(w)}while(s===excl);return s};
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  const fmt=n=>n.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
  const fmtInt=n=>Math.round(n).toLocaleString('en-US');
  const fmtK=n=>n>=1e6?+(n/1e6).toFixed(1)+'M':n>=1000?+(n/1000).toFixed(n>=1e4?0:1)+'K':String(n);
  /* ===== realistic symbols: standalone SVG images with bevel lighting ===== */
  const SYMIMG=(()=>{
    const F="'Arial Black','Arial Bold',Arial,Helvetica,sans-serif";
    const COMMON=`
    <filter id="bev" x="-15%" y="-15%" width="130%" height="130%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="2.2" result="b"/>
      <feDiffuseLighting in="b" surfaceScale="4" diffuseConstant="1.15" lighting-color="#fff" result="d"><feDistantLight azimuth="225" elevation="58"/></feDiffuseLighting>
      <feSpecularLighting in="b" surfaceScale="5" specularConstant="1.1" specularExponent="28" lighting-color="#fff" result="s"><feDistantLight azimuth="225" elevation="42"/></feSpecularLighting>
      <feComposite in="SourceGraphic" in2="d" operator="arithmetic" k1="1.05" result="lit"/>
      <feComposite in="lit" in2="s" operator="arithmetic" k2="1" k3=".75" result="all"/>
      <feComposite in="all" in2="SourceAlpha" operator="in"/>
    </filter>
    <filter id="bev2" x="-15%" y="-15%" width="130%" height="130%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="1" result="b"/>
      <feSpecularLighting in="b" surfaceScale="3" specularConstant="1" specularExponent="22" lighting-color="#fff" result="s"><feDistantLight azimuth="225" elevation="40"/></feSpecularLighting>
      <feComposite in="SourceGraphic" in2="s" operator="arithmetic" k2="1" k3=".7" result="all"/>
      <feComposite in="all" in2="SourceAlpha" operator="in"/>
    </filter>
    <filter id="sh" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.6"/></filter>
    <linearGradient id="chrome" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff"/><stop offset=".28" stop-color="#e3e8ee"/><stop offset=".48" stop-color="#8a95a4"/><stop offset=".52" stop-color="#2f3640"/><stop offset=".72" stop-color="#a7b0bd"/><stop offset="1" stop-color="#f4f6f9"/></linearGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff8dc"/><stop offset=".25" stop-color="#f2cf6a"/><stop offset=".48" stop-color="#a87418"/><stop offset=".53" stop-color="#5e3c08"/><stop offset=".7" stop-color="#d5a23c"/><stop offset="1" stop-color="#fff0b8"/></linearGradient>
    <linearGradient id="gloss" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".75"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>`;
    const doc=(defs,body)=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="9 9 102 102" width="240" height="240"><defs>${COMMON}${defs}</defs>${body}</svg>`;
    const url=s=>'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(s);

    const P7='M20 16 H102 V35 C84 54 74 76 70 106 H40 C43 80 56 57 73 39 H20 Z';
    const seven=(c0,c1,c2,c3,rim,edge)=>doc(
      `<linearGradient id="b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c0}"/><stop offset=".35" stop-color="${c1}"/><stop offset=".7" stop-color="${c2}"/><stop offset="1" stop-color="${c3}"/></linearGradient>
       <path id="p" d="${P7}"/><clipPath id="c"><use href="#p"/></clipPath>`,
      `<use href="#p" transform="translate(3 5)" fill="#000" opacity=".45" filter="url(#sh)"/>
       <use href="#p" fill="none" stroke="${edge}" stroke-width="12" stroke-linejoin="round"/>
       <g filter="url(#bev)"><use href="#p" fill="none" stroke="url(#${rim})" stroke-width="7.5" stroke-linejoin="round"/></g>
       <g filter="url(#bev)"><use href="#p" fill="url(#b)"/></g>
       <g clip-path="url(#c)"><path d="M10 10 H110 V30 Q60 40 10 34Z" fill="url(#gloss)" opacity=".55"/></g>`);

    const plate=(y,w,h,col,txt)=>`
       <g transform="translate(60 ${y})">
         <rect x="${-w/2+2}" y="${-h/2+4}" width="${w}" height="${h}" rx="5" fill="#000" opacity=".45" filter="url(#sh)"/>
         <g filter="url(#bev)"><rect x="${-w/2}" y="${-h/2}" width="${w}" height="${h}" rx="5" fill="url(#chrome)"/></g>
         <g filter="url(#bev2)"><rect x="${-w/2+3.5}" y="${-h/2+3.5}" width="${w-7}" height="${h-7}" rx="3" fill="url(#${col})"/></g>
         <rect x="${-w/2+4}" y="${-h/2+4}" width="${w-8}" height="${(h-8)*.42}" rx="2.5" fill="url(#gloss)" opacity=".35"/>
         <text y="${h*.19}" text-anchor="middle" font-family="${F}" font-weight="900" font-size="${h*.52}" letter-spacing="1" fill="#000" opacity=".5" transform="translate(.8 1)">${txt}</text>
         <text y="${h*.19}" text-anchor="middle" font-family="${F}" font-weight="900" font-size="${h*.52}" letter-spacing="1" fill="#f6f6f2">${txt}</text>
       </g>`;
    const enamel=(id,a,b,c)=>`<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset=".5" stop-color="${b}"/><stop offset="1" stop-color="${c}"/></linearGradient>`;

    const medal=(a,b,c,label,size)=>doc(
      `<radialGradient id="e" cx=".42" cy=".32" r=".75"><stop offset="0" stop-color="${a}"/><stop offset=".55" stop-color="${b}"/><stop offset="1" stop-color="${c}"/></radialGradient>`,
      `<circle cx="62" cy="64" r="48" fill="#000" opacity=".5" filter="url(#sh)"/>
       <g filter="url(#bev)"><circle cx="60" cy="60" r="48" fill="url(#gold)"/></g>
       <circle cx="60" cy="60" r="46" fill="none" stroke="#5e3c08" stroke-width="2.4" stroke-dasharray="1.6 2.4" opacity=".8"/>
       <g filter="url(#bev2)"><circle cx="60" cy="60" r="37" fill="url(#e)"/></g>
       <circle cx="60" cy="60" r="37" fill="none" stroke="#2a1600" stroke-width="1.5" opacity=".6"/>
       <ellipse cx="54" cy="40" rx="25" ry="11" fill="url(#gloss)" opacity=".45"/>
       <text x="61" y="${60+size*.36+1.5}" text-anchor="middle" font-family="${F}" font-weight="900" font-size="${size}" fill="#000" opacity=".55">${label}</text>
       <g filter="url(#bev2)"><text x="60" y="${60+size*.36}" text-anchor="middle" font-family="${F}" font-weight="900" font-size="${size}" fill="#fffaf0" stroke="#1a0a00" stroke-width="2.2" paint-order="stroke">${label}</text></g>`);

    const out={
      R7:seven('#ff9a86','#e0161b','#9a0408','#3c0002','gold','#1a0200'),
      G7:seven('#fffbe6','#f2c84a','#b07a12','#4a2e04','chrome','#1a1000'),
      B7:seven('#c8e6ff','#2a6fe0','#0c2f8c','#040e36','chrome','#000514'),
      B1:doc(enamel('r','#ff6a5a','#c3121a','#4a0004'),plate(60,100,40,'r','BAR')),
      B2:doc(enamel('u','#7ab0ff','#1a4cc8','#061650'),plate(37,96,34,'u','BAR')+plate(83,96,34,'u','BAR')),
      B3:doc(enamel('g','#8ef0a0','#15913a','#03351a'),plate(24,92,29,'g','BAR')+plate(60,92,29,'g','BAR')+plate(96,92,29,'g','BAR')),
      X2:medal('#c6f5a6','#3a9a1c','#0c3a04','2x',34),
      X5:medal('#bfe2ff','#1f6fd6','#06225e','5x',34),
      X10:medal('#ffb08a','#c41a0e','#3e0402','10x',28),
      RSP:doc(`<radialGradient id="e" cx=".42" cy=".3" r=".8"><stop offset="0" stop-color="#ff9ad2"/><stop offset=".5" stop-color="#a0105e"/><stop offset="1" stop-color="#2e0018"/></radialGradient>`,
        `<circle cx="62" cy="64" r="48" fill="#000" opacity=".5" filter="url(#sh)"/>
         <g filter="url(#bev)"><circle cx="60" cy="60" r="48" fill="url(#chrome)"/></g>
         <g filter="url(#bev2)"><circle cx="60" cy="60" r="38" fill="url(#e)"/></g>
         <g fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".92"><path d="M38 46 A26 26 0 0 1 84 44"/><path d="M82 74 A26 26 0 0 1 36 76"/></g>
         <path d="M88 34 L86 50 L72 43Z M32 86 L34 70 L48 77Z" fill="#fff"/>
         <rect x="12" y="51" width="96" height="19" rx="3" fill="#120006" stroke="url(#gold)" stroke-width="2.5"/>
         <text x="60" y="66" text-anchor="middle" font-family="${F}" font-weight="900" font-size="14" letter-spacing="1.5" fill="url(#gold)">RESPIN</text>`)
    };
    for(const k in out)out[k]=url(out[k]);
    // warm the image cache so the first spin doesn't flicker
    for(const k in out){const i=new Image();i.src=out[k]}
    return out;
  })();

  const symSVG=s=>s==='BL'?'':`<img alt="" draggable="false" src="${SYMIMG[s]}">`;
  const bet=()=>BETS[betIdx];

  /* ================= audio ================= */
  const SND={
    ctx:null,on:true,
    init(){
      if(this.ctx){if(this.ctx.state==='suspended')this.ctx.resume();return}
      const C=window.AudioContext||window.webkitAudioContext; if(!C)return;
      const c=this.ctx=new C();
      this.comp=c.createDynamicsCompressor();this.comp.threshold.value=-14;this.comp.ratio.value=6;this.comp.connect(c.destination);
      this.master=c.createGain();this.master.gain.value=this.on?.7:0;this.master.connect(this.comp);
      this.music=c.createGain();this.music.gain.value=.16;this.music.connect(this.master);
      const len=c.sampleRate*2,b=c.createBuffer(1,len,c.sampleRate),d=b.getChannelData(0);
      for(let i=0;i<len;i++)d[i]=Math.random()*2-1;this.nbuf=b;
      this.startMusic();
    },
    setOn(v){this.on=v;if(this.master)this.master.gain.setTargetAtTime(v?.7:0,this.ctx.currentTime,.05)},
    tone(f,d,o={}){
      const c=this.ctx;if(!c)return;const t=c.currentTime+(o.at||0);
      const os=c.createOscillator(),g=c.createGain();os.type=o.type||'sine';
      os.frequency.setValueAtTime(f,t);if(o.f2)os.frequency.exponentialRampToValueAtTime(o.f2,t+d);
      if(o.det)os.detune.value=o.det;
      g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(o.v||.2,t+(o.a||.005));g.gain.exponentialRampToValueAtTime(.0001,t+d);
      let n=os.connect(g);
      if(o.lp){const f1=c.createBiquadFilter();f1.type='lowpass';f1.frequency.value=o.lp;g.connect(f1);n=f1}
      n.connect(o.dest||this.master);os.start(t);os.stop(t+d+.05);
    },
    noise(d,o={}){
      const c=this.ctx;if(!c)return;const t=c.currentTime+(o.at||0);
      const s=c.createBufferSource();s.buffer=this.nbuf;s.playbackRate.value=o.rate||1;
      const f=c.createBiquadFilter();f.type=o.ft||'bandpass';f.frequency.setValueAtTime(o.f||1000,t);if(o.f2)f.frequency.exponentialRampToValueAtTime(o.f2,t+d);f.Q.value=o.q||1;
      const g=c.createGain();g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(o.v||.2,t+(o.a||.005));g.gain.exponentialRampToValueAtTime(.0001,t+d);
      s.connect(f).connect(g).connect(o.dest||this.master);s.start(t,Math.random()*1.5);s.stop(t+d+.05);
    },
    click(){this.tone(1300,.05,{type:'square',v:.06,lp:3000});this.tone(2600,.03,{type:'sine',v:.05})},
    spinStart(){this.noise(.45,{f:300,f2:2400,v:.25,q:2});this.tone(220,.25,{type:'sawtooth',f2:660,v:.06,lp:1800})},
    tick(){this.noise(.03,{ft:'highpass',f:2500,v:.07});this.tone(140+Math.random()*30,.04,{type:'square',v:.03,lp:600})},
    stop(i){this.tone(95,.32,{f2:45,v:.7});this.noise(.08,{ft:'lowpass',f:1600,v:.35});this.tone(1900+i*180,.06,{type:'triangle',v:.12})},
    bonusStop(){this.stop(3);[1568,2093,2637].forEach((f,i)=>this.tone(f,.35,{type:'triangle',v:.1,at:i*.05}))},
    anticStart(){
      const c=this.ctx;if(!c)return null;const t=c.currentTime;
      const o=c.createOscillator(),g=c.createGain(),f=c.createBiquadFilter(),l=c.createOscillator(),lg=c.createGain();
      o.type='sawtooth';o.frequency.setValueAtTime(180,t);o.frequency.exponentialRampToValueAtTime(900,t+2.4);
      f.type='lowpass';f.frequency.setValueAtTime(600,t);f.frequency.exponentialRampToValueAtTime(4000,t+2.4);
      l.frequency.value=14;lg.gain.value=.08;l.connect(lg).connect(g.gain);
      g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.14,t+.2);
      o.connect(f).connect(g).connect(this.master);o.start();l.start();
      const hb=setInterval(()=>{this.tone(70,.18,{f2:40,v:.5});this.tone(70,.18,{f2:40,v:.35,at:.16})},520);
      return()=>{const n=c.currentTime;g.gain.cancelScheduledValues(n);g.gain.setValueAtTime(g.gain.value,n);g.gain.exponentialRampToValueAtTime(.0001,n+.15);o.stop(n+.2);l.stop(n+.2);clearInterval(hb)};
    },
    win(){[784,988,1175,1568,1976].forEach((f,i)=>{this.tone(f,.5,{type:'triangle',v:.13,at:i*.07});this.tone(f*2,.3,{v:.04,at:i*.07})})},
    coin(){const f=1900+Math.random()*900;this.tone(f,.08,{type:'triangle',v:.07});this.tone(f*1.5,.05,{v:.03,at:.02})},
    lose(){this.tone(330,.18,{type:'triangle',v:.07,f2:250});this.tone(247,.3,{type:'triangle',v:.06,f2:180,at:.12})},
    slam(){this.tone(70,.7,{f2:30,v:.9});this.noise(.6,{ft:'lowpass',f:900,v:.5});this.noise(1.2,{ft:'highpass',f:5000,v:.18,a:.01});this.tone(140,.3,{type:'square',f2:60,v:.15,lp:800})},
    mult(){this.tone(300,.35,{type:'square',f2:1200,v:.1,lp:3000});this.slam()},
    fanfare(tier){
      const roots=[0,262,330,392][tier];const ch=[[1,1.26,1.5],[1.335,1.68,2],[1.5,1.89,2.25],[2,2.52,3]];
      ch.forEach((c,i)=>c.forEach(k=>{const f=roots*k;this.tone(f,.55,{type:'sawtooth',v:.07,at:i*.17,lp:2600,a:.02});this.tone(f*1.003,.55,{type:'sawtooth',v:.05,at:i*.17,lp:2200,a:.02})}));
      [1,2,3,4,5,6].forEach(i=>this.tone(roots*4*(1+i*.125),.2,{type:'triangle',v:.05,at:.7+i*.05}));
    },
    finale(){[523,659,784,1047].forEach(f=>this.tone(f,1.4,{type:'sawtooth',v:.06,lp:2400,a:.03}));this.noise(1.5,{ft:'highpass',f:6000,v:.12})},
    respin(){this.tone(400,.8,{f2:1600,v:.12,type:'triangle'});[1047,1319,1568,2093,2637].forEach((f,i)=>this.tone(f,.3,{type:'sine',v:.08,at:.25+i*.06}))},
    startMusic(){
      const c=this.ctx,step=60/128/2;let next=c.currentTime+.1,i=0;
      const bass=[110,0,110,131,0,147,0,165,110,0,110,98,0,98,123,0];
      const lead=[0,0,880,0,0,0,988,0,0,0,880,0,784,0,0,0, 0,0,880,0,0,0,1047,0,988,0,880,0,659,0,0,0];
      const sch=()=>{
        while(next<c.currentTime+.35){
          const at=next-c.currentTime,b=bass[i%16],l=lead[i%32];
          if(b)this.tone(b,step*1.6,{type:'triangle',v:.5,at,dest:this.music});
          if(i%2===0)this.noise(.04,{ft:'highpass',f:7000,v:.12,at,dest:this.music});
          if(i%8===4)this.noise(.12,{ft:'bandpass',f:1800,v:.25,at,dest:this.music});
          if(i%8===0)this.tone(55,.25,{f2:35,v:.8,at,dest:this.music});
          if(l)this.tone(l,step*1.4,{type:'square',v:.06,at,lp:2200,dest:this.music});
          next+=step;i++;
        }
      };
      this.musicTimer=setInterval(sch,90);
      document.addEventListener('visibilitychange',()=>{if(document.hidden)c.suspend();else c.resume()},SIG);
    }
  };

  /* ================= reels ================= */
  class Reel{
    constructor(el,i,bonus){
      this.el=el;this.i=i;this.strip=el.querySelector('.strip');this.bonus=bonus;this.w=bonus?W_BONUS:W_MAIN;
      const c=pick(this.w);this.syms=this.triple(c);this.render(this.syms);this.state='idle';this.place(1);
    }
    triple(c){
      if(c==='BL')return[rndOf(this.w,'BL'),'BL',rndOf(this.w,'BL')];
      return[Math.random()<.55?'BL':rndOf(this.w,'BL'),c,Math.random()<.55?'BL':rndOf(this.w,'BL')];
    }
    h(){return this.el.clientHeight/1.55}
    H(){return this.el.clientHeight}
    off(){return (this.H()-this.h())/2}
    render(a){const h=this.h();this.strip.innerHTML=a.map(s=>`<div class="cell" style="height:${h}px">${symSVG(s)}</div>`).join('');this.cells=this.strip.children}
    place(k){this.setY(-k*this.h()+this.off())}
    setY(y){this.strip.style.transform=`translate3d(0,${y}px,0)`;this.curve(y)}
    curve(y){
      const h=this.h(),H=this.H(),R=H*.6,k=this.cells;if(!k)return;
      const first=Math.max(0,Math.floor((-y-h*1.2)/h)),last=Math.min(k.length-1,Math.ceil((-y+H+h*1.2)/h));
      for(let i=first;i<=last;i++){
        const c=i*h+h/2+y-H/2,a=Math.max(-1.5,Math.min(1.5,c/R));
        k[i].style.transform=`translateY(${(R*Math.sin(a)-c).toFixed(2)}px) scaleY(${Math.max(.04,Math.cos(a)).toFixed(3)})`;
      }
    }
    center(){return this.strip.children[1]}
    start(final,cruise,now,slow=0){
      const v=1/52,Ta=260,end=.1;            // speed in cells per ms, accel time, crawl speed factor
      this.v=v;this.Ta=Ta;this.Tc=cruise;this.Ts=slow;this.endF=end;this.hurryAt=0;
      const D=this.dist(cruise+slow);const n=Math.max(10,Math.round(D));
      const fill=[];for(let k=0;k<n;k++)fill.push(k%2?'BL':rndOf(this.w,'BL'));
      const arr=[...this.triple(final),...fill,...this.syms];this.final=arr.slice(0,3);
      this.render(arr);this.N=arr.length;const h=this.h();
      this.y0=-(this.N-2)*h+this.off();this.y1=-h+this.off();this.over=h*(slow?.07:.22);
      this.D=D;this.t0=now;this.dur=cruise+slow;this.state='spin';this.strip.classList.remove('blur');
      return new Promise(r=>this.done=r);
    }
    dist(t){
      const{v,Ta,Tc,Ts,endF}=this;
      if(t<Ta)return v*t*t/(2*Ta);
      if(t<=Tc||!Ts)return v*(Math.min(t,Tc)-Ta/2);
      const k=Math.min(t-Tc,Ts);return v*(Tc-Ta/2)+v*(k-(1-endF)*k*k/(2*Ts));
    }
    speed(t){const{Ta,Tc,Ts,endF}=this;if(t<Ta)return t/Ta;if(t<=Tc||!Ts)return 1;return 1-(1-endF)*Math.min(1,(t-Tc)/Ts)}
    hurry(now,extra){if(this.state==='spin'){const want=now+extra;if(!this.hurryAt||want<this.hurryAt)this.hurryAt=want}}
    update(now){
      if(this.state==='spin'){
        const h=this.h(),t=now-this.t0,W=110;
        if(t<W){this.setY(this.y0-h*.28*Math.sin(Math.PI*t/W));return}
        const tt=t-W,fin=tt>=this.dur||(this.hurryAt&&now>=this.hurryAt);
        const p=fin?1:this.dist(tt)/this.D;
        this.setY(this.y0+(this.y1+this.over-this.y0)*p);
        this.strip.classList.toggle('blur',!fin&&this.speed(tt)>.45&&tt>60);
        if(fin){this.state='bounce';this.tb=now;this.strip.classList.remove('blur');this.onStop&&this.onStop(this.i)}
      }else if(this.state==='bounce'){
        const t=(now-this.tb)/1000;
        if(t>.42){this.syms=this.final;this.render(this.final);this.place(1);this.state='idle';this.done&&this.done();return}
        this.setY(this.y1+this.over*Math.exp(-t*13)*Math.cos(t*28));
      }
    }
  }
  const reelEls=[...root.querySelectorAll('.reel')];
  const reels=reelEls.map((el,i)=>new Reel(el,i,i===3));

  /* ================= paytable ================= */
  const ROWS=[['R7',['R7','R7','R7']],['B3',['B3','B3','B3']],['G7',['G7','G7','G7']],['B2',['B2','B2','B2']],
              ['B7',['B7','B7','B7']],['B1',['B1','B1','B1']],['A7',['R7','G7','B7']],['AB',['B3','B2','B1']]];
  $('ptab').innerHTML=ROWS.map(([k,ic])=>`<div class="prow" data-k="${k}"><div class="ic">${ic.map(symSVG).join('')}</div><span class="v" data-v="${k}"></span></div>`).join('');
  function updatePay(){root.querySelectorAll('[data-v]').forEach(e=>e.textContent=fmtK(PAY[e.dataset.v]*bet()))}

  /* ================= ui ================= */
  ['bulbsT','bulbsB'].forEach(id=>$(id).innerHTML='<i></i>'.repeat(16));
  $('bonusleg').innerHTML=`${symSVG('X2')}${symSVG('X5')}${symSVG('X10')}<div style="margin-left:1cqw">คูณรางวัล<br><b>สูงสุด 10 เท่า</b></div><div class="sep"></div>${symSVG('RSP')}<div style="margin-left:1cqw">หมุนฟรี<br><b>1–5 รอบ</b></div>`;
  const spinBtn=$('spinBtn'),winVal=$('winVal'),reelWinEl=$('reelWin');
  function updateUI(){
    $('balVal').textContent=fmt(balance);$('betVal').textContent=fmtInt(bet());updatePay();
    const lock=busy||auto>0||respins>0;
    $('betDown').disabled=lock||betIdx===0;$('betUp').disabled=lock||betIdx===BETS.length-1;
    $('turboBtn').classList.toggle('on',turbo);
    $('autoBtn').classList.toggle('on',auto>0);const ac=$('autoCnt');ac.hidden=!auto;ac.textContent=auto>=999?'∞':auto;
    spinBtn.classList.toggle('ready',!busy&&!auto&&!respins);
    $('hint').textContent=spinning?'แตะเพื่อหยุดทันที':winPhase?'แตะเพื่อข้าม':auto?'แตะปุ่มอัตโนมัติเพื่อหยุด':'แตะเพื่อหมุน · กดค้างเพื่อเล่นอัตโนมัติ';
    const rt=$('respinTag');rt.classList.toggle('on',respins>0);rt.textContent=`หมุนฟรีเหลือ ${respins} รอบ`;
  }
  const sndIcon=on=>on?'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 4V5L7 9H3z"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>':'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 4V5L7 9H3z"/><path d="M16 9l6 6M22 9l-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  $('sndBtn').innerHTML=sndIcon(true);
  let toastT;function toast(msg){const t=$('toast');t.textContent=msg;t.classList.add('show');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('show'),2200)}
  function shake(){app.classList.remove('shake');void app.offsetWidth;app.classList.add('shake')}
  function flash(){const f=$('flash');f.classList.remove('go');void f.offsetWidth;f.classList.add('go')}
  function relRect(el){const a=app.getBoundingClientRect(),r=el.getBoundingClientRect();return{x:r.left-a.left+r.width/2,y:r.top-a.top+r.height/2,w:r.width,h:r.height}}

  /* ================= fx canvas ================= */
  const fx=$('fx'),fctx=fx.getContext('2d');let DPR=1,parts=[],coinRate=0;
  function resizeFx(){DPR=Math.min(2,window.devicePixelRatio||1);fx.width=app.clientWidth*DPR;fx.height=app.clientHeight*DPR;resizeFlame()}
  const coinImg=(()=>{const c=document.createElement('canvas');c.width=c.height=96;const x=c.getContext('2d');
    let g=x.createLinearGradient(0,0,96,96);g.addColorStop(0,'#fff6d0');g.addColorStop(.3,'#e9b949');g.addColorStop(.5,'#8a5a10');g.addColorStop(.7,'#d9a63a');g.addColorStop(1,'#fff0b8');
    x.fillStyle=g;x.beginPath();x.arc(48,48,46,0,7);x.fill();
    x.strokeStyle='#5e3c08';x.lineWidth=1.6;x.setLineDash([2,2.4]);x.beginPath();x.arc(48,48,44.5,0,7);x.stroke();x.setLineDash([]);
    g=x.createRadialGradient(40,34,4,48,48,38);g.addColorStop(0,'#fff3c4');g.addColorStop(.6,'#d39a2c');g.addColorStop(1,'#7a4e0c');
    x.fillStyle=g;x.beginPath();x.arc(48,48,36,0,7);x.fill();
    x.strokeStyle='#fff3c488';x.lineWidth=2;x.beginPath();x.arc(48,48,36,Math.PI*1.05,Math.PI*1.75);x.stroke();
    x.save();x.translate(48,49);x.beginPath();for(let i=0;i<10;i++){const r=i%2?9:21,a=-Math.PI/2+i*Math.PI/5;x.lineTo(Math.cos(a)*r,Math.sin(a)*r)}x.closePath();
    x.fillStyle='#7a4e0c';x.translate(1,1.5);x.fill();x.translate(-1,-1.5);x.fillStyle='#ffe9a0';x.fill();x.restore();
    return c})();
  const glowImg=(c1,c2)=>{const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d');const g=x.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,c1);g.addColorStop(.35,c2);g.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=g;x.fillRect(0,0,64,64);return c};
  const sparkImg=glowImg('#ffffff','rgba(255,210,80,.7)');
  function spawnCoin(fromTop){
    const W=fx.width/DPR,H=fx.height/DPR,s=Math.min(W,H);
    if(parts.length>420)return;
    if(fromTop)parts.push({t:'c',x:Math.random()*W,y:-30,vx:(Math.random()-.5)*80,vy:100+Math.random()*200,r:Math.random()*6,vr:6+Math.random()*10,s:s*(.035+Math.random()*.025),life:6});
    else parts.push({t:'c',x:W/2+(Math.random()-.5)*W*.2,y:H+20,vx:(Math.random()-.5)*W*1.1,vy:-(H*.9+Math.random()*H*.7),r:Math.random()*6,vr:6+Math.random()*12,s:s*(.035+Math.random()*.03),life:6});
  }
  function burst(x,y,n,colors){
    for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,v=120+Math.random()*420;
      parts.push({t:'s',x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-120,r:Math.random()*6,vr:(Math.random()-.5)*20,s:3+Math.random()*7,life:.6+Math.random()*.7,c:colors[i%colors.length]})}
    for(let i=0;i<n/2;i++){const a=Math.random()*Math.PI*2,v=60+Math.random()*260;parts.push({t:'g',x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,s:8+Math.random()*22,life:.4+Math.random()*.6})}
  }
  function stepFx(dt){
    const W=fx.width/DPR,H=fx.height/DPR;
    if(coinRate>0){let n=coinRate*dt;while(n>0){if(Math.random()<n)spawnCoin(coinRate>60&&Math.random()<.35);n-=1}}
    fctx.setTransform(DPR,0,0,DPR,0,0);fctx.clearRect(0,0,W,H);
    const g=H*1.4;
    for(let i=parts.length-1;i>=0;i--){const p=parts[i];p.life-=dt;
      if(p.life<=0||p.y>H+80){parts.splice(i,1);continue}
      p.vy+=(p.t==='g'?0:g)*dt*(p.t==='s'?.7:1);p.x+=p.vx*dt;p.y+=p.vy*dt;if(p.r!==undefined)p.r+=p.vr*dt;
      if(p.t==='c'){const sx=Math.cos(p.r);fctx.save();fctx.translate(p.x,p.y);fctx.scale(Math.max(.08,Math.abs(sx)),1);
        fctx.globalAlpha=Math.min(1,p.life*2);fctx.filter=sx<0?'brightness(.7)':'none';fctx.drawImage(coinImg,-p.s,-p.s,p.s*2,p.s*2);fctx.restore();
        if(Math.random()<.02)parts.push({t:'g',x:p.x,y:p.y,vx:0,vy:0,s:10,life:.25})}
      else if(p.t==='s'){fctx.save();fctx.translate(p.x,p.y);fctx.rotate(p.r);fctx.globalAlpha=Math.min(1,p.life*2);fctx.fillStyle=p.c;
        fctx.beginPath();fctx.moveTo(0,-p.s);fctx.lineTo(p.s*.7,p.s*.6);fctx.lineTo(-p.s*.6,p.s*.4);fctx.closePath();fctx.fill();fctx.restore()}
      else{fctx.globalCompositeOperation='lighter';fctx.globalAlpha=Math.min(1,p.life*2);fctx.drawImage(sparkImg,p.x-p.s,p.y-p.s,p.s*2,p.s*2);fctx.globalCompositeOperation='source-over'}
    }
    fctx.globalAlpha=1;fctx.filter='none';
  }

  /* ================= flame ================= */
  const flame=$('flame'),flctx=flame.getContext('2d');let flames=[];
  const flameImg=glowImg('rgba(255,240,180,1)','rgba(255,110,0,.55)');
  function resizeFlame(){const r=flame.getBoundingClientRect();flame.width=r.width*DPR;flame.height=r.height*DPR}
  function stepFlame(dt){
    const W=flame.width,H=flame.height;if(!W)return;
    const rate=game.classList.contains('winning')?9:5;
    for(let k=0;k<rate;k++)flames.push({x:Math.random()*W,y:H+10,vy:-(H*.35+Math.random()*H*.6),vx:(Math.random()-.5)*W*.03,s:W*(.025+Math.random()*.04),life:1});
    flctx.clearRect(0,0,W,H);flctx.globalCompositeOperation='lighter';
    for(let i=flames.length-1;i>=0;i--){const p=flames[i];p.life-=dt*1.1;p.y+=p.vy*dt;p.x+=p.vx*dt+Math.sin(p.y*.05)*.6;p.s*=1-dt*.6;
      if(p.life<=0){flames.splice(i,1);continue}flctx.globalAlpha=p.life*.42;flctx.drawImage(flameImg,p.x-p.s,p.y-p.s*1.4,p.s*2,p.s*2.8)}
    flctx.globalAlpha=1;
  }

  /* ================= main loop ================= */
  let last=performance.now(),tickAcc=0;
  function loop(now){
    if(dead)return;
    const dt=Math.min(.05,(now-last)/1000);last=now;
    reels.forEach(r=>r.update(now));
    if(spinning){tickAcc+=dt;if(tickAcc>.07){tickAcc=0;SND.tick()}}
    stepFx(dt);stepFlame(dt);
    requestAnimationFrame(loop);
  }

  /* ================= game flow ================= */
  function evaluate(c){
    const[a,b,d]=c;
    if(a===b&&b===d&&a!=='BL')return a;
    if(c.every(isSeven))return'A7';
    if(c.every(isBar))return'AB';
    return null;
  }
  function clearWin(){
    root.querySelectorAll('.cell.win').forEach(e=>e.classList.remove('win'));
    root.querySelectorAll('.prow.hit').forEach(e=>e.classList.remove('hit'));
    reelEls.forEach(e=>e.classList.remove('hl','antic'));$('reels').classList.remove('dim');
    $('payline').classList.remove('on');game.classList.remove('winning');
    reelWinEl.classList.remove('show');reelWinEl.textContent='';$('winbar').classList.remove('hot');
  }
  let stopAntic=null;
  async function spin(){
    if(dead)return;
    SND.init();
    if(spinning){quickStop();return}
    if(winPhase){skip=true;return}
    if(busy)return;
    const free=respins>0;
    if(!free&&balance<bet()){auto=0;updateUI();toast(host?'ยอดเงินไม่พอ ลดเดิมพันหรือฝากเงิน':'ยอดเงินไม่พอ ลดเดิมพันหรือรีเซ็ตเครดิตในเมนู');return}
    busy=true;
    let out;
    if(host){
      try{out=await host.call('spin',{bet:bet()})}
      catch(e){busy=false;auto=0;updateUI();toast(e&&e.message==='insufficient_balance'?'ยอดเงินไม่พอ':'เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ');return}
      if(dead)return;
      if(out.free)respins=Math.max(0,out.respinsLeft-out.award);else balance-=out.bet;
    }else{
      if(!free)balance-=bet();else respins--;
      const r0=[pick(W_MAIN),pick(W_MAIN),pick(W_MAIN),pick(W_BONUS)];
      out={res:r0,award:r0[3]==='RSP'?1+Math.floor(Math.random()*5):0,bet:bet(),wager:free?0:bet()};
    }
    spinning=true;skip=false;clearWin();winVal.textContent='0.00';
    spinBtn.classList.add('spinning');updateUI();SND.spinStart();

    const res=out.res;
    const base=turbo?450:1150,gap=turbo?130:360,now=performance.now();
    const cruise=[0,1,2,3].map(i=>base+i*gap),slow=[0,0,0,0];
    const antic=[false,false,false,true];
    // 7-7 on the first two reels: the third reel crawls in too
    if(isSeven(res[0])&&isSeven(res[1])){antic[2]=true;cruise[2]=cruise[1];slow[2]=turbo?900:2200}
    // last (bonus) reel always teases: keeps spinning, then slows to a crawl after reel 3 lands
    cruise[3]=cruise[2]+slow[2];slow[3]=turbo?900:2600;
    reels.forEach(r=>r.onStop=i=>{
      if(stopAntic){stopAntic();stopAntic=null}
      reelEls[i].classList.remove('antic');
      if(i===3)SND.bonusStop();else SND.stop(i);
      const nx=i+1;if(nx<4&&antic[nx]&&reels[nx].state==='spin'){reelEls[nx].classList.add('antic');stopAntic=SND.anticStart()}
      if(reels.every(r=>r.state!=='spin'))spinning=false;
    });
    await Promise.all(reels.map((r,i)=>r.start(res[i],cruise[i],now,slow[i])));
    spinning=false;spinBtn.classList.remove('spinning');
    await resolveSpin(res,out);
  }
  function quickStop(){const now=performance.now();reels.forEach((r,i)=>r.hurry(now,40+i*70));if(stopAntic){stopAntic();stopAntic=null}}

  async function resolveSpin(res,out){
    const B=out.bet;
    const row=evaluate(res.slice(0,3)),b=res[3];
    const baseWin=row?PAY[row]*B:0,m=MULT[b]||1,total=baseWin*m;
    let award=out.award;
    if(total>0){
      winPhase=true;updateUI();game.classList.add('winning');
      $('payline').classList.add('on');$('reels').classList.add('dim');
      const cells=[0,1,2].map(i=>reels[i].center());cells.forEach((c,i)=>{c.classList.add('win');reelEls[i].classList.add('hl')});
      if(m>1){reels[3].center().classList.add('win');reelEls[3].classList.add('hl')}
      root.querySelector(`.prow[data-k="${row}"]`).classList.add('hit');
      cells.forEach(c=>{const r=relRect(c);burst(r.x,r.y,18,['#ffe7a8','#ffffff','#e0a63a','#fff3c8'])});
      SND.win();
      const tier=TIERS.filter(t=>total>=t*B).length;
      await countReel(0,baseWin,tier?650:Math.min(2200,600+baseWin/B*120));
      if(m>1&&!skip)await multiplierHit(m,baseWin,total,tier?500:900);
      else if(m>1)setReelWin(total);
      if(tier){await wait(skip?0:350);await bigWin(total,tier)}
      else await wait(skip?150:900);
      balance+=total;winVal.textContent=fmt(total);$('winbar').classList.add('hot');
      winPhase=false;
    }else{
      if(b!=='RSP')SND.lose();
    }
    if(award){respins+=award;await showBanner(`RESPIN ×${award}`,'หมุนฟรี ไม่หักเงิน')}
    if(host)host.round(out.wager,total);
    busy=false;updateUI();
    if(respins>0)setTimeout(spin,turbo?250:600);
    else if(auto>0){auto--;updateUI();if(auto>0)setTimeout(()=>{if(auto>0&&!busy)spin()},turbo?250:550)}
  }
  function setReelWin(v){reelWinEl.textContent=fmtInt(v);winVal.textContent=fmt(v)}
  function countReel(from,to,dur){
    return new Promise(res=>{
      reelWinEl.classList.add('show');const t0=performance.now();let lastC=0;
      const f=now=>{const u=skip?1:Math.min(1,(now-t0)/dur);const e=1-Math.pow(1-u,3);setReelWin(from+(to-from)*e);
        if(now-lastC>70&&u<1){lastC=now;SND.coin()}
        if(u<1)requestAnimationFrame(f);else{reelWinEl.classList.remove('bump');void reelWinEl.offsetWidth;reelWinEl.classList.add('bump');res()}};
      requestAnimationFrame(f);
    });
  }
  async function multiplierHit(m,from,to,dur){
    const src=relRect(reels[3].center()),dst=relRect(reelWinEl);
    const el=document.createElement('span');el.className='metal multFly';el.textContent='×'+m;
    el.style.left=(src.x)+'px';el.style.top=(src.y)+'px';el.style.translate='-50% -50%';
    el.style.setProperty('--dx',(dst.x-src.x)+'px');el.style.setProperty('--dy',(dst.y-src.y)+'px');
    el.style.fontSize=getComputedStyle(reelWinEl).fontSize;
    app.appendChild(el);void el.offsetWidth;el.classList.add('go');
    await wait(380);SND.mult();shake();flash();burst(dst.x,dst.y,45,['#ffe7a8','#fff','#e0a63a','#ff9a3a']);
    await wait(200);el.remove();
    await countReel(from,to,dur);
  }
  function showBanner(txt,sub){
    $('bannerTxt').textContent=txt;$('bannerSub').textContent=sub;const b=$('banner');
    b.classList.remove('go');void b.offsetWidth;b.classList.add('go');SND.respin();
    const r=relRect(b);burst(r.x,r.y,36,['#ffe7a8','#fff','#e0a63a']);
    return wait(1900);
  }

  /* ================= big win ================= */
  const bigEl=$('big'),tierEl=$('tier'),amtEl=$('amt');
  function setTier(t,anim=true){
    bigEl.classList.remove('t1','t2','t3');bigEl.classList.add('t'+t);
    tierEl.innerHTML=TIER_NAMES[t].replace('\n','<br>');
    if(anim){tierEl.classList.remove('slam');void tierEl.offsetWidth;tierEl.classList.add('slam');SND.slam();SND.fanfare(t);shake();flash();
      const r=relRect(tierEl);burst(r.x,r.y,60,['#ffe7a8','#fff','#e0a63a','#fff3c8'])}
    coinRate=[0,14,26,42][t];
  }
  function bigWin(total,finalTier){
    return new Promise(resolve=>{
      skip=false;bigEl.classList.add('show');$('bigHint').textContent='แตะเพื่อข้าม';amtEl.classList.remove('done');
      let cur=1;setTier(1);
      const dur=(turbo?.6:1)*[0,4200,6500,9000][finalTier];const t0=performance.now();let lastC=0,finished=false,closeT;
      const bet0=bet();
      const close=()=>{if(!finished)return;clearTimeout(closeT);bigEl.removeEventListener('pointerdown',onTap);coinRate=0;bigEl.classList.remove('show');resolve()};
      const onTap=e=>{e.stopPropagation();SND.init();if(!finished)skip=true;else close()};
      bigEl.addEventListener('pointerdown',onTap);
      const f=now=>{
        const u=skip?1:Math.min(1,(now-t0)/dur);
        const e=u<.88?u/.88*.965:.965+.035*(1-Math.pow(1-(u-.88)/.12,2));
        const v=total*e;amtEl.textContent=fmt(v);
        const reached=TIERS.filter(t=>v>=t*bet0-1e-9).length;
        if(reached>cur&&cur<finalTier){cur=Math.min(reached,finalTier);setTier(cur);amtEl.classList.remove('pulse');void amtEl.offsetWidth;amtEl.classList.add('pulse')}
        if(now-lastC>(cur===3?45:65)&&u<1){lastC=now;SND.coin()}
        if(u<1){requestAnimationFrame(f);return}
        amtEl.textContent=fmt(total);
        if(cur<finalTier){cur=finalTier;setTier(cur)}
        finished=true;amtEl.classList.add('done');SND.finale();shake();flash();
        const r=relRect(amtEl);burst(r.x,r.y,70,['#ffe7a8','#fff','#e0a63a','#fff3c8']);
        coinRate=[0,8,16,28][finalTier];$('bigHint').textContent='แตะเพื่อเก็บรางวัล';
        closeT=setTimeout(close,3800);
      };
      requestAnimationFrame(f);
    });
  }

  /* ================= controls ================= */
  let holdT,held=false;
  spinBtn.addEventListener('pointerdown',()=>{held=false;holdT=setTimeout(()=>{if(!busy&&!auto){held=true;SND.init();SND.click();openAuto()}},550)},SIG);
  ['pointerup','pointerleave','pointercancel'].forEach(ev=>spinBtn.addEventListener(ev,()=>clearTimeout(holdT),SIG));
  spinBtn.addEventListener('click',()=>{if(held){held=false;return}if(auto>0&&!busy){auto=0;updateUI();return}spin()},SIG);
  $('reels').addEventListener('pointerdown',()=>{if(spinning)quickStop();else if(winPhase)skip=true},SIG);
  $('betDown').onclick=()=>{SND.init();SND.click();if(betIdx>0)betIdx--;updateUI()};
  $('betUp').onclick=()=>{SND.init();SND.click();if(betIdx<BETS.length-1)betIdx++;updateUI()};
  $('turboBtn').onclick=()=>{SND.init();SND.click();turbo=!turbo;updateUI();toast(turbo?'หมุนเร็ว: เปิด':'หมุนเร็ว: ปิด')};
  $('autoBtn').onclick=()=>{SND.init();SND.click();if(auto>0){auto=0;updateUI();toast('หยุดเล่นอัตโนมัติแล้ว')}else openAuto()};
  $('sndBtn').onclick=()=>{SND.init();SND.setOn(!SND.on);$('sndBtn').innerHTML=sndIcon(SND.on)};
  $('infoBtn').onclick=()=>{SND.init();SND.click();$('infoModal').classList.add('show')};
  $('closeInfo').onclick=()=>{SND.click();$('infoModal').classList.remove('show')};
  if(host)$('resetBtn').style.display='none';
  $('resetBtn').onclick=()=>{if(host)return;if(busy)return;balance=10000;respins=0;auto=0;updateUI();$('infoModal').classList.remove('show');toast('รีเซ็ตเครดิตเป็น 10,000.00 แล้ว')};
  $('autoGrid').innerHTML=[10,25,50,100,500,999].map(n=>`<button class="pbtn" data-n="${n}">${n===999?'ไม่จำกัด':n+' รอบ'}</button>`).join('');
  $('autoGrid').onclick=e=>{const n=+e.target.dataset.n;if(!n)return;SND.click();auto=n;$('autoModal').classList.remove('show');updateUI();if(!busy)spin()};
  $('closeAuto').onclick=()=>{SND.click();$('autoModal').classList.remove('show')};
  function openAuto(){$('autoModal').classList.add('show')}
  document.addEventListener('keydown',e=>{if(e.code==='Space'&&!root.querySelector('.modal.show')){e.preventDefault();if(bigEl.classList.contains('show'))bigEl.dispatchEvent(new PointerEvent('pointerdown'));else spin()}},SIG);
  window.addEventListener('resize',()=>{resizeFx();reels.forEach(r=>{if(r.state==='idle'){r.render(r.syms);r.place(1)}})},SIG);

  /* ================= gold press effect ================= */
  root.querySelectorAll('.cbtn,.spin,.hbtn').forEach(btn=>{
    btn.addEventListener('pointerdown',()=>{
      if(btn.disabled)return;
      const r=relRect(btn);
      const ring=document.createElement('span');ring.className='pressRing';
      ring.style.left=r.x+'px';ring.style.top=r.y+'px';ring.style.setProperty('--w',r.w+'px');ring.style.setProperty('--h',r.h+'px');
      app.appendChild(ring);setTimeout(()=>ring.remove(),600);
      btn.classList.remove('pressFill');void btn.offsetWidth;btn.classList.add('pressFill');
      burst(r.x,r.y,btn.classList.contains('spin')?26:12,['#ffe7a8','#fff6d0','#e0a63a','#ffc04a']);
    },SIG);
  });

  /* ================= boot ================= */
  resizeFx();updateUI();
  document.fonts&&document.fonts.ready.then(()=>!dead&&reels.forEach(r=>{if(r.state==='idle'){r.render(r.syms);r.place(1)}}));
  requestAnimationFrame(loop);
  // keep the meter in step with the shared wallet while idle; resume respins the server still owes
  const syncT=host?setInterval(()=>{if(!busy&&!spinning&&!winPhase&&respins===0){const b=host.getBalance();if(Math.abs(b-balance)>0.004){balance=b;updateUI()}}},400):0;
  if(host)host.state().then(s=>{if(dead||!s||!(s.respins>0))return;respins=s.respins;const i=BETS.indexOf(s.bet);if(i>=0)betIdx=i;updateUI();setTimeout(()=>{if(!dead&&!busy)spin()},700)});

  /* ================= teardown ================= */
  return()=>{
    dead=true;ac.abort();clearInterval(syncT);
    if(stopAntic)stopAntic();
    clearInterval(SND.musicTimer);
    try{SND.ctx&&SND.ctx.close()}catch(e){}
  };
}

export default function Inferno7s({ height = "100%", host }) {
  const rootRef = useRef(null);
  useEffect(() => initGame(rootRef.current, host), []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="i7root" ref={rootRef} style={{ height }}>
      <style>{CSS}</style>
      <div id="app">
        <div className="game" id="game">
          <header className="top">
            <canvas id="flame"></canvas>
            <button className="hbtn" id="infoBtn" aria-label="กติกาและการตั้งค่า"><svg viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="5.5" width="16" height="2.4" rx="1.2"/><rect x="4" y="10.8" width="16" height="2.4" rx="1.2"/><rect x="4" y="16.1" width="16" height="2.4" rx="1.2"/></svg></button>
            <button className="hbtn" id="sndBtn" aria-label="เปิดหรือปิดเสียง"></button>
            <div className="marquee">
              <div className="bulbs t" id="bulbsT"></div>
              <h1 className="logo">INFERNO 7s</h1>
              <div className="bulbs b" id="bulbsB"></div>
            </div>
          </header>
      
          <section className="pay" aria-label="ตารางรางวัล">
            <div className="ptab" id="ptab"></div>
            <div className="bonusleg" id="bonusleg"></div>
          </section>
      
          <section className="machine">
            <i className="mark l"></i><i className="mark r"></i>
            <div className="reels" id="reels">
              <div className="reel"><div className="strip"></div></div>
              <div className="reel"><div className="strip"></div></div>
              <div className="reel"><div className="strip"></div></div>
              <div className="reel bonus"><div className="strip"></div></div>
              <div className="payline" id="payline"></div>
              <div className="glass"></div>
              <div className="reelWin"><span className="metal" id="reelWin"></span></div>
              <div className="banner" id="banner"><span className="metal" id="bannerTxt">RESPIN ×3</span><small id="bannerSub">หมุนฟรี</small></div>
              <div className="respinTag" id="respinTag"></div>
            </div>
          </section>
      
          <section className="meters">
            <div className="lcd"><span>ยอดเงิน</span><b id="balVal">0.00</b></div>
            <div className="lcd win" id="winbar"><span>ชนะ</span><b id="winVal">0.00</b></div>
            <div className="lcd"><span>เดิมพัน</span><b id="betVal">0</b></div>
          </section>
      
          <section className="controls">
            <div className="btns">
              <button className="cbtn" id="turboBtn" aria-label="หมุนเร็ว"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M13.5 2 L4 14 h6.5 L9 22 L20 9.5 h-6.8 Z"/></svg></button>
              <button className="cbtn" id="betDown" aria-label="ลดเดิมพัน"><svg viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="10.6" width="16" height="2.8" rx="1.4"/></svg></button>
              <button className="spin ready" id="spinBtn" aria-label="หมุน">
                <svg viewBox="0 0 100 100">
                  <defs><linearGradient id="gSpin" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffffff"/><stop offset=".45" stopColor="#f3d27a"/><stop offset=".55" stopColor="#b98a2c"/><stop offset="1" stopColor="#fff3c8"/></linearGradient></defs>
                  <path d="M76 32 A31 31 0 1 0 81 56" fill="none" stroke="url(#gSpin)" strokeWidth="9" strokeLinecap="round"/>
                  <path d="M84 14 L83 41 L57 34 Z" fill="url(#gSpin)" strokeLinejoin="round" stroke="#f3d27a" strokeWidth="2"/>
                </svg>
              </button>
              <button className="cbtn" id="betUp" aria-label="เพิ่มเดิมพัน"><svg viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="10.6" width="16" height="2.8" rx="1.4"/><rect x="10.6" y="4" width="2.8" height="16" rx="1.4"/></svg></button>
              <button className="cbtn" id="autoBtn" aria-label="เล่นอัตโนมัติ"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M19 8 A8 8 0 1 0 20 14"/><path d="M20 3 v5.5 h-5.5"/></svg><span className="cnt" id="autoCnt" hidden></span></button>
            </div>
            <span className="hint" id="hint">แตะเพื่อหมุน</span>
          </section>
        </div>
      
        <div className="big" id="big" role="dialog" aria-label="รางวัลใหญ่">
          <div className="rays"></div><div className="rays r2"></div>
          <div className="bigInner">
            <div className="tier" id="tier">BIG WIN</div>
            <div className="tierLine"></div>
            <div className="amtBox"><span className="amt" id="amt">0</span></div>
            <div className="metal bigMult" id="bigMult"></div>
          </div>
          <div className="bigHint" id="bigHint">แตะเพื่อข้าม</div>
        </div>
        <div className="flash" id="flash"></div>
        <canvas id="fx"></canvas>
      
        <div className="modal" id="infoModal">
          <div className="panel">
            <h2>วิธีเล่น</h2>
            <p>มีไลน์รางวัลเดียวพาดกลางวงล้อ เรียงสัญลักษณ์บนไลน์ให้ครบ 3 ช่องตามตารางรางวัลด้านบน ตัวเลขในตารางคือเงินรางวัลที่เดิมพันปัจจุบัน</p>
            <h3>วงล้อโบนัส (ช่องที่ 4)</h3>
            <p>ถ้าชนะบนไลน์และวงล้อที่ 4 หยุดที่ 2x, 5x หรือ 10x รางวัลจะถูกคูณตามนั้น ถ้าหยุดที่ RESPIN จะได้หมุนฟรี 1–5 รอบโดยไม่หักเงิน</p>
            <h3>รางวัลใหญ่</h3>
            <p>ชนะตั้งแต่ 10 เท่าของเดิมพัน BIG WIN, 25 เท่า MEGA WIN, 50 เท่า SUPER MEGA WIN</p>
            <h3>ปุ่ม</h3>
            <p>Space หมุน/หยุดเร็ว · แตะปุ่มหมุนขณะวงล้อหมุนเพื่อหยุดทันที · กดปุ่มหมุนค้างเพื่อเล่นอัตโนมัติ · แตะจอขณะนับรางวัลเพื่อข้าม</p>
            <p style={{opacity:.65,fontSize:13}}>เกมนี้ใช้เครดิตจำลองเพื่อความบันเทิงเท่านั้น ไม่มีเงินจริง</p>
            <div className="row">
              <button className="pbtn alt" id="resetBtn">รีเซ็ตเครดิต</button>
              <button className="pbtn" id="closeInfo">กลับไปเล่น</button>
            </div>
          </div>
        </div>
        <div className="modal" id="autoModal">
          <div className="panel">
            <h2>เล่นอัตโนมัติ</h2>
            <p>เลือกจำนวนรอบ ระบบจะหยุดเองเมื่อยอดเงินไม่พอ</p>
            <div className="autoGrid" id="autoGrid"></div>
            <div className="row"><button className="pbtn alt" id="closeAuto">ยกเลิก</button></div>
          </div>
        </div>
        <div className="toast" id="toast"></div>
      </div>
    </div>
  );
}
