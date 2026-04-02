export const SF_API_VERSION = 'v59.0';

export const STORAGE_KEYS = {
  SESSION_INFO: 'sf_session_info',
  CACHE_PREFIX: 'sf_cache_',
} as const;

export const MESSAGE_TYPES = {
  SF_PAGE_DETECTED: 'SF_PAGE_DETECTED',
  SESSION_INFO_REQUEST: 'SESSION_INFO_REQUEST',
  SESSION_INFO_RESPONSE: 'SESSION_INFO_RESPONSE',
} as const;

export const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
