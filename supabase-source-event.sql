-- ============================================================
--  TLC — Provenance des prospects (Site vs Page Event)
--  À COLLER dans : Supabase (projet "Site Web TLC" / vnyereucdquqkutgsddv)
--                  -> SQL Editor -> tout coller -> Run.  (Relançable sans danger.)
--  Prérequis : supabase-setup.sql + supabase-mailing-setup.sql déjà exécutés.
--
--  Ce que ça fait : la fonction add_prospect accepte désormais une "source"
--  (par défaut 'formulaire' = site). La page EVENT-ADS-VILLE l'appelle avec
--  source = 'event'. Rien à changer côté site : sans argument, c'est 'formulaire'.
-- ============================================================

-- Remplace l'ancienne add_prospect (5 args) par une version à 6 args (+ source).
drop function if exists public.add_prospect(text, text, text, text, text);

create or replace function public.add_prospect(
  p_email  text,
  p_nom    text default null,
  p_tel    text default null,
  p_prenom text default null,
  p_notes  text default null,
  p_source text default 'formulaire')
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
end;
$$;

-- Droits (la page publique appelle en tant que 'anon').
revoke all on function public.add_prospect(text, text, text, text, text, text) from public;
grant execute on function public.add_prospect(text, text, text, text, text, text) to anon, authenticated;

-- ============================================================
--  Après ce script :
--   • Site        -> add_prospect(...)                 => source = 'formulaire'
--   • Page event  -> add_prospect(..., p_source='event') => source = 'event'
--   • Admin gestion-membres : filtre "Site / Page event" + badge de provenance.
-- ============================================================
