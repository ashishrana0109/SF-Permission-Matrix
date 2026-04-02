import { SF_API_VERSION } from '../../shared/constants';
import type { QueryResult, SObjectDescribe, SObjectListItem } from '../types/salesforce';

const FETCH_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

// Non-retryable status codes
const NO_RETRY_STATUSES = new Set([400, 401, 403, 404, 405]);

export class SalesforceApiError extends Error {
  public status: number;
  public isSessionExpired: boolean;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'SalesforceApiError';
    this.status = status;
    this.isSessionExpired = status === 401;
  }
}

function validateSessionToken(token: string): void {
  if (!token || typeof token !== 'string' || token.length < 15) {
    throw new SalesforceApiError('Invalid session token', 401);
  }
  // Check for obvious invalid chars (newlines, spaces at boundaries)
  if (/[\r\n]/.test(token) || token !== token.trim()) {
    throw new SalesforceApiError('Malformed session token', 401);
  }
}

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new SalesforceApiError('Request timed out after 30s', 408);
    }
    throw new SalesforceApiError(`Network error: ${err.message}`, 0);
  } finally {
    clearTimeout(timer);
  }
}

async function fetchWithRetry(url: string, init: RequestInit): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetchWithTimeout(url, init);

      if (response.ok) return response;

      // Non-retryable errors — throw immediately
      if (NO_RETRY_STATUSES.has(response.status)) {
        const body = await response.text();
        if (response.status === 401) {
          throw new SalesforceApiError('Session expired — please refresh your Salesforce tab', 401);
        }
        throw new SalesforceApiError(
          `Salesforce API error (${response.status}): ${body}`,
          response.status,
        );
      }

      // Retryable (5xx, 429, etc.) — retry after delay
      lastError = new SalesforceApiError(
        `Salesforce API error (${response.status})`,
        response.status,
      );
    } catch (err: any) {
      if (err instanceof SalesforceApiError && NO_RETRY_STATUSES.has(err.status)) {
        throw err;
      }
      lastError = err;
    }

    if (attempt < MAX_RETRIES) {
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * (attempt + 1)));
    }
  }

  throw lastError ?? new SalesforceApiError('Request failed after retries', 0);
}

export class SalesforceApi {
  private sessionId: string;
  private instanceUrl: string;

  constructor(sessionId: string, instanceUrl: string) {
    validateSessionToken(sessionId);
    this.sessionId = sessionId;
    this.instanceUrl = instanceUrl.replace(/\/$/, '');
  }

  private get headers(): HeadersInit {
    return {
      Authorization: `Bearer ${this.sessionId}`,
      'Content-Type': 'application/json',
    };
  }

  private get baseUrl(): string {
    return `${this.instanceUrl}/services/data/${SF_API_VERSION}`;
  }

  /** Tooling API query — use for ObjectPermissions, FieldPermissions, PermissionSet */
  async query<T>(soql: string): Promise<T[]> {
    const allRecords: T[] = [];
    let url = `${this.baseUrl}/tooling/query?q=${encodeURIComponent(soql)}`;

    while (url) {
      const response = await fetchWithRetry(url, { headers: this.headers });
      const result: QueryResult<T> = await response.json();
      allRecords.push(...result.records);

      url = result.nextRecordsUrl
        ? `${this.instanceUrl}${result.nextRecordsUrl}`
        : '';
    }

    return allRecords;
  }

  /** Standard REST API query — use for Profile, standard objects */
  async restQuery<T>(soql: string): Promise<T[]> {
    const allRecords: T[] = [];
    let url = `${this.baseUrl}/query?q=${encodeURIComponent(soql)}`;

    while (url) {
      const response = await fetchWithRetry(url, { headers: this.headers });
      const result: QueryResult<T> = await response.json();
      allRecords.push(...result.records);

      url = result.nextRecordsUrl
        ? `${this.instanceUrl}${result.nextRecordsUrl}`
        : '';
    }

    return allRecords;
  }

  async describeObject(objectName: string): Promise<SObjectDescribe> {
    const url = `${this.baseUrl}/sobjects/${encodeURIComponent(objectName)}/describe`;
    const response = await fetchWithRetry(url, { headers: this.headers });
    return response.json();
  }

  async getObjectList(): Promise<SObjectListItem[]> {
    const url = `${this.baseUrl}/sobjects/`;
    const response = await fetchWithRetry(url, { headers: this.headers });
    const result = await response.json();

    return (result.sobjects as SObjectListItem[])
      .filter((obj) => obj.queryable)
      .map((obj) => ({
        name: obj.name,
        label: obj.label,
        custom: obj.custom,
        queryable: true,
      }));
  }
}
