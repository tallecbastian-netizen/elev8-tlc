-- ============================================================
--  TLC — Base "membres" : Prospect -> Membre actif -> Membre inactif
--  Gestion depuis le site (sans code) -> écrit dans Supabase via fonctions.
--  À COLLER dans : Supabase (projet "Site Web TLC" / vnyereucdquqkutgsddv)
--                  -> SQL Editor -> New query -> tout coller -> Run.
--  ➜ Si tu l'avais déjà lancé : relance-le entièrement, c'est SANS danger
--    (create if not exists / create or replace / drop policy if exists).
-- ============================================================

-- 1) Table
create table if not exists public.membres (
  id                    uuid primary key default gen_random_uuid(),
  email                 text not null unique,
  nom                   text,
  telephone             text,
  statut                text not null default 'prospect' check (statut in ('prospect','membre')),
  promo                 text,
  date_dernier_paiement date,
  actif                 boolean not null default true,
  notes                 text,
  source                text,
  created_at            timestamptz not null default now()
);
alter table public.membres add column if not exists date_dernier_paiement date;
alter table public.membres add column if not exists source text;

-- 2) Email en minuscules
create or replace function public.tlc_lower_email() returns trigger as $$
begin new.email = lower(new.email); return new; end;
$$ language plpgsql;
drop trigger if exists trg_tlc_lower_email on public.membres;
create trigger trg_tlc_lower_email
  before insert or update on public.membres
  for each row execute function public.tlc_lower_email();

-- 3) RLS : table verrouillée. Tout passe par les fonctions ci-dessous.
alter table public.membres enable row level security;
drop policy if exists "tlc admin all" on public.membres;
create policy "tlc admin all" on public.membres
  for all
  using  ( lower(auth.jwt() ->> 'email') in ('tallecbastian.pro@gmail.com') )
  with check ( lower(auth.jwt() ->> 'email') in ('tallecbastian.pro@gmail.com') );
drop policy if exists "tlc member read own" on public.membres;

-- 4) MEMBRE : accès par e-mail -> renvoie la date de fin d'accès (paiement + 28 j) si ACTIF.
create or replace function public.acces_actif(p_email text)
returns date language sql security definer set search_path = public as $$
  select (date_dernier_paiement + 28)
    from public.membres
   where lower(email) = lower(p_email)
     and statut = 'membre' and actif = true
     and date_dernier_paiement is not null
     and (date_dernier_paiement + 28) >= current_date
   limit 1;
$$;

-- 5) PROSPECT : ajout auto après le formulaire Brevo.
create or replace function public.add_prospect(p_email text, p_nom text default null, p_tel text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.membres(email, nom, telephone, statut, source)
  values (lower(p_email), p_nom, p_tel, 'prospect', 'formulaire')
  on conflict (email) do nothing;
end;
$$;

-- 6) ADMIN (gestion sur le site, sans code) : lire / créer / modifier / agir / supprimer.
create or replace function public.list_membres()
returns setof public.membres language sql security definer set search_path = public as $$
  select * from public.membres order by created_at desc;
$$;

create or replace function public.membre_save(
  p_id uuid, p_nom text, p_email text, p_tel text,
  p_statut text, p_paiement date, p_promo text, p_notes text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if p_id is null then
    insert into public.membres(nom, email, telephone, statut, date_dernier_paiement, promo, notes, source)
    values (p_nom, lower(p_email), p_tel, coalesce(p_statut,'prospect'), p_paiement, p_promo, p_notes, 'manuel')
    returning id into v_id;
  else
    update public.membres set
      nom = p_nom, email = lower(p_email), telephone = p_tel,
      statut = coalesce(p_statut, statut), date_dernier_paiement = p_paiement,
      promo = p_promo, notes = p_notes
    where id = p_id returning id into v_id;
  end if;
  return v_id;
end;
$$;

create or replace function public.membre_action(p_id uuid, p_action text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_action = 'pay' then
    update public.membres set statut='membre', actif=true, date_dernier_paiement=current_date where id=p_id;
  elsif p_action = 'to_member' then
    update public.membres set statut='membre' where id=p_id;
  elsif p_action = 'off' then
    update public.membres set actif=false where id=p_id;
  elsif p_action = 'delete' then
    delete from public.membres where id=p_id;
  end if;
end;
$$;

-- Droits : appelables par le site (clé publique).
revoke all on function public.acces_actif(text) from public;
revoke all on function public.add_prospect(text, text, text) from public;
revoke all on function public.list_membres() from public;
revoke all on function public.membre_save(uuid, text, text, text, text, date, text, text) from public;
revoke all on function public.membre_action(uuid, text) from public;
grant execute on function public.acces_actif(text) to anon, authenticated;
grant execute on function public.add_prospect(text, text, text) to anon, authenticated;
grant execute on function public.list_membres() to anon, authenticated;
grant execute on function public.membre_save(uuid, text, text, text, text, date, text, text) to anon, authenticated;
grant execute on function public.membre_action(uuid, text) to anon, authenticated;

-- ============================================================
--  Fait. Le site ajoute les prospects tout seul et tu gères tout
--  (prospect -> membre + paiement, renouveler +28j, désactiver)
--  depuis la page "Gestion des membres", synchro direct avec Supabase.
-- ============================================================
