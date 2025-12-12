"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeServices = initializeServices;
exports.getServices = getServices;
const electron_1 = require("electron");
const authService_1 = require("./authService");
const strategyService_1 = require("./strategyService");
const backtestService_1 = require("./backtestService");
const marketDataService_1 = require("./marketDataService");
const marketResearchService_1 = require("./marketResearchService");
let services = null;
async function initializeServices() {
    console.log('[ServiceManager] 初始化服务...');
    try {
        // 初始化各个服务
        services = {
            auth: new authService_1.AuthService(),
            strategy: new strategyService_1.StrategyService(),
            backtest: new backtestService_1.BacktestService(),
            marketData: new marketDataService_1.MarketDataService(),
            marketResearch: new marketResearchService_1.MarketResearchService(),
        };
        // 注册 IPC 处理器
        registerIPCHandlers();
        console.log('[ServiceManager] 服务初始化完成');
    }
    catch (error) {
        console.error('[ServiceManager] 服务初始化失败:', error);
        throw error;
    }
}
function registerIPCHandlers() {
    if (!services)
        return;
    // 认证相关
    electron_1.ipcMain.handle('auth:login', async (event, username, password) => {
        return await services.auth.login(username, password);
    });
    electron_1.ipcMain.handle('auth:logout', async () => {
        return await services.auth.logout();
    });
    electron_1.ipcMain.handle('auth:getCurrentUser', async (event, token) => {
        return await services.auth.getCurrentUser(token);
    });
    // 策略相关
    electron_1.ipcMain.handle('strategy:generate', async (event, message) => {
        return await services.strategy.generate(message);
    });
    electron_1.ipcMain.handle('strategy:save', async (event, strategy) => {
        return await services.strategy.save(strategy);
    });
    electron_1.ipcMain.handle('strategy:list', async () => {
        return await services.strategy.list();
    });
    electron_1.ipcMain.handle('strategy:get', async (event, id) => {
        return await services.strategy.get(parseInt(id, 10));
    });
    electron_1.ipcMain.handle('strategy:delete', async (event, id) => {
        return await services.strategy.delete(parseInt(id, 10));
    });
    // 回测相关
    electron_1.ipcMain.handle('backtest:run', async (event, params) => {
        return await services.backtest.run(params);
    });
    electron_1.ipcMain.handle('backtest:get', async (event, id) => {
        return await services.backtest.get(parseInt(id, 10));
    });
    electron_1.ipcMain.handle('backtest:list', async () => {
        return await services.backtest.list();
    });
    // 市场数据相关
    electron_1.ipcMain.handle('market:getData', async (event, symbol, timeframe, startDate, endDate) => {
        return await services.marketData.getData(symbol, timeframe, startDate, endDate);
    });
    electron_1.ipcMain.handle('market:getInsight', async () => {
        return await services.marketResearch.getInsight();
    });
}
function getServices() {
    return services;
}
//# sourceMappingURL=serviceManager.js.map