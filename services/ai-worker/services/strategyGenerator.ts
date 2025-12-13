import { StateGraph, Annotation, START, END } from '@langchain/langgraph';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage, SystemMessage, AIMessage, BaseMessage } from '@langchain/core/messages';
import { Strategy, StrategyGenerationResult } from '../types/strategy';
import { validateStrategyCode } from './codeValidator';

const StrategyStateAnnotation = Annotation.Root({
  userMessage: Annotation<string>(),
  conversationHistory: Annotation<BaseMessage[]>({
    reducer: (x: BaseMessage[], y: BaseMessage[]) => [...(x || []), ...(y || [])],
    default: () => [],
  }),
  intent: Annotation<string>(),
  extractedInfo: Annotation<any>(),
  strategy: Annotation<Strategy>(),
  code: Annotation<string>(),
  explanation: Annotation<string>(),
  errors: Annotation<string[]>({
    reducer: (x: string[], y: string[]) => [...(x || []), ...(y || [])],
    default: () => [],
  }),
});

type StrategyState = typeof StrategyStateAnnotation.State;

export class StrategyGenerator {
  private llm: BaseChatModel;
  private graph: ReturnType<typeof this.buildGraph>;

  constructor(llm: BaseChatModel) {
    this.llm = llm;
    this.graph = this.buildGraph();
  }

  private buildGraph() {
    const graph = new StateGraph(StrategyStateAnnotation)
      .addNode('intentRecognition', this.intentRecognition.bind(this))
      .addNode('strategyExtraction', this.strategyExtraction.bind(this))
      .addNode('codeGeneration', this.codeGeneration.bind(this))
      .addNode('validation', this.validation.bind(this))
      .addNode('generateExplanation', this.explanation.bind(this))
      .addEdge(START, 'intentRecognition')
      .addEdge('intentRecognition', 'strategyExtraction')
      .addEdge('strategyExtraction', 'codeGeneration')
      .addEdge('codeGeneration', 'validation')
      .addEdge('validation', 'generateExplanation')
      .addEdge('generateExplanation', END);

    return graph.compile();
  }

  private async intentRecognition(state: StrategyState): Promise<Partial<StrategyState>> {
    // 如果有对话历史，构建完整的对话上下文
    const conversationContext = state.conversationHistory && state.conversationHistory.length > 0
      ? `对话历史:\n${state.conversationHistory.map((msg, idx) => {
          if (msg instanceof HumanMessage) {
            return `用户: ${msg.content}`;
          } else if (msg instanceof AIMessage) {
            return `助手: ${msg.content}`;
          }
          return '';
        }).join('\n')}\n\n`
      : '';

    const prompt = `分析以下用户消息${state.conversationHistory && state.conversationHistory.length > 0 ? '和对话历史' : ''}，识别交易策略意图。可能的意图类型包括：
- momentum: 动量策略
- mean_reversion: 均值回归策略
- breakout: 突破策略
- volatility: 波动率策略
- pairs: 配对交易策略
- trend_following: 趋势跟踪策略

${conversationContext}当前用户消息: ${state.userMessage}

请只返回意图类型（单个词），不要其他内容。`;

    const messages: BaseMessage[] = [
      new SystemMessage('你是一个专业的量化交易策略分析师。'),
    ];
    
    // 如果有对话历史，添加到消息列表
    if (state.conversationHistory && state.conversationHistory.length > 0) {
      messages.push(...state.conversationHistory);
    }
    
    messages.push(new HumanMessage(prompt));

    const response = await this.llm.invoke(messages);

    return { intent: response.content.toString().trim().toLowerCase() };
  }

  private async strategyExtraction(state: StrategyState): Promise<Partial<StrategyState>> {
    // 构建对话上下文
    const conversationContext = state.conversationHistory && state.conversationHistory.length > 0
      ? `对话历史:\n${state.conversationHistory.map((msg, idx) => {
          if (msg instanceof HumanMessage) {
            return `用户: ${msg.content}`;
          } else if (msg instanceof AIMessage) {
            return `助手: ${msg.content}`;
          }
          return '';
        }).join('\n')}\n\n`
      : '';

    const prompt = `基于用户消息${state.conversationHistory && state.conversationHistory.length > 0 ? '、对话历史' : ''}和识别的意图，提取策略的关键信息。

${conversationContext}当前用户消息: ${state.userMessage}
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

    const messages: BaseMessage[] = [
      new SystemMessage('你是一个专业的量化交易策略分析师，擅长从自然语言中提取结构化策略信息。'),
    ];
    
    // 如果有对话历史，添加到消息列表
    if (state.conversationHistory && state.conversationHistory.length > 0) {
      messages.push(...state.conversationHistory);
    }
    
    messages.push(new HumanMessage(prompt));

    const response = await this.llm.invoke(messages);

    try {
      const content = response.content.toString();
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const extractedInfo = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
      
      const strategy: Strategy = {
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
    } catch (error) {
      return { errors: [`策略提取失败: ${error instanceof Error ? error.message : String(error)}`] };
    }
  }

  private async codeGeneration(state: StrategyState): Promise<Partial<StrategyState>> {
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
      new SystemMessage('你是一个专业的量化交易策略代码生成器。'),
      new HumanMessage(prompt),
    ]);

    const code = response.content.toString().trim();
    const codeMatch = code.match(/```(?:javascript|js)?\n([\s\S]*?)\n```/) || [null, code];
    const cleanCode = codeMatch[1] || code;

    return { code: cleanCode };
  }

  private async validation(state: StrategyState): Promise<Partial<StrategyState>> {
    if (!state.code) {
      return { errors: ['代码缺失'] };
    }

    const validation = validateStrategyCode(state.code);
    return { errors: validation.errors || [] };
  }

  private async explanation(state: StrategyState): Promise<Partial<StrategyState>> {
    const prompt = `为以下策略生成简洁的中文说明：

策略信息:
${JSON.stringify(state.strategy, null, 2)}

请用2-3句话说明策略的核心逻辑和适用场景。`;

    const response = await this.llm.invoke([
      new SystemMessage('你是一个专业的量化交易策略分析师。'),
      new HumanMessage(prompt),
    ]);

    return { explanation: response.content.toString().trim() };
  }

  async generate(userMessage: string, conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []): Promise<StrategyGenerationResult> {
    // 将对话历史转换为 LangChain 消息格式
    const historyMessages: BaseMessage[] = conversationHistory.map((msg) => {
      if (msg.role === 'user') {
        return new HumanMessage(msg.content);
      } else {
        return new AIMessage(msg.content);
      }
    });

    const initialState = {
      userMessage,
      conversationHistory: historyMessages,
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
