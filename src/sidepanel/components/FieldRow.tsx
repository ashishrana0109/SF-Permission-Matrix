import React, { memo } from 'react';
import { PermissionLevel } from '../types/permissions';
import { PERMISSION_COLORS } from '../utils/color-coding';

interface FieldRowProps {
  fieldName: string;
  level: PermissionLevel;
}

export const FieldRow: React.FC<FieldRowProps> = memo(({ fieldName, level }) => {
  const color = PERMISSION_COLORS[level];

  return (
    <div className="field-row">
      <span className="field-row-name">{fieldName}</span>
      <span
        className="field-row-badge"
        style={{ backgroundColor: color.bg, color: color.text }}
      >
        {color.label}
      </span>
    </div>
  );
});

FieldRow.displayName = 'FieldRow';
