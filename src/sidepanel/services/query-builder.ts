// Sanitize values to prevent SOQL injection
function escapeSoql(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

export function buildObjectPermissionsQuery(filter: { objectName?: string; parentId?: string }): string {
  let query = `SELECT Id, ParentId, Parent.Name, Parent.Label, Parent.ProfileId, Parent.IsOwnedByProfile,
    SobjectType, PermissionsRead, PermissionsCreate, PermissionsEdit, PermissionsDelete,
    PermissionsViewAllRecords, PermissionsModifyAllRecords
    FROM ObjectPermissions`;

  const conditions: string[] = [];

  if (filter.objectName) {
    conditions.push(`SobjectType = '${escapeSoql(filter.objectName)}'`);
  }
  if (filter.parentId) {
    conditions.push(`ParentId = '${escapeSoql(filter.parentId)}'`);
  }

  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(' AND ')}`;
  }

  return query;
}

export function buildFieldPermissionsQuery(filter: { objectName?: string; parentId?: string }): string {
  let query = `SELECT Id, ParentId, Parent.Name, Parent.Label, Parent.ProfileId, Parent.IsOwnedByProfile,
    SobjectType, Field, PermissionsRead, PermissionsEdit
    FROM FieldPermissions`;

  const conditions: string[] = [];

  if (filter.objectName) {
    conditions.push(`SobjectType = '${escapeSoql(filter.objectName)}'`);
  }
  if (filter.parentId) {
    conditions.push(`ParentId = '${escapeSoql(filter.parentId)}'`);
  }

  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(' AND ')}`;
  }

  return query;
}

export function buildProfilesQuery(): string {
  return `SELECT Id, Name, UserType FROM Profile ORDER BY Name`;
}

export function buildPermissionSetsQuery(): string {
  return `SELECT Id, Name, Label, IsOwnedByProfile FROM PermissionSet WHERE IsOwnedByProfile = false ORDER BY Label`;
}
