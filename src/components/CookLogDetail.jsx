import React, { useState } from 'react';
import {
  ChevronLeft, Pencil, Trash2, Trophy, Flame, Send, Loader2, Users, Clock
} from 'lucide-react';
import CookLogForm from './CookLogForm';
import { computePRs, cookDurationMinutes, minutesPerPound, moistureLossPct } from '../utils/cookLog';
import { logCookToHealthTracker } from '../utils/healthTrackerSync';

const RATERS = ['mike', 'stacy', 'ryan', 'brandon'];

function TempChart({ tempLog }) {
  const points = [...tempLog]
    .filter((r) => r.timestamp && (r.smokerTemp || r.meatTemp))
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  if (points.length < 2) {
    return <p className="settings-hint">Add at least 2 temp readings to see a curve here.</p>;
  }

  const times = points.map((p) => new Date(p.timestamp).getTime());
  const allTemps = points.flatMap((p) => [Number(p.smokerTemp) || null, Number(p.meatTemp) || null]).filter((t) => t != null);
  const minT = Math.min(...times);
  const maxT = Math.max(...times);
  const minTemp = Math.min(...allTemps, 32) - 10;
  const maxTemp = Math.max(...allTemps) + 10;

  const W = 600;
  const H = 180;
  const x = (t) => (maxT === minT ? 0 : ((t - minT) / (maxT - minT)) * W);
  const y = (temp) => H - ((temp - minTemp) / (maxTemp - minTemp)) * H;

  const line = (key) =>
    points
      .filter((p) => p[key] !== '' && p[key] != null)
      .map((p) => `${x(new Date(p.timestamp).getTime())},${y(Number(p[key]))}`)
      .join(' ');

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 160 }}>
        <polyline points={line('smokerTemp')} fill="none" stroke="var(--coral)" strokeWidth="2.5" />
        <polyline points={line('meatTemp')} fill="none" stroke="var(--teal)" strokeWidth="2.5" />
      </svg>
      <div style={{ display: 'flex', gap: 16, fontSize: 12, fontWeight: 600, marginTop: 4 }}>
        <span style={{ color: 'var(--coral)' }}>● Smoker temp</span>
        <span style={{ color: 'var(--teal)' }}>● Meat temp</span>
      </div>
    </div>
  );
}

export default function CookLogDetail({ cookLog, allCookLogs, recipes, onBack, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [pushStatus, setPushStatus] = useState('');

  if (!cookLog) return null;

  if (editing) {
    return (
      <div>
        <button className="btn btn-ghost" onClick={() => setEditing(false)} style={{ marginBottom: 14 }}>
          <ChevronLeft size={16} /> Back to cook
        </button>
        <CookLogForm
          initialValues={cookLog}
          recipes={recipes}
          saveLabel="Save changes"
          onCancel={() => setEditing(false)}
          onSave={(updated) => {
            onUpdate(cookLog.id, updated);
            setEditing(false);
          }}
        />
      </div>
    );
  }

  const prs = computePRs(allCookLogs);
  const proteinKey = (cookLog.protein || 'other').trim();
  const pr = prs[proteinKey] || {};
  const isFastest = pr.fastest?.id === cookLog.id;
  const isBiggest = pr.biggest?.id === cookLog.id;
  const isHottest = pr.hottest?.id === cookLog.id;

  const duration = cookDurationMinutes(cookLog);
  const rate = minutesPerPound(cookLog);
  const loss = moistureLossPct(cookLog);
  const linkedRecipes = recipes.filter((r) => (cookLog.linkedRecipeIds || []).includes(r.id));

  const handlePushToHealthTracker = async () => {
    setPushing(true);
    setPushStatus('');
    try {
      await logCookToHealthTracker(cookLog.date, {
        desc: `${cookLog.protein}${cookLog.cutOfMeat ? ` (${cookLog.cutOfMeat})` : ''}`,
        cal: cookLog.macroEstimate?.calories || 0,
        protein: cookLog.macroEstimate?.protein || 0,
        carbs: 0,
        fat: cookLog.macroEstimate?.fat || 0,
        source: 'BBQ Log'
      });
      setPushStatus('Logged to Health Tracker ✓');
    } catch (err) {
      setPushStatus(err.message);
    } finally {
      setPushing(false);
    }
  };

  return (
    <div>
      <button className="btn btn-ghost" onClick={onBack} style={{ marginBottom: 14 }}>
        <ChevronLeft size={16} /> Back
      </button>

      <div className="detail-card glass-strong">
        <h2 className="display">{cookLog.protein}{cookLog.cutOfMeat ? ` — ${cookLog.cutOfMeat}` : ''}</h2>
        <div className="detail-meta">
          <span>{cookLog.date}</span>
          {cookLog.station && <span style={{ textTransform: 'capitalize' }}>{cookLog.station}</span>}
          {duration && <span><Clock size={14} /> {(duration / 60).toFixed(1)} hrs</span>}
          {cookLog.guestCount && <span><Users size={14} /> {cookLog.guestCount} guests</span>}
        </div>

        {(isFastest || isBiggest || isHottest) && (
          <div className="tag-row">
            {isFastest && <span className="tag-pill" style={{ background: 'var(--out)', color: '#fff', display: 'flex', alignItems: 'center', gap: 4 }}><Trophy size={12} /> Fastest {proteinKey}</span>}
            {isBiggest && <span className="tag-pill" style={{ background: 'var(--teal)', color: '#fff', display: 'flex', alignItems: 'center', gap: 4 }}><Trophy size={12} /> Biggest {proteinKey}</span>}
            {isHottest && <span className="tag-pill" style={{ background: 'var(--coral)', color: '#fff', display: 'flex', alignItems: 'center', gap: 4 }}><Flame size={12} /> Hottest cook</span>}
          </div>
        )}

        <hr className="divider" />

        <div className="section-label">Temp curve</div>
        <TempChart tempLog={cookLog.tempLog || []} />

        <hr className="divider" />

        <div className="macro-summary">
          <div className="macro-summary-item">
            <span className="macro-num">{cookLog.weightIn || '—'}</span>
            <span className="macro-lbl">lbs in</span>
          </div>
          <div className="macro-summary-item">
            <span className="macro-num">{cookLog.weightOut || '—'}</span>
            <span className="macro-lbl">lbs out</span>
          </div>
          <div className="macro-summary-item">
            <span className="macro-num">{loss != null ? `${loss}%` : '—'}</span>
            <span className="macro-lbl">loss</span>
          </div>
          <div className="macro-summary-item">
            <span className="macro-num">{rate ? rate.toFixed(0) : '—'}</span>
            <span className="macro-lbl">min/lb</span>
          </div>
        </div>

        {(cookLog.stallNotes || cookLog.wrapMethod) && (
          <>
            <hr className="divider" />
            <div className="section-label">Stall & wrap</div>
            {cookLog.stallNotes && <p style={{ fontSize: 14, color: 'var(--ink)' }}>{cookLog.stallNotes}</p>}
            {cookLog.wrapMethod && (
              <p style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
                Wrapped in {cookLog.wrapMethod}{cookLog.wrapTempF ? ` at ${cookLog.wrapTempF}°F` : ''}
              </p>
            )}
          </>
        )}

        {cookLog.restMethod && (
          <>
            <hr className="divider" />
            <div className="section-label">Rest</div>
            <p style={{ fontSize: 14, color: 'var(--ink)' }}>{cookLog.restMethod}</p>
          </>
        )}

        {linkedRecipes.length > 0 && (
          <>
            <hr className="divider" />
            <div className="section-label">Linked recipes</div>
            <div className="tag-row">
              {linkedRecipes.map((r) => <span key={r.id} className="tag-pill">{r.title}</span>)}
            </div>
          </>
        )}

        {['before', 'during', 'bark', 'plated'].some((s) => (cookLog.photos?.[s] || []).length > 0) && (
          <>
            <hr className="divider" />
            <div className="section-label">Photos</div>
            {['before', 'during', 'bark', 'plated'].map((slot) =>
              (cookLog.photos?.[slot] || []).length > 0 ? (
                <div key={slot} style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'capitalize', marginBottom: 6 }}>{slot}</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {cookLog.photos[slot].map((src, i) => (
                      <img key={i} src={src} alt={slot} style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 10 }} />
                    ))}
                  </div>
                </div>
              ) : null
            )}
          </>
        )}

        <hr className="divider" />
        <div className="section-label">Ratings</div>
        <div className="family-ratings">
          {RATERS.map((name) => (
            <div key={name} className="family-rating-row">
              <span className="family-rating-name" style={{ textTransform: 'capitalize' }}>{name}</span>
              <div className="stars" style={{ marginBottom: 0 }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <span key={n} style={{ opacity: n <= (cookLog.ratings?.[name] || 0) ? 1 : 0.25 }}>★</span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {cookLog.macroEstimate?.calories > 0 && (
          <>
            <hr className="divider" />
            <div className="section-row">
              <div className="section-label" style={{ margin: 0 }}>Macros (per serving)</div>
              <button className="btn btn-cta btn-small" onClick={handlePushToHealthTracker} disabled={pushing}>
                {pushing ? <Loader2 size={14} className="spin" /> : <Send size={14} />} Log to Health Tracker
              </button>
            </div>
            <div className="macro-summary">
              <div className="macro-summary-item"><span className="macro-num">{cookLog.macroEstimate.calories}</span><span className="macro-lbl">cal</span></div>
              <div className="macro-summary-item"><span className="macro-num">{cookLog.macroEstimate.protein}g</span><span className="macro-lbl">protein</span></div>
              <div className="macro-summary-item"><span className="macro-num">{cookLog.macroEstimate.fat}g</span><span className="macro-lbl">fat</span></div>
              <div className="macro-summary-item"><span className="macro-num">{cookLog.macroEstimate.sodium}mg</span><span className="macro-lbl">sodium</span></div>
            </div>
            {pushStatus && <p className="settings-hint">{pushStatus}</p>}
          </>
        )}

        <div className="btn-row">
          <button className="btn btn-brass" onClick={() => setEditing(true)}><Pencil size={16} /> Edit</button>
          <button
            className="btn btn-ghost"
            onClick={() => {
              if (confirm('Delete this cook log? This can\'t be undone.')) {
                onDelete(cookLog.id);
                onBack();
              }
            }}
          >
            <Trash2 size={16} /> Delete
          </button>
        </div>
      </div>
    </div>
  );
}
