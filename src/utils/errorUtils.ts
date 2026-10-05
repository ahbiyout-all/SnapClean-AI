export enum OperationType {
  SCAN = 'scan',
  INDEX = 'index',
  DB_WRITE = 'db_write',
  DB_READ = 'db_read',
}

export interface ProcessorErrorInfo {
  error: string;
  operationType: OperationType;
  details?: any;
  timestamp: number;
}

export function createErrorPayload(error: unknown, operationType: OperationType, details?: any): ProcessorErrorInfo {
  return {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    details,
    timestamp: Date.now()
  };
}
