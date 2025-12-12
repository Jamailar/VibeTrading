export interface OHLCV {
    timestamp: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}
export declare class MarketDataService {
    private cache;
    private cacheTTL;
    getData(symbol: string, timeframe: string, startDate: string, endDate: string): Promise<OHLCV[]>;
    private getStockData;
    private getCryptoData;
    private getPolygonData;
    private getYFinanceData;
    validateSymbol(symbol: string): Promise<boolean>;
}
