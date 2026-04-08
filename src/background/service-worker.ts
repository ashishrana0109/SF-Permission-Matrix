import { MESSAGE_TYPES, STORAGE_KEYS } from '../shared/constants';
import type { SessionInfo } from '../shared/message-types';

function setBadge(tabId: number, text: string, color: string): void {
  chrome.action?.setBadgeText?.({ tabId, text });
  chrome.action?.setBadgeBackgroundColor?.({ tabId, color });
}

// ── Session extraction (Salesforce Inspector approach) ───────────
// Key insight: the `sid` cookie on lightning.force.com is NOT valid
// for REST API calls. We need the `sid` cookie from salesforce.com
// domain, correlated by org ID.

const API_COOKIE_DOMAINS = [
  'salesforce.com',
  'cloudforce.com',
  'salesforce.mil',
];

async function findSalesforceSession(): Promise<SessionInfo | null> {
  try {
    // Step 1: Find any open SF tab to get initial sid + org ID
    const tabs = await chrome.tabs.query({});
    const sfTab = tabs.find((t) => {
      const url = t.url || '';
      return url.includes('.salesforce.com') || url.includes('.force.com');
    });

    let orgId: string | null = null;

    // Try getting orgId from the tab's cookie first
    if (sfTab?.url) {
      const origin = new URL(sfTab.url).origin;
      try {
        const tabCookie = await chrome.cookies.get({ url: origin, name: 'sid' });
        if (tabCookie?.value) {
          orgId = tabCookie.value.split('!')[0]; // orgId is before the !
        }
      } catch {}
    }

    // Step 2: Search for the API-compatible sid cookie on salesforce.com domain
    // This is the cookie that works with REST API (not the lightning.force.com one)
    for (const domain of API_COOKIE_DOMAINS) {
      const cookies = await chrome.cookies.getAll({
        name: 'sid',
        domain,
        secure: true,
      });

      for (const cookie of cookies) {
        if (!cookie.value || cookie.value.length < 15) continue;
        if (cookie.domain === 'help.salesforce.com') continue;

        const cookieOrgId = cookie.value.split('!')[0];

        // If we know the org ID, match it; otherwise take the first valid one
        if (orgId && cookieOrgId !== orgId) continue;

        // Build the API host from the cookie domain
        const host = cookie.domain.startsWith('.')
          ? cookie.domain.substring(1)
          : cookie.domain;

        const instanceUrl = `https://${host}`;

        const sessionInfo: SessionInfo = {
          sessionId: cookie.value,
          instanceUrl,
          orgId: cookieOrgId,
          timestamp: Date.now(),
        };

        await chrome.storage.session.set({
          [STORAGE_KEYS.SESSION_INFO]: sessionInfo,
        });

        return sessionInfo;
      }
    }

    // Step 3: Fallback — try force.com domain cookies (less reliable but worth trying)
    const forceCookies = await chrome.cookies.getAll({
      name: 'sid',
      domain: 'force.com',
      secure: true,
    });

    for (const cookie of forceCookies) {
      if (!cookie.value || cookie.value.length < 15) continue;

      const cookieOrgId = cookie.value.split('!')[0];
      if (orgId && cookieOrgId !== orgId) continue;

      let host = cookie.domain.startsWith('.')
        ? cookie.domain.substring(1)
        : cookie.domain;

      // Convert lightning.force.com → my.salesforce.com for API
      if (host.includes('.lightning.force.com')) {
        host = host.replace('.lightning.force.com', '.my.salesforce.com');
      }

      const instanceUrl = `https://${host}`;

      const sessionInfo: SessionInfo = {
        sessionId: cookie.value,
        instanceUrl,
        orgId: cookieOrgId,
        timestamp: Date.now(),
      };

      await chrome.storage.session.set({
        [STORAGE_KEYS.SESSION_INFO]: sessionInfo,
      });

      return sessionInfo;
    }
  } catch (err) {
    console.error('[SF Permission Matrix] Session scan failed:', err);
  }

  return null;
}

// ── Message handling ──────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === MESSAGE_TYPES.SF_PAGE_DETECTED && sender.tab?.id) {
    const tabId = sender.tab.id;
    findSalesforceSession().then((session) => {
      if (session) {
        setBadge(tabId, 'ON', '#2e844a');
      } else {
        setBadge(tabId, '?', '#ca8c04');
      }
    });
  }

  if (message.type === MESSAGE_TYPES.SESSION_INFO_REQUEST) {
    (async () => {
      try {
        const session = await findSalesforceSession();
        sendResponse(session || null);
      } catch {
        sendResponse(null);
      }
    })();
    return true;
  }
});

// ── Extension icon click → open app in new tab ───────────────────

chrome.action.onClicked.addListener((_tab) => {
  const appUrl = chrome.runtime.getURL('src/sidepanel/sidepanel.html');

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
