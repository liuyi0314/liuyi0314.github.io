/* ============================================================
   Yi Liu — Personal Website Script
   Liquid morph nav (auto-cycle + hover + touch) + page transition
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

  // ── Filter params ──
  const TARGET_FREQ  = 0.022;
  const TARGET_SCALE = 32;
  const GROW_MS      = 1400;   // slow grow into liquid
  const SHRINK_MS    = 600;    // return to round
  const HOLD_MS      = 1200;   // hold liquid state per auto-cycle item

  // ── Clone one SVG filter per nav item ──
  const svgDefs  = document.querySelector('svg defs');
  const baseFilt = document.getElementById('liquid');

  items.forEach((item, i) => {
    const f = baseFilt.cloneNode(true);
    f.id    = `liquid-${i}`;
    const turb = f.querySelector('feTurbulence');
    const disp = f.querySelector('feDisplacementMap');
    turb.id = `turb-${i}`;
    disp.id = `disp-${i}`;
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
    item.querySelector('.nav-text').style.filter  = 'none';
    item.querySelector('.nav-text').style.color   = '';
    item._turb.setAttribute('baseFrequency', '0 0');
    item._disp.setAttribute('scale', '0');
    item._freq  = 0;
    item._scale = 0;
  }

  // ── Auto-cycle WITH liquid morph ──
  let cycleIdx  = 0;
  let hovering  = false;
  let cycleTimer = null;

  function runCycle() {
    if (hovering) return;

    const item = items[cycleIdx];
    items.forEach(it => { it.classList.remove('auto-active'); clearFilter(it); });
    item.classList.add('auto-active');
    applyFilter(item);

    // Grow into liquid
    animateFilter(item, TARGET_FREQ, TARGET_SCALE, GROW_MS, () => {
      if (hovering) return;
      // Hold, then shrink back
      cycleTimer = setTimeout(() => {
        if (hovering) return;
        animateFilter(item, 0, 0, SHRINK_MS, () => {
          if (hovering) return;
          clearFilter(item);
          item.classList.remove('auto-active');
          cycleIdx = (cycleIdx + 1) % items.length;
          cycleTimer = setTimeout(runCycle, 300);
        });
      }, HOLD_MS);
    });
  }

  function stopCycle() {
    clearTimeout(cycleTimer);
    cycleTimer = null;
    items.forEach(it => { it.classList.remove('auto-active'); });
  }

  runCycle();

  // ── Desktop hover ──
  const rightPanel = document.getElementById('right-panel');
  if (rightPanel) {
    rightPanel.addEventListener('mouseenter', () => {
      hovering = true;
      stopCycle();
      nav.classList.add('has-hover');
    });

    rightPanel.addEventListener('mouseleave', () => {
      hovering = false;
      nav.classList.remove('has-hover');
      items.forEach(it => {
        it.classList.remove('hovered');
        cancelAnimationFrame(it._raf);
        animateFilter(it, 0, 0, SHRINK_MS, () => clearFilter(it));
      });
      cycleIdx = 0;
      cycleTimer = setTimeout(runCycle, 400);
    });
  }

  items.forEach(item => {
    item.addEventListener('mouseenter', () => {
      items.forEach(other => {
        if (other !== item) {
          other.classList.remove('hovered');
          animateFilter(other, 0, 0, SHRINK_MS, () => clearFilter(other));
        }
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

      // Stop cycle, show liquid on tapped item
      stopCycle();
      hovering = true;
      items.forEach(it => { it.classList.remove('auto-active'); clearFilter(it); });
      applyFilter(item);

      animateFilter(item, TARGET_FREQ, TARGET_SCALE, 900, () => {
        doTransition(item, href);
      });
    }, { passive: false });
  });

  // ── Click (desktop): ink splash → navigate ──
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
