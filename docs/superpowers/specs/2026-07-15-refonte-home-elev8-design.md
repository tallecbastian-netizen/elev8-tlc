# Refonte de la home Elev8 — design

**Date :** 2026-07-15
**Fichier concerné :** `index.html` (page d'accueil, tout-en-un : CSS inline, HTML, JS inline)

## Le problème

En moins de 5 secondes, un prospect qui arrive sur la home doit savoir deux choses :

1. comment regarder la VSL ;
2. comment réserver un appel / postuler.

Aujourd'hui, trois obstacles l'en empêchent :

- **L'intro bloque 2,4 s sur 5.** L'écran `#intro` couvre tout pendant 2 400 ms. La moitié du budget attention part dans une animation de logo.
- **Aucun CTA sur mobile.** `.nav-list{display:none}` sous 768 px cache tout le menu, CTA compris. Le bouton burger `.nav-toggle` est stylé en CSS mais l'élément n'existe pas dans le HTML. Un prospect mobile (l'essentiel du trafic, qui vient d'Instagram) n'a aucun CTA visible avant d'avoir scrollé sous la vidéo.
- **La VSL n'a aucune affordance de lecture.** C'est un `<iframe>` YouTube nu : ni miniature ni bouton play tant que l'iframe n'a pas chargé (~1 Mo de JS). Rien ne dit visuellement « clique ici ».

## Le parcours retenu

**La VSL vend, le CTA reste disponible en permanence.** La vidéo est le cœur de la page ; le bouton « Postuler » est visible en continu (header + barre fixe mobile) pour ceux qui sont déjà convaincus, sans jamais concurrencer visuellement la vidéo. Ni CTA bloquant après X minutes, ni deux chemins de force égale.

## Direction validée : « Cinéma »

La vidéo est le héros absolu du premier écran. Un titre court, la VSL grande et centrée avec miniature réelle et bouton play proéminent. Rien d'autre ne se dispute l'attention au-dessus de la ligne de flottaison.

## Spécifications

### 1. Intro d'ouverture

- Durée ramenée de **2 400 ms à 800 ms** (`#intro`, animations `introLogo` / `introRing` / `introOut`). La page est lisible vers ~1 s.
- Le retrait du nœud DOM en JS suit la même durée (aujourd'hui `setTimeout(…, 2500)`).
- `prefers-reduced-motion: reduce` → l'intro est supprimée d'entrée (comportement actuel, à conserver).

### 2. Header

- Contenu desktop : logo + « Espace membre » + CTA « Réserver un appel ».
- **Mobile (< 768 px) : le CTA reste visible.** « Espace membre » tombe, le CTA passe en version compacte (« Postuler »). Pas de menu burger : un seul lien secondaire ne le justifie pas, et un burger ajouterait un clic avant le CTA.
- L'élément `.nav-toggle` (stylé mais absent du HTML) est retiré du CSS : du code mort.
- Le header reste `sticky` avec sa bordure au scroll (`.scrolled`).

### 3. Premier écran — la VSL

- **Titre (`<h1>`) :** « Tu n'as pas besoin de plus de temps. Tu as besoin d'une méthode. »
  **Sous-titre :** « Et elle ne commence jamais par l'argent. Elle commence par toi. »

  Le titre tue l'objection n°1 de la cible (le manque de temps), ancré dans la story 02 (DUT + école d'ingénieur sans temps libre, apprendre à optimiser chaque heure). Le sous-titre porte la vraie différence face aux coachs business, ancré dans la story 04 (« L'argent n'est jamais le point de départ »). Les deux phrases gardent la même mécanique — une négation puis une affirmation.
- **Lecteur en façade** (remplace l'iframe nu) :
  - la miniature YouTube s'affiche immédiatement (`https://img.youtube.com/vi/u7dvBvDFAkM/maxresdefault.jpg`) ;
  - par-dessus : un bouton play proéminent aux couleurs de la marque, un badge « Regarder la vidéo » et la durée ;
  - **au clic**, l'`<iframe>` est injecté avec `autoplay=1` et remplace la façade.
  - Bénéfices : affichage instantané, affordance de lecture évidente, YouTube n'est chargé que pour ceux qui regardent.
  - La façade doit être un vrai contrôle accessible : `<button>`, focus visible, `aria-label` explicite.
- **CTA « Postuler »** juste sous la vidéo, conservant le style `.apply-btn` existant (lueur orbitale) et sa note « Quelques questions, 2 minutes — places limitées. »
- Sur mobile, la vidéo **et** son bouton play doivent tenir au-dessus de la ligne de flottaison.

### 4. Barre CTA fixe (mobile)

- Apparaît quand le CTA « Postuler » du hero sort de l'écran.
- Disparaît quand la section `#reservation` entre dans l'écran (pour ne jamais doubler le CTA).
- Détection via `IntersectionObserver`. Sans `IntersectionObserver`, la barre reste simplement masquée (dégradation silencieuse).

### 5. Bio

- Contenu **conservé intégralement** : portrait, stats animées (5 ans / 4 000 / 1,2 M€ / parcours), les **5 blocs de story** (`01 — Le déclic` → `05 — Aujourd'hui`), bouton de réservation.
- « BASTIAN TALLEC » passe de `<h1>` à `<h2>` : le `<h1>` de la page devient le titre du hero. Deux `<h1>` nuisent au référencement et aux lecteurs d'écran.
- Le bouton « Voir le programme » reste supprimé (retiré au commit `faa1f0e`).

### 6. Réservation

**Les règles de qualification ne changent pas.** À conserver à l'identique depuis l'`index.html` actuel :

- étape 1 : âge, budget, déjà entrepris, déjà investi — tous requis ;
- étape 2 : prénom, nom, email (doit contenir `@`), téléphone — tous requis ;
- normalisation du téléphone au format `+33` ;
- enregistrement du prospect via `window.TLCAuth.addProspect(email, nom, telFR, prenom, notes)`, dans un `try/catch` non bloquant ;
- `setTimeout` de 800 ms, puis `qualified = (!isNaN(savedAge) && savedAge >= 20)` ;
- si non qualifié → `#qualif-refuse` s'affiche, le calendrier reste verrouillé ;
- si qualifié → le gate se retire et le calendrier charge `https://calendar.app.google/EW5urnh1dZ4ECy5g6`.

Trois améliorations **de présentation uniquement** :

- **Indicateur d'étape** : « Étape 1 sur 2 — tes réponses », puis « Étape 2 sur 2 — tes coordonnées ». Le prospect ne sait pas aujourd'hui combien il lui reste.
- **Erreurs inline** sous le champ fautif, en remplacement des `alert()` (une popup navigateur casse le flow et dénote sur un site premium). Le champ fautif reçoit un état d'erreur visible et le focus.
- **Scroll automatique vers le calendrier au déverrouillage.** Aujourd'hui le cadenas disparaît hors écran et rien ne signale l'ouverture : un prospect peut remplir tout le formulaire et ne jamais voir le calendrier. Fuite de rendez-vous probable. Respecter `prefers-reduced-motion` (saut instantané).

### 7. Identité visuelle

Conservée : fond sombre, tokens émeraude (`--em:#2DD4A0`) / or (`--gold:#F2B45A`), aurora, orbes flottantes, carte à bordure dégradée, bouton à lueur orbitale, polices Sora / Oswald / Inter. Le gain esthétique doit venir de la **hiérarchie et du rythme**, pas d'un nouveau thème.

### 8. Contraintes techniques

- **Zéro dépendance ajoutée.** Vanilla, CSS inline, comme aujourd'hui.
- `prefers-reduced-motion: reduce` respecté partout (le bloc existant coupe animations et transitions).
- `.aurora` reste en `overflow:clip` (voir le commentaire ligne 77 : `hidden` rendait la VSL inaccessible — régression déjà corrigée au commit `f5b3686`).
- Les ancres continuent de scroller en JS **sans écrire le hash dans l'URL** (voir commit `393048b` : un hash présent fait re-scroller Chrome à chaque changement de mise en page).
- Chargement des scripts inchangé : Supabase CDN, `js/auth-config.js`, `js/auth.js`.
- Responsive : desktop, tablette, mobile. Aucun défilement horizontal.

## Critères de réussite

1. Sur mobile comme sur desktop, sans scroller : la miniature de la VSL et son bouton play sont visibles, et un CTA « Postuler » est visible.
2. La page est lisible en ~1 s (intro comprise).
3. Le parcours formulaire → calendrier se termine sans que le prospect ait à chercher le calendrier.
4. Aucune régression sur la qualification ni sur l'enregistrement Supabase.

## Méthode de choix

Cinq variantes HTML complètes et fonctionnelles sont produites en parallèle, une par direction visuelle, toutes conformes à cette spec (mêmes fonctionnalités, mêmes règles) :

1. **Aurora Refined** — évolution de l'existant : mêmes tokens, hiérarchie retravaillée, plus d'air.
2. **Éditorial Sombre** — typographie massive, grille éditoriale, moins d'effets, l'or plus présent.
3. **Cinéma Spotlight** — plein cadre, vignettage, la VSL comme un écran de cinéma. Dramatique et minimal.
4. **Bento Premium** — grille de cartes bento, la VSL dans la grande cellule, stats en cellules.
5. **Cercle Privé** — verre dépoli, or dominant, sensation « club privé » — colle à ELEV8 comme cercle d'entrepreneurs.

Bastian ouvre les cinq, en choisit une, et celle-ci devient `index.html`.
