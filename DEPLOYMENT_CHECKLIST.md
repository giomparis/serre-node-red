# API REST Serre Connectée - Checklist de Déploiement & Test

## ✅ PRÉ-DÉPLOIEMENT (À FAIRE AVANT PRODUCTION)

### Token Sécurité
- [ ] Générer un token aléatoire 64 chars (openssl rand -hex 32)
- [ ] Stocker le token en variable d'environnement
- [ ] Ne PAS commit le token dans Git
- [ ] Utiliser un gestionnaire de secrets (LastPass, Vault, etc.)

### Environnement Node-RED
- [ ] Vérifier Node.js v16+ installé
- [ ] Vérifier Node-RED v3.0+ installé
- [ ] Importer flows.json dans Node-RED
- [ ] Déployer les flows (Deploy button)
- [ ] Vérifier pas d'erreurs dans les logs

### MQTT Broker
- [ ] MQTT broker local opérationnel (localhost:1883)
- [ ] Test connexion: `mosquitto_sub -h localhost -t "serre/#"`
- [ ] Vérifier les topics: serre/failsafe/*, serre/config/*, serre/actionneurs/*

### Capteurs
- [ ] Zigbee2MQTT opérationnel (si utilisé)
- [ ] Capteur air publie (temp_air, hum_air)
- [ ] Capteur sol publie (hum_sol) ou ESP32 connecté
- [ ] Vérifier flow context contient: temp_air, hum_air, hum_sol

### Actionneurs
- [ ] Tous les actionneurs configurés
- [ ] Au moins 1 actionneur de test (lampe/pompe)
- [ ] MQTT topics: serre/actionneurs/{name}/set

### Failsafes
- [ ] allow_climat = true (capteur air OK)
- [ ] allow_arrosage = true (capteur sol OK)
- [ ] allow_global = true (AND des deux)
- [ ] Vérifier GET /api/status montre les bonnes valeurs

---

## 🧪 TESTS LOCAUX (À FAIRE AVANT PRODUCTION)

### Test 1: Authentification

```bash
# Sans token → 401
curl -X GET "http://localhost:1880/api/status"

# Avec token invalide → 401
curl -X GET "http://localhost:1880/api/status" \
  -H "Authorization: Bearer invalid-token"

# Avec token valide → 200
export API_TOKEN="votre-token"
curl -X GET "http://localhost:1880/api/status" \
  -H "Authorization: Bearer $API_TOKEN"
```

**Résultats attendus:**
- [x] Sans token: `"error": "Unauthorized"`
- [x] Token invalide: HTTP 401
- [x] Token valide: HTTP 200 avec payload

### Test 2: Endpoints GET

```bash
# Test /api/status
curl -H "Authorization: Bearer $API_TOKEN" \
  http://localhost:1880/api/status | jq .
# Vérifie: uptime, culture_phase, failsafe{global, climat, arrosage}, timestamp

# Test /api/sensors
curl -H "Authorization: Bearer $API_TOKEN" \
  http://localhost:1880/api/sensors | jq .
# Vérifie: air{temperature, humidity}, soil{humidity}, timestamp

# Test /api/actuators
curl -H "Authorization: Bearer $API_TOKEN" \
  http://localhost:1880/api/actuators | jq .
# Vérifie: actuators[] avec {name, state}, count, timestamp
```

**Résultats attendus:**
- [x] 3 endpoints GET retournent HTTP 200
- [x] Tous incluent timestamp ISO 8601
- [x] Headers incluent X-Content-Type-Options, X-Frame-Options

### Test 3: Validations POST (allow_global = true)

```bash
# Commande actionneur valide
curl -X POST \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"state": "ON"}' \
  http://localhost:1880/api/actuators/lampe
# → HTTP 200, MQTT publie sur serre/actionneurs/lampe/set

# Commande actionneur invalide
curl -X POST \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"state": "ON"}' \
  http://localhost:1880/api/actuators/ventilateur_inexistant
# → HTTP 400, "Invalid actuator name"

# État invalide (lowercase)
curl -X POST \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"state": "on"}' \
  http://localhost:1880/api/actuators/lampe
# → HTTP 400, "State must be ON or OFF"
```

**Résultats attendus:**
- [x] Commande valide: HTTP 200, MQTT publish
- [x] Actionneur invalide: HTTP 400
- [x] État invalide: HTTP 400

### Test 4: Culture Phase (allow_global = true)

```bash
# Phase valide
curl -X POST \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"phase": "floraison"}' \
  http://localhost:1880/api/culture/phase
# → HTTP 200, flow context updated, MQTT publish

# Phase invalide
curl -X POST \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"phase": "invalid_phase"}' \
  http://localhost:1880/api/culture/phase
# → HTTP 400, "Invalid phase"
```

**Résultats attendus:**
- [x] Phase valide: HTTP 200
- [x] Phase invalide: HTTP 400

### Test 5: Override Failsafe (allow_global = true)

```bash
# Override climat valide
curl -X POST \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"target": "climat", "state": true}' \
  http://localhost:1880/api/override
# → HTTP 200, MQTT serre/failsafe/allow.climat = true

# State non-booléen
curl -X POST \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"target": "climat", "state": "yes"}' \
  http://localhost:1880/api/override
# → HTTP 400, "State must be boolean"
```

**Résultats attendus:**
- [x] Override valide: HTTP 200
- [x] State invalide: HTTP 400

### Test 6: Failsafe Global Check

```bash
# 1. Vérifier allow_global = true
curl -H "Authorization: Bearer $API_TOKEN" \
  http://localhost:1880/api/status | jq .failsafe.global
# → true

# 2. Forcer allow_global = false (via MQTT ou Node-RED)
# Envoyer serre/failsafe/allow.global = false via MQTT

# 3. Attendre 1-2 secondes

# 4. Retester POST (doit bloquer)
curl -X POST \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"state": "ON"}' \
  http://localhost:1880/api/actuators/lampe
# → HTTP 403, "Forbidden: Command rejected: allow_global !== true"

# 5. Vérifier que GET /api/status fonctionne toujours
curl -H "Authorization: Bearer $API_TOKEN" \
  http://localhost:1880/api/status
# → HTTP 200 (GET endpoints ignorer le failsafe)
```

**Résultats attendus:**
- [x] POST endpoints bloqués si allow_global = false
- [x] GET endpoints toujours accessibles
- [x] HTTP 403 avec message explicite

---

## 🔍 VALIDATION MQTT (À FAIRE AVANT PRODUCTION)

### Vérifier les Publications

```bash
# Terminal 1: Écouter tous les topics
mosquitto_sub -h localhost -t "serre/#" -v

# Terminal 2: Exécuter des commandes API
curl -X POST \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"state": "ON"}' \
  http://localhost:1880/api/actuators/lampe
```

**Résultats attendus:**
```
serre/actionneurs/lampe/set ON
```

### Vérifier les Retenus (Retain)

```bash
# Écouter seul (mosquitto sauvegarde les retained)
mosquitto_sub -h localhost -t "serre/failsafe/allow.#"

# Vous devez voir les 3 topics (si jamais publiés):
# serre/failsafe/allow.climat
# serre/failsafe/allow.arrosage
# serre/failsafe/allow.global
```

---

## 📊 TESTS AUTOMATISÉS

### Exécuter la Suite Complète

```bash
export API_TOKEN="votre-token"
node test_api_hardened.js
```

**Résultats attendus:**
```
✓ AUTHENTICATION TESTS (3 tests)
✓ GET ENDPOINTS (2 tests)
✓ VALIDATION TESTS (5 tests)
✓ SECURITY HEADERS (3 tests)
✓ TIMESTAMPS (2 tests)
✓ RESPONSE FORMAT (3 tests)

Total:  18
Passed: 18 ✓
Failed: 0 ✓

✅ TOUS LES TESTS PASSÉS
```

---

## 🚀 DÉPLOIEMENT PRODUCTION

### 1. Configuration Systémique

```bash
# Sauvegarder le token en fichier sécurisé
sudo vi /etc/serre-api-token
# Contenu: YOUR_LONG_RANDOM_TOKEN_HERE
# Permissions: chmod 600 /etc/serre-api-token

# Créer le service Systemd
sudo cp node-red.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable node-red
sudo systemctl start node-red

# Vérifier le statut
sudo systemctl status node-red
```

### 2. HTTPS / Reverse Proxy

```bash
# Installer nginx
sudo apt-get install nginx

# Copier la configuration
sudo cp nginx-serre-api.conf /etc/nginx/sites-available/serre-api
sudo ln -s /etc/nginx/sites-available/serre-api /etc/nginx/sites-enabled/

# Certificats (Let's Encrypt)
sudo apt-get install certbot python3-certbot-nginx
sudo certbot certonly --nginx -d api.serre-connectee.com

# Tester et redémarrer
sudo nginx -t
sudo systemctl restart nginx
```

### 3. Test Production

```bash
# Test HTTPS
curl -X GET \
  "https://api.serre-connectee.com/api/status" \
  -H "Authorization: Bearer $API_TOKEN"

# Vérifier certificat
curl -I "https://api.serre-connectee.com/api/status"
# Doit afficher HTTP/2.0 200
```

### 4. Monitoring

```bash
# Logs temps réel
sudo journalctl -u node-red -f

# Erreurs authentification
sudo journalctl -u node-red | grep "401\|Unauthorized"

# Erreurs failsafe
sudo journalctl -u node-red | grep "403\|Forbidden"
```

---

## 🔄 ROTATION TOKEN (Tous les 6-12 mois)

### 1. Générer Nouveau Token

```bash
NEW_TOKEN=$(openssl rand -hex 32)
echo "Nouveau token: $NEW_TOKEN"
```

### 2. Mettre à Jour

```bash
# Écrire dans /etc/serre-api-token
echo $NEW_TOKEN | sudo tee /etc/serre-api-token

# Ou dans le service Systemd
sudo nano /etc/systemd/system/node-red.service
# Changer Environment="API_TOKEN=..."
```

### 3. Redémarrer

```bash
sudo systemctl restart node-red
```

### 4. Vérifier

```bash
curl -X GET \
  "https://api.serre-connectee.com/api/status" \
  -H "Authorization: Bearer $NEW_TOKEN"
```

---

## 📋 POST-DÉPLOIEMENT

### Monitoring Quotidien

- [ ] Vérifier status endpoint (uptime croissant)
- [ ] Vérifier sensors (temp, humidité réalistes)
- [ ] Vérifier failsafes (global = true normal)
- [ ] Chercher erreurs 401/403 dans logs
- [ ] Alerter si capteurs down

### Maintenance Mensuelle

- [ ] Vérifier certificats SSL (expiration)
- [ ] Revoir les logs d'accès
- [ ] Nettoyer les logs anciens
- [ ] Tester une commande POST (actionneur)
- [ ] Tester override failsafe

### Maintenance Semestrielle

- [ ] Mettre à jour Node-RED
- [ ] Vérifier dépendances npm
- [ ] Rouler le token (nouveau)
- [ ] Tester récupération de failsafe down
- [ ] Audit sécurité complet

---

## ❌ ERREURS COURANTES & SOLUTIONS

| Erreur | Cause | Solution |
|--------|-------|----------|
| HTTP 401 partout | Token manquant/invalide | Vérifier `Authorization: Bearer TOKEN` header |
| HTTP 403 sur POST | allow_global = false | Vérifier /api/status - failsafe down? |
| Timeout 30s | Node-RED arrêté | Vérifier `systemctl status node-red` |
| MQTT ne reçoit pas | Broker pas connecté | Tester `mosquitto_sub -h localhost` |
| JSON parse error | Content-Type invalide | Vérifier `-H "Content-Type: application/json"` |
| Certificate expired | SSL expiré | Renouveler avec `certbot renew` |
| 502 Bad Gateway | Nginx ne peut pas atteindre Node-RED | Vérifier proxy_pass localhost:1880 |

---

## ✅ CHECKLIST FINALE

Avant déclaration "Production Ready":

- [ ] Tous les tests locaux passent
- [ ] Suite de tests automatisés OK
- [ ] Token générée aléatoirement
- [ ] HTTPS configuré et validé
- [ ] MQTT broker opérationnel
- [ ] Capteurs publient correctement
- [ ] Failsafes testés (au moins 1 test down)
- [ ] Monitoring en place
- [ ] Documentation lue et comprise
- [ ] Équipe formée au déploiement

**Status:** ✅ PRÊT POUR PRODUCTION

---

**Généré:** 14 janvier 2026  
**Pour:** Serre Connectée - API REST v1.0  
**Utilisation:** Checklist de déploiement & test
