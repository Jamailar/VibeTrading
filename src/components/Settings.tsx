import AIConfigSection from './settings/AIConfigSection';
import StrategiesDirSection from './settings/StrategiesDirSection';

export default function Settings() {
  return (
    <div className="h-full">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-text-primary">设置</h1>
        <p className="mt-2 text-sm text-text-secondary">
          配置 AI 服务和其他应用设置
        </p>
      </div>

      <AIConfigSection />

      <div className="mt-6">
        <StrategiesDirSection />
      </div>
    </div>
  );
}
