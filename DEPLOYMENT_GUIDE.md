# API REST Serre Connectée - Déploiement & Configuration

## 🚀 Déploiement Rapide

### 1. Générer un Token Sécurisé

**Linux/Mac/Raspberry Pi:**
```bash
TOKEN=$(openssl rand -hex 32)
echo "Votre token: $TOKEN"
```

**PowerShell (Windows):**
```powershell
$TOKEN = [Convert]::ToHexString([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
Write-Host "Votre token: $TOKEN"
```

### 2. Définir la Variable d'Environnement

#### Démarrage Manuel

**Linux/Mac/Raspberry Pi:**
```bash
export API_TOKEN="votre-token-genere-ici"
node-red
```

**Windows (Command Prompt):**
```cmd
set API_TOKEN=votre-token-genere-ici
node-red
```

**Windows (PowerShell):**
```powershell
$env:API_TOKEN = "votre-token-genere-ici"
node-red
```

#### Démarrage Systemd (Raspberry Pi)

Créer `/etc/systemd/system/node-red.service`:
```ini
[Unit]
Description=Node-RED
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi
Environment="API_TOKEN=votre-token-genere-ici"
Environment="NODE_RED_USER_DIR=/home/pi/.node-red"
ExecStart=/usr/bin/node-red
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Puis:
```bash
sudo systemctl enable node-red
sudo systemctl start node-red
```

#### Docker

**Dockerfile:**
```dockerfile
FROM nodered/node-red:latest

ENV API_TOKEN="votre-token-genere-ici"
ENV NODE_RED_USER_DIR=/data

RUN npm install node-red-contrib-mqtt

EXPOSE 1880
```

**docker-compose.yml:**
```yaml
version: '3'
services:
  node-red:
    image: nodered/node-red:latest
    ports:
      - "1880:1880"
    volumes:
      - node-red-data:/data
    environment:
      - API_TOKEN=votre-token-genere-ici
      - NODE_RED_USER_DIR=/data
    restart: unless-stopped

  mosquitto:
    image: eclipse-mosquitto:latest
    ports:
      - "1883:1883"
    volumes:
      - ./mosquitto.conf:/mosquitto/config/mosquitto.conf
      - mosquitto-data:/mosquitto/data
    restart: unless-stopped

volumes:
  node-red-data:
  mosquitto-data:
```

### 3. Importer les Flows

1. Ouvrir Node-RED: `http://localhost:1880`
2. Menu → Import → Clipboard
3. Coller le contenu de `flows.json`
4. Cliquer Deploy

### 4. Tester l'API

```bash
# Remplacer par votre token réel
export API_TOKEN="votre-token-genere-ici"

# Test simple
curl -X GET \
  "http://localhost:1880/api/status" \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json"

# Réponse attendue (200 OK):
# {
#   "uptime": 1234,
#   "culture_phase": "vegetatif",
#   "failsafe": {"global": true, "climat": true, "arrosage": true},
#   "timestamp": "2026-01-14T15:30:45.123Z"
# }
```

---

## 📋 Configuration de Production

### Sécurité Réseau

#### HTTPS avec Reverse Proxy (nginx)

```nginx
server {
    listen 443 ssl http2;
    server_name api.serre-connectee.com;

    ssl_certificate /etc/ssl/certs/serre.crt;
    ssl_certificate_key /etc/ssl/private/serre.key;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://localhost:1880;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Rate limiting (optionnel)
        limit_req zone=api burst=10 nodelay;
    }
}

# Rate limiting
limit_req_zone $binary_remote_addr zone=api:10m rate=5r/s;
```

#### Cloudflare Tunnel (Tunnel à Distance)

```bash
# Installer cloudflared
curl -L --output cloudflared.tgz https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64.tgz
tar -xzf cloudflared.tgz
sudo mv cloudflared /usr/local/bin/

# Créer un tunnel
cloudflared tunnel create serre-api

# Configurer la route DNS
cloudflared tunnel route dns serre-api api.votre-domaine.com

# Config ~/.cloudflared/config.yml
tunnel: serre-api
credentials-file: ~/.cloudflared/serre-api.json

ingress:
  - hostname: api.votre-domaine.com
    service: http://localhost:1880
  - service: http_status:404

# Lancer le tunnel
cloudflared tunnel run serre-api
```

### Variables d'Environnement Recommandées

```bash
# Sécurité
API_TOKEN="votre-token-ultra-secret-ici"

# Node-RED
NODE_RED_USER_DIR="/data/node-red"
NODE_RED_ADMIN_HASH="hash-du-password-admin"

# MQTT Local
MQTT_BROKER="localhost"
MQTT_PORT="1883"
MQTT_USER="serre"  # Optionnel si MQTT authentifié
MQTT_PASS="password"  # Optionnel

# Logging
NODE_RED_LOG="/var/log/node-red.log"
```

---

## 🔐 Sécurité Checklist

- [ ] **Token sécurisé** - Généré aléatoirement, 64 caractères hex
- [ ] **Pas de token dans le code** - Stocké uniquement en variable d'env
- [ ] **HTTPS activé** - Reverse proxy ou Cloudflare Tunnel
- [ ] **MQTT authentifié** - Si broker distant, user/pass définis
- [ ] **Firewall configuré** - Port 1880 fermé sauf proxy interne
- [ ] **Rate limiting activé** - Protection contre brute-force
- [ ] **Logs monitorés** - Alertes sur erreurs 401/403
- [ ] **Failsafes testés** - Vérification allow_global bloque bien
- [ ] **Certificats SSL** - Certificate valide et à jour

---

## 🧪 Suite de Tests

Voir les fichiers:
- `API_REST_VALIDATION.md` - Guide complet avec exemples curl
- `test_api_hardened.js` - Suite de tests automatisée

Lancer les tests:
```bash
export API_TOKEN="votre-token"
node test_api_hardened.js
```

---

## 🔍 Monitoring & Logs

### Vérifier que l'API fonctionne

```bash
# Status endpoint
curl -H "Authorization: Bearer $API_TOKEN" \
  http://localhost:1880/api/status | jq .

# Capteurs en temps réel
curl -H "Authorization: Bearer $API_TOKEN" \
  http://localhost:1880/api/sensors | jq .

# État des actionneurs
curl -H "Authorization: Bearer $API_TOKEN" \
  http://localhost:1880/api/actuators | jq .
```

### Monitorer les erreurs

```bash
# Afficher les logs Node-RED
tail -f ~/.node-red/flows_cred.json
tail -f /var/log/node-red.log  # Ou votre path de logs

# Erreurs d'authentification (401)
grep "Unauthorized" /var/log/node-red.log

# Erreurs de failsafe (403)
grep "Forbidden" /var/log/node-red.log
```

### Dashboard de Monitoring (Optional)

Node-RED Dashboard pour visualiser:
- État temps réel des capteurs
- État des actionneurs
- Historique des failsafes
- Logs des appels API

```bash
npm install node-red-dashboard
```

---

## ⚠️ Troubleshooting

| Problème | Solution |
|----------|----------|
| **HTTP 401 partout** | Vérifier `Authorization: Bearer TOKEN` header |
| **HTTP 403 sur POST** | Vérifier failsafe avec GET /api/status |
| **Timeout sur requêtes** | Vérifier Node-RED est démarré |
| **MQTT ne publie pas** | Vérifier MQTT broker localhost:1883 |
| **JSON parse error** | Vérifier `Content-Type: application/json` |
| **Token expiré** | Token n'a pas d'expiration - revoir la logique |

---

## 📞 Support & Maintenance

### Logs de Débogage

Activer la verbosité Node-RED:
```bash
export NODE_RED_LOG_LEVEL=debug
node-red
```

### Réinitialiser le Token

```bash
# Générer un nouveau token
export NEW_TOKEN=$(openssl rand -hex 32)

# Redémarrer Node-RED avec le nouveau token
export API_TOKEN=$NEW_TOKEN
systemctl restart node-red  # Ou relancer manuellement
```

### Audit des Accès

```bash
# Chercher tous les appels API dans les logs
grep "Authorization\|api/" /var/log/node-red.log | head -100
```

---

## 📦 Fichiers Associés

- `flows.json` - Configurations des flows Node-RED
- `API_REST_VALIDATION.md` - Guide de validation complet
- `API_REST_HARDENING_SUMMARY.md` - Résumé des sécurités appliquées
- `test_api_hardened.js` - Suite de tests Node.js
- `.github/copilot-instructions.md` - Guidelines pour IA agents

---

**Dernière mise à jour:** 14 janvier 2026
**Version API:** 1.0 - Sécurisée
**Status:** ✅ Prêt pour Production
