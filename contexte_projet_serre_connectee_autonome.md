# 🌱 Serre connectée autonome — Contexte projet officiel

## 🎯 Objectif du projet

Concevoir une **serre connectée fiable, autonome et sécurisée**, capable de fonctionner **sans Internet**, avec :

- Pilotage climatique automatique
- Arrosage automatisé
- Gestion par phases de culture
- Supervision et contrôle à distance **sans exposer le système critique**

> 👉 **La priorité absolue est la fiabilité, pas le confort.**

---

## 🧱 Architecture finale (choix acté)

### ✅ Option retenue — MQTT local + API REST + dashboard distant

```
ESP32 / Capteurs Zigbee
        │
        │ MQTT (réseau local uniquement)
        ▼
Mosquitto (local sur Raspberry Pi)
        │
        ▼
Node-RED (cerveau central)
│   ├─ moteurs (climat, arrosage, culture)
│   ├─ failsafes (capteurs, logique métier, global)
│   ├─ configuration (topics MQTT retain)
│   └─ API REST HTTP
│
└── HTTPS (tunnel sécurisé)
        │
        ▼
Dashboard web distant (hébergement o2switch)
```

---

## 🔒 Principes de sécurité (non négociables)

- ❌ MQTT **jamais exposé à Internet**
- ❌ Le dashboard web **ne parle jamais MQTT**
- ✅ Node-RED est **l’unique autorité**
- ✅ API REST = **seule porte vers l’extérieur**
- ✅ La serre fonctionne **même sans Internet**
- ✅ Les failsafes ont **toujours priorité** sur toute commande

---

## 🧠 Rôles des composants

### ESP32 / Zigbee
- Acquisition des capteurs
- Actionneurs physiques
- **Aucune logique métier**

### Mosquitto (local)
- Bus de messages local
- MQTT retain pour état / configuration
- **Aucune logique**

### Node-RED (cerveau central)
- Moteur climatique
- Moteur d’arrosage
- Moteur de culture (phases)
- Failsafes capteurs (availability, watchdog)
- Failsafe global (`allow_global`)
- Validation stricte des commandes web
- API REST HTTP sécurisée

> 👉 **Node-RED décide toujours.**

### API REST
- Lecture : capteurs, états, culture, failsafes
- Écriture : commandes **strictement validées**
- Authentification par token Bearer
- Aucune dépendance temps réel

### Dashboard web (o2switch)
- Interface utilisateur uniquement
- Lecture via API REST
- Commandes via API REST
- **Aucune logique métier**
- Peut tomber **sans impact sur la serre**

---

## 🛑 Philosophie des failsafes

### Principe général

> **Par défaut : tout est bloqué**

Un moteur peut agir **uniquement si** :
- `allow_global === true`
- `allow_climat === true` ou `allow_arrosage === true`

### Sources de failsafe

- Capteur air (Zigbee availability + heartbeat)
- Capteur humidité sol (watchdog ESP32)
- Phase de culture (ex : `drying` → arrosage interdit)
- Override manuel sécurisé (API REST)

### Chaîne finale

```
allow.climat  \
               → allow.global → moteurs
allow.arrosage /
```

---

## 🌱 Gestion des phases de culture

### Principe

Une **phase de culture = un profil complet** :
- Températures
- Humidité
- Arrosage
- Durée

### Activation d’une phase

- Écrase les configurations manuelles
- Verrouille les paramètres

### Phases gérées

- `germination`
- `vegetatif`
- `floraison`
- `drying` (arrosage interdit)

---

## 🌐 API REST — résumé

### Endpoints principaux

- `GET /api/status`
- `GET /api/sensors`
- `GET /api/actuators`
- `POST /api/actuators/:name`
- `POST /api/culture/phase`
- `POST /api/override`

### Règles

- HTTPS uniquement
- Token obligatoire
- Validation stricte des entrées
- Failsafe global prioritaire sur toute commande

---

## ⚙️ Contraintes techniques

- Raspberry Pi à ressources limitées
- Objectif : **charge minimale**
- Logs & historiques externalisés
- Aucune base de données locale lourde
- Stack locale : **Node-RED + Mosquitto uniquement**

---

## 🚀 Prochaines étapes logiques

1. Finalisation et durcissement de l’API REST
2. Choix d’un tunnel HTTPS sans coût
3. Spécification du contrat API ↔ dashboard
4. Développement du dashboard web
5. Externalisation des logs et métriques
6. Audit final du Raspberry Pi (CPU / RAM / I/O)

---

## 🧭 Règle d’or

La serre doit survivre à :

- Une coupure Internet
- Un crash du dashboard
- Une latence réseau
- Une erreur humaine

> 👉 **La sécurité prime toujours sur le confort.**

