/* ============================================================
   Gestion des membres — pilote l'accès 28 jours (Supabase).
   Lit/écrit la table "membres" (voir supabase-setup.sql).
   Accès réservé à l'admin (TLCAuth.requireAdmin).
============================================================ */
(function () {
  var sb = null, rows = [], q = "", filt = "all", editing = null;
  var $ = function (id) { return document.getElementById(id); };

  function today() { return new Date().toISOString().slice(0, 10); }
  function addDays(d, n) { var x = new Date(d + "T00:00:00"); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); }
  function daysLeft(d) { if (!d) return null; return Math.round((new Date(d + "T00:00:00") - new Date(today() + "T00:00:00")) / 86400000); }
  function esc(s) { return (s == null ? "" : String(s)).replace(/[&<>"]/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]; }); }
  function notice(msg) { var n = $("notice"); if (!n) return; n.textContent = msg || ""; n.style.display = msg ? "block" : "none"; }

  async function init() {
    var access = await window.TLCAuth.requireAdmin();
    if (!access) return;                       // redirection en cours (non-admin)
    var g = $("authgate"); if (g) g.style.display = "none";
    if (access.email) $("me").textContent = access.email;
    bind();
    if (!window.TLCAuth.configured()) {
      notice("Mode chantier : connecte ton Supabase (colle l'URL + la clé dans js/auth-config.js, puis lance supabase-setup.sql) pour gérer de vrais membres. L'interface ci-dessous est une démo.");
      rows = []; render(); return;
    }
    sb = window.TLCAuth.supabase();
    await load();
  }

  async function load() {
    if (!sb) { rows = []; render(); return; }
    var r = await sb.from("membres").select("*").order("created_at", { ascending: false });
    if (r.error) { notice("Erreur de lecture : " + r.error.message + " — as-tu bien lancé supabase-setup.sql sur CE projet ?"); rows = []; }
    else { notice(""); rows = r.data || []; }
    render();
  }

  function matches(m) {
    if (q) { if ((((m.nom || "") + " " + (m.email || "") + " " + (m.promo || "")).toLowerCase()).indexOf(q) < 0) return false; }
    var dl = daysLeft(m.acces_jusqu_au);
    switch (filt) {
      case "prospect": return m.statut === "prospect";
      case "membre": return m.statut === "membre";
      case "actif": return m.statut === "membre" && m.actif && dl != null && dl >= 0;
      case "bientot": return m.statut === "membre" && m.actif && dl != null && dl >= 0 && dl <= 7;
      case "expire": return m.statut === "membre" && (!m.actif || (dl != null && dl < 0));
      default: return true;
    }
  }

  function badge(n, l) { return '<span class="stat"><b>' + n + "</b> " + l + "</span>"; }

  function render() {
    var list = rows.filter(matches);
    var membres = rows.filter(function (m) { return m.statut === "membre"; });
    var actifs = membres.filter(function (m) { var dl = daysLeft(m.acces_jusqu_au); return m.actif && dl != null && dl >= 0; });
    var bientot = actifs.filter(function (m) { return daysLeft(m.acces_jusqu_au) <= 7; });
    var expires = membres.filter(function (m) { var dl = daysLeft(m.acces_jusqu_au); return !m.actif || (dl != null && dl < 0); });

    $("stats").innerHTML = badge(rows.length, "fiches") + badge(membres.length, "membres") +
      badge(actifs.length, "actifs") + badge(bientot.length, "expirent &lt;7j") + badge(expires.length, "expirés");

    var rv = $("review");
    if (bientot.length || expires.length) {
      rv.style.display = "block";
      rv.innerHTML = "&#128197; Revue hebdo : <b>" + bientot.length + "</b> expire(nt) sous 7 jours, <b>" + expires.length + "</b> expiré(s). Renouvelle ceux que tu gardes (bouton « Renouveler +28j »).";
    } else rv.style.display = "none";

    if (!list.length) { $("rows").innerHTML = '<tr><td colspan="7" class="empty">Aucune fiche.</td></tr>'; return; }
    $("rows").innerHTML = list.map(rowHtml).join("");
  }

  function rowHtml(m) {
    var dl = daysLeft(m.acces_jusqu_au), state, cls;
    if (m.statut !== "membre") { state = "Prospect"; cls = "s-prospect"; }
    else if (!m.actif) { state = "Désactivé"; cls = "s-off"; }
    else if (dl == null) { state = "Sans date"; cls = "s-off"; }
    else if (dl < 0) { state = "Expiré (" + (-dl) + "j)"; cls = "s-exp"; }
    else if (dl <= 7) { state = dl + " j restants"; cls = "s-soon"; }
    else { state = dl + " j restants"; cls = "s-ok"; }

    var wa = m.telephone ? '<a class="act" target="_blank" rel="noopener" href="' + waLink(m) + '">WhatsApp</a>' : "";
    var cycle = m.statut === "membre"
      ? '<button class="act gold" data-renew="' + m.id + '">Renouveler +28j</button>' +
        (m.actif ? '<button class="act" data-off="' + m.id + '">Désactiver</button>'
                 : '<button class="act" data-on="' + m.id + '">Réactiver</button>')
      : '<button class="act gold" data-activate="' + m.id + '">&rarr; Membre (28j)</button>';

    return "<tr>" +
      "<td><b>" + esc(m.nom || "—") + "</b><br><span class=\"sub\">" + esc(m.email) + "</span></td>" +
      "<td>" + esc(m.promo || "—") + "</td>" +
      "<td>" + esc(m.date_activation || "—") + "</td>" +
      "<td>" + esc(m.acces_jusqu_au || "—") + "</td>" +
      '<td><span class="badge ' + cls + '">' + state + "</span></td>" +
      '<td class="acts">' + cycle + "</td>" +
      '<td class="acts">' + wa + '<button class="act" data-edit="' + m.id + '">Éditer</button><button class="act" data-del="' + m.id + '">✕</button></td>' +
      "</tr>";
  }

  function waLink(m) {
    var tel = (m.telephone || "").replace(/[^0-9]/g, "");
    if (tel.charAt(0) === "0") tel = "33" + tel.slice(1);
    var msg = "Salut " + (m.nom || "") + " ! Voici ton accès à l'espace membre TLC : https://tallecbastian-netizen.github.io/Landing-Page/connexion.html";
    return "https://wa.me/" + tel + "?text=" + encodeURIComponent(msg);
  }

  function bind() {
    $("search").addEventListener("input", function (e) { q = (e.target.value || "").toLowerCase().trim(); render(); });
    $("filter").addEventListener("change", function (e) { filt = e.target.value; render(); });
    $("btn-add").addEventListener("click", function () { openModal(null); });
    $("btn-export").addEventListener("click", exportCsv);
    $("btn-cancel").addEventListener("click", closeModal);
    $("btn-save").addEventListener("click", save);
    $("btn-signout").addEventListener("click", async function () { await window.TLCAuth.signOut(); location.replace("index.html"); });
    $("rows").addEventListener("click", onRowClick);
  }

  function onRowClick(e) {
    var t = e.target, id;
    if ((id = t.getAttribute("data-activate"))) return doUpdate(id, { statut: "membre", actif: true, date_activation: today(), acces_jusqu_au: addDays(today(), 28) });
    if ((id = t.getAttribute("data-renew"))) return doUpdate(id, { actif: true, acces_jusqu_au: addDays(today(), 28) });
    if ((id = t.getAttribute("data-off"))) return doUpdate(id, { actif: false });
    if ((id = t.getAttribute("data-on"))) return doUpdate(id, { actif: true });
    if ((id = t.getAttribute("data-edit"))) return openModal(find(id));
    if ((id = t.getAttribute("data-del"))) { if (confirm("Supprimer définitivement cette fiche ?")) return doDelete(id); }
  }
  function find(id) { for (var i = 0; i < rows.length; i++) if (rows[i].id === id) return rows[i]; return null; }

  async function doUpdate(id, patch) {
    if (!sb) { notice("Connecte ton Supabase d'abord."); return; }
    var r = await sb.from("membres").update(patch).eq("id", id);
    if (r.error) { alert(r.error.message); return; } await load();
  }
  async function doDelete(id) {
    if (!sb) { notice("Connecte ton Supabase d'abord."); return; }
    var r = await sb.from("membres").delete().eq("id", id);
    if (r.error) { alert(r.error.message); return; } await load();
  }

  function openModal(m) {
    editing = m;
    $("m-title").textContent = m ? "Modifier la fiche" : "Nouvelle fiche";
    $("m-nom").value = m ? (m.nom || "") : "";
    $("m-email").value = m ? (m.email || "") : "";
    $("m-tel").value = m ? (m.telephone || "") : "";
    $("m-statut").value = m ? (m.statut || "prospect") : "prospect";
    $("m-promo").value = m ? (m.promo || "") : "";
    $("m-notes").value = m ? (m.notes || "") : "";
    $("modal").style.display = "flex";
  }
  function closeModal() { $("modal").style.display = "none"; editing = null; }

  async function save() {
    if (!sb) { notice("Connecte ton Supabase d'abord."); closeModal(); return; }
    var email = ($("m-email").value || "").trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { alert("E-mail invalide."); return; }
    var data = {
      nom: $("m-nom").value.trim(), email: email, telephone: $("m-tel").value.trim(),
      statut: $("m-statut").value, promo: $("m-promo").value.trim(), notes: $("m-notes").value.trim()
    };
    var r = editing ? await sb.from("membres").update(data).eq("id", editing.id)
                    : await sb.from("membres").insert(data);
    if (r.error) { alert(r.error.message); return; }
    closeModal(); await load();
  }

  function exportCsv() {
    var head = ["nom", "email", "telephone", "statut", "promo", "date_activation", "acces_jusqu_au", "actif", "notes"];
    var lines = [head.join(",")].concat(rows.map(function (m) {
      return head.map(function (k) { return '"' + String(m[k] == null ? "" : m[k]).replace(/"/g, '""') + '"'; }).join(",");
    }));
    var blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "membres-tlc.csv"; a.click();
  }

  if (document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init);
})();
