(function () {
  "use strict";

  const STORAGE_KEY = "criticalFailCavern.v1";
  const SIZES = ["Tiny", "Small", "Medium", "Large", "Huge"];
  const PLAN_LIMITS = {
    Free: { collection: 20, listings: 2 },
    Pro: { collection: 100, listings: 10 },
    Creator: { collection: 10000, listings: Infinity }
  };
  let storageUnavailable = false;
  let uploadedMapUrl = "";
  let noticeTimer;

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
        { id: "combatant-vale", name: "Vale Watcher", kind: "Player", miniatureId: "mini-vale", collectionEntryId: "collection-vale", miniatureSnapshot: null, initiative: 16, hp: 12, maxHp: 12 },
        { id: "combatant-mossback", name: "Mossback Sentinel", kind: "Creature", miniatureId: "mini-mossback", collectionEntryId: "collection-mossback", miniatureSnapshot: null, initiative: 12, hp: 18, maxHp: 18 },
        { id: "combatant-coppercap", name: "Coppercap Burrower", kind: "Creature", miniatureId: "mini-copper", collectionEntryId: "collection-coppercap", miniatureSnapshot: null, initiative: 8, hp: 7, maxHp: 7 }
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
      mapFileName: "",
      marketListings: [],
      purchases: [],
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
    "marketListings", "purchases", "activity"
  ].forEach(function (key) {
    if (!Array.isArray(state[key])) state[key] = [];
  });
  if (!state.account || typeof state.account !== "object") state.account = null;
  if (!state.localProfile || typeof state.localProfile !== "object") state.localProfile = null;
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

  function showView() {
    const requested = (window.location.hash || "#dashboard").slice(1);
    const views = document.querySelectorAll("[data-view]");
    const exists = Array.prototype.some.call(views, function (view) { return view.id === requested; });
    const current = exists ? requested : "dashboard";
    views.forEach(function (view) { view.hidden = view.id !== current; });
    document.querySelectorAll("[data-nav]").forEach(function (link) {
      if (link.getAttribute("href") === "#" + current) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
    if (window.scrollTo) window.scrollTo(0, 0);
  }

  function setFilterOptions(id, values, firstLabel) {
    const select = document.getElementById(id);
    select.replaceChildren();
    select.appendChild(new Option(firstLabel || "All", "all"));
    values.forEach(function (value) { select.appendChild(new Option(value, value)); });
  }

  function setupFilterOptions() {
    ["creatureType", "size", "gameSystem", "creator"].forEach(function (field) {
      const values = Array.from(new Set(MINIATURES.map(function (item) { return item[field]; }))).sort();
      const id = "database-" + (field === "creatureType" ? "type" : field === "gameSystem" ? "system" : field);
      setFilterOptions(id, values);
    });
    const sizeSelect = document.querySelector("#collection-form select[name='size']");
    SIZES.forEach(function (size) { sizeSelect.appendChild(new Option(size, size)); });
  }

  function renderDashboard() {
    const stats = document.getElementById("dashboard-stats");
    const cards = [
      ["Miniatures in database", MINIATURES.length],
      ["Miniatures collected", state.collection.reduce(function (total, entry) { return total + Number(entry.quantity || 0); }, 0)],
      ["Active combatants", state.combatants.length],
      ["Marketplace listings", MARKET_SAMPLE.length + state.marketListings.length]
    ];
    stats.replaceChildren.apply(stats, cards.map(function (item) {
      const card = element("article", "card stat-card");
      card.append(element("p", "muted", item[0]), element("strong", "", String(item[1])));
      return card;
    }));
    const activityList = document.getElementById("activity-list");
    activityList.replaceChildren.apply(activityList, state.activity.map(function (item) {
      return element("li", "", item.text);
    }));
  }

  function addToCollection(miniature) {
    const existing = state.collection.find(function (entry) { return entry.miniatureId === miniature.id; });
    if (collectionCount() >= collectionLimit()) {
      notify("Your " + currentPlan() + " plan has reached its " + collectionLimit() + "-miniature collection limit. Upgrade your plan for more space.", "error");
      return;
    }
    if (existing && Number(existing.quantity) >= 999) {
      notify("This miniature's quantity cannot exceed 999.", "error");
      return;
    }
    if (existing) existing.quantity = Number(existing.quantity || 1) + 1;
    else {
      state.collection.push({
        id: createId("collection"),
        miniatureId: miniature.id,
        name: miniature.name,
        creatureType: miniature.creatureType,
        size: miniature.size,
        gameSystem: miniature.gameSystem,
        creator: miniature.creator,
        quantity: 1,
        paintingStatus: "Unpainted",
        notes: ""
      });
    }
    recordActivity("Added " + miniature.name + " to your collection.");
    saveState(existing ? "Collection quantity increased." : "Added " + miniature.name + " to your collection.");
    renderAll();
  }

  function renderDatabase() {
    const query = document.getElementById("database-search").value.trim().toLowerCase();
    const filters = {
      creatureType: document.getElementById("database-type").value,
      size: document.getElementById("database-size").value,
      gameSystem: document.getElementById("database-system").value,
      creator: document.getElementById("database-creator").value
    };
    const matches = MINIATURES.filter(function (item) {
      const searchText = [item.name, item.creatureType, item.size, item.gameSystem, item.creator, item.description].join(" ").toLowerCase();
      return searchText.indexOf(query) !== -1 &&
        Object.keys(filters).every(function (key) { return filters[key] === "all" || item[key] === filters[key]; });
    });
    document.getElementById("database-count").textContent = matches.length + " of " + MINIATURES.length + " miniatures";
    const grid = document.getElementById("database-grid");
    grid.replaceChildren.apply(grid, matches.map(function (item) {
      const card = element("article", "card");
      card.append(
        element("span", "tag", item.creatureType + " · " + item.size),
        element("h2", "", item.name),
        element("p", "", item.description),
        element("p", "muted small", item.gameSystem + " · " + item.creator)
      );
      const button = makeButton("Add to my collection", "button secondary", function () { addToCollection(item); });
      if (collectionCount() >= collectionLimit()) {
        button.disabled = true;
        button.title = "Your current plan has reached its collection limit.";
      }
      card.appendChild(button);
      return card;
    }));
    document.getElementById("database-empty").hidden = matches.length > 0;
  }

  let editingCollectionId = "";
  function resetCollectionForm() {
    editingCollectionId = "";
    const form = document.getElementById("collection-form");
    form.reset();
    form.querySelector("h2").textContent = "Add a miniature";
    form.querySelector("button[type='submit']").textContent = "Add to collection";
    document.getElementById("cancel-collection-edit").hidden = true;
  }

  function editCollectionEntry(id) {
    const entry = getCollectionEntry(id);
    if (!entry) return;
    editingCollectionId = id;
    const form = document.getElementById("collection-form");
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
    document.getElementById("collection-capacity").textContent =
      collectionCount() + " of " + (limit === 10000 ? "generous" : limit) + " miniatures used on your " + currentPlan() + " plan.";
    const query = document.getElementById("collection-search").value.trim().toLowerCase();
    const matches = state.collection.filter(function (entry) {
      return [entry.name, entry.creatureType, entry.size, entry.gameSystem, entry.creator, entry.paintingStatus, entry.notes].join(" ").toLowerCase().indexOf(query) !== -1;
    });
    const grid = document.getElementById("collection-grid");
    grid.replaceChildren.apply(grid, matches.map(function (entry) {
      const card = element("article", "card");
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
        if (!window.confirm("Remove " + entry.name + " from your collection?")) return;
        state.collection = state.collection.filter(function (item) { return item.id !== entry.id; });
        state.combatants.forEach(function (combatant) {
          if (combatant.collectionEntryId === entry.id) combatant.collectionEntryId = "";
        });
        if (editingCollectionId === entry.id) resetCollectionForm();
        recordActivity("Removed " + entry.name + " from your collection.");
        saveState("Removed " + entry.name + " from your collection.");
        renderAll();
      }));
      card.append(quantity, actions);
      return card;
    }));
    document.getElementById("collection-empty").hidden = matches.length > 0;
  }

  function renderMiniatureOptions() {
    const select = document.querySelector("#combatant-form select[name='miniature']");
    select.replaceChildren(new Option("No miniature", ""));
    const databaseGroup = document.createElement("optgroup");
    databaseGroup.label = "Miniature database";
    MINIATURES.forEach(function (item) { databaseGroup.appendChild(new Option(item.name, "db|" + item.id)); });
    select.appendChild(databaseGroup);
    const collectionGroup = document.createElement("optgroup");
    collectionGroup.label = "My collection";
    state.collection.forEach(function (entry) {
      collectionGroup.appendChild(new Option(entry.name + " (" + entry.quantity + ")", "collection|" + entry.id));
    });
    if (state.collection.length) select.appendChild(collectionGroup);
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
    document.getElementById("round-number").textContent = String(state.round);
    const active = state.combatants[state.turnIndex];
    document.getElementById("turn-label").textContent = active ? combatantName(active) + "'s turn" : "No active combatants";
    document.getElementById("next-turn").disabled = state.combatants.length === 0;
    list.replaceChildren.apply(list, ordered.map(function (combatant) {
      const card = element("article", "card combatant-card" + (combatant.id === (active && active.id) ? " current-turn" : "") + (combatant.id === state.selectedCombatantId ? " selected-combatant" : ""));
      const top = element("div", "combatant-heading");
      const identity = element("div");
      const selectButton = makeButton(combatant.name, "text-button", function () {
        selectedCombatant(combatant);
        notify(combatant.name + " selected. Its map marker is highlighted when placed.");
      });
      identity.append(selectButton, element("p", "muted small", combatant.kind + " · Initiative " + combatant.initiative));
      const miniature = getCombatantMiniature(combatant);
      if (miniature) identity.appendChild(element("p", "muted small", "Miniature: " + miniature.name));
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
      }));
      card.append(top, health, actions);
      return card;
    }));
    document.getElementById("combatant-empty").hidden = state.combatants.length > 0;
    renderMiniatureOptions();
    renderEncounterOptions();
  }

  function renderEncounterOptions() {
    const select = document.getElementById("saved-encounters");
    const previous = select.value;
    select.replaceChildren(new Option("Choose a saved encounter", ""));
    state.savedEncounters.forEach(function (encounter) { select.appendChild(new Option(encounter.name, encounter.id)); });
    if (state.savedEncounters.some(function (encounter) { return encounter.id === previous; })) select.value = previous;
    document.getElementById("encounter-name").value = state.encounterName || "Untitled encounter";
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

  function renderMap() {
    const surface = document.getElementById("map-surface");
    const placeholder = document.getElementById("map-placeholder");
    const frame = document.getElementById("map-pdf");
    document.getElementById("map-grid").hidden = !state.gridEnabled;
    const gridButton = document.getElementById("toggle-grid");
    gridButton.setAttribute("aria-pressed", state.gridEnabled ? "true" : "false");
    gridButton.textContent = state.gridEnabled ? "Hide grid" : "Show grid";
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
    const layer = document.getElementById("marker-layer");
    layer.replaceChildren();
    state.mapMarkers.forEach(function (marker) {
      const combatant = getCombatant(marker.combatantId);
      if (!combatant) return;
      const button = element("button", "map-marker" + (combatant.id === state.selectedCombatantId ? " marker-selected" : ""));
      button.type = "button";
      button.style.left = Math.max(0, Math.min(100, Number(marker.x))) + "%";
      button.style.top = Math.max(0, Math.min(100, Number(marker.y))) + "%";
      button.setAttribute("aria-label", combatant.name + ", " + combatant.hp + " of " + combatant.maxHp + " hit points. Select or drag marker.");
      const healthRatio = Number(combatant.maxHp) > 0 ? Number(combatant.hp) / Number(combatant.maxHp) : 0;
      const healthClass = healthRatio <= 0.25 ? "health-low" : healthRatio <= 0.5 ? "health-mid" : "health-good";
      button.append(element("span", "health-dot " + healthClass), element("span", "marker-name", combatant.name), element("span", "marker-hp", combatant.hp + "/" + combatant.maxHp + " HP"));
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
        notify(combatant.name + " selected in the initiative tracker.");
      });
      layer.appendChild(button);
    });
    const selected = getCombatant(state.selectedCombatantId);
    const marker = state.mapMarkers.find(function (item) { return selected && item.combatantId === selected.id; });
    const mapMessage = document.getElementById("map-message");
    mapMessage.textContent = selected
      ? marker
        ? "Selected: " + selected.name + " · " + selected.hp + "/" + selected.maxHp + " HP. Its marker is highlighted."
        : "Selected: " + selected.name + ". Add a marker above to place it on the map."
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

  function renderMarkerOptions() {
    const select = document.getElementById("marker-combatant");
    const used = state.mapMarkers.map(function (marker) { return marker.combatantId; });
    const available = sortedCombatants().filter(function (combatant) { return used.indexOf(combatant.id) === -1; });
    select.replaceChildren(new Option(available.length ? "Choose a combatant" : "No unplaced combatants", ""));
    available.forEach(function (combatant) { select.appendChild(new Option(combatant.name, combatant.id)); });
    document.querySelector("#marker-form button[type='submit']").disabled = available.length === 0;
  }

  function renderMarketplace() {
    const query = document.getElementById("market-search").value.trim().toLowerCase();
    const type = document.getElementById("market-type").value;
    const items = MARKET_SAMPLE.concat(state.marketListings).filter(function (item) {
      return (type === "all" || item.type === type) &&
        [item.name, item.type, item.seller, item.description].join(" ").toLowerCase().indexOf(query) !== -1;
    });
    document.getElementById("market-count").textContent = items.length + " listing(s)";
    const grid = document.getElementById("market-grid");
    grid.replaceChildren.apply(grid, items.map(function (item) {
      const card = element("article", "card");
      card.append(
        element("span", "tag", item.type),
        element("h2", "", item.name),
        element("p", "", item.description),
        element("p", "price", "$" + Number(item.price).toFixed(2) + " " + (item.type === "Digital STL" ? "· simulated digital file" : "· simulated physical item")),
        element("p", "muted small", "Seller: " + item.seller)
      );
      if (item.reviews) {
        card.append(element("p", "review", "★ " + item.rating + "/5 · " + item.reviews + " fictional reviews"),
          element("p", "muted small", "“" + item.review + "”"));
      } else {
        card.append(element("p", "muted small", "No reviews yet · fictional listing"));
      }
      const actions = element("div", "action-links");
      actions.appendChild(makeButton("Simulate purchase", "button", function () {
        state.purchases.unshift({
          id: createId("purchase"),
          listingId: item.id,
          name: item.name,
          type: item.type,
          price: Number(item.price),
          purchasedAt: new Date().toISOString()
        });
        recordActivity("Simulated a purchase of \"" + item.name + "\". No payment was processed.");
        saveState("Demo purchase recorded for \"" + item.name + "\". No payment was processed.");
        renderAll();
      }));
      const own = state.marketListings.find(function (listing) { return listing.id === item.id; });
      if (own && state.account) {
        actions.appendChild(makeButton("Edit", "button secondary", function () { editListing(item.id); }));
        actions.appendChild(makeButton("Remove", "button secondary danger-button", function () {
          if (!window.confirm("Remove your listing \"" + item.name + "\"?")) return;
          state.marketListings = state.marketListings.filter(function (listing) { return listing.id !== item.id; });
          recordActivity("Removed the marketplace listing \"" + item.name + "\".");
          saveState("Listing removed.");
          renderAll();
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

  function resetListingForm() {
    const form = document.getElementById("listing-form");
    form.reset();
    form.elements.namedItem("listingId").value = "";
    document.getElementById("listing-form-title").textContent = "Create a listing";
    form.querySelector("button[type='submit']").textContent = "Publish listing";
    document.getElementById("cancel-listing-edit").hidden = true;
    renderMarketplace();
  }

  function editListing(id) {
    if (!state.account) return notify("Sign in to edit your listings.", "error");
    const item = state.marketListings.find(function (listing) { return listing.id === id; });
    if (!item) return;
    const form = document.getElementById("listing-form");
    ["listingId", "name", "type", "price", "seller", "description"].forEach(function (field) {
      form.elements.namedItem(field).value = item[field];
    });
    document.getElementById("listing-form-title").textContent = "Edit listing";
    form.querySelector("button[type='submit']").textContent = "Save listing";
    document.getElementById("cancel-listing-edit").hidden = false;
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function renderMembership() {
    const plan = currentPlan();
    const current = document.getElementById("current-plan");
    current.replaceChildren(element("strong", "", "Current plan: " + plan));
    current.appendChild(element("p", "muted", "Collection: " + collectionCount() + "/" + (PLAN_LIMITS[plan].collection === 10000 ? "generous" : PLAN_LIMITS[plan].collection) +
      " · Active marketplace listings: " + state.marketListings.length + "/" + (PLAN_LIMITS[plan].listings === Infinity ? "unlimited" : PLAN_LIMITS[plan].listings)));
    const plans = [
      { name: "Free", price: "Free", collection: "Save up to 20 miniatures", listings: "2 active marketplace listings" },
      { name: "Pro", price: "Simulated upgrade", collection: "Save up to 100 miniatures", listings: "10 active marketplace listings" },
      { name: "Creator", price: "Simulated upgrade", collection: "Generous collection storage", listings: "Unlimited active marketplace listings" }
    ];
    const grid = document.getElementById("plan-grid");
    grid.replaceChildren.apply(grid, plans.map(function (item) {
      const card = element("article", "card plan-card");
      card.append(element("span", "tag", item.price), element("h2", "", item.name), element("p", "", item.collection), element("p", "", item.listings));
      const button = makeButton(item.name === plan ? "Current plan" : "Choose " + item.name, "button secondary", function () {
        if (!state.account) {
          notify("Sign in with the demo account or create a local profile before changing membership.", "error");
          window.location.hash = "#account";
          return;
        }
        state.account.membership = item.name;
        if (state.account.kind === "local" && state.localProfile) state.localProfile.membership = item.name;
        recordActivity("Changed membership to " + item.name + " (simulated).");
        saveState(item.name === "Free" ? "Free plan selected." : item.name + " plan activated for this demo. No payment was taken.");
        renderAll();
      });
      if (item.name === plan) button.disabled = true;
      card.appendChild(button);
      return card;
    }));
  }

  function renderAccount() {
    const panel = document.getElementById("account-panel");
    panel.replaceChildren();
    if (!state.account) {
      panel.append(element("h2", "", "Welcome, adventurer"), element("p", "", "Sign in to the demo account or create one fictional local profile. No passwords, email addresses, or payments are used."));
      panel.appendChild(makeButton("Continue as Demo Adventurer", "button", function () {
        state.account = { name: "Demo Adventurer", membership: "Free", kind: "demo" };
        recordActivity("Signed in to the fictional demo account.");
        saveState("Signed in to Demo Adventurer.");
        renderAll();
      }));
      if (state.localProfile) {
        panel.append(element("h2", "", "Local profile available"), element("p", "muted", state.localProfile.name + " · " + state.localProfile.membership));
        panel.appendChild(makeButton("Sign in to " + state.localProfile.name, "button secondary", function () {
          state.account = { name: state.localProfile.name, membership: state.localProfile.membership, kind: "local" };
          saveState("Signed in to your local profile.");
          renderAll();
        }));
      }
      const form = document.createElement("form");
      form.id = "profile-form";
      form.className = "profile-form";
      const label = element("label", "", "Create a fictional local profile");
      const input = document.createElement("input");
      input.name = "displayName";
      input.required = true;
      input.maxLength = 40;
      input.autocomplete = "off";
      input.placeholder = "Display name";
      label.appendChild(input);
      form.append(label, makeButton("Create profile and sign in", "button secondary", function () {
        if (!input.value.trim()) return notify("Enter a display name for your local profile.", "error");
        state.localProfile = { name: input.value.trim(), membership: "Free" };
        state.account = { name: state.localProfile.name, membership: "Free", kind: "local" };
        recordActivity("Created a fictional local profile.");
        saveState("Local profile created. No password was collected.");
        renderAll();
      }));
      form.addEventListener("submit", function (event) { event.preventDefault(); });
      panel.appendChild(form);
    } else {
      panel.append(
        element("h2", "", "Hello, " + state.account.name),
        element("p", "muted", (state.account.kind === "demo" ? "Demo account" : "Local profile") + " · " + currentPlan() + " membership"),
        element("p", "", "Your collection and marketplace listings are stored only in this browser.")
      );
      panel.appendChild(makeButton("Sign out", "button secondary", function () {
        state.account = null;
        saveState("Signed out. Your local data remains on this device.");
        renderAll();
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
    panel.appendChild(makeButton("View membership plans", "button secondary", function () { window.location.hash = "#membership"; }));
  }

  function renderAll() {
    renderDashboard();
    renderDatabase();
    renderCollection();
    renderCombatants();
    renderMap();
    renderMarketplace();
    renderMembership();
    renderAccount();
  }

  document.getElementById("database-search").addEventListener("input", renderDatabase);
  ["database-type", "database-size", "database-system", "database-creator"].forEach(function (id) {
    document.getElementById(id).addEventListener("change", renderDatabase);
  });
  document.getElementById("collection-search").addEventListener("input", renderCollection);
  document.getElementById("collection-form").addEventListener("submit", function (event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form).entries());
    const name = values.name.trim();
    const quantity = Number(values.quantity);
    if (!name || !values.creatureType.trim() || !values.gameSystem.trim()) return notify("Name, creature type, and game system are required.", "error");
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 999) return notify("Quantity must be a whole number between 1 and 999.", "error");
    if (editingCollectionId) {
      const entry = getCollectionEntry(editingCollectionId);
      if (!entry) return notify("That collection item no longer exists.", "error");
      if (collectionCount() - Number(entry.quantity || 0) + quantity > collectionLimit()) {
        return notify("That quantity would exceed your " + currentPlan() + " collection limit. Upgrade your plan or lower the quantity.", "error");
      }
      ["name", "creatureType", "size", "gameSystem", "creator", "paintingStatus", "notes"].forEach(function (key) { entry[key] = String(values[key] || "").trim(); });
      entry.quantity = quantity;
      recordActivity("Updated " + entry.name + " in your collection.");
      resetCollectionForm();
      saveState("Collection item updated.");
    } else {
      if (collectionCount() + quantity > collectionLimit()) return notify("Adding that quantity would exceed your " + currentPlan() + " collection limit. Upgrade your plan or lower the quantity.", "error");
      state.collection.push({
        id: createId("collection"), miniatureId: "", name: name,
        creatureType: values.creatureType.trim(), size: values.size,
        gameSystem: values.gameSystem.trim(), creator: values.creator.trim(),
        quantity: quantity, paintingStatus: values.paintingStatus, notes: values.notes.trim()
      });
      recordActivity("Added " + name + " to your collection.");
      form.reset();
      saveState("Added " + name + " to your collection.");
    }
    renderAll();
  });
  document.getElementById("cancel-collection-edit").addEventListener("click", resetCollectionForm);

  document.getElementById("combatant-form").addEventListener("submit", function (event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form).entries());
    const selected = String(values.miniature || "").split("|");
    let miniature = null;
    let collectionEntryId = "";
    if (selected[0] === "db") miniature = getMiniature(selected[1]);
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
    if (!Number.isInteger(hp) || !Number.isInteger(maxHp) || hp < 1 || maxHp < 1 || hp > maxHp || maxHp > 9999) {
      return notify("Hit points must be whole numbers, with current HP no greater than maximum HP.", "error");
    }
    const initiative = values.initiativeMode === "roll" ? Math.floor(Math.random() * 20) + 1 : Number(values.initiative);
    if (!Number.isFinite(initiative) || initiative < -10 || initiative > 50) return notify("Initiative must be between -10 and 50.", "error");
    const newCombatant = {
      id: createId("combatant"),
      name: name,
      kind: values.kind,
      miniatureId: miniature && miniature.miniatureId ? miniature.miniatureId : miniature && miniature.id && getMiniature(miniature.id) ? miniature.id : "",
      collectionEntryId: collectionEntryId,
      miniatureSnapshot: miniature ? {
        name: miniature.name, creatureType: miniature.creatureType, size: miniature.size,
        gameSystem: miniature.gameSystem, creator: miniature.creator
      } : null,
      initiative: initiative, hp: hp, maxHp: maxHp
    };
    state.combatants.push(newCombatant);
    sortEncounter();
    if (state.combatants.length === 1) state.turnIndex = 0;
    state.selectedCombatantId = newCombatant.id;
    recordActivity("Added " + name + " to the encounter (initiative " + initiative + ").");
    form.reset();
    form.elements.namedItem("hp").value = "10";
    form.elements.namedItem("maxHp").value = "10";
    document.getElementById("manual-initiative-label").hidden = true;
    form.elements.namedItem("initiative").required = false;
    saveState(name + " added with initiative " + initiative + ".");
    renderAll();
  });
  document.querySelector("#combatant-form [name='initiativeMode']").addEventListener("change", function (event) {
    const manual = event.target.value === "manual";
    document.getElementById("manual-initiative-label").hidden = !manual;
    document.querySelector("#combatant-form [name='initiative']").required = manual;
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
  document.getElementById("toggle-grid").addEventListener("click", function () {
    state.gridEnabled = !state.gridEnabled;
    saveState(state.gridEnabled ? "Map grid enabled." : "Map grid hidden.");
    renderMap();
  });
  document.getElementById("marker-form").addEventListener("submit", function (event) {
    event.preventDefault();
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
  document.getElementById("listing-form").addEventListener("submit", function (event) {
    event.preventDefault();
    if (!state.account) return notify("Sign in before creating a marketplace listing.", "error");
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form).entries());
    const name = values.name.trim();
    const price = Number(values.price);
    const description = values.description.trim();
    const seller = values.seller.trim() || state.account.name;
    if (!name || !description || !seller) return notify("Product name, description, and seller are required.", "error");
    if (!Number.isFinite(price) || price <= 0 || price > 99999) return notify("Enter a price greater than $0 and no more than $99,999.", "error");
    const id = String(values.listingId || "");
    if (id) {
      const item = state.marketListings.find(function (listing) { return listing.id === id; });
      if (!item) return notify("That listing no longer exists.", "error");
      Object.assign(item, { name: name, type: values.type, price: price, seller: seller, description: description });
      recordActivity("Updated the marketplace listing \"" + name + "\".");
      resetListingForm();
      saveState("Listing updated.");
    } else {
      if (state.marketListings.length >= listingLimit()) return notify("Your " + currentPlan() + " plan has reached its active listing limit. Upgrade for more listings.", "error");
      state.marketListings.push({ id: createId("market"), name: name, type: values.type, price: price, seller: seller, description: description, owner: state.account.name, rating: "", reviews: 0 });
      recordActivity("Published the marketplace listing \"" + name + "\".");
      resetListingForm();
      saveState("Listing published. Purchase and payment are simulation-only.");
    }
    renderAll();
  });
  document.getElementById("cancel-listing-edit").addEventListener("click", resetListingForm);

  window.addEventListener("hashchange", showView);
  setupFilterOptions();
  if (storageUnavailable) notify("Saved browser data could not be read. You can continue, but changes may not persist.", "error");
  renderAll();
  showView();
})();
