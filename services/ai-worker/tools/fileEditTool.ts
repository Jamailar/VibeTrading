import { Tool } from '@langchain/core/tools';

// 文件编辑工具
export class EditFileTool extends Tool {
  name = 'edit_file';
  description = '编辑文件内容。生成文件编辑建议，包含原始内容和新内容。用户需要确认后才能应用更改。参数: {originalContent: string, newContent: string, description?: string}';

  async _call(input: string): Promise<string> {
    let parsedInput: any;
    try {
      parsedInput = typeof input === 'string' ? JSON.parse(input) : input;
    } catch {
      parsedInput = { originalContent: '', newContent: input, description: '' };
    }
    // 验证新内容的JSON格式
    try {
      JSON.parse(parsedInput.newContent || parsedInput);
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: '生成的JSON格式无效',
        originalContent: parsedInput.originalContent || '',
      });
    }

    // 返回编辑建议
    return JSON.stringify({
      success: true,
      editSuggestion: {
        id: `edit_${Date.now()}`,
        originalContent: parsedInput.originalContent || '',
        newContent: parsedInput.newContent || parsedInput,
        description: parsedInput.description || 'AI建议的编辑',
        timestamp: Date.now(),
      },
    });
  }
}

// 读取文件工具
export class ReadFileTool extends Tool {
  name = 'read_file';
  description = '读取文件内容。用于获取当前文件的内容以便进行分析和编辑。参数: {content: string}';

  async _call(input: string): Promise<string> {
    let parsedInput: any;
    try {
      parsedInput = typeof input === 'string' ? JSON.parse(input) : input;
    } catch {
      parsedInput = { content: input };
    }
    
    // 验证内容是否为有效JSON
    try {
      const parsed = JSON.parse(parsedInput.content || input);
      return JSON.stringify({
        success: true,
        content: parsedInput.content || input,
        parsed: parsed,
        isValid: true,
      });
    } catch (error) {
      return JSON.stringify({
        success: false,
        content: parsedInput.content || input,
        isValid: false,
        error: '文件内容不是有效的JSON格式',
      });
    }
  }
}

// 验证JSON工具
export class ValidateJsonTool extends Tool {
  name = 'validate_json';
  description = '验证JSON内容的格式是否正确。返回验证结果和错误信息（如果有）。参数: {content: string}';

  async _call(input: string): Promise<string> {
    let parsedInput: any;
    try {
      parsedInput = typeof input === 'string' ? JSON.parse(input) : input;
    } catch {
      parsedInput = { content: input };
    }
    
    try {
      const parsed = JSON.parse(parsedInput.content || input);
      return JSON.stringify({
        success: true,
        isValid: true,
        parsed: parsed,
      });
    } catch (error: any) {
      return JSON.stringify({
        success: false,
        isValid: false,
        error: error.message || 'JSON格式错误',
      });
    }
  }
}

