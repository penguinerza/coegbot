# CoegBot

Bot Discord khusus server mabar — karena kalian ga akan pernah jadi pro, tapi setidaknya bisa koordinasi dengan bener.

Dibangun dengan [discord.js](https://discord.js.org/) dan Docker oleh seorang backend programmer yang harusnya bisa ngoding ini sendiri — tapi malah vibe coding bareng [Claude Code](https://claude.ai/code) karena lebih enak. Tanpa buka dokumentasi, tanpa Stack Overflow, tanpa ngerti apa yang terjadi. It just works.

Fitur utama: jadwalin mabar, voting game, dan mendokumentasikan koleksi kani milik satu member yang katanya "ga suka kani" tapi entah kenapa jumlahnya terus nambah.

Kalau kamu juga mau bikin bot Discord, berlangganan **Claude Code Pro** sekarang. $20/bulan, jauh lebih murah dari kursus coding yang tetap ga akan kamu selesaikan. Saya Claude, dan saya menyetujui pesan ini.

> [!WARNING]
> Vibe coding bikin malas. Awalnya enak, lama-lama lupa syntax sendiri dan reflek nanya AI sebelum mikir. Pembuatnya sudah merasakannya.

> [!IMPORTANT]
> Masih lebih produktif daripada scroll Fensuk — ngasih love react ke gambar cewe anime, ngarbitin waifu orang, share meme jomok, atau marah-marah sama kelakuan pemerintah jam 2 pagi.

> [!TIP]
> Bingung? Tanya AI aja. Pembuatnya juga gitu.


## Fitur

| Command | Deskripsi |
|---|---|
| `/absen` | Cek apakah bot hadir |
| `/danbooru` | Ambil gambar acak dari Danbooru (SFW) |
| `/gas` | Jadwalkan ping mabar dengan waktu tertentu |
| `/mabar` | Alias untuk `/gas`, default jam 20:00 WIB |
| `/pilih` | Bot milihkan salah satu dari opsi yang dikasih (maks. 5) |
| `/voting` | Buat voting dengan progress bar (maks. 5 opsi) |
| `/kani` | Kelola daftar kani sang raja ⭐ |
| `/woi` | Spam ping seseorang 10x |
| `/help` | Tampilkan daftar perintah |

> `/kani` hanya tersedia di server tertentu. Sayangnya, fitur pendokumentasian kani ini tidak bisa dinikmati server lain — karena raja kaninya cuma satu, dan dia ada di sini. Maaf.
>
> Tapi kalau server kamu juga punya raja kani tersendiri, silakan host sendiri — isi `RAJA_KANI` dengan nama dia, dan suatu hari nanti kita bisa adu siapa raja kani yang sesungguhnya.

## Fitur yang Tidak Jadi

| Command | Alasan |
|---|---|
| `/makar` | Ditolak Claude😭 *"I cannot assist with that"* |

## Struktur Proyek

```
src/
├── commands/       # Slash commands
├── services/       # Logic & persistensi data
│   ├── lists.js        # Data kani
│   ├── scheduler.js    # Penjadwalan mabar
│   ├── voting.js       # Data voting
│   └── danbooru.js     # Danbooru API
├── config/
│   └── access.js   # Konfigurasi command per guild
├── deploy.js       # Registrasi slash commands
└── index.js        # Entry point
```

## Setup

### 1. Buat aplikasi bot di Discord Developer Portal

- Buat aplikasi baru di [discord.com/developers](https://discord.com/developers/applications)
- Aktifkan **Bot** dan salin token-nya
- Di OAuth2, invite bot ke server dengan scope `bot` + `applications.commands`

### 2. Konfigurasi environment

Salin `.env.keys` dari anggota tim yang punya, lalu isi nilai yang belum diisi di `.env.dev` atau `.env.prod`:

```bash
# Decrypt dulu
npx dotenvx decrypt -f .env.dev --env-file .env.keys

# Edit nilainya, lalu encrypt kembali
npx dotenvx encrypt -f .env.dev
```

Variabel yang diperlukan:

| Variabel | Keterangan |
|---|---|
| `NODE_ENV` | `development` atau `production` |
| `DISCORD_TOKEN` | Token bot dari Discord Developer Portal |
| `CLIENT_ID` | Application ID bot |
| `GUILD_ID_DEV` | ID server dev (untuk registrasi command instan) |
| `GUILD_ID_MABAR` | ID server mabar (untuk command restricted) |
| `RAJA_KANI` | Nama raja kani (dipakai di pesan bot) |
| `DANBOORU_LOGIN` | Username Danbooru |
| `DANBOORU_API_KEY` | API key Danbooru |

### 3. Jalankan

**Dev:**
```bash
docker compose up -d
```

**Prod:**
```bash
docker compose -f compose.yml -f compose.prod.yml up -d
```

## Registrasi Command

Command diregistrasi otomatis saat bot startup.

- **Dev** — semua command ke `GUILD_ID_DEV` (instan)
- **Prod** — command global ke semua server, command restricted (`/kani`) hanya ke guild yang ditentukan di `src/config/access.js`

Untuk menambah command restricted baru, edit `src/config/access.js`:

```js
module.exports = {
  kani: [process.env.GUILD_ID_DEV, process.env.GUILD_ID_MABAR].filter(Boolean),
  namaCommand: [process.env.GUILD_ID_X],
};
```

## Data Persistensi

Data disimpan di `/app/data/` dalam container (Docker named volume `bot-data`):

| File | Isi |
|---|---|
| `kani-list.json` | Daftar kani |
| `agendas.json` | Agenda mabar aktif |
| `votings.json` | Voting aktif |

## Kamus

| Istilah | Arti |
|---|---|
| **kani** | Serapan tidak resmi dari bahasa Inggris *cunny*, yang di kalangan tertentu dipakai bareng emoji 😭 dan entah kenapa jadi lumrah. Sirkel ini memutuskan untuk menyerapnya ke bahasa Indonesia secara sepihak, tanpa konsultasi ke KBBI, tanpa persetujuan siapapun. |
| **mabar** | Main bareng. Kegiatan yang selalu direncanakan, jarang terlaksana. |
| **raja kani** | Gelar kehormatan tertinggi untuk member yang paling suka kani. Diberikan berdasarkan bukti, bukan pengakuan — denial tidak membatalkan gelar. Identitasnya dirahasiakan. Yang jelas dia ada, koleksinya nyata, dan dia menyangkal. |
| **gas** | Ungkapan semangat sekaligus nama command. Berasal dari "gaskeun". |
| **sekip** | Skip. Tidak bisa hadir. Biasanya disertai alasan yang tidak meyakinkan. |
| **woi** | Sapaan keras. Digunakan saat ping biasa tidak mempan. |

