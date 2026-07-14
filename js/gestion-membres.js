/* ============================================================
   Gestion des membres — Prospect -> Membre actif -> Membre inactif.
   Lecture/écriture Supabase via fonctions (list_membres / membre_save /
   membre_action) -> synchro automatique. Admin par e-mail seul.
   Catégorie calculée en direct depuis date_dernier_paiement (+28 j).
   + Sélection multiple -> Email groupé (Edge Function send-mailing / Brevo)
     et WhatsApp (message templé, export numéros, ouverture 1 par 1).
============================================================ */
(function () {
  var sb = null, rows = [], q = "", filt = "all", editing = null;
  var selected = {};          // id -> true (sélection pour email/WhatsApp)
  var waList = [], waPos = 0;  // file d'ouverture WhatsApp
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
    if (q && (((((m.prenom || "") + " " + (m.nom || "") + " " + (m.email || "") + " " + (m.promo || "")).toLowerCase()).indexOf(q)) < 0)) return false;
    var cat = category(m), dl = daysLeft(accessUntil(m));
    switch (filt) {
      case "site": return (m.source !== "event");
      case "event": return (m.source === "event");
      case "prospect": return cat === "prospect";
      case "actif": return cat === "actif";
      case "inactif": return cat === "inactif";
      case "bientot": return cat === "actif" && dl != null && dl <= 7;
      default: return true;
    }
  }

  function badge(n, l) { return '<span class="stat"><b>' + n + "</b> " + l + "</span>"; }

  /* ---------- Sélection ---------- */
  function selCount() { return Object.keys(selected).length; }
  function selRows() { return rows.filter(function (m) { return selected[m.id]; }); }
  function toggleSel(id, on) { if (on) selected[id] = true; else delete selected[id]; updateBulk(); syncCheckAll(); }
  function clearSel() { selected = {}; render(); }
  function updateBulk() {
    Object.keys(selected).forEach(function (id) { if (!find(id)) delete selected[id]; });
    var n = selCount();
    var bar = $("bulkbar"); if (bar) bar.style.display = n ? "flex" : "none";
    var c = $("sel-count"); if (c) c.textContent = n + " sélectionné(s)";
  }
  function syncCheckAll() {
    var ca = $("check-all"); if (!ca) return;
    var list = rows.filter(matches);
    var sv = list.filter(function (m) { return selected[m.id]; }).length;
    ca.checked = list.length > 0 && sv === list.length;
    ca.indeterminate = sv > 0 && sv < list.length;
  }

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

    if (!list.length) { $("rows").innerHTML = '<tr><td colspan="8" class="empty">Aucune fiche.</td></tr>'; }
    else { $("rows").innerHTML = list.map(rowHtml).join(""); }
    updateBulk();
    syncCheckAll();
  }

  function srcChip(m) {
    var isEv = (m.source === "event");
    var label = isEv ? "Event" : "Site";
    var st = isEv
      ? "background:rgba(24,227,158,.14);color:#18e39e;border:1px solid rgba(24,227,158,.4)"
      : "background:rgba(212,175,55,.14);color:#d4af37;border:1px solid rgba(212,175,55,.4)";
    return ' <span title="Provenance : ' + label + '" style="' + st +
      ';font-size:11px;font-weight:600;padding:2px 8px;border-radius:20px;white-space:nowrap;vertical-align:middle;display:inline-block">' +
      label + "</span>";
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

    var who = ((m.prenom || "") + " " + (m.nom || "")).trim() || "—";
    var optout = m.mailing_optout ? ' <span class="sub" title="Désabonné des emails">🚫</span>' : "";
    return "<tr>" +
      '<td class="selcol"><input type="checkbox" class="rowchk" data-sel="' + m.id + '"' + (selected[m.id] ? " checked" : "") + " /></td>" +
      "<td><b>" + esc(who) + "</b>" + srcChip(m) + optout + "<br><span class=\"sub\">" + esc(m.email) + (m.telephone ? " · " + esc(m.telephone) : "") + "</span></td>" +
      "<td>" + esc(m.promo || "—") + "</td>" +
      "<td>" + esc(m.date_dernier_paiement || "—") + "</td>" +
      "<td>" + esc(au || "—") + "</td>" +
      '<td><span class="badge ' + cls + '">' + state + "</span></td>" +
      '<td class="acts">' + gestion + "</td>" +
      '<td class="acts">' + wa + '<button class="act" data-edit="' + m.id + '">Éditer</button><button class="act" data-del="' + m.id + '">✕</button></td>' +
      "</tr>";
  }

  function intlTel(m) {
    var t = (m.telephone || "").replace(/[^0-9]/g, "");
    if (t.charAt(0) === "0") t = "33" + t.slice(1);
    return t;
  }
  function waLink(m) {
    var msg = "Salut " + (m.prenom || m.nom || "") + " ! Voici ton accès à l'espace membre TLC : https://tallecbastian-netizen.github.io/Landing-Page/connexion.html";
    return "https://wa.me/" + intlTel(m) + "?text=" + encodeURIComponent(msg);
  }

  // Applique un filtre et garde boutons "provenance" + menu déroulant synchronisés.
  function setFilter(val) {
    filt = val;
    var sel = $("filter");
    if (sel) sel.value = val;
    var btns = document.querySelectorAll(".segbtn[data-prov]");
    for (var i = 0; i < btns.length; i++) {
      btns[i].classList.toggle("is-active", btns[i].getAttribute("data-prov") === val);
    }
    render();
  }

  function bind() {
    $("search").addEventListener("input", function (e) { q = (e.target.value || "").toLowerCase().trim(); render(); });
    $("filter").addEventListener("change", function (e) { setFilter(e.target.value); });
    var provBtns = document.querySelectorAll(".segbtn[data-prov]");
    for (var i = 0; i < provBtns.length; i++) {
      provBtns[i].addEventListener("click", function () { setFilter(this.getAttribute("data-prov")); });
    }
    $("btn-add").addEventListener("click", function () { openModal(null); });
    $("btn-export").addEventListener("click", exportCsv);
    $("btn-cancel").addEventListener("click", closeModal);
    $("btn-save").addEventListener("click", save);
    $("btn-signout").addEventListener("click", function () { window.TLCAuth.signOut(); location.replace("index.html"); });
    $("rows").addEventListener("click", onRowClick);

    // Sélection multiple
    $("check-all").addEventListener("change", function (e) {
      var on = e.target.checked;
      rows.filter(matches).forEach(function (m) { if (on) selected[m.id] = true; else delete selected[m.id]; });
      render();
    });
    $("btn-clearsel").addEventListener("click", clearSel);

    // Email groupé
    $("btn-mail").addEventListener("click", openMail);
    $("mail-cancel").addEventListener("click", function () { $("mailmodal").style.display = "none"; });
    $("mail-send").addEventListener("click", sendMail);

    // WhatsApp
    $("btn-wa").addEventListener("click", openWa);
    $("wa-cancel").addEventListener("click", function () { $("wamodal").style.display = "none"; });
    $("wa-open").addEventListener("click", waOpenNext);
    $("wa-copy").addEventListener("click", waCopy);
    $("wa-export").addEventListener("click", waExport);
  }

  function onRowClick(e) {
    var t = e.target, id;
    if (t.classList.contains("rowchk")) { return toggleSel(t.getAttribute("data-sel"), t.checked); }
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
    $("m-prenom").value = m ? (m.prenom || "") : "";
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
      p_prenom: $("m-prenom").value.trim(),
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

  /* ---------- Email groupé (Edge Function send-mailing) ---------- */
  function openMail() {
    var dests = selRows().filter(function (m) { return m.email && !m.mailing_optout; });
    var optout = selRows().filter(function (m) { return m.mailing_optout; }).length;
    if (!dests.length) { alert("Aucun destinataire avec e-mail (et non désabonné) dans la sélection."); return; }
    $("mail-to").textContent = dests.length + " destinataire(s)" + (optout ? " · " + optout + " désabonné(s) ignoré(s)" : "");
    $("mail-result").textContent = "";
    $("mailmodal").style.display = "flex";
  }
  async function sendMail() {
    if (!sb) { alert("Supabase non configuré."); return; }
    var subject = ($("mail-subject").value || "").trim();
    var text = $("mail-body").value || "";
    if (!subject) { alert("Ajoute un objet."); return; }
    if (!text.trim()) { alert("Ajoute un message."); return; }
    var ids = selRows().filter(function (m) { return m.email && !m.mailing_optout; }).map(function (m) { return m.id; });
    if (!ids.length) { alert("Aucun destinataire."); return; }

    var btn = $("mail-send"), old = btn.textContent; btn.disabled = true; btn.textContent = "Envoi…";
    $("mail-result").innerHTML = "Envoi en cours…";
    try {
      var res = await sb.functions.invoke("send-mailing", { body: { subject: subject, text: text, ids: ids } });
      if (res.error) {
        $("mail-result").innerHTML = "<span style='color:var(--exp)'>Erreur : " + esc(res.error.message || String(res.error)) + "</span>";
      } else {
        var d = res.data || {};
        var sent = (d.envoyes != null) ? d.envoyes : ids.length;
        $("mail-result").innerHTML = "<span style='color:var(--ok)'>✓ " + sent + " email(s) envoyé(s)" +
          (d.erreurs ? " · " + d.erreurs + " erreur(s)" : "") + "</span>";
      }
    } catch (e) {
      $("mail-result").innerHTML = "<span style='color:var(--exp)'>Erreur : " + esc(e.message || String(e)) + "</span>";
    }
    btn.disabled = false; btn.textContent = old;
  }

  /* ---------- WhatsApp ---------- */
  function openWa() {
    var r = selRows().filter(function (m) { return m.telephone; });
    if (!r.length) { alert("Aucun numéro de téléphone dans la sélection."); return; }
    waList = r; waPos = 0;
    $("wa-to").textContent = r.length + " contact(s) avec numéro";
    updateWaHint();
    $("wamodal").style.display = "flex";
  }
  function updateWaHint() {
    var b = $("wa-open");
    if (waPos >= waList.length) { b.disabled = true; b.textContent = "Terminé"; $("wa-hint").textContent = "Tous les contacts ont été ouverts (" + waList.length + ")."; }
    else { b.disabled = false; b.textContent = "Ouvrir le suivant (" + (waPos + 1) + "/" + waList.length + ")"; }
  }
  function waMsgFor(m) { return ($("wa-msg").value || "").replace(/\{prenom\}/g, m.prenom || m.nom || ""); }
  function waOpenNext() {
    if (waPos >= waList.length) return;
    var m = waList[waPos++];
    window.open("https://wa.me/" + intlTel(m) + "?text=" + encodeURIComponent(waMsgFor(m)), "_blank");
    updateWaHint();
  }
  function waCopy() {
    var msg = $("wa-msg").value || "";
    if (navigator.clipboard) {
      navigator.clipboard.writeText(msg).then(
        function () { $("wa-hint").textContent = "Message copié ✓"; },
        function () { $("wa-hint").textContent = "Copie impossible (copie-le manuellement)."; }
      );
    } else { $("wa-hint").textContent = "Copie non supportée par ce navigateur."; }
  }
  function waExport() {
    var r = selRows().filter(function (m) { return m.telephone; });
    var lines = r.map(function (m) { return "+" + intlTel(m); });
    var blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "numeros-whatsapp-tlc.txt"; a.click();
    $("wa-hint").textContent = r.length + " numéro(s) exporté(s).";
  }

  function exportCsv() {
    var head = ["prenom", "nom", "email", "telephone", "statut", "promo", "date_dernier_paiement", "actif", "notes", "source", "mailing_optout"];
    var lines = [head.join(",")].concat(rows.map(function (m) {
      return head.map(function (k) { return '"' + String(m[k] == null ? "" : m[k]).replace(/"/g, '""') + '"'; }).join(",");
    }));
    var blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "membres-tlc.csv"; a.click();
  }

  if (document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init);
})();
