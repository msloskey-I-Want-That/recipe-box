// Assigns each tag a consistent color from a curated palette, so the same
// tag always renders the same way across cards, pills, and detail pages.
// Hash-based (not random) so it's stable across sessions without storing
// per-tag color choices anywhere. Palette pulled from the same accent hues
// as Health Tracker's background blobs, for visual consistency between apps.

const PALETTE = [
  { bg: '#37C6FF', tint: 'rgba(55,198,255,0.16)' },  // teal/blue
  { bg: '#FF6FA5', tint: 'rgba(255,111,165,0.16)' }, // coral/pink
  { bg: '#5CE6C0', tint: 'rgba(92,230,192,0.16)' },  // mint/sage
  { bg: '#7B6CF6', tint: 'rgba(123,108,246,0.16)' }, // violet
  { bg: '#FFB020', tint: 'rgba(255,176,32,0.16)' }   // amber
];

function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export function colorForTag(tag) {
  if (!tag) return PALETTE[0];
  return PALETTE[hash(tag) % PALETTE.length];
}
