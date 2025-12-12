"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StrategyService = void 0;
const strategyGenerator_1 = require("../../../services/ai-worker/services/strategyGenerator");
const llm_1 = require("../../../services/ai-worker/services/llm");
const duckdb_1 = require("../database/duckdb");
class StrategyService {
    constructor() {
        try {
            const llm = (0, llm_1.createLLM)();
            this.strategyGenerator = new strategyGenerator_1.StrategyGenerator(llm);
            console.log('[StrategyService] AI Worker 初始化成功');
        }
        catch (error) {
            console.error('[StrategyService] AI Worker 初始化失败:', error);
            throw error;
        }
    }
    async generate(message) {
        try {
            console.log('[StrategyService] 生成策略:', message);
            const result = await this.strategyGenerator.generate(message);
            return {
                success: true,
                data: result,
            };
        }
        catch (error) {
            console.error('[StrategyService] 生成策略失败:', error);
            throw new Error(error.message || '策略生成失败');
        }
    }
    async save(strategy) {
        const result = await (0, duckdb_1.run)(`INSERT INTO strategies (name, description, strategy_json, strategy_code, explanation)
       VALUES (?, ?, ?, ?, ?)`, [
            strategy.name || `策略_${Date.now()}`,
            strategy.description || '',
            JSON.stringify(strategy.strategy || strategy),
            strategy.code || '',
            strategy.explanation || '',
        ]);
        return {
            success: true,
            id: result.lastInsertRowid,
        };
    }
    async list() {
        const strategies = await (0, duckdb_1.query)(`SELECT id, name, description, created_at, updated_at
       FROM strategies
       ORDER BY created_at DESC`);
        return strategies;
    }
    async get(id) {
        const strategies = await (0, duckdb_1.query)('SELECT * FROM strategies WHERE id = ?', [id]);
        if (strategies.length === 0) {
            throw new Error('策略不存在');
        }
        const strategy = strategies[0];
        return {
            ...strategy,
            strategy_json: JSON.parse(strategy.strategy_json),
        };
    }
    async delete(id) {
        const result = await (0, duckdb_1.run)('DELETE FROM strategies WHERE id = ?', [id]);
        if (result.changes === 0) {
            throw new Error('策略不存在');
        }
        return { success: true };
    }
}
exports.StrategyService = StrategyService;
//# sourceMappingURL=strategyService.js.map