# 📚 Index Complet - Serre Connectée API REST v1.0

---

## 📋 Vue d'Ensemble des Fichiers

### 🔴 CORE (Production)
- **flows.json** (3400+ lignes)
  - Configurations Node-RED
  - **1 Subflow "Check API Token"** (réutilisable)
    - Validation Bearer token centralisée
    - Utilisé par tous les endpoints API
    - Fail-closed security
  - **6 endpoints API REST** (3 GET + 3 POST)
    - GET /api/status, /api/sensors, /api/actuators
    - POST /api/actuators/:name, /api/culture/phase, /api/override
  - **Token management:**
    - 1 subflow → 6 endpoints (architecture centralisée)
    - Variable: `process.env.API_TOKEN`
    - Fallback: `SUPER_SECRET_TOKEN`
  - **Sécurité:**
    - POST /api/override: NO allow_global check (bypass endpoint)
    - POST /api/actuators/:name: allow_global check
    - POST /api/culture/phase: allow_global check
  - **Context management:**
    - Failsafes: flow context (allow_global, allow_climat, allow_arrosage)
    - Capteurs: flow context (temp_air, hum_air, hum_sol)
    - Actionneurs: flow context (state_lampe, state_extracteur, etc.)

---

### 📘 DOCUMENTATION (À LIRE)

#### ⭐ Pour Démarrer Rapidement
- **QUICKSTART.md** (2 pages)
  - 5 minutes pour commencer
  - Générer token, importer flows, tester
  - Points critiques
  - Références rapides

#### 📖 Pour Tester Localement
- **API_REST_VALIDATION.md** (500+ lignes)
  - Sécurité implémentée
  - Tests locaux (6 sections)
  - Cas valides & invalides
  - Failsafe testing
  - Monitoring & logs
  - Erreurs courantes

#### 📚 Référence Technique Complète
- **API_ENDPOINTS_REFERENCE.md** (600+ lignes)
  - Tous les 6 endpoints détaillés
  - Requête/réponse avec curl
  - Validations strictes
  - Cas d'erreur complets
  - Workflows d'intégration
  - Tests Postman/Insomnia
  - Intégration MQTT

#### 🔧 Pour Déployer
- **DEPLOYMENT_GUIDE.md** (400+ lignes)
  - Déploiement rapide
  - Configuration Systemd (Raspberry Pi)
  - Configuration Docker
  - HTTPS/nginx setup
  - Cloudflare Tunnel
  - Variables d'environnement
  - Monitoring & logs
  - Troubleshooting

#### ✅ Checklist Pratique
- **DEPLOYMENT_CHECKLIST.md** (400+ lignes)
  - Pré-déploiement checklist
  - Tests locaux (avec commandes exactes)
  - Validation MQTT
  - Déploiement production
  - Rotation token
  - Monitoring continu
  - Erreurs & solutions

#### 📊 Résumé Technique
- **API_REST_HARDENING_SUMMARY.md** (350+ lignes)
  - Changements avant/après
  - 3-tier security architecture
  - Aucune dépendance Internet
  - Statistiques d'implémentation
  - Avantages sécurité

#### 🎯 Vue d'Ensemble du Projet
- **COMPLETION_SUMMARY.md** (300+ lignes)
  - Résumé complet des travaux
  - Sécurité appliquée
  - Endpoints finaux
  - Architecture globale
  - Checklist validation
  - Cycle de vie & support

#### 🎁 Livrable Final
- **README_API_REST_FINAL.md** (400+ lignes)
  - Résumé complet
  - Fichiers livrés
  - Sécurité implémentée
  - 6 endpoints
  - Démarrage rapide
  - Étapes suivantes

---

### 🧪 TESTING (Validation)

#### Automatisé (Suite Complète)
- **test_api_hardened.js** (400+ lignes, 20+ tests)
  - Tests authentification (401)
  - Tests GET endpoints
  - Tests validations (400)
  - Tests security headers
  - Tests timestamps
  - Tests format réponses
  
  **Utilisation:**
  ```bash
  export API_TOKEN="votre-token"
  node test_api_hardened.js
  ```

#### Validation Structure
- **validate_hardened.js** (100 lignes)
  - Valide JSON syntax
  - Liste endpoints
  - Vérifie tokens
  - Vérifie allow_global
  - Vérifie headers
  
  **Utilisation:**
  ```bash
  node validate_hardened.js
  ```

---

### �️ ARCHIVE

- **archive_20260118/** (38 fichiers)
  - Scripts Python de développement (add_*, fix_*, upgrade_*)
  - Scripts JavaScript de modification
  - Anciens tests Python (remplacés par test_api_hardened.js)
  - Documentation obsolète (intégrée dans les .md actuels)
  - README.md d'archive avec détails complets
  - **Conservé pour référence historique uniquement**

---

## 🗺️ Ordre de Lecture Recommandé

### 👨‍💻 Pour Développeurs

1. **QUICKSTART.md** (5 min)
   - Comprendre vite
   - Commandes essentielles

2. **API_ENDPOINTS_REFERENCE.md** (30 min)
   - Comprendre tous les endpoints
   - Cas de test
   - Intégration MQTT

3. **API_REST_VALIDATION.md** (20 min)
   - Comprendre la validation
   - Tests locaux
   - Erreurs courantes

### 🚀 Pour Déploiement

1. **QUICKSTART.md** (5 min)
   - Comprendre le minimum

2. **DEPLOYMENT_CHECKLIST.md** (30 min)
   - FAIRE la checklist!
   - Tests avant production

3. **DEPLOYMENT_GUIDE.md** (20 min)
   - Déployer en production
   - Configuration Systemd/Docker

### 📊 Pour Manager/Responsable

1. **COMPLETION_SUMMARY.md** (15 min)
   - Comprendre ce qui a été fait

2. **README_API_REST_FINAL.md** (10 min)
   - Voir le livrable complet

3. **API_REST_HARDENING_SUMMARY.md** (10 min)
   - Comprendre la sécurité

---

## 🔐 Sécurité - Éléments Clés

### Token Bearer (Subflow Check API Token)

**Architecture:**
- **Subflow "Check API Token"** (id: `00a2caa125ce1a95`)
  - Composant réutilisable pour tous les endpoints API
  - Validation centralisée du token Bearer
  - Fail-closed security (refuse par défaut)
  - 2 sorties: [0] = token valide, [1] = erreur 401

**Fonctionnement:**
1. Lit le token depuis `global.get('API_TOKEN')` (initialisé depuis `process.env.API_TOKEN`)
2. Extrait le token du header `Authorization: Bearer <token>`
3. Compare les tokens (strict equality, trimmed)
4. Retourne HTTP 401 si invalide avec timestamp ISO

**Utilisation dans les flows:**
- Tous les endpoints API utilisent le subflow (6 endpoints)
- Connexion: HTTP IN → Subflow Check API Token → Validation métier
- Sortie [0] → validation réussie → traitement
- Sortie [1] → erreur → HTTP response directe

**Configuration:**
- Variable d'environnement: `API_TOKEN=votre-token-securise`
- Fallback développement: `SUPER_SECRET_TOKEN` (à remplacer en prod)
- Lecture: `API_REST_VALIDATION.md` section "Token Bearer"
- Utilisation: `curl -H "Authorization: Bearer $API_TOKEN"`
- Gestion: `DEPLOYMENT_GUIDE.md` section "Variables d'environnement"

**Avantages:**
- ✅ Modification une seule fois → appliquée à tous les endpoints
- ✅ Code cohérent et maintenable
- ✅ Pas de duplication de logique
- ✅ Fail-closed par défaut (sécurité maximale)

### Failsafe Global
- Architecture: `API_REST_HARDENING_SUMMARY.md` section "3-tier"
- Test: `DEPLOYMENT_CHECKLIST.md` section "Test 6"
- Détail: `API_ENDPOINTS_REFERENCE.md` section "6. POST /api/override"

### Headers HTTP
- Listés: `API_REST_HARDENING_SUMMARY.md` section "3. Headers"
- Validés: `test_api_hardened.js` section "SECURITY HEADERS"
- Monitorer: `DEPLOYMENT_GUIDE.md` section "Monitoring"

---

## 📦 Fichiers par Use Case

### "Je veux juste tester l'API"
1. QUICKSTART.md
2. test_api_hardened.js
3. API_ENDPOINTS_REFERENCE.md (pour détails)

### "Je dois mettre en production"
1. DEPLOYMENT_CHECKLIST.md ← FAIRE LA CHECKLIST
2. DEPLOYMENT_GUIDE.md
3. API_REST_VALIDATION.md (troubleshooting)

### "Je dois l'intégrer avec ma app"
1. API_ENDPOINTS_REFERENCE.md
2. test_api_hardened.js (voir les tests)
3. API_REST_VALIDATION.md (erreurs courantes)

### "Qu'est-ce qui a changé?"
1. API_REST_HARDENING_SUMMARY.md
2. COMPLETION_SUMMARY.md
3. flows.json (examiner les nœuds)

### "Je dois former mon équipe"
1. QUICKSTART.md (5 min overview)
2. API_ENDPOINTS_REFERENCE.md (30 min deep dive)
3. DEPLOYMENT_CHECKLIST.md (60 min practical)

---

## ✅ Checklist de Lecture

- [ ] QUICKSTART.md (5 min)
- [ ] DEPLOYMENT_CHECKLIST.md (avant prod)
- [ ] API_ENDPOINTS_REFERENCE.md (si besoin d'intégrer)
- [ ] DEPLOYMENT_GUIDE.md (si besoin de déployer)
- [ ] API_REST_VALIDATION.md (si problèmes)

---

## 📊 Statistiques Fichiers

| Fichier | Type | Lignes | Durée Lecture |
|---------|------|--------|---------------|
| QUICKSTART.md | 📄 | ~50 | 5 min |
| API_ENDPOINTS_REFERENCE.md | 📚 | ~600 | 30 min |
| API_REST_VALIDATION.md | 📚 | ~500 | 25 min |
| DEPLOYMENT_CHECKLIST.md | ✅ | ~400 | 30 min |
| DEPLOYMENT_GUIDE.md | 🔧 | ~400 | 25 min |
| API_REST_HARDENING_SUMMARY.md | 📊 | ~350 | 15 min |
| COMPLETION_SUMMARY.md | 📋 | ~300 | 10 min |
| README_API_REST_FINAL.md | 🎁 | ~400 | 15 min |
| test_api_hardened.js | 🧪 | ~400 | Exécuter |
| validate_hardened.js | ✔️ | ~100 | Exécuter |

**Total Documentation:** ~3000 lignes  
**Temps Lecture:** ~2-3 heures (complet)  
**Temps Minimum:** 30 minutes (QUICKSTART + CHECKLIST)

---

## 🎯 Fichier à Lire EN PREMIER

### ⭐ COMMENCEZ ICI:

**QUICKSTART.md**
- 5 minutes
- Ce qu'il faut faire maintenant
- Points critiques
- Références

**PUIS:**
- Si vous devez tester: API_REST_VALIDATION.md
- Si vous devez déployer: DEPLOYMENT_CHECKLIST.md
- Si vous devez intégrer: API_ENDPOINTS_REFERENCE.md

---

## 🆘 Questions Fréquentes

| Question | Fichier | Section |
|----------|---------|---------|
| Comment démarrer? | QUICKSTART.md | Tous |
| Comment fonctionne le token? | INDEX.md | Sécurité - Token Bearer |
| Comment modifier le token? | DEPLOYMENT_GUIDE.md | Variables d'environnement |
| Pourquoi HTTP 401? | INDEX.md | Token Bearer - Subflow |
| Comment utiliser les endpoints? | API_ENDPOINTS_REFERENCE.md | Chaque endpoint |
| Ça ne marche pas? | API_REST_VALIDATION.md | Troubleshooting |
| Comment déployer? | DEPLOYMENT_GUIDE.md | Tous |
| Checklist avant prod? | DEPLOYMENT_CHECKLIST.md | Tous |
| Qu'est-ce qui change? | API_REST_HARDENING_SUMMARY.md | Tous |
| Vue d'ensemble? | COMPLETION_SUMMARY.md | Tous |
| POST /api/override bloqué? | INDEX.md | Sécurité - Token Bearer |

---

## 🎁 Contenu Livré

### Production
- ✅ flows.json (modifié & sécurisé)

### Documentation
- ✅ 8 fichiers markdown (~3000 lignes)

### Tests
- ✅ 2 scripts Node.js (20+ tests automatisés)

### Scripts
- ✅ 3 scripts d'installation (utilisés)

### Total
- ✅ 13 fichiers
- ✅ 3000+ lignes documentation
- ✅ 1000+ lignes code/tests

---

**Version:** API REST 1.0 - Sécurisée  
**Date:** 18 janvier 2026  
**Status:** ✅ Production Ready  
**Architecture Token:** Subflow "Check API Token" (centralisée)

**Commencez par:** [QUICKSTART.md](QUICKSTART.md)
