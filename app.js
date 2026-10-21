/* PlayFlash home page: adding games to the library. */
(function () {
  "use strict";
  var cfg = window.PLAYFLASH_CONFIG, Store = window.PlayFlashStorage, msgOf = window.PlayFlashUI.msgOf;
  var $ = function (id) { return document.getElementById(id); };

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
  function openGame(id) { window.location.href = "player.html?upload=" + encodeURIComponent(id); }

  async function updateLibLink() {
    var el = $("ll-text");
    try {
      var list = await Store.listUploads();
      el.textContent = list.length
        ? list.length + (list.length === 1 ? " game" : " games") + " saved on this device."
        : "Games you add are saved here, on this device.";
    } catch (e) { console.warn(e); el.textContent = "Your saved games live here, on this device."; }
  }

  async function handleFiles(fileList) {
    if (busy) return;
    var files = Array.prototype.slice.call(fileList || []);
    if (!files.length) return;
    clearError();
    var multi = files.length > 1;
    selEl.hidden = false;
    selEl.textContent = multi ? files.length + " files selected" : "Selected: " + files[0].name + " (" + Store.formatBytes(files[0].size) + ")";
    setBusy(true, "Preparing\u2026");

    var existing;
    try { existing = await Store.listUploads(); }
    catch (e) { console.error(e); setBusy(false, ""); showError(msgOf(e, "Couldn't open your library.")); input.value = ""; return; }

    var added = [], dupes = [], errors = [], lastDupe = null;
    for (var i = 0; i < files.length; i++) {
      var f = files[i];
      try {
        Store.validateFile(f);
        var dup = existing.filter(function (m) { return m.name === f.name && m.size === f.size; })[0];
        if (dup) { dupes.push(f.name); lastDupe = dup; continue; }
        setBusy(true, multi ? "Adding " + f.name + " (" + (i + 1) + " of " + files.length + ")\u2026" : "Preparing " + f.name + "\u2026");
        var meta = await Store.saveUpload(f);
        existing.push(meta); added.push(meta);
      } catch (e) {
        console.error(e);
        var m = msgOf(e, "Something unexpected went wrong while preparing this file.");
        errors.push(multi ? f.name + ": " + m : m);
        if (Store.isSerious(e)) break;   // storage problems will affect every remaining file
      }
    }
    input.value = "";

    if (!multi) {
      var target = added[0] || lastDupe;
      if (target) { setBusy(true, added[0] ? "Opening the player\u2026" : "Already in your library. Opening it\u2026"); openGame(target.id); return; }
      setBusy(false, ""); showError(errors[0] || "That file couldn't be added.");
      return;
    }

    setBusy(false, "");
    var parts = [];
    if (added.length) parts.push("Added " + added.length + (added.length === 1 ? " game" : " games") + " to your library.");
    if (dupes.length) parts.push(dupes.length + " already in your library (skipped).");
    statusEl.textContent = parts.join(" ");
    if (errors.length) showError(errors.join("\n"));
    updateLibLink();
  }

  chooseBtn.addEventListener("click", function (e) { e.stopPropagation(); input.click(); });
  dz.addEventListener("click", function (e) { if (e.target === dz || e.target.closest(".dz-title,.dz-sub,svg")) input.click(); });
  dz.addEventListener("keydown", function (e) {
    if (e.target === dz && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); input.click(); }
  });
  input.addEventListener("change", function () { if (input.files && input.files.length) handleFiles(input.files); });

  ["dragenter", "dragover"].forEach(function (t) {
    dz.addEventListener(t, function (e) { e.preventDefault(); if (!busy) dz.classList.add("dragging"); });
  });
  ["dragleave", "dragend"].forEach(function (t) { dz.addEventListener(t, function () { dz.classList.remove("dragging"); }); });
  dz.addEventListener("drop", function (e) {
    e.preventDefault(); dz.classList.remove("dragging");
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  });
  // Stop the browser navigating to a file dropped outside the zone.
  window.addEventListener("dragover", function (e) { e.preventDefault(); });
  window.addEventListener("drop", function (e) { e.preventDefault(); });

  window.addEventListener("pageshow", function (e) { if (e.persisted) setBusy(false, ""); updateLibLink(); });
  updateLibLink();
})();
