---
name: wmf-monitor
description: Continuously monitor WMF system status and running simulations
user_invocable: true
args:
  - name: simulation_id
    description: "Optional simulation ID to focus monitoring on"
    required: false
---

Set up continuous monitoring of the World Monitor Fish system. This command performs periodic status checks and reports changes.

## Monitoring Flow

1. **Initial check** — Call `service_health` and report current system state.

2. **Identify active work** — Call `list_simulations` to find any running simulations. If a `simulation_id` argument was provided, focus on that specific simulation.

3. **Status report** — Present:
   ```
   ## WMF Monitor

   ### System Health
   - WM: [status] | MF: [status] | Integration: [status]

   ### Active Simulations
   - [sim_id]: [status] (round X/Y, Z agents)
   - ...

   ### Recent Completions
   - [sim_id]: completed [time ago]
   ```

4. **Suggest next actions** based on what's found:
   - If simulations are running: offer to check detailed status
   - If simulations completed: offer to view predictions or generate reports
   - If services are down: suggest restarting
   - If no activity: suggest triggering a new simulation with `/wmf-simulate`

5. **For ongoing monitoring**, suggest the user use `/loop 5m /wmf-status` to set up automatic periodic checks.
