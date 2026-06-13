-- ============================================================
--  TLC — Base "membres" (source de vérité pour l'accès 28 jours)
--  À COLLER dans : Supabase (projet de BASTIAN) → SQL Editor → New query → Run
--  ⚠️ Vérifie en haut à gauche que tu es bien sur LE PROJET DE BASTIAN.
-- ============================================================

-- 1) La table
create table if not exists public.membres (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique,
  nom           text,
  telephone     text,
  statut        text not null default 'prospect' check (statut in ('prospect','membre')),
  promo         text,
  date_activation date,        -- date à laquelle tu l'as activé
  acces_jusqu_au  date,        -- accès valable jusqu'à cette date (= activation + 28 j)
  actif         boolean not null default true,
  notes         text,
  created_at    timestamptz not null default now()
);

-- 2) Toujours stocker l'email en minuscules
create or replace function public.tlc_lower_email() returns trigger as $$
begin new.email = lower(new.email); return new; end;
$$ language plpgsql;

drop trigger if exists trg_tlc_lower_email on public.membres;
create trigger trg_tlc_lower_email
  before insert or update on public.membres
  for each row execute function public.tlc_lower_email();

-- 3) Sécurité au niveau des lignes (RLS)
alter table public.membres enable row level security;

-- 3a) ADMIN (Bastian) : accès total à toutes les lignes.
--     👉 Remplace/ajoute les e-mails admin ici si besoin.
drop policy if exists "tlc admin all" on public.membres;
create policy "tlc admin all" on public.membres
  for all
  using  ( lower(auth.jwt() ->> 'email') in ('tallecbastian.pro@gmail.com') )
  with check ( lower(auth.jwt() ->> 'email') in ('tallecbastian.pro@gmail.com') );

-- 3b) MEMBRE : peut lire UNIQUEMENT sa propre ligne (pour vérifier son accès).
drop policy if exists "tlc member read own" on public.membres;
create policy "tlc member read own" on public.membres
  for select
  using ( lower(email) = lower(auth.jwt() ->> 'email') );

-- ============================================================
--  Voilà. La table "membres" pilote l'accès :
--  un membre voit les vidéos seulement si
--    statut = 'membre'  ET  actif = true  ET  acces_jusqu_au >= aujourd'hui.
--  Tu gères tout ça depuis la page "Gestion des membres" du site.
-- ============================================================
