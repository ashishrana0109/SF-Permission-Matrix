import React, { useState, useCallback, useMemo } from 'react';
import { Header } from './components/Header';
import { SelectorBar } from './components/SelectorBar';
import { PermissionMatrix } from './components/PermissionMatrix';
import { AccordionView } from './components/AccordionView';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ErrorBanner } from './components/ErrorBanner';
import { useSessionInfo } from './hooks/useSessionInfo';
import { useSalesforceApi } from './hooks/useSalesforceApi';
import { useObjectList } from './hooks/useObjectList';
import { useProfiles } from './hooks/useProfiles';
import { usePermissionSets } from './hooks/usePermissionSets';
import { useObjectPermissions } from './hooks/useObjectPermissions';
import { useFieldPermissions } from './hooks/useFieldPermissions';
import './styles/index.css';

type ViewMode = 'empty' | 'object' | 'profile' | 'permset';

export const App: React.FC = () => {
  const { session, loading: sessionLoading, error: sessionError, retry: retrySession } = useSessionInfo();
  const api = useSalesforceApi(session);
  const orgId = session?.orgId ?? null;

  const { objects, loading: objectsLoading, error: objectsError } = useObjectList(api, orgId);
  const { profiles, loading: profilesLoading, error: profilesError } = useProfiles(api, orgId);
  const { permissionSets, loading: permSetsLoading, error: permSetsError } = usePermissionSets(api, orgId);

  // Build PermSetId → profile display name map for resolving names in the matrix
  const profileNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const p of profiles) {
      map[p.id] = p.label; // p.id = PermissionSet Id, p.label = actual profile name
    }
    return map;
  }, [profiles]);

  const {
    matrixData,
    loading: matrixLoading,
    error: matrixError,
    fetchForObject,
  } = useObjectPermissions(api, orgId, profileNameMap);

  const {
    accordionData,
    loading: accordionLoading,
    error: accordionError,
    fetchForAssignee,
  } = useFieldPermissions(api, orgId);

  const [viewMode, setViewMode] = useState<ViewMode>('empty');

  const handleClear = useCallback(() => {
    setViewMode('empty');
  }, []);

  const profileOptions = useMemo(
    () => profiles.map((p) => ({ id: p.id, name: p.name, label: p.label })),
    [profiles],
  );

  if (sessionLoading) {
    return (
      <div className="app">
        <Header instanceUrl={null} orgId={null} />
        <LoadingSpinner message="Connecting to Salesforce..." />
      </div>
    );
  }

  if (sessionError) {
    return (
      <div className="app">
        <Header instanceUrl={null} orgId={null} />
        <ErrorBanner message={sessionError} onRetry={retrySession} />
        <div className="help-text">
          <p>To use SF Permission Matrix:</p>
          <ol>
            <li>Log into your Salesforce org in any Chrome tab</li>
            <li>Click <strong>Retry</strong> above, or reopen the extension</li>
          </ol>
        </div>
      </div>
    );
  }

  const dropdownsLoading = objectsLoading || profilesLoading || permSetsLoading;
  const dropdownsError = objectsError || profilesError || permSetsError;
  const contentLoading = matrixLoading || accordionLoading;
  const contentError = matrixError || accordionError;

  return (
    <div className="app">
      <Header instanceUrl={session?.instanceUrl ?? null} orgId={orgId} />

      {dropdownsError && <ErrorBanner message={dropdownsError} />}

      {dropdownsLoading ? (
        <LoadingSpinner message="Loading org metadata..." />
      ) : (
        <>
          <SelectorBar
            objects={objects}
            profiles={profileOptions}
            permissionSets={permissionSets}
            onObjectSelect={(objectName) => {
              setViewMode('object');
              fetchForObject(objectName);
            }}
            onProfileSelect={(profileId, profileName) => {
              setViewMode('profile');
              fetchForAssignee(profileId, profileName, true);
            }}
            onPermSetSelect={(permSetId, permSetName) => {
              setViewMode('permset');
              fetchForAssignee(permSetId, permSetName, false);
            }}
            onClear={handleClear}
            loading={contentLoading}
          />

          {!dropdownsLoading && objects.length === 0 && profiles.length === 0 && permissionSets.length === 0 && (
            <ErrorBanner message="No objects, profiles, or permission sets found. Check your API permissions." />
          )}
        </>
      )}

      {contentError && <ErrorBanner message={contentError} />}

      {contentLoading && <LoadingSpinner message="Fetching permissions data..." />}

      {!contentLoading && viewMode === 'object' && matrixData && (
        <PermissionMatrix data={matrixData} />
      )}

      {!contentLoading && (viewMode === 'profile' || viewMode === 'permset') && accordionData && (
        <AccordionView data={accordionData} />
      )}

      {viewMode === 'empty' && !contentLoading && !dropdownsLoading && (
        <div className="empty-state">
          <div className="empty-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#b0adab" strokeWidth="1.5">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
            </svg>
          </div>
          <p>Select an Object, Profile, or Permission Set to view permissions</p>
        </div>
      )}
    </div>
  );
};
