/* Tabyss — Weekly Wrapped. Everything computed and rendered locally; the
 * share card is drawn on a canvas and saved as a PNG download. Nothing is
 * uploaded anywhere. */

let stats = null, prevStats = null, persona = null, slides = [], idx = 0;
let includeTopSite = false; // privacy default: categories only on the share card

const slideEl = document.getElementById("slide");
const dotsEl = document.getElementById("dots");
const blob = document.getElementById("blob");

function esc(s) {
  const d = document.createElement("div");
  d.textContent = s == null ? "" : String(s);
  return d.innerHTML;
}
function copyOf(id) {
  return WRAPPED_COPY.find((s) => s.id === id) || { title: "", subtitle: "" };
}
function fill(str, vars) {
  return str.replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? vars[k] : ""));
}
function hourLabel(h) { const a = h < 12 ? "AM" : "PM"; let x = h % 12; if (!x) x = 12; return `${x} ${a}`; }

function setBlob(c1, c2) {
  blob.style.setProperty("--b1", c1);
  blob.style.setProperty("--b2", c2);
}

const PALETTE = [
  ["#6d28d9", "#ec4899"], ["#0ea5e9", "#22d3ee"], ["#f59e0b", "#ef4444"],
  ["#10b981", "#3b82f6"], ["#8b5cf6", "#f472b6"], ["#14b8a6", "#a3e635"],
  ["#f97316", "#e11d48"], ["#64748b", "#94a3b8"], ["#7c3aed", "#f97316"],
];

function buildSlides() {
  const today = dateKey(Date.now());
  const startKey = shiftDay(today, -6);
  const vars = {};
  const out = [];

  vars.dates = `${prettyDate(startKey)} – ${prettyDate(today)}`;
  out.push({ id: "intro", vars, body: "" });

  if (stats.total < 1800) {
    // Not enough data for a full Wrapped — one honest teaser slide.
    slides = [
      {
        id: "intro",
        vars: { dates: vars.dates },
        custom: {
          title: "Still getting to know you 👀",
          subtitle: "Browse for a few days and come back — your Wrapped needs a week of material.",
        },
        body: "",
      },
    ];
    return;
  }

  out.push({ id: "total", vars: { time: fmtShort(stats.total), avg: fmtShort(stats.total / Math.max(1, stats.activeDays)) }, body: "" });

  if (stats.topSite) {
    out.push({ id: "top_site", vars: { site: stats.topSite[0], sitetime: fmtShort(stats.topSite[1]) }, body: "" });
  }

  const cats = Object.entries(stats.catTotals).sort((a, b) => b[1] - a[1]);
  if (cats.length) {
    out.push({
      id: "categories",
      vars: { topcat: cats[0][0], pct: Math.round((cats[0][1] / stats.total) * 100) + "%" },
      body: cats.slice(0, 4).map(([c, v]) => `<span class="schip">${esc(c)} · ${esc(fmtShort(v))}</span>`).join(""),
      bodyClass: "statline",
    });
  }

  let peak = null, peakV = 0, night = 0;
  for (const [h, v] of Object.entries(stats.hourTotals)) {
    if (v > peakV) { peakV = v; peak = Number(h); }
    const n = Number(h);
    if (n >= 22 || n < 5) night += v;
  }
  if (peak != null) {
    const nightShare = Math.round((night / stats.total) * 100);
    out.push({
      id: "rhythm",
      vars: {
        peak: hourLabel(peak),
        night_or_day_line: nightShare >= 25 ? `${nightShare}% of it happened after dark. Interesting.` : "Mostly daylight browsing. Wholesome, honestly.",
      },
      body: "",
    });
  }

  out.push({
    id: "rabbit",
    vars: {
      hole_line: stats.holeCount
        ? `${stats.holeCount} rabbit hole${stats.holeCount > 1 ? "s" : ""} this week — the deepest was ${fmtShort(stats.biggestHole.secs)} on ${stats.biggestHole.domain}.`
        : "Zero rabbit holes this week. Genuinely elite discipline.",
    },
    body: "",
  });

  if (stats.avgScore != null) {
    out.push({ id: "focus", vars: { score: stats.avgScore, label: scoreLabel(stats.avgScore) }, body: "" });
  }

  out.push({ id: "persona", vars: {}, body: "", reveal: true });
  out.push({ id: "share", vars: {}, body: "", share: true });
  slides = out;
}

function render() {
  const s = slides[idx];
  const copy = s.custom || copyOf(s.id);
  const pal = s.reveal || s.share ? persona.gradient : PALETTE[idx % PALETTE.length];
  setBlob(pal[0], pal[1]);

  dotsEl.innerHTML = slides.map((_, i) => `<i class="${i <= idx ? "on" : ""}"></i>`).join("");

  let html = `<div class="kicker">Tabyss · Weekly Wrapped</div>`;

  if (s.reveal) {
    html += `
      <canvas id="wDoodle" width="440" height="440" style="width:180px;height:180px;border-radius:50%;margin-bottom:0.9rem;box-shadow:0 16px 50px rgba(0,0,0,0.45)"></canvas>
      <h1>${esc(persona.emoji)} ${esc(persona.name)}</h1>
      <span class="epithet">${esc(persona.epithet.label)}</span>
      <p class="sub">${esc(persona.tagline)}</p>
      <p class="sub" style="opacity:.65;margin-top:.5rem">${esc(persona.epithet.flavor)}</p>`;
  } else if (s.share) {
    html += `
      <h1>${esc(copy.title)}</h1>
      <p class="sub">${esc(copy.subtitle)}</p>
      <div class="sharebox">
        <canvas id="card" width="1080" height="1080"></canvas>
        <label class="toggle"><input type="checkbox" id="siteToggle" ${includeTopSite ? "checked" : ""}/> include my top site on the card</label>
        <div class="btnrow">
          <button class="wbtn" id="saveCard">Save card 💾</button>
          <button class="wbtn ghost" id="again">Replay ↺</button>
        </div>
      </div>`;
  } else {
    html += `<h1>${fill(esc(copy.title), s.vars)}</h1><p class="sub">${fill(esc(copy.subtitle), s.vars)}</p>`;
    if (s.body) html += `<div class="${s.bodyClass || ""}" style="margin-top:1.1rem">${s.body}</div>`;
  }

  slideEl.innerHTML = html;
  // retrigger the pop animation
  slideEl.style.animation = "none";
  void slideEl.offsetWidth;
  slideEl.style.animation = "";

  if (s.reveal) {
    const dc = document.getElementById("wDoodle");
    if (dc) drawDoodle(dc, persona, stats);
  }

  if (s.share) {
    drawCard();
    document.getElementById("saveCard").addEventListener("click", (e) => { e.stopPropagation(); saveCard(); });
    document.getElementById("again").addEventListener("click", (e) => { e.stopPropagation(); idx = 0; render(); });
    const toggle = document.getElementById("siteToggle");
    toggle.addEventListener("click", (e) => e.stopPropagation());
    toggle.addEventListener("change", (e) => { includeTopSite = e.target.checked; drawCard(); });
  }
}

/* ---------- share card (canvas → PNG, saved locally) ---------- */
function drawCard() {
  const canvas = document.getElementById("card");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const W = 1080, H = 1080;

  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, persona.gradient[0]);
  g.addColorStop(1, persona.gradient[1]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "rgba(255,255,255,0.10)";
  ctx.beginPath(); ctx.arc(W * 0.85, H * 0.12, 220, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(W * 0.08, H * 0.92, 260, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.font = "600 34px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("MY WEEK, WRAPPED", W / 2, 110);

  // persona doodle instead of a giant emoji — every card is unique art
  const tmp = document.createElement("canvas");
  tmp.width = 380;
  tmp.height = 380;
  drawDoodle(tmp, persona, stats);
  ctx.drawImage(tmp, W / 2 - 190, 150, 380, 380);

  ctx.fillStyle = "#fff";
  ctx.font = "800 72px system-ui, sans-serif";
  wrapText(ctx, persona.name, W / 2, 600, 920, 80);

  ctx.font = "500 40px system-ui, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.fillText(persona.epithet.label, W / 2, 700);

  // Stats row — categories-only by default (privacy); top site is opt-in.
  const bits = [`${fmtShort(stats.total)} online`];
  if (stats.avgScore != null) bits.push(`focus ${stats.avgScore}`);
  const cats = Object.entries(stats.catTotals).sort((a, b) => b[1] - a[1]);
  if (cats.length) bits.push(`top: ${cats[0][0]}`);
  if (includeTopSite && stats.topSite) bits.push(stats.topSite[0]);
  // Measure and shrink so a long domain can never overflow the card.
  const statLine = bits.join("  ·  ");
  ctx.font = "500 42px system-ui, sans-serif";
  const lw = ctx.measureText(statLine).width;
  const maxW = 980;
  if (lw > maxW) ctx.font = `500 ${Math.max(22, Math.floor((42 * maxW) / lw))}px system-ui, sans-serif`;
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.fillText(statLine, W / 2, 820);

  ctx.font = "600 34px system-ui, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.fillText("⏳ Tabyss — tracked in private", W / 2, 990);
}

function wrapText(ctx, text, x, y, maxW, lineH) {
  const words = text.split(" ");
  let line = "", yy = y;
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, yy);
      line = w;
      yy += lineH;
    } else line = test;
  }
  ctx.fillText(line, x, yy);
}

function saveCard() {
  const canvas = document.getElementById("card");
  const a = document.createElement("a");
  a.href = canvas.toDataURL("image/png");
  a.download = `tabyss-wrapped-${dateKey(Date.now())}.png`;
  a.click();
}

/* ---------- navigation ---------- */
function next() { if (idx < slides.length - 1) { idx++; render(); } }
function prev() { if (idx > 0) { idx--; render(); } }

document.getElementById("stage").addEventListener("click", (e) => {
  if (e.target.closest("button, label, canvas, input")) return;
  const mid = window.innerWidth / 2;
  if (e.clientX < mid * 0.4) prev();
  else next();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowRight" || e.key === " " || e.key === "Enter") next();
  else if (e.key === "ArrowLeft") prev();
  else if (e.key === "Escape") window.close();
});
document.getElementById("close").addEventListener("click", () => window.close());

(async function init() {
  try {
    await chrome.runtime.sendMessage({ type: "FLUSH_NOW" });
  } catch (_) {}
  const store = await chrome.storage.local.get(["usage", "hours", "switches", "holes"]);
  const settings = await getSettings();
  const data = {
    usage: store.usage || {}, hours: store.hours || {},
    switches: store.switches || {}, holes: store.holes || {}, settings,
  };
  const today = dateKey(Date.now());
  stats = weekStats(data, today, 7);
  prevStats = weekStats(data, shiftDay(today, -7), 7);
  persona = personaFor(stats, prevStats);
  buildSlides();
  render();
})();

document.addEventListener("tabyss-theme-change", () => {
  if (slides.length) render();
});
