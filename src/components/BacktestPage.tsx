import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    TradingView: any;
  }
}

export default function BacktestPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<any>(null);
  const scriptLoadedRef = useRef(false);
  const [symbol, setSymbol] = useState('BINANCE:BTCUSDT');
  const [timeframe, setTimeframe] = useState('1D');

  // 创建或更新 widget
  const createWidget = (currentSymbol: string, currentTimeframe: string) => {
    if (!containerRef.current || !window.TradingView) return;

    // 如果已存在 widget，先移除
    if (widgetRef.current) {
      try {
        widgetRef.current.remove();
      } catch (e) {
        console.error('移除旧 widget 失败:', e);
      }
      widgetRef.current = null;
    }

    // 创建新的 TradingView 图表
    try {
      widgetRef.current = new window.TradingView.widget({
        autosize: true,
        symbol: currentSymbol,
        interval: currentTimeframe,
        timezone: 'Asia/Shanghai',
        theme: 'dark',
        style: '1',
        locale: 'zh_CN',
        toolbar_bg: '#1A2029',
        enable_publishing: false,
        allow_symbol_change: true,
        container_id: containerRef.current,
        height: containerRef.current.offsetHeight || 600,
        width: '100%',
        hide_side_toolbar: false,
        withdateranges: true,
        range: '1M',
        save_image: false,
        studies: [
          'Volume@tv-basicstudies',
        ],
        show_popup_button: true,
        popup_width: '1000',
        popup_height: '650',
        no_referral_id: true,
        referral_id: '',
      });
    } catch (e) {
      console.error('创建 TradingView widget 失败:', e);
    }
  };

  // 加载 TradingView 脚本并创建 widget
  useEffect(() => {
    if (scriptLoadedRef.current) {
      // 脚本已加载，直接创建 widget
      createWidget(symbol, timeframe);
      return;
    }

    // 检查脚本是否已经存在
    const existingScript = document.querySelector('script[src="https://s3.tradingview.com/tv.js"]');
    if (existingScript) {
      scriptLoadedRef.current = true;
      // 等待一小段时间确保 TradingView 对象可用
      setTimeout(() => {
        createWidget(symbol, timeframe);
      }, 100);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = () => {
      scriptLoadedRef.current = true;
      createWidget(symbol, timeframe);
    };
    script.onerror = () => {
      console.error('TradingView 脚本加载失败');
    };
    document.head.appendChild(script);

    return () => {
      // 清理 widget
      if (widgetRef.current) {
        try {
          widgetRef.current.remove();
        } catch (e) {
          console.error('清理 TradingView widget 失败:', e);
        }
        widgetRef.current = null;
      }
    };
  }, [symbol, timeframe]);

  // 处理窗口大小变化
  useEffect(() => {
    const handleResize = () => {
      if (widgetRef.current && containerRef.current) {
        try {
          // TradingView widget 会自动调整大小，但我们可以手动触发
          const resizeEvent = new Event('resize');
          window.dispatchEvent(resizeEvent);
        } catch (e) {
          // 忽略错误
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-text-primary mb-2">回测</h1>
        <p className="text-sm text-text-secondary">
          查看交易图表和回测结果
        </p>
      </div>

      {/* 图表控制栏 */}
      <div className="mb-4 flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <label className="text-sm text-text-secondary">交易对:</label>
          <input
            type="text"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            placeholder="例如: BINANCE:BTCUSDT"
            className="px-3 py-1.5 bg-workspace-bg border border-accent-secondary rounded-md text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-accent-primary text-sm"
          />
        </div>
        <div className="flex items-center space-x-2">
          <label className="text-sm text-text-secondary">时间周期:</label>
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="px-3 py-1.5 bg-workspace-bg border border-accent-secondary rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-accent-primary text-sm"
          >
            <option value="1">1 分钟</option>
            <option value="5">5 分钟</option>
            <option value="15">15 分钟</option>
            <option value="30">30 分钟</option>
            <option value="60">1 小时</option>
            <option value="240">4 小时</option>
            <option value="1D">1 天</option>
            <option value="1W">1 周</option>
            <option value="1M">1 月</option>
          </select>
        </div>
      </div>

      {/* TradingView 图表容器 */}
      <div className="flex-1 bg-card-bg rounded-lg border border-border-default overflow-hidden">
        <div
          ref={containerRef}
          className="w-full h-full"
          style={{ minHeight: '600px' }}
        />
      </div>

      {/* 回测结果区域（占位） */}
      <div className="mt-6 bg-card-bg rounded-lg border border-border-default p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">回测结果</h2>
        <p className="text-text-secondary">回测功能开发中...</p>
      </div>
    </div>
  );
}
