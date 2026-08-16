// Heuristic parser: takes raw text (from OCR or pasted from a webpage)
// and splits it into a best-guess title / ingredients / steps.
// The result is always shown in an editable form afterward, so it
// doesn't need to be perfect -- just a good starting point.

const INGREDIENT_HEADERS = /^\s*(ingredients?)\s*:?\s*$/i;
const STEP_HEADERS = /^\s*(directions?|instructions?|method|steps?)\s*:?\s*$/i;

// A line "looks like" an ingredient if it starts with a quantity/measurement
// word, a bullet, or a fraction -- as opposed to a full instructional sentence.
const INGREDIENT_LINE = /^\s*[-•*]?\s*(\d+([./]\d+)?|½|¼|¾|⅓|⅔|a|an|one|two|three|four|five|six|salt|pepper|pinch)\b/i;

export function parseRecipeText(raw) {
  const lines = raw
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return { title: '', ingredients: [], steps: [], tags: [] };
  }

  let title = lines[0].length < 80 ? lines[0] : '';
  let startIdx = title ? 1 : 0;

  const ingredients = [];
  const steps = [];
  let section = 'unknown';

  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i];

    if (INGREDIENT_HEADERS.test(line)) {
      section = 'ingredients';
      continue;
    }
    if (STEP_HEADERS.test(line)) {
      section = 'steps';
      continue;
    }

    if (section === 'unknown') {
      // Guess based on line shape until we hit an explicit header
      section = INGREDIENT_LINE.test(line) ? 'ingredients' : 'steps';
    }

    if (section === 'ingredients') {
      // Once we see a long sentence-like line with no leading quantity,
      // assume we've drifted into the steps section.
      if (!INGREDIENT_LINE.test(line) && line.split(' ').length > 12) {
        section = 'steps';
        steps.push(stripNumbering(line));
      } else {
        ingredients.push(stripBullet(line));
      }
    } else {
      steps.push(stripNumbering(line));
    }
  }

  return {
    title,
    ingredients,
    steps,
    tags: guessTags(raw)
  };
}

function stripBullet(line) {
  return line.replace(/^[-•*]\s*/, '').trim();
}

function stripNumbering(line) {
  return line.replace(/^\d+[.)]\s*/, '').trim();
}

const TAG_KEYWORDS = {
  dessert: ['sugar', 'flour', 'frosting', 'cake', 'cookie', 'pie', 'chocolate'],
  breakfast: ['pancake', 'egg', 'bacon', 'waffle', 'oatmeal'],
  grill: ['grill', 'smoker', 'charcoal', 'brisket', 'bbq', 'barbecue'],
  soup: ['broth', 'stock', 'simmer', 'soup'],
  pasta: ['pasta', 'noodle', 'spaghetti'],
  vegetarian: ['tofu', 'chickpea', 'lentil']
};

function guessTags(raw) {
  const lower = raw.toLowerCase();
  return Object.entries(TAG_KEYWORDS)
    .filter(([, words]) => words.some((w) => lower.includes(w)))
    .map(([tag]) => tag);
}

// Normalizes an ingredient line down to its core food word(s) for matching,
// stripping quantities/units/prep notes. Good enough for overlap scoring,
// not meant to be a full NLP parse.
const UNITS = [
  'cup', 'cups', 'tbsp', 'tablespoon', 'tablespoons', 'tsp', 'teaspoon', 'teaspoons',
  'oz', 'ounce', 'ounces', 'lb', 'lbs', 'pound', 'pounds', 'g', 'gram', 'grams',
  'kg', 'ml', 'l', 'liter', 'clove', 'cloves', 'can', 'cans', 'pinch', 'dash',
  'stick', 'sticks', 'slice', 'slices', 'small', 'medium', 'large'
];

export function normalizeIngredient(line) {
  let s = line.toLowerCase();
  s = s.replace(/\([^)]*\)/g, ' '); // drop parenthetical notes
  s = s.replace(/[0-9]+([./][0-9]+)?/g, ' '); // drop numbers/fractions
  s = s.replace(/[½¼¾⅓⅔]/g, ' ');
  s = s
    .split(/[\s,]+/)
    .filter((w) => w && !UNITS.includes(w))
    .join(' ');
  // drop common trailing prep words
  s = s.replace(/\b(chopped|diced|minced|sliced|to taste|optional|divided|softened|melted)\b/g, '');
  return s.replace(/\s+/g, ' ').trim();
}
