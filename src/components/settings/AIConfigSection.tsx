import { useAIConfig } from './hooks/useAIConfig';
import SearchableSelect from './SearchableSelect';

export default function AIConfigSection() {
  const {
    config,
    models,
    loading,
    testing,
    testResult,
    loadingModels,
    isConfigSaved,
    updateConfig,
    loadModels,
    testConnection,
    saveConfig,
    autoSaveCredentials,
  } = useAIConfig();

  return (
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
              updateConfig({ provider: e.target.value as any, chatModel: '', thinkingModel: '' })
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
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-text-primary">
              API Key
            </label>
            <button
              onClick={testConnection}
              disabled={testing || !config.apiKey}
              className="px-3 py-1 text-xs border border-accent-secondary text-text-primary rounded-md hover:bg-hover-bg focus:outline-none focus:ring-2 focus:ring-accent-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {testing ? '测试中...' : '测试连接'}
            </button>
          </div>
          <input
            type="password"
            value={config.apiKey}
            onChange={(e) => updateConfig({ apiKey: e.target.value })}
            onBlur={autoSaveCredentials}
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
            onChange={(e) => updateConfig({ baseURL: e.target.value })}
            onBlur={autoSaveCredentials}
            placeholder="例如: https://api.openai.com/v1"
            className="w-full px-3 py-2 bg-workspace-bg border border-accent-secondary rounded-md text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-accent-primary"
          />
          <p className="mt-1 text-sm text-text-muted">
            留空则使用默认端点，自定义端点可用于代理或兼容 API。输入后会自动保存。
          </p>
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

        {/* Saved Models Display */}
        {isConfigSaved && config.chatModel && config.thinkingModel && (
          <div className="space-y-4 p-4 bg-workspace-bg rounded-md border border-accent-secondary">
            <h3 className="text-sm font-medium text-text-primary mb-3">当前配置</h3>
            
            {/* Chat Model Display */}
            <SearchableSelect
              value={config.chatModel}
              options={models}
              placeholder="请选择模型"
              label="对话模型"
              onChange={(value) => {
                updateConfig({ chatModel: value });
                saveConfig();
              }}
              onLoadOptions={loadModels}
              compact={true}
              autoSave={saveConfig}
            />

            {/* Thinking Model Display */}
            <SearchableSelect
              value={config.thinkingModel}
              options={models}
              placeholder="请选择模型"
              label="思考模型"
              onChange={(value) => {
                updateConfig({ thinkingModel: value });
                saveConfig();
              }}
              onLoadOptions={loadModels}
              compact={true}
              autoSave={saveConfig}
            />
          </div>
        )}

        {/* Models List - Only show when not saved or when loading models */}
        {!isConfigSaved && models.length > 0 && (
          <div className="space-y-4">
            {/* Chat Model */}
            <SearchableSelect
              value={config.chatModel}
              options={models}
              placeholder="请选择模型"
              label="对话模型"
              onChange={(value) => updateConfig({ chatModel: value })}
            />

            {/* Thinking Model */}
            <div>
              <SearchableSelect
                value={config.thinkingModel}
                options={models}
                placeholder="请选择模型"
                label="思考模型"
                onChange={(value) => updateConfig({ thinkingModel: value })}
              />
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

      {/* Save Button - Only show when not saved or when config changed */}
      {(!isConfigSaved || !config.chatModel || !config.thinkingModel) && (
        <div className="p-6 border-t border-border-default flex justify-end">
          <button
            onClick={saveConfig}
            disabled={loading || !config.apiKey || !config.chatModel || !config.thinkingModel}
            className="px-4 py-2 bg-accent-primary text-app-bg rounded-md hover:bg-trade-focus focus:outline-none focus:ring-2 focus:ring-accent-primary disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-text-disabled disabled:text-text-muted"
          >
            {loading ? '保存中...' : '保存设置'}
          </button>
        </div>
      )}
    </div>
  );
}

