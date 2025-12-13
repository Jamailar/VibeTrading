# VibeTrading

![VibeTrading Logo](images/image01.jpg)

create your trading strategies just by chatting

![VibeTrading Screenshot](images/image.png)

VibeTrading 是一个基于 Electron 的开源桌面应用，让人们通过与 AI 聊天的方式创建量化交易策略、并立即完成回测，支持美股、港股与比特币等市场。它不是给专业量化团队的黑箱，而是面向好奇者、学习者与独立开发者的开放实验室。值得一提的是，该项目源于 Miyoo AI Club 的一次活动，成员之间自发组织的一次开源实验，在"能不能把交易策略做成对话式体验"的讨论中自然诞生，并持续由社区共同完善。

VibeTrading is an open-source Electron desktop application that lets you build quantitative trading strategies simply by chatting with AI—then instantly backtest them across U.S. stocks, Hong Kong equities, and Bitcoin. It's not a closed, institutional quant system, but a playground for curious builders, traders, and learners. The project originated from an activity inside the Miyoo AI Club, where members spontaneously launched a collaborative open-source experiment to explore whether trading strategy creation could become conversational—and it has grown with the community ever since.

## 特性

- 🤖 **AI 策略生成** - 使用 LangChain + LangGraph 通过对话生成交易策略，支持流式输出
- 💬 **智能文件编辑** - AI 可以主动编辑策略文件，支持 diff 预览和 Accept/Reject 确认（类似 Cursor）
- 🧠 **思考过程可视化** - 实时显示 AI 的推理步骤和 LangGraph 节点执行状态
- 🛠️ **LangChain Tools 集成** - AI 可以调用工具（编辑文件、读取文件、验证 JSON）完成复杂任务
- 📊 **回测引擎** - 完整的回测系统，支持多种性能指标
- 📈 **市场数据** - 支持股票和加密货币数据获取
- 💾 **本地存储** - 使用 DuckDB 本地数据库，数据完全在本地
- 🖥️ **桌面应用** - 基于 Electron，支持 macOS、Windows、Linux，无需服务器部署
- 🔒 **安全执行** - 策略代码在沙箱中安全执行

## 快速开始

### 前置要求

- **Node.js** 20+
- **npm** 或 **yarn**

### 安装

```bash
# 克隆项目
git clone https://github.com/Jamailar/VibeTrading.git
cd VibeTrading

# 安装依赖
npm install
```

### 配置（可选）

创建 `.env` 文件配置 AI API Key：

```env
# 管理员账号（用于登录）
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123

# AI 服务配置
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-your-openai-api-key-here

# 市场数据配置（可选）
POLYGON_API_KEY=your-polygon-api-key  # 用于股票数据
```

### 运行

```bash
# 开发模式（同时启动 Vite 开发服务器和 Electron）
npm run dev

# 仅构建前端和主进程代码（不启动应用）
npm run build

# 打包为可分发应用
npm run dist          # 所有平台
npm run dist:mac      # macOS (.dmg)
npm run dist:win      # Windows (.exe)
npm run dist:linux    # Linux (AppImage)
```

打包后的应用文件位于 `release/` 目录中。

## 项目结构

```
VibeTrading/
├── electron/          # Electron 主进程
│   ├── main/          # 主进程代码
│   └── preload/       # 预加载脚本
├── src/               # 渲染进程 (React)
│   ├── components/    # React 组件
│   └── pages/         # 页面
├── services/          # 后端服务代码
│   ├── ai-worker/     # AI 策略生成
│   ├── backtest-engine/ # 回测引擎
│   ├── market-data/   # 市场数据
│   └── market-research/ # 市场研究
└── docs/              # 项目文档
```

详细结构说明请参考 [docs/PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md)

## 核心功能

### 1. AI 策略生成
- 通过自然语言对话描述策略想法
- AI 使用 LangChain + LangGraph 生成策略代码
- **流式输出**：实时显示 AI 生成的内容
- **思考过程可视化**：查看 AI 的推理步骤和决策过程
- 自动验证代码安全性

### 2. 智能文件编辑（类似 Cursor）
- AI 可以主动编辑策略文件
- **Diff 预览**：清晰显示代码变更
- **Accept/Reject**：用户确认后才应用更改
- **多种编辑模式**：
  - `suggestion`：AI 生成建议，用户手动接受（默认）
  - `direct`：AI 直接修改（需要用户授权）
  - `auto`：AI 自动修改（高风险，仅限信任环境）
- **LangChain Tools**：AI 可以调用工具完成文件操作

### 3. 策略管理
- 保存策略到本地数据库
- 查看和管理策略列表
- 编辑和删除策略
- 策略文件 JSON 格式编辑

### 4. 回测执行
- 执行策略回测
- 计算性能指标（CAGR、Sharpe、最大回撤等）
- 可视化回测结果

### 5. 市场数据
- 获取股票数据（需要 Polygon API Key）
- 获取加密货币数据（免费）
- 支持多种时间框架

### 6. 市场洞察
- 市场情绪分析
- 趋势识别
- 策略推荐

## 技术栈

### 主进程
- **Electron** 28+ - 桌面应用框架
- **Node.js** 20+ - 运行时
- **TypeScript** - 类型安全
- **DuckDB** - 本地数据库

### 渲染进程
- **React** 19 - UI 框架
- **Vite** 5 - 构建工具
- **TypeScript** - 类型安全
- **TailwindCSS** - 样式框架

### 服务层
- **LangChain** + **LangGraph** - AI 工作流
- **technicalindicators** - 技术指标
- **ccxt** - 加密货币数据
- **VM2** - 代码沙箱

## 数据存储

- **数据库**: DuckDB（本地文件数据库）
- **存储位置**: 
  - macOS: `~/Library/Application Support/vibetrading/vibetrading.duckdb`
  - Windows: `%APPDATA%/vibetrading/vibetrading.duckdb`
  - Linux: `~/.config/vibetrading/vibetrading.duckdb`

## 文档

- [设置指南](docs/SETUP.md) - 详细的安装和配置说明
- [项目结构](docs/PROJECT_STRUCTURE.md) - 项目结构说明
- [迁移文档](docs/MIGRATION.md) - 从 Docker 到 Electron 的迁移历史
- [MVP 规划](docs/MVP_PLAN.md) - 功能规划文档

## 部署

VibeTrading 是一个**桌面应用**，所有功能都在本地运行，无需服务器部署。

### 开发模式

```bash
npm run dev
```

这会启动：
- Vite 开发服务器 (http://localhost:5173)
- Electron 应用窗口

### 构建和打包

```bash
# 构建前端和主进程代码
npm run build

# 打包为可分发应用
npm run dist          # 所有平台
npm run dist:mac      # macOS (.dmg)
npm run dist:win      # Windows (.exe)
npm run dist:linux    # Linux (AppImage)
```

打包后的应用文件位于 `release/` 目录中，可以直接分发给用户安装使用。

### 分发方式

- **macOS**: 生成 `.dmg` 文件，用户双击安装
- **Windows**: 生成 `.exe` 安装程序，用户运行安装
- **Linux**: 生成 `AppImage` 文件，用户直接运行

**注意**：首次打包需要下载 Electron 二进制文件，可能需要一些时间。

## 常见问题

### Q: 如何配置 AI API Key？

A: 在 `.env` 文件中设置 `OPENAI_API_KEY` 或其他 AI 服务的 API Key。也可以在应用设置中配置（存储在数据库中）。

### Q: 数据库文件在哪里？

A: 数据库文件存储在用户数据目录中，具体路径见上面的"数据存储"部分。

### Q: 支持哪些 AI 服务？

A: 支持 OpenAI、Anthropic Claude 和 Google Gemini。通过 `LLM_PROVIDER` 环境变量选择。

### Q: 如何获取市场数据？

A: 
- 加密货币数据：免费，使用 CCXT 库
- 股票数据：需要 Polygon.io API Key（可选）

### Q: AI 文件编辑功能如何使用？

A: 
1. 在聊天界面中，AI 会自动检测是否需要编辑策略文件
2. 编辑建议会显示在策略编辑器的侧边栏
3. 点击 "Accept" 应用更改，或 "Reject" 拒绝
4. 可以在聊天界面切换编辑模式（suggestion/direct/auto）

### Q: 如何查看 AI 的思考过程？

A: 在 AI 回复时，会自动显示思考过程面板，展示：
- 当前执行的 LangGraph 节点
- 节点执行状态（processing/completed/failed）
- 详细的执行信息

## 贡献

欢迎贡献！请查看 [CONTRIBUTING.md](CONTRIBUTING.md) 了解如何参与项目。

## 许可证

MIT License (Non-Commercial) - 详见 [LICENSE](LICENSE) 文件

## 致谢

感谢 Miyoo AI Club 的成员们，这个项目源于一次社区活动中的讨论和实验。

---

**注意**: 本项目已从 Docker 微服务架构迁移到 Electron 桌面应用。所有功能都在本地运行，无需服务器部署。数据完全存储在本地，保护用户隐私。
