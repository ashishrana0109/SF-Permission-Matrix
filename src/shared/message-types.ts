export interface SfPageDetectedMessage {
  type: 'SF_PAGE_DETECTED';
  instanceUrl: string;
}

export interface SessionInfoRequest {
  type: 'SESSION_INFO_REQUEST';
}

export interface SessionInfoResponse {
  type: 'SESSION_INFO_RESPONSE';
  sessionId: string | null;
  instanceUrl: string | null;
  orgId: string | null;
}

export interface SessionInfo {
  sessionId: string;
  instanceUrl: string;
  orgId: string;
  timestamp: number;
}

export type ExtensionMessage =
  | SfPageDetectedMessage
  | SessionInfoRequest
  | SessionInfoResponse;
