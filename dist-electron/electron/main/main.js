"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
// 先输出日志，确保代码执行
console.log('[Main] 主进程文件已加载');
console.log('[Main] NODE_ENV:', process.env.NODE_ENV);
console.log('[Main] app.isPackaged:', electron_1.app.isPackaged);
// 获取应用路径
const isDev = process.env.NODE_ENV === 'development' || !electron_1.app.isPackaged;
// 延迟导入，避免初始化时出错
let initializeServices;
let initializeDatabase;
try {
    const serviceManager = require('./services/serviceManager');
    const duckdb = require('./database/duckdb');
    initializeServices = serviceManager.initializeServices;
    initializeDatabase = duckdb.initializeDatabase;
    console.log('[Main] 模块导入成功');
}
catch (error) {
    console.error('[Main] 模块导入失败:', error);
}
// 保持对窗口对象的全局引用
let mainWindow = null;
function createWindow() {
    console.log('[Main] 开始创建窗口...');
    // 创建浏览器窗口
    mainWindow = new electron_1.BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1200,
        minHeight: 700,
        webPreferences: {
            preload: path_1.default.join(__dirname, '../preload/preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: false,
        },
        titleBarStyle: 'default',
        show: true, // 立即显示窗口，方便调试
    });
    // 加载应用
    if (isDev) {
        mainWindow.loadURL('http://localhost:5173');
        // 开发模式下打开开发者工具
        mainWindow.webContents.openDevTools();
    }
    else {
        // 生产模式：从打包后的 dist 目录加载
        mainWindow.loadFile(path_1.default.join(__dirname, '../../dist/index.html'));
    }
    // 窗口准备好后显示
    mainWindow.once('ready-to-show', () => {
        console.log('[Main] 窗口准备就绪，显示窗口');
        mainWindow?.show();
    });
    // 监听窗口加载错误
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        console.error('[Main] 窗口加载失败:', errorCode, errorDescription);
    });
    // 监听控制台消息
    mainWindow.webContents.on('console-message', (event, level, message) => {
        console.log(`[Renderer ${level}]:`, message);
    });
    // 当窗口被关闭时
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}
// 添加未捕获异常处理
process.on('uncaughtException', (error) => {
    console.error('[Main] 未捕获的异常:', error);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('[Main] 未处理的 Promise 拒绝:', reason);
});
// Electron 初始化完成后创建窗口
electron_1.app.whenReady().then(async () => {
    console.log('[Main] Electron 应用准备就绪');
    try {
        // 先创建窗口，再初始化服务
        console.log('[Main] 创建窗口...');
        createWindow();
        console.log('[Main] 窗口创建完成');
        // 初始化数据库
        console.log('[Main] 开始初始化数据库...');
        if (initializeDatabase) {
            await initializeDatabase();
            console.log('[Main] 数据库初始化完成');
        }
        else {
            console.warn('[Main] initializeDatabase 未定义，跳过数据库初始化');
        }
        // 初始化服务
        console.log('[Main] 开始初始化服务...');
        if (initializeServices) {
            await initializeServices();
            console.log('[Main] 服务初始化完成');
        }
        else {
            console.warn('[Main] initializeServices 未定义，跳过服务初始化');
        }
    }
    catch (error) {
        console.error('[Main] 初始化失败:', error);
        console.error('[Main] 错误堆栈:', error instanceof Error ? error.stack : String(error));
        // 即使初始化失败，窗口应该已经创建
    }
    electron_1.app.on('activate', () => {
        // 在 macOS 上，当点击 dock 图标并且没有其他窗口打开时，
        // 通常在应用程序中重新创建一个窗口。
        if (electron_1.BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});
// 当所有窗口都被关闭时退出应用
electron_1.app.on('window-all-closed', () => {
    // 在 macOS 上，除非用户用 Cmd + Q 确定地退出，
    // 否则绝大部分应用程序及其菜单栏会保持激活。
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
// IPC 处理程序
electron_1.ipcMain.handle('app:getVersion', () => {
    return electron_1.app.getVersion();
});
electron_1.ipcMain.handle('app:quit', () => {
    electron_1.app.quit();
});
// 处理服务相关的 IPC 调用
electron_1.ipcMain.handle('service:call', async (event, serviceName, method, ...args) => {
    // 这里会转发到对应的服务
    // 具体实现见 serviceManager
    return null;
});
//# sourceMappingURL=main.js.map