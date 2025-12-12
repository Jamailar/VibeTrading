import { useState, useEffect } from 'react';

interface AIConfig {
  provider: 'openai' | 'anthropic' | 'google';
  apiKey: string;
  baseURL: string;
  chatModel: string;
  thinkingModel: string;
}

export default function Settings() {
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
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [loadingModels, setLoadingModels] = useState(false);
  const [strategiesDir, setStrategiesDir] = useState<string>('');
  const [savingDir, setSavingDir] = useState(false);

  useEffect(() => {
    loadSettings();
    loadStrategiesDir();
  }, []);

  async function loadSettings() {
    try {
      if (window.electronAPI) {
        const settings = await window.electronAPI.settings?.get();
        if (settings) {
          setConfig(settings);
        }
      }
    } catch (error) {
      console.error('加载设置失败:', error);
    }
  }

  async function loadStrategiesDir() {
    try {
      if (window.electronAPI) {
        const dir = await window.electronAPI.settings?.getStrategiesDir();
        // 确保始终有值，即使获取失败也显示默认路径提示
        setStrategiesDir(dir || '正在加载...');
      }
    } catch (error) {
      console.error('加载策略文件夹路径失败:', error);
      // 即使加载失败，也显示一个提示
      setStrategiesDir('加载失败，请点击"选择文件夹"设置路径');
    }
  }

  async function handleSelectStrategiesDir() {
    try {
      if (!window.electronAPI) return;
      
      setSavingDir(true);
      const result = await window.electronAPI.settings?.selectStrategiesDir();
      
      if (result?.success && result?.path) {
        setStrategiesDir(result.path);
        setTestResult({
          success: true,
          message: '策略文件夹路径已更新',
        });
      } else if (result?.canceled) {
        // 用户取消了选择，不显示错误
      } else {
        setTestResult({
          success: false,
          message: result?.message || '选择文件夹失败',
        });
      }
    } catch (error: any) {
      setTestResult({
        success: false,
        message: `选择文件夹失败: ${error.message}`,
      });
    } finally {
      setSavingDir(false);
    }
  }

  async function handleTestConnection() {
    setTesting(true);
    setTestResult(null);
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.settings?.testConnection(config);
        setTestResult(result);
        if (result?.success) {
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

  async function handleSave() {
    setLoading(true);
    try {
      if (window.electronAPI) {
        await window.electronAPI.settings?.save(config);
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

  return (
    <div className="h-full">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-text-primary">设置</h1>
        <p className="mt-2 text-sm text-text-secondary">
          配置 AI 服务和其他应用设置
        </p>
      </div>

      <div className="bg-card-bg rounded-lg border border-border-default">
        <div className="p-6 border-b border-border-default">
          <h2 className="text-xl font-bold text-text-primary">AI 配置</h2>
          <p className="text-sm text-text-muted mt-1">配置 AI 服务的 API Key 和模型</p>
        </div>

        <div className="p-6 space-y-6">
          {/* Provider Selection */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              AI 提供商
            </label>
            <select
              value={config.provider}
              onChange={(e) =>
                setConfig({ ...config, provider: e.target.value as any, chatModel: '', thinkingModel: '' })
              }
              className="w-full px-3 py-2 bg-workspace-bg border border-accent-secondary rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-accent-primary"
            >
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic (Claude)</option>
              <option value="google">Google (Gemini)</option>
            </select>
          </div>

          {/* API Key */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              API Key
            </label>
            <input
              type="password"
              value={config.apiKey}
              onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
              placeholder="输入 API Key"
              className="w-full px-3 py-2 bg-workspace-bg border border-accent-secondary rounded-md text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-accent-primary"
            />
          </div>

          {/* Base URL */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              API Base URL (可选)
            </label>
            <input
              type="text"
              value={config.baseURL}
              onChange={(e) => setConfig({ ...config, baseURL: e.target.value })}
              placeholder="例如: https://api.openai.com/v1"
              className="w-full px-3 py-2 bg-workspace-bg border border-accent-secondary rounded-md text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-accent-primary"
            />
            <p className="mt-1 text-sm text-text-muted">
              留空则使用默认端点，自定义端点可用于代理或兼容 API
            </p>
          </div>

          {/* Test Connection Button */}
          <div>
            <button
              onClick={handleTestConnection}
              disabled={testing || !config.apiKey}
              className="w-full px-4 py-2 bg-accent-primary text-app-bg rounded-md hover:bg-trade-focus focus:outline-none focus:ring-2 focus:ring-accent-primary disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-text-disabled disabled:text-text-muted"
            >
              {testing ? '测试中...' : '测试连接'}
            </button>
          </div>

          {/* Test Result */}
          {testResult && (
            <div
              className={`p-3 rounded-md border ${
                testResult.success
                  ? 'bg-workspace-bg border-trade-up text-trade-up'
                  : 'bg-workspace-bg border-trade-down text-trade-down'
              }`}
            >
              {testResult.message}
            </div>
          )}

          {/* Models List */}
          {models.length > 0 && (
            <div className="space-y-4">
              {/* Chat Model */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  对话模型
                </label>
                <select
                  value={config.chatModel}
                  onChange={(e) => setConfig({ ...config, chatModel: e.target.value })}
                  className="w-full px-3 py-2 bg-workspace-bg border border-accent-secondary rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-accent-primary"
                >
                  <option value="">请选择模型</option>
                  {models.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
              </div>

              {/* Thinking Model */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  思考模型
                </label>
                <select
                  value={config.thinkingModel}
                  onChange={(e) => setConfig({ ...config, thinkingModel: e.target.value })}
                  className="w-full px-3 py-2 bg-workspace-bg border border-accent-secondary rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-accent-primary"
                >
                  <option value="">请选择模型</option>
                  {models.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-sm text-text-muted">
                  用于复杂推理和策略生成的模型
                </p>
              </div>

              {/* Load Models Button */}
              <button
                onClick={loadModels}
                disabled={loadingModels}
                className="w-full px-4 py-2 bg-workspace-bg border border-accent-secondary text-text-primary rounded-md hover:bg-hover-bg focus:outline-none focus:ring-2 focus:ring-accent-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingModels ? '加载中...' : '刷新模型列表'}
              </button>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-border-default flex justify-end">
          <button
            onClick={handleSave}
            disabled={loading || !config.apiKey || !config.chatModel || !config.thinkingModel}
            className="px-4 py-2 bg-accent-primary text-app-bg rounded-md hover:bg-trade-focus focus:outline-none focus:ring-2 focus:ring-accent-primary disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-text-disabled disabled:text-text-muted"
          >
            {loading ? '保存中...' : '保存设置'}
          </button>
        </div>
      </div>

      {/* 策略文件夹配置 */}
      <div className="mt-6 bg-card-bg rounded-lg border border-border-default">
        <div className="p-6 border-b border-border-default">
          <h2 className="text-xl font-bold text-text-primary">策略文件夹</h2>
          <p className="text-sm text-text-muted mt-1">配置策略文件的存储位置</p>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              策略文件夹路径
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={strategiesDir}
                readOnly
                className="flex-1 px-3 py-2 bg-workspace-bg border border-accent-secondary rounded-md text-text-primary text-sm"
                placeholder="未设置"
              />
              <button
                onClick={handleSelectStrategiesDir}
                disabled={savingDir}
                className="px-4 py-2 bg-accent-primary text-app-bg rounded-md hover:bg-trade-focus focus:outline-none focus:ring-2 focus:ring-accent-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {savingDir ? '选择中...' : '选择文件夹'}
              </button>
            </div>
            <p className="mt-1 text-sm text-text-muted">
              所有策略 JSON 文件将保存在此文件夹中
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
