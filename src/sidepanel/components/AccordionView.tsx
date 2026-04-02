import React, { useState, useMemo } from 'react';
import { AccordionItem } from './AccordionItem';
import { ExportButton } from './ExportButton';
import { useExport } from '../hooks/useExport';
import type { AccordionData } from '../types/permissions';

interface AccordionViewProps {
  data: AccordionData;
}

export const AccordionView: React.FC<AccordionViewProps> = ({ data }) => {
  const [search, setSearch] = useState('');
  const { exportAccordion } = useExport();

  const filteredObjects = useMemo(() => {
    if (!search) return data.objects;
    const term = search.toLowerCase();
    return data.objects.filter((o) => o.objectName.toLowerCase().includes(term));
  }, [data.objects, search]);

  return (
    <div className="accordion-container">
      <div className="accordion-toolbar">
        <div className="accordion-info">
          <span className={`assignee-type-badge ${data.assignee.isProfile ? 'profile' : 'permset'}`}>
            {data.assignee.isProfile ? 'Profile' : 'Permission Set'}
          </span>
          <span className="accordion-assignee-name">{data.assignee.label}</span>
          <span className="accordion-counts">{filteredObjects.length} objects</span>
        </div>
        <div className="accordion-controls">
          <input
            type="text"
            className="field-search"
            placeholder="Search objects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <ExportButton onClick={() => exportAccordion(data)} />
        </div>
      </div>

      <div className="accordion-list">
        {filteredObjects.length === 0 ? (
          <div className="accordion-empty-state">
            {data.objects.length === 0
              ? 'No object permissions found for this assignee'
              : 'No objects match your search'}
          </div>
        ) : (
          filteredObjects.map((obj) => (
            <AccordionItem
              key={obj.objectName}
              objectName={obj.objectName}
              objectPerms={obj.objectPerms}
              fields={obj.fields}
            />
          ))
        )}
      </div>
    </div>
  );
};
