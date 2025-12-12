"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BacktestService = void 0;
const duckdb_1 = require("../database/duckdb");
const backtestEngine_1 = require("../../../services/backtest-engine/backtestEngine");
const marketDataService_1 = require("../../../services/market-data/marketDataService");
class BacktestService {
    constructor() {
        this.backtestEngine = new backtestEngine_1.BacktestEngine();
        this.marketDataService = new marketDataService_1.MarketDataService();
    }
    async run(params) {
        try {
            console.log('[BacktestService] 运行回测:', params);
            // 获取市场数据
            const { strategyCode, assets, startDate, endDate, timeframe, initialCapital, commission, slippage } = params;
            if (!assets || assets.length === 0) {
                throw new Error('未指定交易资产');
            }
            // 获取第一个资产的数据（简化：只支持单个资产）
            const symbol = assets[0];
            const data = await this.marketDataService.getData(symbol, timeframe, startDate, endDate);
            if (data.length === 0) {
                throw new Error('无法获取市场数据');
            }
            // 执行回测
            const backtestParams = {
                strategyCode,
                data,
                initialCapital: initialCapital || 10000,
                commission: commission || 0.001,
                slippage: slippage || 0.0005,
            };
            const result = await this.backtestEngine.run(backtestParams);
            // 保存回测结果到数据库
            const dbResult = await (0, duckdb_1.run)(`INSERT INTO backtest_runs (strategy_id, status, parameters, results, started_at, completed_at)
         VALUES (?, ?, ?, ?, ?, ?)`, [
                params.strategyId || null,
                'completed',
                JSON.stringify(params),
                JSON.stringify(result),
                new Date().toISOString(),
                new Date().toISOString(),
            ]);
            return {
                success: true,
                id: dbResult.lastInsertRowid,
                status: 'completed',
                result,
            };
        }
        catch (error) {
            console.error('[BacktestService] 回测失败:', error);
            // 保存失败的回测记录
            try {
                await (0, duckdb_1.run)(`INSERT INTO backtest_runs (strategy_id, status, parameters, started_at)
           VALUES (?, ?, ?, ?)`, [
                    params.strategyId || null,
                    'failed',
                    JSON.stringify({ ...params, error: error.message }),
                    new Date().toISOString(),
                ]);
            }
            catch (dbError) {
                console.error('[BacktestService] 保存失败记录失败:', dbError);
            }
            throw error;
        }
    }
    async get(id) {
        const backtests = await (0, duckdb_1.query)('SELECT * FROM backtest_runs WHERE id = ?', [id]);
        if (backtests.length === 0) {
            throw new Error('回测不存在');
        }
        const backtest = backtests[0];
        return {
            ...backtest,
            parameters: JSON.parse(backtest.parameters || '{}'),
            results: JSON.parse(backtest.results || '{}'),
        };
    }
    async list() {
        const backtests = await (0, duckdb_1.query)(`SELECT id, strategy_id, status, created_at, completed_at
       FROM backtest_runs
       ORDER BY created_at DESC
       LIMIT 50`);
        return backtests;
    }
}
exports.BacktestService = BacktestService;
//# sourceMappingURL=backtestService.js.map