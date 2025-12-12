import { StrategyGenerator } from '../../../services/ai-worker/services/strategyGenerator';
import { createLLM } from '../../../services/ai-worker/services/llm';
import { query, run } from '../database/duckdb';

export class StrategyService {
  private strategyGenerator: StrategyGenerator;

  constructor() {
    try {
      const llm = createLLM();
      this.strategyGenerator = new StrategyGenerator(llm);
      console.log('[StrategyService] AI Worker 初始化成功');
    } catch (error) {
      console.error('[StrategyService] AI Worker 初始化失败:', error);
      throw error;
    }
  }

  async generate(message: string) {
    try {
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

  async save(strategy: any) {
    const result = await run(
      `INSERT INTO strategies (name, description, strategy_json, strategy_code, explanation)
       VALUES (?, ?, ?, ?, ?)`,
      [
        strategy.name || `策略_${Date.now()}`,
        strategy.description || '',
        JSON.stringify(strategy.strategy || strategy),
        strategy.code || '',
        strategy.explanation || '',
      ]
    );

    return {
      success: true,
      id: result.lastInsertRowid,
    };
  }

  async list() {
    const strategies = await query(
      `SELECT id, name, description, created_at, updated_at
       FROM strategies
       ORDER BY created_at DESC`
    );

    return strategies;
  }

  async get(id: number) {
    const strategies = await query(
      'SELECT * FROM strategies WHERE id = ?',
      [id]
    );

    if (strategies.length === 0) {
      throw new Error('策略不存在');
    }

    const strategy = strategies[0];
    return {
      ...strategy,
      strategy_json: JSON.parse(strategy.strategy_json as string),
    };
  }

  async delete(id: number) {
    const result = await run('DELETE FROM strategies WHERE id = ?', [id]);
    
    if (result.changes === 0) {
      throw new Error('策略不存在');
    }

    return { success: true };
  }
}
