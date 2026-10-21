# PlayFlash

Classic Flash games, back in action. PlayFlash is a static website (HTML, CSS, vanilla JavaScript) where visitors add
their **own** `.swf` files, keep them in a library on their device, and play them with the
[Ruffle](https://ruffle.rs/) emulator.

PlayFlash doesn't host any games: every file stays in the visitor's browser and is never uploaded.
There is no backend, account, API key, build step or analytics.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Home page: hero, add-games area, link to the library |
| `library.html` | Library page: saved games, search, sort, favourites, edit, playtime |
| `player.html` | Player page (`?upload=ID`, add `&tab=1` for full-tab mode) |
| `styles.css` | All styling |
| `config.js` | Settings: max file size, Ruffle sources, optional ad slots |
| `storage.js` | IndexedDB library, file validation, playtime helpers (shared) |
| `common.js` | Mobile menu and small DOM helpers (shared by home and library pages) |
| `app.js` | Home page logic: adding games |
| `library.js` | Library page logic |
| `player.js` | Loads Ruffle, plays the game, restart, fullscreen, new tab, playtime |
| `ads.js` | Fills the optional ad containers (off by default) |

All paths are relative, so the site works at a domain root or under a repository path like `https://USER.github.io/PlayFlash/`.

## Features

- **Add games (home page):** choose or drag in one or more `.swf` files. One file opens straight away; several are added to the library. A short safety note about sourcing SWF files sits under the upload area.
- **Separate library page** (`library.html`) with everything below.
- **Auto-naming:** a game is named after its file without `.swf` (`Space_Blaster.swf` becomes `Space_Blaster`).
- **Edit:** rename a game (an empty name goes back to the file name) and optionally set a cover image, which is resized to a
  small JPEG and stored locally. Games without a cover get a generated tile.
- **Favourites**, **search** and **sorting** (recently added, recently played, name, most played, most playtime), plus an All / Favourites filter.
- **Play history:** play count, last played date and **playtime**. Playtime is counted while a game is running and the tab is visible, and is shown as seconds (`42 s`), then minutes (`12 min 5 s`), then hours (`2 h 15 min`). The library header shows the total, and you can sort by most playtime. Seconds are saved every 10 seconds and when a tab is hidden or closed.
- **Duplicate detection:** a file with the same name and size as one already in the library isn't added twice.
- **Storage info:** total library size, and whether the browser has marked the library as protected from automatic cleanup
  (PlayFlash requests this when you add a game; browsers may refuse).
- **Remove** one game or all games (both ask for confirmation).
- **Player:** Restart, Fullscreen, and Open in new tab, which gives a full-tab view with a slim top bar.

## Test locally

Serve the folder over HTTP (IndexedDB is unreliable from `file://`, and the library wouldn't carry over to the player page):

```bash
cd playflash
python3 -m http.server 8000
# open http://localhost:8000/
```

An internet connection is needed because Ruffle loads from a CDN (unpkg, with jsDelivr as a fallback).

### Test checklist

1. Add a `.swf` you have the right to use. The player should open and the game should start.
2. Try Restart, Fullscreen and Open in new tab.
3. Add two or three files at once, open the library page, and check favourites, rename, cover image, search, sort and remove.
4. Check the errors: add a `.txt` file, an empty `.swf`, and a file over the size limit; open `player.html?upload=nope`.

**Verification status:** the home and library pages (add, multi-add, duplicates, errors, rename, cover image, favourites, search,
sort, remove, full-tab layout, mobile width) were run in headless Chromium with dummy files that have SWF headers. Playtime was
tested with a stand-in for Ruffle: plain play was counted accurately, and the hide/close saving was checked with simulated tab
visibility only. Real playback in Ruffle could not be verified because the test environment had no internet access. The Ruffle
loading code is unchanged from the version you confirmed working, apart from play and playtime counting.

## Deploy to GitHub Pages

1. Create a repository (for example `PlayFlash`) and push this folder's contents to `main`, with `index.html` at the root.
2. **Settings > Pages > Build and deployment**: Source **Deploy from a branch**, branch `main`, folder `/ (root)`, then Save.
3. After a minute the site is live at `https://USER.github.io/REPOSITORY/`.

## How the library is stored

IndexedDB database `playflash`: store `meta` (one record per game: id, file name, title, size, dates, favourite, play count,
cover, playtime seconds) and store `files` (the raw SWF bytes, keyed by id). The player page gets only the id in its URL, never file contents,
which is why new tabs work. Libraries from the earlier version keep working; the new fields get defaults.

Limits to be aware of:

- Browsers cap storage per site and may clear it under disk pressure or when the visitor clears site data. Private browsing
  often disables it. The site shows messages for these cases.
- The `.swf` extension and header checks are basic sanity checks and don't prove a file is valid or harmless. Ruffle is an
  emulator, not a security guarantee. It runs with `allowScriptAccess: false`.
- Not every game works in Ruffle. Games that load extra files at runtime are the most likely to fail.

## Ads

Four ready-made containers exist (`home-banner`, `home-bottom`, `library-bottom`, `player-below`). They're hidden until you configure them in
`config.js` under `ads`, and they never appear in full-tab mode or over the game.

1. Set `showPlaceholders: true` to preview the positions (then set it back to `false`).
2. Get approved by an ad network and paste its embed snippet into a slot's `html` string.
3. Set `enabled: true`.

Ad networks have their own publisher policies, so read them first. Ads load third-party scripts that set cookies and track
visitors, so update your privacy wording and add a consent banner where laws like the UK/EU GDPR apply. Keep ads away from
game controls.

## Privacy

By default there are no analytics, cookies, accounts or third-party fonts. The only external request is loading Ruffle from
the CDN. This changes if you enable ads.

## Browser notes

- Fullscreen needs a user click, and iPhone Safari doesn't support element fullscreen.
- Click the game once to give it keyboard focus; browsers may mute audio until the first interaction.

## Licence

Add a `LICENSE` file for your own code. Ruffle is dual-licensed MIT / Apache-2.0 and isn't bundled here.
