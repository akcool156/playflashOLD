/* Fills the ad containers ([data-ad-slot]) on a page. Does nothing unless configured in games.js.
 * Ads are never shown in "full tab" game mode (?tab=1), and never inside the game area. */
(function () {
  "use strict";
  var ads = (window.PLAYFLASH_CONFIG || {}).ads || {};
  var tabMode = new URLSearchParams(window.location.search).get("tab") === "1";

  document.querySelectorAll("[data-ad-slot]").forEach(function (el) {
    try {
      var conf = (ads.slots || {})[el.getAttribute("data-ad-slot")];
      if (tabMode || !conf) return;                       // stays hidden
      var snippet = typeof conf.html === "string" ? conf.html.trim() : "";
      var live = ads.enabled && snippet;
      if (!live && !ads.showPlaceholders) return;         // stays hidden

      var size = /^(\d+)x(\d+)$/.exec(conf.size || "") || [null, "728", "90"];
      var label = document.createElement("span");
      label.className = "ad-label"; label.textContent = "Advertisement";
      var box = document.createElement("div");
      box.className = "ad-box";
      box.style.maxWidth = size[1] + "px";
      box.style.minHeight = size[2] + "px";               // reserves space so the page doesn't jump
      if (live) {
        // createContextualFragment lets ad <script> tags run (innerHTML would not).
        box.append(document.createRange().createContextualFragment(snippet));
      } else {
        box.classList.add("ad-placeholder");
        box.textContent = "Ad slot " + el.getAttribute("data-ad-slot") + " (" + size[1] + "\u00D7" + size[2] + ")";
      }
      el.replaceChildren(label, box);
      el.hidden = false;
    } catch (e) {
      console.warn("Ad slot failed:", e);                  // an ad problem must never break the site
    }
  });
})();
