/* ============================================================
   Yi Liu — Personal Website Script
   Balloon nav: scale-up cycle + page transition
   ============================================================ */

// ─── LANGUAGE TOGGLE ─────────────────────────────────────────
(function () {
  const btns = document.querySelectorAll('.lang-btn');
  if (!btns.length) return;
  function applyLang(lang) {
    document.querySelectorAll('[data-en]').forEach(el => {
      el.textContent = lang === 'zh' ? (el.dataset.zh || el.dataset.en) : el.dataset.en;
    });
    btns.forEach(b => b.classList.toggle('active', b.dataset.lang === lang));
  }
  btns.forEach(btn => btn.addEventListener('click', () => applyLang(btn.dataset.lang)));
})();


// ─── BALLOON NAV CYCLE ────────────────────────────────────────
(function () {
  const nav = document.getElementById('section-nav');
  if (!nav) return;
  const items = Array.from(nav.querySelectorAll('.nav-item'));

  // Timing
  const ACTIVATE_GAP  = 420;   // ms between each item inflating
  const HOLD_ALL_MS   = 800;   // hold when all are big
  const DEFLATE_GAP   = 320;   // ms between each item deflating (last→first)
  const RESTART_DELAY = 500;

  let hovering  = false;
  let timers    = [];

  function clearTimers() {
    timers.forEach(t => clearTimeout(t));
    timers = [];
  }

  function after(ms, fn) {
    const t = setTimeout(fn, ms);
    timers.push(t);
    return t;
  }

  function runCycle() {
    if (hovering) return;

    // Phase 1: inflate items 0 → 5 one by one, each stays
    items.forEach((item, i) => {
      after(i * ACTIVATE_GAP, () => {
        if (hovering) return;
        item.classList.add('auto-active');

        // When the last one is done inflating, start hold then deflate
        if (i === items.length - 1) {
          after(i * ACTIVATE_GAP + 550 + HOLD_ALL_MS, () => {
            if (hovering) return;
            deflatePhase();
          });
        }
      });
    });
  }

  function deflatePhase() {
    // Phase 2: deflate items 5 → 0 one by one
    [...items].reverse().forEach((item, i) => {
      after(i * DEFLATE_GAP, () => {
        if (hovering) return;
        item.classList.remove('auto-active');

        // After last one deflates, restart
        if (i === items.length - 1) {
          after(i * DEFLATE_GAP + 550 + RESTART_DELAY, () => {
            if (hovering) return;
            runCycle();
          });
        }
      });
    });
  }

  runCycle();

  // ── Desktop hover ──
  const rightPanel = document.getElementById('right-panel');
  if (rightPanel) {
    rightPanel.addEventListener('mouseenter', () => {
      hovering = true;
      clearTimers();
      nav.classList.add('has-hover');
      items.forEach(it => it.classList.remove('auto-active'));
    });

    rightPanel.addEventListener('mouseleave', () => {
      hovering = false;
      nav.classList.remove('has-hover');
      items.forEach(it => it.classList.remove('hovered'));
      after(RESTART_DELAY, runCycle);
    });

    items.forEach(item => {
      item.addEventListener('mouseenter', () => {
        items.forEach(it => it.classList.remove('hovered'));
        item.classList.add('hovered');
      });
    });
  }

  // ── Touch ──
  items.forEach(item => {
    item.addEventListener('touchstart', e => {
      e.preventDefault();
      const href = item.getAttribute('href');
      if (!href || href === '#') return;
      clearTimers();
      items.forEach(it => it.classList.remove('auto-active', 'hovered'));
      item.classList.add('auto-active');
      after(300, () => doTransition(item, href));
    }, { passive: false });
  });

  // ── Click ──
  items.forEach(item => {
    item.addEventListener('click', e => {
      e.preventDefault();
      doTransition(item, item.getAttribute('href'));
    });
  });

  function doTransition(item, href) {
    if (!href || href === '#') return;
    const splash = document.getElementById('ink-splash');
    if (splash) {
      const rect = item.getBoundingClientRect();
      const cx = ((rect.left + rect.right) / 2 / window.innerWidth  * 100).toFixed(1) + '%';
      const cy = ((rect.top  + rect.bottom) / 2 / window.innerHeight * 100).toFixed(1) + '%';
      splash.style.setProperty('--cx', cx);
      splash.style.setProperty('--cy', cy);
      splash.classList.add('expanding');
    }
    setTimeout(() => { window.location.href = href; }, 580);
  }
})();
