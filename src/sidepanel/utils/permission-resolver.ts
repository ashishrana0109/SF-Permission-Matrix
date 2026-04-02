import {
  PermissionLevel,
  type ObjectPermissionRecord,
  type FieldPermissionRecord,
  type Assignee,
  type FieldPermissionEntry,
  type MatrixData,
  type ObjectPermissionEntry,
} from '../types/permissions';
import type { SObjectField } from '../types/salesforce';

export function resolvePermissionLevel(read: boolean, edit: boolean): PermissionLevel {
  if (edit) return PermissionLevel.READ_WRITE;
  if (read) return PermissionLevel.READ_ONLY;
  return PermissionLevel.NO_ACCESS;
}

function parseFieldName(rawField: string): string {
  if (!rawField) return rawField;
  if (rawField.includes('.')) {
    const parts = rawField.split('.');
    return parts[parts.length - 1];
  }
  return rawField;
}

// profileNameMap: PermissionSetId → actual profile display name
// This is needed because Parent.Name for profile-owned PermSets is an auto-generated ID
export function buildMatrixData(
  objectName: string,
  fields: SObjectField[],
  objectPerms: ObjectPermissionRecord[],
  fieldPerms: FieldPermissionRecord[],
  profileNameMap?: Record<string, string>,
): MatrixData {
  const assigneeMap: Record<string, Assignee> = {};

  function resolveLabel(record: ObjectPermissionRecord | FieldPermissionRecord): string {
    const parentId = record.ParentId;
    const isProfile = record.Parent?.IsOwnedByProfile ?? false;

    // For profile-owned PermSets, use the pre-fetched profile name
    if (isProfile && profileNameMap?.[parentId]) {
      return profileNameMap[parentId];
    }

    // For regular permission sets, Label is the human-readable name
    return record.Parent?.Label || record.Parent?.Name || 'Unknown';
  }

  for (const op of objectPerms) {
    if (!assigneeMap[op.ParentId]) {
      assigneeMap[op.ParentId] = {
        id: op.ParentId,
        name: op.Parent?.Name || 'Unknown',
        label: resolveLabel(op),
        isProfile: op.Parent?.IsOwnedByProfile ?? false,
      };
    }
  }

  for (const fp of fieldPerms) {
    if (!assigneeMap[fp.ParentId]) {
      assigneeMap[fp.ParentId] = {
        id: fp.ParentId,
        name: fp.Parent?.Name || 'Unknown',
        label: resolveLabel(fp),
        isProfile: fp.Parent?.IsOwnedByProfile ?? false,
      };
    }
  }

  const assignees = Object.values(assigneeMap).sort((a, b) => {
    if (a.isProfile !== b.isProfile) return a.isProfile ? -1 : 1;
    return a.label.localeCompare(b.label);
  });

  const objPermsRecord: Record<string, ObjectPermissionEntry> = {};
  for (const op of objectPerms) {
    objPermsRecord[op.ParentId] = {
      objectName: op.SobjectType,
      read: op.PermissionsRead,
      create: op.PermissionsCreate,
      edit: op.PermissionsEdit,
      delete: op.PermissionsDelete,
      viewAll: op.PermissionsViewAllRecords,
      modifyAll: op.PermissionsModifyAllRecords,
    };
  }

  const fieldPermIndex: Record<string, Record<string, PermissionLevel>> = {};
  for (const fp of fieldPerms) {
    const fieldName = parseFieldName(fp.Field);
    if (!fieldPermIndex[fieldName]) {
      fieldPermIndex[fieldName] = {};
    }
    fieldPermIndex[fieldName][fp.ParentId] = resolvePermissionLevel(
      fp.PermissionsRead,
      fp.PermissionsEdit,
    );
  }

  // Filter out system/audit fields that aren't configurable
  const SYSTEM_FIELDS = new Set([
    'Id', 'OwnerId', 'IsDeleted',
    'CreatedById', 'CreatedDate',
    'LastModifiedById', 'LastModifiedDate',
    'SystemModstamp', 'LastActivityDate', 'LastViewedDate', 'LastReferencedDate',
    'MasterRecordId', 'RecordTypeId',
    'CurrencyIsoCode', 'Division',
    'PhotoUrl', 'JigsawContactId', 'Jigsaw',
  ]);

  const userFields = fields.filter((f) => !SYSTEM_FIELDS.has(f.name));

  const fieldEntries: FieldPermissionEntry[] = userFields.map((field) => {
    const permissions: Record<string, PermissionLevel> = {};
    for (const assignee of assignees) {
      permissions[assignee.id] =
        fieldPermIndex[field.name]?.[assignee.id] ?? PermissionLevel.NO_ACCESS;
    }
    return {
      fieldName: field.name,
      fieldLabel: field.label,
      permissions,
    };
  });

  return {
    objectName,
    fields: fieldEntries,
    assignees,
    objectPermissions: objPermsRecord,
  };
}
