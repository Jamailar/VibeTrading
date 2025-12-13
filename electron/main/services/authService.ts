import jwt from 'jsonwebtoken';
import { query, run } from '../database/duckdb';
import crypto from 'crypto';

export class AuthService {
  private jwtSecret: string = '';

  constructor() {
    // 从设置中获取或生成 JWT Secret
    this.initializeJWTSecret();
  }

  private async initializeJWTSecret() {
    try {
      const settings = await query('SELECT value FROM settings WHERE key = ?', ['jwt_secret']);
      
      if (settings.length > 0) {
        this.jwtSecret = settings[0].value as string;
      } else {
        // 生成新的 secret
        this.jwtSecret = crypto.randomBytes(32).toString('hex');
        await run(`INSERT INTO settings (key, value) VALUES (?, ?)
                   ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`, ['jwt_secret', this.jwtSecret]);
      }
    } catch (error) {
      // 如果表不存在或查询失败，使用默认值
      this.jwtSecret = crypto.randomBytes(32).toString('hex');
      console.warn('[AuthService] 无法从数据库读取 JWT Secret，使用临时值');
    }
  }

  async login(username: string, password: string): Promise<any> {
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

    const token = jwt.sign(
      { username, isAdmin: true },
      this.jwtSecret,
      { expiresIn: '7d' } // Electron 应用可以设置更长的过期时间
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

  async getCurrentUser(token?: string): Promise<any> {
    // 如果没有提供 token，返回 null（未登录）
    if (!token) {
      return null;
    }

    // 确保 JWT Secret 已初始化
    if (!this.jwtSecret) {
      await this.initializeJWTSecret();
    }
    
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as { username: string; isAdmin: boolean };
      return {
        success: true,
        user: decoded,
      };
    } catch (error) {
      return null;
    }
  }
}
