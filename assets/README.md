# Dossier `assets`

Organisation des médias du site.

```
assets/
├── img/        Images optimisées servies par le site (.jpg + .webp)
├── video/      Vidéos web (.mp4 H.264) + posters (.jpg)
└── source/     Fichiers ORIGINAUX (sauvegarde — non utilisés par le site)
```

## Images utilisées par la page

| Fichier (`assets/img/`)     | Emplacement sur le site        | Original                       |
|-----------------------------|--------------------------------|--------------------------------|
| `hero-portrait.jpg/.webp`   | Héro (photo principale)        | `BG .jpg`                      |
| `setup-trading.jpg/.webp`   | Section Investissement         | `New set up .jpg`              |
| `formation-scene.jpg/.webp` | Section Accompagnement         | `Formation speak.jpg`          |
| `stage-profile.jpg/.webp`   | Section Consulting             | `Remerciement.jpg`             |
| `vue-mer.jpg/.webp`         | Bandeau citation (fond)        | `Vu sur mer.jpg`               |
| `og-image.jpg`              | Aperçu de partage (réseaux)    | généré automatiquement         |
| `favicon.svg` / `favicon-32.png` / `apple-touch-icon.png` | Icône d'onglet | généré automatiquement |

## Vidéos

| Fichier (`assets/video/`)   | Emplacement sur le site        | Original                       |
|-----------------------------|--------------------------------|--------------------------------|
| `parcours.mp4`              | Section Parcours (clic-lecture)| `D'ou je suis partie.MOV`      |
| `speaking-scene.mp4`        | Section Contenu (boucle muette)| `Speaking scene.mp4`           |

## Remplacer un média

1. Place ta nouvelle image/vidéo dans `assets/img/` ou `assets/video/`.
2. Garde **le même nom de fichier** pour ne rien changer dans le code, **ou**
   mets à jour le chemin dans `index.html` (et `css/styles.css` pour le bandeau `vue-mer`).
3. Pour de meilleures performances : exporte les images en largeur ≤ 1600 px,
   en `.jpg` (qualité ~82) **et** `.webp`, et les vidéos en `.mp4` (H.264).

> Le dossier `assets/source/` ne sert qu'à conserver les originaux.
> Tu peux le supprimer du dépôt si tu veux l'alléger (les originaux ne sont pas affichés sur le site).
