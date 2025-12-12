import { ipcMain } from 'electron';
import { AuthService } from './authService';
import { StrategyService } from './strategyService';
import { BacktestService } from './backtestService';
import { MarketDataService } from './marketDataService';
import { MarketResearchService } from './marketResearchService';
import { initializeSettingsService, registerSettingsHandlers } from './settingsService';

let services: {
  auth: AuthService;
  strategy: StrategyService;
  backtest: BacktestService;
  marketData: MarketDataService;
  marketResearch: MarketResearchService;
} | null = null;

export async function initializeServices() {
  console.log('[ServiceManager] 初始化服务...');

  try {
    // 初始化设置服务（需要先初始化数据库）
    console.log('[ServiceManager] 初始化设置服务...');
    await initializeSettingsService();
    console.log('[ServiceManager] 设置服务初始化完成');
    
    // 初始化各个服务
    console.log('[ServiceManager] 初始化策略服务...');
    const strategyService = new StrategyService();
    console.log('[ServiceManager] 策略服务初始化完成');
    
    console.log('[ServiceManager] 初始化其他服务...');
    services = {
      auth: new AuthService(),
      strategy: strategyService,
      backtest: new BacktestService(),
      marketData: new MarketDataService(),
      marketResearch: new MarketResearchService(),
    };
    console.log('[ServiceManager] 所有服务实例创建完成');

    // 注册 IPC 处理器
    console.log('[ServiceManager] 注册 IPC 处理器...');
    registerIPCHandlers();
    registerSettingsHandlers();
    console.log('[ServiceManager] IPC 处理器注册完成');

    console.log('[ServiceManager] 服务初始化完成');
  } catch (error) {
    console.error('[ServiceManager] 服务初始化失败:', error);
    console.error('[ServiceManager] 错误堆栈:', error instanceof Error ? error.stack : String(error));
    throw error;
  }
}

function registerIPCHandlers() {
  if (!services) return;

  // 认证相关
  ipcMain.handle('auth:login', async (event, username: string, password: string) => {
    return await services!.auth.login(username, password);
  });

  ipcMain.handle('auth:logout', async () => {
    return await services!.auth.logout();
  });

  ipcMain.handle('auth:getCurrentUser', async (event, token?: string) => {
    return await services!.auth.getCurrentUser(token);
  });

  // 策略相关
  ipcMain.handle('strategy:generate', async (event, message: string) => {
    return await services!.strategy.generate(message);
  });

  ipcMain.handle('strategy:save', async (event, strategy: any) => {
    return await services!.strategy.save(strategy);
  });

  ipcMain.handle('strategy:list', async () => {
    return await services!.strategy.list();
  });

  ipcMain.handle('strategy:get', async (event, id: string) => {
    return await services!.strategy.get(id);
  });

  ipcMain.handle('strategy:update', async (event, id: string, updates: any) => {
    return await services!.strategy.update(id, updates);
  });

  ipcMain.handle('strategy:delete', async (event, id: string) => {
    return await services!.strategy.delete(id);
  });

  ipcMain.handle('strategy:getStrategiesDir', async () => {
    return services!.strategy.getStrategiesDir();
  });

  // 回测相关
  ipcMain.handle('backtest:run', async (event, params: any) => {
    return await services!.backtest.run(params);
  });

  ipcMain.handle('backtest:get', async (event, id: string) => {
    return await services!.backtest.get(parseInt(id, 10));
  });

  ipcMain.handle('backtest:list', async () => {
    return await services!.backtest.list();
  });

  // 市场数据相关
  ipcMain.handle('market:getData', async (
    event,
    symbol: string,
    timeframe: string,
    startDate: string,
    endDate: string
  ) => {
    return await services!.marketData.getData(symbol, timeframe, startDate, endDate);
  });

  ipcMain.handle('market:getInsight', async () => {
    return await services!.marketResearch.getInsight();
  });
}

export function getServices() {
  return services;
}
