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
  if (!services) {
    console.error('[ServiceManager] 服务未初始化，无法注册 IPC handlers');
    return;
  }

  console.log('[ServiceManager] 开始注册 IPC handlers...');

  // 认证相关
  ipcMain.handle('auth:login', async (event, username: string, password: string) => {
    return await services!.auth.login(username, password);
  });
  console.log('[ServiceManager] 已注册: auth:login');

  ipcMain.handle('auth:logout', async () => {
    return await services!.auth.logout();
  });
  console.log('[ServiceManager] 已注册: auth:logout');

  ipcMain.handle('auth:getCurrentUser', async (event, token?: string) => {
    return await services!.auth.getCurrentUser(token);
  });
  console.log('[ServiceManager] 已注册: auth:getCurrentUser');

  // 策略相关
  ipcMain.handle('strategy:generate', async (event, message: string, conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>) => {
    return await services!.strategy.generate(message, conversationHistory || []);
  });
  console.log('[ServiceManager] 已注册: strategy:generate');

  ipcMain.handle('strategy:save', async (event, strategy: any) => {
    console.log('[ServiceManager] 收到 strategy:save 请求');
    try {
      const result = await services!.strategy.save(strategy);
      console.log('[ServiceManager] strategy:save 成功');
      return result;
    } catch (error: any) {
      console.error('[ServiceManager] strategy:save 失败:', error);
      throw error;
    }
  });
  console.log('[ServiceManager] 已注册: strategy:save');

  ipcMain.handle('strategy:list', async () => {
    return await services!.strategy.list();
  });
  console.log('[ServiceManager] 已注册: strategy:list');

  ipcMain.handle('strategy:get', async (event, id: string) => {
    return await services!.strategy.get(id);
  });
  console.log('[ServiceManager] 已注册: strategy:get');

  ipcMain.handle('strategy:update', async (event, id: string, updates: any) => {
    return await services!.strategy.update(id, updates);
  });
  console.log('[ServiceManager] 已注册: strategy:update');

  ipcMain.handle('strategy:delete', async (event, id: string) => {
    return await services!.strategy.delete(id);
  });
  console.log('[ServiceManager] 已注册: strategy:delete');

  ipcMain.handle('strategy:getStrategiesDir', async () => {
    return services!.strategy.getStrategiesDir();
  });
  console.log('[ServiceManager] 已注册: strategy:getStrategiesDir');

  // 回测相关
  ipcMain.handle('backtest:run', async (event, params: any) => {
    return await services!.backtest.run(params);
  });
  console.log('[ServiceManager] 已注册: backtest:run');

  ipcMain.handle('backtest:get', async (event, id: string) => {
    return await services!.backtest.get(parseInt(id, 10));
  });
  console.log('[ServiceManager] 已注册: backtest:get');

  ipcMain.handle('backtest:list', async () => {
    return await services!.backtest.list();
  });
  console.log('[ServiceManager] 已注册: backtest:list');

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
  console.log('[ServiceManager] 已注册: market:getData');

  ipcMain.handle('market:getInsight', async () => {
    return await services!.marketResearch.getInsight();
  });
  console.log('[ServiceManager] 已注册: market:getInsight');

  console.log('[ServiceManager] 所有 IPC handlers 注册完成');
}

export function getServices() {
  return services;
}
