# Offline readers for the tablet — setup notes

## The short version
Bundle each reader into **one self-contained `.html` file** (art + audio + fonts all
inside it), copy it to the SD card, and have your niece open it with the file
manager's **"Open with → (a browser)"**. No internet, no app to install, nothing
external to load. This sidesteps the two Android traps below.

## Why not just copy the folder of files?
On Android 11+ ("Scoped Storage") a browser cannot be pointed at a local
`file:///…` path in the address bar, and even when a page IS opened from the file
manager, browsers often refuse to load a page's *sibling* files (the separate
`1.jpg`, `01.mp3`, etc.). A single file has no siblings, so there is nothing to block.

## Format the microSD cards
Format both the 512 GB and 256 GB cards as **exFAT** (the Samsung tablet reads exFAT
natively; FAT32 caps files at 4 GB and is awkward above 32 GB). You can format them
in the tablet itself: Settings → Battery and device care → Storage → SD card →
Format, or on a computer.

Put the readers anywhere easy to find, e.g. `SD card / Readers / `.

## Build a single-file reader
In a folder, put:
- `index.html`  (the offline template — fonts already embedded, no internet needed)
- your `1.jpg … 8.jpg`
- your `01.mp3 … 24.mp3`

Then run:
```
python3 build_single_file.py  ./that-folder  LionAndMouse.html
```
`LionAndMouse.html` is the file you copy to the SD card. Repeat per reader — same
recipe for the whole library, so you can keep adding titles.

## What your niece does (once, per reader)
1. Open **My Files** → SD card → Readers.
2. **Long-press** the reader's `.html` → **Open with** → pick a browser
   (Chrome, Samsung Internet, or Firefox all work for a single file).
   Tip: tick "Always" so future taps open it straight away.
3. Tap a phrase to hear it; "Play page" reads the page in order; swipe or use the
   arrows to change pages.

To make it feel like an app, most browsers let you **Add to Home screen** from the
menu — it then opens from an icon, still fully offline.

## If you'd rather keep media as separate files (big library, easy to update)
Separate sibling audio files are exactly what plain `file://` tends to block, so use
one of these instead (install it before you ship the tablet):
- **A local-HTML runner app** — a tiny WebView container built for running local
  `.html` with local assets (search the Play Store / F-Droid for an "offline HTML
  viewer" / "local HTML runner"). It opens the folder's `index.html` and loads the
  sibling media without the file:// restriction.
- **A local web-server app** (e.g. a "Simple HTTP Server" app, or Termux running
  `python -m http.server`) pointed at the Readers folder. Your niece then opens
  `http://localhost:8080` — a real address, so everything loads, offline. Bookmark it.

The single-file approach avoids installing anything, which is why it's the default
recommendation for a tablet going somewhere you can't easily troubleshoot.

## Notes
- The reading font (Andika) and title font (Fredoka) are embedded in `index.html`,
  so they render even with no internet — you no longer need the Google Fonts link.
- `LionAndMouse-DEMO.html` uses placeholder pictures and short beeps so you can
  confirm the method works on the actual tablet before recording real audio.
