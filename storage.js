/* Shared local-library helpers (IndexedDB). Used by index.html and player.html.
 * Schema (DB "playflash", version 1):
 *   store "meta":  keyPath "id" -> { id, name, title, size, savedAt, favorite, plays, playSeconds, lastPlayedAt, cover }
 *   store "files": key = id     -> ArrayBuffer (raw SWF bytes)
 * Older records without the newer fields still work (missing fields get defaults).
 * Nothing here ever touches the network. */
(function () {
  "use strict";
  var DB_NAME = "playflash", DB_VERSION = 1;
  var SERIOUS = ["idb-unavailable", "idb-open", "quota", "storage"];
  function cfg() { return window.PLAYFLASH_CONFIG || { maxUploadMB: 50 }; }

  function PFError(code, message) { var e = new Error(message); e.name = "PFError"; e.code = code; return e; }

  function formatBytes(n) {
    if (n < 1024) return n + " B";
    if (n < 1048576) return (n / 1024).toFixed(1) + " KB";
    if (n < 1073741824) return (n / 1048576).toFixed(1) + " MB";
    return (n / 1073741824).toFixed(2) + " GB";
  }
  // 42 s  ->  12 min 5 s  ->  2 h 15 min
  function formatPlaytime(total) {
    var s = Math.max(0, Math.floor(total || 0));
    if (s < 60) return s + " s";
    if (s < 3600) { var m = Math.floor(s / 60), r = s % 60; return m + " min" + (r ? " " + r + " s" : ""); }
    var h = Math.floor(s / 3600), mm = Math.floor((s % 3600) / 60);
    return h + " h" + (mm ? " " + mm + " min" : "");
  }
  function autoTitle(name) { return String(name).replace(/\.swf$/i, "").trim() || String(name); }
  function titleOf(m) { return (m.title && m.title.trim()) || autoTitle(m.name); }

  function makeId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    var a = new Uint8Array(16); crypto.getRandomValues(a);
    return Array.prototype.map.call(a, function (b) { return b.toString(16).padStart(2, "0"); }).join("");
  }

  var NO_IDB = "This browser has local storage turned off (private browsing can do this), so PlayFlash can't keep your library.";
  function openDb() {
    return new Promise(function (resolve, reject) {
      if (!window.indexedDB) return reject(PFError("idb-unavailable", NO_IDB));
      var req;
      try { req = indexedDB.open(DB_NAME, DB_VERSION); } catch (e) { return reject(PFError("idb-unavailable", NO_IDB)); }
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains("meta")) db.createObjectStore("meta", { keyPath: "id" });
        if (!db.objectStoreNames.contains("files")) db.createObjectStore("files");
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { console.error(req.error); reject(PFError("idb-open", "Couldn't open this browser's local storage. Check that site data isn't blocked, then try again.")); };
    });
  }
  function req(r) { return new Promise(function (res, rej) { r.onsuccess = function () { res(r.result); }; r.onerror = function () { rej(r.error); }; }); }
  function done(tx) { return new Promise(function (res, rej) { tx.oncomplete = res; tx.onerror = function () { rej(tx.error); }; tx.onabort = function () { rej(tx.error || new Error("Transaction aborted")); }; }); }

  function validateFile(file) {
    var max = cfg().maxUploadMB * 1048576;
    if (!file) throw PFError("no-file", "Choose a .swf file first.");
    if (!/\.swf$/i.test(file.name)) throw PFError("extension", "That isn't a .swf file. PlayFlash only plays Flash (.swf) files.");
    if (file.size === 0) throw PFError("empty", "That file is empty (0 bytes).");
    if (file.size > max) throw PFError("too-large", "That file is " + formatBytes(file.size) + ", over the " + cfg().maxUploadMB + " MB limit.");
  }

  async function readFile(file) {
    try {
      if (file.arrayBuffer) return await file.arrayBuffer();
      return await new Promise(function (res, rej) {
        var r = new FileReader(); r.onload = function () { res(r.result); }; r.onerror = function () { rej(r.error); }; r.readAsArrayBuffer(file);
      });
    } catch (e) { console.error(e); throw PFError("read", "Your browser couldn't read that file. Try selecting it again."); }
  }

  // Basic sanity check only (FWS / CWS / ZWS signature). Does NOT prove a file is valid or safe.
  function checkHeader(buf) {
    var n = Math.min(3, buf.byteLength), sig = "", b = new Uint8Array(buf, 0, n);
    for (var i = 0; i < n; i++) sig += String.fromCharCode(b[i]);
    if (["FWS", "CWS", "ZWS"].indexOf(sig) === -1) throw PFError("header", "This file doesn't start with a SWF header, so it may be damaged or not a Flash file.");
  }

  function storageError(e) {
    console.error(e);
    if (e && (e.name === "QuotaExceededError" || e.code === 22)) return PFError("quota", "Your browser's local storage is full. Remove some games from your library (or free up disk space) and try again.");
    if (e && e.name === "PFError") return e;
    return PFError("storage", "Couldn't save the file in this browser's local storage. Try again.");
  }

  async function listUploads() {
    var db = await openDb();
    try {
      var all = await req(db.transaction("meta").objectStore("meta").getAll());
      return all.map(function (m) {
        m.title = titleOf(m); m.favorite = !!m.favorite; m.plays = m.plays || 0; m.lastPlayedAt = m.lastPlayedAt || 0; m.playSeconds = m.playSeconds || 0; m.cover = m.cover || "";
        return m;
      });
    } finally { db.close(); }
  }

  async function saveUpload(file) {
    validateFile(file);
    var data = await readFile(file);
    checkHeader(data);
    var meta = { id: makeId(), name: file.name, title: autoTitle(file.name), size: file.size, savedAt: Date.now(), favorite: false, plays: 0, playSeconds: 0, lastPlayedAt: 0, cover: "" };
    var db = await openDb();
    try {
      var tx = db.transaction(["meta", "files"], "readwrite");
      tx.objectStore("files").put(data, meta.id);
      tx.objectStore("meta").put(meta);
      await done(tx);
    } catch (e) { throw storageError(e); } finally { db.close(); }
    // Ask the browser not to evict the library when disk space is low (harmless if refused).
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function () {});
    return meta;
  }

  async function getUpload(id) {
    var db = await openDb();
    try {
      var tx = db.transaction(["meta", "files"]);
      var res = await Promise.all([req(tx.objectStore("meta").get(id)), req(tx.objectStore("files").get(id))]);
      if (!(res[0] && res[1])) return null;
      res[0].title = titleOf(res[0]);
      return { meta: res[0], data: res[1] };
    } finally { db.close(); }
  }

  // fn receives a copy of the current record and returns the new one.
  function updateMeta(id, fn) {
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction("meta", "readwrite"), store = tx.objectStore("meta"), out = null;
        var g = store.get(id);
        g.onsuccess = function () { if (!g.result) return; out = fn(Object.assign({}, g.result)); store.put(out); };
        tx.oncomplete = function () { db.close(); resolve(out); };
        tx.onerror = function () { db.close(); reject(storageError(tx.error)); };
        tx.onabort = function () { db.close(); reject(storageError(tx.error)); };
      });
    });
  }

  async function deleteUploads(ids) {
    if (!ids.length) return;
    var db = await openDb();
    try {
      var tx = db.transaction(["meta", "files"], "readwrite");
      ids.forEach(function (id) { tx.objectStore("meta").delete(id); tx.objectStore("files").delete(id); });
      await done(tx);
    } finally { db.close(); }
  }

  async function clearUploads() {
    var db = await openDb();
    try {
      var tx = db.transaction(["meta", "files"], "readwrite");
      tx.objectStore("meta").clear(); tx.objectStore("files").clear();
      await done(tx);
    } finally { db.close(); }
  }

  // Playtime seconds noted while a tab is closing are parked in localStorage (a synchronous write that
  // survives page unload) and merged into the library next time any page loads.
  var PENDING_KEY = "playflash-pending";
  function stashPending(id, seconds) {
    try {
      var o = JSON.parse(localStorage.getItem(PENDING_KEY) || "{}");
      o[id] = (o[id] || 0) + seconds;
      localStorage.setItem(PENDING_KEY, JSON.stringify(o));
    } catch (e) { /* storage blocked: lose a few seconds, nothing else */ }
  }
  async function applyPending() {
    var o;
    try { o = JSON.parse(localStorage.getItem(PENDING_KEY) || "{}"); localStorage.removeItem(PENDING_KEY); } catch (e) { return; }
    var ids = Object.keys(o);
    for (var i = 0; i < ids.length; i++) {
      try { await updateMeta(ids[i], function (m) { m.playSeconds = (m.playSeconds || 0) + o[ids[i]]; return m; }); }
      catch (e) { console.warn("Couldn't merge saved playtime:", e); }
    }
  }

  // true = browser promised not to auto-delete the library; false = it may; null = unknown.
  async function isPersistent() {
    try { return navigator.storage && navigator.storage.persisted ? await navigator.storage.persisted() : null; }
    catch (e) { return null; }
  }

  window.PlayFlashStorage = {
    validateFile: validateFile, saveUpload: saveUpload, getUpload: getUpload, listUploads: listUploads,
    updateMeta: updateMeta, stashPending: stashPending, applyPending: applyPending, deleteUploads: deleteUploads, clearUploads: clearUploads, isPersistent: isPersistent,
    formatBytes: formatBytes, formatPlaytime: formatPlaytime, autoTitle: autoTitle, titleOf: titleOf, isSerious: function (e) { return !!e && SERIOUS.indexOf(e.code) !== -1; }
  };
})();
