"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BacktestEngine = void 0;
const technicalindicators_1 = require("technicalindicators");
class BacktestEngine {
    async run(params) {
        const { strategyCode, data, initialCapital, commission = 0.001, slippage = 0.0005 } = params;
        // 执行策略代码获取信号
        const signals = this.executeStrategy(strategyCode, data);
        // 执行回测
        const result = this.executeBacktest(data, signals, initialCapital, commission, slippage);
        return result;
    }
    executeStrategy(code, data) {
        try {
            // 创建安全的执行环境
            const vm = require('vm2').VM;
            const sandbox = {
                data,
                SMA: technicalindicators_1.SMA,
                RSI: technicalindicators_1.RSI,
                MACD: technicalindicators_1.MACD,
                console: { log: () => { } },
                Math,
            };
            const vmInstance = new vm({
                sandbox,
                timeout: 5000,
            });
            // 执行策略代码
            const wrappedCode = `
        (function() {
          ${code}
          // 假设策略函数返回信号数组
          if (typeof strategy === 'function') {
            return strategy(data);
          }
          return [];
        })();
      `;
            const signals = vmInstance.run(wrappedCode);
            return signals || [];
        }
        catch (error) {
            console.error('[BacktestEngine] 策略执行失败:', error);
            return new Array(data.length).fill('hold');
        }
    }
    executeBacktest(data, signals, initialCapital, commission, slippage) {
        let capital = initialCapital;
        let position = null;
        const trades = [];
        const equityCurve = [];
        const returnsSeries = [];
        for (let i = 0; i < data.length; i++) {
            const candle = data[i];
            const signal = signals[i] || 'hold';
            // 处理持仓
            if (position) {
                // 检查退出信号
                if (signal === 'sell') {
                    const exitPrice = candle.close * (1 - slippage);
                    const pnl = (exitPrice - position.entryPrice) * position.quantity;
                    const commissionCost = exitPrice * position.quantity * commission;
                    const netPnl = pnl - commissionCost;
                    const pnlPercent = ((exitPrice - position.entryPrice) / position.entryPrice) * 100;
                    trades.push({
                        entryTime: position.entryTime,
                        exitTime: candle.timestamp,
                        entryPrice: position.entryPrice,
                        exitPrice,
                        quantity: position.quantity,
                        side: 'long',
                        pnl: netPnl,
                        pnlPercent,
                    });
                    capital += exitPrice * position.quantity - commissionCost;
                    position = null;
                }
            }
            else {
                // 检查买入信号
                if (signal === 'buy') {
                    const entryPrice = candle.close * (1 + slippage);
                    const commissionCost = entryPrice * capital * commission;
                    const availableCapital = capital - commissionCost;
                    const quantity = availableCapital / entryPrice;
                    if (quantity > 0) {
                        position = {
                            quantity,
                            entryPrice,
                            entryTime: candle.timestamp,
                        };
                        capital -= commissionCost;
                    }
                }
            }
            // 计算当前权益
            let currentEquity = capital;
            if (position) {
                currentEquity += candle.close * position.quantity;
            }
            equityCurve.push({
                timestamp: candle.timestamp,
                equity: currentEquity,
            });
            // 计算收益率
            const prevEquity = i > 0 ? equityCurve[i - 1].equity : initialCapital;
            const returnValue = ((currentEquity - prevEquity) / prevEquity) * 100;
            returnsSeries.push({
                timestamp: candle.timestamp,
                return: returnValue,
            });
        }
        // 计算统计指标
        const summaryStats = this.calculateStats(equityCurve, returnsSeries, trades, initialCapital);
        // 计算回撤
        const drawdownSeries = this.calculateDrawdown(equityCurve);
        return {
            equityCurve,
            drawdownSeries,
            returnsSeries,
            tradeLog: trades,
            summaryStats,
        };
    }
    calculateStats(equityCurve, returnsSeries, trades, initialCapital) {
        const finalEquity = equityCurve[equityCurve.length - 1].equity;
        const totalReturn = ((finalEquity - initialCapital) / initialCapital) * 100;
        // 计算 CAGR（假设数据是日线，需要根据实际时间框架调整）
        const days = (equityCurve[equityCurve.length - 1].timestamp - equityCurve[0].timestamp) / (1000 * 60 * 60 * 24);
        const years = days / 365;
        const cagr = years > 0 ? (Math.pow(finalEquity / initialCapital, 1 / years) - 1) * 100 : 0;
        // 计算收益率数组
        const returns = returnsSeries.map(r => r.return / 100);
        // 计算夏普比率
        const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
        const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
        const stdDev = Math.sqrt(variance);
        const sharpe = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0; // 年化
        // 计算索提诺比率（只考虑下行波动）
        const downsideReturns = returns.filter(r => r < 0);
        const downsideVariance = downsideReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / returns.length;
        const downsideStdDev = Math.sqrt(downsideVariance);
        const sortino = downsideStdDev > 0 ? (avgReturn / downsideStdDev) * Math.sqrt(252) : 0;
        // 计算最大回撤
        let maxDrawdown = 0;
        let peak = initialCapital;
        for (const point of equityCurve) {
            if (point.equity > peak) {
                peak = point.equity;
            }
            const drawdown = ((peak - point.equity) / peak) * 100;
            if (drawdown > maxDrawdown) {
                maxDrawdown = drawdown;
            }
        }
        // Calmar 比率
        const calmar = maxDrawdown > 0 ? cagr / maxDrawdown : 0;
        // 胜率
        const winningTrades = trades.filter(t => t.pnl > 0);
        const winRate = trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0;
        // 盈亏比
        const totalProfit = winningTrades.reduce((sum, t) => sum + t.pnl, 0);
        const totalLoss = trades.filter(t => t.pnl < 0).reduce((sum, t) => sum + Math.abs(t.pnl), 0);
        const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? Infinity : 0;
        // 波动率（年化）
        const volatility = stdDev * Math.sqrt(252) * 100;
        return {
            totalReturn,
            cagr,
            sharpe,
            sortino,
            maxDrawdown,
            calmar,
            winRate,
            profitFactor,
            volatility,
            totalTrades: trades.length,
        };
    }
    calculateDrawdown(equityCurve) {
        const drawdownSeries = [];
        let peak = equityCurve[0].equity;
        for (const point of equityCurve) {
            if (point.equity > peak) {
                peak = point.equity;
            }
            const drawdown = ((peak - point.equity) / peak) * 100;
            drawdownSeries.push({
                timestamp: point.timestamp,
                drawdown,
            });
        }
        return drawdownSeries;
    }
}
exports.BacktestEngine = BacktestEngine;
//# sourceMappingURL=backtestEngine.js.map