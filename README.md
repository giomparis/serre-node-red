# Serre Connectée — Flows Node-RED

Ce dossier contient les flows Node-RED pilotant une serre connectée. Il orchestre les capteurs (air et sol), les actionneurs (chauffage, extracteur, pompe), et des couches de sécurité (failsafe) au-dessus de la logique métier.

## Aperçu
- Plateforme: Node-RED + MQTT
- Intégration capteurs: Zigbee2MQTT (Aqara air), ESP32 (humidité sol)
- Actionneurs: chauffage, extracteur d’air, pompe d’arrosage
- Couches de sécurité (failsafe): spécifique (climat/arrosage) + globale (composition AND)
- Fichiers:
  - [flows.json](flows.json): export des flows Node-RED
  - [config_topics.txt](config_topics.txt): inventaire des topics de configuration

## Architecture
- Broker MQTT (ex: `localhost:1883`) → alimente Node-RED et les devices
- Zigbee2MQTT publie la disponibilité et les mesures air
- ESP32 publie l’humidité du sol
- Node-RED:
  - calcule l’autorisation des moteurs via failsafe
  - décide des ordres aux actionneurs
  - publie/consomme les topics de configuration

Schéma simplifié:
```
Capteurs (Z2M, ESP32) ──> MQTT ──> Node-RED ──> Actionneurs
                             ▲           │
                             └── Config ─┘
```

## Topics principaux
- Failsafe
  - `serre/failsafe/allow.climat` (bool)
  - `serre/failsafe/allow.arrosage` (bool)
  - `serre/failsafe/allow.global` (bool) = AND des deux précédents
- Capteurs (exemples)
  - Air: température, humidité, disponibilité (Zigbee2MQTT)
  - Sol: humidité (ESP32)
- Actionneurs
  - `serre/actionneurs/chauffage/set` → `ON`/`OFF`
  - `serre/actionneurs/extracteur/set` → `ON`/`OFF`
  - `serre/actionneurs/pompe/set` → `ON`/`OFF`
- Intention arrosage (pilotage par pulses)
  - `serre/arrosage/intention` → `ON`/`OFF`
- Commandes Web (broker distant)
  - `serre/web/cmd/#` → commandes depuis interface web
  - Validées uniquement si `allow.global === true`
  - Mappées vers `serre/config/*` ou `serre/actionneurs/*/set`

## Configuration dynamique
Les valeurs de seuils et de paramètres sont reçues via des topics `serre/config/...` (voir [config_topics.txt](config_topics.txt)). Principaux réglages:
- Climat
  - `serre/config/temp_min`, `serre/config/temp_max`
  - `serre/config/hum_max`
  - `serre/config/mode_nuit`, `serre/config/temp_min_nuit`, `serre/config/temp_max_nuit`
  - `serre/config/auto_mode`
- Arrosage
  - `serre/config/sol_min`, `serre/config/sol_max`
  - `serre/config/arrosage/pulse_duration`, `serre/config/arrosage/pause_duration`, `serre/config/arrosage/max_pulses`

## Couches de sécurité (Failsafe)
- Spécifique Climat
  - Basé sur disponibilité du capteur air (Zigbee2MQTT)
  - Débounce: ~5s; Hystérésis: bascule à `false` après 2 OFFLINE consécutifs
  - Publie `serre/failsafe/allow.climat` avec `retain: true`
- Spécifique Arrosage
  - Basé sur validité et fréquence des mesures d’humidité sol
  - Invalide ou timeout (10 min) → `false` immédiat; `true` seulement après 2 mesures valides consécutives
  - Publie `serre/failsafe/allow.arrosage` avec `retain: true`
- Global
  - Composition AND des deux autorisations spécifiques  - Publie `serre/failsafe/allow.global` avec `retain: true`
- **Notifications de changement**
  - Chaque changement d'état de failsafe (climat, arrosage, ou global) publie un événement sur `serre/system/failsafe_change` (QoS=1, retain)
  - Payload: JSON avec `timestamp`, `name`, `previous`, `current`, `transition`
  - Exemple: `{"timestamp": "2026-01-12T14:30:45.123Z", "name": "allow_climat", "previous": true, "current": false, "transition": "true → false"}`  - Publie `serre/failsafe/allow.global` avec `retain: true`

Priorité stricte appliquée dans les moteurs:
1. GLOBAL (bloquant prioritaire)
2. Spécifique (climat/arrosage)
3. Logique métier

Logs explicites:
- Activation/levée globale: "Failsafe GLOBAL ACTIF" / "Failsafe GLOBAL LEVÉ"
- Blocage moteur:
  - Climat: "Climat bloqué par FAILSAFE GLOBAL" ou "Climat bloqué par failsafe climat"
  - Arrosage: "Arrosage bloqué par FAILSAFE GLOBAL" ou "Arrosage bloqué par failsafe arrosage"

## Commandes Web (broker distant)
Le système accepte des commandes depuis un broker MQTT web **uniquement si le failsafe global est actif** (`allow.global === true`). Cette architecture garantit:
- Aucune dépendance bloquante vers le web
- Sécurité: commandes refusées si capteurs défaillants
- Logs explicites des refus

Topics web autorisés:
```
serre/web/cmd/climat/temp_min → serre/config/temp_min
serre/web/cmd/climat/temp_max → serre/config/temp_max
serre/web/cmd/climat/hum_max → serre/config/hum_max
serre/web/cmd/climat/auto_mode → serre/config/auto_mode
serre/web/cmd/climat/mode_nuit → serre/config/mode_nuit
serre/web/cmd/climat/temp_min_nuit → serre/config/temp_min_nuit
serre/web/cmd/climat/temp_max_nuit → serre/config/temp_max_nuit

serre/web/cmd/arrosage/sol_min → serre/config/sol_min
serre/web/cmd/arrosage/sol_max → serre/config/sol_max
serre/web/cmd/arrosage/pulse_duration → serre/config/arrosage/pulse_duration
serre/web/cmd/arrosage/pause_duration → serre/config/arrosage/pause_duration
serre/web/cmd/arrosage/max_pulses → serre/config/arrosage/max_pulses

serre/web/cmd/actionneur/chauffage/set → serre/actionneurs/chauffage/set (ON|OFF)
serre/web/cmd/actionneur/extracteur/set → serre/actionneurs/extracteur/set (ON|OFF)
serre/web/cmd/actionneur/pompe/set → serre/actionneurs/pompe/set (ON|OFF)
serre/web/cmd/actionneur/lampe/set → serre/actionneurs/lampe/set (ON|OFF)
```

Validation (chaîne de filtres):
1. **Failsafe global** (`allow.global === true`) - priorité absolue
2. **Whitelist de topics** - seuls les topics autosés passent
3. **Validation du payload** (type, valeurs attendues)
   - **Climat**:
     - `temp_min`, `temp_max`, `temp_min_nuit`, `temp_max_nuit`: nombre **0–50°C**
     - `hum_max`: nombre **0–100%**
     - `auto_mode`, `mode_nuit`: booléen (`true`/`false`)
   - **Arrosage**:
     - `sol_min`, `sol_max`: nombre **0–100%**
     - `pulse_duration`, `pause_duration`, `max_pulses`: entier **> 0**
   - **Actionneurs** (`chauffage`, `extracteur`, `pompe`, `lampe`):
     - Payload: `ON` ou `OFF` (casse insensible)
4. **Rate limiter** - max 1 commande par topic tous les 5 secondes
   - Commandes rapides rejetées: `"Commande web refusée (rate limit): <topic> - min 5s entre cmds, attendu Xs"`
5. **Déduplicateur** - arrête les commandes oscillantes (même payload consécutif)
   - Détecte: `serre/web/cmd/climat/temp_min = 20` suivi immédiatement de `20` → 2e rejetée
   - Log: `"Commande dédupliquée (oscillation): <topic> = <payload>"`
   - Historique: stocké par topic dans flow context, nettoyé à 100+ entrées
6. **Web Broker Timeout** - détecte déconnexion du broker web
   - Monitore: dernière commande web reçue
   - Threshold: 30 secondes sans commande = status DOWN
   - Notifie sur `serre/system/web_broker_status` (QoS=1, retain)
   - Bloque les commandes si broker DOWN
   - Payload: JSON avec `timestamp`, `status` (UP/DOWN), `downtime_seconds` ou `last_command_ago`

Log des refus: inclut raison + contexte
Log des acceptations: `"Commande web acceptée: <subtopic> = <payload>"`

## Moteurs
- Climat (`Climat engine`)
  - Chauffage: ON si `temp < temp_min`; OFF si `temp > temp_min + hyst` (hyst ~1°C)
  - Extracteur: ON si `temp > temp_max` ou `hum_air > hum_max`; OFF si `temp < temp_max - hyst` ET `hum_air < hum_max - 5`
  - Mode nuit: remplace `temp_min`/`temp_max` par valeurs nuit
  - Fonctionne uniquement si `allow.global` ET `allow.climat` sont `true`
- Arrosage (`Arrosage engine`)
  - Décide `serre/arrosage/intention` (ON/OFF) selon `hum_sol` vs `sol_min/sol_max`
  - Le pulseur exécute des cycles contrôlés par `pulse_duration`, `pause_duration`, `max_pulses`
  - Fonctionne uniquement si `allow.global` ET `allow.arrosage` sont `true`

## Importer et démarrer
1. Ouvrir Node-RED → Menu → Importer → sélectionner [flows.json](flows.json)
2. Configurer le **broker MQTT** (serveur, port, TLS si besoin, identifiants) dans le nœud "mqtt-broker"
3. Déployer les flows

## Tests rapides (MQTT)
> Remplacez `<host>`, `<user>`, `<pass>` par vos valeurs. Si votre broker n'exige pas d'authentification, omettez `-u` et `-P`.

Activer/désactiver FAILSAFE spécifique:
```bash
# Climat ON
mosquitto_pub -h localhost -u zigbee -P <pass> -t serre/failsafe/allow.climat -m true -r
# Climat OFF
mosquitto_pub -h localhost -u zigbee -P <pass> -t serre/failsafe/allow.climat -m false -r

# Arrosage ON
mosquitto_pub -h localhost -u zigbee -P <pass> -t serre/failsafe/allow.arrosage -m true -r
# Arrosage OFF
mosquitto_pub -h localhost -u zigbee -P <pass> -t serre/failsafe/allow.arrosage -m false -r
```

Changer des seuils de configuration:
```bash
# Température minimale (jour)
mosquitto_pub -h localhost -u zigbee -P <pass> -t serre/config/temp_min -m 18
# Humidité air max
mosquitto_pub -h localhost -u zigbee -P <pass> -t serre/config/hum_max -m 75
# Seuils sol
mosquitto_pub -h localhost -u zigbee -P <pass> -t serre/config/sol_min -m 30
mosquitto_pub -h localhost -u zigbee -P <pass> -t serre/config/sol_max -m 60
```

## Commandes Terminal (vérification & debug)

### Exécution via SSH (Raspberry Pi)
Les commandes ci-dessous sont prévues pour être exécutées sur votre Raspberry. Connectez-vous en SSH, puis lancez-les depuis cette session:

```bash
# Connexion SSH au Raspberry (hôte domorasp)
ssh kokomalabar@domorasp
```

Pré-requis: le paquet `mosquitto-clients` doit être installé pour disposer de `mosquitto_pub` et `mosquitto_sub`.

```bash
sudo apt update
sudo apt install -y mosquitto-clients
```

### Surveillance en temps réel
```bash
# Tout le namespace serre (topics + payloads)
mosquitto_sub -h localhost -u zigbee -P <pass> -v -t 'serre/#'

# Failsafe uniquement (affiche les booléens)
mosquitto_sub -h localhost -u zigbee -P <pass> -v -t 'serre/failsafe/#'

# Actionneurs (voir les ordres ON/OFF envoyés)
mosquitto_sub -h localhost -u zigbee -P <pass> -v -t 'serre/actionneurs/#'

# Capteurs air (température et humidité)
mosquitto_sub -h localhost -u zigbee -P <pass> -v -t 'serre/capteurs/air/#'

# Capteur sol (humidité)
mosquitto_sub -h localhost -u zigbee -P <pass> -v -t 'serre/capteurs/sol/#'
```

Astuce: ajoutez `-R` pour ignorer les messages retained si vous voulez n'afficher que les nouveaux.

### Tests FAILSAFE (lecture/écriture)
```bash
# Voir l'état courant (y compris retained)
mosquitto_sub -h localhost -u zigbee -P <pass> -v -t 'serre/failsafe/#'

# Basculer le global via les spécifiques
mosquitto_pub -h localhost -u zigbee -P <pass> -t serre/failsafe/allow.climat -m true -r
mosquitto_pub -h localhost -u zigbee -P <pass> -t serre/failsafe/allow.arrosage -m true -r

# Forcer un blocage global (ex: arrosage à false)
mosquitto_pub -h localhost -u zigbee -P <pass> -t serre/failsafe/allow.arrosage -m false -r
```

### Commandes WEB (simulation broker distant)
```bash
# Tester commandes ACCEPTÉES (failsafe global must be true)
mosquitto_pub -h localhost -u zigbee -P <pass> -t serre/web/cmd/climat/temp_min -m 19
mosquitto_pub -h localhost -u zigbee -P <pass> -t serre/web/cmd/arrosage/sol_min -m 30
mosquitto_pub -h localhost -u zigbee -P <pass> -t serre/web/cmd/actionneur/chauffage/set -m ON

# Tester REJETS DE VALIDATION (payloads hors-limites)
mosquitto_pub -h localhost -u zigbee -P <pass> -t serre/web/cmd/climat/temp_min -m 100
# → Log: "Commande refusée (hors plage): temp_min doit être 0-50, reçu: 100"

mosquitto_pub -h localhost -u zigbee -P <pass> -t serre/web/cmd/arrosage/sol_max -m -5
# → Log: "Commande refusée (hors plage): sol_max 0-100, reçu: -5"

mosquitto_pub -h localhost -u zigbee -P <pass> -t serre/web/cmd/arrosage/pulse_duration -m 0
# → Log: "Commande refusée (invalide): pulse_duration entier > 0, reçu: 0"

mosquitto_pub -h localhost -u zigbee -P <pass> -t serre/web/cmd/actionneur/pompe/set -m MAYBE
# → Log: "Commande refusée (invalide): actionneur ON/OFF, reçu: MAYBE"

# Tester RATE LIMITER (max 1 cmd / 5s par topic)
mosquitto_pub -h localhost -u zigbee -P <pass> -t serre/web/cmd/climat/temp_min -m 19
sleep 1
mosquitto_pub -h localhost -u zigbee -P <pass> -t serre/web/cmd/climat/temp_min -m 20
# → Log 2e cmd: "Commande web refusée (rate limit): serre/web/cmd/climat/temp_min - min 5s entre cmds, attendu 4s"

sleep 4
mosquitto_pub -h localhost -u zigbee -P <pass> -t serre/web/cmd/climat/temp_min -m 21
# → Log 3e cmd (après 5s): "Commande web acceptée (rate limit): serre/web/cmd/climat/temp_min"

# Tester REJET FAILSAFE (forcer failsafe à false)
mosquitto_pub -h localhost -u zigbee -P <pass> -t serre/failsafe/allow.climat -m false -r
mosquitto_pub -h localhost -u zigbee -P <pass> -t serre/web/cmd/climat/temp_max -m 25
# → Log: "Commande web refusée (failsafe global)"

# Surveiller les notifications de changement failsafe
mosquitto_sub -h localhost -u zigbee -P <pass> -v -t 'serre/system/failsafe_change'

# Déclencher une notification en basculant le failsafe climat
mosquitto_pub -h localhost -u zigbee -P <pass> -t serre/failsafe/allow.climat -m false -r
# → MQTT message sur serre/system/failsafe_change avec:
# {"timestamp": "2026-01-12T14:30:45.123Z", "name": "allow_climat", "previous": true, "current": false, "transition": "true → false"}

# Rétablir
mosquitto_pub -h localhost -u zigbee -P <pass> -t serre/failsafe/allow.climat -m true -r
# → Autre notification: "true → false" + "false → true"

# Tester DÉDUPLICATION (oscillations)
mosquitto_pub -h localhost -u zigbee -P <pass> -t serre/web/cmd/climat/temp_min -m 19
mosquitto_pub -h localhost -u zigbee -P <pass> -t serre/web/cmd/climat/temp_min -m 19
# → Log 2e cmd: "Commande dédupliquée (oscillation): serre/web/cmd/climat/temp_min = 19"

mosquitto_pub -h localhost -u zigbee -P <pass> -t serre/web/cmd/climat/temp_min -m 20
# → Log: "Commande acceptée (dedup)" (payload différent)

mosquitto_pub -h localhost -u zigbee -P <pass> -t serre/web/cmd/climat/temp_min -m 20
# → Log: "Commande dédupliquée (oscillation)" (même 20 que précédent)

# Tester WEB BROKER TIMEOUT (30s sans commande)
mosquitto_sub -h localhost -u zigbee -P <pass> -v -t 'serre/system/web_broker_status'

# Depuis 30s attendre notification DOWN
# → Message: {"timestamp": "...", "status": "DOWN", "last_command_ago": 30000}
# Nouvelles commandes web seront bloquées

# Récupérer
mosquitto_pub -h localhost -u zigbee -P <pass> -t serre/web/cmd/climat/temp_min -m 22
# → Log: "Track Web CMD" → broker status devient UP
# → Notification: {"status": "UP", "downtime_seconds": 30}
```

### Simulation capteurs
```bash
# Température air (simule un capteur Zigbee agrégé par Node-RED)
mosquitto_pub -h localhost -u zigbee -P <pass> -t serre/capteurs/air/temperature -m 26

# Humidité air
mosquitto_pub -h localhost -u zigbee -P <pass> -t serre/capteurs/air/humidity -m 80

# Humidité du sol (ESP32)
mosquitto_pub -h localhost -u zigbee -P <pass> -t serre/capteurs/sol/humidite -m 25
```

### Vérification des actionneurs
```bash
# Chauffage / Extracteur / Pompe (ordres envoyés par les moteurs)
mosquitto_sub -h localhost -u zigbee -P <pass> -v -t 'serre/actionneurs/chauffage/#'
mosquitto_sub -h localhost -u zigbee -P <pass> -v -t 'serre/actionneurs/extracteur/#'
mosquitto_sub -h localhost -u zigbee -P <pass> -v -t 'serre/actionneurs/pompe/#'

# Intention d'arrosage (pilote le pulseur)
mosquitto_sub -h localhost -u zigbee -P <pass> -v -t 'serre/arrosage/intention'
```

### Node-RED & Broker (diagnostic)
```bash
# Vérifier la reachabilité du broker
mosquitto_pub -h localhost -u zigbee -P <pass> -t serre/test -m hello
mosquitto_sub -h localhost -u zigbee -P <pass> -v -t 'serre/test'

# (Linux) Journal Node-RED en service systemd
sudo journalctl -u nodered.service -f

# (Raspberry Pi OS) utilitaire dédié
node-red-log

# Démarrer Node-RED en interactif (affiche les logs en direct)
node-red
```

### Scénarios de debug utiles
- Failsafe global reste à false: observez `serre/failsafe/#`, assurez-vous que les deux spécifiques sont `true` et retained.
- Climat ne déclenche pas le chauffage: publiez `serre/capteurs/air/temperature` juste sous `temp_min` et surveillez `serre/actionneurs/chauffage/set`.
- Arrosage ne part pas: vérifiez `serre/failsafe/allow.arrosage`, puis publiez `serre/capteurs/sol/humidite` en dessous de `sol_min` et observez `serre/arrosage/intention` puis la pompe.

## Bonnes pratiques
- Éviter les espaces ou fautes dans les noms de topics (une espace de trop casse la souscription)
- Utiliser `retain: true` pour les états critiques (failsafe, config persistante)
- Définir une **hystérésis** suffisante pour limiter le flap
- Surveiller les logs Node-RED lors des tests et déploiements

## Dépannage
- `allow.global` reste `false`:
  - Vérifier que les deux spécifiques publient des `bool` et qu’ils sont `retain: true`
  - Confirmer la disponibilité capteur air (Zigbee2MQTT) et la fraîcheur des mesures sol (watchdog 10 min)
- Alternance rapide ON/OFF:
  - Ajuster debounce/hystérésis côté capteur air
  - Vérifier la stabilité des mesures sol
- Aucun ordre aux actionneurs:
  - Vérifier que `allow.global` ET le spécifique du moteur sont `true`
  - Contrôler les valeurs de config

## Maintenance
- Mettre à jour [flows.json](flows.json) via Node-RED (export/import)
- Documenter chaque nouveau topic dans [config_topics.txt](config_topics.txt)
- Journaliser clairement les blocages failsafe et les décisions moteur

## API REST

L'API REST HTTP permet de consulter l'état et d'envoyer des commandes à la serre sans exposer MQTT à l'extérieur.

### Sécurité
- **Authentification**: Token Bearer obligatoire sur toutes les requêtes
- Header: `Authorization: Bearer 0a79e1781bc24ad75e4545fe781ff0a099e321303984b933d5d532df831b81ee`
- Requête sans token → HTTP 401 Unauthorized
- Compatible Cloudflare Tunnel / HTTPS
- ⚠️ **Changez le token en production!**

### Endpoints

#### GET /api/status
Retourne l'état général du système.

**Exemple:**
```bash
curl -H 'Authorization: Bearer SUPER_SECRET_TOKEN' \
  http://localhost:1880/api/status
```

**Réponse:**
```json
{
  "uptime": 3600,
  "culture_phase": "vegetatif",
  "failsafe": {
    "global": true,
    "climat": true,
    "arrosage": true
  },
  "timestamp": "2026-01-12T15:30:00.000Z"
}
```

**Notes:**
- `uptime` (en secondes): peut être `null` si Node-RED vient de redémarrer (avant le calcul du timestamp initial)
- `culture_phase`: "unknown" par défaut si non initialisée

#### GET /api/sensors
Retourne les valeurs des capteurs.

**Exemple:**
```bash
curl -H 'Authorization: Bearer SUPER_SECRET_TOKEN' \
  http://localhost:1880/api/sensors
```

**Réponse:**
```json
{
  "air": {
    "temperature": 22.5,
    "humidity": 65
  },
  "soil": {
    "humidity": 45
  },
  "timestamp": "2026-01-12T15:30:00.000Z"
}
```

#### GET /api/actuators
Retourne l'état courant des actionneurs.

**Exemple:**
```bash
curl -H 'Authorization: Bearer SUPER_SECRET_TOKEN' \
  http://localhost:1880/api/actuators
```

**Réponse:**
```json
{
  "lampe": "ON",
  "extracteur": "OFF",
  "pompe": "OFF",
  "ventilation_atmo": "OFF",
  "ventilation_chauffage": "ON",
  "timestamp": "2026-01-12T15:30:00.000Z"
}
```

#### POST /api/actuators/:name
Commande un actionneur (publie sur MQTT local).

**Actionneurs disponibles:** `lampe`, `extracteur`, `pompe`, `chauffage`, `ventilation_atmo`, `ventilation_chauffage`

**Exemple:**
```bash
curl -X POST \
  -H 'Authorization: Bearer SUPER_SECRET_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"state": "ON"}' \
  http://localhost:1880/api/actuators/lampe
```

**Réponse:**
```json
{
  "success": true,
  "actuator": "lampe",
  "state": "ON",
  "topic": "serre/actionneurs/lampe/set"
}
```

#### POST /api/culture/phase
Définit la phase de culture (stocké en flow context + publié sur MQTT).

**Phases disponibles:** `germination`, `vegetatif`, `floraison`, `drying`

**Exemple:**
```bash
curl -X POST \
  -H 'Authorization: Bearer SUPER_SECRET_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"phase": "floraison"}' \
  http://localhost:1880/api/culture/phase
```

**Réponse:**
```json
{
  "success": true,
  "phase": "floraison",
  "topic": "serre/culture/phase"
}
```

#### POST /api/override
Override manuel des failsafes (publie sur MQTT retain).

**Targets disponibles:** `climat`, `arrosage`, `global`

**Exemple:**
```bash
curl -X POST \
  -H 'Authorization: Bearer SUPER_SECRET_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"target": "climat", "state": false}' \
  http://localhost:1880/api/override
```

**Réponse:**
```json
{
  "success": true,
  "target": "climat",
  "state": false,
  "topic": "serre/failsafe/allow.climat"
}
```

### Notes importantes
- L'API ne contient **aucune logique métier**
- Les GET lisent le flow context Node-RED
- Les POST publient sur MQTT local uniquement
- Les moteurs existants ne sont **pas modifiés**
- Aucune exposition MQTT vers l'extérieur

## Licence & Sécurité
- Ne placez **aucun secret** (identifiants, mots de passe) dans le dépôt.
- Configurez les identifiants **directement** dans le nœud broker ou via variables d'environnement.
- **Changez le token API** `SUPER_SECRET_TOKEN` en production!
