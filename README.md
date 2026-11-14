# Kopas

Tulis teks di satu device, buka di device lain dengan **code + PIN**, tanpa akun dan tanpa login.
Teks dienkripsi di browser (end-to-end), jadi server dan database hanya menyimpan ciphertext.

## Fitur

- **Code + PIN**: setiap tulisan mendapat code 6 karakter (misalnya `K7Q2XM`) dan link `/c/<CODE>`.
- **Enkripsi end-to-end**: AES-GCM dengan kunci yang diturunkan dari PIN (PBKDF2, 600k iterasi). PIN dan teks asli tidak pernah dikirim ke server.
- **Masa simpan**: 10 menit, 1 jam, 1 hari, 7 hari, atau permanen.
- **Hapus setelah dibaca**: opsional, tulisan langsung dihapus setelah dibuka sekali.
- **Proteksi brute force**: setelah 5 kali PIN salah, tulisan dihapus otomatis.
- **Tanpa autofill**: field PIN dan code tidak memicu "Simpan password?" di browser.
- **Tema** terang, gelap, atau mengikuti sistem.

## Cara kerja

```
Device A (menulis)                         Server / Supabase
──────────────────                         ─────────────────
PIN + salt ─PBKDF2─▶ 512 bit
  ├─ 256 bit pertama → kunci AES-GCM ─▶ enkripsi teks
  └─ 256 bit berikutnya → authToken
kirim {ciphertext, iv, salt, authToken} ─▶ simpan ciphertext, iv, salt,
                                           sha256(authToken), lalu kembalikan code

Device B (membuka)
──────────────────
getSalt(code) ◀──────────────────────────── salt
PIN + salt ─PBKDF2─▶ kunci AES + authToken
openNote(code, authToken) ─────────────────▶ cocokkan hash (maks 5 percobaan)
                         ◀───────────────── ciphertext + iv (hanya jika PIN benar)
dekripsi di browser ─▶ teks asli
```

Ciphertext hanya dikirim setelah PIN terverifikasi, jadi orang yang hanya tahu code tidak bisa
menebak PIN secara offline. **Batasan:** pihak yang punya akses langsung ke database bisa mencoba
menebak PIN secara offline dari hash-nya. Karena itu gunakan PIN atau frasa yang panjang.

## Teknologi

- [Next.js 16](https://nextjs.org) (App Router, Server Actions, Cache Components) dan React 19
- Tailwind CSS 4
- [Supabase](https://supabase.com) (Postgres, RLS, pg_cron) via `@supabase/supabase-js`
- WebCrypto API untuk enkripsi di browser

## Setup

### 1. Install dependency

```bash
npm install
```

### 2. Siapkan Supabase

1. Buat project di [supabase.com/dashboard](https://supabase.com/dashboard).
2. Buka **SQL Editor**, tempel seluruh isi [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql), lalu **Run**.
   - Jika baris `create extension pg_cron` gagal, aktifkan **pg_cron** dulu lewat **Database → Extensions**, lalu jalankan ulang.
   - Jika aplikasi masih melaporkan `Could not find the table 'public.notes' in the schema cache`, jalankan:
     ```sql
     notify pgrst, 'reload schema';
     ```

Migration ini membuat:

| Objek                     | Fungsi                                                                                  |
| ------------------------- | --------------------------------------------------------------------------------------- |
| tabel `notes`             | menyimpan ciphertext, iv, salt, hash authToken, masa simpan, dan jumlah percobaan gagal |
| RLS tanpa policy          | tabel tertutup untuk key `anon` dan `publishable`, hanya bisa diakses server            |
| fungsi `open_note`        | verifikasi PIN, hitung percobaan gagal, dan hapus setelah dibaca, semuanya atomik       |
| job `kopas-purge-expired` | pg_cron yang menghapus tulisan kedaluwarsa tiap 15 menit                                |

### 3. Environment variables

```bash
cp .env.example .env
```

| Variabel                    | Lokasi di Dashboard Supabase                                                                        |
| --------------------------- | --------------------------------------------------------------------------------------------------- |
| `SUPABASE_URL`              | Project Settings → Data API → **Project URL**                                                       |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API Keys → **Secret key** (`sb_secret_...`) atau tab **Legacy** → `service_role` |

> ⚠️ Key ini memberi akses penuh ke database. Jangan beri prefix `NEXT_PUBLIC_` dan jangan di-commit.

### 4. Jalankan

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

## Struktur proyek

```
app/
  actions.ts          Server actions: createNote, getSalt, openNote
  page.tsx            Halaman utama: form tulis dan form buka dengan code
  c/[code]/page.tsx   Halaman buka tulisan (input PIN)
  layout.tsx          Layout, script tema, dan ThemeToggle
components/
  CreateForm.tsx      Form tulis: enkripsi lalu simpan, menampilkan code dan link
  OpenCodeForm.tsx    Input code di halaman utama
  OpenNote.tsx        Input PIN, verifikasi, lalu dekripsi
  PinInput.tsx        Input PIN tersamar tanpa memicu password manager
  ThemeToggle.tsx     Pilihan tema Terang / Gelap / Sistem
  CopyButton.tsx
lib/
  crypto.ts           Enkripsi E2E dengan WebCrypto (dijalankan di client)
  supabase.ts         Client Supabase dengan service key (khusus server)
  shared.ts           Konstanta & helper yang dipakai client dan server
supabase/migrations/  Skema database
```

## Scripts

| Perintah        | Keterangan           |
| --------------- | -------------------- |
| `npm run dev`   | Development server   |
| `npm run build` | Build production     |
| `npm start`     | Jalankan hasil build |
| `npm run lint`  | ESLint               |

## Deploy

Bisa di-deploy ke [Vercel](https://vercel.com) atau hosting lain yang mendukung Next.js. Isi
`SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY` di pengaturan Environment Variables platform tersebut.
Jika berjalan di lebih dari satu instance, set juga `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` dengan nilai
yang sama di semua instance.

## Troubleshooting

| Masalah                                                   | Solusi                                                                          |
| --------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `Could not find the table 'public.notes'`                 | Migration belum dijalankan, atau schema cache perlu di-reload (lihat langkah 2) |
| `SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY harus di-set` | Isi `.env`, lalu restart dev server                                             |
| Perubahan CSS tidak muncul                                | Hapus cache build: `rm -rf .next && npm run dev`                                |
| Tombol salin tidak berfungsi                              | Clipboard API butuh HTTPS atau `localhost`                                      |
