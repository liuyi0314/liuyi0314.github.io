/* ============================================================
   Yi Liu — Personal Website Script
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
  if (!items.length) return;

  const ACTIVATE_GAP = 350;  // ms between each item inflating
  const HOLD_ALL_MS  = 700;  // pause when all inflated
  const DEFLATE_GAP  = 280;  // ms between each item deflating (last→first)
  const RESTART_MS   = 450;  // pause before restarting

  let hovering    = false;
  let cycleTimer  = null;
  let step        = 0;   // 0..(n-1) inflate, n..(2n-1) deflate, 2n restart

  function clearCycle() {
    clearTimeout(cycleTimer);
    cycleTimer = null;
  }

  function tick() {
    if (hovering) return;
    const n = items.length;

    if (step < n) {
      // ── Phase 1: inflate items 0 → n-1 one by one ──
      items[step].classList.add('auto-active');
      step++;
      const delay = (step === n) ? HOLD_ALL_MS : ACTIVATE_GAP;
      cycleTimer = setTimeout(tick, delay);

    } else if (step < n * 2) {
      // ── Phase 2: deflate items n-1 → 0 (bottom to top) ──
      const idx = (n * 2 - 1) - step;   // n-1, n-2, … 0
      items[idx].classList.remove('auto-active');
      step++;
      const delay = (step === n * 2) ? RESTART_MS : DEFLATE_GAP;
      cycleTimer = setTimeout(tick, delay);

    } else {
      // ── Phase 3: restart ──
      step = 0;
      tick();
    }
  }

  tick();

  // ── Desktop hover ──
  const rightPanel = document.getElementById('right-panel');
  if (rightPanel) {
    rightPanel.addEventListener('mouseenter', () => {
      hovering = true;
      clearCycle();
      nav.classList.add('has-hover');
      items.forEach(it => it.classList.remove('auto-active'));
    });

    rightPanel.addEventListener('mouseleave', () => {
      hovering = false;
      nav.classList.remove('has-hover');
      items.forEach(it => it.classList.remove('hovered', 'auto-active'));
      step = 0;
      cycleTimer = setTimeout(tick, 300);
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
      clearCycle();
      items.forEach(it => it.classList.remove('auto-active', 'hovered'));
      item.classList.add('auto-active');
      setTimeout(() => doTransition(item, href), 320);
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
