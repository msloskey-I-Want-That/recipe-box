import React, { useState } from 'react';

const emptyRecipe = {
  title: '',
  ingredientsText: '',
  stepsText: '',
  tagsText: '',
  prepTime: '',
  servings: '',
  sourceUrl: '',
  notes: ''
};

// Converts a recipe object (ingredients/steps as arrays) into the flat
// text-area-friendly shape this form edits, and back again on save.
export function recipeToFormValues(recipe) {
  return {
    title: recipe.title || '',
    ingredientsText: (recipe.ingredients || [])
      .map((i) => (typeof i === 'string' ? i : i.raw || ''))
      .join('\n'),
    stepsText: (recipe.steps || []).join('\n'),
    tagsText: (recipe.tags || []).join(', '),
    prepTime: recipe.prepTime || '',
    servings: recipe.servings || '',
    sourceUrl: recipe.sourceUrl || '',
    notes: recipe.notes || ''
  };
}

export function formValuesToRecipe(values) {
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
    prepTime: values.prepTime.trim(),
    servings: values.servings.trim(),
    sourceUrl: values.sourceUrl.trim(),
    notes: values.notes.trim()
  };
}

export default function RecipeForm({ initialValues, onSave, onCancel, saveLabel = 'Save recipe' }) {
  const [values, setValues] = useState({ ...emptyRecipe, ...initialValues });

  const update = (field) => (e) => setValues((v) => ({ ...v, [field]: e.target.value }));

  const handleSave = () => {
    if (!values.title.trim()) return;
    onSave(formValuesToRecipe(values));
  };

  return (
    <div>
      <div className="field">
        <label>Title</label>
        <input value={values.title} onChange={update('title')} placeholder="Grandma's Sunday Sauce" />
      </div>

      <div className="field">
        <label>Ingredients (one per line)</label>
        <textarea
          value={values.ingredientsText}
          onChange={update('ingredientsText')}
          placeholder={'2 lbs ground beef\n1 cup breadcrumbs\n2 eggs'}
          rows={6}
        />
      </div>

      <div className="field">
        <label>Steps (one per line)</label>
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

      <div style={{ display: 'flex', gap: 10 }}>
        <div className="field" style={{ flex: 1 }}>
          <label>Prep / cook time</label>
          <input value={values.prepTime} onChange={update('prepTime')} placeholder="45 min" />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label>Servings</label>
          <input value={values.servings} onChange={update('servings')} placeholder="4-6" />
        </div>
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
