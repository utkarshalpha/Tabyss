/* Tabyss V2 Command Center — local-first plans, context and recovery. */

let commandState = null;
let focusState = null;
let focusHistory = [];
let pendingPlanId = "";
let capsuleFilter = "saved";
let duplicateCloseArmed = false;
let focusClockTimer = null;

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text != null) element.textContent = text;
  return element;
}

function button(label, action, id, className = "btn compact") {
  const element = node("button", className, label);
  element.type = "button";
  element.dataset.action = action;
  if (id) element.dataset.id = id;
  return element;
}

function showFeedback(message, tone = "info") {
  const box = document.getElementById("ccFeedback");
  box.textContent = message;
  box.dataset.tone = tone;
  box.hidden = !message;
  if (message) setTimeout(() => { if (box.textContent === message) box.hidden = true; }, 5000);
}

async function productRequest(action, payload = {}) {
  const message = action === "get"
    ? { type: "GET_PRODUCT_DATA" }
    : { type: "PRODUCT_COMMAND", action, ...payload };
  const response = await chrome.runtime.sendMessage(message);
  if (!response?.ok) throw new Error(response?.error || "The request could not be completed safely.");
  return response;
}

async function focusRequest(type, payload = {}) {
  const response = await chrome.runtime.sendMessage({ type, ...payload });
  if (!response?.ok) throw new Error(response?.error || "The focus session could not be updated.");
  return response;
}

function activeProfile() {
  return commandState?.product?.activeProfileId || "profile_personal";
}

function inActiveProfile(record) {
  return record.profileId === activeProfile();
}

function formatWhen(timestamp) {
  return new Date(timestamp).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function splitDomains(value) {
  return [...new Set(String(value || "").split(/[\n,]/).map((item) => item.trim()).filter(Boolean))];
}

function splitUrls(value) {
  return [...new Set(String(value || "").split(/\n/).map((item) => item.trim()).filter(Boolean))];
}

function emptyState(text) {
  return node("p", "empty cc-empty", text);
}

function metaLine(parts) {
  return node("p", "item-meta", parts.filter(Boolean).join(" · "));
}

function faviconBadge(pageOrDomain, label) {
  const badge = node("span", "page-favicon");
  badge.setAttribute("aria-hidden", "true");
  const fallbackText = String(label || pageOrDomain || "?").trim().charAt(0).toUpperCase() || "?";
  const showFallback = () => {
    badge.replaceChildren(fallbackText);
    badge.classList.add("is-fallback");
  };
  const source = faviconUrl(pageOrDomain, 32);
  if (!source) {
    showFallback();
    return badge;
  }
  const image = document.createElement("img");
  image.src = source;
  image.alt = "";
  image.addEventListener("error", showFallback, { once: true });
  badge.append(image);
  return badge;
}

function faviconStack(pages) {
  const sources = [];
  const seen = new Set();
  for (const page of Array.isArray(pages) ? pages : []) {
    const candidate = typeof page === "string" ? { url: page, title: page } : page;
    if (!candidate?.url || seen.has(candidate.url)) continue;
    seen.add(candidate.url);
    sources.push(candidate);
  }
  if (!sources.length) return null;
  const stack = node("div", "favicon-stack");
  stack.setAttribute("aria-label", `${sources.length} saved page${sources.length === 1 ? "" : "s"}`);
  for (const page of sources.slice(0, 5)) stack.append(faviconBadge(page.url, page.title));
  if (sources.length > 5) stack.append(node("span", "favicon-overflow", `+${sources.length - 5}`));
  return stack;
}

function itemIdentity(primary, secondary, pageOrDomain) {
  const identity = node("div", "item-identity");
  identity.append(faviconBadge(pageOrDomain, primary));
  const copy = node("div", "item-copy");
  copy.append(node("h3", "", primary));
  if (secondary) copy.append(node("p", "item-preview", secondary));
  identity.append(copy);
  return identity;
}

function renderProfiles() {
  const select = document.getElementById("profileSelect");
  select.replaceChildren();
  for (const profile of commandState.product.profiles) {
    const option = node("option", "", profile.name);
    option.value = profile.id;
    option.selected = profile.id === activeProfile();
    select.append(option);
  }
  const current = commandState.product.profiles.find((profile) => profile.id === activeProfile());
  document.getElementById("ccGreeting").textContent = current ? `${current.name} mode, without the noise` : "Choose the mode for this moment";
  document.getElementById("profileDelete").hidden = !current || current.builtIn;
}

function renderImpact() {
  const days = new Set(Array.from({ length: 7 }, (_, offset) => shiftDay(dateKey(Date.now()), -offset)));
  const outcomeDays = new Set(focusHistory
    .filter((session) => days.has(session.day) && session.outcome === "completed")
    .map((session) => session.day));
  const minutes = Math.round(focusHistory
    .filter((session) => days.has(session.day))
    .reduce((sum, session) => sum + Math.max(0, Number(session.focusedMs) || 0), 0) / 60000);
  let returns = 0;
  for (const [day, counts] of Object.entries(commandState.product.recoveryByDay)) {
    if (days.has(day)) {
      returns += counts.returned || 0;
      if ((counts.returned || 0) > 0) outcomeDays.add(day);
    }
  }
  document.getElementById("impactDays").textContent = `${outcomeDays.size}/3`;
  document.getElementById("impactMinutes").textContent = `${minutes}m`;
  document.getElementById("impactReturns").textContent = String(returns);
}

function focusElapsed(focus) {
  if (!focus) return 0;
  return Math.max(0, focus.elapsedMs + (focus.status === "running" ? Date.now() - focus.snapshotAt : 0));
}

function clockText(milliseconds) {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return hours
    ? `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
    : `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function renderFocusClock() {
  if (!focusState) return;
  const elapsed = focusElapsed(focusState);
  const timer = focusState.mode === "timer";
  const limit = timer ? focusState.targetMs : FOCUS_MAX_RUNNING_MS;
  document.getElementById("focusNowClock").textContent = clockText(timer ? Math.max(0, limit - elapsed) : elapsed);
  document.getElementById("focusNowHint").textContent = focusState.status === "paused"
    ? "paused" : focusState.status === "review" ? "ready to review" : timer ? "remaining" : "elapsed";
  document.getElementById("focusNowProgress").style.width = `${Math.min(100, (elapsed / limit) * 100)}%`;
}

function renderFocus() {
  if (focusClockTimer) clearInterval(focusClockTimer);
  focusClockTimer = null;
  const box = document.getElementById("focusNow");
  box.hidden = !focusState;
  if (!focusState) return;
  document.getElementById("focusNowTitle").textContent = focusState.intention;
  const success = document.getElementById("focusNowSuccess");
  success.textContent = focusState.successDefinition ? `Done looks like: ${focusState.successDefinition}` : "";
  success.hidden = !focusState.successDefinition;
  document.getElementById("focusNowStatus").textContent = focusState.status === "running" ? "In focus" : focusState.status === "paused" ? "Paused" : "Review";
  const pause = document.getElementById("focusNowPause");
  pause.textContent = focusState.status === "paused" ? "Resume" : "Pause";
  pause.hidden = focusState.status === "review";
  document.getElementById("focusNowExtend").hidden = focusState.mode !== "timer";
  renderFocusClock();
  focusClockTimer = setInterval(renderFocusClock, 500);
}

function renderRestoreOffer() {
  const contract = commandState.product.activeContract;
  document.getElementById("restoreOffer").hidden = !(contract && contract.status === "finished" && contract.restoreOnFinish);
}

function planCard(plan) {
  const card = node("article", "item-card");
  const heading = node("div", "item-heading");
  const copy = node("div", "item-copy");
  copy.append(node("h3", "", plan.name), node("p", "item-intention", plan.intention));
  const protection = node("span", `status-chip ${plan.protection === "nudge" ? "accent" : ""}`, plan.protection === "nudge" ? "Mindful nudge" : "Observe");
  heading.append(copy, protection);
  const session = plan.mode === "timer" ? `${plan.targetMinutes} min` : "Open-ended";
  const schedule = plan.schedule.enabled ? `${plan.schedule.days.length} day schedule · ${plan.schedule.time}` : "Manual start";
  const context = [plan.spaceId ? "Space" : "", plan.relevantUrls.length ? `${plan.relevantUrls.length} page${plan.relevantUrls.length === 1 ? "" : "s"}` : ""].filter(Boolean).join(" + ");
  const actions = node("div", "button-row item-actions");
  actions.append(
    button("Preview & start", "preview-plan", plan.id, "btn primary compact"),
    button("Edit", "edit-plan", plan.id),
    button("Delete", "delete-plan", plan.id, "btn compact quiet-danger")
  );
  card.append(heading, metaLine([session, schedule, context]));
  const linkedSpace = commandState.product.spaces.find((space) => space.id === plan.spaceId);
  const pages = linkedSpace ? [...plan.relevantUrls, ...linkedSpace.tabs.map((tab) => tab.url)] : plan.relevantUrls;
  const icons = faviconStack(pages);
  if (icons) card.append(icons);
  card.append(actions);
  return card;
}

function renderPlans() {
  const list = document.getElementById("planList");
  list.replaceChildren();
  const plans = commandState.product.plans.filter(inActiveProfile);
  if (!plans.length) {
    list.append(emptyState("No plans yet. Create one reusable path into focused work."));
    const starters = node("div", "starter-row");
    starters.append(
      button("Use Deep work starter", "starter-plan", "deep", "btn compact"),
      button("Use Study sprint starter", "starter-plan", "study", "btn compact")
    );
    list.append(starters);
  }
  else plans.forEach((plan) => list.append(planCard(plan)));
  renderSpaceOptions();
}

function renderSpaceOptions() {
  const select = document.getElementById("planSpace");
  const selected = select.value;
  select.replaceChildren();
  const none = node("option", "", "No Space");
  none.value = "";
  select.append(none);
  for (const space of commandState.product.spaces.filter(inActiveProfile)) {
    const option = node("option", "", `${space.name} (${space.tabs.length} tabs)`);
    option.value = space.id;
    select.append(option);
  }
  if ([...select.options].some((option) => option.value === selected)) select.value = selected;
}

function spaceCard(space) {
  const card = node("article", "item-card");
  const heading = node("div", "item-heading");
  const copy = node("div", "item-copy");
  copy.append(node("h3", "", space.name), metaLine([`${space.tabs.length} tabs`, `Updated ${formatWhen(space.updatedAt)}`]));
  heading.append(copy);
  card.append(heading);
  const domains = [...new Set(space.tabs.map((tab) => { try { return new URL(tab.url).hostname; } catch (_) { return ""; } }).filter(Boolean))].slice(0, 4);
  if (domains.length) card.append(node("p", "item-preview", domains.join(" · ")));
  const icons = faviconStack(space.tabs);
  if (icons) card.append(icons);
  const actions = node("div", "button-row item-actions");
  actions.append(
    button("Restore", "restore-space", space.id, "btn primary compact"),
    button("Update from window", "update-space", space.id),
    button("Delete", "delete-space", space.id, "btn compact quiet-danger")
  );
  card.append(actions);
  return card;
}

function renderSpaces() {
  const list = document.getElementById("spaceList");
  list.replaceChildren();
  const spaces = commandState.product.spaces.filter(inActiveProfile);
  if (!spaces.length) list.append(emptyState("No Spaces saved. Save this window when its tabs form a useful context."));
  else spaces.forEach((space) => list.append(spaceCard(space)));
}

function capsuleCard(capsule) {
  const card = node("article", `item-card ${capsule.status === "done" ? "is-done" : ""}`);
  const heading = node("div", "item-heading");
  heading.append(itemIdentity(capsule.title, capsule.domain, capsule.url), node("span", "status-chip", capsule.status === "done" ? "Done" : "To revisit"));
  card.append(heading);
  if (capsule.note) card.append(node("p", "item-intention", capsule.note));
  card.append(metaLine([`Saved ${formatWhen(capsule.savedAt)}`]));
  const actions = node("div", "button-row item-actions");
  actions.append(button("Open", "open-capsule", capsule.id, "btn primary compact"));
  actions.append(button(capsule.status === "done" ? "Reopen loop" : "Mark done", "toggle-capsule", capsule.id));
  actions.append(button("Delete", "delete-capsule", capsule.id, "btn compact quiet-danger"));
  card.append(actions);
  return card;
}

function renderCapsules() {
  const list = document.getElementById("capsuleList");
  list.replaceChildren();
  const capsules = commandState.product.capsules
    .filter(inActiveProfile)
    .filter((capsule) => capsuleFilter === "all" || capsule.status === capsuleFilter);
  if (!capsules.length) list.append(emptyState(capsuleFilter === "saved" ? "Nothing waiting. Save a tempting page without losing your current intention." : "No Return Capsules in this view."));
  else capsules.forEach((capsule) => list.append(capsuleCard(capsule)));
}

function renderRecovery() {
  const duplicateCard = document.getElementById("duplicateCard");
  duplicateCard.replaceChildren();
  const extras = commandState.duplicates.reduce((sum, group) => sum + group.length - 1, 0);
  const title = node("div", "recovery-tool-copy");
  title.append(node("h3", "", extras ? `${extras} duplicate tab${extras === 1 ? "" : "s"}` : "No duplicate tabs"));
  title.append(node("p", "cc-muted", extras ? `${commandState.duplicates.length} repeated page${commandState.duplicates.length === 1 ? "" : "s"}. A checkpoint is saved before cleanup.` : "Your current window has one copy of each saved page."));
  duplicateCard.append(title);
  if (extras) {
    const details = node("details", "duplicate-details");
    details.append(node("summary", "", "Review repeated pages"));
    const list = node("div", "duplicate-preview-list");
    for (const group of commandState.duplicates) {
      let domain = "saved page";
      try { domain = new URL(group[0].url).hostname; } catch (_) {}
      list.append(previewRow(group[0].title || domain, `${domain} · ${group.length} copies`, group[0].url));
    }
    details.append(list);
    duplicateCard.append(details, button(duplicateCloseArmed ? `Confirm close ${extras}` : `Review & close ${extras}`, "close-duplicates", "", duplicateCloseArmed ? "btn danger compact" : "btn compact"));
  }

  const list = document.getElementById("checkpointList");
  list.replaceChildren();
  const checkpoints = commandState.product.checkpoints;
  if (!checkpoints.length) list.append(emptyState("No checkpoints yet. Tabyss creates them automatically before bulk changes."));
  for (const checkpoint of checkpoints) {
    const card = node("article", "item-card compact-card");
    card.append(node("h3", "", checkpoint.label), metaLine([`${checkpoint.tabs.length} tabs`, formatWhen(checkpoint.createdAt), checkpoint.reason]));
    const icons = faviconStack(checkpoint.tabs);
    if (icons) card.append(icons);
    const actions = node("div", "button-row item-actions");
    actions.append(button("Restore checkpoint", "restore-checkpoint", checkpoint.id, "btn primary compact"));
    actions.append(button("Delete", "delete-checkpoint", checkpoint.id, "btn compact quiet-danger"));
    card.append(actions);
    list.append(card);
  }
}

function renderAll() {
  renderProfiles();
  renderFocus();
  renderRestoreOffer();
  renderImpact();
  renderPlans();
  renderSpaces();
  renderCapsules();
  renderRecovery();
}

async function refresh() {
  const [product, focus] = await Promise.all([productRequest("get"), focusRequest("GET_FOCUS_DATA")]);
  commandState = product;
  focusState = focus.focus || null;
  focusHistory = Array.isArray(focus.focusSessions) ? focus.focusSessions : [];
  renderAll();
}

function switchView(view) {
  for (const tab of document.querySelectorAll(".cc-tab")) {
    const active = tab.dataset.view === view;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", String(active));
  }
  for (const panel of document.querySelectorAll("[data-panel]")) panel.hidden = panel.dataset.panel !== view;
}

function resetPlanForm(plan = null) {
  const form = document.getElementById("planForm");
  form.reset();
  document.getElementById("planId").value = plan?.id || "";
  document.getElementById("planFormTitle").textContent = plan ? `Edit ${plan.name}` : "New plan";
  document.getElementById("planName").value = plan?.name || "";
  document.getElementById("planIntention").value = plan?.intention || "";
  document.getElementById("planSuccess").value = plan?.successDefinition || "";
  document.getElementById("planMode").value = plan?.mode === "stopwatch" ? "stopwatch" : String(plan?.targetMinutes || 50);
  document.getElementById("planProtection").value = plan?.protection || "observe";
  document.getElementById("planAllowed").value = (plan?.allowedDomains || []).join("\n");
  document.getElementById("planBlocked").value = (plan?.blockedDomains || []).join("\n");
  document.getElementById("planUrls").value = (plan?.relevantUrls || []).join("\n");
  document.getElementById("planSpace").value = plan?.spaceId || "";
  document.getElementById("planPark").checked = plan?.parkUnrelated === true;
  document.getElementById("planRestore").checked = plan?.restoreOnFinish !== false;
  document.getElementById("scheduleEnabled").checked = plan?.schedule.enabled === true;
  document.getElementById("scheduleTime").value = plan?.schedule.time || "09:00";
  const selectedDays = new Set(plan?.schedule.days || [1, 2, 3, 4, 5]);
  for (const input of document.querySelectorAll('input[name="scheduleDay"]')) input.checked = selectedDays.has(Number(input.value));
  document.querySelector(".editor-advanced").open = !!(plan && (
    plan.allowedDomains.length || plan.blockedDomains.length || plan.relevantUrls.length ||
    plan.spaceId || plan.parkUnrelated || plan.schedule.enabled
  ));
  form.hidden = false;
  document.getElementById("planName").focus();
}

function closePlanForm() {
  document.getElementById("planForm").hidden = true;
}

function planPayload() {
  const duration = document.getElementById("planMode").value;
  return {
    id: document.getElementById("planId").value || undefined,
    profileId: activeProfile(),
    name: document.getElementById("planName").value,
    intention: document.getElementById("planIntention").value,
    successDefinition: document.getElementById("planSuccess").value,
    mode: duration === "stopwatch" ? "stopwatch" : "timer",
    targetMinutes: duration === "stopwatch" ? null : Number(duration),
    protection: document.getElementById("planProtection").value,
    allowedDomains: splitDomains(document.getElementById("planAllowed").value),
    blockedDomains: splitDomains(document.getElementById("planBlocked").value),
    relevantUrls: splitUrls(document.getElementById("planUrls").value),
    spaceId: document.getElementById("planSpace").value,
    parkUnrelated: document.getElementById("planPark").checked,
    restoreOnFinish: document.getElementById("planRestore").checked,
    schedule: {
      enabled: document.getElementById("scheduleEnabled").checked,
      days: [...document.querySelectorAll('input[name="scheduleDay"]:checked')].map((input) => Number(input.value)),
      time: document.getElementById("scheduleTime").value,
    },
  };
}

function previewRow(primary, secondary, pageOrDomain) {
  const row = node("div", "preview-row");
  row.append(faviconBadge(pageOrDomain, primary));
  const copy = node("div", "preview-copy");
  copy.append(node("strong", "", primary), node("span", "", secondary));
  row.append(copy);
  return row;
}

async function previewPlan(id) {
  const response = await productRequest("contract-preview", { planId: id });
  commandState = response;
  pendingPlanId = id;
  const contract = response.contract;
  document.getElementById("contractTitle").textContent = contract.planName;
  document.getElementById("contractIntention").textContent = contract.intention;
  document.getElementById("contractSummary").textContent = `${contract.unrelated.length} tab${contract.unrelated.length === 1 ? "" : "s"} to park · ${contract.open.length} page${contract.open.length === 1 ? "" : "s"} to open`;
  const park = document.getElementById("contractParkList");
  park.replaceChildren();
  contract.unrelated.forEach((tab) => park.append(previewRow(tab.title, tab.domain, tab.url)));
  document.getElementById("contractParkBlock").hidden = !contract.unrelated.length;
  const open = document.getElementById("contractOpenList");
  open.replaceChildren();
  contract.open.forEach((page) => open.append(previewRow(page.domain, page.url, page.url)));
  document.getElementById("contractOpenBlock").hidden = !contract.open.length;
  document.getElementById("contractStart").textContent = contract.unrelated.length || contract.open.length ? "Confirm and start" : "Start plan";
  document.getElementById("contractDialog").showModal();
}

async function updateFromResponse(response, message) {
  commandState = response.product ? response : commandState;
  if (response.focus !== undefined) focusState = response.focus;
  if (response.focusSessions) focusHistory = response.focusSessions;
  if (message) showFeedback(message, "success");
  await refresh();
}

document.querySelector(".cc-tabs").addEventListener("click", (event) => {
  const tab = event.target.closest("[data-view]");
  if (tab) switchView(tab.dataset.view);
});

document.getElementById("profileSelect").addEventListener("change", async (event) => {
  try { await updateFromResponse(await productRequest("set-profile", { profileId: event.target.value }), "Profile switched."); }
  catch (error) { showFeedback(error.message, "error"); }
});

document.getElementById("profileAdd").addEventListener("click", () => {
  document.getElementById("profileForm").hidden = false;
  document.getElementById("profileName").focus();
});
document.getElementById("profileCancel").addEventListener("click", () => { document.getElementById("profileForm").hidden = true; });
document.getElementById("profileDelete").addEventListener("click", async () => {
  const profile = commandState.product.profiles.find((item) => item.id === activeProfile());
  if (!profile || profile.builtIn || !confirm(`Remove the ${profile.name} profile and its plans, Spaces, and Return Capsules?`)) return;
  try { await updateFromResponse(await productRequest("delete-profile", { profileId: profile.id }), "Profile removed."); }
  catch (error) { showFeedback(error.message, "error"); }
});
document.getElementById("profileForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  try {
    const knownIds = new Set(commandState.product.profiles.map((profile) => profile.id));
    const response = await productRequest("upsert-profile", { profile: { name: document.getElementById("profileName").value } });
    const created = response.product.profiles.find((profile) => !knownIds.has(profile.id));
    commandState = response;
    if (created) commandState = await productRequest("set-profile", { profileId: created.id });
    form.reset();
    form.hidden = true;
    await updateFromResponse(commandState, "Profile created.");
  } catch (error) { showFeedback(error.message, "error"); }
});

document.getElementById("newPlan").addEventListener("click", () => resetPlanForm());
document.getElementById("planCancel").addEventListener("click", closePlanForm);
document.getElementById("planCancelBottom").addEventListener("click", closePlanForm);
document.getElementById("planForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await updateFromResponse(await productRequest("upsert-plan", { plan: planPayload() }), "Plan saved.");
    closePlanForm();
  } catch (error) { showFeedback(error.message, "error"); }
});

document.getElementById("spaceForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  try {
    await updateFromResponse(await productRequest("save-space", { space: { name: document.getElementById("spaceName").value, profileId: activeProfile() } }), "Current window saved as a Space.");
    form.reset();
  } catch (error) { showFeedback(error.message, "error"); }
});

document.getElementById("capsuleForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  try {
    await updateFromResponse(await productRequest("save-capsule", { note: document.getElementById("capsuleNote").value }), "Active page saved for later.");
    form.reset();
  } catch (error) { showFeedback(error.message, "error"); }
});

document.querySelector(".filter-row").addEventListener("click", (event) => {
  const filter = event.target.closest("[data-capsule-filter]");
  if (!filter) return;
  capsuleFilter = filter.dataset.capsuleFilter;
  for (const chip of document.querySelectorAll("[data-capsule-filter]")) chip.classList.toggle("active", chip === filter);
  renderCapsules();
});

document.getElementById("checkpointForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  try {
    await updateFromResponse(await productRequest("checkpoint", { label: document.getElementById("checkpointName").value || "Manual checkpoint" }), "Checkpoint saved.");
    form.reset();
  } catch (error) { showFeedback(error.message, "error"); }
});

document.getElementById("contractStart").addEventListener("click", async () => {
  if (!pendingPlanId) return;
  const start = document.getElementById("contractStart");
  start.disabled = true;
  try {
    document.getElementById("contractDialog").close();
    await updateFromResponse(await productRequest("start-plan", { planId: pendingPlanId, confirmed: true }), "Focus Contract started. Your checkpoint is ready.");
    pendingPlanId = "";
  } catch (error) { showFeedback(error.message, "error"); }
  finally { start.disabled = false; }
});

document.body.addEventListener("click", async (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  const { action, id } = target.dataset;
  try {
    if (action === "preview-plan") await previewPlan(id);
    else if (action === "starter-plan") {
      const starter = id === "study"
        ? { name: "Study sprint", intention: "Complete one focused study block", successDefinition: "Capture the next step", targetMinutes: 25 }
        : { name: "Deep work", intention: "Move one important task to done", successDefinition: "A clear result or next step", targetMinutes: 50 };
      const response = await productRequest("upsert-plan", { plan: {
        profileId: activeProfile(), name: starter.name, intention: starter.intention,
        successDefinition: starter.successDefinition, mode: "timer", targetMinutes: starter.targetMinutes,
        protection: "observe", allowedDomains: [], blockedDomains: [], relevantUrls: [], spaceId: "",
        parkUnrelated: false, restoreOnFinish: true, schedule: { enabled: false, days: [], time: "09:00" },
      } });
      await updateFromResponse(response, `${starter.name} starter added. Edit it anytime.`);
    }
    else if (action === "edit-plan") resetPlanForm(commandState.product.plans.find((plan) => plan.id === id));
    else if (action === "delete-plan") {
      if (!confirm("Delete this plan? Saved Spaces and browsing history remain.")) return;
      await updateFromResponse(await productRequest("delete-plan", { planId: id }), "Plan deleted.");
    } else if (action === "restore-space") {
      const response = await productRequest("restore-space", { spaceId: id });
      await updateFromResponse(response, `${response.restore.opened} missing tab${response.restore.opened === 1 ? "" : "s"} restored.`);
    } else if (action === "update-space") {
      const space = commandState.product.spaces.find((item) => item.id === id);
      await updateFromResponse(await productRequest("save-space", { space: { id, name: space.name, profileId: space.profileId } }), "Space updated from this window.");
    } else if (action === "delete-space") {
      if (!confirm("Delete this Space? Open tabs are not affected.")) return;
      await updateFromResponse(await productRequest("delete-space", { spaceId: id }), "Space deleted.");
    } else if (action === "open-capsule") {
      const capsule = commandState.product.capsules.find((item) => item.id === id);
      if (capsule) await chrome.tabs.create({ url: capsule.url });
    } else if (action === "toggle-capsule") {
      const capsule = commandState.product.capsules.find((item) => item.id === id);
      await updateFromResponse(await productRequest("update-capsule", { capsuleId: id, status: capsule.status === "done" ? "saved" : "done", note: capsule.note }), capsule.status === "done" ? "Return Capsule reopened." : "Loop closed.");
    } else if (action === "delete-capsule") {
      if (!confirm("Delete this Return Capsule?")) return;
      await updateFromResponse(await productRequest("delete-capsule", { capsuleId: id }), "Return Capsule deleted.");
    } else if (action === "restore-checkpoint") {
      const response = await productRequest("restore-checkpoint", { checkpointId: id });
      await updateFromResponse(response, `${response.restore.opened} missing tab${response.restore.opened === 1 ? "" : "s"} restored.`);
    } else if (action === "delete-checkpoint") {
      if (!confirm("Delete this recovery checkpoint?")) return;
      await updateFromResponse(await productRequest("delete-checkpoint", { checkpointId: id }), "Checkpoint deleted.");
    } else if (action === "close-duplicates") {
      if (!duplicateCloseArmed) {
        duplicateCloseArmed = true;
        renderRecovery();
        const details = document.querySelector(".duplicate-details");
        if (details) details.open = true;
        showFeedback("Repeated pages are shown. Confirm once more to close the extra copies.");
        return;
      }
      const response = await productRequest("close-duplicates", { confirmed: true });
      duplicateCloseArmed = false;
      await updateFromResponse(response, `${response.closed} duplicate tab${response.closed === 1 ? "" : "s"} closed. A checkpoint was saved.`);
    }
  } catch (error) { showFeedback(error.message, "error"); }
});

document.getElementById("focusNowPause").addEventListener("click", async () => {
  try {
    const response = await focusRequest(focusState?.status === "paused" ? "RESUME_FOCUS" : "PAUSE_FOCUS");
    focusState = response.focus;
    renderFocus();
  } catch (error) { showFeedback(error.message, "error"); }
});
document.getElementById("focusNowExtend").addEventListener("click", async () => {
  try { const response = await focusRequest("EXTEND_FOCUS", { minutes: 10 }); focusState = response.focus; renderFocus(); }
  catch (error) { showFeedback(error.message, "error"); }
});
document.getElementById("focusNowComplete").addEventListener("click", async () => {
  try { await focusRequest("COMPLETE_FOCUS", { note: "Completed from Command Center" }); await refresh(); showFeedback("Session completed. Your return checkpoint is ready.", "success"); }
  catch (error) { showFeedback(error.message, "error"); }
});
document.getElementById("focusNowEnd").addEventListener("click", async () => {
  if (!confirm("End this session unfinished? Your focus history and recovery checkpoint will be kept.")) return;
  try { await focusRequest("ABANDON_FOCUS", { reason: "other", note: "Ended from Command Center" }); await refresh(); showFeedback("Session ended. Your return checkpoint is ready."); }
  catch (error) { showFeedback(error.message, "error"); }
});

document.getElementById("restoreContract").addEventListener("click", async () => {
  try {
    const response = await productRequest("restore-contract");
    await updateFromResponse(response, `${response.restore.opened} missing tab${response.restore.opened === 1 ? "" : "s"} restored.`);
  } catch (error) { showFeedback(error.message, "error"); }
});
document.getElementById("dismissContract").addEventListener("click", async () => {
  try { await updateFromResponse(await productRequest("dismiss-contract"), "Current tabs kept."); }
  catch (error) { showFeedback(error.message, "error"); }
});

document.getElementById("ccDashboard").addEventListener("click", () => chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html") }));
document.getElementById("ccSettings").addEventListener("click", () => chrome.runtime.openOptionsPage());

refresh().catch((error) => showFeedback(error.message, "error"));
