# ▶️ REPRENDRE ICI — point de reprise (Supabase + GitHub de Bastian)

_Ouvre ce fichier en premier quand tu repars. Il dit où on en est et ce qu'il reste._

---

## 1) Où on en est

Le **site est complet et 100 % en local** dans ce dossier. Rien n'est perdu.
La seule chose branchée sur un compte « de test » (Berat) était la connexion sécurisée —
**je l'ai retirée**. `js/auth-config.js` est revenu en mode neutre (placeholders), donc
aucun blocage : tu repars propre sur **le Supabase et le GitHub de Bastian**.

---

## 2) Le site (déjà fait) — pages

| Fichier | Rôle |
|---|---|
| `index.html` | Accueil (or & argent). Menu + pied de page avec lien **Marques**. |
| `marques.html` | Mur des marques décrochées par tes élèves (logos à déposer dans `assets/img/marques/`). |
| `vsl.html` | Page de visionnage de la VSL (YouTube à brancher). |
| `candidature.html` | Questionnaire de candidature (12 questions) → écran final + Calendly. |
| `espace-membre.html` | Espace membre (dossier de démarrage + 3 sections de vidéos). **Réservé aux membres.** |
| `suivi-membres.html` | Ton tableau de suivi (prospects/membres, cycle 28 j). **Réservé à l'admin.** |
| `connexion.html` | Page de connexion (e-mail → code 6 chiffres). |
| `confidentialite.html` | Page RGPD. |
| Guides | `GUIDE-CONNEXION-SUPABASE.md`, `GUIDE-VSL.md`, `GUIDE-WHATSAPP-ET-VIDEOS.md` |

---

## 3) Ce qu'il RESTE à faire (dans l'ordre)

### A. Connexion sécurisée — sur le Supabase de **Bastian**
> Suivre `GUIDE-CONNEXION-SUPABASE.md`. En résumé :
1. Sur le compte Supabase **de Bastian** → **New project** (gratuit).
2. Settings → **API → API Keys** → copier **Project URL** + **clé publique** (`sb_publishable_…` ou anon `eyJ…`).
3. Les coller dans `js/auth-config.js` (lignes `SUPABASE_URL` et `SUPABASE_ANON_KEY`).
4. Authentication → **Emails → Magic link or OTP** → mettre `{{ .Token }}` dans le corps (envoie un **code à 6 chiffres**).
5. Authentication → **Users** → ajouter ton e-mail admin + chaque membre.
6. Vérifier `ADMIN_EMAILS` dans `auth-config.js` (qui a accès au suivi).

### B. Publier sur GitHub (repo déjà à toi : `tallecbastian-netizen/Landing-Page`)
- Double-clic sur **`PUBLIER-LE-SITE.bat`**.
- Site en ligne : `https://tallecbastian-netizen.github.io/Landing-Page/`
- ⚠️ Ne publie l'auth qu'**après** l'étape A (sinon connexion non fonctionnelle).

### C. Contenus en attente (à me donner)
- 🎥 **VSL** : l'ID de la vidéo YouTube (non répertoriée) → pour `vsl.html`.
- 📅 **Calendly** : ton lien d'entretien → pour `candidature.html`.
- 📨 **Formspree** : l'ID du formulaire de candidature.
- 🏷️ **Logos marques** : images → `assets/img/marques/`.
- 🎬 **Vidéos onboarding** : IDs YouTube des vidéos des 3 sections de l'espace membre.

---

## 4) Quand on reprend, donne-moi ça (je fais le reste)

1. **URL + clé publique** du projet Supabase de Bastian.
2. **Lien Calendly**, **ID VSL YouTube**, **ID Formspree**.
3. **IDs des vidéos onboarding** + **logos des marques**.

Avec ça je branche tout, je vérifie, et tu publies avec le `.bat`.

---

## ⚠️ Note
Un projet Supabase « de test » (compte Berat) a servi aux essais — **on ne l'utilise pas**.
Ses clés ont été retirées du code. On repart 100 % sur **ton** Supabase + **ton** GitHub.
