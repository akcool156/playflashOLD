/* PlayFlash configuration and catalogue data.
 * Edit this file to change limits or add games. No other file needs to change.
 *
 * A game is PLAYABLE only when status === "available" AND swfUrl is a non-empty string.
 * Everything else is rendered as "Coming soon" and cannot be launched.
 *
 * Template for a real entry (record the rights information in your own notes/README table):
 * {
 *   id: "my-game",                 // unique, URL-safe
 *   title: "My Game",
 *   category: "Platformer",        // must match a category below
 *   description: "One short sentence.",
 *   thumbnail: "assets/my-game.webp", // optional; a CSS placeholder is used when empty
 *   swfUrl: "games/my-game.swf",   // relative path (same origin) or a URL that allows CORS
 *   status: "available"
 * }
 */
window.PLAYFLASH_CONFIG = {
  maxUploadMB: 50,          // maximum size of an uploaded SWF
  maxStoredUploads: 5,      // oldest saved uploads are removed beyond this number
  // Ruffle is tried from these sources in order. For production, pin a specific
  // nightly, e.g. "https://unpkg.com/@ruffle-rs/ruffle@0.1.0-nightly.2025.1.1".
  ruffleSources: [
    "https://unpkg.com/@ruffle-rs/ruffle",
    "https://cdn.jsdelivr.net/npm/@ruffle-rs/ruffle"
  ]
};

window.PLAYFLASH_CATEGORIES = ["All Games", "Platformer", "Strategy", "Puzzle", "Arcade"];

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
