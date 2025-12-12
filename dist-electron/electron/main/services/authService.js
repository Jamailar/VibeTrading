"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const duckdb_1 = require("../database/duckdb");
const crypto_1 = __importDefault(require("crypto"));
class AuthService {
    constructor() {
        this.jwtSecret = '';
        // 从设置中获取或生成 JWT Secret
        this.initializeJWTSecret();
    }
    async initializeJWTSecret() {
        try {
            const settings = await (0, duckdb_1.query)('SELECT value FROM settings WHERE key = ?', ['jwt_secret']);
            if (settings.length > 0) {
                this.jwtSecret = settings[0].value;
            }
            else {
                // 生成新的 secret
                this.jwtSecret = crypto_1.default.randomBytes(32).toString('hex');
                await (0, duckdb_1.run)('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['jwt_secret', this.jwtSecret]);
            }
        }
        catch (error) {
            // 如果表不存在或查询失败，使用默认值
            this.jwtSecret = crypto_1.default.randomBytes(32).toString('hex');
            console.warn('[AuthService] 无法从数据库读取 JWT Secret，使用临时值');
        }
    }
    async login(username, password) {
        // 确保 JWT Secret 已初始化
        if (!this.jwtSecret) {
            await this.initializeJWTSecret();
        }
        // 从环境变量或设置中获取管理员账号密码
        const adminUsername = process.env.ADMIN_USERNAME || 'admin';
        const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
        if (username !== adminUsername || password !== adminPassword) {
            throw new Error('用户名或密码错误');
        }
        const token = jsonwebtoken_1.default.sign({ username, isAdmin: true }, this.jwtSecret, { expiresIn: '7d' } // Electron 应用可以设置更长的过期时间
        );
        return {
            success: true,
            token,
            user: { username, isAdmin: true },
        };
    }
    async logout() {
        // Electron 应用中，登出主要是清除客户端存储的 token
        return { success: true };
    }
    async getCurrentUser(token) {
        // 如果没有提供 token，返回 null（未登录）
        if (!token) {
            return null;
        }
        // 确保 JWT Secret 已初始化
        if (!this.jwtSecret) {
            await this.initializeJWTSecret();
        }
        try {
            const decoded = jsonwebtoken_1.default.verify(token, this.jwtSecret);
            return {
                success: true,
                user: decoded,
            };
        }
        catch (error) {
            return null;
        }
    }
}
exports.AuthService = AuthService;
//# sourceMappingURL=authService.js.map