# RCKNet Monitoring

Backend + frontend untuk monitoring RT/RW Net berbasis MikroTik (PPPoE). Backend mengambil data dari RouterOS API dan menyimpan ke PostgreSQL. Frontend membaca data dari backend dengan session cookie (httpOnly) + CSRF.

## Ringkasan Arsitektur
- Backend: Node.js + Express + TypeScript
- Frontend: React (Vite) + TypeScript
- DB: PostgreSQL (Prisma ORM)
- MikroTik: RouterOS API via VPN
- Frontend **tidak** langsung akses MikroTik
- Backend menjalankan cron untuk sinkron data

## Prasyarat Server
- Ubuntu 24.04 LTS
- Domain (opsional, untuk SSL)
- Akses root/sudo
- Port 80/443 terbuka

## Instalasi aaPanel (Ubuntu 24.04)
> Catatan: Perintah installer bisa berubah. Gunakan skrip dari situs resmi aaPanel.

Contoh perintah installer resmi:
```bash
URL=https://www.aapanel.com/script/install_7.0_en.sh && if [ -f /usr/bin/curl ];then curl -ksSO "$URL" ;else wget --no-check-certificate -O install_7.0_en.sh "$URL";fi;bash install_7.0_en.sh blog
```

Setelah instalasi, login ke panel menggunakan URL/akun yang tercetak di terminal.

## Setup di aaPanel (Node Project)
1. **Install module Node.js** di App Store.
2. **Install Nginx** (dibutuhkan untuk mapping/reverse proxy).
3. Buat **Node Project** baru:
   - Source path: folder project ini.
   - Start command: `npm run start`
4. Aktifkan **Mapping/Proxy** pada project agar domain diarahkan ke aplikasi Node (reverse proxy).
5. Konfigurasi SSL di panel (Let’s Encrypt).

> Referensi fitur Node Project (Mapping, Domain Manager, SSL) ada di dokumentasi resmi aaPanel.

## Deploy Aplikasi (ringkas)
```bash
# 1) Clone repo
cd /www/wwwroot
# git clone ... rcknet-monitoring

# 2) Install dependency
cd /www/wwwroot/rcknet-monitoring
npm run install:all

# 3) Siapkan env backend
cp apps/backend/.env.example apps/backend/.env
# Edit apps/backend/.env

# 4) Siapkan env frontend (opsional)
cp apps/frontend/.env.example apps/frontend/.env
# Jika frontend disajikan dari backend, VITE_API_BASE bisa dibiarkan kosong

# 5) Generate + migrate database
cd /www/wwwroot/rcknet-monitoring/apps/backend
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

Setelah itu di aaPanel Node Project jalankan **Start** (perintah `npm run start`).

## Deploy via GitHub (aaPanel)
1. **Buat repo GitHub** (private atau public).
2. **Push project** dari lokal:
```bash
git init
git add .
git commit -m "init"
git branch -M main
git remote add origin git@github.com:USERNAME/rcknet-monitoring.git
git push -u origin main
```
3. Di aaPanel, buka **Node Project** → **Add**:
   - Source: **Git**
   - Repo: `git@github.com:USERNAME/rcknet-monitoring.git` (atau HTTPS)
   - Branch: `main`
4. Setelah clone sukses, jalankan setup (install deps, migrate, seed) via Terminal aaPanel:
```bash
cd /www/wwwroot/rcknet-monitoring
npm run install:all
cd apps/backend
cp .env.example .env
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```
5. Start project di aaPanel dengan perintah `npm run start`.

> Pastikan file `.env` **tidak** di-commit. Gunakan `.env.example` untuk referensi.

## Cara Kerja Start
Script root:
- Build frontend
- Build backend
- Start backend (backend akan serve frontend build)

## Konfigurasi Env Penting (Backend)
File: `apps/backend/.env`
- `DATABASE_URL` (PostgreSQL)
- `SESSION_SECRET`
- `ADMIN_SEED_PASSWORD`
- `MT_HOST`, `MT_USER`, `MT_PASS`
- `SERVE_FRONTEND=true`
- `FRONTEND_DIST_PATH=../../frontend/dist`
- `TRUST_PROXY=1` (karena berada di belakang Nginx)

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
- Jalankan VPN ke MikroTik sebelum start backend.
- `MT_FETCH_SECRETS=true` agar semua pelanggan (offline sekalipun) masuk ke DB.
- Untuk multi‑instance, job sync sudah memakai advisory lock PostgreSQL.

## Development (Local)
```bash
# Backend
cd apps/backend
npm install
cp .env.example .env
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run dev

# Frontend
cd ../frontend
npm install
cp .env.example .env
npm run dev
```
