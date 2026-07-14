// ============================================================
//  Edge Function : send-mailing
//  Envoi d'emails groupés aux prospects sélectionnés, via l'API Brevo.
//  - Vérifie que l'appelant est un admin (JWT Supabase + liste ADMIN_EMAILS).
//  - Lit les destinataires en service_role (bypass RLS), ignore les désabonnés.
//  - Personnalise {prenom} + ajoute un lien de désabonnement (RGPD).
//
//  Secrets à définir (Supabase -> Edge Functions -> Secrets) :
//    BREVO_API_KEY, BREVO_SENDER_EMAIL, BREVO_SENDER_NAME (optionnel),
//    ADMIN_EMAILS (optionnel, séparés par des virgules), SITE_URL (optionnel).
//  SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY sont fournis
//  automatiquement par Supabase.
// ============================================================
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function esc(s: unknown) {
  return String(s ?? "").replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" } as Record<string, string>)[c]);
}
function nl2br(s: string) { return esc(s).replace(/\n/g, "<br>"); }

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
    const SENDER_EMAIL = Deno.env.get("BREVO_SENDER_EMAIL");
    const SENDER_NAME = Deno.env.get("BREVO_SENDER_NAME") || "Elev8 TLC";
    const SITE_URL = (Deno.env.get("SITE_URL") || "https://elev8-tlc.vercel.app").replace(/\/+$/, "");
    const ADMIN_EMAILS = (Deno.env.get("ADMIN_EMAILS") || "tallecbastian.pro@gmail.com")
      .toLowerCase().split(",").map((s) => s.trim()).filter(Boolean);

    // 1) Authentifier l'appelant et vérifier qu'il est admin
    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: udata, error: uerr } = await userClient.auth.getUser();
    const email = udata?.user?.email?.toLowerCase();
    if (uerr || !email || !ADMIN_EMAILS.includes(email)) {
      return json({ error: "Accès refusé (admin uniquement)." }, 403);
    }

    if (!BREVO_API_KEY || !SENDER_EMAIL) {
      return json({ error: "Config Brevo manquante (BREVO_API_KEY / BREVO_SENDER_EMAIL)." }, 500);
    }

    // 2) Lire la requête
    const body = await req.json().catch(() => ({}));
    const subject = String(body.subject || "").trim();
    const text = String(body.text || "");
    const html = body.html ? String(body.html) : null;
    const ids: string[] = Array.isArray(body.ids) ? body.ids : [];
    if (!subject || (!text && !html) || !ids.length) {
      return json({ error: "subject, text (ou html) et ids requis." }, 400);
    }

    // 3) Charger les destinataires (service_role -> bypass RLS)
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: membres, error: merr } = await admin
      .from("membres")
      .select("email, prenom, nom, unsub_token, mailing_optout")
      .in("id", ids);
    if (merr) return json({ error: merr.message }, 500);

    const dests = (membres || []).filter((m) => m.email && !m.mailing_optout);
    const ignores = (membres || []).length - dests.length;
    if (!dests.length) return json({ envoyes: 0, ignores_optout: ignores, erreurs: 0 });

    // 4) Construire une version personnalisée par destinataire
    function bodyHtml(m: any) {
      const prenom = m.prenom || m.nom || "";
      const base = html
        ? html.replace(/\{prenom\}/g, esc(prenom))
        : nl2br(text.replace(/\{prenom\}/g, prenom));
      const unsub = `${SITE_URL}/desabonnement.html?t=${m.unsub_token}`;
      const footer =
        `<hr style="border:none;border-top:1px solid #ddd;margin:24px 0">` +
        `<p style="font-size:12px;color:#888">Tu reçois cet e-mail car tu t'es inscrit(e) sur Elev8 TLC. ` +
        `<a href="${unsub}" style="color:#888">Se désabonner</a>.</p>`;
      return `<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;color:#222;line-height:1.5;padding:8px">${base}${footer}</body></html>`;
    }

    const versions = dests.map((m) => ({
      to: [{ email: m.email, name: (`${m.prenom || ""} ${m.nom || ""}`).trim() || m.email }],
      htmlContent: bodyHtml(m),
    }));

    // 5) Envoyer via Brevo, par lots de 1000 versions
    let envoyes = 0, erreurs = 0;
    const details: string[] = [];
    for (let i = 0; i < versions.length; i += 1000) {
      const chunk = versions.slice(i, i + 1000);
      const payload = {
        sender: { email: SENDER_EMAIL, name: SENDER_NAME },
        subject,
        htmlContent: "<html><body></body></html>", // défaut, écrasé par chaque version
        messageVersions: chunk,
      };
      const resp = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: { "api-key": BREVO_API_KEY, "Content-Type": "application/json", "accept": "application/json" },
        body: JSON.stringify(payload),
      });
      if (resp.ok) envoyes += chunk.length;
      else { erreurs += chunk.length; details.push(`HTTP ${resp.status}: ${(await resp.text()).slice(0, 200)}`); }
    }

    return json({ envoyes, ignores_optout: ignores, erreurs, details });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
