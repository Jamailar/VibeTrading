# 故障排查指南

## Electron 窗口没有打开

### 检查步骤

1. **检查编译是否成功**
   ```bash
   npm run build:electron
   ```
   确保没有编译错误，并且 `dist-electron/main/main.js` 文件存在。

2. **检查终端输出**
   运行 `npm run dev` 后，查看终端中是否有错误信息：
   - `[Main] Electron 应用准备就绪` - Electron 已启动
   - `[Main] 开始初始化数据库...` - 数据库初始化开始
   - `[Database] 数据库连接成功` - 数据库连接成功
   - `[Main] 开始初始化服务...` - 服务初始化开始
   - `[ServiceManager] 服务初始化完成` - 服务初始化完成
   - `[Main] 创建窗口...` - 窗口创建开始
   - `[Main] 窗口准备就绪，显示窗口` - 窗口应该显示

3. **检查是否有错误**
   如果看到以下错误，说明有问题：
   - `[Database] 数据库连接失败` - 数据库初始化失败
   - `[ServiceManager] 服务初始化失败` - 服务初始化失败
   - `[Main] 初始化失败` - 整体初始化失败
   - `[Main] 窗口加载失败` - 前端加载失败

4. **手动测试 Electron**
   ```bash
   # 确保 Vite 正在运行（另一个终端）
   npm run dev:vite
   
   # 在另一个终端运行 Electron
   NODE_ENV=development electron .
   ```

5. **检查窗口是否被隐藏**
   - 检查 Dock（macOS）或任务栏中是否有 Electron 图标
   - 尝试点击图标查看是否有窗口
   - 检查是否有其他窗口遮挡

6. **检查前端是否正确加载**
   - 在浏览器中访问 http://localhost:5173 应该能看到内容
   - 如果浏览器中也看不到，说明前端有问题

### 常见问题

#### 问题 1: 数据库初始化失败

**症状**: 终端显示 `[Database] 数据库连接失败`

**解决方案**:
1. 检查用户数据目录权限
2. 删除数据库文件重新创建：
   ```bash
   rm ~/Library/Application\ Support/vibetrading/vibetrading.duckdb
   ```

#### 问题 2: 服务初始化失败

**症状**: 终端显示 `[ServiceManager] 服务初始化失败`

**可能原因**:
- LLM API Key 未设置（如果使用 AI 功能）
- 依赖包缺失

**解决方案**:
1. 检查 `.env` 文件中的 API Key 配置
2. 运行 `npm install` 确保所有依赖已安装

#### 问题 3: 窗口创建但未显示

**症状**: 看到 `[Main] 创建窗口...` 但没有 `[Main] 窗口准备就绪`

**可能原因**:
- 前端加载失败
- Vite 服务器未启动

**解决方案**:
1. 确保 Vite 正在运行（http://localhost:5173）
2. 检查前端代码是否有错误

### 调试技巧

1. **查看完整日志**
   所有日志都会显示在运行 `npm run dev` 的终端中

2. **使用开发者工具**
   如果窗口打开了，按 `Cmd+Option+I` (macOS) 打开开发者工具

3. **检查进程**
   ```bash
   # macOS
   ps aux | grep -i electron
   
   # 查看是否有 Electron 进程在运行
   ```

4. **清理重建**
   ```bash
   # 删除编译输出
   rm -rf dist-electron dist
   
   # 重新编译
   npm run build:electron
   
   # 重新启动
   npm run dev
   ```
