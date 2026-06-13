/* ============================================================
   Gestion des membres — Prospect -> Membre actif -> Membre inactif.
   Lecture/écriture Supabase via fonctions (list_membres / membre_save /
   membre_action) -> synchro automatique. Admin par e-mail seul.
   Catégorie calculée en direct depuis date_dernier_paiement (+28 j).
============================================================ */
(function () {
  var sb = null, rows = [], q = "", filt = "all", editing = null;
  var $ = function (id) { return document.getElementById(id); };

  function today() { return new Date().toISOString().slice(0, 10); }
  function addDays(d, n) { var x = new Date(d + "T00:00:00"); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); }
  function daysLeft(d) { if (!d) return null; return Math.round((new Date(d + "T00:00:00") - new Date(today() + "T00:00:00")) / 86400000); }
  function accessUntil(m) { return m.date_dernier_paiement ? addDays(m.date_dernier_paiement, 28) : null; }
  function category(m) {
    if (m.statut !== "membre") return "prospect";
    var au = accessUntil(m);
    if (m.actif && au && au >= today()) return "actif";
    return "inactif";
  }
  function esc(s) { return (s == null ? "" : String(s)).replace(/[&<>"]/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]; }); }
  function notice(msg) { var n = $("notice"); if (!n) return; n.textContent = msg || ""; n.style.display = msg ? "block" : "none"; }

  async function init() {
    var access = await window.TLCAuth.requireAdmin();
    if (!access) return;
    var g = $("authgate"); if (g) g.style.display = "none";
    if (access.email) $("me").textContent = access.email;
    bind();
    if (!window.TLCAuth.configured()) {
      notice("Mode chantier : connecte ton Supabase + lance supabase-setup.sql pour gérer de vrais membres.");
      rows = []; render(); return;
    }
    sb = window.TLCAuth.supabase();
    await load();
  }

  async function load() {
    if (!sb) { rows = []; render(); return; }
    var r = await sb.rpc("list_membres");
    if (r.error) { notice("Erreur de lecture : " + r.error.message + " — as-tu (re)lancé supabase-setup.sql sur CE projet ?"); rows = []; }
    else { notice(""); rows = r.data || []; }
    render();
  }

  function matches(m) {
    if (q && ((((m.nom || "") + " " + (m.email || "") + " " + (m.promo || "")).toLowerCase()).indexOf(q) < 0)) return false;
    var cat = category(m), dl = daysLeft(accessUntil(m));
    switch (filt) {
      case "prospect": return cat === "prospect";
      case "actif": return cat === "actif";
      case "inactif": return cat === "inactif";
      case "bientot": return cat === "actif" && dl != null && dl <= 7;
      default: return true;
    }
  }

  function badge(n, l) { return '<span class="stat"><b>' + n + "</b> " + l + "</span>"; }

  function render() {
    var list = rows.filter(matches);
    var prospects = rows.filter(function (m) { return category(m) === "prospect"; });
    var actifs = rows.filter(function (m) { return category(m) === "actif"; });
    var inactifs = rows.filter(function (m) { return category(m) === "inactif"; });
    var bientot = actifs.filter(function (m) { var dl = daysLeft(accessUntil(m)); return dl != null && dl <= 7; });

    $("stats").innerHTML = badge(rows.length, "fiches") + badge(prospects.length, "prospects") +
      badge(actifs.length, "membres actifs") + badge(inactifs.length, "inactifs") + badge(bientot.length, "expirent &lt;7j");

    var rv = $("review");
    if (bientot.length || inactifs.length) {
      rv.style.display = "block";
      rv.innerHTML = "&#128197; Revue hebdo : <b>" + bientot.length + "</b> actif(s) expire(nt) sous 7 jours, <b>" + inactifs.length + "</b> inactif(s). Renouvelle (paiement +28j) ceux qui ont repayé.";
    } else rv.style.display = "none";

    if (!list.length) { $("rows").innerHTML = '<tr><td colspan="7" class="empty">Aucune fiche.</td></tr>'; return; }
    $("rows").innerHTML = list.map(rowHtml).join("");
  }

  function rowHtml(m) {
    var cat = category(m), au = accessUntil(m), dl = daysLeft(au), state, cls;
    if (cat === "prospect") { state = "Prospect"; cls = "s-prospect"; }
    else if (cat === "actif") { state = "Actif · " + dl + "j"; cls = (dl != null && dl <= 7) ? "s-soon" : "s-ok"; }
    else { state = m.date_dernier_paiement ? "Inactif · expiré" : "Inactif · non payé"; cls = "s-exp"; }
    if (m.statut === "membre" && !m.actif) { state = "Inactif · coupé"; cls = "s-exp"; }

    var wa = m.telephone ? '<a class="act" target="_blank" rel="noopener" href="' + waLink(m) + '">WhatsApp</a>' : "";
    var gestion;
    if (cat === "prospect") {
      gestion = '<button class="act gold" data-pay="' + m.id + '">&rarr; Membre + paiement (28j)</button>' +
                '<button class="act" data-tomembre="' + m.id + '">&rarr; Membre (sans paiement)</button>';
    } else if (cat === "actif") {
      gestion = '<button class="act gold" data-pay="' + m.id + '">Renouveler +28j</button>' +
                '<button class="act" data-off="' + m.id + '">Désactiver</button>';
    } else {
      gestion = '<button class="act gold" data-pay="' + m.id + '">Réactiver (+28j)</button>';
    }

    return "<tr>" +
      "<td><b>" + esc(m.nom || "—") + "</b><br><span class=\"sub\">" + esc(m.email) + (m.telephone ? " · " + esc(m.telephone) : "") + "</span></td>" +
      "<td>" + esc(m.promo || "—") + "</td>" +
      "<td>" + esc(m.date_dernier_paiement || "—") + "</td>" +
      "<td>" + esc(au || "—") + "</td>" +
      '<td><span class="badge ' + cls + '">' + state + "</span></td>" +
      '<td class="acts">' + gestion + "</td>" +
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
    $("btn-signout").addEventListener("click", function () { window.TLCAuth.signOut(); location.replace("index.html"); });
    $("rows").addEventListener("click", onRowClick);
  }

  function onRowClick(e) {
    var t = e.target, id;
    if ((id = t.getAttribute("data-pay"))) return doAction(id, "pay");
    if ((id = t.getAttribute("data-tomembre"))) return doAction(id, "to_member");
    if ((id = t.getAttribute("data-off"))) return doAction(id, "off");
    if ((id = t.getAttribute("data-edit"))) return openModal(find(id));
    if ((id = t.getAttribute("data-del"))) { if (confirm("Supprimer définitivement cette fiche ?")) return doAction(id, "delete"); }
  }
  function find(id) { for (var i = 0; i < rows.length; i++) if (rows[i].id === id) return rows[i]; return null; }

  async function doAction(id, action) {
    if (!sb) { notice("Connecte ton Supabase d'abord."); return; }
    var r = await sb.rpc("membre_action", { p_id: id, p_action: action });
    if (r.error) { alert(r.error.message); return; } await load();
  }

  function openModal(m) {
    editing = m;
    $("m-title").textContent = m ? "Modifier la fiche" : "Nouvelle fiche";
    $("m-nom").value = m ? (m.nom || "") : "";
    $("m-email").value = m ? (m.email || "") : "";
    $("m-tel").value = m ? (m.telephone || "") : "";
    $("m-statut").value = m ? (m.statut || "prospect") : "prospect";
    $("m-paiement").value = m ? (m.date_dernier_paiement || "") : "";
    $("m-promo").value = m ? (m.promo || "") : "";
    $("m-notes").value = m ? (m.notes || "") : "";
    $("modal").style.display = "flex";
  }
  function closeModal() { $("modal").style.display = "none"; editing = null; }

  async function save() {
    if (!sb) { notice("Connecte ton Supabase d'abord."); closeModal(); return; }
    var email = ($("m-email").value || "").trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { alert("E-mail invalide."); return; }
    var r = await sb.rpc("membre_save", {
      p_id: editing ? editing.id : null,
      p_nom: $("m-nom").value.trim(),
      p_email: email,
      p_tel: $("m-tel").value.trim(),
      p_statut: $("m-statut").value,
      p_paiement: ($("m-paiement").value || null),
      p_promo: $("m-promo").value.trim(),
      p_notes: $("m-notes").value.trim()
    });
    if (r.error) { alert(r.error.message); return; }
    closeModal(); await load();
  }

  function exportCsv() {
    var head = ["nom", "email", "telephone", "statut", "promo", "date_dernier_paiement", "actif", "notes", "source"];
    var lines = [head.join(",")].concat(rows.map(function (m) {
      return head.map(function (k) { return '"' + String(m[k] == null ? "" : m[k]).replace(/"/g, '""') + '"'; }).join(",");
    }));
    var blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "membres-tlc.csv"; a.click();
  }

  if (document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init);
})();
