/**
 * ยิงปลา · Ocean Royale — React component
 * Fish-shooting arcade game (virtual coins only), rendered on a 1280×590 canvas.
 * Usage:
 *   import FishShooter from "./FishShooter";
 *   export default function App() { return <FishShooter />; }
 * The game mounts as a full-screen overlay (position: fixed) and cleans up
 * its animation loop, listeners and audio when the component unmounts.
 */
import { useEffect, useRef } from "react";
import { errText } from "./extraHost.js";

const FONT_URL = "https://fonts.googleapis.com/css2?family=Kanit:wght@400;600;700&display=swap";

const CSS = `
.ocean-royale-root{--bg:#000;--ink:#fff;--panel:#1f6fcf;--panel2:#0e3b8c;--gold:#ffc83a;--orange:#ff8a1f}
@media (prefers-color-scheme:dark){.ocean-royale-root :not([data-theme="light"]){--bg:#000;--ink:#fff}}
.ocean-royale-root [data-theme="dark"]{--bg:#000;--ink:#fff}
.ocean-royale-root #stage{z-index:1000;color:var(--ink);overscroll-behavior:none;overscroll-behavior:none;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent;font-family:'Kanit','Sarabun',system-ui,sans-serif}
.ocean-royale-root #stage{position:fixed;top:env(safe-area-inset-top,0px);bottom:env(safe-area-inset-bottom,0px);left:env(safe-area-inset-left,0px);right:env(safe-area-inset-right,0px);background:#000;overflow:hidden}
.ocean-royale-root #game{position:absolute;left:50%;top:50%;width:1280px;height:590px;margin-left:-640px;margin-top:-295px;transform-origin:50% 50%;overflow:hidden;background:#06324a}
.ocean-royale-root #cv{position:absolute;inset:0;width:1280px;height:590px;display:block}
.ocean-royale-root .ov{position:absolute;inset:0;display:none;align-items:center;justify-content:center}
.ocean-royale-root .ov.on{display:flex}
.ocean-royale-root /* ---------- Lobby ---------- */
#lobby{background:radial-gradient(ellipse at 50% 30%,#2a1a6e 0%,#10083a 60%,#06031c 100%);z-index:30;flex-direction:column;gap:10px}
.ocean-royale-root #lobby .bubbles{position:absolute;inset:0;overflow:hidden;pointer-events:none}
.ocean-royale-root #lobby .bubbles i{position:absolute;bottom:-40px;border-radius:50%;border:2px solid rgba(160,220,255,.35);background:radial-gradient(circle at 30% 30%,rgba(255,255,255,.35),rgba(255,255,255,0));animation:rise linear infinite}
@keyframes rise{to{transform:translateY(-680px)}}
.ocean-royale-root .logo{font-weight:700;font-size:64px;line-height:1;color:#ffe27a;-webkit-text-stroke:2px #7a3a00;text-shadow:0 4px 0 #a05a00,0 0 24px rgba(255,190,60,.7);letter-spacing:2px;margin-top:4px}
.ocean-royale-root .sub{font-size:16px;color:#bfe3ff;margin-bottom:2px}
.ocean-royale-root .rooms{display:flex;gap:22px;align-items:stretch}
.ocean-royale-root .room{position:relative;width:250px;height:250px;border-radius:18px;border:3px solid #6fd0ff;background:linear-gradient(#27c6ff,#2a6be0 55%,#1a2f9a);box-shadow:0 8px 26px rgba(0,0,0,.5),inset 0 0 28px rgba(255,255,255,.25);cursor:pointer;overflow:hidden;transition:transform .15s}
.ocean-royale-root .room.sel{border-color:#ffe27a;box-shadow:0 0 0 3px rgba(255,226,122,.55),0 8px 26px rgba(0,0,0,.5),inset 0 0 28px rgba(255,255,255,.3);transform:translateY(-6px)}
.ocean-royale-root .room.r2{background:linear-gradient(#ff8bd0,#b03ad8 55%,#5a1a9a);border-color:#ffb0e8}
.ocean-royale-root .room .vip{position:absolute;left:10px;top:10px;background:#6a2fb0;border:2px solid #d8b0ff;border-radius:12px;padding:0 10px;font-weight:700;font-size:13px}
.ocean-royale-root .room .big{position:absolute;left:0;right:0;top:34px;text-align:center;font-size:84px;filter:drop-shadow(0 6px 4px rgba(0,0,0,.35))}
.ocean-royale-root .room .nm{position:absolute;left:0;right:0;bottom:58px;text-align:center;font-weight:700;font-size:21px;text-shadow:0 2px 0 #0a2a6a}
.ocean-royale-root .room .ent{position:absolute;left:14px;right:14px;bottom:12px;height:36px;border-radius:18px;background:rgba(0,0,0,.45);border:2px solid rgba(255,255,255,.3);display:flex;align-items:center;justify-content:center;gap:8px;font-weight:700;font-size:19px;color:#ffe27a}
.ocean-royale-root .coin{display:inline-block;width:20px;height:20px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff7b0,#ffc83a 55%,#c77a10);border:2px solid #8a4a00;box-sizing:border-box}
.ocean-royale-root .startbtn{position:relative;margin-top:8px;min-width:240px;height:60px;border-radius:30px;border:3px solid #d8ffb0;background:linear-gradient(#8bf04a,#25b81f 60%,#0f7a14);color:#fff;font-weight:700;font-size:30px;font-family:inherit;text-shadow:0 2px 0 #0a5a0a;box-shadow:0 6px 0 #0a5a0a,0 10px 24px rgba(0,0,0,.5);cursor:pointer;animation:pulse 1.4s ease-in-out infinite}
.ocean-royale-root .startbtn:active{transform:translateY(4px);box-shadow:0 2px 0 #0a5a0a}
@keyframes pulse{50%{filter:brightness(1.15)}}
.ocean-royale-root .lobinfo{font-size:13px;color:#a9c8f0;text-align:center}
.ocean-royale-root .mini{position:absolute;top:10px;display:flex;gap:8px}
.ocean-royale-root .mini.l{left:12px}.ocean-royale-root .mini.r{right:12px}
.ocean-royale-root .pill{background:rgba(0,0,0,.45);border:2px solid #6fa8ff;border-radius:16px;padding:2px 12px;font-weight:600;font-size:15px;display:flex;align-items:center;gap:6px}
.ocean-royale-root /* ---------- Modal ---------- */
#modal{background:rgba(0,0,10,.62);z-index:40}
.ocean-royale-root .panel{position:relative;width:min(900px,92%);max-height:540px;border-radius:16px;border:4px solid #8fd3ff;background:linear-gradient(#2e8ae6,#1a5cb8);box-shadow:0 12px 40px rgba(0,0,0,.6);display:flex;flex-direction:column}
.ocean-royale-root .panel .ttl{height:46px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:24px;color:#fff;text-shadow:0 2px 0 #0a3a8a;flex:none}
.ocean-royale-root .panel .x{position:absolute;right:-14px;top:-16px;width:40px;height:40px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#ffb04a,#e8501a);border:3px solid #ffe0a0;color:#fff;font-size:22px;font-weight:700;display:flex;align-items:center;justify-content:center;cursor:pointer;font-family:inherit}
.ocean-royale-root .panel .pb{margin:0 10px 10px;border-radius:10px;background:#cfe9ff;color:#0e2a5a;padding:12px 14px;overflow:auto;flex:1;min-height:0;touch-action:pan-y}
.ocean-royale-root .panel .pb h3{margin:6px 0 4px;font-size:17px;color:#0a3a8a}
.ocean-royale-root .panel .pb p,.ocean-royale-root .panel .pb li{font-size:14px;line-height:1.5;margin:3px 0}
.ocean-royale-root .panel .pb ul{padding-left:20px;margin:4px 0}
.ocean-royale-root .tbl{width:100%;border-collapse:collapse;font-size:15px}
.ocean-royale-root .tbl td,.ocean-royale-root .tbl th{padding:6px 8px;border-bottom:1px solid #9fc8ee;text-align:left}
.ocean-royale-root .tbl tr.me td{background:#fff2b0;font-weight:700}
.ocean-royale-root .tbl td.n{text-align:right;font-variant-numeric:tabular-nums}
.ocean-royale-root .cards{display:flex;gap:14px;justify-content:center;flex-wrap:wrap}
.ocean-royale-root .card{width:230px;border-radius:12px;background:linear-gradient(#f4faff,#cfe6ff);border:3px solid #6fa8e8;padding:8px;text-align:center;color:#0a2a6a}
.ocean-royale-root .card.sel{border-color:#ff9a1f;box-shadow:0 0 0 3px rgba(255,154,31,.4)}
.ocean-royale-root .card canvas{width:100%;height:150px;background:radial-gradient(#3b6fd0,#18307a);border-radius:8px}
.ocean-royale-root .card b{display:block;margin:4px 0 2px;font-size:17px}
.ocean-royale-root .card small{display:block;color:#456;margin-bottom:6px;min-height:34px}
.ocean-royale-root .obtn{border:3px solid #ffe0a0;border-radius:18px;background:linear-gradient(#ffb12e,#e8650a);color:#fff;font-weight:700;font-size:17px;font-family:inherit;padding:4px 18px;cursor:pointer;text-shadow:0 1px 0 #a03a00}
.ocean-royale-root .obtn:disabled{filter:grayscale(.8);opacity:.7}
.ocean-royale-root .tabs{display:flex;gap:6px;margin:0 14px 8px}
.ocean-royale-root .tabs button{flex:1;border:3px solid #6fa8e8;background:#2a78d8;color:#fff;font-family:inherit;font-weight:700;font-size:16px;border-radius:10px;padding:4px;cursor:pointer}
.ocean-royale-root .tabs button.on{background:linear-gradient(#ffb12e,#e8650a);border-color:#ffe0a0}
.ocean-royale-root .shells{display:flex;gap:26px;justify-content:center;margin:16px 0}
.ocean-royale-root .shell{width:150px;height:130px;font-size:90px;display:flex;align-items:center;justify-content:center;cursor:pointer;border-radius:18px;background:linear-gradient(#fff6c8,#ffd36a);border:3px solid #d08a1a;transition:transform .2s}
.ocean-royale-root .shell:hover{transform:scale(1.06)}
.ocean-royale-root .row{display:flex;align-items:center;gap:10px;margin:8px 0}
.ocean-royale-root .row label{flex:1;font-size:16px}
.ocean-royale-root .sw{width:56px;height:30px;border-radius:15px;background:#8aa;position:relative;cursor:pointer;border:2px solid #456;flex:none}
.ocean-royale-root .sw i{position:absolute;top:2px;left:2px;width:22px;height:22px;border-radius:50%;background:#fff;transition:left .15s}
.ocean-royale-root .sw.on{background:#33c24a}.ocean-royale-root .sw.on i{left:28px}
.ocean-royale-root .pk{display:flex;gap:10px;flex:1;min-height:0}
.ocean-royale-root .pk .side{width:150px;flex:none;display:flex;flex-direction:column;gap:6px}
.ocean-royale-root .pk .side div{padding:7px 8px;border-radius:8px;background:#7a2fb0;color:#fff;font-weight:600;font-size:13px;border:2px solid #c89aff}
.ocean-royale-root .pk .side div.on{background:linear-gradient(#ffb12e,#e8650a);border-color:#ffe0a0}
.ocean-royale-root .pk .main{flex:1;border-radius:14px;background:radial-gradient(ellipse at 70% 40%,#7a3ad8,#3a1580);color:#fff;padding:12px 16px;position:relative;overflow:hidden}
.ocean-royale-root .pk .main h2{margin:0 0 6px;font-size:26px;color:#ffe27a;text-shadow:0 2px 0 #5a2a00}
.ocean-royale-root .pk .main .it{display:flex;align-items:center;gap:10px;margin:8px 0;background:rgba(0,0,0,.28);border-radius:10px;padding:6px 10px;font-size:15px}
.ocean-royale-root .pk .main .em{font-size:34px}
`;

const MARKUP = "<div id=\"stage\">\n  <div id=\"game\">\n    <canvas id=\"cv\" width=\"1280\" height=\"590\"></canvas>\n    <div id=\"lobby\" class=\"ov on\">\n      <div class=\"bubbles\" id=\"lobbub\"></div>\n      <div class=\"mini l\"><div class=\"pill\"><span class=\"coin\"></span><span id=\"lobcoins\">0</span></div></div>\n      <div class=\"mini r\"><div class=\"pill\" id=\"lobsnd\" style=\"cursor:pointer\">🔊 เสียง</div></div>\n      <div class=\"logo\">ยิงปลา</div>\n      <div class=\"sub\">OCEAN ROYALE · ป้อมเดี่ยว · เหรียญจำลองเท่านั้น</div>\n      <div class=\"rooms\">\n        <div class=\"room sel\" id=\"room0\"><div class=\"vip\">VIP 23</div><div class=\"big\">🧜‍♀️</div><div class=\"nm\">เจ้าสมุทรจิตใจ</div><div class=\"ent\"><span class=\"coin\"></span>1,000,000</div></div>\n        <div class=\"room r2\" id=\"room1\"><div class=\"vip\">VIP 24</div><div class=\"big\">🔱</div><div class=\"nm\">หอระดับเทพ</div><div class=\"ent\"><span class=\"coin\"></span>3,000,000</div></div>\n      </div>\n      <button class=\"startbtn\" id=\"startBtn\">เริ่มทันที ▶</button>\n      <div class=\"lobinfo\" id=\"lobinfo\">ห้องเจ้าสมุทรจิตใจ · เดิมพัน 100 – 3K · ปลาใหญ่จ่ายสูงสุด ×500</div>\n    </div>\n    <div id=\"modal\" class=\"ov\"></div>\n  </div>\n</div>";

/* ---------------------------------------------------------------------------
 * Game engine. Runs once per mount against the freshly injected MARKUP.
 * ALIVE.v = false stops the requestAnimationFrame loop.
 * ------------------------------------------------------------------------- */
function runGame(ALIVE, host) {
  /* WINNER 69: with a host every shot is paid from the wallet and the server decides which fish die */
  const SIDP = Math.random().toString(36).slice(2, 8); let SIDN = 0;
  let Q = { shots: [], claims: [] }, QSTAKE = 0, OUT = 0, INFLIGHT = false, CUR_CLAIM = null;
  const SHOTBET = {}; const ACTIVE_CHAINS = new Set();
  const nextSid = () => SIDP + "-" + (++SIDN);
  const chainLeft = () => { let s = 0; ACTIVE_CHAINS.forEach((c) => { s += c.left; }); return s; };
  const r2 = (n) => Math.round(n * 100) / 100;
  const requestAnimationFrame = (f) => (ALIVE.v ? window.requestAnimationFrame(f) : 0);
  /* ====================== CORE ====================== */
  const W=1280,H=590;
  const $=id=>document.getElementById(id);
  const stage=$("stage"),game=$("game"),cv=$("cv");let ctx=cv.getContext("2d");
  let VS=1,ROT=false,DPR=1,SR=null;
  function layout(){
    const r=stage.getBoundingClientRect();SR=r;
    ROT=r.height>r.width*1.05;
    const aw=ROT?r.height:r.width,ah=ROT?r.width:r.height;
    VS=Math.max(.1,Math.min(aw/W,ah/H));
    DPR=Math.min(window.devicePixelRatio||1,2.5);
    game.style.transform='rotate('+(ROT?90:0)+'deg) scale('+VS+')';
    const bw=Math.round(W*VS*DPR),bh=Math.round(H*VS*DPR);
    if(cv.width!==bw||cv.height!==bh){cv.width=bw;cv.height=bh;}
  }
  function toLogical(e){
    const r=SR||stage.getBoundingClientRect();
    const dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2);
    return ROT?{x:dy/VS+W/2,y:-dx/VS+H/2}:{x:dx/VS+W/2,y:dy/VS+H/2};
  }
  const R=(a,b)=>a+Math.random()*(b-a),RI=(a,b)=>Math.floor(R(a,b+1));
  const clamp=(v,a,b)=>v<a?a:v>b?b:v,lerp=(a,b,t)=>a+(b-a)*t;
  const pick=a=>a[Math.floor(Math.random()*a.length)];
  const fmt=n=>Math.round(n).toLocaleString('en-US');
  const fmtK=n=>{n=Math.round(n);if(n>=1e6){let s=(n/1e6).toFixed(1).replace(/\.0$/,'');return s+'M';}if(n>=1e3){let s=(n/1e3).toFixed(n>=1e5?0:1).replace(/\.0$/,'');return s+'K';}return''+n;};
  const pad2=n=>(n<10?'0':'')+n;
  const eOutBack=t=>{const c=1.70158;t=clamp(t,0,1);return 1+(c+1)*Math.pow(t-1,3)+c*Math.pow(t-1,2);};
  const eOut=t=>1-Math.pow(1-clamp(t,0,1),3);
  function rr(c,x,y,w,h,r){r=Math.min(r,w/2,h/2);c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath();}
  function lg(c,x0,y0,x1,y1,stops){const g=c.createLinearGradient(x0,y0,x1,y1);stops.forEach((s,i)=>g.addColorStop(s[0],s[1]));return g;}
  function rg(c,x,y,r0,r1,stops){const g=c.createRadialGradient(x,y,r0,x,y,r1);stops.forEach(s=>g.addColorStop(s[0],s[1]));return g;}
  /* text */
  function TX(s,x,y,o){o=o||{};const c=ctx;c.save();c.font=(o.w||600)+' '+(o.s||16)+'px Kanit,Sarabun,sans-serif';c.textAlign=o.a||'left';c.textBaseline=o.b||'middle';c.lineJoin='round';
    if(o.sh){c.shadowColor=o.sh;c.shadowBlur=o.sb||6;}
    if(o.st){c.lineWidth=o.sw||3;c.strokeStyle=o.st;c.strokeText(s,x,y);}
    c.shadowBlur=0;
    c.fillStyle=o.g?lg(c,0,y-(o.s||16)*.55,0,y+(o.s||16)*.55,o.g):(o.c||'#fff');c.fillText(s,x,y);c.restore();}
  const GOLDG=[[0,'#fffbd0'],[.45,'#ffd84a'],[1,'#e08a10']];
  /* ====================== AUDIO ====================== */
  const AU={c:null,on:true,m:null,last:{}};
  function auInit(){if(AU.c)return;try{AU.c=new(window.AudioContext||window.webkitAudioContext)();AU.m=AU.c.createGain();AU.m.gain.value=.55;AU.m.connect(AU.c.destination);}catch(e){AU.c=null;}}
  function tone(f1,f2,d,type,v,dl){if(!AU.c||!AU.on)return;const t=AU.c.currentTime+(dl||0);const o=AU.c.createOscillator(),g=AU.c.createGain();o.type=type||'sine';o.frequency.setValueAtTime(f1,t);o.frequency.exponentialRampToValueAtTime(Math.max(20,f2),t+d);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(v||.15,t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g);g.connect(AU.m);o.start(t);o.stop(t+d+.03);}
  let NB=null;
  function noise(d,v,f,dl,type){if(!AU.c||!AU.on)return;if(!NB){NB=AU.c.createBuffer(1,AU.c.sampleRate*1,AU.c.sampleRate);const a=NB.getChannelData(0);for(let i=0;i<a.length;i++)a[i]=Math.random()*2-1;}
    const t=AU.c.currentTime+(dl||0);const s=AU.c.createBufferSource();s.buffer=NB;const fl=AU.c.createBiquadFilter();fl.type=type||'lowpass';fl.frequency.value=f||1200;const g=AU.c.createGain();g.gain.setValueAtTime(v||.2,t);g.gain.exponentialRampToValueAtTime(.0001,t+d);s.connect(fl);fl.connect(g);g.connect(AU.m);s.start(t,Math.random()*.5,d+.05);}
  function sfx(n,gap){if(!AU.c||!AU.on)return;const now=performance.now();if(gap&&AU.last[n]&&now-AU.last[n]<gap)return;AU.last[n]=now;
    switch(n){
      case'shoot':tone(700,170,.11,'square',.05);noise(.05,.05,3000,0,'highpass');break;
      case'hit':noise(.07,.08,2200);break;
      case'coin':tone(1500,2000,.08,'triangle',.05);tone(2200,2700,.09,'triangle',.04,.05);break;
      case'boom':noise(.55,.32,520);tone(140,38,.45,'sine',.32);break;
      case'zap':noise(.28,.12,4500,0,'highpass');tone(1800,300,.2,'sawtooth',.04);break;
      case'big':[523,659,784,1047,1319,1568].forEach((f,i)=>tone(f,f,.3,'triangle',.11,i*.08));break;
      case'banner':tone(180,720,.55,'sawtooth',.05);noise(.5,.06,900,0,'bandpass');break;
      case'click':tone(900,650,.05,'square',.04);break;
      case'rocket':noise(.35,.08,1800,0,'bandpass');tone(300,900,.3,'sawtooth',.03);break;
      case'ice':tone(2400,900,.5,'triangle',.07);noise(.4,.05,6000,0,'highpass');break;
      case'win':[392,523,659,784,1047,784,1047,1319].forEach((f,i)=>tone(f,f,.22,'triangle',.1,i*.1));break;
    }}

  /* ====================== BACKGROUND (realistic) ====================== */
  let BG=null,FOGC=null,CAUS=null,CAUSP=null,CB=null,CBG=null;
  function caustics(c,t){
    if(S.fx<=0)return;
    if(!CB){CB=document.createElement('canvas');CB.width=640;CB.height=295;CBG=CB.getContext('2d');CAUSP=CBG.createPattern(CAUS,'repeat');}
    const g=CBG;g.setTransform(1,0,0,1,0,0);g.globalCompositeOperation='source-over';g.clearRect(0,0,640,295);g.globalCompositeOperation='lighter';g.fillStyle=CAUSP;
    const Ls=S.fx>=2?[[2.7,.26,16,9],[1.75,.2,-11,13]]:[[2.2,.3,14,10]];
    for(const L of Ls){const k=L[0]*.5,sz=256*k,ox=(((t*L[2]*.5)%sz)+sz)%sz-sz,oy=(((t*L[3]*.5)%sz)+sz)%sz-sz;g.save();g.globalAlpha=L[1];g.translate(ox,oy);g.scale(k,k);g.fillRect(0,0,(640+sz*2)/k,(295+sz*2)/k);g.restore();}
    c.save();c.globalCompositeOperation='lighter';c.drawImage(CB,0,0,W,H);c.restore();
  }
  const KELP=[];for(let i=0;i<10;i++)KELP.push({x:i<5?R(10,170):R(W-180,W-10),h:R(80,170),ph:R(0,6),c:pick(['#2f9a58','#3fb06a','#1f7a50']),w:R(7,11)});
  const BUBS=[];for(let i=0;i<34;i++)BUBS.push({x:R(0,W),y:R(0,H),r:R(1.5,5),sp:R(14,40),ph:R(0,6)});
  const AMB=[];for(let s=0;s<7;s++){const dir=Math.random()<.5?1:-1,y=R(130,H-230),x=R(0,W),z=R(.35,.7),col=pick(['#3a6a9a','#5a7aa8','#7a8ab8','#4a8aa0','#6a9ac0']),n=RI(5,9);for(let i=0;i<n;i++)AMB.push({x:x+R(-60,60),y:y+R(-30,30),dir:dir,z:z,col:col,sp:R(22,34)*z,ph:R(0,6)});}
  const SNOW=[];for(let i=0;i<90;i++)SNOW.push({x:R(0,W),y:R(0,H),z:R(.3,1),ph:R(0,6),sp:R(5,16)});
  function mkNoise(n,a){const s=document.createElement('canvas');s.width=s.height=n;const g=s.getContext('2d'),id=g.createImageData(n,n),d=id.data;for(let i=0;i<n*n;i++){const v=Math.random()*255;d[i*4]=d[i*4+1]=d[i*4+2]=v;d[i*4+3]=a;}g.putImageData(id,0,0);return s;}
  function mkCaustic(){
    const n=256,cc=document.createElement('canvas');cc.width=cc.height=n;const g=cc.getContext('2d'),id=g.createImageData(n,n),d=id.data,TP=Math.PI*2/n;
    for(let y=0;y<n;y++)for(let x=0;x<n;x++){
      const wx=x+9*Math.sin(TP*(y*2)+1.1)+5*Math.sin(TP*(y*5)+2),wy=y+9*Math.sin(TP*(x*2)+.3)+5*Math.sin(TP*(x*4)+4);
      const v=Math.sin(TP*(wx*3+wy*2))+Math.sin(TP*(wx*-2+wy*4)+1.7)+Math.sin(TP*(wx*5-wy)+3.1);
      const r=Math.pow(Math.max(0,1-Math.abs(v)/.85),2.6),i=(y*n+x)*4;
      d[i]=225;d[i+1]=255;d[i+2]=240;d[i+3]=Math.min(255,r*255);
    }
    g.putImageData(id,0,0);return cc;
  }
  function buildBG(){
    const o=document.createElement('canvas');o.width=W;o.height=H;const c=o.getContext('2d');
    /* sand relief from a height field */
    const hm=new Float32Array(W*H);
    for(let y=0;y<H;y++)for(let x=0;x<W;x++)hm[y*W+x]=Math.sin(x*.0125+Math.sin(y*.0085)*2.4)+Math.sin(x*.029-y*.016+1.3)*.42+Math.sin(y*.019+x*.006+Math.sin(x*.021)*1.6)*.62+Math.sin(x*.067+y*.043)*.13+Math.sin(x*.11-y*.09+2)*.06;
    const id=c.createImageData(W,H),d=id.data;
    const stops=[[0,60,170,225],[.2,34,128,205],[.45,26,104,180],[.66,40,118,170],[.84,112,150,160],[1,86,104,112]];
    const colAt=t=>{for(let i=1;i<stops.length;i++){if(t<=stops[i][0]){const a=stops[i-1],b=stops[i],k=(t-a[0])/(b[0]-a[0]);return[a[1]+(b[1]-a[1])*k,a[2]+(b[2]-a[2])*k,a[3]+(b[3]-a[3])*k];}}const s=stops[stops.length-1];return[s[1],s[2],s[3]];};
    for(let y=0;y<H;y++){const cc=colAt(y/H);for(let x=0;x<W;x++){
      const hx=hm[Math.min(W-1,x+1)+y*W]-hm[Math.max(0,x-1)+y*W],hy=hm[x+Math.min(H-1,y+1)*W]-hm[x+Math.max(0,y-1)*W];
      const sh=1-(hx+hy)*3.4*clamp((y/H-.35)*2.2,0,1),dx=(x-W*.5)/(W*.55),dy=(y-H*.12)/(H*.95),lit=.78+.55*Math.exp(-(dx*dx+dy*dy)*1.6),n=(Math.random()-.5)*14,i=(y*W+x)*4;
      d[i]=clamp(cc[0]*sh*lit+n,0,255);d[i+1]=clamp(cc[1]*sh*lit+n,0,255);d[i+2]=clamp(cc[2]*sh*lit+n,0,255);d[i+3]=255;
    }}
    c.putImageData(id,0,0);
    const NP=c.createPattern(mkNoise(96,90),'repeat');
    /* pebbles + starfish */
    for(let i=0;i<90;i++){const x=R(30,W-30),y=R(330,H-30),s=R(2.5,8);c.fillStyle='rgba(60,40,20,.28)';c.beginPath();c.ellipse(x+s*.5,y+s*.55,s*1.2,s*.55,0,0,7);c.fill();c.fillStyle=lg(c,0,y-s,0,y+s,[[0,pick(['#e8dcc0','#cfc0a0','#b8a888','#d8c8b0'])],[1,'#8a7a5a']]);c.beginPath();c.ellipse(x,y,s,s*.7,R(-.5,.5),0,7);c.fill();c.fillStyle='rgba(255,255,255,.38)';c.beginPath();c.ellipse(x-s*.3,y-s*.3,s*.35,s*.18,0,0,7);c.fill();}
    for(let i=0;i<4;i++){const x=R(260,W-260),y=R(380,H-90),s=R(12,18);c.save();c.translate(x,y);c.rotate(R(0,6));c.fillStyle='rgba(40,20,0,.25)';c.beginPath();c.ellipse(4,5,s*1.1,s*.9,0,0,7);c.fill();c.fillStyle=lg(c,0,-s,0,s,[[0,'#ff9a6a'],[1,'#c8401a']]);c.beginPath();for(let k=0;k<10;k++){const r=k%2?s*.42:s*1.15,a=k*Math.PI/5;c.lineTo(Math.cos(a)*r,Math.sin(a)*r);}c.closePath();c.fill();c.fillStyle='rgba(255,230,190,.75)';for(let k=0;k<5;k++){const a=k*Math.PI*2/5;for(let m=1;m<4;m++){c.beginPath();c.arc(Math.cos(a)*m*s*.28,Math.sin(a)*m*s*.28,1.4,0,7);c.fill();}}c.restore();}
    /* rocks */
    function shadowE(x,y,w){c.fillStyle=rg(c,x,y,2,w,[[0,'rgba(10,20,30,.4)'],[1,'rgba(10,20,30,0)']]);c.save();c.translate(0,y);c.scale(1,.28);c.translate(0,-y);c.beginPath();c.arc(x,y,w,0,7);c.fill();c.restore();}
    function rock(x,y,w,h,col){
      const P=()=>{c.beginPath();c.moveTo(x-w/2,y);c.bezierCurveTo(x-w*.5,y-h*.9,x-w*.1,y-h*1.15,x+w*.1,y-h);c.bezierCurveTo(x+w*.4,y-h*.9,x+w*.55,y-h*.3,x+w/2,y);c.closePath();};
      shadowE(x+18,y,w*.7);P();c.fillStyle=lg(c,x-w/2,y-h,x+w/2,y,[[0,col[0]],[1,col[1]]]);c.fill();
      c.save();P();c.clip();c.globalCompositeOperation='overlay';c.globalAlpha=.55;c.fillStyle=NP;c.fillRect(x-w,y-h*1.3,w*2,h*1.4);c.globalCompositeOperation='source-over';c.globalAlpha=1;
      c.fillStyle=lg(c,x-w*.5,y-h,x+w*.5,y,[[0,'rgba(200,240,255,.30)'],[.5,'rgba(0,0,0,0)'],[1,'rgba(0,10,20,.55)']]);c.fillRect(x-w,y-h*1.3,w*2,h*1.4);
      c.strokeStyle='rgba(0,0,0,.28)';c.lineWidth=1.5;for(let i=0;i<6;i++){c.beginPath();let px=x+R(-w*.3,w*.3),py=y-R(h*.2,h*.95);c.moveTo(px,py);for(let k=0;k<4;k++){px+=R(-14,14);py+=R(6,18);c.lineTo(px,py);}c.stroke();}
      c.fillStyle='rgba(60,150,90,.22)';for(let i=0;i<14;i++){c.beginPath();c.arc(x+R(-w*.4,w*.4),y-R(0,h*.4),R(3,9),0,7);c.fill();}
      c.restore();}
    function fan(x,y,s,col){c.save();c.translate(x,y);c.scale(s,s);c.lineCap='round';for(const pass of[[7,'rgba(0,0,0,.28)'],[3.4,col]]){c.strokeStyle=pass[1];c.lineWidth=pass[0];for(let i=0;i<9;i++){const a=-Math.PI/2+(i-4)*.2;c.beginPath();c.moveTo(0,0);c.quadraticCurveTo(Math.cos(a)*30,Math.sin(a)*40,Math.cos(a)*62,Math.sin(a)*86);c.stroke();for(let k=1;k<4;k++){const px=Math.cos(a)*62*k/4,py=Math.sin(a)*86*k/4;c.beginPath();c.moveTo(px,py);c.lineTo(px+Math.cos(a+.9)*18,py+Math.sin(a+.9)*18);c.moveTo(px,py);c.lineTo(px+Math.cos(a-.9)*18,py+Math.sin(a-.9)*18);c.stroke();}}}c.restore();}
    function brain(x,y,r,col){shadowE(x+10,y,r*1.1);c.fillStyle=rg(c,x-r*.3,y-r*.5,2,r*1.1,[[0,col[0]],[1,col[1]]]);c.beginPath();c.arc(x,y,r,Math.PI,0);c.fill();c.save();c.beginPath();c.arc(x,y,r,Math.PI,0);c.clip();c.strokeStyle='rgba(0,0,0,.24)';c.lineWidth=2.4;for(let i=0;i<9;i++){c.beginPath();c.arc(x+R(-r*.7,r*.7),y-R(0,r*.8),R(6,14),0,Math.PI*1.5);c.stroke();}c.strokeStyle='rgba(255,255,255,.22)';c.lineWidth=1.4;for(let i=0;i<7;i++){c.beginPath();c.arc(x+R(-r*.7,r*.7)-2,y-R(0,r*.8)-2,R(6,14),0,Math.PI*1.2);c.stroke();}c.restore();}
    function tube(x,y,h,col){for(let i=0;i<5;i++){const xx=x+i*11,hh=h*R(.5,1);c.fillStyle=lg(c,xx,0,xx+8,0,[[0,'rgba(255,255,255,.35)'],[.3,col],[1,'rgba(0,0,0,.4)']]);rr(c,xx,y-hh,8,hh,4);c.fill();c.fillStyle='rgba(0,0,0,.45)';c.beginPath();c.ellipse(xx+4,y-hh+1,3.5,2,0,0,7);c.fill();}}
    rock(60,H-20,220,170,['#4d6e7a','#1b2c36']);rock(190,H-10,160,100,['#5b7b82','#22363f']);rock(W-80,H-20,260,200,['#4d6e7a','#1b2c36']);rock(W-250,H-5,150,90,['#5b7b82','#22363f']);rock(W*.5,H+10,240,70,['#7a6a56','#3a2c20']);
    fan(34,H-70,1.1,'#d0408a');fan(150,H-30,.8,'#ff7a3a');fan(W-60,H-90,1.2,'#a04ad8');fan(W-190,H-34,.8,'#e0408a');fan(W*.62,H-4,.6,'#ff9a3a');
    brain(110,H-8,46,['#f0b060','#8a4a1a']);brain(W-120,H-6,52,['#80d0b0','#2a6a5a']);brain(W*.4,H+4,40,['#e07aaa','#7a2a5a']);
    tube(260,H-4,60,'#ff6aa0');tube(W-330,H-2,70,'#ffb04a');tube(20,H-120,50,'#58d0e0');tube(W-52,H-170,60,'#9a6ae0');
    function branch(x,y,len,a,wd,col,dp){if(dp<=0||len<5)return;const x2=x+Math.cos(a)*len,y2=y+Math.sin(a)*len;c.strokeStyle=OL;c.lineWidth=wd+2.4;c.lineCap='round';c.beginPath();c.moveTo(x,y);c.lineTo(x2,y2);c.stroke();c.strokeStyle=col;c.lineWidth=wd;c.beginPath();c.moveTo(x,y);c.lineTo(x2,y2);c.stroke();c.strokeStyle='rgba(255,255,255,.3)';c.lineWidth=wd*.3;c.beginPath();c.moveTo(x-wd*.2,y);c.lineTo(x2-wd*.2,y2);c.stroke();
      if(dp===1){c.fillStyle=col;c.beginPath();c.arc(x2,y2,wd*.7,0,7);c.fill();}
      branch(x2,y2,len*R(.68,.82),a-R(.25,.55),wd*.78,col,dp-1);branch(x2,y2,len*R(.68,.82),a+R(.25,.55),wd*.78,col,dp-1);}
    function anem(x,y,s,col){for(let i=0;i<14;i++){const a=-Math.PI/2+(i-6.5)*.16;c.strokeStyle=OL;c.lineWidth=5*s+2;c.lineCap='round';c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+Math.cos(a)*20*s,y+Math.sin(a)*30*s,x+Math.cos(a)*34*s+R(-4,4),y+Math.sin(a)*44*s);c.stroke();c.strokeStyle=col;c.lineWidth=5*s;c.stroke();}c.fillStyle='#7a2a5a';c.beginPath();c.ellipse(x,y,16*s,6*s,0,0,7);c.fill();}
    branch(70,H-110,46,-Math.PI/2-.2,11,'#ff7a3a',5);branch(200,H-60,34,-Math.PI/2+.15,8,'#ff9a4a',4);branch(30,H-260,30,-Math.PI/2+.3,7,'#ff6aa0',4);
    branch(W-70,H-120,48,-Math.PI/2+.2,11,'#b05aff',5);branch(W-210,H-58,32,-Math.PI/2-.2,8,'#d06aff',4);branch(W-30,H-280,30,-Math.PI/2-.3,7,'#ff7ac8',4);
    anem(300,H-30,1,'#6af0a0');anem(W-300,H-28,.9,'#ff9ad0');anem(120,H-200,.7,'#ffd06a');anem(W-120,H-210,.7,'#6ad8ff');
    BG=o;
    /* fog + vignette laid over the fish */
    const f=document.createElement('canvas');f.width=W;f.height=H;const g=f.getContext('2d');
    g.fillStyle=rg(g,W/2,H/2,H*.38,W*.64,[[0,'rgba(0,10,30,0)'],[1,'rgba(0,12,34,.62)']]);g.fillRect(0,0,W,H);
    g.fillStyle=lg(g,0,0,0,200,[[0,'rgba(0,40,100,.28)'],[1,'rgba(0,60,110,0)']]);g.fillRect(0,0,W,200);
    g.fillStyle=lg(g,0,H-90,0,H,[[0,'rgba(20,10,0,0)'],[1,'rgba(20,10,0,.28)']]);g.fillRect(0,H-90,W,90);
    FOGC=f;CAUS=mkCaustic();
  }
  function drawBG(t){
    const c=ctx;c.drawImage(BG,0,0,W,H);
    caustics(c,t);
    c.save();c.globalCompositeOperation='lighter';
    /* god rays from the surface */
    const ox=W*.52,oy=-60;
    for(let i=0;i<8;i++){const an=Math.PI/2-.62+i*.175+Math.sin(t*.2+i)*.03,wd=.045+.02*Math.sin(t*.5+i*2),L=H*1.1;const g=c.createLinearGradient(ox,oy,ox+Math.cos(an)*L,oy+Math.sin(an)*L);g.addColorStop(0,'rgba(210,250,255,'+(.2+.06*Math.sin(t*.6+i))+')');g.addColorStop(1,'rgba(210,250,255,0)');c.fillStyle=g;c.beginPath();c.moveTo(ox,oy);c.lineTo(ox+Math.cos(an-wd)*L,oy+Math.sin(an-wd)*L);c.lineTo(ox+Math.cos(an+wd)*L,oy+Math.sin(an+wd)*L);c.closePath();c.fill();}
    c.fillStyle=rg(c,ox,0,10,320,[[0,'rgba(220,255,255,.35)'],[1,'rgba(220,255,255,0)']]);c.fillRect(ox-320,0,640,320);
    c.restore();
    /* kelp */
    KELP.forEach(k=>{c.lineCap='round';for(const p of[[k.w,k.c],[k.w*.4,'rgba(200,255,200,.28)']]){c.strokeStyle=p[1];c.lineWidth=p[0];c.beginPath();c.moveTo(k.x+(p[0]<k.w?-1.5:0),H);for(let s=1;s<=7;s++){c.lineTo(k.x+Math.sin(t*1.2+k.ph+s*.7)*s*5,H-k.h*s/7);}c.stroke();}});
    /* bubbles */
    BUBS.forEach(b=>{b.y-=b.sp/60;b.x+=Math.sin(t+b.ph)*.25;if(b.y<-8){b.y=H+8;b.x=R(0,W);}const s=b.r*2.6;c.globalAlpha=.8;c.drawImage(BSPR,b.x-s,b.y-s,s*2,s*2);});c.globalAlpha=1;
    /* distant schools */
    for(const a of AMB){a.x+=a.dir*a.sp/60;if(a.dir>0&&a.x>W+40)a.x=-40;if(a.dir<0&&a.x<-40)a.x=W+40;const yy=a.y+Math.sin(t*1.5+a.ph)*4;c.save();c.translate(a.x,yy);c.scale(a.dir*a.z,a.z);c.globalAlpha=.55;c.fillStyle=a.col;c.beginPath();c.ellipse(0,0,11,4.5,0,0,7);c.fill();c.beginPath();c.moveTo(-9,0);c.lineTo(-17,-5+Math.sin(t*10+a.ph)*2);c.lineTo(-17,5+Math.sin(t*10+a.ph)*2);c.fill();c.restore();}
    c.globalAlpha=1;
    /* marine snow */
    c.fillStyle='#e8fff4';SNOW.forEach(p=>{p.y+=p.sp*p.z/60;p.x+=Math.sin(t*.7+p.ph)*.18*p.z;if(p.y>H+4){p.y=-4;p.x=R(0,W);}c.globalAlpha=.16+.22*p.z*(.6+.4*Math.sin(t*2+p.ph));c.beginPath();c.arc(p.x,p.y,.7+p.z*1.2,0,7);c.fill();});c.globalAlpha=1;
  }

  /* ====================== FISH DEFINITIONS ====================== */
  const FT={
   clown:{n:'ปลาการ์ตูน',r:2,w:46,ar:.55,sp:[55,85],kind:'gen',c1:'#ff9a2a',c2:'#e04a00',fin:'#ffb04a',st:'#fff',stn:3,school:[3,6],wt:22,cap:'s'},
   puffer:{n:'ปลาปักเป้า',r:3,w:52,ar:.95,sp:[40,65],kind:'puffer',c1:'#6adcff',c2:'#1b6fd0',school:[1,3],wt:14,cap:'s'},
   tang:{n:'ปลาทองคำ',r:4,w:58,ar:.62,sp:[60,90],kind:'gen',c1:'#ffe84a',c2:'#f0a000',fin:'#ffcf30',school:[2,4],wt:14,cap:'s'},
   angel:{n:'ปลาเทวดา',r:5,w:64,ar:.85,sp:[45,70],kind:'gen',c1:'#e09bff',c2:'#7a35d8',fin:'#ff9be0',st:'#ffeaff',stn:3,wt:12,cap:'s'},
   dolphin:{n:'โลมาน้ำเงิน',r:8,w:100,ar:.5,sp:[85,120],kind:'dolphin',wt:9,cap:'m'},
   sword:{n:'ปลาดาบ',r:12,w:150,ar:.4,sp:[100,140],kind:'sword',wt:7,cap:'m'},
   crab:{n:'ปูระเบิด',r:10,w:74,ar:.95,sp:[35,55],kind:'crab',special:'bomb',wt:6,cap:'m'},
   angler:{n:'ปลาตกเบ็ด',r:15,w:104,ar:.85,sp:[40,60],kind:'angler',wt:6,cap:'m'},
   octo:{n:'หมึกยักษ์',r:20,w:108,ar:1,sp:[35,55],kind:'octo',wt:5,cap:'m'},
   lobster:{n:'กุ้งมังกร',r:25,w:118,ar:.55,sp:[40,60],kind:'lobster',wt:4,cap:'m'},
   chest:{n:'หีบสมบัติ',r:30,w:76,ar:.8,sp:[22,34],kind:'chest',up:1,special:'chest',wt:2,cap:'m'},
   turtle:{n:'เต่าทองคำ',r:40,w:138,ar:.95,sp:[32,46],kind:'turtle',hp:26,wt:4,cap:'l'},
   koi:{n:'คาร์ฟมังกร',r:55,w:178,ar:.55,sp:[48,68],kind:'koi',hp:36,wt:3,cap:'l'},
   whale:{n:'ฉลามสายฟ้า',r:80,w:240,ar:.42,sp:[44,62],kind:'shark',hp:52,special:'zap',wt:2,cap:'l'},
   rocket:{n:'ฉลามจรวด',r:100,w:220,ar:.58,sp:[52,72],kind:'hammer',hp:64,special:'rocket',wt:1.4,cap:'l',evt:'ฉลามจรวดมาแล้ว'},
   dragon:{n:'มังกรแก้ว',r:150,w:250,ar:.42,sp:[58,78],kind:'dragon',hp:90,special:'chain',wt:.9,cap:'l',evt:'ลูกแก้วมังกรไร้ขีดจำกัดเข้ามาแล้ว'},
   queen:{n:'เจ้าสมุทร',r:300,w:210,ar:1.25,sp:[26,36],kind:'queen',up:1,hp:150,boss:1,special:'queen',hb:[.28,.4],evt:'เจ้าสมุทร มาแล้ว'},
   poseidon:{n:'โพไซดอน',r:500,w:230,ar:1.25,sp:[22,32],kind:'poseidon',up:1,hp:230,boss:1,special:'trident',hb:[.28,.4],evt:'โพไซดอน มาแล้ว'},
  };
  /* ====================== FISH ART ====================== */
  const K={};
  function bodyP(c,w,h){c.beginPath();c.moveTo(w*.5,0);c.bezierCurveTo(w*.42,-h*.55,-w*.05,-h*.62,-w*.36,-h*.1);c.lineTo(-w*.36,h*.1);c.bezierCurveTo(-w*.05,h*.62,w*.42,h*.55,w*.5,0);c.closePath();}
  function shP(c,w,h){c.beginPath();c.moveTo(w*.5,h*.06);c.bezierCurveTo(w*.38,-h*.46,w*.05,-h*.5,-w*.26,-h*.2);c.quadraticCurveTo(-w*.38,-h*.08,-w*.42,0);c.quadraticCurveTo(-w*.38,h*.08,-w*.26,h*.2);c.bezierCurveTo(w*.05,h*.5,w*.38,h*.4,w*.5,h*.06);c.closePath();}
  K.gen=(c,w,h,t,f,o)=>{
    const wag=Math.sin(t*9+f.ph)*.32,tk=o.tk||1;
    c.save();c.translate(-w*.32,0);c.rotate(wag);c.fillStyle=o.fin;c.globalAlpha=o.ta||1;c.beginPath();c.moveTo(w*.05,0);c.quadraticCurveTo(-w*.1*tk,-h*.55*tk,-w*.3*tk,-h*.66*tk);c.quadraticCurveTo(-w*.2*tk,0,-w*.3*tk,h*.66*tk);c.quadraticCurveTo(-w*.1*tk,h*.55*tk,w*.05,0);c.fill();c.restore();
    c.fillStyle=o.fin;c.beginPath();c.moveTo(w*.18,-h*.3);c.quadraticCurveTo(0,-h*.95,-w*.24,-h*.3);c.fill();
    c.beginPath();c.moveTo(w*.06,h*.3);c.quadraticCurveTo(-w*.04,h*.75,-w*.2,h*.3);c.fill();
    c.fillStyle=lg(c,0,-h/2,0,h/2,[[0,o.c1],[1,o.c2]]);bodyP(c,w,h);c.fill();
    c.save();bodyP(c,w,h);c.clip();
    if(o.st){c.fillStyle=o.st;for(let i=0;i<(o.stn||0);i++){const x=w*(.3-i*.19);c.fillRect(x,-h,w*.07,h*2);}c.fillStyle='rgba(0,0,0,.22)';for(let i=0;i<(o.stn||0);i++){const x=w*(.3-i*.19)+w*.07;c.fillRect(x,-h,w*.012,h*2);}}
    if(o.patch){c.fillStyle=o.patch;[[.1,-.15,.2,.16],[-.15,.1,.17,.14],[.28,.12,.1,.1]].forEach(p=>{c.beginPath();c.ellipse(w*p[0],h*p[1],w*p[2],h*p[3],.3,0,7);c.fill();});}
    c.fillStyle='rgba(255,255,255,.3)';c.beginPath();c.ellipse(w*.05,-h*.22,w*.3,h*.12,0,0,7);c.fill();
    c.fillStyle='rgba(0,0,0,.14)';c.beginPath();c.ellipse(0,h*.34,w*.4,h*.18,0,0,7);c.fill();
    c.restore();
    c.strokeStyle='rgba(0,0,0,.25)';c.lineWidth=1.5;c.beginPath();c.arc(w*.2,0,h*.4,Math.PI*.6,Math.PI*1.4);c.stroke();
    if(o.whisk){c.strokeStyle=o.fin;c.lineWidth=2;for(const s of[-1,1]){c.beginPath();c.moveTo(w*.46,s*h*.04);c.quadraticCurveTo(w*.62,s*h*.2+Math.sin(t*6)*5,w*.7,s*h*.5);c.stroke();}}
    eye(c,w*.3,-h*.1,Math.max(3,h*.13));
  };
  K.puffer=(c,w,h,t,f,o)=>{
    const fl=Math.sin(t*10+f.ph)*.4;
    c.fillStyle='#8be8ff';c.save();c.translate(-w*.4,0);c.rotate(fl*.5);c.beginPath();c.moveTo(w*.1,0);c.lineTo(-w*.12,-h*.28);c.lineTo(-w*.12,h*.28);c.closePath();c.fill();c.restore();
    c.fillStyle='#ffd23a';for(let i=0;i<14;i++){const a=i/14*Math.PI*2;const r1=w*.42,r2=w*.5;c.beginPath();c.moveTo(Math.cos(a-.12)*r1,Math.sin(a-.12)*h*.46);c.lineTo(Math.cos(a)*r2,Math.sin(a)*h*.55);c.lineTo(Math.cos(a+.12)*r1,Math.sin(a+.12)*h*.46);c.fill();}
    c.fillStyle=rg(c,-w*.05,-h*.15,2,w*.5,[[0,'#b0f2ff'],[.5,o.c1],[1,o.c2]]);c.beginPath();c.ellipse(0,0,w*.43,h*.47,0,0,7);c.fill();
    c.fillStyle='#fff7d0';c.beginPath();c.ellipse(w*.02,h*.2,w*.32,h*.2,0,0,7);c.fill();
    c.fillStyle='#8be8ff';c.save();c.translate(-w*.02,h*.05);c.rotate(fl);c.beginPath();c.ellipse(0,0,w*.12,h*.07,0,0,7);c.fill();c.restore();
    eye(c,w*.22,-h*.12,h*.15);c.strokeStyle='#244';c.lineWidth=2;c.beginPath();c.arc(w*.44,h*.06,h*.05,0,7);c.stroke();
  };
  function torpedoFins(c,w,h,t,f,wag,fin){
    c.save();c.translate(-w*.4,0);c.rotate(wag);c.fillStyle=fin;c.beginPath();c.moveTo(w*.06,0);c.quadraticCurveTo(-w*.04,-h*.2,-w*.1,-h*.7);c.quadraticCurveTo(-w*.02,-h*.2,-w*.1,-h*.04);c.quadraticCurveTo(-w*.02,h*.12,-w*.08,h*.38);c.quadraticCurveTo(-w*.02,h*.1,w*.06,0);c.fill();c.restore();
  }
  K.dolphin=(c,w,h,t,f,o)=>{
    const wag=Math.sin(t*7+f.ph)*.25;
    torpedoFins(c,w,h,t,f,wag,'#2a6adf');
    c.fillStyle='#2a6adf';c.beginPath();c.moveTo(w*.08,-h*.42);c.quadraticCurveTo(-w*.04,-h*.95,-w*.2,-h*.34);c.fill();
    c.fillStyle=lg(c,0,-h/2,0,h/2,[[0,'#4aa0ff'],[.6,'#2a6adf'],[1,'#d8f0ff']]);shP(c,w,h);c.fill();
    c.fillStyle='#3a86f0';c.beginPath();c.moveTo(w*.44,-h*.08);c.quadraticCurveTo(w*.62,-h*.02,w*.64,h*.06);c.quadraticCurveTo(w*.5,h*.14,w*.4,h*.08);c.fill();
    c.fillStyle='#2a6adf';c.save();c.translate(w*.1,h*.2);c.rotate(.5+Math.sin(t*6)*.2);c.beginPath();c.ellipse(0,h*.14,w*.05,h*.2,0,0,7);c.fill();c.restore();
    c.strokeStyle='rgba(255,255,255,.35)';c.lineWidth=2;c.beginPath();c.moveTo(-w*.2,-h*.05);c.quadraticCurveTo(w*.1,-h*.2,w*.38,-h*.08);c.stroke();
    eye(c,w*.3,-h*.1,h*.09);
  };
  K.sword=(c,w,h,t,f,o)=>{
    const wag=Math.sin(t*8+f.ph)*.3;
    c.save();c.translate(-w*.04,0);torpedoFins(c,w*.8,h,t,f,wag,'#6a3ad8');
    c.fillStyle='#8a4aff';c.beginPath();c.moveTo(w*.22,-h*.3);c.quadraticCurveTo(w*.0,-h*1.1,-w*.3,-h*.34);c.quadraticCurveTo(-w*.1,-h*.5,w*.22,-h*.3);c.fill();
    c.fillStyle=lg(c,0,-h/2,0,h/2,[[0,'#9a5aff'],[.55,'#5a2ad0'],[1,'#e0d0ff']]);shP(c,w*.8,h*.8);c.fill();
    c.fillStyle='#d8c8ff';c.beginPath();c.moveTo(w*.38,-h*.04);c.lineTo(w*.64,-h*.015);c.lineTo(w*.64,h*.015);c.lineTo(w*.38,h*.05);c.fill();
    c.strokeStyle='rgba(255,255,255,.3)';c.lineWidth=2;c.beginPath();c.moveTo(-w*.22,-h*.06);c.quadraticCurveTo(w*.1,-h*.2,w*.3,-h*.08);c.stroke();
    eye(c,w*.26,-h*.1,h*.1);c.restore();
  };
  K.shark=(c,w,h,t,f,o)=>{
    const wag=Math.sin(t*5+f.ph)*.22,zap=o.special==='zap';
    torpedoFins(c,w,h*1.2,t,f,wag,'#1c3f9a');
    c.fillStyle='#1c3f9a';c.beginPath();c.moveTo(w*.12,-h*.4);c.quadraticCurveTo(-w*.02,-h*1.15,-w*.22,-h*.3);c.fill();
    c.fillStyle='#244fb8';c.save();c.translate(w*.12,h*.3);c.rotate(.5+Math.sin(t*4)*.1);c.beginPath();c.moveTo(0,0);c.quadraticCurveTo(-w*.04,h*.5,-w*.14,h*.62);c.quadraticCurveTo(-w*.02,h*.2,w*.08,0);c.fill();c.restore();
    c.fillStyle=lg(c,0,-h/2,0,h/2,[[0,o.c1||'#4a8bff'],[.5,o.c2||'#1f4bd0'],[.52,'#e8f4ff'],[1,'#ffffff']]);shP(c,w,h);c.fill();
    c.strokeStyle='rgba(10,30,100,.45)';c.lineWidth=2;for(let i=0;i<4;i++){c.beginPath();c.moveTo(w*(.2-i*.035),-h*.2);c.quadraticCurveTo(w*(.2-i*.035)-4,0,w*(.2-i*.035),h*.12);c.stroke();}
    c.strokeStyle='rgba(20,30,70,.8)';c.lineWidth=2.5;c.beginPath();c.moveTo(w*.48,h*.08);c.quadraticCurveTo(w*.34,h*.24,w*.18,h*.14);c.stroke();
    c.fillStyle='#fff';for(let i=0;i<5;i++){c.beginPath();c.moveTo(w*(.43-i*.045),h*(.12+i*.015));c.lineTo(w*(.41-i*.045),h*(.2+i*.015));c.lineTo(w*(.39-i*.045),h*(.13+i*.015));c.fill();}
    eye(c,w*.34,-h*.06,h*.07);
    if(zap){c.save();c.globalCompositeOperation='lighter';c.strokeStyle='rgba(160,230,255,.9)';c.lineWidth=2;for(let k=0;k<3;k++){c.beginPath();let x=-w*.3+((t*140+k*90)%(w*.8)),y=-h*.5;c.moveTo(x,y);for(let s=0;s<5;s++){x+=R(-8,8);y+=h*.22;c.lineTo(x,y);}c.stroke();}c.restore();}
  };
  K.hammer=(c,w,h,t,f,o)=>{
    const wag=Math.sin(t*5.5+f.ph)*.24;
    torpedoFins(c,w,h*.9,t,f,wag,'#c88a10');
    c.fillStyle='#c88a10';c.beginPath();c.moveTo(w*.1,-h*.3);c.quadraticCurveTo(-w*.04,-h*.95,-w*.2,-h*.26);c.fill();
    c.fillStyle=lg(c,0,-h/2,0,h/2,[[0,'#ffd84a'],[.45,'#e8a818'],[.5,'#fff4c8'],[1,'#fffbe8']]);shP(c,w*.9,h*.62);c.fill();
    c.fillStyle=lg(c,0,-h/2,0,h/2,[[0,'#ffe27a'],[1,'#d89a10']]);rr(c,w*.3,-h*.5,w*.15,h,h*.12);c.fill();
    c.strokeStyle='rgba(120,70,0,.5)';c.lineWidth=2;c.stroke();
    eye(c,w*.39,-h*.4,h*.07);eye(c,w*.39,h*.4,h*.07);
    c.strokeStyle='rgba(60,30,0,.7)';c.lineWidth=2.5;c.beginPath();c.moveTo(w*.45,h*.08);c.quadraticCurveTo(w*.38,h*.14,w*.3,h*.1);c.stroke();
    /* rocket on back */
    c.save();c.translate(-w*.04,-h*.45);
    const fl=.8+Math.random()*.4;
    c.globalCompositeOperation='lighter';c.fillStyle='rgba(255,170,40,.9)';c.beginPath();c.moveTo(-w*.2,0);c.lineTo(-w*(.4+.12*fl),h*.03);c.lineTo(-w*.2,h*.1);c.fill();c.fillStyle='rgba(255,255,200,.95)';c.beginPath();c.moveTo(-w*.2,h*.03);c.lineTo(-w*(.31+.05*fl),h*.05);c.lineTo(-w*.2,h*.08);c.fill();c.globalCompositeOperation='source-over';
    c.fillStyle=lg(c,0,-h*.12,0,h*.16,[[0,'#ff6a5a'],[.5,'#d01818'],[1,'#7a0a0a']]);c.beginPath();c.moveTo(-w*.2,0);c.lineTo(w*.18,0);c.quadraticCurveTo(w*.34,h*.05,w*.36,h*.06);c.quadraticCurveTo(w*.34,h*.07,w*.18,h*.12);c.lineTo(-w*.2,h*.12);c.closePath();c.fill();
    c.fillStyle='#f8f8f8';c.fillRect(-w*.02,0,w*.04,h*.12);c.fillRect(w*.08,0,w*.02,h*.12);
    c.fillStyle='#8a0a0a';c.beginPath();c.moveTo(-w*.2,0);c.lineTo(-w*.26,-h*.12);c.lineTo(-w*.1,0);c.fill();c.beginPath();c.moveTo(-w*.2,h*.12);c.lineTo(-w*.26,h*.24);c.lineTo(-w*.1,h*.12);c.fill();
    c.restore();
  };
  K.crab=(c,w,h,t,f,o)=>{
    const s=Math.sin(t*10+f.ph);
    c.strokeStyle='#c01818';c.lineWidth=5;c.lineCap='round';
    for(let i=0;i<3;i++)for(const sd of[-1,1]){const bx=-w*.1+i*w*.12,by=sd*h*.3;c.beginPath();c.moveTo(bx,by);c.lineTo(bx-w*.06,by+sd*h*(.32+.06*Math.sin(t*10+i*1.3+sd)));c.lineTo(bx-w*.02,by+sd*h*.5);c.stroke();}
    for(const sd of[-1,1]){const op=.35+.25*Math.sin(t*5+sd);c.save();c.translate(w*.34,sd*h*.38);c.fillStyle=lg(c,0,-8,0,8,[[0,'#ff5a4a'],[1,'#b01010']]);c.strokeStyle='#c01818';c.lineWidth=5;c.beginPath();c.moveTo(-w*.2,-sd*h*.1);c.lineTo(0,0);c.stroke();
      c.rotate(sd*op*.4);c.beginPath();c.ellipse(w*.08,0,w*.12,h*.12,0,0,7);c.fill();c.fillStyle='#8a0a0a';c.beginPath();c.moveTo(w*.14,-h*.02);c.lineTo(w*.26,sd*-h*.1*(op*2));c.lineTo(w*.2,h*.04*sd);c.fill();c.restore();}
    c.fillStyle=rg(c,-w*.05,-h*.1,2,w*.4,[[0,'#ff7a6a'],[.6,'#e02a1a'],[1,'#900a0a']]);c.beginPath();c.ellipse(0,0,w*.3,h*.38,0,0,7);c.fill();
    c.strokeStyle='rgba(255,220,200,.35)';c.lineWidth=2;c.beginPath();c.arc(-w*.04,0,h*.25,-1.1,1.1);c.stroke();
    c.fillStyle='#ffe27a';c.beginPath();c.arc(-w*.12,0,5,0,7);c.fill();c.fillStyle='#ff9a1a';c.beginPath();c.arc(-w*.12,0,2.5,0,7);c.fill();
    eye(c,w*.26,-h*.14,5);eye(c,w*.26,h*.14,5);
  };
  K.angler=(c,w,h,t,f,o)=>{
    const wag=Math.sin(t*7+f.ph)*.3,gl=.6+.4*Math.sin(t*5);
    c.save();c.translate(-w*.36,0);c.rotate(wag);c.fillStyle='#233b8c';c.beginPath();c.moveTo(w*.08,0);c.quadraticCurveTo(-w*.1,-h*.4,-w*.2,-h*.36);c.quadraticCurveTo(-w*.12,0,-w*.2,h*.36);c.quadraticCurveTo(-w*.1,h*.4,w*.08,0);c.fill();c.restore();
    c.strokeStyle='#4a5ab8';c.lineWidth=3;c.beginPath();c.moveTo(w*.2,-h*.34);c.quadraticCurveTo(w*.34,-h*.9,w*.5,-h*.62);c.stroke();
    c.save();c.globalCompositeOperation='lighter';c.fillStyle=rg(c,w*.5,-h*.62,1,24,[[0,'rgba(255,255,180,'+gl+')'],[1,'rgba(255,200,40,0)']]);c.beginPath();c.arc(w*.5,-h*.62,24,0,7);c.fill();c.restore();
    c.fillStyle='#fff6a0';c.beginPath();c.arc(w*.5,-h*.62,5,0,7);c.fill();
    c.fillStyle=rg(c,0,-h*.2,3,w*.5,[[0,'#6a7ae8'],[.55,'#2a3aa8'],[1,'#141c5a']]);c.beginPath();c.ellipse(0,0,w*.4,h*.46,0,0,7);c.fill();
    c.fillStyle='#0a0f33';c.beginPath();c.moveTo(w*.42,-h*.05);c.quadraticCurveTo(w*.2,h*.5,-w*.05,h*.12);c.quadraticCurveTo(w*.2,-h*.1,w*.42,-h*.05);c.fill();
    c.fillStyle='#fff';for(let i=0;i<7;i++){const x=w*(.4-i*.07);c.beginPath();c.moveTo(x,-h*.02+i*1.2);c.lineTo(x-4,h*.1+i*1.2);c.lineTo(x-8,-h*.02+i*1.2);c.fill();}
    c.fillStyle='#c8d0ff';c.fillRect(0,0,0,0);
    eye(c,w*.22,-h*.18,h*.12);
    c.fillStyle='#4a5ab8';c.save();c.translate(-w*.02,h*.15);c.rotate(Math.sin(t*6)*.4);c.beginPath();c.ellipse(0,h*.1,w*.06,h*.16,0,0,7);c.fill();c.restore();
  };
  K.octo=(c,w,h,t,f,o)=>{
    const pulse=Math.sin(t*4+f.ph);
    for(let i=0;i<8;i++){const base=(i-3.5)*h*.1;c.strokeStyle=i%2?'#ff7ab8':'#ff5aa0';c.lineCap='round';let px=-w*.1,py=base;
      for(let s=0;s<10;s++){const nx=px-w*.055,ny=base*(1+s*.15)+Math.sin(t*5+i*.8+s*.6)*(3+s*1.2);c.lineWidth=Math.max(1.5,9-s*.7);c.beginPath();c.moveTo(px,py);c.lineTo(nx,ny);c.stroke();px=nx;py=ny;}}
    c.fillStyle=rg(c,w*.12,-h*.2,3,w*.5,[[0,'#ffc0e0'],[.4,'#ff6ab0'],[1,'#c0287a']]);c.beginPath();c.ellipse(w*.12,0,w*.3+pulse*2,h*.34-pulse*2,0,0,7);c.fill();
    c.fillStyle='rgba(255,255,255,.55)';[[.05,-.2],[.15,-.12],[.22,.14],[.0,.1]].forEach(p=>{c.beginPath();c.arc(w*p[0],h*p[1],3.5,0,7);c.fill();});
    eye(c,w*.32,-h*.12,h*.08);eye(c,w*.32,h*.12,h*.08);
  };
  K.lobster=(c,w,h,t,f,o)=>{
    const sw=Math.sin(t*8+f.ph);
    c.strokeStyle='#ff8a5a';c.lineWidth=2;for(const sd of[-1,1]){c.beginPath();c.moveTo(w*.34,sd*h*.05);c.quadraticCurveTo(w*.6,sd*h*.2,w*.78,sd*h*(.32+.08*sw));c.stroke();}
    for(let i=0;i<4;i++){c.fillStyle=lg(c,0,-h/3,0,h/3,[[0,'#ff7a4a'],[1,'#c01a0a']]);c.beginPath();c.ellipse(-w*.1-i*w*.075,0,w*(.1-i*.012),h*(.3-i*.04),0,0,7);c.fill();c.strokeStyle='rgba(0,0,0,.2)';c.lineWidth=1.5;c.stroke();}
    c.fillStyle='#ff5a2a';c.beginPath();c.moveTo(-w*.4,0);c.lineTo(-w*.5,-h*.34+sw*3);c.lineTo(-w*.46,0);c.lineTo(-w*.5,h*.34-sw*3);c.fill();
    c.strokeStyle='#c01a0a';c.lineWidth=3;for(let i=0;i<3;i++)for(const sd of[-1,1]){c.beginPath();c.moveTo(w*(.1-i*.08),sd*h*.2);c.lineTo(w*(.1-i*.08)-6,sd*h*(.5+.06*Math.sin(t*9+i+sd)));c.stroke();}
    for(const sd of[-1,1]){c.save();c.translate(w*.3,sd*h*.3);const op=.3+.2*Math.sin(t*4+sd);c.strokeStyle='#c01a0a';c.lineWidth=6;c.beginPath();c.moveTo(-w*.12,-sd*h*.1);c.lineTo(w*.08,sd*h*.02);c.stroke();c.fillStyle='#ff4a2a';c.beginPath();c.ellipse(w*.18,sd*h*.02,w*.12,h*.15,sd*op*.4,0,7);c.fill();c.restore();}
    c.fillStyle=lg(c,0,-h/3,0,h/3,[[0,'#ff8a5a'],[1,'#d02a1a']]);c.beginPath();c.ellipse(w*.18,0,w*.18,h*.28,0,0,7);c.fill();
    eye(c,w*.32,-h*.14,4);eye(c,w*.32,h*.14,4);
  };
  K.chest=(c,w,h,t,f,o)=>{
    const bob=Math.sin(t*3+f.ph)*2;c.translate(0,bob);
    c.save();c.globalCompositeOperation='lighter';c.fillStyle=rg(c,0,-h*.2,2,w*.9,[[0,'rgba(255,230,120,.7)'],[1,'rgba(255,200,60,0)']]);c.beginPath();c.arc(0,-h*.2,w*.9,0,7);c.fill();c.restore();
    c.fillStyle=lg(c,0,0,0,h*.5,[[0,'#a0602a'],[1,'#5a2e10']]);rr(c,-w*.4,-h*.05,w*.8,h*.5,6);c.fill();
    c.fillStyle=lg(c,0,-h*.5,0,0,[[0,'#c0803a'],[1,'#7a4018']]);c.beginPath();c.moveTo(-w*.4,-h*.05);c.quadraticCurveTo(-w*.4,-h*.5,0,-h*.5);c.quadraticCurveTo(w*.4,-h*.5,w*.4,-h*.05);c.closePath();c.fill();
    c.fillStyle='#ffd84a';c.fillRect(-w*.42,-h*.08,w*.84,h*.08);c.fillRect(-w*.1,-h*.5,w*.2,h*.95);c.fillRect(-w*.4,h*.2,w*.8,h*.05);
    c.fillStyle='#fff6a0';rr(c,-w*.06,h*.02,w*.12,h*.18,3);c.fill();c.fillStyle='#8a4a00';c.beginPath();c.arc(0,h*.1,3,0,7);c.fill();
    c.fillStyle='#ffe27a';for(let i=0;i<5;i++){c.beginPath();c.arc(-w*.3+i*w*.15,-h*.5+Math.abs(Math.sin(i*1.7))*6,4.5,0,7);c.fill();}
    const sp=(t*2+f.ph)%1;c.fillStyle='rgba(255,255,255,'+(1-sp)+')';c.beginPath();c.arc(-w*.2+sp*w*.4,-h*.4-sp*10,3+sp*3,0,7);c.fill();
  };
  K.turtle=(c,w,h,t,f,o)=>{
    const p=Math.sin(t*3.2+f.ph);
    for(const sd of[-1,1]){c.fillStyle='#5ac04a';c.save();c.translate(w*.2,sd*h*.38);c.rotate(sd*(.4+p*.35));c.beginPath();c.ellipse(w*.08,0,w*.17,h*.07,0,0,7);c.fill();c.restore();
      c.save();c.translate(-w*.22,sd*h*.34);c.rotate(sd*(.4-p*.3));c.beginPath();c.ellipse(-w*.05,0,w*.11,h*.055,0,0,7);c.fill();c.restore();}
    c.fillStyle='#4aa83a';c.beginPath();c.moveTo(-w*.4,0);c.lineTo(-w*.5,h*.04);c.lineTo(-w*.4,h*.07);c.fill();
    c.fillStyle='#6ad05a';c.beginPath();c.ellipse(w*.46,0,w*.1,h*.12,0,0,7);c.fill();eye(c,w*.5,-h*.06,4);eye(c,w*.5,h*.06,4);
    c.fillStyle=rg(c,-w*.05,-h*.15,4,w*.5,[[0,'#fff2a0'],[.4,'#ffc83a'],[1,'#a86a08']]);c.beginPath();c.ellipse(0,0,w*.38,h*.44,0,0,7);c.fill();
    c.save();c.beginPath();c.ellipse(0,0,w*.38,h*.44,0,0,7);c.clip();c.strokeStyle='rgba(120,60,0,.5)';c.lineWidth=2;
    for(let i=-5;i<=5;i++){c.beginPath();c.moveTo(i*w*.12-h*.5,-h*.5);c.lineTo(i*w*.12+h*.5,h*.5);c.stroke();c.beginPath();c.moveTo(i*w*.12+h*.5,-h*.5);c.lineTo(i*w*.12-h*.5,h*.5);c.stroke();}
    c.fillStyle='rgba(255,255,255,.35)';c.beginPath();c.ellipse(-w*.1,-h*.2,w*.2,h*.1,-.3,0,7);c.fill();c.restore();
    c.strokeStyle='#8a4a00';c.lineWidth=3;c.beginPath();c.ellipse(0,0,w*.38,h*.44,0,0,7);c.stroke();
  };
  K.koi=(c,w,h,t,f,o)=>{
    const op={c1:'#ff5a2a',c2:'#c01808',fin:'#ff8a4a',patch:'#fff4e0',tk:1.6,ta:.8,whisk:1};
    const fl=Math.sin(t*6+f.ph)*.5;
    c.save();c.globalAlpha=.75;c.fillStyle='#ff9a5a';c.save();c.translate(w*.12,h*.3);c.rotate(.6+fl*.4);c.beginPath();c.moveTo(0,0);c.quadraticCurveTo(-w*.16,h*.5,-w*.3,h*.6);c.quadraticCurveTo(-w*.1,h*.2,w*.04,0);c.fill();c.restore();
    c.save();c.translate(w*.12,-h*.3);c.rotate(-.6-fl*.4);c.beginPath();c.moveTo(0,0);c.quadraticCurveTo(-w*.16,-h*.5,-w*.3,-h*.6);c.quadraticCurveTo(-w*.1,-h*.2,w*.04,0);c.fill();c.restore();c.restore();
    K.gen(c,w,h,t,f,op);
    c.save();c.globalCompositeOperation='lighter';c.fillStyle='rgba(255,230,120,.25)';c.beginPath();c.arc(0,0,w*.45,0,7);c.fill();c.restore();
  };
  K.dragon=(c,w,h,t,f,o)=>{
    const n=18,seg=w*.045,pts=[];
    for(let i=0;i<n;i++){const k=i/n;pts.push({x:w*.32-i*seg*1.15,y:Math.sin(t*4.5-i*.55+f.ph)*h*.5*(0.35+k*.65)});}
    c.lineCap='round';c.lineJoin='round';
    for(let i=n-1;i>=1;i--){const k=1-i/n,rw=h*(.1+.34*k*k+.04),p=pts[i];c.fillStyle=lg(c,0,p.y-rw,0,p.y+rw,[[0,'#3af088'],[.6,'#0a9a50'],[1,'#ffe27a']]);c.beginPath();c.ellipse(p.x,p.y,seg*.9,rw,0,0,7);c.fill();c.strokeStyle='rgba(0,70,30,.45)';c.lineWidth=1.5;c.stroke();
      if(i%3===0){c.fillStyle='#ffd84a';c.beginPath();c.moveTo(p.x,p.y-rw);c.lineTo(p.x-seg*.5,p.y-rw-8);c.lineTo(p.x-seg*.9,p.y-rw);c.fill();}}
    const hd=pts[0];c.save();c.translate(hd.x+w*.1,hd.y);
    c.fillStyle='#ffd84a';c.beginPath();c.moveTo(-w*.02,-h*.28);c.lineTo(-w*.14,-h*.6);c.lineTo(w*.02,-h*.34);c.fill();c.beginPath();c.moveTo(w*.03,-h*.28);c.lineTo(-w*.04,-h*.66);c.lineTo(w*.08,-h*.32);c.fill();
    c.strokeStyle='#ffe27a';c.lineWidth=3;for(const sd of[-1,1]){c.beginPath();c.moveTo(w*.12,sd*h*.1);c.quadraticCurveTo(w*.22,sd*h*(.5+.1*Math.sin(t*5)),w*.04,sd*h*.75);c.stroke();}
    c.fillStyle=lg(c,0,-h*.3,0,h*.3,[[0,'#3af088'],[1,'#0a9a50']]);c.beginPath();c.moveTo(-w*.1,-h*.28);c.quadraticCurveTo(w*.14,-h*.34,w*.2,-h*.08);c.quadraticCurveTo(w*.22,0,w*.16,h*.04);c.quadraticCurveTo(w*.22,h*.16,w*.1,h*.2);c.quadraticCurveTo(-w*.02,h*.3,-w*.1,h*.28);c.closePath();c.fill();
    c.fillStyle='#fff';c.beginPath();c.moveTo(w*.18,h*.02);c.lineTo(w*.14,h*.12);c.lineTo(w*.11,h*.03);c.fill();
    c.fillStyle='#ff3a2a';c.beginPath();c.arc(w*.05,-h*.12,h*.07,0,7);c.fill();c.fillStyle='#fff';c.beginPath();c.arc(w*.06,-h*.13,h*.025,0,7);c.fill();
    c.restore();
    const px=hd.x+w*.38,py=hd.y,pr=h*.5;c.save();c.globalCompositeOperation='lighter';c.fillStyle=rg(c,px,py,2,pr*2,[[0,'rgba(255,255,255,.9)'],[.3,'rgba(120,255,230,.55)'],[1,'rgba(60,200,255,0)']]);c.beginPath();c.arc(px,py,pr*2,0,7);c.fill();c.restore();
    c.fillStyle=rg(c,px-pr*.25,py-pr*.3,1,pr,[[0,'#fff'],[.5,'#9ff0ff'],[1,'#2aa8d8']]);c.beginPath();c.arc(px,py,pr,0,7);c.fill();c.strokeStyle='#ffe27a';c.lineWidth=2;c.stroke();
  };
  /* ---- humanoid bosses (upright) ---- */
  function aura(c,r,col,t){c.save();c.globalCompositeOperation='lighter';const a=.45+.15*Math.sin(t*3);c.fillStyle=rg(c,0,0,r*.2,r,[[0,col.replace('A',a)],[1,col.replace('A','0')]]);c.beginPath();c.arc(0,0,r,0,7);c.fill();c.restore();}
  K.queen=(c,w,h,t,f,o)=>{
    const sw=Math.sin(t*2.2+f.ph);
    aura(c,w*.85,'rgba(80,200,255,A)',t);
    /* wings */
    for(const sd of[-1,1]){c.save();c.scale(sd,1);c.translate(w*.1,-h*.12);c.rotate(-.1+sw*.05);
      c.fillStyle=lg(c,0,-h*.3,w*.5,h*.2,[[0,'rgba(60,140,255,.95)'],[1,'rgba(20,50,170,.85)']]);c.beginPath();c.moveTo(0,0);c.quadraticCurveTo(w*.35,-h*.5,w*.5,-h*.38);c.quadraticCurveTo(w*.42,-h*.2,w*.5,-h*.05);c.quadraticCurveTo(w*.34,-h*.04,w*.4,h*.14);c.quadraticCurveTo(w*.2,h*.05,0,h*.08);c.closePath();c.fill();
      c.strokeStyle='rgba(200,235,255,.8)';c.lineWidth=2;for(let i=0;i<4;i++){c.beginPath();c.moveTo(0,0);c.lineTo(w*.5-i*w*.03,-h*.38+i*h*.14);c.stroke();}c.restore();}
    /* tail */
    c.save();c.translate(0,h*.1);const tw=Math.sin(t*3+f.ph);
    c.fillStyle=lg(c,0,0,0,h*.4,[[0,'#1fb0e0'],[1,'#2a40c8']]);c.beginPath();c.moveTo(-w*.14,0);c.quadraticCurveTo(-w*.2+tw*8,h*.2,-w*.06+tw*14,h*.36);c.lineTo(-w*.22+tw*18,h*.46);c.quadraticCurveTo(w*.0+tw*20,h*.42,w*.02+tw*18,h*.48);c.lineTo(w*.2+tw*14,h*.44);c.quadraticCurveTo(w*.06+tw*14,h*.34,w*.2+tw*8,h*.2);c.quadraticCurveTo(w*.18,0,w*.14,0);c.closePath();c.fill();
    c.strokeStyle='rgba(180,240,255,.5)';c.lineWidth=1.5;for(let i=0;i<5;i++){c.beginPath();c.arc(0,h*.08+i*h*.06,w*.1,0.3,Math.PI-.3);c.stroke();}c.restore();
    /* hair back */
    c.fillStyle='#1a2a9a';c.beginPath();c.moveTo(-w*.12,-h*.34);c.quadraticCurveTo(-w*.34,-h*.1+sw*6,-w*.22,h*.18);c.quadraticCurveTo(-w*.12,h*.02,0,h*.02);c.quadraticCurveTo(w*.12,h*.02,w*.22,h*.18);c.quadraticCurveTo(w*.34,-h*.1-sw*6,w*.12,-h*.34);c.fill();
    /* torso + armor */
    c.fillStyle=lg(c,0,-h*.2,0,h*.12,[[0,'#ffd8c0'],[1,'#f0b090']]);c.beginPath();c.moveTo(-w*.1,-h*.24);c.quadraticCurveTo(-w*.12,-h*.05,-w*.08,h*.1);c.lineTo(w*.08,h*.1);c.quadraticCurveTo(w*.12,-h*.05,w*.1,-h*.24);c.closePath();c.fill();
    c.fillStyle=lg(c,0,-h*.12,0,0,[[0,'#ffe27a'],[1,'#d8901a']]);c.beginPath();c.ellipse(-w*.05,-h*.1,w*.06,h*.04,.3,0,7);c.ellipse(w*.05,-h*.1,w*.06,h*.04,-.3,0,7);c.fill();c.fillRect(-w*.09,h*.06,w*.18,h*.04);
    /* arms */
    c.strokeStyle='#f0b090';c.lineWidth=h*.035;c.lineCap='round';c.beginPath();c.moveTo(-w*.1,-h*.2);c.quadraticCurveTo(-w*.22,-h*.08,-w*.28,-h*.2+sw*6);c.moveTo(w*.1,-h*.2);c.quadraticCurveTo(w*.22,-h*.08,w*.28,-h*.2-sw*6);c.stroke();
    c.save();c.globalCompositeOperation='lighter';c.fillStyle=rg(c,w*.3,-h*.22-sw*6,1,w*.14,[[0,'rgba(200,255,255,.95)'],[1,'rgba(80,200,255,0)']]);c.beginPath();c.arc(w*.3,-h*.22-sw*6,w*.14,0,7);c.fill();c.restore();
    /* head */
    c.fillStyle='#ffe0c8';c.beginPath();c.ellipse(0,-h*.33,w*.085,h*.075,0,0,7);c.fill();
    c.fillStyle='#1a2a9a';c.beginPath();c.moveTo(-w*.1,-h*.33);c.quadraticCurveTo(0,-h*.5,w*.1,-h*.33);c.quadraticCurveTo(w*.04,-h*.4,0,-h*.38);c.quadraticCurveTo(-w*.04,-h*.4,-w*.1,-h*.33);c.fill();
    c.fillStyle='#2a1a5a';c.beginPath();c.ellipse(-w*.03,-h*.33,2.5,3.5,0,0,7);c.ellipse(w*.03,-h*.33,2.5,3.5,0,0,7);c.fill();c.strokeStyle='#d03a5a';c.lineWidth=2;c.beginPath();c.arc(0,-h*.3,w*.02,.2,Math.PI-.2);c.stroke();
    c.fillStyle='#ffd84a';c.beginPath();c.moveTo(-w*.08,-h*.4);for(let i=0;i<5;i++){c.lineTo(-w*.08+i*w*.04,-h*.4-(i%2?0:h*.06));c.lineTo(-w*.08+i*w*.04+w*.02,-h*.4-(i%2?h*.06:0));}c.lineTo(w*.08,-h*.4);c.closePath();c.fill();
    c.fillStyle='#5af0ff';c.beginPath();c.arc(0,-h*.43,3.5,0,7);c.fill();
  };
  K.poseidon=(c,w,h,t,f,o)=>{
    const sw=Math.sin(t*2+f.ph);
    aura(c,w*.85,'rgba(255,215,90,A)',t);
    /* cape */
    c.fillStyle=lg(c,0,-h*.3,0,h*.45,[[0,'#2a6aff'],[1,'#0a1a7a']]);c.beginPath();c.moveTo(-w*.14,-h*.26);c.quadraticCurveTo(-w*.4,h*.1+sw*8,-w*.3,h*.46);c.lineTo(w*.3,h*.46);c.quadraticCurveTo(w*.4,h*.1-sw*8,w*.14,-h*.26);c.closePath();c.fill();
    /* legs/robe */
    c.fillStyle=lg(c,0,0,0,h*.46,[[0,'#ffffff'],[1,'#b8d0f0']]);c.beginPath();c.moveTo(-w*.13,h*.02);c.quadraticCurveTo(-w*.2,h*.25,-w*.22+sw*6,h*.46);c.lineTo(-w*.04,h*.4);c.lineTo(0,h*.46);c.lineTo(w*.04,h*.4);c.lineTo(w*.22+sw*6,h*.46);c.quadraticCurveTo(w*.2,h*.25,w*.13,h*.02);c.closePath();c.fill();
    /* torso */
    c.fillStyle=lg(c,0,-h*.26,0,h*.04,[[0,'#e8b080'],[1,'#c88a58']]);c.beginPath();c.moveTo(-w*.17,-h*.24);c.quadraticCurveTo(-w*.15,-h*.05,-w*.1,h*.04);c.lineTo(w*.1,h*.04);c.quadraticCurveTo(w*.15,-h*.05,w*.17,-h*.24);c.quadraticCurveTo(0,-h*.3,-w*.17,-h*.24);c.fill();
    c.strokeStyle='rgba(120,60,20,.5)';c.lineWidth=2;c.beginPath();c.moveTo(0,-h*.22);c.lineTo(0,0);c.moveTo(-w*.1,-h*.12);c.quadraticCurveTo(-w*.04,-h*.08,0,-h*.1);c.moveTo(w*.1,-h*.12);c.quadraticCurveTo(w*.04,-h*.08,0,-h*.1);c.stroke();
    c.fillStyle=lg(c,0,0,0,h*.06,[[0,'#ffe27a'],[1,'#c8801a']]);c.fillRect(-w*.12,h*.0,w*.24,h*.05);
    c.fillStyle='#ffd84a';c.beginPath();c.ellipse(-w*.18,-h*.24,w*.07,h*.04,.3,0,7);c.ellipse(w*.18,-h*.24,w*.07,h*.04,-.3,0,7);c.fill();
    /* arms + trident */
    c.strokeStyle='#d89c68';c.lineWidth=h*.045;c.lineCap='round';c.beginPath();c.moveTo(-w*.17,-h*.22);c.quadraticCurveTo(-w*.3,-h*.1,-w*.26,-h*.28+sw*5);c.moveTo(w*.17,-h*.22);c.quadraticCurveTo(w*.3,-h*.05,w*.3,-h*.12);c.stroke();
    c.save();c.translate(w*.3,-h*.12);c.rotate(.12+sw*.03);c.strokeStyle='#e8a818';c.lineWidth=4;c.beginPath();c.moveTo(0,h*.5);c.lineTo(0,-h*.46);c.stroke();
    c.strokeStyle='#ffe27a';c.lineWidth=4;c.beginPath();c.moveTo(-w*.07,-h*.36);c.quadraticCurveTo(-w*.07,-h*.5,-w*.07,-h*.56);c.moveTo(-w*.07,-h*.36);c.quadraticCurveTo(0,-h*.3,w*.07,-h*.36);c.moveTo(w*.07,-h*.36);c.lineTo(w*.07,-h*.56);c.moveTo(0,-h*.34);c.lineTo(0,-h*.6);c.stroke();
    c.save();c.globalCompositeOperation='lighter';c.fillStyle=rg(c,0,-h*.5,1,w*.2,[[0,'rgba(180,240,255,.9)'],[1,'rgba(80,200,255,0)']]);c.beginPath();c.arc(0,-h*.5,w*.2,0,7);c.fill();c.restore();c.restore();
    /* head */
    c.fillStyle='#f0f4ff';c.beginPath();c.moveTo(-w*.1,-h*.36);c.quadraticCurveTo(-w*.2,-h*.2+sw*4,-w*.12,-h*.1);c.quadraticCurveTo(0,0,w*.12,-h*.1);c.quadraticCurveTo(w*.2,-h*.2-sw*4,w*.1,-h*.36);c.closePath();c.fill();
    c.fillStyle='#e0a878';c.beginPath();c.ellipse(0,-h*.32,w*.075,h*.07,0,0,7);c.fill();
    c.fillStyle='#fff';c.beginPath();c.moveTo(-w*.07,-h*.3);c.quadraticCurveTo(0,-h*.12,w*.07,-h*.3);c.quadraticCurveTo(0,-h*.24,-w*.07,-h*.3);c.fill();
    c.fillStyle='#fff';c.beginPath();c.moveTo(-w*.09,-h*.36);c.quadraticCurveTo(0,-h*.46,w*.09,-h*.36);c.quadraticCurveTo(0,-h*.4,-w*.09,-h*.36);c.fill();
    c.fillStyle='#2a1a1a';c.beginPath();c.ellipse(-w*.03,-h*.33,2.5,2,0,0,7);c.ellipse(w*.03,-h*.33,2.5,2,0,0,7);c.fill();
    c.fillStyle='#ffd84a';c.beginPath();c.moveTo(-w*.08,-h*.38);for(let i=0;i<4;i++){c.lineTo(-w*.08+i*w*.0533,-h*.38-h*.07);c.lineTo(-w*.08+i*w*.0533+w*.0266,-h*.38);}c.lineTo(w*.08,-h*.38);c.closePath();c.fill();
  };
  /* ====================== FISH OBJECT ====================== */
  const MULTS=[2,2,3,3,3,4,4,5,7,10];
  const MCOL={2:['#5ac8ff','#1a5acf'],3:['#7af070','#1a9a2a'],4:['#d8f050','#6a9a10'],5:['#ffb04a','#e04a10'],7:['#c88aff','#6a2ad0'],10:['#5ad0ff','#2a50e0']};
  let FID=1;
  function makeFish(key,x,y,ang,o){
    o=o||{};const d=FT[key];
    const f={id:FID++,t:key,d:d,x:x,y:y,ang:ang,sp:R(d.sp[0],d.sp[1]),w:d.w*(o.sc||1)*R(.94,1.06),ph:R(0,6.28),tf:R(.4,1.2),turn:R(.1,.35),
      hp:d.hp||1,maxhp:d.hp||1,hits:0,flash:0,frozen:0,dead:false,dt:0,mult:0,age:0,boss:!!d.boss,spin:0,vy:0,sw:R(0,6.28),panic:0,fleeA:0};
    f.h=f.w*d.ar;
    if(!d.boss&&d.r>=3&&Math.random()<.16)f.mult=pick(MULTS);
    return f;
  }
  function fishRX(f){return f.w*(f.d.hb?f.d.hb[0]:.42);}
  function fishRY(f){return f.h*(f.d.hb?f.d.hb[1]:.4);}
  function hitFishAt(f,px,py,pad){
    let dx=px-f.x,dy=py-f.y;
    if(!f.d.up){const ca=Math.cos(f.ang),sa=Math.sin(f.ang);const lx=dx*ca+dy*sa,ly=-dx*sa+dy*ca;dx=lx;dy=ly;}
    const rx=fishRX(f)+pad,ry=fishRY(f)+pad;return (dx*dx)/(rx*rx)+(dy*dy)/(ry*ry)<=1;
  }
  function h2(f){return f.h*.5;}
  function drawFishOverlay(f,t){
    const c=ctx;if(f.dead)return;
    /* hp bar for big fish when damaged */
    if(f.maxhp>1&&f.hp<f.maxhp&&f.showHp>0){
      const bw=Math.max(60,f.w*.55),bx=f.x-bw/2,by=f.y-f.h*(f.d.up?.52:.58)-12;
      c.save();c.globalAlpha=Math.min(1,f.showHp);rr(c,bx-2,by-2,bw+4,10,5);c.fillStyle='rgba(0,0,0,.65)';c.fill();
      const p=clamp(f.hp/f.maxhp,0,1);rr(c,bx,by,Math.max(4,bw*p),6,3);c.fillStyle=lg(c,0,by,0,by+6,[[0,p>.4?'#8aff6a':'#ff7a5a'],[1,p>.4?'#1aa02a':'#c01010']]);c.fill();c.restore();
    }
    /* multiplier badge */
    if(f.mult>1){
      const a=t*1.6+f.ph,bx=f.x+Math.cos(a)*fishRX(f)*.55,by=f.y-fishRY(f)*.7+Math.sin(a*1.3)*6-6,col=MCOL[f.mult]||MCOL[3];
      c.save();c.translate(bx,by);c.fillStyle=rg(c,-4,-5,1,17,[[0,col[0]],[1,col[1]]]);c.beginPath();c.arc(0,0,15,0,7);c.fill();c.lineWidth=2.5;c.strokeStyle='rgba(255,255,255,.9)';c.stroke();c.strokeStyle='rgba(255,255,255,.4)';c.beginPath();c.arc(0,0,18+Math.sin(t*4)*1.5,0,7);c.stroke();
      TX('x'+f.mult,0,1,{s:15,w:700,a:'center',st:'rgba(0,40,0,.8)',sw:3});c.restore();
    }
  }

  /* ====================== FISH RENDERING (shaded sprites + body wave) ====================== */
  function eye(c,x,y,r){
    c.fillStyle='rgba(0,0,0,.3)';c.beginPath();c.arc(x,y,r*1.14,0,7);c.fill();
    c.fillStyle=rg(c,x-r*.25,y-r*.3,r*.1,r*1.05,[[0,'#fffdf0'],[1,'#cfc6a4']]);c.beginPath();c.arc(x,y,r,0,7);c.fill();
    const ix=x+r*.16;
    c.fillStyle=rg(c,ix,y,r*.1,r*.8,[[0,'#ffe27a'],[.65,'#d28a20'],[1,'#4a2208']]);c.beginPath();c.arc(ix,y,r*.78,0,7);c.fill();
    c.fillStyle='#080808';c.beginPath();c.arc(ix+r*.05,y,r*.4,0,7);c.fill();
    c.fillStyle='rgba(255,255,255,.95)';c.beginPath();c.arc(x+r*.4,y-r*.36,r*.2,0,7);c.fill();
    c.fillStyle='rgba(255,255,255,.55)';c.beginPath();c.arc(x-r*.12,y+r*.34,r*.1,0,7);c.fill();
  }
  const SS=1.6,SPR={};
  const WARPK={gen:1,puffer:1,dolphin:1,sword:1,shark:1,hammer:1,angler:1,koi:1};
  const SCALEK={gen:1,koi:1};
  function shadeAtop(g,cx,cy,hh,qw,RW,RH){RW=RW||g.canvas.width;RH=RH||g.canvas.height;
    /* light from above: highlight on the back, shade on the belly, soft specular patch */
    g.save();g.setTransform(1,0,0,1,0,0);g.globalCompositeOperation='source-atop';
    const gr=g.createLinearGradient(0,cy-hh,0,cy+hh);
    gr.addColorStop(0,'rgba(255,255,255,.36)');gr.addColorStop(.3,'rgba(255,255,255,.07)');gr.addColorStop(.55,'rgba(0,20,60,0)');gr.addColorStop(1,'rgba(0,15,50,.46)');
    g.fillStyle=gr;g.fillRect(0,0,RW,RH);
    g.save();g.translate(cx+qw*.14,cy-hh*.42);g.scale(1,.38);
    const sg=g.createRadialGradient(0,0,0,0,0,qw*.34);sg.addColorStop(0,'rgba(255,255,255,.5)');sg.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=sg;g.fillRect(-qw,-qw,qw*2,qw*2);g.restore();
    g.restore();
  }
  function getSprite(f){
    const d=f.d,qw=Math.max(8,Math.round(f.w/4)*4),key=f.t+'|'+qw;let s=SPR[key];if(s)return s;
    const h=qw*d.ar,mx0=-qw*.8,mx1=qw*.9,my=h*1.3;
    const cw=Math.ceil((mx1-mx0)*SS),ch=Math.ceil(my*2*SS);
    const cvs=document.createElement('canvas');cvs.width=cw;cvs.height=ch;const g=cvs.getContext('2d');
    const ox=-mx0*SS,oy=my*SS;g.setTransform(SS,0,0,SS,ox,oy);
    const od=d.special==='zap'?Object.assign({},d,{special:null}):d;
    K[d.kind](g,qw,h,0,{ph:0},od);
    shadeAtop(g,ox,oy,h*.58*SS,qw*SS);
    if(SCALEK[d.kind]){
      const ts=Math.max(5,Math.round(qw*.1*SS)),tc=document.createElement('canvas');tc.width=ts*2;tc.height=ts*2;const tg=tc.getContext('2d');
      tg.strokeStyle='rgba(255,255,255,.5)';tg.lineWidth=Math.max(.8,ts*.1);
      for(let r=0;r<2;r++)for(let q=-1;q<3;q++){tg.beginPath();tg.arc(q*ts+(r?ts/2:0),r*ts,ts*.55,0,Math.PI);tg.stroke();}
      tg.strokeStyle='rgba(0,0,0,.18)';for(let r=0;r<2;r++)for(let q=-1;q<3;q++){tg.beginPath();tg.arc(q*ts+(r?ts/2:0),r*ts+1,ts*.55,.2,Math.PI-.2);tg.stroke();}
      g.save();g.setTransform(1,0,0,1,0,0);g.globalCompositeOperation='source-atop';
      g.beginPath();g.ellipse(ox+qw*.07*SS,oy,qw*.4*SS,h*.44*SS,0,0,7);g.clip();g.globalAlpha=.55;g.fillStyle=g.createPattern(tc,'repeat');g.fillRect(0,0,cw,ch);g.restore();
    }
    s={cv:cvs,ox:ox,oy:oy,qw:qw,cw:cw,ch:ch,n:Math.max(8,Math.min(16,Math.round(cw/(SS*8))))};SPR[key]=s;return s;
  }
  function drawWarp(c,f){
    const s=getSprite(f),sc=f.w/s.qw,N=s.n,sw0=s.cw/N,k=f.d.kind,amp=f.h*((k==='dolphin'||k==='shark'||k==='hammer')?.12:.17),ph=f.sw;
    c.rotate(Math.sin(ph-1)*.04);
    for(let i=0;i<N;i++){
      const sx=Math.floor(i*sw0),sw1=Math.ceil((i+1)*sw0)-sx,xl=((sx+sw1/2)-s.ox)/SS/s.qw,p=clamp((xl+.45)/.95,0,1);
      const off=Math.sin(ph-p*3.6)*amp*(.1+.9*Math.pow(1-p,1.35));
      c.drawImage(s.cv,sx,0,sw1,s.ch,(sx-s.ox)/SS*sc,-s.oy/SS*sc+off,sw1/SS*sc+.7,s.ch/SS*sc);
    }
  }
  let TMPC=null,TMPG=null;
  function drawLive(c,f,tm){
    const d=f.d,w=f.w,h=f.h,TS=w>190?1:clamp(VS*DPR,1,1.5);
    const bw=Math.min(800,Math.ceil(w*2.4)),bh=Math.min(760,Math.ceil(Math.max(h*2.8,w*.9))),pw=Math.ceil(bw*TS),ph=Math.ceil(bh*TS);
    if(!TMPC){TMPC=document.createElement('canvas');TMPG=TMPC.getContext('2d');}
    if(TMPC.width<pw||TMPC.height<ph){TMPC.width=Math.max(TMPC.width,pw);TMPC.height=Math.max(TMPC.height,ph);}
    const g=TMPG;g.setTransform(1,0,0,1,0,0);g.globalCompositeOperation='source-over';g.globalAlpha=1;g.clearRect(0,0,pw,ph);
    g.setTransform(TS,0,0,TS,pw/2,ph/2);
    K[d.kind](g,w,h,tm,f,d);
    g.setTransform(1,0,0,1,0,0);
    shadeAtop(g,pw/2,ph/2,h*.55*TS,w*TS,pw,ph);
    c.drawImage(TMPC,0,0,pw,ph,-bw/2,-bh/2,pw/TS,ph/TS);
  }
  function drawFish(f,t){
    const c=ctx,d=f.d;
    let al=1,sx=0,rollY=1,rotE=0,fl=0,k=0;
    if(f.dead){k=clamp(f.dt/.95,0,1);al=k<.5?1:clamp(1-(k-.5)/.5,0,1);rollY=1-1.9*eOut(clamp((k-.12)/.38,0,1));if(k<.2)sx=Math.sin(f.dt*90)*3;fl=k<.28&&Math.sin(f.dt*60)>0?1:0;rotE=f.spin*.06*k;}
    c.save();c.translate(f.x+sx,f.y);
    const flipX=Math.cos(f.ang)<0;
    if(d.up){if(flipX)c.scale(-1,1);}else{c.rotate(f.ang);if(flipX)c.scale(1,-1);}
    c.rotate(rotE);
    if(f.dead){if(d.up){const s2=1+.12*Math.sin(k*3.1);c.scale(s2,s2);}else c.scale(1,rollY);}
    c.globalAlpha=al;
    const tm=f.frozen>0?f.frzT:t;
    if(WARPK[d.kind]){drawWarp(c,f);
      if(d.special==='zap'&&!f.dead){c.save();c.globalCompositeOperation='lighter';c.strokeStyle='rgba(170,235,255,.9)';c.lineWidth=2;for(let q=0;q<3;q++){c.beginPath();let x=-f.w*.3+((t*140+q*90)%(f.w*.8)),y=-f.h*.5;c.moveTo(x,y);for(let s=0;s<5;s++){x+=Math.sin(t*37+s*5+q)*9;y+=f.h*.22;c.lineTo(x,y);}c.stroke();}c.restore();}}
    else drawLive(c,f,tm);
    if(f.frozen>0){const rx=fishRX(f),ry=fishRY(f);c.save();c.globalAlpha=.5*al;c.fillStyle=rg(c,-rx*.2,-ry*.3,2,rx*1.3,[[0,'rgba(240,252,255,.9)'],[1,'rgba(130,210,255,.7)']]);c.beginPath();c.ellipse(0,0,rx*1.15,ry*1.15,0,0,7);c.fill();c.strokeStyle='#fff';c.lineWidth=2;c.stroke();c.globalAlpha=.9*al;c.fillStyle='#e8faff';for(let i=0;i<6;i++){const a=i*1.05;c.beginPath();c.moveTo(Math.cos(a)*rx*.9,Math.sin(a)*ry*.9);c.lineTo(Math.cos(a+.15)*rx*1.25,Math.sin(a+.15)*ry*1.25);c.lineTo(Math.cos(a+.3)*rx*.9,Math.sin(a+.3)*ry*.9);c.fill();}c.restore();}
    if(f.flash>0||fl){c.save();c.globalCompositeOperation='lighter';c.globalAlpha=clamp(fl?.7:f.flash*5,0,.8)*al;c.fillStyle='#fff';c.beginPath();c.ellipse(0,0,fishRX(f)*1.05,fishRY(f)*1.05,0,0,7);c.fill();c.restore();}
    c.restore();
  }
  /* soft contact shadows on the sea floor */
  const SHD=(function(){const s=document.createElement('canvas');s.width=s.height=64;const g=s.getContext('2d');g.fillStyle=rg(g,32,32,0,32,[[0,'rgba(0,10,20,.7)'],[.6,'rgba(0,10,20,.28)'],[1,'rgba(0,10,20,0)']]);g.fillRect(0,0,64,64);return s;})();
  function drawShadows(){
    const c=ctx;
    for(const f of S.fish){
      if(f.gone||f.x<-200||f.x>W+200)continue;
      const a=f.dead?clamp(1-f.dt/.9,0,1):1;
      c.save();c.globalAlpha=.34*a;c.translate(f.x+f.w*.12+14,f.y+34+f.h*.3);
      if(!f.d.up)c.rotate(Math.cos(f.ang)<0?f.ang+Math.PI:f.ang);
      c.scale(f.w*.52/32*(f.d.up?.8:1),(f.d.up?f.w*.2:f.h*.3)/32);c.drawImage(SHD,-32,-32);c.restore();
    }
  }

  /* ====================== GAME STATE ====================== */
  const BETS=[100,200,300,500,1000,2000,3000,5000,9000,10000];
  const ROOMS=[{n:'เจ้าสมุทรจิตใจ',lo:0,hi:6,min:1000000,bonus:500000,info:'ห้องเจ้าสมุทรจิตใจ · เดิมพัน 100 – 3K · ปลาใหญ่จ่ายสูงสุด ×500'},
               {n:'หอระดับเทพ',lo:3,hi:9,min:3000000,bonus:1500000,info:'หอระดับเทพ · เดิมพัน 500 – 10K · รางวัลแข่งคะแนนสูงกว่า'}];
  if(host){BETS.splice(0,BETS.length,1,2,3,5,10,20,30,50,90,100);ROOMS.forEach(r=>{r.min=0;r.bonus=0;});
    ROOMS[0].info='ห้องเจ้าสมุทรจิตใจ · เดิมพัน 1 – 30 B ต่อนัด · ปลาใหญ่จ่ายสูงสุด ×500';
    ROOMS[1].info='หอระดับเทพ · เดิมพัน 5 – 100 B ต่อนัด · ปลาใหญ่จ่ายสูงสุด ×500';}
  const SKINS=[
   {n:'Plasma Shooter',th:'ปืนพลาสม่า',fx:'plasma',cool:.3,blast:1,L:96,off:0,desc:'ยิงลูกพลังงานพลาสม่า ระเบิดเป็นประกายไฟฟ้า',req:0},
   {n:'Gatling Gun',th:'ปืนกลแกตลิ่ง',fx:'fire',cool:.19,blast:.85,L:98,off:0,desc:'ลำกล้องหมุน ยิงรัวเร็ว รัศมีระเบิดเล็ก',req:30},
   {n:'Heavy Cannons',th:'ปืนใหญ่คู่',fx:'fire',cool:.36,blast:1.18,L:104,off:11,desc:'ลำกล้องคู่ กระสุนหนัก ระเบิดกว้าง',req:80},
   {n:'Rocket Launcher',th:'เครื่องยิงจรวด',fx:'fire',cool:.42,blast:1.32,L:104,off:15,desc:'จรวดคู่ ทิ้งควันยาว ระเบิดใหญ่ที่สุด',req:150}];
  const WINGS=[null,['#5ac8ff','#1a5acf'],['#ffe27a','#d8801a'],['#ff7ac8','#a02aa8']];
  const WNAME=['ไม่มีปีก','ปีกน้ำแข็ง','ปีกทองคำ','ปีกกุหลาบ'];
  const NAMES=['Royal_13825707','SAMKUNG77','CC★Cancle★','Labแมนยู','สายฟ้าอ่าวทะเล','Royal_13190908','Royal_9208411','นักล่าทะเลลึก','ปลาตัวใหญ่99','มังกรทอง888'];
  const SAVEKEY='oceanroyale_save_v1';
  function newSeat(me,x,name,lv,coins){return {me:me,x:x,y:H-30,ang:0,rec:0,cool:0,name:name,lv:lv,coins:coins,disp:coins,tw:[],twd:0,score:0,bet:me?5:5,skin:me?0:1,wing:me?0:2,pulse:0,tgt:null,shots:0};}
  const S={mode:'lobby',t:0,room:0,fish:[],bullets:[],nets:[],parts:[],cfx:[],txt:[],bolts:[],rockets:[],expl:[],rings:[],timers:[],
    shake:0,flash:0,flashCol:'255,255,255',slow:0,spawnT:0,bossT:28,bossIdx:0,evtT:40,x2:false,lockOn:false,lockT:null,
    tp:0,tdots:0,atom:0,freezeT:0,tokens:18,mq:{q:[],cur:null,x:0,w:0},toast:null,log:[],bands:[],band:null,winB:null,
    ct:{ph:'pre',t:6,you:0,bot:0},skillCd:[0,0],skillN:[5,5],skillRegen:0,freeCd:0,luckyCd:0,pkgDone:false,panelOpen:true,sideOpen:true,
    q:1,quality:1,sinceSave:0,youTag:9,pkgT:6638,jp:0,pillar:0,kills:0,lastBossKill:0};
  let you=null,bot=null;
  const JP=[{v:336203987,c:'o'},{v:25788933,c:'g'},{v:62175800,c:'b'}];
  function save(){try{localStorage.setItem(SAVEKEY,JSON.stringify({coins:Math.round(you?you.coins:S.saveCoins||14597886),skin:S.skin|0,wing:S.wing|0,room:S.room|0}));}catch(e){}}
  function load(){let d=null;try{d=JSON.parse(localStorage.getItem(SAVEKEY)||'null');}catch(e){}return d;}
  function later(sec,fn){S.timers.push({t:sec,fn:fn});}
  function tier(bet){let i=BETS.indexOf(bet);return i<0?0:i;}
  function toast(s){S.toast={s:s,t:0};}
  function PT(o){if(S.parts.length>(S.quality?700:260))return;S.parts.push(Object.assign({x:0,y:0,vx:0,vy:0,life:1,sz:3,col:'#fff',g:0,drag:0,ty:'spark',rot:0,vr:0},o,{max:o.life}));}
  function burst(x,y,col,n,spd,o){o=o||{};n=Math.round(n*(S.quality?1:.5));for(let i=0;i<n;i++){const a=R(0,6.28),v=R(.25,1)*spd;PT({x:x,y:y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:R(.35,.9),sz:R(1.5,4.5),col:pick(col),g:o.g||0,drag:2.2,ty:o.ty||'spark'});}}
  function bubblesAt(x,y,n){for(let i=0;i<n;i++)PT({x:x+R(-20,20),y:y+R(-12,12),vx:R(-30,30),vy:R(-90,-30),life:R(.6,1.3),sz:R(2,6),ty:'bubble',col:'#fff'});}
  function addBolt(x1,y1,x2,y2,col,w){const d=Math.hypot(x2-x1,y2-y1),n=Math.max(3,Math.ceil(d/22)),pts=[{x:x1,y:y1}],nx=-(y2-y1)/d,ny=(x2-x1)/d;for(let i=1;i<n;i++){const k=i/n,o=R(-16,16);pts.push({x:lerp(x1,x2,k)+nx*o,y:lerp(y1,y2,k)+ny*o});}pts.push({x:x2,y:y2});S.bolts.push({pts:pts,life:.32,max:.32,col:col||'190,235,255',w:w||2.6});}
  function shake(a){S.shake=Math.max(S.shake,a);}
  function flash(col,a){S.flash=Math.max(S.flash,a);S.flashCol=col||'255,255,255';}
  /* ---------- marquee ---------- */
  function pushMQ(pre,txt){S.mq.q.push({pre:pre,txt:txt});if(S.mq.q.length>6)S.mq.q.shift();}
  function fakeMQ(){const nm=pick(NAMES),fk=pick(['ฉลามยักษ์','เต่าทองคำ','มังกรแก้ว','เจ้าสมุทร','ฉลามจรวด','โพไซดอน']),amt=RI(8,360)*10000;
    pushMQ(pick(['[ยิงปลา4คน คลาสสิก]','[เกมยิงปลาบันเทิง]','[Royal Game]']),'ยินดีด้วย '+nm+' ยิงโดน '+fk+' ได้รับ '+fmt(amt)+' เหรียญ!');}
  /* ====================== SPAWN ====================== */
  const CAPS={s:18,m:8,l:3};
  function countCap(cap){let n=0;for(const f of S.fish)if(!f.dead&&!f.gone&&f.d.cap===cap)n++;return n;}
  function spawnTick(dt){
    S.spawnT-=dt;if(S.spawnT>0)return;S.spawnT=R(.28,.65);
    const keys=Object.keys(FT).filter(k=>!FT[k].boss&&countCap(FT[k].cap)<CAPS[FT[k].cap]);if(!keys.length)return;
    let tot=0;keys.forEach(k=>tot+=FT[k].wt);let r=Math.random()*tot,key=keys[0];for(const k of keys){r-=FT[k].wt;if(r<=0){key=k;break;}}
    spawnAt(key);
  }
  function spawnAt(key,o){
    o=o||{};const d=FT[key],left=o.left!==undefined?o.left:Math.random()<.5;
    const n=d.school?RI(d.school[0],d.school[1]):1;let y0=R(125,H-140);
    const ang0=(left?0:Math.PI)+R(-.22,.22);let sp0=0,lead=null;
    for(let i=0;i<n;i++){
      const x=left?-d.w*.7-i*R(36,64):W+d.w*.7+i*R(36,64);
      const f=makeFish(key,x,clamp(y0+R(-55,55),115,H-125),ang0+R(-.07,.07));
      if(i===0){sp0=f.sp;lead=f;}else{f.sp=sp0*R(.94,1.06);f.ph=lead.ph;f.tf=lead.tf;f.turn=lead.turn;}
      if(d.boss){f.y=H*.5-10;f.ang=left?0:Math.PI;f.turn=0;}
      S.fish.push(f);
    }
    if(d.evt&&!o.silent)addBand({title:d.evt,scheme:key==='dragon'?'red':key==='rocket'?'fire':'blue',icon:key});
  }
  function spawnBoss(){
    const key=S.bossIdx++%2===0?'queen':'poseidon';
    if(S.fish.some(f=>!f.dead&&!f.gone&&f.boss))return;
    spawnAt(key);sfx('banner');
  }
  /* ====================== UPDATE FISH ====================== */
  function updFish(f,dt){
    f.age+=dt;
    if(f.dead){f.dt+=dt;const k=f.dt;f.x+=Math.cos(f.ang)*f.sp*.18*Math.max(0,1-k)*dt;f.y+=(k>.3?34:-10)*dt;
      if(Math.random()<dt*14&&f.dt<.8)PT({x:f.x+R(-f.w*.2,f.w*.2),y:f.y+R(-f.h*.2,f.h*.2),vx:R(-10,10),vy:R(-70,-30),life:R(.5,1),sz:R(1.5,3.5),ty:'bubble',col:'#fff'});
      if(f.dt>.95)f.gone=true;return;}
    if(f.flash>0)f.flash-=dt;if(f.showHp>0)f.showHp-=dt;
    if(f.frozen>0){f.frozen-=dt;return;}
    const d=f.d;let v=f.sp;
    if(f.panic>0){f.panic-=dt;if(!f.boss){let da=f.fleeA-f.ang;while(da>Math.PI)da-=6.283;while(da<-Math.PI)da+=6.283;f.ang+=clamp(da,-4*dt,4*dt);}v*=1+Math.min(1,f.panic)*.9;}
    f.sw+=dt*(5.2+v/15);
    v*=.88+.24*Math.max(0,Math.sin(f.sw));
    if(!f.boss){
      f.ang+=Math.sin(S.t*f.tf+f.ph)*f.turn*dt;
      const cs=Math.cos(f.ang)>0?1:-1;
      if(f.y<110&&Math.sin(f.ang)<.25)f.ang+=cs*2.4*dt;
      if(f.y>H-115&&Math.sin(f.ang)>-.25)f.ang-=cs*2.4*dt;
    }else{f.y+=Math.sin(S.t*.7+f.ph)*14*dt;}
    if(d.kind==='octo')v*=.35+1.1*Math.max(0,Math.sin(S.t*2.2+f.ph));
    if(d.kind==='sword'&&Math.sin(S.t*.8+f.ph)>.9)v*=1.8;
    f.x+=Math.cos(f.ang)*v*dt;f.y+=Math.sin(f.ang)*v*dt;
    if(f.age>3&&(f.x<-f.w*1.3||f.x>W+f.w*1.3||f.y<-120||f.y>H+120)){f.gone=true;if(f.boss)S.bossT=R(22,34);}
  }
  /* ====================== SHOOTING ====================== */
  function aimAngle(seat,px,py){return clamp(Math.atan2(px-seat.x,-(py-seat.y+8)),-1.38,1.38);}
  function fireBullet(seat,ang,bet,o){
    o=o||{};const L=66,mx=seat.x+Math.sin(ang)*L,my=seat.y-Math.cos(ang)*L,sp=(seat.me&&S.x2)?1100:(o.torp?900:820);
    S.bullets.push({x:mx,y:my,vx:Math.sin(ang)*sp,vy:-Math.cos(ang)*sp,r:o.torp?12:7,owner:seat,bet:bet,net:58+tier(bet)*6.5,bn:0,trail:[],skin:seat.skin,lock:o.lock||null,torp:!!o.torp});
    seat.rec=1;seat.shots++;
    burst(mx,my,['#fff','#bfe9ff','#ffe9a0'],4,120);
  }
  function playerShoot(){
    const bet=curBet();
    if(you.coins<bet){toast('เหรียญไม่พอ! กด "เติมเหรียญทันที"');return false;}
    you.coins-=bet;you.score;
    let ang=you.ang,lock=null;
    if(S.lockOn){const t=S.lockT;if(t&&!t.dead&&!t.gone&&t.x>10&&t.x<W-10){ang=aimAngle(you,t.x+Math.cos(t.ang)*t.sp*.35,t.y+Math.sin(t.ang)*t.sp*.35);you.ang=ang;lock={f:t};}}
    fireBullet(you,ang,bet,{lock:lock});sfx('shoot',40);
    return true;
  }
  function openClaim(b){CUR_CLAIM=(host&&b.sid&&b.owner&&b.owner.me)?{b:b.sid,fish:[]}:null;}
  function closeClaim(){if(CUR_CLAIM&&CUR_CLAIM.fish.length)Q.claims.push(CUR_CLAIM);CUR_CLAIM=null;}
  function updBullets(dt){
    for(const b of S.bullets){
      if(b.lock&&b.lock.f&&!b.lock.f.dead&&!b.lock.f.gone){
        const tg=b.lock.f,a=Math.atan2(tg.y-b.y,tg.x-b.x),ca=Math.atan2(b.vy,b.vx);let da=a-ca;while(da>Math.PI)da-=6.283;while(da<-Math.PI)da+=6.283;
        const na=ca+clamp(da,-5*dt,5*dt),sp=Math.hypot(b.vx,b.vy);b.vx=Math.cos(na)*sp;b.vy=Math.sin(na)*sp;}
      b.x+=b.vx*dt;b.y+=b.vy*dt;b.trail.push({x:b.x,y:b.y});if(b.trail.length>9)b.trail.shift();if(Math.random()<.3)PT({x:b.x,y:b.y,vx:R(-8,8),vy:R(-40,-15),life:R(.5,.9),sz:R(1.2,2.8),ty:'bubble',col:'#fff'});
      if(b.torp&&Math.random()<.9)PT({x:b.x-b.vx*.02,y:b.y-b.vy*.02,vx:R(-20,20),vy:R(-20,20),life:.5,sz:R(4,8),col:'rgba(255,255,255,.5)',ty:'smoke',drag:1});
      if(b.x<-30||b.x>W+30||b.y<-30){b.dead=true;continue;}
      if(b.y>H+30||b.bn>3){b.dead=true;if(b.torp){openClaim(b);explode(b.x,b.y,130,b.owner,b.bet,10);closeClaim();}continue;}
      for(const f of S.fish){
        if(f.dead||f.gone||f.x<-20||f.x>W+20)continue;
        if(hitFishAt(f,b.x,b.y,b.r)){b.dead=true;openClaim(b);if(b.torp)explode(b.x,b.y,140,b.owner,b.bet,10);else netAt(b.x,b.y,b.net,b.owner,b.bet,1);closeClaim();break;}
      }
    }
    S.bullets=S.bullets.filter(b=>!b.dead);
  }
  function netAt(x,y,r,owner,bet,dmg){
    S.nets.push({x:x,y:y,r:r,t:0,life:.8,rot:R(0,6.28),own:owner});
    burst(x,y,['#fff','#bfe9ff'],6,140);bubblesAt(x,y,3);S.rings.push({x:x,y:y,t:0,max:.9,r:r*1.15,col:'255,255,255',soft:1});
    for(const f of S.fish){if(f.dead||f.gone||f.boss)continue;if(Math.hypot(f.x-x,f.y-y)<r*2.4){f.panic=1.0;f.fleeA=Math.atan2(f.y-y,f.x-x);}}
    if(owner.me)sfx('hit',35);
    const tg=[];for(const f of S.fish){if(f.dead||f.gone)continue;const rr0=Math.max(fishRX(f),fishRY(f))*.7;if(Math.hypot(f.x-x,f.y-y)<r+rr0)tg.push(f);}
    for(const f of tg)hitFish(f,owner,bet,dmg,false);
  }
  function hitFish(f,owner,bet,dmg,force,depth){
    if(f.dead)return;
    if(host&&owner.me){
      f.hits++;f.flash=.14;f.showHp=2.6;if(f.maxhp>1)f.hp=Math.max(1,f.hp-dmg);
      if(CUR_CLAIM){if(CUR_CLAIM.fish.length<8&&!CUR_CLAIM.fish.some(x=>x.id===f.id))CUR_CLAIM.fish.push({id:f.id,t:f.t,m:f.mult>1?f.mult:1});}
      else if(owner.chain&&!f.boss){const rw=r2(f.d.r*bet*(f.mult>1?f.mult:1));if(rw<=owner.chain.left+1e-9){owner.chain.left=r2(owner.chain.left-rw);killFish(f,owner,bet,depth,rw,0);}}
      burst(f.x,f.y,['#fff','#ffe9a0'],2,100);return;
    }f.hits++;f.flash=.14;f.showHp=2.6;
    let dm=dmg;const crit=Math.random()<.16;if(crit)dm*=2;
    if(f.maxhp>1){f.hp-=dm;if(f.hp<=0)killFish(f,owner,bet,depth);else if(crit&&owner.me)floatTxt(f.x,f.y-f.h*.3,'CRIT',{s:18,col:['#fff','#ff9a3a'],life:.7});}
    else{const p=force?.92:Math.min(.95,(1.15/f.d.r)*(1+f.hits*.08)*(crit?1.6:1));if(Math.random()<p)killFish(f,owner,bet,depth);}
    burst(f.x,f.y,['#fff','#ffe9a0'],2,100);
  }
  /* ====================== KILL / REWARD ====================== */
  function floatTxt(x,y,s,o){o=o||{};S.txt.push({x:clamp(x,40,W-40),y:y,s:s,sz:o.s||22,col:o.col||['#fffbd0','#ffc83a'],life:o.life||1.3,max:o.life||1.3,vy:o.vy||-48,pop:o.pop||0,ghost:o.ghost||0,a:o.a||1});}
  function mkChain(amount){const c={left:amount};ACTIVE_CHAINS.add(c);
    later(4,()=>{if(!ACTIVE_CHAINS.has(c))return;ACTIVE_CHAINS.delete(c);if(c.left>0.004){you.coins+=c.left;floatTxt(you.x,H-170,'+'+fmt(c.left),{s:30,pop:1});c.left=0;}});
    return Object.assign(Object.create(you),{chain:c});}
  function killFish(f,owner,bet,depth,forcedReward,chainAmt){
    if(f.dead)return;depth=depth||0;
    f.dead=true;f.dt=0;f.spin=R(-5,5);
    const d=f.d,mult=f.mult>1?f.mult:1,reward=forcedReward!=null?forcedReward:Math.round(d.r*bet*mult),m=reward/bet;
    if(owner.me)you.coins+=reward;else owner.coins+=reward;owner.tw.push({t:S.t,v:reward});
    if(!host&&S.ct.ph==='run'){if(owner.me)S.ct.you+=reward;else S.ct.bot+=reward;}
    if(owner.me)S.kills++;if(owner.me&&!host){if(d.r>=5){S.tp++;if(S.tp>=8){S.tp=0;S.tdots++;sfx('click');if(S.tdots>=5){S.tdots=0;later(.6,()=>tridentEvent(owner,bet));}}}}
    /* particles */
    const cols=d.kind==='gen'?[d.c1,d.c2,'#fff']:['#ffe27a','#fff','#9fe8ff','#ff9a5a'];
    burst(f.x,f.y,cols,clamp(10+m*.5,10,46),260+Math.min(260,m*3),{g:240});
    burst(f.x,f.y,['#fff7b0','#ffd84a'],clamp(6+m*.3,6,26),320,{ty:'star'});
    bubblesAt(f.x,f.y,clamp(4+m*.2,4,16));
    /* coins */
    const nc=clamp(Math.round(2+Math.log2(m+1)*2.3),3,26);
    for(let i=0;i<nc;i++)S.cfx.push({x:f.x+R(-18,18),y:f.y+R(-14,14),vx:R(-190,190),vy:R(-300,-80),t:0,st:0,owner:owner,delay:i*.015,spin:R(0,6),sx:0,sy:0,val:reward/nc});
    /* text */
    const own=owner.me;
    floatTxt(f.x,f.y-f.h*.1,'+'+fmt(reward),{s:clamp(22+Math.log2(m+1)*4.5,22,64)*(own?1:.78),pop:1,life:own?1.6:1.2,a:own?1:.7});
    if(f.mult>1)floatTxt(f.x+30,f.y-f.h*.3,'x'+f.mult,{s:24,col:['#d8ffd0','#3ad84a'],life:1.1});
    if(m>=12&&own)S.txt.push({x:W/2,y:96,s:'+'+fmt(reward),sz:58,col:['#ffffff','#d8e4ff'],life:1.8,max:1.8,vy:-8,ghost:1,a:.38,pop:0});
    if(m>=15){S.rings.push({x:f.x,y:f.y,t:0,max:.7,r:clamp(60+m,80,260),col:'255,226,120'});}
    if(m>=25)shake(clamp(m/10,5,18));
    if(m>=100)flash('255,240,200',.35);
    if(d.boss||m>=150){S.slow=.55;}
    sfx('coin',30);if(m>=15)sfx('boom');
    /* log + marquee */
    if(m>=20||d.r>=80){
      const nm=own?'คุณ':owner.name;
      pushMQ('[ยิงปลา4คน คลาสสิก]','ยินดีด้วย '+nm+' ยิงโดน '+d.n+' ได้รับ '+fmt(reward)+' เหรียญ!');
      if(own){S.log.unshift({n:d.n,v:reward,t:Date.now()});if(S.log.length>30)S.log.pop();}
    }
    /* win banners (player only) */
    if(own){
      if(m>=200)addWin({tier:'C',title:'JACKPOT!',amount:reward,icon:'💰'});
      else if(m>=80)addWin({tier:'B',title:'BIG WIN!',amount:reward,icon:'💎'});
      else if(m>=30)addWin({tier:'A',title:'ยอดเยี่ยม',amount:reward,icon:'⭐'});
      if(m>=20)S.tokens++;if(d.boss)S.tokens+=3;
    }
    /* specials */
    if(depth>1)return;
    if(host&&owner.me&&!owner.chain)owner=mkChain(chainAmt||0);
    switch(d.special){
      case'bomb':explode(f.x,f.y,170,owner,bet,4,depth+1);break;
      case'zap':chainLightning(f,owner,bet,4,3,depth+1);break;
      case'chain':chainLightning(f,owner,bet,9,6,depth+1);break;
      case'rocket':rocketBarrage(f,owner,bet,9,depth+1);break;
      case'chest':if(own){S.skillN[0]=Math.min(9,S.skillN[0]+1);S.skillN[1]=Math.min(9,S.skillN[1]+1);toast('ได้รับ ❄ ตอร์ปิโด +1 และ แช่แข็ง +1');}
        for(let i=0;i<14;i++)S.cfx.push({x:f.x+R(-30,30),y:f.y,vx:R(-260,260),vy:R(-380,-120),t:0,st:0,owner:owner,delay:i*.03,spin:R(0,6),sx:0,sy:0,val:0});break;
      case'queen':queenWave(f,owner,bet,depth+1);break;
      case'trident':tridentStrike(f,owner,bet,depth+1);break;
    }
  }
  function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y);}
  function liveFish(){return S.fish.filter(f=>!f.dead&&!f.gone&&f.x>-10&&f.x<W+10);}
  function chainLightning(src,owner,bet,n,dmg,depth){
    sfx('zap');
    const cand=liveFish().filter(f=>f!==src).sort((a,b)=>dist(a,src)-dist(b,src)).slice(0,n);
    let prev={x:src.x,y:src.y};
    cand.forEach((f,i)=>{const from=prev;prev=f;later(.1+i*.1,()=>{if(f.dead||f.gone)return;addBolt(from.x,from.y,f.x,f.y,'190,235,255',3);sfx('zap',50);f.flash=.25;burst(f.x,f.y,['#fff','#9fe8ff'],8,200);hitFish(f,owner,bet,dmg,true,depth);});});
  }
  function explode(x,y,rad,owner,bet,dmg,depth){
    S.expl.push({x:x,y:y,t:0,max:.6,r:rad});
    burst(x,y,['#fff3a0','#ffb02a','#ff6a1a'],26,420);
    for(let i=0;i<8;i++)PT({x:x+R(-20,20),y:y+R(-20,20),vx:R(-40,40),vy:R(-60,-10),life:R(.7,1.3),sz:R(10,22),col:'rgba(70,60,60,.5)',ty:'smoke',drag:1.2});
    shake(9);flash('255,220,160',.18);sfx('boom');
    for(const f of liveFish()){const rr0=Math.max(fishRX(f),fishRY(f))*.6;if(Math.hypot(f.x-x,f.y-y)<rad+rr0)hitFish(f,owner,bet,dmg,true,depth);}
  }
  function rocketBarrage(src,owner,bet,n,depth){
    sfx('rocket');
    for(let i=0;i<n;i++)later(.25+i*.13,()=>{
      const c=liveFish();if(!c.length)return;const tg=pick(c);
      const sx=owner.x+R(-140,140),sy=H-40;
      S.rockets.push({sx:sx,sy:sy,x:sx,y:sy,tx:tg.x,ty:tg.y,tg:tg,t:0,dur:R(.55,.8),cx:(sx+tg.x)/2+R(-160,160),cy:Math.min(sy,tg.y)-R(60,160),owner:owner,bet:bet,depth:depth,ang:-Math.PI/2});
      sfx('rocket',80);
    });
  }
  function updRockets(dt){
    for(const r of S.rockets){
      r.t+=dt;const u=clamp(r.t/r.dur,0,1);
      if(r.tg&&!r.tg.dead&&!r.tg.gone){r.tx=r.tg.x;r.ty=r.tg.y;}
      const ox=r.x,oy=r.y,a=1-u;
      r.x=a*a*r.sx+2*a*u*r.cx+u*u*r.tx;r.y=a*a*r.sy+2*a*u*r.cy+u*u*r.ty;
      r.ang=Math.atan2(r.y-oy,r.x-ox);
      PT({x:r.x,y:r.y,vx:R(-15,15),vy:R(-15,15),life:.55,sz:R(5,10),col:'rgba(255,255,255,.55)',ty:'smoke',drag:1});
      PT({x:r.x,y:r.y,vx:R(-30,30),vy:R(-30,30),life:.2,sz:R(2,4),col:'#ffb02a',ty:'spark'});
      if(u>=1){r.dead=true;explode(r.x,r.y,105,r.owner,r.bet,3,r.depth);}
    }
    S.rockets=S.rockets.filter(r=>!r.dead);
  }
  function queenWave(src,owner,bet,depth){
    S.rings.push({x:src.x,y:src.y,t:0,max:1.2,r:W*.9,col:'120,220,255',thick:1});flash('150,230,255',.3);shake(14);sfx('big');
    liveFish().filter(f=>!f.boss&&f!==src).forEach(f=>{const dl=dist(f,src)/900;later(dl,()=>{if(f.dead||f.gone)return;if(f.d.r<=60)hitFish(f,owner,bet,20,true,depth);else hitFish(f,owner,bet,12,true,depth);});});
  }
  function tridentEvent(owner,bet){
    addBand({title:'ตรีศูลแห่งนิรันดร์มาแล้ว',scheme:'fire',icon:'trident'});
    later(1.5,()=>tridentStrike({x:W/2,y:H/2},owner,bet,0));
  }
  function tridentStrike(src,owner,bet,depth){
    flash('255,240,180',.5);shake(16);sfx('boom');
    liveFish().forEach((f,i)=>later(.05+i*.07,()=>{if(f.dead||f.gone)return;addBolt(f.x+R(-40,40),0,f.x,f.y,'255,236,150',4);sfx('zap',60);flash('255,240,180',.15);hitFish(f,owner,bet,f.boss?40:14,true,depth);}));
    if(owner.me&&!host){S.atom=28;later(1.8,()=>toast('ได้รับ ระเบิดปรมาณู! กดใช้ได้ภายใน 28 วินาที'));}
  }
  function useAtom(){
    if(S.atom<=0)return;S.atom=0;const bet=curBet();
    flash('255,255,255',1);shake(26);sfx('boom');sfx('big');
    S.rings.push({x:you.x,y:you.y-100,t:0,max:1.4,r:W,col:'255,200,100',thick:1});
    for(let i=0;i<5;i++)S.expl.push({x:R(100,W-100),y:R(140,H-160),t:-i*.08,max:.7,r:R(120,200)});
    liveFish().forEach((f,i)=>later(.15+i*.05,()=>{if(f.dead||f.gone)return;hitFish(f,you,bet,f.boss?60:16,true,0);}));
  }
  /* ====================== SKILLS ====================== */
  function useFreeze(){
    if(S.skillN[0]<=0||S.skillCd[0]>0){if(S.skillN[0]<=0)toast('แช่แข็งหมดแล้ว รอเติมอัตโนมัติ');return;}
    S.skillN[0]--;S.skillCd[0]=8;S.freezeT=.8;sfx('ice');flash('170,230,255',.3);
    S.rings.push({x:you.x,y:you.y-60,t:0,max:.9,r:W,col:'170,230,255',thick:1});
    for(const f of liveFish()){f.frozen=4.5;f.frzT=S.t;}
    for(let i=0;i<40;i++)PT({x:R(0,W),y:R(60,H),vx:R(-30,30),vy:R(10,60),life:R(.8,1.6),sz:R(2,5),col:'#e8faff',ty:'star'});
  }
  function useTorpedo(){
    if(S.skillN[1]<=0||S.skillCd[1]>0){if(S.skillN[1]<=0)toast('ตอร์ปิโดหมดแล้ว รอเติมอัตโนมัติ');return;}
    const bet=curBet();let sid=null;
    if(host){if(you.coins<bet){toast('เครดิตไม่พอ');return;}you.coins-=bet;S.st.bet+=bet;S.st.shots++;sid=nextSid();SHOTBET[sid]=bet;Q.shots.push({id:sid,bet:bet});QSTAKE+=bet;}
    S.skillN[1]--;S.skillCd[1]=6;
    fireBullet(you,you.ang,bet,{torp:true,sid:sid});sfx('rocket');shake(4);
  }
  /* ====================== BOTS ====================== */
  function botTick(dt){
    const b=bot;b.cool-=dt;if(b.cool>0)return;b.cool=R(.3,.58);
    const ok=f=>f&&!f.dead&&!f.gone&&f.x>40&&f.x<W-40&&f.y>100&&f.y<H-120;
    if(!ok(b.tgt)||Math.random()<.035){const c=S.fish.filter(ok);if(!c.length)return;
      const big=c.filter(f=>f.d.r>=30);b.tgt=Math.random()<.45&&big.length?pick(big):pick(c);}
    const t=b.tgt;if(!t)return;
    if(Math.random()<.02){b.bet=clamp(b.bet+pick([-1,1]),ROOMS[S.room].lo,ROOMS[S.room].hi);}
    const bet=BETS[b.bet];b.coins-=bet;if(b.coins<3000000)b.coins+=8000000;
    const ang=aimAngle(b,t.x+Math.cos(t.ang)*t.sp*.35,t.y+Math.sin(t.ang)*t.sp*.35);b.ang=ang;
    fireBullet(b,ang,bet,{});
  }
  /* ====================== CONTEST ====================== */
  function updContest(dt){
    if(host)return;
    const c=S.ct;c.t-=dt;
    if(c.t>0)return;
    if(c.ph==='pre'){c.ph='run';c.t=120;c.you=0;c.bot=0;S.youTag=6;toast('เริ่มการแข่งขันคะแนน! ทำคะแนนให้มากกว่าคู่แข่ง');sfx('banner');}
    else if(c.ph==='run'){
      c.ph='res';c.t=7;const win=c.you>=c.bot,bonus=ROOMS[S.room].bonus;
      if(win){you.coins+=bonus;addWin({tier:'W',title:'คุณชนะการแข่งขัน!',amount:bonus,icon:'🏆',sub:'โบนัสผู้ชนะ'});sfx('win');
        for(let i=0;i<30;i++)S.cfx.push({x:W/2+R(-200,200),y:H/2+R(-60,60),vx:R(-260,260),vy:R(-420,-120),t:0,st:0,owner:you,delay:i*.03,spin:R(0,6),sx:0,sy:0,val:0});}
      else{bot.coins+=bonus;addWin({tier:'L',title:'จบการแข่งขัน',amount:c.you,icon:'🥈',sub:'คะแนนของคุณ'});}
    }else{c.ph='pre';c.t=6;c.you=0;c.bot=0;}
  }
  /* ====================== BANNERS QUEUE ====================== */
  function addBand(b){b.t=0;b.dur=b.dur||2.7;S.bands.push(b);}
  function addWin(w){w.t=0;w.dur=w.tier==='C'?3.6:w.tier==='B'?3.0:w.tier==='W'||w.tier==='L'?4.2:2.2;
    if(S.winB&&S.winB.t<S.winB.dur*.8&&w.tier==='A'&&S.winB.tier!=='A')return;
    S.winB=w;sfx('big');
    const n=w.tier==='A'?20:50;for(let i=0;i<n;i++)S.cfx.push({x:W/2+R(-240,240),y:-20-R(0,160),vx:R(-60,60),vy:R(100,260),t:0,st:0,owner:you,delay:i*.04,spin:R(0,6),sx:0,sy:0,val:0,rain:1});}
  /* ====================== MAIN UPDATE ====================== */
  function updateGame(dtr){
    let dt=dtr;if(S.slow>0){S.slow-=dtr;dt=dtr*.35;}
    S.t+=dt;
    /* timers */
    const tm=S.timers;S.timers=[];for(const x of tm){x.t-=dt;if(x.t<=0)x.fn();else S.timers.push(x);}
    spawnTick(dt);
    S.bossT-=dt;if(S.bossT<=0&&!S.fish.some(f=>!f.dead&&!f.gone&&f.boss)){spawnBoss();S.bossT=R(50,75);}
    S.evtT-=dt;if(S.evtT<=0){S.evtT=R(38,60);const k=pick(['rocket','dragon']);if(!S.fish.some(f=>!f.dead&&!f.gone&&f.t===k)&&countCap('l')<3)spawnAt(k);}
    S.fish.forEach(f=>updFish(f,dt));S.fish=S.fish.filter(f=>!f.gone);
    updBullets(dt);updRockets(dt);
    for(const s of[you]){s.rec=Math.max(0,s.rec-dt*7);s.pulse=Math.max(0,s.pulse-dt*3);s.disp+=(s.coins-s.disp)*Math.min(1,dt*7);if(Math.abs(s.coins-s.disp)<2)s.disp=s.coins;
      s.tw=s.tw.filter(w=>S.t-w.t<14);let sum=0;for(const w of s.tw)sum+=w.v;s.twd+=(sum-s.twd)*Math.min(1,dt*3);}
    you.spin=(you.spin||0)+dt*(you.spinV||0)*30;you.spinV=Math.max(0,(you.spinV||0)-dt*2.5);
    /* player hold-fire */
    you.cool-=dt;
    if(PTR.down&&!PTR.ui&&you.cool<=0&&S.mode==='play'){const ok=playerShoot();you.cool=SKINS[you.skin||0].cool*(S.x2?.55:1);if(!ok)PTR.down=false;}
    if(!PTR.down&&!S.lockOn)you.ang+=(you.angT-you.ang)*Math.min(1,dt*12);else you.ang+=(you.angT-you.ang)*Math.min(1,dt*14);
    if(S.lockOn&&!(S.lockT&&!S.lockT.dead&&!S.lockT.gone)){S.lockT=null;}
    if(S.lockOn&&S.lockT)you.angT=aimAngle(you,S.lockT.x,S.lockT.y);
    bot.ang+=0;
    /* fx */
    for(const b of S.blasts)b.t+=dt;S.blasts=S.blasts.filter(b=>b.t<b.max);for(const n of S.nets)n.t+=dt;S.nets=S.nets.filter(n=>n.t<n.life);
    for(const p of S.parts){if(p.dl>0){p.dl-=dt;continue;}p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=p.g*dt;if(p.drag){const k=Math.max(0,1-p.drag*dt);p.vx*=k;p.vy*=k;}p.rot+=p.vr*dt;}S.parts=S.parts.filter(p=>p.life>0);
    for(const b of S.bolts)b.life-=dt;S.bolts=S.bolts.filter(b=>b.life>0);
    for(const e of S.expl)e.t+=dt;S.expl=S.expl.filter(e=>e.t<e.max);
    for(const r of S.rings)r.t+=dt;S.rings=S.rings.filter(r=>r.t<r.max);
    for(const x of S.txt){x.life-=dt;x.y+=x.vy*dt;}S.txt=S.txt.filter(x=>x.life>0);
    updCoins(dt);
    S.shake=Math.max(0,S.shake-dt*30);S.flash=Math.max(0,S.flash-dt*1.4);
    if(S.freezeT>0)S.freezeT-=dt;
    if(S.atom>0)S.atom=Math.max(0,S.atom-dt);
    S.skillCd[0]=Math.max(0,S.skillCd[0]-dt);S.skillCd[1]=Math.max(0,S.skillCd[1]-dt);
    S.skillRegen+=dt;if(S.skillRegen>22){S.skillRegen=0;for(let i=0;i<2;i++)if(S.skillN[i]<5)S.skillN[i]++;}
    S.freeCd=Math.max(0,S.freeCd-dt);S.luckyCd=Math.max(0,S.luckyCd-dt);S.youTag=Math.max(0,S.youTag-dt);
    S.pkgT=Math.max(0,S.pkgT-dt);
    /* bands */
    if(!S.band&&S.bands.length){S.band=S.bands.shift();sfx('banner');shake(4);}
    if(S.band){S.band.t+=dt;if(S.band.t>=S.band.dur)S.band=null;}
    if(S.winB){S.winB.t+=dt;if(S.winB.t>=S.winB.dur)S.winB=null;}
    if(S.toast){S.toast.t+=dt;if(S.toast.t>2.6)S.toast=null;}
    /* marquee */
    const mq=S.mq;mq.fillT=(mq.fillT||0)-dt;if(mq.fillT<=0){mq.fillT=R(6,12);if(!host)fakeMQ();}
    if(mq.cur){mq.x-=120*dt;if(mq.x+mq.w<170)mq.cur=null;}
    if(!mq.cur&&mq.q.length){mq.cur=mq.q.shift();ctx.save();ctx.font='600 14px Kanit,sans-serif';const w1=ctx.measureText(mq.cur.pre+' ').width,w2=ctx.measureText(mq.cur.txt).width;ctx.restore();mq.w1=w1;mq.w=w1+w2;mq.x=W-24;}
    /* jackpot ticks */
    JP.forEach(j=>j.v+=Math.random()*18*dt*10);
    updContest(dt);
    S.sinceSave+=dt;if(S.sinceSave>5){S.sinceSave=0;save();}
  }
  function updCoins(dt){
    for(const c of S.cfx){
      if(c.delay>0){c.delay-=dt;continue;}
      c.t+=dt;
      if(c.st===0){
        c.x+=c.vx*dt;c.y+=c.vy*dt;c.vy+=900*dt;c.vx*=1-1.5*dt;
        if(c.rain){if(c.y>H+30)c.dead=true;continue;}
        if(c.t>.42){c.st=1;c.t=0;c.sx=c.x;c.sy=c.y;}
      }else{
        const tx=c.owner.me?W-300:150,ty=H-26,u=eOut(Math.min(1,c.t/.7));
        c.x=lerp(c.sx,tx,u);c.y=lerp(c.sy,ty,u)-Math.sin(u*Math.PI)*70;
        if(c.t>=.7){c.dead=true;c.owner.pulse=1;sfx('coin',70);}
      }
      c.spin+=dt*14;
    }
    S.cfx=S.cfx.filter(c=>!c.dead);if(S.cfx.length>260)S.cfx.splice(0,S.cfx.length-260);
  }

  /* ====================== FISH ART v3 (illustrated, matches reference) ====================== */
  const OL='rgba(18,22,48,.62)';
  function olw(h){return Math.max(1,h*.035);}
  K.gen=(c,w,h,t,f,o)=>{
    const wag=Math.sin(t*9+f.ph)*.32,tk=o.tk||1,lw=olw(h),df=o.dorsal||1;c.lineJoin='round';
    c.save();c.translate(-w*.32,0);c.rotate(wag);c.globalAlpha=o.ta||1;
    c.fillStyle=lg(c,0,0,-w*.3*tk,0,[[0,o.tailA||o.fin],[1,o.tail||o.fin]]);
    c.beginPath();c.moveTo(w*.05,0);c.quadraticCurveTo(-w*.1*tk,-h*.55*tk,-w*.3*tk,-h*.66*tk);c.quadraticCurveTo(-w*.2*tk,0,-w*.3*tk,h*.66*tk);c.quadraticCurveTo(-w*.1*tk,h*.55*tk,w*.05,0);c.fill();
    c.strokeStyle=o.finEdge||OL;c.lineWidth=lw*(o.finEdge?1.4:1);c.stroke();
    c.strokeStyle='rgba(0,0,0,.16)';c.lineWidth=lw*.6;for(let i=-2;i<=2;i++){c.beginPath();c.moveTo(0,0);c.lineTo(-w*.26*tk,i*h*.22*tk);c.stroke();}
    c.restore();
    c.fillStyle=o.fin;c.strokeStyle=o.finEdge||OL;c.lineWidth=lw;
    c.beginPath();c.moveTo(w*.2,-h*.32);c.quadraticCurveTo(w*.02,-h*.95*df,-w*.26,-h*.3);c.closePath();c.fill();c.stroke();
    c.beginPath();c.moveTo(w*.06,h*.32);c.quadraticCurveTo(-w*.04,h*.78*df,-w*.22,h*.3);c.closePath();c.fill();c.stroke();
    c.fillStyle=lg(c,0,-h/2,0,h/2,[[0,o.c1],[1,o.c2]]);bodyP(c,w,h);c.fill();
    c.save();bodyP(c,w,h);c.clip();
    if(o.st){for(let i=0;i<(o.stn||0);i++){const x=w*(.3-i*.19);if(o.stEdge){c.fillStyle=o.stEdge;c.fillRect(x-w*.02,-h,w*.11,h*2);}c.fillStyle=o.st;c.fillRect(x,-h,w*.07,h*2);}}
    if(o.patch){c.fillStyle=o.patch;[[.1,-.15,.2,.16],[-.15,.1,.17,.14],[.28,.12,.1,.1]].forEach(p=>{c.beginPath();c.ellipse(w*p[0],h*p[1],w*p[2],h*p[3],.3,0,7);c.fill();});}
    if(o.spots){c.fillStyle=o.spots;for(let i=0;i<16;i++){c.beginPath();c.arc(w*Math.sin(i*7.3)*.34,h*Math.cos(i*3.1)*.3,h*.05,0,7);c.fill();}}
    c.fillStyle='rgba(255,255,255,.28)';c.beginPath();c.ellipse(w*.05,-h*.22,w*.3,h*.11,0,0,7);c.fill();
    c.fillStyle='rgba(255,255,255,.16)';c.beginPath();c.ellipse(0,h*.3,w*.36,h*.13,0,0,7);c.fill();
    c.restore();
    c.strokeStyle=OL;c.lineWidth=lw;bodyP(c,w,h);c.stroke();
    c.strokeStyle='rgba(0,0,0,.28)';c.beginPath();c.arc(w*.2,0,h*.38,Math.PI*.62,Math.PI*1.38);c.stroke();
    c.fillStyle=o.pec||o.fin;c.save();c.translate(w*.12,h*.08);c.rotate(.5+Math.sin(t*7+f.ph)*.25);c.beginPath();c.ellipse(-w*.06,0,w*.09,h*.07,0,0,7);c.fill();c.strokeStyle=o.finEdge||OL;c.lineWidth=lw*.7;c.stroke();c.restore();
    c.strokeStyle='rgba(60,10,10,.6)';c.lineWidth=lw;c.beginPath();c.moveTo(w*.5,h*.02);c.quadraticCurveTo(w*.45,h*.08,w*.41,h*.06);c.stroke();
    if(o.whisk){c.strokeStyle=o.fin;c.lineWidth=2;for(const s of[-1,1]){c.beginPath();c.moveTo(w*.46,s*h*.04);c.quadraticCurveTo(w*.62,s*h*.2+Math.sin(t*6)*5,w*.7,s*h*.5);c.stroke();}}
    eye(c,w*.3,-h*.1,Math.max(3,h*.13));
  };
  K.bluetang=(c,w,h,t,f,o)=>{
    K.gen(c,w,h,t,f,{c1:'#4a8aff',c2:'#1636a8',fin:'#16206a',tailA:'#ffd21a',tail:'#ffb000',pec:'#ffd21a',finEdge:'#0a0f30',dorsal:.85});
    c.save();bodyP(c,w,h);c.clip();
    c.fillStyle='#0b1030';c.beginPath();c.moveTo(w*.3,-h*.3);c.bezierCurveTo(w*.05,-h*.46,-w*.25,-h*.26,-w*.4,-h*.04);c.bezierCurveTo(-w*.22,-h*.02,-w*.06,h*.22,w*.02,h*.06);c.bezierCurveTo(-w*.12,-h*.06,w*.08,-h*.12,w*.3,-h*.17);c.closePath();c.fill();
    c.fillStyle='#ffd21a';c.beginPath();c.moveTo(-w*.38,-h*.06);c.lineTo(-w*.28,-h*.02);c.lineTo(-w*.38,h*.02);c.fill();
    c.restore();
    eye(c,w*.3,-h*.1,Math.max(3,h*.13));
  };
  K.idol=(c,w,h,t,f,o)=>{
    const lw=olw(h),wag=Math.sin(t*8+f.ph)*.25,sw=Math.sin(t*4+f.ph);
    c.save();c.translate(-w*.3,0);c.rotate(wag);c.fillStyle='#16161a';c.beginPath();c.moveTo(w*.05,0);c.lineTo(-w*.17,-h*.2);c.quadraticCurveTo(-w*.1,0,-w*.17,h*.2);c.closePath();c.fill();c.fillStyle='#f4f2e4';c.fillRect(-w*.17,-h*.2,w*.03,h*.4);c.restore();
    c.strokeStyle='#f4f2e4';c.lineWidth=Math.max(2,h*.04);c.lineCap='round';c.beginPath();c.moveTo(w*.06,-h*.4);c.bezierCurveTo(-w*.1,-h*.82,-w*.36,-h*.7+sw*h*.05,-w*.6,-h*.4+sw*h*.1);c.stroke();
    const P=()=>{c.beginPath();c.moveTo(w*.54,h*.02);c.lineTo(w*.4,-h*.06);c.bezierCurveTo(w*.26,-h*.5,-w*.1,-h*.56,-w*.3,-h*.12);c.lineTo(-w*.3,h*.12);c.bezierCurveTo(-w*.1,h*.56,w*.26,h*.46,w*.4,h*.1);c.closePath();};
    c.fillStyle='#f8f4e2';P();c.fill();
    c.save();P();c.clip();
    c.fillStyle='#16161a';c.fillRect(w*.12,-h,w*.18,h*2);
    c.fillStyle=lg(c,0,-h*.4,0,h*.4,[[0,'#ffe24a'],[1,'#f0a800']]);c.fillRect(-w*.14,-h,w*.16,h*2);
    c.fillStyle='#16161a';c.fillRect(-w*.27,-h,w*.13,h*2);
    c.fillStyle='#ff9a3a';c.beginPath();c.ellipse(w*.5,h*.02,w*.05,h*.05,0,0,7);c.fill();
    c.fillStyle='rgba(255,255,255,.25)';c.beginPath();c.ellipse(w*.05,-h*.25,w*.28,h*.1,0,0,7);c.fill();
    c.restore();
    c.strokeStyle=OL;c.lineWidth=lw;P();c.stroke();
    eye(c,w*.22,-h*.08,Math.max(3,h*.08));
  };
  K.dolphin=(c,w,h,t,f,o)=>{
    const wag=Math.sin(t*7+f.ph)*.25,lw=olw(h);
    torpedoFins(c,w,h,t,f,wag,'#5f82a4');
    c.fillStyle='#5f82a4';c.beginPath();c.moveTo(w*.08,-h*.42);c.quadraticCurveTo(-w*.04,-h*.95,-w*.2,-h*.34);c.fill();c.strokeStyle=OL;c.lineWidth=lw;c.stroke();
    c.fillStyle=lg(c,0,-h/2,0,h/2,[[0,'#6f92b4'],[.55,'#9ab8d2'],[.62,'#e6f0fa'],[1,'#ffffff']]);shP(c,w,h);c.fill();c.strokeStyle=OL;c.stroke();
    c.fillStyle='#7fa0c0';c.beginPath();c.moveTo(w*.44,-h*.08);c.quadraticCurveTo(w*.62,-h*.02,w*.64,h*.06);c.quadraticCurveTo(w*.5,h*.14,w*.4,h*.08);c.fill();c.stroke();
    c.fillStyle='#5f82a4';c.save();c.translate(w*.1,h*.2);c.rotate(.5+Math.sin(t*6)*.2);c.beginPath();c.ellipse(0,h*.14,w*.05,h*.2,0,0,7);c.fill();c.stroke();c.restore();
    c.strokeStyle='rgba(255,255,255,.4)';c.lineWidth=2;c.beginPath();c.moveTo(-w*.2,-h*.05);c.quadraticCurveTo(w*.1,-h*.22,w*.38,-h*.1);c.stroke();
    c.strokeStyle='rgba(40,40,60,.6)';c.lineWidth=lw;c.beginPath();c.moveTo(w*.62,h*.06);c.quadraticCurveTo(w*.5,h*.1,w*.42,h*.06);c.stroke();
    eye(c,w*.32,-h*.06,h*.08);
  };
  K.sword=(c,w,h,t,f,o)=>{
    const wag=Math.sin(t*8+f.ph)*.3,lw=olw(h);
    c.save();c.translate(-w*.04,0);torpedoFins(c,w*.8,h,t,f,wag,'#6a3ad8');
    c.fillStyle=lg(c,0,-h,0,-h*.3,[[0,'#ff8ae8'],[1,'#a050e8']]);c.beginPath();c.moveTo(w*.22,-h*.3);c.quadraticCurveTo(w*.0,-h*1.15,-w*.3,-h*.34);c.quadraticCurveTo(-w*.1,-h*.5,w*.22,-h*.3);c.fill();c.strokeStyle=OL;c.lineWidth=lw;c.stroke();
    c.strokeStyle='rgba(80,20,120,.5)';for(let i=1;i<6;i++){c.beginPath();c.moveTo(w*(.2-i*.08),-h*.32);c.lineTo(w*(.12-i*.08),-h*(.9-i*.08));c.stroke();}
    c.fillStyle=lg(c,0,-h/2,0,h/2,[[0,'#6a4ae8'],[.5,'#b060e8'],[1,'#ffd8f4']]);shP(c,w*.8,h*.8);c.fill();c.strokeStyle=OL;c.stroke();
    c.fillStyle='#e8d0ff';c.beginPath();c.moveTo(w*.38,-h*.04);c.lineTo(w*.66,-h*.015);c.lineTo(w*.66,h*.015);c.lineTo(w*.38,h*.05);c.fill();c.stroke();
    c.fillStyle='rgba(120,220,255,.6)';for(let i=0;i<5;i++){c.fillRect(-w*.18+i*w*.09,-h*.12,w*.02,h*.2);}
    eye(c,w*.26,-h*.1,h*.1);c.restore();
  };
  K.shark=(c,w,h,t,f,o)=>{
    const wag=Math.sin(t*5+f.ph)*.22,lw=Math.max(1.2,h*.025);
    torpedoFins(c,w,h*1.2,t,f,wag,'#56708e');
    c.fillStyle='#56708e';c.strokeStyle=OL;c.lineWidth=lw;c.beginPath();c.moveTo(w*.12,-h*.4);c.quadraticCurveTo(-w*.02,-h*1.15,-w*.22,-h*.3);c.closePath();c.fill();c.stroke();
    c.save();c.translate(w*.12,h*.3);c.rotate(.5+Math.sin(t*4)*.1);c.fillStyle='#5a7492';c.beginPath();c.moveTo(0,0);c.quadraticCurveTo(-w*.04,h*.5,-w*.14,h*.62);c.quadraticCurveTo(-w*.02,h*.2,w*.08,0);c.fill();c.stroke();c.restore();
    c.fillStyle=lg(c,0,-h/2,0,h/2,[[0,'#56708e'],[.44,'#8aa4c2'],[.5,'#e8f0f8'],[1,'#ffffff']]);shP(c,w,h);c.fill();c.stroke();
    c.strokeStyle='rgba(30,40,70,.45)';c.lineWidth=2;for(let i=0;i<5;i++){c.beginPath();c.moveTo(w*(.22-i*.03),-h*.2);c.quadraticCurveTo(w*(.22-i*.03)-4,0,w*(.22-i*.03),h*.12);c.stroke();}
    c.fillStyle='#5a1a1a';c.beginPath();c.moveTo(w*.49,h*.08);c.quadraticCurveTo(w*.36,h*.3,w*.2,h*.14);c.quadraticCurveTo(w*.36,h*.16,w*.49,h*.08);c.fill();
    c.fillStyle='#fff';for(let i=0;i<7;i++){const x=w*(.44-i*.034),y=h*(.11+i*.012);c.beginPath();c.moveTo(x,y);c.lineTo(x-w*.012,y+h*.07);c.lineTo(x-w*.024,y+h*.005);c.fill();}
    c.fillStyle='#0a0a12';c.beginPath();c.arc(w*.35,-h*.06,Math.max(2.5,h*.055),0,7);c.fill();c.fillStyle='#fff';c.beginPath();c.arc(w*.355,-h*.075,Math.max(1,h*.018),0,7);c.fill();
  };
  K.jelly=(c,w,h,t,f,o)=>{
    const p=Math.sin(t*3.2+f.ph),bx=w*.2,bl=w*.27*(1+p*.08),bh=h*.42*(1-p*.1);
    c.save();c.globalCompositeOperation='lighter';c.lineCap='round';
    for(let i=0;i<7;i++){const y0=(i-3)*bh*.24;c.strokeStyle=i%2?'rgba(255,140,220,.55)':'rgba(170,150,255,.55)';c.lineWidth=1.6;c.beginPath();c.moveTo(bx-bl*.55,y0);for(let s=1;s<=10;s++)c.lineTo(bx-bl*.55-s*w*.065,y0+Math.sin(t*4-s*.7+i)*h*.02*s);c.stroke();}
    for(let i=0;i<3;i++){c.strokeStyle='rgba(255,170,240,.45)';c.lineWidth=5;const y0=(i-1)*bh*.22;c.beginPath();c.moveTo(bx-bl*.5,y0);for(let s=1;s<=6;s++)c.lineTo(bx-bl*.5-s*w*.06,y0+Math.sin(t*3-s*.8+i*2)*h*.08);c.stroke();}
    c.fillStyle=rg(c,bx,0,1,bl*2.2,[[0,'rgba(255,150,240,.35)'],[1,'rgba(160,100,255,0)']]);c.beginPath();c.arc(bx,0,bl*2.2,0,7);c.fill();
    c.restore();
    c.fillStyle=rg(c,bx+bl*.25,-bh*.2,2,bl*1.3,[[0,'rgba(255,245,255,.95)'],[.45,'rgba(255,140,230,.78)'],[1,'rgba(140,90,255,.5)']]);
    c.beginPath();c.moveTo(bx-bl*.55,-bh);c.bezierCurveTo(bx+bl*.95,-bh*1.15,bx+bl*.95,bh*1.15,bx-bl*.55,bh);
    for(let i=1;i<=8;i++){const yy=bh-(i/8)*bh*2;c.lineTo(bx-bl*.55-(i%2?bl*.13:0),yy);}
    c.closePath();c.fill();c.strokeStyle='rgba(255,225,255,.85)';c.lineWidth=1.6;c.stroke();
    c.strokeStyle='rgba(255,255,255,.35)';c.lineWidth=1.2;for(let i=-2;i<=2;i++){c.beginPath();c.moveTo(bx+bl*.6,i*bh*.08);c.quadraticCurveTo(bx+bl*.1,i*bh*.4,bx-bl*.5,i*bh*.42);c.stroke();}
    c.save();c.globalCompositeOperation='lighter';c.fillStyle=rg(c,bx+bl*.05,0,1,bl*.6,[[0,'rgba(255,255,255,.85)'],[1,'rgba(255,120,220,0)']]);c.beginPath();c.arc(bx+bl*.05,0,bl*.6,0,7);c.fill();c.restore();
  };
  K.ray=(c,w,h,t,f,o)=>{
    const fl=Math.sin(t*2.6+f.ph),lw=Math.max(1,h*.02);
    c.strokeStyle='#1c2440';c.lineWidth=2.5;c.lineCap='round';c.beginPath();c.moveTo(-w*.22,0);c.quadraticCurveTo(-w*.45,Math.sin(t*3)*h*.06,-w*.7,Math.sin(t*3-1)*h*.1);c.stroke();
    const wy=h*.5*(1-.3*fl),wx=-w*.05+fl*w*.05;
    const P=()=>{c.beginPath();c.moveTo(w*.3,-h*.08);c.quadraticCurveTo(w*.14,-h*.22,wx,-wy);c.quadraticCurveTo(-w*.06,-h*.2,-w*.24,0);c.quadraticCurveTo(-w*.06,h*.2,wx,wy);c.quadraticCurveTo(w*.14,h*.22,w*.3,h*.08);c.closePath();};
    c.fillStyle=lg(c,0,-h/2,0,h/2,[[0,'#24305a'],[.5,'#40548c'],[1,'#24305a']]);P();c.fill();c.strokeStyle=OL;c.lineWidth=lw;c.stroke();
    c.save();P();c.clip();c.fillStyle='rgba(235,242,255,.88)';
    for(const s of[-1,1]){c.beginPath();c.moveTo(w*.12,s*h*.06);c.quadraticCurveTo(w*.04,s*h*.24,-w*.04,s*wy*.78);c.quadraticCurveTo(-w*.01,s*h*.2,w*.04,s*h*.05);c.closePath();c.fill();}
    c.fillStyle='rgba(255,255,255,.14)';c.beginPath();c.ellipse(w*.02,0,w*.2,h*.08,0,0,7);c.fill();c.restore();
    c.fillStyle='#1c2648';for(const s of[-1,1]){c.beginPath();c.ellipse(w*.34,s*h*.075,w*.06,h*.028,s*.35,0,7);c.fill();}
    eye(c,w*.27,-h*.1,Math.max(2.2,h*.028));eye(c,w*.27,h*.1,Math.max(2.2,h*.028));
  };
  function hexS(c,cx,cy,rx,ry){c.beginPath();c.moveTo(cx+rx,cy);c.lineTo(cx+rx*.5,cy-ry);c.lineTo(cx-rx*.5,cy-ry);c.lineTo(cx-rx,cy);c.lineTo(cx-rx*.5,cy+ry);c.lineTo(cx+rx*.5,cy+ry);c.closePath();}
  K.turtle=(c,w,h,t,f,o)=>{
    const p=Math.sin(t*2.4+f.ph),lw=Math.max(1.2,h*.016),sk=['#a8b878','#5e6e3a'];
    for(const s of[-1,1]){c.save();c.translate(-w*.26,s*h*.24);c.rotate(s*(.5-p*.25));c.fillStyle=lg(c,0,0,-w*.16,0,[[0,sk[0]],[1,sk[1]]]);c.beginPath();c.ellipse(-w*.07,0,w*.1,h*.065,0,0,7);c.fill();c.strokeStyle=OL;c.lineWidth=lw;c.stroke();c.restore();}
    c.fillStyle=sk[1];c.beginPath();c.moveTo(-w*.3,-h*.04);c.lineTo(-w*.4,0);c.lineTo(-w*.3,h*.04);c.fill();
    for(const s of[-1,1]){c.save();c.translate(w*.14,s*h*.26);c.rotate(s*(.95+p*.55));
      c.fillStyle=lg(c,0,0,w*.34,0,[[0,sk[0]],[1,sk[1]]]);
      c.beginPath();c.moveTo(0,-h*.05*s);c.quadraticCurveTo(w*.18,-h*.15*s,w*.38,-h*.01*s);c.quadraticCurveTo(w*.2,h*.07*s,0,h*.06*s);c.closePath();c.fill();c.strokeStyle=OL;c.lineWidth=lw;c.stroke();
      c.fillStyle='rgba(50,60,25,.4)';for(let i=0;i<6;i++){c.beginPath();c.ellipse(w*(.05+i*.05),-h*.02*s,w*.016,h*.02,0,0,7);c.fill();}
      c.strokeStyle='rgba(235,245,205,.6)';c.lineWidth=lw*1.2;c.beginPath();c.moveTo(w*.02,h*.05*s);c.quadraticCurveTo(w*.2,h*.05*s,w*.36,0);c.stroke();c.restore();}
    c.fillStyle=lg(c,0,-h*.12,0,h*.12,[[0,sk[0]],[1,sk[1]]]);c.beginPath();c.ellipse(w*.33,0,w*.08,h*.09,0,0,7);c.fill();
    c.beginPath();c.ellipse(w*.43,0,w*.1,h*.12,0,0,7);c.fill();c.strokeStyle=OL;c.lineWidth=lw;c.stroke();
    c.strokeStyle='rgba(50,60,25,.6)';c.lineWidth=lw*.8;c.beginPath();c.moveTo(w*.38,-h*.08);c.lineTo(w*.44,-h*.04);c.lineTo(w*.5,-h*.06);c.moveTo(w*.38,h*.08);c.lineTo(w*.44,h*.04);c.lineTo(w*.5,h*.06);c.moveTo(w*.44,-h*.04);c.lineTo(w*.44,h*.04);c.moveTo(w*.38,-h*.08);c.lineTo(w*.38,h*.08);c.stroke();
    c.fillStyle='#3a3a22';c.beginPath();c.moveTo(w*.515,-h*.035);c.lineTo(w*.548,0);c.lineTo(w*.515,h*.035);c.fill();
    eye(c,w*.47,-h*.08,Math.max(2.4,h*.028));eye(c,w*.47,h*.08,Math.max(2.4,h*.028));
    const sx=w*.34,sy=h*.36;
    c.fillStyle=rg(c,-w*.02,-h*.06,2,w*.42,[[0,'#d09a50'],[.55,'#8a5626'],[1,'#4a2a10']]);c.beginPath();c.ellipse(0,0,sx,sy,0,0,7);c.fill();
    c.save();c.beginPath();c.ellipse(0,0,sx,sy,0,0,7);c.clip();
    c.strokeStyle='rgba(40,20,5,.75)';c.lineWidth=lw*1.2;c.beginPath();c.ellipse(0,0,sx*.84,sy*.8,0,0,7);c.stroke();
    for(let i=0;i<20;i++){const a=i/20*6.283;c.beginPath();c.moveTo(Math.cos(a)*sx*.84,Math.sin(a)*sy*.8);c.lineTo(Math.cos(a)*sx,Math.sin(a)*sy);c.stroke();}
    const sc=(cx,cy,rx,ry)=>{hexS(c,cx,cy,rx,ry);c.fillStyle=rg(c,cx,cy,1,Math.max(rx,ry),[[0,'rgba(245,195,110,.6)'],[1,'rgba(245,195,110,0)']]);c.fill();c.stroke();};
    for(let k=0;k<5;k++)sc(w*(.24-k*.12),0,w*.062,h*.09);
    for(const s of[-1,1])for(let k=0;k<4;k++)sc(w*(.18-k*.12),s*h*.2,w*.065,h*.1);
    c.restore();
    c.strokeStyle=OL;c.lineWidth=lw*1.4;c.beginPath();c.ellipse(0,0,sx,sy,0,0,7);c.stroke();
    c.fillStyle='rgba(255,240,200,.2)';c.beginPath();c.ellipse(-w*.04,-sy*.42,sx*.6,sy*.22,0,0,7);c.fill();
  };
  K.dragon=(c,w,h,t,f,o)=>{
    const n=20,seg=w*.042,pts=[];
    for(let i=0;i<n;i++){const k=i/n;pts.push({x:w*.3-i*seg*1.15,y:Math.sin(t*4-i*.5+f.ph)*h*.5*(.3+k*.7)});}
    const tl=pts[n-1];c.fillStyle='#e8401a';for(let k=0;k<4;k++){c.beginPath();c.moveTo(tl.x,tl.y);c.quadraticCurveTo(tl.x-w*.06,tl.y+(k-1.5)*10,tl.x-w*.12,tl.y+(k-1.5)*16+Math.sin(t*5+k)*4);c.quadraticCurveTo(tl.x-w*.05,tl.y+(k-1.5)*6,tl.x,tl.y);c.fill();}
    for(let i=n-1;i>=1;i--){const k=1-i/n,rw=h*(.08+.3*k*k+.04),p=pts[i];
      if(i%2===0){c.fillStyle='#e8401a';c.beginPath();c.moveTo(p.x+seg*.4,p.y-rw*.8);c.lineTo(p.x-seg*.2,p.y-rw-10*k-4);c.lineTo(p.x-seg*.8,p.y-rw*.8);c.fill();}
      if(i===4||i===13){for(const s of[-1,1]){c.save();c.translate(p.x,p.y+s*rw*.6);c.rotate(s*(Math.sin(t*3+i)*.4+.5));c.strokeStyle='#d8951a';c.lineWidth=5;c.lineCap='round';c.beginPath();c.moveTo(0,0);c.lineTo(-6,s*14);c.lineTo(4,s*22);c.stroke();c.strokeStyle='#fff8e0';c.lineWidth=1.6;for(let q=-1;q<=1;q++){c.beginPath();c.moveTo(4,s*22);c.lineTo(9+q*3,s*28);c.stroke();}c.restore();}}
      c.fillStyle=lg(c,0,p.y-rw,0,p.y+rw,[[0,'#fff0a0'],[.35,'#f0b830'],[.75,'#b8700e'],[1,'#fff4c8']]);c.beginPath();c.ellipse(p.x,p.y,seg*.95,rw,0,0,7);c.fill();c.strokeStyle='rgba(110,55,0,.6)';c.lineWidth=1.3;c.stroke();
      c.strokeStyle='rgba(120,60,0,.35)';c.beginPath();c.arc(p.x+seg*.3,p.y,rw*.6,Math.PI*.6,Math.PI*1.4);c.stroke();
      c.fillStyle='rgba(255,245,210,.85)';c.fillRect(p.x-seg*.4,p.y+rw*.45,seg*.8,rw*.3);}
    const hd=pts[0];c.save();c.translate(hd.x+w*.07,hd.y);
    c.fillStyle='#e8401a';for(let k=0;k<6;k++){const a=Math.PI*.55+k*.33;c.beginPath();c.moveTo(-w*.02,0);c.quadraticCurveTo(Math.cos(a)*h*.4,Math.sin(a)*h*.4-h*.1,Math.cos(a)*h*.6-w*.04,Math.sin(a)*h*.6+Math.sin(t*4+k)*3);c.quadraticCurveTo(Math.cos(a)*h*.25,Math.sin(a)*h*.25,-w*.02,0);c.fill();}
    c.strokeStyle='#ffd84a';c.lineWidth=4;c.lineCap='round';c.beginPath();c.moveTo(0,-h*.2);c.quadraticCurveTo(-w*.06,-h*.5,-w*.12,-h*.64);c.moveTo(-w*.05,-h*.42);c.lineTo(-w*.01,-h*.54);c.moveTo(w*.03,-h*.2);c.quadraticCurveTo(-w*.01,-h*.45,-w*.05,-h*.6);c.stroke();
    const jo=.22+.12*Math.sin(t*3);
    c.fillStyle='#6a0a10';c.beginPath();c.moveTo(w*.04,h*.0);c.lineTo(w*.22,0);c.lineTo(w*.04+Math.cos(jo)*w*.17,Math.sin(jo)*w*.17);c.fill();
    c.save();c.translate(w*.04,h*.02);c.rotate(jo);c.fillStyle=lg(c,0,0,0,h*.12,[[0,'#f0c050'],[1,'#b8700e']]);c.beginPath();c.moveTo(0,0);c.lineTo(w*.17,0);c.quadraticCurveTo(w*.18,h*.07,w*.12,h*.09);c.lineTo(-w*.02,h*.09);c.closePath();c.fill();c.strokeStyle='rgba(110,55,0,.7)';c.lineWidth=1.5;c.stroke();
    c.fillStyle='#fff';for(let i=0;i<4;i++){c.beginPath();c.moveTo(w*(.04+i*.035),0);c.lineTo(w*(.055+i*.035),-h*.05);c.lineTo(w*(.07+i*.035),0);c.fill();}
    c.fillStyle='#ff6a8a';c.beginPath();c.ellipse(w*.08,-h*.01,w*.05,h*.02,0,0,7);c.fill();c.restore();
    c.fillStyle=lg(c,0,-h*.32,0,h*.04,[[0,'#fff0a0'],[1,'#d8951a']]);
    c.beginPath();c.moveTo(-w*.06,-h*.22);c.quadraticCurveTo(w*.06,-h*.36,w*.14,-h*.15);c.lineTo(w*.24,-h*.09);c.quadraticCurveTo(w*.26,-h*.02,w*.22,0);c.lineTo(w*.06,0);c.quadraticCurveTo(-w*.04,h*.08,-w*.06,-h*.22);c.closePath();c.fill();c.strokeStyle='rgba(110,55,0,.7)';c.lineWidth=1.5;c.stroke();
    c.fillStyle='#fff';for(let i=0;i<4;i++){c.beginPath();c.moveTo(w*(.08+i*.035),0);c.lineTo(w*(.095+i*.035),h*.05);c.lineTo(w*(.11+i*.035),0);c.fill();}
    c.fillStyle='#fff8d0';c.beginPath();c.ellipse(w*.07,-h*.17,w*.026,h*.05,-.3,0,7);c.fill();c.fillStyle='#2a8aff';c.beginPath();c.arc(w*.075,-h*.17,h*.035,0,7);c.fill();c.fillStyle='#000';c.fillRect(w*.073,-h*.2,w*.006,h*.06);
    c.strokeStyle='#c02010';c.lineWidth=3;c.beginPath();c.moveTo(w*.03,-h*.24);c.quadraticCurveTo(w*.08,-h*.27,w*.12,-h*.21);c.stroke();
    c.fillStyle='#8a4a00';c.beginPath();c.arc(w*.215,-h*.07,2,0,7);c.fill();
    c.strokeStyle='#ffe27a';c.lineWidth=2.2;for(const s of[-1,1]){c.beginPath();c.moveTo(w*.2,-h*.06);c.bezierCurveTo(w*.3,-h*.06+s*h*.25,w*.18,s*h*.5+Math.sin(t*4)*6,w*.06,s*h*.62);c.stroke();}
    c.restore();
    const px=hd.x+w*.4,py=hd.y-h*.05,pr=h*.32;c.save();c.globalCompositeOperation='lighter';c.fillStyle=rg(c,px,py,2,pr*2.2,[[0,'rgba(255,255,255,.9)'],[.3,'rgba(255,230,140,.55)'],[1,'rgba(255,200,60,0)']]);c.beginPath();c.arc(px,py,pr*2.2,0,7);c.fill();c.restore();
    c.fillStyle=rg(c,px-pr*.3,py-pr*.3,1,pr,[[0,'#ffffff'],[.5,'#9ff0ff'],[1,'#2aa8d8']]);c.beginPath();c.arc(px,py,pr,0,7);c.fill();c.strokeStyle='#ffd84a';c.lineWidth=2;c.stroke();
  };
  K.queen=(c,w,h,t,f,o)=>{
    const sw=Math.sin(t*2.2+f.ph),lw=Math.max(1.2,h*.006),SK=['#f6d0aa','#d89a72'];
    aura(c,w*.8,'rgba(90,200,255,A)',t);
    c.save();c.globalCompositeOperation='lighter';for(let i=0;i<16;i++){const a=t*.8+i*.39,r=w*(.3+.12*Math.sin(i*2.1+t)),x=Math.cos(a)*r,y=Math.sin(a)*r*1.3-h*.05,s=1.5+1.5*Math.sin(t*5+i);c.fillStyle='rgba(200,240,255,.85)';c.beginPath();c.arc(x,y,Math.max(.5,s),0,7);c.fill();}c.restore();
    c.fillStyle='rgba(90,180,255,.42)';c.beginPath();c.moveTo(w*.05,-h*.22);c.bezierCurveTo(-w*.2,-h*.3,-w*.42,-h*.05+sw*10,-w*.44,h*.22+sw*12);c.bezierCurveTo(-w*.36,h*.06,-w*.2,-h*.12,w*.02,-h*.16);c.closePath();c.fill();
    c.fillStyle=lg(c,0,-h*.42,0,h*.15,[[0,'#232a52'],[1,'#0a0e24']]);
    c.beginPath();c.moveTo(-w*.02,-h*.42);c.bezierCurveTo(-w*.2,-h*.42,-w*.22,-h*.2,-w*.24+sw*6,-h*.02);c.bezierCurveTo(-w*.3+sw*10,h*.1,-w*.18+sw*8,h*.14,-w*.11,h*.04);c.bezierCurveTo(-w*.06,-h*.05,-w*.02,-h*.2,w*.05,-h*.3);c.closePath();c.fill();
    c.strokeStyle='rgba(130,150,230,.35)';c.lineWidth=1.5;for(let i=0;i<4;i++){c.beginPath();c.moveTo(-w*.04-i*w*.03,-h*.38);c.bezierCurveTo(-w*.14-i*w*.02,-h*.25,-w*.18-i*w*.015+sw*6,-h*.05,-w*.14-i*w*.02+sw*8,h*.08);c.stroke();}
    const stx=-w*.16;
    c.strokeStyle=lg(c,stx-3,0,stx+3,0,[[0,'#a8700e'],[.5,'#fff0a0'],[1,'#a8700e']]);c.lineWidth=5;c.lineCap='round';c.beginPath();c.moveTo(stx,-h*.36);c.lineTo(stx+w*.035,h*.44);c.stroke();
    c.strokeStyle='#ffd84a';c.lineWidth=4;c.beginPath();c.moveTo(stx-w*.055,-h*.45);c.quadraticCurveTo(stx-w*.055,-h*.36,stx,-h*.355);c.quadraticCurveTo(stx+w*.055,-h*.36,stx+w*.055,-h*.45);c.moveTo(stx,-h*.355);c.lineTo(stx,-h*.51);c.stroke();
    c.fillStyle='#ffe27a';for(const x of[stx-w*.055,stx,stx+w*.055]){const y=x===stx?-h*.51:-h*.45;c.beginPath();c.moveTo(x-4,y+2);c.lineTo(x,y-10);c.lineTo(x+4,y+2);c.fill();}
    c.fillStyle='#3ac8ff';c.beginPath();c.arc(stx,-h*.36,4,0,7);c.fill();
    c.save();c.globalCompositeOperation='lighter';c.fillStyle=rg(c,stx,-h*.45,1,w*.16,[[0,'rgba(220,250,255,.8)'],[1,'rgba(80,200,255,0)']]);c.beginPath();c.arc(stx,-h*.45,w*.16,0,7);c.fill();c.restore();
    const hem=h*.44;
    c.fillStyle=lg(c,0,-h*.05,0,hem,[[0,'#3a9aff'],[.5,'#1e5ad8'],[1,'#0e2a8a']]);
    c.beginPath();c.moveTo(-w*.07,-h*.04);c.bezierCurveTo(-w*.13,h*.15,-w*.2+sw*6,h*.32,-w*.25+sw*10,hem);
    const hx0=-w*.25+sw*10,hx1=w*.24+sw*6;
    for(let i=1;i<=6;i++){const x=hx0+(hx1-hx0)*i/6;c.quadraticCurveTo(x-(hx1-hx0)/12,hem+10+Math.sin(t*3+i)*4,x,hem+Math.sin(t*3+i+1)*4);}
    c.bezierCurveTo(w*.2,h*.3,w*.12,h*.12,w*.075,-h*.04);c.closePath();c.fill();c.strokeStyle='rgba(10,20,70,.65)';c.lineWidth=lw*2;c.stroke();
    c.strokeStyle='rgba(170,225,255,.4)';c.lineWidth=2;for(let i=0;i<5;i++){c.beginPath();c.moveTo(-w*.05+i*w*.025,0);c.quadraticCurveTo(-w*.1+i*w*.06+sw*4,h*.25,hx0+(hx1-hx0)*(i+.5)/5,hem-2);c.stroke();}
    c.fillStyle='#ffd84a';for(let i=0;i<=14;i++){const x=hx0+(hx1-hx0)*i/14;c.beginPath();c.arc(x,hem-5+Math.sin(t*3+i*.5)*3,2.2,0,7);c.fill();}
    c.save();c.globalCompositeOperation='lighter';for(let i=0;i<22;i++){const x=Math.sin(i*12.9)*w*.16,y=h*(.05+((i*.37)%1)*.36),a=.5+.5*Math.sin(t*4+i*2.3);c.fillStyle='rgba(220,245,255,'+a+')';c.beginPath();c.arc(x,y,1.6,0,7);c.fill();}c.restore();
    c.fillStyle=SK[1];c.beginPath();c.ellipse(-w*.02,hem+6,w*.025,h*.012,0,0,7);c.ellipse(w*.05,hem+5,w*.025,h*.012,0,0,7);c.fill();
    c.fillStyle=lg(c,0,-h*.28,0,-h*.04,[[0,SK[0]],[1,SK[1]]]);c.beginPath();c.moveTo(-w*.07,-h*.27);c.quadraticCurveTo(-w*.09,-h*.15,-w*.06,-h*.04);c.lineTo(w*.065,-h*.04);c.quadraticCurveTo(w*.09,-h*.15,w*.07,-h*.27);c.quadraticCurveTo(0,-h*.3,-w*.07,-h*.27);c.fill();
    c.fillStyle=lg(c,0,-h*.24,0,-h*.13,[[0,'#3a8aff'],[1,'#1a4ac8']]);c.beginPath();c.moveTo(-w*.078,-h*.205);c.quadraticCurveTo(0,-h*.245,w*.082,-h*.225);c.lineTo(w*.078,-h*.14);c.quadraticCurveTo(0,-h*.12,-w*.078,-h*.145);c.closePath();c.fill();
    c.strokeStyle='#ffd84a';c.lineWidth=2;c.beginPath();c.moveTo(-w*.078,-h*.145);c.quadraticCurveTo(0,-h*.12,w*.078,-h*.14);c.stroke();
    c.fillStyle='rgba(120,200,255,.55)';c.beginPath();c.moveTo(w*.07,-h*.26);c.quadraticCurveTo(w*.0,-h*.18,-w*.06,-h*.06);c.lineTo(-w*.03,-h*.05);c.quadraticCurveTo(w*.03,-h*.17,w*.09,-h*.24);c.fill();
    c.fillStyle=lg(c,0,-h*.06,0,-h*.03,[[0,'#ffe27a'],[1,'#c8801a']]);rr(c,-w*.068,-h*.06,w*.138,h*.026,3);c.fill();c.fillStyle='#3ac8ff';c.beginPath();c.arc(0,-h*.047,3.2,0,7);c.fill();
    c.strokeStyle='#ffd84a';c.lineWidth=2.4;c.beginPath();c.arc(w*.005,-h*.285,w*.045,.35,Math.PI-.35);c.stroke();c.beginPath();c.arc(w*.005,-h*.28,w*.06,.45,Math.PI-.45);c.stroke();c.fillStyle='#3ac8ff';c.beginPath();c.arc(w*.005,-h*.235,3,0,7);c.fill();
    c.strokeStyle=SK[1];c.lineWidth=h*.028;c.lineCap='round';c.beginPath();c.moveTo(-w*.065,-h*.25);c.quadraticCurveTo(-w*.13,-h*.18,stx+w*.01,-h*.12);c.stroke();
    c.fillStyle='#ffd84a';c.beginPath();c.arc(-w*.1,-h*.2,3.5,0,7);c.fill();
    const hx=w*.29,hy=-h*.25+sw*4;
    c.beginPath();c.moveTo(w*.07,-h*.25);c.quadraticCurveTo(w*.17,-h*.19,hx,hy);c.stroke();
    c.fillStyle='#ffd84a';c.fillRect(w*.14,-h*.225,w*.03,h*.016);
    c.save();c.translate(hx+w*.03,hy);c.globalCompositeOperation='lighter';c.fillStyle=rg(c,0,0,1,w*.14,[[0,'rgba(240,255,255,.95)'],[.4,'rgba(120,220,255,.6)'],[1,'rgba(60,160,255,0)']]);c.beginPath();c.arc(0,0,w*.14,0,7);c.fill();
    c.strokeStyle='rgba(200,245,255,.9)';c.lineWidth=2;for(let i=0;i<3;i++){c.beginPath();c.arc(0,0,w*(.04+i*.025),t*3+i*2,t*3+i*2+3.6);c.stroke();}c.restore();
    c.fillStyle=SK[1];c.fillRect(-w*.015,-h*.31,w*.032,h*.04);
    c.fillStyle=lg(c,0,-h*.39,0,-h*.29,[[0,SK[0]],[1,'#ecc09a']]);c.beginPath();c.ellipse(w*.008,-h*.338,w*.052,h*.05,0,0,7);c.fill();
    c.fillStyle='#141830';c.beginPath();c.moveTo(-w*.05,-h*.33);c.quadraticCurveTo(-w*.05,-h*.395,w*.01,-h*.392);c.quadraticCurveTo(w*.06,-h*.39,w*.058,-h*.35);c.quadraticCurveTo(w*.03,-h*.37,w*.0,-h*.365);c.quadraticCurveTo(-w*.03,-h*.35,-w*.05,-h*.30);c.closePath();c.fill();
    c.fillStyle='#1a1428';c.beginPath();c.ellipse(w*.02,-h*.338,w*.011,h*.006,0,0,7);c.ellipse(w*.046,-h*.338,w*.009,h*.006,0,0,7);c.fill();
    c.strokeStyle='#2a1a1a';c.lineWidth=1.2;c.beginPath();c.moveTo(w*.008,-h*.35);c.quadraticCurveTo(w*.02,-h*.355,w*.03,-h*.35);c.moveTo(w*.038,-h*.35);c.quadraticCurveTo(w*.047,-h*.355,w*.056,-h*.35);c.stroke();
    c.fillStyle='#d8405a';c.beginPath();c.ellipse(w*.036,-h*.312,w*.012,h*.0045,0,0,7);c.fill();
    c.fillStyle='#ffd84a';c.beginPath();c.moveTo(-w*.05,-h*.375);for(let i=0;i<=6;i++){const x=-w*.05+i*w*.0183,ht=i===3?h*.075:i%2?h*.03:h*.045;c.lineTo(x-w*.009,-h*.375);c.lineTo(x,-h*.375-ht);}c.lineTo(w*.065,-h*.375);c.lineTo(w*.06,-h*.36);c.lineTo(-w*.048,-h*.36);c.closePath();c.fill();c.strokeStyle='#a8700e';c.lineWidth=1;c.stroke();
    c.fillStyle='#3ac8ff';c.beginPath();c.arc(w*.005,-h*.375,3,0,7);c.fill();
    c.fillStyle='#ffd84a';c.beginPath();c.arc(-w*.03,-h*.31+Math.sin(t*3)*1,2.4,0,7);c.fill();
  };
  K.hammer=(c,w,h,t,f,o)=>{
    const wag=Math.sin(t*5.5+f.ph)*.24,lw=Math.max(1.2,h*.022);
    torpedoFins(c,w,h*.9,t,f,wag,'#56708e');
    c.fillStyle='#56708e';c.strokeStyle=OL;c.lineWidth=lw;c.beginPath();c.moveTo(w*.08,-h*.26);c.quadraticCurveTo(-w*.04,-h*.85,-w*.2,-h*.22);c.closePath();c.fill();c.stroke();
    for(const s of[-1,1]){c.save();c.translate(w*.12,s*h*.2);c.rotate(s*(.6+Math.sin(t*4)*.1));c.fillStyle='#5a7492';c.beginPath();c.moveTo(0,0);c.quadraticCurveTo(-w*.03,s*h*.3,-w*.1,s*h*.4);c.quadraticCurveTo(-w*.01,s*h*.14,w*.06,0);c.fill();c.stroke();c.restore();}
    const B=()=>{c.beginPath();c.moveTo(w*.34,-h*.12);c.bezierCurveTo(w*.15,-h*.3,-w*.1,-h*.26,-w*.36,-h*.06);c.lineTo(-w*.36,h*.06);c.bezierCurveTo(-w*.1,h*.26,w*.15,h*.3,w*.34,h*.12);c.closePath();};
    c.fillStyle=lg(c,0,-h*.3,0,h*.3,[[0,'#56708e'],[.45,'#8aa4c2'],[.55,'#e8f0f8'],[1,'#ffffff']]);B();c.fill();c.stroke();
    const Hd=()=>{c.beginPath();c.moveTo(w*.3,-h*.12);c.quadraticCurveTo(w*.33,-h*.46,w*.4,-h*.5);c.quadraticCurveTo(w*.47,-h*.5,w*.47,-h*.4);c.quadraticCurveTo(w*.5,0,w*.47,h*.4);c.quadraticCurveTo(w*.47,h*.5,w*.4,h*.5);c.quadraticCurveTo(w*.33,h*.46,w*.3,h*.12);c.closePath();};
    c.fillStyle=lg(c,w*.3,0,w*.5,0,[[0,'#6a86a6'],[.6,'#9ab4d0'],[1,'#56708e']]);Hd();c.fill();c.stroke();
    c.strokeStyle='rgba(30,40,70,.45)';c.lineWidth=2;for(let i=0;i<4;i++){c.beginPath();c.moveTo(w*(.24-i*.03),-h*.14);c.quadraticCurveTo(w*(.24-i*.03)-3,0,w*(.24-i*.03),h*.1);c.stroke();}
    for(const s of[-1,1]){c.fillStyle='#0a0a12';c.beginPath();c.arc(w*.44,s*h*.45,Math.max(2.4,h*.045),0,7);c.fill();c.fillStyle='#fff';c.beginPath();c.arc(w*.445,s*h*.45-1,1.2,0,7);c.fill();}
    c.strokeStyle='rgba(40,20,30,.7)';c.lineWidth=lw;c.beginPath();c.moveTo(w*.46,-h*.1);c.quadraticCurveTo(w*.42,0,w*.46,h*.1);c.stroke();
    c.save();c.translate(-w*.06,-h*.42);
    c.globalCompositeOperation='lighter';c.drawImage(FIRE,-w*.5,-h*.1,w*.3,h*.32);c.globalCompositeOperation='source-over';
    c.fillStyle=lg(c,0,-h*.12,0,h*.16,[[0,'#ff7a6a'],[.5,'#d01818'],[1,'#7a0a0a']]);c.beginPath();c.moveTo(-w*.22,0);c.lineTo(w*.16,0);c.quadraticCurveTo(w*.3,h*.06,w*.32,h*.07);c.quadraticCurveTo(w*.3,h*.08,w*.16,h*.14);c.lineTo(-w*.22,h*.14);c.closePath();c.fill();c.strokeStyle=OL;c.lineWidth=lw;c.stroke();
    c.fillStyle='#f4f4f4';c.fillRect(-w*.04,0,w*.035,h*.14);c.fillRect(w*.06,0,w*.02,h*.14);
    c.fillStyle='#5a5a62';c.fillRect(-w*.12,h*.14,w*.03,h*.12);c.fillRect(w*.04,h*.14,w*.03,h*.12);
    c.fillStyle='#8a0a0a';c.beginPath();c.moveTo(-w*.22,0);c.lineTo(-w*.28,-h*.12);c.lineTo(-w*.12,0);c.fill();c.beginPath();c.moveTo(-w*.22,h*.14);c.lineTo(-w*.28,h*.26);c.lineTo(-w*.12,h*.14);c.fill();
    c.restore();
  };
  /* roster tuned to the reference art */
  Object.assign(FT.clown,{n:'ปลาการ์ตูน',c1:'#ff8a1a',c2:'#e8560a',fin:'#ff9a2a',st:'#ffffff',stn:3,stEdge:'#141414',finEdge:'#141414',w:48});
  FT.puffer={n:'ปลาแทงน้ำเงิน',r:3,w:58,ar:.6,sp:[50,75],kind:'bluetang',school:[1,3],wt:14,cap:'s'};
  Object.assign(FT.tang,{n:'ปลาแทงเหลือง',ar:.78,c1:'#fff25a',c2:'#f2b000',fin:'#ffd21a',dorsal:1.1});
  FT.angel={n:'ปลาโมริชไอดอล',r:5,w:66,ar:1,sp:[45,65],kind:'idol',wt:12,cap:'s'};
  FT.anthias={n:'ปลาส้ม',r:2,w:40,ar:.45,sp:[60,90],kind:'gen',c1:'#ff9a4a',c2:'#e8481a',fin:'#ffb85a',school:[4,7],wt:18,cap:'s'};
  FT.parrot={n:'ปลานกแก้ว',r:6,w:74,ar:.5,sp:[45,70],kind:'gen',c1:'#6af0b8',c2:'#1a9a8a',fin:'#ff7ac0',tail:'#ffb0e0',spots:'rgba(255,140,200,.55)',wt:9,cap:'s'};
  FT.angler={n:'แมงกะพรุนเรืองแสง',r:15,w:92,ar:.95,sp:[30,45],kind:'jelly',special:'zap',wt:6,cap:'m'};
  FT.octo={n:'ปลากระเบนราหู',r:20,w:140,ar:.95,sp:[40,58],kind:'ray',wt:5,cap:'m'};
  Object.assign(FT.turtle,{n:'เต่าทะเล',w:150});
  FT.whale.n='ฉลามขาว';FT.sword.n='ปลากระโทงม่วง';
  Object.assign(FT.dragon,{n:'มังกรทอง',evt:'มังกรทองมาแล้ว'});
  Object.assign(FT.queen,{n:'เทพธิดา',evt:'โบนัสเทพธิดา'});
  Object.assign(WARPK,{bluetang:1,idol:1});
  CAPS.s=24;

  /* ====================== RENDER: WORLD ====================== */
  function drawNet(n){
    const k=n.t/n.life,sc=eOutBack(Math.min(1,n.t/.18)),al=k<.6?1:1-(k-.6)/.4,r=n.r*sc,c=ctx;
    c.save();c.translate(n.x,n.y);c.rotate(n.rot+k*.4);c.globalAlpha=al;
    c.fillStyle=rg(c,0,0,r*.2,r,[[0,'rgba(190,240,255,0)'],[1,'rgba(190,240,255,.28)']]);c.beginPath();c.arc(0,0,r,0,7);c.fill();
    c.strokeStyle='rgba(255,255,255,.95)';c.lineWidth=2;c.shadowColor='#7fdcff';c.shadowBlur=8;
    c.beginPath();for(let i=0;i<10;i++){const a=i/10*6.283;c.moveTo(0,0);c.lineTo(Math.cos(a)*r,Math.sin(a)*r);}c.stroke();
    for(let j=1;j<=4;j++){const rj=r*j/4;c.beginPath();for(let i=0;i<=10;i++){const a=i/10*6.283,am=(i+.5)/10*6.283,rm=rj*.86;if(i===0)c.moveTo(Math.cos(a)*rj,Math.sin(a)*rj);else{c.quadraticCurveTo(Math.cos(am-.31)*rm,Math.sin(am-.31)*rm,Math.cos(a)*rj,Math.sin(a)*rj);}}c.stroke();}
    c.restore();
  }
  function drawBullet(b){
    const c=ctx,sk=SKINS[b.skin||0],g=sk.glow;
    if(b.torp){const a=Math.atan2(b.vy,b.vx);c.save();c.translate(b.x,b.y);c.rotate(a);c.globalCompositeOperation='lighter';c.fillStyle='rgba(255,200,80,.8)';c.beginPath();c.moveTo(-14,0);c.lineTo(-40-Math.random()*16,5);c.lineTo(-40-Math.random()*16,-5);c.fill();c.globalCompositeOperation='source-over';
      c.fillStyle=lg(c,0,-9,0,9,[[0,'#fff'],[.5,'#6ad0ff'],[1,'#1a58c0']]);c.beginPath();c.ellipse(0,0,24,9,0,0,7);c.fill();c.fillStyle='#ff4a3a';c.beginPath();c.moveTo(-18,-8);c.lineTo(-30,-15);c.lineTo(-10,-5);c.fill();c.beginPath();c.moveTo(-18,8);c.lineTo(-30,15);c.lineTo(-10,5);c.fill();c.restore();return;}
    c.save();c.globalCompositeOperation='lighter';
    for(let i=0;i<b.trail.length;i++){const p=b.trail[i],k=i/b.trail.length;c.fillStyle='rgba('+g+','+(k*.4)+')';c.beginPath();c.arc(p.x,p.y,b.r*k*.95,0,7);c.fill();}
    c.fillStyle=rg(c,b.x,b.y,1,b.r*2.8,[[0,'rgba(255,255,255,1)'],[.3,'rgba('+g+',.8)'],[1,'rgba('+g+',0)']]);c.beginPath();c.arc(b.x,b.y,b.r*2.8,0,7);c.fill();c.restore();
  }
  function drawParts(){
    const c=ctx;
    for(const p of S.parts){
      const k=clamp(p.life/p.max,0,1);
      if(p.ty==='spark'){c.globalCompositeOperation='lighter';c.globalAlpha=k;c.fillStyle=p.col;c.beginPath();c.arc(p.x,p.y,p.sz*k+.4,0,7);c.fill();}
      else if(p.ty==='star'){c.globalCompositeOperation='lighter';c.globalAlpha=k;c.fillStyle=p.col;c.save();c.translate(p.x,p.y);c.rotate(p.rot+k*3);const s=p.sz*(1+k)*1.4;c.beginPath();for(let i=0;i<8;i++){const r=i%2?s*.35:s;c.lineTo(Math.cos(i*.785)*r,Math.sin(i*.785)*r);}c.closePath();c.fill();c.restore();}
      else if(p.ty==='bubble'){c.globalAlpha=Math.min(1,k*1.5)*.9;const s2=p.sz*2.4;c.drawImage(BSPR,p.x-s2,p.y-s2,s2*2,s2*2);}
      else if(p.ty==='smoke'){c.globalAlpha=k*.5;c.fillStyle=p.col;c.beginPath();c.arc(p.x,p.y,p.sz*(1.6-k*.6),0,7);c.fill();}
      c.globalAlpha=1;c.globalCompositeOperation='source-over';
    }
  }
  function drawCoins(){for(const k of S.cfx){if(k.delay>0)continue;drawCoinSprite(k.x,k.y,k.st?9:11,k.spin);}}
  function drawRings(){
    const c=ctx;c.save();c.globalCompositeOperation='lighter';
    for(const r of S.rings){if(r.soft){const k=r.t/r.max,rad=r.r*eOut(k);c.strokeStyle='rgba(255,255,255,'+(.55*(1-k))+')';c.lineWidth=2.5*(1-k)+.6;c.beginPath();c.ellipse(r.x,r.y,rad,rad*.82,0,0,7);c.stroke();c.strokeStyle='rgba(180,235,255,'+(.3*(1-k))+')';c.beginPath();c.ellipse(r.x,r.y,rad*.72,rad*.6,0,0,7);c.stroke();continue;}const k=r.t/r.max,rad=r.r*eOut(k);c.strokeStyle='rgba('+r.col+','+(1-k)+')';c.lineWidth=(r.thick?26:12)*(1-k)+2;c.beginPath();c.arc(r.x,r.y,rad,0,7);c.stroke();
      c.strokeStyle='rgba(255,255,255,'+(1-k)*.8+')';c.lineWidth=3;c.beginPath();c.arc(r.x,r.y,rad*.96,0,7);c.stroke();}
    for(const e of S.expl){if(e.t<0)continue;const k=e.t/e.max,rad=e.r*(.3+eOut(k)*.9);
      c.fillStyle=rg(c,e.x,e.y,rad*.05,rad,[[0,'rgba(255,255,230,'+(1-k)+')'],[.35,'rgba(255,190,60,'+(1-k)*.9+')'],[.75,'rgba(255,90,20,'+(1-k)*.5+')'],[1,'rgba(255,60,0,0)']]);c.beginPath();c.arc(e.x,e.y,rad,0,7);c.fill();
      c.strokeStyle='rgba(255,230,160,'+(1-k)+')';c.lineWidth=5*(1-k)+1;c.beginPath();c.arc(e.x,e.y,rad*1.05,0,7);c.stroke();}
    for(const b of S.bolts){const a=clamp(b.life/b.max,0,1);c.lineJoin='round';
      for(const pass of[[b.w*3.4,.28],[b.w*1.4,.9],[b.w*.5,1]]){c.strokeStyle=pass[1]===1?'rgba(255,255,255,'+a+')':'rgba('+b.col+','+a*pass[1]+')';c.lineWidth=pass[0];c.beginPath();b.pts.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.stroke();}}
    c.restore();
  }
  function drawRockets(){
    const c=ctx;for(const r of S.rockets){c.save();c.translate(r.x,r.y);c.rotate(r.ang);
      c.globalCompositeOperation='lighter';c.fillStyle='rgba(255,170,40,.9)';c.beginPath();c.moveTo(-10,0);c.lineTo(-24-Math.random()*8,4);c.lineTo(-24-Math.random()*8,-4);c.fill();c.globalCompositeOperation='source-over';
      c.fillStyle=lg(c,0,-6,0,6,[[0,'#ff7a6a'],[1,'#a01010']]);c.beginPath();c.moveTo(-12,-5);c.lineTo(10,-5);c.quadraticCurveTo(20,0,10,5);c.lineTo(-12,5);c.closePath();c.fill();c.fillStyle='#fff';c.fillRect(-2,-5,3,10);
      c.fillStyle='#7a0a0a';c.beginPath();c.moveTo(-10,-5);c.lineTo(-16,-10);c.lineTo(-4,-5);c.fill();c.beginPath();c.moveTo(-10,5);c.lineTo(-16,10);c.lineTo(-4,5);c.fill();c.restore();}
  }
  function drawTexts(){
    for(const x of S.txt){
      const k=1-x.life/x.max,pop=x.pop?eOutBack(Math.min(1,k*6)):1,fade=x.life<.35?x.life/.35:1,s=x.sz*pop;
      ctx.save();ctx.globalAlpha=fade*(x.a||1);
      TX(x.s,x.x,x.y,{s:s,w:700,a:'center',g:[[0,x.col[0]],[1,x.col[1]]],st:x.ghost?'rgba(120,150,255,.8)':'rgba(120,50,0,.95)',sw:Math.max(3,s*.14),sh:x.ghost?null:'rgba(255,170,30,.7)',sb:8});
      ctx.restore();
    }
  }
  /* ====================== RENDER: CANNON ====================== */
  function drawCannon(s,t){
    const c=ctx,sk=SKINS[s.skin],x=s.x,y=s.y;
    c.save();c.translate(x,y);
    /* wings */
    const wg=WINGS[s.wing];
    if(wg){for(const sd of[-1,1]){c.save();c.scale(sd,1);const fl=Math.sin(t*3)*.05;c.rotate(fl);
      c.fillStyle=lg(c,0,-50,70,10,[[0,wg[0]],[1,wg[1]]]);c.beginPath();c.moveTo(24,-8);c.quadraticCurveTo(70,-70,104,-52);c.quadraticCurveTo(90,-38,100,-26);c.quadraticCurveTo(78,-22,84,-8);c.quadraticCurveTo(62,-10,24,6);c.closePath();c.fill();c.strokeStyle='rgba(255,255,255,.7)';c.lineWidth=2;c.stroke();
      c.strokeStyle='rgba(255,255,255,.4)';for(let i=0;i<4;i++){c.beginPath();c.moveTo(26,-4);c.lineTo(100-i*8,-50+i*14);c.stroke();}c.restore();}}
    /* aura */
    const pu=s.pulse;
    c.save();c.globalCompositeOperation='lighter';c.fillStyle=rg(c,0,0,10,70+pu*14,[[0,'rgba('+sk.glow+','+(.35+pu*.3)+')'],[1,'rgba('+sk.glow+',0)']]);c.beginPath();c.arc(0,0,70+pu*14,0,7);c.fill();c.restore();
    /* base ring */
    c.fillStyle=lg(c,0,-36,0,36,[[0,sk.a],[1,sk.b]]);c.beginPath();c.arc(0,0,38,Math.PI,0);c.lineTo(38,32);c.lineTo(-38,32);c.closePath();c.fill();
    c.strokeStyle='rgba(255,255,255,.7)';c.lineWidth=2;c.stroke();
    /* barrel */
    c.save();c.rotate(s.ang);const rc=s.rec*10;
    c.fillStyle=lg(c,-12,0,12,0,[[0,sk.b],[.5,sk.a],[1,sk.b]]);rr(c,-12,-58+rc,24,56,6);c.fill();c.strokeStyle='rgba(0,0,0,.35)';c.lineWidth=1.5;c.stroke();
    c.fillStyle=sk.b;rr(c,-15,-66+rc,30,16,5);c.fill();c.strokeStyle='rgba(255,255,255,.5)';c.stroke();
    c.fillStyle='#111c33';c.beginPath();c.ellipse(0,-66+rc,9,3.5,0,0,7);c.fill();
    c.fillStyle='rgba(255,255,255,.55)';rr(c,-8,-52+rc,4,40,2);c.fill();
    if(s.rec>.5){c.save();c.globalCompositeOperation='lighter';c.fillStyle=rg(c,0,-70,1,26,[[0,'rgba(255,255,220,.95)'],[1,'rgba(255,200,60,0)']]);c.beginPath();c.arc(0,-70,26,0,7);c.fill();c.restore();}
    c.restore();
    /* hub */
    c.fillStyle=rg(c,-6,-8,2,32,[[0,'#fff'],[.35,sk.gem],[1,sk.b]]);c.beginPath();c.arc(0,4,27,0,7);c.fill();c.strokeStyle='#fff';c.lineWidth=3;c.stroke();
    c.strokeStyle='rgba(0,0,0,.25)';c.lineWidth=1.5;c.beginPath();c.arc(0,4,22,0,7);c.stroke();
    TX(fmtK(BETS[s.bet]),0,5,{s:20,w:700,a:'center',st:'rgba(0,30,90,.95)',sw:4});
    c.restore();
  }
  function drawPillar(s,x,t){
    const c=ctx,v=s.twd,h=clamp(Math.sqrt(v/1000)*3.4,0,300);if(v<500)return;
    const n=Math.floor(h/6);
    for(let i=0;i<n;i++){const y=H-48-i*6;c.fillStyle=i%2?'#e0a418':'#ffd84a';rr(c,x-15,y-6,30,7,3);c.fill();c.fillStyle='rgba(255,255,255,.4)';c.fillRect(x-12,y-5,24,1.5);}
    const ty=H-52-n*6;rr(c,x-34,ty-26,68,22,11);c.fillStyle='rgba(20,30,70,.85)';c.fill();c.strokeStyle='#ffd84a';c.lineWidth=2;c.stroke();
    TX(fmtK(v),x,ty-15,{s:15,w:700,a:'center',c:'#ffe27a'});
  }
  /* ====================== RENDER: HUD ====================== */
  S.btns=[];
  function btn(x,y,w,h,fn){S.btns.push({x:x,y:y,w:w,h:h,fn:fn});}
  function gBtn(x,y,w,h,col,label,sz){rr(ctx,x,y,w,h,h/2);ctx.fillStyle=lg(ctx,0,y,0,y+h,[[0,col[0]],[1,col[1]]]);ctx.fill();ctx.strokeStyle='rgba(255,255,255,.75)';ctx.lineWidth=2;ctx.stroke();if(label)TX(label,x+w/2,y+h/2+1,{s:sz||15,w:700,a:'center',st:'rgba(60,20,0,.8)',sw:3});}
  function iconBtn(x,y,r,emoji,label,col,fn,badge){
    const c=ctx;c.save();c.fillStyle=lg(c,0,y-r,0,y+r,[[0,col[0]],[1,col[1]]]);c.beginPath();c.arc(x,y,r,0,7);c.fill();c.strokeStyle='#ffe9a0';c.lineWidth=2.5;c.stroke();
    c.font=(r*1.05)+'px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(emoji,x,y+1);c.restore();
    if(label)TX(label,x,y+r+9,{s:11,w:600,a:'center',st:'rgba(0,0,0,.85)',sw:3});
    if(badge)TX(badge,x,y-r-2,{s:11,w:700,a:'center',c:'#9fffa0',st:'rgba(0,0,0,.9)',sw:3});
    if(fn)btn(x-r,y-r,r*2,r*2+14,fn);
  }
  function drawPlayerBar(s,x,y,w,flip){
    const c=ctx;
    rr(c,x,y,w,34,12);c.fillStyle=lg(c,0,y,0,y+34,[[0,'#2a6ad8'],[1,'#12308a']]);c.fill();c.strokeStyle='#8fd3ff';c.lineWidth=2;c.stroke();
    /* level badge */
    c.fillStyle=lg(c,0,y-8,0,y+14,[[0,'#ffe27a'],[1,'#e08a10']]);c.beginPath();c.arc(x+16,y+4,13,0,7);c.fill();c.strokeStyle='#fff';c.lineWidth=1.5;c.stroke();TX(''+s.lv,x+16,y+5,{s:13,w:700,a:'center',c:'#5a2a00'});
    TX(s.name,x+36,y+10,{s:12,w:600,st:'rgba(0,0,0,.7)',sw:3});
    /* coin */
    c.fillStyle=lg(c,0,y+15,0,y+31,[[0,'#fff7b0'],[1,'#e09a10']]);c.beginPath();c.arc(x+44,y+24,7.5,0,7);c.fill();c.strokeStyle='#8a4a00';c.lineWidth=1.5;c.stroke();
    TX(fmt(s.disp),x+56,y+24,{s:16,w:700,st:'rgba(0,20,80,.9)',sw:3.5});
  }
  function drawHUD(t){
    const c=ctx;S.btns.length=0;
    /* top marquee */
    c.fillStyle='rgba(0,0,0,.62)';c.fillRect(170,58,860,20);
    c.save();c.beginPath();c.rect(170,58,860,20);c.clip();
    if(S.mq.cur){TX(S.mq.cur.pre,S.mq.x,68,{s:14,w:600,c:'#7fe0ff'});TX(S.mq.cur.txt,S.mq.x+S.mq.w1,68,{s:14,w:500,c:'#fff'});}
    c.restore();
    /* jackpot */
    const ji=Math.floor(t/3)%3,jp=JP[ji],jcol={o:['#ffc03a','#d86a10'],g:['#5ae070','#1a8a30'],b:['#4ab0ff','#1a56c8']}[jp.c];
    rr(c,6,6,106,46,8);c.fillStyle=lg(c,0,6,0,52,[[0,jcol[0]],[1,jcol[1]]]);c.fill();c.strokeStyle='#fff3b0';c.lineWidth=2.5;c.stroke();
    TX('รางวัลสะสม',59,19,{s:11,w:600,a:'center',st:'rgba(0,0,0,.6)',sw:3});TX(fmt(jp.v),59,38,{s:14,w:700,a:'center',st:'rgba(60,20,0,.85)',sw:3.5,g:GOLDG});
    iconBtn(142,26,19,'👑','บันทึกรางวัล',['#ffd84a','#c8801a'],()=>openModal('log'));
    iconBtn(200,26,19,'🏅','ชิงรางวัลน่าโชค',['#ff9a3a','#c8501a'],()=>openModal('lucky'));
    /* top center emblem */
    c.save();c.translate(640,0);
    c.fillStyle=lg(c,0,0,0,56,[[0,'#8a2aa8'],[1,'#3a1070']]);c.beginPath();c.moveTo(-150,0);c.lineTo(150,0);c.lineTo(132,46);c.quadraticCurveTo(0,60,-132,46);c.closePath();c.fill();c.strokeStyle='#ffd84a';c.lineWidth=3;c.stroke();
    c.strokeStyle='#ffe27a';c.lineWidth=3;c.beginPath();c.moveTo(0,8);c.lineTo(0,30);c.moveTo(-10,14);c.lineTo(-10,8);c.moveTo(10,14);c.lineTo(10,8);c.moveTo(-10,14);c.quadraticCurveTo(0,22,10,14);c.stroke();
    for(let i=0;i<5;i++){c.fillStyle=i<S.tdots?'#ffe27a':'rgba(255,255,255,.18)';if(i<S.tdots){c.shadowColor='#ffd84a';c.shadowBlur=8;}c.beginPath();c.arc(-48+i*24,36,6,0,7);c.fill();c.shadowBlur=0;c.strokeStyle='#ffd84a';c.lineWidth=1.5;c.stroke();}
    c.restore();
    TX('ยิงปลาใหญ่ครบ 8 ตัว = 1 แต้ม',640,52,{s:10,w:500,a:'center',c:'#e8d8ff',st:'rgba(0,0,0,.7)',sw:3});
    /* right icons */
    iconBtn(880,26,18,'🦋','ภารกิจปีก',['#4ab0ff','#1a56c8'],()=>openModal('mission'),'14วัน');
    iconBtn(942,26,18,'🐼','ไหว้รวย',['#ff7a5a','#c82a2a'],()=>openModal('lucky'));
    iconBtn(1010,26,18,'🎁','แพ็คเกจสุดคุ้ม',['#ffb03a','#d8601a'],()=>openModal('pack'),pad2(Math.floor(S.pkgT/3600)%100)+':'+pad2(Math.floor(S.pkgT/60)%60)+':'+pad2(Math.floor(S.pkgT)%60));
    iconBtn(1088,26,18,'🏆','ตารางอันดับ',['#ffd84a','#c8801a'],()=>openModal('rank'));
    iconBtn(1160,26,18,'🪙','เหรียญฟรี',['#58e070','#1a9a30'],()=>openModal('free'));
    iconBtn(1220,26,18,'⚙','ตั้งค่า',['#8aa0c8','#44587a'],()=>openModal('set'));
    /* contest panel */
    const ct=S.ct;
    if(S.panelOpen){
      const px=6,py=88;
      rr(c,px,py,150,232,10);c.fillStyle=lg(c,0,py,0,py+232,[[0,'#7a30b8'],[1,'#3a1470']]);c.fill();c.strokeStyle='#d8a8ff';c.lineWidth=2.5;c.stroke();
      const tl=Math.max(0,Math.ceil(ct.t));
      TX(pad2(Math.floor(tl/60))+':'+pad2(tl%60),px+34,py+14,{s:14,w:700,c:'#e8d8ff'});
      TX(ct.ph==='run'?'กำลังแข่งขัน!':ct.ph==='pre'?'การแข่งขันกำลังจะเริ่ม':'สรุปผล',px+75,py+36,{s:12,w:600,a:'center',c:'#fff',st:'rgba(0,0,0,.6)',sw:3});
      TX('แข่งคะแนนชนะ',px+75,py+50,{s:11,w:500,a:'center',c:'#ffe9a0'});
      rr(c,px+8,py+58,134,92,8);c.fillStyle='#d8601a';c.fill();c.strokeStyle='#ffd0a0';c.lineWidth=2;c.stroke();
      c.save();c.translate(px+75,py+96);c.fillStyle=lg(c,0,-30,0,30,[[0,'#fff2a0'],[1,'#e09a10']]);c.beginPath();c.moveTo(-24,-30);c.lineTo(24,-30);c.quadraticCurveTo(24,6,0,10);c.quadraticCurveTo(-24,6,-24,-30);c.fill();c.fillRect(-4,8,8,14);c.fillRect(-16,22,32,6);c.strokeStyle='#ffe27a';c.lineWidth=3;c.beginPath();c.arc(-24,-18,9,1.6,4.7);c.arc(24,-18,9,4.7,1.6);c.stroke();c.restore();
      rr(c,px+14,py+128,122,18,9);c.fillStyle='rgba(60,10,90,.85)';c.fill();
      TX(fmt(ct.ph==='res'?ct.you:ct.you),px+75,py+137,{s:13,w:700,a:'center',c:'#ffe27a'});
      TX('คู่แข่ง '+fmtK(ct.bot),px+75,py+160,{s:11,w:500,a:'center',c:'#d8c8ff'});
      const lead=ct.you>=ct.bot,bw=122,tot=Math.max(1,ct.you+ct.bot);
      rr(c,px+14,py+168,bw,8,4);c.fillStyle='rgba(0,0,0,.45)';c.fill();rr(c,px+14,py+168,Math.max(6,bw*ct.you/tot),8,4);c.fillStyle=lead?'#5af070':'#ffb04a';c.fill();
      rr(c,px+8,py+184,134,40,9);c.fillStyle=lg(c,0,py+184,0,py+224,[[0,'#ff7ad0'],[1,'#a02aa8']]);c.fill();c.strokeStyle='#ffd0f0';c.lineWidth=2;c.stroke();
      TX('คุณอยู่ที่ห้องแข่งทั่วไป',px+75,py+198,{s:10.5,w:600,a:'center',st:'rgba(60,0,60,.8)',sw:3});TX('อัพไปห้องมืออาชีพ',px+75,py+214,{s:11,w:700,a:'center',c:'#fff3b0',st:'rgba(60,0,60,.8)',sw:3});
      btn(px+8,py+184,134,40,()=>openModal('pro'));
      btn(px+120,py,30,22,()=>{S.panelOpen=false;});
      TX('⌃',px+135,py+10,{s:16,a:'center',c:'#e8d8ff'});
    }else{
      rr(c,6,88,34,34,9);c.fillStyle='#7a30b8';c.fill();c.strokeStyle='#d8a8ff';c.lineWidth=2;c.stroke();TX('🏆',23,106,{s:18,a:'center'});btn(6,88,34,34,()=>{S.panelOpen=true;});
    }
    /* right side tools */
    const sx=1236;
    rr(c,sx-22,84,44,44,12);c.fillStyle=lg(c,0,84,0,128,[[0,'#4ab0ff'],[1,'#1a56c8']]);c.fill();c.strokeStyle='#fff';c.lineWidth=2.5;c.stroke();TX(S.sideOpen?'«':'»',sx,106,{s:26,w:700,a:'center'});btn(sx-22,84,44,44,()=>{S.sideOpen=!S.sideOpen;sfx('click');});
    if(S.sideOpen){
      function tool(y,on,emoji,label,fn){rr(c,sx-22,y,44,44,10);c.fillStyle=on?lg(c,0,y,0,y+44,[[0,'#ffd84a'],[1,'#e8801a']]):lg(c,0,y,0,y+44,[[0,'#2a6ad8'],[1,'#12308a']]);c.fill();c.strokeStyle=on?'#fff':'#8fd3ff';c.lineWidth=2.5;c.stroke();c.font='22px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(emoji,sx,y+22);TX(label,sx,y+55,{s:10,w:600,a:'center',st:'rgba(0,0,0,.85)',sw:3});btn(sx-22,y,44,44,fn);}
      tool(136,S.lockOn,'🎯','ล็อกเป้า',()=>{S.lockOn=!S.lockOn;if(!S.lockOn)S.lockT=null;sfx('click');toast(S.lockOn?'ล็อกเป้า: แตะที่ปลาเพื่อเลือกเป้าหมาย':'ปิดล็อกเป้า');});
      tool(206,S.x2,'⚡','ยิงเร็ว x2',()=>{S.x2=!S.x2;sfx('click');});
      tool(276,false,'🎣','เก็บของ',()=>openModal('shop'));
    }
    /* side shortcuts */
    rr(c,1170,300,78,22,11);c.fillStyle=lg(c,0,300,0,322,[[0,'#ffb12e'],[1,'#e8650a']]);c.fill();c.strokeStyle='#ffe0a0';c.lineWidth=2;c.stroke();TX('เพิ่มซีทันที',1209,311,{s:12,w:700,a:'center',st:'rgba(90,30,0,.8)',sw:3});btn(1170,300,78,22,()=>openModal('free'));
    /* lock target ring */
    if(S.lockOn&&S.lockT&&!S.lockT.dead){const f=S.lockT,r=Math.max(fishRX(f),fishRY(f))+14+Math.sin(t*6)*3;c.save();c.translate(f.x,f.y);c.rotate(t*2);c.strokeStyle='#ff4a3a';c.lineWidth=3;c.shadowColor='#ff3a2a';c.shadowBlur=10;c.beginPath();for(let i=0;i<4;i++){c.arc(0,0,r,i*1.571+.2,i*1.571+1.2);c.stroke();c.beginPath();}c.restore();c.save();c.strokeStyle='#ff4a3a';c.lineWidth=2;c.beginPath();c.moveTo(f.x-r-8,f.y);c.lineTo(f.x-r+8,f.y);c.moveTo(f.x+r-8,f.y);c.lineTo(f.x+r+8,f.y);c.moveTo(f.x,f.y-r-8);c.lineTo(f.x,f.y-r+8);c.moveTo(f.x,f.y+r-8);c.lineTo(f.x,f.y+r+8);c.stroke();c.restore();}
    /* bottom bars */
    drawPlayerBar(you,6,H-40,214,false);
    drawPlayerBar(bot,W-250,H-40,244,false);
    c.fillStyle='#ffc83a';c.fillRect(0,0,0,0);
    /* free coin / lucky buttons beside bars */
    iconBtn(238,H-24,15,'🪙','',['#58e070','#1a9a30'],()=>openModal('free'));
    /* ranking dot */
    /* cannon controls */
    const cx=you.x,cy=H-24;
    for(const sd of[-1,1]){const bx=cx+sd*84;rr(c,bx-16,cy-14,32,28,10);c.fillStyle=lg(c,0,cy-14,0,cy+14,[[0,'#ffb12e'],[1,'#e8650a']]);c.fill();c.strokeStyle='#ffe0a0';c.lineWidth=2;c.stroke();TX(sd<0?'−':'+',bx,cy,{s:24,w:700,a:'center',st:'rgba(90,30,0,.8)',sw:3});
      btn(bx-24,cy-22,48,44,()=>{const lo=ROOMS[S.room].lo,hi=ROOMS[S.room].hi;you.bet=clamp(you.bet+sd,lo,hi);sfx('click');});}
    /* skills */
    function skill(x,i,emoji,name,fn,col){
      const y=H-52,sz=48,cd=S.skillCd[i];rr(c,x,y,sz,sz,9);c.fillStyle=lg(c,0,y,0,y+sz,[[0,col[0]],[1,col[1]]]);c.fill();c.strokeStyle='#bfe9ff';c.lineWidth=2.5;c.stroke();
      c.font='24px sans-serif';c.textAlign='center';c.textBaseline='middle';c.globalAlpha=S.skillN[i]>0?1:.4;c.fillText(emoji,x+sz/2,y+sz/2-3);c.globalAlpha=1;
      TX(name,x+sz/2,y+sz-7,{s:10,w:600,a:'center',st:'rgba(0,20,70,.9)',sw:3});
      c.fillStyle='#ff4a3a';c.beginPath();c.arc(x+sz-3,y+4,9,0,7);c.fill();c.strokeStyle='#fff';c.lineWidth=1.5;c.stroke();TX(''+S.skillN[i],x+sz-3,y+5,{s:11,w:700,a:'center'});
      if(cd>0){c.fillStyle='rgba(0,10,40,.65)';c.beginPath();c.moveTo(x+sz/2,y+sz/2);c.arc(x+sz/2,y+sz/2,sz,-1.571,-1.571+6.283*cd/(i?6:8));c.closePath();c.save();rr(c,x,y,sz,sz,9);c.clip();c.fill();c.restore();}
      btn(x,y,sz,sz,fn);}
    skill(cx-236,0,'❄','แช่แข็ง',useFreeze,['#58c8ff','#1a58c8']);
    skill(cx-184,1,'🚀','ตอร์ปิโด',useTorpedo,['#58a8ff','#2a3ac8']);
    if(S.atom>0){const x=cx+118,y=H-56;c.save();c.translate(x+26,y+28);const pl=1+Math.sin(t*8)*.06;c.scale(pl,pl);c.fillStyle=lg(c,0,-28,0,28,[[0,'#ff7a5a'],[1,'#c01010']]);c.beginPath();c.arc(0,0,28,0,7);c.fill();c.strokeStyle='#ffe27a';c.lineWidth=3;c.stroke();c.font='28px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText('☢',0,-2);c.restore();TX(Math.ceil(S.atom)+'s',x+26,y+54,{s:11,w:700,a:'center',c:'#ffe27a',st:'rgba(0,0,0,.9)',sw:3});btn(x,y,52,52,useAtom);}
    /* pillars */
    drawPillar(you,cx-286,t);drawPillar(bot,bot.x+150,t);
    /* tag over you */
    if(S.youTag>0){const bob=Math.sin(t*5)*4,tx=cx,ty=H-150+bob;TX('ตำแหน่งของคุณ',tx,ty-16,{s:19,w:700,a:'center',c:'#fff',st:'rgba(0,50,120,.95)',sw:5,sh:'#5ad0ff',sb:10});c.fillStyle='#ffd84a';c.beginPath();c.moveTo(tx-12,ty+2);c.lineTo(tx+12,ty+2);c.lineTo(tx,ty+16);c.closePath();c.fill();}
    /* toast */
    if(S.toast){const k=S.toast.t,a=k<.2?k/.2:k>2.2?(2.6-k)/.4:1;c.save();c.globalAlpha=clamp(a,0,1);const w=Math.min(700,40+S.toast.s.length*14);rr(c,W/2-w/2,H-128,w,34,17);c.fillStyle='rgba(10,20,60,.85)';c.fill();c.strokeStyle='#8fd3ff';c.lineWidth=2;c.stroke();TX(S.toast.s,W/2,H-111,{s:15,w:500,a:'center'});c.restore();}
  }

  /* ====================== SPRITES: bubble / coin ====================== */
  const BSPR=(function(){const s=document.createElement('canvas');s.width=s.height=64;const g=s.getContext('2d');
    g.fillStyle=rg(g,32,32,6,30,[[0,'rgba(190,235,255,.02)'],[.75,'rgba(190,235,255,.10)'],[.93,'rgba(215,245,255,.55)'],[1,'rgba(255,255,255,.05)']]);g.beginPath();g.arc(32,32,30,0,7);g.fill();
    g.strokeStyle='rgba(255,255,255,.55)';g.lineWidth=1.6;g.beginPath();g.arc(32,32,29,0,7);g.stroke();
    g.fillStyle='rgba(255,255,255,.9)';g.beginPath();g.ellipse(21,19,7,4,-.7,0,7);g.fill();
    g.fillStyle='rgba(255,255,255,.4)';g.beginPath();g.ellipse(43,45,4,2.2,-.7,0,7);g.fill();return s;})();
  const GLOWY=(function(){const s=document.createElement('canvas');s.width=s.height=64;const g=s.getContext('2d');g.fillStyle=rg(g,32,32,0,32,[[0,'rgba(255,225,110,.85)'],[.4,'rgba(255,190,50,.35)'],[1,'rgba(255,170,30,0)']]);g.fillRect(0,0,64,64);return s;})();
  const COINSPR=(function(){const s=document.createElement('canvas');s.width=s.height=48;const g=s.getContext('2d');g.translate(24,24);
    g.fillStyle=lg(g,-20,-20,20,20,[[0,'#fff6a8'],[.45,'#ffc83a'],[1,'#b8680a']]);g.beginPath();g.arc(0,0,22,0,7);g.fill();g.strokeStyle='#7a3e00';g.lineWidth=2;g.stroke();
    g.strokeStyle='rgba(120,60,0,.55)';g.lineWidth=2;g.beginPath();g.arc(0,0,16.5,0,7);g.stroke();
    g.fillStyle=lg(g,0,-14,0,14,[[0,'#ffe27a'],[1,'#e0900e']]);g.beginPath();g.arc(0,0,15,0,7);g.fill();
    g.fillStyle='rgba(150,80,0,.75)';g.beginPath();for(let i=0;i<10;i++){const r=i%2?4.6:10,a=-Math.PI/2+i*Math.PI/5;g.lineTo(Math.cos(a)*r,Math.sin(a)*r);}g.closePath();g.fill();
    g.strokeStyle='rgba(255,255,255,.7)';g.lineWidth=2.4;g.lineCap='round';g.beginPath();g.arc(0,0,19,Math.PI*1.1,Math.PI*1.45);g.stroke();return s;})();
  function drawCoinSprite(x,y,s,spin){
    const c=ctx,cs=Math.cos(spin),w=Math.abs(cs);
    c.save();c.translate(x,y);
    c.globalCompositeOperation='lighter';c.globalAlpha=.4;c.drawImage(GLOWY,-s*2.2,-s*2.2,s*4.4,s*4.4);c.globalCompositeOperation='source-over';c.globalAlpha=1;
    if(w<.2){c.fillStyle='#a86a10';c.fillRect(-1.8,-s,3.6,s*2);c.fillStyle='#ffd84a';c.fillRect(-.7,-s,1.4,s*2);}
    else{c.scale(cs<0?-w:w,1);c.drawImage(COINSPR,-s,-s,s*2,s*2);}
    if(Math.sin(spin*.5)>.94){c.globalCompositeOperation='lighter';c.fillStyle='rgba(255,255,230,.9)';c.beginPath();for(let i=0;i<8;i++){const r=i%2?s*.18:s*.9,a=i*Math.PI/4;c.lineTo(Math.cos(a)*r,Math.sin(a)*r);}c.closePath();c.fill();}
    c.restore();
  }

  /* ====================== BANNERS ====================== */
  const SCH={blue:['#0a2a8a','#2a6aff','#9fe0ff'],red:['#7a0a0a','#e02a1a','#ffb09a'],fire:['#8a2a00','#ff7a1a','#ffe09a']};
  function drawBand(t){
    const b=S.band;if(!b)return;const c=ctx,u=b.t/b.dur;
    const inK=eOut(Math.min(1,b.t/.35)),outK=u>.86?(u-.86)/.14:0,sc=SCH[b.scheme]||SCH.blue;
    const cy=H*.46,hh=96*(inK<1?inK:1)*(1-outK);if(hh<4)return;
    c.save();c.globalAlpha=1-outK;
    c.fillStyle=lg(c,0,cy-hh/2,0,cy+hh/2,[[0,'rgba('+hex(sc[0])+',.0)'],[.12,'rgba('+hex(sc[0])+',.92)'],[.5,'rgba('+hex(sc[1])+',.96)'],[.88,'rgba('+hex(sc[0])+',.92)'],[1,'rgba('+hex(sc[0])+',0)']]);
    c.fillRect(0,cy-hh/2,W,hh);
    c.globalCompositeOperation='lighter';c.strokeStyle='rgba('+hex(sc[2])+',.55)';c.lineWidth=2;
    for(let i=0;i<9;i++){const x=((t*500*(1+i*.1)+i*190)%(W+300))-150;c.beginPath();c.moveTo(x,cy-hh/2+8+i*9%hh);c.lineTo(x-120,cy-hh/2+8+i*9%hh);c.stroke();}
    c.globalCompositeOperation='source-over';
    c.fillStyle=sc[2];c.fillRect(0,cy-hh/2,W,3);c.fillRect(0,cy+hh/2-3,W,3);
    const tx=lerp(-W*.4,W/2,inK)+(outK>0?outK*W*.5:0);
    c.font='64px sans-serif';c.textAlign='center';c.textBaseline='middle';
    const ic={queen:'👸',poseidon:'🔱',dragon:'🐉',rocket:'🚀',trident:'🔱'}[b.icon]||'🐟';
    const sc2=1+Math.sin(t*10)*.04;c.save();c.translate(tx-370,cy);c.scale(sc2,sc2);c.fillText(ic,0,0);c.restore();
    TX(b.title,tx+30,cy,{s:b.title.length>20?40:50,w:700,a:'center',g:GOLDG,st:'rgba(16,30,110,.95)',sw:8,sh:'#ffb030',sb:14});
    c.restore();
  }
  function hex(h){return parseInt(h.slice(1,3),16)+','+parseInt(h.slice(3,5),16)+','+parseInt(h.slice(5,7),16);}
  function sunburst(x,y,r,t,col,a){const c=ctx;c.save();c.translate(x,y);c.rotate(t*.5);c.globalCompositeOperation='lighter';c.fillStyle='rgba('+col+','+a+')';for(let i=0;i<14;i++){c.rotate(Math.PI*2/14);c.beginPath();c.moveTo(0,0);c.lineTo(r,-r*.11);c.lineTo(r,r*.11);c.closePath();c.fill();}c.restore();}
  function drawWin(t){
    const w=S.winB;if(!w)return;const c=ctx,u=w.t/w.dur;
    const inK=eOutBack(Math.min(1,w.t/.45)),outK=u>.88?(u-.88)/.12:0,sc=inK*(1-outK*.4);if(sc<.02)return;
    const cx=W/2,cy=H*.46;
    c.save();c.globalAlpha=1-outK;
    const big=w.tier==='C'||w.tier==='W'||w.tier==='L';
    const amt=Math.round(w.amount*eOut(Math.min(1,w.t/1.1)));
    if(w.tier!=='A'){c.fillStyle='rgba(10,0,40,'+(.45*(1-outK))+')';c.fillRect(0,0,W,H);}
    sunburst(cx,cy,w.tier==='A'?260:430,t,w.tier==='C'?'255,120,60':w.tier==='B'?'255,220,100':'255,235,160',.16);
    c.translate(cx,cy);c.scale(sc,sc);
    if(w.tier==='A'){
      c.fillStyle=lg(c,0,-60,0,60,[[0,'#a050f0'],[1,'#5a1aa8']]);rr(c,-210,-38,420,76,38);c.fill();c.strokeStyle='#ffe27a';c.lineWidth=4;c.stroke();
      TX(w.title,0,-60,{s:34,w:700,a:'center',g:GOLDG,st:'rgba(16,30,110,.95)',sw:7,sh:'#ffb030',sb:10});
      TX(fmt(amt),0,0,{s:52,w:700,a:'center',g:GOLDG,st:'rgba(16,30,110,.95)',sw:8});
    }else{
      /* shield / ribbon */
      const col=w.tier==='C'?['#ff6a4a','#a01010']:w.tier==='B'?['#a050f0','#4a1a98']:['#ffb12e','#c8650a'];
      c.fillStyle=lg(c,0,-170,0,100,[[0,'#fff2a0'],[.5,'#ffc83a'],[1,'#c8801a']]);c.beginPath();c.arc(0,-30,140,0,7);c.fill();
      c.fillStyle=lg(c,0,-150,0,100,[[0,col[0]],[1,col[1]]]);c.beginPath();c.arc(0,-30,122,0,7);c.fill();
      c.strokeStyle='#fff2a0';c.lineWidth=4;c.stroke();
      c.font='110px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(w.icon,0,-34+Math.sin(t*5)*4);
      TX(w.title,0,-168,{s:w.title.length>10?48:60,w:700,a:'center',g:GOLDG,st:'rgba(16,30,110,.95)',sw:9,sh:'#ffb030',sb:16});
      c.fillStyle=lg(c,0,70,0,130,[[0,col[0]],[1,col[1]]]);c.beginPath();c.moveTo(-290,86);c.lineTo(-230,86);c.lineTo(-230,128);c.lineTo(-290,128);c.lineTo(-262,107);c.closePath();c.fill();c.beginPath();c.moveTo(290,86);c.lineTo(230,86);c.lineTo(230,128);c.lineTo(290,128);c.lineTo(262,107);c.closePath();c.fill();
      c.fillStyle=lg(c,0,64,0,132,[[0,col[0]],[1,col[1]]]);rr(c,-240,64,480,66,12);c.fill();c.strokeStyle='#ffe27a';c.lineWidth=3;c.stroke();
      TX(fmt(amt),0,98,{s:50,w:700,a:'center',g:GOLDG,st:'rgba(16,30,110,.95)',sw:8});
      if(w.sub)TX(w.sub,0,150,{s:20,w:600,a:'center',c:'#fff',st:'rgba(0,0,0,.8)',sw:4});
    }
    c.restore();
  }
  /* ====================== INPUT ====================== */
  const PTR={down:false,x:W/2,y:0,ui:false};
  function pickFishAt(x,y){let best=null,bd=1e9;for(const f of S.fish){if(f.dead||f.gone)continue;if(hitFishAt(f,x,y,22)){const d=f.d.r*-1;if(d<bd||!best){bd=d;best=f;}}}return best;}
  stage.addEventListener('pointerdown',e=>{
    auInit();if(AU.c&&AU.c.state==='suspended')AU.c.resume();
    if(S.mode!=='play'||S.paused)return;e.preventDefault();
    const p=toLogical(e);PTR.x=p.x;PTR.y=p.y;
    for(let i=S.btns.length-1;i>=0;i--){const b=S.btns[i];if(p.x>=b.x&&p.x<=b.x+b.w&&p.y>=b.y&&p.y<=b.y+b.h){PTR.ui=true;PTR.down=false;b.fn();return;}}
    PTR.ui=false;PTR.down=true;you.angT=aimAngle(you,p.x,p.y);
    if(S.lockOn){const f=pickFishAt(p.x,p.y);if(f)S.lockT=f;}
    try{stage.setPointerCapture(e.pointerId);}catch(_){}
  },{passive:false});
  stage.addEventListener('pointermove',e=>{
    if(S.mode!=='play'||S.paused)return;const p=toLogical(e);PTR.x=p.x;PTR.y=p.y;
    if(!PTR.ui&&(PTR.down||e.pointerType==='mouse')&&!(S.lockOn&&S.lockT))you.angT=aimAngle(you,p.x,p.y);
  });
  const endP=()=>{PTR.down=false;PTR.ui=false;};
  stage.addEventListener('pointerup',endP);stage.addEventListener('pointercancel',endP);
  window.addEventListener('blur',endP);
  document.addEventListener('contextmenu',e=>e.preventDefault());
  /* ====================== MODALS ====================== */
  const MD=$('modal');
  function closeModal(){MD.classList.remove('on');MD.innerHTML='';S.paused=false;PTR.down=false;}
  function panel(title,body,w){MD.innerHTML='<div class="panel" style="'+(w?'width:'+w+'px':'')+'"><div class="ttl">'+title+'</div><div class="x" id="mx">✕</div>'+body+'</div>';MD.classList.add('on');S.paused=(S.mode==='play');$('mx').onclick=()=>{sfx('click');closeModal();};}
  function tblRows(rows){return '<table class="tbl">'+rows.map(r=>'<tr'+(r.me?' class="me"':'')+'>'+r.c.map((x,i)=>'<td'+(i===r.c.length-1?' class="n"':'')+'>'+x+'</td>').join('')+'</tr>').join('')+'</table>';}
  function prevCannon(cvs,i){
    const g=cvs.getContext('2d'),old=ctx;ctx=g;g.clearRect(0,0,cvs.width,cvs.height);
    g.fillStyle=rg(g,115,110,5,120,[[0,'#4a7ae0'],[1,'#14267a']]);g.fillRect(0,0,cvs.width,cvs.height);
    drawCannon({x:115,y:112,ang:0,rec:0,pulse:.4,skin:i,wing:S.wing,bet:5,me:true},performance.now()/1000);ctx=old;
  }
  function skinOpen(i){return i===0||(S.kills>=SKINS[i].req)||(S.unl&&S.unl[i]);}
  const WREQ=[0,30,100,250];
  function openModal(k){
    sfx('click');
    if(host&&(k==='free'||k==='lucky'||k==='pack'||k==='shop')){toast('ใน WINNER 69 ใช้เครดิตจริงจากกระเป๋า — ไม่มีเหรียญฟรี');return;}
    if(host&&k==='pro'){toast('เปลี่ยนห้องได้จากหน้าล็อบบี้');return;}
    const me=you;
    if(k==='log'){
      const rows=S.log.length?S.log.slice(0,14).map(l=>({c:[new Date(l.t).toLocaleTimeString('th-TH'),l.n,'+'+fmt(l.v)]})):[{c:['—','ยังไม่มีรางวัลใหญ่','ยิงปลาตัวใหญ่เพื่อบันทึก']}];
      panel('บันทึกรางวัล','<div class="pb">'+tblRows(rows)+'</div>');
    }else if(k==='rank'){
      const rows=[{n:me.name,v:me.coins,me:1},{n:bot.name,v:bot.coins}].concat(NAMES.slice(0,7).map((n,i)=>({n:n,v:Math.round((38-i*3.4)*1e6+i*77777)})));
      rows.sort((a,b)=>b.v-a.v);
      panel('ตารางอันดับ','<div class="pb">'+tblRows(rows.slice(0,10).map((r,i)=>({me:r.me,c:['#'+(i+1),r.n,fmt(r.v)]})))+'</div>');
    }else if(k==='cannon'){
      let h='<div class="tabs"><button class="on">ปืนใหญ่</button><button id="twing">ปีก</button></div><div class="pb"><div class="cards">';
      SKINS.forEach((s,i)=>{const o=skinOpen(i);h+='<div class="card'+(S.skin===i?' sel':'')+'"><canvas id="pc'+i+'" width="230" height="150"></canvas><b>'+s.n+'</b><small>'+s.desc+(o?'':'<br>ปลดล็อกเมื่อยิงปลาครบ '+SKINS[i].req+' ตัว ('+S.kills+')')+'</small><button class="obtn" data-i="'+i+'"'+(o?'':' disabled')+'>'+(S.skin===i?'ใช้งานอยู่':o?'เลือกใช้':'ล็อก')+'</button></div>';});
      h+='</div></div>';panel('กรอบเลือกปืนใหญ่',h,880);
      SKINS.forEach((s,i)=>prevCannon($('pc'+i),i));
      MD.querySelectorAll('.obtn').forEach(b=>b.onclick=()=>{S.skin=+b.dataset.i;you.skin=S.skin;sfx('big');save();openModal('cannon');});
      $('twing').onclick=()=>openModal('mission');
    }else if(k==='mission'){
      let h='<div class="pb"><p>ยิงปลาให้ครบเพื่อปลดล็อกปีกให้ปืนใหญ่ (ยิงแล้ว <b>'+S.kills+'</b> ตัว)</p><div class="cards">';
      WINGS.forEach((w,i)=>{const o=S.kills>=WREQ[i];h+='<div class="card'+(S.wing===i?' sel':'')+'"><b>'+WNAME[i]+'</b><small>'+(o?'พร้อมใช้งาน':'ต้องยิงปลาครบ '+WREQ[i]+' ตัว')+'</small><button class="obtn" data-i="'+i+'"'+(o?'':' disabled')+'>'+(S.wing===i?'สวมใส่อยู่':o?'สวมใส่':'ล็อก')+'</button></div>';});
      h+='</div></div>';panel('ภารกิจปีก',h,880);
      MD.querySelectorAll('.obtn').forEach(b=>b.onclick=()=>{S.wing=+b.dataset.i;you.wing=S.wing;sfx('big');save();openModal('mission');});
    }else if(k==='free'){
      const cd=Math.ceil(S.freeCd);
      panel('เหรียญฟรี','<div class="pb" style="text-align:center"><p style="font-size:18px">รับเหรียญจำลองฟรีทุก 30 วินาที</p><p style="font-size:34px;margin:8px 0">🪙 +200,000</p><button class="obtn" id="frb" style="font-size:22px;padding:6px 30px"'+(cd>0?' disabled':'')+'>'+(cd>0?'รอ '+cd+' วินาที':'รับเลย')+'</button></div>',560);
      $('frb').onclick=()=>{if(S.freeCd>0)return;S.freeCd=30;you.coins+=200000;sfx('win');for(let i=0;i<16;i++)S.cfx.push({x:you.x+R(-30,30),y:H-60,vx:R(-120,120),vy:R(-300,-100),t:0,st:0,owner:you,delay:i*.03,spin:R(0,6),sx:0,sy:0,val:0});closeModal();toast('ได้รับ 200,000 เหรียญ');};
    }else if(k==='lucky'){
      const cd=Math.ceil(S.luckyCd);
      panel('ไหว้รวย · เลือกหอยมงคล','<div class="pb" style="text-align:center"><p>'+(cd>0?'รออีก '+cd+' วินาทีเพื่อเล่นอีกครั้ง':'เลือกหอย 1 ใน 3 เพื่อลุ้นรางวัล (เล่นได้ทุก 60 วินาที)')+'</p><div class="shells"><div class="shell" data-i="0">🐚</div><div class="shell" data-i="1">🐚</div><div class="shell" data-i="2">🐚</div></div><p id="lres" style="font-size:20px;font-weight:700;min-height:30px"></p></div>',640);
      if(cd<=0)MD.querySelectorAll('.shell').forEach(s=>s.onclick=()=>{if(S.luckyCd>0)return;S.luckyCd=60;const v=pick([50000,100000,100000,200000,300000,500000,1000000]);you.coins+=v;MD.querySelectorAll('.shell').forEach(x=>x.style.opacity=.35);s.style.opacity=1;s.textContent=v>=500000?'💎':'🪙';$('lres').textContent='ได้รับ +'+fmt(v)+' เหรียญ!';sfx('win');});
    }else if(k==='pack'){
      const sd=!S.pkgDone;
      panel('แพ็คเกจประจำวัน','<div class="pk"><div class="side"><div class="on">แพ็คเกจยิงปลา</div><div>แพ็คยิงปลา4คน</div><div>แพ็คเกจดัมมี่</div><div>แพ็คเครื่องบิน</div></div><div class="main"><h2>ได้รับสูงสุด 10,000,000</h2><div class="it"><span class="em">🔱</span>เกมยิงปลา x10 · ลุ้นรางวัลสูงสุด 7,500×10</div><div class="it"><span class="em">🧜‍♀️</span>บัตรเจ้าสมุทร x6 · ลุ้นรางวัลสูงสุด 75,000×6</div><div style="text-align:center;margin-top:12px"><button class="obtn" id="pkb" style="font-size:20px;padding:6px 26px"'+(sd?'':' disabled')+'>'+(sd?'รับแพ็คเกจฟรี (เหรียญจำลอง)':'รับแล้ววันนี้')+'</button></div></div></div>',860);
      $('pkb').onclick=()=>{if(S.pkgDone)return;S.pkgDone=true;you.coins+=1000000;S.skillN[0]=Math.min(9,S.skillN[0]+3);S.skillN[1]=Math.min(9,S.skillN[1]+3);sfx('win');closeModal();toast('ได้รับ 1,000,000 เหรียญ + สกิลอย่างละ 3');};
    }else if(k==='shop'){
      panel('เก็บของ · แลกโทเคน','<div class="pb"><p>โทเคนของคุณ: <b>'+S.tokens+'</b> (ได้จากการยิงปลาใหญ่)</p><div class="cards"><div class="card"><b>🪙 500,000 เหรียญ</b><small>ใช้ 10 โทเคน</small><button class="obtn" data-k="c">แลก</button></div><div class="card"><b>❄ แช่แข็ง +3</b><small>ใช้ 6 โทเคน</small><button class="obtn" data-k="f">แลก</button></div><div class="card"><b>🚀 ตอร์ปิโด +3</b><small>ใช้ 6 โทเคน</small><button class="obtn" data-k="t">แลก</button></div></div></div>',760);
      MD.querySelectorAll('.obtn').forEach(b=>b.onclick=()=>{const k2=b.dataset.k,cost=k2==='c'?10:6;if(S.tokens<cost){toast('โทเคนไม่พอ');closeModal();return;}S.tokens-=cost;if(k2==='c')you.coins+=500000;if(k2==='f')S.skillN[0]=Math.min(9,S.skillN[0]+3);if(k2==='t')S.skillN[1]=Math.min(9,S.skillN[1]+3);sfx('win');openModal('shop');});
    }else if(k==='pro'){
      panel('ห้องมืออาชีพ','<div class="pb"><h3>อัพไปห้องมืออาชีพ</h3><p>ห้องมืออาชีพมีเดิมพันสูงขึ้นและเงินรางวัลแข่งคะแนนมากขึ้น เปลี่ยนห้องได้จากหน้าล็อบบี้</p><ul><li>เจ้าสมุทรจิตใจ — เข้าห้อง 1,000,000 · โบนัสชนะ 500,000</li><li>หอระดับเทพ — เข้าห้อง 3,000,000 · โบนัสชนะ 1,500,000</li></ul></div>',620);
    }else if(k==='set'){
      panel('ตั้งค่า','<div class="pb"><div class="row"><label>เสียง</label><div class="sw'+(AU.on?' on':'')+'" id="sw1"><i></i></div></div><div class="row"><label>เอฟเฟกต์เต็มรูปแบบ</label><div class="sw'+(S.quality?' on':'')+'" id="sw2"><i></i></div></div><div class="row"><button class="obtn" id="bl" style="flex:1">กลับล็อบบี้</button><button class="obtn" id="br" style="flex:1">รีเซ็ตเหรียญ</button></div></div>',520);
      $('sw1').onclick=e=>{AU.on=!AU.on;e.currentTarget.classList.toggle('on');};
      $('sw2').onclick=e=>{S.quality=S.quality?0:1;e.currentTarget.classList.toggle('on');};
      $('bl').onclick=()=>{save();closeModal();toLobby();};
      if(host)$('br').style.display='none';
      $('br').onclick=()=>{you.coins=14597886;you.disp=you.coins;save();closeModal();toast('รีเซ็ตเหรียญแล้ว');};
    }
  }

  /* ====================== RENDER MAIN ====================== */
  let BLA=null,BLB=null,BLC=null;
  function bloom(){
    if(!S.quality||S.fx<2)return;
    if(!BLA){BLA=document.createElement('canvas');BLB=document.createElement('canvas');BLC=document.createElement('canvas');BLA.width=640;BLA.height=295;BLB.width=320;BLB.height=148;BLC.width=160;BLC.height=74;}
    const a=BLA.getContext('2d'),b=BLB.getContext('2d'),d=BLC.getContext('2d');
    a.globalCompositeOperation='copy';a.drawImage(cv,0,0,cv.width,cv.height,0,0,640,295);
    b.globalCompositeOperation='copy';b.drawImage(BLA,0,0,320,148);
    b.globalCompositeOperation='multiply';b.drawImage(BLB,0,0);
    d.globalCompositeOperation='copy';d.drawImage(BLB,0,0,160,74);
    ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.globalCompositeOperation='screen';ctx.globalAlpha=.2;ctx.drawImage(BLC,0,0,cv.width,cv.height);ctx.restore();
  }
  function render(t){
    const c=ctx;
    c.setTransform(cv.width/W,0,0,cv.height/H,0,0);
    c.save();
    if(S.shake>0)c.translate(R(-S.shake,S.shake),R(-S.shake,S.shake));
    drawBG(t);
    drawShadows();
    const fs=S.fish.slice().sort((a,b)=>a.d.r-b.d.r);
    for(const f of fs)drawFish(f,t);
    c.drawImage(FOGC,0,0,W,H);
    for(const f of fs)drawFishOverlay(f,t);
    if(S.fish.some(f=>f.frozen>0)){c.fillStyle='rgba(120,200,255,.14)';c.fillRect(0,0,W,H);}
    for(const n of S.nets)drawNet(n);
    drawRockets();
    for(const b of S.bullets)drawBullet(b);
    drawRings();drawParts();drawCoins();
    drawCannon(bot,t);drawCannon(you,t);
    drawTexts();
    c.restore();
    bloom();
    if(S.flash>0){c.fillStyle='rgba('+S.flashCol+','+clamp(S.flash,0,1)+')';c.fillRect(0,0,W,H);}
    drawHUD(t);
    btn(you.x-40,H-62,80,62,()=>openModal('cannon'));
    drawBand(t);drawWin(t);
  }

  /* ====================== WEAPONS / EXPLOSIONS / SOLO CONTEST ====================== */
  S.blasts=[];
  function mkGlow(stops){const s=document.createElement('canvas');s.width=s.height=128;const g=s.getContext('2d');g.fillStyle=rg(g,64,64,0,64,stops);g.fillRect(0,0,128,128);return s;}
  const FIRE=mkGlow([[0,'rgba(255,255,240,1)'],[.18,'rgba(255,240,150,.95)'],[.4,'rgba(255,160,40,.8)'],[.7,'rgba(220,60,10,.32)'],[1,'rgba(120,20,0,0)']]);
  const PLASMA=mkGlow([[0,'rgba(255,255,255,1)'],[.2,'rgba(200,250,255,.95)'],[.45,'rgba(80,190,255,.72)'],[.75,'rgba(40,90,255,.28)'],[1,'rgba(20,40,200,0)']]);
  const FIREB=mkGlow([[0,'rgba(255,250,215,1)'],[.25,'rgba(255,205,80,1)'],[.5,'rgba(250,120,30,.95)'],[.75,'rgba(190,45,10,.55)'],[1,'rgba(110,20,0,0)']]);
  const PLASB=mkGlow([[0,'rgba(255,255,255,1)'],[.25,'rgba(190,245,255,1)'],[.5,'rgba(70,170,255,.92)'],[.75,'rgba(40,80,230,.5)'],[1,'rgba(20,40,200,0)']]);
  const SMOKE=mkGlow([[0,'rgba(70,70,78,.7)'],[.6,'rgba(70,70,78,.3)'],[1,'rgba(70,70,78,0)']]);
  function fireBullet(seat,ang,bet,o){
    o=o||{};const sk=SKINS[seat.skin||0];let off=0;if(sk.off){seat.alt=!seat.alt;off=seat.alt?sk.off:-sk.off;}
    const L=sk.L*1.3,ca=Math.cos(ang),sa=Math.sin(ang),mx=seat.x+sa*L+ca*off*1.3,my=seat.y-ca*L+sa*off*1.3;
    const sp=(seat.me&&S.x2)?1150:(o.torp?900:(seat.skin===1?1000:seat.skin===3?760:860));
    S.bullets.push({x:mx,y:my,vx:sa*sp,vy:-ca*sp,r:o.torp?12:7,owner:seat,bet:bet,net:(58+tier(bet)*6.5)*sk.blast,bn:0,trail:[],skin:seat.skin||0,lock:o.lock||null,torp:!!o.torp,sid:o.sid||null});
    seat.rec=1;seat.shots++;seat.muzOff=off;if(seat.skin===1)seat.spinV=1;
    burst(mx,my,sk.fx==='plasma'?['#fff','#9fe8ff','#5ab0ff']:['#fff','#ffe09a','#ffb040'],5,160);
    if(seat.skin>=2)for(let i=0;i<(seat.skin===3?5:2);i++)PT({x:mx,y:my,vx:R(-40,40)+sa*40,vy:R(-40,40)-ca*40,life:R(.5,.9),sz:R(5,10),col:'rgba(210,210,215,.5)',ty:'smoke',drag:1.6});
  }
  function addBlast(x,y,r,fx){
    const b={x:x,y:y,r:r,fx:fx,t:0,max:.62,puffs:[]};for(let i=0;i<7;i++)b.puffs.push({a:R(0,6.28),d:R(.15,.55),s:R(.45,.85)});S.blasts.push(b);
    if(S.blasts.length>40)S.blasts.shift();
    const cols=fx==='plasma'?['#ffffff','#bff4ff','#5ac8ff']:['#fff7c0','#ffd060','#ff8a20'],q=S.quality?1:.5;
    for(let i=0;i<Math.round(14*q);i++){const a=R(0,6.28),v=R(260,620)*(r/70);PT({x:x,y:y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:R(.25,.5),sz:R(2,3.5),col:pick(cols),ty:'streak',drag:3});}
    for(let i=0;i<Math.round(6*q);i++){const a=R(0,6.28),v=R(60,200);PT({x:x,y:y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-40,life:R(.5,.9),sz:R(1.5,2.5),col:pick(cols),g:260,drag:1.5,ty:'spark'});}
    if(fx!=='plasma'){for(let i=0;i<4;i++)PT({x:x+R(-r*.3,r*.3),y:y+R(-r*.3,r*.3),vx:R(-20,20),vy:R(-50,-15),life:R(.7,1.2),sz:R(r*.2,r*.32),col:'rgba(60,55,60,.45)',ty:'smoke',drag:1,dl:.14});}
    else for(let i=0;i<3;i++){const a=R(0,6.28);addBolt(x,y,x+Math.cos(a)*r*1.1,y+Math.sin(a)*r*1.1,'150,220,255',1.6);}
    bubblesAt(x,y,3);
  }
  function netAt(x,y,r,owner,bet,dmg){
    addBlast(x,y,r*.9,SKINS[owner.skin||0].fx);
    if(owner.me)sfx('hit',35);
    for(const f of S.fish){if(f.dead||f.gone||f.boss)continue;if(Math.hypot(f.x-x,f.y-y)<r*2.4){f.panic=1.0;f.fleeA=Math.atan2(f.y-y,f.x-x);}}
    const tg=[];for(const f of S.fish){if(f.dead||f.gone)continue;const rr0=Math.max(fishRX(f),fishRY(f))*.7;if(Math.hypot(f.x-x,f.y-y)<r+rr0)tg.push(f);}
    for(const f of tg)hitFish(f,owner,bet,dmg,false);
  }
  function explode(x,y,rad,owner,bet,dmg,depth){
    addBlast(x,y,rad*.85,'fire');addBlast(x+R(-30,30),y+R(-30,30),rad*.5,'fire');
    shake(9);flash('255,220,160',.18);sfx('boom');
    for(const f of liveFish()){const rr0=Math.max(fishRX(f),fishRY(f))*.6;if(Math.hypot(f.x-x,f.y-y)<rad+rr0)hitFish(f,owner,bet,dmg,true,depth);}
  }
  function useAtom(){
    if(S.atom<=0)return;S.atom=0;const bet=curBet();
    flash('255,255,255',1);shake(26);sfx('boom');sfx('big');
    S.rings.push({x:you.x,y:you.y-100,t:0,max:1.4,r:W,col:'255,200,100',thick:1});
    for(let i=0;i<6;i++){const x=R(120,W-120),y=R(140,H-200);later(i*.09,()=>addBlast(x,y,R(110,170),'fire'));}
    liveFish().forEach((f,i)=>later(.15+i*.05,()=>{if(f.dead||f.gone)return;hitFish(f,you,bet,f.boss?60:16,true,0);}));
  }
  function updCoins(dt){
    for(const c of S.cfx){
      if(c.delay>0){c.delay-=dt;continue;}
      c.t+=dt;
      if(c.st===0){c.x+=c.vx*dt;c.y+=c.vy*dt;c.vy+=900*dt;c.vx*=1-1.5*dt;
        if(c.rain){if(c.y>H+30)c.dead=true;continue;}
        if(c.t>.42){c.st=1;c.t=0;c.sx=c.x;c.sy=c.y;}}
      else{const tx=790,ty=H-58,u=eOut(Math.min(1,c.t/.7));c.x=lerp(c.sx,tx,u);c.y=lerp(c.sy,ty,u)-Math.sin(u*Math.PI)*70;
        if(c.t>=.7){c.dead=true;you.pulse=1;sfx('coin',70);}}
      c.spin+=dt*14;
    }
    S.cfx=S.cfx.filter(c=>!c.dead);if(S.cfx.length>260)S.cfx.splice(0,S.cfx.length-260);
  }
  function updContest(dt){
    if(host)return;
    const c=S.ct;
    if(c.ph==='run'){const b=curBet();c.bot+=b*R(1.6,3.6)*dt;if(Math.random()<dt*.25)c.bot+=b*R(5,40);}
    c.t-=dt;if(c.t>0)return;
    if(c.ph==='pre'){c.ph='run';c.t=120;c.you=0;c.bot=0;S.youTag=6;toast('เริ่มการแข่งขันคะแนน! ทำคะแนนให้มากกว่าคู่แข่ง');sfx('banner');}
    else if(c.ph==='run'){
      c.ph='res';c.t=7;const win=c.you>=c.bot,bonus=ROOMS[S.room].bonus;
      if(win){you.coins+=bonus;addWin({tier:'W',title:'คุณชนะการแข่งขัน!',amount:bonus,icon:'🏆',sub:'โบนัสผู้ชนะ'});sfx('win');
        for(let i=0;i<30;i++)S.cfx.push({x:W/2+R(-200,200),y:H/2+R(-60,60),vx:R(-260,260),vy:R(-420,-120),t:0,st:0,owner:you,delay:i*.03,spin:R(0,6),sx:0,sy:0,val:0});}
      else addWin({tier:'L',title:'จบการแข่งขัน',amount:c.you,icon:'🥈',sub:'คะแนนของคุณ'});
    }else{c.ph='pre';c.t=6;c.you=0;c.bot=0;}
  }
  function skinOpen(i){return i===0||S.kills>=SKINS[i].req||(S.unl&&S.unl[i]);}

  /* ====================== TURRET (rusty mech, 4 weapon types) ====================== */
  const OL2='rgba(14,16,20,.75)';
  function metalH(c,x,w,st){return lg(c,x,0,x+w,0,[[0,st[0]],[.32,st[1]],[.62,st[2]],[1,st[3]]]);}
  const GM=['#262c32','#9aa4ae','#566069','#1c2025'],STEEL=['#30383f','#cfd7de','#7d8790','#242a30'],BRASS=['#4a3a1c','#e8c070','#a0763a','#3a2a12'],OLIVE=['#2e3612','#b8c868','#71812c','#222808'];
  function rustS(c,x,y,w,h,seed){for(let i=0;i<6;i++){const px=x+w*(.5+.42*Math.sin(seed*13.1+i*7.7)),py=y+h*(.5+.42*Math.sin(seed*5.3+i*3.9)),r=1+(i%3)*1.5;c.fillStyle=i%2?'rgba(170,85,30,.42)':'rgba(110,55,20,.38)';c.beginPath();c.ellipse(px,py,r*1.4,r,i,0,7);c.fill();}}
  function rivet(c,x,y,r){c.fillStyle=rg(c,x-r*.3,y-r*.3,0,r,[[0,'#e0e6ea'],[1,'#3a4046']]);c.beginPath();c.arc(x,y,r,0,7);c.fill();}
  function box(c,x,y,w,h,r,st,seed){c.fillStyle=metalH(c,x,w,st);rr(c,x,y,w,h,r);c.fill();c.strokeStyle=OL2;c.lineWidth=1.6;c.stroke();if(seed!=null)rustS(c,x,y,w,h,seed);c.fillStyle='rgba(255,255,255,.12)';rr(c,x+2,y+2,w-4,Math.min(5,h*.2),2);c.fill();}
  function drawGun(c,sk,s,t){
    /* yoke bracket */
    box(c,-32,-20,64,32,9,GM,1);rivet(c,-25,-12,2.4);rivet(c,25,-12,2.4);rivet(c,-25,5,2.4);rivet(c,25,5,2.4);
    c.fillStyle='#16191c';c.beginPath();c.arc(-30,-4,6,0,7);c.arc(30,-4,6,0,7);c.fill();rivet(c,-30,-4,3.4);rivet(c,30,-4,3.4);
    if(sk===0){
      box(c,-25,-48,50,40,10,GM,2);
      c.fillStyle='#1a1f24';rr(c,-21,-42,10,26,3);c.fill();rr(c,11,-42,10,26,3);c.fill();
      box(c,-15,-94,30,52,7,STEEL,3);
      const pl=.65+.35*Math.sin(t*7);
      for(const y of[-54,-66,-78]){c.fillStyle=lg(c,-19,0,19,0,[[0,'#0a4a8a'],[.5,'#bff8ff'],[1,'#0a4a8a']]);rr(c,-19,y,38,7,3);c.fill();c.strokeStyle='#081a30';c.lineWidth=1.2;c.stroke();}
      c.save();c.globalCompositeOperation='lighter';c.globalAlpha=.55*pl;for(const y of[-54,-66,-78])c.drawImage(PLASMA,-34,y-14,68,34);c.restore();
      box(c,-12,-102,24,10,4,GM);
      c.save();c.globalCompositeOperation='lighter';c.globalAlpha=pl;c.drawImage(PLASMA,-24,-122,48,48);c.restore();
      c.fillStyle='#e8feff';c.beginPath();c.ellipse(0,-100,8,3,0,0,7);c.fill();
    }else if(sk===1){
      const cols=['#e83a3a','#2a7aff','#3ac84a','#ffd23a','#ff8a2a'];
      c.lineCap='round';cols.forEach((col,i)=>{c.strokeStyle=OL2;c.lineWidth=4.2;const p=()=>{c.beginPath();c.moveTo(-20+i*3,-14);c.bezierCurveTo(-42-i*3,-6,-40,14,-24+i*3,16);};p();c.stroke();c.strokeStyle=col;c.lineWidth=2.6;p();c.stroke();});
      box(c,-23,-44,46,34,8,BRASS,4);
      const sp=s.spin||0,arr=[];for(let k=0;k<6;k++){const a=sp+k*Math.PI/3;arr.push({x:Math.sin(a)*11,z:Math.cos(a)});}arr.sort((a,b)=>a.z-b.z);
      for(const b of arr){c.fillStyle=metalH(c,b.x-4.5,9,STEEL);rr(c,b.x-4.5,-98,9,62,3);c.fill();c.strokeStyle=OL2;c.lineWidth=1.2;c.stroke();c.fillStyle='rgba(0,0,0,'+(.55*(1-(b.z+1)/2))+')';rr(c,b.x-4.5,-98,9,62,3);c.fill();c.fillStyle='#0a0a0a';c.beginPath();c.ellipse(b.x,-98,3,1.4,0,0,7);c.fill();}
      for(const y of[-92,-68,-46]){box(c,-18,y,36,7,3,BRASS);}
      rustS(c,-18,-92,36,50,9);
    }else if(sk===2){
      box(c,-33,-54,66,50,7,GM,5);
      for(const q of[[-13,-26],[13,-26],[-13,-12],[13,-12]]){c.fillStyle='#3a4046';c.beginPath();c.arc(q[0],q[1],6,0,7);c.fill();c.fillStyle='#0c0e10';c.beginPath();c.arc(q[0],q[1],4,0,7);c.fill();}
      rivet(c,-27,-48,2.2);rivet(c,27,-48,2.2);rivet(c,-27,-9,2.2);rivet(c,27,-9,2.2);
      for(const x of[-11,11]){box(c,x-8,-100,16,52,4,STEEL,x);box(c,x-10,-108,20,13,3,GM);c.strokeStyle='#0c0e10';c.lineWidth=1.4;c.beginPath();c.moveTo(x-7,-102);c.lineTo(x+7,-102);c.stroke();c.fillStyle='#050505';c.beginPath();c.ellipse(x,-108,5,2,0,0,7);c.fill();}
    }else{
      box(c,-27,-42,54,34,6,OLIVE,6);
      for(const x of[-15,15]){
        box(c,x-14,-104,28,72,8,OLIVE,x*.3);
        box(c,x-15,-94,30,6,2,GM);box(c,x-15,-52,30,6,2,GM);
        c.fillStyle='#14140a';c.beginPath();c.ellipse(x,-104,12,4.5,0,0,7);c.fill();
        c.save();c.globalCompositeOperation='lighter';c.globalAlpha=.75+.25*Math.sin(t*5+x);c.drawImage(FIRE,x-16,-118,32,28);c.restore();
        c.fillStyle='#ffb040';c.beginPath();c.ellipse(x,-104,7,2.4,0,0,7);c.fill();
      }
    }
  }
  function drawCannon(s,t){
    const c=ctx,sk=s.skin||0,SKd=SKINS[sk];
    c.save();c.translate(s.x,s.y);
    /* fixed pedestal */
    c.fillStyle=metalH(c,-54,108,GM);c.beginPath();c.moveTo(-56,46);c.lineTo(-44,8);c.lineTo(44,8);c.lineTo(56,46);c.closePath();c.fill();c.strokeStyle=OL2;c.lineWidth=1.8;c.stroke();rustS(c,-50,10,100,34,7);
    for(const x of[-46,-24,24,46])rivet(c,x,34,2.6);
    const pu=s.pulse||0;
    c.save();c.globalCompositeOperation='lighter';c.globalAlpha=.35+pu*.4;c.drawImage(SKd.fx==='plasma'?PLASMA:FIRE,-70,-60,140,120);c.restore();
    c.fillStyle=rg(c,-10,-10,4,44,[[0,'#a8b2bb'],[.6,'#555e66'],[1,'#22272c']]);c.beginPath();c.arc(0,4,40,0,7);c.fill();c.strokeStyle=OL2;c.lineWidth=2;c.stroke();
    c.fillStyle='#2a3036';c.beginPath();c.arc(0,4,31,0,7);c.fill();
    for(let i=0;i<10;i++){const a=i/10*6.283;rivet(c,Math.cos(a)*35.5,4+Math.sin(a)*35.5,2.1);}
    /* rotating weapon */
    c.save();c.rotate(s.ang);const rc=(s.rec||0)*7;c.translate(0,rc);c.scale(1.3,1.3);
    drawGun(c,sk,s,t);
    if((s.rec||0)>.45){const k=(s.rec-.45)/.55,mo=s.muzOff||0,my=-SKd.L-4;c.save();c.globalCompositeOperation='lighter';c.globalAlpha=k;
      const spr=SKd.fx==='plasma'?PLASMA:FIRE;c.drawImage(spr,mo-34,my-44,68,68);
      c.fillStyle=SKd.fx==='plasma'?'rgba(170,240,255,.9)':'rgba(255,220,120,.9)';c.beginPath();c.moveTo(mo-8,my);c.lineTo(mo,my-34-k*14);c.lineTo(mo+8,my);c.closePath();c.fill();
      c.beginPath();c.moveTo(mo-4,my);c.lineTo(mo-22,my-18);c.lineTo(mo,my-4);c.moveTo(mo+4,my);c.lineTo(mo+22,my-18);c.lineTo(mo,my-4);c.fill();c.restore();}
    c.restore();
    c.restore();
  }
  /* ====================== CONSOLE (static, pre-rendered) ====================== */
  let CONS=null;const CY0=130,CS=1.5;
  function buildConsole(){
    const cv2=document.createElement('canvas');cv2.width=W*CS;cv2.height=CY0*CS;const c=cv2.getContext('2d');c.setTransform(CS,0,0,CS,0,-(H-CY0)*CS);
    const NP=c.createPattern(mkNoise(96,90),'repeat');
    function pipe(x0,x1,y,r){c.fillStyle=lg(c,0,y-r,0,y+r,[[0,'#2a3036'],[.25,'#a8b2bb'],[.5,'#5e6870'],[1,'#1a1e22']]);c.fillRect(x0,y-r,x1-x0,r*2);
      c.save();c.beginPath();c.rect(x0,y-r,x1-x0,r*2);c.clip();for(let x=x0;x<x1;x+=37){c.fillStyle='rgba(160,80,28,'+R(.2,.45)+')';c.beginPath();c.ellipse(x+R(0,30),y+R(-r*.5,r*.6),R(6,16),R(3,r*.6),0,0,7);c.fill();}c.globalCompositeOperation='overlay';c.globalAlpha=.5;c.fillStyle=NP;c.fillRect(x0,y-r,x1-x0,r*2);c.restore();
      c.strokeStyle=OL2;c.lineWidth=1.5;c.strokeRect(x0,y-r,x1-x0,r*2);
      for(let x=x0+60;x<x1-20;x+=150){c.fillStyle=lg(c,0,y-r-4,0,y+r+4,[[0,'#3a4046'],[.3,'#b8c2ca'],[1,'#1c2024']]);rr(c,x,y-r-4,16,r*2+8,3);c.fill();c.strokeStyle=OL2;c.stroke();rivet(c,x+8,y-r+1,2);rivet(c,x+8,y+r-1,2);}}
    pipe(-10,420,H-56,8);pipe(860,W+10,H-56,8);pipe(-10,420,H-24,15);pipe(860,W+10,H-24,15);
    const CB=['#e83a3a','#2a7aff','#3ac84a','#ffd23a','#ff8a2a','#c05ae8'];
    function cable(x0,y0,x1,y1,sag,col){c.lineCap='round';c.strokeStyle=OL2;c.lineWidth=5.5;const p=()=>{c.beginPath();c.moveTo(x0,y0);c.bezierCurveTo(x0+(x1-x0)*.3,y0+sag,x1-(x1-x0)*.3,y1+sag,x1,y1);};p();c.stroke();c.strokeStyle=col;c.lineWidth=3.4;p();c.stroke();c.strokeStyle='rgba(255,255,255,.3)';c.lineWidth=1;p();c.stroke();}
    for(let i=0;i<5;i++){cable(330-i*30,H-48,408,H-70+i*9,22+i*6,CB[i]);cable(950+i*30,H-48,872,H-70+i*9,22+i*6,CB[(i+2)%6]);}
    const P=()=>{c.beginPath();c.moveTo(400,H+2);c.lineTo(400,H-58);c.lineTo(428,H-84);c.lineTo(852,H-84);c.lineTo(880,H-58);c.lineTo(880,H+2);c.closePath();};
    c.fillStyle='rgba(0,10,20,.45)';c.save();c.translate(0,6);c.filter='blur(6px)';P();c.fill();c.restore();c.filter='none';
    P();c.fillStyle=lg(c,0,H-84,0,H,[[0,'#7c8690'],[.25,'#5a636c'],[1,'#2a3036']]);c.fill();
    c.save();P();c.clip();
    for(let i=0;i<26;i++){c.fillStyle=pick(['rgba(150,75,25,.45)','rgba(190,100,35,.35)','rgba(100,50,20,.42)']);c.beginPath();c.ellipse(R(405,875),R(H-82,H),R(6,22),R(3,10),R(0,3),0,7);c.fill();}
    c.globalCompositeOperation='overlay';c.globalAlpha=.6;c.fillStyle=NP;c.fillRect(400,H-90,480,92);c.globalCompositeOperation='source-over';c.globalAlpha=1;
    c.strokeStyle='rgba(0,0,0,.45)';c.lineWidth=1.5;c.beginPath();c.moveTo(580,H-84);c.lineTo(580,H);c.moveTo(700,H-84);c.lineTo(700,H);c.moveTo(400,H-30);c.lineTo(880,H-30);c.stroke();
    c.strokeStyle='rgba(255,255,255,.18)';c.beginPath();c.moveTo(428,H-83);c.lineTo(852,H-83);c.stroke();
    for(let i=0;i<14;i++){c.strokeStyle='rgba(255,255,255,.1)';c.lineWidth=1;c.beginPath();const x=R(410,860),y=R(H-80,H-6);c.moveTo(x,y);c.lineTo(x+R(-14,14),y+R(-4,4));c.stroke();}
    c.save();c.beginPath();c.rect(400,H-8,480,8);c.clip();for(let x=380;x<900;x+=16){c.fillStyle='#f2c418';c.beginPath();c.moveTo(x,H);c.lineTo(x+8,H-8);c.lineTo(x+16,H-8);c.lineTo(x+8,H);c.fill();}c.restore();
    c.fillStyle='#1a1e22';for(let i=0;i<6;i++)rr(c,598,H-26+i*3.4,84,1.8,1),c.fill();
    c.restore();
    P();c.strokeStyle=OL2;c.lineWidth=2;c.stroke();
    for(const x of[410,870])for(let y=H-50;y<H;y+=16)rivet(c,x,y,2.4);
    for(let x=440;x<850;x+=34)rivet(c,x,H-78,2);
    for(const bx of[416,710]){c.fillStyle=lg(c,0,H-76,0,H-24,[[0,'#3a4046'],[1,'#16191c']]);rr(c,bx,H-76,156,52,8);c.fill();c.strokeStyle=OL2;c.lineWidth=2;c.stroke();rivet(c,bx+6,H-70,2);rivet(c,bx+150,H-70,2);rivet(c,bx+6,H-30,2);rivet(c,bx+150,H-30,2);}
    for(let i=0;i<4;i++)cable(585+i*8,H-38,600+i*20,H-4,10+i*4,CB[(i+3)%6]);
    CONS=cv2;
  }
  function lcdText(s,x,y,o){o=o||{};ctx.save();ctx.font='700 '+(o.s||11)+'px "Courier New",monospace';ctx.textAlign=o.a||'left';ctx.textBaseline='middle';ctx.shadowColor=o.c||'#7ff4ff';ctx.shadowBlur=6;ctx.fillStyle=o.c||'#9ff8ff';ctx.fillText(s,x,y);ctx.restore();}
  function lcd(x,y,w,h){const c=ctx;rr(c,x,y,w,h,5);c.fillStyle=lg(c,0,y,0,y+h,[[0,'#0c3450'],[1,'#041422']]);c.fill();c.strokeStyle='rgba(110,230,255,.7)';c.lineWidth=1.4;c.stroke();c.save();rr(c,x,y,w,h,5);c.clip();c.fillStyle='rgba(120,230,255,.06)';for(let yy=y;yy<y+h;yy+=3)c.fillRect(x,yy,w,1);c.fillStyle='rgba(255,255,255,.07)';c.beginPath();c.moveTo(x,y);c.lineTo(x+w*.6,y);c.lineTo(x+w*.4,y+h);c.lineTo(x,y+h);c.fill();c.restore();}
  function plate(x,y,w,h,label){const c=ctx;rr(c,x,y,w,h,3);c.fillStyle=lg(c,0,y,0,y+h,[[0,'#d8dcd8'],[1,'#8c948e']]);c.fill();c.strokeStyle=OL2;c.lineWidth=1.3;c.stroke();rivet(c,x+5,y+h/2,1.6);rivet(c,x+w-5,y+h/2,1.6);TX(label,x+w/2,y+h/2+1,{s:11,w:600,a:'center',c:'#1a2230'});}
  function metalBtn(x,y,w,h,label,fn){const c=ctx;rr(c,x,y,w,h,5);c.fillStyle=lg(c,0,y,0,y+h,[[0,'#c8d0d6'],[.5,'#7a848c'],[1,'#3a4248']]);c.fill();c.strokeStyle=OL2;c.lineWidth=1.5;c.stroke();TX(label,x+w/2,y+h/2+1,{s:18,w:700,a:'center',c:'#10161c'});btn(x-4,y-6,w+8,h+12,fn);}
  function drawConsole(t){
    if(!CONS)buildConsole();const c=ctx;c.drawImage(CONS,0,H-CY0,W,CY0);
    const bet=curBet(),ct=S.ct;
    lcd(422,H-71,144,42);
    lcdText('SCORE:',430,H-62,{c:'#ffe9a0'});lcdText(fmt(ct.you),558,H-62,{a:'right',c:'#ffe9a0'});
    lcdText('LEVEL',430,H-50);lcdText(''+you.lv,558,H-50,{a:'right'});
    lcdText('AMMO:',430,H-38);const am=clamp(Math.floor(you.coins/bet),0,1e9),bars=clamp(Math.ceil(Math.log10(am+1)*1.6),0,8);for(let i=0;i<8;i++){c.fillStyle=i<bars?'#5af0ff':'rgba(90,240,255,.15)';c.fillRect(478+i*10,H-42,7,8);}
    lcd(716,H-71,144,42);
    lcdText('COINS:',724,H-62,{c:'#ffe9a0'});lcdText(fmt(you.disp),852,H-62,{a:'right',c:'#ffe9a0'});
    lcdText('BET:',724,H-50);lcdText(fmt(bet),852,H-50,{a:'right'});
    lcdText('AMMO:',724,H-38);lcdText(fmt(am),852,H-38,{a:'right'});
    plate(434,H-22,120,17,SKINS[you.skin||0].n);
    metalBtn(722,H-23,30,20,'−',()=>{const lo=ROOMS[S.room].lo,hi=ROOMS[S.room].hi;you.bet=clamp(you.bet-1,lo,hi);sfx('click');});
    metalBtn(824,H-23,30,20,'+',()=>{const lo=ROOMS[S.room].lo,hi=ROOMS[S.room].hi;you.bet=clamp(you.bet+1,lo,hi);sfx('click');});
    plate(758,H-22,60,17,'BET');
    for(const q of[[588,H-74],[692,H-74]]){const on=Math.sin(t*4+q[0])>0;c.fillStyle=on?'#5aff6a':'#1a4a20';c.beginPath();c.arc(q[0],q[1],3.2,0,7);c.fill();if(on){c.save();c.globalCompositeOperation='lighter';c.fillStyle='rgba(90,255,110,.35)';c.beginPath();c.arc(q[0],q[1],7,0,7);c.fill();c.restore();}}
  }
  /* ====================== BULLETS / BLASTS / PARTICLES ====================== */
  function drawBullet(b){
    const c=ctx,a=Math.atan2(b.vy,b.vx);
    if(b.torp){c.save();c.translate(b.x,b.y);c.rotate(a);c.globalCompositeOperation='lighter';c.drawImage(FIRE,-52,-12,36,24);c.globalCompositeOperation='source-over';c.fillStyle=lg(c,0,-9,0,9,[[0,'#fff'],[.5,'#6ad0ff'],[1,'#1a58c0']]);c.beginPath();c.ellipse(0,0,24,9,0,0,7);c.fill();c.fillStyle='#ff4a3a';c.beginPath();c.moveTo(-18,-8);c.lineTo(-30,-15);c.lineTo(-10,-5);c.fill();c.beginPath();c.moveTo(-18,8);c.lineTo(-30,15);c.lineTo(-10,5);c.fill();c.restore();return;}
    c.save();const tr=b.trail,n=tr.length;
    if(b.skin===0){c.globalCompositeOperation='lighter';for(let i=0;i<n;i++){const p=tr[i],k=(i+1)/n,r=9*k;c.globalAlpha=k*.55;c.drawImage(PLASMA,p.x-r,p.y-r,r*2,r*2);}c.globalAlpha=1;c.translate(b.x,b.y);c.rotate(a);c.drawImage(PLASMA,-32,-13,52,26);c.fillStyle='#fff';c.beginPath();c.ellipse(0,0,9,3.4,0,0,7);c.fill();}
    else if(b.skin===1){c.globalCompositeOperation='lighter';const p0=tr[0]||b;const g=c.createLinearGradient(p0.x,p0.y,b.x,b.y);g.addColorStop(0,'rgba(255,140,30,0)');g.addColorStop(1,'rgba(255,235,160,1)');c.strokeStyle=g;c.lineWidth=3.2;c.lineCap='round';c.beginPath();c.moveTo(p0.x,p0.y);c.lineTo(b.x,b.y);c.stroke();c.drawImage(FIRE,b.x-10,b.y-10,20,20);}
    else if(b.skin===2){c.globalCompositeOperation='lighter';const p0=tr[0]||b;const g=c.createLinearGradient(p0.x,p0.y,b.x,b.y);g.addColorStop(0,'rgba(255,110,20,0)');g.addColorStop(1,'rgba(255,200,90,.9)');c.strokeStyle=g;c.lineWidth=6;c.lineCap='round';c.beginPath();c.moveTo(p0.x,p0.y);c.lineTo(b.x,b.y);c.stroke();c.translate(b.x,b.y);c.rotate(a);c.drawImage(FIRE,-26,-12,30,24);c.globalCompositeOperation='source-over';c.fillStyle=lg(c,0,-5,0,5,[[0,'#ffe8a0'],[.5,'#c8901a'],[1,'#6a4a10']]);c.beginPath();c.moveTo(-8,-4.5);c.lineTo(5,-4.5);c.quadraticCurveTo(12,0,5,4.5);c.lineTo(-8,4.5);c.closePath();c.fill();c.strokeStyle=OL2;c.lineWidth=1;c.stroke();}
    else{c.translate(b.x,b.y);c.rotate(a);c.globalCompositeOperation='lighter';c.drawImage(FIRE,-38,-11,30,22);c.globalCompositeOperation='source-over';c.fillStyle=lg(c,0,-5,0,5,[[0,'#ff8a7a'],[.5,'#d01818'],[1,'#6a0808']]);rr(c,-12,-4.5,20,9,3);c.fill();c.fillStyle='#eee';c.fillRect(-2,-4.5,3,9);c.fillStyle='#d8dde0';c.beginPath();c.moveTo(8,-4.5);c.quadraticCurveTo(17,0,8,4.5);c.fill();c.fillStyle='#4a5a1a';c.beginPath();c.moveTo(-12,-4.5);c.lineTo(-17,-9);c.lineTo(-6,-4.5);c.fill();c.beginPath();c.moveTo(-12,4.5);c.lineTo(-17,9);c.lineTo(-6,4.5);c.fill();}
    c.restore();
  }
  function drawBlasts(){
    const c=ctx;
    for(const b of S.blasts){if(b.t<0)continue;const k=b.t/b.max,pl=b.fx==='plasma',glow=pl?PLASMA:FIRE,body=pl?PLASB:FIREB,r=b.r,ek=eOut(k),fa=Math.pow(1-k,1.2);
      c.save();
      if(!pl&&k>.25){c.globalAlpha=.5*(1-k);for(const p of b.puffs){const d=p.d*r*(.6+ek*.8),s=p.s*r*(.7+ek*.7);c.drawImage(SMOKE,b.x+Math.cos(p.a+.8)*d-s,b.y+Math.sin(p.a+.8)*d-s-k*20,s*2,s*2);}}
      c.globalAlpha=fa;
      for(const p of b.puffs){const d=p.d*r*ek,s=p.s*r*(.45+.75*ek)*(1-k*.35);c.drawImage(body,b.x+Math.cos(p.a)*d-s,b.y+Math.sin(p.a)*d-s,s*2,s*2);}
      const cs=r*(.55+.4*ek)*(1-k*.5);c.globalAlpha=Math.pow(1-k,1.6);c.drawImage(body,b.x-cs,b.y-cs,cs*2,cs*2);
      c.globalCompositeOperation='lighter';
      if(k<.2){const q=k/.2;c.globalAlpha=1-q;const s=r*(1.6+q*.8);c.drawImage(glow,b.x-s,b.y-s,s*2,s*2);}
      c.globalAlpha=.6*fa;const gs=r*1.25*(.7+.5*ek);c.drawImage(glow,b.x-gs,b.y-gs,gs*2,gs*2);
      c.globalAlpha=.8*(1-k);c.strokeStyle=pl?'rgba(170,240,255,1)':'rgba(255,225,150,1)';c.lineWidth=6*(1-k)+1;c.beginPath();c.arc(b.x,b.y,r*(.35+1.1*ek),0,7);c.stroke();
      c.restore();}
  }
  function drawParts(){
    const c=ctx;
    for(const p of S.parts){
      if(p.dl>0)continue;const k=clamp(p.life/p.max,0,1);
      if(p.ty==='spark'){c.globalCompositeOperation='lighter';c.globalAlpha=k;c.fillStyle=p.col;c.beginPath();c.arc(p.x,p.y,p.sz*k+.4,0,7);c.fill();}
      else if(p.ty==='streak'){c.globalCompositeOperation='lighter';c.globalAlpha=k;c.strokeStyle=p.col;c.lineWidth=p.sz*.9;c.lineCap='round';c.beginPath();c.moveTo(p.x,p.y);c.lineTo(p.x-p.vx*.045,p.y-p.vy*.045);c.stroke();}
      else if(p.ty==='star'){c.globalCompositeOperation='lighter';c.globalAlpha=k;c.fillStyle=p.col;c.save();c.translate(p.x,p.y);c.rotate(p.rot+k*3);const s=p.sz*(1+k)*1.4;c.beginPath();for(let i=0;i<8;i++){const r=i%2?s*.35:s;c.lineTo(Math.cos(i*.785)*r,Math.sin(i*.785)*r);}c.closePath();c.fill();c.restore();}
      else if(p.ty==='bubble'){c.globalAlpha=Math.min(1,k*1.5)*.9;const s2=p.sz*2.4;c.drawImage(BSPR,p.x-s2,p.y-s2,s2*2,s2*2);}
      else if(p.ty==='smoke'){c.globalAlpha=k*.75;const s=p.sz*(1.7-k*.7)*1.5;c.drawImage(SMOKE,p.x-s,p.y-s,s*2,s*2);}
      c.globalAlpha=1;c.globalCompositeOperation='source-over';
    }
  }
  function drawTexts(){
    for(const x of S.txt){const k=1-x.life/x.max,pop=x.pop?eOutBack(Math.min(1,k*6)):1,fade=x.life<.35?x.life/.35:1,s=x.sz*pop;
      ctx.save();ctx.globalAlpha=fade*(x.a||1);TX(x.s,x.x,x.y,{s:s,w:700,a:'center',g:[[0,x.col[0]],[1,x.col[1]]],st:x.ghost?'rgba(120,150,255,.8)':'rgba(16,30,110,.95)',sw:Math.max(3,s*.15),sh:x.ghost?null:'rgba(255,190,40,.75)',sb:10});ctx.restore();}
  }
  /* ====================== HUD (reference style) ====================== */
  function glassPill(x,y,w,h,border){const c=ctx;c.save();rr(c,x,y,w,h,h/2);c.fillStyle=lg(c,0,y,0,y+h,[[0,'rgba(20,44,96,.94)'],[1,'rgba(6,16,46,.94)']]);c.fill();c.shadowColor=border;c.shadowBlur=9;c.strokeStyle=border;c.lineWidth=2.4;c.stroke();c.shadowBlur=0;c.fillStyle='rgba(255,255,255,.08)';rr(c,x+4,y+3,w-8,h*.4,h*.2);c.fill();c.restore();}
  function gemI(x,y,r,col){const c=ctx;c.fillStyle=rg(c,x-r*.3,y-r*.35,0,r*1.1,[[0,'#ffffff'],[.3,col],[1,'rgba(0,0,0,.6)']]);c.beginPath();c.arc(x,y,r,0,7);c.fill();c.strokeStyle='rgba(255,255,255,.7)';c.lineWidth=1.4;c.stroke();}
  function roundBtn(x,y,r,emoji,label,col,fn,badge){const c=ctx;c.save();c.fillStyle=lg(c,0,y-r,0,y+r,[[0,'rgba(30,70,140,.95)'],[1,'rgba(8,24,64,.95)']]);c.beginPath();c.arc(x,y,r,0,7);c.fill();c.shadowColor=col;c.shadowBlur=7;c.strokeStyle=col;c.lineWidth=2.2;c.stroke();c.shadowBlur=0;c.font=(r*1.05)+'px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(emoji,x,y+1);c.restore();
    if(label)TX(label,x,y+r+9,{s:10,w:600,a:'center',st:'rgba(0,10,40,.9)',sw:3});if(badge)TX(badge,x,y-r-3,{s:10,w:700,a:'center',c:'#9fffa0',st:'rgba(0,0,0,.9)',sw:3});if(fn)btn(x-r,y-r,r*2,r*2+12,fn);}
  function navyTool(x,y,s,on,emoji,label,fn){const c=ctx;rr(c,x,y,s,s,10);c.fillStyle=on?lg(c,0,y,0,y+s,[[0,'#ffd84a'],[1,'#e8801a']]):lg(c,0,y,0,y+s,[[0,'rgba(36,84,170,.95)'],[1,'rgba(10,30,80,.95)']]);c.fill();c.save();c.shadowColor=on?'#ffd84a':'#7fd0ff';c.shadowBlur=7;c.strokeStyle=on?'#fff3c0':'#7fd0ff';c.lineWidth=2.2;c.stroke();c.restore();c.font='700 '+(s*.5)+'px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillStyle='#fff';c.fillText(emoji,x+s/2,y+s/2+1);if(label)TX(label,x+s/2,y+s+9,{s:10,w:600,a:'center',st:'rgba(0,10,40,.9)',sw:3});btn(x,y,s,s,fn);}
  function drawHUD(t){
    const c=ctx;
    /* top bar */
    glassPill(8,6,226,34,'#ff5a6a');gemI(27,23,10,'#ff4a5a');TX('P1',44,23,{s:15,w:700,c:'#ff9a9a'});TX(fmt(you.disp),222,23,{a:'right',s:19,w:700,g:GOLDG,st:'rgba(30,15,0,.85)',sw:3});
    const ji=Math.floor(t/3)%3,jp=JP[ji];
    if(!host){glassPill(242,6,236,34,'#ffc83a');gemI(261,23,10,'#ffc83a');TX('JACKPOT',278,23,{s:12,w:700,c:'#ffd88a'});TX(fmt(jp.v),468,23,{a:'right',s:17,w:700,g:GOLDG,st:'rgba(30,15,0,.85)',sw:3});
    btn(8,6,226,34,()=>openModal('free'));btn(242,6,236,34,()=>openModal('log'));}
    c.save();c.beginPath();c.moveTo(530,0);c.lineTo(750,0);c.lineTo(730,44);c.lineTo(550,44);c.closePath();c.fillStyle=lg(c,0,0,0,44,[[0,'rgba(28,62,130,.96)'],[1,'rgba(8,22,60,.96)']]);c.fill();c.shadowColor='#7fd0ff';c.shadowBlur=9;c.strokeStyle='#8fd8ff';c.lineWidth=2.4;c.stroke();c.restore();
    TX('Lvl '+you.lv,598,19,{s:18,w:700,a:'center',c:'#eaf6ff',st:'rgba(0,10,40,.8)',sw:3});
    c.save();c.translate(642,19);c.fillStyle=lg(c,0,-10,0,10,[[0,'#fff6b0'],[1,'#f0a000']]);c.beginPath();for(let i=0;i<10;i++){const r=i%2?4.6:10.5,a=-Math.PI/2+i*Math.PI/5;c.lineTo(Math.cos(a)*r,Math.sin(a)*r);}c.closePath();c.fill();c.strokeStyle='#8a4a00';c.lineWidth=1.2;c.stroke();c.restore();
    TX(S.tdots+'/5',688,19,{s:18,w:700,a:'center',c:'#eaf6ff',st:'rgba(0,10,40,.8)',sw:3});
    rr(c,566,33,148,5,2.5);c.fillStyle='rgba(0,0,0,.5)';c.fill();rr(c,566,33,Math.max(5,148*S.tp/8),5,2.5);c.fillStyle='#ffd84a';c.fill();
    if(!host){glassPill(976,6,184,34,'#4af07a');gemI(995,23,10,'#3ae06a');TX('Gems',1012,23,{s:14,w:700,c:'#c8ffd0'});TX(''+S.tokens,1150,23,{a:'right',s:18,w:700,c:'#fff',st:'rgba(0,30,10,.8)',sw:3});btn(976,6,184,34,()=>openModal('shop'));}
    rr(c,1222,5,36,36,9);c.fillStyle=lg(c,0,5,0,41,[[0,'#5ab0ff'],[1,'#1a56c8']]);c.fill();c.strokeStyle='#cfeaff';c.lineWidth=2;c.stroke();TX('⚙',1240,24,{s:22,a:'center',c:'#fff'});btn(1222,5,36,36,()=>openModal('set'));
    /* marquee */
    rr(c,250,48,580,20,10);c.fillStyle='rgba(4,14,44,.62)';c.fill();c.strokeStyle='rgba(127,208,255,.35)';c.lineWidth=1;c.stroke();
    c.save();rr(c,252,48,576,20,10);c.clip();if(S.mq.cur){const mx=S.mq.x-(W-24-828);TX(S.mq.cur.pre,mx,58,{s:13,w:600,c:'#7fe0ff'});TX(S.mq.cur.txt,mx+S.mq.w1,58,{s:13,w:500,c:'#fff'});}c.restore();
    /* icon row */
    roundBtn(870,72,15,'🦋','ภารกิจ',  '#7fd0ff',()=>openModal('mission'));
    if(!host){roundBtn(922,72,15,'🐼','ไหว้รวย','#ff8aa0',()=>openModal('lucky'));
    roundBtn(974,72,15,'🎁','แพ็คเกจ','#ffb04a',()=>openModal('pack'),pad2(Math.floor(S.pkgT/3600)%100)+':'+pad2(Math.floor(S.pkgT/60)%60));}
    roundBtn(1026,72,15,'🏆','อันดับ','#ffd84a',()=>openModal('rank'));
    if(!host)roundBtn(1078,72,15,'🪙','เหรียญฟรี','#5af07a',()=>openModal('free'));
    roundBtn(1130,72,15,'👑','บันทึก','#d8a8ff',()=>openModal('log'));
    /* contest panel */
    const ct=S.ct;
    if(host){}else if(S.panelOpen){const px=6,py=86;
      rr(c,px,py,150,232,12);c.fillStyle=lg(c,0,py,0,py+232,[[0,'rgba(20,52,120,.93)'],[1,'rgba(6,18,54,.93)']]);c.fill();c.save();c.shadowColor='#ffc83a';c.shadowBlur=8;c.strokeStyle='#ffc83a';c.lineWidth=2.2;c.stroke();c.restore();
      const tl=Math.max(0,Math.ceil(ct.t));TX('⏱ '+pad2(Math.floor(tl/60))+':'+pad2(tl%60),px+12,py+15,{s:14,w:700,c:'#cfeaff'});
      TX(ct.ph==='run'?'กำลังแข่งขัน!':ct.ph==='pre'?'การแข่งขันกำลังจะเริ่ม':'สรุปผล',px+75,py+36,{s:12,w:700,a:'center',c:'#fff',st:'rgba(0,0,0,.6)',sw:3});
      TX('แข่งคะแนนชนะ',px+75,py+50,{s:11,w:500,a:'center',c:'#ffe9a0'});
      rr(c,px+8,py+58,134,92,9);c.fillStyle=lg(c,0,py+58,0,py+150,[[0,'#2a6ad8'],[1,'#123a8a']]);c.fill();c.strokeStyle='#8fd8ff';c.lineWidth=1.5;c.stroke();
      c.save();c.translate(px+75,py+94);c.fillStyle=lg(c,0,-30,0,30,[[0,'#fff2a0'],[1,'#e09a10']]);c.beginPath();c.moveTo(-24,-30);c.lineTo(24,-30);c.quadraticCurveTo(24,6,0,10);c.quadraticCurveTo(-24,6,-24,-30);c.fill();c.fillRect(-4,8,8,14);c.fillRect(-16,22,32,6);c.strokeStyle='#ffe27a';c.lineWidth=3;c.beginPath();c.arc(-24,-18,9,1.6,4.7);c.arc(24,-18,9,4.7,1.6);c.stroke();c.restore();
      rr(c,px+14,py+128,122,18,9);c.fillStyle='rgba(4,14,40,.85)';c.fill();TX(fmt(ct.you),px+75,py+137,{s:13,w:700,a:'center',g:GOLDG});
      TX('คู่แข่ง '+fmtK(ct.bot),px+75,py+160,{s:11,w:500,a:'center',c:'#bfe0ff'});
      const lead=ct.you>=ct.bot,tot=Math.max(1,ct.you+ct.bot);rr(c,px+14,py+168,122,8,4);c.fillStyle='rgba(0,0,0,.45)';c.fill();rr(c,px+14,py+168,Math.max(6,122*ct.you/tot),8,4);c.fillStyle=lead?'#5af070':'#ffb04a';c.fill();
      rr(c,px+8,py+184,134,40,9);c.fillStyle=lg(c,0,py+184,0,py+224,[[0,'#ffb12e'],[1,'#d8580a']]);c.fill();c.strokeStyle='#ffe0a0';c.lineWidth=1.8;c.stroke();
      TX('คุณอยู่ที่ห้องแข่งทั่วไป',px+75,py+198,{s:10.5,w:600,a:'center',st:'rgba(80,30,0,.8)',sw:3});TX('อัพไปห้องมืออาชีพ',px+75,py+214,{s:11,w:700,a:'center',c:'#fff7c8',st:'rgba(80,30,0,.8)',sw:3});
      btn(px+8,py+184,134,40,()=>openModal('pro'));btn(px+118,py,32,24,()=>{S.panelOpen=false;});TX('⌃',px+135,py+12,{s:16,a:'center',c:'#cfeaff'});
    }else{navyTool(6,86,36,false,'🏆','',()=>{S.panelOpen=true;});}
    /* right tools */
    navyTool(1214,96,44,false,S.sideOpen?'«':'»','',()=>{S.sideOpen=!S.sideOpen;sfx('click');});
    if(S.sideOpen){
      navyTool(1214,160,44,S.lockOn,'🎯','ล็อกเป้า',()=>{S.lockOn=!S.lockOn;if(!S.lockOn)S.lockT=null;sfx('click');toast(S.lockOn?'ล็อกเป้า: แตะที่ปลาเพื่อเลือกเป้าหมาย':'ปิดล็อกเป้า');});
      navyTool(1214,224,44,S.x2,'⚡','ยิงเร็ว x2',()=>{S.x2=!S.x2;sfx('click');});
      navyTool(1214,288,44,false,'🔫','เปลี่ยนปืน',()=>openModal('cannon'));
    }
    if(S.lockOn&&S.lockT&&!S.lockT.dead){const f=S.lockT,r=Math.max(fishRX(f),fishRY(f))+14+Math.sin(t*6)*3;c.save();c.translate(f.x,f.y);c.rotate(t*2);c.strokeStyle='#ff4a3a';c.lineWidth=3;c.shadowColor='#ff3a2a';c.shadowBlur=10;for(let i=0;i<4;i++){c.beginPath();c.arc(0,0,r,i*1.571+.2,i*1.571+1.2);c.stroke();}c.restore();}
    /* skills (bottom-left) */
    function skill(x,i,emoji,name,fn){const y=H-64,sz=50,cd=S.skillCd[i];rr(c,x,y,sz,sz,10);c.fillStyle=lg(c,0,y,0,y+sz,[[0,'#7a848e'],[1,'#2a3036']]);c.fill();c.strokeStyle='#7fd0ff';c.lineWidth=2.2;c.stroke();rustS(c,x,y,sz,sz,i+3);
      c.font='24px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillStyle='#fff';c.globalAlpha=S.skillN[i]>0?1:.4;c.fillText(emoji,x+sz/2,y+sz/2-4);c.globalAlpha=1;
      TX(name,x+sz/2,y+sz-8,{s:10,w:600,a:'center',st:'rgba(0,10,30,.9)',sw:3});
      c.fillStyle='#ff4a3a';c.beginPath();c.arc(x+sz-3,y+4,9,0,7);c.fill();c.strokeStyle='#fff';c.lineWidth=1.5;c.stroke();TX(''+S.skillN[i],x+sz-3,y+5,{s:11,w:700,a:'center'});
      if(cd>0){c.fillStyle='rgba(0,10,40,.65)';c.save();rr(c,x,y,sz,sz,10);c.clip();c.beginPath();c.moveTo(x+sz/2,y+sz/2);c.arc(x+sz/2,y+sz/2,sz,-1.571,-1.571+6.283*cd/(i?6:8));c.closePath();c.fill();c.restore();}
      btn(x,y,sz,sz,fn);}
    skill(14,0,'❄','แช่แข็ง',useFreeze);skill(72,1,'🚀','ตอร์ปิโด',useTorpedo);
    if(S.atom>0){const x=940,y=H-130;c.save();c.translate(x+26,y+28);const pl=1+Math.sin(t*8)*.06;c.scale(pl,pl);c.fillStyle=lg(c,0,-28,0,28,[[0,'#ff7a5a'],[1,'#c01010']]);c.beginPath();c.arc(0,0,28,0,7);c.fill();c.strokeStyle='#ffe27a';c.lineWidth=3;c.stroke();c.font='28px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText('☢',0,-2);c.restore();TX(Math.ceil(S.atom)+'s',x+26,y+64,{s:11,w:700,a:'center',c:'#ffe27a',st:'rgba(0,0,0,.9)',sw:3});btn(x,y,52,52,useAtom);}
    if(S.youTag>0){const bob=Math.sin(t*5)*4,tx=you.x,ty=H-210+bob;TX('ตำแหน่งของคุณ',tx,ty-16,{s:19,w:700,a:'center',c:'#fff',st:'rgba(0,40,120,.95)',sw:5,sh:'#5ad0ff',sb:10});c.fillStyle='#ffd84a';c.beginPath();c.moveTo(tx-12,ty+2);c.lineTo(tx+12,ty+2);c.lineTo(tx,ty+16);c.closePath();c.fill();}
    if(S.toast){const k=S.toast.t,a=k<.2?k/.2:k>2.2?(2.6-k)/.4:1;c.save();c.globalAlpha=clamp(a,0,1);const w=Math.min(700,40+S.toast.s.length*14);rr(c,W/2-w/2,104,w,34,17);c.fillStyle='rgba(8,22,60,.9)';c.fill();c.strokeStyle='#8fd3ff';c.lineWidth=2;c.stroke();TX(S.toast.s,W/2,121,{s:15,w:500,a:'center'});c.restore();}
  }
  /* ====================== RENDER ====================== */
  function render(t){
    const c=ctx;S.btns.length=0;
    c.setTransform(cv.width/W,0,0,cv.height/H,0,0);
    c.save();if(S.shake>0)c.translate(R(-S.shake,S.shake),R(-S.shake,S.shake));
    drawBG(t);drawShadows();
    const fs=S.fish.slice().sort((a,b)=>a.d.r-b.d.r);
    for(const f of fs)drawFish(f,t);
    c.drawImage(FOGC,0,0,W,H);
    for(const f of fs)drawFishOverlay(f,t);
    if(S.fish.some(f=>f.frozen>0)){c.fillStyle='rgba(120,200,255,.14)';c.fillRect(0,0,W,H);}
    drawRockets();for(const b of S.bullets)drawBullet(b);
    drawBlasts();drawRings();drawParts();
    c.restore();
    drawConsole(t);drawPillar(you,368,t);drawCannon(you,t);
    drawCoins();drawTexts();
    bloom();
    if(S.flash>0){c.fillStyle='rgba('+S.flashCol+','+clamp(S.flash,0,1)+')';c.fillRect(0,0,W,H);}
    drawHUD(t);
    btn(you.x-44,H-130,88,80,()=>openModal('cannon'));
    drawBand(t);drawWin(t);
  }
  function prevCannon(cvs,i){
    const g=cvs.getContext('2d'),old=ctx;ctx=g;g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,cvs.width,cvs.height);
    g.fillStyle=rg(g,115,80,5,140,[[0,'#2a7ad8'],[1,'#0a2060']]);g.fillRect(0,0,cvs.width,cvs.height);
    g.save();g.translate(115,112);g.scale(.85,.85);drawCannon({x:0,y:0,ang:0,rec:0,pulse:.3,skin:i,spin:0,me:true},performance.now()/1000);g.restore();ctx=old;
  }

  /* ====================== BETTING SYSTEM (virtual coins) ====================== */
  const BKEY='oceanroyale_bet_v1',BMULTS=[1,2,5,10];
  S.bm=1;S.auto={on:false,shots:100,tp:0,sl:0,stopBig:true,left:0,start:0,tgt:null,rt:0,reason:''};
  S.st=null;
  function newStats(){return {bet:0,win:0,shots:0,kills:0,best:null,by:{},hist:[],bal:[],t0:Date.now(),acc:0};}
  S.st=newStats();
  (function(){try{const d=JSON.parse(localStorage.getItem(BKEY)||'null');if(d){S.bm=BMULTS.includes(d.bm)?d.bm:1;Object.assign(S.auto,{shots:d.shots??100,tp:d.tp||0,sl:d.sl||0,stopBig:d.stopBig!==false});}}catch(e){}})();
  function saveBet(){try{localStorage.setItem(BKEY,JSON.stringify({bm:S.bm,shots:S.auto.shots,tp:S.auto.tp,sl:S.auto.sl,stopBig:S.auto.stopBig}));}catch(e){}}
  function curBet(){return BETS[you?you.bet:5]*(S.bm||1);}
  function playerShoot(){
    const bet=curBet();
    if(you.coins<bet){toast(host?'เครดิตไม่พอ! ลดเดิมพันหรือเติมเงิน':'เหรียญไม่พอ! ลดเดิมพันหรือรับเหรียญฟรี');if(S.auto.on)stopAuto('เหรียญไม่พอ');return false;}
    you.coins-=bet;S.st.bet+=bet;S.st.shots++;
    let sid=null;if(host){sid=nextSid();SHOTBET[sid]=bet;Q.shots.push({id:sid,bet:bet});QSTAKE+=bet;}
    let ang=you.ang,lock=null;
    if(S.lockOn){const t=S.lockT;if(t&&!t.dead&&!t.gone&&t.x>10&&t.x<W-10){ang=aimAngle(you,t.x+Math.cos(t.ang)*t.sp*.35,t.y+Math.sin(t.ang)*t.sp*.35);you.ang=ang;lock={f:t};}}
    else if(S.auto.on&&S.auto.tgt&&!S.auto.tgt.dead){lock={f:S.auto.tgt};}
    fireBullet(you,ang,bet,{lock:lock,sid:sid});sfx('shoot',40);
    if(S.auto.on&&S.auto.shots>0){S.auto.left--;if(S.auto.left<=0)stopAuto('ครบจำนวนนัดที่ตั้งไว้');}
    return true;
  }
  killFish=(function(orig){return function(f,owner,bet,depth,fr,ch){
    const was=f.dead,c0=owner.coins;orig(f,owner,bet,depth,fr,ch);
    if(!owner.me||was||!f.dead)return;
    const rw=owner.coins-c0,m=Math.round(rw/Math.max(1,bet)),st=S.st;
    st.win+=rw;st.kills++;const k=f.d.n;const b=st.by[k]||(st.by[k]={n:0,v:0});b.n++;b.v+=rw;
    if(!st.best||rw>st.best.v)st.best={v:rw,n:k,m:m};
    st.hist.unshift({t:Date.now(),n:k,bet:bet,m:m,v:rw});if(st.hist.length>40)st.hist.pop();
    if(S.auto.on&&S.auto.stopBig&&m>=50)later(.3,()=>stopAuto('ได้รางวัลใหญ่ x'+m));
  };})(killFish);
  function startAuto(){
    const a=S.auto;if(you.coins<curBet()){toast('เหรียญไม่พอสำหรับยิงอัตโนมัติ');return;}
    a.on=true;a.left=a.shots>0?a.shots:Infinity;a.start=you.coins;a.tgt=null;a.rt=0;a.reason='';
    S.lockOn=false;S.lockT=null;toast('เริ่มยิงอัตโนมัติ — เดิมพัน '+fmt(curBet())+' / นัด');sfx('banner');
  }
  function stopAuto(why){const a=S.auto;if(!a.on)return;a.on=false;a.tgt=null;a.reason=why||'';const pl=you.coins-a.start;
    toast('หยุดยิงอัตโนมัติ'+(why?' ('+why+')':'')+' · '+(pl>=0?'กำไร +':'ขาดทุน ')+fmt(pl));sfx('click');}
  function pickAutoTarget(){
    let best=null,bs=-1;
    for(const f of S.fish){if(f.dead||f.gone||f.x<60||f.x>W-60||f.y<80||f.y>H-170)continue;
      const val=Math.pow(f.d.r*(f.mult>1?f.mult:1),.3),dist=Math.hypot(f.x-you.x,f.y-you.y),sc=val*(1+(f.hits||0)*.05)/(1+dist/900)*R(.85,1.15);
      if(sc>bs){bs=sc;best=f;}}
    return best;
  }
  updateGame=(function(orig){return function(dt){
    orig(dt);
    const st=S.st;st.acc+=dt;if(st.acc>=2){st.acc=0;st.bal.push(Math.round(you.coins));if(st.bal.length>180)st.bal.shift();}
    const a=S.auto;if(!a.on||S.mode!=='play')return;
    const pl=you.coins-a.start;
    if(a.tp>0&&pl>=a.tp){stopAuto('ถึงเป้ากำไร');return;}
    if(a.sl>0&&-pl>=a.sl){stopAuto('ถึงขีดจำกัดขาดทุน');return;}
    a.rt-=dt;const t=a.tgt;
    if(!t||t.dead||t.gone||t.x<40||t.x>W-40||t.y>H-150||a.rt<=0){a.tgt=pickAutoTarget();a.rt=R(1.5,3);}
    if(!a.tgt)return;
    you.angT=aimAngle(you,a.tgt.x,a.tgt.y);
    if(!PTR.down&&you.cool<=0&&Math.abs(you.angT-you.ang)<.2){if(playerShoot())you.cool=SKINS[you.skin||0].cool*(S.x2?.55:1);}
  };})(updateGame);
  /* ---------- console additions ---------- */
  drawConsole=(function(orig){return function(t){
    orig(t);const c=ctx,a=S.auto,pl=S.st.win-S.st.bet;
    /* replace AMMO row on left LCD with session P/L */
    c.fillStyle='#061a2a';c.fillRect(428,H-44,134,11);
    lcdText('P/L:',430,H-38);lcdText((pl>=0?'+':'-')+fmtK(Math.abs(pl)),558,H-38,{a:'right',c:pl>=0?'#7dff8a':'#ff7a7a'});
    if(S.bm>1){rr(c,820,H-82,40,14,7);c.fillStyle='#ff6a1a';c.fill();TX('x'+S.bm,840,H-75,{s:11,w:700,a:'center'});}
    /* AUTO button */
    const x=890,y=H-74,w=64,h=46,on=a.on;
    rr(c,x,y,w,h,9);c.fillStyle=on?lg(c,0,y,0,y+h,[[0,'#6aff7a'],[1,'#16a02a']]):lg(c,0,y,0,y+h,[[0,'#c8d0d6'],[.5,'#7a848c'],[1,'#3a4248']]);c.fill();c.strokeStyle=OL2;c.lineWidth=1.8;c.stroke();
    rivet(c,x+5,y+5,1.8);rivet(c,x+w-5,y+5,1.8);
    TX('AUTO',x+w/2,y+17,{s:15,w:700,a:'center',c:on?'#fff':'#10161c',st:on?'rgba(0,60,10,.8)':null,sw:3});
    TX(on?(a.left===Infinity?'∞':a.left+' นัด'):'ตั้งค่า',x+w/2,y+34,{s:11,w:600,a:'center',c:on?'#eaffe8':'#1a2230'});
    if(on){const bl=Math.sin(t*8)>0;c.fillStyle=bl?'#fff':'#9f9';c.beginPath();c.arc(x+w-10,y+17,3,0,7);c.fill();}
    btn(x,y,w,h,()=>{if(S.auto.on)stopAuto('ผู้เล่นกดหยุด');else openModal('bet','auto');});
    btn(716,H-71,144,42,()=>openModal('bet','bet'));btn(422,H-71,144,42,()=>openModal('bet','stat'));btn(758,H-22,60,17,()=>openModal('bet','bet'));
    if(on&&a.tgt&&!a.tgt.dead){const f=a.tgt,r=Math.max(fishRX(f),fishRY(f))+10;c.save();c.translate(f.x,f.y);c.rotate(-t*2);c.strokeStyle='rgba(120,255,140,.9)';c.lineWidth=2.5;c.setLineDash([8,6]);c.beginPath();c.arc(0,0,r,0,7);c.stroke();c.restore();}
  };})(drawConsole);
  /* ---------- bet center modal ---------- */
  (function(){const st=document.createElement('style');st.textContent=`
  .bgrid{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin:6px 0 10px}
  .bgrid button,.chips button{border:2px solid #6fa8e8;background:#fff;color:#0a2a6a;font-family:inherit;font-weight:700;font-size:16px;border-radius:10px;padding:8px 4px;cursor:pointer}
  .bgrid button.on,.chips button.on{background:linear-gradient(#ffb12e,#e8650a);border-color:#ffe0a0;color:#fff}
  .bgrid button:disabled{opacity:.35;cursor:default}
  .chips{display:flex;gap:6px;flex-wrap:wrap;margin:4px 0 10px}.chips button{font-size:14px;padding:6px 12px;flex:1;min-width:64px}
  .stake{display:flex;align-items:center;justify-content:space-between;background:#0e2a5a;color:#fff;border-radius:12px;padding:10px 14px;margin-top:4px}
  .stake b{font-size:26px;color:#ffd84a}.stake small{color:#9fc8ee;font-size:13px}
  .stg{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:10px}
  .stg div{background:#fff;border-radius:10px;padding:8px;text-align:center;border:2px solid #9fc8ee}
  .stg small{display:block;font-size:12px;color:#456}.stg b{font-size:18px;font-variant-numeric:tabular-nums}
  .pos{color:#12a02a}.neg{color:#d02a2a}
  .chart{width:100%;height:120px;background:#0e2a5a;border-radius:10px;display:block;margin-bottom:10px}
  .hint{font-size:13px;color:#456;margin:2px 0 8px}
  .bigbtn{width:100%;margin-top:6px;font-size:20px;padding:8px}
  `;if(document.head)document.head.appendChild(st);})();
  openModal=(function(orig){return function(k,tab){
    if(k!=='bet')return orig(k);
    sfx('click');tab=tab||'bet';
    const tabs='<div class="tabs">'+[['bet','เดิมพัน'],['auto','ยิงอัตโนมัติ'],['stat','สถิติ'],['hist','ประวัติ']].map(x=>'<button data-t="'+x[0]+'"'+(tab===x[0]?' class="on"':'')+'>'+x[1]+'</button>').join('')+'</div>';
    const rm=ROOMS[S.room],st=S.st,a=S.auto;let b='';
    const chip=(name,vals,cur,lab)=>'<div class="chips" data-k="'+name+'">'+vals.map(v=>'<button data-v="'+v+'"'+(v===cur?' class="on"':'')+'>'+lab(v)+'</button>').join('')+'</div>';
    if(tab==='bet'){
      b+='<h3>ระดับเดิมพันต่อนัด</h3><p class="hint">ห้องนี้เดิมพันได้ '+fmt(BETS[rm.lo])+' – '+fmt(BETS[rm.hi])+' · เดิมพันสูง = รัศมีระเบิดกว้างขึ้นเล็กน้อยและรางวัลคูณตามเดิมพัน</p>';
      b+='<div class="bgrid">'+BETS.map((v,i)=>'<button data-i="'+i+'"'+(i===you.bet?' class="on"':'')+(i<rm.lo||i>rm.hi?' disabled':'')+'>'+fmtK(v)+'</button>').join('')+'</div>';
      b+='<h3>ตัวคูณเดิมพัน</h3>'+chip('bm',BMULTS,S.bm,v=>'x'+v);
      b+='<div class="stake"><div><small>เดิมพันต่อนัด</small><br><b>'+fmt(curBet())+'</b></div><div style="text-align:right"><small>ยิงได้อีกประมาณ</small><br><b style="color:#fff;font-size:20px">'+fmt(Math.floor(you.coins/curBet()))+' นัด</b></div></div>';
    }else if(tab==='auto'){
      b+='<p class="hint">ปืนจะเล็งปลาที่คุ้มค่าที่สุดให้อัตโนมัติ และหยุดเองเมื่อถึงเงื่อนไขที่ตั้งไว้ (แตะปุ่ม AUTO บนคอนโซลเพื่อหยุดได้ทุกเมื่อ)</p>';
      b+='<h3>จำนวนนัด</h3>'+chip('shots',[50,100,300,1000,0],a.shots,v=>v?fmt(v):'ไม่จำกัด');
      b+='<h3>หยุดเมื่อกำไรถึง</h3>'+chip('tp',[0,100000,500000,1000000,5000000],a.tp,v=>v?'+'+fmtK(v):'ปิด');
      b+='<h3>หยุดเมื่อขาดทุนถึง</h3>'+chip('sl',[0,100000,500000,1000000,5000000],a.sl,v=>v?'-'+fmtK(v):'ปิด');
      b+='<div class="row"><label>หยุดเมื่อได้รางวัลใหญ่ (x50 ขึ้นไป)</label><div class="sw'+(a.stopBig?' on':'')+'" id="sbig"><i></i></div></div>';
      b+='<div class="stake"><div><small>เดิมพันต่อนัด</small><br><b>'+fmt(curBet())+'</b></div><div style="text-align:right"><small>ใช้สูงสุด'+(a.shots?'':' (ต่อ 100 นัด)')+'</small><br><b style="color:#fff;font-size:20px">'+fmt(curBet()*(a.shots||100))+'</b></div></div>';
      b+='<button class="obtn bigbtn" id="abtn">'+(a.on?'⏹ หยุดยิงอัตโนมัติ':'▶ เริ่มยิงอัตโนมัติ')+'</button>';
    }else if(tab==='stat'){
      const pl=st.win-st.bet,rtp=st.bet?st.win/st.bet*100:0,mins=Math.max(1,Math.round((Date.now()-st.t0)/60000));
      b+='<div class="stg"><div><small>ยอดเดิมพันรวม</small><b>'+fmtK(st.bet)+'</b></div><div><small>ยอดที่ได้รับ</small><b>'+fmtK(st.win)+'</b></div><div><small>กำไร/ขาดทุน</small><b class="'+(pl>=0?'pos':'neg')+'">'+(pl>=0?'+':'-')+fmtK(Math.abs(pl))+'</b></div><div><small>อัตราคืน (RTP)</small><b>'+rtp.toFixed(1)+'%</b></div>';
      b+='<div><small>จำนวนนัด</small><b>'+fmt(st.shots)+'</b></div><div><small>ปลาที่จับได้</small><b>'+fmt(st.kills)+'</b></div><div><small>อัตราจับ</small><b>'+(st.shots?(st.kills/st.shots*100).toFixed(1):'0')+'%</b></div><div><small>รางวัลสูงสุด</small><b>'+(st.best?fmtK(st.best.v):'—')+'</b></div></div>';
      b+='<canvas class="chart" id="bch" width="840" height="240"></canvas>';
      const rows=Object.entries(st.by).sort((x,y)=>y[1].v-x[1].v).slice(0,10).map(([n,v])=>({c:[n,v.n+' ตัว','+'+fmt(v.v)]}));
      b+='<h3>รายได้แยกตามชนิดปลา</h3>'+tblRows(rows.length?rows:[{c:['—','ยังไม่มีข้อมูล','']}]);
      b+='<p class="hint">เล่นมาแล้ว '+mins+' นาที · สถิติเก็บเฉพาะรอบนี้ (เหรียญฟรี/โบนัสไม่นับ)</p><button class="obtn" id="rst">รีเซ็ตสถิติ</button>';
    }else{
      const rows=st.hist.map(h=>({c:[new Date(h.t).toLocaleTimeString('th-TH'),h.n,fmtK(h.bet),'x'+h.m,'+'+fmt(h.v)]}));
      b+='<p class="hint">รางวัล 40 ครั้งล่าสุด (เดิมพัน × ตัวคูณปลา)</p>'+tblRows(rows.length?rows:[{c:['—','ยังไม่มีประวัติ','','','']}]);
    }
    panel('ศูนย์เดิมพัน',tabs+'<div class="pb">'+b+'</div>',760);
    MD.querySelectorAll('.tabs button').forEach(x=>x.onclick=()=>openModal('bet',x.dataset.t));
    MD.querySelectorAll('.bgrid button').forEach(x=>x.onclick=()=>{you.bet=+x.dataset.i;openModal('bet','bet');});
    MD.querySelectorAll('.chips').forEach(g=>g.querySelectorAll('button').forEach(x=>x.onclick=()=>{const v=+x.dataset.v,kk=g.dataset.k;if(kk==='bm')S.bm=v;else a[kk]=v;if(kk==='shots'&&a.on)a.left=v||Infinity;saveBet();openModal('bet',tab);}));
    if($('sbig'))$('sbig').onclick=()=>{a.stopBig=!a.stopBig;saveBet();openModal('bet','auto');};
    if($('abtn'))$('abtn').onclick=()=>{if(a.on)stopAuto('ผู้เล่นกดหยุด');else{closeModal();startAuto();}};
    if($('rst'))$('rst').onclick=()=>{S.st=newStats();openModal('bet','stat');};
    if($('bch')){const cv2=$('bch'),g=cv2.getContext('2d'),d=st.bal.concat([Math.round(you.coins)]),Wc=cv2.width,Hc=cv2.height;
      g.font='600 20px Kanit,sans-serif';
      if(d.length<3){g.fillStyle='#9fc8ee';g.textAlign='center';g.fillText('กราฟยอดเหรียญจะแสดงหลังเล่นสักครู่',Wc/2,Hc/2);}
      else{let lo=Math.min(...d),hi=Math.max(...d);if(hi-lo<1){hi+=1;lo-=1;}const pad=(hi-lo)*.12;lo-=pad;hi+=pad;
        const X=i=>20+i*(Wc-40)/(d.length-1),Y=v=>Hc-20-(v-lo)/(hi-lo)*(Hc-50);
        g.strokeStyle='rgba(255,255,255,.12)';g.lineWidth=1;for(let i=0;i<4;i++){const y=30+i*(Hc-50)/3;g.beginPath();g.moveTo(10,y);g.lineTo(Wc-10,y);g.stroke();}
        const up=d[d.length-1]>=d[0],col=up?'#5af070':'#ff6a6a';
        const gr=g.createLinearGradient(0,0,0,Hc);gr.addColorStop(0,up?'rgba(90,240,112,.35)':'rgba(255,106,106,.35)');gr.addColorStop(1,'rgba(0,0,0,0)');
        g.beginPath();d.forEach((v,i)=>i?g.lineTo(X(i),Y(v)):g.moveTo(X(i),Y(v)));g.lineTo(X(d.length-1),Hc);g.lineTo(X(0),Hc);g.closePath();g.fillStyle=gr;g.fill();
        g.beginPath();d.forEach((v,i)=>i?g.lineTo(X(i),Y(v)):g.moveTo(X(i),Y(v)));g.strokeStyle=col;g.lineWidth=3;g.stroke();
        g.fillStyle='#fff';g.textAlign='left';g.fillText('ยอดเหรียญ: '+fmt(d[d.length-1]),20,24);g.textAlign='right';g.fillStyle=col;const ch=d[d.length-1]-d[0];g.fillText((ch>=0?'+':'')+fmt(ch),Wc-20,24);}
    }
  };})(openModal);

  /* ====================== INIT / LOBBY / LOOP ====================== */
  S.skin=0;S.wing=0;S.paused=false;S.unl={};S.fx=2;let slowAcc=0,slowN=0;
  const SV=load();
  if(SV){S.skin=SV.skin|0;S.wing=SV.wing|0;S.room=SV.room|0;S.saveCoins=SV.coins;}
  function initGame(){
    const rm=ROOMS[S.room];let coins=S.saveCoins||14597886;
    if(host){coins=host.getBalance();ACTIVE_CHAINS.clear();}else if(coins<rm.min)coins=rm.min*3;
    you=newSeat(true,640,'Royal_9911787',23,coins);you.skin=S.skin;you.wing=S.wing;you.angT=0;you.y=H-74;you.bet=clamp(host?3:5,rm.lo,rm.hi);
    bot=newSeat(false,900,'Konpentapang',18,14597886);bot.bet=clamp(5,rm.lo,rm.hi);bot.skin=1;bot.wing=2;
    S.fish=[];S.blasts=[];S.bullets=[];S.nets=[];S.parts=[];S.cfx=[];S.txt=[];S.bolts=[];S.rockets=[];S.expl=[];S.rings=[];S.timers=[];S.bands=[];S.band=null;S.winB=null;
    S.mq={q:[],cur:null,x:0,w:0,w1:0,fillT:2};S.ct={ph:'pre',t:6,you:0,bot:0};S.bossT=26;S.evtT=34;S.lockOn=false;S.lockT=null;S.x2=false;S.atom=0;S.tp=0;S.tdots=0;S.youTag=9;S.panelOpen=true;S.sideOpen=true;S.shake=0;S.flash=0;
    for(let i=0;i<14;i++){const k=['clown','tang','angel','puffer','dolphin','sword','octo','crab','turtle'][i%9];spawnAt(k,{silent:true});const f=S.fish[S.fish.length-1];f.x=R(150,W-150);}
    S.fish.forEach(f=>{f.x=R(100,W-100);});
    pushMQ('[ยิงปลา4คน คลาสสิก]','ยินดีต้อนรับสู่ '+rm.n+(host?'! ยิงแต่ละนัดใช้เครดิต WINNER 69 · ผลตัดสินโดยเซิร์ฟเวอร์':'! เหรียญทั้งหมดเป็นเหรียญจำลอง'));
  }
  function toLobby(){S.mode='lobby';if(S.auto.on)stopAuto();S.saveCoins=you?Math.round(you.coins):S.saveCoins;$('lobby').classList.add('on');$('lobcoins').textContent=host?fmt(host.getBalance()):fmt(S.saveCoins||14597886);}
  function startGame(){
    auInit();sfx('click');const rm=ROOMS[S.room];
    $('lobby').classList.remove('on');initGame();S.mode='play';sfx('banner');
    addBand({title:'ยินดีต้อนรับสู่ '+rm.n,scheme:'blue',icon:'queen',dur:2.4});
  }
  function selRoom(i){S.room=i;$('room0').classList.toggle('sel',i===0);$('room1').classList.toggle('sel',i===1);$('lobinfo').textContent=ROOMS[i].info;sfx('click');}
  $('room0').onclick=()=>selRoom(0);$('room1').onclick=()=>selRoom(1);
  $('startBtn').onclick=startGame;
  $('lobsnd').onclick=()=>{auInit();AU.on=!AU.on;$('lobsnd').textContent=AU.on?'🔊 เสียง':'🔇 ปิดเสียง';};
  selRoom(S.room);$('lobcoins').textContent=host?fmt(host.getBalance()):fmt(S.saveCoins||14597886);
  if(host){
    const sub=stage.querySelector('.sub');if(sub)sub.textContent='OCEAN ROYALE · ใช้เครดิต WINNER 69 · เซิร์ฟเวอร์ตัดสินผล';
    const en=stage.querySelectorAll('.room .ent');if(en[0])en[0].innerHTML='<span class="coin"></span>1 – 30 B';if(en[1])en[1].innerHTML='<span class="coin"></span>5 – 100 B';
  }
  /* send queued shots + hits to WINNER 69 every 250 ms and play back the fish the server killed */
  function flush(){
    if(!host||INFLIGHT)return;
    if(!Q.shots.length&&!Q.claims.length){
      if(you&&!OUT&&!QSTAKE&&!ACTIVE_CHAINS.size)you.coins=host.getBalance();
      if(S.mode==='lobby')$('lobcoins').textContent=fmt(host.getBalance());
      return;
    }
    const batch=Q;Q={shots:[],claims:[]};OUT=QSTAKE;QSTAKE=0;INFLIGHT=true;
    host.call('shots',{shots:batch.shots,claims:batch.claims.map(c=>({b:c.b,fish:c.fish}))}).then(r=>{
      INFLIGHT=false;OUT=0;if(!ALIVE.v)return;
      host.round(r.wager||0,r.payout||0);
      for(const k of (r.kills||[])){
        const bet=SHOTBET[k.b]||curBet(),f=S.fish.find(x=>x.id===k.id);
        if(f&&!f.dead&&!f.gone&&you)killFish(f,you,bet,0,k.reward,k.chain);
        else if(you){const v=r2(k.reward+k.chain);you.coins+=v;S.st.win+=v;floatTxt(you.x,H-170,'+'+fmt(v),{s:30,pop:1});sfx('coin',30);}
      }
      batch.claims.forEach(c=>{delete SHOTBET[c.b];});
      if(you)you.coins=r2(host.getBalance()-QSTAKE-chainLeft());
    }).catch(e=>{
      INFLIGHT=false;OUT=0;if(!ALIVE.v)return;
      if(you)you.coins=r2(host.getBalance()-QSTAKE-chainLeft());
      toast(errText(e));if(S.auto.on)stopAuto(errText(e));
    });
  }
  const FLUSH_IV=host?setInterval(()=>{if(!ALIVE.v){clearInterval(FLUSH_IV);return;}flush();},250):0;
  (function(){const b=$('lobbub');for(let i=0;i<26;i++){const e=document.createElement('i'),s=R(8,34);e.style.cssText='left:'+R(0,100)+'%;width:'+s+'px;height:'+s+'px;animation-duration:'+R(6,15)+'s;animation-delay:-'+R(0,12)+'s';b.appendChild(e);}})();
  buildBG();layout();
  window.addEventListener('resize',layout);window.addEventListener('orientationchange',()=>setTimeout(layout,150));
  if(window.visualViewport)window.visualViewport.addEventListener('resize',layout);
  window.addEventListener('beforeunload',save);
  document.addEventListener('visibilitychange',()=>{if(document.hidden){save();PTR.down=false;}});
  let lastT=performance.now();
  function frame(now){
    requestAnimationFrame(frame);
    let dt=(now-lastT)/1000;lastT=now;if(!(dt>0))return;
    if(S.mode==='play'&&!S.paused&&!window.NOADAPT&&dt<.5){slowAcc+=dt;slowN++;if(slowAcc>2){const avg=slowAcc/slowN;if(avg>.03&&S.fx>0){S.fx--;}slowAcc=0;slowN=0;}}
    dt=Math.min(dt,.05);
    if(S.mode==='play'){
      if(!S.paused)updateGame(dt);
      render(S.t);
    }
  }
  requestAnimationFrame(frame);
  window.__G={S:S,get you(){return you;},get bot(){return bot;},startGame:startGame,updateGame:updateGame,render:render};


  return {
    save: () => { try { save(); } catch (e) { /* ignore */ } if (FLUSH_IV) clearInterval(FLUSH_IV); },
    closeAudio: () => { try { if (AU && AU.c) AU.c.close(); } catch (e) { /* ignore */ } },
  };
}

export default function FishShooter({ host: gameHost = null } = {}) {
  const hostRef = useRef(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = FONT_URL;
    document.head.appendChild(link);
    const style = document.createElement("style");
    style.textContent = CSS;
    document.head.appendChild(style);
    host.innerHTML = MARKUP;

    /* record window/document listeners the engine adds so they can be removed */
    const ALIVE = { v: true };
    const recorded = [];
    const targets = [window, document, window.visualViewport].filter(Boolean);
    targets.forEach((t) => {
      const orig = t.addEventListener;
      t.addEventListener = function (type, fn, opt) {
        recorded.push([t, type, fn, opt]);
        return orig.call(this, type, fn, opt);
      };
    });
    let api = null;
    try {
      api = runGame(ALIVE, gameHost);
    } finally {
      targets.forEach((t) => { delete t.addEventListener; });
    }

    return () => {
      ALIVE.v = false;
      if (api) { api.save(); api.closeAudio(); }
      recorded.forEach(([t, type, fn, opt]) => t.removeEventListener(type, fn, opt));
      host.innerHTML = "";
      style.remove();
      link.remove();
      try { delete window.__G; } catch (e) { /* ignore */ }
    };
  }, []);

  return <div ref={hostRef} className="ocean-royale-root" />;
}
