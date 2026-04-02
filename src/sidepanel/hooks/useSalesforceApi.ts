import { useMemo } from 'react';
import { SalesforceApi } from '../services/salesforce-api';
import type { SessionInfo } from '../../shared/message-types';

export function useSalesforceApi(session: SessionInfo | null): SalesforceApi | null {
  return useMemo(() => {
    if (!session) return null;
    return new SalesforceApi(session.sessionId, session.instanceUrl);
  }, [session?.sessionId, session?.instanceUrl]);
}
