.PHONY: help build up down logs restart clean

help: ## 显示帮助信息
	@echo "VibeTrading 项目 Makefile 命令:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

build: ## 构建所有 Docker 镜像
	docker-compose build

up: ## 启动所有服务
	docker-compose up -d

down: ## 停止所有服务
	docker-compose down

logs: ## 查看所有服务日志
	docker-compose logs -f

restart: ## 重启所有服务
	docker-compose restart

clean: ## 停止服务并删除 volumes (警告: 会删除数据库数据)
	docker-compose down -v

ps: ## 查看运行中的服务
	docker-compose ps

shell-db: ## 进入数据库容器 shell
	docker-compose exec database psql -U vibetrading -d vibetrading

shell-api: ## 进入 API Gateway 容器 shell
	docker-compose exec api-gateway /bin/bash

shell-frontend: ## 进入 Frontend 容器 shell
	docker-compose exec frontend /bin/sh

