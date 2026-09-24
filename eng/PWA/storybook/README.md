# Storybook

Six read-along picture stories. Tap any phrase to hear it. Installs on a Samsung
tablet like a normal app and keeps working with the wifi switched off.

---

## The one thing to know first

**Opening `index.html` by double-clicking it will not work.** Browsers refuse to
install an app or store anything offline from a `file://` address. The files have
to be served over `http://localhost` or `https://`. Pick one of the two routes
below — both take a few minutes, and only need doing once.

---

## Route A — put it on the web, then install it (recommended)

This is the easiest route for a tablet, and the easiest to update later.

1. Upload the whole folder to any static host. Free options that work well:
   - **Netlify Drop** — go to `app.netlify.com/drop` and drag the folder in.
   - **GitHub Pages** — push the folder to a repo, then Settings → Pages.
   - Any web hosting you already have. It must be **https**.
2. On the Samsung tablet, open the address in **Chrome** or **Samsung Internet**.
3. Let the page finish loading once while online. This is when the app stores
   itself, along with the two fonts it uses.
4. Install it:
   - **Chrome**: menu (⋮) → *Add to Home screen* / *Install app*
   - **Samsung Internet**: menu (☰) → *Add page to* → *Home screen*
   - Or tap the **Add to home screen** button at the bottom of the home page.
5. On the home page, tap **Save for offline** on each story you want. This pulls
   down its pictures and recordings.
6. Turn wifi off and open the app from the home screen icon. It should behave
   exactly the same.

## Route B — run it from the tablet itself, no internet at all

Useful if the tablet will never be online.

1. Install a small web server app from the Play Store. Anything that serves a
   folder over `http://localhost` works — for example **Simple HTTP Server** or
   **Servers Ultimate**.
2. Copy this folder onto the tablet and point the server app at it.
3. Open `http://localhost:8080` (or whichever port it gives you) in Chrome, then
   install to the home screen as above.

Note: on this route the two web fonts never download, so the app falls back to
the tablet's own fonts. Everything still works and stays readable — it just looks
slightly different. To avoid that, load the app once while online first.

---

## Adding your pictures and recordings

Each story has a folder under `media/`. For **The Lion and the Mouse**:

```
media/lion-mouse/
    cover.jpg          the picture on the home page   (optional)
    1.jpg ... 8.jpg    one per page
    01.mp3 ... 24.mp3  one per phrase, in reading order
```

The phrase numbers are in `js/stories.js` — each phrase is written as
`["A lion was sleeping", 1]`, so that phrase plays `01.mp3`.

A few things worth knowing:

- **Missing files never break the app.** A missing picture shows a friendly
  placeholder; a missing recording just skips forward.
- **Your existing files still work.** If you already have `1.jpg` and `01.mp3`
  sitting next to `index.html`, the Lion and the Mouse will find them there.
  Moving them into `media/lion-mouse/` is tidier but not required.
- **Covers are optional.** Until you add `cover.jpg`, each story shows a drawn
  cover built from its own colours.
- After adding media, tap **Save for offline** again to pull in the new files.

## Adding another story

Open `js/stories.js`, copy one of the blocks, and change the `id`, `title`,
`blurb`, colours and text. Number the phrases `1, 2, 3 …` straight through in
reading order. Make a matching folder under `media/` using the same `id`. It will
appear on the home page by itself — nothing else to edit.

## After you change any app file

Edit `sw.js` and bump the version, e.g. `storybook-shell-v1` → `storybook-shell-v2`,
then reload the app twice while online. Without this, tablets keep serving the old
cached copy. (This only applies to the app's own files — media and new stories in
`stories.js` do not need it, though `stories.js` is cached too, so bumping is the
reliable way to push story edits.)

---

## What's in here

| File | What it does |
| --- | --- |
| `index.html` | The home page — the shelf of stories |
| `story.html` | The reader. Opens `story.html?id=lion-mouse` etc. |
| `js/stories.js` | **All story text, page and phrase numbering, colours** |
| `js/covers.js` | The drawn covers used until you supply `cover.jpg` |
| `js/home.js` | Builds the shelf, progress, offline saving |
| `js/reader.js` | Pages, audio, swiping |
| `css/app.css` | All styling |
| `sw.js` | The offline engine |
| `manifest.webmanifest` | Name, icons and install behaviour |

## How reading works

- **Tap a phrase** to hear just that phrase. It turns gold while it plays.
- **Play page** reads the whole page, highlighting each phrase in turn. It
  becomes a Stop button while playing.
- **Swipe** left or right, or use the arrow buttons, to turn pages.
- **The house button** at the top left always returns to the shelf.
- The app remembers where each reader stopped and reopens there. Finished
  stories start again from page one.
- Arrow keys turn pages and Esc goes home, for a tablet with a keyboard case.
- The screen is kept awake while a story is open.

Turned sideways on a tablet, the picture moves beside the words instead of above
them, so both stay large.
