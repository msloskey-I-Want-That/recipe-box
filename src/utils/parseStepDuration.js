// Looks for a duration mentioned in a step's text ("bake for 25 minutes",
// "simmer 1 hour", "rest 10-15 min") and returns it in seconds, or null if
// no duration is found. Picks the first number in a range ("10-15 min" -> 10)
// since that's the safer floor to start counting down from.
export function parseStepDuration(stepText) {
  if (!stepText) return null;

  const match = /(\d+)\s*(?:-|to)?\s*(?:\d+)?\s*(hours?|hrs?|h\b|minutes?|mins?|m\b|seconds?|secs?|s\b)/i.exec(
    stepText
  );
  if (!match) return null;

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();

  if (unit.startsWith('h')) return amount * 3600;
  if (unit.startsWith('s')) return amount;
  return amount * 60; // minutes (also covers bare "m")
}

export function formatDuration(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
