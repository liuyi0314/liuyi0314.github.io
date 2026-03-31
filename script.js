/* ============================================================
   Yi Liu — Personal Website Script
   Rain background + ink-drip nav interactions + page transition
   ============================================================ */

// ─── LANGUAGE TOGGLE ─────────────────────────────────────────
(function () {
  const btns = document.querySelectorAll('.lang-btn');
  if (!btns.length) return;
  let currentLang = 'en';

  function applyLang(lang) {
    currentLang = lang;
    document.querySelectorAll('[data-en]').forEach(el => {
      el.textContent = lang === 'zh' ? (el.dataset.zh || el.dataset.en) : el.dataset.en;
    });
    btns.forEach(b => b.classList.toggle('active', b.dataset.lang === lang));
  }

  btns.forEach(btn => btn.addEventListener('click', () => applyLang(btn.dataset.lang)));
})();


// ─── RAIN CANVAS ─────────────────────────────────────────────
(function () {
  const canvas = document.getElementById('rain-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let W, H;
  const DROPS = [];
  const DROP_COUNT = 60;

  function resize() {
    const zone = canvas.parentElement;
    W = canvas.width  = zone ? zone.offsetWidth  : window.innerWidth;
    H = canvas.height = zone ? zone.offsetHeight : 200;
  }
  resize();
  window.addEventListener('resize', resize);

  // Initialise drops
  for (let i = 0; i < DROP_COUNT; i++) {
    DROPS.push(makeDrop(true));
  }

  function makeDrop(random) {
    return {
      x:     Math.random() * (W || window.innerWidth),
      y:     random ? Math.random() * (H || window.innerHeight) : -20,
      len:   18 + Math.random() * 28,   // streak length
      speed: 3.5 + Math.random() * 5,
      alpha: 0.18 + Math.random() * 0.32,
      width: 0.7 + Math.random() * 0.8,
    };
  }

  function drawDrop(d) {
    ctx.save();
    ctx.globalAlpha = d.alpha;
    ctx.strokeStyle = '#6aaed6';
    ctx.lineWidth   = d.width;
    ctx.lineCap     = 'round';
    ctx.beginPath();
    ctx.moveTo(d.x, d.y);
    ctx.lineTo(d.x, d.y + d.len);
    ctx.stroke();
    ctx.restore();
  }

  function frame() {
    ctx.clearRect(0, 0, W, H);

    for (const d of DROPS) {
      drawDrop(d);
      d.y += d.speed;
      if (d.y - d.len > H) Object.assign(d, makeDrop(false), { x: Math.random() * W });
    }

    requestAnimationFrame(frame);
  }
  frame();
})();


// ─── RIPPLE CANVAS ───────────────────────────────────────────
(function () {
  const area = document.getElementById('ripple-area');
  if (!area) return;

  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;';
  area.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  let W, H;
  const ripples = [];

  function resize() {
    W = canvas.width  = area.offsetWidth  || 400;
    H = canvas.height = area.offsetHeight || 140;
  }
  resize();
  window.addEventListener('resize', () => { resize(); });

  // Spawn ripples from rain hitting bottom
  setInterval(() => {
    ripples.push({
      x:     (W || 400) * (0.05 + Math.random() * 0.9),
      y:     H * (0.55 + Math.random() * 0.35),
      r:     0,
      maxR:  20 + Math.random() * 35,
      alpha: 0.5 + Math.random() * 0.3,
      speed: 0.5 + Math.random() * 0.8,
    });
  }, 180);

  function frame() {
    ctx.clearRect(0, 0, W, H);

    for (let i = ripples.length - 1; i >= 0; i--) {
      const rp = ripples[i];
      ctx.save();
      ctx.globalAlpha = rp.alpha * (1 - rp.r / rp.maxR);
      ctx.strokeStyle = '#6aaed6';
      ctx.lineWidth   = 0.9;

      // Ellipse (perspective effect — wider than tall)
      ctx.beginPath();
      ctx.ellipse(rp.x, rp.y, rp.r * 1.9, rp.r * 0.7, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      rp.r += rp.speed;
      if (rp.r >= rp.maxR) ripples.splice(i, 1);
    }

    requestAnimationFrame(frame);
  }
  frame();
})();


// ─── NAV AUTO-CYCLE + HOVER INK DRIP ─────────────────────────
(function () {
  const nav   = document.getElementById('section-nav');
  if (!nav) return;
  const items = Array.from(nav.querySelectorAll('.nav-item'));

  // ── Auto-cycle (sequential dark highlight) ──
  let autoIdx    = 0;
  let autoTimer  = null;
  let hovering   = false;      // is mouse inside nav panel?

  function startAuto() {
    if (autoTimer) return;
    autoTimer = setInterval(() => {
      items.forEach(it => it.classList.remove('auto-active'));
      items[autoIdx].classList.add('auto-active');
      autoIdx = (autoIdx + 1) % items.length;
    }, 900);
  }

  function stopAuto() {
    clearInterval(autoTimer);
    autoTimer = null;
    items.forEach(it => it.classList.remove('auto-active'));
  }

  startAuto();

  // ── Hover interaction ──
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
        stopDrip(it);
      });
      startAuto();
    });
  }

  items.forEach(item => {
    item.addEventListener('mouseenter', () => {
      items.forEach(it => { it.classList.remove('hovered'); stopDrip(it); });
      item.classList.add('hovered');
      startDrip(item);
    });
  });

  // ── Ink drip per item ──
  // We draw ink letters "melting" and dripping on a canvas overlay
  const dripState = new WeakMap();

  function startDrip(item) {
    stopDrip(item);
    const textEl  = item.querySelector('.nav-text');
    const rect    = textEl.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();

    const canvas  = document.createElement('canvas');
    canvas.classList.add('drip-canvas');

    // Canvas covers the item area + extra below for drip travel
    canvas.width    = rect.width + 60;
    canvas.height   = rect.height + 120;
    canvas.style.left   = '-30px';
    canvas.style.top    = '0px';
    canvas.style.width  = canvas.width + 'px';
    canvas.style.height = canvas.height + 'px';

    item.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    // Drip particles that fall from the text
    const drips = [];
    const label = textEl.textContent.trim();

    // Seed a few drip points along the text baseline
    for (let i = 0; i < 8; i++) {
      drips.push({
        x:     30 + (i / 7) * rect.width,
        y:     rect.height * 0.85,
        vy:    1.2 + Math.random() * 2,
        vx:    (Math.random() - 0.5) * 0.5,
        r:     1.5 + Math.random() * 2.5,
        alpha: 0.7 + Math.random() * 0.3,
        trail: [],
      });
    }

    let raf;
    let alive = true;

    function drawFrame() {
      if (!alive) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Faint text echo
      ctx.save();
      ctx.font = `700 ${rect.height * 0.88}px 'Lora', serif`;
      ctx.fillStyle = 'rgba(26,63,92,0.08)';
      ctx.fillText(label, 30, rect.height * 0.88);
      ctx.restore();

      for (const d of drips) {
        d.trail.push({ x: d.x, y: d.y });
        if (d.trail.length > 18) d.trail.shift();

        // Draw trail (ink streak)
        if (d.trail.length > 1) {
          ctx.save();
          ctx.strokeStyle = '#1a3f5c';
          ctx.lineWidth   = d.r * 0.9;
          ctx.lineCap     = 'round';
          ctx.lineJoin    = 'round';
          ctx.globalAlpha = d.alpha * 0.55;
          ctx.beginPath();
          ctx.moveTo(d.trail[0].x, d.trail[0].y);
          for (const p of d.trail) ctx.lineTo(p.x, p.y);
          ctx.stroke();
          ctx.restore();
        }

        // Draw droplet head
        ctx.save();
        ctx.globalAlpha = d.alpha;
        ctx.fillStyle   = '#2a6496';
        ctx.beginPath();
        // Teardrop shape
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        d.x += d.vx;
        d.y += d.vy;
        d.vy *= 1.015; // slight acceleration
        if (d.y > canvas.height) {
          // Reset to top once off screen
          d.y = rect.height * 0.7 + Math.random() * rect.height * 0.3;
          d.x = 30 + Math.random() * rect.width;
          d.trail = [];
          d.vy = 1.2 + Math.random() * 2;
        }
      }

      raf = requestAnimationFrame(drawFrame);
    }

    drawFrame();
    dripState.set(item, { canvas, raf, alive: () => alive, stop: () => { alive = false; cancelAnimationFrame(raf); } });
  }

  function stopDrip(item) {
    const state = dripState.get(item);
    if (state) {
      state.stop();
      state.canvas.remove();
      dripState.delete(item);
    }
  }

  // ── Click → ink splash → navigate ──
  items.forEach(item => {
    item.addEventListener('click', e => {
      e.preventDefault();
      const href   = item.getAttribute('href');
      const splash = document.getElementById('ink-splash');
      if (!splash || !href || href === '#') return;

      const rect = item.getBoundingClientRect();
      const cx   = ((rect.left + rect.right) / 2 / window.innerWidth  * 100).toFixed(1) + '%';
      const cy   = ((rect.top  + rect.bottom) / 2 / window.innerHeight * 100).toFixed(1) + '%';
      splash.style.setProperty('--cx', cx);
      splash.style.setProperty('--cy', cy);
      splash.classList.add('expanding');

      setTimeout(() => { window.location.href = href; }, 560);
    });
  });
})();
