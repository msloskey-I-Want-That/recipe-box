import { parseLeadingNumber, normalizeFractionChars } from './ingredientQuantity';

// Common cooking fractions, checked against a small tolerance so e.g.
// 0.333 scales back to "1/3" instead of an ugly decimal.
const NICE_FRACTIONS = [
  [1 / 8, '⅛'], [1 / 4, '¼'], [1 / 3, '⅓'], [1 / 2, '½'], [2 / 3, '⅔'], [3 / 4, '¾']
];

function formatQuantity(n) {
  if (n <= 0) return '0';

  const whole = Math.floor(n);
  const frac = n - whole;

  if (frac < 0.01) return String(whole || n.toFixed(0));

  for (const [value, symbol] of NICE_FRACTIONS) {
    if (Math.abs(frac - value) < 0.03) {
      return whole > 0 ? `${whole} ${symbol}` : symbol;
    }
  }

  // No clean fraction match -- fall back to a plain decimal, trimmed.
  const rounded = Math.round(n * 100) / 100;
  return String(rounded);
}

// Scales the leading quantity in an ingredient line, leaving everything
// else (unit, food description, prep notes) exactly as written. Lines with
// no leading quantity ("Salt to taste") pass through unchanged.
export function scaleIngredientLine(rawLine, factor) {
  if (factor === 1) return rawLine;

  const bulletMatch = /^([-•*]\s*)/.exec(rawLine);
  const bullet = bulletMatch ? bulletMatch[0] : '';
  const withoutBullet = rawLine.slice(bullet.length);

  const normalized = normalizeFractionChars(withoutBullet).trimStart();
  const leadingSpace = withoutBullet.length - withoutBullet.trimStart().length;

  const { value, rest } = parseLeadingNumber(normalized);
  if (value == null) return rawLine;

  const scaled = value * factor;
  return bullet + ' '.repeat(leadingSpace) + formatQuantity(scaled) + rest;
}

export function scaleIngredients(ingredients, factor) {
  return (ingredients || []).map((ing) => {
    const raw = typeof ing === 'string' ? ing : ing.raw;
    return scaleIngredientLine(raw, factor);
  });
}

export function scaleMacros(macros, factor) {
  if (!macros) return macros;
  const round = (n) => Math.round((n || 0) * factor);
  return {
    ...macros,
    calories: round(macros.calories),
    protein: round(macros.protein),
    carbs: round(macros.carbs),
    fat: round(macros.fat)
  };
}
