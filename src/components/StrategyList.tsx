import { useState, useEffect } from 'react';

interface Strategy {
  id: string; // 改为字符串（文件名）
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

interface StrategyListProps {
  onNewStrategy: () => void;
  onEditStrategy: (id: number) => void;
}

export default function StrategyList({ onNewStrategy, onEditStrategy }: StrategyListProps) {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    loadStrategies();
  }, []);

  async function loadStrategies() {
    try {
      setLoading(true);
      if (!window.electronAPI) {
        throw new Error('Electron API 不可用');
      }
      const data = await window.electronAPI.strategy.list();
      setStrategies(data);
    } catch (error: any) {
      console.error('加载策略列表失败:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleRename(id: string, newName: string) {
    if (!newName.trim()) return;

    try {
      if (!window.electronAPI) {
        throw new Error('Electron API 不可用');
      }
      await window.electronAPI.strategy.update(id.toString(), { name: newName.trim() });
      setEditingId(null);
      await loadStrategies();
    } catch (error: any) {
      console.error('重命名失败:', error);
      alert(`重命名失败: ${error.message}`);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('确定要删除这个策略吗？')) return;

    try {
      setDeletingId(id);
      if (!window.electronAPI) {
        throw new Error('Electron API 不可用');
      }
      await window.electronAPI.strategy.delete(id.toString());
      await loadStrategies();
    } catch (error: any) {
      console.error('删除失败:', error);
      alert(`删除失败: ${error.message}`);
    } finally {
      setDeletingId(null);
    }
  }

  function startEdit(id: string, currentName: string) {
    setEditingId(id);
    setEditingName(currentName);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingName('');
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-text-secondary">加载中...</p>
      </div>
    );
  }

  return (
    <div className="h-full">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">策略</h1>
          <p className="mt-2 text-sm text-text-secondary">
            管理您的交易策略
          </p>
        </div>
        <button
          onClick={onNewStrategy}
          className="px-4 py-2 bg-accent-primary text-app-bg rounded-md hover:bg-trade-focus focus:outline-none focus:ring-2 focus:ring-accent-primary transition-colors"
        >
          新建策略
        </button>
      </div>

      {strategies.length === 0 ? (
        <div className="bg-card-bg rounded-lg border border-border-default p-12 text-center">
          <p className="text-text-secondary mb-4">还没有创建任何策略</p>
          <button
            onClick={onNewStrategy}
            className="px-4 py-2 bg-accent-primary text-app-bg rounded-md hover:bg-trade-focus focus:outline-none focus:ring-2 focus:ring-accent-primary transition-colors"
          >
            创建第一个策略
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {strategies.map((strategy) => (
            <div
              key={strategy.id}
              className="bg-card-bg rounded-lg border border-border-default p-4 hover:border-accent-primary transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {editingId === strategy.id ? (
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleRename(strategy.id, editingName);
                          } else if (e.key === 'Escape') {
                            cancelEdit();
                          }
                        }}
                        className="flex-1 px-3 py-1 bg-workspace-bg border border-accent-secondary rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-accent-primary"
                        autoFocus
                      />
                      <button
                        onClick={() => handleRename(strategy.id, editingName)}
                        className="px-3 py-1 text-sm bg-accent-primary text-app-bg rounded-md hover:bg-trade-focus transition-colors"
                      >
                        保存
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="px-3 py-1 text-sm bg-workspace-bg border border-accent-secondary text-text-secondary rounded-md hover:bg-hover-bg transition-colors"
                      >
                        取消
                      </button>
                    </div>
                  ) : (
                    <h3 className="text-lg font-semibold text-text-primary mb-1">
                      {strategy.name}
                    </h3>
                  )}
                  {strategy.description && (
                    <p className="text-sm text-text-secondary mb-2">
                      {strategy.description}
                    </p>
                  )}
                  <div className="flex items-center space-x-4 text-xs text-text-muted">
                    <span>创建: {new Date(strategy.created_at).toLocaleString('zh-CN')}</span>
                    {strategy.updated_at !== strategy.created_at && (
                      <span>更新: {new Date(strategy.updated_at).toLocaleString('zh-CN')}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  {editingId !== strategy.id && (
                    <>
                      <button
                        onClick={() => startEdit(strategy.id, strategy.name)}
                        className="px-3 py-1 text-sm bg-workspace-bg border border-accent-secondary text-text-secondary rounded-md hover:bg-hover-bg hover:text-text-primary transition-colors"
                        title="重命名"
                      >
                        重命名
                      </button>
                      <button
                        onClick={() => onEditStrategy(strategy.id)}
                        className="px-3 py-1 text-sm bg-accent-primary text-app-bg rounded-md hover:bg-trade-focus transition-colors"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => handleDelete(strategy.id)}
                        disabled={deletingId === strategy.id}
                        className="px-3 py-1 text-sm bg-workspace-bg border border-trade-down text-trade-down rounded-md hover:bg-trade-down hover:text-app-bg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="删除"
                      >
                        {deletingId === strategy.id ? '删除中...' : '删除'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
