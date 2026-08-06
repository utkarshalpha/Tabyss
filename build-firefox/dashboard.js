/* Tabyss — dashboard (v1.2): persona hero, tiles, donut, heatmap, compare,
 * rabbit holes, trend, rollups, calendar, badges, sites. */

let usage = {}, hours = {}, switches = {}, holes = {}, notified = {}, media = {}, wellness = {};
let openTabFavicons = new Map(); // in-memory only; see ADR-028
let focusSessions = [], focusActive = null, focusHistoryAvailable = false;
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

/* Make a clickable div a real control: keyboard-reachable and announced. */
function pressable(element, label, onActivate) {
  element.setAttribute("role", "button");
  element.setAttribute("tabindex", "0");
  element.setAttribute("aria-label", label);
  element.addEventListener("click", onActivate);
  element.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onActivate();
    }
  });
}

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

function focusOutcomeLabel(record) {
  if (record.outcome === "completed") return "Completed";
  const labels = {
    "changed-priority": "Priority changed",
    interrupted: "Interrupted",
    "too-long": "Scope was too large",
    other: "Other reason",
  };
  return labels[record.abandonedReason] || "Ended";
}

function focusVisitedSites(domains) {
  if (!Array.isArray(domains) || !domains.length) return null;
  const list = el("div", "focus-history-sites");
  list.setAttribute("role", "list");
  list.setAttribute("aria-label", "Sites visited in this session");
  for (const domain of domains.slice(0, 8)) {
    const item = el("span", "focus-history-site");
    item.setAttribute("role", "listitem");
    item.title = domain;
    const chip = el("span", "chip");
    const fav = faviconUrl(domain, 24);
    const fallback = () => {
      chip.innerHTML = "";
      chip.classList.remove("fav");
      chip.style.background = `hsl(${hueOf(domain)} 50% 45%)`;
      chip.textContent = (domain[0] || "?").toUpperCase();
    };
    if (fav) {
      chip.classList.add("fav");
      const img = document.createElement("img");
      img.src = fav;
      img.alt = "";
      img.addEventListener("error", fallback);
      chip.append(img);
    } else fallback();
    item.append(chip, el("span", "focus-history-site-domain", domain));
    list.append(item);
  }
  if (domains.length > 8) list.append(el("span", "focus-sites-more", `+${domains.length - 8} more`));
  return list;
}

function renderFocusSessions() {
  const wrap = document.getElementById("focusHistory");
  const summary = document.getElementById("focusDaySummary");
  wrap.innerHTML = "";
  summary.innerHTML = "";
  if (!focusHistoryAvailable) {
    wrap.append(el("div", "empty", "Focus history could not be validated. Restore a known-good backup or clear local data before recording another session."));
    return;
  }
  const sessions = focusSessions.filter((record) => record.day === selected).sort((a, b) => b.endedAt - a.endedAt);
  const activeToday = focusActive && dateKey(focusActive.startedAt) === selected ? focusActive : null;
  const totalMs = sessions.reduce((sum, record) => sum + record.focusedMs, 0) + (activeToday?.elapsedMs || 0);
  const completed = sessions.filter((record) => record.outcome === "completed").length;

  if (sessions.length || activeToday) {
    summary.append(
      el("span", "focus-summary-chip mono", fmtShort(totalMs / 1000)),
      el("span", "focus-summary-chip", `${completed}/${sessions.length} completed`)
    );
  }

  if (activeToday) {
    const row = el("article", "focus-history-row active");
    const body = el("div", "focus-history-body");
    body.append(el("div", "focus-history-title", activeToday.intention));
    const meta = activeToday.mode === "timer"
      ? `${fmtShort(activeToday.elapsedMs / 1000)} focused · ${activeToday.status}`
      : `${fmtShort(activeToday.elapsedMs / 1000)} elapsed · ${activeToday.status}`;
    body.append(el("div", "focus-history-meta", meta));
    const activeSites = focusVisitedSites(activeToday.visitedDomains);
    if (activeSites) body.append(activeSites);
    row.append(el("span", "focus-outcome running", activeToday.status === "review" ? "Review" : "Active"), body);
    wrap.append(row);
  }

  for (const record of sessions) {
    const row = el("article", "focus-history-row");
    const body = el("div", "focus-history-body");
    body.append(el("div", "focus-history-title", record.intention));
    const target = record.mode === "timer" && record.targetMinutes ? ` · ${record.targetMinutes}m target` : " · open-ended";
    body.append(el("div", "focus-history-meta", `${fmtShort(record.focusedMs / 1000)} focused${target}`));
    if (record.successDefinition) body.append(el("div", "focus-history-detail", `Done meant: ${record.successDefinition}`));
    if (record.note) body.append(el("div", "focus-history-detail", record.note));
    const visitedSites = focusVisitedSites(record.visitedDomains);
    if (visitedSites) body.append(visitedSites);
    row.append(el("span", `focus-outcome ${record.outcome}`, focusOutcomeLabel(record)), body);
    wrap.append(row);
  }

  if (!wrap.children.length) {
    wrap.append(el("div", "empty", "No sessions yet — start one from the popup. Intention first, timer second."));
  }
}

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
  // Built as DOM nodes, never as an HTML string — keeps the sink out entirely.
  const deltaNodes = () => {
    if (!prevTotal) return [document.createTextNode("no prior day")];
    return [el("span", delta >= 0 ? "up" : "down", fmtShort(Math.abs(delta))), document.createTextNode(" vs prev day")];
  };

  const tiles = [
    ["Total", total ? fmt(total) : "0m", deltaNodes(), null],
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
    if (Array.isArray(sub)) s.append(...sub);
    else s.textContent = sub;
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
  const peakNote = document.getElementById("peakNote");
  if (peakNote) {
    let peak = null, peakV = 0;
    for (const [h, v] of Object.entries(hrs)) if (v > peakV) { peakV = v; peak = Number(h); }
    peakNote.textContent = peak != null ? `Peak hour ${hourLabel(peak)} — protect it.` : "";
  }
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
    box.append(el("div", "empty", "Comparisons unlock after your first full week."));
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
      deltaEl.style.color = isGood == null ? "var(--muted)" : isGood ? "var(--success)" : "var(--danger)";
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
    box.append(el("div", "empty", "Zero rabbit holes. Genuinely elite discipline."));
    return;
  }
  for (const h of list) {
    const row = el("div", "holerow");
    row.append(
      el("span", "holedot", "🕳️"),
      el("span", "dom", h.domain),
      el("span", "secs mono", `${fmtShort(h.secs)} · ~${hourLabel(h.hour)}`)
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
    if (perDomain[0]) {
      const topDomain = perDomain[0][0];
      const line = el("div", "md mdsite");
      const chip = el("span", "favchip");
      // Prefer the exact URL of an open tab on this domain — Chrome's local
      // cache almost always has that page's icon even when the bare domain
      // misses. Falls back to canonical domain, then the letter.
      renderFavicon(chip, {
        domain: topDomain,
        exactPageUrl: openTabFavicons.get(topDomain) || null,
        size: 24,
      });
      line.append(chip, el("span", "mdtext", `mostly ${topDomain} (${fmtShort(perDomain[0][1])})`));
      cell.append(line);
    }
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
    pressable(col, `${prettyDate(key)}, ${total ? fmt(total) : "0m"} tracked`, () => { selected = key; renderAll(); });
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
    ? [el("span", wDelta >= 0 ? "up" : "down", fmtShort(Math.abs(wDelta))), document.createTextNode(" vs last week")]
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
    const s = el("div", "tsub");
    if (Array.isArray(sub)) s.append(...sub);
    else s.textContent = sub;
    t.append(s);
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
      pressable(cell, `${prettyDate(k)}, ${v ? fmt(v) : "0m"} tracked`, () => { selected = k; renderAll(); });
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
    const medal = el("canvas", "bmedal");
    medal.width = 96;
    medal.height = 96;
    medal.setAttribute("aria-hidden", "true"); // the badge name is right below
    drawBadge(medal, b.id, b.earned);
    card.append(medal, el("div", "bname", b.name), el("div", "bdesc", b.description));
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
  renderFocusSessions();
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
document.getElementById("next").addEventListener("click", () => {
  // The calendar already treats future days as inert; the arrows agree.
  const next = shiftDay(selected, 1);
  if (next > dateKey(Date.now())) return;
  selected = next;
  renderAll();
});
document.getElementById("opts").addEventListener("click", () => chrome.runtime.openOptionsPage());
document.getElementById("wrappedBtn").addEventListener("click", () => {
  chrome.tabs.create({ url: chrome.runtime.getURL("wrapped.html") });
});
document.getElementById("export").addEventListener("click", async () => {
  try {
    const response = await chrome.runtime.sendMessage({ type: "EXPORT_DATA" });
    if (!response || response.ok !== true || !response.data) {
      throw new Error(response?.error || "Tabyss could not create a consistent export.");
    }
    const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `tabyss-export-${dateKey(Date.now())}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 0);
  } catch (error) {
    alert(`Export stopped. ${error && error.message ? error.message : "The background worker could not create a consistent backup."}`);
  }
});

(async function init() {
  try {
    await chrome.runtime.sendMessage({ type: "FLUSH_NOW" });
  } catch (_) {}
  try {
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
  } catch (error) {
    document.getElementById("dayLabel").textContent = "Tabyss could not load your data — reload this page.";
    console.warn("Tabyss dashboard load failed:", error && error.message ? error.message : error);
    return;
  }
  try {
    const focusData = await chrome.runtime.sendMessage({ type: "GET_FOCUS_DATA" });
    if (focusData?.ok === true) {
      focusSessions = Array.isArray(focusData.focusSessions) ? focusData.focusSessions : [];
      focusActive = focusData.focus || null;
      focusHistoryAvailable = focusData.focusHistoryAvailable !== false;
    }
  } catch (_) { focusHistoryAvailable = false; }
  openTabFavicons = await openTabFaviconMap(); // empty map on any failure
  renderAll();
})();

document.addEventListener("tabyss-theme-change", () => renderAll());
