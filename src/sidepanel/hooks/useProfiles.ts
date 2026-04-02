import { useState, useEffect, useRef } from 'react';
import { SalesforceApi } from '../services/salesforce-api';
import { getCached, setCache, CacheNamespace } from '../services/cache';
import type { ProfileRecord } from '../types/permissions';

export interface ProfileWithPermSetId {
  id: string;  // PermissionSet Id (the ParentId used in ObjectPermissions/FieldPermissions)
  profileId: string;  // Profile Id
  name: string;
  label: string;
}

export function useProfiles(api: SalesforceApi | null, orgId: string | null) {
  const [profiles, setProfiles] = useState<ProfileWithPermSetId[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef(false);

  useEffect(() => {
    if (!api || !orgId) return;
    abortRef.current = false;

    async function fetchProfiles() {
      setLoading(true);
      setError(null);
      try {
        const cached = await getCached<ProfileWithPermSetId[]>(CacheNamespace.PROFILES, 'all', orgId!);
        if (cached) {
          if (!abortRef.current) {
            setProfiles(cached);
            setLoading(false);
          }
          return;
        }

        // Use REST API (not Tooling) — ProfileId is available on PermissionSet via REST
        const permSets = await api!.restQuery<{
          Id: string;
          Name: string;
          Label: string;
          ProfileId: string;
          IsOwnedByProfile: boolean;
        }>(
          `SELECT Id, Name, Label, ProfileId, IsOwnedByProfile FROM PermissionSet WHERE IsOwnedByProfile = true ORDER BY Label`
        );

        // Also get profile display names
        const profileRecords = await api!.restQuery<ProfileRecord>(
          `SELECT Id, Name, UserType FROM Profile ORDER BY Name`
        );
        const profileNameMap = new Map(profileRecords.map((p) => [p.Id, p.Name]));

        const result: ProfileWithPermSetId[] = permSets.map((ps) => ({
          id: ps.Id,
          profileId: ps.ProfileId,
          name: profileNameMap.get(ps.ProfileId) || ps.Name,
          label: profileNameMap.get(ps.ProfileId) || ps.Label || ps.Name,
        }));

        if (!abortRef.current) {
          setProfiles(result);
          await setCache(CacheNamespace.PROFILES, 'all', result, orgId!);
        }
      } catch (e: any) {
        if (!abortRef.current) setError(e.message);
      } finally {
        if (!abortRef.current) setLoading(false);
      }
    }

    fetchProfiles();

    return () => {
      abortRef.current = true;
    };
  }, [api, orgId]);

  return { profiles, loading, error };
}
