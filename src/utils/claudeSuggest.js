const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-6';

function getApiKey() {
  return localStorage.getItem('recipe-box-anthropic-key') || '';
}

export function hasApiKey() {
  return !!getApiKey();
}

async function callClaude(prompt, maxTokens = 700) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('Add your Anthropic API key in Settings first.');
  }

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Claude API error (${res.status}): ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  const textBlock = (data.content || []).find((b) => b.type === 'text');
  return textBlock ? textBlock.text : '';
}

// Same as callClaude, but the message can include image blocks (photos of a
// printed recipe, one or more pages) alongside the text instruction.
async function callClaudeWithImages(images, promptText, maxTokens = 1500) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('Add your Anthropic API key in Settings first.');
  }

  const content = [
    ...images.map((img) => ({
      type: 'image',
      source: { type: 'base64', media_type: img.mediaType, data: img.data }
    })),
    { type: 'text', text: promptText }
  ];

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content }]
    })
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Claude API error (${res.status}): ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  const textBlock = (data.content || []).find((b) => b.type === 'text');
  return textBlock ? textBlock.text : '';
}

function parseRecipeJson(raw, fallbackTitle) {
  const cleaned = raw.trim().replace(/^```(json)?/i, '').replace(/```$/, '').trim();
  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error("Claude's response wasn't valid recipe data -- try again, or clean it up by hand.");
  }
  const macros = parsed.macros || {};
  return {
    title: parsed.title || fallbackTitle || '',
    ingredients: Array.isArray(parsed.ingredients) ? parsed.ingredients : [],
    steps: Array.isArray(parsed.steps) ? parsed.steps : [],
    tags: Array.isArray(parsed.tags) ? parsed.tags.map((t) => String(t).toLowerCase()) : [],
    prepTime: parsed.prepTime || '',
    servings: parsed.servings || '',
    // Only populated when the source itself printed nutrition facts (e.g.
    // meal-kit cards like HelloFresh/Blue Apron) -- empty otherwise.
    printedMacros:
      macros.calories || macros.protein || macros.carbs || macros.fat
        ? {
            calories: macros.calories || '',
            protein: macros.protein || '',
            carbs: macros.carbs || '',
            fat: macros.fat || ''
          }
        : null
  };
}

export async function suggestImprovements(recipe) {
  const prompt = `Here is a recipe:

Title: ${recipe.title}
Servings: ${recipe.servings || 'unknown'}
Ingredients:
${(recipe.ingredients || []).map((i) => `- ${typeof i === 'string' ? i : i.raw}`).join('\n')}

Steps:
${(recipe.steps || []).map((s, i) => `${i + 1}. ${s}`).join('\n')}

Give me 3-4 concrete, specific suggestions for making this dinner better -- things
like flavor tweaks, a swap that boosts protein for meal prep, a technique fix, or a
side that pairs well. Keep it tight and practical, not generic. Plain text, short
paragraphs or a short list, no markdown headers.`;

  return callClaude(prompt);
}

export async function suggestSimilarRecipes(likedRecipes) {
  const list = likedRecipes
    .slice(0, 8)
    .map((r) => `- ${r.title} (${(r.tags || []).join(', ') || 'no tags'})`)
    .join('\n');

  const prompt = `Someone's favorite recipes from their personal collection:
${list}

Based on the pattern in these favorites, suggest 3 dinner ideas they'd probably
like that aren't already in this list. For each: a name and one sentence on why
it fits their taste. Plain text, no markdown headers.`;

  return callClaude(prompt);
}

// Expands a short dinner idea ("pasta with chicken parm") into a full,
// realistic recipe. Returns a parsed object ready to drop into the recipe
// form -- the person still reviews/edits before saving, same as every other
// import path.
export async function generateRecipeFromIdea(idea) {
  const prompt = `Someone jotted down this dinner idea in a notes app: "${idea}"

Turn it into a complete, realistic home-cook recipe. Respond with ONLY a JSON
object, no markdown code fences, no commentary before or after -- just the raw
JSON, in exactly this shape:

{
  "title": "string",
  "ingredients": ["1 lb chicken breast", "2 cups marinara sauce", ...],
  "steps": ["Preheat oven to 400°F", "Season the chicken...", ...],
  "tags": ["dinner", "italian"],
  "prepTime": "35 min",
  "servings": "4"
}

Keep ingredients and steps realistic and standard -- the kind of recipe a home
cook would actually follow, not a restaurant-tasting-menu version. 4-10
ingredients, 3-8 steps is typical.`;

  const raw = await callClaude(prompt, 1200);
  return parseRecipeJson(raw, idea);
}

// Reads one or more photos of a printed/handwritten recipe (in page order,
// for multi-page recipes) and returns a structured recipe -- far more
// reliable than on-device OCR for real-world photos: tables, side-by-side
// photos, multi-column layouts, and page breaks all get handled correctly
// since Claude is reading the layout, not just guessing at text position.
export async function extractRecipeFromImages(images) {
  const promptText = `${images.length > 1 ? `These ${images.length} photos are pages of the same printed recipe, in order. ` : 'This photo shows a printed (or handwritten) recipe. '}Read it and respond with ONLY a JSON object, no markdown code fences, no commentary before or after -- just the raw JSON, in exactly this shape:

{
  "title": "string",
  "ingredients": ["2 1/2 lb beef chuck roast", ...],
  "steps": ["Heat a large skillet...", ...],
  "tags": ["dinner", "mexican"],
  "prepTime": "8 hrs 45 min",
  "servings": "8",
  "macros": { "calories": "420", "protein": "32", "carbs": "38", "fat": "14" }
}

Transcribe ingredients and steps as written (keep quantities and units exactly
as printed). Ignore star ratings, ads, and site navigation -- just the recipe
itself. If serving size or prep time isn't stated, leave that field as an
empty string rather than guessing.

For "macros": many meal-kit cards (HelloFresh, Blue Apron, etc.) and some
printed recipes include a nutrition facts panel with per-serving calories,
protein, carbs, and fat already calculated -- if that's visible on the page,
transcribe those exact printed numbers into "macros". If no nutrition panel
is printed anywhere on the page, leave "macros" as an empty object {} rather
than estimating or guessing values yourself.`;

  const raw = await callClaudeWithImages(images, promptText, 1500);
  return parseRecipeJson(raw, '');
}
