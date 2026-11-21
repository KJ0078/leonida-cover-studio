// Leonida Cover Studio — entry program for make.fun's "Make GTA 6 Cover Art" (gta6-cover-art-01).
// Authored for this entry: the app in app/ is an offline cover-art studio (multi-panel GTA-style
// collages, Vice City colour grades, bold lettering, PNG export at four post sizes), and this
// program hands it in: it validates the entry first (app/index.html present, 3–4 screenshots,
// each within the scorer's 256 KiB cap), then copies app/ and screenshots/ beside this file to
// /output and writes /output/dossier.json with the vendored make.fun library (vendor/makefun-app.ts,
// untouched). Node 22, standard library only; the app itself needs no network and no build step.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Authored validation: fail loudly here, with the fix named, instead of handing the scorer a
// broken entry (a missing app shell, the wrong number of screenshots, or one over its cap).
const SHOT_CAP = 262144;
if (!existsSync(join(here, 'app', 'index.html'))) {
  throw new Error('entry invalid: app/index.html is missing — the studio shell must ship in app/');
}
const shots = existsSync(join(here, 'screenshots'))
  ? readdirSync(join(here, 'screenshots')).filter((f) => /\.(png|jpe?g)$/i.test(f)).sort()
  : [];
if (shots.length < 3 || shots.length > 4) {
  throw new Error(`entry invalid: screenshots/ holds ${shots.length} image(s) — the scorer wants 3 or 4`);
}
for (const f of shots) {
  const bytes = statSync(join(here, 'screenshots', f)).size;
  if (bytes > SHOT_CAP) throw new Error(`entry invalid: screenshots/${f} is ${bytes} bytes — over the ${SHOT_CAP} cap`);
}

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files in app/ or 48 MiB of app
// files, in all, or a path under app/ over 1000 bytes: app/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);
