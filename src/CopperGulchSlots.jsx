/*
 * Copper Gulch — cascading slots (React / JSX)
 * ใช้งาน: import CopperGulchSlots from "./CopperGulchSlots"; แล้ววาง <CopperGulchSlots /> ในหน้าเพจ
 * โครง UI เขียนเป็น JSX ส่วนเอนจินแอนิเมชัน (หมุน แตก ร่วง อนุภาค เสียง) ทำงานใน useEffect
 * เพราะต้องควบคุม DOM/Canvas แบบเฟรมต่อเฟรม
 */
// Imported into WINNER 69: credits come from the shared wallet and every spin - the first screen,
// every cascade refill and the multiplier - is decided by backend/src/extraGames.js (on the server,
// or locally without one); this file only replays it.
import React, { useEffect, useRef } from "react";

const CSS = `@import url('https://fonts.googleapis.com/css2?family=Rye&family=Mitr:wght@400;600&display=swap');

:root{}
.cg{
  --ink:#1a1022; --plum:#2c1838; --copper:#c4703a; --copper-d:#7a3a18; --brass:#f2c040; --bone:#f6e7c8;
  --bed1:#251632; --bed2:#140b1d; --ember:#ff7a2a;
  --disp:'Rye', 'Georgia', serif; --ui:'Mitr', 'Tahoma', system-ui, sans-serif;
  --c:64px;--ch:64px;
  box-sizing:border-box;
  padding-top:env(safe-area-inset-top,0px); padding-bottom:env(safe-area-inset-bottom,0px);
}
.cg *,.cg *::before,.cg *::after{box-sizing:inherit}
.cg{position:fixed;inset:0;margin:0;background:#0d0712;color:var(--bone);font-family:var(--ui);overflow:hidden;
  -webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
.cg button{font-family:inherit;color:inherit;cursor:pointer;border:0;background:none}
.cg button:focus-visible{outline:2px solid var(--brass);outline-offset:3px}

.cg /* ---------- backdrop ---------- */
#backdrop{position:fixed;inset:0;z-index:0;filter:blur(10px) brightness(.55);transform:scale(1.15)}
.cg #backdrop svg,.cg #scene svg{width:100%;height:100%;display:block}
.cg #app{position:relative;z-index:1;height:100%;max-width:480px;margin:0 auto;display:flex;flex-direction:column;
  align-items:center;overflow:hidden;box-shadow:0 0 60px #000}
.cg #app>*{flex-shrink:0}
@media (max-height:700px){
  .cg #mwrap{height:40px}.cg .mt.on{font-size:21px}
  .cg #ways{margin:4px 0 3px}
  .cg #winbar{margin-top:18px;height:34px}
  .cg #console{padding:8px 10px 8px}.cg #stats{height:40px}
  .cg .spinwrap{width:88px;height:88px}.cg #spin{width:80px;height:80px}.cg #spin svg{width:48px;height:48px}
  .cg .cb{width:42px;height:42px}.cg .cb.sm{width:36px;height:36px}
  .cg #ctrl{padding-top:6px}
}
.cg .st{padding:0 6px}
.cg #scene{position:absolute;inset:0;z-index:-1;transition:filter 1.2s}
.cg.fs #scene{filter:hue-rotate(-28deg) saturate(1.5) brightness(.9)}
.cg.fs #backdrop{filter:blur(10px) brightness(.5) hue-rotate(-28deg) saturate(1.5)}

.cg /* ---------- header / multiplier track ---------- */
#top{width:100%;padding:8px 10px 0;display:flex;align-items:center;gap:8px}
.cg #logo{font-family:var(--disp);font-size:20px;line-height:1;letter-spacing:.5px;color:var(--brass);
  text-shadow:0 2px 0 var(--copper-d),0 0 14px rgba(255,170,60,.5);flex:1}
.cg .iconbtn{width:34px;height:34px;border-radius:50%;background:rgba(0,0,0,.35);display:grid;place-items:center;
  box-shadow:inset 0 0 0 1.5px rgba(242,192,64,.45)}
.cg .iconbtn svg{width:18px;height:18px;fill:var(--bone)}

.cg #mwrap{position:relative;width:calc(100% - 20px);height:46px;margin-top:6px;border-radius:30px;
  background:linear-gradient(#5a2c16,#3a1a0c);box-shadow:inset 0 2px 0 #a8602e,inset 0 -3px 0 #1d0b04,0 6px 14px rgba(0,0,0,.6);
  overflow:hidden}
.cg #mwrap::before,.cg #mwrap::after{content:"";position:absolute;top:0;bottom:0;width:70px;z-index:2;pointer-events:none}
.cg #mwrap::before{left:0;background:linear-gradient(90deg,#3a1a0c,transparent)}
.cg #mwrap::after{right:0;background:linear-gradient(-90deg,#3a1a0c,transparent)}
.cg #mstrip{position:absolute;top:0;left:50%;height:100%;display:flex;align-items:center;transition:transform .55s cubic-bezier(.3,1.4,.5,1)}
.cg .mt{width:62px;text-align:center;font-family:var(--disp);font-size:14px;color:#c79a6a;opacity:.75;transition:all .45s;flex:none}
.cg .mt.on{font-size:24px;color:#fff3c4;opacity:1;text-shadow:0 0 12px #ffb02e,0 2px 0 #7a3a10}
.cg .mt.big{font-size:12px}.cg .mt.on.big{font-size:18px}
.cg #mflare{position:absolute;left:50%;top:50%;width:96px;height:96px;margin:-48px;border-radius:50%;pointer-events:none;z-index:1;
  background:radial-gradient(circle,rgba(255,230,140,.9),rgba(255,160,40,.25) 45%,transparent 70%);opacity:0}

.cg #ways{font-size:12px;letter-spacing:.3px;margin:6px 0 4px;padding:2px 14px;border-radius:10px;background:rgba(0,0,0,.4);
  color:#e9cfa0;box-shadow:inset 0 0 0 1px rgba(242,192,64,.3)}

.cg /* ---------- board ---------- */
#frame{position:relative;padding:7px;border-radius:14px;
  background:linear-gradient(160deg,#e6a25e,#8a4520 30%,#c47a3c 55%,#6a3014 80%,#d08a48);
  box-shadow:0 10px 30px rgba(0,0,0,.7),inset 0 0 0 1px #ffd59a}
.cg .rivet{position:absolute;width:7px;height:7px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#ffe8b0,#8a5020 70%)}
.cg #board{position:relative;width:calc(var(--c)*6);height:calc(var(--ch)*5);overflow:hidden;border-radius:9px;
  background:
   radial-gradient(ellipse at 50% 0%,rgba(255,150,80,.18),transparent 60%),
   repeating-linear-gradient(90deg,transparent 0 calc(var(--c) - 1px),rgba(255,210,150,.07) calc(var(--c) - 1px) var(--c)),
   linear-gradient(var(--bed1),var(--bed2));
  box-shadow:inset 0 0 24px rgba(0,0,0,.9)}
.cg.fs #board{background:
   radial-gradient(ellipse at 50% 0%,rgba(255,90,40,.28),transparent 60%),
   repeating-linear-gradient(90deg,transparent 0 calc(var(--c) - 1px),rgba(255,210,150,.08) calc(var(--c) - 1px) var(--c)),
   linear-gradient(#3a1420,#170810)}
.cg .cell,.cg .sc{position:absolute;left:0;top:0;width:var(--c);height:var(--ch);will-change:transform}
.cg .sym{position:absolute;left:6%;top:50%;width:88%;height:var(--c);margin-top:calc(var(--c)*-.5);filter:drop-shadow(0 3px 2px rgba(0,0,0,.65));transition:filter .25s, transform .25s}
.cg .cell.dim .sym{filter:brightness(.35) saturate(.6) drop-shadow(0 3px 2px rgba(0,0,0,.65))}
.cg .gf{position:absolute;inset:3px;border-radius:9px;pointer-events:none;
  border:2.5px solid #ffd45a;box-shadow:0 0 8px #ffb52e,inset 0 0 8px rgba(255,190,60,.7);overflow:hidden}
.cg .gf::before{content:"";position:absolute;inset:-2px;background:linear-gradient(115deg,transparent 35%,rgba(255,255,255,.65) 50%,transparent 65%);
  transform:translateX(-120%);animation:sheen 2.6s infinite}
.cg .gf::after{content:"";position:absolute;inset:2px;border:1px dashed rgba(255,226,140,.55);border-radius:6px}
@keyframes sheen{60%,100%{transform:translateX(120%)}}
.cg .strip{position:absolute;top:0;width:var(--c);will-change:transform}
.cg .strip.blur .sym{filter:blur(1.6px) brightness(.9)}
.cg .strip .sc{position:relative;display:block}

.cg /* hit marker */
.halo{position:absolute;left:50%;top:50%;width:calc(var(--c)*.96);height:calc(var(--c)*.96);margin:calc(var(--c)*-.48);border-radius:50%;pointer-events:none;
  background:radial-gradient(circle,rgba(255,240,170,.95) 0%,rgba(255,180,40,.75) 38%,rgba(200,90,10,.35) 62%,transparent 70%);
  animation:haloIn .3s ease-out both}
.cg .ret{position:absolute;left:50%;top:50%;width:calc(var(--c)*1.08);height:calc(var(--c)*1.08);margin:calc(var(--c)*-.54);pointer-events:none;animation:retSpin 1.6s linear infinite, haloIn .3s ease-out both}
@keyframes haloIn{from{transform:scale(.2);opacity:0}}
@keyframes retSpin{to{rotate:360deg}}
.cg .cell.hit .sym{animation:hitPulse .5s ease-in-out infinite alternate}
@keyframes hitPulse{to{transform:scale(1.12)}}
.cg .hole{position:absolute;width:30%;height:30%;margin:-15%;pointer-events:none;animation:holeIn .12s ease-out both}
@keyframes holeIn{from{transform:scale(2.4);opacity:0}}

.cg /* anticipation */
.antic{position:absolute;top:0;height:100%;width:var(--c);pointer-events:none;opacity:0;transition:opacity .25s;z-index:3}
.cg .antic.on{opacity:1}
.cg .antic::before{content:"";position:absolute;inset:-10px -6px;border-radius:10px;
  background:linear-gradient(0deg,rgba(255,90,0,.0),rgba(255,140,20,.45) 40%,rgba(255,220,120,.6) 50%,rgba(255,140,20,.45) 60%,rgba(255,90,0,0));
  background-size:100% 200%;animation:fireMove .5s linear infinite;mix-blend-mode:screen}
.cg .antic::after{content:"";position:absolute;inset:0;border-left:3px solid #ffcc55;border-right:3px solid #ffcc55;
  box-shadow:0 0 18px #ff9a22,inset 0 0 18px #ff9a22;animation:flick .12s infinite alternate}
@keyframes fireMove{to{background-position:0 -200%}}
@keyframes flick{to{opacity:.65}}

.cg #mpop{position:absolute;z-index:6;pointer-events:none;font-family:var(--disp);font-size:calc(var(--c)*.9);color:#fff4c8;
  -webkit-text-stroke:2px #7a3200;text-shadow:0 0 20px #ff9c1a,0 4px 0 #5a2200;opacity:0;transform:translate(-50%,-50%)}

.cg /* feature buy */
#buy{position:absolute;right:-6px;bottom:-26px;z-index:7;width:64px;height:44px;border-radius:10px;
  background:linear-gradient(#d4853f,#7d3c17);box-shadow:inset 0 1.5px 0 #ffd59a,inset 0 -2px 0 #3a1608,0 4px 10px rgba(0,0,0,.6);
  font-family:var(--disp);font-size:12px;line-height:1.05;color:#fff0c4;text-shadow:0 1px 0 #5a2200;transform:rotate(-4deg)}
.cg #buy:disabled{filter:grayscale(.8) brightness(.6)}

.cg /* ---------- win bar & panels ---------- */
#winbar{position:relative;width:calc(var(--c)*6 + 4px);height:38px;margin-top:24px;border-radius:8px;overflow:hidden;
  background:linear-gradient(#4a2412,#2a1208);box-shadow:inset 0 1px 0 #a8602e,inset 0 -2px 0 #140602,0 4px 10px rgba(0,0,0,.5);
  display:grid;place-items:center}
.cg #tick{white-space:nowrap;font-size:13px;color:#e8cfa2;position:absolute;left:100%;animation:marq 16s linear infinite}
@keyframes marq{to{transform:translateX(calc(-100% - 480px))}}
.cg #winTxt{font-family:var(--disp);font-size:20px;color:#fff1c0;text-shadow:0 0 10px #ff9c1a,0 2px 0 #5a2200;display:none}
.cg #winbar.won #tick{display:none}.cg #winbar.won #winTxt{display:block}
.cg #winbar.flash{animation:barFlash .5s}
@keyframes barFlash{30%{box-shadow:inset 0 0 22px #ffcf5a,0 0 22px #ffb030}}

.cg #fspanel{display:none;margin-top:8px;align-items:center;gap:10px;padding:4px 18px;border-radius:10px;
  background:linear-gradient(#6a2a10,#3a1206);box-shadow:inset 0 1px 0 #d8884a,0 4px 12px rgba(0,0,0,.6)}
.cg.fs #fspanel{display:flex}
.cg #fspanel span{font-family:var(--disp);font-size:14px;line-height:1.1;color:#ffd99a;text-align:right}
.cg #fsLeft{font-family:var(--disp);font-size:36px;color:#fff3c4;text-shadow:0 0 12px #ff8a1a,0 3px 0 #5a1a00}
.cg #fsLeft.bump{animation:bump .4s}
@keyframes bump{40%{transform:scale(1.5)}}

.cg /* ---------- bottom console ---------- */
#console{position:relative;width:100%;margin-top:auto;padding:10px 12px 12px;
  background:linear-gradient(180deg,rgba(46,20,12,.96),rgba(18,7,5,.98));
  border-radius:26px 26px 0 0;
  box-shadow:0 -1.5px 0 #d08a48,0 -2.5px 0 #5a2410,0 -14px 30px rgba(0,0,0,.55),inset 0 1px 0 rgba(255,210,150,.18)}
.cg #console::before{content:"";position:absolute;left:50%;top:-1.5px;width:170px;height:12px;transform:translateX(-50%);
  background:radial-gradient(ellipse at 50% 0,rgba(255,190,90,.55),transparent 70%);pointer-events:none}

.cg #stats{display:grid;grid-template-columns:1.25fr 1fr 1fr;align-items:center;height:46px;padding:0 4px;border-radius:23px;
  background:linear-gradient(#120604,#26100a);box-shadow:inset 0 2px 6px rgba(0,0,0,.8),inset 0 0 0 1px rgba(242,192,64,.22),0 1px 0 rgba(255,210,150,.12)}
.cg .st{display:flex;align-items:center;gap:7px;min-width:0;padding:0 8px;height:30px;border:0;background:none;text-align:left;font:inherit;color:inherit}
.cg .st+.st{border-left:1px solid rgba(242,192,64,.18)}
.cg .st .ic{flex:none;width:24px;height:24px;border-radius:50%;display:grid;place-items:center;
  background:radial-gradient(circle at 40% 30%,#ffe6a0,#e0a032 55%,#8a5210);box-shadow:0 1px 0 #3a1a06,inset 0 -1px 0 rgba(0,0,0,.25)}
.cg .st .ic svg{width:14px;height:14px;fill:#5a2a06}
.cg .st .tx{display:flex;flex-direction:column;min-width:0;line-height:1.1}
.cg .st small{font-size:10.5px;color:#c9a679}
.cg .st b{font-weight:600;font-size:clamp(12px,3.7vw,15px);color:#fff6e2;font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cg #betBox{cursor:pointer}
.cg #betBox small::after{content:" ▾";color:#f2c040}
.cg #betBox:disabled{cursor:default}.cg #betBox:disabled small::after{content:""}
.cg #winv.hot{color:#ffe07a;text-shadow:0 0 10px rgba(255,170,40,.9);animation:valPop .35s ease-out}
@keyframes valPop{40%{transform:scale(1.18)}}
.cg #bal.hot{animation:valPop .35s ease-out}

.cg #ctrl{display:grid;grid-template-columns:1fr auto auto auto 1fr;align-items:center;gap:10px;padding-top:10px}
.cg .side{display:flex;flex-direction:column;align-items:center;gap:4px;font-size:10.5px;color:#c9a679}
.cg .side:first-child{justify-self:start;padding-left:4px}.cg .side:last-child{justify-self:end;padding-right:4px}
.cg .cb{width:48px;height:48px;border-radius:50%;display:grid;place-items:center;position:relative;
  border:2px solid transparent;
  background:radial-gradient(circle at 50% 30%,#4c2416,#1c0905 75%) padding-box,linear-gradient(160deg,#ffd98a,#a8602a 45%,#4a1c08 70%,#d89a50) border-box;
  box-shadow:0 4px 8px rgba(0,0,0,.55),inset 0 1px 0 rgba(255,220,170,.25);transition:transform .12s,box-shadow .2s,filter .2s}
.cg .cb:active{transform:scale(.9)}
.cg .cb svg{width:22px;height:22px;fill:#f6e4c4;filter:drop-shadow(0 1px 0 #000)}
.cg .cb.sm{width:40px;height:40px}.cg .cb.sm svg{width:18px;height:18px}
.cg .cb.on{background:radial-gradient(circle at 50% 35%,#ffcf5a,#e07a18 55%,#7a3008) padding-box,linear-gradient(160deg,#fff2c0,#e0a040) border-box;
  box-shadow:0 0 16px rgba(255,160,40,.85),inset 0 1px 0 #fff2c0}
.cg .cb.on svg{fill:#fff;filter:drop-shadow(0 1px 0 #6a2a00)}
.cg .cb:disabled{filter:grayscale(.7) brightness(.5)}
.cg #auto b{font-family:var(--disp);font-size:13px;color:#f6e4c4;line-height:1}
.cg .cb.on b{color:#fff!important}

.cg .spinwrap{position:relative;width:104px;height:104px;margin:-2px 0 0;display:grid;place-items:center}
.cg .spinwrap::before{content:"";position:absolute;inset:-5px;border-radius:50%;
  background:conic-gradient(from 0deg,transparent 0 55%,rgba(255,220,130,.0) 60%,rgba(255,226,140,.95) 72%,transparent 80%,transparent);
  -webkit-mask:radial-gradient(circle,transparent 61%,#000 62%,#000 70%,transparent 71%);mask:radial-gradient(circle,transparent 61%,#000 62%,#000 70%,transparent 71%);
  animation:rot 3.2s linear infinite}
.cg .spinwrap::after{content:"";position:absolute;inset:4px;border-radius:50%;box-shadow:0 0 22px 2px rgba(255,140,30,.45);animation:breath 2.2s ease-in-out infinite;pointer-events:none}
@keyframes breath{50%{box-shadow:0 0 34px 6px rgba(255,160,40,.7)}}
.cg .spinwrap.go::before{animation-duration:.7s}
.cg .spinwrap.go::after{animation:none;box-shadow:0 0 30px 6px rgba(255,170,50,.8)}
.cg #spin{position:relative;width:96px;height:96px;border-radius:50%;border:5px solid transparent;display:grid;place-items:center;overflow:hidden;
  background:radial-gradient(circle at 50% 30%,#ffd690 0,#f59536 30%,#c0561a 62%,#5e1e06 100%) padding-box,
             conic-gradient(from 200deg,#fff0c0,#c47a34,#5a2208,#e8a858,#fff0c0,#9a4a18,#fff0c0) border-box;
  box-shadow:0 0 0 3px #2a0e04,0 10px 22px rgba(0,0,0,.75),inset 0 -6px 12px rgba(80,20,0,.6);transition:transform .12s,filter .2s}
.cg #spin::after{content:"";position:absolute;left:14%;right:14%;top:5%;height:42%;border-radius:50%;
  background:linear-gradient(rgba(255,255,255,.55),rgba(255,255,255,0));pointer-events:none}
.cg #spin:active{transform:scale(.92);filter:brightness(.9)}
.cg #spin:disabled{filter:grayscale(.5) brightness(.7)}
.cg #spin svg{width:58px;height:58px;filter:drop-shadow(0 2px 0 #6a2400);transition:opacity .2s}
.cg #spin.go svg{animation:rot .45s linear infinite}
.cg #spin .autoN{position:absolute;inset:0;display:none;flex-direction:column;align-items:center;justify-content:center;line-height:1}
.cg #spin.auto .autoN{display:flex}.cg #spin.auto svg{opacity:0}
.cg #spin .autoN b{font-family:var(--disp);font-size:30px;color:#fff;text-shadow:0 2px 0 #6a2400}
.cg #spin .autoN small{font-size:11px;color:#fff1d0;margin-top:2px}
.cg .sheet .bets{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:12px}
.cg .sheet .bets button{height:48px;border-radius:12px;font-size:17px;font-weight:600;background:rgba(255,255,255,.06);box-shadow:inset 0 0 0 1.5px rgba(242,192,64,.35)}
.cg .sheet .bets button.sel{background:linear-gradient(#f0a048,#9a4a18);box-shadow:inset 0 2px 0 #ffd8a0,0 0 14px rgba(255,150,40,.6)}
@keyframes rot{to{transform:rotate(360deg)}}

.cg /* ---------- overlays ---------- */
.ov{position:fixed;inset:0;z-index:40;display:none;place-items:center;text-align:center}
.cg .ov.show{display:grid}
.cg .ov .rays{position:absolute;left:50%;top:44%;width:180vmax;height:180vmax;margin:-90vmax;border-radius:50%;
  background:repeating-conic-gradient(rgba(255,214,120,.22) 0 7deg,transparent 7deg 18deg);
  -webkit-mask:radial-gradient(circle,#000 5%,transparent 45%);mask:radial-gradient(circle,#000 5%,transparent 45%);
  animation:rot 18s linear infinite}
.cg #bw{background:radial-gradient(ellipse at 50% 44%,rgba(120,50,10,.75),rgba(10,4,12,.92) 70%)}
.cg #bwIn{position:relative}
.cg #bwTitle{font-family:var(--disp);font-size:clamp(46px,14vw,72px);line-height:.95;
  background:linear-gradient(#fffbe0,#ffd65a 45%,#e07a14 55%,#ffcf6a);-webkit-background-clip:text;background-clip:text;color:transparent;
  -webkit-text-stroke:2px #5a1e00;filter:drop-shadow(0 6px 0 #3a1200) drop-shadow(0 0 22px rgba(255,150,30,.8))}
.cg #bwTitle.punch{animation:punch .55s cubic-bezier(.3,1.8,.5,1)}
@keyframes punch{from{transform:scale(2.2);opacity:0;filter:blur(6px)}}
.cg #bwAmt{font-family:var(--disp);font-size:clamp(40px,12vw,60px);color:#fff;margin-top:14px;font-variant-numeric:tabular-nums;
  text-shadow:0 0 18px #ffb030,0 4px 0 #7a3200}
.cg .hint{font-size:13px;color:#e8cfa2;opacity:.8;margin-top:22px}

.cg #fsi{background:radial-gradient(ellipse at 50% 40%,#7a2a10,#1a0606 75%)}
.cg #fsiN{font-family:var(--disp);font-size:120px;line-height:.9;color:#fff1b8;text-shadow:0 0 30px #ff9020,0 7px 0 #6a2000;animation:punch .7s cubic-bezier(.3,1.8,.5,1) both}
.cg #fsiT{font-family:var(--disp);font-size:44px;line-height:1;color:#ffd06a;text-shadow:0 4px 0 #5a1a00;margin-top:4px}
.cg #fsiD{max-width:300px;margin:18px auto 0;font-size:14px;line-height:1.6;color:#f6e0bc}
.cg .bigbtn{margin-top:26px;padding:12px 44px;border-radius:12px;font-family:var(--disp);font-size:24px;color:#fff3cf;
  background:linear-gradient(#e89048,#9a4a18);box-shadow:inset 0 2px 0 #ffd8a0,inset 0 -3px 0 #4a1a06,0 6px 0 #2a0c02,0 10px 24px rgba(0,0,0,.6);
  text-shadow:0 2px 0 #5a2200;animation:breathe 1.2s ease-in-out infinite}
@keyframes breathe{50%{transform:scale(1.06)}}
.cg .modal{background:rgba(8,3,10,.82)}
.cg .card{position:relative;width:min(92vw,400px);max-height:84vh;overflow:auto;padding:20px 18px;border-radius:14px;
  background:linear-gradient(#3a1c12,#1e0d08);box-shadow:inset 0 0 0 2px #a86030,0 20px 40px #000;text-align:left}
.cg .card h2{font-family:var(--disp);font-weight:400;color:var(--brass);margin:0 0 10px;font-size:24px}
.cg .card p{font-size:14px;line-height:1.6;color:#f0dcc0;margin:8px 0}
.cg .pt{display:grid;grid-template-columns:52px 1fr;gap:6px 10px;align-items:center;font-size:13px;margin-top:10px}
.cg .pt svg{width:48px;height:48px}
.cg .row2{display:flex;gap:10px;justify-content:center;margin-top:16px}
.cg .btn2{padding:10px 22px;border-radius:10px;background:rgba(255,255,255,.08);box-shadow:inset 0 0 0 1.5px rgba(242,192,64,.5);font-size:15px}
.cg .btn2.pri{background:linear-gradient(#e89048,#9a4a18);box-shadow:inset 0 2px 0 #ffd8a0}
.cg #banner{position:absolute;left:50%;top:50%;z-index:8;transform:translate(-50%,-50%);pointer-events:none;
  font-family:var(--disp);font-size:24px;white-space:nowrap;color:#fff2c0;padding:8px 18px;border-radius:10px;
  background:rgba(40,10,0,.75);box-shadow:0 0 0 2px #e0a040,0 0 24px #ff8a1a;text-shadow:0 2px 0 #5a2000;opacity:0}

.cg #fx{position:fixed;inset:0;z-index:60;pointer-events:none;width:100%;height:100%}
@media (prefers-reduced-motion:reduce){.cg .ov .rays,.cg .gf::before,.cg #tick{animation:none}}
`;

function startEngine(root, host) {
  const $=id=>root.querySelector('#'+id);
  let dead=false;
  
  "use strict";
  /* =================== art =================== */
  const sceneSVG=`<svg viewBox="0 0 480 900" preserveAspectRatio="xMidYMid slice"><defs>
  <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1a0f33"/><stop offset=".45" stop-color="#6a2a4a"/><stop offset=".72" stop-color="#e0783a"/><stop offset="1" stop-color="#f6b45a"/></linearGradient>
  <radialGradient id="sun" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff2c0"/><stop offset=".4" stop-color="#ffc060" stop-opacity=".8"/><stop offset="1" stop-color="#ff8030" stop-opacity="0"/></radialGradient></defs>
  <rect width="480" height="900" fill="url(#sky)"/>
  ${Array.from({length:40},(_,i)=>`<circle cx="${(i*97)%480}" cy="${(i*53)%300}" r="${i%3?0.8:1.4}" fill="#fff" opacity="${.3+(i%5)/10}"/>`).join('')}
  <circle cx="330" cy="610" r="140" fill="url(#sun)"/>
  <path d="M0 560 L40 540 L60 470 L120 470 L140 540 L210 560 L240 500 L300 500 L320 560 L400 570 L420 520 L480 515 L480 900 L0 900Z" fill="#7a3324" opacity=".85"/>
  <path d="M0 640 L80 620 L100 560 L190 560 L210 630 L300 650 L330 600 L400 600 L420 650 L480 660 L480 900 L0 900Z" fill="#4a1d1c"/>
  <path d="M0 740 Q120 700 240 730 T480 720 L480 900 L0 900Z" fill="#2a0f14"/>
  <g fill="#1a080c"><path d="M60 760 v-60 q0-10 9-10 t9 10 v60z M48 730 q-12 0 -12-12 v-14 h8 v12 h12z M78 724 h12 v-16 h8 v18 q0 10-10 10 h-10z"/>
  <path d="M410 770 v-46 q0-8 7-8 t7 8 v46z M400 748 q-9 0-9-9 v-10 h6 v9 h9z"/></g></svg>`;
  $('scene').innerHTML=sceneSVG;
  $('backdrop').innerHTML=sceneSVG;
  
  const star=(cx,cy,R,r,n=6)=>{let p='';for(let i=0;i<n*2;i++){const a=-Math.PI/2+i*Math.PI/n,rr=i%2?r:R;p+=(i?'L':'M')+(cx+Math.cos(a)*rr).toFixed(1)+' '+(cy+Math.sin(a)*rr).toFixed(1)}return p+'Z'};
  const tips=(cx,cy,R,n=6)=>Array.from({length:n},(_,i)=>{const a=-Math.PI/2+i*2*Math.PI/n;return`<circle cx="${(cx+Math.cos(a)*R).toFixed(1)}" cy="${(cy+Math.sin(a)*R).toFixed(1)}" r="5" fill="url(#gGold)" stroke="#6a3a08" stroke-width="1.5"/>`}).join('');
  const letter=(t,g,s)=>`<text x="50" y="75" text-anchor="middle" font-family="Rye,Georgia,serif" font-size="${t.length>1?54:68}" fill="url(#${g})" stroke="${s}" stroke-width="4" paint-order="stroke" letter-spacing="${t.length>1?-4:0}">${t}</text>`;
  const DEFS=`<svg width="0" height="0" style="position:absolute"><defs>
  <linearGradient id="gGold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6c8"/><stop offset=".45" stop-color="#f6c443"/><stop offset=".55" stop-color="#d48a1c"/><stop offset="1" stop-color="#ffd76a"/></linearGradient>
  <linearGradient id="gRed" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffc2ac"/><stop offset=".5" stop-color="#e2452a"/><stop offset="1" stop-color="#8a1a0a"/></linearGradient>
  <linearGradient id="gJade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d4ffe0"/><stop offset=".5" stop-color="#3cbf78"/><stop offset="1" stop-color="#11603a"/></linearGradient>
  <linearGradient id="gAz" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d6ecff"/><stop offset=".5" stop-color="#4b9de8"/><stop offset="1" stop-color="#17407c"/></linearGradient>
  <linearGradient id="gVi" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f0d6ff"/><stop offset=".5" stop-color="#a861e2"/><stop offset="1" stop-color="#4a1a7c"/></linearGradient>
  <linearGradient id="gOr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe0b8"/><stop offset=".5" stop-color="#f08a30"/><stop offset="1" stop-color="#8a3208"/></linearGradient>
  <linearGradient id="gSil" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="#a8b4c4"/><stop offset="1" stop-color="#4a5666"/></linearGradient>
  <linearGradient id="gLeather" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#c8783a"/><stop offset=".6" stop-color="#8a4418"/><stop offset="1" stop-color="#5a260a"/></linearGradient>
  <linearGradient id="gIron" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f0f4f8"/><stop offset=".5" stop-color="#8a98a8"/><stop offset="1" stop-color="#3a4250"/></linearGradient>
  <radialGradient id="gFlame" cx=".5" cy=".6" r=".5"><stop offset="0" stop-color="#fff8d0"/><stop offset=".35" stop-color="#ffc040"/><stop offset=".7" stop-color="#ff6a10" stop-opacity=".7"/><stop offset="1" stop-color="#ff4000" stop-opacity="0"/></radialGradient>
  <symbol id="s-A" viewBox="0 0 100 100">${letter('A','gGold','#5a2e08')}</symbol>
  <symbol id="s-K" viewBox="0 0 100 100">${letter('K','gRed','#4a0e04')}</symbol>
  <symbol id="s-Q" viewBox="0 0 100 100">${letter('Q','gJade','#08361e')}</symbol>
  <symbol id="s-J" viewBox="0 0 100 100">${letter('J','gAz','#0c2448')}</symbol>
  <symbol id="s-T" viewBox="0 0 100 100">${letter('10','gVi','#2a0c48')}</symbol>
  <symbol id="s-N" viewBox="0 0 100 100">${letter('9','gOr','#4a1804')}</symbol>
  <symbol id="s-E" viewBox="0 0 100 100">${letter('8','gSil','#1c2430')}</symbol>
  <symbol id="s-H" viewBox="0 0 100 100"><path d="M28 86 L22 52 Q18 20 50 16 Q82 20 78 52 L72 86 L58 86 L62 52 Q64 34 50 32 Q36 34 38 52 L42 86Z" fill="url(#gIron)" stroke="#232a34" stroke-width="3" stroke-linejoin="round"/>
  <g fill="#232a34">${[[27,74],[25,60],[28,44],[38,28],[73,74],[75,60],[72,44],[62,28]].map(([x,y])=>`<rect x="${x-2.5}" y="${y-2}" width="5" height="4" rx="1"/>`).join('')}</g><path d="M30 30 Q40 20 50 19" stroke="#fff" stroke-width="2.5" fill="none" opacity=".7"/></symbol>
  <symbol id="s-B" viewBox="0 0 100 100"><path d="M34 12 h30 l-2 44 q14 4 24 10 q6 6 2 14 l-56 0 q-8 0-8-8 l4-16 z" fill="url(#gLeather)" stroke="#2e1206" stroke-width="3" stroke-linejoin="round"/>
  <path d="M30 12 h38 v8 h-38z" fill="#5a260a" stroke="#2e1206" stroke-width="2"/><path d="M40 30 q8 8 0 18 M52 28 q-6 10 2 20" stroke="#f2c040" stroke-width="2.5" fill="none"/>
  <path d="M24 80 h66 v6 h-66z" fill="#3a1608"/><path d="M24 74 l-10 6" stroke="#c8ccd4" stroke-width="3"/><path d="${star(12,82,9,4,8)}" fill="url(#gIron)" stroke="#333" stroke-width="1"/></symbol>
  <symbol id="s-L" viewBox="0 0 100 100"><path d="M40 14 q10-10 20 0" stroke="#6a3a10" stroke-width="4" fill="none"/><path d="M34 18 h32 l6 12 h-44z" fill="url(#gGold)" stroke="#4a2808" stroke-width="2.5"/>
  <rect x="30" y="30" width="40" height="44" rx="6" fill="#2a1408" stroke="#4a2808" stroke-width="2.5"/><ellipse cx="50" cy="54" rx="22" ry="26" fill="url(#gFlame)"/>
  <path d="M50 40 q8 12 0 22 q-8-10 0-22z" fill="#fff4c0"/><g stroke="url(#gGold)" stroke-width="4"><path d="M30 34 v38 M70 34 v38 M50 30 v6"/></g>
  <path d="M26 74 h48 l-4 10 h-40z" fill="url(#gGold)" stroke="#4a2808" stroke-width="2.5"/></symbol>
  <symbol id="s-P" viewBox="0 0 100 100"><ellipse cx="36" cy="22" rx="11" ry="5" fill="url(#gGold)" stroke="#6a3a08" stroke-width="1.5"/><ellipse cx="60" cy="18" rx="11" ry="5" fill="url(#gGold)" stroke="#6a3a08" stroke-width="1.5"/>
  <ellipse cx="50" cy="26" rx="12" ry="5.5" fill="url(#gGold)" stroke="#6a3a08" stroke-width="1.5"/>
  <path d="M34 34 h32 l8 10 q12 18 6 34 q-6 14-30 14 q-24 0-30-14 q-6-16 6-34z" fill="url(#gLeather)" stroke="#2e1206" stroke-width="3" stroke-linejoin="round"/>
  <path d="M30 40 q20 8 40 0" stroke="#f2c040" stroke-width="4.5" fill="none" stroke-linecap="round"/><circle cx="70" cy="44" r="4" fill="#f2c040"/>
  <text x="50" y="80" text-anchor="middle" font-family="Rye,Georgia,serif" font-size="28" fill="url(#gGold)" stroke="#3a1606" stroke-width="2" paint-order="stroke">$</text></symbol>
  <symbol id="s-W" viewBox="0 0 100 100"><circle cx="50" cy="44" r="40" fill="#ffcf40" opacity=".18"/><path d="${star(50,42,38,20)}" fill="url(#gGold)" stroke="#6a3a08" stroke-width="3" stroke-linejoin="round"/>${tips(50,42,38)}
  <circle cx="50" cy="42" r="13" fill="#b86a14" stroke="#fff0b0" stroke-width="2"/><path d="${star(50,42,9,4,5)}" fill="#fff4c4"/>
  <path d="M10 70 h80 l-6 8 6 8 h-80 l6-8z" fill="#9a1e14" stroke="#3a0804" stroke-width="2.5"/><text x="50" y="84" text-anchor="middle" font-family="Rye,Georgia,serif" font-size="17" fill="#fff4c8" letter-spacing="1">WILD</text></symbol>
  <symbol id="s-S" viewBox="0 0 100 100"><circle cx="50" cy="46" r="42" fill="#ffd060" opacity=".25"/><path d="M46 10 h8 v6 h-8z" fill="#6a3a08"/>
  <path d="M50 14 q-22 2-24 30 q-2 18-10 28 h68 q-8-10-10-28 q-2-28-24-30z" fill="url(#gGold)" stroke="#6a3a08" stroke-width="3" stroke-linejoin="round"/>
  <path d="M36 30 q-4 12-4 26" stroke="#fff" stroke-width="3" fill="none" opacity=".7"/><circle cx="50" cy="76" r="7" fill="#b86a14" stroke="#6a3a08" stroke-width="2"/>
  <path d="M8 80 h84 l-5 7 5 7 h-84 l5-7z" fill="#1e5a8a" stroke="#06223a" stroke-width="2.5"/><text x="50" y="92" text-anchor="middle" font-family="Rye,Georgia,serif" font-size="14" fill="#fff4c8" letter-spacing="1">BONUS</text></symbol>
  <symbol id="ret" viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" fill="none" stroke="#fff4c0" stroke-width="2.5" stroke-dasharray="14 8"/><circle cx="50" cy="50" r="36" fill="none" stroke="#ffd060" stroke-width="1.5"/>
  <path d="M50 2 v14 M50 84 v14 M2 50 h14 M84 50 h14" stroke="#fff4c0" stroke-width="3"/></symbol>
  <symbol id="hole" viewBox="0 0 40 40"><g stroke="#2a1a10" stroke-width="1.4" opacity=".8"><path d="M20 20 L4 10 M20 20 L36 6 M20 20 L38 26 M20 20 L26 39 M20 20 L2 30"/></g>
  <circle cx="20" cy="20" r="8" fill="#e8d6b0"/><circle cx="20" cy="20" r="6.5" fill="#160a06"/><circle cx="18" cy="18" r="2" fill="#4a3020"/></symbol>
  </defs></svg>`;
  $('cgdefs').innerHTML=DEFS;
  
  /* =================== config =================== */
  const COLS=6,ROWS=5;
  const SYMS={A:{w:10,c:['#ffd76a','#d48a1c']},K:{w:10,c:['#ff7a5a','#a8200c']},Q:{w:12,c:['#6fe0a0','#11603a']},J:{w:12,c:['#7ab8f0','#17407c']},
   T:{w:12,c:['#c890f0','#4a1a7c']},N:{w:12,c:['#ffb070','#a0400c']},E:{w:12,c:['#e8eef4','#5a6878']},H:{w:7,c:['#dfe6ee','#56606e']},B:{w:6,c:['#c8783a','#5a260a']},L:{w:5,c:['#ffcf50','#ff6a10']},
   P:{w:4,c:['#ffd76a','#8a4418']},W:{w:0,c:['#fff0a0','#e0a020']},S:{w:.85,c:['#ffe080','#c88a10']}};
  const PAY={P:[.5,1,2,4],L:[.4,.8,1.5,3],B:[.3,.6,1.2,2.4],H:[.25,.5,1,2],A:[.1,.2,.4,.8],K:[.1,.2,.4,.8],Q:[.06,.12,.25,.5],J:[.06,.12,.25,.5],T:[.06,.12,.25,.5],N:[.06,.12,.25,.5],E:[.06,.12,.25,.5]};
  const MCAP=10; // x1024
  const PAYING=Object.keys(PAY);
  const BETS=[2,5,10,20,50,100];
  const GOLD_P=.06;
  function rndSym(col,noScatter){
    const pool=[];let tot=0;
    for(const k in SYMS){let w=SYMS[k].w;if(k==='W')w=(col>=1&&col<=4)?.2:0;if(k==='S'&&noScatter)w=0;if(w>0){pool.push([k,w]);tot+=w}}
    let x=Math.random()*tot;for(const [k,w] of pool){if((x-=w)<=0)return k}return 'A';
  }
  const goldFor=(c,s)=>c>=1&&c<=4&&s!=='S'&&s!=='W'&&Math.random()<GOLD_P;
  
  /* =================== state =================== */
  const st={bal:host?host.getBalance():10000,betI:2,busy:false,turbo:false,auto:0,fs:0,fsTotal:0,fsWon:0,inFS:false,mult:1,mIdx:0,spinWin:0,snd:true};
  const bet=()=>BETS[st.betI];
  const fmt=n=>n.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
  const T=ms=>st.turbo?ms*.5:ms;
  const sleep=ms=>new Promise(r=>setTimeout(r,T(ms)));
  const rawSleep=ms=>new Promise(r=>setTimeout(r,ms));
  let grid=[];
  let SCRIPT=null; // server script of the spin being replayed
  const board=$('board');
  let C=64,CH=64;
  
  /* =================== audio =================== */
  let AC=null,master=null;
  function audio(){ if(!AC){try{AC=new (window.AudioContext||window.webkitAudioContext)();master=AC.createGain();master.gain.value=.5;master.connect(AC.destination)}catch(e){}} if(AC&&AC.state==='suspended')AC.resume();}
  function tone(f,d,type='sine',v=.2,slide=0,delay=0){ if(!AC||!st.snd)return; const t=AC.currentTime+delay,o=AC.createOscillator(),g=AC.createGain();
    o.type=type;o.frequency.setValueAtTime(f,t);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(20,f*slide),t+d);
    g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+d);o.connect(g);g.connect(master);o.start(t);o.stop(t+d+.02)}
  function noise(d,f=1200,q=1,v=.3,delay=0,type='lowpass'){ if(!AC||!st.snd)return; const t=AC.currentTime+delay,len=AC.sampleRate*d,b=AC.createBuffer(1,len,AC.sampleRate),a=b.getChannelData(0);
    for(let i=0;i<len;i++)a[i]=(Math.random()*2-1)*Math.pow(1-i/len,2.2);const s=AC.createBufferSource();s.buffer=b;const fl=AC.createBiquadFilter();fl.type=type;fl.frequency.value=f;fl.Q.value=q;
    const g=AC.createGain();g.gain.value=v;s.connect(fl);fl.connect(g);g.connect(master);s.start(t)}
  const SFX={
    stop:()=>{tone(90,.12,'sine',.35,.5);noise(.06,600,1,.15)},
    scatter:(n)=>{[0,4,7].forEach((s,i)=>tone(660*Math.pow(2,(s+n*2)/12),.5,'triangle',.12,1,i*.06))},
    shot:()=>{noise(.18,2600,.7,.5);tone(160,.12,'square',.08,.3)},
    crumble:()=>{noise(.35,900,2,.25,0,'bandpass')},
    coin:(p=1)=>{tone(1320*p,.15,'square',.04);tone(1980*p,.25,'sine',.06,1,.05)},
    whoosh:()=>noise(.3,1800,.5,.12,0,'bandpass'),
    mult:()=>{tone(523,.2,'triangle',.12);tone(784,.3,'triangle',.12,1,.08);tone(1046,.4,'triangle',.1,1,.16)},
    wild:()=>{tone(880,.3,'sine',.12,1.5);tone(1320,.4,'sine',.08,1.5,.08)},
    antic:()=>{tone(220,1.2,'sawtooth',.04,1.8)},
    fanfare:()=>{[0,4,7,12,16].forEach((s,i)=>tone(392*Math.pow(2,s/12),.6,'triangle',.12,1,i*.1))}
  };
  
  /* =================== layout =================== */
  function layout(){
  const app=$('app');const w=Math.min(window.innerWidth,480);
  const setV=()=>{root.style.setProperty('--c',C+'px');root.style.setProperty('--ch',CH+'px')};
  C=Math.max(34,Math.floor(Math.min((w-34)/6,82)));CH=C;setV();
  let used=0;
  for(const el of app.children){if(el.id==='scene')continue;const cs=getComputedStyle(el);if(cs.display==='none'||cs.position==='absolute')continue;
    used+=el.offsetHeight+(el.id==='console'?0:parseFloat(cs.marginTop)||0)+(parseFloat(cs.marginBottom)||0)}
  const avail=app.clientHeight-(used-5*C)-6;
  let ch=Math.floor(avail/5);
  if(ch<C){C=Math.max(30,ch);ch=C}
  CH=Math.max(30,Math.min(ch,Math.floor(C*1.3)));setV();
  for(let c=0;c<COLS;c++)for(let r=0;r<ROWS;r++){const g=grid[c]&&grid[c][r];if(g&&g.el)place(g.el,c,r)}
  setMult(st.mIdx,true);
}
function place(el,c,r){el.style.transform=`translate(${c*C}px,${r*CH}px)`}
  const fr=$('frame');[[4,4],[4,null],[null,4],[null,null]].forEach(([l,t])=>{const d=document.createElement('i');d.className='rivet';d.style[l===null?'right':'left']='4px';d.style[t===null?'bottom':'top']='4px';fr.appendChild(d)});
  
  /* =================== cells =================== */
  function symHTML(s,gold){return `<svg class="sym" viewBox="0 0 100 100"><use href="#s-${s}"/></svg>${gold?'<div class="gf"></div>':''}`}
  function makeCell(s,gold,c,r){const el=document.createElement('div');el.className='cell';el.innerHTML=symHTML(s,gold);place(el,c,r);board.appendChild(el);return el}
  function initGrid(){
    grid=[];for(let c=0;c<COLS;c++){grid[c]=[];for(let r=0;r<ROWS;r++){const s=rndSym(c,true),g=goldFor(c,s);grid[c][r]={s,gold:g,el:makeCell(s,g,c,r)}}}
  }
  
  /* =================== multiplier track =================== */
  const mstrip=$('mstrip');
  function buildTrack(n=MCAP+1){mstrip.innerHTML='';for(let i=0;i<n;i++){const v=Math.pow(2,i),d=document.createElement('div');d.className='mt'+(v>=1000?' big':'');d.textContent='x'+(v>=1e6?(v/1e6).toFixed(0)+'M':v);mstrip.appendChild(d)}}
  function setMult(i,instant){
    st.mIdx=i;st.mult=Math.pow(2,i);
    [...mstrip.children].forEach((d,k)=>d.classList.toggle('on',k===i));
    if(instant){mstrip.style.transition='none';requestAnimationFrame(()=>mstrip.style.transition='')}
    mstrip.style.transform=`translateX(${-(i*62+31)}px)`;
  }
  async function bumpMult(){
    if(st.mIdx>=MCAP){SFX.mult();return}
    setMult(st.mIdx+1);SFX.mult();
    $('mflare').animate([{opacity:0,transform:'scale(.3)'},{opacity:1,transform:'scale(1.3)'},{opacity:0,transform:'scale(1.8)'}],{duration:T(700),easing:'ease-out'});
    const r=$('mwrap').getBoundingClientRect();burst(r.left+r.width/2,r.top+r.height/2,16,'spark');
    await sleep(380);
  }
  
  /* =================== particles =================== */
  const cv=$('fx'),cx=cv.getContext('2d');let P=[],rafOn=false,DPR=1;
  function sizeCv(){DPR=Math.min(2,window.devicePixelRatio||1);cv.width=innerWidth*DPR;cv.height=innerHeight*DPR;cx.setTransform(DPR,0,0,DPR,0,0)}
  function add(p){P.push(p);if(!rafOn){rafOn=true;last=performance.now();requestAnimationFrame(loop)}}
  let last=0;
  function loop(now){
    const dt=Math.min(.05,(now-last)/1000);last=now;cx.clearRect(0,0,innerWidth,innerHeight);
    for(let i=P.length-1;i>=0;i--){const p=P[i];p.t+=dt;if(p.t>=p.life){P.splice(i,1);continue}const k=p.t/p.life;
      p.vy+=(p.g||0)*dt;p.vx*=p.drag||1;p.vy*=p.drag||1;p.x+=p.vx*dt;p.y+=p.vy*dt;p.rot+=(p.vr||0)*dt;
      cx.save();cx.translate(p.x,p.y);cx.rotate(p.rot||0);
      if(p.type==='frag'){cx.globalAlpha=1-k*k;cx.fillStyle=p.col;cx.beginPath();cx.moveTo(p.pts[0],p.pts[1]);cx.lineTo(p.pts[2],p.pts[3]);cx.lineTo(p.pts[4],p.pts[5]);cx.closePath();cx.fill();
        cx.strokeStyle='rgba(255,255,255,.35)';cx.lineWidth=1;cx.stroke()}
      else if(p.type==='spark'){cx.globalCompositeOperation='lighter';cx.globalAlpha=1-k;cx.strokeStyle=p.col;cx.lineWidth=p.s*(1-k)+.5;cx.lineCap='round';
        cx.rotate(-(p.rot||0));cx.beginPath();cx.moveTo(0,0);cx.lineTo(-p.vx*.03,-p.vy*.03);cx.stroke()}
      else if(p.type==='smoke'){cx.globalAlpha=.35*(1-k);const r=p.s*(.5+k);const g=cx.createRadialGradient(0,0,0,0,0,r);g.addColorStop(0,p.col);g.addColorStop(1,'rgba(60,40,30,0)');cx.fillStyle=g;cx.beginPath();cx.arc(0,0,r,0,7);cx.fill()}
      else if(p.type==='flash'){cx.globalCompositeOperation='lighter';cx.globalAlpha=1-k;const r=p.s*(.4+k*.8);const g=cx.createRadialGradient(0,0,0,0,0,r);g.addColorStop(0,'rgba(255,250,220,1)');g.addColorStop(.4,'rgba(255,190,70,.7)');g.addColorStop(1,'rgba(255,120,20,0)');cx.fillStyle=g;cx.beginPath();cx.arc(0,0,r,0,7);cx.fill()}
      else if(p.type==='ring'){cx.globalAlpha=1-k;cx.strokeStyle=p.col;cx.lineWidth=3*(1-k)+.5;cx.beginPath();cx.arc(0,0,p.s*(.3+k),0,7);cx.stroke()}
      else if(p.type==='coin'){cx.globalAlpha=k>.85?(1-k)/.15:1;const sx=Math.cos(p.t*p.spin);cx.scale(Math.abs(sx)*.9+.1,1);const r=p.s;
        const g=cx.createLinearGradient(-r,-r,r,r);g.addColorStop(0,'#fff6c0');g.addColorStop(.5,sx>0?'#f2b630':'#c88418');g.addColorStop(1,'#8a5208');cx.fillStyle=g;cx.beginPath();cx.arc(0,0,r,0,7);cx.fill();
        cx.strokeStyle='#7a4806';cx.lineWidth=1.5;cx.stroke();cx.fillStyle='rgba(255,240,180,.8)';cx.beginPath();cx.arc(0,0,r*.55,0,7);cx.strokeStyle='rgba(122,72,6,.7)';cx.stroke()}
      cx.restore();cx.globalCompositeOperation='source-over';cx.globalAlpha=1}
    if(P.length)requestAnimationFrame(loop);else{rafOn=false;cx.clearRect(0,0,innerWidth,innerHeight)}
  }
  const R=(a,b)=>a+Math.random()*(b-a);
  function burst(x,y,n,type,col='#ffd36a',sp=1){for(let i=0;i<n;i++){const a=R(0,6.28),v=R(120,420)*sp;add({type,x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,g:type==='spark'?500:0,drag:.97,t:0,life:R(.35,.7),s:R(1.5,3),col})}}
  function shatter(x,y,s,size){
    const [c1,c2]=SYMS[s].c;
    for(let i=0;i<18;i++){const a=R(0,6.28),v=R(140,460),sz=R(size*.08,size*.2);
      add({type:'frag',x:x+R(-size*.25,size*.25),y:y+R(-size*.25,size*.25),vx:Math.cos(a)*v,vy:Math.sin(a)*v-R(120,300),g:1500,drag:.99,vr:R(-14,14),rot:R(0,6),t:0,life:R(.6,1.1),col:i%3?c1:c2,
        pts:[R(-sz,0),R(-sz,0),R(0,sz),R(-sz*.5,0),R(-sz*.3,sz*.3),R(0,sz)]})}
    for(let i=0;i<12;i++){const a=R(0,6.28),v=R(250,600);add({type:'spark',x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,g:600,drag:.95,t:0,life:R(.3,.6),s:R(1.5,3),col:i%2?'#fff1b0':'#ffae3a'})}
    for(let i=0;i<3;i++)add({type:'smoke',x:x+R(-10,10),y:y+R(-10,10),vx:R(-30,30),vy:R(-60,-20),t:0,life:R(.7,1.1),s:size*R(.35,.55),col:'rgba(200,170,140,.9)'});
    add({type:'flash',x,y,vx:0,vy:0,t:0,life:.25,s:size*.9});
    add({type:'ring',x,y,vx:0,vy:0,t:0,life:.4,s:size*.8,col:'#ffe6a0'});
  }
  function coinShower(x,y,n,up=true){for(let i=0;i<n;i++){add({type:'coin',x:x+R(-40,40),y,vx:R(-260,260),vy:up?R(-1100,-650):R(-50,50),g:1500,drag:.995,t:0,life:R(1.6,2.4),s:R(7,13),spin:R(6,16),rot:R(-.3,.3)})}}
  
  /* =================== helpers =================== */
  function cellCenter(c,r){const b=board.getBoundingClientRect();return [b.left+(c+.5)*C,b.top+(r+.5)*CH]}
  function shake(mag=4,dur=180){$('frame').animate(Array.from({length:6},(_,i)=>({transform:`translate(${R(-mag,mag)}px,${R(-mag,mag)}px)`})).concat([{transform:'none'}]),{duration:dur})}
  let lastBal=null;
  function setUI(){
    const balEl=$('bal');if(lastBal!==null&&st.bal>lastBal){balEl.classList.remove('hot');void balEl.offsetWidth;balEl.classList.add('hot')}lastBal=st.bal;
    balEl.textContent=fmt(st.bal);$('betv').textContent=fmt(bet());
    const lock=st.busy||st.inFS;
    $('betDn').disabled=lock||st.betI===0;$('betUp').disabled=lock||st.betI===BETS.length-1;$('betBox').disabled=lock;$('buy').disabled=lock||st.auto>0||st.bal<bet()*50;
    $('spin').classList.toggle('go',st.busy&&st.auto===0);$('spinwrap').classList.toggle('go',st.busy);
    $('spin').classList.toggle('auto',st.auto>0);$('spin').querySelector('.autoN b').textContent=st.auto>0?st.auto:'';
    $('auto').classList.toggle('on',st.auto>0);$('turbo').classList.toggle('on',st.turbo);
    if(st.spinWin===0)$('winv').classList.remove('hot');
  }
  function countTo(el,from,to,ms,fmtF=fmt){return new Promise(res=>{const t0=performance.now();const f=now=>{const k=Math.min(1,(now-t0)/ms);el.textContent=fmtF(from+(to-from)*(1-Math.pow(1-k,2)));k<1?requestAnimationFrame(f):res()};requestAnimationFrame(f)})}
  const tickMsgs=['ระฆัง 3 ใบขึ้นไป = ฟรีสปิน','สัญลักษณ์กรอบทองที่ชนะจะกลายเป็น Wild','ตัวคูณเพิ่ม 2 เท่าทุกครั้งที่ชนะ','ฟรีสปิน: ตัวคูณไม่รีเซ็ตตลอดรอบ'];
  $('tick').textContent=tickMsgs.join('      ✦      ');
  function showWin(v,txt){const wb=$('winbar');wb.classList.add('won');$('winTxt').textContent=txt||('Win '+fmt(v));wb.classList.remove('flash');void wb.offsetWidth;wb.classList.add('flash')}
  function clearWin(){$('winbar').classList.remove('won')}
  async function banner(text,ms=1100){const b=$('banner');b.textContent=text;b.animate([{opacity:0,transform:'translate(-50%,-50%) scale(1.8)'},{opacity:1,transform:'translate(-50%,-50%) scale(1)',offset:.15},{opacity:1,offset:.8},{opacity:0,transform:'translate(-50%,-50%) scale(.9)'}],{duration:T(ms),easing:'ease-out'});await sleep(ms)}
  
  /* =================== reel spin =================== */
  async function spinReels(final){
    // anticipation start reel
    let anticFrom=99,sc=0;
    for(let c=0;c<COLS;c++){if(sc>=2){anticFrom=c;break}sc+=final[c].filter(x=>x.s==='S').length}
    const base=st.turbo?380:720,stag=st.turbo?70:150,antD=st.turbo?900:1500;
    const stops=[];for(let c=0;c<COLS;c++){let t=base+c*stag;if(c>=anticFrom)t+=(c-anticFrom+1)*antD;stops.push(t)}
    SFX.whoosh();
    const jobs=[];const antics=[];
    for(let c=0;c<COLS;c++){
      const dur=stops[c],K=Math.max(8,Math.round(dur/42));
      const strip=document.createElement('div');strip.className='strip blur';strip.style.left=c*C+'px';
      let html='';
      for(let r=0;r<ROWS;r++)html+=`<div class="sc">${symHTML(final[c][r].s,final[c][r].gold)}</div>`;
      for(let k=0;k<K;k++){const s=rndSym(c);html+=`<div class="sc">${symHTML(s,false)}</div>`}
      for(let r=0;r<ROWS;r++)html+=`<div class="sc">${symHTML(grid[c][r].s,grid[c][r].gold)}</div>`;
      strip.innerHTML=html;board.appendChild(strip);
      for(let r=0;r<ROWS;r++){grid[c][r].el.remove()}
      const H=(ROWS+K)*CH;
      strip.style.transform=`translateY(${-H}px)`;
      const a=strip.animate([
        {transform:`translateY(${-H}px)`,easing:'ease-out'},
        {transform:`translateY(${-H-CH*.28}px)`,offset:Math.min(.12,110/dur),easing:'cubic-bezier(.35,.0,.25,1)'},
        {transform:`translateY(${CH*.16}px)`,offset:.93,easing:'ease-out'},
        {transform:'translateY(0)'}],{duration:dur,fill:'forwards'});
      setTimeout(()=>strip.classList.remove('blur'),dur*.88);
      if(c>=anticFrom){const an=document.createElement('div');an.className='antic';an.style.left=c*C+'px';board.appendChild(an);antics[c]=an;
        setTimeout(()=>{an.classList.add('on');SFX.antic();if(c===anticFrom)banner('One more bell!',1300)},c===anticFrom?stops[c-1]:stops[c-1])}
      jobs.push(a.finished.then(()=>{
        strip.remove();
        for(let r=0;r<ROWS;r++){const f=final[c][r];grid[c][r]={s:f.s,gold:f.gold,el:makeCell(f.s,f.gold,c,r)}}
        if(antics[c]){antics[c].classList.remove('on');setTimeout(()=>antics[c].remove(),300)}
        SFX.stop();
        let n=0;for(let cc=0;cc<=c;cc++)n+=final[cc].filter(x=>x.s==='S').length;
        for(let r=0;r<ROWS;r++)if(grid[c][r].s==='S'){SFX.scatter(n);const el=grid[c][r].el;el.querySelector('.sym').animate([{transform:'scale(1)'},{transform:'scale(1.35)',filter:'drop-shadow(0 0 14px #ffd040)'},{transform:'scale(1)'}],{duration:500,easing:'ease-out'});const [x,y]=cellCenter(c,r);burst(x,y,12,'spark')}
      }));
    }
    await Promise.all(jobs);
  }
  
  /* =================== evaluation & cascades =================== */
  function evaluate(){
    const wins=[];
    for(const s of PAYING){let len=0,ways=1;const pos=[];
      for(let c=0;c<COLS;c++){let n=0;for(let r=0;r<ROWS;r++){const g=grid[c][r];if(g.s===s||g.s==='W'){n++;pos.push([c,r])}}if(!n)break;ways*=n;len++}
      if(len>=3)wins.push({s,len,ways,pay:PAY[s][len-3]*bet()*ways/10,pos})}
    return wins;
  }
  async function cascadeLoop(){
    let first=true;
    while(true){
      const wins=evaluate();if(!wins.length)break;
      const hit=new Map();wins.forEach(w=>w.pos.forEach(([c,r])=>hit.set(c+','+r,[c,r])));
      const baseWin=wins.reduce((a,w)=>a+w.pay,0),mult=st.mult,win=baseWin*mult;
      // 1 highlight
      for(let c=0;c<COLS;c++)for(let r=0;r<ROWS;r++){const g=grid[c][r];if(!hit.has(c+','+r))g.el.classList.add('dim')}
      let sx=0,sy=0;
      hit.forEach(([c,r])=>{const el=grid[c][r].el;el.classList.add('hit');el.insertAdjacentHTML('afterbegin','<div class="halo"></div><svg class="ret" viewBox="0 0 100 100"><use href="#ret"/></svg>');sx+=c;sy+=r});
      sx/=hit.size;sy/=hit.size;
      SFX.coin(1);showWin(0,fmt(baseWin)+(mult>1?'  ×'+mult:''));
      await sleep(650);
      // 2 multiplier popup
      if(mult>1||first){const mp=$('mpop');mp.textContent='x'+mult;mp.style.left=((sx+.5)*C)+'px';mp.style.top=((sy+.5)*CH)+'px';
        mp.animate([{opacity:0,transform:'translate(-50%,-50%) scale(2.6)',filter:'blur(6px)'},{opacity:1,transform:'translate(-50%,-50%) scale(1)',filter:'blur(0)',offset:.25},{opacity:1,transform:'translate(-50%,-50%) scale(1.08)',offset:.75},{opacity:0,transform:'translate(-50%,-60%) scale(1.15)'}],{duration:T(900),easing:'ease-out'});
        await sleep(520)}
      first=false;
      // 3 shots
      const list=[...hit.values()].sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
      for(const [c,r] of list){const el=grid[c][r].el;const nh=1+(Math.random()<.6);
        for(let h=0;h<nh;h++){const hx=R(25,75),hy=R(25,75);el.insertAdjacentHTML('beforeend',`<svg class="hole" style="left:${hx}%;top:${hy}%" viewBox="0 0 40 40"><use href="#hole"/></svg>`);
          const b=board.getBoundingClientRect();const px=b.left+c*C+hx/100*C,py=b.top+r*CH+hy/100*CH;burst(px,py,7,'spark','#fff0b0',.8);add({type:'flash',x:px,y:py,vx:0,vy:0,t:0,life:.12,s:C*.4})}
        SFX.shot();shake(3,120);await sleep(Math.max(28,170/list.length*3))}
      await sleep(220);
      // 4 break / convert
      let toWild=[];SFX.crumble();shake(5,220);
      for(const [c,r] of list){const g=grid[c][r];const [x,y]=cellCenter(c,r);
        if(g.gold&&g.s!=='W'){toWild.push([c,r]);continue}
        shatter(x,y,g.s,C);const el=g.el;el.animate([{transform:el.style.transform+' scale(1)',opacity:1},{transform:el.style.transform+' scale(1.18)',opacity:1,offset:.3},{transform:el.style.transform+' scale(.2)',opacity:0}],{duration:T(260),fill:'forwards'}).finished.then(()=>el.remove());
        g.dead=true}
      for(const [c,r] of toWild){const g=grid[c][r];const el=g.el;const [x,y]=cellCenter(c,r);
        el.querySelectorAll('.halo,.ret,.hole').forEach(n=>n.remove());el.classList.remove('hit');
        add({type:'flash',x,y,vx:0,vy:0,t:0,life:.4,s:C*1.4});burst(x,y,20,'spark','#fff4c0');
        const sym=el.querySelector('.sym');
        await sym.animate([{transform:'rotateY(0) scale(1)'},{transform:'rotateY(90deg) scale(1.2)',filter:'brightness(3)'}],{duration:T(160),fill:'forwards'}).finished;
        el.innerHTML=symHTML('W',false);g.s='W';g.gold=false;SFX.wild();
        el.querySelector('.sym').animate([{transform:'rotateY(-90deg) scale(1.2)',filter:'brightness(3)'},{transform:'rotateY(0) scale(1.25)',offset:.6},{transform:'scale(1)'}],{duration:T(420),easing:'ease-out'})}
      await sleep(300);
      for(let c=0;c<COLS;c++)for(let r=0;r<ROWS;r++){const g=grid[c][r];if(!g.dead){g.el.classList.remove('dim','hit');g.el.querySelectorAll('.halo,.ret,.hole').forEach(n=>n.remove())}}
      // 5 pay + multiplier up
      st.spinWin+=win;if(st.inFS)st.fsTotal+=win;
      showWin(st.spinWin);countTo($('winv'),Math.max(0,st.spinWin-win),st.spinWin,T(500));$('winv').classList.remove('hot');void $('winv').offsetWidth;$('winv').classList.add('hot');
      {const b=$('winbar').getBoundingClientRect();coinShower(b.left+b.width/2,b.top,Math.min(30,6+Math.round(win/bet()*2)))}
      SFX.coin(1.2);
      await bumpMult();
      // 6 gravity
      await dropFill();
    }
  }
  async function dropFill(){
    const anims=[];let maxT=0;
    for(let c=0;c<COLS;c++){
      const alive=grid[c].filter(g=>!g.dead),n=ROWS-alive.length;if(!n)continue;
      const col=[];
      const fresh=SCRIPT?SCRIPT.steps[SCRIPT.k].drops[c]:null;
      for(let i=0;i<n;i++){const s=fresh?fresh[i].s:rndSym(c,st.inFS?false:false),gold=fresh?fresh[i].gold:goldFor(c,s);const el=makeCell(s,gold,c,i-n);col.push({s,gold,el,from:i-n})}
      alive.forEach(g=>{g.from=grid[c].indexOf(g);col.push(g)});
      grid[c]=col.map(g=>({s:g.s,gold:g.gold,el:g.el,_from:g.from}));
      grid[c].forEach((g,r)=>{const from=g._from;delete g._from;if(from===r)return;const d=r-from;
        const dur=T(220+Math.sqrt(d)*120),delay=T(c*45+(ROWS-r)*18);maxT=Math.max(maxT,dur+delay);
        const y0=from*CH,y1=r*CH,x=c*C;place(g.el,c,r);
        anims.push(g.el.animate([{transform:`translate(${x}px,${y0}px)`,easing:'cubic-bezier(.55,0,1,.6)'},{transform:`translate(${x}px,${y1}px)`,offset:.78,easing:'ease-out'},
          {transform:`translate(${x}px,${y1-CH*.09}px)`,offset:.89,easing:'ease-in'},{transform:`translate(${x}px,${y1}px)`}],{duration:dur,delay,fill:'backwards'}).finished)})}
    if(SCRIPT)SCRIPT.k++;
    setTimeout(()=>SFX.stop(),maxT*.75);
    await Promise.all(anims);
    for(let c=0;c<COLS;c++)for(let r=0;r<ROWS;r++)if(grid[c][r].s==='S'){const [x,y]=cellCenter(c,r);burst(x,y,10,'spark');SFX.scatter(1)}
    await sleep(120);
  }
  
  /* =================== big win =================== */
  let skipBW=false;
  async function bigWin(amount){
    const x=amount/bet();if(x<10)return;
    const tiers=[[10,'Big win'],[25,'Mega win'],[50,'Super mega win']].filter(t=>x>=t[0]);
    const ov=$('bw'),title=$('bwTitle'),amt=$('bwAmt');ov.classList.add('show');skipBW=false;SFX.fanfare();
    let cur=0,ti=0;
    const coinT=setInterval(()=>coinShower(innerWidth/2,innerHeight+10,6),220);
    const setTier=i=>{title.innerHTML=tiers[i][1].replace('mega win','mega<br>win');title.classList.remove('punch');void title.offsetWidth;title.classList.add('punch');shake(6,300);SFX.fanfare()};
    setTier(0);
    for(let i=0;i<tiers.length;i++){
      const target=i<tiers.length-1?tiers[i+1][0]*bet():amount;
      if(!skipBW)await new Promise(res=>{const t0=performance.now(),from=cur,ms=2400;const f=now=>{if(skipBW)return res();const k=Math.min(1,(now-t0)/ms);cur=from+(target-from)*k;amt.textContent=fmt(cur);if(Math.random()<.2)SFX.coin(1+k*.5);k<1?requestAnimationFrame(f):res()};requestAnimationFrame(f)});
      cur=target;if(skipBW)break;if(i<tiers.length-1)setTier(i+1)}
    if(skipBW){title.innerHTML=tiers[tiers.length-1][1].replace('mega win','mega<br>win')}
    amt.textContent=fmt(amount);amt.animate([{transform:'scale(1.3)'},{transform:'scale(1)'}],{duration:400});
    skipBW=false;await new Promise(res=>{const t=setTimeout(res,2200);ov.onclick=()=>{clearTimeout(t);res()}});
    clearInterval(coinT);ov.onclick=null;ov.classList.remove('show');
  }
  $('bw').addEventListener('pointerdown',()=>{skipBW=true});
  
  /* =================== free spins =================== */
  function waitClick(btn){return new Promise(r=>{btn.onclick=()=>{audio();btn.onclick=null;r()}})}
  async function startFS(n,resumeM){
    await banner('Free spins won!',1400);
    $('fsiN').textContent=n;$('fsi').classList.add('show');SFX.fanfare();
    const fi=setInterval(()=>coinShower(innerWidth/2,innerHeight+10,3),400);
    await waitClick($('fsStart'));clearInterval(fi);$('fsi').classList.remove('show');
    st.inFS=true;st.fs=n;st.fsTotal=0;root.classList.add('fs');layout();$('fsLeft').textContent=n;setMult(resumeM||0);setUI();
    while(st.fs>0){await rawSleep(T(450));st.fs--;$('fsLeft').textContent=st.fs;bumpEl($('fsLeft'));if((await doSpin(true))===false)break}
    await rawSleep(500);
    $('fseAmt').textContent='0.00';$('fseSub').textContent='จาก '+n+' ฟรีสปิน';$('fse').classList.add('show');SFX.fanfare();
    const fe=setInterval(()=>coinShower(innerWidth/2,innerHeight+10,5),260);
    await countTo($('fseAmt'),0,st.fsTotal,1800);
    await waitClick($('fsCollect'));clearInterval(fe);$('fse').classList.remove('show');
    st.inFS=false;root.classList.remove('fs');layout();setMult(0);clearWin();setUI();
  }
  function bumpEl(el){el.classList.remove('bump');void el.offsetWidth;el.classList.add('bump')}
  
  /* =================== spin =================== */
  async function doSpin(free,forceScatter=0){
    let out=null;
    if(host){
      try{out=await host.call('spin',{bet:bet()})}catch(e){st.auto=0;setUI();banner(e&&e.message==='insufficient_balance'?'เครดิตไม่พอ':'เชื่อมต่อไม่สำเร็จ',1400);return false}
      if(dead)return false;
      if(free)st.fs=Math.max(0,out.fsLeft-(out.award||0));
      SCRIPT={steps:out.steps,k:0};
    }else SCRIPT=null;
    st.spinWin=0;
    if(!free){st.bal-=bet();setMult(0)}
    clearWin();$('winv').textContent='0.00';setUI();
    const final=[];if(out){for(let c=0;c<COLS;c++)final[c]=out.start[c].map(g=>({s:g.s,gold:g.gold}))}else{for(let c=0;c<COLS;c++){final[c]=[];for(let r=0;r<ROWS;r++){const s=rndSym(c);final[c][r]={s,gold:goldFor(c,s)}}}}
    // at most one bell per reel
    for(let c=0;c<COLS;c++){let seen=false;for(let r=0;r<ROWS;r++)if(final[c][r].s==='S'){if(seen)final[c][r].s=rndSym(c,true);seen=true}}
    if(forceScatter&&!out){const reels=[0,1,2,3,4,5].sort(()=>Math.random()-.5).slice(0,forceScatter);for(let c=0;c<COLS;c++){const has=final[c].some(x=>x.s==='S');if(reels.includes(c)&&!has)final[c][Math.floor(Math.random()*ROWS)]={s:'S',gold:false};if(!reels.includes(c)&&has)final[c].forEach(x=>{if(x.s==='S')x.s=rndSym(c,true)})}}
    await spinReels(final);
    await sleep(150);
    await cascadeLoop();
    SCRIPT=null;
    if(out)host.round(out.wager,out.total);
    if(st.spinWin>0){st.bal+=free?0:st.spinWin;showWin(st.spinWin);await bigWin(st.spinWin)}
    // scatter check
    const sPos=[];for(let c=0;c<COLS;c++)for(let r=0;r<ROWS;r++)if(grid[c][r].s==='S')sPos.push([c,r]);
    setUI();
    if(sPos.length>=3){
      sPos.forEach(([c,r])=>{const el=grid[c][r].el;el.insertAdjacentHTML('afterbegin','<div class="halo"></div>');el.querySelector('.sym').animate([{transform:'scale(1)'},{transform:'scale(1.3)'},{transform:'scale(1)'}],{duration:500,iterations:3});const [x,y]=cellCenter(c,r);burst(x,y,20,'spark')});
      SFX.fanfare();await rawSleep(1500);sPos.forEach(([c,r])=>grid[c][r].el.querySelector('.halo')?.remove());
      if(st.inFS){const add=5;st.fs+=add;$('fsLeft').textContent=st.fs;bumpEl($('fsLeft'));await banner('+'+add+' free spins',1400)}
      else{const n=10+2*(sPos.length-3);await startFS(n);st.bal+=st.fsTotal;setUI()}
    }
  }
  async function play(force=0){
    if(st.busy||dead)return;audio();
    if(st.bal<bet()&&!force){banner('เครดิตไม่พอ — ลดเดิมพัน',1400);st.auto=0;setUI();return}
    st.busy=true;setUI();
    try{await doSpin(false,force)}finally{st.busy=false;setUI()}
    if(st.auto>0){st.auto--;setUI();if(st.auto>0){await rawSleep(T(350));play()}}
  }
  
  /* =================== controls =================== */
  $('spin').onclick=()=>{if(st.auto>0&&st.busy){st.auto=0;setUI();return}if(st.auto>0){st.auto=0;setUI();return}play()};
  $('turbo').onclick=()=>{st.turbo=!st.turbo;setUI()};
  $('betDn').onclick=()=>{if(st.betI>0){st.betI--;setUI();tone(500,.08,'square',.05)}};
  $('betUp').onclick=()=>{if(st.betI<BETS.length-1){st.betI++;setUI();tone(700,.08,'square',.05)}};
  $('auto').onclick=()=>{audio();if(st.auto>0){st.auto=0;setUI();return}st.auto=10;setUI();if(!st.busy)play()};
  if(host)$('buy').style.display='none';
  $('buy').onclick=()=>{if(host)return;audio();$('buyPrice').textContent=fmt(bet()*50);$('buyM').classList.add('show')};
  $('buyNo').onclick=()=>$('buyM').classList.remove('show');
  $('buyYes').onclick=()=>{$('buyM').classList.remove('show');if(st.bal<bet()*50)return;st.bal-=bet()*49;setUI();play(3+(Math.random()<.25))};
  $('betBox').onclick=()=>{audio();$('betsG').innerHTML=BETS.map((b,i)=>`<button data-i="${i}" class="${i===st.betI?'sel':''}">${fmt(b)}</button>`).join('');$('betM').classList.add('show')};
  $('betsG').onclick=e=>{const b=e.target.closest('button');if(!b)return;st.betI=+b.dataset.i;setUI();tone(700,.08,'square',.05);$('betM').classList.remove('show')};
  $('betClose').onclick=()=>$('betM').classList.remove('show');
  $('infoBtn').onclick=()=>$('infoM').classList.add('show');$('infoClose').onclick=()=>$('infoM').classList.remove('show');
  $('sndBtn').onclick=()=>{st.snd=!st.snd;audio();$('sndIco').innerHTML=st.snd?'<path d="M4 9v6h4l5 5V4L8 9zm12.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4z"/>':'<path d="M4 9v6h4l5 5V4L8 9zm15.6 3 2.1-2.1-1.4-1.4-2.1 2.1-2.1-2.1-1.4 1.4 2.1 2.1-2.1 2.1 1.4 1.4 2.1-2.1 2.1 2.1 1.4-1.4z"/>'};
  const onKey=e=>{if(e.code==='Space'&&!e.repeat&&!root.querySelector('.ov.show')){e.preventDefault();play()}};
  document.addEventListener('keydown',onKey);
  $('ptab').innerHTML=['P','L','B','H','A','Q'].map(s=>`<svg viewBox="0 0 100 100"><use href="#s-${s}"/></svg><div>${s==='A'?'A, K — ':s==='Q'?'Q, J, 10, 9, 8 — ':''}3/4/5/6 วงล้อ: ${PAY[s].join(' / ')}</div>`).join('')
   +`<svg viewBox="0 0 100 100"><use href="#s-W"/></svg><div>Wild — ใช้แทนทุกสัญลักษณ์ยกเว้นระฆัง เกิดจากกรอบทองที่ชนะ</div><svg viewBox="0 0 100 100"><use href="#s-S"/></svg><div>ระฆัง — 3 ใบขึ้นไปเปิดฟรีสปิน</div>`;
  
  /* =================== boot =================== */
  buildTrack();initGrid();sizeCv();layout();setUI();
  const syncT=host?setInterval(()=>{if(!st.busy&&!st.inFS){const b=host.getBalance();if(Math.abs(b-st.bal)>0.004){st.bal=b;setUI()}}},400):0;
  if(host)host.state().then(async s=>{const f=s&&s.fs;if(dead||!f||!(f.left>0)||st.busy)return;const i=BETS.indexOf(f.bet);if(i>=0)st.betI=i;setUI();st.busy=true;
    try{await startFS(f.left,s.mIdx||0);st.bal=host.getBalance();}finally{st.busy=false;setUI()}});
  const onResize=()=>{sizeCv();layout()};
  window.addEventListener('resize',onResize);
  document.fonts&&document.fonts.ready.then(()=>{if(!dead)layout()});
  return ()=>{dead=true;st.auto=0;clearInterval(syncT);document.removeEventListener('keydown',onKey);window.removeEventListener('resize',onResize);
    board.querySelectorAll('.cell,.strip,.antic').forEach(n=>n.remove());root.querySelectorAll('#frame .rivet').forEach(n=>n.remove());
    mstrip.innerHTML='';root.classList.remove('fs');try{AC&&AC.close()}catch(e){}};
  
}

export default function CopperGulchSlots({ host }) {
  const rootRef = useRef(null);
  useEffect(() => startEngine(rootRef.current, host), []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="cg" ref={rootRef}>
      <style>{CSS}</style>
      <div id="cgdefs"/>
      
      <div id="backdrop"/>
      <div id="app">
        <div id="scene"/>
        <div id="top">
          <div id="logo">Copper Gulch</div>
          <button className="iconbtn" id="infoBtn" aria-label="กติกาและอัตราจ่าย"><svg viewBox="0 0 24 24"><path d="M11 10h2v8h-2zm0-4h2v2h-2zm1-4a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"/></svg></button>
          <button className="iconbtn" id="sndBtn" aria-label="เสียง"><svg viewBox="0 0 24 24" id="sndIco"><path d="M4 9v6h4l5 5V4L8 9zm12.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4z"/></svg></button>
        </div>
        <div id="mwrap"><div id="mflare"/><div id="mstrip"/></div>
        <div id="ways">15,625 ways</div>
        <div id="frame">
          <div id="board"><div id="mpop"/><div id="banner"/></div>
          <button id="buy" aria-label="ซื้อฟีเจอร์ฟรีสปิน">Feature<br/>buy</button>
        </div>
        <div id="winbar"><div id="tick"/><div id="winTxt">Win 0.00</div></div>
        <div id="fspanel"><span>Free spins<br/>left</span><div id="fsLeft">10</div></div>
        <div id="console">
          <div id="stats">
            <div className="st"><span className="ic"><svg viewBox="0 0 24 24"><path d="M12 5c-3.3 0-6 1.3-6 3v8c0 1.7 2.7 3 6 3s6-1.3 6-3V8c0-1.7-2.7-3-6-3zm0 2c2.6 0 4 .9 4 1s-1.4 1-4 1-4-.9-4-1 1.4-1 4-1z"/></svg></span><span className="tx"><small>เครดิต</small><b id="bal">0</b></span></div>
            <button className="st" id="betBox" aria-label="เลือกเดิมพัน"><span className="ic"><svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 4a5 5 0 1 1 0 10 5 5 0 0 1 0-10zM11 3h2v3h-2zm0 15h2v3h-2zM3 11h3v2H3zm15 0h3v2h-3z"/></svg></span><span className="tx"><small>เดิมพัน</small><b id="betv">0</b></span></button>
            <div className="st"><span className="ic"><svg viewBox="0 0 24 24"><path d="M7 4h10v2h3v3a4 4 0 0 1-4 4h-.3A5 5 0 0 1 13 15.9V18h3v2H8v-2h3v-2.1A5 5 0 0 1 8.3 13H8a4 4 0 0 1-4-4V6h3zm10 4v3a2 2 0 0 0 1-2V8zM6 8v1a2 2 0 0 0 1 2V8z"/></svg></span><span className="tx"><small>ชนะ</small><b id="winv">0.00</b></span></div>
          </div>
          <div id="ctrl">
            <div className="side"><button className="cb" id="turbo" aria-label="เทอร์โบ"><svg viewBox="0 0 24 24"><path d="M13 2 4 14h6l-1 8 9-12h-6z"/></svg></button>เทอร์โบ</div>
            <button className="cb sm" id="betDn" aria-label="ลดเดิมพัน"><svg viewBox="0 0 24 24"><path d="M5 10.5h14v3H5z"/></svg></button>
            <div className="spinwrap" id="spinwrap"><button id="spin" aria-label="หมุน"><svg viewBox="0 0 64 64"><g fill="none" strokeLinecap="round"><path d="M50 26A19 19 0 0 0 15 22" stroke="#6a2400" strokeWidth="9"/><path d="M14 38A19 19 0 0 0 49 42" stroke="#6a2400" strokeWidth="9"/><path d="M50 26A19 19 0 0 0 15 22" stroke="#fff4dc" strokeWidth="6"/><path d="M14 38A19 19 0 0 0 49 42" stroke="#fff4dc" strokeWidth="6"/></g><path d="M11 29 23 24 9.5 16Z" fill="#fff4dc" stroke="#6a2400" strokeWidth="2" strokeLinejoin="round"/><path d="M53 35 41 40 54.5 48Z" fill="#fff4dc" stroke="#6a2400" strokeWidth="2" strokeLinejoin="round"/></svg><span className="autoN"><b></b><small>แตะเพื่อหยุด</small></span></button></div>
            <button className="cb sm" id="betUp" aria-label="เพิ่มเดิมพัน"><svg viewBox="0 0 24 24"><path d="M10.5 5h3v5.5H19v3h-5.5V19h-3v-5.5H5v-3h5.5z"/></svg></button>
            <div className="side"><button className="cb" id="auto" aria-label="ออโต้ 10 ครั้ง"><b>AUTO</b></button>ออโต้ 10</div>
          </div>
        </div>
      </div>
      
      <div className="ov" id="bw"><div className="rays"></div><div id="bwIn"><div id="bwTitle">Big win</div><div id="bwAmt">0.00</div><div className="hint">แตะเพื่อข้าม</div></div></div>
      <div className="ov" id="fsi"><div className="rays"></div><div style={{position:'relative'}}>
        <div id="fsiN">10</div><div id="fsiT">Free spins</div>
        <div id="fsiD">ตัวคูณเริ่มที่ x1 และเพิ่มเป็น 2 เท่าทุกครั้งที่ชนะ — ระหว่างฟรีสปินตัวคูณจะไม่รีเซ็ต</div>
        <button className="bigbtn" id="fsStart">Start</button></div></div>
      <div className="ov" id="fse"><div className="rays"></div><div style={{position:'relative'}}>
        <div id="fsiT2" style={{fontFamily:'var(--disp)',fontSize:'40px',color:'#ffd06a',textShadow:'0 4px 0 #5a1a00'}}>Total win</div>
        <div id="fseAmt" style={{fontFamily:'var(--disp)',fontSize:'56px',color:'#fff',textShadow:'0 0 18px #ffb030,0 4px 0 #7a3200',marginTop:'10px'}}>0.00</div>
        <div id="fseSub" className="hint"></div>
        <button className="bigbtn" id="fsCollect">Collect</button></div></div>
      <div className="ov modal" id="buyM"><div className="card"><h2>Feature buy</h2>
        <p>ซื้อเข้ารอบฟรีสปินทันที ราคา <b id="buyPrice">0</b> เครดิต (50 เท่าของเดิมพัน)</p>
        <div className="row2"><button className="btn2" id="buyNo">ยกเลิก</button><button className="btn2 pri" id="buyYes">ซื้อเลย</button></div></div></div>
      <div className="ov modal" id="betM"><div className="card sheet"><h2>เลือกเดิมพัน</h2><div className="bets" id="betsG"></div><div className="row2"><button className="btn2" id="betClose">ปิด</button></div></div></div>
      <div className="ov modal" id="infoM"><div className="card"><h2>วิธีเล่น</h2>
        <p>6 วงล้อ × 5 แถว ชนะเมื่อสัญลักษณ์เดียวกันเรียงติดกันจากวงล้อซ้ายสุด อย่างน้อย 3 วงล้อ (ไม่ต้องอยู่แถวเดียวกัน)</p>
        <p>สัญลักษณ์ที่ชนะจะถูกยิงแตก แล้วสัญลักษณ์ด้านบนร่วงลงมาแทนที่ ทุกครั้งที่ชนะ ตัวคูณจะเพิ่มเป็น 2 เท่า</p>
        <p>สัญลักษณ์กรอบทองที่ชนะจะกลายเป็น Wild (ดาวนายอำเภอ) ที่ใช้แทนได้ทุกตัวยกเว้นระฆัง</p>
        <p>ระฆัง 3 ใบขึ้นไปที่ใดก็ได้ = 10 ฟรีสปิน (+2 ต่อระฆังที่เกิน) ระหว่างฟรีสปินตัวคูณไม่รีเซ็ต</p>
        <p style={{fontSize:'13px'}}>อัตราจ่ายด้านล่างคือเครดิตต่อ 1 way เมื่อเดิมพัน 10 (คูณจำนวน ways และตัวคูณ) ตัวคูณสูงสุด x1024</p><div className="pt" id="ptab"></div>
        <p style={{opacity:'.7',fontSize:'12px'}}>เป็นเกมเพื่อความบันเทิง ใช้เครดิตสมมติเท่านั้น</p>
        <div className="row2"><button className="btn2 pri" id="infoClose">ปิด</button></div></div></div>
      <canvas id="fx"/>
    </div>
  );
}
