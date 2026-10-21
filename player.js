/* PlayFlash player page: loads Ruffle, then plays a game from the local library (?upload=ID). */
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
  // "Full tab" mode (?tab=1): slim top bar, game fills the rest of the tab.
  if (new URLSearchParams(window.location.search).get("tab") === "1") document.body.classList.add("tab-mode");
  var swfBytes = null, swfName = "game.swf", gameId = null, counted = false, player = null, token = 0;

  function notice(msg) { els.notice.textContent = msg; }
  function setLoading(on, msg) { els.loading.hidden = !on; if (msg) els.loadingText.textContent = msg; }
  function setControls(on) { els.restart.disabled = els.fs.disabled = els.newtab.disabled = !on; }

  function showError(title, msg, links) {
    setLoading(false);
    els.errTitle.textContent = title;
    els.errMsg.textContent = msg;
    els.errActions.replaceChildren();
    (links || [{ href: "library.html", text: "Back to my library" }]).forEach(function (l, i) {
      var a = document.createElement("a");
      a.className = "btn btn-small " + (i === 0 ? "btn-primary" : "btn-secondary");
      a.href = l.href; a.textContent = l.text;
      els.errActions.append(a);
    });
    els.error.hidden = false;
  }
  var LIB_LINKS = [{ href: "library.html", text: "Back to my library" }, { href: "index.html#upload", text: "Add a SWF" }];

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

  /* ---------- Playtime ----------
   * Counts seconds while a game is running and this tab is visible, and saves them to the library
   * every 10 seconds and whenever the tab is hidden or closed. */
  var running = false, playMs = 0, lastTick = Date.now();
  function tick(wasVisible) {   // wasVisible: the tab has only just been hidden, so the time up to now still counts
    var now = Date.now();
    if (running && (wasVisible || document.visibilityState === "visible")) playMs += Math.min(now - lastTick, 5000);
    lastTick = now;
  }
  function flushPlaytime() {
    tick();
    var whole = Math.floor(playMs / 1000);
    if (whole < 1 || !gameId) return;
    playMs -= whole * 1000;
    Store.updateMeta(gameId, function (m) { m.playSeconds = (m.playSeconds || 0) + whole; return m; })
      .catch(function (e) { console.warn("Couldn't save playtime:", e); });
  }
  setInterval(tick, 1000);
  setInterval(flushPlaytime, 10000);
  // When the tab is hidden or closing, park the seconds synchronously; they're merged on the next load.
  function stashPlaytime(wasVisible) {
    tick(wasVisible === true);
    var whole = Math.floor(playMs / 1000);
    if (whole < 1 || !gameId) return;
    playMs -= whole * 1000;
    Store.stashPending(gameId, whole);
  }
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") stashPlaytime(true);
    else { lastTick = Date.now(); Store.applyPending(); }
  });
  window.addEventListener("pagehide", function () { stashPlaytime(true); });

  function countPlay() {
    if (counted || !gameId) return;
    counted = true;
    Store.updateMeta(gameId, function (m) { m.plays = (m.plays || 0) + 1; m.lastPlayedAt = Date.now(); return m; })
      .catch(function (e) { console.warn("Couldn't record play:", e); });
  }

  async function startGame() {
    var mine = ++token;
    els.error.hidden = true;
    running = false; flushPlaytime();
    setControls(false);
    setLoading(true, "Starting " + els.title.textContent + "\u2026");
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
      lastTick = Date.now(); running = true;
      countPlay();
      notice("Game loaded. Click it once to give it keyboard focus.");
    } catch (e) {
      if (mine !== token) return;
      console.error("Ruffle failed to load the SWF:", e);
      running = false;
      setControls(true);
      showError("This game couldn't be started",
        "Ruffle couldn't run this file. It may be damaged, depend on other files it can't find, or use Flash features Ruffle doesn't support yet.",
        LIB_LINKS);
    }
  }

  /* ---------- Controls ---------- */
  els.restart.addEventListener("click", function () { notice("Restarting\u2026"); startGame(); });
  els.newtab.addEventListener("click", function () {
    var u = new URL(window.location.href); u.searchParams.set("tab", "1");
    var w = window.open(u.href, "_blank", "noopener");
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

  /* ---------- Find the game in the local library ---------- */
  async function resolveSource() {
    var id = new URLSearchParams(window.location.search).get("upload");
    if (!id) {
      els.title.textContent = "No game selected";
      showError("Nothing to play yet", "Pick a game from your library, or add a .swf file to get started.", LIB_LINKS);
      return false;
    }
    var rec;
    try { rec = await Store.getUpload(id); }
    catch (e) {
      console.error(e);
      showError("Can't reach local storage", e.message || "This browser couldn't open its local storage.", LIB_LINKS);
      return false;
    }
    if (!rec) {
      els.title.textContent = "Game not found";
      showError("That game isn't in your library",
        "Your library lives only in this browser. This game was removed, or the site data was cleared. Add the file again to keep playing.", LIB_LINKS);
      return false;
    }
    gameId = id; swfBytes = rec.data; swfName = rec.meta.name;
    els.title.textContent = rec.meta.title;
    els.sub.textContent = rec.meta.name + " \u00B7 " + Store.formatBytes(rec.meta.size) + " \u00B7 stored only on this device";
    document.title = rec.meta.title + " | PlayFlash";
    return true;
  }

  (async function init() {
    Store.applyPending();
    try {
      if (!(await resolveSource())) return;
      setLoading(true, "Loading Ruffle\u2026");
      try { await ensureRuffle(); }
      catch (e) {
        console.error(e);
        showError("Ruffle couldn't be loaded",
          "The Flash emulator is loaded from a public CDN and couldn't be reached. Check your connection or any content blocker, then reload.",
          [{ href: window.location.href, text: "Reload" }, { href: "library.html", text: "Back to my library" }]);
        return;
      }
      await startGame();
    } catch (e) {
      console.error(e);
      showError("Something went wrong", "An unexpected error stopped the player. Reload the page or go back and try again.");
    }
  })();
})();
