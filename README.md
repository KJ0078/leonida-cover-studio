# Leonida Cover Studio

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/KJ0078/leonida-cover-studio/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/KJ0078/leonida-cover-studio/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

**Leonida Cover Studio** turns your photos and a caption into multi-panel, GTA-style cover art — the classic poster collage of angled panels, a Vice City sunset grade and big bold lettering — and exports it as a PNG ready to post. It runs entirely offline in a desktop browser from its own static files: your photos never leave your machine, and there is nothing to install or sign up for.

## What it does

- **Four layouts** — *Classic* (one wide hero panel over three angled strips; a side-stack variant on wide canvases), *Trio* (three angled verticals), *Duo* (a diagonal split) and *Poster* (single full-bleed).
- **Any photos, framed your way** — load 1–5 photos by file picker or drag-and-drop, or start from the two built-in samples (a pier fisherman and a boulevard convertible at sunset). Click any panel on the cover to select it, then set its photo, zoom and shift; swap panel order in one click. Every panel gets its own crop and a slightly different grade pass, like a real cover collage.
- **Three colour grades** — *Vice Sunset* (magenta → gold wash, warm saturation), *Neon Nights* (teal and pink), and *Noir Heat* (high-contrast black & white with a red accent), each finished with a vignette and a fine film grain.
- **Lettering** — your title in a heavy condensed stack with a sunset-gradient, chrome or outline-only finish, an italic “starring …” line under it, and a size slider. All system fonts — no downloads, no borrowed artwork or lettering.
- **One-click PNG export** at the common post sizes: 1080 × 1080 (square), 1080 × 1350 (portrait), 1920 × 1080 (wide) and 1080 × 1920 (story). The file is named after your title. Sensible defaults mean photo → PNG in well under a minute.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser, drop in a photo, type a title and hit **Export PNG**.

To hand the entry in the way the grader runs it (copies `app/` and `screenshots/` to the output directory and writes `dossier.json`):

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Layout of the code

- `app/index.html` + `app/style.css` — the dark neon studio shell.
- `app/src/cover.js` — the canvas renderer: panel geometry, per-panel cover-crop framing, grades, grain, lettering. The preview and every export share this one draw routine.
- `app/src/main.js` — the editor: uploads, drag-and-drop, panel selection and framing controls, export.
- `app/src/shots.js` — deterministic `?shot=` scenes used to capture the screenshots in `screenshots/`.
- `main.ts` — the Node 22 entry program; validates the entry, then copies the app and screenshots out and writes the dossier via the vendored `vendor/makefun-app.ts` (kit file, unchanged).

Everything is original work under the MIT license in `LICENSE`.

---

Entered on [make.fun](https://make.fun/?ref=rbdf2sjb&utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards
