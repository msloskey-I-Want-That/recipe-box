import React, { Suspense, lazy, useState } from 'react';
import { Type, Link2, ClipboardPaste, Camera, Lightbulb, Loader2, SkipForward } from 'lucide-react';
import RecipeForm from './RecipeForm';
import { parseRecipeText } from '../utils/recipeParser';
import { importFromUrl } from '../utils/urlImport';
import { generateRecipeFromIdea } from '../utils/claudeSuggest';
import { estimateRecipeMacros, macrosPerServing } from '../utils/nutrition';

// Loaded only when the "Photo / PDF (OCR)" tab is opened, since Tesseract.js
// and pdf.js are large libraries that most sessions (typing/pasting) never need.
const OcrCapture = lazy(() => import('./OcrCapture'));

const MODES = [
  { id: 'manual', label: 'Type it in', icon: Type },
  { id: 'idea', label: 'From an idea', icon: Lightbulb },
  { id: 'url', label: 'From a link', icon: Link2 },
  { id: 'paste', label: 'Paste from web', icon: ClipboardPaste },
  { id: 'photo', label: 'Photo / PDF', icon: Camera }
];

const blankParsed = () => ({
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
});

export default function AddRecipe({ onSave }) {
  const [mode, setMode] = useState('manual');
  const [pastedText, setPastedText] = useState('');
  const [parsedValues, setParsedValues] = useState(null);
  const [saving, setSaving] = useState(false);

  const [urlInput, setUrlInput] = useState('');
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlError, setUrlError] = useState('');

  const [ideaListInput, setIdeaListInput] = useState('');
  const [ideaQueue, setIdeaQueue] = useState([]);
  const [ideaIndex, setIdeaIndex] = useState(0);
  const [ideaGenerating, setIdeaGenerating] = useState(false);
  const [ideaError, setIdeaError] = useState('');

  const handleParsePaste = () => {
    if (!pastedText.trim()) return;
    const parsed = parseRecipeText(pastedText);
    setParsedValues({
      ...blankParsed(),
      title: parsed.title,
      ingredientsText: parsed.ingredients.join('\n'),
      stepsText: parsed.steps.join('\n'),
      tagsText: parsed.tags.join(', ')
    });
  };

  const handleOcrTextExtracted = (text) => {
    const parsed = parseRecipeText(text);
    setParsedValues({
      ...blankParsed(),
      title: parsed.title,
      ingredientsText: parsed.ingredients.join('\n'),
      stepsText: parsed.steps.join('\n'),
      tagsText: parsed.tags.join(', ')
    });
  };

  const handleOcrStructuredExtracted = async (result) => {
    const values = {
      ...blankParsed(),
      title: result.title,
      ingredientsText: result.ingredients.join('\n'),
      stepsText: result.steps.join('\n'),
      tagsText: result.tags.join(', '),
      prepTime: result.prepTime,
      servings: result.servings
    };

    if (result.printedMacros) {
      // The source itself (e.g. a HelloFresh/Blue Apron card) already printed
      // calculated nutrition facts -- more accurate than re-deriving it from
      // ingredients, so use those numbers as-is rather than re-estimating.
      values.calories = result.printedMacros.calories;
      values.protein = result.printedMacros.protein;
      values.carbs = result.printedMacros.carbs;
      values.fat = result.printedMacros.fat;
      values.macrosSource = 'label';
    } else {
      try {
        const { totals } = await estimateRecipeMacros(result.ingredients);
        const per = macrosPerServing(totals, result.servings);
        values.calories = per.calories;
        values.protein = per.protein;
        values.carbs = per.carbs;
        values.fat = per.fat;
        values.macrosSource = 'auto';
      } catch {
        // No USDA key set, or a lookup failed -- leave macros blank.
      }
    }

    setParsedValues(values);
  };

  const handleUrlImport = async () => {
    if (!urlInput.trim()) return;
    setUrlLoading(true);
    setUrlError('');
    try {
      const result = await importFromUrl(urlInput.trim());
      setParsedValues({
        ...blankParsed(),
        title: result.title || '',
        ingredientsText: (result.ingredients || []).join('\n'),
        stepsText: (result.steps || []).join('\n'),
        tagsText: (result.tags || []).join(', '),
        prepTime: result.prepTime || '',
        servings: result.servings || '',
        sourceUrl: result.sourceUrl || urlInput.trim()
      });
    } catch (err) {
      setUrlError(err.message);
    } finally {
      setUrlLoading(false);
    }
  };

  // Generates a full recipe for one idea in the queue, then best-effort
  // auto-estimates macros from the generated ingredients (silently skipped
  // if there's no USDA key yet or the lookup fails -- the person can always
  // hit Auto-estimate themselves from the review form).
  const generateIdeaAt = async (queue, idx) => {
    setIdeaGenerating(true);
    setIdeaError('');
    setParsedValues(null);
    try {
      const result = await generateRecipeFromIdea(queue[idx]);
      const values = {
        ...blankParsed(),
        title: result.title,
        ingredientsText: result.ingredients.join('\n'),
        stepsText: result.steps.join('\n'),
        tagsText: result.tags.join(', '),
        prepTime: result.prepTime,
        servings: result.servings
      };

      try {
        const { totals } = await estimateRecipeMacros(result.ingredients);
        const per = macrosPerServing(totals, result.servings);
        values.calories = per.calories;
        values.protein = per.protein;
        values.carbs = per.carbs;
        values.fat = per.fat;
        values.macrosSource = 'auto';
      } catch {
        // No USDA key set, or a lookup failed -- leave macros blank, the
        // person can still hit Auto-estimate manually from the form.
      }

      setParsedValues(values);
    } catch (err) {
      setIdeaError(err.message);
    } finally {
      setIdeaGenerating(false);
    }
  };

  const handleGenerateIdeas = () => {
    const lines = ideaListInput.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return;
    setIdeaQueue(lines);
    setIdeaIndex(0);
    generateIdeaAt(lines, 0);
  };

  const advanceIdeaQueue = () => {
    const next = ideaIndex + 1;
    if (next < ideaQueue.length) {
      setIdeaIndex(next);
      generateIdeaAt(ideaQueue, next);
    } else {
      setIdeaQueue([]);
      setIdeaIndex(0);
      setIdeaListInput('');
      setParsedValues(null);
      setMode('manual');
    }
  };

  const handleSave = async (recipeData) => {
    setSaving(true);
    try {
      await onSave({
        ...recipeData,
        source: mode,
        rating: 0,
        liked: false
      });
      if (mode === 'idea' && ideaQueue.length > 0) {
        advanceIdeaQueue();
      } else {
        setParsedValues(null);
        setPastedText('');
        setUrlInput('');
        setUrlError('');
        setMode('manual');
      }
    } finally {
      setSaving(false);
    }
  };

  const switchMode = (id) => {
    setMode(id);
    setParsedValues(null);
    setUrlError('');
    if (id !== 'idea') {
      setIdeaQueue([]);
      setIdeaIndex(0);
    }
  };

  return (
    <div>
      <div className="brand-bar">
        <h1 className="display">Add a Recipe</h1>
      </div>

      <div className="import-tabs">
        {MODES.map((m) => {
          const Icon = m.icon;
          return (
            <button
              key={m.id}
              className={mode === m.id ? 'active' : ''}
              onClick={() => switchMode(m.id)}
            >
              <Icon size={15} /> {m.label}
            </button>
          );
        })}
      </div>

      {mode === 'manual' && (
        <RecipeForm
          key="manual"
          initialValues={{}}
          onSave={handleSave}
          saveLabel={saving ? 'Saving…' : 'Save recipe'}
        />
      )}

      {mode === 'idea' && ideaQueue.length === 0 && (
        <div>
          <div className="field">
            <label>Dinner ideas (one per line)</label>
            <textarea
              rows={8}
              value={ideaListInput}
              onChange={(e) => setIdeaListInput(e.target.value)}
              placeholder={'pasta with chicken parm\nsheet pan salmon and veggies\nturkey chili'}
            />
          </div>
          <p style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
            Paste your list from Notes — Claude turns each one into a full recipe (ingredients,
            steps, macros), one at a time, so you can review and tweak before it's saved.
          </p>
          <button className="btn btn-cta" onClick={handleGenerateIdeas} disabled={!ideaListInput.trim()}>
            <Lightbulb size={16} /> Generate recipes
          </button>
        </div>
      )}

      {mode === 'idea' && ideaQueue.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <p style={{ fontSize: 12, color: 'var(--ink-soft)', fontWeight: 600 }}>
            Idea {ideaIndex + 1} of {ideaQueue.length}: "{ideaQueue[ideaIndex]}"
          </p>
        </div>
      )}

      {mode === 'idea' && ideaGenerating && (
        <p className="settings-hint"><Loader2 size={14} className="spin" /> Writing this recipe…</p>
      )}
      {mode === 'idea' && ideaError && (
        <div>
          <p style={{ fontSize: 13, color: 'var(--coral)', marginBottom: 10 }}>{ideaError}</p>
          <button className="btn btn-ghost btn-small" onClick={advanceIdeaQueue}>
            <SkipForward size={14} /> Skip this idea
          </button>
        </div>
      )}

      {mode === 'url' && !parsedValues && (
        <div>
          <div className="field">
            <label>Recipe page link</label>
            <input
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://www.example.com/some-recipe"
              onKeyDown={(e) => e.key === 'Enter' && handleUrlImport()}
            />
          </div>
          <p style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
            Fetches the page through a free public proxy and pulls out the recipe. Works well on
            most recipe sites; if a page won't load or comes back scrambled, use "Paste from web" instead.
          </p>
          <button className="btn btn-primary" onClick={handleUrlImport} disabled={!urlInput.trim() || urlLoading}>
            {urlLoading ? 'Fetching…' : 'Fetch recipe'}
          </button>
          {urlError && (
            <p style={{ fontSize: 13, color: 'var(--coral)', marginTop: 10 }}>{urlError}</p>
          )}
        </div>
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
            Always works, no dependency on outside services — just copy the recipe text and paste
            it here, and I'll split it into ingredients and steps automatically.
          </p>
          <button className="btn btn-primary" onClick={handleParsePaste} disabled={!pastedText.trim()}>
            Parse recipe
          </button>
        </div>
      )}

      {mode === 'photo' && !parsedValues && (
        <Suspense fallback={<p style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Loading scanner…</p>}>
          <OcrCapture onTextExtracted={handleOcrTextExtracted} onStructuredExtracted={handleOcrStructuredExtracted} />
        </Suspense>
      )}

      {(mode === 'url' || mode === 'paste' || mode === 'photo' || mode === 'idea') && parsedValues && (
        <div>
          <p style={{ fontSize: 13, color: 'var(--teal)', marginBottom: 10 }}>
            {mode === 'idea'
              ? "Here's a full recipe for that idea — check it over, especially the macros, before saving."
              : "Here's my best guess — clean up anything that got mis-split before saving."}
          </p>
          <RecipeForm
            initialValues={parsedValues}
            onSave={handleSave}
            onCancel={mode === 'idea' ? advanceIdeaQueue : () => setParsedValues(null)}
            saveLabel={saving ? 'Saving…' : 'Save recipe'}
          />
          {mode === 'idea' && (
            <button className="btn btn-ghost btn-small" style={{ marginTop: 10 }} onClick={advanceIdeaQueue}>
              <SkipForward size={14} /> Skip this idea
            </button>
          )}
        </div>
      )}
    </div>
  );
}
