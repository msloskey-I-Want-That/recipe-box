import React, { useMemo, useState } from 'react';
import { Search, Plus, Settings as SettingsIcon, FolderOpen } from 'lucide-react';
import RecipeCard from './RecipeCard';
import EmptyState from './EmptyState';
import { colorForTag } from '../utils/tagColor';

export default function RecipeList({ recipes, onSelect, onAdd, onOpenSettings }) {
  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState(null);
  const [activeCollection, setActiveCollection] = useState(null);

  const allTags = useMemo(() => {
    const set = new Set();
    recipes.forEach((r) => (r.tags || []).forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [recipes]);

  const allCollections = useMemo(() => {
    const set = new Set();
    recipes.forEach((r) => (r.collections || []).forEach((c) => set.add(c)));
    return Array.from(set).sort();
  }, [recipes]);

  const filtered = useMemo(() => {
    return recipes.filter((r) => {
      const matchesSearch =
        !search ||
        (r.title || '').toLowerCase().includes(search.toLowerCase()) ||
        (r.ingredients || []).some((i) =>
          (typeof i === 'string' ? i : i.raw || '').toLowerCase().includes(search.toLowerCase())
        );
      const matchesTag = !activeTag || (r.tags || []).includes(activeTag);
      const matchesCollection = !activeCollection || (r.collections || []).includes(activeCollection);
      return matchesSearch && matchesTag && matchesCollection;
    });
  }, [recipes, search, activeTag, activeCollection]);

  return (
    <div>
      <div className="brand-bar">
        <h1 className="display">Recipe Box</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="tally">{recipes.length} recipe{recipes.length === 1 ? '' : 's'}</span>
          <button className="icon-btn" onClick={onOpenSettings} aria-label="Settings">
            <SettingsIcon size={18} />
          </button>
        </div>
      </div>

      <div className="search-row">
        <Search size={16} className="search-icon" />
        <input
          placeholder="Search recipes or ingredients…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {allCollections.length > 0 && (
        <div className="tag-row">
          {allCollections.map((col) => {
            const active = activeCollection === col;
            return (
              <button
                key={col}
                className={`tag-pill${active ? ' active' : ''}`}
                style={
                  active
                    ? { background: 'var(--teal)', borderColor: 'var(--teal)', display: 'flex', alignItems: 'center', gap: 4 }
                    : { color: 'var(--teal)', background: 'var(--teal-tint)', borderColor: 'transparent', display: 'flex', alignItems: 'center', gap: 4 }
                }
                onClick={() => setActiveCollection(active ? null : col)}
              >
                <FolderOpen size={11} /> {col}
              </button>
            );
          })}
        </div>
      )}

      {allTags.length > 0 && (
        <div className="tag-row">
          {allTags.map((tag) => {
            const c = colorForTag(tag);
            const active = activeTag === tag;
            return (
              <button
                key={tag}
                className={`tag-pill${active ? ' active' : ''}`}
                style={active ? { background: c.bg, borderColor: c.bg } : { color: c.bg, background: c.tint, borderColor: 'transparent' }}
                onClick={() => setActiveTag(active ? null : tag)}
              >
                {tag}
              </button>
            );
          })}
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState title="The box is empty here">
          Add a recipe from the tab below — type one in, paste it from a website, or snap a photo of a printed card.
        </EmptyState>
      ) : (
        <div className="card-list">
          {filtered.map((r, idx) => (
            <div key={r.id} className="card-enter" style={{ animationDelay: `${Math.min(idx, 8) * 35}ms` }}>
              <RecipeCard recipe={r} onClick={() => onSelect(r.id)} />
            </div>
          ))}
        </div>
      )}

      <button className="fab" onClick={onAdd} aria-label="Add recipe"><Plus size={26} /></button>
    </div>
  );
}
