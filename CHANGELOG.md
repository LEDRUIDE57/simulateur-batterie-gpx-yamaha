# Changelog Yamaha

## V1.2.3 iPhone - 2026-09-13
- correctif du sélecteur de fichiers iOS : suppression de l’attribut HTML `accept` qui pouvait griser les fichiers `.gpx` dans l’app Fichiers ;
- les GPX provenant de Komoot, iCloud Drive ou d’autres emplacements peuvent désormais être sélectionnés même si iOS leur associe un type MIME non reconnu ;
- validation du suffixe `.gpx` déplacée dans `app.js` après la sélection du fichier ;
- message d’aide GPX précisé pour iPhone ;
- cache PWA passé à `sim-batterie-gpx-yamaha-v1-2-3-iphone` ;
- aucune modification du moteur Yamaha, des seuils batterie, de la segmentation GPX ou de la règle de recharge.

## V1.2.2 iPhone - 2026-09-12
- cible mobile officielle passée à iPhone / iOS ; Android n'est pas la plateforme visée pour cette version ;
- ajout des métadonnées Apple Web App et du titre d'application iOS ;
- ajout d'une icône Apple Touch dédiée 180 x 180 ;
- prise en charge des safe areas iPhone (encoche, Dynamic Island, barre d'accueil) ;
- amélioration ergonomique tactile : zones de touche >= 44 px et champs à 16 px sur mobile ;
- ajout d'une aide d'installation iPhone dans l'application ;
- détection du mode standalone iPhone ;
- export CSV adapté à iOS via la feuille de partage quand disponible ;
- cache PWA passé à `sim-batterie-gpx-yamaha-v1-2-2-iphone` ;
- aucune modification du moteur Yamaha, des seuils batterie, de la segmentation GPX ou de la règle de recharge.

## V1.2.1 - 2026-09-07
- publication publique validée sur GitHub Pages : `https://ledruide57.github.io/simulateur-batterie-gpx-yamaha/` ;
- seuils visuels batterie validés : >20 % vert, de 20 % à 10 % inclus jaune, <10 % rouge ;
- application uniforme de ces seuils aux cartes de résultats, bandeaux et graphiques ;
- légendes des deux graphiques mises à jour ;
- cache PWA passé à `sim-batterie-gpx-yamaha-v1-2-1` ;
- aucune modification de la formule de consommation Yamaha, de la segmentation GPX ni de la règle de recharge.

## V1.2.0 - 2026-09-07
- branche et identité explicitement Yamaha ;
- moteur extrait dans `simulator-core.js` ;
- parité calculatoire avec la version reçue vérifiée sur 100 parcours synthétiques ;
- correctif multi-`trkseg` ;
- détection des GPX sans altitude et avertissement si altitudes partielles ;
- paramètres historiques non actifs clairement séparés ;
- validation renforcée des réglages ;
- couleurs batterie harmonisées sur >25 %, 25-10 %, <10 % ;
- affichage des déficits batterie sous 0 Wh sur les graphiques ;
- service worker et `localStorage` spécifiques Yamaha ;
- cache PWA versionné `sim-batterie-gpx-yamaha-v1-2-0` ;
- mode d'emploi PDF, audit, tests et prompt maître ajoutés.

Aucune calibration Bosch n'a été introduite.
