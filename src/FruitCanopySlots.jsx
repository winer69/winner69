/**
 * Fruit Canopy — PG-style 5x3 video slot as a single React component.
 *
 * Usage:
 *   import FruitCanopySlots from "./FruitCanopySlots";
 *   <div style={{ height: "100vh" }}><FruitCanopySlots /></div>
 *
 * Props (optional):
 *   brand      gold title text shown in the 3-second intro (default "WINNER 69")
 *
 * The component fills its parent (give the parent a height). It has no
 * dependencies besides React; all art is drawn procedurally on canvas/SVG,
 * sounds are synthesized with Web Audio, fonts load from Google Fonts.
 * Credits are simulated — no real money involved.
 */
// Imported into WINNER 69: credits come from the shared wallet and every spin (incl. free spins)
// is decided by backend/src/extraGames.js - on the server, or locally without one.
import { useEffect, useRef } from "react";

const CSS = `@import url('https://fonts.googleapis.com/css2?family=Lilita+One&family=Kanit:wght@500;700&display=swap');

.fc-root{
  position:relative;width:100%;height:100%;min-height:560px;box-sizing:border-box;overflow:hidden;background:var(--page);color:var(--ink);font-family:var(--body);
  -webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent;touch-action:manipulation;
  padding-top:env(safe-area-inset-top,0px);
  padding-bottom:env(safe-area-inset-bottom,0px);
  --night:#04140c; --leaf:#1d6b34; --lime:#a6ff4d; --gold:#ffd54a; --amber:#ff9a1a;
  --wood:#7a4520; --wood-dk:#3a1d0a; --ink:#fff6dc; --muted:#9fc7a8;
  --disp:'Lilita One','Kanit',system-ui,sans-serif;
  --body:'Kanit','Lilita One',system-ui,sans-serif;
  --page:#020a06;
}
.fc-root *,.fc-root *::before,.fc-root *::after{box-sizing:inherit}

.fc-root button{font:inherit;color:inherit;background:none;border:0;padding:0;cursor:pointer}
.fc-root button:focus-visible{outline:3px solid var(--gold);outline-offset:3px;border-radius:50%}

.fc-root #app{position:relative;height:100%;max-width:520px;margin:0 auto;display:flex;flex-direction:column;overflow:hidden;
  background:linear-gradient(#06231a 0%,#04160d 55%,#020b06 100%)}

.fc-root /* ---------- HEADER / CANOPY ---------- */
#top{position:relative;flex:1 1 auto;min-height:150px;overflow:hidden;
  background:
    radial-gradient(120% 70% at 50% 0%,#1b5d7a 0%,#0f3a4e 35%,transparent 70%),
    radial-gradient(80% 60% at 15% 30%,#123f58 0%,transparent 70%),
    linear-gradient(#0b2a3c,#08251a 80%,#05180f);
  transition:filter .8s}
.fc-root #app.fs #top{filter:hue-rotate(55deg) saturate(1.25)}
.fc-root .canopy{position:absolute;inset:0;pointer-events:none}
.fc-root .canopy svg{position:absolute;width:100%;height:100%}
.fc-root .sway{transform-origin:50% 0;animation:sway 6s ease-in-out infinite}
.fc-root .sway.b{animation-duration:7.5s;animation-delay:-2s}
@keyframes sway{0%,100%{transform:rotate(-1.4deg)}50%{transform:rotate(1.4deg)}}
.fc-root .firefly{position:absolute;width:5px;height:5px;border-radius:50%;background:#e9ff9a;box-shadow:0 0 8px 3px rgba(200,255,120,.6);opacity:0;animation:fly 7s linear infinite}
@keyframes fly{0%{opacity:0;transform:translate(0,0)}15%{opacity:.9}50%{transform:translate(18px,-26px)}85%{opacity:.8}100%{opacity:0;transform:translate(-10px,-55px)}}

.fc-root #logo{position:absolute;left:50%;top:44%;transform:translate(-50%,-50%);text-align:center;line-height:.82;white-space:nowrap;animation:logoBob 4s ease-in-out infinite;z-index:3}
@keyframes logoBob{0%,100%{transform:translate(-50%,-50%) scale(1)}50%{transform:translate(-50%,-53%) scale(1.02)}}
.fc-root #logo .l1,.fc-root #logo .l2{display:block;font-family:var(--disp);letter-spacing:.02em;
  background:linear-gradient(#fff7c2 0%,#ffd84a 38%,#ff9a1a 62%,#c94f06 100%);-webkit-background-clip:text;background-clip:text;color:transparent;
  -webkit-text-stroke:2px #4a1f05;filter:drop-shadow(0 3px 0 #2b1003) drop-shadow(0 6px 10px rgba(0,0,0,.55))}
.fc-root #logo .l1{font-size:clamp(26px,8.5vw,40px);transform:rotate(-4deg)}
.fc-root #logo .l2{font-size:clamp(34px,11vw,54px);transform:rotate(-2deg)}
.fc-root #logo .berry{position:absolute;width:22px;height:22px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#ffb3b3,#e3162b 45%,#6b0010);right:-14px;top:-6px;box-shadow:0 2px 4px rgba(0,0,0,.5)}
.fc-root #peek{position:absolute;width:74px;height:74px;right:13%;top:22%;z-index:2;animation:peek 9s ease-in-out infinite}
@keyframes peek{0%,55%,100%{transform:translate(40px,30px) rotate(20deg);opacity:0}62%,88%{transform:translate(0,0) rotate(-6deg);opacity:1}75%{transform:translate(0,-4px) rotate(4deg)}}

.fc-root #plank{position:absolute;left:4%;right:4%;bottom:8px;height:42px;z-index:4;border-radius:8px;
  background:
    repeating-linear-gradient(90deg,rgba(0,0,0,.0) 0 22px,rgba(0,0,0,.12) 22px 24px),
    linear-gradient(#a0602c,#7a4520 45%,#4f2a10);
  box-shadow:inset 0 2px 0 rgba(255,220,160,.35),inset 0 -3px 0 rgba(0,0,0,.4),0 4px 10px rgba(0,0,0,.6);
  overflow:hidden;display:flex;align-items:center;justify-content:center}
.fc-root #plank::before{content:"";position:absolute;left:-2%;right:-2%;top:-6px;height:14px;
  background:radial-gradient(circle at 6px 8px,#6ed13c 5px,transparent 6px) 0 0/18px 14px,radial-gradient(circle at 12px 5px,#2d8a2a 6px,transparent 7px) 0 0/23px 14px}
.fc-root #plankWin{font-family:var(--disp);font-size:22px;color:var(--gold);text-shadow:0 2px 0 #3a1500,0 0 10px rgba(255,200,60,.4);display:none;align-items:baseline;gap:10px}
.fc-root #plankWin small{font-size:15px;color:#ffe9b0}
.fc-root #plankWin.pop{animation:pop .35s ease-out}
@keyframes pop{0%{transform:scale(.6)}60%{transform:scale(1.18)}100%{transform:scale(1)}}
.fc-root #marq{position:absolute;white-space:nowrap;font-family:var(--body);font-weight:700;font-size:15px;color:#ffe9b0;text-shadow:0 2px 0 #3a1500;animation:marq 13s linear infinite}
@keyframes marq{from{transform:translateX(105%)}to{transform:translateX(-105%)}}
.fc-root #plank.win #marq{display:none}
.fc-root #plank.win #plankWin{display:flex}
.fc-root #plank.flash{animation:plankFlash .6s}
@keyframes plankFlash{50%{filter:brightness(1.7)}}
.fc-root .flowers{position:absolute;bottom:2px;width:58px;height:58px;z-index:5;opacity:0;transform:scale(.2);transition:opacity .25s,transform .35s cubic-bezier(.3,1.8,.5,1);pointer-events:none}
.fc-root .flowers.l{left:-6px}.fc-root .flowers.r{right:-6px}
.fc-root #app.bigLine .flowers{opacity:1;transform:scale(1)}

.fc-root #mute{position:absolute;left:10px;top:8px;z-index:6;width:34px;height:34px;border-radius:50%;background:rgba(0,0,0,.35);display:grid;place-items:center}
.fc-root #mute svg{width:20px;height:20px}

.fc-root /* ---------- REELS ---------- */
#reelBox{position:relative;flex:0 0 auto;display:flex;justify-content:center;
  background:radial-gradient(ellipse 70% 60% at 50% 45%,#123a22 0%,#081d12 60%,#03100a 100%)}
.fc-root #app.fs #reelBox{background:radial-gradient(ellipse 70% 60% at 50% 45%,#2a1f4a 0%,#120c26 60%,#07041a 100%)}
.fc-root #reels{display:block}
.fc-root #grass{position:relative;flex:0 0 44px;margin-top:-22px;z-index:2;pointer-events:none}
.fc-root #grass svg{width:100%;height:100%;display:block}

.fc-root /* ---------- INFO BAR ---------- */
#info{flex:0 0 50px;padding-top:10px !important;display:grid;grid-template-columns:auto 1fr 1fr 1fr auto;align-items:center;gap:6px;padding:0 10px;background:linear-gradient(#05150c,#020a06)}
.fc-root .pill{height:28px;border-radius:14px;background:rgba(255,255,255,.06);box-shadow:inset 0 1px 0 rgba(255,255,255,.08);display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:14px;font-weight:700;line-height:1;position:relative;font-variant-numeric:tabular-nums}
.fc-root .pill small{position:absolute;top:-12px;font-size:10px;color:var(--muted);font-weight:500;line-height:1}
.fc-root #winPill{color:var(--gold)}
.fc-root .ic{width:28px;height:28px;display:grid;place-items:center;color:#cfe8d4}
.fc-root .ic svg{width:20px;height:20px}

.fc-root /* ---------- CONTROLS ---------- */
#ctrl{flex:0 0 120px;display:flex;align-items:center;justify-content:space-evenly;padding:0 6px 6px;position:relative;
  background:radial-gradient(ellipse 60% 70% at 50% 60%,#0d2c18 0%,#020a06 75%)}
.fc-root .cbtn{width:42px;height:42px;border-radius:50%;display:grid;place-items:center;color:#d6efd9;transition:transform .12s,color .2s,box-shadow .2s}
.fc-root .cbtn svg{width:24px;height:24px}
.fc-root .cbtn:active{transform:scale(.88)}
.fc-root .cbtn.on{color:var(--gold);box-shadow:0 0 14px rgba(255,210,70,.6)}
.fc-root .cbtn:disabled{opacity:.35}
.fc-root #spin{position:relative;width:96px;height:96px;border-radius:50%;
  background:radial-gradient(circle at 50% 40%,#3d8f2c 0%,#1d5a1c 55%,#0b2d0c 100%);
  box-shadow:0 0 0 5px #6fbf3a,0 0 0 8px #1e4a14,0 0 22px 6px rgba(140,255,90,.35),inset 0 -8px 14px rgba(0,0,0,.5);
  display:grid;place-items:center;transition:box-shadow .25s,transform .1s}
.fc-root #spin:active{transform:scale(.93)}
.fc-root #spin svg:not(.leafring){width:52px;height:52px;filter:drop-shadow(0 3px 2px rgba(0,0,0,.5))}
.fc-root #spin.spinning{box-shadow:0 0 0 5px #ffd54a,0 0 0 8px #7a4a05,0 0 34px 12px rgba(255,210,70,.6),inset 0 -8px 14px rgba(0,0,0,.4);
  background:radial-gradient(circle at 50% 40%,#ffe56a 0%,#e09a10 55%,#7a3f00 100%)}
.fc-root #spin.spinning svg:not(.leafring){animation:rot .45s linear infinite}
.fc-root #spin.spinning .leafring{filter:drop-shadow(0 0 4px rgba(255,220,80,.8))}
@keyframes rot{to{transform:rotate(360deg)}}
.fc-root #spin .leafring{position:absolute;left:-14px;top:-14px;width:124px;height:124px;pointer-events:none;overflow:visible}
.fc-root #autoCount{position:absolute;font-size:10px;bottom:-2px;left:50%;transform:translateX(-50%);color:var(--gold);font-weight:700}


.fc-root /* ---------- CENTER WIN POP ---------- */
#winPop{position:absolute;left:50%;top:50%;z-index:15;pointer-events:none;display:none;flex-direction:column;align-items:center;transform:translate(-50%,-50%)}
.fc-root #winPop.show{display:flex;animation:wpIn .55s cubic-bezier(.2,1.7,.4,1) both}
.fc-root #winPop.out{animation:wpOut .4s ease-in forwards}
@keyframes wpIn{0%{transform:translate(-50%,-50%) scale(.1) rotate(-12deg);opacity:0}70%{opacity:1}100%{transform:translate(-50%,-50%) scale(1)}}
@keyframes wpOut{to{transform:translate(-50%,-50%) scale(1.5);opacity:0;filter:blur(4px)}}
.fc-root #winPop .wpRays{position:absolute;left:50%;top:50%;width:420px;height:420px;margin:-210px 0 0 -210px;border-radius:50%;
  background:repeating-conic-gradient(rgba(255,220,90,.55) 0deg 8deg,transparent 8deg 24deg);
  -webkit-mask:radial-gradient(circle,#000 10%,transparent 65%);mask:radial-gradient(circle,#000 10%,transparent 65%);animation:raySpinC 6s linear infinite}
.fc-root #winPop .wpGlow{position:absolute;left:50%;top:50%;width:340px;height:220px;margin:-110px 0 0 -170px;border-radius:50%;
  background:radial-gradient(ellipse,rgba(255,200,40,.75) 0%,rgba(255,120,0,.35) 40%,transparent 70%);animation:glowPulse .5s ease-in-out infinite alternate}
@keyframes raySpinC{to{transform:rotate(360deg)}}
@keyframes glowPulse{to{transform:scale(1.12);opacity:.8}}
.fc-root #wpLbl{position:relative;font-family:var(--disp);font-size:clamp(24px,8vw,36px);line-height:1;
  background:linear-gradient(#f4ffd0,#b8ff5a 50%,#3fae1c);-webkit-background-clip:text;background-clip:text;color:transparent;
  -webkit-text-stroke:1.5px #0d3a06;filter:drop-shadow(0 3px 0 #0a2a04) drop-shadow(0 0 10px rgba(160,255,80,.7))}
.fc-root #wpAmt{position:relative;font-family:var(--disp);font-size:clamp(54px,17vw,88px);line-height:1.05;white-space:nowrap;font-variant-numeric:tabular-nums;
  background:linear-gradient(#fffbe0 0%,#ffe066 35%,#ffae1a 60%,#c25a00 85%,#7a3000 100%);-webkit-background-clip:text;background-clip:text;color:transparent;
  -webkit-text-stroke:2.5px #3d1600;filter:drop-shadow(0 5px 0 #2a0e00) drop-shadow(0 0 22px rgba(255,190,40,.85));animation:amtBeat .28s ease-in-out infinite alternate}
@keyframes amtBeat{to{transform:scale(1.06)}}
.fc-root #wpAmt.done{animation:amtDone .5s ease-out}


.fc-root /* ---------- INTRO TITLE (3s) ---------- */
#intro{position:absolute;inset:0;z-index:60;overflow:hidden;display:flex;flex-direction:column;align-items:center;justify-content:center;
  background:radial-gradient(ellipse 90% 60% at 50% 45%,#3a2306 0%,#140b02 45%,#000 80%);cursor:pointer}
.fc-root #intro.out{animation:introOut .55s ease-in forwards}
@keyframes introOut{0%{opacity:1}35%{opacity:1;filter:brightness(2.2)}100%{opacity:0;transform:scale(1.25);filter:brightness(3)}}
.fc-root #intro.gone{display:none}
.fc-root #intro .iRays{position:absolute;left:50%;top:45%;width:240%;aspect-ratio:1;transform:translate(-50%,-50%) scale(.2);opacity:0;
  background:repeating-conic-gradient(rgba(255,200,60,.42) 0deg 5deg,transparent 5deg 18deg);
  -webkit-mask:radial-gradient(circle,#000 0%,rgba(0,0,0,.5) 25%,transparent 55%);mask:radial-gradient(circle,#000 0%,rgba(0,0,0,.5) 25%,transparent 55%);
  animation:iRaysIn .9s .55s cubic-bezier(.2,.9,.3,1) forwards,iRaysSpin 12s linear infinite}
@keyframes iRaysIn{to{opacity:1;transform:translate(-50%,-50%) scale(1)}}
@keyframes iRaysSpin{to{rotate:360deg}}
.fc-root #intro .iFlare{position:absolute;left:-60%;top:45%;width:220%;height:3px;transform:translateY(-50%);
  background:linear-gradient(90deg,transparent,rgba(255,240,190,.0) 30%,#fff6d0 50%,rgba(255,240,190,0) 70%,transparent);
  box-shadow:0 0 18px 6px rgba(255,200,80,.6);opacity:0;animation:iFlare .7s .1s ease-out forwards}
@keyframes iFlare{0%{opacity:0;transform:translate(-40%,-50%) scaleX(.2)}40%{opacity:1}100%{opacity:0;transform:translate(25%,-50%) scaleX(1)}}
.fc-root #intro .iTitle{position:relative;font-family:var(--disp);font-size:clamp(40px,12.5vw,76px);line-height:1;white-space:nowrap;letter-spacing:.01em;max-width:94%;text-align:center;opacity:0;
  background:linear-gradient(105deg,transparent 0 42%,rgba(255,255,255,.95) 50%,transparent 58% 100%) -150% 0/250% 100% no-repeat,
    linear-gradient(#fffbe0 0%,#ffe48a 28%,#ffc22a 50%,#d98a0a 68%,#8a4a00 100%);
  -webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-stroke:2px #4a2400;
  filter:drop-shadow(0 4px 0 #2e1400) drop-shadow(0 0 18px rgba(255,190,50,.55));
  animation:iTitleIn .75s .35s cubic-bezier(.18,1.4,.4,1) forwards,iTitleShine 1s 1.15s ease-in-out 2,iTitleGlow 1.2s 1.2s ease-in-out infinite alternate}
@keyframes iTitleIn{0%{opacity:0;transform:scale(2.4);filter:blur(14px) brightness(3)}60%{opacity:1;filter:blur(0) brightness(1.6) drop-shadow(0 4px 0 #2e1400)}100%{opacity:1;transform:scale(1)}}
@keyframes iTitleShine{from{background-position:-150% 0,0 0}to{background-position:250% 0,0 0}}
@keyframes iTitleGlow{from{filter:drop-shadow(0 4px 0 #2e1400) drop-shadow(0 0 18px rgba(255,190,50,.55))}to{filter:drop-shadow(0 4px 0 #2e1400) drop-shadow(0 0 34px rgba(255,210,80,.95))}}
.fc-root #intro .iSub{margin-top:22px;font-family:var(--disp);font-size:clamp(18px,5.5vw,24px);letter-spacing:.12em;opacity:0;
  background:linear-gradient(#fff6c8,#ffcf3a 55%,#c76a00);-webkit-background-clip:text;background-clip:text;color:transparent;
  filter:drop-shadow(0 2px 0 #3a1a00);animation:iUp .5s 1.25s ease-out forwards}
@keyframes iUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
.fc-root #intro .iBar{margin-top:16px;width:62%;height:8px;border-radius:4px;background:rgba(255,255,255,.1);box-shadow:inset 0 1px 2px rgba(0,0,0,.6);overflow:hidden;opacity:0;animation:iUp .4s .2s forwards}
.fc-root #intro .iBar i{display:block;height:100%;width:0;border-radius:4px;background:linear-gradient(90deg,#c76a00,#ffd54a,#fff4b0);box-shadow:0 0 10px #ffc83a;animation:iFill 2.75s .2s cubic-bezier(.5,.1,.3,1) forwards}
@keyframes iFill{to{width:100%}}
.fc-root #intro .iSkip{position:absolute;bottom:calc(18px + env(safe-area-inset-bottom,0px));font-size:12px;color:rgba(255,235,190,.55)}

.fc-root /* ---------- OVERLAYS ---------- */
.ov{position:absolute;inset:0;z-index:20;display:none;align-items:center;justify-content:center;flex-direction:column;overflow:hidden}
.fc-root .ov.show{display:flex}
.fc-root #bw{background:rgba(0,10,4,.55);animation:fadeIn .35s}
@keyframes fadeIn{from{opacity:0}}
.fc-root #bw.out{animation:fadeOut .45s forwards}
@keyframes fadeOut{to{opacity:0}}
.fc-root #bw .rays{position:absolute;left:50%;top:-30%;width:220%;aspect-ratio:1;transform:translateX(-50%);
  background:repeating-conic-gradient(from 0deg at 50% 50%,var(--ray) 0deg 7deg,transparent 7deg 22deg);
  -webkit-mask:radial-gradient(circle,#000 0%,rgba(0,0,0,.6) 30%,transparent 62%);mask:radial-gradient(circle,#000 0%,rgba(0,0,0,.6) 30%,transparent 62%);
  animation:raySpin 14s linear infinite;opacity:.85;transition:background .4s}
@keyframes raySpin{to{transform:translateX(-50%) rotate(360deg)}}
.fc-root #bw .glow{position:absolute;left:50%;top:38%;width:130%;aspect-ratio:1;transform:translate(-50%,-50%);border-radius:50%;
  background:radial-gradient(circle,var(--ray2) 0%,transparent 60%);opacity:.75;transition:background .4s}
.fc-root #bw{--ray:rgba(70,180,255,.55);--ray2:rgba(40,140,255,.6)}
.fc-root #bw.mega{--ray:rgba(200,90,255,.55);--ray2:rgba(170,40,255,.65)}
.fc-root #bw.super{--ray:rgba(255,190,40,.6);--ray2:rgba(255,150,20,.75)}
.fc-root #bwfx{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
.fc-root #bwTitle{position:relative;font-family:var(--disp);font-size:clamp(40px,13vw,64px);line-height:.9;text-align:center;
  background:linear-gradient(#e9fbff 0%,#7fd6ff 40%,#1b74e8 75%,#0b3a9a 100%);-webkit-background-clip:text;background-clip:text;color:transparent;
  -webkit-text-stroke:2px #06204a;filter:drop-shadow(0 4px 0 #031230) drop-shadow(0 0 16px rgba(80,180,255,.7));margin-top:-28%}
.fc-root #bw.mega #bwTitle{background-image:linear-gradient(#fff0ff 0%,#f0a6ff 35%,#a62cf0 70%,#4e0a8a 100%);-webkit-text-stroke-color:#2a0548;filter:drop-shadow(0 4px 0 #1e0336) drop-shadow(0 0 16px rgba(200,80,255,.7))}
.fc-root #bw.super #bwTitle{background-image:linear-gradient(#fff6b0 0%,#ffcf3a 35%,#ff5a1a 70%,#a3100a 100%);-webkit-text-stroke-color:#4a0a02;filter:drop-shadow(0 4px 0 #3a0802) drop-shadow(0 0 18px rgba(255,170,40,.8))}
.fc-root #bwTitle.pop{animation:titlePop .5s cubic-bezier(.2,1.6,.4,1)}
@keyframes titlePop{0%{transform:scale(.3) rotate(-6deg)}100%{transform:scale(1)}}
.fc-root #bwAmt{position:relative;font-family:var(--disp);font-size:clamp(40px,12.5vw,62px);margin-top:10px;font-variant-numeric:tabular-nums;
  background:linear-gradient(#fff9d6 0%,#ffd85a 45%,#e88a0c 70%,#8a4300 100%);-webkit-background-clip:text;background-clip:text;color:transparent;
  -webkit-text-stroke:2px #3d1a00;filter:drop-shadow(0 4px 0 #2a1000) drop-shadow(0 6px 12px rgba(0,0,0,.6))}
.fc-root #bwAmt.done{animation:amtDone .6s ease-out}
@keyframes amtDone{0%{transform:scale(1)}40%{transform:scale(1.25)}100%{transform:scale(1)}}
.fc-root #bwBird{position:relative;width:min(62%,280px);aspect-ratio:1;margin-top:4%;animation:birdIn 1s cubic-bezier(.2,.9,.3,1.1) both}
.fc-root #bwBird svg{width:100%;height:100%;animation:hover 1.4s ease-in-out infinite}
@keyframes birdIn{0%{transform:translate(120%,-140%) rotate(30deg) scale(.5)}100%{transform:none}}
@keyframes hover{0%,100%{transform:translateY(0) rotate(-3deg)}50%{transform:translateY(-12px) rotate(3deg)}}
.fc-root .wingA{transform-origin:118px 108px;animation:flap .32s ease-in-out infinite alternate}
@keyframes flap{from{transform:rotate(-18deg)}to{transform:rotate(26deg)}}
.fc-root .hint{position:absolute;bottom:calc(16px + env(safe-area-inset-bottom,0px));font-size:13px;color:rgba(255,255,255,.7)}

.fc-root #fsOv{background:radial-gradient(circle at 50% 40%,rgba(60,20,110,.9),rgba(5,2,20,.95));animation:fadeIn .4s}
.fc-root #fsOv h2{margin:0;font-family:var(--disp);font-weight:400;font-size:clamp(40px,12vw,58px);line-height:1;
  background:linear-gradient(#fff6b0,#ffcf3a 45%,#ff7a1a);-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-stroke:2px #3a0a02;filter:drop-shadow(0 4px 0 #240600)}
.fc-root #fsOv .big{font-family:var(--disp);font-size:clamp(80px,26vw,130px);line-height:1;color:#fff;text-shadow:0 0 24px rgba(180,120,255,.9),0 6px 0 #2a0a50;animation:titlePop .6s cubic-bezier(.2,1.6,.4,1)}
.fc-root #fsOv p{margin:8px 24px 0;text-align:center;font-size:16px;color:#ead9ff;max-width:30ch}
.fc-root #fsOv img{width:84px;height:84px;margin-top:12px;animation:hover 1.2s ease-in-out infinite}

.fc-root #pt{background:rgba(2,10,6,.94);justify-content:flex-start;padding:56px 18px 24px;overflow-y:auto}
.fc-root #pt h3{font-family:var(--disp);font-weight:400;color:var(--gold);font-size:28px;margin:0 0 6px}
.fc-root #pt .row{display:flex;align-items:center;gap:12px;width:100%;max-width:360px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.07)}
.fc-root #pt .row img{width:52px;height:52px}
.fc-root #pt .row div{font-size:14px;line-height:1.5;color:#e7f3e9;font-variant-numeric:tabular-nums}
.fc-root #pt .row b{color:var(--gold)}
.fc-root #pt p{max-width:360px;font-size:14px;line-height:1.6;color:#cfe3d3;margin:10px 0}
.fc-root #ptClose{position:absolute;top:12px;right:14px;width:38px;height:38px;border-radius:50%;background:rgba(255,255,255,.1);font-size:20px}

.fc-root #toast{position:absolute;left:50%;top:40%;transform:translate(-50%,-50%);z-index:30;background:rgba(0,0,0,.8);padding:10px 18px;border-radius:12px;font-size:15px;opacity:0;transition:opacity .25s;pointer-events:none}
.fc-root #toast.show{opacity:1}
@media (prefers-reduced-motion:reduce){.fc-root .sway,.fc-root .firefly,.fc-root #logo,.fc-root #peek{animation:none}}
`;

function initGame(root, host) {
  
  'use strict';
  const $=s=>root.querySelector(s);
  let alive=true;const abort=new AbortController();const sig={signal:abort.signal};
  const app=$('#app');
  const fmt=n=>n.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
  const rand=n=>Math.floor(Math.random()*n);
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  
  /* ================= SOUND ================= */
  let AC=null,muted=false,noiseBuf=null;
  function ac(){try{if(!AC){AC=new (window.AudioContext||window.webkitAudioContext)();}if(AC.state==='suspended')AC.resume();}catch(e){}return AC;}
  function tone(f,d,type='sine',v=.12,w=0,slide=0){if(muted)return;const a=ac();if(!a)return;const t=a.currentTime+w,o=a.createOscillator(),g=a.createGain();o.type=type;o.frequency.setValueAtTime(f,t);if(slide)o.frequency.exponentialRampToValueAtTime(f*slide,t+d);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(v,t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g);g.connect(a.destination);o.start(t);o.stop(t+d+.05);}
  function noise(d=.2,v=.15,freq=1800,w=0){if(muted)return;const a=ac();if(!a)return;if(!noiseBuf){noiseBuf=a.createBuffer(1,a.sampleRate*.5,a.sampleRate);const c=noiseBuf.getChannelData(0);for(let i=0;i<c.length;i++)c[i]=Math.random()*2-1;}const s=a.createBufferSource(),f=a.createBiquadFilter(),g=a.createGain(),t=a.currentTime+w;s.buffer=noiseBuf;f.type='bandpass';f.frequency.value=freq;f.Q.value=.8;g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.0001,t+d);s.connect(f);f.connect(g);g.connect(a.destination);s.start(t);s.stop(t+d);}
  const SFX={
    click:()=>tone(1200,.05,'square',.04),
    start:()=>{noise(.25,.12,900);tone(260,.22,'triangle',.06,0,1.8)},
    stop:()=>{tone(150,.16,'sine',.22,0,.55);noise(.06,.08,3000)},
    scatter:()=>[880,1175,1568,2093].forEach((f,i)=>tone(f,.4,'triangle',.09,i*.06)),
    antic:()=>{tone(180,1.2,'sawtooth',.035,0,3.2);tone(240,1.2,'triangle',.05,0,3)},
    burst:()=>{noise(.25,.22,2400);tone(660,.12,'triangle',.06,0,1.6)},
    win:()=>[523,659,784,1047,1319].forEach((f,i)=>tone(f,.28,'triangle',.08,i*.065)),
    coin:()=>tone(1900+Math.random()*900,.05,'square',.022),
    tier:()=>{[392,523,659,784,1047].forEach((f,i)=>tone(f,.5,'sawtooth',.045,i*.05));noise(.4,.12,1500)},
    fanfare:()=>[[523,659,784],[587,740,880],[659,830,988],[784,988,1175]].forEach((ch,i)=>ch.forEach(f=>tone(f,.35,'square',.03,i*.16))),
    lose:()=>tone(330,.12,'sine',.03,0,.8)
  };
  const icoOn='<svg viewBox="0 0 24 24" fill="none" stroke="#e6f5e9" stroke-width="2" stroke-linecap="round"><path d="M4 9v6h4l5 4V5L8 9z" fill="#e6f5e9"/><path d="M16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12"/></svg>';
  const icoOff='<svg viewBox="0 0 24 24" fill="none" stroke="#e6f5e9" stroke-width="2" stroke-linecap="round"><path d="M4 9v6h4l5 4V5L8 9z" fill="#e6f5e9"/><path d="M17 9l5 6M22 9l-5 6"/></svg>';
  $('#mute').innerHTML=icoOn;
  $('#mute').onclick=()=>{muted=!muted;$('#mute').innerHTML=muted?icoOff:icoOn;};
  
  /* ================= TOUCAN (original mascot) ================= */
  const TOUCAN=`<svg viewBox="0 0 220 220" aria-hidden="true">
   <defs><linearGradient id="bk" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffe14a"/><stop offset=".55" stop-color="#ff9a1a"/><stop offset=".85" stop-color="#ff4b1f"/><stop offset="1" stop-color="#c8141c"/></linearGradient>
   <radialGradient id="bd" cx=".4" cy=".35"><stop offset="0" stop-color="#3a3f4a"/><stop offset="1" stop-color="#07090d"/></radialGradient></defs>
   <path d="M92 168 q-6 34 10 46 q8 -18 14 -42z" fill="#0c0f14"/><path d="M104 170 q4 30 22 38 q0 -20 -6 -40z" fill="#121722"/>
   <path class="wingB" d="M80 112 q-48 -6 -66 -46 q38 6 70 26z" fill="#151a24"/>
   <ellipse cx="102" cy="128" rx="44" ry="52" fill="url(#bd)"/>
   <ellipse cx="96" cy="112" rx="26" ry="30" fill="#fff3c4"/><path d="M76 132 q20 14 42 0 q-6 14 -21 16 q-15 -2 -21 -16z" fill="#ffcf4a"/>
   <path d="M86 156 q16 10 30 0 l-4 12 q-12 6 -22 0z" fill="#e8282a"/>
   <circle cx="98" cy="72" r="34" fill="url(#bd)"/>
   <path d="M118 58 C150 44 196 52 206 74 C194 92 150 96 122 86 Z" fill="url(#bk)" stroke="#5a1f00" stroke-width="2.5"/>
   <path d="M122 72 C150 74 180 74 204 76" stroke="#7a2a00" stroke-width="2" fill="none"/>
   <path d="M196 62 q8 6 10 12 q-6 4 -12 2z" fill="#9a0f14"/>
   <circle cx="102" cy="66" r="13" fill="#3fb6ff"/><circle cx="102" cy="66" r="8.5" fill="#fff"/><circle cx="104" cy="66" r="5" fill="#111"/><circle cx="106" cy="63.5" r="1.8" fill="#fff"/>
   <path class="wingA" d="M118 108 q52 -10 78 -56 q-44 4 -82 34z" fill="#1d2330" stroke="#000" stroke-width="1.5"/>
   <path class="wingA" d="M128 100 q30 -14 46 -34" stroke="#3a4560" stroke-width="3" fill="none"/>
   <path d="M90 176 l-4 10 M100 178 l0 10 M110 176 l4 10" stroke="#7aa0b8" stroke-width="4" stroke-linecap="round"/>
  </svg>`;
  $('#peek').innerHTML=TOUCAN;$('#bwBird').innerHTML=TOUCAN;
  
  /* fireflies + grass */
  (()=>{const f=$('#flies');for(let i=0;i<12;i++){const s=document.createElement('i');s.className='firefly';s.style.left=(5+Math.random()*90)+'%';s.style.top=(20+Math.random()*70)+'%';s.style.animationDelay=(-Math.random()*7)+'s';s.style.animationDuration=(5+Math.random()*5)+'s';f.appendChild(s);}
   let d='M0 44 L0 26 ';for(let x=0;x<=400;x+=8){const h=8+Math.random()*20;d+=`L${x+2} ${26-h*.5} L${x+4} ${30-h} L${x+6} ${24-h*.3} `;}d+='L400 26 L400 44Z';$('#grassPath').setAttribute('d',d);})();
  
  /* ================= SYMBOL ART (procedural) ================= */
  const S=256;
  const W_=0,SC=1,MEL=2,APL=3,PIN=4,STR=5,BAN=6,PLM=7,CHR=8;
  const SYM=[
   {n:'WILD',pay:[0,0,0,50,200,1000],c:'#c9883e'},
   {n:'SCATTER',pay:[0,0,0,2,10,50],c:'#ffd23a'},
   {n:'แตงโม',pay:[0,0,0,20,100,400],c:'#ff3b4e'},
   {n:'แอปเปิล',pay:[0,0,0,15,60,250],c:'#ff2a2a'},
   {n:'สับปะรด',pay:[0,0,0,10,40,150],c:'#ffc52e'},
   {n:'มะเฟือง',pay:[0,0,0,8,30,100],c:'#e8f04a'},
   {n:'กล้วย',pay:[0,0,0,5,20,75],c:'#ffe14d'},
   {n:'บลูเบอร์รี',pay:[0,0,0,4,15,50],c:'#7a6cff'},
   {n:'เชอร์รี',pay:[0,0,0,3,10,40],c:'#d4102e'},
  ];
  const WEIGHTS=[[0,2,3,5,6,7,8,9,10],[2,2,3,5,6,7,8,9,10],[2,2,3,5,6,7,8,9,10],[2,2,3,5,6,7,8,9,10],[1,2,3,5,6,7,8,9,10]];
  // note: index 0 = WILD weight per reel, index1 = SCATTER
  function mk(){const c=document.createElement('canvas');c.width=c.height=S;return [c,c.getContext('2d')];}
  function gloss(g,x,y,rx,ry,rot,a=.6){g.save();g.translate(x,y);g.rotate(rot);g.scale(1,ry/rx);const gr=g.createRadialGradient(0,0,0,0,0,rx);gr.addColorStop(0,`rgba(255,255,255,${a})`);gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.beginPath();g.arc(0,0,rx,0,7);g.fill();g.restore();}
  function leaf(g,x,y,len,wid,rot,c1='#8be84f',c2='#1d6e25'){g.save();g.translate(x,y);g.rotate(rot);const gr=g.createLinearGradient(0,-wid,0,wid);gr.addColorStop(0,c1);gr.addColorStop(1,c2);g.fillStyle=gr;g.beginPath();g.moveTo(0,0);g.quadraticCurveTo(len*.5,-wid,len,0);g.quadraticCurveTo(len*.5,wid,0,0);g.fill();g.lineWidth=3;g.strokeStyle='rgba(8,45,10,.7)';g.stroke();g.beginPath();g.moveTo(3,0);g.lineTo(len*.88,0);g.strokeStyle='rgba(220,255,180,.55)';g.lineWidth=2;g.stroke();g.restore();}
  function edge(g,w=7){g.lineWidth=w;g.lineJoin='round';g.strokeStyle='rgba(35,8,0,.6)';g.stroke();}
  function shadowOn(g){g.shadowColor='rgba(0,0,0,.55)';g.shadowBlur=14;g.shadowOffsetY=8;}
  function shadowOff(g){g.shadowColor='transparent';g.shadowBlur=0;g.shadowOffsetY=0;}
  function rg(g,x,y,r,stops){const gr=g.createRadialGradient(x,y,0,x,y,r);stops.forEach((s,i)=>gr.addColorStop(s[0],s[1]));return gr;}
  
  const DRAW={
  [APL](g){g.lineCap='round';g.strokeStyle='#5a3210';g.lineWidth=10;g.beginPath();g.moveTo(128,86);g.quadraticCurveTo(126,56,142,36);g.stroke();
    leaf(g,140,52,62,20,-0.5);
    g.beginPath();g.moveTo(128,84);g.bezierCurveTo(172,52,232,74,228,142);g.bezierCurveTo(226,204,182,238,152,232);g.bezierCurveTo(140,229,118,229,106,232);g.bezierCurveTo(74,238,30,204,28,142);g.bezierCurveTo(24,74,84,52,128,84);g.closePath();
    shadowOn(g);g.fillStyle=rg(g,96,112,150,[[0,'#ff9a84'],[.28,'#f02a2a'],[.75,'#a30b14'],[1,'#4e0208']]);g.fill();shadowOff(g);edge(g);
    gloss(g,84,124,30,48,.35,.7);gloss(g,176,104,14,9,.4,.5);},
  [MEL](g){g.save();g.translate(128,84);g.rotate(-.12);
    const half=(r)=>{g.beginPath();g.arc(0,0,r,0,Math.PI);g.closePath();};
    shadowOn(g);half(114);g.fillStyle='#145a1c';g.fill();shadowOff(g);edge(g);
    half(104);g.fillStyle='#8fdc5a';g.fill();half(96);g.fillStyle='#e9ffd0';g.fill();
    half(90);g.fillStyle=rg(g,0,10,96,[[0,'#ff8a94'],[.5,'#ff2e47'],[1,'#c8102e']]);g.fill();
    g.fillStyle='#1a0a0a';[[-50,26],[-22,48],[10,62],[40,40],[62,18],[-60,6],[-8,22],[24,18],[-34,58],[56,52]].forEach(([x,y])=>{g.save();g.translate(x,y);g.rotate(Math.atan2(y,x));g.beginPath();g.ellipse(0,0,7,4,0,0,7);g.fill();g.restore();});
    g.fillStyle='rgba(255,255,255,.35)';g.fillRect(-88,1,176,6);
    g.restore();gloss(g,90,110,26,12,.3,.45);},
  [PIN](g){[-2.4,-2.0,-1.57,-1.15,-.75].forEach((a,i)=>leaf(g,128,108,i===2?96:78,15,a));
    g.save();g.beginPath();g.ellipse(128,168,66,80,0,0,7);shadowOn(g);g.fillStyle=rg(g,104,140,110,[[0,'#fff1a0'],[.35,'#ffc532'],[.75,'#e07b0a'],[1,'#7a3a00']]);g.fill();shadowOff(g);edge(g);g.clip();
    g.strokeStyle='rgba(110,55,0,.75)';g.lineWidth=4;for(let k=-200;k<300;k+=28){g.beginPath();g.moveTo(k,80);g.lineTo(k+180,260);g.stroke();g.beginPath();g.moveTo(k+180,80);g.lineTo(k,260);g.stroke();}
    g.fillStyle='rgba(255,240,170,.8)';for(let y=96;y<250;y+=20)for(let x=56;x<210;x+=28){g.beginPath();g.arc(x+((y/20)%2?14:0),y,2.6,0,7);g.fill();}
    g.restore();gloss(g,100,140,22,36,.3,.55);},
  [STR](g){g.save();g.translate(128,134);g.rotate(.18);g.beginPath();for(let i=0;i<10;i++){const r=i%2?56:110,a=-Math.PI/2+i*Math.PI/5;g.lineTo(Math.cos(a)*r,Math.sin(a)*r);}g.closePath();
    const gr=g.createLinearGradient(-90,-90,90,90);gr.addColorStop(0,'#fbff9a');gr.addColorStop(.45,'#e6dc28');gr.addColorStop(1,'#9a8a00');
    g.lineJoin='round';shadowOn(g);g.lineWidth=26;g.strokeStyle=gr;g.stroke();g.fillStyle=gr;g.fill();shadowOff(g);
    g.lineWidth=32;g.globalCompositeOperation='destination-over';g.strokeStyle='rgba(60,40,0,.6)';g.stroke();g.globalCompositeOperation='source-over';
    g.strokeStyle='rgba(255,255,210,.75)';g.lineWidth=5;for(let i=0;i<5;i++){const a=-Math.PI/2+i*2*Math.PI/5;g.beginPath();g.moveTo(0,0);g.lineTo(Math.cos(a)*100,Math.sin(a)*100);g.stroke();}
    g.fillStyle='#8a7a10';for(let i=0;i<5;i++){const a=-Math.PI/2+(i+.5)*2*Math.PI/5;g.beginPath();g.ellipse(Math.cos(a)*22,Math.sin(a)*22,6,3,a,0,7);g.fill();}
    g.restore();gloss(g,96,96,22,14,-.6,.6);},
  [BAN](g){const one=(cx,cy,r,a0,a1,rot,sh)=>{g.save();g.translate(cx,cy);g.rotate(rot);g.lineCap='round';
     g.beginPath();g.arc(0,0,r,a0,a1);g.lineWidth=46;g.strokeStyle='rgba(60,30,0,.6)';g.stroke();
     g.beginPath();g.arc(0,0,r,a0,a1);g.lineWidth=38;const gr=g.createLinearGradient(0,-r-20,0,-r+20);gr.addColorStop(0,'#fff59a');gr.addColorStop(.5,'#ffd51e');gr.addColorStop(1,'#c99000');g.strokeStyle=gr;g.stroke();
     g.beginPath();g.arc(0,0,r-8,a0+.15,a1-.15);g.lineWidth=5;g.strokeStyle='rgba(255,255,220,.7)';g.stroke();
     g.fillStyle='#4a2a08';g.beginPath();g.arc(Math.cos(a1)*r,Math.sin(a1)*r,7,0,7);g.fill();
     g.fillStyle='#6a8a1a';g.beginPath();g.arc(Math.cos(a0)*r,Math.sin(a0)*r,10,0,7);g.fill();g.restore();};
    shadowOn(g);one(140,250,150,-2.55,-1.35,0);shadowOff(g);one(130,262,140,-2.5,-1.3,.28);one(122,272,130,-2.45,-1.25,.56);},
  [PLM](g){shadowOn(g);[[88,160,52],[168,160,52],[128,104,52]].forEach(([x,y,r])=>{g.beginPath();g.arc(x,y,r,0,7);g.fillStyle=rg(g,x-16,y-18,r*1.3,[[0,'#c9cbff'],[.3,'#6f63f0'],[.75,'#2a1a8a'],[1,'#0e0640']]);g.fill();shadowOff(g);edge(g,6);
     g.save();g.translate(x+8,y-r*.55);g.fillStyle='#1a0e46';g.beginPath();for(let i=0;i<10;i++){const rr=i%2?4:11,a=i*Math.PI/5;g.lineTo(Math.cos(a)*rr,Math.sin(a)*rr*.6);}g.fill();g.restore();
     gloss(g,x-18,y-14,14,20,.4,.6);});
    leaf(g,150,64,64,18,-.6);},
  [CHR](g){g.lineCap='round';g.strokeStyle='#4f7a16';g.lineWidth=8;g.beginPath();g.moveTo(92,150);g.quadraticCurveTo(100,80,142,44);g.stroke();g.beginPath();g.moveTo(166,140);g.quadraticCurveTo(160,90,142,44);g.stroke();
    leaf(g,144,46,70,22,-.35);
    shadowOn(g);[[90,174,52],[168,162,52]].forEach(([x,y,r])=>{g.beginPath();g.arc(x,y,r,0,7);g.fillStyle=rg(g,x-18,y-18,r*1.35,[[0,'#ffb0b8'],[.28,'#ef1d3c'],[.72,'#8a0420'],[1,'#3a0008']]);g.fill();shadowOff(g);edge(g,6);gloss(g,x-18,y-16,16,22,.5,.7);});},
  [W_](g){g.save();g.translate(128,128);leaf(g,-6,-82,74,20,-2.5);leaf(g,6,-82,74,20,-.65);
    g.beginPath();g.arc(0,8,102,0,7);shadowOn(g);g.fillStyle=rg(g,-24,-14,130,[[0,'#e2a865'],[.45,'#a8642c'],[.85,'#5a2e10'],[1,'#2e1406']]);g.fill();shadowOff(g);edge(g,8);
    g.strokeStyle='rgba(50,22,6,.35)';g.lineWidth=3;[82,62,42].forEach(r=>{g.beginPath();g.ellipse(4,10,r,r*.92,.2,0,7);g.stroke();});
    g.strokeStyle='rgba(40,15,3,.6)';g.lineWidth=4;g.beginPath();g.moveTo(60,-60);g.lineTo(42,-34);g.lineTo(50,-18);g.stroke();
    g.rotate(-.14);g.font='76px "Lilita One", Kanit, sans-serif';g.textAlign='center';g.textBaseline='middle';
    g.lineJoin='round';g.lineWidth=16;g.strokeStyle='#2a1004';g.strokeText('WILD',0,14);
    const gr=g.createLinearGradient(0,-24,0,46);gr.addColorStop(0,'#ffffff');gr.addColorStop(.55,'#ffe9b8');gr.addColorStop(1,'#e59a2e');g.fillStyle=gr;g.fillText('WILD',0,14);
    g.restore();gloss(g,84,70,26,14,-.5,.45);},
  [SC](g){g.save();g.translate(128,112);
    for(let i=0;i<14;i++){g.save();g.rotate(i*Math.PI/7);g.beginPath();g.moveTo(-10,-70);g.lineTo(0,-120);g.lineTo(10,-70);g.closePath();g.fillStyle='rgba(255,210,60,.85)';g.fill();g.restore();}
    g.beginPath();g.arc(0,0,80,0,7);shadowOn(g);g.fillStyle=rg(g,-22,-24,110,[[0,'#fff6b8'],[.4,'#ffc81a'],[.85,'#b86b00'],[1,'#5a2e00']]);g.fill();shadowOff(g);edge(g,7);
    g.beginPath();g.arc(0,0,60,0,7);g.lineWidth=5;g.strokeStyle='rgba(120,60,0,.6)';g.stroke();
    g.beginPath();for(let i=0;i<6;i++){const a=i*Math.PI/3-Math.PI/2;g.lineTo(Math.cos(a)*44,Math.sin(a)*44);}g.closePath();
    g.fillStyle=rg(g,-12,-14,60,[[0,'#d6ffd8'],[.35,'#2fd060'],[1,'#064a1c']]);g.fill();g.lineWidth=4;g.strokeStyle='#043014';g.stroke();
    g.strokeStyle='rgba(220,255,220,.5)';g.lineWidth=2;for(let i=0;i<6;i++){const a=i*Math.PI/3-Math.PI/2;g.beginPath();g.moveTo(0,0);g.lineTo(Math.cos(a)*44,Math.sin(a)*44);g.stroke();}
    g.restore();
    g.save();g.translate(128,196);g.beginPath();g.moveTo(-118,-22);g.lineTo(118,-22);g.lineTo(104,0);g.lineTo(118,22);g.lineTo(-118,22);g.lineTo(-104,0);g.closePath();
    const rb=g.createLinearGradient(0,-22,0,22);rb.addColorStop(0,'#ff7a4a');rb.addColorStop(.5,'#d8261a');rb.addColorStop(1,'#7a0a04');g.fillStyle=rb;shadowOn(g);g.fill();shadowOff(g);edge(g,5);
    g.font='34px "Lilita One", Kanit, sans-serif';g.textAlign='center';g.textBaseline='middle';g.lineWidth=7;g.strokeStyle='#3a0600';g.strokeText('SCATTER',0,2);g.fillStyle='#fff6d0';g.fillText('SCATTER',0,2);g.restore();}
  };
  let SPR=[],BLUR=[],IMG=[];
  function buildSprites(){SPR=[];BLUR=[];IMG=[];for(let i=0;i<SYM.length;i++){const [c,g]=mk();DRAW[i](g);SPR[i]=c;
    const b=document.createElement('canvas');b.width=S;b.height=S+80;const bg=b.getContext('2d');for(let k=-5;k<=5;k++){bg.globalAlpha=k===0?.55:.13;bg.drawImage(c,0,40+k*8,S,S);}BLUR[i]=b;IMG[i]=c.toDataURL();}}
  
  /* ================= GAME DATA ================= */
  const LINES=[[1,1,1,1,1],[0,0,0,0,0],[2,2,2,2,2],[0,1,2,1,0],[2,1,0,1,2],[0,0,1,2,2],[2,2,1,0,0],[1,0,1,2,1],[1,2,1,0,1],[0,1,1,1,0],
   [2,1,1,1,2],[0,1,0,1,0],[2,1,2,1,2],[1,1,0,1,1],[1,1,2,1,1],[1,0,0,0,1],[1,2,2,2,1],[0,0,1,0,0],[2,2,1,2,2],[0,2,0,2,0]];
  const BETS=[2,4,10,20,40,100,200,400,1000,2000];
  let betIdx=host?2:6,balance=host?host.getBalance():100000,turbo=false,auto=false,busy=false,fs=null;
  const bet=()=>BETS[betIdx];
  function randSym(c){const w=WEIGHTS[c];let t=w.reduce((a,b)=>a+b,0),r=Math.random()*t;for(let i=0;i<w.length;i++){if((r-=w[i])<0)return i;}return CHR;}
  function genGrid(){const g=[];for(let c=0;c<5;c++){const col=[];for(let r=0;r<3;r++){let s=randSym(c);while(s===SC&&col.includes(SC))s=randSym(c);col.push(s);}g.push(col);}
    if(fs){const n=5+rand(6);const cells=[];for(let c=0;c<5;c++)for(let r=0;r<3;r++)if(g[c][r]!==SC)cells.push([c,r]);for(let i=0;i<n&&cells.length;i++){const [c,r]=cells.splice(rand(cells.length),1)[0];g[c][r]=fs.feat;}}
    return g;}
  function evaluate(g){const lb=bet()/20,wins=[];
    LINES.forEach((L,li)=>{const s=L.map((r,c)=>g[c][r]);let wr=0;while(wr<5&&s[wr]===W_)wr++;
      const base=s.find(x=>x!==W_);let best=null;
      if(base!==undefined&&base!==SC){let n=0;while(n<5&&(s[n]===base||s[n]===W_))n++;if(n>=3)best={sym:base,count:n,amt:SYM[base].pay[n]*lb};}
      if(wr>=3){const a=SYM[W_].pay[wr]*lb;if(!best||a>best.amt)best={sym:W_,count:wr,amt:a};}
      if(best)wins.push({...best,li,cells:L.slice(0,best.count).map((r,c)=>[c,r])});});
    const sc=[];g.forEach((col,c)=>col.forEach((s,r)=>{if(s===SC)sc.push([c,r]);}));
    let scat=null;if(sc.length>=3)scat={cells:sc,count:sc.length,amt:SYM[SC].pay[Math.min(5,sc.length)]*bet(),li:-1,sym:SC};
    const total=wins.reduce((a,w)=>a+w.amt,0)+(scat?scat.amt:0);
    return {wins,scat,total};}
  
  /* ================= CANVAS / LAYOUT ================= */
  const cv=$('#reels'),ctx=cv.getContext('2d');
  let RW=0,RH=0,CW=0,CH=0,DPR=1;
  function layout(){const aw=app.clientWidth,ah=app.clientHeight;const fixed=150+22+50+120;let w=Math.min(aw,(ah-fixed)/0.63);w=Math.max(220,w);
    RW=Math.floor(w);CW=RW/5;CH=CW*1.04;RH=Math.floor(CH*3+CH*.12);DPR=Math.min(2.5,window.devicePixelRatio||1);
    cv.width=RW*DPR;cv.height=RH*DPR;cv.style.width=RW+'px';cv.style.height=RH+'px';ctx.setTransform(DPR,0,0,DPR,0,0);
    const bw=$('#bwfx');bw.width=app.clientWidth*DPR;bw.height=app.clientHeight*DPR;}
  const TOPPAD=()=>CH*.06;
  
  /* reels */
  const cols=[];
  for(let c=0;c<5;c++)cols.push({syms:[randSym(c),randSym(c),randSym(c),randSym(c)].map(s=>s===SC&&c===0?CHR:s),off:0,state:'idle',speed:0,t0:0,stopAt:0,queue:[],bT:0,bA:0,antic:false,res:null,landT:-9999});
  let grid=cols.map(c=>c.syms.slice(1));
  function startReels(final){const now=performance.now();const base=turbo?300:650,step=turbo?80:170;
    return Promise.all(cols.map((col,c)=>new Promise(res=>{col.state='wind';col.t0=now;col.speed=0;col.stopAt=now+base+c*step;col.queue=[];col.final=final[c];col.res=res;col.antic=false;})));}
  let anticFired=false;
  function onLand(c,now){SFX.stop();const col=cols[c];if(col.syms.slice(1).includes(SC)){col.landT=now;SFX.scatter();}
    const count=cols.slice(0,c+1).reduce((a,k)=>a+k.syms.slice(1).filter(s=>s===SC).length,0);
    if(count>=2&&c<4&&!anticFired&&!slammed){anticFired=true;SFX.antic();let k=0;for(let j=c+1;j<5;j++){if(cols[j].state==='spin'||cols[j].state==='wind'){cols[j].stopAt=now+1300+k*1300;cols[j].antic=true;k++;}}}}
  let slammed=false;
  function slam(){const now=performance.now();slammed=true;cols.forEach((col,c)=>{if(col.state==='spin'||col.state==='wind'){col.stopAt=Math.min(col.stopAt,now+c*35);col.antic=false;}});}
  function updateReels(now,dt){const vmax=turbo?40:31;
    cols.forEach((col,c)=>{
      if(col.state==='wind'){const t=now-col.t0;col.off=-0.2*Math.sin(Math.min(1,t/130)*Math.PI/2);if(t>=130){col.state='spin';col.t0=now;}}
      else if(col.state==='spin'||col.state==='stopping'){
        const t=now-col.t0;col.speed=vmax*Math.min(1,t/140)*(col.antic?1.15:1);
        if(col.state==='spin'&&now>=col.stopAt){col.state='stopping';col.queue=[col.final[2],col.final[1],col.final[0],randSym(c)];}
        col.off+=col.speed*dt;
        while(col.off>=1){col.off-=1;col.syms.pop();col.syms.unshift(col.queue.length?col.queue.shift():randSym(c));
          if(col.state==='stopping'&&col.queue.length===0){col.state='bounce';col.bT=now;col.bA=Math.min(.3,col.off+.16);col.off=col.bA;col.antic=false;onLand(c,now);break;}}
      } else if(col.state==='bounce'){const p=Math.min(1,(now-col.bT)/(turbo?200:300));col.off=col.bA*Math.exp(-4*p)*Math.cos(p*Math.PI*2.1);
        if(p>=1){col.off=0;col.state='idle';const r=col.res;col.res=null;r&&r();}}
    });}
  
  /* particles */
  const parts=[];
  function burst(x,y,color,n=18){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,v=80+Math.random()*260;parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-80,g:520,life:0,max:.55+Math.random()*.5,size:3+Math.random()*5,color,type:'drop'});}
    for(let i=0;i<8;i++){const a=Math.random()*Math.PI*2,v=40+Math.random()*160;parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,g:0,life:0,max:.5+Math.random()*.4,size:6+Math.random()*6,color:'#fff4b0',type:'spark'});}
    for(let i=0;i<4;i++){const a=Math.random()*Math.PI*2,v=60+Math.random()*120;parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-120,g:300,life:0,max:1+Math.random()*.5,size:9,color:'#5fd03a',type:'leaf',rot:Math.random()*6,vr:(Math.random()-.5)*10});}
    parts.push({x,y,life:0,max:.45,size:CW*.55,type:'ring',color:'#d6ff8a'});}
  function stepParts(dt){for(let i=parts.length-1;i>=0;i--){const p=parts[i];p.life+=dt;if(p.life>=p.max){parts.splice(i,1);continue;}if(p.type!=='ring'){p.vy+=(p.g||0)*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.985;if(p.rot!==undefined)p.rot+=p.vr*dt;}}}
  function drawParts(g){parts.forEach(p=>{const k=p.life/p.max,a=1-k;g.save();g.globalAlpha=a;
    if(p.type==='drop'){g.fillStyle=p.color;g.beginPath();g.arc(p.x,p.y,p.size*(1-k*.5),0,7);g.fill();}
    else if(p.type==='spark'){g.translate(p.x,p.y);g.rotate(k*3);g.fillStyle=p.color;g.shadowColor='#fff';g.shadowBlur=10;const s=p.size*(1-k*.6);g.beginPath();g.moveTo(0,-s);g.lineTo(s*.25,0);g.lineTo(0,s);g.lineTo(-s*.25,0);g.closePath();g.fill();g.beginPath();g.moveTo(-s,0);g.lineTo(0,s*.25);g.lineTo(s,0);g.lineTo(0,-s*.25);g.fill();}
    else if(p.type==='leaf'){g.translate(p.x,p.y);g.rotate(p.rot);g.fillStyle=p.color;g.beginPath();g.ellipse(0,0,p.size,p.size*.45,0,0,7);g.fill();}
    else if(p.type==='ring'){g.strokeStyle=p.color;g.lineWidth=6*(1-k);g.shadowColor=p.color;g.shadowBlur=14;g.beginPath();g.arc(p.x,p.y,p.size*(.4+k*.9),0,7);g.stroke();}
    g.restore();});}
  
  /* win display state */
  let WS=null; // {items, t0, phase, cells:Set}
  function cellXY(c,r){return [c*CW+CW/2,TOPPAD()+r*CH+CH/2];}
  function roundRect(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();}
  function drawFrame(g,c,r,now){const [x,y]=cellXY(c,r);const w=CW*.94,h=CH*.94;g.save();
    const pulse=.6+.4*Math.sin(now/180);
    g.shadowColor='rgba(170,255,80,'+(.6+.4*pulse)+')';g.shadowBlur=16;
    roundRect(g,x-w/2,y-h/2,w,h,12);g.lineWidth=4;g.strokeStyle='#b8ff5a';g.stroke();g.shadowBlur=0;
    roundRect(g,x-w/2+4,y-h/2+4,w-8,h-8,9);g.lineWidth=2;g.strokeStyle='rgba(255,240,140,.85)';g.stroke();
    g.fillStyle='#4fc22e';[[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([sx,sy])=>{g.save();g.translate(x+sx*w/2,y+sy*h/2);g.rotate(Math.atan2(sy,sx));g.beginPath();g.ellipse(0,0,9,4,0,0,7);g.fill();g.rotate(.9);g.beginPath();g.ellipse(2,0,7,3,0,0,7);g.fillStyle='#8ae84a';g.fill();g.restore();});
    g.restore();}
  function drawLine(g,li,alpha=1){const L=LINES[li];g.save();g.globalAlpha=alpha;g.lineJoin='round';g.lineCap='round';
    const pts=L.map((r,c)=>cellXY(c,r));g.beginPath();g.moveTo(0,pts[0][1]);pts.forEach(p=>g.lineTo(p[0],p[1]));g.lineTo(RW,pts[4][1]);
    g.strokeStyle='rgba(60,25,0,.8)';g.lineWidth=6;g.stroke();g.shadowColor='#ffd54a';g.shadowBlur=10;g.strokeStyle='#ffe07a';g.lineWidth=3;g.stroke();g.restore();}
  function drawLabel(g,x,y,text){g.save();g.font=`${Math.round(CW*.2)}px "Lilita One", Kanit, sans-serif`;g.textAlign='center';g.textBaseline='middle';
    const w=g.measureText(text).width+16,h=CW*.26;roundRect(g,x-w/2,y-h/2,w,h,h/2);g.fillStyle='rgba(20,8,0,.78)';g.fill();g.lineWidth=2;g.strokeStyle='#ffcf4a';g.stroke();
    g.lineWidth=4;g.strokeStyle='#3a1600';g.strokeText(text,x,y+1);g.fillStyle='#ffe27a';g.fillText(text,x,y+1);g.restore();}
  
  function drawReels(now){const g=ctx;g.clearRect(0,0,RW,RH);
    // anticipation glow columns
    cols.forEach((col,c)=>{if(col.antic&&col.state!=='idle'){const a=.45+.3*Math.sin(now/90);const gr=g.createLinearGradient(c*CW,0,(c+1)*CW,0);gr.addColorStop(0,'rgba(170,255,90,'+a+')');gr.addColorStop(.2,'rgba(80,200,60,'+a*.35+')');gr.addColorStop(.8,'rgba(80,200,60,'+a*.35+')');gr.addColorStop(1,'rgba(170,255,90,'+a+')');g.fillStyle=gr;g.fillRect(c*CW+2,0,CW-4,RH);
      if(Math.random()<.5)parts.push({x:c*CW+Math.random()*CW,y:RH,vx:0,vy:-200-Math.random()*200,g:0,life:0,max:.8,size:3,color:'#d8ff9a',type:'drop'});}});
    // scatter glow behind landed scatters
    const winCells=WS?WS.cellSet:null;
    g.save();g.beginPath();g.rect(0,0,RW,RH);g.clip();
    const sz=Math.min(CW,CH)*.9;
    cols.forEach((col,c)=>{const moving=col.state==='spin'||col.state==='stopping';
      for(let i=0;i<4;i++){const s=col.syms[i],r=i-1;const y=TOPPAD()+(r+col.off)*CH+CH/2,x=c*CW+CW/2;if(y<-CH||y>RH+CH)continue;
        let scale=1,alpha=1;
        if(!moving&&s===SC&&r>=0){const lt=now-col.landT;if(lt<500)scale=1+.25*Math.sin(Math.min(1,lt/500)*Math.PI);
          if(scatGlow||lt<900){g.save();g.globalAlpha=.55+.25*Math.sin(now/150);g.fillStyle=rg(g,x,y,sz*.75,[[0,'rgba(255,230,120,.9)'],[1,'rgba(255,200,40,0)']]);g.beginPath();g.arc(x,y,sz*.75,0,7);g.fill();g.restore();}}
        if(WS&&r>=0&&!moving){const key=c+','+r;const on=winCells.has(key);
          if(WS.phase==='cycle'){const cur=WS.items[WS.idx];on&&cur&&cur.cells.some(([cc,rr])=>cc===c&&rr===r)?(scale*=1+.06*Math.sin(now/140)):(alpha=.35);}
          else if(on){const k=(now-WS.t0)/450;scale*=k<1?1+.28*Math.sin(k*Math.PI):1+.06*Math.sin(now/140);}else alpha=.35;}
        g.globalAlpha=alpha;
        if(moving&&col.speed>8){const b=BLUR[s];const h=sz*(S+80)/S;g.drawImage(b,x-sz/2,y-h/2,sz,h);}
        else{const d=sz*scale;g.drawImage(SPR[s],x-d/2,y-d/2,d,d);}
        g.globalAlpha=1;}});
    g.restore();
    // win overlay
    if(WS){if(WS.phase==='all'){WS.items.forEach(it=>{if(it.li>=0)drawLine(g,it.li,.9);});WS.items.forEach(it=>it.cells.forEach(([c,r])=>drawFrame(g,c,r,now)));}
      else{const per=turbo?900:1300;WS.idx=Math.floor((now-WS.t1)/per)%WS.items.length;const it=WS.items[WS.idx];if(it){if(it.li>=0)drawLine(g,it.li);it.cells.forEach(([c,r])=>drawFrame(g,c,r,now));const m=it.cells[Math.floor((it.cells.length-1)/2)];const [x,y]=cellXY(m[0],m[1]);drawLabel(g,x,y+CH*.3,fmt(it.amt));}}}
    drawParts(g);}
  let scatGlow=false;
  
  /* ================= UI ================= */
  const balEl=$('#bal'),winEl=$('#winV'),betEl=$('#betV'),plank=$('#plank'),plankAmt=$('#plankAmt'),plankLbl=$('#plankLbl'),plankWin=$('#plankWin'),marq=$('#marq');
  const TIPS=['SCATTER 3 ตัวขึ้นไป รับ 15 ฟรีสปิน','WILD แทนได้ทุกสัญลักษณ์ ยกเว้น SCATTER','ระหว่างฟรีสปิน ผลไม้พิเศษจะปรากฏ 5 ถึง 10 ตัวในทุกสปิน','ชนะ 20 ไลน์ เรียงจากซ้ายไปขวา','แตะปุ่มหมุนระหว่างวงล้อหมุนเพื่อหยุดทันที'];
  let tipI=0;marq.addEventListener('animationiteration',()=>{tipI=(tipI+1)%TIPS.length;marq.textContent=TIPS[tipI];},sig);marq.textContent=TIPS[0];
  function refresh(){balEl.textContent=fmt(balance);betEl.textContent=fmt(bet());const lock=busy||!!fs;$('#minus').disabled=lock||betIdx===0;$('#plus').disabled=lock||betIdx===BETS.length-1;}
  function plankMarquee(){plank.classList.remove('win');}
  function plankShow(lbl,amt){plank.classList.add('win');plankLbl.textContent=lbl;plankAmt.textContent=amt;plankWin.classList.remove('pop');void plankWin.offsetWidth;plankWin.classList.add('pop');}
  function countTo(el,from,to,dur){cancelAnimationFrame(el._raf);if(el._res)el._res();const t0=performance.now();return new Promise(res=>{el._res=res;const st=t=>{const p=Math.min(1,(t-t0)/dur);const e=1-Math.pow(1-p,3);el.textContent=fmt(from+(to-from)*e);if(p<1)el._raf=requestAnimationFrame(st);else{el._res=null;res();}};el._raf=requestAnimationFrame(st);});}
  function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(toast.h);toast.h=setTimeout(()=>t.classList.remove('show'),1500);}
  
  
  /* ================= CENTER WIN POP ================= */
  const winPop=$('#winPop'),wpAmt=$('#wpAmt'),wpLbl=$('#wpLbl');
  async function showWinPop(amount,dur){const m=amount/bet();
    wpLbl.textContent=m>=5?'GREAT WIN':m>=2?'NICE WIN':'WIN';
    wpAmt.classList.remove('done');wpAmt.textContent='0.00';
    winPop.className='';void winPop.offsetWidth;winPop.className='show';
    for(let i=0;i<3;i++)setTimeout(()=>burst(RW/2+(Math.random()-.5)*RW*.5,RH/2+(Math.random()-.5)*CH,'#ffd54a',22),i*140);
    let tick=0;const iv=setInterval(()=>{SFX.coin();if(++tick>dur/70)clearInterval(iv);},70);
    await countTo(wpAmt,0,amount,dur);clearInterval(iv);
    wpAmt.classList.add('done');SFX.win();}
  async function hideWinPop(){if(!winPop.classList.contains('show'))return;winPop.className='show out';await wait(400);winPop.className='';}
  
  /* ================= BIG WIN ================= */
  const bwfx=$('#bwfx'),bctx=bwfx.getContext('2d'),coins=[];
  let bwOn=false;
  function bwLoop(){if(!bwOn||!alive)return;const w=bwfx.width/DPR,h=bwfx.height/DPR;bctx.setTransform(DPR,0,0,DPR,0,0);bctx.clearRect(0,0,w,h);
    for(let i=0;i<3;i++)coins.push({x:w/2+(Math.random()-.5)*40,y:h*.62,vx:(Math.random()-.5)*520,vy:-420-Math.random()*520,r:9+Math.random()*9,s:Math.random()*6,vs:6+Math.random()*10,leaf:Math.random()<.25});
    for(let i=coins.length-1;i>=0;i--){const c=coins[i];c.vy+=900/60;c.x+=c.vx/60;c.y+=c.vy/60;c.s+=c.vs/60;if(c.y>h+40){coins.splice(i,1);continue;}
      bctx.save();bctx.translate(c.x,c.y);
      if(c.leaf){bctx.rotate(c.s);bctx.fillStyle='#62d33a';bctx.beginPath();bctx.ellipse(0,0,c.r,c.r*.4,0,0,7);bctx.fill();}
      else{const sx=Math.abs(Math.cos(c.s));bctx.scale(Math.max(.12,sx),1);bctx.beginPath();bctx.arc(0,0,c.r,0,7);bctx.fillStyle=rg(bctx,-c.r*.3,-c.r*.3,c.r*1.4,[[0,'#fff6b0'],[.5,'#ffc51a'],[1,'#a35d00']]);bctx.fill();bctx.lineWidth=2;bctx.strokeStyle='#7a3f00';bctx.stroke();bctx.beginPath();bctx.arc(0,0,c.r*.6,0,7);bctx.stroke();}
      bctx.restore();}
    requestAnimationFrame(bwLoop);}
  function bigWin(amount){return new Promise(resolve=>{
    const b=bet(),tiers=[{n:'BIG WIN',m:10,cls:''},{n:'MEGA WIN',m:25,cls:'mega'},{n:'SUPER<br>MEGA WIN',m:50,cls:'super'}];
    const reached=tiers.filter(t=>amount>=t.m*b).length||1;
    const pts=[{t:0,v:0}];let tt=0;for(let i=0;i<reached;i++){tt+=(turbo?2000:3000);pts.push({t:tt,v:i<reached-1?tiers[i+1].m*b:amount});}
    const ov=$('#bw'),title=$('#bwTitle'),amt=$('#bwAmt');ov.className='ov show';title.innerHTML=tiers[0].n;amt.textContent='0.00';amt.classList.remove('done');
    const bird=$('#bwBird');bird.style.animation='none';void bird.offsetWidth;bird.style.animation='';
    bwOn=true;coins.length=0;bwLoop();SFX.fanfare();
    let tier=0,t0=performance.now(),done=false,lastCoin=0,closing=false;
    const valAt=ms=>{for(let i=1;i<pts.length;i++){if(ms<=pts[i].t){const p=(ms-pts[i-1].t)/(pts[i].t-pts[i-1].t);return pts[i-1].v+(pts[i].v-pts[i-1].v)*p;}}return amount;};
    const setTier=v=>{let k=0;tiers.forEach((t,i)=>{if(v>=t.m*b-1e-9)k=i;});if(k!==tier){tier=k;ov.className='ov show '+tiers[k].cls;title.innerHTML=tiers[k].n;title.classList.remove('pop');void title.offsetWidth;title.classList.add('pop');SFX.tier();}};
    const finish=()=>{done=true;amt.textContent=fmt(amount);setTier(amount);amt.classList.add('done');SFX.win();setTimeout(close,turbo?1800:3000);};
    const close=()=>{if(closing)return;closing=true;ov.classList.add('out');setTimeout(()=>{ov.className='ov';bwOn=false;ov.onclick=null;resolve();},450);};
    ov.onclick=()=>{if(!done)finish();else close();};
    const st=t=>{if(done)return;const ms=t-t0;const v=valAt(ms);amt.textContent=fmt(v);setTier(v);if(t-lastCoin>70){SFX.coin();lastCoin=t;}if(ms>=tt)finish();else requestAnimationFrame(st);};
    requestAnimationFrame(st);});}
  
  /* ================= FREE SPINS ================= */
  function fsIntro(n,feat){return new Promise(res=>{const ov=$('#fsOv');ov.innerHTML=`<h2>FREE SPINS</h2><div class="big">${n}</div><img src="${IMG[feat]}" alt=""><p>${SYM[feat].n} จะปรากฏ 5 ถึง 10 ตัวในทุกสปิน</p><div class="hint">แตะเพื่อเริ่ม</div>`;ov.classList.add('show');SFX.fanfare();
    let ok=false;const go=()=>{if(ok)return;ok=true;ov.classList.remove('show');res();};ov.onclick=go;setTimeout(go,auto?2500:6000);});}
  function fsOutro(total){return new Promise(res=>{const ov=$('#fsOv');ov.innerHTML=`<h2>ฟรีสปินจบแล้ว</h2><p>ชนะทั้งหมด</p><div class="big" style="font-size:clamp(46px,14vw,74px)" id="fsTot">0.00</div><div class="hint">แตะเพื่อไปต่อ</div>`;ov.classList.add('show');
    countTo($('#fsTot'),0,total,1500);let ok=false;const go=()=>{if(ok)return;ok=true;ov.classList.remove('show');res();};setTimeout(()=>ov.onclick=go,600);setTimeout(go,4500);});}
  async function runFreeSpins(n,featArg,resume){const feat=featArg!=null?featArg:[MEL,APL,PIN,STR][rand(4)];await fsIntro(n,feat);
    fs={left:n,idx:resume?resume.idx:0,total:0,n:resume?resume.n:n,feat};app.classList.add('fs');refresh();
    while(fs.left>0){fs.left--;fs.idx++;if((await doSpin())===false)break;await wait(turbo?250:600);}
    const total=fs.total,b=bet();fs=null;app.classList.remove('fs');scatGlow=false;
    if(total>=b*10)await bigWin(total);await fsOutro(total);plankShow('WIN',fmt(total));winEl.textContent=fmt(total);refresh();}
  
  /* ================= SPIN FLOW ================= */
  const spinBtn=$('#spin');
  let reelsMoving=false,lastFeat=null;
  async function doSpin(){
    busy=true;WS=null;scatGlow=false;winPop.className='';app.classList.remove('bigLine');slammed=false;anticFired=false;
    let out=null;
    if(host){try{out=await host.call('spin',{bet:bet()})}catch(e){busy=false;setAuto(false);toast(e&&e.message==='insufficient_balance'?'ยอดเงินไม่พอ':'เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ');refresh();return false;}
      if(!alive)return false;
      if(out.fs&&fs){fs.left=out.fs.left-(out.fsAward||0);}}
    if(!fs){balance-=bet();winEl.textContent='0.00';plankMarquee();}else{plankShow(`FREE SPINS ${fs.idx}/${fs.n}`,fmt(fs.total));}
    refresh();spinBtn.classList.add('spinning');SFX.start();
    const final=out?out.grid:genGrid();reelsMoving=true;await startReels(final);reelsMoving=false;grid=final;
    spinBtn.classList.remove('spinning');
    const res=evaluate(final);
    if(out&&out.fs&&out.fsAward)lastFeat=out.fs.feat;
    if(res.total>0){
      const items=[...res.wins];if(res.scat)items.push(res.scat);
      const cellSet=new Set();items.forEach(it=>it.cells.forEach(([c,r])=>cellSet.add(c+','+r)));
      WS={items,cellSet,phase:'all',t0:performance.now(),idx:0};
      cellSet.forEach(k=>{const [c,r]=k.split(',').map(Number);const [x,y]=cellXY(c,r);burst(x,y,SYM[grid[c][r]].c);});
      SFX.burst();setTimeout(SFX.win,120);
      const b=bet();if(res.total>=b*5)app.classList.add('bigLine');
      balance+=res.total;
      if(fs){fs.total+=res.total;}
      if(res.total>=b*10){await wait(700);await bigWin(res.total);}
      const prevPlank=fs?fs.total-res.total:0;
      if(fs)plankShow(`FREE SPINS ${fs.idx}/${fs.n}`,fmt(fs.total));else plankShow('WIN',fmt(0));
      const small=res.total<b*10;const dur=small?(turbo?700:1500):(turbo?500:1100);
      await Promise.all([countTo(plankAmt,prevPlank,fs?fs.total:res.total,dur),countTo(winEl,0,res.total,dur),small?showWinPop(res.total,dur):null]);
      refresh();if(small){await wait(turbo?500:1100);await hideWinPop();}else await wait(turbo?150:500);
      if(WS){WS.phase='cycle';WS.t1=performance.now();}
    } else {if(!fs)SFX.lose();}
    if(res.scat){scatGlow=true;await wait(900);
      if(fs){fs.left+=15;fs.n+=15;toast('+15 ฟรีสปิน');await wait(1000);}
      else{const wasAuto=auto;if(host)host.round(out.wager,res.total);out=null;await runFreeSpins(15,host&&lastFeat!=null?lastFeat:undefined);if(!wasAuto)setAuto(false);}}
    if(host&&out)host.round(out.wager,res.total);
    busy=false;refresh();}
  
  async function onSpin(){ac();
    if(reelsMoving){slam();return;}
    if(busy||fs)return;
    if(balance<bet()){toast('ยอดเงินไม่พอ ลดเดิมพันลงก่อน');plank.classList.remove('flash');void plank.offsetWidth;plank.classList.add('flash');setAuto(false);return;}
    SFX.click();await doSpin();}
  spinBtn.addEventListener('click',onSpin,sig);
  document.addEventListener('keydown',e=>{if(e.code==='Space'&&!/INPUT|TEXTAREA/.test(e.target.tagName)){e.preventDefault();onSpin();}},sig);
  $('#minus').onclick=()=>{if(busy||fs||betIdx===0)return;betIdx--;SFX.click();refresh();toast('เดิมพัน '+fmt(bet()));};
  $('#plus').onclick=()=>{if(busy||fs||betIdx===BETS.length-1)return;betIdx++;SFX.click();refresh();toast('เดิมพัน '+fmt(bet()));};
  $('#turbo').onclick=()=>{turbo=!turbo;$('#turbo').classList.toggle('on',turbo);SFX.click();toast(turbo?'หมุนเร็ว: เปิด':'หมุนเร็ว: ปิด');};
  function setAuto(v){auto=v;$('#auto').classList.toggle('on',v);$('#autoCount').textContent=v?'AUTO':'';}
  $('#auto').onclick=async()=>{ac();SFX.click();if(auto){setAuto(false);return;}setAuto(true);
    while(auto&&alive){if(!busy&&!fs){if(balance<bet()){setAuto(false);toast('ยอดเงินไม่พอ');break;}await doSpin();await wait(turbo?250:700);}else await wait(200);}};
  
  /* paytable */
  function buildPT(){const b=bet()/20;let h='<h3>ตารางรางวัล</h3><p>รางวัลด้านล่างคำนวณจากเดิมพันปัจจุบัน '+fmt(bet())+'</p>';
    [W_,MEL,APL,PIN,STR,BAN,PLM,CHR].forEach(i=>{const p=SYM[i].pay;h+=`<div class="row"><img src="${IMG[i]}" alt=""><div>${i===W_?'<b>WILD</b> แทนทุกสัญลักษณ์ยกเว้น SCATTER<br>':''}5 ตัว <b>${fmt(p[5]*b)}</b><br>4 ตัว <b>${fmt(p[4]*b)}</b><br>3 ตัว <b>${fmt(p[3]*b)}</b></div></div>`;});
    const sp=SYM[SC].pay;h+=`<div class="row"><img src="${IMG[SC]}" alt=""><div><b>SCATTER</b> ขึ้นตรงไหนก็ได้<br>3 ตัว <b>${fmt(sp[3]*bet())}</b> + 15 ฟรีสปิน<br>4 ตัว <b>${fmt(sp[4]*bet())}</b> · 5 ตัว <b>${fmt(sp[5]*bet())}</b></div></div>`;
    h+='<p>ระหว่างฟรีสปินจะสุ่มผลไม้พิเศษ 1 ชนิด และผลไม้นั้นจะปรากฏ 5 ถึง 10 ตัวในทุกสปิน SCATTER 3 ตัวระหว่างฟรีสปินได้เพิ่มอีก 15 ครั้ง</p><p>เกมนี้ใช้เครดิตจำลองเพื่อความบันเทิงเท่านั้น</p>';$('#ptBody').innerHTML=h;}
  $('#ptBtn').onclick=()=>{buildPT();$('#pt').classList.add('show');};
  $('#ptClose').onclick=()=>$('#pt').classList.remove('show');
  
  
  /* ================= INTRO (3s title) ================= */
  function playIntro(){const el=$('#intro');if(!el)return;let done=false;
    const end=()=>{if(done)return;done=true;el.classList.add('out');setTimeout(()=>{el.classList.add('gone');},560);};
    el.addEventListener('click',()=>{ac();end();},sig);
    setTimeout(()=>{if(alive)end();},3000);}
  
  /* ================= LOOP ================= */
  let last=performance.now();
  function frame(t){if(!alive)return;const dt=Math.min(.05,(t-last)/1000);last=t;updateReels(t,dt);stepParts(dt);drawReels(t);requestAnimationFrame(frame);}
  function boot(){if(!alive)return;buildSprites();layout();refresh();requestAnimationFrame(frame);}
  playIntro();
  window.addEventListener('resize',layout,sig);
  const ro=typeof ResizeObserver!=='undefined'?new ResizeObserver(()=>layout()):null;if(ro)ro.observe(app);
  const fontsReady=document.fonts&&document.fonts.load?Promise.race([Promise.all([document.fonts.load('40px "Lilita One"'),document.fonts.load('16px Kanit')]),wait(2500)]):Promise.resolve();
  fontsReady.then(boot,boot);
  // keep the balance in step with the shared wallet while idle; resume free spins still owed
  const syncT=host?setInterval(()=>{if(!busy&&!fs){const b=host.getBalance();if(Math.abs(b-balance)>0.004){balance=b;refresh();}}},400):0;
  if(host)host.state().then(async s=>{const f=s&&s.fs;if(!alive||!f||!(f.left>0))return;const i=BETS.indexOf(f.bet);if(i>=0)betIdx=i;refresh();await wait(3300);if(!alive||busy||fs)return;
    busy=true;await runFreeSpins(f.left,f.feat,{idx:f.idx,n:f.n});busy=false;refresh();});
  
  return ()=>{alive=false;clearInterval(syncT);auto=false;bwOn=false;abort.abort();if(ro)ro.disconnect();try{AC&&AC.close();}catch(e){}};
}

export default function FruitCanopySlots({ brand = "WINNER 69", host }) {
  const rootRef = useRef(null);

  useEffect(() => {
    const cleanup = initGame(rootRef.current, host);
    return cleanup;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div ref={rootRef} className="fc-root">
      <style>{CSS}</style>
      <div id="app">
        <div id="intro" role="img" aria-label={brand}>
          <div className="iRays" /><div className="iFlare" />
          <div className="iTitle" id="introTitle">{brand}</div>
          <div className="iSub">FRUIT CANOPY</div>
          <div className="iBar"><i /></div>
          <div className="iSkip">แตะเพื่อข้าม</div>
        </div>
        <div id="top">
          <div className="canopy" aria-hidden="true">
            <svg viewBox="0 0 400 260" preserveAspectRatio="xMidYMid slice">
              <defs>
                <linearGradient id="lf1" x1="0" x2="1"><stop offset="0" stopColor="#0f4d2c"/><stop offset="1" stopColor="#1f7a3e"/></linearGradient>
                <linearGradient id="lf2" x1="0" x2="1"><stop offset="0" stopColor="#174f6a"/><stop offset="1" stopColor="#0d3346"/></linearGradient>
                <linearGradient id="trunk" x1="0" x2="1"><stop offset="0" stopColor="#1a2a22"/><stop offset="1" stopColor="#0c1712"/></linearGradient>
              </defs>
              <rect x="40" y="0" width="26" height="260" fill="url(#trunk)" opacity=".7"/>
              <rect x="330" y="0" width="32" height="260" fill="url(#trunk)" opacity=".7"/>
              <g className="sway b" fill="url(#lf2)" opacity=".9">
                <path d="M0 40 Q60 20 120 70 Q60 80 0 70Z"/><path d="M0 120 Q70 90 130 140 Q60 150 0 150Z"/>
                <path d="M400 30 Q330 20 280 80 Q350 85 400 70Z"/><path d="M400 130 Q320 110 270 160 Q340 165 400 160Z"/>
              </g>
              <g className="sway" fill="url(#lf1)">
                <path d="M-10 -5 Q70 10 95 60 Q40 50 -10 40Z"/><path d="M-10 70 Q55 60 80 110 Q30 110 -10 100Z"/>
                <path d="M410 -5 Q330 10 300 55 Q360 50 410 40Z"/><path d="M410 80 Q340 70 315 120 Q370 118 410 108Z"/>
                <path d="M150 -10 Q170 30 140 60 Q125 30 150 -10Z"/><path d="M250 -10 Q235 35 265 58 Q280 25 250 -10Z"/>
              </g>
              <g stroke="#2f7a2a" strokeWidth="3" fill="none" opacity=".8">
                <path d="M100 0 Q95 60 110 120"/><path d="M300 0 Q310 50 295 110"/><path d="M180 0 Q175 30 185 50"/>
              </g>
              <g fill="#5cc43a" opacity=".85">
                <ellipse cx="104" cy="40" rx="6" ry="3" transform="rotate(30 104 40)"/><ellipse cx="98" cy="80" rx="6" ry="3" transform="rotate(-30 98 80)"/>
                <ellipse cx="306" cy="35" rx="6" ry="3" transform="rotate(-30 306 35)"/><ellipse cx="302" cy="80" rx="6" ry="3" transform="rotate(30 302 80)"/>
              </g>
            </svg>
          </div>
          <div id="flies" />
          <button id="mute" aria-label="ปิด/เปิดเสียง"></button>
          <div id="peek" aria-hidden="true" />
          <div id="logo" aria-label="Fruit Canopy"><span className="l1">FRUIT</span><span className="l2">CANOPY</span><i className="berry" /></div>
          <svg className="flowers l" viewBox="0 0 60 60" aria-hidden="true"><g fill="#ffd21a" stroke="#c77a00" strokeWidth="1.5"><path d="M30 30 L22 4 L34 6Z"/><path d="M30 30 L56 22 L54 34Z"/><path d="M30 30 L38 56 L26 54Z"/><path d="M30 30 L4 38 L6 26Z"/><path d="M30 30 L50 10 L52 18Z"/><path d="M30 30 L10 50 L8 42Z"/></g><circle cx="30" cy="30" r="7" fill="#ff7a1a"/></svg>
          <svg className="flowers r" viewBox="0 0 60 60" aria-hidden="true"><g fill="#ffd21a" stroke="#c77a00" strokeWidth="1.5"><path d="M30 30 L22 4 L34 6Z"/><path d="M30 30 L56 22 L54 34Z"/><path d="M30 30 L38 56 L26 54Z"/><path d="M30 30 L4 38 L6 26Z"/><path d="M30 30 L50 10 L52 18Z"/><path d="M30 30 L10 50 L8 42Z"/></g><circle cx="30" cy="30" r="7" fill="#ff7a1a"/></svg>
          <div id="plank"><div id="marq" /><div id="plankWin"><small id="plankLbl">WIN</small><span id="plankAmt">0.00</span></div></div>
        </div>
      
        <div id="reelBox"><canvas id="reels" /><div id="winPop" aria-live="polite"><div className="wpRays" /><div className="wpGlow" /><div id="wpLbl">WIN</div><div id="wpAmt">0.00</div></div></div>
        <div id="grass" aria-hidden="true">
          <svg viewBox="0 0 400 44" preserveAspectRatio="none">
            <defs><linearGradient id="gr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7ee04a"/><stop offset=".5" stopColor="#2f9a2c"/><stop offset="1" stopColor="#0b3a12"/></linearGradient></defs>
            <path id="grassPath" fill="url(#gr)"/>
          </svg>
        </div>
      
        <div id="info">
          <div className="ic" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v10M9 9.5c0-1 1.3-1.8 3-1.8s3 .8 3 1.8-1.3 1.7-3 2-3 1-3 2 1.3 1.8 3 1.8 3-.8 3-1.8"/></svg></div>
          <div className="pill"><small>ยอดเงิน</small><span id="bal">0.00</span></div>
          <div className="pill" id="winPill"><small>ชนะ</small><span id="winV">0.00</span></div>
          <div className="pill"><small>เดิมพัน</small><span id="betV">0.00</span></div>
          <button className="ic" id="ptBtn" aria-label="ตารางรางวัล"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/></svg></button>
        </div>
      
        <div id="ctrl">
          <button className="cbtn" id="turbo" aria-label="หมุนเร็ว"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 2 4 14h6l-1 8 9-12h-6z"/></svg></button>
          <button className="cbtn" id="minus" aria-label="ลดเดิมพัน"><svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M5 12h14"/></svg></button>
          <button id="spin" aria-label="หมุน">
            <svg className="leafring" viewBox="0 0 124 124" aria-hidden="true"><g fill="#5fbf35" stroke="#1d4a12" strokeWidth="1.2" strokeLinejoin="round"><g transform="rotate(-52 62 62) translate(62 9) rotate(-28) scale(1)"><path d="M0 2 q-8 -11 0 -24 q8 13 0 24z"/><path d="M0 0 v-18" fill="none" stroke="#c9f59a" strokeWidth="1"/></g><g transform="rotate(-52 62 62) translate(62 9) rotate(22) scale(0.8)"><path d="M0 2 q-8 -11 0 -24 q8 13 0 24z"/><path d="M0 0 v-18" fill="none" stroke="#c9f59a" strokeWidth="1"/></g><g transform="rotate(52 62 62) translate(62 9) rotate(-28) scale(1)"><path d="M0 2 q-8 -11 0 -24 q8 13 0 24z"/><path d="M0 0 v-18" fill="none" stroke="#c9f59a" strokeWidth="1"/></g><g transform="rotate(52 62 62) translate(62 9) rotate(22) scale(0.8)"><path d="M0 2 q-8 -11 0 -24 q8 13 0 24z"/><path d="M0 0 v-18" fill="none" stroke="#c9f59a" strokeWidth="1"/></g><g transform="rotate(-128 62 62) translate(62 9) rotate(-28) scale(1)"><path d="M0 2 q-8 -11 0 -24 q8 13 0 24z"/><path d="M0 0 v-18" fill="none" stroke="#c9f59a" strokeWidth="1"/></g><g transform="rotate(-128 62 62) translate(62 9) rotate(22) scale(0.8)"><path d="M0 2 q-8 -11 0 -24 q8 13 0 24z"/><path d="M0 0 v-18" fill="none" stroke="#c9f59a" strokeWidth="1"/></g><g transform="rotate(128 62 62) translate(62 9) rotate(-28) scale(1)"><path d="M0 2 q-8 -11 0 -24 q8 13 0 24z"/><path d="M0 0 v-18" fill="none" stroke="#c9f59a" strokeWidth="1"/></g><g transform="rotate(128 62 62) translate(62 9) rotate(22) scale(0.8)"><path d="M0 2 q-8 -11 0 -24 q8 13 0 24z"/><path d="M0 0 v-18" fill="none" stroke="#c9f59a" strokeWidth="1"/></g></g></svg>
            <svg viewBox="0 0 48 48" aria-hidden="true"><g fill="none" stroke="#fff8d8" strokeWidth="5" strokeLinecap="round"><path d="M38 20A15 15 0 0 0 11 15"/><path d="M10 28a15 15 0 0 0 27 5"/></g><path d="M7 8l2 11 10-4z" fill="#fff8d8"/><path d="M41 40l-2-11-10 4z" fill="#fff8d8"/></svg>
          </button>
          <button className="cbtn" id="plus" aria-label="เพิ่มเดิมพัน"><svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M5 12h14M12 5v14"/></svg></button>
          <button className="cbtn" id="auto" aria-label="หมุนอัตโนมัติ" style={{position:"relative"}}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M10 8.5v7l6-3.5z" fill="currentColor"/></svg><span id="autoCount" /></button>
        </div>
      
        <div className="ov" id="bw">
          <div className="glow" /><div className="rays" /><canvas id="bwfx" />
          <div id="bwTitle">BIG WIN</div>
          <div id="bwAmt">0.00</div>
          <div id="bwBird" />
          <div className="hint">แตะเพื่อข้าม</div>
        </div>
        <div className="ov" id="fsOv" />
        <div className="ov" id="pt"><button id="ptClose" aria-label="ปิด">{"✕"}</button><div id="ptBody" style={{display:"flex",flexDirection:"column",alignItems:"center",width:"100%"}} /></div>
        <div id="toast" />
      </div>
    </div>
  );
}
