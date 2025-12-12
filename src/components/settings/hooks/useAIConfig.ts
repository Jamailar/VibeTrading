import { useState, useEffect } from 'react';
import { AIConfig, TestResult } from '../types';

export function useAIConfig() {
  const [config, setConfig] = useState<AIConfig>({
    provider: 'openai',
    apiKey: '',
    baseURL: '',
    chatModel: '',
    thinkingModel: '',
  });
  const [models, setModels] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [loadingModels, setLoadingModels] = useState(false);
  const [isConfigSaved, setIsConfigSaved] = useState(false);

  // 加载设置
  async function loadSettings() {
    try {
      if (window.electronAPI) {
        const settings = await window.electronAPI.settings?.get();
        if (settings) {
          setConfig(settings);
          // 检查配置是否已保存（有模型选择）
          setIsConfigSaved(!!(settings.chatModel && settings.thinkingModel));
        }
      }
    } catch (error) {
      console.error('加载设置失败:', error);
    }
  }

  // 加载模型列表
  async function loadModels() {
    setLoadingModels(true);
    try {
      if (window.electronAPI) {
        const modelList = await window.electronAPI.settings?.getModels(config);
        if (modelList) {
          setModels(modelList);
        }
      }
    } catch (error: any) {
      console.error('加载模型列表失败:', error);
      setTestResult({
        success: false,
        message: `加载模型列表失败: ${error.message}`,
      });
    } finally {
      setLoadingModels(false);
    }
  }

  // 测试连接
  async function testConnection() {
    setTesting(true);
    setTestResult(null);
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.settings?.testConnection(config);
        setTestResult(result);
        if (result?.success) {
          // 连接成功，自动保存配置（包括 API Key 和 Base URL）
          try {
            await window.electronAPI.settings?.save(config);
            console.log('[Settings] 连接测试成功后自动保存配置');
          } catch (saveError: any) {
            console.error('自动保存配置失败:', saveError);
            // 不影响测试结果，只记录错误
          }
          // 连接成功，自动加载模型列表
          await loadModels();
        }
      }
    } catch (error: any) {
      setTestResult({
        success: false,
        message: error.message || '连接测试失败',
      });
    } finally {
      setTesting(false);
    }
  }

  // 保存配置
  async function saveConfig() {
    setLoading(true);
    try {
      if (window.electronAPI) {
        await window.electronAPI.settings?.save(config);
        setIsConfigSaved(true);
        setTestResult({
          success: true,
          message: '设置已保存',
        });
      }
    } catch (error: any) {
      setTestResult({
        success: false,
        message: `保存失败: ${error.message}`,
      });
    } finally {
      setLoading(false);
    }
  }

  // 自动保存 API Key 和 Base URL
  async function autoSaveCredentials() {
    if (config.apiKey || config.baseURL) {
      try {
        await window.electronAPI?.settings?.save({
          ...config,
          // 只保存 API Key 和 Base URL，保留其他字段
        });
        console.log('[Settings] API Key 或 Base URL 已自动保存');
      } catch (error) {
        console.error('自动保存失败:', error);
      }
    }
  }

  // 更新配置
  function updateConfig(updates: Partial<AIConfig>) {
    setConfig((prev) => ({ ...prev, ...updates }));
  }

  // 初始化加载
  useEffect(() => {
    loadSettings();
  }, []);

  return {
    config,
    models,
    loading,
    testing,
    testResult,
    loadingModels,
    isConfigSaved,
    setConfig,
    updateConfig,
    loadSettings,
    loadModels,
    testConnection,
    saveConfig,
    autoSaveCredentials,
    setIsConfigSaved,
  };
}

