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

async function renderAssign(filter) {
  const box = document.getElementById("assign");
  box.innerHTML = "";
  const { usage = {} } = await chrome.storage.local.get("usage");
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
  const ignore = document.getElementById("ignore").value
    .split(/[\n,]/).map((s) => s.trim().replace(/^https?:\/\//, "").replace(/^www\./, "")).filter(Boolean);
  const idleSeconds = Math.max(15, Math.min(600, Number(document.getElementById("idle").value) || 60));
  const retentionDays = Math.max(7, Math.min(3650, Number(document.getElementById("retention").value) || 180));
  const sunsetEnabled = document.getElementById("sunsetOn").checked;
  const sunsetHour = Math.max(20, Math.min(23, Number(document.getElementById("sunsetHour").value) || 23));
  const num = (id, lo, hi, dflt) => {
    const v = Number(document.getElementById(id).value);
    return Number.isFinite(v) && v > 0 ? Math.max(lo, Math.min(hi, Math.round(v))) : dflt;
  };
  return {
    overrides, goals, ignore, idleSeconds, retentionDays, sunsetEnabled, sunsetHour,
    eyeEnabled: document.getElementById("eyeOn").checked,
    eyeIntervalMin: num("eyeInterval", 5, 120, 20),
    eyeSnoozeMin: num("eyeSnooze", 1, 30, 5),
    officeMode: document.getElementById("officeOn").checked,
    waterIntervalMin: num("waterInterval", 10, 240, 50),
    standIntervalMin: num("standInterval", 15, 240, 60),
    mediaEnabled: document.getElementById("mediaOn").checked,
    recapEnabled: document.getElementById("recapOn").checked,
  };
}

async function save() {
  // read-merge-write: never clobber keys another surface (popup toggle) wrote
  settings = Object.assign({}, DEFAULT_SETTINGS, await getSettings(), collect());
  await chrome.storage.local.set({ settings });
  chrome.runtime.sendMessage({ type: "SETTINGS_CHANGED" });
  const saved = document.getElementById("saved");
  saved.style.display = "";
  setTimeout(() => (saved.style.display = "none"), 1800);
  renderAssign();
}

document.getElementById("save").addEventListener("click", save);

document.getElementById("export").addEventListener("click", async () => {
  const all = await chrome.storage.local.get([
    "usage", "hours", "switches", "holes", "notified", "media", "wellness", "settings",
  ]);
  const blob = new Blob([JSON.stringify({ ...all, exportedFrom: "Tabyss" }, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `tabyss-export-${dateKey(Date.now())}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
});

document.getElementById("importFile").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const data = JSON.parse(reader.result);
      const patch = {};
      if (data.usage) patch.usage = data.usage;
      if (data.hours) patch.hours = data.hours;
      if (data.switches) patch.switches = data.switches;
      if (data.holes) patch.holes = data.holes;
      if (data.notified) patch.notified = data.notified;
      if (data.media) patch.media = data.media;
      if (data.wellness) patch.wellness = data.wellness;
      if (data.settings) patch.settings = data.settings;
      await chrome.storage.local.set(patch);
      settings = await getSettings();
      init();
      alert("Import complete.");
    } catch {
      alert("That file isn't a valid Tabyss export.");
    }
  };
  reader.readAsText(file);
});

document.getElementById("clear").addEventListener("click", async (e) => {
  if (!clearArmed) {
    clearArmed = true;
    e.target.textContent = "Click again to confirm";
    setTimeout(() => { clearArmed = false; e.target.textContent = "Clear all data"; }, 3000);
    return;
  }
  await chrome.storage.local.clear();
  settings = Object.assign({}, DEFAULT_SETTINGS);
  clearArmed = false;
  e.target.textContent = "Clear all data";
  init();
});

// If another surface (the popup's office-mode toggle) writes settings while
// this page is open, refresh the form so save() can't revert it.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local" || !changes.settings) return;
  settings = Object.assign({}, DEFAULT_SETTINGS, changes.settings.newValue || {});
  document.getElementById("officeOn").checked = !!settings.officeMode;
});

document.getElementById("catSearch").addEventListener("input", (e) => renderAssign(e.target.value));
document.getElementById("openDash").addEventListener("click", () =>
  chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html") })
);

async function init() {
  settings = await getSettings();
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
  renderGoals();
  await renderAssign();
}

init();
