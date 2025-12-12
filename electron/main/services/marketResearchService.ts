import { MarketResearchService as MarketResearchServiceImpl } from '../../../services/market-research/marketResearchService';

export class MarketResearchService {
  private service: MarketResearchServiceImpl;

  constructor() {
    this.service = new MarketResearchServiceImpl();
  }

  async getInsight() {
    try {
      console.log('[MarketResearchService] 获取市场洞察');
      
      const insight = await this.service.getInsight();
      
      return {
        success: true,
        data: insight,
      };
    } catch (error: any) {
      console.error('[MarketResearchService] 获取洞察失败:', error);
      throw new Error(error.message || '获取市场洞察失败');
    }
  }
}
