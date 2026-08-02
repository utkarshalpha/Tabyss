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

/* ---------- intention-first focus session ---------- */
let focusSnapshot = null;
let focusTimer = null;
let focusCheckoutOpen = false;
let focusReviewRequested = false;

function showFocusError(message) {
  const box = document.getElementById("focusError");
  box.textContent = message || "The focus session could not be updated.";
  box.hidden = false;
}

function clearFocusError() {
  const box = document.getElementById("focusError");
  box.textContent = "";
  box.hidden = true;
}

async function focusRequest(type, payload = {}) {
  clearFocusError();
  const response = await chrome.runtime.sendMessage({ type, ...payload });
  if (!response || response.ok !== true) throw new Error(response?.error || "The background worker did not accept the request.");
  return response;
}

function focusLiveElapsed(focus, now = Date.now()) {
  if (!focus) return 0;
  const extra = focus.status === "running" ? Math.max(0, now - focus.snapshotAt) : 0;
  const limit = focus.mode === "timer" ? focus.targetMs : FOCUS_MAX_RUNNING_MS;
  return Math.min(limit, focus.elapsedMs + extra);
}

function focusClockText(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return hours
    ? `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    : `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function renderFocusClock() {
  const focus = focusSnapshot;
  if (!focus) return;
  const elapsed = focusLiveElapsed(focus);
  const clock = document.getElementById("focusClock");
  const hint = document.getElementById("focusClockHint");
  const progress = document.getElementById("focusProgress");
  const fill = document.getElementById("focusProgressFill");
  const limit = focus.mode === "timer" ? focus.targetMs : FOCUS_MAX_RUNNING_MS;

  if (focus.mode === "timer") {
    const remaining = Math.max(0, focus.targetMs - elapsed);
    clock.textContent = focusClockText(remaining);
    hint.textContent = focus.status === "review" ? "ready to review" : focus.status === "paused" ? "remaining · paused" : "remaining";
    progress.setAttribute("aria-valuemin", "0");
    progress.setAttribute("aria-valuemax", String(focus.targetMs));
    progress.setAttribute("aria-valuenow", String(Math.round(elapsed)));
  } else {
    clock.textContent = focusClockText(elapsed);
    hint.textContent = focus.status === "review" ? "safety check-in" : focus.status === "paused" ? "elapsed · paused" : "elapsed";
    progress.setAttribute("aria-valuemin", "0");
    progress.setAttribute("aria-valuemax", String(FOCUS_MAX_RUNNING_MS));
    progress.setAttribute("aria-valuenow", String(Math.round(elapsed)));
  }
  fill.style.width = `${Math.min(100, (elapsed / limit) * 100)}%`;

  if (focus.status === "running" && elapsed >= limit && !focusReviewRequested) {
    focusReviewRequested = true;
    refreshFocus().catch((error) => showFocusError(error.message));
  }
}

function populateRecentIntentions(sessions) {
  const list = document.getElementById("recentIntentions");
  list.innerHTML = "";
  const seen = new Set();
  for (const session of [...sessions].reverse()) {
    if (!session?.intention || seen.has(session.intention)) continue;
    seen.add(session.intention);
    const option = document.createElement("option");
    option.value = session.intention;
    list.append(option);
    if (seen.size >= 6) break;
  }
}

function renderFocus(data) {
  focusSnapshot = data.focus || null;
  populateRecentIntentions(Array.isArray(data.focusSessions) ? data.focusSessions : []);
  if (data.focusHistoryAvailable === false) {
    showFocusError("Focus history could not be validated. Restore a known-good backup or clear local data before starting another session.");
  }
  const create = document.getElementById("focusCreate");
  const activeBox = document.getElementById("focusActive");
  const status = document.getElementById("focusStatus");
  if (focusTimer) clearInterval(focusTimer);
  focusTimer = null;
  focusReviewRequested = false;

  if (!focusSnapshot) {
    create.hidden = false;
    activeBox.hidden = true;
    status.hidden = true;
    focusCheckoutOpen = false;
    return;
  }

  create.hidden = true;
  activeBox.hidden = false;
  status.hidden = false;
  status.textContent = {
    running: "In focus",
    paused: "Paused",
    review: "Ready to review",
  }[focusSnapshot.status] || "Focus session";
  document.getElementById("focusTitle").textContent = focusSnapshot.intention;
  const success = document.getElementById("focusSuccessView");
  success.textContent = focusSnapshot.successDefinition || "";
  success.hidden = !focusSnapshot.successDefinition;

  const pause = document.getElementById("focusPause");
  pause.textContent = focusSnapshot.status === "paused" ? "Resume" : "Pause";
  pause.hidden = focusSnapshot.status === "review";
  document.getElementById("focusExtend").hidden = focusSnapshot.mode !== "timer";
  if (focusSnapshot.status === "review") focusCheckoutOpen = true;
  document.getElementById("focusCheckout").hidden = !focusCheckoutOpen;
  document.getElementById("focusControls").hidden = focusCheckoutOpen;
  renderFocusClock();
  focusTimer = setInterval(renderFocusClock, 500);
}

async function refreshFocus() {
  const data = await focusRequest("GET_FOCUS_DATA");
  renderFocus(data);
}

function announceFocus(message) {
  document.getElementById("focusAnnouncement").textContent = message;
}

document.getElementById("focusCreate").addEventListener("submit", async (event) => {
  event.preventDefault();
  const duration = document.getElementById("focusDuration").value;
  const button = event.submitter || event.currentTarget.querySelector("button[type=submit]");
  button.disabled = true;
  try {
    const data = await focusRequest("START_FOCUS", {
      intention: document.getElementById("focusIntention").value,
      successDefinition: document.getElementById("focusSuccess").value,
      mode: duration === "stopwatch" ? "stopwatch" : "timer",
      targetMinutes: duration === "stopwatch" ? null : Number(duration),
    });
    focusCheckoutOpen = false;
    renderFocus(data);
    announceFocus("Focus session started.");
  } catch (error) {
    showFocusError(error.message);
  } finally {
    button.disabled = false;
  }
});

document.getElementById("focusPause").addEventListener("click", async () => {
  try {
    const type = focusSnapshot?.status === "paused" ? "RESUME_FOCUS" : "PAUSE_FOCUS";
    renderFocus(await focusRequest(type));
    announceFocus(type === "RESUME_FOCUS" ? "Focus session resumed." : "Focus session paused.");
  } catch (error) { showFocusError(error.message); }
});

document.getElementById("focusExtend").addEventListener("click", async () => {
  try {
    focusCheckoutOpen = false;
    renderFocus(await focusRequest("EXTEND_FOCUS", { minutes: 10 }));
    announceFocus("Focus session extended by 10 minutes.");
  } catch (error) { showFocusError(error.message); }
});

document.getElementById("focusFinish").addEventListener("click", () => {
  focusCheckoutOpen = true;
  document.getElementById("focusCheckout").hidden = false;
  document.getElementById("focusControls").hidden = true;
  document.getElementById("focusNote").focus();
});

document.getElementById("focusCheckoutBack").addEventListener("click", () => {
  focusCheckoutOpen = false;
  document.getElementById("focusCheckout").hidden = true;
  document.getElementById("focusControls").hidden = false;
});

async function closeFocus(type, announcement) {
  try {
    const data = await focusRequest(type, {
      note: document.getElementById("focusNote").value,
      reason: type === "ABANDON_FOCUS" ? document.getElementById("focusReason").value : "",
    });
    document.getElementById("focusNote").value = "";
    document.getElementById("focusReason").value = "";
    document.getElementById("focusIntention").value = "";
    document.getElementById("focusSuccess").value = "";
    focusCheckoutOpen = false;
    renderFocus(data);
    announceFocus(announcement);
  } catch (error) { showFocusError(error.message); }
}

document.getElementById("focusComplete").addEventListener("click", () => closeFocus("COMPLETE_FOCUS", "Focus session marked completed."));
document.getElementById("focusAbandon").addEventListener("click", () => closeFocus("ABANDON_FOCUS", "Focus session ended unfinished."));

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
    if (box.children.length >= 2) return;
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

Promise.allSettled([load(), refreshFocus()]).then((results) => {
  if (results[1].status === "rejected") showFocusError(results[1].reason?.message);
});
