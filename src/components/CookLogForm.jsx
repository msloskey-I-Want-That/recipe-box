import React, { useState } from 'react';
import { Plus, X, Sparkles, Loader2, Camera, Star } from 'lucide-react';
import { fileToThumbnail } from '../utils/photoThumbnail';

const STATIONS = [
  { id: 'masterbuilt', label: 'Masterbuilt Smoker' },
  { id: 'charbroil', label: 'Char-Broil Gas Grill' },
  { id: 'blackstone', label: 'Blackstone Griddle' }
];

const PHOTO_SLOTS = ['before', 'during', 'bark', 'plated'];
const MAX_PHOTOS_PER_SLOT = 2;
const RATERS = ['mike', 'stacy', 'ryan', 'brandon'];

function toLocalInputValue(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const emptyCook = () => ({
  date: new Date().toISOString().slice(0, 10),
  protein: '',
  cutOfMeat: '',
  weightIn: '',
  weightOut: '',
  station: 'masterbuilt',
  fuelType: '',
  fuelAmount: '',
  weather: { tempF: '', windMph: '', conditions: '' },
  linkedRecipeIds: [],
  tempLog: [],
  stallNotes: '',
  wrapMethod: '',
  wrapTempF: '',
  wrapTimestamp: '',
  restMethod: '',
  restStartTime: '',
  restEndTime: '',
  startTime: '',
  pullTime: '',
  maxSmokerTemp: '',
  photos: { before: [], during: [], bark: [], plated: [] },
  ratings: { mike: 0, stacy: 0, ryan: 0, brandon: 0 },
  guestCount: '',
  guestNames: '',
  occasion: '',
  macroEstimate: { calories: '', protein: '', fat: '', sodium: '' }
});

export default function CookLogForm({ initialValues, recipes, onSave, onCancel, saveLabel = 'Save cook' }) {
  const [values, setValues] = useState({ ...emptyCook(), ...initialValues });
  const [recipeSearch, setRecipeSearch] = useState('');
  const [photoBusy, setPhotoBusy] = useState(null);
  const [photoError, setPhotoError] = useState('');

  const set = (field, val) => setValues((v) => ({ ...v, [field]: val }));
  const setNested = (group, field, val) =>
    setValues((v) => ({ ...v, [group]: { ...v[group], [field]: val } }));

  const addTempReading = () => {
    setValues((v) => ({
      ...v,
      tempLog: [
        ...v.tempLog,
        { timestamp: new Date().toISOString(), smokerTemp: '', meatTemp: '', note: '' }
      ]
    }));
  };
  const updateTempReading = (idx, field, val) => {
    setValues((v) => {
      const tempLog = [...v.tempLog];
      tempLog[idx] = { ...tempLog[idx], [field]: val };
      return { ...v, tempLog };
    });
  };
  const removeTempReading = (idx) => {
    setValues((v) => ({ ...v, tempLog: v.tempLog.filter((_, i) => i !== idx) }));
  };

  const linkedRecipes = recipes.filter((r) => values.linkedRecipeIds.includes(r.id));
  const recipeResults = recipeSearch.trim()
    ? recipes.filter(
        (r) =>
          !values.linkedRecipeIds.includes(r.id) &&
          (r.title || '').toLowerCase().includes(recipeSearch.trim().toLowerCase())
      )
    : [];

  const linkRecipe = (id) => {
    set('linkedRecipeIds', [...values.linkedRecipeIds, id]);
    setRecipeSearch('');
  };
  const unlinkRecipe = (id) => set('linkedRecipeIds', values.linkedRecipeIds.filter((r) => r !== id));

  const useLinkedMacros = () => {
    if (linkedRecipes.length !== 1 || !linkedRecipes[0].macros) return;
    const m = linkedRecipes[0].macros;
    set('macroEstimate', {
      calories: m.calories || '',
      protein: m.protein || '',
      fat: m.fat || '',
      sodium: values.macroEstimate.sodium || ''
    });
  };

  const handlePhotoAdd = async (slot, file) => {
    if (!file) return;
    if ((values.photos[slot] || []).length >= MAX_PHOTOS_PER_SLOT) {
      setPhotoError(`Max ${MAX_PHOTOS_PER_SLOT} photos per category to keep this free (no paid storage).`);
      return;
    }
    setPhotoBusy(slot);
    setPhotoError('');
    try {
      const thumb = await fileToThumbnail(file);
      setValues((v) => ({
        ...v,
        photos: { ...v.photos, [slot]: [...(v.photos[slot] || []), thumb] }
      }));
    } catch (err) {
      setPhotoError(err.message);
    } finally {
      setPhotoBusy(null);
    }
  };
  const removePhoto = (slot, idx) => {
    setValues((v) => ({
      ...v,
      photos: { ...v.photos, [slot]: v.photos[slot].filter((_, i) => i !== idx) }
    }));
  };

  const handleSave = () => {
    if (!values.protein.trim()) return;
    onSave(values);
  };

  return (
    <div>
      <div className="field">
        <label>Protein</label>
        <input value={values.protein} onChange={(e) => set('protein', e.target.value)} placeholder="Brisket" />
      </div>
      <div className="field">
        <label>Cut of meat</label>
        <input value={values.cutOfMeat} onChange={(e) => set('cutOfMeat', e.target.value)} placeholder="Whole packer, point removed" />
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <div className="field" style={{ flex: 1 }}>
          <label>Date</label>
          <input type="date" value={values.date} onChange={(e) => set('date', e.target.value)} />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label>Station</label>
          <select value={values.station} onChange={(e) => set('station', e.target.value)}>
            {STATIONS.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="macro-panel">
        <div className="section-label" style={{ margin: 0, marginBottom: 10 }}>Weight & fuel</div>
        <div className="macro-grid">
          <div className="field">
            <label>Weight in (lbs)</label>
            <input type="number" value={values.weightIn} onChange={(e) => set('weightIn', e.target.value)} placeholder="0" />
          </div>
          <div className="field">
            <label>Weight out (lbs)</label>
            <input type="number" value={values.weightOut} onChange={(e) => set('weightOut', e.target.value)} placeholder="0" />
          </div>
          <div className="field">
            <label>Fuel type</label>
            <input value={values.fuelType} onChange={(e) => set('fuelType', e.target.value)} placeholder="Hickory chunks" />
          </div>
          <div className="field">
            <label>Fuel amount</label>
            <input value={values.fuelAmount} onChange={(e) => set('fuelAmount', e.target.value)} placeholder="8 lbs" />
          </div>
        </div>
      </div>

      <div className="macro-panel">
        <div className="section-label" style={{ margin: 0, marginBottom: 10 }}>Weather</div>
        <div className="macro-grid">
          <div className="field">
            <label>Temp (°F)</label>
            <input type="number" value={values.weather.tempF} onChange={(e) => setNested('weather', 'tempF', e.target.value)} />
          </div>
          <div className="field">
            <label>Wind (mph)</label>
            <input type="number" value={values.weather.windMph} onChange={(e) => setNested('weather', 'windMph', e.target.value)} />
          </div>
        </div>
        <div className="field">
          <label>Conditions</label>
          <input value={values.weather.conditions} onChange={(e) => setNested('weather', 'conditions', e.target.value)} placeholder="Clear, cold snap, rain moved in around hour 4…" />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <div className="field" style={{ flex: 1 }}>
          <label>Start time</label>
          <input type="datetime-local" value={toLocalInputValue(values.startTime)} onChange={(e) => set('startTime', new Date(e.target.value).toISOString())} />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label>Pull time</label>
          <input type="datetime-local" value={toLocalInputValue(values.pullTime)} onChange={(e) => set('pullTime', new Date(e.target.value).toISOString())} />
        </div>
      </div>
      <div className="field">
        <label>Max smoker temp reached (°F)</label>
        <input type="number" value={values.maxSmokerTemp} onChange={(e) => set('maxSmokerTemp', e.target.value)} placeholder="Useful data if you're eyeing a smoker upgrade" />
      </div>

      <div className="macro-panel">
        <div className="macro-panel-header">
          <span className="section-label" style={{ margin: 0 }}>Temp log</span>
          <button type="button" className="btn btn-brass btn-small" onClick={addTempReading}>
            <Plus size={14} /> Add reading
          </button>
        </div>
        <p className="settings-hint" style={{ marginTop: 0 }}>Quick-add a reading whenever you check the smoker — powers the temp curve chart on the cook's detail page.</p>
        {values.tempLog.map((reading, idx) => (
          <div key={idx} className="temp-reading-row">
            <input
              type="time"
              value={reading.timestamp ? new Date(reading.timestamp).toTimeString().slice(0, 5) : ''}
              onChange={(e) => {
                const [h, m] = e.target.value.split(':');
                const d = new Date(reading.timestamp || Date.now());
                d.setHours(Number(h), Number(m));
                updateTempReading(idx, 'timestamp', d.toISOString());
              }}
            />
            <input type="number" placeholder="Smoker °F" value={reading.smokerTemp} onChange={(e) => updateTempReading(idx, 'smokerTemp', e.target.value)} />
            <input type="number" placeholder="Meat °F" value={reading.meatTemp} onChange={(e) => updateTempReading(idx, 'meatTemp', e.target.value)} />
            <button type="button" className="icon-btn" style={{ width: 32, height: 32, flexShrink: 0 }} onClick={() => removeTempReading(idx)}>
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      <div className="macro-panel">
        <div className="section-label" style={{ margin: 0, marginBottom: 10 }}>Stall & wrap</div>
        <div className="field">
          <label>Stall notes</label>
          <textarea rows={2} value={values.stallNotes} onChange={(e) => set('stallNotes', e.target.value)} placeholder="Stalled at 165° for about 90 minutes around hour 5" />
        </div>
        <div className="macro-grid">
          <div className="field">
            <label>Wrap method</label>
            <select value={values.wrapMethod} onChange={(e) => set('wrapMethod', e.target.value)}>
              <option value="">None</option>
              <option value="butcher paper">Butcher paper</option>
              <option value="foil">Foil</option>
              <option value="naked">Naked (no wrap)</option>
            </select>
          </div>
          <div className="field">
            <label>Temp at wrap (°F)</label>
            <input type="number" value={values.wrapTempF} onChange={(e) => set('wrapTempF', e.target.value)} />
          </div>
        </div>
      </div>

      <div className="macro-panel">
        <div className="section-label" style={{ margin: 0, marginBottom: 10 }}>Rest</div>
        <div className="field">
          <label>Rest method</label>
          <input value={values.restMethod} onChange={(e) => set('restMethod', e.target.value)} placeholder="Faux cambro (cooler + towels)" />
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div className="field" style={{ flex: 1 }}>
            <label>Rest start</label>
            <input type="datetime-local" value={toLocalInputValue(values.restStartTime)} onChange={(e) => set('restStartTime', new Date(e.target.value).toISOString())} />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label>Rest end</label>
            <input type="datetime-local" value={toLocalInputValue(values.restEndTime)} onChange={(e) => set('restEndTime', new Date(e.target.value).toISOString())} />
          </div>
        </div>
      </div>

      <div className="field">
        <label>Link Recipe Box recipes (rub, sauce, sides…)</label>
        <input
          value={recipeSearch}
          onChange={(e) => setRecipeSearch(e.target.value)}
          placeholder="Search your recipes…"
        />
        {recipeResults.length > 0 && (
          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {recipeResults.slice(0, 5).map((r) => (
              <button key={r.id} type="button" className="btn btn-ghost btn-small" style={{ justifyContent: 'space-between' }} onClick={() => linkRecipe(r.id)}>
                {r.title} <Plus size={13} />
              </button>
            ))}
          </div>
        )}
        {linkedRecipes.length > 0 && (
          <div className="chip-input-row">
            {linkedRecipes.map((r) => (
              <span key={r.id} className="chip">
                {r.title}
                <button type="button" onClick={() => unlinkRecipe(r.id)}>×</button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="macro-panel">
        <div className="macro-panel-header">
          <span className="section-label" style={{ margin: 0 }}>Macro estimate (per serving)</span>
          {linkedRecipes.length === 1 && linkedRecipes[0].macros && (
            <button type="button" className="btn btn-brass btn-small" onClick={useLinkedMacros}>
              <Sparkles size={14} /> Use linked recipe's macros
            </button>
          )}
        </div>
        <div className="macro-grid">
          <div className="field">
            <label>Calories</label>
            <input type="number" value={values.macroEstimate.calories} onChange={(e) => setNested('macroEstimate', 'calories', e.target.value)} />
          </div>
          <div className="field">
            <label>Protein (g)</label>
            <input type="number" value={values.macroEstimate.protein} onChange={(e) => setNested('macroEstimate', 'protein', e.target.value)} />
          </div>
          <div className="field">
            <label>Fat (g)</label>
            <input type="number" value={values.macroEstimate.fat} onChange={(e) => setNested('macroEstimate', 'fat', e.target.value)} />
          </div>
          <div className="field">
            <label>Sodium (mg)</label>
            <input type="number" value={values.macroEstimate.sodium} onChange={(e) => setNested('macroEstimate', 'sodium', e.target.value)} />
          </div>
        </div>
      </div>

      <div className="macro-panel">
        <div className="section-label" style={{ margin: 0, marginBottom: 10 }}>Photos</div>
        <p className="settings-hint" style={{ marginTop: 0 }}>
          Up to {MAX_PHOTOS_PER_SLOT} per category, stored free right in the database (no paid storage) — kept small
          on purpose, so these are reference shots, not full-res.
        </p>
        {photoError && <p style={{ fontSize: 12, color: 'var(--coral)' }}>{photoError}</p>}
        {PHOTO_SLOTS.map((slot) => (
          <div key={slot} style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'capitalize', marginBottom: 6 }}>{slot}</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(values.photos[slot] || []).map((src, idx) => (
                <div key={idx} style={{ position: 'relative' }}>
                  <img src={src} alt={`${slot} ${idx + 1}`} style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8 }} />
                  <button
                    type="button"
                    onClick={() => removePhoto(slot, idx)}
                    style={{ position: 'absolute', top: -6, right: -6, background: 'var(--coral)', color: '#fff', border: 'none', borderRadius: '50%', width: 20, height: 20, fontSize: 12, cursor: 'pointer' }}
                  >
                    ×
                  </button>
                </div>
              ))}
              {(values.photos[slot] || []).length < MAX_PHOTOS_PER_SLOT && (
                <label className="photo-add-btn">
                  {photoBusy === slot ? <Loader2 size={18} className="spin" /> : <Camera size={18} />}
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => handlePhotoAdd(slot, e.target.files?.[0])}
                  />
                </label>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="macro-panel">
        <div className="section-label" style={{ margin: 0, marginBottom: 10 }}>Party details</div>
        <div className="macro-grid">
          <div className="field">
            <label>Guest count</label>
            <input type="number" value={values.guestCount} onChange={(e) => set('guestCount', e.target.value)} />
          </div>
          <div className="field">
            <label>Occasion</label>
            <input value={values.occasion} onChange={(e) => set('occasion', e.target.value)} placeholder="Football Sunday" />
          </div>
        </div>
        <div className="field">
          <label>Guest names</label>
          <input value={values.guestNames} onChange={(e) => set('guestNames', e.target.value)} placeholder="Ken, Julie, ..." />
        </div>
      </div>

      <div className="field">
        <label>Ratings</label>
        {RATERS.map((name) => (
          <div key={name} className="family-rating-row">
            <span className="family-rating-name" style={{ textTransform: 'capitalize' }}>{name}</span>
            <div className="stars" style={{ marginBottom: 0 }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Star
                  key={n}
                  size={17}
                  fill={n <= (values.ratings[name] || 0) ? 'currentColor' : 'none'}
                  onClick={() => setNested('ratings', name, n)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="btn-row">
        <button className="btn btn-primary" onClick={handleSave} disabled={!values.protein.trim()}>
          {saveLabel}
        </button>
        {onCancel && <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>}
      </div>
    </div>
  );
}
