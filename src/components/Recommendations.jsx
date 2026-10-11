import React, { useEffect, useState } from 'react';
import { Sparkles, Loader2, ChefHat, Target, History, HeartPulse } from 'lucide-react';
import RecipeCard from './RecipeCard';
import EmptyState from './EmptyState';
import { getRecommendations, buildProfile } from '../utils/recommend';
import { suggestSimilarRecipes } from '../utils/claudeSuggest';
import { getSyncId, daysSince } from '../utils/healthTrackerSync';

const PANTRY_KEY = 'recipe-box-pantry';

export default function Recommendations({ recipes, onSelect, healthInsights, budget }) {
  const [pantryItems, setPantryItems] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(PANTRY_KEY) || '[]');
    } catch {
      return [];
    }
  });
  const [pantryInput, setPantryInput] = useState('');
  const [ideas, setIdeas] = useState('');
  const [ideasLoading, setIdeasLoading] = useState(false);
  const [ideasError, setIdeasError] = useState('');
  const insights = healthInsights;

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

  const cookCounts = insights?.cookCounts || {};
  const lastCooked = insights?.lastCooked || {};
  const injectionContext = insights?.injection || null;

  const profile = buildProfile(recipes, cookCounts);
  const ranked = getRecommendations(recipes, { pantryItems, cookCounts, budget, injectionContext });
  const hasPantry = pantryItems.length > 0;
  const topResults = ranked.filter((r) => r.combined > 0).slice(0, 12);
  const liked = recipes.filter((r) => r.liked || (r.rating || 0) >= 4);

  // Recipes cooked at least twice before, but not in the last 30 days --
  // worth a reminder they exist, separate from the main ranked list.
  const rediscover = recipes
    .map((r) => {
      const title = (r.title || '').trim().toLowerCase();
      const count = cookCounts[title] || 0;
      const last = lastCooked[title];
      const gap = daysSince(last);
      return { recipe: r, count, gap };
    })
    .filter((x) => x.count >= 2 && x.gap != null && x.gap > 30)
    .sort((a, b) => b.gap - a.gap)
    .slice(0, 5);

  const handleGetIdeas = async () => {
    setIdeasLoading(true);
    setIdeasError('');
    setIdeas('');
    try {
      const text = await suggestSimilarRecipes(liked);
      setIdeas(text);
    } catch (err) {
      setIdeasError(err.message);
    } finally {
      setIdeasLoading(false);
    }
  };

  return (
    <div>
      <div className="brand-bar">
        <h1 className="display">Cook Tonight</h1>
      </div>

      {injectionContext?.isInjectionWindow && (
        <div className="pantry-box glass-card" style={{ borderLeft: '3px solid var(--coral)' }}>
          <div className="section-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <HeartPulse size={14} /> Injection window
          </div>
          <p style={{ fontSize: 13, color: 'var(--ink-soft)', margin: 0 }}>
            Logged an injection {injectionContext.daysSinceInjection === 0 ? 'today' : `${injectionContext.daysSinceInjection} day${injectionContext.daysSinceInjection === 1 ? '' : 's'} ago`} —
            recipes tagged <strong>gentle</strong> get a boost below. Tag any easy-on-the-stomach
            recipes with "gentle" (in its edit screen) to build this out.
          </p>
        </div>
      )}

      {budget && (
        <div className="pantry-box glass-card">
          <div className="section-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Target size={14} /> Today's remaining budget
          </div>
          <div className="macro-summary" style={{ margin: 0 }}>
            <div className="macro-summary-item">
              <span className="macro-num">{budget.remaining.calories}</span>
              <span className="macro-lbl">cal left</span>
            </div>
            <div className="macro-summary-item">
              <span className="macro-num">{budget.remaining.protein}g</span>
              <span className="macro-lbl">protein left</span>
            </div>
            <div className="macro-summary-item">
              <span className="macro-num">{budget.remaining.carbs}g</span>
              <span className="macro-lbl">carbs left</span>
            </div>
            <div className="macro-summary-item">
              <span className="macro-num">{budget.remaining.fat}g</span>
              <span className="macro-lbl">fat left</span>
            </div>
          </div>
        </div>
      )}

      <div className="pantry-box glass-card">
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

      {liked.length > 0 && (
        <div className="pantry-box glass-card" style={{ marginTop: -6 }}>
          <div className="section-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Sparkles size={14} /> New dinner ideas
          </div>
          {!ideas && !ideasLoading && (
            <button className="btn btn-cta" onClick={handleGetIdeas}>
              <Sparkles size={16} /> Ask Claude, based on my favorites
            </button>
          )}
          {ideasLoading && <p className="settings-hint"><Loader2 size={14} className="spin" /> Thinking it over…</p>}
          {ideasError && <p style={{ fontSize: 13, color: 'var(--coral)' }}>{ideasError}</p>}
          {ideas && (
            <>
              <p style={{ fontSize: 14, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{ideas}</p>
              <button className="btn btn-ghost btn-small" onClick={handleGetIdeas}>Ask again</button>
            </>
          )}
        </div>
      )}

      {rediscover.length > 0 && (
        <>
          <div className="section-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <History size={14} /> Haven't made this in a while
          </div>
          <div className="card-list" style={{ marginBottom: 16 }}>
            {rediscover.map(({ recipe, gap }) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                onClick={() => onSelect(recipe.id)}
                reason={`Last made ${gap} days ago`}
              />
            ))}
          </div>
        </>
      )}

      {profile.likedCount === 0 && !hasPantry && (
        <EmptyState title="No hints to go on yet">
          Favorite (♥) or rate a few recipes you love, or list what's in your kitchen above —
          recommendations get smarter the more you use the box.
        </EmptyState>
      )}

      {topResults.length === 0 && (profile.likedCount > 0 || hasPantry) && (
        <EmptyState title="Nothing matches yet">
          Add a few more recipes to your box and this list will start filling in.
        </EmptyState>
      )}

      <div className="card-list">
        {topResults.map(({ recipe, pantry, profileScore, cookCount, budgetResult, gentleBonus }, idx) => {
          let reason = null;
          if (gentleBonus > 0) {
            reason = 'Gentle on the stomach';
          } else if (budgetResult && budgetResult.proteinFit >= 0.4 && !budgetResult.overCalories) {
            reason = `Fits your remaining protein & calories today`;
          } else if (pantry && pantry.have.length > 0) {
            const pct = Math.round(pantry.score * 100);
            reason = pct === 100 ? "You have everything for this" : `${pct}% of ingredients on hand`;
          } else if (cookCount > 0) {
            reason = `Cooked ${cookCount}× before`;
          } else if (profileScore > 0) {
            reason = 'Matches recipes you love';
          }
          return (
            <div key={recipe.id} className="card-enter" style={{ animationDelay: `${Math.min(idx, 8) * 35}ms` }}>
              <RecipeCard recipe={recipe} onClick={() => onSelect(recipe.id)} reason={reason} />
            </div>
          );
        })}
      </div>

      {!getSyncId() && recipes.length > 0 && (
        <p className="settings-hint" style={{ textAlign: 'center', marginTop: 4 }}>
          <ChefHat size={12} style={{ verticalAlign: '-2px' }} /> Add your Health Tracker Sync ID in
          Settings to see today's budget, injection-window awareness, and cook-history insights.
        </p>
      )}
    </div>
  );
}
