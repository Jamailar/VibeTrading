import { useStrategiesDir } from './hooks/useStrategiesDir';

export default function StrategiesDirSection() {
  const { strategiesDir, savingDir, selectStrategiesDir } = useStrategiesDir();

  return (
    <div className="bg-card-bg rounded-lg border border-border-default">
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
              onClick={selectStrategiesDir}
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
  );
}

