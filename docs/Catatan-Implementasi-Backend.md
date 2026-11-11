# Catatan Implementasi Backend

Dokumen ini mencatat kondisi implementasi backend saat ini, keputusan yang sudah diambil, dan pekerjaan yang sebaiknya dilakukan berikutnya. Rancangan API lengkap tetap mengacu pada [Analisis Skema API Bimba AIUEO Galuh](./Analisis-Skema-API-Bimba-AIUEO-Galuh.md); inventaris route dan panduan penggunaan ada di [API Backend](./API-Backend.md).

## Ringkasan

- API dibuat dengan Next.js App Router pada prefix `/api/v1`.
- Semua handler API yang ada menggunakan pola **route → service → repository**. Route tidak menjalankan query Prisma langsung.
- Pembayaran pendaftaran menggunakan transfer manual, upload bukti, dan keputusan verifikasi oleh admin. Payment gateway dan webhook tidak digunakan.
- File baru disimpan sementara di database MySQL sebagai `LONGBLOB` (`MediaAsset.content`), dengan batas unggah 5 MB.
- Integrasi email untuk pemulihan kata sandi belum diaktifkan; endpoint reset bekerja dengan token, tetapi produksi belum mengirim email pemulihan.
- Perubahan skema terakhir belum tentu sudah diterapkan ke database lokal atau server; lihat bagian migrasi.

## Arsitektur backend

Alur request yang diharapkan:

```text
HTTP request
  → src/app/api/v1/**/route.ts
  → src/server/services/<domain>/*.service.ts
  → src/server/repositories/<domain>/*.repository.ts
  → Prisma / MySQL
```

### Tanggung jawab tiap lapisan

| Lapisan | Tanggung jawab | Hindari |
|---|---|---|
| `src/app/api/v1/**/route.ts` | Method/URL, autentikasi dan pemeriksaan awal HTTP, membaca parameter/body, rate limit HTTP, memanggil service, membentuk status/response. | Query Prisma, aturan status domain, transaksi bisnis panjang. |
| `src/server/services/<domain>/` | Aturan bisnis, otorisasi berbasis resource/cabang, koordinasi repository, dan batas transaksi yang menggabungkan beberapa operasi. | Membaca `Request`/`Response` atau membuat format transport HTTP. |
| `src/server/repositories/<domain>/` | Query dan perubahan persisten melalui Prisma; menerima `TransactionClient` bila operasi menjadi bagian dari transaksi service. | Menentukan izin pengguna atau mengirim respons HTTP. |
| `src/server/mappers/` | Mengubah hasil database menjadi DTO API dan menyembunyikan detail internal bila pemetaan kompleks/berulang. | Menjalankan query database. |
| `src/server/http/` | Infrastruktur bersama seperti parsing, response/error, CSRF, rate limit, dan idempotensi. Operasi persistensinya diteruskan ke repository HTTP. | Menyimpan aturan bisnis khusus domain. |

Service boleh mengatur batas transaksi agar beberapa operasi menjadi atomik; query di dalam transaksi tetap dilakukan melalui repository. Untuk fitur sederhana, tidak perlu menambah mapper jika pemetaan langsung di service tetap jelas.

### Domain yang sudah dipisahkan

Saat catatan ini dibuat, route yang tersedia telah diarahkan ke service dan repository per domain: autentikasi, cabang, pendaftaran, pembayaran, murid/SPP, staf, kegiatan, pesan, media, pengaturan, dashboard, audit log, dan ekspor. Endpoint publik untuk site, cabang, staf, kegiatan, pesan, media, status pendaftaran, instruksi pembayaran, serta upload bukti juga menggunakan service dan repository.

Pemeriksaan source terakhir tidak menemukan pemanggilan `prisma.*` atau `transaction.*` langsung di folder `src/app/api/v1/**`. Pemeriksaan ini memverifikasi pemisahan kode, bukan kebenaran seluruh perilaku terhadap server MySQL hidup.

## API yang tersedia

Semua endpoint memakai prefix `/api/v1`. Detail input, role, dan response ada di [API-Backend.md](./API-Backend.md).

### Publik

- Site, daftar/detail cabang, pendidik, kegiatan, media publik, dan pesan.
- Pendaftaran baru, pemeriksaan status dengan access token, serta instruksi pembayaran.
- Upload bukti pembayaran menggunakan access token dan `Idempotency-Key`.

### Autentikasi

- Login, logout, sesi pengguna (`me`), forgot-password, dan reset-password.
- Login membuat cookie sesi `HttpOnly`; endpoint `me` memerlukan cookie sesi yang sama.
- Forgot-password belum mengirim email di produksi; saat SMTP tidak tersedia endpoint mengembalikan `503`.

### Admin

- Dashboard; daftar/detail/perubahan/transisi/arsip pendaftaran; review bukti pembayaran.
- CRUD yang diperlukan untuk murid, cabang, pendidik, kegiatan, dan pesan.
- Invoice serta pembayaran SPP, pencatatan pengiriman seragam, dan kelulusan murid.
- Upload dan akses media privat; review publikasi kegiatan.
- Pengaturan, audit log, serta ekspor CSV pendaftaran, murid, dan laporan.

### Pembayaran manual

Alur yang diterapkan:

1. Pendaftaran membuat transaksi manual dan menampilkan instruksi transfer dari pengaturan admin.
2. Wali mengunggah bukti pembayaran; berkas divalidasi dan disimpan sebagai blob bersama metadata.
3. Admin memeriksa bukti dan memilih setujui atau tolak dengan alasan bila ditolak.
4. Persetujuan memperbarui transaksi dan status pendaftaran serta membuat/mengaktifkan murid dalam satu alur transaksi.

Tidak ada charge otomatis, callback provider, atau webhook. Redirect browser tidak pernah dianggap sebagai bukti pembayaran.

## Penyimpanan berkas

Kolom `MediaAsset.content` bertipe nullable `Bytes` dengan native type MySQL `LONGBLOB`. Kolom dibuat nullable untuk mengakomodasi record media lama; endpoint file baru menolak asset yang tidak memiliki konten tersimpan.

Validasi upload saat ini membatasi ukuran file sampai 5 MB dan memeriksa signature JPEG, PNG, WebP, atau PDF. File dilayani melalui endpoint media publik yang memenuhi kondisi publikasi/consent atau endpoint privat yang memeriksa scope cabang.

Penyimpanan blob di database adalah solusi sementara. Pertimbangkan object storage privat sebelum volume file membesar karena ukuran database, proses backup, biaya, dan pemulihan dapat meningkat.

## Migrasi yang perlu dijalankan

Perubahan source/schema tidak otomatis mengubah database. Sebelum menguji upload setelah perubahan `MediaAsset.content`, jalankan migrasi dan generate client:

```bash
npx prisma migrate dev --config prisma.config.ts --name database_media_storage
npx prisma generate --config prisma.config.ts
```

Migrasi ini bisa mencakup perubahan skema yang sebelumnya masih tertunda, termasuk kolom arsip pendaftaran, unique nomor telepon wali, dan kolom blob. Jika ada nomor wali duplikat, bersihkan datanya terlebih dahulu. Periksa SQL migration sebelum menerapkannya pada database berisi data penting dan pastikan backup tersedia.

Database tidak diuji integrasi setelah migrasi ini disusun; konfirmasi keberhasilan migrasi dan operasi endpoint secara lokal.

## Hal yang perlu diperbaiki atau ditambahkan

### Prioritas sebelum menerima data nyata

1. **Terapkan dan verifikasi migrasi database.** Jalankan migrasi di atas, pastikan tidak ada kegagalan akibat data duplikat, lalu uji endpoint dengan database lokal.
2. **Uji alur ujung-ke-ujung.** Minimal: bootstrap admin → login → `me` → pendaftaran → instruksi transfer → upload bukti → penolakan dan unggah ulang → persetujuan → murid terbentuk. Uji juga replay idempotency dan akses lintas cabang.
3. **Siapkan keamanan dan operasi database.** Gunakan rahasia `APP_TOKEN_SECRET` yang kuat, backup terenkripsi, hak akses minimum, kebijakan retensi, serta prosedur pemulihan. Data yang disimpan meliputi data anak, wali, dan bukti pembayaran.
4. **Pastikan kebijakan privasi dan consent.** Verifikasi versi consent, penarikan consent media, retensi/hapus data, dan pembatasan siapa yang dapat mengunduh bukti transaksi.

### Peningkatan yang direncanakan

- Integrasi SMTP/email untuk reset password dengan token sekali pakai; jangan mencatat URL/token sensitif di log produksi.
- Pindahkan file dari `LONGBLOB` ke object storage privat, gunakan URL akses berumur pendek bila sesuai, dan tambahkan malware scanning.
- Tambahkan tes integrasi API terhadap MySQL untuk transaksi, idempotensi, race condition, scope cabang, upload, dan audit.
- Tambahkan pembersihan berkala untuk rate-limit bucket, idempotency records, token reset kedaluwarsa, dan data sementara.
- Tinjau batas ukuran request di reverse proxy/deployment agar konsisten dengan limit 5 MB aplikasi.
- Evaluasi observabilitas: log terstruktur, korelasi request, monitoring kegagalan upload/login, serta alert untuk backup dan kapasitas database.
- Review pagination, indeks query, dan performa ekspor ketika jumlah pendaftaran/murid bertambah.
- Dokumentasikan contoh request/response, kode error, role yang diizinkan, serta status transisi secara konsisten. Pertimbangkan OpenAPI setelah kontrak API stabil.
- Webhook gateway **tidak termasuk scope saat ini**. Tambahkan hanya bila lembaga memilih provider dan memang membutuhkan konfirmasi pembayaran otomatis.

## Verifikasi kode terakhir

Pemeriksaan terakhir sebelum dokumen ini dibuat:

- `npm run lint` — lulus.
- `npx tsc --noEmit` — lulus.
- `npm test` — 5 tes lulus.
- `npx prisma validate --config prisma.config.ts` — lulus.
- `npm run build` — lulus dan mendeteksi route API yang ada.
- Pencarian route untuk query Prisma langsung — tidak ditemukan.

Hasil tersebut adalah validasi build/unit test. Itu bukan pengganti migrasi database atau tes integrasi terhadap MySQL.
