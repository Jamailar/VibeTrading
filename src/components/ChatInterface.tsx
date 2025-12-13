import { useState } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  strategyData?: any; // 策略生成结果
}

interface ChatInterfaceProps {
  onStrategyGenerated?: (strategyData: any) => void; // 策略生成后的回调
}

export default function ChatInterface({ onStrategyGenerated }: ChatInterfaceProps = {}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

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

      const response = await window.electronAPI.strategy.generate(currentInput, conversationHistory);

      // 构建策略数据对象
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
    } catch (error: any) {
      const errorMessage: Message = {
        role: 'assistant',
        content: `错误: ${error.message || '策略生成失败'}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
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
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                msg.role === 'user'
                  ? 'bg-accent-primary text-app-bg'
                  : 'bg-workspace-bg text-text-primary border border-border-default'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              <p className="text-xs mt-1 text-text-muted">
                {msg.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-workspace-bg rounded-lg px-4 py-2 border border-border-default">
              <p className="text-sm text-text-secondary">AI正在思考...</p>
            </div>
          </div>
        )}
      </div>
      
      <form onSubmit={handleSubmit} className="border-t border-border-default p-4">
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
