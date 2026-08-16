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
6. In the left sidebar: **Build → Storage → Get started** → also test mode.

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

Whenever you make changes, just run `npm run build && npm run deploy` again.

## How adding recipes works

- **Type it in** — a plain form, good for recipes you're writing from memory
  or adjusting as you go.
- **Paste from web** — since browsers block this app from fetching other
  websites directly (a security restriction, and the workaround costs money
  via a server), copy the recipe text from the site and paste it in. The app
  auto-splits it into title/ingredients/steps, and you can fix anything before
  saving.
- **Photo (OCR)** — snap or upload a photo of a printed recipe. Text
  extraction happens on your device using Tesseract.js (no image ever leaves
  your phone for this step). Works well on typed/printed text; handwriting is
  hit-or-miss — for handwritten cards, you may prefer to OCR them elsewhere
  and paste the cleaned-up text in via "Paste from web" instead, or just type
  them in directly.

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
ones that just remove the expiry, in **Firestore → Rules** and
**Storage → Rules**:

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
