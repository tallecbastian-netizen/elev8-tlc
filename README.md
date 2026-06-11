# Bastian Tallec — Landing page

Site vitrine statique (une page) pour présenter les activités de **Bastian Tallec** :
investissement, création de contenu, accompagnement personnalisé et consulting business.

- **Stack** : HTML + CSS + JavaScript pur. Aucun framework, aucune étape de build.
- **Hébergement** : GitHub Pages (gratuit).
- **Performance** : images en `.webp`/`.jpg` optimisées, vidéos `.mp4` légères, JS minimal.
- **SEO** : balises meta, Open Graph, Twitter Card, données structurées JSON-LD, sitemap, robots.txt.
- **Accessible** : navigation clavier, contrastes, `prefers-reduced-motion`, libellés ARIA.

---

## 1. Structure du projet

```
.
├── index.html            Page unique (toutes les sections)
├── css/
│   └── styles.css        Styles (design sombre premium)
├── js/
│   └── main.js           Menu mobile, animations, année dynamique
├── assets/
│   ├── img/              Images optimisées (.jpg + .webp) + favicons + image de partage
│   ├── video/            Vidéos web (.mp4) + posters
│   ├── source/           Originaux (sauvegarde, non affichés)
│   └── README.md         Détail des médias
├── robots.txt            Indexation moteurs de recherche
├── sitemap.xml           Plan du site
├── .nojekyll             Désactive Jekyll sur GitHub Pages
└── .gitignore
```

Les sections de `index.html` : Héro · Parcours · Investissement · Contenu · Accompagnement · Consulting · Bandeau citation · Contact · Pied de page.

---

## 2. À personnaliser AVANT la mise en ligne

Le contenu textuel est un **premier brouillon** : relis-le et ajuste-le. Les éléments
techniques à remplacer sont signalés par des commentaires `<!-- REMPLACER ... -->` dans le code.

| À remplacer                | Où                                               |
|----------------------------|--------------------------------------------------|
| **Lien Instagram**         | `index.html` — 3 endroits (section Contenu, Contact, Footer) + JSON-LD `sameAs` |
| **Adresse e-mail**         | `index.html` — lien `mailto:contact@bastiantallec.fr` (section Contact) |
| **Formulaire de contact**  | `index.html` — attribut `action` du `<form>` (voir §5) |
| **URL du site**            | `index.html` (`canonical`, `og:url`, `og:image`), `robots.txt`, `sitemap.xml` — uniquement si le nom d'utilisateur GitHub n'est pas `bastiantallec` |

> Astuce : ouvre `index.html` et fais une recherche sur `REMPLACER`, `bastiantallec`,
> `formspree` et `contact@` pour tout retrouver rapidement.

---

## 3. Tester en local

Double-clique simplement sur `index.html` pour l'ouvrir dans ton navigateur.

Pour un rendu plus fidèle (vidéos, chemins), lance un petit serveur local :

```bash
# Python (déjà installé sur la plupart des machines)
python -m http.server 8000
# puis ouvre http://localhost:8000
```

---

## 4. Mettre en ligne sur GitHub Pages — pas à pas

> ⚠️ **Important sur le nom d'utilisateur.** Pour obtenir l'adresse exacte
> `tallecbastian-netizen.github.io`, **le compte GitHub doit s'appeler `bastiantallec`**
> (en minuscules, sans espace). « Bastian TALLEC » n'est pas un nom d'utilisateur valide.
> Si ton compte porte un autre nom (ex. `berat`), l'adresse sera différente
> (voir les deux options ci-dessous).

### Option A — Site personnel : `TONNOM.github.io` (adresse la plus propre)

1. Crée (ou connecte-toi à) ton compte sur <https://github.com>.
2. **New repository** → nomme-le **exactement** `TONNOM.github.io`
   (ex. `tallecbastian-netizen.github.io`). Visibilité : **Public**.
3. Envoie le contenu de ce dossier à la racine du dépôt (voir §4.1 ou §4.2).
4. **Settings → Pages** : source = branche `main`, dossier `/ (root)` → **Save**.
5. Patiente 1–2 min : le site est en ligne sur `https://TONNOM.github.io/`.

### Option B — Site de projet : `TONNOM.github.io/landing`

1. Crée un dépôt avec le nom de ton choix (ex. `landing`), **Public**.
2. Envoie le contenu du dossier.
3. **Settings → Pages** : branche `main`, dossier `/ (root)` → **Save**.
4. Le site sera sur `https://TONNOM.github.io/landing/`.
   ➜ Dans ce cas, mets à jour les URL (canonical, og:url, og:image, sitemap) avec ce chemin.

### 4.1 Envoyer les fichiers — sans ligne de commande (le plus simple)

- **GitHub Desktop** : « Add Local Repository » → choisis ce dossier → *Publish repository*.
- **ou** sur le site GitHub : bouton *Add file → Upload files* → glisse-dépose tous les fichiers.

### 4.2 Envoyer les fichiers — en ligne de commande (Git)

```bash
cd "chemin/vers/Page Web Bastian"
git init
git add .
git commit -m "Landing page Bastian Tallec"
git branch -M main
git remote add origin https://github.com/TONNOM/TONNOM.github.io.git
git push -u origin main
```

---

## 5. Rendre le formulaire fonctionnel

GitHub Pages est **statique** : il ne peut pas traiter un formulaire côté serveur.
Pour recevoir les messages par e-mail, utilise un service gratuit (2 minutes) :

1. Crée un compte sur **[Formspree](https://formspree.io)** (ou Getform / Web3Forms).
2. Récupère ton endpoint, ex. `https://formspree.io/f/abcdwxyz`.
3. Dans `index.html`, remplace `action="https://formspree.io/f/VOTRE_ID"` par ton endpoint.

En attendant, les visiteurs peuvent te joindre via le bouton **e-mail** et **Instagram**.

---

## 6. Domaine personnalisé (optionnel)

Pour un nom de domaine type `bastiantallec.com` : achète-le, puis dans
**Settings → Pages → Custom domain**, saisis-le (GitHub crée un fichier `CNAME`)
et configure les enregistrements DNS chez ton registrar. Non requis pour démarrer.

---

## 7. Mettre à jour le site

Modifie les fichiers, puis ré-envoie-les (GitHub Desktop : *Commit* + *Push* ;
ou `git add . && git commit -m "maj" && git push`). GitHub Pages se met à jour seul en ~1 min.
