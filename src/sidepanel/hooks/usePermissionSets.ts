import { useState, useEffect, useRef } from 'react';
import { SalesforceApi } from '../services/salesforce-api';
import { getCached, setCache, CacheNamespace } from '../services/cache';
import { buildPermissionSetsQuery } from '../services/query-builder';
import type { PermissionSetRecord } from '../types/permissions';

export function usePermissionSets(api: SalesforceApi | null, orgId: string | null) {
  const [permissionSets, setPermissionSets] = useState<PermissionSetRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef(false);

  useEffect(() => {
    if (!api || !orgId) return;
    abortRef.current = false;

    async function fetchPermSets() {
      setLoading(true);
      setError(null);
      try {
        const cached = await getCached<PermissionSetRecord[]>(CacheNamespace.PERM_SETS, 'all', orgId!);
        if (cached) {
          if (!abortRef.current) {
            setPermissionSets(cached);
            setLoading(false);
          }
          return;
        }

        const records = await api!.query<PermissionSetRecord>(buildPermissionSetsQuery());
        if (!abortRef.current) {
          setPermissionSets(records);
          await setCache(CacheNamespace.PERM_SETS, 'all', records, orgId!);
        }
      } catch (e: any) {
        if (!abortRef.current) setError(e.message);
      } finally {
        if (!abortRef.current) setLoading(false);
      }
    }

    fetchPermSets();

    return () => {
      abortRef.current = true;
    };
  }, [api, orgId]);

  return { permissionSets, loading, error };
}
