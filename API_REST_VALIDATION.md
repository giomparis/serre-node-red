# API REST Serre Connectée - Guide de Validation & Test

## 🔒 Sécurité Implémentée

### Token Bearer (process.env.API_TOKEN)
- ✅ **7 nœuds "Check API Token" mis à jour**
- Utilise `process.env.API_TOKEN` ou fallback `SUPER_SECRET_TOKEN`
- Réponse HTTP 401 si token invalide ou manquant
- Timestamp ISO ajouté à chaque erreur d'authentification

### Failsafe Global (allow_global)
- ✅ **POST /api/actuators/:name** — Vérifie allow_global avant MQTT
- ✅ **POST /api/culture/phase** — Vérifie allow_global avant changement
- ✅ **POST /api/override** — Vérifie allow_global avant override
- Réponse HTTP 403 (Forbidden) si allow_global !== true

### Headers de Sécurité
- ✅ **8 réponses HTTP renforcées** avec:
  - `Content-Type: application/json`
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `X-XSS-Protection: 1; mode=block`

### Validation Stricte
- Noms d'actionneurs: `['lampe', 'extracteur', 'pompe', 'chauffage', 'ventilation_atmo', 'ventilation_chauffage']`
- États: `'ON'` ou `'OFF'` (sensibles à la casse)
- Phases: `['germination', 'vegetatif', 'floraison', 'drying']`
- Override targets: `['climat', 'arrosage', 'global']`
- Override state: `boolean`

---

## 🧪 Tests Locaux

### Prérequis
```bash
# Définir la variable d'environnement (Windows)
set API_TOKEN=mon-token-securise

# Ou (Linux/Mac)
export API_TOKEN='mon-token-securise'

# Node-RED doit être en cours d'exécution
# Accès: http://localhost:1880
```

### 1️⃣ GET /api/status (Authentication)

**Reqête valide:**
```bash
curl -X GET \
  "http://localhost:1880/api/status" \
  -H "Authorization: Bearer mon-token-securise" \
  -H "Content-Type: application/json"
```

**Réponse 200 OK:**
```json
{
  "uptime": 12345,
  "culture_phase": "vegetatif",
  "failsafe": {
    "global": true,
    "climat": true,
    "arrosage": true
  },
  "timestamp": "2026-01-14T15:30:45.123Z"
}
```

**Reqête sans token:**
```bash
curl -X GET "http://localhost:1880/api/status"
```

**Réponse 401 Unauthorized:**
```json
{
  "error": "Unauthorized",
  "message": "Invalid or missing Bearer token",
  "timestamp": "2026-01-14T15:30:45.123Z"
}
```

---

### 2️⃣ GET /api/sensors

**Reqête:**
```bash
curl -X GET \
  "http://localhost:1880/api/sensors" \
  -H "Authorization: Bearer mon-token-securise"
```

**Réponse 200 OK:**
```json
{
  "air": {
    "temperature": 22.5,
    "humidity": 65
  },
  "soil": {
    "humidity": 45
  },
  "timestamp": "2026-01-14T15:30:45.123Z"
}
```

---

### 3️⃣ GET /api/actuators

**Reqête:**
```bash
curl -X GET \
  "http://localhost:1880/api/actuators" \
  -H "Authorization: Bearer mon-token-securise"
```

**Réponse 200 OK:**
```json
{
  "actuators": [
    { "name": "lampe", "state": "OFF" },
    { "name": "extracteur", "state": "ON" },
    { "name": "pompe", "state": "OFF" },
    { "name": "chauffage", "state": "ON" },
    { "name": "ventilation_atmo", "state": "OFF" },
    { "name": "ventilation_chauffage", "state": "ON" }
  ],
  "count": 6,
  "timestamp": "2026-01-14T15:30:45.123Z"
}
```

---

### 4️⃣ POST /api/actuators/:name

#### Cas valide (allow_global = true)

**Reqête:**
```bash
curl -X POST \
  "http://localhost:1880/api/actuators/lampe" \
  -H "Authorization: Bearer mon-token-securise" \
  -H "Content-Type: application/json" \
  -d '{"state": "ON"}'
```

**Réponse 200 OK:**
```json
{
  "success": true,
  "actuator": "lampe",
  "state": "ON",
  "topic": "serre/actionneurs/lampe/set",
  "timestamp": "2026-01-14T15:30:45.123Z"
}
```

#### Cas failsafe (allow_global = false)

**Réponse 403 Forbidden:**
```json
{
  "error": "Forbidden",
  "message": "Command rejected: allow_global !== true",
  "reason": "Failsafe global is inactive",
  "timestamp": "2026-01-14T15:30:45.123Z"
}
```

#### Cas erreur (actionneur invalide)

**Reqête:**
```bash
curl -X POST \
  "http://localhost:1880/api/actuators/ventilateur_invalide" \
  -H "Authorization: Bearer mon-token-securise" \
  -H "Content-Type: application/json" \
  -d '{"state": "ON"}'
```

**Réponse 400 Bad Request:**
```json
{
  "error": "Invalid actuator name",
  "allowed": ["lampe", "extracteur", "pompe", "chauffage", "ventilation_atmo", "ventilation_chauffage"]
}
```

#### Cas erreur (état invalide)

**Reqête:**
```bash
curl -X POST \
  "http://localhost:1880/api/actuators/lampe" \
  -H "Authorization: Bearer mon-token-securise" \
  -H "Content-Type: application/json" \
  -d '{"state": "on"}'  # Minuscule = invalide
```

**Réponse 400 Bad Request:**
```json
{
  "error": "Invalid state",
  "message": "State must be ON or OFF"
}
```

---

### 5️⃣ POST /api/culture/phase

**Reqête valide:**
```bash
curl -X POST \
  "http://localhost:1880/api/culture/phase" \
  -H "Authorization: Bearer mon-token-securise" \
  -H "Content-Type: application/json" \
  -d '{"phase": "floraison"}'
```

**Réponse 200 OK:**
```json
{
  "success": true,
  "phase": "floraison",
  "topic": "serre/culture/phase",
  "timestamp": "2026-01-14T15:30:45.123Z"
}
```

**Réponse 403 (allow_global = false):**
```json
{
  "error": "Forbidden",
  "message": "Command rejected: allow_global !== true",
  "reason": "Failsafe global is inactive",
  "timestamp": "2026-01-14T15:30:45.123Z"
}
```

**Réponse 400 (phase invalide):**
```json
{
  "error": "Invalid phase",
  "allowed": ["germination", "vegetatif", "floraison", "drying"]
}
```

---

### 6️⃣ POST /api/override

**Reqête (Activer override climat):**
```bash
curl -X POST \
  "http://localhost:1880/api/override" \
  -H "Authorization: Bearer mon-token-securise" \
  -H "Content-Type: application/json" \
  -d '{"target": "climat", "state": true}'
```

**Réponse 200 OK:**
```json
{
  "success": true,
  "target": "climat",
  "state": true,
  "topic": "serre/failsafe/allow.climat",
  "timestamp": "2026-01-14T15:30:45.123Z"
}
```

**Réponse 403 (allow_global = false):**
```json
{
  "error": "Forbidden",
  "message": "Command rejected: allow_global !== true",
  "reason": "Cannot override when failsafe global is inactive",
  "timestamp": "2026-01-14T15:30:45.123Z"
}
```

---

## 📋 Checklist de Validation

### Avant Déploiement

- [ ] Définir `API_TOKEN` en variable d'environnement
- [ ] Tester chaque endpoint avec token valide
- [ ] Tester chaque endpoint sans token → HTTP 401
- [ ] Tester POST endpoints avec allow_global=false → HTTP 403
- [ ] Tester validations (noms, états, phases invalides) → HTTP 400
- [ ] Vérifier les headers de sécurité sur toutes les réponses
- [ ] Vérifier que MQTT reçoit les messages (lampe, culture/phase, failsafe)
- [ ] Vérifier JSON valide: `node -c flows.json` ou vérifier dans Node-RED

### Logs à Monitorier

```
✓ Token check: [Authorized|Unauthorized]
✓ Allow_global check: [Allowed|Blocked]
✓ MQTT publish: serre/actionneurs/{name}/set
✓ MQTT publish: serre/culture/phase
✓ MQTT publish: serre/failsafe/allow.*
```

---

## 🔧 Configuration d'Environnement

### Node-RED Startup (Linux/Raspberry Pi)

```bash
#!/bin/bash
export API_TOKEN='your-long-random-token-here'
export NODE_RED_USER_DIR=/data
node-red
```

### Docker

```dockerfile
ENV API_TOKEN=your-long-random-token-here
CMD node-red
```

### Générer un Token Sécurisé

**Linux/Mac:**
```bash
openssl rand -hex 32
# Exemple: 5c9f8a2b3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f
```

**PowerShell:**
```powershell
[System.BitConverter]::ToString([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32)) -replace "-",""
```

---

## 🚨 Erreurs Courantes

| Symptôme | Cause | Solution |
|----------|-------|----------|
| HTTP 401 partout | Token manquant/invalide | Vérifier `Authorization: Bearer TOKEN` header |
| HTTP 403 sur POST | allow_global === false | Vérifier failsafe dans `/api/status` |
| JSON parse error | Payload malformé | Vérifier `Content-Type: application/json` |
| Timeout requests | Node-RED arrêté | Relancer Node-RED |
| MQTT ne reçoit pas | Topic mal configuré | Vérifier `serre/actionneurs/*/set` topic |

---

## ✅ Améliorations Appliquées

✅ **Sécurité**
- Tokens en variable d'environnement
- Vérification allow_global sur tous les POST
- Headers HTTP de sécurité

✅ **Validation**
- Validation stricte des noms/états/phases
- Messages d'erreur explicites
- Timestamps sur chaque réponse

✅ **Nettoyage**
- Doublons supprimés
- JSON valide et bien formaté
- Code lisible et commenté

✅ **Architecture**
- Aucune modification directe du flow context
- Tout passe par MQTT local
- Failsafes prioritaires
