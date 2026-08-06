/* Tabyss — settings */

let settings = Object.assign({}, DEFAULT_SETTINGS);
let clearArmed = false;

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

const GOAL_CATS = CATEGORIES.filter((c) => c !== "Other");

function renderGoals() {
  const box = document.getElementById("goals");
  box.innerHTML = "";
  for (const cat of GOAL_CATS) {
    const row = el("div", "goalrow");
    const label = el("span", "glabel");
    const chip = el("span", "lchip");
    chip.style.background = catColor(cat);
    label.append(chip, el("span", null, cat));
    const input = el("input");
    input.type = "number";
    input.min = "0";
    input.dataset.cat = cat;
    input.value = settings.goals?.[cat] || 0;
    input.setAttribute("aria-label", `Daily ${cat} limit in minutes`);
    row.append(label, input, el("span", "unit", "min / day"));
    box.append(row);
  }
}

function renderCatSummary(domains) {
  const box = document.getElementById("catSummary");
  box.innerHTML = "";
  const counts = {};
  for (const d of domains) {
    const c = categorize(d, settings.overrides);
    counts[c] = (counts[c] || 0) + 1;
  }
  for (const cat of CATEGORIES) {
    if (!counts[cat]) continue;
    const chip = el("span", "catchip");
    const dot = el("span", "lchip");
    dot.style.background = catColor(cat);
    chip.append(dot, el("span", null, `${cat} ${counts[cat]}`));
    box.append(chip);
  }
}

let assignRenderSeq = 0;
async function renderAssign(filter) {
  // Each keystroke re-renders; only the latest call may touch the DOM, or two
  // overlapping renders would append both result sets.
  const seq = ++assignRenderSeq;
  const { usage = {} } = await chrome.storage.local.get("usage");
  if (seq !== assignRenderSeq) return;
  const box = document.getElementById("assign");
  box.innerHTML = "";
  const domains = new Set();
  for (const day of Object.values(usage)) for (const d of Object.keys(day)) domains.add(d);
  // Seed with existing overrides so an override for a domain outside the
  // retention window stays visible — and survives the next save.
  for (const d of Object.keys(settings.overrides || {})) domains.add(d);
  const all = [...domains].sort();
  renderCatSummary(all);
  const q = (filter || "").trim().toLowerCase();
  const sorted = q ? all.filter((d) => d.includes(q)) : all;
  if (!sorted.length) {
    box.append(el("div", "empty", q ? "No sites match your search." : "No sites visited yet — browse a little and come back."));
    return;
  }
  for (const domain of sorted) {
    const row = el("div", "assignrow");
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
        chip.style.background = catColor(categorize(domain, settings.overrides));
        chip.textContent = (domain[0] || "?").toUpperCase();
      });
      chip.append(img);
    } else {
      chip.style.background = catColor(categorize(domain, settings.overrides));
      chip.textContent = (domain[0] || "?").toUpperCase();
    }
    const name = el("span", "ad", domain);
    const sel = document.createElement("select");
    sel.dataset.domain = domain;
    sel.setAttribute("aria-label", `Category for ${domain}`);
    for (const c of CATEGORIES) {
      const o = document.createElement("option");
      o.value = c;
      o.textContent = c;
      sel.append(o);
    }
    sel.value = categorize(domain, settings.overrides);
    sel.addEventListener("change", () => {
      chip.style.background = catColor(sel.value);
    });
    row.append(chip, name, sel);
    box.append(row);
  }
}

function collect() {
  const goals = {};
  for (const input of document.querySelectorAll("#goals input")) {
    const v = Math.max(0, Number(input.value) || 0);
    if (v > 0) goals[input.dataset.cat] = v;
  }
  // Merge, don't rebuild: rows hidden by the search filter must keep their
  // stored overrides. Rendered rows update or clear theirs.
  const overrides = Object.assign({}, settings.overrides || {});
  for (const sel of document.querySelectorAll("#assign select")) {
    const domain = sel.dataset.domain;
    if (categorize(domain, {}) !== sel.value) overrides[domain] = sel.value;
    else delete overrides[domain];
  }
  const ignoreInputs = document.getElementById("ignore").value
    .split(/[\n,]/).map((value) => value.trim()).filter(Boolean);
  const invalidIgnore = ignoreInputs.find((value) => !normalizeDomainInput(value));
  if (invalidIgnore) throw new Error(`Invalid ignore entry: ${invalidIgnore}`);
  if (ignoreInputs.length > 1000) throw new Error("The ignore list can contain at most 1,000 entries.");
  const ignore = [...new Set(ignoreInputs.map(normalizeDomainInput))];
  const idleSeconds = Math.max(15, Math.min(600, Number(document.getElementById("idle").value) || 60));
  const retentionDays = Math.max(7, Math.min(3650, Number(document.getElementById("retention").value) || 180));
  const sunsetEnabled = document.getElementById("sunsetOn").checked;
  const sunsetHour = Math.max(20, Math.min(23, Number(document.getElementById("sunsetHour").value) || 23));
  const num = (id, lo, hi, dflt) => {
    const v = Number(document.getElementById(id).value);
    return Number.isFinite(v) && v > 0 ? Math.max(lo, Math.min(hi, Math.round(v))) : dflt;
  };
  return {
    palette: document.querySelector('input[name="palette"]:checked')?.value || "cobalt",
    appearance: document.querySelector('input[name="appearance"]:checked')?.value || "system",
    overrides, goals, ignore, idleSeconds, retentionDays, sunsetEnabled, sunsetHour,
    eyeEnabled: document.getElementById("eyeOn").checked,
    eyeIntervalMin: num("eyeInterval", 1, 120, 20),
    eyeSnoozeMin: num("eyeSnooze", 1, 30, 5),
    officeMode: document.getElementById("officeOn").checked,
    waterIntervalMin: num("waterInterval", 10, 240, 50),
    standIntervalMin: num("standInterval", 15, 240, 60),
    mediaEnabled: document.getElementById("mediaOn").checked,
    recapEnabled: document.getElementById("recapOn").checked,
    notificationSound: document.getElementById("notificationSound").checked,
    notificationDetails: document.getElementById("notificationDetails").checked,
  };
}

/* Inline, non-blocking status line. Destructive actions arm their own button
 * rather than calling confirm(), which the user can permanently suppress. */
let statusTimer = 0;
function showStatus(message, isError = false) {
  const box = document.getElementById("status");
  if (!box) return;
  box.textContent = message;
  box.classList.toggle("error", isError);
  box.hidden = false;
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => (box.hidden = true), isError ? 8000 : 2500);
}

async function save() {
  // read-merge-write: never clobber keys another surface (popup toggle) wrote.
  // The worker sanitizes and commits inside its storage mutex.
  const merged = Object.assign({}, await getSettings(), collect());
  const response = await sendWorkerRequest({ type: "SAVE_SETTINGS", settings: merged });
  settings = sanitizeSettings(response.settings);
  // Every numeric field is clamped on the way in. Writing the stored value back
  // means a clamp is visible: typing 2 into a field with a 1-minute floor used
  // to report "Saved ✓" and keep showing 2 while storage held something else.
  for (const [id, value] of [
    ["eyeInterval", settings.eyeIntervalMin],
    ["eyeSnooze", settings.eyeSnoozeMin],
    ["waterInterval", settings.waterIntervalMin],
    ["standInterval", settings.standIntervalMin],
    ["idle", settings.idleSeconds],
    ["retention", settings.retentionDays],
    ["sunsetHour", settings.sunsetHour],
  ]) {
    const field = document.getElementById(id);
    if (field && String(field.value) !== String(value)) field.value = value;
  }
  renderAssign();
}

/* Reset every preference to its shipped default. Two-step on the button, not
 * confirm(): a suppressed dialog would make this silently do nothing. Only
 * settings are touched — browsing history, saved pages and sessions are not. */
let defaultsArmed = 0;
document.getElementById("resetDefaults").addEventListener("click", async (event) => {
  const button = event.currentTarget;
  if (!defaultsArmed) {
    defaultsArmed = 1;
    button.textContent = "Reset settings? Tap again";
    button.classList.add("is-armed");
    setTimeout(() => {
      defaultsArmed = 0;
      button.textContent = "Reset to defaults";
      button.classList.remove("is-armed");
    }, 5000);
    return;
  }
  defaultsArmed = 0;
  button.textContent = "Reset to defaults";
  button.classList.remove("is-armed");
  try {
    // Keep the user's own category overrides, goals and ignore list: those are
    // data they entered, not a preference the word "default" should erase.
    const current = await getSettings();
    const fresh = Object.assign({}, DEFAULT_SETTINGS, {
      overrides: current.overrides,
      goals: current.goals,
      ignore: current.ignore,
    });
    const response = await sendWorkerRequest({ type: "SAVE_SETTINGS", settings: fresh });
    settings = sanitizeSettings(response.settings);
    await init();
    showStatus("Settings reset to defaults ✓");
  } catch (error) {
    showStatus(`Reset failed. ${error && error.message ? error.message : "Try again."}`, true);
  }
});

document.getElementById("save").addEventListener("click", async () => {
  try {
    await save();
    showStatus("Saved ✓");
  } catch (error) {
    showStatus(`Settings not saved. ${error && error.message ? error.message : "Please review the form and try again."}`, true);
  }
});

function downloadJson(payload, filename) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 0);
}

async function readBackupData() {
  const response = await sendWorkerRequest({ type: "EXPORT_DATA" });
  return response.data;
}

async function sendWorkerRequest(message) {
  const response = await chrome.runtime.sendMessage(message);
  if (!response || response.ok !== true) throw new Error(response?.error || "The background worker did not accept the request.");
  return response;
}

document.getElementById("export").addEventListener("click", async () => {
  try {
    const backup = await readBackupData();
    downloadJson(backup, `tabyss-export-${dateKey(Date.now())}.json`);
    showStatus("Backup downloaded ✓");
  } catch (error) {
    showStatus(`Export stopped. ${error && error.message ? error.message : "The background worker could not create a consistent backup."}`, true);
  }
});

document.getElementById("importFile").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  e.target.value = "";
  if (file.size > IMPORT_MAX_FILE_BYTES) {
    showStatus(`That backup is too large. Tabyss accepts files up to ${Math.round(IMPORT_MAX_FILE_BYTES / 1024 / 1024)} MB.`, true);
    return;
  }
  try {
    const data = JSON.parse(await file.text());
    const preview = validateImportData(data);
    const focusState = await sendWorkerRequest({ type: "GET_FOCUS_DATA" });
    if (focusState.focus) {
      throw new Error("Finish or end the active focus session before restoring a backup.");
    }
    const warningText = preview.warnings.length ? `\n\n${preview.warnings.join("\n")}` : "";
    const confirmed = confirm(
      `Restore ${preview.importedKeys.join(", ")} from this backup?\n\n` +
      "Those data sections will replace their current values. Tabyss will first download a safety backup." + warningText
    );
    if (!confirmed) return;

    const current = await readBackupData();
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    downloadJson(current, `tabyss-before-import-${stamp}.json`);
    const result = await sendWorkerRequest({ type: "IMPORT_DATA", data });
    await init();
    const workerWarnings = Array.isArray(result.warnings) && result.warnings.length
      ? ` ${result.warnings.join(" ")}` : "";
    showStatus(`Import complete: ${result.importedKeys.join(", ")}.${workerWarnings}`);
  } catch (error) {
    showStatus(`Import stopped. ${error && error.message ? error.message : "That file is not a valid Tabyss backup."}`, true);
  }
});

document.getElementById("clear").addEventListener("click", async (e) => {
  if (!clearArmed) {
    clearArmed = true;
    e.target.textContent = "Click again to confirm";
    setTimeout(() => { clearArmed = false; e.target.textContent = "Clear all data"; }, 3000);
    return;
  }
  try {
    await sendWorkerRequest({ type: "CLEAR_ALL_DATA" });
    settings = sanitizeSettings({});
    clearArmed = false;
    e.target.textContent = "Clear all data";
    await init();
    showStatus("All data cleared.");
  } catch (error) {
    showStatus(error && error.message ? error.message : "Tabyss could not clear the data.", true);
  }
});

let resetArmed = false;
document.getElementById("resetToday").addEventListener("click", async (e) => {
  if (!resetArmed) {
    resetArmed = true;
    e.target.textContent = "Click again to confirm";
    setTimeout(() => { resetArmed = false; e.target.textContent = "Reset today"; }, 3000);
    return;
  }
  resetArmed = false;
  e.target.textContent = "Reset today";
  try {
    await sendWorkerRequest({ type: "RESET_TODAY" });
    showStatus("Today's data was reset.");
  } catch (error) {
    showStatus(error && error.message ? error.message : "Today could not be reset.", true);
  }
});

// If another surface (the popup's office-mode toggle) writes settings while
// this page is open, refresh the form so save() can't revert it.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local" || !changes.settings) return;
  settings = sanitizeSettings(changes.settings.newValue);
  document.getElementById("officeOn").checked = !!settings.officeMode;
  checkAppearanceInputs(settings.palette, settings.appearance);
});

/* ---------- appearance: palette cards + light/dark, immediate preview ---------- */

function selectedAppearance() {
  return {
    palette: document.querySelector('input[name="palette"]:checked')?.value || "cobalt",
    appearance: document.querySelector('input[name="appearance"]:checked')?.value || "system",
  };
}

function checkAppearanceInputs(palette, appearance) {
  const pal = document.querySelector(`input[name="palette"][value="${palette}"]`);
  if (pal) pal.checked = true;
  const app = document.querySelector(`input[name="appearance"][value="${appearance}"]`);
  if (app) app.checked = true;
}

function previewAppearance() {
  const chosen = selectedAppearance();
  applyAppearance(chosen.palette, chosen.appearance);
  const palLabel = TABYSS_PALETTES[chosen.palette]?.label || "Cobalt Focus";
  const modeLabel = chosen.appearance === "system" ? "System" : chosen.appearance === "dark" ? "Dark" : "Light";
  document.getElementById("themeStatus").textContent =
    `${palLabel} · ${modeLabel} previewed. Select Save to keep it.`;
}

/* Radio-cards are built from TABYSS_PALETTES so names, descriptions and
 * swatches can never drift from the real configuration. */
function renderPaletteCards() {
  const picker = document.getElementById("palettePicker");
  const chosen = document.querySelector('input[name="palette"]:checked')?.value ||
    settings.palette || "cobalt";
  for (const label of picker.querySelectorAll("label")) label.remove();
  const scheme = currentThemeIsDark() ? "dark" : "light";
  for (const [key, palette] of Object.entries(TABYSS_PALETTES)) {
    const card = el("label", "palette-option");
    const input = el("input");
    input.type = "radio";
    input.name = "palette";
    input.value = key;
    input.checked = key === chosen;
    input.addEventListener("change", previewAppearance);
    const body = el("span", "palette-body");
    const swatches = el("span", "palette-swatches");
    swatches.setAttribute("aria-hidden", "true");
    for (const colourKey of ["primary", "accent", "warm"]) {
      const dot = el("i");
      dot.style.background = palette[scheme][colourKey];
      swatches.append(dot);
    }
    body.append(el("strong", null, palette.label), swatches, el("small", null, palette.description));
    card.append(input, body);
    picker.append(card);
  }
}

for (const input of document.querySelectorAll('input[name="appearance"]')) {
  input.addEventListener("change", previewAppearance);
}

document.addEventListener("tabyss-theme-change", () => {
  renderPaletteCards(); // swatches follow the active light/dark scheme
  renderGoals();
  renderAssign(document.getElementById("catSearch").value);
});

document.getElementById("catSearch").addEventListener("input", (e) => renderAssign(e.target.value));
document.getElementById("openDash").addEventListener("click", () =>
  chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html") })
);

async function init() {
  settings = await getSettings(); // getSettings applies palette + appearance
  renderPaletteCards();
  checkAppearanceInputs(settings.palette, settings.appearance);
  document.getElementById("themeStatus").textContent = "";
  document.getElementById("ignore").value = (settings.ignore || []).join("\n");
  document.getElementById("idle").value = settings.idleSeconds || 60;
  document.getElementById("retention").value = settings.retentionDays || 180;
  document.getElementById("sunsetOn").checked = settings.sunsetEnabled !== false;
  document.getElementById("sunsetHour").value = settings.sunsetHour || 23;
  document.getElementById("eyeOn").checked = settings.eyeEnabled !== false;
  document.getElementById("eyeInterval").value = settings.eyeIntervalMin || 20;
  document.getElementById("eyeSnooze").value = settings.eyeSnoozeMin || 5;
  document.getElementById("officeOn").checked = !!settings.officeMode;
  document.getElementById("waterInterval").value = settings.waterIntervalMin || 50;
  document.getElementById("standInterval").value = settings.standIntervalMin || 60;
  document.getElementById("mediaOn").checked = settings.mediaEnabled !== false;
  document.getElementById("recapOn").checked = settings.recapEnabled !== false;
  document.getElementById("notificationDetails").checked = !!settings.notificationDetails;
  document.getElementById("notificationSound").checked = settings.notificationSound !== false;
  renderGoals();
  await renderAssign();
}

init().catch((error) => {
  showStatus(`Tabyss could not load your settings. ${error && error.message ? error.message : "Try reopening this page."}`, true);
});
