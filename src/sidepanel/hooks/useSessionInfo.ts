import { useState, useEffect, useRef } from 'react';
import { MESSAGE_TYPES, STORAGE_KEYS } from '../../shared/constants';
import type { SessionInfo } from '../../shared/message-types';

const SESSION_MAX_AGE_MS = 2 * 60 * 60 * 1000;

function isSessionValid(info: SessionInfo | undefined | null): info is SessionInfo {
  if (!info?.sessionId || !info?.instanceUrl) return false;
  if (info.timestamp && Date.now() - info.timestamp > SESSION_MAX_AGE_MS) return false;
  return true;
}

export function useSessionInfo() {
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    async function fetchSession() {
      try {
        // Ask the background script to find/return a session
        // The background actively scans cookies if nothing is stored
        const info = await chrome.runtime.sendMessage({
          type: MESSAGE_TYPES.SESSION_INFO_REQUEST,
        }) as SessionInfo | null;

        if (!mountedRef.current) return;

        if (isSessionValid(info)) {
          setSession(info);
        } else {
          setError('Not connected to Salesforce. Make sure you are logged into a Salesforce org in another tab, then click the extension icon again.');
        }
      } catch {
        if (mountedRef.current) {
          setError('Failed to retrieve session info.');
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    }

    fetchSession();

    // Listen for session updates (e.g., user logs into SF in another tab)
    const listener = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (!mountedRef.current) return;
      if (changes[STORAGE_KEYS.SESSION_INFO]) {
        const newSession = changes[STORAGE_KEYS.SESSION_INFO].newValue as SessionInfo;
        if (isSessionValid(newSession)) {
          setSession(newSession);
          setError(null);
        }
      }
    };

    chrome.storage.session.onChanged.addListener(listener);
    return () => {
      mountedRef.current = false;
      chrome.storage.session.onChanged.removeListener(listener);
    };
  }, []);

  return { session, loading, error };
}
