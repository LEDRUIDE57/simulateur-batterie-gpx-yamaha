SIMULATEUR BATTERIE GPX YAMAHA - WEB/PWA V1.2.4 iPHONE
=======================================================

BRANCHE
- Version Yamaha uniquement.
- Totalement séparée de la branche Bosch / eBike Flow.
- Cible mobile officielle : iPhone / iOS. Android n'est pas la plateforme visée ni testée pour cette version.
- Le moteur Standard V1 reste strictement identique à la V1.2.1 validée.
- Correctif iPhone V1.2.4 : le sélecteur Fichiers n’utilise plus de filtre MIME/extension iOS, car celui-ci grisait certains GPX (notamment Komoot/iCloud). La validation .gpx est désormais faite dans l’application après sélection.

INSTALLATION SUR IPHONE
1. Ouvrir dans Safari : https://ledruide57.github.io/simulateur-batterie-gpx-yamaha/
2. Toucher le bouton Partager.
3. Choisir « Sur l'écran d'accueil ».
4. Sur iOS 26 ou plus récent, laisser « Ouvrir comme app web » activé.
5. Lancer ensuite « Yamaha GPX » depuis l'écran d'accueil.
6. Faire un premier lancement en ligne afin que les fichiers de l'application soient mis en cache pour le mode hors connexion.

ADAPTATIONS IPHONE V1.2.4
- métadonnées Apple Web App ajoutées ;
- icône Apple Touch 180 x 180 dédiée ;
- zones sûres iPhone (encoche / Dynamic Island / barre d'accueil) prises en compte ;
- contrôles tactiles d'au moins 44 px et champs numériques à 16 px pour éviter le zoom Safari ;
- message d'installation iPhone affiché dans Safari tant que l'app n'est pas lancée depuis l'écran d'accueil ;
- export CSV via la feuille de partage iOS quand elle est disponible ;
- sélecteur Fichiers iOS sans filtre `accept`, afin que les GPX ne soient plus grisés ;
- contrôle interne du suffixe `.gpx` après sélection ;
- cache service worker spécifique `sim-batterie-gpx-yamaha-v1-2-3-iphone`.

UTILISATION
- « Choisir un GPX » ouvre le sélecteur de fichiers iOS.
- Le GPX est traité localement sur l'iPhone.
- Les deux scénarios Yamaha restent obligatoires : sans recharge et avec recharge jusqu'au plein.

COULEURS BATTERIE
- > 20 % : vert.
- 20 % à 10 % inclus : jaune.
- < 10 % : rouge.

MOTEUR STANDARD YAMAHA V1
- Aucune formule énergétique n'a été modifiée dans cette mise à jour iPhone.
- Deux segments <trkseg> GPX distincts ne sont jamais reliés artificiellement.
- Recharge de référence : 200 Wh.

PUBLICATION
- Site : https://ledruide57.github.io/simulateur-batterie-gpx-yamaha/
- Dépôt : LEDRUIDE57/simulateur-batterie-gpx-yamaha
- Publier le contenu du dossier à la racine de la branche `principal`, puis GitHub Pages depuis `/(racine)`.

V1.2.4 iPhone : import GPX étendu aux traces <trkpt> et itinéraires <rtept>, avec lecture XML tolérante Safari/iOS.
