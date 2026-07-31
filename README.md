# Cost Tracker — Panduan Instalasi

Aplikasi pencatatan pengeluaran dengan OCR struk otomatis. Panduan ini buat kamu yang baru mau pasang Cost Tracker buat bisnis kamu sendiri.

> **Catatan soal panduan ini**: langkah-langkah di bawah udah dites urutannya sesuai cara Google Sheets & Apps Script bekerja, tapi belum ada screenshot beneran di sini — tempat screenshot ditandai dengan `📸`. Ambil screenshot pas kamu jalanin sendiri langkah-langkahnya sekali, terus tempel di tempat yang ditandai sebelum README ini disebar ke customer.

Total waktu: ± 15-20 menit buat orang yang baru pertama kali.

---

## Yang kamu butuhin sebelum mulai

- Akun Google (Gmail biasa udah cukup)
- HP dengan browser (Chrome disaranin)

---

## Langkah 1 — Salin Spreadsheet Template

1. Buka link Spreadsheet template yang dikasih ke kamu
2. Di pojok kanan atas, atau lewat menu **File**, cari **"Make a copy"** (Buat salinan)

   📸 *[Screenshot: menu File dengan opsi "Make a copy" terlihat]*

3. Tekan itu — Google bakal bikin salinan Spreadsheet ini punya kamu sendiri, lengkap sama isinya
4. Kasih nama terserah kamu, misal "Cost Tracker - [Nama Bisnis Kamu]"

   📸 *[Screenshot: dialog "Make a copy" dengan kolom nama file]*

---

## Langkah 2 — Siapin Header Tabel

1. Di Spreadsheet salinan kamu, buka menu **Extensions > Apps Script**

   📸 *[Screenshot: menu Extensions dengan opsi Apps Script]*

2. Bakal kebuka tab baru — editor kode. Ini isinya udah ada (ikut ke-copy dari template), kamu nggak perlu ngetik apa-apa
3. Di bagian atas editor, ada dropdown pilihan fungsi. Pilih **`setupHeaders`**

   📸 *[Screenshot: dropdown fungsi dengan setupHeaders terpilih]*

4. Klik tombol **▶ Run**

   📸 *[Screenshot: tombol Run]*

5. Pertama kali jalanin, Google bakal minta izin akses — klik **Review permissions**, pilih akun Google kamu, klik **Advanced** kalau muncul peringatan, lalu **Go to [nama project] (unsafe)**, lalu **Allow**

   📸 *[Screenshot: dialog izin akses Google]*

   > Peringatan "unsafe" ini muncul karena scriptnya belum diverifikasi Google secara resmi (wajar buat script pribadi/kecil kayak gini) — bukan berarti ada yang salah.

6. Kalau berhasil, cek balik ke tab Spreadsheet — 3 tab di bawah (Pengeluaran, Katalog Produk, Katalog Toko) sekarang punya judul kolom

---

## Langkah 3 — Deploy jadi Web App

1. Masih di editor Apps Script, klik tombol **Deploy** (kanan atas) → **New deployment**

   📸 *[Screenshot: tombol Deploy dan menu New deployment]*

2. Klik ikon gerigi ⚙️ di sebelah "Select type", pilih **Web app**

   📸 *[Screenshot: pilihan Web app]*

3. Isi:
   - **Execute as**: Me
   - **Who has access**: Anyone

   📸 *[Screenshot: form pengaturan deployment]*

4. Klik **Deploy**
5. Google bakal ngasih **URL** — bentuknya kayak `https://script.google.com/macros/s/xxxxx/exec`. **Copy URL ini**, kamu bakal butuh di Langkah 5.

   📸 *[Screenshot: URL Web App setelah deploy]*

---

## Langkah 4 — Bikin API Key Gemini

1. Buka [aistudio.google.com](https://aistudio.google.com) di browser
2. Login pakai akun Google yang sama
3. Cari tombol **"Get API key"** atau **"Create API key"**

   📸 *[Screenshot: tombol Get API key di AI Studio]*

4. Pilih **Create API key in new project** (kalau ini pertama kali)

   📸 *[Screenshot: dialog create API key]*

5. **Copy** API key yang muncul — simpen baik-baik, ini kayak password

   > ⚠️ Jangan share API key ini ke siapa pun. Siapa pun yang pegang key ini bisa makan kuota gratis Gemini kamu.

---

## Langkah 5 — Buka App-nya

1. Buka [link app Cost Tracker] di HP kamu
2. Muncul layar **Setup** — paste:
   - **Web App URL** dari Langkah 3
   - **Gemini API Key** dari Langkah 4
3. Tekan **Lanjut**
4. Muncul layar **Login** — masukin nama kamu, tekan **Masuk**

   > Orang **pertama** yang login otomatis jadi **Owner** — pastikan itu kamu, bukan staff kamu. Owner yang bisa nambah/hapus akses staff nanti.

5. Selesai — kamu langsung masuk ke app

**Buat HP lain / staff kamu**: mereka ulangin cuma Langkah 5 — Web App URL & API key yang sama (atau minta kamu bikinin API key sendiri buat mereka kalau mau kuota kepisah), terus login pakai nama mereka sendiri (yang udah kamu tambahin lewat tab Setting > Kelola Akses).

---

## Kelola Akses Staff

1. Login sebagai Owner
2. Buka tab **Setting** (paling kanan bawah)
3. Bagian **"Kelola Akses"** — ketik nama staff, tekan **+**
4. Staff itu sekarang bisa login pakai nama itu dari HP mana pun

---

## FAQ / Troubleshooting

**"Nama nggak dikenali" pas login staff**
Owner belum nambahin nama itu di Kelola Akses (Langkah di atas). Cek ejaan nama sama persis (nggak case-sensitive, tapi typo tetep beda).

**Foto struk gagal dibaca**
- Cek koneksi internet
- Cek API key Gemini masih valid (buka tab Setting, coba paste ulang)
- Coba foto ulang dengan pencahayaan lebih terang

**Salah orang jadi Owner**
Kalau ini kejadian (misal staff sempet login duluan sebelum kamu), saat ini belum ada cara pindah Owner dari dalam app — perlu edit manual lewat Apps Script (Project Settings > Script Properties, ubah `OWNER_NAME`). Hubungi yang bikinin app kamu kalau butuh bantuan ini.

**Web App URL berubah?**
Nggak akan berubah selama kamu nggak bikin deployment baru dari nol. Kalau update kode nanti, pakai **Manage deployments > Edit > New version** (bukan New deployment), biar URL tetep sama.

---

## Catatan buat yang masang (bukan buat customer akhir)

Bagian ini boleh dihapus dari README yang dikirim ke customer — ini catatan internal.

- Frontend di-host di GitHub Pages, backend (Apps Script) beda per customer, kepisah total
- Kalau update `Index.html`, cukup push ke GitHub, otomatis ke-refresh buat semua customer (karena mereka semua akses alamat GitHub Pages yang sama)
- Kalau update `Code.gs`, itu HARUS diulang manual di tiap Sheet customer (nggak otomatis nyebar) — ini keterbatasan yang perlu diinget kalau ada bug fix di backend
