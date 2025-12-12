import { useState, useEffect, useRef } from 'react';

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
  const [chatModelSearch, setChatModelSearch] = useState<string>('');
  const [thinkingModelSearch, setThinkingModelSearch] = useState<string>('');
  const [chatModelOpen, setChatModelOpen] = useState(false);
  const [thinkingModelOpen, setThinkingModelOpen] = useState(false);
  const chatModelRef = useRef<HTMLDivElement>(null);
  const thinkingModelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadSettings();
    loadStrategiesDir();
  }, []);

  // 点击外部关闭下拉框
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (chatModelRef.current && !chatModelRef.current.contains(event.target as Node)) {
        setChatModelOpen(false);
      }
      if (thinkingModelRef.current && !thinkingModelRef.current.contains(event.target as Node)) {
        setThinkingModelOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 过滤模型列表
  const filteredChatModels = models.filter((model) =>
    model.toLowerCase().includes(chatModelSearch.toLowerCase())
  );
  const filteredThinkingModels = models.filter((model) =>
    model.toLowerCase().includes(thinkingModelSearch.toLowerCase())
  );

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
        // 确保始终有值，显示实际路径或默认路径
        if (dir) {
          setStrategiesDir(dir);
        } else {
          // 如果获取失败，显示默认路径提示（会在后端返回默认路径）
          setStrategiesDir('正在加载...');
        }
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
              AI API 类型
            </label>
            <select
              value={config.provider}
              onChange={(e) =>
                setConfig({ ...config, provider: e.target.value as any, chatModel: '', thinkingModel: '' })
              }
              className="w-full px-3 py-2 bg-workspace-bg border border-accent-secondary rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-accent-primary"
            >
              <option value="openai">OpenAI 兼容</option>
              <option value="anthropic">Anthropic (Claude)</option>
              <option value="google">Google (Gemini)</option>
            </select>
            <p className="mt-1 text-sm text-text-muted">
              选择 API 协议类型，支持所有使用相同协议的 API 服务
            </p>
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
              onBlur={async () => {
                // 当用户离开输入框时，自动保存 API Key 和 Base URL
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
              }}
              placeholder="输入 API Key"
              className="w-full px-3 py-2 bg-workspace-bg border border-accent-secondary rounded-md text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-accent-primary"
            />
            <p className="mt-1 text-sm text-text-muted">
              输入后会自动保存，无需手动点击保存按钮
            </p>
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
              onBlur={async () => {
                // 当用户离开输入框时，自动保存 API Key 和 Base URL
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
              }}
              placeholder="例如: https://api.openai.com/v1"
              className="w-full px-3 py-2 bg-workspace-bg border border-accent-secondary rounded-md text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-accent-primary"
            />
            <p className="mt-1 text-sm text-text-muted">
              留空则使用默认端点，自定义端点可用于代理或兼容 API。输入后会自动保存。
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
                <div ref={chatModelRef} className="relative">
                  <div
                    onClick={() => {
                      setChatModelOpen(!chatModelOpen);
                      setChatModelSearch('');
                    }}
                    className="w-full px-3 py-2 bg-workspace-bg border border-accent-secondary rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-accent-primary cursor-pointer flex items-center justify-between"
                  >
                    <span className={config.chatModel ? '' : 'text-text-muted'}>
                      {config.chatModel || '请选择模型'}
                    </span>
                    <svg
                      className={`w-4 h-4 transition-transform ${chatModelOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                  {chatModelOpen && (
                    <div className="absolute z-10 w-full mt-1 bg-workspace-bg border border-accent-secondary rounded-md shadow-lg max-h-60 overflow-hidden">
                      <div className="p-2 border-b border-accent-secondary">
                        <input
                          type="text"
                          value={chatModelSearch}
                          onChange={(e) => setChatModelSearch(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          placeholder="搜索模型..."
                          className="w-full px-3 py-2 bg-card-bg border border-accent-secondary rounded-md text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-accent-primary text-sm"
                          autoFocus
                        />
                      </div>
                      <div className="overflow-y-auto max-h-48">
                        {filteredChatModels.length > 0 ? (
                          filteredChatModels.map((model) => (
                            <div
                              key={model}
                              onClick={() => {
                                setConfig({ ...config, chatModel: model });
                                setChatModelOpen(false);
                                setChatModelSearch('');
                              }}
                              className={`px-3 py-2 cursor-pointer hover:bg-hover-bg ${
                                config.chatModel === model ? 'bg-selected-bg text-accent-primary' : 'text-text-primary'
                              }`}
                            >
                              {model}
                            </div>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-text-muted text-sm">未找到匹配的模型</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
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
