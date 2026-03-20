---
name: wmf-simulate
description: Trigger a MiroFish simulation from WorldMonitor events
user_invocable: true
args:
  - name: domain
    description: "Analysis domain (conflict, finance, climate, cyber, maritime)"
    required: false
---

Guide the user through triggering a MiroFish simulation. Follow these steps:

1. **Gather parameters** — If the user hasn't provided them, ask for:
   - **Domain**: One of `conflict`, `finance`, `climate`, `cyber`, `maritime`
   - **Topic**: The main topic to analyze (e.g., "Taiwan Strait tensions", "Oil price volatility")
   - **Events**: Ask the user to describe the events, or offer to pull recent data from WorldMonitor

2. **Confirm before triggering** — Show the user what will be sent:
   ```
   Domain: [domain]
   Topic: [topic]
   Events: [count] events
   Config: [defaults or custom]
   ```
   Ask for confirmation before proceeding.

3. **Trigger the simulation** — Call the `trigger_simulation` MCP tool with the gathered parameters.

4. **Monitor progress** — After triggering:
   - Extract the `project_id` and `task_id` from the response
   - Call `simulation_status` to check progress
   - Report the status to the user

5. **Follow up** — Offer next steps:
   - "Check status again with `/wmf-status`"
   - "View results when complete with `get_predictions`"
   - "Generate a report with `get_report`"

If the domain argument is provided (e.g., `/wmf-simulate conflict`), skip asking for the domain.
