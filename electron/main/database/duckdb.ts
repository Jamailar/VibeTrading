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

  // 确保目录存在
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  return new Promise<void>((resolve, reject) => {
    // 创建数据库连接
    db = new (Database as any)(dbPath, (err: Error | null) => {
      if (err) {
        console.error('[Database] 数据库连接失败:', err);
        reject(err);
        return;
      }

      // 创建连接
      // @ts-ignore - DuckDB connect method signature
      (db as any).connect((err: Error | null, conn: any) => {
        if (err) {
          console.error('[Database] 创建连接失败:', err);
          reject(err);
          return;
        }

        connection = conn;
        console.log('[Database] 数据库连接成功');

        // 创建表
        createTables(conn)
          .then(() => {
            console.log('[Database] 数据库初始化完成');
            resolve();
          })
          .catch(reject);
      });
    });
  });
}

function createTables(conn: any): Promise<void> {
  return new Promise((resolve, reject) => {
    const statements = [
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS strategies (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        strategy_json TEXT NOT NULL,
        strategy_code TEXT,
        explanation TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS backtest_runs (
        id INTEGER PRIMARY KEY,
        strategy_id INTEGER,
        status TEXT NOT NULL DEFAULT 'pending',
        parameters TEXT,
        results TEXT,
        started_at TIMESTAMP,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS conversations (
        id INTEGER PRIMARY KEY,
        title TEXT,
        messages TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
    ];

    let completed = 0;
    const total = statements.length;

    statements.forEach((sql) => {
      conn.run(sql, (err: Error | null) => {
        if (err) {
          // 忽略 "already exists" 错误
          if (!err.message.includes('already exists') && !err.message.includes('duplicate')) {
            console.error('[Database] 创建表失败:', err, sql);
            reject(err);
            return;
          }
        }
        completed++;
        if (completed === total) {
          resolve();
        }
      });
    });
  });
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
export function query(sql: string, params: any[] = []): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const conn = getDatabase();
    conn.all(sql, params, (err: Error | null, rows: any[]) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

// 辅助函数：执行更新
export function run(sql: string, params: any[] = []): Promise<{ lastInsertRowid: number; changes: number }> {
  return new Promise((resolve, reject) => {
    const conn = getDatabase();
    conn.run(sql, params, function(err: Error | null) {
      if (err) {
        reject(err);
      } else {
        resolve({
          lastInsertRowid: this.lastID || 0,
          changes: this.changes || 0,
        });
      }
    });
  });
}
