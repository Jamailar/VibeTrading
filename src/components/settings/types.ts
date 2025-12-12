export interface AIConfig {
  provider: 'openai' | 'anthropic' | 'google';
  apiKey: string;
  baseURL: string;
  chatModel: string;
  thinkingModel: string;
}

export interface TestResult {
  success: boolean;
  message: string;
}

