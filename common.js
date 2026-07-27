/* Shared helpers + the categorization engine (used by popup, dashboard, options) */

/* ---------- time / date ---------- */
function fmt(seconds) {
  const s = Math.round(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m`;
  return `${sec}s`;
}
function fmtShort(seconds) {
  const s = Math.round(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.round((s % 3600) / 60);
  if (h) return `${h}h ${m}m`;
  return `${m}m`;
}
function dateKey(ts) {
  const d = new Date(ts);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function shiftDay(key, deltaDays) {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + deltaDays);
  return dateKey(dt.getTime());
}
function prettyDate(key) {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}
function weekdayShort(key) {
  return prettyDate(key).split(" ")[0];
}

/* ---------- storage schema / retention ---------- */
const SCHEMA_VERSION = 1;

// Delete date-keyed entries older than the retention window. Keys are
// YYYY-MM-DD, which sort chronologically as strings. Mutates `map`; returns count.
function pruneByRetention(map, retentionDays) {
  if (!map) return 0;
  const cutoff = shiftDay(dateKey(Date.now()), -Math.max(1, retentionDays || 180));
  let n = 0;
  for (const key of Object.keys(map)) {
    if (key < cutoff) { delete map[key]; n++; }
  }
  return n;
}

/* ---------- categories ---------- */
const CATEGORIES = ["Productive", "Education", "Career", "Social", "Entertainment", "News", "Shopping", "Other"];

// Validated categorical hues (data-viz palette), { light, dark } per category.
const CAT_COLOR = {
  Productive: { l: "#1baf7a", d: "#199e70" },
  Education: { l: "#0891b2", d: "#22d3ee" },
  Career: { l: "#c026d3", d: "#e879f9" },
  Social: { l: "#2a78d6", d: "#3987e5" },
  Entertainment: { l: "#4a3aa7", d: "#9085e9" },
  News: { l: "#eda100", d: "#c98500" },
  Shopping: { l: "#eb6834", d: "#d95926" },
  Other: { l: "#898781", d: "#898781" },
};
function catColor(cat) {
  const dark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  return (CAT_COLOR[cat] || CAT_COLOR.Other)[dark ? "d" : "l"];
}

// domain rule -> category. First match wins; order matters (aws before amazon).
const DEFAULT_RULES = [
  // Productive — work, dev, cloud & AI tools
  ["docs.google", "Productive"], ["drive.google", "Productive"], ["mail.google", "Productive"],
  ["calendar.google", "Productive"], ["meet.google", "Productive"], ["keep.google", "Productive"],
  ["github.", "Productive"], ["gitlab.", "Productive"], ["stackoverflow", "Productive"],
  ["notion.so", "Productive"], ["figma.com", "Productive"], ["slack.com", "Productive"],
  ["atlassian", "Productive"], ["jira", "Productive"], ["linear.app", "Productive"],
  ["overleaf", "Productive"], ["office.com", "Productive"], ["outlook", "Productive"],
  ["cloud.microsoft", "Productive"], ["microsoft365", "Productive"], ["sharepoint", "Productive"],
  ["teams.microsoft", "Productive"], ["live.com", "Productive"], ["zoom.us", "Productive"],
  ["dropbox", "Productive"], ["trello", "Productive"], ["asana", "Productive"],
  ["clickup", "Productive"], ["monday.com", "Productive"], ["airtable", "Productive"],
  ["canva.com", "Productive"], ["miro.com", "Productive"], ["vercel", "Productive"],
  ["netlify", "Productive"], ["aws.amazon", "Productive"], ["azure", "Productive"],
  ["chatgpt", "Productive"], ["openai", "Productive"], ["claude.ai", "Productive"],
  ["gemini.google", "Productive"], ["perplexity", "Productive"], ["cursor", "Productive"],
  ["replit", "Productive"], ["codepen", "Productive"], ["kaggle", "Productive"],
  ["huggingface", "Productive"], ["colab.research", "Productive"], ["leetcode", "Productive"],
  ["hackerrank", "Productive"], ["codeforces", "Productive"],
  // Education — learning platforms
  ["coursera", "Education"], ["udemy", "Education"], ["khanacademy", "Education"],
  ["edx.org", "Education"], ["byjus", "Education"], ["unacademy", "Education"],
  ["vedantu", "Education"], ["nptel", "Education"], ["swayam", "Education"],
  ["geeksforgeeks", "Education"], ["w3schools", "Education"], ["freecodecamp", "Education"],
  ["duolingo", "Education"], ["brilliant.org", "Education"], ["skillshare", "Education"],
  ["pw.live", "Education"],
  // Career — job hunting & recruiting
  ["naukri", "Career"], ["foundit.in", "Career"], ["indeed", "Career"],
  ["glassdoor", "Career"], ["monsterindia", "Career"], ["internshala", "Career"],
  ["shine.com", "Career"], ["timesjobs", "Career"], ["instahyre", "Career"],
  ["cutshort", "Career"], ["wellfound", "Career"], ["hirist", "Career"],
  ["unstop", "Career"],
  // Social
  ["facebook.", "Social"], ["instagram.", "Social"], ["twitter.", "Social"], ["x.com", "Social"],
  ["linkedin.", "Social"], ["reddit.", "Social"], ["tiktok.", "Social"], ["snapchat", "Social"],
  ["whatsapp", "Social"], ["telegram", "Social"], ["discord", "Social"], ["pinterest", "Social"],
  ["quora", "Social"], ["threads.net", "Social"], ["bsky.app", "Social"],
  // Entertainment
  ["youtube.", "Entertainment"], ["netflix.", "Entertainment"], ["spotify.", "Entertainment"],
  ["twitch.", "Entertainment"], ["primevideo", "Entertainment"], ["hotstar", "Entertainment"],
  ["disney", "Entertainment"], ["soundcloud", "Entertainment"], ["hulu", "Entertainment"],
  ["jiocinema", "Entertainment"], ["zee5", "Entertainment"], ["sonyliv", "Entertainment"],
  ["mxplayer", "Entertainment"], ["crunchyroll", "Entertainment"], ["gaana", "Entertainment"],
  ["wynk", "Entertainment"], ["jiosaavn", "Entertainment"], ["music.apple", "Entertainment"],
  // News
  ["nytimes", "News"], ["bbc.", "News"], ["cnn.", "News"], ["theverge", "News"],
  ["medium.com", "News"], ["news.google", "News"], ["ndtv", "News"], ["timesofindia", "News"],
  ["hindustantimes", "News"], ["techcrunch", "News"], ["theguardian", "News"],
  ["reuters", "News"], ["bloomberg", "News"], ["economictimes", "News"],
  ["livemint", "News"], ["moneycontrol", "News"], ["indianexpress", "News"],
  ["thehindu", "News"], ["wired.com", "News"], ["news.ycombinator", "News"],
  // Shopping & delivery
  ["amazon.", "Shopping"], ["flipkart", "Shopping"], ["ebay.", "Shopping"], ["myntra", "Shopping"],
  ["aliexpress", "Shopping"], ["etsy.", "Shopping"], ["walmart", "Shopping"], ["ajio", "Shopping"],
  ["meesho", "Shopping"], ["nykaa", "Shopping"], ["bigbasket", "Shopping"],
  ["blinkit", "Shopping"], ["zepto", "Shopping"], ["swiggy", "Shopping"],
  ["zomato", "Shopping"], ["snapdeal", "Shopping"], ["croma", "Shopping"],
];

/* Keyword heuristics — the fallback when no rule matches, so unknown sites
 * self-classify instead of drowning "Other". Checked against the hostname
 * only; first hit wins. */
const KEYWORD_RULES = [
  [/(^|[.-])(forms|docs|mail|webmail|drive|calendar|meet|admin|console|dash|cloud|git|api|dev)([.-]|$)/, "Productive"],
  [/(university|college|academy|school|campus|course|learn|edu(\.|$))/, "Education"],
  [/(job|career|hire|recruit|intern|placement)/, "Career"],
  // 'express' deliberately absent: americanexpress/expressvpn are not news;
  // Express-branded outlets are covered by explicit DEFAULT_RULES.
  [/(news|times|herald|tribune|gazette|journal)/, "News"],
  // label-anchored: photoshop/smartsheet/carta must not become Shopping
  [/(^|[.-])(shop|store|cart|mart|bazaar|deal|buy)([.-]|$)/, "Shopping"],
  // 'stream'/'watch' label-anchored (streamlit/watchguard/swatch stay out)
  [/(tube|music|movie|cinema|anime|game)|(^|[.-])(stream|watch)([.-]|$)/, "Entertainment"],
];

/* Domain-boundary-aware rule matching. Naive substring matching is wrong:
 * 'netflix.com'.includes('x.com') is true, which would file Netflix under
 * Social. Rules ending in '.' are prefixes ("github." → github.com and
 * gist.github.com); others must match on a label boundary. */
function domainMatchesRule(domain, needle) {
  if (needle.endsWith(".")) return domain.startsWith(needle) || domain.includes("." + needle);
  return (
    domain === needle ||
    domain.startsWith(needle + ".") ||
    domain.endsWith("." + needle) ||
    domain.includes("." + needle + ".")
  );
}

/* Bundled offline catalog — exact base-domain → category, compiled from public
 * domain-popularity data. Checked before rules; zero network, updates ship with
 * the extension. */
const CATALOG = {
  // Productive / tools
  "google.com": "Productive", "gmail.com": "Productive", "bing.com": "Productive",
  "duckduckgo.com": "Productive", "wikipedia.org": "Education", "translate.google.com": "Productive",
  "docs.qq.com": "Productive", "yandex.com": "Productive", "proton.me": "Productive",
  "icloud.com": "Productive", "apple.com": "Productive", "microsoft.com": "Productive",
  // exact entries that must beat base-domain stripping (google/apple are Productive)
  "news.google.com": "News", "music.apple.com": "Entertainment", "tv.apple.com": "Entertainment",
  "podcasts.google.com": "Entertainment", "music.youtube.com": "Entertainment",
  "adobe.com": "Productive", "photoshop.com": "Productive", "smartsheet.com": "Productive",
  "salesforce.com": "Productive", "hubspot.com": "Productive", "zoho.com": "Productive",
  "wordpress.com": "Productive", "wix.com": "Productive", "squarespace.com": "Productive",
  "shopify.com": "Productive", "stripe.com": "Productive", "paypal.com": "Productive",
  "godaddy.com": "Productive", "namecheap.com": "Productive", "cloudflare.com": "Productive",
  "digitalocean.com": "Productive", "heroku.com": "Productive", "render.com": "Productive",
  "firebase.google.com": "Productive", "supabase.com": "Productive", "mongodb.com": "Productive",
  "postman.com": "Productive", "swagger.io": "Productive", "npmjs.com": "Productive",
  "pypi.org": "Productive", "jsfiddle.net": "Productive", "jsbin.com": "Productive",
  "codesandbox.io": "Productive", "glitch.com": "Productive", "streamlit.io": "Productive",
  "tableau.com": "Productive", "powerbi.microsoft.com": "Productive", "grammarly.com": "Productive",
  "deepl.com": "Productive", "calendly.com": "Productive", "loom.com": "Productive",
  "otter.ai": "Productive", "midjourney.com": "Productive", "carta.com": "Productive",
  "docusign.com": "Productive", "hellosign.com": "Productive", "typeform.com": "Productive",
  "surveymonkey.com": "Productive", "mailchimp.com": "Productive", "sendgrid.com": "Productive",
  "twilio.com": "Productive", "workspace.google.com": "Productive", "chase.com": "Productive",
  "americanexpress.com": "Productive", "hdfcbank.com": "Productive", "icicibank.com": "Productive",
  "sbi.co.in": "Productive", "axisbank.com": "Productive", "kotak.com": "Productive",
  "paytm.com": "Productive", "phonepe.com": "Productive", "zerodha.com": "Productive",
  "groww.in": "Productive", "upstox.com": "Productive", "cred.club": "Productive",
  "irctc.co.in": "Productive", "makemytrip.com": "Productive", "goibibo.com": "Productive",
  "cleartrip.com": "Productive", "ixigo.com": "Productive", "booking.com": "Productive",
  "airbnb.com": "Productive", "uber.com": "Productive", "olacabs.com": "Productive",
  "rapido.bike": "Productive", "maps.google.com": "Productive", "expressvpn.com": "Productive",
  "nordvpn.com": "Productive", "1password.com": "Productive", "lastpass.com": "Productive",
  "bitwarden.com": "Productive", "convrse.ai": "Productive",
  // Education
  "khanacademy.org": "Education", "mit.edu": "Education", "stanford.edu": "Education",
  "harvard.edu": "Education", "ocw.mit.edu": "Education", "archive.org": "Education",
  "scholar.google.com": "Education", "researchgate.net": "Education", "arxiv.org": "Education",
  "jstor.org": "Education", "britannica.com": "Education", "sparknotes.com": "Education",
  "chegg.com": "Education", "quizlet.com": "Education", "toppr.com": "Education",
  "doubtnut.com": "Education", "embibe.com": "Education", "testbook.com": "Education",
  "gradeup.co": "Education", "adda247.com": "Education", "codecademy.com": "Education",
  "pluralsight.com": "Education", "datacamp.com": "Education", "educative.io": "Education",
  "scrimba.com": "Education", "sololearn.com": "Education", "tutorialspoint.com": "Education",
  "javatpoint.com": "Education", "programiz.com": "Education", "realpython.com": "Education",
  // Career
  "linkedin.com": "Career", "angel.co": "Career", "levels.fyi": "Career",
  "ambitionbox.com": "Career", "hired.com": "Career", "triplebyte.com": "Career",
  "resume.io": "Career", "canva.com": "Productive", "novoresume.com": "Career",
  "ziprecruiter.com": "Career", "simplyhired.com": "Career", "dice.com": "Career",
  "remoteok.com": "Career", "weworkremotely.com": "Career", "flexjobs.com": "Career",
  // Social
  "messenger.com": "Social", "web.whatsapp.com": "Social", "signal.org": "Social",
  "slack-edge.com": "Social", "tumblr.com": "Social", "vk.com": "Social",
  "weibo.com": "Social", "line.me": "Social", "wechat.com": "Social",
  "clubhouse.com": "Social", "nextdoor.com": "Social", "meetup.com": "Social",
  "bumble.com": "Social", "tinder.com": "Social", "hinge.co": "Social",
  "sharechat.com": "Social", "moj.app": "Social", "josh.in": "Social",
  // Entertainment
  "imdb.com": "Entertainment", "rottentomatoes.com": "Entertainment", "letterboxd.com": "Entertainment",
  "goodreads.com": "Entertainment", "wattpad.com": "Entertainment", "webtoons.com": "Entertainment",
  "mangadex.org": "Entertainment", "aniwatch.to": "Entertainment", "9anime.to": "Entertainment",
  "steam.com": "Entertainment", "steampowered.com": "Entertainment", "epicgames.com": "Entertainment",
  "roblox.com": "Entertainment", "minecraft.net": "Entertainment", "chess.com": "Entertainment",
  "lichess.org": "Entertainment", "kick.com": "Entertainment", "vimeo.com": "Entertainment",
  "dailymotion.com": "Entertainment", "pandora.com": "Entertainment", "deezer.com": "Entertainment",
  "audible.com": "Entertainment", "podcasts.google.com": "Entertainment", "last.fm": "Entertainment",
  "bandcamp.com": "Entertainment", "genius.com": "Entertainment", "9gag.com": "Entertainment",
  "buzzfeed.com": "Entertainment", "boredpanda.com": "Entertainment", "knowyourmeme.com": "Entertainment",
  // News
  "washingtonpost.com": "News", "wsj.com": "News", "ft.com": "News",
  "economist.com": "News", "apnews.com": "News", "aljazeera.com": "News",
  "npr.org": "News", "axios.com": "News", "politico.com": "News",
  "vox.com": "News", "theatlantic.com": "News", "newyorker.com": "News",
  "forbes.com": "News", "businessinsider.com": "News", "cnbc.com": "News",
  "financialexpress.com": "News", "business-standard.com": "News", "thewire.in": "News",
  "scroll.in": "News", "theprint.in": "News", "opindia.com": "News",
  "news18.com": "News", "indiatoday.in": "News", "zeenews.india.com": "News",
  "abplive.com": "News", "jagran.com": "News", "bhaskar.com": "News",
  "engadget.com": "News", "gizmodo.com": "News", "zdnet.com": "News",
  "cnet.com": "News", "tomshardware.com": "News", "xda-developers.com": "News",
  "9to5google.com": "News", "9to5mac.com": "News", "macrumors.com": "News",
  // Shopping
  "shein.com": "Shopping", "temu.com": "Shopping", "wish.com": "Shopping",
  "target.com": "Shopping", "bestbuy.com": "Shopping", "costco.com": "Shopping",
  "ikea.com": "Shopping", "wayfair.com": "Shopping", "urbanic.com": "Shopping",
  "bewakoof.com": "Shopping", "thesouledstore.com": "Shopping", "boat-lifestyle.com": "Shopping",
  "firstcry.com": "Shopping", "pepperfry.com": "Shopping", "urbanladder.com": "Shopping",
  "lenskart.com": "Shopping", "pharmeasy.in": "Shopping", "1mg.com": "Shopping",
  "netmeds.com": "Shopping", "dominos.co.in": "Shopping", "mcdelivery.co.in": "Shopping",
  "kfc.co.in": "Shopping", "instamart.in": "Shopping", "jiomart.com": "Shopping",
  "dunzo.com": "Shopping", "olx.in": "Shopping", "quikr.com": "Shopping",
  "cars24.com": "Shopping", "cardekho.com": "Shopping", "spinny.com": "Shopping",
};

/* Base-domain lookup: exact hostname first, then strip subdomain labels
 * (mail.foo.co.uk → foo.co.uk → co.uk stops before 2 labels). */
function catalogLookup(domain) {
  if (CATALOG[domain]) return CATALOG[domain];
  const parts = domain.split(".");
  for (let i = 1; i <= parts.length - 2; i++) {
    const base = parts.slice(i).join(".");
    if (CATALOG[base]) return CATALOG[base];
  }
  return null;
}

function categorize(domain, overrides) {
  if (overrides && overrides[domain]) return overrides[domain];
  const hit = catalogLookup(domain);
  if (hit) return hit;
  for (const [needle, cat] of DEFAULT_RULES) if (domainMatchesRule(domain, needle)) return cat;
  for (const [re, cat] of KEYWORD_RULES) if (re.test(domain)) return cat;
  return "Other";
}

// Studying and job-hunting count as productive time for focus/streaks.
const PRODUCTIVE_CATS = new Set(["Productive", "Education", "Career"]);

/* ---------- settings defaults ---------- */
const DEFAULT_SETTINGS = {
  overrides: {}, // domain -> category
  goals: {}, // category -> minutes (0/absent = no goal)
  ignore: [], // domains to never track
  idleSeconds: 60,
  retentionDays: 180, // history older than this is pruned automatically
  sunsetEnabled: true, // late-night nudge on stimulating sites
  sunsetHour: 23, // nudge window starts at this hour (20–23), ends 4am
  mediaEnabled: true, // video / shorts / feed-scroll detection
  eyeEnabled: true, // 20-20-20 eye breaks
  eyeIntervalMin: 20,
  eyeSnoozeMin: 5,
  officeMode: false, // water + stand reminders
  waterIntervalMin: 50,
  standIntervalMin: 60,
  recapEnabled: true, // morning "yesterday on Tabyss" notification
};

/* ==================================================================
 * Persona doodle — deterministic generative avatar art.
 * Seeded by persona + week, shaped by the stats themselves:
 * orbit dots = active days · sparks = streak · voids = rabbit holes ·
 * core size = focus score. Same week, same art; new week, new doodle.
 * (Pages only — needs a canvas; the service worker never calls this.)
 * ================================================================== */
function hashStr(s) {
  let h = 1779033703 ^ s.length;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}
function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function drawDoodle(canvas, persona, stats) {
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height, C = W / 2;
  const rnd = mulberry32(hashStr(persona.name + "|" + ((stats && stats.days && stats.days[0]) || "")));
  ctx.clearRect(0, 0, W, H);

  // circular clip + gradient ground
  ctx.save();
  ctx.beginPath();
  ctx.arc(C, C, C, 0, Math.PI * 2);
  ctx.clip();
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, persona.gradient[0]);
  g.addColorStop(1, persona.gradient[1]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // soft light blob
  const bx = W * (0.25 + rnd() * 0.5), by = H * (0.2 + rnd() * 0.3);
  const rg = ctx.createRadialGradient(bx, by, 0, bx, by, W * 0.55);
  rg.addColorStop(0, "rgba(255,255,255,0.35)");
  rg.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = rg;
  ctx.fillRect(0, 0, W, H);

  const activeDays = Math.max(0, Math.min(7, (stats && stats.activeDays) || 0));
  const score = stats && stats.avgScore != null ? stats.avgScore : 50;
  const holes = Math.max(0, Math.min(5, (stats && stats.holeCount) || 0));

  // core: size follows focus
  const coreR = W * (0.1 + (score / 100) * 0.14);
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.beginPath();
  ctx.arc(C, C, coreR, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = persona.gradient[0];
  ctx.beginPath();
  ctx.arc(C, C, coreR * 0.45, 0, Math.PI * 2);
  ctx.fill();

  // orbits + a dot per active day
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = Math.max(1, W * 0.008);
  const orbits = Math.max(1, Math.ceil(activeDays / 3));
  for (let o = 0; o < orbits; o++) {
    const r = coreR + W * 0.09 * (o + 1) + rnd() * W * 0.02;
    ctx.beginPath();
    ctx.arc(C, C, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (let d = 0; d < activeDays; d++) {
    const r = coreR + W * 0.09 * ((d % orbits) + 1);
    const a = rnd() * Math.PI * 2;
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.beginPath();
    ctx.arc(C + Math.cos(a) * r, C + Math.sin(a) * r, W * 0.028, 0, Math.PI * 2);
    ctx.fill();
  }

  // rabbit-hole voids: small dark notches near the rim
  for (let v = 0; v < holes; v++) {
    const a = rnd() * Math.PI * 2;
    const r = W * (0.38 + rnd() * 0.08);
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath();
    ctx.arc(C + Math.cos(a) * r, C + Math.sin(a) * r, W * (0.02 + rnd() * 0.02), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // rim
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.lineWidth = Math.max(1.5, W * 0.014);
  ctx.beginPath();
  ctx.arc(C, C, C - ctx.lineWidth / 2, 0, Math.PI * 2);
  ctx.stroke();
}

/* Chrome's built-in favicon cache — an extension-local URL, zero network.
 * Requires the "favicon" permission; only works inside extension pages. */
function faviconUrl(domain, size) {
  try {
    const u = new URL(chrome.runtime.getURL("/_favicon/"));
    u.searchParams.set("pageUrl", "https://" + domain);
    u.searchParams.set("size", String(size || 32));
    return u.toString();
  } catch (_) {
    return null;
  }
}

async function getSettings() {
  const { settings } = await chrome.storage.local.get("settings");
  return Object.assign({}, DEFAULT_SETTINGS, settings || {});
}

/* ==================================================================
 * Analytics: focus score, streaks, badges, week stats
 * ================================================================== */

function productiveSecs(usageDay, overrides) {
  let p = 0;
  for (const [d, s] of Object.entries(usageDay || {}))
    if (PRODUCTIVE_CATS.has(categorize(d, overrides))) p += s;
  return p;
}

/* Focus score 0–100 for one day. Deterministic and explainable:
 *   up to 65 pts — share of tracked time that was Productive
 *   up to 30 pts — switch discipline (site switches per active hour;
 *                  ≤6/hr full credit, 30/hr zero). Days with <1h tracked or
 *                  that predate switch tracking get a neutral 18 instead of
 *                  a noisy rate.
 *        + 5 pts — participation (a scoreable day happened at all)
 *   −6 per rabbit hole (max −15)
 * A perfect day = 65 + 30 + 5 = 100. Days with <30m tracked return null —
 * "not enough activity" is honest; "Focus Score: 0" on a quiet day is not. */
function focusScoreForDay(usageDay, switchCount, holesArr, overrides) {
  const total = Object.values(usageDay || {}).reduce((s, v) => s + v, 0);
  if (total < 1800) return null;
  const prodShare = productiveSecs(usageDay, overrides) / total;
  const base = prodShare * 65;
  let switchScore;
  if (switchCount == null || total < 3600) {
    switchScore = 18; // neutral credit — not enough signal for a fair rate
  } else {
    const rate = switchCount / (total / 3600);
    switchScore = 30 * Math.max(0, Math.min(1, 1 - (rate - 6) / 24));
  }
  const holePenalty = Math.min(15, (holesArr ? holesArr.length : 0) * 6);
  return Math.round(Math.max(0, Math.min(100, base + switchScore + 5 - holePenalty)));
}

function scoreColor(score) {
  if (score == null) return "#898781";
  // amber must darken on light surfaces (#fab219 is ~1.8:1 there)
  const dark =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
  return score >= 70 ? "#0ca30c" : score >= 40 ? (dark ? "#fab219" : "#b45309") : "#d03b3b";
}
function scoreLabel(score) {
  if (score == null) return "no data";
  if (score >= 85) return "Locked in";
  if (score >= 70) return "In the zone";
  if (score >= 40) return "Wobbly";
  return "Doomscroll era";
}

/* Streak: consecutive days with ≥30m Productive time, ending today.
 * Two kinds of forgiveness (habit-app standard — absence isn't failure):
 *  - today gets grace: if it hasn't met the bar YET, count from yesterday
 *  - one rest day per streak is forgiven if the day before it met the bar */
function computeStreak(usage, overrides) {
  const bar = 1800;
  const prodOf = (k) => productiveSecs(usage[k], overrides);
  let k = dateKey(Date.now());
  if (prodOf(k) < bar) k = shiftDay(k, -1);
  let n = 0, guard = 0, graceUsed = false;
  while (guard++ < 3660) {
    if (prodOf(k) >= bar) {
      n++;
      k = shiftDay(k, -1);
    } else if (n > 0 && !graceUsed && prodOf(shiftDay(k, -1)) >= bar) {
      graceUsed = true; // rest day — streak survives
      k = shiftDay(k, -1);
    } else {
      break;
    }
  }
  return n;
}

/* Badge engine. Copy (names/emoji/descriptions) lives in BADGE_COPY;
 * conditions are computed here from the data. */
function computeBadges(data) {
  const { usage = {}, hours = {}, switches = {}, holes = {}, notified = {}, settings = {} } = data;
  const ov = settings.overrides;
  const days = Object.keys(usage).sort();
  const today = dateKey(Date.now());
  const streak = computeStreak(usage, ov);

  let totalAll = 0, anyDay = false, marathon = false, zenDay = false, nightShift = false,
      explorer = false, earlyRiser = false, goalKeeper = false;
  for (const day of days) {
    const dayUsage = usage[day];
    const dayTotal = Object.values(dayUsage).reduce((s, v) => s + v, 0);
    if (!dayTotal) continue;
    anyDay = true;
    totalAll += dayTotal;
    if (productiveSecs(dayUsage, ov) >= 4 * 3600) marathon = true;
    if (Object.keys(dayUsage).length >= 25) explorer = true;
    const score = focusScoreForDay(dayUsage, switches[day], holes[day], ov);
    if (score != null && score >= 85 && dayTotal >= 2 * 3600) zenDay = true;
    const hh = hours[day] || {};
    let night = 0, early = 0;
    for (const [h, v] of Object.entries(hh)) {
      const n = Number(h);
      if (n < 5) night += v;
      if (n < 9) early += v;
    }
    if (night >= 2 * 3600) nightShift = true;
    if (early >= 3600) earlyRiser = true;
    // goal_keeper: a finished day on which goals were actually in effect
    // (marker written by the worker) and none breached (marker still empty).
    // Pre-goal history has no marker, so this is never earned retroactively.
    if (day < today && notified[day] && Object.keys(notified[day]).length === 0) {
      goalKeeper = true;
    }
  }
  // clean_week: a Sun–Sat week with real participation (≥5 active days) and
  // zero rabbit holes — a partial first week must not auto-earn it.
  let cleanWeek = false;
  if (days.length) {
    let wk = shiftDay(today, -(new Date().getDay() + 7)); // start of last full week
    for (let w = 0; w < 26 && !cleanWeek; w++) {
      const keys = [];
      for (let i = 0; i < 7; i++) keys.push(shiftDay(wk, i));
      const active = keys.filter((k) => usage[k] && Object.keys(usage[k]).length).length;
      const holed = keys.some((k) => (holes[k] || []).length);
      if (active >= 5 && !holed) cleanWeek = true;
      wk = shiftDay(wk, -7);
    }
  }

  const earned = {
    first_steps: anyDay,
    streak_3: streak >= 3,
    streak_7: streak >= 7,
    streak_30: streak >= 30,
    marathon,
    zen_day: zenDay,
    night_shift: nightShift,
    century: totalAll >= 100 * 3600,
    explorer,
    goal_keeper: goalKeeper,
    clean_week: cleanWeek,
    early_riser: earlyRiser,
  };
  return BADGE_COPY.map((b) => Object.assign({}, b, { earned: !!earned[b.id] }));
}

/* Aggregate stats for the last `days` days ending at `endKey` (inclusive). */
function weekStats(data, endKey, days = 7) {
  const { usage = {}, hours = {}, switches = {}, holes = {}, settings = {} } = data;
  const ov = settings.overrides;
  const stats = {
    total: 0, catTotals: {}, hourTotals: {}, switchTotal: 0, switchDays: 0,
    holeCount: 0, biggestHole: null, activeDays: 0, days: [], scores: [],
    topSite: null, siteTotals: {}, weekendSecs: 0,
  };
  for (let i = days - 1; i >= 0; i--) {
    const k = shiftDay(endKey, -i);
    stats.days.push(k);
    const u = usage[k] || {};
    const dayTotal = Object.values(u).reduce((s, v) => s + v, 0);
    if (dayTotal > 0) stats.activeDays++;
    stats.total += dayTotal;
    const wd = weekdayOfKey(k);
    if (wd === 0 || wd === 6) stats.weekendSecs += dayTotal;
    for (const [d, s] of Object.entries(u)) {
      stats.siteTotals[d] = (stats.siteTotals[d] || 0) + s;
      const c = categorize(d, ov);
      stats.catTotals[c] = (stats.catTotals[c] || 0) + s;
    }
    for (const [h, v] of Object.entries(hours[k] || {}))
      stats.hourTotals[h] = (stats.hourTotals[h] || 0) + v;
    if (switches[k] != null) {
      stats.switchTotal += switches[k];
      stats.switchDays++;
    }
    for (const hole of holes[k] || []) {
      stats.holeCount++;
      if (!stats.biggestHole || hole.secs > stats.biggestHole.secs) stats.biggestHole = hole;
    }
    const score = focusScoreForDay(u, switches[k], holes[k], ov);
    if (score != null) stats.scores.push({ day: k, score });
  }
  const sites = Object.entries(stats.siteTotals).sort((a, b) => b[1] - a[1]);
  stats.topSite = sites[0] || null;
  stats.avgScore = stats.scores.length
    ? Math.round(stats.scores.reduce((s, x) => s + x.score, 0) / stats.scores.length)
    : null;
  return stats;
}

function weekdayOfKey(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).getDay();
}

/* ==================================================================
 * Browsing Personality — 24 bases × 4 epithets + specials = 50+ personas
 * ================================================================== */

const PERSONA_CATALOG = {
  bases: [
    { category: "Builder", rhythm: "NightOwl", name: "The 3AM Shipwright", emoji: "🛠️🌙", tagline: "You ship your best work while the rest of the world is in sleep mode.", gradient: ["#0D9488", "#064E3B"] },
    { category: "Builder", rhythm: "EarlyBird", name: "The Dawn Compiler", emoji: "🌅⚙️", tagline: "You've built, broken, and rebuilt something before the sun clocks in.", gradient: ["#2DD4BF", "#BEF264"] },
    { category: "Builder", rhythm: "NineToFive", name: "The Sprint Captain", emoji: "🏁💻", tagline: "You treat business hours like a personal speedrun leaderboard.", gradient: ["#14B8A6", "#22C55E"] },
    { category: "Builder", rhythm: "AllDayer", name: "The Build Server", emoji: "🧱🤖", tagline: "You run continuous integration on your entire life, 24/7.", gradient: ["#059669", "#2DD4BF"] },
    { category: "Socialite", rhythm: "NightOwl", name: "The After-Dark Admin", emoji: "💬🌙", tagline: "You keep the group chat alive long after reasonable people log off.", gradient: ["#1D4ED8", "#155E75"] },
    { category: "Socialite", rhythm: "EarlyBird", name: "The Morning Roll Call", emoji: "📣☀️", tagline: "You take attendance on everyone's life before your coffee cools.", gradient: ["#38BDF8", "#A5F3FC"] },
    { category: "Socialite", rhythm: "NineToFive", name: "The Desk-Chair Diplomat", emoji: "🤝💬", tagline: "You maintain diplomatic relations across six platforms on company time.", gradient: ["#2563EB", "#06B6D4"] },
    { category: "Socialite", rhythm: "AllDayer", name: "The Timeline Landlord", emoji: "🏠📲", tagline: "You collect rent on every timeline you've ever scrolled.", gradient: ["#3B82F6", "#22D3EE"] },
    { category: "Streamer", rhythm: "NightOwl", name: "The Autoplay Vampire", emoji: "🧛📺", tagline: "You fear sunlight, closing credits, and the 'are you still watching?' screen.", gradient: ["#6D28D9", "#9D174D"] },
    { category: "Streamer", rhythm: "EarlyBird", name: "The Morning Matinee", emoji: "🎬🥐", tagline: "You finish a season before most people find both shoes.", gradient: ["#C084FC", "#F9A8D4"] },
    { category: "Streamer", rhythm: "NineToFive", name: "The Background-Tab DJ", emoji: "🎧🗂️", tagline: "You keep strictly professional hours — with a forty-tab soundtrack.", gradient: ["#8B5CF6", "#D946EF"] },
    { category: "Streamer", rhythm: "AllDayer", name: "The Infinite Queue", emoji: "📺♾️", tagline: "Your watchlist has a watchlist, and honestly both are thriving.", gradient: ["#9333EA", "#EC4899"] },
    { category: "Scholar", rhythm: "NightOwl", name: "The 3AM Historian", emoji: "📜🕯️", tagline: "You needed to know about the Byzantine Empire at 2:47 in the morning.", gradient: ["#D97706", "#78350F"] },
    { category: "Scholar", rhythm: "EarlyBird", name: "The First Edition", emoji: "📰🌅", tagline: "You've read the news before the news finishes waking up.", gradient: ["#FDE047", "#F59E0B"] },
    { category: "Scholar", rhythm: "NineToFive", name: "The Office-Hours Oracle", emoji: "🔮📚", tagline: "You cite sources in the group chat and everyone secretly loves it.", gradient: ["#EAB308", "#D97706"] },
    { category: "Scholar", rhythm: "AllDayer", name: "The Living Archive", emoji: "🧠📚", tagline: "You don't doomscroll — you peer-review.", gradient: ["#CA8A04", "#FBBF24"] },
    { category: "Shopper", rhythm: "NightOwl", name: "The Midnight Checkout", emoji: "🛒🌙", tagline: "You make your boldest financial decisions strictly after midnight.", gradient: ["#EA580C", "#881337"] },
    { category: "Shopper", rhythm: "EarlyBird", name: "The Doorbuster", emoji: "🛍️🌅", tagline: "You treat sunrise like a store opening — and you're first in line.", gradient: ["#FDBA74", "#FB7185"] },
    { category: "Shopper", rhythm: "NineToFive", name: "The Lunch-Break Haul", emoji: "📦🥪", tagline: "You've turned 12 to 1 into a personal shopping district.", gradient: ["#F97316", "#E11D48"] },
    { category: "Shopper", rhythm: "AllDayer", name: "The Cart Curator", emoji: "🛒🖼️", tagline: "You run your cart like a gallery — always open, rarely checking out.", gradient: ["#FB923C", "#F43F5E"] },
    { category: "Wanderer", rhythm: "NightOwl", name: "The Sleepwalker", emoji: "🌙👣", tagline: "You don't remember opening that tab either. Nobody does.", gradient: ["#64748B", "#1E293B"] },
    { category: "Wanderer", rhythm: "EarlyBird", name: "The Dawn Drifter", emoji: "🧭🌅", tagline: "You greet the sunrise with coffee and seventeen unrelated tabs.", gradient: ["#94A3B8", "#BAE6FD"] },
    { category: "Wanderer", rhythm: "NineToFive", name: "The Scenic Router", emoji: "🗺️💼", tagline: "You get from A to B every workday — via the entire internet.", gradient: ["#64748B", "#93C5FD"] },
    { category: "Wanderer", rhythm: "AllDayer", name: "The Side-Quester", emoji: "⚔️❗", tagline: "You've finished every side quest except the one called your to-do list.", gradient: ["#475569", "#94A3B8"] },
  ],
  epithets: [
    { intensity: "Zen", label: "light-mode edition", flavor: "Barely online this week — the internet misses you, respectfully." },
    { intensity: "Balanced", label: "golden-ratio edition", flavor: "A little of everything, too much of nothing. Suspiciously healthy." },
    { intensity: "DeepDiver", label: "tunnel-vision edition", flavor: "One tab, one mission, zero survivors. Hours vanished honorably." },
    { intensity: "Scatterbrain", label: "rabbit-hole edition", flavor: "Every tab led to three more. You regret nothing." },
  ],
  specials: [
    { id: "ghost", name: "The Ghost", emoji: "👻", tagline: "You appeared for a moment, then vanished. The tabs whisper your name.", gradient: ["#64748B", "#CBD5E1"] },
    { id: "weekend_warrior", name: "The Weekend Headliner", emoji: "🎪⚡", tagline: "Monday through Friday? Rumors. Your whole internet life happens in 48 hours.", gradient: ["#F59E0B", "#EC4899"] },
    { id: "comeback", name: "The Redemption Arc", emoji: "📈🔥", tagline: "Your productive time doubled. The character development is real.", gradient: ["#10B981", "#3B82F6"] },
  ],
};

const ARCHETYPE_OF_CAT = {
  Productive: "Builder",
  Education: "Scholar",
  Career: "Builder",
  Social: "Socialite",
  Entertainment: "Streamer",
  News: "Scholar",
  Shopping: "Shopper",
};

/* Resolve the persona for a week of stats (weekStats output). prevStats is the
 * prior week, used for the "comeback" special. Deterministic; data-gated so a
 * 20-minute first day never gets crowned a Night-Owl Scatterbrain. */
function personaFor(stats, prevStats) {
  const epithetOf = (key) =>
    PERSONA_CATALOG.epithets.find((e) => e.intensity === key) || PERSONA_CATALOG.epithets[1];

  // Not enough data → Ghost (needs ≥4 active days and ≥3h tracked)
  if (stats.activeDays < 4 || stats.total < 3 * 3600) {
    const s = PERSONA_CATALOG.specials.find((x) => x.id === "ghost");
    return Object.assign({}, s, { epithet: epithetOf("Zen"), special: true });
  }

  // Intensity axis (computed first — specials wear it too)
  const avgPerActiveDay = stats.total / stats.activeDays;
  const rate = stats.switchDays > 0 ? stats.switchTotal / (stats.total / 3600) : null;
  let intensity;
  if (avgPerActiveDay < 75 * 60) intensity = "Zen";
  else if (stats.holeCount >= 4 || (rate != null && rate >= 20)) intensity = "Scatterbrain";
  else if (rate != null && rate <= 7 && avgPerActiveDay >= 2 * 3600) intensity = "DeepDiver";
  else intensity = "Balanced";
  const epithet = epithetOf(intensity);

  // Specials, in priority order
  if (prevStats && prevStats.total >= 2 * 3600) {
    const prodOf = (t) => { let p = 0; for (const c of PRODUCTIVE_CATS) p += t[c] || 0; return p; };
    const share = prodOf(stats.catTotals) / stats.total;
    const prevShare = prodOf(prevStats.catTotals) / prevStats.total;
    if (prevShare > 0.05 && share >= 2 * prevShare && share >= 0.3) {
      const s = PERSONA_CATALOG.specials.find((x) => x.id === "comeback");
      return Object.assign({}, s, { epithet, special: true });
    }
  }
  if (stats.weekendSecs / stats.total >= 0.6) {
    const s = PERSONA_CATALOG.specials.find((x) => x.id === "weekend_warrior");
    return Object.assign({}, s, { epithet, special: true });
  }

  // Archetype: dominant categorized (non-Other) share; Wanderer if nothing dominates.
  // Tie-break is the fixed CATEGORIES order (deterministic).
  const categorized = Object.entries(stats.catTotals).filter(([c]) => c !== "Other");
  const catSum = categorized.reduce((s, [, v]) => s + v, 0);
  let archetype = "Wanderer";
  if (catSum > 0) {
    let top = null;
    for (const cat of CATEGORIES) {
      const v = stats.catTotals[cat];
      if (cat !== "Other" && v && (top == null || v > top[1])) top = [cat, v];
    }
    if (top && top[1] / catSum >= 0.35) archetype = ARCHETYPE_OF_CAT[top[0]] || "Wanderer";
  }

  // Rhythm from the hour histogram. Morning is 5–9 only (before work hours);
  // a 10am browser is a NineToFive, not an EarlyBird.
  let night = 0, morning = 0, work = 0;
  for (const [h, v] of Object.entries(stats.hourTotals)) {
    const n = Number(h);
    if (n >= 22 || n < 5) night += v;
    if (n >= 5 && n < 9) morning += v;
    if (n >= 9 && n < 18) work += v;
  }
  const t = Math.max(1, stats.total);
  let rhythm;
  if (night / t >= 0.28) rhythm = "NightOwl";
  else if (morning / t >= 0.35) rhythm = "EarlyBird";
  else if (work / t >= 0.62) rhythm = "NineToFive";
  else rhythm = "AllDayer";

  const base =
    PERSONA_CATALOG.bases.find((b) => b.category === archetype && b.rhythm === rhythm) ||
    PERSONA_CATALOG.bases[0];
  return Object.assign({}, base, { epithet, special: false });
}

/* ---------- badge & Wrapped copy ---------- */

const BADGE_COPY = [
  { id: "first_steps", name: "First Steps", emoji: "🐣", description: "Log your first day of tracked browsing. Everyone starts somewhere." },
  { id: "streak_3", name: "Warming Up", emoji: "🔥", description: "Three days straight with 30+ productive minutes. Keep it rolling." },
  { id: "streak_7", name: "Streak Week", emoji: "📈", description: "Seven straight days of 30+ productive minutes. Momentum unlocked." },
  { id: "streak_30", name: "Certified Habit", emoji: "💎", description: "30 days straight of 30+ productive minutes. This is who you are now." },
  { id: "marathon", name: "Marathon Mode", emoji: "🏃", description: "Rack up 4+ productive hours in a single day. Hydrate, champion." },
  { id: "zen_day", name: "Zen Master", emoji: "🧘", description: "Score 85+ focus on a day with 2+ hours tracked. Pure flow state." },
  { id: "night_shift", name: "Night Shift", emoji: "🦉", description: "Track 2+ hours between midnight and 5am. Sleep is a suggestion." },
  { id: "century", name: "Century Club", emoji: "💯", description: "Hit 100 hours tracked all-time. You've seen some internet." },
  { id: "explorer", name: "Internet Tourist", emoji: "🧭", description: "Visit 25+ distinct sites in one day. Quite the sightseeing tour." },
  { id: "goal_keeper", name: "Goal Keeper", emoji: "🥅", description: "End a full day with goals set and none breached. Clean sheet." },
  { id: "clean_week", name: "Squeaky Clean", emoji: "✨", description: "Go a whole week with zero rabbit holes. Not a single spiral." },
  { id: "early_riser", name: "Early Riser", emoji: "🌅", description: "Track 1+ hour before 9am. The worms never stood a chance." },
];

const WRAPPED_COPY = [
  { id: "intro", title: "Your week, but make it data", subtitle: "{dates} — seven days of tabs, triumphs, and questionable clicks. Let's get into it." },
  { id: "total", title: "The grand total: {time}", subtitle: "That's {avg} a day. We're not judging — the math is." },
  { id: "top_site", title: "It's always {site}", subtitle: "{sitetime} this week. At this point it should be paying rent." },
  { id: "categories", title: "You had a type this week", subtitle: "{topcat} claimed {pct} of your time. Everything else was a side quest." },
  { id: "rhythm", title: "Your power hour: {peak}", subtitle: "That's when you're most dialed in. {night_or_day_line}" },
  { id: "rabbit", title: "About those rabbit holes...", subtitle: "{hole_line} It happens to the best of us." },
  { id: "focus", title: "Focus score: {score}", subtitle: "Verdict: {label}. Your attention went on record this week." },
  { id: "persona", title: "The data has spoken...", subtitle: "Seven days of clicks, distilled into one true internet self. Own it." },
  { id: "share", title: "Post it or it didn't happen", subtitle: "Save your card and show the group chat. Tracked in private, flexed in public." },
];
