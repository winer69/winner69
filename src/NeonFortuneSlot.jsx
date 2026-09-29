import React, { useEffect, useRef } from 'react';

/**
 * NeonFortuneSlot
 * -----------------------------------------------------------------------
 * Drop-in slot machine game. Works two ways:
 *
 * 1) STANDALONE - just <NeonFortuneSlot /> with no props: manages its own
 *    balance in localStorage ("neonFortuneSave"), a fixed 3% house edge,
 *    and its own mute state. Nothing else required.
 *
 * 2) INTEGRATED into a host app (e.g. WINNER 69's shared wallet/context) -
 *    pass the props below and the engine mirrors every credit change into
 *    your app's own balance/state instead of using localStorage:
 *
 *      <NeonFortuneSlot
 *        initialBalance={balance}                 // number, e.g. from useApp()
 *        winRate={edges.neonfortune}               // win rate %, e.g. 97 (higher = more generous)
 *        onBalanceDelta={(delta) => setBalance(b => b + delta)}
 *        onRound={(wager, payout) => recordRound("neonfortune", wager, payout)}
 *        onBigWin={(multiplier, tier) => celebrate(multiplier)}
 *        muted={muted}
 *      />
 *
 *    - onBalanceDelta(delta): called with a negative number when a bet is
 *      placed and a positive number for any payout (including jackpot).
 *      The engine still tracks balance internally for its own UI/animations,
 *      but every change is mirrored out through this callback so the host
 *      app's shared credit balance stays authoritative.
 *    - winRate (10-100) is applied as a flat scale on total win amount -
 *      100 means full nominal payout, lower numbers scale it down - the same
 *      way the other WINNER 69 games apply edges.<game>.
 *    - onRound is called once per spin (wager is 0 for free spins, since no
 *      credit is deducted for those) so it can feed the admin stats/ledger.
 *    - onBigWin fires for Big/Mega/Epic/Jackpot wins only (not every win),
 *      so it's a reasonable hook for the host app's own confetti/flash.
 *    - muted, if true, starts the game already master-muted once audio
 *      initializes (browsers require a first tap before any audio starts).
 *
 * Styles are scoped under .nf-game so they don't leak into the rest of the
 * app, and all DOM lookups are scoped to this component's own root node,
 * so it's safe to mount next to Dice/Limbo/Keno/Hi-Lo/Mines/Gilt Reels/
 * Jungle Riches. Mount only one instance at a time.
 */
export default function NeonFortuneSlot({
  initialBalance,
  winRate,
  onBalanceDelta,
  onRound,
  onBigWin,
  muted,
  server,        // optional { call(path, body) -> Promise }: the backend decides every spin
} = {}){
  const rootRef = useRef(null);
  const serverRef = useRef(server);
  serverRef.current = server;

  // Refs keep the long-lived engine effect (mounted once) reading the
  // latest callback props without needing to restart the whole game.
  const onBalanceDeltaRef = useRef(onBalanceDelta);
  const onRoundRef = useRef(onRound);
  const onBigWinRef = useRef(onBigWin);
  const mutedRef = useRef(muted);
  useEffect(() => {
    onBalanceDeltaRef.current = onBalanceDelta;
    onRoundRef.current = onRound;
    onBigWinRef.current = onBigWin;
    mutedRef.current = muted;
  });

  const initialBalanceProp = initialBalance;
  const winRateProp = winRate;

  useEffect(() => {
    let disposed = false;
        const root = rootRef.current;
        if(!root) return undefined;
        const byId = function(id){ return root.querySelector('#'+id); };


    /* =========================================================
       GAME CONFIG
    ========================================================= */
    const GAME_CONFIG = {
      startingBalance: 1250,
      defaultBet: 10,
      minBet: 1,
      maxBet: 5000,
      betSteps: [1,2,5,10,20,50,100,200,500,1000,2500,5000],
      reels: 5,
      rows: 3,
      paylines: 20,
      freeSpinsBase: 10,
      musicVolume: 0.35,
      sfxVolume: 0.70,
      winVolume: 0.80,
      bonusVolume: 0.90,
      jackpotVolume: 1.0
    };

    /* =========================================================
       SYMBOLS
    ========================================================= */
    const SYMBOLS = {
      A:      { tier:'low',  glyph:'A',  pay:{3:2,  4:5,   5:10}  },
      K:      { tier:'low',  glyph:'K',  pay:{3:2,  4:5,   5:10}  },
      Q:      { tier:'low',  glyph:'Q',  pay:{3:1.5,4:4,   5:8}   },
      J:      { tier:'low',  glyph:'J',  pay:{3:1.5,4:4,   5:8}   },
      T:      { tier:'low',  glyph:'10', pay:{3:1,  4:3,   5:6}   },
      MOON:   { tier:'mid',  glyph:'🌙', pay:{3:5,  4:15,  5:40}  },
      STAR:   { tier:'mid',  glyph:'⭐', pay:{3:5,  4:15,  5:40}  },
      GEM:    { tier:'mid',  glyph:'💎', pay:{3:6,  4:18,  5:45}  },
      CROWN:  { tier:'mid',  glyph:'👑', pay:{3:6,  4:18,  5:45}  },
      DRAGON: { tier:'high', glyph:'🐉', pay:{3:15, 4:50,  5:150} },
      PHOENIX:{ tier:'high', glyph:'🦅', pay:{3:15, 4:50,  5:150} },
      TIGER:  { tier:'high', glyph:'🐯', pay:{3:18, 4:60,  5:180} },
      QUEEN:  { tier:'high', glyph:'👸', pay:{3:20, 4:70,  5:200} },
      WILD:   { tier:'wild', glyph:'WILD', pay:{3:20, 4:75, 5:250} },
      SCATTER:{ tier:'scatter', glyph:'✦', pay:{3:2,  4:5,   5:20} },
      BONUS:  { tier:'bonus', glyph:'🎁', pay:{} }
    };

    /* weighted reel strips (5 reels), circular */
    // Seeded shuffle - must stay identical to nfStrips() in backend/src/games.js,
    // so the reels can stop exactly on the positions the server picks.
    function seededRandom(seed){
      let a = seed >>> 0;
      return function(){ a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    }
    let stripSeed = 9001;
    function buildStrip(weights){
      const rnd = seededRandom(stripSeed++);
      const strip=[];
      for(const sym in weights){
        for(let i=0;i<weights[sym];i++) strip.push(sym);
      }
      for(let i=strip.length-1;i>0;i--){
        const j=Math.floor(rnd()*(i+1));
        const tmp=strip[i]; strip[i]=strip[j]; strip[j]=tmp;
      }
      return strip;
    }

    const REEL_WEIGHTS = {
      A:4, K:4, Q:5, J:5, T:5,
      MOON:3, STAR:3, GEM:3, CROWN:3,
      DRAGON:2, PHOENIX:2, TIGER:2, QUEEN:2,
      WILD:1, SCATTER:1
    };

    const REEL_STRIPS = [];
    for(let r=0;r<GAME_CONFIG.reels;r++){
      REEL_STRIPS.push(buildStrip(REEL_WEIGHTS));
    }

    /* =========================================================
       PAYLINES  (row index per reel, 0=top,1=mid,2=bottom)
    ========================================================= */
    const PAYLINES = [
      [1,1,1,1,1],
      [0,0,0,0,0],
      [2,2,2,2,2],
      [0,1,2,1,0],
      [2,1,0,1,2],
      [0,0,1,0,0],
      [2,2,1,2,2],
      [1,0,0,0,1],
      [1,2,2,2,1],
      [0,1,1,1,0],
      [2,1,1,1,2],
      [1,0,1,0,1],
      [1,2,1,2,1],
      [0,1,0,1,0],
      [2,1,2,1,2],
      [1,1,0,1,1],
      [1,1,2,1,1],
      [0,2,0,2,0],
      [2,0,2,0,2],
      [0,2,2,2,0]
    ];

    /* =========================================================
       AUDIO MANAGER  (procedural Web Audio API)
    ========================================================= */
    const AudioManager = (function(){
      let ctx=null, master=null, bgmGain=null, sfxGain=null, muted=false, bgmTimer=null, started=false;
      let musicMuted=false, sfxMuted=false, musicVol=GAME_CONFIG.musicVolume, sfxVol=GAME_CONFIG.sfxVolume;
      let rumbleNodes=null, bonusMode=false;

      function ensureCtx(){
        if(!ctx){
          ctx = new (window.AudioContext||window.webkitAudioContext)();
          master = ctx.createGain(); master.gain.value = 1; master.connect(ctx.destination);
          bgmGain = ctx.createGain(); bgmGain.gain.value = GAME_CONFIG.musicVolume; bgmGain.connect(master);
          sfxGain = ctx.createGain(); sfxGain.gain.value = GAME_CONFIG.sfxVolume; sfxGain.connect(master);
        }
        if(ctx.state==='suspended') ctx.resume();
      }

      function tone(freq,dur,type,gainVal,dest,delay){
        delay=delay||0;
        const t0 = ctx.currentTime+delay;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type=type||'sine';
        osc.frequency.setValueAtTime(freq,t0);
        g.gain.setValueAtTime(0.0001,t0);
        g.gain.exponentialRampToValueAtTime(Math.max(gainVal,0.001), t0+0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, t0+dur);
        osc.connect(g); g.connect(dest||sfxGain);
        osc.start(t0); osc.stop(t0+dur+0.05);
        return osc;
      }

      function click(freq){
        if(!ctx) return;
        tone(freq||900,0.06,'square',0.25);
      }

      const api = {
        init(){
          ensureCtx();
          if(!started){ started=true; this.startBgm(); }
        },
        toggleMute(){
          muted=!muted;
          if(master) master.gain.setTargetAtTime(muted?0:1, ctx.currentTime, 0.05);
          return muted;
        },
        isMuted(){ return muted; },
        uiClick(){ if(ctx) click(700); },
        betTick(){ if(ctx) click(500); },
        spinStart(){
          if(!ctx) return;
          tone(140,0.35,'sawtooth',0.3);
          tone(280,0.25,'square',0.15);
        },
        reelStop(strength){
          if(!ctx) return;
          click(strength?1300:1000);
          tone(strength?220:160, 0.12, 'triangle', strength?0.3:0.2);
        },
        anticipation(){
          if(!ctx) return;
          tone(180,0.5,'sine',0.18);
          tone(360,0.5,'sine',0.1,sfxGain,0.1);
        },
        startRumble(){
          if(!ctx) return;
          this.stopRumble();
          const bufSize = ctx.sampleRate*2;
          const buf = ctx.createBuffer(1,bufSize,ctx.sampleRate);
          const data = buf.getChannelData(0);
          for(let i=0;i<bufSize;i++) data[i]=(Math.random()*2-1)*0.5;
          const noise = ctx.createBufferSource(); noise.buffer=buf; noise.loop=true;
          const lp = ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=320;
          const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, ctx.currentTime);
          g.gain.exponentialRampToValueAtTime(0.16, ctx.currentTime+0.15);
          noise.connect(lp); lp.connect(g); g.connect(sfxGain);
          noise.start();
          rumbleNodes = {noise:noise, gain:g};
        },
        stopRumble(){
          if(rumbleNodes && ctx){
            try{
              rumbleNodes.gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime+0.12);
              const n = rumbleNodes.noise;
              setTimeout(function(){ try{ n.stop(); }catch(e){} }, 200);
            }catch(e){}
            rumbleNodes=null;
          }
        },
        winSmall(){
          if(!ctx) return;
          [660,880,1100].forEach(function(f,i){ tone(f,0.22,'sine',0.25,sfxGain,i*0.07); });
        },
        winBig(tier){
          if(!ctx) return;
          const notes = (tier==='epic'||tier==='jackpot') ? [523,659,784,1047,1319] : [523,659,784,988];
          notes.forEach(function(f,i){ tone(f,0.4,'triangle',0.3,sfxGain,i*0.09); });
        },
        bonusTrigger(){
          if(!ctx) return;
          [392,494,587,784].forEach(function(f,i){ tone(f,0.5,'sawtooth',0.28,sfxGain,i*0.12); });
        },
        jackpot(){
          if(!ctx) return;
          const seq=[523,659,784,1047,1319,1568,2093];
          seq.forEach(function(f,i){ tone(f,0.6,'triangle',0.35,sfxGain,i*0.1); });
        },
        setMusicVolume(v01){
          musicVol=v01;
          if(bgmGain && !musicMuted) bgmGain.gain.setTargetAtTime(v01, ctx.currentTime, 0.05);
        },
        setSfxVolume(v01){
          sfxVol=v01;
          if(sfxGain && !sfxMuted) sfxGain.gain.setTargetAtTime(v01, ctx.currentTime, 0.05);
        },
        toggleMusicMute(){
          musicMuted=!musicMuted;
          if(bgmGain) bgmGain.gain.setTargetAtTime(musicMuted?0:musicVol, ctx.currentTime, 0.05);
          return musicMuted;
        },
        toggleSfxMute(){
          sfxMuted=!sfxMuted;
          if(sfxGain) sfxGain.gain.setTargetAtTime(sfxMuted?0:sfxVol, ctx.currentTime, 0.05);
          return sfxMuted;
        },
        setBonusMode(on){ bonusMode=!!on; this.startBgm(); },
        startBgm(){
          ensureCtx();
          this.stopBgm();
          const scale = bonusMode ? [246.9,293.7,329.6,392,440,493.9] : [220,261.6,293.7,329.6,392,440];
          const stepMs = bonusMode ? 700 : 900;
          let step=0;
          const playStep=function(){
            if(!ctx) return;
            const t0=ctx.currentTime;
            const bassFreq = scale[step%scale.length]/2;
            const bassOsc=ctx.createOscillator(); const bassG=ctx.createGain();
            bassOsc.type='sine'; bassOsc.frequency.value=bassFreq;
            bassG.gain.setValueAtTime(0.0001,t0);
            bassG.gain.exponentialRampToValueAtTime(0.5,t0+0.05);
            bassG.gain.exponentialRampToValueAtTime(0.0001,t0+0.9);
            bassOsc.connect(bassG); bassG.connect(bgmGain);
            bassOsc.start(t0); bassOsc.stop(t0+1);

            if(step%2===0){
              const padFreq = scale[(step+2)%scale.length]*2;
              const padOsc=ctx.createOscillator(); const padG=ctx.createGain();
              const filt=ctx.createBiquadFilter(); filt.type='lowpass'; filt.frequency.value=1200;
              padOsc.type='triangle'; padOsc.frequency.value=padFreq;
              padG.gain.setValueAtTime(0.0001,t0);
              padG.gain.exponentialRampToValueAtTime(0.18,t0+0.1);
              padG.gain.exponentialRampToValueAtTime(0.0001,t0+1.6);
              padOsc.connect(filt); filt.connect(padG); padG.connect(bgmGain);
              padOsc.start(t0); padOsc.stop(t0+1.7);
            }

            const bufSize=Math.floor(ctx.sampleRate*0.03);
            const buf=ctx.createBuffer(1,bufSize,ctx.sampleRate);
            const data=buf.getChannelData(0);
            for(let i=0;i<bufSize;i++) data[i]=(Math.random()*2-1)*(1-i/bufSize);
            const noise=ctx.createBufferSource(); noise.buffer=buf;
            const hp=ctx.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=4000;
            const hatG=ctx.createGain(); hatG.gain.setValueAtTime(0.06,t0);
            noise.connect(hp); hp.connect(hatG); hatG.connect(bgmGain);
            noise.start(t0);
            step++;
          };
          playStep();
          bgmTimer = setInterval(playStep, stepMs);
        },
        stopBgm(){
          if(bgmTimer){ clearInterval(bgmTimer); bgmTimer=null; }
        },
        setBgmVolume(v){ if(bgmGain) bgmGain.gain.setTargetAtTime(v, ctx.currentTime, 0.1); },
        duckBgm(v,restoreAfter){
          if(!bgmGain) return;
          bgmGain.gain.setTargetAtTime(v, ctx.currentTime, 0.2);
          if(restoreAfter) setTimeout(function(){ if(bgmGain && !musicMuted) bgmGain.gain.setTargetAtTime(musicVol, ctx.currentTime, 0.4); }, restoreAfter);
        },
        dispose(){
          this.stopBgm();
          this.stopRumble();
          if(ctx){ try{ ctx.close(); }catch(e){} ctx=null; }
          started=false;
        }
      };
      return api;
    })();


    /* =========================================================
       STATE
    ========================================================= */
    const hasExternalBalance = typeof onBalanceDeltaRef.current === 'function';

    let state = {
      balance: (typeof initialBalanceProp === 'number') ? initialBalanceProp : GAME_CONFIG.startingBalance,
      bet: GAME_CONFIG.defaultBet,
      isSpinning:false,
      isBonus:false,
      freeSpinsLeft:0,
      freeSpinsTotalWin:0,
      autoSpinsLeft:0,
      soundOn:true
    };

    if(!hasExternalBalance){
      try{
        const saved = JSON.parse(localStorage.getItem('neonFortuneSave'));
        if(saved && typeof saved.balance==='number'){
          state.balance = saved.balance;
          state.bet = saved.bet || GAME_CONFIG.defaultBet;
        }
      }catch(e){}
    }

    function saveState(){
      if(hasExternalBalance) return; // shared wallet owns persistence when integrated into a host app
      try{ localStorage.setItem('neonFortuneSave', JSON.stringify({balance:state.balance, bet:state.bet})); }catch(e){}
    }

    /* =========================================================
       DOM REFS
    ========================================================= */
    const el = {
      reels: byId('reels'),
      balanceVal: byId('balanceVal'),
      betVal: byId('betVal'),
      spinBtn: byId('spinBtn'),
      betMinus: byId('betMinus'),
      betPlus: byId('betPlus'),
      winDisplay: byId('winDisplay'),
      winAmt: byId('winAmt'),
      paylinesSvg: byId('paylinesSvg'),
      soundBtn: byId('soundBtn'),
      autoBtn: byId('autoBtn'),
      infoBtn: byId('infoBtn'),
      autoPanel: byId('autoPanel'),
      autoGrid: byId('autoGrid'),
      autoCancel: byId('autoCancel'),
      infoPanel: byId('infoPanel'),
      infoClose: byId('infoClose'),
      settingsBtn: byId('settingsBtn'),
      settingsPanel: byId('settingsPanel'),
      settingsClose: byId('settingsClose'),
      musicSlider: byId('musicSlider'),
      sfxSlider: byId('sfxSlider'),
      musicMuteBtn: byId('musicMuteBtn'),
      sfxMuteBtn: byId('sfxMuteBtn'),
      paytableBtn: byId('paytableBtn'),
      paytablePanel: byId('paytablePanel'),
      paytableClose: byId('paytableClose'),
      paytableList: byId('paytableList'),
      fsBanner: byId('fsBanner'),
      fsLeft: byId('fsLeft'),
      bonusOverlay: byId('bonusOverlay'),
      bonusSubtitle: byId('bonusSubtitle'),
      bonusFsCount: byId('bonusFsCount'),
      jackpotOverlay: byId('jackpotOverlay'),
      jackpotAmt: byId('jackpotAmt'),
      cabinet: byId('cabinet'),
      gameRoot: byId('gameRoot'),
      liveRegion: byId('liveRegion'),
      particles: byId('particles')
    };

    const SYM_H = 78;
    const REPEATS_BEFORE_STOP = 4;

    let reelStripEls = [];
    let currentGrid = [];

    /* =========================================================
       BUILD REEL DOM
    ========================================================= */
    function makeSymbolEl(symKey){
      const def = SYMBOLS[symKey];
      const wrap=document.createElement('div');
      wrap.className='symbol tier-'+def.tier;
      wrap.dataset.sym=symKey;
      const glyph=document.createElement('div');
      glyph.className='glyph';
      glyph.textContent=def.glyph;
      if(def.tier==='low') glyph.style.fontWeight='800';
      wrap.appendChild(glyph);
      return wrap;
    }

    function buildReels(){
      el.reels.innerHTML='';
      reelStripEls = [];
      for(let r=0;r<GAME_CONFIG.reels;r++){
        const reelDiv = document.createElement('div');
        reelDiv.className='reel';
        reelDiv.dataset.reel=r;

        const stripDiv = document.createElement('div');
        stripDiv.className='reel-strip';

        const strip = REEL_STRIPS[r];
        const startIdx = Math.floor(Math.random()*strip.length);
        for(let i=0;i<GAME_CONFIG.rows+2;i++){
          stripDiv.appendChild(makeSymbolEl(strip[(startIdx+i)%strip.length]));
        }
        stripDiv.style.transform = 'translateY(0px)';

        reelDiv.appendChild(stripDiv);

        const shadeTop=document.createElement('div'); shadeTop.className='reel-shade-top';
        const shadeBottom=document.createElement('div'); shadeBottom.className='reel-shade-bottom';
        reelDiv.appendChild(shadeTop); reelDiv.appendChild(shadeBottom);

        el.reels.appendChild(reelDiv);
        reelStripEls.push({reelDiv:reelDiv, stripDiv:stripDiv, baseIndex:startIdx, visibleStart:0});
      }
    }

    /* =========================================================
       RESULT GENERATION  (RNG determines outcome BEFORE animation)
    ========================================================= */
    function generateResult(){
      const grid=[];
      const stopIdx=[];
      for(let r=0;r<GAME_CONFIG.reels;r++){
        const strip=REEL_STRIPS[r];
        const idx=Math.floor(Math.random()*strip.length);
        stopIdx.push(idx);
        const col=[];
        for(let row=0;row<GAME_CONFIG.rows;row++){
          col.push(strip[(idx+row)%strip.length]);
        }
        grid.push(col);
      }
      return {grid:grid, stopIdx:stopIdx};
    }

    // Win/lose is decided FIRST by winRateProp (the admin win rate), not by
    // whatever the reels naturally land on - this just re-spins genuinely
    // random reel results until one happens to match the desired outcome
    // (any paying combination if won, none if lost), so winning grids still
    // look naturally varied instead of always hitting the same symbols.
    function generateResultForOutcome(won, betTotal){
      for(let attempt=0; attempt<500; attempt++){
        const candidate = generateResult();
        const evalResult = calculateWins(candidate.grid, betTotal);
        if((evalResult.totalWin > 0) === won) return candidate;
      }
      return generateResult();
    }

    function calculateWins(grid, betTotal){
      const betPerLine = betTotal / GAME_CONFIG.paylines;
      const lineWins=[];
      let totalLineWin=0;

      PAYLINES.forEach(function(pattern, lineIndex){
        const seq = pattern.map(function(row,reel){ return grid[reel][row]; });
        let effective=null;
        let brokeOnScatter=false;
        for(let i=0;i<seq.length;i++){
          const s=seq[i];
          if(s==='SCATTER'||s==='BONUS'){ brokeOnScatter=true; break; }
          if(s!=='WILD'){ effective=s; break; }
        }
        if(brokeOnScatter) return;
        if(effective===null){
          if(seq.every(function(s){return s==='WILD';})) effective='WILD'; else return;
        }
        let count=0;
        for(let i=0;i<seq.length;i++){
          const s=seq[i];
          if(s===effective || s==='WILD') count++; else break;
        }
        if(count>=3 && SYMBOLS[effective] && SYMBOLS[effective].pay[count]){
          const amount = SYMBOLS[effective].pay[count] * betPerLine;
          const positions=[];
          for(let reel=0; reel<count; reel++) positions.push([reel, pattern[reel]]);
          lineWins.push({lineIndex:lineIndex, count:count, symbol:effective, amount:amount, positions:positions});
          totalLineWin += amount;
        }
      });

      let scatterCount=0;
      const scatterPositions=[];
      grid.forEach(function(col,reel){
        col.forEach(function(s,row){
          if(s==='SCATTER'){ scatterCount++; scatterPositions.push([reel,row]); }
        });
      });
      let scatterWin=0;
      if(scatterCount>=3 && SYMBOLS.SCATTER.pay[Math.min(scatterCount,5)]){
        scatterWin = SYMBOLS.SCATTER.pay[Math.min(scatterCount,5)] * betTotal;
      }

      const totalWin = totalLineWin + scatterWin;
      return { lineWins:lineWins, scatterCount:scatterCount, scatterPositions:scatterPositions, scatterWin:scatterWin, totalWin:totalWin };
    }

    function winTier(totalWin, betTotal){
      if(betTotal<=0) return 'normal';
      const ratio = totalWin/betTotal;
      if(ratio>=60) return 'epic';
      if(ratio>=30) return 'mega';
      if(ratio>=10) return 'big';
      return 'normal';
    }

    /* =========================================================
       ANIMATION: spin each reel to target stop index
    ========================================================= */
    function animateReelsToResult(grid, stopIdx, onAllDone){
      let doneCount=0;
      const total=GAME_CONFIG.reels;

      // determine, from the already-decided result, whether the final reel(s)
      // should build anticipation (a bonus is brewing but not yet revealed)
      let scatterSoFar=0;
      for(let r=0;r<total-1;r++){
        for(let row=0;row<GAME_CONFIG.rows;row++){
          if(grid[r][row]==='SCATTER') scatterSoFar++;
        }
      }
      const anticipating = scatterSoFar>=2;

      stopIdx.forEach(function(targetIdx, r){
        const baseDelay = r*140;
        const isLast = r===total-1;
        const isAnticipating = anticipating && isLast;
        let duration = 1500 + r*320 + Math.random()*180;
        if(isAnticipating) duration += 900;

        setTimeout(function(){
          if(isAnticipating){
            reelStripEls[r].reelDiv.classList.add('anticipate');
            AudioManager.anticipation();
          }
          spinSingleReel(r, targetIdx, duration, function(){
            doneCount++;
            reelStripEls[r].reelDiv.classList.remove('anticipate');
            AudioManager.reelStop(isLast);
            if(navigator.vibrate) navigator.vibrate(isLast?18:10);
            flashReelSettle(r);
            if(doneCount===total){
              onAllDone();
            }
          }, isAnticipating);
        }, baseDelay);
      });
    }

    function spinSingleReel(reelIndex, targetIdx, duration, onDone, isAnticipating){
      const rs = reelStripEls[reelIndex];
      const strip = REEL_STRIPS[reelIndex];
      const stripLen = strip.length;
      rs.reelDiv.classList.add('spinning');
      AudioManager.spinStart();
      AudioManager.startRumble();

      const loops = REPEATS_BEFORE_STOP + (isAnticipating?1:0);
      const startBase = rs.baseIndex;
      const totalSteps = loops*stripLen + ((targetIdx - startBase + stripLen)%stripLen);
      const overshootSteps = 0.42; // fraction of a symbol height, mechanical overshoot
      const itemsNeeded = totalSteps + GAME_CONFIG.rows + 3;

      const frag = document.createDocumentFragment();
      for(let i=0;i<itemsNeeded;i++){
        frag.appendChild(makeSymbolEl(strip[(startBase+i)%stripLen]));
      }
      rs.stripDiv.innerHTML='';
      rs.stripDiv.appendChild(frag);
      rs.stripDiv.style.transition='none';
      rs.stripDiv.style.transform='translateY(0px)';
      rs.stripDiv.style.filter='blur(0px) brightness(1)';
      void rs.stripDiv.offsetHeight;

      const finalY = -(totalSteps*SYM_H);
      const overshootY = finalY - (overshootSteps*SYM_H);

      // ---- PHASE 1: acceleration + max-velocity cruise + deceleration toward overshoot point ----
      const phase1Duration = Math.round(duration*0.84);
      const phase2Duration = Math.max(180, duration-phase1Duration); // bounce-back settle

      requestAnimationFrame(function(){
        // fast accel then long decel curve — mimics a heavy reel spinning up then braking
        rs.stripDiv.style.transition = 'transform '+phase1Duration+'ms cubic-bezier(0.13,0.82,0.28,1)';
        rs.stripDiv.style.transform = 'translateY('+overshootY+'px)';
      });

      // velocity-driven motion blur via rAF (independent of the CSS transition timing function)
      const blurStart = performance.now();
      function blurFrame(now){
        if(disposed) return;
        const t = Math.min(1, (now-blurStart)/phase1Duration);
        let amt;
        if(t<0.12) amt = (t/0.12)*4.5;              // ramp up fast
        else if(t<0.62) amt = 4.5;                   // hold at max speed
        else amt = 4.5*(1-((t-0.62)/0.38));          // ease down as it brakes
        amt = Math.max(0, amt);
        rs.stripDiv.style.filter = 'blur('+amt.toFixed(2)+'px) brightness('+(1+amt*0.06).toFixed(2)+')';
        if(t<1) requestAnimationFrame(blurFrame);
        else rs.stripDiv.style.filter='blur(0px) brightness(1)';
      }
      requestAnimationFrame(blurFrame);

      setTimeout(function(){
        rs.reelDiv.classList.remove('spinning');
        AudioManager.stopRumble();

        // ---- PHASE 2: mechanical overshoot correction — spring back to exact resting position ----
        requestAnimationFrame(function(){
          rs.stripDiv.style.transition = 'transform '+phase2Duration+'ms cubic-bezier(0.34,1.56,0.64,1)';
          rs.stripDiv.style.transform = 'translateY('+finalY+'px)';
        });
      }, phase1Duration);

      setTimeout(function(){
        rs.baseIndex = targetIdx;
        rs.visibleStart = itemsNeeded - (GAME_CONFIG.rows+2);
        onDone();
      }, phase1Duration+phase2Duration+20);
    }

    function flashReelSettle(reelIndex){
      const rs=reelStripEls[reelIndex];
      const children = rs.stripDiv.children;
      const total = children.length;
      const visibleStart = total - (GAME_CONFIG.rows+2);
      for(let i=0;i<GAME_CONFIG.rows;i++){
        const idx = visibleStart+i;
        if(children[idx]){
          (function(node){
            node.classList.add('settle');
            setTimeout(function(){ node.classList.remove('settle'); }, 450);
          })(children[idx]);
        }
      }
    }

    function getSymbolCell(reel,row){
      const rs=reelStripEls[reel];
      const idx = rs.visibleStart+row;
      return rs.stripDiv.children[idx];
    }

    /* =========================================================
       PAYLINE DRAWING
    ========================================================= */
    function drawPaylines(lineWins){
      el.paylinesSvg.innerHTML='';
      const colors=['#3ff0ff','#ff3fd8','#f4c542','#7b2ff7','#5cff8f'];
      const w=500, h= GAME_CONFIG.rows*78;
      el.paylinesSvg.setAttribute('viewBox','0 0 '+w+' '+h);
      lineWins.slice(0,6).forEach(function(lw,i){
        const pattern=PAYLINES[lw.lineIndex];
        let d='';
        for(let reel=0; reel<GAME_CONFIG.reels; reel++){
          const x = (reel+0.5)*(w/GAME_CONFIG.reels);
          const y = (pattern[reel]+0.5)*(h/GAME_CONFIG.rows);
          d += (reel===0?('M '+x+' '+y):(' L '+x+' '+y));
        }
        const path=document.createElementNS('http://www.w3.org/2000/svg','path');
        path.setAttribute('d',d);
        path.setAttribute('class','payline-path');
        path.style.stroke=colors[i%colors.length];
        path.style.color=colors[i%colors.length];
        path.style.animationDelay=(i*0.15)+'s';
        el.paylinesSvg.appendChild(path);
      });
    }

    function highlightWins(lineWins, scatterPositions){
      const winCells = {};
      lineWins.forEach(function(lw){ lw.positions.forEach(function(p){ winCells[p[0]+'_'+p[1]]=true; }); });
      scatterPositions.forEach(function(p){ winCells[p[0]+'_'+p[1]]=true; });

      const anyWin = Object.keys(winCells).length>0;
      for(let reel=0;reel<GAME_CONFIG.reels;reel++){
        for(let row=0;row<GAME_CONFIG.rows;row++){
          const cell=getSymbolCell(reel,row);
          if(!cell) continue;
          const key=reel+'_'+row;
          cell.classList.remove('win','dim');
          if(anyWin){
            if(winCells[key]) cell.classList.add('win');
            else cell.classList.add('dim');
          }
        }
      }
    }

    function clearHighlights(){
      const nodes = root.querySelectorAll('.symbol.win,.symbol.dim');
      nodes.forEach(function(c){ c.classList.remove('win','dim'); });
      el.paylinesSvg.innerHTML='';
    }

    /* =========================================================
       WIN COUNTER / DISPLAY
    ========================================================= */
    function animateCounter(fromVal,toVal,duration,onUpdate,onDone){
      const start=performance.now();
      function step(now){
        if(disposed) return;
        const t=Math.min(1,(now-start)/duration);
        const eased = 1-Math.pow(1-t,3);
        const val = fromVal + (toVal-fromVal)*eased;
        onUpdate(Math.round(val));
        if(t<1) requestAnimationFrame(step); else if(onDone) onDone();
      }
      requestAnimationFrame(step);
    }

    function showWin(amount, tier){
      el.winDisplay.classList.add('show');
      animateCounter(0, Math.round(amount), 900, function(v){
        el.winAmt.textContent = formatNum(v);
      });
    }

    function hideWinDisplay(){
      el.winDisplay.classList.remove('show');
    }

    function formatNum(n){ return Math.round(n).toLocaleString('en-US'); }

    /* =========================================================
       WIN CELEBRATION ENGINE
    ========================================================= */
    const fxCanvas = byId('fxCanvas');
    const fxCtx = fxCanvas.getContext('2d');
    const dimOverlayEl = byId('dimOverlay');
    const energyWaveEl = byId('energyWave');
    const screenFlashEl = byId('screenFlash');
    const winCelebTextEl = byId('winCelebText');

    let dpr = Math.min(window.devicePixelRatio||1, 2);
    function resizeFxCanvas(){
      dpr = Math.min(window.devicePixelRatio||1, 2);
      fxCanvas.width = window.innerWidth*dpr;
      fxCanvas.height = window.innerHeight*dpr;
      fxCanvas.style.width = window.innerWidth+'px';
      fxCanvas.style.height = window.innerHeight+'px';
      fxCtx.setTransform(dpr,0,0,dpr,0,0);
    }
    resizeFxCanvas();
    window.addEventListener('resize', resizeFxCanvas);

    let fxRockets = [];
    let fxSparks = [];
    let fxLoopRunning = false;

    function fxExplode(x,y,color,count){
      count = count||34;
      for(let i=0;i<count;i++){
        const angle = Math.random()*Math.PI*2;
        const speed = 1.4+Math.random()*4.2;
        fxSparks.push({
          x:x, y:y,
          vx:Math.cos(angle)*speed, vy:Math.sin(angle)*speed,
          life:0, maxLife:40+Math.random()*28,
          color:color, size:2+Math.random()*2.3
        });
      }
    }

    function fxLoop(){
      if(disposed) return;
      fxCtx.clearRect(0,0,window.innerWidth,window.innerHeight);

      for(let i=fxRockets.length-1;i>=0;i--){
        const r=fxRockets[i];
        r.trail.push({x:r.x,y:r.y});
        if(r.trail.length>6) r.trail.shift();
        r.x+=r.vx; r.y+=r.vy; r.vy+=0.045;

        fxCtx.strokeStyle=r.color; fxCtx.lineWidth=2; fxCtx.globalAlpha=0.55;
        fxCtx.beginPath();
        r.trail.forEach(function(p,idx){ if(idx===0) fxCtx.moveTo(p.x,p.y); else fxCtx.lineTo(p.x,p.y); });
        fxCtx.stroke();
        fxCtx.globalAlpha=1;

        fxCtx.fillStyle='#fff';
        fxCtx.beginPath(); fxCtx.arc(r.x,r.y,2.4,0,Math.PI*2); fxCtx.fill();

        if(r.y<=r.targetY || r.vy>=0){
          fxExplode(r.x,r.y,r.color,r.count);
          fxRockets.splice(i,1);
        }
      }

      for(let i=fxSparks.length-1;i>=0;i--){
        const s=fxSparks[i];
        s.vy+=0.055; s.x+=s.vx; s.y+=s.vy; s.life++;
        const alpha = Math.max(0,1-s.life/s.maxLife);
        fxCtx.globalAlpha=alpha;
        fxCtx.fillStyle=s.color;
        fxCtx.shadowColor=s.color; fxCtx.shadowBlur=9;
        fxCtx.beginPath(); fxCtx.arc(s.x,s.y,s.size,0,Math.PI*2); fxCtx.fill();
        fxCtx.shadowBlur=0; fxCtx.globalAlpha=1;
        if(s.life>=s.maxLife) fxSparks.splice(i,1);
      }

      if(fxRockets.length || fxSparks.length){
        requestAnimationFrame(fxLoop);
      } else {
        fxLoopRunning=false;
      }
    }
    function ensureFxLoop(){
      if(!fxLoopRunning){ fxLoopRunning=true; requestAnimationFrame(fxLoop); }
    }

    function launchFirework(xFrac,color,count){
      const x = window.innerWidth*xFrac;
      const startY = window.innerHeight+20;
      const targetY = window.innerHeight*(0.16+Math.random()*0.22);
      fxRockets.push({
        x:x, y:startY, vx:(Math.random()-0.5)*1.1, vy:-(9+Math.random()*2.4),
        color:color, targetY:targetY, count:count||36, trail:[]
      });
      ensureFxLoop();
    }

    function sparkleBurstAt(xFrac,yFrac,color,count){
      fxExplode(window.innerWidth*xFrac, window.innerHeight*yFrac, color, count||16);
      ensureFxLoop();
    }

    let ambientGoldTimer=null;
    function startAmbientGold(duration){
      clearTimeout(ambientGoldTimer);
      const end = performance.now()+duration;
      (function spawn(){
        if(disposed || performance.now()>end) return;
        sparkleBurstAt(0.12+Math.random()*0.76, 0.1+Math.random()*0.45, Math.random()<0.5?'#f4c542':'#ffe9a8', 3);
        ambientGoldTimer=setTimeout(spawn, 90+Math.random()*90);
      })();
    }

    function flashScreen(){
      screenFlashEl.classList.remove('flash');
      void screenFlashEl.offsetWidth;
      screenFlashEl.classList.add('flash');
    }

    function dimBackground(on, amt){
      if(on){
        dimOverlayEl.style.opacity = (amt!=null?amt:0.45);
        dimOverlayEl.classList.add('show');
      } else {
        dimOverlayEl.classList.remove('show');
        setTimeout(function(){ dimOverlayEl.style.opacity=''; }, 500);
      }
    }

    function playEnergyWave(){
      energyWaveEl.classList.remove('play');
      void energyWaveEl.offsetWidth;
      energyWaveEl.classList.add('play');
    }

    let idleFrozen=false;
    function freezeIdle(on){ idleFrozen=on; }

    function showCelebText(tier, amount){
      const title = tier==='big'?'BIG WIN':tier==='mega'?'MEGA WIN':'EPIC WIN';
      const stars = (tier==='mega'||tier==='epic') ? '<div class="wct-stars">✦ ✦ ✦</div>' : '';
      winCelebTextEl.innerHTML = stars+'<div class="wct-title '+tier+'">'+title+'</div><div class="wct-amount">+'+formatNum(amount)+'</div>';
      winCelebTextEl.classList.add('show');
    }
    function hideCelebText(){
      winCelebTextEl.classList.remove('show');
    }

    function spawnCoins(count, curveToward){
      const target = curveToward!==false ? el.balanceVal.getBoundingClientRect() : null;
      for(let i=0;i<count;i++){
        setTimeout(function(){
          const c=document.createElement('div');
          c.className='coin';
          const startLeft = 10+Math.random()*80;
          c.style.left = startLeft+'%';
          c.style.top = '-20px';
          root.appendChild(c);
          if(target){
            requestAnimationFrame(function(){
              const dx = (target.left+target.width/2) - (window.innerWidth*startLeft/100);
              const dy = (target.top+target.height/2) + 60;
              c.style.transition = 'transform 1.1s cubic-bezier(.4,.6,.3,1), opacity 1.1s ease';
              c.style.transform = 'translate('+dx+'px,'+dy+'px) rotate(420deg)';
              c.style.opacity='0.15';
            });
          }
          setTimeout(function(){ c.remove(); },1600);
        }, i*35);
      }
    }

    function screenShake(){
      el.gameRoot.classList.remove('screen-shake');
      void el.gameRoot.offsetWidth;
      el.gameRoot.classList.add('screen-shake');
      setTimeout(function(){ el.gameRoot.classList.remove('screen-shake'); }, 450);
    }

    function cameraZoom(){
      el.cabinet.classList.remove('zoom-pulse');
      void el.cabinet.offsetWidth;
      el.cabinet.classList.add('zoom-pulse');
    }

    const WIN_COUNTER_DELAY = { normal:0, big:1200, mega:1800, epic:1600 };

    const WinCelebrationEngine = {
      normal(amount){
        sparkleBurstAt(0.5, 0.32, '#f4c542', 10);
        el.cabinet.classList.add('lit-win');
        setTimeout(function(){ el.cabinet.classList.remove('lit-win'); }, 900);
      },
      big(amount){
        // 0ms: symbols already illuminated by caller
        el.cabinet.classList.add('lit-win');
        setTimeout(flashScreen, 200);
        setTimeout(cameraZoom, 200);
        setTimeout(function(){ startAmbientGold(1500); }, 400);
        setTimeout(function(){ showCelebText('big', amount); }, 600);
        setTimeout(function(){ spawnCoins(14); }, 800);
        setTimeout(function(){ launchFirework(0.5, '#f4c542'); }, 1000);
        setTimeout(function(){
          el.cabinet.classList.remove('lit-win');
          hideCelebText();
        }, 2700);
      },
      mega(amount){
        el.cabinet.classList.add('lit-win');
        dimBackground(true, 0.4);
        setTimeout(flashScreen, 300);
        setTimeout(function(){ showCelebText('mega', amount); }, 600);
        setTimeout(function(){ launchFirework(0.28,'#ff3fd8'); launchFirework(0.72,'#3ff0ff'); }, 750);
        setTimeout(function(){ spawnCoins(28); }, 900);
        setTimeout(screenShake, 1000);
        setTimeout(cameraZoom, 1000);
        setTimeout(function(){ startAmbientGold(1800); }, 1100);
        setTimeout(function(){ launchFirework(0.5,'#f4c542'); }, 1500);
        setTimeout(function(){ launchFirework(0.18,'#f4c542'); launchFirework(0.82,'#ff3fd8'); launchFirework(0.5,'#3ff0ff'); }, 2200);
        setTimeout(function(){
          dimBackground(false); el.cabinet.classList.remove('lit-win'); hideCelebText();
        }, 3600);
      },
      epic(amount){
        el.cabinet.classList.add('lit-win');
        freezeIdle(true);
        dimBackground(true, 0.6);
        setTimeout(flashScreen, 200);
        setTimeout(playEnergyWave, 220);
        setTimeout(function(){ launchFirework(0.1,'#3ff0ff'); launchFirework(0.9,'#ff3fd8'); }, 350);
        setTimeout(function(){ launchFirework(0.18,'#f4c542'); launchFirework(0.82,'#f4c542'); }, 650);
        setTimeout(function(){ showCelebText('epic', amount); }, 750);
        setTimeout(function(){ startAmbientGold(2400); sparkleBurstAt(0.5,0.38,'#ffffff',44); }, 900);
        setTimeout(screenShake, 1050);
        setTimeout(cameraZoom, 1050);
        setTimeout(function(){ spawnCoins(46); }, 1200);
        setTimeout(function(){ launchFirework(0.5,'#ffe9a8'); }, 1900);
        setTimeout(function(){
          launchFirework(0.32,'#3ff0ff'); launchFirework(0.68,'#ff3fd8'); launchFirework(0.5,'#f4c542');
        }, 2700);
        setTimeout(function(){
          dimBackground(false); freezeIdle(false); el.cabinet.classList.remove('lit-win'); hideCelebText();
        }, 4400);
      },
      jackpot(){
        dimBackground(true, 0.55);
        playEnergyWave();
        launchFirework(0.15,'#f4c542'); launchFirework(0.85,'#f4c542');
        setTimeout(function(){ launchFirework(0.3,'#ff3fd8'); launchFirework(0.7,'#3ff0ff'); }, 400);
        setTimeout(function(){ launchFirework(0.5,'#ffe9a8'); }, 900);
        setTimeout(function(){ launchFirework(0.2,'#f4c542'); launchFirework(0.8,'#f4c542'); launchFirework(0.5,'#3ff0ff'); }, 1500);
        setTimeout(function(){ dimBackground(false); }, 3600);
      }
    };

    function runBigWinSequence(amount, tier){
      AudioManager.winBig(tier);
      WinCelebrationEngine[tier](amount);
      announce((tier==='epic'?'EPIC WIN':tier==='mega'?'MEGA WIN':'BIG WIN')+' '+formatNum(amount));
    }

    let lastServerSpin = null;
    function maybeJackpot(lineWins){
      if(serverRef.current) return !!(lastServerSpin && lastServerSpin.jackpot);
      const bigLine = lineWins.find(function(lw){ return lw.count===5 && SYMBOLS[lw.symbol].tier==='high'; });
      if(bigLine && Math.random()<0.08){
        return true;
      }
      return false;
    }

    function triggerJackpot(baseAmount){
      AudioManager.duckBgm(0.05, 4200);
      AudioManager.jackpot();
      if(navigator.vibrate) navigator.vibrate([40,60,40,60,80]);
      const jackpotAmount = Math.round(baseAmount*10 + state.bet*100);
      el.jackpotAmt.textContent = '+'+formatNum(jackpotAmount);
      WinCelebrationEngine.jackpot();
      el.jackpotOverlay.classList.add('show');
      spawnCoins(50, false);
      screenShake();
      if(onBigWinRef.current) onBigWinRef.current(jackpotAmount/Math.max(1,state.bet), 'jackpot');
      setTimeout(function(){
        el.jackpotOverlay.classList.remove('show');
        state.balance += jackpotAmount;
        if(hasExternalBalance) onBalanceDeltaRef.current(jackpotAmount);
        updateBalanceDisplay();
        saveState();
      }, 3400);
      return jackpotAmount;
    }

    /* =========================================================
       FREE SPINS / BONUS
    ========================================================= */
    function triggerBonus(scatterCount){
      AudioManager.bonusTrigger();
      AudioManager.duckBgm(0.08, 3000);
      let fsAwarded = 8;
      if(scatterCount===4) fsAwarded=12;
      if(scatterCount>=5) fsAwarded=20;
      byId('bonusSubtitle').textContent = scatterCount+' SCATTERS';
      byId('bonusFsCount').textContent = fsAwarded+' FREE SPINS';
      el.bonusOverlay.classList.add('show');
      setTimeout(function(){
        el.bonusOverlay.classList.remove('show');
        startFreeSpins(fsAwarded);
      }, 2600);
    }

    function startFreeSpins(count){
      state.isBonus=true;
      state.freeSpinsLeft=count;
      state.freeSpinsTotalWin=0;
      root.classList.add('bonus-mode');
      el.fsBanner.classList.add('show');
      el.fsLeft.textContent=state.freeSpinsLeft;
      AudioManager.setBonusMode(true);
      announce('Free spins started: '+count);
      setTimeout(function(){ doSpin(true); }, 500);
    }

    function endFreeSpins(){
      state.isBonus=false;
      root.classList.remove('bonus-mode');
      el.fsBanner.classList.remove('show');
      AudioManager.setBonusMode(false);
      el.winAmt.textContent = formatNum(state.freeSpinsTotalWin);
      el.winDisplay.classList.add('show');
      announce('Free spins complete. Total win '+formatNum(state.freeSpinsTotalWin));
      setTimeout(function(){ hideWinDisplay(); updateSpinAvailability(); }, 2200);
    }

    /* =========================================================
       MAIN SPIN FLOW
    ========================================================= */
    function updateBalanceDisplay(){
      el.balanceVal.textContent = formatNum(state.balance);
    }
    function updateBetDisplay(){
      el.betVal.textContent = formatNum(state.bet);
    }

    function updateSpinAvailability(){
      const canAfford = state.balance>=state.bet;
      el.spinBtn.disabled = state.isSpinning || (!state.isBonus && !canAfford);
      el.betMinus.disabled = state.isSpinning || state.isBonus;
      el.betPlus.disabled = state.isSpinning || state.isBonus;
    }

    function doSpin(isFreeSpin){
      if(disposed) return;
      if(state.isSpinning) return;
      if(serverRef.current) return doServerSpin(isFreeSpin);
      if(!isFreeSpin){
        if(state.balance < state.bet) { announce('Insufficient balance'); return; }
        state.balance -= state.bet;
        if(hasExternalBalance) onBalanceDeltaRef.current(-state.bet);
        updateBalanceDisplay();
        saveState();
      } else {
        state.freeSpinsLeft--;
        el.fsLeft.textContent = state.freeSpinsLeft;
      }

      state.isSpinning=true;
      el.spinBtn.classList.add('spinning');
      el.spinBtn.classList.remove('pulse');
      updateSpinAvailability();
      clearHighlights();
      hideWinDisplay();

      const won = Math.random() * 100 < (typeof winRateProp === 'number' ? winRateProp : 100);
      const result0 = generateResultForOutcome(won, state.bet);
      currentGrid = result0.grid;

      el.cabinet.classList.remove('lit-win');
      el.cabinet.classList.add('lit-spin');

      animateReelsToResult(currentGrid, result0.stopIdx, function(){
        el.cabinet.classList.remove('lit-spin');
        const betTotal = state.bet;
        const result = calculateWins(currentGrid, betTotal);
        finishSpin(result, betTotal, isFreeSpin);
      });
    }

    // Backend version of doSpin: the server takes the bet, picks the reel stops,
    // pays the win (and keeps the free spins); this only animates its answer.
    function doServerSpin(isFreeSpin){
      if(!isFreeSpin){
        if(state.balance < state.bet) { announce('Insufficient balance'); return; }
        state.balance -= state.bet;
        updateBalanceDisplay();
      } else {
        state.freeSpinsLeft--;
        el.fsLeft.textContent = state.freeSpinsLeft;
      }
      state.isSpinning=true;
      el.spinBtn.classList.add('spinning');
      el.spinBtn.classList.remove('pulse');
      updateSpinAvailability();
      clearHighlights();
      hideWinDisplay();
      serverRef.current.call('/api/games/neonfortune/spin', { bet: state.bet }).then(function(r){
        if(disposed) return;
        lastServerSpin = r;
        if(r.isFree && !isFreeSpin){ state.balance += state.bet; updateBalanceDisplay(); } // the server used a waiting free spin
        currentGrid = r.grid;
        el.cabinet.classList.remove('lit-win');
        el.cabinet.classList.add('lit-spin');
        animateReelsToResult(currentGrid, r.stopIdx, function(){
          el.cabinet.classList.remove('lit-spin');
          finishSpin(calculateWins(currentGrid, r.bet), r.bet, isFreeSpin);
        });
      }).catch(function(e){
        if(disposed) return;
        if(!isFreeSpin){ state.balance += state.bet; updateBalanceDisplay(); }
        state.isSpinning=false;
        el.spinBtn.classList.remove('spinning');
        state.autoSpinsLeft=0;
        announce(e && e.message === 'insufficient_balance' ? 'Insufficient balance' : 'Connection problem - try again');
        if(isFreeSpin){ state.freeSpinsLeft=0; endFreeSpins(); }
        updateSpinAvailability();
      });
    }

    function finishSpin(result, betTotal, isFreeSpin){
      const lineWins = result.lineWins;
      const scatterCount = result.scatterCount;
      const scatterPositions = result.scatterPositions;
      const totalWin = result.totalWin;

      if(lineWins.length){
        drawPaylines(lineWins);
      }
      if(totalWin>0 || scatterCount>=3){
        highlightWins(lineWins, scatterPositions);
      }

      if(isFreeSpin) state.freeSpinsTotalWin += totalWin;
      let jackpotHit=false;
      let tier='normal';
      const CELEB_DURATION = { normal:900, big:2700, mega:3600, epic:4400 };

      if(totalWin>0){
        tier = winTier(totalWin, betTotal);
        if(tier==='normal'){
          AudioManager.winSmall();
          showWin(totalWin,'normal');
          WinCelebrationEngine.normal(totalWin);
        } else {
          if(maybeJackpot(lineWins)){
            jackpotHit=true;
          } else {
            runBigWinSequence(totalWin, tier);
            setTimeout(function(){ showWin(totalWin, tier); }, WIN_COUNTER_DELAY[tier]);
            if(onBigWinRef.current) onBigWinRef.current(totalWin/betTotal, tier);
          }
        }
        if(!jackpotHit){
          state.balance += totalWin;
          if(serverRef.current) state.balance = Math.round(state.balance*100)/100;
          if(hasExternalBalance) onBalanceDeltaRef.current(totalWin);
          updateBalanceDisplay();
          saveState();
        }
      }

      if(onRoundRef.current) onRoundRef.current(isFreeSpin ? 0 : betTotal, totalWin);

      const afterWinDelay = totalWin>0 ? CELEB_DURATION[tier] : 150;

      setTimeout(function(){
        if(jackpotHit){
          triggerJackpot(totalWin);
          setTimeout(continueFlow, 3600);
        } else {
          continueFlow();
        }
      }, afterWinDelay);

      function continueFlow(){
        if(!isFreeSpin && scatterCount>=3){
          clearHighlights();
          hideWinDisplay();
          triggerBonus(scatterCount);
          state.isSpinning=false;
          el.spinBtn.classList.remove('spinning');
          return;
        }

        if(isFreeSpin && scatterCount>=3){
          state.freeSpinsLeft += (scatterCount===3?5:scatterCount===4?8:12);
          el.fsLeft.textContent = state.freeSpinsLeft;
          announce('Free spins retriggered');
        }

        state.isSpinning=false;
        el.spinBtn.classList.remove('spinning');

        if(isFreeSpin){
          if(state.freeSpinsLeft>0){
            setTimeout(function(){ hideWinDisplay(); doSpin(true); }, 900);
          } else {
            setTimeout(endFreeSpins, 600);
          }
          return;
        }

        updateSpinAvailability();

        if(state.autoSpinsLeft>0){
          state.autoSpinsLeft--;
          if(state.autoSpinsLeft===0){
            el.autoBtn.classList.remove('active');
            el.autoBtn.textContent='AUTOSPIN';
          } else {
            el.autoBtn.textContent='STOP ('+state.autoSpinsLeft+')';
          }
          if(state.balance>=state.bet && state.autoSpinsLeft>=0 && (state.autoSpinsLeft>0 || el.autoBtn.textContent==='AUTOSPIN')){
            // continue only while spins remain and can afford
          }
          if(state.autoSpinsLeft>0 && state.balance>=state.bet){
            setTimeout(function(){ hideWinDisplay(); doSpin(false); }, 1100);
          } else if(state.autoSpinsLeft>0 && state.balance<state.bet){
            state.autoSpinsLeft=0;
            el.autoBtn.classList.remove('active');
            el.autoBtn.textContent='AUTOSPIN';
          }
        }
      }
    }

    function announce(msg){
      el.liveRegion.textContent = msg;
    }

    /* =========================================================
       PARTICLES
    ========================================================= */
    function spawnDust(){
      const d=document.createElement('div');
      d.className='dust';
      const size=2+Math.random()*4;
      d.style.width=size+'px'; d.style.height=size+'px';
      d.style.left=Math.random()*100+'%';
      d.style.animationDuration=(8+Math.random()*10)+'s';
      d.style.animationDelay=(Math.random()*2)+'s';
      el.particles.appendChild(d);
      setTimeout(function(){ d.remove(); }, 20000);
    }
    for(let i=0;i<18;i++) spawnDust();
    const dustIntervalId = setInterval(spawnDust, 1400);

    /* =========================================================
       EVENT BINDINGS
    ========================================================= */
    function initAudioOnce(){
      AudioManager.init();
      if(mutedRef.current){
        AudioManager.toggleMute();
        el.soundBtn.textContent='🔇';
        el.soundBtn.classList.add('off');
      }
      document.removeEventListener('pointerdown', initAudioOnce);
    }
    document.addEventListener('pointerdown', initAudioOnce, {once:true});

    el.spinBtn.addEventListener('click', function(){
      if(state.isSpinning || state.isBonus) return;
      AudioManager.uiClick();
      doSpin(false);
    });

    el.betMinus.addEventListener('click', function(){
      if(state.isSpinning||state.isBonus) return;
      const steps=GAME_CONFIG.betSteps;
      const idx=steps.indexOf(state.bet);
      const newIdx = idx>0?idx-1:0;
      state.bet=steps[newIdx];
      AudioManager.betTick();
      updateBetDisplay(); updateSpinAvailability(); saveState();
    });
    el.betPlus.addEventListener('click', function(){
      if(state.isSpinning||state.isBonus) return;
      const steps=GAME_CONFIG.betSteps;
      const idx=steps.indexOf(state.bet);
      const newIdx = idx<steps.length-1?idx+1:steps.length-1;
      state.bet=steps[newIdx];
      AudioManager.betTick();
      updateBetDisplay(); updateSpinAvailability(); saveState();
    });

    el.soundBtn.addEventListener('click', function(){
      AudioManager.init();
      const muted=AudioManager.toggleMute();
      el.soundBtn.textContent = muted?'🔇':'🔊';
      el.soundBtn.classList.toggle('off', muted);
    });

    el.autoBtn.addEventListener('click', function(){
      if(state.autoSpinsLeft>0){
        state.autoSpinsLeft=0;
        el.autoBtn.classList.remove('active');
        el.autoBtn.textContent='AUTOSPIN';
        return;
      }
      el.autoPanel.classList.add('show');
    });
    el.autoCancel.addEventListener('click', function(){ el.autoPanel.classList.remove('show'); });
    el.autoGrid.querySelectorAll('button').forEach(function(btn){
      btn.addEventListener('click', function(){
        const n=parseInt(btn.dataset.n,10);
        state.autoSpinsLeft=n;
        el.autoBtn.classList.add('active');
        el.autoBtn.textContent='STOP ('+n+')';
        el.autoPanel.classList.remove('show');
        if(!state.isSpinning && !state.isBonus) doSpin(false);
      });
    });

    el.infoBtn.addEventListener('click', function(){ el.infoPanel.classList.add('show'); });
    el.infoClose.addEventListener('click', function(){ el.infoPanel.classList.remove('show'); });

    el.settingsBtn.addEventListener('click', function(){ AudioManager.init(); el.settingsPanel.classList.add('show'); });
    el.settingsClose.addEventListener('click', function(){ el.settingsPanel.classList.remove('show'); });
    el.musicSlider.addEventListener('input', function(){ AudioManager.setMusicVolume(el.musicSlider.value/100); });
    el.sfxSlider.addEventListener('input', function(){ AudioManager.setSfxVolume(el.sfxSlider.value/100); });
    el.musicMuteBtn.addEventListener('click', function(){
      const m = AudioManager.toggleMusicMute();
      el.musicMuteBtn.textContent = m?'🔇':'🔊';
    });
    el.sfxMuteBtn.addEventListener('click', function(){
      const m = AudioManager.toggleSfxMute();
      el.sfxMuteBtn.textContent = m?'🔇':'🔊';
    });

    el.paytableBtn.addEventListener('click', function(){ el.paytablePanel.classList.add('show'); });
    el.paytableClose.addEventListener('click', function(){ el.paytablePanel.classList.remove('show'); });

    function buildPaytable(){
      const order = ['WILD','SCATTER','QUEEN','TIGER','PHOENIX','DRAGON','CROWN','GEM','STAR','MOON','A','K','Q','J','T'];
      const frag = document.createDocumentFragment();
      order.forEach(function(key){
        const def = SYMBOLS[key];
        if(!def || !def.pay || Object.keys(def.pay).length===0) return;
        const row = document.createElement('div');
        row.className='paytable-row';
        const g = document.createElement('div');
        g.className='pt-glyph tier-'+def.tier;
        g.style.background = def.tier==='wild' ? 'radial-gradient(circle at 35% 30%, #7b2ff7, #1a0b2e)'
          : def.tier==='scatter' ? 'radial-gradient(circle at 35% 30%, #123a3a, #051515)'
          : def.tier==='high' ? 'radial-gradient(circle at 35% 30%, #5a3a10, #201205)'
          : def.tier==='mid' ? 'radial-gradient(circle at 35% 30%, #3a2a55, #17102a)'
          : 'radial-gradient(circle at 35% 30%, #444, #1a1a22)';
        g.textContent = def.glyph.length>2 ? def.glyph.slice(0,1) : def.glyph;
        const info = document.createElement('div');
        info.className='pt-pay';
        const payStr = Object.keys(def.pay).sort().map(function(c){ return '<b>'+c+'x</b>&nbsp;='+'&nbsp;'+def.pay[c]+'&times; bet'; }).join(' &nbsp;|&nbsp; ');
        info.innerHTML = '<div style="color:#fff;font-weight:700;">'+key+(key==='SCATTER'?' (any position)':'')+'</div>'+payStr;
        row.appendChild(g); row.appendChild(info);
        frag.appendChild(row);
      });
      el.paytableList.innerHTML='';
      el.paytableList.appendChild(frag);
    }
    buildPaytable();

    function handleKeydown(e){
      if(e.code==='Space'){ e.preventDefault(); if(!el.spinBtn.disabled) el.spinBtn.click(); }
      if(e.code==='ArrowUp'){ e.preventDefault(); el.betPlus.click(); }
      if(e.code==='ArrowDown'){ e.preventDefault(); el.betMinus.click(); }
      if(e.code==='KeyM'){ el.soundBtn.click(); }
      if(e.code==='Escape'){ el.autoPanel.classList.remove('show'); el.infoPanel.classList.remove('show'); }
    }
    document.addEventListener('keydown', handleKeydown);

    /* =========================================================
       INIT
    ========================================================= */
    buildReels();
    reelStripEls.forEach(function(rs){ rs.visibleStart = 0; });
    updateBalanceDisplay();
    updateBetDisplay();
    updateSpinAvailability();

    if(serverRef.current){
      serverRef.current.call('/api/games/neonfortune/state', {}).then(function(r){
        if(disposed || !r || !(r.freeSpinsLeft > 0) || state.isSpinning || state.isBonus) return;
        state.bet = r.bet || state.bet;
        startFreeSpins(r.freeSpinsLeft);
      }).catch(function(){});
    }

    const idleIntervalId = setInterval(function(){
      if(disposed || state.isSpinning || idleFrozen) return;
      const r=Math.floor(Math.random()*GAME_CONFIG.reels);
      const row=Math.floor(Math.random()*GAME_CONFIG.rows);
      const cell=getSymbolCell(r,row);
      if(cell && !cell.classList.contains('win')){
        cell.style.transition='transform .8s ease';
        cell.style.transform='scale(1.03)';
        setTimeout(function(){ if(cell) cell.style.transform='scale(1)'; }, 800);
      }
    }, 2600);


    return function cleanup(){
      disposed = true;
      clearInterval(dustIntervalId);
      clearInterval(idleIntervalId);
      clearTimeout(ambientGoldTimer);
      window.removeEventListener('resize', resizeFxCanvas);
      document.removeEventListener('keydown', handleKeydown);
      document.removeEventListener('pointerdown', initAudioOnce);
      AudioManager.dispose();
    };

  }, []);

  return (
    <>
      <style>{`
      .nf-game{
        --gold:#f4c542;
        --gold-light:#ffe9a8;
        --purple:#7b2ff7;
        --purple-dark:#1a0b2e;
        --cyan:#3ff0ff;
        --pink:#ff3fd8;
        --background:#0a0512;
        --panel:#160a26;
        --glow: 0 0 20px rgba(63,240,255,0.6);
        --amber:#ffb347;
      }.nf-game *{box-sizing:border-box; -webkit-tap-highlight-color:transparent; user-select:none;}.nf-game{min-height:100%;}.nf-game{
        margin:0;
        background:var(--background);
        color:#fff;
        font-family:'Segoe UI',system-ui,-apple-system,Arial,sans-serif;
        overflow-x:hidden;
        min-height:100vh;
        display:flex;
        align-items:center;
        justify-content:center;
        position:relative;
      }.nf-game /* ================= BACKGROUND LAYERS ================= */
      .bg-layer{position:fixed; inset:0; z-index:0; pointer-events:none;}.nf-game .bg-base{
        background:
          radial-gradient(ellipse at 50% -10%, rgba(123,47,247,0.35), transparent 60%),
          radial-gradient(ellipse at 10% 110%, rgba(63,240,255,0.15), transparent 55%),
          radial-gradient(ellipse at 90% 100%, rgba(255,63,216,0.12), transparent 55%),
          linear-gradient(180deg, #0a0512 0%, #120820 45%, #0a0512 100%);
      }.nf-game .bg-rays{
        background: conic-gradient(from 200deg at 50% 0%, transparent 0deg, rgba(244,197,66,0.05) 8deg, transparent 20deg, transparent 40deg, rgba(63,240,255,0.05) 50deg, transparent 65deg, transparent 360deg);
        animation: rayspin 60s linear infinite;
        opacity:0.7;
      }@keyframes rayspin{ from{transform:rotate(0deg);} to{transform:rotate(360deg);} }.nf-game .bg-fog{
        background: radial-gradient(ellipse 60% 30% at 50% 100%, rgba(123,47,247,0.25), transparent 70%);
        animation: fogdrift 14s ease-in-out infinite alternate;
      }@keyframes fogdrift{ from{ transform:translateX(-3%) scaleX(1); } to{ transform:translateX(3%) scaleX(1.05);} }.nf-game .bg-particles{ overflow:hidden; }.nf-game .dust{
        position:absolute; border-radius:50%;
        background:radial-gradient(circle, rgba(244,197,66,0.9), transparent 70%);
        animation: floatup linear infinite;
        opacity:0.5;
      }@keyframes floatup{
        0%{ transform:translateY(10vh) translateX(0); opacity:0;}
        10%{opacity:0.6;}
        90%{opacity:0.3;}
        100%{ transform:translateY(-110vh) translateX(20px); opacity:0;}
      }.nf-game /* ================= GAME ROOT ================= */
      .game-root{
        position:relative; z-index:1;
        width:100%; max-width:560px;
        padding:14px 10px 24px;
        display:flex; flex-direction:column; align-items:center;
        gap:8px;
      }.nf-game .logo-wrap{ text-align:center; margin-bottom:2px; }.nf-game .logo-title{
        font-family:Georgia, 'Times New Roman', serif;
        font-weight:900;
        font-size:clamp(32px,10vw,52px);
        letter-spacing:6px;
        background:linear-gradient(100deg, #8a6218 0%, #fff7d6 15%, var(--gold) 30%, #fff9e6 45%, var(--gold) 60%, #fff7d6 75%, #8a6218 90%, var(--gold) 100%);
        background-size:250% 100%;
        -webkit-background-clip:text; background-clip:text; color:transparent;
        filter:drop-shadow(0 0 16px rgba(244,197,66,0.75)) drop-shadow(0 3px 0 rgba(0,0,0,0.65));
        margin:0;
        animation: titleglow 3s ease-in-out infinite, goldshimmer 5s linear infinite;
      }@keyframes titleglow{
        0%,100%{ filter:drop-shadow(0 0 14px rgba(244,197,66,0.6)) drop-shadow(0 3px 0 rgba(0,0,0,0.65)); }
        50%{ filter:drop-shadow(0 0 28px rgba(244,197,66,1)) drop-shadow(0 3px 0 rgba(0,0,0,0.65)); }
      }@keyframes goldshimmer{
        0%{ background-position:0% 50%; }
        100%{ background-position:200% 50%; }
      }.nf-game .logo-sub{
        font-size:11px; letter-spacing:6px; color:var(--cyan);
        text-shadow:0 0 10px rgba(63,240,255,0.8);
        margin-top:-2px;
      }.nf-game /* ================= WIN DISPLAY ================= */
      .win-display{
        min-height:34px;
        display:flex; align-items:center; justify-content:center; gap:8px;
        font-weight:800; letter-spacing:2px;
        color:var(--gold-light);
        text-shadow:0 0 14px rgba(244,197,66,0.8);
        font-size:15px;
        opacity:0; transform:translateY(6px);
        transition:opacity .25s ease, transform .25s ease;
      }.nf-game .win-display.show{ opacity:1; transform:translateY(0); }.nf-game .win-display .amt{ font-size:20px; color:#fff; text-shadow:0 0 12px var(--gold); }.nf-game /* ================= CABINET ================= */
      .cabinet{
        position:relative;
        width:100%;
        border-radius:22px;
        padding:14px;
        background:
          linear-gradient(160deg, #2a2438 0%, #14101f 40%, #1c1428 100%);
        box-shadow:
          0 0 0 2px rgba(244,197,66,0.35),
          0 0 40px rgba(123,47,247,0.35),
          inset 0 2px 6px rgba(255,255,255,0.08),
          inset 0 -8px 20px rgba(0,0,0,0.6),
          0 20px 40px rgba(0,0,0,0.6);
      }.nf-game .cabinet::before{
        content:''; position:absolute; inset:6px; border-radius:16px;
        border:1px solid rgba(244,197,66,0.25);
        box-shadow:0 0 18px rgba(63,240,255,0.12) inset;
        pointer-events:none;
      }.nf-game .neon-strip{
        position:absolute; left:14px; right:14px; height:3px; border-radius:2px;
        background:linear-gradient(90deg, transparent, var(--cyan), var(--pink), var(--cyan), transparent);
        filter:blur(0.5px);
        box-shadow:0 0 10px var(--cyan), 0 0 20px var(--pink);
        animation:neonpulse 2.4s ease-in-out infinite;
      }.nf-game .neon-strip.top{ top:6px; }.nf-game .neon-strip.bottom{ bottom:6px; }@keyframes neonpulse{ 0%,100%{opacity:0.65;} 50%{opacity:1;} }.nf-game /* ================= REEL WINDOW ================= */
      .reel-window{
        position:relative;
        border-radius:14px;
        padding:8px;
        background:
          linear-gradient(180deg, #05030a 0%, #0d0716 100%);
        box-shadow:
          inset 0 10px 22px rgba(0,0,0,0.85),
          inset 0 -10px 22px rgba(0,0,0,0.85),
          inset 0 0 0 1px rgba(244,197,66,0.2);
      }.nf-game .reels{
        position:relative;
        display:grid;
        grid-template-columns:repeat(5,1fr);
        gap:4px;
        border-radius:8px;
        overflow:hidden;
      }.nf-game .reel{
        position:relative;
        height:calc(3 * var(--sym-h));
        overflow:hidden;
        background:linear-gradient(180deg, rgba(255,255,255,0.03), rgba(0,0,0,0.25));
        border-radius:6px;
      }.nf-game .reel-strip{
        position:absolute; left:0; right:0; top:0;
        will-change:transform;
      }.nf-game .reel.spinning .reel-strip{ filter:blur(3px) brightness(1.3); }.nf-game .symbol{
        height:var(--sym-h);
        display:flex; align-items:center; justify-content:center;
        font-size:calc(var(--sym-h) * 0.52);
        position:relative;
      }.nf-game .symbol .glyph{
        display:flex; align-items:center; justify-content:center;
        width:82%; height:82%; border-radius:12px;
        transition:transform .18s ease;
      }.nf-game .symbol.win .glyph{ animation:symbolwin .7s ease-in-out infinite; }@keyframes symbolwin{
        0%,100%{ transform:scale(1); filter:brightness(1.2) drop-shadow(0 0 10px var(--gold)); }
        50%{ transform:scale(1.12); filter:brightness(1.7) drop-shadow(0 0 22px var(--gold)); }
      }.nf-game .symbol.dim .glyph{ opacity:0.28; filter:grayscale(0.6) brightness(0.6); }.nf-game .symbol.settle .glyph{ animation:settlebounce .38s cubic-bezier(.34,1.7,.64,1); }@keyframes settlebounce{
        0%{ transform:scale(1);} 45%{ transform:scale(1.08);} 75%{transform:scale(0.97);} 100%{transform:scale(1);}
      }.nf-game .tier-low .glyph{ background:radial-gradient(circle at 35% 30%, #444 0%, #1a1a22 70%); box-shadow:inset 0 0 0 1px rgba(255,255,255,0.15), 0 2px 6px rgba(0,0,0,0.5); }.nf-game .tier-mid .glyph{ background:radial-gradient(circle at 35% 30%, #3a2a55 0%, #17102a 70%); box-shadow:inset 0 0 0 1px rgba(63,240,255,0.35), 0 0 14px rgba(63,240,255,0.35); }.nf-game .tier-high .glyph{ background:radial-gradient(circle at 35% 30%, #5a3a10 0%, #201205 70%); box-shadow:inset 0 0 0 1px rgba(244,197,66,0.55), 0 0 18px rgba(244,197,66,0.55); }.nf-game .tier-wild .glyph{ background:radial-gradient(circle at 35% 30%, #7b2ff7 0%, #1a0b2e 75%); box-shadow:inset 0 0 0 2px var(--gold), 0 0 24px var(--pink); animation:wildspin 3s linear infinite; }@keyframes wildspin{ 0%,100%{ box-shadow:inset 0 0 0 2px var(--gold), 0 0 20px var(--pink);} 50%{ box-shadow:inset 0 0 0 2px var(--gold-light), 0 0 32px var(--cyan);} }.nf-game .tier-scatter .glyph{ background:radial-gradient(circle at 35% 30%, #123a3a 0%, #051515 75%); box-shadow:inset 0 0 0 1px var(--cyan), 0 0 20px var(--cyan); }.nf-game .tier-bonus .glyph{ background:radial-gradient(circle at 35% 30%, #5a1030 0%, #1c0510 75%); box-shadow:inset 0 0 0 1px var(--pink), 0 0 20px var(--pink); }.nf-game .reel-shade-top, .nf-game .reel-shade-bottom{
        position:absolute; left:0; right:0; height:26%; pointer-events:none; z-index:3;
      }.nf-game .reel-shade-top{ top:0; background:linear-gradient(180deg, rgba(0,0,0,0.9), transparent); }.nf-game .reel-shade-bottom{ bottom:0; background:linear-gradient(0deg, rgba(0,0,0,0.9), transparent); }.nf-game .reel-reflection{
        position:absolute; top:-40%; left:-60%; width:60%; height:220%;
        background:linear-gradient(75deg, transparent 40%, rgba(255,255,255,0.10) 50%, transparent 60%);
        transform:rotate(8deg);
        animation:sweep 7s linear infinite;
        pointer-events:none; z-index:4;
      }@keyframes sweep{ 0%{ left:-60%; } 100%{ left:140%; } }.nf-game .paylines-svg{ position:absolute; inset:8px; pointer-events:none; z-index:5; }.nf-game .payline-path{
        fill:none; stroke-width:3; stroke-linecap:round;
        filter:drop-shadow(0 0 6px currentColor);
        stroke-dasharray:1000; stroke-dashoffset:1000;
        animation:drawline .5s ease forwards;
      }@keyframes drawline{ to{ stroke-dashoffset:0; } }.nf-game /* anticipation */
      .reel.anticipate{ animation:antiflash 0.35s ease-in-out infinite; }@keyframes antiflash{ 0%,100%{ box-shadow:inset 0 0 0 0 transparent;} 50%{ box-shadow:inset 0 0 34px 6px rgba(244,197,66,0.7);} }.nf-game .reel.anticipate .reel-strip{ filter:brightness(1.15); }.nf-game /* ================= DYNAMIC CABINET LIGHTING ================= */
      .cabinet{ transition:box-shadow .4s ease; }.nf-game .cabinet.lit-spin{
        box-shadow:
          0 0 0 2px rgba(63,240,255,0.55),
          0 0 60px rgba(63,240,255,0.45),
          inset 0 2px 6px rgba(255,255,255,0.1),
          inset 0 -8px 20px rgba(0,0,0,0.6),
          0 20px 40px rgba(0,0,0,0.6);
      }.nf-game .cabinet.lit-win{
        box-shadow:
          0 0 0 2px rgba(244,197,66,0.7),
          0 0 70px rgba(244,197,66,0.6),
          inset 0 2px 6px rgba(255,255,255,0.12),
          inset 0 -8px 20px rgba(0,0,0,0.6),
          0 20px 40px rgba(0,0,0,0.6);
      }.nf-game .neon-strip.lit{ animation-duration:0.7s; }.nf-game /* ================= SETTINGS / PAYTABLE ================= */
      .slider-row{ display:flex; align-items:center; gap:8px; margin-bottom:14px; }.nf-game .slider-row label{ font-size:10px; letter-spacing:1px; color:var(--cyan); width:56px; text-align:left; }.nf-game .slider-row input[type="range"]{
        flex:1; -webkit-appearance:none; appearance:none; height:4px; border-radius:2px;
        background:linear-gradient(90deg,var(--purple),var(--gold)); outline:none;
      }.nf-game .slider-row input[type="range"]::-webkit-slider-thumb{
        -webkit-appearance:none; width:16px; height:16px; border-radius:50%;
        background:var(--gold-light); box-shadow:0 0 8px var(--gold); cursor:pointer;
      }.nf-game .slider-row .swatch-toggle{
        width:28px; height:28px; border-radius:50%; border:1px solid rgba(244,197,66,0.4);
        background:rgba(255,255,255,0.05); color:var(--gold-light); font-size:12px; cursor:pointer;
        flex-shrink:0;
      }.nf-game .paytable-list{ max-height:340px; overflow-y:auto; }.nf-game .paytable-row{
        display:flex; align-items:center; gap:10px; padding:6px 4px; border-bottom:1px solid rgba(255,255,255,0.06);
      }.nf-game .paytable-row .pt-glyph{
        width:34px; height:34px; border-radius:8px; display:flex; align-items:center; justify-content:center;
        font-size:18px; flex-shrink:0;
      }.nf-game .paytable-row .pt-pay{ font-size:11px; color:#ccc; line-height:1.5; }.nf-game .paytable-row .pt-pay b{ color:var(--gold-light); }.nf-game /* ================= CONTROLS ================= */
      .controls{
        width:100%;
        display:flex; align-items:center; justify-content:space-between; gap:10px;
        margin-top:10px;
      }.nf-game .stat-box{
        background:linear-gradient(180deg, #1c1330, #100a1c);
        border:1px solid rgba(244,197,66,0.3);
        border-radius:12px;
        padding:6px 14px;
        min-width:88px;
        text-align:center;
        box-shadow:inset 0 2px 6px rgba(0,0,0,0.6), 0 0 10px rgba(123,47,247,0.25);
      }.nf-game .stat-label{ font-size:9px; letter-spacing:2px; color:var(--cyan); opacity:0.8; }.nf-game .stat-value{ font-size:17px; font-weight:800; color:var(--gold-light); text-shadow:0 0 10px rgba(244,197,66,0.6); font-variant-numeric:tabular-nums; }.nf-game .bet-control{ display:flex; align-items:center; gap:6px; }.nf-game .bet-btn{
        width:30px; height:30px; border-radius:50%; border:none;
        background:linear-gradient(180deg, #3a2f55, #1c1430);
        color:var(--gold-light); font-size:16px; font-weight:800;
        box-shadow:0 2px 6px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.15);
        cursor:pointer;
      }.nf-game .bet-btn:active{ transform:scale(0.9); }.nf-game .bet-btn:disabled{ opacity:0.4; }.nf-game .spin-btn{
        width:74px; height:74px; border-radius:50%; border:none; position:relative;
        background:radial-gradient(circle at 35% 30%, #ffe9a8, var(--gold) 45%, #a9760f 100%);
        box-shadow:
          0 0 0 4px rgba(244,197,66,0.25),
          0 8px 0 #7a530c,
          0 10px 20px rgba(0,0,0,0.6),
          0 0 24px rgba(244,197,66,0.7);
        cursor:pointer;
        display:flex; align-items:center; justify-content:center;
        transition:transform .08s ease, box-shadow .08s ease;
        flex-shrink:0;
      }.nf-game .spin-btn .tri{
        width:0; height:0; border-top:14px solid transparent; border-bottom:14px solid transparent;
        border-left:22px solid #3a2205; margin-left:5px;
      }.nf-game .spin-btn.spinning .tri{ display:none; }.nf-game .spin-btn.spinning::after{
        content:''; width:26px; height:26px; border-radius:6px; background:#3a2205;
      }.nf-game .spin-btn:active:not(:disabled){ transform:translateY(4px); box-shadow:0 0 0 4px rgba(244,197,66,0.25), 0 4px 0 #7a530c, 0 6px 14px rgba(0,0,0,0.6), 0 0 30px rgba(244,197,66,0.9); }.nf-game .spin-btn:disabled{ filter:grayscale(0.6) brightness(0.7); cursor:default; }.nf-game .spin-btn.pulse{ animation:spinpulse 1.1s ease-in-out infinite; }@keyframes spinpulse{ 0%,100%{ box-shadow:0 0 0 4px rgba(244,197,66,0.25), 0 8px 0 #7a530c, 0 10px 20px rgba(0,0,0,0.6), 0 0 24px rgba(244,197,66,0.7);} 50%{ box-shadow:0 0 0 8px rgba(244,197,66,0.15), 0 8px 0 #7a530c, 0 10px 20px rgba(0,0,0,0.6), 0 0 44px rgba(244,197,66,1);} }.nf-game .util-row{
        width:100%; display:flex; justify-content:space-between; align-items:center; margin-top:8px; gap:8px;
      }.nf-game .icon-btn{
        width:34px; height:34px; border-radius:50%; border:1px solid rgba(244,197,66,0.35);
        background:rgba(255,255,255,0.04); color:var(--gold-light); font-size:14px;
        display:flex; align-items:center; justify-content:center; cursor:pointer;
      }.nf-game .icon-btn.off{ opacity:0.4; }.nf-game .pill-btn{
        border:1px solid rgba(244,197,66,0.35); background:rgba(255,255,255,0.04); color:#fff;
        border-radius:16px; padding:6px 12px; font-size:11px; letter-spacing:1px; cursor:pointer;
      }.nf-game .pill-btn.active{ background:linear-gradient(180deg,var(--gold-light),var(--gold)); color:#2a1a02; font-weight:700; }.nf-game /* ================= AUTOSPIN PANEL ================= */
      .panel-overlay{
        position:fixed; inset:0; background:rgba(5,2,10,0.75); backdrop-filter:blur(3px);
        display:flex; align-items:center; justify-content:center; z-index:50;
        opacity:0; pointer-events:none; transition:opacity .2s ease;
      }.nf-game .panel-overlay.show{ opacity:1; pointer-events:auto; }.nf-game .panel-box{
        background:linear-gradient(160deg,#22163a,#120a1e);
        border:1px solid rgba(244,197,66,0.4); border-radius:16px; padding:20px; width:260px;
        text-align:center; box-shadow:0 0 40px rgba(123,47,247,0.5);
      }.nf-game .panel-box h3{ margin:0 0 12px; color:var(--gold-light); letter-spacing:2px; font-size:14px;}.nf-game .panel-grid{ display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:14px; }.nf-game .panel-grid button{
        padding:10px; border-radius:8px; border:1px solid rgba(244,197,66,0.3);
        background:rgba(255,255,255,0.05); color:#fff; font-weight:700; cursor:pointer;
      }.nf-game .panel-grid button.sel{ background:linear-gradient(180deg,var(--gold-light),var(--gold)); color:#2a1a02; }.nf-game .panel-close{ background:none; border:none; color:var(--cyan); font-size:12px; cursor:pointer; letter-spacing:1px; }.nf-game /* ================= BONUS / JACKPOT OVERLAYS ================= */
      .fs-banner{
        position:absolute; top:8px; left:50%; transform:translateX(-50%);
        background:linear-gradient(180deg,#2a1050,#170830);
        border:1px solid var(--pink); border-radius:10px; padding:4px 14px;
        font-size:12px; letter-spacing:2px; color:var(--pink); text-shadow:0 0 8px var(--pink);
        display:none; z-index:6; box-shadow:0 0 16px rgba(255,63,216,0.5);
      }.nf-game .fs-banner.show{ display:block; }.nf-game .fs-banner b{ color:#fff; font-size:15px; }.nf-game .full-overlay{
        position:fixed; inset:0; z-index:80;
        display:flex; align-items:center; justify-content:center; flex-direction:column; gap:10px;
        opacity:0; pointer-events:none; transition:opacity .4s ease;
        text-align:center;
      }.nf-game .full-overlay.show{ opacity:1; pointer-events:auto; }.nf-game .full-overlay.bonus-ov{ background:radial-gradient(circle, rgba(60,20,90,0.92), rgba(5,2,10,0.97)); }.nf-game .full-overlay.jackpot-ov{ background:radial-gradient(circle, rgba(90,60,10,0.95), rgba(5,2,10,0.98)); }.nf-game .ov-title{
        font-size:clamp(30px,10vw,64px); font-weight:900; letter-spacing:4px;
        background:linear-gradient(180deg,#fff7d6, var(--gold) 50%, #a9760f);
        -webkit-background-clip:text; background-clip:text; color:transparent;
        filter:drop-shadow(0 0 24px rgba(244,197,66,0.9));
        animation:jackpulse 0.9s ease-in-out infinite;
      }@keyframes jackpulse{ 0%,100%{ transform:scale(1);} 50%{ transform:scale(1.06);} }.nf-game .ov-sub{ color:#fff; font-size:14px; letter-spacing:3px; }.nf-game .ov-amount{ font-size:clamp(24px,7vw,40px); color:var(--gold-light); text-shadow:0 0 20px var(--gold); font-weight:800; }.nf-game .fs-count{ font-size:20px; color:var(--cyan); letter-spacing:2px; }.nf-game .coin{ position:absolute; width:18px; height:18px; border-radius:50%; background:radial-gradient(circle at 35% 30%, #fff7d6, var(--gold) 60%, #a9760f); box-shadow:0 0 8px var(--gold); animation:coinfall 1.4s ease-in forwards; }@keyframes coinfall{ 0%{ transform:translateY(-20px) rotate(0deg); opacity:1;} 100%{ transform:translateY(90vh) rotate(360deg); opacity:0;} }.nf-game .screen-shake{ animation:shake 0.4s ease; }@keyframes shake{
        0%,100%{ transform:translate(0,0); }
        20%{ transform:translate(-4px,2px); } 40%{ transform:translate(4px,-2px); }
        60%{ transform:translate(-3px,-2px); } 80%{ transform:translate(3px,2px); }
      }.nf-game .zoom-pulse{ animation:zoomp 0.6s ease; }@keyframes zoomp{ 0%,100%{ transform:scale(1);} 50%{ transform:scale(1.015);} }.nf-game .sr-only{ position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0,0,0,0); }.nf-game /* ================= WIN CELEBRATION ENGINE ================= */
      .fx-canvas{ position:fixed; inset:0; z-index:40; pointer-events:none; }.nf-game .dim-overlay{
        position:fixed; inset:0; background:#000; opacity:0; z-index:30;
        pointer-events:none; transition:opacity .5s ease;
      }.nf-game .dim-overlay.show{ opacity:0.45; }.nf-game .energy-wave{
        position:fixed; top:50%; left:50%; width:10px; height:10px; border-radius:50%;
        transform:translate(-50%,-50%);
        border:3px solid var(--gold-light);
        box-shadow:0 0 30px var(--gold), inset 0 0 20px rgba(255,255,255,0.4);
        opacity:0; z-index:41; pointer-events:none;
      }.nf-game .energy-wave.play{ animation:wave-expand 1.1s ease-out; }@keyframes wave-expand{
        0%{ width:10px; height:10px; opacity:0.95; }
        60%{ opacity:0.55; }
        100%{ width:1500px; height:1500px; opacity:0; }
      }.nf-game .screen-flash{ position:fixed; inset:0; background:#fff8e0; opacity:0; z-index:43; pointer-events:none; }.nf-game .screen-flash.flash{ animation:flashpop 0.4s ease-out; }@keyframes flashpop{ 0%{ opacity:0.9; } 100%{ opacity:0; } }.nf-game .win-celebration-text{
        position:fixed; top:36%; left:50%; z-index:42; text-align:center; pointer-events:none;
        transform:translate(-50%,-50%) scale(0.5);
        opacity:0;
        transition:opacity .25s ease, transform .3s cubic-bezier(.34,1.6,.64,1);
      }.nf-game .win-celebration-text.show{ opacity:1; transform:translate(-50%,-50%) scale(1); }.nf-game .wct-title{
        font-weight:900; letter-spacing:4px; margin:0;
        background:linear-gradient(180deg,#fff7d6, var(--gold) 50%, #a9760f);
        -webkit-background-clip:text; background-clip:text; color:transparent;
        filter:drop-shadow(0 0 26px rgba(244,197,66,0.9));
        white-space:nowrap;
      }.nf-game .wct-title.big{ font-size:clamp(30px,9vw,46px); }.nf-game .wct-title.mega{ font-size:clamp(36px,11vw,58px); }.nf-game .wct-title.epic{ font-size:clamp(42px,13vw,72px); animation:jackpulse 0.8s ease-in-out infinite; }.nf-game .wct-stars{ color:var(--gold-light); font-size:20px; letter-spacing:12px; text-shadow:0 0 12px var(--gold); }.nf-game .wct-amount{
        color:#fff; font-size:clamp(20px,6vw,32px); text-shadow:0 0 16px var(--gold);
        font-weight:800; margin-top:4px; font-variant-numeric:tabular-nums;
      }@media (max-width:400px){.nf-game .stat-box{ min-width:70px; padding:5px 8px; }.nf-game .spin-btn{ width:64px; height:64px; }}
      `}</style>
      <div className="nf-game" ref={rootRef}>
      <div className="bg-layer bg-base"></div>
      <div className="bg-layer bg-rays"></div>
      <div className="bg-layer bg-fog"></div>
      <div className="bg-layer bg-particles" id="particles"></div>

      <canvas className="fx-canvas" id="fxCanvas"></canvas>
      <div className="dim-overlay" id="dimOverlay"></div>
      <div className="energy-wave" id="energyWave"></div>
      <div className="screen-flash" id="screenFlash"></div>
      <div className="win-celebration-text" id="winCelebText"></div>

      <div className="game-root" id="gameRoot">

        <div className="logo-wrap">
          <p className="logo-title">WINNER69</p>
          <div className="logo-sub">LEGENDS OF THE NIGHT</div>
        </div>

        <div className="win-display" id="winDisplay">WIN <span className="amt" id="winAmt">0</span></div>

        <div className="cabinet" id="cabinet">
          <div className="neon-strip top"></div>
          <div className="fs-banner" id="fsBanner">FREE SPINS <b id="fsLeft">10</b></div>

          <div className="reel-window">
            <div className="reels" id="reels" style={{'--sym-h': '78px'}}></div>
            <svg className="paylines-svg" id="paylinesSvg" viewBox="0 0 500 234" preserveAspectRatio="none"></svg>
            <div className="reel-reflection"></div>
          </div>

          <div className="neon-strip bottom"></div>
        </div>

        <div className="controls">
          <div className="stat-box">
            <div className="stat-label">BALANCE</div>
            <div className="stat-value" id="balanceVal">1,250</div>
          </div>

          <button className="spin-btn" id="spinBtn" aria-label="Spin"><div className="tri"></div></button>

          <div className="stat-box">
            <div className="stat-label">BET</div>
            <div className="bet-control">
              <button className="bet-btn" id="betMinus">−</button>
              <div className="stat-value" id="betVal" style={{minWidth: '38px'}}>10</div>
              <button className="bet-btn" id="betPlus">+</button>
            </div>
          </div>
        </div>

        <div className="util-row">
          <button className="icon-btn" id="soundBtn" aria-label="Toggle sound">🔊</button>
          <button className="icon-btn" id="settingsBtn" aria-label="Audio settings">⚙️</button>
          <button className="pill-btn" id="autoBtn">AUTOSPIN</button>
          <button className="icon-btn" id="paytableBtn" aria-label="Paytable">💰</button>
          <button className="icon-btn" id="infoBtn" aria-label="Game info">ⓘ</button>
        </div>

      </div>

      <div className="panel-overlay" id="autoPanel">
        <div className="panel-box">
          <h3>AUTOSPIN</h3>
          <div className="panel-grid" id="autoGrid">
            <button data-n="5">5</button>
            <button data-n="10">10</button>
            <button data-n="25">25</button>
            <button data-n="50">50</button>
          </div>
          <button className="panel-close" id="autoCancel">CANCEL</button>
        </div>
      </div>

      <div className="panel-overlay" id="infoPanel">
        <div className="panel-box" style={{width: '280px', textAlign: 'left'}}>
          <h3 style={{textAlign: 'center'}}>NEON FORTUNE</h3>
          <div style={{fontSize: '12px', lineHeight: '1.7', color: '#ddd'}}>
            🐉 Dragon / 🦅 Phoenix / 🐯 Tiger / 👸 Queen — high value<br/>
            🌙 Moon / ⭐ Star / 💎 Gem / 👑 Crown — mid value<br/>
            A K Q J 10 — low value<br/>
            <b style={{color: 'var(--gold-light)'}}>WILD</b> substitutes all but Scatter/Bonus<br/>
            <b style={{color: 'var(--cyan)'}}>SCATTER</b> — 3+ triggers Free Spins
          </div>
          <div style={{textAlign: 'center', marginTop: '12px'}}>
            <button className="panel-close" id="infoClose">CLOSE</button>
          </div>
        </div>
      </div>

      <div className="panel-overlay" id="settingsPanel">
        <div className="panel-box" style={{width: '270px'}}>
          <h3>AUDIO SETTINGS</h3>
          <div className="slider-row">
            <label>MUSIC</label>
            <input type="range" id="musicSlider" min="0" max="100" defaultValue="35"/>
            <button className="swatch-toggle" id="musicMuteBtn">🔊</button>
          </div>
          <div className="slider-row">
            <label>SFX</label>
            <input type="range" id="sfxSlider" min="0" max="100" defaultValue="70"/>
            <button className="swatch-toggle" id="sfxMuteBtn">🔊</button>
          </div>
          <button className="panel-close" id="settingsClose">CLOSE</button>
        </div>
      </div>

      <div className="panel-overlay" id="paytablePanel">
        <div className="panel-box" style={{width: '300px', textAlign: 'left'}}>
          <h3 style={{textAlign: 'center'}}>PAYTABLE</h3>
          <div className="paytable-list" id="paytableList"></div>
          <div style={{textAlign: 'center', marginTop: '10px'}}>
            <button className="panel-close" id="paytableClose">CLOSE</button>
          </div>
        </div>
      </div>

      <div className="full-overlay bonus-ov" id="bonusOverlay">
        <div className="ov-title">BONUS!</div>
        <div className="ov-sub" id="bonusSubtitle">FREE SPINS AWARDED</div>
        <div className="fs-count" id="bonusFsCount">10 FREE SPINS</div>
      </div>

      <div className="full-overlay jackpot-ov" id="jackpotOverlay">
        <div className="ov-title">JACKPOT</div>
        <div className="ov-amount" id="jackpotAmt">+50,000</div>
      </div>

      <div className="sr-only" id="liveRegion" aria-live="polite"></div>
      </div>
    </>
  );
}
