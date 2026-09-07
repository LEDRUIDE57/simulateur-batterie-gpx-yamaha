SIMULATEUR BATTERIE GPX YAMAHA — WEB/PWA V1.2.1
================================================

BRANCHE
- Version Yamaha uniquement.
- Totalement séparée de la branche Bosch / eBike Flow.
- Le moteur Standard V1 reste fondé sur les paramètres Yamaha/Excel de référence.

TEST IMMÉDIAT SUR PC
1. Décompresser le dossier.
2. Double-cliquer sur index.html.
3. Cliquer sur « Choisir un GPX ».
4. Le fichier est lu localement par le navigateur.

DEUX SCÉNARIOS OBLIGATOIRES
1. Sans recharge : résultat final + graphique complet.
2. Avec recharge : plein à 100 % placé automatiquement au point où l'énergie rechargeable disponible a été consommée.
   Valeur de référence : 200 Wh.

MOTEUR STANDARD YAMAHA V1
- Haversine : rayon 6371 km.
- Découpage : fermeture d'un tronçon lorsque la distance cumulée atteint ou dépasse le seuil.
- Avant calcul : distance arrondie à 2 décimales, D+ à l'entier (arrondi bancaire / half-even).
- Mode Turbo si D+ du tronçon >= seuil Turbo ; sinon Tour.
- Consommation = [distance × consommation corrigée par la vitesse + D+ × coefficient montée] × correction moteur.
- Les champs poids / tension / vitesse moyenne sont conservés comme références historiques ; ils ne participent pas à la formule Standard V1.
- Deux segments <trkseg> GPX distincts ne sont jamais reliés artificiellement.

COULEURS BATTERIE
- > 20 % : vert.
- 20 % à 10 % inclus : jaune.
- < 10 % : rouge.
- Le seuil d'alerte en Wh est une ligne graphique indépendante et paramétrable.

PWA / GITHUB PAGES
- Pour l'installation PWA, servir le dossier en HTTPS (par exemple GitHub Pages).
- Le service worker est versionné spécifiquement Yamaha : sim-batterie-gpx-yamaha-v1-2-1.
- Le fichier .nojekyll est fourni pour un hébergement GitHub Pages simple.

FICHIERS DE CONTRÔLE
- AUDIT-YAMAHA-V1.2.0.md : audit initial de la version reçue et corrections V1.2.0.
- TESTS-YAMAHA-V1.2.1.md : protocole et résultats des tests.
- tests/test-core.js : tests automatiques Node du moteur.
- PROMPT-MAITRE-YAMAHA.md : prompt de passation pour les futures évolutions.
