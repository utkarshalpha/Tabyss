/* Tabyss — dashboard (v1.2): persona hero, tiles, donut, heatmap, compare,
 * rabbit holes, trend, rollups, calendar, badges, sites. */

let usage = {}, hours = {}, switches = {}, holes = {}, notified = {}, media = {}, wellness = {};
let settings = DEFAULT_SETTINGS;
let selected = dateKey(Date.now());
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const svgNS = "http://www.w3.org/2000/svg";
function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}
function svg(tag, attrs) {
  const e = document.createElementNS(svgNS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  return e;
}
function hueOf(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360; return h; }
function hourLabel(h) { const a = h < 12 ? "AM" : "PM"; let x = h % 12; if (!x) x = 12; return `${x} ${a}`; }

function dayTotal(key) { return Object.values(usage[key] || {}).reduce((s, v) => s + v, 0); }
function catTotalsFor(key) {
  const t = {};
  for (const [d, s] of Object.entries(usage[key] || {})) {
    const c = categorize(d, settings.overrides);
    t[c] = (t[c] || 0) + s;
  }
  return t;
}
function dataBundle() { return { usage, hours, switches, holes, notified, settings }; }

/* Count-up animation for plain-number tile values. */
function countUp(elm, target) {
  if (reduceMotion || target <= 0) { elm.textContent = String(target); return; }
  const t0 = performance.now(), dur = 600;
  const step = (t) => {
    const p = Math.min(1, (t - t0) / dur);
    elm.textContent = String(Math.round(target * (1 - Math.pow(1 - p, 3))));
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/* ---------- persona hero ---------- */
function renderHero() {
  const today = dateKey(Date.now());
  const stats = weekStats(dataBundle(), today, 7);
  const prevStats = weekStats(dataBundle(), shiftDay(today, -7), 7);
  const p = personaFor(stats, prevStats);

  const hero = document.getElementById("hero");
  hero.style.setProperty("--g1", p.gradient[0]);
  hero.style.setProperty("--g2", p.gradient[1]);
  drawDoodle(document.getElementById("heroDoodle"), p, stats);
  // Light gradients (Ghost, The First Edition…) would put white text below
  // 3:1 contrast — flip the hero to dark ink when either stop is light.
  const lum = (hex) => {
    const n = parseInt(hex.slice(1), 16);
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * f((n >> 16) & 255) + 0.7152 * f((n >> 8) & 255) + 0.0722 * f(n & 255);
  };
  hero.classList.toggle("hero-light", Math.max(lum(p.gradient[0]), lum(p.gradient[1])) > 0.3);
  document.getElementById("heroName").textContent = `${p.emoji} ${p.name}`;
  document.getElementById("heroEpithet").textContent = p.epithet.label;
  document.getElementById("heroEpithet").title = p.epithet.flavor;
  document.getElementById("heroTagline").textContent = p.tagline;

  const chips = document.getElementById("heroChips");
  chips.innerHTML = "";
  const streak = computeStreak(usage, settings.overrides);
  const items = [];
  if (stats.total > 0) items.push(`⏱ ${fmtShort(stats.total)} this week`);
  if (stats.avgScore != null) items.push(`🎯 focus ${stats.avgScore}`);
  if (streak > 0) items.push(`🔥 ${streak}-day streak`);
  const cats = Object.entries(stats.catTotals).filter(([c]) => c !== "Other").sort((a, b) => b[1] - a[1]);
  if (cats.length) items.push(`👑 ${cats[0][0]}`);
  if (!items.length) items.push("Browse a few days to unlock your full stats");
  for (const text of items) chips.append(el("span", "hchip", text));
}

/* ---------- tiles ---------- */
function renderTiles() {
  const wrap = document.getElementById("tiles");
  wrap.innerHTML = "";
  const total = dayTotal(selected);
  const prevTotal = dayTotal(shiftDay(selected, -1));
  const cats = catTotalsFor(selected);
  let prodSecs = 0;
  for (const c of PRODUCTIVE_CATS) prodSecs += cats[c] || 0;
  const prod = total ? Math.round((prodSecs / total) * 100) : 0;
  const hrs = hours[selected] || {};
  let peak = null, peakV = 0;
  for (const [h, v] of Object.entries(hrs)) if (v > peakV) { peakV = v; peak = Number(h); }
  const sites = Object.keys(usage[selected] || {}).length;
  const score = focusScoreForDay(usage[selected], switches[selected], holes[selected], settings.overrides);
  const sw = switches[selected];

  const delta = total - prevTotal;
  const deltaTxt = prevTotal
    ? `<span class="${delta >= 0 ? "up" : "down"}">${fmtShort(Math.abs(delta))}</span> vs prev day`
    : "no prior day";

  const tiles = [
    ["Total", total ? fmt(total) : "0m", deltaTxt, null],
    ["Focus score", score != null ? String(score) : "—", score != null ? scoreLabel(score) : "needs 30m+ tracked", score],
    ["Productive", total ? prod + "%" : "—", "of tracked time", null],
    ["Site switches", sw != null ? String(sw) : "—", sw != null ? "jumps between sites" : "tracked from v1.2", sw],
    ["Peak hour", peak != null ? hourLabel(peak) : "—", peak != null ? fmtShort(peakV) + " that hour" : "", null],
    ["Sites", String(sites), sites ? "distinct domains" : "", sites],
  ];
  tiles.forEach(([label, val, sub, numeric], i) => {
    const t = el("div", "tile");
    t.style.animationDelay = `${i * 60}ms`;
    t.append(el("div", "tlabel", label));
    const v = el("div", "tval");
    if (label === "Focus score" && numeric != null) v.style.color = scoreColor(numeric);
    if (numeric != null && Number.isFinite(numeric)) countUp(v, numeric);
    else v.textContent = val;
    t.append(v);
    const s = el("div", "tsub");
    s.innerHTML = sub;
    t.append(s);
    wrap.append(t);
  });
}

/* ---------- donut ---------- */
function renderDonut() {
  const box = document.getElementById("donut");
  const legend = document.getElementById("donutLegend");
  box.innerHTML = "";
  legend.innerHTML = "";
  const cats = catTotalsFor(selected);
  const total = Object.values(cats).reduce((a, b) => a + b, 0);

  const track = svg("circle", { cx: 21, cy: 21, r: 15.9155, fill: "none", "stroke-width": 6 });
  track.style.stroke = "var(--track)";
  box.append(track);

  if (!total) {
    legend.append(el("div", "empty", "No activity this day."));
    return;
  }

  let acc = 0;
  const arcs = [];
  for (const cat of CATEGORIES) {
    const v = cats[cat];
    if (!v) continue;
    const pct = (v / total) * 100;
    const seg = Math.max(0, pct - 1.2); // gap between segments
    const c = svg("circle", {
      cx: 21, cy: 21, r: 15.9155, fill: "none",
      stroke: catColor(cat), "stroke-width": 6,
      "stroke-dasharray": reduceMotion ? `${seg} ${100 - seg}` : `0 100`,
      "stroke-dashoffset": `${25 - acc}`,
    });
    const title = svg("title", {});
    title.textContent = `${cat} — ${fmt(v)} (${Math.round(pct)}%)`;
    c.append(title);
    box.append(c);
    arcs.push([c, seg]);
    acc += pct;

    const row = el("div", "lrow");
    const chip = el("span", "lchip");
    chip.style.background = catColor(cat);
    row.append(chip, el("span", "lt", cat), el("span", "lv", `${fmtShort(v)} · ${Math.round(pct)}%`));
    legend.append(row);
  }
  if (!reduceMotion) {
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        for (const [c, seg] of arcs) {
          c.style.transition = "stroke-dasharray 0.8s ease";
          c.setAttribute("stroke-dasharray", `${seg} ${100 - seg}`);
        }
      })
    );
  }

  const t = svg("text", { x: 21, y: 20.4, "text-anchor": "middle", "dominant-baseline": "central", "font-size": 5, "font-weight": 700 });
  t.style.fill = "var(--ink)";
  t.textContent = fmtShort(total);
  box.append(t);
  const t2 = svg("text", { x: 21, y: 25.2, "text-anchor": "middle", "dominant-baseline": "central", "font-size": 2.4 });
  t2.style.fill = "var(--muted)";
  t2.textContent = "total";
  box.append(t2);
}

/* ---------- hour heatmap ---------- */
function renderHeat() {
  const heat = document.getElementById("heat");
  const labels = document.getElementById("heatLabels");
  heat.innerHTML = "";
  labels.innerHTML = "";
  const hrs = hours[selected] || {};
  const max = Math.max(1, ...Object.values(hrs));
  for (let h = 0; h < 24; h++) {
    const v = hrs[h] || 0;
    const cell = el("div", "hcell");
    const pct = Math.round((v / max) * 100);
    if (v) cell.style.background = `color-mix(in srgb, var(--brand) ${Math.max(12, pct)}%, var(--track))`;
    cell.title = `${hourLabel(h)} — ${v ? fmt(v) : "0m"}`;
    heat.append(cell);

    const lab = el("span");
    if ([0, 6, 12, 18].includes(h)) lab.textContent = hourLabel(h).replace(" ", "").toLowerCase();
    labels.append(lab);
  }
}

/* ---------- compare to last week ---------- */
function renderCompare() {
  const box = document.getElementById("compare");
  box.innerHTML = "";
  const today = dateKey(Date.now());
  const cur = weekStats(dataBundle(), today, 7);
  const prev = weekStats(dataBundle(), shiftDay(today, -7), 7);
  if (!cur.total && !prev.total) {
    box.append(el("div", "empty", "Not enough data yet — check back next week."));
    return;
  }
  for (const cat of CATEGORIES) {
    const a = prev.catTotals[cat] || 0;
    const b = cur.catTotals[cat] || 0;
    if (!a && !b) continue;
    const row = el("div", "cmprow");
    const chip = el("span", "lchip");
    chip.style.background = catColor(cat);
    const name = el("span", "lt", cat);
    const vals = el("span", "cmpvals mono", `${fmtShort(a)} → ${fmtShort(b)}`);
    const deltaEl = el("span", "cmpdelta mono");
    if (!a) {
      deltaEl.textContent = "new";
      deltaEl.style.color = "var(--muted)";
    } else {
      const pct = Math.round(((b - a) / a) * 100);
      const goodDown = cat !== "Productive"; // less scroll = good, more productive = good
      const isGood = pct === 0 ? null : (pct < 0) === goodDown;
      deltaEl.textContent = `${pct > 0 ? "▲" : pct < 0 ? "▼" : "="} ${Math.abs(pct)}%`;
      deltaEl.style.color = isGood == null ? "var(--muted)" : isGood ? "#0ca30c" : "#d03b3b";
    }
    row.append(chip, name, vals, deltaEl);
    box.append(row);
  }
}

/* ---------- rabbit holes ---------- */
function renderHoles() {
  const box = document.getElementById("holesList");
  box.innerHTML = "";
  const list = (holes[selected] || []).slice().sort((a, b) => b.secs - a.secs);
  if (!list.length) {
    box.append(el("div", "empty", "No rabbit holes on this day. Clean scrolling 🧠"));
    return;
  }
  for (const h of list) {
    const row = el("div", "holerow");
    row.append(
      el("span", "holedot", "🕳️"),
      el("span", "dom", h.domain),
      el("span", "secs mono", `${fmtShort(h.secs)} · ended ~${hourLabel(h.hour)}`)
    );
    box.append(row);
  }
}

/* ---------- watch time & wellness ---------- */
function renderMedia() {
  const grid = document.getElementById("mediaGrid");
  grid.innerHTML = "";
  const m = media[selected] || {};
  const w = wellness[selected] || {};
  const kinds = [
    ["video", "🎬", "Video watched"],
    ["shorts", "📱", "Reels / Shorts"],
    ["scroll", "🌀", "Feed doomscroll"],
  ];
  let any = false;
  for (const [kind, emoji, label] of kinds) {
    const perDomain = Object.entries(m[kind] || {}).sort((a, b) => b[1] - a[1]);
    const total = perDomain.reduce((s, [, v]) => s + v, 0);
    if (!total) continue;
    any = true;
    const cell = el("div", "mediacell");
    cell.append(el("div", "mk", `${emoji} ${label}`));
    cell.append(el("div", "mv", fmtShort(total)));
    if (perDomain[0]) cell.append(el("div", "md", `mostly ${perDomain[0][0]} (${fmtShort(perDomain[0][1])})`));
    grid.append(cell);
  }
  const wellBits = [
    ["👀", "Eye breaks", w.eyeTaken, w.eyeSkipped ? `${w.eyeSkipped} skipped` : ""],
    ["💧", "Water", w.waterDone, ""],
    ["🚶", "Stand-ups", w.standDone, ""],
  ];
  for (const [emoji, label, val, sub] of wellBits) {
    if (!val) continue;
    any = true;
    const cell = el("div", "mediacell");
    cell.append(el("div", "mk", `${emoji} ${label}`));
    cell.append(el("div", "mv", String(val)));
    if (sub) cell.append(el("div", "md", sub));
    grid.append(cell);
  }
  if (!any) {
    grid.append(el("div", "empty",
      "No media or wellness activity on this day. Watch-time, Reels/Shorts, doomscroll and break stats land here."));
  }
}

/* ---------- 7-day trend ---------- */
function renderTrend() {
  const trend = document.getElementById("trend");
  trend.innerHTML = "";
  const days = [];
  for (let i = 6; i >= 0; i--) days.push(shiftDay(dateKey(Date.now()), -i));
  const max = Math.max(1, ...days.map(dayTotal));
  for (const key of days) {
    const total = dayTotal(key);
    const col = el("div", "tcol" + (key === selected ? " active" : ""));
    col.title = `${prettyDate(key)} — ${fmt(total)}`;
    const bar = el("div", "tbar");
    const h = (total / max) * 100;
    if (reduceMotion) bar.style.height = h + "%";
    else {
      bar.style.height = "0%";
      requestAnimationFrame(() => requestAnimationFrame(() => {
        bar.style.transition = "height 0.5s ease";
        bar.style.height = h + "%";
      }));
    }
    col.append(bar, el("div", "tl", weekdayShort(key)));
    col.addEventListener("click", () => { selected = key; renderAll(); });
    trend.append(col);
  }
}

/* ---------- weekly / monthly rollups ---------- */
function rangeKeys(fromKey, toKey) {
  const out = [];
  let k = fromKey, guard = 0;
  while (guard++ < 800) { out.push(k); if (k === toKey) break; k = shiftDay(k, 1); }
  return out;
}
function startOfWeek(key) { return shiftDay(key, -weekdayOfKey(key)); }
function monthStart(key) { return key.slice(0, 8) + "01"; }
function sumRange(fromKey, toKey) { return rangeKeys(fromKey, toKey).reduce((s, k) => s + dayTotal(k), 0); }
function monthName(key) { const [y, m] = key.split("-").map(Number); return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" }); }

function renderRollups() {
  const wrap = document.getElementById("rollupTiles");
  wrap.innerHTML = "";
  const today = dateKey(Date.now());
  const wStart = startOfWeek(today);
  const weekDays = rangeKeys(wStart, today);
  const weekTotal = weekDays.reduce((s, k) => s + dayTotal(k), 0);
  const prevWeekTotal = sumRange(shiftDay(wStart, -7), shiftDay(wStart, -1));
  const mStart = monthStart(today);
  const monthDays = rangeKeys(mStart, today);
  const monthTotal = monthDays.reduce((s, k) => s + dayTotal(k), 0);

  const wDelta = weekTotal - prevWeekTotal;
  const wSub = prevWeekTotal
    ? `<span class="${wDelta >= 0 ? "up" : "down"}">${fmtShort(Math.abs(wDelta))}</span> vs last week`
    : "first week of data";

  const tiles = [
    ["This week", fmtShort(weekTotal), wSub],
    ["Week avg / day", fmtShort(weekTotal / weekDays.length), `over ${weekDays.length} day${weekDays.length > 1 ? "s" : ""}`],
    ["This month", fmtShort(monthTotal), monthName(today)],
    ["Month avg / day", fmtShort(monthTotal / monthDays.length), `over ${monthDays.length} days`],
  ];
  for (const [label, val, sub] of tiles) {
    const t = el("div", "tile");
    t.append(el("div", "tlabel", label), el("div", "tval", val));
    const s = el("div", "tsub"); s.innerHTML = sub; t.append(s);
    wrap.append(t);
  }
}

/* ---------- calendar heatmap ---------- */
function renderCalendar() {
  const cal = document.getElementById("calendar");
  const keyEl = document.getElementById("calKey");
  cal.innerHTML = "";
  keyEl.innerHTML = "";
  const weeks = 12;
  const today = dateKey(Date.now());
  const gridEnd = shiftDay(today, 6 - weekdayOfKey(today));
  const gridStart = shiftDay(gridEnd, -(weeks * 7 - 1));
  const cells = rangeKeys(gridStart, gridEnd);
  const max = Math.max(1, ...cells.filter((k) => k <= today).map(dayTotal));
  for (const k of cells) {
    const cell = el("div", "calcell" + (k === selected ? " sel" : ""));
    if (k > today) {
      cell.classList.add("future");
    } else {
      const v = dayTotal(k);
      if (v) cell.style.background = `color-mix(in srgb, var(--brand) ${Math.max(14, Math.round((v / max) * 100))}%, var(--track))`;
      cell.title = `${prettyDate(k)} — ${v ? fmt(v) : "0m"}`;
      cell.addEventListener("click", () => { selected = k; renderAll(); });
    }
    cal.append(cell);
  }
  for (const pct of [14, 40, 66, 100]) {
    const i = document.createElement("i");
    i.style.background = `color-mix(in srgb, var(--brand) ${pct}%, var(--track))`;
    keyEl.append(i);
  }
}

/* ---------- badges ---------- */
function renderBadges() {
  const box = document.getElementById("badges");
  box.innerHTML = "";
  for (const b of computeBadges(dataBundle())) {
    const card = el("div", "badge" + (b.earned ? " earned" : ""));
    card.title = b.description;
    card.append(el("div", "bemoji", b.emoji), el("div", "bname", b.name), el("div", "bdesc", b.description));
    box.append(card);
  }
}

/* ---------- site list ---------- */
function renderDay() {
  document.getElementById("dayLabel").textContent = prettyDate(selected);
  document.getElementById("dayTotal").textContent = fmt(dayTotal(selected));
  const list = document.getElementById("dlist");
  list.innerHTML = "";
  const entries = Object.entries(usage[selected] || {}).sort((a, b) => b[1] - a[1]);
  if (!entries.length) { list.append(el("div", "empty", "No activity recorded for this day.")); return; }
  const max = entries[0][1] || 1;
  for (const [domain, secs] of entries) {
    const cat = categorize(domain, settings.overrides);
    const row = el("div", "bar");
    const meta = el("div", "bmeta");
    const chip = el("span", "chip");
    const fav = faviconUrl(domain, 32);
    if (fav) {
      chip.classList.add("fav");
      const img = document.createElement("img");
      img.src = fav;
      img.alt = "";
      img.addEventListener("error", () => {
        img.remove();
        chip.classList.remove("fav");
        chip.style.background = `hsl(${hueOf(domain)} 50% 45%)`;
        chip.textContent = (domain[0] || "?").toUpperCase();
      });
      chip.append(img);
    } else {
      chip.style.background = `hsl(${hueOf(domain)} 50% 45%)`;
      chip.textContent = (domain[0] || "?").toUpperCase();
    }
    const dom = el("span", "dom", domain);
    const catTag = el("span", "lv", cat);
    catTag.style.color = catColor(cat);
    const time = el("span", "secs", fmt(secs));
    meta.append(chip, dom, catTag, time);
    const track = el("div", "track");
    const fill = el("div", "fill");
    fill.style.width = Math.max(4, (secs / max) * 100) + "%";
    fill.style.background = catColor(cat);
    track.append(fill);
    row.append(meta, track);
    list.append(row);
  }
}

function renderAll() {
  renderHero();
  renderTiles();
  renderDonut();
  renderHeat();
  renderCompare();
  renderHoles();
  renderMedia();
  renderTrend();
  renderRollups();
  renderCalendar();
  renderBadges();
  renderDay();
}

document.getElementById("prev").addEventListener("click", () => { selected = shiftDay(selected, -1); renderAll(); });
document.getElementById("next").addEventListener("click", () => { selected = shiftDay(selected, 1); renderAll(); });
document.getElementById("opts").addEventListener("click", () => chrome.runtime.openOptionsPage());
document.getElementById("wrappedBtn").addEventListener("click", () => {
  chrome.tabs.create({ url: chrome.runtime.getURL("wrapped.html") });
});
document.getElementById("export").addEventListener("click", () => {
  const data = JSON.stringify(buildExportPayload({
    usage, hours, switches, holes, notified, media, wellness, settings,
  }), null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `tabyss-export-${dateKey(Date.now())}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
});

(async function init() {
  try {
    await chrome.runtime.sendMessage({ type: "FLUSH_NOW" });
  } catch (_) {}
  const store = await chrome.storage.local.get([
    "usage", "hours", "switches", "holes", "notified", "media", "wellness",
  ]);
  usage = store.usage || {};
  hours = store.hours || {};
  switches = store.switches || {};
  holes = store.holes || {};
  notified = store.notified || {};
  media = store.media || {};
  wellness = store.wellness || {};
  settings = await getSettings();
  renderAll();
})();
