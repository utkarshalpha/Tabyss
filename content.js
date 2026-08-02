/* Tabyss — content script (v2.0)
 *
 * Three jobs, all fully on-device:
 *  1. MEDIA DETECTION — classify what's actually happening on the page:
 *     "shorts" (Reels / YT Shorts / TikTok), "video" (real long-form playback),
 *     or "scroll" (sustained feed-scrolling on known feed surfaces). Strict by
 *     design: normal webpage scrolling never counts — classification requires a
 *     known surface AND live evidence (a playing video or a sustained gesture
 *     cadence).
 *  2. BREAK OVERLAY — on command from the worker, blur the page with a
 *     full-screen break card (20-20-20 eye break, water, stand) with
 *     snooze / skip / done actions.
 *  3. MINDFUL GUARD — during a user-started protected Plan, show an accessible
 *     Return / Save for later / Continue choice without reading page content.
 *
 * Nothing here touches page content beyond reading <video> state, counting scroll
 * gestures, and checking the current path locally for sensitive-flow suppression;
 * nothing is sent anywhere except to the extension's own service worker.
 */
(() => {
  "use strict";
  if (window.__tabyssContent) return;
  window.__tabyssContent = true;

  const BEAT_S = 15; // heartbeat granularity

  /* ---------- surface patterns ---------- */
  // Short-form surfaces: being here (with something playing/moving) = shorts.
  const SHORT_SURFACES = [
    { host: /(^|\.)youtube\.com$/, path: /^\/shorts(\/|$)/ },
    { host: /(^|\.)instagram\.com$/, path: /^\/(reels?|stories)(\/|$)/ },
    { host: /(^|\.)tiktok\.com$/, path: /^\// },
    { host: /(^|\.)facebook\.com$/, path: /^\/(reel|reels|watch)(\/|$)/ },
  ];
  // Feed surfaces: scrolling HERE with sustained cadence = doomscroll. A thread,
  // an article, a profile page — none of these match, so reading never counts.
  const FEED_SURFACES = [
    { host: /(^|\.)(x|twitter)\.com$/, path: /^\/(home\/?)?$/ },
    { host: /(^|\.)instagram\.com$/, path: /^\/$/ },
    { host: /(^|\.)facebook\.com$/, path: /^\/$/ },
    { host: /(^|\.)linkedin\.com$/, path: /^\/feed(\/|$)/ },
    { host: /(^|\.)reddit\.com$/, path: /^\/(r\/(popular|all)\/?)?$/ },
  ];

  const SCROLL_RATE_MIN = 8; // gestures per rolling minute — strict threshold

  /* ---------- gesture tracking (rolling 60s window) ----------
   * Raw wheel/touchmove events arrive ~16ms apart through a momentum curve, so
   * one flick would look like dozens of "gestures". Coalesce: a new gesture is
   * only counted after a ≥400ms quiet gap — 8/min then means 8 real flicks. */
  let gestures = [];
  let lastEvtTs = 0;
  const onGesture = () => {
    const now = Date.now();
    const gap = now - lastEvtTs;
    lastEvtTs = now;
    if (gap < 400) return; // same burst / momentum tail — not a new gesture
    gestures.push(now);
    if (gestures.length > 300) gestures.splice(0, 150);
  };
  window.addEventListener("wheel", onGesture, { passive: true });
  window.addEventListener("touchmove", onGesture, { passive: true });
  window.addEventListener("keydown", (e) => {
    // Never count typing: space/j in a composer or search box is not scrolling.
    const t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    if (["ArrowDown", "PageDown", " ", "j"].includes(e.key)) onGesture();
  });
  function gestureRate() {
    const now = Date.now();
    gestures = gestures.filter((t) => now - t < 60000);
    return gestures.length;
  }

  /* ---------- playback detection ---------- */
  function playingVideo() {
    for (const v of document.querySelectorAll("video")) {
      if (v.paused || v.ended || v.readyState < 2) continue;
      const r = v.getBoundingClientRect();
      if (r.width < 180 || r.height < 100) continue; // thumbnails / mini-players
      if (r.bottom < 0 || r.top > window.innerHeight) continue; // offscreen
      return v;
    }
    return null;
  }

  function matchSurface(list) {
    const host = location.hostname.replace(/^www\./, "");
    return list.some((s) => s.host.test(host) && s.path.test(location.pathname));
  }

  /* Strict classification. Order matters: shorts > video > scroll. */
  function classify() {
    if (document.visibilityState !== "visible" || !document.hasFocus()) return null;
    if (matchSurface(SHORT_SURFACES)) {
      // On a shorts surface, still require live evidence — a playing clip or
      // active flicking — so an abandoned tab doesn't count.
      if (playingVideo() || gestureRate() >= 3) return "shorts";
      return null;
    }
    const v = playingVideo();
    // Long-form video: real playback of something substantial (>90s duration)
    // or fullscreen. Autoplaying muted teaser loops don't qualify.
    if (v && !v.muted && (v.duration > 90 || !!document.fullscreenElement)) return "video";
    if (v && document.fullscreenElement) return "video";
    if (matchSurface(FEED_SURFACES) && gestureRate() >= SCROLL_RATE_MIN) return "scroll";
    return null;
  }

  setInterval(() => {
    const kind = classify();
    if (!kind) return;
    try {
      chrome.runtime.sendMessage({ type: "MEDIA_BEAT", kind, secs: BEAT_S });
    } catch (_) {
      /* extension reloaded — this script instance is orphaned; go quiet */
    }
  }, BEAT_S * 1000);

  /* ==================================================================
   * Break overlay
   * ================================================================== */
  let overlayEl = null;
  let countdownTimer = null;
  let pillEl = null;
  let pillTimer = null;

  // Fullscreen video lives in the browser top layer, above any z-index in the
  // normal document — the overlay must join (and follow) that subtree.
  document.addEventListener("fullscreenchange", () => {
    if (overlayEl) (document.fullscreenElement || document.body || document.documentElement).append(overlayEl);
    if (pillEl) (document.fullscreenElement || document.body || document.documentElement).append(pillEl);
  });

  function removePill() {
    if (pillTimer) { clearInterval(pillTimer); pillTimer = null; }
    if (pillEl) { pillEl.remove(); pillEl = null; }
  }

  /* Gentle heads-up before the blur: an animated pill slides in bottom-right
   * with a live countdown, so the break never slams in unannounced. */
  function showPreBreak(seconds) {
    removePill();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const pill = document.createElement("div");
    pill.style.cssText =
      "position:fixed;right:20px;bottom:20px;z-index:2147483646;display:flex;align-items:center;gap:10px;" +
      "padding:10px 16px;border-radius:100px;background:rgba(18,20,30,0.92);color:#fff;" +
      "font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;font-size:13px;" +
      "border:1px solid rgba(255,255,255,0.16);box-shadow:0 10px 34px rgba(0,0,0,0.4);" +
      "backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);" +
      (reduce ? "" : "transition:transform .5s cubic-bezier(.2,.9,.3,1.2),opacity .5s;transform:translateY(70px);opacity:0;");
    const eye = document.createElement("span");
    eye.textContent = "👁";
    eye.style.cssText = "font-size:15px;" + (reduce ? "" : "animation:ttPulse 1.6s ease-in-out infinite;");
    const txt = document.createElement("span");
    const cd = document.createElement("b");
    cd.style.cssText = "font-variant-numeric:tabular-nums;margin-left:2px;";
    txt.textContent = "Eye break coming up — page blurs in ";
    txt.append(cd);
    const dismiss = document.createElement("button");
    dismiss.textContent = "✕";
    dismiss.title = "Dismiss";
    dismiss.style.cssText =
      "font:inherit;background:none;border:none;color:rgba(255,255,255,0.6);cursor:pointer;padding:0 2px;";
    dismiss.addEventListener("click", (e) => { e.stopPropagation(); removePill(); });
    if (!document.getElementById("__ttPulseKF")) {
      const st = document.createElement("style");
      st.id = "__ttPulseKF";
      st.textContent = "@keyframes ttPulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.25);opacity:.7}}";
      document.documentElement.append(st);
    }
    pill.append(eye, txt, dismiss);
    (document.fullscreenElement || document.body || document.documentElement).append(pill);
    pillEl = pill;
    if (!reduce) requestAnimationFrame(() => requestAnimationFrame(() => {
      pill.style.transform = "translateY(0)";
      pill.style.opacity = "1";
    }));
    let left = Math.max(5, Math.round(seconds));
    cd.textContent = fmtCd(left);
    pillTimer = setInterval(() => {
      left--;
      if (left <= 0) {
        // The worker's flush is minute-granular, so the blur may lag the
        // countdown — pin the pill instead of lying with 0s, and let
        // showOverlay()'s removePill() clear it when the break arrives.
        clearInterval(pillTimer);
        pillTimer = null;
        txt.textContent = "Eye break any second now…";
        // failsafe: if the break never comes (user looked away — clock reset),
        // don't leave an orphaned pill on the page
        setTimeout(() => { if (pillEl === pill) removePill(); }, 90000);
        return;
      }
      cd.textContent = fmtCd(left);
    }, 1000);
  }
  function fmtCd(s) {
    const m = Math.floor(s / 60);
    return m ? `${m}:${String(s % 60).padStart(2, "0")}` : `${s}s`;
  }

  function removeOverlay() {
    if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; }
    if (overlayEl) { overlayEl.remove(); overlayEl = null; }
  }

  function send(msg) {
    try { chrome.runtime.sendMessage(msg); } catch (_) {}
  }

  function showOverlay(cfg) {
    removeOverlay();
    removePill(); // the heads-up pill hands over to the full overlay
    const host = document.createElement("div");
    host.style.cssText =
      "position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;" +
      "background:rgba(8,10,16,0.55);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);" +
      "font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#fff;";
    const card = document.createElement("div");
    card.style.cssText =
      "max-width:420px;width:calc(100% - 3rem);text-align:center;padding:2rem 1.8rem;" +
      "background:rgba(20,24,34,0.92);border:1px solid rgba(255,255,255,0.14);" +
      "border-radius:20px;box-shadow:0 30px 90px rgba(0,0,0,0.5);";

    const emoji = document.createElement("div");
    emoji.style.cssText = "font-size:3rem;line-height:1;margin-bottom:0.6rem;";
    emoji.textContent = cfg.emoji;
    const title = document.createElement("div");
    title.style.cssText = "font-size:1.35rem;font-weight:700;margin-bottom:0.4rem;";
    title.textContent = cfg.title;
    const body = document.createElement("div");
    body.style.cssText = "font-size:0.95rem;opacity:0.85;line-height:1.5;margin-bottom:1.1rem;";
    body.textContent = cfg.body;
    card.append(emoji, title, body);

    let count = null;
    if (cfg.seconds) {
      count = document.createElement("div");
      count.style.cssText =
        "font-size:2.4rem;font-weight:800;font-variant-numeric:tabular-nums;margin-bottom:1.1rem;";
      count.textContent = String(cfg.seconds);
      card.append(count);
    }

    const row = document.createElement("div");
    row.style.cssText = "display:flex;gap:0.6rem;justify-content:center;flex-wrap:wrap;";
    const mkBtn = (label, primary, onClick) => {
      const b = document.createElement("button");
      b.textContent = label;
      b.style.cssText =
        "font:inherit;font-weight:600;cursor:pointer;padding:0.6rem 1.1rem;border-radius:100px;" +
        (primary
          ? "background:#fff;color:#101423;border:none;"
          : "background:transparent;color:#fff;border:1px solid rgba(255,255,255,0.4);");
      b.addEventListener("click", (e) => { e.stopPropagation(); onClick(); });
      return b;
    };

    if (cfg.kind === "eye") {
      row.append(
        mkBtn(`Snooze ${cfg.snoozeMin}m`, false, () => {
          send({ type: "BREAK_SNOOZE", kind: "eye", mins: cfg.snoozeMin });
          removeOverlay();
        }),
        mkBtn("Skip", false, () => {
          send({ type: "BREAK_SKIP", kind: "eye" });
          removeOverlay();
        })
      );
    } else {
      row.append(
        mkBtn("Done ✓", true, () => {
          send({ type: "WELL_DONE", kind: cfg.kind });
          removeOverlay();
        }),
        mkBtn("Snooze 10m", false, () => {
          send({ type: "WELL_SNOOZE", kind: cfg.kind, mins: 10 });
          removeOverlay();
        })
      );
    }
    card.append(row);
    host.append(card);
    (document.fullscreenElement || document.body || document.documentElement).append(host);
    overlayEl = host;

    if (cfg.seconds) {
      let left = cfg.seconds;
      countdownTimer = setInterval(() => {
        left--;
        if (count) count.textContent = String(Math.max(0, left));
        if (left <= 0) {
          send({ type: "BREAK_DONE", kind: "eye" });
          removeOverlay();
        }
      }, 1000);
    }
  }

  function guardShouldStayQuiet() {
    if (document.fullscreenElement) return true;
    const path = location.pathname.toLowerCase();
    return /(?:^|\/)(?:auth|checkout|login|payment|signin)(?:\/|$)/.test(path);
  }

  function showGuard(cfg) {
    if (guardShouldStayQuiet()) return false;
    removeOverlay();
    removePill();

    const host = document.createElement("div");
    host.style.cssText =
      "position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;padding:24px;" +
      "background:rgba(20,14,28,.54);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);" +
      "font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#251b2e;";

    const card = document.createElement("section");
    card.setAttribute("role", "dialog");
    card.setAttribute("aria-modal", "true");
    card.setAttribute("aria-labelledby", "__tabyssGuardTitle");
    card.setAttribute("aria-describedby", "__tabyssGuardBody");
    card.style.cssText =
      "width:min(440px,100%);padding:26px;border-radius:24px;background:#fcfbfe;" +
      "border:1px solid rgba(37,27,46,.14);box-shadow:0 30px 90px rgba(0,0,0,.32);";

    const brand = document.createElement("div");
    brand.textContent = "TABYSS · FOCUS CONTRACT";
    brand.style.cssText = "color:#5b3fd6;font-size:11px;font-weight:800;letter-spacing:.1em;margin-bottom:12px;";
    const title = document.createElement("h2");
    title.id = "__tabyssGuardTitle";
    title.textContent = "Still choosing this tab?";
    title.style.cssText = "font-size:24px;line-height:1.18;letter-spacing:-.02em;margin:0 0 9px;";
    const body = document.createElement("p");
    body.id = "__tabyssGuardBody";
    body.textContent = cfg?.intention
      ? `Your plan is “${String(cfg.intention).slice(0, 160)}”. This tab is outside that plan.`
      : "This tab is outside the plan you chose for this focus session.";
    body.style.cssText = "font-size:15px;line-height:1.55;color:#62576d;margin:0 0 8px;";
    const privacy = document.createElement("p");
    privacy.textContent = "Tabyss checks the address locally. Page content never leaves this device.";
    privacy.style.cssText = "font-size:12px;line-height:1.45;color:#786c84;margin:0 0 20px;";

    const row = document.createElement("div");
    row.style.cssText = "display:flex;gap:9px;flex-wrap:wrap;";
    const button = (label, primary, decision) => {
      const element = document.createElement("button");
      element.type = "button";
      element.textContent = label;
      element.style.cssText =
        "min-height:44px;padding:10px 15px;border-radius:12px;font:inherit;font-size:14px;font-weight:700;cursor:pointer;" +
        (primary
          ? "border:1px solid #5b3fd6;background:#5b3fd6;color:#fff;"
          : "border:1px solid rgba(37,27,46,.16);background:#fff;color:#251b2e;");
      element.addEventListener("click", () => {
        send({ type: "GUARD_DECISION", decision, minutes: decision === "continue" ? 10 : undefined });
        removeOverlay();
      });
      return element;
    };
    const returnButton = button("Return to plan", true, "return");
    row.append(
      returnButton,
      button("Save for later & return", false, "save"),
      button("Continue 10 min", false, "continue")
    );
    card.append(brand, title, body, privacy, row);
    const shadow = host.attachShadow({ mode: "closed" });
    shadow.append(card);
    (document.body || document.documentElement).append(host);
    overlayEl = host;
    returnButton.focus({ preventScroll: true });

    host.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        send({ type: "GUARD_DECISION", decision: "continue", minutes: 5 });
        removeOverlay();
        return;
      }
      if (event.key === "Tab") {
        const controls = [...row.querySelectorAll("button")];
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && shadow.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && shadow.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    });
    return true;
  }

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg?.type === "SHOW_BREAK") {
      showOverlay(msg.cfg);
      sendResponse({ ok: true });
    } else if (msg?.type === "SHOW_PREBREAK") {
      showPreBreak(msg.seconds);
      sendResponse({ ok: true });
    } else if (msg?.type === "SHOW_GUARD") {
      sendResponse({ ok: true, shown: showGuard(msg.cfg) });
    } else if (msg?.type === "PING") {
      sendResponse({ ok: true });
    }
  });
})();
