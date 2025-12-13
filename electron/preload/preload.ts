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
    generate: (message: string, conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>, currentFileContent?: string) =>
      ipcRenderer.invoke('strategy:generate', message, conversationHistory, currentFileContent),
    generateStream: async function* (message: string, conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>, currentFileContent?: string) {
      const result = await ipcRenderer.invoke('strategy:generateStream', message, conversationHistory, currentFileContent);
      const channel = result.channel;
      
      // 使用 Promise 和事件监听器实现异步生成器
      let resolveNext: ((value: { value: any; done: boolean }) => void) | null = null;
      let queue: any[] = [];
      let done = false;
      
      const handler = (_: any, event: any) => {
        if (event.type === '__end__') {
          done = true;
          ipcRenderer.removeAllListeners(channel);
          if (resolveNext) {
            resolveNext({ value: undefined, done: true });
            resolveNext = null;
          }
        } else {
          queue.push(event);
          if (resolveNext) {
            resolveNext({ value: queue.shift(), done: false });
            resolveNext = null;
          }
        }
      };
      
      ipcRenderer.on(channel, handler);
      
      try {
        while (!done) {
          if (queue.length > 0) {
            yield queue.shift();
          } else {
            yield await new Promise<{ type: string; data: any }>((resolve) => {
              resolveNext = (value) => {
                if (value.done) {
                  resolve({ type: '__end__', data: {} });
                } else {
                  resolve(value.value);
                }
              };
            });
          }
        }
      } finally {
        ipcRenderer.removeAllListeners(channel);
      }
    },
    save: (strategy: any) =>
      ipcRenderer.invoke('strategy:save', strategy),
    list: () => ipcRenderer.invoke('strategy:list'),
    get: (id: string) => ipcRenderer.invoke('strategy:get', id),
    update: (id: string, updates: any) =>
      ipcRenderer.invoke('strategy:update', id, updates),
    delete: (id: string) => ipcRenderer.invoke('strategy:delete', id),
    getStrategiesDir: () => ipcRenderer.invoke('strategy:getStrategiesDir'),
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

  // 设置相关
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    save: (config: any) => ipcRenderer.invoke('settings:save', config),
    testConnection: (config: any) => ipcRenderer.invoke('settings:testConnection', config),
    getModels: (config: any) => ipcRenderer.invoke('settings:getModels', config),
    getStrategiesDir: () => ipcRenderer.invoke('settings:getStrategiesDir'),
    selectStrategiesDir: () => ipcRenderer.invoke('settings:selectStrategiesDir'),
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
    generate: (message: string, conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>, currentFileContent?: string) => Promise<any>;
    generateStream: (message: string, conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>, currentFileContent?: string) => AsyncGenerator<{ type: string; data: any }, void, unknown>;
    save: (strategy: any) => Promise<any>;
    list: () => Promise<any[]>;
    get: (id: string) => Promise<any>;
    update: (id: string, updates: any) => Promise<any>;
    delete: (id: string) => Promise<void>;
    getStrategiesDir: () => Promise<string>;
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
  settings: {
    get: () => Promise<any>;
    save: (config: any) => Promise<void>;
    testConnection: (config: any) => Promise<{ success: boolean; message: string }>;
    getModels: (config: any) => Promise<string[]>;
    getStrategiesDir: () => Promise<string>;
    selectStrategiesDir: () => Promise<{ success: boolean; path?: string; canceled?: boolean; message?: string }>;
  };
};

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
