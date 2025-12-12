"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarketDataService = void 0;
const axios_1 = __importDefault(require("axios"));
class MarketDataService {
    constructor() {
        this.cache = new Map();
        this.cacheTTL = 60 * 60 * 1000; // 1小时
    }
    async getData(symbol, timeframe, startDate, endDate) {
        const cacheKey = `${symbol}_${timeframe}_${startDate}_${endDate}`;
        // 检查缓存
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
            return cached.data;
        }
        try {
            let data = [];
            // 判断是股票还是加密货币
            if (symbol.includes('/')) {
                // 加密货币
                data = await this.getCryptoData(symbol, timeframe, startDate, endDate);
            }
            else {
                // 股票
                data = await this.getStockData(symbol, timeframe, startDate, endDate);
            }
            // 缓存数据
            this.cache.set(cacheKey, { data, timestamp: Date.now() });
            return data;
        }
        catch (error) {
            console.error('[MarketDataService] 获取数据失败:', error);
            throw error;
        }
    }
    async getStockData(symbol, timeframe, startDate, endDate) {
        try {
            // 使用 yfinance 或 Polygon.io
            // 这里使用简化的实现，实际应该调用相应的 API
            // 如果配置了 Polygon API Key，使用 Polygon
            if (process.env.POLYGON_API_KEY) {
                return await this.getPolygonData(symbol, timeframe, startDate, endDate);
            }
            // 否则使用 yfinance（需要 Node.js 版本的 yfinance）
            // 注意：yfinance 主要是 Python 库，Node.js 版本可能有限
            // 这里提供一个基础实现框架
            return await this.getYFinanceData(symbol, timeframe, startDate, endDate);
        }
        catch (error) {
            console.error('[MarketDataService] 获取股票数据失败:', error);
            throw error;
        }
    }
    async getCryptoData(symbol, timeframe, startDate, endDate) {
        try {
            // 使用 ccxt 获取加密货币数据
            const ccxt = require('ccxt');
            const exchange = new ccxt.binance(); // 默认使用 Binance
            const timeframeMap = {
                '1m': '1m',
                '5m': '5m',
                '15m': '15m',
                '1h': '1h',
                '4h': '4h',
                '1d': '1d',
            };
            const tf = timeframeMap[timeframe] || '1h';
            const since = new Date(startDate).getTime();
            const ohlcv = await exchange.fetchOHLCV(symbol, tf, since);
            return ohlcv.map(([timestamp, open, high, low, close, volume]) => ({
                timestamp,
                open,
                high,
                low,
                close,
                volume,
            }));
        }
        catch (error) {
            console.error('[MarketDataService] 获取加密货币数据失败:', error);
            throw error;
        }
    }
    async getPolygonData(symbol, timeframe, startDate, endDate) {
        const apiKey = process.env.POLYGON_API_KEY;
        if (!apiKey) {
            throw new Error('POLYGON_API_KEY 未设置');
        }
        const timeframeMap = {
            '1m': 'minute',
            '5m': 'minute',
            '1h': 'hour',
            '1d': 'day',
        };
        const multiplier = timeframe === '5m' ? 5 : 1;
        const timespan = timeframeMap[timeframe] || 'day';
        const url = `https://api.polygon.io/v2/aggs/ticker/${symbol}/range/${multiplier}/${timespan}/${startDate}/${endDate}`;
        const response = await axios_1.default.get(url, {
            params: {
                apiKey,
                adjusted: true,
                sort: 'asc',
            },
        });
        if (response.data.status !== 'OK') {
            throw new Error('Polygon API 错误: ' + response.data.status);
        }
        return response.data.results.map((r) => ({
            timestamp: r.t,
            open: r.o,
            high: r.h,
            low: r.l,
            close: r.c,
            volume: r.v,
        }));
    }
    async getYFinanceData(symbol, timeframe, startDate, endDate) {
        // yfinance 在 Node.js 中的实现比较复杂
        // 这里提供一个基础框架，实际需要根据可用的 Node.js yfinance 库实现
        // 或者使用其他数据源如 Alpha Vantage, Yahoo Finance API 等
        throw new Error('YFinance 数据源暂未实现，请配置 POLYGON_API_KEY 或使用加密货币数据');
    }
    async validateSymbol(symbol) {
        try {
            // 简单验证：检查是否是有效的交易对格式
            if (symbol.includes('/')) {
                // 加密货币格式：BTC/USDT
                return /^[A-Z0-9]+\/[A-Z0-9]+$/.test(symbol);
            }
            else {
                // 股票格式：AAPL, TSLA 等
                return /^[A-Z]{1,5}$/.test(symbol);
            }
        }
        catch {
            return false;
        }
    }
}
exports.MarketDataService = MarketDataService;
//# sourceMappingURL=marketDataService.js.map