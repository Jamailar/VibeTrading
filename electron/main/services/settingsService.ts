import { ipcMain, app, dialog } from 'electron';
import { getServices } from './serviceManager';
import { createLLM } from '../../../services/ai-worker/services/llm';
import { query, run } from '../database/duckdb';
import path from 'path';

interface AIConfig {
  provider: 'openai' | 'anthropic' | 'google';
  apiKey: string;
  baseURL: string;
  chatModel: string;
  thinkingModel: string;
}

interface AppSettings {
  aiConfig: AIConfig;
  strategiesDir?: string; // 策略文件夹路径
}

// 缓存当前设置
let currentSettings: AIConfig | null = null;
let currentStrategiesDir: string | null = null;

export async function initializeSettingsService() {
  try {
    // 从数据库加载 AI 配置
    const settings = await query('SELECT value FROM settings WHERE key = ?', ['ai_config']);
    
    if (settings.length > 0) {
      const config = JSON.parse(settings[0].value as string);
      currentSettings = config;
      
      // 更新环境变量
      process.env.LLM_PROVIDER = config.provider;
      process.env[`${config.provider.toUpperCase()}_API_KEY`] = config.apiKey;
      if (config.baseURL) {
        process.env[`${config.provider.toUpperCase()}_API_BASE`] = config.baseURL;
      }
      process.env.LLM_MODEL = config.chatModel;
      process.env.LLM_THINKING_MODEL = config.thinkingModel;
      
      console.log('[Settings] 从数据库加载 AI 设置成功');
    } else {
      // 从环境变量加载默认设置
      const defaultProvider = (process.env.LLM_PROVIDER || 'openai') as 'openai' | 'anthropic' | 'google';
      currentSettings = {
        provider: defaultProvider,
        apiKey: process.env[`${defaultProvider.toUpperCase()}_API_KEY`] || '',
        baseURL: process.env[`${defaultProvider.toUpperCase()}_API_BASE`] || '',
        chatModel: process.env.LLM_MODEL || '',
        thinkingModel: process.env.LLM_THINKING_MODEL || process.env.LLM_MODEL || '',
      };
      console.log('[Settings] 使用环境变量默认 AI 设置');
    }

    // 从数据库加载策略文件夹路径
    const strategiesDirSettings = await query('SELECT value FROM settings WHERE key = ?', ['strategies_dir']);
    if (strategiesDirSettings.length > 0) {
      currentStrategiesDir = strategiesDirSettings[0].value as string;
      console.log('[Settings] 从数据库加载策略文件夹路径:', currentStrategiesDir);
    } else {
      // 使用默认路径（用户文档目录下的 VibeTrading/strategies）
      const documentsPath = app.getPath('documents');
      currentStrategiesDir = path.join(documentsPath, 'VibeTrading', 'strategies');
      console.log('[Settings] 使用默认策略文件夹路径:', currentStrategiesDir);
    }
  } catch (error) {
    console.error('[Settings] 初始化设置失败:', error);
    // 使用环境变量默认设置
    const defaultProvider = (process.env.LLM_PROVIDER || 'openai') as 'openai' | 'anthropic' | 'google';
    currentSettings = {
      provider: defaultProvider,
      apiKey: process.env[`${defaultProvider.toUpperCase()}_API_KEY`] || '',
      baseURL: process.env[`${defaultProvider.toUpperCase()}_API_BASE`] || '',
      chatModel: process.env.LLM_MODEL || '',
      thinkingModel: process.env.LLM_THINKING_MODEL || process.env.LLM_MODEL || '',
    };
    // 使用默认策略文件夹路径
    const documentsPath = app.getPath('documents');
    currentStrategiesDir = path.join(documentsPath, 'VibeTrading', 'strategies');
  }
}

// 获取策略文件夹路径
export function getStrategiesDir(): string {
  if (currentStrategiesDir) {
    return currentStrategiesDir;
  }
  // 如果没有设置，使用默认路径
  const documentsPath = app.getPath('documents');
  return path.join(documentsPath, 'VibeTrading', 'strategies');
}

export function registerSettingsHandlers() {
  // 获取 AI 设置
  ipcMain.handle('settings:get', async () => {
    return currentSettings;
  });

  // 获取策略文件夹路径
  ipcMain.handle('settings:getStrategiesDir', async () => {
    // 确保返回有效的路径，如果没有设置则返回默认路径
    const dir = getStrategiesDir();
    // 确保目录存在
    const fs = require('fs');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  });

  // 设置策略文件夹路径
  ipcMain.handle('settings:setStrategiesDir', async (event, dirPath: string) => {
    try {
      // 验证路径是否存在且可写
      const fs = require('fs');
      if (!fs.existsSync(dirPath)) {
        // 尝试创建目录
        fs.mkdirSync(dirPath, { recursive: true });
      }
      
      // 保存到数据库
      await run(
        'INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
        ['strategies_dir', dirPath]
      );
      
      currentStrategiesDir = dirPath;
      
      // 更新策略服务的文件夹路径
      const { getServices } = require('./serviceManager');
      const services = getServices();
      if (services && services.strategy) {
        services.strategy.updateStrategiesDir(dirPath);
      }
      
      console.log('[Settings] 策略文件夹路径已保存:', dirPath);
      
      return { success: true };
    } catch (error: any) {
      console.error('[Settings] 保存策略文件夹路径失败:', error);
      return { success: false, message: error.message || '保存失败' };
    }
  });

  // 选择策略文件夹（打开文件夹选择对话框）
  ipcMain.handle('settings:selectStrategiesDir', async (event) => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory'],
        title: '选择策略文件夹',
        defaultPath: currentStrategiesDir || app.getPath('documents'),
      });

      if (!result.canceled && result.filePaths.length > 0) {
        const selectedPath = result.filePaths[0];
        // 自动保存选中的路径
        await run(
          'INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
          ['strategies_dir', selectedPath]
        );
        currentStrategiesDir = selectedPath;
        
        // 更新策略服务的文件夹路径
        const { getServices } = require('./serviceManager');
        const services = getServices();
        if (services && services.strategy) {
          services.strategy.updateStrategiesDir(selectedPath);
        }
        
        console.log('[Settings] 策略文件夹路径已更新:', selectedPath);
        return { success: true, path: selectedPath };
      }

      return { success: false, canceled: true };
    } catch (error: any) {
      console.error('[Settings] 选择策略文件夹失败:', error);
      return { success: false, message: error.message || '选择失败' };
    }
  });

  // 保存设置
  ipcMain.handle('settings:save', async (event, config: AIConfig) => {
    try {
      currentSettings = config;
      
      // 更新环境变量（用于当前会话）
      process.env.LLM_PROVIDER = config.provider;
      process.env[`${config.provider.toUpperCase()}_API_KEY`] = config.apiKey;
      if (config.baseURL) {
        process.env[`${config.provider.toUpperCase()}_API_BASE`] = config.baseURL;
      } else {
        delete process.env[`${config.provider.toUpperCase()}_API_BASE`];
      }
      process.env.LLM_MODEL = config.chatModel;
      process.env.LLM_THINKING_MODEL = config.thinkingModel;
      
      // 保存到数据库
      const configJson = JSON.stringify(config);
      await run(
        'INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
        ['ai_config', configJson]
      );
      
      console.log('[Settings] 设置已保存到数据库:', { ...config, apiKey: '***' });
      
      return { success: true };
    } catch (error: any) {
      console.error('[Settings] 保存设置失败:', error);
      return { success: false, message: error.message || '保存失败' };
    }
  });

  // 测试连接
  ipcMain.handle('settings:testConnection', async (event, config: AIConfig) => {
    try {
      // 临时设置环境变量
      const originalProvider = process.env.LLM_PROVIDER;
      const originalApiKey = process.env[`${config.provider.toUpperCase()}_API_KEY`];
      const originalBaseURL = process.env[`${config.provider.toUpperCase()}_API_BASE`];
      
      process.env.LLM_PROVIDER = config.provider;
      process.env[`${config.provider.toUpperCase()}_API_KEY`] = config.apiKey;
      if (config.baseURL) {
        process.env[`${config.provider.toUpperCase()}_API_BASE`] = config.baseURL;
      } else {
        delete process.env[`${config.provider.toUpperCase()}_API_BASE`];
      }
      
      // 尝试创建 LLM 实例并调用
      const llm = createLLM();
      const response = await llm.invoke('Hello');
      
      // 恢复原始环境变量
      if (originalProvider) process.env.LLM_PROVIDER = originalProvider;
      if (originalApiKey) process.env[`${config.provider.toUpperCase()}_API_KEY`] = originalApiKey;
      if (originalBaseURL) process.env[`${config.provider.toUpperCase()}_API_BASE`] = originalBaseURL;
      
      return {
        success: true,
        message: '连接成功！',
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || '连接失败',
      };
    }
  });

  // 获取模型列表
  ipcMain.handle('settings:getModels', async (event, config: AIConfig) => {
    try {
      // 临时设置环境变量
      const originalProvider = process.env.LLM_PROVIDER;
      const originalApiKey = process.env[`${config.provider.toUpperCase()}_API_KEY`];
      const originalBaseURL = process.env[`${config.provider.toUpperCase()}_API_BASE`];
      
      process.env.LLM_PROVIDER = config.provider;
      process.env[`${config.provider.toUpperCase()}_API_KEY`] = config.apiKey;
      if (config.baseURL) {
        process.env[`${config.provider.toUpperCase()}_API_BASE`] = config.baseURL;
      } else {
        delete process.env[`${config.provider.toUpperCase()}_API_BASE`];
      }
      
      // 根据提供商返回模型列表
      let models: string[] = [];
      
      switch (config.provider) {
        case 'openai':
          models = [
            'gpt-4o',
            'gpt-4o-mini',
            'gpt-4-turbo',
            'gpt-4',
            'gpt-3.5-turbo',
          ];
          break;
        case 'anthropic':
          models = [
            'claude-3-5-sonnet-20241022',
            'claude-3-5-sonnet-20240620',
            'claude-3-opus-20240229',
            'claude-3-sonnet-20240229',
            'claude-3-haiku-20240307',
          ];
          break;
        case 'google':
          models = [
            'gemini-1.5-pro',
            'gemini-1.5-flash',
            'gemini-pro',
          ];
          break;
      }
      
      // 恢复原始环境变量
      if (originalProvider) process.env.LLM_PROVIDER = originalProvider;
      if (originalApiKey) process.env[`${config.provider.toUpperCase()}_API_KEY`] = originalApiKey;
      if (originalBaseURL) process.env[`${config.provider.toUpperCase()}_API_BASE`] = originalBaseURL;
      
      return models;
    } catch (error: any) {
      console.error('[Settings] 获取模型列表失败:', error);
      return [];
    }
  });
}
