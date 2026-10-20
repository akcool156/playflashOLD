/* PlayFlash player page: loads Ruffle, then plays an upload (?upload=ID) or a catalogue game (?game=ID). */
(function () {
  "use strict";
  var cfg = window.PLAYFLASH_CONFIG, Store = window.PlayFlashStorage;
  var $ = function (id) { return document.getElementById(id); };
  var els = {
    title: $("game-title"), sub: $("game-sub"), wrap: $("stage-wrap"), stage: $("stage"),
    loading: $("loading"), loadingText: $("loading-text"), error: $("error"),
    errTitle: $("error-title"), errMsg: $("error-msg"), errActions: $("error-actions"),
    restart: $("restart-btn"), fs: $("fs-btn"), newtab: $("newtab-btn"), notice: $("notice")
  };
  var swfBytes = null, swfName = "game.swf", player = null, token = 0;

  function notice(msg) { els.notice.textContent = msg; }
  function setLoading(on, msg) { els.loading.hidden = !on; if (msg) els.loadingText.textContent = msg; }
  function setControls(on) { els.restart.disabled = els.fs.disabled = els.newtab.disabled = !on; }

  function showError(title, msg, links) {
    setLoading(false);
    els.errTitle.textContent = title;
    els.errMsg.textContent = msg;
    els.errActions.replaceChildren();
    (links || [{ href: "index.html", text: "Back to PlayFlash" }]).forEach(function (l, i) {
      var a = document.createElement("a");
      a.className = "btn btn-small " + (i === 0 ? "btn-primary" : "btn-secondary");
      a.href = l.href; a.textContent = l.text;
      els.errActions.append(a);
    });
    els.error.hidden = false;
  }
  var UPLOAD_LINKS = [{ href: "index.html#upload", text: "Back to upload" }, { href: "index.html#games", text: "Browse games" }];

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = src; s.async = true;
      s.onload = resolve;
      s.onerror = function () { s.remove(); reject(new Error("Could not load " + src)); };
      document.head.appendChild(s);
    });
  }

  async function ensureRuffle() {
    if (window.RufflePlayer) return;
    var sources = cfg.ruffleSources || [];
    for (var i = 0; i < sources.length; i++) {
      try { await loadScript(sources[i]); if (window.RufflePlayer) return; }
      catch (e) { console.warn(e.message); }
    }
    var err = new Error("Ruffle unavailable"); err.code = "ruffle-cdn"; throw err;
  }

  async function startGame() {
    var mine = ++token;
    els.error.hidden = true;
    setControls(false);
    setLoading(true, "Starting " + swfName + "\u2026");
    if (player) { try { player.remove(); } catch (e) { /* ignore */ } player = null; }
    els.stage.replaceChildren();
    try {
      var ruffle = window.RufflePlayer.newest();
      player = ruffle.createPlayer();
      player.style.width = "100%"; player.style.height = "100%";
      els.stage.append(player);
      player.addEventListener("loadedmetadata", function () { if (mine === token) setLoading(false); });
      // Ruffle's player element exposes load() directly; older builds expose it via ruffle().
      var api = typeof player.load === "function" ? player : player.ruffle();
      await api.load({
        data: new Uint8Array(swfBytes.slice(0)),   // copy so Restart can reuse the original bytes
        swfFileName: swfName,
        allowScriptAccess: false,                  // keep page script access disabled
        autoplay: "auto",
        letterbox: "on",
        unmuteOverlay: "visible",
        warnOnUnsupportedContent: true
      });
      if (mine !== token) return;
      setLoading(false);
      setControls(true);
      notice("Game loaded. Click it once to give it keyboard focus.");
    } catch (e) {
      if (mine !== token) return;
      console.error("Ruffle failed to load the SWF:", e);
      setControls(true); els.restart.disabled = false;
      showError("This game couldn't be started",
        "Ruffle couldn't run this file. It may be damaged, depend on other files it can't find, or use Flash features Ruffle doesn't support yet.",
        [{ href: "index.html", text: "Back to PlayFlash" }]);
    }
  }

  /* ---------- Controls ---------- */
  els.restart.addEventListener("click", function () { notice("Restarting\u2026"); startGame(); });
  els.newtab.addEventListener("click", function () {
    var w = window.open(window.location.href, "_blank", "noopener");
    if (!w) notice("Your browser blocked the new tab. Allow pop-ups for this site and try again.");
  });
  async function toggleFullscreen() {
    var cur = document.fullscreenElement || document.webkitFullscreenElement;
    try {
      if (cur) { await (document.exitFullscreen || document.webkitExitFullscreen).call(document); }
      else {
        var rq = els.wrap.requestFullscreen || els.wrap.webkitRequestFullscreen;
        if (!rq) throw new Error("Fullscreen API not supported");
        await rq.call(els.wrap);
      }
    } catch (e) {
      console.warn("Fullscreen failed:", e);
      notice("Fullscreen isn't available in this browser or was blocked. On iPhone, try rotating your device instead.");
    }
  }
  els.fs.addEventListener("click", toggleFullscreen);
  function onFsChange() {
    var on = !!(document.fullscreenElement || document.webkitFullscreenElement);
    els.fs.textContent = on ? "Exit fullscreen" : "Fullscreen";
    window.dispatchEvent(new Event("resize"));   // let Ruffle re-measure its container
  }
  document.addEventListener("fullscreenchange", onFsChange);
  document.addEventListener("webkitfullscreenchange", onFsChange);

  /* ---------- Resolve the game source ---------- */
  async function resolveSource() {
    var params = new URLSearchParams(window.location.search);
    var uploadId = params.get("upload"), gameId = params.get("game");

    if (uploadId) {
      var rec;
      try { rec = await Store.getUpload(uploadId); }
      catch (e) {
        console.error(e);
        showError("Can't reach local storage", e.message || "This browser couldn't open its local storage.", UPLOAD_LINKS);
        return false;
      }
      if (!rec) {
        showError("That file isn't available any more",
          "Saved uploads live only in this browser. This one was removed, or the site data was cleared. Choose the file again to keep playing.", UPLOAD_LINKS);
        return false;
      }
      swfBytes = rec.data; swfName = rec.meta.name;
      els.title.textContent = rec.meta.name;
      els.sub.textContent = "Your upload \u00B7 " + Store.formatBytes(rec.meta.size) + " \u00B7 stored only on this device";
      document.title = rec.meta.name + " | PlayFlash";
      return true;
    }

    if (gameId) {
      var g = (window.PLAYFLASH_GAMES || []).filter(function (x) { return x.id === gameId; })[0];
      if (!g) { showError("Game not found", "That game isn't in the PlayFlash library.", [{ href: "index.html#games", text: "Browse games" }]); return false; }
      els.title.textContent = g.title; document.title = g.title + " | PlayFlash";
      els.sub.textContent = g.category;
      if (!(g.status === "available" && typeof g.swfUrl === "string" && g.swfUrl.trim())) {
        showError("Coming soon", g.title + " doesn't have a playable file yet.", [{ href: "index.html#games", text: "Browse games" }]);
        return false;
      }
      setLoading(true, "Downloading " + g.title + "\u2026");
      try {
        var res = await fetch(g.swfUrl);
        if (!res.ok) throw new Error("HTTP " + res.status);
        swfBytes = await res.arrayBuffer();
        if (!swfBytes.byteLength) throw new Error("Empty response");
      } catch (e) {
        console.error("Catalogue fetch failed:", e);
        showError("Couldn't download this game",
          "The game file is missing or its host doesn't allow it to be loaded from this site. Try again later.",
          [{ href: "index.html#games", text: "Browse games" }]);
        return false;
      }
      swfName = g.title + ".swf";
      return true;
    }

    els.title.textContent = "No game selected";
    showError("Nothing to play yet", "Choose a game from the library or upload a .swf file to get started.", UPLOAD_LINKS);
    return false;
  }

  (async function init() {
    try {
      if (!(await resolveSource())) return;
      setLoading(true, "Loading Ruffle\u2026");
      try { await ensureRuffle(); }
      catch (e) {
        console.error(e);
        showError("Ruffle couldn't be loaded",
          "The Flash emulator is loaded from a public CDN and couldn't be reached. Check your connection or any content blocker, then reload.",
          [{ href: window.location.href, text: "Reload" }, { href: "index.html", text: "Back to PlayFlash" }]);
        return;
      }
      await startGame();
    } catch (e) {
      console.error(e);
      showError("Something went wrong", "An unexpected error stopped the player. Reload the page or go back and try again.");
    }
  })();
})();
