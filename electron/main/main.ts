import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';

console.log('Electron main started');
console.log('[Main] NODE_ENV:', process.env.NODE_ENV);
console.log('[Main] app.isPackaged:', app.isPackaged);

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// 延迟导入，避免初始化时出错
let initializeServices: any;
let initializeDatabase: any;

try {
  console.log('[Main] 开始导入模块...');
  const serviceManager = require('./services/serviceManager');
  console.log('[Main] serviceManager 导入成功');
  const duckdb = require('./database/duckdb');
  console.log('[Main] duckdb 导入成功');
  initializeServices = serviceManager.initializeServices;
  initializeDatabase = duckdb.initializeDatabase;
  console.log('[Main] 模块导入成功');
} catch (error: any) {
  console.error('[Main] 模块导入失败:', error);
  console.error('[Main] 错误详情:', error?.message);
  console.error('[Main] 错误堆栈:', error?.stack);
}

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  console.log('[Main] 开始创建窗口...');
  
  // 计算 preload 路径
  // __dirname 在编译后是 dist-electron/electron/main
  // preload 在 dist-electron/electron/preload/preload.js
  const preloadPath = path.join(__dirname, '../preload/preload.js');
  console.log('[Main] preload path:', preloadPath);
  console.log('[Main] preload path exists:', require('fs').existsSync(preloadPath));
  
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webSecurity: false, // 开发模式下禁用 web 安全，避免 CSP 问题
    },
    titleBarStyle: 'default',
    show: true,
  });

  if (isDev) {
    const devUrl = 'http://localhost:5173';
    console.log('[Main] 加载开发 URL:', devUrl);
    mainWindow.loadURL(devUrl).catch((error) => {
      console.error('[Main] 加载 URL 失败:', error);
    });
    mainWindow.webContents.openDevTools();
    
    // 监听页面加载事件
    mainWindow.webContents.on('did-finish-load', () => {
      console.log('[Main] 页面加载完成');
    });
    
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
      console.error('[Main] 页面加载失败:', errorCode, errorDescription, validatedURL);
    });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    console.log('[Main] 窗口准备就绪，显示窗口');
    mainWindow?.show();
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('[Main] 窗口加载失败:', errorCode, errorDescription);
  });

  mainWindow.webContents.on('console-message', (event, level, message) => {
    console.log(`[Renderer ${level}]:`, message);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

process.on('uncaughtException', (error) => {
  console.error('[Main] 未捕获的异常:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Main] 未处理的 Promise 拒绝:', reason);
});

app.whenReady().then(async () => {
  console.log('[Main] Electron 应用准备就绪');
  
  try {
    // 先初始化数据库和服务，再创建窗口，确保 IPC handlers 已经注册
    console.log('[Main] 开始初始化数据库...');
    if (initializeDatabase) {
      await initializeDatabase();
      console.log('[Main] 数据库初始化完成');
    } else {
      console.warn('[Main] initializeDatabase 未定义，跳过数据库初始化');
    }
    
    console.log('[Main] 开始初始化服务...');
    if (initializeServices) {
      await initializeServices();
      console.log('[Main] 服务初始化完成');
      
      // 验证关键 handlers 是否已注册
      try {
        // 尝试获取已注册的 handlers 列表（通过检查内部状态）
        console.log('[Main] 验证 IPC handlers 注册状态...');
        // 注意：这里只是日志记录，实际的 handler 注册在 serviceManager 中完成
        console.log('[Main] IPC handlers 应该已经通过 serviceManager 注册');
      } catch (error) {
        console.error('[Main] 验证 handlers 时出错:', error);
      }
    } else {
      console.error('[Main] 错误: initializeServices 未定义，无法初始化服务');
      throw new Error('initializeServices 未定义');
    }
    
    // 服务初始化完成后再创建窗口
    console.log('[Main] 创建窗口...');
    createWindow();
    console.log('[Main] 窗口创建完成');
  } catch (error) {
    console.error('[Main] 初始化失败:', error);
    console.error('[Main] 错误堆栈:', error instanceof Error ? error.stack : String(error));
    // 即使初始化失败，也创建窗口以便显示错误信息
    if (!mainWindow) {
      createWindow();
    }
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('app:getVersion', () => {
  return app.getVersion();
});

ipcMain.handle('app:quit', () => {
  app.quit();
});

ipcMain.handle('service:call', async (event, serviceName: string, method: string, ...args: any[]) => {
  return null;
});
