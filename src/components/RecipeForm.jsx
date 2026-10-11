import React, { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { estimateRecipeMacros, macrosPerServing } from '../utils/nutrition';
import DictateButton from './DictateButton';

const emptyRecipe = {
  title: '',
  ingredientsText: '',
  stepsText: '',
  tagsText: '',
  collectionsText: '',
  prepTime: '',
  servings: '',
  sourceUrl: '',
  notes: '',
  calories: '',
  protein: '',
  carbs: '',
  fat: '',
  macrosSource: ''
};

// Converts a recipe object (ingredients/steps as arrays) into the flat
// text-area-friendly shape this form edits, and back again on save.
export function recipeToFormValues(recipe) {
  const m = recipe.macros || {};
  return {
    title: recipe.title || '',
    ingredientsText: (recipe.ingredients || [])
      .map((i) => (typeof i === 'string' ? i : i.raw || ''))
      .join('\n'),
    stepsText: (recipe.steps || []).join('\n'),
    tagsText: (recipe.tags || []).join(', '),
    collectionsText: (recipe.collections || []).join(', '),
    prepTime: recipe.prepTime || '',
    servings: recipe.servings || '',
    sourceUrl: recipe.sourceUrl || '',
    notes: recipe.notes || '',
    calories: m.calories ?? '',
    protein: m.protein ?? '',
    carbs: m.carbs ?? '',
    fat: m.fat ?? '',
    macrosSource: m.source || ''
  };
}

export function formValuesToRecipe(values) {
  const hasAnyMacro = ['calories', 'protein', 'carbs', 'fat'].some(
    (k) => values[k] !== '' && values[k] != null
  );

  return {
    title: values.title.trim(),
    ingredients: values.ingredientsText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean),
    steps: values.stepsText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean),
    tags: values.tagsText
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean),
    collections: values.collectionsText
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean),
    prepTime: values.prepTime.trim(),
    servings: values.servings.trim(),
    sourceUrl: values.sourceUrl.trim(),
    notes: values.notes.trim(),
    macros: hasAnyMacro
      ? {
          calories: Number(values.calories) || 0,
          protein: Number(values.protein) || 0,
          carbs: Number(values.carbs) || 0,
          fat: Number(values.fat) || 0,
          source: values.macrosSource || 'manual'
        }
      : null
  };
}

export default function RecipeForm({ initialValues, onSave, onCancel, saveLabel = 'Save recipe' }) {
  const [values, setValues] = useState({ ...emptyRecipe, ...initialValues });
  const [estimating, setEstimating] = useState(false);
  const [estimateNote, setEstimateNote] = useState('');

  const MACRO_FIELDS = ['calories', 'protein', 'carbs', 'fat'];
  const update = (field) => (e) =>
    setValues((v) => ({
      ...v,
      [field]: e.target.value,
      macrosSource: MACRO_FIELDS.includes(field) ? 'manual' : v.macrosSource
    }));

  const handleSave = () => {
    if (!values.title.trim()) return;
    onSave(formValuesToRecipe(values));
  };

  const handleEstimate = async () => {
    const lines = values.ingredientsText.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return;
    setEstimating(true);
    setEstimateNote('');
    try {
      const { totals, misses } = await estimateRecipeMacros(lines);
      const per = macrosPerServing(totals, values.servings);
      setValues((v) => ({
        ...v,
        calories: per.calories,
        protein: per.protein,
        carbs: per.carbs,
        fat: per.fat,
        macrosSource: 'auto'
      }));
      setEstimateNote(
        misses.length > 0
          ? `Estimated (couldn't match: ${misses.slice(0, 3).join(', ')}${misses.length > 3 ? '…' : ''})`
          : 'Estimated from all ingredients'
      );
    } catch (err) {
      setEstimateNote(err.message);
    } finally {
      setEstimating(false);
    }
  };

  return (
    <div>
      <div className="field">
        <label>Title</label>
        <input value={values.title} onChange={update('title')} placeholder="Grandma's Sunday Sauce" />
      </div>

      <div className="field">
        <div className="field-label-row">
          <label>Ingredients (one per line)</label>
          <DictateButton
            onResult={(text) =>
              setValues((v) => ({
                ...v,
                ingredientsText: v.ingredientsText ? `${v.ingredientsText}\n${text}` : text
              }))
            }
          />
        </div>
        <textarea
          value={values.ingredientsText}
          onChange={update('ingredientsText')}
          placeholder={'2 lbs ground beef\n1 cup breadcrumbs\n2 eggs'}
          rows={6}
        />
      </div>

      <div className="field">
        <div className="field-label-row">
          <label>Steps (one per line)</label>
          <DictateButton
            onResult={(text) =>
              setValues((v) => ({
                ...v,
                stepsText: v.stepsText ? `${v.stepsText}\n${text}` : text
              }))
            }
          />
        </div>
        <textarea
          value={values.stepsText}
          onChange={update('stepsText')}
          placeholder={'Preheat oven to 375°F\nMix all ingredients in a bowl\nBake for 25 minutes'}
          rows={6}
        />
      </div>

      <div className="field">
        <label>Tags (comma separated)</label>
        <input value={values.tagsText} onChange={update('tagsText')} placeholder="dinner, grill, family favorite" />
      </div>

      <div className="field">
        <label>Collections (comma separated)</label>
        <input
          value={values.collectionsText}
          onChange={update('collectionsText')}
          placeholder="Sunday Meal Prep, Ryan's Favorites"
        />
        <p className="settings-hint">Your own groupings, separate from tags — browse them from the Box tab.</p>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <div className="field" style={{ flex: 1 }}>
          <label>Prep / cook time</label>
          <input value={values.prepTime} onChange={update('prepTime')} placeholder="45 min" />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label>Servings</label>
          <input value={values.servings} onChange={update('servings')} placeholder="4" />
        </div>
      </div>

      <div className="macro-panel">
        <div className="macro-panel-header">
          <span className="section-label" style={{ margin: 0 }}>Macros (per serving)</span>
          <button
            type="button"
            className="btn btn-cta btn-small"
            onClick={handleEstimate}
            disabled={estimating || !values.ingredientsText.trim()}
          >
            {estimating ? <Loader2 size={14} className="spin" /> : <Sparkles size={14} />}
            {estimating ? 'Estimating…' : 'Auto-estimate'}
          </button>
        </div>

        <div className="macro-grid">
          <div className="field">
            <label>Calories</label>
            <input type="number" inputMode="numeric" value={values.calories} onChange={update('calories')} placeholder="0" />
          </div>
          <div className="field">
            <label>Protein (g)</label>
            <input type="number" inputMode="numeric" value={values.protein} onChange={update('protein')} placeholder="0" />
          </div>
          <div className="field">
            <label>Carbs (g)</label>
            <input type="number" inputMode="numeric" value={values.carbs} onChange={update('carbs')} placeholder="0" />
          </div>
          <div className="field">
            <label>Fat (g)</label>
            <input type="number" inputMode="numeric" value={values.fat} onChange={update('fat')} placeholder="0" />
          </div>
        </div>
        {estimateNote && <p className="settings-hint">{estimateNote}</p>}
        {values.macrosSource === 'auto' && !estimateNote && (
          <p className="settings-hint">Auto-estimated — edit any field to override.</p>
        )}
        {values.macrosSource === 'label' && (
          <p className="settings-hint">Read directly from the printed recipe card — edit any field to override.</p>
        )}
      </div>

      <div className="field">
        <label>Source link (optional)</label>
        <input value={values.sourceUrl} onChange={update('sourceUrl')} placeholder="https://…" />
      </div>

      <div className="field">
        <label>Notes</label>
        <textarea value={values.notes} onChange={update('notes')} rows={2} placeholder="Swap in turkey for a lighter version" />
      </div>

      <div className="btn-row">
        <button className="btn btn-primary" onClick={handleSave} disabled={!values.title.trim()}>
          {saveLabel}
        </button>
        {onCancel && (
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        )}
      </div>
    </div>
  );
}
