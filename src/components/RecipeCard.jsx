import React from 'react';

export default function RecipeCard({ recipe, onClick, reason }) {
  const isFavorite = recipe.liked || (recipe.rating || 0) >= 4;

  return (
    <div
      className={`recipe-card${isFavorite ? ' favorite' : ''}`}
      onClick={onClick}
    >
      {recipe.tags && recipe.tags[0] && <span className="tab">{recipe.tags[0]}</span>}
      <h3 className="display">{recipe.title || 'Untitled recipe'}</h3>
      <div className="meta">
        {recipe.prepTime && <span>⏱ {recipe.prepTime}</span>}
        {recipe.servings && <span>🍽 {recipe.servings}</span>}
        {recipe.rating ? <span>{'★'.repeat(recipe.rating)}</span> : null}
      </div>
      {recipe.ingredients && recipe.ingredients.length > 0 && (
        <div className="snippet">
          {recipe.ingredients.slice(0, 4).map((i) => (typeof i === 'string' ? i : i.raw)).join(' · ')}
        </div>
      )}
      {reason && <span className="reason-chip">{reason}</span>}
    </div>
  );
}
