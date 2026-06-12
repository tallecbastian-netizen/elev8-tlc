/* ============================================================
   TLCAuth — couche d'authentification (Supabase, code par e-mail).
   - Admin  : l'e-mail défini dans auth-config.js
   - Membre : tout e-mail invité dans Supabase (Auth → Users)
   Tant que Supabase n'est pas configuré, l'accès reste ouvert
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

  async function currentAccess() {
    var c = client();
    if (!c) return { role: null, reason: "config" };
    try {
      var res = await c.auth.getSession();
      var session = res.data && res.data.session;
      if (!session) return { role: null };
      var email = (session.user.email || "").toLowerCase();
      var admins = (CFG.ADMIN_EMAILS || (CFG.ADMIN_EMAIL ? [CFG.ADMIN_EMAIL] : [])).map(function (e) { return (e || "").toLowerCase(); });
      if (admins.indexOf(email) >= 0) return { role: "admin", email: email };
      return { role: "member", email: email };
    } catch (e) { return { role: null, reason: "error" }; }
  }

  function go(url) { location.replace(url); }

  // Protège une page « membre ». Renvoie l'accès, ou redirige vers la connexion.
  async function requireMember() {
    if (!configured()) return { role: "open" };           // mode chantier
    var a = await currentAccess();
    if (a.role === "member" || a.role === "admin") return a;
    go("connexion.html?next=espace-membre.html"); return null;
  }
  // Protège une page « admin ».
  async function requireAdmin() {
    if (!configured()) return { role: "open" };           // mode chantier
    var a = await currentAccess();
    if (a.role === "admin") return a;
    go("connexion.html?next=suivi-membres.html"); return null;
  }

  async function sendCode(email) {
    var c = client(); if (!c) throw new Error("Connexion non configurée.");
    var r = await c.auth.signInWithOtp({ email: email, options: { shouldCreateUser: false } });
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
    configured: configured, currentAccess: currentAccess,
    requireMember: requireMember, requireAdmin: requireAdmin,
    sendCode: sendCode, verifyCode: verifyCode, signOut: signOut
  };
})();
