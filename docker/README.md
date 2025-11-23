# Docker Configuration

This directory contains Docker-related configuration files and scripts.

## Usage

1. Copy `.env.example` to `.env` and configure your environment variables:
   ```bash
   cp .env.example .env
   ```

2. Build and start all services:
   ```bash
   docker-compose up -d
   ```

3. View logs:
   ```bash
   docker-compose logs -f
   ```

4. Stop all services:
   ```bash
   docker-compose down
   ```

5. Stop and remove volumes (WARNING: deletes database data):
   ```bash
   docker-compose down -v
   ```

## Service URLs

- Frontend: http://localhost:3000
- API Gateway: http://localhost:8000
- Strategy AI Worker: http://localhost:8001
- Backtest Engine: http://localhost:8002
- Market Data Service: http://localhost:8003
- Market Research Service: http://localhost:8004
- PostgreSQL: localhost:5432
- Redis: localhost:6379

