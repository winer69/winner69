import React, { useEffect, useRef } from 'react';

/**
 * Plushie Paradise — Neon Claw Machine
 *
 * Self-contained arcade mini-game for WINNER 69.
 *
 * STANDALONE: <PlushieParadise /> with no props — manages its own balance
 * in localStorage, same as before.
 *
 * INTEGRATED into WINNER 69's shared wallet — pass:
 *   <PlushieParadise
 *     initialBalance={balance}
 *     winRate={edges.plushieparadise}
 *     onBalanceDelta={(delta) => setBalance(b => b + delta)}
 *     onRound={(wager, payout) => recordRound("plushieparadise", wager, payout)}
 *     onBigWin={(multiplier) => celebrate(multiplier)}
 *     muted={muted}
 *   />
 *
 * All DOM lookups are scoped to this component's own root node, so it's
 * safe to mount alongside the other WINNER 69 games. Virtual credits only
 * — no real-money logic of any kind.
 */
export default function PlushieParadise({
  initialBalance,
  winRate,
  onBalanceDelta,
  onRound,
  onBigWin,
  muted: mutedProp,
  server,        // optional { call(path, body) -> Promise }: the backend decides each grab
} = {}) {
  const rootRef = useRef(null);
  const serverRef = useRef(server);
  serverRef.current = server;
  const onBalanceDeltaRef = useRef(onBalanceDelta);
  const onRoundRef = useRef(onRound);
  const onBigWinRef = useRef(onBigWin);
  const mutedPropRef = useRef(mutedProp);
  useEffect(() => {
    onBalanceDeltaRef.current = onBalanceDelta;
    onRoundRef.current = onRound;
    onBigWinRef.current = onBigWin;
    mutedPropRef.current = mutedProp;
  });

  const initialBalanceProp = initialBalance;
  const winRateProp = winRate;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const hasExternalBalance = typeof onBalanceDeltaRef.current === 'function';

/* ===================== DATA ===================== */
const RARITY = {
  COMMON: { weight:.7, gripResistance:.28 },
  UNCOMMON: { weight:.8, gripResistance:.36 },
  RARE: { weight:.9, gripResistance:.46 },
  EPIC: { weight:1.0, gripResistance:.56 },
  LEGENDARY: { weight:1.1, gripResistance:.68 },
};
const SPECIES = [
  { id:'bear', name:'Bear', rarity:'LEGENDARY', reward:300, body:'#C98A55', accent:'#8A5A32' },
  { id:'bunny', name:'Bunny', rarity:'EPIC', reward:180, body:'#F5F2FA', accent:'#E3B8D8' },
  { id:'pinkcat', name:'Pink Cat', rarity:'RARE', reward:120, body:'#FFB3D6', accent:'#E0679F' },
  { id:'dragon', name:'Dragon', rarity:'UNCOMMON', reward:90, body:'#7ED996', accent:'#3F9E5C' },
  { id:'duck', name:'Duck', rarity:'UNCOMMON', reward:60, body:'#FFE066', accent:'#E0A93A' },
  { id:'purplecat', name:'Purple Cat', rarity:'COMMON', reward:30, body:'#C6ADFF', accent:'#8E6DDB' },
  { id:'panda', name:'Panda', rarity:'RARE', reward:130, body:'#F5F5F5', accent:'#2B2B2B' },
  { id:'fox', name:'Fox', rarity:'UNCOMMON', reward:70, body:'#FF9A56', accent:'#C96A2E' },
  { id:'pig', name:'Pig', rarity:'COMMON', reward:35, body:'#FFC2D1', accent:'#E08BA3' },
  { id:'koala', name:'Koala', rarity:'COMMON', reward:33, body:'#B9C4CC', accent:'#8892A0' },
  { id:'hamster', name:'Hamster', rarity:'COMMON', reward:30, body:'#F2D49B', accent:'#C79A56' },
  { id:'whitecat', name:'White Cat', rarity:'UNCOMMON', reward:65, body:'#FFFFFF', accent:'#D9C7E8' },
];
const speciesById = id => SPECIES.find(s => s.id === id);
const PRIZE_BOARD = SPECIES.slice().sort((a,b)=>b.reward-a.reward).slice(0,6);

function rand(a,b){ return a + Math.random()*(b-a); }
function pick(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

function resolveGrab(species){
  const r = RARITY[species.rarity];
  const grabPower = 0.62 + Math.random()*0.3;
  const holdThreshold = r.weight*0.5 + r.gripResistance*0.5;
  return grabPower - holdThreshold > 0.06;
}

/* ===================== PLUSHIE SVG ===================== */
function earsSVG(id, accent){
  switch(id){
    case 'bunny': return `<ellipse cx="-14" cy="-38" rx="6" ry="22" fill="${accent}" transform="rotate(-8 -14 -38)"/><ellipse cx="14" cy="-38" rx="6" ry="22" fill="${accent}" transform="rotate(8 14 -38)"/>`;
    case 'pinkcat': case 'purplecat': case 'whitecat':
      return `<polygon points="-24,-24 -30,-42 -12,-30" fill="${accent}"/><polygon points="24,-24 30,-42 12,-30" fill="${accent}"/>`;
    case 'fox': return `<polygon points="-22,-22 -30,-44 -8,-30" fill="${accent}"/><polygon points="22,-22 30,-44 8,-30" fill="${accent}"/>`;
    case 'dragon': return `<polygon points="-10,-34 -16,-50 -4,-38" fill="${accent}"/><polygon points="2,-40 -2,-56 8,-42" fill="${accent}"/><polygon points="14,-34 10,-50 20,-38" fill="${accent}"/>`;
    case 'duck': return '';
    case 'pig': return `<ellipse cx="-20" cy="-26" rx="9" ry="11" fill="${accent}"/><ellipse cx="20" cy="-26" rx="9" ry="11" fill="${accent}"/>`;
    case 'hamster': return `<circle cx="-22" cy="-24" r="10" fill="${accent}"/><circle cx="22" cy="-24" r="10" fill="${accent}"/>`;
    case 'koala': return `<circle cx="-26" cy="-16" r="13" fill="${accent}"/><circle cx="26" cy="-16" r="13" fill="${accent}"/>`;
    default: return `<circle cx="-22" cy="-28" r="11" fill="${accent}"/><circle cx="22" cy="-28" r="11" fill="${accent}"/>`;
  }
}
function snoutSVG(id, accent){
  if(id==='duck') return `<ellipse cx="0" cy="10" rx="14" ry="8" fill="#F4A21D"/>`;
  if(id==='pig') return `<ellipse cx="0" cy="8" rx="11" ry="8" fill="${accent}"/><circle cx="-4" cy="8" r="1.6" fill="#7a3f52"/><circle cx="4" cy="8" r="1.6" fill="#7a3f52"/>`;
  if(id==='bear'||id==='panda'||id==='koala') return `<ellipse cx="0" cy="6" rx="11" ry="8" fill="${id==='panda'?'#F5F5F5':'#F4E6D3'}" opacity="0.9"/>`;
  return '';
}
function plushieSVG(speciesId, size=58){
  const s = speciesById(speciesId);
  if(!s) return '';
  const isPanda = s.id === 'panda';
  return `<svg viewBox="-42 -60 84 108" width="${size}" height="${size*1.15}" aria-label="${s.name}">
    <ellipse cx="0" cy="42" rx="26" ry="7" fill="rgba(0,0,0,0.35)"/>
    <ellipse cx="0" cy="18" rx="30" ry="26" fill="${s.body}"/>
    <circle cx="0" cy="-16" r="26" fill="${s.body}"/>
    ${earsSVG(s.id, s.accent)}
    ${isPanda ? `<ellipse cx="-11" cy="-16" rx="8" ry="10" fill="#2B2B2B"/><ellipse cx="11" cy="-16" rx="8" ry="10" fill="#2B2B2B"/>` : ''}
    <circle cx="-18" cy="34" r="8" fill="${s.accent}"/><circle cx="18" cy="34" r="8" fill="${s.accent}"/>
    <circle cx="-9" cy="-16" r="3.4" fill="#2B2B2B"/><circle cx="9" cy="-16" r="3.4" fill="#2B2B2B"/>
    <circle cx="-7.6" cy="-17.2" r="1" fill="#fff"/><circle cx="10.4" cy="-17.2" r="1" fill="#fff"/>
    ${snoutSVG(s.id, s.accent)}
    <ellipse cx="-16" cy="-8" rx="4.5" ry="2.6" fill="#FF9EC4" opacity="0.55"/><ellipse cx="16" cy="-8" rx="4.5" ry="2.6" fill="#FF9EC4" opacity="0.55"/>
    <ellipse cx="-9" cy="-27" rx="8" ry="5" fill="#fff" opacity="0.25"/>
  </svg>`;
}

/* ===================== PILE ===================== */
function generatePile(count=26){
  const pile = [];
  for(let i=0;i<count;i++){
    const layer = i < count*0.3 ? 'back' : i < count*0.7 ? 'middle' : 'front';
    const species = pick(SPECIES);
    const baseScale = layer==='back' ? rand(.55,.7) : layer==='middle' ? rand(.72,.92) : rand(.95,1.15);
    pile.push({
      uid: 'p'+i+'-'+Math.random().toString(36).slice(2,8),
      speciesId: species.id, layer,
      x: rand(6,94), y: rand(46,92) + (layer==='back'?-6:layer==='front'?6:0),
      scale: baseScale, rotation: rand(-22,22),
      z: layer==='back' ? Math.floor(rand(1,6)) : layer==='middle' ? Math.floor(rand(6,13)) : Math.floor(rand(13,21)),
      blur: layer==='back' ? rand(.6,1.4) : 0,
      brightness: layer==='back' ? rand(.72,.85) : layer==='front' ? rand(1.02,1.1) : 1,
    });
  }
  return pile.sort((a,b)=>a.z-b.z);
}
function findClosestPlushie(pile, clawX){
  let closest = null, bestDist = Infinity;
  for(const p of pile){
    if(p.layer!=='front' && p.layer!=='middle') continue;
    const d = Math.abs(p.x - clawX);
    if(d < bestDist){ bestDist = d; closest = p; }
  }
  return closest;
}

/* ===================== SOUND ===================== */
const sound = (function(){
  let ctx = null, muted = false;
  function ensureCtx(){ if(ctx) return ctx; try{ ctx = new (window.AudioContext||window.webkitAudioContext)(); }catch(e){ ctx=null; } return ctx; }
  function tone({freq=440,duration=.15,type='sine',gain=.08,sweepTo=null,delay=0}){
    if(muted) return;
    const c = ensureCtx(); if(!c) return;
    try{
      const osc=c.createOscillator(), g=c.createGain();
      osc.type=type; const t0=c.currentTime+delay;
      osc.frequency.setValueAtTime(freq,t0);
      if(sweepTo) osc.frequency.linearRampToValueAtTime(sweepTo,t0+duration);
      g.gain.setValueAtTime(gain,t0);
      g.gain.exponentialRampToValueAtTime(.001,t0+duration);
      osc.connect(g); g.connect(c.destination);
      osc.start(t0); osc.stop(t0+duration+.02);
    }catch(e){}
  }
  return {
    setMuted(m){ muted=m; },
    isMuted(){ return muted; },
    button(){ tone({freq:520,duration:.08,type:'square',gain:.06}); },
    joystick(){ tone({freq:300,duration:.05,type:'triangle',gain:.03}); },
    thud(){ tone({freq:90,duration:.16,type:'sine',gain:.09,sweepTo:55}); },
    coinInsert(){ tone({freq:1400,duration:.05,type:'square',gain:.045}); tone({freq:1100,duration:.05,type:'square',gain:.035,delay:.04}); },
    motor(){ tone({freq:180,duration:.4,type:'sawtooth',gain:.03,sweepTo:140}); },
    clawOpen(){ tone({freq:700,duration:.18,type:'square',gain:.05,sweepTo:850}); },
    clawClose(){ tone({freq:850,duration:.22,type:'square',gain:.05,sweepTo:600}); },
    grab(){ tone({freq:220,duration:.15,type:'triangle',gain:.07}); },
    fail(){ tone({freq:300,duration:.3,type:'sawtooth',gain:.06,sweepTo:120}); },
    win(){ tone({freq:523,duration:.14,type:'sine',gain:.08}); tone({freq:659,duration:.14,type:'sine',gain:.08,delay:.12}); tone({freq:784,duration:.22,type:'sine',gain:.08,delay:.24}); },
    coin(){ tone({freq:988,duration:.09,type:'square',gain:.05}); },
    bonus(){ tone({freq:660,duration:.15,type:'sine',gain:.07}); tone({freq:990,duration:.2,type:'sine',gain:.07,delay:.14}); },
    jackpot(){ [523,659,784,1046,1318].forEach((f,i)=>tone({freq:f,duration:.3,type:'sine',gain:.09,delay:i*.1})); },
    destroy(){ if(ctx && ctx.close){ try{ ctx.close(); }catch(e){} } },
  };
})();

let ppStopped = false; // set true on component unmount to halt rAF loops

/* ===================== PARTICLES ===================== */
const particleCanvas = root.querySelector('#pp-particles');
const pctx = particleCanvas.getContext('2d');
let particles = [];
function resizeCanvas(){
  particleCanvas.width = particleCanvas.offsetWidth;
  particleCanvas.height = particleCanvas.offsetHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();
function burstParticles(kind, originXPct, originYPct){
  const w = particleCanvas.width, h = particleCanvas.height;
  const ox = (originXPct/100)*w, oy = (originYPct/100)*h;
  const count = kind==='jackpot' ? 60 : kind==='win' ? 34 : 16;
  const colors = kind==='jackpot' ? ['#FFD24C','#FFF3C0','#FF9DE2'] : kind==='win' ? ['#FFD24C','#8fd8ff'] : ['#8fd8ff','#C6A6FF','#FFD24C'];
  for(let i=0;i<count;i++){
    const angle = Math.random()*Math.PI*2;
    const speed = 2 + Math.random()*(kind==='jackpot'?6:3.5);
    particles.push({ x:ox,y:oy, vx:Math.cos(angle)*speed, vy:Math.sin(angle)*speed-2, life:1, decay:.008+Math.random()*.01, size:2+Math.random()*4, color:colors[Math.floor(Math.random()*colors.length)] });
  }
}
function particleTick(){
  pctx.clearRect(0,0,particleCanvas.width,particleCanvas.height);
  particles = particles.filter(p=>p.life>0);
  for(const p of particles){
    p.x+=p.vx; p.y+=p.vy; p.vy+=.08; p.life-=p.decay;
    pctx.globalAlpha = Math.max(p.life,0);
    pctx.fillStyle = p.color;
    pctx.beginPath(); pctx.arc(p.x,p.y,p.size,0,Math.PI*2); pctx.fill();
  }
  pctx.globalAlpha = 1;
  if(!ppStopped) requestAnimationFrame(particleTick);
}
requestAnimationFrame(particleTick);

/* ===================== STATE ===================== */
const STATES = { IDLE:'IDLE', MOVING:'MOVING', DROPPING:'DROPPING', OPENING:'OPENING', GRABBING:'GRABBING', LIFTING:'LIFTING', RETURNING:'RETURNING', RELEASING:'RELEASING', WIN:'WIN', FAIL:'FAIL' };
const LOCKED = new Set([STATES.MOVING,STATES.DROPPING,STATES.OPENING,STATES.GRABBING,STATES.LIFTING,STATES.RETURNING,STATES.RELEASING]);
const TIMINGS = { moveToTarget:900, descend:2000, grabPause:260, open:380, close:520, liftPause:300, lift:900, returnMove:1000, releasePause:260, release:500, failShake:650 };
const CLAW_MIN_X=8, CLAW_MAX_X=92, CLAW_TOP_Y=9;
const sleep = ms => new Promise(res=>setTimeout(res,ms));

let pile = generatePile(26);
let machineState = STATES.IDLE;
let clawX = 50, cableLength = CLAW_TOP_Y, clawOpen=false, heldSpeciesId=null;
let balance = hasExternalBalance
  ? (typeof initialBalanceProp === 'number' ? initialBalanceProp : 1250)
  : (Number(localStorage.getItem('winner69_plushieParadise_balance')) || 1250);
let bet = Number(localStorage.getItem('winner69_plushieParadise_bet')) || 10;
let muted = (typeof mutedPropRef.current === 'boolean')
  ? mutedPropRef.current
  : (localStorage.getItem('winner69_plushieParadise_muted') === 'true');
let streak = 0;
let direction = 0;

sound.setMuted(muted);

/* ===================== RENDER HELPERS ===================== */
const $ = id => root.querySelector('#'+id);
const clawRig = $('pp-clawRig'), cableWrap = $('pp-cableWrap'), clawHead = $('pp-clawHead');
const fingerL = $('pp-fingerL'), fingerC = $('pp-fingerC'), fingerR = $('pp-fingerR');
const contactShadow = $('pp-contactShadow');
const cableLine = $('pp-cableLine');
const heldSlot = $('pp-heldSlot');

function renderPile(){
  const el = $('pp-pile');
  el.innerHTML = pile.map(p => {
    const shadow = p.layer==='front'
      ? 'drop-shadow(0 8px 7px rgba(0,0,0,.5)) drop-shadow(0 2px 2px rgba(0,0,0,.3))'
      : p.layer==='middle'
      ? 'drop-shadow(0 5px 5px rgba(0,0,0,.4))'
      : 'drop-shadow(0 3px 3px rgba(0,0,0,.3))';
    const breatheDelay = (Math.random()*-4.2).toFixed(2);
    return `
    <div class="pile-item layer-${p.layer}" data-uid="${p.uid}" style="left:${p.x}%;top:${p.y}%;transform:translate(-50%,-50%) rotate(${p.rotation}deg) scale(${p.scale});z-index:${p.z};filter:blur(${p.blur}px) brightness(${p.brightness}) ${shadow}">
      <div class="pile-item-inner" style="animation-delay:${breatheDelay}s">${plushieSVG(p.speciesId,58)}</div>
    </div>`;
  }).join('');
}
function renderPrizeBoard(){
  const betUnit = bet / 10;
  $('pp-prizeList').innerHTML = PRIZE_BOARD.map(s => `
    <li class="prize-row">
      <span class="prize-icon">${plushieSVG(s.id,34)}</span>
      <span class="prize-name">${s.name}</span>
      <span class="prize-value">${Math.round(s.reward*betUnit)}</span>
    </li>`).join('');
}
function renderBulbs(){
  $('pp-bulbs').innerHTML = Array.from({length:18}).map((_,i)=>{
    const duration = (1.5 + Math.random()*0.8).toFixed(2);
    const delay = ((i%6)*0.15 + Math.random()*0.3).toFixed(2);
    return `<span class="bulb" style="animation-duration:${duration}s;animation-delay:${delay}s"></span>`;
  }).join('');
}

function setClawX(x, durationMs){
  const prevX = clawX;
  clawX = x;
  clawRig.style.transition = durationMs
    ? `left ${durationMs}ms cubic-bezier(.28,1.2,.45,1)`
    : 'left 0.05s linear';
  clawRig.style.left = x + '%';

  if(durationMs){
    const dir = x - prevX;
    const skewAmt = Math.max(-8, Math.min(8, -dir*0.6));
    cableLine.style.transition = 'transform 160ms ease-out';
    cableLine.style.transform = `skewX(${skewAmt}deg)`;
    setTimeout(()=>{
      cableLine.style.transition = `transform ${Math.max(200,durationMs-160)}ms cubic-bezier(.34,1.56,.64,1)`;
      cableLine.style.transform = 'skewX(0deg)';
    }, 160);
  }
}
function setCableLength(l, durationMs){
  cableLength = l;
  const dur = durationMs || 380;
  const ease = durationMs ? 'cubic-bezier(.32,1.15,.5,1)' : 'ease';
  cableWrap.style.transition = `height ${dur}ms ${ease}`;
  clawHead.style.transition = `top ${dur}ms ${ease}`;
  cableWrap.style.height = l + '%';
  clawHead.style.top = `calc(${l}% - 6px)`;

  // Floor contact shadow: grows and darkens as the claw nears the pile,
  // giving a grounded sense of weight even though nothing has landed yet.
  const proximity = Math.max(0, Math.min(1, (l - CLAW_TOP_Y) / (78 - CLAW_TOP_Y)));
  contactShadow.style.transition = `opacity ${dur}ms ease, transform ${dur}ms ${ease}`;
  contactShadow.style.opacity = (proximity * 0.85).toFixed(2);
  contactShadow.style.transform = `translate(-50%,-50%) scale(${(0.3 + proximity * 1.1).toFixed(2)})`;
}
function setClawOpen(open){
  clawOpen = open;
  [fingerL,fingerC,fingerR].forEach(f=>{
    f.classList.toggle('open', open);
    f.classList.toggle('closed', !open);
  });
}
function setHeldPlushie(speciesId){
  heldSpeciesId = speciesId;
  heldSlot.innerHTML = speciesId ? plushieSVG(speciesId,46) : '';
}
function setMachineState(s){
  machineState = s;
  clawRig.classList.toggle('claw-vibrate', s===STATES.MOVING || s===STATES.DROPPING);
  if(s===STATES.FAIL){
    clawRig.classList.add('claw-shake');
    setTimeout(()=>clawRig.classList.remove('claw-shake'), 700);
  }
  updateLockUI();
}
function updateLockUI(){
  const locked = LOCKED.has(machineState);
  $('pp-joystickWrap').classList.toggle('is-disabled', locked);
  $('pp-playBtn').classList.toggle('is-disabled', locked);
  $('pp-playBtn').disabled = locked;
  $('pp-betMinus').disabled = locked;
  $('pp-betPlus').disabled = locked;
}

let coinDisplayed = balance;
function animateCoins(target){
  const start = coinDisplayed, duration=500, startTime=performance.now();
  function tick(now){
    const t = Math.min(1, (now-startTime)/duration);
    const eased = 1-Math.pow(1-t,2);
    coinDisplayed = Math.round(start + (target-start)*eased);
    $('pp-coinValue').textContent = coinDisplayed.toLocaleString();
    if(t<1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
function bumpCoinIcon(){
  const icon = $('pp-coinIcon');
  icon.classList.remove('bump');
  void icon.offsetWidth; // restart animation
  icon.classList.add('bump');
}
function addCoins(amount){
  balance += amount;
  if(hasExternalBalance) onBalanceDeltaRef.current(amount);
  else localStorage.setItem('winner69_plushieParadise_balance', String(balance));
  animateCoins(balance);
  showFloat(`+${amount}`, '#4fe0ff');
  sound.coin();
  bumpCoinIcon();
  burstParticles(amount>=400?'jackpot':'win', 12, 92);
}
function spendCoins(amount){
  balance -= amount;
  if(hasExternalBalance) onBalanceDeltaRef.current(-amount);
  else localStorage.setItem('winner69_plushieParadise_balance', String(balance));
  animateCoins(balance);
  showFloat(`-${amount}`, '#ff8ad0');
  sound.coinInsert();
  bumpCoinIcon();
}
function showFloat(text, color){
  const slot = $('pp-coinFloatSlot');
  const span = document.createElement('span');
  span.className = 'coin-float';
  span.style.color = color;
  span.textContent = text;
  slot.innerHTML = '';
  slot.appendChild(span);
  setTimeout(()=>{ if(slot.contains(span)) slot.removeChild(span); }, 1000);
}
function showToast(){
  const slot = $('pp-toastSlot');
  slot.innerHTML = '<div class="toast toast-warn">NOT ENOUGH COINS</div>';
  setTimeout(()=>{ slot.innerHTML=''; }, 1400);
}
function setBetDisplay(){
  $('pp-betValue').textContent = bet;
  localStorage.setItem('winner69_plushieParadise_bet', String(bet));
  renderPrizeBoard();
}
function setStreakDisplay(){
  $('pp-streakVal').textContent = streak;
}

function showResult(result){
  const el = $('pp-resultOverlay');
  if(!result){ el.innerHTML=''; return; }
  if(result.success){
    el.innerHTML = `<div class="result-card">
      ${plushieSVG(result.species.id,64)}
      <div class="result-title">YOU GOT IT!</div>
      <div class="result-reward">+${result.reward} COINS</div>
    </div>`;
  } else {
    el.innerHTML = `<div class="result-card fail">
      <div class="result-title fail-title">SO CLOSE!</div>
      <div class="result-sub">Try again</div>
    </div>`;
  }
}
function showBonus(amount){
  const el = $('pp-bonusOverlay');
  if(amount==null){ el.innerHTML=''; return; }
  el.innerHTML = `<div class="bonus-popup"><span class="bonus-popup-star">★</span> BONUS COIN <strong>+${amount}</strong></div>`;
}
function showJackpot(active){
  $('pp-jackpotOverlay').style.display = active ? 'flex' : 'none';
}
function triggerScreenFlash(){
  const el = $('pp-screenFlash');
  el.classList.remove('flash');
  void el.offsetWidth; // restart animation
  el.classList.add('flash');
}

/* ===================== GAME SEQUENCE ===================== */
async function runGrabSequence(targetX){
  setMachineState(STATES.MOVING);
  setClawX(targetX, TIMINGS.moveToTarget);
  await sleep(TIMINGS.moveToTarget);

  setMachineState(STATES.DROPPING);
  sound.motor();
  setCableLength(78, TIMINGS.descend);
  await sleep(TIMINGS.descend);
  sound.thud();

  await sleep(TIMINGS.grabPause);
  setMachineState(STATES.OPENING);
  setClawOpen(true);
  sound.clawOpen();
  await sleep(TIMINGS.open);

  const plushie = findClosestPlushie(pile, targetX);
  const species = plushie ? speciesById(plushie.speciesId) : null;

  setMachineState(STATES.GRABBING);
  setClawOpen(false);
  sound.clawClose();
  await sleep(TIMINGS.close);

  // Win/lose (whether the claw actually holds on) is now decided directly
  // by winRateProp (the admin win rate) instead of the old physics-style
  // grabPower-vs-rarity formula - see DiceGame in the main app for the
  // same pattern. Falls back to a 50% catch rate when played standalone
  // with no winRate prop supplied.
  const catchChance = typeof winRateProp === 'number' ? winRateProp : 50;
  // With a backend: the server takes the bet and decides the grab (and any bonus/jackpot).
  let serverGrab = null;
  if (serverRef.current) {
    try { serverGrab = await serverRef.current.call('/api/games/play/plushieparadise', { bet, speciesId: species ? species.id : null }); }
    catch (e) { serverGrab = { success: false, reward: 0, failed: true }; }
    if (serverGrab.failed) { balance += bet; animateCoins(balance); } // nothing was charged
  }
  const success = serverGrab ? !!serverGrab.success : species ? (Math.random() * 100 < catchChance) : false;
  sound.grab();

  if(success && plushie){
    await sleep(TIMINGS.liftPause);
    setMachineState(STATES.LIFTING);
    setHeldPlushie(plushie.speciesId);
    setCableLength(9, TIMINGS.lift);
    await sleep(TIMINGS.lift);

    setMachineState(STATES.RETURNING);
    setClawX(92, TIMINGS.returnMove);
    await sleep(TIMINGS.returnMove);

    setMachineState(STATES.RELEASING);
    await sleep(TIMINGS.releasePause);
    setClawOpen(true);
    sound.clawOpen();
    await sleep(TIMINGS.release);
    triggerScreenFlash();

    pile = pile.filter(p=>p.uid!==plushie.uid);
    if(pile.length < 14) pile = pile.concat(generatePile(10));
    renderPile();
    setHeldPlushie(null);

    // Rewards are defined per species at a reference bet of 10, then scaled
    // proportionally to whatever the player actually wagered — so a 100-credit
    // bet pays out 10x what a 10-credit bet does for the same catch, instead
    // of a flat species value that ignored the bet entirely.
    const betUnit = bet / 10;
    let reward = Math.round(species.reward * betUnit);
    const isJackpot = serverGrab ? !!serverGrab.isJackpot : Math.random() < 0.04;
    const isBonus = serverGrab ? !!serverGrab.isBonus : !isJackpot && Math.random() < 0.12;

    if(serverGrab){
      reward = serverGrab.reward;
      if(isJackpot){ showJackpot(true); sound.jackpot(); await sleep(2200); showJackpot(false); }
      else if(isBonus){ showBonus(Math.round(bet * 5)); sound.bonus(); await sleep(1400); showBonus(null); }
    } else if(isJackpot){
      reward = Math.round(species.reward * betUnit * 5);
      showJackpot(true);
      sound.jackpot();
      await sleep(2200);
      showJackpot(false);
    } else if(isBonus){
      reward = Math.round(species.reward * betUnit + bet * 5);
      showBonus(Math.round(bet * 5));
      sound.bonus();
      await sleep(1400);
      showBonus(null);
    }

    addCoins(reward);
    sound.win();
    burstParticles('win', 90, 20);
    streak++; setStreakDisplay();
    showResult({success:true, species, reward});
    setMachineState(STATES.WIN);
    if(isJackpot && onBigWinRef.current) onBigWinRef.current(reward/Math.max(1,bet), 'jackpot');
    if(onRoundRef.current) onRoundRef.current(bet, reward);
    await sleep(1500);
  } else {
    await sleep(TIMINGS.liftPause);
    setMachineState(STATES.LIFTING);
    if(plushie) setHeldPlushie(plushie.speciesId);
    setCableLength(55, TIMINGS.lift*0.5);
    await sleep(TIMINGS.lift*0.5);

    setMachineState(STATES.FAIL);
    sound.fail();
    await sleep(TIMINGS.failShake);
    setHeldPlushie(null);
    streak = 0; setStreakDisplay();
    showResult({success:false});
    if(onRoundRef.current) onRoundRef.current(bet, 0);
    await sleep(600);
  }

  setClawOpen(false);
  setCableLength(9, TIMINGS.returnMove*0.6);
  setClawX(50, TIMINGS.returnMove*0.6);
  setMachineState(STATES.RETURNING);
  await sleep(TIMINGS.returnMove*0.6);
  setMachineState(STATES.IDLE);
  showResult(null);
}

async function handlePlay(){
  if(LOCKED.has(machineState)) return;
  if(balance < bet){
    showToast();
    sound.fail();
    return;
  }
  sound.button();
  spendCoins(bet);
  const targetX = clawX;
  await runGrabSequence(targetX);
}

/* ===================== JOYSTICK / MOVEMENT LOOP ===================== */
const CLAW_MAX_SPEED = 1.1;
let currentSpeed = 0;
function movementLoop(){
  if(machineState === STATES.IDLE){
    const targetSpeed = direction * CLAW_MAX_SPEED;
    // Ease toward the target speed instead of snapping — gives the claw
    // real acceleration when starting and gentle deceleration when released.
    currentSpeed += (targetSpeed - currentSpeed) * (direction !== 0 ? 0.18 : 0.12);
    if(Math.abs(currentSpeed) > 0.01){
      clawX = Math.max(CLAW_MIN_X, Math.min(CLAW_MAX_X, clawX + currentSpeed));
      setClawX(clawX);
    }
    // The cable is a flexible line, not a rigid rod — it lags and leans
    // opposite the direction of travel, like it's dragging real weight.
    cableLine.style.transform = `skewX(${(-currentSpeed*5).toFixed(2)}deg)`;
  }
  if(!ppStopped) requestAnimationFrame(movementLoop);
}
requestAnimationFrame(movementLoop);

const joystickBase = $('pp-joystickBase'), joystickStick = $('pp-joystickStick');
let dragging = false;
function setStickVisual(tilt){
  joystickStick.style.transform = `translate(calc(-50% + ${tilt*20}px), -95%) rotate(${tilt*22}deg)`;
}
function setDirection(dir){
  direction = dir;
  joystickStick.classList.toggle('spring-back', dir === 0);
  setStickVisual(dir);
}
function pointerMove(clientX){
  if(!dragging) return;
  const rect = joystickBase.getBoundingClientRect();
  const center = rect.left + rect.width/2;
  const dx = clientX - center;
  const max = rect.width/2;
  const normalized = Math.max(-1, Math.min(1, dx/max));
  setDirection(Math.abs(normalized) < 0.18 ? 0 : normalized);
}
joystickBase.addEventListener('mousedown', e=>{ if(LOCKED.has(machineState))return; dragging=true; joystickBase.classList.add('is-active'); sound.joystick(); pointerMove(e.clientX); });
joystickBase.addEventListener('touchstart', e=>{ if(LOCKED.has(machineState))return; dragging=true; joystickBase.classList.add('is-active'); sound.joystick(); pointerMove(e.touches[0].clientX); }, {passive:true});
function onWindowMouseMove(e){ pointerMove(e.clientX); }
function onWindowTouchMove(e){ pointerMove(e.touches[0].clientX); }
function onWindowMouseUp(){ if(dragging){ dragging=false; joystickBase.classList.remove('is-active'); setDirection(0); } }
function onWindowTouchEnd(){ if(dragging){ dragging=false; joystickBase.classList.remove('is-active'); setDirection(0); } }
window.addEventListener('mousemove', onWindowMouseMove);
window.addEventListener('touchmove', onWindowTouchMove, {passive:true});
window.addEventListener('mouseup', onWindowMouseUp);
window.addEventListener('touchend', onWindowTouchEnd);

function onWindowKeyDown(e){
  if(LOCKED.has(machineState)) return;
  if(e.key==='ArrowLeft'||e.key==='a'||e.key==='A') setDirection(-1);
  if(e.key==='ArrowRight'||e.key==='d'||e.key==='D') setDirection(1);
}
function onWindowKeyUp(e){
  if(['ArrowLeft','ArrowRight','a','A','d','D'].includes(e.key)) setDirection(0);
}
window.addEventListener('keydown', onWindowKeyDown);
window.addEventListener('keyup', onWindowKeyUp);

$('pp-btnLeft').addEventListener('mousedown', ()=>setDirection(-1));
$('pp-btnLeft').addEventListener('mouseup', ()=>setDirection(0));
$('pp-btnLeft').addEventListener('touchstart', e=>{e.preventDefault();setDirection(-1);}, {passive:false});
$('pp-btnLeft').addEventListener('touchend', ()=>setDirection(0));
$('pp-btnRight').addEventListener('mousedown', ()=>setDirection(1));
$('pp-btnRight').addEventListener('mouseup', ()=>setDirection(0));
$('pp-btnRight').addEventListener('touchstart', e=>{e.preventDefault();setDirection(1);}, {passive:false});
$('pp-btnRight').addEventListener('touchend', ()=>setDirection(0));

/* ===================== BUTTONS ===================== */
$('pp-playBtn').addEventListener('click', ()=>{
  const btn = $('pp-playBtn');
  btn.classList.add('is-pressed');
  setTimeout(()=>btn.classList.remove('is-pressed'), 200);
  const ripple = document.createElement('span');
  ripple.className = 'play-ripple';
  btn.appendChild(ripple);
  setTimeout(()=>ripple.remove(), 500);
  handlePlay();
});
$('pp-betMinus').addEventListener('click', ()=>{
  if(LOCKED.has(machineState)) return;
  sound.button();
  bet = Math.max(1, bet-5);
  setBetDisplay();
});
$('pp-betPlus').addEventListener('click', ()=>{
  if(LOCKED.has(machineState)) return;
  sound.button();
  bet = Math.min(100, bet+5);
  setBetDisplay();
});
$('pp-muteBtn').addEventListener('click', ()=>{
  muted = !muted;
  sound.setMuted(muted);
  localStorage.setItem('winner69_plushieParadise_muted', String(muted));
  $('pp-muteBtn').textContent = muted ? '🔇' : '🔊';
  $('pp-muteBtn').classList.toggle('is-muted', muted);
});

/* ===================== MOBILE DRAWERS ===================== */
const bonusPanelEl = root.querySelector('.bonus-panel');
const prizePanelEl = root.querySelector('.prize-board');
const drawerBackdrop = $('pp-drawerBackdrop');
function closeDrawers(){
  bonusPanelEl.classList.remove('open');
  prizePanelEl.classList.remove('open');
  drawerBackdrop.classList.remove('open');
}
function openDrawer(el){
  closeDrawers();
  el.classList.add('open');
  drawerBackdrop.classList.add('open');
}
$('pp-fabBonus').addEventListener('click', ()=>{ sound.button(); openDrawer(bonusPanelEl); });
$('pp-fabPrize').addEventListener('click', ()=>{ sound.button(); openDrawer(prizePanelEl); });
drawerBackdrop.addEventListener('click', closeDrawers);

function renderAmbientDust(){
  const el = $('pp-ambientDust');
  const colors = ['#fff','#fff3c0','#8fd8ff','#ffb3e0'];
  el.innerHTML = Array.from({length:14}).map(()=>{
    const size = 2 + Math.random()*3;
    const left = Math.random()*100;
    const duration = 7 + Math.random()*8;
    const delay = -Math.random()*duration;
    const color = colors[Math.floor(Math.random()*colors.length)];
    return `<span class="dust-mote" style="left:${left}%;width:${size}px;height:${size}px;background:radial-gradient(circle,${color},rgba(255,255,255,0) 70%);box-shadow:0 0 ${size*1.5}px ${color};animation-duration:${duration}s;animation-delay:${delay}s"></span>`;
  }).join('');
}

/* ===================== INIT ===================== */
renderBulbs();
renderPile();
renderPrizeBoard();
renderAmbientDust();
setClawX(50);
setCableLength(CLAW_TOP_Y);
$('pp-coinValue').textContent = balance.toLocaleString();
coinDisplayed = balance;
setBetDisplay();
setStreakDisplay();
$('pp-muteBtn').textContent = muted ? '🔇' : '🔊';
$('pp-muteBtn').classList.toggle('is-muted', muted);
updateLockUI();

// Cleanup on unmount: stop rAF loops, remove window-level listeners, close audio.
return () => {
  ppStopped = true;
  window.removeEventListener('resize', resizeCanvas);
  window.removeEventListener('mousemove', onWindowMouseMove);
  window.removeEventListener('touchmove', onWindowTouchMove);
  window.removeEventListener('mouseup', onWindowMouseUp);
  window.removeEventListener('touchend', onWindowTouchEnd);
  window.removeEventListener('keydown', onWindowKeyDown);
  window.removeEventListener('keyup', onWindowKeyUp);
  sound.destroy();
};

  }, []);

  return (
    <div className="pp-root" ref={rootRef}>
      <style>{`
.pp-root{
  --bg-deep:#140708; --purple:#9e2a2e; --pink:#ff593f; --pink-soft:#ff9a8a;
  --cyan:#fbce53; --gold:#ffd24c; --gold-soft:#fff3c0;
  --panel-bg: linear-gradient(180deg, #301013 0%, #220a0c 100%);
  --font-display:'Baloo 2','Chakra Petch',sans-serif; --font-ui:'Chakra Petch',sans-serif;
}
.pp-root *{box-sizing:border-box}
.pp-root button{font-family:inherit;cursor:pointer;border:none}
.pp-root .app-bg{position:relative;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:18px 10px 34px;overflow:hidden}
.pp-root .arcade-hall-bg{position:absolute;inset:0;z-index:0;filter:blur(3px);opacity:.55;pointer-events:none}
.pp-root .hall-blur-machine{position:absolute;width:140px;height:260px;border-radius:18px;background:linear-gradient(180deg,#50161b,#2b0b0d);box-shadow:0 0 40px rgba(255,80,86,.35);filter:blur(2px)}
.pp-root .m1{left:2%;bottom:0;background:linear-gradient(180deg,#5c1e1c,#2c0d10);box-shadow:0 0 40px rgba(251,206,83,.3)}
.pp-root .m2{right:3%;bottom:0;height:300px}
.pp-root .m3{right:22%;bottom:0;height:200px;background:linear-gradient(180deg,#3a1c1e,#1a0d0e);box-shadow:0 0 40px rgba(255,89,63,.3)}
.pp-root .hall-sign{position:absolute;font-family:var(--font-display);font-weight:800;letter-spacing:2px}
.pp-root .fg-bokeh{position:absolute;border-radius:50%;pointer-events:none;z-index:2;filter:blur(6px);opacity:.35}
.pp-root .fb1{width:70px;height:70px;left:1%;top:70%;background:radial-gradient(circle,var(--gold),transparent 70%)}
.pp-root .fb2{width:46px;height:46px;right:3%;top:12%;background:radial-gradient(circle,var(--cyan),transparent 70%)}
.pp-root .fb3{width:56px;height:56px;right:6%;bottom:6%;background:radial-gradient(circle,var(--pink),transparent 70%)}
.pp-root .sign-a{top:8%;left:3%;font-size:22px;color:var(--pink);text-shadow:0 0 12px var(--pink);transform:rotate(-6deg)}
.pp-root .sign-b{top:14%;right:4%;font-size:16px;color:var(--gold-soft);text-shadow:0 0 12px var(--gold)}
.pp-root .arcade-cabinet{position:relative;z-index:1;width:min(1120px,96vw);border-radius:28px;padding:14px 16px 20px;
  background:linear-gradient(160deg,#48171b 0%,#260a0c 55%,#180607 100%);border:3px solid rgba(255,255,255,.06);
  box-shadow:0 0 0 2px rgba(255,140,144,.15) inset,0 20px 60px rgba(0,0,0,.6),0 0 80px rgba(220,50,56,.25)}
.pp-root .arcade-cabinet::before{content:'';position:absolute;inset:3px;border-radius:24px;pointer-events:none;z-index:4;
  background:linear-gradient(135deg, rgba(255,255,255,.12) 0%, rgba(255,255,255,0) 16%, rgba(255,255,255,0) 80%, rgba(0,0,0,.4) 100%)}
.pp-root .arcade-cabinet::after{content:'';position:absolute;inset:0;border-radius:28px;pointer-events:none;z-index:4;
  box-shadow:inset 0 0 0 1px rgba(255,255,255,.09), inset 0 2px 5px rgba(255,255,255,.14), inset 0 -8px 18px rgba(0,0,0,.55);
  background-image:radial-gradient(circle at 12% 22%, rgba(255,255,255,.035) 0, transparent 2px),
    radial-gradient(circle at 78% 64%, rgba(255,255,255,.03) 0, transparent 2px),
    radial-gradient(circle at 40% 88%, rgba(0,0,0,.12) 0, transparent 3px)}
.pp-root .cabinet-body{position:relative;z-index:5;display:flex;flex-direction:column;gap:12px}
.pp-root .cabinet-base{display:flex;justify-content:center;gap:14px;padding-top:10px}
.pp-root .base-led{width:8px;height:8px;border-radius:50%;background:var(--cyan);box-shadow:0 0 8px var(--cyan),0 0 16px var(--cyan);animation:ledPulse 1.6s ease-in-out infinite}
.pp-root .base-led:nth-child(2){background:var(--pink);box-shadow:0 0 8px var(--pink),0 0 16px var(--pink);animation-delay:.3s}
.pp-root .base-led:nth-child(3){background:var(--gold);box-shadow:0 0 8px var(--gold),0 0 16px var(--gold);animation-delay:.6s}
@keyframes ledPulse{0%,100%{opacity:.5;transform:scale(.85)}50%{opacity:1;transform:scale(1.15)}}
.pp-root .marquee{position:relative;border-radius:20px;padding:14px 20px 16px;background:linear-gradient(180deg,#4f181a,#2e0c0f);border:2px solid rgba(255,255,255,.08);text-align:center;overflow:hidden;box-shadow:inset 0 0 30px rgba(255,89,63,.12)}
.pp-root .marquee-bulbs{position:absolute;inset:6px;display:flex;justify-content:space-between;padding:0 4px;pointer-events:none}
.pp-root .bulb{width:6px;height:6px;border-radius:50%;background:var(--gold-soft);box-shadow:0 0 6px var(--gold),0 0 12px var(--gold);align-self:flex-start;animation:bulbFlicker 1.8s ease-in-out infinite}
.pp-root .bulb:nth-child(even){align-self:flex-end}
@keyframes bulbFlicker{0%,100%{opacity:.4}50%{opacity:1}}
.pp-root .marquee-title{margin:0;font-family:var(--font-display);font-weight:800;font-size:clamp(26px,5.4vw,46px);letter-spacing:1px;color:#fff;text-shadow:0 0 6px var(--cyan),0 0 18px var(--cyan),0 0 36px rgba(251,206,83,.6)}
.pp-root .marquee-title span{color:var(--pink-soft);text-shadow:0 0 6px var(--pink),0 0 18px var(--pink),0 0 36px rgba(255,89,63,.6)}
.pp-root .marquee-subtitle{margin:2px 0 0;font-weight:600;letter-spacing:4px;font-size:clamp(11px,1.6vw,15px);color:var(--gold-soft);text-shadow:0 0 10px var(--gold)}
.pp-root .marquee-shine{position:absolute;top:0;left:-60%;width:40%;height:100%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.12),transparent);animation:shineSweep 6s ease-in-out infinite;pointer-events:none}
@keyframes shineSweep{0%{left:-60%}50%{left:130%}100%{left:130%}}
.pp-root .mute-btn{position:absolute;top:10px;right:12px;width:30px;height:30px;border-radius:50%;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.06);color:var(--cyan);display:flex;align-items:center;justify-content:center}
.pp-root .mute-btn.is-muted{color:#7a7590}
.pp-root .cabinet-main{display:grid;grid-template-columns:150px minmax(0,1fr) 150px;gap:10px;align-items:stretch}
.pp-root .machine-column{position:relative;min-width:0}
.pp-root .side-panel{position:relative;background:var(--panel-bg);border:1px solid rgba(255,150,153,.22);border-radius:16px;padding:10px 10px 12px;
  box-shadow:inset 0 0 16px rgba(220,60,65,.18),inset 0 1px 0 rgba(255,255,255,.08),0 0 18px rgba(220,60,65,.15), 0 3px 6px rgba(0,0,0,.35);
  display:flex;flex-direction:column;gap:8px;animation:panelGlow 3.6s ease-in-out infinite}
@keyframes panelGlow{
  0%,100%{box-shadow:inset 0 0 16px rgba(220,60,65,.18),inset 0 1px 0 rgba(255,255,255,.08),0 0 18px rgba(220,60,65,.15), 0 3px 6px rgba(0,0,0,.35)}
  50%{box-shadow:inset 0 0 22px rgba(220,60,65,.3),inset 0 1px 0 rgba(255,255,255,.12),0 0 28px rgba(220,60,65,.26), 0 3px 6px rgba(0,0,0,.35)}
}
.pp-root .side-panel::before{content:'';position:absolute;top:6px;left:6px;width:4px;height:4px;border-radius:50%;background:rgba(255,255,255,.2);box-shadow:0 0 3px rgba(255,255,255,.3)}
.pp-root .side-panel::after{content:'';position:absolute;top:6px;right:6px;width:4px;height:4px;border-radius:50%;background:rgba(255,255,255,.2);box-shadow:0 0 3px rgba(255,255,255,.3)}
.pp-root .panel-title{margin:0;font-family:var(--font-display);font-size:13px;letter-spacing:1px;text-align:center;color:var(--pink-soft);text-shadow:0 0 8px var(--pink)}
.pp-root .bonus-star{display:flex;align-items:center;gap:8px;justify-content:center;background:rgba(255,210,76,.08);border:1px solid rgba(255,210,76,.35);border-radius:12px;padding:8px}
.pp-root .star-icon{color:var(--gold);font-size:20px;text-shadow:0 0 10px var(--gold)}
.pp-root .bonus-amount{font-family:var(--font-display);font-weight:800;font-size:18px;color:var(--gold-soft);line-height:1}
.pp-root .bonus-label{font-size:9px;letter-spacing:2px;color:var(--gold)}
.pp-root .jackpot-callout{display:flex;flex-direction:column;align-items:center;gap:2px;font-size:9px;letter-spacing:1px;text-align:center;color:var(--cyan);background:rgba(251,206,83,.07);border:1px solid rgba(251,206,83,.3);border-radius:12px;padding:8px}
.pp-root .jackpot-callout strong{font-family:var(--font-display);font-size:16px;color:var(--gold-soft)}
.pp-root .streak-line{text-align:center;font-size:10px;color:#e0a8aa}
.pp-root .streak-line strong{color:var(--gold-soft)}
.pp-root .prize-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:4px}
.pp-root .prize-row{display:flex;align-items:center;gap:6px;background:rgba(255,255,255,.03);border:1px solid rgba(255,150,153,.14);border-radius:10px;padding:3px 6px}
.pp-root .prize-icon{flex:0 0 auto;display:flex}
.pp-root .prize-name{flex:1;font-size:10px;color:#ffd9da}
.pp-root .prize-value{font-family:var(--font-display);font-weight:700;font-size:12px;color:var(--gold-soft)}
.pp-root .panel-footer-badge{margin-top:auto;text-align:center;font-family:var(--font-display);font-size:11px;letter-spacing:1px;color:var(--gold-soft);background:rgba(255,210,76,.08);border:1px solid rgba(255,210,76,.3);border-radius:10px;padding:6px}
.pp-root .panel-footer-badge small{font-family:var(--font-ui);font-weight:400;color:#e6b8ba;letter-spacing:0}
.pp-root .claw-machine{height:clamp(340px,52vh,520px)}
.pp-root .machine-frame{position:relative;height:100%;border-radius:20px;padding:10px;background:linear-gradient(160deg,#602224,#360f12 60%,#22080a);border:2px solid rgba(255,255,255,.07);box-shadow:inset 0 0 0 1px rgba(255,255,255,.05),0 0 30px rgba(220,60,65,.25)}
.pp-root .machine-glass{position:relative;height:100%;border-radius:14px;overflow:hidden;background:#1e0a0c;border:3px solid rgba(252,226,153,.2);
  box-shadow:inset 0 0 40px rgba(0,0,0,.65),inset 0 0 70px rgba(160,40,44,.4),inset 0 12px 24px rgba(0,0,0,.5),inset 0 -3px 10px rgba(251,206,83,.12), 0 0 0 1px rgba(255,255,255,.05)}
.pp-root .glass-interior-bg{position:absolute;inset:0;background:radial-gradient(circle at 20% 10%,rgba(255,89,63,.18),transparent 45%),radial-gradient(circle at 85% 15%,rgba(251,206,83,.16),transparent 40%),linear-gradient(180deg,#401014 0%,#280a0c 55%,#180607 100%)}
.pp-root .glass-ceiling-light{position:absolute;top:-8%;left:8%;right:8%;height:42%;background:radial-gradient(ellipse at 50% 0%, rgba(255,255,255,.16), transparent 72%);pointer-events:none;z-index:1}
.pp-root .glass-bokeh{position:absolute;inset:0;background-image:radial-gradient(circle,rgba(255,210,76,.5) 0%,transparent 60%),radial-gradient(circle,rgba(251,206,83,.4) 0%,transparent 60%),radial-gradient(circle,rgba(255,89,63,.4) 0%,transparent 60%);background-size:60px 60px,90px 90px,70px 70px;background-position:10% 8%,80% 4%,45% 2%;opacity:.5;filter:blur(2px)}
.pp-root .ambient-dust{position:absolute;inset:0;pointer-events:none;z-index:2;overflow:hidden}
.pp-root .dust-mote{position:absolute;bottom:0;border-radius:50%;background:radial-gradient(circle,#fff,rgba(255,255,255,0) 70%);animation:dustFloat linear infinite}
@keyframes dustFloat{0%{transform:translateY(0) scale(1);opacity:0}8%{opacity:.7}88%{opacity:.35}100%{transform:translateY(-260px) scale(.5);opacity:0}}
.pp-root .plushie-pile{position:absolute;inset:0}
.pp-root .pile-item{position:absolute;pointer-events:none;transition:filter .3s ease}
.pp-root .pile-item-inner{animation:plushBreathe 4.2s ease-in-out infinite;transform-origin:50% 70%}
@keyframes plushBreathe{0%,100%{transform:scale(1)}50%{transform:scale(1.015)}}
.pp-root .claw-rig{position:absolute;top:0;bottom:0;width:2px;transform:translateX(-50%);transition:left .05s linear;will-change:left}
.pp-root .claw-rig.claw-vibrate{animation:clawVibrate .12s linear infinite}
.pp-root .claw-rig.claw-shake{animation:clawShake .35s ease-in-out 0s 2}
@keyframes clawVibrate{0%,100%{margin-left:0}50%{margin-left:.6px}}
@keyframes clawShake{0%,100%{transform:translateX(-50%) rotate(0)}25%{transform:translateX(-50%) rotate(-4deg)}75%{transform:translateX(-50%) rotate(4deg)}}
.pp-root .claw-motor{position:absolute;top:0;left:50%;transform:translateX(-50%);width:48px;height:22px;border-radius:6px 6px 11px 11px;
  background:linear-gradient(180deg,#fbf8f2 0%,#e3ded0 22%,#8b97ad 55%,#5a6478 100%);
  box-shadow:0 2px 8px rgba(0,0,0,.55),0 0 12px rgba(251,206,83,.45), inset 0 1px 0 rgba(255,255,255,.6), inset 0 -3px 4px rgba(0,0,0,.35);z-index:5}
.pp-root .claw-motor::after{content:'';position:absolute;top:2px;left:4px;right:4px;height:3px;border-radius:2px;background:linear-gradient(90deg,rgba(255,255,255,.7),rgba(255,255,255,0) 70%)}
.pp-root .motor-bolt{position:absolute;top:7px;left:7px;width:5px;height:5px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#ded9cb,#2b2f3a 75%);box-shadow:0 0 2px rgba(0,0,0,.6)}
.pp-root .motor-bolt.right{left:auto;right:7px}
.pp-root .cable-wrap{position:absolute;top:20px;left:50%;width:3px;transform:translateX(-50%);z-index:4;will-change:height}
.pp-root .cable-line{width:100%;height:100%;background:linear-gradient(90deg,#9aa4b8 0%,#faf7f0 45%,#dad4c4 60%,#7f8aa3 100%);box-shadow:0 0 5px rgba(251,206,83,.55);border-radius:2px;transform-origin:top center}
.pp-root .cable-sway{animation:cableSway .9s ease-in-out infinite}
@keyframes cableSway{0%,100%{transform:translateX(-50%) rotate(0)}50%{transform:translateX(-50%) rotate(1.2deg)}}
.pp-root .claw-head{position:absolute;left:50%;transform:translateX(-50%);width:40px;height:34px;z-index:6;will-change:top}
.pp-root .claw-head::before{content:'';position:absolute;top:6px;left:50%;transform:translateX(-50%);width:60px;height:60px;
  background:radial-gradient(circle, rgba(255,210,76,.22), rgba(251,206,83,.1) 45%, transparent 72%);
  pointer-events:none;z-index:-1}
.pp-root .claw-contact-shadow{position:absolute;top:87%;left:50%;width:36px;height:11px;border-radius:50%;
  transform:translate(-50%,-50%) scale(.3);background:radial-gradient(ellipse,rgba(0,0,0,.6),transparent 72%);
  opacity:0;pointer-events:none;z-index:3;transition:opacity .3s ease, transform .3s ease}
.pp-root .claw-knuckle{position:absolute;top:-4px;left:50%;transform:translateX(-50%);width:15px;height:15px;border-radius:50%;
  background:radial-gradient(circle at 32% 28%,#fff,#dcd7c8 45%,#7f8aa3 80%);box-shadow:0 0 9px rgba(255,89,63,.65), inset 0 -2px 3px rgba(0,0,0,.3)}
.pp-root .claw-finger{position:absolute;top:6px;width:6px;height:27px;border-radius:3px;
  background:linear-gradient(90deg,#8f9aae 0%,#fbf9f5 40%,#e5e0d3 55%,#828da3 100%);
  box-shadow:0 0 6px rgba(255,210,76,.5), inset 0 0 2px rgba(255,255,255,.5);
  transform-origin:top center;transition:transform .35s cubic-bezier(.34,1.56,.64,1)}
.pp-root .claw-finger::before{content:'';position:absolute;top:-3px;left:50%;transform:translateX(-50%);width:8px;height:8px;border-radius:50%;
  background:radial-gradient(circle at 35% 30%,#fff,#9aa4b8 70%);box-shadow:0 0 4px rgba(251,206,83,.55), inset 0 -1px 2px rgba(0,0,0,.25)}
.pp-root .claw-finger::after{content:'';position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:5px;height:5px;border-radius:1px 1px 3px 3px;
  background:linear-gradient(180deg,#dcd7c8,#5a6478)}
.pp-root .held-plushie-slot{position:absolute;top:10px;left:50%;transform:translateX(-50%);z-index:-1}
.pp-root .claw-finger.left{left:4px}
.pp-root .claw-finger.center{left:17px}
.pp-root .claw-finger.right{right:4px}
.pp-root .claw-finger.left.open{transform:rotate(-35deg) translateX(-3px)}
.pp-root .claw-finger.center.open{transform:translateY(-2px) scaleY(.9)}
.pp-root .claw-finger.right.open{transform:rotate(35deg) translateX(3px)}
.pp-root .claw-finger.left.closed{transform:rotate(6deg)}
.pp-root .claw-finger.center.closed{transform:rotate(0)}
.pp-root .claw-finger.right.closed{transform:rotate(-6deg)}
.pp-root .prize-chute{position:absolute;right:4px;bottom:4px;width:46px;height:30px;border-radius:8px 8px 4px 4px;background:linear-gradient(180deg,#381215,#140607);border:1px solid rgba(255,210,76,.5);box-shadow:0 0 14px rgba(255,210,76,.35);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:3}
.pp-root .chute-mouth{width:30px;height:6px;border-radius:3px;background:#000;box-shadow:inset 0 0 6px rgba(0,0,0,.8)}
.pp-root .chute-label{font-size:8px;letter-spacing:1px;color:var(--gold-soft);margin-top:2px}
.pp-root .particle-canvas{position:absolute;inset:0;z-index:8;pointer-events:none;width:100%;height:100%}
.pp-root .screen-flash{position:absolute;inset:0;z-index:10;pointer-events:none;background:radial-gradient(circle, rgba(255,243,192,.9), rgba(255,210,76,.3) 55%, transparent 80%);opacity:0}
.pp-root .screen-flash.flash{animation:screenFlashPulse .5s ease-out}
@keyframes screenFlashPulse{0%{opacity:0}15%{opacity:.85}100%{opacity:0}}
.pp-root .glass-reflection{position:absolute;top:-20%;left:-30%;width:45%;height:140%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.08),transparent);transform:rotate(12deg);animation:glassSweep 9s ease-in-out infinite;pointer-events:none;z-index:9}
.pp-root .glass-static-glare{position:absolute;top:0;right:6%;width:16%;height:100%;background:linear-gradient(180deg, rgba(255,255,255,.1), rgba(255,255,255,.02) 40%, transparent 70%);transform:skewX(-8deg);pointer-events:none;z-index:9}
@keyframes glassSweep{0%{left:-30%}55%{left:120%}100%{left:120%}}
.pp-root .glass-vignette{position:absolute;inset:0;box-shadow:inset 0 0 60px 20px rgba(0,0,0,.55);pointer-events:none;z-index:9}
.pp-root .frame-bolts{position:absolute;inset:4px;pointer-events:none}
.pp-root .bolt{position:absolute;width:4px;height:4px;border-radius:50%;background:rgba(255,255,255,.25);box-shadow:0 0 3px rgba(255,255,255,.4)}
.pp-root .bolt:nth-child(1){top:4px;left:4px}
.pp-root .bolt:nth-child(2){top:4px;right:4px}
.pp-root .bolt:nth-child(3){bottom:4px;left:4px}
.pp-root .bolt:nth-child(4){bottom:4px;right:4px}
.pp-root .bolt:nth-child(5){top:4px;left:50%}
.pp-root .bolt:nth-child(6){bottom:4px;left:50%}
.pp-root .bolt:nth-child(7){top:40%;left:4px}
.pp-root .bolt:nth-child(8){top:40%;right:4px}
.pp-root .bolt:nth-child(9){top:70%;left:4px}
.pp-root .bolt:nth-child(10){top:70%;right:4px}
.pp-root .result-overlay{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:20}
.pp-root .result-card{display:flex;flex-direction:column;align-items:center;gap:4px;padding:14px 26px;border-radius:16px;background:rgba(36,10,12,.85);border:2px solid var(--gold);box-shadow:0 0 30px rgba(255,210,76,.5);animation:popIn .35s cubic-bezier(.34,1.56,.64,1)}
.pp-root .result-card.fail{border-color:var(--pink);box-shadow:0 0 30px rgba(255,89,63,.4)}
.pp-root .result-title{font-family:var(--font-display);font-weight:800;font-size:20px;color:var(--gold-soft);text-shadow:0 0 10px var(--gold)}
.pp-root .fail-title{color:var(--pink-soft);text-shadow:0 0 10px var(--pink)}
.pp-root .result-reward{font-family:var(--font-display);font-size:16px;color:#fff}
.pp-root .result-sub{font-size:12px;color:#eab8ba}
@keyframes popIn{0%{transform:scale(.7);opacity:0}100%{transform:scale(1);opacity:1}}
.pp-root .bonus-overlay, .pp-root .jackpot-overlay{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:21}
.pp-root .bonus-popup{display:flex;flex-direction:column;align-items:center;gap:2px;padding:10px 20px;border-radius:14px;background:rgba(36,10,12,.85);border:2px solid var(--gold);color:var(--gold-soft);font-family:var(--font-display);font-weight:700;font-size:13px;letter-spacing:1px;animation:bonusPop 1.4s ease forwards}
.pp-root .bonus-popup-star{font-size:18px;color:var(--gold)}
.pp-root .bonus-popup strong{font-size:18px;color:#fff}
@keyframes bonusPop{0%{transform:scale(.8);opacity:0}20%{transform:scale(1.05);opacity:1}30%{transform:scale(1)}80%{opacity:1}100%{opacity:0;transform:scale(1.02)}}
.pp-root .jackpot-overlay{flex-direction:column;background:radial-gradient(circle,rgba(255,210,76,.15),transparent 70%);animation:jackpotFlash .5s ease-in-out infinite alternate}
.pp-root .jackpot-text{font-family:var(--font-display);font-weight:800;font-size:clamp(28px,6vw,48px);color:var(--gold-soft);text-shadow:0 0 14px var(--gold),0 0 40px var(--gold);animation:jackpotShake .4s ease-in-out infinite}
.pp-root .jackpot-multiplier{font-family:var(--font-display);font-weight:800;font-size:clamp(20px,4vw,32px);color:#fff;text-shadow:0 0 10px var(--pink)}
@keyframes jackpotFlash{from{background-color:rgba(255,210,76,.02)}to{background-color:rgba(255,210,76,.12)}}
@keyframes jackpotShake{0%,100%{transform:translate(0,0)}25%{transform:translate(-2px,1px)}75%{transform:translate(2px,-1px)}}
.pp-root .control-panel{display:grid;grid-template-columns:1fr auto auto auto;align-items:center;gap:14px;background:linear-gradient(180deg,#401317,#280a0c);border:2px solid rgba(255,255,255,.06);border-radius:18px;padding:12px 18px;position:relative;box-shadow:inset 0 0 20px rgba(220,60,65,.2)}
.pp-root .coin-display{display:flex;flex-direction:column;position:relative;background:rgba(0,0,0,.3);border:1px solid rgba(255,210,76,.35);border-radius:12px;padding:6px 12px;min-width:120px}
.pp-root .coin-label{font-size:9px;letter-spacing:1.5px;color:#e0a8aa}
.pp-root .coin-icon{position:absolute;right:10px;top:8px;color:var(--gold);font-size:12px;text-shadow:0 0 6px var(--gold)}
.pp-root .coin-icon.bump{animation:coinBump .35s cubic-bezier(.34,1.56,.64,1)}
@keyframes coinBump{0%{transform:scale(1)}40%{transform:scale(1.5) rotate(-8deg)}100%{transform:scale(1)}}
.pp-root .coin-value{font-family:var(--font-display);font-weight:800;font-size:20px;color:var(--gold-soft);text-shadow:0 0 8px var(--gold)}
.pp-root .coin-float{position:absolute;right:10px;bottom:-14px;font-family:var(--font-display);font-size:12px;color:var(--cyan);animation:floatUp 1s ease forwards}
@keyframes floatUp{0%{transform:translateY(0);opacity:1}100%{transform:translateY(-16px);opacity:0}}
.pp-root .joystick-wrap{display:flex;align-items:center;gap:10px;justify-self:center}
.pp-root .joystick-wrap.is-disabled{opacity:.45;pointer-events:none}
.pp-root .joystick-base{position:relative;width:64px;height:64px;border-radius:50%;
  background:radial-gradient(circle at 32% 26%,#782f31,#381013 55%,#20080a 100%);
  border:2px solid rgba(220,100,104,.45);
  box-shadow:inset 0 5px 12px rgba(0,0,0,.65), inset 0 -3px 6px rgba(255,255,255,.06), 0 2px 4px rgba(0,0,0,.4), 0 0 16px rgba(251,206,83,.22);
  touch-action:none;cursor:grab;transition:box-shadow .18s ease, border-color .18s ease}
.pp-root .joystick-base.is-active{
  border-color:rgba(251,206,83,.75);
  box-shadow:inset 0 5px 12px rgba(0,0,0,.65), inset 0 -3px 6px rgba(255,255,255,.08), 0 2px 4px rgba(0,0,0,.4), 0 0 26px rgba(251,206,83,.55);
}
.pp-root .joystick-base::after{content:'';position:absolute;inset:2px;border-radius:50%;pointer-events:none;
  background:linear-gradient(160deg, rgba(255,255,255,.10), transparent 40%)}
.pp-root .joystick-ring{position:absolute;inset:8px;border-radius:50%;border:1px solid rgba(251,206,83,.4);box-shadow:0 0 6px rgba(251,206,83,.25) inset}
.pp-root .joystick-stick{position:absolute;top:50%;left:50%;width:6px;height:26px;
  background:linear-gradient(90deg,#7f8aa3 0%,#f8f5ee 45%,#dad4c4 60%,#6b7690 100%);
  border-radius:3px;transform-origin:bottom center;transform:translate(-50%,-95%);
  box-shadow:0 0 4px rgba(0,0,0,.4);transition:transform .05s linear}
.pp-root .joystick-stick.spring-back{transition:transform .32s cubic-bezier(.34,1.56,.64,1)}
.pp-root .joystick-ball{position:absolute;top:-10px;left:50%;transform:translateX(-50%);width:22px;height:22px;border-radius:50%;
  background:radial-gradient(circle at 32% 26%,#ffdbd6,#ff9a8a 45%,var(--pink) 80%);
  box-shadow:0 0 14px var(--pink), inset 0 -4px 7px rgba(0,0,0,.35), inset 0 2px 3px rgba(255,255,255,.55)}
.pp-root .control-buttons{display:none;gap:6px}
.pp-root .dir-btn{width:32px;height:32px;border-radius:50%;border:1px solid rgba(251,206,83,.4);background:rgba(251,206,83,.08);color:var(--cyan);font-size:12px}
.pp-root .play-btn{position:relative;width:68px;height:68px;border-radius:50%;
  background:radial-gradient(circle at 32% 26%,#ffcac2,#ff9a8a 30%,var(--pink) 62%,#8f1300 100%);
  box-shadow:0 3px 6px rgba(0,0,0,.4), 0 0 18px rgba(255,89,63,.7),inset 0 -5px 9px rgba(0,0,0,.4),inset 0 4px 7px rgba(255,255,255,.5);
  color:#fff;font-family:var(--font-display);font-weight:800;letter-spacing:1px;font-size:13px;animation:playPulse 2.2s ease-in-out infinite;justify-self:center;
  transition:transform .12s cubic-bezier(.34,1.56,.64,1)}
.pp-root .play-btn::after{content:'';position:absolute;top:8%;left:18%;width:40%;height:22%;border-radius:50%;
  background:linear-gradient(160deg, rgba(255,255,255,.65), transparent 70%);pointer-events:none}
.pp-root .play-btn:active, .pp-root .play-btn.is-pressed{transform:scale(.94)}
.pp-root .play-btn.is-disabled{opacity:.5;animation:none}
.pp-root .play-btn-ring{position:absolute;inset:-6px;border-radius:50%;border:1px solid rgba(255,89,63,.35)}
.pp-root .play-ripple{position:absolute;inset:0;border-radius:50%;background:rgba(255,255,255,.5);
  animation:playRipple .5s ease-out forwards;pointer-events:none}
@keyframes playRipple{0%{transform:scale(.4);opacity:.6}100%{transform:scale(1.6);opacity:0}}
@keyframes playPulse{0%,100%{box-shadow:0 0 14px rgba(255,89,63,.55),inset 0 -4px 8px rgba(0,0,0,.35),inset 0 4px 6px rgba(255,255,255,.4)}50%{box-shadow:0 0 26px rgba(255,89,63,.85),inset 0 -4px 8px rgba(0,0,0,.35),inset 0 4px 6px rgba(255,255,255,.4)}}
.pp-root .bet-control{display:flex;flex-direction:column;align-items:center;gap:3px;justify-self:end}
.pp-root .bet-label{font-size:9px;letter-spacing:1.5px;color:#e0a8aa}
.pp-root .bet-row{display:flex;align-items:center;gap:6px}
.pp-root .bet-btn{width:26px;height:26px;border-radius:50%;border:1px solid rgba(251,206,83,.4);background:rgba(251,206,83,.08);color:var(--cyan);font-weight:700;font-size:15px;line-height:1}
.pp-root .bet-btn:active{transform:scale(.9)}
.pp-root .bet-value{min-width:26px;text-align:center;font-family:var(--font-display);font-weight:700;font-size:15px;color:#fff}
.pp-root .toast{position:absolute;top:-14px;left:50%;transform:translateX(-50%);padding:5px 14px;border-radius:20px;font-size:11px;letter-spacing:1px;font-weight:700;animation:toastPop 1.4s ease forwards}
.pp-root .toast-warn{background:var(--pink);color:#fff;box-shadow:0 0 14px rgba(255,89,63,.7)}
@keyframes toastPop{0%{opacity:0;transform:translate(-50%,6px)}15%{opacity:1;transform:translate(-50%,-6px)}85%{opacity:1}100%{opacity:0;transform:translate(-50%,-14px)}}
@media (max-width:860px){
.pp-root .cabinet-main{grid-template-columns:1fr}
.pp-root .side-panel{flex-direction:row;flex-wrap:wrap;align-items:center}
.pp-root .bonus-panel{order:2}
.pp-root .prize-board{order:3}
.pp-root .machine-column{order:1}
.pp-root .prize-list{flex-direction:row;flex-wrap:wrap;flex:1}
.pp-root .prize-row{flex:1 1 45%}
.pp-root .panel-footer-badge{flex-basis:100%}
.pp-root .bonus-star, .pp-root .jackpot-callout{flex:1}

}
.pp-root .panel-fab{display:none;position:absolute;top:8px;width:34px;height:34px;border-radius:50%;z-index:30;align-items:center;justify-content:center;font-size:15px;background:rgba(36,10,12,.8);color:#fff;transition:transform .12s ease}
.pp-root .panel-fab:active{transform:scale(.88)}
.pp-root .fab-bonus{left:8px;color:var(--gold-soft);border:1px solid rgba(255,210,76,.45)}
.pp-root .fab-prize{right:8px;color:var(--pink-soft);border:1px solid rgba(255,89,63,.45)}
.pp-root .drawer-backdrop{display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:45}
.pp-root .drawer-backdrop.open{display:block}
.pp-root .drawer-handle{display:none;width:36px;height:4px;border-radius:2px;background:rgba(255,255,255,.25);margin:0 auto 6px}
@media (max-width:520px){
.pp-root .app-bg{height:100dvh;height:100vh;padding:6px;overflow:hidden;align-items:stretch;justify-content:stretch}
.pp-root .arcade-cabinet{width:100%;height:100%;padding:8px 8px 8px;border-radius:18px;display:flex}
.pp-root .cabinet-body{height:100%;width:100%;gap:6px}
.pp-root .cabinet-main{flex:1;min-height:0}
.pp-root .machine-column{flex:1;min-height:0;display:flex;flex-direction:column;width:100%}
.pp-root .claw-machine{flex:1;min-height:0;height:auto}
.pp-root .marquee{padding:8px 40px 8px}
.pp-root .marquee-title{font-size:20px}
.pp-root .marquee-subtitle{font-size:9px;letter-spacing:2px}
.pp-root .cabinet-base{display:none}
.pp-root .control-panel{grid-template-columns:1fr 1fr;grid-template-areas:'coins bet' 'joystick play';row-gap:6px;padding:8px 12px;flex:0 0 auto}
.pp-root .coin-display{grid-area:coins;min-width:0;padding:4px 10px}
.pp-root .bet-control{grid-area:bet;justify-self:end}
.pp-root .joystick-wrap{grid-area:joystick;justify-self:start}
.pp-root .play-btn{grid-area:play;justify-self:end;width:54px;height:54px;font-size:10px}
.pp-root .joystick-base{width:52px;height:52px}
.pp-root .control-buttons{display:flex}
.pp-root .hall-sign{display:none}
.pp-root .fg-bokeh{display:none}
.pp-root .panel-fab{display:flex}
.pp-root .side-panel{
    position:fixed;left:0;right:0;bottom:0;z-index:50;
    max-height:65vh;overflow-y:auto;
    transform:translateY(115%);
    transition:transform .3s ease;
    border-radius:18px 18px 0 0;
    margin:0;width:100%;
    box-shadow:0 -10px 40px rgba(0,0,0,.6);
  }
.pp-root .side-panel.open{transform:translateY(0)}
.pp-root .drawer-handle{display:block}
.pp-root .prize-list{flex-direction:column;flex-wrap:nowrap}
.pp-root .prize-row{flex:none}

}
@media (min-width:521px) and (max-width:860px){
.pp-root .control-buttons{display:flex}
}
@media (prefers-reduced-motion:reduce){
.pp-root *{animation-duration:.01ms !important;animation-iteration-count:1 !important;transition-duration:.01ms !important}
}


      `}</style>

<div className="app-bg">
  <div className="arcade-hall-bg" aria-hidden="true">
    <div className="hall-sign sign-a">WIN BIG</div>
    <div className="hall-sign sign-b">★ PARADISE ★</div>
    <div className="hall-blur-machine m1"></div>
    <div className="hall-blur-machine m2"></div>
    <div className="hall-blur-machine m3"></div>
  </div>
  <div className="fg-bokeh fb1" aria-hidden="true"></div>
  <div className="fg-bokeh fb2" aria-hidden="true"></div>
  <div className="fg-bokeh fb3" aria-hidden="true"></div>

  <div className="arcade-cabinet">
    <div className="cabinet-body">
      <header className="marquee">
        <div className="marquee-bulbs" id="pp-bulbs"></div>
        <div className="marquee-content">
          <h1 className="marquee-title">PLUSHIE <span>PARADISE</span></h1>
          <p className="marquee-subtitle">★ NEON CLAW MACHINE ★</p>
        </div>
        <div className="marquee-shine"></div>
        <button className="mute-btn" id="pp-muteBtn" aria-label="Mute sound" title="Mute">🔊</button>
      </header>

      <div className="cabinet-main">
        <aside className="side-panel bonus-panel">
          <div className="drawer-handle"></div>
          <h2 className="panel-title">Bonus Coin</h2>
          <div className="bonus-star">
            <span className="star-icon">★</span>
            <div><div className="bonus-amount">+50</div><div className="bonus-label">COINS</div></div>
          </div>
          <div className="jackpot-callout"><span>★</span> JACKPOT MULTIPLIER <strong>x5</strong></div>
          <div className="streak-line">Win streak <strong id="pp-streakVal">0</strong></div>
        </aside>

        <div className="machine-column">
          <button className="panel-fab fab-bonus" id="pp-fabBonus" aria-label="Show bonus and jackpot info">★</button>
          <button className="panel-fab fab-prize" id="pp-fabPrize" aria-label="Show prize board">🏆</button>
          <div className="claw-machine">
            <div className="machine-frame">
              <div className="machine-glass">
                <div className="glass-interior-bg"></div>
                <div className="glass-ceiling-light"></div>
                <div className="glass-bokeh"></div>
                <div className="ambient-dust" id="pp-ambientDust"></div>
                <div className="plushie-pile" id="pp-pile"></div>

                <div className="claw-rig" id="pp-clawRig" style={{left:"50%"}}>
                  <div className="claw-contact-shadow" id="pp-contactShadow"></div>
                  <div className="claw-motor"><div className="motor-bolt"></div><div className="motor-bolt right"></div></div>
                  <div className="cable-wrap" id="pp-cableWrap" style={{height:"9%"}}><div className="cable-line" id="pp-cableLine"></div></div>
                  <div className="claw-head" id="pp-clawHead" style={{top:"calc(9% - 6px)"}}>
                    <div className="held-plushie-slot" id="pp-heldSlot"></div>
                    <div className="claw-finger left closed" id="pp-fingerL"></div>
                    <div className="claw-finger center closed" id="pp-fingerC"></div>
                    <div className="claw-finger right closed" id="pp-fingerR"></div>
                    <div className="claw-knuckle"></div>
                  </div>
                </div>

                <div className="prize-chute"><div className="chute-mouth"></div><span className="chute-label">WIN</span></div>
                <canvas className="particle-canvas" id="pp-particles"></canvas>
                <div className="screen-flash" id="pp-screenFlash"></div>
                <div className="glass-reflection"></div>
                <div className="glass-static-glare"></div>
                <div className="glass-vignette"></div>
              </div>
              <div className="frame-bolts">
                <span className="bolt"></span><span className="bolt"></span><span className="bolt"></span><span className="bolt"></span>
                <span className="bolt"></span><span className="bolt"></span><span className="bolt"></span><span className="bolt"></span>
                <span className="bolt"></span><span className="bolt"></span>
              </div>
            </div>
          </div>
          <div className="result-overlay" id="pp-resultOverlay"></div>
          <div className="bonus-overlay" id="pp-bonusOverlay"></div>
          <div className="jackpot-overlay" id="pp-jackpotOverlay" style={{display:"none"}}>
            <div className="jackpot-text">JACKPOT</div>
            <div className="jackpot-multiplier">×5</div>
          </div>
        </div>

        <aside className="side-panel prize-board">
          <div className="drawer-handle"></div>
          <h2 className="panel-title">Special Plushies</h2>
          <ul className="prize-list" id="pp-prizeList"></ul>
          <div className="panel-footer-badge">BONUS ROUND<br/><small>More grabs, more fun!</small></div>
        </aside>
      </div>

      <div className="control-panel">
        <div className="coin-display">
          <span className="coin-label">Coin Balance</span>
          <span className="coin-icon" id="pp-coinIcon">●</span>
          <span className="coin-value" id="pp-coinValue">1,250</span>
          <span id="pp-coinFloatSlot"></span>
        </div>

        <div className="joystick-wrap" id="pp-joystickWrap">
          <div className="joystick-base" id="pp-joystickBase">
            <div className="joystick-ring"></div>
            <div className="joystick-stick" id="pp-joystickStick"><div className="joystick-ball"></div></div>
          </div>
          <div className="control-buttons">
            <button className="dir-btn" id="pp-btnLeft" aria-label="Move claw left">◀</button>
            <button className="dir-btn" id="pp-btnRight" aria-label="Move claw right">▶</button>
          </div>
        </div>

        <button className="play-btn" id="pp-playBtn" aria-label="Play claw machine">
          <span className="play-btn-ring"></span><span className="play-btn-label">PLAY</span>
        </button>

        <div className="bet-control">
          <span className="bet-label">Bet</span>
          <div className="bet-row">
            <button className="bet-btn" id="pp-betMinus" aria-label="Decrease bet">−</button>
            <span className="bet-value" id="pp-betValue">10</span>
            <button className="bet-btn" id="pp-betPlus" aria-label="Increase bet">+</button>
          </div>
        </div>
        <div id="pp-toastSlot"></div>
      </div>

      <div className="cabinet-base"><span className="base-led"></span><span className="base-led"></span><span className="base-led"></span></div>
    </div>
  </div>
  <div className="drawer-backdrop" id="pp-drawerBackdrop"></div>
</div>


    </div>
  );
}
