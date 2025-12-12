import { useState, useEffect } from 'react';

export function useStrategiesDir() {
  const [strategiesDir, setStrategiesDir] = useState<string>('');
  const [savingDir, setSavingDir] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // 加载策略文件夹路径
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

  // 选择策略文件夹
  async function selectStrategiesDir() {
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

  // 初始化加载
  useEffect(() => {
    loadStrategiesDir();
  }, []);

  return {
    strategiesDir,
    savingDir,
    testResult,
    loadStrategiesDir,
    selectStrategiesDir,
  };
}

