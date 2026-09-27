# WINNER 69 Demo Backend

Backend สำหรับต่อกับ React/Vite demo โดยเก็บข้อมูลสมาชิก กระเป๋าเครดิตเสมือน
ประวัติการเล่น และ audit log แบบ local JSON

> โหมดนี้ใช้ **virtual credits เท่านั้น** ไม่มีระบบฝาก/ถอนเงินจริง,
> payment gateway หรือการจัดการการพนันเงินจริง

## Run

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

API: `http://localhost:4000`

## Endpoints

- `GET /api/health`
- `POST /api/auth/register` `{ "username": "...", "password": "..." }`
- `POST /api/auth/login`
- `GET /api/me` (Bearer token)
- `GET /api/wallet` (Bearer token)
- `POST /api/wallet/demo-credit` `{ "amount": 1000 }`
- `POST /api/games/round` `{ "gameId": "...", "stake": 10, "result": "demo" }`
- `GET /api/games/history`
- `GET /api/admin/audit` (Bearer token + `x-admin-key`)

The game endpoint records a demo round and does not process real money.

## GitHub

From the project root:

```bash
git init
git add .
git commit -m "Add WINNER 69 demo backend"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

Do not commit `.env` or `data/db.json`.
