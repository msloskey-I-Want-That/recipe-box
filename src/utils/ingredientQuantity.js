// Splits a raw ingredient line ("2 1/2 cups chopped tomatoes") into its
// quantity, unit, and food description, for nutrition-estimate purposes.
// This is a heuristic, not a full NLP parse -- odd phrasing may need the
// manual macro override in the recipe form.

const UNICODE_FRACTIONS = { '½': '1/2', '¼': '1/4', '¾': '3/4', '⅓': '1/3', '⅔': '2/3', '⅛': '1/8' };

const UNIT_TO_GRAMS = {
  cup: 240, cups: 240,
  tbsp: 15, tablespoon: 15, tablespoons: 15,
  tsp: 5, teaspoon: 5, teaspoons: 5,
  oz: 28.35, ounce: 28.35, ounces: 28.35,
  lb: 453.6, lbs: 453.6, pound: 453.6, pounds: 453.6,
  g: 1, gram: 1, grams: 1,
  kg: 1000, ml: 1, l: 1000, liter: 1000,
  clove: 3, cloves: 3,
  can: 400, cans: 400,
  stick: 113, sticks: 113,
  slice: 25, slices: 25,
  pinch: 0.5, dash: 0.5
};

// Fallback weight (grams) for a single countable item with no unit at all,
// e.g. "2 eggs" or "3 potatoes" -- rough, deliberately conservative.
const DEFAULT_ITEM_GRAMS = 100;

export function normalizeFractionChars(str) {
  let out = str;
  for (const [ch, replacement] of Object.entries(UNICODE_FRACTIONS)) {
    out = out.replaceAll(ch, ` ${replacement}`);
  }
  return out;
}

export function parseLeadingNumber(str) {
  // Matches "1 1/2", "1/2", "2.5", "2", etc. at the start of the string.
  const mixedMatch = /^(\d+)\s+(\d+)\/(\d+)/.exec(str);
  if (mixedMatch) {
    const [, whole, num, den] = mixedMatch;
    return { value: Number(whole) + Number(num) / Number(den), rest: str.slice(mixedMatch[0].length) };
  }
  const fracMatch = /^(\d+)\/(\d+)/.exec(str);
  if (fracMatch) {
    const [, num, den] = fracMatch;
    return { value: Number(num) / Number(den), rest: str.slice(fracMatch[0].length) };
  }
  const numMatch = /^(\d+(\.\d+)?)/.exec(str);
  if (numMatch) {
    return { value: Number(numMatch[1]), rest: str.slice(numMatch[0].length) };
  }
  return { value: null, rest: str };
}

export function parseIngredientLine(rawLine) {
  let line = normalizeFractionChars(rawLine.trim()).replace(/^[-•*]\s*/, '');
  line = line.replace(/\([^)]*\)/g, ' ').trim();

  const { value: quantity, rest } = parseLeadingNumber(line);
  let remainder = rest.trim();

  let unit = null;
  let grams = null;

  const unitMatch = /^([a-zA-Z]+)\b\.?/.exec(remainder);
  if (unitMatch && UNIT_TO_GRAMS[unitMatch[1].toLowerCase()]) {
    unit = unitMatch[1].toLowerCase();
    remainder = remainder.slice(unitMatch[0].length).trim();
    grams = quantity != null ? quantity * UNIT_TO_GRAMS[unit] : null;
  } else if (quantity != null) {
    // A bare count with no recognized unit, e.g. "2 eggs"
    grams = quantity * DEFAULT_ITEM_GRAMS;
  }

  const food = remainder
    .replace(/\b(chopped|diced|minced|sliced|to taste|optional|divided|softened|melted|fresh|freshly|ground|large|small|medium)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  return {
    quantity,
    unit,
    grams,
    food: food || remainder || rawLine
  };
}
