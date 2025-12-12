"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// 暴露受保护的方法给渲染进程
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    // 应用相关
    getVersion: () => electron_1.ipcRenderer.invoke('app:getVersion'),
    quit: () => electron_1.ipcRenderer.invoke('app:quit'),
    // 服务调用
    callService: (serviceName, method, ...args) => electron_1.ipcRenderer.invoke('service:call', serviceName, method, ...args),
    // 认证相关
    auth: {
        login: (username, password) => electron_1.ipcRenderer.invoke('auth:login', username, password),
        logout: () => electron_1.ipcRenderer.invoke('auth:logout'),
        getCurrentUser: (token) => electron_1.ipcRenderer.invoke('auth:getCurrentUser', token),
    },
    // 策略相关
    strategy: {
        generate: (message) => electron_1.ipcRenderer.invoke('strategy:generate', message),
        save: (strategy) => electron_1.ipcRenderer.invoke('strategy:save', strategy),
        list: () => electron_1.ipcRenderer.invoke('strategy:list'),
        get: (id) => electron_1.ipcRenderer.invoke('strategy:get', id),
        delete: (id) => electron_1.ipcRenderer.invoke('strategy:delete', id),
    },
    // 回测相关
    backtest: {
        run: (params) => electron_1.ipcRenderer.invoke('backtest:run', params),
        get: (id) => electron_1.ipcRenderer.invoke('backtest:get', id),
        list: () => electron_1.ipcRenderer.invoke('backtest:list'),
    },
    // 市场数据相关
    market: {
        getData: (symbol, timeframe, startDate, endDate) => electron_1.ipcRenderer.invoke('market:getData', symbol, timeframe, startDate, endDate),
        getInsight: () => electron_1.ipcRenderer.invoke('market:getInsight'),
    },
});
//# sourceMappingURL=preload.js.map