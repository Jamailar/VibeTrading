"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeDatabase = initializeDatabase;
exports.getDatabase = getDatabase;
exports.getDatabaseInstance = getDatabaseInstance;
exports.closeDatabase = closeDatabase;
exports.query = query;
exports.run = run;
const duckdb_1 = require("duckdb");
const path_1 = __importDefault(require("path"));
const electron_1 = require("electron");
const fs_1 = __importDefault(require("fs"));
let db = null;
let connection = null;
async function initializeDatabase() {
    const userDataPath = electron_1.app.getPath('userData');
    const dbPath = path_1.default.join(userDataPath, 'vibetrading.duckdb');
    console.log('[Database] 初始化 DuckDB 数据库:', dbPath);
    // 确保目录存在
    const dbDir = path_1.default.dirname(dbPath);
    if (!fs_1.default.existsSync(dbDir)) {
        fs_1.default.mkdirSync(dbDir, { recursive: true });
    }
    return new Promise((resolve, reject) => {
        // 创建数据库连接
        db = new duckdb_1.Database(dbPath, (err) => {
            if (err) {
                console.error('[Database] 数据库连接失败:', err);
                reject(err);
                return;
            }
            // 创建连接
            // @ts-ignore - DuckDB connect method signature
            db.connect((err, conn) => {
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
function createTables(conn) {
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
            conn.run(sql, (err) => {
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
function getDatabase() {
    if (!connection) {
        throw new Error('Database not initialized');
    }
    return connection;
}
function getDatabaseInstance() {
    if (!db) {
        throw new Error('Database not initialized');
    }
    return db;
}
function closeDatabase() {
    if (connection) {
        connection.close((err) => {
            if (err) {
                console.error('[Database] 关闭连接失败:', err);
            }
        });
        connection = null;
    }
    if (db) {
        db.close((err) => {
            if (err) {
                console.error('[Database] 关闭数据库失败:', err);
            }
        });
        db = null;
    }
}
// 辅助函数：执行查询
function query(sql, params = []) {
    return new Promise((resolve, reject) => {
        const conn = getDatabase();
        conn.all(sql, params, (err, rows) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(rows);
            }
        });
    });
}
// 辅助函数：执行更新
function run(sql, params = []) {
    return new Promise((resolve, reject) => {
        const conn = getDatabase();
        conn.run(sql, params, function (err) {
            if (err) {
                reject(err);
            }
            else {
                resolve({
                    lastInsertRowid: this.lastID || 0,
                    changes: this.changes || 0,
                });
            }
        });
    });
}
//# sourceMappingURL=duckdb.js.map