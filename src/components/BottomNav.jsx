import React from 'react';
import { LayoutGrid, Sparkles, CalendarDays, Flame, Plus } from 'lucide-react';

const TABS = [
  { id: 'list', icon: LayoutGrid, label: 'Box' },
  { id: 'recommend', icon: Sparkles, label: 'Cook Tonight' },
  { id: 'plan', icon: CalendarDays, label: 'Plan' },
  { id: 'cooklog', icon: Flame, label: 'BBQ Log' },
  { id: 'add', icon: Plus, label: 'Add' }
];

export default function BottomNav({ active, onChange }) {
  return (
    <nav className="bottom-nav">
      {TABS.map((t) => {
        const Icon = t.icon;
        return (
          <button
            key={t.id}
            className={active === t.id ? 'active' : ''}
            onClick={() => onChange(t.id)}
          >
            <Icon size={20} className="icon" />
            <span>{t.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
