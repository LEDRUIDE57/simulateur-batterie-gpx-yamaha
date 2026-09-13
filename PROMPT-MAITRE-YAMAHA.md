# PROMPT MAÎTRE DE PASSATION - SIMULATEUR BATTERIE GPX YAMAHA

Version de référence : **Yamaha Web/PWA V1.2.4 iPhone**

---

## 1. Mission
Tu travailles sur le projet **Simulateur Batterie GPX Yamaha**. Tu dois maintenir et faire évoluer l'application Web/PWA Yamaha à partir de la dernière version validée, sans dégrader les calculs historiques et sans introduire de logique Bosch.

Le projet Bosch / eBike Flow est un projet distinct. **Ne jamais fusionner les deux branches.**

## 2. Règle absolue de séparation Yamaha / Bosch
Pour Yamaha, ne jamais reprendre automatiquement :
- les modes TOUR / eMTB / eMTB+ / Turbo Bosch ;
- les seuils de pente Bosch ;
- les paramètres de couple ou puissance Bosch ;
- les calibrations de distance Bosch/GPX ;
- les coefficients énergétiques Bosch ;
- les règles issues de Bosch Flow ;
- le cache PWA, la clé `localStorage` ou le nom d'application Bosch.

Si une demande semble mélanger Yamaha et Bosch, conserver Yamaha inchangé et demander explicitement de traiter Bosch dans sa branche séparée si nécessaire.

## 3. Fichiers de référence Yamaha V1.2.4 iPhone
- `index.html` : interface ;
- `styles.css` : présentation ;
- `simulator-core.js` : **moteur calculatoire Yamaha** ;
- `app.js` : import GPX, UI, graphiques, paramètres, CSV ;
- `manifest.webmanifest` : identité PWA Yamaha ;
- `sw.js` : cache PWA Yamaha ;
- `tests/test-core.js` : tests unitaires ;
- `tests/test-parity-v1.js` : test de parité avec l'ancien moteur ;
- `AUDIT-YAMAHA-V1.2.0.md` : audit initial et historique de nettoyage V1.2.0 ;
- `TESTS-YAMAHA-V1.2.2-iPhone.md` : protocole de validation de la version courante.

## 4. Invariants fonctionnels Yamaha
L'application produit toujours **deux scénarios séparés** :

### Scénario 1 - Sans recharge
- batterie initiale pleine ;
- consommation sur tout le parcours ;
- batterie finale ;
- graphique complet depuis km 0.

### Scénario 2 - Avec recharge
- capacité de recharge paramétrable ;
- valeur Yamaha V1 de référence : **200 Wh** ;
- l'application calcule automatiquement le km où la quantité rechargeable correspond à l'énergie déjà consommée ;
- à cet instant la batterie est remise à **100 %** ;
- le graphique montre le parcours complet, le saut à 100 %, puis la consommation jusqu'à l'arrivée ;
- si le parcours consomme moins que l'énergie rechargeable disponible, le plein est placé à l'arrivée avec seulement l'énergie nécessaire.

Ne jamais remplacer ces deux scénarios par un résultat unique.

## 5. Moteur Yamaha Standard V1 - à préserver

### Distance
Haversine, rayon terrestre : **6371 km**.

### Segmentation
Un tronçon est fermé lorsque la distance cumulée atteint ou dépasse `segmentLengthKm`.

Un nouveau `<trkseg>` GPX constitue une rupture : ne jamais relier artificiellement la fin d'un segment au début du suivant.

### Arrondis avant calcul
Pour chaque tronçon :
- distance arrondie à **2 décimales** ;
- D+ arrondi à **l'entier** ;
- arrondi **half-even / bancaire**.

Ces valeurs arrondies sont utilisées dans le calcul énergétique afin de rester fidèle au moteur Excel/VBA Yamaha V1.

### Choix du mode
- si `D+ tronçon >= turboElevationThresholdM` : **Turbo** ;
- sinon : **Tour**.

### Consommation kilométrique corrigée par la vitesse
- Turbo : `turboConsumptionWhPerKm × (15 / turboSpeedKmh)` ;
- Tour : `toursConsumptionWhPerKm × (15 / tourSpeedKmh)`.

### Montée
`climbWh = D+ × climbCoefficientWhPerM` si D+ > 0.

### Consommation finale du tronçon
`consoWh = (distance × consoKmCorrigée + climbWh) × motorCorrection`

### Batterie
La consommation exacte est cumulée sans arrondir entre les tronçons. Les valeurs affichées sont ensuite arrondies.

## 6. Valeurs Yamaha / Excel V1 de référence
Conserver ces valeurs par défaut sauf validation explicite d'une nouvelle calibration Yamaha :

- poids vélo : 24,0 kg - information de référence ;
- poids cycliste : 74,0 kg - information de référence ;
- charge : 3,0 kg - information de référence ;
- batterie : 800 Wh ;
- tension : 36 V - information de référence ;
- seuil Turbo : 18 m D+ / tronçon ;
- vitesse Tour : 18 km/h ;
- vitesse Turbo : 15 km/h ;
- vitesse moyenne : 16,8 km/h - information de référence ;
- longueur de tronçon : 0,5 km ;
- correction moteur : 1,0398 ;
- seuil d'alerte graphique : 112 Wh ;
- recharge : 200 Wh ;
- consommation Turbo : 9,0 Wh/km ;
- consommation Tour : 6,6 Wh/km ;
- coefficient montée : 0,15 Wh/m.

Important : poids, tension et vitesse moyenne sont conservés pour historique mais **n'interviennent pas dans la formule Standard V1 actuelle**.

## 7. Couleurs batterie validées
Règle Yamaha V1.2.4 iPhone à appliquer partout :
- > 20 % : vert ;
- de 20 % à 10 % inclus : jaune ;
- < 10 % : rouge.

Le `batteryCriticalWh` est une ligne d'alerte graphique indépendante ; ne pas le confondre avec les bandes de couleur en pourcentage.

## 8. Règles PWA

### Cible iPhone / iOS
La cible mobile officielle est **iPhone / iOS**. Android n'est pas la plateforme de référence de cette branche. Toute évolution PWA doit :
- conserver `display: standalone` ;
- conserver les métadonnées `apple-mobile-web-app-*` ;
- conserver une `apple-touch-icon` PNG 180 x 180 ;
- respecter les `safe-area-inset-*` ;
- maintenir des cibles tactiles d'au moins 44 px ;
- tester l'import GPX depuis l'app Fichiers sur iPhone ;
- tester l'export CSV via la feuille de partage iOS ;
- tester le lancement depuis l'écran d'accueil et le fonctionnement hors connexion après un premier lancement en ligne.

La PWA Yamaha doit rester identifiable sans ambiguïté :
- nom contenant Yamaha ;
- clé `localStorage` Yamaha ;
- cache service worker Yamaha ;
- manifeste Yamaha ;
- aucune ressource Bosch.

À chaque version publiée, changer le nom de cache (`sim-batterie-gpx-yamaha-vX-Y-Z`) afin d'éviter les fichiers obsolètes.

## 9. Méthode obligatoire pour toute évolution
Suivre cet ordre :

1. auditer la version Yamaha fournie ;
2. identifier précisément la demande ;
3. modifier d'abord l'interface ou la couche concernée sans toucher au moteur si ce n'est pas nécessaire ;
4. si le moteur doit changer, documenter la raison et créer un test spécifique ;
5. exécuter `node tests/test-core.js` ;
6. exécuter `node tests/test-parity-v1.js` ;
7. contrôler `node --check` sur tous les JS ;
8. contrôler le manifeste et les assets PWA ;
9. faire un test manuel avec un GPX Yamaha de référence ;
10. mettre à jour README, audit/changelog, tests et numéro de version ;
11. seulement ensuite produire le ZIP de livraison et, si demandé, publier sur GitHub Pages.

## 10. Règle de non-régression
Une évolution d'interface, de graphique, de PWA, de texte, de CSV ou de mise en page **ne doit pas modifier les résultats énergétiques**.

Le test de parité doit rester identique sur les parcours synthétiques. Toute différence doit être expliquée et validée comme une modification volontaire du moteur Yamaha.

## 11. Cas GPX à gérer
- GPX invalide : message clair ;
- moins de 2 `<trkpt>` : refus ;
- aucun `<ele>` : refus ;
- quelques altitudes manquantes : avertissement ;
- plusieurs `<trkseg>` : ne pas créer de liaison fictive ;
- fichier local : aucune donnée GPX envoyée à un serveur.

## 12. Livrables attendus lors d'une nouvelle version
- dossier Web/PWA complet ;
- ZIP ;
- numéro de version visible ;
- tests automatiques mis à jour ;
- note de changements ;
- si demandé : mode d'emploi PDF mis à jour ;
- si demandé : version GitHub Pages.

## 13. Ce qu'il ne faut jamais faire
- reconstruire Yamaha à partir de la branche Bosch ;
- changer les valeurs par défaut sans validation ;
- arrondir la consommation à chaque tronçon avant de la cumuler ;
- revenir à un km de recharge saisi manuellement ;
- fusionner les deux scénarios ;
- connecter deux `<trkseg>` séparés ;
- considérer les poids/tension/vitesse moyenne comme actifs sans modifier et recalibrer formellement le moteur ;
- publier une nouvelle PWA sans changer le nom de cache ;
- annoncer une validation si les tests de non-régression échouent.

## 14. Formulation de démarrage recommandée pour une future session
« Voici la dernière version validée du Simulateur Batterie GPX Yamaha. Lis d'abord `PROMPT-MAITRE-YAMAHA.md`, puis audite uniquement les fichiers concernés par ma demande. Ne mélange rien avec Bosch. Conserve les invariants de calcul Yamaha et exécute tous les tests de non-régression avant de livrer une nouvelle version. »

## 15. Version publique de référence
La version **Yamaha Web/PWA V1.2.2 iPhone** est la version publique de référence destinée à remplacer la V1.2.1 sur GitHub Pages après validation sur iPhone.

Adresse publique de référence :
`https://ledruide57.github.io/simulateur-batterie-gpx-yamaha/`

Dépôt GitHub de référence :
`LEDRUIDE57/simulateur-batterie-gpx-yamaha`

Pour toute évolution future :
- partir de cette V1.2.2 iPhone validée ou d'une version explicitement déclarée plus récente ;
- ne jamais modifier directement la version publique sans tests ;
- conserver une version livrable ZIP avant publication ;
- après validation, publier la nouvelle version sur le même dépôt GitHub Pages ;
- mettre à jour le numéro de version visible, le cache PWA, le changelog, les tests et ce prompt maître.

## Compatibilité GPX iPhone V1.2.4
Le lecteur GPX doit accepter les parcours définis par `<trkpt>` (trace) ou `<rtept>` (itinéraire), sans dépendre d’un namespace XML particulier. Ne jamais réintroduire un filtre iOS qui grise les fichiers GPX dans le sélecteur Fichiers.
