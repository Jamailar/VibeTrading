import { useMemo } from 'react';
import { diffLines } from 'diff';

interface DiffViewProps {
  originalContent: string;
  newContent: string;
  maxHeight?: number;
}

export default function DiffView({ originalContent, newContent, maxHeight = 400 }: DiffViewProps) {
  const diff = useMemo(() => {
    return diffLines(originalContent, newContent);
  }, [originalContent, newContent]);

  let lineNumber = 1;
  const lines: Array<{ type: 'added' | 'removed' | 'unchanged'; content: string; lineNumber?: number }> = [];

  diff.forEach((part) => {
    const content = part.value;
    const linesInPart = content.split('\n');
    
    // 移除最后一个空行（如果存在）
    if (linesInPart.length > 1 && linesInPart[linesInPart.length - 1] === '') {
      linesInPart.pop();
    }

    linesInPart.forEach((line) => {
      if (part.added) {
        lines.push({ type: 'added', content: line, lineNumber: lineNumber++ });
      } else if (part.removed) {
        lines.push({ type: 'removed', content: line, lineNumber: undefined });
      } else {
        lines.push({ type: 'unchanged', content: line, lineNumber: lineNumber++ });
      }
    });
  });

  return (
    <div 
      className="font-mono text-sm border border-border-default rounded-md overflow-auto bg-workspace-bg"
      style={{ maxHeight: `${maxHeight}px` }}
    >
      {lines.map((line, index) => (
        <div
          key={index}
          className={`flex px-2 py-0.5 ${
            line.type === 'added'
              ? 'bg-trade-up/20 text-trade-up'
              : line.type === 'removed'
              ? 'bg-trade-down/20 text-trade-down'
              : 'text-text-secondary'
          }`}
        >
          <span className="w-12 text-right pr-2 text-text-muted select-none">
            {line.lineNumber || ' '}
          </span>
          <span className="flex-1">
            {line.type === 'removed' && <span className="text-trade-down">- </span>}
            {line.type === 'added' && <span className="text-trade-up">+ </span>}
            {line.content || ' '}
          </span>
        </div>
      ))}
      {lines.length === 0 && (
        <div className="px-2 py-4 text-center text-text-muted">
          无更改
        </div>
      )}
    </div>
  );
}

