# Guide — WhatsApp (dossiers membres / prospects) & téléchargement des vidéos

---

## Partie 1 — Organiser WhatsApp en « dossiers »

WhatsApp classique n'a pas de dossiers. Mais tu as **deux vrais outils** pour exactement ce que
tu veux (séparer **Membres** et **Prospects**, et communiquer en masse) :

### A. WhatsApp Business + Étiquettes (= tes dossiers)
1. Installe **WhatsApp Business** (gratuit ; tu peux garder ton même numéro).
2. Menu → **Outils professionnels → Étiquettes**.
3. Crée tes étiquettes : **Prospect**, **Membre**, et une par promo (ex. `Membre · Promo Janv 26`).
4. Sur chaque conversation : appui long → **Étiqueter**. Tu filtres ensuite par étiquette = ton dossier.

### B. Listes de diffusion (envoi groupé, en privé)
Pour envoyer un lien Zoom ou un document à **tous les membres d'une promo d'un coup** (chacun le
reçoit en message privé, pas un groupe) :
1. WhatsApp → **Nouvelle diffusion**.
2. Crée **« Membres · Promo X »** et **« Prospects »**.
3. Tu écris une fois → tout le monde reçoit.
> ⚠️ Limites : max **256 contacts** par liste, et le destinataire doit **avoir ton numéro enregistré**
> pour recevoir une diffusion. Au-delà → WhatsApp Business **API** (ou Brevo fait aussi du WhatsApp).

### C. Comment le tableau de suivi alimente WhatsApp
Dans `suivi-membres.html` :
1. Filtre **Type = Prospect** (ou **Membre**, ou une **promo**).
2. Clique **« Export n° (filtre) »** → tu télécharges la liste des numéros (déjà au bon format).
3. Crée ta **liste de diffusion** WhatsApp avec ces numéros.
4. Le bouton **« WhatsApp + Zoom »** de chaque fiche ouvre la discussion avec ton message **déjà rempli**
   (lien Zoom inclus) et marque la personne **« contacté aujourd'hui »** (pour le suivi des 28 jours).

### Workflow conseillé
```
Inscription site → Brevo (tous les inscrits)
   → Export CSV Brevo → "Importer Brevo (CSV)" dans le tableau (arrivent en PROSPECTS)
   → tu les tags "Prospect" sur WhatsApp
   → quand l'un devient client : bouton "→ Membre" + étiquette "Membre Promo X" + ajout à la liste de diffusion
   → suivi des 28 jours via la réactivité (boutons "Contacté ✓" / WhatsApp)
```

---

## Partie 2 — Télécharger tes vidéos (depuis DCEO/Webflow ou ailleurs)

> **Le plus malin : ne re-télécharge rien pour le remettre.** Réupload tes fichiers d'origine
> directement en **YouTube « non répertorié »** et donne-moi les IDs. Plus propre, plus fiable.

Si tu dois quand même récupérer les fichiers :

1. **Déjà sur ton YouTube** → YouTube Studio → **Contenu** → survole la vidéo → **⋮** → **Télécharger**.
2. **Déjà sur ton Vimeo** → ouvre la vidéo → **Paramètres / Téléchargements** → télécharge le MP4.
3. **Fichier `.mp4` hébergé par Webflow** :
   - Ouvre la page dans **Chrome** → touche **F12** (outils développeur).
   - Onglet **Network / Réseau** → filtre **Media** → **recharge** la page.
   - Repère la ligne `.mp4` → clic droit → **Open in new tab** → dans le nouvel onglet, clic droit → **Enregistrer la vidéo sous…**.
4. **Dernier recours** : enregistrement d'écran (OBS gratuit, ou enregistrement d'écran natif).

Ensuite : **upload sur YouTube en « non répertorié »**, récupère l'ID (`...watch?v=ID`), et
donne-le-moi → je l'intègre dans l'espace membre (9 emplacements déjà prêts, 3 par section).

> Rappel : on ne met PAS les fichiers vidéo dans GitHub (limite 100 Mo/fichier, ça rame,
> bande passante plafonnée). YouTube non répertorié = la bonne maison pour la vidéo.
