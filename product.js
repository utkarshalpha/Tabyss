/* Tabyss V2 local product model.
 *
 * Plans, profiles, Spaces, Return Capsules, checkpoints and recovery outcomes are
 * explicit user-created records. They are bounded, schema-versioned, validated on
 * every trust-boundary crossing and stored in chrome.storage.local. Nothing here
 * performs network I/O or reads page content.
 */

const PRODUCT_SCHEMA_VERSION = 1;
const PRODUCT_LIMITS = Object.freeze({
  profiles: 12,
  plans: 100,
  spaces: 60,
  tabsPerSpace: 100,
  capsules: 500,
  checkpoints: 20,
  title: 120,
  note: 240,
  url: 2048,
  domains: 80,
  recoveryDays: 400,
});
const PRODUCT_PROFILE_COLORS = ["#5b3fd6", "#2f6fba", "#1e7a58", "#946112", "#b83a52", "#c73f88"];
const PRODUCT_PROTECTION_LEVELS = new Set(["observe", "nudge"]);

function productFailure(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

function productText(value, maxLength, required = false) {
  if (value == null && !required) return "";
  if (typeof value !== "string") productFailure("PRODUCT_INVALID_TEXT");
  const text = value.trim().replace(/\s+/g, " ");
  if ((required && !text) || text.length > maxLength) productFailure("PRODUCT_INVALID_TEXT");
  return text;
}

// Page titles come from arbitrary websites, not from a bounded user field. Keep a
// useful, safe prefix instead of making an otherwise valid save fail because a site
// chose a long document title. Iterate by Unicode code point so truncation never
// leaves a broken surrogate at the boundary.
function productCapturedTitle(value, fallback) {
  const supplied = typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
  const backup = typeof fallback === "string" ? fallback.trim().replace(/\s+/g, " ") : "";
  const source = supplied || backup || "Untitled page";
  let title = "";
  for (const character of source) {
    if (title.length + character.length > PRODUCT_LIMITS.title) break;
    title += character;
  }
  return productText(title || "Untitled page", PRODUCT_LIMITS.title, true);
}

function productSavedPageNote(value) {
  if (value == null) return "";
  if (typeof value !== "string") productFailure("PRODUCT_INVALID_NOTE");
  const note = value.trim().replace(/\s+/g, " ");
  if (note.length > PRODUCT_LIMITS.note) productFailure("PRODUCT_INVALID_NOTE");
  return note;
}

function productId(value, prefix) {
  if (typeof value !== "string" || !new RegExp(`^${prefix}_[a-z0-9_-]{3,72}$`).test(value)) {
    productFailure("PRODUCT_INVALID_ID");
  }
  return value;
}

function productTimestamp(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 && number <= 8640000000000000 ? Math.round(number) : fallback;
}

function productUrl(value) {
  if (typeof value !== "string" || !value || value.length > PRODUCT_LIMITS.url) productFailure("PRODUCT_INVALID_URL");
  let url;
  try { url = new URL(value); } catch (_) { productFailure("PRODUCT_INVALID_URL"); }
  if (!url || !["http:", "https:"].includes(url.protocol) || url.username || url.password) {
    productFailure("PRODUCT_INVALID_URL");
  }
  const normalized = url.href;
  if (normalized.length > PRODUCT_LIMITS.url) productFailure("PRODUCT_INVALID_URL");
  return normalized;
}

function productUrlKey(value) {
  try {
    const url = new URL(productUrl(value));
    url.hash = "";
    if (url.pathname === "/") url.pathname = "";
    return url.href;
  } catch (_) { return ""; }
}

function productDomain(value) {
  const domain = normalizeDomainInput(value);
  if (!domain) productFailure("PRODUCT_INVALID_DOMAIN");
  return domain;
}

function productDomainList(value) {
  if (value == null) return [];
  if (!Array.isArray(value) || value.length > PRODUCT_LIMITS.domains) productFailure("PRODUCT_INVALID_DOMAIN");
  const out = [];
  const seen = new Set();
  for (const entry of value) {
    const domain = productDomain(entry);
    if (!seen.has(domain)) { seen.add(domain); out.push(domain); }
  }
  return out;
}

function productUrlList(value, max = 25) {
  if (value == null) return [];
  if (!Array.isArray(value) || value.length > max) productFailure("PRODUCT_INVALID_URL");
  const out = [];
  const seen = new Set();
  for (const entry of value) {
    const url = productUrl(entry);
    const key = productUrlKey(url);
    if (!seen.has(key)) { seen.add(key); out.push(url); }
  }
  return out;
}

function builtInProfiles() {
  return [
    { id: "profile_personal", name: "Personal", color: "#5b3fd6", builtIn: true, createdAt: 0, updatedAt: 0 },
    { id: "profile_work", name: "Work", color: "#2f6fba", builtIn: true, createdAt: 0, updatedAt: 0 },
    { id: "profile_study", name: "Study", color: "#1e7a58", builtIn: true, createdAt: 0, updatedAt: 0 },
  ];
}

function defaultProductData() {
  return {
    version: PRODUCT_SCHEMA_VERSION,
    activeProfileId: "profile_personal",
    profiles: builtInProfiles(),
    plans: [],
    spaces: [],
    capsules: [],
    checkpoints: [],
    activeContract: null,
    guardBypasses: {},
    schedulePrompts: {},
    recoveryByDay: {},
    preferences: { notificationBudget: 6, checkpointOnBulkAction: true },
  };
}

function sanitizeProductProfile(value) {
  if (!isPlainObject(value)) productFailure("PRODUCT_INVALID_PROFILE");
  const id = productId(value.id, "profile");
  const builtIn = ["profile_personal", "profile_work", "profile_study"].includes(id);
  const color = typeof value.color === "string" && /^#[0-9a-f]{6}$/i.test(value.color)
    ? value.color.toLowerCase() : PRODUCT_PROFILE_COLORS[0];
  return {
    id,
    name: productText(value.name, 40, true),
    color,
    builtIn,
    createdAt: builtIn ? 0 : productTimestamp(value.createdAt),
    updatedAt: builtIn ? 0 : productTimestamp(value.updatedAt),
  };
}

function sanitizeProductPlan(value) {
  if (!isPlainObject(value)) productFailure("PRODUCT_INVALID_PLAN");
  const mode = value.mode === "stopwatch" ? "stopwatch" : value.mode === "timer" ? "timer" : null;
  if (!mode) productFailure("PRODUCT_INVALID_PLAN");
  const minutes = mode === "timer" ? boundedNumber(value.targetMinutes, 5, 240, 50) : null;
  const protection = PRODUCT_PROTECTION_LEVELS.has(value.protection) ? value.protection : "observe";
  const schedule = isPlainObject(value.schedule) ? value.schedule : {};
  const days = Array.isArray(schedule.days)
    ? [...new Set(schedule.days.filter((day) => Number.isInteger(day) && day >= 0 && day <= 6))].slice(0, 7)
    : [];
  const time = typeof schedule.time === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(schedule.time)
    ? schedule.time : "09:00";
  return {
    id: productId(value.id, "plan"),
    profileId: productId(value.profileId || "profile_personal", "profile"),
    spaceId: value.spaceId ? productId(value.spaceId, "space") : "",
    name: productText(value.name, 80, true),
    intention: productText(value.intention, FOCUS_MAX_TEXT, true),
    successDefinition: productText(value.successDefinition, FOCUS_MAX_DETAIL),
    mode,
    targetMinutes: minutes,
    protection,
    allowedDomains: productDomainList(value.allowedDomains),
    blockedDomains: productDomainList(value.blockedDomains),
    relevantUrls: productUrlList(value.relevantUrls, 25),
    parkUnrelated: value.parkUnrelated === true,
    restoreOnFinish: value.restoreOnFinish !== false,
    schedule: { enabled: schedule.enabled === true && days.length > 0, days, time },
    createdAt: productTimestamp(value.createdAt),
    updatedAt: productTimestamp(value.updatedAt),
  };
}

function sanitizeProductTab(value) {
  if (!isPlainObject(value)) productFailure("PRODUCT_INVALID_TAB");
  return {
    url: productUrl(value.url),
    // Titles originate from browser tabs, so older records may exceed today's
    // storage limit. Normalize them without letting one legacy title block all
    // Saved Pages commands.
    title: productCapturedTitle(value.title, "Untitled tab"),
    pinned: value.pinned === true,
    index: boundedNumber(value.index, 0, 10000, 0),
  };
}

function sanitizeProductSpace(value) {
  if (!isPlainObject(value) || !Array.isArray(value.tabs) || value.tabs.length > PRODUCT_LIMITS.tabsPerSpace) {
    productFailure("PRODUCT_INVALID_SPACE");
  }
  const tabs = [];
  const seen = new Set();
  for (const candidate of value.tabs) {
    const tab = sanitizeProductTab(candidate);
    const key = productUrlKey(tab.url);
    if (!seen.has(key)) { seen.add(key); tabs.push(tab); }
  }
  return {
    id: productId(value.id, "space"),
    profileId: productId(value.profileId || "profile_personal", "profile"),
    name: productText(value.name, 80, true),
    tabs,
    createdAt: productTimestamp(value.createdAt),
    updatedAt: productTimestamp(value.updatedAt),
  };
}

function sanitizeProductCapsule(value) {
  if (!isPlainObject(value)) productFailure("PRODUCT_INVALID_CAPSULE");
  const url = productUrl(value.url);
  const status = value.status === "done" ? "done" : "saved";
  return {
    id: productId(value.id, "capsule"),
    profileId: productId(value.profileId || "profile_personal", "profile"),
    planId: value.planId ? productId(value.planId, "plan") : "",
    url,
    domain: productDomain(new URL(url).hostname),
    title: productCapturedTitle(value.title, new URL(url).hostname),
    note: productText(value.note, PRODUCT_LIMITS.note),
    status,
    savedAt: productTimestamp(value.savedAt),
    updatedAt: productTimestamp(value.updatedAt),
  };
}

function sanitizeProductCheckpoint(value) {
  if (!isPlainObject(value) || !Array.isArray(value.tabs) || value.tabs.length > PRODUCT_LIMITS.tabsPerSpace) {
    productFailure("PRODUCT_INVALID_CHECKPOINT");
  }
  return {
    id: productId(value.id, "checkpoint"),
    label: productText(value.label || "Browser checkpoint", 80, true),
    tabs: value.tabs.map(sanitizeProductTab),
    createdAt: productTimestamp(value.createdAt),
    reason: ["manual", "focus", "duplicates", "shutdown"].includes(value.reason) ? value.reason : "manual",
  };
}

function sanitizeActiveContract(value) {
  if (value == null) return null;
  if (!isPlainObject(value)) productFailure("PRODUCT_INVALID_CONTRACT");
  return {
    planId: productId(value.planId, "plan"),
    checkpointId: value.checkpointId ? productId(value.checkpointId, "checkpoint") : "",
    startedAt: productTimestamp(value.startedAt),
    finishedAt: productTimestamp(value.finishedAt),
    restoreOnFinish: value.restoreOnFinish !== false,
    status: value.status === "finished" ? "finished" : "active",
  };
}

function sanitizeProductData(value) {
  if (value == null) return defaultProductData();
  if (!isPlainObject(value) || value.version !== PRODUCT_SCHEMA_VERSION) productFailure("PRODUCT_DATA_CORRUPT");
  const mapRecords = (items, max, sanitizer, code) => {
    if (!Array.isArray(items) || items.length > max) productFailure(code);
    const out = [];
    const seen = new Set();
    for (const item of items) {
      const record = sanitizer(item);
      if (seen.has(record.id)) productFailure(code);
      seen.add(record.id);
      out.push(record);
    }
    return out;
  };
  const profiles = mapRecords(value.profiles, PRODUCT_LIMITS.profiles, sanitizeProductProfile, "PRODUCT_INVALID_PROFILE");
  for (const profile of builtInProfiles()) {
    if (!profiles.some((item) => item.id === profile.id)) profiles.unshift(profile);
  }
  if (profiles.length > PRODUCT_LIMITS.profiles) productFailure("PRODUCT_INVALID_PROFILE");
  const profileIds = new Set(profiles.map((item) => item.id));
  const plans = mapRecords(value.plans, PRODUCT_LIMITS.plans, sanitizeProductPlan, "PRODUCT_INVALID_PLAN")
    .filter((item) => profileIds.has(item.profileId));
  const spaces = mapRecords(value.spaces, PRODUCT_LIMITS.spaces, sanitizeProductSpace, "PRODUCT_INVALID_SPACE")
    .filter((item) => profileIds.has(item.profileId));
  const planIds = new Set(plans.map((item) => item.id));
  const spaceIds = new Set(spaces.map((item) => item.id));
  for (const plan of plans) if (plan.spaceId && !spaceIds.has(plan.spaceId)) plan.spaceId = "";
  const capsules = mapRecords(value.capsules, PRODUCT_LIMITS.capsules, sanitizeProductCapsule, "PRODUCT_INVALID_CAPSULE")
    .filter((item) => profileIds.has(item.profileId) && (!item.planId || planIds.has(item.planId)));
  const checkpoints = mapRecords(value.checkpoints, PRODUCT_LIMITS.checkpoints, sanitizeProductCheckpoint, "PRODUCT_INVALID_CHECKPOINT");
  const guardBypasses = {};
  if (!isPlainObject(value.guardBypasses)) productFailure("PRODUCT_DATA_CORRUPT");
  for (const [rawDomain, rawUntil] of Object.entries(value.guardBypasses).slice(-PRODUCT_LIMITS.domains)) {
    const domain = normalizeDomainInput(rawDomain);
    const until = productTimestamp(rawUntil);
    if (domain && until > Date.now()) guardBypasses[domain] = until;
  }
  const recoveryByDay = {};
  if (!isPlainObject(value.recoveryByDay)) productFailure("PRODUCT_DATA_CORRUPT");
  for (const [day, counts] of Object.entries(value.recoveryByDay)
    .sort(([a], [b]) => a.localeCompare(b)).slice(-PRODUCT_LIMITS.recoveryDays)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !isPlainObject(counts)) continue;
    recoveryByDay[day] = {
      shown: boundedNumber(counts.shown, 0, 100000, 0),
      returned: boundedNumber(counts.returned, 0, 100000, 0),
      continued: boundedNumber(counts.continued, 0, 100000, 0),
      saved: boundedNumber(counts.saved, 0, 100000, 0),
    };
  }
  const schedulePrompts = {};
  if (!isPlainObject(value.schedulePrompts)) productFailure("PRODUCT_DATA_CORRUPT");
  for (const [rawPlanId, promptKey] of Object.entries(value.schedulePrompts).slice(-PRODUCT_LIMITS.plans)) {
    if (!planIds.has(rawPlanId) || typeof promptKey !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(promptKey)) continue;
    schedulePrompts[rawPlanId] = promptKey;
  }
  let activeContract = sanitizeActiveContract(value.activeContract);
  if (activeContract && (!planIds.has(activeContract.planId) ||
      (activeContract.checkpointId && !checkpoints.some((item) => item.id === activeContract.checkpointId)))) {
    activeContract = null;
  }
  const preferences = isPlainObject(value.preferences) ? value.preferences : {};
  return {
    version: PRODUCT_SCHEMA_VERSION,
    activeProfileId: profileIds.has(value.activeProfileId) ? value.activeProfileId : "profile_personal",
    profiles: profiles.slice(0, PRODUCT_LIMITS.profiles),
    plans,
    spaces,
    capsules,
    checkpoints,
    activeContract,
    guardBypasses,
    schedulePrompts,
    recoveryByDay,
    preferences: {
      notificationBudget: boundedNumber(preferences.notificationBudget, 1, 20, 6),
      checkpointOnBulkAction: preferences.checkpointOnBulkAction !== false,
    },
  };
}

function productDomainMatches(domain, rules) {
  return Array.isArray(rules) && rules.some((rule) => domainMatchesRule(domain, rule));
}

function productTabIsPlanned(tab, plan) {
  let url;
  try { url = new URL(tab.url); } catch (_) { return true; }
  if (!["http:", "https:"].includes(url.protocol)) return true;
  const domain = normalizeDomainInput(url.hostname);
  if (!domain) return true;
  // An allow-only list is the complete contract when present. The pause list is
  // the simpler alternative for plans that otherwise allow normal browsing.
  if (plan.allowedDomains.length) return productDomainMatches(domain, plan.allowedDomains);
  return !productDomainMatches(domain, plan.blockedDomains);
}

function productDuplicateGroups(tabs) {
  const groups = new Map();
  for (const tab of Array.isArray(tabs) ? tabs : []) {
    if (!tab || tab.incognito || typeof tab.url !== "string") continue;
    const key = productUrlKey(tab.url);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({
      id: tab.id,
      windowId: tab.windowId,
      active: tab.active === true,
      title: productCapturedTitle(tab.title, new URL(key).hostname),
      url: productUrl(tab.url),
    });
  }
  return [...groups.values()].filter((group) => group.length > 1);
}
