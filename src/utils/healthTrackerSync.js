import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';

// Health Tracker (a separate app, separate Firebase project) logs every meal
// eaten -- including ones imported from Recipe Box, tagged with
// source: 'Recipe Box' and a desc matching the recipe's title exactly. This
// reads that log back (read-only) to power several things:
//  - cook frequency + last-cooked date (stronger taste signal than a rating)
//  - a rough per-recipe glucose correlation, on days where exactly one
//    Recipe-Box-sourced meal was logged (so the day's 2hr reading isn't
//    ambiguous between multiple dishes)
//  - whether today falls in the GI-sensitive window right after an injection

const healthTrackerConfig = {
  apiKey: 'AIzaSyCGcge7Y1yrW90ggMNgs7C426BjALT98jM',
  authDomain: 'mounjaro-tracker-a6f44.firebaseapp.com',
  projectId: 'mounjaro-tracker-a6f44',
  storageBucket: 'mounjaro-tracker-a6f44.firebasestorage.app',
  messagingSenderId: '556380020203',
  appId: '1:556380020203:web:b734402883e4152a5c8dae'
};

const SYNC_ID_KEY = 'recipe-box-health-tracker-sync-id';

let healthApp = null;
function getHealthDb() {
  if (!healthApp) {
    healthApp = initializeApp(healthTrackerConfig, 'healthTracker');
  }
  return getFirestore(healthApp);
}

export function getSyncId() {
  return localStorage.getItem(SYNC_ID_KEY) || '';
}

export function setSyncId(id) {
  localStorage.setItem(SYNC_ID_KEY, id.trim());
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Single pass over every logged day, deriving everything the Cook Tonight
// tab needs from Health Tracker. One fetch instead of three separate scans
// of the same collection.
export async function fetchHealthInsights() {
  const syncId = getSyncId();
  if (!syncId) return null;

  const db = getHealthDb();
  const snap = await getDocs(collection(db, 'trackers', syncId, 'entries'));

  const cookCounts = {};
  const lastCooked = {};
  const glucoseByTitle = {};
  let lastInjectionDate = null;

  snap.forEach((docSnap) => {
    const data = docSnap.data();
    const date = data.date || docSnap.id;
    const meals = data.meals || [];

    meals.forEach((meal) => {
      const desc = (meal.desc || '').trim().toLowerCase();
      if (!desc) return;
      cookCounts[desc] = (cookCounts[desc] || 0) + 1;
      if (!lastCooked[desc] || date > lastCooked[desc]) lastCooked[desc] = date;
    });

    const g2 = data.glucose2hr != null ? parseFloat(data.glucose2hr) : null;
    if (g2 != null && !isNaN(g2)) {
      const recipeMeals = meals.filter((m) => m.source === 'Recipe Box');
      if (recipeMeals.length === 1) {
        const title = (recipeMeals[0].desc || '').trim().toLowerCase();
        if (title) {
          if (!glucoseByTitle[title]) glucoseByTitle[title] = [];
          glucoseByTitle[title].push(g2);
        }
      }
    }

    if (data.injection && (!lastInjectionDate || date > lastInjectionDate)) {
      lastInjectionDate = date;
    }
  });

  const glucose = {};
  Object.entries(glucoseByTitle).forEach(([title, values]) => {
    // Require at least 2 data points before saying anything -- a single
    // reading is noise, not a pattern.
    if (values.length < 2) return;
    glucose[title] = {
      avg: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
      count: values.length
    };
  });

  let daysSinceInjection = null;
  if (lastInjectionDate) {
    daysSinceInjection = Math.round(
      (new Date(todayStr()) - new Date(lastInjectionDate)) / 86400000
    );
  }

  return {
    cookCounts,
    lastCooked,
    glucose,
    injection: {
      // GI side effects are most commonly reported the day of an injection
      // and the couple of days after -- a soft window, not a hard rule.
      isInjectionWindow: daysSinceInjection != null && daysSinceInjection >= 0 && daysSinceInjection <= 2,
      daysSinceInjection
    }
  };
}

function normalizedTitle(recipe) {
  return (recipe.title || '').trim().toLowerCase();
}

export function cookCountForRecipe(recipe, counts) {
  const title = normalizedTitle(recipe);
  return title ? counts[title] || 0 : 0;
}

export function lastCookedForRecipe(recipe, lastCooked) {
  const title = normalizedTitle(recipe);
  return title ? lastCooked[title] || null : null;
}

export function glucoseInfoForRecipe(recipe, glucose) {
  const title = normalizedTitle(recipe);
  return title ? glucose[title] || null : null;
}

export function daysSince(dateStr) {
  if (!dateStr) return null;
  return Math.round((new Date(todayStr()) - new Date(dateStr)) / 86400000);
}

// ── WRITE: logging a cook's macros into Health Tracker ──
// The one place Recipe Box writes into Health Tracker rather than just
// reading from it. Reads the target day's entry first and merges the new
// meal into its existing meals array, so nothing else on that day (weight,
// glucose, other meals) gets overwritten.
export async function logCookToHealthTracker(dateStr, meal) {
  const syncId = getSyncId();
  if (!syncId) throw new Error('Add your Health Tracker Sync ID in Settings first.');

  const db = getHealthDb();
  const ref = doc(db, 'trackers', syncId, 'entries', dateStr);
  const snap = await getDoc(ref);
  const existing = snap.exists() ? snap.data() : { date: dateStr };
  const meals = existing.meals || [];

  await setDoc(ref, { ...existing, date: dateStr, meals: [...meals, meal] }, { merge: true });
}

// ── DAILY MACRO BUDGET ──
// Replicates Health Tracker's own calorie/macro target formula exactly
// (Mifflin-St Jeor -> TDEE -> deficit -> targets), reading the same
// settings + weight-entry data it uses, so "how much room is left today"
// matches what Health Tracker itself would show. Kept as a separate,
// lighter fetch (settings doc + today's entry only) since it doesn't need
// the full entries scan fetchHealthInsights does.

const ACTIVITY_MULTIPLIERS = { sedentary: 1.2, light: 1.375, moderate: 1.55, very: 1.725 };
const PROTEIN_GOAL_G = 100; // fixed floor Health Tracker uses regardless of the calorie calculator

async function fetchDailyTargets(db, syncId) {
  const settingsSnap = await getDoc(doc(db, 'trackers', syncId, 'meta', 'settings'));
  const s = settingsSnap.exists() ? settingsSnap.data() : {};

  const entriesSnap = await getDocs(collection(db, 'trackers', syncId, 'entries'));
  let latestWeight = s.baselineWeight != null ? parseFloat(s.baselineWeight) : 242;
  let latestDate = '';
  entriesSnap.forEach((d) => {
    const data = d.data();
    if (data.weight != null && data.weight !== '' && (data.date || '') > latestDate) {
      latestWeight = parseFloat(data.weight);
      latestDate = data.date;
    }
  });

  const heightIn = s.heightIn ? parseFloat(s.heightIn) || 0 : 0;
  const age = s.age ? parseInt(s.age, 10) || 0 : 0;
  const sex = s.sex || 'male';
  const activityLevel = s.activityLevel || 'moderate';
  const lossRate = s.lossRate ? parseFloat(s.lossRate) || 1 : 1;

  const weightKg = latestWeight * 0.453592;
  const heightCm = (heightIn || 70) * 2.54;
  const sexOffset = sex === 'female' ? -161 : 5;
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * (age || 40) + sexOffset;
  const multiplier = ACTIVITY_MULTIPLIERS[activityLevel] || 1.55;
  const tdee = bmr * multiplier;
  const dailyDeficit = (lossRate || 1) * 3500 / 7;
  const calorieTarget = Math.max(1200, Math.round(tdee - dailyDeficit));
  const fatTarget = Math.round((calorieTarget * 0.3) / 9);
  const carbTarget = Math.max(0, Math.round((calorieTarget - PROTEIN_GOAL_G * 4 - fatTarget * 9) / 4));

  return { calories: calorieTarget, protein: PROTEIN_GOAL_G, fat: fatTarget, carbs: carbTarget };
}

async function fetchTodayConsumed(db, syncId) {
  const snap = await getDoc(doc(db, 'trackers', syncId, 'entries', todayStr()));
  const meals = snap.exists() ? snap.data().meals || [] : [];
  const totals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  meals.forEach((m) => {
    totals.calories += parseFloat(m.cal) || 0;
    totals.protein += parseFloat(m.protein) || 0;
    totals.carbs += parseFloat(m.carbs) || 0;
    totals.fat += parseFloat(m.fat) || 0;
  });
  return totals;
}

// Returns { target, consumed, remaining } for today, or null if no Sync ID
// is configured. "remaining" is floored at 0 per macro (never negative).
export async function fetchDailyBudget() {
  const syncId = getSyncId();
  if (!syncId) return null;

  const db = getHealthDb();
  const [target, consumed] = await Promise.all([
    fetchDailyTargets(db, syncId),
    fetchTodayConsumed(db, syncId)
  ]);

  const remaining = {
    calories: Math.max(0, Math.round(target.calories - consumed.calories)),
    protein: Math.max(0, Math.round(target.protein - consumed.protein)),
    carbs: Math.max(0, Math.round(target.carbs - consumed.carbs)),
    fat: Math.max(0, Math.round(target.fat - consumed.fat))
  };

  return { target, consumed, remaining };
}

// ── WEEKLY TARGETS (for the meal planner) ──
export async function fetchWeeklyTargets() {
  const syncId = getSyncId();
  if (!syncId) return null;
  const db = getHealthDb();
  const daily = await fetchDailyTargets(db, syncId);
  return {
    calories: daily.calories * 7,
    protein: daily.protein * 7,
    carbs: daily.carbs * 7,
    fat: daily.fat * 7
  };
}
