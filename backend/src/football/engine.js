/* WINNER69 FOOTBALL LEAGUE 7 — core engines (UI-independent, deterministic, testable)
 * modules: rng, teams, league-scheduler, match-engine, standings, odds/model,
 *          demo-credit-engine, prediction-engine, league service (backend layer)
 */
// ESM copy of games-src/football-league-7/src/engine.js (the same engine the game page runs).
// Regenerate with games-src/football-league-7/make-server-engine.py after changing the engine.
const W69 = (function (root) {
  'use strict';

  /* ===================== RNG (seeded) ===================== */
  function hashStr(s) {
    let h = 2166136261 >>> 0;
    s = String(s);
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function makeRng(seed) {
    let a = (typeof seed === 'number' ? seed : hashStr(seed)) >>> 0;
    const next = function () {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    return {
      next,
      range: (lo, hi) => lo + next() * (hi - lo),
      int: (lo, hi) => lo + Math.floor(next() * (hi - lo + 1)),
      pick: (arr) => arr[Math.floor(next() * arr.length)],
      chance: (p) => next() < p,
      weighted: (items, wf) => {
        let tot = 0; const ws = items.map((x) => { const w = Math.max(0, wf(x)); tot += w; return w; });
        let r = next() * tot;
        for (let i = 0; i < items.length; i++) { r -= ws[i]; if (r <= 0) return items[i]; }
        return items[items.length - 1];
      },
    };
  }

  /* ===================== Time (Asia/Bangkok, UTC+7, no DST) ===================== */
  const BKK = 7 * 3600 * 1000;
  const DAY = 86400000;
  /** epoch ms for a Bangkok wall-clock date 'YYYY-MM-DD' + 'HH:MM' */
  function bkkToEpoch(dateStr, timeStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const [hh, mm] = (timeStr || '00:00').split(':').map(Number);
    return Date.UTC(y, m - 1, d, hh, mm) - BKK;
  }
  function epochToBkkDate(ms) {
    const d = new Date(ms + BKK);
    return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0');
  }
  function epochToBkkTime(ms) {
    const d = new Date(ms + BKK);
    return String(d.getUTCHours()).padStart(2, '0') + ':' + String(d.getUTCMinutes()).padStart(2, '0');
  }
  function addDays(dateStr, n) { return epochToBkkDate(bkkToEpoch(dateStr, '12:00') + n * DAY); }

  /* ===================== Teams & players ===================== */
  const TEAM_DEFS = [
    { id: 'WIN', name: 'WINNER FC', primary: '#F5C451', secondary: '#1A1408', kit2: '#111B2A', shape: 'shield', tier: 78 },
    { id: 'BKU', name: 'Bangkok United 7', primary: '#E63946', secondary: '#F1FAEE', kit2: '#1D3557', shape: 'round', tier: 80 },
    { id: 'GEA', name: 'Golden Eagles', primary: '#E9A400', secondary: '#2B1D05', kit2: '#FFFFFF', shape: 'hex', tier: 78 },
    { id: 'THW', name: 'Thunder Wolves', primary: '#7B61FF', secondary: '#F2EEFF', kit2: '#1B1440', shape: 'shield', tier: 76 },
    { id: 'RLI', name: 'Royal Lions', primary: '#3A5BD9', secondary: '#F5C451', kit2: '#F5F5F5', shape: 'crest', tier: 79 },
    { id: 'BSH', name: 'Blue Sharks', primary: '#00A6D6', secondary: '#E6FBFF', kit2: '#022B3A', shape: 'round', tier: 74 },
    { id: 'RPH', name: 'Red Phoenix', primary: '#FF5A1F', secondary: '#2A0A04', kit2: '#FFD6C7', shape: 'hex', tier: 75 },
    { id: 'BPA', name: 'Black Panthers', primary: '#2B2D42', secondary: '#EDF2F4', kit2: '#EDF2F4', shape: 'shield', tier: 77 },
    { id: 'DST', name: 'Diamond Stars', primary: '#B392F0', secondary: '#1F0B3A', kit2: '#E0F7FF', shape: 'crest', tier: 72 },
    { id: 'SFA', name: 'Silver Falcons', primary: '#AEB7C2', secondary: '#1B2129', kit2: '#3B4450', shape: 'round', tier: 73 },
    { id: 'TIW', name: 'Tiger Warriors', primary: '#F77F00', secondary: '#120A00', kit2: '#FFF1DE', shape: 'hex', tier: 76 },
    { id: 'DRF', name: 'Dragon Force', primary: '#1FBF5A', secondary: '#04140A', kit2: '#D7FFE4', shape: 'crest', tier: 78 },
  ];
  const FIRST = ['ธนพล', 'กิตติพัฒน์', 'ศุภชัย', 'อนุชา', 'วีรยุทธ', 'ณัฐวุฒิ', 'ปิยะพงษ์', 'สุริยา', 'ชนาธิป', 'ธีรศิลป์', 'พีรพัฒน์', 'อดิศักดิ์', 'จักรพันธ์', 'สมพงษ์', 'ภานุวัฒน์', 'ธนวัฒน์', 'นครินทร์', 'วรชิต', 'ศักดิ์ชัย', 'เอกนิษฐ์', 'ทศพล', 'รัฐพล', 'กฤษดา', 'ปกรณ์', 'อัครพล', 'สิทธิชัย', 'ยศกร', 'ธราดล', 'พงศกร', 'วิทวัส'];
  const LAST = ['ศรีสุข', 'ทองดี', 'แก้วมณี', 'บุญมา', 'วงศ์ไทย', 'สายทอง', 'มั่นคง', 'ใจดี', 'พรหมมา', 'จันทร์เพ็ญ', 'รุ่งเรือง', 'ศักดิ์สิทธิ์', 'ทองคำ', 'เพชรรัตน์', 'สิงห์ทอง', 'คงสวัสดิ์', 'ชัยมงคล', 'นาคสุข', 'อินทร์แก้ว', 'พูลผล'];
  // 7 starters (GK, DEF x2, MID x2, FWD x2) + 3 subs (GK, DEF/MID, FWD)
  const SQUAD_LAYOUT = [
    ['GK', true], ['DEF', true], ['DEF', true], ['MID', true], ['MID', true], ['FWD', true], ['FWD', true],
    ['GK', false], ['MID', false], ['FWD', false],
  ];
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function playerOverall(p) {
    const a = p.attrs;
    switch (p.pos) {
      case 'GK': return Math.round(a.gk * 0.75 + a.pas * 0.1 + a.def * 0.15);
      case 'DEF': return Math.round(a.def * 0.55 + a.pac * 0.2 + a.pas * 0.25);
      case 'MID': return Math.round(a.pas * 0.5 + a.def * 0.2 + a.sho * 0.15 + a.pac * 0.15);
      default: return Math.round(a.sho * 0.55 + a.pac * 0.3 + a.pas * 0.15);
    }
  }
  function generateSquad(teamDef, seed) {
    const rng = makeRng(seed + ':' + teamDef.id);
    const used = new Set(); const nums = new Set();
    return SQUAD_LAYOUT.map(([pos, starter], i) => {
      let name; do { name = rng.pick(FIRST) + ' ' + rng.pick(LAST); } while (used.has(name)); used.add(name);
      let num; const pref = { GK: [1, 13, 22], DEF: [2, 3, 4, 5, 15], MID: [6, 8, 10, 14, 16], FWD: [7, 9, 11, 17, 19] }[pos];
      num = pref.find((n) => !nums.has(n)) || rng.int(20, 40); nums.add(num);
      const t = teamDef.tier + (starter ? 0 : -5);
      const v = () => clamp(Math.round(t + rng.range(-9, 7)), 40, 97);
      const attrs = { pac: v(), pas: v(), sho: v(), def: v(), gk: pos === 'GK' ? clamp(t + rng.int(-4, 6), 45, 97) : rng.int(15, 30) };
      if (pos === 'FWD') attrs.sho = clamp(attrs.sho + 6, 40, 97), attrs.def = clamp(attrs.def - 12, 30, 97);
      if (pos === 'DEF') attrs.def = clamp(attrs.def + 6, 40, 97), attrs.sho = clamp(attrs.sho - 12, 30, 97);
      const p = { id: teamDef.id + '-' + (i + 1), name, num, pos, starter, attrs };
      p.ovr = playerOverall(p);
      return p;
    });
  }
  function createTeams(seed) {
    return TEAM_DEFS.map((d) => ({ ...d, active: true, players: generateSquad(d, seed || 'w69') }));
  }
  function starters(team) {
    const s = team.players.filter((p) => p.starter);
    return s.length >= 7 ? s.slice(0, 7) : s.concat(team.players.filter((p) => !p.starter)).slice(0, 7);
  }
  function teamStrength(team) {
    const s = starters(team); const avg = (arr, f) => arr.length ? arr.reduce((t, p) => t + f(p), 0) / arr.length : 50;
    const by = (pos) => s.filter((p) => p.pos === pos);
    const gk = by('GK')[0] || s[0];
    const attack = avg(by('FWD').concat(by('MID')), (p) => p.attrs.sho * 0.6 + p.attrs.pac * 0.4);
    const midfield = avg(by('MID').concat(by('DEF')), (p) => p.attrs.pas);
    const defense = avg(by('DEF').concat(by('MID')), (p) => p.attrs.def * 0.7 + p.attrs.pac * 0.3);
    const keeper = gk.attrs.gk;
    const overall = Math.round(attack * 0.3 + midfield * 0.3 + defense * 0.25 + keeper * 0.15);
    return { attack: Math.round(attack), midfield: Math.round(midfield), defense: Math.round(defense), keeper, overall };
  }

  /* ===================== League scheduler (double round robin, circle method) ===================== */
  /**
   * Generates a balanced double round-robin. Returns rounds (array of [home, away] id pairs).
   * Home/away alternates per team; second leg mirrors the first with venues swapped.
   */
  function roundRobin(teamIds) {
    const ids = teamIds.slice(); if (ids.length % 2) ids.push(null);
    const n = ids.length, rounds = [];
    const fixed = ids[0]; let rot = ids.slice(1);
    for (let r = 0; r < n - 1; r++) {
      const cur = [fixed].concat(rot), pairs = [];
      for (let i = 0; i < n / 2; i++) {
        const a = cur[i], b = cur[n - 1 - i];
        if (a === null || b === null) continue;
        // alternate venue: fixed team flips every round; others by round parity & slot
        const swap = i === 0 ? r % 2 === 1 : (i % 2 === 1);
        pairs.push(swap ? [b, a] : [a, b]);
      }
      rounds.push(pairs);
      rot = [rot[rot.length - 1]].concat(rot.slice(0, -1));
    }
    const second = rounds.map((rd) => rd.map(([h, a]) => [a, h]));
    return rounds.concat(second);
  }
  /**
   * Build full season fixtures. cfg: {seasonId, startDate 'YYYY-MM-DD', matchesPerDay, slotTimes ['21:00','21:00']}
   * Matches of one day are taken from the same round, so a team never plays twice on one day.
   */
  function generateSchedule(teamIds, cfg) {
    if (!cfg || !cfg.startDate) throw new Error('startDate required');
    const perDay = cfg.matchesPerDay || 2;
    const slots = cfg.slotTimes && cfg.slotTimes.length ? cfg.slotTimes : ['21:00'];
    const rounds = roundRobin(teamIds);
    const matches = []; let day = 0; let no = 0;
    rounds.forEach((pairs, ri) => {
      for (let i = 0; i < pairs.length; i += perDay) {
        const date = addDays(cfg.startDate, day);
        pairs.slice(i, i + perDay).forEach(([h, a], k) => {
          no++;
          const time = slots[Math.min(k, slots.length - 1)];
          matches.push({
            id: cfg.seasonId + '-M' + String(no).padStart(3, '0'), no, round: ri + 1, day: day + 1,
            homeId: h, awayId: a, date, time, kickoff: bkkToEpoch(date, time), status: 'scheduled',
          });
        });
        day++;
      }
    });
    return matches;
  }
  function validateSchedule(matches, teamIds) {
    const errs = []; const pair = new Map(); const perTeam = {}; const homeCnt = {};
    teamIds.forEach((t) => { perTeam[t] = 0; homeCnt[t] = 0; });
    const byDate = {};
    for (const m of matches) {
      perTeam[m.homeId]++; perTeam[m.awayId]++; homeCnt[m.homeId]++;
      const k = m.homeId + '>' + m.awayId; pair.set(k, (pair.get(k) || 0) + 1);
      (byDate[m.date] = byDate[m.date] || []).push(m);
      if (m.homeId === m.awayId) errs.push('self match ' + m.id);
    }
    for (const [d, ms] of Object.entries(byDate)) {
      const seen = new Set();
      for (const m of ms) { for (const t of [m.homeId, m.awayId]) { if (seen.has(t)) errs.push('team ' + t + ' twice on ' + d); seen.add(t); } }
    }
    for (const a of teamIds) for (const b of teamIds) if (a !== b && pair.get(a + '>' + b) !== 1) errs.push('pair ' + a + '>' + b + ' count ' + (pair.get(a + '>' + b) || 0));
    return { ok: errs.length === 0, errors: errs, perTeam, homeCnt };
  }

  /* ===================== Match engine ===================== */
  const H1_END = 900, HT_END = 1200, FT = 2100; // game seconds: 15' + 5' break + 15'
  const FORMATION = { GK: [[0.05, 0.5]], DEF: [[0.2, 0.3], [0.2, 0.7]], MID: [[0.4, 0.32], [0.4, 0.68]], FWD: [[0.6, 0.38], [0.6, 0.62]] };
  function clockOf(t) { // game time -> displayed match clock seconds, half
    if (t < H1_END) return { sec: Math.max(0, t), half: 1, phase: 'H1' };
    if (t < HT_END) return { sec: H1_END, half: 1, phase: 'HT' };
    if (t < FT) return { sec: H1_END + (t - HT_END), half: 2, phase: 'H2' };
    return { sec: 1800, half: 2, phase: 'FT' };
  }
  function fmtClock(sec) { return String(Math.floor(sec / 60)).padStart(2, '0') + ':' + String(Math.floor(sec % 60)).padStart(2, '0'); }
  /** compact, immutable snapshot of a team used as simulation input */
  function snapshotTeam(team) {
    return { id: team.id, players: starters(team).map((p) => ({ id: p.id, name: p.name, num: p.num, pos: p.pos, a: [p.attrs.pac, p.attrs.pas, p.attrs.sho, p.attrs.def, p.attrs.gk] })) };
  }
  /**
   * simulateMatch({seed, home, away}) — home/away are snapshots. Pure & deterministic.
   * Home attacks to x=1 in 1st half, x=0 in 2nd. Ball coordinates are absolute (0..1).
   */
  function simulateMatch(input) {
    const rng = makeRng(input.seed);
    const sides = { home: input.home, away: input.away };
    const P = (s) => sides[s].players.map((p) => ({ ...p, pac: p.a[0], pas: p.a[1], sho: p.a[2], def: p.a[3], gk: p.a[4] }));
    const squads = { home: P('home'), away: P('away') };
    const avg = (arr, f) => arr.reduce((t, x) => t + f(x), 0) / arr.length;
    const str = {};
    for (const s of ['home', 'away']) {
      const sq = squads[s];
      str[s] = {
        pass: avg(sq.filter((p) => p.pos !== 'GK'), (p) => p.pas),
        def: avg(sq.filter((p) => p.pos !== 'GK'), (p) => p.def * 0.75 + p.pac * 0.25),
        gk: (sq.find((p) => p.pos === 'GK') || sq[0]).gk,
      };
    }
    const HOME_ADV = 2; // rating points
    const events = []; const score = { home: 0, away: 0 };
    const stats = { home: { shots: 0, onTarget: 0, passes: 0, tackles: 0, corners: 0, saves: 0, poss: 0 }, away: { shots: 0, onTarget: 0, passes: 0, tackles: 0, corners: 0, saves: 0, poss: 0 } };
    const opp = (s) => (s === 'home' ? 'away' : 'home');
    const dirOf = (side, half) => ((side === 'home') === (half === 1) ? 1 : -1);
    const absX = (side, half, prog) => (dirOf(side, half) > 0 ? prog : 1 - prog);
    const push = (e) => { e.score = { home: score.home, away: score.away }; events.push(e); };
    const playerRef = (p) => ({ id: p.id, num: p.num, name: p.name });

    for (const half of [1, 2]) {
      const start = half === 1 ? 0 : HT_END, end = half === 1 ? H1_END : FT;
      let side = half === 1 ? 'home' : 'away';
      let prog = 0.5, y = 0.5;
      let carrier = squads[side].find((p) => p.pos === 'FWD');
      let t = start;
      push({ t, type: 'kickoff', side, player: playerRef(carrier), x: 0.5, y: 0.5 });
      t += 2;
      while (t < end) {
        const a = str[side], d = str[opp(side)];
        const adv = (side === 'home' ? HOME_ADV : -HOME_ADV);
        const edge = (a.pass - d.def + adv) / 160; // ~ -0.2..0.2
        const dt = rng.int(3, 8);
        stats[side].poss += dt;
        const inShootZone = prog > 0.7;
        const shootP = inShootZone ? 0.15 + (prog - 0.7) * 1.2 + edge * 0.4 : (prog > 0.55 ? 0.025 : 0);
        if (rng.chance(clamp(shootP, 0, 0.75))) {
          // SHOT — shooter weighted by finishing & position
          const shooter = rng.chance(0.75) && carrier.pos !== 'GK' ? carrier : rng.weighted(squads[side].filter((p) => p.pos !== 'GK'), (p) => p.sho * (p.pos === 'FWD' ? 2 : p.pos === 'MID' ? 1 : 0.3));
          const gk = squads[opp(side)].find((p) => p.pos === 'GK') || squads[opp(side)][0];
          const dist = 1 - prog; // smaller = closer
          const quality = clamp(0.5 + (shooter.sho - 70) / 160 - dist * 1.1 + edge * 0.3, 0.12, 0.92);
          stats[side].shots++;
          const shotT = t; const gx = dirOf(side, half) > 0 ? 1 : 0;
          const onTarget = rng.chance(clamp(0.3 + quality * 0.45, 0.25, 0.8));
          if (!onTarget) {
            push({ t: shotT, type: 'shot', side, player: playerRef(shooter), x: gx, y: rng.chance(0.5) ? rng.range(0.3, 0.4) : rng.range(0.6, 0.7), outcome: 'wide' });
            side = opp(side); prog = 0.08; y = 0.5; carrier = squads[side].find((p) => p.pos === 'GK');
            t += dt + 3; continue;
          }
          stats[side].onTarget++;
          const goalP = clamp(0.36 + quality * 0.35 + (shooter.sho - gk.gk) / 220, 0.14, 0.8);
          if (rng.chance(goalP)) {
            score[side]++;
            push({ t: shotT, type: 'shot', side, player: playerRef(shooter), x: gx, y: rng.range(0.44, 0.56), outcome: 'goal' });
            push({ t: shotT + 1, type: 'goal', side, player: playerRef(shooter), x: gx, y: 0.5 });
            if (shotT + 20 >= end) { t = end; break; }
            side = opp(side); prog = 0.5; y = 0.5; carrier = squads[side].find((p) => p.pos === 'FWD');
            t = shotT + 20;
            push({ t, type: 'kickoff', side, player: playerRef(carrier), x: 0.5, y: 0.5 });
            t += 2; continue;
          }
          stats[opp(side)].saves++;
          push({ t: shotT, type: 'shot', side, player: playerRef(shooter), x: gx, y: rng.range(0.42, 0.58), outcome: 'saved' });
          push({ t: shotT + 1, type: 'save', side: opp(side), player: playerRef(gk), x: absX(side, half, 0.96), y: rng.range(0.42, 0.58) });
          t = shotT + 1 + dt;
          if (rng.chance(0.38) && t < end - 5) {
            stats[side].corners++;
            const cy = rng.chance(0.5) ? 0.01 : 0.99;
            push({ t, type: 'corner', side, player: playerRef(rng.pick(squads[side].filter((p) => p.pos !== 'GK'))), x: gx, y: cy });
            prog = 0.88; y = rng.range(0.4, 0.6);
            carrier = rng.weighted(squads[side].filter((p) => p.pos !== 'GK'), (p) => (p.pos === 'FWD' ? 3 : 1));
            t += 4; continue;
          }
          side = opp(side); prog = 0.06; y = 0.5; carrier = gk; continue;
        }
        // PASS or DRIBBLE vs pressure
        const dribble = carrier.pos !== 'GK' && rng.chance(0.22 + (carrier.pac - 70) / 300);
        const press = squads[opp(side)].filter((p) => p.pos !== 'GK');
        const defender = rng.weighted(press, (p) => p.def * (prog > 0.5 ? (p.pos === 'DEF' ? 2 : 1) : (p.pos === 'FWD' ? 2 : 1)));
        const succ = dribble
          ? clamp(0.62 + (carrier.pac + carrier.pas * 0.3 - defender.def * 1.15) / 260 + edge * 0.4 - prog * 0.18, 0.3, 0.88)
          : clamp(0.86 + (carrier.pas - defender.def) / 420 + edge * 0.3 - prog * 0.22, 0.45, 0.95);
        if (rng.chance(succ)) {
          if (dribble) {
            prog = clamp(prog + rng.range(0.04, 0.12), 0.05, 0.95); y = clamp(y + rng.range(-0.12, 0.12), 0.08, 0.92);
            push({ t, type: 'dribble', side, player: playerRef(carrier), x: absX(side, half, prog), y });
          } else {
            const mates = squads[side].filter((p) => p.id !== carrier.id && p.pos !== 'GK');
            const fwdBias = prog < 0.35 ? { DEF: 1, MID: 3, FWD: 1.5 } : { DEF: 0.6, MID: 2, FWD: 3 };
            const rec = rng.weighted(mates, (p) => fwdBias[p.pos] * (p.pas / 70));
            const target = { DEF: 0.3, MID: 0.55, FWD: 0.78 }[rec.pos];
            prog = clamp(prog + (target - prog) * rng.range(0.35, 0.8) + rng.range(-0.04, 0.08), 0.05, 0.93);
            y = clamp(rng.range(0.15, 0.85) * 0.6 + y * 0.4, 0.08, 0.92);
            stats[side].passes++;
            push({ t, type: 'pass', side, player: playerRef(carrier), to: playerRef(rec), x: absX(side, half, prog), y });
            carrier = rec;
          }
        } else {
          stats[opp(side)].tackles++;
          side = opp(side); prog = clamp(1 - prog, 0.08, 0.9); carrier = defender;
          push({ t, type: 'tackle', side, player: playerRef(defender), x: absX(side, half, prog), y });
        }
        t += dt;
      }
      push({ t: end, type: half === 1 ? 'halftime' : 'fulltime', side: null, x: 0.5, y: 0.5 });
    }
    const tot = stats.home.poss + stats.away.poss || 1;
    stats.home.possPct = Math.round((stats.home.poss / tot) * 100); stats.away.possPct = 100 - stats.home.possPct;
    return { events, homeGoals: score.home, awayGoals: score.away, stats };
  }
  /** Find last event at or before game time t (binary search) */
  function eventIndexAt(events, t) {
    let lo = 0, hi = events.length - 1, ans = -1;
    while (lo <= hi) { const m = (lo + hi) >> 1; if (events[m].t <= t) { ans = m; lo = m + 1; } else hi = m - 1; }
    return ans;
  }
  function scoreAt(events, t) { const i = eventIndexAt(events, t); return i < 0 ? { home: 0, away: 0 } : events[i].score; }

  /* ===================== Standings (single source of truth) ===================== */
  function emptyRow(id) { return { teamId: id, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0, form: [] }; }
  /** Only matches with status 'confirmed' count. Tie-break: points, GD, GF, head-to-head points, H2H GD, H2H GF, name. */
  function computeStandings(teams, matches) {
    const rows = {}; teams.forEach((t) => { rows[t.id] = emptyRow(t.id); });
    const done = matches.filter((m) => m.status === 'confirmed' && m.result).sort((a, b) => a.kickoff - b.kickoff);
    for (const m of done) {
      const h = rows[m.homeId], a = rows[m.awayId]; if (!h || !a) continue;
      const hg = m.result.home, ag = m.result.away;
      h.played++; a.played++; h.gf += hg; h.ga += ag; a.gf += ag; a.ga += hg;
      if (hg > ag) { h.won++; a.lost++; h.points += 3; h.form.push('W'); a.form.push('L'); }
      else if (hg < ag) { a.won++; h.lost++; a.points += 3; h.form.push('L'); a.form.push('W'); }
      else { h.drawn++; a.drawn++; h.points++; a.points++; h.form.push('D'); a.form.push('D'); }
    }
    const list = Object.values(rows); list.forEach((r) => { r.gd = r.gf - r.ga; r.form = r.form.slice(-5); });
    const name = (id) => (teams.find((t) => t.id === id) || { name: id }).name;
    const h2h = (group) => {
      const ids = new Set(group.map((r) => r.teamId)); const mini = {}; group.forEach((r) => { mini[r.teamId] = { p: 0, gd: 0, gf: 0 }; });
      for (const m of done) if (ids.has(m.homeId) && ids.has(m.awayId)) {
        const hg = m.result.home, ag = m.result.away;
        mini[m.homeId].gf += hg; mini[m.awayId].gf += ag; mini[m.homeId].gd += hg - ag; mini[m.awayId].gd += ag - hg;
        if (hg > ag) mini[m.homeId].p += 3; else if (hg < ag) mini[m.awayId].p += 3; else { mini[m.homeId].p++; mini[m.awayId].p++; }
      }
      return mini;
    };
    list.sort((x, y) => y.points - x.points || y.gd - x.gd || y.gf - x.gf);
    // resolve fully tied groups by head-to-head
    const out = []; let i = 0;
    while (i < list.length) {
      let j = i + 1; while (j < list.length && list[j].points === list[i].points && list[j].gd === list[i].gd && list[j].gf === list[i].gf) j++;
      const grp = list.slice(i, j);
      if (grp.length > 1) { const mini = h2h(grp); grp.sort((x, y) => mini[y.teamId].p - mini[x.teamId].p || mini[y.teamId].gd - mini[x.teamId].gd || mini[y.teamId].gf - mini[x.teamId].gf || name(x.teamId).localeCompare(name(y.teamId))); }
      out.push(...grp); i = j;
    }
    out.forEach((r, k) => { r.rank = k + 1; });
    return out;
  }

  /* ===================== Probability model (odds & title chances) ===================== */
  function poissonPmf(k, l) { let p = Math.exp(-l); for (let i = 1; i <= k; i++) p *= l / i; return p; }
  function expectedGoals(home, away) {
    const sh = teamStrength(home), sa = teamStrength(away);
    const BASE = 1.85; // calibrated against simulateMatch (see tests)
    const lh = BASE * Math.exp(((sh.attack + sh.midfield) / 2 - (sa.defense * 0.7 + sa.keeper * 0.3) + 2) / 22);
    const la = BASE * Math.exp(((sa.attack + sa.midfield) / 2 - (sh.defense * 0.7 + sh.keeper * 0.3) - 2) / 22);
    return { lh, la };
  }
  function outcomeProbs(home, away) {
    const { lh, la } = expectedGoals(home, away); let pH = 0, pD = 0, pA = 0; const grid = [];
    for (let i = 0; i <= 10; i++) { grid[i] = []; for (let j = 0; j <= 10; j++) { const p = poissonPmf(i, lh) * poissonPmf(j, la); grid[i][j] = p; if (i > j) pH += p; else if (i === j) pD += p; else pA += p; } }
    const s = pH + pD + pA; return { home: pH / s, draw: pD / s, away: pA / s, grid, lh, la };
  }
  const MARGIN = 1.07;
  function toOdds(p, margin) { return Math.max(1.05, Math.round((1 / (p * (margin || MARGIN))) * 100) / 100); }
  function matchOdds(home, away) {
    const pr = outcomeProbs(home, away);
    return { home: toOdds(pr.home), draw: toOdds(pr.draw), away: toOdds(pr.away), probs: { home: pr.home, draw: pr.draw, away: pr.away }, xg: { home: pr.lh, away: pr.la } };
  }
  function scoreOdds(home, away, hg, ag) {
    const pr = outcomeProbs(home, away); const p = (pr.grid[hg] && pr.grid[hg][ag]) || 0.0005;
    return Math.min(150, toOdds(Math.max(p, 0.0005), 1.18));
  }
  /** Monte-Carlo season projection for remaining (non-confirmed, non-cancelled) matches */
  function titleOdds(teams, matches, n, seed) {
    const rng = makeRng(seed || 'title'); const N = n || 1500;
    const remain = matches.filter((m) => m.status !== 'confirmed' && m.status !== 'cancelled');
    const tmap = Object.fromEntries(teams.map((t) => [t.id, t]));
    const lam = remain.map((m) => (tmap[m.homeId] && tmap[m.awayId] ? expectedGoals(tmap[m.homeId], tmap[m.awayId]) : { lh: 2, la: 2 }));
    const pois = (l) => { const L = Math.exp(-l); let k = 0, p = 1; do { k++; p *= rng.next(); } while (p > L); return k - 1; };
    const wins = Object.fromEntries(teams.map((t) => [t.id, 0]));
    if (!remain.length) { const st = computeStandings(teams, matches); wins[st[0].teamId] = N; }
    else for (let s = 0; s < N; s++) {
      const sim = matches.map((m) => m);
      const extra = remain.map((m, i) => ({ ...m, status: 'confirmed', result: { home: pois(lam[i].lh), away: pois(lam[i].la) } }));
      const st = computeStandings(teams, sim.filter((m) => m.status === 'confirmed').concat(extra));
      wins[st[0].teamId]++;
    }
    const out = {}; for (const k in wins) out[k] = wins[k] / N; return out;
  }

  /* ===================== IDs ===================== */
  let idCounter = 0;
  function uid(prefix) {
    idCounter = (idCounter + 1) % 1679616;
    const r = (typeof crypto !== 'undefined' && crypto.getRandomValues) ? Array.from(crypto.getRandomValues(new Uint8Array(6))).map((b) => b.toString(16).padStart(2, '0')).join('') : Math.random().toString(16).slice(2, 14);
    return prefix + '-' + Date.now().toString(36).toUpperCase() + '-' + idCounter.toString(36).toUpperCase().padStart(4, '0') + '-' + r.toUpperCase();
  }

  /* ===================== League service (backend layer) =====================
   * All mutations go through this class. UI never edits state directly.
   * Persistence is pluggable (storage.load/save). In production, run the same
   * class on Node/Express with a DB transaction around each public method.
   */
  class ApiError extends Error { constructor(code, msg) { super(msg); this.code = code; } }
  const DEFAULT_SETTINGS = { startingCredits: 1000, stakeOptions: [50, 100, 200, 500], minStake: 10, maxStake: 1000, autoConfirm: true, matchesPerDay: 2, slotTimes: ['21:00', '21:00'], defaultSpeed: 1, champDeadlineDay: 34 };

  class LeagueService {
    constructor(opts) {
      opts = opts || {};
      this.now = opts.now || (() => Date.now());
      this.storage = opts.storage || null;
      this.state = (this.storage && this.storage.load()) || null;
      if (!this.state || this.state.v !== 3) this.state = this._fresh(opts);
      this._simCache = new Map();
    }
    _fresh(opts) {
      const today = epochToBkkDate(this.now());
      const st = {
        v: 3, settings: { ...DEFAULT_SETTINGS, ...(opts.settings || {}) }, teams: createTeams('w69-teams'),
        season: null, matches: [], archive: [],
        users: {}, ledger: [], predictions: [], champPicks: [], settled: {}, requests: {}, audit: [],
        admins: { admin: { passHash: hashStr('w69:admin:winner69admin'), mustChange: true } },
      };
      this.state = st;
      this.createSeason({ startDate: opts.startDate || addDays(today, -(opts.daysBack == null ? 12 : opts.daysBack)), seed: opts.seed || 'S1' }, 'system');
      return this.state;
    }
    _save() { if (this.storage) this.storage.save(this.state); }
    _audit(actor, action, detail) { this.state.audit.push({ id: uid('AUD'), at: this.now(), actor, action, detail }); }
    _requireAdmin(token) { if (!token || token.role !== 'admin' || !this.state.admins[token.admin]) throw new ApiError('FORBIDDEN', 'ต้องเข้าสู่ระบบผู้ดูแล'); }
    _requireUser(token) { if (!token || !token.userId || !this.state.users[token.userId]) throw new ApiError('UNAUTH', 'กรุณาเข้าสู่ระบบ'); return this.state.users[token.userId]; }
    team(id) { return this.state.teams.find((t) => t.id === id); }
    match(id) { const m = this.state.matches.find((x) => x.id === id); if (!m) throw new ApiError('NOT_FOUND', 'ไม่พบแมตช์'); return m; }

    /* ----- auth ----- */
    loginUser(username) {
      const u = String(username || '').trim();
      if (!/^[\wก-๙.\-]{3,20}$/.test(u)) throw new ApiError('BAD_INPUT', 'ชื่อผู้ใช้ 3–20 ตัวอักษร ไม่มีเว้นวรรค');
      const id = 'U-' + u.toLowerCase();
      if (!this.state.users[id]) {
        this.state.users[id] = { id, name: u, balance: 0, createdAt: this.now() };
        this._tx(id, 'INIT', this.state.settings.startingCredits, null, 'เครดิตทดลองเริ่มต้น');
        this._save();
      }
      return { role: 'user', userId: id };
    }
    loginAdmin(user, pass) {
      const a = this.state.admins[user];
      if (!a || a.passHash !== hashStr('w69:' + user + ':' + pass)) throw new ApiError('BAD_LOGIN', 'ชื่อผู้ใช้หรือรหัสผ่านผู้ดูแลไม่ถูกต้อง');
      this._audit(user, 'ADMIN_LOGIN', {}); this._save();
      return { role: 'admin', admin: user, mustChange: a.mustChange };
    }
    changeAdminPassword(token, newPass) {
      this._requireAdmin(token);
      if (String(newPass).length < 8) throw new ApiError('BAD_INPUT', 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร');
      this.state.admins[token.admin] = { passHash: hashStr('w69:' + token.admin + ':' + newPass), mustChange: false };
      this._audit(token.admin, 'ADMIN_PASSWORD_CHANGED', {}); this._save();
    }

    /* ----- demo-credit-engine ----- */
    _tx(userId, type, amount, ref, note) {
      const u = this.state.users[userId];
      const after = u.balance + amount;
      if (after < 0) throw new ApiError('INSUFFICIENT', 'เครดิตไม่พอ');
      u.balance = after;
      const tx = { id: uid('TX'), userId, type, amount, balanceAfter: after, ref: ref || null, note: note || '', at: this.now() };
      this.state.ledger.push(tx); return tx;
    }
    balance(userId) { return this.state.users[userId] ? this.state.users[userId].balance : 0; }
    resetCredits(token, userId) {
      this._requireAdmin(token);
      const ids = userId ? [userId] : Object.keys(this.state.users);
      for (const id of ids) {
        const u = this.state.users[id]; if (!u) continue;
        const old = u.balance;
        // void any pending predictions first so stakes are not lost
        this.state.predictions.filter((p) => p.userId === id && p.status === 'pending').forEach((p) => { p.status = 'void'; p.settledAt = this.now(); this.state.settled['pred:' + p.id] = true; });
        this.state.champPicks.filter((p) => p.userId === id && p.status === 'pending').forEach((p) => { p.status = 'void'; this.state.settled['champ:' + p.id] = true; });
        this._tx(id, 'RESET', this.state.settings.startingCredits - u.balance, null, 'รีเซ็ตบัญชีทดลองโดยผู้ดูแล');
        this._audit(token.admin, 'RESET_CREDITS', { userId: id, old, new: u.balance });
      }
      this._save();
    }

    /* ----- league-scheduler ----- */
    createSeason(cfg, actor) {
      const st = this.state;
      if (st.season && !st.season.closed && st.matches.some((m) => m.status !== 'scheduled')) {
        if (!cfg.force) throw new ApiError('SEASON_OPEN', 'ฤดูกาลปัจจุบันยังไม่ปิด ต้องยืนยันการสร้างใหม่');
      }
      const num = (st.archive.length + (st.season ? 1 : 0)) + 1;
      const seasonId = 'S' + num;
      if (st.season && st.season.id === seasonId) throw new ApiError('DUPLICATE', 'มีโปรแกรมของฤดูกาลนี้แล้ว');
      const teamIds = st.teams.filter((t) => t.active).map((t) => t.id);
      if (teamIds.length < 4 || teamIds.length % 2) throw new ApiError('BAD_TEAMS', 'ต้องมีทีมที่เปิดใช้งานเป็นจำนวนคู่ อย่างน้อย 4 ทีม');
      if (st.season) {
        // refund open predictions of the old season
        this._voidPending((p) => true, 'สร้างฤดูกาลใหม่');
        st.archive.push({ season: st.season, standings: computeStandings(st.teams, st.matches), champion: st.season.champion || null });
      }
      const matches = generateSchedule(teamIds, { seasonId, startDate: cfg.startDate, matchesPerDay: st.settings.matchesPerDay, slotTimes: st.settings.slotTimes });
      const v = validateSchedule(matches, teamIds); if (!v.ok) throw new ApiError('SCHEDULE', v.errors.join('; '));
      const days = Math.max(...matches.map((m) => m.day));
      const dl = Math.min(st.settings.champDeadlineDay, days);
      const dlMatch = matches.find((m) => m.day === dl);
      st.season = { id: seasonId, name: 'ฤดูกาล ' + num, seed: String(cfg.seed || seasonId), startDate: cfg.startDate, teamIds, createdAt: this.now(), closed: false, champion: null, champDeadline: dlMatch.kickoff, totalDays: days };
      st.matches = matches; st.predictions = st.predictions.filter((p) => p.status !== 'pending');
      this._simCache = new Map();
      this._audit(actor || 'system', 'SEASON_CREATED', { seasonId, startDate: cfg.startDate, matches: matches.length });
      this._save();
      return st.season;
    }

    /* ----- match runtime ----- */
    /** game seconds elapsed for a match at time now (server clock) */
    gameTime(m, now) {
      now = now == null ? this.now() : now;
      if (m.result && (m.status === 'finished' || m.status === 'confirmed')) return FT;
      const r = m.run; if (!r) return now >= m.kickoff && m.status === 'scheduled' ? (now - m.kickoff) / 1000 * this.state.settings.defaultSpeed : -1;
      const g = r.acc + (r.paused ? 0 : (now - r.seg) / 1000 * r.speed);
      return Math.min(FT, g);
    }
    simInputFor(m) {
      if (!m.simInput) m.simInput = { seed: this.state.season.seed + ':' + m.id + ':' + (m.replay || 0), home: snapshotTeam(this.team(m.homeId)), away: snapshotTeam(this.team(m.awayId)) };
      return m.simInput;
    }
    simOf(m) {
      const inp = this.simInputFor(m); const key = m.id + ':' + inp.seed;
      if (!this._simCache.has(key)) this._simCache.set(key, simulateMatch(inp));
      return this._simCache.get(key);
    }
    /** advance all match states according to server time. Idempotent. */
    tick() {
      const now = this.now(); let changed = false;
      for (const m of this.state.matches) {
        if (m.status === 'cancelled' || m.status === 'postponed' || m.status === 'confirmed') continue;
        if (m.status === 'scheduled' && now >= m.kickoff && !m.run) {
          m.run = { seg: m.kickoff, acc: 0, speed: this.state.settings.defaultSpeed, paused: false };
          this.simInputFor(m); m.status = 'live'; changed = true;
        }
        if (m.status === 'live' && this.gameTime(m, now) >= FT) { this._finish(m, 'system'); changed = true; }
      }
      if (changed) this._save();
      return changed;
    }
    phaseOf(m) {
      if (['cancelled', 'postponed', 'scheduled'].includes(m.status)) return m.status;
      if (m.status === 'finished' || m.status === 'confirmed') return m.status;
      const g = this.gameTime(m); const c = clockOf(g);
      if (m.run && m.run.paused) return c.phase === 'HT' ? 'halftime' : 'paused';
      return c.phase === 'HT' ? 'halftime' : 'live';
    }
    _finish(m, actor) {
      const sim = this.simOf(m);
      m.result = { home: sim.homeGoals, away: sim.awayGoals, source: 'engine' };
      m.status = 'finished'; m.finishedAt = this.now();
      if (this.state.settings.autoConfirm) this._confirm(m, actor);
    }
    _confirm(m, actor) {
      if (m.status !== 'finished') throw new ApiError('BAD_STATE', 'ยืนยันได้เฉพาะแมตช์ที่จบแล้ว');
      m.status = 'confirmed'; m.confirmedAt = this.now();
      this._audit(actor, 'RESULT_CONFIRMED', { matchId: m.id, result: m.result.home + '-' + m.result.away });
      this.settleMatch(m.id);
    }
    /* admin controls */
    adminStartNow(token, id, speed) {
      this._requireAdmin(token); const m = this.match(id);
      if (!['scheduled', 'postponed'].includes(m.status)) throw new ApiError('BAD_STATE', 'เริ่มได้เฉพาะแมตช์ที่ยังไม่แข่ง');
      const old = { kickoff: m.kickoff, status: m.status };
      m.kickoff = this.now(); m.date = epochToBkkDate(m.kickoff); m.time = epochToBkkTime(m.kickoff);
      m.status = 'live'; m.run = { seg: this.now(), acc: 0, speed: speed || 1, paused: false }; this.simInputFor(m);
      this._audit(token.admin, 'MATCH_STARTED', { matchId: id, old, speed: speed || 1 }); this._save();
    }
    adminSetSpeed(token, id, speed) {
      this._requireAdmin(token); const m = this.match(id); if (m.status !== 'live') throw new ApiError('BAD_STATE', 'แมตช์ไม่ได้กำลังแข่ง');
      if (![1, 5, 15, 60].includes(speed)) throw new ApiError('BAD_INPUT', 'ความเร็วไม่ถูกต้อง');
      const now = this.now(); m.run.acc = this.gameTime(m, now); m.run.seg = now; const old = m.run.speed; m.run.speed = speed;
      this._audit(token.admin, 'MATCH_SPEED', { matchId: id, old, new: speed }); this._save();
    }
    adminPause(token, id, paused) {
      this._requireAdmin(token); const m = this.match(id); if (m.status !== 'live') throw new ApiError('BAD_STATE', 'แมตช์ไม่ได้กำลังแข่ง');
      const now = this.now(); m.run.acc = this.gameTime(m, now); m.run.seg = now; m.run.paused = !!paused;
      this._audit(token.admin, paused ? 'MATCH_PAUSED' : 'MATCH_RESUMED', { matchId: id, at: fmtClock(clockOf(m.run.acc).sec) }); this._save();
    }
    adminFinishNow(token, id) {
      this._requireAdmin(token); const m = this.match(id);
      if (!['scheduled', 'live', 'postponed'].includes(m.status)) throw new ApiError('BAD_STATE', 'แมตช์นี้จบหรือถูกยกเลิกแล้ว');
      if (m.status !== 'live') { m.kickoff = Math.min(m.kickoff, this.now()); m.date = epochToBkkDate(m.kickoff); m.time = epochToBkkTime(m.kickoff); }
      m.run = m.run || { seg: this.now(), acc: 0, speed: 1, paused: false }; m.status = 'live';
      this._audit(token.admin, 'MATCH_SIMULATED_INSTANT', { matchId: id });
      this._finish(m, token.admin); this._save();
    }
    adminConfirm(token, id) { this._requireAdmin(token); this._confirm(this.match(id), token.admin); this._save(); }
    adminPostpone(token, id, date, time, reason) {
      this._requireAdmin(token); const m = this.match(id);
      if (!['scheduled', 'postponed'].includes(m.status)) throw new ApiError('BAD_STATE', 'เลื่อนได้เฉพาะแมตช์ที่ยังไม่เริ่ม');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) throw new ApiError('BAD_INPUT', 'รูปแบบวันเวลาไม่ถูกต้อง');
      const k = bkkToEpoch(date, time); if (k <= this.now()) throw new ApiError('BAD_INPUT', 'วันเวลาใหม่ต้องอยู่ในอนาคต');
      const clash = this.state.matches.find((x) => x.id !== id && x.date === date && x.status !== 'cancelled' && [x.homeId, x.awayId].some((t) => t === m.homeId || t === m.awayId));
      if (clash) throw new ApiError('CLASH', 'ทีมมีนัดอื่นในวันนั้นแล้ว (' + clash.id + ')');
      const old = { date: m.date, time: m.time, status: m.status };
      m.date = date; m.time = time; m.kickoff = k; m.status = 'scheduled'; m.postponedFrom = old.date + ' ' + old.time; m.note = reason || '';
      this._audit(token.admin, 'MATCH_RESCHEDULED', { matchId: id, old, new: { date, time }, reason: reason || '' }); this._save();
    }
    adminMarkPostponed(token, id, reason) {
      this._requireAdmin(token); const m = this.match(id);
      if (m.status !== 'scheduled') throw new ApiError('BAD_STATE', 'เลื่อนได้เฉพาะแมตช์ที่ยังไม่เริ่ม');
      m.status = 'postponed'; m.note = reason || '';
      this._audit(token.admin, 'MATCH_POSTPONED', { matchId: id, reason: reason || '' }); this._save();
    }
    adminCancel(token, id, reason) {
      this._requireAdmin(token); const m = this.match(id);
      if (['confirmed', 'finished', 'cancelled'].includes(m.status)) throw new ApiError('BAD_STATE', 'ยกเลิกไม่ได้ในสถานะนี้');
      const old = m.status; m.status = 'cancelled'; m.note = reason || ''; m.run = null;
      this._voidPending((p) => p.matchId === id, 'แมตช์ถูกยกเลิก');
      this._audit(token.admin, 'MATCH_CANCELLED', { matchId: id, old, reason: reason || '' }); this._save();
    }
    /** correct a confirmed result — reason required; predictions are NOT re-settled (settlement is final) */
    adminEditResult(token, id, hg, ag, reason) {
      this._requireAdmin(token); const m = this.match(id);
      if (!['finished', 'confirmed'].includes(m.status)) throw new ApiError('BAD_STATE', 'แก้ไขได้เฉพาะแมตช์ที่จบแล้ว');
      if (!reason || reason.trim().length < 5) throw new ApiError('BAD_INPUT', 'ต้องระบุเหตุผลอย่างน้อย 5 ตัวอักษร');
      hg = Number(hg); ag = Number(ag);
      if (!Number.isInteger(hg) || !Number.isInteger(ag) || hg < 0 || ag < 0 || hg > 30 || ag > 30) throw new ApiError('BAD_INPUT', 'สกอร์ไม่ถูกต้อง');
      const old = { ...m.result };
      m.result = { home: hg, away: ag, source: 'admin', engine: old.engine || { home: old.home, away: old.away } };
      m.corrections = (m.corrections || []).concat([{ at: this.now(), by: token.admin, old: old.home + '-' + old.away, new: hg + '-' + ag, reason }]);
      this._audit(token.admin, 'RESULT_EDITED', { matchId: id, old: old.home + '-' + old.away, new: hg + '-' + ag, reason });
      this._save();
    }
    adminUpdateTeam(token, id, patch) {
      this._requireAdmin(token); const t = this.team(id); if (!t) throw new ApiError('NOT_FOUND', 'ไม่พบทีม');
      const allowed = ['name', 'primary', 'secondary', 'kit2', 'active']; const old = {}; const nw = {};
      for (const k of allowed) if (k in patch && patch[k] !== t[k]) { old[k] = t[k]; nw[k] = patch[k]; }
      if ('name' in nw && !String(nw.name).trim()) throw new ApiError('BAD_INPUT', 'ต้องมีชื่อทีม');
      Object.assign(t, nw);
      if (nw.active === false && this.state.season && this.state.season.teamIds.includes(id)) {
        this.state.matches.filter((m) => (m.homeId === id || m.awayId === id) && ['scheduled', 'postponed'].includes(m.status)).forEach((m) => { m.status = 'cancelled'; m.note = 'ทีมถูกปิดใช้งาน'; this._voidPending((p) => p.matchId === m.id, 'ทีมถูกปิดใช้งาน'); });
      }
      this._audit(token.admin, 'TEAM_UPDATED', { teamId: id, old, new: nw }); this._save();
    }
    adminAddTeam(token, name, primary) {
      this._requireAdmin(token); name = String(name || '').trim(); if (name.length < 3) throw new ApiError('BAD_INPUT', 'ชื่อทีมสั้นเกินไป');
      let code = name.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || 'NEW'; while (this.team(code)) code = code.slice(0, 2) + String.fromCharCode(65 + Math.floor(Math.random() * 26));
      const def = { id: code, name, primary: primary || '#5BC0EB', secondary: '#0B1320', kit2: '#FFFFFF', shape: 'shield', tier: 74, active: true };
      def.players = generateSquad(def, 'added:' + this.now());
      this.state.teams.push(def); this._audit(token.admin, 'TEAM_ADDED', { teamId: code, name }); this._save(); return code;
    }
    adminUpdatePlayer(token, teamId, playerId, patch) {
      this._requireAdmin(token); const t = this.team(teamId); const p = t && t.players.find((x) => x.id === playerId); if (!p) throw new ApiError('NOT_FOUND', 'ไม่พบนักเตะ');
      const old = { name: p.name, num: p.num, pos: p.pos, starter: p.starter, attrs: { ...p.attrs } };
      if (patch.num != null) { const n = Number(patch.num); if (!Number.isInteger(n) || n < 1 || n > 99) throw new ApiError('BAD_INPUT', 'หมายเลขเสื้อ 1–99'); if (t.players.some((x) => x.id !== p.id && x.num === n)) throw new ApiError('BAD_INPUT', 'หมายเลขเสื้อซ้ำในทีม'); p.num = n; }
      if (patch.name != null) { if (!String(patch.name).trim()) throw new ApiError('BAD_INPUT', 'ต้องมีชื่อ'); p.name = String(patch.name).trim(); }
      if (patch.pos && ['GK', 'DEF', 'MID', 'FWD'].includes(patch.pos)) p.pos = patch.pos;
      if (patch.attrs) for (const k of ['pac', 'pas', 'sho', 'def', 'gk']) if (patch.attrs[k] != null) p.attrs[k] = clamp(Math.round(Number(patch.attrs[k]) || 0), 1, 99);
      if (patch.starter != null) p.starter = !!patch.starter;
      const st = t.players.filter((x) => x.starter);
      if (st.length !== 7 || st.filter((x) => x.pos === 'GK').length !== 1) { Object.assign(p, old, { attrs: old.attrs }); throw new ApiError('BAD_INPUT', 'ตัวจริงต้องมี 7 คน และผู้รักษาประตู 1 คน'); }
      p.ovr = playerOverall(p);
      this._audit(token.admin, 'PLAYER_UPDATED', { teamId, playerId, old, new: patch }); this._save();
    }
    adminCloseSeason(token) {
      this._requireAdmin(token); const st = this.state; if (!st.season || st.season.closed) throw new ApiError('BAD_STATE', 'ไม่มีฤดูกาลที่เปิดอยู่');
      const open = st.matches.filter((m) => !['confirmed', 'cancelled'].includes(m.status));
      if (open.length) throw new ApiError('BAD_STATE', 'ยังมี ' + open.length + ' แมตช์ที่ยังไม่ยืนยันผล');
      const table = computeStandings(st.teams.filter((t) => st.season.teamIds.includes(t.id)), st.matches);
      st.season.closed = true; st.season.champion = table[0].teamId; st.season.closedAt = this.now();
      this._audit(token.admin, 'SEASON_CLOSED', { champion: table[0].teamId, points: table[0].points });
      this.settleChampionship(); this._save(); return table[0].teamId;
    }
    adminUpdateSettings(token, patch) {
      this._requireAdmin(token); const s = this.state.settings; const old = {};
      if (patch.startingCredits != null) { const v = Number(patch.startingCredits); if (!(v >= 100 && v <= 1e6)) throw new ApiError('BAD_INPUT', 'เครดิตเริ่มต้น 100–1,000,000'); old.startingCredits = s.startingCredits; s.startingCredits = v; }
      if (patch.stakeOptions) { const arr = patch.stakeOptions.map(Number).filter((x) => x > 0); if (!arr.length) throw new ApiError('BAD_INPUT', 'ต้องมีจำนวนเครดิตต่อคำทายอย่างน้อย 1 ค่า'); old.stakeOptions = s.stakeOptions; s.stakeOptions = arr; s.maxStake = Math.max(...arr); s.minStake = Math.min(...arr); }
      if (patch.autoConfirm != null) { old.autoConfirm = s.autoConfirm; s.autoConfirm = !!patch.autoConfirm; }
      if (patch.slotTimes) { if (!patch.slotTimes.every((x) => /^\d{2}:\d{2}$/.test(x))) throw new ApiError('BAD_INPUT', 'เวลาไม่ถูกต้อง'); old.slotTimes = s.slotTimes; s.slotTimes = patch.slotTimes; }
      if (patch.defaultSpeed != null) { old.defaultSpeed = s.defaultSpeed; s.defaultSpeed = [1, 5, 15].includes(Number(patch.defaultSpeed)) ? Number(patch.defaultSpeed) : 1; }
      this._audit(token.admin, 'SETTINGS_UPDATED', { old, new: patch }); this._save();
    }

    /* ----- prediction-engine ----- */
    oddsFor(m) {
      if (m.lockedOdds) return m.lockedOdds;
      return matchOdds(this.team(m.homeId), this.team(m.awayId));
    }
    /** place prediction. requestKey makes the call idempotent (double-tap safe). */
    placePrediction(token, req) {
      const u = this._requireUser(token);
      if (req.requestKey && this.state.requests[req.requestKey]) return this.state.predictions.find((p) => p.id === this.state.requests[req.requestKey]);
      const m = this.match(req.matchId); this.tick();
      if (m.status !== 'scheduled' || this.now() >= m.kickoff) throw new ApiError('CLOSED', 'ปิดรับคำทายแล้ว');
      const stake = Number(req.stake);
      if (!this.state.settings.stakeOptions.includes(stake)) throw new ApiError('BAD_INPUT', 'จำนวนเครดิตไม่อยู่ในตัวเลือกที่กำหนด');
      let odds, pick;
      const home = this.team(m.homeId), away = this.team(m.awayId);
      if (req.market === '1X2') {
        if (!['home', 'draw', 'away'].includes(req.pick)) throw new ApiError('BAD_INPUT', 'ตัวเลือกไม่ถูกต้อง');
        odds = matchOdds(home, away)[req.pick]; pick = req.pick;
      } else if (req.market === 'SCORE') {
        const hg = Number(req.home), ag = Number(req.away);
        if (!Number.isInteger(hg) || !Number.isInteger(ag) || hg < 0 || ag < 0 || hg > 15 || ag > 15) throw new ApiError('BAD_INPUT', 'สกอร์ต้องเป็น 0–15');
        odds = scoreOdds(home, away, hg, ag); pick = hg + '-' + ag;
      } else throw new ApiError('BAD_INPUT', 'ประเภทคำทายไม่ถูกต้อง');
      if (this.state.predictions.some((p) => p.userId === u.id && p.matchId === m.id && p.market === req.market && p.status !== 'void')) throw new ApiError('DUPLICATE', 'คุณทายประเภทนี้ของแมตช์นี้แล้ว');
      if (u.balance < stake) throw new ApiError('INSUFFICIENT', 'เครดิตไม่พอ');
      const id = uid('PRD');
      const tx = this._tx(u.id, 'STAKE', -stake, id, 'ทายผล ' + home.name + ' vs ' + away.name);
      const pred = { id, userId: u.id, matchId: m.id, market: req.market, pick, stake, odds, potential: Math.round(stake * odds * 100) / 100, status: 'pending', placedAt: this.now(), txId: tx.id };
      this.state.predictions.push(pred);
      if (req.requestKey) this.state.requests[req.requestKey] = id;
      this._save(); return pred;
    }
    _voidPending(filter, why) {
      for (const p of this.state.predictions) {
        if (p.status !== 'pending' || !filter(p)) continue;
        const key = 'pred:' + p.id; if (this.state.settled[key]) continue;
        this.state.settled[key] = true; p.status = 'void'; p.settledAt = this.now();
        if (this.state.users[p.userId]) this._tx(p.userId, 'REFUND', p.stake, p.id, 'คืนเครดิต: ' + why);
      }
    }
    /** settles every pending prediction of a confirmed match exactly once */
    settleMatch(matchId) {
      const m = this.match(matchId); if (m.status !== 'confirmed') return 0;
      const r = m.result; const outcome = r.home > r.away ? 'home' : r.home < r.away ? 'away' : 'draw';
      let n = 0;
      for (const p of this.state.predictions) {
        if (p.matchId !== matchId || p.status !== 'pending') continue;
        const key = 'pred:' + p.id; if (this.state.settled[key]) continue; // unique settlement key
        this.state.settled[key] = true;
        const won = p.market === '1X2' ? p.pick === outcome : p.pick === r.home + '-' + r.away;
        p.status = won ? 'won' : 'lost'; p.settledAt = this.now(); p.resultSeen = r.home + '-' + r.away;
        if (won) { p.payout = p.potential; this._tx(p.userId, 'PAYOUT', p.potential, p.id, 'ทายถูก ×' + p.odds.toFixed(2)); } else p.payout = 0;
        n++;
      }
      this._save(); return n;
    }
    champOpen() { const s = this.state.season; return s && !s.closed && this.now() < s.champDeadline; }
    placeChampionPick(token, req) {
      const u = this._requireUser(token);
      if (req.requestKey && this.state.requests[req.requestKey]) return this.state.champPicks.find((p) => p.id === this.state.requests[req.requestKey]);
      const s = this.state.season; if (!this.champOpen()) throw new ApiError('CLOSED', 'ปิดรับคำทายแชมป์แล้ว');
      if (!s.teamIds.includes(req.teamId) || !this.team(req.teamId).active) throw new ApiError('BAD_INPUT', 'ทีมไม่ถูกต้อง');
      if (this.state.champPicks.some((p) => p.userId === u.id && p.seasonId === s.id && p.status !== 'void')) throw new ApiError('DUPLICATE', 'คุณเลือกทีมแชมป์ของฤดูกาลนี้แล้ว (แก้ไขไม่ได้)');
      const stake = Number(req.stake); if (!this.state.settings.stakeOptions.includes(stake)) throw new ApiError('BAD_INPUT', 'จำนวนเครดิตไม่อยู่ในตัวเลือก');
      if (u.balance < stake) throw new ApiError('INSUFFICIENT', 'เครดิตไม่พอ');
      const probs = this.titleProbabilities(); const odds = Math.min(200, toOdds(Math.max(probs[req.teamId] || 0.004, 0.004), 1.12));
      const id = uid('CHP'); const tx = this._tx(u.id, 'STAKE', -stake, id, 'ทายแชมป์: ' + this.team(req.teamId).name);
      const pick = { id, userId: u.id, seasonId: s.id, teamId: req.teamId, stake, odds, potential: Math.round(stake * odds * 100) / 100, status: 'pending', placedAt: this.now(), txId: tx.id };
      this.state.champPicks.push(pick); if (req.requestKey) this.state.requests[req.requestKey] = id; this._save(); return pick;
    }
    settleChampionship() {
      const s = this.state.season; if (!s || !s.closed) return 0; let n = 0;
      for (const p of this.state.champPicks) {
        if (p.seasonId !== s.id || p.status !== 'pending') continue;
        const key = 'champ:' + p.id; if (this.state.settled[key]) continue; this.state.settled[key] = true;
        const won = p.teamId === s.champion; p.status = won ? 'won' : 'lost'; p.settledAt = this.now();
        if (won) this._tx(p.userId, 'PAYOUT', p.potential, p.id, 'ทายแชมป์ถูก ×' + p.odds.toFixed(2)); n++;
      }
      return n;
    }

    /* ----- read API ----- */
    standings() { const s = this.state.season; return computeStandings(this.state.teams.filter((t) => s.teamIds.includes(t.id)), this.state.matches); }
    titleProbabilities() {
      const s = this.state.season; const key = this.state.matches.filter((m) => m.status === 'confirmed' || m.status === 'cancelled').length + ':' + s.id + ':' + this.state.audit.length;
      if (this._titleKey !== key) { this._titleKey = key; this._title = titleOdds(this.state.teams.filter((t) => s.teamIds.includes(t.id)), this.state.matches, 1200, s.seed + ':' + key); }
      return this._title;
    }
    teamMatches(teamId) { return this.state.matches.filter((m) => m.homeId === teamId || m.awayId === teamId); }
    headToHead(a, b) { return this.state.matches.filter((m) => m.status === 'confirmed' && ((m.homeId === a && m.awayId === b) || (m.homeId === b && m.awayId === a))); }
    exportCsv(token) {
      this._requireAdmin(token);
      const rows = [['match_id', 'round', 'date', 'time_bkk', 'home', 'away', 'status', 'home_goals', 'away_goals', 'result_source']];
      for (const m of this.state.matches) rows.push([m.id, m.round, m.date, m.time, this.team(m.homeId).name, this.team(m.awayId).name, m.status, m.result ? m.result.home : '', m.result ? m.result.away : '', m.result ? m.result.source : '']);
      this._audit(token.admin, 'EXPORT_CSV', { rows: rows.length - 1 }); this._save();
      return '\uFEFF' + rows.map((r) => r.map((c) => { const s = String(c); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(',')).join('\n');
    }
  }

  const api = {
    hashStr, makeRng, bkkToEpoch, epochToBkkDate, epochToBkkTime, addDays, TEAM_DEFS, createTeams, generateSquad, starters, teamStrength, playerOverall,
    roundRobin, generateSchedule, validateSchedule, simulateMatch, snapshotTeam, eventIndexAt, scoreAt, clockOf, fmtClock, FORMATION,
    H1_END, HT_END, FT, computeStandings, outcomeProbs, matchOdds, scoreOdds, titleOdds, expectedGoals, LeagueService, ApiError, uid, DEFAULT_SETTINGS,
  };
  return api;
})(globalThis);
export default W69;

