import { useState, useCallback, useRef } from 'react';
import { SalesforceApi } from '../services/salesforce-api';
import { getCached, setCache, CacheNamespace } from '../services/cache';
import { buildObjectPermissionsQuery, buildFieldPermissionsQuery } from '../services/query-builder';
import { resolvePermissionLevel } from '../utils/permission-resolver';
import type {
  ObjectPermissionRecord,
  FieldPermissionRecord,
  ObjectPermissionEntry,
  PermissionLevel,
  AccordionData,
} from '../types/permissions';

function parseFieldName(rawField: string): string {
  if (!rawField) return rawField;
  if (rawField.includes('.')) {
    const parts = rawField.split('.');
    return parts[parts.length - 1];
  }
  return rawField;
}

export function useFieldPermissions(api: SalesforceApi | null, orgId: string | null) {
  const [accordionData, setAccordionData] = useState<AccordionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const fetchForAssignee = useCallback(
    async (parentId: string, assigneeName: string, isProfile: boolean) => {
      if (!api || !orgId) return;

      const requestId = ++requestIdRef.current;

      setLoading(true);
      setError(null);
      setAccordionData(null);

      try {
        const cached = await getCached<AccordionData>(CacheNamespace.ACCORDION, parentId, orgId);
        if (cached && requestId === requestIdRef.current) {
          setAccordionData(cached);
          setLoading(false);
          return;
        }

        // ObjectPermissions + FieldPermissions are REST API objects, NOT Tooling API
        const [objectPerms, fieldPerms] = await Promise.all([
          api.restQuery<ObjectPermissionRecord>(
            buildObjectPermissionsQuery({ parentId }),
          ),
          api.restQuery<FieldPermissionRecord>(
            buildFieldPermissionsQuery({ parentId }),
          ),
        ]);

        if (requestId !== requestIdRef.current) return;

        const fieldsByObject: Record<string, { fieldName: string; level: PermissionLevel }[]> = {};
        for (const fp of fieldPerms) {
          const fieldName = parseFieldName(fp.Field);
          if (!fieldsByObject[fp.SobjectType]) {
            fieldsByObject[fp.SobjectType] = [];
          }
          fieldsByObject[fp.SobjectType].push({
            fieldName,
            level: resolvePermissionLevel(fp.PermissionsRead, fp.PermissionsEdit),
          });
        }

        const objects = objectPerms.map((op) => {
          const objEntry: ObjectPermissionEntry = {
            objectName: op.SobjectType,
            read: op.PermissionsRead,
            create: op.PermissionsCreate,
            edit: op.PermissionsEdit,
            delete: op.PermissionsDelete,
            viewAll: op.PermissionsViewAllRecords,
            modifyAll: op.PermissionsModifyAllRecords,
          };

          return {
            objectName: op.SobjectType,
            objectPerms: objEntry,
            fields: fieldsByObject[op.SobjectType] || [],
          };
        });

        objects.sort((a, b) => a.objectName.localeCompare(b.objectName));

        const result: AccordionData = {
          assignee: {
            id: parentId,
            name: assigneeName,
            label: assigneeName,
            isProfile,
          },
          objects,
        };

        setAccordionData(result);
        setLoading(false);
        await setCache(CacheNamespace.ACCORDION, parentId, result, orgId);
      } catch (e: any) {
        if (requestId === requestIdRef.current) {
          setError(e.message);
          setLoading(false);
        }
      }
    },
    [api, orgId],
  );

  return { accordionData, loading, error, fetchForAssignee };
}
