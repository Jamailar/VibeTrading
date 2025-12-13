import { useState } from 'react';

export interface ThinkingStep {
  id: string;
  node: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  message: string;
  timestamp: Date;
  details?: any;
}

interface ThinkingProcessProps {
  steps: ThinkingStep[];
  isVisible?: boolean;
}

export default function ThinkingProcess({ steps, isVisible = true }: ThinkingProcessProps) {
  const [expanded, setExpanded] = useState(true);

  if (!isVisible || steps.length === 0) {
    return null;
  }

  const getStatusIcon = (status: ThinkingStep['status']) => {
    switch (status) {
      case 'completed':
        return '✓';
      case 'processing':
        return '⏳';
      case 'error':
        return '✗';
      default:
        return '○';
    }
  };

  const getStatusColor = (status: ThinkingStep['status']) => {
    switch (status) {
      case 'completed':
        return 'text-trade-up';
      case 'processing':
        return 'text-accent-primary';
      case 'error':
        return 'text-trade-down';
      default:
        return 'text-text-muted';
    }
  };

  const getNodeDisplayName = (node: string) => {
    const nodeNames: Record<string, string> = {
      'intentRecognition': '识别意图',
      'strategyExtraction': '提取策略信息',
      'codeGeneration': '生成代码',
      'validation': '验证代码',
      'generateExplanation': '生成说明',
    };
    return nodeNames[node] || node;
  };

  return (
    <div className="bg-workspace-bg border border-border-default rounded-lg p-4 mb-4">
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center space-x-2">
          <span className="text-sm font-semibold text-text-primary">AI 思考过程</span>
          <span className="text-xs text-text-muted">({steps.length} 步)</span>
        </div>
        <span className="text-xs text-text-muted">
          {expanded ? '收起' : '展开'}
        </span>
      </div>

      {expanded && (
        <div className="mt-3 space-y-2">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className="flex items-start space-x-3 p-2 rounded-md hover:bg-hover-bg transition-colors"
            >
              <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${getStatusColor(step.status)}`}>
                {getStatusIcon(step.status)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-text-primary">
                    步骤 {index + 1}: {getNodeDisplayName(step.node)}
                  </span>
                  <span className="text-xs text-text-muted">
                    {step.timestamp.toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-sm text-text-secondary mt-1">{step.message}</p>
                {step.details && (
                  <div className="mt-2 text-xs text-text-muted bg-card-bg p-2 rounded border border-border-default">
                    <pre className="whitespace-pre-wrap font-mono">
                      {typeof step.details === 'string' ? step.details : JSON.stringify(step.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

