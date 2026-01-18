# 🚀 QUICK START - API REST Serre Connectée

**Status:** ✅ Production Ready  
**Temps:** 5 minutes pour démarrer

---

## ⚡ En 5 Minutes

### 1. Générer Token (30 secondes)
```bash
openssl rand -hex 32
# Copier la sortie (ex: abc123...xyz)
```

### 2. Importer flows.json (1 minute)
1. Ouvrir http://localhost:1880
2. Menu → Import → Clipboard
3. Coller contenu de `flows.json`
4. Cliquer **Deploy**

### 3. Tester (1 minute)
```bash
export API_TOKEN="abc123...xyz"

curl -X GET \
  "http://localhost:1880/api/status" \
  -H "Authorization: Bearer $API_TOKEN"
```

**Résultat attendu:** HTTP 200 + JSON

### 4. Lire Checklist (2 minutes)
- Ouvrir `DEPLOYMENT_CHECKLIST.md`
- Cocher les cases ☑️
- Avant le déploiement

---

## 📖 Les 3 Fichiers à Lire

1. **DEPLOYMENT_CHECKLIST.md** (avant déploiement)
2. **API_ENDPOINTS_REFERENCE.md** (pour utiliser l'API)
3. **DEPLOYMENT_GUIDE.md** (pour production)

---

## 🔐 Sécurité Clé

```
Bearer Token: process.env.API_TOKEN
Failsafe Guard: allow_global must be true (POST)
HTTP Headers: Content-Type, X-Content-Type-Options, X-Frame-Options
```

---

## 6️⃣ Endpoints

```
GET  /api/status          ← État général
GET  /api/sensors         ← Capteurs
GET  /api/actuators       ← Actionneurs

POST /api/actuators/:name ← Commande actionneur (failsafe protected)
POST /api/culture/phase   ← Changer phase (failsafe protected)
POST /api/override        ← Override failsafe (failsafe protected)
```

---

## ✅ Tests

```bash
# Tests automatisés (20+ tests)
node test_api_hardened.js

# Résultat: ✅ TOUS LES TESTS PASSÉS
```

---

## 🎯 Checklist Avant Production

- [ ] Token généré (openssl rand -hex 32)
- [ ] flows.json importé et déployé
- [ ] Tests automatisés passent
- [ ] MQTT broker opérationnel
- [ ] Capteurs publient
- [ ] Failsafes = true
- [ ] HTTPS configuré
- [ ] Monitoring en place

---

## ⚠️ Points Critiques

❌ NE PAS:
- Commit token dans Git
- Utiliser HTTP en production
- Désactiver failsafes

✅ FAIRE:
- Utiliser process.env.API_TOKEN
- HTTPS + reverse proxy
- Monitorer erreurs 401/403

---

## 📞 Questions?

Voir les fichiers de documentation:
- `API_ENDPOINTS_REFERENCE.md` - Comment utiliser?
- `DEPLOYMENT_GUIDE.md` - Comment déployer?
- `API_REST_VALIDATION.md` - Pourquoi ça ne marche pas?
- `DEPLOYMENT_CHECKLIST.md` - Checklist avant prod?

---

**Prêt?** Lire `DEPLOYMENT_CHECKLIST.md` ✅
