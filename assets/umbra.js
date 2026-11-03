/* Umbratech · comportements de la page d'accueil (aucune dépendance, ~3 Ko).
   Tout est optionnel : sans JavaScript, la page est complète et lisible.
   - header : fond flouté dès qu'on défile
   - [data-reveal] : apparition au défilement
   - .ut-loop : la ligne de la descente se dessine
   - [data-count] : compteurs
   - .ut-scene : la lumière se pose sur la source de l'image et suit le pointeur
   - .ut-carousel : carrousel du hero (pause, balayage, mouvements réduits)
   - html.ut-intro-on : ouverture « la lanterne s'allume », une fois par visite
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

  /* Scène : la lumière (lanterne, soleil, braise…) se pose sur la source de
     lumière de l'image affichée, et suit le pointeur quand il passe dessus.
     La source est donnée dans l'image (data-light="x y", de 0 à 1) et
     convertie dans le cadre, en tenant compte du recadrage (object-fit). */
  const scenes = [...document.querySelectorAll(".ut-scene")].map((scene) => {
    const cur = { x: 34, y: 88 }, cible = { x: 34, y: 88 }, repos = { x: 34, y: 88 };
    let raf = 0, dessus = false, img = scene.querySelector("img.is-active") || scene.querySelector("img");
    const pose = () => {
      scene.style.setProperty("--lx", cur.x.toFixed(2) + "%");
      scene.style.setProperty("--ly", cur.y.toFixed(2) + "%");
    };
    const anime = () => {
      cur.x += (cible.x - cur.x) * 0.09;
      cur.y += (cible.y - cur.y) * 0.09;
      pose();
      raf = Math.abs(cible.x - cur.x) + Math.abs(cible.y - cur.y) > 0.05 ? requestAnimationFrame(anime) : 0;
    };
    const lance = () => { if (calme) { cur.x = cible.x; cur.y = cible.y; pose(); } else if (!raf) raf = requestAnimationFrame(anime); };
    const source = () => {
      if (!img || !img.dataset.light) return;
      const [lx, ly] = img.dataset.light.split(/\s+/).map(Number);
      const w = scene.clientWidth, h = scene.clientHeight;
      const nw = img.naturalWidth || +img.getAttribute("width"), nh = img.naturalHeight || +img.getAttribute("height");
      if (!w || !h || !nw || !nh) return;
      const k = Math.max(w / nw, h / nh), rw = nw * k, rh = nh * k;
      const [px, py] = getComputedStyle(img).objectPosition.split(" ").map((v) => parseFloat(v) / 100);
      repos.x = (((w - rw) * (isNaN(px) ? 0.5 : px) + lx * rw) / w) * 100;
      repos.y = (((h - rh) * (isNaN(py) ? 0.5 : py) + ly * rh) / h) * 100;
      img.style.setProperty("--ox", repos.x.toFixed(1) + "%");
      img.style.setProperty("--oy", repos.y.toFixed(1) + "%");
    };
    const montrer = (nouvelle) => {
      img = nouvelle;
      source();
      if (img.dataset.glow) scene.style.setProperty("--glow", img.dataset.glow);
      if (img.dataset.veil) scene.style.setProperty("--veil", img.dataset.veil);
      if (!dessus) { cible.x = repos.x; cible.y = repos.y; lance(); }
    };
    source();
    cur.x = cible.x = repos.x; cur.y = cible.y = repos.y; pose();
    if (pointeurFin && !calme) {
      scene.addEventListener("pointermove", (ev) => {
        const r = scene.getBoundingClientRect();
        dessus = true;
        cible.x = ((ev.clientX - r.left) / r.width) * 100;
        cible.y = ((ev.clientY - r.top) / r.height) * 100;
        lance();
      });
      scene.addEventListener("pointerleave", () => { dessus = false; cible.x = repos.x; cible.y = repos.y; lance(); });
    }
    addEventListener("resize", () => { source(); if (!dessus) { cible.x = repos.x; cible.y = repos.y; lance(); } }, { passive: true });
    if (img && !img.complete) img.addEventListener("load", () => montrer(img), { once: true });
    return { el: scene, montrer };
  });

  /* Carrousel du hero : La Brume → Vaelmor → Guild Wars 1 → Diablo IV.
     Avance seul toutes les data-dur ms ; s'arrête au survol, au focus clavier,
     quand l'onglet est caché, et sur le bouton pause. Mouvements réduits :
     ne défile pas tout seul (le bouton lecture le relance). */
  document.querySelectorAll(".ut-carousel").forEach((car) => {
    const slides = [...car.querySelectorAll(".ut-slide")];
    const dots = [...car.querySelectorAll(".ut-dot")];
    const box = car.querySelector(".ut-slides");
    const btn = car.querySelector(".ut-carousel__pause");
    const scene = scenes.find((s) => car.contains(s.el));
    const imgs = scene ? [...scene.el.querySelectorAll("img")] : [];
    const dur = Number(car.dataset.dur) || 7000;
    if (slides.length < 2) return;
    car.style.setProperty("--dur", dur + "ms");

    let i = Math.max(0, slides.findIndex((s) => s.classList.contains("is-active")));
    let arrete = calme, survol = false, focus = false, cache = document.hidden, intro = doc.classList.contains("ut-intro-on");
    let timer = 0, t0 = 0, reste = dur;

    const enPause = () => arrete || survol || focus || cache || intro;
    const lancer = () => { clearTimeout(timer); t0 = performance.now(); timer = setTimeout(() => aller(i + 1), reste); };
    const etat = () => {
      const p = enPause();
      car.classList.toggle("is-paused", p);
      car.classList.toggle("is-stopped", arrete);
      box.setAttribute("aria-live", p ? "polite" : "off");
      btn.setAttribute("aria-label", arrete ? "Reprendre le défilement" : "Mettre en pause le défilement");
      if (p) { if (timer) { clearTimeout(timer); timer = 0; reste = Math.max(0, reste - (performance.now() - t0)); } }
      else if (!timer) lancer();
    };
    const aller = (n) => {
      const prec = i;
      i = (n + slides.length) % slides.length;
      clearTimeout(timer); timer = 0; reste = dur;
      slides.forEach((s, k) => { s.classList.toggle("is-active", k === i); s.toggleAttribute("inert", k !== i); });
      dots.forEach((d, k) => {
        d.classList.toggle("is-active", k === i);
        if (k === i) d.setAttribute("aria-current", "true"); else d.removeAttribute("aria-current");
      });
      if (imgs.length) {
        imgs.forEach((im, k) => {
          const actif = k === i;
          im.classList.toggle("is-leaving", k === prec && !actif);
          im.classList.toggle("is-active", actif);
          if (actif) im.removeAttribute("aria-hidden"); else im.setAttribute("aria-hidden", "true");
        });
        setTimeout(() => imgs[prec] && imgs[prec].classList.remove("is-leaving"), 1300);
        scene.montrer(imgs[i] || imgs[0]);
      }
      etat();
    };

    slides.forEach((s, k) => s.toggleAttribute("inert", k !== i));
    dots.forEach((d, k) => {
      d.addEventListener("click", () => { if (k !== i) aller(k); });
      d.addEventListener("keydown", (e) => {
        const pas = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
        if (!pas) return;
        e.preventDefault();
        aller(i + pas);
        dots[i].focus();
      });
    });
    btn.addEventListener("click", () => {
      arrete = !arrete;
      if (!arrete) { reste = dur; const bar = dots[i] && dots[i].querySelector("i"); if (bar) { bar.style.animation = "none"; void bar.offsetWidth; bar.style.animation = ""; } }
      etat();
    });

    /* Survol du texte (pour le lire) ou des commandes : pause ; la scène, elle, peut être explorée sans arrêter le défilement */
    if (pointeurFin) {
      [car.querySelector(".ut-hero__copy"), car.querySelector(".ut-carousel__ctrl")].forEach((zone) => {
        if (!zone) return;
        zone.addEventListener("pointerenter", () => { survol = true; etat(); });
        zone.addEventListener("pointerleave", () => { survol = false; etat(); });
      });
    }
    car.addEventListener("focusin", (e) => { if (e.target.matches(":focus-visible")) { focus = true; etat(); } });
    car.addEventListener("focusout", (e) => { if (!car.contains(e.relatedTarget)) { focus = false; etat(); } });
    document.addEventListener("visibilitychange", () => { cache = document.hidden; etat(); });
    document.addEventListener("ut:intro-fin", () => { intro = false; reste = dur; etat(); });

    /* Balayage horizontal au doigt */
    let x0 = null, y0 = 0;
    const grille = car.querySelector(".ut-hero__grid") || car;
    grille.addEventListener("pointerdown", (e) => { if (e.pointerType === "touch") { x0 = e.clientX; y0 = e.clientY; } });
    grille.addEventListener("pointerup", (e) => {
      if (x0 === null) return;
      const dx = e.clientX - x0, dy = e.clientY - y0;
      x0 = null;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) aller(i + (dx < 0 ? 1 : -1));
    });
    grille.addEventListener("pointercancel", () => { x0 = null; });

    etat();
  });

  /* Ouverture « la lanterne s'allume » (posée par le script en tête de index.html).
     Noir → un point de lumière à la lanterne → le halo grandit et dévoile la page
     → le titre sort de la brume. ~1,4 s ; un clic, une touche ou la molette la passe. */
  if (doc.classList.contains("ut-intro-on")) {
    const scene = document.querySelector(".ut-scene");
    const img = scene && scene.querySelector("img.is-active");
    const fin = () => {
      doc.classList.remove("ut-intro-on", "ut-cover");
      try { sessionStorage.setItem("ut-intro", "1"); } catch (e) {}
      document.dispatchEvent(new Event("ut:intro-fin"));
    };
    if (!scene || scrollY > 80) fin();
    else {
      const voile = document.createElement("div");
      voile.className = "ut-veil-intro";
      voile.setAttribute("aria-hidden", "true");
      voile.append(document.createElement("i"));
      let raf = 0, fini = false;
      const terminer = () => {
        if (fini) return;
        fini = true;
        cancelAnimationFrame(raf);
        fin();
        voile.classList.add("is-done");
        setTimeout(() => voile.remove(), 350);
        ["pointerdown", "keydown", "wheel", "touchstart"].forEach((t) => removeEventListener(t, terminer, true));
      };
      const jouer = () => {
        const r = scene.getBoundingClientRect();
        const lx = parseFloat(scene.style.getPropertyValue("--lx")) || 34, ly = parseFloat(scene.style.getPropertyValue("--ly")) || 88;
        const x = r.left + (r.width * lx) / 100, y = r.top + (r.height * ly) / 100;
        const rmax = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)) + 40;
        voile.style.setProperty("--x", x + "px");
        voile.style.setProperty("--y", y + "px");
        document.body.append(voile);
        doc.classList.remove("ut-cover");
        ["pointerdown", "keydown", "wheel", "touchstart"].forEach((t) => addEventListener(t, terminer, { capture: true, passive: true }));
        const t0 = performance.now(), attente = 380, ouverture = 1000;
        let texte = false;
        const pas = (t) => {
          const e = t - t0;
          if (!texte && e > attente + 120) { texte = true; doc.classList.remove("ut-intro-on"); }
          if (e > attente + ouverture * 0.45) voile.classList.add("is-fading");
          const k = Math.min(1, Math.max(0, (e - attente) / ouverture));
          const ease = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
          voile.style.setProperty("--r", (ease * rmax).toFixed(1) + "px");
          if (k < 1) raf = requestAnimationFrame(pas); else terminer();
        };
        raf = requestAnimationFrame(pas);
      };
      /* On attend l'image de la scène (au plus 700 ms) pour que la lumière tombe au bon endroit */
      const pret = img && img.decode ? Promise.race([img.decode().catch(() => {}), new Promise((ok) => setTimeout(ok, 700))]) : Promise.resolve();
      pret.then(() => requestAnimationFrame(jouer));
    }
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
