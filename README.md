# RCKNet Monitoring

Backend + frontend untuk monitoring RT/RW Net berbasis MikroTik (PPPoE). Backend mengambil data dari RouterOS API dan menyimpan ke PostgreSQL. Frontend mengakses backend dengan session cookie (httpOnly) + CSRF.

## Arsitektur Singkat
- Backend: Node.js + Express + TypeScript
- Frontend: React (Vite) + TypeScript
- DB: PostgreSQL (Prisma ORM)
- Integrasi MikroTik: RouterOS API via VPN
- Frontend tidak akses MikroTik secara langsung
- Backend menjalankan cron sinkronisasi data

## Prasyarat Server
- Ubuntu 24.04 LTS
- Node.js 20+
- PostgreSQL aktif
- Akses sudo/root
- Port 80/443 terbuka
- Domain (disarankan untuk SSL)

## Penting: Production vs Development
- Production: gunakan `npm run start` dari root project.
- Development: gunakan `npm run dev:*` (`dev:backend` atau `dev:frontend`) hanya untuk lokal.
- Jangan jalankan Vite dev server (`npm run dev`) sebagai service publik production.

## Script Root
- `npm run install:all`: install dependency backend + frontend
- `npm run build`: build frontend + backend
- `npm run start`: build frontend + backend lalu start backend (backend serve frontend hasil build)

## Konfigurasi Env Backend
File: `apps/backend/.env`

Variabel minimum:
- `DATABASE_URL`
- `SESSION_SECRET`
- `ADMIN_SEED_PASSWORD`
- `MT_HOST`
- `MT_USER`
- `MT_PASS`
- `SERVE_FRONTEND=true`
- `FRONTEND_DIST_PATH=../../frontend/dist`
- `TRUST_PROXY=1` (wajib jika di belakang Nginx/aaPanel reverse proxy)

## Deploy Production di Ubuntu (Manual)
```bash
# 1) Clone
cd /opt
git clone https://github.com/akmaller/rcknet-monitoring.git
cd rcknet-monitoring

# 2) Install dependency
npm run install:all

# 3) Siapkan env
cp apps/backend/.env.example apps/backend/.env
# edit apps/backend/.env sesuai server

# 4) Generate client Prisma + apply migration production + seed
cd apps/backend
npx prisma generate
npx prisma migrate deploy
npm run prisma:seed
cd ../..

# 5) Jalankan mode production
npm run start
```

Catatan database:
- Untuk production, pakai `npx prisma migrate deploy`.
- Jangan pakai `prisma migrate dev` di server production.

## Deploy Production via aaPanel
### 1) Install komponen aaPanel
- Install `Node.js` app/module di aaPanel.
- Install `Nginx` di aaPanel (untuk reverse proxy + SSL).

### 2) Buat Node Project
- Source path: folder repo `rcknet-monitoring`
- Start command: `npm run start`
- Port: gunakan port internal project (sesuai konfigurasi backend)
- Aktifkan Mapping/Reverse Proxy ke domain
- Aktifkan SSL (Let's Encrypt) di domain terkait

### 3) Inisialisasi project (terminal aaPanel/SSH)
```bash
cd /www/wwwroot/rcknet-monitoring
npm run install:all

cp apps/backend/.env.example apps/backend/.env
# edit apps/backend/.env

cd apps/backend
npx prisma generate
npx prisma migrate deploy
npm run prisma:seed
cd ../..
```

### 4) Jalankan service production
- Start project dari aaPanel Node Project (command tetap `npm run start`).
- Pastikan status berjalan setelah restart server (auto-start diaktifkan).

## Deploy/Update via GitHub (aaPanel)
Jika source project diambil dari Git:
1. Set repo URL ke `https://github.com/akmaller/rcknet-monitoring.git` (atau SSH).
2. Pull/update dari aaPanel.
3. Setelah update kode, jalankan ulang langkah berikut:
```bash
cd /www/wwwroot/rcknet-monitoring
npm run install:all
cd apps/backend
npx prisma migrate deploy
cd ../..
```
4. Restart Node Project di aaPanel.

## Endpoint Utama
- `GET /health`
- `GET /api/auth/csrf`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/customers`
- `GET /api/customers/stats`
- `GET /api/customers/:username`
- `GET /api/customers/:username/history`
- `GET /api/sync/mikrotik`

## Catatan Operasional
- VPN ke MikroTik harus aktif sebelum backend berjalan.
- `MT_FETCH_SECRETS=true` untuk menarik semua pelanggan termasuk yang offline.
- Multi-instance sync memakai PostgreSQL advisory lock.
- Jangan commit file `.env` ke Git.

## Development (Lokal)
```bash
# backend
cd apps/backend
npm install
cp .env.example .env
npx prisma generate
npm run prisma:migrate
npm run prisma:seed
npm run dev

# frontend
cd ../frontend
npm install
cp .env.example .env
npm run dev
```
