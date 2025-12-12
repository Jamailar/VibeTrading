"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLLM = createLLM;
const openai_1 = require("@langchain/openai");
const anthropic_1 = require("@langchain/anthropic");
const google_genai_1 = require("@langchain/google-genai");
function createLLM() {
    const provider = process.env.LLM_PROVIDER || 'openai';
    const model = process.env.LLM_MODEL || 'gpt-4o';
    const temperature = parseFloat(process.env.LLM_TEMPERATURE || '0.7');
    const maxTokens = parseInt(process.env.LLM_MAX_TOKENS || '4000');
    switch (provider) {
        case 'openai': {
            const apiKey = process.env.OPENAI_API_KEY;
            if (!apiKey) {
                throw new Error('OPENAI_API_KEY未设置');
            }
            const baseURL = process.env.OPENAI_API_BASE;
            return new openai_1.ChatOpenAI({
                model: model,
                temperature,
                maxTokens,
                openAIApiKey: apiKey,
                configuration: baseURL ? { baseURL } : undefined,
            });
        }
        case 'anthropic': {
            const apiKey = process.env.ANTHROPIC_API_KEY;
            if (!apiKey) {
                throw new Error('ANTHROPIC_API_KEY未设置');
            }
            const baseURL = process.env.ANTHROPIC_API_BASE;
            return new anthropic_1.ChatAnthropic({
                model: model,
                temperature,
                maxTokens,
                anthropicApiKey: apiKey,
                anthropicApiUrl: baseURL,
            });
        }
        case 'google': {
            const apiKey = process.env.GOOGLE_API_KEY;
            if (!apiKey) {
                throw new Error('GOOGLE_API_KEY未设置');
            }
            const baseURL = process.env.GOOGLE_API_BASE;
            return new google_genai_1.ChatGoogleGenerativeAI({
                model: model,
                temperature,
                maxOutputTokens: maxTokens,
                apiKey,
                ...(baseURL && { baseURL }),
            });
        }
        default:
            throw new Error(`不支持的LLM提供商: ${provider}`);
    }
}
//# sourceMappingURL=llm.js.map