export enum PermissionLevel {
  READ_WRITE = 'RW',
  READ_ONLY = 'R',
  NO_ACCESS = 'NONE',
}

export interface ObjectPermissionRecord {
  Id: string;
  ParentId: string;
  Parent: {
    Name: string;
    Label?: string;
    ProfileId?: string | null;
    IsOwnedByProfile: boolean;
  };
  SobjectType: string;
  PermissionsRead: boolean;
  PermissionsCreate: boolean;
  PermissionsEdit: boolean;
  PermissionsDelete: boolean;
  PermissionsViewAllRecords: boolean;
  PermissionsModifyAllRecords: boolean;
}

export interface FieldPermissionRecord {
  Id: string;
  ParentId: string;
  Parent: {
    Name: string;
    Label?: string;
    ProfileId?: string | null;
    IsOwnedByProfile: boolean;
  };
  SobjectType: string;
  Field: string;
  PermissionsRead: boolean;
  PermissionsEdit: boolean;
}

export interface ProfileRecord {
  Id: string;
  Name: string;
  UserType: string;
}

export interface PermissionSetRecord {
  Id: string;
  Name: string;
  Label: string;
  IsOwnedByProfile: boolean;
}

export interface Assignee {
  id: string;
  name: string;
  label: string;
  isProfile: boolean;
}

export interface FieldPermissionEntry {
  fieldName: string;
  fieldLabel: string;
  permissions: Record<string, PermissionLevel>; // assigneeId -> level
}

export interface ObjectPermissionEntry {
  objectName: string;
  read: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  viewAll: boolean;
  modifyAll: boolean;
}

export interface MatrixData {
  objectName: string;
  fields: FieldPermissionEntry[];
  assignees: Assignee[];
  objectPermissions: Record<string, ObjectPermissionEntry>; // assigneeId -> obj perms
}

export interface AccordionData {
  assignee: Assignee;
  objects: {
    objectName: string;
    objectPerms: ObjectPermissionEntry;
    fields: {
      fieldName: string;
      level: PermissionLevel;
    }[];
  }[];
}
