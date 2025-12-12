"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StrategyGenerator = void 0;
const langgraph_1 = require("@langchain/langgraph");
const messages_1 = require("@langchain/core/messages");
const codeValidator_1 = require("./codeValidator");
const StrategyStateAnnotation = langgraph_1.Annotation.Root({
    userMessage: (0, langgraph_1.Annotation)(),
    intent: (0, langgraph_1.Annotation)(),
    extractedInfo: (0, langgraph_1.Annotation)(),
    strategy: (0, langgraph_1.Annotation)(),
    code: (0, langgraph_1.Annotation)(),
    explanation: (0, langgraph_1.Annotation)(),
    errors: (0, langgraph_1.Annotation)({
        reducer: (x, y) => [...(x || []), ...(y || [])],
        default: () => [],
    }),
});
class StrategyGenerator {
    constructor(llm) {
        this.llm = llm;
        this.graph = this.buildGraph();
    }
    buildGraph() {
        const graph = new langgraph_1.StateGraph(StrategyStateAnnotation)
            .addNode('intentRecognition', this.intentRecognition.bind(this))
            .addNode('strategyExtraction', this.strategyExtraction.bind(this))
            .addNode('codeGeneration', this.codeGeneration.bind(this))
            .addNode('validation', this.validation.bind(this))
            .addNode('explanation', this.explanation.bind(this))
            .addEdge(langgraph_1.START, 'intentRecognition')
            .addEdge('intentRecognition', 'strategyExtraction')
            .addEdge('strategyExtraction', 'codeGeneration')
            .addEdge('codeGeneration', 'validation')
            .addEdge('validation', 'explanation')
            .addEdge('explanation', langgraph_1.END);
        return graph.compile();
    }
    async intentRecognition(state) {
        const prompt = `分析以下用户消息，识别交易策略意图。可能的意图类型包括：
- momentum: 动量策略
- mean_reversion: 均值回归策略
- breakout: 突破策略
- volatility: 波动率策略
- pairs: 配对交易策略
- trend_following: 趋势跟踪策略

用户消息: ${state.userMessage}

请只返回意图类型（单个词），不要其他内容。`;
        const response = await this.llm.invoke([
            new messages_1.SystemMessage('你是一个专业的量化交易策略分析师。'),
            new messages_1.HumanMessage(prompt),
        ]);
        return { intent: response.content.toString().trim().toLowerCase() };
    }
    async strategyExtraction(state) {
        const prompt = `基于用户消息和识别的意图，提取策略的关键信息。

用户消息: ${state.userMessage}
意图: ${state.intent}

请提取以下信息（以JSON格式返回）：
{
  "assets": ["资产列表"],
  "timeframe": "时间框架（如1h, 1d）",
  "indicators": [{"name": "指标名称", "params": {参数}}],
  "entryConditions": [{"type": "条件类型", "operator": "操作符", "value": 值}],
  "exitConditions": [{"type": "条件类型", "operator": "操作符", "value": 值}],
  "stopLoss": 止损百分比（可选）,
  "takeProfit": 止盈百分比（可选）,
  "positionSize": 仓位大小（可选）
}`;
        const response = await this.llm.invoke([
            new messages_1.SystemMessage('你是一个专业的量化交易策略分析师，擅长从自然语言中提取结构化策略信息。'),
            new messages_1.HumanMessage(prompt),
        ]);
        try {
            const content = response.content.toString();
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            const extractedInfo = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
            const strategy = {
                name: `策略_${Date.now()}`,
                description: state.userMessage,
                assets: extractedInfo.assets || ['BTC/USDT'],
                timeframe: extractedInfo.timeframe || '1h',
                indicators: extractedInfo.indicators || [],
                entryConditions: extractedInfo.entryConditions || [],
                exitConditions: extractedInfo.exitConditions || [],
                stopLoss: extractedInfo.stopLoss,
                takeProfit: extractedInfo.takeProfit,
                positionSize: extractedInfo.positionSize,
            };
            return { extractedInfo, strategy };
        }
        catch (error) {
            return { errors: [`策略提取失败: ${error instanceof Error ? error.message : String(error)}`] };
        }
    }
    async codeGeneration(state) {
        if (!state.strategy) {
            return { errors: ['策略信息缺失'] };
        }
        const prompt = `基于以下策略信息，生成可执行的JavaScript策略代码。

策略信息:
${JSON.stringify(state.strategy, null, 2)}

要求：
1. 使用technicalindicators库计算技术指标
2. 代码必须是一个函数，接受data数组（OHLCV数据）作为参数
3. 返回买入/卖出信号数组
4. 不要使用任何文件系统、网络或子进程操作
5. 代码必须安全且可执行

只返回JavaScript代码，不要其他说明。`;
        const response = await this.llm.invoke([
            new messages_1.SystemMessage('你是一个专业的量化交易策略代码生成器。'),
            new messages_1.HumanMessage(prompt),
        ]);
        const code = response.content.toString().trim();
        const codeMatch = code.match(/```(?:javascript|js)?\n([\s\S]*?)\n```/) || [null, code];
        const cleanCode = codeMatch[1] || code;
        return { code: cleanCode };
    }
    async validation(state) {
        if (!state.code) {
            return { errors: ['代码缺失'] };
        }
        const validation = (0, codeValidator_1.validateStrategyCode)(state.code);
        return { errors: validation.errors || [] };
    }
    async explanation(state) {
        const prompt = `为以下策略生成简洁的中文说明：

策略信息:
${JSON.stringify(state.strategy, null, 2)}

请用2-3句话说明策略的核心逻辑和适用场景。`;
        const response = await this.llm.invoke([
            new messages_1.SystemMessage('你是一个专业的量化交易策略分析师。'),
            new messages_1.HumanMessage(prompt),
        ]);
        return { explanation: response.content.toString().trim() };
    }
    async generate(userMessage) {
        const initialState = {
            userMessage,
            errors: [],
        };
        const result = await this.graph.invoke(initialState);
        if (!result.strategy || !result.code) {
            throw new Error('策略生成失败: ' + (result.errors?.join(', ') || '未知错误'));
        }
        return {
            strategy: result.strategy,
            code: result.code,
            explanation: result.explanation || '',
            validation: {
                isValid: !result.errors || result.errors.length === 0,
                errors: result.errors || [],
            },
        };
    }
}
exports.StrategyGenerator = StrategyGenerator;
//# sourceMappingURL=strategyGenerator.js.map