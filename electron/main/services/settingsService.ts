import { ipcMain, app, dialog } from 'electron';
import { getServices } from './serviceManager';
import { createLLM } from '../../../services/ai-worker/services/llm';
import { query, run } from '../database/duckdb';
import path from 'path';
import axios from 'axios';

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
    if (strategiesDirSettings.length > 0 && strategiesDirSettings[0].value) {
      currentStrategiesDir = strategiesDirSettings[0].value as string;
      console.log('[Settings] 从数据库加载策略文件夹路径:', currentStrategiesDir);
    } else {
      // 使用默认路径（用户文档目录下的 VibeTrading/strategies）
      const documentsPath = app.getPath('documents');
      currentStrategiesDir = path.join(documentsPath, 'VibeTrading', 'strategies');
      console.log('[Settings] 使用默认策略文件夹路径:', currentStrategiesDir);
      // 将默认路径保存到数据库，这样用户可以看到默认值
      try {
        await run(
          `INSERT INTO settings (key, value) VALUES (?, ?)
           ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
          ['strategies_dir', currentStrategiesDir]
        );
        console.log('[Settings] 默认策略文件夹路径已保存到数据库');
      } catch (error) {
        console.warn('[Settings] 保存默认策略文件夹路径失败（不影响使用）:', error);
      }
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
  // 如果没有设置，使用默认路径（用户文档目录下的 VibeTrading/strategies）
  const documentsPath = app.getPath('documents');
  const defaultPath = path.join(documentsPath, 'VibeTrading', 'strategies');
  // 确保默认路径被设置到 currentStrategiesDir，这样下次调用时可以直接返回
  currentStrategiesDir = defaultPath;
  return defaultPath;
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
        `INSERT INTO settings (key, value) VALUES (?, ?)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
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
          `INSERT INTO settings (key, value) VALUES (?, ?)
           ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
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
      // 检查数据库表是否存在
      try {
        await query('SELECT 1 FROM settings LIMIT 1');
      } catch (error) {
        console.error('[Settings] settings 表不存在或无法访问:', error);
        throw new Error('数据库表未初始化，请重启应用');
      }

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
        `INSERT INTO settings (key, value) VALUES (?, ?)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
        ['ai_config', configJson]
      );
      
      console.log('[Settings] 设置已保存到数据库:', { ...config, apiKey: '***' });
      
      // 重新初始化 StrategyService 的 AI Worker（如果存在）
      try {
        const { getServices } = require('./serviceManager');
        const services = getServices();
        if (services && services.strategy) {
          services.strategy.initializeAIWorker();
          console.log('[Settings] StrategyService AI Worker 已重新初始化');
        }
      } catch (reinitError) {
        console.warn('[Settings] 重新初始化 StrategyService AI Worker 失败（不影响设置保存）:', reinitError);
      }
      
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
      
      let models: string[] = [];
      
      // 尝试从 API 获取模型列表（支持 OpenAI 兼容的 API）
      try {
        // 构建 API base URL
        let apiBase = config.baseURL || '';
        
        // 根据提供商设置默认 base URL
        if (!apiBase) {
          switch (config.provider) {
            case 'openai':
              apiBase = 'https://api.openai.com/v1';
              break;
            case 'anthropic':
              apiBase = 'https://api.anthropic.com/v1';
              break;
            case 'google':
              apiBase = 'https://generativelanguage.googleapis.com/v1';
              break;
          }
        }
        
        // 确保 baseURL 格式正确（对于 OpenAI 兼容的 API，需要 /v1 路径）
        let baseUrl = apiBase;
        if (config.provider === 'openai' || !config.baseURL) {
          // 对于 OpenAI 或未指定 baseURL 的情况，确保有 /v1 路径
          if (!baseUrl.endsWith('/v1') && !baseUrl.endsWith('/v1/')) {
            baseUrl = baseUrl.replace(/\/$/, '') + '/v1';
          }
        }
        
        // 尝试从 OpenAI 兼容的 /v1/models 端点获取模型列表
        // 这适用于所有使用 OpenAI 兼容协议的 API 提供商
        const response = await axios.get(`${baseUrl}/models`, {
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
          },
          timeout: 10000, // 10秒超时
        });
        
        if (response.data && response.data.data) {
          const data = response.data as { data?: Array<{ id: string }> };
          // 获取所有模型 ID，不进行过滤，让用户看到所有可用模型
          const allModels = data.data
            ?.map((model) => model.id)
            ?.sort() || [];
          
          if (allModels.length > 0) {
            models = allModels;
            console.log('[Settings] 从 API 获取到', models.length, '个模型');
          }
        }
      } catch (apiError: any) {
        // API 可能不支持 /v1/models 端点，这是正常的
        console.log('[Settings] 从 API 获取模型列表失败（API 可能不支持此端点）:', apiError.message || apiError);
        // 返回空数组，让用户手动输入模型名
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
