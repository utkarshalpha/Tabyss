/* Local UI-test adapter. Loaded only by tests/ui-server.js; never packaged. */
(() => {
  const today = new Date().toISOString().slice(0, 10);
  const store = {
    usage: { [today]: { "docs.example.com": 1200, "youtube.com": 300 } },
    settings: {},
    focusSessions: [{
      version: 1,
      id: "ui_seed_focus_001",
      day: today,
      intention: "Review the V2 launch brief",
      successDefinition: "Decision-ready draft",
      mode: "timer",
      targetMinutes: 25,
      startedAt: Date.now() - 30 * 60000,
      endedAt: Date.now() - 5 * 60000,
      focusedMs: 25 * 60000,
      outcome: "completed",
      abandonedReason: "",
      note: "Shared with the team",
      visitedDomains: ["docs.example.com", "youtube.com"],
    }],
  };
  let focus = null;
  let product = null;
  let productSequence = 1;
  const tabs = [
    { id: 11, windowId: 1, index: 0, active: true, pinned: false, incognito: false, title: "Launch brief", url: "https://docs.example.com/launch" },
    { id: 12, windowId: 1, index: 1, active: false, pinned: false, incognito: false, title: "Research", url: "https://example.com/research" },
    { id: 13, windowId: 1, index: 2, active: false, pinned: false, incognito: false, title: "Research duplicate", url: "https://example.com/research#notes" },
  ];
  const listeners = [];
  const ensureProduct = () => {
    if (!product) product = defaultProductData();
    return product;
  };
  const mockProductId = (prefix) => `${prefix}_ui${String(productSequence++).padStart(6, "0")}`;
  const publicProduct = () => ({ product: ensureProduct(), tabs, duplicates: productDuplicateGroups(tabs) });
  const pick = (keys) => {
    if (keys == null) return { ...store };
    const list = Array.isArray(keys) ? keys : [keys];
    return Object.fromEntries(list.filter((key) => Object.hasOwn(store, key)).map((key) => [key, store[key]]));
  };
  globalThis.chrome = {
    runtime: {
      id: "tabyss-ui-test",
      getURL: (path) => new URL(path, location.origin).toString(),
      openOptionsPage: async () => {},
      sendMessage: async (message) => {
        if (message.type === "CLEAR_ALL_DATA") {
          for (const key of Object.keys(store)) delete store[key];
        }
        if (message.type === "EXPORT_DATA") {
          return { ok: true, data: buildExportPayload(store) };
        }
        if (message.type === "GET_PRODUCT_DATA") return { ok: true, ...publicProduct() };
        if (message.type === "PRODUCT_COMMAND") {
          const now = Date.now();
          const current = ensureProduct();
          if (message.action === "upsert-profile") {
            const incoming = message.profile || {};
            const record = sanitizeProductProfile({
              id: incoming.id || mockProductId("profile"), name: incoming.name,
              color: incoming.color || "#c73f88", createdAt: now, updatedAt: now,
            });
            current.profiles = [record, ...current.profiles.filter((item) => item.id !== record.id)];
          } else if (message.action === "set-profile") current.activeProfileId = message.profileId;
          else if (message.action === "upsert-plan") {
            const incoming = message.plan || {};
            const record = sanitizeProductPlan({ ...incoming, id: incoming.id || mockProductId("plan"), createdAt: now, updatedAt: now });
            current.plans = [record, ...current.plans.filter((item) => item.id !== record.id)];
          } else if (message.action === "delete-plan") current.plans = current.plans.filter((item) => item.id !== message.planId);
          else if (message.action === "save-space") {
            const incoming = message.space || {};
            const existing = current.spaces.find((item) => item.id === incoming.id);
            const record = sanitizeProductSpace({
              id: incoming.id || mockProductId("space"), profileId: incoming.profileId || current.activeProfileId,
              name: incoming.name, tabs, createdAt: existing?.createdAt || now, updatedAt: now,
            });
            current.spaces = [record, ...current.spaces.filter((item) => item.id !== record.id)];
          } else if (message.action === "delete-space") current.spaces = current.spaces.filter((item) => item.id !== message.spaceId);
          else if (message.action === "save-capsule") {
            const active = tabs.find((tab) => tab.active) || tabs[0];
            const record = sanitizeProductCapsule({
              id: mockProductId("capsule"), profileId: current.activeProfileId, url: active.url, title: active.title,
              note: message.note, status: "saved", savedAt: now, updatedAt: now,
            });
            current.capsules.unshift(record);
          } else if (message.action === "update-capsule") {
            current.capsules = current.capsules.map((item) => item.id === message.capsuleId ? { ...item, status: message.status, updatedAt: now } : item);
          } else if (message.action === "delete-capsule") current.capsules = current.capsules.filter((item) => item.id !== message.capsuleId);
          else if (message.action === "checkpoint") {
            current.checkpoints.unshift(sanitizeProductCheckpoint({ id: mockProductId("checkpoint"), label: message.label, tabs, createdAt: now, reason: "manual" }));
          } else if (message.action === "delete-checkpoint") current.checkpoints = current.checkpoints.filter((item) => item.id !== message.checkpointId);
          else if (message.action === "close-duplicates") {
            for (const group of productDuplicateGroups(tabs)) for (const extra of group.slice(1)) tabs.splice(tabs.findIndex((tab) => tab.id === extra.id), 1);
            return { ok: true, ...publicProduct(), closed: 1 };
          } else if (message.action === "contract-preview" || message.action === "start-plan") {
            const plan = current.plans.find((item) => item.id === message.planId);
            const unrelated = tabs.filter((tab) => !productTabIsPlanned(tab, plan)).map((tab) => ({ id: tab.id, title: tab.title, domain: new URL(tab.url).hostname, url: tab.url }));
            const contract = { planId: plan.id, planName: plan.name, intention: plan.intention, unrelated, open: plan.relevantUrls.map((url) => ({ url, domain: new URL(url).hostname })) };
            if (message.action === "contract-preview") return { ok: true, ...publicProduct(), contract };
            focus = {
              version: 1, id: "ui_focus_plan_001", intention: plan.intention, successDefinition: plan.successDefinition,
              mode: plan.mode, targetMinutes: plan.targetMinutes, targetMs: plan.mode === "timer" ? plan.targetMinutes * 60000 : null,
              startedAt: now, status: "running", elapsedMs: 0, snapshotAt: now,
            };
            return { ok: true, ...publicProduct(), focus, focusSessions: store.focusSessions, contract };
          }
          product = sanitizeProductData(current);
          return { ok: true, ...publicProduct(), restore: { opened: 1, skipped: 0, failed: 0 }, closed: 0 };
        }
        if (message.type === "START_FOCUS") {
          const now = Date.now();
          focus = {
            version: 1,
            id: "ui_focus_session_001",
            intention: String(message.intention || "UI test focus"),
            successDefinition: String(message.successDefinition || ""),
            mode: message.mode,
            targetMinutes: message.mode === "timer" ? Number(message.targetMinutes) : null,
            targetMs: message.mode === "timer" ? Number(message.targetMinutes) * 60000 : null,
            startedAt: now,
            status: "running",
            visitedDomains: ["docs.example.com", "example.com"],
            elapsedMs: 0,
            remainingMs: message.mode === "timer" ? Number(message.targetMinutes) * 60000 : null,
            snapshotAt: now,
          };
        }
        if (message.type === "PAUSE_FOCUS" && focus) {
          focus.elapsedMs += Math.max(0, Date.now() - focus.snapshotAt);
          focus.status = "paused";
          focus.snapshotAt = Date.now();
        }
        if (message.type === "RESUME_FOCUS" && focus) {
          focus.status = "running";
          focus.snapshotAt = Date.now();
        }
        if (message.type === "EXTEND_FOCUS" && focus?.mode === "timer") {
          focus.targetMinutes += Number(message.minutes);
          focus.targetMs += Number(message.minutes) * 60000;
          focus.status = "running";
          focus.snapshotAt = Date.now();
        }
        if (["COMPLETE_FOCUS", "ABANDON_FOCUS"].includes(message.type) && focus) {
          const now = Date.now();
          const elapsedMs = focus.elapsedMs + (focus.status === "running" ? now - focus.snapshotAt : 0);
          store.focusSessions.push({
            version: 1,
            id: focus.id,
            day: new Date(focus.startedAt).toISOString().slice(0, 10),
            intention: focus.intention,
            successDefinition: focus.successDefinition,
            mode: focus.mode,
            targetMinutes: focus.targetMinutes,
            startedAt: focus.startedAt,
            endedAt: now,
            focusedMs: elapsedMs,
            outcome: message.type === "COMPLETE_FOCUS" ? "completed" : "abandoned",
            abandonedReason: message.type === "ABANDON_FOCUS" ? String(message.reason || "") : "",
            note: String(message.note || ""),
            visitedDomains: Array.isArray(focus.visitedDomains) ? focus.visitedDomains : [],
          });
          focus = null;
        }
        return { ok: true, focus, focusSessions: store.focusSessions, focusHistoryAvailable: true, importedKeys: [], warnings: [] };
      },
    },
    storage: {
      local: {
        get: async (keys) => pick(keys),
        set: async (patch) => {
          for (const [key, value] of Object.entries(patch)) {
            const oldValue = store[key];
            store[key] = value;
            for (const listener of listeners) listener({ [key]: { oldValue, newValue: value } }, "local");
          }
        },
        clear: async () => { for (const key of Object.keys(store)) delete store[key]; },
      },
      onChanged: { addListener: (listener) => listeners.push(listener) },
    },
    tabs: {
      create: async ({ url } = {}) => { if (url) tabs.push({ id: 20 + tabs.length, windowId: 1, index: tabs.length, active: false, pinned: false, incognito: false, title: url, url }); },
      query: async () => tabs,
    },
    windows: { getCurrent: async () => ({ id: 1 }), getLastFocused: async () => ({ id: 1 }) },
    sidePanel: { open: async () => {} },
  };
})();
