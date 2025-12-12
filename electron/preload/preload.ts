import { contextBridge, ipcRenderer } from 'electron';

// 暴露受保护的方法给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 应用相关
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  quit: () => ipcRenderer.invoke('app:quit'),

  // 服务调用
  callService: (serviceName: string, method: string, ...args: any[]) =>
    ipcRenderer.invoke('service:call', serviceName, method, ...args),

  // 认证相关
  auth: {
    login: (username: string, password: string) =>
      ipcRenderer.invoke('auth:login', username, password),
    logout: () => ipcRenderer.invoke('auth:logout'),
    getCurrentUser: (token?: string) => ipcRenderer.invoke('auth:getCurrentUser', token),
  },

  // 策略相关
  strategy: {
    generate: (message: string) =>
      ipcRenderer.invoke('strategy:generate', message),
    save: (strategy: any) =>
      ipcRenderer.invoke('strategy:save', strategy),
    list: () => ipcRenderer.invoke('strategy:list'),
    get: (id: string) => ipcRenderer.invoke('strategy:get', id),
    delete: (id: string) => ipcRenderer.invoke('strategy:delete', id),
  },

  // 回测相关
  backtest: {
    run: (params: any) => ipcRenderer.invoke('backtest:run', params),
    get: (id: string) => ipcRenderer.invoke('backtest:get', id),
    list: () => ipcRenderer.invoke('backtest:list'),
  },

  // 市场数据相关
  market: {
    getData: (symbol: string, timeframe: string, startDate: string, endDate: string) =>
      ipcRenderer.invoke('market:getData', symbol, timeframe, startDate, endDate),
    getInsight: () => ipcRenderer.invoke('market:getInsight'),
  },
});

// TypeScript 类型定义（用于渲染进程）
export type ElectronAPI = {
  getVersion: () => Promise<string>;
  quit: () => Promise<void>;
  callService: (serviceName: string, method: string, ...args: any[]) => Promise<any>;
  auth: {
    login: (username: string, password: string) => Promise<any>;
    logout: () => Promise<void>;
    getCurrentUser: (token?: string) => Promise<any>;
  };
  strategy: {
    generate: (message: string) => Promise<any>;
    save: (strategy: any) => Promise<any>;
    list: () => Promise<any[]>;
    get: (id: string) => Promise<any>;
    delete: (id: string) => Promise<void>;
  };
  backtest: {
    run: (params: any) => Promise<any>;
    get: (id: string) => Promise<any>;
    list: () => Promise<any[]>;
  };
  market: {
    getData: (symbol: string, timeframe: string, startDate: string, endDate: string) => Promise<any>;
    getInsight: () => Promise<any>;
  };
};

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
