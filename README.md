# Cabano

Site de commande pour le snack Cabano, à Casablanca El Hank et à Bouskoura Andalous Crystal. Le client choisit un magasin, compose sa commande, place un point sur la carte, et paie à la livraison. Le gestionnaire suit les commandes des deux magasins après un seul mot de passe.

Interface en français. Prix en dirhams (DH). Photos des plats encore noires : les prix du menu sont des prix de travail, à remplacer dans un seul fichier.

## Démarrer

```bash
npm install
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000). Utiliser `localhost`, pas `127.0.0.1`.

Le mot de passe gestionnaire et le secret de session sont dans `.env.local` :

```
ADMIN_PASSWORD=...
ADMIN_SESSION_SECRET=...
```

Ce fichier n’est pas versionné. Après toute modification, relancer `npm run dev`. Cinq mots de passe faux bloquent la connexion pendant 15 minutes. Ce blocage est enregistré dans la base.

## Pages

| Adresse | Rôle |
| --- | --- |
| `/` | Choix du magasin |
| `/store/casablanca` | Menu El Hank |
| `/store/bouskoura` | Menu Bouskoura |
| `/cart` | Panier |
| `/checkout` | Livraison et envoi |
| `/order/[jeton]` | Confirmation. Le jeton est secret |
| `/admin/login` | Connexion gestionnaire |
| `/admin` | Tableau des commandes |
| `/admin/orders/[id]` | Détail d’une commande |

Le numéro affiché au client ressemble à `CAB-20261022-0001`. L’adresse de confirmation utilise un jeton impossible à deviner. Un ancien lien avec seulement le numéro ne s’ouvre plus.

## Magasins

Les deux magasins sont ouverts de 12h à 23h, heure de Casablanca, et fermés toute la journée du vendredi. En dehors de ces horaires, le site refuse la commande.

| Magasin | Téléphone | Livraison |
| --- | --- | --- |
| Casablanca – El Hank | 06 43 99 25 72 | 25 DH |
| Bouskoura – Andalous Crystal | 07 80 60 80 81 | 20 DH |

Le point Casablanca est celui du Google « Snack cabano » (Corniche El Hank). Le point Bouskoura est le quartier Andalous / Crystal Offices, pas une porte relevée au mètre près.

Paiement : espèces à la livraison uniquement. L’adresse écrite est obligatoire. Le client peut poser un point sur la carte (OpenStreetMap) ou utiliser sa position. Le téléphone accepté commence par 06 ou 07 et contient 10 chiffres.

## Menu

La carte se gère dans `/admin/carte`, magasin par magasin. On y ajoute, renomme et supprime des menus, des sous-menus et des articles : nom, description, prix et photo. Une photo acceptée est un JPG, PNG ou WEBP de 2 Mo au plus.

Le serveur recalcule chaque commande à partir de cette carte : un prix envoyé par le navigateur est ignoré. `data/menu.ts` sert seulement de première carte, copiée une fois dans la base.

Catégories : Poulpe, Pélou, Pizzas, Sandwichs, M9ila, Boissons. Les deux magasins partagent le même menu.

Prix de travail actuels : poulpe grillé 90, poulpe en sauce 80, pélou crevette 70, pélou mixte 85, pizza mixte 60, pizza fruits de mer 75, pizza moules 65, sandwich poulpe 45, sandwich mixte 40, tacos fruits de mer 50, m9ila slaouia 55, m9ila maison 50, Coca-Cola 12, eau 8, jus d’orange 15.

Une ligne peut monter jusqu’à 500 pièces. Le bouton + s’arrête à ce plafond, et l’API refuse au-delà. Le panier ne mélange pas les deux magasins. Une quantité à 0 retire la ligne.

## Gestion

`/admin` demande le mot de passe, puis le gestionnaire filtre par magasin (Les deux, Casablanca, Bouskoura), par mois, par jour et par statut.

Le tableau affiche le nombre de commandes, le chiffre, les commandes en attente, le ticket moyen, les graphiques du mois, les plats les plus commandés, et la liste. La page se rafraîchit toute seule. Une commande nouvelle encore en attente est marquée « Nouvelle ».

Statuts, dans l’ordre : En attente, Acceptée, En préparation, En livraison, Livrée. Annuler reste possible tant que la commande n’est pas livrée. Le téléphone du client s’ouvre pour appeler. Le point de livraison s’affiche sur la carte quand le client en a posé un.

Le chiffre et le ticket moyen ignorent les commandes annulées, sauf si le filtre de statut est « Annulée ».

## Base de données

Les commandes sont dans le fichier SQLite `data/cabano.db`. Ce fichier n’est pas versionné. Pour le lire : DB Browser for SQLite, puis ouvrir ce fichier.

Tables :

- `orders` — une commande par ligne. Les plats sont dans `items_json`, le client dans `customer_json`. `local_date` est le jour à Casablanca, utilisé par les filtres.
- `login_attempts` — essais de mot de passe.

Le site doit tourner comme un seul programme sur une machine, avec une copie de secours de `data/cabano.db`. Le fichier ne doit pas être exposé sur internet : il contient les noms, téléphones et adresses.

## Réseaux

Dans le pied de page, hors de l’administration :

- Instagram : https://www.instagram.com/cabano_el/
- Facebook : https://www.facebook.com/profile.php?id=100076049385133
- TikTok : https://www.tiktok.com/@snack.cabano
- WhatsApp : https://wa.me/212643992572 (El Hank)

## Fichiers utiles

- `data/menu.ts` — carte de départ, copiée une fois
- `/admin/carte` — modifier menus, sous-menus, noms, prix et photos
- `data/stores.ts` — magasins, téléphones, frais, coordonnées
- `data/social.ts` — liens des réseaux
- `lib/hours.ts` — horaires d’ouverture
- `.env.local` — mot de passe gestionnaire
- `data/cabano.db` — commandes

## Commandes

```bash
npm run dev    # site local
npm run lint   # vérification
npm run build  # version de production
npm run start  # sert la version construite
```
