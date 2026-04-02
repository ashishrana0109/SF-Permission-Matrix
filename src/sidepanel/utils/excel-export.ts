import * as XLSX from 'xlsx';
import { PermissionLevel, type MatrixData, type AccordionData } from '../types/permissions';
import { PERMISSION_COLORS } from './color-coding';

export function exportMatrixToExcel(data: MatrixData): void {
  const wb = XLSX.utils.book_new();

  const headers = ['Field Name', 'Field Label'];
  for (const assignee of data.assignees) {
    const prefix = assignee.isProfile ? '[P]' : '[PS]';
    headers.push(`${prefix} ${assignee.label}`);
  }

  const rows: string[][] = [headers];

  // Object-level permissions row
  const objRow = ['** Object Permissions **', ''];
  for (const assignee of data.assignees) {
    const op = data.objectPermissions[assignee.id];
    if (op) {
      const perms: string[] = [];
      if (op.read) perms.push('R');
      if (op.create) perms.push('C');
      if (op.edit) perms.push('E');
      if (op.delete) perms.push('D');
      if (op.viewAll) perms.push('VA');
      if (op.modifyAll) perms.push('MA');
      objRow.push(perms.join('/') || 'None');
    } else {
      objRow.push('None');
    }
  }
  rows.push(objRow);

  // Field-level permissions rows
  for (const field of data.fields) {
    const row = [field.fieldName, field.fieldLabel];
    for (const assignee of data.assignees) {
      const level = field.permissions[assignee.id] ?? PermissionLevel.NO_ACCESS;
      row.push(PERMISSION_COLORS[level].label);
    }
    rows.push(row);
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);

  const colWidths = headers.map((h, i) => {
    const maxLen = Math.max(h.length, ...rows.map((r) => (r[i] || '').length));
    return { wch: Math.min(maxLen + 2, 30) };
  });
  ws['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(wb, ws, data.objectName.substring(0, 31));

  const fileName = `${data.objectName}_Permissions_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

export function exportAccordionToExcel(data: AccordionData): void {
  const wb = XLSX.utils.book_new();

  // Show field-level access grouped by object
  const headers = ['Object', 'Field Name', 'Access'];
  const rows: string[][] = [headers];

  for (const obj of data.objects) {
    if (obj.fields.length > 0) {
      // Add each field row under its object
      for (const field of obj.fields) {
        rows.push([
          obj.objectName,
          field.fieldName,
          PERMISSION_COLORS[field.level].label,
        ]);
      }
    } else {
      // Object has object-level access but no field-level permissions
      const perms: string[] = [];
      if (obj.objectPerms.read) perms.push('Read');
      if (obj.objectPerms.create) perms.push('Create');
      if (obj.objectPerms.edit) perms.push('Edit');
      if (obj.objectPerms.delete) perms.push('Delete');
      if (obj.objectPerms.viewAll) perms.push('View All');
      if (obj.objectPerms.modifyAll) perms.push('Modify All');
      rows.push([obj.objectName, '(no field permissions)', perms.join(', ') || 'None']);
    }
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 30 }, { wch: 30 }, { wch: 15 }];

  const sheetName = (data.assignee.label || 'Permissions').substring(0, 31);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const fileName = `${data.assignee.label}_Permissions_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
