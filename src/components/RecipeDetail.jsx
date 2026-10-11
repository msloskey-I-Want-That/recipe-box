import React, { useState } from 'react';
import {
  ChevronLeft, Pencil, Trash2, Heart, Star, Clock, Users, ExternalLink,
  Flame, Sparkles, Loader2, ChefHat, Activity, FolderOpen
} from 'lucide-react';
import RecipeForm, { recipeToFormValues } from './RecipeForm';
import { normalizeIngredient } from '../utils/recipeParser';
import { suggestImprovements } from '../utils/claudeSuggest';
import { glucoseInfoForRecipe } from '../utils/healthTrackerSync';
import { scaleIngredients, scaleMacros } from '../utils/scaleRecipe';
import CookMode from './CookMode';

const FAMILY_MEMBERS = ['Stacy', 'Ryan', 'Brandon'];
const SCALE_OPTIONS = [0.5, 1, 2, 3];

export default function RecipeDetail({ recipe, onBack, onUpdate, onDelete, pantryItems = [], healthInsights = null, onLogCook }) {
  const [editing, setEditing] = useState(false);
  const [cooking, setCooking] = useState(false);
  const [scaleFactor, setScaleFactor] = useState(1);
  const [suggestion, setSuggestion] = useState('');
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestError, setSuggestError] = useState('');

  if (!recipe) return null;

  if (editing) {
    return (
      <div>
        <button className="btn btn-ghost" onClick={() => setEditing(false)} style={{ marginBottom: 14 }}>
          <ChevronLeft size={16} /> Back to recipe
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

  const handleSuggest = async () => {
    setSuggestLoading(true);
    setSuggestError('');
    setSuggestion('');
    try {
      const text = await suggestImprovements(recipe);
      setSuggestion(text);
    } catch (err) {
      setSuggestError(err.message);
    } finally {
      setSuggestLoading(false);
    }
  };

  const displayedIngredients = scaleFactor === 1 ? (recipe.ingredients || []) : scaleIngredients(recipe.ingredients, scaleFactor);
  const displayedMacros = scaleFactor === 1 ? recipe.macros : scaleMacros(recipe.macros, scaleFactor);
  const baseServings = parseFloat(recipe.servings);
  const displayedServings = !isNaN(baseServings) ? Math.round(baseServings * scaleFactor * 10) / 10 : recipe.servings;

  const macros = displayedMacros;

  return (
    <div>
      <button className="btn btn-ghost" onClick={onBack} style={{ marginBottom: 14 }}>
        <ChevronLeft size={16} /> Back
      </button>

      <div className="detail-card glass-strong">
        <h2 className="display">{recipe.title}</h2>
        <div className="detail-meta">
          {recipe.prepTime && <span><Clock size={14} /> {recipe.prepTime}</span>}
          {recipe.servings && <span><Users size={14} /> serves {displayedServings}</span>}
          {recipe.sourceUrl && (
            <a href={recipe.sourceUrl} target="_blank" rel="noreferrer"><ExternalLink size={14} /> source</a>
          )}
        </div>

        <div className="scale-row">
          <span className="settings-hint" style={{ margin: 0 }}>Scale:</span>
          {SCALE_OPTIONS.map((f) => (
            <button
              key={f}
              className={`scale-chip${scaleFactor === f ? ' on' : ''}`}
              onClick={() => setScaleFactor(f)}
            >
              {f === 0.5 ? '½×' : `${f}×`}
            </button>
          ))}
        </div>

        <div className="stars">
          {[1, 2, 3, 4, 5].map((n) => (
            <Star
              key={n}
              size={22}
              fill={n <= (recipe.rating || 0) ? 'currentColor' : 'none'}
              onClick={() => onUpdate(recipe.id, { rating: n })}
            />
          ))}
        </div>

        {recipe.collections && recipe.collections.length > 0 && (
          <div className="tag-row" style={{ marginTop: 4 }}>
            {recipe.collections.map((c) => (
              <span key={c} className="tag-pill" style={{ color: 'var(--teal)', background: 'var(--teal-tint)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <FolderOpen size={11} /> {c}
              </span>
            ))}
          </div>
        )}

        {recipe.tags && recipe.tags.length > 0 && (
          <div className="tag-row" style={{ marginTop: 8 }}>
            {recipe.tags.map((t) => (
              <span key={t} className="tag-pill">{t}</span>
            ))}
          </div>
        )}

        {macros && macros.calories > 0 && (
          <div className="macro-summary">
            <div className="macro-summary-item">
              <Flame size={16} />
              <span className="macro-num">{macros.calories}</span>
              <span className="macro-lbl">cal</span>
            </div>
            <div className="macro-summary-item">
              <span className="macro-num">{macros.protein}g</span>
              <span className="macro-lbl">protein</span>
            </div>
            <div className="macro-summary-item">
              <span className="macro-num">{macros.carbs}g</span>
              <span className="macro-lbl">carbs</span>
            </div>
            <div className="macro-summary-item">
              <span className="macro-num">{macros.fat}g</span>
              <span className="macro-lbl">fat</span>
            </div>
          </div>
        )}
        {scaleFactor !== 1 && (
          <p className="settings-hint">Scaled {scaleFactor === 0.5 ? 'to half' : `${scaleFactor}×`} — original recipe is unchanged.</p>
        )}

        {healthInsights && glucoseInfoForRecipe(recipe, healthInsights.glucose) && (
          <p className="settings-hint" style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <Activity size={13} />
            Your logs show this averaging{' '}
            {glucoseInfoForRecipe(recipe, healthInsights.glucose).avg} mg/dL 2hrs after, across{' '}
            {glucoseInfoForRecipe(recipe, healthInsights.glucose).count} times — for your own reference,
            not a medical read.
          </p>
        )}

        <hr className="divider" />

        <div className="section-label">Family ratings</div>
        <div className="family-ratings">
          {FAMILY_MEMBERS.map((name) => (
            <div key={name} className="family-rating-row">
              <span className="family-rating-name">{name}</span>
              <div className="stars" style={{ marginBottom: 0 }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    size={17}
                    fill={n <= (recipe.familyRatings?.[name] || 0) ? 'currentColor' : 'none'}
                    onClick={() =>
                      onUpdate(recipe.id, {
                        familyRatings: { ...(recipe.familyRatings || {}), [name]: n }
                      })
                    }
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        <hr className="divider" />

        <div className="section-label">Ingredients</div>
        {displayedIngredients.map((raw, idx) => {
          const onHand = isIngredientOnHand(raw);
          const cls = onHand === true ? 'have' : onHand === false ? 'missing' : '';
          return (
            <div key={idx} className={`ingredient-line ${cls}`}>
              {onHand === true ? '✓ ' : ''}{raw}
            </div>
          );
        })}

        <hr className="divider" />

        <div className="section-row">
          <div className="section-label" style={{ margin: 0 }}>Steps</div>
          {recipe.steps && recipe.steps.length > 0 && (
            <button className="btn btn-cta btn-small" onClick={() => setCooking(true)}>
              <ChefHat size={15} /> Start Cooking
            </button>
          )}
        </div>
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
            <Heart size={16} fill={recipe.liked ? 'currentColor' : 'none'} /> {recipe.liked ? 'Favorited' : 'Favorite'}
          </button>
          {onLogCook && (
            <button className="btn btn-cta" onClick={() => onLogCook(recipe)}>
              <Flame size={16} /> Log this cook
            </button>
          )}
          <button className="btn btn-brass" onClick={() => setEditing(true)}><Pencil size={16} /> Edit</button>
          <button
            className="btn btn-ghost"
            onClick={() => {
              if (confirm(`Delete "${recipe.title}"? This can't be undone.`)) {
                onDelete(recipe.id);
                onBack();
              }
            }}
          >
            <Trash2 size={16} /> Delete
          </button>
        </div>
      </div>

      <div className="detail-card glass-strong suggest-panel">
        <div className="section-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Sparkles size={14} /> Make this dinner better
        </div>
        {!suggestion && !suggestLoading && (
          <button className="btn btn-cta" onClick={handleSuggest}>
            <Sparkles size={16} /> Ask Claude for ideas
          </button>
        )}
        {suggestLoading && (
          <p className="settings-hint"><Loader2 size={14} className="spin" /> Thinking it over…</p>
        )}
        {suggestError && <p style={{ fontSize: 13, color: 'var(--coral)' }}>{suggestError}</p>}
        {suggestion && (
          <>
            <p style={{ fontSize: 14, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{suggestion}</p>
            <button className="btn btn-ghost btn-small" onClick={handleSuggest}>Ask again</button>
          </>
        )}
      </div>

      {cooking && <CookMode recipe={recipe} ingredients={displayedIngredients} onClose={() => setCooking(false)} />}
    </div>
  );
}
