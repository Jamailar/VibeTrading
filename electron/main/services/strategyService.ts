import { StrategyGenerator } from '../../../services/ai-worker/services/strategyGenerator';
import { createLLM } from '../../../services/ai-worker/services/llm';
import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';
import { getStrategiesDir } from './settingsService';

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

export class StrategyService {
  private strategyGenerator: StrategyGenerator;
  private strategiesDir: string;

  constructor() {
    try {
      console.log('[StrategyService] 开始初始化...');
      
      // 从设置服务获取策略文件夹路径
      this.strategiesDir = getStrategiesDir();
      console.log('[StrategyService] 策略文件夹路径:', this.strategiesDir);
      
      // 确保策略文件夹存在
      if (!fs.existsSync(this.strategiesDir)) {
        fs.mkdirSync(this.strategiesDir, { recursive: true });
        console.log('[StrategyService] 创建策略文件夹:', this.strategiesDir);
      } else {
        console.log('[StrategyService] 策略文件夹已存在');
      }
      
      // 初始化 AI Worker（可能失败，但不应该阻止服务初始化）
      try {
        const llm = createLLM();
        this.strategyGenerator = new StrategyGenerator(llm);
        console.log('[StrategyService] AI Worker 初始化成功');
      } catch (llmError) {
        console.warn('[StrategyService] AI Worker 初始化失败（策略生成功能将不可用）:', llmError);
        // 不抛出错误，允许服务继续初始化
        this.strategyGenerator = null as any;
      }
      
      console.log('[StrategyService] 初始化完成');
    } catch (error) {
      console.error('[StrategyService] 初始化失败:', error);
      console.error('[StrategyService] 错误堆栈:', error instanceof Error ? error.stack : String(error));
      throw error;
    }
  }

  async generate(message: string) {
    try {
      if (!this.strategyGenerator) {
        throw new Error('AI Worker 未初始化，无法生成策略');
      }
      console.log('[StrategyService] 生成策略:', message);
      const result = await this.strategyGenerator.generate(message);
      return {
        success: true,
        data: result,
      };
    } catch (error: any) {
      console.error('[StrategyService] 生成策略失败:', error);
      throw new Error(error.message || '策略生成失败');
    }
  }

  // 生成文件名（使用精准时间）
  private getFileName(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const milliseconds = String(now.getMilliseconds()).padStart(3, '0');
    
    // 格式: YYYY-MM-DD_HH-mm-ss-SSS.json
    return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}-${milliseconds}.json`;
  }

  // 从文件名提取策略名称
  private getNameFromFileName(fileName: string): string {
    // 移除 .json 扩展名和时间戳
    return fileName.replace(/_\d+\.json$/, '').replace(/_/g, ' ');
  }

  async save(strategy: any) {
    const fileName = this.getFileName();
    const filePath = path.join(this.strategiesDir, fileName);

    // 构建策略数据
    const strategyData = {
      name: strategy.name || `策略_${fileName.replace('.json', '')}`,
      description: strategy.description || '',
      strategy: strategy.strategy || strategy,
      code: strategy.code || '',
      explanation: strategy.explanation || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // 保存为 JSON 文件
    await writeFile(filePath, JSON.stringify(strategyData, null, 2), 'utf-8');

    console.log('[StrategyService] 策略已保存:', filePath);

    return {
      success: true,
      id: fileName, // 使用文件名作为 ID
      filePath,
    };
  }

  async list() {
    try {
      const files = await readdir(this.strategiesDir);
      const jsonFiles = files.filter(f => f.endsWith('.json'));

      const strategies = await Promise.all(
        jsonFiles.map(async (fileName) => {
          try {
            const filePath = path.join(this.strategiesDir, fileName);
            const fileStat = await stat(filePath);
            const content = await readFile(filePath, 'utf-8');
            const data = JSON.parse(content);

            return {
              id: fileName,
              name: data.name || this.getNameFromFileName(fileName),
              description: data.description || '',
              created_at: data.created_at || fileStat.birthtime.toISOString(),
              updated_at: data.updated_at || fileStat.mtime.toISOString(),
            };
          } catch (error) {
            console.error(`[StrategyService] 读取策略文件失败 ${fileName}:`, error);
            return null;
          }
        })
      );

      // 过滤掉读取失败的文件，并按更新时间排序
      return strategies
        .filter((s): s is NonNullable<typeof s> => s !== null)
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    } catch (error) {
      console.error('[StrategyService] 列出策略失败:', error);
      return [];
    }
  }

  async get(id: string) {
    const filePath = path.join(this.strategiesDir, id);

    if (!fs.existsSync(filePath)) {
      throw new Error('策略文件不存在');
    }

    try {
      const content = await readFile(filePath, 'utf-8');
      const data = JSON.parse(content);

      return {
        ...data,
        id,
        filePath,
      };
    } catch (error: any) {
      console.error('[StrategyService] 读取策略失败:', error);
      throw new Error(`读取策略文件失败: ${error.message}`);
    }
  }

  async update(id: string, updates: { name?: string; description?: string; content?: any }) {
    const filePath = path.join(this.strategiesDir, id);

    if (!fs.existsSync(filePath)) {
      throw new Error('策略文件不存在');
    }

    try {
      const content = await readFile(filePath, 'utf-8');
      const data = JSON.parse(content);

      // 更新字段
      if (updates.name !== undefined) {
        data.name = updates.name;
      }
      if (updates.description !== undefined) {
        data.description = updates.description;
      }
      if (updates.content !== undefined) {
        // 如果提供了完整内容，则更新整个策略
        Object.assign(data, updates.content);
      }

      data.updated_at = new Date().toISOString();

      // 保存更新后的文件
      await writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');

      console.log('[StrategyService] 策略已更新:', filePath);

      return { success: true };
    } catch (error: any) {
      console.error('[StrategyService] 更新策略失败:', error);
      throw new Error(`更新策略失败: ${error.message}`);
    }
  }

  async delete(id: string) {
    const filePath = path.join(this.strategiesDir, id);

    if (!fs.existsSync(filePath)) {
      throw new Error('策略文件不存在');
    }

    try {
      await unlink(filePath);
      console.log('[StrategyService] 策略已删除:', filePath);
      return { success: true };
    } catch (error: any) {
      console.error('[StrategyService] 删除策略失败:', error);
      throw new Error(`删除策略失败: ${error.message}`);
    }
  }

  // 获取策略文件夹路径（用于前端显示）
  getStrategiesDir(): string {
    return this.strategiesDir;
  }

  // 更新策略文件夹路径（当设置改变时调用）
  updateStrategiesDir(newDir: string) {
    this.strategiesDir = newDir;
    // 确保新文件夹存在
    if (!fs.existsSync(this.strategiesDir)) {
      fs.mkdirSync(this.strategiesDir, { recursive: true });
      console.log('[StrategyService] 创建新的策略文件夹:', this.strategiesDir);
    }
    console.log('[StrategyService] 策略文件夹路径已更新:', this.strategiesDir);
  }
}
