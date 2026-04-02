import React, { memo } from 'react';
import { PermissionLevel } from '../types/permissions';
import { PERMISSION_COLORS } from '../utils/color-coding';

interface MatrixCellProps {
  level: PermissionLevel;
  dimmed?: boolean;
}

export const MatrixCell: React.FC<MatrixCellProps> = memo(({ level, dimmed }) => {
  const color = PERMISSION_COLORS[level];

  return (
    <div
      className={`matrix-cell ${dimmed ? 'cell-dimmed' : ''}`}
      style={{ backgroundColor: color.bg, color: color.text }}
      title={color.label}
    >
      {color.short}
    </div>
  );
});

MatrixCell.displayName = 'MatrixCell';
