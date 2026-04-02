import { MESSAGE_TYPES, STORAGE_KEYS } from '../shared/constants';
import type { SessionInfo } from '../shared/message-types';

function setBadge(tabId: number, text: string, color: string): void {
  chrome.action?.setBadgeText?.({ tabId, text });
  chrome.action?.setBadgeBackgroundColor?.({ tabId, color });
}

// ── Actively scan for SF session cookies ──────────────────────────
// This is the key fix: instead of waiting for a content script to fire,
// we proactively search all cookies for a Salesforce 'sid' cookie.

async function findSalesforceSession(): Promise<SessionInfo | null> {
  try {
    // Get ALL cookies named 'sid' across all SF domains
    const cookies = await chrome.cookies.getAll({ name: 'sid' });

    for (const cookie of cookies) {
      const domain = cookie.domain;
      // Only consider Salesforce domains
      const isSf =
        domain.includes('.salesforce.com') ||
        domain.includes('.force.com');

      if (!isSf || !cookie.value || cookie.value.length < 15) continue;

      // Determine the API-compatible instance URL from cookie domain
      let host = domain.startsWith('.') ? domain.substring(1) : domain;

      // Convert lightning.force.com → my.salesforce.com for API calls
      if (host.includes('.lightning.force.com')) {
        host = host.replace('.lightning.force.com', '.my.salesforce.com');
      }

      const instanceUrl = `https://${host}`;
      const orgId = cookie.value.substring(0, 15);

      const sessionInfo: SessionInfo = {
        sessionId: cookie.value,
        instanceUrl,
        orgId,
        timestamp: Date.now(),
      };

      // Store it for future use
      await chrome.storage.session.set({
        [STORAGE_KEYS.SESSION_INFO]: sessionInfo,
      });

      return sessionInfo;
    }
  } catch (err) {
    console.error('[SF Permission Matrix] Cookie scan failed:', err);
  }

  return null;
}

// ── Message handling ──────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Content script detected a SF page — extract session for that specific tab
  if (message.type === MESSAGE_TYPES.SF_PAGE_DETECTED && sender.tab?.id) {
    const tabId = sender.tab.id;
    const instanceUrl = message.instanceUrl as string;

    extractSessionFromUrl(instanceUrl).then((session) => {
      if (session) {
        setBadge(tabId, 'ON', '#2e844a');
        chrome.storage.session.set({
          [`${STORAGE_KEYS.SESSION_INFO}_${tabId}`]: session,
          [STORAGE_KEYS.SESSION_INFO]: session,
        });
      } else {
        setBadge(tabId, '?', '#ca8c04');
      }
    });
  }

  // App requests session info — actively scan if nothing stored
  if (message.type === MESSAGE_TYPES.SESSION_INFO_REQUEST) {
    (async () => {
      try {
        // First check storage
        const result = await chrome.storage.session.get(STORAGE_KEYS.SESSION_INFO);
        let session = result[STORAGE_KEYS.SESSION_INFO] as SessionInfo | null;

        // If nothing stored, actively scan cookies
        if (!session?.sessionId) {
          session = await findSalesforceSession();
        }

        sendResponse(session || null);
      } catch {
        sendResponse(null);
      }
    })();
    return true; // async response
  }
});

async function extractSessionFromUrl(instanceUrl: string): Promise<SessionInfo | null> {
  let apiBaseUrl = instanceUrl;
  if (instanceUrl.includes('.lightning.force.com')) {
    apiBaseUrl = instanceUrl.replace('.lightning.force.com', '.my.salesforce.com');
  }

  const cookieUrls = [instanceUrl, apiBaseUrl];

  for (const url of cookieUrls) {
    try {
      const cookie = await chrome.cookies.get({ url, name: 'sid' });
      if (cookie?.value && cookie.value.length >= 15) {
        return {
          sessionId: cookie.value,
          instanceUrl: apiBaseUrl,
          orgId: cookie.value.substring(0, 15),
          timestamp: Date.now(),
        };
      }
    } catch {}
  }

  return null;
}

// ── Extension icon click → open app in new tab ───────────────────

chrome.action.onClicked.addListener((_tab) => {
  const appUrl = chrome.runtime.getURL('src/sidepanel/sidepanel.html');

  // Reuse existing tab if already open
  chrome.tabs.query({}, (tabs) => {
    const existing = tabs.find((t) => t.url?.startsWith(appUrl));
    if (existing?.id) {
      chrome.tabs.update(existing.id, { active: true });
      chrome.windows.update(existing.windowId!, { focused: true });
    } else {
      chrome.tabs.create({ url: appUrl });
    }
  });
});
