import { StateGraph, Annotation, START, END } from '@langchain/langgraph';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage, SystemMessage, AIMessage, BaseMessage } from '@langchain/core/messages';
import { Strategy, StrategyGenerationResult } from '../types/strategy';
import { validateStrategyCode } from './codeValidator';
import { EditFileTool, ReadFileTool, ValidateJsonTool } from '../tools';

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
  private tools: Array<EditFileTool | ReadFileTool | ValidateJsonTool>;

  constructor(llm: BaseChatModel) {
    this.llm = llm;
    this.tools = [
      new EditFileTool(),
      new ReadFileTool(),
      new ValidateJsonTool(),
    ];
    this.graph = this.buildGraph();
  }

  getTools() {
    return this.tools;
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

  async *generateStream(
    userMessage: string, 
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [],
    currentFileContent?: string
  ): AsyncIterableIterator<{ type: string; data: any }> {
    // 检查是否是编辑现有文件的请求
    if (currentFileContent) {
      const isEditRequest = await this.detectEditIntent(userMessage, conversationHistory);
      
      if (isEditRequest) {
        yield { type: 'thinking', data: { step: '检测到文件编辑请求', status: 'processing' } };
        const result = await this.generateEditSuggestion(userMessage, conversationHistory, currentFileContent);
        yield { type: 'final_result', data: result };
        return;
      }
    }

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

    // 使用流式输出
    try {
      // LangGraph的stream方法返回一个异步迭代器
      // 使用类型断言避免类型检查问题
      const stream = this.graph.stream(initialState) as any;
      
      for await (const event of stream) {
        // 处理每个节点的事件
        for (const [nodeName, nodeState] of Object.entries(event)) {
          if (nodeName === '__end__') {
            // 最终结果
            const result = nodeState as StrategyState;
            if (!result.strategy || !result.code) {
              yield { 
                type: 'error', 
                data: { message: '策略生成失败: ' + (result.errors?.join(', ') || '未知错误') } 
              };
              return;
            }

            yield {
              type: 'final_result',
              data: {
                strategy: result.strategy,
                code: result.code,
                explanation: result.explanation || '',
                validation: {
                  isValid: !result.errors || result.errors.length === 0,
                  errors: result.errors || [],
                },
              },
            };
          } else {
            // 节点开始执行
            yield {
              type: 'node_start',
              data: {
                node: nodeName,
                message: `开始执行: ${nodeName}`,
              },
            };
            
            // 节点执行完成
            yield {
              type: 'node_end',
              data: {
                node: nodeName,
                state: nodeState,
              },
            };
          }
        }
      }
    } catch (error: any) {
      yield {
        type: 'error',
        data: { message: error.message || '流式生成失败' },
      };
    }
  }

  async generate(
    userMessage: string, 
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [],
    currentFileContent?: string
  ): Promise<StrategyGenerationResult> {
    // 检查是否是编辑现有文件的请求
    if (currentFileContent) {
      const isEditRequest = await this.detectEditIntent(userMessage, conversationHistory);
      
      if (isEditRequest) {
        return await this.generateEditSuggestion(userMessage, conversationHistory, currentFileContent);
      }
    }

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

  private async detectEditIntent(
    userMessage: string,
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
  ): Promise<boolean> {
    const editKeywords = ['修改', '更新', '改变', '调整', '编辑', '改', '改成', '改为', '改成', '替换', '修改为'];
    const lowerMessage = userMessage.toLowerCase();
    
    // 检查是否包含编辑关键词
    const hasEditKeyword = editKeywords.some(keyword => lowerMessage.includes(keyword));
    
    // 也可以让 AI 判断
    const conversationContext = conversationHistory.length > 0
      ? `对话历史:\n${conversationHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n')}\n\n`
      : '';

    const prompt = `判断用户是否想要修改现有的策略文件内容。

${conversationContext}当前用户消息: ${userMessage}

请只返回 "yes" 或 "no"，不要其他内容。`;

    try {
      const response = await this.llm.invoke([
        new SystemMessage('你是一个专业的意图识别助手。'),
        new HumanMessage(prompt),
      ]);

      const answer = response.content.toString().trim().toLowerCase();
      return answer.includes('yes') || hasEditKeyword;
    } catch (error) {
      // 如果 AI 判断失败，使用关键词判断
      return hasEditKeyword;
    }
  }

  private async generateEditSuggestion(
    userMessage: string,
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
    currentFileContent: string
  ): Promise<StrategyGenerationResult> {
    const conversationContext = conversationHistory.length > 0
      ? `对话历史:\n${conversationHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n')}\n\n`
      : '';

    const prompt = `用户想要修改现有的策略 JSON 文件。请根据用户的要求，生成修改后的完整 JSON 内容。

${conversationContext}当前用户消息: ${userMessage}

当前文件内容:
\`\`\`json
${currentFileContent}
\`\`\`

要求：
1. 根据用户的要求修改 JSON 内容
2. 保持 JSON 格式正确
3. 返回完整的修改后的 JSON 内容
4. 如果用户要求不明确，保持原有内容不变

请只返回修改后的 JSON 内容，不要其他说明。`;

    try {
      const response = await this.llm.invoke([
        new SystemMessage('你是一个专业的代码编辑器，擅长根据用户要求修改 JSON 文件内容。'),
        new HumanMessage(prompt),
      ]);

      let newContent = response.content.toString().trim();
      
      // 尝试提取 JSON 内容
      const jsonMatch = newContent.match(/```(?:json)?\n([\s\S]*?)\n```/) || newContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        newContent = jsonMatch[1] || jsonMatch[0];
      }

      // 验证 JSON 格式
      try {
        JSON.parse(newContent);
      } catch (error) {
        throw new Error('生成的 JSON 格式无效');
      }

      const editSuggestion = {
        id: `edit_${Date.now()}`,
        originalContent: currentFileContent,
        newContent: newContent,
        description: `根据用户要求修改: ${userMessage.substring(0, 50)}${userMessage.length > 50 ? '...' : ''}`,
        timestamp: Date.now(),
      };

      return {
        explanation: '已生成编辑建议，请在右侧面板查看并选择接受或拒绝。',
        fileEditSuggestion: editSuggestion,
      };
    } catch (error) {
      throw new Error(`生成编辑建议失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
