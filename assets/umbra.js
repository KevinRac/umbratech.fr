/* Umbratech · comportements de la page d'accueil (aucune dépendance, ~3 Ko).
   Tout est optionnel : sans JavaScript, la page est complète et lisible.
   - header : fond flouté dès qu'on défile
   - [data-reveal] : apparition au défilement
   - .ut-loop : la ligne de la descente se dessine
   - [data-count] : compteurs
   - .ut-scene : la lumière suit le pointeur (lanterne)
   - a.ut-card : lumière et inclinaison légère au survol
   - #journal : dernières versions de La Brume, lues dans themist/data/versions.js
   Mouvements réduits : rien ne bouge, tout est affiché. */
(() => {
  const doc = document.documentElement;
  const calme = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const pointeurFin = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const io = "IntersectionObserver" in window;

  /* Header */
  const header = document.querySelector(".ut-header");
  if (header) {
    const maj = () => header.classList.toggle("is-scrolled", scrollY > 8);
    maj();
    addEventListener("scroll", maj, { passive: true });
  }

  /* Révélations */
  const reveals = document.querySelectorAll("[data-reveal]");
  if (!io || calme) reveals.forEach((el) => el.classList.add("is-in"));
  else {
    const obs = new IntersectionObserver((entrees) => {
      for (const e of entrees) if (e.isIntersecting) { e.target.classList.add("is-in"); obs.unobserve(e.target); }
    }, { rootMargin: "0px 0px -10% 0px", threshold: 0.12 });
    reveals.forEach((el) => obs.observe(el));
  }

  /* Ligne de la descente : se dessine en suivant le défilement */
  const loop = document.querySelector(".ut-loop-wrap");
  if (loop && !calme) {
    let rafL = 0;
    const dessin = () => {
      rafL = 0;
      const r = loop.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (innerHeight * 0.85 - r.top) / (innerHeight * 0.5)));
      loop.style.setProperty("--draw", p.toFixed(3));
    };
    dessin();
    addEventListener("scroll", () => { if (!rafL) rafL = requestAnimationFrame(dessin); }, { passive: true });
  }

  /* Compteurs */
  const fmt = new Intl.NumberFormat("fr-FR");
  const compter = (el) => {
    const fin = Number(el.dataset.count);
    if (!Number.isFinite(fin) || calme) return;
    const t0 = performance.now(), duree = 1200;
    const pas = (t) => {
      const k = Math.min(1, (t - t0) / duree), e = 1 - Math.pow(1 - k, 4);
      el.textContent = fmt.format(Math.round(fin * e));
      if (k < 1) requestAnimationFrame(pas);
    };
    el.textContent = "0";
    requestAnimationFrame(pas);
  };
  const compteurs = document.querySelectorAll("[data-count]");
  if (io && !calme) {
    const obsC = new IntersectionObserver((entrees) => {
      for (const e of entrees) if (e.isIntersecting) { compter(e.target); obsC.unobserve(e.target); }
    }, { threshold: 0.6 });
    compteurs.forEach((el) => obsC.observe(el));
  }

  /* Lanterne : la lumière suit le pointeur, puis revient à la lanterne */
  const scene = document.querySelector(".ut-scene");
  if (scene && pointeurFin && !calme) {
    const repos = { x: parseFloat(getComputedStyle(scene).getPropertyValue("--lx")) || 34, y: parseFloat(getComputedStyle(scene).getPropertyValue("--ly")) || 88 };
    const cur = { ...repos }, cible = { ...repos };
    let raf = 0;
    const anime = () => {
      cur.x += (cible.x - cur.x) * 0.12;
      cur.y += (cible.y - cur.y) * 0.12;
      scene.style.setProperty("--lx", cur.x.toFixed(2) + "%");
      scene.style.setProperty("--ly", cur.y.toFixed(2) + "%");
      raf = Math.abs(cible.x - cur.x) + Math.abs(cible.y - cur.y) > 0.05 ? requestAnimationFrame(anime) : 0;
    };
    const lance = () => { if (!raf) raf = requestAnimationFrame(anime); };
    scene.addEventListener("pointermove", (ev) => {
      const r = scene.getBoundingClientRect();
      cible.x = ((ev.clientX - r.left) / r.width) * 100;
      cible.y = ((ev.clientY - r.top) / r.height) * 100;
      lance();
    });
    scene.addEventListener("pointerleave", () => { cible.x = repos.x; cible.y = repos.y; lance(); });
  }

  /* Cartes : lumière au pointeur et inclinaison très légère (≤ 1,5°) */
  if (pointeurFin) {
    document.querySelectorAll("a.ut-card").forEach((card) => {
      card.addEventListener("pointermove", (ev) => {
        const r = card.getBoundingClientRect();
        const x = (ev.clientX - r.left) / r.width, y = (ev.clientY - r.top) / r.height;
        card.style.setProperty("--mx", (x * 100).toFixed(1) + "%");
        card.style.setProperty("--my", (y * 100).toFixed(1) + "%");
        if (!calme) {
          card.style.setProperty("--ry", ((x - 0.5) * 3).toFixed(2) + "deg");
          card.style.setProperty("--rx", ((0.5 - y) * 3).toFixed(2) + "deg");
        }
      });
      card.addEventListener("pointerleave", () => { card.style.setProperty("--rx", "0deg"); card.style.setProperty("--ry", "0deg"); });
    });
  }

  /* Journal de La Brume : chargé seulement quand la section approche */
  const journal = document.getElementById("journal");
  const versionEls = document.querySelectorAll("[data-brume-version]");
  const dateFr = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const afficher = () => {
    const v = window.BRUME_DATA && window.BRUME_DATA.versions;
    if (!v) return;
    versionEls.forEach((el) => { el.textContent = v.actuelle; });
    if (!journal) return;
    const lignes = (v.journal || []).filter((l) => /^v\d/.test(l.h)).slice(0, 4);
    if (!lignes.length) return;
    journal.replaceChildren(...lignes.map((l) => {
      const li = document.createElement("li");
      const t = document.createElement("time");
      t.dateTime = l.d;
      const d = new Date(l.d + "T12:00:00");
      t.textContent = isNaN(d) ? l.d : dateFr.format(d);
      const div = document.createElement("div");
      const s = document.createElement("strong");
      s.textContent = l.h;
      const p = document.createElement("p");
      p.textContent = l.t;
      div.append(s, p);
      li.append(t, div);
      return li;
    }));
    journal.removeAttribute("aria-busy");
  };
  const charger = () => {
    if (charger.fait) return;
    charger.fait = true;
    const s = document.createElement("script");
    s.src = "/themist/data/versions.js";
    s.async = true;
    s.onload = afficher;
    document.head.append(s);
  };
  if (journal || versionEls.length) {
    if (io && journal) {
      const obsJ = new IntersectionObserver((e) => { if (e.some((x) => x.isIntersecting)) { charger(); obsJ.disconnect(); } }, { rootMargin: "600px 0px" });
      obsJ.observe(journal);
    }
    /* La version du hero : après le chargement de la page, sans bloquer l'affichage */
    const tard = window.requestIdleCallback || ((f) => setTimeout(f, 1500));
    addEventListener("load", () => tard(charger));
  }

  /* Année du pied de page */
  document.querySelectorAll("[data-year]").forEach((el) => { el.textContent = new Date().getFullYear(); });
})();
