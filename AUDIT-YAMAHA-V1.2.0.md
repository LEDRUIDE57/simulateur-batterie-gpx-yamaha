# Audit Yamaha - passage de la V1.1.4 reçue à la V1.2.0 propre

## 1. Périmètre
Cet audit concerne uniquement la branche **Simulateur Batterie GPX Yamaha**. La branche Bosch / eBike Flow est hors périmètre et ne doit partager ni moteur, ni paramètres, ni cache PWA, ni stockage navigateur avec Yamaha.

## 2. État de la version reçue
Le ZIP reçu contenait une application Web autonome : `index.html`, `app.js`, `styles.css`, `manifest.webmanifest`, `sw.js` et les icônes PWA.

Le README commençait par « WEB V1.1.2 », puis contenait des notes de correction V1.1.3 et V1.1.4. La version fonctionnelle reçue est donc considérée comme **Yamaha V1.1.4**.

## 3. Moteur Yamaha validé conservé
Les règles calculatoires suivantes ont été conservées :

- Haversine avec rayon terrestre de 6371 km ;
- fermeture d'un tronçon lorsque la distance cumulée atteint ou dépasse la longueur réglée ;
- distance du tronçon arrondie à 2 décimales avant calcul ;
- D+ du tronçon arrondi à l'entier avant calcul ;
- arrondi half-even / bancaire, comme dans la logique Excel/VBA de référence ;
- Turbo si `D+ tronçon >= seuil Turbo`, sinon Tour ;
- correction de la consommation par la vitesse avec référence 15 km/h ;
- terme de montée `D+ × coefficient montée` ;
- correction moteur multiplicative ;
- capacité batterie et recharge paramétrables ;
- règle de recharge : placer le plein au point où l'énergie rechargeable disponible a été consommée ;
- si le parcours consomme moins que la recharge disponible, placer le plein à l'arrivée avec seulement l'énergie nécessaire ;
- deux scénarios séparés obligatoires : sans recharge / avec recharge.

## 4. Problèmes trouvés dans la version reçue

### A. PWA : version de cache incohérente
Le README mentionnait V1.1.4 mais le service worker utilisait encore le cache `sim-batterie-gpx-v1-1-3`. En publication HTTPS, cela pouvait entretenir des fichiers obsolètes selon le cycle de mise à jour du service worker.

**Correction V1.2.0 :** cache distinct et explicite `sim-batterie-gpx-yamaha-v1-2-0`, nettoyage des anciens caches et activation immédiate.

### B. Risque de mélange Yamaha / Bosch
Le nom de l'application, le stockage local et le cache PWA n'identifiaient pas explicitement Yamaha.

**Correction V1.2.0 :** nom de l'application, manifeste, footer, cache et nouvelle clé `localStorage` explicitement Yamaha. Une migration de lecture de l'ancienne clé est conservée afin de ne pas perdre les réglages Yamaha existants.

### C. Paramètres affichés mais non utilisés dans le calcul
Les champs poids vélo, poids cycliste, charge, tension batterie et vitesse moyenne étaient présentés comme des paramètres de calcul alors que le moteur Standard V1 ne les utilise pas.

**Correction V1.2.0 :** ils restent conservés pour continuité historique, mais sont maintenant regroupés dans « Informations de référence - n'interviennent pas dans la formule Standard V1 ».

### D. Couleurs batterie incohérentes
Le graphique utilisait les seuils V1.1.4 (>25 %, 25-10 %, <10 %) mais les valeurs et le tableau utilisaient encore des seuils absolus hérités (110 Wh / 10 Wh).

**Correction V1.2.0 :** toutes les colorations de niveau batterie utilisent désormais la règle V1.1.4 en pourcentage. Le seuil d'alerte paramétrable en Wh reste une ligne graphique indépendante.

### E. GPX contenant plusieurs `<trkseg>`
La version reçue récupérait tous les `<trkpt>` à la suite et pouvait relier artificiellement la fin d'un segment GPX au début du suivant, créant distance et D+ fictifs.

**Correction V1.2.0 :** les ruptures `<trkseg>` sont respectées et aucune liaison géométrique artificielle n'est créée.

### F. GPX sans altitude
Un GPX entièrement dépourvu de `<ele>` pouvait être calculé avec D+=0 sans avertissement.

**Correction V1.2.0 :** rejet explicite si aucune altitude n'est disponible ; avertissement si seulement certains points sont sans altitude.

### G. Validation des paramètres insuffisante
Des consommations ou coefficients négatifs pouvaient être enregistrés.

**Correction V1.2.0 :** validation des valeurs actives et bornes HTML cohérentes.

### H. Courbe batterie négative
Si la batterie théorique devenait négative, la courbe pouvait sortir de la zone de tracé.

**Correction V1.2.0 :** l'axe Wh s'étend sous 0 lorsque nécessaire afin de rendre visible le déficit théorique jusqu'à l'arrivée.

## 5. Refactorisation sans changement de formule
Le moteur de calcul a été extrait de l'interface dans `simulator-core.js`. `app.js` se limite à l'import GPX, l'interface, les graphiques, les paramètres, l'export CSV et la PWA.

Avantages :
- tests automatiques possibles ;
- futures évolutions plus sûres ;
- séparation nette entre calcul Yamaha et présentation ;
- comparaison de non-régression facile.

## 6. Vérification de non-régression
- 10 tests unitaires ciblés : réussis ;
- comparaison du nouveau moteur avec l'ancien moteur reconstitué sur 100 parcours synthétiques : parité complète des calculs ;
- syntaxe JavaScript : valide ;
- manifeste JSON : valide ;
- références HTML/JS et assets du service worker : valides.

Le test d'interface automatisé avec Chromium n'a pas pu être exécuté dans l'environnement de travail car sa politique bloque les pages `localhost` et `file://`. Ce blocage vient de l'environnement de test, pas du code. Le dossier reste directement testable sur un PC par double-clic sur `index.html` ; la PWA elle-même nécessite ensuite un hébergement HTTPS.

## 7. Décision de version
La version nettoyée est nommée **Yamaha Web/PWA V1.2.0** car elle introduit une séparation moteur/interface et plusieurs corrections structurelles, tout en gardant la formule Yamaha V1.

## 8. Règle pour la suite
Toute évolution future doit commencer par les tests de non-régression et ne doit jamais importer de paramètres, seuils, logique d'assistance ou calibration Bosch dans cette branche Yamaha.
