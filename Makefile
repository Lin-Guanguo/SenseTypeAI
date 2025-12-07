.PHONY: dev build test lint fix format clean publish help

# Development
dev:
	npm run dev

build:
	npm run build

# Testing
test:
	npm run test

test-watch:
	npm run test:watch

# Code quality
lint:
	npm run lint

lint-strict:
	npm run lint:strict

fix:
	npm run fix-lint

format:
	npm run format

format-check:
	npm run format:check

# Combined checks
check: lint format-check test

# Publishing
publish:
	npm run publish

# Utilities
clean:
	rm -rf node_modules dist

install:
	npm install

# Help
help:
	@echo "Available targets:"
	@echo "  dev          - Start development server"
	@echo "  build        - Build extension"
	@echo "  test         - Run tests"
	@echo "  test-watch   - Run tests in watch mode"
	@echo "  lint         - Run linter (relaxed)"
	@echo "  lint-strict  - Run linter (strict)"
	@echo "  fix          - Fix lint issues"
	@echo "  format       - Format code"
	@echo "  format-check - Check code formatting"
	@echo "  check        - Run lint, format-check, and test"
	@echo "  publish      - Publish to Raycast Store"
	@echo "  clean        - Remove node_modules and dist"
	@echo "  install      - Install dependencies"
