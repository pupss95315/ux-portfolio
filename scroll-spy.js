/* ============================================================
   SCROLL SPY  ·  case study TOC sidebar
   Highlights the .case-toc link whose section is in view.
   Drop-in: pages with .case-content section[id] + .case-toc a
   ============================================================ */
(() => {
  const sections = document.querySelectorAll('.case-content section[id]');
  const links = document.querySelectorAll('.case-toc a');
  if (!sections.length || !links.length) return;

  const linkMap = new Map();
  links.forEach(a => {
    const id = a.getAttribute('href').slice(1);
    linkMap.set(id, a);
  });

  const setActive = (id) => {
    links.forEach(a => a.classList.remove('active'));
    const target = linkMap.get(id);
    if (!target) return;
    target.classList.add('active');
    // On mobile, scroll the active link into view inside the horizontal TOC
    if (window.matchMedia('(max-width: 960px)').matches) {
      target.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  };

  const observer = new IntersectionObserver((entries) => {
    // Pick the visible entry closest to the top of the viewport.
    // Sections with no matching TOC link (merged into a neighboring
    // entry) are skipped so the previous link stays active through them.
    const visible = entries
      .filter(e => e.isIntersecting && linkMap.has(e.target.id))
      .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
    if (visible.length) setActive(visible[0].target.id);
  }, {
    rootMargin: '-20% 0px -60% 0px',
    threshold: 0
  });

  sections.forEach(s => observer.observe(s));

  // Default-active first link on load
  setActive(sections[0].id);
})();


/* ============================================================
   PHASE STEPPER  ·  .phases  (case: Tricuss)
   The stepper pins itself — position: sticky in CSS. The heading
   and intro above it stay in ordinary flow and scroll away. This
   adds only what CSS cannot do:
   1. tell the bar how tall the mobile TOC bar is, so it rests
      under it instead of behind it;
   2. mark which step is current and which are done, from where
      the phase blocks sit relative to the bar;
   3. let a step act as a seek control for its phase;
   4. decide whether the three phases can share one pinned stage,
      and if so drive which of them is on it.
   ============================================================ */
(() => {
  const phases = document.querySelector('.phases');
  if (!phases) return;

  const blocks = [...phases.querySelectorAll('.phase-block')];
  const steps = [...phases.querySelectorAll('.phase-step')];
  const stepper = phases.querySelector('.phase-stepper');
  const track = phases.querySelector('.phase-track');
  const stage = phases.querySelector('.phase-stage');
  if (!blocks.length || !steps.length) return;
  const toc = document.querySelector('.case-toc');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');

  // How far you scroll to move from one phase to the next while the stage is
  // pinned. Shorter than a screen: three full screens of scroll for one
  // section is a long time to be held in place.
  const stepPx = () => Math.max(420, Math.round(innerHeight * 0.75));

  // The stepper is the only pinned bar; the lede stays in ordinary flow.
  const stuck = () => stepper;

  // The TOC is only a bar under the nav below 960px; above that it is a
  // tall sidebar beside the content and costs the stepper nothing.
  const measureToc = () => {
    const stacked = window.matchMedia('(max-width: 960px)').matches;
    const h = stacked && toc ? Math.round(toc.getBoundingClientRect().height) : 0;
    phases.style.setProperty('--toc-bar-h', h + 'px');
  };

  // Feeds .phase-block's scroll-margin-top, so a seek lands the phase
  // below the pinned block rather than behind it.
  const measureBar = () => {
    const bar = stuck();
    if (!bar) return;
    const h = Math.round(bar.getBoundingClientRect().height);
    phases.style.setProperty('--phase-bar-h', h + 'px');
  };

  /* ---- Staged mode: can the three phases share one pinned box? ----
     Only if the tallest of them fits in what is left of the viewport once
     the nav and the pinned stepper have taken their share. If it does not fit,
     the whole run falls back to the stacked read rather than pinning some
     phases and not others — a rule that changes halfway down is harder to
     follow than no rule at all. Below 960px and under reduced motion the
     stage never engages. */
  let staged = false;
  let stageRest = 0;      // viewport y where the stage comes to rest

  const navHeight = () =>
    parseFloat(getComputedStyle(document.documentElement)
      .getPropertyValue('--nav-h')) || 72;

  const measureStage = () => {
    if (!track || !stage) return;

    // Heights have to be read in the stacked state, so drop out of staged
    // mode first. Only ever runs on load and resize, never on scroll.
    phases.classList.remove('is-staged');
    phases.style.removeProperty('--stage-h');
    phases.style.removeProperty('--track-h');

    const navH = navHeight();
    const tallest = Math.max(...blocks.map(b => b.getBoundingClientRect().height));
    // The stepper is the only thing pinned above the stage.
    const barH = stepper ? stepper.getBoundingClientRect().height : 0;

    // 24px so the tallest phase is not flush against the bottom edge.
    const room = innerHeight - navH - barH - 24;

    staged = !matchMedia('(max-width: 960px)').matches &&
             !reduced.matches &&
             tallest > 0 && tallest <= room;

    if (!staged) {
      announced = false;
      blocks.forEach(b => {
        b.classList.remove('is-showing');
        b.removeAttribute('data-phase-active');
      });
      return;
    }

    stageRest = navH + barH;
    phases.style.setProperty('--stage-h', Math.ceil(tallest) + 'px');
    phases.style.setProperty('--track-h',
      Math.ceil(tallest + blocks.length * stepPx()) + 'px');
    phases.classList.add('is-staged');
  };

  // Lets a phase's own scripts know when it takes and loses the stage. The
  // thinking-process timeline needs it: pinned, it is inside the viewport
  // the whole time, so its own IntersectionObserver would loop it from the
  // moment the section is reached instead of when the reader arrives.
  let announced = false;
  const announce = (index) => {
    blocks.forEach((block, i) => {
      const active = i === index;
      // The first pass always fires, including 'phase:leave' on the two
      // phases that are merely off. That is what tells their scripts to stop
      // trusting geometry — pinned, an invisible phase still intersects.
      if (announced && !!block.dataset.phaseActive === active) return;
      if (active) block.dataset.phaseActive = '1';
      else delete block.dataset.phaseActive;
      block.dispatchEvent(new CustomEvent(active ? 'phase:enter' : 'phase:leave'));
    });
    announced = true;
  };

  const update = () => {
    let current = 0;
    let frac = 0;

    if (staged && track) {
      // How far the track has travelled past the stage's resting line,
      // measured in phases — so 1.4 means "40% through phase 2".
      const travelled = (stageRest - track.getBoundingClientRect().top) / stepPx();

      current = Math.min(blocks.length - 1, Math.max(0, Math.floor(travelled)));
      frac = Math.min(1, Math.max(0, travelled - current));

      blocks.forEach((b, i) => b.classList.toggle('is-showing', i === current));
      announce(current);
    } else {
      // Stacked read: a phase becomes current once its top passes just under
      // the pinned block, whose own rect already accounts for the nav, the
      // TOC and the resting offset.
      const bar = stuck();
      const line = bar
        ? bar.getBoundingClientRect().bottom + 1
        : (parseFloat(getComputedStyle(phases).getPropertyValue('--phase-top')) || 0) + 1;

      const tops = blocks.map(b => b.getBoundingClientRect().top);
      tops.forEach((top, i) => { if (top <= line) current = i; });
      if (tops[current + 1] !== undefined) {
        const span = tops[current + 1] - tops[current];
        if (span > 0) frac = Math.min(1, Math.max(0, (line - tops[current]) / span));
      }
    }

    steps.forEach((step, i) => {
      step.classList.toggle('is-current', i === current);
      step.classList.toggle('is-done', i < current);

      // How full the connector leading out of this step is: 0 until the
      // phase starts, 1 by the time the next one takes over, and
      // proportional in between so the rule tracks the scroll.
      const fill = i < current ? 1 : i === current ? frac : 0;
      step.style.setProperty('--fill', fill.toFixed(3));
    });
  };

  let queued = false;
  const schedule = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; update(); });
  };

  // Each step seeks to its own phase. Stacked, that is the block itself and
  // scroll-margin-top supplies the offset; staged, the block never moves —
  // what has to move is the page, to the point in the track where that phase
  // takes the stage.
  steps.forEach((step, i) => {
    const target = document.getElementById(step.dataset.target);
    if (!target) return;
    step.querySelector('.phase-step-btn')?.addEventListener('click', () => {
      const behavior = reduced.matches ? 'auto' : 'smooth';

      if (staged && track) {
        // +2px so the landing sits just inside the phase, not on its edge.
        const top = scrollY + track.getBoundingClientRect().top - stageRest +
                    i * stepPx() + 2;
        scrollTo({ top, behavior });
        return;
      }

      target.closest('.phase-block')?.scrollIntoView({ behavior, block: 'start' });
    });
  });

  /* Two levels of refresh. relayout() re-decides whether the stage engages,
     which drops out of staged mode to take its measurements — cheap enough
     on resize and load, but it must not be wired to anything that its own
     reflow could trigger, or the measurement feeds itself. restate() only
     re-reads the resting line. */
  const relayout = () => { measureToc(); measureBar(); measureStage(); schedule(); };
  const restate = () => { measureToc(); measureBar(); schedule(); };

  relayout();
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', relayout);
  // The phases are mostly screenshots, so their real heights are not known
  // until the images have loaded — and that measurement is what decides
  // whether the stage engages at all.
  addEventListener('load', relayout);
  // The TOC bar changes height at the 960px breakpoint and the stepper's own
  // padding changes with it — both shift the resting line, neither changes
  // whether the stage fits, so these take the cheap path.
  if ('ResizeObserver' in window) {
    const ro = new ResizeObserver(restate);
    if (toc) ro.observe(toc);
    if (stepper) ro.observe(stepper);
  }
})();
