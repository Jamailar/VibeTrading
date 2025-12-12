import Navigation from './Navigation';
import ChatInterface from './ChatInterface';

interface MainLayoutProps {
  onLogout: () => void;
}

export default function MainLayout({ onLogout }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation onLogout={onLogout} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">策略创建</h1>
          <p className="mt-2 text-sm text-gray-600">
            通过对话描述您的交易策略想法，AI将为您生成可执行的策略代码
          </p>
        </div>
        <ChatInterface />
      </main>
    </div>
  );
}
