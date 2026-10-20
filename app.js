/* PlayFlash homepage: navigation, upload workflow, catalogue search/filter. */
(function () {
  "use strict";
  var cfg = window.PLAYFLASH_CONFIG;
  var Store = window.PlayFlashStorage;
  var $ = function (id) { return document.getElementById(id); };

  // Safe DOM builder: text is always inserted as text, never as HTML.
  function h(tag, props) {
    var el = document.createElement(tag);
    Object.keys(props || {}).forEach(function (k) {
      var v = props[k];
      if (v == null || v === false) return;
      if (k === "class") el.className = v;
      else if (k === "text") el.textContent = v;
      else if (k.indexOf("on") === 0) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? "" : v);
    });
    for (var i = 2; i < arguments.length; i++) { if (arguments[i] != null) el.append(arguments[i]); }
    return el;
  }

  /* ---------- Mobile navigation ---------- */
  var toggle = document.querySelector(".nav-toggle"), nav = $("site-nav");
  toggle.addEventListener("click", function () {
    var open = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
  });
  nav.addEventListener("click", function (e) {
    if (e.target.closest("a")) { nav.classList.remove("open"); toggle.setAttribute("aria-expanded", "false"); }
  });

  /* ---------- Upload ---------- */
  var dz = $("dropzone"), input = $("swf-input"), statusEl = $("upload-status"),
      errEl = $("upload-error"), selEl = $("selected-file"), chooseBtn = $("choose-btn");
  $("max-size").textContent = cfg.maxUploadMB;
  var busy = false;

  function setBusy(on, msg) {
    busy = on;
    dz.classList.toggle("busy", on);
    dz.setAttribute("aria-busy", String(on));
    chooseBtn.disabled = on;
    statusEl.textContent = msg || "";
  }
  function showError(msg) { errEl.textContent = msg; errEl.hidden = false; }
  function clearError() { errEl.hidden = true; errEl.textContent = ""; }

  async function handleFile(file) {
    if (busy) return;
    clearError();
    selEl.hidden = !file;
    if (file) selEl.textContent = "Selected: " + file.name + " (" + Store.formatBytes(file.size) + ")";
    try {
      Store.validateFile(file);
      setBusy(true, "Preparing " + file.name + "\u2026");
      var meta = await Store.saveUpload(file);
      setBusy(true, "Opening the player\u2026");
      window.location.href = "player.html?upload=" + encodeURIComponent(meta.id);
    } catch (e) {
      console.error(e);
      setBusy(false, "");
      showError(e && e.name === "PFError" ? e.message : "Something unexpected went wrong while preparing the file. Please try again.");
    } finally {
      input.value = "";
    }
  }

  chooseBtn.addEventListener("click", function (e) { e.stopPropagation(); input.click(); });
  dz.addEventListener("click", function (e) { if (e.target === dz || e.target.closest(".dz-title,.dz-sub,svg")) input.click(); });
  dz.addEventListener("keydown", function (e) {
    if (e.target === dz && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); input.click(); }
  });
  input.addEventListener("change", function () { if (input.files && input.files[0]) handleFile(input.files[0]); });

  ["dragenter", "dragover"].forEach(function (t) {
    dz.addEventListener(t, function (e) { e.preventDefault(); if (!busy) dz.classList.add("dragging"); });
  });
  ["dragleave", "dragend"].forEach(function (t) {
    dz.addEventListener(t, function () { dz.classList.remove("dragging"); });
  });
  dz.addEventListener("drop", function (e) {
    e.preventDefault(); dz.classList.remove("dragging");
    var files = e.dataTransfer && e.dataTransfer.files;
    if (!files || !files.length) return;
    if (files.length > 1) { showError("Drop one file at a time."); return; }
    handleFile(files[0]);
  });
  // Stop the browser navigating to a file dropped outside the zone.
  window.addEventListener("dragover", function (e) { e.preventDefault(); });
  window.addEventListener("drop", function (e) { e.preventDefault(); });

  /* ---------- Saved uploads ---------- */
  var recent = $("recent"), recentList = $("recent-list");
  async function renderRecent() {
    try {
      var list = await Store.listUploads();
      recentList.replaceChildren();
      recent.hidden = list.length === 0;
      list.forEach(function (m) {
        var when = new Date(m.savedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
        recentList.append(h("li", { class: "recent-item" },
          h("div", { class: "recent-info" },
            h("span", { class: "recent-name", text: m.name }),
            h("span", { class: "muted small", text: Store.formatBytes(m.size) + " \u00B7 saved " + when })),
          h("div", { class: "recent-actions" },
            h("a", { class: "btn btn-secondary btn-small", href: "player.html?upload=" + encodeURIComponent(m.id), text: "Play" }),
            h("button", { class: "btn btn-ghost btn-small", type: "button", "aria-label": "Remove " + m.name,
              text: "Remove", onclick: async function () {
                try { await Store.deleteUploads([m.id]); } catch (e) { console.error(e); showError("Couldn't remove that file."); }
                renderRecent();
              } }))));
      });
    } catch (e) {
      console.warn("Saved uploads unavailable:", e);
      recent.hidden = true;
    }
  }
  $("clear-btn").addEventListener("click", async function () {
    try { await Store.clearUploads(); statusEl.textContent = "Saved files cleared."; }
    catch (e) { console.error(e); showError("Couldn't clear saved files. You can clear this site's data in your browser settings."); }
    renderRecent();
  });
  window.addEventListener("pageshow", function (e) { if (e.persisted) { setBusy(false, ""); } renderRecent(); });

  /* ---------- Catalogue ---------- */
  var GAMES = window.PLAYFLASH_GAMES || [], CATS = window.PLAYFLASH_CATEGORIES || ["All Games"];
  var state = { query: "", category: "All Games" };
  var grid = $("grid"), empty = $("empty"), count = $("result-count"), search = $("search"), filters = $("filters");

  function isPlayable(g) { return g.status === "available" && typeof g.swfUrl === "string" && g.swfUrl.trim() !== ""; }
  function initials(title) {
    return title.split(/\s+/).filter(function (w) { return /^[A-Za-z0-9]/.test(w) && w.toLowerCase() !== "the"; })
      .slice(0, 3).map(function (w) { return w[0].toUpperCase(); }).join("");
  }

  function card(g) {
    var playable = isPlayable(g);
    var thumb, thumbUrl = window.PLAYFLASH_RESOLVE.thumb(g);
    if (thumbUrl) {
      thumb = h("div", { class: "thumb", "data-category": g.category },
        h("img", { src: thumbUrl, alt: "", loading: "lazy", decoding: "async", onerror: function (e) {
          console.warn("Thumbnail not found for " + g.id + ": " + thumbUrl + " (check the file name and folder)");
          e.target.replaceWith(h("span", { text: initials(g.title), "aria-hidden": "true" }));
        } }));
    } else {
      thumb = h("div", { class: "thumb", "data-category": g.category, "aria-hidden": "true" }, h("span", { text: initials(g.title) }));
    }
    var action = playable
      ? h("a", { class: "btn btn-primary btn-small", href: "player.html?game=" + encodeURIComponent(g.id), text: "Play", "aria-label": "Play " + g.title })
      : h("button", { class: "btn btn-disabled btn-small", type: "button", disabled: true, text: "Coming soon", "aria-label": g.title + " is not available yet" });
    return h("li", { class: "card" + (playable ? "" : " card-unavailable") },
      thumb,
      h("div", { class: "card-body" },
        h("div", { class: "badges" },
          h("span", { class: "badge badge-cat", text: g.category }),
          h("span", { class: "badge " + (playable ? "badge-ok" : "badge-soon"), text: playable ? "Playable" : "Coming soon" })),
        h("h3", { text: g.title }),
        h("p", { class: "muted", text: g.description }),
        action));
  }

  function render() {
    var q = state.query.trim().toLowerCase();
    var list = GAMES.filter(function (g) {
      if (state.category !== "All Games" && g.category !== state.category) return false;
      if (!q) return true;
      return (g.title + " " + g.category + " " + g.description).toLowerCase().indexOf(q) !== -1;
    });
    grid.replaceChildren.apply(grid, list.map(card));
    grid.hidden = list.length === 0;
    empty.hidden = list.length !== 0;
    count.textContent = list.length === 0 ? "No games found." : list.length + (list.length === 1 ? " game" : " games") + " shown.";
  }

  function renderFilters() {
    filters.replaceChildren.apply(filters, CATS.map(function (c) {
      return h("button", { class: "chip", type: "button", "aria-pressed": String(c === state.category), text: c,
        onclick: function () { state.category = c; renderFilters(); render(); } });
    }));
  }

  search.addEventListener("input", function () { state.query = search.value; render(); });
  $("reset-btn").addEventListener("click", function () {
    state.query = ""; state.category = "All Games"; search.value = ""; renderFilters(); render(); search.focus();
  });

  renderFilters(); render(); renderRecent();
})();
