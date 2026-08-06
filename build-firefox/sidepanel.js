/* Tabyss Saved Pages — one local, accessible place for pages worth returning to. */

let savedState = null;
let savedFilter = "saved";

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text != null) element.textContent = text;
  return element;
}

function actionButton(label, action, id, className = "btn compact") {
  const element = node("button", className, label);
  element.type = "button";
  element.dataset.action = action;
  element.dataset.id = id;
  return element;
}

function showFeedback(message, tone = "info") {
  const feedback = document.getElementById("savedFeedback");
  feedback.textContent = message;
  feedback.dataset.tone = tone;
  feedback.hidden = !message;
  if (message) setTimeout(() => {
    if (feedback.textContent === message) feedback.hidden = true;
  }, 5000);
}

async function productRequest(action, payload = {}) {
  const message = action === "get"
    ? { type: "GET_PRODUCT_DATA" }
    : { type: "PRODUCT_COMMAND", action, ...payload };
  const response = await chrome.runtime.sendMessage(message);
  if (!response?.ok) throw new Error(response?.error || "That page could not be updated safely.");
  return response;
}

function formatWhen(timestamp) {
  return new Date(timestamp).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: new Date(timestamp).getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  });
}

function faviconBadge(pageUrl, label) {
  const badge = node("span", "page-favicon");
  badge.setAttribute("aria-hidden", "true");
  const fallbackText = String(label || "?").trim().charAt(0).toUpperCase() || "?";
  const showFallback = () => {
    badge.replaceChildren(fallbackText);
    badge.classList.add("is-fallback");
  };
  const source = faviconUrl(pageUrl, 32);
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

function emptyState() {
  const empty = node("div", "saved-empty");
  empty.append(
    node("strong", "", savedFilter === "done" ? "No completed pages" : "Nothing saved yet"),
    node("p", "", savedFilter === "done"
      ? "Pages you mark completed will appear here."
      : "Save the page you are viewing so you can close its tab without losing it.")
  );
  return empty;
}

function savedPageCard(page) {
  const card = node("article", `saved-page-card${page.status === "done" ? " is-done" : ""}`);
  const heading = node("div", "saved-page-heading");
  const identity = node("div", "item-identity");
  identity.append(faviconBadge(page.url, page.title));
  const copy = node("div", "item-copy");
  copy.append(node("h3", "", page.title), node("p", "saved-domain", page.domain));
  identity.append(copy);
  heading.append(identity);
  if (page.status === "done") heading.append(node("span", "status-chip", "Completed"));
  card.append(heading);

  if (page.note) card.append(node("p", "saved-note", page.note));
  card.append(node("p", "saved-date", `Saved ${formatWhen(page.savedAt)}`));

  const actions = node("div", "button-row saved-page-actions");
  actions.append(
    actionButton("Open page", "open", page.id, "btn primary compact"),
    actionButton(page.status === "done" ? "Save again" : "Mark completed", "toggle", page.id),
    actionButton("Delete", "delete", page.id, "btn compact quiet-danger")
  );
  card.append(actions);
  return card;
}

function visiblePages() {
  const pages = savedState?.product?.capsules || [];
  return pages.filter((page) => savedFilter === "all" || page.status === savedFilter);
}

function renderPages() {
  const list = document.getElementById("savedPageList");
  const pages = visiblePages();
  list.replaceChildren();
  for (const page of pages) list.append(savedPageCard(page));
  if (!pages.length) list.append(emptyState());

  const waiting = (savedState?.product?.capsules || []).filter((page) => page.status === "saved").length;
  document.getElementById("savedPageCount").textContent = `${waiting} saved`;

  // The worker already computes duplicate open-tab groups — surface them.
  const extraCopies = (savedState?.duplicates || []).reduce((sum, group) => sum + (group.length - 1), 0);
  const dupHint = document.getElementById("dupHint");
  if (dupHint) {
    dupHint.hidden = extraCopies < 1;
    dupHint.textContent = extraCopies < 1 ? "" :
      `Tab check: ${extraCopies} open ${extraCopies === 1 ? "tab is a duplicate" : "tabs are duplicates"} of another tab in this window.`;
  }
  list.setAttribute("aria-busy", "false");
}

async function refresh() {
  document.getElementById("savedPageList").setAttribute("aria-busy", "true");
  savedState = await productRequest("get");
  renderPages();
}

document.getElementById("savedPageForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const submit = document.getElementById("savePageSubmit");
  submit.disabled = true;
  try {
    savedState = await productRequest("save-capsule", { note: document.getElementById("savedPageNote").value });
    savedFilter = "saved";
    form.reset();
    updateFilters();
    renderPages();
    showFeedback("Current page saved on this device.", "success");
  } catch (error) {
    showFeedback(error.message, "error");
  } finally {
    submit.disabled = false;
  }
});

function updateFilters() {
  for (const button of document.querySelectorAll("[data-saved-filter]")) {
    const active = button.dataset.savedFilter === savedFilter;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  }
}

document.querySelector(".filter-row").addEventListener("click", (event) => {
  const button = event.target.closest("[data-saved-filter]");
  if (!button) return;
  savedFilter = button.dataset.savedFilter;
  updateFilters();
  renderPages();
});

document.getElementById("savedPageList").addEventListener("click", async (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  const page = savedState?.product?.capsules.find((item) => item.id === target.dataset.id);
  if (!page) return;
  target.disabled = true;
  try {
    if (target.dataset.action === "open") {
      await chrome.tabs.create({ url: page.url });
      showFeedback("Page opened in a new tab.", "success");
    } else if (target.dataset.action === "toggle") {
      savedState = await productRequest("update-capsule", {
        capsuleId: page.id,
        status: page.status === "done" ? "saved" : "done",
        note: page.note,
      });
      renderPages();
      showFeedback(page.status === "done" ? "Page moved back to Saved." : "Page marked completed.", "success");
    } else if (target.dataset.action === "delete") {
      if (!confirm(`Delete “${page.title}” from Saved pages?`)) return;
      savedState = await productRequest("delete-capsule", { capsuleId: page.id });
      renderPages();
      showFeedback("Saved page deleted.", "success");
    }
  } catch (error) {
    showFeedback(error.message, "error");
  } finally {
    // renderPages() may have replaced the list; only touch a still-live button.
    if (target.isConnected) target.disabled = false;
  }
});

if (chrome.storage?.onChanged) {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local" && changes.product) refresh().catch(() => {});
  });
}

refresh().catch((error) => showFeedback(error.message, "error"));
