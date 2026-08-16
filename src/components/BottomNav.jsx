import React from 'react';

const TABS = [
  { id: 'list', icon: '🗂️', label: 'Box' },
  { id: 'recommend', icon: '✨', label: 'Cook Tonight' },
  { id: 'add', icon: '➕', label: 'Add' }
];

export default function BottomNav({ active, onChange }) {
  return (
    <nav className="bottom-nav">
      {TABS.map((t) => (
        <button
          key={t.id}
          className={active === t.id ? 'active' : ''}
          onClick={() => onChange(t.id)}
        >
          <span className="icon">{t.icon}</span>
          {t.label}
        </button>
      ))}
    </nav>
  );
}
