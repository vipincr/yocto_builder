export type YoctoErrorType = 
  | 'PARSE_ERROR'
  | 'FETCH_ERROR'
  | 'COMPILE_ERROR'
  | 'PATCH_ERROR'
  | 'CONFIGURATION_ERROR'
  | 'DEPENDENCY_ERROR'
  | 'LICENSE_ERROR'
  | 'PACKAGE_ERROR'
  | 'UNKNOWN_ERROR';

export interface ErrorSummary {
  totalErrors: number;
  errors: Array<{
    type: YoctoErrorType;
    message: string;
    file?: string;
    recipe?: string;
  }>;
}

export type BuildStatus = 'PENDING' | 'QUEUED' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
export type BuildTrigger = 'MANUAL' | 'PUSH' | 'WEBHOOK' | 'RETRY';
export type YoctoVersion = 'KIRKSTONE' | 'SCARTHGAP' | 'STYHEAD';

export interface BuildQueuedEvent {
  buildId: string;
  branchId: string;
  projectId: string;
  buildNumber: number;
  position: number;
  timestamp: string;
}

export interface BuildStartedEvent {
  buildId: string;
  branchId: string;
  containerId: string;
  timestamp: string;
}

export interface BuildProgressEvent {
  buildId: string;
  phase: 'CLONE' | 'INIT' | 'PARSE' | 'BUILD' | 'PACKAGE' | 'IMAGE';
  message: string;
  progress?: number;
  timestamp: string;
}

export interface BuildLogEvent {
  buildId: string;
  line: string;
  lineNumber: number;
  stream: 'stdout' | 'stderr';
  timestamp: string;
  isError?: boolean;
  errorType?: YoctoErrorType;
}

export interface BuildErrorEvent {
  buildId: string;
  errorType: YoctoErrorType;
  message: string;
  file?: string;
  line?: number;
  recipe?: string;
  task?: string;
  timestamp: string;
}

export interface BuildCompletedEvent {
  buildId: string;
  status: 'SUCCESS' | 'FAILED';
  duration: number;
  artifactsPath?: string;
  errorSummary?: ErrorSummary;
  timestamp: string;
}

export interface BuildCancelledEvent {
  buildId: string;
  timestamp: string;
}

