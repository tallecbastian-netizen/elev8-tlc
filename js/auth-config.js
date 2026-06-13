/* ============================================================
   Configuration de la connexion (Supabase).
   👉 Remplace les 2 valeurs par celles de TON projet Supabase
      (voir GUIDE-CONNEXION-SUPABASE.md). Tant que ce sont les
      placeholders "VOTRE_...", la connexion est désactivée et les
      pages restent accessibles (mode chantier).
   ⚠️ La clé "anon" est PUBLIQUE : c'est normal qu'elle soit ici.
      Ne mets JAMAIS la clé "service_role" dans ce fichier.
============================================================ */
window.TLC_CONFIG = {
  // 👉 À remplir avec le projet Supabase de BASTIAN (Settings → API → API Keys).
  //    Tant que ce sont les placeholders, la connexion est désactivée
  //    et les pages restent accessibles (mode chantier) — aucun risque de blocage.
  SUPABASE_URL: "https://vnyereucdquqkutgsddv.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_PUx879zmrMAbCcsX7SaQsQ_dZ_MW2Eh",
  // Adresses qui ont accès au tableau de bord admin (suivi-membres).
  ADMIN_EMAILS: ["tallecbastian.pro@gmail.com"]
};
