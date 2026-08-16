import React, { useState } from 'react';
import RecipeForm, { recipeToFormValues } from './RecipeForm';
import { normalizeIngredient } from '../utils/recipeParser';

export default function RecipeDetail({ recipe, onBack, onUpdate, onDelete, pantryItems = [] }) {
  const [editing, setEditing] = useState(false);

  if (!recipe) return null;

  if (editing) {
    return (
      <div>
        <button className="btn btn-ghost" onClick={() => setEditing(false)} style={{ marginBottom: 14 }}>
          ← Back to recipe
        </button>
        <RecipeForm
          initialValues={recipeToFormValues(recipe)}
          saveLabel="Save changes"
          onCancel={() => setEditing(false)}
          onSave={(updated) => {
            onUpdate(recipe.id, updated);
            setEditing(false);
          }}
        />
      </div>
    );
  }

  const pantrySet = pantryItems.map((p) => normalizeIngredient(p));
  const isIngredientOnHand = (raw) => {
    if (pantrySet.length === 0) return null;
    const norm = normalizeIngredient(raw);
    return pantrySet.some((p) => norm.includes(p) || p.includes(norm));
  };

  return (
    <div>
      <button className="btn btn-ghost" onClick={onBack} style={{ marginBottom: 14 }}>
        ← Back
      </button>

      <div className="detail-card">
        <h2 className="display">{recipe.title}</h2>
        <div className="detail-meta">
          {recipe.prepTime && <span>⏱ {recipe.prepTime}</span>}
          {recipe.servings && <span>🍽 serves {recipe.servings}</span>}
          {recipe.sourceUrl && (
            <a href={recipe.sourceUrl} target="_blank" rel="noreferrer">🔗 source</a>
          )}
        </div>

        <div>
          <span className="stars" onClick={() => {}}>
            {[1, 2, 3, 4, 5].map((n) => (
              <span
                key={n}
                onClick={() => onUpdate(recipe.id, { rating: n })}
                style={{ opacity: n <= (recipe.rating || 0) ? 1 : 0.3 }}
              >
                ★
              </span>
            ))}
          </span>
        </div>

        {recipe.tags && recipe.tags.length > 0 && (
          <div className="tag-row" style={{ marginTop: 8 }}>
            {recipe.tags.map((t) => (
              <span key={t} className="tag-pill">{t}</span>
            ))}
          </div>
        )}

        <hr className="divider" />

        <div className="section-label">Ingredients</div>
        {(recipe.ingredients || []).map((ing, idx) => {
          const raw = typeof ing === 'string' ? ing : ing.raw;
          const onHand = isIngredientOnHand(raw);
          const cls = onHand === true ? 'have' : onHand === false ? 'missing' : '';
          return (
            <div key={idx} className={`ingredient-line ${cls}`}>
              {onHand === true ? '✓ ' : ''}{raw}
            </div>
          );
        })}

        <hr className="divider" />

        <div className="section-label">Steps</div>
        {(recipe.steps || []).map((step, idx) => (
          <div key={idx} className="step-line">
            <span className="step-num">{idx + 1}.</span>
            <span>{step}</span>
          </div>
        ))}

        {recipe.notes && (
          <>
            <hr className="divider" />
            <div className="section-label">Notes</div>
            <p style={{ fontSize: 14, color: 'var(--ink-soft)' }}>{recipe.notes}</p>
          </>
        )}

        <div className="btn-row">
          <button
            className={`btn ${recipe.liked ? 'btn-rust' : 'btn-ghost'}`}
            onClick={() => onUpdate(recipe.id, { liked: !recipe.liked })}
          >
            {recipe.liked ? '♥ Favorited' : '♡ Favorite'}
          </button>
          <button className="btn btn-brass" onClick={() => setEditing(true)}>Edit</button>
          <button
            className="btn btn-ghost"
            onClick={() => {
              if (confirm(`Delete "${recipe.title}"? This can't be undone.`)) {
                onDelete(recipe.id);
                onBack();
              }
            }}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
