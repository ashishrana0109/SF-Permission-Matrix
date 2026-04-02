import { useState, useCallback, useRef } from 'react';
import { SalesforceApi } from '../services/salesforce-api';
import { getCached, setCache, CacheNamespace } from '../services/cache';
import { buildObjectPermissionsQuery, buildFieldPermissionsQuery } from '../services/query-builder';
import { buildMatrixData } from '../utils/permission-resolver';
import type { ObjectPermissionRecord, FieldPermissionRecord, MatrixData } from '../types/permissions';

export function useObjectPermissions(
  api: SalesforceApi | null,
  orgId: string | null,
  profileNameMap: Record<string, string>, // PermSetId → profile display name
) {
  const [matrixData, setMatrixData] = useState<MatrixData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const fetchForObject = useCallback(
    async (objectName: string) => {
      if (!api || !orgId) return;

      const requestId = ++requestIdRef.current;

      setLoading(true);
      setError(null);
      setMatrixData(null);

      try {
        const cached = await getCached<MatrixData>(CacheNamespace.MATRIX, objectName, orgId);
        if (cached && requestId === requestIdRef.current) {
          setMatrixData(cached);
          setLoading(false);
          return;
        }

        // ObjectPermissions + FieldPermissions are REST API objects
        const [describe, objectPerms, fieldPerms] = await Promise.all([
          api.describeObject(objectName),
          api.restQuery<ObjectPermissionRecord>(
            buildObjectPermissionsQuery({ objectName }),
          ),
          api.restQuery<FieldPermissionRecord>(
            buildFieldPermissionsQuery({ objectName }),
          ),
        ]);

        if (requestId !== requestIdRef.current) return;

        const matrix = buildMatrixData(
          objectName,
          describe.fields,
          objectPerms,
          fieldPerms,
          profileNameMap,
        );

        setMatrixData(matrix);
        setLoading(false);
        await setCache(CacheNamespace.MATRIX, objectName, matrix, orgId);
      } catch (e: any) {
        if (requestId === requestIdRef.current) {
          setError(e.message);
          setLoading(false);
        }
      }
    },
    [api, orgId, profileNameMap],
  );

  return { matrixData, loading, error, fetchForObject };
}
