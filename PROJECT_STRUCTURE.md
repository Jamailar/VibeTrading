# VibeTrading 项目结构

## 目录结构

```
VibeTrading/
├── frontend/                 # Next.js 15 + React 19 + TypeScript 前端应用
│   ├── app/                  # Next.js App Router
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.js
│   ├── tailwind.config.js
│   └── postcss.config.js
│
├── api-gateway/              # FastAPI API 网关服务
│   ├── main.py
│   ├── Dockerfile
│   └── requirements.txt
│
├── strategy-ai-worker/       # 策略 AI 工作器 (Python 3.11 + FastAPI)
│   ├── main.py
│   ├── Dockerfile
│   └── requirements.txt
│
├── backtest-engine/          # 回测引擎 (Python 3.11 + vectorbt)
│   ├── main.py
│   ├── Dockerfile
│   └── requirements.txt
│
├── market-data-service/      # 市场数据服务 (FastAPI)
│   ├── main.py
│   ├── Dockerfile
│   └── requirements.txt
│
├── market-research-service/  # 市场研究服务 (FastAPI + OpenBB)
│   ├── main.py
│   ├── Dockerfile
│   └── requirements.txt
│
├── database/                 # 数据库相关文件
│   ├── init/                 # 初始化 SQL 脚本
│   │   └── 01_init.sql
│   └── migrations/           # 数据库迁移脚本
│
├── docker/                   # Docker 相关文档和配置
│   └── README.md
│
├── docs/                     # 项目文档
├── images/                   # 图片资源
│
├── docker-compose.yml        # Docker Compose 配置文件
├── .env.example              # 环境变量模板
├── .dockerignore             # Docker 忽略文件
├── Makefile                  # 便捷命令脚本
└── README.md                 # 项目说明文档
```

## 服务说明

### 1. Frontend (端口: 3000)
- **技术栈**: Next.js 15, React 19, TypeScript, TailwindCSS
- **功能**: 用户界面、聊天交互、策略可视化、回测结果展示

### 2. API Gateway (端口: 8000)
- **技术栈**: FastAPI
- **功能**: 统一 API 入口、JWT 认证、请求路由、限流

### 3. Strategy AI Worker (端口: 8001)
- **技术栈**: Python 3.11, FastAPI, LLM (OpenAI/Claude/Gemini)
- **功能**: 自然语言转策略、代码生成、安全验证

### 4. Backtest Engine (端口: 8002)
- **技术栈**: Python 3.11, vectorbt, TA-Lib, quantstats
- **功能**: 策略回测执行、性能指标计算

### 5. Market Data Service (端口: 8003)
- **技术栈**: FastAPI, yfinance, ccxt, polygon.io
- **功能**: 市场数据获取、数据标准化、缓存

### 6. Market Research Service (端口: 8004)
- **技术栈**: FastAPI, OpenBB SDK, FinBERT
- **功能**: 市场情绪分析、趋势识别、研究摘要

### 7. Database (端口: 5432)
- **技术栈**: PostgreSQL 15
- **功能**: 数据持久化存储

### 8. Redis (端口: 6379)
- **功能**: 缓存、限流计数器、会话存储

## 快速开始

1. **复制环境变量文件**:
   ```bash
   cp .env.example .env
   ```

2. **编辑 .env 文件**，配置必要的 API 密钥和参数

3. **启动所有服务**:
   ```bash
   make up
   # 或
   docker-compose up -d
   ```

4. **查看服务状态**:
   ```bash
   make ps
   # 或
   docker-compose ps
   ```

5. **查看日志**:
   ```bash
   make logs
   # 或
   docker-compose logs -f
   ```

6. **停止服务**:
   ```bash
   make down
   # 或
   docker-compose down
   ```

## 开发说明

- 所有服务都运行在独立的 Docker 容器中
- 服务间通过 Docker 内部网络通信
- 数据库初始化脚本会在首次启动时自动执行
- 前端开发时可以使用 `npm run dev` 在本地运行（需要配置 API 地址）

