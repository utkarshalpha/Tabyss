/* Tabyss — popup: intention and today at a glance (v2.0) */

// On Firefox for Android the "popup" is a full-width sheet, not a 380px bubble.
if (/Android/i.test(navigator.userAgent)) document.body.classList.add("compact-screen");

const today = dateKey(Date.now());

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

/* ---------- simple intentional session ---------- */
let focusSnapshot = null;
let focusTimer = null;
let focusReviewRequested = false;

/* The header dial. Two registers, one object: with no session it is a drawn
 * clock; with a session it becomes an instrument — the hour hand fades out,
 * the minute hand runs backwards like a kitchen timer, and the ring drains
 * with the time left.
 *
 * Idle sits at 12:20, not the 10:10 of watch photography: at 20px two hands
 * of similar length splayed upward read as a checkmark, not as a clock. An
 * upright minute hand against a short hand at four o'clock stays legible. */
const DIAL_CIRCUMFERENCE = 2 * Math.PI * 9.1;
const DIAL_IDLE = { hour: 120, minute: 0 };

function setDialArc(fraction) {
  const arc = document.getElementById("dialArc");
  const shown = Math.max(0, Math.min(1, fraction)) * DIAL_CIRCUMFERENCE;
  arc.setAttribute("stroke-dasharray", `${shown} ${DIAL_CIRCUMFERENCE - shown}`);
}

function renderDial(focus, elapsed) {
  const button = document.getElementById("focusToggle");
  const hour = document.getElementById("dialHour");
  const minute = document.getElementById("dialMin");

  if (!focus) {
    button.dataset.state = "idle";
    button.title = "Intentional session";
    hour.setAttribute("transform", `rotate(${DIAL_IDLE.hour} 12 12)`);
    minute.setAttribute("transform", `rotate(${DIAL_IDLE.minute} 12 12)`);
    setDialArc(0);
    return;
  }

  button.dataset.state = focus.status;
  button.title = `Intentional session — ${focus.intention}`;
  if (focus.mode === "timer") {
    const left = Math.max(0, 1 - elapsed / focus.targetMs);
    setDialArc(left);
    minute.setAttribute("transform", `rotate(${left * 360} 12 12)`);
  } else {
    // Open-ended: no target to drain, so the hand simply sweeps the seconds.
    setDialArc(Math.min(1, elapsed / FOCUS_MAX_RUNNING_MS));
    minute.setAttribute("transform", `rotate(${((elapsed / 1000) % 60) * 6} 12 12)`);
  }
}

function focusPanelOpen() {
  return !document.getElementById("focusPanel").hidden;
}

function setFocusPanel(open, { focusField = false } = {}) {
  const panel = document.getElementById("focusPanel");
  const toggle = document.getElementById("focusToggle");
  panel.hidden = !open;
  toggle.setAttribute("aria-expanded", String(open));
  if (!open || !focusField) return;
  const field = document.getElementById("focusIntention");
  if (!field.closest("[hidden]")) field.focus();
}

function showFocusError(message) {
  const box = document.getElementById("focusError");
  box.textContent = message || "The session could not be updated.";
  box.hidden = false;
  setFocusPanel(true); // an error inside a collapsed sheet is an error nobody reads
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
  renderDial(focus, elapsed);

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

function renderFocusSites(domains) {
  const list = document.getElementById("focusSiteList");
  list.innerHTML = "";
  const sites = Array.isArray(domains) ? domains : [];
  if (!sites.length) {
    list.append(el("span", "focus-sites-empty", "No tracked sites yet"));
    return;
  }
  for (const domain of sites.slice(0, 6)) {
    const item = el("span", "focus-site");
    item.setAttribute("role", "listitem");
    item.title = domain;
    item.append(siteChip(domain), el("span", "focus-site-domain", domain));
    list.append(item);
  }
  if (sites.length > 6) list.append(el("span", "focus-sites-more", `+${sites.length - 6} more`));
}

function renderFocus(data) {
  focusSnapshot = data.focus || null;
  populateRecentIntentions(Array.isArray(data.focusSessions) ? data.focusSessions : []);
  if (data.focusHistoryAvailable === false) {
    showFocusError("Session history could not be validated. Restore a known-good backup or clear local data before starting another session.");
  }
  const create = document.getElementById("focusCreate");
  const activeBox = document.getElementById("focusActive");
  const status = document.getElementById("focusStatus");
  const heading = document.getElementById("focusHeading");
  if (focusTimer) clearInterval(focusTimer);
  focusTimer = null;
  focusReviewRequested = false;
  closeCheckout(); // any state change collapses an open check-out panel

  if (!focusSnapshot) {
    heading.textContent = "What matters now?";
    create.hidden = false;
    activeBox.hidden = true;
    status.hidden = true;
    renderDial(null, 0);
    return;
  }

  // A running timer is never hidden behind a closed panel.
  setFocusPanel(true);
  // The intention becomes the heading rather than sitting under a "Current
  // session" line that says nothing the status pill has not already said.
  heading.textContent = focusSnapshot.intention;
  create.hidden = true;
  activeBox.hidden = false;
  status.hidden = false;
  status.textContent = {
    running: "Running",
    paused: "Paused",
    review: "Ready to review",
  }[focusSnapshot.status] || "Session";
  renderFocusSites(focusSnapshot.visitedDomains);

  const pause = document.getElementById("focusPause");
  pause.textContent = focusSnapshot.status === "paused" ? "Resume" : "Pause";
  pause.hidden = focusSnapshot.status === "review";
  document.getElementById("focusExtend").hidden = focusSnapshot.mode !== "timer";
  renderFocusClock();
  focusTimer = setInterval(renderFocusClock, 500);
}

async function refreshFocus() {
  const data = await focusRequest("GET_FOCUS_DATA");
  renderFocus(data);
}

function announceFocus(message) {
  const announcement = document.getElementById("focusAnnouncement");
  announcement.textContent = message;
  announcement.hidden = !message;
}

document.getElementById("focusCreate").addEventListener("submit", async (event) => {
  event.preventDefault();
  const duration = document.querySelector('input[name="focusDuration"]:checked')?.value || "25";
  const button = event.submitter || event.currentTarget.querySelector("button[type=submit]");
  button.disabled = true;
  try {
    const data = await focusRequest("START_FOCUS", {
      intention: document.getElementById("focusIntention").value,
      successDefinition: document.getElementById("focusSuccess").value.trim(),
      mode: duration === "stopwatch" ? "stopwatch" : "timer",
      targetMinutes: duration === "stopwatch" ? null : Number(duration),
    });
    document.getElementById("focusSuccess").value = "";
    document.querySelector(".focus-definedone")?.removeAttribute("open");
    renderFocus(data);
    announceFocus("Session started.");
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
    announceFocus(type === "RESUME_FOCUS" ? "Session resumed." : "Session paused.");
  } catch (error) { showFocusError(error.message); }
});

document.getElementById("focusExtend").addEventListener("click", async () => {
  try {
    renderFocus(await focusRequest("EXTEND_FOCUS", { minutes: 10 }));
    announceFocus("Session extended by 10 minutes.");
  } catch (error) { showFocusError(error.message); }
});

/* Check-out: Complete/End first opens a small optional note (+ reason when
 * ending unfinished) — the worker and dashboard already understand both. */
let checkoutMode = null;

function closeCheckout() {
  checkoutMode = null;
  const checkout = document.getElementById("focusCheckout");
  if (!checkout) return;
  checkout.hidden = true;
  document.getElementById("focusControls").hidden = false;
}

function openCheckout(mode) {
  checkoutMode = mode;
  document.getElementById("focusControls").hidden = true;
  document.getElementById("focusReasonRow").hidden = mode !== "abandon";
  document.getElementById("focusCheckoutConfirm").textContent =
    mode === "complete" ? "Completed" : "End unfinished";
  const checkout = document.getElementById("focusCheckout");
  checkout.hidden = false;
  document.getElementById("focusNote").focus();
}

async function closeFocus(type, announcement, payload) {
  const controls = [...document.querySelectorAll("#focusCheckout button, #focusControls button")];
  for (const control of controls) control.disabled = true;
  try {
    const data = await focusRequest(type, payload);
    document.getElementById("focusIntention").value = "";
    document.getElementById("focusNote").value = "";
    document.getElementById("focusReason").value = "";
    renderFocus(data);
    announceFocus(announcement);
  } catch (error) {
    showFocusError(error.message);
  } finally {
    for (const control of controls) control.disabled = false;
  }
}

document.getElementById("focusComplete").addEventListener("click", () => openCheckout("complete"));
document.getElementById("focusAbandon").addEventListener("click", () => openCheckout("abandon"));
document.getElementById("focusCheckoutBack").addEventListener("click", () => closeCheckout());
document.getElementById("focusCheckoutConfirm").addEventListener("click", () => {
  const note = document.getElementById("focusNote").value.trim();
  const reason = checkoutMode === "abandon" ? document.getElementById("focusReason").value : "";
  if (checkoutMode === "complete") closeFocus("COMPLETE_FOCUS", "Session completed.", { note, reason: "" });
  else closeFocus("ABANDON_FOCUS", "Session ended.", { note, reason });
});

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
  row.setAttribute("aria-label", `Your week: ${p.name}. ${p.epithet.label}`);
  row.onclick = () => {
    detail.hidden = !detail.hidden;
    row.setAttribute("aria-expanded", String(!detail.hidden));
  };
}

/* Up-next timeline: every enabled reminder with its countdown. Time-sensitive
 * cues (eye/water/stand) are added first and must all fit — the cap only trims
 * the informational tail (streak, switches, tabs). */
function renderUpNext(settings, ws, streak, switchCount, tabCount) {
  const box = document.getElementById("upnext");
  box.innerHTML = "";
  const now = Date.now();
  const row = (icon, name, value, hint) => {
    if (box.children.length >= 4) return;
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

/* Scroll and watch time belong in Today, not only behind the details toggle —
 * they are the numbers people open the popup to check. Each chip carries the
 * rule in its tooltip so "how is this counted?" has an answer in place. */
function renderTodayMedia(mediaDay) {
  const box = document.getElementById("todayMedia");
  box.innerHTML = "";
  const kinds = [
    ["shorts", "⚡", "Shorts", "Shorts/Reels surfaces, counted only with a clip actually playing or active flicking."],
    ["video", "▶", "Video", "Unmuted playback over 90 seconds long, or anything fullscreen. Muted autoplay teasers do not count."],
  ];
  let shown = 0;
  for (const [kind, icon, name, how] of kinds) {
    const total = Object.values((mediaDay || {})[kind] || {}).reduce((s, v) => s + v, 0);
    if (!total) continue;
    const chip = el("span", "tmchip");
    chip.title = how;
    chip.append(el("span", "tmicon", icon), el("span", "tmname", name), el("span", "tmval mono", fmtShort(total)));
    box.append(chip);
    shown++;
  }
  box.hidden = shown === 0;
}

function renderMediaStrip(mediaDay) {
  const kinds = [
    ["video", "Video"],
    ["shorts", "Shorts"],
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
    status.style.color = over ? "var(--danger)" : pct >= 75 ? "var(--warn-ink)" : "var(--ink2)";
    meta.append(chip, name, status);

    const track = el("div", "track");
    const fill = el("div", "fill");
    fill.style.width = Math.max(3, pct) + "%";
    fill.style.background = over ? "var(--danger)" : pct >= 75 ? "var(--warn)" : catColor(cat);
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
  renderTodayMedia(media[today]);
  renderMediaStrip(media[today]);
  const list = document.getElementById("list");
  list.innerHTML = "";

  if (!entries.length) {
    document.getElementById("catSection").style.display = "none";
    list.append(
      el("div", "empty", "Your day will appear here — browse a little and reopen.")
    );
  } else {
    renderStacked(catTotals, total);
    const max = entries[0][1] || 1;
    for (const [domain, secs] of entries.slice(0, 5)) list.append(siteBar(domain, secs, max));
  }

  renderBudgets(catTotals, settings.goals);

  const toggle = document.getElementById("officeToggle");
  toggle.checked = !!settings.officeMode;
  toggle.onchange = async () => {
    // The worker sanitizes and commits inside its storage mutex.
    try {
      const fresh = await getSettings();
      fresh.officeMode = toggle.checked;
      const response = await chrome.runtime.sendMessage({ type: "SAVE_SETTINGS", settings: fresh });
      if (!response || response.ok !== true) throw new Error(response?.error || "Save failed");
    } catch (error) {
      toggle.checked = !toggle.checked; // revert the visual state on failure
      const box = document.getElementById("officeError");
      box.textContent = "Office mode could not be saved. Try again.";
      box.hidden = false;
      return;
    }
    load().catch(() => {});
  };
}

document.getElementById("dash").addEventListener("click", () =>
  chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html") })
);
document.getElementById("wrapped").addEventListener("click", () =>
  chrome.tabs.create({ url: chrome.runtime.getURL("wrapped.html") })
);
document.getElementById("focusToggle").addEventListener("click", () => {
  setFocusPanel(!focusPanelOpen(), { focusField: true });
});
document.getElementById("focusClose").addEventListener("click", () => {
  setFocusPanel(false);
  document.getElementById("focusToggle").focus();
});
document.getElementById("opts").addEventListener("click", () => chrome.runtime.openOptionsPage());
document.getElementById("savedPages").addEventListener("click", async () => {
  try {
    const win = await chrome.windows.getCurrent();
    await chrome.sidePanel.open({ windowId: win.id }); // Chrome
    window.close();
    return;
  } catch (_) { /* fall through */ }
  try {
    await chrome.sidebarAction.open(); // Firefox sidebar
    window.close();
    return;
  } catch (_) { /* fall through */ }
  chrome.tabs.create({ url: chrome.runtime.getURL("sidepanel.html") });
});
Promise.allSettled([load(), refreshFocus()]).then((results) => {
  if (results[0].status === "rejected") {
    // A half-empty popup with no explanation is worse than an error line.
    document.getElementById("total").textContent = "—";
    document.getElementById("prod").textContent = "Today's data could not be loaded. Reopen the popup.";
  }
  if (results[1].status === "rejected") showFocusError(results[1].reason?.message);
});

document.addEventListener("tabyss-theme-change", () => load().catch(() => {}));
