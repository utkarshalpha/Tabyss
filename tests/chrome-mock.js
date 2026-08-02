/* Local UI-test adapter. Loaded only by tests/ui-server.js; never packaged. */
(() => {
  const today = new Date().toISOString().slice(0, 10);
  const store = {
    usage: { [today]: { "docs.example.com": 1200, "youtube.com": 300 } },
    settings: {},
  };
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
      sendMessage: async (message) => {
        if (message.type === "CLEAR_ALL_DATA") {
          for (const key of Object.keys(store)) delete store[key];
        }
        return { ok: true, importedKeys: [], warnings: [] };
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
    tabs: { create: async () => {} },
  };
})();
