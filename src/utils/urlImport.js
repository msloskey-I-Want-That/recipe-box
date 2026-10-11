import { parseRecipeText } from './recipeParser';

// Browsers block this app from fetching arbitrary third-party sites directly
// (CORS). This free public proxy relays the request so we can read the page
// HTML. It's a dependency outside our control -- if it's ever down or rate
// limited, importing by URL will fail and "Paste from web" is the fallback.
const PROXY = 'https://api.allorigins.win/raw?url=';

// Converts an ISO-8601 duration (e.g. "PT1H30M") into "1 hr 30 min".
function humanizeDuration(iso) {
  if (!iso) return '';
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?$/.exec(iso.trim());
  if (!match) return '';
  const [, h, m] = match;
  const parts = [];
  if (h) parts.push(`${h} hr`);
  if (m) parts.push(`${m} min`);
  return parts.join(' ');
}

function textFromInstruction(step) {
  if (typeof step === 'string') return step;
  if (step && typeof step === 'object') {
    if (step.text) return step.text;
    if (step['@type'] === 'HowToSection' && Array.isArray(step.itemListElement)) {
      return step.itemListElement.map(textFromInstruction).join('\n');
    }
  }
  return '';
}

// Recursively searches a parsed JSON-LD object/array for a node whose
// @type is (or includes) "Recipe".
function findRecipeNode(node) {
  if (!node) return null;
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findRecipeNode(item);
      if (found) return found;
    }
    return null;
  }
  if (typeof node === 'object') {
    const type = node['@type'];
    const isRecipe = type === 'Recipe' || (Array.isArray(type) && type.includes('Recipe'));
    if (isRecipe) return node;
    if (node['@graph']) return findRecipeNode(node['@graph']);
  }
  return null;
}

function extractStructuredRecipe(html) {
  const scriptMatches = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];

  for (const match of scriptMatches) {
    try {
      const json = JSON.parse(match[1].trim());
      const recipe = findRecipeNode(json);
      if (!recipe) continue;

      const ingredients = (recipe.recipeIngredient || recipe.ingredients || []).map((i) =>
        typeof i === 'string' ? i : String(i)
      );

      let steps = [];
      if (Array.isArray(recipe.recipeInstructions)) {
        steps = recipe.recipeInstructions.map(textFromInstruction).filter(Boolean);
      } else if (typeof recipe.recipeInstructions === 'string') {
        steps = recipe.recipeInstructions
          .split(/\n+/)
          .map((s) => s.trim())
          .filter(Boolean);
      }

      const tags = []
        .concat(recipe.recipeCategory || [])
        .concat(recipe.recipeCuisine || [])
        .flat()
        .map((t) => String(t).toLowerCase())
        .slice(0, 5);

      const servings = recipe.recipeYield
        ? Array.isArray(recipe.recipeYield) ? recipe.recipeYield[0] : String(recipe.recipeYield)
        : '';

      const prepTime = humanizeDuration(recipe.totalTime) || humanizeDuration(recipe.cookTime) || humanizeDuration(recipe.prepTime);

      if (recipe.name && (ingredients.length > 0 || steps.length > 0)) {
        return {
          title: recipe.name,
          ingredients,
          steps,
          tags,
          servings,
          prepTime
        };
      }
    } catch {
      // malformed JSON-LD block; try the next one
    }
  }

  return null;
}

function stripHtmlToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<(br|\/p|\/li|\/h[1-6]|\/div)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#39;|&rsquo;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, ' ')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .join('\n');
}

// Fetches a URL through a public CORS proxy and returns a best-guess parsed
// recipe. Throws with a user-friendly message on failure.
export async function importFromUrl(url) {
  let html;
  try {
    const res = await fetch(PROXY + encodeURIComponent(url));
    if (!res.ok) throw new Error(`status ${res.status}`);
    html = await res.text();
  } catch {
    throw new Error(
      "Couldn't fetch that page — the free proxy this uses may be down or the site is blocking it. Try 'Paste from web' instead: copy the recipe text from the page and paste it in."
    );
  }

  const structured = extractStructuredRecipe(html);
  if (structured) {
    return { ...structured, sourceUrl: url };
  }

  // Fall back to the same heuristic parser used for pasted text / OCR
  const text = stripHtmlToText(html);
  const parsed = parseRecipeText(text);
  return { ...parsed, sourceUrl: url };
}
