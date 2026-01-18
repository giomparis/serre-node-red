# API REST - Endpoints Référence Complète

## 📍 Vue d'Ensemble

| Endpoint | Méthode | Auth | Failsafe | Description |
|----------|---------|------|----------|-------------|
| `/api/status` | GET | ✅ Bearer | ❌ N/A | État général du système |
| `/api/sensors` | GET | ✅ Bearer | ❌ N/A | Lectures des capteurs |
| `/api/actuators` | GET | ✅ Bearer | ❌ N/A | État des actionneurs |
| `/api/actuators/:name` | POST | ✅ Bearer | ✅ Requis | Commander un actionneur |
| `/api/culture/phase` | POST | ✅ Bearer | ✅ Requis | Changer phase culture |
| `/api/override` | POST | ✅ Bearer | ✅ Requis | Override failsafe |

---

## 🔐 Authentification Globale

**Tous les endpoints requièrent:**
```
Authorization: Bearer <API_TOKEN>
Content-Type: application/json
```

**Erreur d'authentification:**
```http
HTTP/1.1 401 Unauthorized

{
  "error": "Unauthorized",
  "message": "Invalid or missing Bearer token",
  "timestamp": "2026-01-14T15:30:45.123Z"
}
```

---

## 1. GET /api/status

Récupère l'état général du système.

### Requête

```bash
curl -X GET \
  "http://localhost:1880/api/status" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Réponse 200 OK

```json
{
  "uptime": 86400,
  "culture_phase": "vegetatif",
  "failsafe": {
    "global": true,
    "climat": true,
    "arrosage": true
  },
  "timestamp": "2026-01-14T15:30:45.123Z"
}
```

### Champs de Réponse

| Champ | Type | Description |
|-------|------|-------------|
| `uptime` | integer \| null | Secondes depuis démarrage Node-RED |
| `culture_phase` | string | Phase actuelle: germination, vegetatif, floraison, drying |
| `failsafe.global` | boolean | allow_global (true = système opérationnel) |
| `failsafe.climat` | boolean | allow_climat (dépend capteur air) |
| `failsafe.arrosage` | boolean | allow_arrosage (dépend capteur sol) |
| `timestamp` | string | ISO 8601 timestamp |

### Cas de Test

**Cas nominal (todos les failsafes actifs):**
```json
{
  "failsafe": {
    "global": true,
    "climat": true,
    "arrosage": true
  }
}
```

**Cas failsafe climat down (capteur air défaillant):**
```json
{
  "failsafe": {
    "global": false,
    "climat": false,
    "arrosage": true
  }
}
```

**Cas drying (arrosage bloqué):**
```json
{
  "culture_phase": "drying",
  "failsafe": {
    "global": false,
    "climat": true,
    "arrosage": false
  }
}
```

---

## 2. GET /api/sensors

Récupère les lectures actuelles des capteurs.

### Requête

```bash
curl -X GET \
  "http://localhost:1880/api/sensors" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Réponse 200 OK

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

### Champs de Réponse

| Champ | Type | Unité | Source |
|-------|------|-------|--------|
| `air.temperature` | number \| null | °C | Zigbee2MQTT (Aqara) |
| `air.humidity` | number \| null | % | Zigbee2MQTT (Aqara) |
| `soil.humidity` | number \| null | % | ESP32 analogique |

### Notes

- `null` si capteur non disponible
- Mise à jour en temps réel, sans cache
- Même valeurs utilisées par les moteurs

---

## 3. GET /api/actuators

Liste l'état de tous les actionneurs.

### Requête

```bash
curl -X GET \
  "http://localhost:1880/api/actuators" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Réponse 200 OK

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

### Noms d'Actionneurs

| Nom | Description | Topic MQTT |
|-----|-------------|-----------|
| `lampe` | Éclairage culture | `serre/actionneurs/lampe/set` |
| `extracteur` | Extraction d'air | `serre/actionneurs/extracteur/set` |
| `pompe` | Pompe d'arrosage | `serre/actionneurs/pompe/set` |
| `chauffage` | Chauffage serre | `serre/actionneurs/chauffage/set` |
| `ventilation_atmo` | Circulation air | `serre/actionneurs/ventilation_atmo/set` |
| `ventilation_chauffage` | Ventilation chauffage | `serre/actionneurs/ventilation_chauffage/set` |

---

## 4. POST /api/actuators/:name

Commande un actionneur (ON/OFF).

### Requête

```bash
curl -X POST \
  "http://localhost:1880/api/actuators/lampe" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"state": "ON"}'
```

### Payload

```json
{
  "state": "ON"  // ou "OFF"
}
```

### Réponse 200 OK (allow_global = true)

```json
{
  "success": true,
  "actuator": "lampe",
  "state": "ON",
  "topic": "serre/actionneurs/lampe/set",
  "timestamp": "2026-01-14T15:30:45.123Z"
}
```

### Réponse 403 Forbidden (allow_global = false)

```json
{
  "error": "Forbidden",
  "message": "Command rejected: allow_global !== true",
  "reason": "Failsafe global is inactive",
  "timestamp": "2026-01-14T15:30:45.123Z"
}
```

### Réponse 400 Bad Request (erreur validation)

**Actuateur invalide:**
```json
{
  "error": "Invalid actuator name",
  "allowed": ["lampe", "extracteur", "pompe", "chauffage", "ventilation_atmo", "ventilation_chauffage"]
}
```

**État invalide:**
```json
{
  "error": "Invalid state",
  "message": "State must be ON or OFF"
}
```

### Validations

- ✅ Nom doit être dans la liste autorisée
- ✅ État doit être exactement `"ON"` ou `"OFF"` (sensibles à la casse)
- ✅ allow_global doit être `true`
- ✅ Si blocage failsafe → HTTP 403, pas de changement

### Architecture

```
API POST → Token Check → Allow Global Check → Validation → MQTT Publish
```

---

## 5. POST /api/culture/phase

Change la phase de culture.

### Requête

```bash
curl -X POST \
  "http://localhost:1880/api/culture/phase" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"phase": "floraison"}'
```

### Payload

```json
{
  "phase": "germination | vegetatif | floraison | drying"
}
```

### Réponse 200 OK (allow_global = true)

```json
{
  "success": true,
  "phase": "floraison",
  "topic": "serre/culture/phase",
  "timestamp": "2026-01-14T15:30:45.123Z"
}
```

### Réponse 403 Forbidden (allow_global = false)

```json
{
  "error": "Forbidden",
  "message": "Command rejected: allow_global !== true",
  "reason": "Failsafe global is inactive",
  "timestamp": "2026-01-14T15:30:45.123Z"
}
```

### Réponse 400 Bad Request

```json
{
  "error": "Invalid phase",
  "allowed": ["germination", "vegetatif", "floraison", "drying"]
}
```

### Phases

| Phase | Durée Type | Effets |
|-------|-----------|---------|
| `germination` | 7-14 jours | Lumière faible, humidité haute |
| `vegetatif` | 30-60 jours | Croissance feuillage, lumière 16h |
| `floraison` | 40-90 jours | Floraison/fructification, lumière 12h |
| `drying` | 7-14 jours | Séchage, arrosage **bloqué** |

### Effets Failsafe

Lors de la transition à `drying`:
- `allow_arrosage` passe à `false` (automatique)
- `allow_global` passe à `false` (composition AND)
- Aucun arrosage possible jusqu'à fin drying

---

## 6. POST /api/override

Override manuel d'un failsafe.

### Requête

```bash
curl -X POST \
  "http://localhost:1880/api/override" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"target": "climat", "state": true}'
```

### Payload

```json
{
  "target": "climat | arrosage | global",
  "state": true  // ou false (booléen)
}
```

### Réponse 200 OK (allow_global = true)

```json
{
  "success": true,
  "target": "climat",
  "state": true,
  "topic": "serre/failsafe/allow.climat",
  "timestamp": "2026-01-14T15:30:45.123Z"
}
```

### Réponse 403 Forbidden (allow_global = false)

```json
{
  "error": "Forbidden",
  "message": "Command rejected: allow_global !== true",
  "reason": "Cannot override when failsafe global is inactive",
  "timestamp": "2026-01-14T15:30:45.123Z"
}
```

### Réponse 400 Bad Request

**Target invalide:**
```json
{
  "error": "Invalid target",
  "allowed": ["climat", "arrosage", "global"]
}
```

**State non-booléen:**
```json
{
  "error": "Invalid state",
  "message": "State must be boolean"
}
```

### Targets

| Target | Affecte | Utilisation |
|--------|---------|-------------|
| `climat` | allow_climat | Forcer ON après capteur air down |
| `arrosage` | allow_arrosage | Forcer ON après capteur sol down |
| `global` | allow_global | ⚠️ Déprécié - modifier climat + arrosage |

### ⚠️ Attention

- **Cannot override when allow_global is false** - Le système doit être en bon état pour forcer l'override
- Override est **temporaire** - Réinitialiser par les moteurs dès capteurs OK
- Logging automatique de chaque override sur topic `serre/system/failsafe_change`

---

## 📊 Codes de Statut HTTP

| Code | Signification | Exemple |
|------|---|---------|
| **200** | Succès | Toute opération valide |
| **400** | Erreur validation | Nom actuateur invalide |
| **401** | Authentification échouée | Token manquant/invalide |
| **403** | Interdit par failsafe | allow_global = false |
| **500** | Erreur serveur | Crash Node-RED |

---

## 🔄 Exemples Workflow Complets

### Workflow 1: Démarrage de Culture

```bash
# 1. Vérifier l'état
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:1880/api/status

# 2. Changer la phase
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -d '{"phase": "germination"}' \
  http://localhost:1880/api/culture/phase

# 3. Allumer la lampe
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -d '{"state": "ON"}' \
  http://localhost:1880/api/actuators/lampe

# 4. Vérifier les actionneurs
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:1880/api/actuators
```

### Workflow 2: Récupération Après Failsafe Down

```bash
# 1. Vérifier l'état (global = false)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:1880/api/status
# => "failsafe": {"global": false, "climat": false, "arrosage": true}

# 2. Attendez que capteur air redevienne disponible (automatique)
# Ou override manuellement si nécessaire:
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -d '{"target": "climat", "state": true}' \
  http://localhost:1880/api/override

# 3. Vérifier à nouveau
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:1880/api/status
# => "failsafe": {"global": true, "climat": true, "arrosage": true}
```

### Workflow 3: Monitoring en Temps Réel

```bash
#!/bin/bash
# Boucle de monitoring (chaque 30s)

TOKEN="YOUR_TOKEN"
while true; do
  echo "=== $(date) ==="
  
  # Status
  STATUS=$(curl -s -H "Authorization: Bearer $TOKEN" \
    http://localhost:1880/api/status)
  echo "Failsafe Global: $(echo $STATUS | jq .failsafe.global)"
  
  # Capteurs
  SENSORS=$(curl -s -H "Authorization: Bearer $TOKEN" \
    http://localhost:1880/api/sensors)
  echo "Temp: $(echo $SENSORS | jq .air.temperature)°C"
  echo "Hum Air: $(echo $SENSORS | jq .air.humidity)%"
  echo "Hum Sol: $(echo $SENSORS | jq .soil.humidity)%"
  
  sleep 30
done
```

---

## 🧪 Tests avec Postman/Insomnia

### Variables d'Environnement

```json
{
  "base_url": "http://localhost:1880",
  "token": "YOUR_TOKEN_HERE"
}
```

### Headers par défaut

```
Authorization: Bearer {{token}}
Content-Type: application/json
```

### Collection d'Examples

**GET /api/status**
- Méthode: GET
- URL: `{{base_url}}/api/status`
- Auth: Bearer {{token}}

**POST /api/actuators/:name**
- Méthode: POST
- URL: `{{base_url}}/api/actuators/lampe`
- Body: `{"state": "ON"}`

---

## 🔗 Integration MQTT

Tous les endpoints POST publient automatiquement sur MQTT local:

```
POST /api/actuators/lampe (state=ON)
  → MQTT serre/actionneurs/lampe/set = "ON"
  
POST /api/culture/phase (phase=floraison)
  → MQTT serre/culture/phase = "floraison" (retain)
  
POST /api/override (target=climat, state=true)
  → MQTT serre/failsafe/allow.climat = true (retain)
```

Les moteurs Node-RED reçoivent et traitent ces messages.

---

**Documentation API:** v1.0
**Dernière mise à jour:** 14 janvier 2026
**Status:** ✅ Production Ready
