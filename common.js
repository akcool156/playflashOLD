/* Shared by the home and library pages: mobile menu and small DOM helpers. */
(function () {
  "use strict";
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
  function msgOf(e, fallback) { return e && e.name === "PFError" ? e.message : fallback; }
  window.PlayFlashUI = { h: h, msgOf: msgOf };

  var toggle = document.querySelector(".nav-toggle"), nav = document.getElementById("site-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
    });
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) { nav.classList.remove("open"); toggle.setAttribute("aria-expanded", "false"); }
    });
  }
})();
