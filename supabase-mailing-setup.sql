-- ============================================================
--  TLC — Mailing & capture prospects (ADDITIF à supabase-setup.sql)
--  À COLLER dans : Supabase (projet "Site Web TLC" / vnyereucdquqkutgsddv)
--                  -> SQL Editor -> tout coller -> Run.  (Relançable sans danger.)
--  Prérequis : supabase-setup.sql déjà exécuté (table public.membres + fonctions).
-- ============================================================

-- 1) Nouvelles colonnes
alter table public.membres add column if not exists prenom        text;
alter table public.membres add column if not exists mailing_optout boolean not null default false;
alter table public.membres add column if not exists unsub_token   uuid    not null default gen_random_uuid();

-- 2) add_prospect : accepte désormais prénom + notes (ajout auto depuis le quiz d'accueil)
drop function if exists public.add_prospect(text, text, text);
create or replace function public.add_prospect(
  p_email text, p_nom text default null, p_tel text default null,
  p_prenom text default null, p_notes text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.membres(email, nom, prenom, telephone, statut, source, notes)
  values (lower(p_email), p_nom, p_prenom, p_tel, 'prospect', 'formulaire', p_notes)
  on conflict (email) do update
    set prenom    = coalesce(excluded.prenom, public.membres.prenom),
        nom       = coalesce(excluded.nom, public.membres.nom),
        telephone = coalesce(excluded.telephone, public.membres.telephone);
end;
$$;

-- 3) membre_save : accepte désormais le prénom (édition manuelle dans l'admin)
drop function if exists public.membre_save(uuid, text, text, text, text, date, text, text);
create or replace function public.membre_save(
  p_id uuid, p_nom text, p_email text, p_tel text,
  p_statut text, p_paiement date, p_promo text, p_notes text,
  p_prenom text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if coalesce(lower(auth.jwt() ->> 'email'), '') not in ('tallecbastian.pro@gmail.com') then
    raise exception 'Accès refusé';
  end if;
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

-- 4) Désabonnement (public, par jeton) : appelé depuis desabonnement.html
create or replace function public.mailing_unsubscribe(p_token uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_found boolean;
begin
  update public.membres set mailing_optout = true where unsub_token = p_token;
  get diagnostics v_found = row_count;
  return v_found > 0;
end;
$$;

-- 5) Droits
revoke all on function public.add_prospect(text, text, text, text, text) from public;
grant execute on function public.add_prospect(text, text, text, text, text) to anon, authenticated;

revoke all on function public.membre_save(uuid, text, text, text, text, date, text, text, text) from public, anon;
grant execute on function public.membre_save(uuid, text, text, text, text, date, text, text, text) to authenticated;

revoke all on function public.mailing_unsubscribe(uuid) from public;
grant execute on function public.mailing_unsubscribe(uuid) to anon, authenticated;

-- ============================================================
--  Après ce script :
--   • Le quiz d'accueil enregistre chaque prospect (prénom, nom, email, tél).
--   • L'admin peut sélectionner des prospects et leur envoyer un email
--     (via l'Edge Function send-mailing) ou WhatsApp.
--   • Chaque email contient un lien de désabonnement (RGPD).
-- ============================================================
