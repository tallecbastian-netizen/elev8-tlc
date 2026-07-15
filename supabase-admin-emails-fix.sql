-- ============================================================
--  TLC — Une seule liste d'admins pour toute la base
--  À COLLER dans : Supabase (projet "Site Web TLC" / vnyereucdquqkutgsddv)
--                  -> SQL Editor -> tout coller -> Run.  (Relançable sans danger.)
--
--  LE PROBLÈME QUE ÇA CORRIGE
--  js/auth-config.js autorise DEUX adresses admin :
--      tallecbastian.pro@gmail.com  et  bastian@elev8-tlc.com
--  ...mais la base n'en autorisait qu'UNE. Résultat : connecté avec la 2e, la
--  page laissait entrer (c'est le JavaScript qui décide) et Postgres refusait
--  d'écrire -> "new row violates row-level security policy for table events".
--
--  LA CORRECTION
--  La liste ne vit plus qu'à UN endroit dans la base : est_admin().
--  La policy et toutes les fonctions admin l'appellent. Pour ajouter ou retirer
--  un admin plus tard, il n'y a QUE est_admin() à modifier (+ auth-config.js).
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1) La source de vérité
-- ─────────────────────────────────────────────────────────────
-- 👉 LES MÊMES ADRESSES QUE ADMIN_EMAILS dans js/auth-config.js.
create or replace function public.est_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(lower(auth.jwt() ->> 'email'), '') in (
    'tallecbastian.pro@gmail.com',
    'bastian@elev8-tlc.com'
  );
$$;

grant execute on function public.est_admin() to authenticated, anon;

-- ─────────────────────────────────────────────────────────────
-- 2) events : la policy qui bloquait la création
-- ─────────────────────────────────────────────────────────────
-- L'ancienne n'avait qu'un USING. Pour un INSERT, Postgres applique le WITH
-- CHECK : on écrit les deux explicitement, plus de comportement implicite.
drop policy if exists "admin_write_events" on public.events;
create policy "admin_write_events" on public.events
  for all
  using (public.est_admin())
  with check (public.est_admin());

-- La lecture publique reste ouverte : la page pub lit l'event avec la clé anon.
drop policy if exists "public_read_events" on public.events;
create policy "public_read_events" on public.events
  for select using (true);

alter table public.events enable row level security;

-- ─────────────────────────────────────────────────────────────
-- 3) Les fonctions admin : même contrôle partout
-- ─────────────────────────────────────────────────────────────
-- Corps identiques à supabase-setup.sql / supabase-mailing-setup.sql.
-- Seule la ligne de contrôle d'accès change.

create or replace function public.list_membres()
returns setof public.membres language plpgsql security definer set search_path = public as $$
begin
  if not public.est_admin() then raise exception 'Accès refusé'; end if;
  return query select * from public.membres order by created_at desc;
end;
$$;

create or replace function public.membre_save(
  p_id uuid, p_nom text, p_email text, p_tel text,
  p_statut text, p_paiement date, p_promo text, p_notes text,
  p_prenom text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not public.est_admin() then raise exception 'Accès refusé'; end if;
  if p_id is null then
    insert into public.membres(nom, prenom, email, telephone, statut, date_dernier_paiement, promo, notes, source)
    values (p_nom, p_prenom, lower(p_email), p_tel, coalesce(p_statut,'prospect'), p_paiement, p_promo, p_notes, 'manuel')
    returning id into v_id;
  else
    update public.membres set
      nom = p_nom, prenom = p_prenom, email = lower(p_email), telephone = p_tel,
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
  if not public.est_admin() then raise exception 'Accès refusé'; end if;
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

-- ─────────────────────────────────────────────────────────────
-- 4) Droits (inchangés — rappelés ici pour que le script soit autonome)
-- ─────────────────────────────────────────────────────────────
revoke all on function public.list_membres() from public, anon;
revoke all on function public.membre_action(uuid, text) from public, anon;
revoke all on function public.membre_save(uuid, text, text, text, text, date, text, text, text) from public, anon;
revoke all on function public.list_inscriptions_events() from public, anon;

grant execute on function public.list_membres() to authenticated;
grant execute on function public.membre_action(uuid, text) to authenticated;
grant execute on function public.membre_save(uuid, text, text, text, text, date, text, text, text) to authenticated;
grant execute on function public.list_inscriptions_events() to authenticated;

-- ============================================================
--  ⚠️ IL RESTE UN 4e ENDROIT, HORS SQL : l'envoi d'emails groupés.
--  L'Edge Function send-mailing lit la liste dans une variable
--  d'environnement, et retombe sur tallecbastian.pro@gmail.com si elle est
--  absente. Donc "✉️ Email groupé" refuserait encore bastian@elev8-tlc.com.
--
--  À faire une fois dans Supabase :
--    Edge Functions -> send-mailing -> Secrets / Environment variables
--    ADMIN_EMAILS = tallecbastian.pro@gmail.com,bastian@elev8-tlc.com
-- ============================================================
