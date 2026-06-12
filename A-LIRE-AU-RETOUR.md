# À lire au retour — Bastian

Salut Bastian. Voici tout ce que j'ai préparé pendant ton absence, ce qu'il me faut de toi
pour finaliser, et 2 alertes importantes. C'est carré.

---

## ✅ Ce que j'ai construit (nouvelles pages)

| Fichier | Rôle | À ouvrir |
|---|---|---|
| `GUIDE-VSL.md` | Guide : **où héberger ta VSL** (YouTube vs GitHub) + comment la diffuser | (ce dossier) |
| `vsl.html` | **Page de visionnage** de la VSL (vidéo + bouton candidature) | double-clic |
| `candidature.html` | **Questionnaire** Elite 90 Days (12 questions + écran final → Calendly) | double-clic |
| `espace-membre.html` | **Espace membre** : dossier de démarrage (Telegram, apps, plateformes, vidéos) | double-clic |
| `suivi-membres.html` | **Tableau de bord privé** : suivi de chaque membre, par promotion, WhatsApp + Zoom | double-clic |
| `section-marques.html` | **Mur de logos** « marques décrochées par mes élèves » (aperçu + bloc à coller) | double-clic |

---

## 🎬 Réponse à ta question : YouTube ou GitHub ?

**YouTube en « Non répertorié ». Pas GitHub.** (Détails complets dans `GUIDE-VSL.md`.)
GitHub n'est pas un hébergeur vidéo : limite de 100 Mo/fichier, ça rame, bande passante plafonnée,
aucune statistique de rétention. YouTube non répertorié = gratuit, rapide, stats, et la vidéo
n'apparaît pas publiquement. (Vimeo = l'option premium plus tard.)

---

## 🔗 Le tunnel complet (vue d'ensemble)

```
Inscription (site)  →  E-mail auto Brevo (miniature → )  →  vsl.html (VSL + bouton)
        →  candidature.html (12 questions)  →  Écran final  →  Calendly (RDV)
        →  Si on bosse ensemble  →  accès espace-membre.html
        →  Tu suis chacun dans suivi-membres.html (par promotion, WhatsApp/Zoom en 1 clic)
```

---

## 🙋 Ce qu'il me faut de toi pour finaliser (5 infos)

1. 🎥 **L'identifiant YouTube de ta VSL** (la partie après `v=` dans l'URL) → je l'intègre dans `vsl.html`.
2. 📅 **Ton lien Calendly** → je le mets sur le bouton « Réserver mon entretien » de `candidature.html`.
3. 🗄️ **2 endpoints Formspree** (gratuit, formspree.io) :
   - un pour l'inscription du site (newsletter Brevo existe déjà, mais si tu veux aussi Formspree),
   - un pour **la candidature** (les 12 réponses t'arrivent par mail). → je branche.
4. 🏷️ **Tes vrais logos de marques** (ceux de tes élèves) → dépose-les dans `assets/img/marques/`, je les place dans le mur.
5. 🎞️ **Les vidéos Départ / Onboarding / Lancement** en **YouTube non répertorié** → donne-moi les IDs, je les intègre dans `espace-membre.html`.

---

## ⚠️ 2 alertes (suite à tes précisions)

**1. Vidéos DCEO.** Tu m'as dit que DCEO t'appartient → pas de souci de droit d'auteur, OK. **Mais**
je n'ai pas « aspiré » le site, et c'est volontaire : on ne met pas des fichiers vidéo lourds dans
GitHub. Le bon move = tes vidéos en **YouTube non répertorié**, et l'espace membre les intègre
(emplacements déjà prêts). Donne-moi les IDs.

**2. Marques.** Tu m'as dit que Kelly est une **élève** que tu as accompagnée. Parfait — j'ai donc
titré la section **« Les marques décrochées par les personnes que j'accompagne »**. C'est honnête
ET ça vend plus fort (tes élèves obtiennent des résultats concrets). Je n'ai pas pu extraire
automatiquement les logos de `kellytoldme.com` (page en JavaScript) : envoie-moi les logos, ou
quand tu reviens je les récupère via le navigateur.

---

## 🚨 Point bloquant pour le tunnel : le formulaire d'inscription a disparu

Ton **redesign** (thème or & argent) **ne contient plus le formulaire d'inscription branché sur
Brevo**. Or c'est **le point d'entrée du tunnel** : sans lui, personne ne reçoit l'e-mail VSL.
Dis-moi **« remets le formulaire »** et je réintègre l'inscription Brevo (Prénom, Nom, E-mail,
Téléphone) dans le nouveau design.

---

## 📧 L'e-mail automatique (VSL) — à faire dans Brevo

1. Brevo → **Automations** → « Créer un scénario » → déclencheur **« Un contact est ajouté à une liste »** (ta liste site).
2. Action **« Envoyer un e-mail »**.
3. Dans l'e-mail : une **image-miniature** (ta tête + un gros ▶) **cliquable**, qui pointe vers
   `…/vsl.html`. (Ne mets jamais la vidéo directement : les messageries la bloquent.)
4. Active le scénario. Terminé — chaque inscrit reçoit ta VSL automatiquement.

> Je peux te générer la miniature et te rédiger le texte de l'e-mail quand tu veux.

---

## 🔒 Notes de sécurité (important)

- Les « codes d'accès » de `espace-membre.html` et `suivi-membres.html` sont **cosmétiques**
  (le code est dans la page, donc contournable). Suffisant pour un espace réservé, **pas** pour
  protéger du contenu sensible. Pour de la vraie protection vidéo → plateforme dédiée (Teachable,
  Circle, Notion payant) plus tard.
- `suivi-membres.html` stocke les données **dans ton navigateur** (cet ordinateur). **Exporte
  régulièrement** (boutons Sauvegarde / CSV). Pour y accéder depuis plusieurs appareils ou à
  plusieurs → je te recommande **Airtable** (je peux te préparer la structure).
- Pense à changer le code d'accès `ELITE90` dans `espace-membre.html`.

---

## ▶️ Pour mettre tout ça en ligne

Relance **`PUBLIER-LE-SITE.bat`**. Les nouvelles pages seront accessibles à :
`…github.io/Landing-Page/vsl.html`, `/candidature.html`, `/espace-membre.html`, `/suivi-membres.html`.

---

## 💡 Idées de fonctionnalités (puisque tu m'as dit de ne pas hésiter)

- **Bouton « copier message de relance »** par promotion (envoi groupé WhatsApp en 1 clic).
- **Étiquette de progression automatique** : passe le membre en « inactif » s'il n'a pas avancé en X jours.
- **Page « ressources » par promotion** (liens Zoom récurrents, documents) que tu partages d'un lien.
- **Mini-CRM Airtable** synchronisé (multi-appareils + envoi auto) si le volume grossit.

Dis-moi lesquelles te parlent.
