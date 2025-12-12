import { parse } from '@babel/parser';
import traverse from '@babel/traverse';

const PROHIBITED_IMPORTS = [
  'fs', 'child_process', 'http', 'https', 'net', 'dgram', 'dns',
  'os', 'path', 'crypto', 'stream', 'util', 'url', 'querystring',
];

const PROHIBITED_GLOBALS = [
  'require', 'module', 'exports', 'global', 'process', 'Buffer',
  'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval',
];

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateStrategyCode(code: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    const ast = parse(code, {
      sourceType: 'module',
      plugins: ['typescript', 'objectRestSpread', 'asyncGenerators'],
    });

    traverse(ast, {
      CallExpression(path) {
        const node = path.node;
        
        if (node.callee.type === 'Identifier') {
          const name = node.callee.name;
          
          if (PROHIBITED_GLOBALS.includes(name)) {
            errors.push(`禁止使用全局函数: ${name}`);
          }
        }
      },
      MemberExpression(path) {
        const node = path.node;
        
        if (node.object.type === 'Identifier') {
          const objName = node.object.name;
          
          if (objName === 'process' || objName === 'global') {
            errors.push(`禁止访问: ${objName}`);
          }
        }
      },
      ImportDeclaration(path) {
        const source = path.node.source.value as string;
        
        if (PROHIBITED_IMPORTS.includes(source)) {
          errors.push(`禁止导入模块: ${source}`);
        }
      },
      VariableDeclarator(path) {
        if (path.node.init?.type === 'CallExpression') {
          const callee = path.node.init.callee;
          if (callee.type === 'Identifier' && callee.name === 'require') {
            const arg = path.node.init.arguments[0];
            if (arg?.type === 'StringLiteral') {
              const moduleName = arg.value;
              if (PROHIBITED_IMPORTS.includes(moduleName)) {
                errors.push(`禁止require模块: ${moduleName}`);
              }
            }
          }
        }
      },
    });

    if (code.includes('eval(') || code.includes('Function(')) {
      errors.push('禁止使用eval或Function构造函数');
    }

    if (code.includes('__proto__') || code.includes('constructor')) {
      warnings.push('检测到可能不安全的原型操作');
    }

  } catch (error) {
    errors.push(`代码解析失败: ${error instanceof Error ? error.message : String(error)}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
