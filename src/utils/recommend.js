import { normalizeIngredient } from './recipeParser';

function ingredientSet(recipe) {
  return new Set(
    (recipe.ingredients || [])
      .map((i) => normalizeIngredient(typeof i === 'string' ? i : i.raw || ''))
      .filter(Boolean)
  );
}

// Builds a weighted "taste profile" from recipes the user has liked/rated highly.
// Ingredients and tags that show up more often across liked recipes score higher.
export function buildProfile(recipes) {
  const liked = recipes.filter((r) => r.liked || (r.rating || 0) >= 4);
  const ingredientCounts = {};
  const tagCounts = {};

  liked.forEach((r) => {
    ingredientSet(r).forEach((ing) => {
      ingredientCounts[ing] = (ingredientCounts[ing] || 0) + 1;
    });
    (r.tags || []).forEach((tag) => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
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

// Combined recommendation list: blends taste-profile affinity with pantry
// coverage (when a pantry is provided) so "recipes you'll probably like that
// you can also mostly make right now" rise to the top.
export function getRecommendations(recipes, { pantryItems = [] } = {}) {
  const profile = buildProfile(recipes);
  const hasPantry = pantryItems.length > 0;

  return recipes
    .map((r) => {
      const profileScore = scoreAgainstProfile(r, profile);
      const pantry = hasPantry ? scoreAgainstPantry(r, pantryItems) : null;
      const combined = hasPantry
        ? profileScore * 0.5 + pantry.score * 10 * 0.5
        : profileScore;
      return { recipe: r, profileScore, pantry, combined };
    })
    .sort((a, b) => b.combined - a.combined);
}
