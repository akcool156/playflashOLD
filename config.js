/* PlayFlash configuration. PlayFlash doesn't host any games: every game in the library
 * is a file the visitor added from their own device and stays in their browser. */
window.PLAYFLASH_CONFIG = {
  maxUploadMB: 50,   // maximum size of one SWF file

  // Ruffle is tried from these sources in order. For production, pin a specific
  // nightly, e.g. "https://unpkg.com/@ruffle-rs/ruffle@0.1.0-nightly.2025.1.1".
  ruffleSources: [
    "https://unpkg.com/@ruffle-rs/ruffle",
    "https://cdn.jsdelivr.net/npm/@ruffle-rs/ruffle"
  ],

  /* ADVERTISING SLOTS (off by default; see "Ads" in README.md)
   * enabled: true            -> show real ads using the snippets below
   * showPlaceholders: true   -> (with enabled:false) preview where slots will sit
   * Each slot's `html` is the embed snippet copied from your ad network. */
  ads: {
    enabled: false,
    showPlaceholders: false,
    slots: {
      "home-banner":  { size: "728x90", html: "" },  // between hero and the upload section
      "home-bottom":  { size: "728x90", html: "" },  // bottom of the home page
      "library-bottom": { size: "728x90", html: "" }, // bottom of the library page
      "player-below": { size: "728x90", html: "" }   // below the game on player.html
    }
  }
};
