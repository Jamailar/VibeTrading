import { MarketDataService as MarketDataServiceImpl } from '../../../services/market-data/marketDataService';

export class MarketDataService {
  private service: MarketDataServiceImpl;

  constructor() {
    this.service = new MarketDataServiceImpl();
  }

  async getData(symbol: string, timeframe: string, startDate: string, endDate: string) {
    try {
      console.log('[MarketDataService] 获取市场数据:', { symbol, timeframe, startDate, endDate });
      
      const data = await this.service.getData(symbol, timeframe, startDate, endDate);
      
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      console.error('[MarketDataService] 获取数据失败:', error);
      throw new Error(error.message || '获取市场数据失败');
    }
  }

  async validateSymbol(symbol: string) {
    return await this.service.validateSymbol(symbol);
  }
}
