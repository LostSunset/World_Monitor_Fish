# Contributing to World Monitor Fish

## Git Flow

We use Git Flow branching strategy:

- **`main`** — Stable releases only. Never push directly.
- **`develop`** — Integration branch. All feature branches merge here.
- **`feature/*`** — New features (branch from `develop`)
- **`fix/*`** — Bug fixes (branch from `develop`)
- **`security/*`** — Security patches (branch from `develop`, priority review)
- **`release/*`** — Release preparation (branch from `develop`, merge to `main`)
- **`hotfix/*`** — Emergency fixes (branch from `main`, merge to both `main` and `develop`)

## Development Setup

```bash
# Clone and install
git clone <repo-url>
cd world-monitor-fish
cp .env.example .env  # Configure your API keys
npm install

# Start all services
npm run dev

# Or start individually
npm run dev:wm          # WorldMonitor only
npm run dev:mf          # MiroFish only
npm run dev:integration # Integration service only

# Docker (full stack)
docker compose up -d
```

## Code Review Guidelines

### All PRs

- Require **at least 1 approval** before merging
- All CI checks must pass
- Use the PR template and complete the self-review checklist
- Keep PRs focused — one concern per PR

### Security-Related PRs

- Require **2 approvals** (enforced via CODEOWNERS)
- Must include security test cases
- Tag with `security` label

### Review Priorities

1. **Security** — Auth, input validation, data exposure, CORS
2. **Correctness** — Does it do what it claims?
3. **Error handling** — Graceful failures, no info leaks
4. **Performance** — No unnecessary API calls, proper caching
5. **Readability** — Clear naming, minimal complexity

## Project Structure

```
packages/
  worldmonitor/   TypeScript/Vite real-time intelligence dashboard
  mirofish/       Python Flask + Vue 3 swarm intelligence engine
  integration/    Node.js bridge service (WM <-> MF)
```

## Testing

- **WorldMonitor**: `cd packages/worldmonitor && npm test`
- **MiroFish**: `cd packages/mirofish/backend && pytest`
- **Integration**: `cd packages/integration && npm test`
- **Security**: `npm run test:security` (root)

## Commit Messages

Use conventional commits:

```
feat(mirofish): add API key authentication
fix(worldmonitor): remove CORS wildcard from vercel.json
security(mirofish): sanitize simulation_id to prevent path traversal
docs: update contributing guidelines
```
