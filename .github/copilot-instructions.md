# Serre Connectée – AI Agent Guidelines

This Node-RED + MQTT greenhouse automation system orchestrates sensors, actuators, and failsafe layers for autonomous plant cultivation. Key insight: **failsafe architecture is central—all logic paths are guarded by prioritized safety checks**.

## Architecture Overview

### System Layers (Bottom to Top)
1. **MQTT Broker** (localhost:1883): Central message bus; retains critical topics
2. **Sensor Integration**: Zigbee2MQTT (air temp/humidity), ESP32 (soil humidity)
3. **Node-RED Flows**: Logic engines with failsafe guards; publishes actuator commands
4. **Actuators**: Heating, air extraction, watering pump; externally triggered via MQTT
5. **REST API**: HTTP endpoints expose sensor state and accept remote commands (requires Bearer token)

### Critical Data Model

**Flow Context Variables** (prioritized order):
- `allow_climat`, `allow_arrosage`, `allow_global` (boolean; failsafe states)
- `temp_air`, `hum_air`, `hum_sol` (sensor readings; required for engines)
- Dynamic config values: `temp_min`, `temp_max`, `hum_max`, `sol_min`, `sol_max`, etc.

**MQTT Topics**:
- `serre/failsafe/allow.*` (retain=true): Failsafe state publication
- `serre/config/*`: Dynamic threshold values; engines subscribe and cache these
- `serre/web/cmd/#`: External command routing (validated only if `allow_global === true`)

## Critical Patterns & Workflows

### Failsafe Architecture (Non-Negotiable)
Every actuator decision is guarded by 3-level hierarchical checks in this exact order:

```javascript
// 1. GLOBAL failsafe (blocks all actuation if false)
if (!flow.get('allow_global') === true) {
    node.warn('Action blocked by FAILSAFE GLOBAL');
    return null; // NO actuation
}

// 2. Specific failsafe (climat or arrosage)
if (!flow.get('allow_climat') === true) { // or allow_arrosage
    node.warn('Climat blocked by failsafe climat');
    return null;
}

// 3. Business logic (temp thresholds, pulses, etc.)
```

**Failsafe Dependencies**:
- `allow_climat`: Based on air sensor (Z2M) availability + debounce (~5s) + hysteresis (2 consecutive OFFLINE → false)
- `allow_arrosage`: Based on soil humidity validity + 10min timeout + requires 2 consecutive valid readings to return true
- `allow_global = allow_climat && allow_arrosage` (composition AND)
- **Notifications**: All failsafe state changes publish JSON to `serre/system/failsafe_change` with timestamp and transition details

### Engine Workflows (Identical Pattern)
All engines (`Climat engine`, `Arrosage engine`, `Culture engine`) follow:

1. **Receive** config via `serre/config/#` → cache in flow context
2. **Read** sensor state (via function nodes querying context)
3. **Apply** failsafe guards (3-level hierarchy above)
4. **Decide** actuation (business logic: thresholds, hysteresis, pulse generation)
5. **Publish** to `serre/actionneurs/*/set` with `retain: false`

**Variable Naming Convention**:
- Sensors: `temp_air`, `hum_air`, `hum_sol` (not `air_temperature`)
- Failsafe state: `allow_climat`, `allow_arrosage`, `allow_global` (not `failsafe_allow_*`)
- Config: `temp_min`, `sol_max`, etc. (match MQTT topic names)

### REST API Layer
- **Token validation**: 6 hardcoded `Check API Token` functions validate `Authorization: Bearer` header
- **Token source**: Read from `process.env.API_TOKEN` (fallback: hardcoded `SUPER_SECRET_TOKEN`)
- **Endpoints**: `/api/status`, `/api/sensors`, `/api/actuators`, `/api/actuators/:name` (POST), `/api/culture/phase` (POST)
- **Critical**: All API-triggered changes route through MQTT to pass failsafe guards

### Web Command Routing (Gateway Pattern)
Web commands (`serre/web/cmd/#`) are transformed and routed:
- Topic: `serre/web/cmd/climat/temp_min` → `serre/config/temp_min`
- **Guard**: Only accepted if `flow.get('allow_global') === true`
- **Logging**: "Command rejected: allow_global !== true" when blocked
- **Reason**: No external dependency when failsafe is down; prioritizes local autonomy

## Python Script Ecosystem (Development Tools)

All scripts directly **modify flows.json or derived exports** to maintain consistency. Key workflows:

- **`fix_bugs.py`**: Normalizes variable names (failsafe, sensor), removes debug logs, sets token to env var
- **`audit_flux.py`**: Verifies group structure, counts nodes/types, checks topic consistency
- **`create_rest_api.py`**: Injects HTTP endpoints into flows (used once, then use `upgrade_api_web1.py` for updates)
- **`upgrade_api_web1.py`**: Patches existing API nodes (token, response structure); preserves non-API flows
- **`add_*.py`** (rate_limiter, deduplicator, failsafe_notifications): Injects specialized node groups
- **`rename_nodes.py`, `adjust_timers.py`**: Bulk node renames, timer optimization

**Script Pattern**:
```python
with open('flows-web-1.json', 'r') as f:
    flows = json.load(f)

# Iterate flows, modify function node code or node properties
for node in flows:
    if node.get('type') == 'function':
        node['func'] = node['func'].replace('old', 'new')
        
with open('flows-web-1.json', 'w') as f:
    json.dump(flows, f, indent=2)
```

## Common Modifications

When adding features or fixing bugs:

1. **Update function code** (node['func']): Use string replace for consistency across multiple nodes
2. **Test topic subscriptions**: Verify MQTT input nodes subscribe to `serre/config/#` if config-dependent
3. **Check flow context usage**: Run `audit_flux.py` to ensure no orphaned variable references
4. **Validate failsafe guards**: Add 3-level checks to any new actuation path
5. **Environment variables**: Use `process.env.VAR_NAME` with sensible fallbacks for secrets
6. **Logging**: Explicit log messages ("Blocked by FAILSAFE GLOBAL", not generic warnings)

## Known Gotchas & Constraints

- **Retain messages**: Only `allow.*` failsafe and config topics use `retain: true`; actuator commands use `retain: false`
- **Debounce timing**: Failsafe climat: ~5s; failsafe arrosage: checks every 2-5min
- **No subflows**: This project uses flat groups only (easier Python script manipulation)
- **Token management**: Never commit hardcoded tokens; always use `process.env.API_TOKEN`
- **Python execution**: Scripts assume `flows-web-1.json` exists in same directory; validate before overwriting
- **Raspberry Pi context**: Optimized for SD card wear; debug logs stripped, watchdog timers set to 45s+ intervals

## Testing Checklist

For any change:
- Validate JSON syntax: `python3 -c "import json; json.load(open('flows.json'))"`
- Verify no undefined flow context reads (audit_flux.py checks this)
- Check MQTT topic consistency vs. config_topics.txt
- Ensure failsafe guards are present in all actuator paths
- Test locally: `curl -H 'Authorization: Bearer TOKEN' http://localhost:1880/api/status`
