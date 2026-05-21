/* ----------------------------------------------------------------
   Iteration Carousel
   ----------------------------------------------------------------
   Wires up Before/After (or N-slide) carousels inside a case page.

   Markup contract — see styles.css → ".iteration-carousel":
     [data-iteration-carousel]
       └── [data-prev]                   ← optional, hidden at first slide
       └── .iteration-viewport
              └── [data-slide="0..N"]    ← exactly one carries .is-active
       └── [data-next]                   ← optional, hidden at last slide
       └── [data-dot="0..N"]             ← optional pagination dots

   Clicking prev / next / dot updates which slide carries .is-active and
   keeps the prev/next chevrons hidden at the edges of the range.
   Left / Right arrow keys move between slides when focus is inside the
   carousel. aria-current="true" is mirrored on the active dot so screen
   readers announce position changes.
---------------------------------------------------------------- */
(function () {
  function bind(carousel) {
    var figures = carousel.querySelectorAll('[data-slide]');
    var dots    = carousel.querySelectorAll('[data-dot]');
    var prev    = carousel.querySelector('[data-prev]');
    var next    = carousel.querySelector('[data-next]');
    var total   = figures.length;
    if (!total) return;

    // Mark the carousel as an interactive region for assistive tech.
    if (!carousel.hasAttribute('role')) carousel.setAttribute('role', 'group');
    if (!carousel.hasAttribute('aria-roledescription')) {
      carousel.setAttribute('aria-roledescription', 'carousel');
    }
    // Slides become tabpanel-equivalent; hidden ones get aria-hidden.
    figures.forEach(function (f) {
      if (!f.hasAttribute('role')) f.setAttribute('role', 'group');
      f.setAttribute('aria-roledescription', 'slide');
    });

    var active = 0;
    figures.forEach(function (f, i) { if (f.classList.contains('is-active')) active = i; });

    function update(idx) {
      active = (idx + total) % total;
      figures.forEach(function (f, i) {
        var isActive = i === active;
        f.classList.toggle('is-active', isActive);
        f.setAttribute('aria-hidden', isActive ? 'false' : 'true');
      });
      dots.forEach(function (d, i) {
        var isActive = i === active;
        d.classList.toggle('is-active', isActive);
        d.setAttribute('aria-current', isActive ? 'true' : 'false');
        d.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      });
      if (prev) prev.hidden = active === 0;
      if (next) next.hidden = active === total - 1;
    }

    if (prev) prev.addEventListener('click', function () { update(active - 1); });
    if (next) next.addEventListener('click', function () { update(active + 1); });
    dots.forEach(function (d, i) {
      d.addEventListener('click', function () { update(i); });
    });

    // Keyboard support: ←/→ move slides when focus is inside this carousel.
    carousel.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') {
        if (active > 0) { update(active - 1); e.preventDefault(); }
      } else if (e.key === 'ArrowRight') {
        if (active < total - 1) { update(active + 1); e.preventDefault(); }
      }
    });

    update(active);
  }

  document.querySelectorAll('[data-iteration-carousel]').forEach(bind);
})();
