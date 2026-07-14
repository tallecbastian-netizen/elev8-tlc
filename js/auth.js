/* ============================================================
   TLCAuth — accès TLC
   • MEMBRE : e-mail seul -> fonction acces_actif() (membre + actif + non expiré).
   • ADMIN  : e-mail + MOT DE PASSE vérifié par Supabase (vraie connexion).
             Une fois connecté, lui seul peut lire/gérer la base.
   Tant que Supabase n'est pas configuré -> "mode chantier" (tout ouvert).
============================================================ */
(function () {
  var CFG = window.TLC_CONFIG || {};
  var _client = null;
  var MKEY = "tlc_member";

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
  function isAdminEmail(e) { return admins().indexOf((e || "").toLowerCase()) >= 0; }
  function today() { return new Date().toISOString().slice(0, 10); }
  function go(u) { location.replace(u); }

  /* ---------- MEMBRE (e-mail seul) ---------- */
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

  /* ---------- ADMIN (e-mail + mot de passe Supabase) ---------- */
  async function sessionEmail() {
    var c = client(); if (!c) return null;
    try { var r = await c.auth.getSession(); var s = r.data && r.data.session; return s ? (s.user.email || "").toLowerCase() : null; }
    catch (e) { return null; }
  }
  async function currentAccess() {
    if (!configured()) return { role: "open" };
    var email = await sessionEmail();
    if (!email) return { role: null };
    if (isAdminEmail(email)) return { role: "admin", email: email };
    return { role: "authed", email: email };
  }
  async function adminSignIn(email, password) {
    email = (email || "").trim().toLowerCase();
    var c = client(); if (!c) throw new Error("Connexion non configurée.");
    if (!isAdminEmail(email)) throw new Error("Cette adresse n'est pas administratrice.");
    var r = await c.auth.signInWithPassword({ email: email, password: password });
    if (r.error) throw r.error;
    return true;
  }

  /* ---------- Gardes de page ---------- */
  async function requireMember() {
    if (!configured()) return { role: "open" };
    var a = await currentAccess();
    if (a.role === "admin") return a;
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
    var a = await currentAccess();
    if (a.role === "admin") return a;
    go("connexion.html?admin=1"); return null;
  }

  /* ---------- Lien magique (OTP e-mail) ---------- */
  async function sendCode(email, redirectTo) {
    email = (email || "").trim().toLowerCase();
    if (!configured()) {
      // Mode chantier : accès direct sans envoi d'e-mail
      await memberLogin(email);
      return { dev: true };
    }
    var c = client(); if (!c) throw new Error("Connexion non configurée.");
    var dest = redirectTo ||
      (typeof window !== "undefined"
        ? window.location.origin + window.location.pathname
        : "");
    var r = await c.auth.signInWithOtp({
      email: email,
      options: { emailRedirectTo: dest }
    });
    if (r.error) throw r.error;
    return { sent: true };
  }

  async function addProspect(email, nom, tel, prenom, notes) {
    if (!configured()) return;
    var c = client(); if (!c) return;
    try {
      await c.rpc("add_prospect", {
        p_email: (email || "").toLowerCase(), p_nom: nom || null, p_tel: tel || null,
        p_prenom: prenom || null, p_notes: notes || null
      });
    } catch (e) {}
  }

  async function signOut() {
    var c = client();
    if (c) { try { await c.auth.signOut(); } catch (e) {} }
    memberLogout();
  }

  window.TLCAuth = {
    configured: configured, client: client, supabase: client, today: today,
    admins: admins, isAdminEmail: isAdminEmail,
    memberLogin: memberLogin, memberSession: memberSession, memberLogout: memberLogout,
    requireMember: requireMember, addProspect: addProspect,
    currentAccess: currentAccess, adminSignIn: adminSignIn,
    requireAdmin: requireAdmin, signOut: signOut, sendCode: sendCode
  };
})();
