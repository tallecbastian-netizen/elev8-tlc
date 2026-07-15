# Nom de l'event sur les inscriptions — design

**Date :** 2026-07-15
**Repos concernés :** `elev8-tlc` (site + admin) et `EVENT-ADS-VILLE` (landing ads par ville)

## Problème

Les inscriptions arrivent dans la table `membres` avec une colonne `source` qui vaut
`formulaire` (site) ou `event` (page ads). L'admin `gestion-membres.html` affiche déjà un
badge et un filtre Site / Event.

Il manque **quel** event. Bastian ne peut donc pas cibler son mailing sur les inscrits
d'une ville précise.

## Objectif

Depuis `gestion-membres.html`, pouvoir filtrer les inscrits sur un event donné
(« Montpellier — 12 mars 2026 »), les sélectionner, et déclencher le mailing groupé
existant.

## Décisions

| Sujet | Décision | Raison |
|---|---|---|
| Multi-event | Table dédiée, une ligne par (personne + event) | Une personne peut s'inscrire à Montpellier **et** Lyon ; le mailing doit pouvoir cibler chaque event |
| Origine du nom | Constante dans la page ads | Pas de lecture réseau avant le POST Brevo, donc aucun risque dans le webview Meta |
| Emplacement | Bloc config dans le `<head>`, sous le `<title>` | Là où Bastian édite déjà quand il change de ville ; voyage avec la page si elle est dupliquée |
| Liste des events dans l'admin | Construite depuis `inscriptions_events` | La page ads ne lit pas la table `events` ; afficher un event sans inscrit n'aurait pas de sens |

## 1. Base Supabase

Nouvelle table :

```sql
create table if not exists public.inscriptions_events (
  id         uuid primary key default gen_random_uuid(),
  email      text not null,
  event_nom  text not null,
  created_at timestamptz not null default now(),
  unique (email, event_nom)
);
alter table public.inscriptions_events enable row level security;
```

- `unique (email, event_nom)` : un double envoi du formulaire pour le même event ne crée
  qu'une ligne, mais deux villes créent bien deux lignes.
- RLS activée, aucune policy : la table est totalement verrouillée. Tout passe par les
  fonctions `security definer`, comme `membres`.

### `add_prospect` — 7ᵉ argument

`p_event text default null`. Quand il est fourni, la fonction insère aussi dans
`inscriptions_events` (`on conflict do nothing`).

**Point d'attention :** il faut `drop` l'ancienne version à 6 arguments avant de créer
celle à 7. Sinon PostgREST ne sait pas laquelle choisir sur un appel en paramètres
nommés, et **les deux formulaires (site et event) tombent en erreur**. C'est le même
geste que `supabase-source-event.sql` fait déjà pour la version à 5 arguments.

Le site (`js/auth.js:119`) appelle sans `p_event` : son comportement ne change pas.

### `list_inscriptions_events()`

Fonction admin séparée, sur le modèle exact de `list_membres()` : `security definer`,
vérifie `auth.jwt() ->> 'email'`, `grant execute` à `authenticated` seulement.

On ne touche **pas** à `list_membres()`. Changer son type de retour
(`returns setof public.membres`) imposerait un `drop` et ferait courir un risque à
l'admin qui fonctionne. L'admin fera deux RPC et joindra par email côté client.

### `membres.source` reste inchangée

La règle « premier contact gagne » est conservée. Quelqu'un venu du site puis inscrit à
Montpellier reste marqué `Site`, mais son inscription à Montpellier apparaît quand même.
C'est voulu : `source` répond à « d'où vient cette personne », `inscriptions_events` à
« à quoi elle s'est inscrite ».

## 2. Page `EVENT-ADS-VILLE/index.html`

Bloc config dans le `<head>`, juste sous le `<title>` (ligne ~7) :

```html
<!-- ╔══════════════════════════════════════════╗
     ║  NOM DE L'EVENT — À CHANGER À CHAQUE VILLE  ║
     ║  C'est ce nom que tu verras dans l'admin.   ║
     ╚══════════════════════════════════════════╝ -->
<script>
  window.EVENT_NOM = 'Montpellier — 12 mars 2026';
</script>
```

Puis `p_event: window.EVENT_NOM` ajouté au `fetch` existant (`index.html:476`).

Contraintes à préserver :
- Le POST natif vers Brevo n'est pas touché.
- L'appel Supabase reste non-bloquant, en `keepalive`, dans un `try/catch`. Si Supabase
  échoue, l'inscription Brevo passe quand même.

## 3. Admin `gestion-membres.html`

- Colonne « Event » dans le tableau : les events de la personne, ou `—`.
- Menu déroulant « Event » à côté de la barre Provenance, alimenté par les valeurs
  distinctes de `inscriptions_events`.
- Sélection d'un event → le tableau ne garde que ces personnes → « tout sélectionner »
  → bouton **✉️ Email groupé** existant. Le flux de mailing actuel n'est pas modifié.
- L'export CSV embarque la colonne Event.

## Vérification

- Site : une inscription via le formulaire du site arrive toujours en `source=formulaire`,
  sans ligne dans `inscriptions_events`.
- Event : une inscription via la page ads crée le membre **et** la ligne
  `inscriptions_events` avec le bon nom.
- Double inscription au même event : une seule ligne.
- Inscription à deux events : deux lignes, les deux visibles dans l'admin.
- Le filtre event + Email groupé cible les bonnes personnes.
