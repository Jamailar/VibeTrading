import { useState } from 'react';

interface SidebarProps {
  activePage: string;
  onPageChange: (page: string) => void;
}

export default function Sidebar({ activePage, onPageChange }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  
  const menuItems = [
    { id: 'strategies', label: '策略', icon: '📊' },
    { id: 'factors', label: '因子', icon: '🔢' },
    { id: 'backtest', label: '回测', icon: '📈' },
    { id: 'market', label: '市场数据', icon: '💹' },
    { id: 'research', label: '市场研究', icon: '🔍' },
    { id: 'settings', label: '设置', icon: '⚙️' },
  ];

  return (
    <div className={`${collapsed ? 'w-16' : 'w-64'} bg-card-bg text-text-secondary flex flex-col h-screen border-r border-border-default transition-all duration-200`}>
      {/* Logo / Collapse Button */}
      <div className={`h-16 flex items-center ${collapsed ? 'justify-center' : 'justify-between'} px-4 border-b border-border-default`}>
        {!collapsed && <h1 className="text-xl font-bold text-text-primary">VibeTrading</h1>}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 rounded-md hover:bg-hover-bg text-text-secondary hover:text-text-primary transition-colors"
          title={collapsed ? '展开' : '折叠'}
        >
          <span className="text-lg">{collapsed ? '◀' : '▶'}</span>
        </button>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onPageChange(item.id)}
            className={`w-full flex items-center ${collapsed ? 'justify-center px-2' : 'px-3'} py-2 rounded-md text-sm font-medium transition-colors ${
              activePage === item.id
                ? 'bg-selected-bg text-text-primary'
                : 'text-text-secondary hover:bg-hover-bg hover:text-text-primary'
            }`}
            title={collapsed ? item.label : ''}
          >
            <span className={`${collapsed ? '' : 'mr-3'} text-lg`}>{item.icon}</span>
            {!collapsed && <span>{item.label}</span>}
          </button>
        ))}
      </nav>

    </div>
  );
}
