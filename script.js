/* ==========================================================================
   BelajarAlur — script.js
   Berisi: penyimpanan data, kode pembuka materi, mesin kuis/game generik,
   dan ekspor hasil ke CSV.
   ========================================================================== */

/* --------------------------------------------------------------------------
   1) KODE PEMBUKA MATERI (untuk guru)
   Ubah nilai di bawah ini sebelum kelas dimulai jika ingin kode yang berbeda.
   Bagikan kode ke murid satu per satu sesuai kecepatan mengajar di kelas.
   Lihat juga file "Panduan-Guru.md" untuk daftar kode default.
-------------------------------------------------------------------------- */
const UNLOCK_CODES = {
  proses:   "PROSES",
  analisis: "ALUR-ANALISIS",
  desain:   "ALUR-DESAINALGO",
  coding:   "ALUR-CODING3",
  testing:  "ALUR-TESTING4",
};

/* Urutan resmi section, dipakai untuk sidebar & navigasi */
const SECTION_ORDER = [
  { key: "onboard",  label: "Data Murid",        shape: "terminator", gate: null },
  { key: "pengenalan", label: "Pengenalan Pemrograman", shape: "process", gate: null },
  { key: "proses",   label: "Proses Pemrograman",  desc: "Gambaran umum 4 tahap", shape: "decision", gate: "proses" },
  { key: "analisis", label: "1. Menganalisis Masalah", desc: "Analyzing", shape: "process", gate: "analisis" },
  { key: "desain",   label: "2. Mendesain Solusi", desc: "Problem Solving · notasi & flowchart", shape: "process", gate: "desain" },
  { key: "coding",   label: "3. Coding", desc: "Implementasi", shape: "process", gate: "coding" },
  { key: "testing",  label: "4. Menguji Program", desc: "Testing", shape: "process", gate: "testing" },
  { key: "selesai",  label: "Rekap & Unduh", shape: "terminator", gate: null },
];

/* --------------------------------------------------------------------------
   2) PENYIMPANAN (localStorage bila tersedia, fallback ke memori)
-------------------------------------------------------------------------- */
const Store = {
  mem: {},
  get(k) {
    try {
      const v = localStorage.getItem(k);
      return v ? JSON.parse(v) : null;
    } catch (e) { return this.mem[k] ?? null; }
  },
  set(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); }
    catch (e) { this.mem[k] = v; }
  }
};

let state = {
  student: Store.get("ba_student") || null,
  unlocked: Store.get("ba_unlocked") || ["pengenalan"],
  results: Store.get("ba_results") || {},
  currentSection: "pengenalan",
};

function persist() {
  Store.set("ba_unlocked", state.unlocked);
  Store.set("ba_results", state.results);
}

function saveResult(id, label, part, correct, total) {
  state.results[id] = {
    id, label, part,
    correct, total,
    percent: total ? Math.round((correct / total) * 100) : 0,
    time: new Date().toLocaleString("id-ID"),
  };
  persist();
  renderSidebar();
}

/* --------------------------------------------------------------------------
   3) NAVIGASI & SIDEBAR (flowchart tracker)
-------------------------------------------------------------------------- */
function goSection(key) {
  const meta = SECTION_ORDER.find(s => s.key === key);
  if (!meta) return;
  if (meta.gate && !state.unlocked.includes(key)) return; // terkunci
  document.querySelectorAll(".section").forEach(el => el.classList.remove("visible"));
  const el = document.getElementById("sec-" + key);
  if (el) el.classList.add("visible");
  state.currentSection = key;
  renderSidebar();
  if (key === "selesai") buildResultsTable();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderSidebar() {
  const track = document.getElementById("flow-track");
  if (!track) return;
  track.innerHTML = "";
  SECTION_ORDER.forEach(s => {
    if (s.key === "onboard") return;
    const isUnlocked = !s.gate || state.unlocked.includes(s.key) || s.key === "pengenalan";
    const isDone = !!state.results[s.key + "_done"];
    const isActive = state.currentSection === s.key;
    const node = document.createElement("div");
    node.className = "flow-node " + (isActive ? "active " : "") + (isDone ? "done " : "") + (!isUnlocked ? "locked" : "");
    node.innerHTML = `
      <div class="flow-shape ${s.shape}"><span>${isDone ? "✓" : ""}</span></div>
      <div class="flow-label">
        <div class="t">${s.label}</div>
        ${s.desc ? `<div class="d">${s.desc}</div>` : ""}
      </div>`;
    node.addEventListener("click", () => goSection(s.key));
    track.appendChild(node);
  });
}

function markSectionDone(key) {
  state.results[key + "_done"] = true;
  persist();
  renderSidebar();
}

/* --------------------------------------------------------------------------
   4) FORM DATA MURID (onboarding)
-------------------------------------------------------------------------- */
function initOnboard() {
  const form = document.getElementById("onboard-form");
  if (state.student) {
    showApp();
    return;
  }
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const nis = document.getElementById("f-nis").value.trim();
    const nama = document.getElementById("f-nama").value.trim();
    const kelas = document.getElementById("f-kelas").value.trim();
    const absen = document.getElementById("f-absen").value.trim();
    const errBox = document.getElementById("onboard-err");
    if (!nis || !nama || !kelas || !absen) {
      errBox.textContent = "Semua kolom wajib diisi ya.";
      return;
    }
    state.student = { nis, nama, kelas, absen };
    Store.set("ba_student", state.student);
    errBox.textContent = "";
    showApp();
  });
}

function showApp() {
  document.getElementById("onboard-screen").classList.add("hidden");
  document.getElementById("app-shell").classList.remove("hidden");
  const chip = document.getElementById("student-chip-body");
  chip.innerHTML = `
    <div class="row"><span>Nama</span><b>${escapeHtml(state.student.nama)}</b></div>
    <div class="row"><span>NIS</span><b>${escapeHtml(state.student.nis)}</b></div>
    <div class="row"><span>Kelas</span><b>${escapeHtml(state.student.kelas)}</b></div>
    <div class="row"><span>No. Absen</span><b>${escapeHtml(state.student.absen)}</b></div>`;
  renderSidebar();
  goSection(state.currentSection || "pengenalan");
}

function resetStudent() {
  if (!confirm("Ganti data murid? Progres kode pembuka & nilai kuis di perangkat ini akan tetap tersimpan, tapi kamu perlu masuk ulang.")) return;
  state.student = null;
  Store.set("ba_student", null);
  location.reload();
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, m => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m]));
}

/* --------------------------------------------------------------------------
   5) GERBANG KODE (unlock system)
-------------------------------------------------------------------------- */
function initGate(sectionKey) {
  const form = document.getElementById("gate-form-" + sectionKey);
  if (!form) return;
  const input = form.querySelector("input");
  const msg = document.getElementById("gate-msg-" + sectionKey);
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const val = input.value.trim().toUpperCase();
    const correct = UNLOCK_CODES[sectionKey];
    if (val === correct) {
      state.unlocked = Array.from(new Set([...state.unlocked, sectionKey]));
      persist();
      msg.textContent = "Kode benar! Materi terbuka.";
      msg.className = "gate-msg ok";
      setTimeout(() => {
        document.getElementById("gate-" + sectionKey).classList.add("hidden");
        document.getElementById("content-" + sectionKey).classList.remove("hidden");
        renderSidebar();
      }, 500);
    } else {
      msg.textContent = "Kode belum tepat. Tanyakan ke guru kamu.";
      msg.className = "gate-msg err";
      input.value = "";
    }
  });
}

function checkGateOnLoad(sectionKey) {
  if (state.unlocked.includes(sectionKey)) {
    const g = document.getElementById("gate-" + sectionKey);
    const c = document.getElementById("content-" + sectionKey);
    if (g) g.classList.add("hidden");
    if (c) c.classList.remove("hidden");
  }
}

/* --------------------------------------------------------------------------
   5b) TAB PEMILIH BENTUK ALGORITMA (Deskriptif / Pseudocode / Diagram Alir)
-------------------------------------------------------------------------- */
function initRepTabs() {
  document.querySelectorAll(".rep-tabs").forEach(tabBar => {
    const block = tabBar.closest(".rep-block");
    if (!block) return;
    tabBar.querySelectorAll(".rep-tab-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        tabBar.querySelectorAll(".rep-tab-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        block.querySelectorAll(".rep-panel").forEach(p => p.classList.remove("active"));
        const target = block.querySelector("#" + btn.dataset.target);
        if (target) target.classList.add("active");
      });
    });
  });
}

/* --------------------------------------------------------------------------
   6) MESIN GAME/KUIS GENERIK
-------------------------------------------------------------------------- */

/* ---- 6a. Pilihan Ganda (MCQ) ---- */
function renderMCQ(containerId, questions, resultId, resultLabel, part) {
  const root = document.getElementById(containerId);
  const answers = new Array(questions.length).fill(null);
  root.innerHTML = questions.map((q, qi) => `
    <div class="mcq-item" data-qi="${qi}">
      <div class="mcq-q">${qi + 1}. ${q.q}</div>
      <div class="mcq-options">
        ${q.options.map((op, oi) => `<button type="button" class="mcq-opt" data-oi="${oi}">${op}</button>`).join("")}
      </div>
      <div class="mcq-explain">${q.explain || ""}</div>
    </div>
  `).join("") + `<button class="btn-check" id="${containerId}-check">Periksa Jawaban</button>
    <div class="result-banner" id="${containerId}-banner"></div>`;

  questions.forEach((q, qi) => {
    const item = root.querySelector(`.mcq-item[data-qi="${qi}"]`);
    item.querySelectorAll(".mcq-opt").forEach(btn => {
      btn.addEventListener("click", () => {
        item.querySelectorAll(".mcq-opt").forEach(b => b.classList.remove("selected"));
        btn.classList.add("selected");
        answers[qi] = parseInt(btn.dataset.oi, 10);
      });
    });
  });

  document.getElementById(containerId + "-check").addEventListener("click", () => {
    let correct = 0;
    questions.forEach((q, qi) => {
      const item = root.querySelector(`.mcq-item[data-qi="${qi}"]`);
      const opts = item.querySelectorAll(".mcq-opt");
      opts.forEach((b, oi) => {
        b.classList.remove("selected");
        if (oi === q.answerIndex) b.classList.add("correct");
        else if (oi === answers[qi]) b.classList.add("wrong");
      });
      item.querySelector(".mcq-explain").classList.add("show");
      if (answers[qi] === q.answerIndex) correct++;
    });
    showBanner(containerId + "-banner", correct, questions.length);
    saveResult(resultId, resultLabel, part, correct, questions.length);
  });
}

/* ---- 6b. Urutkan Langkah (Ordering) ---- */
function renderOrdering(containerId, correctItems, resultId, resultLabel, part) {
  const root = document.getElementById(containerId);
  let order = correctItems.map((_, i) => i);
  // shuffle
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  function draw() {
    root.innerHTML = `<div class="order-list">` + order.map((itemIdx, pos) => `
      <div class="order-item" data-pos="${pos}">
        <span class="num">${pos + 1}</span>
        <span class="txt">${correctItems[itemIdx]}</span>
        <span class="arrows">
          <button type="button" data-dir="-1" data-pos="${pos}">↑</button>
          <button type="button" data-dir="1" data-pos="${pos}">↓</button>
        </span>
      </div>`).join("") + `</div>
      <button class="btn-check" id="${containerId}-check">Periksa Urutan</button>
      <div class="result-banner" id="${containerId}-banner"></div>`;

    root.querySelectorAll("button[data-dir]").forEach(btn => {
      btn.addEventListener("click", () => {
        const pos = parseInt(btn.dataset.pos, 10);
        const dir = parseInt(btn.dataset.dir, 10);
        const swapWith = pos + dir;
        if (swapWith < 0 || swapWith >= order.length) return;
        [order[pos], order[swapWith]] = [order[swapWith], order[pos]];
        draw();
      });
    });
    document.getElementById(containerId + "-check").addEventListener("click", () => {
      let correct = 0;
      order.forEach((itemIdx, pos) => {
        const el = root.querySelector(`.order-item[data-pos="${pos}"]`);
        if (itemIdx === pos) { el.classList.add("correct"); correct++; }
        else el.classList.add("wrong");
      });
      showBanner(containerId + "-banner", correct, order.length);
      saveResult(resultId, resultLabel, part, correct, order.length);
    });
  }
  draw();
}

/* ---- 6c. Mencocokkan (Matching) ---- */
function renderMatching(containerId, pairs, resultId, resultLabel, part) {
  const root = document.getElementById(containerId);
  const lefts = pairs.map((p, i) => ({ text: p.left, i }));
  const rights = shuffleArr(pairs.map((p, i) => ({ text: p.right, i })));
  let selectedLeft = null;
  let lockedCount = 0;
  let wrongAttempts = 0;

  root.innerHTML = `<div class="match-wrap">
    <div class="match-col" id="${containerId}-left"></div>
    <div class="match-col" id="${containerId}-right"></div>
  </div>
  <div class="result-banner" id="${containerId}-banner"></div>`;

  const leftCol = document.getElementById(containerId + "-left");
  const rightCol = document.getElementById(containerId + "-right");

  lefts.forEach(item => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "match-item"; b.textContent = item.text; b.dataset.i = item.i;
    b.addEventListener("click", () => {
      if (b.classList.contains("locked")) return;
      leftCol.querySelectorAll(".match-item").forEach(x => x.classList.remove("selected"));
      b.classList.add("selected");
      selectedLeft = item.i;
    });
    leftCol.appendChild(b);
  });
  rights.forEach(item => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "match-item"; b.textContent = item.text; b.dataset.i = item.i;
    b.addEventListener("click", () => {
      if (b.classList.contains("locked") || selectedLeft === null) return;
      if (selectedLeft === item.i) {
        b.classList.add("locked");
        leftCol.querySelector(`.match-item[data-i="${selectedLeft}"]`).classList.add("locked");
        leftCol.querySelector(`.match-item[data-i="${selectedLeft}"]`).classList.remove("selected");
        lockedCount++;
        selectedLeft = null;
        if (lockedCount === pairs.length) {
          showBanner(containerId + "-banner", pairs.length, pairs.length);
          saveResult(resultId, resultLabel, part, pairs.length, pairs.length);
        }
      } else {
        wrongAttempts++;
        b.classList.add("wrongflash");
        setTimeout(() => b.classList.remove("wrongflash"), 500);
      }
    });
    rightCol.appendChild(b);
  });
}

function shuffleArr(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ---- 6d. Kategorikan (Categorize) ---- */
function renderCategorize(containerId, items, categories, resultId, resultLabel, part) {
  const root = document.getElementById(containerId);
  let selected = null;
  const placement = {}; // itemIdx -> category

  root.innerHTML = `
    <div class="cat-pool" id="${containerId}-pool"></div>
    <div class="cat-columns" id="${containerId}-cols"></div>
    <button class="btn-check" id="${containerId}-check">Periksa Jawaban</button>
    <div class="result-banner" id="${containerId}-banner"></div>`;

  const pool = document.getElementById(containerId + "-pool");
  const cols = document.getElementById(containerId + "-cols");

  const shuffled = shuffleArr(items.map((it, i) => ({ ...it, i })));
  shuffled.forEach(it => {
    const chip = document.createElement("button");
    chip.type = "button"; chip.className = "cat-chip"; chip.textContent = it.label; chip.dataset.i = it.i;
    chip.addEventListener("click", () => {
      if (chip.classList.contains("placed")) return;
      pool.querySelectorAll(".cat-chip").forEach(c => c.classList.remove("selected"));
      chip.classList.add("selected");
      selected = it.i;
    });
    pool.appendChild(chip);
  });

  categories.forEach(cat => {
    const col = document.createElement("div");
    col.className = "cat-column";
    col.innerHTML = `<h5>${cat}</h5><div class="col-items"></div>`;
    col.addEventListener("click", () => {
      if (selected === null) return;
      const item = items[selected];
      placement[selected] = cat;
      const chip = pool.querySelector(`.cat-chip[data-i="${selected}"]`);
      chip.classList.add("placed");
      chip.classList.remove("selected");
      const holder = col.querySelector(".col-items");
      const tag = document.createElement("div");
      tag.className = "placed-item";
      tag.textContent = item.label;
      holder.appendChild(tag);
      selected = null;
    });
    cols.appendChild(col);
  });

  document.getElementById(containerId + "-check").addEventListener("click", () => {
    let correct = 0;
    items.forEach((it, i) => { if (placement[i] === it.category) correct++; });
    showBanner(containerId + "-banner", correct, items.length);
    saveResult(resultId, resultLabel, part, correct, items.length);
  });
}

/* ---- helper: hasil banner ---- */
function showBanner(id, correct, total) {
  const el = document.getElementById(id);
  const pct = total ? Math.round((correct / total) * 100) : 0;
  el.classList.add("show");
  el.classList.remove("good", "mid", "bad");
  if (pct >= 80) { el.classList.add("good"); el.textContent = `Mantap! Skor kamu ${correct}/${total} (${pct}%).`; }
  else if (pct >= 50) { el.classList.add("mid"); el.textContent = `Lumayan, skor kamu ${correct}/${total} (${pct}%). Coba baca lagi materinya ya.`; }
  else { el.classList.add("bad"); el.textContent = `Skor kamu ${correct}/${total} (${pct}%). Yuk baca ulang materi di atas, lalu coba lagi.`; }
}

/* --------------------------------------------------------------------------
   7) EKSPOR HASIL KE CSV
-------------------------------------------------------------------------- */
const RESULT_KEYS = [
  ["pengenalan_mcq", "Pengenalan - Kuis Pemahaman"],
  ["proses_ordering", "Proses Pemrograman - Urutkan Tahapan"],
  ["proses_mcq", "Proses Pemrograman - Kuis Pemahaman"],
  ["analisis_categorize", "Analisis Masalah - Kategorikan Input/Proses/Output"],
  ["analisis_mcq", "Analisis Masalah - Kuis Pemahaman"],
  ["desain_matching_simbol", "Desain Solusi - Cocokkan Simbol Flowchart"],
  ["desain_mcq_notasi", "Desain Solusi - Kuis Notasi Algoritma"],
  ["desain_ordering_tehmanis", "Desain Solusi - Urutkan Langkah Algoritma Harian"],
  ["desain_mcq", "Desain Solusi - Lengkapi Pseudocode"],
  ["desain_matching", "Desain Solusi - Cocokkan Simbol & Langkah"],
  ["coding_mcq", "Coding - Kuis Pemahaman Kode"],
  ["coding_matching", "Coding - Cocokkan Pseudocode & C++"],
  ["testing_mcq", "Testing - Kuis Pemahaman"],
  ["testing_categorize", "Testing - Prediksi Hasil Uji"],
];

function buildResultsTable() {
  const tbody = document.getElementById("summary-tbody");
  if (!tbody) return;
  let rows = "";
  RESULT_KEYS.forEach(([key, label]) => {
    const r = state.results[key];
    rows += `<tr>
      <td>${label}</td>
      <td>${r ? r.correct + "/" + r.total : "-"}</td>
      <td>${r ? r.percent + "%" : "Belum dikerjakan"}</td>
      <td>${r ? r.time : "-"}</td>
    </tr>`;
  });
  tbody.innerHTML = rows;
}

function downloadCSV() {
  if (!state.student) { alert("Data murid belum ada."); return; }
  const s = state.student;
  const header = ["NIS", "Nama", "Kelas", "Absen", "Bagian Materi", "Skor Benar", "Skor Total", "Persentase", "Waktu Pengerjaan"];
  const lines = [header];
  RESULT_KEYS.forEach(([key, label]) => {
    const r = state.results[key];
    lines.push([
      s.nis, s.nama, s.kelas, s.absen,
      label,
      r ? r.correct : "",
      r ? r.total : "",
      r ? r.percent + "%" : "Belum dikerjakan",
      r ? r.time : "",
    ]);
  });
  const csv = lines.map(row => row.map(csvEscape).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Hasil_${s.nama.replace(/\s+/g, "_")}_${s.kelas.replace(/\s+/g, "_")}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function csvEscape(val) {
  const str = String(val ?? "");
  if (/[",\n]/.test(str)) return '"' + str.replace(/"/g, '""') + '"';
  return str;
}

/* --------------------------------------------------------------------------
   8) INIT
-------------------------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  initOnboard();
  document.getElementById("btn-reset-student")?.addEventListener("click", resetStudent);
  document.getElementById("btn-download-sidebar")?.addEventListener("click", downloadCSV);
  document.getElementById("btn-download-final")?.addEventListener("click", () => { buildResultsTable(); downloadCSV(); });

  ["proses", "analisis", "desain", "coding", "testing"].forEach(k => {
    initGate(k);
    checkGateOnLoad(k);
  });

  // nav buttons (next-section CTA inside content)
  document.querySelectorAll("[data-goto]").forEach(btn => {
    btn.addEventListener("click", () => goSection(btn.dataset.goto));
  });

  initRepTabs();
  buildQuizzes();
  buildResultsTable();
});

/* --------------------------------------------------------------------------
   9) KONTEN KUIS/GAME PER MATERI
-------------------------------------------------------------------------- */
function buildQuizzes() {

  /* ---------- PENGENALAN PEMROGRAMAN ---------- */
  renderMCQ("game-pengenalan-mcq", [
    {
      q: "Secara umum, program komputer paling tepat diartikan sebagai...",
      options: [
        "Sekumpulan instruksi yang disusun logis dan berurutan agar komputer dapat menjalankan tugas tertentu",
        "Sebuah perangkat keras yang menyimpan data pengguna",
        "Nama lain dari komputer itu sendiri",
        "Kumpulan gambar yang ditampilkan di layar",
      ],
      answerIndex: 0,
      explain: "Program adalah kumpulan instruksi (bukan perangkat keras) yang ditulis dengan bahasa yang bisa dimengerti komputer, disusun secara logis agar tujuan tertentu tercapai.",
    },
    {
      q: "Yang dimaksud dengan algoritma adalah...",
      options: [
        "Urutan langkah logis dan berurutan untuk menyelesaikan sebuah masalah, sebelum diterjemahkan menjadi kode",
        "Nama lain dari bahasa pemrograman C++",
        "Perangkat lunak untuk mengetik dokumen",
        "Hasil akhir dari sebuah program yang sudah jadi",
      ],
      answerIndex: 0,
      explain: "Algoritma adalah rancangan langkah-langkah penyelesaian masalah, mirip 'resep', yang nantinya baru diterjemahkan menjadi kode program.",
    },
    {
      q: "Aktivitas membuat sebuah program disebut...",
      options: ["Pemrograman", "Pengkabelan", "Pencetakan", "Instalasi"],
      answerIndex: 0,
      explain: "Pemrograman adalah istilah untuk seluruh aktivitas merancang dan menuliskan program.",
    },
  ], "pengenalan_mcq", "Pengenalan - Kuis Pemahaman", "pengenalan");

  /* ---------- PROSES PEMROGRAMAN (overview) ---------- */
  renderOrdering("game-proses-ordering", [
    "Menganalisis Masalah (Analyzing) — memahami apa yang perlu diselesaikan",
    "Mendesain Solusi (Design) — menyusun algoritma penyelesaiannya",
    "Mengimplementasikan Solusi (Coding) — menuliskannya menjadi kode program",
    "Menguji Program (Testing) — memastikan program berjalan sesuai harapan",
  ], "proses_ordering", "Proses Pemrograman - Urutkan Tahapan", "proses");

  renderMCQ("game-proses-mcq", [
    {
      q: "Mengapa keempat tahap proses pemrograman sebaiknya dikerjakan berurutan?",
      options: [
        "Karena setiap tahap menjadi dasar/bekal untuk tahap berikutnya, seperti merancang rumah sebelum membangunnya",
        "Karena urutannya tidak penting, boleh diacak bebas",
        "Karena aturan pemerintah mewajibkannya",
        "Karena komputer akan error jika urutannya dibalik",
      ],
      answerIndex: 0,
      explain: "Tanpa memahami masalah dan merancang solusinya lebih dulu, kode yang ditulis berisiko salah arah — mirip membangun rumah tanpa denah.",
    },
    {
      q: "Tahap 'Coding' dalam proses pemrograman maksudnya adalah...",
      options: [
        "Menerjemahkan algoritma/pseudocode yang sudah dirancang menjadi kode program sungguhan",
        "Menggambar ulang flowchart tanpa menulis kode",
        "Menentukan apa saja input dan output yang dibutuhkan",
        "Mempresentasikan hasil program ke guru",
      ],
      answerIndex: 0,
      explain: "Coding adalah tahap implementasi: algoritma yang sudah dirancang pada tahap desain dituliskan ulang memakai bahasa pemrograman tertentu.",
    },
    {
      q: "Tahap 'Testing' penting dilakukan karena...",
      options: [
        "Untuk memastikan program menghasilkan output yang benar untuk berbagai data uji, termasuk kasus batas",
        "Karena wajib menghias tampilan program",
        "Supaya program menjadi lebih lambat",
        "Karena tidak ada hubungannya dengan tahap desain",
      ],
      answerIndex: 0,
      explain: "Testing memverifikasi bahwa program benar-benar bekerja sesuai rancangan, dengan mencoba beberapa data uji (test case), termasuk nilai batas.",
    },
  ], "proses_mcq", "Proses Pemrograman - Kuis Pemahaman", "proses");

  /* ---------- 1. ANALISIS MASALAH ---------- */
  renderCategorize("game-analisis-categorize", [
    { label: "Nilai ujian siswa", category: "Input" },
    { label: "Nama siswa", category: "Input" },
    { label: "Membandingkan nilai dengan KKM (75)", category: "Proses" },
    { label: "Menghitung rata-rata nilai", category: "Proses" },
    { label: "Status kelulusan (Lulus/Tidak Lulus)", category: "Output" },
    { label: "Predikat nilai (A/B/C)", category: "Output" },
  ], ["Input", "Proses", "Output"], "analisis_categorize", "Analisis Masalah - Kategorikan Input/Proses/Output", "analisis");

  renderMCQ("game-analisis-mcq", [
    {
      q: "Tujuan utama tahap 'Menganalisis Masalah' sebelum menulis kode adalah...",
      options: [
        "Memahami dengan jelas apa yang harus diselesaikan sebelum merancang solusinya",
        "Langsung mencoba-coba menulis kode tanpa rencana",
        "Menentukan warna tampilan aplikasi",
        "Menentukan nama file program",
      ],
      answerIndex: 0,
      explain: "Analisis membantu programmer memahami inti masalah — data apa yang tersedia, apa yang harus diproses, dan apa hasil yang diharapkan — sebelum melangkah ke desain solusi.",
    },
    {
      q: "Pola pikir 'IPO' yang dipakai saat menganalisis masalah adalah singkatan dari...",
      options: [
        "Input - Proses - Output",
        "Ide - Penulisan - Operasi",
        "Instruksi - Program - Objek",
        "Import - Print - Output",
      ],
      answerIndex: 0,
      explain: "IPO membantu memetakan data masuk (Input), apa yang dilakukan terhadap data itu (Proses), dan hasil akhirnya (Output).",
    },
    {
      q: "Pada kasus 'penentuan lulus/tidak lulus', yang termasuk Output adalah...",
      options: [
        "Status 'Lulus' atau 'Tidak Lulus'",
        "Nilai ujian yang dimasukkan siswa",
        "Batas nilai KKM sebesar 75",
        "Nama file program",
      ],
      answerIndex: 0,
      explain: "Output adalah hasil akhir yang ditampilkan program, yaitu status kelulusan.",
    },
  ], "analisis_mcq", "Analisis Masalah - Kuis Pemahaman", "analisis");

  /* ---------- 2. DESAIN SOLUSI ---------- */
  renderMatching("game-desain-matching-simbol", [
    { left: "Terminator (oval)", right: "Menandai awal atau akhir dari sebuah alur/program" },
    { left: "Proses (persegi panjang)", right: "Menunjukkan satu langkah kegiatan atau operasi" },
    { left: "Input/Output (jajar genjang)", right: "Menunjukkan data yang dimasukkan atau ditampilkan" },
    { left: "Decision (belah ketupat)", right: "Menunjukkan percabangan berdasarkan sebuah syarat" },
    { left: "Garis alir (panah)", right: "Menunjukkan arah urutan proses dijalankan" },
    { left: "Connector (lingkaran kecil)", right: "Menghubungkan bagian flowchart yang terpisah" },
  ], "desain_matching_simbol", "Desain Solusi - Cocokkan Simbol Flowchart", "desain");

  renderMCQ("game-desain-mcq-notasi", [
    {
      q: "Apa perbedaan mendasar algoritma deskriptif dan pseudocode?",
      options: [
        "Deskriptif ditulis dengan kalimat bahasa manusia sehari-hari, sedangkan pseudocode ditulis menyerupai struktur bahasa pemrograman",
        "Deskriptif hanya boleh berbahasa Inggris, pseudocode hanya boleh berbahasa Indonesia",
        "Keduanya persis sama, hanya beda nama",
        "Pseudocode hanya dipakai untuk menggambar diagram",
      ],
      answerIndex: 0,
      explain: "Notasi deskriptif memakai untaian kalimat sehari-hari sehingga mudah dibaca orang awam, sedangkan pseudocode memakai struktur mirip bahasa pemrograman (misalnya IF-ELSE) agar lebih ringkas dan mudah diterjemahkan menjadi kode.",
    },
    {
      q: "Salah satu kelemahan algoritma yang ditulis dengan notasi deskriptif adalah...",
      options: [
        "Tidak bisa dipahami sama sekali oleh manusia",
        "Bisa menimbulkan ambiguitas/makna ganda dan kurang efektif untuk algoritma yang panjang",
        "Wajib digambar dengan komputer khusus",
        "Tidak boleh memuat langkah lebih dari tiga",
      ],
      answerIndex: 1,
      explain: "Karena ditulis dengan kalimat bebas, notasi deskriptif rawan ambigu dan menjadi kurang praktis kalau algoritmanya panjang.",
    },
    {
      q: "Fungsi utama flowchart (diagram alir) dalam pemrograman adalah...",
      options: [
        "Menggambarkan langkah dan alur keputusan sebuah proses secara visual dengan simbol-simbol standar",
        "Mengganti kebutuhan menulis kode program sepenuhnya",
        "Hanya digunakan untuk mempercantik laporan",
        "Menyimpan data siswa secara permanen",
      ],
      answerIndex: 0,
      explain: "Flowchart memvisualisasikan urutan proses dan titik pengambilan keputusan memakai simbol grafis standar, sehingga alur logika lebih mudah dipahami.",
    },
  ], "desain_mcq_notasi", "Desain Solusi - Kuis Notasi Algoritma", "desain");

  renderOrdering("game-desain-ordering-tehmanis", [
    "Siapkan gelas, teh celup, gula, dan air panas",
    "Masukkan teh celup ke dalam gelas",
    "Tuangkan air panas ke dalam gelas",
    "Tunggu sekitar 3 menit hingga teh terseduh",
    "Angkat kantong teh, lalu tambahkan gula secukupnya dan aduk",
    "Teh manis hangat siap disajikan",
  ], "desain_ordering_tehmanis", "Desain Solusi - Urutkan Langkah Algoritma Harian", "desain");

  renderMCQ("game-desain-mcq", [
    {
      q: "Pada pseudocode 'IF (nilai >= 75) THEN status = \"Lulus\" ELSE ...', kata yang tepat mengisi bagian ELSE adalah...",
      options: [
        'status = "Tidak Lulus"',
        'status = "Lulus"',
        "ulangi dari awal",
        "hapus nilai",
      ],
      answerIndex: 0,
      explain: 'Karena syaratnya adalah nilai >= 75, maka kondisi sebaliknya (ELSE) berarti nilai di bawah 75, sehingga statusnya "Tidak Lulus".',
    },
    {
      q: "Simbol flowchart yang tepat untuk menggambarkan langkah 'nilai >= 75?' pada contoh lulus/tidak lulus adalah...",
      options: ["Decision (belah ketupat)", "Terminator (oval)", "Proses (persegi panjang)", "Connector (lingkaran)"],
      answerIndex: 0,
      explain: "Karena langkah ini adalah sebuah pertanyaan bercabang (ya/tidak), simbolnya adalah belah ketupat (decision).",
    },
    {
      q: "Kalimat pseudocode 'INPUT nilai' pada gaya condong C++ paling mendekati perintah...",
      options: ["cin >> nilai;", "cout << nilai;", "return nilai;", "delete nilai;"],
      answerIndex: 0,
      explain: "Pada C++, membaca data yang dimasukkan pengguna memakai cin >>, sedangkan menampilkan data memakai cout <<.",
    },
    {
      q: "Mengapa desain solusi perlu dituliskan dulu (deskriptif/pseudocode/flowchart) sebelum coding?",
      options: [
        "Supaya logika penyelesaian masalah sudah matang dan jelas sebelum diterjemahkan ke bahasa pemrograman",
        "Karena bahasa pemrograman tidak bisa dipakai tanpa pseudocode",
        "Karena flowchart wajib dicetak dan dikumpulkan",
        "Karena komputer akan menolak kode tanpa pseudocode",
      ],
      answerIndex: 0,
      explain: "Merancang solusi dulu membuat logika program lebih matang, sehingga saat coding, programmer tinggal menerjemahkan alur yang sudah jelas menjadi sintaks bahasa pemrograman.",
    },
  ], "desain_mcq", "Desain Solusi - Lengkapi Pseudocode", "desain");

  renderMatching("game-desain-matching", [
    { left: "Mulai", right: "Terminator" },
    { left: "Input nilai", right: "Input/Output" },
    { left: "nilai >= 75 ?", right: "Decision" },
    { left: "status = \"Lulus\"", right: "Proses" },
    { left: "Tampilkan status", right: "Input/Output" },
    { left: "Selesai", right: "Terminator" },
  ], "desain_matching", "Desain Solusi - Cocokkan Simbol & Langkah", "desain");

  /* ---------- 3. CODING ---------- */
  renderMatching("game-coding-matching", [
    { left: "INPUT nilai", right: "cin >> nilai;" },
    { left: "IF (nilai >= 75) THEN", right: "if (nilai >= 75) {" },
    { left: 'status = "Lulus"', right: 'cout << "Lulus";' },
    { left: "ELSE", right: "} else {" },
    { left: 'status = "Tidak Lulus"', right: 'cout << "Tidak Lulus";' },
  ], "coding_matching", "Coding - Cocokkan Pseudocode & C++", "coding");

  renderMCQ("game-coding-mcq", [
    {
      q: "Pada kode C++ `cin >> nilai;`, baris ini berfungsi untuk...",
      options: [
        "Membaca/menerima data yang dimasukkan pengguna ke dalam variabel nilai",
        "Menampilkan tulisan ke layar",
        "Menghapus isi variabel nilai",
        "Membuat variabel baru bernama cin",
      ],
      answerIndex: 0,
      explain: "cin (character input) pada C++ dipakai untuk membaca masukan dari pengguna ke sebuah variabel.",
    },
    {
      q: "Jika baris `if (nilai >= 75)` diubah menjadi `if (nilai > 75)`, apa dampaknya terhadap siswa yang mendapat nilai tepat 75?",
      options: [
        "Siswa dengan nilai tepat 75 akan dianggap Tidak Lulus, padahal seharusnya Lulus",
        "Tidak ada pengaruh apa pun",
        "Program akan berhenti berjalan (error)",
        "Semua siswa otomatis Lulus",
      ],
      answerIndex: 0,
      explain: "Operator > tidak menyertakan nilai 75 itu sendiri, sehingga siswa dengan nilai persis 75 akan salah dinyatakan Tidak Lulus. Inilah pentingnya memilih operator perbandingan dengan tepat.",
    },
    {
      q: "Dalam kode C++ sederhana, blok kurung kurawal `{ }` setelah `if(...)` berfungsi untuk...",
      options: [
        "Mengelompokkan sekumpulan perintah yang dijalankan jika kondisi bernilai benar",
        "Menandai akhir dari keseluruhan program",
        "Berfungsi sebagai komentar yang diabaikan komputer",
        "Menyatakan sebuah perulangan (loop)",
      ],
      answerIndex: 0,
      explain: "Kurung kurawal pada C++ dipakai untuk mengelompokkan beberapa baris perintah menjadi satu blok, misalnya perintah yang hanya dijalankan bila kondisi if terpenuhi.",
    },
  ], "coding_mcq", "Coding - Kuis Pemahaman Kode", "coding");

  /* ---------- 4. TESTING ---------- */
  renderCategorize("game-testing-categorize", [
    { label: "Nilai 90", category: "Lulus" },
    { label: "Nilai 75", category: "Lulus" },
    { label: "Nilai 74", category: "Tidak Lulus" },
    { label: "Nilai 100", category: "Lulus" },
    { label: "Nilai 0", category: "Tidak Lulus" },
    { label: "Nilai 60", category: "Tidak Lulus" },
  ], ["Lulus", "Tidak Lulus"], "testing_categorize", "Testing - Prediksi Hasil Uji", "testing");

  renderMCQ("game-testing-mcq", [
    {
      q: "Yang dimaksud dengan 'test case' dalam pengujian program adalah...",
      options: [
        "Satu set data masukan tertentu beserta hasil yang diharapkan, untuk memeriksa apakah program bekerja dengan benar",
        "Nama lain dari kode program itu sendiri",
        "Kotak fisik tempat menyimpan komputer",
        "Bagian dari flowchart yang menggambarkan awal program",
      ],
      answerIndex: 0,
      explain: "Test case adalah kombinasi data masukan dan hasil yang diharapkan, dipakai untuk memverifikasi kebenaran program.",
    },
    {
      q: "Mengapa nilai 'tepat di batas KKM' (misalnya 75) penting untuk diuji secara khusus?",
      options: [
        "Karena kasus batas (boundary case) rawan salah logika, misalnya salah memilih operator >= atau >",
        "Karena nilai 75 selalu error di semua program",
        "Karena hanya nilai 75 yang perlu diuji, nilai lain tidak penting",
        "Karena angka 75 tidak bisa disimpan komputer",
      ],
      answerIndex: 0,
      explain: "Data pada batas syarat (boundary value) adalah tempat paling rawan terjadi kesalahan logika, sehingga penting diuji secara khusus.",
    },
    {
      q: "Jika saat diuji dengan beberapa data, program justru menghasilkan output yang salah, langkah yang tepat adalah...",
      options: [
        "Menelusuri kembali algoritma/kode untuk menemukan dan memperbaiki kesalahannya, lalu menguji ulang",
        "Membiarkan saja karena testing hanya formalitas",
        "Menghapus seluruh program dan tidak menyelesaikannya",
        "Mengubah data ujinya supaya cocok dengan output yang salah",
      ],
      answerIndex: 0,
      explain: "Testing berguna untuk menemukan kesalahan (bug) sedini mungkin, sehingga bisa diperbaiki sebelum program benar-benar digunakan.",
    },
  ], "testing_mcq", "Testing - Kuis Pemahaman", "testing");
}
