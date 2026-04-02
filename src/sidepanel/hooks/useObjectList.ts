import { useState, useEffect, useRef } from 'react';
import { SalesforceApi } from '../services/salesforce-api';
import { getCached, setCache, CacheNamespace } from '../services/cache';
import type { SObjectListItem } from '../types/salesforce';

export function useObjectList(api: SalesforceApi | null, orgId: string | null) {
  const [objects, setObjects] = useState<SObjectListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef(false);

  useEffect(() => {
    if (!api || !orgId) return;
    abortRef.current = false;

    async function fetchObjects() {
      setLoading(true);
      setError(null);
      try {
        const cached = await getCached<SObjectListItem[]>(CacheNamespace.OBJECT_LIST, 'all', orgId!);
        if (cached) {
          if (!abortRef.current) {
            setObjects(cached);
            setLoading(false);
          }
          return;
        }

        const list = await api!.getObjectList();
        if (!abortRef.current) {
          setObjects(list);
          await setCache(CacheNamespace.OBJECT_LIST, 'all', list, orgId!);
        }
      } catch (e: any) {
        if (!abortRef.current) setError(e.message);
      } finally {
        if (!abortRef.current) setLoading(false);
      }
    }

    fetchObjects();

    return () => {
      abortRef.current = true;
    };
  }, [api, orgId]);

  return { objects, loading, error };
}
