# Deploy Guide

Bot ini di-deploy otomatis ke PC rumah via GitHub Actions (self-hosted runner) setiap push ke branch `main`.

## Prasyarat

- Docker & Docker Compose terinstall di PC
- GitHub Actions runner terinstall dan berjalan sebagai service
- File `.env.prod` sudah ada di repo (sudah dienkripsi, aman di-commit)
- File `.env.keys` **tidak** di-commit — private key disimpan sebagai GitHub secret

---

## Setup Awal (sekali saja)

### 1. Tambah GitHub Secret

Buka repo → **Settings → Secrets and variables → Actions → New repository secret**

| Name | Value |
|---|---|
| `DOTENV_PRIVATE_KEY_PRODUCTION` | Isi `DOTENV_PRIVATE_KEY_PRODUCTION` dari file `.env.keys` di PC |

### 2. Install Self-hosted Runner

Buka repo → **Settings → Actions → Runners → New self-hosted runner**

Ikuti instruksi yang muncul (pilih OS Linux), lalu jalankan sebagai service supaya tetap aktif setelah PC restart:

```bash
sudo ./svc.sh install
sudo ./svc.sh start
```

---

## Deployment

Setiap push ke `main` akan otomatis:

1. Checkout kode terbaru
2. Tulis `.env.keys` dari secret
3. Build ulang Docker image
4. Restart container (`docker compose -f compose.prod.yml up -d`)
5. Hapus `.env.keys` dari workspace

Data bot (kani list, agendas, votings) tersimpan di Docker named volume `bot-data` — tidak hilang saat redeploy.

---

## Manual Deploy

Kalau perlu deploy manual tanpa push:

```bash
# Pastikan .env.keys ada di direktori proyek
docker compose -f compose.prod.yml build
docker compose -f compose.prod.yml up -d
```

## Cek Status

```bash
docker compose -f compose.prod.yml ps
docker compose -f compose.prod.yml logs -f
```
