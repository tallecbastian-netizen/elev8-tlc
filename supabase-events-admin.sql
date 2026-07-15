-- ============================================================
--  TLC — Events pilotés depuis l'admin + inscriptions rattachées à un event
--  À COLLER dans : Supabase (projet "Site Web TLC" / vnyereucdquqkutgsddv)
--                  -> SQL Editor -> tout coller -> Run.  (Relançable sans danger.)
--  Prérequis : supabase-setup.sql + supabase-mailing-setup.sql
--              + supabase-source-event.sql déjà exécutés.
--
--  ⚠️ À LANCER **AVANT** DE METTRE LES PAGES EN LIGNE.
--     add_prospect passe de 6 à 7 arguments. Tant que ce script n'est pas
--     passé, une page qui envoie le 7e argument verrait son appel échouer,
--     et le prospect ne serait PAS enregistré dans Supabase.
--
--  Ce que ça fait :
--   • events : + slug (le ?e=lyon de l'URL), + ville, + accroche
--   • inscriptions_events : une ligne par (personne + event)
--   • add_prospect : accepte p_event_id -> rattache l'inscription à l'event
--   • list_inscriptions_events : lecture admin pour le filtre de mailing
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1) events : les champs qui pilotent la page ads (elev8-event)
-- ─────────────────────────────────────────────────────────────
alter table public.events add column if not exists slug     text;
alter table public.events add column if not exists ville    text;
alter table public.events add column if not exists accroche text;

-- Le slug identifie l'event dans l'URL : elev8-event.vercel.app/?e=lyon
-- Unique, mais nullable : les events "site uniquement" n'en ont pas besoin.
create unique index if not exists events_slug_key
  on public.events(slug) where slug is not null;

-- ─────────────────────────────────────────────────────────────
-- 2) inscriptions_events : une ligne par (personne + event)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.inscriptions_events (
  id         uuid primary key default gen_random_uuid(),
  email      text not null,
  event_id   uuid not null references public.events(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (email, event_id)
);

-- unique(email, event_id) : un double envoi du formulaire ne crée qu'une ligne,
-- mais Montpellier ET Lyon créent bien deux lignes.

-- on delete restrict : garde-fou volontaire. Sans lui, supprimer un event
-- effacerait au passage tous ses inscrits — donc la segmentation du mailing.

create index if not exists inscriptions_events_email_idx
  on public.inscriptions_events(lower(email));

-- Email toujours en minuscules (même règle que membres).
create or replace function public.tlc_lower_email_insc() returns trigger as $$
begin new.email = lower(new.email); return new; end;
$$ language plpgsql;
drop trigger if exists trg_tlc_lower_email_insc on public.inscriptions_events;
create trigger trg_tlc_lower_email_insc
  before insert or update on public.inscriptions_events
  for each row execute function public.tlc_lower_email_insc();

-- RLS : table totalement verrouillée, aucune policy.
-- Tout passe par les fonctions security definer ci-dessous, comme membres.
alter table public.inscriptions_events enable row level security;

-- ─────────────────────────────────────────────────────────────
-- 3) add_prospect : + p_event_id (7e argument)
-- ─────────────────────────────────────────────────────────────
-- On supprime la version à 6 arguments AVANT de créer celle à 7.
-- Sinon PostgREST ne sait pas laquelle choisir sur un appel en paramètres
-- nommés, et les DEUX formulaires (site et event) tombent en erreur.
drop function if exists public.add_prospect(text, text, text, text, text, text);

create or replace function public.add_prospect(
  p_email    text,
  p_nom      text default null,
  p_tel      text default null,
  p_prenom   text default null,
  p_notes    text default null,
  p_source   text default 'formulaire',
  p_event_id uuid default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.membres(email, nom, prenom, telephone, statut, source, notes)
  values (lower(p_email), p_nom, p_prenom, p_tel, 'prospect',
          coalesce(nullif(p_source, ''), 'formulaire'), p_notes)
  on conflict (email) do update
    set prenom    = coalesce(excluded.prenom, public.membres.prenom),
        nom       = coalesce(excluded.nom, public.membres.nom),
        telephone = coalesce(excluded.telephone, public.membres.telephone),
        -- Attribution "premier contact" : on garde la provenance d'origine.
        source    = coalesce(public.membres.source, excluded.source);

  -- Rattachement à l'event, uniquement si la page en a fourni un.
  -- Le site appelle sans p_event_id : rien ne change pour lui.
  if p_event_id is not null then
    insert into public.inscriptions_events(email, event_id)
    values (lower(p_email), p_event_id)
    on conflict (email, event_id) do nothing;
  end if;
end;
$$;

-- Droits (les pages publiques appellent en tant que 'anon').
revoke all on function public.add_prospect(text, text, text, text, text, text, uuid) from public;
grant execute on function public.add_prospect(text, text, text, text, text, text, uuid) to anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- 4) list_inscriptions_events : lecture admin (filtre de mailing)
-- ─────────────────────────────────────────────────────────────
-- Même modèle que list_membres() : réservé à l'admin CONNECTÉ.
-- 👉 Le(s) même(s) e-mail(s) admin que dans js/auth-config.js.
create or replace function public.list_inscriptions_events()
returns table (email text, event_id uuid, event_nom text, created_at timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  if not public.est_admin() then raise exception 'Accès refusé'; end if;
  return query
    select i.email,
           i.event_id,
           coalesce(nullif(e.ville, ''), e.titre) as event_nom,
           i.created_at
      from public.inscriptions_events i
      join public.events e on e.id = i.event_id
     order by i.created_at desc;
end;
$$;

revoke all on function public.list_inscriptions_events() from public, anon;
grant execute on function public.list_inscriptions_events() to authenticated;

-- ============================================================
--  Après ce script :
--   • admin-events.html : Ville + Lien court + Accroche pilotent la page ads
--   • Page ads ?e=lyon  -> add_prospect(..., p_event_id) => inscription rattachée
--   • gestion-membres   : colonne Event + filtre par event pour le mailing
--   • Site (js/auth.js) : appelle sans p_event_id => comportement inchangé
-- ============================================================
