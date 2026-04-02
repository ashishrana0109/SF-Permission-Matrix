import React from 'react';

interface HeaderProps {
  instanceUrl: string | null;
  orgId: string | null;
}

export const Header: React.FC<HeaderProps> = ({ instanceUrl, orgId }) => (
  <header className="app-header">
    <div className="header-title">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0176d3" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
      </svg>
      <h1>SF Permission Matrix</h1>
    </div>
    {instanceUrl && (
      <div className="header-org">
        <span className="org-badge">
          {new URL(instanceUrl).hostname.split('.')[0]}
        </span>
      </div>
    )}
  </header>
);
