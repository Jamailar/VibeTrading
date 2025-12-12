import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { StrategyGenerationResult } from '../types/strategy';
export declare class StrategyGenerator {
    private llm;
    private graph;
    constructor(llm: BaseChatModel);
    private buildGraph;
    private intentRecognition;
    private strategyExtraction;
    private codeGeneration;
    private validation;
    private explanation;
    generate(userMessage: string): Promise<StrategyGenerationResult>;
}
