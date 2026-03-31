/* ============================================================
   Yi Liu — Personal Website Script
   Cloud/balloon nav: accumulate → all liquid → dissolve bottom-up
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


// ─── LIQUID NAV ───────────────────────────────────────────────
(function () {
  const nav = document.getElementById('section-nav');
  if (!nav) return;
  const items = Array.from(nav.querySelectorAll('.nav-item'));

  // ── Timing ──
  const GROW_MS          = 1100;   // each item morphs into liquid
  const ACTIVATE_GAP     = 480;    // ms between starting each item's grow
  const HOLD_ALL_MS      = 900;    // pause when all items are liquid
  const DISSOLVE_MS      = 750;    // each item dissolves
  const DISSOLVE_GAP     = 320;    // ms between dissolving each item (bottom → top)
  const RESTART_DELAY    = 700;    // pause before next cycle

  // ── Filter params ──
  const TARGET_FREQ  = 0.021;
  const TARGET_SCALE = 30;
  const SHRINK_MS    = 500;

  // ── Clone one SVG filter per nav item ──
  const svgDefs  = document.querySelector('svg defs');
  const baseFilt = document.getElementById('liquid');

  items.forEach((item, i) => {
    const f    = baseFilt.cloneNode(true);
    f.id       = `liquid-${i}`;
    const turb = f.querySelector('feTurbulence');
    const disp = f.querySelector('feDisplacementMap');
    turb.id    = `turb-${i}`;
    disp.id    = `disp-${i}`;
    svgDefs.appendChild(f);

    item._turb     = turb;
    item._disp     = disp;
    item._filterId = `liquid-${i}`;
    item._raf      = null;
    item._freq     = 0;
    item._scale    = 0;
  });

  // ── Easing ──
  function easeInOut(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }

  function animateFilter(item, toFreq, toScale, duration, onDone) {
    cancelAnimationFrame(item._raf);
    const fromFreq  = item._freq;
    const fromScale = item._scale;
    const t0        = performance.now();
    function step(now) {
      const raw = Math.min((now - t0) / duration, 1);
      const e   = easeInOut(raw);
      item._freq  = fromFreq  + (toFreq  - fromFreq)  * e;
      item._scale = fromScale + (toScale - fromScale) * e;
      item._turb.setAttribute('baseFrequency', `${item._freq} ${item._freq * 0.55}`);
      item._disp.setAttribute('scale', item._scale);
      if (raw < 1) {
        item._raf = requestAnimationFrame(step);
      } else {
        item._freq  = toFreq;
        item._scale = toScale;
        if (onDone) onDone();
      }
    }
    item._raf = requestAnimationFrame(step);
  }

  function applyFilter(item) {
    item.querySelector('.nav-text').style.filter = `url(#${item._filterId})`;
  }
  function clearFilter(item) {
    cancelAnimationFrame(item._raf);
    const el = item.querySelector('.nav-text');
    el.style.filter = 'none';
    item._turb.setAttribute('baseFrequency', '0 0');
    item._disp.setAttribute('scale', '0');
    item._freq  = 0;
    item._scale = 0;
  }

  // ── Cycle state ──
  let hovering   = false;
  let cycleTimer = null;

  function clearAllTimers() {
    clearTimeout(cycleTimer);
    cycleTimer = null;
  }

  // ── MAIN CYCLE ──
  // Phase 1: activate items 0→5, each grows to liquid and STAYS
  // Phase 2: hold briefly with all items liquid
  // Phase 3: dissolve items 5→0, bottom to top, one by one
  // Phase 4: restart

  function runCycle() {
    if (hovering) return;
    let phase1Done = 0;

    // Phase 1: staggered activation
    items.forEach((item, i) => {
      cycleTimer = setTimeout(() => {
        if (hovering) return;
        item.classList.add('auto-active');
        applyFilter(item);
        animateFilter(item, TARGET_FREQ, TARGET_SCALE, GROW_MS, () => {
          if (hovering) return;
          phase1Done++;
          // Once last item finishes growing, move to phase 2
          if (phase1Done === items.length) {
            cycleTimer = setTimeout(dissolvePhase, HOLD_ALL_MS);
          }
        });
      }, i * ACTIVATE_GAP);
    });
  }

  function dissolvePhase() {
    if (hovering) return;
    // Dissolve from bottom (index 5) to top (index 0)
    const reverseItems = [...items].reverse();
    reverseItems.forEach((item, i) => {
      cycleTimer = setTimeout(() => {
        if (hovering) return;
        animateFilter(item, 0, 0, DISSOLVE_MS, () => {
          if (hovering) return;
          clearFilter(item);
          item.classList.remove('auto-active');
          // After last one dissolves, restart cycle
          if (i === reverseItems.length - 1) {
            cycleTimer = setTimeout(runCycle, RESTART_DELAY);
          }
        });
      }, i * DISSOLVE_GAP);
    });
  }

  // Start
  runCycle();

  // ── Desktop hover ──
  const rightPanel = document.getElementById('right-panel');
  if (rightPanel) {
    rightPanel.addEventListener('mouseenter', () => {
      hovering = true;
      clearAllTimers();
      nav.classList.add('has-hover');
      // Freeze whatever state items are in — don't reset them
    });

    rightPanel.addEventListener('mouseleave', () => {
      hovering = false;
      nav.classList.remove('has-hover');
      // Clear all items and restart cleanly
      items.forEach(it => {
        it.classList.remove('hovered', 'auto-active');
        animateFilter(it, 0, 0, SHRINK_MS, () => clearFilter(it));
      });
      cycleTimer = setTimeout(runCycle, SHRINK_MS + 200);
    });
  }

  items.forEach(item => {
    item.addEventListener('mouseenter', () => {
      items.forEach(other => {
        if (other !== item) other.classList.remove('hovered');
      });
      item.classList.add('hovered');
      applyFilter(item);
      animateFilter(item, TARGET_FREQ, TARGET_SCALE, GROW_MS);
    });
  });

  // ── Touch: liquid then navigate ──
  items.forEach(item => {
    item.addEventListener('touchstart', e => {
      e.preventDefault();
      const href = item.getAttribute('href');
      if (!href || href === '#') return;
      clearAllTimers();
      hovering = true;
      items.forEach(it => { it.classList.remove('auto-active'); clearFilter(it); });
      applyFilter(item);
      animateFilter(item, TARGET_FREQ, TARGET_SCALE, 850, () => {
        doTransition(item, href);
      });
    }, { passive: false });
  });

  // ── Click → ink splash ──
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
      const cx   = ((rect.left + rect.right)  / 2 / window.innerWidth  * 100).toFixed(1) + '%';
      const cy   = ((rect.top  + rect.bottom) / 2 / window.innerHeight * 100).toFixed(1) + '%';
      splash.style.setProperty('--cx', cx);
      splash.style.setProperty('--cy', cy);
      splash.classList.add('expanding');
    }
    setTimeout(() => { window.location.href = href; }, 580);
  }
})();
