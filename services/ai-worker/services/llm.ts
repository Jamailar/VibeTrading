import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';

export function createLLM(): any {
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
      return new ChatOpenAI({
        model: model,
        temperature,
        maxTokens,
        openAIApiKey: apiKey,
        configuration: baseURL ? { baseURL } : undefined,
      } as any);
    }
    case 'anthropic': {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new Error('ANTHROPIC_API_KEY未设置');
      }
      const baseURL = process.env.ANTHROPIC_API_BASE;
      return new ChatAnthropic({
        model: model,
        temperature,
        maxTokens,
        anthropicApiKey: apiKey,
        anthropicApiUrl: baseURL,
      } as any);
    }
    case 'google': {
      const apiKey = process.env.GOOGLE_API_KEY;
      if (!apiKey) {
        throw new Error('GOOGLE_API_KEY未设置');
      }
      const baseURL = process.env.GOOGLE_API_BASE;
      return new ChatGoogleGenerativeAI({
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
