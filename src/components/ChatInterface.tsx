import { useState } from 'react';
import { FileEditSuggestion, EditMode } from '../types/fileEdit';
import ThinkingProcess, { ThinkingStep } from './ThinkingProcess';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  strategyData?: any; // 策略生成结果
  fileEditSuggestion?: FileEditSuggestion; // 文件编辑建议
  thinkingSteps?: ThinkingStep[]; // AI思考步骤
}

interface ChatInterfaceProps {
  onStrategyGenerated?: (strategyData: any) => void; // 策略生成后的回调
  onEditSuggestion?: (suggestion: FileEditSuggestion) => void; // 编辑建议回调
  getCurrentFileContent?: () => string | null; // 获取当前文件内容的函数
}

export default function ChatInterface({ onStrategyGenerated, onEditSuggestion, getCurrentFileContent }: ChatInterfaceProps = {}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentThinkingSteps, setCurrentThinkingSteps] = useState<ThinkingStep[]>([]);
  const [streamingContent, setStreamingContent] = useState('');
  const [editMode, setEditMode] = useState<EditMode>(EditMode.SUGGESTION);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setLoading(true);

    try {
      if (!window.electronAPI) {
        throw new Error('Electron API 不可用');
      }

      // 构建对话历史（排除最后一条用户消息，因为已经添加到 messages 了）
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      // 获取当前文件内容（如果存在）
      const currentFileContent = getCurrentFileContent ? getCurrentFileContent() : undefined;
      
      // 初始化思考步骤
      setCurrentThinkingSteps([]);
      setStreamingContent('');

      // 尝试使用流式生成
      try {
        if ((window.electronAPI.strategy as any).generateStream) {
          await handleStreamingGenerate(currentInput, conversationHistory, currentFileContent);
          return;
        }
      } catch (error) {
        console.warn('流式生成失败，回退到普通模式:', error);
      }

      // 回退到普通模式
      const response = await window.electronAPI.strategy.generate(
        currentInput, 
        conversationHistory,
        currentFileContent || undefined
      );

      // 检查是否有编辑建议
      if (response.data?.fileEditSuggestion) {
        const editSuggestion: FileEditSuggestion = {
          ...response.data.fileEditSuggestion,
          timestamp: new Date(response.data.fileEditSuggestion.timestamp || Date.now()),
        };

        const assistantMessage: Message = {
          role: 'assistant',
          content: response.data.explanation || '已生成编辑建议，请在右侧面板查看并选择接受或拒绝。',
          timestamp: new Date(),
          fileEditSuggestion: editSuggestion,
        };

        setMessages(prev => [...prev, assistantMessage]);

        // 传递编辑建议给父组件
        if (onEditSuggestion) {
          onEditSuggestion(editSuggestion);
        }
      } else {
        // 构建策略数据对象（原有逻辑）
        const strategyData = {
          name: response.data?.strategy?.name || `策略_${new Date().toISOString().slice(0, 10)}`,
          description: response.data?.strategy?.description || '',
          strategy: response.data?.strategy || {},
          code: response.data?.code || '',
          explanation: response.data?.explanation || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        // 构建完整的回复内容
        let content = '';
        if (response.data?.explanation) {
          content = response.data.explanation;
        } else {
          content = '策略生成成功！';
        }

        if (response.data?.code) {
          content += '\n\n策略代码已生成，已自动填充到编辑器中。';
        }

        const assistantMessage: Message = {
          role: 'assistant',
          content: content,
          timestamp: new Date(),
          strategyData: strategyData, // 保存策略数据
        };

        setMessages(prev => [...prev, assistantMessage]);

        // 如果有回调函数，调用它来更新编辑器
        if (onStrategyGenerated && strategyData) {
          onStrategyGenerated(strategyData);
        }
      }
    } catch (error: any) {
      const errorMessage: Message = {
        role: 'assistant',
        content: `错误: ${error.message || '策略生成失败'}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      setCurrentThinkingSteps([]);
      setStreamingContent('');
    }
  }

  async function handleStreamingGenerate(
    currentInput: string,
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
    currentFileContent?: string | null
  ) {
    const steps: ThinkingStep[] = [];
    let finalResult: any = null;
    let accumulatedContent = '';

    try {
      // 创建新的助手消息用于流式更新
      const assistantMessageId = messages.length;
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        thinkingSteps: [],
      }]);

      for await (const event of (window.electronAPI.strategy as any).generateStream(
        currentInput,
        conversationHistory,
        currentFileContent || undefined
      )) {
        if (event.type === 'thinking') {
          const step: ThinkingStep = {
            id: `step_${Date.now()}_${steps.length}`,
            node: event.data.step || 'thinking',
            status: 'processing',
            message: event.data.message || event.data.step,
            timestamp: new Date(),
            details: event.data.details,
          };
          steps.push(step);
          setCurrentThinkingSteps([...steps]);
        } else if (event.type === 'node_end') {
          const nodeName = event.data.node;
          const existingStepIndex = steps.findIndex(s => s.node === nodeName);
          if (existingStepIndex >= 0) {
            steps[existingStepIndex].status = 'completed';
            steps[existingStepIndex].details = event.data.state;
          } else {
            steps.push({
              id: `step_${Date.now()}_${steps.length}`,
              node: nodeName,
              status: 'completed',
              message: `完成: ${nodeName}`,
              timestamp: new Date(),
              details: event.data.state,
            });
          }
          setCurrentThinkingSteps([...steps]);
        } else if (event.type === 'final_result') {
          finalResult = event.data;
          accumulatedContent = event.data.explanation || '处理完成';
          setStreamingContent(accumulatedContent);
        } else if (event.type === 'error') {
          throw new Error(event.data.message || '生成失败');
        }
      }

      // 更新最终消息
      setMessages(prev => {
        const updated = [...prev];
        updated[assistantMessageId] = {
          role: 'assistant',
          content: accumulatedContent,
          timestamp: new Date(),
          thinkingSteps: steps,
          ...(finalResult?.fileEditSuggestion && {
            fileEditSuggestion: {
              ...finalResult.fileEditSuggestion,
              timestamp: new Date(finalResult.fileEditSuggestion.timestamp || Date.now()),
            },
          }),
          ...(finalResult?.strategy && {
            strategyData: {
              name: finalResult.strategy?.name || `策略_${new Date().toISOString().slice(0, 10)}`,
              description: finalResult.strategy?.description || '',
              strategy: finalResult.strategy || {},
              code: finalResult.code || '',
              explanation: finalResult.explanation || '',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          }),
        };
        return updated;
      });

      // 处理编辑建议
      if (finalResult?.fileEditSuggestion && onEditSuggestion) {
        onEditSuggestion({
          ...finalResult.fileEditSuggestion,
          timestamp: new Date(finalResult.fileEditSuggestion.timestamp || Date.now()),
        });
      }

      // 处理策略数据
      if (finalResult?.strategy && onStrategyGenerated) {
        onStrategyGenerated({
          name: finalResult.strategy?.name || `策略_${new Date().toISOString().slice(0, 10)}`,
          description: finalResult.strategy?.description || '',
          strategy: finalResult.strategy || {},
          code: finalResult.code || '',
          explanation: finalResult.explanation || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    } catch (error: any) {
      throw error;
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-text-muted mt-8">
            <p className="text-text-secondary">开始对话，描述您的交易策略想法</p>
            <p className="text-sm mt-2 text-text-muted">例如："当BTC价格突破20日均线时买入，跌破10日均线时卖出"</p>
            <p className="text-xs mt-3 text-text-muted">AI 将使用 LangChain 生成策略代码并自动填充到左侧编辑器</p>
          </div>
        )}
        {messages.map((msg, idx) => (
          <div key={idx} className="space-y-2">
            <div
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  msg.role === 'user'
                    ? 'bg-accent-primary text-app-bg'
                    : 'bg-workspace-bg text-text-primary border border-border-default'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.content || streamingContent}</p>
                <p className="text-xs mt-1 text-text-muted">
                  {msg.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </div>
            {msg.thinkingSteps && msg.thinkingSteps.length > 0 && (
              <ThinkingProcess steps={msg.thinkingSteps} />
            )}
          </div>
        ))}
        {loading && (
          <div className="space-y-2">
            <div className="flex justify-start">
              <div className="bg-workspace-bg rounded-lg px-4 py-2 border border-border-default">
                <p className="text-sm text-text-secondary">
                  {streamingContent || 'AI正在思考...'}
                </p>
              </div>
            </div>
            {currentThinkingSteps.length > 0 && (
              <ThinkingProcess steps={currentThinkingSteps} />
            )}
          </div>
        )}
      </div>
      
      <form onSubmit={handleSubmit} className="border-t border-border-default p-4 space-y-3">
        {/* 编辑模式选择 */}
        <div className="flex items-center space-x-2">
          <span className="text-xs text-text-muted">编辑模式:</span>
          <select
            value={editMode}
            onChange={(e) => setEditMode(e.target.value as EditMode)}
            className="text-xs px-2 py-1 bg-workspace-bg border border-accent-secondary rounded text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
            disabled={loading}
          >
            <option value={EditMode.SUGGESTION}>建议模式（需确认）</option>
            <option value={EditMode.DIRECT}>直接编辑（需确认）</option>
            <option value={EditMode.AUTO}>自动应用</option>
          </select>
        </div>
        
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="输入您的策略想法..."
            className="flex-1 px-4 py-2 bg-workspace-bg border border-accent-secondary rounded-md text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-accent-primary"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-6 py-2 bg-accent-primary text-app-bg rounded-md hover:bg-trade-focus focus:outline-none focus:ring-2 focus:ring-accent-primary disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-text-disabled disabled:text-text-muted"
          >
            发送
          </button>
        </div>
      </form>
    </div>
  );
}
