import { MESSAGE_TYPES, STORAGE_KEYS } from '../shared/constants';
import type { SessionInfo } from '../shared/message-types';

function setBadge(tabId: number, text: string, color: string): void {
  chrome.action?.setBadgeText?.({ tabId, text });
  chrome.action?.setBadgeBackgroundColor?.({ tabId, color });
}

// ── Salesforce URL detection ──────────────────────────────────────
// Matches any Salesforce domain variant: my.salesforce.com, lightning.force.com,
// salesforce-setup.com, cloudforce.com, sandboxes, scratch orgs, etc.
const SF_URL_PATTERN = /\.(salesforce|force|cloudforce|salesforce-setup|salesforce-sites)\.(com|mil)$/i;

function isSalesforceUrl(url: string): boolean {
  try {
    return SF_URL_PATTERN.test(new URL(url).hostname);
  } catch {
    return false;
  }
}

// ── Session extraction (cookie-value-based, domain-agnostic) ──────
// Salesforce session IDs always start with the org ID in format:
//   00D[alphanumeric]![sessionToken]
// This pattern works for ALL Salesforce URL variants without needing
// to maintain a list of allowed domains.
const SF_SESSION_PATTERN = /^00D[A-Za-z0-9]{12,}!/;

// Convert salesforce-setup.com URLs to salesforce.com for REST API calls.
// Setup UI lives on salesforce-setup.com; the API endpoint is salesforce.com.
function toApiInstanceUrl(url: string): string {
  return url.replace(/\.salesforce-setup\.com/, '.salesforce.com');
}

async function findSalesforceSession(preferredOrgUrl?: string): Promise<SessionInfo | null> {
  try {
    // Determine preferred org ID from the active SF tab URL (if known)
    let preferredOrgId: string | null = null;
    if (preferredOrgUrl) {
      try {
        // Try to get the sid cookie from the preferred URL to extract org ID
        const cookie = await chrome.cookies.get({ url: preferredOrgUrl, name: 'sid' });
        if (cookie?.value && SF_SESSION_PATTERN.test(cookie.value)) {
          preferredOrgId = cookie.value.split('!')[0];
        }
      } catch {}
    }

    // If we still don't know the preferred org, look for the most recently
    // accessed Salesforce tab and extract its org ID
    if (!preferredOrgId) {
      const allTabs = await chrome.tabs.query({});
      const sfTabs = allTabs
        .filter((t) => t.url && isSalesforceUrl(t.url))
        .sort((a, b) => (b.lastAccessed ?? 0) - (a.lastAccessed ?? 0));

      for (const tab of sfTabs) {
        if (!tab.url) continue;
        try {
          const origin = new URL(tab.url).origin;
          const cookie = await chrome.cookies.get({ url: origin, name: 'sid' });
          if (cookie?.value && SF_SESSION_PATTERN.test(cookie.value)) {
            preferredOrgId = cookie.value.split('!')[0];
            break;
          }
        } catch {}
      }
    }

    // Scan ALL sid cookies across all domains and find the one matching our org.
    // This works regardless of the Salesforce URL variant (no domain list needed).
    const allSidCookies = await chrome.cookies.getAll({ name: 'sid', secure: true });

    const sfCookies = allSidCookies.filter((c) =>
      c.value.length >= 15 &&
      SF_SESSION_PATTERN.test(c.value) &&
      !c.domain.includes('help.salesforce.com'),
    );

    // Sort: preferred org first, then most recently set (longer expiry = newer login)
    sfCookies.sort((a, b) => {
      const aMatch = preferredOrgId && a.value.startsWith(preferredOrgId) ? -1 : 0;
      const bMatch = preferredOrgId && b.value.startsWith(preferredOrgId) ? -1 : 0;
      if (aMatch !== bMatch) return aMatch - bMatch;
      return (b.expirationDate ?? 0) - (a.expirationDate ?? 0);
    });

    for (const cookie of sfCookies) {
      const cookieOrgId = cookie.value.split('!')[0];

      // If we know the target org, skip non-matching cookies
      if (preferredOrgId && cookieOrgId !== preferredOrgId) continue;

      // Build instance URL from cookie domain; strip leading dot
      const rawHost = cookie.domain.startsWith('.')
        ? cookie.domain.substring(1)
        : cookie.domain;

      // Always use salesforce.com (not salesforce-setup.com) for REST API calls
      const apiHost = toApiInstanceUrl(rawHost);
      const instanceUrl = `https://${apiHost}`;

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

// ── Tab monitoring (catches ALL Salesforce URL variants) ──────────
// Using tabs.onUpdated instead of relying on content scripts means we
// detect sessions from any SF domain without maintaining a URL allowlist.
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && isSalesforceUrl(tab.url)) {
    findSalesforceSession(tab.url).then((session) => {
      setBadge(tabId, session ? 'ON' : '?', session ? '#2e844a' : '#ca8c04');
    });
  }
});

// ── Message handling ──────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Legacy: content script page detection (still useful for in-page SPA navigation)
  if (message.type === MESSAGE_TYPES.SF_PAGE_DETECTED && sender.tab?.id) {
    const tabId = sender.tab.id;
    findSalesforceSession(message.instanceUrl as string | undefined).then((session) => {
      setBadge(tabId, session ? 'ON' : '?', session ? '#2e844a' : '#ca8c04');
    });
  }

  if (message.type === MESSAGE_TYPES.SESSION_INFO_REQUEST) {
    (async () => {
      try {
        const session = await findSalesforceSession();
        sendResponse(session ?? null);
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
