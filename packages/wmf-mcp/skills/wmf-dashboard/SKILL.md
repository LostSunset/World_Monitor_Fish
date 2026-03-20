---
name: wmf-dashboard
description: Display a comprehensive WMF dashboard with system health, active simulations, and recent predictions. Use when the user wants an overview of the entire World Monitor Fish platform state.
---

Build and display a comprehensive World Monitor Fish dashboard by gathering data from multiple sources.

## Data Collection

Call these MCP tools in parallel:
1. `service_health` — Get all service statuses
2. `data_freshness` — Get WorldMonitor data source freshness
3. `list_simulations` — Get all simulations (limit: 10)
4. `list_projects` — Get all projects (limit: 10)

## Dashboard Format

Present the results as a structured dashboard:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  WORLD MONITOR FISH — Dashboard
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SERVICES                          STATUS
──────────────────────────────────────────
WorldMonitor (3000)           [OK] / [DOWN]
MiroFish Backend (5001)       [OK] / [DOWN]
MiroFish Frontend (3001)      [OK] / [DOWN]
Integration GW (4000)         [OK] / [DOWN]
Redis (6379)                  [OK] / [DOWN]

DATA FRESHNESS
──────────────────────────────────────────
[List data sources with last-updated times]
[Flag any stale sources with warning]

ACTIVE SIMULATIONS
──────────────────────────────────────────
ID          Domain    Status    Progress
[sim_id]    conflict  running   Round 3/10
[sim_id]    finance   completed 100%
...

PROJECTS
──────────────────────────────────────────
[project_id]  [name]  [created]  [status]
...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Follow-up Actions

After displaying the dashboard, suggest relevant actions:
- If services are down: "Run `/wmf-status` for details or use `start_services`"
- If simulations are running: "Use `simulation_status` for details on [sim_id]"
- If simulations completed: "Use `get_predictions` or `get_report` to view results"
- If no simulations: "Start a new analysis with `/wmf-simulate`"
