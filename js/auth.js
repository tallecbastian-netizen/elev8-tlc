/* ============================================================
   TLCAuth — accès TLC (SANS code, tout par e-mail)
   • MEMBRE : tape son e-mail -> vérifié via la fonction Supabase
     acces_actif() (membre + actif + non expiré). Accès aux vidéos.
   • ADMIN  : tape son e-mail (doit être dans ADMIN_EMAILS) -> page de gestion.
     La gestion lit/écrit dans Supabase via des fonctions (synchro auto).
   Tant que Supabase n'est pas configuré -> "mode chantier" (tout ouvert).
============================================================ */
(function () {
  var CFG = window.TLC_CONFIG || {};
  var _client = null;
  var MKEY = "tlc_member";
  var AKEY = "tlc_admin";

  function configured() {
    return CFG.SUPABASE_URL && CFG.SUPABASE_URL.indexOf("VOTRE") < 0 &&
           CFG.SUPABASE_ANON_KEY && CFG.SUPABASE_ANON_KEY.indexOf("VOTRE") < 0;
  }
  function client() {
    if (_client) return _client;
    if (!configured() || !window.supabase) return null;
    _client = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);
    return _client;
  }
  function admins() {
    return (CFG.ADMIN_EMAILS || (CFG.ADMIN_EMAIL ? [CFG.ADMIN_EMAIL] : []))
      .map(function (e) { return (e || "").toLowerCase(); });
  }
  function today() { return new Date().toISOString().slice(0, 10); }
  function go(u) { location.replace(u); }

  /* ---------- MEMBRE ---------- */
  function setMember(email, until) {
    try { localStorage.setItem(MKEY, JSON.stringify({ email: (email || "").toLowerCase(), until: until || null })); } catch (e) {}
  }
  function memberSession() { try { return JSON.parse(localStorage.getItem(MKEY) || "null"); } catch (e) { return null; } }
  function memberLogout() { try { localStorage.removeItem(MKEY); } catch (e) {} }

  async function memberLogin(email) {
    email = (email || "").trim().toLowerCase();
    if (!configured()) { setMember(email, today()); return { active: true, until: null }; }
    var c = client(); if (!c) throw new Error("Connexion non configurée.");
    var r = await c.rpc("acces_actif", { p_email: email });
    if (r.error) throw r.error;
    var until = r.data || null;
    if (until) { setMember(email, until); return { active: true, until: until }; }
    memberLogout(); return { active: false };
  }

  /* ---------- ADMIN (e-mail seul) ---------- */
  function adminLogin(email) {
    email = (email || "").trim().toLowerCase();
    if (admins().indexOf(email) >= 0) { try { localStorage.setItem(AKEY, email); } catch (e) {} return true; }
    return false;
  }
  function adminSession() { try { return localStorage.getItem(AKEY); } catch (e) { return null; } }
  function adminLogout() { try { localStorage.removeItem(AKEY); } catch (e) {} }
  function isAdmin() { var e = adminSession(); return !!(e && admins().indexOf((e || "").toLowerCase()) >= 0); }

  /* ---------- Gardes de page ---------- */
  async function requireMember() {
    if (!configured()) return { role: "open" };
    if (isAdmin()) return { role: "admin", email: adminSession() };
    var s = memberSession();
    if (s && s.email) {
      try {
        var c = client();
        var r = await c.rpc("acces_actif", { p_email: s.email });
        if (!r.error && r.data) { setMember(s.email, r.data); return { role: "member", email: s.email, until: r.data }; }
      } catch (e) {}
      memberLogout();
    }
    go("connexion.html"); return null;
  }
  async function requireAdmin() {
    if (!configured()) return { role: "open" };
    if (isAdmin()) return { role: "admin", email: adminSession() };
    go("admin.html"); return null;
  }

  async function addProspect(email, nom, tel) {
    if (!configured()) return;
    var c = client(); if (!c) return;
    try { await c.rpc("add_prospect", { p_email: (email || "").toLowerCase(), p_nom: nom || null, p_tel: tel || null }); } catch (e) {}
  }

  function signOut() { memberLogout(); adminLogout(); }

  window.TLCAuth = {
    configured: configured, client: client, supabase: client, today: today, admins: admins,
    memberLogin: memberLogin, memberSession: memberSession, memberLogout: memberLogout,
    requireMember: requireMember, addProspect: addProspect,
    adminLogin: adminLogin, adminSession: adminSession, adminLogout: adminLogout, isAdmin: isAdmin,
    requireAdmin: requireAdmin, signOut: signOut
  };
})();
