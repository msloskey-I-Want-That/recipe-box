import React from 'react';

function BoxIllustration() {
  return (
    <svg width="88" height="72" viewBox="0 0 88 72" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="20" width="80" height="48" rx="4" fill="var(--teal)" />
      <rect x="4" y="20" width="80" height="10" rx="4" fill="var(--coral)" />
      <rect x="14" y="36" width="60" height="26" rx="2" fill="var(--card)" />
      <line x1="20" y1="43" x2="60" y2="43" stroke="var(--line)" strokeWidth="1.5" />
      <line x1="20" y1="49" x2="68" y2="49" stroke="var(--line)" strokeWidth="1.5" />
      <line x1="20" y1="55" x2="52" y2="55" stroke="var(--line)" strokeWidth="1.5" />
      <path d="M30 20 L34 6 L54 6 L58 20" stroke="var(--teal)" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function EmptyState({ title, children }) {
  return (
    <div className="empty-state">
      <div className="empty-illustration"><BoxIllustration /></div>
      <div className="display empty-title">{title}</div>
      {children && <p>{children}</p>}
    </div>
  );
}
