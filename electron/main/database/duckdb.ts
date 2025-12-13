 import { Database } from 'duckdb';
import path from 'path';
import { app } from 'electron';
import fs from 'fs';
import { promisify } from 'util';

let db: Database | null = null;
let connection: any = null;

export async function initializeDatabase() {
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'vibetrading.duckdb');

  console.log('[Database] 初始化 DuckDB 数据库:', dbPath);
  console.log('[Database] 检查 Database 类:', typeof Database, Database);

  // 确保目录存在
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
    console.log('[Database] 创建数据库目录:', dbDir);
  }

  return new Promise<void>((resolve, reject) => {
    let timeoutId: NodeJS.Timeout | null = null;
    let isResolved = false;

    const cleanup = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    const safeResolve = () => {
      if (!isResolved) {
        isResolved = true;
        cleanup();
        resolve();
      }
    };

    const safeReject = (error: Error) => {
      if (!isResolved) {
        isResolved = true;
        cleanup();
        reject(error);
      }
    };

    // 添加超时机制（10秒）
    timeoutId = setTimeout(() => {
      console.error('[Database] 数据库初始化超时（10秒）- 回调函数未被调用');
      console.error('[Database] 这可能是 DuckDB 原生模块在 Electron 中的兼容性问题');
      console.error('[Database] 尝试使用内存数据库作为后备方案...');
      
      // 尝试使用内存数据库
      try {
        db = new (Database as any)(':memory:', (err: Error | null) => {
          if (err) {
            console.error('[Database] 内存数据库也失败:', err);
            safeReject(new Error('数据库初始化超时且内存数据库也失败'));
            return;
          }

          console.log('[Database] 使用内存数据库成功');
          (db as any).connect((err: Error | null, conn: any) => {
            if (err) {
              safeReject(err);
              return;
            }
            connection = conn;
            createTables(conn)
              .then(async () => {
                console.log('[Database] 表创建完成，验证表结构...');
                const verification = await verifyTables();
                if (!verification.allExist) {
                  console.error('[Database] 部分表缺失:', verification.missing);
                  safeReject(new Error(`数据库表创建失败，缺失: ${verification.missing.join(', ')}`));
                  return;
                }
                console.log('[Database] 内存数据库初始化完成，所有表验证通过');
                safeResolve();
              })
              .catch(safeReject);
          });
        });
      } catch (error: any) {
        safeReject(new Error('数据库初始化超时且无法使用后备方案'));
      }
    }, 10000);

    console.log('[Database] 开始创建 Database 实例...');
    console.log('[Database] 数据库路径:', dbPath);
    
    try {
      // 创建数据库连接
      console.log('[Database] 调用 new Database()...');
      db = new (Database as any)(dbPath, (err: Error | null) => {
        console.log('[Database] Database 构造函数回调被调用, err:', err);
        
        if (err) {
          console.error('[Database] 数据库连接失败:', err);
          console.error('[Database] 错误详情:', err.message);
          console.error('[Database] 错误堆栈:', err.stack);
          safeReject(err);
          return;
        }

        console.log('[Database] Database 实例创建成功');
        console.log('[Database] 尝试直接使用 Database 对象（不调用 connect()）...');

        // 根据 DuckDB 文档，可以直接在 Database 对象上执行 SQL，无需 connect()
        // 将 Database 对象本身作为 connection 使用
        connection = db;
        console.log('[Database] 使用 Database 对象作为连接对象');

        // 直接使用 Database 对象创建表
        createTables(db as any)
          .then(async () => {
            console.log('[Database] 表创建完成，验证表结构...');
            // 验证表是否真正创建成功
            const verification = await verifyTables();
            if (!verification.allExist) {
              console.error('[Database] 部分表缺失:', verification.missing);
              console.error('[Database] 尝试重新创建缺失的表...');
              // 如果表缺失，尝试重新创建
              try {
                await createTables(db as any);
                const reVerification = await verifyTables();
                if (!reVerification.allExist) {
                  safeReject(new Error(`数据库表创建失败，缺失: ${reVerification.missing.join(', ')}`));
                  return;
                }
              } catch (retryError) {
                safeReject(new Error(`重新创建表失败: ${retryError instanceof Error ? retryError.message : String(retryError)}`));
                return;
              }
            }
            console.log('[Database] 数据库初始化完成（使用文件数据库），所有表验证通过');
            safeResolve();
          })
          .catch((error) => {
            console.error('[Database] 创建表失败:', error);
            console.error('[Database] 错误详情:', error?.message);
            safeReject(error);
          });
      });
      
      console.log('[Database] new Database() 调用完成，等待回调...');
    } catch (error: any) {
      console.error('[Database] 创建 Database 实例时抛出同步异常:', error);
      console.error('[Database] 错误详情:', error?.message);
      console.error('[Database] 错误堆栈:', error?.stack);
      safeReject(error);
    }
  });
}

function createTables(conn: any): Promise<void> {
  return new Promise((resolve, reject) => {
    const statements = [
      {
        name: 'users',
        sql: `CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY,
          username TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
      },
      {
        name: 'strategies',
        sql: `CREATE TABLE IF NOT EXISTS strategies (
          id INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          strategy_json TEXT NOT NULL,
          strategy_code TEXT,
          explanation TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
      },
      {
        name: 'backtest_runs',
        sql: `CREATE TABLE IF NOT EXISTS backtest_runs (
          id INTEGER PRIMARY KEY,
          strategy_id INTEGER,
          status TEXT NOT NULL DEFAULT 'pending',
          parameters TEXT,
          results TEXT,
          started_at TIMESTAMP,
          completed_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
      },
      {
        name: 'conversations',
        sql: `CREATE TABLE IF NOT EXISTS conversations (
          id INTEGER PRIMARY KEY,
          title TEXT,
          messages TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
      },
      {
        name: 'settings',
        sql: `CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
      },
    ];

    let completed = 0;
    const total = statements.length;
    const errors: Array<{ table: string; error: Error }> = [];

    statements.forEach(({ name, sql }) => {
      conn.run(sql, (err: Error | null) => {
        if (err) {
          // 忽略 "already exists" 错误
          if (!err.message.includes('already exists') && !err.message.includes('duplicate')) {
            console.error(`[Database] 创建表 ${name} 失败:`, err);
            errors.push({ table: name, error: err });
          } else {
            console.log(`[Database] 表 ${name} 已存在`);
          }
        } else {
          console.log(`[Database] 表 ${name} 创建成功`);
        }
        completed++;
        if (completed === total) {
          if (errors.length > 0) {
            reject(new Error(`创建表失败: ${errors.map(e => e.table).join(', ')}`));
          } else {
            resolve();
          }
        }
      });
    });
  });
}

// 验证表是否存在
export async function verifyTables(): Promise<{ allExist: boolean; missing: string[] }> {
  const requiredTables = ['users', 'strategies', 'backtest_runs', 'conversations', 'settings'];
  const missing: string[] = [];

  for (const tableName of requiredTables) {
    try {
      await query(`SELECT 1 FROM ${tableName} LIMIT 1`);
      console.log(`[Database] 表 ${tableName} 存在`);
    } catch (error: any) {
      // 如果查询失败，可能是表不存在
      if (error.message.includes('does not exist') || error.message.includes('not found')) {
        console.warn(`[Database] 表 ${tableName} 不存在`);
        missing.push(tableName);
      } else {
        // 其他错误（如权限问题）也记录
        console.warn(`[Database] 验证表 ${tableName} 时出错:`, error.message);
        missing.push(tableName);
      }
    }
  }

  return {
    allExist: missing.length === 0,
    missing,
  };
}

export function getDatabase(): any {
  if (!connection) {
    throw new Error('Database not initialized');
  }
  return connection;
}

export function getDatabaseInstance(): Database {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
}

export function closeDatabase() {
  if (connection) {
    connection.close((err: Error | null) => {
      if (err) {
        console.error('[Database] 关闭连接失败:', err);
      }
    });
    connection = null;
  }
  if (db) {
    db.close((err: Error | null) => {
      if (err) {
        console.error('[Database] 关闭数据库失败:', err);
      }
    });
    db = null;
  }
}

// 辅助函数：执行查询
export function query(sql: string, params?: any[]): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const conn = getDatabase();
    // 如果没有提供参数，直接执行 SQL，不传递空数组
    if (!params || params.length === 0) {
      conn.all(sql, (err: Error | null, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    } else {
      conn.all(sql, params, (err: Error | null, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    }
  });
}

// 辅助函数：执行更新
export function run(sql: string, params?: any[]): Promise<{ lastInsertRowid: number; changes: number }> {
  return new Promise((resolve, reject) => {
    const conn = getDatabase();
    const callback = function(this: any, err: Error | null) {
      if (err) {
        reject(err);
      } else {
        resolve({
          lastInsertRowid: this?.lastID || 0,
          changes: this?.changes || 0,
        });
      }
    };

    // DuckDB 的 run 方法不支持参数数组，需要展开传入
    if (!params || params.length === 0) {
      conn.run(sql, callback);
      return;
    }

    if (Array.isArray(params)) {
      conn.run(sql, ...params, callback);
    } else {
      conn.run(sql, params, callback);
    }
  });
}
