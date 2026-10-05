// Aloha Totem — demo slot game (React). Play-money only, no real money.
// Usage: import AlohaTotem from "./AlohaTotem"; <AlohaTotem />
// The component fills its parent (100% width, 100vh height). All art and sound are generated in code.
// Imported into WINNER 69: credits come from the shared wallet and every spin (incl. free spins and
// sticky wilds) is decided by backend/src/extraGames.js - on the server, or locally without one.
import { useEffect, useRef } from "react";

const CSS = `@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700;900&family=Kanit:wght@400;500;600;700&family=Oswald:wght@500;600;700&display=swap');

.aloha-root{position:relative;width:100%;height:100vh;height:100dvh;overflow:hidden;background:var(--bg);font-family:var(--ft);color:var(--ink);user-select:none;-webkit-user-select:none;touch-action:manipulation;--bg:#120a24;--ink:#fff;--gold1:#fff6b8;--gold2:#ffd23a;--gold3:#e8890c;--wood:#5a2a06;--teal:#14a3d6;--teal2:#0b6f9e;--pink:#ff5aa0;
  --fd:"Cinzel","Kanit",Georgia,serif;--fn:"Oswald","Kanit",system-ui,sans-serif;--ft:"Kanit",system-ui,sans-serif;
  box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px);}
.aloha-root *{box-sizing:border-box;-webkit-tap-highlight-color:transparent;}
.aloha-root #wrap{position:relative;width:100%;height:100%;overflow:hidden;background:radial-gradient(ellipse at 50% 30%,#3a1a5a,#0c0618 70%);}
.aloha-root #stage{position:absolute;left:50%;top:50%;width:720px;height:1480px;transform-origin:0 0;overflow:hidden;}
.aloha-root #stage.shake{animation:shake .5s linear infinite;}
@keyframes shake{0%,100%{translate:0 0}20%{translate:-6px 4px}40%{translate:5px -5px}60%{translate:-4px -3px}80%{translate:6px 5px}}
.aloha-root canvas{position:absolute;left:0;top:0;width:720px;height:1480px;display:block;}
.aloha-root #fx{pointer-events:none;z-index:40;}
.aloha-root .gold{background:linear-gradient(180deg,var(--gold1),var(--gold2) 45%,var(--gold3));-webkit-background-clip:text;background-clip:text;color:transparent;}
.aloha-root .outl{position:relative;}
.aloha-root /* top bar */
#top{position:absolute;left:0;right:0;top:0;height:44px;display:flex;justify-content:space-between;align-items:center;padding:0 18px;font:500 19px var(--ft);color:rgba(255,255,255,.85);text-shadow:0 1px 3px #000;z-index:5;}
.aloha-root /* surfboard banner */
#banner{position:absolute;left:30px;top:868px;width:660px;height:86px;border-radius:50%/50%;z-index:6;overflow:hidden;
  background:linear-gradient(180deg,#5fd4ff,#18a4dc 45%,#0b6f9e);border:5px solid #eafaff;box-shadow:0 8px 0 #06486a,0 12px 24px rgba(0,0,0,.45),inset 0 4px 0 rgba(255,255,255,.4);}
.aloha-root #banner::before,.aloha-root #banner::after{content:"";position:absolute;top:0;bottom:0;width:22px;background:repeating-linear-gradient(180deg,#ff8a2a 0 10px,#ffd23a 10px 20px);}
.aloha-root #banner::before{left:70px;}.aloha-root #banner::after{right:70px;}
.aloha-root #bannerIn{position:absolute;inset:0 100px;display:flex;align-items:center;justify-content:center;overflow:hidden;white-space:nowrap;}
.aloha-root #bannerText{font:46px var(--fd);letter-spacing:.5px;filter:drop-shadow(0 3px 0 #06325a) drop-shadow(0 0 2px #06325a);}
.aloha-root #bannerText.ticker{font:600 30px var(--ft);color:#fffbe0;background:none;filter:drop-shadow(0 2px 0 #063a5a);animation:tick 11s linear infinite;}
@keyframes tick{0%{transform:translateX(70%)}100%{transform:translateX(-140%)}}
.aloha-root #bannerText.pop{animation:bpop .35s cubic-bezier(.2,1.8,.4,1);}
@keyframes bpop{0%{transform:scale(.6)}100%{transform:scale(1)}}
.aloha-root #bannerSub{position:absolute;top:962px;left:0;right:0;z-index:6;text-align:center;font:600 22px var(--ft);color:#fff;text-shadow:0 2px 0 #3a0a20,0 0 6px #000;opacity:0;transition:opacity .2s;pointer-events:none;}
.aloha-root /* free spin counter */
#fsPanel{position:absolute;left:0;right:0;top:990px;height:150px;display:flex;align-items:center;justify-content:center;gap:22px;z-index:6;opacity:0;transform:scale(.8);transition:all .4s cubic-bezier(.2,1.5,.4,1);pointer-events:none;}
.aloha-root #fsPanel.on{opacity:1;transform:none;}
.aloha-root #fsLabel{font:56px/0.95 var(--fd);text-align:center;background:linear-gradient(180deg,#ffe3f0,#ff7ab8 50%,#d0306a);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 4px 0 #5a0a2a) drop-shadow(0 0 3px #5a0a2a);transform:rotate(-3deg);}
.aloha-root #fsNum{font:120px var(--fd);filter:drop-shadow(0 5px 0 #6a1a00) drop-shadow(0 0 3px #6a1a00) drop-shadow(0 0 18px #ff6a00);}
.aloha-root #fsNum.flip{animation:flip .5s cubic-bezier(.2,1.6,.4,1);}
@keyframes flip{0%{transform:scale(1.8) rotate(-12deg);opacity:.2}100%{transform:none;opacity:1}}
.aloha-root /* info pills */
#pills{position:absolute;left:24px;right:24px;top:1146px;display:flex;gap:12px;z-index:6;}
.aloha-root .pill{flex:1;height:58px;border-radius:14px;background:linear-gradient(180deg,rgba(40,14,30,.88),rgba(20,6,16,.92));border:2px solid #c8892a;box-shadow:inset 0 2px 0 rgba(255,220,140,.25),0 4px 10px rgba(0,0,0,.4);display:flex;align-items:center;gap:8px;padding:0 12px;}
.aloha-root .pill svg{flex:none;width:30px;height:30px;}
.aloha-root .pill .v{flex:1;text-align:right;font:600 25px var(--ft);color:#fff4d0;font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.aloha-root .pill .v.hot{color:#ffe14a;text-shadow:0 0 10px #ff9a00;}
.aloha-root /* controls */
#controls{position:absolute;left:0;right:0;top:1228px;height:200px;z-index:7;}
.aloha-root .btn{position:absolute;border:0;padding:0;cursor:pointer;border-radius:50%;background:radial-gradient(circle at 40% 30%,#7a4a2a,#3a1a0a 70%);box-shadow:0 0 0 4px #e9a92a,0 0 0 7px #5a2a06,0 8px 16px rgba(0,0,0,.5);display:grid;place-items:center;color:#ffe9a8;transition:transform .1s,filter .2s;}
.aloha-root .btn:active{transform:scale(.92);}
.aloha-root .btn:focus-visible{outline:4px solid #7ad8ff;outline-offset:6px;}
.aloha-root .btn svg{width:46%;height:46%;}
.aloha-root .btn.on{background:radial-gradient(circle at 40% 30%,#ffd86a,#e0820c 70%);color:#5a2a06;}
.aloha-root .btn[disabled]{filter:grayscale(.8) brightness(.6);pointer-events:none;}
.aloha-root .sm{width:78px;height:78px;top:66px;}
.aloha-root #bMenu{left:22px;}.aloha-root #bTurbo{left:126px;}.aloha-root #bMinus{left:220px;top:76px;width:64px;height:64px;}
.aloha-root #bPlus{left:436px;top:76px;width:64px;height:64px;}.aloha-root #bAuto{left:516px;}.aloha-root #bSound{left:620px;}
.aloha-root #bSpin{left:285px;top:30px;width:150px;height:150px;background:radial-gradient(circle at 42% 30%,#ffb3e0,#e0408a 45%,#7a0a3a 80%);box-shadow:0 0 0 6px #ffd23a,0 0 0 11px #6a2a04,0 0 30px rgba(255,200,80,.6),0 12px 24px rgba(0,0,0,.5);}
.aloha-root #bSpin svg{width:62%;height:62%;transition:transform .3s;}
.aloha-root #bSpin.spinning svg{animation:rot .6s linear infinite;}
.aloha-root #bSpin.auto::after{content:attr(data-n);position:absolute;font:42px var(--fd);color:#fff;text-shadow:0 3px 0 #5a0a2a,0 0 6px #000;}
@keyframes rot{to{transform:rotate(360deg)}}
.aloha-root .lbl{position:absolute;top:150px;font:500 15px var(--ft);color:#ffe9b8;text-shadow:0 1px 2px #000;width:90px;text-align:center;pointer-events:none;}
.aloha-root /* overlays */
.ov{position:absolute;inset:0;z-index:30;display:none;align-items:center;justify-content:center;flex-direction:column;}
.aloha-root .ov.on{display:flex;}
.aloha-root #splash{background:radial-gradient(ellipse at 50% 35%,#ff9a4a 0%,#c03a6a 30%,#3a0f5a 65%,#12062a);z-index:60;cursor:pointer;}
.aloha-root #logo{font:110px/0.85 var(--fd);text-align:center;transform:rotate(-4deg);filter:drop-shadow(0 8px 0 #6a1a04) drop-shadow(0 0 4px #4a0a00) drop-shadow(0 0 40px rgba(255,160,40,.6));}
.aloha-root #logo small{display:block;font-size:54px;margin-top:10px;background:linear-gradient(180deg,#bff0ff,#3ab0f0 50%,#1458b0);-webkit-background-clip:text;background-clip:text;color:transparent;}
.aloha-root #splashArt{position:static;width:400px;height:400px;margin:30px 0 10px;}
.aloha-root #load{width:420px;height:22px;border-radius:12px;background:rgba(0,0,0,.4);border:3px solid #ffd23a;overflow:hidden;margin-top:30px;}
.aloha-root #loadBar{height:100%;width:0;background:linear-gradient(90deg,#ff7a2a,#ffe14a);transition:width .2s;}
.aloha-root #tapStart{font:600 34px var(--ft);margin-top:34px;color:#fff;display:none;animation:blink 1.2s ease-in-out infinite;}
@keyframes blink{50%{opacity:.35}}
.aloha-root #demo{position:absolute;bottom:40px;font:500 18px var(--ft);color:rgba(255,255,255,.7);text-align:center;padding:0 40px;}
.aloha-root /* big win */
#bigwin{background:radial-gradient(circle,rgba(40,0,40,.55),rgba(0,0,0,.85));cursor:pointer;}
.aloha-root #rays{position:absolute;width:1400px;height:1400px;left:50%;top:44%;margin:-700px 0 0 -700px;background:repeating-conic-gradient(rgba(255,220,120,.32) 0 8deg,rgba(255,220,120,0) 8deg 20deg);border-radius:50%;-webkit-mask:radial-gradient(circle,#000 10%,transparent 62%);mask:radial-gradient(circle,#000 10%,transparent 62%);animation:rot 14s linear infinite;}
.aloha-root #bwTitle{position:relative;font:118px/0.9 var(--fd);text-align:center;filter:drop-shadow(0 8px 0 #7a2a00) drop-shadow(0 0 4px #4a0a00) drop-shadow(0 0 30px rgba(255,180,40,.8));}
.aloha-root #bwTitle.punch{animation:punch .6s cubic-bezier(.2,1.8,.4,1);}
@keyframes punch{0%{transform:scale(2.4);opacity:0}100%{transform:none;opacity:1}}
.aloha-root #bwAmt{position:relative;margin-top:40px;font:96px var(--fd);color:#fff;font-variant-numeric:tabular-nums;text-shadow:0 6px 0 #5a2a00,0 0 20px #ffb02a,0 0 3px #000;}
.aloha-root #bwHint{position:relative;margin-top:50px;font:500 22px var(--ft);color:rgba(255,255,255,.7);}
.aloha-root /* fs intro/end */
#fsIntro,.aloha-root #fsEnd{background:radial-gradient(ellipse at 50% 40%,rgba(255,120,40,.35),rgba(30,0,30,.8) 70%);}
.aloha-root .fsBig{font:220px/0.9 var(--fd);filter:drop-shadow(0 8px 0 #7a2a00) drop-shadow(0 0 4px #4a0a00) drop-shadow(0 0 40px #ff7a00);}
.aloha-root .fsWord{font:96px/0.9 var(--fd);margin-top:-6px;filter:drop-shadow(0 6px 0 #7a2a00) drop-shadow(0 0 3px #4a0a00);}
.aloha-root .fsRule{margin-top:30px;max-width:560px;text-align:center;font:600 28px/1.35 var(--ft);color:#fff4d8;text-shadow:0 2px 0 #4a0a10,0 0 6px #000;}
.aloha-root .fsRule b{color:#ffd23a;}
.aloha-root .woodBtn{margin-top:44px;padding:16px 64px;font:54px var(--fd);color:#ffe14a;border:0;border-radius:18px;cursor:pointer;background:linear-gradient(180deg,#b06a2a,#6a3a10);box-shadow:inset 0 3px 0 rgba(255,220,150,.5),0 0 0 5px #ffd23a,0 0 0 9px #4a1a04,0 10px 20px rgba(0,0,0,.6);text-shadow:0 4px 0 #3a1404;}
.aloha-root .woodBtn:active{transform:scale(.95);}
.aloha-root .woodBtn:focus-visible{outline:4px solid #7ad8ff;outline-offset:10px;}
.aloha-root #fsLoad{margin-top:44px;font:64px var(--fd);color:#ffe14a;text-shadow:0 0 16px #ff7a00,0 4px 0 #4a1a04;}
.aloha-root #fsTotal{margin-top:24px;font:110px var(--fd);color:#fff;text-shadow:0 6px 0 #5a2a00,0 0 24px #ffb02a,0 0 3px #000;font-variant-numeric:tabular-nums;}
.aloha-root /* sheets */
.sheet{background:rgba(10,4,20,.75);}
.aloha-root .card{width:640px;max-height:1240px;overflow:auto;background:linear-gradient(180deg,#3a1440,#1a0820);border:4px solid #e9a92a;border-radius:28px;padding:28px 28px 34px;box-shadow:0 20px 50px rgba(0,0,0,.6);}
.aloha-root .card h2{margin:0 0 6px;font:58px var(--fd);text-align:center;}
.aloha-root .card h3{font:600 28px var(--ft);color:#ffd23a;margin:26px 0 10px;}
.aloha-root .card p,.aloha-root .card li{font:500 22px/1.5 var(--ft);color:#f5e8ff;margin:6px 0;}
.aloha-root .pt{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
.aloha-root .pt div{display:flex;align-items:center;gap:10px;background:rgba(255,255,255,.06);border-radius:16px;padding:8px;}
.aloha-root .pt canvas{position:static;width:84px;height:84px;flex:none;}
.aloha-root .pt span{font:500 18px/1.35 var(--ft);color:#fff;font-variant-numeric:tabular-nums;}
.aloha-root .pt span i{font-style:normal;color:#ffd23a;display:inline-block;width:22px;}
.aloha-root .close{display:block;margin:26px auto 0;}
.aloha-root #autoCard{width:520px;text-align:center;}
.aloha-root .chips{display:flex;flex-wrap:wrap;gap:16px;justify-content:center;margin-top:20px;}
.aloha-root .chip{width:130px;height:84px;border-radius:18px;border:3px solid #e9a92a;background:linear-gradient(180deg,#6a2a6a,#2a0a2a);font:44px var(--fd);color:#ffe9a8;cursor:pointer;}
.aloha-root .chip:active{transform:scale(.95);}
.aloha-root #toast{position:absolute;left:50%;top:180px;transform:translate(-50%,-20px);z-index:50;padding:14px 26px;border-radius:16px;background:rgba(20,6,20,.9);border:2px solid #ffd23a;font:600 26px var(--ft);opacity:0;transition:all .3s;pointer-events:none;white-space:nowrap;}
.aloha-root #toast.on{opacity:1;transform:translate(-50%,0);}
.aloha-root #flash{position:absolute;inset:0;background:#fff;opacity:0;pointer-events:none;z-index:45;transition:opacity .5s;}
@media (prefers-reduced-motion: reduce){.aloha-root #stage.shake{animation:none}.aloha-root #rays{animation:none}}

.aloha-root /* ===== v2 polish: banner,.aloha-root deck,.aloha-root buttons,.aloha-root sparkles ===== */
#banner{background:linear-gradient(180deg,#9ff0ff 0%,#3cc4f2 30%,#0f8fd0 62%,#075a8e 100%);border:5px solid #f4fdff;
  box-shadow:0 7px 0 #04405e,0 0 0 2px rgba(0,60,90,.5),0 14px 26px rgba(0,0,0,.45),inset 0 -8px 14px rgba(0,40,80,.45);animation:float 3.4s ease-in-out infinite;}
.aloha-root #banner::before,.aloha-root #banner::after{width:26px;background:linear-gradient(90deg,#c0360e 0 3px,transparent 3px calc(100% - 3px),#c0360e 0),repeating-linear-gradient(180deg,#ff7a1a 0 11px,#ffe14a 11px 22px);box-shadow:inset 0 0 6px rgba(120,30,0,.5);}
.aloha-root #banner::before{left:64px;}.aloha-root #banner::after{right:64px;}
.aloha-root .bGloss{position:absolute;left:7%;right:7%;top:3px;height:40%;border-radius:50%;background:linear-gradient(rgba(255,255,255,.6),rgba(255,255,255,0));pointer-events:none;}
.aloha-root .bWave{position:absolute;inset:0;opacity:.18;pointer-events:none;background:radial-gradient(circle at 50% 120%,transparent 38%,#fff 39% 41%,transparent 42%) 0 0/46px 30px;-webkit-mask:linear-gradient(transparent 45%,#000);mask:linear-gradient(transparent 45%,#000);}
.aloha-root .bShine{position:absolute;top:-20%;bottom:-20%;width:80px;left:-140px;transform:skewX(-24deg);background:linear-gradient(90deg,transparent,rgba(255,255,255,.85),transparent);animation:bshine 3.8s ease-in-out infinite;pointer-events:none;z-index:1;}
@keyframes bshine{0%{left:-140px}32%{left:110%}100%{left:110%}}
@keyframes float{0%,100%{translate:0 0}50%{translate:0 -4px}}
.aloha-root #bannerIn{z-index:2;}
.aloha-root #banner.win{border-color:#fff3a0;animation:float 3.4s ease-in-out infinite,bglow 1s ease-in-out infinite;}
.aloha-root #banner.win .bShine{animation-duration:1.3s;}
.aloha-root #banner.flash::after{animation:none;}
@keyframes bglow{0%,100%{box-shadow:0 7px 0 #04405e,0 0 18px 4px rgba(255,210,80,.55),0 14px 26px rgba(0,0,0,.45)}50%{box-shadow:0 7px 0 #04405e,0 0 42px 12px rgba(255,220,90,.95),0 14px 26px rgba(0,0,0,.45)}}
.aloha-root #bannerText.ticker{font:600 30px var(--ft);color:#fffbe8;background:none;filter:drop-shadow(0 2px 0 #054268) drop-shadow(0 0 2px #054268);animation:tin 3.8s ease both;display:flex;align-items:center;gap:6px;}
.aloha-root #bannerText.ticker .g{color:#ffe14a;}
.aloha-root #bannerText.ticker img{height:46px;width:46px;margin:0 2px;filter:drop-shadow(0 0 6px rgba(255,220,100,.9));}
@keyframes tin{0%{opacity:0;transform:translateY(22px) scale(.9)}10%{opacity:1;transform:none}86%{opacity:1;transform:none}100%{opacity:0;transform:translateY(-16px)}}
.aloha-root /* base sign */
#sign{position:absolute;left:0;right:0;top:992px;height:124px;z-index:5;text-align:center;transition:opacity .5s,transform .5s;pointer-events:none;}
.aloha-root #stage.fs #sign{opacity:0;transform:scale(.8);}
.aloha-root #signT{display:inline-block;font:78px/1 var(--fd);letter-spacing:1px;background:linear-gradient(105deg,#ffe36a 0%,#ffb21a 30%,#fffbe0 45%,#ffb21a 55%,#ffd23a 80%,#e8890c 100%) 0 0/260% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;
  filter:drop-shadow(0 5px 0 #7a2a00) drop-shadow(0 0 3px #4a0a00) drop-shadow(0 0 22px rgba(255,170,40,.55));animation:sheen 3.2s ease-in-out infinite;transform:rotate(-2deg);}
@keyframes sheen{0%{background-position:100% 0}60%,100%{background-position:0 0}}
.aloha-root #signS{margin-top:4px;font:600 24px var(--ft);color:#fff;text-shadow:0 2px 0 #7a3a10,0 0 8px rgba(122,58,16,.8);}
.aloha-root /* control deck */
#deck{position:absolute;left:8px;right:8px;top:1124px;height:298px;z-index:5;border-radius:38px 38px 30px 30px;overflow:hidden;
  background:repeating-linear-gradient(176deg,rgba(255,200,140,.05) 0 3px,transparent 3px 14px),linear-gradient(180deg,rgba(104,48,20,.95),rgba(54,20,8,.96) 55%,rgba(30,8,4,.97));
  box-shadow:inset 0 3px 0 #fff0b0,inset 0 0 0 3px #d08a22,inset 0 0 0 6px #5a2206,inset 0 18px 30px rgba(255,190,90,.18),0 -8px 28px rgba(255,180,60,.35),0 14px 28px rgba(0,0,0,.55);}
.aloha-root #deck::after{content:"";position:absolute;top:0;height:6px;width:160px;left:-200px;background:linear-gradient(90deg,transparent,#fff,transparent);filter:blur(1px);animation:trim 4.5s ease-in-out infinite;}
@keyframes trim{0%{left:-200px}40%{left:105%}100%{left:105%}}
.aloha-root /* pills */
.pill{position:relative;overflow:hidden;border:3px solid transparent;background:linear-gradient(180deg,rgba(66,22,44,.96),rgba(22,6,16,.97)) padding-box,linear-gradient(180deg,#fff4b0,#e9a92a 45%,#7a4206) border-box;box-shadow:0 4px 10px rgba(0,0,0,.45),inset 0 -6px 10px rgba(0,0,0,.4);}
.aloha-root .pill::before{content:"";position:absolute;left:6px;right:6px;top:2px;height:42%;border-radius:10px;background:linear-gradient(rgba(255,255,255,.2),rgba(255,255,255,0));pointer-events:none;}
.aloha-root .pill::after{content:"";position:absolute;top:-10px;bottom:-10px;width:40px;left:-60px;transform:skewX(-24deg);background:linear-gradient(90deg,transparent,rgba(255,240,200,.5),transparent);animation:pshine 5s ease-in-out infinite;pointer-events:none;}
.aloha-root .pill:nth-child(2)::after{animation-delay:.35s}.aloha-root .pill:nth-child(3)::after{animation-delay:.7s}
@keyframes pshine{0%{left:-60px}20%{left:110%}100%{left:110%}}
.aloha-root .pill svg{filter:drop-shadow(0 0 4px rgba(255,200,60,.6));}
.aloha-root .pill .v.hot{color:#ffe14a;animation:hot 1s ease-in-out infinite;}
.aloha-root .pill:has(.v.hot){background:linear-gradient(180deg,rgba(110,50,20,.96),rgba(40,10,10,.97)) padding-box,linear-gradient(180deg,#fffbd0,#ffd23a 45%,#c8701a) border-box;}
@keyframes hot{50%{text-shadow:0 0 16px #ffb000,0 0 4px #fff3a0}}
.aloha-root /* buttons */
.btn{background:radial-gradient(circle at 42% 28%,#9a5a2a,#4a1e08 62%,#2a0c02);box-shadow:0 0 0 3px #fff0a8,0 0 0 6px #d08a22,0 0 0 9px #4a1a04,inset 0 -8px 12px rgba(0,0,0,.55),inset 0 4px 6px rgba(255,220,160,.3),0 8px 14px rgba(0,0,0,.55);}
.aloha-root .btn::before{content:"";position:absolute;left:18%;right:18%;top:7%;height:34%;border-radius:50%;background:linear-gradient(rgba(255,255,255,.38),rgba(255,255,255,0));pointer-events:none;}
.aloha-root .btn svg{filter:drop-shadow(0 2px 0 rgba(0,0,0,.5));}
.aloha-root .btn.on{box-shadow:0 0 0 3px #fff,0 0 0 6px #ffd23a,0 0 0 9px #6a2a04,0 0 22px 6px rgba(255,200,60,.8),0 8px 14px rgba(0,0,0,.5);}
.aloha-root #bSpin{background:radial-gradient(circle at 40% 26%,#ffd0ec,#ff5aa8 34%,#d01e72 62%,#6a0632);box-shadow:0 0 0 5px #fff6c0,0 0 0 10px #ffb21a,0 0 0 14px #5a2204,inset 0 -14px 20px rgba(80,0,30,.6),inset 0 6px 10px rgba(255,255,255,.4),0 14px 24px rgba(0,0,0,.55);animation:spinIdle 2.2s ease-in-out infinite;}
.aloha-root #bSpin.spinning{animation:none;}
@keyframes spinIdle{50%{filter:brightness(1.12) saturate(1.1)}}
.aloha-root #spinFx{position:absolute;left:245px;top:-10px;width:230px;height:230px;pointer-events:none;}
.aloha-root #spinFx::before{content:"";position:absolute;inset:0;border-radius:50%;background:conic-gradient(from 0deg,transparent 0 12%,#fff6b0 18%,#ffd23a 22%,transparent 30% 62%,#fff6b0 68%,#ff9ad0 72%,transparent 80%);
  -webkit-mask:radial-gradient(circle,transparent 60%,#000 63% 69%,transparent 72%);mask:radial-gradient(circle,transparent 60%,#000 63% 69%,transparent 72%);animation:rot 3s linear infinite;filter:blur(.5px);}
.aloha-root #spinFx::after{content:"";position:absolute;inset:8px;border-radius:50%;background:radial-gradient(circle,rgba(255,140,200,.65),rgba(255,200,80,.25) 45%,transparent 68%);animation:breathe 2.2s ease-in-out infinite;}
.aloha-root #controls.spinning #spinFx::before{animation-duration:.7s;}
@keyframes breathe{0%,100%{transform:scale(.9);opacity:.6}50%{transform:scale(1.12);opacity:1}}
.aloha-root .lbl{font:600 16px var(--ft);color:#ffe3a0;text-shadow:0 2px 0 #2a0a02;}
.aloha-root /* twinkle stars */
.tw{position:absolute;width:var(--s);height:var(--s);margin:calc(var(--s)/-2) 0 0 calc(var(--s)/-2);pointer-events:none;z-index:9;opacity:0;
  background:radial-gradient(circle,#fff 0 16%,var(--c) 38%,transparent 70%);clip-path:polygon(50% 0,58% 42%,100% 50%,58% 58%,50% 100%,42% 58%,0 50%,42% 42%);animation:tw var(--d) ease-in-out infinite;animation-delay:var(--dl);}
@keyframes tw{0%,100%{opacity:0;transform:scale(.2) rotate(0)}45%{opacity:1;transform:scale(1) rotate(40deg)}60%{opacity:.9;transform:scale(.8) rotate(60deg)}}
@media (prefers-reduced-motion: reduce){.aloha-root #banner,.aloha-root .bShine,.aloha-root .pill::after,.aloha-root #deck::after,.aloha-root #spinFx::before,.aloha-root #spinFx::after,.aloha-root .tw,.aloha-root #signT,.aloha-root #bSpin{animation:none!important}.aloha-root .tw{opacity:.7}}

.aloha-root /* ===== center win popup ===== */
#winPop{position:absolute;left:0;right:0;top:400px;height:320px;z-index:20;display:flex;align-items:center;justify-content:center;pointer-events:none;opacity:0;}
.aloha-root #winPop.on{opacity:1;}
.aloha-root #wpBack{position:absolute;left:50%;top:50%;width:760px;height:300px;margin:-150px 0 0 -380px;background:radial-gradient(ellipse at center,rgba(40,0,30,.78) 0%,rgba(40,0,30,.5) 40%,transparent 70%);}
.aloha-root #wpRays{position:absolute;left:50%;top:50%;width:900px;height:900px;margin:-450px 0 0 -450px;border-radius:50%;background:repeating-conic-gradient(rgba(255,226,130,.45) 0 6deg,rgba(255,226,130,0) 6deg 18deg);
  -webkit-mask:radial-gradient(circle,#000 6%,transparent 45%);mask:radial-gradient(circle,#000 6%,transparent 45%);animation:rot 9s linear infinite;transform:scale(0);transition:transform .45s cubic-bezier(.2,1.6,.4,1);}
.aloha-root #winPop.on #wpRays{transform:scale(1);}
.aloha-root #wpBox{position:relative;text-align:center;transform-origin:50% 50%;}
.aloha-root #wpLabel{font:52px var(--fd);letter-spacing:2px;background:linear-gradient(180deg,#e9fbff,#7ad8ff 50%,#1a8ad8);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 4px 0 #063a6a) drop-shadow(0 0 3px #063a6a);margin-bottom:-6px;}
.aloha-root #wpAmt{font:128px/1 var(--fd);font-variant-numeric:tabular-nums;white-space:nowrap;background:linear-gradient(105deg,#fff6b8 0%,#ffd23a 28%,#fffdf0 45%,#ffc21a 58%,#e8890c 100%) 0 0/260% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;
  filter:drop-shadow(0 7px 0 #7a2a00) drop-shadow(0 0 3px #4a0a00) drop-shadow(0 0 3px #4a0a00) drop-shadow(0 0 28px rgba(255,170,40,.9));animation:sheen 1.6s ease-in-out infinite;}
.aloha-root #wpBox.pop{animation:wpop .55s cubic-bezier(.2,1.7,.4,1) both;}
@keyframes wpop{0%{transform:scale(.2) rotate(-8deg);opacity:0}100%{transform:none;opacity:1}}
.aloha-root #wpBox.beat{animation:wbeat .22s ease-out;}
@keyframes wbeat{0%{transform:scale(1.08)}100%{transform:none}}
.aloha-root #wpBox.fly{transition:transform .5s cubic-bezier(.6,0,.8,.4),opacity .5s;opacity:0;}
.aloha-root #wpBack,.aloha-root #wpRays{transition:opacity .3s,transform .45s cubic-bezier(.2,1.6,.4,1);}.aloha-root #winPop.out #wpBack,.aloha-root #winPop.out #wpRays{opacity:0;}
.aloha-root #winPop.big #wpAmt{font-size:150px;}
.aloha-root .pill.bump{animation:bump .5s cubic-bezier(.2,1.8,.4,1);}
@keyframes bump{0%{transform:scale(1.25);box-shadow:0 0 40px 10px rgba(255,220,80,.9)}100%{transform:none}}

.aloha-root /* ===== v4: premium online-casino look ===== */
#wrap{background:radial-gradient(ellipse at 50% 30%,#2a1c10,#000 70%);}
.aloha-root .gold{background:linear-gradient(180deg,#fffbe8 0%,#ffe9a8 18%,#f0c050 40%,#9a6210 50%,#c88a24 56%,#ffe08a 78%,#fff6d0 100%);-webkit-background-clip:text;background-clip:text;color:transparent;}
.aloha-root #vig{position:absolute;inset:0;z-index:4;pointer-events:none;background:radial-gradient(ellipse 75% 60% at 50% 40%,transparent 55%,rgba(0,0,0,.55) 100%),linear-gradient(180deg,rgba(0,0,0,.55),transparent 12%);}
.aloha-root #top{background:linear-gradient(180deg,rgba(0,0,0,.85),rgba(0,0,0,0));font:500 17px var(--fn);letter-spacing:1.5px;color:#d8c08a;text-transform:uppercase;}
.aloha-root /* win bar */
#bannerGlow{position:absolute;left:60px;right:60px;top:880px;height:60px;z-index:5;border-radius:50%;background:radial-gradient(ellipse,rgba(255,190,60,.85),transparent 70%);filter:blur(14px);opacity:.25;transition:opacity .3s;pointer-events:none;}
.aloha-root #bannerGlow.win{opacity:1;animation:gpulse .9s ease-in-out infinite;}
@keyframes gpulse{50%{opacity:.55;transform:scaleX(1.06)}}
.aloha-root #banner{left:28px;width:664px;top:872px;height:80px;border:0;border-radius:0;animation:none;box-shadow:none;
  clip-path:polygon(5% 0,95% 0,100% 50%,95% 100%,5% 100%,0 50%);
  background:linear-gradient(180deg,#fff6d0 0%,#f0c460 20%,#a8701a 48%,#4a2c04 52%,#d8a240 78%,#fff0b0 100%);}
.aloha-root #banner.win{animation:none;box-shadow:none;}
.aloha-root .bPlate{position:absolute;inset:4px;clip-path:polygon(4.6% 0,95.4% 0,100% 50%,95.4% 100%,4.6% 100%,0 50%);background:radial-gradient(ellipse 70% 120% at 50% 0,#33261a,#0b0806 65%,#050302);}
.aloha-root .bPlate::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(255,255,255,.12),rgba(255,255,255,0) 45%);}
.aloha-root .bWave,.aloha-root .bGloss{display:none;}
.aloha-root #banner::before,.aloha-root #banner::after{width:14px;height:14px;top:33px;bottom:auto;transform:rotate(45deg);background:linear-gradient(135deg,#ffc0c0,#e01020 45%,#400004);box-shadow:0 0 0 2px #fff0b0,0 0 12px #ff2030;z-index:3;}
.aloha-root #banner::before{left:44px;}.aloha-root #banner::after{right:44px;}
.aloha-root .bShine{z-index:2;background:linear-gradient(90deg,transparent,rgba(255,240,200,.35),transparent);width:60px;}
.aloha-root #bannerIn{inset:0 70px;z-index:3;}
.aloha-root #bannerText{font:700 48px var(--fn);letter-spacing:2px;filter:drop-shadow(0 3px 0 #000) drop-shadow(0 0 10px rgba(255,180,40,.45));}
.aloha-root #bannerText.ticker{font:500 26px var(--ft);letter-spacing:.5px;color:#e9dcc0;filter:drop-shadow(0 2px 0 #000);}
.aloha-root #bannerText.ticker .g{color:#ffcf4a;font-family:var(--fn);font-weight:700;}
.aloha-root #bannerText.ticker img{height:42px;width:42px;filter:drop-shadow(0 0 5px rgba(255,190,60,.7));}
.aloha-root #bannerSub{font:500 20px var(--fn);letter-spacing:1px;color:#e9d8b0;text-shadow:0 2px 0 #000,0 0 8px #000;}
.aloha-root /* sign */
#signT{font:900 64px/1 var(--fd);letter-spacing:6px;transform:none;background:linear-gradient(105deg,#9a6210 0%,#f0c050 22%,#fffbe8 40%,#f0c050 55%,#9a6210 72%,#ffe08a 90%,#9a6210 100%) 0 0/260% 100%;-webkit-background-clip:text;background-clip:text;
  filter:drop-shadow(0 3px 0 #2a1600) drop-shadow(0 0 1px #000) drop-shadow(0 0 18px rgba(255,170,40,.45));}
.aloha-root #signS{font:500 20px var(--fn);letter-spacing:6px;color:#d8c08a;text-shadow:0 2px 0 #000;margin-top:10px;}
.aloha-root #signS::before,.aloha-root #signS::after{content:"";display:inline-block;width:70px;height:1px;vertical-align:middle;margin:0 14px;background:linear-gradient(90deg,transparent,#e0b050,transparent);}
.aloha-root /* free spin counter */
#fsLabel{font:900 40px/1.05 var(--fd);letter-spacing:3px;transform:none;background:linear-gradient(180deg,#fffbe8,#f0c050 45%,#9a6210 52%,#ffe08a);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 3px 0 #000) drop-shadow(0 0 12px rgba(255,120,0,.5));}
.aloha-root #fsNum{font:700 120px/1 var(--fn);filter:drop-shadow(0 4px 0 #000) drop-shadow(0 0 22px #ff5a00);}
.aloha-root /* deck */
#deck{background:repeating-linear-gradient(45deg,rgba(255,255,255,.022) 0 2px,transparent 2px 6px),repeating-linear-gradient(-45deg,rgba(255,255,255,.022) 0 2px,transparent 2px 6px),linear-gradient(180deg,#1e1a16,#0a0807 55%,#030202);
  border-radius:22px 22px 18px 18px;box-shadow:inset 0 2px 0 #fff4c8,inset 0 0 0 2px #c8902a,inset 0 0 0 4px #2a1a04,inset 0 0 0 5px rgba(255,220,140,.35),inset 0 30px 40px rgba(255,190,90,.07),0 -10px 34px rgba(255,170,50,.28),0 18px 30px rgba(0,0,0,.7);}
.aloha-root /* pills */
.pill{height:62px;border-radius:8px;border-width:2px;background:linear-gradient(180deg,#17161b,#060608) padding-box,linear-gradient(180deg,#fff0b0,#b8801a 50%,#4a2c04) border-box;box-shadow:inset 0 2px 10px rgba(0,0,0,.8),0 3px 8px rgba(0,0,0,.6);gap:10px;padding:0 12px;}
.aloha-root .pill::before{background:linear-gradient(rgba(255,255,255,.08),rgba(255,255,255,0));border-radius:6px;}
.aloha-root .pill .vv{flex:1;display:flex;flex-direction:column;align-items:flex-end;min-width:0;line-height:1;}
.aloha-root .pill .cap{font:500 12px var(--fn);letter-spacing:2px;color:#a89060;margin-bottom:4px;}
.aloha-root .pill .v{font:600 26px var(--fn);color:#fff;letter-spacing:.5px;width:100%;}
.aloha-root .pill .v.hot{color:#ffd24a;}
.aloha-root .pill:has(.v.hot){background:linear-gradient(180deg,#2a1e0a,#0a0603) padding-box,linear-gradient(180deg,#fffbd0,#ffcc3a 45%,#a86a10) border-box;box-shadow:inset 0 2px 10px rgba(0,0,0,.8),0 0 18px rgba(255,180,40,.45);}
.aloha-root .pill svg{width:26px;height:26px;}
.aloha-root /* buttons */
.btn{background:radial-gradient(circle at 40% 28%,#4a4650,#18161c 55%,#060507);color:#f0cc6a;box-shadow:0 0 0 2px #fff2c0,0 0 0 4px #b8801a,0 0 0 6px #2a1a04,inset 0 -8px 12px rgba(0,0,0,.7),inset 0 3px 5px rgba(255,255,255,.18),0 8px 14px rgba(0,0,0,.7);}
.aloha-root .btn::before{background:linear-gradient(rgba(255,255,255,.22),rgba(255,255,255,0));}
.aloha-root .btn.on{background:radial-gradient(circle at 40% 28%,#ffe9a0,#d89a2a 55%,#7a4a08);color:#1a0e02;box-shadow:0 0 0 2px #fff,0 0 0 4px #ffcc3a,0 0 0 6px #3a2204,0 0 20px 5px rgba(255,180,40,.75),0 8px 14px rgba(0,0,0,.6);}
.aloha-root #bSpin{background:radial-gradient(circle at 44% 28%,#5a4a2a,#1e160a 48%,#050302 80%);box-shadow:0 0 0 3px #fff6d0,0 0 0 8px #d8a240,0 0 0 10px #6a4408,0 0 0 13px #1a1002,inset 0 0 26px rgba(255,140,0,.35),inset 0 -14px 22px rgba(0,0,0,.8),0 0 34px rgba(255,140,30,.5),0 14px 24px rgba(0,0,0,.7);}
.aloha-root #bSpin svg{filter:drop-shadow(0 0 8px rgba(255,170,40,.8)) drop-shadow(0 2px 0 #000);}
.aloha-root #bSpin.auto::after{font:700 46px var(--fn);color:#ffe08a;text-shadow:0 3px 0 #000,0 0 10px #ff8a00;}
.aloha-root #spinFx::before{background:conic-gradient(from 0deg,transparent 0 10%,#fff6c0 16%,#ffb020 20%,#ff4a00 24%,transparent 32% 60%,#fff6c0 66%,#ffb020 70%,#ff4a00 74%,transparent 82%);}
.aloha-root #spinFx::after{background:radial-gradient(circle,rgba(255,120,20,.55),rgba(255,60,0,.18) 45%,transparent 68%);}
.aloha-root .lbl{font:500 13px var(--fn);letter-spacing:2px;color:#a89060;text-transform:uppercase;text-shadow:0 1px 0 #000;}
.aloha-root /* win popup */
#wpBack{background:radial-gradient(ellipse at center,rgba(0,0,0,.82) 0%,rgba(0,0,0,.55) 40%,transparent 70%);}
.aloha-root #wpRays{background:repeating-conic-gradient(rgba(255,206,110,.38) 0 3deg,rgba(255,206,110,0) 3deg 12deg);}
.aloha-root #wpLabel{font:900 46px var(--fd);letter-spacing:8px;background:linear-gradient(180deg,#fffbe8,#f0c050 45%,#9a6210 52%,#ffe08a);-webkit-background-clip:text;background-clip:text;filter:drop-shadow(0 3px 0 #000);margin-bottom:0;}
.aloha-root #wpAmt{font:700 132px/1 var(--fn);letter-spacing:1px;background:linear-gradient(180deg,#fffef4 0%,#ffeaa0 22%,#f0c050 44%,#8a5408 50%,#c88a24 58%,#ffe08a 82%,#fff6d0 100%);-webkit-background-clip:text;background-clip:text;animation:none;
  -webkit-text-stroke:1.5px rgba(40,20,0,.9);filter:drop-shadow(0 5px 0 #000) drop-shadow(0 0 26px rgba(255,160,30,.8));}
.aloha-root #winPop.big #wpAmt{font-size:150px;}
.aloha-root /* big win / overlays */
#bigwin{background:radial-gradient(circle,rgba(30,10,0,.6),rgba(0,0,0,.92));}
.aloha-root #rays{background:repeating-conic-gradient(rgba(255,206,110,.3) 0 4deg,rgba(255,206,110,0) 4deg 14deg);}
.aloha-root #bwTitle{font:900 92px/1 var(--fd);letter-spacing:4px;filter:drop-shadow(0 5px 0 #000) drop-shadow(0 0 30px rgba(255,160,30,.8));}
.aloha-root #bwAmt{font:700 112px var(--fn);color:transparent;background:linear-gradient(180deg,#fffef4,#ffeaa0 22%,#f0c050 44%,#8a5408 50%,#ffe08a 82%,#fff6d0);-webkit-background-clip:text;background-clip:text;text-shadow:none;-webkit-text-stroke:1.5px rgba(40,20,0,.9);filter:drop-shadow(0 5px 0 #000) drop-shadow(0 0 26px rgba(255,160,30,.8));}
.aloha-root #bwHint{font:500 18px var(--fn);letter-spacing:3px;color:#a89060;}
.aloha-root #splash{background:radial-gradient(ellipse at 50% 38%,#4a2a0a 0%,#1a0c04 45%,#000 80%);}
.aloha-root #logo{font:900 96px/0.95 var(--fd);letter-spacing:6px;transform:none;filter:drop-shadow(0 5px 0 #000) drop-shadow(0 0 30px rgba(255,160,30,.55));}
.aloha-root #logo small{font:700 44px var(--fn);letter-spacing:22px;margin-top:14px;background:linear-gradient(180deg,#fffbe8,#f0c050 45%,#9a6210 52%,#ffe08a);-webkit-background-clip:text;background-clip:text;}
.aloha-root #load{border:2px solid #c8902a;border-radius:3px;height:10px;background:#0a0806;}
.aloha-root #loadBar{background:linear-gradient(90deg,#9a6210,#ffe08a,#f0c050);box-shadow:0 0 12px #ffb020;}
.aloha-root #tapStart{font:500 26px var(--fn);letter-spacing:6px;color:#e9d8b0;}
.aloha-root #demo{font:400 16px var(--ft);color:#8a7a5a;}
.aloha-root #fsIntro,.aloha-root #fsEnd{background:radial-gradient(ellipse at 50% 40%,rgba(120,30,0,.55),rgba(0,0,0,.9) 70%);}
.aloha-root .fsBig{font:700 230px/0.9 var(--fn);filter:drop-shadow(0 6px 0 #000) drop-shadow(0 0 40px #ff5a00);}
.aloha-root .fsWord{font:900 76px/1 var(--fd);letter-spacing:6px;filter:drop-shadow(0 4px 0 #000) drop-shadow(0 0 20px rgba(255,120,0,.5));}
.aloha-root .fsRule{font:500 25px/1.5 var(--ft);color:#e9dcc0;text-shadow:0 2px 0 #000;}
.aloha-root .fsRule b{color:#ffcf4a;}
.aloha-root #fsLoad{font:700 60px var(--fn);letter-spacing:2px;color:#ffd24a;text-shadow:0 0 18px #ff6a00,0 3px 0 #000;}
.aloha-root #fsTotal{font:700 116px var(--fn);color:transparent;background:linear-gradient(180deg,#fffef4,#ffeaa0 22%,#f0c050 44%,#8a5408 50%,#ffe08a 82%,#fff6d0);-webkit-background-clip:text;background-clip:text;text-shadow:none;-webkit-text-stroke:1.5px rgba(40,20,0,.9);filter:drop-shadow(0 5px 0 #000) drop-shadow(0 0 26px rgba(255,160,30,.8));}
.aloha-root .woodBtn{font:700 40px var(--fn);letter-spacing:6px;color:#1a0e02;text-shadow:0 1px 0 rgba(255,255,255,.6);border-radius:6px;padding:16px 70px;
  background:linear-gradient(180deg,#fff6d0 0%,#f0c460 30%,#b8801a 50%,#e0a83a 70%,#fff0b0 100%);box-shadow:0 0 0 2px #2a1a04,0 0 0 3px #ffe9a0,0 0 30px rgba(255,170,40,.6),0 10px 20px rgba(0,0,0,.7);}
.aloha-root .card{background:linear-gradient(180deg,#16130f,#060504);border:2px solid #c8902a;border-radius:14px;box-shadow:0 0 0 1px #000,0 0 40px rgba(255,170,40,.2),0 20px 50px rgba(0,0,0,.8);}
.aloha-root .card h2{font:900 50px var(--fd);letter-spacing:4px;}
.aloha-root .card h3{color:#f0c050;font-weight:600;}
.aloha-root .card p,.aloha-root .card li{color:#d8ccb4;}
.aloha-root .pt div{background:rgba(255,220,150,.05);border:1px solid rgba(200,144,42,.25);border-radius:10px;}
.aloha-root .pt span{font:500 18px/1.35 var(--fn);letter-spacing:.5px;color:#eee;}
.aloha-root .pt span i{color:#f0c050;}
.aloha-root .chip{border:2px solid #c8902a;border-radius:8px;background:linear-gradient(180deg,#24201a,#0a0806);font:700 42px var(--fn);color:#f0c050;}
.aloha-root #toast{background:rgba(0,0,0,.92);border:1px solid #c8902a;font:500 24px var(--ft);border-radius:8px;}
`;

export default function AlohaTotem({ host }) {
  const rootRef = useRef(null);
  useEffect(() => startGame(rootRef.current, host), []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div ref={rootRef} className="aloha-root">
      <style>{CSS}</style>
      <div id="wrap"><div id="stage">
  <canvas id="main"></canvas>
  <div id="vig"></div>
  <div id="top"><span id="topL">Aloha Totem</span><span id="clock">--:--</span></div>
  <div id="deck"></div>
  <div id="sign"><div id="signT">ALOHA TOTEM</div><div id="signS">3600 WAYS</div></div>
  <div id="bannerGlow"></div>
  <div id="banner"><div className="bPlate"></div><div className="bWave"></div><div className="bGloss"></div><div className="bShine"></div><div id="bannerIn"><div id="bannerText" className="ticker"></div></div></div>
  <div id="bannerSub"></div>
  <div id="fsPanel"><div id="fsLabel">FREE SPINS<br/>LEFT</div><div id="fsNum" className="gold">12</div></div>
  <div id="pills">
    <div className="pill" title="เครดิต"><svg viewBox="0 0 32 32"><rect x="3" y="8" width="26" height="18" rx="4" fill="#c8892a"/><rect x="3" y="8" width="26" height="6" rx="3" fill="#ffd23a"/><circle cx="23" cy="19" r="3" fill="#5a2a06"/></svg><div className="vv"><span className="cap">BALANCE</span><span className="v" id="vBal">0.00</span></div></div>
    <div className="pill" title="เดิมพัน"><svg viewBox="0 0 32 32"><ellipse cx="16" cy="22" rx="11" ry="5" fill="#a86a1a"/><ellipse cx="16" cy="18" rx="11" ry="5" fill="#e9a92a"/><ellipse cx="16" cy="13" rx="11" ry="5" fill="#ffd23a" stroke="#a86a1a"/></svg><div className="vv"><span className="cap">TOTAL BET</span><span className="v" id="vBet">0.00</span></div></div>
    <div className="pill" title="ชนะ"><svg viewBox="0 0 32 32"><path d="M8 5h16v6a8 8 0 0 1-16 0z" fill="#ffd23a" stroke="#a86a1a"/><path d="M8 7H4a4 4 0 0 0 4 6M24 7h4a4 4 0 0 1-4 6" fill="none" stroke="#ffd23a" strokeWidth="2"/><rect x="13" y="18" width="6" height="5" fill="#e9a92a"/><rect x="9" y="23" width="14" height="4" rx="1" fill="#c8892a"/></svg><div className="vv"><span className="cap">WIN</span><span className="v" id="vWin">0.00</span></div></div>
  </div>
  <div id="controls">
    <div id="spinFx"></div>
    <button className="btn sm" id="bMenu" aria-label="กติกาและอัตราจ่าย"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2.4"/><path d="M12 10.5v7" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round"/><circle cx="12" cy="7" r="1.7" fill="currentColor"/></svg></button>
    <button className="btn sm" id="bTurbo" aria-label="หมุนเร็ว" aria-pressed="false"><svg viewBox="0 0 24 24"><path d="M13 2 4 14h7l-1 8 9-12h-7z" fill="currentColor"/></svg></button>
    <button className="btn" id="bMinus" aria-label="ลดเดิมพัน"><svg viewBox="0 0 24 24"><path d="M5 12h14" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/></svg></button>
    <button className="btn" id="bSpin" aria-label="หมุน"><svg viewBox="0 0 48 48"><defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff6d0"/><stop offset=".45" stopColor="#f0c050"/><stop offset=".55" stopColor="#b8801a"/><stop offset="1" stopColor="#ffe08a"/></linearGradient></defs><g fill="none" stroke="url(#sg)" strokeWidth="5" strokeLinecap="round"><path d="M38 20a15 15 0 0 0-27-5"/><path d="M10 28a15 15 0 0 0 27 5"/></g><path d="M7 8l4 9 9-4z" fill="#f0c050"/><path d="M41 40l-4-9-9 4z" fill="#f0c050"/></svg></button>
    <button className="btn" id="bPlus" aria-label="เพิ่มเดิมพัน"><svg viewBox="0 0 24 24"><path d="M5 12h14M12 5v14" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/></svg></button>
    <button className="btn sm" id="bAuto" aria-label="หมุนอัตโนมัติ"><svg viewBox="0 0 24 24"><path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"/><path d="M19 2v5h-5M5 22v-5h5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
    <button className="btn sm" id="bSound" aria-label="เปิด/ปิดเสียง"><svg viewBox="0 0 24 24"><path d="M3 9h4l5-4v14l-5-4H3z" fill="currentColor"/><path id="sndWave" d="M16 8a5 5 0 0 1 0 8M18.5 5a9 9 0 0 1 0 14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/><path id="sndX" d="M16 9l6 6M22 9l-6 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" style={{"display":"none"}}/></svg></button>
    <div className="lbl" style={{"left":"16px"}}>INFO</div><div className="lbl" style={{"left":"120px"}}>TURBO</div><div className="lbl" style={{"left":"510px"}}>AUTO</div><div className="lbl" style={{"left":"614px"}}>SOUND</div>
  </div>

  <div id="winPop"><div id="wpBack"></div><div id="wpRays"></div><div id="wpBox"><div id="wpLabel">WIN</div><div id="wpAmt">0.00</div></div></div>
  <div className="ov on" id="splash">
    <div id="logo" className="gold">ALOHA<small>TOTEM</small></div>
    <canvas id="splashArt" width="600" height="600"></canvas>
    <div id="load"><div id="loadBar"></div></div>
    <div id="tapStart">แตะเพื่อเริ่มเล่น</div>
    <div id="demo">เกมทดลองเล่นเพื่อความบันเทิง ใช้เครดิตสมมติ ไม่มีเงินจริง</div>
  </div>
  <div className="ov" id="bigwin"><div id="rays"></div><div id="bwTitle" className="gold">BIG WIN</div><div id="bwAmt">0.00</div><div id="bwHint">แตะเพื่อข้าม</div></div>
  <div className="ov" id="fsIntro">
    <div className="fsBig gold" id="fsIntroN">12</div><div className="fsWord gold">FREE SPINS</div>
    <div className="fsRule"><b>WILD</b> ที่ไม่ได้ถูกใช้ในการชนะ<br/>จะค้างอยู่บนวงล้อ (สูงสุด 5 ตัว)<br/>เสาโทเท็ม <b>WILD</b> ซ้อนกันออกบ่อยขึ้น!</div>
    <div id="fsLoad">0%</div>
    <button className="woodBtn" id="bStart" style={{"display":"none"}}>START</button>
  </div>
  <div className="ov" id="fsEnd">
    <div className="fsWord gold" style={{"fontSize":"100px"}}>TOTAL WIN</div>
    <div id="fsTotal">0.00</div>
    <div className="fsRule" id="fsEndInfo"></div>
    <button className="woodBtn" id="bCollect">รับรางวัล</button>
  </div>
  <div className="ov sheet" id="info"><div className="card">
    <h2 className="gold">อัตราจ่าย</h2>
    <p style={{"textAlign":"center"}}>ค่าที่แสดงคือเงินรางวัลต่อ 1 ทางชนะ ที่เดิมพันปัจจุบัน</p>
    <div className="pt" id="ptGrid"></div>
    <h3>วิธีชนะ</h3>
    <ul>
      <li>3600 ทางชนะ: สัญลักษณ์เดียวกันเรียงติดกันจากวงล้อซ้ายสุดไปขวา อย่างน้อย 3 วงล้อ ตำแหน่งไหนในวงล้อก็ได้</li>
      <li>รางวัล = อัตราจ่าย × จำนวนทางชนะ (จำนวนสัญลักษณ์ที่ตรงในแต่ละวงล้อคูณกัน)</li>
      <li>WILD แทนทุกสัญลักษณ์ ยกเว้น SCATTER และไม่ออกในวงล้อแรก</li>
      <li>SCATTER 3 ตัวขึ้นไป = 12 ฟรีสปิน (+2 ต่อ SCATTER ที่เกิน 3)</li>
      <li>ในฟรีสปิน: WILD ที่ไม่ถูกใช้จะค้างอยู่ (สูงสุด 5 ตัว), WILD ที่ถูกใช้จะระเบิดหายไป, SCATTER 3 ตัวได้เพิ่ม +5 สปิน</li>
    </ul>
    <h3>ปุ่มลัด</h3>
    <p>Space / Enter = หมุน · กดหมุนอีกครั้งระหว่างหมุนเพื่อหยุดเร็ว</p>
    <button className="woodBtn close" id="bInfoClose">ปิด</button>
  </div></div>
  <div className="ov sheet" id="autoSheet"><div className="card" id="autoCard">
    <h2 className="gold">หมุนอัตโนมัติ</h2><p>เลือกจำนวนรอบ หยุดได้ทุกเมื่อด้วยปุ่มหมุน</p>
    <div className="chips"><button className="chip" data-n="10">10</button><button className="chip" data-n="25">25</button><button className="chip" data-n="50">50</button><button className="chip" data-n="100">100</button></div>
    <button className="woodBtn close" id="bAutoClose">ยกเลิก</button>
  </div></div>
  <div id="toast"></div>
  <div id="flash"></div>
  <canvas id="fx"></canvas>
</div></div>
    </div>
  );
}

function startGame(root, host) {
  let alive=true,rafId=0,startKey=null;const AC=new AbortController();const L=(el,ev,fn)=>el.addEventListener(ev,fn,{signal:AC.signal});
  // ===== GAME LOGIC (pure) =====
  const H = [3,4,5,5,4,3];
  const SYM = { W:0, S:1, TR:2, TP:3, TG:4, PI:5, CO:6, HI:7, PL:8, HE:9, DI:10, SP:11, CL:12 };
  const NSYM = 13;
  const PAY = { // index by count 3..6
    2:[10,20,40,100], 3:[8,15,30,60], 4:[6,12,25,50], 5:[5,10,20,40], 6:[4,8,15,30],
    7:[3,6,12,25], 8:[3,5,10,20], 9:[2,4,8,15], 10:[2,4,8,15], 11:[1,3,6,12], 12:[1,3,6,12]
  };
  let PAY_K = 0.01;
  // weights per symbol [W,S,TR,TP,TG,PI,CO,HI,PL,HE,DI,SP,CL]
  const W_BASE = [3,2.0, 4,5,6, 7,8,9,10, 13,13,14,14];
  const W_FREE = [5,1.6, 5,6,7, 7,8,9,10, 12,12,13,13];
  function pick(weights, rng){ let t=0; for(const w of weights) t+=w; let r=rng()*t; for(let i=0;i<weights.length;i++){ r-=weights[i]; if(r<0) return i; } return weights.length-1; }
  function genGrid(free, rng){
    const w = free?W_FREE:W_BASE;
    const g = [];
    for(let r=0;r<6;r++){
      const col=[]; let sc=0;
      for(let i=0;i<H[r];i++){
        let s;
        do { s = pick(w,rng); } while((s===SYM.W && (r===0)) || (s===SYM.S && sc>=1));
        if(s===SYM.S) sc++;
        col.push(s);
      }
      g.push(col);
    }
    // stacked totem wild in free spins on reels 1..4
    if(free){
      for(let r=1;r<=4;r++){
        if(rng()<0.07){
          const len = 2+Math.floor(rng()*(H[r]-1)); // 2..H
          const start = Math.floor(rng()*(H[r]-len+1));
          for(let i=start;i<start+len;i++) if(g[r][i]!==SYM.S) g[r][i]=SYM.W;
        }
      }
    }
    return g;
  }
  function evaluate(g, bet){
    const wins=[]; let total=0;
    for(let s=2;s<NSYM;s++){
      let n=0, ways=1; const cells=[];
      for(let r=0;r<6;r++){
        let c=0;
        for(let i=0;i<g[r].length;i++){ if(g[r][i]===s||g[r][i]===SYM.W){ c++; cells.push([r,i]); } }
        if(c===0) break;
        ways*=c; n++;
      }
      if(n>=3){
        const pay = PAY[s][n-3]*bet*PAY_K*ways;
        const used = cells.filter(([r])=>r<n);
        wins.push({sym:s, count:n, ways, pay, cells:used});
        total+=pay;
      }
    }
    let scat=[];
    for(let r=0;r<6;r++) for(let i=0;i<g[r].length;i++) if(g[r][i]===SYM.S) scat.push([r,i]);
    return {wins,total,scatters:scat};
  }
  function applySticky(g, sticky){ for(const k of sticky){ const [r,i]=k.split(',').map(Number); g[r][i]=SYM.W; } }
  function nextSticky(g, res){
    const used=new Set(); for(const w of res.wins) for(const [r,i] of w.cells) if(g[r][i]===SYM.W) used.add(r+','+i);
    const out=[]; for(let r=0;r<6;r++) for(let i=0;i<g[r].length;i++) if(g[r][i]===SYM.W && !used.has(r+','+i)) out.push(r+','+i);
    return {keep: out.slice(0,5), used:[...used]};
  }

  // ===== ART: procedural sprites =====
  const FONT_D = '"Cinzel","Kanit",Georgia,serif';
  function mk(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
  function lin(ctx,x0,y0,x1,y1,stops){const g=ctx.createLinearGradient(x0,y0,x1,y1);stops.forEach((s,i)=>g.addColorStop(s[0],s[1]));return g;}
  function rad(ctx,x,y,r0,r1,stops,x1,y1){const g=ctx.createRadialGradient(x,y,r0,x1??x,y1??y,r1);stops.forEach(s=>g.addColorStop(s[0],s[1]));return g;}
  function rrPath(x,y,w,h,r){const p=new Path2D();p.moveTo(x+r,y);p.arcTo(x+w,y,x+w,y+h,r);p.arcTo(x+w,y+h,x,y+h,r);p.arcTo(x,y+h,x,y,r);p.arcTo(x,y,x+w,y,r);p.closePath();return p;}
  function ellPath(x,y,rx,ry,rot=0){const p=new Path2D();p.ellipse(x,y,rx,ry,rot,0,Math.PI*2);return p;}

  // carved / glossy shape: outline, gradient fill, inner bevel, gloss
  function carved(ctx,path,o){
    ctx.save();ctx.lineJoin='round';ctx.lineCap='round';
    ctx.shadowColor='rgba(20,0,20,.5)';ctx.shadowOffsetY=o.shadowY??7;ctx.shadowBlur=10;
    ctx.lineWidth=(o.lw??11)*.62;ctx.strokeStyle=o.outline;ctx.stroke(path);ctx.fillStyle=o.outline;ctx.fill(path);
    ctx.shadowColor='transparent';
    ctx.fillStyle=o.fill;ctx.fill(path);
    ctx.save();ctx.clip(path);
    if(o.light){ctx.translate(4,5);ctx.lineWidth=9;ctx.strokeStyle=o.light;ctx.stroke(path);ctx.translate(-4,-5);}
    if(o.dark){ctx.translate(-4,-6);ctx.lineWidth=12;ctx.strokeStyle=o.dark;ctx.stroke(path);ctx.translate(4,6);}
    if(o.gloss!==false){const gx=o.gx??78,gy=o.gy??62,gw=o.gw??30,gh=o.gh??14;ctx.globalAlpha=Math.min(1,(o.gloss??.35)*1.8);ctx.fillStyle=rad(ctx,gx,gy,0,gw,[[0,'rgba(255,255,255,1)'],[.35,'rgba(255,255,255,.55)'],[1,'rgba(255,255,255,0)']]);ctx.beginPath();ctx.ellipse(gx,gy,gw,gh,-0.5,0,7);ctx.fill();
      ctx.globalAlpha=.9;ctx.fillStyle='#fff';ctx.beginPath();ctx.ellipse(gx-gw*.25,gy-gh*.1,gw*.22,gh*.28,-0.5,0,7);ctx.fill();}
    ctx.globalAlpha=1;ctx.globalCompositeOperation='multiply';ctx.fillStyle=lin(ctx,0,20,0,190,[[0,'rgba(255,255,255,1)'],[.55,'rgba(230,220,230,1)'],[1,'rgba(90,60,80,1)']]);ctx.fill(path);ctx.globalCompositeOperation='source-over';
    ctx.restore();ctx.restore();
  }
  function txt(ctx,s,x,y,size,fill,stroke,lw,align='center'){
    ctx.save();ctx.font=`900 ${size}px ${FONT_D}`;ctx.textAlign=align;ctx.textBaseline='middle';ctx.lineJoin='round';
    if(stroke){ctx.lineWidth=lw;ctx.strokeStyle=stroke;ctx.strokeText(s,x,y);}
    ctx.fillStyle=fill;ctx.fillText(s,x,y);ctx.restore();
  }

  // ---- suits ----
  function pHeart(){const p=new Path2D();p.moveTo(100,162);p.bezierCurveTo(32,118,22,66,58,46);p.bezierCurveTo(82,34,98,50,100,66);p.bezierCurveTo(102,50,118,34,142,46);p.bezierCurveTo(178,66,168,118,100,162);p.closePath();return p;}
  function pDiamond(){const p=new Path2D();p.moveTo(100,28);p.quadraticCurveTo(128,72,164,100);p.quadraticCurveTo(128,128,100,172);p.quadraticCurveTo(72,128,36,100);p.quadraticCurveTo(72,72,100,28);p.closePath();return p;}
  function pSpade(){const p=new Path2D();p.moveTo(100,30);p.bezierCurveTo(140,74,180,96,166,124);p.bezierCurveTo(156,146,124,144,108,126);p.quadraticCurveTo(112,152,128,168);p.lineTo(72,168);p.quadraticCurveTo(88,152,92,126);p.bezierCurveTo(76,144,44,146,34,124);p.bezierCurveTo(20,96,60,74,100,30);p.closePath();return p;}
  function pClub(){const p=new Path2D();p.arc(100,64,30,0,7);p.moveTo(98,112);p.arc(66,112,30,0,7);p.moveTo(164,112);p.arc(134,112,30,0,7);p.moveTo(100,96);p.arc(100,100,20,0,7);
    const s=new Path2D();s.moveTo(92,110);s.quadraticCurveTo(92,150,74,170);s.lineTo(126,170);s.quadraticCurveTo(108,150,108,110);s.closePath();p.addPath(s);return p;}
  function drawSuit(ctx,kind){
    const map={heart:['A',['#ffe4e4','#ff4a4a','#b8101c','#3a0004']],diamond:['K',['#e4f6ff','#45b0ff','#1450c8','#020a3a']],spade:['Q',['#e4ffe8','#3ae07c','#0e8a3c','#02240c']],club:['J',['#f8e8ff','#c06aff','#6a1ac0','#1a0230']]};
    const [L,c]=map[kind];
    const off=mk(200,200),o=off.getContext('2d');o.font='900 158px '+FONT_D;o.textAlign='center';o.textBaseline='alphabetic';
    const y=168;
    o.fillStyle=lin(o,0,30,0,170,[[0,c[0]],[.28,c[1]],[.5,c[1]],[.54,c[2]],[.7,c[1]],[1,c[0]]]);o.fillText(L,100,y);
    o.globalCompositeOperation='source-atop';
    o.fillStyle=lin(o,0,30,0,110,[[0,'rgba(255,255,255,.75)'],[.5,'rgba(255,255,255,.08)'],[1,'rgba(255,255,255,0)']]);o.fillRect(0,0,200,100);
    o.fillStyle='rgba(255,255,255,.95)';o.fillText(L,96,y-5);o.fillStyle=lin(o,0,30,0,170,[[0,c[0]],[.28,c[1]],[.5,c[1]],[.54,c[2]],[.7,c[1]],[1,c[0]]]);o.fillText(L,98.5,y-2);
    o.fillStyle='rgba(0,0,0,.35)';o.fillText(L,104,y+6);o.fillStyle=lin(o,0,30,0,170,[[0,c[0]],[.28,c[1]],[.5,c[1]],[.54,c[2]],[.7,c[1]],[1,c[0]]]);o.fillText(L,100.5,y+.5);
    ctx.save();ctx.font='900 158px '+FONT_D;ctx.textAlign='center';ctx.textBaseline='alphabetic';ctx.lineJoin='round';
    ctx.shadowColor='rgba(0,0,0,.7)';ctx.shadowBlur=10;ctx.shadowOffsetY=6;ctx.lineWidth=14;ctx.strokeStyle='#120a02';ctx.strokeText(L,100,y);ctx.shadowColor='transparent';
    ctx.lineWidth=7;ctx.strokeStyle=lin(ctx,0,30,0,170,[[0,'#fff6c8'],[.45,'#e2a83a'],[.5,'#7a4a08'],[.75,'#f0c060'],[1,'#8a5a10']]);ctx.strokeText(L,100,y);
    ctx.drawImage(off,0,0);
    // sparkle glint
    ctx.globalCompositeOperation='lighter';ctx.fillStyle=rad(ctx,70,58,0,16,[[0,'rgba(255,255,255,.95)'],[1,'rgba(255,255,255,0)']]);ctx.fillRect(50,38,40,40);
    ctx.fillStyle='rgba(255,255,255,.9)';ctx.beginPath();ctx.moveTo(70,40);ctx.lineTo(72,56);ctx.lineTo(88,58);ctx.lineTo(72,60);ctx.lineTo(70,76);ctx.lineTo(68,60);ctx.lineTo(52,58);ctx.lineTo(68,56);ctx.closePath();ctx.fill();
    ctx.restore();
  }
  // ---- flowers ----
  function drawHibiscus(ctx,cx=100,cy=100,s=1,hue='purple'){
    const col = hue==='pink'?['#ffe0f0','#ff6fb6','#b0156a','#4a0630']:['#f7d6ff','#d67af0','#8a2bb0','#3a0a4c'];
    ctx.save();ctx.translate(cx,cy);ctx.scale(s,s);
    for(let k=0;k<5;k++){
      ctx.save();ctx.rotate(k*Math.PI*2/5-0.3);
      const p=new Path2D();p.moveTo(0,0);p.bezierCurveTo(-46,-18,-52,-62,-26,-74);p.quadraticCurveTo(-14,-82,-4,-74);p.quadraticCurveTo(6,-84,16,-76);p.quadraticCurveTo(30,-80,34,-64);p.bezierCurveTo(52,-34,30,-12,0,0);p.closePath();
      carved(ctx,p,{outline:col[3],lw:8,fill:rad(ctx,0,-10,4,80,[[0,col[2]],[.35,col[1]],[1,col[0]]]),light:'rgba(255,255,255,.35)',gloss:false,shadowY:3});
      ctx.strokeStyle='rgba(90,10,80,.35)';ctx.lineWidth=2;
      for(let v=-1;v<=1;v++){ctx.beginPath();ctx.moveTo(0,-6);ctx.quadraticCurveTo(v*14,-40,v*18,-62);ctx.stroke();}
      ctx.restore();
    }
    ctx.fillStyle=rad(ctx,0,0,0,18,[[0,'#5a0a3a'],[1,'rgba(90,10,60,0)']]);ctx.beginPath();ctx.arc(0,0,18,0,7);ctx.fill();
    // stamen
    ctx.lineCap='round';ctx.strokeStyle='#4a2a00';ctx.lineWidth=9;ctx.beginPath();ctx.moveTo(0,0);ctx.quadraticCurveTo(18,-30,26,-58);ctx.stroke();
    ctx.strokeStyle='#ffd23f';ctx.lineWidth=5;ctx.stroke();
    for(let i=0;i<7;i++){const a=i/7*6.28;ctx.fillStyle='#ffef7a';ctx.strokeStyle='#7a4a00';ctx.lineWidth=2;ctx.beginPath();ctx.arc(26+Math.cos(a)*9,-60+Math.sin(a)*9,4.5,0,7);ctx.fill();ctx.stroke();}
    ctx.restore();
  }
  function drawPlumeria(ctx,cx=100,cy=100,s=1){
    ctx.save();ctx.translate(cx,cy);ctx.scale(s,s);
    for(let k=0;k<5;k++){
      ctx.save();ctx.rotate(k*Math.PI*2/5);
      const p=new Path2D();p.moveTo(0,0);p.bezierCurveTo(-34,-10,-44,-58,-14,-70);p.bezierCurveTo(10,-78,30,-56,18,-30);p.quadraticCurveTo(10,-12,0,0);p.closePath();
      carved(ctx,p,{outline:'#6b5a3a',lw:7,fill:rad(ctx,0,0,2,74,[[0,'#ffcf3a'],[.32,'#fff2b0'],[.6,'#ffffff'],[1,'#f1ecf7']]),light:'rgba(255,255,255,.8)',dark:'rgba(120,90,140,.25)',gloss:false,shadowY:3});
      ctx.restore();
    }
    ctx.fillStyle=rad(ctx,0,0,0,16,[[0,'#ff9b1a'],[1,'rgba(255,190,40,0)']]);ctx.beginPath();ctx.arc(0,0,16,0,7);ctx.fill();
    ctx.restore();
  }
  function drawLeaf(ctx,x,y,ang,len,w,c1='#5fbf4a',c2='#1f6e2c'){
    ctx.save();ctx.translate(x,y);ctx.rotate(ang);
    const p=new Path2D();p.moveTo(0,0);p.quadraticCurveTo(w,-len*.5,0,-len);p.quadraticCurveTo(-w,-len*.5,0,0);
    carved(ctx,p,{outline:'#103a18',lw:5,fill:lin(ctx,-w,0,w,-len,[[0,c2],[1,c1]]),light:'rgba(255,255,255,.3)',gloss:false,shadowY:2});
    ctx.strokeStyle='rgba(10,50,20,.5)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,-4);ctx.lineTo(0,-len+8);ctx.stroke();ctx.restore();
  }
  function drawPineapple(ctx){
    for(let i=-3;i<=3;i++) drawLeaf(ctx,100+i*4,74,i*0.32,52+ (3-Math.abs(i))*9,12+ (3-Math.abs(i))*2,'#8fe05a','#2a8a34');
    const body=ellPath(100,122,44,54);
    carved(ctx,body,{outline:'#5a2a06',fill:rad(ctx,82,100,6,70,[[0,'#ffe680'],[.5,'#ffb52a'],[1,'#d4670e']]),light:'rgba(255,255,220,.6)',dark:'rgba(120,40,0,.3)',gloss:false});
    ctx.save();ctx.clip(body);ctx.strokeStyle='rgba(140,60,0,.65)';ctx.lineWidth=3;
    for(let i=-6;i<=6;i++){ctx.beginPath();ctx.moveTo(40+i*16,60);ctx.lineTo(160+i*16,190);ctx.stroke();ctx.beginPath();ctx.moveTo(160-i*16,60);ctx.lineTo(40-i*16,190);ctx.stroke();}
    for(let y=78;y<180;y+=16) for(let x=50;x<160;x+=16){const ox=((y-78)/16)%2?8:0;ctx.fillStyle='rgba(255,240,160,.8)';ctx.beginPath();ctx.arc(x+ox,y,2.6,0,7);ctx.fill();}
    ctx.globalAlpha=.35;ctx.fillStyle='#fff';ctx.beginPath();ctx.ellipse(78,98,12,24,-.4,0,7);ctx.fill();ctx.restore();
  }
  function drawCoconut(ctx){
    // straw
    ctx.save();ctx.lineCap='round';ctx.strokeStyle='#3a0d40';ctx.lineWidth=14;ctx.beginPath();ctx.moveTo(98,96);ctx.lineTo(132,38);ctx.lineTo(150,40);ctx.stroke();
    ctx.strokeStyle='#c45ad8';ctx.lineWidth=8;ctx.stroke();ctx.setLineDash([6,8]);ctx.strokeStyle='#ffd7ff';ctx.lineWidth=8;ctx.stroke();ctx.restore();
    const shell=new Path2D();shell.moveTo(34,104);shell.bezierCurveTo(34,172,166,172,166,104);shell.closePath();
    carved(ctx,shell,{outline:'#2e1606',fill:lin(ctx,40,100,160,170,[[0,'#b07440'],[.5,'#7b4520'],[1,'#4b2510']]),light:'rgba(255,220,170,.35)',dark:'rgba(0,0,0,.3)',gloss:false});
    ctx.save();ctx.clip(shell);ctx.strokeStyle='rgba(40,15,0,.5)';ctx.lineWidth=2;for(let i=0;i<9;i++){ctx.beginPath();ctx.moveTo(30+i*16,104);ctx.quadraticCurveTo(40+i*14,140,60+i*10,170);ctx.stroke();}ctx.restore();
    const rim=ellPath(100,104,67,15);carved(ctx,rim,{outline:'#2e1606',lw:8,fill:lin(ctx,0,90,0,118,[[0,'#fff6e2'],[1,'#e8cfa0']]),gloss:false,shadowY:0});
    ctx.fillStyle=lin(ctx,0,96,0,112,[[0,'#ffb0d0'],[1,'#ff6fa0']]);ctx.beginPath();ctx.ellipse(100,104,56,10,0,0,7);ctx.fill();
    drawPlumeria(ctx,58,96,.36);drawHibiscus(ctx,146,92,.34,'pink');drawPlumeria(ctx,84,112,.25);
  }

  // ---- tiki masks ----
  function tikiFace(ctx,o){
    // headdress
    if(o.dress) o.dress(ctx);
    const head=rrPath(48,56,104,124,26);
    carved(ctx,head,{outline:o.outline,fill:lin(ctx,48,56,152,180,[[0,o.c1],[.5,o.c2],[1,o.c3]]),light:'rgba(255,255,255,.4)',dark:'rgba(0,0,0,.28)',gloss:.22,gx:72,gy:76});
    // wood grain
    ctx.save();ctx.clip(head);ctx.globalAlpha=.14;ctx.strokeStyle='#000';ctx.lineWidth=2;for(let i=0;i<8;i++){ctx.beginPath();ctx.moveTo(48,64+i*16);ctx.bezierCurveTo(80,58+i*16,120,72+i*16,152,62+i*16);ctx.stroke();}ctx.restore();
    // brow
    const brow=new Path2D();brow.moveTo(54,96);brow.quadraticCurveTo(100,70,146,96);brow.quadraticCurveTo(100,86,54,96);
    ctx.save();ctx.fillStyle=o.brow;ctx.strokeStyle=o.outline;ctx.lineWidth=4;ctx.fill(brow);ctx.stroke(brow);ctx.restore();
    // eyes
    for(const ex of [76,124]){
      carved(ctx,ellPath(ex,108,17,14),{outline:o.outline,lw:6,fill:'#fffdf2',gloss:false,shadowY:0});
      ctx.fillStyle='#1b0d0a';ctx.beginPath();ctx.arc(ex+(ex<100?3:-3),110,7.5,0,7);ctx.fill();
      ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(ex+(ex<100?1:-5),106,2.6,0,7);ctx.fill();
    }
    // nose
    const nose=new Path2D();nose.moveTo(100,104);nose.quadraticCurveTo(116,128,114,134);nose.quadraticCurveTo(100,140,86,134);nose.quadraticCurveTo(84,128,100,104);
    carved(ctx,nose,{outline:o.outline,lw:5,fill:o.nose,gloss:false,shadowY:2,light:'rgba(255,255,255,.35)'});
    // mouth
    const m=rrPath(66,142,68,28,13);
    carved(ctx,m,{outline:o.outline,lw:6,fill:o.mouth,gloss:false,shadowY:0});
    ctx.save();ctx.clip(m);ctx.fillStyle='#fffbe8';for(let i=0;i<5;i++){ctx.fillRect(70+i*13,142,10,9);ctx.fillRect(70+i*13,161,10,9);}
    ctx.strokeStyle=o.outline;ctx.lineWidth=2;for(let i=0;i<6;i++){ctx.beginPath();ctx.moveTo(69+i*13,142);ctx.lineTo(69+i*13,170);ctx.stroke();}
    if(o.tongue){ctx.fillStyle=o.tongue;ctx.beginPath();ctx.ellipse(100,168,14,7,0,0,7);ctx.fill();}
    ctx.restore();
    // cheek marks
    ctx.save();ctx.strokeStyle=o.mark;ctx.lineWidth=4;ctx.lineCap='round';
    for(const sx of [58,142]){ctx.beginPath();ctx.moveTo(sx,128);ctx.lineTo(sx+(sx<100?8:-8),136);ctx.lineTo(sx,144);ctx.stroke();}ctx.restore();
  }
  function drawTikiRed(ctx){
    tikiFace(ctx,{outline:'#3c0a18',c1:'#ffb3a0',c2:'#ea5a6c',c3:'#a2203c',brow:'#3a8fd6',nose:'#ffcf5a',mouth:'#5a0b1a',tongue:'#ff7aa0',mark:'#2a6fd6',
      dress:(c)=>{for(let i=0;i<7;i++){const a=-1.2+i*0.4;const x=100+Math.sin(a)*48,y=70-Math.cos(a)*30;
        const f=new Path2D();f.moveTo(x-10,y+16);f.quadraticCurveTo(x+Math.sin(a)*40-8,y-34,x+Math.sin(a)*44,y-44);f.quadraticCurveTo(x+Math.sin(a)*40+10,y-30,x+10,y+16);f.closePath();
        carved(c,f,{outline:'#3c0a18',lw:6,fill:lin(c,x,y+16,x,y-44,[[0,'#ff4a3a'],[.6,'#ff9a2a'],[1,'#ffe36a']]),gloss:false,shadowY:2,light:'rgba(255,255,255,.4)'});}}});
  }
  function drawTikiPurple(ctx){
    tikiFace(ctx,{outline:'#24110a',c1:'#e9b97a',c2:'#b5783e',c3:'#6e3f1a',brow:'#8b5ad8',nose:'#b5783e',mouth:'#2a0e0e',tongue:'#d0466a',mark:'#8b5ad8',
      dress:(c)=>{const b=rrPath(42,30,116,42,10);carved(c,b,{outline:'#24110a',lw:7,fill:lin(c,0,30,0,72,[[0,'#d0a8ff'],[1,'#6a32b8']]),gloss:.3,gx:70,gy:40,gw:20,gh:6,light:'rgba(255,255,255,.4)'});
        c.fillStyle='#ffd34a';for(let i=0;i<5;i++){c.beginPath();c.moveTo(56+i*22,40);c.lineTo(64+i*22,52);c.lineTo(56+i*22,64);c.lineTo(48+i*22,52);c.closePath();c.fill();c.strokeStyle='#24110a';c.lineWidth=2;c.stroke();}
        const t=rrPath(64,14,72,22,8);carved(c,t,{outline:'#24110a',lw:6,fill:'#ff8a3a',gloss:false,shadowY:0});}});
  }
  function drawTikiGreen(ctx){
    tikiFace(ctx,{outline:'#2d1a04',c1:'#fff1a6',c2:'#f2c33c',c3:'#c07a12',brow:'#2fb07a',nose:'#3aa4e8',mouth:'#123a6a',tongue:'#ff6a6a',mark:'#e8503a',
      dress:(c)=>{for(let i=-3;i<=3;i++) drawLeaf(c,100+i*10,74,i*0.36,62+(3-Math.abs(i))*8,16);}});
  }
  // ---- wild totem ----
  const GOLD=['#fff7c2','#ffd84a','#e19b16','#8a4a06'];
  function wildPillar(ctx,top,bot){
    ctx.save();ctx.fillStyle=lin(ctx,22,0,178,0,[[0,'#7a3a04'],[.15,'#e9a92a'],[.5,'#ffe27a'],[.85,'#e9a92a'],[1,'#7a3a04']]);
    const y0=top?10:0,y1=bot?190:200;ctx.beginPath();const r=22;
    ctx.moveTo(22,y0+(top?r:0));if(top){ctx.arcTo(22,y0,22+r,y0,r);ctx.lineTo(178-r,y0);ctx.arcTo(178,y0,178,y0+r,r);}else{ctx.lineTo(22,y0);ctx.lineTo(178,y0);}
    if(bot){ctx.lineTo(178,y1-r);ctx.arcTo(178,y1,178-r,y1,r);ctx.lineTo(22+r,y1);ctx.arcTo(22,y1,22,y1-r,r);}else{ctx.lineTo(178,y1);ctx.lineTo(22,y1);}
    ctx.closePath();ctx.fill();ctx.lineWidth=6;ctx.strokeStyle='#5a2a02';ctx.stroke();ctx.restore();
  }
  function drawW(ctx,cy){
    const p=new Path2D();const s=1;const pts=[[38,cy-46],[72,cy-46],[86,cy+2],[100,cy-30],[114,cy+2],[128,cy-46],[162,cy-46],[134,cy+46],[110,cy+46],[100,cy+14],[90,cy+46],[66,cy+46]];
    p.moveTo(...pts[0]);pts.slice(1).forEach(q=>p.lineTo(...q));p.closePath();
    carved(ctx,p,{outline:'#0e2d5c',lw:9,fill:lin(ctx,0,cy-46,0,cy+46,[[0,'#bfe8ff'],[.45,'#3a9ef0'],[1,'#1450b0']]),light:'rgba(255,255,255,.7)',dark:'rgba(0,0,40,.3)',gloss:.35,gx:60,gy:cy-34,gw:16,gh:6});
  }
  function totemFace(ctx,cy){
    const o={outline:'#5a2a02'};
    ctx.save();ctx.translate(0,cy-110);
    // brow & eyes
    const brow=new Path2D();brow.moveTo(40,74);brow.quadraticCurveTo(100,44,160,74);brow.lineTo(160,86);brow.quadraticCurveTo(100,62,40,86);brow.closePath();
    carved(ctx,brow,{outline:o.outline,lw:5,fill:'#2a7ae0',gloss:false,shadowY:2,light:'rgba(255,255,255,.5)'});
    for(const ex of [72,128]){carved(ctx,ellPath(ex,100,18,14),{outline:o.outline,lw:5,fill:'#fff',gloss:false,shadowY:0});ctx.fillStyle='#120a04';ctx.beginPath();ctx.arc(ex,102,7,0,7);ctx.fill();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(ex-2,99,2.5,0,7);ctx.fill();}
    const nose=new Path2D();nose.moveTo(100,96);nose.lineTo(116,132);nose.lineTo(84,132);nose.closePath();
    carved(ctx,nose,{outline:o.outline,lw:5,fill:'#ffcf3a',gloss:false,shadowY:2,light:'rgba(255,255,255,.6)'});
    const m=rrPath(56,138,88,30,14);carved(ctx,m,{outline:o.outline,lw:5,fill:'#6a1206',gloss:false,shadowY:0});
    ctx.save();ctx.clip(m);ctx.fillStyle='#fff8dc';for(let i=0;i<7;i++){ctx.fillRect(58+i*12.6,138,10,9);ctx.fillRect(58+i*12.6,159,10,9);}ctx.restore();
    ctx.restore();
  }
  function drawWildPart(ctx,part){
    if(part==='single'){
      wildPillar(ctx,true,true);totemFace(ctx,98);
      const b=rrPath(26,140,148,46,14);carved(ctx,b,{outline:'#4a0606',lw:7,fill:lin(ctx,0,140,0,186,[[0,'#ff7a3a'],[1,'#c0160e']]),gloss:false,shadowY:3});
      txt(ctx,'WILD',100,165,46,lin(ctx,0,145,0,185,[[0,'#fff8c0'],[.5,'#ffd23a'],[1,'#e88a0a']]),'#4a0606',8);
      return;
    }
    wildPillar(ctx,part==='top',part==='bot');
    ctx.save();ctx.globalAlpha=.25;ctx.strokeStyle='#7a3a04';ctx.lineWidth=3;for(let y=part==='top'?30:10;y<200;y+=36){ctx.beginPath();ctx.moveTo(26,y);ctx.lineTo(174,y);ctx.stroke();}ctx.restore();
    if(part==='mid') totemFace(ctx,108);
    else drawW(ctx,100);
  }
  // ---- scatter ----
  function drawScatter(ctx){
    const f=rrPath(16,14,168,168,24);
    carved(ctx,f,{outline:'#5a2a02',lw:8,fill:lin(ctx,16,14,184,182,[[0,GOLD[0]],[.4,GOLD[1]],[.8,GOLD[2]],[1,GOLD[3]]]),gloss:false});
    const inner=rrPath(30,28,140,140,16);
    ctx.save();ctx.clip(inner);
    ctx.fillStyle=lin(ctx,0,28,0,168,[[0,'#2a0f4a'],[.55,'#9a2a6a'],[1,'#ff8a3a']]);ctx.fillRect(30,28,140,140);
    for(let i=0;i<14;i++){ctx.fillStyle='rgba(255,255,255,'+(.3+Math.random()*.6)+')';ctx.fillRect(34+Math.random()*130,32+Math.random()*50,2,2);}
    // eruption plume
    ctx.fillStyle=rad(ctx,100,70,4,70,[[0,'rgba(255,240,150,1)'],[.3,'rgba(255,140,40,.9)'],[1,'rgba(255,60,20,0)']]);ctx.beginPath();ctx.arc(100,70,70,0,7);ctx.fill();
    const vol=new Path2D();vol.moveTo(18,170);vol.lineTo(84,82);vol.quadraticCurveTo(100,74,116,82);vol.lineTo(182,170);vol.closePath();
    ctx.fillStyle=lin(ctx,0,80,0,170,[[0,'#5a2a3a'],[1,'#1e0a18']]);ctx.fill(vol);ctx.strokeStyle='#120410';ctx.lineWidth=3;ctx.stroke(vol);
    ctx.strokeStyle='#ffb02a';ctx.lineCap='round';ctx.lineWidth=6;ctx.shadowColor='#ff6a00';ctx.shadowBlur=12;
    [[92,84,74,130,60,160],[104,84,118,120,132,150],[98,86,100,120,92,150]].forEach(a=>{ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.quadraticCurveTo(a[2],a[3],a[4],a[5]);ctx.stroke();});
    ctx.fillStyle='#ffe27a';for(let i=0;i<9;i++){ctx.beginPath();ctx.arc(70+Math.random()*60,36+Math.random()*40,3+Math.random()*4,0,7);ctx.fill();}
    ctx.restore();
    ctx.save();ctx.lineWidth=5;ctx.strokeStyle='#5a2a02';ctx.stroke(inner);ctx.restore();
    // ribbon
    const r=new Path2D();r.moveTo(4,128);r.lineTo(196,128);r.lineTo(186,151);r.lineTo(196,174);r.lineTo(4,174);r.lineTo(14,151);r.closePath();
    carved(ctx,r,{outline:'#3a0410',lw:7,fill:lin(ctx,0,128,0,174,[[0,'#ff5aa0'],[1,'#a01050']]),gloss:false,shadowY:3});
    txt(ctx,'SCATTER',100,152,34,lin(ctx,0,136,0,170,[[0,'#fffbd0'],[.5,'#ffd23a'],[1,'#f08a0a']]),'#3a0410',7);
  }

  // ---- Sprite atlas ----
  const SPR={}, SPRB={};
  const SYM_DRAW={2:drawTikiRed,3:drawTikiPurple,4:drawTikiGreen,5:drawPineapple,6:drawCoconut,7:(c)=>drawHibiscus(c,100,100,1.05),8:(c)=>drawPlumeria(c,100,100,1.12),
    9:c=>drawSuit(c,'heart'),10:c=>drawSuit(c,'diamond'),11:c=>drawSuit(c,'spade'),12:c=>drawSuit(c,'club'),1:drawScatter};
  function buildSprites(){
    const S=200;
    const make=(fn)=>{const c=mk(S,S);const x=c.getContext('2d');fn(x);return c;};
    for(const k in SYM_DRAW) SPR[k]=make(SYM_DRAW[k]);
    SPR.wsingle=make(c=>drawWildPart(c,'single'));SPR.wtop=make(c=>drawWildPart(c,'top'));SPR.wmid=make(c=>drawWildPart(c,'mid'));SPR.wbot=make(c=>drawWildPart(c,'bot'));
    SPR[0]=SPR.wsingle;
    for(const k in SPR){const x=SPR[k].getContext('2d');const im=x.getImageData(0,0,S,S),d=im.data;for(let i=0;i<d.length;i+=4){if(!d[i+3])continue;let r=d[i],g=d[i+1],b=d[i+2];const l=.3*r+.59*g+.11*b;r=l+(r-l)*1.18;g=l+(g-l)*1.18;b=l+(b-l)*1.18;r=(r-128)*1.14+124;g=(g-128)*1.14+124;b=(b-128)*1.14+124;d[i]=r;d[i+1]=g;d[i+2]=b;}x.putImageData(im,0,0);}
    for(const k in SPR){const b=mk(S,S+60);const x=b.getContext('2d');for(let i=-5;i<=5;i++){x.globalAlpha=0.16;x.drawImage(SPR[k],0,30+i*6);}SPRB[k]=b;}
  }

  // ===== BACKGROUND =====
  const W=720,HGT=1480;
  const BG={mode:'day',fade:0,clouds:[],stars:[],embers:[],smoke:[],lava:[],static:{},frond:null,frondN:null,shake:0,erupt:0};
  function rndr(a,b){return a+Math.random()*(b-a);}
  function makeFrond(night){
    const c=mk(300,110),x=c.getContext('2d');
    const c1=night?'#2a4a3a':'#3f8a3c',c2=night?'#0f2418':'#0a2410',sp=night?'#1a2a1a':'#2a3a12';
    x.translate(6,30);
    for(let i=0;i<26;i++){const t=i/26;const px=t*280,py=Math.sin(t*2.4)*30;const L=(1-Math.abs(t-.35))*44+6;
      for(const s of [-1,1]){x.beginPath();x.moveTo(px,py);x.quadraticCurveTo(px+10,py+s*L*.5,px+20,py+s*L+ (s>0?8:0));x.lineTo(px+10,py+s*2);x.closePath();
        x.fillStyle=lin(x,px,py,px+20,py+s*L,[[0,c2],[1,c1]]);x.fill();x.strokeStyle=night?'#081008':'#0f4a1c';x.lineWidth=1.5;x.stroke();}}
    x.strokeStyle=sp;x.lineWidth=5;x.lineCap='round';x.beginPath();x.moveTo(0,0);for(let i=1;i<=26;i++){const t=i/26;x.lineTo(t*280,Math.sin(t*2.4)*30);}x.stroke();
    return c;
  }
  function drawPalm(ctx,bx,by,h,lean,t,night,flip){
    ctx.save();ctx.translate(bx,by);if(flip)ctx.scale(-1,1);
    const sway=Math.sin(t*0.9+bx)*0.04;
    const tx=lean*h+Math.sin(t*0.9+bx)*6, ty=-h;
    // trunk rings
    const N=16;
    for(let i=0;i<N;i++){const u=i/N,u2=(i+1)/N;const x0=lean*h*u*u+Math.sin(t*.9+bx)*6*u*u,y0=-h*u;const x1=lean*h*u2*u2+Math.sin(t*.9+bx)*6*u2*u2,y1=-h*u2;
      const w=26-u*10;ctx.beginPath();ctx.moveTo(x0-w/2,y0);ctx.lineTo(x1-w/2+2,y1);ctx.lineTo(x1+w/2-2,y1);ctx.lineTo(x0+w/2,y0);ctx.closePath();
      ctx.fillStyle=night?(i%2?'#3a2030':'#2a1424'):(i%2?'#5a3a22':'#3e2614');ctx.fill();ctx.strokeStyle=night?'#12060e':'#4a2a0e';ctx.lineWidth=2;ctx.stroke();}
    ctx.translate(tx,ty);
    const fr=night?BG.frondN:BG.frond;
    const angs=[-2.9,-2.3,-1.7,-1.1,-0.5,0.1,0.6,-3.4];
    angs.forEach((a,i)=>{ctx.save();ctx.rotate(a+Math.sin(t*1.3+i)*0.05+sway);ctx.scale(.9,.9+(i%3)*0.08);ctx.drawImage(fr,-6,-30);ctx.restore();});
    ctx.fillStyle=night?'#2a1424':'#6a4a1a';for(let i=0;i<4;i++){ctx.beginPath();ctx.arc(-8+i*6,6+(i%2)*6,9,0,7);ctx.fill();}
    ctx.restore();
  }
  function buildStatic(q){
    // DAY (golden-hour casino look)
    let c=mk(W*q,HGT*q),x=c.getContext('2d');x.scale(q,q);
    x.fillStyle=lin(x,0,0,0,770,[[0,'#060c22'],[.3,'#14244a'],[.6,'#5a3a5a'],[.82,'#d0663a'],[1,'#ffc066']]);x.fillRect(0,0,W,770);
    x.fillStyle=rad(x,360,760,10,520,[[0,'rgba(255,230,160,.95)'],[.12,'rgba(255,170,80,.55)'],[.5,'rgba(220,90,60,.18)'],[1,'rgba(0,0,0,0)']]);x.fillRect(0,0,W,770);
    for(let i=0;i<70;i++){x.fillStyle=`rgba(255,240,220,${Math.random()*.5})`;x.fillRect(Math.random()*W,Math.random()*300,1.4,1.4);}
    x.fillStyle='#24142a';x.beginPath();x.moveTo(-10,746);x.quadraticCurveTo(80,668,190,746);x.fill();x.fillStyle='#1c1022';x.beginPath();x.moveTo(510,748);x.quadraticCurveTo(620,684,740,748);x.fill();
    x.fillStyle=lin(x,0,744,0,905,[[0,'#3a2a3a'],[.35,'#1a2a3a'],[1,'#0a1a24']]);x.fillRect(0,744,W,166);
    x.fillStyle=lin(x,0,744,0,905,[[0,'rgba(255,190,110,.75)'],[1,'rgba(255,150,60,0)']]);x.beginPath();x.moveTo(250,746);x.lineTo(470,746);x.lineTo(560,905);x.lineTo(160,905);x.fill();
    x.fillStyle=lin(x,0,890,0,HGT,[[0,'#7a5236'],[.2,'#4a3020'],[1,'#120a06']]);x.beginPath();x.moveTo(0,905);x.bezierCurveTo(200,885,500,920,720,895);x.lineTo(720,HGT);x.lineTo(0,HGT);x.fill();
    for(let i=0;i<300;i++){x.fillStyle=`rgba(255,${200+Math.random()*40|0},150,${Math.random()*.25})`;x.fillRect(Math.random()*W,920+Math.random()*560,1.5,1.5);}
    BG.static.day=c;
    // NIGHT
    c=mk(W*q,HGT*q);x=c.getContext('2d');x.scale(q,q);
    x.fillStyle=lin(x,0,0,0,780,[[0,'#120a36'],[.4,'#4a1a6a'],[.75,'#b8366a'],[1,'#ff8a46']]);x.fillRect(0,0,W,780);
    for(let i=0;i<160;i++){x.fillStyle=`rgba(255,255,255,${Math.random()*.7})`;const s=Math.random()<.1?2.5:1.3;x.fillRect(Math.random()*W,Math.random()*480,s,s);}
    // volcano body
    x.fillStyle=rad(x,360,180,10,380,[[0,'rgba(255,160,60,.7)'],[1,'rgba(255,80,40,0)']]);x.fillRect(0,0,W,700);
    const v=new Path2D();v.moveTo(-80,800);v.bezierCurveTo(150,600,250,320,300,196);v.quadraticCurveTo(360,176,420,196);v.bezierCurveTo(470,320,570,600,800,800);v.closePath();
    x.fillStyle=lin(x,0,190,0,800,[[0,'#6a2a4a'],[.4,'#3a1430'],[1,'#1a0818']]);x.fill(v);
    x.save();x.clip(v);x.fillStyle=lin(x,200,0,520,0,[[0,'rgba(0,0,0,.35)'],[.5,'rgba(0,0,0,0)'],[1,'rgba(255,120,80,.12)']]);x.fillRect(0,0,W,800);x.restore();
    x.fillStyle=lin(x,0,760,0,910,[[0,'#3a1450'],[.6,'#2a0e3a'],[1,'#5a1e40']]);x.fillRect(0,770,W,140);
    x.fillStyle=lin(x,0,890,0,HGT,[[0,'#8a3a3a'],[.3,'#6a2a2a'],[1,'#2a0e18']]);x.beginPath();x.moveTo(0,905);x.bezierCurveTo(200,885,500,920,720,895);x.lineTo(720,HGT);x.lineTo(0,HGT);x.fill();
    BG.static.night=c;
    BG.frond=makeFrond(false);BG.frondN=makeFrond(true);
    // bottom flower strip
    const fs=mk(W*q,240*q),fx=fs.getContext('2d');fx.scale(q,q);
    for(let i=0;i<14;i++){const xx=i*56+rndr(-10,10);for(let k=0;k<5;k++)drawLeaf(fx,xx+rndr(-16,16),232,rndr(-1.2,1.2),rndr(60,110),18);}
    for(let i=0;i<12;i++){const xx=i*64+rndr(-8,8),yy=rndr(150,215);if(i%3===0)drawPlumeria(fx,xx,yy,.3);else drawHibiscus(fx,xx,yy,.36,i%2?'pink':'purple');}
    BG.static.flowers=fs;
    const fn=mk(W*q,240*q),fnx=fn.getContext('2d');fnx.drawImage(fs,0,0);fnx.globalCompositeOperation='source-atop';fnx.fillStyle='rgba(40,8,50,.5)';fnx.fillRect(0,0,fn.width,fn.height);BG.static.flowersN=fn;
    BG.clouds=[];for(let i=0;i<6;i++)BG.clouds.push({x:rndr(-100,720),y:rndr(40,520),s:rndr(.6,1.4),v:rndr(4,12)});
  }
  function drawCloud(ctx,x,y,s){ctx.save();ctx.translate(x,y);ctx.scale(s,s);ctx.fillStyle=y>300?'rgba(255,160,110,.32)':'rgba(120,90,140,.35)';
    [[0,0,40],[40,-14,48],[86,0,38],[46,14,40],[-30,12,28],[110,14,26]].forEach(a=>{ctx.beginPath();ctx.arc(a[0],a[1],a[2],0,7);ctx.fill();});
    ctx.fillStyle='rgba(20,10,30,.25)';ctx.fillRect(-50,20,180,14);ctx.restore();}
  function drawFlame(ctx,x,y,s,t){
    ctx.save();ctx.translate(x,y);ctx.scale(s,s);ctx.globalCompositeOperation='lighter';
    ctx.fillStyle=rad(ctx,0,-30,2,110,[[0,'rgba(255,170,60,.55)'],[1,'rgba(255,80,20,0)']]);ctx.beginPath();ctx.arc(0,-30,110,0,7);ctx.fill();
    const layers=[['#ff3a10',1],['#ff8a1a',.75],['#ffd23a',.5],['#fff6c0',.28]];
    layers.forEach(([c,k],i)=>{const f1=Math.sin(t*9+i)*6,f2=Math.sin(t*13+i*2)*5,hgt=(70+Math.sin(t*7+i*1.7)*10)*k+20;
      ctx.fillStyle=c;ctx.globalAlpha=.85;ctx.beginPath();ctx.moveTo(-26*k,0);ctx.bezierCurveTo(-30*k,-hgt*.5,f1-8*k,-hgt*.7,f2,-hgt);ctx.bezierCurveTo(f1+10*k,-hgt*.65,30*k,-hgt*.45,26*k,0);ctx.quadraticCurveTo(0,14*k,-26*k,0);ctx.fill();});
    ctx.restore();
  }
  function drawTorch(ctx,x,y,t){
    ctx.save();ctx.fillStyle=lin(ctx,x-9,0,x+9,0,[[0,'#5a3410'],[.5,'#c8904a'],[1,'#5a3410']]);ctx.fillRect(x-8,y,16,400);
    ctx.fillStyle='#3a1a08';for(let i=0;i<12;i++)ctx.fillRect(x-9,y+20+i*32,18,4);
    const cup=new Path2D();cup.moveTo(x-26,y-14);cup.lineTo(x+26,y-14);cup.lineTo(x+14,y+22);cup.lineTo(x-14,y+22);cup.closePath();
    carved(ctx,cup,{outline:'#2a1004',lw:6,fill:lin(ctx,0,y-14,0,y+22,[[0,'#d8a050'],[1,'#7a4a1a']]),gloss:false,shadowY:2});
    ctx.strokeStyle='#2a1004';ctx.lineWidth=2;for(let i=0;i<4;i++){ctx.beginPath();ctx.moveTo(x-22+i*4,y-8+i*8);ctx.lineTo(x+22-i*4,y-8+i*8);ctx.stroke();}
    ctx.restore();
    drawFlame(ctx,x,y-12,.62,t+x);
  }
  function renderBG(ctx,t,dt){
    const night=BG.mode==='night';
    ctx.drawImage(night?BG.static.night:BG.static.day,0,0,W,HGT);
    if(!night){
      BG.clouds.forEach(c=>{c.x+=c.v*dt;if(c.x>800)c.x=-200;drawCloud(ctx,c.x,c.y,c.s);});
      ctx.save();ctx.globalCompositeOperation='lighter';for(let k=0;k<7;k++){const a=-Math.PI/2+(k-3)*0.32+Math.sin(t*.15+k)*0.05;ctx.fillStyle=`rgba(255,200,120,${.045+.03*Math.sin(t*.7+k*1.3)})`;ctx.beginPath();ctx.moveTo(360,760);ctx.lineTo(360+Math.cos(a-.07)*1100,760+Math.sin(a-.07)*1100);ctx.lineTo(360+Math.cos(a+.07)*1100,760+Math.sin(a+.07)*1100);ctx.fill();}ctx.restore();
      // sea shimmer
      ctx.save();ctx.globalAlpha=.55;ctx.strokeStyle='#ffd9a0';ctx.lineWidth=2;
      for(let i=0;i<22;i++){const y=752+i*7,ph=t*1.2+i*1.7;const xx=((i*137+t*20)%820)-60;ctx.globalAlpha=.25+.25*Math.sin(ph);ctx.beginPath();ctx.moveTo(xx,y);ctx.lineTo(xx+30+i*2,y);ctx.stroke();}
      ctx.restore();
      // foam
      const fy=898+Math.sin(t*1.1)*5;ctx.save();ctx.fillStyle='rgba(255,220,180,.28)';ctx.beginPath();ctx.moveTo(0,fy);for(let xx=0;xx<=W;xx+=20)ctx.lineTo(xx,fy+Math.sin(xx*.05+t*2)*4);ctx.lineTo(W,fy+10);ctx.lineTo(0,fy+10);ctx.fill();ctx.restore();
    } else {
      // twinkle
      for(let i=0;i<24;i++){const a=.5+.5*Math.sin(t*3+i*7.3);ctx.fillStyle=`rgba(255,255,255,${a})`;const sx=(i*263)%720,sy=(i*97)%420;ctx.fillRect(sx,sy,2.5,2.5);}
      // crater glow + lava streams
      const g=.65+.35*Math.sin(t*2.2)+BG.erupt*.8;
      ctx.save();ctx.globalCompositeOperation='lighter';
      ctx.fillStyle=rad(ctx,360,190,4,170,[[0,`rgba(255,230,140,${Math.min(1,g)})`],[.3,`rgba(255,120,30,${.6*g})`],[1,'rgba(255,40,0,0)']]);ctx.fillRect(160,20,400,340);
      ctx.lineCap='round';ctx.shadowColor='#ff5a00';ctx.shadowBlur=18;
      [[330,200,250,420,170,700],[392,200,470,430,560,700],[360,198,350,400,330,640],[345,200,300,330,240,520]].forEach((a,i)=>{
        ctx.strokeStyle=`rgba(255,${120+i*20},30,${.55+.35*Math.sin(t*1.7+i)})`;ctx.lineWidth=7-i;ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.quadraticCurveTo(a[2],a[3],a[4],a[5]);ctx.stroke();});
      ctx.restore();
      // smoke
      if(Math.random()<dt*3)BG.smoke.push({x:360+rndr(-30,30),y:190,r:20,a:.5,vx:rndr(-8,8)});
      BG.smoke.forEach(s=>{s.y-=26*dt;s.x+=s.vx*dt;s.r+=14*dt;s.a-=.08*dt;ctx.fillStyle=`rgba(110,70,110,${Math.max(0,s.a)*.45})`;ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,7);ctx.fill();});
      BG.smoke=BG.smoke.filter(s=>s.a>0);
      // lava bombs
      if(Math.random()<dt*(1.5+BG.erupt*40))BG.lava.push({x:360+rndr(-20,20),y:196,vx:rndr(-160,160),vy:rndr(-420,-220),r:rndr(3,7),life:3});
      ctx.save();ctx.globalCompositeOperation='lighter';
      BG.lava.forEach(p=>{p.vy+=380*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;ctx.fillStyle=rad(ctx,p.x,p.y,0,p.r*3,[[0,'rgba(255,240,170,1)'],[.3,'rgba(255,130,30,.9)'],[1,'rgba(255,40,0,0)']]);ctx.beginPath();ctx.arc(p.x,p.y,p.r*3,0,7);ctx.fill();});
      BG.lava=BG.lava.filter(p=>p.life>0&&p.y<900);ctx.restore();
      BG.erupt=Math.max(0,BG.erupt-dt*.4);
      // sea reflection
      ctx.save();ctx.globalAlpha=.5;for(let i=0;i<16;i++){const y=780+i*8;ctx.strokeStyle=`rgba(255,${140+i*4},80,${.4*Math.abs(Math.sin(t*1.4+i))})`;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(300-i*6+Math.sin(t+i)*10,y);ctx.lineTo(420+i*6+Math.sin(t+i)*10,y);ctx.stroke();}ctx.restore();
    }
    // palms
    drawPalm(ctx,-10,1010,300,0.35,t,night,false);
    drawPalm(ctx,730,1010,300,0.35,t,night,true);
    // top corner fronds
    const fr=night?BG.frondN:BG.frond;
    ctx.save();ctx.translate(-30,-20);ctx.rotate(0.55+Math.sin(t*.8)*.03);ctx.drawImage(fr,0,-30,340,120);ctx.rotate(0.45);ctx.drawImage(fr,0,-30,300,110);ctx.restore();
    ctx.save();ctx.translate(750,-20);ctx.scale(-1,1);ctx.rotate(0.55+Math.sin(t*.8+1)*.03);ctx.drawImage(fr,0,-30,340,120);ctx.rotate(0.45);ctx.drawImage(fr,0,-30,300,110);ctx.restore();
    // bottom flowers
    ctx.drawImage(BG.static.flowersN,0,1250,W,240);
    if(night){
      drawTorch(ctx,46,1000,t);drawTorch(ctx,674,1000,t+3);
      if(Math.random()<dt*14)BG.embers.push({x:rndr(0,W),y:HGT+10,vy:rndr(-90,-40),vx:rndr(-20,20),life:rndr(4,8),r:rndr(1,2.6)});
      [46,674].forEach(tx=>{if(Math.random()<dt*10)BG.embers.push({x:tx+rndr(-10,10),y:960,vy:rndr(-120,-60),vx:rndr(-25,25),life:rndr(1,2.4),r:rndr(1,2.4)});});
    }
    if(!night&&Math.random()<dt*5)BG.embers.push({x:rndr(0,W),y:HGT,vy:rndr(-60,-25),vx:rndr(-10,10),life:rndr(6,12),r:rndr(1,2.2),gold:1});
    if(BG.embers.length){ctx.save();ctx.globalCompositeOperation='lighter';BG.embers.forEach(e=>{e.x+=e.vx*dt+Math.sin(t*3+e.y*.02)*.6;e.y+=e.vy*dt;e.life-=dt;ctx.fillStyle=e.gold?`rgba(255,220,150,${Math.min(.7,e.life*.2)})`:`rgba(255,${150+Math.random()*80|0},60,${Math.min(1,e.life)})`;ctx.beginPath();ctx.arc(e.x,e.y,e.r,0,7);ctx.fill();});ctx.restore();BG.embers=BG.embers.filter(e=>e.life>0);}
  }

  // ===== AUDIO (Web Audio synth) =====
  const AU={ctx:null,master:null,music:null,sfx:null,muted:false,musicOn:true,track:'base',step:0,nextT:0,timer:null,noiseBuf:null};
  function auInit(){
    if(AU.ctx) {AU.ctx.resume();return;}
    const C=window.AudioContext||window.webkitAudioContext;if(!C)return;
    const c=AU.ctx=new C();
    const comp=c.createDynamicsCompressor();comp.threshold.value=-14;comp.ratio.value=4;comp.connect(c.destination);
    AU.master=c.createGain();AU.master.gain.value=.85;AU.master.connect(comp);
    AU.music=c.createGain();AU.music.gain.value=.32;AU.music.connect(AU.master);
    AU.sfx=c.createGain();AU.sfx.gain.value=.9;AU.sfx.connect(AU.master);
    const len=c.sampleRate*2;AU.noiseBuf=c.createBuffer(1,len,c.sampleRate);const d=AU.noiseBuf.getChannelData(0);for(let i=0;i<len;i++)d[i]=Math.random()*2-1;
    AU.nextT=c.currentTime+.1;AU.timer=setInterval(musicTick,25);
  }
  function now(){return AU.ctx?AU.ctx.currentTime:0;}
  function tone(f,dur,o={}){
    if(!AU.ctx)return;const c=AU.ctx,t=o.t??c.currentTime;
    const os=c.createOscillator(),g=c.createGain();os.type=o.type||'sine';os.frequency.setValueAtTime(f,t);
    if(o.to)os.frequency.exponentialRampToValueAtTime(o.to,t+(o.glide??dur));
    if(o.detune)os.detune.value=o.detune;
    const v=o.vol??.3,a=o.a??.005;g.gain.setValueAtTime(0.0001,t);g.gain.linearRampToValueAtTime(v,t+a);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    let node=os;
    if(o.lp){const f2=c.createBiquadFilter();f2.type='lowpass';f2.frequency.value=o.lp;f2.Q.value=o.q??1;os.connect(f2);node=f2;}
    node.connect(g);g.connect(o.dest||AU.sfx);os.start(t);os.stop(t+dur+.05);
    return os;
  }
  function noise(dur,o={}){
    if(!AU.ctx)return;const c=AU.ctx,t=o.t??c.currentTime;
    const s=c.createBufferSource();s.buffer=AU.noiseBuf;const f=c.createBiquadFilter();f.type=o.ft||'bandpass';f.frequency.setValueAtTime(o.f||1000,t);if(o.f2)f.frequency.exponentialRampToValueAtTime(o.f2,t+dur);f.Q.value=o.q??1;
    const g=c.createGain();const v=o.vol??.3;g.gain.setValueAtTime(0.0001,t);g.gain.linearRampToValueAtTime(v,t+(o.a??.005));g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    s.connect(f);f.connect(g);g.connect(o.dest||AU.sfx);s.start(t,Math.random());s.stop(t+dur+.05);
  }
  const NOTE=n=>440*Math.pow(2,(n-69)/12);
  const SFX={
    click(){tone(1100,.05,{type:'square',vol:.06});tone(1650,.04,{vol:.05,t:now()+.02});},
    spin(){noise(.35,{f:500,f2:2400,q:2,vol:.25});tone(180,.2,{type:'triangle',to:90,vol:.2});},
    stop(i){const t=now();tone(140-i*6,.16,{to:48,vol:.42,t});noise(.05,{ft:'highpass',f:3000,vol:.12,t});tone(420+i*30,.06,{type:'triangle',vol:.06,t});},
    scatter(n){const base=[64,67,71,76,79][Math.min(n,4)];const t=now();[0,12,19].forEach((k,i)=>{tone(NOTE(base+k),1.2,{vol:.16/(i+1),t:t+i*.01});tone(NOTE(base+k)*2.76,.5,{vol:.05,t});});noise(.4,{ft:'highpass',f:6000,vol:.08,t});},
    antic(){if(!AU.ctx)return ()=>{};const c=AU.ctx,t=c.currentTime;const os=c.createOscillator(),os2=c.createOscillator(),f=c.createBiquadFilter(),g=c.createGain(),lfo=c.createOscillator(),lg=c.createGain();
      os.type='sawtooth';os2.type='sawtooth';os2.detune.value=14;os.frequency.setValueAtTime(110,t);os.frequency.exponentialRampToValueAtTime(440,t+2.4);os2.frequency.setValueAtTime(110,t);os2.frequency.exponentialRampToValueAtTime(440,t+2.4);
      f.type='lowpass';f.frequency.setValueAtTime(400,t);f.frequency.exponentialRampToValueAtTime(3000,t+2.4);f.Q.value=6;
      lfo.frequency.value=12;lg.gain.value=.08;lfo.connect(lg);lg.connect(g.gain);g.gain.setValueAtTime(0.0001,t);g.gain.linearRampToValueAtTime(.12,t+.3);
      os.connect(f);os2.connect(f);f.connect(g);g.connect(AU.sfx);os.start();os2.start();lfo.start();
      return ()=>{const e=c.currentTime;g.gain.cancelScheduledValues(e);g.gain.setValueAtTime(g.gain.value,e);g.gain.exponentialRampToValueAtTime(0.0001,e+.15);[os,os2,lfo].forEach(o=>o.stop(e+.2));};},
    win(level=0){const t=now();const sc=[72,76,79,84,88,91];sc.slice(0,3+level).forEach((n,i)=>{tone(NOTE(n),.4,{type:'triangle',vol:.14,t:t+i*.07});tone(NOTE(n+12),.25,{vol:.05,t:t+i*.07});});},
    tick(){tone(2200+Math.random()*600,.05,{vol:.05,type:'sine'});},
    coin(){const t=now();const f=2600+Math.random()*1800;tone(f,.18,{vol:.06,t});tone(f*1.5,.12,{vol:.04,t:t+.03});},
    fanfare(tier){const t=now();const roots=[60,65,67,72];const r=roots[Math.min(tier,3)];
      [[0,4,7],[2,5,9],[4,7,12]].forEach((ch,j)=>ch.forEach(k=>{tone(NOTE(r+k),.7,{type:'sawtooth',lp:2200,vol:.07,t:t+j*.18,a:.03});tone(NOTE(r+k-12),.7,{type:'square',lp:900,vol:.04,t:t+j*.18,a:.03});}));
      noise(1.2,{ft:'highpass',f:5000,vol:.1,t,a:.02});tone(NOTE(r-24),1,{type:'triangle',vol:.3,t});},
    rumble(d=2){noise(d,{ft:'lowpass',f:140,vol:.6,a:.3});tone(45,d,{type:'sawtooth',lp:120,vol:.25,a:.3});},
    boom(){noise(1.4,{ft:'lowpass',f:900,f2:60,vol:.8});tone(90,1,{to:30,vol:.6});},
    gong(){const t=now();[110,232,358,521].forEach((f,i)=>tone(f,2.6-i*.4,{vol:.18/(i+1),t,a:.01}));noise(.6,{ft:'highpass',f:4000,vol:.06,t});},
    burst(){noise(.5,{f:3000,f2:300,q:1.5,vol:.25});const t=now();[0,1,2,3].forEach(i=>tone(1800+i*500,.15,{vol:.05,t:t+i*.04}));},
    sticky(){tone(520,.12,{type:'square',lp:1500,vol:.07});tone(780,.15,{type:'triangle',vol:.08,t:now()+.06});},
    whoosh(){noise(.6,{f:300,f2:3000,q:.7,vol:.3});},
    pop(){tone(600,.12,{to:1200,type:'triangle',vol:.12});},
    fsCount(){tone(NOTE(84),.15,{type:'triangle',vol:.1});tone(NOTE(91),.2,{vol:.06,t:now()+.06});}
  };
  // ---- music ----
  const PROG={base:{bpm:104,chords:[[60,64,67],[57,60,64],[53,57,60],[55,59,62]],scale:[60,62,64,67,69,72,74,76,79]},
              free:{bpm:122,chords:[[57,60,64],[53,57,60],[48,52,55],[55,59,62]],scale:[57,60,62,64,67,69,72,74,76]}};
  let melSeed=7;function mrand(){melSeed=(melSeed*16807)%2147483647;return melSeed/2147483647;}
  function pluck(f,t,v=.08){tone(f,.45,{type:'triangle',vol:v,t,dest:AU.music,lp:3200});tone(f*2,.18,{vol:v*.35,t,dest:AU.music});}
  function marimba(f,t,v=.12){tone(f,.35,{vol:v,t,dest:AU.music});tone(f*4,.08,{vol:v*.25,t,dest:AU.music});}
  function musicTick(){
    if(!AU.ctx)return;const c=AU.ctx;const P=PROG[AU.track];const sp=60/P.bpm/4;
    while(AU.nextT<c.currentTime+.15){
      if(AU.nextT<c.currentTime-.2)AU.nextT=c.currentTime+.05;
      const t=AU.nextT,s=AU.step%64,bar=Math.floor(s/16),b=s%16;const ch=P.chords[bar];
      if(AU.musicOn&&!AU.muted&&!AU.duck){
        if(AU.track==='base'){
          if([0,3,6,8,10,14].includes(b)) ch.forEach((n,i)=>pluck(NOTE(n+12),t+i*.012,b===0?.07:.045));
          if(b===0||b===8) tone(NOTE(ch[0]-24),.5,{type:'triangle',vol:.22,t,dest:AU.music});
          if(b===12) tone(NOTE(ch[2]-24),.3,{type:'triangle',vol:.16,t,dest:AU.music});
          if(b%2===0) noise(.05,{ft:'highpass',f:7000,vol:b%4===2?.07:.035,t,dest:AU.music});
          if(b%4===0&&mrand()<.7||b%4===2&&mrand()<.3){const sc=P.scale;marimba(NOTE(sc[Math.floor(mrand()*sc.length)]+12),t,.07);}
        } else {
          if(b%4===0) tone(150,.35,{to:55,vol:.35,t,dest:AU.music});
          if([6,10,11,14].includes(b)) tone(220,.18,{to:110,vol:.18,t,dest:AU.music});
          if(b%2===1) noise(.04,{ft:'highpass',f:6000,vol:.05,t,dest:AU.music});
          if(b===0) ch.forEach(n=>tone(NOTE(n),1.6,{type:'sawtooth',lp:900,vol:.03,t,a:.3,dest:AU.music}));
          if(b===0||b===10) tone(NOTE(ch[0]-24),.4,{type:'square',lp:400,vol:.12,t,dest:AU.music});
          if(b%2===0&&mrand()<.45){const sc=P.scale;marimba(NOTE(sc[Math.floor(mrand()*sc.length)]+12),t,.065);}
        }
      }
      AU.nextT+=sp;AU.step++;
    }
  }
  function setTrack(tr){AU.track=tr;AU.step=0;}
  function setMuted(m){AU.muted=m;if(AU.master)AU.master.gain.setTargetAtTime(m?0:.85,AU.ctx.currentTime,.05);}

  // ===== GAME =====
  PAY_K=0.0772;
  const $=id=>root.querySelector('#'+id);
  const CW=106,CH=100,GAP=4,X0=32,CY=560;
  const reelX=r=>X0+r*(CW+GAP), reelTop=r=>CY-H[r]*CH/2;
  const NAMES={0:'WILD',1:'SCATTER',2:'หน้ากากเพลิง',3:'โทเท็มม่วง',4:'โทเท็มใบไม้',5:'สับปะรด',6:'มะพร้าว',7:'ชบา',8:'ลีลาวดี',9:'A',10:'K',11:'Q',12:'J'};
  const BETS=[1,2,5,10,20,50,100,200];
  const S={balance:host?host.getBalance():10000,betIdx:3,turbo:false,auto:0,inFS:false,fsLeft:0,fsTotal:0,fsCount:0,sticky:[],busy:false,spinning:false,lastWin:0,token:0,muted:false,started:false,slam:false};
  const bet=()=>BETS[S.betIdx];
  const fmt=v=>v.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
  const sleep=ms=>new Promise(r=>setTimeout(r,S.turbo?ms*.55:ms));
  const rawSleep=ms=>new Promise(r=>setTimeout(r,ms));
  let gameT=0,q=1,scaleS=1;
  const main=$('main'),ctx=main.getContext('2d'),fxc=$('fx'),fx=fxc.getContext('2d');

  // ---------- reels ----------
  const VIS_W=[0,0.6,4,5,6,7,8,9,10,13,13,14,14];
  function randSym(){return pick(VIS_W,Math.random);}
  let G=H.map(h=>Array.from({length:h},()=>randSym()));
  const reels=H.map((h,r)=>({syms:[randSym(),...G[r],randSym()],off:0,phase:'idle',v:0,t:0,queue:[],queued:false,stopAt:Infinity,antic:false}));
  const cellFx=H.map(h=>Array.from({length:h},()=>({land:-9,burst:-9,sticky:-9})));
  let WIN=null; // {cells:Set, all, cycle}
  let anticStop=null, landResolve=null, scatterSoFar=0;

  function startReels(grid){
    S.slam=false;scatterSoFar=0;
    reels.forEach((R,r)=>{R.phase='kick';R.t=-r*0.045;R.queue=[];R.queued=false;R.final=grid[r];R.stopAt=Infinity;R.antic=false;R.v=0;});
    reels[0].stopAt=gameT+(S.turbo?0.28:0.62);
    return new Promise(res=>landResolve=res);
  }
  function slam(){if(!S.spinning)return;S.slam=true;reels.forEach(R=>{if(R.phase==='kick'||R.phase==='spin'){R.stopAt=Math.min(R.stopAt,gameT);R.antic=false;}});if(anticStop){anticStop();anticStop=null;}}
  function onLand(r){
    const R=reels[r];
    for(let i=0;i<H[r];i++){cellFx[r][i].land=gameT;if(R.final[i]===1){scatterSoFar++;SFX.scatter(scatterSoFar);ringAt(r,i,'#ffd23a');}}
    SFX.stop(r);
    if(r<5){
      const nx=reels[r+1];
      if(scatterSoFar>=2&&!S.slam){nx.antic=true;nx.stopAt=gameT+(S.turbo?1.0:1.7);if(!anticStop)anticStop=SFX.antic();}
      else nx.stopAt=S.slam?gameT:gameT+(S.turbo?0.07:0.15);
    } else {if(anticStop){anticStop();anticStop=null;}landResolve&&landResolve();landResolve=null;}
  }
  function updateReels(dt){
    const vmax=S.turbo?3800:2700;
    reels.forEach((R,r)=>{
      if(R.phase==='idle')return;
      R.t+=dt;
      if(R.phase==='kick'){if(R.t<0)return;const u=R.t/0.13;R.off=-18*Math.sin(Math.PI*Math.min(1,u));if(u>=1){R.phase='spin';R.off=0;R.v=600;}return;}
      if(R.phase==='spin'){
        R.v=Math.min(vmax*(R.antic?1.25:1),R.v+9000*dt);R.off+=R.v*dt;
        if(gameT>=R.stopAt&&!R.queued){R.queued=true;R.queue=[...R.final].reverse();R.queue.push(randSym());}
        while(R.off>=CH){
          R.off-=CH;R.syms.pop();
          const fromQ=R.queue.length>0;R.syms.unshift(fromQ?R.queue.shift():randSym());
          if(R.queued&&fromQ&&R.queue.length===0){R.phase='bounce';R.t=0;R.off=0;G[r]=[...R.final];onLand(r);break;}
        }
        return;
      }
      if(R.phase==='bounce'){const D=S.turbo?0.14:0.24;const u=Math.min(1,R.t/D);R.off=24*Math.sin(Math.PI*u)*Math.exp(-1.5*u);if(u>=1){R.phase='idle';R.off=0;}}
    });
  }
  function wildPart(r,i){
    const col=G[r];if(col[i]!==0)return 'wsingle';
    let a=i;while(a>0&&col[a-1]===0)a--;let b=i;while(b<col.length-1&&col[b+1]===0)b++;
    const len=b-a+1;if(len===1)return 'wsingle';
    if(i===a)return 'wtop';if(len>=3&&i===b)return 'wbot';return 'wmid';
  }

  // ---------- particles ----------
  let P=[];
  const coinSpr=(()=>{const c=mk(64,64),x=c.getContext('2d');x.fillStyle=rad(x,26,22,2,32,[[0,'#fffbd0'],[.5,'#ffd23a'],[1,'#b8700a']]);x.beginPath();x.arc(32,32,30,0,7);x.fill();x.lineWidth=3;x.strokeStyle='#8a4a06';x.stroke();x.beginPath();x.arc(32,32,21,0,7);x.strokeStyle='rgba(138,74,6,.6)';x.stroke();
    x.font='900 28px Georgia,serif';x.textAlign='center';x.textBaseline='middle';x.fillStyle='#b8700a';x.fillText('A',32,34);x.fillStyle='#fff4b0';x.fillText('A',31,32);return c;})();
  function spark(x,y,col='#fff3a0',n=1,spd=160){for(let k=0;k<n;k++){const a=Math.random()*6.28,v=Math.random()*spd;P.push({k:'s',x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-40,life:.5+Math.random()*.7,L:1.2,sz:4+Math.random()*7,c:col});}}
  function coin(x,y,vx,vy){P.push({k:'c',x,y,vx,vy,ph:Math.random()*6,pv:6+Math.random()*10,life:4,L:4,sz:22+Math.random()*16});}
  function ringAt(r,i,c){const cx=reelX(r)+CW/2,cy=reelTop(r)+i*CH+CH/2;P.push({k:'r',x:cx,y:cy,rad:20,life:.6,L:.6,c});spark(cx,cy,c,14,260);}
  function drawStar(c,x,y,s){c.beginPath();c.moveTo(x,y-s);c.quadraticCurveTo(x,y,x+s,y);c.quadraticCurveTo(x,y,x,y+s);c.quadraticCurveTo(x,y,x-s,y);c.quadraticCurveTo(x,y,x,y-s);c.fill();}
  function updateFX(dt){
    fx.setTransform(q,0,0,q,0,0);fx.clearRect(0,0,W,HGT);
    for(const p of P){
      p.life-=dt;
      if(p.k==='s'){p.vy+=120*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.97;fx.save();fx.globalCompositeOperation='lighter';fx.globalAlpha=Math.max(0,Math.min(1,p.life*2));fx.fillStyle=p.c;drawStar(fx,p.x,p.y,p.sz*(.5+p.life/p.L*.5));fx.restore();}
      else if(p.k==='c'){p.vy+=1100*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.ph+=p.pv*dt;const sx=Math.abs(Math.cos(p.ph));fx.save();fx.translate(p.x,p.y);fx.scale(Math.max(.08,sx),1);fx.drawImage(coinSpr,-p.sz/2,-p.sz/2,p.sz,p.sz);fx.restore();if(sx>.97&&Math.random()<.05){fx.save();fx.globalCompositeOperation='lighter';fx.fillStyle='#fff';drawStar(fx,p.x-4,p.y-4,8);fx.restore();}}
      else if(p.k==='r'){p.rad+=260*dt;fx.save();fx.globalAlpha=Math.max(0,p.life/p.L);fx.strokeStyle=p.c;fx.lineWidth=6;fx.shadowColor=p.c;fx.shadowBlur=20;fx.beginPath();fx.arc(p.x,p.y,p.rad,0,7);fx.stroke();fx.restore();}
    }
    P=P.filter(p=>p.life>0&&p.y<HGT+80);
  }

  // ---------- reels render ----------
  let plaque;
  function metal(x,y0,y1){return lin(x,0,y0,0,y1,[[0,'#fff6d0'],[.22,'#f0c460'],[.48,'#a8701a'],[.52,'#5a3606'],[.75,'#d8a240'],[1,'#fff0b0']]);}
  function buildPlaque(){plaque=mk(460,100);const x=plaque.getContext('2d');
    const outer=new Path2D();outer.moveTo(40,8);outer.lineTo(420,8);outer.lineTo(452,50);outer.lineTo(420,92);outer.lineTo(40,92);outer.lineTo(8,50);outer.closePath();
    x.shadowColor='rgba(0,0,0,.7)';x.shadowBlur=12;x.shadowOffsetY=5;x.fillStyle=metal(x,8,92);x.fill(outer);x.shadowColor='transparent';
    const inner=new Path2D();inner.moveTo(46,15);inner.lineTo(414,15);inner.lineTo(441,50);inner.lineTo(414,85);inner.lineTo(46,85);inner.lineTo(19,50);inner.closePath();
    x.fillStyle=lin(x,0,15,0,85,[[0,'#2a2018'],[.5,'#0c0806'],[1,'#1a120c']]);x.fill(inner);x.strokeStyle='rgba(0,0,0,.8)';x.lineWidth=2;x.stroke(inner);
    x.fillStyle=lin(x,0,15,0,40,[[0,'rgba(255,255,255,.14)'],[1,'rgba(255,255,255,0)']]);x.fill(inner);
    [[30,50],[430,50]].forEach(([cx,cy])=>{x.save();x.translate(cx,cy);x.rotate(Math.PI/4);x.fillStyle=lin(x,-7,-7,7,7,[[0,'#ffb0b0'],[.4,'#e01020'],[1,'#400004']]);x.fillRect(-7,-7,14,14);x.strokeStyle='#ffe9a0';x.lineWidth=1.5;x.strokeRect(-7,-7,14,14);x.restore();});
    txt(x,'3600 WAYS',230,53,44,metal(x,28,78),'#000',4);}
  function renderReels(t){
    const night=BG.mode==='night';
    // outer frame
    ctx.save();
    for(let r=0;r<6;r++){const x=reelX(r)-6,y=reelTop(r)-10,w=CW+12,h=H[r]*CH+20;
      ctx.shadowColor='rgba(0,0,0,.8)';ctx.shadowBlur=24;ctx.shadowOffsetY=10;ctx.fillStyle=lin(ctx,x,0,x+w,0,[[0,'#3a2204'],[.12,'#e8b850'],[.3,'#fff2c0'],[.5,'#a8701a'],[.7,'#f0c460'],[.88,'#fff0b0'],[1,'#3a2204']]);ctx.fill(rrPath(x,y,w,h,10));}
    ctx.shadowColor='transparent';
    for(let r=0;r<6;r++){const x=reelX(r),y=reelTop(r),h=H[r]*CH;
      ctx.fillStyle='#050305';ctx.fill(rrPath(x-2,y-2,CW+4,h+4,8));ctx.fillStyle=night?lin(ctx,0,y,0,y+h,[[0,'#3a0c18'],[.5,'#1a050c'],[1,'#2a0810']]):lin(ctx,0,y,0,y+h,[[0,'#1c1a2c'],[.5,'#0a0912'],[1,'#16121e']]);ctx.fill(rrPath(x,y,CW,h,6));
      ctx.fillStyle=lin(ctx,x,0,x+CW,0,[[0,'rgba(0,0,0,.55)'],[.15,'rgba(0,0,0,0)'],[.85,'rgba(0,0,0,0)'],[1,'rgba(0,0,0,.55)']]);ctx.fillRect(x,y,CW,h);ctx.fillStyle=lin(ctx,0,y,0,y+40,[[0,'rgba(255,220,150,.12)'],[1,'rgba(255,220,150,0)']]);ctx.fillRect(x,y,CW,40);
      // wild column warm glow
      let wc=0;for(let i=0;i<H[r];i++)if(G[r][i]===0)wc++;
      if(wc>=2&&reels[r].phase==='idle'){ctx.save();ctx.globalAlpha=.85;ctx.fillStyle=lin(ctx,x,0,x+CW,0,[[0,'rgba(255,120,20,.2)'],[.5,'rgba(255,200,80,.75)'],[1,'rgba(255,120,20,.2)']]);ctx.fill(rrPath(x,y,CW,h,8));
        ctx.globalAlpha=.25;ctx.fillStyle='#fff3c0';for(let k=0;k<6;k++){ctx.beginPath();ctx.moveTo(x+CW/2,y+h/2);const a=t*.6+k*1.047;ctx.lineTo(x+CW/2+Math.cos(a)*200,y+h/2+Math.sin(a)*300);ctx.lineTo(x+CW/2+Math.cos(a+.2)*200,y+h/2+Math.sin(a+.2)*300);ctx.fill();}ctx.restore();}
      // subtle row lines
      ctx.strokeStyle='rgba(255,255,255,.05)';ctx.lineWidth=1;for(let i=1;i<H[r];i++){ctx.beginPath();ctx.moveTo(x+8,y+i*CH);ctx.lineTo(x+CW-8,y+i*CH);ctx.stroke();}
    }
    ctx.restore();
    // symbols
    for(let r=0;r<6;r++){
      const R=reels[r],x=reelX(r),top=reelTop(r),h=H[r]*CH;
      ctx.save();ctx.beginPath();ctx.rect(x,top,CW,h);ctx.clip();
      const spinning=R.phase==='spin'||R.phase==='kick';
      const blur=R.phase==='spin'&&R.v>1200;
      for(let k=0;k<R.syms.length;k++){
        const y=top+(k-1)*CH+R.off;if(y<top-CH||y>top+h)continue;
        const s=R.syms[k];const i=k-1;const idle=!spinning&&i>=0&&i<H[r];
        if(blur){const b=SPRB[s===0?'wsingle':s];ctx.drawImage(b,x+5,y+2-14.4,96,124.8);continue;}
        if(s===0){
          const part=idle?wildPart(r,i):'wsingle';
          let a=1,sc=1;
          if(idle){const bf=cellFx[r][i].burst;if(gameT-bf<.6){const u=(gameT-bf)/.6;a=1-u;sc=1+u*.5;}else if(bf>0&&gameT-bf>=.6)a=0;}
          if(a<=0)continue;
          ctx.save();ctx.globalAlpha=a;const cx=x+CW/2,cy=y+CH/2;ctx.translate(cx,cy);ctx.scale(sc*(idle?winScale(r,i,t):1),sc*(idle?winScale(r,i,t):1));ctx.drawImage(SPR[part],-50,-50,100,100);
          // shimmer
          ctx.globalCompositeOperation='lighter';const sh=((t*0.7+r*.13)%1.6)-.3;ctx.globalAlpha=a*.5;const cl=v=>Math.max(0,Math.min(1,v));ctx.fillStyle=lin(ctx,-50,-50,50,50,[[cl(sh-.12),'rgba(255,255,255,0)'],[cl(sh),'rgba(255,255,220,.9)'],[cl(sh+.12),'rgba(255,255,255,0)']]);ctx.fillRect(-40,-50,80,100);
          ctx.restore();continue;
        }
        let sx=1,sy=1;
        if(idle){const lt=gameT-cellFx[r][i].land;if(lt<.3){const u=lt/.3;if(s===1){const p=1+.32*Math.sin(Math.PI*u);sx=sy=p;}else{sy=1-.1*Math.sin(Math.PI*u);sx=1+.06*Math.sin(Math.PI*u);}}
          const ws=winScale(r,i,t);sx*=ws;sy*=ws;}
        const cx=x+CW/2,cy=y+CH/2;
        if(s===1){ctx.save();ctx.globalCompositeOperation='lighter';const g=.35+.25*Math.sin(t*4+r);ctx.fillStyle=rad(ctx,cx,cy,4,62,[[0,`rgba(255,200,80,${g})`],[1,'rgba(255,100,40,0)']]);ctx.fillRect(cx-62,cy-62,124,124);ctx.restore();}
        ctx.drawImage(SPR[s],cx-48*sx,cy-48*sy,96*sx,96*sy);
      }
      // dim + win frames
      if(R.phase==='idle'&&WIN){
        for(let i=0;i<H[r];i++){const key=r+','+i;const y=top+i*CH;
          if(!WIN.active.has(key)){ctx.fillStyle='rgba(12,0,24,.58)';ctx.fillRect(x,y,CW,CH);}
        }
      }
      ctx.restore();
      if(R.phase==='idle'&&WIN){
        for(let i=0;i<H[r];i++){if(!WIN.active.has(r+','+i))continue;const y=top+i*CH;const p=rrPath(x+3,y+3,CW-6,CH-6,12);
          ctx.save();ctx.shadowColor='#ffb02a';ctx.shadowBlur=18;ctx.lineWidth=5;ctx.strokeStyle='#ffd23a';ctx.stroke(p);ctx.shadowBlur=0;ctx.setLineDash([16,22]);ctx.lineDashOffset=-t*90;ctx.lineWidth=3;ctx.strokeStyle='#fffbe0';ctx.stroke(p);ctx.restore();
          if(Math.random()<.04)spark(x+Math.random()*CW,y+Math.random()*CH,'#fff3a0',1,40);}
      }
      // sticky wilds held during spin
      if(spinning&&S.inFS){for(const k of S.sticky){const [sr,si]=k.split(',').map(Number);if(sr!==r)continue;const y=top+si*CH;
        ctx.save();ctx.drawImage(SPR.wsingle,x+3,y,100,100);ctx.shadowColor='#ffd23a';ctx.shadowBlur=24;ctx.strokeStyle=`rgba(255,220,80,${.6+.4*Math.sin(t*8)})`;ctx.lineWidth=4;ctx.stroke(rrPath(x+3,y+3,CW-6,CH-6,12));ctx.restore();}}
      // sticky marker idle
      if(!spinning&&S.inFS){for(const k of S.sticky){const [sr,si]=k.split(',').map(Number);if(sr!==r)continue;const y=top+si*CH;ctx.save();ctx.strokeStyle=`rgba(120,220,255,${.5+.4*Math.sin(t*5)})`;ctx.shadowColor='#5ad0ff';ctx.shadowBlur=16;ctx.lineWidth=3;ctx.stroke(rrPath(x+4,y+4,CW-8,CH-8,12));ctx.restore();}}
      // anticipation
      if(R.antic&&(R.phase==='spin'||R.phase==='kick')){
        ctx.save();const p=rrPath(x-4,top-6,CW+8,h+12,12);ctx.globalCompositeOperation='lighter';
        ctx.shadowColor='#ff7a00';ctx.shadowBlur=40;ctx.lineWidth=8;ctx.strokeStyle=`rgba(255,${150+Math.sin(t*20)*60|0},40,1)`;ctx.stroke(p);ctx.stroke(p);
        ctx.fillStyle=lin(ctx,0,top+h,0,top,[[0,'rgba(255,90,0,.45)'],[1,'rgba(255,200,60,0)']]);ctx.fill(p);ctx.restore();
        if(Math.random()<.6)spark(x+Math.random()*CW,top+h,'#ffb02a',1,120);
      }
    }
    // gold frames
    ctx.save();
    for(let r=0;r<6;r++){const x=reelX(r),y=reelTop(r);ctx.lineWidth=1.5;ctx.strokeStyle='rgba(255,236,170,.9)';ctx.stroke(rrPath(x-3,y-3,CW+6,H[r]*CH+6,8));ctx.strokeStyle='rgba(0,0,0,.9)';ctx.lineWidth=2;ctx.stroke(rrPath(x-1,y-1,CW+2,H[r]*CH+2,7));}
    const mx=reelX(2)-8,my=reelTop(2)-12,mw=2*CW+GAP+16,mh=5*CH+24;
    ctx.shadowColor=night?'#ff5a00':'#ffb820';ctx.shadowBlur=22+10*Math.sin(t*2);ctx.lineWidth=8;ctx.strokeStyle=metal(ctx,my,my+mh);ctx.stroke(rrPath(mx,my,mw,mh,12));ctx.shadowBlur=0;ctx.lineWidth=1.5;ctx.strokeStyle='rgba(0,0,0,.8)';ctx.stroke(rrPath(mx+4,my+4,mw-8,mh-8,9));ctx.strokeStyle='rgba(255,250,220,.9)';ctx.stroke(rrPath(mx-4,my-4,mw+8,mh+8,15));
    [[mx,my],[mx+mw,my],[mx,my+mh],[mx+mw,my+mh]].forEach(([gx,gy])=>{ctx.save();ctx.translate(gx,gy);ctx.rotate(Math.PI/4);ctx.shadowColor='#ff2030';ctx.shadowBlur=12;ctx.fillStyle=lin(ctx,-8,-8,8,8,[[0,'#ffc0c0'],[.4,'#e01020'],[1,'#400004']]);ctx.fillRect(-8,-8,16,16);ctx.shadowBlur=0;ctx.strokeStyle='#fff0b0';ctx.lineWidth=2;ctx.strokeRect(-8,-8,16,16);ctx.restore();});
    ctx.restore();
    ctx.drawImage(plaque,reelX(2)-8,reelTop(2)-66,mw,mw*100/460);
  }
  function winScale(r,i,t){if(!WIN||!WIN.active.has(r+','+i))return 1;return 1+.07*Math.abs(Math.sin(t*5.5));}

  // ---------- UI helpers ----------
  const bannerText=$('bannerText'),bannerSub=$('bannerSub');
  const TICKS=['<span class="g">3600</span> ทางชนะ ทุกตำแหน่ง!','{S} 3 ตัว = <span class="g">12</span> ฟรีสปิน','{W} ค้างบนวงล้อในฟรีสปิน','เสาโทเท็ม {W} ซ้อนได้ทั้งเสา!','แตะหมุนซ้ำเพื่อหยุดเร็ว'];
  let tickI=0,tickTimer=null;const iconCache={};
  function iconURL(k){if(!iconCache[k]&&SPR[k]){const c=mk(96,96);c.getContext('2d').drawImage(SPR[k],0,0,96,96);iconCache[k]=c.toDataURL();}return iconCache[k]||'';}
  function fitBanner(max){let fs=parseFloat(getComputedStyle(bannerText).fontSize);bannerText.style.fontSize='';fs=parseFloat(getComputedStyle(bannerText).fontSize);let n=0;while(bannerText.scrollWidth>max&&fs>16&&n<20){fs-=2;bannerText.style.fontSize=fs+'px';n++;}}
  function showTick(){bannerText.className='';void bannerText.offsetWidth;bannerText.className='ticker';
    bannerText.innerHTML=TICKS[tickI%TICKS.length].replace('{W}',`<img alt="WILD" src="${iconURL('wsingle')}">`).replace('{S}',`<img alt="SCATTER" src="${iconURL(1)}">`);fitBanner(450);}
  function setTicker(){clearInterval(tickTimer);$('banner').classList.remove('win');$('bannerGlow').classList.remove('win');showTick();tickTimer=setInterval(()=>{tickI++;showTick();},3800);bannerSub.style.opacity=0;}
  function setBanner(s,cls='gold'){clearInterval(tickTimer);bannerText.style.fontSize='';bannerText.className=cls;void bannerText.offsetWidth;bannerText.classList.add('pop');bannerText.textContent=s;
    const bn=$('banner');bn.classList.add('win');$('bannerGlow').classList.add('win');for(let k=0;k<14;k++)spark(70+Math.random()*580,875+Math.random()*70,k%2?'#fff3a0':'#9ff0ff',1,140);}
  function sprinkle(parent,n,x0,y0,x1,y1,cols=['#ffe14a','#fff6c0','#ff9ad0']){for(let i=0;i<n;i++){const s=document.createElement('span');s.className='tw';
    s.style.cssText=`left:${x0+Math.random()*(x1-x0)}px;top:${y0+Math.random()*(y1-y0)}px;--s:${14+Math.random()*22}px;--c:${cols[i%cols.length]};--d:${1.4+Math.random()*1.8}s;--dl:${-Math.random()*3}s`;parent.appendChild(s);}}
  function toast(s,ms=1600){const t=$('toast');t.textContent=s;t.classList.add('on');clearTimeout(toast._t);toast._t=setTimeout(()=>t.classList.remove('on'),ms);}
  let balShown=S.balance;
  function syncUI(){
    $('vBet').textContent=fmt(bet());$('vWin').textContent=fmt(S.lastWin);$('vWin').classList.toggle('hot',S.lastWin>0);
    animateNum($('vBal'),balShown,S.balance,400);balShown=S.balance;
    const lock=S.busy||S.inFS;$('bMinus').disabled=lock||S.betIdx===0;$('bPlus').disabled=lock||S.betIdx===BETS.length-1;$('bMenu').disabled=S.busy;
    const sp=$('bSpin');sp.classList.toggle('spinning',S.spinning);$('controls').classList.toggle('spinning',S.spinning);sp.classList.toggle('auto',S.auto>0);sp.dataset.n=S.auto>0?S.auto:'';
    $('bAuto').classList.toggle('on',S.auto>0);$('bTurbo').classList.toggle('on',S.turbo);$('bTurbo').setAttribute('aria-pressed',S.turbo);
  }
  function animateNum(el,a,b,ms,onTick,pre=''){const t0=performance.now();return new Promise(res=>{function f(){const u=Math.min(1,(performance.now()-t0)/ms);const e=1-Math.pow(1-u,3);el.textContent=pre+fmt(a+(b-a)*e);onTick&&onTick(u);if(u<1)requestAnimationFrame(f);else res();}f();});}

  // ---------- spin flow ----------
  async function spin(){
    if(!alive||!S.started)return;
    if(S.spinning){slam();return;}
    if(S.busy)return;
    let out=null;
    if(host){
      if(!S.inFS&&S.balance<bet()){toast('เครดิตไม่พอ ลองลดเดิมพัน');S.auto=0;syncUI();return;}
      S.busy=true;
      try{out=await host.call('spin',{bet:bet()});}catch(e){S.busy=false;S.auto=0;syncUI();toast(e&&e.message==='insufficient_balance'?'เครดิตไม่พอ':'เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ');return;}
      if(!alive)return;
      S.busy=false;
    }
    if(!S.inFS){if(S.balance<bet()){toast('เครดิตไม่พอ ลองลดเดิมพัน');S.auto=0;syncUI();return;}S.balance-=bet();if(S.auto>0)S.auto--;}
    else{S.fsLeft--;S.fsCount++;updateFS(true);}
    S.busy=true;S.spinning=true;S.lastWin=S.inFS?S.lastWin:0;WIN=null;S.token++;
    for(const col of cellFx)for(const c of col){c.burst=-9;}
    if(!S.inFS)setTicker();
    syncUI();SFX.spin();
    const grid=out?out.grid:genGrid(S.inFS,Math.random);
    if(S.inFS&&!out)applySticky(grid,S.sticky);
    await startReels(grid);
    S.spinning=false;syncUI();
    const res=evaluate(grid,bet());
    if(res.total>0){await showWin(res);}
    else if(!S.inFS){/* keep ticker */}
    if(S.inFS){
      const st=nextSticky(grid,res);
      if(st.used.length){for(const k of st.used){const [r,i]=k.split(',').map(Number);cellFx[r][i].burst=gameT;ringAt(r,i,'#ffb02a');}SFX.burst();await sleep(650);}
      const newSticky=st.keep.filter(k=>!S.sticky.includes(k));
      S.sticky=st.keep;
      if(newSticky.length){SFX.sticky();newSticky.forEach(k=>{const [r,i]=k.split(',').map(Number);ringAt(r,i,'#5ad0ff');});await sleep(400);}
    }
    if(res.scatters.length>=3){
      await scatterCelebrate(res);
      if(!S.inFS){await enterFS(12+2*(res.scatters.length-3));}
      else{S.fsLeft+=5;updateFS(true);SFX.gong();toast('+5 FREE SPINS!',1800);await sleep(1200);}
    }
    if(out)host.round(out.wager,res.total);
    S.busy=false;syncUI();
    if(S.inFS){
      if(S.fsLeft>0){await sleep(res.total>0?350:500);spin();}
      else{await sleep(600);await endFS();continueAuto();}
    } else continueAuto();
  }
  function continueAuto(){if(S.auto>0){setTimeout(()=>{if(S.auto>0&&!S.busy)spin();},S.turbo?150:380);}}
  async function showWin(res){
    const tok=S.token;
    const all=new Set();res.wins.forEach(w=>w.cells.forEach(([r,i])=>all.add(r+','+i)));
    WIN={all,active:all,wins:res.wins};
    all.forEach(k=>{const [r,i]=k.split(',').map(Number);spark(reelX(r)+CW/2,reelTop(r)+i*CH+CH/2,'#fff3a0',5,180);});
    const ratio=res.total/bet();
    S.lastWin=S.inFS?S.lastWin+res.total:res.total;
    if(S.inFS)S.fsTotal+=res.total;
    S.balance+=res.total;
    if(ratio>=15){setBanner('WIN '+fmt(res.total));await bigWin(res.total);}
    else{
      SFX.win(ratio>=5?3:ratio>=1?1:0);
      const dur=S.turbo?(ratio<3?500:900):(ratio<1?800:ratio<3?1200:ratio<8?1700:2300);
      setBanner('WIN 0.00');
      await Promise.all([animateNum(bannerText,0,res.total,dur,null,'WIN '),winPop(res.total,ratio,dur)]);
      bannerText.textContent='WIN '+fmt(res.total);
    }
    if(S.inFS){bannerSub.textContent='รวมฟรีสปิน '+fmt(S.fsTotal);bannerSub.style.opacity=1;}
    syncUI();
    await sleep(ratio>=5?500:300);
    if(!S.inFS&&S.auto===0&&res.wins.length>1)cycleWins(tok);
  }
  async function cycleWins(tok){
    let i=0;
    while(S.token===tok&&WIN){
      const w=WIN.wins[i%WIN.wins.length];
      WIN.active=new Set(w.cells.map(([r,c])=>r+','+c));
      bannerSub.textContent=`${NAMES[w.sym]} ×${w.count} · ${w.ways} ทาง = ${fmt(w.pay)}`;bannerSub.style.opacity=1;
      await rawSleep(1500);if(S.token!==tok||!WIN)break;i++;
      if(i%WIN.wins.length===0&&S.token===tok&&WIN){WIN.active=WIN.all;bannerSub.style.opacity=0;await rawSleep(1500);}
    }
  }
  async function winPop(total,ratio,dur){
    const wp=$('winPop'),box=$('wpBox'),amt=$('wpAmt'),lab=$('wpLabel');
    const tierTxt=ratio>=8?'GREAT WIN':ratio>=3?'NICE WIN':'WIN';
    lab.textContent=tierTxt;wp.classList.toggle('big',ratio>=3);
    box.className='';box.style.transform='';void box.offsetWidth;wp.classList.add('on');box.classList.add('pop');
    const cx=360,cy=560;
    P.push({k:'r',x:cx,y:cy,rad:30,life:.7,L:.7,c:'#ffd23a'});spark(cx,cy,'#fff3a0',22+Math.min(40,ratio*6|0),420);spark(cx,cy,'#ffb02a',12,300);
    const nCoins=Math.min(60,6+Math.round(ratio*5));for(let k=0;k<nCoins;k++)setTimeout(()=>coin(cx+Math.random()*120-60,cy+40,Math.random()*900-450,-650-Math.random()*650),k*25);
    if(ratio>=3)SFX.fanfare(0);
    const t0=performance.now();let lastBeat=0,lastTick=0;
    await new Promise(res=>{(function f(){const u=Math.min(1,(performance.now()-t0)/dur);const e=1-Math.pow(1-u,3);amt.textContent=fmt(total*e);
      const n=performance.now();if(n-lastTick>65&&u<1){lastTick=n;SFX.tick();if(Math.random()<.5)SFX.coin();}
      if(n-lastBeat>260&&u<1&&u>.15){lastBeat=n;box.classList.remove('pop','beat');void box.offsetWidth;box.classList.add('beat');spark(cx+Math.random()*300-150,cy+Math.random()*80-40,'#fff3a0',3,200);}
      if(u<1)requestAnimationFrame(f);else res();})();});
    amt.textContent=fmt(total);box.classList.remove('beat');void box.offsetWidth;box.classList.add('beat');
    spark(cx,cy,'#fff3a0',30,520);P.push({k:'r',x:cx,y:cy,rad:60,life:.6,L:.6,c:'#fff3a0'});SFX.win(ratio>=3?3:1);
    await sleep(ratio>=3?950:650);
    // fly to win pill
    const pill=$('vWin').parentElement;const tx=584-360,ty=1175-560;
    box.classList.remove('beat');box.classList.add('fly');box.style.transform=`translate(${tx}px,${ty}px) scale(.18)`;wp.classList.add('out');
    await rawSleep(480);
    pill.classList.remove('bump');void pill.offsetWidth;pill.classList.add('bump');SFX.coin();SFX.pop();
    for(let k=0;k<10;k++)spark(584,1175,'#ffe14a',1,180);
    wp.classList.remove('on','out');box.className='';box.style.transform='';
  }
  let bwSkip=null;
  async function bigWin(total){
    const ov=$('bigwin'),title=$('bwTitle'),amt=$('bwAmt');
    const tiers=[[15,'BIG WIN'],[35,'MEGA WIN'],[60,'SUPER MEGA WIN']];
    const reach=tiers.filter(t=>total/bet()>=t[0]).length;
    const dur=2600+reach*1800;
    ov.classList.add('on');title.textContent='BIG WIN';title.classList.remove('punch');void title.offsetWidth;title.classList.add('punch');
    SFX.fanfare(0);AU.duck=true;
    let tier=1,skip=false,done=false;
    bwSkip=()=>{if(!done)skip=true;else close();};
    let close;const closed=new Promise(r=>close=()=>{ov.classList.remove('on');AU.duck=false;bwSkip=null;r();});
    const t0=performance.now();let lastTick=0;
    await new Promise(res=>{function f(){
      const u=skip?1:Math.min(1,(performance.now()-t0)/dur);const e=u<1?1-Math.pow(1-u,2):1;const v=total*e;
      amt.textContent=fmt(v);
      const ti=tiers.filter(t=>v/bet()>=t[0]).length;
      if(ti>tier){tier=ti;title.textContent=tiers[ti-1][1];title.classList.remove('punch');void title.offsetWidth;title.classList.add('punch');SFX.fanfare(ti);}
      if(performance.now()-lastTick>70){lastTick=performance.now();SFX.coin();}
      const rate=2+tier*2;for(let k=0;k<rate;k++)if(Math.random()<.6)coin(360+Math.random()*300-150,640,Math.random()*900-450,-900-Math.random()*700);
      if(Math.random()<.4)spark(Math.random()*720,300+Math.random()*700,'#fff3a0',1,60);
      if(u<1)requestAnimationFrame(f);else res();}f();});
    done=true;amt.textContent=fmt(total);SFX.win(3);
    if(tier>=1){const ti=tiers.filter(t=>total/bet()>=t[0]).length;if(ti!==tier){title.textContent=tiers[ti-1][1];}}
    const auto=setTimeout(()=>close(),S.auto>0||S.inFS?2200:3800);
    await closed;clearTimeout(auto);
  }
  L($('bigwin'),'pointerdown',()=>bwSkip&&bwSkip());

  async function scatterCelebrate(res){
    WIN={all:new Set(res.scatters.map(([r,i])=>r+','+i)),wins:[]};WIN.active=WIN.all;
    res.scatters.forEach(([r,i],k)=>setTimeout(()=>{ringAt(r,i,'#ff5aa0');SFX.pop();},k*160));
    setBanner(S.inFS?'+5 FREE SPINS':'Free Spins Won!');SFX.gong();
    await rawSleep(1700);
  }
  function updateFS(flip){const n=$('fsNum');n.textContent=S.fsLeft;if(flip){n.classList.remove('flip');void n.offsetWidth;n.classList.add('flip');SFX.fsCount();}}
  async function enterFS(n){
    SFX.rumble(2.2);$('stage').classList.add('shake');BG.erupt=1;
    await rawSleep(900);
    SFX.boom();const fl=$('flash');fl.style.transition='opacity .15s';fl.style.opacity=1;await rawSleep(220);
    BG.mode='night';BG.erupt=1.2;$('stage').classList.add('fs');WIN=null;setTrack('free');$('stage').classList.remove('shake');
    S.inFS=true;S.fsLeft=n;S.fsTotal=0;S.fsCount=0;S.sticky=[];S.lastWin=0;
    const intro=$('fsIntro');$('fsIntroN').textContent=n;intro.classList.add('on');
    fl.style.transition='opacity .8s';fl.style.opacity=0;
    for(let k=0;k<40;k++)setTimeout(()=>spark(360,300,['#ffb02a','#ff5a2a','#fff3a0'][k%3],2,500),k*30);
    const ld=$('fsLoad'),bs=$('bStart');ld.style.display='';bs.style.display='none';
    await new Promise(r=>{const t0=performance.now();(function f(){const u=Math.min(1,(performance.now()-t0)/1300);ld.textContent=Math.round(u*100)+'%';if(u<1)requestAnimationFrame(f);else r();})();});ld.style.display='none';bs.style.display='';
    await new Promise(r=>{const go=()=>{bs.removeEventListener('click',go);clearTimeout(tm);r();};L(bs,'click',go);const tm=setTimeout(go,S.auto>0?2500:60000);});
    SFX.click();SFX.whoosh();intro.classList.remove('on');
    $('fsPanel').classList.add('on');updateFS(false);
    setBanner('ขอให้โชคดี!');bannerSub.textContent='';
    await rawSleep(400);
  }
  async function endFS(){
    const ov=$('fsEnd');ov.classList.add('on');$('fsEndInfo').textContent=`จาก ${S.fsCount} ฟรีสปิน`;
    SFX.fanfare(2);AU.duck=true;
    await animateNum($('fsTotal'),0,S.fsTotal,Math.min(4000,1200+S.fsTotal/bet()*40),()=>{if(Math.random()<.4)SFX.coin();if(Math.random()<.5)coin(360+Math.random()*200-100,700,Math.random()*800-400,-900-Math.random()*600);});
    const b=$('bCollect');
    await new Promise(r=>{const go=()=>{b.removeEventListener('click',go);clearTimeout(tm);r();};L(b,'click',go);const tm=setTimeout(go,S.auto>0?3000:60000);});
    SFX.click();AU.duck=false;
    const fl=$('flash');fl.style.transition='opacity .15s';fl.style.opacity=1;await rawSleep(200);
    ov.classList.remove('on');BG.mode='day';$('stage').classList.remove('fs');setTrack('base');S.inFS=false;S.sticky=[];WIN=null;$('fsPanel').classList.remove('on');
    S.lastWin=S.fsTotal;fl.style.transition='opacity .8s';fl.style.opacity=0;setTicker();syncUI();
  }

  // ---------- controls ----------
  function press(fn){return e=>{e.preventDefault();if(S.started)SFX.click();fn();};}
  L($('bSpin'),'click',()=>{if(S.auto>0){S.auto=0;syncUI();toast('หยุดหมุนอัตโนมัติ');if(S.spinning)slam();return;}spin();});
  L($('bMinus'),'click',press(()=>{if(S.betIdx>0)S.betIdx--;syncUI();buildPaytable();}));
  L($('bPlus'),'click',press(()=>{if(S.betIdx<BETS.length-1)S.betIdx++;syncUI();buildPaytable();}));
  L($('bTurbo'),'click',press(()=>{S.turbo=!S.turbo;toast(S.turbo?'เทอร์โบ: เปิด':'เทอร์โบ: ปิด',900);syncUI();}));
  L($('bSound'),'click',()=>{S.muted=!S.muted;setMuted(S.muted);$('sndWave').style.display=S.muted?'none':'';$('sndX').style.display=S.muted?'':'none';if(!S.muted)SFX.click();});
  L($('bMenu'),'click',press(()=>{buildPaytable();$('info').classList.add('on');}));
  L($('bInfoClose'),'click',press(()=>$('info').classList.remove('on')));
  L($('bAuto'),'click',press(()=>{if(S.auto>0){S.auto=0;syncUI();toast('หยุดหมุนอัตโนมัติ');return;}$('autoSheet').classList.add('on');}));
  L($('bAutoClose'),'click',press(()=>$('autoSheet').classList.remove('on')));
  root.querySelectorAll('.chip').forEach(c=>L(c,'click',press(()=>{$('autoSheet').classList.remove('on');S.auto=+c.dataset.n;syncUI();spin();})));
  const onKey=e=>{if(e.code!=='Space'&&e.code!=='Enter')return;if(bwSkip){e.preventDefault();bwSkip();return;}if(S.started&&!root.querySelector('.ov.on')){e.preventDefault();spin();}};L(window,'keydown',onKey);
  function buildPaytable(){
    const g=$('ptGrid');g.innerHTML='';
    const add=(sprKey,html)=>{const d=document.createElement('div');const c=mk(168,168);c.getContext('2d').drawImage(SPR[sprKey],0,0,168,168);d.appendChild(c);const s=document.createElement('span');s.innerHTML=html;d.appendChild(s);g.appendChild(d);};
    add('wsingle','<b style="color:#ffd23a">WILD</b><br>แทนทุกสัญลักษณ์<br>ยกเว้น SCATTER');
    add(1,'<b style="color:#ff8ac0">SCATTER</b><br>3 ตัว = 12 ฟรีสปิน<br>+2 ต่อตัวที่เกิน');
    for(let s=2;s<=12;s++){add(s,[6,5,4,3].map(n=>`<i>${n}</i> ${fmt(PAY[s][n-3]*bet()*PAY_K)}`).join('<br>'));}
  }

  // ---------- loop & layout ----------
  let lastT=performance.now();
  function loop(now){
    const dt=Math.min(.05,(now-lastT)/1000);lastT=now;gameT+=dt;
    updateReels(dt);
    ctx.setTransform(q,0,0,q,0,0);
    renderBG(ctx,gameT,dt);renderReels(gameT);
    updateFX(dt);
    if(alive)rafId=requestAnimationFrame(loop);
  }
  let builtQ=0;
  function layout(){
    const wrap=$('wrap'),ww=wrap.clientWidth,wh=wrap.clientHeight;
    scaleS=Math.min(ww/720,wh/1480);
    const st=$('stage');st.style.transform=`scale(${scaleS})`;st.style.left=((ww-720*scaleS)/2)+'px';st.style.top=((wh-1480*scaleS)/2)+'px';
    q=Math.min(2,Math.max(1,(window.devicePixelRatio||1)*scaleS));q=Math.round(q*4)/4;
    if(q!==builtQ){[main,fxc].forEach(c=>{c.width=720*q;c.height=1480*q;});buildStatic(q);builtQ=q;}
  }
  const ro=new ResizeObserver(()=>layout());ro.observe($('wrap'));
  function clock(){const d=new Date();$('clock').textContent=d.toTimeString().slice(0,5);}
  const clockTimer=setInterval(clock,20000);clock();

  async function boot(){
    layout();if(!alive)return;
    const bar=$('loadBar');
    try{await Promise.race([document.fonts.ready,rawSleep(2500)]);await Promise.race([Promise.all([document.fonts.load('900 40px "Cinzel"'),document.fonts.load('700 40px "Oswald"'),document.fonts.load('700 40px "Kanit"')]),rawSleep(2500)]);}catch(e){}
    if(!alive)return;
    bar.style.width='25%';await rawSleep(60);if(!alive)return;
    buildSprites();bar.style.width='60%';await rawSleep(60);
    buildPlaque();buildStatic(q);builtQ=q;bar.style.width='85%';
    // splash art
    const sa=$('splashArt').getContext('2d');sa.save();sa.fillStyle=rad(sa,300,300,10,300,[[0,'rgba(255,220,120,.7)'],[1,'rgba(255,120,40,0)']]);sa.fillRect(0,0,600,600);
    sa.drawImage(SPR[1],330,280,220,220);drawHibiscus(sa,90,420,.9);drawPlumeria(sa,520,140,.8);sa.drawImage(SPR.wtop,190,40,220,220);sa.drawImage(SPR.wmid,190,250,220,220);sa.restore();
    bar.style.width='100%';
    const st=$('stage');sprinkle(st,4,40,850,140,975);sprinkle(st,4,580,850,690,975);sprinkle($('sign'),7,110,-10,610,110);sprinkle(st,6,250,1238,470,1420,['#fff6c0','#ff9ad0','#ffe14a']);sprinkle(st,3,30,1130,690,1150);
    if(!alive)return;rafId=requestAnimationFrame(loop);
    await rawSleep(300);if(!alive)return;$('tapStart').style.display='block';
    $('load').style.visibility='hidden';
    const go=()=>{if(S.started)return;S.started=true;auInit();SFX.gong();SFX.whoosh();const sp=$('splash');sp.style.transition='opacity .6s';sp.style.opacity=0;setTimeout(()=>sp.classList.remove('on'),600);setTicker();syncUI();
      // free spins the server still owes this member (e.g. the page was closed mid-feature)
      if(host)host.state().then(async s=>{const f=s&&s.fs;if(!alive||!f||!(f.left>0)||S.busy||S.inFS)return;const i=BETS.indexOf(f.bet);if(i>=0)S.betIdx=i;S.busy=true;await rawSleep(700);await enterFS(f.left);S.busy=false;spin();});};
    L($('splash'),'click',go);startKey=function(e){if(!S.started&&(e.code==='Space'||e.code==='Enter')){e.preventDefault();go();}};L(window,'keydown',startKey);
    syncUI();
  }
  boot();
  const syncT=host?setInterval(()=>{if(!S.busy&&!S.spinning&&!S.inFS){const b=host.getBalance();if(Math.abs(b-S.balance)>0.004){S.balance=b;syncUI();}}},400):0;

  const onVis=()=>{if(!AU.ctx)return;if(document.hidden)AU.ctx.suspend();else{AU.ctx.resume();AU.nextT=AU.ctx.currentTime+.05;}};L(document,'visibilitychange',onVis);


  return ()=>{alive=false;clearInterval(syncT);AC.abort();cancelAnimationFrame(rafId);ro.disconnect();clearInterval(clockTimer);clearInterval(tickTimer);clearTimeout(toast._t);
    window.removeEventListener('keydown',onKey);if(startKey)window.removeEventListener('keydown',startKey);document.removeEventListener('visibilitychange',onVis);
    if(AU.timer)clearInterval(AU.timer);if(AU.ctx){try{AU.ctx.close();}catch(e){}}};
}
