import { useState, useRef } from 'react';
import Sidebar from './Sidebar';
import ChatInterface from './ChatInterface';
import Settings from './Settings';
import StrategyList from './StrategyList';
import StrategyEditor, { StrategyEditorRef } from './StrategyEditor';
import BacktestPage from './BacktestPage';
import { FileEditSuggestion } from '../types/fileEdit';

interface MainLayoutProps {
  onLogout?: () => void;
}

type StrategyView = 'list' | 'new' | 'edit';

export default function MainLayout({ onLogout }: MainLayoutProps = {}) {
  const [activePage, setActivePage] = useState('strategies');
  const [strategyView, setStrategyView] = useState<StrategyView>('list');
  const [editingStrategyId, setEditingStrategyId] = useState<string | null>(null);
  const [generatedStrategyData, setGeneratedStrategyData] = useState<any>(null);
  const [editSuggestion, setEditSuggestion] = useState<FileEditSuggestion | null>(null);
  const editorRef = useRef<StrategyEditorRef>(null);

  const handleNewStrategy = () => {
    setStrategyView('new');
    setEditingStrategyId(null);
  };

  const handleEditStrategy = (id: string) => {
    setStrategyView('edit');
    setEditingStrategyId(id);
  };

  const handleBackToList = () => {
    setStrategyView('list');
    setEditingStrategyId(null);
  };

  const renderContent = () => {
    switch (activePage) {
      case 'strategies':
        if (strategyView === 'list') {
          return (
            <StrategyList
              onNewStrategy={handleNewStrategy}
              onEditStrategy={handleEditStrategy}
            />
          );
        } else {
          return (
            <StrategyEditor
              ref={editorRef}
              strategyId={editingStrategyId || undefined}
              onBack={handleBackToList}
              generatedStrategyData={generatedStrategyData}
              onStrategyDataConsumed={() => setGeneratedStrategyData(null)}
              editSuggestion={editSuggestion}
            />
          );
        }
      case 'factors':
        return (
          <div className="h-full">
            <h1 className="text-3xl font-bold text-text-primary mb-6">因子</h1>
            <div className="bg-card-bg rounded-lg p-6 border border-border-default">
              <p className="text-text-secondary">因子功能开发中...</p>
            </div>
          </div>
        );
      case 'backtest':
        return <BacktestPage />;
      case 'market':
        return (
          <div className="h-full">
            <h1 className="text-3xl font-bold text-text-primary mb-6">市场数据</h1>
            <div className="bg-card-bg rounded-lg p-6 border border-border-default">
              <p className="text-text-secondary">市场数据功能开发中...</p>
            </div>
          </div>
        );
      case 'research':
        return (
          <div className="h-full">
            <h1 className="text-3xl font-bold text-text-primary mb-6">市场研究</h1>
            <div className="bg-card-bg rounded-lg p-6 border border-border-default">
              <p className="text-text-secondary">市场研究功能开发中...</p>
            </div>
          </div>
        );
      case 'settings':
        return <Settings />;
      default:
        return null;
    }
  };

  // 切换页面时重置策略视图
  const handlePageChange = (page: string) => {
    setActivePage(page);
    if (page !== 'strategies') {
      setStrategyView('list');
      setEditingStrategyId(null);
    }
  };

  return (
    <div className="h-screen flex bg-app-bg">
      {/* Left Sidebar */}
      <Sidebar
        activePage={activePage}
        onPageChange={handlePageChange}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden bg-workspace-bg">
        {/* Top Bar */}
        <div className="h-16 bg-card-bg border-b border-border-default flex items-center justify-between px-6">
          <div className="flex items-center">
            <h2 className="text-lg font-semibold text-text-primary">
              {activePage === 'strategies' && (
                strategyView === 'list' ? '策略' : (strategyView === 'new' ? '新建策略' : '编辑策略')
              )}
              {activePage === 'factors' && '因子'}
              {activePage === 'backtest' && '回测'}
              {activePage === 'market' && '市场数据'}
              {activePage === 'research' && '市场研究'}
              {activePage === 'settings' && '设置'}
            </h2>
          </div>
          <div className="flex items-center space-x-4">
            {onLogout && (
              <button
                onClick={onLogout}
                className="text-sm text-text-secondary hover:text-text-primary px-3 py-2 rounded-md hover:bg-hover-bg transition-colors"
              >
                登出
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {renderContent()}
        </div>
      </div>

      {/* Right Sidebar - Chat Interface (只在新建/编辑策略时显示) */}
      {activePage === 'strategies' && (strategyView === 'new' || strategyView === 'edit') && (
        <div className="w-96 bg-card-bg border-l border-border-default flex flex-col">
          <div className="p-4 border-b border-border-default">
            <h3 className="text-lg font-semibold text-text-primary">AI 对话</h3>
            <p className="text-xs text-text-muted mt-1">与 AI 对话创建交易策略</p>
          </div>
          <div className="flex-1 overflow-hidden">
            <ChatInterface 
              onStrategyGenerated={(strategyData) => {
                setGeneratedStrategyData(strategyData);
              }}
              onEditSuggestion={(suggestion) => {
                setEditSuggestion(suggestion);
              }}
              getCurrentFileContent={() => {
                return editorRef.current?.getCurrentContent() || null;
              }}
            />
          </div>
        </div>
      )}

    </div>
  );
}
