import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { SObjectListItem } from '../types/salesforce';
import type { PermissionSetRecord } from '../types/permissions';

type SelectionMode = 'object' | 'profile' | 'permset' | null;

interface ProfileOption {
  id: string;
  name: string;
  label: string;
}

interface SelectorBarProps {
  objects: SObjectListItem[];
  profiles: ProfileOption[];
  permissionSets: PermissionSetRecord[];
  onObjectSelect: (objectName: string) => void;
  onProfileSelect: (profileId: string, profileName: string) => void;
  onPermSetSelect: (permSetId: string, permSetName: string) => void;
  onClear: () => void;
  loading?: boolean;
}

interface SearchableDropdownProps {
  label: string;
  items: { value: string; label: string; sublabel?: string }[];
  onSelect: (value: string, label: string) => void;
  disabled: boolean;
  selected: string | null;
  onClear: () => void;
}

const SearchableDropdown: React.FC<SearchableDropdownProps> = ({
  label,
  items,
  onSelect,
  disabled,
  selected,
  onClear,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const focusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filtered = useMemo(() => {
    if (!search) return items;
    const term = search.toLowerCase();
    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(term) ||
        item.value.toLowerCase().includes(term),
    );
  }, [items, search]);

  // Show max 100 items in dropdown for performance
  const displayed = useMemo(() => filtered.slice(0, 100), [filtered]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      // Clean up any pending focus timer
      if (focusTimerRef.current) clearTimeout(focusTimerRef.current);
    };
  }, []);

  const handleSelect = useCallback(
    (value: string, itemLabel: string) => {
      onSelect(value, itemLabel);
      setIsOpen(false);
      setSearch('');
    },
    [onSelect],
  );

  if (selected) {
    return (
      <div className="dropdown-container" ref={containerRef}>
        <label className="dropdown-label">{label}</label>
        <div className="dropdown-selected">
          <span>{selected}</span>
          <button className="clear-btn" onClick={onClear} title="Clear selection">
            x
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`dropdown-container ${disabled ? 'disabled' : ''}`} ref={containerRef}>
      <label className="dropdown-label">{label}</label>
      <div
        className={`dropdown-trigger ${isOpen ? 'open' : ''}`}
        onClick={() => {
          if (!disabled) {
            setIsOpen(!isOpen);
            focusTimerRef.current = setTimeout(() => inputRef.current?.focus(), 50);
          }
        }}
      >
        <span className="dropdown-placeholder">Select {label}...</span>
        <span className="dropdown-arrow">{isOpen ? '\u25B2' : '\u25BC'}</span>
      </div>

      {isOpen && !disabled && (
        <div className="dropdown-menu">
          <input
            ref={inputRef}
            type="text"
            className="dropdown-search"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClick={(e) => e.stopPropagation()}
          />
          <div className="dropdown-items">
            {displayed.length === 0 && (
              <div className="dropdown-empty">No matches found</div>
            )}
            {displayed.map((item) => (
              <div
                key={item.value}
                className="dropdown-item"
                onClick={() => handleSelect(item.value, item.label)}
              >
                <span className="item-label">{item.label}</span>
                {item.sublabel && (
                  <span className="item-sublabel">{item.sublabel}</span>
                )}
              </div>
            ))}
            {filtered.length > 100 && (
              <div className="dropdown-more">
                {filtered.length - 100} more — refine your search
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const SelectorBar: React.FC<SelectorBarProps> = ({
  objects,
  profiles,
  permissionSets,
  onObjectSelect,
  onProfileSelect,
  onPermSetSelect,
  onClear,
  loading,
}) => {
  const [activeMode, setActiveMode] = useState<SelectionMode>(null);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);

  const objectItems = useMemo(
    () =>
      objects.map((o) => ({
        value: o.name,
        label: o.label,
        sublabel: o.name !== o.label ? o.name : undefined,
      })),
    [objects],
  );

  const profileItems = useMemo(
    () =>
      profiles.map((p) => ({
        value: p.id,
        label: p.label,
      })),
    [profiles],
  );

  const permSetItems = useMemo(
    () =>
      permissionSets.map((ps) => ({
        value: ps.Id,
        label: ps.Label || ps.Name,
        sublabel: ps.Name,
      })),
    [permissionSets],
  );

  const clearSelection = useCallback(() => {
    setActiveMode(null);
    setSelectedLabel(null);
    onClear(); // Notify parent to reset viewMode
  }, [onClear]);

  return (
    <div className="selector-bar">
      <SearchableDropdown
        label="Object"
        items={objectItems}
        onSelect={(value, label) => {
          setActiveMode('object');
          setSelectedLabel(label);
          onObjectSelect(value);
        }}
        disabled={!!loading || (activeMode !== null && activeMode !== 'object')}
        selected={activeMode === 'object' ? selectedLabel : null}
        onClear={clearSelection}
      />
      <SearchableDropdown
        label="Profile"
        items={profileItems}
        onSelect={(value, label) => {
          setActiveMode('profile');
          setSelectedLabel(label);
          onProfileSelect(value, label);
        }}
        disabled={!!loading || (activeMode !== null && activeMode !== 'profile')}
        selected={activeMode === 'profile' ? selectedLabel : null}
        onClear={clearSelection}
      />
      <SearchableDropdown
        label="Permission Set"
        items={permSetItems}
        onSelect={(value, label) => {
          setActiveMode('permset');
          setSelectedLabel(label);
          onPermSetSelect(value, label);
        }}
        disabled={!!loading || (activeMode !== null && activeMode !== 'permset')}
        selected={activeMode === 'permset' ? selectedLabel : null}
        onClear={clearSelection}
      />
      {activeMode && (
        <button className="clear-selection-btn" onClick={clearSelection} title="Clear selection and go back">
          Clear
        </button>
      )}
    </div>
  );
};
