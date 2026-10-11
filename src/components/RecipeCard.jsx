import React from 'react';
import { Clock, Users, Heart, Flame } from 'lucide-react';
import { colorForTag } from '../utils/tagColor';

export default function RecipeCard({ recipe, onClick, reason }) {
  const isFavorite = recipe.liked || (recipe.rating || 0) >= 4;
  const primaryTag = recipe.tags && recipe.tags[0];
  const tagColor = primaryTag ? colorForTag(primaryTag) : null;
  const macros = recipe.macros;

  return (
    <div
      className={`recipe-card glass-card${isFavorite ? ' favorite' : ''}`}
      style={tagColor && !isFavorite ? { '--accent': tagColor.bg } : undefined}
      onClick={onClick}
    >
      {primaryTag && (
        <span className="tab" style={{ background: tagColor.bg }}>{primaryTag}</span>
      )}
      {isFavorite && <Heart size={16} className="favorite-icon" fill="currentColor" />}

      <h3 className="display">{recipe.title || 'Untitled recipe'}</h3>

      <div className="meta">
        {recipe.prepTime && <span><Clock size={13} /> {recipe.prepTime}</span>}
        {recipe.servings && <span><Users size={13} /> {recipe.servings}</span>}
        {recipe.rating ? <span className="rating-pips">{'★'.repeat(recipe.rating)}</span> : null}
      </div>

      {macros && macros.calories > 0 && (
        <div className="macro-badges">
          <span className="macro-badge cal"><Flame size={12} /> {macros.calories} cal</span>
          <span className="macro-badge">{macros.protein}g P</span>
          <span className="macro-badge">{macros.carbs}g C</span>
          <span className="macro-badge">{macros.fat}g F</span>
        </div>
      )}

      {recipe.ingredients && recipe.ingredients.length > 0 && (
        <div className="snippet">
          {recipe.ingredients.slice(0, 4).map((i) => (typeof i === 'string' ? i : i.raw)).join(' · ')}
        </div>
      )}
      {reason && <span className="reason-chip">{reason}</span>}
    </div>
  );
}
