"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarketResearchService = void 0;
const marketResearchService_1 = require("../../../services/market-research/marketResearchService");
class MarketResearchService {
    constructor() {
        this.service = new marketResearchService_1.MarketResearchService();
    }
    async getInsight() {
        try {
            console.log('[MarketResearchService] 获取市场洞察');
            const insight = await this.service.getInsight();
            return {
                success: true,
                data: insight,
            };
        }
        catch (error) {
            console.error('[MarketResearchService] 获取洞察失败:', error);
            throw new Error(error.message || '获取市场洞察失败');
        }
    }
}
exports.MarketResearchService = MarketResearchService;
//# sourceMappingURL=marketResearchService.js.map