/* PlayFlash library page: browse, search, sort, rename, favourite and remove saved games. */
(function () {
  "use strict";
  var Store = window.PlayFlashStorage, UI = window.PlayFlashUI, h = UI.h, msgOf = UI.msgOf;
  var $ = function (id) { return document.getElementById(id); };

  var library = [];
  var state = { query: "", filter: "all", sort: "added" };
  var grid = $("grid"), empty = $("empty"), tools = $("lib-tools"), foot = $("lib-foot"),
      summary = $("lib-summary"), search = $("search"), sortSel = $("sort"),
      statusEl = $("lib-status"), errEl = $("lib-error");

  function showError(msg) { errEl.textContent = msg; errEl.hidden = false; }
  function clearError() { errEl.hidden = true; errEl.textContent = ""; }

  function tone(id) { var n = 0; for (var i = 0; i < id.length; i++) n = (n * 31 + id.charCodeAt(i)) >>> 0; return n % 4; }
  function initials(title) {
    var w = title.split(/\s+/).filter(function (x) { return /^[A-Za-z0-9]/.test(x); }).slice(0, 3);
    return (w.map(function (x) { return x[0].toUpperCase(); }).join("") || "SWF");
  }
  function fmtDate(t) { return new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); }

  async function loadLibrary() {
    try { await Store.applyPending(); } catch (e) { /* ignore */ }
    try { library = await Store.listUploads(); }
    catch (e) {
      console.warn("Library unavailable:", e);
      library = [];
      summary.textContent = msgOf(e, "Your library couldn't be opened.");
      tools.hidden = true; foot.hidden = true; grid.replaceChildren(); empty.hidden = true;
      return;
    }
    renderLibrary();
    updateStorageNote();
  }

  function visible() {
    var q = state.query.trim().toLowerCase();
    var list = library.filter(function (m) {
      if (state.filter === "favorites" && !m.favorite) return false;
      return !q || (m.title + " " + m.name).toLowerCase().indexOf(q) !== -1;
    });
    var by = {
      added: function (a, b) { return b.savedAt - a.savedAt; },
      played: function (a, b) { return (b.lastPlayedAt - a.lastPlayedAt) || (b.savedAt - a.savedAt); },
      name: function (a, b) { return a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: "base" }); },
      plays: function (a, b) { return (b.plays - a.plays) || (b.savedAt - a.savedAt); },
      time: function (a, b) { return (b.playSeconds - a.playSeconds) || (b.savedAt - a.savedAt); }
    };
    return list.sort(by[state.sort] || by.added);
  }

  function card(m) {
    var thumb = h("div", { class: "thumb", "data-tone": String(tone(m.id)) },
      m.cover ? h("img", { src: m.cover, alt: "", loading: "lazy", decoding: "async" })
              : h("span", { text: initials(m.title), "aria-hidden": "true" }),
      m.favorite ? h("span", { class: "fav-mark", text: "\u2605", "aria-hidden": "true" }) : null);
    var line1 = m.plays ? "Played " + m.plays + (m.plays === 1 ? " time" : " times") : "Not played yet";
    var line2 = "Added " + fmtDate(m.savedAt) + " \u00B7 " + Store.formatBytes(m.size) + (m.lastPlayedAt ? " \u00B7 Last played " + fmtDate(m.lastPlayedAt) : "");
    return h("li", { class: "card" },
      thumb,
      h("div", { class: "card-body" },
        h("h3", { text: m.title }),
        h("p", { class: "playtime" },
          h("span", { class: "pt-label", text: "Playtime " }),
          h("span", { class: "pt-value", text: Store.formatPlaytime(m.playSeconds) }),
          h("span", { class: "card-meta", text: " \u00B7 " + line1 })),
        h("p", { class: "card-meta", text: line2 }),
        h("div", { class: "card-actions" },
          h("a", { class: "btn btn-primary btn-small", href: "player.html?upload=" + encodeURIComponent(m.id), text: "Play", "aria-label": "Play " + m.title }),
          h("button", { class: "btn btn-secondary btn-small fav-btn", type: "button", "aria-pressed": String(m.favorite),
            "aria-label": (m.favorite ? "Remove " : "Add ") + m.title + (m.favorite ? " from favourites" : " to favourites"),
            text: m.favorite ? "\u2605 Favourite" : "\u2606 Favourite", onclick: function () { toggleFavorite(m); } }),
          h("button", { class: "btn btn-ghost btn-small", type: "button", text: "Edit", "aria-label": "Edit " + m.title, onclick: function () { openEdit(m); } }),
          h("button", { class: "btn btn-ghost btn-small", type: "button", text: "Remove", "aria-label": "Remove " + m.title, onclick: function () { removeGame(m); } }))));
  }

  function showEmpty(title, text, action) {
    empty.replaceChildren(h("h3", { text: title }), h("p", { text: text }), action);
    empty.hidden = false;
  }

  function renderLibrary() {
    var total = library.length;
    tools.hidden = total === 0;
    foot.hidden = total === 0;
    if (total === 0) {
      summary.textContent = "Games you add are saved here, on this device only.";
      grid.replaceChildren();
      showEmpty("Your library is empty", "Add a .swf file and it will show up here, ready to play any time.",
        h("a", { class: "btn btn-primary", href: "index.html#upload", text: "Add a game" }));
      return;
    }
    var bytes = library.reduce(function (s, m) { return s + m.size; }, 0);
    var secs = library.reduce(function (s, m) { return s + m.playSeconds; }, 0);
    summary.textContent = total + (total === 1 ? " game" : " games") + " \u00B7 " + Store.formatBytes(bytes) + " stored on this device"
      + (secs ? " \u00B7 " + Store.formatPlaytime(secs) + " total playtime" : "") + ".";
    var list = visible();
    grid.replaceChildren.apply(grid, list.map(card));
    grid.hidden = list.length === 0;
    if (list.length === 0) {
      var favOnly = state.filter === "favorites" && !state.query.trim();
      showEmpty(favOnly ? "No favourites yet" : "No games match that search",
        favOnly ? "Press the star on a game to pin it here." : "Try a different name, or show everything again.",
        h("button", { class: "btn btn-secondary", type: "button", text: "Show all games", onclick: function () {
          state.query = ""; state.filter = "all"; search.value = ""; syncFilters(); renderLibrary(); announceCount(); search.focus(); } }));
    } else { empty.hidden = true; }
  }

  // Announce "x of y games shown" after the person searches or filters.
  function announceCount() {
    var n = visible().length, total = library.length;
    statusEl.textContent = n === 0 ? "No games found." : (n === total ? "" : n + " of " + total + " games shown.");
  }

  function syncFilters() {
    document.querySelectorAll("#filters .chip").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-filter") === state.filter)); });
  }
  document.querySelectorAll("#filters .chip").forEach(function (b) {
    b.addEventListener("click", function () { state.filter = b.getAttribute("data-filter"); syncFilters(); renderLibrary(); announceCount(); });
  });
  search.addEventListener("input", function () { state.query = search.value; renderLibrary(); announceCount(); });
  sortSel.addEventListener("change", function () { state.sort = sortSel.value; renderLibrary(); });

  async function updateStorageNote() {
    var p = await Store.isPersistent(), note = $("storage-note");
    if (p === true) note.textContent = "Your browser has marked this library as protected from automatic cleanup. Clearing site data will still remove it.";
    else if (p === false) note.textContent = "Browsers can clear local data if disk space runs low, and clearing site data removes it. Keep your original .swf files as a backup.";
    else note.textContent = "Clearing site data removes your library. Keep your original .swf files as a backup.";
  }

  async function toggleFavorite(m) {
    clearError(); statusEl.textContent = "";
    try { await Store.updateMeta(m.id, function (r) { r.favorite = !r.favorite; return r; }); }
    catch (e) { console.error(e); showError(msgOf(e, "Couldn't update that game.")); }
    await loadLibrary();
  }

  async function removeGame(m) {
    if (!window.confirm("Remove \u201C" + m.title + "\u201D from your library?\n\nThis deletes it from this browser only. Your original file isn't touched.")) return;
    clearError();
    try { await Store.deleteUploads([m.id]); statusEl.textContent = "Removed " + m.title + "."; }
    catch (e) { console.error(e); showError("Couldn't remove that game."); }
    await loadLibrary();
  }

  $("clear-btn").addEventListener("click", async function () {
    if (!window.confirm("Remove ALL " + library.length + " games from your library?\n\nThis deletes them from this browser only. Your original files aren't touched.")) return;
    clearError();
    try { await Store.clearUploads(); statusEl.textContent = "Library cleared."; }
    catch (e) { console.error(e); showError("Couldn't clear your library. You can clear this site's data in your browser settings."); }
    await loadLibrary();
  });

  /* ---------- Edit dialog (rename + cover image) ---------- */
  var dlg = $("edit-dialog"), form = $("edit-form"), nameIn = $("edit-name"), editErr = $("edit-error"),
      coverBox = $("edit-cover"), coverIn = $("cover-input"), editing = null, newCover;   // newCover: undefined = unchanged, "" = removed

  function paintCover() {
    var src = newCover !== undefined ? newCover : editing.cover;
    coverBox.replaceChildren(src ? h("img", { src: src, alt: "" }) : h("span", { text: initials(editing.title) }));
    $("cover-remove").disabled = !src;
  }
  function openEdit(m) {
    editing = m; newCover = undefined;
    nameIn.value = m.title; $("edit-file").textContent = "File: " + m.name + ". Leave the name empty to use the file name.";
    editErr.hidden = true; paintCover();
    if (typeof dlg.showModal === "function") dlg.showModal(); else dlg.setAttribute("open", "");
    nameIn.focus(); nameIn.select();
  }
  function closeEdit() { if (dlg.open) dlg.close(); editing = null; }

  // Resize to a small 16:9 JPEG so covers stay light in storage.
  function makeCover(file) {
    return new Promise(function (resolve, reject) {
      if (!/^image\//.test(file.type)) return reject(new Error("Choose an image file (PNG, JPEG, WebP or GIF)."));
      if (file.size > 15 * 1048576) return reject(new Error("That image is over 15 MB. Choose a smaller one."));
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        try {
          var W = 480, H = 270, c = document.createElement("canvas"); c.width = W; c.height = H;
          var ctx = c.getContext("2d"), s = Math.max(W / img.naturalWidth, H / img.naturalHeight);
          var w = img.naturalWidth * s, hh = img.naturalHeight * s;
          ctx.fillStyle = "#171C26"; ctx.fillRect(0, 0, W, H);
          ctx.drawImage(img, (W - w) / 2, (H - hh) / 2, w, hh);
          resolve(c.toDataURL("image/jpeg", 0.82));
        } catch (e) { reject(new Error("Couldn't process that image.")); }
        finally { URL.revokeObjectURL(url); }
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error("Couldn't read that image.")); };
      img.src = url;
    });
  }

  $("cover-choose").addEventListener("click", function () { coverIn.click(); });
  coverIn.addEventListener("change", async function () {
    var f = coverIn.files && coverIn.files[0]; coverIn.value = "";
    if (!f) return;
    editErr.hidden = true;
    try { newCover = await makeCover(f); paintCover(); }
    catch (e) { editErr.textContent = e.message; editErr.hidden = false; }
  });
  $("cover-remove").addEventListener("click", function () { newCover = ""; paintCover(); });
  $("edit-cancel").addEventListener("click", closeEdit);
  dlg.addEventListener("click", function (e) { if (e.target === dlg) closeEdit(); });   // click on backdrop
  dlg.addEventListener("close", function () { editing = null; });

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    if (!editing) return;
    var id = editing.id, auto = Store.autoTitle(editing.name);
    var title = nameIn.value.replace(/\s+/g, " ").trim() || auto;
    var cover = newCover;
    try {
      await Store.updateMeta(id, function (r) { r.title = title; if (cover !== undefined) r.cover = cover; return r; });
      closeEdit();
      statusEl.textContent = "Saved changes to " + title + ".";
    } catch (err) {
      console.error(err);
      editErr.textContent = msgOf(err, "Couldn't save your changes. Your browser's storage may be full.");
      editErr.hidden = false; return;
    }
    await loadLibrary();
  });

  // Refresh when coming back from the player (back button or another tab updated playtime).
  window.addEventListener("pageshow", function () { loadLibrary(); });
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible") loadLibrary(); });
  loadLibrary();
})();
