import React, { useEffect, useMemo, useState } from 'react';
import PokerTable, { DealerButton } from './components/PokerTable.jsx';
import PlayerSeat from './components/PlayerSeat.jsx';
import CommunityCards from './components/CommunityCards.jsx';
import PotDisplay from './components/PotDisplay.jsx';
import ActionButtons from './components/ActionButtons.jsx';
import BettingPanel from './components/BettingPanel.jsx';
import WinnerOverlay from './components/WinnerOverlay.jsx';
import ChipAnimation, { ChipStack } from './components/ChipAnimation.jsx';
import EmojiReaction, { EmojiPicker } from './components/EmojiReaction.jsx';
import GameLog from './components/GameLog.jsx';
import TopBar from './components/TopBar.jsx';
import useOnlinePoker from './useOnlinePoker.js';
import useOrientation from './hooks/useOrientation.js';
import { getSeatLayout } from './utils/seatLayout.js';
import { formatChips } from './utils/format.js';
import { isBettingPhase, nextIndex, computePot } from './game/engine.js';
import { evaluateBestHand, describePartialHand } from './game/handEvaluator.js';
import { PHASES } from './game/constants.js';
import { LanguageContext, getStrings, translateError } from './i18n/index.js';
import './styles.css';

const FONT_URL = 'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700;800&family=Cinzel:wght@700;900&family=Kanit:wght@400;500;600;700;800&display=swap';
const baht = (n) => Math.round(n || 0).toLocaleString('en-US');

/**
 * Texas Hold'em online for WINNER 69. Props:
 *  - api: { call(path, body) wallet-changing request (join/leave), poll(path, body) plain request }
 *  - balance: wallet balance (for the buy-in)
 *  - onExit(): back to the WINNER 69 lobby
 */
export default function PokerOnline({ api, balance = 0, onExit }) {
  const orientation = useOrientation();
  const [lang, setLang] = useState('th');
  const t = getStrings(lang);
  const poker = useOnlinePoker({ api });
  const { view, game, legal, humanIndex, thinkingIndex, dealing, sweeping, revealed, resultStage, flights, reactions, notice } = poker;

  const [raiseOpen, setRaiseOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [pickRoom, setPickRoom] = useState(null);
  const [buyIn, setBuyIn] = useState(0);

  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet'; link.href = FONT_URL;
    document.head.appendChild(link);
    return () => link.remove();
  }, []);

  const seated = Boolean(view && view.seated);
  const room = view && view.room;
  useEffect(() => { if (!seated) poker.loadRooms(); }, [seated]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (seated) return undefined;
    const id = setInterval(() => poker.loadRooms(), 5000);
    return () => clearInterval(id);
  }, [seated]); // eslint-disable-line react-hooks/exhaustive-deps

  const seatCount = game.players.length || 5;
  const layout = useMemo(() => getSeatLayout(seatCount, orientation), [seatCount, orientation]);
  const potPoint = orientation === 'portrait' ? { x: 50, y: 36 } : { x: 50, y: 33 };
  const resolvePoint = (ref) => {
    if (!ref) return null;
    if (ref.type === 'pot') return potPoint;
    const slot = layout[ref.index];
    if (!slot) return null;
    return ref.type === 'seat' ? slot.seat : slot.bet;
  };

  const human = game.players[humanIndex] && game.players[humanIndex].isHuman ? game.players[humanIndex] : null;
  const inBetting = isBettingPhase(game.gamePhase);
  const isMyTurn = Boolean(human) && inBetting && game.currentPlayerIndex === humanIndex && !dealing && !game.awaitingStreet;
  const handFinished = game.gamePhase === PHASES.SHOWDOWN || game.gamePhase === PHASES.HAND_OVER;
  const resultVisible = resultStage === 'result' || resultStage === 'done';
  useEffect(() => { if (!isMyTurn) setRaiseOpen(false); }, [isMyTurn]);

  // turn timer
  const [turnLeft, setTurnLeft] = useState(0);
  useEffect(() => {
    if (!isMyTurn || !view) { setTurnLeft(0); return undefined; }
    const end = Date.now() + (view.turnLeftMs || 0);
    const tick = () => setTurnLeft(Math.max(0, Math.ceil((end - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [isMyTurn, view && view.version]); // eslint-disable-line react-hooks/exhaustive-deps

  const { dealOrders, activeCount } = useMemo(() => {
    const orders = {};
    const active = game.players.filter((p) => !p.sittingOut).length;
    let idx = game.dealerIndex;
    for (let k = 0; k < active; k++) {
      idx = nextIndex(game.players, idx, (p) => !p.sittingOut);
      if (idx < 0) break;
      orders[idx] = k;
    }
    return { dealOrders: orders, activeCount: Math.max(1, active) };
  }, [game.players, game.dealerIndex]);

  const winningIds = useMemo(() => {
    if (!resultVisible || game.gamePhase !== PHASES.SHOWDOWN) return null;
    const ids = new Set();
    game.winners.forEach((i) => game.players[i]?.handResult?.cards.forEach((c) => ids.add(c.id)));
    return ids;
  }, [resultVisible, game.gamePhase, game.winners, game.players]);

  const liveHandName = useMemo(() => {
    if (!human || human.holeCards.length < 2 || !game.communityCards) return null;
    const cards = [...human.holeCards, ...game.communityCards];
    const result = cards.length >= 5 ? evaluateBestHand(cards) : describePartialHand(cards);
    return result ? t.hands[result.rank] : null;
  }, [human, game.communityCards, t]);

  const displayPot = handFinished && !resultVisible ? game.potAwarded : game.pot;
  const handleAction = (action, amount) => { setRaiseOpen(false); poker.humanAction(action, amount); };

  let status = null;
  if (seated && view.waiting) status = <span className="status__hint">กำลังจัดที่นั่ง… คุณจะได้ลงเล่นในมือถัดไป</span>;
  else if (isMyTurn) {
    status = (
      <>
        <span className="your-turn">{t.yourTurn}{turnLeft ? ` · ${turnLeft}s` : ''}</span>
        <span className="status__hint">{legal.toCall > 0 ? t.toCall(formatChips(legal.callAmount)) : t.checkOrBet}</span>
      </>
    );
  } else if (dealing) status = <span className="status__hint">{t.dealing}</span>;
  else if (thinkingIndex >= 0 && game.players[thinkingIndex]) status = <span className="status__hint">{t.thinking(game.players[thinkingIndex].name)}</span>;
  else if (inBetting && game.awaitingStreet) status = <span className="status__hint">{t.nextCard}</span>;
  else if (resultStage === 'reveal') status = <span className="status__hint">{t.revealing}</span>;
  else if (inBetting && human?.folded) status = <span className="status__hint">{t.foldedWatching}</span>;
  else if (handFinished) status = <span className="status__hint">มือถัดไปเริ่มอัตโนมัติ{view && view.nextHandInMs ? ` ใน ${Math.ceil(view.nextHandInMs / 1000)} วินาที` : ''}</span>;
  else if (game.gamePhase === PHASES.IDLE) status = <span className="status__hint">กำลังรอผู้เล่นอื่น… ถ้าไม่มีจะมีบอทเข้ามาแทน</span>;

  const membersAtTable = game.players.filter((p) => p.member).length + (human ? 1 : 0);
  const rooms = poker.rooms || [];
  const chosen = pickRoom ? rooms.find((r) => r.id === pickRoom) : null;
  const maxBuy = chosen ? Math.min(chosen.max, Math.floor(balance - chosen.fee)) : 0;
  const openRoom = (r) => { setPickRoom(r.id); setBuyIn(Math.max(r.min, Math.min(r.max, Math.floor(balance - r.fee), r.min * 2.5))); };
  const doLeave = async () => { setConfirmLeave(false); await poker.leave(); };

  return (
    <LanguageContext.Provider value={t}>
    <div className={`poker-app poker-app--${orientation}`} lang={t.code}>
      <TopBar
        tableName={room ? `Hold'em · ห้อง${room.name}` : "Texas Hold'em"}
        playerCount={seated ? `${game.players.length} ที่นั่ง · ผู้เล่นจริง ${membersAtTable}` : 'ออนไลน์'}
        phaseLabel={room ? `บลายด์ ${baht(room.sb)}/${baht(room.bb)}${game.handNumber ? ` · ${t.phases[game.gamePhase]}` : ''}` : ''}
        soundOn={poker.soundOn}
        onToggleSound={() => poker.setSoundOn(!poker.soundOn)}
        onBack={() => (seated ? setConfirmLeave(true) : onExit && onExit())}
        onOpenLog={() => setLogOpen(true)}
        settings={{ language: lang, setLanguage: setLang, onNewGame: seated ? () => setConfirmLeave(true) : undefined, newGameLabel: 'ลุกจากโต๊ะ (รับชิปคืน)' }}
      />

      <PokerTable
        orientation={orientation}
        logo="WINNER69"
        center={
          <>
            <PotDisplay amount={displayPot} blinds={{ small: room ? room.sb : 1, big: room ? room.bb : 2 }} />
            <CommunityCards cards={game.communityCards} winningIds={winningIds} dimOthers={Boolean(winningIds)} />
          </>
        }
      >
        {game.players.map((player, i) => (layout[i] ? <ChipStack key={`bet-${player.id}`} amount={player.bet} position={layout[i].bet} hidden={sweeping} /> : null))}
        <DealerButton position={layout[game.dealerIndex]?.dealer} />
        {game.players.map((player, i) =>
          layout[i] ? (
            <PlayerSeat
              key={player.id}
              player={player.member ? { ...player, name: `👤 ${player.name}` } : player}
              index={i}
              layout={layout[i]}
              dealOrder={dealOrders[i] ?? 0}
              activeCount={activeCount}
              isCurrent={inBetting && !dealing && game.currentPlayerIndex === i}
              isThinking={thinkingIndex === i}
              isRevealed={revealed.includes(i)}
              stage={resultStage}
              winningIds={winningIds}
              liveHandName={player.isHuman ? liveHandName : null}
              showResult={resultVisible}
              blindTag={i === game.smallBlindIndex ? 'SB' : i === game.bigBlindIndex ? 'BB' : null}
              onAvatarClick={player.isHuman ? () => setEmojiOpen((v) => !v) : undefined}
            />
          ) : null
        )}
        <ChipAnimation flights={flights} resolvePoint={resolvePoint} />
        <EmojiReaction reactions={reactions} resolveSeat={(i) => layout[i]?.seat} />
        <EmojiPicker open={emojiOpen && Boolean(human)} onPick={(emoji) => { poker.sendReaction(humanIndex, emoji); setEmojiOpen(false); }} onClose={() => setEmojiOpen(false)} />
        {notice && (
          <div key={notice.id} className={`toast toast--${notice.tone}`} role="status">
            {notice.key === 'error' ? translateError(t, notice.value) : typeof t.notices[notice.key] === 'function' ? t.notices[notice.key](notice.value) : t.notices[notice.key] ?? notice.key}
          </div>
        )}
        <WinnerOverlay visible={resultStage === 'result' && Boolean(human)} human={human} winners={game.winners} players={game.players} handResult={game.handResult} />
      </PokerTable>

      <footer className="bottom">
        {raiseOpen && isMyTurn ? (
          <BettingPanel legal={legal} pot={computePot(game.players)} currentBet={game.currentBet} playerBet={human.bet} playerChips={human.chips} step={room ? room.sb : 1} onConfirm={handleAction} onCancel={() => setRaiseOpen(false)} />
        ) : (
          <>
            <div className="status" aria-live="polite">{poker.error ? <span className="status__hint">{poker.error}</span> : status}</div>
            <ActionButtons legal={legal} enabled={isMyTurn} onAction={handleAction} onOpenRaise={() => setRaiseOpen(true)} />
          </>
        )}
      </footer>

      <GameLog open={logOpen} log={game.log || []} onClose={() => setLogOpen(false)} />

      {confirmLeave && (
        <div className="modal-backdrop">
          <div className="modal">
            <h2 className="modal__title">ลุกจากโต๊ะ?</h2>
            <p className="modal__text">
              ชิปบนโต๊ะ{human ? ` ${formatChips(human.chips)}` : ''} จะคืนเข้ากระเป๋าเงิน
              {inBetting && human && !human.folded ? ' — มือนี้จะหมอบให้อัตโนมัติ และคืนเงินเมื่อมือนี้จบ' : ''}
            </p>
            <button type="button" className="act act--fold act--wide modal__cta" onClick={doLeave} disabled={poker.busy}><span className="act__label">ลุกจากโต๊ะ</span></button>
            <button type="button" className="modal__link" onClick={() => setConfirmLeave(false)}>เล่นต่อ</button>
          </div>
        </div>
      )}

      {view && !view.seated && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal__logo"><span className="modal__suits">♠ ♥ ♣ ♦</span><h2>Texas Hold'em</h2></div>
            {!chosen ? (
              <>
                <p className="modal__text">เล่นออนไลน์กับผู้เล่นจริง · ที่นั่งว่างมีบอทเข้าแทน · เครดิตของคุณ ฿{baht(balance)}</p>
                <div className="w69-rooms">
                  {(rooms.length ? rooms : []).map((r) => {
                    const can = balance >= r.min + r.fee;
                    return (
                      <button key={r.id} type="button" className={`w69-room${can ? '' : ' is-off'}`} disabled={!can} onClick={() => openRoom(r)}>
                        <b>ห้อง{r.name} <em>Lv.{r.level}</em></b>
                        <span>บลายด์ ฿{baht(r.sb)}/{baht(r.bb)} · ซื้อชิป ฿{baht(r.min)}–{baht(r.max)}</span>
                        <span>ค่าเข้าโต๊ะ ฿{baht(r.fee)} · กำลังเล่น {r.players} คน</span>
                      </button>
                    );
                  })}
                  {!rooms.length && <p className="modal__caption">กำลังโหลดห้อง…</p>}
                </div>
                {poker.error && <p className="modal__caption" style={{ color: '#ff8a80' }}>{poker.error}</p>}
                <button type="button" className="modal__link" onClick={() => onExit && onExit()}>กลับหน้าหลัก</button>
              </>
            ) : (
              <>
                <p className="modal__text">ห้อง{chosen.name} · บลายด์ ฿{baht(chosen.sb)}/{baht(chosen.bb)}</p>
                <div className="w69-buyin">
                  <span>ซื้อชิป</span>
                  <b>฿{baht(buyIn)}</b>
                  <input type="range" min={chosen.min} max={Math.max(chosen.min, maxBuy)} step={chosen.bb} value={buyIn} onChange={(e) => setBuyIn(Number(e.target.value))} />
                  <small>ค่าเข้าโต๊ะ ฿{baht(chosen.fee)} · รวมหักจากกระเป๋า ฿{baht(buyIn + chosen.fee)}</small>
                </div>
                {poker.error && <p className="modal__caption" style={{ color: '#ff8a80' }}>{poker.error}</p>}
                <button type="button" className="act act--call act--wide modal__cta" disabled={poker.busy || buyIn + chosen.fee > balance} onClick={async () => { if (await poker.join(chosen.id, buyIn)) setPickRoom(null); }}>
                  <span className="act__label">{poker.busy ? 'กำลังเข้าโต๊ะ…' : 'เข้าโต๊ะ'}</span>
                </button>
                <button type="button" className="modal__link" onClick={() => setPickRoom(null)}>เลือกห้องอื่น</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
    </LanguageContext.Provider>
  );
}
