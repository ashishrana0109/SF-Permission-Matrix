import { PermissionLevel } from '../types/permissions';

export const PERMISSION_COLORS = {
  [PermissionLevel.READ_WRITE]: {
    bg: '#cdefc4',
    text: '#2e844a',
    label: 'Read/Write',
    short: 'RW',
  },
  [PermissionLevel.READ_ONLY]: {
    bg: '#fef0cd',
    text: '#ca8c04',
    label: 'Read Only',
    short: 'R',
  },
  [PermissionLevel.NO_ACCESS]: {
    bg: '#feded8',
    text: '#ba0517',
    label: 'No Access',
    short: '—',
  },
} as const;

export function getPermissionStyle(level: PermissionLevel): React.CSSProperties {
  const color = PERMISSION_COLORS[level];
  return {
    backgroundColor: color.bg,
    color: color.text,
    fontWeight: 600,
    textAlign: 'center' as const,
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
  };
}
