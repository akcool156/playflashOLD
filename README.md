# PlayFlash

Classic Flash games, back in action. PlayFlash is a static website (HTML, CSS, vanilla JavaScript) that
plays Flash `.swf` files in the browser with the [Ruffle](https://ruffle.rs/) emulator. Visitors can browse
a searchable game catalogue or upload their own `.swf` file. Uploads never leave the browser.

No backend, accounts, API keys, build step or analytics are involved.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Home page: hero, upload area, catalogue, footer |
| `player.html` | Dedicated player page (`?upload=ID` or `?game=ID`) |
| `styles.css` | All styling (shared by both pages) |
| `games.js` | **Configuration and catalogue data.** Edit this to add games, images or change limits |
| `ads.js` | Fills the optional ad containers (off by default) |
| `ADDING_GAMES.md` | **Step-by-step guide to adding games and images** |
| `games/` | Put catalogue `.swf` files here |
| `assets/thumbs/` | Put card images here |
| `storage.js` | IndexedDB helpers and file validation, shared by both pages |
| `app.js` | Home page logic: nav, upload, saved files, search and filters |
| `player.js` | Loads Ruffle, plays the SWF, restart, fullscreen, new tab, error handling |
| `assets/` | Other local artwork |

All internal links and script/style paths are relative, so the site works at the domain root or under a
repository path such as `https://USER.github.io/PlayFlash/`.

## Test locally

Serve the folder over HTTP (IndexedDB and `fetch` are unreliable from `file://`, and some browsers give each
`file://` page a separate storage origin, which breaks the upload-to-player hand-off):

```bash
cd playflash
python3 -m http.server 8000
# open http://localhost:8000/
```

You need an internet connection because Ruffle is loaded from a CDN (unpkg, with jsDelivr as a fallback).

### Testing with a SWF

1. Obtain a SWF you are entitled to use (your own, or one with an open licence).
2. Drop it on the upload area. The player page should open and the game should start.
3. Try **Restart**, **Fullscreen** and **Open in new tab**.
4. Check the error paths: upload a `.txt` file, an empty `.swf`, a file over the size limit, and open
   `player.html?upload=does-not-exist`.

**Verification status:** the JavaScript was syntax-checked, but this project was written in an environment without
network access and without a sample SWF, so end-to-end playback in Ruffle has **not** been verified here.
Please run the checklist above before publishing.

## Deploy to GitHub Pages

1. Create a repository (for example `PlayFlash`) and push the contents of this folder to the `main` branch,
   with `index.html` at the repository root.
2. On GitHub open **Settings > Pages**.
3. Under **Build and deployment**, set **Source** to **Deploy from a branch**, choose `main` and `/ (root)`, then Save.
4. After a minute the site is live at `https://USER.github.io/REPOSITORY/`.

## How uploads work

1. The chosen file is validated: `.swf` extension, not empty, within `maxUploadMB` (50 MB by default), and starts with a
   SWF signature (`FWS`, `CWS` or `ZWS`).
2. The bytes are stored in the browser's IndexedDB (database `playflash`, stores `meta` and `files`) under a random ID.
3. The page navigates to `player.html?upload=ID`. Only the ID is in the URL, never the file contents.
4. The player reads the bytes from IndexedDB and passes them to Ruffle. That is why **Open in new tab** works.
5. Restart re-creates the Ruffle player and loads the original bytes again.

Notes and limits:

- The newest `maxStoredUploads` files (5 by default) are kept; older ones are removed automatically.
  The home page lists saved files and has a **Clear all saved files** button.
- Clearing site data, private browsing, or storage pressure can remove saved files. The player then shows a friendly
  message with a link back to the upload area.
- The extension and header checks are basic sanity checks. They do **not** show that a file is valid or harmless.
  Ruffle is an emulator, not a security guarantee. Only open files you trust.
- Ruffle runs with `allowScriptAccess: false`. Don't enable it unless you have a specific, understood need.

## Adding real games and images

Short version: put the `.swf` in `games/`, the image in `assets/thumbs/`, then edit the entry in `games.js`:

```js
{ id: "space-blaster", title: "Space Blaster", category: "Arcade",
  description: "Shoot waves of asteroids and upgrade your ship.",
  thumbnail: "space-blaster.webp",   // file in assets/thumbs/ (or "" for a placeholder)
  swfUrl: "space-blaster.swf",       // file in games/: the address of the game file
  status: "available" }
```

**See `ADDING_GAMES.md` for full instructions**, including what `swfUrl` means and how to do it all in GitHub's web interface.

A game is playable only when `status` is `"available"` **and** `swfUrl` is non-empty. SWFs are downloaded only when a
visitor opens that game's player page, never on the home page. Compatibility varies: Ruffle supports ActionScript 1 and 2
well and ActionScript 3 partially, so test every game. Games that load extra files, or remote files from another site
(which needs CORS), are the most likely to fail.

### Rights record (keep one row per game)

Only host a game when you have a clear legal basis, such as the developer's permission or an open licence. A game being
available elsewhere online does not grant redistribution rights. Don't scrape sites or rehost copyrighted games without permission.

| Title | Developer / rights holder | Source of file | Permission / licence | Redistribution allowed? | File location | Supporting assets | Tested in Ruffle (date, version, result) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| | | | | | | | |

The eight starter entries (Fancy Pants Adventure, Bloons Tower Defense, The World's Hardest Game, Papa's Pizzeria, Learn to Fly,
Age of War, Bloons Player Pack, Run) are **placeholders only**. They have no SWF files, no artwork and are marked "Coming soon".
Their names belong to their respective owners.

## Configuration

In `games.js`: `maxUploadMB`, `maxStoredUploads`, and `ruffleSources`. For stable production use, pin Ruffle to a specific
nightly version in `ruffleSources` instead of the unversioned URL, so a new release can't change behaviour unexpectedly.

## Open in new tab

The player's **Open in new tab** button opens `player.html?upload=ID&tab=1` (or `?game=ID&tab=1`): a full-tab view with a slim
top bar (title, Restart, Fullscreen, home link) and the game filling everything else. It works because the file is in
IndexedDB, which all tabs on the site share.

## Ads

PlayFlash has three ready-made ad containers (`home-banner`, `home-bottom`, `player-below`). They are hidden and empty
until you configure them in `games.js` under `ads`, and they never appear in full-tab mode or inside the game area.

1. Set `showPlaceholders: true` to preview where slots sit. Set it back to `false` afterwards.
2. Join an ad network, get approved, and paste the embed snippet it gives you into a slot's `html` string.
3. Set `enabled: true`.

Things to know before you do:
- Ad networks usually need an approved account, and many reject sites hosting content the owner doesn't have rights to,
  or a site with very little original content. Read the network's publisher policies first.
- Ads load third-party scripts that set cookies and track visitors. If you enable them, update the privacy statements
  on the site, and add a consent banner if your visitors are covered by laws such as the UK/EU GDPR.
- Keep ads away from the game controls so visitors don't click them by accident.

## Privacy

By default there are no analytics, cookies, accounts or third-party fonts (this changes if you enable ads, see above). The only external request is loading Ruffle from the CDN
(and any remote SWF URL you add to the catalogue). Uploaded files stay in your browser.

## Browser notes

- Fullscreen needs a user click. iPhone Safari doesn't support element fullscreen, so the player shows a message there.
- Games need a click on them first to receive keyboard input.
- Browsers may block audio until the first interaction. Ruffle shows an unmute overlay.

## Licence

Add a `LICENSE` file of your choice for your own code. Ruffle is dual-licensed MIT / Apache-2.0 and is not bundled
in this repository.
