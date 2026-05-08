import { MESSAGE_TYPES } from '../shared/constants';

function detectSalesforcePage(): void {
  const origin = window.location.origin;

  // Validate origin exists and is HTTPS
  if (!origin || origin === 'null' || !origin.startsWith('https://')) return;

  // Match any Salesforce domain variant without maintaining a hardcoded list.
  // Covers: my.salesforce.com, lightning.force.com, my.salesforce-setup.com,
  // sandboxes (*.sandbox.my.salesforce.com), scratch orgs, cloudforce, etc.
  const sfDomainPattern = /\.(salesforce|force|cloudforce|salesforce-setup|salesforce-sites)\.(com|mil)(:\d+)?$/i;
  if (!sfDomainPattern.test(origin)) return;

  chrome.runtime.sendMessage({
    type: MESSAGE_TYPES.SF_PAGE_DETECTED,
    instanceUrl: origin,
  });
}

detectSalesforcePage();

// Proper SPA navigation detection using Navigation API or events
// Lightning Experience uses pushState/replaceState for navigation
let lastUrl = window.location.href;

function onNavigation(): void {
  const currentUrl = window.location.href;
  if (currentUrl !== lastUrl) {
    lastUrl = currentUrl;
    detectSalesforcePage();
  }
}

// Listen for proper navigation events instead of MutationObserver
window.addEventListener('popstate', onNavigation);

// Intercept pushState/replaceState for SPA navigation detection
const originalPushState = history.pushState;
const originalReplaceState = history.replaceState;

history.pushState = function (...args) {
  originalPushState.apply(this, args);
  onNavigation();
};

history.replaceState = function (...args) {
  originalReplaceState.apply(this, args);
  onNavigation();
};
