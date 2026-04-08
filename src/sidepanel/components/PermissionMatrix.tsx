import React, { useState, useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { MatrixCell } from './MatrixCell';
import { ExportButton } from './ExportButton';
import { PermissionLevel, type MatrixData } from '../types/permissions';
import { PERMISSION_COLORS } from '../utils/color-coding';
import { useExport } from '../hooks/useExport';
import { useDebounce } from '../hooks/useDebounce';

interface PermissionMatrixProps {
  data: MatrixData;
}

// Render a single CRUD badge
function CrudBadge({ label, active }: { label: string; active: boolean }) {
  return (
    <span
      className={`crud-badge ${active ? 'crud-active' : 'crud-inactive'}`}
      title={`${label}: ${active ? 'Yes' : 'No'}`}
    >
      {label}
    </span>
  );
}

export const PermissionMatrix: React.FC<PermissionMatrixProps> = ({ data }) => {
  const [fieldSearch, setFieldSearch] = useState('');
  const [filterLevel, setFilterLevel] = useState<PermissionLevel | 'ALL'>('ALL');
  const parentRef = useRef<HTMLDivElement>(null);
  const { exportMatrix } = useExport();

  const debouncedSearch = useDebounce(fieldSearch, 200);

  const filteredFields = useMemo(() => {
    let fields = data.fields;

    if (debouncedSearch) {
      const term = debouncedSearch.toLowerCase();
      fields = fields.filter(
        (f) =>
          f.fieldName.toLowerCase().includes(term) ||
          f.fieldLabel.toLowerCase().includes(term),
      );
    }

    if (filterLevel !== 'ALL') {
      fields = fields.filter((f) => {
        return Object.values(f.permissions).some((level) => level === filterLevel);
      });
    }

    return fields;
  }, [data.fields, debouncedSearch, filterLevel]);

  const rowVirtualizer = useVirtualizer({
    count: filteredFields.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 36,
    overscan: 20,
  });

  const profileAssignees = useMemo(() => data.assignees.filter((a) => a.isProfile), [data.assignees]);
  const permSetAssignees = useMemo(() => data.assignees.filter((a) => !a.isProfile), [data.assignees]);

  return (
    <div className="matrix-container">
      {/* Toolbar */}
      <div className="matrix-toolbar">
        <div className="matrix-info">
          <span className="matrix-object-name">{data.objectName}</span>
          <span className="matrix-counts">
            {filteredFields.length} fields | {profileAssignees.length} profiles | {permSetAssignees.length} perm sets
          </span>
        </div>
        <div className="matrix-controls">
          <input
            type="text"
            className="field-search"
            placeholder="Search fields..."
            value={fieldSearch}
            onChange={(e) => setFieldSearch(e.target.value)}
          />
          <select
            className="filter-select"
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value as PermissionLevel | 'ALL')}
          >
            <option value="ALL">All Permissions</option>
            <option value={PermissionLevel.READ_WRITE}>Read/Write Only</option>
            <option value={PermissionLevel.READ_ONLY}>Read Only</option>
            <option value={PermissionLevel.NO_ACCESS}>No Access Only</option>
          </select>
          <ExportButton onClick={() => exportMatrix(data)} />
        </div>
      </div>

      {/* Legend */}
      <div className="matrix-legend">
        <span className="legend-section">
          <strong>Field:</strong>
          {Object.entries(PERMISSION_COLORS).map(([key, val]) => (
            <span key={key} className="legend-item" style={{ backgroundColor: val.bg, color: val.text }}>
              {val.short} = {val.label}
            </span>
          ))}
        </span>
        <span className="legend-section">
          <strong>Object:</strong>
          <span className="crud-badge crud-active">C</span> Create
          <span className="crud-badge crud-active">R</span> Read
          <span className="crud-badge crud-active">E</span> Edit
          <span className="crud-badge crud-active">D</span> Delete
          <span className="crud-badge crud-active">VA</span> View All
          <span className="crud-badge crud-active">MA</span> Modify All
        </span>
        <span className="legend-section">
          <span className="legend-item profile-indicator">[P] = Profile</span>
          <span className="legend-item permset-indicator">[PS] = Permission Set</span>
        </span>
      </div>

      {/* Matrix Grid */}
      <div className="matrix-grid-wrapper" ref={parentRef}>
        {filteredFields.length === 0 ? (
          <div className="accordion-empty-state">
            {data.fields.length === 0
              ? 'No fields found for this object'
              : 'No fields match your search/filter'}
          </div>
        ) : (
          <>
            {/* Sticky Header */}
            <div className="matrix-header-row">
              <div className="matrix-header-cell field-col sticky-col">Field</div>
              {data.assignees.map((assignee) => (
                <div
                  key={assignee.id}
                  className={`matrix-header-cell assignee-col ${assignee.isProfile ? 'profile' : 'permset'}`}
                >
                  <span className="assignee-badge">{assignee.isProfile ? 'P' : 'PS'}</span>
                  <span className="assignee-name">{assignee.label}</span>
                  <span className="assignee-info-wrap">
                    <span className="assignee-info-icon">i</span>
                    <span className="assignee-tooltip">{assignee.label}</span>
                  </span>
                </div>
              ))}
            </div>

            {/* Object-Level CRUD Row */}
            <div className="matrix-row obj-crud-row">
              <div className="matrix-cell field-col sticky-col obj-crud-label">
                <span className="field-label">Object CRUD</span>
                <span className="field-api">Create / Read / Edit / Delete</span>
              </div>
              {data.assignees.map((assignee) => {
                const op = data.objectPermissions[assignee.id];
                return (
                  <div key={assignee.id} className="matrix-cell obj-crud-cell">
                    {op ? (
                      <div className="crud-badges">
                        <CrudBadge label="C" active={op.create} />
                        <CrudBadge label="R" active={op.read} />
                        <CrudBadge label="E" active={op.edit} />
                        <CrudBadge label="D" active={op.delete} />
                        <CrudBadge label="VA" active={op.viewAll} />
                        <CrudBadge label="MA" active={op.modifyAll} />
                      </div>
                    ) : (
                      <span className="crud-none">No Access</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Field-Level Rows (Virtualized) */}
            <div
              className="matrix-body"
              style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const field = filteredFields[virtualRow.index];
                if (!field) return null;
                return (
                  <div
                    key={field.fieldName}
                    className="matrix-row"
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    <div className="matrix-cell field-col sticky-col" title={`${field.fieldLabel} (${field.fieldName})`}>
                      <span className="field-label">{field.fieldLabel}</span>
                      <span className="field-api">{field.fieldName}</span>
                    </div>
                    {data.assignees.map((assignee) => {
                      const level = field.permissions[assignee.id] ?? PermissionLevel.NO_ACCESS;
                      const dimmed = filterLevel !== 'ALL' && level !== filterLevel;
                      return <MatrixCell key={assignee.id} level={level} dimmed={dimmed} />;
                    })}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
