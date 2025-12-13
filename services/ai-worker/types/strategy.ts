export interface StrategyCondition {
  type: 'indicator' | 'price' | 'volume' | 'custom';
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'cross';
  value: number | string;
  indicator?: string;
  params?: Record<string, any>;
}

export interface Strategy {
  name: string;
  description: string;
  assets: string[];
  timeframe: string;
  indicators: Array<{
    name: string;
    params: Record<string, any>;
  }>;
  entryConditions: StrategyCondition[];
  exitConditions: StrategyCondition[];
  stopLoss?: number;
  takeProfit?: number;
  positionSize?: number;
}

export interface FileEditSuggestion {
  id: string;
  originalContent: string;
  newContent: string;
  description?: string;
  timestamp: number;
}

export interface StrategyGenerationResult {
  strategy?: Strategy;
  code?: string;
  explanation: string;
  validation?: {
    isValid: boolean;
    errors?: string[];
    warnings?: string[];
  };
  fileEditSuggestion?: FileEditSuggestion; // 文件编辑建议（如果存在，则优先使用）
}
