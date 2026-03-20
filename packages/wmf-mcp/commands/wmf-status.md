---
name: wmf-status
description: Check the health and status of all World Monitor Fish services
user_invocable: true
---

Check the complete status of the World Monitor Fish system by performing these steps:

1. Call the `service_health` MCP tool to check all service health (WorldMonitor, MiroFish, Integration, Redis, Docker containers)
2. Call the `data_freshness` MCP tool to check WorldMonitor data source freshness

Then present a concise status summary in this format:

```
## WMF System Status

### Services
- WorldMonitor: [healthy/unreachable] (URL)
- MiroFish: [healthy/unreachable] (URL)
- Integration: [healthy/unreachable] (URL)
- Docker: [running N containers / not available]

### Data Freshness
- [List any stale or problematic data sources]
- [Or "All data sources fresh" if everything is OK]

### Issues
- [List any problems found, or "No issues detected"]
```

If any service is unreachable, suggest running `start_services` to bring up Docker Compose, or check if the services are running locally.
