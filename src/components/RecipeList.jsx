import React, { useMemo, useState } from 'react';
import RecipeCard from './RecipeCard';

export default function RecipeList({ recipes, onSelect }) {
  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState(null);

  const allTags = useMemo(() => {
    const set = new Set();
    recipes.forEach((r) => (r.tags || []).forEach((t) => set.add(t)));
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
      return matchesSearch && matchesTag;
    });
  }, [recipes, search, activeTag]);

  return (
    <div>
      <div className="brand-bar">
        <h1 className="display">Recipe Box</h1>
        <span className="tally">{recipes.length} recipe{recipes.length === 1 ? '' : 's'}</span>
      </div>

      <div className="search-row">
        <input
          placeholder="Search recipes or ingredients…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {allTags.length > 0 && (
        <div className="tag-row">
          {allTags.map((tag) => (
            <button
              key={tag}
              className={`tag-pill${activeTag === tag ? ' active' : ''}`}
              onClick={() => setActiveTag(activeTag === tag ? null : tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="display">The box is empty here</div>
          <p>Add a recipe from the tab below — type one in, paste it from a website, or snap a photo of a printed card.</p>
        </div>
      ) : (
        <div className="card-list">
          {filtered.map((r) => (
            <RecipeCard key={r.id} recipe={r} onClick={() => onSelect(r.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
