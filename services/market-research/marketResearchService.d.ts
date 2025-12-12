export interface MarketInsight {
    sentimentScore: number;
    trendState: 'bullish' | 'bearish' | 'neutral';
    volatilityRegime: 'low' | 'normal' | 'elevated';
    topAssets: string[];
    riskFlags: string[];
    recommendedStrategyTypes: string[];
    insightData: Record<string, any>;
}
export declare class MarketResearchService {
    private cache;
    private cacheTTL;
    getInsight(): Promise<MarketInsight>;
    private generateInsight;
    private getVIX;
    private getBTCTrend;
    private getSentiment;
    private getDefaultInsight;
}
