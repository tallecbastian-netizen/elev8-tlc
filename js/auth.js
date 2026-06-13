/* ============================================================
   TLCAuth — connexion + contrôle d'accès (Supabase, code par e-mail)
   - Admin  : e-mail listé dans auth-config.js (ADMIN_EMAILS) → accès total.
   - Membre : doit exister dans la table "membres" avec
              statut='membre', actif=true ET acces_jusqu_au >= aujourd'hui.
              Sinon → accès refusé (inactif/expiré).
   Tant que Supabase n'est pas configuré (placeholders), tout reste ouvert
   (mode chantier) pour ne pas te bloquer.
============================================================ */
(function () {
  var CFG = window.TLC_CONFIG || {};
  var _client = null;

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
  function today() { return new Date().toISOString().slice(0, 10); } // AAAA-MM-JJ

  async function sessionEmail() {
    var c = client(); if (!c) return null;
    try {
      var r = await c.auth.getSession();
      var s = r.data && r.data.session;
      return s ? (s.user.email || "").toLowerCase() : null;
    } catch (e) { return null; }
  }

  // { role:'open'|'admin'|'member'|'inactive'|null, email, until }
  async function currentAccess() {
    if (!configured()) return { role: "open" };
    var c = client(); if (!c) return { role: null, reason: "config" };
    var email = await sessionEmail();
    if (!email) return { role: null };
    if (admins().indexOf(email) >= 0) return { role: "admin", email: email };
    try {
      var q = await c.from("membres")
        .select("statut,actif,acces_jusqu_au")
        .eq("email", email).maybeSingle();
      if (q.error) return { role: "inactive", email: email, reason: "error" };
      var m = q.data;
      if (m && m.statut === "membre" && m.actif && m.acces_jusqu_au && m.acces_jusqu_au >= today()) {
        return { role: "member", email: email, until: m.acces_jusqu_au };
      }
      return { role: "inactive", email: email };
    } catch (e) { return { role: "inactive", email: email }; }
  }

  function go(u) { location.replace(u); }

  // Page "membre" (vidéos) : admin OU membre actif.
  async function requireMember() {
    if (!configured()) return { role: "open" };
    var a = await currentAccess();
    if (a.role === "admin" || a.role === "member") return a;
    if (a.role === "inactive") { go("connexion.html?reason=inactif"); return null; }
    go("connexion.html?next=espace-membre.html"); return null;
  }
  // Page "admin" (gestion des membres) : admin uniquement.
  async function requireAdmin() {
    if (!configured()) return { role: "open" };
    var a = await currentAccess();
    if (a.role === "admin") return a;
    if (a.role === "member" || a.role === "inactive") { go("espace-membre.html"); return null; }
    go("connexion.html?next=gestion-membres.html"); return null;
  }

  async function sendCode(email) {
    var c = client(); if (!c) throw new Error("Connexion non configurée.");
    // shouldCreateUser:true → un membre peut se connecter sans pré-inscription Auth ;
    // c'est la table "membres" qui décide de l'accès.
    var r = await c.auth.signInWithOtp({ email: email, options: { shouldCreateUser: true } });
    if (r.error) throw r.error;
  }
  async function verifyCode(email, token) {
    var c = client(); if (!c) throw new Error("Connexion non configurée.");
    var r = await c.auth.verifyOtp({ email: email, token: token, type: "email" });
    if (r.error) throw r.error;
    return await currentAccess();
  }
  async function signOut() { var c = client(); if (c) await c.auth.signOut(); }

  window.TLCAuth = {
    configured: configured, client: client, supabase: client, today: today,
    admins: admins, currentAccess: currentAccess,
    requireMember: requireMember, requireAdmin: requireAdmin,
    sendCode: sendCode, verifyCode: verifyCode, signOut: signOut
  };
})();
