export interface SObjectDescribe {
  name: string;
  label: string;
  custom: boolean;
  fields: SObjectField[];
}

export interface SObjectField {
  name: string;
  label: string;
  type: string;
  custom: boolean;
}

export interface SObjectListItem {
  name: string;
  label: string;
  custom: boolean;
  queryable: boolean;
}

export interface QueryResult<T = Record<string, unknown>> {
  totalSize: number;
  done: boolean;
  nextRecordsUrl?: string;
  records: T[];
}
