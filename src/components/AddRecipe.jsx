import React, { Suspense, lazy, useState } from 'react';
import RecipeForm, { formValuesToRecipe } from './RecipeForm';
import { parseRecipeText } from '../utils/recipeParser';

// Loaded only when the "Photo (OCR)" tab is opened, since Tesseract.js is a
// large library that most sessions (typing/pasting recipes) never need.
const OcrCapture = lazy(() => import('./OcrCapture'));

const MODES = [
  { id: 'manual', label: 'Type it in' },
  { id: 'paste', label: 'Paste from web' },
  { id: 'photo', label: 'Photo (OCR)' }
];

export default function AddRecipe({ onSave, uploadPhoto }) {
  const [mode, setMode] = useState('manual');
  const [pastedText, setPastedText] = useState('');
  const [parsedValues, setParsedValues] = useState(null);
  const [pendingPhoto, setPendingPhoto] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleParsePaste = () => {
    if (!pastedText.trim()) return;
    const parsed = parseRecipeText(pastedText);
    setParsedValues({
      title: parsed.title,
      ingredientsText: parsed.ingredients.join('\n'),
      stepsText: parsed.steps.join('\n'),
      tagsText: parsed.tags.join(', '),
      prepTime: '',
      servings: '',
      sourceUrl: '',
      notes: ''
    });
  };

  const handleOcrExtracted = (text, file) => {
    const parsed = parseRecipeText(text);
    setParsedValues({
      title: parsed.title,
      ingredientsText: parsed.ingredients.join('\n'),
      stepsText: parsed.steps.join('\n'),
      tagsText: parsed.tags.join(', '),
      prepTime: '',
      servings: '',
      sourceUrl: '',
      notes: ''
    });
    setPendingPhoto(file);
  };

  const handleSave = async (recipeData) => {
    setSaving(true);
    let imageUrl = null;
    try {
      if (pendingPhoto) {
        imageUrl = await uploadPhoto(pendingPhoto);
      }
      await onSave({
        ...recipeData,
        source: mode,
        imageUrl,
        rating: 0,
        liked: false
      });
      setParsedValues(null);
      setPastedText('');
      setPendingPhoto(null);
      setMode('manual');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="brand-bar">
        <h1 className="display">Add a Recipe</h1>
      </div>

      <div className="import-tabs">
        {MODES.map((m) => (
          <button
            key={m.id}
            className={mode === m.id ? 'active' : ''}
            onClick={() => {
              setMode(m.id);
              setParsedValues(null);
            }}
          >
            {m.label}
          </button>
        ))}
      </div>

      {mode === 'manual' && (
        <RecipeForm
          key="manual"
          initialValues={{}}
          onSave={handleSave}
          saveLabel={saving ? 'Saving…' : 'Save recipe'}
        />
      )}

      {mode === 'paste' && !parsedValues && (
        <div>
          <div className="field">
            <label>Paste the recipe text from a website</label>
            <textarea
              rows={10}
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder="Copy the recipe (title, ingredients, steps) from the webpage and paste it here…"
            />
          </div>
          <p style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
            Browsers won't let this app fetch other websites directly, so copy/paste is the free
            way in — I'll do my best to split it into ingredients and steps automatically.
          </p>
          <button className="btn btn-primary" onClick={handleParsePaste} disabled={!pastedText.trim()}>
            Parse recipe
          </button>
        </div>
      )}

      {mode === 'photo' && !parsedValues && (
        <Suspense fallback={<p style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Loading photo scanner…</p>}>
          <OcrCapture onExtracted={handleOcrExtracted} />
        </Suspense>
      )}

      {(mode === 'paste' || mode === 'photo') && parsedValues && (
        <div>
          <p style={{ fontSize: 13, color: 'var(--tin)', marginBottom: 10 }}>
            Here's my best guess — clean up anything that got mis-split before saving.
          </p>
          <RecipeForm
            initialValues={parsedValues}
            onSave={handleSave}
            onCancel={() => setParsedValues(null)}
            saveLabel={saving ? 'Saving…' : 'Save recipe'}
          />
        </div>
      )}
    </div>
  );
}
