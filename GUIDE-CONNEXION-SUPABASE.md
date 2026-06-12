# 🔐 Connexion sécurisée (Supabase) — guide

> Crée le projet Supabase sous **le compte de Bastian**, puis remplis `js/auth-config.js`
> avec SON URL et SA clé publique (Settings → API → API Keys).

---

## ✅ Ce qui est DÉJÀ fait (par Claude)

- ⏳ À FAIRE : coller l'URL + la clé publique du projet **de Bastian** dans `js/auth-config.js`.
- `connexion.html` : page de connexion (e-mail → code à 6 chiffres).
- `espace-membre.html` : protégé → réservé aux **membres**.
- `suivi-membres.html` : protégé → réservé à l'**admin** (toi).
- Admins autorisés : `tallecbastian.pro@gmail.com` et `berat.atlg@gmail.com`
  (modifiable dans `js/auth-config.js`).

> La clé `sb_publishable_…` est **publique**, c'est normal qu'elle soit dans le code.
> ⚠️ Ne mets **JAMAIS** la clé « secret » (`sb_secret_…`) dans le site.

---

## ⚠️ Il reste 2 réglages dans Supabase (sinon tu es bloqué hors du suivi)

### Réglage 1 — Recevoir un CODE à 6 chiffres par e-mail
Par défaut Supabase envoie un **lien**. On veut un **code**.

1. Dashboard Supabase → **Authentication** (menu gauche) → **Emails**.
2. Onglet **Magic Link** (le modèle utilisé pour les codes).
3. Dans le contenu de l'e-mail, ajoute cette ligne (le code = `{{ .Token }}`) :

   ```html
   <h2>Ton code de connexion</h2>
   <p>Entre ce code sur le site :</p>
   <p style="font-size:28px;font-weight:bold;letter-spacing:4px;">{{ .Token }}</p>
   <p>Il expire dans 1 heure.</p>
   ```
4. **Save**.

### Réglage 2 — Autoriser qui peut se connecter
Seules les adresses **ajoutées** peuvent recevoir un code (les inconnus sont refusés).

1. Dashboard → **Authentication** → **Users**.
2. Bouton **Add user** → **Create new user**.
3. Mets l'**e-mail**, coche **Auto Confirm User**, **Create**.
4. À faire pour :
   - **toi** (admin) : `tallecbastian.pro@gmail.com` (et/ou `berat.atlg@gmail.com`)
   - **chaque membre** de l'accompagnement.

> 💡 Pas besoin de mot de passe : la connexion se fait uniquement par code e-mail.

---

## ➕ Ajouter un nouveau membre (plus tard)
Authentication → Users → **Add user** → son e-mail + **Auto Confirm** → Create.
Il pourra se connecter sur `connexion.html` avec son e-mail.

## ⛔ Retirer / suspendre un membre (fin de cycle, impayé…)
Authentication → Users → clic sur la personne → **Delete user** (ou **Ban**).
Il ne pourra plus accéder à l'espace membre.

---

## 🧪 Tester
1. Publie le site (`PUBLIER-LE-SITE.bat`).
2. Va sur `…/connexion.html`.
3. Mets ton e-mail admin → **Recevoir mon code**.
4. Regarde tes mails (et les spams) → entre le code → tu arrives sur le suivi.
5. Teste aussi avec un e-mail « membre » → tu dois arriver sur l'espace membre (pas le suivi).

## 🔁 Le cycle de 28 jours
Avec Supabase, **un nouveau code est envoyé à chaque connexion** — tu n'as plus à
les distribuer à la main. Pour « réactiver » un cycle, tu n'as rien à faire ;
pour couper l'accès à quelqu'un, supprime son utilisateur (ci-dessus).

---

## 🆘 Si la connexion affiche une erreur de clé
Certaines versions n'aiment pas encore la nouvelle clé `sb_publishable_`.
Solution de secours :
1. Supabase → Settings → **API Keys** → onglet **« Legacy anon, service_role API keys »**.
2. Copie la clé **anon public** (commence par `eyJ…`).
3. Colle-la dans `js/auth-config.js` à la place de `SUPABASE_ANON_KEY`.
