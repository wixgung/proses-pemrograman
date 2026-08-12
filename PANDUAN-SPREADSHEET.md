# Panduan Setup: Kelola Materi Sepenuhnya dari Google Sheet

⚠️ **Penting:** Ini adalah project **baru dan terpisah** dari portal Informatika Kelas XI. Anda perlu membuat **Google Sheet baru** dan **deployment Apps Script baru** khusus untuk portal Kelas XII ini — jangan pakai ulang Sheet/URL milik portal Kelas XI, supaya data materi dan hasil kuis kedua kelas tidak tercampur. Bisa pakai akun Google yang sama, cukup buat spreadsheet berbeda.

Setelah setup ini selesai (sekali saja), workflow harian Anda jadi:

- **Materi baru** → upload file HTML-nya ke folder `modules/` di GitHub, lalu tambah **1 baris** di Google Sheet. Tidak ada file kode lain yang perlu diedit.
- **Sembunyikan/tampilkan materi** → centang/hilangkan centang di Sheet.
- **Lihat hasil kuis siswa** → buka tab HasilKuis di Sheet, terisi otomatis.

## 1. Buat Google Sheet dengan 2 tab

Buat Spreadsheet baru, nama bebas misalnya **"Data Portal Analisis Data XII"**. Buat 2 tab:

### Tab "Materi" — pengganti penuh modules.json

Header di baris pertama, urutan kolom **harus sama persis** seperti ini:

| ID | Judul | Deskripsi | Kategori | Semester | Icon | Gambar | File | Tanggal | Tampilkan |
|---|---|---|---|---|---|---|---|---|---|
| XII-101 | Dekomposisi Masalah | Simulasi memecah masalah besar jadi langkah kecil. | Berpikir Komputasional | 1 | 🧩 | | modules/pengantar-analisis-data.html | 2026-07-15 | TRUE |
| XII-102 | Kuis Algoritma Dasar | Latihan soal urutan langkah & flowchart. | Algoritma & Pemrograman | 1 | 🧠 | https://i.imgur.com/xxxxx.jpg | modules/rumus-dasar-excel.html | 2026-07-22 | TRUE |
| XII-202 | Kuis Jaringan Komputer | Kuis topologi jaringan & internet. | Jaringan Komputer | 2 | 🌐 | images/jaringan.jpg | modules/kuis-fungsi-excel.html | 2026-08-09 | FALSE |

Penjelasan kolom:
- **ID** — kode unik bebas, misal `XII-103`. Harus sama dengan `MODUL_ID` yang ditulis di dalam file HTML materi (lihat langkah 4).
- **Semester** — isi `1` atau `2` saja.
- **Icon** — satu emoji, tampil di label bawah gambar (boleh dikosongkan, nanti default 📄).
- **Gambar** — **boleh dikosongkan**. Kalau kosong, kartu akan otomatis diberi warna pastel + ikon sebagai gambar. Kalau diisi, ada 2 cara:
  - **Tempel link gambar langsung** dari internet (misal dari [imgur.com](https://imgur.com), Unsplash, atau link "Get link" Google Drive yang sudah diubah ke format direct-view).
  - **Atau** upload gambar ke folder baru bernama `images/` di repo GitHub Anda, lalu tulis path-nya, misal `images/jaringan.jpg`.
- **File** — path relatif ke file HTML-nya, **persis** seperti nama file yang Anda upload ke folder `modules/`.
- **Tanggal** — bebas format, hanya untuk catatan Anda sendiri (belum ditampilkan di portal).
- **Tampilkan** — blok kolom ini → **Insert → Checkbox**. Centang = materi tampil & bisa dibuka siswa.

### Tab "HasilKuis"
Header saja, terisi otomatis setiap siswa (atau kelompok) submit kuis:

| Waktu | Mode | Nama | NIS | No Absen | Kelas | Anggota Kelompok | Materi | Skor | Total |
|---|---|---|---|---|---|---|---|---|---|

Penjelasan:
- **Mode** — otomatis terisi `Individu` atau `Kelompok`, tergantung pilihan siswa saat mulai kuis.
- **Nama** — nama siswa (mode individu) atau nama kelompok (mode kelompok).
- **NIS** dan **No Absen** — hanya terisi untuk mode individu, kosong untuk mode kelompok.
- **Anggota Kelompok** — daftar nama anggota (dipisah koma), hanya terisi untuk mode kelompok.
- **Kelas** — selalu diminta, di kedua mode.

Dengan susunan ini Anda bisa langsung **Sort/Filter** di Sheet berdasarkan Kelas, Mode, atau Materi untuk merekap nilai.

## 2. Pasang Apps Script

Di Spreadsheet: **Extensions → Apps Script**. Hapus isi default, ganti dengan:

```javascript
function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Materi");
  const rows = sheet.getDataRange().getValues();
  const header = rows.shift();

  const idx = {};
  header.forEach((h, i) => idx[h.trim()] = i);

  const data = rows
    .filter(r => r[idx["ID"]] !== "")
    .map(r => ({
      id: String(r[idx["ID"]]).trim(),
      title: r[idx["Judul"]],
      description: r[idx["Deskripsi"]],
      category: r[idx["Kategori"]],
      semester: String(r[idx["Semester"]]).trim(),
      icon: r[idx["Icon"]] || "📄",
      image: r[idx["Gambar"]] || "",
      file: r[idx["File"]],
      tanggal: r[idx["Tanggal"]] ? String(r[idx["Tanggal"]]) : "",
      tampilkan: r[idx["Tampilkan"]] === true
    }));

  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("HasilKuis");
  const data = JSON.parse(e.postData.contents);
  sheet.appendRow([
    data.waktu,
    data.mode,
    data.nama,
    data.nis || "",
    data.absen || "",
    data.kelas || "",
    data.anggota || "",
    data.materi,
    data.skor,
    data.total
  ]);
  return ContentService.createTextOutput(JSON.stringify({ status: "ok" }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

Simpan project (nama bebas, misal "API Portal Informatika").

## 3. Deploy sebagai Web App

1. **Deploy → New deployment**.
2. Klik ikon gear ⚙️ → pilih **Web app**.
3. Isi: **Execute as: Me**, **Who has access: Anyone**.
4. **Deploy**, setujui izin akses yang diminta (wajar, karena ini script milik Anda sendiri).
5. Salin **Web app URL** (`https://script.google.com/macros/s/xxxxx/exec`).

## 4. Tempel URL — satu-satunya file yang diedit

Buka `config.js`, ganti:
```javascript
const CONTROL_URL = "https://script.google.com/macros/s/GANTI_DENGAN_ID_DEPLOYMENT/exec";
```
dengan URL asli dari langkah 3. Upload ulang ke GitHub. Setelah ini, **tidak ada file kode lain yang perlu disentuh lagi**.

## 5. Menambah materi baru (workflow rutin)

1. Buat file HTML materinya. Supaya ikut terkunci sesuai kontrol Sheet, tempel pola ini tepat sebelum `</body>`:
   ```html
   <script>const MODUL_ID = "INF-XXX";</script>
   <script src="../config.js"></script>
   <script src="../guard.js"></script>
   ```
   Ganti `INF-XXX` dengan ID yang akan Anda pakai di Sheet. Bungkus juga konten utama dengan `<div id="konten-utama" style="visibility:hidden">...</div>` supaya tidak sempat "kelihatan sekilas" sebelum guard selesai mengecek (lihat contoh file di folder `modules/` sebagai referensi pola lengkapnya).
2. Upload file itu ke folder `modules/` di GitHub (commit langsung lewat GitHub web, atau upload file).
3. Buka Google Sheet, tambahkan 1 baris baru di tab **Materi** dengan ID, judul, deskripsi, kategori, semester, icon, dan path file yang sama.
4. Centang kolom **Tampilkan** kapan pun materi itu siap dibuka untuk siswa.

Tidak ada lagi file JSON atau kode portal yang perlu diedit untuk menambah materi — semuanya lewat Sheet, kecuali file HTML materinya sendiri yang memang harus diupload.

## 6. Menerapkan form data siswa (NIS/Absen/Kelas/Kelompok) ke kuis lain

File `modules/kuis-fungsi-excel.html` sudah jadi contoh lengkapnya. Untuk kuis baru yang Anda buat sendiri, cara tercepat:

1. Copy file `kuis-fungsi-excel.html`, ganti nama sesuai kuis baru Anda.
2. Ganti `MODUL_ID` di bagian bawah file dengan ID kuis yang baru.
3. Ganti isi soal (elemen `#soal` dan pilihan `.opsi`), sesuaikan logika `jawab()` dan hitungan skor totalnya kalau soal lebih dari satu.
4. Bagian form data siswa (mode Individu/Kelompok, field Kelas/Nama/NIS/Absen/Anggota) dan fungsi `kirimHasil()` **tidak perlu diubah** — tinggal dipakai apa adanya karena sudah otomatis mengirim ke kolom yang sama di tab HasilKuis.

## Catatan jujur soal batasan

Ini situs statis (GitHub Pages), bukan server sungguhan. Pengecekan visibilitas berjalan lewat JavaScript di browser siswa — cukup efektif untuk kebutuhan kelas (materi hilang dari daftar, halaman terkunci walau diakses lewat link langsung), tapi bukan keamanan tingkat tinggi. Siswa yang sangat mahir teknis (mis. membaca kode sumber langsung) secara teori masih bisa melihat isi mentah file. Untuk kontrol akses materi kelas sehari-hari, ini sudah lebih dari cukup.
