/* Shared local-storage helpers (IndexedDB). Used by index.html and player.html.
 * Schema (DB "playflash", version 1):
 *   store "meta":  keyPath "id" -> { id, name, size, savedAt }
 *   store "files": key = id     -> ArrayBuffer (raw SWF bytes)
 * Nothing here ever touches the network. */
(function () {
  "use strict";
  var DB_NAME = "playflash", DB_VERSION = 1;
  function cfg() { return window.PLAYFLASH_CONFIG || { maxUploadMB: 50, maxStoredUploads: 5 }; }

  function PFError(code, message) {
    var e = new Error(message); e.name = "PFError"; e.code = code; return e;
  }

  function formatBytes(n) {
    if (n < 1024) return n + " B";
    if (n < 1048576) return (n / 1024).toFixed(1) + " KB";
    return (n / 1048576).toFixed(1) + " MB";
  }

  function makeId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    var a = new Uint8Array(16); crypto.getRandomValues(a);
    return Array.prototype.map.call(a, function (b) { return b.toString(16).padStart(2, "0"); }).join("");
  }

  function openDb() {
    return new Promise(function (resolve, reject) {
      if (!("indexedDB" in window) || !window.indexedDB) {
        return reject(PFError("idb-unavailable", "This browser has local storage turned off (private browsing can do this), so PlayFlash can't keep your file for the player page."));
      }
      var req;
      try { req = indexedDB.open(DB_NAME, DB_VERSION); }
      catch (e) { return reject(PFError("idb-unavailable", "This browser has local storage turned off (private browsing can do this), so PlayFlash can't keep your file for the player page.")); }
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
    if (!/\.swf$/i.test(file.name)) throw PFError("extension", "\u201C" + file.name + "\u201D isn't a .swf file. PlayFlash only plays Flash (.swf) files.");
    if (file.size === 0) throw PFError("empty", "That file is empty (0 bytes). Choose a different file.");
    if (file.size > max) throw PFError("too-large", "That file is " + formatBytes(file.size) + ", which is over the " + cfg().maxUploadMB + " MB limit.");
  }

  async function readFile(file) {
    try {
      if (file.arrayBuffer) return await file.arrayBuffer();
      return await new Promise(function (res, rej) {
        var r = new FileReader(); r.onload = function () { res(r.result); }; r.onerror = function () { rej(r.error); }; r.readAsArrayBuffer(file);
      });
    } catch (e) {
      console.error(e);
      throw PFError("read", "Your browser couldn't read that file. Try selecting it again.");
    }
  }

  // Basic sanity check only: confirms the SWF signature (FWS / CWS / ZWS).
  // This does NOT prove a file is valid or safe.
  function checkHeader(buf) {
    var n = Math.min(3, buf.byteLength), sig = "";
    var b = new Uint8Array(buf, 0, n);
    for (var i = 0; i < n; i++) sig += String.fromCharCode(b[i]);
    if (["FWS", "CWS", "ZWS"].indexOf(sig) === -1) {
      throw PFError("header", "This file doesn't start with a SWF header, so it may be damaged or not a Flash file.");
    }
  }

  function storageError(e) {
    console.error(e);
    if (e && (e.name === "QuotaExceededError" || (e.code === 22))) {
      return PFError("quota", "Your browser's local storage is full. Remove saved files below (or clear site data) and try again.");
    }
    if (e && e.name === "PFError") return e;
    return PFError("storage", "Couldn't save the file in this browser's local storage. Try again, or clear saved files first.");
  }

  async function listUploads() {
    var db = await openDb();
    try {
      var all = await req(db.transaction("meta").objectStore("meta").getAll());
      return all.sort(function (a, b) { return b.savedAt - a.savedAt; });
    } finally { db.close(); }
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

  async function saveUpload(file) {
    validateFile(file);
    var data = await readFile(file);
    checkHeader(data);
    var meta = { id: makeId(), name: file.name, size: file.size, savedAt: Date.now() };
    var db = await openDb();
    try {
      var tx = db.transaction(["meta", "files"], "readwrite");
      tx.objectStore("files").put(data, meta.id);
      tx.objectStore("meta").put(meta);
      await done(tx);
    } catch (e) { throw storageError(e); }
    finally { db.close(); }
    try {
      var list = await listUploads();
      await deleteUploads(list.slice(cfg().maxStoredUploads).map(function (m) { return m.id; }));
    } catch (e) { console.warn("Pruning old uploads failed", e); }
    return meta;
  }

  async function getUpload(id) {
    var db = await openDb();
    try {
      var tx = db.transaction(["meta", "files"]);
      var res = await Promise.all([req(tx.objectStore("meta").get(id)), req(tx.objectStore("files").get(id))]);
      return (res[0] && res[1]) ? { meta: res[0], data: res[1] } : null;
    } finally { db.close(); }
  }

  window.PlayFlashStorage = {
    validateFile: validateFile, saveUpload: saveUpload, getUpload: getUpload,
    listUploads: listUploads, deleteUploads: deleteUploads, clearUploads: clearUploads,
    formatBytes: formatBytes
  };
})();
