# Analisis, Skema Database, dan Rancangan API
## Sistem Informasi BIMBA AIUEO Galuh

**Tanggal analisis:** 11 November 2026  
**Sumber utama:** [Prototype.html](./Prototype.html)  
**Rancangan pendukung:** diagram konseptual, use case, activity diagram, dan sequence diagram di dalam `perancangan.zip`.

> **Catatan penting:** `Prototype.html` adalah prototipe front-end yang seluruh logika dan datanya berjalan di browser. Dokumen ini membedakan perilaku yang benar-benar tampak pada prototipe dari rancangan backend produksi. Endpoint API dan skema di bawah adalah usulan; belum ada server/API/database yang terhubung.

---

## 1. Ringkasan eksekutif

Proyek ini bertujuan menjadi **situs informasi sekaligus sistem operasional pendaftaran dan pengelolaan murid BIMBA AIUEO Galuh**, untuk calon wali murid dan pengelola cabang di wilayah Kuningan. Ruang lingkup konseptualnya mencakup:

- Informasi lembaga, program, cabang, pendidik, kegiatan, kontak, dan privasi.
- Pencarian cabang dan penunjuk lokasi.
- Pendaftaran calon murid, pemeriksaan duplikasi, instruksi pembayaran, unggah bukti, dan pengecekan status.
- Verifikasi pendaftaran/pembayaran oleh admin.
- Pengelolaan data murid, SPP, seragam, dan kelulusan.
- Pengelolaan cabang, pendidik, kegiatan/media, pesan, ringkasan dashboard, serta ekspor CSV.

**Kesimpulan utama:** konsep bisnis dan alur wali → pembayaran → verifikasi admin → murid cukup jelas, serta selaras dengan diagram yang disertakan. Namun implementasi HTML masih **simulasi**, bukan sistem transaksi yang aman atau persisten untuk operasional riil. Data, kredensial, aturan akses, dan status berada di sisi klien; VA dan data kontak adalah contoh; belum ada API, penyimpanan file server, gateway pembayaran, atau jejak audit server.

Sebelum dipakai sungguhan, prioritasnya adalah:

1. Memindahkan data dan semua keputusan validasi/otorisasi ke backend.
2. Memisahkan entitas **pendaftaran**, **murid aktif**, dan **transaksi pembayaran**.
3. Mengamankan data anak dan wali, termasuk bukti transfer dan foto/video.
4. Menetapkan transisi status, persetujuan, retensi, serta akses per cabang.
5. Menguji skenario pendaftaran, pembayaran, verifikasi, duplikasi, dan pemulihan data dari ujung ke ujung.

---

## 2. Batas analisis dan bukti yang diamati

Analisis mencakup halaman publik, formulir, navigasi hash, data contoh, fungsi admin, dan diagram rancangan dalam arsip. Nama fungsi dan rute yang terlihat di prototipe antara lain `registration`, `submitReg`, `payPage`, `confirmation`, `checkStatus`, `login`, `admin`, `adminContent`, `muridManage`, serta `branchModal`.

### Yang memang sudah ada di prototipe

- Halaman publik: beranda, tentang, cabang/detail cabang, pendidik, galeri, kontak, privasi, pendaftaran, pembayaran, konfirmasi, dan cek status.
- Admin demo dengan modul dashboard, pendaftaran, murid, cabang, pendidik, kegiatan/media, serta pesan/saran.
- Validasi browser untuk sebagian isian pendaftaran dan pencegahan duplikasi sederhana berdasarkan nama murid + nama wali + cabang.
- Status contoh pendaftaran, unggah bukti gambar, persetujuan/penolakan admin, histori pada objek pendaftaran, dan ekspor CSV.
- Data contoh cabang, personel, kegiatan, dan pesan; peta yang digambar/ditiru di browser, bukan integrasi peta nyata.
- Penyimpanan objek demo melalui `localStorage` dengan kunci `bimba-galuh-demo`.

### Yang belum terbukti/tersedia sebagai layanan produksi

- Tidak ditemukan pemanggilan backend/API maupun koneksi database.
- Tidak ada autentikasi/otorisasi server, sesi server, atau pembatasan akses data cabang di server.
- Kredensial admin demo dicantumkan di UI dan diperiksa oleh JavaScript.
- VA, nominal pendaftaran, bank, nomor kontak, alamat, dan sebagian isi lembaga ditandai sebagai data demo/contoh.
- Unggah bukti disimpan sebagai data URL/Base64 di browser, bukan object storage.
- Persetujuan galeri (`ok`) bukan alur consent terpisah yang dapat diaudit per orang/media.
- Reset kata sandi hanya simulasi; tidak ada email yang dikirim.
- Di alur submit pendaftaran publik, record ditambahkan ke state, tetapi tidak terlihat pemanggilan `persist()` sebelum navigasi. Karena itu pendaftaran yang belum melewati aksi lain yang menyimpan data dapat hilang saat halaman dimuat ulang.

---

## 3. Konsep, tema, dan pengalaman pengguna

### 3.1 Konsep produk

Produk menggabungkan **situs profil lembaga** dan **portal layanan pendaftaran/pengelolaan**. Wali murid seharusnya dapat memahami program dan menemukan cabang sebelum mendaftar; pengelola kemudian memakai satu sistem untuk memeriksa calon murid, mengelola pembayaran, mengaktifkan murid, dan memperbarui informasi cabang.

Pemisahan peran yang tersirat:

- **Pengunjung/wali murid:** membaca informasi, mencari cabang, mendaftar, mengirim pesan, mengunggah bukti, dan memeriksa status.
- **Admin/pengelola:** memverifikasi data/bukti dan mengelola murid, cabang, pendidik, galeri, pesan, serta laporan.
- **Pendidik/pengelola cabang:** merupakan data organisasi yang ditampilkan; belum ada portal atau hak akses mandiri yang lengkap di prototipe.

Use case dan diagram aktivitas mengonfirmasi dua alur inti: pendaftaran dan verifikasi pembayaran, serta pengelolaan data murid (SPP, seragam, status lulus).

### 3.2 Tema visual dan pesan

- **Identitas:** nama “Bimba AIUEO Galuh”, warna biru-teal, kuning hangat, bentuk kartu membulat, dan huruf/ikon yang ramah anak.
- **Pesan utama:** belajar membaca, menulis, dan berhitung dengan senang hati; menonjolkan pendampingan dini, cabang lokal, pendidik, serta kegiatan anak.
- **Gaya interaksi:** navigasi sederhana, CTA “Daftar Sekarang”, kartu cabang/kegiatan, label status, formulir bertahap/sederhana, modal admin, dan responsif untuk layar kecil.
- **Arah brand:** edukatif, dekat dengan keluarga, ramah, dan berorientasi komunitas lokal.

### 3.3 Hal yang perlu dipastikan secara konten

Di prototipe ada tanggal/tahun ajaran 2026/2027, jumlah murid/cabang, nama pendidik, alamat, fasilitas, jam layanan, biaya, nomor VA, kontak, dan kebijakan privasi. Sebagian secara eksplisit diberi label contoh/placeholder. Sebelum publikasi, pemilik lembaga perlu memverifikasi seluruh klaim, foto, biaya, alamat/pin cabang, nomor kontak, kebijakan penerimaan, serta informasi organisasi. Peta bergaya Google Maps saat ini hanya visual demo dengan koordinat sintetis; jangan dianggap sebagai titik lokasi sebenarnya.

---

## 4. Audit konsep dan alur program

### 4.1 Alur pengunjung dan informasi

1. Pengunjung membuka beranda dan memahami program/CTA.
2. Pengunjung membaca Tentang, Pendidik, Galeri, atau Kontak.
3. Pada Cabang, pengunjung mencari berdasarkan nama/wilayah dan melihat kartu serta peta demo.
4. Detail cabang menyediakan informasi cabang dan tautan ke pendaftaran dengan cabang terpilih.

**Catatan audit:** menu Cabang adalah pintu penting untuk konversi. Informasi cabang, jam, nomor kontak, fasilitas, status aktif, dan koordinat harus memiliki satu sumber data terverifikasi yang sama untuk halaman publik, dashboard, dan formulir.

### 4.2 Alur pendaftaran dan pembayaran

1. Wali mengisi nama anak, tanggal lahir, agama, jenis kelamin, umur, alamat, nama/kontak wali, cabang, opsi kunjungan/catatan, dan persetujuan.
2. Browser memeriksa kelengkapan, rentang usia 2–7 tahun, format nomor WA, cabang, dan persetujuan.
3. Sistem mencari pendaftaran duplikat berdasarkan nama anak, nama wali, dan cabang.
4. Record dibuat dengan nomor demo `DEMO-2026-xxx` dan status **Menunggu Pembayaran**.
5. Halaman pembayaran menampilkan VA statis dan nominal demo; wali mengunggah gambar bukti.
6. Setelah bukti diunggah, status berubah menjadi **Menunggu Verifikasi**.
7. Admin membuka detail dan memilih ACC atau menolak bukti. ACC mengubah status menjadi **Dikonfirmasi**; penolakan mengubah status menjadi **Ditolak**.
8. Status yang dikonfirmasi kemudian masuk ke modul **Murid Terdaftar**; wali dapat mencari status memakai nomor registrasi dan nomor kontak.

**Masalah desain/alur yang perlu diselesaikan:**

- `umur` dikirim/disimpan terpisah dari tanggal lahir. Umur berubah dan dapat tidak konsisten; umur sebaiknya dihitung dari tanggal lahir di backend/UI dan tidak menjadi sumber kebenaran tersendiri.
- Data persetujuan diwakili checkbox dan waktu umum. Sistem perlu menyimpan versi kebijakan, tujuan persetujuan, waktu, status pencabutan, dan siapa yang memberi persetujuan. Persetujuan pendaftaran dan izin publikasi foto/video anak harus menjadi persetujuan berbeda.
- Pengecekan duplikasi berbasis tiga teks rawan variasi ejaan, perubahan nama, dan pengiriman bersamaan. Backend harus punya idempotency dan aturan tinjau duplikasi, bukan mengandalkan perbandingan browser.
- Unggah bukti belum memiliki batas ukuran/format di server, pemeriksaan file, pemindaian malware, atau penyimpanan privat. Gambar Base64 juga membengkakkan `localStorage`.
- Tidak ada integrasi pembayaran yang mengonfirmasi uang masuk; bukti hanya diperiksa manual. Status “Dikonfirmasi” berarti keputusan pengelola, bukan konfirmasi otomatis bank.
- Tombol “cek status” memakai nomor pendaftaran dan kontak sebagai verifikasi. Respons produksi sebaiknya tidak mengungkap data sensitif dan perlu pembatasan percobaan di server.

### 4.3 Alur admin dan pengelolaan murid

- Login demo menerima satu akun admin utama yang hard-coded di JavaScript; role cabang di sisi UI masih model konseptual, bukan permission backend.
- Dashboard menghitung status dari array lokal. Tabel pendaftaran menyediakan pencarian/filter, detail, edit, dan hapus.
- Pengelolaan murid berisi profil, SPP (Belum Bayar/Cukup/Sudah Bayar), tenggat/catatan, penerimaan seragam, dan kelulusan.
- Admin dapat mengelola cabang, data pendidik, kegiatan/media, serta pesan/saran; modul tertentu menampilkan atau mengekspor data.
- Ada histori pada record pendaftaran dan helper log aktivitas, tetapi histori dan log tersebut tidak tahan manipulasi di browser dan cakupan pencatatannya perlu konsisten.

**Perbaikan model proses:** jangan jadikan status pendaftaran sebagai status pembayaran sekaligus status akademik. Gunakan status pendaftaran, status transaksi, dan status murid yang terpisah. Persetujuan pembayaran yang berhasil harus dalam satu transaksi database membuat/menghubungkan murid, memperbarui pendaftaran, dan mencatat histori/audit.

---

## 5. Rekomendasi skema database

### 5.1 Prinsip desain

Rekomendasi berikut memakai PostgreSQL sebagai contoh relasional. Dapat diterapkan pada DB relasional lain dengan penyesuaian tipe data.

- UUID sebagai primary key; kode pendaftaran yang dapat dibaca manusia menjadi kolom unik terpisah.
- Waktu disimpan dalam UTC (`timestamptz`), lalu ditampilkan dalam zona `Asia/Jakarta`.
- Nominal Rupiah disimpan sebagai bilangan bulat rupiah, tidak sebagai `float`.
- Umur dihitung dari `birth_date`; jangan menyimpan nilai umur sebagai fakta permanen.
- Foto dan bukti pembayaran disimpan di object storage privat; database hanya menyimpan metadata dan object key.
- Data anak tidak dihapus tanpa kebijakan; gunakan status/soft-delete atau anonymisasi sesuai retensi.
- Setiap perubahan penting memiliki actor, waktu, nilai lama/baru, dan alasan.

### 5.2 Entitas dan relasi utama

| Tabel | Kolom penting | Relasi/keterangan |
|---|---|---|
| `branches` | `id`, `slug`, `name`, `area`, `address`, `latitude`, `longitude`, `phone`, `hours`, `facilities`, `description`, `active`, `verified` | Satu cabang memiliki banyak pendaftaran, murid, pendidik, kegiatan, serta pesan terkait. Jumlah murid sebaiknya dihitung, bukan menjadi angka statis. |
| `users` | `id`, `email`, `password_hash`, `full_name`, `active`, `last_login_at` | Akun staf/admin. Tidak menyimpan password asli. |
| `roles` | `id`, `code`, `name` | Mis. `super_admin`, `branch_admin`, `unit_head`, `teacher`. |
| `user_branch_roles` | `user_id`, `branch_id` (nullable untuk pusat), `role_id` | Menerapkan role dan batas cabang; satu staf dapat memiliki beberapa penugasan. |
| `guardians` | `id`, `name`, `phone_e164`, `email`, `address` | Wali dapat terkait dengan beberapa anak; nomor telepon dinormalisasi. |
| `registrations` | `id`, `registration_code`, `child_name`, `birth_date`, `religion`, `gender`, `address`, `guardian_id`, `branch_id`, `consultation_at`, `notes`, `status`, `submitted_at`, `reviewed_at`, `created_at`, `updated_at` | Permohonan masuk. Belum menjadi murid aktif sampai disetujui. |
| `registration_consents` | `id`, `registration_id`, `consent_type`, `policy_version`, `granted`, `granted_at`, `revoked_at` | Simpan persetujuan pendaftaran dan persetujuan lain secara terpisah. |
| `registration_status_history` | `id`, `registration_id`, `from_status`, `to_status`, `reason`, `changed_by`, `changed_at` | Histori transisi yang append-only. |
| `payment_transactions` | `id`, `registration_id`, `purpose`, `amount_idr`, `currency`, `status`, `provider`, `provider_reference`, `due_at`, `paid_at`, `verified_by`, `created_at` | Transaksi pendaftaran atau tagihan lain; satu pendaftaran dapat memiliki beberapa percobaan/transaksi. |
| `payment_proofs` | `id`, `payment_transaction_id`, `storage_key`, `mime_type`, `size_bytes`, `uploaded_at`, `review_status`, `reviewed_by`, `reviewed_at`, `rejection_reason` | Metadata bukti yang file-nya disimpan privat di object storage. |
| `students` | `id`, `registration_id` (nullable/unique), `branch_id`, `full_name`, `birth_date`, `religion`, `gender`, `address`, `status`, `enrolled_at`, `graduated_at`, `created_at`, `updated_at` | Murid aktif dibuat/ditautkan ketika pendaftaran disetujui; murid manual dapat tidak memiliki `registration_id`. |
| `student_guardians` | `student_id`, `guardian_id`, `relationship`, `is_primary` | Mengakomodasi lebih dari satu wali dan anak bersaudara. |
| `spp_invoices` | `id`, `student_id`, `period`, `amount_idr`, `due_at`, `status`, `notes` | Tagihan SPP per periode; unik per murid/periode. |
| `spp_payments` | `id`, `invoice_id`, `amount_idr`, `paid_at`, `method`, `reference`, `recorded_by` | Memisahkan pembayaran aktual dari status invoice. |
| `uniform_deliveries` | `id`, `student_id`, `item`, `quantity`, `delivered_at`, `recorded_by`, `notes` | Catatan seragam yang dapat dikembangkan untuk beberapa jenis/item. |
| `staff_members` | `id`, `branch_id` (nullable untuk pusat), `name`, `role_title`, `active`, `photo_asset_id`, `publication_status` | Data pemilik/KU/motivator/guru dan staf pusat. Role organisasi bukan otomatis role akses aplikasi. |
| `events` | `id`, `branch_id`, `title`, `category`, `description`, `event_date`, `publication_status`, `created_by`, `created_at` | Kegiatan cabang; hanya yang disetujui tampil di situs. |
| `media_assets` | `id`, `storage_key`, `mime_type`, `size_bytes`, `checksum`, `uploaded_by`, `created_at` | Metadata foto/dokumen. File privat/publik diatur melalui kebijakan akses; bukan Base64 dalam row. |
| `media_consents` | `id`, `media_asset_id`, `student_id` (nullable), `consent_type`, `policy_version`, `granted`, `granted_at`, `revoked_at` | Persetujuan publikasi per anak/media/tujuan; jangan menyamakan dengan persetujuan galeri admin. |
| `messages` | `id`, `name`, `contact`, `category`, `branch_id` (nullable), `body`, `status`, `created_at`, `handled_by`, `handled_at` | Pesan/saran dari situs publik; batasi spam dan akses internal. |
| `activity_logs` | `id`, `actor_user_id`, `branch_id`, `action`, `entity_type`, `entity_id`, `metadata`, `created_at` | Log audit server untuk perubahan penting; jangan simpan rahasia/file bukti di `metadata`. |
| `app_settings` | `key`, `value_json`, `updated_by`, `updated_at` | Konfigurasi seperti nominal dan instruksi pembayaran, jam, atau kontak. Rahasia integrasi tetap di secret manager. |

### 5.3 Status yang disarankan

**Pendaftaran (`registrations.status`):** `submitted`, `awaiting_payment`, `awaiting_verification`, `under_review`, `follow_up_required`, `confirmed`, `rejected`, `withdrawn`, `expired`.

**Pembayaran (`payment_transactions.status`):** `pending`, `proof_submitted`, `processing`, `verified`, `rejected`, `expired`, `refunded`.

**Murid (`students.status`):** `active`, `graduated`, `withdrawn`, `inactive`.

Gunakan label Indonesia di UI, tetapi kode stabil di database/API. Status seperti “SPP”, seragam, dan lulus tidak boleh ditumpangkan ke status pendaftaran. Tindakan tolak wajib menyimpan alasan; semua transisi dicatat dan divalidasi di server.

### 5.4 Contoh DDL inti (PostgreSQL)

DDL berikut merupakan titik awal; produksi tetap memerlukan migrasi, indeks sesuai pola query, kebijakan retensi, dan pengujian.

```sql
CREATE TABLE branches (
  id uuid PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  area text NOT NULL,
  address text,
  latitude numeric(9,6),
  longitude numeric(9,6),
  phone text,
  hours jsonb NOT NULL DEFAULT '{}'::jsonb,
  facilities text,
  description text,
  active boolean NOT NULL DEFAULT true,
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90),
  CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180)
);

CREATE TABLE guardians (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  phone_e164 text NOT NULL,
  email text,
  address text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE registrations (
  id uuid PRIMARY KEY,
  registration_code text NOT NULL UNIQUE,
  child_name text NOT NULL,
  birth_date date NOT NULL,
  religion text,
  gender text,
  address text NOT NULL,
  guardian_id uuid NOT NULL REFERENCES guardians(id),
  branch_id uuid NOT NULL REFERENCES branches(id),
  consultation_at timestamptz,
  notes text,
  status text NOT NULL DEFAULT 'submitted',
  submitted_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (status IN ('submitted','awaiting_payment','awaiting_verification',
    'under_review','follow_up_required','confirmed','rejected','withdrawn','expired'))
);
CREATE INDEX registrations_branch_status_created_idx
  ON registrations (branch_id, status, created_at DESC);

CREATE TABLE registration_status_history (
  id uuid PRIMARY KEY,
  registration_id uuid NOT NULL REFERENCES registrations(id),
  from_status text,
  to_status text NOT NULL,
  reason text,
  changed_by uuid,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE students (
  id uuid PRIMARY KEY,
  registration_id uuid UNIQUE REFERENCES registrations(id),
  branch_id uuid NOT NULL REFERENCES branches(id),
  full_name text NOT NULL,
  birth_date date,
  religion text,
  gender text,
  address text,
  status text NOT NULL DEFAULT 'active',
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  graduated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (status IN ('active','graduated','withdrawn','inactive'))
);
CREATE INDEX students_branch_status_name_idx
  ON students (branch_id, status, full_name);

CREATE TABLE payment_transactions (
  id uuid PRIMARY KEY,
  registration_id uuid NOT NULL REFERENCES registrations(id),
  purpose text NOT NULL DEFAULT 'registration',
  amount_idr bigint NOT NULL CHECK (amount_idr >= 0),
  currency char(3) NOT NULL DEFAULT 'IDR',
  status text NOT NULL DEFAULT 'pending',
  provider text NOT NULL DEFAULT 'manual_transfer',
  provider_reference text,
  due_at timestamptz,
  paid_at timestamptz,
  verified_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (status IN ('pending','proof_submitted','processing','verified',
    'rejected','expired','refunded'))
);

CREATE TABLE media_assets (
  id uuid PRIMARY KEY,
  storage_key text NOT NULL UNIQUE,
  mime_type text NOT NULL,
  size_bytes bigint NOT NULL CHECK (size_bytes > 0),
  checksum text,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE payment_proofs (
  id uuid PRIMARY KEY,
  payment_transaction_id uuid NOT NULL REFERENCES payment_transactions(id),
  media_asset_id uuid NOT NULL UNIQUE REFERENCES media_assets(id),
  review_status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  rejection_reason text,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  CHECK (review_status IN ('pending','approved','rejected'))
);

CREATE TABLE activity_logs (
  id uuid PRIMARY KEY,
  actor_user_id uuid,
  branch_id uuid REFERENCES branches(id),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

Entitas lain pada tabel 5.2 (akun/role, persetujuan, pembayaran SPP, seragam, staf, kegiatan, pesan, pengaturan) perlu ditambahkan melalui migrasi lanjutan sebelum modul terkait diaktifkan.

---

## 6. Rancangan API yang diperlukan

### 6.1 Standar API

- Prefix versi: `/api/v1`; JSON menggunakan `application/json`, unggah file memakai `multipart/form-data`.
- Semua endpoint admin memerlukan sesi/token aman (cookie `HttpOnly`, `Secure`, `SameSite` atau mekanisme setara) dan pengecekan role + cakupan cabang di server.
- Respons error konsisten, misalnya `{"error":{"code":"VALIDATION_ERROR","message":"Periksa kembali isian.","fields":{"phone":"Format tidak valid"}}}`.
- Daftar memakai `page`, `page_size`, `sort`; filter dan pencarian diterapkan di server.
- Endpoint perubahan status menggunakan operasi yang spesifik, idempotency key untuk submit/transaksi penting, dan locking/transaksi database jika ada perubahan berantai.
- Batasi request, ukuran file, jenis file, akses file, dan percobaan lookup status.

### 6.2 API publik

| Method & endpoint | Tujuan / input utama | Akses dan hasil |
|---|---|---|
| `GET /api/v1/public/site` | Konten utama, visi/misi, kontak publik, jam layanan, konfigurasi CTA | Publik; hanya informasi yang sudah disetujui untuk tayang. |
| `GET /api/v1/public/branches` | Query `q`, `active`, `page`, `page_size` | Publik; ringkasan cabang dan koordinat asli yang telah diverifikasi. |
| `GET /api/v1/public/branches/{slug}` | Detail cabang | Publik; kembalikan hanya cabang aktif/publik beserta fasilitas dan media tayang. |
| `GET /api/v1/public/staff` | Filter `branch`, `role` | Publik; data pendidik yang aktif dan disetujui dipublikasikan. |
| `GET /api/v1/public/events` | Filter `branch`, `category`, `from`, `to`, `page` | Publik; hanya kegiatan dan media yang lolos moderasi serta consent. |
| `POST /api/v1/public/registrations` | `child_name`, `birth_date`, `religion`, `gender`, `address`, `guardian{name,phone,email}`, `branch_id`, `consultation_at`, `notes`, `consents[]`, `idempotency_key` | Publik; validasi server, normalisasi telepon, pemeriksaan duplikat, buat pendaftaran + histori + instruksi pembayaran sesuai aturan. Respons berisi `registration_code`, status, dan tindakan berikutnya—bukan data anak penuh yang tidak perlu. |
| `POST /api/v1/public/registration-status` | `registration_code` dan verifikasi wali (mis. OTP ke nomor tersimpan; jangan hanya nomor registrasi) | Publik terbatas; hasil minimum: status, waktu perubahan, instruksi tindakan. Rate limit dan respons generik bila tidak cocok. |
| `GET /api/v1/public/registrations/{code}/payment-instructions` | Kode pendaftaran + bukti verifikasi sesuai kebijakan | Publik terbatas; nominal, batas waktu, rekening/VA aktif, dan status transaksi. Jangan menaruh VA statis di JavaScript. |
| `POST /api/v1/public/payments/{payment_id}/proof` | Multipart `file`; token unggah/otorisasi pemilik pendaftaran | Publik terbatas; validasi ukuran/format, simpan privat, buat metadata bukti, ubah pembayaran ke `proof_submitted`, catat histori. |
| `POST /api/v1/public/messages` | `name`, `contact`, `category`, `branch_id?`, `body`, persetujuan kontak | Publik; validasi, antispam, dan simpan sebagai pesan baru. |

### 6.3 Autentikasi dan akun admin

| Method & endpoint | Tujuan / input utama | Akses dan hasil |
|---|---|---|
| `POST /api/v1/auth/login` | `email`, `password` | Publik dengan rate limit; verifikasi hash password, buat sesi aman, catat login. |
| `POST /api/v1/auth/logout` | Tidak ada / token sesi | Pengguna login; cabut sesi. |
| `GET /api/v1/auth/me` | Sesi aktif | Pengguna login; profil, role, dan daftar cakupan cabang. |
| `POST /api/v1/auth/forgot-password` | `email` | Publik; selalu balas generik dan kirim tautan sekali pakai bila akun ada. |
| `POST /api/v1/auth/reset-password` | `token`, `new_password` | Token reset valid; ubah hash password dan cabut sesi lama. |

### 6.4 API admin/pengelola

| Method & endpoint | Tujuan / input utama | Akses dan hasil |
|---|---|---|
| `GET /api/v1/admin/dashboard` | Filter tanggal/cabang sesuai izin | Admin; metrik pendaftaran, pembayaran, murid, pesan, cabang dan item yang perlu tindakan. |
| `GET /api/v1/admin/registrations` | `q`, `status`, `branch_id`, tanggal, pagination | Admin; hasil hanya untuk cakupan cabang pengguna. |
| `GET /api/v1/admin/registrations/{id}` | ID pendaftaran | Admin berwenang; detail, histori status, transaksi, metadata bukti (file melalui link terbatas). |
| `PATCH /api/v1/admin/registrations/{id}` | Field pendaftaran yang boleh diedit + alasan perubahan | Admin; validasi dan audit perubahan; field pembayaran tidak diedit melalui endpoint ini. |
| `POST /api/v1/admin/registrations/{id}/transition` | `to_status`, `reason`, `expected_updated_at` | Admin berwenang; cek transisi yang sah, simpan histori dan audit secara atomik. |
| `POST /api/v1/admin/payments/{id}/review` | `decision: approve/reject`, `reason` saat reject | Admin keuangan/pengelola; update bukti/transaksi dan histori. Approve membuat/menghubungkan murid dalam transaksi yang sama. |
| `DELETE /api/v1/admin/registrations/{id}` | `reason` | Admin dengan izin khusus; idealnya soft-delete/anonymisasi, wajib tercatat di audit log. |
| `GET /api/v1/admin/students` | `q`, `branch_id`, `status`, filter SPP/seragam/lulus | Admin; murid terkonfirmasi saja, filter server. |
| `POST /api/v1/admin/students` | Profil murid, wali, cabang, alasan pendaftaran manual | Admin; membuat murid manual dengan audit event. |
| `GET /api/v1/admin/students/{id}` | ID murid | Admin dalam cakupan; profil dan ringkasan akademik/administratif. |
| `PATCH /api/v1/admin/students/{id}` | Field profil yang diizinkan + alasan | Admin; audit perubahan, status pendaftaran asal tidak ditimpa. |
| `GET /api/v1/admin/students/{id}/spp-invoices` | Filter periode/status | Admin cabang; daftar tagihan SPP. |
| `POST /api/v1/admin/students/{id}/spp-invoices` | `period`, `amount_idr`, `due_at`, `notes` | Admin; buat tagihan; cegah tagihan periode ganda. |
| `POST /api/v1/admin/spp-invoices/{id}/payments` | `amount_idr`, `paid_at`, `method`, `reference` | Admin keuangan; catat pembayaran SPP dan hitung saldo/status. |
| `PUT /api/v1/admin/students/{id}/uniform-deliveries` | Item/jumlah/tanggal/catatan | Admin; catat seragam sebagai kejadian, bukan hanya boolean yang menimpa histori. |
| `POST /api/v1/admin/students/{id}/graduation` | `graduated_at`, `reason` | Admin; ubah status murid dan simpan histori. Pembatalan kelulusan sebaiknya endpoint/tindakan terpisah dengan alasan. |
| `GET/POST /api/v1/admin/branches` | Daftar/filter; buat cabang (`name`, `slug`, lokasi, kontak, fasilitas, jam, status) | Admin pusat; validasi slug dan koordinat. |
| `GET/PATCH/DELETE /api/v1/admin/branches/{id}` | Detail, update, nonaktifkan/soft-delete | Admin pusat; penonaktifan tidak menghapus riwayat pendaftaran/murid. |
| `GET/POST /api/v1/admin/staff` | Filter atau buat pendidik (`name`, `role_title`, `branch_id`, status publikasi) | Admin berwenang. |
| `PATCH/DELETE /api/v1/admin/staff/{id}` | Update, nonaktifkan, atau arsip staf | Admin berwenang; role organisasi tidak otomatis memberikan akses sistem. |
| `GET/POST /api/v1/admin/events` | Filter/buat kegiatan dan metadata media | Admin cabang/pusat; default tidak tayang sampai moderasi. |
| `PATCH/DELETE /api/v1/admin/events/{id}` | Edit/arsip kegiatan | Admin berwenang; audit perubahan. |
| `POST /api/v1/admin/events/{id}/publication-review` | `approve/reject`, `reason`, referensi consent media | Admin publikasi; tolak publikasi bila consent yang diperlukan tidak tersedia/dicabut. |
| `GET/PATCH /api/v1/admin/messages` | Filter pesan, ubah status/penanggung jawab | Admin; catat siapa menangani pesan. |
| `POST /api/v1/admin/media-upload` | Multipart file dan tujuan pemakaian | Admin; periksa tipe/ukuran/virus, simpan file dan kembalikan asset ID. Bukti transfer memiliki aturan akses yang lebih ketat. |
| `GET /api/v1/admin/activity-logs` | Filter aktor, entity, tanggal, cabang | Admin berizin; hasil read-only dan tercatat. |
| `GET /api/v1/admin/exports/registrations.csv` | Filter sama dengan daftar pendaftaran | Admin; CSV dengan sanitasi formula spreadsheet dan cakupan cabang. |
| `GET /api/v1/admin/exports/students.csv` | Filter murid | Admin; minimalkan kolom pribadi. |
| `GET /api/v1/admin/exports/reports.csv` | Periode/cabang/jenis ringkasan | Admin; agregat laporan, bukan mengekspor bukti/file sensitif. |
| `GET/PATCH /api/v1/admin/settings` | Biaya, instruksi transfer, kontak publik, konfigurasi situs | Admin pusat; riwayat perubahan; rahasia provider berada di secret manager, bukan settings publik. |

### 6.5 Integrasi pembayaran (opsional, setelah provider dipilih)

Jika lembaga ingin konfirmasi otomatis, tambahkan pembuatan payment intent ke provider dan `POST /api/v1/webhooks/payments/{provider}`. Webhook wajib memverifikasi signature, memvalidasi nominal/mata uang/referensi, memproses event secara idempotent, dan tidak mengandalkan redirect browser sebagai bukti pembayaran. Jika transfer tetap diverifikasi manual, simpan bukti privat dan jadikan keputusan admin sebagai sumber perubahan status.

---

## 7. Keamanan, privasi, dan tata kelola data

Data yang diproses mencakup identitas anak, tanggal lahir, alamat, agama, gender, kontak wali, bukti transfer, dan kemungkinan foto/video anak. Ini adalah data yang sensitif dalam konteks operasional lembaga; desain harus menerapkan minimisasi, kontrol akses, dan retensi yang disetujui pengelola.

Rekomendasi minimum:

- Jangan pernah menyimpan password, bukti transfer, token, atau foto Base64 di `localStorage`.
- Password di-hash dengan algoritma password hashing yang sesuai; login, reset password, dan semua izin diputuskan backend.
- Terapkan akses berbasis role + cabang di setiap request dan query; jangan percaya `branch_id` dari browser.
- Beri bukti transfer dan data anak akses paling terbatas; URL file harus privat dan berumur pendek.
- Batasi file berdasarkan ukuran dan jenis sebenarnya, lakukan pemeriksaan konten, dan simpan dengan nama acak.
- Gunakan TLS, backup terenkripsi, retensi terjadwal, prosedur koreksi/penghapusan data, dan rencana respons insiden.
- Pisahkan persetujuan pemrosesan pendaftaran dari persetujuan publikasi foto/video; sediakan mekanisme pencabutan dan propagasi penghapusan/turun tayang.
- Rate limit login, lookup status, submit formulir, dan unggah file; gunakan CAPTCHA/antispam bila pola trafik memerlukannya.
- Escape output dan gunakan validasi server; audit log harus append-only/terbatas, tanpa menyalin payload pribadi yang tidak dibutuhkan.
- Tentukan kebijakan privasi final, dasar/tujuan pemrosesan, siapa pengendali/penerima data, retensi, kontak privasi, dan prosedur hak pemilik data bersama pengelola dan penasihat yang kompeten. Contoh kebijakan di prototipe sendiri menyatakan masih placeholder.

---

## 8. Prioritas temuan audit

| Prioritas | Temuan | Dampak | Tindakan yang direkomendasikan |
|---|---|---|---|
| P0 | Tidak ada backend; data utama berada di state browser/`localStorage` | Data dapat hilang, berbeda antarperangkat, dan tidak dapat menjadi sumber kebenaran operasional | Bangun API dan database; pindahkan semua operasi baca/tulis serta validasi kritis ke server. |
| P0 | Login, role, dan kredensial hanya simulasi client-side | Siapa pun dapat memodifikasi JavaScript/state dan mengakses fungsi admin demo | Implementasikan autentikasi server, hash password, sesi aman, otorisasi per endpoint, dan scope cabang. |
| P0 | Data anak, kontak, dan bukti transfer tidak memiliki proteksi server | Kebocoran/pengubahan data pribadi; file Base64 memenuhi storage browser | Object storage privat, kontrol akses, enkripsi, retensi, audit, serta uji keamanan dan privasi sebelum produksi. |
| P1 | Submit pendaftaran tidak memanggil `persist()` sebelum navigasi | Pendaftaran baru berpotensi hilang setelah refresh/penutupan tab | Penyimpanan server transaksional; sementara pada demo, simpan state secara konsisten dan tangani kegagalan simpan. |
| P1 | Status pembayaran/penerimaan/murid bercampur dan alur status tidak dibatasi | Status tidak konsisten; aksi ACC dapat tidak sinkron dengan pembayaran dan daftar murid | Pisahkan lifecycle dan enforce state machine di backend dalam transaksi atomik. |
| P1 | VA, biaya, alamat, nomor kontak, koordinat, dan konten sebagian besar contoh | Wali bisa diarahkan ke rekening/informasi yang salah bila demo dianggap sistem nyata | Verifikasi data dengan pemilik lembaga dan kelola lewat konfigurasi/admin terotorisasi; beri label demo sampai siap. |
| P1 | Bukti transfer tidak memiliki batas ukuran/validasi penyimpanan aman | Penyimpanan lokal membesar, file tidak dapat ditinjau lintas admin/perangkat | Upload backend dengan batas, validasi MIME/content, object storage privat, dan audit review. |
| P1 | Pengecekan status menggunakan kode + nomor telepon dan throttle lokal | Enumerasi status/data serta brute force dapat dilakukan lintas perangkat | OTP atau link akses terbatas, respons generik, rate limit/IP+akun di server, dan pemantauan. |
| P1 | Galeri memerlukan persetujuan publikasi; consent anak tidak dimodelkan secara terpisah | Foto dapat tayang tanpa izin yang dapat dibuktikan atau tetap tayang setelah izin dicabut | Tabel consent per subjek/tujuan/media, workflow moderasi, dan mekanisme takedown. |
| P2 | Umur disimpan terpisah dari tanggal lahir; jumlah murid cabang dapat berupa angka statis | Data tidak konsisten dan dashboard publik menyesatkan | Turunkan umur/jumlah dari data sumber; jika jumlah perlu snapshot, beri definisi, waktu, dan proses rekonsiliasi. |
| P2 | Operasi hapus/pengubahan historis kurang terstruktur | Sulit menelusuri perubahan, koreksi, alasan penolakan, dan penghapusan | Status arsip/soft-delete, reason wajib, status history, dan activity log server. |
| P2 | Banyak placeholder dan isi kebijakan privasi belum final | Mengurangi kepercayaan dan dapat menimbulkan salah paham | Uji konten dan checklist publikasi sebelum domain produksi diumumkan. |

---

## 9. Kriteria penerimaan sebelum go-live

### Pendaftaran dan pembayaran

- Pendaftaran valid menghasilkan satu kode unik; pengulangan request dengan idempotency key yang sama tidak menggandakan record.
- Usia dihitung dari tanggal lahir pada server; tanggal masa depan dan usia di luar aturan ditolak.
- Nomor telepon dinormalisasi; validasi tidak hanya bergantung pada JavaScript.
- Cabang nonaktif tidak bisa dipilih/menjadi tujuan submit.
- Record tetap ada setelah browser ditutup/dipakai dari perangkat lain.
- Bukti upload dibatasi dan hanya dapat dilihat admin berwenang; file tidak masuk response publik/CSV.
- ACC mencatat admin dan waktu, memperbarui transaksi dan status, serta membuat tepat satu murid—termasuk saat request dikirim ulang.
- Penolakan wajib alasan; wali melihat status dan tindakan berikutnya tanpa melihat data internal.
- Alur status lookup tahan brute force dan tidak membocorkan apakah kode atau nomor telepon yang cocok.

### Operasional

- Admin cabang hanya dapat melihat/mengubah data cabangnya; admin pusat mendapat hak sesuai kebijakan.
- Penonaktifan cabang tidak menghapus murid, pendaftaran, atau histori yang sudah ada.
- Pembuatan tagihan SPP mencegah duplikasi periode; nominal dan pembayaran tercatat terpisah.
- Ekspor CSV menghormati filter/permission, menyamarkan kolom yang tidak perlu, dan mencegah formula injection.
- Perubahan data sensitif/status menghasilkan activity log yang tidak dapat diedit lewat browser.
- Galeri hanya memuat media yang sudah dimoderasi dan memiliki consent valid; pencabutan consent menurunkan media dari publik.

### Konten dan peluncuran

- Semua teks/angka berlabel demo sudah diganti atau tetap diberi penanda yang tidak ambigu.
- Nomor VA/nominal/alamat/jam layanan/kontak/cabang/pin peta diverifikasi pemilik.
- Kebijakan privasi, persetujuan wali, retensi, dan kanal permintaan data disetujui sebelum data nyata dikumpulkan.
- Backup dan uji pemulihan telah dilakukan; monitoring error, audit admin, dan prosedur insiden tersedia.

---

## 10. Tahapan implementasi yang disarankan

1. **Validasi kebutuhan dan data:** konfirmasi cabang, role staf, biaya, status, kebijakan pembayaran, persetujuan, dan data mana yang benar-benar diperlukan.
2. **Bangun fondasi:** database/migrasi, autentikasi, role & scope cabang, audit log, konfigurasi rahasia, backup.
3. **Implementasikan alur kritis:** pendaftaran → pembayaran manual/gateway → review → pembuatan murid → cek status.
4. **Implementasikan operasional:** dashboard, profil murid, SPP, seragam, kelulusan, cabang, staf, dan pesan.
5. **Implementasikan konten publik:** CMS cabang/pendidik/kegiatan, penyimpanan media dan consent publikasi.
6. **Kualitas dan peluncuran:** uji integrasi dan hak akses, uji restore, verifikasi konten, uji pengguna, lalu migrasi dari data demo hanya jika sumber serta persetujuannya jelas.

---

## 11. Penutup

Prototipe sudah memberikan gambaran produk yang kuat: orang tua dapat mengenal lembaga/cabang dan mendaftar, sementara pengelola mempunyai gambaran proses verifikasi serta administrasi murid. Tema visual dan fokus lokal konsisten dengan sasaran keluarga dan pendidikan anak usia dini.

Namun seluruh status, autentikasi, dan data transaksi saat ini masih demonstrasi browser. Karena sistem menangani data anak, kontak wali, pembayaran, serta media anak, prototipe tidak boleh dipakai untuk menerima data nyata sebelum backend, kontrol akses, penyimpanan aman, proses consent, dan alur transaksi diimplementasikan serta diuji.
