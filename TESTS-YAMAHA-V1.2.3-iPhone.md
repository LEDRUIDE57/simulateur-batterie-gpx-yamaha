# Tests Yamaha V1.2.3 iPhone

## Automatiques
- `node tests/test-core.js` : moteur Yamaha.
- `node tests/test-parity-v1.js` : parité avec le moteur historique.
- `node tests/test-ios-pwa.js` : métadonnées Apple, manifest, cache, icône 180, safe areas, mode standalone et export iOS.

## Contrôles manuels à faire sur iPhone après publication
1. Ouvrir le site dans Safari.
2. Ajouter à l'écran d'accueil et lancer depuis l'icône.
3. Vérifier l'absence de recouvrement par l'encoche / Dynamic Island et la barre d'accueil.
4. Importer un GPX depuis l'app Fichiers.
5. Vérifier les deux scénarios et les graphiques.
6. Exporter le CSV et vérifier l'ouverture de la feuille de partage / Enregistrer dans Fichiers.
7. Fermer l'app, activer le mode avion, relancer : l'interface doit s'ouvrir hors connexion après un premier chargement en ligne.
8. Vérifier les seuils : >20 % vert ; 20-10 % jaune ; <10 % rouge.

Aucune formule énergétique n'a été modifiée par la V1.2.3 iPhone.


## Correctif sélecteur GPX iPhone V1.2.3
- Le champ `gpxInput` ne porte plus d’attribut `accept`.
- Le suffixe `.gpx` est contrôlé après sélection dans `app.js`.
- Objectif : empêcher iOS/Fichiers de griser les GPX Komoot/iCloud à cause d’un type MIME non reconnu.
