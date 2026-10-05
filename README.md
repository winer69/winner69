# WINNER 69 — Demo Casino App

A frontend-only demo casino web app (React). Virtual credits only ("B") —
no real payment processing, no real gambling. Built as a UI/feature demo;
see "Not production-ready" below before using it for anything beyond that.

This build runs entirely standalone in your browser — no backend needed.
Every account, balance, deposit/withdraw request, coupon, chat message, and
admin action lives only in this browser's local storage. Refreshing keeps
your data; a different browser/device starts fresh.

## Run locally

Requires [Node.js](https://nodejs.org/) 18+.

```bash
npm install
npm run dev
```

Open the URL it prints (usually http://localhost:5173).

## Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit - WINNER 69 demo"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

(Create the empty repo on GitHub first, then run the commands above from
inside this project folder.)

## Deploy (optional)

This is a static site once built, so any static host works:

**Vercel / Netlify** — connect the GitHub repo, they auto-detect Vite:
- Build command: `npm run build`
- Output directory: `dist`

## Project structure

```
index.html
src/
  main.jsx                React root - renders <App />
  App.jsx                 The whole app: lobby, all 14 "original" games
                           (Dice, Limbo, Mines, Roulette, Dragon Tiger, ...),
                           wallet, admin panel (dashboard + member management +
                           finance + games + chat + logs, tabbed), coupons, chat,
                           leaderboard, etc.
  NeonFortuneSlot.jsx      Neon Fortune slot machine (own component)
  PlushieParadise.jsx      Plushie Paradise claw machine (own component)
  NeonFishing.jsx          Neon Fishing arcade game (own component)
  StockTradingSimulator.jsx  Stock Trading mock market game (own component)
  CascadeSlot.jsx          PG-style cascade slot used by มังกรทองนำโชค, ขุมทรัพย์ราชันย์,
                           777 คลาสสิก and ป่ามรกต; rules/paytables in
                           backend/src/slotThemes.js + backend/src/cascadeSlot.js (shared)
  NamTaoPuPla.jsx          น้ำเต้าปูปลา (bowl + board with pair bets); rules shared with
                           backend/src/namtao.js
  Lottery.jsx              หวย: ซื้อหวย / ช่องเก็บหวย (paper tickets) + admin panel
  slotArt.jsx              symbol artwork + colours for each cascade slot
  Inferno7s.jsx, FruitCanopySlots.jsx, AlohaTotem.jsx, CopperGulchSlots.jsx, FishShooter.jsx
                           imported games; they get a `host` prop (src/extraHost.js) and ask
                           the server for every result: /api/games/x/<game>/<action>
                           (backend/src/extraGames.js + backend/src/extraSlots.js, shared)
  assets/                  game covers
```

The four separate game files are self-contained React components that
`App.jsx` imports and wraps to plug into the shared wallet/stats/admin
system (see the `*Game` wrapper components inside `App.jsx`, e.g.
`NeonFortuneGame`, `PlushieParadiseGame`, `NeonFishingGame`, `StockTradingGame`).

## What's in the demo

- **Imported games (v22):** Inferno 7s, Fruit Canopy, Aloha Totem, Copper Gulch
  and ยิงปลา Ocean Royale. The server decides every spin / every fish kill and pays
  from the shared wallet; admin RTP (เมนู เกม) controls each one. Free spins and
  respins are kept on the server, so a member who leaves mid-feature continues
  where they left off. Fish: every shot is paid when fired; a fish touched by a
  shot dies with probability RTP / (fish value x fish touched), so a shot is worth
  the RTP no matter what the browser reports. In WINNER 69 mode the free-coin,
  lucky-shell, package, shop, reset, jackpot and PK-contest features of the
  original fish game are off, the torpedo costs one bet, and Copper Gulch's
  feature buy is hidden.

- **18 games total** (14 "original" games built directly in `App.jsx` + the
  4 standalone components above). Every game's win/lose outcome is decided
  directly by the admin-configured win rate (10-100%) - set a game to 100%
  and it wins every round; set it to 10% and it wins roughly 1 in 10 rounds.
  The game's own mechanic (dice roll, cards, reels, claw, fishing reel,
  stock price) still plays out visually, generated to match whichever
  outcome was already decided, so what you see and what you get never
  contradict each other.
- Member accounts (auto-assigned usernames, US0001-US9999), login/register,
  account suspension
- Wallet: deposit with slip-photo upload + admin approval, withdrawal with
  destination-account entry + admin approval, coupon code redemption
- **Admin panel**, now organized into 6 tabs:
  - 📊 แดชบอร์ด — online-now count, new members today, deposit/withdraw
    totals, pending counts, net revenue, most-played game, a 7-day daily
    wagered/payout bar chart, and the top-bettors/per-game stats tables
  - 👥 สมาชิก — searchable member list with collapsible detail cards:
    balance adjustment (reason required, always logged), boost stacks,
    per-session wager limit, suspend/unsuspend, staff-only notes, play
    summary, recent transactions, and that member's own admin-edit history
  - 💰 การเงิน — withdrawal/deposit approval queues, bank info editor,
    coupon management
  - 🎮 เกม — per-game win-rate sliders, boost win-rate floor
  - 💬 แชท — member support chat
  - 📝 บันทึก — full admin activity log
  - Admin PIN demo codes: `1234` / `2345` / `3456` / `4567`
- Boost items (buy in-app, escalating daily price, temporarily raises
  win rate when used)
- Leaderboard + daily tournament card, live activity ticker, referral-style
  promo carousel

## Not production-ready

This is a demo/prototype. Before using it with real users or real money,
at minimum you'd need: a real backend with a real database (everything
here lives only in the browser), hashed passwords/PINs instead of
plaintext, a real payment gateway instead of the simulated QR/slip flow,
and a look at applicable gambling regulations in your jurisdiction (online
gambling without a license is illegal in many countries, including
Thailand).
\n## Backend (demo)\n\nA separate `backend/` folder provides authentication, virtual-credit wallet data, demo game-round records, and audit logs. It is intentionally demo-only and does not implement real-money deposits, withdrawals, payment processing, or gambling-odds administration. See `backend/README.md`.\n