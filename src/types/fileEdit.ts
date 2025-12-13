export enum FileEditStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
}

export enum EditMode {
  SUGGESTION = 'suggestion', // 仅生成建议（需要用户确认）
  DIRECT = 'direct', // 直接编辑（仍需要用户确认）
  AUTO = 'auto', // 自动应用（可选，需要用户授权）
}

export interface FileEditSuggestion {
  id: string;
  originalContent: string;
  newContent: string;
  description?: string;
  timestamp: Date;
  status: FileEditStatus;
}

export interface DiffLine {
  value: string;
  added?: boolean;
  removed?: boolean;
  lineNumber?: number;
}

