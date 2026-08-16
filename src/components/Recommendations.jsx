import React, { useEffect, useState } from 'react';
import RecipeCard from './RecipeCard';
import { getRecommendations, buildProfile } from '../utils/recommend';

const PANTRY_KEY = 'recipe-box-pantry';

export default function Recommendations({ recipes, onSelect }) {
  const [pantryItems, setPantryItems] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(PANTRY_KEY) || '[]');
    } catch {
      return [];
    }
  });
  const [pantryInput, setPantryInput] = useState('');

  useEffect(() => {
    localStorage.setItem(PANTRY_KEY, JSON.stringify(pantryItems));
  }, [pantryItems]);

  const addPantryItem = () => {
    const val = pantryInput.trim();
    if (!val) return;
    setPantryItems((items) => Array.from(new Set([...items, val])));
    setPantryInput('');
  };

  const removePantryItem = (item) => {
    setPantryItems((items) => items.filter((i) => i !== item));
  };

  const profile = buildProfile(recipes);
  const ranked = getRecommendations(recipes, { pantryItems });
  const hasPantry = pantryItems.length > 0;
  const topResults = ranked.filter((r) => r.combined > 0).slice(0, 12);

  return (
    <div>
      <div className="brand-bar">
        <h1 className="display">Cook Tonight</h1>
      </div>

      <div className="pantry-box">
        <div className="section-label">What's in the kitchen?</div>
        <div className="search-row" style={{ marginBottom: 0 }}>
          <input
            placeholder="Add an ingredient you have on hand…"
            value={pantryInput}
            onChange={(e) => setPantryInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addPantryItem()}
          />
          <button className="btn btn-brass" onClick={addPantryItem}>Add</button>
        </div>
        {pantryItems.length > 0 && (
          <div className="chip-input-row">
            {pantryItems.map((item) => (
              <span key={item} className="chip">
                {item}
                <button onClick={() => removePantryItem(item)}>×</button>
              </span>
            ))}
          </div>
        )}
      </div>

      {profile.likedCount === 0 && !hasPantry && (
        <div className="empty-state">
          <div className="display">No hints to go on yet</div>
          <p>
            Favorite (♥) or rate a few recipes you love, or list what's in your kitchen above —
            recommendations get smarter the more you use the box.
          </p>
        </div>
      )}

      {topResults.length === 0 && (profile.likedCount > 0 || hasPantry) && (
        <div className="empty-state">
          <p>Nothing matches well yet — add a few more recipes to your box.</p>
        </div>
      )}

      <div className="card-list">
        {topResults.map(({ recipe, pantry, profileScore }) => {
          let reason = null;
          if (pantry && pantry.have.length > 0) {
            const pct = Math.round(pantry.score * 100);
            reason = pct === 100 ? "You have everything for this" : `${pct}% of ingredients on hand`;
          } else if (profileScore > 0) {
            reason = 'Matches recipes you love';
          }
          return (
            <RecipeCard key={recipe.id} recipe={recipe} onClick={() => onSelect(recipe.id)} reason={reason} />
          );
        })}
      </div>
    </div>
  );
}
