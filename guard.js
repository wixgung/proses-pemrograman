// ============================================================
// GUARD — cek status "Tampilkan" dari Google Sheet sebelum materi
// bisa diakses. Jangan diedit, cukup pasang di file materi:
//   <script>const MODUL_ID = "INF-XXX";</script>
//   <script src="../config.js"></script>
//   <script src="../guard.js"></script>
// ============================================================
(async function () {
  const kontenUtama = document.getElementById("konten-utama");

  function sembunyikanLoader() {
    const loader = document.getElementById("guard-loading");
    if (loader) loader.remove();
  }

  function tampilkanTerkunci() {
    document.body.innerHTML = `
      <div style="font-family:Inter,ui-sans-serif,system-ui,sans-serif;text-align:center;
                  padding:100px 24px;color:#787774;max-width:420px;margin:0 auto">
        <div style="font-size:48px">🔒</div>
        <h2 style="color:#37352F;margin-top:14px;font-size:20px">Materi belum dibuka</h2>
        <p style="margin-top:8px;font-size:14px;line-height:1.5">
          Materi ini belum diaktifkan oleh guru. Silakan cek kembali nanti.
        </p>
        <p style="margin-top:20px">
          <a href="../index.html" style="color:#2383E2;font-size:14px;text-decoration:none">&larr; Kembali ke Portal</a>
        </p>
      </div>`;
  }

  // Kalau config.js gagal dimuat (MODUL_ID/CONTROL_URL tidak terpasang),
  // jangan biarkan halaman tersembunyi selamanya — tampilkan apa adanya
  // dan beri tahu lewat console supaya mudah didiagnosis.
  if (typeof MODUL_ID === "undefined" || typeof CONTROL_URL === "undefined") {
    console.warn("Guard: MODUL_ID atau CONTROL_URL tidak terpasang (kemungkinan config.js gagal dimuat / path salah). Menampilkan konten apa adanya.");
    if (kontenUtama) kontenUtama.style.visibility = "visible";
    sembunyikanLoader();
    return;
  }

  try {
    const res = await fetch(CONTROL_URL + "?t=" + Date.now());
    const data = await res.json();
    const item = data.find(d => String(d.id).trim() === String(MODUL_ID).trim());

    if (item && item.tampilkan === false) {
      tampilkanTerkunci();
      return;
    }
    // Lolos pengecekan: tampilkan konten (kalau memakai pola konten-utama)
    if (kontenUtama) kontenUtama.style.visibility = "visible";
    sembunyikanLoader();
  } catch (err) {
    // Gagal fetch (mis. offline) -> tetap tampilkan konten apa adanya
    console.warn("Guard: tidak bisa memeriksa status visibilitas.", err);
    if (kontenUtama) kontenUtama.style.visibility = "visible";
    sembunyikanLoader();
  }
})();
