import React, { useRef, useState } from 'react';
import { Key, ExternalLink, X, Download, Upload } from 'lucide-react';
import { getSyncId, setSyncId } from '../utils/healthTrackerSync';
import { getThemeChoice, applyTheme } from '../utils/theme';

const USDA_KEY = 'recipe-box-usda-key';
const ANTHROPIC_KEY = 'recipe-box-anthropic-key';

export default function Settings({ onClose, recipes = [], addRecipe }) {
  const [usdaKey, setUsdaKey] = useState(localStorage.getItem(USDA_KEY) || '');
  const [anthropicKey, setAnthropicKey] = useState(localStorage.getItem(ANTHROPIC_KEY) || '');
  const [syncId, setSyncIdInput] = useState(getSyncId());
  const [theme, setTheme] = useState(getThemeChoice());
  const [saved, setSaved] = useState(false);
  const [importStatus, setImportStatus] = useState('');
  const fileInputRef = useRef(null);

  const save = () => {
    localStorage.setItem(USDA_KEY, usdaKey.trim());
    localStorage.setItem(ANTHROPIC_KEY, anthropicKey.trim());
    setSyncId(syncId);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  const chooseTheme = (choice) => {
    setTheme(choice);
    applyTheme(choice);
  };

  const handleExport = () => {
    // Strip Firestore-internal fields (id, dateAdded) so importing this file
    // back in creates fresh entries rather than colliding with anything.
    const clean = recipes.map(({ id, dateAdded, ...rest }) => rest);
    const blob = new Blob([JSON.stringify(clean, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const date = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `recipe-box-backup-${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = async (file) => {
    if (!file) return;
    setImportStatus('Reading file…');
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) throw new Error('That file doesn\'t look like a Recipe Box backup.');

      const existingTitles = new Set(recipes.map((r) => (r.title || '').trim().toLowerCase()));
      let added = 0;
      let skipped = 0;

      for (const recipe of parsed) {
        const title = (recipe.title || '').trim();
        if (!title) continue;
        if (existingTitles.has(title.toLowerCase())) {
          skipped++;
          continue;
        }
        await addRecipe(recipe);
        existingTitles.add(title.toLowerCase());
        added++;
      }

      setImportStatus(`Imported ${added} recipe${added === 1 ? '' : 's'}${skipped ? `, skipped ${skipped} already in your box` : ''}.`);
    } catch (err) {
      setImportStatus(`Couldn't import that file: ${err.message}`);
    }
  };

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet glass-strong" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <h2 className="display"><Key size={20} /> Settings</h2>
          <button className="icon-btn" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="field">
          <label>Appearance</label>
          <div className="theme-chip-row">
            <button className={`theme-chip${theme === '' ? ' on' : ''}`} onClick={() => chooseTheme('')}>Auto</button>
            <button className={`theme-chip${theme === 'light' ? ' on' : ''}`} onClick={() => chooseTheme('light')}>Light</button>
            <button className={`theme-chip${theme === 'dark' ? ' on' : ''}`} onClick={() => chooseTheme('dark')}>Dark</button>
          </div>
        </div>

        <div className="field">
          <label>Backup</label>
          <div className="btn-row" style={{ marginTop: 0 }}>
            <button className="btn btn-ghost btn-small" onClick={handleExport} disabled={recipes.length === 0}>
              <Download size={14} /> Export {recipes.length} recipe{recipes.length === 1 ? '' : 's'}
            </button>
            <button className="btn btn-ghost btn-small" onClick={() => fileInputRef.current?.click()}>
              <Upload size={14} /> Import backup
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              hidden
              onChange={(e) => handleImportFile(e.target.files?.[0])}
            />
          </div>
          {importStatus && <p className="settings-hint">{importStatus}</p>}
          <p className="settings-hint">
            Export saves every recipe (including macros, ratings, and collections) as a single file
            you can keep anywhere. Import adds recipes from a backup file, skipping any titles you
            already have.
          </p>
        </div>

        <div className="field">
          <label>USDA FoodData Central API key</label>
          <input
            value={usdaKey}
            onChange={(e) => setUsdaKey(e.target.value)}
            placeholder="Paste your free key here"
          />
          <a
            className="settings-link"
            href="https://fdc.nal.usda.gov/api-key-signup.html"
            target="_blank"
            rel="noreferrer"
          >
            Get a free key <ExternalLink size={13} />
          </a>
          <p className="settings-hint">Powers the auto-estimate macros button. Free, instant signup, no card required.</p>
        </div>

        <div className="field">
          <label>Anthropic (Claude) API key</label>
          <input
            value={anthropicKey}
            onChange={(e) => setAnthropicKey(e.target.value)}
            placeholder="sk-ant-…"
          />
          <a
            className="settings-link"
            href="https://console.anthropic.com/settings/keys"
            target="_blank"
            rel="noreferrer"
          >
            Get an API key <ExternalLink size={13} />
          </a>
          <p className="settings-hint">
            Powers recipe suggestions and improvement ideas. Unlike everything else in this app,
            this costs a small amount per use (usually a fraction of a cent).
          </p>
        </div>

        <div className="field">
          <label>Health Tracker Sync ID</label>
          <input
            value={syncId}
            onChange={(e) => setSyncIdInput(e.target.value)}
            placeholder="Paste your Sync ID here"
          />
          <p className="settings-hint">
            In Health Tracker, tap the Sync ID pill (Settings tab) to copy it, then paste it here.
            Lets recommendations factor in what you've actually cooked and eaten, not just what
            you've starred — read-only, nothing here can change your Health Tracker data.
          </p>
        </div>

        <button className="btn btn-primary" onClick={save} style={{ width: '100%' }}>
          {saved ? 'Saved ✓' : 'Save keys'}
        </button>
        <p className="settings-hint" style={{ marginTop: 10 }}>
          Keys are stored only on this device (browser local storage) — never sent anywhere but
          directly to USDA/Anthropic when you use those features.
        </p>
      </div>
    </div>
  );
}
