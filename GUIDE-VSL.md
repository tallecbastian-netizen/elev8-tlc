# Guide — Où héberger ta VSL (et comment la diffuser)

## La réponse courte

**Héberge ta VSL sur YouTube en « Non répertorié », PAS dans tes fichiers GitHub.**
Et dans l'e-mail, ne mets pas la vidéo directement : mets une **image-miniature cliquable**
qui renvoie vers une **page de visionnage sur ton site** (`vsl.html`), où la vidéo est
intégrée juste au-dessus du bouton « Faire ma candidature ».

---

## Pourquoi PAS dans GitHub (fichiers vidéo dans le dépôt)

| Problème | Détail |
|---|---|
| **Limite de taille** | GitHub avertit dès **50 Mo** et bloque à **100 Mo** par fichier. Une VSL de 10–20 min dépasse vite. |
| **Pas de streaming** | GitHub Pages sert un fichier brut : pas de qualité adaptative → **ça rame** sur mobile / connexion lente. |
| **Bande passante plafonnée** | GitHub Pages = ~**100 Go/mois** « soft ». Quelques centaines de vues vidéo et tu es hors-limite → site coupé. |
| **Aucune statistique** | Tu ne sais pas combien de temps les gens regardent. Pour une VSL, **le taux de rétention est LA donnée clé** pour l'optimiser. |
| **Vidéo téléchargeable** | Dépôt public = ta présentation est récupérable par n'importe qui. |

➡️ Bref : GitHub n'est pas un hébergeur vidéo. Ne fais pas ça.

---

## Pourquoi YouTube « Non répertorié »

- **Gratuit** et **CDN mondial** → ça charge vite partout, qualité adaptative automatique.
- **Statistiques de rétention** → tu vois où les gens décrochent et tu améliores ta VSL.
- **« Non répertorié »** = la vidéo **n'apparaît pas** dans les recherches ni sur ta chaîne.
  Seules les personnes qui ont le lien peuvent la voir. Parfait pour un tunnel.
- S'intègre en 2 clics dans une page (je l'ai déjà préparé dans `vsl.html`).

**Le seul bémol** : YouTube peut afficher des **suggestions/branding** à la fin, et
parfois des pubs. Deux parades :
1. On l'intègre dans **ta** page `vsl.html` (pas en lien YouTube brut) → l'attention reste chez toi.
2. Si tu veux le **haut de gamme total** (zéro pub, zéro suggestion, lecture protégée par domaine) →
   passe sur **Vimeo** (payant, ~12–20 €/mois). À envisager plus tard, pas indispensable pour démarrer.

**Verdict : YouTube non répertorié maintenant. Vimeo si tu veux monter en gamme ensuite.**

---

## Le parcours complet (ce qu'on met en place)

```
Inscription sur le site
        │  (Brevo enregistre le contact)
        ▼
E-mail automatique Brevo
        │  → image-miniature cliquable
        ▼
Page VSL sur ton site  (vsl.html)
        │  → vidéo YouTube intégrée + bouton
        ▼
Candidature  (candidature.html)
        │  → 12 questions + écran final
        ▼
Réservation d'appel  (Calendly)
```

---

## Étapes concrètes (15 min, une seule fois)

1. **Mets ta VSL sur YouTube** : Créer → Mettre en ligne → visibilité **« Non répertorié »**.
2. **Récupère l'identifiant** de la vidéo : dans l'URL `https://www.youtube.com/watch?v=XXXXXXXXXXX`,
   c'est la partie `XXXXXXXXXXX`.
3. **Donne-moi cet identifiant** (ou colle l'URL) → je le place dans `vsl.html`. *(En attendant,
   un emplacement « VIDEO_ID » est déjà prêt dans le fichier.)*
4. **Dans l'e-mail automatique Brevo** : on insère une **image de miniature** (capture de ta vidéo
   avec un gros triangle « ▶ ») qui pointe vers la page `vsl.html`. (On ne met JAMAIS la vidéo
   directement dans l'e-mail : tous les logiciels de messagerie la bloquent.)
5. C'est tout. La page `vsl.html` enchaîne automatiquement vers la candidature.

---

## Astuce miniature d'e-mail

Une miniature qui fait cliquer = **une image** (ta tête ou un visuel fort) + **un gros bouton play**
+ une **promesse** en surimpression (ex. « Comment passer de 0 à autonome en 90 jours »).
Dis-le-moi quand tu veux, je te génère cette miniature.
