"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarketDataService = void 0;
const marketDataService_1 = require("../../../services/market-data/marketDataService");
class MarketDataService {
    constructor() {
        this.service = new marketDataService_1.MarketDataService();
    }
    async getData(symbol, timeframe, startDate, endDate) {
        try {
            console.log('[MarketDataService] 获取市场数据:', { symbol, timeframe, startDate, endDate });
            const data = await this.service.getData(symbol, timeframe, startDate, endDate);
            return {
                success: true,
                data,
            };
        }
        catch (error) {
            console.error('[MarketDataService] 获取数据失败:', error);
            throw new Error(error.message || '获取市场数据失败');
        }
    }
    async validateSymbol(symbol) {
        return await this.service.validateSymbol(symbol);
    }
}
exports.MarketDataService = MarketDataService;
//# sourceMappingURL=marketDataService.js.map