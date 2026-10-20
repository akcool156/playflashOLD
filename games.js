/* PlayFlash configuration and catalogue data.
 * This is the ONLY file you need to edit to add games, add images or change limits.
 * Full step-by-step instructions: see ADDING_GAMES.md
 *
 * HOW A CATALOGUE ENTRY WORKS
 * ---------------------------
 *   id          Unique, lowercase, no spaces (e.g. "my-game"). Used in the player URL.
 *   title       Name shown on the card.
 *   category    Must match one of PLAYFLASH_CATEGORIES below (not "All Games").
 *   description One short sentence.
 *   thumbnail   Image for the card. Just the file name is enough, e.g. "my-game.webp".
 *               The file must be in the folder assets/thumbs/ (see thumbsFolder).
 *               Leave "" to get an automatic placeholder tile.
 *   swfUrl      WHERE THE GAME FILE LIVES. Just the file name is enough, e.g. "my-game.swf".
 *               The file must be in the folder games/ (see gamesFolder).
 *               (You can also give a full path like "games/sub/x.swf" or a full web address.)
 *               Leave "" while you don't have a legal, tested file.
 *   status      "available" to make the card playable, otherwise "coming-soon".
 *
 * A game is playable ONLY when status is "available" AND swfUrl is not empty.
 */
window.PLAYFLASH_CONFIG = {
  maxUploadMB: 50,              // maximum size of a visitor's uploaded SWF
  maxStoredUploads: 5,          // oldest saved uploads are removed beyond this number
  thumbsFolder: "assets/thumbs/", // where card images live
  gamesFolder: "games/",          // where catalogue .swf files live

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
      "home-banner":  { size: "728x90", html: "" },  // between hero and upload section
      "home-bottom":  { size: "728x90", html: "" },  // below the catalogue
      "player-below": { size: "728x90", html: "" }   // below the game on player.html
    }
  }
};

window.PLAYFLASH_CATEGORIES = ["All Games", "Platformer", "Strategy", "Puzzle", "Arcade"];

/* Turns a bare file name into a full path using the folders above. */
(function () {
  function resolve(value, folder) {
    if (typeof value !== "string") return "";
    var v = value.trim();
    if (!v) return "";
    if (/^(https?:)?\/\//i.test(v) || v.indexOf("/") !== -1) return v;  // already a path or URL
    return (folder || "") + v;
  }
  window.PLAYFLASH_RESOLVE = {
    thumb: function (g) { return resolve(g.thumbnail, window.PLAYFLASH_CONFIG.thumbsFolder); },
    swf: function (g) { return resolve(g.swfUrl, window.PLAYFLASH_CONFIG.gamesFolder); }
  };
})();

window.PLAYFLASH_GAMES = [
  { id: "fancy-pants-adventure", title: "Fancy Pants Adventure", category: "Platformer",
    description: "A fast, fluid side-scrolling platformer built around momentum and sliding.",
    thumbnail: "", swfUrl: "", status: "coming-soon" },
  { id: "bloons-tower-defense", title: "Bloons Tower Defense", category: "Strategy",
    description: "Place towers along a track and pop waves of balloons before they escape.",
    thumbnail: "", swfUrl: "", status: "coming-soon" },
  { id: "worlds-hardest-game", title: "The World's Hardest Game", category: "Puzzle",
    description: "Guide a red square past moving obstacles in a series of punishing mazes.",
    thumbnail: "", swfUrl: "", status: "coming-soon" },
  { id: "papas-pizzeria", title: "Papa's Pizzeria", category: "Strategy",
    description: "Run a busy pizza counter: take orders, build pies and keep customers happy.",
    thumbnail: "", swfUrl: "", status: "coming-soon" },
  { id: "learn-to-fly", title: "Learn to Fly", category: "Arcade",
    description: "Launch a penguin, earn coins and upgrade your gear to fly further each attempt.",
    thumbnail: "", swfUrl: "", status: "coming-soon" },
  { id: "age-of-war", title: "Age of War", category: "Strategy",
    description: "Train units, defend your base and evolve through the ages in a lane-based battle.",
    thumbnail: "", swfUrl: "", status: "coming-soon" },
  { id: "bloons-player-pack", title: "Bloons Player Pack", category: "Strategy",
    description: "A bundle of balloon-popping puzzle and tower challenges.",
    thumbnail: "", swfUrl: "", status: "coming-soon" },
  { id: "run", title: "Run", category: "Arcade",
    description: "An endless runner where you dodge gaps and keep your rhythm as the pace climbs.",
    thumbnail: "", swfUrl: "", status: "coming-soon" }
];
