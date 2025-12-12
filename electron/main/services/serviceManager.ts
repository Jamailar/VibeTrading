import { ipcMain } from 'electron';
import { AuthService } from './authService';
import { StrategyService } from './strategyService';
import { BacktestService } from './backtestService';
import { MarketDataService } from './marketDataService';
import { MarketResearchService } from './marketResearchService';

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
    // 初始化各个服务
    services = {
      auth: new AuthService(),
      strategy: new StrategyService(),
      backtest: new BacktestService(),
      marketData: new MarketDataService(),
      marketResearch: new MarketResearchService(),
    };

    // 注册 IPC 处理器
    registerIPCHandlers();

    console.log('[ServiceManager] 服务初始化完成');
  } catch (error) {
    console.error('[ServiceManager] 服务初始化失败:', error);
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
    return await services!.strategy.get(parseInt(id, 10));
  });

  ipcMain.handle('strategy:delete', async (event, id: string) => {
    return await services!.strategy.delete(parseInt(id, 10));
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
