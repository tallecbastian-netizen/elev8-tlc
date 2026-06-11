/* =============================================================
   Bastian Tallec — Interactions
   Vanilla JS, aucune dépendance. Chargé en "defer".
   ============================================================= */
(function () {
  "use strict";

  /* ---------- Menu mobile ---------- */
  var toggle = document.querySelector(".nav-toggle");
  var menu = document.getElementById("menu");

  function closeMenu() {
    if (!menu) return;
    menu.classList.remove("is-open");
    if (toggle) toggle.setAttribute("aria-expanded", "false");
  }

  if (toggle && menu) {
    toggle.addEventListener("click", function () {
      var open = menu.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });

    // Fermer après un clic sur un lien
    menu.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", closeMenu);
    });

    // Fermer avec la touche Échap
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeMenu();
    });

    // Fermer si clic en dehors du menu
    document.addEventListener("click", function (e) {
      if (!menu.contains(e.target) && !toggle.contains(e.target)) closeMenu();
    });
  }

  /* ---------- En-tête : état "scrolled" ---------- */
  var header = document.querySelector(".site-header");
  function onScroll() {
    if (!header) return;
    header.classList.toggle("scrolled", window.scrollY > 10);
  }
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---------- Apparition au défilement ---------- */
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && reveals.length) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    // Repli : tout afficher
    reveals.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* ---------- Année dynamique (pied de page) ---------- */
  var annee = document.getElementById("annee");
  if (annee) annee.textContent = new Date().getFullYear();
})();
