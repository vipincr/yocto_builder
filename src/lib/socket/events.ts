import type {
  BuildQueuedEvent,
  BuildStartedEvent,
  BuildProgressEvent,
  BuildLogEvent,
  BuildErrorEvent,
  BuildCompletedEvent,
  BuildCancelledEvent,
  YoctoErrorType,
  ErrorSummary,
} from '@/types/build';

// Server -> Client Events
export interface ServerToClientEvents {
  // Build lifecycle events
  'build:queued': (data: BuildQueuedEvent) => void;
  'build:started': (data: BuildStartedEvent) => void;
  'build:progress': (data: BuildProgressEvent) => void;
  'build:log': (data: BuildLogEvent) => void;
  'build:error': (data: BuildErrorEvent) => void;
  'build:completed': (data: BuildCompletedEvent) => void;
  'build:cancelled': (data: BuildCancelledEvent) => void;
  
  // Connection events
  'error': (data: { message: string; code?: string }) => void;
}

// Client -> Server Events
export interface ClientToServerEvents {
  // Subscribe to build logs
  'build:subscribe': (buildId: string) => void;
  'build:unsubscribe': (buildId: string) => void;
  
  // Subscribe to project updates
  'project:subscribe': (projectId: string) => void;
  'project:unsubscribe': (projectId: string) => void;
}

export type {
  BuildQueuedEvent,
  BuildStartedEvent,
  BuildProgressEvent,
  BuildLogEvent,
  BuildErrorEvent,
  BuildCompletedEvent,
  BuildCancelledEvent,
  YoctoErrorType,
  ErrorSummary,
};

