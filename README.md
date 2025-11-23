# VibeTrading

![VibeTrading Logo](images/image01.jpg)

An open-source way to create quant trading strategies through conversation.

vibe Trading is an open-source project that lets you build quantitative trading strategies simply by chatting with AI—then instantly backtest them across U.S. stocks, Hong Kong equities, and Bitcoin. It's not a closed, institutional quant system, but a playground for curious builders, traders, and learners. The project originated from an activity inside the Miyoo AI Club, where members spontaneously launched a collaborative open-source experiment to explore whether trading strategy creation could become conversational—and it has grown with the community ever since.

#  vibe Trading — Core Functional Specifications (Detailed Module Documentation)

## 1) frontend — User Interaction & Visualization Layer

### Core Responsibilities
- Provide conversational interface for strategy creation
- Display AI-generated strategy definitions & explanations
- Trigger backtest executions and monitor progress
- Visualize backtest performance results & trading signals
- Present real-time and historical market charts
- Manage authentication, routing, and UI state
- Support cross-device responsive interaction

### Required Features
- Chat UI with streaming token-level message updates
- Strategy editor panel (JSON + natural language)
- Backtest dashboard with:
  - equity curve
  - drawdown curve
  - cumulative return
  - benchmarks comparison
  - trade markers (entry, exit, stop-loss, take-profit)
- Market sentiment overview widget
- Strategy history and version management
- Error and validation feedback system
- Account profile/settings

### External Interfaces
- WebSocket → ai-worker streaming output
- REST → api-gateway strategy + backtest endpoints
- WebSocket → api-gateway backtest status
- HTTP → static CDN hosting

### Data Inputs
- JWT user identity
- Strategy JSON schema
- Backtest results payload
- Market OHLCV data
- Market research summaries

### Data Outputs
- User instructions to AI
- Backtest run requests
- Strategy save/update/delete events

---

## 2) api-gateway — System Entry Point & Request Coordinator

### Core Responsibilities
- Authenticate and authorize all client requests
- Route traffic to internal microservices
- Validate request payloads and API contracts
- Maintain consistent error handling and response structure
- Provide unified API definition for frontend consumers

### Required Features
- JWT issuance, verification, refresh token lifecycle
- IP, token, and user-level rate limiting
- Request logging, tracing, and correlation IDs
- Unified pagination, filtering, sorting conventions
- Automatic request schema validation via Pydantic

### API Endpoints
- POST /auth/register
- POST /auth/login
- GET /users/me
- POST /chat/strategy
- POST /backtest/run
- GET /backtest/{id}
- GET /strategies
- GET /market/data
- GET /market/insight

### Internal Service Integrations
- ai-worker (strategy generation)
- backtest-engine (execution)
- market-data-service (OHLCV)
- market-research-service (sentiment + insights)
- PostgreSQL (user/session data)

---

## 3) strategy-ai-worker — Natural Language Strategy Intelligence Engine

### Core Responsibilities
- Interpret user chat messages into quantifiable strategy intent
- Convert market intuition into formal rule-based logic
- Construct strongly typed strategy JSON schema
- Generate executable vectorbt-compatible Python code
- Ensure safety and determinism before execution
- Automatically suggest stop-loss, take-profit, position sizing
- Provide human-readable explanation + rationale

### Internal Processing Pipeline
1. Natural language → structured intent classification
2. Extract assets, timeframe, indicators, signals, conditions
3. Validate feasibility against available data sources
4. Build strategy JSON object
5. Convert JSON → Python backtest script
6. Run static checks:
   - AST parsing
   - prohibited imports
   - banned opcodes
   - infinite loop detection
   - runtime complexity heuristic
7. Store strategy definition in DB
8. Forward execution request to backtest-engine

### Required Capabilities
- Recognize trading concepts: momentum, mean reversion, breakout, volatility, pairs trading
- Detect invalid or contradictory rules
- Auto-correct missing variables and statistical assumptions
- Provide metadata:
  - expected market conditions
  - risk assumptions
  - signal frequency
  - indicator interpretation

### Inputs
- User chat messages
- Market-research-service insight JSON
- Prior strategy history
- Supported asset universe

### Outputs
- Strategy JSON
- Executable Python code
- Safety validation report
- Strategy explanation text

---

## 4) backtest-engine — Historical Execution & Performance Analytics System

### Core Responsibilities
- Execute strategies deterministically at scale
- Retrieve historical price & volume data
- Apply transactional cost models & slippage assumptions
- Generate trade ledger and portfolio time series
- Calculate institutional-grade performance metrics
- Package results for frontend visualization

### Required Features
- Multi-asset backtesting capability
- Alignment to exchange trading calendars
- Timezone-aware calculations
- Configurable order execution model:
  - Market, limit, stop orders
  - Partial fills
- Capital allocation rules:
  - fixed percent
  - volatility targeting
- Benchmark comparison support

### Core Metrics Output
- CAGR
- Sharpe ratio
- Sortino ratio
- Max drawdown %
- Calmar ratio
- Win rate
- Exposure
- Volatility
- Profit factor

### Output Payload Format
- equity_curve: timestamp → equity value
- drawdown_series
- returns_series
- trade_log (entries, exits, pnl, duration)
- benchmark_vs_strategy comparison
- summary_stats JSON

### Data Dependencies
- market-data-service for OHLCV
- strategy-ai-worker for executable strategy file
- PostgreSQL for storing run history

---

## 5) market-data-service — Standardized Financial Data Access Layer

### Core Responsibilities
- Provide unified normalized OHLCV
- Cache frequently accessed tickers & timeframes
- Standardize data structure across markets
- Abstract away vendor differences
- Protect rate-limited data sources

### Supported Data Sources
- polygon.io (US equities)
- yfinance (US/HK equities free source)
- ccxt (BTC + major crypto exchanges)

### Core Features
- Symbol validation & mapping
- Exchange timezone normalization
- Resampling (1m, 5m, 1h, 1d, weekly)
- Corporate action adjustments (splits/dividends)
- Forward-fill handling for HK holidays

### Response Schema

[
{timestamp, open, high, low, close, volume}
]

### Performance Considerations
- Redis cache for last-requested symbols
- Pre-ingestion into TimescaleDB for heavy workloads

---

## 6) market-research-service — Contextual Intelligence & Market Awareness

### Core Responsibilities
- Convert raw market conditions into actionable summaries
- Identify volatility regime & momentum characteristics
- Extract macro + sector leadership signals
- Evaluate retail/social sentiment
- Deliver structured insight objects to AI worker

### Data Sources & Tools
- OpenBB SDK
- FinBERT sentiment model
- fear & greed proxies
- crypto funding rate APIs
- volatility index API (e.g., VIX)

### Output Model

{
“sentiment_score”: 0.62,
“trend_state”: “bullish”,
“volatility_regime”: “elevated”,
“top_assets”: [“NVDA”, “TSLA”, “BTC”],
“risk_flag”: “CPI report tomorrow”,
“recommended_strategy_types”: [“momentum”, “trend following”]
}

### Frequency
- Refresh every 5–30 minutes depending on asset class
- Historical journaling stored for research

---

## 7) database — Durable Storage & System Memory

### Core Responsibilities
- Store long-term user, strategy, backtest, and insight records
- Guarantee ACID persistence
- Provide indexing for analytical queries
- Ensure reproducible backtest history

### Required Tables
- users
- auth_tokens
- strategies
- strategy_versions
- conversations
- backtest_runs
- backtest_results
- market_cache
- research_summaries

### Constraints
- foreign keys enforcing referential integrity
- soft delete support for strategies
- JSONB indexing for strategy definition queries

---

## 8) redis — High-speed Volatile Storage (Optional)

### Core Responsibilities
- Accelerate repeated market data fetches
- Support lightweight async task run scheduling
- Store temporary session keys and rate-limit counters
- Improve backtest responsiveness for interactive UX

### Use Cases
- cache:market:BTC-1h
- cache:user:{id}:recent_strategies
- cache:backtest:{id}:status

---

# System-Level Functional Guarantees

### End-to-End Workflow
1. User submits natural-language idea in chat
2. ai-worker generates structured strategy JSON + code
3. api-gateway validates and triggers backtest
4. backtest-engine executes and computes metrics
5. results stored in DB + streamed to frontend
6. frontend visualizes charts, logs, insights

### Expected Outcomes
- Strategy creation without coding
- Fully interpretable backtest results
- Consistent performance benchmarking
- Safe execution environment
- Modular extensibility for contributors


## Core Service Modules (each runs as a container)

### 1) frontend
- Next.js 15 + React 19 + TypeScript
- TailwindCSS + Shadcn UI
- TradingView Lightweight-Charts
- WebSocket streaming for AI & backtest updates
- React Query state management
- Auth via JWT (HttpOnly cookie)

### 2) api-gateway
- FastAPI
- REST + WebSocket entrypoint
- JWT auth + permission validation
- Request routing to internal services
- Pydantic input validation
- Rate limiting (optional Redis)
- Central logging & error handling

### 3) strategy-ai-worker
- Python 3.11 + FastAPI internal RPC
- LLM integration (OpenAI / Claude / Qwen / Gemini)
- Strategy intent extraction
- Strategy JSON schema generation/validation
- Python strategy code generation
- AST analysis, static checks, RestrictedPython sandbox
- No network/filesystem execution

### 4) backtest-engine
- Python 3.11
- vectorbt (primary engine)
- TA-Lib, quantstats, numpy, pandas
- Commission/slippage modeling
- Equity curve, drawdown, trade logs, metrics
- Outputs JSON + CSV for frontend visualization

### 5) market-data-service
- FastAPI
- polygon.io, yfinance, ccxt, HKEX unofficial API
- Normalized OHLCV format
- Timezone alignment
- Redis caching (optional)
- Historical + intraday data endpoints

### 6) market-research-service
- FastAPI + OpenBB SDK
- Macro, sector, volatility, sentiment data
- FinBERT/LLM summarization
- Structured insight JSON output
- Scheduled refresh tasks

### 7) database
- PostgreSQL 15
- Optional TimescaleDB extension
- SQLAlchemy ORM
- Stores users, strategies, conversations, backtests, market cache, insights

### 8) redis (optional, single container)
- Short-lived caching
- Lightweight job dispatch for backtests
- Rate limiting counters


⸻

Shared Infrastructure (not containers)
	•	Dockerized microservices architecture
	•	docker-compose baseline deployment
	•	Internal Docker network — isolated service-to-service traffic
	•	Centralized .env environment configuration
	•	Python dependency tooling: uv or pip-tools
	•	TypeScript strict mode enabled in frontend

⸻

Security & Safety Standards
	•	HTTPS enforced via reverse proxy (Traefik/Nginx)
	•	JWT auth with refresh token rotation
	•	Sandboxed strategy execution (RestrictedPython)
	•	Block filesystem, subprocess, and network access in strategies
	•	Encrypted API keys & secrets (AES/GCP KMS/AWS KMS optional)
	•	SQL injection protection via ORM
	•	CORS restricted to allowed domains

⸻

Deployment Model
	•	Local & production run via Docker Compose
	•	Single-node cloud supported (Fly.io, Render, Lightsail, EC2, Droplet)
	•	Static CDN hosting for frontend (Vercel/Cloudflare optional)
	•	ai-worker & backtest-engine horizontally scalable
	•	Logs output to stdout for container orchestration
	•	Architecture compatible with future Kubernetes migration

⸻

Supported Financial Markets
	•	US equities
	•	Hong Kong equities
	•	Bitcoin + other crypto via ccxt-supported exchanges

⸻

Primary Programming Languages
	•	TypeScript — frontend
	•	Python — backend services
	•	SQL — database layer

⸻

Licensing & Repository Structure
	•	MIT License (Non-Commercial) - See LICENSE file for details
	•	Monorepo structure:

/frontend
/api-gateway
/strategy-ai-worker
/backtest-engine
/market-data-service
/market-research-service
/database
/docker
/docs

