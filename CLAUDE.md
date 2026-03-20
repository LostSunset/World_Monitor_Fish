# CLAUDE.md

## Project: World Monitor Fish

Monorepo integrating **WorldMonitor** (real-time intelligence dashboard) and **MiroFish** (swarm intelligence prediction engine).

### Structure

```
packages/
  worldmonitor/   # TypeScript/Vite SPA + Vercel Edge Functions + Tauri desktop
  mirofish/       # Python Flask backend + Vue 3 frontend
  integration/    # Node.js/Express bridge service (WM <-> MF)
  wmf-mcp/        # Claude Code MCP plugin (stdio transport)
```

### WMF MCP Plugin

`packages/wmf-mcp/` 提供 Claude Code 直接操作 WMF 系統的能力。

**斜線命令**：
- `/wmf-status` — 系統健康狀態總覽
- `/wmf-simulate` — 互動式觸發模擬
- `/wmf-monitor` — 持續監控模式

**MCP 工具**（14 個）：
- 監控：`service_health`, `list_projects`, `list_simulations`, `simulation_status`, `get_predictions`, `get_report`, `data_freshness`, `security_check`
- 操作：`trigger_simulation`, `start_services`, `stop_services`, `restart_service`, `run_tests`
- 互動：`chat_agent`, `chat_report`

**Agent**: `wmf-ops` — 自動化運維 agent（診斷、服務管理、測試）

### CI/CD

- Docker images published to `ghcr.io/lostsunset/world_monitor_fish/{service}`（image tag 必須全小寫）
  - Services: `worldmonitor`, `mirofish`, `integration`
- GitHub Actions: `ci-worldmonitor`, `ci-mirofish`, `ci-integration`, `docker-publish`, `security-audit`

### Development

```bash
npm install          # Install root + workspace dependencies
npm run dev          # Start all services concurrently
npm run dev:wm       # WorldMonitor only (port 5173)
npm run dev:mf       # MiroFish only (backend 5001, frontend 3000)
npm run dev:integration  # Integration service (port 4000)
docker compose up -d # Full stack via Docker
```

### Git Flow

- `main` — stable releases, never push directly
- `develop` — integration branch
- `feature/*`, `fix/*`, `security/*` — work branches
- All PRs require 1+ approval, security PRs require 2

### Key conventions

- All API endpoints require authentication (API key or token)
- Error responses never include stack traces in production
- CORS configured per-environment, never wildcard
- File uploads validated by content (magic bytes), not just extension
- Use DOMPurify for any HTML rendering from external sources

## gstack

Use the `/browse` skill from gstack for all web browsing. Never use `mcp__claude-in-chrome__*` tools.

### Available skills

- `/office-hours` - Office hours sessions
- `/plan-ceo-review` - Plan CEO review
- `/plan-eng-review` - Plan engineering review
- `/plan-design-review` - Plan design review
- `/design-consultation` - Design consultation
- `/review` - Code review
- `/ship` - Ship code
- `/browse` - Web browsing (use this instead of mcp__claude-in-chrome__* tools)
- `/qa` - Quality assurance
- `/qa-only` - QA only
- `/design-review` - Design review
- `/setup-browser-cookies` - Setup browser cookies
- `/retro` - Retrospective
- `/investigate` - Investigate issues
- `/document-release` - Document a release
- `/codex` - Codex
- `/careful` - Careful mode
- `/freeze` - Freeze changes
- `/guard` - Guard mode
- `/unfreeze` - Unfreeze changes
- `/gstack-upgrade` - Upgrade gstack
