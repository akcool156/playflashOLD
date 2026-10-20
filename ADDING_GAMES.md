# Adding games and images to PlayFlash

Everything is done by editing one file, `games.js`, and putting files in two folders. No other code changes.

## 1. What is an "SWF URL"?

`swfUrl` simply answers: **where is the game's `.swf` file stored?**

When someone clicks Play, the player has to download that file, so it needs an address. There are two kinds:

| Kind | Example | When to use |
| --- | --- | --- |
| **File in your own repository** (recommended) | `"my-game.swf"` | You put the file in the `games/` folder of your repo. PlayFlash fills in the folder for you. |
| **Web address on another site** | `"https://example.com/files/my-game.swf"` | Only if that site owns the file, allows you to use it, **and** allows other sites to load it (CORS). Often this fails. |

For almost everyone, the answer is: upload the `.swf` to the `games/` folder and write just its file name.

## 2. Before you add a game: rights

Only add a game if you have a clear legal basis: the developer's permission, or an open licence that allows
redistribution. A game being free to play elsewhere doesn't give you the right to host it. Don't copy files from
other sites. Keep a record of each game's source and permission (table at the bottom of `README.md`).

## 3. Step by step (using GitHub's website, no tools needed)

**A. Name your files carefully**
- Lowercase, no spaces: `space-blaster.swf`, `space-blaster.webp`.
- GitHub Pages is case-sensitive: `Space-Blaster.swf` and `space-blaster.swf` are different files.

**B. Upload the game**
1. Open your repository on GitHub and open the `games` folder.
2. Click **Add file > Upload files**, drop in `space-blaster.swf`, then **Commit changes**.
   (The website upload accepts files up to 25 MB. For bigger files, use Git from your computer; the limit is 100 MB.)

**C. Upload the image (optional)**
1. Open the `assets` folder, then the `thumbs` folder.
2. **Add file > Upload files**, drop in `space-blaster.webp`, **Commit changes**.

Image tips: 16:9 shape, around 640 x 360 pixels, under 150 KB, `.webp`, `.jpg` or `.png`. Use artwork you made or
are licensed to use, never a screenshot or logo you don't have rights to. If you skip the image, a coloured
placeholder tile with the game's initials is shown.

**D. Add the catalogue entry**
1. In the repository root click `games.js`, then the pencil icon (Edit).
2. Find the list `window.PLAYFLASH_GAMES = [` and add an entry (or fill in an existing "coming soon" one):

```js
{ id: "space-blaster", title: "Space Blaster", category: "Arcade",
  description: "Shoot waves of asteroids and upgrade your ship.",
  thumbnail: "space-blaster.webp",
  swfUrl: "space-blaster.swf",
  status: "available" },
```

3. Click **Commit changes**.

**E. Wait and test**
- GitHub Pages takes about a minute to update. Hard refresh the site (Ctrl+Shift+R, or Cmd+Shift+R on Mac).
- The card should show a green "Playable" badge and a Play button. Click it and play for a few minutes, including
  Restart, fullscreen and the sound. Not every game works in Ruffle, so only mark a game `"available"` once you've tested it.

## 4. What each field means

| Field | Required | Notes |
| --- | --- | --- |
| `id` | yes | Unique, lowercase, letters/numbers/hyphens. Never reuse one. |
| `title` | yes | Shown on the card and the player page. |
| `category` | yes | Must be exactly one of `Platformer`, `Strategy`, `Puzzle`, `Arcade`. To add a new category, add it to `PLAYFLASH_CATEGORIES` too. |
| `description` | yes | One short sentence. Search also looks at this. |
| `thumbnail` | no | A file name inside `assets/thumbs/`. Leave `""` for the placeholder. |
| `swfUrl` | for playable games | A file name inside `games/`, or a full path/web address. |
| `status` | yes | `"available"` or `"coming-soon"`. Both `status: "available"` **and** a non-empty `swfUrl` are needed for the Play button. |

The folders are set by `thumbsFolder` and `gamesFolder` in `games.js`. If you put a file somewhere else, write the
full path instead, e.g. `swfUrl: "games/arcade/space-blaster.swf"` (anything containing a `/` is used as-is).

## 5. Games made of several files

Some games load extra files while running (other `.swf` files, images, sounds, XML). Ruffle looks for them relative to
the main `.swf`'s location, so upload them alongside it, keeping the original names and sub-folders. Because PlayFlash
downloads the main file and gives Ruffle its bytes, extra files may not be found. These games are the most likely to
fail. Test them carefully, or prefer self-contained games.

## 6. Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| Card says "Coming soon" | `status` isn't `"available"`, or `swfUrl` is empty. |
| "Couldn't download this game" | Wrong file name or folder, different capital letters, or the file isn't committed yet. Open `https://YOUR-SITE/games/FILE.swf` in your browser: if it 404s, the path is wrong. |
| Same message for a web address | The other site doesn't allow loading from your site (CORS). Host the file yourself, if you're allowed to. |
| "This game couldn't be started" | Ruffle can't run it (unsupported features or missing extra files). Mark it `"coming-soon"`. |
| Image shows initials instead | Wrong thumbnail name or folder. The browser console (F12) names the path it tried. |
| Nothing changes after editing | Wait a minute, then hard refresh. A single missing comma or quote in `games.js` can break the whole catalogue: check the console for a red error. |
