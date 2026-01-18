import os
import shutil
from datetime import datetime

# Créer un dossier archive avec la date
archive_dir = f"archive_{datetime.now().strftime('%Y%m%d')}"
os.makedirs(archive_dir, exist_ok=True)

# Fichiers à archiver (scripts de développement utilisés une seule fois)
files_to_archive = [
    # Scripts Python de modification (utilisés, mais gardés pour historique)
    'add_actuator_state_listeners.py',
    'add_api_to_flows_web1.py',
    'add_deduplicator.py',
    'add_failsafe_listener.py',
    'add_failsafe_notifications.py',
    'add_rate_limiter.py',
    'add_web_broker_timeout.py',
    'adjust_timers.py',
    'audit_flux.py',
    'check_unnamed.py',
    'find_unnamed.py',
    'fix_api_context.py',
    'fix_bugs.py',
    'fix_override_context.py',
    'fix_override_syntax.py',
    'fix_sensors_flow_context.py',
    'fix_token_hardcoded.py',
    'init_failsafe_proper.py',
    'rename_nodes.py',
    'update_validator.py',
    'upgrade_api_web1.py',
    'verify_fixes.py',
    
    # Scripts JS de modification
    'cleanup_duplicates.js',
    'harden_api.js',
    
    # Scripts Python de durcissement
    'harden_api.py',
    'create_rest_api.py',
    
    # Anciens tests Python (remplacés par test_api_hardened.js)
    'test_api_rest.py',
    'test_point2.py',
    'test_point3.py',
    'test_point4.py',
    'test_point5.py',
    'test_point6.py',
    'validate_api_web1.py',
    
    # Anciens fichiers texte
    'GUIDE_API_REST.txt',
    'web_cmd_validator_new.txt',
    'START_HERE.txt',  # Remplacé par QUICKSTART.md
    
    # Documentation obsolète
    'CORRECTIONS.md',  # Intégré dans les autres docs
    'IMPLEMENTATION_FAILSAFE.md',  # Déjà documenté ailleurs
]

# Fichiers à SUPPRIMER (vraiment pas utiles)
files_to_delete = [
    'flows copy.json',  # Copie de sauvegarde obsolète
]

print("🗂️  NETTOYAGE DU PROJET")
print("=" * 70)

# Archiver les fichiers
archived_count = 0
for file in files_to_archive:
    if os.path.exists(file):
        try:
            shutil.move(file, os.path.join(archive_dir, file))
            print(f"📦 Archivé: {file}")
            archived_count += 1
        except Exception as e:
            print(f"⚠️  Erreur archivage {file}: {e}")

print(f"\n✓ {archived_count} fichiers archivés dans {archive_dir}/")

# Supprimer les fichiers
deleted_count = 0
for file in files_to_delete:
    if os.path.exists(file):
        try:
            os.remove(file)
            print(f"🗑️  Supprimé: {file}")
            deleted_count += 1
        except Exception as e:
            print(f"⚠️  Erreur suppression {file}: {e}")

print(f"\n✓ {deleted_count} fichiers supprimés")

# Lister les fichiers restants importants
print("\n" + "=" * 70)
print("📁 FICHIERS RESTANTS (PRODUCTION + DOCUMENTATION)")
print("=" * 70)

production_files = [
    'flows.json',
    'config_topics.txt',
]

documentation_files = [
    'INDEX.md',
    'QUICKSTART.md',
    'README.md',
    'API_ENDPOINTS_REFERENCE.md',
    'API_REST_VALIDATION.md',
    'API_REST_HARDENING_SUMMARY.md',
    'DEPLOYMENT_CHECKLIST.md',
    'DEPLOYMENT_GUIDE.md',
    'COMPLETION_SUMMARY.md',
    'README_API_REST_FINAL.md',
    'contexte_projet_serre_connectee_autonome.md',
]

test_files = [
    'test_api_hardened.js',
    'validate_hardened.js',
]

print("\n🔴 PRODUCTION:")
for file in production_files:
    if os.path.exists(file):
        print(f"  ✓ {file}")

print("\n📘 DOCUMENTATION:")
for file in documentation_files:
    if os.path.exists(file):
        print(f"  ✓ {file}")

print("\n🧪 TESTS:")
for file in test_files:
    if os.path.exists(file):
        print(f"  ✓ {file}")

print("\n📂 DOSSIERS:")
if os.path.exists('.github'):
    print("  ✓ .github/ (copilot instructions)")
if os.path.exists('serre-connectee-bruno'):
    print("  ✓ serre-connectee-bruno/ (Bruno API tests)")

print("\n" + "=" * 70)
print(f"✅ NETTOYAGE TERMINÉ")
print(f"   - {archived_count} fichiers archivés")
print(f"   - {deleted_count} fichiers supprimés")
print(f"   - Archive créée: {archive_dir}/")
print("=" * 70)
