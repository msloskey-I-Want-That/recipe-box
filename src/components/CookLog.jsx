import React, { useMemo, useState } from 'react';
import { Flame, Trophy, Calculator, Plus, Search, Clock, Users } from 'lucide-react';
import EmptyState from './EmptyState';
import CookLogForm from './CookLogForm';
import CookLogDetail from './CookLogDetail';
import { useCookLogs, computePRs, cookDurationMinutes, estimateStartTime } from '../utils/cookLog';

const VIEWS = [
  { id: 'list', label: 'History', icon: Search },
  { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
  { id: 'planner', label: 'Plan a Cook', icon: Calculator }
];

function avgRating(ratings) {
  if (!ratings) return 0;
  const vals = Object.values(ratings).filter((v) => v > 0);
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
}

function CookLogCard({ cookLog, onClick }) {
  const duration = cookDurationMinutes(cookLog);
  const rating = avgRating(cookLog.ratings);
  return (
    <div className="recipe-card glass-card" onClick={onClick} style={{ borderLeftColor: 'var(--coral)' }}>
      <h3 style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Flame size={16} /> {cookLog.protein}{cookLog.cutOfMeat ? ` — ${cookLog.cutOfMeat}` : ''}</h3>
      <div className="meta">
        <span>{cookLog.date}</span>
        {cookLog.station && <span style={{ textTransform: 'capitalize' }}>{cookLog.station}</span>}
        {duration && <span><Clock size={13} /> {(duration / 60).toFixed(1)}h</span>}
        {cookLog.guestCount && <span><Users size={13} /> {cookLog.guestCount}</span>}
        {rating > 0 && <span className="rating-pips">{'★'.repeat(Math.round(rating))}</span>}
      </div>
    </div>
  );
}

function Leaderboard({ cookLogs, onSelect }) {
  const prs = computePRs(cookLogs);
  const proteins = Object.keys(prs).sort();

  if (proteins.length === 0) {
    return <EmptyState title="No cooks logged yet">Log a few cooks and personal records will show up here automatically.</EmptyState>;
  }

  return (
    <div>
      {proteins.map((protein) => {
        const pr = prs[protein];
        return (
          <div key={protein} className="detail-card glass-strong" style={{ marginBottom: 14 }}>
            <h3 style={{ textTransform: 'capitalize', margin: '0 0 10px' }}>{protein} <span className="settings-hint" style={{ display: 'inline' }}>({pr.count} cook{pr.count === 1 ? '' : 's'})</span></h3>
            {pr.fastest && (
              <div className="pr-row" onClick={() => onSelect(pr.fastest.id)}>
                <Trophy size={16} color="var(--out)" />
                <span>Fastest: {pr.fastest.date} ({(cookDurationMinutes(pr.fastest) / 60).toFixed(1)}h for {pr.fastest.weightIn}lb)</span>
              </div>
            )}
            {pr.biggest && (
              <div className="pr-row" onClick={() => onSelect(pr.biggest.id)}>
                <Trophy size={16} color="var(--teal)" />
                <span>Biggest: {pr.biggest.weightIn}lb on {pr.biggest.date}</span>
              </div>
            )}
            {pr.hottest && (
              <div className="pr-row" onClick={() => onSelect(pr.hottest.id)}>
                <Flame size={16} color="var(--coral)" />
                <span>Hottest cook: {pr.hottest.maxSmokerTemp}°F on {pr.hottest.date}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Planner({ cookLogs }) {
  const [protein, setProtein] = useState('');
  const [weight, setWeight] = useState('');
  const [doneBy, setDoneBy] = useState('');
  const [result, setResult] = useState(null);

  const calculate = () => {
    if (!protein.trim() || !weight || !doneBy) return;
    setResult(estimateStartTime(cookLogs, protein, weight, doneBy));
  };

  return (
    <div className="pantry-box glass-card">
      <div className="section-label">Reverse-plan a cook</div>
      <div className="field">
        <label>Protein</label>
        <input value={protein} onChange={(e) => setProtein(e.target.value)} placeholder="Brisket" />
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <div className="field" style={{ flex: 1 }}>
          <label>Weight (lbs)</label>
          <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label>Done by</label>
          <input type="datetime-local" value={doneBy} onChange={(e) => setDoneBy(e.target.value)} />
        </div>
      </div>
      <button className="btn btn-cta" onClick={calculate} disabled={!protein.trim() || !weight || !doneBy}>
        <Calculator size={16} /> Calculate start time
      </button>

      {result && (
        <div className="macro-summary" style={{ marginTop: 14 }}>
          <div className="macro-summary-item" style={{ gridColumn: 'span 2' }}>
            <span className="macro-num" style={{ fontSize: 22 }}>
              {result.startTime.toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' })}
            </span>
            <span className="macro-lbl">start time</span>
          </div>
          <div className="macro-summary-item" style={{ gridColumn: 'span 2' }}>
            <span className="macro-num">{(result.estimatedCookMinutes / 60).toFixed(1)}h</span>
            <span className="macro-lbl">estimated cook + rest</span>
          </div>
        </div>
      )}
      {result && (
        <p className="settings-hint" style={{ marginTop: 10 }}>
          Based on {result.source} (~{result.rateUsed} min/lb), plus a 45-min rest buffer. Stalls and
          weather can shift this — check in as you go.
        </p>
      )}
    </div>
  );
}

export default function CookLog({ recipes, prefill, onConsumedPrefill }) {
  const { cookLogs, loading, addCookLog, updateCookLog, deleteCookLog } = useCookLogs();
  const [view, setView] = useState('list');
  const [selectedId, setSelectedId] = useState(null);
  const [adding, setAdding] = useState(!!prefill);
  const [search, setSearch] = useState('');
  const [proteinFilter, setProteinFilter] = useState(null);

  const allProteins = useMemo(
    () => Array.from(new Set(cookLogs.map((c) => (c.protein || '').trim()).filter(Boolean))).sort(),
    [cookLogs]
  );

  const filtered = cookLogs.filter((c) => {
    const matchesSearch = !search || (c.protein || '').toLowerCase().includes(search.toLowerCase()) || (c.cutOfMeat || '').toLowerCase().includes(search.toLowerCase());
    const matchesProtein = !proteinFilter || c.protein === proteinFilter;
    return matchesSearch && matchesProtein;
  });

  const selected = cookLogs.find((c) => c.id === selectedId);

  if (adding) {
    return (
      <div>
        <button
          className="btn btn-ghost"
          onClick={() => {
            setAdding(false);
            if (onConsumedPrefill) onConsumedPrefill();
          }}
          style={{ marginBottom: 14 }}
        >
          ← Back
        </button>
        <div className="brand-bar"><h1 className="display">New BBQ Cook</h1></div>
        <CookLogForm
          recipes={recipes}
          initialValues={prefill || undefined}
          onCancel={() => {
            setAdding(false);
            if (onConsumedPrefill) onConsumedPrefill();
          }}
          onSave={async (cookLog) => {
            await addCookLog(cookLog);
            setAdding(false);
            if (onConsumedPrefill) onConsumedPrefill();
          }}
        />
      </div>
    );
  }

  if (selected) {
    return (
      <CookLogDetail
        cookLog={selected}
        allCookLogs={cookLogs}
        recipes={recipes}
        onBack={() => setSelectedId(null)}
        onUpdate={updateCookLog}
        onDelete={deleteCookLog}
      />
    );
  }

  return (
    <div>
      <div className="brand-bar">
        <h1 className="display">BBQ Log</h1>
        <span className="tally">{cookLogs.length} cook{cookLogs.length === 1 ? '' : 's'}</span>
      </div>

      <div className="import-tabs">
        {VIEWS.map((v) => {
          const Icon = v.icon;
          return (
            <button key={v.id} className={view === v.id ? 'active' : ''} onClick={() => setView(v.id)}>
              <Icon size={15} /> {v.label}
            </button>
          );
        })}
      </div>

      {view === 'list' && (
        <>
          <div className="search-row">
            <Search size={16} className="search-icon" />
            <input placeholder="Search by protein or cut…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          {allProteins.length > 0 && (
            <div className="tag-row">
              {allProteins.map((p) => (
                <button
                  key={p}
                  className={`tag-pill${proteinFilter === p ? ' active' : ''}`}
                  style={proteinFilter === p ? { background: 'var(--coral)', borderColor: 'var(--coral)' } : { color: 'var(--coral)', background: 'var(--coral-tint)', borderColor: 'transparent' }}
                  onClick={() => setProteinFilter(proteinFilter === p ? null : p)}
                >
                  {p}
                </button>
              ))}
            </div>
          )}

          {loading ? (
            <p className="settings-hint">Loading…</p>
          ) : filtered.length === 0 ? (
            <EmptyState title="No cooks logged yet">Tap the + below to log your first smoker session.</EmptyState>
          ) : (
            <div className="card-list">
              {filtered.map((c) => (
                <CookLogCard key={c.id} cookLog={c} onClick={() => setSelectedId(c.id)} />
              ))}
            </div>
          )}

          <button className="fab" onClick={() => setAdding(true)} aria-label="New cook"><Plus size={26} /></button>
        </>
      )}

      {view === 'leaderboard' && <Leaderboard cookLogs={cookLogs} onSelect={setSelectedId} />}
      {view === 'planner' && <Planner cookLogs={cookLogs} />}
    </div>
  );
}
