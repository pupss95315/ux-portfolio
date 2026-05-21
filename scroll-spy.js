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
    // Pick the visible entry closest to the top of the viewport
    const visible = entries
      .filter(e => e.isIntersecting)
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
