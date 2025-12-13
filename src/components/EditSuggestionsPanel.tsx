import { FileEditSuggestion, FileEditStatus } from '../types/fileEdit';
import DiffView from './DiffView';

interface EditSuggestionsPanelProps {
  suggestions: FileEditSuggestion[];
  onAccept: (suggestion: FileEditSuggestion) => void;
  onReject: (suggestion: FileEditSuggestion) => void;
}

export default function EditSuggestionsPanel({
  suggestions,
  onAccept,
  onReject,
}: EditSuggestionsPanelProps) {
  const pendingSuggestions = suggestions.filter(
    (s) => s.status === FileEditStatus.PENDING
  );

  if (pendingSuggestions.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-text-secondary text-sm">暂无编辑建议</p>
          <p className="text-text-muted text-xs mt-2">
            在 AI 对话中请求修改策略时，编辑建议会显示在这里
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border-default">
        <h3 className="text-lg font-semibold text-text-primary">编辑建议</h3>
        <p className="text-xs text-text-muted mt-1">
          {pendingSuggestions.length} 个待处理建议
        </p>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {pendingSuggestions.map((suggestion) => (
          <div
            key={suggestion.id}
            className="bg-card-bg border border-border-default rounded-lg p-4 space-y-3"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-text-muted">
                    {suggestion.timestamp.toLocaleTimeString()}
                  </span>
                  {suggestion.description && (
                    <span className="text-xs text-text-secondary">
                      {suggestion.description}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <DiffView
                originalContent={suggestion.originalContent}
                newContent={suggestion.newContent}
                maxHeight={300}
              />
            </div>

            <div className="flex space-x-2 pt-2 border-t border-border-default">
              <button
                onClick={() => onAccept(suggestion)}
                className="flex-1 px-3 py-2 bg-accent-primary text-app-bg rounded-md hover:bg-trade-focus focus:outline-none focus:ring-2 focus:ring-accent-primary transition-colors text-sm font-medium"
              >
                接受
              </button>
              <button
                onClick={() => onReject(suggestion)}
                className="flex-1 px-3 py-2 bg-workspace-bg border border-accent-secondary text-text-secondary rounded-md hover:bg-hover-bg hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-secondary transition-colors text-sm font-medium"
              >
                拒绝
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

