/* Tabyss — popup: today at a glance (v1.4) */

const today = dateKey(Date.now());
let resetArmed = false;

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}
function hueOf(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 360;
  return h;
}
const svgNS = "http://www.w3.org/2000/svg";
function svg(tag, attrs) {
  const e = document.createElementNS(svgNS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  return e;
}

function categoryTotals(usageDay, overrides) {
  const totals = {};
  for (const [domain, secs] of Object.entries(usageDay)) {
    const cat = categorize(domain, overrides);
    totals[cat] = (totals[cat] || 0) + secs;
  }
  return totals;
}
function productiveShare(catTotals, total) {
  if (!total) return 0;
  let p = 0;
  for (const c of PRODUCTIVE_CATS) p += catTotals[c] || 0;
  return Math.round((p / total) * 100);
}

/* Focus ring. Scoreable day → colored arc + score. Under 30m → a quiet gray
 * progress arc toward scoreability, never a dead "no data". */
function renderRing(score, totalSecs) {
  const ring = document.getElementById("ring");
  const label = document.getElementById("scoreLabel");
  ring.innerHTML = "";
  const track = svg("circle", { cx: 21, cy: 21, r: 15.9155, fill: "none", "stroke-width": 4.5 });
  track.style.stroke = "var(--track)";
  ring.append(track);

  let arcPct, arcColor, centerText, labelText;
  if (score != null) {
    arcPct = Math.max(2, score);
    arcColor = scoreColor(score);
    centerText = String(score);
    labelText = scoreLabel(score);
  } else if (totalSecs > 0) {
    arcPct = Math.max(4, Math.min(96, (totalSecs / 1800) * 100));
    arcColor = "var(--muted)";
    centerText = fmtShort(totalSecs);
    labelText = "warming up";
  } else {
    arcPct = 0;
    arcColor = "var(--muted)";
    centerText = "–";
    labelText = "fresh start";
  }
  if (arcPct > 0) {
    const arc = svg("circle", {
      cx: 21, cy: 21, r: 15.9155, fill: "none",
      "stroke-width": 4.5, "stroke-linecap": "round",
      "stroke-dasharray": `${arcPct} ${100 - arcPct}`, "stroke-dashoffset": "25",
    });
    arc.style.stroke = arcColor;
    ring.append(arc);
  }
  const t = svg("text", {
    x: 21, y: 21.5, "text-anchor": "middle", "dominant-baseline": "central",
    "font-size": score != null ? 11 : 8, "font-weight": 700,
  });
  t.style.fill = score != null ? arcColor : "var(--ink2)";
  t.textContent = centerText;
  ring.append(t);
  label.textContent = labelText;
}

/* Persona row: doodle + name, tap to expand — present but never shouting. */
function renderPersona(data) {
  const today = dateKey(Date.now());
  const stats = weekStats(data, today, 7);
  const prev = weekStats(data, shiftDay(today, -7), 7);
  const p = personaFor(stats, prev);
  drawDoodle(document.getElementById("pDoodle"), p, stats);
  document.getElementById("pName").textContent = p.name;
  document.getElementById("pEpithet").textContent = `${p.emoji} ${p.epithet.label}`;
  document.getElementById("pTagline").textContent = p.tagline;
  const row = document.getElementById("personaRow");
  const detail = document.getElementById("pDetail");
  const chev = document.getElementById("pChev");
  row.onclick = () => {
    detail.hidden = !detail.hidden;
    chev.textContent = detail.hidden ? "▾" : "▴";
  };
}

/* Up-next timeline: every enabled reminder with its countdown. */
function renderUpNext(settings, ws, streak, switchCount, tabCount) {
  const box = document.getElementById("upnext");
  box.innerHTML = "";
  const now = Date.now();
  const row = (icon, name, value, hint) => {
    const r = el("div", "uprow");
    r.append(el("span", "upicon", icon));
    const mid = el("span", "upname", name);
    if (hint) mid.title = hint;
    r.append(mid, el("span", "upval mono", value));
    box.append(r);
  };
  if (settings.eyeEnabled !== false) {
    const left = Math.max(0, (settings.eyeIntervalMin || 20) * 60 - (ws.activeSecs || 0));
    row("👁", "Eye break", `in ${fmtShort(left)}`, "20-20-20: the page blurs for a 20s look-away");
  }
  if (settings.officeMode) {
    const wLeft = Math.max(0, (settings.waterIntervalMin || 50) * 60000 - (now - (ws.lastWater || now)));
    const sLeft = Math.max(0, (settings.standIntervalMin || 60) * 60000 - (now - (ws.lastStand || now)));
    row("💧", "Water", `in ${fmtShort(wLeft / 1000)}`);
    row("🚶", "Stand up", `in ${fmtShort(sLeft / 1000)}`);
  }
  if (streak > 0) row("🔥", "Streak", `${streak} day${streak > 1 ? "s" : ""}`, "Days in a row with 30m+ productive time");
  if (switchCount != null && switchCount > 0) row("⇄", "Site switches", String(switchCount));
  if (tabCount != null && tabCount >= 12) row("🗂", "Open tabs", String(tabCount), "Tab hoarding check — close a few?");
  if (!box.children.length) row("✓", "All quiet", "—");
}

function renderMediaStrip(mediaDay) {
  const kinds = [
    ["video", "Video"],
    ["shorts", "Shorts"],
    ["scroll", "Doomscroll"],
  ];
  const cells = [];
  for (const [kind, name] of kinds) {
    const total = Object.values((mediaDay || {})[kind] || {}).reduce((s, v) => s + v, 0);
    if (total) cells.push([name, total]);
  }
  if (!cells.length) return;
  document.getElementById("mediaSection").style.display = "";
  const strip = document.getElementById("mediaStrip");
  strip.innerHTML = "";
  for (const [name, total] of cells) {
    const c = el("div", "mcell");
    c.append(el("div", "mval mono", fmtShort(total)), el("div", "mname", name));
    strip.append(c);
  }
}

function renderStacked(catTotals, total) {
  const sbar = document.getElementById("sbar");
  const legend = document.getElementById("legend");
  sbar.innerHTML = "";
  legend.innerHTML = "";
  for (const cat of CATEGORIES.filter((c) => catTotals[c] > 0)) {
    const seg = el("div", "sseg");
    seg.style.flex = catTotals[cat];
    seg.style.background = catColor(cat);
    seg.title = `${cat} — ${fmt(catTotals[cat])}`;
    sbar.append(seg);

    const row = el("div", "lrow");
    const chip = el("span", "lchip");
    chip.style.background = catColor(cat);
    row.append(chip, el("span", "lt", cat), el("span", "lv", `${Math.round((catTotals[cat] / total) * 100)}%`));
    legend.append(row);
  }
}

function renderBudgets(catTotals, goals) {
  const entries = Object.entries(goals || {}).filter(([, m]) => m > 0);
  if (!entries.length) return;
  document.getElementById("budgetSection").style.display = "";
  const box = document.getElementById("budgets");
  box.innerHTML = "";
  for (const [cat, mins] of entries) {
    const used = catTotals[cat] || 0;
    const budget = mins * 60;
    const pct = Math.min(100, Math.round((used / budget) * 100));
    const over = used > budget;

    const row = el("div", "budget");
    const meta = el("div", "bmeta");
    const chip = el("span", "lchip");
    chip.style.background = catColor(cat);
    const name = el("span", "lt", cat);
    const status = el(
      "span", "bstat mono",
      over ? `over by ${fmtShort(used - budget)}` : `${fmtShort(budget - used)} left of ${mins}m`
    );
    status.style.color = over ? "#d03b3b" : pct >= 75 ? "#b27e1e" : "var(--ink2)";
    meta.append(chip, name, status);

    const track = el("div", "track");
    const fill = el("div", "fill");
    fill.style.width = Math.max(3, pct) + "%";
    fill.style.background = over ? "#d03b3b" : pct >= 75 ? "#fab219" : catColor(cat);
    track.append(fill);

    row.append(meta, track);
    box.append(row);
  }
}

function siteChip(domain) {
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
      chip.style.background = `hsl(${hueOf(domain)} 45% 45%)`;
      chip.textContent = (domain[0] || "?").toUpperCase();
    });
    chip.append(img);
  } else {
    chip.style.background = `hsl(${hueOf(domain)} 45% 45%)`;
    chip.textContent = (domain[0] || "?").toUpperCase();
  }
  return chip;
}

function siteBar(domain, secs, max) {
  const row = el("div", "bar");
  const meta = el("div", "bmeta");
  const chip = siteChip(domain);
  const dom = el("span", "dom", domain);
  const time = el("span", "secs", fmt(secs));
  meta.append(chip, dom, time);
  const track = el("div", "track");
  const fill = el("div", "fill");
  fill.style.width = Math.max(4, (secs / max) * 100) + "%";
  track.append(fill);
  row.append(meta, track);
  return row;
}

async function load() {
  try {
    await chrome.runtime.sendMessage({ type: "FLUSH_NOW" });
  } catch (_) {}
  const { usage = {}, hours = {}, switches = {}, holes = {}, media = {}, wellnessState = {} } =
    await chrome.storage.local.get(["usage", "hours", "switches", "holes", "media", "wellnessState"]);
  const settings = await getSettings();
  let tabCount = null;
  try {
    tabCount = (await chrome.tabs.query({})).length;
  } catch (_) {}
  const day = usage[today] || {};
  const entries = Object.entries(day).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((s, [, v]) => s + v, 0);
  const catTotals = categoryTotals(day, settings.overrides);

  document.getElementById("total").textContent = total ? fmt(total) : "0m";
  document.getElementById("prod").textContent = total
    ? `${productiveShare(catTotals, total)}% productive today`
    : "tracking starts as you browse";

  renderRing(focusScoreForDay(day, switches[today], holes[today], settings.overrides), total);
  renderPersona({ usage, hours, switches, holes, settings });
  renderUpNext(settings, wellnessState, computeStreak(usage, settings.overrides), switches[today], tabCount);
  renderMediaStrip(media[today]);

  if (!entries.length) {
    document.getElementById("catSection").style.display = "none";
    document.getElementById("list").append(
      el("div", "empty", "Your day will appear here — browse a little and reopen.")
    );
  } else {
    renderStacked(catTotals, total);
    const list = document.getElementById("list");
    list.innerHTML = "";
    const max = entries[0][1] || 1;
    for (const [domain, secs] of entries.slice(0, 5)) list.append(siteBar(domain, secs, max));
  }

  renderBudgets(catTotals, settings.goals);

  const toggle = document.getElementById("officeToggle");
  toggle.checked = !!settings.officeMode;
  toggle.onchange = async () => {
    const fresh = await getSettings();
    fresh.officeMode = toggle.checked;
    await chrome.storage.local.set({ settings: fresh });
    try {
      chrome.runtime.sendMessage({ type: "SETTINGS_CHANGED" });
    } catch (_) {}
    load();
  };
}

document.getElementById("dash").addEventListener("click", () =>
  chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html") })
);
document.getElementById("wrapped").addEventListener("click", () =>
  chrome.tabs.create({ url: chrome.runtime.getURL("wrapped.html") })
);
document.getElementById("opts").addEventListener("click", () => chrome.runtime.openOptionsPage());
document.getElementById("reset").addEventListener("click", async (e) => {
  if (!resetArmed) {
    resetArmed = true;
    e.target.textContent = "Sure?";
    setTimeout(() => {
      resetArmed = false;
      e.target.textContent = "Reset today";
    }, 3000);
    return;
  }
  await chrome.runtime.sendMessage({ type: "RESET_TODAY" });
  location.reload();
});

load();
