import React, { useState, useMemo, memo } from 'react';
import { FieldRow } from './FieldRow';
import type { ObjectPermissionEntry, PermissionLevel } from '../types/permissions';

interface AccordionItemProps {
  objectName: string;
  objectPerms: ObjectPermissionEntry;
  fields: { fieldName: string; level: PermissionLevel }[];
}

export const AccordionItem: React.FC<AccordionItemProps> = memo(({
  objectName,
  objectPerms,
  fields,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [fieldSearch, setFieldSearch] = useState('');

  const objPermSummary: string[] = [];
  if (objectPerms.read) objPermSummary.push('Read');
  if (objectPerms.create) objPermSummary.push('Create');
  if (objectPerms.edit) objPermSummary.push('Edit');
  if (objectPerms.delete) objPermSummary.push('Delete');
  if (objectPerms.viewAll) objPermSummary.push('View All');
  if (objectPerms.modifyAll) objPermSummary.push('Modify All');

  const filteredFields = useMemo(() => {
    if (!fieldSearch) return fields;
    const term = fieldSearch.toLowerCase();
    return fields.filter((f) => f.fieldName.toLowerCase().includes(term));
  }, [fields, fieldSearch]);

  return (
    <div className={`accordion-item ${expanded ? 'expanded' : ''}`}>
      <div className="accordion-header" onClick={() => setExpanded(!expanded)}>
        <span className="accordion-arrow">{expanded ? '\u25BC' : '\u25B6'}</span>
        <span className="accordion-object-name">{objectName}</span>
        <span className="accordion-obj-perms">{objPermSummary.join(', ') || 'No Object Access'}</span>
        <span className="accordion-field-count">{fields.length} fields</span>
      </div>
      {expanded && (
        <div className="accordion-body">
          {fields.length === 0 ? (
            <div className="accordion-empty">No field-level permissions configured</div>
          ) : (
            <>
              {fields.length > 5 && (
                <div className="accordion-field-search">
                  <input
                    type="text"
                    className="field-search-inline"
                    placeholder="Search fields..."
                    value={fieldSearch}
                    onChange={(e) => setFieldSearch(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              )}
              {filteredFields.length === 0 ? (
                <div className="accordion-empty">No fields match "{fieldSearch}"</div>
              ) : (
                filteredFields.map((f) => (
                  <FieldRow key={f.fieldName} fieldName={f.fieldName} level={f.level} />
                ))
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
});

AccordionItem.displayName = 'AccordionItem';
