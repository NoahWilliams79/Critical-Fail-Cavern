(function () {
  "use strict";

  const STORAGE_KEY = "criticalFailCavern.v1";
  const SIZES = ["Tiny", "Small", "Medium", "Large", "Huge"];
  const PLAN_LIMITS = {
    Free: { collection: 20, listings: 2 },
    Creator: { collection: 100, listings: 10 },
    "Creator Pro": { collection: 10000, listings: Infinity }
  };
  const MAX_IMAGE_SIZE = 1024 * 1024;
  let storageUnavailable = false;
  let uploadedMapUrl = "";
  let listingPreviewUrl = "";
  let noticeTimer;
  let pendingConfirmation = null;

  const storage = {
    get: function (key) {
      try {
        const saved = localStorage.getItem(key);
        return saved === null ? null : JSON.parse(saved);
      } catch (error) {
        storageUnavailable = true;
        return null;
      }
    },
    set: function (key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (error) {
        return false;
      }
    }
  };

  function defaultState() {
    return {
      collection: [
        { id: "collection-mossback", miniatureId: "mini-mossback", name: "Mossback Sentinel", creatureType: "Construct", size: "Medium", gameSystem: "Cavern Quest", creator: "Moss & Mithril", quantity: 1, paintingStatus: "In progress", notes: "Testing a mossy stone effect." },
        { id: "collection-coppercap", miniatureId: "mini-copper", name: "Coppercap Burrower", creatureType: "Beast", size: "Small", gameSystem: "Cavern Quest", creator: "Emberforge Studio", quantity: 2, paintingStatus: "Painted", notes: "" },
        { id: "collection-vale", miniatureId: "mini-vale", name: "Vale Watcher", creatureType: "Humanoid", size: "Medium", gameSystem: "Open Table", creator: "Lanternlight Workshop", quantity: 1, paintingStatus: "Unpainted", notes: "" }
      ],
      combatants: [
        { id: "combatant-vale", name: "Vale Watcher", kind: "Player", miniatureId: "mini-vale", collectionEntryId: "collection-vale", miniatureSnapshot: null, initiative: 16, hp: 12, maxHp: 12, ac: 10 },
        { id: "combatant-mossback", name: "Mossback Sentinel", kind: "Creature", miniatureId: "mini-mossback", collectionEntryId: "collection-mossback", miniatureSnapshot: null, initiative: 12, hp: 18, maxHp: 18, ac: 10 },
        { id: "combatant-coppercap", name: "Coppercap Burrower", kind: "Creature", miniatureId: "mini-copper", collectionEntryId: "collection-coppercap", miniatureSnapshot: null, initiative: 8, hp: 7, maxHp: 7, ac: 10 }
      ],
      turnIndex: 0,
      round: 1,
      selectedCombatantId: "combatant-vale",
      encounterName: "Cavern Gate",
      savedEncounters: [],
      mapMarkers: [
        { id: "marker-vale", combatantId: "combatant-vale", x: 30, y: 45 },
        { id: "marker-mossback", combatantId: "combatant-mossback", x: 67, y: 55 }
      ],
      gridEnabled: false,
      mapSource: "grasslands",
      mapFileName: "",
      marketListings: [],
      marketInventory: {},
      cart: [],
      purchases: [],
      purchasedDigitalListingIds: [],
      account: null,
      localProfile: null,
      activity: [
        { id: "activity-1", text: "The Cavern Gate demo encounter is ready to play." },
        { id: "activity-2", text: "Three sample miniatures were added to your collection." },
        { id: "activity-3", text: "Fictional creators added new marketplace listings." }
      ]
    };
  }

  const storedState = storage.get(STORAGE_KEY);
  const state = Object.assign(defaultState(), storedState && typeof storedState === "object" ? storedState : {});
  [
    "collection", "combatants", "savedEncounters", "mapMarkers",
    "marketListings", "cart", "purchases", "purchasedDigitalListingIds", "activity"
  ].forEach(function (key) {
    if (!Array.isArray(state[key])) state[key] = [];
  });
  state.purchases.forEach(function (purchase) {
    if ((purchase.type === "Digital STL" || purchase.type === "Battlemap") && purchase.listingId &&
        state.purchasedDigitalListingIds.indexOf(purchase.listingId) === -1) {
      state.purchasedDigitalListingIds.push(purchase.listingId);
    }
  });
  if (!state.marketInventory || typeof state.marketInventory !== "object" || Array.isArray(state.marketInventory)) {
    state.marketInventory = {};
  }
  state.marketListings.forEach(function (listing) {
    if (listing.type !== "Physical") return;
    const quantity = Number(listing.quantity);
    listing.quantity = Number.isInteger(quantity) && quantity >= 0 ? quantity : 1;
  });
  function normalizeArmorClass(combatant) {
    const armorClass = Number(combatant.ac);
    combatant.ac = Number.isInteger(armorClass) && armorClass >= 1 && armorClass <= 30 ? armorClass : 10;
  }
  state.combatants.forEach(normalizeArmorClass);
  state.collection.forEach(function (entry) { delete entry.enemy; });
  state.combatants.forEach(function (combatant) {
    combatant.enemy = Boolean(combatant.enemy);
  });
  state.savedEncounters.forEach(function (encounter) {
    if (Array.isArray(encounter.combatants)) {
      encounter.combatants.forEach(function (combatant) {
        normalizeArmorClass(combatant);
        combatant.enemy = Boolean(combatant.enemy);
      });
    }
  });
  if (!state.account || typeof state.account !== "object") state.account = null;
  if (!state.localProfile || typeof state.localProfile !== "object") state.localProfile = null;
  if (state.account && state.account.kind === "local") state.account = null;
  const isPurchasedBattlemapSource = MARKET_SAMPLE.some(function (item) {
    return item.type === "Battlemap" && item.id === state.mapSource &&
      state.purchasedDigitalListingIds.indexOf(item.id) !== -1;
  });
  if (!storedState || (state.mapSource !== "grasslands" && state.mapSource !== "pdf" && !isPurchasedBattlemapSource)) {
    state.mapSource = state.mapFileName ? "pdf" : "grasslands";
  }
  if (state.account && state.account.kind === "demo") state.account.name = "BSAD 281 Demo account";
  state.marketListings.forEach(function (listing) {
    if (listing.owner === "Demo Adventurer") listing.owner = "BSAD 281 Demo account";
    if (listing.seller === "Demo Adventurer") listing.seller = "BSAD 281 Demo account";
  });
  if (state.account && state.account.membership === "Pro") state.account.membership = "Creator";
  if (!Number.isInteger(state.turnIndex)) state.turnIndex = 0;
  if (!Number.isInteger(state.round) || state.round < 1) state.round = 1;

  const notice = document.getElementById("notice");
  document.title = STARTUP.name;
  document.getElementById("brand-name").textContent = STARTUP.name;
  document.getElementById("tagline").textContent = STARTUP.tagline;
  document.getElementById("pitch").textContent = STARTUP.pitch;

  function notify(message, type) {
    notice.textContent = message;
    notice.className = "notice" + (type === "error" ? " error" : "");
    notice.hidden = false;
    window.clearTimeout(noticeTimer);
    noticeTimer = window.setTimeout(function () { notice.hidden = true; }, 5000);
  }

  function requestConfirmation(message, onConfirm, confirmLabel, isDestructive) {
    const dialog = document.getElementById("confirmation-dialog");
    const acceptButton = document.getElementById("confirmation-accept");
    document.getElementById("confirmation-message").textContent = message;
    acceptButton.textContent = confirmLabel || "Confirm";
    acceptButton.className = isDestructive ? "button secondary danger-button" : "button";
    pendingConfirmation = onConfirm;
    dialog.showModal();
  }

  function saveState(successMessage) {
    if (!storage.set(STORAGE_KEY, state)) {
      notify("Your change is active for this visit, but browser storage is unavailable, so it may not survive a refresh.", "error");
      return false;
    }
    if (successMessage) notify(successMessage);
    return true;
  }

  function createId(prefix) {
    return prefix + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
  }

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function escapeSvgText(value) {
    return String(value).replace(/[&<>"']/g, function (character) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&apos;" }[character];
    });
  }

  function generatedListingImage(item) {
    let seed = 0;
    String(item.id || item.name).split("").forEach(function (character) {
      seed = (seed * 31 + character.charCodeAt(0)) >>> 0;
    });
    const hue = seed % 360;
    const title = escapeSvgText(Array.from(String(item.name)).slice(0, 34).join(""));
    const typeLabel = item.type === "Digital STL" ? "DIGITAL MODEL" : "TABLETOP MINIATURE";
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 420">' +
      '<defs><linearGradient id="bg" x2="1" y2="1"><stop stop-color="hsl(' + hue + ',38%,32%)"/><stop offset="1" stop-color="hsl(' + ((hue + 36) % 360) + ',44%,17%)"/></linearGradient>' +
      '<pattern id="texture" width="32" height="32" patternUnits="userSpaceOnUse"><circle cx="4" cy="5" r="1" fill="#fff" opacity=".12"/><circle cx="21" cy="20" r="1.5" fill="#fff" opacity=".08"/></pattern></defs>' +
      '<rect width="640" height="420" fill="url(#bg)"/><rect width="640" height="420" fill="url(#texture)"/>' +
      '<circle cx="320" cy="177" r="119" fill="hsl(' + hue + ',50%,55%)" opacity=".23"/>' +
      '<path d="M92 310c85-33 142-18 214-10 78 9 156-37 241-10l26 42H67z" fill="#19201c" opacity=".48"/>' +
      '<ellipse cx="320" cy="299" rx="111" ry="25" fill="#1e2522" stroke="#d7c390" stroke-width="8"/>' +
      '<path d="M299 283l-17-62 18-56 38 1 21 59-22 59z" fill="#d5c7a2" stroke="#283032" stroke-width="9" stroke-linejoin="round"/>' +
      '<circle cx="319" cy="133" r="28" fill="#d9c9a4" stroke="#283032" stroke-width="9"/>' +
      '<path d="M292 221l-42 44m107-45 38 45M303 277l-27 21m74-20 27 20M369 225l65-105" fill="none" stroke="#283032" stroke-width="15" stroke-linecap="round"/>' +
      '<path d="M432 120l14-42 12 41z" fill="#d9c9a4" stroke="#283032" stroke-width="7" stroke-linejoin="round"/>' +
      '<rect x="28" y="26" width="205" height="35" rx="17" fill="#101819" opacity=".72"/>' +
      '<text x="44" y="49" fill="#f3e8c9" font-family="Arial,sans-serif" font-size="16" font-weight="700" letter-spacing="1">' + typeLabel + '</text>' +
      '<text x="320" y="373" text-anchor="middle" fill="#fff8e7" font-family="Arial,sans-serif" font-size="23" font-weight="700">' + title + '</text>' +
      '</svg>';
    return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
  }

  function marketplaceImageSource(item) {
    return item.imageData || item.mapAsset || generatedListingImage(item);
  }

  function readListingImage(file) {
    return new Promise(function (resolve, reject) {
      const reader = new FileReader();
      reader.addEventListener("load", function () {
        if (typeof reader.result !== "string") {
          reject(new Error("The browser returned no image data."));
          return;
        }
        resolve(reader.result);
      });
      reader.addEventListener("error", function () {
        reject(reader.error || new Error("The browser could not read the image."));
      });
      reader.readAsDataURL(file);
    });
  }

  function showListingImagePreview(src, alt) {
    const image = document.getElementById("listing-image-preview-img");
    image.src = src;
    image.alt = alt;
    document.getElementById("listing-image-preview").hidden = false;
  }

  function clearListingImagePreview() {
    if (listingPreviewUrl) URL.revokeObjectURL(listingPreviewUrl);
    listingPreviewUrl = "";
    const image = document.getElementById("listing-image-preview-img");
    image.removeAttribute("src");
    image.alt = "";
    document.getElementById("listing-image-preview").hidden = true;
  }

  function makeButton(text, className, handler) {
    const button = element("button", className || "button secondary", text);
    button.type = "button";
    button.addEventListener("click", handler);
    return button;
  }

  function recordActivity(text) {
    state.activity.unshift({ id: createId("activity"), text: text });
    state.activity = state.activity.slice(0, 8);
  }

  function currentPlan() {
    return state.account && PLAN_LIMITS[state.account.membership] ? state.account.membership : "Free";
  }

  function collectionLimit() {
    return PLAN_LIMITS[currentPlan()].collection;
  }

  function collectionCount() {
    return state.collection.reduce(function (total, entry) {
      return total + Math.max(0, Number(entry.quantity) || 0);
    }, 0);
  }

  function listingLimit() {
    return PLAN_LIMITS[currentPlan()].listings;
  }

  function getMiniature(id) {
    return MINIATURES.find(function (miniature) { return miniature.id === id; }) || null;
  }

  function getCollectionEntry(id) {
    return state.collection.find(function (entry) { return entry.id === id; }) || null;
  }

  function getCombatant(id) {
    return state.combatants.find(function (combatant) { return combatant.id === id; }) || null;
  }

  function getCombatantMiniature(combatant) {
    if (!combatant) return null;
    return getCollectionEntry(combatant.collectionEntryId) ||
      getMiniature(combatant.miniatureId) ||
      combatant.miniatureSnapshot ||
      null;
  }

  function combatantName(combatant) {
    return combatant ? combatant.name : "Unknown combatant";
  }

  function sortedCombatants() {
    return state.combatants.slice().sort(function (a, b) {
      return Number(b.initiative) - Number(a.initiative);
    });
  }

  function sortEncounter() {
    const selectedId = state.combatants[state.turnIndex] && state.combatants[state.turnIndex].id;
    state.combatants = sortedCombatants();
    const selectedIndex = state.combatants.findIndex(function (combatant) { return combatant.id === selectedId; });
    state.turnIndex = selectedIndex < 0 ? 0 : selectedIndex;
  }

  function openCart() {
    const panel = document.getElementById("marketplace-cart");
    const backdrop = document.getElementById("cart-backdrop");
    panel.classList.add("cart-open");
    panel.setAttribute("aria-hidden", "false");
    backdrop.hidden = false;
  }

  function closeCart() {
    const panel = document.getElementById("marketplace-cart");
    const backdrop = document.getElementById("cart-backdrop");
    const toggle = document.getElementById("cart-toggle");
    panel.classList.remove("cart-open");
    panel.setAttribute("aria-hidden", "true");
    backdrop.hidden = true;
    if (toggle) toggle.setAttribute("aria-expanded", "false");
  }

  function showView() {
    let requested = (window.location.hash || "#dashboard").slice(1);
    if (requested === "collection") {
      requested = "database";
      window.history.replaceState(null, "", "#database");
    }
    if (requested === "database-browser" || requested === "my-collection") {
      window.setTimeout(function () {
        const target = document.getElementById(requested);
        if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 0);
      requested = "database";
    }
    const views = document.querySelectorAll("[data-view]");
    const exists = Array.prototype.some.call(views, function (view) { return view.id === requested; });
    const current = exists ? requested : "dashboard";
    views.forEach(function (view) { view.hidden = view.id !== current; });
    document.querySelectorAll("[data-nav]").forEach(function (link) {
      if (link.getAttribute("href") === "#" + current) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
    if (current !== "marketplace") closeCart();
    if (window.scrollTo) window.scrollTo(0, 0);
  }

  function setupCollectionOptions() {
    const sizeSelect = document.querySelector("#collection-form select[name='size']");
    SIZES.forEach(function (size) { sizeSelect.appendChild(new Option(size, size)); });
  }

  function renderDashboard() {
    const stats = document.getElementById("dashboard-stats");
    const cards = [
      ["Unique miniatures collected", state.collection.length],
      ["Miniatures owned", state.collection.reduce(function (total, entry) { return total + Number(entry.quantity || 0); }, 0)],
      ["Active combatants", state.combatants.length],
      ["Marketplace listings", MARKET_SAMPLE.length + state.marketListings.length]
    ];
    stats.replaceChildren.apply(stats, cards.map(function (item) {
      const card = element("article", "card stat-card");
      card.append(element("p", "muted", item[0]), element("strong", "", state.account ? String(item[1]) : ""));
      return card;
    }));
    const activityList = document.getElementById("activity-list");
    activityList.replaceChildren.apply(activityList, (state.account ? state.activity : []).map(function (item) {
      return element("li", "", item.text);
    }));
  }

  let editingCollectionId = "";
  function setCollectionFormOpen(isOpen, isEditing) {
    const form = document.getElementById("collection-form");
    const toggle = document.getElementById("create-miniature-toggle");
    if (isOpen) setMarketplaceImportOpen(false);
    form.hidden = !isOpen;
    toggle.hidden = Boolean(isEditing);
    toggle.textContent = isOpen ? "Close miniature form" : "Create new Miniature";
    toggle.setAttribute("aria-expanded", String(isOpen));
  }

  function setMarketplaceImportOpen(isOpen) {
    const panel = document.getElementById("marketplace-import-panel");
    const toggle = document.getElementById("marketplace-import-toggle");
    panel.hidden = !isOpen;
    toggle.textContent = isOpen ? "Close Marketplace Import" : "Import from Marketplace";
    toggle.setAttribute("aria-expanded", String(isOpen));
  }

  function resetCollectionForm() {
    editingCollectionId = "";
    const form = document.getElementById("collection-form");
    form.reset();
    form.querySelector("h2").textContent = "Create miniature";
    form.querySelector("button[type='submit']").textContent = "Create miniature";
    document.getElementById("cancel-collection-edit").hidden = true;
    setCollectionFormOpen(false, false);
  }

  function editCollectionEntry(id) {
    const entry = getCollectionEntry(id);
    if (!entry) return;
    editingCollectionId = id;
    const form = document.getElementById("collection-form");
    setCollectionFormOpen(true, true);
    form.elements.namedItem("image").value = "";
    ["name", "creatureType", "size", "gameSystem", "creator", "quantity", "paintingStatus", "notes"].forEach(function (field) {
      form.elements.namedItem(field).value = entry[field] || "";
    });
    form.querySelector("h2").textContent = "Edit " + entry.name;
    form.querySelector("button[type='submit']").textContent = "Save changes";
    document.getElementById("cancel-collection-edit").hidden = false;
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function renderCollection() {
    const limit = collectionLimit();
    document.getElementById("collection-capacity").textContent = state.account
      ? collectionCount() + " of " + (limit === 10000 ? "generous" : limit) + " miniatures used on your " + currentPlan() + " plan."
      : "";
    const query = document.getElementById("collection-search").value.trim().toLowerCase();
    const matches = (state.account ? state.collection : []).filter(function (entry) {
      return [entry.name, entry.creatureType, entry.size, entry.gameSystem, entry.creator, entry.paintingStatus, entry.notes].join(" ").toLowerCase().indexOf(query) !== -1;
    });
    const grid = document.getElementById("collection-grid");
    grid.replaceChildren.apply(grid, matches.map(function (entry) {
      const card = element("article", "card");
      const image = element("img", "collection-image");
      image.src = marketplaceImageSource(entry);
      image.alt = entry.name + " miniature";
      image.loading = "lazy";
      card.appendChild(image);
      card.append(
        element("span", "tag", entry.creatureType + " · " + entry.size),
        element("h2", "", entry.name),
        element("p", "muted small", entry.gameSystem + " · " + (entry.creator || "Personal design")),
        element("p", "", "Painting: " + entry.paintingStatus),
        element("p", "notes-text", entry.notes || "No notes yet.")
      );
      const quantity = element("div", "quantity-control");
      quantity.appendChild(makeButton("−", "button secondary small-button", function () {
        entry.quantity = Math.max(1, Number(entry.quantity || 1) - 1);
        saveState("Quantity updated.");
        renderAll();
      }));
      quantity.append(element("span", "", "Quantity: " + entry.quantity));
      quantity.appendChild(makeButton("+", "button secondary small-button", function () {
        if (Number(entry.quantity) >= 999) return notify("Quantity cannot exceed 999.", "error");
        if (collectionCount() >= collectionLimit()) return notify("Your " + currentPlan() + " plan has reached its collection limit. Upgrade your plan for more miniatures.", "error");
        entry.quantity = Number(entry.quantity || 1) + 1;
        saveState("Quantity updated.");
        renderAll();
      }));
      const actions = element("div", "action-links");
      actions.appendChild(makeButton("Edit", "button secondary", function () { editCollectionEntry(entry.id); }));
      actions.appendChild(makeButton("Delete", "button secondary danger-button", function () {
        requestConfirmation("Are you sure you want to remove " + entry.name + " from your collection?", function () {
          state.collection = state.collection.filter(function (item) { return item.id !== entry.id; });
          state.combatants.forEach(function (combatant) {
            if (combatant.collectionEntryId === entry.id) combatant.collectionEntryId = "";
          });
          if (editingCollectionId === entry.id) resetCollectionForm();
          recordActivity("Removed " + entry.name + " from your collection.");
          saveState("Removed " + entry.name + " from your collection.");
          renderAll();
        }, "Delete", true);
      }));
      card.append(quantity, actions);
      return card;
    }));
    const empty = document.getElementById("collection-empty");
    empty.textContent = state.account
      ? "Your collection is empty. Add a miniature above."
      : "Sign in to view your personal collection.";
    empty.hidden = matches.length > 0;
  }

  function renderMarketplaceImport() {
    const toggle = document.getElementById("marketplace-import-toggle");
    const select = document.querySelector("#marketplace-import-form [name='purchaseId']");
    const empty = document.getElementById("marketplace-import-empty");
    const submit = document.querySelector("#marketplace-import-form button[type='submit']");
    toggle.disabled = !state.account;
    toggle.title = state.account ? "" : "Sign in to import marketplace purchases.";
    if (!state.account) setMarketplaceImportOpen(false);

    const availablePurchases = state.purchases.filter(function (purchase) {
      return purchase.type === "Physical" || purchase.type === "Digital STL";
    });
    select.replaceChildren(new Option("Choose a purchase", ""));
    availablePurchases.forEach(function (purchase) {
      const importCount = state.collection.filter(function (entry) {
        return entry.purchaseId === purchase.id;
      }).length;
      select.appendChild(new Option(
        purchase.name + " · " + purchase.type + " · $" + Number(purchase.price).toFixed(2) +
          " · Added to collection " + importCount + (importCount === 1 ? " time" : " times"),
        purchase.id
      ));
    });
    select.disabled = availablePurchases.length === 0;
    empty.hidden = availablePurchases.length > 0;
    submit.disabled = !state.account || availablePurchases.length === 0;
  }

  function renderMiniatureOptions() {
    document.querySelectorAll(".combatant-form select[name='miniature']").forEach(function (select) {
      select.replaceChildren(new Option("No miniature", ""));
      const collectionGroup = document.createElement("optgroup");
      collectionGroup.label = "My collection";
      state.collection.forEach(function (entry) {
        collectionGroup.appendChild(new Option(entry.name + " (" + entry.quantity + ")", "collection|" + entry.id));
      });
      if (state.account && state.collection.length) select.appendChild(collectionGroup);
    });
  }

  function setPlayerFormOpen(open) {
    const panel = document.getElementById("player-form-panel");
    const toggle = document.getElementById("add-player-toggle");
    const isOpen = Boolean(open && state.account);
    panel.hidden = !isOpen;
    toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    toggle.textContent = isOpen ? "Close Add Player" : "Add Player";
  }

  function setCreatureFormOpen(open) {
    const panel = document.getElementById("creature-form-panel");
    const toggle = document.getElementById("add-creature-toggle");
    const isOpen = Boolean(open && state.account);
    panel.hidden = !isOpen;
    toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    toggle.textContent = isOpen ? "Close Add Creature" : "Add Creature";
  }

  function selectedCombatant(combatant) {
    state.selectedCombatantId = combatant ? combatant.id : null;
    renderCombatants();
    renderMap();
  }

  function changeHitPoints(combatant, amount) {
    combatant.hp = Math.max(0, Math.min(Number(combatant.maxHp), Number(combatant.hp) + amount));
    saveState(combatant.name + "'s hit points updated.");
    renderAll();
  }

  function renderCombatants() {
    const list = document.getElementById("combatant-list");
    const ordered = sortedCombatants();
    document.getElementById("round-number").textContent = state.account ? String(state.round) : "";
    const active = state.combatants[state.turnIndex];
    document.getElementById("turn-label").textContent = state.account
      ? (active ? combatantName(active) + "'s turn" : "No active combatants")
      : "";
    document.getElementById("next-turn").disabled = !state.account || state.combatants.length === 0;
    document.getElementById("save-encounter").disabled = !state.account;
    document.getElementById("load-encounter").disabled = !state.account;
    document.getElementById("encounter-name").disabled = !state.account;
    document.getElementById("saved-encounters").disabled = !state.account;
    document.getElementById("add-player-toggle").disabled = !state.account;
    document.getElementById("add-creature-toggle").disabled = !state.account;
    document.querySelectorAll(".combatant-form button[type='submit']").forEach(function (button) { button.disabled = !state.account; });
    if (!state.account) {
      setPlayerFormOpen(false);
      setCreatureFormOpen(false);
    }
    list.replaceChildren.apply(list, (state.account ? ordered : []).map(function (combatant) {
      const card = element("article", "card combatant-card" +
        (combatant.enemy ? " enemy-combatant" : "") +
        (combatant.id === (active && active.id) ? " current-turn" : "") +
        (combatant.id === state.selectedCombatantId ? " selected-combatant" : ""));
      const top = element("div", "combatant-heading");
      const identity = element("div");
      const selectButton = makeButton(combatant.name, "button text-button", function () {
        selectedCombatant(combatant);
        notify(combatant.name + " selected. Its map marker is highlighted when placed.");
      });
      identity.append(selectButton, element("p", "muted small", combatant.kind + " · Initiative " + combatant.initiative));
      identity.appendChild(element("p", "muted small", "Armor class: " + combatant.ac));
      const miniature = getCombatantMiniature(combatant);
      if (miniature) identity.appendChild(element("p", "muted small", "Miniature: " + miniature.name));
      if (combatant.enemy) identity.appendChild(element("span", "tag enemy-tag", "Enemy"));
      top.append(identity, element("span", "tag", combatant.id === (active && active.id) ? "Current turn" : "Round " + state.round));
      const health = element("div", "health-control");
      const hpInput = document.createElement("input");
      hpInput.type = "number";
      hpInput.min = "0";
      hpInput.max = String(combatant.maxHp);
      hpInput.value = String(combatant.hp);
      hpInput.setAttribute("aria-label", combatant.name + " current hit points");
      hpInput.addEventListener("change", function () {
        const hp = Number(hpInput.value);
        if (!Number.isInteger(hp) || hp < 0 || hp > Number(combatant.maxHp)) {
          notify("Hit points must be between 0 and " + combatant.maxHp + ".", "error");
          renderCombatants();
          return;
        }
        combatant.hp = hp;
        saveState(combatant.name + "'s hit points updated.");
        renderCombatants();
        renderMap();
      });
      health.append(
        makeButton("−", "button secondary small-button", function () { changeHitPoints(combatant, -1); }),
        hpInput,
        element("span", "", "/ " + combatant.maxHp + " HP"),
        makeButton("+", "button secondary small-button", function () { changeHitPoints(combatant, 1); })
      );
      const actions = element("div", "action-links");
      actions.appendChild(makeButton("Locate on map", "button secondary", function () {
        state.selectedCombatantId = combatant.id;
        renderCombatants();
        renderMap();
        window.location.hash = "#battle-map";
      }));
      actions.appendChild(makeButton("Remove", "button secondary danger-button", function () {
        requestConfirmation("Are you sure you want to remove " + combatant.name + " and its map marker from the encounter?", function () {
          const activeId = state.combatants[state.turnIndex] && state.combatants[state.turnIndex].id;
          const removedIndex = state.combatants.findIndex(function (item) { return item.id === combatant.id; });
          state.combatants = state.combatants.filter(function (item) { return item.id !== combatant.id; });
          state.mapMarkers = state.mapMarkers.filter(function (marker) { return marker.combatantId !== combatant.id; });
          if (activeId && activeId !== combatant.id) {
            state.turnIndex = state.combatants.findIndex(function (item) { return item.id === activeId; });
          } else {
            state.turnIndex = Math.min(removedIndex, Math.max(0, state.combatants.length - 1));
          }
          state.selectedCombatantId = state.combatants[state.turnIndex] ? state.combatants[state.turnIndex].id : null;
          saveState(combatant.name + " removed from the encounter.");
          renderAll();
        }, "Remove", true);
      }));
      card.append(top, health, actions);
      return card;
    }));
    const empty = document.getElementById("combatant-empty");
    empty.textContent = state.account ? "No combatants yet. Add a player or creature to begin." : "Sign in to view your initiative tracker.";
    empty.hidden = state.account && state.combatants.length > 0;
    renderMiniatureOptions();
    renderEncounterOptions();
  }

  function renderEncounterOptions() {
    const select = document.getElementById("saved-encounters");
    const previous = select.value;
    select.replaceChildren(new Option("Choose a saved encounter", ""));
    if (state.account) {
      state.savedEncounters.forEach(function (encounter) { select.appendChild(new Option(encounter.name, encounter.id)); });
    }
    if (state.savedEncounters.some(function (encounter) { return encounter.id === previous; })) select.value = previous;
    document.getElementById("encounter-name").value = state.account ? state.encounterName || "Untitled encounter" : "";
  }

  function saveEncounter() {
    const name = document.getElementById("encounter-name").value.trim();
    if (!name) return notify("Give this encounter a name before saving.", "error");
    if (!state.combatants.length) return notify("Add at least one combatant before saving an encounter.", "error");
    const existing = state.savedEncounters.find(function (encounter) { return encounter.name.toLowerCase() === name.toLowerCase(); });
    const snapshot = {
      id: existing ? existing.id : createId("encounter"),
      name: name,
      combatants: state.combatants.map(function (combatant) { return Object.assign({}, combatant); }),
      round: state.round,
      currentCombatantId: state.combatants[state.turnIndex] ? state.combatants[state.turnIndex].id : null,
      mapMarkers: state.mapMarkers.map(function (marker) { return Object.assign({}, marker); }),
      gridEnabled: state.gridEnabled
    };
    if (existing) state.savedEncounters = state.savedEncounters.map(function (encounter) { return encounter.id === existing.id ? snapshot : encounter; });
    else state.savedEncounters.push(snapshot);
    state.encounterName = name;
    recordActivity("Saved the \"" + name + "\" encounter.");
    saveState("Encounter \"" + name + "\" saved on this device.");
    renderAll();
  }

  function loadEncounter() {
    const id = document.getElementById("saved-encounters").value;
    const encounter = state.savedEncounters.find(function (item) { return item.id === id; });
    if (!encounter) return notify("Choose a saved encounter to load.", "error");
    state.encounterName = encounter.name;
    state.combatants = encounter.combatants.map(function (combatant) { return Object.assign({}, combatant); });
    state.round = Math.max(1, Number(encounter.round) || 1);
    state.turnIndex = Math.max(0, state.combatants.findIndex(function (combatant) { return combatant.id === encounter.currentCombatantId; }));
    state.mapMarkers = Array.isArray(encounter.mapMarkers) ? encounter.mapMarkers.map(function (marker) { return Object.assign({}, marker); }) : [];
    state.gridEnabled = Boolean(encounter.gridEnabled);
    state.selectedCombatantId = state.combatants[state.turnIndex] ? state.combatants[state.turnIndex].id : null;
    sortEncounter();
    saveState("Loaded encounter \"" + encounter.name + "\".");
    renderAll();
  }

  function renderMapSourceOptions() {
    const select = document.getElementById("map-source");
    const options = [
      new Option("Grasslands (built-in)", "grasslands"),
      new Option("Upload a PDF", "pdf")
    ];
    if (state.account) {
      getPurchasedBattlemapListings().forEach(function (listing) {
        options.push(new Option(listing.name, listing.id));
      });
    }
    select.replaceChildren.apply(select, options);
    select.value = state.account ? state.mapSource : "grasslands";
  }

  function renderMap() {
    const surface = document.getElementById("map-surface");
    const mapLayout = document.getElementById("map-layout");
    const grasslands = document.getElementById("grasslands-map");
    const marketplaceMapImage = document.getElementById("marketplace-battlemap");
    const placeholder = document.getElementById("map-placeholder");
    const frame = document.getElementById("map-pdf");
    const mapGrid = document.getElementById("map-grid");
    const mapSource = document.getElementById("map-source");
    const pdfMapControl = document.getElementById("pdf-map-control");
    const mapUpload = document.getElementById("map-upload");
    const fullscreenButton = document.getElementById("fullscreen-map");
    const fullscreenExit = document.getElementById("fullscreen-exit");
    const gridButton = document.getElementById("toggle-grid");
    const markerSelect = document.getElementById("marker-combatant");
    const markerSubmit = document.querySelector("#marker-form button[type='submit']");
    const layer = document.getElementById("marker-layer");
    const legend = document.getElementById("map-legend");
    const legendList = document.getElementById("map-legend-list");
    const mapMessage = document.getElementById("map-message");
    renderFullscreenTurnControl();
    let purchasedMap = getPurchasedBattlemapListing(state.mapSource);
    if (state.mapSource !== "grasslands" && state.mapSource !== "pdf" && !purchasedMap) {
      state.mapSource = state.mapFileName ? "pdf" : "grasslands";
      purchasedMap = null;
    }
    renderMapSourceOptions();
    mapSource.disabled = !state.account;
    pdfMapControl.hidden = !state.account || state.mapSource !== "pdf";
    mapUpload.disabled = !state.account || state.mapSource !== "pdf";
    fullscreenButton.disabled = !state.account || !document.fullscreenEnabled || typeof mapLayout.requestFullscreen !== "function";
    gridButton.disabled = !state.account;
    markerSelect.disabled = !state.account;
    markerSubmit.disabled = !state.account;
    gridButton.setAttribute("aria-pressed", state.gridEnabled ? "true" : "false");
    gridButton.textContent = state.gridEnabled ? "Hide grid" : "Show grid";
    fullscreenButton.setAttribute("aria-pressed", document.fullscreenElement === mapLayout ? "true" : "false");
    fullscreenExit.hidden = document.fullscreenElement !== mapLayout;
    if (!state.account) {
      grasslands.hidden = true;
      marketplaceMapImage.hidden = true;
      frame.hidden = true;
      placeholder.hidden = true;
      mapGrid.hidden = true;
      layer.replaceChildren();
      legendList.replaceChildren();
      legend.hidden = true;
      mapMessage.textContent = "Sign in to view your battle map.";
      renderMarkerOptions();
      return;
    }
    mapGrid.hidden = !state.gridEnabled;
    if (state.mapSource === "grasslands") {
      grasslands.hidden = false;
      marketplaceMapImage.hidden = true;
      frame.hidden = true;
      placeholder.hidden = true;
    } else if (purchasedMap) {
      grasslands.hidden = true;
      if (marketplaceMapImage.getAttribute("src") !== purchasedMap.mapAsset) {
        marketplaceMapImage.setAttribute("src", purchasedMap.mapAsset);
      }
      marketplaceMapImage.alt = purchasedMap.name + " battlemap";
      marketplaceMapImage.hidden = false;
      frame.hidden = true;
      placeholder.hidden = true;
    } else {
      grasslands.hidden = true;
      marketplaceMapImage.hidden = true;
      if (uploadedMapUrl) {
        if (frame.src !== uploadedMapUrl) frame.src = uploadedMapUrl;
        frame.hidden = false;
        placeholder.hidden = true;
      } else {
        frame.hidden = true;
        placeholder.hidden = false;
        placeholder.replaceChildren(
          element("strong", "", state.mapFileName ? "Re-select your PDF map" : "Your cavern awaits"),
          element("span", "", state.mapFileName
            ? "The selected file \"" + state.mapFileName + "\" is not stored. Choose it again above to display it."
            : "Upload a PDF to display your battle map. Markers can be placed on this surface in the meantime.")
        );
      }
    }
    layer.replaceChildren();
    legendList.replaceChildren();
    let markerNumber = 0;
    state.mapMarkers.forEach(function (marker) {
      const combatant = getCombatant(marker.combatantId);
      if (!combatant) return;
      markerNumber += 1;
      const button = element("button", "map-marker" +
        (combatant.kind === "Player" ? " player-marker" : "") +
        (combatant.id === state.selectedCombatantId ? " marker-selected" : ""));
      button.type = "button";
      button.style.left = Math.max(0, Math.min(100, Number(marker.x))) + "%";
      button.style.top = Math.max(0, Math.min(100, Number(marker.y))) + "%";
      button.setAttribute("aria-label", "Marker " + markerNumber + ". See the map legend for details. Select or drag marker.");
      button.appendChild(element("span", "map-marker-token", String(markerNumber)));
      const legendEntry = element("li", "map-legend-entry" + (combatant.id === state.selectedCombatantId ? " legend-selected" : ""));
      const legendToken = element("span", "map-legend-token" +
        (combatant.kind === "Player" ? " player-marker" : ""), String(markerNumber));
      legendToken.setAttribute("aria-hidden", "true");
      legendEntry.append(legendToken, element("span", "", combatant.name + " (" + combatant.kind + ") · Initiative " + combatant.initiative + " · AC " + combatant.ac + " · " + combatant.hp + "/" + combatant.maxHp + " HP"));
      legendList.appendChild(legendEntry);
      let pointerStart = null;
      let wasDragged = false;
      button.addEventListener("pointerdown", function (event) {
        if (event.button !== 0) return;
        event.preventDefault();
        pointerStart = { x: event.clientX, y: event.clientY };
        wasDragged = false;
        button.setPointerCapture(event.pointerId);
      });
      button.addEventListener("pointermove", function (event) {
        if (!pointerStart || !button.hasPointerCapture(event.pointerId)) return;
        const rect = surface.getBoundingClientRect();
        const dx = event.clientX - pointerStart.x;
        const dy = event.clientY - pointerStart.y;
        if (Math.abs(dx) + Math.abs(dy) > 3) wasDragged = true;
        const x = Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100));
        const y = Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100));
        marker.x = x;
        marker.y = y;
        button.style.left = x + "%";
        button.style.top = y + "%";
      });
      button.addEventListener("pointerup", function (event) {
        if (!pointerStart) return;
        pointerStart = null;
        if (wasDragged) {
          button.suppressNextClick = true;
          saveState("Map marker moved.");
          window.setTimeout(function () { button.suppressNextClick = false; }, 0);
        }
        if (button.hasPointerCapture(event.pointerId)) button.releasePointerCapture(event.pointerId);
      });
      button.addEventListener("pointercancel", function () { pointerStart = null; });
      button.addEventListener("click", function () {
        if (button.suppressNextClick) return;
        state.selectedCombatantId = combatant.id;
        renderCombatants();
        renderMap();
        notify("Map marker selected. See the legend for details.");
      });
      layer.appendChild(button);
    });
    legend.hidden = markerNumber === 0;
    const selected = getCombatant(state.selectedCombatantId);
    const marker = state.mapMarkers.find(function (item) { return selected && item.combatantId === selected.id; });
    mapMessage.textContent = selected
      ? marker
        ? "Selected marker. See the legend for details."
        : "Selected combatant has no map marker. Add one above to place it on the map."
      : "Select a combatant in the initiative tracker or place a marker.";
    if (selected && marker) {
      const link = document.createElement("a");
      link.href = "#initiative";
      link.className = "map-jump";
      link.textContent = " View initiative entry";
      mapMessage.appendChild(link);
    }
    renderMarkerOptions();
  }

  function renderFullscreenTurnControl() {
    const mapLayout = document.getElementById("map-layout");
    const control = document.getElementById("fullscreen-turn-control");
    const active = state.combatants[state.turnIndex];
    control.hidden = !state.account || document.fullscreenElement !== mapLayout;
    document.getElementById("fullscreen-turn-label").textContent = active
      ? combatantName(active) + "'s turn · Round " + state.round
      : "No active combatants";
    document.getElementById("fullscreen-end-turn").disabled = !state.account || state.combatants.length === 0;
    const hpInput = document.getElementById("fullscreen-hp");
    const acInput = document.getElementById("fullscreen-ac");
    hpInput.value = active ? String(active.hp) : "";
    hpInput.max = active ? String(active.maxHp) : "";
    hpInput.disabled = !state.account || !active;
    acInput.value = active ? String(active.ac) : "";
    acInput.disabled = !state.account || !active;
  }

  function renderMarkerOptions() {
    const select = document.getElementById("marker-combatant");
    if (!state.account) {
      select.replaceChildren(new Option("Sign in to view map markers", ""));
      document.querySelector("#marker-form button[type='submit']").disabled = true;
      return;
    }
    const used = state.mapMarkers.map(function (marker) { return marker.combatantId; });
    const available = sortedCombatants().filter(function (combatant) { return used.indexOf(combatant.id) === -1; });
    select.replaceChildren(new Option(available.length ? "Choose a combatant" : "No unplaced combatants", ""));
    available.forEach(function (combatant) { select.appendChild(new Option(combatant.name, combatant.id)); });
    document.querySelector("#marker-form button[type='submit']").disabled = available.length === 0;
  }

  function getListingQuantity(item) {
    if (item.type !== "Physical") return null;
    const isSample = MARKET_SAMPLE.some(function (sample) { return sample.id === item.id; });
    const savedQuantity = isSample && Object.prototype.hasOwnProperty.call(state.marketInventory, item.id)
      ? Number(state.marketInventory[item.id])
      : Number(item.quantity);
    if (Number.isInteger(savedQuantity) && savedQuantity >= 0) return savedQuantity;
    return isSample ? Number(item.quantity) : 0;
  }

  function findBattlemapListing(listingId) {
    return MARKET_SAMPLE.find(function (item) { return item.id === listingId && item.type === "Battlemap"; }) || null;
  }

  function getPurchasedBattlemapListing(listingId) {
    const listing = findBattlemapListing(listingId);
    return listing && state.purchasedDigitalListingIds.indexOf(listingId) !== -1 ? listing : null;
  }

  function getPurchasedBattlemapListings() {
    return MARKET_SAMPLE.filter(function (item) {
      return item.type === "Battlemap" && state.purchasedDigitalListingIds.indexOf(item.id) !== -1;
    });
  }

  function hasPurchasedDigitalListing(item) {
    return (item.type === "Digital STL" || item.type === "Battlemap") &&
      state.purchasedDigitalListingIds.indexOf(item.id) !== -1;
  }

  function setListingQuantity(item, quantity) {
    const isSample = MARKET_SAMPLE.some(function (sample) { return sample.id === item.id; });
    if (isSample) state.marketInventory[item.id] = quantity;
    else {
      const listing = state.marketListings.find(function (candidate) { return candidate.id === item.id; });
      if (listing) listing.quantity = quantity;
    }
  }

  function syncListingQuantityField() {
    const form = document.getElementById("listing-form");
    const quantityField = form.elements.namedItem("quantity");
    const isPhysical = form.elements.namedItem("type").value === "Physical";
    quantityField.closest("label").hidden = !isPhysical;
    quantityField.disabled = !isPhysical;
    quantityField.required = isPhysical;
  }

  function findMarketplaceListing(listingId) {
    return MARKET_SAMPLE.concat(state.marketListings).find(function (item) {
      return item.id === listingId;
    }) || null;
  }

  function getPurchaseBlockMessage(item) {
    if (!state.account) return "Sign in to purchase marketplace listings.";
    if ((item.owner || item.seller) === state.account.name) return "You cannot purchase your own listing.";
    if (hasPurchasedDigitalListing(item)) return "You already purchased this digital STL.";
    if (item.type === "Physical" && getListingQuantity(item) < 1) return "Sold out.";
    return "";
  }

  function addToCart(item) {
    const blockMessage = getPurchaseBlockMessage(item);
    if (blockMessage) return notify(blockMessage, "error");
    if (state.cart.indexOf(item.id) !== -1) {
      return notify(item.name + " is already in your cart.", "error");
    }
    state.cart.push(item.id);
    saveState(item.name + " added to your cart.");
    const dialog = document.getElementById("marketplace-detail-dialog");
    if (dialog.open) dialog.close();
    renderAll();
  }

  function simulatePurchase(item) {
    const blockMessage = getPurchaseBlockMessage(item);
    if (blockMessage) {
      notify(blockMessage, "error");
      return false;
    }
    const quantity = getListingQuantity(item);
    if (item.type === "Physical" && quantity < 1) {
      const dialog = document.getElementById("marketplace-detail-dialog");
      if (dialog.open) dialog.close();
      renderAll();
      notify("This physical listing is out of stock.", "error");
      return false;
    }
    const remaining = item.type === "Physical" ? quantity - 1 : null;
    if (remaining !== null) {
      setListingQuantity(item, remaining);
    }
    if ((item.type === "Digital STL" || item.type === "Battlemap") &&
        state.purchasedDigitalListingIds.indexOf(item.id) === -1) {
      state.purchasedDigitalListingIds.push(item.id);
    }
    state.purchases.unshift({
      id: createId("purchase"),
      listingId: item.id,
      name: item.name,
      type: item.type,
      price: Number(item.price),
      quantity: 1,
      description: item.description,
      seller: item.owner || item.seller,
      mapAsset: item.mapAsset,
      purchasedAt: new Date().toISOString()
    });
    const soldOut = item.type === "Physical" && remaining === 0;
    recordActivity("Simulated a purchase of \"" + item.name + "\". No payment was processed." +
      (soldOut ? " The listing is now sold out." : ""));
    saveState("Demo purchase recorded for \"" + item.name + "\". No payment was processed." +
      (soldOut ? " The listing is now sold out." : ""));
    const dialog = document.getElementById("marketplace-detail-dialog");
    if (dialog.open) dialog.close();
    renderAll();
    return true;
  }

  function openListingDetails(item) {
    const dialog = document.getElementById("marketplace-detail-dialog");
    const content = document.getElementById("marketplace-detail-content");
    document.getElementById("marketplace-detail-title").textContent = item.name;
    const layout = element("div", "marketplace-detail-layout");
    const image = element("img", "marketplace-detail-image");
    image.src = marketplaceImageSource(item);
    image.alt = item.name + " listing image";
    layout.appendChild(image);

    const details = element("div", "marketplace-detail-info");
    details.append(
      element("span", "tag", item.type),
      element("p", "price marketplace-price", "$" + Number(item.price).toFixed(2)),
      element("p", "", item.description),
      element("p", "muted small", "Seller: " + (item.owner || item.seller))
    );
    if (item.type === "Physical") {
      const quantity = getListingQuantity(item);
      details.appendChild(element("p", "muted small", quantity > 0 ? quantity + " available" : "Sold out"));
    } else {
      details.appendChild(element("p", "muted small", "Digital download"));
    }
    if (item.reviews) {
      details.appendChild(element("p", "review", "★ " + item.rating + "/5 · " + item.reviews + " fictional reviews"));
      if (item.review) details.appendChild(element("p", "muted", "“" + item.review + "”"));
    } else {
      details.appendChild(element("p", "muted small", "No reviews yet · fictional listing"));
    }

    const actions = element("div", "action-links");
    const alreadyPurchased = hasPurchasedDigitalListing(item);
    const isOwnListing = Boolean(state.account && (item.owner || item.seller) === state.account.name);
    const soldOut = item.type === "Physical" && getListingQuantity(item) < 1;
    const purchaseButton = makeButton(soldOut ? "Sold Out" : (alreadyPurchased ? "Purchased" : "Add To Cart 🛒"), "button", function () { addToCart(item); });
    if (soldOut) {
      purchaseButton.disabled = true;
      purchaseButton.title = "Sold out.";
    } else if (isOwnListing) {
      purchaseButton.disabled = true;
      purchaseButton.title = "You cannot purchase your own listing.";
      details.appendChild(element("p", "muted small", "You cannot purchase your own listing."));
    } else if (alreadyPurchased) {
      purchaseButton.disabled = true;
      purchaseButton.title = "This digital STL is already in your purchases.";
      details.appendChild(element("p", "muted small", "This digital STL is already in your purchases."));
    }
    actions.appendChild(purchaseButton);
    details.appendChild(actions);
    layout.appendChild(details);
    content.replaceChildren(layout);
    dialog.showModal();
  }

  function renderMarketplace() {
    syncListingQuantityField();
    const query = document.getElementById("market-search").value.trim().toLowerCase();
    const type = document.getElementById("market-type").value;
    document.querySelector("#listing-form [name='seller']").value = state.account ? state.account.name : "";
    const items = MARKET_SAMPLE.concat(state.marketListings).filter(function (item) {
      return (type === "all" || item.type === type) &&
        [item.name, item.type, item.owner || item.seller, item.description].join(" ").toLowerCase().indexOf(query) !== -1;
    });
    document.getElementById("market-count").textContent = state.account ? items.length + " listing(s)" : "";
    const grid = document.getElementById("market-grid");
    grid.replaceChildren.apply(grid, items.map(function (item) {
      const card = element("article", "card marketplace-card");
      const productLink = element("a", "marketplace-product-link");
      productLink.href = "#marketplace";
      productLink.setAttribute("aria-haspopup", "dialog");
      productLink.setAttribute("aria-label", "View listing details for " + item.name);
      productLink.addEventListener("click", function (event) {
        event.preventDefault();
        openListingDetails(item);
      });
      const image = element("img", "marketplace-image");
      image.src = marketplaceImageSource(item);
      image.alt = item.name + " listing image";
      image.loading = "lazy";
      productLink.appendChild(image);
      const content = element("div", "marketplace-card-content");
      content.append(
        element("span", "tag", item.type),
        element("h2", "", item.name),
        element("p", "price marketplace-price", "$" + Number(item.price).toFixed(2)),
        element("p", "marketplace-description", item.description),
        element("p", "muted small", "Seller: " + (item.owner || item.seller))
      );
      if (item.type === "Physical") {
        const quantity = getListingQuantity(item);
        content.appendChild(element("p", "muted small", quantity > 0 ? quantity + " available" : "Sold out"));
      }
      if (item.reviews) {
        content.append(element("p", "review", "★ " + item.rating + "/5 · " + item.reviews + " fictional reviews"),
          element("p", "muted small", "“" + item.review + "”"));
      } else {
        content.appendChild(element("p", "muted small", "No reviews yet · fictional listing"));
      }
      productLink.appendChild(content);
      card.appendChild(productLink);
      const actions = element("div", "action-links");
      const ownListing = state.marketListings.find(function (listing) { return listing.id === item.id; });
      const isOwnListing = Boolean(state.account && (item.owner || item.seller) === state.account.name);
      const alreadyPurchased = hasPurchasedDigitalListing(item);
      const soldOut = item.type === "Physical" && getListingQuantity(item) < 1;
      const purchaseButton = makeButton(soldOut ? "Sold Out" : (alreadyPurchased ? "Purchased" : "Add To Cart 🛒"), "button", function () { addToCart(item); });
      if (soldOut) {
        purchaseButton.disabled = true;
        purchaseButton.title = "Sold out.";
      } else if (isOwnListing) {
        purchaseButton.disabled = true;
        purchaseButton.title = "You cannot purchase your own listing.";
        actions.appendChild(element("span", "muted small", "You cannot purchase your own listing."));
      } else if (alreadyPurchased) {
        purchaseButton.disabled = true;
        purchaseButton.title = "This digital STL is already in your purchases.";
        actions.appendChild(element("span", "muted small", "Already purchased."));
      }
      actions.appendChild(purchaseButton);
      if (ownListing && state.account) {
        actions.appendChild(makeButton("Edit", "button secondary", function () { editListing(item.id); }));
        actions.appendChild(makeButton("Remove", "button secondary danger-button", function () {
          requestConfirmation("Are you sure you want to remove your listing \"" + item.name + "\"?", function () {
            state.marketListings = state.marketListings.filter(function (listing) { return listing.id !== item.id; });
            recordActivity("Removed the marketplace listing \"" + item.name + "\".");
            saveState("Listing removed.");
            renderAll();
          }, "Remove", true);
        }));
      }
      card.appendChild(actions);
      return card;
    }));
    document.getElementById("market-empty").hidden = items.length > 0;
    const limit = listingLimit();
    const limitText = limit === Infinity ? "unlimited" : String(limit);
    document.getElementById("listing-capacity").textContent =
      state.marketListings.length + " of " + limitText + " active listings used on your " + currentPlan() + " plan.";
    const isEditing = Boolean(document.querySelector("#listing-form [name='listingId']").value);
    const submit = document.querySelector("#listing-form button[type='submit']");
    submit.disabled = !state.account || (!isEditing && state.marketListings.length >= limit);
    submit.title = !state.account ? "Sign in to create a listing." : (!isEditing && state.marketListings.length >= limit ? "Your plan has reached its active listing limit." : "");
    if (!state.account) document.getElementById("listing-capacity").textContent += " Sign in to manage your listings.";
  }

  function setListingFormOpen(isOpen, isEditing) {
    const form = document.getElementById("listing-form");
    const toggle = document.getElementById("create-listing-toggle");
    if (isOpen) closePurchaseHistory();
    form.hidden = !isOpen;
    toggle.hidden = Boolean(isEditing);
    toggle.textContent = isOpen ? "Close listing form" : "Create listing";
    toggle.setAttribute("aria-expanded", String(isOpen));
  }

  function closePurchaseHistory() {
    const panel = document.getElementById("purchase-history-panel");
    const toggle = document.getElementById("purchase-history-toggle");
    panel.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
    toggle.textContent = "Open purchases";
    toggle.classList.remove("is-open");
  }

  function resetListingForm() {
    const form = document.getElementById("listing-form");
    form.reset();
    clearListingImagePreview();
    form.elements.namedItem("listingId").value = "";
    document.getElementById("listing-form-title").textContent = "Create a listing";
    form.querySelector("button[type='submit']").textContent = "Publish listing";
    document.getElementById("cancel-listing-edit").hidden = true;
    setListingFormOpen(false, false);
    renderMarketplace();
  }

  function editListing(id) {
    if (!state.account) return notify("Sign in to edit your listings.", "error");
    const item = state.marketListings.find(function (listing) { return listing.id === id; });
    if (!item) return;
    const form = document.getElementById("listing-form");
    setListingFormOpen(true, true);
    clearListingImagePreview();
    form.elements.namedItem("image").value = "";
    ["listingId", "name", "type", "price", "description"].forEach(function (field) {
      form.elements.namedItem(field).value = item[field];
    });
    form.elements.namedItem("quantity").value = item.type === "Physical" ? item.quantity : 1;
    syncListingQuantityField();
    showListingImagePreview(item.imageData || generatedListingImage(item), item.name + " listing image preview");
    form.elements.namedItem("seller").value = state.account.name;
    document.getElementById("listing-form-title").textContent = "Edit listing";
    form.querySelector("button[type='submit']").textContent = "Save listing";
    document.getElementById("cancel-listing-edit").hidden = false;
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function importPurchasedBattlemap(purchase) {
    if (!state.account) return notify("Sign in to import a purchased battlemap.", "error");
    const listing = getPurchasedBattlemapListing(purchase.listingId);
    if (purchase.type !== "Battlemap" || !listing || listing.mapAsset !== purchase.mapAsset) {
      return notify("This battlemap is not in your purchases.", "error");
    }
    state.mapSource = listing.id;
    recordActivity("Imported the \"" + listing.name + "\" battlemap.");
    saveState("\"" + listing.name + "\" imported to the battle map.");
    renderAll();
    window.location.hash = "#battle-map";
  }

  function renderPurchaseHistory() {
    const toggle = document.getElementById("purchase-history-toggle");
    const panel = document.getElementById("purchase-history-panel");
    const list = document.getElementById("purchase-history-list");
    const empty = document.getElementById("purchase-history-empty");
    toggle.disabled = !state.account;
    toggle.title = state.account ? "" : "Sign in to view your purchases.";
    list.replaceChildren();
    if (!state.account) {
      panel.hidden = true;
      toggle.setAttribute("aria-expanded", "false");
      empty.hidden = true;
      return;
    }

    state.purchases.forEach(function (purchase) {
      const currentListing = MARKET_SAMPLE.concat(state.marketListings).find(function (item) {
        return item.id === purchase.listingId;
      });
      const quantity = Number(purchase.quantity);
      const count = Number.isSafeInteger(quantity) && quantity > 0 ? quantity : 1;
      const purchasedAt = new Date(purchase.purchasedAt);
      const date = Number.isNaN(purchasedAt.getTime()) ? "" : ": " + purchasedAt.toLocaleDateString();
      const card = element("article", "card marketplace-card");
      const image = element("img", "marketplace-image");
      const imageItem = Object.assign({}, currentListing || {}, purchase, {
        id: purchase.listingId || purchase.id,
        mapAsset: purchase.mapAsset || (currentListing && currentListing.mapAsset)
      });
      image.src = marketplaceImageSource(imageItem);
      image.alt = purchase.name + " listing image";
      image.loading = "lazy";
      card.appendChild(image);
      const content = element("div", "marketplace-card-content");
      content.append(
        element("span", "tag", purchase.type),
        element("h2", "", purchase.name),
        element("p", "price marketplace-price", "$" + Number(purchase.price).toFixed(2)),
        element("p", "marketplace-description", purchase.description || (currentListing && currentListing.description) || "Purchased marketplace item."),
        element("p", "muted small", "Quantity: " + count),
        element("p", "muted small", "Purchased" + date + " · demo only")
      );
      const seller = purchase.seller || (currentListing && (currentListing.owner || currentListing.seller));
      if (seller) content.appendChild(element("p", "muted small", "Seller: " + seller));
      if (purchase.type === "Battlemap") {
        const listing = getPurchasedBattlemapListing(purchase.listingId);
        if (listing && listing.mapAsset === purchase.mapAsset) {
          const actions = element("div", "action-links");
          const isActive = state.mapSource === listing.id;
          const importButton = makeButton(isActive ? "On battle map" : "Import to battle map", "button secondary", function () {
            importPurchasedBattlemap(purchase);
          });
          importButton.disabled = isActive;
          actions.appendChild(importButton);
          content.appendChild(actions);
        }
      }
      card.appendChild(content);
      list.appendChild(card);
    });
    const hasPurchases = state.purchases.length > 0;
    list.hidden = !hasPurchases;
    empty.hidden = hasPurchases;
  }

  function renderCart() {
    const toggle = document.getElementById("cart-toggle");
    const panel = document.getElementById("marketplace-cart");
    const list = document.getElementById("marketplace-cart-list");
    const empty = document.getElementById("marketplace-cart-empty");
    const completeButton = document.getElementById("complete-cart-purchase");
    const total = document.getElementById("marketplace-cart-total");
    const validCartIds = state.cart.filter(function (listingId, index, cart) {
      return Boolean(findMarketplaceListing(listingId)) && cart.indexOf(listingId) === index;
    });
    if (validCartIds.length !== state.cart.length) state.cart = validCartIds;
    toggle.textContent = "🛒 Cart (" + state.cart.length + ")";
    toggle.disabled = !state.account;
    toggle.title = state.account ? "" : "Sign in to view your cart.";
    const hasBlockedCartItem = state.cart.some(function (listingId) {
      const item = findMarketplaceListing(listingId);
      return item && getPurchaseBlockMessage(item);
    });
    completeButton.disabled = !state.account || state.cart.length === 0 || hasBlockedCartItem;
    completeButton.title = hasBlockedCartItem ? "Remove unavailable items before completing your purchase." : "";
    list.replaceChildren();
    state.cart.forEach(function (listingId) {
      const item = findMarketplaceListing(listingId);
      if (!item) return;
      const row = element("article", "card marketplace-card");
      const content = element("div", "marketplace-card-content");
      content.append(
        element("span", "tag", item.type),
        element("h2", "", item.name),
        element("p", "price marketplace-price", "$" + Number(item.price).toFixed(2)),
        element("p", "muted small", "Quantity: 1")
      );
      if (item.type === "Physical" && getListingQuantity(item) < 1) {
        content.appendChild(element("p", "muted small", "Sold out"));
      }
      const actions = element("div", "action-links");
      actions.appendChild(makeButton("Remove", "button secondary danger-button", function () {
        state.cart = state.cart.filter(function (id) { return id !== listingId; });
        saveState(item.name + " removed from your cart.");
        renderAll();
      }));
      content.appendChild(actions);
      row.appendChild(content);
      list.appendChild(row);
    });
    const cartTotal = state.cart.reduce(function (sum, listingId) {
      const item = findMarketplaceListing(listingId);
      return sum + (item ? Number(item.price) : 0);
    }, 0);
    total.textContent = "$" + cartTotal.toFixed(2);
    list.hidden = state.cart.length === 0;
    empty.hidden = state.cart.length > 0;
  }

  function renderMembership() {
    const plan = currentPlan();
    const current = document.getElementById("current-plan");
    if (!state.account) {
      current.replaceChildren(
        element("strong", "", "Signed out"),
        element("p", "muted", "No membership is active. Sign in or create a profile to choose a plan.")
      );
    } else {
      current.replaceChildren(element("strong", "", "Current plan: " + plan));
      current.appendChild(element("p", "muted", "Collection: " + collectionCount() + "/" + (PLAN_LIMITS[plan].collection === 10000 ? "generous" : PLAN_LIMITS[plan].collection) +
        " · Active marketplace listings: " + state.marketListings.length + "/" + (PLAN_LIMITS[plan].listings === Infinity ? "unlimited" : PLAN_LIMITS[plan].listings)));
    }
    const plans = [
      { name: "Free", price: "Free", collection: "Save up to 20 miniatures", listings: "2 active marketplace listings" },
      { name: "Creator", price: "4.99 CAD", collection: "Save up to 100 miniatures", listings: "10 active marketplace listings" },
      { name: "Creator Pro", price: "12.99 CAD", collection: "Generous collection storage", listings: "Unlimited active marketplace listings" }
    ];
    const grid = document.getElementById("plan-grid");
    grid.replaceChildren.apply(grid, plans.map(function (item) {
      const card = element("article", "card plan-card");
      card.append(element("span", "tag", item.price), element("h2", "", item.name), element("p", "", item.collection), element("p", "", item.listings));
      const button = makeButton(state.account && item.name === plan ? "Current plan" : "Choose " + item.name, "button secondary", function () {
        if (!state.account) {
          notify("Sign in to the BSAD 281 Demo account before changing membership.", "error");
          window.location.hash = "#account";
          return;
        }
        state.account.membership = item.name;
        recordActivity("Changed membership to " + item.name + " (simulated).");
        saveState(item.name === "Free" ? "Free plan selected." : item.name + " plan activated for this demo. No payment was taken.");
        renderAll();
      });
      if (state.account && item.name === plan) button.disabled = true;
      card.appendChild(button);
      return card;
    }));
  }

  function renderAccount() {
    const panel = document.getElementById("account-panel");
    panel.replaceChildren();
    if (!state.account) {
      panel.append(element("h2", "", "Welcome, adventurer"), element("p", "", "Sign in to the BSAD 281 Demo account. No passwords, email addresses, or payments are used."));
      panel.appendChild(makeButton("Continue as BSAD 281 Demo account", "button", function () {
        state.account = { name: "BSAD 281 Demo account", membership: "Free", kind: "demo" };
        recordActivity("Signed in to the fictional demo account.");
        saveState("Signed in to the BSAD 281 Demo account.");
        renderAll();
      }));
      const form = document.createElement("form");
      form.id = "profile-form";
      form.className = "profile-form";
      const label = element("label", "", "Fictional local profile display name");
      const input = document.createElement("input");
      input.name = "displayName";
      input.maxLength = 40;
      input.autocomplete = "off";
      input.placeholder = "Display name";
      label.appendChild(input);
      const createProfileButton = element("button", "button secondary", "Create local profile");
      createProfileButton.type = "submit";
      form.append(label, createProfileButton);
      form.addEventListener("submit", function (event) {
        event.preventDefault();
        notify("Please use the BSAD 281 Demo account instead of creating a local profile.");
      });
      panel.appendChild(form);
    } else {
      panel.append(
        element("h2", "", "Hello, " + state.account.name),
        element("p", "muted", "Demo account · " + currentPlan() + " membership"),
        element("p", "", "Your collection and marketplace listings are stored only in this browser.")
      );
      panel.appendChild(makeButton("Sign out", "button secondary", function () {
        requestConfirmation("Are you sure you want to sign out?", function () {
          state.account = null;
          saveState("Signed out. Your local data remains on this device.");
          renderAll();
        }, "Sign out", false);
      }));
    }
    const listings = state.marketListings;
    const heading = element("h2", "", "Your listings (" + listings.length + ")");
    panel.appendChild(heading);
    if (listings.length) {
      const list = element("ul", "account-listings");
      listings.forEach(function (item) { list.appendChild(element("li", "", item.name + " · " + item.type + " · $" + Number(item.price).toFixed(2))); });
      panel.appendChild(list);
    } else {
      panel.appendChild(element("p", "muted", "You have not created any listings yet."));
    }
    if (state.account) {
      panel.appendChild(element("h2", "", "Simulated purchases (" + state.purchases.length + ")"));
      if (state.purchases.length) {
        const purchases = element("ul", "account-listings");
        state.purchases.forEach(function (purchase) {
          purchases.appendChild(element("li", "", purchase.name + " · " + purchase.type + " · $" + Number(purchase.price).toFixed(2) + " · demo only"));
        });
        panel.appendChild(purchases);
      } else {
        panel.appendChild(element("p", "muted", "No demo purchases yet."));
      }
    }
    panel.appendChild(makeButton("View membership plans", "button secondary", function () { window.location.hash = "#membership"; }));
  }

  function renderAll() {
    renderDashboard();
    renderCollection();
    renderMarketplaceImport();
    renderCombatants();
    renderMap();
    renderMarketplace();
    renderCart();
    renderPurchaseHistory();
    renderMembership();
    renderAccount();
  }

  document.getElementById("create-miniature-toggle").addEventListener("click", function () {
    const opening = document.getElementById("collection-form").hidden;
    setCollectionFormOpen(opening, false);
    if (opening) document.querySelector("#collection-form [name='name']").focus();
  });
  document.getElementById("marketplace-import-toggle").addEventListener("click", function () {
    const opening = document.getElementById("marketplace-import-panel").hidden;
    if (opening) setCollectionFormOpen(false, false);
    setMarketplaceImportOpen(opening);
  });
  document.getElementById("cancel-marketplace-import").addEventListener("click", function () {
    document.getElementById("marketplace-import-form").reset();
    setMarketplaceImportOpen(false);
  });
  document.getElementById("collection-search").addEventListener("input", renderCollection);
  document.getElementById("collection-form").addEventListener("submit", function (event) {
    event.preventDefault();
    if (!state.account) return notify("Sign in before managing your collection.", "error");
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form).entries());
    const name = values.name.trim();
    const quantity = Number(values.quantity);
    const imageFile = form.elements.namedItem("image").files[0];
    if (imageFile) {
      const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      if (allowedTypes.indexOf(imageFile.type.toLowerCase()) === -1) return notify("Choose a PNG, JPEG, WebP, or GIF image.", "error");
      if (imageFile.size > MAX_IMAGE_SIZE) return notify("Miniature images must be 1 MB or smaller.", "error");
    }
    if (!name || !values.creatureType.trim() || !values.gameSystem.trim()) return notify("Name, creature type, and game system are required.", "error");
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 999) return notify("Quantity must be a whole number between 1 and 999.", "error");
    const entry = editingCollectionId ? getCollectionEntry(editingCollectionId) : null;
    if (editingCollectionId && !entry) return notify("That collection item no longer exists.", "error");
    if (entry && collectionCount() - Number(entry.quantity || 0) + quantity > collectionLimit()) {
      return notify("That quantity would exceed your " + currentPlan() + " collection limit. Upgrade your plan or lower the quantity.", "error");
    }
    if (!entry && collectionCount() + quantity > collectionLimit()) {
      return notify("Adding that quantity would exceed your " + currentPlan() + " collection limit. Upgrade your plan or lower the quantity.", "error");
    }

    const saveCollectionEntry = function (imageData) {
      if (entry) {
        ["name", "creatureType", "size", "gameSystem", "creator", "paintingStatus", "notes"].forEach(function (key) { entry[key] = String(values[key] || "").trim(); });
        entry.quantity = quantity;
        if (imageData) entry.imageData = imageData;
        recordActivity("Updated " + entry.name + " in your collection.");
        resetCollectionForm();
        saveState("Collection item updated.");
      } else {
        state.collection.push({
          id: createId("collection"), miniatureId: "", name: name,
          creatureType: values.creatureType.trim(), size: values.size,
          gameSystem: values.gameSystem.trim(), creator: values.creator.trim(),
          quantity: quantity, paintingStatus: values.paintingStatus, notes: values.notes.trim(),
          imageData: imageData || ""
        });
        recordActivity("Added " + name + " to your collection.");
        form.reset();
        setCollectionFormOpen(false, false);
        saveState("Added " + name + " to your collection.");
      }
      renderAll();
    };
    if (imageFile) {
      const submit = form.querySelector("button[type='submit']");
      const cancel = document.getElementById("cancel-collection-edit");
      submit.disabled = true;
      cancel.disabled = true;
      readListingImage(imageFile).then(function (imageData) {
        submit.disabled = false;
        cancel.disabled = false;
        saveCollectionEntry(imageData);
      }, function () {
        submit.disabled = false;
        cancel.disabled = false;
        notify("Could not read the miniature image. Choose a valid image and try again.", "error");
      });
    } else {
      saveCollectionEntry("");
    }
  });
  document.getElementById("marketplace-import-form").addEventListener("submit", function (event) {
    event.preventDefault();
    if (!state.account) return notify("Sign in before importing marketplace purchases.", "error");
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form).entries());
    const purchase = state.purchases.find(function (item) {
      return item.id === values.purchaseId && (item.type === "Physical" || item.type === "Digital STL");
    });
    if (!purchase) return notify("Choose an available miniature purchase to import.", "error");
    if (collectionCount() >= collectionLimit()) {
      return notify("Your " + currentPlan() + " plan has reached its collection limit. Upgrade your plan for more space.", "error");
    }

    const imageFile = form.elements.namedItem("image").files[0];
    if (imageFile) {
      const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      if (allowedTypes.indexOf(imageFile.type.toLowerCase()) === -1) return notify("Choose a PNG, JPEG, WebP, or GIF image.", "error");
      if (imageFile.size > MAX_IMAGE_SIZE) return notify("Miniature images must be 1 MB or smaller.", "error");
    }

    const saveImportedPurchase = function (imageData) {
      state.collection.push({
        id: createId("collection"),
        purchaseId: purchase.id,
        miniatureId: "",
        name: purchase.name,
        creatureType: "Miniature",
        size: "Medium",
        gameSystem: "Marketplace",
        creator: purchase.seller || "Marketplace",
        quantity: 1,
        paintingStatus: values.paintingStatus,
        notes: values.notes.trim(),
        imageData: imageData || ""
      });
      recordActivity("Imported " + purchase.name + " from marketplace purchases.");
      form.reset();
      setMarketplaceImportOpen(false);
      saveState("Marketplace purchase added to your collection.");
      renderAll();
    };

    if (imageFile) {
      const submit = form.querySelector("button[type='submit']");
      const cancel = document.getElementById("cancel-marketplace-import");
      submit.disabled = true;
      cancel.disabled = true;
      readListingImage(imageFile).then(function (imageData) {
        submit.disabled = false;
        cancel.disabled = false;
        saveImportedPurchase(imageData);
      }, function () {
        submit.disabled = false;
        cancel.disabled = false;
        notify("Could not read the miniature image. Choose a valid image and try again.", "error");
      });
    } else {
      saveImportedPurchase("");
    }
  });
  document.getElementById("cancel-collection-edit").addEventListener("click", resetCollectionForm);

  function addCombatant(event, kind) {
    event.preventDefault();
    if (!state.account) return notify("Sign in to use the initiative tracker.", "error");
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form).entries());
    const selected = String(values.miniature || "").split("|");
    let miniature = null;
    let collectionEntryId = "";
    if (selected[0] === "collection") {
      const entry = getCollectionEntry(selected[1]);
      if (entry) {
        miniature = entry;
        collectionEntryId = entry.id;
      }
    }
    const name = values.name.trim() || (miniature && miniature.name) || "";
    if (!name) return notify("Enter a combatant name or select a miniature.", "error");
    const hp = Number(values.hp);
    const maxHp = Number(values.maxHp);
    const armorClass = Number(values.ac);
    if (!Number.isInteger(hp) || !Number.isInteger(maxHp) || hp < 1 || maxHp < 1 || hp > maxHp || maxHp > 9999) {
      return notify("Hit points must be whole numbers, with current HP no greater than maximum HP.", "error");
    }
    if (!Number.isInteger(armorClass) || armorClass < 1 || armorClass > 30) {
      return notify("Armor class must be a whole number between 1 and 30.", "error");
    }
    const initiative = values.initiativeMode === "roll" ? Math.floor(Math.random() * 20) + 1 : Number(values.initiative);
    if (!Number.isFinite(initiative) || initiative < -10 || initiative > 50) return notify("Initiative must be between -10 and 50.", "error");
    const newCombatant = {
      id: createId("combatant"),
      name: name,
      kind: kind,
      enemy: values.enemy === "on",
      miniatureId: miniature && miniature.miniatureId ? miniature.miniatureId : "",
      collectionEntryId: collectionEntryId,
      miniatureSnapshot: miniature ? {
        name: miniature.name, creatureType: miniature.creatureType, size: miniature.size,
        gameSystem: miniature.gameSystem, creator: miniature.creator
      } : null,
      initiative: initiative, hp: hp, maxHp: maxHp, ac: armorClass
    };
    state.combatants.push(newCombatant);
    sortEncounter();
    if (state.combatants.length === 1) state.turnIndex = 0;
    state.selectedCombatantId = newCombatant.id;
    recordActivity("Added " + name + " to the encounter (initiative " + initiative + ").");
    form.reset();
    form.elements.namedItem("hp").value = "10";
    form.elements.namedItem("maxHp").value = "10";
    form.querySelector("[data-manual-initiative]").hidden = true;
    form.elements.namedItem("initiative").required = false;
    if (kind === "Player") setPlayerFormOpen(false);
    else setCreatureFormOpen(false);
    saveState(name + " added with initiative " + initiative + ".");
    renderAll();
  }
  document.getElementById("player-form").addEventListener("submit", function (event) { addCombatant(event, "Player"); });
  document.getElementById("creature-form").addEventListener("submit", function (event) { addCombatant(event, "Creature"); });
  document.querySelectorAll(".combatant-form [name='initiativeMode']").forEach(function (select) {
    select.addEventListener("change", function (event) {
      const form = event.currentTarget.form;
      const manual = event.currentTarget.value === "manual";
      form.querySelector("[data-manual-initiative]").hidden = !manual;
      form.elements.namedItem("initiative").required = manual;
    });
  });
  document.getElementById("add-player-toggle").addEventListener("click", function () {
    if (!state.account) return notify("Sign in to use the initiative tracker.", "error");
    setPlayerFormOpen(document.getElementById("player-form-panel").hidden);
  });
  document.getElementById("cancel-add-player").addEventListener("click", function () {
    const form = document.getElementById("player-form");
    form.reset();
    form.querySelector("[data-manual-initiative]").hidden = true;
    form.elements.namedItem("initiative").required = false;
    setPlayerFormOpen(false);
  });
  document.getElementById("add-creature-toggle").addEventListener("click", function () {
    if (!state.account) return notify("Sign in to use the initiative tracker.", "error");
    setCreatureFormOpen(document.getElementById("creature-form-panel").hidden);
  });
  document.getElementById("cancel-add-creature").addEventListener("click", function () {
    const form = document.getElementById("creature-form");
    form.reset();
    form.querySelector("[data-manual-initiative]").hidden = true;
    form.elements.namedItem("initiative").required = false;
    setCreatureFormOpen(false);
  });
  document.getElementById("next-turn").addEventListener("click", function () {
    if (!state.combatants.length) return notify("Add a combatant before advancing turns.", "error");
    state.turnIndex += 1;
    if (state.turnIndex >= state.combatants.length) {
      state.turnIndex = 0;
      state.round += 1;
    }
    const combatant = state.combatants[state.turnIndex];
    state.selectedCombatantId = combatant.id;
    saveState("Round " + state.round + ": " + combatant.name + "'s turn.");
    renderAll();
  });
  document.getElementById("save-encounter").addEventListener("click", saveEncounter);
  document.getElementById("load-encounter").addEventListener("click", loadEncounter);
  document.getElementById("encounter-name").addEventListener("input", function (event) { state.encounterName = event.target.value; });

  document.getElementById("map-upload").addEventListener("change", function (event) {
    if (!state.account) return notify("Sign in to manage your battle map.", "error");
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    if (!(file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"))) {
      event.target.value = "";
      return notify("Choose a PDF file for the battle map.", "error");
    }
    if (file.size > 20 * 1024 * 1024) {
      event.target.value = "";
      return notify("The PDF must be 20 MB or smaller.", "error");
    }
    if (uploadedMapUrl) URL.revokeObjectURL(uploadedMapUrl);
    uploadedMapUrl = URL.createObjectURL(file);
    state.mapFileName = file.name;
    saveState("PDF map loaded in your browser. The file itself is not uploaded or saved.");
    renderMap();
  });
  document.getElementById("map-source").addEventListener("change", function (event) {
    if (!state.account) return notify("Sign in to manage your battle map.", "error");
    const selectedSource = event.target.value;
    const purchasedMap = getPurchasedBattlemapListing(selectedSource);
    if (selectedSource !== "grasslands" && selectedSource !== "pdf" && !purchasedMap) {
      renderMap();
      return notify("Purchase a marketplace battlemap before selecting it.", "error");
    }
    state.mapSource = selectedSource;
    const message = purchasedMap
      ? purchasedMap.name + " battlemap selected."
      : (state.mapSource === "grasslands" ? "Grasslands map selected." : "PDF map selected.");
    saveState(message);
    renderMap();
  });
  document.getElementById("fullscreen-map").addEventListener("click", function () {
    const mapLayout = document.getElementById("map-layout");
    if (!state.account) return notify("Sign in to manage your battle map.", "error");
    if (!document.fullscreenEnabled || typeof mapLayout.requestFullscreen !== "function") {
      return notify("Full screen is not supported by this browser.", "error");
    }
    mapLayout.requestFullscreen().catch(function () {
      notify("The browser could not make the battle map full screen.", "error");
    });
  });
  document.getElementById("fullscreen-exit").addEventListener("click", function () {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(function () {
        notify("The browser could not exit full screen.", "error");
      });
    }
  });
  document.getElementById("fullscreen-end-turn").addEventListener("click", function () {
    document.getElementById("next-turn").click();
  });
  document.getElementById("fullscreen-hp").addEventListener("change", function (event) {
    const combatant = state.combatants[state.turnIndex];
    const hp = Number(event.currentTarget.value);
    if (!state.account) return notify("Sign in to edit combatant hit points.", "error");
    if (!combatant || !Number.isInteger(hp) || hp < 0 || hp > Number(combatant.maxHp)) {
      notify("Hit points must be a whole number between 0 and the combatant's maximum HP.", "error");
      renderFullscreenTurnControl();
      return;
    }
    combatant.hp = hp;
    saveState(combatant.name + "'s hit points updated.");
    renderAll();
  });
  document.getElementById("fullscreen-ac").addEventListener("change", function (event) {
    const combatant = state.combatants[state.turnIndex];
    const armorClass = Number(event.currentTarget.value);
    if (!state.account) return notify("Sign in to edit combatant armor class.", "error");
    if (!combatant || !Number.isInteger(armorClass) || armorClass < 1 || armorClass > 30) {
      notify("Armor class must be a whole number between 1 and 30.", "error");
      renderFullscreenTurnControl();
      return;
    }
    combatant.ac = armorClass;
    saveState(combatant.name + "'s armor class updated.");
    renderAll();
  });
  document.addEventListener("fullscreenchange", function () {
    const mapLayout = document.getElementById("map-layout");
    const isFullscreen = document.fullscreenElement === mapLayout;
    const fullscreenButton = document.getElementById("fullscreen-map");
    fullscreenButton.setAttribute("aria-pressed", isFullscreen ? "true" : "false");
    fullscreenButton.textContent = isFullscreen ? "Full screen active" : "Full screen";
    document.getElementById("fullscreen-exit").hidden = !isFullscreen;
    renderFullscreenTurnControl();
  });
  document.getElementById("toggle-grid").addEventListener("click", function () {
    if (!state.account) return notify("Sign in to manage your battle map.", "error");
    state.gridEnabled = !state.gridEnabled;
    saveState(state.gridEnabled ? "Map grid enabled." : "Map grid hidden.");
    renderMap();
  });
  document.getElementById("marker-form").addEventListener("submit", function (event) {
    event.preventDefault();
    if (!state.account) return notify("Sign in to manage your battle map.", "error");
    const combatantId = document.getElementById("marker-combatant").value;
    const combatant = getCombatant(combatantId);
    if (!combatant) return notify("Choose a combatant before placing a marker.", "error");
    if (state.mapMarkers.some(function (marker) { return marker.combatantId === combatantId; })) return notify("That combatant already has a map marker.", "error");
    const count = state.mapMarkers.length;
    state.mapMarkers.push({ id: createId("marker"), combatantId: combatantId, x: 28 + (count * 17) % 50, y: 30 + (count * 19) % 45 });
    state.selectedCombatantId = combatantId;
    saveState(combatant.name + " placed on the battle map.");
    renderCombatants();
    renderMap();
  });

  document.getElementById("market-search").addEventListener("input", renderMarketplace);
  document.getElementById("market-type").addEventListener("change", renderMarketplace);
  document.querySelector("#listing-form [name='type']").addEventListener("change", renderMarketplace);
  document.getElementById("marketplace-detail-close").addEventListener("click", function () {
    document.getElementById("marketplace-detail-dialog").close();
  });
  document.getElementById("marketplace-detail-dialog").addEventListener("click", function (event) {
    if (event.target === event.currentTarget) event.currentTarget.close();
  });
  document.getElementById("create-listing-toggle").addEventListener("click", function () {
    const form = document.getElementById("listing-form");
    const opening = form.hidden;
    setListingFormOpen(opening, false);
    if (opening) form.elements.namedItem("name").focus();
  });
  document.getElementById("purchase-history-toggle").addEventListener("click", function () {
    if (!state.account) return notify("Sign in to view your purchases.", "error");
    const panel = document.getElementById("purchase-history-panel");
    panel.hidden = !panel.hidden;
    const isOpen = !panel.hidden;
    if (isOpen) setListingFormOpen(false, false);
    this.setAttribute("aria-expanded", String(isOpen));
    this.textContent = isOpen ? "Close purchases" : "Open purchases";
    this.classList.toggle("is-open", isOpen);
  });
  document.getElementById("cart-toggle").addEventListener("click", function () {
    if (!state.account) return notify("Sign in to view your cart.", "error");
    openCart();
    this.setAttribute("aria-expanded", "true");
  });
  document.getElementById("cart-close").addEventListener("click", closeCart);
  document.getElementById("cart-backdrop").addEventListener("click", closeCart);
  const confirmationDialog = document.getElementById("confirmation-dialog");
  document.getElementById("confirmation-cancel").addEventListener("click", function () {
    pendingConfirmation = null;
    confirmationDialog.close();
  });
  document.getElementById("confirmation-accept").addEventListener("click", function () {
    const onConfirm = pendingConfirmation;
    pendingConfirmation = null;
    confirmationDialog.close();
    if (onConfirm) onConfirm();
  });
  confirmationDialog.addEventListener("cancel", function () {
    pendingConfirmation = null;
  });
  document.getElementById("complete-cart-purchase").addEventListener("click", function () {
    if (!state.account) return notify("Sign in to complete your purchase.", "error");
    if (state.cart.length === 0) return;
    requestConfirmation("Are you sure you'd like to complete this purchase?", function () {
      const cartIds = state.cart.slice();
      const cartItems = cartIds.map(findMarketplaceListing);
      if (cartItems.some(function (item) { return !item; })) {
        state.cart = cartIds.filter(function (listingId) { return Boolean(findMarketplaceListing(listingId)); });
        saveState("Unavailable listings were removed from your cart.");
        renderAll();
        return;
      }
      const blockMessage = cartItems.map(getPurchaseBlockMessage).find(Boolean);
      if (blockMessage) return notify(blockMessage, "error");

      state.cart = [];
      for (let index = 0; index < cartItems.length; index += 1) {
        if (!simulatePurchase(cartItems[index])) {
          state.cart = cartItems.slice(index).map(function (item) { return item.id; });
          renderAll();
          return;
        }
      }
      saveState("Cart purchase complete. No payment was processed.");
      renderAll();
    }, "Complete purchase", false);
  });
  document.querySelector("#listing-form [name='image']").addEventListener("change", function (event) {
    const file = event.currentTarget.files && event.currentTarget.files[0];
    clearListingImagePreview();
    if (!file) return;
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (allowedTypes.indexOf(file.type.toLowerCase()) === -1) {
      event.currentTarget.value = "";
      return notify("Choose a PNG, JPEG, WebP, or GIF image.", "error");
    }
    if (file.size > MAX_IMAGE_SIZE) {
      event.currentTarget.value = "";
      return notify("Listing images must be 1 MB or smaller.", "error");
    }
    listingPreviewUrl = URL.createObjectURL(file);
    showListingImagePreview(listingPreviewUrl, file.name);
  });
  document.getElementById("listing-form").addEventListener("submit", function (event) {
    event.preventDefault();
    if (!state.account) return notify("Sign in before creating a marketplace listing.", "error");
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form).entries());
    const name = values.name.trim();
    const price = Number(values.price);
    const quantity = Number(values.quantity);
    const description = values.description.trim();
    const seller = state.account.name;
    if (!name || !description || !seller) return notify("Product name, description, and seller are required.", "error");
    if (!Number.isFinite(price) || price <= 0 || price > 99999) return notify("Enter a price greater than $0 and no more than $99,999.", "error");
    if (values.type === "Physical" && (!Number.isSafeInteger(quantity) || quantity < 1)) {
      return notify("Physical listing quantity must be a positive whole number.", "error");
    }
    const id = String(values.listingId || "");
    const imageFile = form.elements.namedItem("image").files[0] || null;
    if (imageFile) {
      const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      if (allowedTypes.indexOf(imageFile.type.toLowerCase()) === -1) return notify("Choose a PNG, JPEG, WebP, or GIF image.", "error");
      if (imageFile.size > MAX_IMAGE_SIZE) return notify("Listing images must be 1 MB or smaller.", "error");
    }
    if (!id && state.marketListings.length >= listingLimit()) {
      return notify("Your " + currentPlan() + " plan has reached its active listing limit. Upgrade for more listings.", "error");
    }
    const submit = form.querySelector("button[type='submit']");
    const saveListing = function (imageData) {
      if (!state.account) return notify("Sign in before creating a marketplace listing.", "error");
      if (id) {
        const item = state.marketListings.find(function (listing) { return listing.id === id; });
        if (!item) return notify("That listing no longer exists.", "error");
        Object.assign(item, {
          name: name,
          type: values.type,
          price: price,
          quantity: values.type === "Physical" ? quantity : undefined,
          seller: state.account.name,
          owner: state.account.name,
          description: description,
          imageData: imageData || item.imageData || ""
        });
        recordActivity("Updated the marketplace listing \"" + name + "\".");
        resetListingForm();
        saveState("Listing updated.");
      } else {
        state.marketListings.push({
          id: createId("market"),
          name: name,
          type: values.type,
          price: price,
          quantity: values.type === "Physical" ? quantity : undefined,
          seller: state.account.name,
          description: description,
          owner: state.account.name,
          rating: "",
          reviews: 0,
          imageData: imageData
        });
        recordActivity("Published the marketplace listing \"" + name + "\".");
        resetListingForm();
        saveState("Listing published. Purchase and payment are simulation-only.");
      }
      renderAll();
    };
    if (imageFile) {
      submit.disabled = true;
      readListingImage(imageFile).then(function (imageData) {
        saveListing(imageData);
      }, function () {
        notify("Could not read the listing image. Choose a valid image and try again.", "error");
        renderMarketplace();
      });
      return;
    }
    saveListing("");
  });
  document.getElementById("cancel-listing-edit").addEventListener("click", resetListingForm);

  window.addEventListener("hashchange", showView);
  setupCollectionOptions();
  if (storageUnavailable) notify("Saved browser data could not be read. You can continue, but changes may not persist.", "error");
  renderAll();
  showView();
})();
