.PHONY: help up down restart logs-gateway logs-worker test-worker test-gateway migrate seed run-gateway run-worker run-frontend

help:
	@echo "JMS UTS - Journal Management System with AI Pre-Submission Engine"
	@echo "Usage:"
	@echo "  make up            - Start Postgres, Redis, MinIO with Docker Compose"
	@echo "  make down          - Stop all Docker Compose services"
	@echo "  make migrate       - Run PostgreSQL schema migrations"
	@echo "  make seed          - Seed development users and demo manuscripts"
	@echo "  make run-gateway   - Run Go API Gateway (port 8080)"
	@echo "  make run-worker    - Run Python AI Pre-Submission Worker"
	@echo "  make run-frontend  - Run Next.js 15 Frontend (port 3000)"
	@echo "  make test-worker   - Run pytest test suite for AI Worker"
	@echo "  make test-gateway  - Run Go test suite for API Gateway"

up:
	cd backend && docker compose up -d

down:
	cd backend && docker compose down

logs-gateway:
	cd backend && docker compose logs -f gateway

logs-worker:
	cd backend && docker compose logs -f ai-worker

migrate:
	docker exec -i jms-postgres psql -U jms_user -d jms_db < backend/db/migrations/000001_init_schema.up.sql

seed:
	docker exec -i jms-postgres psql -U jms_user -d jms_db < backend/db/seeds/001_seed_dev_data.sql

run-gateway:
	cd backend/gateway && go run ./cmd/api

run-worker:
	cd backend/ai-worker && python3.11 -m app.worker

run-frontend:
	cd frontend && pnpm dev

test-worker:
	cd backend/ai-worker && pytest -v

test-gateway:
	cd backend/gateway && go test -v ./...

