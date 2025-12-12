import { useState, useEffect } from 'react';
import ChatInterface from './ChatInterface';

interface StrategyEditorProps {
  strategyId?: string; // 改为字符串（文件名）
  onBack: () => void;
}

export default function StrategyEditor({ strategyId, onBack }: StrategyEditorProps) {
  const [strategy, setStrategy] = useState<any>(null);
  const [loading, setLoading] = useState(!!strategyId);
  const [saving, setSaving] = useState(false);
  const [jsonContent, setJsonContent] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [strategiesDir, setStrategiesDir] = useState<string>('');

  useEffect(() => {
    if (strategyId) {
      loadStrategy();
    } else {
      // 新建策略，初始化空内容
      setStrategy({
        name: '',
        description: '',
        strategy: {},
        code: '',
        explanation: '',
      });
      setJsonContent(JSON.stringify({
        name: '',
        description: '',
        strategy: {},
        code: '',
        explanation: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, null, 2));
      setLoading(false);
    }
    loadStrategiesDir();
  }, [strategyId]);

  async function loadStrategiesDir() {
    try {
      if (!window.electronAPI) return;
      const dir = await window.electronAPI.strategy.getStrategiesDir();
      setStrategiesDir(dir);
    } catch (error) {
      console.error('获取策略文件夹路径失败:', error);
    }
  }

  async function loadStrategy() {
    if (!strategyId) return;

    try {
      setLoading(true);
      if (!window.electronAPI) {
        throw new Error('Electron API 不可用');
      }
      const data = await window.electronAPI.strategy.get(strategyId);
      setStrategy(data);
      setJsonContent(JSON.stringify(data, null, 2));
    } catch (error: any) {
      console.error('加载策略失败:', error);
      alert(`加载策略失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  function handleJsonChange(value: string) {
    setJsonContent(value);
    setJsonError(null);

    // 验证 JSON 格式
    try {
      JSON.parse(value);
    } catch (e: any) {
      setJsonError(e.message);
    }
  }

  async function handleSave() {
    if (jsonError) {
      alert('JSON 格式错误，请先修复');
      return;
    }

    try {
      let parsedContent;
      try {
        parsedContent = JSON.parse(jsonContent);
      } catch (e: any) {
        alert(`JSON 格式错误: ${e.message}`);
        return;
      }

      setSaving(true);

      if (!window.electronAPI) {
        throw new Error('Electron API 不可用');
      }

      if (strategyId) {
        // 更新现有策略
        await window.electronAPI.strategy.update(strategyId, {
          content: parsedContent,
        });
        alert('策略已保存');
      } else {
        // 保存新策略
        const result = await window.electronAPI.strategy.save(parsedContent);
        alert('策略已保存');
        // 可以在这里触发重新加载列表或导航
      }
    } catch (error: any) {
      console.error('保存策略失败:', error);
      alert(`保存策略失败: ${error.message}`);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-text-secondary">加载中...</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">
            {strategyId ? '编辑策略' : '新建策略'}
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            {strategyId ? '编辑策略 JSON 文件' : '创建新的策略 JSON 文件'}
          </p>
          {strategiesDir && (
            <p className="mt-1 text-xs text-text-muted">
              策略文件保存在: {strategiesDir}
            </p>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleSave}
            disabled={saving || !!jsonError}
            className="px-4 py-2 bg-accent-primary text-app-bg rounded-md hover:bg-trade-focus focus:outline-none focus:ring-2 focus:ring-accent-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? '保存中...' : '保存'}
          </button>
          <button
            onClick={onBack}
            className="px-4 py-2 bg-workspace-bg border border-accent-secondary text-text-secondary rounded-md hover:bg-hover-bg hover:text-text-primary transition-colors"
          >
            返回列表
          </button>
        </div>
      </div>

      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* JSON 编辑器 */}
        <div className="flex-1 flex flex-col bg-card-bg rounded-lg border border-border-default overflow-hidden">
          <div className="p-4 border-b border-border-default flex items-center justify-between">
            <h2 className="text-lg font-semibold text-text-primary">策略 JSON</h2>
            {jsonError && (
              <span className="text-sm text-trade-down">JSON 格式错误</span>
            )}
          </div>
          <div className="flex-1 overflow-hidden relative">
            <textarea
              value={jsonContent}
              onChange={(e) => handleJsonChange(e.target.value)}
              className="w-full h-full p-4 bg-workspace-bg text-text-primary font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-accent-primary"
              spellCheck={false}
              placeholder="输入策略 JSON 内容..."
            />
            {jsonError && (
              <div className="absolute bottom-4 left-4 right-4 p-3 bg-trade-down/20 border border-trade-down rounded-md">
                <p className="text-sm text-trade-down">{jsonError}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
