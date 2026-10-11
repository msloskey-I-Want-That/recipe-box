import { parseIngredientLine } from './ingredientQuantity';

const FDC_SEARCH_URL = 'https://api.nal.usda.gov/fdc/v1/foods/search';

// Nutrient IDs USDA uses in the FDC API response for the macros we track.
const NUTRIENT_IDS = {
  calories: 1008, // Energy (KCAL)
  protein: 1003,
  fat: 1004,
  carbs: 1005,
  fiber: 1079,
  sugar: 2000,
  sodium: 1093
};

function getApiKey() {
  return localStorage.getItem('recipe-box-usda-key') || '';
}

async function lookupFoodPer100g(query, apiKey) {
  const url = `${FDC_SEARCH_URL}?query=${encodeURIComponent(query)}&pageSize=1&dataType=Foundation,SR%20Legacy&api_key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`USDA lookup failed (${res.status})`);
  const data = await res.json();
  const food = data.foods && data.foods[0];
  if (!food) return null;

  const nutrients = {};
  for (const [key, id] of Object.entries(NUTRIENT_IDS)) {
    const match = (food.foodNutrients || []).find((n) => n.nutrientId === id);
    nutrients[key] = match ? match.value : 0;
  }
  return nutrients; // per 100g
}

// Estimates total macros for a whole recipe (all ingredients combined), then
// the caller divides by servings. Throws if no USDA API key is configured.
export async function estimateRecipeMacros(ingredientLines) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('Add a free USDA FoodData Central API key in Settings first.');
  }

  const totals = { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, sugar: 0, sodium: 0 };
  const misses = [];

  for (const line of ingredientLines) {
    const parsed = parseIngredientLine(line);
    if (!parsed.food) continue;

    try {
      const per100g = await lookupFoodPer100g(parsed.food, apiKey);
      if (!per100g) {
        misses.push(parsed.food);
        continue;
      }
      const grams = parsed.grams || 100; // assume ~100g if quantity couldn't be parsed
      const factor = grams / 100;
      for (const key of Object.keys(totals)) {
        totals[key] += (per100g[key] || 0) * factor;
      }
    } catch {
      misses.push(parsed.food);
    }
  }

  return { totals, misses };
}

// Divides recipe totals by serving count and rounds for display.
export function macrosPerServing(totals, servingsText) {
  const servings = parseFloat(servingsText) || 1;
  const divisor = servings > 0 ? servings : 1;
  const round = (n) => Math.round((n || 0) / divisor);
  return {
    calories: round(totals.calories),
    protein: round(totals.protein),
    fat: round(totals.fat),
    carbs: round(totals.carbs),
    fiber: round(totals.fiber),
    sugar: round(totals.sugar),
    sodium: round(totals.sodium)
  };
}
