/* ============================================================
   Yi Liu — Personal Website Script
   Liquid morph nav + page transition
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


// ─── LIQUID FILTER ANIMATION ─────────────────────────────────
/*
  Uses the SVG feTurbulence + feDisplacementMap filter defined in index.html.
  On hover-in:  slowly ramp baseFrequency 0→target and scale 0→target  (liquid grows)
  On hover-out: quickly snap back to 0 (or reverse smoothly)

  Each nav-item gets its own filter instance via a clone so items don't
  interfere with each other when multiple are animated.
*/
(function () {
  const nav   = document.getElementById('section-nav');
  if (!nav) return;
  const items = Array.from(nav.querySelectorAll('.nav-item'));

  // SVG filter params
  const TARGET_FREQ  = 0.018;   // how "turbulent" the liquid gets
  const TARGET_SCALE = 28;      // displacement strength
  const GROW_MS      = 1600;    // ms to reach full liquid (slow grow)
  const SHRINK_MS    = 400;     // ms to return to round

  // Inject per-item filter clones into the SVG defs
  const svgDefs = document.querySelector('svg defs');
  const baseTurb = document.getElementById('liq-turb');
  const baseDisp = document.getElementById('liq-disp');

  items.forEach((item, i) => {
    const filterId = `liquid-${i}`;
    const filter   = document.getElementById('liquid').cloneNode(true);
    filter.id      = filterId;

    const turb = filter.querySelector('feTurbulence');
    const disp = filter.querySelector('feDisplacementMap');
    turb.id = `turb-${i}`;
    disp.id = `disp-${i}`;

    svgDefs.appendChild(filter);

    // Store refs on the element for easy access
    item._turb    = turb;
    item._disp    = disp;
    item._filterId = filterId;
    item._raf     = null;
    item._freq    = 0;
    item._scale   = 0;
  });

  // ── Easing ──
  function easeInOut(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }

  function animateFilter(item, toFreq, toScale, duration, onDone) {
    cancelAnimationFrame(item._raf);
    const startFreq  = item._freq;
    const startScale = item._scale;
    const startTime  = performance.now();

    function step(now) {
      const raw = Math.min((now - startTime) / duration, 1);
      const t   = easeInOut(raw);

      item._freq  = startFreq  + (toFreq  - startFreq)  * t;
      item._scale = startScale + (toScale - startScale) * t;

      item._turb.setAttribute('baseFrequency', `${item._freq} ${item._freq * 0.6}`);
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
    item.querySelector('.nav-text').style.filter = 'none';
    item._freq  = 0;
    item._scale = 0;
    item._turb.setAttribute('baseFrequency', '0 0');
    item._disp.setAttribute('scale', '0');
  }

  // ── Auto-cycle ──
  let autoIdx   = 0;
  let autoTimer = null;
  let hovering  = false;

  function startAuto() {
    if (autoTimer) return;
    autoTimer = setInterval(() => {
      items.forEach(it => it.classList.remove('auto-active'));
      items[autoIdx].classList.add('auto-active');
      autoIdx = (autoIdx + 1) % items.length;
    }, 950);
  }

  function stopAuto() {
    clearInterval(autoTimer);
    autoTimer = null;
    items.forEach(it => it.classList.remove('auto-active'));
  }

  startAuto();

  // ── Mouse enter/leave the whole right panel ──
  const rightPanel = document.getElementById('right-panel');
  if (rightPanel) {
    rightPanel.addEventListener('mouseenter', () => {
      hovering = true;
      stopAuto();
      nav.classList.add('has-hover');
    });

    rightPanel.addEventListener('mouseleave', () => {
      hovering = false;
      nav.classList.remove('has-hover');
      items.forEach(it => {
        it.classList.remove('hovered');
        // Quickly return to round
        animateFilter(it, 0, 0, SHRINK_MS, () => clearFilter(it));
      });
      startAuto();
    });
  }

  // ── Per-item hover ──
  items.forEach(item => {
    item.addEventListener('mouseenter', () => {
      // Un-liquid all other items
      items.forEach(other => {
        if (other !== item) {
          other.classList.remove('hovered');
          animateFilter(other, 0, 0, SHRINK_MS, () => clearFilter(other));
        }
      });

      item.classList.add('hovered');
      applyFilter(item);
      // Slowly grow into liquid
      animateFilter(item, TARGET_FREQ, TARGET_SCALE, GROW_MS);
    });
  });

  // ── Click → ink splash → navigate ──
  items.forEach(item => {
    item.addEventListener('click', e => {
      e.preventDefault();
      const href   = item.getAttribute('href');
      const splash = document.getElementById('ink-splash');
      if (!splash || !href || href === '#') return;

      const rect = item.getBoundingClientRect();
      const cx   = ((rect.left + rect.right)  / 2 / window.innerWidth  * 100).toFixed(1) + '%';
      const cy   = ((rect.top  + rect.bottom) / 2 / window.innerHeight * 100).toFixed(1) + '%';
      splash.style.setProperty('--cx', cx);
      splash.style.setProperty('--cy', cy);
      splash.classList.add('expanding');

      setTimeout(() => { window.location.href = href; }, 580);
    });
  });
})();
