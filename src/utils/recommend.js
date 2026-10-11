import { normalizeIngredient } from './recipeParser';

function ingredientSet(recipe) {
  return new Set(
    (recipe.ingredients || [])
      .map((i) => normalizeIngredient(typeof i === 'string' ? i : i.raw || ''))
      .filter(Boolean)
  );
}

function cookCountFor(recipe, cookCounts) {
  const title = (recipe.title || '').trim().toLowerCase();
  return title ? cookCounts[title] || 0 : 0;
}

// Builds a weighted "taste profile" from recipes the user actually likes --
// either manually starred/rated, OR (a stronger, effort-free signal) actually
// cooked more than once according to Health Tracker's logged meals.
// Ingredients and tags that show up more often across these recipes score higher.
export function buildProfile(recipes, cookCounts = {}) {
  const liked = recipes.filter(
    (r) => r.liked || (r.rating || 0) >= 4 || cookCountFor(r, cookCounts) >= 2
  );
  const ingredientCounts = {};
  const tagCounts = {};

  liked.forEach((r) => {
    // A recipe cooked several times contributes a bit more weight than one
    // just starred once -- capped so a single heavily-repeated dinner can't
    // completely dominate the profile.
    const weight = 1 + Math.min(cookCountFor(r, cookCounts), 5) * 0.15;
    ingredientSet(r).forEach((ing) => {
      ingredientCounts[ing] = (ingredientCounts[ing] || 0) + weight;
    });
    (r.tags || []).forEach((tag) => {
      tagCounts[tag] = (tagCounts[tag] || 0) + weight;
    });
  });

  return { ingredientCounts, tagCounts, likedCount: liked.length };
}

// Scores a recipe against the taste profile. Higher = more "like the things
// you already love." Returns 0 if there's no profile yet to compare against.
export function scoreAgainstProfile(recipe, profile) {
  if (!profile || profile.likedCount === 0) return 0;
  let score = 0;

  ingredientSet(recipe).forEach((ing) => {
    score += profile.ingredientCounts[ing] || 0;
  });
  (recipe.tags || []).forEach((tag) => {
    score += (profile.tagCounts[tag] || 0) * 2; // tags are a stronger signal
  });

  return score;
}

// Scores a recipe against a pantry (list of ingredients the user has on hand).
// Returns { score (0-1 coverage), have, missing }.
export function scoreAgainstPantry(recipe, pantryItems) {
  const pantry = new Set(pantryItems.map((p) => normalizeIngredient(p)).filter(Boolean));
  const recipeIngs = Array.from(ingredientSet(recipe));

  if (recipeIngs.length === 0) return { score: 0, have: [], missing: [] };

  const have = [];
  const missing = [];

  recipeIngs.forEach((ing) => {
    const covered = Array.from(pantry).some(
      (p) => ing.includes(p) || p.includes(ing)
    );
    if (covered) have.push(ing);
    else missing.push(ing);
  });

  return { score: have.length / recipeIngs.length, have, missing };
}

// Scores how well a recipe fits what's left in today's macro budget.
// Rewards recipes that make a real dent in the remaining protein target
// (the thing GLP-1 titration protocols care most about preserving) without
// blowing past the remaining calories. Returns 0 if there's no budget data
// or the recipe has no saved macros to compare.
export function scoreAgainstBudget(recipe, remaining) {
  const m = recipe.macros;
  if (!remaining || !m || !m.calories) {
    return { score: 0, proteinFit: 0, overCalories: false };
  }

  const proteinFit = remaining.protein > 0 ? Math.min(m.protein / remaining.protein, 1) : 0;
  const overCalories = remaining.calories > 0 && m.calories > remaining.calories * 1.15;

  let score = proteinFit * 10;
  if (overCalories) score -= 6;

  return { score: Math.max(0, score), proteinFit, overCalories };
}

// Small bonus for recipes tagged "gentle" (a tag the person applies
// themselves -- nothing here infers gentleness from ingredients) when
// today falls in the GI-sensitive window around an injection.
export function scoreGentleBonus(recipe, injectionContext) {
  if (!injectionContext || !injectionContext.isInjectionWindow) return 0;
  const tags = (recipe.tags || []).map((t) => t.toLowerCase());
  return tags.includes('gentle') ? 8 : 0;
}

// Combined recommendation list: blends taste-profile affinity, pantry
// coverage (when a pantry is provided), actual cook frequency, how well
// each recipe fits what's left in today's macro budget, and (around
// injection days) a nudge toward recipes tagged "gentle" -- all from
// Health Tracker data when available -- so "recipes you'll probably like,
// that you can also mostly make right now, that actually close today's
// protein gap" rise to the top.
export function getRecommendations(recipes, { pantryItems = [], cookCounts = {}, budget = null, injectionContext = null } = {}) {
  const profile = buildProfile(recipes, cookCounts);
  const hasPantry = pantryItems.length > 0;
  const remaining = budget ? budget.remaining : null;

  return recipes
    .map((r) => {
      const profileScore = scoreAgainstProfile(r, profile);
      const pantry = hasPantry ? scoreAgainstPantry(r, pantryItems) : null;
      const cookCount = cookCountFor(r, cookCounts);
      const cookBonus = Math.min(cookCount, 5) * 3;
      const budgetResult = scoreAgainstBudget(r, remaining);
      const gentleBonus = scoreGentleBonus(r, injectionContext);
      const combined =
        (hasPantry ? profileScore * 0.5 + pantry.score * 10 * 0.5 : profileScore) +
        cookBonus +
        budgetResult.score +
        gentleBonus;
      return { recipe: r, profileScore, pantry, cookCount, budgetResult, gentleBonus, combined };
    })
    .sort((a, b) => b.combined - a.combined);
}
