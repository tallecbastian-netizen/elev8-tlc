# Events pilotés depuis l'admin + nom de l'event sur les inscriptions — design

**Date :** 2026-07-15
**Repos concernés :** `elev8-tlc` (site + admin) et `EVENT-ADS-VILLE` (landing ads par ville)

## Problème

Deux besoins qui n'en font qu'un :

1. **Mailing.** Les inscriptions arrivent dans `membres` avec une colonne `source`
   (`formulaire` = site, `event` = page ads). Il manque **quel** event, donc impossible de
   cibler les inscrits d'une ville précise.
2. **Autonomie.** La page ads a tout en dur (ville, textes, nom de l'event). Chaque
   nouvelle ville impose de passer par GitHub. Bastian veut tout piloter depuis un
   formulaire, sans jamais revenir au repo.

Le point commun : le nom de l'event doit avoir **une seule source de vérité**, éditable
par Bastian, et consommée à la fois par la page ads et par le filtre de mailing.

## Objectif

- Lancer une nouvelle ville depuis `admin-events.html` uniquement : zéro GitHub, zéro Brevo.
- Dans `gestion-membres.html`, filtrer les inscrits par event et déclencher le mailing
  groupé existant.

## Décisions

| Sujet | Décision | Raison |
|---|---|---|
| Source du contenu | La table `events`, pilotée par `admin-events.html` (existe déjà) | Le formulaire demandé existe : titre, date, image, description, Brevo, actif |
| Constante `window.EVENT_NOM` | **Abandonnée** | Elle imposait de revenir dans le repo — l'inverse du besoin |
| Villes en parallèle | Chaque event a un `slug` → `elev8-event.vercel.app/?e=lyon` | Montpellier et Lyon tournent en même temps, inscrits séparés |
| Multi-event par personne | Table `inscriptions_events`, une ligne par (personne + event) | Une personne peut s'inscrire à Montpellier **et** Lyon |
| Clé de liaison | `event_id` (uuid), pas du texte libre | Plus de faute de frappe possible entre la page et le filtre |
| Brevo | Un seul formulaire pour toutes les villes, jamais modifié | La redirection vers `merci.html` se règle dans Brevo, pas dans le code. Un formulaire unique = cette config est faite une fois pour toutes. La séparation par ville vit dans Supabase, là où se fait le mailing |
| Lecture réseau sur la page ads | Acceptée | Le commentaire d'`index.html` vise les **envois** AJAX dans le webview Meta, pas une lecture au chargement. `event.html` fait déjà exactement ça |

## 1. Base Supabase

### `events` — nouvelles colonnes

```sql
alter table public.events add column if not exists slug     text;
alter table public.events add column if not exists ville    text;
alter table public.events add column if not exists accroche text;
create unique index if not exists events_slug_key
  on public.events(slug) where slug is not null;
```

- `slug` : le `?e=lyon` de l'URL. Unique, mais nullable — les events existants (site
  uniquement) n'en ont pas besoin.
- `ville` : pilote le `<title>`, le `<h1>` et le footer de la page ads.
- `accroche` : l'eyebrow (« Une semaine · Centre-ville de Montpellier »).
- `description` (existante) : réutilisée pour le sous-titre et la meta description.

La policy `public_read_events` (SELECT USING true) existe déjà : la page ads peut lire
avec la clé anon, sans rien changer.

### `inscriptions_events` — nouvelle table

```sql
create table if not exists public.inscriptions_events (
  id         uuid primary key default gen_random_uuid(),
  email      text not null,
  event_id   uuid not null references public.events(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (email, event_id)
);
alter table public.inscriptions_events enable row level security;
```

- `unique (email, event_id)` : un double envoi du formulaire ne crée qu'une ligne, mais
  deux villes créent bien deux lignes.
- RLS activée, aucune policy : tout passe par les fonctions `security definer`, comme
  `membres`.
- **`on delete restrict` est délibéré.** `admin-events.html` a un bouton Supprimer.
  Sans ce garde-fou, supprimer un event effacerait silencieusement les inscrits
  rattachés — donc la segmentation du mailing. Avec `restrict`, la suppression échoue
  tant qu'il reste des inscrits ; l'admin doit afficher un message clair plutôt qu'une
  erreur brute (voir §3).

### `add_prospect` — 7ᵉ argument

`p_event_id uuid default null`. Quand il est fourni, la fonction insère aussi dans
`inscriptions_events` (`on conflict do nothing`).

**Point d'attention :** il faut `drop` l'ancienne version à 6 arguments avant de créer
celle à 7. Sinon PostgREST ne sait pas laquelle choisir sur un appel en paramètres
nommés, et **les deux formulaires (site et event) tombent en erreur**. C'est le même
geste que `supabase-source-event.sql` fait déjà pour la version à 5 arguments.

Le site (`js/auth.js:119`) appelle sans `p_event_id` : son comportement ne change pas.

### `list_inscriptions_events()`

Fonction admin sur le modèle exact de `list_membres()` : `security definer`, vérifie
`auth.jwt() ->> 'email'`, `grant execute` à `authenticated` seulement. Renvoie email +
event_id + titre/ville de l'event.

On ne touche **pas** à `list_membres()`. Changer son type de retour
(`returns setof public.membres`) imposerait un `drop` et ferait courir un risque à
l'admin qui fonctionne. `gestion-membres.js` fera deux RPC et joindra par email côté
client.

### `membres.source` reste inchangée

La règle « premier contact gagne » est conservée. Quelqu'un venu du site puis inscrit à
Montpellier reste marqué `Site`, mais son inscription à Montpellier apparaît quand même.
C'est voulu : `source` répond à « d'où vient cette personne », `inscriptions_events` à
« à quoi elle s'est inscrite ».

## 2. Page `EVENT-ADS-VILLE/index.html`

La page devient pilotée par les données, sur le modèle de `event.html` :

1. Au chargement, lecture de `?e=<slug>` dans l'URL.
2. `fetch` vers `/rest/v1/events?slug=eq.<slug>&select=*` avec la clé anon (fetch simple,
   pas de lib Supabase — la page n'en a pas et n'en a pas besoin).
3. Injection dans le DOM : `<title>`, meta description, eyebrow (`accroche`),
   `<h1>` (`ville`), sous-titre (`description`), footer (`ville`).
4. À l'envoi du formulaire, `p_event_id` est ajouté au `fetch` `add_prospect` existant
   (`index.html:476`) — la valeur est déjà en mémoire, aucune requête au moment du submit.

Contraintes à préserver :
- Le POST natif vers Brevo n'est pas touché ; son `action` (ligne 321) reste en dur.
- L'appel Supabase reste non-bloquant, en `keepalive`, dans un `try/catch`.
- Les textes actuels (Montpellier) restent en dur dans le HTML comme **valeurs de repli**.
  Si la lecture échoue ou si le slug est inconnu, la page reste affichable et le
  formulaire Brevo continue de fonctionner — elle perd seulement le rattachement à
  l'event.

## 3. Admin `admin-events.html`

- Nouvelle section « Page ads » dans le formulaire : **Ville**, **Lien court** (slug),
  **Accroche**. Les champs existants ne bougent pas.
- Labels explicites pour lever l'ambiguïté `titre` (affiché sur le site) vs `ville`
  (affichée sur la page ads).
- Après sauvegarde, afficher le lien à copier dans la pub :
  `https://elev8-event.vercel.app/?e=<slug>`, avec un bouton « Copier ».
- **Retirer la logique mono-actif** (ligne ~620 : `update({actif:false}).neq('id', id)`).
  C'est un changement de comportement existant : `actif` passe de « le seul affiché » à
  « en ligne ». Conséquence sur `event.html`, vérifiée : il fait
  `.eq('actif',true).order('date_event').limit(1)` et affichera donc le prochain event à
  venir. Comportement acceptable et voulu.
- Le bouton Supprimer doit gérer l'échec `on delete restrict` avec un message clair
  (« X inscrits sont rattachés à cet event »), pas une erreur brute.

## 4. Admin `gestion-membres.html`

- Colonne « Event » dans le tableau : les events de la personne, ou `—`.
- Menu déroulant « Event » à côté de la barre Provenance, alimenté par les events ayant
  au moins un inscrit.
- Sélection d'un event → le tableau ne garde que ces personnes → « tout sélectionner »
  → bouton **✉️ Email groupé** existant. Le flux de mailing actuel n'est pas modifié.
- L'export CSV embarque la colonne Event.

## Le geste de Bastian, après cette modif

Lancer une nouvelle ville :

1. `admin-events.html` → « + Nouvel event »
2. Ville : Lyon · Lien court : `lyon` · Date · Accroche · Description
3. Sauver → copier le lien `https://elev8-event.vercel.app/?e=lyon`
4. Coller le lien dans la pub Meta

GitHub : rien. Brevo : rien. Vercel : rien.

Faire le mailing :

1. `gestion-membres.html` → filtre Event « Lyon »
2. Tout sélectionner → ✉️ Email groupé

## Vérification

- Site : une inscription via le formulaire du site arrive toujours en `source=formulaire`,
  sans ligne dans `inscriptions_events`.
- Event : une inscription via `?e=lyon` crée le membre **et** la ligne
  `inscriptions_events` avec le bon `event_id`.
- Double inscription au même event : une seule ligne.
- Inscription à deux events : deux lignes, les deux visibles dans l'admin.
- Slug inconnu ou Supabase injoignable : la page s'affiche avec les textes de repli et le
  formulaire Brevo fonctionne toujours.
- Deux events actifs en parallèle : les deux liens `?e=` fonctionnent simultanément.
- `event.html` (site) affiche toujours le prochain event actif.
- Le filtre event + Email groupé cible les bonnes personnes.
