# Cabano

Site de commande du snack Cabano, à Casablanca El Hank et à Bouskoura Andalous Crystal. Le client choisit un magasin, compose son assiette, indique où livrer, et paie en espèces à la livraison. Le gestionnaire suit les deux magasins depuis un seul accès.

Interface en français. Prix en dirhams.

## Démarrer

```bash
npm install
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000). Le site attend `localhost`. `127.0.0.1` ne convient pas.

Créer `.env.local` à la racine, puis relancer `npm run dev` :

```
ADMIN_PASSWORD=choisir-un-mot-de-passe
ADMIN_SESSION_SECRET=une-longue-chaine-aleatoire
```

Ce fichier n’est pas versionné. Cinq mots de passe faux bloquent la connexion de ce navigateur pendant 15 minutes.

## Parcours client

1. Choisir El Hank ou Bouskoura.
2. Parcourir la carte, ou chercher un plat. Les pastilles de catégories défilent sur le téléphone.
3. Ajouter un plat. S’il a une composition, cocher **Composition** pour retirer un ingrédient ou en ajouter. Retirer un ingrédient inclus ne change pas le prix. Chaque unité en plus ajoute le prix extra fixé sur ce plat.
4. Dans le panier, écrire un commentaire par plat (épicé, sans oignon, étage). Le commentaire ne change pas le prix.
5. À la caisse : prénom, nom, téléphone 06 ou 07 sur 10 chiffres, adresse écrite. Un point sur la carte est possible.
6. La confirmation donne un numéro `CAB-AAAAMMJJ-0001` et un lien secret. Depuis cette page, **Commander à nouveau** remet les mêmes plats dans le panier.

Le panier ne mélange pas les deux magasins. Une ligne monte jusqu’à 500 pièces. Le serveur recalcule chaque prix : un montant envoyé par le navigateur est ignoré.

Hors des horaires, le magasin refuse la commande. Ouvert de 12h à 23h, heure de Casablanca, fermé le vendredi.

## Administration

`/admin/login` demande le mot de passe. Ensuite :

| Adresse | Rôle |
| --- | --- |
| `/admin` | Commandes, filtres, chiffres, graphiques |
| `/admin/orders/[id]` | Détail, statut, appel, WhatsApp |
| `/admin/carte` | Menus, plats, photos, composition, stock |

**Se déconnecter** ferme la session.

### Commandes

Filtres : les deux magasins ou un seul, un mois, un jour, un statut. La liste se rafraîchit toutes les 10 secondes tant que la page est ouverte. Une commande arrivée après l’ouverture de la page porte la mention **Nouvelle** et un contour rouge. Il n’y a pas de son ni d’alerte si la page est fermée.

Statuts, dans l’ordre : En attente, Acceptée, En préparation, En livraison, Livrée. Annuler reste possible tant que la commande n’est pas livrée. **Appeler** ouvre le téléphone du client. **WhatsApp** prépare un message avec le numéro de commande et l’adresse.

Le chiffre et le ticket moyen ignorent les commandes annulées, sauf si le filtre de statut est « Annulée ».

### Carte

Chaque magasin a sa propre carte. **Modifier** et **Nouvel article** ouvrent une fenêtre : nom, description, prix, sous-menu, photo, composition.

La photo acceptée est un JPG, PNG ou WEBP de 2 Mo au plus.

**Composition**, une fois cochée, affiche les composants. **Inclus** : le client peut le retirer sans changer le prix. **Extra DH** : le prix de chaque unité au-delà de ce qui est inclus, jusqu’à 5, et jusqu’à 12 composants par plat.

**En stock** laisse le plat sur la carte. **Out of stock** le retire. Un seul des deux libellés est visible. Un appui inverse l’état.

Sandwichs, tacos et m9ila démarrent avec Sauce tomate (3 DH), Œuf (3 DH), Fromage (5 DH) et Olive (2 DH). Ces prix se changent dans la fenêtre du plat. Les autres plats n’ont une composition qu’après l’avoir ajoutée.

## Magasins

| Magasin | Téléphone | Livraison |
| --- | --- | --- |
| Casablanca – El Hank | 06 43 99 25 72 | 25 DH |
| Bouskoura – Andalous Crystal | 07 80 60 80 81 | 20 DH |

Le point Casablanca est celui du Google « Snack cabano », Corniche El Hank. Le point Bouskoura est le quartier Andalous / Crystal Offices.

## Pages

| Adresse | Rôle |
| --- | --- |
| `/` | Choix du magasin |
| `/store/casablanca` | Carte El Hank |
| `/store/bouskoura` | Carte Bouskoura |
| `/cart` | Panier |
| `/checkout` | Livraison et envoi |
| `/order/[jeton]` | Confirmation. Le jeton est secret |
| `/admin/login` | Connexion |
| `/admin` | Commandes |
| `/admin/carte` | Carte |

Le lien de confirmation ne s’ouvre pas avec le seul numéro `CAB-…`. Il faut le jeton.

## Base de données

SQLite, fichier `data/cabano.db`. Il n’est pas versionné. Il contient les noms, téléphones et adresses des clients. Le garder sur la machine qui sert le site, avec une copie de secours, et ne pas le publier.

| Table | Contenu |
| --- | --- |
| `orders` | Une commande. Plats dans `items_json`, client dans `customer_json`. `local_date` est le jour à Casablanca. |
| `menus`, `submenus`, `articles` | Carte de chaque magasin. `articles.available` vaut 1 pour En stock. |
| `composants` | Ingrédients d’un plat, inclus ou non, et prix extra. |
| `catalog_meta` | Indique que la carte de départ a déjà été copiée. |
| `login_attempts` | Essais de connexion et limites de commandes. |

`data/menu.ts` n’est copié qu’une fois, à la première ouverture d’une base vide. Ensuite, la carte vit dans SQLite et se modifie dans `/admin/carte`.

## Réseaux

- Instagram : https://www.instagram.com/cabano_el/
- Facebook : https://www.facebook.com/profile.php?id=100076049385133
- TikTok : https://www.tiktok.com/@snack.cabano
- WhatsApp : https://wa.me/212643992572

## Fichiers utiles

| Fichier | Rôle |
| --- | --- |
| `data/stores.ts` | Magasins, téléphones, frais, coordonnées |
| `data/social.ts` | Liens des réseaux |
| `lib/hours.ts` | Horaires |
| `lib/plate.ts` | Prix d’une assiette, avec ou sans extra |
| `.env.local` | Mot de passe et secret de session |
| `data/cabano.db` | Commandes et carte |
| `public/uploads/` | Photos envoyées depuis l’admin |

## Commandes

```bash
npm run dev      # site local
npm run lint     # vérification
npm run build    # version de production
npm run start    # sert la version construite
```
