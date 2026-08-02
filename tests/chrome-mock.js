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
    }],
  };
  let focus = null;
  const listeners = [];
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
    tabs: { create: async () => {}, query: async () => [] },
  };
})();
