# Recipe Box

A personal recipe collection app: add recipes by typing them in, pasting them
from a website, or snapping a photo of a printed card (OCR runs right in your
browser — no paid API). It's installable on your phone/desktop like a real app
(PWA), and recommends recipes based on what you've favorited/rated and what's
in your kitchen.

100% free to run: React + Firebase's free tier (Firestore + Storage) +
Tesseract.js for OCR, hosted on GitHub Pages.

## 1. Create a free Firebase project

1. Go to https://console.firebase.google.com → **Add project** → name it
   anything (e.g. "recipe-box") → you can skip Google Analytics.
2. Once created, click the **web icon (`</>`)** to register a web app. Name it
   anything, skip Firebase Hosting (we're using GitHub Pages instead).
3. Copy the `firebaseConfig` object it shows you.
4. Paste those values into `src/firebase.js` in this project, replacing the
   placeholders.
5. In the left sidebar: **Build → Firestore Database → Create database** →
   start in **test mode** (fine for a personal single-user app; see the
   security rules note at the bottom to lock it down later).

Note: this app does **not** use Firebase Storage, since Google now requires
the paid Blaze plan (a credit card on file) to enable it. Recipe photos are
only used transiently on your device to run OCR — the extracted text is what
gets saved, not the photo itself. That keeps everything on the free Spark
plan with no billing risk.

## 2. Install and run locally

You'll need [Node.js](https://nodejs.org) installed (v18+).

```bash
cd recipe-box
npm install
npm run dev
```

Open the local URL it prints. Try adding a recipe manually first to confirm
Firebase is wired up correctly.

## 3. Deploy to GitHub Pages (free hosting)

1. Create a new **public** GitHub repo, e.g. `recipe-box`.
2. In `vite.config.js`, set `base: '/your-repo-name/'` to match your repo name
   (also update `start_url` and `scope` in the same file's `manifest` block).
3. Push this project to that repo:
   ```bash
   git init
   git add .
   git commit -m "Initial recipe box"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/recipe-box.git
   git push -u origin main
   ```
4. Deploy:
   ```bash
   npm run build
   npm run deploy
   ```
   This publishes the `dist/` folder to a `gh-pages` branch.
5. In your GitHub repo → **Settings → Pages** → set source to the `gh-pages`
   branch. Your app will be live at
   `https://YOUR_USERNAME.github.io/recipe-box/`.
6. Open that URL on your phone → in Safari/Chrome, use "Add to Home Screen" /
   "Install app" to get a real app icon on your home screen.

Whenever you make changes, just run `npm run build && npm run deploy` again —
or double-click `update.bat` in this folder, which does `npm install` and
`npm run deploy` for you in one go.

## How adding recipes works

- **Type it in** — a plain form, good for recipes you're writing from memory
  or adjusting as you go.
- **From a link** — paste a recipe URL and the app fetches the page (through
  a free public proxy, since browsers block direct cross-site requests) and
  extracts the recipe automatically — most modern recipe sites embed
  structured data the app can read directly, which tends to come out cleaner
  than the text-guessing used for pasted text/OCR. This is the one feature
  with an outside dependency: if the proxy is down or a site blocks it,
  you'll get an error suggesting "Paste from web" instead.
- **Paste from web** — for when a link won't fetch, or you'd rather just
  copy the recipe text yourself. The app auto-splits it into
  title/ingredients/steps, and you can fix anything before saving.
- **Photo / PDF (OCR)** — snap or upload a photo, or upload a PDF, of a
  printed recipe. Text extraction happens on your device (Tesseract.js for
  images, pdf.js to render PDF pages first) — nothing is uploaded anywhere.
  Works well on typed/printed text; handwriting is hit-or-miss.

## How recommendations work

- **Cook Tonight** tab combines two signals:
  - **Taste profile** — built from recipes you've ★4-5 rated or ♥ favorited;
    recipes sharing their ingredients/tags rank higher.
  - **Pantry** — list what you have on hand, and recipes are scored by how
    much of their ingredient list you can already cover.
- Everything runs in the browser — no data leaves Firebase, no paid AI calls.

## Locking down security rules (optional, recommended)

Test mode leaves your database open to anyone with the URL for 30 days, then
locks everyone out (including you). Since this is a personal single-user app
with no login screen, the simplest fix is to replace the default rules with
ones that just remove the expiry, in **Firestore → Rules**:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

This keeps it open (no login required, since you're the only user and the URL
isn't public), just without the 30-day cutoff. If you'd rather add a login
screen so nobody else could access it even if they found the URL, let me know
and I can add Firebase Authentication.

## What's new in this version

- **Redesigned UI** — frosted-glass cards over a vibrant gradient background, premium icon set (lucide-react)
- **Macros per serving** — auto-estimated from ingredients (via the free USDA FoodData Central API) or entered/overridden manually
- **Claude-powered suggestions** — "make this dinner better" ideas on any recipe, and "new dinner ideas" based on your favorites, using your own Anthropic API key
- Both API keys (USDA + Anthropic) are entered once in the in-app **Settings** panel (gear icon, top right of the Box tab) — stored only on your device, no rebuild needed to add/change them

## Getting your free USDA API key (for macros)

1. Go to https://fdc.nal.usda.gov/api-key-signup.html
2. Fill in your name/email — the key is emailed instantly, no cost, no card
3. Paste it into the app's Settings panel under "USDA FoodData Central API key"

Auto-estimated macros are a best-effort guess (ingredient matching + rough unit
conversion) — always fine to correct any field by hand afterward, which marks
it as manually set so future re-estimates won't silently overwrite your fix.

## Getting an Anthropic API key (for suggestions)

1. Go to https://console.anthropic.com/settings/keys and create a key
2. Paste it into Settings under "Anthropic (Claude) API key"
3. Unlike everything else in this app, this has a real (very small, usually
   sub-cent) cost per use, billed to your Anthropic account

