export interface OHLCV {
    timestamp: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}
export interface BacktestParams {
    strategyCode: string;
    data: OHLCV[];
    initialCapital: number;
    commission?: number;
    slippage?: number;
}
export interface Trade {
    entryTime: number;
    exitTime: number;
    entryPrice: number;
    exitPrice: number;
    quantity: number;
    side: 'long' | 'short';
    pnl: number;
    pnlPercent: number;
}
export interface BacktestResult {
    equityCurve: Array<{
        timestamp: number;
        equity: number;
    }>;
    drawdownSeries: Array<{
        timestamp: number;
        drawdown: number;
    }>;
    returnsSeries: Array<{
        timestamp: number;
        return: number;
    }>;
    tradeLog: Trade[];
    summaryStats: {
        totalReturn: number;
        cagr: number;
        sharpe: number;
        sortino: number;
        maxDrawdown: number;
        calmar: number;
        winRate: number;
        profitFactor: number;
        volatility: number;
        totalTrades: number;
    };
}
export declare class BacktestEngine {
    run(params: BacktestParams): Promise<BacktestResult>;
    private executeStrategy;
    private executeBacktest;
    private calculateStats;
    private calculateDrawdown;
}
