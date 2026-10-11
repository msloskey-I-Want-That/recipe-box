import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Plus, Minus, X, ShoppingCart, ChefHat } from 'lucide-react';
import EmptyState from './EmptyState';
import { normalizeIngredient } from '../utils/recipeParser';
import { fetchWeeklyTargets, getSyncId } from '../utils/healthTrackerSync';

const PLAN_KEY = 'recipe-box-week-plan';

function loadPlan() {
  try {
    return JSON.parse(localStorage.getItem(PLAN_KEY) || '{}');
  } catch {
    return {};
  }
}

export default function MealPlanner({ recipes, onSelect }) {
  const [plan, setPlan] = useState(loadPlan);
  const [search, setSearch] = useState('');
  const [weeklyTargets, setWeeklyTargets] = useState(null);
  const [checked, setChecked] = useState({});

  useEffect(() => {
    localStorage.setItem(PLAN_KEY, JSON.stringify(plan));
  }, [plan]);

  useEffect(() => {
    if (!getSyncId()) return;
    fetchWeeklyTargets().then(setWeeklyTargets).catch(() => setWeeklyTargets(null));
  }, []);

  const plannedRecipes = useMemo(
    () =>
      Object.entries(plan)
        .map(([id, servings]) => ({ recipe: recipes.find((r) => r.id === id), servings }))
        .filter((x) => x.recipe),
    [plan, recipes]
  );

  const addToPlan = (id) => setPlan((p) => ({ ...p, [id]: (p[id] || 0) + 1 }));
  const changeServings = (id, delta) =>
    setPlan((p) => {
      const next = Math.max(0, (p[id] || 0) + delta);
      if (next === 0) {
        const { [id]: _, ...rest } = p;
        return rest;
      }
      return { ...p, [id]: next };
    });
  const removeFromPlan = (id) =>
    setPlan((p) => {
      const { [id]: _, ...rest } = p;
      return rest;
    });

  const totals = plannedRecipes.reduce(
    (acc, { recipe, servings }) => {
      const m = recipe.macros;
      if (!m) return acc;
      acc.calories += (m.calories || 0) * servings;
      acc.protein += (m.protein || 0) * servings;
      acc.carbs += (m.carbs || 0) * servings;
      acc.fat += (m.fat || 0) * servings;
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  // Combined shopping list -- deduped by normalized ingredient text. This is
  // a "what do I need to buy" checklist, not exact combined-quantity math
  // (e.g. two recipes each needing "1 onion" still shows as one line item).
  const shoppingList = useMemo(() => {
    const seen = new Map();
    plannedRecipes.forEach(({ recipe }) => {
      (recipe.ingredients || []).forEach((ing) => {
        const raw = typeof ing === 'string' ? ing : ing.raw;
        const key = normalizeIngredient(raw);
        if (!key) return;
        if (!seen.has(key)) seen.set(key, { raw, recipes: new Set() });
        seen.get(key).recipes.add(recipe.title);
      });
    });
    return Array.from(seen.entries()).map(([key, v]) => ({
      key,
      raw: v.raw,
      usedIn: Array.from(v.recipes)
    }));
  }, [plannedRecipes]);

  const searchResults = search.trim()
    ? recipes.filter(
        (r) => !plan[r.id] && (r.title || '').toLowerCase().includes(search.trim().toLowerCase())
      )
    : [];

  const toggleChecked = (key) => setChecked((c) => ({ ...c, [key]: !c[key] }));

  const proteinOk = !weeklyTargets || totals.protein >= weeklyTargets.protein;
  const caloriesOk = !weeklyTargets || totals.calories <= weeklyTargets.calories;

  return (
    <div>
      <div className="brand-bar">
        <h1 className="display">This Week's Plan</h1>
      </div>

      <div className="pantry-box glass-card">
        <div className="section-label">Add a recipe to this week</div>
        <div className="search-row" style={{ marginBottom: 0 }}>
          <input
            placeholder="Search your recipes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {searchResults.length > 0 && (
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {searchResults.slice(0, 6).map((r) => (
              <button
                key={r.id}
                className="btn btn-ghost btn-small"
                style={{ justifyContent: 'space-between' }}
                onClick={() => {
                  addToPlan(r.id);
                  setSearch('');
                }}
              >
                {r.title} <Plus size={14} />
              </button>
            ))}
          </div>
        )}
      </div>

      {plannedRecipes.length === 0 ? (
        <EmptyState title="Nothing planned yet">
          Search above and add a few recipes to plan out this week's meal prep.
        </EmptyState>
      ) : (
        <>
          <div className="card-list" style={{ marginBottom: 16 }}>
            {plannedRecipes.map(({ recipe, servings }) => (
              <div key={recipe.id} className="recipe-card" style={{ cursor: 'default' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <h3 onClick={() => onSelect(recipe.id)} style={{ cursor: 'pointer' }}>{recipe.title}</h3>
                  <button className="icon-btn" style={{ width: 28, height: 28, flexShrink: 0 }} onClick={() => removeFromPlan(recipe.id)}>
                    <X size={14} />
                  </button>
                </div>
                {recipe.macros && recipe.macros.calories > 0 && (
                  <div className="macro-badges">
                    <span className="macro-badge cal">{recipe.macros.calories * servings} cal</span>
                    <span className="macro-badge">{recipe.macros.protein * servings}g P</span>
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
                  <span style={{ fontSize: 12, color: 'var(--ink-soft)', fontWeight: 600 }}>Times this week:</span>
                  <button className="icon-btn" style={{ width: 28, height: 28 }} onClick={() => changeServings(recipe.id, -1)}><Minus size={14} /></button>
                  <span className="mono" style={{ fontWeight: 700, minWidth: 16, textAlign: 'center' }}>{servings}</span>
                  <button className="icon-btn" style={{ width: 28, height: 28 }} onClick={() => changeServings(recipe.id, 1)}><Plus size={14} /></button>
                </div>
              </div>
            ))}
          </div>

          <div className="detail-card glass-strong">
            <div className="section-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <CalendarDays size={14} /> Week totals
            </div>
            <div className="macro-summary">
              <div className="macro-summary-item">
                <span className="macro-num" style={{ color: caloriesOk ? 'var(--ink)' : 'var(--coral)' }}>{Math.round(totals.calories)}</span>
                <span className="macro-lbl">calories</span>
              </div>
              <div className="macro-summary-item">
                <span className="macro-num" style={{ color: proteinOk ? 'var(--ink)' : 'var(--coral)' }}>{Math.round(totals.protein)}g</span>
                <span className="macro-lbl">protein</span>
              </div>
              <div className="macro-summary-item">
                <span className="macro-num">{Math.round(totals.carbs)}g</span>
                <span className="macro-lbl">carbs</span>
              </div>
              <div className="macro-summary-item">
                <span className="macro-num">{Math.round(totals.fat)}g</span>
                <span className="macro-lbl">fat</span>
              </div>
            </div>
            {weeklyTargets ? (
              <p className="settings-hint" style={{ marginTop: 10 }}>
                Weekly target: {weeklyTargets.calories} cal · {weeklyTargets.protein}g protein.{' '}
                {!proteinOk && 'This plan is short on protein for the week.'}
                {!caloriesOk && ' This plan runs over your weekly calorie target.'}
                {proteinOk && caloriesOk && 'This plan fits your weekly targets.'}
              </p>
            ) : (
              <p className="settings-hint" style={{ marginTop: 10 }}>
                Add your Health Tracker Sync ID in Settings to compare this against your weekly targets.
              </p>
            )}
          </div>

          {shoppingList.length > 0 && (
            <div className="detail-card glass-strong" style={{ marginTop: 14 }}>
              <div className="section-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <ShoppingCart size={14} /> Shopping list
              </div>
              {shoppingList.map(({ key, raw, usedIn }) => (
                <label
                  key={key}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '7px 0', borderBottom: '1px solid var(--divider)', cursor: 'pointer' }}
                >
                  <input
                    type="checkbox"
                    checked={!!checked[key]}
                    onChange={() => toggleChecked(key)}
                    style={{ marginTop: 3 }}
                  />
                  <span style={{ textDecoration: checked[key] ? 'line-through' : 'none', color: checked[key] ? 'var(--ink-soft)' : 'var(--ink)', fontSize: 14 }}>
                    {raw}
                    {usedIn.length > 1 && (
                      <span style={{ fontSize: 11, color: 'var(--ink-soft)', display: 'block' }}>
                        for {usedIn.join(', ')}
                      </span>
                    )}
                  </span>
                </label>
              ))}
              <p className="settings-hint" style={{ marginTop: 10 }}>
                <ChefHat size={12} style={{ verticalAlign: '-2px' }} /> Combined by ingredient name, not exact
                quantity — if two recipes both need onion, check your amounts before shopping.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
