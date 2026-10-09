(() => {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const OFFSET = 80;
  const FALLBACK_BG = 'linear-gradient(135deg, #171717, #242424)';

  /* ====================================================================
     ADD YOUR VIDEOS HERE: paste a YouTube video ID, a Shorts ID, or a full link.
     Add or remove IDs freely; cards, thumbnails and titles are built for you.
     ==================================================================== */
  const VIDEOS = {
    reel:   ['sDbYsm4J_5s', 'vpq7YQ539EI', 'TTdODxojYew', 'k3YT8_v4qbI', 's8T-DHk4ZLs', 'oGv7-X4Qfvg'],   // Reels / Shorts (9:16)
    yt:     ['KOJNPGYX-_Y', 'ku7IszhifjM', '', ''],                                   // YouTube / Long Form (16:9)
    motion: ['-Ynflxsa7tM', '', ''],                                                   // Motion Graphics (9:16)
    doc:    ['', '', '', '']                                     // Documentary (16:9)
  };
  // limit = how many show in the default "All" view before "View All Projects" is clicked
  const CATS = {
    reel:   { label: 'Reels / Shorts',  limit: 3, vertical: true },
    yt:     { label: 'YouTube',         limit: 2 },
    motion: { label: 'Motion Graphics', limit: 0, vertical: true },
    doc:    { label: 'Documentary',     limit: 0 }
  };

  const toId = v => { const m = String(v).match(/(?:v=|youtu\.be\/|shorts\/|embed\/)([\w-]{11})/); return m ? m[1] : String(v).trim(); };

  /* ---------- Render cards ---------- */
  const cardHTML = (cat, id) => {
    const c = CATS[cat];
    const meta = c.vertical ? '' : `<div class="meta" hidden><h3></h3><small>${c.label}</small></div>`;
    return `<article class="card" data-cat="${cat}"><div class="thumb yt-card" data-yt-id="${id}"><img class="yt-auto-thumb" data-yt-id="${id}" alt="${c.label} video"><span class="play"><i class="fa-solid fa-play"></i></span></div>${meta}</article>`;
  };
  Object.entries(VIDEOS).forEach(([cat, ids]) => {
    $(`[data-grid="${cat}"]`).innerHTML = ids.map(v => cardHTML(cat, toId(v))).join('');
  });

  // Titles for 16:9 cards come straight from YouTube, so you only supply the ID
  $$('.card:not([data-cat="reel"]):not([data-cat="motion"])').forEach(card => {
    const id = $('.yt-card', card).dataset.ytId, meta = $('.meta', card);
    fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent('https://www.youtube.com/watch?v=' + id)}&format=json`)
      .then(r => r.json()).then(d => { $('h3', meta).textContent = d.title; meta.hidden = false; }).catch(() => meta.remove());
  });

  /* ---------- Filter + expand/collapse ---------- */
  let filter = 'all', expanded = false;
  const toggleBtn = $('#toggleProjects');
  const applyView = () => {
    Object.entries(CATS).forEach(([cat, c]) => {
      const grid = $(`[data-grid="${cat}"]`);
      $$('.card', grid).forEach((card, i) => {
        const show = filter === 'all' ? (expanded || i < c.limit) : filter === cat;
        if (show && card.classList.contains('hide')) { card.style.animation = 'none'; card.offsetHeight; card.style.animation = ''; }
        card.classList.toggle('hide', !show);
      });
      grid.hidden = !$('.card:not(.hide)', grid);
    });
    toggleBtn.parentElement.style.display = filter === 'all' ? '' : 'none';
    toggleBtn.textContent = expanded ? 'Close Projects' : 'View All Projects';
  };
  $('#filters').addEventListener('click', e => {
    const b = e.target.closest('.filter'); if (!b) return;
    $$('.filter').forEach(f => f.classList.toggle('active', f === b));
    filter = b.dataset.filter; applyView();
  });
  toggleBtn.addEventListener('click', () => {
    expanded = !expanded; applyView();
    if (!expanded) window.scrollTo({ top: $('#work').offsetTop - OFFSET, behavior: 'smooth' });
  });
  applyView();

  /* ---------- YouTube thumbnail cascade ---------- */
  const loadThumb = img => {
    const id = img.dataset.ytId;
    const urls = ['maxresdefault', 'hq720', 'hqdefault'].map(n => `https://i.ytimg.com/vi/${id}/${n}.jpg`);
    let i = 0;
    const next = () => { if (i < urls.length) img.src = urls[i++]; else { img.style.display = 'none'; img.parentElement.style.background = FALLBACK_BG; } };
    img.addEventListener('load', () => { if (img.naturalWidth <= 120 && i < urls.length) next(); });
    img.addEventListener('error', next);
    next();
  };
  $$('.yt-auto-thumb').forEach(loadThumb);

  /* ---------- Generic image fallback (error doesn't bubble: use capture) ---------- */
  document.addEventListener('error', e => {
    const t = e.target;
    if (t.tagName === 'IMG' && !t.classList.contains('yt-auto-thumb')) { t.style.display = 'none'; t.parentElement.style.background = FALLBACK_BG; }
  }, true);

  /* ---------- Video interactions (single delegated listener) ---------- */
  const modal = $('#modal'), modalVideo = $('#modalVideo');
  const ytFrame = id => {
    const f = document.createElement('iframe');
    f.src = `https://www.youtube.com/embed/${id}?autoplay=1&rel=0&enablejsapi=1`;
    f.title = 'YouTube video player'; f.allowFullscreen = true;
    f.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    return f;
  };
  const stopCard = el => { if (el._orig) { el.replaceChildren(...el._orig); el._orig = null; } };
  const openModal = id => { modalVideo.replaceChildren(ytFrame(id)); modal.classList.add('open'); modal.setAttribute('aria-hidden', 'false'); };
  const closeModal = () => { modal.classList.remove('open'); modal.setAttribute('aria-hidden', 'true'); modalVideo.replaceChildren(); };

  document.addEventListener('click', e => {
    const yt = e.target.closest('.yt-card');
    if (yt && !yt._orig) {
      $$('.yt-card').forEach(stopCard);                 // only one video plays at a time
      yt._orig = [...yt.childNodes];
      yt.replaceChildren(ytFrame(yt.dataset.ytId)); return;
    }
    const trig = e.target.closest('.video-trigger');
    if (trig) return openModal(trig.dataset.ytId);
    if (e.target === modal || e.target.closest('#modalClose')) closeModal();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && modal.classList.contains('open')) closeModal(); });

  /* ---------- Navbar, menu, smooth anchors ---------- */
  const navbar = $('#navbar'), navLinks = $('#navLinks'), menuBtn = $('#menuBtn');
  const onScroll = () => navbar.classList.toggle('scrolled', window.scrollY > 40);
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

  const setMenu = open => {
    navLinks.classList.toggle('open', open);
    menuBtn.innerHTML = `<i class="fa-solid ${open ? 'fa-xmark' : 'fa-bars'}"></i>`;
  };
  menuBtn.addEventListener('click', () => setMenu(!navLinks.classList.contains('open')));

  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || a.getAttribute('href') === '#') return;
    const target = $(a.getAttribute('href')); if (!target) return;
    e.preventDefault(); setMenu(false);
    window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - OFFSET + (target.id === 'home' ? OFFSET : 0), behavior: 'smooth' });
  });

  /* ---------- Scroll-spy (#testimonials lives inside #about) ---------- */
  const spy = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      $$('a', navLinks).forEach(l => l.classList.toggle('active', l.getAttribute('href') === '#' + en.target.id));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  ['home', 'work', 'about', 'contact'].forEach(id => spy.observe($('#' + id)));

  /* ---------- Scroll reveal ---------- */
  const reveal = new IntersectionObserver((entries, obs) => {
    entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); obs.unobserve(en.target); } });
  }, { threshold: .15 });
  $$('.reveal').forEach(el => reveal.observe(el));

  /* ---------- Theme toggle ---------- */
  const root = document.documentElement, themeBtn = $('#themeToggle');
  const setTheme = t => {
    root.dataset.theme = t;
    themeBtn.innerHTML = `<i class="fa-solid ${t === 'dark' ? 'fa-sun' : 'fa-moon'}"></i>`;
    try { localStorage.setItem('theme', t); } catch (_) {}
  };
  let saved = 'dark'; try { saved = localStorage.getItem('theme') || 'dark'; } catch (_) {}
  setTheme(saved);
  themeBtn.addEventListener('click', () => setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark'));

  /* ---------- Custom cursor ---------- */
  if (matchMedia('(hover:hover)').matches) {
    const dot = $('.cursor-dot'), ring = $('.cursor-follower');
    let mx = 0, my = 0, rx = 0, ry = 0;
    window.addEventListener('mousemove', e => {
      mx = e.clientX; my = e.clientY;
      dot.style.opacity = ring.style.opacity = 1; document.body.classList.add('cursor-on');
      dot.style.transform = `translate(${mx}px,${my}px)`;
    });
    document.addEventListener('mouseover', e => ring.classList.toggle('hover', !!e.target.closest('a,button,.thumb,.hero-preview,.t-card,.chips span')));
    (function loop() { rx += (mx - rx) * .15; ry += (my - ry) * .15; ring.style.transform = `translate(${rx}px,${ry}px)`; requestAnimationFrame(loop); })();
  }

  window.addEventListener('load', () => document.body.classList.add('loaded'));
  if (document.readyState === 'complete') document.body.classList.add('loaded');
})();
